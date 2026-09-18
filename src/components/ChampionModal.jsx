import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy } from 'lucide-react';

export default function ChampionModal({ champion, onClose }) {
  useEffect(() => {
    if (!champion) return;

    // Fire confetti
    const duration = 3000;
    const end = Date.now() + duration;
    const colors = ['#D95D39', '#DDA15E', '#1B4332', '#F7F4EE'];

    function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    }
    frame();
  }, [champion]);

  return (
    <AnimatePresence>
      {champion && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-timber/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -5 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 150 }}
            className="bg-bone border-4 border-brass rounded-xl p-8 md:p-12 max-w-lg w-full text-center shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Trophy */}
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              transition={{ type: 'spring', damping: 8, stiffness: 100, delay: 0.2 }}
              className="mb-6"
            >
              <div className="inline-flex items-center justify-center w-24 h-24 bg-brass/20 rounded-full">
                <Trophy size={48} className="text-brass" strokeWidth={1.5} />
              </div>
            </motion.div>

            {/* Label */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="font-mono text-xs tracking-[0.3em] uppercase text-timber/40 mb-3"
            >
              Birthday Tournament Champion
            </motion.p>

            {/* Team name */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, type: 'spring', damping: 12 }}
              className="font-display text-4xl md:text-5xl font-bold uppercase tracking-wider text-timber mb-2"
            >
              {champion.name}
            </motion.h1>

            {/* Players */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="font-mono text-sm text-timber/60 mb-8"
            >
              {champion.player1} & {champion.player2}
            </motion.p>

            {/* Decorative line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="h-px bg-brass w-32 mx-auto mb-6"
            />

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="font-display text-sm text-terra tracking-widest uppercase"
            >
              ◆ ◆ ◆
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
