import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X, DownloadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const PWAReloadPrompt: React.FC = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <AnimatePresence>
      {(offlineReady || needRefresh) && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 right-6 z-[10001] flex items-center gap-4 bg-slate-900 text-white p-5 rounded-3xl shadow-2xl border border-white/10 backdrop-blur-xl"
          dir="rtl"
        >
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${needRefresh ? 'bg-blue-500' : 'bg-emerald-500 shadow-lg shadow-emerald-500/20'}`}>
              {needRefresh ? (
                <RefreshCw className="w-6 h-6 animate-spin-slow" />
              ) : (
                <DownloadCloud className="w-6 h-6" />
              )}
            </div>
            
            <div className="flex flex-col text-right">
              <span className="font-black text-sm">
                {needRefresh ? 'نسخه جدید در دسترس است' : 'برنامه آماده استفاده آفلاین'}
              </span>
              <span className="text-xs opacity-70 font-medium">
                {needRefresh 
                  ? 'قابلیت‌های جدید آماده استفاده هستند. برای بروزرسانی کلیک کنید.' 
                  : 'برنامه با موفقیت در این مرورگر ذخیره شد.'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 mr-4">
            {needRefresh && (
              <button
                onClick={() => updateServiceWorker(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 shadow-lg shadow-blue-500/20"
              >
                بروزرسانی
              </button>
            )}
            <button
              onClick={close}
              className="bg-white/10 hover:bg-white/20 p-2.5 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
