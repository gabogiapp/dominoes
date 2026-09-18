import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  isDemoMode,
  setDemoMode,
  loadState,
  saveState,
  clearState,
  STORAGE_KEY_LIVE,
  STORAGE_KEY_DEMO,
  DEMO_MODE_KEY,
  isAdminUnlocked,
  unlockAdmin,
  lockAdmin,
} from '../src/utils/storage.js';

describe('Demo Mode & Storage Isolation', () => {
  let mockLocalStorage;
  let mockSessionStorage;
  let originalWindow;

  beforeEach(() => {
    mockLocalStorage = new Map();
    mockSessionStorage = new Map();

    originalWindow = global.window;
    global.window = {
      location: { search: '' },
      dispatchEvent: () => {},
    };

    global.localStorage = {
      getItem: (k) => mockLocalStorage.get(k) ?? null,
      setItem: (k, v) => mockLocalStorage.set(k, String(v)),
      removeItem: (k) => mockLocalStorage.delete(k),
      clear: () => mockLocalStorage.clear(),
    };

    global.sessionStorage = {
      getItem: (k) => mockSessionStorage.get(k) ?? null,
      setItem: (k, v) => mockSessionStorage.set(k, String(v)),
      removeItem: (k) => mockSessionStorage.delete(k),
      clear: () => mockSessionStorage.clear(),
    };
  });

  afterEach(() => {
    if (originalWindow !== undefined) {
      global.window = originalWindow;
    } else {
      delete global.window;
    }
    delete global.localStorage;
    delete global.sessionStorage;
  });

  test('Defaults to Live Mode (false) for normal visitors without params', () => {
    assert.equal(isDemoMode(), false);
  });

  test('Activates Demo Mode via URL query parameter ?demo=true', () => {
    global.window.location.search = '?demo=true';
    assert.equal(isDemoMode(), true);
    assert.equal(mockLocalStorage.get(DEMO_MODE_KEY), 'true');
  });

  test('Activates Demo Mode via URL query parameter ?mode=demo', () => {
    global.window.location.search = '?mode=demo';
    assert.equal(isDemoMode(), true);
    assert.equal(mockLocalStorage.get(DEMO_MODE_KEY), 'true');
  });

  test('Deactivates Demo Mode via URL parameter ?demo=false or ?live=true', () => {
    mockLocalStorage.set(DEMO_MODE_KEY, 'true');
    global.window.location.search = '?demo=false';
    assert.equal(isDemoMode(), false);
    assert.equal(mockLocalStorage.has(DEMO_MODE_KEY), false);

    mockLocalStorage.set(DEMO_MODE_KEY, 'true');
    global.window.location.search = '?live=true';
    assert.equal(isDemoMode(), false);
    assert.equal(mockLocalStorage.has(DEMO_MODE_KEY), false);
  });

  test('setDemoMode toggles DEMO_MODE_KEY in storage', () => {
    setDemoMode(true);
    assert.equal(mockLocalStorage.get(DEMO_MODE_KEY), 'true');
    assert.equal(isDemoMode(), true);

    setDemoMode(false);
    assert.equal(mockLocalStorage.has(DEMO_MODE_KEY), false);
    assert.equal(isDemoMode(), false);
  });

  test('Isolates Live Tournament storage from Demo Mode sandbox storage', () => {
    // 1. Live state with real registered teams
    const liveTournament = {
      teams: [
        { id: 'team_101', name: 'Real Brooklyn Duo', player1: 'Alice', player2: 'Bob', withdrawn: false },
      ],
      stage: 'setup',
      isDemo: false,
    };
    saveState(liveTournament, false);

    // 2. Demo state with sandbox testing teams
    const demoTournament = {
      teams: [
        { id: 'team_1', name: 'Los Tigres', player1: 'Carlos', player2: 'Miguel', withdrawn: false },
        { id: 'team_2', name: 'El Barrio', player1: 'Danny', player2: 'Julio', withdrawn: false },
      ],
      stage: 'groups',
      isDemo: true,
    };
    saveState(demoTournament, true);

    // Verify storage keys in localStorage are strictly separate
    assert.ok(mockLocalStorage.has(STORAGE_KEY_LIVE));
    assert.ok(mockLocalStorage.has(STORAGE_KEY_DEMO));

    // Verify loading live mode returns real tournament
    const loadedLive = loadState(false);
    assert.equal(loadedLive.teams.length, 1);
    assert.equal(loadedLive.teams[0].name, 'Real Brooklyn Duo');

    // Verify loading demo mode returns sandbox teams
    const loadedDemo = loadState(true);
    assert.equal(loadedDemo.teams.length, 2);
    assert.equal(loadedDemo.teams[0].name, 'Los Tigres');

    // Modifying demo mode does NOT touch live mode
    loadedDemo.teams.push({ id: 'team_3', name: 'Demo Test 3', player1: 'A', player2: 'B' });
    saveState(loadedDemo, true);

    const checkLiveAgain = loadState(false);
    assert.equal(checkLiveAgain.teams.length, 1);
    assert.equal(checkLiveAgain.teams[0].name, 'Real Brooklyn Duo');
  });

  test('Admin unlock and lock lifecycle with PIN 1234', () => {
    assert.equal(isAdminUnlocked(), false);

    // Invalid PIN fails
    assert.equal(unlockAdmin('9999'), false);
    assert.equal(isAdminUnlocked(), false);

    // Correct PIN 1234 unlocks
    assert.equal(unlockAdmin('1234'), true);
    assert.equal(isAdminUnlocked(), true);

    // Lock re-locks admin
    lockAdmin();
    assert.equal(isAdminUnlocked(), false);
  });
});
