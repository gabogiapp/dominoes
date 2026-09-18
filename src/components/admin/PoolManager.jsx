import React, { useState } from 'react';
import { ArrowRight, Shuffle, AlertTriangle } from 'lucide-react';
import { useTournament } from '../../context/TournamentContext';
import { recommendGroups } from '../../utils/tournamentEngine';

export default function PoolManager() {
  const { state, regenerateGroups, moveTeamToGroup } = useTournament();
  const [confirmReshuffle, setConfirmReshuffle] = useState(false);
  const [customPoolCount, setCustomPoolCount] = useState(null);

  const activeTeams = state.teams.filter(t => !t.withdrawn);
  const rec = recommendGroups(activeTeams.length);
  const groupLabels = Object.keys(state.groups).sort();
  const hasPlayedMatches = state.matches.some(m => m.winner);

  const getTeam = (id) => state.teams.find(t => t.id === id);

  const handleReshuffle = (count) => {
    if (hasPlayedMatches && !confirmReshuffle) {
      setConfirmReshuffle(true);
      setCustomPoolCount(count);
      return;
    }
    regenerateGroups(count || rec.poolCount);
    setConfirmReshuffle(false);
    setCustomPoolCount(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-sm tracking-widest uppercase text-timber/60">
          Pools
        </h3>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-timber/30">
            Recommended: {rec.poolCount} pools — {rec.note}
          </span>
        </div>
      </div>

      {/* Pool controls */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[1, 2, 4].map(n => (
          <button
            key={n}
            onClick={() => handleReshuffle(n)}
            className={`px-3 py-1.5 font-mono text-xs tracking-wider uppercase rounded border transition-colors ${
              groupLabels.length === n
                ? 'border-felt bg-felt/10 text-felt'
                : 'border-timber/10 text-timber/40 hover:border-timber/30'
            }`}
          >
            {n} {n === 1 ? 'Pool' : 'Pools'}
          </button>
        ))}
        <button
          onClick={() => handleReshuffle()}
          className="px-3 py-1.5 font-mono text-xs tracking-wider uppercase rounded border border-timber/10 text-timber/40 hover:border-timber/30 flex items-center gap-1 transition-colors"
        >
          <Shuffle size={12} /> Reshuffle
        </button>
      </div>

      {/* Warning for post-start changes */}
      {confirmReshuffle && (
        <div className="mb-4 p-3 border-2 border-terra/30 rounded-lg bg-terra/5">
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle size={14} className="text-terra mt-0.5 shrink-0" />
            <p className="font-mono text-xs text-terra">
              Matches have already been played. Reshuffling pools will rebuild the tournament structure. Existing results may be affected.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmReshuffle(false)}
              className="flex-1 py-1.5 font-mono text-xs uppercase tracking-wider border border-timber/20 rounded hover:bg-timber/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { regenerateGroups(customPoolCount || rec.poolCount); setConfirmReshuffle(false); }}
              className="flex-1 py-1.5 font-mono text-xs uppercase tracking-wider bg-terra text-bone rounded hover:bg-terra-light transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Pool display with move buttons */}
      <div className="space-y-3">
        {groupLabels.map(gid => (
          <div key={gid} className="border border-timber/10 rounded-lg overflow-hidden">
            <div className="bg-timber/5 px-3 py-1.5 flex items-center justify-between">
              <span className="font-display text-xs tracking-widest uppercase font-bold">
                Pool {gid}
              </span>
              <span className="font-mono text-[10px] text-timber/30">
                {state.groups[gid]?.length || 0} teams
              </span>
            </div>
            <div className="p-2 space-y-1">
              {(state.groups[gid] || []).map(teamId => {
                const team = getTeam(teamId);
                if (!team) return null;
                // Other pools this team can move to
                const otherPools = groupLabels.filter(g => g !== gid);
                return (
                  <div key={teamId} className="flex items-center justify-between py-1 px-2 rounded hover:bg-timber/5 group">
                    <span className="font-mono text-xs font-medium uppercase truncate">
                      {team.name}
                    </span>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {otherPools.map(target => (
                        <button
                          key={target}
                          onClick={() => moveTeamToGroup(teamId, gid, target)}
                          className="text-[10px] font-mono text-timber/30 hover:text-felt px-1 flex items-center gap-0.5"
                          title={`Move to Pool ${target}`}
                        >
                          <ArrowRight size={10} /> {target}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
