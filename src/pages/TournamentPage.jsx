import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTournament } from '../context/TournamentContext';
import { getActiveMatches, isGroupStageComplete } from '../utils/tournamentEngine';
import TVStandingsTable from '../components/TVStandingsTable';
import TVMatchCard from '../components/TVMatchCard';
import TVOpenTableCard from '../components/TVOpenTableCard';
import TableDispatcher from '../components/TableDispatcher';
import TVOpenStandingsTable from '../components/TVOpenStandingsTable';
import { useAdminStatus } from '../utils/storage';
import { Trophy, PlusCircle, Play, Layers, ArrowRightLeft } from 'lucide-react';

export default function TournamentPage() {
  const { state, recordWinner, startOpenStage, startGroupStage } = useTournament();
  const { stage, matches, groups, teams, champion } = state;
  const isAdmin = useAdminStatus();
  const tablesCount = Math.max(1, state.tablesCount || 2);
  const tableSlots = Array.from({ length: tablesCount }, (_, i) => i + 1);
  const groupLabels = Object.keys(groups).sort();
  const activeMatches = getActiveMatches(matches, tablesCount);
  const groupComplete = isGroupStageComplete(matches);

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
                <div className="mb-6 p-5 border-2 border-felt/30 bg-felt/5 rounded-2xl">
                  <span className="font-mono text-xs uppercase tracking-widest text-felt font-bold block mb-2">
                    ◆ Tournament Mode Selector
                  </span>
                  <p className="font-sans text-xs text-timber/70 mb-4">
                    Choose how you want to manage matches:
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={startOpenStage}
                      className="px-5 py-3 bg-felt text-bone font-display text-xs uppercase tracking-wider rounded-xl font-bold hover:bg-felt-light transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play size={14} /> Start Table Queue (Manual Dispatch)
                    </button>
                    <button
                      onClick={startGroupStage}
                      className="px-4 py-3 bg-bone border border-timber/20 text-timber font-mono text-xs uppercase tracking-wider rounded-xl font-bold hover:bg-timber/5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Layers size={13} /> Group Pools
                    </button>
                  </div>
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

  // Open Table Queue stage (Manual Dispatch & Point Differentials)
  if (stage === 'open') {
    return (
      <div className="min-h-[calc(100vh-56px)] max-w-6xl mx-auto px-4 py-6 md:py-8 space-y-8">
        {/* Banner */}
        <div className="text-center">
          <p className="font-mono text-xs tracking-[0.3em] uppercase text-timber/40 mb-1">
            Live Tournament Stage
          </p>
          <h1 className="font-display text-2xl md:text-4xl font-bold uppercase tracking-wider text-timber">
            Table Queue & Standby Arena
          </h1>
          <div className="h-0.5 bg-felt w-16 mx-auto mt-2 mb-2" />
          <p className="font-mono text-xs text-timber/60">
            Manual Table Dispatch · Standby Queue · Wins, Losses & Point Differentials (±)
          </p>
        </div>

        {/* Table Dispatcher Component */}
        <TableDispatcher />

        {/* Standings Leaderboard */}
        <TVOpenStandingsTable />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)] max-w-6xl mx-auto px-4 py-6 md:py-8">
      {/* Switch to manual banner for admin if currently in groups */}
      {isAdmin && stage === 'groups' && (
        <div className="mb-6 p-3 bg-felt/10 border border-felt/20 rounded-xl flex items-center justify-between gap-3 text-xs">
          <span className="font-mono text-timber/70">
            Prefer manual table dispatch without fixed pools?
          </span>
          <button
            onClick={startOpenStage}
            className="px-3 py-1.5 bg-felt text-bone font-mono text-xs uppercase tracking-wider rounded-lg font-bold hover:bg-felt-light transition-all cursor-pointer flex items-center gap-1 shrink-0"
          >
            <ArrowRightLeft size={12} /> Switch to Table Queue
          </button>
        </div>
      )}

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
      {matches.length > 0 && stage === 'groups' && (
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-felt" />
            <h2 className="font-mono text-[10px] tracking-[0.2em] uppercase text-timber/60 font-bold">
              {activeMatches.some(m => !m.winner)
                ? `Now Playing · ${tablesCount} ${tablesCount === 1 ? 'Table' : 'Active Tables'}`
                : `Recent Results · ${tablesCount} ${tablesCount === 1 ? 'Table' : 'Tables'}`}
            </h2>
            <span className="w-1.5 h-1.5 rounded-full bg-felt" />
          </div>

          <div
            className={
              tablesCount === 1
                ? 'max-w-md mx-auto'
                : tablesCount === 2
                ? 'grid grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-4'
                : tablesCount === 3
                ? 'grid grid-cols-1 md:grid-cols-3 max-w-6xl mx-auto gap-4'
                : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto gap-4'
            }
          >
            {tableSlots.map(tableNum => {
              const activeMatch = activeMatches.find(m => m.table === tableNum);
              if (activeMatch) {
                return (
                  <TVMatchCard
                    key={activeMatch.id}
                    match={activeMatch}
                    isAdmin={isAdmin}
                    onWinner={recordWinner}
                  />
                );
              }

              // Fallback: if an unplayed match exists for this table slot, activate it as playable
              const nextUnplayed = matches.find(m =>
                m.stage === 'group' &&
                !m.winner &&
                !activeMatches.some(a => a.id === m.id) &&
                m.table === tableNum
              ) || matches.find(m =>
                m.stage === 'group' &&
                !m.winner &&
                !activeMatches.some(a => a.id === m.id)
              );

              if (nextUnplayed) {
                return (
                  <TVMatchCard
                    key={nextUnplayed.id}
                    match={{ ...nextUnplayed, table: tableNum }}
                    isAdmin={isAdmin}
                    onWinner={recordWinner}
                  />
                );
              }

              return (
                <TVOpenTableCard
                  key={`table-slot-${tableNum}`}
                  tableNumber={tableNum}
                />
              );
            })}
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
        <p className="font-mono text-[10px] text-timber/40 tracking-widest uppercase">
          {matches.filter(m => m.stage === 'group' && m.winner).length} / {matches.filter(m => m.stage === 'group').length} group matches played · {tablesCount} {tablesCount === 1 ? 'Active Table' : 'Active Tables'}
        </p>
      </div>
    </div>
  );
}
