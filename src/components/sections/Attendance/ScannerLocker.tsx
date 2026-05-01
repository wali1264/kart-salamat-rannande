import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, Lock, ShieldCheck, LogOut, Clock, User as UserIcon, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useScanner } from '../../../hooks/useScanner';
import { useSystem } from '../../../contexts/SystemContext';
import { supabase } from '../../../lib/supabase';

interface Props {
  onUnlock: () => void;
}

type ScanStatus = 'ready' | 'identifying' | 'success' | 'error';

export const ScannerLocker: React.FC<Props> = ({ onUnlock }) => {
  const { isTeacherMode } = useSystem();
  const [status, setStatus] = useState<ScanStatus>('ready');
  const [matchedPerson, setMatchedPerson] = useState<any | null>(null);
  const [attendanceType, setAttendanceType] = useState<'entry' | 'exit'>('entry');
  const [message, setMessage] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine auto-mode
  useEffect(() => {
    const hour = new Date().getHours();
    setAttendanceType(hour < 12 ? 'entry' : 'exit');
  }, []);

  const handleScan = async (code: string) => {
    if (status !== 'ready') return;
    
    setStatus('identifying');
    setMatchedPerson(null);

    try {
      // Find person by fingerprint/card code
      // We look for students/teachers where fingerprints array contains the scanned code
      const { data: people, error } = await supabase
        .from('students')
        .select('*')
        .eq('is_teacher', isTeacherMode);

      if (error) throw error;

      // Find the person whose fingerprints include this code
      // Note: Scanner might return card ID as well.
      const person = people?.find(p => 
        (p.fingerprints && p.fingerprints.includes(Number(code))) || 
        p.national_id === code ||
        p.id === code
      );

      if (!person) {
        setStatus('error');
        setMessage('شناسایی نشد. مجدداً تلاش کنید.');
        setTimeout(() => setStatus('ready'), 3000);
        return;
      }

      setMatchedPerson(person);

      // Record attendance
      const { error: attError } = await supabase
        .from('attendance')
        .insert([{
          student_id: person.id,
          type: attendanceType,
          recorded_at: new Date().toISOString(),
          is_manual: false,
          is_teacher: isTeacherMode
        }]);

      if (attError) throw attError;

      setStatus('success');
      setMessage(attendanceType === 'entry' ? `خوش آمدید، ${person.name}!` : `خداحافظ، ${person.name}!`);
      
      // Auto reset after 5 seconds
      setTimeout(() => {
        setStatus('ready');
        setMatchedPerson(null);
      }, 5000);

    } catch (err) {
      console.error('Locker scan error:', err);
      setStatus('error');
      setMessage('خطا در ارتباط با سرور');
      setTimeout(() => setStatus('ready'), 3000);
    }
  };

  useScanner(handleScan);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-slate-950 z-[100] flex flex-col items-center justify-between p-10 overflow-hidden"
    >
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 right-0 w-[500px] h-[500px] blur-[150px] opacity-20 rounded-full ${isTeacherMode ? 'bg-emerald-500' : 'bg-blue-500'}`} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-slate-900/50 blur-[150px] rounded-full" />
      </div>

      {/* Header */}
      <div className="w-full flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isTeacherMode ? 'bg-emerald-500' : 'bg-blue-600'} text-white shadow-lg`}>
            {isTeacherMode ? 'T' : 'S'}
          </div>
          <div>
            <h2 className="text-white font-black text-lg">پیشخوان حضور و غیاب هوشمند</h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">School Security Protocol</p>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <p className="text-white text-3xl font-black tracking-tighter" dir="ltr">
            {currentTime.toLocaleTimeString('fa-AF', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-slate-500 text-[10px] font-bold mt-1">
            {currentTime.toLocaleDateString('fa-AF', { dateStyle: 'full' })}
          </p>
        </div>
      </div>

      {/* Main Scanner UI */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <AnimatePresence mode="wait">
          {status === 'ready' && (
            <motion.div 
              key="ready"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="flex flex-col items-center"
            >
              <div className="relative mb-12">
                <div className={`absolute inset-0 blur-3xl opacity-20 animate-pulse ${isTeacherMode ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                <div className={`w-64 h-64 rounded-[4rem] border-4 flex items-center justify-center relative bg-white/5 backdrop-blur-md transition-colors ${isTeacherMode ? 'border-emerald-500/20' : 'border-blue-500/20'}`}>
                  <Fingerprint className={`w-32 h-32 ${isTeacherMode ? 'text-emerald-400' : 'text-blue-400'} animate-pulse`} />
                  
                  {/* Scanning line animation */}
                  <div className="absolute inset-0 overflow-hidden rounded-[4rem]">
                    <div className={`w-full h-1 absolute left-0 top-0 animate-scan ${isTeacherMode ? 'bg-emerald-400 shadow-[0_0_15px_emerald]' : 'bg-blue-400 shadow-[0_0_15px_blue]'}`} />
                  </div>
                </div>
              </div>
              <h1 className="text-4xl font-black text-white mb-4 tracking-tight">لطفاً انگشت خود را قرار دهید</h1>
              <div className="flex items-center gap-2 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-slate-400 text-sm font-bold">
                <Clock className="w-4 h-4" />
                <span>حالت ثبت خودکار: {attendanceType === 'entry' ? 'ورود' : 'خروج'}</span>
              </div>
            </motion.div>
          )}

          {status === 'identifying' && (
            <motion.div 
              key="identifying"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="w-32 h-32 border-4 border-slate-800 border-t-white rounded-full animate-spin" />
              <p className="text-2xl font-bold text-white">در حال شناسایی...</p>
            </motion.div>
          )}

          {status === 'success' && matchedPerson && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center"
            >
              <div className={`w-48 h-48 rounded-[3rem] ${isTeacherMode ? 'bg-emerald-500 text-emerald-950' : 'bg-blue-600 text-blue-950'} flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] border-4 border-white/20`}>
                <UserIcon className="w-24 h-24 text-white" />
              </div>
              <div className="flex items-center gap-4 mb-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                <h1 className="text-6xl font-black text-white">{matchedPerson.name}</h1>
              </div>
              <p className="text-2xl font-bold text-emerald-400 mb-8">{message}</p>
              <div className="bg-white/10 backdrop-blur-md px-10 py-6 rounded-[2rem] border border-white/5">
                <div className="flex items-center justify-between gap-12">
                   <div className="text-right">
                      <p className="text-slate-400 text-xs font-bold uppercase mb-1">زمان ثبت</p>
                      <p className="text-white text-xl font-black" dir="ltr">{currentTime.toLocaleTimeString('fa-AF', { hour: '2-digit', minute: '2-digit' })}</p>
                   </div>
                   <div className="w-px h-10 bg-white/10" />
                   <div className="text-right">
                      <p className="text-slate-400 text-xs font-bold uppercase mb-1">وضعیت</p>
                      <p className={`text-xl font-black ${attendanceType === 'entry' ? 'text-emerald-400' : 'text-rose-400'}`}>{attendanceType === 'entry' ? 'ورود موفق' : 'خروج موفق'}</p>
                   </div>
                </div>
              </div>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div 
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center"
            >
              <div className="w-32 h-32 bg-rose-500 rounded-full flex items-center justify-center mb-6 shadow-2xl">
                <AlertCircle className="w-16 h-16 text-white" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2">{message}</h2>
              <p className="text-slate-500 font-bold">مجددا انگشت خود را روی اسکنر قرار دهید</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer / Unlock */}
      <div className="w-full flex flex-col items-center gap-6 relative z-10">
        <div className="flex gap-4">
           {['entry', 'exit'].map((type) => (
             <button
               key={type}
               onClick={() => setAttendanceType(type as any)}
               className={`px-8 py-3 rounded-2xl font-black text-xs transition-all border-2 ${
                 attendanceType === type 
                   ? (type === 'entry' ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' : 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-500/20') 
                   : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'
               }`}
             >
               حالت دستی: {type === 'entry' ? 'فقط ورود' : 'فقط خروج'}
             </button>
           ))}
        </div>

        <button 
          onClick={onUnlock}
          className="group flex flex-col items-center gap-2 opacity-20 hover:opacity-100 transition-all"
        >
          <div className="p-4 bg-white/5 group-hover:bg-rose-500/20 rounded-full transition-colors border border-white/5 group-hover:border-rose-500/30">
            <Lock className="w-6 h-6 text-slate-400 group-hover:text-rose-400" />
          </div>
          <span className="text-[10px] font-black text-slate-600 group-hover:text-rose-400 uppercase tracking-widest">خروج از پیشخوان (مدیر)</span>
        </button>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan {
          animation: scan 3s linear infinite;
        }
      `}</style>
    </motion.div>
  );
};
