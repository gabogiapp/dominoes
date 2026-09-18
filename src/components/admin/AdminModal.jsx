import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, X } from 'lucide-react';
import { unlockAdmin } from '../../utils/storage';

export default function AdminModal({ isOpen, onClose, onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleDigit = (d) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      if (unlockAdmin(next)) {
        onUnlock();
        onClose();
        setPin('');
      } else {
        setError(true);
        setTimeout(() => { setPin(''); setError(false); }, 600);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-timber/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-bone border-2 border-timber rounded-xl p-6 w-full max-w-xs"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-timber/40" />
                <span className="font-mono text-xs tracking-widest uppercase text-timber/60">
                  Admin PIN
                </span>
              </div>
              <button onClick={onClose} className="text-timber/30 hover:text-timber">
                <X size={16} />
              </button>
            </div>

            {/* PIN dots */}
            <div className="flex justify-center gap-3 mb-6">
              {[0, 1, 2, 3].map(i => (
                <motion.div
                  key={i}
                  animate={error ? { x: [0, -4, 4, -4, 4, 0] } : {}}
                  transition={{ duration: 0.3 }}
                  className={`w-4 h-4 rounded-full border-2 transition-colors ${
                    i < pin.length
                      ? error ? 'bg-terra border-terra' : 'bg-timber border-timber'
                      : 'border-timber/20'
                  }`}
                />
              ))}
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((key, idx) => {
                if (key === null) return <div key={idx} />;
                if (key === 'del') {
                  return (
                    <button
                      key={idx}
                      onClick={handleBackspace}
                      className="py-3 font-mono text-sm text-timber/40 hover:text-timber rounded hover:bg-timber/5 active:bg-timber/10 transition-colors"
                    >
                      ←
                    </button>
                  );
                }
                return (
                  <button
                    key={idx}
                    onClick={() => handleDigit(String(key))}
                    className="py-3 font-mono text-lg font-bold text-timber hover:bg-timber/5 active:bg-timber/10 rounded transition-colors"
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
