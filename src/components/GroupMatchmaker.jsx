import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTournament } from '../context/TournamentContext';
import { useAdminStatus } from '../utils/storage';
import { calcGroupStandings } from '../utils/tournamentEngine';
import TVStandingsTable from './TVStandingsTable';
import {
  GripVertical,
  CheckCircle2,
  X,
  ArrowRightLeft,
  Trash2,
  Edit2,
  Trophy,
  BarChart3,
  AlertCircle,
  AlertTriangle,
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

  // Standings slide-out drawer state
  const [showStandings, setShowStandings] = useState(false);

  // Standby pool filter tab: 'ALL' or specific pool letter e.g. 'A', 'B'
  const [standbyPoolFilter, setStandbyPoolFilter] = useState('ALL');

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
    poolA: 'A',
    poolB: 'A',
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

  // All standby teams across pools
  const allStandbyTeams = useMemo(() => {
    const list = [];
    for (const gid of groupLabels) {
      const teamIds = groups[gid] || [];
      const poolTeams = teamIds
        .map((id) => getTeam(id))
        .filter((t) => t && !t.withdrawn && !seatedTeamIds.has(t.id));
      list.push(...poolTeams);
    }

    return list.sort((a, b) => {
      const stA = groupStandingsMap.get(a.id) || { played: 0, wins: 0, diff: 0, pool: 'A' };
      const stB = groupStandingsMap.get(b.id) || { played: 0, wins: 0, diff: 0, pool: 'A' };
      if (stA.pool !== stB.pool) return stA.pool.localeCompare(stB.pool);
      if (stA.played !== stB.played) return stA.played - stB.played;
      if (stB.wins !== stA.wins) return stB.wins - stA.wins;
      if (stB.diff !== stA.diff) return stB.diff - stA.diff;
      return a.name.localeCompare(b.name);
    });
  }, [groupLabels, groups, state.teams, seatedTeamIds, groupStandingsMap]);

  // Filtered standby teams based on selected filter tab
  const filteredStandbyTeams = useMemo(() => {
    if (standbyPoolFilter === 'ALL') return allStandbyTeams;
    return allStandbyTeams.filter((t) => getTeamPool(t.id) === standbyPoolFilter);
  }, [allStandbyTeams, standbyPoolFilter]);

  // All completed matches in reverse chronological order
  const completedMatches = useMemo(() => {
    return (state.matches || [])
      .filter((m) => m.winner)
      .slice()
      .reverse();
  }, [state.matches]);

  const tableSlots = Array.from({ length: tablesCount }, (_, i) => i + 1);

  // Helper to determine a table's initial seated pool
  const getTablePool = (tableNum) => {
    const table = activeTables[tableNum] || {};
    const poolA = table.teamA ? getTeamPool(table.teamA) : null;
    const poolB = table.teamB ? getTeamPool(table.teamB) : null;
    return poolA || poolB || null;
  };

  // Distinct pool letter badges
  const renderPoolBadge = (poolId) => {
    if (!poolId) return null;
    let colorClass = 'bg-felt text-bone';
    if (poolId === 'B') colorClass = 'bg-brass text-timber';
    else if (poolId === 'C') colorClass = 'bg-indigo-700 text-bone';
    else if (poolId === 'D') colorClass = 'bg-terra text-bone';

    return (
      <span
        className={`w-5 h-5 rounded flex items-center justify-center font-mono text-[11px] font-bold shrink-0 ${colorClass}`}
        title={`Pool ${poolId}`}
      >
        {poolId}
      </span>
    );
  };

  // Drag & drop handlers: flexible, warns in red if cross-pool, but allows drop
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
    e.dataTransfer.dropEffect = 'move';

    const targetKey = `t${tableNum}-${slot}`;
    if (dragOverTarget !== targetKey) {
      setDragOverTarget(targetKey);
    }
  };

  const handleDragLeave = (targetKey) => {
    if (dragOverTarget === targetKey) {
      setDragOverTarget(null);
    }
  };

  const handleDrop = (e, tableNum, slot) => {
    e.preventDefault();
    setDragOverTarget(null);
    setDraggingTeamId(null);

    const teamId = e.dataTransfer.getData('text/plain');
    if (!teamId) return;

    const table = activeTables[tableNum] || {};
    const otherSlot = slot === 'teamA' ? 'teamB' : 'teamA';
    const otherTeamId = table[otherSlot];

    const teamPool = getTeamPool(teamId);
    const otherPool = otherTeamId ? getTeamPool(otherTeamId) : null;

    assignTableTeam(tableNum, slot, teamId);

    // If seated against a team from another pool, provide an informative alert notice
    if (otherPool && teamPool && otherPool !== teamPool) {
      const droppedTeam = getTeam(teamId);
      const otherTeam = getTeam(otherTeamId);
      setNotice({
        type: 'error',
        message: `⚠️ Table ${tableNum}: Cross-Pool Matchup (${droppedTeam?.name || 'Team'} [Pool ${teamPool}] vs ${otherTeam?.name || 'Team'} [Pool ${otherPool}]). Both pools will be credited.`,
      });
    } else {
      setNotice(null);
    }
  };

  // Open simplified modal to state winner and submit final scores
  const openScoreModal = (tableNum, winnerId) => {
    const tNum = Number(tableNum);
    const table = activeTables[tNum] || activeTables[tableNum] || {};
    if (!table?.teamA || !table?.teamB) return;

    const idA = typeof table.teamA === 'object' ? table.teamA?.id : table.teamA;
    const idB = typeof table.teamB === 'object' ? table.teamB?.id : table.teamB;

    const teamAObj = getTeam(idA) || { id: idA, name: idA };
    const teamBObj = getTeam(idB) || { id: idB, name: idB };
    const poolA = getTeamPool(idA) || 'A';
    const poolB = getTeamPool(idB) || 'A';

    const isWinnerA = winnerId === idA;
    setScoreModal({
      isOpen: true,
      tableNum: tNum,
      matchId: null,
      teamA: teamAObj,
      teamB: teamBObj,
      declaredWinnerId: winnerId || idA,
      scoreA: isWinnerA ? 200 : 100,
      scoreB: isWinnerA ? 100 : 200,
      poolA,
      poolB,
    });
  };

  // Open modal to edit existing match score
  const openEditModal = (match) => {
    const teamAObj = getTeam(match.teamA) || { id: match.teamA, name: match.teamA };
    const teamBObj = getTeam(match.teamB) || { id: match.teamB, name: match.teamB };
    const poolA = getTeamPool(match.teamA) || match.groupId || 'A';
    const poolB = getTeamPool(match.teamB) || match.groupId || 'A';

    setScoreModal({
      isOpen: true,
      tableNum: match.table || 1,
      matchId: match.id,
      teamA: teamAObj,
      teamB: teamBObj,
      declaredWinnerId: match.winner || match.teamA,
      scoreA: match.scoreA ?? 200,
      scoreB: match.scoreB ?? 100,
      poolA,
      poolB,
    });
  };

  const closeScoreModal = () => {
    setScoreModal((prev) => ({ ...prev, isOpen: false }));
  };

  // Switch declared winner inside the modal: winner is locked to 200, loser gets editable score
  const handleSwitchWinner = (newWinnerId) => {
    setScoreModal((prev) => {
      const isCurrentlyWinnerA = prev.declaredWinnerId === prev.teamA?.id;
      // Get the current loser score so we can preserve it as the new loser score (clamped to 199)
      const currentLoserScore = isCurrentlyWinnerA ? prev.scoreB : prev.scoreA;
      const nextLoserScore = currentLoserScore !== '' && currentLoserScore != null ? Math.min(199, Number(currentLoserScore)) : 100;

      const willBeWinnerA = newWinnerId === prev.teamA?.id;
      return {
        ...prev,
        declaredWinnerId: newWinnerId,
        scoreA: willBeWinnerA ? 200 : nextLoserScore,
        scoreB: willBeWinnerA ? nextLoserScore : 200,
      };
    });
  };

  // Submit scores from modal
  const handleSubmitModalScores = () => {
    try {
      const { tableNum, matchId, teamA, teamB, declaredWinnerId, scoreA, scoreB } = scoreModal;
      const tNum = Number(tableNum);
      const currentTable = activeTables[tNum] || activeTables[tableNum] || {};

      const idA = teamA?.id || currentTable.teamA;
      const idB = teamB?.id || currentTable.teamB;
      if (!idA || !idB) return;

      const teamAName = teamA?.name || getTeam(idA)?.name || 'Team A';
      const teamBName = teamB?.name || getTeam(idB)?.name || 'Team B';

      const isWinnerA = declaredWinnerId === idA;
      const numA = isWinnerA ? 200 : (scoreA !== '' && scoreA != null ? Math.min(199, Math.max(0, Number(scoreA))) : 100);
      const numB = !isWinnerA ? 200 : (scoreB !== '' && scoreB != null ? Math.min(199, Math.max(0, Number(scoreB))) : 100);
      const finalWinner = declaredWinnerId || (isWinnerA ? idA : idB);

      if (matchId) {
        updateMatchScore(matchId, {
          scoreA: numA,
          scoreB: numB,
          winner: finalWinner,
        });
      } else {
        recordOpenMatch(tNum, numA, numB, finalWinner, idA, idB);
      }
    } catch (err) {
      console.error('Error submitting match result:', err);
    } finally {
      closeScoreModal();
    }
  };

  // Calculate live diff preview inside modal
  const modalNumA = Number(scoreModal.scoreA) || 0;
  const modalNumB = Number(scoreModal.scoreB) || 0;
  const modalDiff = Math.abs(modalNumA - modalNumB);
  const modalWinnerObj =
    scoreModal.declaredWinnerId === scoreModal.teamA?.id ? scoreModal.teamA : scoreModal.teamB;
  const modalLoserObj =
    scoreModal.declaredWinnerId === scoreModal.teamA?.id ? scoreModal.teamB : scoreModal.teamA;
  const isModalCrossPool = scoreModal.poolA && scoreModal.poolB && scoreModal.poolA !== scoreModal.poolB;

  return (
    <div className="space-y-6">
      {/* ─── Top Control Bar: Title & Standings Menu Button ────────── */}
      <div className="flex items-center justify-between pb-3 border-b border-timber/15">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold uppercase tracking-wider text-timber">
            Group Stage
          </h1>
        </div>

        <button
          onClick={() => setShowStandings(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-bone border-2 border-timber/25 hover:border-felt rounded-xl font-mono text-xs font-bold text-timber hover:text-felt transition-all shadow-2xs cursor-pointer active:scale-95"
        >
          <BarChart3 size={15} className="text-felt" />
          <span>Standings</span>
        </button>
      </div>

      {/* ─── Feedback / Alert Banner ─────────────────────────────── */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`border rounded-xl p-3 flex items-start justify-between gap-3 text-xs font-mono shadow-xs ${
              notice.type === 'error'
                ? 'bg-terra/10 border-terra/30 text-terra'
                : 'bg-felt/10 border-felt/30 text-felt'
            }`}
          >
            <div className="flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
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

      {/* ─── Side-by-Side Workspace Layout ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ─── LEFT COLUMN: Live Matches / Tables (7 cols) ────────── */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-felt animate-pulse" />
              <h2 className="font-display text-base font-bold uppercase tracking-wider text-timber">
                Live Tables
              </h2>
              <span className="font-mono text-xs text-timber/50">
                ({tablesCount} {tablesCount === 1 ? 'Table' : 'Tables'})
              </span>
            </div>
          </div>

          <div
            className={
              tablesCount === 1
                ? 'space-y-4'
                : tablesCount === 2
                ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                : 'grid grid-cols-1 sm:grid-cols-2 gap-4'
            }
          >
            {tableSlots.map((tableNum) => {
              const table = activeTables[tableNum] || { teamA: null, teamB: null };
              const teamA = table.teamA ? getTeam(table.teamA) : null;
              const teamB = table.teamB ? getTeam(table.teamB) : null;
              const bothSeated = Boolean(teamA && teamB);

              const poolA = teamA ? getTeamPool(teamA.id) : null;
              const poolB = teamB ? getTeamPool(teamB.id) : null;
              const isCrossPool = Boolean(teamA && teamB && poolA && poolB && poolA !== poolB);
              const singleSeatedPool = poolA || poolB;

              const targetKeyA = `t${tableNum}-teamA`;
              const targetKeyB = `t${tableNum}-teamB`;
              const isDragOverA = dragOverTarget === targetKeyA;
              const isDragOverB = dragOverTarget === targetKeyB;

              // Check if currently dragging a team from a different pool over an occupied table
              const draggingPool = draggingTeamId ? getTeamPool(draggingTeamId) : null;
              const isDraggingCrossPoolA = Boolean(
                isDragOverA && poolB && draggingPool && poolB !== draggingPool
              );
              const isDraggingCrossPoolB = Boolean(
                isDragOverB && poolA && draggingPool && poolA !== draggingPool
              );

              return (
                <div
                  key={`table-arena-${tableNum}`}
                  className={`border-2 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between transition-all ${
                    isCrossPool
                      ? 'border-terra bg-terra/5 ring-2 ring-terra/30'
                      : 'border-timber bg-bone'
                  }`}
                >
                  {/* Table Header Bar */}
                  <div
                    className={`px-3.5 py-2 flex items-center justify-between text-bone transition-colors ${
                      isCrossPool ? 'bg-terra' : 'bg-felt'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs uppercase tracking-widest font-bold">
                        Table {tableNum}
                      </span>

                      {/* Header Badge: Highlights in Red if Cross-Pool */}
                      {isCrossPool ? (
                        <span className="bg-bone text-terra font-mono text-[10px] font-bold px-1.5 py-0.5 rounded uppercase flex items-center gap-1 shadow-2xs">
                          <AlertTriangle size={11} className="shrink-0" />
                          <span>Cross-Pool: [{poolA}] vs [{poolB}]</span>
                        </span>
                      ) : singleSeatedPool ? (
                        <div className="flex items-center gap-1">
                          {renderPoolBadge(singleSeatedPool)}
                        </div>
                      ) : (
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold bg-bone/20 text-bone">
                          Open
                        </span>
                      )}
                    </div>

                    {isAdmin && (teamA || teamB) && (
                      <div className="flex items-center gap-1">
                        {bothSeated && (
                          <button
                            onClick={() => swapTableTeams(tableNum)}
                            title="Swap Sides"
                            className="p-1 hover:bg-bone/20 rounded text-bone transition-colors cursor-pointer"
                          >
                            <ArrowRightLeft size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => clearTable(tableNum)}
                          title="Clear Table"
                          className="p-1 hover:bg-black/30 rounded text-bone transition-colors cursor-pointer"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Cross-Pool Visual Alert Banner */}
                  {isCrossPool && (
                    <div className="bg-terra/15 border-b border-terra/30 px-3 py-1.5 flex items-center justify-center gap-1.5 text-terra font-mono text-[10px] font-bold">
                      <AlertCircle size={12} className="shrink-0" />
                      <span>Warning: Teams are from different pools</span>
                    </div>
                  )}

                  {/* Matchup Drop Zones */}
                  <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-center">
                    {/* Slot A */}
                    <div
                      onDragOver={(e) => handleDragOver(e, tableNum, 'teamA')}
                      onDragLeave={() => handleDragLeave(targetKeyA)}
                      onDrop={(e) => handleDrop(e, tableNum, 'teamA')}
                      className={`border-2 rounded-xl p-2.5 transition-all ${
                        isDraggingCrossPoolA
                          ? 'border-terra bg-terra/20 border-dashed scale-[1.01]'
                          : isDragOverA
                          ? 'border-felt bg-felt/15 border-dashed scale-[1.01]'
                          : teamA
                          ? isCrossPool
                            ? 'border-terra/30 bg-terra/10'
                            : 'border-timber/15 bg-bone-dark/25'
                          : 'border-timber/15 border-dashed bg-bone-dark/10 hover:border-timber/30'
                      }`}
                    >
                      {isDraggingCrossPoolA ? (
                        <div className="py-1 text-center text-terra font-mono text-[11px] font-bold">
                          ⚠️ Drop for Cross-Pool Match ([{poolB}] vs [{draggingPool}])
                        </div>
                      ) : teamA ? (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {renderPoolBadge(poolA)}
                            <div>
                              <span className="font-display text-sm font-bold uppercase text-timber block leading-tight">
                                {teamA.name}
                              </span>
                              <p className="font-mono text-[10px] text-timber/50 truncate max-w-[150px]">
                                {teamA.player1} & {teamA.player2}
                              </p>
                            </div>
                          </div>
                          {isAdmin && (
                            <button
                              onClick={() => removeTableTeam(tableNum, 'teamA')}
                              className="p-1 text-timber/30 hover:text-terra hover:bg-terra/10 rounded transition-colors cursor-pointer"
                              title="Remove"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="py-1 text-center">
                          <p className="font-mono text-[11px] text-timber/40">
                            {poolB ? `Drop team to play [Pool ${poolB}]` : 'Drop Team A'}
                          </p>
                          {isAdmin && allStandbyTeams.length > 0 && (
                            <div className="mt-1">
                              <select
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) assignTableTeam(tableNum, 'teamA', e.target.value);
                                }}
                                className="text-[10px] font-mono bg-bone border border-timber/20 rounded px-1.5 py-0.5 text-timber cursor-pointer max-w-full"
                              >
                                <option value="" disabled>
                                  Select team...
                                </option>
                                {allStandbyTeams.map((t) => {
                                  const tPool = getTeamPool(t.id);
                                  const isMismatched = poolB && tPool !== poolB;
                                  return (
                                    <option key={t.id} value={t.id}>
                                      [{tPool}] {t.name} {isMismatched ? '⚠️ (Cross-Pool)' : ''}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* VS Divider */}
                    <div className="flex items-center gap-2 py-0.5">
                      <div className="flex-1 h-px bg-timber/15" />
                      <span className="font-display text-[11px] text-timber/30 font-bold tracking-widest">
                        VS
                      </span>
                      <div className="flex-1 h-px bg-timber/15" />
                    </div>

                    {/* Slot B */}
                    <div
                      onDragOver={(e) => handleDragOver(e, tableNum, 'teamB')}
                      onDragLeave={() => handleDragLeave(targetKeyB)}
                      onDrop={(e) => handleDrop(e, tableNum, 'teamB')}
                      className={`border-2 rounded-xl p-2.5 transition-all ${
                        isDraggingCrossPoolB
                          ? 'border-terra bg-terra/20 border-dashed scale-[1.01]'
                          : isDragOverB
                          ? 'border-felt bg-felt/15 border-dashed scale-[1.01]'
                          : teamB
                          ? isCrossPool
                            ? 'border-terra/30 bg-terra/10'
                            : 'border-timber/15 bg-bone-dark/25'
                          : 'border-timber/15 border-dashed bg-bone-dark/10 hover:border-timber/30'
                      }`}
                    >
                      {isDraggingCrossPoolB ? (
                        <div className="py-1 text-center text-terra font-mono text-[11px] font-bold">
                          ⚠️ Drop for Cross-Pool Match ([{poolA}] vs [{draggingPool}])
                        </div>
                      ) : teamB ? (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {renderPoolBadge(poolB)}
                            <div>
                              <span className="font-display text-sm font-bold uppercase text-timber block leading-tight">
                                {teamB.name}
                              </span>
                              <p className="font-mono text-[10px] text-timber/50 truncate max-w-[150px]">
                                {teamB.player1} & {teamB.player2}
                              </p>
                            </div>
                          </div>
                          {isAdmin && (
                            <button
                              onClick={() => removeTableTeam(tableNum, 'teamB')}
                              className="p-1 text-timber/30 hover:text-terra hover:bg-terra/10 rounded transition-colors cursor-pointer"
                              title="Remove"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="py-1 text-center">
                          <p className="font-mono text-[11px] text-timber/40">
                            {poolA ? `Drop team to play [Pool ${poolA}]` : 'Drop Team B'}
                          </p>
                          {isAdmin && allStandbyTeams.length > 0 && (
                            <div className="mt-1">
                              <select
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) assignTableTeam(tableNum, 'teamB', e.target.value);
                                }}
                                className="text-[10px] font-mono bg-bone border border-timber/20 rounded px-1.5 py-0.5 text-timber cursor-pointer max-w-full"
                              >
                                <option value="" disabled>
                                  Select team...
                                </option>
                                {allStandbyTeams.map((t) => {
                                  const tPool = getTeamPool(t.id);
                                  const isMismatched = poolA && tPool !== poolA;
                                  return (
                                    <option key={t.id} value={t.id}>
                                      [{tPool}] {t.name} {isMismatched ? '⚠️ (Cross-Pool)' : ''}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Winner Action Section */}
                  {bothSeated && isAdmin && (
                    <div className="p-3 bg-bone-dark/30 border-t border-timber/15 space-y-2">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-timber/50 font-bold text-center">
                        Who won? Click to submit score:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => openScoreModal(tableNum, teamA.id)}
                          className={`px-2 py-2 rounded-lg font-display text-xs uppercase font-bold tracking-wider active:scale-95 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                            isCrossPool
                              ? 'bg-terra text-bone hover:bg-terra-light'
                              : 'bg-felt text-bone hover:bg-felt-light'
                          }`}
                        >
                          <Trophy size={13} className="text-brass shrink-0" />
                          <span className="truncate">{teamA.name}</span>
                        </button>

                        <button
                          onClick={() => openScoreModal(tableNum, teamB.id)}
                          className={`px-2 py-2 rounded-lg font-display text-xs uppercase font-bold tracking-wider active:scale-95 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                            isCrossPool
                              ? 'bg-terra text-bone hover:bg-terra-light'
                              : 'bg-felt text-bone hover:bg-felt-light'
                          }`}
                        >
                          <Trophy size={13} className="text-brass shrink-0" />
                          <span className="truncate">{teamB.name}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── RIGHT COLUMN: Standby Teams (5 cols) ────────────────── */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-bold uppercase tracking-wider text-timber">
                Standby Teams
              </h2>
              <span className="font-mono text-xs text-timber/50">
                ({allStandbyTeams.length})
              </span>
            </div>

            {/* Quick Pool Filter Tabs if multiple pools */}
            {groupLabels.length > 1 && (
              <div className="flex items-center gap-1 bg-bone-dark/40 border border-timber/15 p-0.5 rounded-lg">
                <button
                  onClick={() => setStandbyPoolFilter('ALL')}
                  className={`px-2 py-0.5 font-mono text-[10px] rounded font-bold cursor-pointer transition-colors ${
                    standbyPoolFilter === 'ALL'
                      ? 'bg-timber text-bone'
                      : 'text-timber/60 hover:text-timber'
                  }`}
                >
                  All
                </button>
                {groupLabels.map((gid) => (
                  <button
                    key={`filter-${gid}`}
                    onClick={() => setStandbyPoolFilter(gid)}
                    className={`px-1.5 py-0.5 font-mono text-[10px] rounded font-bold cursor-pointer transition-colors ${
                      standbyPoolFilter === gid
                        ? 'bg-timber text-bone'
                        : 'text-timber/60 hover:text-timber'
                    }`}
                  >
                    {gid}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Standby Teams List */}
          <div className="border-2 border-timber bg-bone rounded-2xl p-3 shadow-xs space-y-2 max-h-[620px] overflow-y-auto">
            {filteredStandbyTeams.length === 0 ? (
              <div className="py-8 text-center font-mono text-xs text-timber/40 italic">
                No standby teams available.
              </div>
            ) : (
              filteredStandbyTeams.map((team) => {
                const pool = getTeamPool(team.id) || 'A';
                const st = groupStandingsMap.get(team.id) || {
                  rank: '-',
                  played: 0,
                  wins: 0,
                  losses: 0,
                  diff: 0,
                };

                return (
                  <div
                    key={`standby-card-${team.id}`}
                    draggable={isAdmin}
                    onDragStart={(e) => handleDragStart(e, team.id)}
                    onDragEnd={handleDragEnd}
                    className={`border border-timber/15 bg-bone rounded-xl p-2.5 flex items-center justify-between gap-2.5 shadow-2xs transition-all ${
                      isAdmin
                        ? 'cursor-grab active:cursor-grabbing hover:border-felt hover:shadow-xs'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isAdmin && (
                        <GripVertical
                          size={13}
                          className="text-timber/30 shrink-0 cursor-grab"
                        />
                      )}

                      {/* Pool letter badge */}
                      {renderPoolBadge(pool)}

                      <div className="min-w-0">
                        <span className="font-display text-sm font-bold uppercase text-timber leading-tight block truncate">
                          {team.name}
                        </span>
                        <p className="font-mono text-[10px] text-timber/40 truncate">
                          {team.player1} & {team.player2}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      {/* Record */}
                      <div className="text-right font-mono text-xs">
                        <span className="font-bold text-timber">
                          {st.wins}W–{st.losses}L
                        </span>
                      </div>

                      {/* Quick seat buttons: shows on any open table with warning if cross-pool */}
                      {isAdmin && (
                        <div className="flex gap-1">
                          {tableSlots.map((num) => {
                            const table = activeTables[num] || {};
                            const hasOpenSlot = !table.teamA || !table.teamB;
                            if (!hasOpenSlot) return null;

                            const tablePool = getTablePool(num);
                            const isCrossSeat = Boolean(tablePool && tablePool !== pool);
                            const slot = !table.teamA ? 'teamA' : 'teamB';

                            return (
                              <button
                                key={`seat-${team.id}-t${num}`}
                                onClick={() => assignTableTeam(num, slot, team.id)}
                                className={`py-1 px-1.5 rounded font-mono text-[10px] uppercase font-bold transition-all cursor-pointer ${
                                  isCrossSeat
                                    ? 'bg-terra/10 hover:bg-terra hover:text-bone text-terra border border-terra/30'
                                    : 'bg-felt/10 hover:bg-felt hover:text-bone text-felt border border-felt/20'
                                }`}
                                title={
                                  isCrossSeat
                                    ? `Seat at Table ${num} (⚠️ Cross-Pool Matchup)`
                                    : `Seat at Table ${num}`
                                }
                              >
                                → T{num}{isCrossSeat ? ' ⚠️' : ''}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ─── Match History Log ───────────────────────────────────── */}
      {completedMatches.length > 0 && (
        <div className="border-2 border-timber bg-bone rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-timber">
              Completed Matches ({completedMatches.length})
            </h3>
          </div>

          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {completedMatches.map((m) => {
              const teamA = getTeam(m.teamA);
              const teamB = getTeam(m.teamB);
              const isWinnerA = m.winner === m.teamA;
              const isWinnerB = m.winner === m.teamB;
              const hasScore = m.scoreA != null && m.scoreB != null;
              const diff = hasScore ? Math.abs(Number(m.scoreA) - Number(m.scoreB)) : null;
              const winnerName = isWinnerA ? teamA?.name : teamB?.name;
              const poolA = getTeamPool(m.teamA) || m.groupId || 'A';
              const poolB = getTeamPool(m.teamB) || m.groupId || 'A';
              const isCross = poolA !== poolB;

              return (
                <div
                  key={m.id}
                  className={`border rounded-xl p-2 flex items-center justify-between gap-3 text-xs transition-colors ${
                    isCross ? 'border-terra/30 bg-terra/5' : 'border-timber/15 bg-bone-dark/15'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-timber/10 text-timber/60">
                      T{m.table || '1'}
                    </span>

                    {/* Pools indicator */}
                    {isCross ? (
                      <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded font-bold bg-terra text-bone">
                        {poolA} vs {poolB}
                      </span>
                    ) : (
                      renderPoolBadge(poolA)
                    )}

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-display uppercase font-bold text-xs ${
                          isWinnerA ? 'text-felt underline decoration-2' : 'text-timber/60'
                        }`}
                      >
                        {teamA?.name || m.teamA}
                      </span>
                      {hasScore && (
                        <span className="font-mono text-xs font-bold bg-bone px-1.5 py-0.5 rounded border border-timber/15">
                          {m.scoreA} – {m.scoreB}
                        </span>
                      )}
                      <span
                        className={`font-display uppercase font-bold text-xs ${
                          isWinnerB ? 'text-felt underline decoration-2' : 'text-timber/60'
                        }`}
                      >
                        {teamB?.name || m.teamB}
                      </span>
                    </div>

                    {diff != null && diff > 0 && (
                      <span className="font-mono text-[10px] text-felt font-bold bg-felt/10 px-1.5 py-0.2 rounded">
                        +{diff} diff for {winnerName}
                      </span>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(m)}
                        className="p-1 text-timber/40 hover:text-timber hover:bg-timber/10 rounded transition-colors cursor-pointer"
                        title="Edit Score"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this match record? Standings will be recalculated.')) {
                            deleteMatch(m.id);
                          }
                        }}
                        className="p-1 text-timber/40 hover:text-terra hover:bg-terra/10 rounded transition-colors cursor-pointer"
                        title="Delete Match"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Standings Slideout Menu / Drawer ─────────────────────── */}
      <AnimatePresence>
        {showStandings && (
          <div className="fixed inset-0 z-50 flex justify-end bg-timber/60 backdrop-blur-2xs">
            <div
              className="absolute inset-0"
              onClick={() => setShowStandings(false)}
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl bg-bone border-l-2 border-timber shadow-2xl h-full flex flex-col justify-between overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="bg-felt text-bone px-5 py-4 flex items-center justify-between border-b border-bone/10">
                <div className="flex items-center gap-2.5">
                  <BarChart3 size={20} className="text-brass" />
                  <h2 className="font-display text-base font-bold uppercase tracking-wider text-bone leading-tight">
                    Pool Standings
                  </h2>
                </div>

                <button
                  onClick={() => setShowStandings(false)}
                  className="p-1.5 rounded-lg hover:bg-bone/20 text-bone transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Body: Standings Tables */}
              <div className="p-5 flex-1 overflow-y-auto space-y-6">
                {groupLabels.map((gid) => (
                  <div key={`drawer-pool-${gid}`}>
                    <TVStandingsTable groupId={gid} />
                  </div>
                ))}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 bg-bone-dark/40 border-t border-timber/15 flex justify-end">
                <button
                  onClick={() => setShowStandings(false)}
                  className="px-5 py-2 bg-felt text-bone rounded-xl font-display text-xs uppercase font-bold tracking-wider hover:bg-felt-light transition-all cursor-pointer shadow-xs"
                >
                  Close Menu
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Simplified Score Submission Popup / Modal ───────────── */}
      <AnimatePresence>
        {scoreModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-timber/70 backdrop-blur-2xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`bg-bone border-2 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden ${
                isModalCrossPool ? 'border-terra' : 'border-timber'
              }`}
            >
              {/* Modal Header */}
              <div
                className={`px-5 py-3.5 flex items-center justify-between text-bone ${
                  isModalCrossPool ? 'bg-terra' : 'bg-felt'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Trophy size={16} className="text-brass" />
                  <span className="font-display text-sm md:text-base uppercase tracking-wider font-bold">
                    {scoreModal.matchId ? 'Edit Match Scores' : `Table ${scoreModal.tableNum} Result`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isModalCrossPool ? (
                    <span className="font-mono text-[10px] uppercase font-bold bg-bone text-terra px-2 py-0.5 rounded">
                      [{scoreModal.poolA}] vs [{scoreModal.poolB}]
                    </span>
                  ) : (
                    renderPoolBadge(scoreModal.poolA)
                  )}
                  <button
                    onClick={closeScoreModal}
                    className="p-1 hover:bg-bone/20 rounded text-bone transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4">
                {/* Cross-Pool Notice in Modal */}
                {isModalCrossPool && (
                  <div className="bg-terra/10 border border-terra/30 rounded-xl p-2.5 text-terra font-mono text-[10px] flex items-center gap-2 font-bold">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>Cross-Pool Match: Scores will credit both teams to their respective pool standings!</span>
                  </div>
                )}

                {/* Winner Declaration Banner */}
                <div className="bg-felt/10 border border-felt/20 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 size={16} className="text-felt shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-timber/50 block font-bold">
                        Winner Declared:
                      </span>
                      <span className="font-display text-sm font-bold uppercase text-felt truncate block">
                        {modalWinnerObj?.name}
                      </span>
                    </div>
                  </div>

                  {/* Sleek switch winner pill toggle */}
                  <button
                    type="button"
                    onClick={() => handleSwitchWinner(modalLoserObj?.id)}
                    className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bone border border-timber/25 hover:border-felt hover:bg-felt/10 text-timber hover:text-felt transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0"
                    title={`Switch declared winner to ${modalLoserObj?.name}`}
                  >
                    <ArrowRightLeft size={13} className="text-brass group-hover:rotate-180 transition-transform duration-300 shrink-0" />
                    <span className="font-mono text-[11px] font-semibold tracking-wide">
                      Switch to <span className="font-display font-bold uppercase underline decoration-timber/40 group-hover:decoration-felt">{modalLoserObj?.name}</span>
                    </span>
                  </button>
                </div>

                {/* Score Input Fields: Winner Locked to 200, Loser Editable (0-199) */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Team A Card */}
                  <div
                    className={`border-2 rounded-xl p-3 text-center transition-all ${
                      scoreModal.declaredWinnerId === scoreModal.teamA?.id
                        ? 'border-felt bg-felt/5'
                        : 'border-timber/20 bg-bone-dark/20'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <span className="font-display text-xs font-bold uppercase text-timber truncate max-w-[120px]">
                        {scoreModal.teamA?.name}
                      </span>
                      {scoreModal.declaredWinnerId === scoreModal.teamA?.id && (
                        <span className="text-[8px] font-mono font-bold bg-felt text-bone px-1 rounded">
                          WIN
                        </span>
                      )}
                    </div>

                    {scoreModal.declaredWinnerId === scoreModal.teamA?.id ? (
                      <div>
                        <input
                          type="text"
                          readOnly
                          value="200"
                          className="w-full bg-felt/10 border-2 border-felt/40 rounded-lg py-1.5 font-mono text-2xl font-bold text-center text-felt cursor-not-allowed select-none"
                        />
                      </div>
                    ) : (
                      <div>
                        <input
                          type="number"
                          min="0"
                          max="199"
                          placeholder="0-199"
                          value={scoreModal.scoreA}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === '') {
                              setScoreModal((prev) => ({ ...prev, scoreA: '' }));
                              return;
                            }
                            const clamped = Math.min(199, Math.max(0, Number(raw)));
                            setScoreModal((prev) => ({ ...prev, scoreA: clamped }));
                          }}
                          className="w-full bg-bone border-2 border-timber/25 focus:border-felt rounded-lg py-1.5 font-mono text-2xl font-bold text-center text-timber focus:outline-none"
                        />
                      </div>
                    )}
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
                      <span className="font-display text-xs font-bold uppercase text-timber truncate max-w-[120px]">
                        {scoreModal.teamB?.name}
                      </span>
                      {scoreModal.declaredWinnerId === scoreModal.teamB?.id && (
                        <span className="text-[8px] font-mono font-bold bg-felt text-bone px-1 rounded">
                          WIN
                        </span>
                      )}
                    </div>

                    {scoreModal.declaredWinnerId === scoreModal.teamB?.id ? (
                      <div>
                        <input
                          type="text"
                          readOnly
                          value="200"
                          className="w-full bg-felt/10 border-2 border-felt/40 rounded-lg py-1.5 font-mono text-2xl font-bold text-center text-felt cursor-not-allowed select-none"
                        />
                      </div>
                    ) : (
                      <div>
                        <input
                          type="number"
                          min="0"
                          max="199"
                          placeholder="0-199"
                          value={scoreModal.scoreB}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === '') {
                              setScoreModal((prev) => ({ ...prev, scoreB: '' }));
                              return;
                            }
                            const clamped = Math.min(199, Math.max(0, Number(raw)));
                            setScoreModal((prev) => ({ ...prev, scoreB: clamped }));
                          }}
                          className="w-full bg-bone border-2 border-timber/25 focus:border-felt rounded-lg py-1.5 font-mono text-2xl font-bold text-center text-timber focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Point Differential Preview Box */}
                <div className="border border-timber/15 bg-bone-dark/20 rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-timber/60 font-semibold">Point Differential:</span>
                    <span className="font-bold text-felt">
                      +{modalDiff}
                    </span>
                  </div>

                  <div className="text-[11px] font-mono grid grid-cols-2 gap-2 pt-0.5">
                    <div className="bg-felt/10 rounded px-2 py-1 text-felt font-bold truncate">
                      {modalWinnerObj?.name}: +{modalDiff} diff
                    </div>
                    <div className="bg-terra/10 rounded px-2 py-1 text-terra font-bold truncate">
                      {modalLoserObj?.name}: -{modalDiff} diff
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-bone-dark/40 px-5 py-3 border-t border-timber/15 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeScoreModal}
                  className="px-3 py-1.5 border border-timber/20 rounded-xl font-mono text-xs font-semibold text-timber hover:bg-bone transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSubmitModalScores}
                  className="px-5 py-2 bg-felt text-bone font-display text-xs uppercase tracking-wider font-bold rounded-xl hover:bg-felt-light shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <CheckCircle2 size={16} className="text-brass" />
                  <span>Submit</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
