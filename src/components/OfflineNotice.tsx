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
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[9999] flex justify-center p-4 pointer-events-none"
        >
          <div className="bg-rose-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 pointer-events-auto border border-rose-500/50 backdrop-blur-md" dir="rtl">
            <WifiOff className="w-5 h-5 animate-pulse" />
            <div className="flex flex-col">
              <span className="font-bold text-xs">ارتباط با اینترنت قطع شد</span>
              <span className="text-[10px] opacity-80">برخی قابلیت‌ها ممکن است تا زمان اتصال مجدد در دسترس نباشند.</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
