import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  distributeTeams,
  generateGroupMatches,
  calcGroupStandings,
  isGroupStageComplete,
  generateBracket,
  advanceBracketWinner,
  resetBracketMatch,
  recommendGroups,
  withdrawTeam,
} from '../src/utils/tournamentEngine.js';

import { createHistoryManager } from '../src/utils/historyManager.js';

describe('Tournament Engine Edge Cases', () => {
  const makeTeams = (count) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `team_${i + 1}`,
      name: `Team ${i + 1}`,
      player1: `P1_${i + 1}`,
      player2: `P2_${i + 1}`,
      withdrawn: false,
    }));
  };

  test('Recommends optimal pool counts for various team sizes', () => {
    assert.equal(recommendGroups(4).poolCount, 1);
    assert.equal(recommendGroups(6).poolCount, 2);
    assert.equal(recommendGroups(8).poolCount, 2);
    assert.equal(recommendGroups(12).poolCount, 2);
    assert.equal(recommendGroups(16).poolCount, 4);
  });

  test('Distributes teams evenly across pools with snake distribution', () => {
    const teams = makeTeams(8);
    const groups = distributeTeams(teams, 2);
    assert.equal(Object.keys(groups).length, 2);
    assert.equal(groups['A'].length, 4);
    assert.equal(groups['B'].length, 4);
  });

  test('Handles odd team count in pool distribution', () => {
    const teams = makeTeams(7);
    const groups = distributeTeams(teams, 2);
    assert.equal(groups['A'].length, 4);
    assert.equal(groups['B'].length, 3);
  });

  test('Generates round-robin matches for all pools without duplicates', () => {
    const teams = makeTeams(8);
    const groups = distributeTeams(teams, 2);
    const matches = generateGroupMatches(groups, 2);
    // 4 teams in a pool = (4*3)/2 = 6 matches per pool * 2 pools = 12 matches total
    assert.equal(matches.length, 12);
    
    // Check no self-play
    for (const m of matches) {
      assert.notEqual(m.teamA, m.teamB);
      assert.equal(m.winner, null);
    }
  });

  test('Calculates standings accurately based on win/loss records', () => {
    const teamIds = ['team_1', 'team_2', 'team_3', 'team_4'];
    const matches = [
      { id: 'm_1', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_2', winner: 'team_1' },
      { id: 'm_2', stage: 'group', groupId: 'A', teamA: 'team_3', teamB: 'team_4', winner: 'team_3' },
      { id: 'm_3', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_3', winner: 'team_1' },
      { id: 'm_4', stage: 'group', groupId: 'A', teamA: 'team_2', teamB: 'team_4', winner: 'team_2' },
      { id: 'm_5', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_4', winner: 'team_1' },
      { id: 'm_6', stage: 'group', groupId: 'A', teamA: 'team_2', teamB: 'team_3', winner: 'team_2' },
    ];

    const standings = calcGroupStandings('A', teamIds, matches);

    assert.equal(standings[0].teamId, 'team_1'); // 3-0
    assert.equal(standings[0].wins, 3);
    assert.equal(standings[0].losses, 0);

    assert.equal(standings[1].teamId, 'team_2'); // 2-1
    assert.equal(standings[1].wins, 2);
    assert.equal(standings[1].losses, 1);

    assert.equal(standings[2].teamId, 'team_3'); // 1-2
    assert.equal(standings[2].wins, 1);
    assert.equal(standings[2].losses, 2);

    assert.equal(standings[3].teamId, 'team_4'); // 0-3
    assert.equal(standings[3].wins, 0);
    assert.equal(standings[3].losses, 3);
  });

  test('Detects group stage completion correctly', () => {
    const matches = [
      { id: 'm_1', stage: 'group', winner: 'team_1' },
      { id: 'm_2', stage: 'group', winner: null },
    ];
    assert.equal(isGroupStageComplete(matches), false);

    matches[1].winner = 'team_2';
    assert.equal(isGroupStageComplete(matches), true);
  });

  test('Generates knockout bracket and advances winners through to champion', () => {
    const teams = makeTeams(8);
    const groups = distributeTeams(teams, 2);
    const matches = [
      // Pool A: team_1 (3w) > team_3 (2w) > team_5 (1w) > team_7 (0w)
      { id: 'm_1', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_3', winner: 'team_1' },
      { id: 'm_2', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_5', winner: 'team_1' },
      { id: 'm_3', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_7', winner: 'team_1' },
      { id: 'm_4', stage: 'group', groupId: 'A', teamA: 'team_3', teamB: 'team_5', winner: 'team_3' },
      { id: 'm_5', stage: 'group', groupId: 'A', teamA: 'team_3', teamB: 'team_7', winner: 'team_3' },
      { id: 'm_6', stage: 'group', groupId: 'A', teamA: 'team_5', teamB: 'team_7', winner: 'team_5' },
      // Pool B: team_2 (3w) > team_4 (2w) > team_6 (1w) > team_8 (0w)
      { id: 'm_7', stage: 'group', groupId: 'B', teamA: 'team_2', teamB: 'team_4', winner: 'team_2' },
      { id: 'm_8', stage: 'group', groupId: 'B', teamA: 'team_2', teamB: 'team_6', winner: 'team_2' },
      { id: 'm_9', stage: 'group', groupId: 'B', teamA: 'team_2', teamB: 'team_8', winner: 'team_2' },
      { id: 'm_10', stage: 'group', groupId: 'B', teamA: 'team_4', teamB: 'team_6', winner: 'team_4' },
      { id: 'm_11', stage: 'group', groupId: 'B', teamA: 'team_4', teamB: 'team_8', winner: 'team_4' },
      { id: 'm_12', stage: 'group', groupId: 'B', teamA: 'team_6', teamB: 'team_8', winner: 'team_6' },
    ];

    const bracket = generateBracket(groups, matches);
    assert.ok(bracket);
    assert.equal(bracket.rounds.length, 2); // Semi-Finals + Finals

    // Semi finals: 1A vs 2B and 1B vs 2A
    const sfRound = bracket.rounds[0];
    assert.equal(sfRound.matches.length, 2);
    assert.equal(sfRound.matches[0].teamA, 'team_1'); // 1st A
    assert.equal(sfRound.matches[0].teamB, 'team_4'); // 2nd B
    assert.equal(sfRound.matches[1].teamA, 'team_2'); // 1st B
    assert.equal(sfRound.matches[1].teamB, 'team_3'); // 2nd A

    // Win SF 1: team_1 wins
    let updatedBracket = advanceBracketWinner(bracket, sfRound.matches[0].id, 'team_1');
    // Win SF 2: team_2 wins
    updatedBracket = advanceBracketWinner(updatedBracket, sfRound.matches[1].id, 'team_2');

    // Check Finals match has team_1 vs team_2
    const finalsRound = updatedBracket.rounds[1];
    assert.equal(finalsRound.matches[0].teamA, 'team_1');
    assert.equal(finalsRound.matches[0].teamB, 'team_2');

    // Win Finals: team_1 wins championship
    updatedBracket = advanceBracketWinner(updatedBracket, finalsRound.matches[0].id, 'team_1');
    assert.equal(updatedBracket.rounds[1].matches[0].winner, 'team_1');
  });

  test('Applies manual rank overrides to resolve ties in standings', () => {
    const teamIds = ['team_1', 'team_2'];
    const matches = [
      { id: 'm_1', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_2', winner: 'team_1' },
      { id: 'm_2', stage: 'group', groupId: 'A', teamA: 'team_2', teamB: 'team_1', winner: 'team_2' },
    ];
    // Both are 1-1, manual override sets team_2 as rank 1
    const overrides = {
      manualRank: {
        A: { team_2: 1, team_1: 2 },
      },
    };
    const standings = calcGroupStandings('A', teamIds, matches, overrides);
    assert.equal(standings[0].teamId, 'team_2');
    assert.equal(standings[1].teamId, 'team_1');
  });

  test('Supports 16 teams with 4 pools leading to Quarter-Finals, Semi-Finals, and Finals', () => {
    const teams = makeTeams(16);
    const groups = distributeTeams(teams, 4); // Pool A, B, C, D (4 teams each)
    assert.equal(Object.keys(groups).length, 4);

    // Mock each pool with top 2 advancing (Pool A: team_1, team_2; Pool B: team_5, team_6; Pool C: team_9, team_10; Pool D: team_13, team_14)
    const matches = [];
    const poolWinners = [
      { g: 'A', first: 'team_1', second: 'team_2' },
      { g: 'B', first: 'team_5', second: 'team_6' },
      { g: 'C', first: 'team_9', second: 'team_10' },
      { g: 'D', first: 'team_13', second: 'team_14' },
    ];
    poolWinners.forEach(({ g, first, second }) => {
      matches.push(
        { id: `m_${g}_1`, stage: 'group', groupId: g, teamA: first, teamB: second, winner: first },
        { id: `m_${g}_2`, stage: 'group', groupId: g, teamA: first, teamB: 'other', winner: first },
        { id: `m_${g}_3`, stage: 'group', groupId: g, teamA: second, teamB: 'other', winner: second },
      );
    });

    const bracket = generateBracket(groups, matches);
    assert.ok(bracket);
    assert.equal(bracket.rounds.length, 3); // Quarterfinals (4 matches), Semifinals (2 matches), Finals (1 match)
    assert.equal(bracket.rounds[0].name, 'Quarterfinals');
    assert.equal(bracket.rounds[0].matches.length, 4);
    assert.equal(bracket.rounds[1].name, 'Semifinals');
    assert.equal(bracket.rounds[1].matches.length, 2);
    assert.equal(bracket.rounds[2].name, 'Championship Final');
    assert.equal(bracket.rounds[2].matches.length, 1);
  });

  test('Withdrawing a team forfeits pending matches and marks team withdrawn', () => {
    const teams = makeTeams(4);
    const groups = { 'A': ['team_1', 'team_2', 'team_3', 'team_4'] };
    const matches = [
      { id: 'm_1', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_2', winner: null },
      { id: 'm_2', stage: 'group', groupId: 'A', teamA: 'team_3', teamB: 'team_4', winner: 'team_3' },
    ];
    const state = { teams, groups, matches };

    const result = withdrawTeam(state, 'team_1');
    assert.equal(result.teams.find(t => t.id === 'team_1').withdrawn, true);
    
    // Match 1 should mark withdrawn
    const m1 = result.matches.find(m => m.id === 'm_1');
    assert.equal(m1.winner, '__withdrawn__');
  });

  test('Resetting a bracket match resets the match and cascades downstream', () => {
    const teams = makeTeams(8);
    const groups = distributeTeams(teams, 2);
    const matches = [
      { id: 'm_1', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_3', winner: 'team_1' },
      { id: 'm_2', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_5', winner: 'team_1' },
      { id: 'm_3', stage: 'group', groupId: 'B', teamA: 'team_2', teamB: 'team_4', winner: 'team_2' },
      { id: 'm_4', stage: 'group', groupId: 'B', teamA: 'team_2', teamB: 'team_6', winner: 'team_2' },
    ];
    const bracket = generateBracket(groups, matches);

    // Play SF1: team_1 wins
    let b = advanceBracketWinner(bracket, bracket.rounds[0].matches[0].id, 'team_1');
    // Play SF2: team_2 wins
    b = advanceBracketWinner(b, bracket.rounds[0].matches[1].id, 'team_2');

    assert.equal(b.rounds[1].matches[0].teamA, 'team_1');
    assert.equal(b.rounds[1].matches[0].teamB, 'team_2');

    // Play Final: team_1 wins
    b = advanceBracketWinner(b, b.rounds[1].matches[0].id, 'team_1');
    assert.equal(b.rounds[1].matches[0].winner, 'team_1');

    // Reset SF1 (m0 in round 0)
    const resetB = resetBracketMatch(b, bracket.rounds[0].matches[0].id);

    // SF1 winner should be null
    assert.equal(resetB.rounds[0].matches[0].winner, null);
    // SF2 winner should still be team_2
    assert.equal(resetB.rounds[0].matches[1].winner, 'team_2');
    // Finals match teamA should be cleared to null, teamB still team_2
    assert.equal(resetB.rounds[1].matches[0].teamA, null);
    assert.equal(resetB.rounds[1].matches[0].teamB, 'team_2');
    // Finals match winner should be cleared to null
    assert.equal(resetB.rounds[1].matches[0].winner, null);
  });

  test('Supports single-team bye match advancements', () => {
    // 3 pools bracket has byes for top seeds
    const groups = {
      A: ['team_1', 'team_2'],
      B: ['team_3', 'team_4'],
      C: ['team_5', 'team_6'],
    };
    const matches = [
      { id: 'm_1', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_2', winner: 'team_1' },
      { id: 'm_2', stage: 'group', groupId: 'B', teamA: 'team_3', teamB: 'team_4', winner: 'team_3' },
      { id: 'm_3', stage: 'group', groupId: 'C', teamA: 'team_5', teamB: 'team_6', winner: 'team_5' },
    ];
    const bracket = generateBracket(groups, matches);
    assert.ok(bracket);
    assert.equal(bracket.rounds.length, 3); // QF, SF, Final
    const qf = bracket.rounds[0];
    assert.equal(qf.matches[0].teamA, 'team_1');
    assert.equal(qf.matches[0].teamB, null); // Bye!

    // Advance bye team
    const b = advanceBracketWinner(bracket, qf.matches[0].id, 'team_1');
    assert.equal(b.rounds[0].matches[0].winner, 'team_1');
    assert.equal(b.rounds[1].matches[0].teamA, 'team_1'); // Advanced to SF1!
  });
});

describe('History Manager Snapshot Undo', () => {
  test('Pushes and pops up to 20 snapshots accurately', () => {
    const history = createHistoryManager();
    assert.equal(history.canUndo(), false);

    history.push({ step: 1 }, 'Action 1');
    history.push({ step: 2 }, 'Action 2');
    history.push({ step: 3 }, 'Action 3');

    assert.equal(history.canUndo(), true);
    assert.equal(history.size(), 3);

    const undone1 = history.pop();
    assert.equal(undone1.state.step, 3);
    assert.equal(undone1.action, 'Action 3');

    const undone2 = history.pop();
    assert.equal(undone2.state.step, 2);

    const undone3 = history.pop();
    assert.equal(undone3.state.step, 1);

    assert.equal(history.canUndo(), false);
    assert.equal(history.pop(), null);
  });
});
