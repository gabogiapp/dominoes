import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  calcOpenStandings,
  generateOpenBracket,
  nextMatchId,
} from '../src/utils/tournamentEngine.js';

describe('Manual Table Queue & Open Standings with Point Differential', () => {
  const teams = ['t1', 't2', 't3', 't4', 't5', 't6'];

  test('Tracks wins, losses, points for, points against, and point differential', () => {
    const matches = [
      // Match 1: t1 (100) vs t2 (80) -> t1 wins by +20, t2 diff -20
      { id: 'm_1', stage: 'open', table: 1, teamA: 't1', teamB: 't2', scoreA: 100, scoreB: 80, winner: 't1' },
      // Match 2: t3 (105) vs t4 (90) -> t3 wins by +15, t4 diff -15
      { id: 'm_2', stage: 'open', table: 2, teamA: 't3', teamB: 't4', scoreA: 105, scoreB: 90, winner: 't3' },
      // Match 3: t1 (100) vs t3 (60) -> t1 wins by +40, t3 diff -40
      { id: 'm_3', stage: 'open', table: 1, teamA: 't1', teamB: 't3', scoreA: 100, scoreB: 60, winner: 't1' },
    ];

    const standings = calcOpenStandings(teams, matches);

    // t1 is 2-0: played 2, wins 2, losses 0, PF: 200, PA: 140, Diff: +60
    const s1 = standings.find(s => s.teamId === 't1');
    assert.equal(s1.wins, 2);
    assert.equal(s1.losses, 0);
    assert.equal(s1.played, 2);
    assert.equal(s1.pointsFor, 200);
    assert.equal(s1.pointsAgainst, 140);
    assert.equal(s1.diff, 60);

    // t3 is 1-1: played 2, wins 1, losses 1, PF: 165, PA: 190, Diff: -25
    const s3 = standings.find(s => s.teamId === 't3');
    assert.equal(s3.wins, 1);
    assert.equal(s3.losses, 1);
    assert.equal(s3.played, 2);
    assert.equal(s3.pointsFor, 165);
    assert.equal(s3.pointsAgainst, 190);
    assert.equal(s3.diff, -25);

    // t1 should be Rank #1
    assert.equal(standings[0].teamId, 't1');
  });

  test('Point differential breaks ties between teams with identical W-L records', () => {
    // Both t2 and t3 have 1 win and 1 loss
    // t2: won 100-50 (+50), lost 80-100 (-20) -> Net Diff = +30
    // t3: won 100-95 (+5), lost 70-100 (-30) -> Net Diff = -25
    const matches = [
      { id: 'm_1', stage: 'open', table: 1, teamA: 't1', teamB: 't2', scoreA: 100, scoreB: 80, winner: 't1' },
      { id: 'm_2', stage: 'open', table: 2, teamA: 't2', teamB: 't4', scoreA: 100, scoreB: 50, winner: 't2' },
      { id: 'm_3', stage: 'open', table: 1, teamA: 't3', teamB: 't5', scoreA: 100, scoreB: 95, winner: 't3' },
      { id: 'm_4', stage: 'open', table: 2, teamA: 't1', teamB: 't3', scoreA: 100, scoreB: 70, winner: 't1' },
    ];

    const standings = calcOpenStandings(['t1', 't2', 't3', 't4', 't5'], matches);

    // #1 t1 (2-0)
    assert.equal(standings[0].teamId, 't1');
    // #2 t2 (1-1, Diff +30) beats t3 (1-1, Diff -25)
    assert.equal(standings[1].teamId, 't2', 't2 must rank higher than t3 because +30 diff > -25 diff');
    assert.equal(standings[1].diff, 30);
    assert.equal(standings[2].teamId, 't3');
    assert.equal(standings[2].diff, -25);
  });

  test('Generates knockout bracket for top 4 seeds from open standings', () => {
    const mockStandings = [
      { teamId: 'seed1', wins: 3, diff: 50 },
      { teamId: 'seed2', wins: 2, diff: 30 },
      { teamId: 'seed3', wins: 2, diff: 10 },
      { teamId: 'seed4', wins: 1, diff: 5 },
      { teamId: 'seed5', wins: 1, diff: -10 },
    ];

    const bracket = generateOpenBracket(mockStandings, 4, 2);
    assert.equal(bracket.rounds.length, 2, 'Should have Semifinals and Final');
    const semis = bracket.rounds[0].matches;
    assert.equal(semis.length, 2);

    // Seed 1 vs Seed 4
    assert.equal(semis[0].teamA, 'seed1');
    assert.equal(semis[0].teamB, 'seed4');

    // Seed 2 vs Seed 3
    assert.equal(semis[1].teamA, 'seed2');
    assert.equal(semis[1].teamB, 'seed3');
  });
});
