import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  isDominoSoundEnabled,
  toggleDominoSound,
  testDominoAudio,
  playDominoClack,
  playDominoSlam,
  playDominoShuffle,
} from '../src/utils/dominoAudio.js';

describe('Domino Audio Synthesizer', () => {
  let originalWindow;

  beforeEach(() => {
    originalWindow = global.window;
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  test('Sound enabled state can be checked and toggled', () => {
    const initial = isDominoSoundEnabled();
    assert.equal(typeof initial, 'boolean');

    const toggled = toggleDominoSound(!initial);
    assert.equal(toggled, !initial);
    assert.equal(isDominoSoundEnabled(), !initial);

    // Toggle back
    toggleDominoSound(initial);
    assert.equal(isDominoSoundEnabled(), initial);
  });

  test('Calling play functions never throws even in headless / node environment', () => {
    assert.doesNotThrow(() => {
      playDominoClack(1.0, 0.2);
      playDominoSlam(0.5);
      playDominoShuffle(0.3);
      testDominoAudio();
    });
  });
});
