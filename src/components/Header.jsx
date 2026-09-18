import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Lock, Unlock, Menu, X } from 'lucide-react';
import { useAdminStatus } from '../utils/storage';

export default function Header({ onAdminClick }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isUnlocked = useAdminStatus();

  const links = [
    { to: '/', label: 'Home' },
    { to: '/tournament', label: 'Standings' },
    { to: '/bracket', label: 'Bracket' },
    { to: '/rules', label: 'Rules' },
    { to: '/signup', label: 'Sign Up' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-timber text-bone border-b-2 border-brass sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-xl font-bold font-display tracking-wider text-brass">
            ◆ DOMINOES
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-3 py-1.5 text-sm font-medium tracking-wide uppercase transition-colors rounded ${
                isActive(link.to)
                  ? 'bg-felt text-bone'
                  : 'text-bone/70 hover:text-bone hover:bg-timber-light'
              }`}
            >
              {link.label}
            </Link>
          ))}

          {/* Admin button */}
          <button
            onClick={onAdminClick}
            className={`ml-3 px-3 py-1.5 text-xs font-mono tracking-wider uppercase flex items-center gap-1.5 rounded border transition-colors ${
              isUnlocked
                ? 'border-terra bg-terra/10 text-terra hover:bg-terra/20'
                : 'border-bone/20 text-bone/40 hover:text-bone/60 hover:border-bone/40'
            }`}
          >
            {isUnlocked ? <Unlock size={12} /> : <Lock size={12} />}
            ADMIN
          </button>
        </nav>

        {/* Mobile hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={onAdminClick}
            className={`px-2 py-1 text-xs font-mono tracking-wider uppercase flex items-center gap-1 rounded border transition-colors ${
              isUnlocked
                ? 'border-terra bg-terra/10 text-terra'
                : 'border-bone/20 text-bone/40'
            }`}
          >
            {isUnlocked ? <Unlock size={11} /> : <Lock size={11} />}
            ADMIN
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-bone p-1"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-bone/10 px-4 pb-3 flex flex-col gap-1">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={`px-3 py-2 text-sm font-medium tracking-wide uppercase rounded transition-colors ${
                isActive(link.to)
                  ? 'bg-felt text-bone'
                  : 'text-bone/70 hover:text-bone hover:bg-timber-light'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
