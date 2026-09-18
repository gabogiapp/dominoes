import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, RotateCcw } from 'lucide-react';
import DominoTile from '../DominoTile';
import { playDominoClack } from '../../utils/dominoAudio';

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
  // Array of booleans: true = toppled/fallen, false = standing upright
  const [fallen, setFallen] = useState(() => Array(tiles.length).fill(false));
  const timeoutsRef = useRef([]);
  const fallenRef = useRef(fallen);

  useEffect(() => {
    fallenRef.current = fallen;
  }, [fallen]);

  useEffect(() => {
    setFallen(Array(tiles.length).fill(false));
  }, [tiles.length]);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  /**
   * Topples the line sequentially starting from fromIndex through to the end.
   * Tiles before fromIndex remain standing upright!
   */
  const triggerTopple = useCallback(
    (fromIndex = 0) => {
      clearTimeouts();

      let step = 0;
      for (let i = fromIndex; i < tiles.length; i++) {
        // If a subsequent tile is already down, stop the cascade chain there
        if (i > fromIndex && fallenRef.current[i]) {
          break;
        }

        const targetIndex = i;
        const delay = step * 105;
        const tid = setTimeout(() => {
          setFallen((prev) => {
            const next = [...prev];
            next[targetIndex] = true;
            return next;
          });
          playDominoClack(1.0 + targetIndex * 0.05, 0.22);
        }, delay);
        timeoutsRef.current.push(tid);
        step++;
      }
    },
    [clearTimeouts, tiles.length]
  );

  const resetTiles = () => {
    clearTimeouts();
    setFallen(Array(tiles.length).fill(false));
    playDominoClack(1.3, 0.16);
  };

  const handleTileClick = (index) => {
    if (fallen[index]) {
      // Tap a fallen domino to stand it back up
      clearTimeouts();
      setFallen((prev) => {
        const next = [...prev];
        next[index] = false;
        return next;
      });
      playDominoClack(1.35, 0.14);
    } else {
      // Tap standing domino to start cascade from this exact position
      triggerTopple(index);
    }
  };

  useEffect(() => {
    if (autoPlay) {
      const timer = setTimeout(() => triggerTopple(0), 600);
      return () => clearTimeout(timer);
    }
    return clearTimeouts;
  }, [autoPlay, triggerTopple, clearTimeouts]);

  const hasAnyFallen = fallen.some(Boolean);

  return (
    <div className="flex flex-col items-center select-none">
      {/* Domino row on felt table plate */}
      <div
        className="relative flex items-end justify-center py-6 px-4 select-none overflow-x-auto max-w-full"
        style={{ perspective: 900 }}
      >
        {/* Felt table surface runner */}
        <div className="absolute bottom-6 left-4 right-4 h-2 bg-felt/80 rounded-full shadow-inner border-b border-brass/30" />

        <div className="flex items-end -space-x-1 sm:space-x-1 relative z-10">
          {tiles.map((tile, i) => {
            const isFallen = fallen[i];
            const isLast = i === tiles.length - 1;

            return (
              <motion.div
                key={i}
                className="cursor-pointer px-1 origin-bottom-right select-none"
                animate={{
                  rotateZ: isFallen ? (isLast ? 78 : 68) : 0,
                  x: isFallen ? 8 : 0,
                  y: isFallen ? 4 : 0,
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
                        stiffness: 320,
                        damping: 22,
                      }
                }
                whileHover={!isFallen ? { scale: 1.05, y: -4 } : { scale: 1.02 }}
                whileTap={!isFallen ? { rotateZ: 14 } : {}}
                onClick={() => handleTileClick(i)}
                title={
                  isFallen
                    ? `Domino #${i + 1} is fallen. Click to stand upright.`
                    : `Click domino #${i + 1} to topple from here`
                }
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

      {/* Single, simple, prominent action button */}
      {!compact && (
        <div className="mt-4">
          {hasAnyFallen ? (
            <button
              onClick={resetTiles}
              className="px-6 py-2.5 bg-timber hover:bg-timber/90 text-bone rounded-xl text-xs font-mono tracking-wider uppercase font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 border border-brass/30"
            >
              <RotateCcw size={14} />
              <span>Stand Dominoes Up</span>
            </button>
          ) : (
            <button
              onClick={() => triggerTopple(0)}
              className="px-6 py-2.5 bg-terra hover:bg-terra-light text-bone rounded-xl text-xs font-mono tracking-wider uppercase font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Play size={14} className="fill-bone" />
              <span>Topple Cascade</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
