import React, { useState } from 'react';
import { Fingerprint, ShieldAlert, Clock, Power, CheckCircle2, History, Settings2, Info } from 'lucide-react';
import { useSystem } from '../../../contexts/SystemContext';
import { motion } from 'framer-motion';

interface Props {
  onLock: (settings: { mode: 'presence' | 'entry-exit', autoSwitch: boolean }) => void;
}

export const AdvancedScanner: React.FC<Props> = ({ onLock }) => {
  const { isTeacherMode } = useSystem();
  const [scannerMode, setScannerMode] = useState<'presence' | 'entry-exit'>('entry-exit');
  const [autoSwitch, setAutoSwitch] = useState(true);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ... previous content ... */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Settings Card */}
        {/* ... */}
        
        {/* Action Card */}
        <div className={`rounded-[2.5rem] p-8 shadow-xl flex flex-col items-center justify-center text-center space-y-8 border-4 ${isTeacherMode ? 'bg-emerald-900 border-emerald-800 text-white' : 'bg-slate-900 border-slate-800 text-white'}`}>
          <div className="relative">
            {/* ... */}
          </div>

          <div>
            <h3 className="text-2xl font-black mb-3">حالت آماده‌باش</h3>
            <p className="text-sm opacity-60 font-bold leading-relaxed max-w-xs">
              با فعال‌سازی این بخش، سیستم برای اسکن کارت‌های هوشمند و اثر انگشت آماده می‌شود. مدیر می‌تواند با خیال راحت سیستم را ترک کند.
            </p>
          </div>

          <button 
            onClick={() => onLock({ mode: scannerMode, autoSwitch })}
            className={`w-full py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 ${isTeacherMode ? 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'}`}
          >
            <Power className="w-6 h-6" />
            شروع عملیات - خروج امن
          </button>
          
          <p className="text-[10px] uppercase font-black tracking-widest opacity-30">Security Lock Protocol Enabled</p>
        </div>
      </div>
    </div>
  );
};
