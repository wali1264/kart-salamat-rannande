import React, { useState, useEffect } from 'react';
import { Search, User, Clock, Calendar as CalendarIcon, CheckCircle2, XCircle, AlertCircle, ChevronLeft, Filter } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useSystem } from '../../../contexts/SystemContext';
import { motion, AnimatePresence } from 'framer-motion';

export const ManualAttendance: React.FC = () => {
  const { isTeacherMode } = useSystem();
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'entry' | 'exit' | 'present'>('entry');
  const [customDateTime, setCustomDateTime] = useState(false);
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualTime, setManualTime] = useState(new Date().toTimeString().slice(0, 5));
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Pagination and Search states
  const [limit, setLimit] = useState(5);
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchPeople(true);
  }, [isTeacherMode]);

  const fetchPeople = async (reset = false) => {
    setLoading(true);
    const currentLimit = reset ? 5 : limit + 5;
    if (reset) setLimit(5);
    else setLimit(currentLimit);

    try {
      let query = supabase
        .from('students')
        .select('*', { count: 'exact' })
        .eq('is_teacher', isTeacherMode)
        .order('name', { ascending: true })
        .range(0, currentLimit - 1);

      if (searchQuery.trim()) {
        const val = `%${searchQuery.trim()}%`;
        query = query.or(`name.ilike.${val},national_id.ilike.${val}`);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      setPeople(data || []);
      setHasMore(count ? (data?.length || 0) < count : false);
    } catch (err) {
      console.error('Error fetching people:', err);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    fetchPeople(true);
  };

  const loadMore = () => {
    fetchPeople(false);
  };

  const handleSubmit = async () => {
    if (!selectedPerson) return;
    setSubmitting(true);
    setSuccess(null);

    try {
      const timestamp = customDateTime 
        ? `${manualDate}T${manualTime}:00` 
        : new Date().toISOString();

      const { error } = await supabase
        .from('attendance')
        .insert([{
          student_id: selectedPerson.id,
          type: actionType,
          recorded_at: timestamp,
          is_manual: true,
          is_teacher: isTeacherMode
        }]);

      if (error) throw error;

      setSuccess(`حضور ${actionType === 'entry' ? 'ورود' : actionType === 'exit' ? 'خروج' : 'حاضری نهایی'} برای ${selectedPerson.name} ثبت شد.`);
      setTimeout(() => setSuccess(null), 3000);
      setSelectedPerson(null);
    } catch (err) {
      console.error('Error recording attendance:', err);
      alert('خطا در ثبت حضور و غیاب');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0">
      {/* List Section */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder={`جستجوی ${isTeacherMode ? 'معلم' : 'شاگرد'}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-2xl py-3.5 pr-11 pl-4 text-sm focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
              />
            </div>
            <button 
              type="submit"
              disabled={isSearching}
              className="bg-slate-900 text-white px-6 rounded-2xl text-xs font-black hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              {isSearching ? '...' : 'جستجو'}
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading && people.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-xs font-bold">در حال بارگذاری لیست...</p>
            </div>
          ) : people.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-300">
              <AlertCircle className="w-12 h-12 opacity-20" />
              <p className="text-sm font-bold">موردی یافت نشد</p>
            </div>
          ) : (
            <>
              {people.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPerson(p)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
                    selectedPerson?.id === p.id 
                      ? (isTeacherMode ? 'bg-emerald-50 text-emerald-900 border border-emerald-100' : 'bg-blue-50 text-blue-900 border border-blue-100')
                      : 'hover:bg-slate-50 text-slate-600 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold ${
                      selectedPerson?.id === p.id 
                        ? (isTeacherMode ? 'bg-emerald-500' : 'bg-blue-500') 
                        : 'bg-slate-200'
                    }`}>
                      {p.name.charAt(0)}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black">{p.name}</p>
                      <p className="text-[10px] opacity-60 font-bold">{p.national_id || 'بدون کد شناسایی'}</p>
                    </div>
                  </div>
                  <ChevronLeft className={`w-4 h-4 opacity-30 ${selectedPerson?.id === p.id ? 'translate-x-1' : ''} transition-transform`} />
                </button>
              ))}
              
              {hasMore && (
                <button 
                  onClick={loadMore}
                  disabled={loading}
                  className="w-full py-4 text-[10px] font-black text-blue-600 hover:bg-blue-50 rounded-2xl transition-all uppercase tracking-widest"
                >
                  {loading ? 'در حال بارگذاری...' : 'نمایش بیشتر +'}
                </button>
              )}
            </>
          )}
        </div>
      </div>


      {/* Action Section */}
      <AnimatePresence mode="wait">
        {selectedPerson ? (
          <motion.div 
            key="action"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl p-8 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-6 mb-8">
                <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center text-3xl text-white font-black shadow-lg ${isTeacherMode ? 'emerald-gradient shadow-emerald-100' : 'navy-gradient shadow-blue-100'}`}>
                  {selectedPerson.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">{selectedPerson.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-tighter">
                      {isTeacherMode ? 'معلم' : 'شاگرد'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">{selectedPerson.national_id}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">نوع وضعیت</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'entry', label: 'ورود', color: 'emerald' },
                      { id: 'exit', label: 'خروج', color: 'rose' },
                      { id: 'present', label: 'حاضر', color: 'blue' },
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        onClick={() => setActionType(btn.id as any)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-3xl border-2 transition-all ${
                          actionType === btn.id 
                            ? `border-${btn.color}-500 bg-${btn.color}-50 text-${btn.color}-600 shadow-md`
                            : 'border-slate-100 text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        {btn.id === 'entry' ? <CheckCircle2 className="w-5 h-5" /> : btn.id === 'exit' ? <XCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                        <span className="text-xs font-black">{btn.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تنظیم زمان و تاریخ</label>
                    <button 
                      onClick={() => setCustomDateTime(!customDateTime)}
                      className={`text-[10px] font-black px-3 py-1 rounded-full transition-all ${customDateTime ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-500'}`}
                    >
                      {customDateTime ? 'تنظیم خودکار' : 'تنظیم دستی'}
                    </button>
                  </div>

                  {customDateTime && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div className="relative">
                        <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="date"
                          value={manualDate}
                          onChange={(e) => setManualDate(e.target.value)}
                          className="w-full bg-slate-50 border-none rounded-xl py-3 pr-10 pl-3 text-xs font-bold focus:ring-2 focus:ring-orange-500/10 outline-none"
                        />
                      </div>
                      <div className="relative">
                        <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="time"
                          value={manualTime}
                          onChange={(e) => setManualTime(e.target.value)}
                          className="w-full bg-slate-50 border-none rounded-xl py-3 pr-10 pl-3 text-xs font-bold focus:ring-2 focus:ring-orange-500/10 outline-none"
                        />
                      </div>
                    </motion.div>
                  )}

                  {!customDateTime && (
                    <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-bold text-slate-600">زمان فعلی سیستم ثبت خواهد شد</span>
                      </div>
                      <span className="text-xs font-black text-blue-600 tracking-wider" dir="ltr">
                        {new Date().toLocaleTimeString('fa-AF', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setSelectedPerson(null)}
                className="flex-1 py-4 rounded-2xl font-black text-sm text-slate-500 hover:bg-slate-50 transition-all border border-slate-100"
              >
                انصراف
              </button>
              <button 
                onClick={handleSubmit}
                disabled={submitting}
                className={`flex-[2] py-4 rounded-2xl font-black text-sm text-white shadow-xl transition-all shadow-blue-200 active:scale-95 disabled:opacity-50 ${isTeacherMode ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {submitting ? 'در حال ثبت...' : 'تایید و ثبت وضعیت'}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="hidden lg:flex flex-col items-center justify-center bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-slate-300"
          >
            <div className="w-20 h-20 rounded-[2rem] bg-white border border-slate-100 flex items-center justify-center mb-6 shadow-sm">
              <User className="w-8 h-8 opacity-20" />
            </div>
            <p className="text-sm font-black mb-1">شخصی را انتخاب کنید</p>
            <p className="text-[10px] font-bold">لیست سمت راست را برای انتخاب {isTeacherMode ? 'معلم' : 'شاگرد'} بررسی کنید</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Notification overlay */}
      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3 border border-white/10"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <p className="text-sm font-bold">{success}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
