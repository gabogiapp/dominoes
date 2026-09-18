// ─── Tournament Engine ──────────────────────────────────────────────
// Pure functions that operate on tournament state.
// No side effects — caller is responsible for persisting.

let _matchId = 1;
export function nextMatchId() { return `m_${_matchId++}`; }
export function resetMatchIdCounter(matches) {
  if (!matches || matches.length === 0) { _matchId = 1; return; }
  const maxNum = matches.reduce((max, m) => {
    const n = parseInt(m.id.replace('m_', ''), 10);
    return isNaN(n) ? max : Math.max(max, n);
  }, 0);
  _matchId = maxNum + 1;
}

let _teamId = 100;
export function nextTeamId() { return `team_${_teamId++}`; }
export function resetTeamIdCounter(teams) {
  if (!teams || teams.length === 0) { _teamId = 100; return; }
  const maxNum = teams.reduce((max, t) => {
    const n = parseInt(t.id.replace('team_', ''), 10);
    return isNaN(n) ? max : Math.max(max, n);
  }, 0);
  _teamId = maxNum + 1;
}

// ─── Group recommendation ───────────────────────────────────────────
export function recommendGroups(teamCount) {
  if (teamCount <= 5) return { poolCount: 1, note: 'Single pool round-robin' };
  if (teamCount <= 8) return { poolCount: 2, note: '2 pools → 4-team knockout' };
  if (teamCount <= 12) return { poolCount: 2, note: '2 pools → 4-team knockout' };
  if (teamCount <= 16) return { poolCount: 4, note: '4 pools → 8-team knockout' };
  return { poolCount: 4, note: '4 pools → 8-team knockout (large tournament)' };
}

// ─── Distribute teams into pools ────────────────────────────────────
export function distributeTeams(teams, poolCount) {
  const groups = {};
  const labels = 'ABCDEFGH'.split('');
  for (let i = 0; i < poolCount; i++) {
    groups[labels[i]] = [];
  }
  // snake-draft distribution for balance
  const sorted = [...teams].filter(t => !t.withdrawn);
  sorted.forEach((team, idx) => {
    const poolIdx = idx % poolCount;
    groups[labels[poolIdx]].push(team.id);
  });
  return groups;
}

// ─── Round-robin schedule for a group ───────────────────────────────
export function generateRoundRobin(teamIds) {
  const pairs = [];
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      pairs.push([teamIds[i], teamIds[j]]);
    }
  }
  return pairs;
}

// ─── Generate all group matches ─────────────────────────────────────
export function generateGroupMatches(groups, tablesCount = 2) {
  const matches = [];
  let tableIdx = 0;
  const groupLabels = Object.keys(groups).sort();
  for (const groupId of groupLabels) {
    const teamIds = groups[groupId];
    const pairs = generateRoundRobin(teamIds);
    pairs.forEach((pair) => {
      tableIdx = (tableIdx % tablesCount) + 1;
      matches.push({
        id: nextMatchId(),
        stage: 'group',
        groupId,
        teamA: pair[0],
        teamB: pair[1],
        table: tableIdx,
        winner: null,
      });
    });
  }
  return matches;
}

// ─── Calculate standings for a group ────────────────────────────────
export function calcGroupStandings(groupId, teamIds, matches, overrides = {}) {
  const stats = {};
  teamIds.forEach(id => {
    stats[id] = { teamId: id, wins: 0, losses: 0, played: 0 };
  });

  const groupMatches = matches.filter(m => m.stage === 'group' && m.groupId === groupId && m.winner);
  groupMatches.forEach(m => {
    const winner = overrides.manualWinner?.[m.id] || m.winner;
    const loserId = winner === m.teamA ? m.teamB : m.teamA;
    if (stats[winner]) { stats[winner].wins++; stats[winner].played++; }
    if (stats[loserId]) { stats[loserId].losses++; stats[loserId].played++; }
  });

  let standings = Object.values(stats);

  // Sort: most wins first, then head-to-head
  standings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    // head-to-head
    const h2h = groupMatches.find(m =>
      (m.teamA === a.teamId && m.teamB === b.teamId) ||
      (m.teamA === b.teamId && m.teamB === a.teamId)
    );
    if (h2h) {
      const winner = overrides.manualWinner?.[h2h.id] || h2h.winner;
      if (winner === a.teamId) return -1;
      if (winner === b.teamId) return 1;
    }
    return 0;
  });

  // Apply manual rank overrides
  if (overrides.manualRank && overrides.manualRank[groupId]) {
    const rankMap = overrides.manualRank[groupId]; // { teamId: rank }
    standings.sort((a, b) => {
      const ra = rankMap[a.teamId];
      const rb = rankMap[b.teamId];
      if (ra != null && rb != null) return ra - rb;
      if (ra != null) return -1;
      if (rb != null) return 1;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return 0;
    });
  }

  return standings;
}

// ─── Detect ties that need manual resolution ────────────────────────
export function detectTies(standings) {
  const ties = [];
  for (let i = 0; i < standings.length - 1; i++) {
    if (standings[i].wins === standings[i + 1].wins && standings[i].wins > 0) {
      ties.push([standings[i].teamId, standings[i + 1].teamId]);
    }
  }
  return ties;
}

// ─── Check if group stage is complete ───────────────────────────────
export function isGroupStageComplete(matches) {
  const groupMatches = matches.filter(m => m.stage === 'group');
  return groupMatches.length > 0 && groupMatches.every(m => m.winner !== null);
}

// ─── Get next unplayed matches ──────────────────────────────────────
export function getNextMatches(matches, tablesCount = 2) {
  const unplayed = matches.filter(m => m.stage === 'group' && !m.winner);
  return unplayed.slice(0, tablesCount);
}

// ─── Get current active matches (first unplayed per table or just next N)
export function getActiveMatches(matches, tablesCount = 2) {
  const unplayed = matches.filter(m => !m.winner);
  // try to get one per table
  const byTable = {};
  const result = [];
  for (const m of unplayed) {
    if (!byTable[m.table] && result.length < tablesCount) {
      byTable[m.table] = true;
      result.push(m);
    }
  }
  // if we still have room, fill from unplayed
  if (result.length < tablesCount) {
    for (const m of unplayed) {
      if (!result.includes(m) && result.length < tablesCount) {
        result.push(m);
      }
    }
  }
  return result;
}

// ─── Determine which teams advance from groups ──────────────────────
export function getAdvancingTeams(groups, matches, overrides = {}, advanceCount = 2) {
  const advancing = {};
  const groupLabels = Object.keys(groups).sort();
  for (const groupId of groupLabels) {
    const standings = calcGroupStandings(groupId, groups[groupId], matches, overrides);
    // Check manual advancement override
    if (overrides.manualAdvancement && overrides.manualAdvancement[groupId]) {
      advancing[groupId] = overrides.manualAdvancement[groupId];
    } else {
      advancing[groupId] = standings.slice(0, advanceCount).map(s => s.teamId);
    }
  }
  return advancing;
}

// ─── Generate knockout bracket ──────────────────────────────────────
export function generateBracket(groups, matches, overrides = {}) {
  const groupLabels = Object.keys(groups).sort();
  const poolCount = groupLabels.length;
  const advancing = getAdvancingTeams(groups, matches, overrides);

  if (poolCount === 1) {
    // top 2 play final directly or top 4 play semis
    const teamIds = advancing[groupLabels[0]] || [];
    if (teamIds.length >= 4) {
      return {
        rounds: [
          {
            name: 'Semifinals',
            matches: [
              { id: nextMatchId(), stage: 'knockout', round: 'semi', matchNum: 1, teamA: teamIds[0] || null, teamB: teamIds[3] || null, table: 1, winner: null },
              { id: nextMatchId(), stage: 'knockout', round: 'semi', matchNum: 2, teamA: teamIds[1] || null, teamB: teamIds[2] || null, table: 2, winner: null },
            ],
          },
          {
            name: 'Championship Final',
            matches: [
              { id: nextMatchId(), stage: 'knockout', round: 'final', matchNum: 1, teamA: null, teamB: null, table: 1, winner: null },
            ],
          },
        ],
      };
    } else {
      return {
        rounds: [
          {
            name: 'Championship Final',
            matches: [
              { id: nextMatchId(), stage: 'knockout', round: 'final', matchNum: 1, teamA: teamIds[0] || null, teamB: teamIds[1] || null, table: 1, winner: null },
            ],
          },
        ],
      };
    }
  }

  if (poolCount === 2) {
    // A1 vs B2, B1 vs A2 → Final
    const a = advancing['A'] || [];
    const b = advancing['B'] || [];
    return {
      rounds: [
        {
          name: 'Semifinals',
          matches: [
            { id: nextMatchId(), stage: 'knockout', round: 'semi', matchNum: 1, teamA: a[0] || null, teamB: b[1] || null, table: 1, winner: null },
            { id: nextMatchId(), stage: 'knockout', round: 'semi', matchNum: 2, teamA: b[0] || null, teamB: a[1] || null, table: 2, winner: null },
          ],
        },
        {
          name: 'Championship Final',
          matches: [
            { id: nextMatchId(), stage: 'knockout', round: 'final', matchNum: 1, teamA: null, teamB: null, table: 1, winner: null },
          ],
        },
      ],
    };
  }

  if (poolCount === 3) {
    const a = advancing['A'] || [];
    const b = advancing['B'] || [];
    const c = advancing['C'] || [];
    return {
      rounds: [
        {
          name: 'Quarterfinals',
          matches: [
            { id: nextMatchId(), stage: 'knockout', round: 'quarter', matchNum: 1, teamA: a[0] || null, teamB: null, table: 1, winner: null },
            { id: nextMatchId(), stage: 'knockout', round: 'quarter', matchNum: 2, teamA: b[0] || null, teamB: c[1] || null, table: 2, winner: null },
            { id: nextMatchId(), stage: 'knockout', round: 'quarter', matchNum: 3, teamA: c[0] || null, teamB: null, table: 1, winner: null },
            { id: nextMatchId(), stage: 'knockout', round: 'quarter', matchNum: 4, teamA: a[1] || null, teamB: b[1] || null, table: 2, winner: null },
          ],
        },
        {
          name: 'Semifinals',
          matches: [
            { id: nextMatchId(), stage: 'knockout', round: 'semi', matchNum: 1, teamA: null, teamB: null, table: 1, winner: null },
            { id: nextMatchId(), stage: 'knockout', round: 'semi', matchNum: 2, teamA: null, teamB: null, table: 2, winner: null },
          ],
        },
        {
          name: 'Championship Final',
          matches: [
            { id: nextMatchId(), stage: 'knockout', round: 'final', matchNum: 1, teamA: null, teamB: null, table: 1, winner: null },
          ],
        },
      ],
    };
  }

  if (poolCount >= 4) {
    // 8-team bracket: QF → SF → Final
    const a = advancing['A'] || [];
    const b = advancing['B'] || [];
    const c = advancing['C'] || [];
    const d = advancing['D'] || [];
    return {
      rounds: [
        {
          name: 'Quarterfinals',
          matches: [
            { id: nextMatchId(), stage: 'knockout', round: 'quarter', matchNum: 1, teamA: a[0] || null, teamB: d[1] || null, table: 1, winner: null },
            { id: nextMatchId(), stage: 'knockout', round: 'quarter', matchNum: 2, teamA: b[0] || null, teamB: c[1] || null, table: 2, winner: null },
            { id: nextMatchId(), stage: 'knockout', round: 'quarter', matchNum: 3, teamA: c[0] || null, teamB: b[1] || null, table: 1, winner: null },
            { id: nextMatchId(), stage: 'knockout', round: 'quarter', matchNum: 4, teamA: d[0] || null, teamB: a[1] || null, table: 2, winner: null },
          ],
        },
        {
          name: 'Semifinals',
          matches: [
            { id: nextMatchId(), stage: 'knockout', round: 'semi', matchNum: 1, teamA: null, teamB: null, table: 1, winner: null },
            { id: nextMatchId(), stage: 'knockout', round: 'semi', matchNum: 2, teamA: null, teamB: null, table: 2, winner: null },
          ],
        },
        {
          name: 'Championship Final',
          matches: [
            { id: nextMatchId(), stage: 'knockout', round: 'final', matchNum: 1, teamA: null, teamB: null, table: 1, winner: null },
          ],
        },
      ],
    };
  }

  // Fallback
  return generateBracket({ A: groups[groupLabels[0]] || [], B: groups[groupLabels[1]] || [] }, matches, overrides);
}

// ─── Advance winner in bracket ──────────────────────────────────────
export function advanceBracketWinner(bracket, matchId, winnerId) {
  if (!bracket || !bracket.rounds) return bracket;
  const newBracket = JSON.parse(JSON.stringify(bracket));

  // Find the match and record winner
  let matchRoundIdx = -1;
  let matchIdx = -1;
  for (let ri = 0; ri < newBracket.rounds.length; ri++) {
    for (let mi = 0; mi < newBracket.rounds[ri].matches.length; mi++) {
      if (newBracket.rounds[ri].matches[mi].id === matchId) {
        matchRoundIdx = ri;
        matchIdx = mi;
        break;
      }
    }
    if (matchRoundIdx !== -1) break;
  }

  if (matchRoundIdx === -1) return newBracket;

  const currentMatch = newBracket.rounds[matchRoundIdx].matches[matchIdx];
  const prevWinner = currentMatch.winner;
  currentMatch.winner = winnerId;

  // Advance to next round
  const nextRoundIdx = matchRoundIdx + 1;
  if (nextRoundIdx < newBracket.rounds.length) {
    const nextRound = newBracket.rounds[nextRoundIdx];
    const targetSlot = Math.floor(matchIdx / 2);
    const isTeamA = matchIdx % 2 === 0;

    if (nextRound.matches[targetSlot]) {
      const nextMatch = nextRound.matches[targetSlot];
      if (isTeamA) {
        if (nextMatch.teamA !== winnerId) {
          nextMatch.teamA = winnerId;
          if (prevWinner && prevWinner !== winnerId) {
            nextMatch.winner = null;
            clearDownstreamSlots(newBracket, nextRoundIdx, targetSlot);
          }
        }
      } else {
        if (nextMatch.teamB !== winnerId) {
          nextMatch.teamB = winnerId;
          if (prevWinner && prevWinner !== winnerId) {
            nextMatch.winner = null;
            clearDownstreamSlots(newBracket, nextRoundIdx, targetSlot);
          }
        }
      }
    }
  }

  return newBracket;
}

// Helper: Clear downstream matches
function clearDownstreamSlots(bracket, rIdx, mIdx) {
  const nextRIdx = rIdx + 1;
  if (nextRIdx >= bracket.rounds.length) return;
  const targetSlot = Math.floor(mIdx / 2);
  const isTeamA = mIdx % 2 === 0;
  const nextMatch = bracket.rounds[nextRIdx].matches[targetSlot];
  if (nextMatch) {
    if (isTeamA) {
      nextMatch.teamA = null;
    } else {
      nextMatch.teamB = null;
    }
    nextMatch.winner = null;
    clearDownstreamSlots(bracket, nextRIdx, targetSlot);
  }
}

// ─── Reset winner in bracket (with downstream cascade) ───────────────
export function resetBracketMatch(bracket, matchId) {
  if (!bracket || !bracket.rounds) return bracket;
  const newBracket = JSON.parse(JSON.stringify(bracket));

  let matchRoundIdx = -1;
  let matchIdx = -1;
  for (let ri = 0; ri < newBracket.rounds.length; ri++) {
    for (let mi = 0; mi < newBracket.rounds[ri].matches.length; mi++) {
      if (newBracket.rounds[ri].matches[mi].id === matchId) {
        matchRoundIdx = ri;
        matchIdx = mi;
        break;
      }
    }
    if (matchRoundIdx !== -1) break;
  }

  if (matchRoundIdx === -1) return newBracket;

  // Clear this match winner
  const currentMatch = newBracket.rounds[matchRoundIdx].matches[matchIdx];
  currentMatch.winner = null;

  // Cascade clear downstream
  clearDownstreamSlots(newBracket, matchRoundIdx, matchIdx);

  return newBracket;
}

// ─── Get all bracket matches flat ───────────────────────────────────
export function getAllBracketMatches(bracket) {
  if (!bracket || !bracket.rounds) return [];
  return bracket.rounds.flatMap(r => r.matches);
}

// ─── Determine status for a team in standings ───────────────────────
export function getTeamStatus(teamId, groupId, standings, groups, matches, _overrides, advanceCount = 2) {
  const playedMatches = matches.filter(
    m => m.stage === 'group' && m.groupId === groupId && m.winner &&
    (m.teamA === teamId || m.teamB === teamId)
  ).length;
  const allPlayed = playedMatches >= (groups[groupId].length - 1);
  const rank = standings.findIndex(s => s.teamId === teamId);

  if (!allPlayed && rank < advanceCount) return 'IN CONTENTION';
  if (rank < advanceCount) return 'ADVANCING';

  // Check if mathematically eliminated
  const team = standings.find(s => s.teamId === teamId);
  const remainingMatches = (groups[groupId].length - 1) - playedMatches;
  const maxPossibleWins = (team?.wins || 0) + remainingMatches;
  const secondPlaceWins = standings[advanceCount - 1]?.wins || 0;

  if (allPlayed && rank >= advanceCount) return 'ELIMINATED';
  if (maxPossibleWins < secondPlaceWins) return 'ELIMINATED';

  return '';
}

// ─── Withdraw a team ────────────────────────────────────────────────
export function withdrawTeam(state, teamId) {
  const newState = JSON.parse(JSON.stringify(state));
  const team = newState.teams.find(t => t.id === teamId);
  if (team) team.withdrawn = true;

  // Remove unplayed matches involving this team
  newState.matches = newState.matches.map(m => {
    if (!m.winner && (m.teamA === teamId || m.teamB === teamId)) {
      return { ...m, winner: '__withdrawn__' };
    }
    return m;
  });

  return newState;
}
