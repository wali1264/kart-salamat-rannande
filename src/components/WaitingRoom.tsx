import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LogOut, RefreshCcw, ShieldCheck, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const WaitingRoom: React.FC = () => {
  const { profile, signOut, refreshProfile } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshProfile();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-slate-100"
      >
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-amber-500 animate-pulse" />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-800 mb-2">در انتظار تایید مدیریت</h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
          حساب کاربری شما با موفقیت ساخته شد. برای دسترسی به سامانه، مدیر سیستم باید هویت شما را تایید کند. 
          لطفاً شکیبا باشید.
        </p>

        <div className="space-y-4">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCcw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            بررسی مجدد وضعیت
          </button>
          
          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-6 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            خروج از حساب
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>امنیت سامانه در اولویت ماست</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
