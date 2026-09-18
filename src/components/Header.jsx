import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Lock, Unlock, Menu, X, UserPlus } from 'lucide-react';
import { useAdminStatus } from '../utils/storage';
import { playDominoClack } from '../utils/dominoAudio';

export default function Header({ onAdminClick }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isUnlocked = useAdminStatus();

  const links = [
    { to: '/', label: 'Home' },
    { to: '/teams', label: 'Teams' },
    { to: '/tournament', label: 'Standings' },
    { to: '/bracket', label: 'Bracket' },
    { to: '/rules', label: 'Rules' },
    { to: '/play', label: 'Play' },
  ];

  const isActive = (path) => location.pathname === path;

  const handleNavClick = () => {
    playDominoClack(1.15, 0.12);
  };

  return (
    <header className="bg-timber text-bone border-b-2 border-brass sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link
          to="/"
          onClick={handleNavClick}
          className="flex items-center gap-2 hover:opacity-85 transition-opacity group"
        >
          <div className="w-5 h-8 rounded-xs border border-brass bg-bone flex flex-col justify-around py-0.5 items-center shadow-xs group-hover:rotate-6 transition-transform">
            <span className="w-1.5 h-1.5 rounded-full bg-timber" />
            <div className="w-3.5 h-[1px] bg-timber" />
            <span className="w-1.5 h-1.5 rounded-full bg-timber" />
          </div>
          <span className="text-xl font-bold font-display tracking-wider text-brass">
            DOMINOES
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1.5">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={handleNavClick}
              className={`px-3 py-1.5 text-xs font-semibold tracking-wider uppercase transition-all rounded-md flex items-center gap-1.5 ${
                isActive(link.to)
                  ? 'bg-felt text-bone shadow-xs ring-1 ring-brass/30'
                  : 'text-bone/75 hover:text-bone hover:bg-timber-light'
              }`}
            >
              {isActive(link.to) && <span className="text-brass text-[10px]">◆</span>}
              <span>{link.label}</span>
            </Link>
          ))}

          {/* Sign Up CTA Tab Button */}
          <Link
            to="/signup"
            onClick={handleNavClick}
            className={`ml-1 px-3.5 py-1.5 text-xs font-bold tracking-wider uppercase transition-all rounded-md flex items-center gap-1.5 ${
              isActive('/signup')
                ? 'bg-terra-light text-bone shadow-sm ring-1 ring-white/30'
                : 'bg-terra text-bone hover:bg-terra-light shadow-xs active:scale-95'
            }`}
          >
            <UserPlus size={13} />
            <span>Sign Up</span>
          </Link>

          {/* Admin button */}
          <button
            onClick={onAdminClick}
            className={`ml-3 px-3 py-1.5 text-xs font-mono tracking-wider uppercase flex items-center gap-1.5 rounded border transition-colors cursor-pointer ${
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
          <Link
            to="/signup"
            onClick={handleNavClick}
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
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => {
                handleNavClick();
                setMobileOpen(false);
              }}
              className={`px-3 py-2 text-sm font-medium tracking-wide uppercase rounded transition-colors flex items-center justify-between ${
                isActive(link.to)
                  ? 'bg-felt text-bone'
                  : 'text-bone/70 hover:text-bone hover:bg-timber-light'
              }`}
            >
              <span>{link.label}</span>
              {isActive(link.to) && <span className="text-brass">◆</span>}
            </Link>
          ))}
          <Link
            to="/signup"
            onClick={() => {
              handleNavClick();
              setMobileOpen(false);
            }}
            className="mt-1 px-3 py-2 text-sm font-bold tracking-wide uppercase rounded bg-terra text-bone flex items-center justify-center gap-2"
          >
            <UserPlus size={15} />
            <span>Sign Up Now</span>
          </Link>

          <button
            onClick={() => {
              setMobileOpen(false);
              onAdminClick();
            }}
            className={`mt-2 px-3 py-2 text-xs font-mono tracking-wider uppercase flex items-center justify-center gap-1.5 rounded border transition-colors cursor-pointer ${
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
