import { useState, useEffect } from 'react';

// Web Audio API synthesizer for realistic tactile domino clacks and slams
// Zero external assets, works 100% offline, lazy-initialized on user gesture.

let audioCtx = null;
const STORAGE_KEY = 'dominoes_sound_enabled';

// Load initial sound preference from localStorage (default: true)
let soundEnabled = typeof window !== 'undefined'
  ? localStorage.getItem(STORAGE_KEY) !== 'false'
  : true;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function toggleDominoSound(enabled) {
  if (typeof enabled === 'boolean') {
    soundEnabled = enabled;
  } else {
    soundEnabled = !soundEnabled;
  }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, String(soundEnabled));
      window.dispatchEvent(new CustomEvent('dominoes_sound_change', { detail: soundEnabled }));
    } catch {}
  }
  return soundEnabled;
}

export function isDominoSoundEnabled() {
  return soundEnabled;
}

export function useDominoSound() {
  const [enabled, setEnabled] = useState(isDominoSoundEnabled);

  useEffect(() => {
    const handler = (e) => setEnabled(e.detail);
    window.addEventListener('dominoes_sound_change', handler);
    return () => window.removeEventListener('dominoes_sound_change', handler);
  }, []);

  const toggle = () => {
    const next = toggleDominoSound();
    setEnabled(next);
    return next;
  };

  return [enabled, toggle];
}

// Crisp clack of two dominoes striking each other (used in chain topples)
export function playDominoClack(pitch = 1.0, volume = 0.2) {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Body strike tone (acrylic/wood resin resonance)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(580 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(140 * pitch, now + 0.045);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400 * pitch, now);
    filter.Q.setValueAtTime(3.5, now);

    oscGain.gain.setValueAtTime(volume * 0.8, now);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    osc.connect(filter);
    filter.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);

    // High frequency surface click
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'square';
    clickOsc.frequency.setValueAtTime(2200 * pitch, now);
    clickOsc.frequency.exponentialRampToValueAtTime(300, now + 0.015);

    clickGain.gain.setValueAtTime(volume * 0.4, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);

    clickOsc.start(now);
    clickOsc.stop(now + 0.02);
  } catch {
    // Silently ignore if audio context is blocked
  }
}

// Heavy table slam ("El Chuchazo")
export function playDominoSlam(volume = 0.45) {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Deep wooden table thud
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(130, now);
    subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

    subGain.gain.setValueAtTime(volume, now);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.14);

    // Sharp initial acrylic slap
    playDominoClack(0.85, volume * 0.9);
    setTimeout(() => playDominoClack(1.15, volume * 0.4), 18);
  } catch {
    // Ignore if audio context is blocked
  }
}

// Shuffling slide sound ("La Sopa")
export function playDominoShuffle(volume = 0.18) {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(260, now + 0.08);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);

    gain.gain.setValueAtTime(volume * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.11);
  } catch {
    // Ignore
  }
}
