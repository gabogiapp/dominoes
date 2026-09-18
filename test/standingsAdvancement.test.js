import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  calcGroupStandings,
  detectTies,
  getTeamStatus,
  calcGroupStatusMap,
  getAdvancingTeams,
  generateBracket,
} from '../src/utils/tournamentEngine.js';

describe('Standings Sorting and Advancement Logic', () => {
  // 4-team pool standard setup:
  // team_1: Los Tigres
  // team_3: Mambo Kings
  // team_5: La Familia
  // team_7: Los Campeones
  const poolA_Teams = ['team_1', 'team_3', 'team_5', 'team_7'];
  const groups = { A: poolA_Teams };

  test('User Scenario: 1-0 beats 1-1 and 1-2, 1-2 is rank #4 and NOT ADVANCING', () => {
    // Exact user matches played (4 out of 6):
    // 1. Tigres vs Mambo -> Tigres won (Tigres: 1-0, Mambo: 0-1)
    // 2. Tigres vs Familia -> Familia won (Tigres: 1-1, Familia: 1-0)
    // 3. Tigres vs Campeones -> Campeones won (Tigres: 1-2, Campeones: 1-0)
    // 4. Mambo vs Familia -> Mambo won (Mambo: 1-1, Familia: 1-1)
    // Unplayed (2 matches):
    // 5. Mambo vs Campeones
    // 6. Familia vs Campeones
    const matches = [
      { id: 'm_1', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_3', winner: 'team_1' },
      { id: 'm_2', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_5', winner: 'team_5' },
      { id: 'm_3', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_7', winner: 'team_7' },
      { id: 'm_4', stage: 'group', groupId: 'A', teamA: 'team_3', teamB: 'team_5', winner: 'team_3' },
      { id: 'm_5', stage: 'group', groupId: 'A', teamA: 'team_3', teamB: 'team_7', winner: null },
      { id: 'm_6', stage: 'group', groupId: 'A', teamA: 'team_5', teamB: 'team_7', winner: null },
    ];

    const standings = calcGroupStandings('A', poolA_Teams, matches);

    // Verify correct ranking:
    // #1 Los Campeones: 1 win, 0 losses (100% win rate)
    assert.equal(standings[0].teamId, 'team_7', 'Los Campeones (1-0) must be rank 1');
    assert.equal(standings[0].wins, 1);
    assert.equal(standings[0].losses, 0);

    // #2 Mambo Kings: 1 win, 1 loss (beat La Familia head-to-head)
    assert.equal(standings[1].teamId, 'team_3', 'Mambo Kings (1-1) must be rank 2 (beat La Familia)');
    assert.equal(standings[1].wins, 1);
    assert.equal(standings[1].losses, 1);

    // #3 La Familia: 1 win, 1 loss (lost to Mambo Kings head-to-head)
    assert.equal(standings[2].teamId, 'team_5', 'La Familia (1-1) must be rank 3');
    assert.equal(standings[2].wins, 1);
    assert.equal(standings[2].losses, 1);

    // #4 Los Tigres: 1 win, 2 losses (33% win rate, most losses)
    assert.equal(standings[3].teamId, 'team_1', 'Los Tigres (1-2) must be rank 4');
    assert.equal(standings[3].wins, 1);
    assert.equal(standings[3].losses, 2);

    // Verify team statuses during in-progress pool:
    const statusMap = calcGroupStatusMap('A', standings, groups, matches);

    // Los Tigres (1-2) must NOT be ADVANCING!
    assert.notEqual(statusMap['team_1'], 'ADVANCING', 'Los Tigres (1-2) must NOT be ADVANCING');
    assert.notEqual(getTeamStatus('team_1', 'A', standings, groups, matches), 'ADVANCING');

    // Qualifying spots (top 2) must be IN CONTENTION while matches remain
    assert.equal(statusMap['team_7'], 'IN CONTENTION', 'Los Campeones (1-0) in 1st place is IN CONTENTION');
    assert.equal(statusMap['team_3'], 'IN CONTENTION', 'Mambo Kings (1-1) in 2nd place is IN CONTENTION');
    assert.equal(getTeamStatus('team_7', 'A', standings, groups, matches), 'IN CONTENTION');
    assert.equal(getTeamStatus('team_3', 'A', standings, groups, matches), 'IN CONTENTION');

    // Ties:
    // Los Campeones (1-0) and Los Tigres (1-2) are NOT tied despite both having 1 win!
    const ties = detectTies(standings);
    assert.deepEqual(ties, [], 'No unresolved ties; 1-0 beats 1-1, and 1-1 tie was resolved by H2H');
  });

  test('Complete group stage: Top 2 ADVANCING, Bottom 2 ELIMINATED', () => {
    // All 6 matches finished:
    // Campeones sweeps 3-0
    // Mambo Kings goes 2-1
    // La Familia goes 1-2
    // Los Tigres goes 0-3
    const matches = [
      { id: 'm_1', stage: 'group', groupId: 'A', teamA: 'team_7', teamB: 'team_3', winner: 'team_7' },
      { id: 'm_2', stage: 'group', groupId: 'A', teamA: 'team_7', teamB: 'team_5', winner: 'team_7' },
      { id: 'm_3', stage: 'group', groupId: 'A', teamA: 'team_7', teamB: 'team_1', winner: 'team_7' },
      { id: 'm_4', stage: 'group', groupId: 'A', teamA: 'team_3', teamB: 'team_5', winner: 'team_3' },
      { id: 'm_5', stage: 'group', groupId: 'A', teamA: 'team_3', teamB: 'team_1', winner: 'team_3' },
      { id: 'm_6', stage: 'group', groupId: 'A', teamA: 'team_5', teamB: 'team_1', winner: 'team_5' },
    ];

    const standings = calcGroupStandings('A', poolA_Teams, matches);
    const statusMap = calcGroupStatusMap('A', standings, groups, matches);

    assert.equal(standings[0].teamId, 'team_7');
    assert.equal(statusMap['team_7'], 'ADVANCING');

    assert.equal(standings[1].teamId, 'team_3');
    assert.equal(statusMap['team_3'], 'ADVANCING');

    assert.equal(standings[2].teamId, 'team_5');
    assert.equal(statusMap['team_5'], 'ELIMINATED');

    assert.equal(standings[3].teamId, 'team_1');
    assert.equal(statusMap['team_1'], 'ELIMINATED');

    // Advancing teams for bracket:
    const advancing = getAdvancingTeams(groups, matches);
    assert.deepEqual(advancing['A'], ['team_7', 'team_3']);
  });

  test('Early clinch: 3-0 team clinches ADVANCING while other matches remain unplayed', () => {
    // Team 7 has won 3-0, but match 6 between team 3 and team 5 is still unplayed
    const matches = [
      { id: 'm_1', stage: 'group', groupId: 'A', teamA: 'team_7', teamB: 'team_1', winner: 'team_7' },
      { id: 'm_2', stage: 'group', groupId: 'A', teamA: 'team_7', teamB: 'team_3', winner: 'team_7' },
      { id: 'm_3', stage: 'group', groupId: 'A', teamA: 'team_7', teamB: 'team_5', winner: 'team_7' },
      { id: 'm_4', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_3', winner: 'team_3' },
      { id: 'm_5', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_5', winner: 'team_5' },
      { id: 'm_6', stage: 'group', groupId: 'A', teamA: 'team_3', teamB: 'team_5', winner: null },
    ];

    const standings = calcGroupStandings('A', poolA_Teams, matches);
    const statusMap = calcGroupStatusMap('A', standings, groups, matches);

    assert.equal(statusMap['team_7'], 'ADVANCING', '3-0 team has mathematically clinched ADVANCING');
    assert.equal(statusMap['team_1'], 'ELIMINATED', '0-3 team is mathematically ELIMINATED');
  });

  test('Early elimination: team with 0 wins and 2 losses in 3-game pool cannot catch 2-0 teams', () => {
    // Team 1 is 2-0, Team 3 is 2-0.
    // Team 7 is 0-2 (has only 1 game remaining, max 1 win).
    // Team 7 can never reach 2 wins to catch Team 1 or Team 3.
    const matches = [
      { id: 'm_1', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_5', winner: 'team_1' },
      { id: 'm_2', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_7', winner: 'team_1' },
      { id: 'm_3', stage: 'group', groupId: 'A', teamA: 'team_3', teamB: 'team_5', winner: 'team_3' },
      { id: 'm_4', stage: 'group', groupId: 'A', teamA: 'team_3', teamB: 'team_7', winner: 'team_3' },
      { id: 'm_5', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_3', winner: null },
      { id: 'm_6', stage: 'group', groupId: 'A', teamA: 'team_5', teamB: 'team_7', winner: null },
    ];

    const standings = calcGroupStandings('A', poolA_Teams, matches);
    const statusMap = calcGroupStatusMap('A', standings, groups, matches);

    assert.equal(statusMap['team_1'], 'ADVANCING', 'Team 1 (2-0) has clinched top 2');
    assert.equal(statusMap['team_3'], 'ADVANCING', 'Team 3 (2-0) has clinched top 2');
    assert.equal(statusMap['team_7'], 'ELIMINATED', 'Team 7 (0-2) is mathematically eliminated');
    assert.equal(statusMap['team_5'], 'ELIMINATED', 'Team 5 (0-2) is mathematically eliminated');
  });

  test('Three-way circular tie detection and manual rank resolution', () => {
    // Team 1 beat Team 3, Team 3 beat Team 5, Team 5 beat Team 1 (circular 1-1 each).
    // All three beat Team 7 (0-3).
    // Teams 1, 3, 5 are all 2-1 with 1 H2H win each against each other.
    const matches = [
      { id: 'm_1', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_3', winner: 'team_1' },
      { id: 'm_2', stage: 'group', groupId: 'A', teamA: 'team_3', teamB: 'team_5', winner: 'team_3' },
      { id: 'm_3', stage: 'group', groupId: 'A', teamA: 'team_5', teamB: 'team_1', winner: 'team_5' },
      { id: 'm_4', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_7', winner: 'team_1' },
      { id: 'm_5', stage: 'group', groupId: 'A', teamA: 'team_3', teamB: 'team_7', winner: 'team_3' },
      { id: 'm_6', stage: 'group', groupId: 'A', teamA: 'team_5', teamB: 'team_7', winner: 'team_5' },
    ];

    const standings = calcGroupStandings('A', poolA_Teams, matches);
    const ties = detectTies(standings);

    // detectTies should detect that adjacent 2-1 teams have equal H2H wins and require organizer tiebreak
    assert.ok(ties.length > 0, 'Circular 3-way tie must be detected as requiring manual resolution');

    // Organizer resolves the tie via manualRank
    const overrides = {
      manualRank: {
        A: { team_5: 1, team_3: 2, team_1: 3, team_7: 4 },
      },
    };

    const resolvedStandings = calcGroupStandings('A', poolA_Teams, matches, overrides);
    assert.equal(resolvedStandings[0].teamId, 'team_5');
    assert.equal(resolvedStandings[1].teamId, 'team_3');
    assert.equal(resolvedStandings[2].teamId, 'team_1');
    assert.equal(resolvedStandings[3].teamId, 'team_7');

    const advancing = getAdvancingTeams(groups, matches, overrides);
    assert.deepEqual(advancing['A'], ['team_5', 'team_3']);
  });

  test('Initial state: 0 matches played returns empty status for all teams', () => {
    const matches = [
      { id: 'm_1', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_3', winner: null },
      { id: 'm_2', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_5', winner: null },
      { id: 'm_3', stage: 'group', groupId: 'A', teamA: 'team_1', teamB: 'team_7', winner: null },
    ];

    const standings = calcGroupStandings('A', poolA_Teams, matches);
    const statusMap = calcGroupStatusMap('A', standings, groups, matches);

    for (const tid of poolA_Teams) {
      assert.equal(statusMap[tid], '', `Initial unplayed pool team ${tid} should have blank status`);
    }
  });
});
