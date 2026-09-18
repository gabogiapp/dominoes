import React from 'react';
import { motion } from 'framer-motion';
import { useTournament } from '../context/TournamentContext';
import { useAdminStatus } from '../utils/storage';

// ─── Desktop bracket tree ───────────────────────────────────────────
export default function BracketTree() {
  const { state, recordBracketWinner, resetBracketMatch } = useTournament();
  const { bracket, teams } = state;
  const isAdmin = useAdminStatus();

  if (!bracket || !bracket.rounds) {
    return (
      <div className="text-center py-16">
        <p className="font-display text-xl text-timber/30 uppercase tracking-widest">
          Bracket not yet generated
        </p>
      </div>
    );
  }

  const getTeam = (id) => teams.find(t => t.id === id);

  return (
    <div className="hidden md:block overflow-x-auto py-8">
      <div className="flex items-stretch gap-0 min-w-fit mx-auto justify-center">
        {bracket.rounds.map((round, roundIdx) => (
          <div key={roundIdx} className="flex flex-col items-center justify-center gap-8 px-4">
            {/* Round label */}
            <h3 className="font-display text-xs tracking-[0.2em] uppercase text-timber/40 mb-2">
              {round.name}
            </h3>

            <div className={`flex flex-col gap-8 justify-center ${roundIdx === bracket.rounds.length - 1 ? 'min-h-[200px]' : ''}`}
              style={{ flex: 1, justifyContent: 'space-around' }}
            >
              {round.matches.map((match) => {
                const teamA = getTeam(match.teamA);
                const teamB = getTeam(match.teamB);
                const isFinal = match.round === 'final';
                const hasOnlyTeamA = Boolean(teamA && !match.teamB);
                const hasOnlyTeamB = Boolean(teamB && !match.teamA);

                return (
                  <motion.div
                    key={match.id}
                    layout
                    className={`w-56 border-2 rounded-lg overflow-hidden ${
                      isFinal ? 'border-brass' : 'border-timber'
                    } bg-bone`}
                  >
                    {/* Match slot A */}
                    <div
                      className={`px-3 py-2.5 border-b border-timber/10 flex items-center justify-between transition-all ${
                        match.winner === match.teamA ? 'bg-felt/10' : ''
                      } ${match.winner && match.winner !== match.teamA ? 'opacity-30' : ''}`}
                    >
                      <span className="font-display text-sm uppercase font-bold tracking-wide truncate">
                        {teamA?.name || (!match.teamA && match.teamB && roundIdx === 0 ? (
                          <span className="text-timber/30 italic font-mono text-xs">BYE</span>
                        ) : match.teamA ? '?' : '—')}
                      </span>
                      {match.winner === match.teamA && (
                        <span className="text-felt text-xs font-mono">✦</span>
                      )}
                    </div>

                    {/* Match slot B */}
                    <div
                      className={`px-3 py-2.5 flex items-center justify-between transition-all ${
                        match.winner === match.teamB ? 'bg-felt/10' : ''
                      } ${match.winner && match.winner !== match.teamB ? 'opacity-30' : ''}`}
                    >
                      <span className="font-display text-sm uppercase font-bold tracking-wide truncate">
                        {teamB?.name || (!match.teamB && match.teamA && roundIdx === 0 ? (
                          <span className="text-timber/30 italic font-mono text-xs">BYE</span>
                        ) : match.teamB ? '?' : '—')}
                      </span>
                      {match.winner === match.teamB && (
                        <span className="text-felt text-xs font-mono">✦</span>
                      )}
                    </div>

                    {/* Admin controls */}
                    {isAdmin && !match.winner && (
                      <>
                        {teamA && teamB && (
                          <div className="border-t border-timber/10 p-1.5 flex gap-1">
                            <button
                              onClick={() => recordBracketWinner(match.id, match.teamA)}
                              className="flex-1 py-1.5 text-[10px] font-mono uppercase tracking-wider bg-felt text-bone rounded hover:bg-felt-light active:scale-95 transition-all truncate"
                            >
                              {teamA.name}
                            </button>
                            <button
                              onClick={() => recordBracketWinner(match.id, match.teamB)}
                              className="flex-1 py-1.5 text-[10px] font-mono uppercase tracking-wider bg-felt text-bone rounded hover:bg-felt-light active:scale-95 transition-all truncate"
                            >
                              {teamB.name}
                            </button>
                          </div>
                        )}
                        {hasOnlyTeamA && (
                          <div className="border-t border-timber/10 p-1.5">
                            <button
                              onClick={() => recordBracketWinner(match.id, match.teamA)}
                              className="w-full py-1.5 text-[10px] font-mono uppercase tracking-wider bg-felt text-bone rounded hover:bg-felt-light active:scale-95 transition-all"
                            >
                              Advance {teamA.name} (Bye)
                            </button>
                          </div>
                        )}
                        {hasOnlyTeamB && (
                          <div className="border-t border-timber/10 p-1.5">
                            <button
                              onClick={() => recordBracketWinner(match.id, match.teamB)}
                              className="w-full py-1.5 text-[10px] font-mono uppercase tracking-wider bg-felt text-bone rounded hover:bg-felt-light active:scale-95 transition-all"
                            >
                              Advance {teamB.name} (Bye)
                            </button>
                          </div>
                        )}
                      </>
                    )}
                    {isAdmin && match.winner && (
                      <div className="border-t border-timber/10 p-1.5">
                        <button
                          onClick={() => resetBracketMatch(match.id)}
                          className="w-full py-1 text-[10px] font-mono uppercase tracking-wider text-terra border border-terra/20 rounded hover:bg-terra/10 transition-colors"
                        >
                          Reset Match
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
