
let audioCtx = null;
let sourceNode = null;
let gainNode = null;
let eqBands = [];
let connectedVideo = null;
let bypass = false;

const BAND_CONFIGS = [
  { freq: 60, type: 'peaking' },
  { freq: 170, type: 'peaking' },
  { freq: 350, type: 'peaking' },
  { freq: 1000, type: 'peaking' },
  { freq: 3500, type: 'peaking' },
  { freq: 10000, type: 'peaking' }
];

export function setupYouTubeEQ(videoEl) {
  if (!videoEl) return;
  if (connectedVideo && connectedVideo !== videoEl) {
    disconnect();
  }
  if (audioCtx) {
    return;
  }

  audioCtx = new window.AudioContext();
  sourceNode = audioCtx.createMediaElementSource(videoEl);

  eqBands = BAND_CONFIGS.map(({ freq, type }) => {
    const node = audioCtx.createBiquadFilter();
    node.type = type;
    node.frequency.value = freq;
    node.Q.value = 1.0; // width
    node.gain.value = 0; // neutral
    return node;
  });

  gainNode = audioCtx.createGain();

  connectChain(!bypass);
  connectedVideo = videoEl;
}

function connectChain(enableEQ) {
  if (!sourceNode) return;
  try {
    sourceNode.disconnect();
    eqBands.forEach(node => node.disconnect());
    gainNode.disconnect();
  } catch (e) { }

  if (enableEQ) {
    sourceNode.connect(eqBands[0]);
    for (let i = 0; i < eqBands.length - 1; ++i) {
      eqBands[i].connect(eqBands[i + 1]);
    }
    eqBands[eqBands.length - 1].connect(gainNode);
    gainNode.connect(audioCtx.destination);
  } else {
    sourceNode.connect(gainNode);
    gainNode.connect(audioCtx.destination);
  }
}

export function setEQGain(bandIndex, gainDb) {
  if (!eqBands[bandIndex]) return;
  eqBands[bandIndex].gain.value = gainDb;
}

export function toggleEQ(enable) {
  bypass = !enable;
  connectChain(enable);
}

export function isEQEnabled() {
  return !bypass;
}

// Get all current EQ values (useful for UI/init)
export function getEQSate() {
  return eqBands.map(b => b.gain.value);
}

export function disconnect() {
  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
    sourceNode = null;
    eqBands = [];
    gainNode = null;
    connectedVideo = null;
    bypass = false;
  }
}
