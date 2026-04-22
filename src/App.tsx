/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { WaitingRoom } from './components/WaitingRoom';
import { Landing } from './components/Landing'; // We'll create this next

const AppContent: React.FC = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-blue-200/60 font-medium animate-pulse" dir="rtl">در حال بارگذاری...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (profile && !profile.is_approved) {
    return <WaitingRoom />;
  }

  // Once approved, show the main dashboard/landing
  return <Landing />;
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

