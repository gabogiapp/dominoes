import React, { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import { useAdminStatus } from '../utils/storage';
import BracketTree from '../components/BracketTree';
import MobileBracket from '../components/MobileBracket';
import ChampionModal from '../components/ChampionModal';
import { Trophy, Sparkles } from 'lucide-react';

export default function BracketPage() {
  const { state, generateKnockout } = useTournament();
  const { bracket, champion, stage } = state;
  const isAdmin = useAdminStatus();
  const [dismissedChampionId, setDismissedChampionId] = useState(null);

  const showChampion = Boolean(champion && champion.id !== dismissedChampionId);

  if (!bracket && stage !== 'finished') {
    const activeTeams = state.teams.filter(t => !t.withdrawn);

    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-4">
        <div className="text-center max-w-lg">
          <p className="font-mono text-xs tracking-[0.3em] uppercase text-timber/30 mb-4">
            Championship Bracket
          </p>
          <h1 className="font-display text-3xl font-bold uppercase tracking-wider text-timber mb-4">
            Playoff Bracket
          </h1>
          <div className="h-0.5 bg-timber/10 w-16 mx-auto mb-4" />
          <p className="font-sans text-sm text-timber/60 mb-6">
            The knockout bracket will appear here once group match play concludes.
          </p>

          {isAdmin && activeTeams.length >= 2 && (
            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  if (confirm('Start playoffs with top pool seeds?')) {
                    generateKnockout();
                  }
                }}
                className="px-5 py-2.5 bg-felt text-bone font-display text-xs uppercase tracking-wider rounded-lg font-bold hover:bg-felt-light transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Sparkles size={14} /> Generate Knockout Bracket
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)] max-w-6xl mx-auto px-4 py-6 md:py-8">
      {/* Header */}
      <div className="text-center mb-6">
        <p className="font-mono text-xs tracking-[0.3em] uppercase text-timber/30 mb-1">
          {stage === 'finished' ? 'Final Results' : 'Knockout Stage'}
        </p>
        <h1 className="font-display text-2xl md:text-3xl font-bold uppercase tracking-wider text-timber">
          Championship Bracket
        </h1>
        <div className="h-0.5 bg-brass w-16 mx-auto mt-3" />
      </div>

      {/* Champion banner (persistent) */}
      {champion && (
        <div className="mb-6 text-center border-2 border-brass rounded-lg p-4 bg-brass/5 max-w-md mx-auto">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Trophy size={16} className="text-brass" />
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-brass">Champion</span>
          </div>
          <p className="font-display text-2xl uppercase font-bold tracking-wider text-timber">
            {champion.name}
          </p>
          <p className="font-mono text-xs text-timber/40">
            {champion.player1} & {champion.player2}
          </p>
        </div>
      )}

      {/* Desktop bracket */}
      <BracketTree />

      {/* Mobile bracket */}
      <MobileBracket />

      {/* Champion modal */}
      <ChampionModal
        champion={showChampion ? champion : null}
        onClose={() => setDismissedChampionId(champion?.id || true)}
      />
    </div>
  );
}
