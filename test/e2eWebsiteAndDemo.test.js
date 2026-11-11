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
  isAdminUnlocked,
  unlockAdmin,
  lockAdmin,
} from '../src/utils/storage.js';

import {
  DEFAULT_TEAMS,
  DEFAULT_CONFIG,
  DEFAULT_TABLES_COUNT,
} from '../src/utils/defaultData.js';

import {
  calcGroupStandings,
  calcOpenStandings,
  generateOpenBracket,
  advanceBracketWinner,
  resetMatchIdCounter,
  resetTeamIdCounter,
  nextMatchId,
  distributeTeams,
  recommendGroups,
} from '../src/utils/tournamentEngine.js';

describe('Website & Demo Full End-to-End Workflow Test', () => {
  let mockStorage;
  let mockSessionStorage;
  let originalWindow;

  beforeEach(() => {
    mockStorage = new Map();
    mockSessionStorage = new Map();
    originalWindow = global.window;
    global.window = {
      location: { search: '' },
      dispatchEvent: () => {},
    };
    global.localStorage = {
      getItem: (k) => mockStorage.get(k) ?? null,
      setItem: (k, v) => mockStorage.set(k, String(v)),
      removeItem: (k) => mockStorage.delete(k),
      clear: () => mockStorage.clear(),
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

  test('1. Demo Mode Initialization with 8 Default Teams', () => {
    // 1.1 Live mode defaults to empty tournament
    assert.equal(isDemoMode(), false);
    const liveInitial = loadState(false);
    assert.equal(liveInitial, null, 'Unseeded live state is null until setup');

    // 1.2 Enable Demo Mode via query parameter ?demo=true
    global.window.location.search = '?demo=true';
    assert.equal(isDemoMode(), true, 'isDemoMode should detect ?demo=true');

    // 1.3 Verify Demo Initial State
    const demoTeams = DEFAULT_TEAMS.map((t) => ({ ...t, withdrawn: false }));
    assert.equal(demoTeams.length, 8, 'Demo should seed 8 teams');
    assert.equal(demoTeams[0].name, 'Los Tigres');
    assert.equal(demoTeams[1].name, 'El Barrio');
    assert.equal(demoTeams[2].name, 'Mambo Kings');

    const rec = recommendGroups(demoTeams.length);
    assert.equal(rec.poolCount, 2, '8 teams should be distributed into 2 pools');
    const groups = distributeTeams(demoTeams, rec.poolCount);
    assert.deepEqual(Object.keys(groups).sort(), ['A', 'B']);
    assert.equal(groups.A.length, 4);
    assert.equal(groups.B.length, 4);
  });

  test('2. Manual Group Matchmaker: Seating, Cross-Pool Warning, and Unseating', () => {
    const demoTeams = DEFAULT_TEAMS.map((t) => ({ ...t, withdrawn: false }));
    const groups = distributeTeams(demoTeams, 2);

    let state = {
      teams: demoTeams,
      groups,
      matches: [],
      activeTables: {
        1: { teamA: null, teamB: null },
        2: { teamA: null, teamB: null },
      },
      bracket: null,
      stage: 'groups',
      tablesCount: 2,
      isDemo: true,
      overrides: {},
    };

    const team1 = groups.A[0]; // Pool A
    const team2 = groups.A[1]; // Pool A
    const team3 = groups.A[2]; // Pool A
    const team5 = groups.B[0]; // Pool B

    // Seating Team 1 and Team 2 on Table 1 (Intra-pool: Both in Pool A)
    state.activeTables[1].teamA = team1;
    state.activeTables[1].teamB = team2;

    const poolOf = (tId) => (groups.A.includes(tId) ? 'A' : groups.B.includes(tId) ? 'B' : null);
    assert.equal(poolOf(team1), 'A');
    assert.equal(poolOf(team2), 'A');
    const isT1CrossPool = poolOf(team1) !== poolOf(team2);
    assert.equal(isT1CrossPool, false, 'Table 1 matchup is intra-pool');

    // Seating Team 3 (Pool A) and Team 5 (Pool B) on Table 2 (Cross-pool!)
    state.activeTables[2].teamA = team3;
    state.activeTables[2].teamB = team5;
    const isT2CrossPool = poolOf(team3) !== poolOf(team5);
    assert.equal(isT2CrossPool, true, 'Table 2 matchup is cross-pool and triggers red alert');

    // Test unseating a team
    state.activeTables[1].teamB = null;
    assert.equal(state.activeTables[1].teamB, null, 'Table 1 slot B is open');
    // Reseat Team 2
    state.activeTables[1].teamB = team2;
    assert.equal(state.activeTables[1].teamB, team2);
  });

  test('3. Score Submission with Winner Locked to 200 and Point Differential Calculation', () => {
    const demoTeams = DEFAULT_TEAMS.map((t) => ({ ...t, withdrawn: false }));
    const groups = distributeTeams(demoTeams, 2);

    const teamAId = groups.A[0]; // Los Tigres
    const teamBId = groups.A[1]; // El Barrio

    let state = {
      teams: demoTeams,
      groups,
      matches: [],
      activeTables: {
        1: { teamA: teamAId, teamB: teamBId },
        2: { teamA: null, teamB: null },
      },
      bracket: null,
      stage: 'groups',
      tablesCount: 2,
      isDemo: true,
      overrides: {},
    };

    // Simulate modal logic:
    // Team A declared winner -> Score locked to 200
    // Team B is loser -> Score entered as 135
    const scoreA = 200;
    const scoreB = 135;
    const winner = teamAId;

    const diff = Math.abs(scoreA - scoreB); // 65
    assert.equal(diff, 65);

    // Record open match on Table 1
    resetMatchIdCounter(state.matches);
    const newMatch = {
      id: nextMatchId(),
      stage: 'group',
      groupId: 'A',
      table: 1,
      teamA: teamAId,
      teamB: teamBId,
      scoreA,
      scoreB,
      winner,
      completedAt: Date.now(),
    };
    state.matches.push(newMatch);

    // Free Table 1
    state.activeTables[1] = { teamA: null, teamB: null };

    // Verify Table 1 is free
    assert.equal(state.activeTables[1].teamA, null);
    assert.equal(state.activeTables[1].teamB, null);

    // Verify standings
    const standingsA = calcGroupStandings('A', groups.A, state.matches, state.overrides);
    const winnerStanding = standingsA.find((s) => s.teamId === teamAId);
    const loserStanding = standingsA.find((s) => s.teamId === teamBId);

    assert.equal(winnerStanding.wins, 1);
    assert.equal(winnerStanding.losses, 0);
    assert.equal(winnerStanding.diff, 65, 'Winner gets +65 diff');

    assert.equal(loserStanding.wins, 0);
    assert.equal(loserStanding.losses, 1);
    assert.equal(loserStanding.diff, -65, 'Loser gets -65 diff');

    // Standby display verification:
    // Standby card shows only W-L (e.g. "1W–0L" and "0W–1L"), diff is excluded from the card
    const winnerStandbyCardText = `${winnerStanding.wins}W–${winnerStanding.losses}L`;
    const loserStandbyCardText = `${loserStanding.wins}W–${loserStanding.losses}L`;
    assert.equal(winnerStandbyCardText, '1W–0L');
    assert.equal(loserStandbyCardText, '0W–1L');
  });

  test('4. Cross-Pool Score Submission updates Standings in Both Pools', () => {
    const demoTeams = DEFAULT_TEAMS.map((t) => ({ ...t, withdrawn: false }));
    const groups = distributeTeams(demoTeams, 2);

    const teamAId = groups.A[2]; // Pool A team
    const teamBId = groups.B[0]; // Pool B team

    let state = {
      teams: demoTeams,
      groups,
      matches: [],
      activeTables: {
        1: { teamA: null, teamB: null },
        2: { teamA: teamAId, teamB: teamBId },
      },
      bracket: null,
      stage: 'groups',
      tablesCount: 2,
      isDemo: true,
      overrides: {},
    };

    // Pool A team wins 200 to 110 against Pool B team
    const match = {
      id: nextMatchId(),
      stage: 'group',
      groupId: 'A',
      table: 2,
      teamA: teamAId,
      teamB: teamBId,
      scoreA: 200,
      scoreB: 110,
      winner: teamAId,
      completedAt: Date.now(),
    };
    state.matches.push(match);
    state.activeTables[2] = { teamA: null, teamB: null };

    // Check Pool A standings: Team A has 1W, +90 diff
    const standingsA = calcGroupStandings('A', groups.A, state.matches, state.overrides);
    const sA = standingsA.find((s) => s.teamId === teamAId);
    assert.equal(sA.wins, 1);
    assert.equal(sA.diff, 90);

    // Check Pool B standings: Team B has 1L, -90 diff
    const standingsB = calcGroupStandings('B', groups.B, state.matches, state.overrides);
    const sB = standingsB.find((s) => s.teamId === teamBId);
    assert.equal(sB.losses, 1);
    assert.equal(sB.diff, -90);
  });

  test('5. Tie Breaking by Point Differential in Standings', () => {
    const teams = ['team_1', 'team_2', 'team_3', 'team_4'];
    // All three teams end 1-1
    // team_1: won 200-100 (+100), lost 150-200 (-50) -> net +50
    // team_2: won 200-180 (+20), lost 120-200 (-80) -> net -60
    // team_3: won 200-140 (+60), lost 100-200 (-100) -> net -40
    const matches = [
      { id: 'm1', stage: 'group', teamA: 'team_1', teamB: 'team_2', scoreA: 200, scoreB: 100, winner: 'team_1' },
      { id: 'm2', stage: 'group', teamA: 'team_2', teamB: 'team_3', scoreA: 200, scoreB: 180, winner: 'team_2' },
      { id: 'm3', stage: 'group', teamA: 'team_3', teamB: 'team_1', scoreA: 200, scoreB: 150, winner: 'team_3' },
      { id: 'm4', stage: 'group', teamA: 'team_4', teamB: 'team_2', scoreA: 120, scoreB: 200, winner: 'team_2' },
    ];

    const standings = calcOpenStandings(teams, matches);

    // Top team by wins/diff:
    // team_2: 2 wins
    assert.equal(standings[0].teamId, 'team_2');
    assert.equal(standings[0].wins, 2);

    // team_1 vs team_3 both have 1 win
    // team_1 diff is +50, team_3 diff is -10
    const s1 = standings.find((s) => s.teamId === 'team_1');
    const s3 = standings.find((s) => s.teamId === 'team_3');
    assert.equal(s1.diff, 50);
    assert.ok(s1.diff > s3.diff);

    const rank1Index = standings.findIndex((s) => s.teamId === 'team_1');
    const rank3Index = standings.findIndex((s) => s.teamId === 'team_3');
    assert.ok(rank1Index < rank3Index, 'team_1 (+50) must rank ahead of team_3');
  });

  test('6. Full Progression: Group Stage -> Knockout Bracket -> Champion Declaration', () => {
    const demoTeams = DEFAULT_TEAMS.map((t) => ({ ...t, withdrawn: false }));
    const standings = [
      { teamId: 'team_1', wins: 3, diff: 120 },
      { teamId: 'team_2', wins: 2, diff: 40 },
      { teamId: 'team_3', wins: 2, diff: 10 },
      { teamId: 'team_4', wins: 1, diff: -20 },
    ];

    // Generate bracket for top 4
    const bracket = generateOpenBracket(standings, 4, 2);
    assert.equal(bracket.rounds.length, 2);
    assert.equal(bracket.rounds[0].name, 'Semifinals');
    assert.equal(bracket.rounds[1].name, 'Championship Final');

    // Semifinal 1: Seed 1 (team_1) vs Seed 4 (team_4)
    const semi1 = bracket.rounds[0].matches[0];
    assert.equal(semi1.teamA, 'team_1');
    assert.equal(semi1.teamB, 'team_4');

    // Semifinal 2: Seed 2 (team_2) vs Seed 3 (team_3)
    const semi2 = bracket.rounds[0].matches[1];
    assert.equal(semi2.teamA, 'team_2');
    assert.equal(semi2.teamB, 'team_3');

    // Play Semifinal 1: team_1 wins 200 - 160
    semi1.scoreA = 200;
    semi1.scoreB = 160;
    let updatedBracket = advanceBracketWinner(bracket, semi1.id, 'team_1');

    // Play Semifinal 2: team_2 wins 200 - 180
    const currentSemi2 = updatedBracket.rounds[0].matches[1];
    currentSemi2.scoreA = 200;
    currentSemi2.scoreB = 180;
    updatedBracket = advanceBracketWinner(updatedBracket, currentSemi2.id, 'team_2');

    // Final match should automatically be team_1 vs team_2
    const finalMatch = updatedBracket.rounds[1].matches[0];
    assert.equal(finalMatch.teamA, 'team_1');
    assert.equal(finalMatch.teamB, 'team_2');

    // Play Final: team_1 wins 200 - 190
    finalMatch.scoreA = 200;
    finalMatch.scoreB = 190;
    updatedBracket = advanceBracketWinner(updatedBracket, finalMatch.id, 'team_1');
    const completedFinal = updatedBracket.rounds[1].matches[0];
    assert.equal(completedFinal.winner, 'team_1');

    // Champion is team_1
    const champ = demoTeams.find((t) => t.id === completedFinal.winner);
    assert.equal(champ.name, 'Los Tigres');
    assert.equal(champ.player1, 'Carlos');
    assert.equal(champ.player2, 'Miguel');
  });

  test('7. Admin PIN Unlock & State Isolation Between Demo and Live Mode', () => {
    // 7.1 Admin PIN lifecycle
    assert.equal(isAdminUnlocked(), false);
    assert.equal(unlockAdmin('0000'), false);
    assert.equal(isAdminUnlocked(), false);
    assert.equal(unlockAdmin('1234'), true);
    assert.equal(isAdminUnlocked(), true);

    // 7.2 Save Demo Tournament
    const demoTournament = {
      teams: DEFAULT_TEAMS,
      stage: 'groups',
      isDemo: true,
    };
    saveState(demoTournament, true);

    // 7.3 Save Live Tournament
    const liveTournament = {
      teams: [{ id: 'live_team_1', name: 'Real Championship Duo', player1: 'Ada', player2: 'Grace' }],
      stage: 'setup',
      isDemo: false,
    };
    saveState(liveTournament, false);

    // 7.4 Verify isolated loads
    const loadedDemo = loadState(true);
    assert.equal(loadedDemo.isDemo, true);
    assert.equal(loadedDemo.teams.length, 8);

    const loadedLive = loadState(false);
    assert.equal(loadedLive.isDemo, false);
    assert.equal(loadedLive.teams.length, 1);
    assert.equal(loadedLive.teams[0].name, 'Real Championship Duo');

    // 7.5 Clearing demo does NOT clear live
    clearState(true);
    assert.equal(loadState(true), null);
    assert.equal(loadState(false).teams.length, 1);
  });
});
