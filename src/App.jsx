import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TournamentProvider } from './context/TournamentContext';
import { useAdminStatus } from './utils/storage';
import Header from './components/Header';
import AdminModal from './components/admin/AdminModal';
import AdminToolbar from './components/admin/AdminToolbar';
import LandingPage from './pages/LandingPage';
import TeamsPage from './pages/TeamsPage';
import SignUpPage from './pages/SignUpPage';
import TournamentPage from './pages/TournamentPage';
import BracketPage from './pages/BracketPage';
import RulesPage from './pages/RulesPage';
import PlayPage from './pages/PlayPage';
import DominoTabTransition from './components/animations/DominoTabTransition';
import TileShowerEffect from './components/animations/TileShowerEffect';

const pageVariants = {
  idle: {
    scaleY: 1,
    scaleX: 1,
    y: 0,
    boxShadow: 'none',
    transition: {
      duration: 0.15,
    },
  },
  squashed: {
    scaleY: 0.045,
    scaleX: 1.04,
    y: 0,
    boxShadow: '0 -10px 30px rgba(60, 42, 33, 0.4), 0 -2px 0 0 #DDA15E',
    transition: {
      duration: 0.22,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
  snap_back: {
    scaleY: [0.045, 1.14, 0.94, 1.03, 0.99, 1],
    scaleX: [1.04, 0.93, 1.02, 0.99, 1.01, 1],
    y: 0,
    boxShadow: 'none',
    transition: {
      duration: 0.82,
      times: [0, 0.35, 0.58, 0.78, 0.9, 1],
      ease: 'easeOut',
    },
  },
};

export default function App() {
  const [showPinModal, setShowPinModal] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [pageSquishState, setPageSquishState] = useState('idle');
  const isAdmin = useAdminStatus();

  const handleAdminClick = () => {
    if (isAdmin) {
      setShowAdmin(true);
    } else {
      setShowPinModal(true);
    }
  };

  const handleUnlock = () => {
    setShowAdmin(true);
  };

  const isSquashedOrRestoring = pageSquishState !== 'idle';

  return (
    <TournamentProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#FDFDFD] overflow-x-hidden relative">
          <motion.div
            animate={pageSquishState}
            variants={pageVariants}
            style={{
              transformOrigin: 'bottom center',
              maxHeight: isSquashedOrRestoring ? '100vh' : 'none',
              overflow: isSquashedOrRestoring ? 'hidden' : 'visible',
              pointerEvents: isSquashedOrRestoring ? 'none' : 'auto',
            }}
            className="min-h-screen domino-tabletop flex flex-col will-change-transform relative"
          >
            {/* Handcrafted Domino Table Brass Corner Accents */}
            <div className="pointer-events-none absolute top-16 left-3 w-5 h-5 border-t-2 border-l-2 border-brass/45 rounded-tl-xs z-30 hidden sm:block" />
            <div className="pointer-events-none absolute top-16 right-3 w-5 h-5 border-t-2 border-r-2 border-brass/45 rounded-tr-xs z-30 hidden sm:block" />
            <div className="pointer-events-none absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-brass/45 rounded-bl-xs z-30 hidden sm:block" />
            <div className="pointer-events-none absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-brass/45 rounded-br-xs z-30 hidden sm:block" />

            <Header onAdminClick={handleAdminClick} />

            {/* Falling domino effect when switching tabs */}
            <DominoTabTransition>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/teams" element={<TeamsPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route path="/tournament" element={<TournamentPage />} />
                <Route path="/bracket" element={<BracketPage />} />
                <Route path="/rules" element={<RulesPage />} />
                <Route path="/play" element={<PlayPage />} />
              </Routes>
            </DominoTabTransition>
          </motion.div>

          {/* Anvil Domino & Accordion Easter Egg */}
          <TileShowerEffect onSquishStateChange={setPageSquishState} />

          {/* Admin PIN modal */}
          <AdminModal
            isOpen={showPinModal}
            onClose={() => setShowPinModal(false)}
            onUnlock={handleUnlock}
          />

          {/* Admin toolbar */}
          <AdminToolbar
            isOpen={showAdmin}
            onClose={() => setShowAdmin(false)}
          />
        </div>
      </BrowserRouter>
    </TournamentProvider>
  );
}
