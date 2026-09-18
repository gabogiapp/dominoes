import React from 'react';
import { motion } from 'framer-motion';
import { useTournament } from '../context/TournamentContext';
import { getActiveMatches, isGroupStageComplete } from '../utils/tournamentEngine';
import TVStandingsTable from '../components/TVStandingsTable';
import TVMatchCard from '../components/TVMatchCard';
import { useAdminStatus } from '../utils/storage';
import { Trophy } from 'lucide-react';

export default function TournamentPage() {
  const { state, recordWinner } = useTournament();
  const { stage, matches, groups, teams, champion } = state;
  const isAdmin = useAdminStatus();
  const groupLabels = Object.keys(groups).sort();
  const activeMatches = getActiveMatches(matches, state.tablesCount);
  const groupComplete = isGroupStageComplete(matches);

  // Setup state
  if (stage === 'setup') {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="font-mono text-xs tracking-[0.3em] uppercase text-timber/30 mb-4">
            Tournament
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold uppercase tracking-wider text-timber mb-4">
            Coming Soon
          </h1>
          <div className="h-0.5 bg-terra w-16 mx-auto mb-4" />
          <p className="font-sans text-sm text-timber/40">
            {teams.filter(t => !t.withdrawn).length} teams registered · Waiting for tournament to begin
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {teams.filter(t => !t.withdrawn).map(team => (
              <span key={team.id} className="font-mono text-xs uppercase px-2 py-1 border border-timber/10 rounded text-timber/40">
                {team.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Champion state
  if (stage === 'finished' && champion) {
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
            Birthday Tournament Champion
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
    <div className="min-h-[calc(100vh-56px)] max-w-6xl mx-auto px-4 py-6 md:py-8">
      {/* Stage banner */}
      <div className="text-center mb-6">
        <p className="font-mono text-xs tracking-[0.3em] uppercase text-timber/30 mb-1">
          {stage === 'groups' ? 'Group Stage' : 'Knockout Stage'}
        </p>
        {groupComplete && stage === 'groups' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-display text-sm uppercase tracking-widest text-felt"
          >
            ✦ Group Stage Complete ✦
          </motion.p>
        )}
      </div>

      {/* Active matches */}
      {activeMatches.length > 0 && stage === 'groups' && (
        <div className="mb-8">
          <h2 className="font-mono text-[10px] tracking-[0.2em] uppercase text-timber/30 mb-3 text-center">
            {activeMatches.some(m => !m.winner) ? 'Now Playing' : 'Recent Results'}
          </h2>
          <div className={`grid gap-4 ${activeMatches.length === 1 ? 'max-w-md mx-auto' : 'md:grid-cols-2'}`}>
            {activeMatches.map(match => (
              <TVMatchCard
                key={match.id}
                match={match}
                isAdmin={isAdmin}
                onWinner={recordWinner}
              />
            ))}
          </div>
        </div>
      )}

      {/* Standings */}
      <div>
        <h2 className="font-mono text-[10px] tracking-[0.2em] uppercase text-timber/30 mb-3 text-center">
          Standings
        </h2>
        <div className={`grid gap-4 ${groupLabels.length === 1 ? 'max-w-xl mx-auto' : 'md:grid-cols-2'}`}>
          {groupLabels.map(gid => (
            <TVStandingsTable key={gid} groupId={gid} />
          ))}
        </div>
      </div>

      {/* Match progress */}
      <div className="mt-8 text-center">
        <p className="font-mono text-[10px] text-timber/20 tracking-widest uppercase">
          {matches.filter(m => m.stage === 'group' && m.winner).length} / {matches.filter(m => m.stage === 'group').length} group matches played
        </p>
      </div>
    </div>
  );
}
