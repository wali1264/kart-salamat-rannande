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
  const { user, profile, loading, signOut } = useAuth();
  const [safetyTimeout, setSafetyTimeout] = React.useState(false);

  // Basic routing for Verify page
  const path = window.location.pathname;
  if (path.startsWith('/verify/')) {
    const cardId = path.split('/verify/')[1];
    return <Verify cardId={cardId} />;
  }

  // Safety mechanism: If stuck in loading for more than 10 seconds, something is wrong with the session/cache
  React.useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setSafetyTimeout(true);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const handleForceReset = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  if (loading && !safetyTimeout) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-blue-200/60 font-medium animate-pulse" dir="rtl">در حال بارگذاری ایمن...</p>
      </div>
    );
  }

  if (safetyTimeout && loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-6 p-4 text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 animate-bounce">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">مشکل در بازیابی نشست</h2>
          <p className="text-slate-400 text-sm max-w-xs">برنامه در حال تلاش برای پاکسازی حافظه موقت و ورود مجدد است.</p>
        </div>
        <button 
          onClick={handleForceReset}
          className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20"
        >
          پاکسازی حافظه و تلاش مجدد
        </button>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  // If we have a user but no profile yet, and we're not loading, 
  // it might mean the profile doesn't exist yet or is slow.
  if (!profile && !loading) {
    return <WaitingRoom />;
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

