// content.js
// Injects the EQ button next to the YouTube Subscribe button.

console.log('[YouTube EQ] content.js loaded');

(function injectEqButton() {
  function waitForTitle(retries = 20) {
    // Wait for up to ~5s for the video title to appear
    const title = document.querySelector('h1.style-scope.ytd-watch-metadata');
    if (title) {
      addEqButton(title);
    } else if (retries > 0) {
      setTimeout(() => waitForTitle(retries - 1), 250);
    }
  }

  function addEqButton(titleEl) {
    if (document.getElementById("yt-eq-btn")) return; // Prevent double-inject
    const eqBtn = document.createElement("button");
    eqBtn.id = "yt-eq-btn";
    eqBtn.innerText = "🎚️ EQ";
    eqBtn.style.marginLeft = "12px";
    eqBtn.style.padding = "4px 10px";
    eqBtn.style.background = "#212121";
    eqBtn.style.color = "#fff";
    eqBtn.style.border = "none";
    eqBtn.style.borderRadius = "19px";
    eqBtn.style.cursor = "pointer";
    eqBtn.style.fontSize = "14px";
    eqBtn.title = "Open Equalizer";
    // Click handler opens the EQ modal
    eqBtn.onclick = () => {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.getURL) {
        console.warn('[YouTube EQ] chrome.runtime.getURL is not available; cannot open modal');
        return;
      }
      import(chrome.runtime.getURL('ui/modal.js')).then(mod => mod.openEqModal());
    };
    titleEl.parentNode.insertBefore(eqBtn, titleEl.nextSibling);

    // Automatically set up EQ and apply last used state (if any) without user click
    const video = document.querySelector('video');
    if (video && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
      import(chrome.runtime.getURL('audio.js'))
        .then(audioMod => {
          audioMod.setupYouTubeEQ(video);
          chrome.storage.local.get(['eqLastState'], (data) => {
            const state = data && data.eqLastState;
            if (state && Array.isArray(state.gains) && state.gains.length === 6) {
              const gains = state.gains.map(v => Number(v) || 0);
              for (let i = 0; i < gains.length; i++) {
                audioMod.setEQGain(i, gains[i]);
              }
            }
          });
        })
        .catch(err => console.warn('[YouTube EQ] Failed to auto-apply EQ:', err));
    }
  }

  waitForTitle();
})();

