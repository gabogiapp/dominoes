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

  const standings = Object.values(stats);

  // Compute head-to-head wins among teams that share the exact same record (same wins, same losses)
  standings.forEach(team => {
    const sameRecordTeams = standings.filter(
      other => other.teamId !== team.teamId && other.wins === team.wins && other.losses === team.losses
    );
    let h2hWins = 0;
    if (sameRecordTeams.length > 0) {
      const sameRecordIds = new Set(sameRecordTeams.map(t => t.teamId));
      groupMatches.forEach(m => {
        const winner = overrides.manualWinner?.[m.id] || m.winner;
        if (winner === team.teamId) {
          const opponent = m.teamA === team.teamId ? m.teamB : m.teamA;
          if (sameRecordIds.has(opponent)) {
            h2hWins++;
          }
        }
      });
    }
    team.h2hWins = h2hWins;
  });

  // Sort:
  // 1. Manual rank overrides (if set by organizer)
  // 2. Most wins first
  // 3. Fewest losses first (higher win rate / fewer defeats)
  // 4. Head-to-head wins among teams with identical records
  // 5. Deterministic fallback by teamId
  standings.sort((a, b) => {
    if (overrides.manualRank && overrides.manualRank[groupId]) {
      const rankMap = overrides.manualRank[groupId];
      const ra = rankMap[a.teamId];
      const rb = rankMap[b.teamId];
      if (ra != null && rb != null) return ra - rb;
      if (ra != null) return -1;
      if (rb != null) return 1;
    }

    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.losses !== b.losses) return a.losses - b.losses;
    if (b.h2hWins !== a.h2hWins) return b.h2hWins - a.h2hWins;
    return a.teamId.localeCompare(b.teamId);
  });

  return standings;
}

// ─── Detect ties that need manual resolution ────────────────────────
export function detectTies(standings) {
  const ties = [];
  for (let i = 0; i < standings.length - 1; i++) {
    const a = standings[i];
    const b = standings[i + 1];
    // Only genuine ties (identical wins AND identical losses) with at least 1 match played
    if (a.wins === b.wins && a.losses === b.losses && (a.wins > 0 || a.losses > 0)) {
      // If head-to-head already separated them, it's not an unresolved tie
      if (a.h2hWins != null && b.h2hWins != null && a.h2hWins !== b.h2hWins) {
        continue;
      }
      ties.push([a.teamId, b.teamId]);
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

// ─── Emergency Bracket Overrides ────────────────────────────────────

/**
 * Updates participants (teamA, teamB) or table for a bracket match.
 * If the current winner is no longer one of the participating teams,
 * the winner is safely cleared and cleared downstream.
 */
export function updateBracketMatchParticipants(bracket, matchId, updates = {}) {
  if (!bracket || !bracket.rounds) return bracket;
  const newBracket = JSON.parse(JSON.stringify(bracket));

  for (let ri = 0; ri < newBracket.rounds.length; ri++) {
    for (let mi = 0; mi < newBracket.rounds[ri].matches.length; mi++) {
      const m = newBracket.rounds[ri].matches[mi];
      if (m.id === matchId) {
        if (updates.teamA !== undefined) m.teamA = updates.teamA;
        if (updates.teamB !== undefined) m.teamB = updates.teamB;
        if (updates.table !== undefined) m.table = updates.table;

        // If the current winner is no longer valid, clear it and cascade downstream
        if (m.winner && m.winner !== m.teamA && m.winner !== m.teamB) {
          m.winner = null;
          clearDownstreamSlots(newBracket, ri, mi);
        }
        return newBracket;
      }
    }
  }
  return newBracket;
}

/**
 * Swaps teamA and teamB for a bracket match.
 */
export function swapBracketMatchTeams(bracket, matchId) {
  if (!bracket || !bracket.rounds) return bracket;
  const newBracket = JSON.parse(JSON.stringify(bracket));

  for (let ri = 0; ri < newBracket.rounds.length; ri++) {
    for (let mi = 0; mi < newBracket.rounds[ri].matches.length; mi++) {
      const m = newBracket.rounds[ri].matches[mi];
      if (m.id === matchId) {
        const temp = m.teamA;
        m.teamA = m.teamB;
        m.teamB = temp;
        return newBracket;
      }
    }
  }
  return newBracket;
}

/**
 * Swaps specific slots between two bracket matches (e.g. swap Match 1's teamB with Match 2's teamB).
 */
export function swapBracketSlots(bracket, matchId1, slot1, matchId2, slot2) {
  if (!bracket || !bracket.rounds) return bracket;
  const newBracket = JSON.parse(JSON.stringify(bracket));

  let m1 = null, r1 = -1, i1 = -1;
  let m2 = null, r2 = -1, i2 = -1;

  for (let ri = 0; ri < newBracket.rounds.length; ri++) {
    for (let mi = 0; mi < newBracket.rounds[ri].matches.length; mi++) {
      const m = newBracket.rounds[ri].matches[mi];
      if (m.id === matchId1) { m1 = m; r1 = ri; i1 = mi; }
      if (m.id === matchId2) { m2 = m; r2 = ri; i2 = mi; }
    }
  }

  if (m1 && m2) {
    const temp = m1[slot1];
    m1[slot1] = m2[slot2];
    m2[slot2] = temp;

    if (m1.winner && m1.winner !== m1.teamA && m1.winner !== m1.teamB) {
      m1.winner = null;
      clearDownstreamSlots(newBracket, r1, i1);
    }
    if (m2.winner && m2.winner !== m2.teamA && m2.winner !== m2.teamB) {
      m2.winner = null;
      clearDownstreamSlots(newBracket, r2, i2);
    }
  }
  return newBracket;
}

// ─── Emergency Group / Pool Overrides ────────────────────────────────

/**
 * Swaps two teams between their respective groups.
 * Replaces occurrences in unplayed group matches so existing unplayed matches
 * correctly transfer to the new pool without disrupting played results.
 */
export function swapTeamsBetweenGroups(state, teamIdA, teamIdB) {
  const newState = JSON.parse(JSON.stringify(state));
  let groupA = null;
  let groupB = null;

  for (const gid of Object.keys(newState.groups)) {
    if (newState.groups[gid].includes(teamIdA)) groupA = gid;
    if (newState.groups[gid].includes(teamIdB)) groupB = gid;
  }

  if (!groupA || !groupB || groupA === groupB) return newState;

  // Swap memberships in groups
  newState.groups[groupA] = newState.groups[groupA].map(id => (id === teamIdA ? teamIdB : id));
  newState.groups[groupB] = newState.groups[groupB].map(id => (id === teamIdB ? teamIdA : id));

  // Update unplayed group matches
  if (newState.matches) {
    newState.matches = newState.matches.map(m => {
      if (m.stage !== 'group' || m.winner) return m;

      let newTeamA = m.teamA;
      let newTeamB = m.teamB;

      if (m.teamA === teamIdA) newTeamA = teamIdB;
      else if (m.teamA === teamIdB) newTeamA = teamIdA;

      if (m.teamB === teamIdA) newTeamB = teamIdB;
      else if (m.teamB === teamIdB) newTeamB = teamIdA;

      return {
        ...m,
        teamA: newTeamA,
        teamB: newTeamB,
      };
    });
  }

  return newState;
}

/**
 * Reassigns a team to a target group.
 */
export function reassignTeamToGroup(state, teamId, targetGroupId) {
  const newState = JSON.parse(JSON.stringify(state));
  let fromGroup = null;

  for (const gid of Object.keys(newState.groups)) {
    if (newState.groups[gid].includes(teamId)) {
      fromGroup = gid;
      break;
    }
  }

  if (!fromGroup || fromGroup === targetGroupId) return newState;

  // Remove from old group, add to target group
  newState.groups[fromGroup] = newState.groups[fromGroup].filter(id => id !== teamId);
  if (!newState.groups[targetGroupId]) newState.groups[targetGroupId] = [];
  if (!newState.groups[targetGroupId].includes(teamId)) {
    newState.groups[targetGroupId].push(teamId);
  }

  // Remove unplayed matches for this team in the old group
  if (newState.matches) {
    newState.matches = newState.matches.filter(m => {
      if (m.stage === 'group' && m.groupId === fromGroup && !m.winner && (m.teamA === teamId || m.teamB === teamId)) {
        return false;
      }
      return true;
    });

    // Add round-robin matches for teamId against unplayed teams in targetGroupId
    const targetTeams = newState.groups[targetGroupId].filter(id => id !== teamId);
    let tableIdx = 1;
    targetTeams.forEach(opponentId => {
      const exists = newState.matches.some(m =>
        m.stage === 'group' && m.groupId === targetGroupId &&
        ((m.teamA === teamId && m.teamB === opponentId) || (m.teamA === opponentId && m.teamB === teamId))
      );
      if (!exists) {
        newState.matches.push({
          id: nextMatchId(),
          stage: 'group',
          groupId: targetGroupId,
          teamA: teamId,
          teamB: opponentId,
          table: tableIdx,
          winner: null,
        });
        tableIdx = (tableIdx % (state.tablesCount || 2)) + 1;
      }
    });
  }

  return newState;
}

/**
 * Updates a group match (participants, table, winner).
 */
export function updateGroupMatch(matches, matchId, updates = {}) {
  return matches.map(m => {
    if (m.id !== matchId) return m;
    const updated = { ...m };
    if (updates.teamA !== undefined) updated.teamA = updates.teamA;
    if (updates.teamB !== undefined) updated.teamB = updates.teamB;
    if (updates.table !== undefined) updated.table = updates.table;
    if (updates.winner !== undefined) updated.winner = updates.winner;
    return updated;
  });
}

/**
 * Swaps teamA and teamB for a group match.
 */
export function swapGroupMatchTeams(matches, matchId) {
  return matches.map(m => {
    if (m.id !== matchId) return m;
    return {
      ...m,
      teamA: m.teamB,
      teamB: m.teamA,
    };
  });
}

// ─── Determine status for all teams in a group ──────────────────────
export function calcGroupStatusMap(groupId, standings, groups, matches, overrides = {}, advanceCount = 2) {
  const statusMap = {};
  const groupTeamIds = groups[groupId] || [];
  const groupMatches = matches.filter(m => m.stage === 'group' && m.groupId === groupId);
  const unplayedMatches = groupMatches.filter(m => !m.winner && !overrides.manualWinner?.[m.id]);
  const playedMatchesCount = groupMatches.filter(m => m.winner || overrides.manualWinner?.[m.id]).length;
  const isPoolComplete = groupMatches.length > 0 && unplayedMatches.length === 0;

  // Case 1: All pool matches complete
  if (isPoolComplete) {
    standings.forEach((s, rank) => {
      if (overrides.manualAdvancement?.[groupId]) {
        statusMap[s.teamId] = overrides.manualAdvancement[groupId].includes(s.teamId) ? 'ADVANCING' : 'ELIMINATED';
      } else {
        statusMap[s.teamId] = rank < advanceCount ? 'ADVANCING' : 'ELIMINATED';
      }
    });
    return statusMap;
  }

  // Case 2: Pool is in progress
  // If no matches have been played yet at all, status is blank
  if (playedMatchesCount === 0) {
    groupTeamIds.forEach(id => { statusMap[id] = ''; });
    return statusMap;
  }

  // Check manual advancement overrides
  if (overrides.manualAdvancement?.[groupId]) {
    standings.forEach(s => {
      if (overrides.manualAdvancement[groupId].includes(s.teamId)) {
        statusMap[s.teamId] = 'ADVANCING';
      }
    });
  }

  // Simulate remaining match outcomes to detect mathematically clinched or eliminated teams
  if (unplayedMatches.length <= 8) {
    const totalOutcomes = 1 << unplayedMatches.length;
    const advanceCounts = {};
    groupTeamIds.forEach(id => { advanceCounts[id] = 0; });

    for (let outcome = 0; outcome < totalOutcomes; outcome++) {
      const simMatches = matches.map(m => {
        if (m.stage !== 'group' || m.groupId !== groupId || m.winner || overrides.manualWinner?.[m.id]) {
          return m;
        }
        const uIdx = unplayedMatches.findIndex(um => um.id === m.id);
        if (uIdx !== -1) {
          const winner = (outcome & (1 << uIdx)) ? m.teamB : m.teamA;
          return { ...m, winner };
        }
        return m;
      });

      const simStandings = calcGroupStandings(groupId, groupTeamIds, simMatches, overrides);
      for (let r = 0; r < advanceCount && r < simStandings.length; r++) {
        advanceCounts[simStandings[r].teamId]++;
      }
    }

    standings.forEach((s, rank) => {
      if (statusMap[s.teamId]) return;
      const adv = advanceCounts[s.teamId] || 0;
      if (adv === totalOutcomes) {
        statusMap[s.teamId] = 'ADVANCING';
      } else if (adv === 0) {
        statusMap[s.teamId] = 'ELIMINATED';
      } else if (rank < advanceCount) {
        statusMap[s.teamId] = 'IN CONTENTION';
      } else {
        statusMap[s.teamId] = '';
      }
    });

    return statusMap;
  }

  // Fallback for large pools (unplayed > 8)
  const totalTeamMatches = groupTeamIds.length - 1;
  standings.forEach((s, rank) => {
    if (statusMap[s.teamId]) return;
    const played = s.played || 0;
    const remaining = Math.max(0, totalTeamMatches - played);
    const maxWins = s.wins + remaining;

    const teamsGuaranteedAhead = standings.filter(other => other.teamId !== s.teamId && other.wins > maxWins).length;
    if (teamsGuaranteedAhead >= advanceCount) {
      statusMap[s.teamId] = 'ELIMINATED';
      return;
    }

    const otherTeamsCanCatch = standings.filter(other => {
      if (other.teamId === s.teamId) return false;
      const otherRemaining = Math.max(0, totalTeamMatches - (other.played || 0));
      return (other.wins + otherRemaining) >= s.wins;
    }).length;
    if (otherTeamsCanCatch < advanceCount) {
      statusMap[s.teamId] = 'ADVANCING';
      return;
    }

    if (rank < advanceCount) {
      statusMap[s.teamId] = 'IN CONTENTION';
    } else {
      statusMap[s.teamId] = '';
    }
  });

  return statusMap;
}

// ─── Determine status for a single team in standings ────────────────
export function getTeamStatus(teamId, groupId, standings, groups, matches, overrides = {}, advanceCount = 2) {
  const statusMap = calcGroupStatusMap(groupId, standings, groups, matches, overrides, advanceCount);
  return statusMap[teamId] || '';
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
