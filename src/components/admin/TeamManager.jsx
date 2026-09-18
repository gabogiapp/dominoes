import React, { useState } from 'react';
import { Plus, Trash2, Edit3, UserMinus, X, Check, FileSpreadsheet, Sparkles, RefreshCw } from 'lucide-react';
import { useTournament } from '../../context/TournamentContext';

export default function TeamManager() {
  const {
    state, addTeam, bulkAddTeams, syncWithGoogleSheet, removeTeam, editTeam, withdrawTeam, loadDemoData, clearToRealTournament
  } = useTournament();
  const [newName, setNewName] = useState('');
  const [newP1, setNewP1] = useState('');
  const [newP2, setNewP2] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(null);

  const hasMatches = state.matches.some(m => m.winner);
  const activeTeams = state.teams.filter(t => !t.withdrawn);

  const handleAdd = () => {
    if (!newName.trim()) return;
    addTeam(newName.trim(), newP1.trim() || 'Player 1', newP2.trim() || 'Player 2');
    setNewName('');
    setNewP1('');
    setNewP2('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd();
  };

  const parseBulkText = (text) => {
    const lines = text.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const parsed = [];
    for (const line of lines) {
      if (line.includes('\t')) {
        const parts = line.split('\t').map(p => p.trim());
        if (parts[0]) parsed.push({ name: parts[0], player1: parts[1] || 'Player 1', player2: parts[2] || 'Player 2' });
      } else if (line.includes(',')) {
        const parts = line.split(',').map(p => p.trim());
        if (parts[0]) parsed.push({ name: parts[0], player1: parts[1] || 'Player 1', player2: parts[2] || 'Player 2' });
      } else {
        parsed.push({ name: line, player1: 'Player 1', player2: 'Player 2' });
      }
    }
    return parsed;
  };

  const handleBulkSubmit = () => {
    const parsed = parseBulkText(bulkText);
    if (parsed.length > 0) {
      bulkAddTeams(parsed);
      setBulkText('');
      setShowBulkImport(false);
    }
  };

  const startEdit = (team) => {
    setEditingId(team.id);
    setEditData({ name: team.name, player1: team.player1, player2: team.player2 });
  };

  const saveEdit = () => {
    if (editingId && editData.name?.trim()) {
      editTeam(editingId, editData);
      setEditingId(null);
    }
  };

  const handleDelete = (teamId) => {
    if (hasMatches) {
      setConfirmDelete(teamId);
    } else {
      removeTeam(teamId);
    }
  };

  const handleSyncSheet = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await syncWithGoogleSheet(true);
      if (!res.success) {
        setSyncFeedback({ type: 'error', text: res.error || 'Failed to sync with Google Sheet' });
      } else if (res.count === 0) {
        setSyncFeedback({
          type: 'warning',
          text: res.rawCount > 0
            ? `${res.rawCount} team(s) found in sheet, but none marked 'Paid'. Mark 'Paid' as TRUE/YES in Google Sheet.`
            : 'No submissions found in Google Sheet.',
        });
      } else {
        setSyncFeedback({
          type: 'success',
          text: `Synced ${res.count} paid team(s) from Google Sheet!`,
        });
      }
    } catch (err) {
      setSyncFeedback({ type: 'error', text: err.message || 'Sync error' });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div>
      {/* Header & Mode controls */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-sm tracking-widest uppercase text-timber/60">
          Teams ({activeTeams.length})
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSyncSheet}
            disabled={isSyncing}
            className="px-2 py-1 font-mono text-[10px] tracking-wider uppercase bg-felt/10 hover:bg-felt/20 border border-felt/30 rounded text-felt flex items-center gap-1 transition-colors disabled:opacity-50"
            title="Fetch paid teams directly from Google Sheet"
          >
            <RefreshCw size={11} className={isSyncing ? "animate-spin text-felt" : "text-felt"} />
            {isSyncing ? 'Syncing...' : 'Sync Sheet'}
          </button>
          <button
            onClick={() => setShowBulkImport(!showBulkImport)}
            className="px-2 py-1 font-mono text-[10px] tracking-wider uppercase bg-timber/5 hover:bg-timber/10 border border-timber/15 rounded text-timber flex items-center gap-1 transition-colors"
            title="Import teams by pasting text"
          >
            <FileSpreadsheet size={12} className="text-timber/60" />
            {showBulkImport ? 'Close' : 'Paste'}
          </button>
        </div>
      </div>

      {/* Sync feedback notification */}
      {syncFeedback && (
        <div className={`mb-3 p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between gap-2 ${
          syncFeedback.type === 'success' ? 'bg-felt/10 border-felt/30 text-felt' :
          syncFeedback.type === 'warning' ? 'bg-brass/10 border-brass/30 text-timber' :
          'bg-terra/10 border-terra/30 text-terra'
        }`}>
          <span className="leading-tight">{syncFeedback.text}</span>
          <button onClick={() => setSyncFeedback(null)} className="text-timber/40 hover:text-timber shrink-0">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Mode presets banner */}
      <div className="mb-4 p-2.5 rounded-lg border border-timber/15 bg-bone-dark/20 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles size={13} className={state.isDemo ? "text-brass" : "text-felt"} />
          <span className="font-mono text-[10px] uppercase tracking-wider text-timber/70 font-semibold">
            {state.isDemo ? 'Demo Mode Active' : activeTeams.length === 0 ? 'Real Mode (Empty)' : 'Real Tournament'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {state.isDemo ? (
            <button
              onClick={clearToRealTournament}
              className="px-2 py-1 bg-terra text-bone font-mono text-[9px] uppercase tracking-wider rounded hover:bg-terra-light transition-colors font-bold"
            >
              Clear to Real
            </button>
          ) : (
            <button
              onClick={loadDemoData}
              className="px-2 py-1 bg-timber/10 text-timber hover:bg-timber/20 font-mono text-[9px] uppercase tracking-wider rounded transition-colors"
            >
              Load Demo
            </button>
          )}
        </div>
      </div>

      {/* Bulk import drawer */}
      {showBulkImport && (
        <div className="mb-4 p-3 border-2 border-felt rounded-lg bg-felt/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-felt font-bold flex items-center gap-1.5">
              <FileSpreadsheet size={14} /> Paste from Google Sheet / Form
            </span>
            <button onClick={() => setShowBulkImport(false)} className="text-timber/40 hover:text-timber">
              <X size={14} />
            </button>
          </div>
          <p className="font-sans text-[11px] text-timber/60 leading-tight">
            Copy rows directly from your Google Sheet and paste them here (Format: Team Name, Player 1, Player 2).
          </p>
          <textarea
            rows={4}
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            placeholder={"Los Tigres\tCarlos\tMiguel\nEl Barrio\tDanny\tJulio"}
            className="w-full p-2 bg-bone border border-timber/20 rounded font-mono text-xs focus:outline-none focus:border-felt"
          />
          <div className="flex items-center justify-between pt-1">
            <span className="font-mono text-[10px] text-timber/40">
              {bulkText.trim() ? `${parseBulkText(bulkText).length} teams detected` : 'Waiting for paste...'}
            </span>
            <button
              onClick={handleBulkSubmit}
              disabled={parseBulkText(bulkText).length === 0}
              className="px-3 py-1.5 bg-felt text-bone font-mono text-xs uppercase tracking-wider rounded font-bold hover:bg-felt-light disabled:opacity-30 transition-all flex items-center gap-1"
            >
              <Check size={12} /> Import Teams
            </button>
          </div>
        </div>
      )}

      {/* Add team card form */}
      <div className="mb-4 p-3 border border-timber/15 rounded-lg bg-bone-dark/40 space-y-2">
        <div className="font-mono text-[10px] uppercase tracking-wider text-timber/50 font-bold">
          Add Single Team
        </div>
        <div>
          <input
            type="text"
            placeholder="Team Name (e.g. Double Sixes)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 bg-bone border border-timber/15 rounded font-mono text-sm placeholder:text-timber/30 focus:outline-none focus:border-felt"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="Player 1"
            value={newP1}
            onChange={e => setNewP1(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-2.5 py-1.5 bg-bone border border-timber/15 rounded font-mono text-xs placeholder:text-timber/30 focus:outline-none focus:border-felt"
          />
          <input
            type="text"
            placeholder="Player 2"
            value={newP2}
            onChange={e => setNewP2(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-2.5 py-1.5 bg-bone border border-timber/15 rounded font-mono text-xs placeholder:text-timber/30 focus:outline-none focus:border-felt"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={!newName.trim()}
          className="w-full py-2 bg-felt text-bone font-mono text-xs tracking-wider uppercase rounded hover:bg-felt-light disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 font-bold"
        >
          <Plus size={14} /> Add Team
        </button>
      </div>

      {/* Team list */}
      <div className="space-y-1.5">
        {state.teams.map(team => (
          <div key={team.id}>
            {editingId === team.id ? (
              <div className="p-3 border-2 border-felt rounded-lg bg-felt/5 space-y-2 my-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-felt font-bold">
                    Editing Team
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={saveEdit}
                      disabled={!editData.name?.trim()}
                      className="px-2.5 py-1 bg-felt text-bone rounded font-mono text-[10px] uppercase tracking-wider flex items-center gap-1 hover:bg-felt-light"
                    >
                      <Check size={12} /> Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2.5 py-1 border border-timber/20 text-timber/60 rounded font-mono text-[10px] uppercase tracking-wider hover:bg-timber/5"
                    >
                      <X size={12} /> Cancel
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Team Name"
                  value={editData.name || ''}
                  onChange={e => setEditData({ ...editData, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-bone border border-timber/20 rounded font-mono text-xs focus:outline-none focus:border-felt"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Player 1"
                    value={editData.player1 || ''}
                    onChange={e => setEditData({ ...editData, player1: e.target.value })}
                    className="w-full px-2 py-1 bg-bone border border-timber/20 rounded font-mono text-xs focus:outline-none focus:border-felt"
                  />
                  <input
                    type="text"
                    placeholder="Player 2"
                    value={editData.player2 || ''}
                    onChange={e => setEditData({ ...editData, player2: e.target.value })}
                    className="w-full px-2 py-1 bg-bone border border-timber/20 rounded font-mono text-xs focus:outline-none focus:border-felt"
                  />
                </div>
              </div>
            ) : (
              <div
                className={`flex items-center justify-between gap-2 p-2.5 rounded border border-timber/5 hover:border-timber/15 hover:bg-timber/[0.02] transition-colors group ${
                  team.withdrawn ? 'opacity-30' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm uppercase font-bold tracking-wide truncate text-timber">
                    {team.name}
                  </p>
                  <p className="font-mono text-[10px] text-timber/40 truncate">
                    {team.player1} & {team.player2}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(team)}
                    className="p-1.5 text-timber/40 hover:text-timber hover:bg-timber/5 rounded transition-colors"
                    title="Edit Team"
                  >
                    <Edit3 size={13} />
                  </button>
                  {!team.withdrawn && state.stage !== 'setup' && (
                    <button
                      onClick={() => withdrawTeam(team.id)}
                      className="p-1.5 text-timber/40 hover:text-brass hover:bg-brass/5 rounded transition-colors"
                      title="Withdraw Team"
                    >
                      <UserMinus size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(team.id)}
                    className="p-1.5 text-timber/40 hover:text-terra hover:bg-terra/5 rounded transition-colors"
                    title="Delete Team"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Confirm destructive delete */}
      {confirmDelete && (
        <div className="mt-3 p-3 border-2 border-terra/30 rounded-lg bg-terra/5">
          <p className="font-mono text-xs text-terra mb-2">
            This team has already played matches. Changing the tournament structure may affect existing results.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(null)}
              className="flex-1 py-1.5 font-mono text-xs uppercase tracking-wider border border-timber/20 rounded hover:bg-timber/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { removeTeam(confirmDelete); setConfirmDelete(null); }}
              className="flex-1 py-1.5 font-mono text-xs uppercase tracking-wider bg-terra text-bone rounded hover:bg-terra-light transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
