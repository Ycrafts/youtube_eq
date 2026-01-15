// ui/modal.js
// Modal open/close behaviors for the YouTube EQ extension
let eqReady = false;
let lastEqState = true;
let PRESETS = {
  'Flat': [0, 0, 0, 0, 0, 0],
  'Bass Boost': [6, 4, 2, 0, -2, -4],
  'Vocal': [-3, 0, 4, 6, 2, -2],
  'Treble Boost': [-4, -2, 0, 2, 4, 6],
};

export function openEqModal() {
  let modal = document.getElementById('yt-eq-modal');
  if (!modal) {
    fetch(chrome.runtime.getURL('ui/modal.html'))
      .then(resp => resp.text())
      .then(html => {
        document.body.insertAdjacentHTML('beforeend', html);
        bindModalEvents();
        document.getElementById('yt-eq-modal').style.display = 'flex';
        setUpEqUI();
      });
  } else {
    modal.style.display = 'flex';
    setUpEqUI();
  }
}

function bindModalEvents() {
  document.getElementById('yt-eq-close').onclick = () => {
    document.getElementById('yt-eq-modal').style.display = 'none';
  };
  document.getElementById('yt-eq-modal').onclick = (e) => {
    if (e.target.id === 'yt-eq-modal') {
      document.getElementById('yt-eq-modal').style.display = 'none';
    }
  };
}

async function setUpEqUI() {
  if (eqReady) return;
  const video = document.querySelector('video');
  if (!video) { console.warn('[YouTube EQ] No <video> element found'); return; }
  const audioMod = await import(chrome.runtime.getURL('audio.js'));
  audioMod.setupYouTubeEQ(video);

  // ON/OFF toggle
  const toggleBtn = document.getElementById('yt-eq-toggle');
  let eqState = audioMod.isEQEnabled();
  updateToggleBtn(toggleBtn, eqState);
  toggleBtn.onclick = () => {
    eqState = !eqState;
    audioMod.toggleEQ(eqState);
    updateToggleBtn(toggleBtn, eqState);
  };

  // Preset dropdown
  const presetSel = document.getElementById('yt-eq-preset-select');
  const saveBtn = document.getElementById('yt-eq-save-preset');
  const presetNameInput = document.getElementById('yt-eq-preset-name');
  let ignoreSliderInput = false;

  // Apply a preset
  presetSel.onchange = function() {
    const preset = PRESETS[presetSel.value];
    if (preset) {
      ignoreSliderInput = true;
      for (let i = 0; i < 6; ++i) {
        document.getElementById(`eq-band-${i}`).value = preset[i];
        document.getElementById(`eq-value-${i}`).textContent = `${preset[i]} dB`;
        audioMod.setEQGain(i, preset[i]);
      }
      ignoreSliderInput = false;
      saveBtn.style.display = 'none';
      presetNameInput.style.display = 'none';
    }
  };

  // Apply default on modal open (Flat)
  presetSel.value = 'Flat';
  presetSel.onchange();

  // Sliders logic: update preset to Custom, show save option if changed from preset
  for (let i = 0; i < 6; ++i) {
    const slider = document.getElementById(`eq-band-${i}`);
    const valueDisp = document.getElementById(`eq-value-${i}`);
    slider.oninput = (e) => {
      audioMod.setEQGain(i, Number(e.target.value));
      valueDisp.textContent = `${e.target.value} dB`;
      if (!ignoreSliderInput) {
        // If current slider values don't match any preset
        const cur = [];
        for (let j = 0; j < 6; ++j) cur.push(Number(document.getElementById(`eq-band-${j}`).value));
        let matched = Object.entries(PRESETS).find(([name, vals]) => vals.every((v, k) => v === cur[k]));
        if (matched) {
          presetSel.value = matched[0];
          saveBtn.style.display = 'none';
          presetNameInput.style.display = 'none';
        } else {
          presetSel.value = 'Custom';
          saveBtn.style.display = '';
          presetNameInput.style.display = '';
          presetNameInput.value = '';
        }
      }
    };
  }

  // Save custom preset
  saveBtn.onclick = () => {
    let name = presetNameInput.value.trim();
    if (!name) return alert('Enter a preset name');
    if (PRESETS[name]) return alert('Preset name already exists');
    const cur=[...Array(6)].map((_,i)=>Number(document.getElementById(`eq-band-${i}`).value));
    PRESETS[name]=cur;
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    presetSel.insertBefore(option, presetSel.options[presetSel.options.length-1]); // before Custom
    presetSel.value = name;
    saveBtn.style.display = 'none';
    presetNameInput.style.display = 'none';
    // Persist deep-copy in chrome.storage.local
    chrome.storage.local.set({ eqPresets: PRESETS });
  };

  // Load user presets from storage
  chrome.storage.local.get(['eqPresets'], function(data) {
    if (data && data.eqPresets) {
      Object.entries(data.eqPresets).forEach(([name, values]) => {
        if (!PRESETS[name]) {
          // Insert loaded preset into dropdown before Custom
          const option = document.createElement('option');
          option.value = name;
          option.textContent = name;
          presetSel.insertBefore(option, presetSel.options[presetSel.options.length-1]);
          PRESETS[name]=values;
        }
      });
    }
  });

  eqReady = true;
}

function updateToggleBtn(btn, on) {
  btn.textContent = on ? 'EQ ON' : 'EQ OFF';
  btn.classList.toggle('active', on);
  btn.classList.toggle('off', !on);
}
