import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, ArrowRight, Zap, RefreshCw, Layers } from 'lucide-react';
import DominoCascade from '../components/animations/DominoCascade';
import DominoSlam from '../components/animations/DominoSlam';
import DominoShuffle from '../components/animations/DominoShuffle';
import { useTournament } from '../context/TournamentContext';

export default function LandingPage() {
  const { state } = useTournament();
  const [activeAnimationTab, setActiveAnimationTab] = useState('cascade'); // 'cascade' | 'slam' | 'shuffle'
  const activeTeams = state.teams.filter((t) => !t.withdrawn);

  const stageLabel = {
    setup: 'Registration Open',
    groups: 'Group Stage Live',
    knockout: 'Knockout Stage',
    finished: 'Tournament Complete',
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col justify-between">
      {/* Main Streamlined Hero Section */}
      <section className="relative overflow-hidden flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-20 text-center">
        {/* Subtle Felt/Grain Backdrop */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 24px, #1E1611 24px, #1E1611 25px)`,
          }}
        />

        <div className="relative max-w-3xl mx-auto w-full">
          {/* Tagline / Subtitle */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-terra" />
            <span className="font-mono text-xs tracking-[0.3em] uppercase text-timber/60 font-semibold">
              Bodega Social Club Presents
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-terra" />
          </div>

          {/* Tournament Title */}
          <h1 className="font-display text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold uppercase tracking-wide text-timber leading-[1.1] mb-3 max-w-full">
            {(state.config?.tournamentName || 'Dominoes Tournament').split(' ').map((word, i) => (
              <span key={i} className="inline-block mx-1.5">{word}</span>
            ))}
          </h1>

          {/* Minimal Accent Divider */}
          <div className="h-0.5 bg-terra w-16 sm:w-20 mx-auto mb-3" />

          {/* Minimal Event Meta */}
          <p className="font-mono text-[11px] sm:text-sm tracking-wider uppercase text-timber/60 mb-4 sm:mb-6">
            {state.config?.eventDate || 'October 17th 2026'} · 2v2 Invitational
          </p>

          {/* Interactive Domino Centerpiece */}
          <div className="my-6 p-3 sm:p-6 bg-timber/[0.02] border border-timber/10 rounded-2xl backdrop-blur-xs max-w-xl mx-auto shadow-xs">
            {/* Mode Switcher */}
            <div className="grid grid-cols-3 gap-1 mb-4 border-b border-timber/10 pb-3 max-w-sm mx-auto">
              <button
                onClick={() => setActiveAnimationTab('cascade')}
                className={`px-2 py-1.5 rounded-lg font-mono text-[10px] sm:text-xs tracking-wider uppercase font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeAnimationTab === 'cascade'
                    ? 'bg-timber text-bone shadow-xs'
                    : 'text-timber/60 hover:text-timber hover:bg-timber/5'
                }`}
              >
                <Layers size={12} /> Cascade
              </button>
              <button
                onClick={() => setActiveAnimationTab('slam')}
                className={`px-2 py-1.5 rounded-lg font-mono text-[10px] sm:text-xs tracking-wider uppercase font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeAnimationTab === 'slam'
                    ? 'bg-terra text-bone shadow-xs'
                    : 'text-timber/60 hover:text-timber hover:bg-timber/5'
                }`}
              >
                <Zap size={12} /> Slam
              </button>
              <button
                onClick={() => setActiveAnimationTab('shuffle')}
                className={`px-2 py-1.5 rounded-lg font-mono text-[10px] sm:text-xs tracking-wider uppercase font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeAnimationTab === 'shuffle'
                    ? 'bg-felt text-bone shadow-xs'
                    : 'text-timber/60 hover:text-timber hover:bg-timber/5'
                }`}
              >
                <RefreshCw size={12} /> Shuffle
              </button>
            </div>

            {/* Animation Render */}
            <div className="min-h-[160px] flex items-center justify-center">
              {activeAnimationTab === 'cascade' && (
                <DominoCascade
                  tiles={[
                    { top: 6, bottom: 6 },
                    { top: 6, bottom: 5 },
                    { top: 5, bottom: 5 },
                    { top: 5, bottom: 4 },
                    { top: 4, bottom: 4 },
                    { top: 3, bottom: 3 },
                    { top: 2, bottom: 2 },
                  ]}
                  size="sm"
                />
              )}
              {activeAnimationTab === 'slam' && (
                <DominoSlam tile={{ top: 6, bottom: 6 }} size="md" />
              )}
              {activeAnimationTab === 'shuffle' && (
                <DominoShuffle size="xs" />
              )}
            </div>
          </div>

          {/* Registration Status Pill */}
          <div className="flex items-center justify-center gap-2 mb-6 sm:mb-8 px-2">
            <span className="font-mono text-[10px] sm:text-xs tracking-wider uppercase px-3 py-1.5 rounded-full border border-brass text-timber/80 bg-brass/10 font-medium flex items-center gap-1.5 text-center">
              <span className="w-2 h-2 rounded-full bg-terra inline-block shrink-0" />
              <span>{stageLabel[state.stage]} · {activeTeams.length} Teams Registered</span>
            </span>
          </div>

          {/* Primary Streamlined CTA Button */}
          <div className="flex flex-col items-center gap-4">
            <Link
              to="/signup"
              className="w-full sm:w-auto min-w-[280px] px-8 py-4 bg-terra hover:bg-terra-light text-bone font-display text-base md:text-lg uppercase tracking-wider rounded-xl font-bold shadow-md hover:shadow-lg active:scale-98 transition-all flex items-center justify-center gap-3 cursor-pointer group"
            >
              <Users size={18} />
              <span>Register Your Team</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>

            {/* Understated Secondary Links */}
            <div className="flex items-center justify-center flex-wrap gap-4 text-xs font-mono tracking-wider uppercase text-timber/60 mt-2">
              <Link
                to="/teams"
                className="hover:text-terra transition-colors underline decoration-timber/20 underline-offset-4"
              >
                View Teams Roster ({activeTeams.length})
              </Link>
              <span className="text-timber/30">·</span>
              <Link
                to="/tournament"
                className="hover:text-terra transition-colors underline decoration-timber/20 underline-offset-4"
              >
                Standings & Bracket
              </Link>
              <span className="text-timber/30">·</span>
              <Link
                to="/rules"
                className="hover:text-terra transition-colors underline decoration-timber/20 underline-offset-4"
              >
                Tournament Rules
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Streamlined Minimal Footer */}
      <footer className="py-6 border-t border-timber/10 text-center bg-bone">
        <p className="font-mono text-[10px] tracking-widest uppercase text-timber/40">
          Bodega Social Club · Dominoes Invitational Tournament
        </p>
      </footer>
    </div>
  );
}
