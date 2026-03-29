// ═══════════════════════════════════════════
// AUDIO ENGINE
// ═══════════════════════════════════════════
const AudioCtx = typeof window !== "undefined" ? ((window as any).AudioContext || (window as any).webkitAudioContext) : null;
let audioCtx: AudioContext | null = null;
const getAudio = (): AudioContext | null => { if (!audioCtx && AudioCtx) audioCtx = new AudioCtx(); return audioCtx; };

export function playTap() {
  const c = getAudio(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(880, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(1760, c.currentTime + 0.06);
  g.gain.setValueAtTime(0.18, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
  o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.1);
}

export function playMiss() {
  const c = getAudio(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = "triangle"; o.frequency.setValueAtTime(320, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(120, c.currentTime + 0.25);
  g.gain.setValueAtTime(0.15, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
  o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.25);
}

export function playWrongColor() {
  const c = getAudio(); if (!c) return;
  const o1 = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
  o1.type = "square"; o2.type = "square"; o1.frequency.value = 180; o2.frequency.value = 190;
  g.gain.setValueAtTime(0.08, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
  o1.connect(g); o2.connect(g); g.connect(c.destination);
  o1.start(); o2.start(); o1.stop(c.currentTime + 0.2); o2.stop(c.currentTime + 0.2);
}

export function playRoundUp() {
  const c = getAudio(); if (!c) return;
  [0, 0.1, 0.2].forEach((d, i) => {
    const o = c.createOscillator(), g = c.createGain();
    o.type = "sine"; o.frequency.value = 523 * (i + 1);
    g.gain.setValueAtTime(0.12, c.currentTime + d); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d + 0.18);
    o.connect(g); g.connect(c.destination); o.start(c.currentTime + d); o.stop(c.currentTime + d + 0.18);
  });
}

export function playGameOver() {
  const c = getAudio(); if (!c) return;
  [0, 0.15, 0.3, 0.5].forEach((d, i) => {
    const o = c.createOscillator(), g = c.createGain();
    o.type = "triangle"; o.frequency.value = 400 - i * 80;
    g.gain.setValueAtTime(0.13, c.currentTime + d); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d + 0.25);
    o.connect(g); g.connect(c.destination); o.start(c.currentTime + d); o.stop(c.currentTime + d + 0.25);
  });
}

export function playAchievement() {
  const c = getAudio(); if (!c) return;
  [0, 0.08, 0.16, 0.28].forEach((d, i) => {
    const o = c.createOscillator(), g = c.createGain();
    o.type = "sine"; o.frequency.value = [659, 784, 988, 1319][i];
    g.gain.setValueAtTime(0.14, c.currentTime + d); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d + 0.22);
    o.connect(g); g.connect(c.destination); o.start(c.currentTime + d); o.stop(c.currentTime + d + 0.22);
  });
}
