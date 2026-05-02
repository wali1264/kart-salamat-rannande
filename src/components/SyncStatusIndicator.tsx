import React, { useState } from 'react';
import { useSync } from '../contexts/SyncContext';
import { CloudOff, CloudRain, RotateCcw, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const SyncStatusIndicator: React.FC = () => {
  const { isOnline, queueCount, failedItems, isSyncing, syncNow } = useSync();
  const [showDetails, setShowDetails] = useState(false);

  if (isOnline && queueCount === 0 && failedItems.length === 0 && !isSyncing) {
    return null; // Don't show anything if everything is perfect and online
  }

  return (
    <div className="fixed top-20 right-6 z-[9999] flex flex-col items-end gap-2" dir="rtl">
      <motion.button
        layout
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-xl border transition-all ${
          !isOnline 
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' 
            : queueCount > 0 || failedItems.length > 0
            ? 'bg-blue-500/10 border-blue-500/20 text-blue-600'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
        }`}
      >
        <div className="relative">
          {!isOnline ? (
            <CloudOff className="w-5 h-5" />
          ) : isSyncing ? (
            <RotateCcw className="w-5 h-5 animate-spin" />
          ) : (
            <Database className="w-5 h-5" />
          )}
          
          {(queueCount > 0 || failedItems.length > 0) && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
              {queueCount + failedItems.length}
            </span>
          )}
        </div>

        <div className="flex flex-col items-start">
          <span className="text-xs font-bold leading-none">
            {!isOnline ? 'حالت آفلاین فعال است' : isSyncing ? 'در حال همگام‌سازی...' : 'وضعیت داده‌ها'}
          </span>
          <span className="text-[10px] opacity-70">
            {queueCount > 0 ? `${queueCount} مورد در انتظار` : failedItems.length > 0 ? `${failedItems.length} خطا در انتظار بررسی` : 'همه داده‌ها همگام هستند'}
          </span>
        </div>

        {showDetails ? <ChevronUp className="w-4 h-4 opacity-50" /> : <ChevronDown className="w-4 h-4 opacity-50" />}
      </motion.button>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="w-72 bg-white/90 backdrop-blur-2xl border border-slate-200 shadow-2xl rounded-3xl overflow-hidden p-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800">جزئیات همگام‌سازی</h3>
              <button 
                onClick={syncNow}
                disabled={!isOnline || isSyncing}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30"
                title="همگام‌سازی دستی"
              >
                <RotateCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-2">
              {queueCount > 0 && (
                <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-xl">
                  <CloudRain className="w-4 h-4 text-blue-500" />
                  <div className="flex-1">
                    <p className="text-[11px] font-bold text-blue-900 leading-none">{queueCount} مورد در صف انتظار</p>
                    <p className="text-[9px] text-blue-700 mt-1">با اتصال به اینترنت خودکار ارسال می‌شوند</p>
                  </div>
                </div>
              )}

              {failedItems.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 px-1 mt-2">خطاهای رخ داده:</p>
                  {failedItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 bg-red-50 rounded-xl border border-red-100">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-red-900 truncate">خطا در {item.collection}</p>
                        <p className="text-[9px] text-red-700 truncate">{item.error || 'خطای نامشخص'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isOnline && (
                <p className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-xl text-center font-medium">
                  دستگاه شما آفلاین است. تغییرات در حافظه مرورگر ذخیره شده و پس از اتصال ارسال خواهند شد.
                </p>
              )}

              {isOnline && queueCount === 0 && failedItems.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  <p className="text-xs font-bold text-slate-600 font-bold">همه چیز مرتب است!</p>
                </div>
              )}
            </div>
            
            {failedItems.length > 0 && isOnline && (
              <button 
                onClick={syncNow}
                className="w-full mt-2 bg-slate-900 text-white text-xs font-bold py-2 rounded-xl hover:bg-slate-800 transition-colors"
              >
                تلاش مجدد برای همگام‌سازی
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
