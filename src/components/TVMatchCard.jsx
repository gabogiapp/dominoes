import React from 'react';
import { motion } from 'framer-motion';
import { useTournament } from '../context/TournamentContext';

export default function TVMatchCard({ match, isAdmin, onWinner }) {
  const { state } = useTournament();
  const teamA = state.teams.find(t => t.id === match.teamA);
  const teamB = state.teams.find(t => t.id === match.teamB);
  const winnerTeam = match.winner ? state.teams.find(t => t.id === match.winner) : null;

  if (!teamA || !teamB) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-2 border-timber bg-bone rounded-lg overflow-hidden shadow-md"
    >
      {/* Table label */}
      <div className="bg-felt text-bone px-4 py-1.5 flex items-center justify-between">
        <span className="font-mono text-xs tracking-widest uppercase">
          Table {match.table}
        </span>
        {match.groupId && (
          <span className="font-mono text-xs tracking-widest uppercase text-bone/60">
            Pool {match.groupId}
          </span>
        )}
        {match.round && (
          <span className="font-mono text-xs tracking-widest uppercase text-brass">
            {match.round === 'quarter' ? 'QF' : match.round === 'semi' ? 'SF' : 'FINAL'}
          </span>
        )}
      </div>

      <div className="p-5 md:p-6">
        {/* Team A */}
        <div className={`text-center ${match.winner === match.teamA ? 'opacity-100' : match.winner ? 'opacity-40' : ''}`}>
          <p className="font-display text-xl md:text-2xl lg:text-3xl font-bold uppercase tracking-wide">
            {teamA.name}
          </p>
          <p className="font-mono text-xs text-timber/50 mt-0.5">
            {teamA.player1} & {teamA.player2}
          </p>
        </div>

        {/* VS divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-timber/20" />
          <span className="font-display text-sm text-timber/40 tracking-widest">VS</span>
          <div className="flex-1 h-px bg-timber/20" />
        </div>

        {/* Team B */}
        <div className={`text-center ${match.winner === match.teamB ? 'opacity-100' : match.winner ? 'opacity-40' : ''}`}>
          <p className="font-display text-xl md:text-2xl lg:text-3xl font-bold uppercase tracking-wide">
            {teamB.name}
          </p>
          <p className="font-mono text-xs text-timber/50 mt-0.5">
            {teamB.player1} & {teamB.player2}
          </p>
        </div>

        {/* Winner badge */}
        {winnerTeam && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mt-4 text-center"
          >
            <span className="inline-block bg-felt text-bone font-mono text-xs tracking-widest uppercase px-3 py-1 rounded">
              ✦ {winnerTeam.name} wins
            </span>
          </motion.div>
        )}

        {/* Admin winner buttons */}
        {isAdmin && !match.winner && (
          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={() => onWinner(match.id, match.teamA)}
              className="w-full py-3 bg-felt text-bone font-display text-sm uppercase tracking-wider rounded hover:bg-felt-light active:scale-[0.98] transition-all"
            >
              {teamA.name} Wins
            </button>
            <button
              onClick={() => onWinner(match.id, match.teamB)}
              className="w-full py-3 bg-felt text-bone font-display text-sm uppercase tracking-wider rounded hover:bg-felt-light active:scale-[0.98] transition-all"
            >
              {teamB.name} Wins
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
