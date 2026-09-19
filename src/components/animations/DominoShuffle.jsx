import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import DominoTile from '../DominoTile';
import { playDominoShuffle, playDominoClack } from '../../utils/dominoAudio';

export default function DominoShuffle({ size = 'sm', isInteractive = true, label = 'La Sopa' }) {
  const [shuffleKey, setShuffleKey] = useState(0);

  const tileData = [
    { id: 1, baseAngle: 0, radius: 45, startRot: 15 },
    { id: 2, baseAngle: 72, radius: 52, startRot: -45 },
    { id: 3, baseAngle: 144, radius: 40, startRot: 90 },
    { id: 4, baseAngle: 216, radius: 50, startRot: 30 },
    { id: 5, baseAngle: 288, radius: 46, startRot: -75 },
  ];

  const handleShuffle = () => {
    setShuffleKey((prev) => prev + 1);
    playDominoShuffle(0.25);
    setTimeout(() => playDominoClack(1.1, 0.15), 180);
    setTimeout(() => playDominoClack(0.95, 0.18), 360);
  };

  return (
    <div className="flex flex-col items-center select-none">
      <div
        className="relative w-56 h-56 rounded-full flex items-center justify-center bg-felt/5 border border-felt/20 overflow-hidden cursor-pointer group"
        onClick={isInteractive ? handleShuffle : undefined}
        title={isInteractive ? 'Click to shuffle the boneyard!' : undefined}
      >
        {/* Felt table texture rings */}
        <div className="absolute inset-2 rounded-full border border-felt/10 pointer-events-none" />
        <div className="absolute inset-8 rounded-full border border-dashed border-felt/15 pointer-events-none" />

        {/* Center emblem */}
        <div className="absolute text-[10px] font-mono tracking-widest uppercase text-felt/30 font-bold pointer-events-none">
          Boneyard
        </div>

        {/* Shuffling Tiles */}
        {tileData.map((tile, i) => {
          // Generate randomized swirling waypoints for this shuffle cycle
          const seed = (shuffleKey + 1) * (i + 1);
          const rad1 = ((tile.baseAngle + 60 * ((shuffleKey % 2) ? 1 : -1)) * Math.PI) / 180;
          const rad2 = ((tile.baseAngle + 180) * Math.PI) / 180;
          const endRad = ((tile.baseAngle + (shuffleKey * 90) % 360) * Math.PI) / 180;

          const x1 = Math.cos(rad1) * (tile.radius + ((seed * 7) % 15));
          const y1 = Math.sin(rad1) * (tile.radius + ((seed * 7) % 15));
          const x2 = Math.cos(rad2) * (tile.radius - ((seed * 5) % 10));
          const y2 = Math.sin(rad2) * (tile.radius - ((seed * 5) % 10));
          const endX = Math.cos(endRad) * tile.radius;
          const endY = Math.sin(endRad) * tile.radius;

          return (
            <motion.div
              key={`${tile.id}-${shuffleKey}`}
              className="absolute"
              initial={{
                x: x1,
                y: y1,
                rotate: tile.startRot,
              }}
              animate={{
                x: [x1, x2, endX],
                y: [y1, y2, endY],
                rotate: [tile.startRot, tile.startRot + 180, tile.startRot + 360 * ((i % 2 === 0) ? 1 : -1)],
              }}
              transition={{
                duration: 0.9,
                ease: [0.25, 1, 0.5, 1],
                delay: i * 0.04,
              }}
              whileHover={{ scale: 1.1, zIndex: 30 }}
            >
              <DominoTile faceDown={true} size={size} />
            </motion.div>
          );
        })}
      </div>

      {isInteractive && (
        <button
          onClick={handleShuffle}
          className="mt-3 px-4 py-1.5 bg-felt text-bone hover:bg-felt-light rounded-full text-xs font-mono tracking-wider uppercase font-semibold flex items-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer"
        >
          <RefreshCw size={12} className="group-hover:rotate-180 transition-transform" />
          <span>{label}</span>
        </button>
      )}
    </div>
  );
}
