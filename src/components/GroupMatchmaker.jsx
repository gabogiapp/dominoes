import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTournament } from '../context/TournamentContext';
import { useAdminStatus } from '../utils/storage';
import { calcGroupStandings } from '../utils/tournamentEngine';
import {
  GripVertical,
  CheckCircle2,
  X,
  ArrowRightLeft,
  Trash2,
  Edit2,
  Layers,
  Trophy,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

export default function GroupMatchmaker() {
  const {
    state,
    assignTableTeam,
    removeTableTeam,
    clearTable,
    swapTableTeams,
    recordOpenMatch,
    updateMatchScore,
    deleteMatch,
  } = useTournament();

  const isAdmin = useAdminStatus();
  const tablesCount = Math.max(1, state.tablesCount || 2);
  const activeTables = state.activeTables || {};
  const groups = state.groups || {};
  const groupLabels = Object.keys(groups).sort();

  // Local drag & drop tracking
  const [dragOverTarget, setDragOverTarget] = useState(null); // 't1-teamA', etc.
  const [draggingTeamId, setDraggingTeamId] = useState(null);

  // Mismatch or feedback notification banner
  const [notice, setNotice] = useState(null);

  // Score submission / edit modal state
  const [scoreModal, setScoreModal] = useState({
    isOpen: false,
    tableNum: null,
    matchId: null, // if editing an existing match
    teamA: null,
    teamB: null,
    declaredWinnerId: null,
    scoreA: 200,
    scoreB: 100,
    pool: 'A',
  });

  // Standings per group with ranks and diffs
  const groupStandingsMap = useMemo(() => {
    const map = new Map();
    for (const gid of groupLabels) {
      const teamIds = groups[gid] || [];
      const st = calcGroupStandings(gid, teamIds, state.matches, state.overrides);
      st.forEach((s, idx) => {
        map.set(s.teamId, { ...s, rank: idx + 1, pool: gid });
      });
    }
    return map;
  }, [groupLabels, groups, state.matches, state.overrides]);

  // Helper to lookup team object
  const getTeam = (id) => state.teams.find((t) => t.id === id);

  // Helper to find which pool a team belongs to
  const getTeamPool = (teamId) => {
    if (!teamId) return null;
    const st = groupStandingsMap.get(teamId);
    if (st?.pool) return st.pool;
    for (const [gid, teamIds] of Object.entries(groups)) {
      if (teamIds.includes(teamId)) return gid;
    }
    return null;
  };

  // Determine which teams are currently seated at any table
  const seatedTeamIds = useMemo(() => {
    const set = new Set();
    Object.values(activeTables).forEach((t) => {
      if (t?.teamA) set.add(t.teamA);
      if (t?.teamB) set.add(t.teamB);
    });
    return set;
  }, [activeTables]);

  // Standby teams grouped by their pool
  const standbyByGroup = useMemo(() => {
    const result = {};
    for (const gid of groupLabels) {
      const teamIds = groups[gid] || [];
      result[gid] = teamIds
        .map((id) => getTeam(id))
        .filter((t) => t && !t.withdrawn && !seatedTeamIds.has(t.id))
        .sort((a, b) => {
          const stA = groupStandingsMap.get(a.id) || { played: 0, wins: 0, diff: 0 };
          const stB = groupStandingsMap.get(b.id) || { played: 0, wins: 0, diff: 0 };
          // Prioritize fewer games played to balance table play time
          if (stA.played !== stB.played) return stA.played - stB.played;
          if (stB.wins !== stA.wins) return stB.wins - stA.wins;
          if (stB.diff !== stA.diff) return stB.diff - stA.diff;
          return a.name.localeCompare(b.name);
        });
    }
    return result;
  }, [groupLabels, groups, state.teams, seatedTeamIds, groupStandingsMap]);

  // All completed matches in reverse chronological order
  const completedMatches = useMemo(() => {
    return (state.matches || [])
      .filter((m) => m.winner)
      .slice()
      .reverse();
  }, [state.matches]);

  const tableSlots = Array.from({ length: tablesCount }, (_, i) => i + 1);

  // Helper to determine a table's locked pool
  const getTablePool = (tableNum) => {
    const table = activeTables[tableNum] || {};
    const poolA = table.teamA ? getTeamPool(table.teamA) : null;
    const poolB = table.teamB ? getTeamPool(table.teamB) : null;
    return poolA || poolB || null;
  };

  // Pool theme palette for distinct visual distinction
  const getPoolColor = (poolId) => {
    switch (poolId) {
      case 'A':
        return {
          badge: 'bg-felt text-bone',
          border: 'border-felt/30',
          bgLight: 'bg-felt/10',
          text: 'text-felt',
        };
      case 'B':
        return {
          badge: 'bg-brass text-timber',
          border: 'border-brass/40',
          bgLight: 'bg-brass/15',
          text: 'text-timber',
        };
      case 'C':
        return {
          badge: 'bg-indigo-700 text-bone',
          border: 'border-indigo-400/40',
          bgLight: 'bg-indigo-50',
          text: 'text-indigo-800',
        };
      case 'D':
        return {
          badge: 'bg-terra text-bone',
          border: 'border-terra/40',
          bgLight: 'bg-terra/15',
          text: 'text-terra',
        };
      default:
        return {
          badge: 'bg-timber text-bone',
          border: 'border-timber/30',
          bgLight: 'bg-timber/10',
          text: 'text-timber',
        };
    }
  };

  // Drag & drop handlers with strict intra-pool matching check
  const handleDragStart = (e, teamId) => {
    e.dataTransfer.setData('text/plain', teamId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingTeamId(teamId);
  };

  const handleDragEnd = () => {
    setDraggingTeamId(null);
    setDragOverTarget(null);
  };

  const handleDragOver = (e, tableNum, slot) => {
    e.preventDefault();
    const tablePool = getTablePool(tableNum);
    const draggingPool = draggingTeamId ? getTeamPool(draggingTeamId) : null;

    // Reject if table is locked to a different pool
    if (tablePool && draggingPool && tablePool !== draggingPool) {
      e.dataTransfer.dropEffect = 'none';
      const targetKey = `t${tableNum}-${slot}-forbidden`;
      if (dragOverTarget !== targetKey) {
        setDragOverTarget(targetKey);
      }
      return;
    }

    e.dataTransfer.dropEffect = 'move';
    const targetKey = `t${tableNum}-${slot}`;
    if (dragOverTarget !== targetKey) {
      setDragOverTarget(targetKey);
    }
  };

  const handleDragLeave = (targetKey) => {
    if (dragOverTarget === targetKey || dragOverTarget === `${targetKey}-forbidden`) {
      setDragOverTarget(null);
    }
  };

  const handleDrop = (e, tableNum, slot) => {
    e.preventDefault();
    setDragOverTarget(null);
    setDraggingTeamId(null);

    const teamId = e.dataTransfer.getData('text/plain');
    if (!teamId) return;

    const tablePool = getTablePool(tableNum);
    const teamPool = getTeamPool(teamId);

    // Intra-pool validation: Only teams from the same pool may play each other
    if (tablePool && teamPool && tablePool !== teamPool) {
      const droppedTeam = getTeam(teamId);
      setNotice({
        type: 'error',
        message: `Intra-Pool Rule: Table ${tableNum} is locked to Pool ${tablePool}. ${droppedTeam?.name || 'This team'} is in Pool ${teamPool}. Only teams from the same pool can play each other!`,
      });
      return;
    }

    setNotice(null);
    assignTableTeam(tableNum, slot, teamId);
  };

  // Open modal to state winner and submit final scores
  const openScoreModal = (tableNum, winnerId) => {
    const table = activeTables[tableNum];
    if (!table?.teamA || !table?.teamB) return;

    const teamAObj = getTeam(table.teamA);
    const teamBObj = getTeam(table.teamB);
    const pool = getTeamPool(table.teamA) || 'A';

    // Standard domino winning score defaults: winner gets 200, loser gets 100 (+100 diff)
    const isWinnerA = winnerId === table.teamA;
    setScoreModal({
      isOpen: true,
      tableNum,
      matchId: null,
      teamA: teamAObj,
      teamB: teamBObj,
      declaredWinnerId: winnerId,
      scoreA: isWinnerA ? 200 : 100,
      scoreB: isWinnerA ? 100 : 200,
      pool,
    });
  };

  // Open modal to edit existing match score
  const openEditModal = (match) => {
    const teamAObj = getTeam(match.teamA);
    const teamBObj = getTeam(match.teamB);
    const pool = match.groupId || getTeamPool(match.teamA) || 'A';

    setScoreModal({
      isOpen: true,
      tableNum: match.table || 1,
      matchId: match.id,
      teamA: teamAObj,
      teamB: teamBObj,
      declaredWinnerId: match.winner || match.teamA,
      scoreA: match.scoreA ?? 200,
      scoreB: match.scoreB ?? 100,
      pool,
    });
  };

  const closeScoreModal = () => {
    setScoreModal((prev) => ({ ...prev, isOpen: false }));
  };

  // Switch declared winner inside the modal
  const handleSwitchWinner = (newWinnerId) => {
    setScoreModal((prev) => {
      const curScoreA = Number(prev.scoreA) || 0;
      const curScoreB = Number(prev.scoreB) || 0;
      const higher = Math.max(curScoreA, curScoreB, 200);
      const lower = Math.min(curScoreA, curScoreB, 100);

      const isWinnerA = newWinnerId === prev.teamA.id;
      return {
        ...prev,
        declaredWinnerId: newWinnerId,
        scoreA: isWinnerA ? higher : lower,
        scoreB: isWinnerA ? lower : higher,
      };
    });
  };

  // Preset score button handler
  const handlePresetScore = (ptsWinner, ptsLoser) => {
    setScoreModal((prev) => {
      const isWinnerA = prev.declaredWinnerId === prev.teamA?.id;
      return {
        ...prev,
        scoreA: isWinnerA ? ptsWinner : ptsLoser,
        scoreB: isWinnerA ? ptsLoser : ptsWinner,
      };
    });
  };

  // Submit scores from modal
  const handleSubmitModalScores = () => {
    const { tableNum, matchId, teamA, teamB, declaredWinnerId, scoreA, scoreB } = scoreModal;
    if (!teamA || !teamB) return;

    const numA = Number(scoreA) || 0;
    const numB = Number(scoreB) || 0;

    let finalWinnerId = declaredWinnerId;
    if (!finalWinnerId) {
      finalWinnerId = numA >= numB ? teamA.id : teamB.id;
    }

    if (matchId) {
      // Updating an existing completed match
      updateMatchScore(matchId, {
        scoreA: numA,
        scoreB: numB,
        winner: finalWinnerId,
      });
      setNotice({
        type: 'success',
        message: `Updated scores for ${teamA.name} vs ${teamB.name} (${numA}–${numB}). Standings updated!`,
      });
    } else {
      // Submitting result for an active table
      recordOpenMatch(tableNum, numA, numB, finalWinnerId);
      setNotice({
        type: 'success',
        message: `Match recorded: ${teamA.name} ${numA} – ${numB} ${teamB.name}. Table ${tableNum} is now free!`,
      });
    }

    closeScoreModal();
  };

  // Calculate live diff preview inside modal
  const modalNumA = Number(scoreModal.scoreA) || 0;
  const modalNumB = Number(scoreModal.scoreB) || 0;
  const modalDiff = Math.abs(modalNumA - modalNumB);
  const modalWinnerObj =
    scoreModal.declaredWinnerId === scoreModal.teamA?.id ? scoreModal.teamA : scoreModal.teamB;
  const modalLoserObj =
    scoreModal.declaredWinnerId === scoreModal.teamA?.id ? scoreModal.teamB : scoreModal.teamA;

  return (
    <div className="space-y-8">
      {/* ─── Feedback / Alert Banner ─────────────────────────────── */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`border rounded-xl p-3.5 flex items-start justify-between gap-3 text-xs font-mono shadow-xs ${
              notice.type === 'error'
                ? 'bg-terra/10 border-terra/30 text-terra'
                : 'bg-felt/10 border-felt/30 text-felt'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{notice.message}</span>
            </div>
            <button
              onClick={() => setNotice(null)}
              className="text-timber/40 hover:text-timber p-0.5 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Active Tables Section ──────────────────────────────── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-felt animate-pulse" />
            <h2 className="font-display text-base md:text-lg font-bold uppercase tracking-wider text-timber">
              Active Tables
            </h2>
            <span className="font-mono text-xs text-timber/50">
              ({tablesCount} {tablesCount === 1 ? 'Table' : 'Tables'})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] bg-bone-dark/50 border border-timber/15 px-2.5 py-1 rounded text-timber/70 font-semibold">
              ✦ Only teams from the same pool can play each other
            </span>
          </div>
        </div>

        <div
          className={
            tablesCount === 1
              ? 'max-w-xl mx-auto'
              : tablesCount === 2
              ? 'grid grid-cols-1 md:grid-cols-2 gap-5'
              : tablesCount === 3
              ? 'grid grid-cols-1 md:grid-cols-3 gap-4'
              : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'
          }
        >
          {tableSlots.map((tableNum) => {
            const table = activeTables[tableNum] || { teamA: null, teamB: null };
            const teamA = table.teamA ? getTeam(table.teamA) : null;
            const teamB = table.teamB ? getTeam(table.teamB) : null;
            const bothSeated = Boolean(teamA && teamB);

            const tablePool = getTablePool(tableNum);
            const poolTheme = getPoolColor(tablePool);

            const stA = teamA ? groupStandingsMap.get(teamA.id) : null;
            const stB = teamB ? groupStandingsMap.get(teamB.id) : null;

            const targetKeyA = `t${tableNum}-teamA`;
            const targetKeyB = `t${tableNum}-teamB`;
            const isDragOverA = dragOverTarget === targetKeyA;
            const isDragOverB = dragOverTarget === targetKeyB;
            const isForbiddenA = dragOverTarget === `${targetKeyA}-forbidden`;
            const isForbiddenB = dragOverTarget === `${targetKeyB}-forbidden`;

            // Candidate standby teams for empty slots: MUST match table's locked pool
            const allowedStandbyA = tablePool
              ? (standbyByGroup[tablePool] || []).filter((t) => t.id !== table.teamB)
              : Object.values(standbyByGroup).flat();

            const allowedStandbyB = tablePool
              ? (standbyByGroup[tablePool] || []).filter((t) => t.id !== table.teamA)
              : Object.values(standbyByGroup).flat();

            return (
              <div
                key={`table-arena-${tableNum}`}
                className="border-2 border-timber bg-bone rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between"
              >
                {/* Table Header Bar */}
                <div className="bg-felt text-bone px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs uppercase tracking-widest font-bold">
                      Table {tableNum}
                    </span>

                    {/* Pool Lock / Matchup Badge */}
                    {tablePool ? (
                      <span
                        className={`text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded font-bold ${poolTheme.badge}`}
                      >
                        Pool {tablePool}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded font-bold bg-bone/20 text-bone">
                        Any Pool
                      </span>
                    )}

                    <span
                      className={`text-[9px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded font-bold ${
                        bothSeated
                          ? 'bg-bone text-felt'
                          : teamA || teamB
                          ? 'bg-brass text-timber'
                          : 'bg-bone/15 text-bone/70'
                      }`}
                    >
                      {bothSeated ? 'Live' : teamA || teamB ? 'Waiting 1 Team' : 'Empty'}
                    </span>
                  </div>

                  {isAdmin && (teamA || teamB) && (
                    <div className="flex items-center gap-1">
                      {bothSeated && (
                        <button
                          onClick={() => swapTableTeams(tableNum)}
                          title="Swap Home/Away Sides"
                          className="p-1 hover:bg-bone/20 rounded text-bone transition-colors cursor-pointer"
                        >
                          <ArrowRightLeft size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => clearTable(tableNum)}
                        title="Return both teams to Standby"
                        className="p-1 hover:bg-terra/40 rounded text-bone transition-colors cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Matchup Drop Zones */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-center">
                  {/* Slot A (Home Side) */}
                  <div
                    onDragOver={(e) => handleDragOver(e, tableNum, 'teamA')}
                    onDragLeave={() => handleDragLeave(targetKeyA)}
                    onDrop={(e) => handleDrop(e, tableNum, 'teamA')}
                    className={`border-2 rounded-xl p-3 transition-all ${
                      isForbiddenA
                        ? 'border-terra bg-terra/15 border-dashed scale-[1.01]'
                        : isDragOverA
                        ? 'border-felt bg-felt/15 border-dashed scale-[1.01]'
                        : teamA
                        ? 'border-timber/15 bg-bone-dark/25'
                        : 'border-timber/15 border-dashed bg-bone-dark/10 hover:border-timber/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-timber/50 font-bold">
                        Home Side (Team A)
                      </span>
                      {stA?.pool && (
                        <span className={`text-[9px] font-mono uppercase font-bold px-1.5 py-0.2 rounded ${poolTheme.badge}`}>
                          Pool {stA.pool}
                        </span>
                      )}
                    </div>

                    {isForbiddenA ? (
                      <div className="py-2 text-center text-terra font-mono text-xs font-bold">
                        ❌ Pool Mismatch! Must be Pool {tablePool}
                      </div>
                    ) : teamA ? (
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-display text-base font-bold uppercase text-timber">
                              {teamA.name}
                            </span>
                            {stA && (
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                                  stA.diff > 0
                                    ? 'bg-felt/15 text-felt'
                                    : stA.diff < 0
                                    ? 'bg-terra/15 text-terra'
                                    : 'bg-timber/10 text-timber/60'
                                }`}
                              >
                                {stA.wins}W–{stA.losses}L ({stA.diff > 0 ? `+${stA.diff}` : stA.diff} diff)
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-[10px] text-timber/50 mt-0.5">
                            {teamA.player1} & {teamA.player2}
                          </p>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => removeTableTeam(tableNum, 'teamA')}
                            className="p-1 text-timber/30 hover:text-terra hover:bg-terra/10 rounded transition-colors cursor-pointer"
                            title="Return to Standby"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="py-2 text-center">
                        <p className="font-mono text-xs text-timber/40">
                          {isAdmin
                            ? tablePool
                              ? `Drop Pool ${tablePool} Team here`
                              : 'Drop any team here'
                            : 'Open slot'}
                        </p>
                        {isAdmin && allowedStandbyA.length > 0 && (
                          <div className="mt-1.5">
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) assignTableTeam(tableNum, 'teamA', e.target.value);
                              }}
                              className="text-[11px] font-mono bg-bone border border-timber/20 rounded px-2 py-1 text-timber cursor-pointer"
                            >
                              <option value="" disabled>
                                {tablePool ? `Select Pool ${tablePool} team...` : 'Select from Standby...'}
                              </option>
                              {allowedStandbyA.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name} (Pool {getTeamPool(t.id) || 'A'})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* VS Divider */}
                  <div className="flex items-center gap-3 py-0.5">
                    <div className="flex-1 h-px bg-timber/15" />
                    <span className="font-display text-xs text-timber/40 font-bold tracking-widest">
                      VS
                    </span>
                    <div className="flex-1 h-px bg-timber/15" />
                  </div>

                  {/* Slot B (Away Side) */}
                  <div
                    onDragOver={(e) => handleDragOver(e, tableNum, 'teamB')}
                    onDragLeave={() => handleDragLeave(targetKeyB)}
                    onDrop={(e) => handleDrop(e, tableNum, 'teamB')}
                    className={`border-2 rounded-xl p-3 transition-all ${
                      isForbiddenB
                        ? 'border-terra bg-terra/15 border-dashed scale-[1.01]'
                        : isDragOverB
                        ? 'border-felt bg-felt/15 border-dashed scale-[1.01]'
                        : teamB
                        ? 'border-timber/15 bg-bone-dark/25'
                        : 'border-timber/15 border-dashed bg-bone-dark/10 hover:border-timber/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-timber/50 font-bold">
                        Away Side (Team B)
                      </span>
                      {stB?.pool && (
                        <span className={`text-[9px] font-mono uppercase font-bold px-1.5 py-0.2 rounded ${poolTheme.badge}`}>
                          Pool {stB.pool}
                        </span>
                      )}
                    </div>

                    {isForbiddenB ? (
                      <div className="py-2 text-center text-terra font-mono text-xs font-bold">
                        ❌ Pool Mismatch! Must be Pool {tablePool}
                      </div>
                    ) : teamB ? (
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-display text-base font-bold uppercase text-timber">
                              {teamB.name}
                            </span>
                            {stB && (
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                                  stB.diff > 0
                                    ? 'bg-felt/15 text-felt'
                                    : stB.diff < 0
                                    ? 'bg-terra/15 text-terra'
                                    : 'bg-timber/10 text-timber/60'
                                }`}
                              >
                                {stB.wins}W–{stB.losses}L ({stB.diff > 0 ? `+${stB.diff}` : stB.diff} diff)
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-[10px] text-timber/50 mt-0.5">
                            {teamB.player1} & {teamB.player2}
                          </p>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => removeTableTeam(tableNum, 'teamB')}
                            className="p-1 text-timber/30 hover:text-terra hover:bg-terra/10 rounded transition-colors cursor-pointer"
                            title="Return to Standby"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="py-2 text-center">
                        <p className="font-mono text-xs text-timber/40">
                          {isAdmin
                            ? tablePool
                              ? `Drop Pool ${tablePool} Team here`
                              : 'Drop any team here'
                            : 'Open slot'}
                        </p>
                        {isAdmin && allowedStandbyB.length > 0 && (
                          <div className="mt-1.5">
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) assignTableTeam(tableNum, 'teamB', e.target.value);
                              }}
                              className="text-[11px] font-mono bg-bone border border-timber/20 rounded px-2 py-1 text-timber cursor-pointer"
                            >
                              <option value="" disabled>
                                {tablePool ? `Select Pool ${tablePool} team...` : 'Select from Standby...'}
                              </option>
                              {allowedStandbyB.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name} (Pool {getTeamPool(t.id) || 'B'})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* State Winner Buttons (Admin Only) */}
                {bothSeated && isAdmin && (
                  <div className="p-4 bg-bone-dark/30 border-t border-timber/15 space-y-2.5">
                    <p className="font-mono text-[11px] uppercase tracking-wider text-timber/60 font-bold text-center">
                      State Winner to Enter Final Scores:
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        onClick={() => openScoreModal(tableNum, teamA.id)}
                        className="px-3 py-3 bg-felt text-bone rounded-xl font-display text-xs md:text-sm uppercase font-bold tracking-wider hover:bg-felt-light active:scale-[0.98] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer text-center"
                      >
                        <Trophy size={14} className="text-brass shrink-0" />
                        <span className="truncate">{teamA.name} Won</span>
                      </button>

                      <button
                        onClick={() => openScoreModal(tableNum, teamB.id)}
                        className="px-3 py-3 bg-felt text-bone rounded-xl font-display text-xs md:text-sm uppercase font-bold tracking-wider hover:bg-felt-light active:scale-[0.98] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer text-center"
                      >
                        <Trophy size={14} className="text-brass shrink-0" />
                        <span className="truncate">{teamB.name} Won</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Standby Teams (Organized by Group) ───────────────────── */}
      <div className="border-2 border-timber bg-bone rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-terra" />
            <h3 className="font-display text-base md:text-lg font-bold uppercase tracking-wider text-timber">
              Standby Teams by Pool
            </h3>
          </div>
          <p className="font-mono text-xs text-timber/50 mt-0.5">
            Drag teams into Table 1 or Table 2. Only teams in the same pool can play each other.
          </p>
        </div>

        {/* Group Columns */}
        <div className={`grid gap-4 ${groupLabels.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
          {groupLabels.map((gid) => {
            const poolStandby = standbyByGroup[gid] || [];
            const poolTheme = getPoolColor(gid);

            return (
              <div
                key={`pool-standby-col-${gid}`}
                className="border border-timber/15 bg-bone-dark/15 rounded-xl p-4 flex flex-col justify-between"
              >
                {/* Pool Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-timber/10 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-xs uppercase px-2 py-0.5 rounded font-bold ${poolTheme.badge}`}>
                      Pool {gid}
                    </span>
                    <span className="font-display text-sm font-bold uppercase tracking-wide text-timber">
                      Standby
                    </span>
                    <span className="font-mono text-[11px] bg-timber/10 px-2 py-0.5 rounded text-timber/70 font-semibold">
                      {poolStandby.length} waiting
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-timber/40">
                    {groups[gid]?.length || 0} pool teams
                  </span>
                </div>

                {/* Pool Teams Cards */}
                {poolStandby.length === 0 ? (
                  <div className="py-6 text-center font-mono text-xs text-timber/40 italic">
                    All Pool {gid} teams are currently seated at tables!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {poolStandby.map((team) => {
                      const st = groupStandingsMap.get(team.id) || {
                        rank: '-',
                        played: 0,
                        wins: 0,
                        losses: 0,
                        diff: 0,
                      };

                      return (
                        <div
                          key={`standby-team-${team.id}`}
                          draggable={isAdmin}
                          onDragStart={(e) => handleDragStart(e, team.id)}
                          onDragEnd={handleDragEnd}
                          className={`border border-timber/15 bg-bone rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs transition-all ${
                            isAdmin
                              ? 'cursor-grab active:cursor-grabbing hover:border-felt hover:shadow-xs'
                              : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isAdmin && (
                              <GripVertical
                                size={14}
                                className="text-timber/30 shrink-0 cursor-grab"
                              />
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-display text-sm font-bold uppercase text-timber leading-tight">
                                  {team.name}
                                </span>
                                <span className="font-mono text-[10px] text-timber/40 font-bold">
                                  #{st.rank}
                                </span>
                              </div>
                              <p className="font-mono text-[10px] text-timber/50">
                                {team.player1} & {team.player2}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {/* Record & Diff */}
                            <div className="text-right font-mono text-xs">
                              <span className="font-bold text-timber block">
                                {st.wins}W – {st.losses}L
                              </span>
                              <span
                                className={`text-[10px] font-bold block ${
                                  st.diff > 0
                                    ? 'text-felt'
                                    : st.diff < 0
                                    ? 'text-terra'
                                    : 'text-timber/40'
                                }`}
                              >
                                {st.diff > 0 ? `+${st.diff}` : st.diff} diff · {st.played} GP
                              </span>
                            </div>

                            {/* Quick seat buttons: ONLY show if table is empty OR locked to this team's pool */}
                            {isAdmin && (
                              <div className="flex gap-1">
                                {tableSlots.map((num) => {
                                  const table = activeTables[num] || {};
                                  const hasOpenSlot = !table.teamA || !table.teamB;
                                  if (!hasOpenSlot) return null;

                                  const tablePool = getTablePool(num);
                                  // Intra-pool rule: Table must be empty or already hosting this pool
                                  if (tablePool && tablePool !== gid) return null;

                                  const slot = !table.teamA ? 'teamA' : 'teamB';

                                  return (
                                    <button
                                      key={`quick-seat-${team.id}-t${num}`}
                                      onClick={() => assignTableTeam(num, slot, team.id)}
                                      className="py-1 px-1.5 bg-felt/10 hover:bg-felt hover:text-bone text-felt border border-felt/20 rounded font-mono text-[10px] uppercase font-bold transition-all cursor-pointer"
                                      title={`Assign ${team.name} to Table ${num}`}
                                    >
                                      → T{num}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Match History Log ───────────────────────────────────── */}
      {completedMatches.length > 0 && (
        <div className="border-2 border-timber bg-bone rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-base font-bold uppercase tracking-wider text-timber">
              Completed Matches ({completedMatches.length})
            </h3>
            <span className="font-mono text-xs text-timber/50">
              Rankings sort by Wins, then Point Differential (±)
            </span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {completedMatches.map((m) => {
              const teamA = getTeam(m.teamA);
              const teamB = getTeam(m.teamB);
              const isWinnerA = m.winner === m.teamA;
              const isWinnerB = m.winner === m.teamB;
              const hasScore = m.scoreA != null && m.scoreB != null;
              const diff = hasScore ? Math.abs(Number(m.scoreA) - Number(m.scoreB)) : null;
              const winnerName = isWinnerA ? teamA?.name : teamB?.name;
              const pool = m.groupId || getTeamPool(m.teamA) || 'A';
              const poolTheme = getPoolColor(pool);

              return (
                <div
                  key={m.id}
                  className="border border-timber/15 rounded-xl p-2.5 bg-bone-dark/15 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-timber/10 text-timber/60">
                      Table {m.table || '1'}
                    </span>

                    <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${poolTheme.badge}`}>
                      Pool {pool}
                    </span>

                    <div className="flex items-center gap-2">
                      <span
                        className={`font-display uppercase font-bold text-sm ${
                          isWinnerA ? 'text-felt underline decoration-2' : 'text-timber/60'
                        }`}
                      >
                        {teamA?.name || m.teamA}
                      </span>
                      {hasScore && (
                        <span className="font-mono text-sm font-bold bg-bone px-2 py-0.5 rounded border border-timber/15">
                          {m.scoreA} – {m.scoreB}
                        </span>
                      )}
                      <span
                        className={`font-display uppercase font-bold text-sm ${
                          isWinnerB ? 'text-felt underline decoration-2' : 'text-timber/60'
                        }`}
                      >
                        {teamB?.name || m.teamB}
                      </span>
                    </div>

                    {diff != null && diff > 0 && (
                      <span className="font-mono text-[10px] text-felt font-bold bg-felt/10 px-1.5 py-0.5 rounded">
                        +{diff} diff for {winnerName}
                      </span>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(m)}
                        className="p-1.5 text-timber/40 hover:text-timber hover:bg-timber/10 rounded transition-colors cursor-pointer"
                        title="Edit Score in Popup"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this match record? Standings will be recalculated.')) {
                            deleteMatch(m.id);
                          }
                        }}
                        className="p-1.5 text-timber/40 hover:text-terra hover:bg-terra/10 rounded transition-colors cursor-pointer"
                        title="Delete Match"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Score Submission Popup / Modal ───────────────────────── */}
      <AnimatePresence>
        {scoreModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-timber/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-bone border-2 border-timber rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-felt text-bone px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy size={18} className="text-brass" />
                  <span className="font-display text-sm md:text-base uppercase tracking-wider font-bold">
                    {scoreModal.matchId ? 'Edit Match Scores' : `Submit Scores · Table ${scoreModal.tableNum}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs uppercase px-2 py-0.5 rounded font-bold bg-bone/20 text-bone">
                    Pool {scoreModal.pool}
                  </span>
                  <button
                    onClick={closeScoreModal}
                    className="p-1 hover:bg-bone/20 rounded text-bone transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5">
                {/* Winner Declaration Banner */}
                <div className="bg-felt/10 border border-felt/20 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={18} className="text-felt shrink-0" />
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-timber/50 block font-bold">
                        Winner Declared:
                      </span>
                      <span className="font-display text-sm md:text-base font-bold uppercase text-felt">
                        {modalWinnerObj?.name}
                      </span>
                    </div>
                  </div>

                  {/* Switch winner toggle button */}
                  <button
                    onClick={() =>
                      handleSwitchWinner(
                        scoreModal.declaredWinnerId === scoreModal.teamA?.id
                          ? scoreModal.teamB?.id
                          : scoreModal.teamA?.id
                      )
                    }
                    className="text-[11px] font-mono text-timber/70 hover:text-felt underline cursor-pointer shrink-0"
                  >
                    Switch to {modalLoserObj?.name} ⇄
                  </button>
                </div>

                {/* Score Input Fields */}
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-timber/60 font-bold mb-2">
                    Final Match Points
                  </label>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Team A Card */}
                    <div
                      className={`border-2 rounded-xl p-3 text-center transition-all ${
                        scoreModal.declaredWinnerId === scoreModal.teamA?.id
                          ? 'border-felt bg-felt/5'
                          : 'border-timber/20 bg-bone-dark/20'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="font-display text-sm font-bold uppercase text-timber truncate max-w-[140px]">
                          {scoreModal.teamA?.name}
                        </span>
                        {scoreModal.declaredWinnerId === scoreModal.teamA?.id && (
                          <span className="text-[9px] font-mono font-bold bg-felt text-bone px-1 rounded">
                            WIN
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-[10px] text-timber/40 mb-2 truncate">
                        {scoreModal.teamA?.player1} & {scoreModal.teamA?.player2}
                      </p>

                      <input
                        type="number"
                        min="0"
                        max="999"
                        value={scoreModal.scoreA}
                        onChange={(e) =>
                          setScoreModal((prev) => ({ ...prev, scoreA: e.target.value }))
                        }
                        className="w-full bg-bone border-2 border-timber/25 focus:border-felt rounded-lg py-2 font-mono text-2xl font-bold text-center text-timber focus:outline-none"
                      />
                    </div>

                    {/* Team B Card */}
                    <div
                      className={`border-2 rounded-xl p-3 text-center transition-all ${
                        scoreModal.declaredWinnerId === scoreModal.teamB?.id
                          ? 'border-felt bg-felt/5'
                          : 'border-timber/20 bg-bone-dark/20'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="font-display text-sm font-bold uppercase text-timber truncate max-w-[140px]">
                          {scoreModal.teamB?.name}
                        </span>
                        {scoreModal.declaredWinnerId === scoreModal.teamB?.id && (
                          <span className="text-[9px] font-mono font-bold bg-felt text-bone px-1 rounded">
                            WIN
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-[10px] text-timber/40 mb-2 truncate">
                        {scoreModal.teamB?.player1} & {scoreModal.teamB?.player2}
                      </p>

                      <input
                        type="number"
                        min="0"
                        max="999"
                        value={scoreModal.scoreB}
                        onChange={(e) =>
                          setScoreModal((prev) => ({ ...prev, scoreB: e.target.value }))
                        }
                        className="w-full bg-bone border-2 border-timber/25 focus:border-felt rounded-lg py-2 font-mono text-2xl font-bold text-center text-timber focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <span className="text-[10px] font-mono uppercase text-timber/50 font-bold block mb-1.5">
                    Fast Score Presets (Winner – Loser):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => handlePresetScore(200, 100)}
                      className="py-1.5 px-2 bg-bone border border-timber/20 hover:border-felt hover:bg-felt/10 rounded-lg font-mono text-xs font-bold text-timber text-center cursor-pointer transition-colors"
                    >
                      200 – 100 (+100)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetScore(200, 150)}
                      className="py-1.5 px-2 bg-bone border border-timber/20 hover:border-felt hover:bg-felt/10 rounded-lg font-mono text-xs font-bold text-timber text-center cursor-pointer transition-colors"
                    >
                      200 – 150 (+50)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetScore(200, 180)}
                      className="py-1.5 px-2 bg-bone border border-timber/20 hover:border-felt hover:bg-felt/10 rounded-lg font-mono text-xs font-bold text-timber text-center cursor-pointer transition-colors"
                    >
                      200 – 180 (+20)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetScore(200, 0)}
                      className="py-1.5 px-2 bg-bone border border-timber/20 hover:border-felt hover:bg-felt/10 rounded-lg font-mono text-xs font-bold text-timber text-center cursor-pointer transition-colors"
                    >
                      200 – 0 (Skunk)
                    </button>
                  </div>
                </div>

                {/* Point Differential Preview Box */}
                <div className="border border-timber/15 bg-bone-dark/20 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-timber/60 font-semibold">Differential Breakdown:</span>
                    <span className="font-bold text-felt">
                      +{modalDiff} differential
                    </span>
                  </div>

                  <div className="text-xs font-mono grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-felt/10 rounded px-2 py-1 text-felt font-bold truncate">
                      {modalWinnerObj?.name}: +{modalDiff} diff
                    </div>
                    <div className="bg-terra/10 rounded px-2 py-1 text-terra font-bold truncate">
                      {modalLoserObj?.name}: -{modalDiff} diff
                    </div>
                  </div>

                  <p className="font-mono text-[10px] text-timber/40 pt-1">
                    ✦ In pool standings, teams with higher point differentials rank higher!
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-bone-dark/40 px-6 py-3.5 border-t border-timber/15 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeScoreModal}
                  className="px-4 py-2 border border-timber/20 rounded-xl font-mono text-xs font-semibold text-timber hover:bg-bone transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSubmitModalScores}
                  className="px-5 py-2.5 bg-felt text-bone font-display text-xs md:text-sm uppercase tracking-wider font-bold rounded-xl hover:bg-felt-light shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 size={16} className="text-brass" />
                  <span>Confirm & Save Scores</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
