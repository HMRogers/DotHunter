// ═══════════════════════════════════════════
// AUDIO ENGINE
// ═══════════════════════════════════════════
const AudioCtx = typeof window !== "undefined" ? ((window as any).AudioContext || (window as any).webkitAudioContext) : null;
let audioCtx: AudioContext | null = null;
const getAudio = (): AudioContext | null => { if (!audioCtx && AudioCtx) audioCtx = new AudioCtx(); return audioCtx; };

export function playTap() {
  const c = getAudio(); if (!c) return;
  const now = c.currentTime;

  // Layer 1: Initial "pop" burst — short noise burst simulating the membrane snap
  const bufferSize = c.sampleRate * 0.06;
  const noiseBuffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    // Shaped noise: louder at start, rapid decay
    const env = Math.exp(-i / (bufferSize * 0.08));
    noiseData[i] = (Math.random() * 2 - 1) * env;
  }
  const noiseSrc = c.createBufferSource();
  noiseSrc.buffer = noiseBuffer;

  // Bandpass filter to make noise sound like a pop, not static
  const popFilter = c.createBiquadFilter();
  popFilter.type = "bandpass";
  popFilter.frequency.value = 2400;
  popFilter.Q.value = 0.8;

  const noiseGain = c.createGain();
  noiseGain.gain.setValueAtTime(0.35, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

  noiseSrc.connect(popFilter);
  popFilter.connect(noiseGain);
  noiseGain.connect(c.destination);
  noiseSrc.start(now);
  noiseSrc.stop(now + 0.06);

  // Layer 2: Descending "bubble release" tone — the satisfying pitch drop
  const osc = c.createOscillator();
  const oscGain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1200, now);
  osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
  oscGain.gain.setValueAtTime(0.2, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(oscGain);
  oscGain.connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.12);

  // Layer 3: Subtle high harmonic "sparkle" for juiciness
  const sparkle = c.createOscillator();
  const sparkleGain = c.createGain();
  sparkle.type = "sine";
  sparkle.frequency.setValueAtTime(3200, now);
  sparkle.frequency.exponentialRampToValueAtTime(1800, now + 0.08);
  sparkleGain.gain.setValueAtTime(0.08, now);
  sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  sparkle.connect(sparkleGain);
  sparkleGain.connect(c.destination);
  sparkle.start(now);
  sparkle.stop(now + 0.08);
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
