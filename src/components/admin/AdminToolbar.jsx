import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Play, RefreshCw,
  Trophy, Undo2, Users, LayoutGrid, Swords, AlertTriangle, Hash
} from 'lucide-react';
import { useTournament } from '../../context/TournamentContext';
import { isGroupStageComplete } from '../../utils/tournamentEngine';
import { lockAdmin } from '../../utils/storage';
import TeamManager from './TeamManager';
import PoolManager from './PoolManager';
import MatchManager from './MatchManager';
import UndoDrawer from './UndoDrawer';

export default function AdminToolbar({ isOpen, onClose }) {
  const {
    state, startGroupStage, generateKnockout, resetTournament, fullReset, loadDemoData, clearToRealTournament, setTablesCount, updateConfig
  } = useTournament();
  const [activeTab, setActiveTab] = useState('matches');
  const [confirmReset, setConfirmReset] = useState(null);

  const { stage, matches, tablesCount, config } = state;
  const groupComplete = isGroupStageComplete(matches);

  const tabs = [
    { id: 'matches', label: 'Matches', icon: Swords },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'pools', label: 'Pools', icon: LayoutGrid },
    { id: 'undo', label: 'Undo', icon: Undo2 },
    { id: 'settings', label: 'Settings', icon: Hash },
  ];

  const handleLock = () => {
    lockAdmin();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-timber/30 backdrop-blur-sm z-[70]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full sm:w-[450px] md:w-[480px] max-w-full bg-bone border-l-2 border-timber z-[80] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-timber text-bone px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-display text-sm tracking-widest uppercase">
                  ◆ Admin
                </span>
                <span className={`font-mono text-[10px] tracking-wider uppercase px-1.5 py-0.5 rounded ${
                  stage === 'setup' ? 'bg-brass/20 text-brass' :
                  stage === 'groups' ? 'bg-felt/30 text-bone/80' :
                  stage === 'knockout' ? 'bg-terra/30 text-terra-light' :
                  'bg-brass/30 text-brass'
                }`}>
                  {stage}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLock}
                  className="font-mono text-[10px] text-bone/40 hover:text-bone uppercase tracking-wider"
                >
                  Lock
                </button>
                <button onClick={onClose} className="text-bone/40 hover:text-bone">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Stage actions */}
            <div className="px-4 py-3 border-b border-timber/10 shrink-0 space-y-2">
              {stage === 'setup' && (
                <button
                  onClick={startGroupStage}
                  disabled={state.teams.filter(t => !t.withdrawn).length < 2}
                  className="w-full py-3 bg-felt text-bone font-display text-sm uppercase tracking-wider rounded flex items-center justify-center gap-2 hover:bg-felt-light active:scale-[0.98] transition-all disabled:opacity-30"
                >
                  <Play size={16} /> Start Group Stage
                </button>
              )}
              {stage === 'groups' && groupComplete && (
                <button
                  onClick={generateKnockout}
                  className="w-full py-3 bg-brass text-timber font-display text-sm uppercase tracking-wider rounded flex items-center justify-center gap-2 hover:bg-brass-light active:scale-[0.98] transition-all"
                >
                  <Trophy size={16} /> Generate Knockout
                </button>
              )}
              {stage === 'finished' && state.champion && (
                <div className="text-center p-2 border border-brass rounded-lg bg-brass/10">
                  <p className="font-mono text-[10px] text-timber/40 uppercase tracking-widest">Champion</p>
                  <p className="font-display text-lg uppercase font-bold text-timber">{state.champion.name}</p>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-timber/10 shrink-0 overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-fit px-3 py-2.5 font-mono text-[10px] tracking-widest uppercase flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-b-2 border-terra text-terra font-bold'
                      : 'text-timber/30 hover:text-timber/60'
                  }`}
                >
                  <tab.icon size={12} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'matches' && <MatchManager />}
              {activeTab === 'teams' && <TeamManager />}
              {activeTab === 'pools' && <PoolManager />}
              {activeTab === 'undo' && <UndoDrawer />}
              {activeTab === 'settings' && (
                <div className="space-y-4">
                  {/* Event details */}
                  <div>
                    <h3 className="font-display text-sm tracking-widest uppercase text-timber/60 mb-2">
                      Tournament Info
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <label className="font-mono text-[10px] text-timber/50 uppercase block mb-1">
                          Tournament Name
                        </label>
                        <input
                          type="text"
                          value={config?.tournamentName || ''}
                          onChange={(e) => updateConfig({ tournamentName: e.target.value })}
                          className="w-full px-3 py-1.5 font-sans text-xs bg-timber/5 border border-timber/20 rounded focus:outline-none focus:border-timber text-timber"
                          placeholder="Dominoes Tournament"
                        />
                      </div>
                      <div>
                        <label className="font-mono text-[10px] text-timber/50 uppercase block mb-1">
                          Event Date / Subtitle
                        </label>
                        <input
                          type="text"
                          value={config?.eventDate || ''}
                          onChange={(e) => updateConfig({ eventDate: e.target.value })}
                          className="w-full px-3 py-1.5 font-sans text-xs bg-timber/5 border border-timber/20 rounded focus:outline-none focus:border-timber text-timber"
                          placeholder="October 17th 2026"
                        />
                      </div>
                      <div>
                        <label className="font-mono text-[10px] text-timber/50 uppercase block mb-1">
                          Google Form URL (Registration)
                        </label>
                        <input
                          type="text"
                          value={config?.googleFormUrl || ''}
                          onChange={(e) => updateConfig({ googleFormUrl: e.target.value })}
                          className="w-full px-3 py-1.5 font-sans text-xs bg-timber/5 border border-timber/20 rounded focus:outline-none focus:border-timber text-timber"
                          placeholder="https://forms.gle/..."
                        />
                      </div>
                      <div>
                        <label className="font-mono text-[10px] text-timber/50 uppercase block mb-1">
                          Google Sheet URL (Roster Sync)
                        </label>
                        <input
                          type="text"
                          value={config?.googleSheetUrl || ''}
                          onChange={(e) => updateConfig({ googleSheetUrl: e.target.value })}
                          className="w-full px-3 py-1.5 font-sans text-xs bg-timber/5 border border-timber/20 rounded focus:outline-none focus:border-timber text-timber"
                          placeholder="https://docs.google.com/spreadsheets/d/..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tables count */}
                  <div className="pt-2 border-t border-timber/10">
                    <h3 className="font-display text-sm tracking-widest uppercase text-timber/60 mb-2">
                      Active Tables
                    </h3>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map(n => (
                        <button
                          key={n}
                          onClick={() => setTablesCount(n)}
                          className={`px-4 py-2 font-mono text-sm rounded border transition-colors ${
                            tablesCount === n
                              ? 'border-felt bg-felt/10 text-felt font-bold'
                              : 'border-timber/10 text-timber/40 hover:border-timber/30'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tournament Mode */}
                  <div className="pt-2 border-t border-timber/10">
                    <h3 className="font-display text-sm tracking-widest uppercase text-timber/60 mb-2">
                      Tournament Data Mode
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={clearToRealTournament}
                        className="py-2 px-3 font-mono text-[10px] uppercase tracking-wider rounded border border-terra/30 text-terra hover:bg-terra/10 transition-colors flex flex-col items-center justify-center gap-1 text-center font-bold"
                      >
                        <span>Start Real Mode</span>
                        <span className="text-[8px] text-timber/40 font-normal">Clears demo teams</span>
                      </button>
                      <button
                        onClick={loadDemoData}
                        className="py-2 px-3 font-mono text-[10px] uppercase tracking-wider rounded border border-timber/20 text-timber hover:bg-timber/5 transition-colors flex flex-col items-center justify-center gap-1 text-center font-bold"
                      >
                        <span>Load Demo Mode</span>
                        <span className="text-[8px] text-timber/40 font-normal">8 sample teams</span>
                      </button>
                    </div>
                  </div>

                  {/* Reset tournament */}
                  <div className="pt-4 border-t border-timber/10">
                    <h3 className="font-display text-sm tracking-widest uppercase text-timber/60 mb-2">
                      Danger Zone
                    </h3>
                    {confirmReset === 'tournament' ? (
                      <div className="p-3 border-2 border-terra/30 rounded-lg bg-terra/5">
                        <div className="flex items-start gap-2 mb-2">
                          <AlertTriangle size={14} className="text-terra mt-0.5 shrink-0" />
                          <p className="font-mono text-xs text-terra">
                            This will reset all matches, brackets, and standings. Teams will be preserved.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setConfirmReset(null)} className="flex-1 py-1.5 font-mono text-xs uppercase tracking-wider border border-timber/20 rounded hover:bg-timber/5 transition-colors">
                            Cancel
                          </button>
                          <button onClick={() => { resetTournament(); setConfirmReset(null); }} className="flex-1 py-1.5 font-mono text-xs uppercase tracking-wider bg-terra text-bone rounded hover:bg-terra-light transition-colors">
                            Reset Tournament
                          </button>
                        </div>
                      </div>
                    ) : confirmReset === 'full' ? (
                      <div className="p-3 border-2 border-terra/30 rounded-lg bg-terra/5">
                        <div className="flex items-start gap-2 mb-2">
                          <AlertTriangle size={14} className="text-terra mt-0.5 shrink-0" />
                          <p className="font-mono text-xs text-terra">
                            This will delete EVERYTHING and restore demo data. This cannot be undone.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setConfirmReset(null)} className="flex-1 py-1.5 font-mono text-xs uppercase tracking-wider border border-timber/20 rounded hover:bg-timber/5 transition-colors">
                            Cancel
                          </button>
                          <button onClick={() => { fullReset(); setConfirmReset(null); }} className="flex-1 py-1.5 font-mono text-xs uppercase tracking-wider bg-terra text-bone rounded hover:bg-terra-light transition-colors">
                            Full Reset
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => setConfirmReset('tournament')}
                          className="w-full py-2 font-mono text-xs uppercase tracking-wider text-terra border border-terra/20 rounded hover:bg-terra/10 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <RefreshCw size={12} /> Reset Tournament
                        </button>
                        <button
                          onClick={() => setConfirmReset('full')}
                          className="w-full py-2 font-mono text-xs uppercase tracking-wider text-terra/50 border border-terra/10 rounded hover:bg-terra/5 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <RefreshCw size={12} /> Full Factory Reset
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
