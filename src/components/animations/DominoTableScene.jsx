import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 3D Tournament Domino Table Scene
 * Revealed behind the live web page when the anvil domino squishes the UI down.
 */
export default function DominoTableScene({ active }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-0 pointer-events-none overflow-hidden flex flex-col justify-end items-center bg-[#140E0A]"
        >
          {/* 1. Atmospheric Overhead Room & Lamp Lighting */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 80% 65% at 50% 35%, rgba(255, 235, 195, 0.22) 0%, rgba(20, 14, 10, 0.75) 70%, #0D0805 100%)',
            }}
          />

          {/* 2. Bodega Social Club Wall Sign */}
          <div className="absolute top-6 sm:top-10 flex flex-col items-center opacity-35 select-none pointer-events-none">
            <span className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] text-brass font-bold">
              Bodega Social Club · Club de Dominó
            </span>
            <div className="w-28 h-[1px] bg-brass/40 mt-1" />
          </div>

          {/* 3. THE 3D PERSPECTIVE DOMINO TABLE */}
          <div
            className="relative w-[96vw] max-w-5xl h-[65vh] sm:h-[72vh] mb-[-3vh]"
            style={{
              perspective: '800px',
            }}
          >
            <div
              className="w-full h-full relative origin-bottom rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center p-3 sm:p-6"
              style={{
                transform: 'rotateX(52deg)',
                background: 'linear-gradient(180deg, #2A170F 0%, #3D2216 40%, #26150D 100%)',
                boxShadow:
                  '0 50px 120px -20px rgba(0, 0, 0, 0.95), inset 0 2px 4px rgba(255, 255, 255, 0.2), inset 0 -4px 10px rgba(0, 0, 0, 0.8)',
                border: '3px solid #1A0D07',
              }}
            >
              {/* Polished Woodgrain Texture on Rim */}
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(0,0,0,0.4) 40px, rgba(0,0,0,0.4) 41px)',
                }}
              />

              {/* Handcrafted Brass Corner Brackets on Table Rim */}
              <div className="absolute top-2 left-2 w-7 h-7 border-t-3 border-l-3 border-brass/75 rounded-tl-sm pointer-events-none" />
              <div className="absolute top-2 right-2 w-7 h-7 border-t-3 border-r-3 border-brass/75 rounded-tr-sm pointer-events-none" />
              <div className="absolute bottom-2 left-2 w-7 h-7 border-b-3 border-l-3 border-brass/75 rounded-bl-sm pointer-events-none" />
              <div className="absolute bottom-2 right-2 w-7 h-7 border-b-3 border-r-3 border-brass/75 rounded-br-sm pointer-events-none" />

              {/* Side Domino Tile Racks / Grooves */}
              <div className="absolute top-1.5 inset-x-12 h-1 bg-black/45 rounded-full shadow-inner" />
              <div className="absolute bottom-1.5 inset-x-12 h-1 bg-black/45 rounded-full shadow-inner" />
              <div className="absolute left-1.5 inset-y-12 w-1 bg-black/45 rounded-full shadow-inner" />
              <div className="absolute right-1.5 inset-y-12 w-1 bg-black/45 rounded-full shadow-inner" />

              {/* Brass Inlay Rim Line separating Wood and Felt */}
              <div className="absolute inset-3 sm:inset-5 rounded-2xl border border-brass/60 pointer-events-none shadow-xs" />

              {/* TOURNAMENT GREEN FELT PLAYING SURFACE */}
              <div
                className="w-full h-full rounded-xl sm:rounded-2xl relative overflow-hidden flex flex-col items-center justify-center shadow-inner"
                style={{
                  backgroundColor: '#1B4332',
                  backgroundImage:
                    'radial-gradient(circle at 50% 50%, #2D6A4F 0%, #1B4332 65%, #122B22 100%)',
                }}
              >
                {/* Felt Texture Weave */}
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: `radial-gradient(rgba(255,255,255,0.25) 1px, transparent 0)`,
                    backgroundSize: '4px 4px',
                  }}
                />

                {/* Perspective Guide Lines on Felt */}
                <div className="absolute inset-0 pointer-events-none opacity-20">
                  <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-white/40" />
                  <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-white/40" />
                </div>

                {/* Center Brass Spinner Medallion */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-brass/80 bg-gradient-to-br from-[#E2AA68] via-[#B88242] to-[#734E1D] flex items-center justify-center shadow-md relative z-10 opacity-80">
                  <div className="w-8 h-8 rounded-full border border-black/30 flex items-center justify-center text-[9px] font-mono font-bold text-amber-950">
                    [6|6]
                  </div>
                </div>

                {/* Sideline Domino Tiles resting on the table racks */}
                <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-75 rotate-[-8deg] pointer-events-none hidden sm:flex">
                  <div className="w-7 h-13 bg-[#FAF7F2] rounded-xs border border-timber/40 shadow-md flex flex-col items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-timber" />
                    <div className="w-4 h-[1px] bg-timber/50 my-1" />
                    <div className="w-1 h-1 rounded-full bg-timber" />
                  </div>
                  <div className="w-7 h-13 bg-[#FAF7F2] rounded-xs border border-timber/40 shadow-md flex flex-col items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-timber" />
                  </div>
                </div>

                <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-75 rotate-[8deg] pointer-events-none hidden sm:flex">
                  <div className="w-7 h-13 bg-[#FAF7F2] rounded-xs border border-timber/40 shadow-md flex flex-col items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-timber" />
                  </div>
                  <div className="w-7 h-13 bg-[#FAF7F2] rounded-xs border border-timber/40 shadow-md flex flex-col items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-timber" />
                    <div className="w-4 h-[1px] bg-timber/50 my-1" />
                    <div className="w-1.5 h-1.5 rounded-full bg-timber" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
