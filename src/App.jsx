import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

export default function App() {
  const [showPinModal, setShowPinModal] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
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

  return (
    <TournamentProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-bone overflow-x-hidden">
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
