import React, { useState } from 'react';
import { motion } from 'framer-motion';
import DominoTile from '../DominoTile';
import { playDominoClack } from '../../utils/dominoAudio';

export default function DominoFlipCard({
  top = 6,
  bottom = 6,
  size = 'md',
  initialFlipped = false,
  interactive = true,
  className = '',
}) {
  const [isFlipped, setIsFlipped] = useState(initialFlipped);

  const handleToggle = () => {
    if (!interactive) return;
    setIsFlipped(!isFlipped);
    playDominoClack(isFlipped ? 1.1 : 0.9, 0.2);
  };

  return (
    <div
      className={`inline-block select-none cursor-pointer ${className}`}
      style={{ perspective: 800 }}
      onClick={handleToggle}
      title={interactive ? 'Click to flip domino' : undefined}
    >
      <motion.div
        className="relative"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{
          duration: 0.45,
          ease: [0.23, 1, 0.32, 1], // Emil Kowalski cubic bezier for crisp physical response
        }}
        whileHover={interactive ? { scale: 1.06, y: -2 } : {}}
        whileTap={interactive ? { scale: 0.98 } : {}}
      >
        {/* Front Face (White Ivory with Pips) */}
        <div style={{ backfaceVisibility: 'hidden' }}>
          <DominoTile top={top} bottom={bottom} size={size} />
        </div>

        {/* Back Face (Ebony / Wood with Brass Diamond) */}
        <div
          className="absolute inset-0"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <DominoTile faceDown={true} size={size} />
        </div>
      </motion.div>
    </div>
  );
}
