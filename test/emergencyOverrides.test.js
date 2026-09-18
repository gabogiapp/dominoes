import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  generateBracket,
  advanceBracketWinner,
  updateBracketMatchParticipants,
  swapBracketMatchTeams,
  swapBracketSlots,
  swapTeamsBetweenGroups,
  reassignTeamToGroup,
  updateGroupMatch,
  swapGroupMatchTeams,
  getAdvancingTeams,
} from '../src/utils/tournamentEngine.js';

describe('Emergency Tournament Overrides', () => {
  const groups = {
    A: ['team_1', 'team_2'],
    B: ['team_3', 'team_4'],
  };

  test('updateBracketMatchParticipants changes teamA, teamB, and table in a bracket match', () => {
    const bracket = generateBracket(groups, []);
    const semi1 = bracket.rounds[0].matches[0];

    // Initial: team_1 vs team_4 (A1 vs B2)
    assert.equal(semi1.teamA, 'team_1');
    assert.equal(semi1.teamB, 'team_4');

    // Emergency change: team_1 now verses team_2, moved to Table 3
    const updated = updateBracketMatchParticipants(bracket, semi1.id, {
      teamA: 'team_1',
      teamB: 'team_2',
      table: 3,
    });

    const updatedMatch = updated.rounds[0].matches[0];
    assert.equal(updatedMatch.teamA, 'team_1');
    assert.equal(updatedMatch.teamB, 'team_2');
    assert.equal(updatedMatch.table, 3);
  });

  test('updateBracketMatchParticipants clears winner and downstream slots if winner is replaced', () => {
    let bracket = generateBracket(groups, []);
    const semi1Id = bracket.rounds[0].matches[0].id;

    // Team 1 wins semi 1 and advances to final
    bracket = advanceBracketWinner(bracket, semi1Id, 'team_1');
    assert.equal(bracket.rounds[0].matches[0].winner, 'team_1');
    assert.equal(bracket.rounds[1].matches[0].teamA, 'team_1');

    // Emergency change: replace team_1 with team_5 in semi 1
    const updated = updateBracketMatchParticipants(bracket, semi1Id, {
      teamA: 'team_5',
    });

    const updatedSemi = updated.rounds[0].matches[0];
    assert.equal(updatedSemi.teamA, 'team_5');
    // Previous winner (team_1) is no longer valid, so winner should be cleared!
    assert.equal(updatedSemi.winner, null);
    // Downstream final should have cleared teamA!
    assert.equal(updated.rounds[1].matches[0].teamA, null);
  });

  test('swapBracketMatchTeams swaps teamA and teamB', () => {
    const bracket = generateBracket(groups, []);
    const matchId = bracket.rounds[0].matches[0].id;

    assert.equal(bracket.rounds[0].matches[0].teamA, 'team_1');
    assert.equal(bracket.rounds[0].matches[0].teamB, 'team_4');

    const swapped = swapBracketMatchTeams(bracket, matchId);
    assert.equal(swapped.rounds[0].matches[0].teamA, 'team_4');
    assert.equal(swapped.rounds[0].matches[0].teamB, 'team_1');
  });

  test('swapBracketSlots swaps opponents between different bracket matches', () => {
    const bracket = generateBracket(groups, []);
    const semi1Id = bracket.rounds[0].matches[0].id; // team_1 vs team_4
    const semi2Id = bracket.rounds[0].matches[1].id; // team_3 vs team_2

    // Swap teamB of semi1 (team_4) with teamB of semi2 (team_2)
    const swapped = swapBracketSlots(bracket, semi1Id, 'teamB', semi2Id, 'teamB');

    // semi1 is now team_1 vs team_2
    assert.equal(swapped.rounds[0].matches[0].teamA, 'team_1');
    assert.equal(swapped.rounds[0].matches[0].teamB, 'team_2');

    // semi2 is now team_3 vs team_4
    assert.equal(swapped.rounds[0].matches[1].teamA, 'team_3');
    assert.equal(swapped.rounds[0].matches[1].teamB, 'team_4');
  });

  test('swapTeamsBetweenGroups transfers unplayed matches cleanly between pools', () => {
    const state = {
      groups: {
        A: ['team_1', 'team_2', 'team_3'],
        B: ['team_4', 'team_5', 'team_6'],
      },
      matches: [
        // Played match in Pool A: team_1 beat team_2
        { id: 'm_1', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_2', winner: 'team_1' },
        // Unplayed match in Pool A involving team_3
        { id: 'm_2', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_3', winner: null },
        // Unplayed match in Pool B involving team_4
        { id: 'm_3', stage: 'group', groupId: 'B', teamA: 'team_4', teamB: 'team_5', winner: null },
      ],
      tablesCount: 2,
    };

    // Emergency swap: team_3 (Pool A) with team_4 (Pool B)
    const updated = swapTeamsBetweenGroups(state, 'team_3', 'team_4');

    // Verify groups swapped
    assert.deepEqual(updated.groups.A, ['team_1', 'team_2', 'team_4']);
    assert.deepEqual(updated.groups.B, ['team_3', 'team_5', 'team_6']);

    // Played match untouched
    assert.equal(updated.matches[0].teamA, 'team_1');
    assert.equal(updated.matches[0].teamB, 'team_2');
    assert.equal(updated.matches[0].winner, 'team_1');

    // Unplayed matches updated: m_2 now has team_4 instead of team_3
    assert.equal(updated.matches[1].teamA, 'team_1');
    assert.equal(updated.matches[1].teamB, 'team_4');

    // m_3 now has team_3 instead of team_4
    assert.equal(updated.matches[2].teamA, 'team_3');
    assert.equal(updated.matches[2].teamB, 'team_5');
  });

  test('reassignTeamToGroup moves team and creates pairings in new group', () => {
    const state = {
      groups: {
        A: ['team_1', 'team_2'],
        B: ['team_3'],
      },
      matches: [
        { id: 'm_1', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_2', winner: null },
      ],
      tablesCount: 2,
    };

    // Move team_2 from Pool A to Pool B
    const updated = reassignTeamToGroup(state, 'team_2', 'B');

    assert.deepEqual(updated.groups.A, ['team_1']);
    assert.deepEqual(updated.groups.B, ['team_3', 'team_2']);

    // Old unplayed match in Pool A removed
    const poolAMatches = updated.matches.filter(m => m.groupId === 'A');
    assert.equal(poolAMatches.length, 0);

    // New match in Pool B created between team_2 and team_3
    const poolBMatches = updated.matches.filter(m => m.groupId === 'B');
    assert.equal(poolBMatches.length, 1);
    assert.equal(poolBMatches[0].teamA, 'team_2');
    assert.equal(poolBMatches[0].teamB, 'team_3');
  });

  test('Manual advancement overrides directly dictate bracket seeds', () => {
    const stateGroups = {
      A: ['team_1', 'team_2', 'team_3', 'team_4'],
      B: ['team_5', 'team_6', 'team_7', 'team_8'],
    };

    // Normally team_1 and team_2 would advance from Pool A based on standings.
    // But organizer manually advances team_3 and team_4 from Pool A!
    const overrides = {
      manualAdvancement: {
        A: ['team_4', 'team_3'], // team_4 as 1st seed, team_3 as 2nd seed
      },
    };

    const advancing = getAdvancingTeams(stateGroups, [], overrides);
    assert.deepEqual(advancing['A'], ['team_4', 'team_3']);

    // When bracket is generated, team_4 and team_3 are seeded as A1 and A2
    const bracket = generateBracket(stateGroups, [], overrides);
    // A1 vs B2 -> team_4 vs B2
    assert.equal(bracket.rounds[0].matches[0].teamA, 'team_4');
    // B1 vs A2 -> B1 vs team_3
    assert.equal(bracket.rounds[0].matches[1].teamB, 'team_3');
  });

  test('updateGroupMatch and swapGroupMatchTeams edit group matches', () => {
    let matches = [
      { id: 'm_1', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_2', table: 1, winner: null },
    ];

    // Change table and teamB
    matches = updateGroupMatch(matches, 'm_1', { table: 2, teamB: 'team_3' });
    assert.equal(matches[0].table, 2);
    assert.equal(matches[0].teamB, 'team_3');

    // Swap positions
    matches = swapGroupMatchTeams(matches, 'm_1');
    assert.equal(matches[0].teamA, 'team_3');
    assert.equal(matches[0].teamB, 'team_1');
  });
});
