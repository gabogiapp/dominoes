import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DominoTile from '../DominoTile';
import { playCapicuaSound } from '../../utils/dominoAudio';

export const TRIGGER_TILE_SHOWER_EVENT = 'dominoes_trigger_tile_shower';

export function triggerTileShower() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TRIGGER_TILE_SHOWER_EVENT));
  }
}

export default function TileShowerEffect() {
  const [active, setActive] = useState(false);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const handleTrigger = () => {
      // Generate 20 falling dominoes with randomized trajectories
      const items = Array.from({ length: 20 }, (_, i) => ({
        id: `${Date.now()}-${i}`,
        left: Math.random() * 92 + 4, // 4% to 96%
        delay: Math.random() * 0.6,
        duration: 2.2 + Math.random() * 1.2,
        rotationStart: Math.random() * 360,
        rotationEnd: (Math.random() - 0.5) * 720,
        topPip: Math.floor(Math.random() * 7),
        bottomPip: Math.floor(Math.random() * 7),
        size: Math.random() > 0.5 ? 'xs' : 'sm',
      }));

      setParticles(items);
      setActive(true);
      playCapicuaSound(0.35);

      // Auto dismiss after cascade completes
      setTimeout(() => {
        setActive(false);
      }, 3500);
    };

    window.addEventListener(TRIGGER_TILE_SHOWER_EVENT, handleTrigger);
    return () => window.removeEventListener(TRIGGER_TILE_SHOWER_EVENT, handleTrigger);
  }, []);

  if (!active || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Toast banner */}
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.9 }}
        animate={{ opacity: 1, y: 20, scale: 1 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="absolute top-4 left-1/2 -translate-x-1/2 bg-timber text-bone px-4 py-2 rounded-full font-display text-sm uppercase tracking-widest font-bold shadow-lg border-2 border-brass/50 flex items-center gap-2"
      >
        <span>🁢</span>
        <span>¡Capicúa Easter Egg!</span>
        <span>🁢</span>
      </motion.div>

      {/* Falling tiles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{
            top: '-10%',
            left: `${p.left}%`,
            rotate: p.rotationStart,
            opacity: 1,
          }}
          animate={{
            top: '110%',
            rotate: p.rotationStart + p.rotationEnd,
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeIn',
          }}
          className="absolute"
        >
          <DominoTile
            top={p.topPip}
            bottom={p.bottomPip}
            size={p.size}
            className="shadow-md"
          />
        </motion.div>
      ))}
    </div>
  );
}
