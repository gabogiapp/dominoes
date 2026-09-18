import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, BookOpen, Users, Search, PlusCircle, Sparkles, UserCheck } from 'lucide-react';
import DominoTile from '../components/DominoTile';
import { useTournament } from '../context/TournamentContext';

export default function LandingPage() {
  const { state } = useTournament();
  const [searchTerm, setSearchTerm] = useState('');

  const stageLabel = {
    setup: 'Registration Open',
    groups: 'Group Stage Live',
    knockout: 'Knockout Stage',
    finished: 'Tournament Complete',
  };

  const activeTeams = state.teams.filter(t => !t.withdrawn);
  const filteredTeams = activeTeams.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.player1.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.player2.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Find pool for each team if assigned
  const getTeamPool = (teamId) => {
    if (!state.groups) return null;
    for (const [pool, teamIds] of Object.entries(state.groups)) {
      if (teamIds.includes(teamId)) return pool;
    }
    return null;
  };

  return (
    <div className="min-h-[calc(100vh-56px)]">
      {/* Hero */}
      <section className="relative overflow-hidden border-b-2 border-timber">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, #1E1611 20px, #1E1611 21px)`,
        }} />

        <div className="relative max-w-4xl mx-auto px-4 py-14 md:py-20 text-center">
          {/* Decorative dominoes */}
          <div className="flex justify-center gap-3 mb-6 opacity-30">
            <DominoTile top={6} bottom={6} size="sm" />
            <DominoTile top={5} bottom={4} size="sm" />
            <DominoTile top={3} bottom={2} size="sm" />
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-xs tracking-[0.3em] uppercase text-timber/40 mb-3"
          >
            Bodega Social Club Presents
          </motion.p>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl md:text-6xl lg:text-7xl font-bold uppercase tracking-wider text-timber leading-tight mb-4"
          >
            {state.config?.tournamentName || 'Dominoes Tournament'}
          </motion.h1>

          {/* Divider */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="h-0.5 bg-terra w-24 mx-auto mb-4"
          />

          {/* Date */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="font-mono text-sm tracking-widest uppercase text-timber/50 mb-2"
          >
            {state.config?.eventDate || 'October 17th 2026'}
          </motion.p>

          {/* Format */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="font-sans text-base text-timber/60 mb-6 max-w-md mx-auto"
          >
            2v2 Dominoes Tournament · Round-Robin Groups · Single Elimination Knockout
          </motion.p>

          {/* Badges row */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-2 mb-8"
          >
            <span className={`font-mono text-xs tracking-[0.2em] uppercase px-4 py-2 rounded-full border-2 ${
              state.stage === 'setup' ? 'border-brass text-brass bg-brass/5' :
              state.stage === 'groups' ? 'border-felt text-felt bg-felt/5' :
              state.stage === 'knockout' ? 'border-terra text-terra bg-terra/5' :
              'border-brass text-brass bg-brass/5'
            }`}>
              ◆ {stageLabel[state.stage]}
            </span>

            <a
              href="#contenders-roster"
              className="font-mono text-xs tracking-wider uppercase px-3.5 py-2 rounded-full border border-timber/20 text-timber/70 hover:text-timber hover:border-timber/40 bg-bone transition-all flex items-center gap-1.5"
            >
              <Users size={13} className="text-terra" />
              <span>{activeTeams.length} Teams Registered</span>
            </a>
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            {state.stage === 'setup' && (
              <Link
                to="/signup"
                className="w-full sm:w-auto px-8 py-3.5 bg-terra text-bone font-display text-sm uppercase tracking-wider rounded hover:bg-terra-light active:scale-[0.98] transition-all flex items-center justify-center gap-2 font-bold shadow"
              >
                <Users size={16} /> Register Your Team
              </Link>
            )}
            <Link
              to="/tournament"
              className="w-full sm:w-auto px-8 py-3.5 bg-felt text-bone font-display text-sm uppercase tracking-wider rounded hover:bg-felt-light active:scale-[0.98] transition-all flex items-center justify-center gap-2 font-bold"
            >
              <Trophy size={16} /> View Standings
            </Link>
            <Link
              to="/rules"
              className="w-full sm:w-auto px-8 py-3.5 border-2 border-timber text-timber font-display text-sm uppercase tracking-wider rounded hover:bg-timber hover:text-bone active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <BookOpen size={16} /> Rules
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Info section */}
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Format */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-felt/10 rounded-full mb-3">
              <span className="font-display text-lg text-felt">◆</span>
            </div>
            <h3 className="font-display text-sm uppercase tracking-widest text-timber font-bold mb-2">
              Group Stage
            </h3>
            <p className="font-sans text-sm text-timber/50">
              Teams are divided into pools and play every other team in their pool. Top teams advance.
            </p>
          </div>

          {/* Knockout */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-terra/10 rounded-full mb-3">
              <span className="font-display text-lg text-terra">✦</span>
            </div>
            <h3 className="font-display text-sm uppercase tracking-widest text-timber font-bold mb-2">
              Single Elimination
            </h3>
            <p className="font-sans text-sm text-timber/50">
              Win or go home. Top teams from each pool battle it out for the championship.
            </p>
          </div>

          {/* Champion */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-brass/10 rounded-full mb-3">
              <Trophy size={20} className="text-brass" />
            </div>
            <h3 className="font-display text-sm uppercase tracking-widest text-timber font-bold mb-2">
              Champion
            </h3>
            <p className="font-sans text-sm text-timber/50">
              One team walks away with the crown and birthday bragging rights.
            </p>
          </div>
        </div>
      </section>

      {/* Roster / Contenders Section */}
      <section id="contenders-roster" className="border-t-2 border-timber/10 bg-timber/[0.02] py-14 px-4 scroll-mt-16">
        <div className="max-w-5xl mx-auto">
          {/* Section header */}
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs tracking-[0.25em] uppercase text-terra font-bold">
                  The Contenders
                </span>
                <span className="font-mono text-[10px] uppercase bg-timber/10 text-timber/70 px-2 py-0.5 rounded-full font-semibold">
                  {activeTeams.length} Teams · {activeTeams.length * 2} Players
                </span>
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-bold uppercase tracking-wider text-timber">
                Registered Teams Roster
              </h2>
            </div>

            {/* Search & Action */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-timber/30" />
                <input
                  type="text"
                  placeholder="Search teams or players..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-bone border border-timber/20 rounded font-mono text-xs placeholder:text-timber/30 focus:outline-none focus:border-felt"
                />
              </div>
              {state.stage === 'setup' && (
                <Link
                  to="/signup"
                  className="px-3.5 py-2 bg-terra text-bone font-mono text-xs uppercase tracking-wider rounded font-bold hover:bg-terra-light transition-colors whitespace-nowrap flex items-center gap-1.5"
                >
                  <PlusCircle size={14} /> Join
                </Link>
              )}
            </div>
          </div>

          {/* Teams Grid */}
          {activeTeams.length === 0 ? (
            <div className="text-center py-12 px-4 border-2 border-dashed border-timber/20 rounded-xl bg-bone">
              <div className="w-12 h-12 bg-terra/10 rounded-full flex items-center justify-center mx-auto mb-3 text-terra">
                <Users size={24} />
              </div>
              <h3 className="font-display text-lg uppercase tracking-wider text-timber font-bold mb-1">
                No Teams Registered Yet
              </h3>
              <p className="font-sans text-xs text-timber/50 max-w-sm mx-auto mb-4">
                Be the very first 2-player team to claim your spot in the tournament!
              </p>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-terra text-bone font-display text-xs uppercase tracking-wider rounded font-bold hover:bg-terra-light transition-all"
              >
                <PlusCircle size={14} /> Register Your Team Now
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {filteredTeams.map((team, idx) => {
                const pool = getTeamPool(team.id);
                return (
                  <motion.div
                    key={team.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="border-2 border-timber/15 hover:border-timber/30 bg-bone rounded-xl p-4 transition-all duration-200 hover:shadow-md group flex flex-col justify-between"
                  >
                    <div>
                      {/* Top badge row */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono text-[10px] text-timber/30 font-bold">
                          #{idx + 1}
                        </span>
                        {pool && (
                          <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-felt/10 text-felt font-bold">
                            Pool {pool}
                          </span>
                        )}
                      </div>

                      {/* Team Name */}
                      <h3 className="font-display text-base md:text-lg uppercase font-bold text-timber group-hover:text-terra transition-colors truncate">
                        {team.name}
                      </h3>
                    </div>

                    {/* Players */}
                    <div className="mt-3 pt-3 border-t border-timber/10 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <UserCheck size={13} className="text-felt shrink-0" />
                        <p className="font-mono text-[11px] text-timber/60 truncate">
                          <span className="text-timber/80 font-medium">{team.player1}</span> & <span className="text-timber/80 font-medium">{team.player2}</span>
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Quick invite slot */}
              {state.stage === 'setup' && (
                <Link
                  to="/signup"
                  className="border-2 border-dashed border-terra/40 hover:border-terra bg-terra/[0.03] hover:bg-terra/[0.06] rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all group min-h-[110px]"
                >
                  <PlusCircle size={22} className="text-terra mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="font-display text-xs uppercase font-bold text-timber tracking-wider">
                    Register Next Team
                  </span>
                  <span className="font-mono text-[9px] text-timber/40 mt-0.5">
                    Click to sign up
                  </span>
                </Link>
              )}
            </div>
          )}

          {filteredTeams.length === 0 && activeTeams.length > 0 && (
            <div className="text-center py-8">
              <p className="font-mono text-xs text-timber/40">No teams matching "{searchTerm}"</p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-timber/10 py-8 text-center bg-bone">
        <p className="font-mono text-[10px] tracking-widest uppercase text-timber/30">
          Bodega Social Club · Dominoes Tournament System
        </p>
      </footer>
    </div>
  );
}
