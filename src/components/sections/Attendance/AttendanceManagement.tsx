import React, { useState, useEffect } from 'react';
import { Calendar, Fingerprint, Clock, Settings, ListChecks, Hourglass, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystem } from '../../../contexts/SystemContext';
import { ManualAttendance } from './ManualAttendance';
import { AdvancedScanner } from './AdvancedScanner';
import { ScannerLocker } from './ScannerLocker';
import { LeaveManagement } from './LeaveManagement';
import { WorkingHoursSettings } from './WorkingHoursSettings';

export const AttendanceManagement: React.FC = () => {
  const { isTeacherMode } = useSystem();
  const [activeTab, setActiveTab] = useState<'manual' | 'scanner' | 'leave' | 'settings'>('manual');
  const [isLocked, setIsLocked] = useState(() => localStorage.getItem('attendance_locked') === 'true');
  const [isChangingMode, setIsChangingMode] = useState(false);

  // Transition when mode changes
  useEffect(() => {
    setIsChangingMode(true);
    const timer = setTimeout(() => setIsChangingMode(false), 800);
    return () => clearTimeout(timer);
  }, [isTeacherMode]);

  const [lockSettings, setLockSettings] = useState<{ mode: 'presence' | 'entry-exit', autoSwitch: boolean }>({
    mode: 'entry-exit',
    autoSwitch: true
  });

  const handleLock = (settings: { mode: 'presence' | 'entry-exit', autoSwitch: boolean }) => {
    setLockSettings(settings);
    setIsLocked(true);
    localStorage.setItem('attendance_locked', 'true');
    localStorage.setItem('attendance_settings', JSON.stringify(settings));
  };

  const handleUnlock = () => {
    setIsLocked(false);
    localStorage.removeItem('attendance_locked');
    localStorage.removeItem('attendance_settings');
  };

  if (isLocked) {
    const savedSettings = localStorage.getItem('attendance_settings');
    const settingsToUse = savedSettings ? JSON.parse(savedSettings) : lockSettings;
    return (
      <ScannerLocker 
        onUnlock={handleUnlock} 
        mode={settingsToUse.mode} 
        autoSwitch={settingsToUse.autoSwitch} 
      />
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col relative">
      <AnimatePresence mode="wait">
        {isChangingMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-[2.5rem]"
          >
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border-4 border-slate-100 border-t-blue-500 rounded-full"
              />
              <Hourglass className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-blue-500" />
            </div>
            <p className="mt-4 text-sm font-black text-slate-800 tracking-widest animate-pulse">
              در حال بارگذاری اطلاعات {isTeacherMode ? 'معلمین' : 'شاگردان'}...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">مدیریت حضور و غیاب</h2>
          <p className="text-sm text-slate-500 font-bold mt-1">مدیریت تردد و حضور {isTeacherMode ? 'معلمین' : 'شاگردان'}</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>ثبت دستی</span>
          </button>
          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'scanner' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Fingerprint className="w-4 h-4" />
            <span>اسکنر پیشرفته</span>
          </button>
          <button
            onClick={() => setActiveTab('leave')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'leave' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>مرخصی و تعطیلات</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'settings' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">تنظیمات</span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {activeTab === 'manual' ? (
          <ManualAttendance />
        ) : activeTab === 'scanner' ? (
          <AdvancedScanner onLock={handleLock} />
        ) : activeTab === 'leave' ? (
          <LeaveManagement />
        ) : (
          <WorkingHoursSettings />
        )}
      </div>
    </div>
  );
};
