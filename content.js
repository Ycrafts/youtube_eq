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
      import(chrome.runtime.getURL('ui/modal.js')).then(mod => mod.openEqModal());
    };
    titleEl.parentNode.insertBefore(eqBtn, titleEl.nextSibling);
  }

  waitForTitle();
})();

