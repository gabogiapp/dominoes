import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeftRight, Check, AlertTriangle } from 'lucide-react';
import { useTournament } from '../../context/TournamentContext';

export default function BracketMatchEditModal({ isOpen, onClose, match, roundName }) {
  const { state, updateBracketMatch } = useTournament();
  const { teams } = state;

  const [teamA, setTeamA] = useState(match?.teamA || '');
  const [teamB, setTeamB] = useState(match?.teamB || '');
  const [table, setTable] = useState(match?.table || 1);

  React.useEffect(() => {
    if (match) {
      setTeamA(match.teamA || '');
      setTeamB(match.teamB || '');
      setTable(match.table || 1);
    }
  }, [match]);

  if (!isOpen || !match) return null;

  const activeTeams = teams.filter(t => !t.withdrawn);

  const handleSave = () => {
    updateBracketMatch(match.id, {
      teamA: teamA || null,
      teamB: teamB || null,
      table: Number(table),
    });
    onClose();
  };

  const handleSwap = () => {
    const temp = teamA;
    setTeamA(teamB);
    setTeamB(temp);
  };

  const hasWinner = Boolean(match.winner);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[95] flex items-center justify-center bg-timber/60 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-bone border-2 border-timber rounded-xl p-5 w-full max-w-md shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-timber/10 pb-3">
            <div>
              <span className="font-mono text-[10px] tracking-widest uppercase text-felt font-bold">
                Emergency Bracket Editor
              </span>
              <h3 className="font-display text-base font-bold uppercase tracking-wide text-timber">
                {roundName || 'Knockout Match'} • Match {match.matchNum}
              </h3>
            </div>
            <button onClick={onClose} className="text-timber/40 hover:text-timber p-1 rounded">
              <X size={18} />
            </button>
          </div>

          {hasWinner && (
            <div className="p-3 bg-terra/10 border border-terra/30 rounded-lg flex items-start gap-2">
              <AlertTriangle size={16} className="text-terra shrink-0 mt-0.5" />
              <p className="font-mono text-xs text-terra leading-relaxed">
                This match already has a recorded winner. Changing participants will clear this winner and reset downstream bracket slots.
              </p>
            </div>
          )}

          {/* Slot A */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-mono text-[10px] uppercase font-bold tracking-wider text-timber/60">
                Team Slot A
              </label>
              {teamA && (
                <button
                  type="button"
                  onClick={() => setTeamA('')}
                  className="font-mono text-[9px] text-timber/40 hover:text-terra uppercase"
                >
                  Clear
                </button>
              )}
            </div>
            <select
              value={teamA}
              onChange={(e) => setTeamA(e.target.value)}
              className="w-full px-3 py-2 bg-bone border-2 border-timber/20 rounded font-display text-sm uppercase text-timber focus:outline-none focus:border-felt"
            >
              <option value="">— Empty / TBD —</option>
              {activeTeams.map(t => (
                <option key={t.id} value={t.id} disabled={t.id === teamB}>
                  {t.name} ({t.player1} & {t.player2}) {t.id === teamB ? '(Already in Slot B)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Swap button */}
          <div className="flex justify-center py-1">
            <button
              type="button"
              onClick={handleSwap}
              className="px-3 py-1.5 bg-timber/5 hover:bg-timber/10 border border-timber/20 rounded font-mono text-[10px] uppercase tracking-widest text-timber flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeftRight size={12} />
              Swap Slot A ⇄ Slot B
            </button>
          </div>

          {/* Slot B */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-mono text-[10px] uppercase font-bold tracking-wider text-timber/60">
                Team Slot B
              </label>
              {teamB && (
                <button
                  type="button"
                  onClick={() => setTeamB('')}
                  className="font-mono text-[9px] text-timber/40 hover:text-terra uppercase"
                >
                  Clear
                </button>
              )}
            </div>
            <select
              value={teamB}
              onChange={(e) => setTeamB(e.target.value)}
              className="w-full px-3 py-2 bg-bone border-2 border-timber/20 rounded font-display text-sm uppercase text-timber focus:outline-none focus:border-felt"
            >
              <option value="">— Empty / TBD —</option>
              {activeTeams.map(t => (
                <option key={t.id} value={t.id} disabled={t.id === teamA}>
                  {t.name} ({t.player1} & {t.player2}) {t.id === teamA ? '(Already in Slot A)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Table selector */}
          <div className="space-y-1.5 pt-2 border-t border-timber/10">
            <label className="font-mono text-[10px] uppercase font-bold tracking-wider text-timber/60">
              Assigned Table
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(n => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setTable(n)}
                  className={`flex-1 py-1.5 font-mono text-xs uppercase rounded border transition-colors ${
                    table === n
                      ? 'border-felt bg-felt text-bone font-bold'
                      : 'border-timber/20 text-timber/60 hover:bg-timber/5'
                  }`}
                >
                  Table {n}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t border-timber/10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 font-mono text-xs uppercase tracking-wider text-timber/60 hover:text-timber border border-timber/20 rounded hover:bg-timber/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-2 font-display text-xs uppercase font-bold tracking-wider bg-felt text-bone rounded hover:bg-felt-light flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <Check size={14} /> Apply Matchup
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
