import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Unlock, Menu, X, UserPlus, Volume2, VolumeX } from 'lucide-react';
import { useAdminStatus } from '../utils/storage';
import { playDominoClack, useDominoSound } from '../utils/dominoAudio';
import MiniDomino from './MiniDomino';

export default function Header({ onAdminClick }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isUnlocked = useAdminStatus();
  const [soundEnabled, toggleSound] = useDominoSound();

  const prevPathRef = useRef(location.pathname);
  const [tiltDir, setTiltDir] = useState(0);

  const links = [
    { to: '/', label: 'Home', tile: { top: 1, bottom: 1 } },
    { to: '/teams', label: 'Teams', tile: { top: 2, bottom: 2 } },
    { to: '/tournament', label: 'Standings', tile: { top: 3, bottom: 3 } },
    { to: '/bracket', label: 'Bracket', tile: { top: 4, bottom: 4 } },
    { to: '/rules', label: 'Rules', tile: { top: 5, bottom: 5 } },
    { to: '/play', label: 'Play', tile: { top: 6, bottom: 6 } },
  ];

  const allPaths = ['/', '/teams', '/tournament', '/bracket', '/rules', '/play', '/signup'];

  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      const prevIdx = allPaths.indexOf(prevPathRef.current);
      const curIdx = allPaths.indexOf(location.pathname);
      if (prevIdx !== -1 && curIdx !== -1) {
        setTiltDir(curIdx > prevIdx ? 1 : -1);
      } else {
        setTiltDir(0);
      }
      prevPathRef.current = location.pathname;
    }
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path;

  const handleNavClick = (idx = 0) => {
    playDominoClack(1.15 + (idx % 6) * 0.04, 0.14);
  };

  return (
    <header className="bg-timber text-bone border-b-2 border-brass sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
        {/* Logo */}
        <Link
          to="/"
          onClick={() => handleNavClick(0)}
          className="flex items-center gap-2 hover:opacity-85 transition-opacity group"
        >
          <div className="w-5 h-8 rounded-xs border border-brass bg-bone flex flex-col justify-around py-0.5 items-center shadow-xs group-hover:rotate-6 transition-transform shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-timber" />
            <div className="w-3.5 h-[1px] bg-timber" />
            <span className="w-1.5 h-1.5 rounded-full bg-timber" />
          </div>
          <span className="text-lg sm:text-xl font-bold font-display tracking-wider text-brass">
            DOMINOES
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1.5">
          {links.map((link, idx) => {
            const active = isActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => handleNavClick(idx)}
                className={`relative px-3 py-1.5 text-xs font-semibold tracking-wider uppercase transition-colors rounded-md flex items-center gap-1.5 z-10 select-none ${
                  active
                    ? 'text-bone font-bold'
                    : 'text-bone/70 hover:text-bone hover:bg-white/5'
                }`}
              >
                {/* Active Felt Pill Sliding Track */}
                {active && (
                  <motion.div
                    layoutId="active-tab-indicator"
                    className="absolute inset-0 bg-felt rounded-md border border-brass/40 shadow-xs -z-10"
                    transition={{
                      type: 'spring',
                      stiffness: 420,
                      damping: 30,
                    }}
                  />
                )}

                {/* Sliding & Toppling Miniature Domino Tile */}
                {active && (
                  <motion.div
                    layoutId="active-tab-domino"
                    initial={{ rotateZ: tiltDir * 24, scale: 0.9 }}
                    animate={{ rotateZ: 0, scale: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 520,
                      damping: 24,
                    }}
                    className="shrink-0 origin-bottom flex items-center"
                  >
                    <MiniDomino top={link.tile.top} bottom={link.tile.bottom} />
                  </motion.div>
                )}

                <span>{link.label}</span>
              </Link>
            );
          })}

          {/* Sign Up CTA Tab Button */}
          <Link
            to="/signup"
            onClick={() => handleNavClick(6)}
            className={`relative ml-1 px-3.5 py-1.5 text-xs font-bold tracking-wider uppercase transition-all rounded-md flex items-center gap-1.5 select-none ${
              isActive('/signup')
                ? 'bg-terra-light text-bone shadow-sm ring-1 ring-white/40 font-extrabold'
                : 'bg-terra text-bone hover:bg-terra-light shadow-xs active:scale-95'
            }`}
          >
            {isActive('/signup') ? (
              <MiniDomino top={6} bottom={5} className="mr-0.5" />
            ) : (
              <UserPlus size={13} />
            )}
            <span>Sign Up</span>
          </Link>

          {/* Global Sound Toggle Button */}
          <button
            onClick={() => {
              const next = toggleSound();
              if (next) playDominoClack(1.3, 0.18);
            }}
            className={`ml-1.5 px-2.5 py-1.5 text-xs font-mono tracking-wider uppercase flex items-center gap-1.5 rounded border transition-colors cursor-pointer ${
              soundEnabled
                ? 'border-brass/40 bg-brass/10 text-brass hover:bg-brass/20'
                : 'border-bone/20 text-bone/40 hover:text-bone/60 hover:border-bone/40'
            }`}
            title={soundEnabled ? 'Domino sound enabled (click to mute site)' : 'Domino sound muted (click to enable)'}
            aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
          >
            {soundEnabled ? <Volume2 size={13} className="text-brass" /> : <VolumeX size={13} />}
            <span className="hidden xl:inline">{soundEnabled ? 'Sound' : 'Muted'}</span>
          </button>

          {/* Admin button */}
          <button
            onClick={() => {
              playDominoClack(1.0, 0.12);
              onAdminClick();
            }}
            className={`ml-1 px-3 py-1.5 text-xs font-mono tracking-wider uppercase flex items-center gap-1.5 rounded border transition-colors cursor-pointer ${
              isUnlocked
                ? 'border-terra bg-terra/10 text-terra hover:bg-terra/20'
                : 'border-bone/20 text-bone/40 hover:text-bone/60 hover:border-bone/40'
            }`}
          >
            {isUnlocked ? <Unlock size={12} /> : <Lock size={12} />}
            ADMIN
          </button>
        </nav>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          {/* Mobile global sound toggle */}
          <button
            onClick={() => {
              const next = toggleSound();
              if (next) playDominoClack(1.3, 0.18);
            }}
            className="p-1.5 rounded text-bone/70 hover:text-bone hover:bg-timber-light cursor-pointer transition-colors"
            title={soundEnabled ? 'Mute sound' : 'Unmute sound'}
            aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
          >
            {soundEnabled ? <Volume2 size={16} className="text-brass" /> : <VolumeX size={16} className="text-bone/40" />}
          </button>

          <Link
            to="/signup"
            onClick={() => handleNavClick(6)}
            className="px-2.5 py-1 text-xs font-bold tracking-wider uppercase rounded bg-terra text-bone flex items-center gap-1 shadow-xs"
          >
            <UserPlus size={12} />
            <span>Sign Up</span>
          </Link>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-bone p-1.5 rounded hover:bg-timber-light cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-bone/10 px-4 py-3 flex flex-col gap-1.5 bg-timber">
          {links.map((link, idx) => {
            const active = isActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => {
                  handleNavClick(idx);
                  setMobileOpen(false);
                }}
                className={`px-3 py-2 text-sm font-medium tracking-wide uppercase rounded transition-colors flex items-center justify-between ${
                  active
                    ? 'bg-felt text-bone font-bold border border-brass/30'
                    : 'text-bone/70 hover:text-bone hover:bg-timber-light'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {active ? (
                    <MiniDomino top={link.tile.top} bottom={link.tile.bottom} />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-bone/30" />
                  )}
                  <span>{link.label}</span>
                </div>
                {active && <span className="text-brass text-xs">◆ Active</span>}
              </Link>
            );
          })}
          <Link
            to="/signup"
            onClick={() => {
              handleNavClick(6);
              setMobileOpen(false);
            }}
            className={`mt-1 px-3 py-2 text-sm font-bold tracking-wide uppercase rounded flex items-center justify-center gap-2 ${
              isActive('/signup')
                ? 'bg-terra-light text-bone ring-1 ring-white/40'
                : 'bg-terra text-bone'
            }`}
          >
            <UserPlus size={15} />
            <span>Sign Up Now</span>
          </Link>

          {/* Mobile drawer sound toggle */}
          <button
            onClick={() => {
              const next = toggleSound();
              if (next) playDominoClack(1.3, 0.18);
            }}
            className={`mt-2 px-3 py-2 text-xs font-mono tracking-wider uppercase flex items-center justify-center gap-2 rounded border transition-colors cursor-pointer ${
              soundEnabled
                ? 'border-brass/40 bg-brass/10 text-brass'
                : 'border-bone/20 text-bone/60 hover:text-bone'
            }`}
          >
            {soundEnabled ? <Volume2 size={13} className="text-brass" /> : <VolumeX size={13} />}
            <span>{soundEnabled ? 'Site Sound: On' : 'Site Sound: Muted'}</span>
          </button>

          <button
            onClick={() => {
              setMobileOpen(false);
              onAdminClick();
            }}
            className={`mt-1.5 px-3 py-2 text-xs font-mono tracking-wider uppercase flex items-center justify-center gap-1.5 rounded border transition-colors cursor-pointer ${
              isUnlocked
                ? 'border-terra bg-terra/10 text-terra'
                : 'border-bone/20 text-bone/60 hover:text-bone'
            }`}
          >
            {isUnlocked ? <Unlock size={12} /> : <Lock size={12} />}
            <span>Admin Settings</span>
          </button>
        </nav>
      )}
    </header>
  );
}
