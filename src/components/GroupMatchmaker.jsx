import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
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
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
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
    generateKnockout,
  } = useTournament();

  const isAdmin = useAdminStatus();
  const tablesCount = Math.max(1, state.tablesCount || 2);
  const activeTables = state.activeTables || {};
  const groups = state.groups || {};
  const groupLabels = Object.keys(groups).sort();

  // Local state for score inputs & drag-over targets
  const [scores, setScores] = useState({});
  const [dragOverTarget, setDragOverTarget] = useState(null); // 't1-teamA', etc.

  // Standings per group
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

  // Determine which teams are currently seated at any table
  const seatedTeamIds = useMemo(() => {
    const set = new Set();
    Object.values(activeTables).forEach((t) => {
      if (t?.teamA) set.add(t.teamA);
      if (t?.teamB) set.add(t.teamB);
    });
    return set;
  }, [activeTables]);

  const getTeam = (id) => state.teams.find((t) => t.id === id);

  // Group teams for standby by their pool
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
          // Prioritize fewer games played to balance table time
          if (stA.played !== stB.played) return stA.played - stB.played;
          if (stB.wins !== stA.wins) return stB.wins - stA.wins;
          if (stB.diff !== stA.diff) return stB.diff - stA.diff;
          return a.name.localeCompare(b.name);
        });
    }
    return result;
  }, [groupLabels, groups, state.teams, seatedTeamIds, groupStandingsMap]);

  // All standby teams across all groups
  const allStandbyTeams = useMemo(() => {
    return Object.values(standbyByGroup).flat();
  }, [standbyByGroup]);

  // Recent completed matches
  const completedMatches = useMemo(() => {
    return (state.matches || [])
      .filter((m) => m.winner)
      .slice()
      .reverse();
  }, [state.matches]);

  const tableSlots = Array.from({ length: tablesCount }, (_, i) => i + 1);

  // Drag & drop handlers
  const handleDragStart = (e, teamId) => {
    e.dataTransfer.setData('text/plain', teamId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, targetKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
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
    const teamId = e.dataTransfer.getData('text/plain');
    if (teamId) {
      assignTableTeam(tableNum, slot, teamId);
    }
  };

  const handleScoreChange = (tableNum, slot, val) => {
    setScores((prev) => ({
      ...prev,
      [tableNum]: {
        ...(prev[tableNum] || { scoreA: '', scoreB: '' }),
        [slot]: val,
      },
    }));
  };

  const handleFinishMatch = (tableNum) => {
    const table = activeTables[tableNum];
    if (!table?.teamA || !table?.teamB) return;

    const sc = scores[tableNum] || {};
    const numA = sc.scoreA !== '' && sc.scoreA != null ? Number(sc.scoreA) : 100;
    const numB = sc.scoreB !== '' && sc.scoreB != null ? Number(sc.scoreB) : 0;
    const winnerId = numA >= numB ? table.teamA : table.teamB;

    recordOpenMatch(tableNum, numA, numB, winnerId);

    setScores((prev) => {
      const next = { ...prev };
      delete next[tableNum];
      return next;
    });
  };

  const handleQuickWin = (tableNum, winnerId) => {
    const table = activeTables[tableNum];
    if (!table?.teamA || !table?.teamB) return;

    const sc = scores[tableNum] || {};
    const defaultScore = 100;
    const numA = sc.scoreA !== '' && sc.scoreA != null ? Number(sc.scoreA) : (winnerId === table.teamA ? defaultScore : 80);
    const numB = sc.scoreB !== '' && sc.scoreB != null ? Number(sc.scoreB) : (winnerId === table.teamB ? defaultScore : 80);

    recordOpenMatch(tableNum, numA, numB, winnerId);

    setScores((prev) => {
      const next = { ...prev };
      delete next[tableNum];
      return next;
    });
  };

  return (
    <div className="space-y-8">
      {/* ─── Active Tables (Drop Zones) ─────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-felt animate-pulse" />
            <h2 className="font-display text-base md:text-lg font-bold uppercase tracking-wider text-timber">
              Active Tables
            </h2>
            <span className="font-mono text-xs text-timber/50">
              ({tablesCount} {tablesCount === 1 ? 'Table' : 'Tables'} Available)
            </span>
          </div>

          {isAdmin && (
            <p className="font-mono text-[11px] text-timber/60 hidden sm:block">
              ✦ Drag teams from the Standby Pools into Table 1 & Table 2
            </p>
          )}
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

            const stA = teamA ? groupStandingsMap.get(teamA.id) : null;
            const stB = teamB ? groupStandingsMap.get(teamB.id) : null;

            const targetKeyA = `t${tableNum}-teamA`;
            const targetKeyB = `t${tableNum}-teamB`;
            const isDragOverA = dragOverTarget === targetKeyA;
            const isDragOverB = dragOverTarget === targetKeyB;

            const sc = scores[tableNum] || { scoreA: '', scoreB: '' };
            const numA = sc.scoreA !== '' && sc.scoreA != null ? Number(sc.scoreA) : null;
            const numB = sc.scoreB !== '' && sc.scoreB != null ? Number(sc.scoreB) : null;
            const previewDiff = numA != null && numB != null ? Math.abs(numA - numB) : null;
            const previewWinner = numA != null && numB != null ? (numA >= numB ? teamA?.name : teamB?.name) : null;

            return (
              <div
                key={`table-arena-${tableNum}`}
                className="border-2 border-timber bg-bone rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between"
              >
                {/* Table Header */}
                <div className="bg-felt text-bone px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs uppercase tracking-widest font-bold">
                      Table {tableNum}
                    </span>
                    <span
                      className={`text-[9px] font-mono tracking-widest uppercase px-2 py-0.5 rounded font-bold ${
                        bothSeated
                          ? 'bg-bone text-felt'
                          : teamA || teamB
                          ? 'bg-brass text-timber'
                          : 'bg-bone/20 text-bone'
                      }`}
                    >
                      {bothSeated ? 'Live Matchup' : teamA || teamB ? 'Waiting 1 Team' : 'Empty Table'}
                    </span>
                  </div>

                  {isAdmin && (teamA || teamB) && (
                    <div className="flex items-center gap-1">
                      {bothSeated && (
                        <button
                          onClick={() => swapTableTeams(tableNum)}
                          title="Swap Sides"
                          className="p-1 hover:bg-bone/20 rounded text-bone transition-colors"
                        >
                          <ArrowRightLeft size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => clearTable(tableNum)}
                        title="Return both teams to Standby"
                        className="p-1 hover:bg-terra/30 rounded text-bone transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Matchup Drop Zones */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-center">
                  {/* Slot A */}
                  <div
                    onDragOver={(e) => handleDragOver(e, targetKeyA)}
                    onDragLeave={() => handleDragLeave(targetKeyA)}
                    onDrop={(e) => handleDrop(e, tableNum, 'teamA')}
                    className={`border-2 rounded-xl p-3 transition-all ${
                      isDragOverA
                        ? 'border-felt bg-felt/15 border-dashed scale-[1.01]'
                        : teamA
                        ? 'border-timber/15 bg-bone-dark/25'
                        : 'border-timber/15 border-dashed bg-bone-dark/10 hover:border-timber/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-timber/40 font-bold">
                        Home Side (Team A)
                      </span>
                      {stA?.pool && (
                        <span className="text-[9px] font-mono uppercase font-bold bg-timber/10 text-timber/70 px-1.5 rounded">
                          Pool {stA.pool}
                        </span>
                      )}
                    </div>

                    {teamA ? (
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
                                {stA.wins}-{stA.losses} ({stA.diff > 0 ? `+${stA.diff}` : stA.diff})
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
                            className="p-1 text-timber/30 hover:text-terra hover:bg-terra/10 rounded transition-colors"
                            title="Return to Standby"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="py-2 text-center">
                        <p className="font-mono text-xs text-timber/40">
                          {isAdmin ? 'Drop Team A here' : 'Open table slot'}
                        </p>
                        {isAdmin && allStandbyTeams.length > 0 && (
                          <div className="mt-1.5">
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) assignTableTeam(tableNum, 'teamA', e.target.value);
                              }}
                              className="text-[11px] font-mono bg-bone border border-timber/20 rounded px-2 py-1 text-timber cursor-pointer"
                            >
                              <option value="" disabled>
                                Or select from Standby...
                              </option>
                              {allStandbyTeams.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name} (Pool {groupStandingsMap.get(t.id)?.pool || 'A'})
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

                  {/* Slot B */}
                  <div
                    onDragOver={(e) => handleDragOver(e, targetKeyB)}
                    onDragLeave={() => handleDragLeave(targetKeyB)}
                    onDrop={(e) => handleDrop(e, tableNum, 'teamB')}
                    className={`border-2 rounded-xl p-3 transition-all ${
                      isDragOverB
                        ? 'border-felt bg-felt/15 border-dashed scale-[1.01]'
                        : teamB
                        ? 'border-timber/15 bg-bone-dark/25'
                        : 'border-timber/15 border-dashed bg-bone-dark/10 hover:border-timber/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-timber/40 font-bold">
                        Away Side (Team B)
                      </span>
                      {stB?.pool && (
                        <span className="text-[9px] font-mono uppercase font-bold bg-timber/10 text-timber/70 px-1.5 rounded">
                          Pool {stB.pool}
                        </span>
                      )}
                    </div>

                    {teamB ? (
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
                                {stB.wins}-{stB.losses} ({stB.diff > 0 ? `+${stB.diff}` : stB.diff})
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
                            className="p-1 text-timber/30 hover:text-terra hover:bg-terra/10 rounded transition-colors"
                            title="Return to Standby"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="py-2 text-center">
                        <p className="font-mono text-xs text-timber/40">
                          {isAdmin ? 'Drop Team B here' : 'Open table slot'}
                        </p>
                        {isAdmin && allStandbyTeams.length > 0 && (
                          <div className="mt-1.5">
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) assignTableTeam(tableNum, 'teamB', e.target.value);
                              }}
                              className="text-[11px] font-mono bg-bone border border-timber/20 rounded px-2 py-1 text-timber cursor-pointer"
                            >
                              <option value="" disabled>
                                Or select from Standby...
                              </option>
                              {allStandbyTeams.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name} (Pool {groupStandingsMap.get(t.id)?.pool || 'B'})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Score & Finish Match Bar (Admin only) */}
                {bothSeated && isAdmin && (
                  <div className="p-4 bg-bone-dark/40 border-t border-timber/15 space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono text-timber/60">
                      <span>Enter Final Points / Scores:</span>
                      {previewDiff != null && previewDiff > 0 && (
                        <span className="text-felt font-bold font-mono text-[11px]">
                          +{previewDiff} for {previewWinner}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <input
                          type="number"
                          placeholder={`${teamA.name.slice(0, 10)} pts`}
                          value={sc.scoreA}
                          onChange={(e) => handleScoreChange(tableNum, 'scoreA', e.target.value)}
                          className="w-full bg-bone border border-timber/20 rounded-lg px-3 py-2 font-mono text-sm font-bold text-center text-timber focus:outline-none focus:border-felt"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder={`${teamB.name.slice(0, 10)} pts`}
                          value={sc.scoreB}
                          onChange={(e) => handleScoreChange(tableNum, 'scoreB', e.target.value)}
                          className="w-full bg-bone border border-timber/20 rounded-lg px-3 py-2 font-mono text-sm font-bold text-center text-timber focus:outline-none focus:border-felt"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => handleFinishMatch(tableNum)}
                      className="w-full py-2.5 bg-felt text-bone font-display text-xs uppercase tracking-wider rounded-lg font-bold hover:bg-felt-light transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 size={14} /> Submit Result & Free Table
                    </button>

                    <div className="flex items-center gap-2 pt-1 text-[10px] text-timber/40 justify-center">
                      <span className="font-mono">Quick win:</span>
                      <button
                        onClick={() => handleQuickWin(tableNum, teamA.id)}
                        className="underline hover:text-felt cursor-pointer truncate max-w-[120px]"
                      >
                        {teamA.name} Wins
                      </button>
                      <span>·</span>
                      <button
                        onClick={() => handleQuickWin(tableNum, teamB.id)}
                        className="underline hover:text-felt cursor-pointer truncate max-w-[120px]"
                      >
                        {teamB.name} Wins
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
              Standby Teams by Group
            </h3>
          </div>
          <p className="font-mono text-xs text-timber/50 mt-0.5">
            Grab and drag any team onto Table 1 or Table 2 above. Sorted by fewest games played.
          </p>
        </div>

        {/* Group Columns */}
        <div className={`grid gap-4 ${groupLabels.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
          {groupLabels.map((gid) => {
            const poolStandby = standbyByGroup[gid] || [];

            return (
              <div
                key={`pool-standby-col-${gid}`}
                className="border border-timber/15 bg-bone-dark/15 rounded-xl p-4 flex flex-col justify-between"
              >
                {/* Pool Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-timber/10 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm font-bold uppercase tracking-wide text-timber">
                      Pool {gid} Standby
                    </span>
                    <span className="font-mono text-[11px] bg-timber/10 px-2 py-0.5 rounded text-timber/70 font-semibold">
                      {poolStandby.length} waiting
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-timber/40">
                    {groups[gid]?.length || 0} total teams
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

                            {/* Quick seat buttons for mobile or fast clicking */}
                            {isAdmin && (
                              <div className="flex gap-1">
                                {tableSlots.map((num) => {
                                  const table = activeTables[num] || {};
                                  const hasOpenSlot = !table.teamA || !table.teamB;
                                  if (!hasOpenSlot) return null;
                                  const slot = !table.teamA ? 'teamA' : 'teamB';

                                  return (
                                    <button
                                      key={`quick-seat-${team.id}-t${num}`}
                                      onClick={() => assignTableTeam(num, slot, team.id)}
                                      className="py-1 px-1.5 bg-felt/10 hover:bg-felt hover:text-bone text-felt border border-felt/20 rounded font-mono text-[10px] uppercase font-bold transition-all cursor-pointer"
                                      title={`Assign to Table ${num}`}
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
              Score history & point differential log
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

              return (
                <div
                  key={m.id}
                  className="border border-timber/15 rounded-xl p-2.5 bg-bone-dark/15 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-timber/10 text-timber/60">
                      Table {m.table || '1'}
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
                        +{diff} diff
                      </span>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          const newScoreA = prompt('Score for ' + (teamA?.name || 'Team A'), m.scoreA ?? 100);
                          if (newScoreA === null) return;
                          const newScoreB = prompt('Score for ' + (teamB?.name || 'Team B'), m.scoreB ?? 80);
                          if (newScoreB === null) return;
                          updateMatchScore(m.id, {
                            scoreA: newScoreA,
                            scoreB: newScoreB,
                          });
                        }}
                        className="p-1.5 text-timber/40 hover:text-timber hover:bg-timber/10 rounded transition-colors cursor-pointer"
                        title="Edit Score"
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
    </div>
  );
}
