import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  generateGroupMatches,
  generateRoundRobinRounds,
  getActiveMatches,
  getNextMatches,
} from '../src/utils/tournamentEngine.js';

describe('Table Scheduling & Concurrent Match Conflict Avoidance', () => {
  const makeTeams = (prefix, count) => {
    return Array.from({ length: count }, (_, i) => `${prefix}_${i + 1}`);
  };

  test('generateRoundRobinRounds generates mutually disjoint pairs per round', () => {
    const teamIds = ['A1', 'A2', 'A3', 'A4'];
    const rounds = generateRoundRobinRounds(teamIds);
    // 4 teams -> 3 rounds, 2 matches per round
    assert.equal(rounds.length, 3);
    for (const round of rounds) {
      assert.equal(round.length, 2);
      const teamsInRound = new Set();
      for (const pair of round) {
        assert.ok(!teamsInRound.has(pair[0]), `Duplicate team ${pair[0]} in round`);
        assert.ok(!teamsInRound.has(pair[1]), `Duplicate team ${pair[1]} in round`);
        teamsInRound.add(pair[0]);
        teamsInRound.add(pair[1]);
      }
      assert.equal(teamsInRound.size, 4);
    }
  });

  test('generateGroupMatches interleaves 2 pools so Table 1 and Table 2 never share teams', () => {
    const groups = {
      A: ['A1', 'A2', 'A3', 'A4'],
      B: ['B1', 'B2', 'B3', 'B4'],
    };
    const matches = generateGroupMatches(groups, 2);
    // 6 matches in A + 6 matches in B = 12 matches total
    assert.equal(matches.length, 12);

    // Matches at indices (0, 1), (2, 3), (4, 5) ... correspond to concurrent table pairs
    for (let i = 0; i < matches.length; i += 2) {
      const m1 = matches[i];
      const m2 = matches[i + 1];
      assert.equal(m1.table, 1);
      assert.equal(m2.table, 2);

      const teamsM1 = new Set([m1.teamA, m1.teamB]);
      assert.ok(!teamsM1.has(m2.teamA), `Collision on ${m2.teamA}`);
      assert.ok(!teamsM1.has(m2.teamB), `Collision on ${m2.teamB}`);
    }
  });

  test('generateGroupMatches schedules single pool of 4 teams across 2 tables with zero conflicts', () => {
    const groups = {
      A: ['A1', 'A2', 'A3', 'A4'],
    };
    const matches = generateGroupMatches(groups, 2);
    assert.equal(matches.length, 6);

    for (let i = 0; i < matches.length; i += 2) {
      const m1 = matches[i];
      const m2 = matches[i + 1];
      assert.equal(m1.table, 1);
      assert.equal(m2.table, 2);

      const teams = new Set([m1.teamA, m1.teamB, m2.teamA, m2.teamB]);
      assert.equal(teams.size, 4, 'All 4 teams must be distinct in concurrent table slot');
    }
  });

  test('generateGroupMatches scales to 4 tables with 4 pools', () => {
    const groups = {
      A: ['A1', 'A2', 'A3', 'A4'],
      B: ['B1', 'B2', 'B3', 'B4'],
      C: ['C1', 'C2', 'C3', 'C4'],
      D: ['D1', 'D2', 'D3', 'D4'],
    };
    const matches = generateGroupMatches(groups, 4);
    assert.equal(matches.length, 24);

    for (let i = 0; i < matches.length; i += 4) {
      const slot = matches.slice(i, i + 4);
      const tables = slot.map(m => m.table);
      assert.deepEqual(tables, [1, 2, 3, 4]);

      const teams = new Set();
      for (const m of slot) {
        assert.ok(!teams.has(m.teamA));
        assert.ok(!teams.has(m.teamB));
        teams.add(m.teamA);
        teams.add(m.teamB);
      }
      assert.equal(teams.size, 8, '8 distinct teams playing across 4 tables');
    }
  });

  test('getActiveMatches picks conflict-free matches and assigns distinct table numbers', () => {
    const matches = [
      { id: 'm_1', stage: 'group', groupId: 'A', teamA: 'A1', teamB: 'A4', table: 1, winner: null },
      { id: 'm_2', stage: 'group', groupId: 'B', teamA: 'B1', teamB: 'B4', table: 2, winner: null },
      { id: 'm_3', stage: 'group', groupId: 'A', teamA: 'A2', teamB: 'A3', table: 1, winner: null },
      { id: 'm_4', stage: 'group', groupId: 'B', teamA: 'B2', teamB: 'B3', table: 2, winner: null },
    ];

    const active = getActiveMatches(matches, 2);
    assert.equal(active.length, 2);
    assert.equal(active[0].id, 'm_1');
    assert.equal(active[0].table, 1);
    assert.equal(active[1].id, 'm_2');
    assert.equal(active[1].table, 2);

    const activeTeams = new Set([active[0].teamA, active[0].teamB, active[1].teamA, active[1].teamB]);
    assert.equal(activeTeams.size, 4);
  });

  test('getActiveMatches handles asynchronous match completion smoothly without team collisions', () => {
    const matches = [
      { id: 'm_1', stage: 'group', groupId: 'A', teamA: 'A1', teamB: 'A4', table: 1, winner: null },
      { id: 'm_2', stage: 'group', groupId: 'B', teamA: 'B1', teamB: 'B4', table: 2, winner: null },
      { id: 'm_3', stage: 'group', groupId: 'A', teamA: 'A2', teamB: 'A3', table: 1, winner: null },
      { id: 'm_4', stage: 'group', groupId: 'B', teamA: 'B2', teamB: 'B3', table: 2, winner: null },
    ];

    // Table 1 finishes m_1 early while Table 2 is still playing m_2
    matches[0].winner = 'A1';

    const active = getActiveMatches(matches, 2);
    assert.equal(active.length, 2);

    // Table 1 picks up m_3, Table 2 remains m_2
    assert.equal(active[0].id, 'm_3');
    assert.equal(active[0].table, 1);
    assert.equal(active[1].id, 'm_2');
    assert.equal(active[1].table, 2);

    const teams = new Set([active[0].teamA, active[0].teamB, active[1].teamA, active[1].teamB]);
    assert.equal(teams.size, 4);
  });

  test('getActiveMatches avoids duplicate team when unplayed matches have team overlap', () => {
    // Naive / legacy schedule order where m_1 and m_2 both contain team_1
    const matches = [
      { id: 'm_1', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_2', table: 1, winner: null },
      { id: 'm_2', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_3', table: 2, winner: null },
      { id: 'm_3', stage: 'group', groupId: 'A', teamA: 'team_3', teamB: 'team_4', table: 1, winner: null },
    ];

    const active = getActiveMatches(matches, 2);
    assert.equal(active.length, 2);

    // Must not pick m_2 because team_1 is playing m_1 on Table 1.
    // Instead picks m_3 (team_3 vs team_4) for Table 2!
    assert.equal(active[0].id, 'm_1');
    assert.equal(active[0].table, 1);
    assert.equal(active[1].id, 'm_3');
    assert.equal(active[1].table, 2);

    const teams = new Set([active[0].teamA, active[0].teamB, active[1].teamA, active[1].teamB]);
    assert.equal(teams.size, 4);
    assert.ok(!teams.has(active[1].teamA) || active[0].teamA !== active[1].teamA);
  });

  test('getActiveMatches activates only 1 match if all remaining matches share a team', () => {
    // Only 2 matches left, both involve team_1
    const matches = [
      { id: 'm_1', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_2', table: 1, winner: null },
      { id: 'm_2', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_3', table: 2, winner: null },
    ];

    const active = getActiveMatches(matches, 2);
    // User requirement: "that way it doesn't say that one team has to play two games at the same time. Of course if it's not possible that's fine"
    // Should NOT schedule team_1 at both Table 1 and Table 2!
    assert.equal(active.length, 1);
    assert.equal(active[0].id, 'm_1');
    assert.equal(active[0].table, 1);
  });

  test('getActiveMatches waits gracefully when single pool table finishes early and all candidates overlap', () => {
    const singlePool = [
      { id: 'm_1', stage: 'group', groupId: 'A', teamA: 'A1', teamB: 'A4', table: 1, winner: 'A1' },
      { id: 'm_2', stage: 'group', groupId: 'A', teamA: 'A2', teamB: 'A3', table: 2, winner: null },
      { id: 'm_3', stage: 'group', groupId: 'A', teamA: 'A1', teamB: 'A3', table: 1, winner: null },
      { id: 'm_4', stage: 'group', groupId: 'A', teamA: 'A4', teamB: 'A2', table: 2, winner: null },
    ];

    const active = getActiveMatches(singlePool, 2);
    // m_2 is currently playing on Table 2 ({A2, A3}).
    // m_3 requires A3 (playing on Table 2).
    // m_4 requires A2 (playing on Table 2).
    // So only m_2 can be active without conflict!
    assert.equal(active.length, 1);
    assert.equal(active[0].id, 'm_2');
    assert.equal(active[0].table, 2);
  });

  test('getActiveMatches returns last completed matches when group stage is fully completed', () => {
    const matches = [
      { id: 'm_1', stage: 'group', groupId: 'A', teamA: 'A1', teamB: 'A2', table: 1, winner: 'A1' },
      { id: 'm_2', stage: 'group', groupId: 'A', teamA: 'A3', teamB: 'A4', table: 2, winner: 'A3' },
      { id: 'm_3', stage: 'group', groupId: 'A', teamA: 'A1', teamB: 'A3', table: 1, winner: 'A1' },
    ];

    const active = getActiveMatches(matches, 2);
    assert.equal(active.length, 2);
    assert.equal(active[0].id, 'm_2');
    assert.equal(active[1].id, 'm_3');
  });

  test('getNextMatches delegates to getActiveMatches with group filter', () => {
    const matches = [
      { id: 'm_1', stage: 'group', groupId: 'A', teamA: 'A1', teamB: 'A2', table: 1, winner: null },
      { id: 'm_2', stage: 'group', groupId: 'B', teamA: 'B1', teamB: 'B2', table: 2, winner: null },
      { id: 'm_ko', stage: 'knockout', round: 'semi', teamA: 'A1', teamB: 'B1', table: 1, winner: null },
    ];

    const next = getNextMatches(matches, 2);
    assert.equal(next.length, 2);
    assert.equal(next[0].id, 'm_1');
    assert.equal(next[1].id, 'm_2');
  });
});
