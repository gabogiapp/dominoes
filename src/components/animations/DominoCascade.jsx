import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import DominoTile from '../DominoTile';
import { playDominoClack, toggleDominoSound, isDominoSoundEnabled } from '../../utils/dominoAudio';

const DEFAULT_TILES = [
  { top: 6, bottom: 6 },
  { top: 6, bottom: 5 },
  { top: 5, bottom: 5 },
  { top: 5, bottom: 4 },
  { top: 4, bottom: 4 },
  { top: 4, bottom: 3 },
  { top: 3, bottom: 3 },
  { top: 6, bottom: 1 },
];

export default function DominoCascade({
  tiles = DEFAULT_TILES,
  size = 'md',
  autoPlay = false,
  compact = false,
}) {
  const [toppledIndex, setToppledIndex] = useState(-1); // -1 means all upright
  const [soundOn, setSoundOn] = useState(isDominoSoundEnabled());
  const timeoutsRef = useRef([]);

  const clearTimeouts = React.useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const triggerTopple = React.useCallback((fromIndex = 0) => {
    clearTimeouts();
    setToppledIndex(fromIndex);

    // Chain reaction audio & progression
    for (let i = fromIndex; i < tiles.length; i++) {
      const delay = (i - fromIndex) * 110;
      const tid = setTimeout(() => {
        setToppledIndex(i);
        playDominoClack(1.0 + (i * 0.05), 0.22);
      }, delay);
      timeoutsRef.current.push(tid);
    }
  }, [clearTimeouts, tiles.length]);

  const resetTiles = () => {
    clearTimeouts();
    setToppledIndex(-1);
    playDominoClack(1.3, 0.15);
  };

  useEffect(() => {
    if (autoPlay) {
      const timer = setTimeout(() => triggerTopple(0), 600);
      return () => clearTimeout(timer);
    }
    return clearTimeouts;
  }, [autoPlay, triggerTopple, clearTimeouts]);

  const handleSoundToggle = (e) => {
    e.stopPropagation();
    const next = toggleDominoSound();
    setSoundOn(next);
  };

  const isAllFallen = toppledIndex >= tiles.length - 1;

  return (
    <div className="flex flex-col items-center">
      {/* Domino row container */}
      <div
        className="relative flex items-end justify-center py-6 px-4 select-none overflow-x-auto max-w-full"
        style={{ perspective: 900 }}
      >
        {/* Felt table surface runner */}
        <div className="absolute bottom-6 left-2 right-2 h-1.5 bg-timber/15 rounded-full" />

        <div className="flex items-end -space-x-1 sm:space-x-0 relative z-10">
          {tiles.map((tile, i) => {
            const isFallen = toppledIndex >= i;
            // The last tile falls further onto its back or a soft angle
            const targetRotate = isFallen ? (i === tiles.length - 1 ? 78 : 68) : 0;
            const targetX = isFallen ? 8 : 0;
            const targetY = isFallen ? 4 : 0;

            return (
              <motion.div
                key={i}
                className="cursor-pointer origin-bottom-right px-1"
                initial={false}
                animate={{
                  rotateZ: targetRotate,
                  x: targetX,
                  y: targetY,
                }}
                transition={
                  isFallen
                    ? {
                        type: 'spring',
                        stiffness: 420,
                        damping: 18,
                        mass: 0.6,
                      }
                    : {
                        type: 'spring',
                        stiffness: 300,
                        damping: 22,
                      }
                }
                whileHover={!isFallen ? { scale: 1.05, y: -4 } : {}}
                whileTap={!isFallen ? { rotateZ: 15 } : {}}
                onClick={() => {
                  if (isFallen) {
                    resetTiles();
                  } else {
                    triggerTopple(i);
                  }
                }}
                title={isFallen ? 'Click to reset' : `Click tile #${i + 1} to topple`}
              >
                <DominoTile
                  top={tile.top}
                  bottom={tile.bottom}
                  size={size}
                  className="shadow-sm transition-shadow hover:shadow-md"
                />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Interactive Controls */}
      {!compact && (
        <div className="flex items-center gap-2 mt-2">
          {isAllFallen ? (
            <button
              onClick={resetTiles}
              className="px-4 py-1.5 bg-timber/10 hover:bg-timber/20 text-timber rounded-full text-xs font-mono tracking-wider uppercase font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw size={13} /> Stand Dominoes Up
            </button>
          ) : (
            <button
              onClick={() => triggerTopple(0)}
              className="px-4 py-1.5 bg-terra hover:bg-terra-light text-bone rounded-full text-xs font-mono tracking-wider uppercase font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm active:scale-95"
            >
              <Play size={13} /> Topple Cascade
            </button>
          )}

          <button
            onClick={handleSoundToggle}
            className="p-1.5 rounded-full text-timber/40 hover:text-timber/70 hover:bg-timber/5 transition-colors cursor-pointer"
            title={soundOn ? 'Domino sound enabled' : 'Domino sound muted'}
          >
            {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
        </div>
      )}
    </div>
  );
}
