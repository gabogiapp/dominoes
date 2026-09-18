import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Search, PlusCircle, UserCheck, Trophy, Sparkles, Filter, RefreshCw } from 'lucide-react';
import DominoTile from '../components/DominoTile';
import DominoFlipCard from '../components/animations/DominoFlipCard';
import { useTournament } from '../context/TournamentContext';

export default function TeamsPage() {
  const { state, syncWithGoogleSheet } = useTournament();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPool, setSelectedPool] = useState('ALL');
  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(null);

  const handleSyncSheet = async () => {
    setSyncing(true);
    const res = await syncWithGoogleSheet(true);
    setSyncing(false);
    if (res.success) {
      setSyncFeedback(res.count > 0 ? `Synced ${res.count} team(s)` : (res.rawCount > 0 ? `${res.rawCount} registered, 0 marked Paid` : 'Sheet checked · 0 teams'));
      setTimeout(() => setSyncFeedback(null), 3500);
    } else {
      setSyncFeedback('Sync failed');
      setTimeout(() => setSyncFeedback(null), 3500);
    }
  };

  // Automatically sync on initial mount if roster is empty during setup
  React.useEffect(() => {
    if (state.stage === 'setup' && state.teams.length === 0 && !state.isDemo) {
      syncWithGoogleSheet(true);
    }
  }, [state.stage, state.teams.length, state.isDemo, syncWithGoogleSheet]);

  const activeTeams = useMemo(
    () => state.teams.filter((t) => !t.withdrawn),
    [state.teams]
  );

  // Find pool for each team if assigned
  const getTeamPool = (teamId) => {
    if (!state.groups) return null;
    for (const [pool, teamIds] of Object.entries(state.groups)) {
      if (teamIds.includes(teamId)) return pool;
    }
    return null;
  };

  // Get list of unique pools available
  const availablePools = useMemo(() => {
    if (!state.groups) return [];
    return Object.keys(state.groups).sort();
  }, [state.groups]);

  // Filtered teams based on search & pool
  const filteredTeams = useMemo(() => {
    return activeTeams.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.player1.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.player2.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedPool === 'ALL') return true;
      const pool = getTeamPool(t.id);
      return pool === selectedPool;
    });
  }, [activeTeams, searchTerm, selectedPool, state.groups]);

  // Generate deterministic domino pips for each team based on team id/index
  const getTeamDomino = (index) => {
    const pairs = [
      [6, 6], [6, 5], [5, 5], [6, 4], [5, 4], [4, 4],
      [6, 3], [5, 3], [4, 3], [3, 3], [6, 2], [5, 2],
      [4, 2], [3, 2], [2, 2], [6, 1], [5, 1], [4, 1]
    ];
    return pairs[index % pairs.length];
  };

  return (
    <div className="min-h-[calc(100vh-56px)] max-w-6xl mx-auto px-4 py-8 md:py-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b-2 border-timber/15 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-xs tracking-[0.25em] uppercase text-terra font-bold">
              Tournament Roster
            </span>
            <span className="font-mono text-[11px] uppercase bg-timber/10 text-timber px-2.5 py-0.5 rounded-full font-semibold">
              {activeTeams.length} Teams · {activeTeams.length * 2} Players
            </span>
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold uppercase tracking-wider text-timber">
            Registered Teams
          </h1>
          {syncFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-felt/10 border border-felt/30 rounded text-[11px] font-mono text-felt font-bold"
            >
              <span>✓ {syncFeedback}</span>
            </motion.div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {state.stage === 'setup' && (
            <button
              onClick={handleSyncSheet}
              disabled={syncing}
              className="px-3.5 py-3 bg-bone border-2 border-timber/20 hover:border-timber text-timber font-mono text-xs uppercase tracking-wider rounded-lg flex items-center gap-2 transition-all hover:bg-bone-dark shadow-xs disabled:opacity-50 cursor-pointer"
              title="Pull latest registrations and paid status from Google Sheet"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin text-felt' : 'text-timber/60'} />
              <span>{syncing ? 'Syncing...' : 'Sync Sheet'}</span>
            </button>
          )}

          {state.stage === 'setup' && (
            <Link
              to="/signup"
              className="px-6 py-3 bg-terra text-bone font-display text-sm uppercase tracking-wider rounded-lg font-bold hover:bg-terra-light transition-all shadow flex items-center justify-center gap-2 active:scale-95"
            >
              <PlusCircle size={16} /> Register Your Team
            </Link>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8 bg-bone-dark/50 p-3 rounded-xl border border-timber/10">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-timber/40" />
          <input
            type="text"
            placeholder="Search teams or players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-bone border border-timber/20 rounded-lg font-mono text-xs placeholder:text-timber/40 focus:outline-none focus:border-felt"
          />
        </div>

        {/* Pool Filter Buttons if pools exist */}
        {availablePools.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedPool('ALL')}
              className={`px-3 py-1.5 rounded text-xs font-mono tracking-wider uppercase font-semibold transition-colors ${
                selectedPool === 'ALL'
                  ? 'bg-timber text-bone'
                  : 'bg-bone text-timber/70 hover:text-timber border border-timber/15'
              }`}
            >
              All Pools
            </button>
            {availablePools.map((pool) => (
              <button
                key={pool}
                onClick={() => setSelectedPool(pool)}
                className={`px-3 py-1.5 rounded text-xs font-mono tracking-wider uppercase font-semibold transition-colors ${
                  selectedPool === pool
                    ? 'bg-felt text-bone'
                    : 'bg-bone text-timber/70 hover:text-timber border border-timber/15'
                }`}
              >
                Pool {pool}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Teams Grid */}
      {activeTeams.length === 0 ? (
        <div className="text-center py-16 px-4 border-2 border-dashed border-timber/20 rounded-2xl bg-bone max-w-lg mx-auto">
          <div className="w-16 h-16 bg-terra/10 rounded-full flex items-center justify-center mx-auto mb-4 text-terra">
            <Users size={32} />
          </div>
          <h2 className="font-display text-xl uppercase tracking-wider text-timber font-bold mb-2">
            No Teams Registered Yet
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-terra text-bone font-display text-sm uppercase tracking-wider rounded-lg font-bold hover:bg-terra-light transition-all shadow"
            >
              <PlusCircle size={16} /> Register Team Now
            </Link>
            <button
              onClick={handleSyncSheet}
              disabled={syncing}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 border-2 border-timber/20 hover:border-timber bg-bone text-timber font-mono text-xs uppercase tracking-wider rounded-lg font-semibold hover:bg-bone-dark transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin text-felt' : 'text-timber/60'} />
              <span>{syncing ? 'Checking Sheet...' : 'Sync From Sheet'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTeams.map((team, idx) => {
            const pool = getTeamPool(team.id);
            const [topPip, botPip] = getTeamDomino(idx);

            return (
              <div
                key={team.id}
                className="border-2 border-timber/15 hover:border-timber/30 bg-bone rounded-xl p-4 transition-all duration-200 hover:shadow-md group flex flex-col justify-between"
              >
                <div>
                  {/* Top row: Seed # and Pool Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-xs text-timber/40 font-bold">
                      #{idx + 1}
                    </span>
                    {pool ? (
                      <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-felt/10 text-felt font-bold">
                        Pool {pool}
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-timber/40">
                        Seed {idx + 1}
                      </span>
                    )}
                  </div>

                  {/* Team Name and Interactive Tile */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-display text-lg uppercase font-bold text-timber group-hover:text-terra transition-colors leading-tight">
                      {team.name}
                    </h3>
                    <div className="shrink-0" title="Click to flip team domino">
                      <DominoFlipCard
                        top={topPip}
                        bottom={botPip}
                        size="xs"
                        interactive={true}
                      />
                    </div>
                  </div>
                </div>

                {/* Players Section */}
                <div className="mt-4 pt-3 border-t border-timber/10">
                  <div className="flex items-center gap-1.5">
                    <UserCheck size={14} className="text-felt shrink-0" />
                    <p className="font-mono text-xs text-timber/70 truncate">
                      <span className="text-timber font-medium">{team.player1}</span>
                      <span className="text-timber/40 mx-1">&</span>
                      <span className="text-timber font-medium">{team.player2}</span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Quick invite slot */}
          {state.stage === 'setup' && (
            <Link
              to="/signup"
              className="border-2 border-dashed border-terra/40 hover:border-terra bg-terra/[0.03] hover:bg-terra/[0.07] rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all group min-h-[140px]"
            >
              <PlusCircle size={26} className="text-terra mb-2 group-hover:scale-110 transition-transform" />
              <span className="font-display text-sm uppercase font-bold text-timber tracking-wider">
                Claim Next Slot
              </span>
              <span className="font-mono text-[10px] text-timber/50 mt-1">
                Click to register your 2v2 team
              </span>
            </Link>
          )}
        </div>
      )}

      {filteredTeams.length === 0 && activeTeams.length > 0 && (
        <div className="text-center py-12">
          <p className="font-mono text-sm text-timber/50">
            No teams match "{searchTerm}" {selectedPool !== 'ALL' ? `in Pool ${selectedPool}` : ''}
          </p>
        </div>
      )}
    </div>
  );
}
