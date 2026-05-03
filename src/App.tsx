/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SystemProvider, useSystem } from './contexts/SystemContext';
import { SyncProvider } from './contexts/SyncContext';
import { Auth } from './components/Auth';
import { WaitingRoom } from './components/WaitingRoom';
import { Landing } from './components/Landing';
import { Verify } from './components/Verify';
import { OfflineNotice } from './components/OfflineNotice';
import { PWAReloadPrompt } from './components/PWAReloadPrompt';

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

  // 3. Waiting/Approval Logic (Only for people who attempted to log in)
  if (user && (!profile || !profile.is_approved)) {
    return <WaitingRoom />;
  }

  // 4. Always show Landing (Landing will handle public vs private view internally)
  return (
    <>
      <OfflineNotice />
      <Landing />
      <PWAReloadPrompt />
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SyncProvider>
        <SystemProvider>
          <AppContent />
        </SystemProvider>
      </SyncProvider>
    </AuthProvider>
  );
}

