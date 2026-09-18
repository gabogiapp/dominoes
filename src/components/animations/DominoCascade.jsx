import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, RotateCcw, ArrowRight, ArrowLeft } from 'lucide-react';
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
  // Each tile has its own independent state: null (standing) | 'right' | 'left'
  const [fallenStates, setFallenStates] = useState(() => Array(tiles.length).fill(null));
  const [cascadeDir, setCascadeDir] = useState('right'); // 'right' | 'left'

  const timeoutsRef = useRef([]);
  const fallenRef = useRef(fallenStates);

  useEffect(() => {
    fallenRef.current = fallenStates;
  }, [fallenStates]);

  useEffect(() => {
    // Synchronize array size if tiles prop changes
    setFallenStates(Array(tiles.length).fill(null));
  }, [tiles.length]);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  /**
   * Triggers a cascade starting from fromIndex in direction dir.
   * Only tiles in the topple direction fall; preceding tiles remain upright!
   */
  const triggerTopple = useCallback(
    (fromIndex = 0, dir = cascadeDir) => {
      clearTimeouts();

      if (dir === 'right') {
        let step = 0;
        for (let i = fromIndex; i < tiles.length; i++) {
          // If a tile further down is already fallen to the right, chain stops there
          if (i > fromIndex && fallenRef.current[i] === 'right') {
            break;
          }

          const targetIndex = i;
          const delay = step * 105;
          const tid = setTimeout(() => {
            setFallenStates((prev) => {
              const next = [...prev];
              next[targetIndex] = 'right';
              return next;
            });
            playDominoClack(1.0 + targetIndex * 0.05, 0.22);
          }, delay);
          timeoutsRef.current.push(tid);
          step++;
        }
      } else {
        // Topple leftwards (from fromIndex down to 0)
        let step = 0;
        for (let i = fromIndex; i >= 0; i--) {
          if (i < fromIndex && fallenRef.current[i] === 'left') {
            break;
          }

          const targetIndex = i;
          const delay = step * 105;
          const tid = setTimeout(() => {
            setFallenStates((prev) => {
              const next = [...prev];
              next[targetIndex] = 'left';
              return next;
            });
            playDominoClack(1.0 + (tiles.length - 1 - targetIndex) * 0.05, 0.22);
          }, delay);
          timeoutsRef.current.push(tid);
          step++;
        }
      }
    },
    [clearTimeouts, tiles.length, cascadeDir]
  );

  const resetTiles = () => {
    clearTimeouts();
    setFallenStates(Array(tiles.length).fill(null));
    playDominoClack(1.3, 0.16);
  };

  const handleTileClick = (e, index) => {
    const isFallen = fallenStates[index] !== null;

    if (isFallen) {
      // Clicking a fallen tile stands it back upright
      clearTimeouts();
      setFallenStates((prev) => {
        const next = [...prev];
        next[index] = null;
        return next;
      });
      playDominoClack(1.4, 0.14);
      return;
    }

    // Safely extract clientX for mouse, touch, or keyboard interactions
    const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = clientX != null ? clientX - rect.left : rect.width / 2;
    let pushDir = cascadeDir;

    if (clickX > rect.width * 0.65 && index > 0 && fallenStates[index - 1] === null) {
      pushDir = 'left';
    } else if (clickX < rect.width * 0.35 && index < tiles.length - 1) {
      pushDir = 'right';
    } else {
      const hasStandingRight = fallenStates.slice(index + 1).some((s) => s === null);
      const hasStandingLeft = fallenStates.slice(0, index).some((s) => s === null);
      if (!hasStandingRight && hasStandingLeft) {
        pushDir = 'left';
      } else {
        pushDir = cascadeDir;
      }
    }

    triggerTopple(index, pushDir);
  };

  useEffect(() => {
    if (autoPlay) {
      const timer = setTimeout(() => triggerTopple(0, 'right'), 600);
      return () => clearTimeout(timer);
    }
    return clearTimeouts;
  }, [autoPlay, triggerTopple, clearTimeouts]);

  const standingCount = fallenStates.filter((s) => s === null).length;
  const allFallen = standingCount === 0;
  const noneFallen = standingCount === tiles.length;

  const getTileTitle = (i) => {
    const isFallen = fallenStates[i] !== null;
    if (isFallen) return `Domino #${i + 1} has fallen. Click to stand it upright.`;
    if (cascadeDir === 'right') {
      const count = tiles.length - i;
      return `Click domino #${i + 1} to topple ${count === 1 ? 'this tile' : `tiles #${i + 1} → #${tiles.length}`} (tiles #1 → #${i} stay standing)`;
    } else {
      return `Click domino #${i + 1} to topple backwards towards tile #1`;
    }
  };

  return (
    <div className="flex flex-col items-center select-none">
      {/* Domino row runner track */}
      <div
        className="relative flex items-end justify-center py-8 px-6 select-none overflow-x-auto max-w-full"
        style={{ perspective: 900 }}
      >
        {/* Felt table surface runner plate */}
        <div className="absolute bottom-6 left-4 right-4 h-2 bg-felt/80 rounded-full shadow-inner border-b border-brass/30" />

        <div className="flex items-end -space-x-1 sm:space-x-1 relative z-10">
          {tiles.map((tile, i) => {
            const fallDir = fallenStates[i];
            const isFallen = fallDir !== null;

            let rotateZ = 0;
            let targetX = 0;
            let targetY = 0;
            let transformOrigin = 'bottom right';

            if (fallDir === 'right') {
              rotateZ = i === tiles.length - 1 ? 78 : 68;
              targetX = 8;
              targetY = 4;
              transformOrigin = 'bottom right';
            } else if (fallDir === 'left') {
              rotateZ = i === 0 ? -78 : -68;
              targetX = -8;
              targetY = 4;
              transformOrigin = 'bottom left';
            }

            return (
              <motion.div
                key={i}
                className={`cursor-pointer px-1 relative group select-none ${
                  transformOrigin === 'bottom right' ? 'origin-bottom-right' : 'origin-bottom-left'
                }`}
                style={{ transformOrigin }}
                animate={{
                  rotateZ,
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
                        stiffness: 320,
                        damping: 22,
                      }
                }
                whileHover={!isFallen ? { scale: 1.05, y: -4 } : { scale: 1.02 }}
                whileTap={!isFallen ? { rotateZ: cascadeDir === 'right' ? 14 : -14 } : {}}
                onClick={(e) => handleTileClick(e, i)}
                title={getTileTitle(i)}
              >
                {/* Index indicator pill on hover */}
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-timber text-bone text-[10px] font-mono px-2 py-0.5 rounded shadow-sm whitespace-nowrap z-20 flex items-center gap-1 border border-brass/30">
                  <span>#{i + 1}</span>
                  <span>{isFallen ? '↩' : cascadeDir === 'right' ? '➔' : '⬅'}</span>
                </div>

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
        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-2">
          {/* Main Action Button */}
          {allFallen ? (
            <button
              onClick={resetTiles}
              className="px-4 py-2 bg-timber hover:bg-timber/90 text-bone rounded-xl text-xs font-mono tracking-wider uppercase font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 border border-brass/40"
            >
              <RotateCcw size={13} /> Stand Dominoes Up
            </button>
          ) : (
            <button
              onClick={() => {
                if (cascadeDir === 'right') {
                  const firstStanding = fallenStates.findIndex((s) => s === null);
                  if (firstStanding !== -1) triggerTopple(firstStanding, 'right');
                } else {
                  // Find last standing tile for leftward topple
                  let lastStanding = -1;
                  for (let i = tiles.length - 1; i >= 0; i--) {
                    if (fallenStates[i] === null) {
                      lastStanding = i;
                      break;
                    }
                  }
                  if (lastStanding !== -1) triggerTopple(lastStanding, 'left');
                }
              }}
              className="px-4 py-2 bg-terra hover:bg-terra-light text-bone rounded-xl text-xs font-mono tracking-wider uppercase font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Play size={13} />
              <span>{noneFallen ? 'Topple Cascade' : 'Topple Remaining'}</span>
            </button>
          )}

          {/* Reset button when partially fallen */}
          {!allFallen && !noneFallen && (
            <button
              onClick={resetTiles}
              className="px-3.5 py-2 bg-timber/10 hover:bg-timber/20 text-timber rounded-xl text-xs font-mono tracking-wider uppercase font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-timber/10"
            >
              <RotateCcw size={12} /> Stand All
            </button>
          )}

          {/* Direction toggle button */}
          <button
            onClick={() => setCascadeDir((prev) => (prev === 'right' ? 'left' : 'right'))}
            className="px-3 py-2 rounded-xl border border-timber/15 hover:bg-timber/5 font-mono text-xs uppercase tracking-wider text-timber/80 hover:text-timber flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Toggle toppling direction"
          >
            {cascadeDir === 'right' ? (
              <>
                <ArrowRight size={13} className="text-terra" />
                <span>Topple: Right ➔</span>
              </>
            ) : (
              <>
                <ArrowLeft size={13} className="text-terra" />
                <span>Topple: ⬅ Left</span>
              </>
            )}
          </button>

          {/* Standing Count Badge */}
          <span className="font-mono text-xs text-timber/60 px-3 py-2 rounded-xl bg-timber/5 border border-timber/10 font-medium">
            {standingCount} / {tiles.length} Standing
          </span>
        </div>
      )}
    </div>
  );
}
