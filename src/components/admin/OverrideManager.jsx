import React, { useState } from 'react';
import {
  ShieldAlert, ArrowLeftRight, Check, AlertTriangle,
  RotateCcw, Trophy, Users, Swords, LayoutGrid
} from 'lucide-react';
import { useTournament } from '../../context/TournamentContext';
import { isGroupStageComplete } from '../../utils/tournamentEngine';

export default function OverrideManager() {
  const {
    state,
    updateBracketMatch,
    swapBracketTeams,
    swapBracketMatchSlots,
    swapTeamsBetweenPools,
    reassignTeamPool,
    setManualAdvancement,
    clearManualAdvancement,
    updateGroupMatch,
    swapGroupMatchTeams,
    resetMatch,
    resetBracketMatch,
    generateKnockout,
  } = useTournament();

  const { bracket, groups, matches, teams, stage, overrides } = state;
  const [section, setSection] = useState('bracket'); // 'bracket' | 'pools' | 'advancement' | 'matches'

  // Pool swap state
  const [swapTeamA, setSwapTeamA] = useState('');
  const [swapTeamB, setSwapTeamB] = useState('');
  const [swapSuccess, setSwapSuccess] = useState(false);

  const groupLabels = Object.keys(groups).sort();
  const activeTeams = teams.filter(t => !t.withdrawn);
  const getTeam = (id) => teams.find(t => t.id === id);

  const handleExecutePoolSwap = () => {
    if (!swapTeamA || !swapTeamB || swapTeamA === swapTeamB) return;
    swapTeamsBetweenPools(swapTeamA, swapTeamB);
    setSwapSuccess(true);
    setTimeout(() => setSwapSuccess(false), 2000);
    setSwapTeamA('');
    setSwapTeamB('');
  };

  return (
    <div className="space-y-4">
      {/* Sub-navigation */}
      <div className="flex bg-timber/5 p-1 rounded-lg gap-1 border border-timber/10 overflow-x-auto">
        <button
          type="button"
          onClick={() => setSection('bracket')}
          className={`flex-1 py-1.5 px-2 font-mono text-[10px] uppercase tracking-wider rounded transition-colors whitespace-nowrap flex items-center justify-center gap-1 ${
            section === 'bracket' ? 'bg-bone text-timber font-bold shadow-sm' : 'text-timber/40 hover:text-timber'
          }`}
        >
          <Trophy size={11} /> Bracket Matchups
        </button>
        <button
          type="button"
          onClick={() => setSection('pools')}
          className={`flex-1 py-1.5 px-2 font-mono text-[10px] uppercase tracking-wider rounded transition-colors whitespace-nowrap flex items-center justify-center gap-1 ${
            section === 'pools' ? 'bg-bone text-timber font-bold shadow-sm' : 'text-timber/40 hover:text-timber'
          }`}
        >
          <LayoutGrid size={11} /> Pool Teams
        </button>
        <button
          type="button"
          onClick={() => setSection('advancement')}
          className={`flex-1 py-1.5 px-2 font-mono text-[10px] uppercase tracking-wider rounded transition-colors whitespace-nowrap flex items-center justify-center gap-1 ${
            section === 'advancement' ? 'bg-bone text-timber font-bold shadow-sm' : 'text-timber/40 hover:text-timber'
          }`}
        >
          <Users size={11} /> Advancement
        </button>
        <button
          type="button"
          onClick={() => setSection('matches')}
          className={`flex-1 py-1.5 px-2 font-mono text-[10px] uppercase tracking-wider rounded transition-colors whitespace-nowrap flex items-center justify-center gap-1 ${
            section === 'matches' ? 'bg-bone text-timber font-bold shadow-sm' : 'text-timber/40 hover:text-timber'
          }`}
        >
          <Swords size={11} /> Group Matches
        </button>
      </div>

      {/* SECTION 1: BRACKET MATCHUPS ("Who verses Who") */}
      {section === 'bracket' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-xs tracking-widest uppercase text-timber/60">
              Knockout Bracket Matchups
            </h4>
            <span className="font-mono text-[10px] text-timber/30">
              {bracket?.rounds ? `${bracket.rounds.length} rounds` : 'No bracket'}
            </span>
          </div>

          {!bracket || !bracket.rounds ? (
            <div className="p-4 border-2 border-dashed border-timber/20 rounded-lg text-center space-y-2">
              <p className="font-mono text-xs text-timber/40 uppercase">
                Knockout bracket has not been generated yet.
              </p>
              <button
                type="button"
                onClick={generateKnockout}
                className="px-3 py-1.5 bg-felt text-bone font-mono text-xs uppercase tracking-wider rounded hover:bg-felt-light"
              >
                Generate Bracket Now
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {bracket.rounds.map((round, rIdx) => (
                <div key={rIdx} className="space-y-2">
                  <div className="bg-timber/10 px-2.5 py-1 rounded flex items-center justify-between">
                    <span className="font-display text-xs uppercase font-bold tracking-wider text-timber">
                      {round.name}
                    </span>
                    <span className="font-mono text-[10px] text-timber/40">
                      {round.matches.length} {round.matches.length === 1 ? 'match' : 'matches'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {round.matches.map((m) => {
                      const teamA = getTeam(m.teamA);
                      const teamB = getTeam(m.teamB);

                      return (
                        <div key={m.id} className="p-3 border-2 border-timber/15 rounded-lg bg-bone-dark/20 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] uppercase tracking-wider text-timber/40 font-bold">
                              Match {m.matchNum} • Table {m.table}
                            </span>
                            {m.winner && (
                              <span className="font-mono text-[10px] uppercase text-felt font-bold">
                                Winner: {getTeam(m.winner)?.name}
                              </span>
                            )}
                          </div>

                          {/* Slot A Select */}
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-timber/40 w-12 shrink-0 font-bold">Slot A:</span>
                            <select
                              value={m.teamA || ''}
                              onChange={(e) => updateBracketMatch(m.id, { teamA: e.target.value || null })}
                              className="flex-1 px-2 py-1 bg-bone border border-timber/20 rounded font-display text-xs uppercase text-timber focus:outline-none focus:border-felt"
                            >
                              <option value="">— Empty / TBD —</option>
                              {activeTeams.map(t => (
                                <option key={t.id} value={t.id} disabled={t.id === m.teamB}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Swap button */}
                          <div className="flex justify-center">
                            <button
                              type="button"
                              onClick={() => swapBracketTeams(m.id)}
                              className="px-2 py-0.5 bg-timber/5 hover:bg-timber/10 border border-timber/20 rounded font-mono text-[9px] uppercase tracking-widest text-timber flex items-center gap-1 transition-colors"
                              title="Swap Home/Away"
                            >
                              <ArrowLeftRight size={10} /> Swap Slots
                            </button>
                          </div>

                          {/* Slot B Select */}
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-timber/40 w-12 shrink-0 font-bold">Slot B:</span>
                            <select
                              value={m.teamB || ''}
                              onChange={(e) => updateBracketMatch(m.id, { teamB: e.target.value || null })}
                              className="flex-1 px-2 py-1 bg-bone border border-timber/20 rounded font-display text-xs uppercase text-timber focus:outline-none focus:border-felt"
                            >
                              <option value="">— Empty / TBD —</option>
                              {activeTeams.map(t => (
                                <option key={t.id} value={t.id} disabled={t.id === m.teamA}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Bottom controls */}
                          <div className="flex items-center justify-between pt-1 border-t border-timber/10 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[9px] text-timber/40 uppercase">Table:</span>
                              {[1, 2, 3, 4].map(tbl => (
                                <button
                                  type="button"
                                  key={tbl}
                                  onClick={() => updateBracketMatch(m.id, { table: tbl })}
                                  className={`px-1.5 py-0.5 font-mono text-[9px] rounded border ${
                                    m.table === tbl ? 'border-felt bg-felt text-bone font-bold' : 'border-timber/15 text-timber/50'
                                  }`}
                                >
                                  {tbl}
                                </button>
                              ))}
                            </div>
                            {m.winner && (
                              <button
                                type="button"
                                onClick={() => resetBracketMatch(m.id)}
                                className="font-mono text-[9px] uppercase text-terra hover:underline"
                              >
                                Reset Result
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: POOL TEAMS ("Which Teams are in Which Groups") */}
      {section === 'pools' && (
        <div className="space-y-4">
          <div>
            <h4 className="font-display text-xs tracking-widest uppercase text-timber/60 mb-2">
              Swap Two Teams Between Pools
            </h4>
            <div className="p-3 bg-bone-dark/30 border border-timber/15 rounded-lg space-y-2.5">
              <p className="font-sans text-[11px] text-timber/60 leading-relaxed">
                Seamlessly swap two teams between their groups. Any unplayed matches will automatically update with the replacement team.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="font-mono text-[9px] uppercase text-timber/50 block mb-1">
                    First Team (e.g. from Pool A)
                  </label>
                  <select
                    value={swapTeamA}
                    onChange={(e) => setSwapTeamA(e.target.value)}
                    className="w-full px-2 py-1.5 bg-bone border border-timber/20 rounded font-display text-xs uppercase text-timber"
                  >
                    <option value="">Select Team...</option>
                    {activeTeams.map(t => {
                      const poolId = groupLabels.find(g => groups[g]?.includes(t.id));
                      return (
                        <option key={t.id} value={t.id}>
                          {t.name} (Pool {poolId || '?'})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="font-mono text-[9px] uppercase text-timber/50 block mb-1">
                    Second Team (e.g. from Pool B)
                  </label>
                  <select
                    value={swapTeamB}
                    onChange={(e) => setSwapTeamB(e.target.value)}
                    className="w-full px-2 py-1.5 bg-bone border border-timber/20 rounded font-display text-xs uppercase text-timber"
                  >
                    <option value="">Select Team...</option>
                    {activeTeams.map(t => {
                      const poolId = groupLabels.find(g => groups[g]?.includes(t.id));
                      return (
                        <option key={t.id} value={t.id} disabled={t.id === swapTeamA}>
                          {t.name} (Pool {poolId || '?'})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExecutePoolSwap}
                disabled={!swapTeamA || !swapTeamB || swapTeamA === swapTeamB}
                className="w-full py-2 bg-felt text-bone font-display text-xs uppercase font-bold tracking-wider rounded hover:bg-felt-light disabled:opacity-30 transition-colors flex items-center justify-center gap-1.5"
              >
                <ArrowLeftRight size={13} />
                {swapSuccess ? 'Teams Swapped Successfully!' : 'Swap Team Pools'}
              </button>
            </div>
          </div>

          {/* Current Pool Rosters */}
          <div className="space-y-3">
            <h4 className="font-display text-xs tracking-widest uppercase text-timber/60">
              Current Pool Assignments
            </h4>
            {groupLabels.map(gid => (
              <div key={gid} className="border border-timber/15 rounded-lg overflow-hidden">
                <div className="bg-timber/5 px-3 py-1.5 flex items-center justify-between border-b border-timber/10">
                  <span className="font-display text-xs uppercase font-bold text-timber">
                    Pool {gid}
                  </span>
                  <span className="font-mono text-[10px] text-timber/30">
                    {groups[gid]?.length || 0} teams
                  </span>
                </div>
                <div className="p-2 space-y-1">
                  {(groups[gid] || []).map(teamId => {
                    const team = getTeam(teamId);
                    if (!team) return null;
                    const otherPools = groupLabels.filter(g => g !== gid);

                    return (
                      <div key={teamId} className="flex items-center justify-between py-1 px-2 rounded hover:bg-timber/5">
                        <div>
                          <span className="font-display text-xs uppercase font-bold text-timber">
                            {team.name}
                          </span>
                          <span className="font-mono text-[9px] text-timber/30 ml-2">
                            {team.player1} & {team.player2}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[9px] text-timber/30 uppercase">Move:</span>
                          {otherPools.map(target => (
                            <button
                              key={target}
                              type="button"
                              onClick={() => reassignTeamPool(teamId, target)}
                              className="px-1.5 py-0.5 font-mono text-[9px] uppercase rounded border border-timber/20 hover:border-felt hover:text-felt transition-colors"
                            >
                              Pool {target}
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
      )}

      {/* SECTION 3: ADVANCEMENT OVERRIDES */}
      {section === 'advancement' && (
        <div className="space-y-4">
          <div>
            <h4 className="font-display text-xs tracking-widest uppercase text-timber/60 mb-2">
              Manual Pool Advancement Overrides
            </h4>
            <p className="font-sans text-[11px] text-timber/60 leading-relaxed mb-3">
              In case of disqualifications, organizer discretion, or emergency tie-breaks, you can explicitly dictate which teams advance from each pool to the knockout bracket.
            </p>
          </div>

          {groupLabels.map(gid => {
            const currentAdv = overrides.manualAdvancement?.[gid] || [];
            const poolTeams = (groups[gid] || []).map(id => getTeam(id)).filter(Boolean);

            const toggleAdvance = (teamId) => {
              let next;
              if (currentAdv.includes(teamId)) {
                next = currentAdv.filter(id => id !== teamId);
              } else {
                next = [...currentAdv, teamId];
              }
              if (next.length === 0) {
                clearManualAdvancement(gid);
              } else {
                setManualAdvancement(gid, next);
              }
            };

            return (
              <div key={gid} className="border border-timber/15 rounded-lg overflow-hidden">
                <div className="bg-timber/5 px-3 py-2 flex items-center justify-between border-b border-timber/10">
                  <div>
                    <span className="font-display text-xs uppercase font-bold text-timber">
                      Pool {gid} Advancement
                    </span>
                    {currentAdv.length > 0 && (
                      <span className="ml-2 font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-felt text-bone font-bold">
                        Manual Override Active
                      </span>
                    )}
                  </div>
                  {currentAdv.length > 0 && (
                    <button
                      type="button"
                      onClick={() => clearManualAdvancement(gid)}
                      className="font-mono text-[9px] uppercase text-terra hover:underline"
                    >
                      Clear Override
                    </button>
                  )}
                </div>

                <div className="p-3 space-y-1.5">
                  <p className="font-mono text-[10px] text-timber/40 uppercase">
                    Select 2 advancing teams (order matters: 1st seed, 2nd seed):
                  </p>
                  {poolTeams.map(team => {
                    const isSelected = currentAdv.includes(team.id);
                    const orderIdx = currentAdv.indexOf(team.id);

                    return (
                      <div
                        key={team.id}
                        onClick={() => toggleAdvance(team.id)}
                        className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-felt bg-felt/10'
                            : 'border-timber/10 hover:bg-timber/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold ${
                            isSelected ? 'bg-felt text-bone' : 'border border-timber/30 text-timber/30'
                          }`}>
                            {isSelected ? orderIdx + 1 : '—'}
                          </span>
                          <div>
                            <span className={`font-display text-xs uppercase font-bold ${isSelected ? 'text-felt' : 'text-timber'}`}>
                              {team.name}
                            </span>
                            <span className="font-mono text-[9px] text-timber/40 ml-2">
                              {team.player1} & {team.player2}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="font-mono text-[9px] uppercase text-felt font-bold">
                            {orderIdx === 0 ? 'Pool Winner' : 'Pool Runner-up'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="pt-2">
            <button
              type="button"
              onClick={generateKnockout}
              className="w-full py-2.5 bg-felt text-bone font-display text-xs uppercase font-bold tracking-wider rounded hover:bg-felt-light transition-colors flex items-center justify-center gap-2"
            >
              <Trophy size={14} /> Rebuild Bracket with Overrides
            </button>
          </div>
        </div>
      )}

      {/* SECTION 4: GROUP MATCHES EMERGENCY EDITOR */}
      {section === 'matches' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-xs tracking-widest uppercase text-timber/60">
              Group Matches Quick Editor
            </h4>
            <span className="font-mono text-[10px] text-timber/30">
              {matches.filter(m => m.stage === 'group').length} total matches
            </span>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {matches.filter(m => m.stage === 'group').map(m => {
              const teamA = getTeam(m.teamA);
              const teamB = getTeam(m.teamB);

              return (
                <div key={m.id} className="p-2.5 border border-timber/15 rounded-lg bg-bone-dark/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] uppercase text-timber/40 font-bold">
                      Pool {m.groupId} • Table {m.table}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => swapGroupMatchTeams(m.id)}
                        className="px-1.5 py-0.5 text-[9px] font-mono uppercase text-timber/60 hover:text-timber border border-timber/20 rounded flex items-center gap-0.5"
                      >
                        <ArrowLeftRight size={9} /> Swap
                      </button>
                      {m.winner && (
                        <button
                          type="button"
                          onClick={() => resetMatch(m.id)}
                          className="px-1.5 py-0.5 text-[9px] font-mono uppercase text-terra border border-terra/20 rounded hover:bg-terra/5"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={m.teamA || ''}
                      onChange={(e) => updateGroupMatch(m.id, { teamA: e.target.value })}
                      className="px-1.5 py-1 bg-bone border border-timber/20 rounded font-display text-[11px] uppercase text-timber"
                    >
                      {activeTeams.map(t => (
                        <option key={t.id} value={t.id} disabled={t.id === m.teamB}>
                          {t.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={m.teamB || ''}
                      onChange={(e) => updateGroupMatch(m.id, { teamB: e.target.value })}
                      className="px-1.5 py-1 bg-bone border border-timber/20 rounded font-display text-[11px] uppercase text-timber"
                    >
                      {activeTeams.map(t => (
                        <option key={t.id} value={t.id} disabled={t.id === m.teamA}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
