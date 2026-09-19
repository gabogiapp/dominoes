import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  playGiantDominoCrash,
  playSpringBoing,
  playPitterPatter,
  playPuffSound,
  playElasticSnap,
} from '../../utils/dominoAudio';

export const TRIGGER_TILE_SHOWER_EVENT = 'dominoes_trigger_tile_shower';
export const PAGE_SQUISH_EVENT = 'dominoes_page_squish_state';

export function triggerTileShower() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TRIGGER_TILE_SHOWER_EVENT));
  }
}

// Full 28 double-six domino tile deck
const ALL_TILES = [];
for (let t = 0; t <= 6; t++) {
  for (let b = t; b <= 6; b++) {
    ALL_TILES.push({ top: t, bottom: b });
  }
}

// Render pips for domino half
function DominoPips({ count }) {
  const pipPositions = {
    0: [],
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
  };

  const points = pipPositions[Math.min(Math.max(0, count), 6)] || [];

  return (
    <div className="relative w-full h-full">
      {points.map(([x, y], idx) => (
        <div
          key={idx}
          style={{ left: `${x}%`, top: `${y}%` }}
          className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#18110D] shadow-inner"
        >
          {/* Glossy highlight on pip */}
          <div className="absolute top-0.5 left-1 w-1.5 h-1.5 rounded-full bg-white/40 pointer-events-none" />
        </div>
      ))}
    </div>
  );
}

export default function TileShowerEffect({ onSquishStateChange }) {
  // 'idle' | 'falling' | 'impact' | 'recoil' | 'scurrying' | 'smoke' | 'restoring'
  const [animState, setAnimState] = useState('idle');
  const [activeTile, setActiveTile] = useState({ top: 6, bottom: 6 });

  const notifySquish = useCallback((squishState) => {
    if (onSquishStateChange) onSquishStateChange(squishState);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(PAGE_SQUISH_EVENT, { detail: squishState }));
    }
  }, [onSquishStateChange]);

  useEffect(() => {
    let t1, t2, t3, t4, t5, t6;

    const startSequence = () => {
      // Scroll to top so animation is centered in viewport
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }

      // Pick a random tile from the 28-tile set each time
      const randTile = ALL_TILES[Math.floor(Math.random() * ALL_TILES.length)];
      setActiveTile(randTile);

      // Phase 1: Anvil Plunge (T = 0ms)
      setAnimState('falling');

      // Phase 2: Heavy Impact & Page Squish (T = 550ms)
      t1 = setTimeout(() => {
        setAnimState('impact');
        playGiantDominoCrash(0.95);
        notifySquish('squashed');
      }, 550);

      // Phase 3: Exaggerated Spring Recoil Jump & Sprout Legs (T = 850ms)
      t2 = setTimeout(() => {
        setAnimState('recoil');
        playSpringBoing(0.55);
      }, 850);

      // Phase 4: Scurry Away into Deep 3D Perspective (T = 1200ms)
      t3 = setTimeout(() => {
        setAnimState('scurrying');
        playPitterPatter(16, 50);
      }, 1200);

      // Phase 5: Vanish into Distance with Smoke Puff (T = 2300ms)
      t4 = setTimeout(() => {
        setAnimState('smoke');
        playPuffSound(0.45);
      }, 2300);

      // Phase 6: Elastic Snap-Back Uncompress of Web Page (T = 2550ms)
      t5 = setTimeout(() => {
        setAnimState('restoring');
        playElasticSnap(0.6);
        notifySquish('snap_back');
      }, 2550);

      // Phase 7: Complete Return to Normal (T = 3400ms)
      t6 = setTimeout(() => {
        setAnimState('idle');
        notifySquish('idle');
      }, 3400);
    };

    window.addEventListener(TRIGGER_TILE_SHOWER_EVENT, startSequence);
    return () => {
      window.removeEventListener(TRIGGER_TILE_SHOWER_EVENT, startSequence);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
    };
  }, [notifySquish]);

  if (animState === 'idle') return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden flex items-end justify-center pb-8 sm:pb-12"
      style={{ perspective: '1100px' }}
    >
      {/* 1. Perspective Floor & Void when squished */}
      {(animState === 'impact' || animState === 'recoil' || animState === 'scurrying' || animState === 'smoke') && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0 pointer-events-none -z-10 flex items-center justify-center overflow-hidden bg-white/30"
        >
          {/* Horizon guide line */}
          <div className="absolute top-[52%] left-0 right-0 h-[1px] bg-slate-200/50" />

          {/* Perspective grid floor receding into deep horizon */}
          <div
            className="absolute inset-x-0 bottom-0 h-[48%] opacity-25"
            style={{
              backgroundImage: 'linear-gradient(to right, #94A3B8 1px, transparent 1px), linear-gradient(to bottom, #94A3B8 1px, transparent 1px)',
              backgroundSize: '48px 30px',
              transform: 'perspective(450px) rotateX(68deg)',
              transformOrigin: 'bottom center',
            }}
          />
        </motion.div>
      )}

      {/* 2. Impact Radial Shockwave Ring */}
      {animState === 'impact' && (
        <motion.div
          initial={{ scale: 0.2, opacity: 0.95 }}
          animate={{ scale: 3.4, opacity: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="absolute bottom-6 sm:bottom-10 w-64 h-64 rounded-full border-4 border-timber pointer-events-none"
        />
      )}

      {/* 3. Smoke Puff at Vanishing Point */}
      {animState === 'smoke' && (
        <div className="absolute bottom-[44%] flex items-center justify-center pointer-events-none">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0.2, opacity: 0.9, x: 0, y: 0 }}
              animate={{
                scale: 1.5,
                opacity: 0,
                x: Math.cos((deg * Math.PI) / 180) * 32,
                y: Math.sin((deg * Math.PI) / 180) * 22,
              }}
              transition={{ duration: 0.42, ease: 'easeOut' }}
              className="absolute w-5 h-5 rounded-full bg-timber/35 blur-[1px]"
            />
          ))}
          <motion.div
            initial={{ scale: 0.3, opacity: 0.95 }}
            animate={{ scale: 2.0, opacity: 0 }}
            transition={{ duration: 0.38, ease: 'easeOut' }}
            className="w-8 h-8 rounded-full bg-bone border border-timber/40"
          />
        </div>
      )}

      {/* 4. THE DOMINO CHARACTER CONTAINER */}
      <motion.div
        initial={{ y: '-130vh', scale: 1.1, rotateX: 60, rotateZ: -8, opacity: 1 }}
        animate={
          animState === 'falling'
            ? {
                y: 0,
                scale: 1,
                rotateX: 0,
                rotateZ: 0,
                opacity: 1,
                transition: { duration: 0.55, ease: [0.45, 0.05, 0.85, 0.15] },
              }
            : animState === 'impact'
            ? {
                y: 0,
                scaleY: 0.45, // Cartoon squash on impact
                scaleX: 1.45,
                rotateX: 0,
                rotateZ: 0,
                opacity: 1,
                transition: { duration: 0.2, ease: 'easeOut' },
              }
            : animState === 'recoil'
            ? {
                y: -140, // Springy pop up jump
                scaleY: 1.25, // Stretch recoil
                scaleX: 0.85,
                rotateX: -12,
                opacity: 1,
                transition: { duration: 0.32, ease: [0.2, 0.8, 0.4, 1.2] },
              }
            : animState === 'scurrying'
            ? {
                y: -240, // Running deep into horizon
                scale: 0.08, // Vanishing into deep 3D perspective
                rotateX: 20,
                rotateY: [0, -10, 10, -10, 10, -8, 8, 0],
                opacity: [1, 1, 0.9, 0.2],
                transition: { duration: 1.1, ease: 'easeIn' },
              }
            : {
                opacity: 0,
                scale: 0,
              }
        }
        className="relative z-20 flex flex-col items-center select-none"
      >
        {/* DOMINO TILE BODY */}
        <div
          className="relative w-[140px] h-[260px] sm:w-[170px] sm:h-[310px] bg-gradient-to-b from-[#FFFFFF] via-[#FAF7F2] to-[#ECE5D8] rounded-2xl sm:rounded-3xl border-3 border-timber shadow-2xl flex flex-col justify-between p-3 sm:p-4 overflow-hidden"
          style={{
            boxShadow: '0 25px 50px -10px rgba(0, 0, 0, 0.5), inset 0 2px 5px rgba(255, 255, 255, 0.95), inset 0 -3px 6px rgba(30, 22, 17, 0.18)',
          }}
        >
          {/* Top Half Pips */}
          <div className="flex-1 flex items-center justify-center p-1 relative">
            <DominoPips count={activeTile.top} />
          </div>

          {/* Center Brass Divider & Spinner Rivet */}
          <div className="relative w-full h-2 flex items-center justify-center my-0.5">
            <div className="w-full h-[2px] bg-timber/80 rounded-full" />
            <div className="absolute w-4 h-4 rounded-full bg-gradient-to-br from-[#F5D580] via-[#DDA15E] to-[#9C6D32] border border-timber shadow-sm flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80" />
            </div>
          </div>

          {/* Bottom Half Pips */}
          <div className="flex-1 flex items-center justify-center p-1 relative">
            <DominoPips count={activeTile.bottom} />
          </div>
        </div>

        {/* 5. TINY CARTOON LEGS (Sprout during recoil & run frantically during scurry) */}
        {(animState === 'recoil' || animState === 'scurrying') && (
          <div className="flex justify-between w-20 sm:w-24 px-2 -mt-1 relative z-10">
            {/* Left Leg */}
            <motion.div
              animate={
                animState === 'scurrying'
                  ? {
                      rotate: [-45, 45, -45],
                      y: [0, -10, 0],
                    }
                  : {
                      rotate: [15, -5],
                      y: [0, 4],
                    }
              }
              transition={
                animState === 'scurrying'
                  ? { repeat: Infinity, duration: 0.12, ease: 'linear' }
                  : { duration: 0.25 }
              }
              className="origin-top flex flex-col items-center"
            >
              <div className="w-1.5 h-6 sm:h-8 bg-timber rounded-full" />
              <div className="w-5 h-2.5 bg-black rounded-full shadow-xs -ml-1 border-t border-white/30" />
            </motion.div>

            {/* Right Leg */}
            <motion.div
              animate={
                animState === 'scurrying'
                  ? {
                      rotate: [45, -45, 45],
                      y: [-10, 0, -10],
                    }
                  : {
                      rotate: [-15, 5],
                      y: [4, 0],
                    }
              }
              transition={
                animState === 'scurrying'
                  ? { repeat: Infinity, duration: 0.12, ease: 'linear' }
                  : { duration: 0.25 }
              }
              className="origin-top flex flex-col items-center"
            >
              <div className="w-1.5 h-6 sm:h-8 bg-timber rounded-full" />
              <div className="w-5 h-2.5 bg-black rounded-full shadow-xs ml-1 border-t border-white/30" />
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
