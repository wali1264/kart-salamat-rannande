import React, { useState } from 'react';
import { useSync } from '../contexts/SyncContext';
import { CloudOff, CloudRain, RotateCcw, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Database, Trash2, Clock, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const InlineSyncStatus: React.FC = () => {
  const { isOnline, queueCount, pendingItems, failedItems, isSyncing, syncNow, removeFromQueue } = useSync();
  const [showDetails, setShowDetails] = useState(false);

  const getActionLabel = (item: any) => {
    const tableLabels: Record<string, string> = {
      'students': 'اطلاعات شاگرد/معلم',
      'attendance': 'حضور و غیاب',
      'payments': 'پرداختی‌ها/فیس',
      'health_cards': 'کارت هویت',
      'activity_logs': 'گزارش فعالیت',
      'system_settings': 'تنظیمات سیستم'
    };

    const actionLabels: Record<string, string> = {
      'insert': 'ثبت جدید',
      'update': 'ویرایش',
      'delete': 'حذف',
      'upsert': 'بروزرسانی'
    };

    const table = tableLabels[item.collection] || item.collection;
    const action = actionLabels[item.type] || item.type;

    return `${action} ${table}`;
  };

  const allItems = [...pendingItems.map(i => ({...i, status: 'pending'})), ...failedItems.map(i => ({...i, status: 'failed'}))];

  return (
    <div className="relative" dir="rtl">
      <motion.button
        layout
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border transition-all h-12 ${
          !isOnline 
            ? 'bg-amber-50 border-amber-200 text-amber-600' 
            : (queueCount > 0 || failedItems.length > 0 || isSyncing)
            ? 'bg-blue-50 border-blue-200 text-blue-600'
            : 'bg-emerald-50 border-emerald-200 text-emerald-600'
        }`}
      >
        <div className="relative">
          {!isOnline ? (
            <CloudOff className="w-4 h-4" />
          ) : isSyncing ? (
            <RotateCcw className="w-4 h-4 animate-spin" />
          ) : (
            <Database className="w-4 h-4" />
          )}
          
          {allItems.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white">
              {allItems.length}
            </span>
          )}
        </div>

        <div className="flex flex-col items-start min-w-[120px]">
          <span className="text-[10px] font-black leading-none">
            {!isOnline ? 'حالت آفلاین فعال است' : isSyncing ? 'در حال همگام‌سازی...' : 'وضعیت داده‌ها'}
          </span>
          <span className="text-[9px] opacity-70 font-bold mt-0.5">
            {allItems.length > 0 ? `${allItems.length} مورد در صف انتظار` : 'همه داده‌ها همگام هستند'}
          </span>
        </div>

        {showDetails ? <ChevronUp className="w-4 h-4 opacity-50" /> : <ChevronDown className="w-4 h-4 opacity-50" />}
      </motion.button>

      <AnimatePresence>
        {showDetails && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowDetails(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute top-full mt-2 left-0 w-80 bg-white border border-slate-200 shadow-2xl rounded-3xl overflow-hidden p-4 flex flex-col gap-3 z-50 transform origin-top-left"
            >
              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-xs text-slate-800">صف انتظار همگام‌سازی</h3>
                  <span className="bg-slate-100 text-slate-600 text-[9px] px-2 py-0.5 rounded-full font-black">
                    {allItems.length} مورد
                  </span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    syncNow();
                  }}
                  disabled={!isOnline || isSyncing}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30"
                  title="همگام‌سازی دستی"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {allItems.length > 0 ? (
                  allItems.map((item) => (
                    <div 
                      key={item.id} 
                      className={`flex flex-col gap-2 p-2.5 rounded-xl border transition-all ${
                        item.status === 'failed' ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {item.status === 'failed' ? (
                            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                          ) : isSyncing ? (
                            <RotateCcw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span className={`text-[10px] font-black ${item.status === 'failed' ? 'text-red-900' : 'text-slate-900'}`}>
                            {getActionLabel(item)}
                          </span>
                        </div>
                        <button 
                          onClick={() => item.id && removeFromQueue(item.id)}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="حذف از صف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      <div className="flex flex-col gap-1 pr-5">
                         <div className="flex items-center justify-between text-[9px] font-bold text-slate-500">
                           <span>زمان ثبت: {new Date(item.timestamp).toLocaleTimeString('fa-IR')}</span>
                           <span className="opacity-60">{item.collection}</span>
                         </div>
                         {item.error && (
                           <p className="text-[8px] text-red-600 bg-red-100/50 p-1 rounded-md mt-1 font-bold">
                             علت خطا: {item.error}
                           </p>
                         )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center gap-2 py-6">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    <p className="text-[10px] font-black text-slate-600">همه داده‌ها با موفقیت همگام شدند</p>
                  </div>
                )}
              </div>

              {!isOnline && allItems.length > 0 && (
                <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                  <div className="flex items-center gap-2 text-amber-700">
                    <CloudOff className="w-3.5 h-3.5" />
                    <p className="text-[9px] font-black">دستگاه آفلاین است</p>
                  </div>
                  <p className="text-[8px] text-amber-600 mt-1 leading-relaxed">
                    دستان شما محلی ذخیره شده است. به محض اتصال به اینترنت، عملیات همگام‌سازی خودکار انجام می‌شود.
                  </p>
                </div>
              )}

              {isOnline && failedItems.length > 0 && (
                <p className="text-[8px] text-slate-400 text-center font-bold italic">
                  * مواردی که با خطا مواجه شده‌اند را می‌توانید حذف کنید یا مجدداً امتحان کنید.
                </p>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </div>
  );
};
