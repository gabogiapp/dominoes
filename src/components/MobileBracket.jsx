import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTournament } from '../context/TournamentContext';
import { useAdminStatus } from '../utils/storage';

// ─── Mobile bracket with round tabs ─────────────────────────────────
export default function MobileBracket() {
  const { state, recordBracketWinner, resetBracketMatch } = useTournament();
  const { bracket, teams } = state;
  const isAdmin = useAdminStatus();
  const [activeRound, setActiveRound] = useState(0);

  if (!bracket || !bracket.rounds) {
    return (
      <div className="text-center py-12 px-4">
        <p className="font-display text-lg text-timber/30 uppercase tracking-widest">
          Bracket not yet generated
        </p>
      </div>
    );
  }

  const getTeam = (id) => teams.find(t => t.id === id);
  const round = bracket.rounds[activeRound] || bracket.rounds[0];

  return (
    <div className="md:hidden">
      {/* Round tabs */}
      <div className="flex border-b-2 border-timber/10 overflow-x-auto">
        {bracket.rounds.map((r, idx) => (
          <button
            key={idx}
            onClick={() => setActiveRound(idx)}
            className={`flex-1 min-w-fit px-4 py-3 font-mono text-xs tracking-widest uppercase whitespace-nowrap transition-colors ${
              activeRound === idx
                ? 'border-b-2 border-terra text-terra font-bold'
                : 'text-timber/40'
            }`}
          >
            {r.name}
          </button>
        ))}
      </div>

      {/* Matches for active round */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeRound}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="p-4 flex flex-col gap-4"
        >
          {round.matches.map((match) => {
            const teamA = getTeam(match.teamA);
            const teamB = getTeam(match.teamB);
            const isFinal = match.round === 'final';
            const hasOnlyTeamA = Boolean(teamA && !match.teamB);
            const hasOnlyTeamB = Boolean(teamB && !match.teamA);

            return (
              <div
                key={match.id}
                className={`border-2 rounded-lg overflow-hidden ${
                  isFinal ? 'border-brass' : 'border-timber'
                } bg-bone`}
              >
                <div className="bg-felt/5 px-3 py-1.5 flex items-center justify-between">
                  <span className="font-mono text-[10px] tracking-widest uppercase text-timber/40">
                    Match {match.matchNum} • Table {match.table}
                  </span>
                  {match.winner && (
                    <span className="font-mono text-[10px] tracking-widest uppercase text-felt font-bold">
                      Completed
                    </span>
                  )}
                </div>

                {/* Team A */}
                <div className={`px-4 py-3 border-b border-timber/10 ${
                  match.winner === match.teamA ? 'bg-felt/10' : ''
                } ${match.winner && match.winner !== match.teamA ? 'opacity-30' : ''}`}>
                  <p className="font-display text-lg uppercase font-bold tracking-wide">
                    {teamA?.name || (!match.teamA && match.teamB && activeRound === 0 ? (
                      <span className="text-timber/30 italic font-mono text-sm">BYE</span>
                    ) : match.teamA ? '?' : '—')}
                  </p>
                  {teamA && (
                    <p className="font-mono text-[10px] text-timber/40">
                      {teamA.player1} & {teamA.player2}
                    </p>
                  )}
                </div>

                {/* VS */}
                <div className="px-4 py-1 text-center">
                  <span className="font-display text-xs text-timber/30 tracking-widest">VS</span>
                </div>

                {/* Team B */}
                <div className={`px-4 py-3 border-t border-timber/10 ${
                  match.winner === match.teamB ? 'bg-felt/10' : ''
                } ${match.winner && match.winner !== match.teamB ? 'opacity-30' : ''}`}>
                  <p className="font-display text-lg uppercase font-bold tracking-wide">
                    {teamB?.name || (!match.teamB && match.teamA && activeRound === 0 ? (
                      <span className="text-timber/30 italic font-mono text-sm">BYE</span>
                    ) : match.teamB ? '?' : '—')}
                  </p>
                  {teamB && (
                    <p className="font-mono text-[10px] text-timber/40">
                      {teamB.player1} & {teamB.player2}
                    </p>
                  )}
                </div>

                {/* Admin controls */}
                {isAdmin && !match.winner && (
                  <div className="border-t border-timber/10 p-2 flex flex-col gap-2">
                    {teamA && teamB && (
                      <>
                        <button
                          onClick={() => recordBracketWinner(match.id, match.teamA)}
                          className="w-full py-3 bg-felt text-bone font-display text-sm uppercase tracking-wider rounded hover:bg-felt-light active:scale-[0.98] transition-all"
                        >
                          {teamA.name} Wins
                        </button>
                        <button
                          onClick={() => recordBracketWinner(match.id, match.teamB)}
                          className="w-full py-3 bg-felt text-bone font-display text-sm uppercase tracking-wider rounded hover:bg-felt-light active:scale-[0.98] transition-all"
                        >
                          {teamB.name} Wins
                        </button>
                      </>
                    )}
                    {hasOnlyTeamA && (
                      <button
                        onClick={() => recordBracketWinner(match.id, match.teamA)}
                        className="w-full py-3 bg-felt text-bone font-display text-sm uppercase tracking-wider rounded hover:bg-felt-light active:scale-[0.98] transition-all"
                      >
                        Advance {teamA.name} (Bye)
                      </button>
                    )}
                    {hasOnlyTeamB && (
                      <button
                        onClick={() => recordBracketWinner(match.id, match.teamB)}
                        className="w-full py-3 bg-felt text-bone font-display text-sm uppercase tracking-wider rounded hover:bg-felt-light active:scale-[0.98] transition-all"
                      >
                        Advance {teamB.name} (Bye)
                      </button>
                    )}
                  </div>
                )}
                {isAdmin && match.winner && (
                  <div className="border-t border-timber/10 p-2">
                    <button
                      onClick={() => resetBracketMatch(match.id)}
                      className="w-full py-2 text-xs font-mono uppercase tracking-wider text-terra border border-terra/20 rounded hover:bg-terra/10 transition-colors"
                    >
                      Reset Match
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
