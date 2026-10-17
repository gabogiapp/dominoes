import React from 'react';
import { useTournament } from '../../context/TournamentContext';
import { getActiveMatches, isGroupStageComplete } from '../../utils/tournamentEngine';

export default function MatchManager() {
  const { state, recordWinner, resetMatch, setTablesCount } = useTournament();
  const { matches, teams, stage } = state;

  if (stage !== 'groups') {
    return (
      <div className="text-center py-6">
        <p className="font-mono text-xs text-timber/30 uppercase tracking-widest">
          {stage === 'setup' ? 'Start the group stage first' : 'Group stage completed'}
        </p>
      </div>
    );
  }

  const groupComplete = isGroupStageComplete(matches);
  const groupMatches = matches.filter(m => m.stage === 'group');
  const playedCount = groupMatches.filter(m => m.winner).length;
  const unplayed = groupMatches.filter(m => !m.winner);
  const tablesCount = state.tablesCount || 2;
  const active = getActiveMatches(matches, tablesCount);

  const getTeam = (id) => teams.find(t => t.id === id);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-display text-sm tracking-widest uppercase text-timber/60">
            Matches
          </h3>
          <span className="font-mono text-[10px] text-timber/40">
            {playedCount} / {groupMatches.length} played
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase text-timber/40">Tables:</span>
          {[1, 2, 3, 4].map(n => (
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

      {groupComplete && (
        <div className="mb-4 p-3 border-2 border-felt rounded-lg bg-felt/5 text-center">
          <p className="font-display text-sm uppercase tracking-widest text-felt font-bold">
            ✦ Group Stage Complete ✦
          </p>
        </div>
      )}

      {/* Active / upcoming matches */}
      <div className="space-y-2">
        {(unplayed.length > 0 ? unplayed : groupMatches.filter(m => m.winner).slice(-4).reverse()).map((match) => {
          const teamA = getTeam(match.teamA);
          const teamB = getTeam(match.teamB);
          const activeMatch = active.find(a => a.id === match.id);
          const isActive = !!activeMatch;
          const displayTable = activeMatch ? activeMatch.table : match.table;

          return (
            <div
              key={match.id}
              className={`p-3 rounded-lg border-2 transition-colors ${
                isActive ? 'border-felt bg-felt/5' : match.winner ? 'border-timber/5 bg-bone-dark/30' : 'border-timber/10'
              }`}
            >
              {/* Match info header */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] tracking-widest uppercase text-timber/30">
                  Table {displayTable} • Pool {match.groupId}
                </span>
                {isActive && (
                  <span className="font-mono text-[10px] tracking-widest uppercase text-felt font-bold">
                    Up Next
                  </span>
                )}
              </div>

              {match.winner ? (
                /* Completed match */
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`font-display text-sm uppercase font-bold ${match.winner === match.teamA ? 'text-felt' : 'text-timber/30'}`}>
                      {teamA.name}
                    </span>
                    <span className="font-mono text-xs text-timber/20 mx-2">vs</span>
                    <span className={`font-display text-sm uppercase font-bold ${match.winner === match.teamB ? 'text-felt' : 'text-timber/30'}`}>
                      {teamB.name}
                    </span>
                  </div>
                  <button
                    onClick={() => resetMatch(match.id)}
                    className="font-mono text-[10px] uppercase tracking-wider text-terra border border-terra/20 px-2 py-1 rounded hover:bg-terra/10 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              ) : (
                /* Unplayed match — 1-tap winner buttons */
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => recordWinner(match.id, match.teamA)}
                    className="w-full py-3 bg-felt text-bone font-display text-sm uppercase tracking-wider rounded hover:bg-felt-light active:scale-[0.98] transition-all"
                  >
                    {teamA.name} Wins
                  </button>
                  <button
                    onClick={() => recordWinner(match.id, match.teamB)}
                    className="w-full py-3 bg-felt text-bone font-display text-sm uppercase tracking-wider rounded hover:bg-felt-light active:scale-[0.98] transition-all"
                  >
                    {teamB.name} Wins
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
