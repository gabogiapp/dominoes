import React from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle2 } from 'lucide-react';
import { useTournament } from '../context/TournamentContext';

export default function TVOpenTableCard({ tableNumber, queuedMatch }) {
  const { state } = useTournament();
  const teamA = queuedMatch ? state.teams.find(t => t.id === queuedMatch.teamA) : null;
  const teamB = queuedMatch ? state.teams.find(t => t.id === queuedMatch.teamB) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-2 border-dashed border-timber/30 bg-bone/70 rounded-lg overflow-hidden flex flex-col justify-between shadow-xs"
    >
      {/* Table label */}
      <div className="bg-timber/70 text-bone px-4 py-1.5 flex items-center justify-between">
        <span className="font-mono text-xs tracking-widest uppercase font-bold">
          Table {tableNumber}
        </span>
        {queuedMatch ? (
          <span className="font-mono text-[10px] tracking-widest uppercase px-2 py-0.5 rounded bg-brass/25 text-brass font-bold flex items-center gap-1">
            <Clock size={10} /> On Deck
          </span>
        ) : (
          <span className="font-mono text-[10px] tracking-widest uppercase px-2 py-0.5 rounded bg-felt/20 text-felt-light font-bold flex items-center gap-1">
            <CheckCircle2 size={10} /> Open
          </span>
        )}
      </div>

      <div className="p-5 md:p-6 flex-1 flex flex-col items-center justify-center text-center">
        {queuedMatch && teamA && teamB ? (
          <div className="w-full">
            {queuedMatch.groupId && (
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-timber/40 block mb-2 font-bold">
                Pool {queuedMatch.groupId} • Queued
              </span>
            )}

            {/* Team A */}
            <div>
              <p className="font-display text-lg md:text-xl font-bold uppercase tracking-wide text-timber/80">
                {teamA.name}
              </p>
              <p className="font-mono text-[11px] text-timber/40 mt-0.5">
                {teamA.player1} & {teamA.player2}
              </p>
            </div>

            {/* VS divider */}
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-timber/15" />
              <span className="font-display text-xs text-timber/30 tracking-widest">VS</span>
              <div className="flex-1 h-px bg-timber/15" />
            </div>

            {/* Team B */}
            <div>
              <p className="font-display text-lg md:text-xl font-bold uppercase tracking-wide text-timber/80">
                {teamB.name}
              </p>
              <p className="font-mono text-[11px] text-timber/40 mt-0.5">
                {teamB.player1} & {teamB.player2}
              </p>
            </div>

            {/* Status note */}
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded bg-timber/5 text-timber/50 font-mono text-[10px] tracking-wider uppercase">
              <span>Awaiting current round to finish</span>
            </div>
          </div>
        ) : (
          <div className="py-6 space-y-2">
            <div className="w-8 h-8 rounded-full bg-timber/5 border border-timber/10 flex items-center justify-center mx-auto text-timber/40">
              <span className="font-mono text-xs font-bold">{tableNumber}</span>
            </div>
            <p className="font-display text-base uppercase tracking-wider text-timber/50 font-bold">
              Table Available
            </p>
            <p className="font-mono text-xs text-timber/30">
              Ready for upcoming matches
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
