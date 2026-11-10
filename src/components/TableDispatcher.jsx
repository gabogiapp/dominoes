import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTournament } from '../context/TournamentContext';
import { useAdminStatus } from '../utils/storage';
import { calcOpenStandings } from '../utils/tournamentEngine';
import {
  Users,
  CheckCircle2,
  X,
  ArrowRightLeft,
  Trash2,
  Edit2,
  Trophy,
  Sparkles,
  Clock,
} from 'lucide-react';

export default function TableDispatcher() {
  const {
    state,
    assignTableTeam,
    removeTableTeam,
    clearTable,
    swapTableTeams,
    recordOpenMatch,
    updateMatchScore,
    deleteMatch,
    generateKnockoutFromStandings,
  } = useTournament();

  const isAdmin = useAdminStatus();
  const tablesCount = Math.max(1, state.tablesCount || 2);
  const activeTables = state.activeTables;

  // Local state for score inputs per table
  const [tableScores, setTableScores] = useState({});
  const [standbySearch, setStandbySearch] = useState('');
  const [playoffCount, setPlayoffCount] = useState(4);

  const activeTeams = useMemo(
    () => state.teams.filter((t) => !t.withdrawn),
    [state.teams]
  );

  // Compute standings for all active teams
  const standings = useMemo(() => {
    return calcOpenStandings(
      activeTeams.map((t) => t.id),
      state.matches,
      state.overrides
    );
  }, [activeTeams, state.matches, state.overrides]);

  const standingsMap = useMemo(() => {
    const map = new Map();
    standings.forEach((s, idx) => {
      map.set(s.teamId, { ...s, rank: idx + 1 });
    });
    return map;
  }, [standings]);

  // Determine which teams are currently seated at tables
  const seatedTeamIds = useMemo(() => {
    const ids = new Set();
    Object.values(activeTables).forEach((t) => {
      if (t?.teamA) ids.add(t.teamA);
      if (t?.teamB) ids.add(t.teamB);
    });
    return ids;
  }, [activeTables]);

  // Standby teams: active teams not currently seated
  const standbyTeams = useMemo(() => {
    return activeTeams
      .filter((t) => !seatedTeamIds.has(t.id))
      .sort((a, b) => {
        const statsA = standingsMap.get(a.id) || { played: 0, wins: 0, diff: 0 };
        const statsB = standingsMap.get(b.id) || { played: 0, wins: 0, diff: 0 };
        // Priority 1: Fewest games played (gives playing time balance)
        if (statsA.played !== statsB.played) return statsA.played - statsB.played;
        // Priority 2: Highest wins
        if (statsB.wins !== statsA.wins) return statsB.wins - statsA.wins;
        // Priority 3: Highest diff
        if (statsB.diff !== statsA.diff) return statsB.diff - statsA.diff;
        return a.name.localeCompare(b.name);
      });
  }, [activeTeams, seatedTeamIds, standingsMap]);

  // Filter standby teams by search
  const filteredStandby = useMemo(() => {
    if (!standbySearch.trim()) return standbyTeams;
    const q = standbySearch.toLowerCase();
    return standbyTeams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.player1?.toLowerCase().includes(q) ||
        t.player2?.toLowerCase().includes(q)
    );
  }, [standbyTeams, standbySearch]);

  const getTeam = (id) => state.teams.find((t) => t.id === id);

  const handleScoreChange = (tableNum, slot, val) => {
    setTableScores((prev) => ({
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

    const scores = tableScores[tableNum] || {};
    const scoreA = scores.scoreA !== '' && scores.scoreA != null ? Number(scores.scoreA) : 100;
    const scoreB = scores.scoreB !== '' && scores.scoreB != null ? Number(scores.scoreB) : 0;
    const winnerId = scoreA >= scoreB ? table.teamA : table.teamB;

    recordOpenMatch(tableNum, scoreA, scoreB, winnerId);

    // Clear local inputs for this table
    setTableScores((prev) => {
      const next = { ...prev };
      delete next[tableNum];
      return next;
    });
  };

  const handleQuickWin = (tableNum, winnerId) => {
    const table = activeTables[tableNum];
    if (!table?.teamA || !table?.teamB) return;

    const scores = tableScores[tableNum] || {};
    const scoreA = scores.scoreA !== '' && scores.scoreA != null ? Number(scores.scoreA) : winnerId === table.teamA ? 100 : 80;
    const scoreB = scores.scoreB !== '' && scores.scoreB != null ? Number(scores.scoreB) : winnerId === table.teamB ? 100 : 80;

    recordOpenMatch(tableNum, scoreA, scoreB, winnerId);

    setTableScores((prev) => {
      const next = { ...prev };
      delete next[tableNum];
      return next;
    });
  };

  // Recent completed open matches
  const completedMatches = useMemo(() => {
    return (state.matches || [])
      .filter((m) => m.stage === 'open' || (m.stage === 'group' && m.winner))
      .slice()
      .reverse();
  }, [state.matches]);

  const tableSlots = Array.from({ length: tablesCount }, (_, i) => i + 1);

  return (
    <div className="space-y-8">
      {/* ─── Active Tables Arena ─────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-felt animate-pulse" />
            <h2 className="font-display text-sm md:text-base font-bold uppercase tracking-wider text-timber">
              Active Tables ({tablesCount} {tablesCount === 1 ? 'Table' : 'Tables'})
            </h2>
          </div>
          <span className="font-mono text-xs text-timber/60">
            {seatedTeamIds.size} teams seated · {standbyTeams.length} on standby
          </span>
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
            const statsA = teamA ? standingsMap.get(teamA.id) : null;
            const statsB = teamB ? standingsMap.get(teamB.id) : null;

            const scores = tableScores[tableNum] || { scoreA: '', scoreB: '' };
            const numA = scores.scoreA !== '' ? Number(scores.scoreA) : null;
            const numB = scores.scoreB !== '' ? Number(scores.scoreB) : null;
            const previewDiff = numA != null && numB != null ? Math.abs(numA - numB) : null;
            const previewLeader = numA != null && numB != null ? (numA >= numB ? teamA?.name : teamB?.name) : null;

            return (
              <motion.div
                key={`table-box-${tableNum}`}
                layout
                className="border-2 border-timber bg-bone rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between"
              >
                {/* Table Header */}
                <div className="bg-felt text-bone px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs uppercase tracking-widest font-bold">
                      Table {tableNum}
                    </span>
                    <span
                      className={`text-[9px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded font-bold ${
                        bothSeated
                          ? 'bg-bone text-felt'
                          : teamA || teamB
                          ? 'bg-brass text-timber'
                          : 'bg-bone/20 text-bone'
                      }`}
                    >
                      {bothSeated ? 'Live Match' : teamA || teamB ? 'Waiting 1 Team' : 'Open Table'}
                    </span>
                  </div>

                  {isAdmin && (teamA || teamB) && (
                    <div className="flex items-center gap-1">
                      {bothSeated && (
                        <button
                          onClick={() => swapTableTeams(tableNum)}
                          title="Swap Team A and Team B sides"
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

                {/* Seating Cards */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-center">
                  {/* Team A Slot */}
                  <div className="border border-timber/15 rounded-xl p-3 bg-bone-dark/20 relative">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-timber/40 font-bold block mb-1">
                      Team A
                    </span>
                    {teamA ? (
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-display text-base font-bold uppercase text-timber">
                              {teamA.name}
                            </span>
                            {statsA && (
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                                  statsA.diff > 0
                                    ? 'bg-felt/15 text-felt'
                                    : statsA.diff < 0
                                    ? 'bg-terra/15 text-terra'
                                    : 'bg-timber/10 text-timber/60'
                                }`}
                              >
                                {statsA.wins}-{statsA.losses} ({statsA.diff > 0 ? `+${statsA.diff}` : statsA.diff})
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-[10px] text-timber/50">
                            {teamA.player1} & {teamA.player2}
                          </p>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => removeTableTeam(tableNum, 'teamA')}
                            className="p-1 text-timber/40 hover:text-terra hover:bg-terra/10 rounded transition-colors"
                            title="Return to Standby"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ) : isAdmin ? (
                      <div className="relative">
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              assignTableTeam(tableNum, 'teamA', e.target.value);
                            }
                          }}
                          className="w-full bg-bone border border-timber/20 rounded-lg px-2.5 py-2 font-mono text-xs text-timber cursor-pointer focus:outline-none focus:border-felt"
                        >
                          <option value="" disabled>
                            + Seat Team A from Standby ({standbyTeams.length})
                          </option>
                          {standbyTeams.map((t) => {
                            const st = standingsMap.get(t.id);
                            return (
                              <option key={t.id} value={t.id}>
                                {t.name} ({st?.wins || 0}W-{st?.losses || 0}L, ±{st?.diff || 0})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    ) : (
                      <p className="font-mono text-xs text-timber/40 italic py-1">
                        Table slot open
                      </p>
                    )}
                  </div>

                  {/* VS divider */}
                  <div className="flex items-center gap-3 py-0.5">
                    <div className="flex-1 h-px bg-timber/15" />
                    <span className="font-display text-xs text-timber/40 font-bold tracking-widest">
                      VS
                    </span>
                    <div className="flex-1 h-px bg-timber/15" />
                  </div>

                  {/* Team B Slot */}
                  <div className="border border-timber/15 rounded-xl p-3 bg-bone-dark/20 relative">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-timber/40 font-bold block mb-1">
                      Team B
                    </span>
                    {teamB ? (
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-display text-base font-bold uppercase text-timber">
                              {teamB.name}
                            </span>
                            {statsB && (
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                                  statsB.diff > 0
                                    ? 'bg-felt/15 text-felt'
                                    : statsB.diff < 0
                                    ? 'bg-terra/15 text-terra'
                                    : 'bg-timber/10 text-timber/60'
                                }`}
                              >
                                {statsB.wins}-{statsB.losses} ({statsB.diff > 0 ? `+${statsB.diff}` : statsB.diff})
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-[10px] text-timber/50">
                            {teamB.player1} & {teamB.player2}
                          </p>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => removeTableTeam(tableNum, 'teamB')}
                            className="p-1 text-timber/40 hover:text-terra hover:bg-terra/10 rounded transition-colors"
                            title="Return to Standby"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ) : isAdmin ? (
                      <div className="relative">
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              assignTableTeam(tableNum, 'teamB', e.target.value);
                            }
                          }}
                          className="w-full bg-bone border border-timber/20 rounded-lg px-2.5 py-2 font-mono text-xs text-timber cursor-pointer focus:outline-none focus:border-felt"
                        >
                          <option value="" disabled>
                            + Seat Team B from Standby ({standbyTeams.length})
                          </option>
                          {standbyTeams.map((t) => {
                            const st = standingsMap.get(t.id);
                            return (
                              <option key={t.id} value={t.id}>
                                {t.name} ({st?.wins || 0}W-{st?.losses || 0}L, ±{st?.diff || 0})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    ) : (
                      <p className="font-mono text-xs text-timber/40 italic py-1">
                        Table slot open
                      </p>
                    )}
                  </div>
                </div>

                {/* Score & Finish Match Bar (Admin only) */}
                {bothSeated && isAdmin && (
                  <div className="p-4 bg-bone-dark/40 border-t border-timber/15 space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono text-timber/60">
                      <span>Points / Score:</span>
                      {previewDiff != null && previewDiff > 0 && (
                        <span className="text-felt font-bold font-mono text-[11px]">
                          +{previewDiff} for {previewLeader}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <input
                          type="number"
                          placeholder={`${teamA.name.slice(0, 10)} pts`}
                          value={scores.scoreA}
                          onChange={(e) => handleScoreChange(tableNum, 'scoreA', e.target.value)}
                          className="w-full bg-bone border border-timber/20 rounded-lg px-3 py-2 font-mono text-sm font-bold text-center text-timber focus:outline-none focus:border-felt"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder={`${teamB.name.slice(0, 10)} pts`}
                          value={scores.scoreB}
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

                    <div className="flex items-center gap-2 pt-1 text-[10px] text-timber/40">
                      <span className="font-mono">Quick win:</span>
                      <button
                        onClick={() => handleQuickWin(tableNum, teamA.id)}
                        className="underline hover:text-felt cursor-pointer truncate max-w-[100px]"
                      >
                        {teamA.name}
                      </button>
                      <span>·</span>
                      <button
                        onClick={() => handleQuickWin(tableNum, teamB.id)}
                        className="underline hover:text-felt cursor-pointer truncate max-w-[100px]"
                      >
                        {teamB.name}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ─── Standby Bench ───────────────────────────────────────── */}
      <div className="border-2 border-timber bg-bone rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Users size={16} className="text-terra" />
              <h3 className="font-display text-sm md:text-base font-bold uppercase tracking-wider text-timber">
                Standby Bench ({standbyTeams.length} {standbyTeams.length === 1 ? 'Team' : 'Teams'} Waiting)
              </h3>
            </div>
            <p className="font-mono text-xs text-timber/50 mt-0.5">
              Available to play · Sorted by fewest games played to balance table time
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Filter standby..."
              value={standbySearch}
              onChange={(e) => setStandbySearch(e.target.value)}
              className="bg-bone-dark/30 border border-timber/20 rounded-lg px-3 py-1.5 font-mono text-xs text-timber focus:outline-none focus:border-felt max-w-[180px]"
            />
          </div>
        </div>

        {standbyTeams.length === 0 ? (
          <div className="text-center py-8 font-mono text-xs text-timber/40 bg-bone-dark/10 rounded-xl">
            All registered teams are currently seated at tables!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredStandby.map((team) => {
              const stats = standingsMap.get(team.id) || {
                rank: '-',
                played: 0,
                wins: 0,
                losses: 0,
                diff: 0,
              };

              return (
                <div
                  key={team.id}
                  className="border border-timber/15 bg-bone-dark/20 rounded-xl p-3 flex flex-col justify-between hover:border-timber/30 transition-all"
                >
                  <div className="mb-2">
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-display text-sm font-bold uppercase text-timber leading-tight">
                        {team.name}
                      </span>
                      <span className="font-mono text-[10px] text-timber/40 font-bold shrink-0">
                        #{stats.rank}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-timber/50 mt-0.5">
                      {team.player1} & {team.player2}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono border-t border-timber/10 pt-2 mb-2">
                    <span className="text-timber/60">{stats.played} GP</span>
                    <span className="font-bold text-timber">
                      {stats.wins}W – {stats.losses}L
                    </span>
                    <span
                      className={`font-bold ${
                        stats.diff > 0
                          ? 'text-felt'
                          : stats.diff < 0
                          ? 'text-terra'
                          : 'text-timber/40'
                      }`}
                    >
                      {stats.diff > 0 ? `+${stats.diff}` : stats.diff}
                    </span>
                  </div>

                  {isAdmin && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {tableSlots.map((num) => {
                        const table = activeTables[num] || {};
                        const hasOpenSlot = !table.teamA || !table.teamB;
                        if (!hasOpenSlot) return null;

                        const targetSlot = !table.teamA ? 'teamA' : 'teamB';
                        return (
                          <button
                            key={`quick-seat-${num}`}
                            onClick={() => assignTableTeam(num, targetSlot, team.id)}
                            className="flex-1 py-1 px-1.5 bg-felt/10 hover:bg-felt hover:text-bone text-felt border border-felt/20 rounded font-mono text-[10px] uppercase tracking-wider font-semibold transition-all cursor-pointer text-center"
                          >
                            T{num}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Match Results Log ───────────────────────────────────── */}
      {completedMatches.length > 0 && (
        <div className="border-2 border-timber bg-bone rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-brass" />
              <h3 className="font-display text-sm md:text-base font-bold uppercase tracking-wider text-timber">
                Completed Matches ({completedMatches.length})
              </h3>
            </div>
            <span className="font-mono text-xs text-timber/60">
              Score history & differential log
            </span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
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
                  className="border border-timber/15 rounded-xl p-3 bg-bone-dark/15 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-timber/10 text-timber/70">
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
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          const newScoreA = prompt('Enter score for ' + (teamA?.name || 'Team A'), m.scoreA ?? 100);
                          if (newScoreA === null) return;
                          const newScoreB = prompt('Enter score for ' + (teamB?.name || 'Team B'), m.scoreB ?? 80);
                          if (newScoreB === null) return;
                          updateMatchScore(m.id, {
                            scoreA: newScoreA,
                            scoreB: newScoreB,
                          });
                        }}
                        className="p-1.5 text-timber/40 hover:text-timber hover:bg-timber/10 rounded transition-colors"
                        title="Edit Match Score"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this match record? Standings will be recalculated.')) {
                            deleteMatch(m.id);
                          }
                        }}
                        className="p-1.5 text-timber/40 hover:text-terra hover:bg-terra/10 rounded transition-colors"
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

      {/* ─── Advance to Playoffs / Knockout Bracket (Admin only) ──── */}
      {isAdmin && (
        <div className="border-2 border-brass/40 bg-brass/10 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy size={16} className="text-brass" />
              <h3 className="font-display text-sm md:text-base font-bold uppercase tracking-wider text-timber">
                Ready for Playoffs / Knockout Stage?
              </h3>
            </div>
            <p className="font-mono text-xs text-timber/60">
              When open qualifying matches are complete, advance top seeds directly to the Knockout Bracket.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={playoffCount}
              onChange={(e) => setPlayoffCount(Number(e.target.value))}
              className="bg-bone border border-timber/20 rounded-lg px-3 py-2 font-mono text-xs text-timber font-bold cursor-pointer"
            >
              <option value={2}>Advance Top 2 (Final Only)</option>
              <option value={4}>Advance Top 4 (Semifinals & Final)</option>
              <option value={8} disabled={activeTeams.length < 8}>Advance Top 8 (Quarterfinals)</option>
            </select>

            <button
              onClick={() => {
                if (confirm(`Generate knockout bracket with the Top ${playoffCount} seeds?`)) {
                  generateKnockoutFromStandings(playoffCount);
                }
              }}
              className="px-4 py-2 bg-brass text-timber font-display text-xs uppercase tracking-wider rounded-lg font-bold hover:bg-brass-light transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles size={14} /> Start Playoffs
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
