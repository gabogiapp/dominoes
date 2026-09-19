import { useState, useEffect } from 'react';

// Web Audio API synthesizer for realistic tactile domino clacks and slams.
// Specially hardened for mobile browsers (iOS Safari, Android Chrome).
// Solves:
// 1. iOS Safari silent switch mute via silent HTML5 Audio element priming.
// 2. Suspended AudioContext unlock on first touch/tap.
// 3. Asynchronous resumption handling so delayed setTimeout cascades play reliably.
// 4. Acoustic tuning for mobile phone speakers (boosted 800Hz - 3.5kHz acoustic resonance).

const STORAGE_KEY = 'dominoes_sound_enabled';
const SILENT_WAV = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

let audioCtx = null;
let masterOutput = null;
let isUnlocked = false;

// Load initial sound preference from localStorage (default: true)
let soundEnabled = typeof window !== 'undefined'
  ? localStorage.getItem(STORAGE_KEY) !== 'false'
  : true;

/**
 * Prime and resume AudioContext with both silent buffer and HTML5 Audio
 * to unlock audio on iOS Safari and mobile devices.
 */
export function unlockAudioEngine() {
  if (typeof window === 'undefined') return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  if (!audioCtx) {
    try {
      audioCtx = new AudioContextClass();
    } catch {
      return;
    }
  }

  // 1. Resume AudioContext if suspended
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  // 2. Play 1-sample silent Web Audio buffer
  try {
    const buffer = audioCtx.createBuffer(1, 1, 22050);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start(0);
  } catch {}

  // 3. Play silent HTML5 audio to unlock iOS "playback" audio session category
  try {
    const silent = new Audio(SILENT_WAV);
    silent.volume = 0.01;
    const p = silent.play();
    if (p && typeof p.then === 'function') {
      p.catch(() => {});
    }
  } catch {}

  if (audioCtx.state === 'running') {
    isUnlocked = true;
  }
}

// Attach auto-unlock listeners on first user interaction anywhere on screen
if (typeof window !== 'undefined') {
  const unlockEvents = ['touchstart', 'touchend', 'pointerdown', 'mousedown', 'keydown', 'click'];
  const handleFirstInteraction = () => {
    unlockAudioEngine();
    if (audioCtx && audioCtx.state === 'running') {
      unlockEvents.forEach((ev) => {
        window.removeEventListener(ev, handleFirstInteraction, { capture: true });
      });
    }
  };

  unlockEvents.forEach((ev) => {
    window.addEventListener(ev, handleFirstInteraction, { capture: true, passive: true });
  });
}

export function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioCtx) {
    try {
      audioCtx = new AudioContextClass();
    } catch {
      return null;
    }
  }

  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

/**
 * Gets or initializes master dynamics compressor to prevent clipping
 * and ensure clear, crisp output on phone speakers.
 */
function getMasterNode(ctx) {
  if (!masterOutput || masterOutput.context !== ctx) {
    try {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-6, ctx.currentTime);
      comp.knee.setValueAtTime(10, ctx.currentTime);
      comp.ratio.setValueAtTime(3.5, ctx.currentTime);
      comp.attack.setValueAtTime(0.002, ctx.currentTime);
      comp.release.setValueAtTime(0.12, ctx.currentTime);

      const boost = ctx.createGain();
      boost.gain.setValueAtTime(1.25, ctx.currentTime);

      comp.connect(boost);
      boost.connect(ctx.destination);
      masterOutput = comp;
    } catch {
      masterOutput = ctx.destination;
    }
  }
  return masterOutput;
}

/**
 * Safe executor ensuring AudioContext is running before scheduling audio nodes.
 */
function withAudio(callback) {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().then(() => {
      try {
        const out = getMasterNode(ctx);
        callback(ctx, out, ctx.currentTime);
      } catch {}
    }).catch(() => {});
  } else {
    try {
      const out = getMasterNode(ctx);
      callback(ctx, out, ctx.currentTime);
    } catch {}
  }
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
  if (soundEnabled) {
    unlockAudioEngine();
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

/**
 * Crisp, authentic clack of two hard acrylic dominoes striking each other.
 * Tuned with high-frequency surface snaps and 800Hz-2200Hz resonance for mobile phone speakers.
 */
export function playDominoClack(pitch = 1.0, volume = 0.35) {
  withAudio((ctx, out, now) => {
    // 1. Sharp high-frequency transient click (acrylic impact)
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'square';
    clickOsc.frequency.setValueAtTime(3200 * pitch, now);
    clickOsc.frequency.exponentialRampToValueAtTime(800 * pitch, now + 0.014);

    clickGain.gain.setValueAtTime(volume * 0.7, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.016);

    clickOsc.connect(clickGain);
    clickGain.connect(out);
    clickOsc.start(now);
    clickOsc.stop(now + 0.018);

    // 2. Resonator Body (Hard dense resin resonance — cuts through mobile speakers)
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    const bodyFilter = ctx.createBiquadFilter();

    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(920 * pitch, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(360 * pitch, now + 0.048);

    bodyFilter.type = 'bandpass';
    bodyFilter.frequency.setValueAtTime(1550 * pitch, now);
    bodyFilter.Q.setValueAtTime(3.8, now);

    bodyGain.gain.setValueAtTime(volume * 0.95, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    bodyOsc.connect(bodyFilter);
    bodyFilter.connect(bodyGain);
    bodyGain.connect(out);

    bodyOsc.start(now);
    bodyOsc.stop(now + 0.055);

    // 3. Subtle lower body tone
    const lowOsc = ctx.createOscillator();
    const lowGain = ctx.createGain();
    lowOsc.type = 'sine';
    lowOsc.frequency.setValueAtTime(460 * pitch, now);
    lowOsc.frequency.exponentialRampToValueAtTime(210 * pitch, now + 0.038);

    lowGain.gain.setValueAtTime(volume * 0.45, now);
    lowGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    lowOsc.connect(lowGain);
    lowGain.connect(out);
    lowOsc.start(now);
    lowOsc.stop(now + 0.042);
  });
}

/**
 * Heavy table slam ("El Chuchazo")
 * Layered with acrylic slap, wooden table resonance, and low-end punch.
 */
export function playDominoSlam(volume = 0.55) {
  // Sharp initial acrylic slap
  playDominoClack(1.15, volume * 0.95);
  setTimeout(() => playDominoClack(0.85, volume * 0.55), 16);

  withAudio((ctx, out, now) => {
    // 1. Wooden table knock transient (mid-range punch for mobile speakers)
    const knockOsc = ctx.createOscillator();
    const knockGain = ctx.createGain();
    const knockFilter = ctx.createBiquadFilter();

    knockOsc.type = 'triangle';
    knockOsc.frequency.setValueAtTime(440, now);
    knockOsc.frequency.exponentialRampToValueAtTime(150, now + 0.08);

    knockFilter.type = 'bandpass';
    knockFilter.frequency.setValueAtTime(800, now);
    knockFilter.Q.setValueAtTime(2.2, now);

    knockGain.gain.setValueAtTime(volume * 0.85, now);
    knockGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    knockOsc.connect(knockFilter);
    knockFilter.connect(knockGain);
    knockGain.connect(out);

    knockOsc.start(now);
    knockOsc.stop(now + 0.1);

    // 2. Deep wooden table thud (sub-bass)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(145, now);
    subOsc.frequency.exponentialRampToValueAtTime(38, now + 0.15);

    subGain.gain.setValueAtTime(volume * 1.1, now);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    subOsc.connect(subGain);
    subGain.connect(out);
    subOsc.start(now);
    subOsc.stop(now + 0.18);
  });
}

/**
 * Shuffling slide sound ("La Sopa")
 * Realistic sliding acrylic tiles with incidental contact ticks.
 */
export function playDominoShuffle(volume = 0.3) {
  withAudio((ctx, out, now) => {
    // Friction slide
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(380, now + 0.09);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, now);
    filter.Q.setValueAtTime(2.5, now);

    gain.gain.setValueAtTime(volume * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(out);

    osc.start(now);
    osc.stop(now + 0.12);
  });

  // Incidental rubbing clacks
  setTimeout(() => playDominoClack(1.22, volume * 0.45), 45);
  setTimeout(() => playDominoClack(0.96, volume * 0.4), 110);
}

/**
 * Audio test / confirmation sound (double domino clack).
 * Call this when user toggles or tests audio.
 */
export function testDominoAudio() {
  unlockAudioEngine();
  playDominoClack(1.0, 0.45);
  setTimeout(() => {
    playDominoClack(1.2, 0.45);
  }, 90);
}

/**
 * Authentic wooden table double-knock ("¡Paso!")
 * Two rapid knuckle raps on wood when a player cannot make a move.
 */
export function playTableKnock(volume = 0.45) {
  const knockOnce = (delayMs = 0) => {
    setTimeout(() => {
      withAudio((ctx, out, now) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.04);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(540, now);
        filter.Q.setValueAtTime(2.5, now);

        gain.gain.setValueAtTime(volume * 0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(out);

        osc.start(now);
        osc.stop(now + 0.05);
      });
    }, delayMs);
  };

  knockOnce(0);
  knockOnce(95);
}

/**
 * Dramatic game lock sound ("¡Tranque!")
 * Three rising clacks followed by a locked wooden snap.
 */
export function playTranqueSound(volume = 0.5) {
  playDominoClack(0.9, volume * 0.5);
  setTimeout(() => playDominoClack(1.1, volume * 0.6), 70);
  setTimeout(() => playDominoClack(1.3, volume * 0.7), 140);
  setTimeout(() => playDominoSlam(volume * 0.85), 220);
}

/**
 * Celebratory Capicúa fanfare ("¡Capicúa!")
 * Bright dual-tone acrylic victory chime.
 */
export function playCapicuaSound(volume = 0.5) {
  playDominoClack(1.35, volume * 0.8);
  setTimeout(() => playDominoClack(1.55, volume * 0.9), 85);
  setTimeout(() => {
    withAudio((ctx, out, now) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.2);
      gain.gain.setValueAtTime(volume * 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.25);
    });
  }, 160);
}

/**
 * Massive, cinematic domino table crash.
 * Combines heavy acrylic impact, seismic sub-bass rumble, and wood table shake.
 */
export function playGiantDominoCrash(volume = 0.8) {
  playDominoSlam(volume);

  withAudio((ctx, out, now) => {
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.35);

    subGain.gain.setValueAtTime(volume * 1.3, now);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    subOsc.connect(subGain);
    subGain.connect(out);
    subOsc.start(now);
    subOsc.stop(now + 0.4);

    setTimeout(() => {
      playDominoClack(0.7, volume * 0.65);
      playDominoClack(0.55, volume * 0.5);
    }, 45);
    setTimeout(() => {
      playDominoClack(0.85, volume * 0.4);
    }, 90);
  });
}



