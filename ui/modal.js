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

  const toggleBtn = document.getElementById('yt-eq-toggle');
  let eqState = audioMod.isEQEnabled();
  updateToggleBtn(toggleBtn, eqState);
  toggleBtn.onclick = () => {
    eqState = !eqState;
    audioMod.toggleEQ(eqState);
    updateToggleBtn(toggleBtn, eqState);
  };

  const presetSel = document.getElementById('yt-eq-preset-select');
  const saveBtn = document.getElementById('yt-eq-save-preset');
  const presetNameInput = document.getElementById('yt-eq-preset-name');
  let ignoreSliderInput = false;

  presetSel.onchange = function () {
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
      chrome.storage.local.set({
        eqLastState: {
          gains: preset,
          preset: presetSel.value
        }
      });
    }
  };

  for (let i = 0; i < 6; ++i) {
    const slider = document.getElementById(`eq-band-${i}`);
    const valueDisp = document.getElementById(`eq-value-${i}`);
    slider.oninput = (e) => {
      audioMod.setEQGain(i, Number(e.target.value));
      valueDisp.textContent = `${e.target.value} dB`;
      if (!ignoreSliderInput) {
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
        chrome.storage.local.set({
          eqLastState: {
            gains: cur,
            preset: presetSel.value
          }
        });
      }
    };
  }

  saveBtn.onclick = () => {
    let name = presetNameInput.value.trim();
    if (!name) return alert('Enter a preset name');
    if (PRESETS[name]) return alert('Preset name already exists');
    const cur = [...Array(6)].map((_, i) => Number(document.getElementById(`eq-band-${i}`).value));
    PRESETS[name] = cur;
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    presetSel.insertBefore(option, presetSel.options[presetSel.options.length - 1]); // before Custom
    presetSel.value = name;
    saveBtn.style.display = 'none';
    presetNameInput.style.display = 'none';
    chrome.storage.local.set({ eqPresets: PRESETS });
  };

  chrome.storage.local.get(['eqPresets'], function (data) {
    if (data && data.eqPresets) {
      Object.entries(data.eqPresets).forEach(([name, values]) => {
        if (!PRESETS[name]) {
          const option = document.createElement('option');
          option.value = name;
          option.textContent = name;
          presetSel.insertBefore(option, presetSel.options[presetSel.options.length - 1]);
          PRESETS[name] = values;
        }
      });
    }

    chrome.storage.local.get(['eqLastState'], function (data2) {
      const state = data2 && data2.eqLastState;
      if (state && Array.isArray(state.gains) && state.gains.length === 6) {
        // restore saved curve
        ignoreSliderInput = true;
        const gains = state.gains.map(v => Number(v) || 0);
        for (let i = 0; i < 6; ++i) {
          const val = gains[i];
          document.getElementById(`eq-band-${i}`).value = val;
          document.getElementById(`eq-value-${i}`).textContent = `${val} dB`;
          audioMod.setEQGain(i, val);
        }

        let matched = Object.entries(PRESETS).find(([name, vals]) =>
          vals.every((v, k) => v === gains[k])
        );
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

        ignoreSliderInput = false;
      } else {
        presetSel.value = 'Flat';
        presetSel.onchange();
      }
    });
  });

  eqReady = true;
}

function updateToggleBtn(btn, on) {
  btn.textContent = on ? 'EQ ON' : 'EQ OFF';
  btn.classList.toggle('active', on);
  btn.classList.toggle('off', !on);
}
