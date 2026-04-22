import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, Shield, Mail, Lock, User as UserIcon } from 'lucide-react';

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'doctor' | 'officer'>('officer');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { full_name: fullName }
          }
        });
        
        if (signUpError) throw signUpError;
        // Profile is handled by the DB trigger automatically now,
        // but if we want to update it manually or check compatibility:
        // The DB trigger handle_new_user() will insert into 'profiles' table.
      }
    } catch (err: any) {
      setError(err.message || 'خطایی رخ داد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4" dir="rtl">
      {/* Background patterns */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-white/10 backdrop-blur-xl rounded-[2.5rem] border border-white/10 overflow-hidden relative z-10 shadow-2xl"
      >
        <div className="p-8 md:p-12">
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg rotate-3">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">سامانه ملی سلامت رانندگان</h1>
            <p className="text-blue-200/60 font-medium">Afghanistan National Driver Health Portal</p>
          </div>

          <div className="flex bg-white/5 p-1 rounded-2xl mb-8">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 font-medium rounded-xl transition-all ${isLogin ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              ورود
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 font-medium rounded-xl transition-all ${!isLogin ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              ثبت‌نام جدید
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-5 overflow-hidden"
                >
                  <div className="relative">
                    <UserIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="نام و نام خانوادگی"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required={!isLogin}
                      className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-400 rounded-xl py-4 pr-12 pl-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm text-slate-400 mr-2">نقش کاربری:</label>
                    <div className="flex gap-4">
                      <button 
                        type="button"
                        onClick={() => setRole('officer')}
                        className={`flex-1 py-3 rounded-xl border transition-all text-sm ${role === 'officer' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-transparent border-white/10 text-slate-400'}`}
                      >
                        مامور ترافیک
                      </button>
                      <button 
                        type="button"
                        onClick={() => setRole('doctor')}
                        className={`flex-1 py-3 rounded-xl border transition-all text-sm ${role === 'doctor' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-transparent border-white/10 text-slate-400'}`}
                      >
                        داکتر موظف
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="email" 
                placeholder="ایمیل آدرس"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-400 rounded-xl py-4 pr-12 pl-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div className="relative">
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="password" 
                placeholder="رمز عبور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-400 rounded-xl py-4 pr-12 pl-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 p-3 rounded-xl border border-red-400/20">
                {error}
              </p>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-xl shadow-blue-900/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  {isLogin ? 'ورود به سامانه' : 'ایجاد حساب کاربری'}
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
