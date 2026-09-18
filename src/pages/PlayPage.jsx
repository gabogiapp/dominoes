import React, { useState } from 'react';
import { Layers, Zap, RefreshCw } from 'lucide-react';
import DominoCascade from '../components/animations/DominoCascade';
import DominoSlam from '../components/animations/DominoSlam';
import DominoShuffle from '../components/animations/DominoShuffle';

export default function PlayPage() {
  const [activeTab, setActiveTab] = useState('cascade');

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

  return (
    <div className="min-h-[calc(100vh-56px)] max-w-5xl mx-auto px-4 py-8 md:py-12 flex flex-col justify-start">
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
          Interact with physics-based domino toppling, Caribbean table slams, and tactile boneyard shuffling.
        </p>
      </div>

      {/* Mode Selector */}
      <div className="flex items-center justify-center mb-8 bg-bone-dark/50 p-2 rounded-2xl border border-timber/10 max-w-md mx-auto shadow-xs">
        <div className="grid grid-cols-3 gap-1.5 w-full">
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
        </div>
      </div>

      {/* Interactive Play Arena */}
      <div className="bg-bone border-2 border-timber/15 rounded-3xl p-6 sm:p-10 shadow-sm max-w-3xl mx-auto w-full min-h-[360px] flex flex-col items-center justify-center relative overflow-hidden">
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
              <p className="font-sans text-xs text-timber/60 mt-1 max-w-md mx-auto">
                Click any domino to topple the line from that exact position — preceding dominoes stay upright!
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
      </div>
    </div>
  );
}
