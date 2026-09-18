import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DominoTile from '../DominoTile';
import { playDominoClack } from '../../utils/dominoAudio';

const CASCADE_TILES = [
  { top: 6, bottom: 6 },
  { top: 6, bottom: 5 },
  { top: 5, bottom: 5 },
  { top: 5, bottom: 4 },
  { top: 4, bottom: 4 },
  { top: 3, bottom: 3 },
  { top: 2, bottom: 2 },
  { top: 1, bottom: 1 },
];

export default function DominoTabTransition({ children }) {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [fallingStep, setFallingStep] = useState(0);
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    // Only trigger when switching tabs/routes
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      setIsTransitioning(true);
      setFallingStep(0);

      // Trigger sequential topples with audio
      const numTiles = CASCADE_TILES.length;
      const stepDuration = 45; // fast, crisp 45ms per domino

      for (let i = 0; i < numTiles; i++) {
        setTimeout(() => {
          setFallingStep(i + 1);
          playDominoClack(1.0 + i * 0.06, 0.16);
        }, i * stepDuration);
      }

      // Hide transition ribbon after cascade finishes
      const totalTime = numTiles * stepDuration + 400;
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setFallingStep(0);
      }, totalTime);

      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  return (
    <div className="relative min-h-[calc(100vh-56px)]">
      {/* Falling Domino Cascade Banner when switching tabs */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            key={`domino-fall-${location.pathname}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="sticky top-14 z-40 w-full overflow-hidden bg-timber/95 border-b border-brass/40 shadow-lg py-2.5 backdrop-blur-sm"
          >
            <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
              {/* Left label */}
              <div className="hidden sm:flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-terra animate-pulse" />
                <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-bone/70 font-semibold">
                  Domino Effect
                </span>
              </div>

              {/* Falling Domino Chain */}
              <div
                className="flex items-end justify-center -space-x-1 sm:space-x-1 mx-auto"
                style={{ perspective: 600 }}
              >
                {CASCADE_TILES.map((tile, i) => {
                  const hasFallen = fallingStep > i;
                  return (
                    <motion.div
                      key={i}
                      className="origin-bottom-right"
                      initial={{ rotateZ: 0, x: 0 }}
                      animate={{
                        rotateZ: hasFallen ? 65 : 0,
                        x: hasFallen ? 6 : 0,
                        y: hasFallen ? 2 : 0,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 550,
                        damping: 20,
                        mass: 0.5,
                      }}
                    >
                      <DominoTile
                        top={tile.top}
                        bottom={tile.bottom}
                        size="xs"
                        className="drop-shadow-md"
                      />
                    </motion.div>
                  );
                })}
              </div>

              {/* Right target tab indicator */}
              <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-brass tracking-wider uppercase">
                <span>Switching Tab</span>
                <span className="text-terra">◆</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Page Content with smooth page entry */}
      <motion.div
        key={location.pathname}
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}
