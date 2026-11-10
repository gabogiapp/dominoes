import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { Play, CheckCircle2, X, Trash2, Edit2, ArrowRightLeft } from 'lucide-react';

export default function MatchManager() {
  const {
    state,
    setTablesCount,
    startGroupStage,
    assignTableTeam,
    removeTableTeam,
    clearTable,
    swapTableTeams,
    recordOpenMatch,
    updateMatchScore,
    deleteMatch,
  } = useTournament();

  const { matches, teams, stage, groups } = state;
  const tablesCount = state.tablesCount || 2;
  const activeTables = state.activeTables || {};
  const [scores, setScores] = useState({});

  const activeTeams = teams.filter((t) => !t.withdrawn);
  const getTeam = (id) => teams.find((t) => t.id === id);

  // Helper to find pool of team
  const getTeamPool = (teamId) => {
    if (!groups) return 'A';
    for (const [gid, teamIds] of Object.entries(groups)) {
      if (teamIds.includes(teamId)) return gid;
    }
    return 'A';
  };

  // If in Setup Stage
  if (stage === 'setup') {
    return (
      <div className="text-center py-8 px-4 space-y-4">
        <p className="font-mono text-xs text-timber/40 uppercase tracking-widest">
          Tournament is in Setup Stage
        </p>
        <button
          onClick={startGroupStage}
          disabled={activeTeams.length < 2}
          className="w-full py-3 bg-felt text-bone font-display text-xs uppercase tracking-wider rounded-lg font-bold hover:bg-felt-light transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30"
        >
          <Play size={14} /> Start Group Stage
        </button>
      </div>
    );
  }

  // Active in Group Stage
  const seatedTeamIds = new Set();
  Object.values(activeTables).forEach((t) => {
    if (t?.teamA) seatedTeamIds.add(t.teamA);
    if (t?.teamB) seatedTeamIds.add(t.teamB);
  });

  const standbyTeams = activeTeams.filter((t) => !seatedTeamIds.has(t.id));
  const completedMatches = matches
    .filter((m) => m.winner)
    .slice()
    .reverse();

  const tableSlots = Array.from({ length: tablesCount }, (_, i) => i + 1);

  const handleScoreInput = (tableNum, slot, val) => {
    setScores((prev) => ({
      ...prev,
      [tableNum]: {
        ...(prev[tableNum] || { scoreA: '', scoreB: '' }),
        [slot]: val,
      },
    }));
  };

  const handleComplete = (tableNum) => {
    const table = activeTables[tableNum];
    if (!table?.teamA || !table?.teamB) return;

    const sc = scores[tableNum] || {};
    const scoreA = sc.scoreA !== '' && sc.scoreA != null ? Number(sc.scoreA) : 100;
    const scoreB = sc.scoreB !== '' && sc.scoreB != null ? Number(sc.scoreB) : 0;
    const winner = scoreA >= scoreB ? table.teamA : table.teamB;

    recordOpenMatch(tableNum, scoreA, scoreB, winner);
    setScores((prev) => {
      const next = { ...prev };
      delete next[tableNum];
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Table Count selector */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm tracking-widest uppercase text-timber/60 font-bold">
            Table Matchmaker
          </h3>
          <span className="font-mono text-[10px] text-timber/40">
            {standbyTeams.length} on standby · {completedMatches.length} completed
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase text-timber/40">Tables:</span>
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => setTablesCount(n)}
              className={`w-6 h-6 rounded font-mono text-[11px] font-bold flex items-center justify-center transition-colors cursor-pointer ${
                tablesCount === n
                  ? 'bg-felt text-bone shadow-xs'
                  : 'border border-timber/15 text-timber/40 hover:border-timber/30'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Active Tables List */}
      <div className="space-y-3">
        {tableSlots.map((num) => {
          const table = activeTables[num] || { teamA: null, teamB: null };
          const teamA = table.teamA ? getTeam(table.teamA) : null;
          const teamB = table.teamB ? getTeam(table.teamB) : null;
          const bothSeated = Boolean(teamA && teamB);
          const sc = scores[num] || { scoreA: '', scoreB: '' };

          return (
            <div
              key={`drawer-table-${num}`}
              className="p-3 border-2 border-timber/20 rounded-xl bg-bone-dark/10 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase font-bold text-felt">
                  Table {num}
                </span>
                {(teamA || teamB) && (
                  <div className="flex items-center gap-1">
                    {bothSeated && (
                      <button
                        onClick={() => swapTableTeams(num)}
                        className="p-1 text-timber/40 hover:text-timber"
                        title="Swap sides"
                      >
                        <ArrowRightLeft size={12} />
                      </button>
                    )}
                    <button
                      onClick={() => clearTable(num)}
                      className="p-1 text-timber/40 hover:text-terra"
                      title="Return both to standby"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* Team A */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-mono text-[10px] text-timber/40 w-12">Team A:</span>
                {teamA ? (
                  <div className="flex-1 flex items-center justify-between">
                    <span className="font-display font-bold uppercase text-timber">
                      {teamA.name} ({getTeamPool(teamA.id)})
                    </span>
                    <button
                      onClick={() => removeTableTeam(num, 'teamA')}
                      className="text-timber/30 hover:text-terra p-0.5"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) assignTableTeam(num, 'teamA', e.target.value);
                    }}
                    className="flex-1 bg-bone border border-timber/15 rounded px-2 py-1 font-mono text-[11px] text-timber"
                  >
                    <option value="" disabled>
                      + Seat Team A ({standbyTeams.length})
                    </option>
                    {standbyTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (Pool {getTeamPool(t.id)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Team B */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-mono text-[10px] text-timber/40 w-12">Team B:</span>
                {teamB ? (
                  <div className="flex-1 flex items-center justify-between">
                    <span className="font-display font-bold uppercase text-timber">
                      {teamB.name} ({getTeamPool(teamB.id)})
                    </span>
                    <button
                      onClick={() => removeTableTeam(num, 'teamB')}
                      className="text-timber/30 hover:text-terra p-0.5"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) assignTableTeam(num, 'teamB', e.target.value);
                    }}
                    className="flex-1 bg-bone border border-timber/15 rounded px-2 py-1 font-mono text-[11px] text-timber"
                  >
                    <option value="" disabled>
                      + Seat Team B ({standbyTeams.length})
                    </option>
                    {standbyTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (Pool {getTeamPool(t.id)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Scoring input & finish button */}
              {bothSeated && (
                <div className="pt-2 border-t border-timber/10 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Pts A"
                      value={sc.scoreA}
                      onChange={(e) => handleScoreInput(num, 'scoreA', e.target.value)}
                      className="bg-bone border border-timber/20 rounded px-2 py-1.5 font-mono text-xs font-bold text-center text-timber"
                    />
                    <input
                      type="number"
                      placeholder="Pts B"
                      value={sc.scoreB}
                      onChange={(e) => handleScoreInput(num, 'scoreB', e.target.value)}
                      className="bg-bone border border-timber/20 rounded px-2 py-1.5 font-mono text-xs font-bold text-center text-timber"
                    />
                  </div>
                  <button
                    onClick={() => handleComplete(num)}
                    className="w-full py-2 bg-felt text-bone font-display text-xs uppercase tracking-wider rounded font-bold hover:bg-felt-light transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 size={13} /> Submit Result & Free Table
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Completed Matches */}
      {completedMatches.length > 0 && (
        <div>
          <h4 className="font-mono text-xs uppercase tracking-wider text-timber/60 font-bold mb-2">
            Recent Matches ({completedMatches.length})
          </h4>
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {completedMatches.map((m) => {
              const tA = getTeam(m.teamA);
              const tB = getTeam(m.teamB);
              return (
                <div
                  key={m.id}
                  className="p-2 border border-timber/10 rounded-lg bg-bone text-xs flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[9px] uppercase font-bold text-timber/40">
                      T{m.table}
                    </span>
                    <span className={`font-display uppercase font-bold ${m.winner === m.teamA ? 'text-felt' : 'text-timber/60'}`}>
                      {tA?.name || m.teamA}
                    </span>
                    {m.scoreA != null && m.scoreB != null && (
                      <span className="font-mono text-[11px] font-bold">
                        {m.scoreA}-{m.scoreB}
                      </span>
                    )}
                    <span className={`font-display uppercase font-bold ${m.winner === m.teamB ? 'text-felt' : 'text-timber/60'}`}>
                      {tB?.name || m.teamB}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        const newA = prompt('Score for ' + (tA?.name || 'Team A'), m.scoreA ?? 100);
                        if (newA === null) return;
                        const newB = prompt('Score for ' + (tB?.name || 'Team B'), m.scoreB ?? 80);
                        if (newB === null) return;
                        updateMatchScore(m.id, { scoreA: newA, scoreB: newB });
                      }}
                      className="p-1 text-timber/40 hover:text-timber"
                      title="Edit Score"
                    >
                      <Edit2 size={11} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this match?')) deleteMatch(m.id);
                      }}
                      className="p-1 text-timber/40 hover:text-terra"
                      title="Delete Match"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
