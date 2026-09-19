import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { playGiantDominoCrash, playDominoClack } from '../../utils/dominoAudio';

export const TRIGGER_TILE_SHOWER_EVENT = 'dominoes_trigger_tile_shower';

export function triggerTileShower() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TRIGGER_TILE_SHOWER_EVENT));
  }
}

export default function TileShowerEffect() {
  // animationStage: 'idle' | 'falling' | 'slammed' | 'lifting'
  const [stage, setStage] = useState('idle');

  const handleDismiss = useCallback(() => {
    setStage((prev) => {
      if (prev === 'idle' || prev === 'lifting') return prev;
      playDominoClack(1.3, 0.4);
      setTimeout(() => {
        setStage('idle');
      }, 600);
      return 'lifting';
    });
  }, []);

  useEffect(() => {
    let dismissTimer = null;

    const handleTrigger = () => {
      // 1. Start falling
      setStage('falling');

      // 2. Impact timing matches the drop duration (700ms)
      setTimeout(() => {
        setStage('slammed');
        playGiantDominoCrash(0.95);
      }, 700);

      // 3. Auto dismiss after 5.5 seconds
      dismissTimer = setTimeout(() => {
        handleDismiss();
      }, 5500);
    };

    window.addEventListener(TRIGGER_TILE_SHOWER_EVENT, handleTrigger);
    return () => {
      window.removeEventListener(TRIGGER_TILE_SHOWER_EVENT, handleTrigger);
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, [handleDismiss]);

  if (stage === 'idle') return null;

  return (
    <div
      onClick={handleDismiss}
      className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center cursor-pointer select-none"
      style={{ perspective: '1200px' }}
    >
      {/* 1. Backdrop darkener & screen squish wrapper */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: stage === 'lifting' ? 0 : 0.6 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-timber/80 backdrop-blur-xs pointer-events-auto"
      />

      {/* 2. Impact Shockwave Rings (trigger on slam) */}
      {stage === 'slammed' && (
        <>
          <motion.div
            initial={{ scale: 0.2, opacity: 0.9 }}
            animate={{ scale: 3.5, opacity: 0 }}
            transition={{ duration: 0.85, ease: 'easeOut' }}
            className="absolute w-72 h-72 rounded-full border-4 border-terra pointer-events-none"
          />
          <motion.div
            initial={{ scale: 0.1, opacity: 0.8 }}
            animate={{ scale: 2.8, opacity: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease: 'easeOut' }}
            className="absolute w-72 h-72 rounded-full border-2 border-brass pointer-events-none"
          />
        </>
      )}

      {/* 3. Comic Impact Dust / Debris Flying Out */}
      {stage === 'slammed' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {[-180, -140, -90, -40, 40, 90, 140, 180].map((angle, i) => (
            <motion.div
              key={i}
              initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
              animate={{
                x: Math.cos((angle * Math.PI) / 180) * 280,
                y: Math.sin((angle * Math.PI) / 180) * 220 + 80,
                scale: 0.2,
                opacity: 0,
                rotate: angle * 3,
              }}
              transition={{ duration: 0.75, ease: 'easeOut' }}
              className="absolute w-5 h-8 bg-bone border border-timber rounded-xs shadow-md"
            />
          ))}
        </div>
      )}

      {/* 4. Floor Shadow */}
      <motion.div
        initial={{ scale: 0.2, opacity: 0 }}
        animate={
          stage === 'falling'
            ? { scale: [0.2, 1], opacity: [0, 0.75] }
            : stage === 'lifting'
            ? { scale: 0.2, opacity: 0 }
            : { scale: 1.1, opacity: 0.8 }
        }
        transition={{ duration: stage === 'falling' ? 0.7 : 0.4 }}
        className="absolute bottom-[10%] w-[320px] sm:w-[460px] h-[70px] bg-black/60 rounded-full blur-xl pointer-events-none"
      />

      {/* 5. Screen Shake & The Giant Domino */}
      <motion.div
        animate={
          stage === 'slammed'
            ? {
                x: [0, -22, 24, -18, 16, -10, 8, -4, 0],
                y: [0, 18, -14, 12, -8, 6, -3, 0],
              }
            : { x: 0, y: 0 }
        }
        transition={{ duration: 0.65, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center pointer-events-auto"
      >
        {/* THE MASSIVE DOUBLE-SIX DOMINO */}
        <motion.div
          initial={{ y: '-140vh', rotateX: 65, rotateZ: -12, scale: 1.25, opacity: 0.9 }}
          animate={
            stage === 'falling'
              ? { y: 0, rotateX: 0, rotateZ: 0, scale: 1, opacity: 1 }
              : stage === 'lifting'
              ? { y: '-140vh', rotateX: -55, rotateZ: 8, scale: 1.1, opacity: 0 }
              : {
                  y: [0, -12, 0],
                  scaleY: [1, 0.82, 1.08, 0.96, 1], // The cartoon impact SQUISH!
                  scaleX: [1, 1.24, 0.95, 1.03, 1],
                }
          }
          transition={
            stage === 'falling'
              ? { duration: 0.7, ease: [0.35, 0.05, 0.85, 0.15] } // Gravitational acceleration
              : stage === 'lifting'
              ? { duration: 0.55, ease: 'easeIn' }
              : { duration: 0.55, ease: 'easeOut' }
          }
          className="relative w-[280px] h-[520px] sm:w-[340px] sm:h-[620px] bg-gradient-to-b from-[#FFFDF9] via-[#F7F3EA] to-[#ECE5D8] rounded-[36px] p-5 border-4 border-timber shadow-2xl flex flex-col justify-between overflow-hidden"
          style={{
            boxShadow: '0 35px 70px -15px rgba(0, 0, 0, 0.75), inset 0 2px 6px rgba(255, 255, 255, 0.9), inset 0 -4px 8px rgba(30, 22, 17, 0.2)',
          }}
        >
          {/* Subtle glossy acrylic bevel */}
          <div className="absolute inset-2 rounded-[28px] border-2 border-white/60 pointer-events-none" />

          {/* TOP HALF: SIX PIPS */}
          <div className="flex-1 flex items-center justify-center p-2 relative">
            <div className="grid grid-cols-2 gap-x-12 sm:gap-x-16 gap-y-4 sm:gap-y-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={`top-${i}`}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-timber shadow-inner border border-black/30 relative"
                >
                  <div className="absolute top-1.5 left-2 w-2 h-2 rounded-full bg-white/25" />
                </div>
              ))}
            </div>
          </div>

          {/* CENTER DIVIDER WITH BRASS SPINNER RIVET */}
          <div className="relative w-full h-3 flex items-center justify-center my-1">
            <div className="w-full h-1 bg-timber/80 rounded-full shadow-inner" />
            {/* Brass Center Rivet */}
            <div className="absolute w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-[#F5D580] via-[#DDA15E] to-[#9C6D32] border-2 border-timber shadow-md flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFF4D4] opacity-80" />
            </div>
          </div>

          {/* BOTTOM HALF: SIX PIPS */}
          <div className="flex-1 flex items-center justify-center p-2 relative">
            <div className="grid grid-cols-2 gap-x-12 sm:gap-x-16 gap-y-4 sm:gap-y-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={`bot-${i}`}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-timber shadow-inner border border-black/30 relative"
                >
                  <div className="absolute top-1.5 left-2 w-2 h-2 rounded-full bg-white/25" />
                </div>
              ))}
            </div>
          </div>

          {/* VICTORY STAMP OVERLAY (Slams on impact) */}
          {stage === 'slammed' && (
            <motion.div
              initial={{ scale: 3.5, rotate: -25, opacity: 0 }}
              animate={{ scale: 1, rotate: -12, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.28, ease: 'easeOut' }}
              className="absolute inset-x-4 top-1/2 -translate-y-1/2 bg-terra text-bone py-3.5 px-4 rounded-2xl border-4 border-white shadow-2xl text-center z-20 pointer-events-none"
            >
              <span className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.25em] text-brass block font-bold">
                ¡El Chuchazo Supremo!
              </span>
              <h2 className="font-display text-2xl sm:text-3xl uppercase tracking-wider font-extrabold text-white leading-tight">
                SQUISHED!
              </h2>
              <span className="font-sans text-[11px] sm:text-xs text-bone/80 block mt-0.5">
                Double-Six crushes all competition.
              </span>
            </motion.div>
          )}
        </motion.div>

        {/* Dismiss hint */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 bg-bone/95 text-timber border-2 border-timber/30 px-5 py-2 rounded-full font-mono text-xs uppercase tracking-wider font-bold shadow-lg flex items-center gap-2"
        >
          <span>Tap anywhere to lift tile</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
