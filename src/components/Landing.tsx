import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  PlusCircle, 
  Search, 
  QrCode, 
  LogOut, 
  Menu, 
  X, 
  Settings,
  Bell,
  ListChecks,
  User as UserIcon,
  ShieldCheck,
  CreditCard as FinanceIcon,
  WifiOff
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSystem } from '../contexts/SystemContext';
import { DashboardHome } from './sections/DashboardHome';
import { DriverRegistration } from './sections/DriverRegistration';
import { DriverList } from './sections/DriverList';
import { QrScanner } from './sections/QrScanner';
import { AttendanceManagement } from './sections/Attendance/AttendanceManagement';
import { SettingsSection } from './sections/SettingsSection';
import { FinancialManagement } from './sections/FinancialManagement';
import { GradesManagement } from './sections/GradesManagement';
import { Auth } from './Auth';

import { useOnlineStatus } from '../hooks/useOnlineStatus';

import { InlineSyncStatus } from './InlineSyncStatus';

type Section = 'home' | 'registration' | 'drivers' | 'finance' | 'attendance' | 'grades' | 'scanner' | 'settings' | 'auth';

const SectionWrapper: React.FC<{ 
  activeSection: Section; 
  user: any; 
  profile: any; 
  signOut: () => void; 
  setActiveSection: (s: Section) => void;
  searchQuery?: string;
}> = ({ activeSection, user, profile, signOut, setActiveSection, searchQuery }) => {
  switch (activeSection) {
    case 'home': return <DashboardHome />;
    case 'registration': return <DriverRegistration onComplete={() => setActiveSection('drivers')} />;
    case 'drivers': return <DriverList />;
    case 'finance': return <FinancialManagement />;
    case 'attendance': return <AttendanceManagement />;
    case 'grades': return <GradesManagement />;
    case 'scanner': return <QrScanner searchQuery={searchQuery} />;
    case 'settings': return <SettingsSection />;
    case 'auth': return <Auth />;
    default: return <DashboardHome />;
  }
};

export const Landing: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const { mode, setMode, isTeacherMode } = useSystem();
  const isOnline = useOnlineStatus();
  
  // Check if system is locked for attendance
  const [isLocked, setIsLocked] = useState(() => localStorage.getItem('attendance_locked') === 'true');
  
  const [activeSection, setActiveSection] = useState<Section>(() => {
    if (localStorage.getItem('attendance_locked') === 'true') return 'attendance';
    return user ? 'home' : 'scanner';
  });
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isBottomMenuOpen, setIsBottomMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Listener for lock state changes from within AttendanceManagement
  useEffect(() => {
    const handleStorageChange = () => {
      const locked = localStorage.getItem('attendance_locked') === 'true';
      setIsLocked(locked);
      if (locked) setActiveSection('attendance');
    };
    window.addEventListener('storage', handleStorageChange);
    // Custom event check for same-window changes
    const interval = setInterval(handleStorageChange, 1000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveSection('scanner');
    }
  };

  const navItems = [
    { id: 'home', label: 'روزنامچه', icon: LayoutDashboard, protected: true },
    { id: 'drivers', label: isTeacherMode ? 'لیست معلمین' : 'لیست شاگردان', icon: Users, protected: true },
    { id: 'registration', label: isTeacherMode ? 'ثبت معلم جدید' : 'ثبت شاگرد جدید', icon: PlusCircle, protected: true },
    { id: 'attendance', label: 'مدیریت حضور و غیاب', icon: ListChecks, protected: true },
    { id: 'grades', label: 'مدیریت نمرات و توصیه‌ها', icon: Bell, protected: true },
    { id: 'finance', label: isTeacherMode ? 'حقوق و دستمزد' : 'مدیریت مالی', icon: FinanceIcon, protected: true },
    { id: 'scanner', label: 'اسکنر QR', icon: QrCode, protected: false },
    { id: 'settings', label: 'تنظیمات', icon: Settings, protected: true },
  ];

  const visibleNavItems = navItems.filter(item => !item.protected || user);

  // Helper to resolve currently displayed section label for header
  const getSectionLabel = () => {
    switch (activeSection) {
      case 'home': return 'روزنامچه و خلاصه';
      case 'drivers': return isTeacherMode ? 'لیست معلمین' : 'لیست شاگردان';
      case 'registration': return isTeacherMode ? 'ثبت معلم' : 'ثبت شاگرد';
      case 'attendance': return 'حضور و غیاب';
      case 'grades': return 'نمرات و توصیه‌ها';
      case 'finance': return isTeacherMode ? 'حقوق معلمین' : 'امور مالی شاگردان';
      case 'scanner': return 'اسکن هوشمند';
      case 'settings': return 'تنظیمات سامانه';
      case 'auth': return 'ورود به حساب';
      default: return 'مدیریت مکتب';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row relative" dir="rtl">
      
      {/* 1. Desktop Sidebar (Always Hidden on Mobile/Tablet) */}
      {!isLocked && (
        <aside className="hidden lg:flex flex-col w-72 bg-white border-l border-slate-200 h-screen sticky top-0">
          <div className="h-full flex flex-col p-8 overflow-y-auto">
            <div className="flex items-center gap-3 mb-12">
              <div className={`w-12 h-12 ${isTeacherMode ? 'emerald-gradient' : 'navy-gradient'} rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 text-white font-bold text-xl`}>
                {isTeacherMode ? 'T' : 'S'}
              </div>
              <div>
                <h1 className="font-bold text-slate-800 leading-tight text-sm">سامانه مدیریت مکاتب</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Appointment Management System</p>
              </div>
            </div>

            <nav className="flex-1 space-y-2">
              {visibleNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id as Section);
                    setSearchQuery('');
                  }}
                  className={`
                    w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl font-bold transition-all text-xs
                    ${activeSection === item.id 
                      ? 'navy-gradient text-white shadow-xl shadow-blue-100' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-4 h-4 ${activeSection === item.id ? 'opacity-100' : 'opacity-40'}`} />
                    {item.label}
                  </div>
                </button>
              ))}
            </nav>

            <div className="mt-auto pt-8 border-t border-slate-100 space-y-4 text-right">
              {user ? (
                <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden shadow-sm">
                      <UserIcon className="w-6 h-6 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{profile?.name || 'کاربر سیستم'}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{profile?.role === 'doctor' ? 'بخش طبی موظف' : 'بخش اداری مکتب'}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold">وضعیت حساب:</span>
                    <span className={`status-chip ${profile?.is_approved ? 'status-approved' : 'status-pending'} !px-2 !py-0.5`}>
                      {profile?.is_approved ? 'تایید شده' : 'در انتظار تایید'}
                    </span>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setActiveSection('auth')}
                  className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-bold text-xs transition-all border-2 ${activeSection === 'auth' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100'}`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  ورود کارکنان (ادمین)
                </button>
              )}
              
              {user && (
                <button 
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-3 px-5 py-3 text-rose-500 hover:bg-rose-50 rounded-2xl font-bold text-xs transition-all"
                >
                  <LogOut className="w-4 h-4 opacity-70" />
                  خروج از سامانه
                </button>
              )}
            </div>
          </div>
        </aside>
      )}

      {/* 2. Pure Mobile Native Header (Sticky, Elegant) */}
      {!isLocked && (
        <header className="lg:hidden sticky top-0 z-40 w-full h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-3" dir="rtl">
          {/* Right Side: Switcher and Sync Status aligned beautifully */}
          <div className="flex items-center gap-1.5 xs:gap-2">
            {/* Direct Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/50">
              <button 
                onClick={() => setMode('student')}
                className={`px-2 py-1 rounded-lg text-[9px] font-black transition-all cursor-pointer ${!isTeacherMode ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-400'}`}
              >
                شاگردان
              </button>
              <button 
                onClick={() => setMode('teacher')}
                className={`px-2 py-1 rounded-lg text-[9px] font-black transition-all cursor-pointer ${isTeacherMode ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-400'}`}
              >
                معلمین
              </button>
            </div>

            {/* Inline sync status compact */}
            <InlineSyncStatus />
          </div>

          {/* Left Side: Minimal brand layout containing only the authorized brand label */}
          <div>
            <h1 className="text-xs font-black text-slate-800 tracking-tight leading-none">پورتال هوشمند مکتب</h1>
          </div>
        </header>
      )}

      {/* Main Content Viewport */}
      <main className={`flex-1 flex flex-col min-w-0 h-screen overflow-hidden ${isLocked ? 'bg-slate-950' : ''}`}>
        
        {/* Desktop-only secondary header */}
        {!isLocked && (
          <header className="hidden lg:flex h-24 bg-white/40 backdrop-blur-xl border-b border-slate-200 items-center justify-between px-8 sticky top-0 z-30">
            <div className="flex-1 max-w-xl flex items-center justify-start">
              <InlineSyncStatus />
            </div>

            <div className="flex items-center gap-4">
              {/* Mode Toggle Switch */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button 
                  onClick={() => setMode('student')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${!isTeacherMode ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  شاگردان
                </button>
                <button 
                  onClick={() => setMode('teacher')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${isTeacherMode ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  معلمین
                </button>
              </div>
              {activeSection !== 'scanner' && (
                <>
                  <button className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl relative transition-colors">
                    <Bell className="w-5 h-5 text-slate-600" />
                    <span className="absolute top-2.5 left-2.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full" />
                  </button>
                  <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block" />
                </>
              )}
              <div className="text-left hidden sm:block">
                <p className="text-[10px] text-slate-500 font-medium">امروز</p>
                <p className="text-xs font-bold text-slate-800">{new Date().toLocaleDateString('fa-AF', { dateStyle: 'medium' })}</p>
              </div>
            </div>
          </header>
        )}

        {/* Content Area (Adds safety padding on mobile for the Bottom Bar) */}
        <div className={`flex-1 overflow-y-auto ${isLocked ? 'p-0' : 'p-4 pb-28 md:p-10'}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <SectionWrapper 
                activeSection={activeSection} 
                user={user} 
                profile={profile} 
                signOut={signOut} 
                setActiveSection={setActiveSection}
                searchQuery={searchQuery}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* 3. Pure Mobile Native Bottom Navigation Bar */}
      {!isLocked && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 px-2 pb-[safe-area-inset-bottom] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] rounded-t-3xl flex items-center justify-around h-18">
          
          {/* Menu Item 1: Home (only visible if logged in, otherwise scanner or auth link) */}
          {user ? (
            <button 
              onClick={() => { setActiveSection('home'); setIsBottomMenuOpen(false); }}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90 ${activeSection === 'home' ? 'text-blue-600' : 'text-slate-400'}`}
            >
              <LayoutDashboard className="w-5.5 h-5.5" />
              <span className="text-[10px] font-black mt-1">روزنامچه</span>
            </button>
          ) : (
            <button 
              onClick={() => { setActiveSection('auth'); setIsBottomMenuOpen(false); }}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90 ${activeSection === 'auth' ? 'text-blue-600' : 'text-slate-400'}`}
            >
              <ShieldCheck className="w-5.5 h-5.5" />
              <span className="text-[10px] font-black mt-1">ورود ادمین</span>
            </button>
          )}

          {/* Menu Item 2: List */}
          {user && (
            <button 
              onClick={() => { setActiveSection('drivers'); setIsBottomMenuOpen(false); }}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90 ${activeSection === 'drivers' ? 'text-blue-600' : 'text-slate-400'}`}
            >
              <Users className="w-5.5 h-5.5" />
              <span className="text-[10px] font-black mt-1">{isTeacherMode ? 'لیست معلمان' : 'لیست شاگردان'}</span>
            </button>
          )}

          {/* Core Central Action FAB: QR Scanner */}
          <div className="w-16 h-16 relative -mt-6">
            <button 
              onClick={() => { setActiveSection('scanner'); setIsBottomMenuOpen(false); }}
              className={`absolute inset-0 w-14 h-14 mx-auto rounded-full flex items-center justify-center text-white transition-all transform shadow-lg shadow-blue-500/20 active:scale-90 ${
                activeSection === 'scanner' 
                  ? 'bg-blue-600 scale-105' 
                  : `${isTeacherMode ? 'emerald-gradient hover:scale-105' : 'navy-gradient hover:scale-105'}`
              }`}
            >
              <QrCode className="w-6 h-6 animate-pulse" />
            </button>
          </div>

          {/* Menu Item 3: Attendance */}
          {user && (
            <button 
              onClick={() => { setActiveSection('attendance'); setIsBottomMenuOpen(false); }}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90 ${activeSection === 'attendance' ? 'text-blue-600' : 'text-slate-400'}`}
            >
              <ListChecks className="w-5.5 h-5.5" />
              <span className="text-[10px] font-black mt-1">حضورغیاب</span>
            </button>
          )}

          {/* Menu Item 4: More / Sheets */}
          {user ? (
            <button 
              onClick={() => setIsBottomMenuOpen(true)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-105 ${isBottomMenuOpen ? 'text-blue-600' : 'text-slate-400'}`}
            >
              <Menu className="w-5.5 h-5.5" />
              <span className="text-[10px] font-black mt-1">بیشتر</span>
            </button>
          ) : (
            <div className="flex-1" /> // Spacer
          )}
        </div>
      )}

      {/* 4. Elegant Mobile Drawers / Bottom Sheets (AnimatePresence) */}
      <AnimatePresence>
        {isBottomMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBottomMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 lg:hidden"
            />

            {/* Bottom Drawer Sheet */}
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] z-50 p-6 shadow-[0_-16px_36px_rgba(15,23,42,0.15)] lg:hidden border-t border-slate-200 pb-10"
            >
              {/* Smooth drag handle indicator */}
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" onClick={() => setIsBottomMenuOpen(false)} />

              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-black text-slate-800 text-base">دسترسی سریع</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">امکانات اضافی پورتال مکتب ملکی</p>
                </div>
                <button 
                  onClick={() => setIsBottomMenuOpen(false)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-slate-600" />
                </button>
              </div>

              {/* Grid of secondary sections */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => { setActiveSection('registration'); setIsBottomMenuOpen(false); }}
                  className={`flex flex-col items-start gap-2.5 p-4 rounded-2xl border text-right transition-all active:scale-95 ${
                    activeSection === 'registration' 
                      ? 'bg-blue-50/50 border-blue-200 text-blue-700' 
                      : 'bg-slate-50 border-slate-100 text-slate-700'
                  }`}
                >
                  <PlusCircle className="w-5 h-5 text-blue-500" />
                  <span className="text-xs font-black">{isTeacherMode ? 'ثبت معلم جدید' : 'ثبت شاگرد جدید'}</span>
                </button>

                <button
                  onClick={() => { setActiveSection('grades'); setIsBottomMenuOpen(false); }}
                  className={`flex flex-col items-start gap-2.5 p-4 rounded-2xl border text-right transition-all active:scale-95 ${
                    activeSection === 'grades' 
                      ? 'bg-purple-50/50 border-purple-200 text-purple-700' 
                      : 'bg-slate-50 border-slate-100 text-slate-700'
                  }`}
                >
                  <Bell className="w-5 h-5 text-purple-500" />
                  <span className="text-xs font-black">نمرات و توصیه‌ها</span>
                </button>

                <button
                  onClick={() => { setActiveSection('finance'); setIsBottomMenuOpen(false); }}
                  className={`flex flex-col items-start gap-2.5 p-4 rounded-2xl border text-right transition-all active:scale-95 ${
                    activeSection === 'finance' 
                      ? 'bg-emerald-50/50 border-emerald-200 text-emerald-700' 
                      : 'bg-slate-50 border-slate-100 text-slate-700'
                  }`}
                >
                  <FinanceIcon className="w-5 h-5 text-emerald-500" />
                  <span className="text-xs font-black">{isTeacherMode ? 'حقوق معلمین' : 'مدیریت مالی'}</span>
                </button>

                <button
                  onClick={() => { setActiveSection('settings'); setIsBottomMenuOpen(false); }}
                  className={`flex flex-col items-start gap-2.5 p-4 rounded-2xl border text-right transition-all active:scale-95 ${
                    activeSection === 'settings' 
                      ? 'bg-slate-100 border-slate-200 text-slate-800' 
                      : 'bg-slate-50 border-slate-100 text-slate-700'
                  }`}
                >
                  <Settings className="w-5 h-5 text-slate-500" />
                  <span className="text-xs font-black">تنظیمات سامانه</span>
                </button>
              </div>

              {/* Profile card & quick actions */}
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 mb-6">
                <div className="flex items-center gap-3.5 mb-3">
                  <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800">{profile?.name || 'کاربر سیستم'}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">{profile?.role === 'doctor' ? 'داکتر موظف' : 'مدیر مکتب'}</p>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 flex justify-between items-center bg-white px-3 py-2 rounded-xl">
                  <span>نام کاربری: </span>
                  <span className="text-slate-600 font-bold">{profile?.email}</span>
                </div>
              </div>

              {/* Log out option */}
              <button
                onClick={() => {
                  signOut();
                  setIsBottomMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl font-black text-xs transition-all active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                <span>خروج کامل از سامانه</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

