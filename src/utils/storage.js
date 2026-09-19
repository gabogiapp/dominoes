import { useState, useEffect } from 'react';

// ─── localStorage / sessionStorage helpers ────────────────────────
// Graceful read/write – never crashes on malformed data.

export const STORAGE_KEY_LIVE = 'dominoes_tournament_live';
export const STORAGE_KEY_DEMO = 'dominoes_tournament_demo';
export const DEMO_MODE_KEY = 'dominoes_demo_mode';

/**
 * Checks whether Demo Mode is active.
 * Checked in order:
 * 1. URL parameter (?demo=true or ?mode=demo -> enables; ?demo=false or ?live=true -> disables)
 * 2. localStorage ('dominoes_demo_mode' === 'true')
 * Defaults to false (clean live mode for public visitors).
 */
export function isDemoMode() {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === 'true' || params.get('mode') === 'demo') {
      localStorage.setItem(DEMO_MODE_KEY, 'true');
      return true;
    }
    if (params.get('demo') === 'false' || params.get('live') === 'true' || params.get('mode') === 'live') {
      localStorage.removeItem(DEMO_MODE_KEY);
      return false;
    }
    return localStorage.getItem(DEMO_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Sets Demo Mode on or off and dispatches an event for reactive updates.
 */
export function setDemoMode(enabled) {
  if (typeof window === 'undefined') return;
  try {
    if (enabled) {
      localStorage.setItem(DEMO_MODE_KEY, 'true');
    } else {
      localStorage.removeItem(DEMO_MODE_KEY);
    }
    window.dispatchEvent(new Event('dominoes_mode_changed'));
  } catch {}
}

export function getActiveStorageKey(demoOverride) {
  const isDemo = demoOverride !== undefined ? demoOverride : isDemoMode();
  return isDemo ? STORAGE_KEY_DEMO : STORAGE_KEY_LIVE;
}

export function loadState(demoOverride) {
  if (typeof window === 'undefined') return null;
  try {
    const isDemo = demoOverride !== undefined ? demoOverride : isDemoMode();
    const key = isDemo ? STORAGE_KEY_DEMO : STORAGE_KEY_LIVE;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }

    // In demo mode: check legacy storage if demo key not yet populated
    if (isDemo) {
      const legacyRaw = localStorage.getItem('dominoes_tournament');
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw);
        if (legacy?.teams?.some(t => t.name === 'Los Tigres')) {
          return legacy;
        }
      }
      return null;
    }

    // In live mode: if live key not populated yet, check if legacy has real user teams
    const legacyRaw = localStorage.getItem('dominoes_tournament');
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      const isDefaultSeed = legacy?.teams?.length === 8 && legacy.teams.some(t => t.name === 'Los Tigres');
      // Only migrate if user had created custom real teams
      if (legacy && !isDefaultSeed && legacy.teams?.length > 0) {
        saveState(legacy, false);
        return legacy;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function saveState(state, demoOverride) {
  if (typeof window === 'undefined') return;
  try {
    const isDemo = demoOverride !== undefined ? demoOverride : (state?.isDemo ?? isDemoMode());
    const key = isDemo ? STORAGE_KEY_DEMO : STORAGE_KEY_LIVE;
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // quota or private-mode – silently ignore
  }
}

export function clearState(demoOverride) {
  if (typeof window === 'undefined') return;
  try {
    const isDemo = demoOverride !== undefined ? demoOverride : isDemoMode();
    const key = isDemo ? STORAGE_KEY_DEMO : STORAGE_KEY_LIVE;
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// ─── Admin PIN ──────────────────────────────────────────────────────
const PIN_KEY = 'dominoes_admin';
const DEFAULT_PIN = '1234';

export function isAdminUnlocked() {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(PIN_KEY) === 'unlocked';
  } catch {
    return false;
  }
}

export function unlockAdmin(pin) {
  if (pin === DEFAULT_PIN) {
    try { sessionStorage.setItem(PIN_KEY, 'unlocked'); } catch {}
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('admin_status_changed'));
    }
    return true;
  }
  return false;
}

export function lockAdmin() {
  try { sessionStorage.removeItem(PIN_KEY); } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('admin_status_changed'));
  }
}

export function useAdminStatus() {
  const [isAdmin, setIsAdmin] = useState(isAdminUnlocked);

  useEffect(() => {
    const handleUpdate = () => setIsAdmin(isAdminUnlocked());
    window.addEventListener('admin_status_changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('admin_status_changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return isAdmin;
}

