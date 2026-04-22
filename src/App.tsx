/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { WaitingRoom } from './components/WaitingRoom';
import { Landing } from './components/Landing';
import { Verify } from './components/Verify';

const AppContent: React.FC = () => {
  const { user, profile, loading } = useAuth();

  // 1. Instant verify route
  const path = window.location.pathname;
  if (path.startsWith('/verify/')) {
    const cardId = path.split('/verify/')[1];
    return <Verify cardId={cardId} />;
  }

  // 2. Clear loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-emerald-500/60 font-medium" dir="rtl">در حال ورود به سامانه...</p>
      </div>
    );
  }

  // 3. Auth Gate
  if (!user) {
    return <Auth />;
  }

  // 4. Waiting/Approval Logic
  if (!profile || !profile.is_approved) {
    return <WaitingRoom />;
  }

  // 5. Success
  return <Landing />;
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

