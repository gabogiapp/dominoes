import React from 'react';
import { motion } from 'framer-motion';
import { useTournament } from '../context/TournamentContext';
import { calcOpenStandings } from '../utils/tournamentEngine';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function TVOpenStandingsTable() {
  const { state } = useTournament();
  const activeTeams = state.teams.filter(t => !t.withdrawn);
  const activeTeamIds = activeTeams.map(t => t.id);
  const standings = calcOpenStandings(activeTeamIds, state.matches, state.overrides);

  const getTeam = (id) => state.teams.find(t => t.id === id);

  return (
    <div className="border-2 border-timber rounded-xl overflow-hidden bg-bone shadow-sm">
      {/* Header */}
      <div className="bg-timber text-bone px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-brass" />
          <span className="font-display text-sm tracking-widest uppercase font-bold">
            Tournament Standings
          </span>
        </div>
        <span className="font-mono text-xs text-bone/60">
          {activeTeams.length} Active {activeTeams.length === 1 ? 'Team' : 'Teams'} · Ranked by Wins & Point Diff (±)
        </span>
      </div>

      {/* Standings Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-timber/10 bg-bone-dark/30">
              <th className="font-mono text-[10px] tracking-widest uppercase text-timber/50 px-3 py-2.5 text-center w-10">
                #
              </th>
              <th className="font-mono text-[10px] tracking-widest uppercase text-timber/50 px-3 py-2.5">
                Team
              </th>
              <th className="font-mono text-[10px] tracking-widest uppercase text-timber/50 px-2 py-2.5 text-center w-12">
                GP
              </th>
              <th className="font-mono text-[10px] tracking-widest uppercase text-timber/50 px-2 py-2.5 text-center w-16">
                W – L
              </th>
              <th className="font-mono text-[10px] tracking-widest uppercase text-timber/50 px-2 py-2.5 text-center w-14 hidden sm:table-cell">
                PF
              </th>
              <th className="font-mono text-[10px] tracking-widest uppercase text-timber/50 px-2 py-2.5 text-center w-14 hidden sm:table-cell">
                PA
              </th>
              <th className="font-mono text-[10px] tracking-widest uppercase text-timber/50 px-3 py-2.5 text-center w-20">
                Diff (±)
              </th>
              <th className="font-mono text-[10px] tracking-widest uppercase text-timber/50 px-3 py-2.5 text-right w-24 hidden md:table-cell">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {standings.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 font-mono text-xs text-timber/40">
                  No matches recorded yet. Seated teams at tables will update standings upon game completion.
                </td>
              </tr>
            ) : (
              standings.map((s, idx) => {
                const team = getTeam(s.teamId);
                if (!team) return null;

                const isLeader = idx === 0 && (s.wins > 0 || s.played > 0);
                const isPlayoffSpot = idx < 4;
                const diff = s.diff || 0;

                return (
                  <motion.tr
                    key={s.teamId}
                    layout
                    className={`border-b border-timber/5 last:border-b-0 transition-colors ${
                      team.withdrawn ? 'opacity-30 line-through' : ''
                    } ${isLeader ? 'bg-brass/10' : idx % 2 === 0 ? 'bg-bone' : 'bg-bone-dark/10'}`}
                  >
                    {/* Rank */}
                    <td className="px-3 py-3 text-center font-mono text-sm font-bold text-timber/60">
                      {idx + 1}
                    </td>

                    {/* Team Name & Players */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-display text-base font-bold uppercase tracking-wide text-timber">
                          {team.name}
                        </span>
                        {isLeader && (
                          <span className="text-[10px] bg-brass/30 text-timber font-mono font-bold px-1.5 py-0.5 rounded uppercase">
                            #1 Seed
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-[10px] text-timber/50 mt-0.5">
                        {team.player1} & {team.player2}
                      </p>
                    </td>

                    {/* Games Played */}
                    <td className="px-2 py-3 text-center font-mono text-xs text-timber/60">
                      {s.played}
                    </td>

                    {/* Record W-L */}
                    <td className="px-2 py-3 text-center">
                      <span className="font-mono text-sm font-bold text-timber">
                        {s.wins} – {s.losses}
                      </span>
                    </td>

                    {/* Points For */}
                    <td className="px-2 py-3 text-center font-mono text-xs text-timber/70 hidden sm:table-cell">
                      {s.pointsFor}
                    </td>

                    {/* Points Against */}
                    <td className="px-2 py-3 text-center font-mono text-xs text-timber/70 hidden sm:table-cell">
                      {s.pointsAgainst}
                    </td>

                    {/* Point Differential */}
                    <td className="px-3 py-3 text-center font-mono text-xs font-bold">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold ${
                          diff > 0
                            ? 'bg-felt/15 text-felt'
                            : diff < 0
                            ? 'bg-terra/15 text-terra'
                            : 'bg-timber/10 text-timber/50'
                        }`}
                      >
                        {diff > 0 ? (
                          <>
                            <TrendingUp size={11} /> +{diff}
                          </>
                        ) : diff < 0 ? (
                          <>
                            <TrendingDown size={11} /> {diff}
                          </>
                        ) : (
                          <>
                            <Minus size={11} /> 0
                          </>
                        )}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3 text-right hidden md:table-cell">
                      <span
                        className={`font-mono text-[10px] tracking-wider uppercase px-2 py-0.5 rounded font-bold ${
                          isPlayoffSpot && s.played > 0
                            ? 'bg-felt/15 text-felt'
                            : s.played > 0
                            ? 'bg-timber/10 text-timber/60'
                            : 'text-timber/30'
                        }`}
                      >
                        {isPlayoffSpot && s.played > 0 ? 'Top 4' : s.played > 0 ? 'In Contention' : 'Pending'}
                      </span>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
