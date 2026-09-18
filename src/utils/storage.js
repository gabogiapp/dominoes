import { useState, useEffect } from 'react';

// ─── localStorage / sessionStorage helpers ────────────────────────
// Graceful read/write – never crashes on malformed data.

const STORAGE_KEY = 'dominoes_tournament';

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota or private-mode – silently ignore
  }
}

export function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ─── Admin PIN ──────────────────────────────────────────────────────
const PIN_KEY = 'dominoes_admin';
const DEFAULT_PIN = '1234';

export function isAdminUnlocked() {
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
