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
  Filter,
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

  // Score submission / edit modal state (simplified: no fast presets)
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

  // All standby teams across pools, sorted by fewest games played, then record
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
      // Sort by pool letter first if viewing ALL, or by games played
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

  // Helper to determine a table's locked pool
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

  // Drag & drop handlers
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

    // Intra-pool validation
    if (tablePool && teamPool && tablePool !== teamPool) {
      const droppedTeam = getTeam(teamId);
      setNotice({
        type: 'error',
        message: `Pool Mismatch: Table ${tableNum} is locked to Pool ${tablePool}. ${droppedTeam?.name || 'This team'} is in Pool ${teamPool}.`,
      });
      return;
    }

    setNotice(null);
    assignTableTeam(tableNum, slot, teamId);
  };

  // Open simplified modal to state winner and submit final scores
  const openScoreModal = (tableNum, winnerId) => {
    const table = activeTables[tableNum];
    if (!table?.teamA || !table?.teamB) return;

    const teamAObj = getTeam(table.teamA);
    const teamBObj = getTeam(table.teamB);
    const pool = getTeamPool(table.teamA) || 'A';

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
      updateMatchScore(matchId, {
        scoreA: numA,
        scoreB: numB,
        winner: finalWinnerId,
      });
      setNotice({
        type: 'success',
        message: `Updated scores: ${teamA.name} ${numA} – ${numB} ${teamB.name}`,
      });
    } else {
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
          <span className="font-mono text-[10px] bg-timber/10 px-1.5 py-0.2 rounded text-timber/60 font-semibold">
            {groupLabels.length} {groupLabels.length === 1 ? 'Pool' : 'Pools'}
          </span>
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
      {/* Left: Live Matches / Tables | Right: Standby Teams */}
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

              const tablePool = getTablePool(tableNum);
              const poolA = teamA ? getTeamPool(teamA.id) : null;
              const poolB = teamB ? getTeamPool(teamB.id) : null;

              const targetKeyA = `t${tableNum}-teamA`;
              const targetKeyB = `t${tableNum}-teamB`;
              const isDragOverA = dragOverTarget === targetKeyA;
              const isDragOverB = dragOverTarget === targetKeyB;
              const isForbiddenA = dragOverTarget === `${targetKeyA}-forbidden`;
              const isForbiddenB = dragOverTarget === `${targetKeyB}-forbidden`;

              const allowedStandbyA = tablePool
                ? allStandbyTeams.filter((t) => getTeamPool(t.id) === tablePool && t.id !== table.teamB)
                : allStandbyTeams;

              const allowedStandbyB = tablePool
                ? allStandbyTeams.filter((t) => getTeamPool(t.id) === tablePool && t.id !== table.teamA)
                : allStandbyTeams;

              return (
                <div
                  key={`table-arena-${tableNum}`}
                  className="border-2 border-timber bg-bone rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between"
                >
                  {/* Table Header Bar */}
                  <div className="bg-felt text-bone px-3.5 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs uppercase tracking-widest font-bold">
                        Table {tableNum}
                      </span>

                      {/* Pool letter badge */}
                      {tablePool ? (
                        <div className="flex items-center gap-1">
                          {renderPoolBadge(tablePool)}
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
                          className="p-1 hover:bg-terra/40 rounded text-bone transition-colors cursor-pointer"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Matchup Drop Zones */}
                  <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-center">
                    {/* Slot A */}
                    <div
                      onDragOver={(e) => handleDragOver(e, tableNum, 'teamA')}
                      onDragLeave={() => handleDragLeave(targetKeyA)}
                      onDrop={(e) => handleDrop(e, tableNum, 'teamA')}
                      className={`border-2 rounded-xl p-2.5 transition-all ${
                        isForbiddenA
                          ? 'border-terra bg-terra/15 border-dashed'
                          : isDragOverA
                          ? 'border-felt bg-felt/15 border-dashed scale-[1.01]'
                          : teamA
                          ? 'border-timber/15 bg-bone-dark/25'
                          : 'border-timber/15 border-dashed bg-bone-dark/10 hover:border-timber/30'
                      }`}
                    >
                      {isForbiddenA ? (
                        <div className="py-2 text-center text-terra font-mono text-xs font-bold">
                          ❌ Pool Mismatch ({tablePool} only)
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
                            {tablePool ? `Drop Pool ${tablePool} team` : 'Drop Team A'}
                          </p>
                          {isAdmin && allowedStandbyA.length > 0 && (
                            <div className="mt-1">
                              <select
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) assignTableTeam(tableNum, 'teamA', e.target.value);
                                }}
                                className="text-[10px] font-mono bg-bone border border-timber/20 rounded px-1.5 py-0.5 text-timber cursor-pointer"
                              >
                                <option value="" disabled>
                                  Select team...
                                </option>
                                {allowedStandbyA.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    [{getTeamPool(t.id)}] {t.name}
                                  </option>
                                ))}
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
                        isForbiddenB
                          ? 'border-terra bg-terra/15 border-dashed'
                          : isDragOverB
                          ? 'border-felt bg-felt/15 border-dashed scale-[1.01]'
                          : teamB
                          ? 'border-timber/15 bg-bone-dark/25'
                          : 'border-timber/15 border-dashed bg-bone-dark/10 hover:border-timber/30'
                      }`}
                    >
                      {isForbiddenB ? (
                        <div className="py-2 text-center text-terra font-mono text-xs font-bold">
                          ❌ Pool Mismatch ({tablePool} only)
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
                            {tablePool ? `Drop Pool ${tablePool} team` : 'Drop Team B'}
                          </p>
                          {isAdmin && allowedStandbyB.length > 0 && (
                            <div className="mt-1">
                              <select
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) assignTableTeam(tableNum, 'teamB', e.target.value);
                                }}
                                className="text-[10px] font-mono bg-bone border border-timber/20 rounded px-1.5 py-0.5 text-timber cursor-pointer"
                              >
                                <option value="" disabled>
                                  Select team...
                                </option>
                                {allowedStandbyB.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    [{getTeamPool(t.id)}] {t.name}
                                  </option>
                                ))}
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
                          className="px-2 py-2 bg-felt text-bone rounded-lg font-display text-xs uppercase font-bold tracking-wider hover:bg-felt-light active:scale-95 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer text-center"
                        >
                          <Trophy size={13} className="text-brass shrink-0" />
                          <span className="truncate">{teamA.name}</span>
                        </button>

                        <button
                          onClick={() => openScoreModal(tableNum, teamB.id)}
                          className="px-2 py-2 bg-felt text-bone rounded-lg font-display text-xs uppercase font-bold tracking-wider hover:bg-felt-light active:scale-95 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer text-center"
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

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Record & Diff */}
                      <div className="text-right font-mono text-[11px]">
                        <span className="font-bold text-timber block leading-tight">
                          {st.wins}W–{st.losses}L
                        </span>
                        <span
                          className={`text-[9px] font-bold block ${
                            st.diff > 0
                              ? 'text-felt'
                              : st.diff < 0
                              ? 'text-terra'
                              : 'text-timber/40'
                          }`}
                        >
                          {st.diff > 0 ? `+${st.diff}` : st.diff} diff
                        </span>
                      </div>

                      {/* Quick seat buttons: only for tables accepting this pool */}
                      {isAdmin && (
                        <div className="flex gap-1">
                          {tableSlots.map((num) => {
                            const table = activeTables[num] || {};
                            const hasOpenSlot = !table.teamA || !table.teamB;
                            if (!hasOpenSlot) return null;

                            const tablePool = getTablePool(num);
                            if (tablePool && tablePool !== pool) return null;

                            const slot = !table.teamA ? 'teamA' : 'teamB';

                            return (
                              <button
                                key={`seat-${team.id}-t${num}`}
                                onClick={() => assignTableTeam(num, slot, team.id)}
                                className="py-1 px-1.5 bg-felt/10 hover:bg-felt hover:text-bone text-felt border border-felt/20 rounded font-mono text-[10px] uppercase font-bold transition-all cursor-pointer"
                                title={`Seat at Table ${num}`}
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
            <span className="font-mono text-[11px] text-timber/50">
              Rankings sort by Wins, then Point Differential (±)
            </span>
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
              const pool = m.groupId || getTeamPool(m.teamA) || 'A';

              return (
                <div
                  key={m.id}
                  className="border border-timber/15 rounded-xl p-2 bg-bone-dark/15 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-timber/10 text-timber/60">
                      T{m.table || '1'}
                    </span>

                    {renderPoolBadge(pool)}

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
            {/* Backdrop click to close */}
            <div
              className="absolute inset-0"
              onClick={() => setShowStandings(false)}
            />

            {/* Slideout Panel */}
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
                  <div>
                    <h2 className="font-display text-base font-bold uppercase tracking-wider text-bone leading-tight">
                      Pool Standings
                    </h2>
                    <p className="font-mono text-[11px] text-bone/60">
                      Ranked by Wins, then Point Differential (±)
                    </p>
                  </div>
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
              className="bg-bone border-2 border-timber rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-felt text-bone px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy size={16} className="text-brass" />
                  <span className="font-display text-sm md:text-base uppercase tracking-wider font-bold">
                    {scoreModal.matchId ? 'Edit Match Scores' : `Table ${scoreModal.tableNum} Result`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {renderPoolBadge(scoreModal.pool)}
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
                {/* Winner Declaration Banner */}
                <div className="bg-felt/10 border border-felt/20 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-felt shrink-0" />
                    <div>
                      <span className="text-[9px] font-mono uppercase tracking-wider text-timber/50 block font-bold">
                        Winner Declared:
                      </span>
                      <span className="font-display text-sm font-bold uppercase text-felt">
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
                    className="text-[10px] font-mono text-timber/70 hover:text-felt underline cursor-pointer shrink-0"
                  >
                    Switch to {modalLoserObj?.name} ⇄
                  </button>
                </div>

                {/* Score Input Fields */}
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

                    <input
                      type="number"
                      min="0"
                      max="999"
                      value={scoreModal.scoreA}
                      onChange={(e) =>
                        setScoreModal((prev) => ({ ...prev, scoreA: e.target.value }))
                      }
                      className="w-full bg-bone border-2 border-timber/25 focus:border-felt rounded-lg py-1.5 font-mono text-2xl font-bold text-center text-timber focus:outline-none"
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
                      <span className="font-display text-xs font-bold uppercase text-timber truncate max-w-[120px]">
                        {scoreModal.teamB?.name}
                      </span>
                      {scoreModal.declaredWinnerId === scoreModal.teamB?.id && (
                        <span className="text-[8px] font-mono font-bold bg-felt text-bone px-1 rounded">
                          WIN
                        </span>
                      )}
                    </div>

                    <input
                      type="number"
                      min="0"
                      max="999"
                      value={scoreModal.scoreB}
                      onChange={(e) =>
                        setScoreModal((prev) => ({ ...prev, scoreB: e.target.value }))
                      }
                      className="w-full bg-bone border-2 border-timber/25 focus:border-felt rounded-lg py-1.5 font-mono text-2xl font-bold text-center text-timber focus:outline-none"
                    />
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
                  className="px-4 py-2 bg-felt text-bone font-display text-xs uppercase tracking-wider font-bold rounded-xl hover:bg-felt-light shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 size={15} className="text-brass" />
                  <span>Save Scores</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
