import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTournament } from '../context/TournamentContext';
import GroupMatchmaker from '../components/GroupMatchmaker';
import { useAdminStatus } from '../utils/storage';
import { Trophy, PlusCircle, Play } from 'lucide-react';

export default function TournamentPage() {
  const { state, startGroupStage } = useTournament();
  const { stage, groups, teams, champion } = state;
  const isAdmin = useAdminStatus();
  const tablesCount = Math.max(1, state.tablesCount || 2);

  // Setup state
  if (stage === 'setup') {
    const activeTeams = teams.filter(t => !t.withdrawn);
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-4">
        <div className="text-center max-w-lg">
          <p className="font-mono text-xs tracking-[0.3em] uppercase text-timber/30 mb-4">
            Tournament
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold uppercase tracking-wider text-timber mb-4">
            Ready to Begin
          </h1>
          <div className="h-0.5 bg-terra w-16 mx-auto mb-4" />
          <p className="font-sans text-sm text-timber/60 mb-6">
            {activeTeams.length > 0
              ? `${activeTeams.length} teams registered · ${tablesCount} Active ${tablesCount === 1 ? 'Table' : 'Tables'}`
              : 'Registration is currently open · Be the first team to enter the tournament!'}
          </p>

          {activeTeams.length === 0 ? (
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-terra text-bone font-display text-xs uppercase tracking-wider rounded font-bold hover:bg-terra-light transition-all shadow active:scale-95"
            >
              <PlusCircle size={15} /> Register Team Now
            </Link>
          ) : (
            <>
              {isAdmin && (
                <div className="mb-6">
                  <button
                    onClick={startGroupStage}
                    className="px-6 py-3 bg-felt text-bone font-display text-xs uppercase tracking-wider rounded-xl font-bold hover:bg-felt-light transition-all shadow-sm flex items-center justify-center gap-2 mx-auto cursor-pointer"
                  >
                    <Play size={15} /> Start Group Stage
                  </button>
                </div>
              )}

              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {activeTeams.map(team => (
                  <span key={team.id} className="font-mono text-xs uppercase px-2.5 py-1 border border-timber/15 rounded-lg text-timber/70 bg-bone shadow-2xs">
                    {team.name}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Champion state
  if (stage === 'finished') {
    if (champion) {
      return (
        <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-lg"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-brass/20 rounded-full mb-6">
              <Trophy size={40} className="text-brass" />
            </div>
            <p className="font-mono text-xs tracking-[0.3em] uppercase text-timber/40 mb-3">
              Tournament Champion
            </p>
            <h1 className="font-display text-5xl md:text-6xl font-bold uppercase tracking-wider text-timber mb-3">
              {champion.name}
            </h1>
            <div className="h-0.5 bg-brass w-24 mx-auto mb-3" />
            <p className="font-mono text-sm text-timber/50">
              {champion.player1} & {champion.player2}
            </p>
            <p className="font-display text-sm text-terra tracking-widest uppercase mt-6">
              ◆ ◆ ◆
            </p>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-4">
        <div className="text-center max-w-lg">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brass/20 rounded-full mb-4">
            <Trophy size={32} className="text-brass" />
          </div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wider text-timber mb-3">
            Tournament Complete
          </h1>
          <p className="font-sans text-sm text-timber/60 mb-6">
            The tournament has concluded.
          </p>
          <Link
            to="/bracket"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-felt text-bone font-display text-xs uppercase tracking-wider rounded-xl font-bold hover:bg-felt-light"
          >
            View Championship Bracket
          </Link>
        </div>
      </div>
    );
  }

  // Group Stage — Side-by-side workspace with Live Tables and Standby Teams
  return (
    <div className="min-h-[calc(100vh-56px)] max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-6">
      <GroupMatchmaker />
    </div>
  );
}
