import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, Sparkles, Hand, Lock, Award, Zap, Waves, Disc } from 'lucide-react';
import {
  playTableKnock,
  playTranqueSound,
  playCapicuaSound,
  playDominoSlam,
  playDominoShuffle,
  playDominoClack,
  useDominoSound,
} from '../../utils/dominoAudio';

export default function DominoSoundboard() {
  const [soundEnabled, toggleSound] = useDominoSound();
  const [activePad, setActivePad] = useState(null);

  const soundPads = [
    {
      id: 'paso',
      term: '¡Paso!',
      subtitle: 'Table Knock',
      description: 'Double knuckle tap on the wood when you have no tile to play.',
      icon: Hand,
      color: 'border-timber/20 hover:border-timber bg-bone',
      activeColor: 'bg-timber text-bone',
      action: () => playTableKnock(0.55),
    },
    {
      id: 'tranque',
      term: '¡Tranque!',
      subtitle: 'Game Locked',
      description: 'When the board is closed and no one can play. Pip count decides winner.',
      icon: Lock,
      color: 'border-terra/30 hover:border-terra bg-terra/5',
      activeColor: 'bg-terra text-bone',
      action: () => playTranqueSound(0.55),
    },
    {
      id: 'capicua',
      term: '¡Capicúa!',
      subtitle: 'Double-End Victory',
      description: 'Winning the game with a tile that plays legally on either end of the board.',
      icon: Award,
      color: 'border-felt/30 hover:border-felt bg-felt/5',
      activeColor: 'bg-felt text-bone',
      action: () => playCapicuaSound(0.55),
    },
    {
      id: 'chuchazo',
      term: '¡Chuchazo!',
      subtitle: 'The Table Slam',
      description: 'Slamming the double-six [6|6] down with authority to announce your presence.',
      icon: Zap,
      color: 'border-brass/30 hover:border-brass bg-brass/5',
      activeColor: 'bg-brass text-timber',
      action: () => playDominoSlam(0.7),
    },
    {
      id: 'sopa',
      term: '¡La Sopa!',
      subtitle: 'Boneyard Wash',
      description: 'Swirling face-down domino tiles across the felt table before drawing.',
      icon: Waves,
      color: 'border-timber/20 hover:border-timber bg-bone',
      activeColor: 'bg-timber text-bone',
      action: () => playDominoShuffle(0.45),
    },
    {
      id: 'clack',
      term: '¡El Toque!',
      subtitle: 'Acrylic Clack',
      description: 'The pure, tactile snap of heavy resin tiles hitting each other.',
      icon: Disc,
      color: 'border-timber/20 hover:border-timber bg-bone',
      activeColor: 'bg-timber text-bone',
      action: () => playDominoClack(1.15, 0.5),
    },
  ];

  const triggerPad = (pad) => {
    setActivePad(pad.id);
    pad.action();
    setTimeout(() => {
      setActivePad((current) => (current === pad.id ? null : current));
    }, 350);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
      {/* Header */}
      <div className="text-center mb-6">
        <span className="font-mono text-xs text-felt uppercase tracking-widest font-bold flex items-center justify-center gap-1.5 mb-1">
          <Sparkles size={13} />
          Caribbean Domino Slang & Synthesizer
        </span>
        <h3 className="font-display text-2xl uppercase tracking-wider text-timber font-bold">
          Bodega Soundboard
        </h3>
        <p className="font-sans text-xs text-timber/60 max-w-md mx-auto mt-1">
          Tactile audio buttons for classic domino calls and table rituals, synthesized directly via Web Audio.
        </p>

        {/* Mute indicator banner if muted */}
        {!soundEnabled && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-terra/10 border border-terra/30 text-terra text-xs font-mono">
            <VolumeX size={14} />
            <span>Sound is currently muted.</span>
            <button
              onClick={toggleSound}
              className="underline font-bold hover:text-terra-light cursor-pointer"
            >
              Unmute
            </button>
          </div>
        )}
      </div>

      {/* Grid of Sound Pads */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 w-full mb-6">
        {soundPads.map((pad) => {
          const Icon = pad.icon;
          const isActive = activePad === pad.id;

          return (
            <motion.button
              key={pad.id}
              whileTap={{ scale: 0.94 }}
              onClick={() => triggerPad(pad)}
              className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between min-h-[125px] shadow-xs cursor-pointer select-none ${
                isActive ? pad.activeColor : pad.color
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isActive ? 'bg-black/10' : 'bg-timber/5'
                }`}>
                  <Icon size={16} />
                </div>
                <span className="font-mono text-[9px] uppercase tracking-wider opacity-60">
                  FX
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-1.5">
                  <h4 className="font-display text-base uppercase font-bold tracking-wide">
                    {pad.term}
                  </h4>
                </div>
                <span className="font-mono text-[10px] block opacity-75 font-semibold">
                  {pad.subtitle}
                </span>
                <p className="font-sans text-[10px] leading-tight mt-1 opacity-70 line-clamp-2">
                  {pad.description}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Audio Status Footer */}
      <div className="flex items-center gap-3 text-timber/60 font-mono text-xs">
        <button
          onClick={toggleSound}
          className="flex items-center gap-1.5 hover:text-timber cursor-pointer px-3 py-1.5 rounded-lg border border-timber/15 bg-bone hover:bg-bone-dark transition-colors"
        >
          {soundEnabled ? <Volume2 size={13} className="text-felt" /> : <VolumeX size={13} className="text-terra" />}
          <span>{soundEnabled ? 'Audio Active' : 'Audio Muted'}</span>
        </button>
      </div>
    </div>
  );
}
