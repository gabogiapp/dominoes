import React, { useState } from 'react';
import { Layers, Zap, RefreshCw, Eye, Sparkles, Volume2, VolumeX } from 'lucide-react';
import DominoCascade from '../components/animations/DominoCascade';
import DominoSlam from '../components/animations/DominoSlam';
import DominoShuffle from '../components/animations/DominoShuffle';
import DominoFlipCard from '../components/animations/DominoFlipCard';
import { toggleDominoSound, isDominoSoundEnabled } from '../utils/dominoAudio';

export default function PlayPage() {
  const [activeTab, setActiveTab] = useState('cascade');
  const [soundOn, setSoundOn] = useState(isDominoSoundEnabled());

  const handleSoundToggle = () => {
    const next = toggleDominoSound();
    setSoundOn(next);
  };

  const sampleTiles = [
    { top: 6, bottom: 6 },
    { top: 6, bottom: 5 },
    { top: 5, bottom: 5 },
    { top: 6, bottom: 4 },
    { top: 5, bottom: 4 },
    { top: 4, bottom: 4 },
    { top: 6, bottom: 3 },
    { top: 5, bottom: 3 },
  ];

  const boneyardGrid = [
    { top: 6, bottom: 6 },
    { top: 6, bottom: 5 },
    { top: 5, bottom: 5 },
    { top: 6, bottom: 4 },
    { top: 5, bottom: 4 },
    { top: 4, bottom: 4 },
    { top: 6, bottom: 3 },
    { top: 5, bottom: 3 },
    { top: 4, bottom: 3 },
    { top: 3, bottom: 3 },
    { top: 6, bottom: 2 },
    { top: 5, bottom: 2 },
  ];

  return (
    <div className="min-h-[calc(100vh-56px)] max-w-5xl mx-auto px-4 py-8 md:py-12 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-terra" />
            <span className="font-mono text-xs tracking-[0.25em] uppercase text-timber/60 font-semibold">
              The Domino Lounge
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-terra" />
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold uppercase tracking-wider text-timber mb-3">
            Domino Playground
          </h1>
          <div className="h-0.5 bg-terra w-16 mx-auto mb-3" />
          <p className="font-sans text-sm text-timber/60 max-w-md mx-auto">
            Interact with physics-based domino toppling, Caribbean table slams, boneyard shuffling, and tactile audio clacks.
          </p>
        </div>

        {/* Mode Selector and Audio Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-8 bg-bone-dark/50 p-2.5 rounded-2xl border border-timber/10 max-w-2xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('cascade')}
              className={`px-3.5 py-2 rounded-xl font-mono text-xs tracking-wider uppercase font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'cascade'
                  ? 'bg-timber text-bone shadow-sm'
                  : 'text-timber/70 hover:text-timber hover:bg-timber/5'
              }`}
            >
              <Layers size={13} /> Cascade
            </button>
            <button
              onClick={() => setActiveTab('slam')}
              className={`px-3.5 py-2 rounded-xl font-mono text-xs tracking-wider uppercase font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'slam'
                  ? 'bg-terra text-bone shadow-sm'
                  : 'text-timber/70 hover:text-timber hover:bg-timber/5'
              }`}
            >
              <Zap size={13} /> Slam
            </button>
            <button
              onClick={() => setActiveTab('shuffle')}
              className={`px-3.5 py-2 rounded-xl font-mono text-xs tracking-wider uppercase font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'shuffle'
                  ? 'bg-felt text-bone shadow-sm'
                  : 'text-timber/70 hover:text-timber hover:bg-timber/5'
              }`}
            >
              <RefreshCw size={13} /> Shuffle
            </button>
            <button
              onClick={() => setActiveTab('reveal')}
              className={`px-3.5 py-2 rounded-xl font-mono text-xs tracking-wider uppercase font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'reveal'
                  ? 'bg-brass text-timber shadow-sm'
                  : 'text-timber/70 hover:text-timber hover:bg-timber/5'
              }`}
            >
              <Eye size={13} /> 3D Flip
            </button>
          </div>

          <button
            onClick={handleSoundToggle}
            className="px-3 py-1.5 rounded-xl border border-timber/15 hover:bg-timber/5 font-mono text-xs uppercase tracking-wider text-timber/70 hover:text-timber flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            title={soundOn ? 'Domino sound enabled' : 'Domino sound muted'}
          >
            {soundOn ? <Volume2 size={14} className="text-terra" /> : <VolumeX size={14} />}
            <span>{soundOn ? 'Sound On' : 'Muted'}</span>
          </button>
        </div>

        {/* Interactive Play Arena */}
        <div className="bg-bone border-2 border-timber/15 rounded-3xl p-6 sm:p-10 shadow-sm max-w-3xl mx-auto min-h-[380px] flex flex-col items-center justify-center relative overflow-hidden">
          {/* Subtle felt table background pattern */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 18px, #1E1611 18px, #1E1611 19px)`,
            }}
          />

          {/* Mode 1: Cascade Topple */}
          {activeTab === 'cascade' && (
            <div className="w-full text-center">
              <div className="mb-4">
                <span className="font-mono text-xs text-terra uppercase tracking-widest font-bold">
                  The Domino Effect
                </span>
                <h2 className="font-display text-xl font-bold uppercase text-timber tracking-wider mt-0.5">
                  Toppling Chain Reaction
                </h2>
                <p className="font-sans text-xs text-timber/50 mt-1">
                  Click the button below or tap any individual tile to kickstart the cascade.
                </p>
              </div>

              <div className="py-6">
                <DominoCascade tiles={sampleTiles} size="lg" />
              </div>
            </div>
          )}

          {/* Mode 2: El Chuchazo Slam */}
          {activeTab === 'slam' && (
            <div className="w-full text-center">
              <div className="mb-4">
                <span className="font-mono text-xs text-terra uppercase tracking-widest font-bold">
                  The Decisive Move
                </span>
                <h2 className="font-display text-xl font-bold uppercase text-timber tracking-wider mt-0.5">
                  El Chuchazo (Table Slam)
                </h2>
                <p className="font-sans text-xs text-timber/50 mt-1">
                  In Latin & Caribbean dominoes, slamming the winning double tile announces victory.
                </p>
              </div>

              <div className="py-4">
                <DominoSlam tile={{ top: 6, bottom: 6 }} size="xl" label="Slam Double-Six!" />
              </div>
            </div>
          )}

          {/* Mode 3: La Sopa (Shuffle) */}
          {activeTab === 'shuffle' && (
            <div className="w-full text-center">
              <div className="mb-4">
                <span className="font-mono text-xs text-felt uppercase tracking-widest font-bold">
                  Boneyard Wash
                </span>
                <h2 className="font-display text-xl font-bold uppercase text-timber tracking-wider mt-0.5">
                  La Sopa (Tile Shuffle)
                </h2>
                <p className="font-sans text-xs text-timber/50 mt-1">
                  Swirling face-down domino tiles on the felt before drawing hands.
                </p>
              </div>

              <div className="py-4 flex justify-center">
                <DominoShuffle size="md" isInteractive={true} label="Dar Agua (Shuffle)" />
              </div>
            </div>
          )}

          {/* Mode 4: 3D Tile Flip Reveal */}
          {activeTab === 'reveal' && (
            <div className="w-full text-center">
              <div className="mb-4">
                <span className="font-mono text-xs text-brass uppercase tracking-widest font-bold">
                  Boneyard Draw
                </span>
                <h2 className="font-display text-xl font-bold uppercase text-timber tracking-wider mt-0.5">
                  3D Tile Reveal
                </h2>
                <p className="font-sans text-xs text-timber/50 mt-1">
                  Click any tile to flip between its engraved ebony back and ivory face.
                </p>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4 py-4 max-w-lg mx-auto">
                {boneyardGrid.map((tile, idx) => (
                  <div key={idx} className="flex justify-center">
                    <DominoFlipCard
                      top={tile.top}
                      bottom={tile.bottom}
                      size="sm"
                      initialFlipped={idx % 2 === 1}
                      interactive={true}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center pt-8 border-t border-timber/10 mt-8">
        <p className="font-mono text-xs tracking-widest uppercase text-timber/40">
          Bodega Social Club · Procedural Audio & Framer Motion Physics
        </p>
      </div>
    </div>
  );
}
