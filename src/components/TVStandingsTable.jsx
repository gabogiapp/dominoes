import React from 'react';
import { motion } from 'framer-motion';
import { useTournament } from '../context/TournamentContext';
import { calcGroupStandings, getTeamStatus } from '../utils/tournamentEngine';

export default function TVStandingsTable({ groupId }) {
  const { state } = useTournament();
  const teamIds = state.groups[groupId] || [];
  const standings = calcGroupStandings(groupId, teamIds, state.matches, state.overrides);

  const getTeam = (id) => state.teams.find(t => t.id === id);

  return (
    <div className="border-2 border-timber rounded-lg overflow-hidden bg-bone">
      {/* Group header */}
      <div className="bg-timber text-bone px-4 py-2 flex items-center justify-between">
        <span className="font-display text-sm tracking-widest uppercase">
          Pool {groupId}
        </span>
        <span className="font-mono text-xs text-bone/50">
          {teamIds.length} teams
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-timber/10 bg-bone-dark/30">
              <th className="text-left font-mono text-[10px] tracking-widest uppercase text-timber/40 px-3 py-2 w-7">#</th>
              <th className="text-left font-mono text-[10px] tracking-widest uppercase text-timber/40 px-2 py-2">Team</th>
              <th className="text-center font-mono text-[10px] tracking-widest uppercase text-timber/40 px-1 py-2 w-10">GP</th>
              <th className="text-center font-mono text-[10px] tracking-widest uppercase text-timber/40 px-2 py-2 w-16">W – L</th>
              <th className="text-center font-mono text-[10px] tracking-widest uppercase text-timber/40 px-1 py-2 w-12 hidden sm:table-cell">PF</th>
              <th className="text-center font-mono text-[10px] tracking-widest uppercase text-timber/40 px-1 py-2 w-12 hidden sm:table-cell">PA</th>
              <th className="text-center font-mono text-[10px] tracking-widest uppercase text-timber/40 px-2 py-2 w-16">Diff (±)</th>
              <th className="text-right font-mono text-[10px] tracking-widest uppercase text-timber/40 px-3 py-2 w-24">Status</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, idx) => {
              const team = getTeam(s.teamId);
              if (!team) return null;
              const status = getTeamStatus(s.teamId, groupId, standings, state.groups, state.matches, state.overrides);
              const isAdvancing = status === 'ADVANCING';
              const isEliminated = status === 'ELIMINATED';
              const diff = s.diff || 0;

              return (
                <motion.tr
                  key={s.teamId}
                  layout
                  className={`border-b border-timber/5 last:border-b-0 transition-colors ${
                    team.withdrawn ? 'opacity-30 line-through' : ''
                  } ${isAdvancing ? 'bg-felt/5' : ''}`}
                >
                  <td className="px-3 py-3 font-mono text-xs text-timber/40 font-bold">
                    {idx + 1}
                  </td>
                  <td className="px-2 py-3">
                    <p className={`font-display text-sm md:text-base uppercase font-bold tracking-wide ${isEliminated ? 'text-timber/30' : 'text-timber'}`}>
                      {team.name}
                    </p>
                    <p className="font-mono text-[10px] text-timber/40 mt-0.5">
                      {team.player1} & {team.player2}
                    </p>
                  </td>
                  <td className="px-1 py-3 text-center font-mono text-xs text-timber/60">
                    {s.played}
                  </td>
                  <td className="px-2 py-3 text-center">
                    <span className={`font-mono text-xs md:text-sm font-bold ${isEliminated ? 'text-timber/30' : 'text-timber'}`}>
                      {s.wins} – {s.losses}
                    </span>
                  </td>
                  <td className="px-1 py-3 text-center font-mono text-xs text-timber/60 hidden sm:table-cell">
                    {s.pointsFor || 0}
                  </td>
                  <td className="px-1 py-3 text-center font-mono text-xs text-timber/60 hidden sm:table-cell">
                    {s.pointsAgainst || 0}
                  </td>
                  <td className="px-2 py-3 text-center font-mono text-xs font-bold">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                        diff > 0
                          ? 'bg-felt/15 text-felt'
                          : diff < 0
                          ? 'bg-terra/15 text-terra'
                          : 'bg-timber/10 text-timber/50'
                      }`}
                    >
                      {diff > 0 ? `+${diff}` : diff}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    {status && (
                      <span className={`font-mono text-[9px] md:text-[10px] tracking-widest uppercase px-1.5 py-0.5 rounded ${
                        isAdvancing
                          ? 'bg-felt text-bone'
                          : isEliminated
                          ? 'bg-timber/10 text-timber/30'
                          : status === 'IN CONTENTION'
                          ? 'bg-brass/20 text-timber/60'
                          : 'text-timber/40'
                      }`}>
                        {status}
                      </span>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
