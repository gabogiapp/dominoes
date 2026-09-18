import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Volume2, VolumeX } from 'lucide-react';
import DominoTile from '../DominoTile';
import { playDominoSlam, toggleDominoSound, isDominoSoundEnabled } from '../../utils/dominoAudio';

export default function DominoSlam({
  tile = { top: 6, bottom: 6 },
  size = 'lg',
  label = 'El Chuchazo',
  onSlam,
}) {
  const [slamCount, setSlamCount] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [soundOn, setSoundOn] = useState(isDominoSoundEnabled());

  const triggerSlam = () => {
    setSlamCount((prev) => prev + 1);
    setIsShaking(true);
    playDominoSlam(0.5);
    setTimeout(() => setIsShaking(false), 300);
    if (onSlam) onSlam();
  };

  const handleSoundToggle = (e) => {
    e.stopPropagation();
    const next = toggleDominoSound();
    setSoundOn(next);
  };

  return (
    <div className="flex flex-col items-center select-none">
      {/* Table surface container with screen-shake */}
      <motion.div
        animate={isShaking ? { x: [-3, 3, -2, 2, 0], y: [-2, 2, -1, 1, 0] } : {}}
        transition={{ duration: 0.25 }}
        className="relative flex items-center justify-center p-8 min-h-[180px] w-full max-w-sm rounded-2xl bg-timber/[0.03] border border-timber/10 overflow-hidden"
      >
        {/* Felt table ring texture */}
        <div className="absolute inset-0 bg-[radial-gradient(#1B4332_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

        {/* Shockwave Rings */}
        <AnimatePresence>
          {slamCount > 0 && (
            <motion.div
              key={`ring-1-${slamCount}`}
              initial={{ scale: 0.6, opacity: 0.9 }}
              animate={{ scale: 2.8, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute w-28 h-28 rounded-full border-2 border-terra pointer-events-none"
            />
          )}
          {slamCount > 0 && (
            <motion.div
              key={`ring-2-${slamCount}`}
              initial={{ scale: 0.4, opacity: 0.7 }}
              animate={{ scale: 2.1, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.05, ease: 'easeOut' }}
              className="absolute w-28 h-28 rounded-full border border-brass pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Slamming Domino Tile */}
        <motion.div
          key={slamCount}
          initial={
            slamCount === 0
              ? false
              : {
                  scale: 2.2,
                  y: -100,
                  rotateZ: -20,
                  opacity: 0.2,
                }
          }
          animate={{
            scale: 1,
            y: 0,
            rotateZ: 0,
            opacity: 1,
          }}
          transition={{
            type: 'spring',
            stiffness: 700,
            damping: 24,
            mass: 0.8,
          }}
          className="relative z-10 cursor-pointer drop-shadow-xl"
          onClick={triggerSlam}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Click tile to slam!"
        >
          <DominoTile top={tile.top} bottom={tile.bottom} size={size} />
        </motion.div>
      </motion.div>

      {/* Slam action controls */}
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={triggerSlam}
          className="px-5 py-2 bg-timber text-bone hover:bg-timber-light rounded-full text-xs font-mono tracking-wider uppercase font-bold flex items-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer"
        >
          <Zap size={14} className="text-brass fill-brass" />
          <span>{label}</span>
        </button>

        <button
          onClick={handleSoundToggle}
          className="p-1.5 rounded-full text-timber/40 hover:text-timber/70 hover:bg-timber/5 transition-colors cursor-pointer"
          title={soundOn ? 'Sound enabled' : 'Sound muted'}
        >
          {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
        </button>
      </div>
    </div>
  );
}
