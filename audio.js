// audio.js -- Handles YouTube EQ Web Audio pipeline

let audioCtx = null;
let sourceNode = null;
let gainNode = null;
let eqBands = [];
let connectedVideo = null;
let bypass = false; // NEW: EQ bypass switch

// Standard EQ bands (60 Hz to 10 kHz)
const BAND_CONFIGS = [
  { freq: 60, type: 'peaking' },
  { freq: 170, type: 'peaking' },
  { freq: 350, type: 'peaking' },
  { freq: 1000, type: 'peaking' },
  { freq: 3500, type: 'peaking' },
  { freq: 10000, type: 'peaking' }
];

// Initialize or re-initialize audio pipeline for the given <video> element
export function setupYouTubeEQ(videoEl) {
  if (!videoEl) return;
  if (connectedVideo && connectedVideo !== videoEl) {
    // Clean up if we attach to a new video
    disconnect();
  }
  if (audioCtx) {
    // Already initialized, don't double create
    return;
  }

  audioCtx = new window.AudioContext();
  sourceNode = audioCtx.createMediaElementSource(videoEl);

  // Create EQ bands
  eqBands = BAND_CONFIGS.map(({ freq, type }) => {
    const node = audioCtx.createBiquadFilter();
    node.type = type;
    node.frequency.value = freq;
    node.Q.value = 1.0; // width
    node.gain.value = 0; // neutral
    return node;
  });

  // Final output (for gain control, if needed)
  gainNode = audioCtx.createGain();

  // Default: chain with EQ enabled
  connectChain(!bypass);
  connectedVideo = videoEl;
}

function connectChain(enableEQ) {
  // Disconnect everything first
  if (!sourceNode) return;
  try {
    sourceNode.disconnect();
    eqBands.forEach(node => node.disconnect());
    gainNode.disconnect();
  } catch (e) {}

  if (enableEQ) {
    // source -> eq1 -> ... -> eqN -> gain -> output
    sourceNode.connect(eqBands[0]);
    for (let i = 0; i < eqBands.length - 1; ++i) {
      eqBands[i].connect(eqBands[i + 1]);
    }
    eqBands[eqBands.length - 1].connect(gainNode);
    gainNode.connect(audioCtx.destination);
  } else {
    // EQ bypass: source -> gain -> output
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

// Cleanup if needed
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
