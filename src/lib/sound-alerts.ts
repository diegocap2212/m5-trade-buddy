// Web Audio API sound alerts — no external files needed

let audioCtx: AudioContext | null = null;
let muted = false;

export function isMuted() { return muted; }
export function setMuted(v: boolean) { muted = v; }

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.15) {
  if (muted) return;
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(g).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

/** Rising two-tone alert for new CALL signal */
export function playCallAlert() {
  playTone(523, 0.15, 'sine', 0.18);
  setTimeout(() => playTone(659, 0.2, 'sine', 0.18), 120);
  setTimeout(() => playTone(784, 0.3, 'sine', 0.15), 240);
}

/** Falling two-tone alert for new PUT signal */
export function playPutAlert() {
  playTone(784, 0.15, 'sine', 0.18);
  setTimeout(() => playTone(659, 0.2, 'sine', 0.18), 120);
  setTimeout(() => playTone(523, 0.3, 'sine', 0.15), 240);
}

/** Cheerful success chime for WIN */
export function playWinSound() {
  playTone(523, 0.1, 'sine', 0.12);
  setTimeout(() => playTone(659, 0.1, 'sine', 0.12), 80);
  setTimeout(() => playTone(784, 0.1, 'sine', 0.12), 160);
  setTimeout(() => playTone(1047, 0.35, 'triangle', 0.1), 240);
}

/** Low buzz for LOSS */
export function playLossSound() {
  playTone(220, 0.25, 'sawtooth', 0.08);
  setTimeout(() => playTone(196, 0.35, 'sawtooth', 0.06), 200);
}

/** Subtle tick for MG1 activation */
export function playMG1Alert() {
  playTone(440, 0.08, 'square', 0.06);
  setTimeout(() => playTone(440, 0.08, 'square', 0.06), 150);
}

/** Urgent double-tick for MG2 activation */
export function playMG2Alert() {
  playTone(660, 0.08, 'square', 0.08);
  setTimeout(() => playTone(660, 0.08, 'square', 0.08), 120);
  setTimeout(() => playTone(880, 0.12, 'square', 0.1), 240);
}
