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
  const timeoutsRef = useRef([]);

  const clearTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  useEffect(() => {
    // Only trigger when switching tabs/routes
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      setIsTransitioning(true);
      setFallingStep(0);
      clearTimeouts();

      // Trigger sequential topples with audio
      const numTiles = CASCADE_TILES.length;
      const stepDuration = 38; // 38ms per tile = ~300ms cascade

      for (let i = 0; i < numTiles; i++) {
        const tid = setTimeout(() => {
          setFallingStep(i + 1);
          playDominoClack(1.0 + i * 0.05, 0.18);
        }, i * stepDuration);
        timeoutsRef.current.push(tid);
      }

      // Hide transition overlay smoothly after cascade settles
      const totalTime = numTiles * stepDuration + 320;
      const hideTid = setTimeout(() => {
        setIsTransitioning(false);
        setFallingStep(0);
      }, totalTime);
      timeoutsRef.current.push(hideTid);

      return clearTimeouts;
    }
  }, [location.pathname]);

  return (
    <div className="relative min-h-[calc(100vh-56px)]">
      {/* Centered Falling Domino Effect when switching tabs */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            key={`domino-center-${location.pathname}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-timber/25 backdrop-blur-[2px] pointer-events-none"
          >
            {/* Centered Floating Table Plate */}
            <motion.div
              initial={{ scale: 0.9, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
              className="bg-timber/95 border-2 border-brass/50 rounded-2xl px-6 py-5 shadow-2xl flex flex-col items-center justify-center max-w-sm sm:max-w-md mx-4"
            >
              {/* Domino felt track */}
              <div
                className="relative flex items-end justify-center py-2 px-3 select-none"
                style={{ perspective: 600 }}
              >
                {/* Felt surface runner */}
                <div className="absolute bottom-2 left-0 right-0 h-1 bg-felt/60 rounded-full" />

                <div className="flex items-end -space-x-1 sm:space-x-1 relative z-10">
                  {CASCADE_TILES.map((tile, i) => {
                    const hasFallen = fallingStep > i;
                    return (
                      <motion.div
                        key={i}
                        className="origin-bottom-right"
                        initial={{ rotateZ: 0, x: 0, y: 0 }}
                        animate={{
                          rotateZ: hasFallen ? 68 : 0,
                          x: hasFallen ? 6 : 0,
                          y: hasFallen ? 2 : 0,
                        }}
                        transition={{
                          type: 'spring',
                          stiffness: 600,
                          damping: 22,
                          mass: 0.5,
                        }}
                      >
                        <DominoTile
                          top={tile.top}
                          bottom={tile.bottom}
                          size="sm"
                          className="drop-shadow-lg"
                        />
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
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
