import React, { useState } from 'react';
import { Calendar, Fingerprint, ListChecks, ShieldAlert } from 'lucide-react';
import { useSystem } from '../../../contexts/SystemContext';
import { ManualAttendance } from './ManualAttendance';
import { AdvancedScanner } from './AdvancedScanner';
import { ScannerLocker } from './ScannerLocker';

export const AttendanceManagement: React.FC = () => {
  const { isTeacherMode } = useSystem();
  const [activeTab, setActiveTab] = useState<'manual' | 'scanner'>('manual');
  const [isLocked, setIsLocked] = useState(() => localStorage.getItem('attendance_locked') === 'true');
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
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">مدیریت حضور و غیاب</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">مدیریت تردد و حضور {isTeacherMode ? 'معلمین' : 'شاگردان'}</p>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] border border-slate-200">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ListChecks className="w-4 h-4" />
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
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {activeTab === 'manual' ? (
          <ManualAttendance />
        ) : (
          <AdvancedScanner onLock={handleLock} />
        )}
      </div>
    </div>
  );
};
