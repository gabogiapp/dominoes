import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  calcGroupStandings,
  generateBracket,
} from '../src/utils/tournamentEngine.js';

describe('Group Standings Point Differential (+/-)', () => {
  const poolA_Teams = ['team_1', 'team_2', 'team_3', 'team_4'];

  test('200 to 100 gives +100 to winner and -100 to loser', () => {
    const matches = [
      {
        id: 'm1',
        stage: 'group',
        groupId: 'A',
        teamA: 'team_1',
        teamB: 'team_2',
        scoreA: 200,
        scoreB: 100,
        winner: 'team_1',
      },
    ];

    const standings = calcGroupStandings('A', poolA_Teams, matches);

    const t1 = standings.find(s => s.teamId === 'team_1');
    const t2 = standings.find(s => s.teamId === 'team_2');

    assert.equal(t1.wins, 1);
    assert.equal(t1.losses, 0);
    assert.equal(t1.pointsFor, 200);
    assert.equal(t1.pointsAgainst, 100);
    assert.equal(t1.diff, 100, 'Winner of 200-100 must have +100 point differential');

    assert.equal(t2.wins, 0);
    assert.equal(t2.losses, 1);
    assert.equal(t2.pointsFor, 100);
    assert.equal(t2.pointsAgainst, 200);
    assert.equal(t2.diff, -100, 'Loser of 200-100 must have -100 point differential');
  });

  test('Teams with bigger win differentials rank higher in standings', () => {
    // Match 1: team_1 beats team_2 (200 - 100) -> team_1 has +100 diff
    // Match 2: team_3 beats team_4 (200 - 180) -> team_3 has +20 diff
    const matches = [
      {
        id: 'm1',
        stage: 'group',
        groupId: 'A',
        teamA: 'team_1',
        teamB: 'team_2',
        scoreA: 200,
        scoreB: 100,
        winner: 'team_1',
      },
      {
        id: 'm2',
        stage: 'group',
        groupId: 'A',
        teamA: 'team_3',
        teamB: 'team_4',
        scoreA: 200,
        scoreB: 180,
        winner: 'team_3',
      },
    ];

    const standings = calcGroupStandings('A', poolA_Teams, matches);

    // Both team_1 and team_3 are 1-0.
    // team_1 (+100) must rank #1, team_3 (+20) must rank #2
    assert.equal(standings[0].teamId, 'team_1', 'team_1 with +100 diff must be #1');
    assert.equal(standings[0].diff, 100);

    assert.equal(standings[1].teamId, 'team_3', 'team_3 with +20 diff must be #2');
    assert.equal(standings[1].diff, 20);

    // Both team_4 and team_2 are 0-1.
    // team_4 (-20) lost by less than team_2 (-100), so team_4 must rank #3, team_2 #4
    assert.equal(standings[2].teamId, 'team_4', 'team_4 with -20 diff must be #3');
    assert.equal(standings[2].diff, -20);

    assert.equal(standings[3].teamId, 'team_2', 'team_2 with -100 diff must be #4');
    assert.equal(standings[3].diff, -100);
  });

  test('Cross-pool matches update standings in both pools accurately', () => {
    const poolA = ['team_a1', 'team_a2'];
    const poolB = ['team_b1', 'team_b2'];

    // Cross-pool match: team_a1 (Pool A) plays team_b1 (Pool B)
    // team_a1 wins 200 to 100 (+100 for a1, -100 for b1)
    const matches = [
      {
        id: 'cross_1',
        stage: 'group',
        groupId: 'A',
        teamA: 'team_a1',
        teamB: 'team_b1',
        scoreA: 200,
        scoreB: 100,
        winner: 'team_a1',
      },
    ];

    const standingsA = calcGroupStandings('A', poolA, matches);
    const standingsB = calcGroupStandings('B', poolB, matches);

    const a1 = standingsA.find(s => s.teamId === 'team_a1');
    assert.equal(a1.wins, 1);
    assert.equal(a1.losses, 0);
    assert.equal(a1.diff, 100);

    const b1 = standingsB.find(s => s.teamId === 'team_b1');
    assert.equal(b1.wins, 0);
    assert.equal(b1.losses, 1);
    assert.equal(b1.diff, -100);
  });
});
