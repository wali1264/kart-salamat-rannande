import React, { useState } from 'react';
import { Fingerprint, ShieldAlert, Clock, Power, CheckCircle2, History, Settings2, Info } from 'lucide-react';
import { useSystem } from '../../../contexts/SystemContext';
import { motion } from 'framer-motion';

interface Props {
  onLock: () => void;
}

export const AdvancedScanner: React.FC<Props> = ({ onLock }) => {
  const { isTeacherMode } = useSystem();
  const [scannerMode, setScannerMode] = useState<'presence' | 'entry-exit'>('entry-exit');
  const [autoSwitch, setAutoSwitch] = useState(true);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Alert Banner */}
      <div className="bg-amber-50 border border-amber-100 rounded-[2rem] p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
          <ShieldAlert className="w-8 h-8 text-amber-500" />
        </div>
        <div className="flex-1 text-center md:text-right">
          <h4 className="text-sm font-black text-amber-900 mb-1">حالت اسکن هوشمند</h4>
          <p className="text-xs text-amber-700/70 font-bold leading-relaxed">
            این بخش برای استفاده اختصاصی از اسکنر اثر انگشت طراحی شده است. پس از ورود به حالت "خروج امن"، سیستم تمام دسترسی‌های دیگر را مسدود کرده و فقط پنل اسکنر را نمایش می‌دهد.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Settings Card */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-slate-50 rounded-2xl">
              <Settings2 className="w-5 h-5 text-slate-400" />
            </div>
            <h3 className="font-black text-slate-800">تنظیمات اسکنر</h3>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">مدل عملیاتی</label>
              <div className="space-y-3">
                {[
                  { id: 'presence', label: 'فقط حاضر غایب', desc: 'فقط حضور در روز ثبت می‌شود (مناسب شاگردان)', icon: CheckCircle2 },
                  { id: 'entry-exit', label: 'ورود و خروج', desc: 'زمان دقیق تردد ثبت می‌شود (مناسب معلمان)', icon: History }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setScannerMode(mode.id as any)}
                    className={`w-full flex items-center gap-4 p-5 rounded-[1.5rem] border-2 text-right transition-all ${
                      scannerMode === mode.id 
                        ? 'border-blue-500 bg-blue-50/50' 
                        : 'border-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${scannerMode === mode.id ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <mode.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-black ${scannerMode === mode.id ? 'text-blue-900' : 'text-slate-600'}`}>{mode.label}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{mode.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {scannerMode === 'entry-exit' && (
              <div className="pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-50 rounded-xl">
                      <Clock className="w-4 h-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800">تشخیص ورود/خروج زمانی</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Smart Time Detection</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setAutoSwitch(!autoSwitch)}
                    className={`w-12 h-6 rounded-full p-1 transition-all ${autoSwitch ? 'bg-emerald-500 flex-row-reverse' : 'bg-slate-200'}`}
                  >
                    <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                  </button>
                </div>
                <div className="mt-4 p-4 bg-slate-50 rounded-2xl flex items-start gap-3">
                  <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-500 leading-relaxed font-bold">
                    در صورت فعال بودن، سیستم تا ساعت ۱۲ ظهر را به عنوان "ورود" و پس از آن را به عنوان "خروج" در نظر می‌گیرد. در حالت دستی، مدیر باید دکمه سوئیچ را روی صفحه بزند.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Card */}
        <div className={`rounded-[2.5rem] p-8 shadow-xl flex flex-col items-center justify-center text-center space-y-8 border-4 ${isTeacherMode ? 'bg-emerald-900 border-emerald-800 text-white' : 'bg-slate-900 border-slate-800 text-white'}`}>
          <div className="relative">
            <div className={`absolute inset-0 blur-3xl opacity-20 ${isTeacherMode ? 'bg-emerald-400' : 'bg-blue-400'}`} />
            <div className={`w-32 h-32 rounded-[3rem] border-4 flex items-center justify-center relative bg-white/5 backdrop-blur-md ${isTeacherMode ? 'border-emerald-500/30' : 'border-blue-500/30'}`}>
              <Fingerprint className={`w-16 h-16 ${isTeacherMode ? 'text-emerald-400' : 'text-blue-400'}`} />
              <div className="absolute top-2 right-2 flex gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-black mb-3">حالت آماده‌باش</h3>
            <p className="text-sm opacity-60 font-bold leading-relaxed max-w-xs">
              با فعال‌سازی این بخش، سیستم برای اسکن کارت‌های هوشمند و اثر انگشت آماده می‌شود. مدیر می‌تواند با خیال راحت سیستم را ترک کند.
            </p>
          </div>

          <button 
            onClick={onLock}
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
