import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

/**
 * Non-blocking page transition wrapper.
 * Instant zero-delay route rendering with a subtle 140ms micro-fade
 * to keep transitions snappy without blocking or freezing the screen.
 */
export default function DominoTabTransition({ children }) {
  const location = useLocation();

  return (
    <div className="relative min-h-[calc(100vh-56px)]">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0.94, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.14, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </div>
  );
}
