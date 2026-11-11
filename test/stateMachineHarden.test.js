import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  advanceBracketWinner,
  resetBracketMatch,
  updateBracketMatchParticipants,
  swapBracketMatchTeams,
  swapBracketSlots,
  withdrawTeam,
  sanitizeTournamentState,
  generateOpenBracket,
} from '../src/utils/tournamentEngine.js';

describe('High-Risk State Machine Invariant & Cascade Hardening', () => {
  test('1. Downstream bracket cascade clears scores and participants recursively', () => {
    const standings = [
      { teamId: 't1', wins: 3 },
      { teamId: 't2', wins: 2 },
      { teamId: 't3', wins: 2 },
      { teamId: 't4', wins: 1 },
    ];
    let bracket = generateOpenBracket(standings, 4, 2);

    const semi1Id = bracket.rounds[0].matches[0].id;
    const semi2Id = bracket.rounds[0].matches[1].id;

    // Play SF1: t1 beats t4 (200 - 150)
    bracket.rounds[0].matches[0].scoreA = 200;
    bracket.rounds[0].matches[0].scoreB = 150;
    bracket = advanceBracketWinner(bracket, semi1Id, 't1');

    // Play SF2: t2 beats t3 (200 - 180)
    bracket.rounds[0].matches[1].scoreA = 200;
    bracket.rounds[0].matches[1].scoreB = 180;
    bracket = advanceBracketWinner(bracket, semi2Id, 't2');

    // Final is now t1 vs t2
    const finalId = bracket.rounds[1].matches[0].id;
    assert.equal(bracket.rounds[1].matches[0].teamA, 't1');
    assert.equal(bracket.rounds[1].matches[0].teamB, 't2');

    // Play Final: t1 beats t2 (200 - 190)
    bracket.rounds[1].matches[0].scoreA = 200;
    bracket.rounds[1].matches[0].scoreB = 190;
    bracket = advanceBracketWinner(bracket, finalId, 't1');
    assert.equal(bracket.rounds[1].matches[0].winner, 't1');

    // Now reset SF1: t1 is no longer the SF1 winner
    bracket = resetBracketMatch(bracket, semi1Id);

    // Verify SF1 itself: winner and scores must be cleared
    assert.equal(bracket.rounds[0].matches[0].winner, null);
    assert.equal(bracket.rounds[0].matches[0].scoreA, null);
    assert.equal(bracket.rounds[0].matches[0].scoreB, null);

    // Verify Final match: t1 must be cleared, winner cleared, AND scores cleared!
    assert.equal(bracket.rounds[1].matches[0].teamA, null);
    assert.equal(bracket.rounds[1].matches[0].winner, null);
    assert.equal(bracket.rounds[1].matches[0].scoreA, null, 'Final match scoreA must be cleared');
    assert.equal(bracket.rounds[1].matches[0].scoreB, null, 'Final match scoreB must be cleared');
    // Team B (t2) from SF2 remains intact
    assert.equal(bracket.rounds[1].matches[0].teamB, 't2');
  });

  test('2. Changing feeder winner in advanceBracketWinner clears downstream scores', () => {
    const standings = [
      { teamId: 't1', wins: 3 },
      { teamId: 't2', wins: 2 },
      { teamId: 't3', wins: 2 },
      { teamId: 't4', wins: 1 },
    ];
    let bracket = generateOpenBracket(standings, 4, 2);

    const semi1Id = bracket.rounds[0].matches[0].id;
    const semi2Id = bracket.rounds[0].matches[1].id;

    // t1 wins SF1
    bracket = advanceBracketWinner(bracket, semi1Id, 't1');
    // t2 wins SF2
    bracket = advanceBracketWinner(bracket, semi2Id, 't2');

    // Final played: t1 wins 200-140
    const finalId = bracket.rounds[1].matches[0].id;
    bracket.rounds[1].matches[0].scoreA = 200;
    bracket.rounds[1].matches[0].scoreB = 140;
    bracket = advanceBracketWinner(bracket, finalId, 't1');

    // SF1 result is overturned: t4 is declared winner instead of t1
    bracket = advanceBracketWinner(bracket, semi1Id, 't4');

    // Final match teamA is now t4, and previous scores and winner are wiped
    assert.equal(bracket.rounds[1].matches[0].teamA, 't4');
    assert.equal(bracket.rounds[1].matches[0].winner, null);
    assert.equal(bracket.rounds[1].matches[0].scoreA, null);
    assert.equal(bracket.rounds[1].matches[0].scoreB, null);
  });

  test('3. swapBracketMatchTeams swaps both teams and their respective scores', () => {
    const bracket = {
      rounds: [
        {
          matches: [
            { id: 'm1', teamA: 't1', teamB: 't2', scoreA: 200, scoreB: 150, winner: 't1' },
          ],
        },
      ],
    };

    const swapped = swapBracketMatchTeams(bracket, 'm1');
    const m = swapped.rounds[0].matches[0];
    assert.equal(m.teamA, 't2');
    assert.equal(m.teamB, 't1');
    assert.equal(m.scoreA, 150, "t2's score should now be scoreA");
    assert.equal(m.scoreB, 200, "t1's score should now be scoreB");
  });

  test('4. updateBracketMatchParticipants invalidates obsolete scores and cascades', () => {
    const bracket = {
      rounds: [
        {
          matches: [
            { id: 'm1', teamA: 't1', teamB: 't2', scoreA: 200, scoreB: 150, winner: 't1' },
          ],
        },
        {
          matches: [
            { id: 'm2', teamA: 't1', teamB: 't3', scoreA: 200, scoreB: 180, winner: 't1' },
          ],
        },
      ],
    };

    // Replace t1 with t4 in m1
    const updated = updateBracketMatchParticipants(bracket, 'm1', { teamA: 't4' });
    const m1 = updated.rounds[0].matches[0];
    assert.equal(m1.teamA, 't4');
    assert.equal(m1.winner, null, 'Winner t1 is no longer valid');
    assert.equal(m1.scoreA, null, 'Obsolete scores must be cleared');
    assert.equal(m1.scoreB, null);

    // Downstream m2 must have teamA wiped and winner wiped
    const m2 = updated.rounds[1].matches[0];
    assert.equal(m2.teamA, null);
    assert.equal(m2.winner, null);
    assert.equal(m2.scoreA, null);
    assert.equal(m2.scoreB, null);
  });

  test('5. withdrawTeam cleans active tables, brackets, and champion', () => {
    const state = {
      teams: [
        { id: 't1', name: 'Team 1', withdrawn: false },
        { id: 't2', name: 'Team 2', withdrawn: false },
        { id: 't3', name: 'Team 3', withdrawn: false },
      ],
      activeTables: {
        1: { teamA: 't1', teamB: 't2' },
        2: { teamA: 't3', teamB: null },
      },
      matches: [
        { id: 'm1', teamA: 't1', teamB: 't3', winner: null },
      ],
      bracket: {
        rounds: [
          {
            matches: [
              { id: 'bm1', teamA: 't1', teamB: 't2', winner: null },
            ],
          },
        ],
      },
      champion: { id: 't1', name: 'Team 1' },
      stage: 'finished',
    };

    const withdrawn = withdrawTeam(state, 't1');

    // 1. Team marked withdrawn
    assert.equal(withdrawn.teams.find(t => t.id === 't1').withdrawn, true);

    // 2. Unseated from active table
    assert.equal(withdrawn.activeTables[1].teamA, null);
    assert.equal(withdrawn.activeTables[1].teamB, 't2');

    // 3. Bracket match bm1: opponent t2 automatically advances on walkover
    assert.equal(withdrawn.bracket.rounds[0].matches[0].winner, 't2');

    // 4. Champion t1 cleared and stage drops from finished to knockout
    assert.equal(withdrawn.champion, null);
    assert.equal(withdrawn.stage, 'knockout');
  });

  test('6. sanitizeTournamentState auto-heals desynchronized stage and champion states', () => {
    // 6.1: finished stage without champion auto-recovers from bracket final
    const stateWithFinalWinner = {
      teams: [{ id: 't1', name: 'Alpha' }],
      stage: 'finished',
      champion: null,
      bracket: {
        rounds: [
          { matches: [{ id: 'f1', winner: 't1' }] },
        ],
      },
      tablesCount: 2,
    };
    const healed1 = sanitizeTournamentState(stateWithFinalWinner);
    assert.equal(healed1.stage, 'finished');
    assert.equal(healed1.champion?.id, 't1');

    // 6.2: finished stage without champion and NO final winner heals stage to knockout
    const stateNoWinner = {
      teams: [{ id: 't1', name: 'Alpha' }],
      stage: 'finished',
      champion: null,
      bracket: {
        rounds: [
          { matches: [{ id: 'f1', winner: null }] },
        ],
      },
      tablesCount: 2,
    };
    const healed2 = sanitizeTournamentState(stateNoWinner);
    assert.equal(healed2.stage, 'knockout');
    assert.equal(healed2.champion, null);

    // 6.3: knockout stage without bracket heals to groups/setup
    const stateKnockoutNoBracket = {
      teams: [{ id: 't1', name: 'Alpha' }],
      stage: 'knockout',
      bracket: null,
      groups: { A: ['t1'] },
      tablesCount: 2,
    };
    const healed3 = sanitizeTournamentState(stateKnockoutNoBracket);
    assert.equal(healed3.stage, 'groups');

    // 6.4: duplicate seated team across tables is cleaned
    const stateDuplicateSeated = {
      teams: [{ id: 't1', name: 'Alpha' }],
      tablesCount: 2,
      activeTables: {
        1: { teamA: 't1', teamB: null },
        2: { teamA: 't1', teamB: null },
      },
    };
    const healed4 = sanitizeTournamentState(stateDuplicateSeated);
    assert.equal(healed4.activeTables[1].teamA, 't1');
    assert.equal(healed4.activeTables[2].teamA, null, 'Duplicate seating at Table 2 must be cleaned');
  });
});
