import React from 'react';
import { Undo2, Clock } from 'lucide-react';
import { useTournament } from '../../context/TournamentContext';

export default function UndoDrawer() {
  const { undo, undoHistory } = useTournament();
  const history = undoHistory.getAll();

  if (history.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="font-mono text-xs text-timber/20 uppercase tracking-widest">
          No undo history
        </p>
      </div>
    );
  }

  const handleUndo = () => {
    const action = undo();
    if (action) {
      // visual feedback handled by state update
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-sm tracking-widest uppercase text-timber/60">
          Undo History
        </h3>
        <span className="font-mono text-[10px] text-timber/30">
          {history.length} snapshots
        </span>
      </div>

      {/* Quick undo button */}
      <button
        onClick={handleUndo}
        className="w-full mb-3 py-3 bg-terra text-bone font-display text-sm uppercase tracking-wider rounded flex items-center justify-center gap-2 hover:bg-terra-light active:scale-[0.98] transition-all"
      >
        <Undo2 size={16} /> Undo Last Action
      </button>

      {/* History list */}
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {[...history].reverse().map((entry, idx) => (
          <div key={idx} className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-timber/5">
            <Clock size={10} className="text-timber/20 mt-1 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[11px] text-timber/60 truncate">
                {entry.action}
              </p>
              <p className="font-mono text-[9px] text-timber/20">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
