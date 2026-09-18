import React, { createContext, useContext, useCallback, useEffect, useSyncExternalStore } from 'react';
import {
  loadState,
  saveState,
  isDemoMode,
  setDemoMode as setStorageDemoMode,
  STORAGE_KEY_LIVE,
  STORAGE_KEY_DEMO,
  DEMO_MODE_KEY,
} from '../utils/storage';
import { createHistoryManager } from '../utils/historyManager';
import { DEFAULT_TEAMS, DEFAULT_TABLES_COUNT, DEFAULT_CONFIG } from '../utils/defaultData';
import {
  distributeTeams,
  generateGroupMatches,
  generateBracket,
  advanceBracketWinner,
  resetBracketMatch as engineResetBracketMatch,
  recommendGroups,
  nextTeamId,
  resetMatchIdCounter,
  resetTeamIdCounter,
  withdrawTeam as engineWithdraw,
  updateBracketMatchParticipants,
  swapBracketMatchTeams as engineSwapBracketMatchTeams,
  swapBracketSlots as engineSwapBracketSlots,
  swapTeamsBetweenGroups as engineSwapTeamsBetweenGroups,
  reassignTeamToGroup as engineReassignTeamToGroup,
  updateGroupMatch as engineUpdateGroupMatch,
  swapGroupMatchTeams as engineSwapGroupMatchTeams,
} from '../utils/tournamentEngine';
import { fetchTeamsFromGoogleSheet } from '../utils/googleSheets';

// ─── Initial state ──────────────────────────────────────────────────
function buildInitialState(demoOverride) {
  const isDemo = demoOverride !== undefined ? demoOverride : isDemoMode();
  const saved = loadState(isDemo);

  if (saved && saved.teams && Array.isArray(saved.teams)) {
    resetMatchIdCounter(saved.matches || []);
    resetTeamIdCounter(saved.teams || []);
    return {
      ...saved,
      isDemo,
      config: {
        ...DEFAULT_CONFIG,
        ...(saved.config || {}),
        tournamentName: (!saved.config?.tournamentName || saved.config?.tournamentName === "Gabo's Birthday Dominoes Invitational") ? DEFAULT_CONFIG.tournamentName : saved.config.tournamentName,
        eventDate: (!saved.config?.eventDate || saved.config?.eventDate === 'September 2026') ? DEFAULT_CONFIG.eventDate : saved.config.eventDate,
        googleFormUrl: (!saved.config?.googleFormUrl || saved.config?.googleFormUrl === 'https://forms.gle/PLACEHOLDER') ? DEFAULT_CONFIG.googleFormUrl : saved.config.googleFormUrl,
        googleSheetUrl: (!saved.config?.googleSheetUrl || saved.config?.googleSheetUrl.includes('PLACEHOLDER')) ? DEFAULT_CONFIG.googleSheetUrl : saved.config.googleSheetUrl,
      },
    };
  }

  // Demo Mode initial state: Seed with the 8 bodega sample teams
  if (isDemo) {
    const teams = DEFAULT_TEAMS.map(t => ({ ...t, withdrawn: false }));
    const rec = recommendGroups(teams.length);
    const groups = distributeTeams(teams, rec.poolCount);
    resetMatchIdCounter([]);
    resetTeamIdCounter(teams);
    return {
      teams,
      groups,
      matches: [],
      bracket: null,
      stage: 'setup',
      overrides: {},
      champion: null,
      tablesCount: DEFAULT_TABLES_COUNT,
      config: { ...DEFAULT_CONFIG },
      isDemo: true,
    };
  }

  // Live Mode initial state: Clean empty tournament for public visitors
  resetMatchIdCounter([]);
  resetTeamIdCounter([]);
  return {
    teams: [],
    groups: {},
    matches: [],
    bracket: null,
    stage: 'setup',
    overrides: {},
    champion: null,
    tablesCount: DEFAULT_TABLES_COUNT,
    config: { ...DEFAULT_CONFIG },
    isDemo: false,
  };
}

// ─── External store for cross-tab sync ──────────────────────────────
let _state = buildInitialState();
let _listeners = new Set();
const _history = createHistoryManager();

function getState() { return _state; }

function subscribe(listener) {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

function emitChange() {
  _listeners.forEach(l => l());
}

function setState(newState, skipSave) {
  _state = newState;
  if (!skipSave) saveState(newState, newState?.isDemo);
  emitChange();
}

// Cross-tab sync & Mode switch listener
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    const currentKey = isDemoMode() ? STORAGE_KEY_DEMO : STORAGE_KEY_LIVE;
    if (e.key === currentKey && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed && typeof parsed === 'object') {
          _state = parsed;
          resetMatchIdCounter(parsed.matches || []);
          resetTeamIdCounter(parsed.teams || []);
          emitChange();
        }
      } catch { /* ignore malformed */ }
    } else if (e.key === DEMO_MODE_KEY) {
      _history.clear();
      _state = buildInitialState(isDemoMode());
      emitChange();
    }
  });

  window.addEventListener('dominoes_mode_changed', () => {
    _history.clear();
    _state = buildInitialState(isDemoMode());
    emitChange();
  });
}

// ─── Context ────────────────────────────────────────────────────────
const TournamentContext = createContext(null);

export function TournamentProvider({ children }) {
  const state = useSyncExternalStore(subscribe, getState);

  // ─── Mutator helper ───────────────────────────────────────────────
  const mutate = useCallback((actionDesc, mutator) => {
    _history.push(_state, actionDesc);
    const newState = mutator(JSON.parse(JSON.stringify(_state)));
    setState(newState);
  }, []);

  // ─── Actions ──────────────────────────────────────────────────────
  const addTeam = useCallback((name, player1, player2) => {
    mutate(`Added team "${name}"`, (s) => {
      s.teams.push({ id: nextTeamId(), name, player1, player2, withdrawn: false });
      if (s.stage === 'setup') {
        const rec = recommendGroups(s.teams.filter(t => !t.withdrawn).length);
        s.groups = distributeTeams(s.teams.filter(t => !t.withdrawn), rec.poolCount);
      }
      return s;
    });
  }, [mutate]);

  const removeTeam = useCallback((teamId) => {
    mutate(`Removed team`, (s) => {
      s.teams = s.teams.filter(t => t.id !== teamId);
      if (s.stage === 'setup') {
        const rec = recommendGroups(s.teams.filter(t => !t.withdrawn).length);
        s.groups = distributeTeams(s.teams.filter(t => !t.withdrawn), rec.poolCount);
      }
      return s;
    });
  }, [mutate]);

  const editTeam = useCallback((teamId, updates) => {
    mutate(`Edited team`, (s) => {
      const team = s.teams.find(t => t.id === teamId);
      if (team) Object.assign(team, updates);
      return s;
    });
  }, [mutate]);

  const withdrawTeam = useCallback((teamId) => {
    const team = _state.teams.find(t => t.id === teamId);
    mutate(`Withdrew team "${team?.name || teamId}"`, (s) => {
      return engineWithdraw(s, teamId);
    });
  }, [mutate]);

  const regenerateGroups = useCallback((poolCount) => {
    mutate(`Regenerated groups (${poolCount} pools)`, (s) => {
      const active = s.teams.filter(t => !t.withdrawn);
      s.groups = distributeTeams(active, poolCount || recommendGroups(active.length).poolCount);
      return s;
    });
  }, [mutate]);

  const moveTeamToGroup = useCallback((teamId, fromGroup, toGroup) => {
    mutate(`Moved team to Pool ${toGroup}`, (s) => {
      s.groups[fromGroup] = s.groups[fromGroup].filter(id => id !== teamId);
      if (!s.groups[toGroup]) s.groups[toGroup] = [];
      s.groups[toGroup].push(teamId);
      return s;
    });
  }, [mutate]);

  const startGroupStage = useCallback(() => {
    mutate('Started group stage', (s) => {
      s.stage = 'groups';
      resetMatchIdCounter([]);
      s.matches = generateGroupMatches(s.groups, s.tablesCount);
      return s;
    });
  }, [mutate]);

  const recordWinner = useCallback((matchId, winnerId) => {
    const winnerTeam = _state.teams.find(t => t.id === winnerId);
    mutate(`Recorded ${winnerTeam?.name || 'team'} win`, (s) => {
      const m = s.matches.find(x => x.id === matchId);
      if (m) m.winner = winnerId;
      return s;
    });
  }, [mutate]);

  const resetMatch = useCallback((matchId) => {
    mutate(`Reset match`, (s) => {
      const m = s.matches.find(x => x.id === matchId);
      if (m) m.winner = null;
      // Also clear from overrides
      if (s.overrides.manualWinner?.[matchId]) {
        delete s.overrides.manualWinner[matchId];
      }
      return s;
    });
  }, [mutate]);

  const setManualRank = useCallback((groupId, teamId, rank) => {
    mutate(`Manual rank override`, (s) => {
      if (!s.overrides.manualRank) s.overrides.manualRank = {};
      if (!s.overrides.manualRank[groupId]) s.overrides.manualRank[groupId] = {};
      s.overrides.manualRank[groupId][teamId] = rank;
      return s;
    });
  }, [mutate]);

  const clearManualRank = useCallback((groupId, teamId) => {
    mutate(`Cleared manual rank`, (s) => {
      if (s.overrides.manualRank?.[groupId]?.[teamId] != null) {
        delete s.overrides.manualRank[groupId][teamId];
      }
      return s;
    });
  }, [mutate]);

  const generateKnockout = useCallback(() => {
    mutate('Generated knockout bracket', (s) => {
      s.stage = 'knockout';
      resetMatchIdCounter(s.matches);
      s.bracket = generateBracket(s.groups, s.matches, s.overrides);
      return s;
    });
  }, [mutate]);

  const recordBracketWinner = useCallback((matchId, winnerId) => {
    const winnerTeam = _state.teams.find(t => t.id === winnerId);
    mutate(`${winnerTeam?.name || 'Team'} wins knockout match`, (s) => {
      s.bracket = advanceBracketWinner(s.bracket, matchId, winnerId);
      // Check if this was the final
      const allRounds = s.bracket?.rounds || [];
      const finalRound = allRounds[allRounds.length - 1];
      if (finalRound) {
        const finalMatch = finalRound.matches[0];
        if (finalMatch?.winner) {
          s.champion = s.teams.find(t => t.id === finalMatch.winner) || null;
          s.stage = 'finished';
        }
      }
      return s;
    });
  }, [mutate]);

  const resetBracketMatch = useCallback((matchId) => {
    mutate('Reset bracket match', (s) => {
      if (!s.bracket) return s;
      s.bracket = engineResetBracketMatch(s.bracket, matchId);
      s.champion = null;
      if (s.stage === 'finished') s.stage = 'knockout';
      return s;
    });
  }, [mutate]);

  const setChampion = useCallback((teamId) => {
    const team = _state.teams.find(t => t.id === teamId);
    mutate(`Set ${team?.name || 'team'} as champion`, (s) => {
      s.champion = team ? { ...team } : null;
      s.stage = 'finished';
      return s;
    });
  }, [mutate]);

  const setTablesCount = useCallback((count) => {
    mutate(`Set tables to ${count}`, (s) => {
      s.tablesCount = count;
      return s;
    });
  }, [mutate]);

  // ─── Emergency Admin Overrides ────────────────────────────────────

  const updateBracketMatch = useCallback((matchId, updates) => {
    mutate('Updated bracket match matchup', (s) => {
      if (!s.bracket) return s;
      s.bracket = updateBracketMatchParticipants(s.bracket, matchId, updates);
      // Check if champion needs recalculation
      const allRounds = s.bracket?.rounds || [];
      const finalRound = allRounds[allRounds.length - 1];
      const finalMatch = finalRound?.matches?.[0];
      if (!finalMatch?.winner) {
        s.champion = null;
        if (s.stage === 'finished') s.stage = 'knockout';
      }
      return s;
    });
  }, [mutate]);

  const swapBracketTeams = useCallback((matchId) => {
    mutate('Swapped match home/away slots', (s) => {
      if (!s.bracket) return s;
      s.bracket = engineSwapBracketMatchTeams(s.bracket, matchId);
      return s;
    });
  }, [mutate]);

  const swapBracketMatchSlots = useCallback((matchId1, slot1, matchId2, slot2) => {
    mutate('Swapped slots between bracket matches', (s) => {
      if (!s.bracket) return s;
      s.bracket = engineSwapBracketSlots(s.bracket, matchId1, slot1, matchId2, slot2);
      const allRounds = s.bracket?.rounds || [];
      const finalRound = allRounds[allRounds.length - 1];
      const finalMatch = finalRound?.matches?.[0];
      if (!finalMatch?.winner) {
        s.champion = null;
        if (s.stage === 'finished') s.stage = 'knockout';
      }
      return s;
    });
  }, [mutate]);

  const swapTeamsBetweenPools = useCallback((teamIdA, teamIdB) => {
    const teamA = _state.teams.find(t => t.id === teamIdA);
    const teamB = _state.teams.find(t => t.id === teamIdB);
    mutate(`Swapped pools: ${teamA?.name || teamIdA} ⇄ ${teamB?.name || teamIdB}`, (s) => {
      return engineSwapTeamsBetweenGroups(s, teamIdA, teamIdB);
    });
  }, [mutate]);

  const reassignTeamPool = useCallback((teamId, targetGroupId) => {
    const team = _state.teams.find(t => t.id === teamId);
    mutate(`Reassigned ${team?.name || 'team'} to Pool ${targetGroupId}`, (s) => {
      return engineReassignTeamToGroup(s, teamId, targetGroupId);
    });
  }, [mutate]);

  const setManualAdvancement = useCallback((groupId, teamIds) => {
    mutate(`Manual advancement for Pool ${groupId}`, (s) => {
      if (!s.overrides.manualAdvancement) s.overrides.manualAdvancement = {};
      s.overrides.manualAdvancement[groupId] = teamIds;
      return s;
    });
  }, [mutate]);

  const clearManualAdvancement = useCallback((groupId) => {
    mutate(`Cleared manual advancement for Pool ${groupId}`, (s) => {
      if (s.overrides.manualAdvancement?.[groupId]) {
        delete s.overrides.manualAdvancement[groupId];
      }
      return s;
    });
  }, [mutate]);

  const updateGroupMatch = useCallback((matchId, updates) => {
    mutate('Updated group match', (s) => {
      s.matches = engineUpdateGroupMatch(s.matches, matchId, updates);
      return s;
    });
  }, [mutate]);

  const swapGroupMatchTeams = useCallback((matchId) => {
    mutate('Swapped group match positions', (s) => {
      s.matches = engineSwapGroupMatchTeams(s.matches, matchId);
      return s;
    });
  }, [mutate]);

  const undo = useCallback(() => {
    const snapshot = _history.pop();
    if (snapshot) {
      setState(snapshot.state);
      return snapshot.action;
    }
    return null;
  }, []);

  const resetTournament = useCallback(() => {
    mutate('Reset entire tournament', (s) => {
      s.matches = [];
      s.bracket = null;
      s.champion = null;
      s.stage = 'setup';
      s.overrides = {};
      const rec = recommendGroups(s.teams.filter(t => !t.withdrawn).length);
      s.groups = distributeTeams(s.teams.filter(t => !t.withdrawn), rec.poolCount);
      return s;
    });
  }, [mutate]);

  const switchMode = useCallback((demoEnabled) => {
    setStorageDemoMode(demoEnabled);
    _history.clear();
    const nextState = buildInitialState(demoEnabled);
    setState(nextState);
  }, []);

  const loadDemoData = useCallback(() => {
    setStorageDemoMode(true);
    _history.clear();
    const demo = {
      teams: DEFAULT_TEAMS.map(t => ({ ...t, withdrawn: false })),
      groups: {},
      matches: [],
      bracket: null,
      stage: 'setup',
      overrides: {},
      champion: null,
      tablesCount: DEFAULT_TABLES_COUNT,
      config: _state.config || { ...DEFAULT_CONFIG },
      isDemo: true,
    };
    const rec = recommendGroups(demo.teams.length);
    demo.groups = distributeTeams(demo.teams, rec.poolCount);
    resetMatchIdCounter([]);
    resetTeamIdCounter(demo.teams);
    setState(demo);
  }, []);

  const clearToRealTournament = useCallback(() => {
    setStorageDemoMode(false);
    _history.clear();
    const clean = {
      teams: [],
      groups: {},
      matches: [],
      bracket: null,
      stage: 'setup',
      overrides: {},
      champion: null,
      tablesCount: DEFAULT_TABLES_COUNT,
      config: _state.config || { ...DEFAULT_CONFIG },
      isDemo: false,
    };
    resetMatchIdCounter([]);
    resetTeamIdCounter([]);
    setState(clean);
  }, []);

  const fullReset = useCallback(() => {
    _history.clear();
    if (_state.isDemo) {
      loadDemoData();
    } else {
      clearToRealTournament();
    }
  }, [_state.isDemo, loadDemoData, clearToRealTournament]);

  const updateConfig = useCallback((newConfig) => {
    mutate('Updated tournament configuration', (s) => {
      s.config = { ...(s.config || DEFAULT_CONFIG), ...newConfig };
      return s;
    });
  }, [mutate]);

  const bulkAddTeams = useCallback((teamList) => {
    mutate(`Imported ${teamList.length} teams`, (s) => {
      for (const t of teamList) {
        if (t.name?.trim()) {
          s.teams.push({
            id: nextTeamId(),
            name: t.name.trim(),
            player1: t.player1?.trim() || 'Player 1',
            player2: t.player2?.trim() || 'Player 2',
            withdrawn: false,
          });
        }
      }
      if (s.stage === 'setup') {
        const active = s.teams.filter(t => !t.withdrawn);
        const rec = recommendGroups(active.length);
        s.groups = distributeTeams(active, rec.poolCount);
      }
      return s;
    });
  }, [mutate]);

  const syncWithGoogleSheet = useCallback(async (replace = true) => {
    const sheetUrl = _state.config?.googleSheetUrl || DEFAULT_CONFIG.googleSheetUrl;
    const res = await fetchTeamsFromGoogleSheet(sheetUrl);
    if (!res.success) {
      return { success: false, error: res.error, teams: [], count: 0 };
    }
    if (res.teams.length === 0) {
      return {
        success: true,
        count: 0,
        rawCount: res.rawCount,
        missingPaidColumn: res.missingPaidColumn,
        teams: [],
        message: res.rawCount > 0
          ? `Found ${res.rawCount} submissions, but none marked 'Paid'.`
          : 'No submissions found in Google Sheet.',
      };
    }

    mutate(`Synced ${res.teams.length} paid teams from Google Sheet`, (s) => {
      s.isDemo = false;
      setStorageDemoMode(false);
      if (replace) {
        resetTeamIdCounter([]);
        s.teams = res.teams.map(t => ({
          id: nextTeamId(),
          name: t.name,
          player1: t.player1,
          player2: t.player2,
          withdrawn: false,
        }));
      } else {
        for (const t of res.teams) {
          const exists = s.teams.some(existing =>
            existing.name.toLowerCase() === t.name.toLowerCase()
          );
          if (!exists) {
            s.teams.push({
              id: nextTeamId(),
              name: t.name,
              player1: t.player1,
              player2: t.player2,
              withdrawn: false,
            });
          }
        }
      }

      if (s.stage === 'setup') {
        const active = s.teams.filter(t => !t.withdrawn);
        const rec = recommendGroups(active.length);
        s.groups = distributeTeams(active, rec.poolCount);
      }
      return s;
    });

    return {
      success: true,
      count: res.teams.length,
      rawCount: res.rawCount,
      teams: res.teams,
    };
  }, [mutate]);

  // ─── Automatic Background Sync from Google Sheet ─────────────────
  // Automatically pulls paid teams from Google Sheet whenever someone visits the site,
  // refreshes, or refocuses the tab — eliminating manual syncing during registration.
  // Strictly disabled in demo mode and once the tournament progresses past 'setup'.
  useEffect(() => {
    if (state.isDemo || state.stage !== 'setup') return;

    const sheetUrl = state.config?.googleSheetUrl || DEFAULT_CONFIG.googleSheetUrl;
    if (!sheetUrl) return;

    let isMounted = true;
    let lastSyncTime = 0;

    const autoSync = async () => {
      const now = Date.now();
      if (now - lastSyncTime < 10000) return; // Throttle to 10s
      lastSyncTime = now;

      try {
        const res = await fetchTeamsFromGoogleSheet(sheetUrl);
        if (!isMounted || !res.success) return;

        if (res.teams && res.teams.length > 0) {
          mutate('Background auto-sync from Google Sheet', (s) => {
            if (s.stage !== 'setup' || s.isDemo) return s;

            const currentTeams = s.teams || [];
            const isSameCount = currentTeams.length === res.teams.length;
            const isSameTeams = isSameCount && res.teams.every((t, idx) =>
              currentTeams[idx]?.name?.trim().toLowerCase() === t.name?.trim().toLowerCase() &&
              currentTeams[idx]?.player1?.trim().toLowerCase() === t.player1?.trim().toLowerCase() &&
              currentTeams[idx]?.player2?.trim().toLowerCase() === t.player2?.trim().toLowerCase()
            );

            if (isSameTeams) return s;

            const existingByName = new Map(currentTeams.map(t => [t.name?.trim().toLowerCase(), t]));

            const updatedTeams = res.teams.map(t => {
              const existing = existingByName.get(t.name?.trim().toLowerCase());
              return {
                id: existing ? existing.id : (t.id || nextTeamId()),
                name: t.name,
                player1: t.player1,
                player2: t.player2,
                withdrawn: existing?.withdrawn ?? false,
              };
            });

            s.teams = updatedTeams;
            const active = s.teams.filter(t => !t.withdrawn);
            const rec = recommendGroups(active.length);
            s.groups = distributeTeams(active, rec.poolCount);
            return s;
          });
        }
      } catch (err) {
        console.warn('Background sheet auto-sync failed:', err);
      }
    };

    // Run autoSync immediately upon mounting/visiting
    autoSync();

    // Periodically poll every 20 seconds while on setup screen
    const intervalId = setInterval(() => {
      if (isMounted) autoSync();
    }, 20000);

    // Also trigger immediately when user switches back to this browser tab
    let handleFocus;
    if (typeof window !== 'undefined') {
      handleFocus = () => autoSync();
      window.addEventListener('focus', handleFocus);
    }

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      if (handleFocus && typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus);
      }
    };
  }, [state.isDemo, state.stage, state.config?.googleSheetUrl, mutate]);

  const value = {
    state,
    isDemo: Boolean(state.isDemo),
    setDemoMode: switchMode,
    addTeam,
    bulkAddTeams,
    syncWithGoogleSheet,
    removeTeam,
    editTeam,
    withdrawTeam,
    regenerateGroups,
    moveTeamToGroup,
    startGroupStage,
    recordWinner,
    resetMatch,
    setManualRank,
    clearManualRank,
    generateKnockout,
    recordBracketWinner,
    resetBracketMatch,
    setChampion,
    setTablesCount,
    updateBracketMatch,
    swapBracketTeams,
    swapBracketMatchSlots,
    swapTeamsBetweenPools,
    reassignTeamPool,
    setManualAdvancement,
    clearManualAdvancement,
    updateGroupMatch,
    swapGroupMatchTeams,
    updateConfig,
    undo,
    resetTournament,
    fullReset,
    loadDemoData,
    clearToRealTournament,
    undoHistory: _history,
  };

  return (
    <TournamentContext.Provider value={value}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error('useTournament must be used within TournamentProvider');
  return ctx;
}
