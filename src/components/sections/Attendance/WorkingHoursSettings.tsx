import React, { useState, useEffect } from 'react';
import { Settings, Save, Clock, Info, CheckCircle2, AlertCircle, Search } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useSystem } from '../../../contexts/SystemContext';
import { motion, AnimatePresence } from 'framer-motion';

export const WorkingHoursSettings: React.FC = () => {
  const { isTeacherMode } = useSystem();
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [limit, setLimit] = useState(5);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    fetchPeople();
  }, [isTeacherMode, limit]);

  const handleSearchClick = () => {
    setLimit(5);
    fetchPeople();
  };

  const fetchPeople = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('students')
        .select('*', { count: 'exact' })
        .eq('type', isTeacherMode ? 'teacher' : 'student')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (searchQuery.trim()) {
        const val = `%${searchQuery.trim()}%`;
        query = query.or(`name.ilike.${val},id_number.ilike.${val}`);
      }

      const { data, error: err, count } = await query;
      
      if (err) {
        if (err.message.includes('standard_working_hours')) {
          const fallbackQuery = supabase
            .from('students')
            .select('id, name, father_name, photo_url, id_number')
            .eq('type', isTeacherMode ? 'teacher' : 'student')
            .order('created_at', { ascending: false })
            .limit(limit);
          if (searchQuery.trim()) {
            const val = `%${searchQuery.trim()}%`;
            fallbackQuery.or(`name.ilike.${val},id_number.ilike.${val}`);
          }
          const { data: fallbackData, error: fallbackErr, count: fallbackCount } = await fallbackQuery;
          if (fallbackErr) throw fallbackErr;
          setPeople(fallbackData || []);
          setHasMore(fallbackCount ? fallbackCount > limit : false);
        } else {
          throw err;
        }
      } else {
        setPeople(data || []);
        setHasMore(count ? count > limit : false);
      }
    } catch (err) {
      console.error('Error fetching people:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHours = async (id: string, hours: number) => {
    setSaving(id);
    try {
      const { error: err } = await supabase
        .from('students')
        .update({ standard_working_hours: hours })
        .eq('id', id);

      if (err) throw err;
      
      setPeople(prev => prev.map(p => p.id === id ? { ...p, standard_working_hours: hours } : p));
      setSuccess('تغییرات با موفقیت ذخیره شد');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'خطا در ذخیره‌سازی');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-6 flex items-start gap-4">
        <div className="p-3 bg-blue-100 rounded-2xl text-blue-600">
          <Info className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-sm font-black text-slate-800 mb-1">راهنمای ساعت کاری استاندارد</h4>
          <p className="text-xs text-slate-500 font-bold leading-relaxed">
            ساعت کاری تعیین شده در این بخش، به عنوان مبنای محاسبه حضور در روزهایی که فقط «ورود» ثبت شده و «خروج» ثبت نشده است، در نظر گرفته می‌شود.
            به صورت پیش‌فرض این مقدار ۸ ساعت است.
          </p>
        </div>
      </div>

      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder={`جستجوی ${isTeacherMode ? 'معلم' : 'شاگرد'} برای تنظیم ساعت...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
            className="w-full bg-slate-50 border-none rounded-2xl py-4 pr-12 pl-6 text-sm font-bold focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
          />
        </div>
        <button 
          onClick={handleSearchClick}
          className="bg-blue-600 text-white px-8 rounded-2xl text-xs font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
        >
          جستجو
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 grayscale opacity-30">
            <Clock className="w-12 h-12 animate-spin-slow mb-4" />
            <p className="text-xs font-black">در حال بارگذاری لیست...</p>
          </div>
        ) : people.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-sm font-black">موردی یافت نشد.</p>
          </div>
        ) : (
          <>
            {people.map((p) => (
              <div key={p.id} className="bg-white border border-slate-100 p-4 rounded-[2rem] flex items-center justify-between group hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  {p.photo_url ? (
                    <img src={p.photo_url} alt={p.name} className="w-12 h-12 rounded-2xl object-cover shadow-sm" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-lg shadow-sm">
                      {p.name.charAt(0)}
                    </div>
                  )}
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-800">{p.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">{p.id_number || 'بدون کد'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-slate-50 rounded-2xl px-4 py-2 border border-slate-100 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                    <input 
                      type="number"
                      step="0.5"
                      min="1"
                      max="24"
                      defaultValue={p.standard_working_hours || 8}
                      id={`hours-${p.id}`}
                      className="w-12 bg-transparent text-center text-sm font-black text-blue-600 outline-none"
                    />
                    <span className="text-[10px] font-black text-slate-400 mr-2 uppercase">ساعت</span>
                  </div>
                  <button
                    onClick={() => {
                      const el = document.getElementById(`hours-${p.id}`) as HTMLInputElement;
                      handleSaveHours(p.id, parseFloat(el.value));
                    }}
                    disabled={saving === p.id}
                    className={`p-3 rounded-xl transition-all shadow-lg ${
                      saving === p.id 
                      ? 'bg-slate-100 text-slate-400' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100 active:scale-95'
                    }`}
                  >
                    {saving === p.id ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
            
            {hasMore && (
              <button 
                onClick={() => setLimit(prev => prev + 10)}
                className="w-full py-4 mt-4 bg-slate-50 text-slate-500 rounded-2xl text-xs font-black hover:bg-slate-100 transition-all"
              >
                بارگذاری موارد بیشتر...
              </button>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <p className="text-sm font-bold">{success}</p>
          </motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-rose-900 text-white px-8 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-300" />
            <p className="text-sm font-bold">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
