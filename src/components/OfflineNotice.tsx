import React from 'react';
import { WifiOff, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineNotice: React.FC = () => {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[10000] flex justify-center p-0 pointer-events-none"
        >
          <div className="w-full bg-rose-600 text-white px-8 py-4 shadow-2xl flex items-center justify-between gap-4 pointer-events-auto border-b border-rose-500/50 backdrop-blur-md" dir="rtl">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-2 rounded-xl">
                <WifiOff className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex flex-col text-right">
                <span className="font-black text-sm">عدم دسترسی به شبکه (حالت فقط خواندنی)</span>
                <span className="text-xs opacity-90 font-medium">برای ثبت اطلاعات جدید یا تغییرات، لطفاً اتصال اینترنت خود را برقرار کنید.</span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 bg-rose-700/50 px-4 py-2 rounded-xl border border-rose-400/30">
              <AlertTriangle className="w-4 h-4 text-rose-200" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Offline Intelligence Active</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
