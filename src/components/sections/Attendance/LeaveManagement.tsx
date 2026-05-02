import React, { useState, useEffect } from 'react';
import { Search, User, Calendar as CalendarIcon, CheckCircle2, XCircle, AlertCircle, ChevronLeft, Filter, Plus, Trash2, Home, Map } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useSystem } from '../../../contexts/SystemContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format, getYear, getMonth, getDate, startOfMonth, endOfMonth, setYear, setMonth, setDate, addDays, isSameDay } from 'date-fns-jalali';

export const LeaveManagement: React.FC = () => {
  const { isTeacherMode } = useSystem();
  const [activeSubTab, setActiveSubTab] = useState<'register' | 'holidays'>('register');
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);
  
  // Date states for leave
  const now = new Date();
  const [startJYear, setStartJYear] = useState(getYear(now));
  const [startJMonth, setStartJMonth] = useState(getMonth(now));
  const [startJDay, setStartJDay] = useState(getDate(now));
  
  const [endJYear, setEndJYear] = useState(getYear(now));
  const [endJMonth, setEndJMonth] = useState(getMonth(now));
  const [endJDay, setEndJDay] = useState(getDate(now));
  
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // Holidays state
  const [holidays, setHolidays] = useState<any[]>([]);
  const [viewMonth, setViewMonth] = useState(getMonth(now));
  const [viewYear, setViewYear] = useState(getYear(now));

  useEffect(() => {
    if (activeSubTab === 'register') {
      fetchPeople(true);
    } else {
      fetchHolidays();
    }
  }, [isTeacherMode, activeSubTab, viewMonth, viewYear]);

  const fetchPeople = async (reset = false) => {
    setLoading(true);
    try {
      let query = supabase
        .from('students')
        .select('*', { count: 'exact' })
        .eq('type', isTeacherMode ? 'teacher' : 'student')
        .order('name', { ascending: true })
        .limit(5);

      if (searchQuery.trim()) {
        const val = `%${searchQuery.trim()}%`;
        query = query.or(`name.ilike.${val},id_number.ilike.${val}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPeople(data || []);
    } catch (err) {
      console.error('Error fetching people:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      let statsDate = new Date();
      statsDate = setYear(statsDate, viewYear);
      statsDate = setMonth(statsDate, viewMonth);
      const start = startOfMonth(statsDate);
      const end = endOfMonth(statsDate);

      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .gte('date', start.toISOString().split('T')[0])
        .lte('date', end.toISOString().split('T')[0]);

      if (error) throw error;
      setHolidays(data || []);
    } catch (err) {
      console.error('Error fetching holidays:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterLeave = async () => {
    if (!selectedPerson) return;
    
    setSubmitting(true);
    try {
      let startDate = new Date();
      startDate = setYear(startDate, startJYear);
      startDate = setMonth(startDate, startJMonth);
      startDate = setDate(startDate, startJDay);
      startDate.setHours(0,0,0,0);

      let endDate = new Date();
      endDate = setYear(endDate, endJYear);
      endDate = setMonth(endDate, endJMonth);
      endDate = setDate(endDate, endJDay);
      endDate.setHours(23,59,59,999);

      if (endDate < startDate) {
        throw new Error('تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.');
      }

      const { error } = await supabase
        .from('absences')
        .insert([{
          student_id: selectedPerson.id,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          reason: reason
        }]);

      if (error) throw error;

      setSuccess(`مرخصی برای ${selectedPerson.name} با موفقیت ثبت شد.`);
      setTimeout(() => setSuccess(null), 3000);
      setSelectedPerson(null);
      setReason('');
    } catch (err: any) {
      setErrorStatus(err.message || 'خطا در ثبت مرخصی');
      setTimeout(() => setErrorStatus(null), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleHoliday = async (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const existing = holidays.find(h => h.date === dateStr);

    try {
      if (existing) {
        const { error } = await supabase
          .from('holidays')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('holidays')
          .insert([{ date: dateStr, title: 'تعطیل عمومی' }]);
        if (error) throw error;
      }
      fetchHolidays();
    } catch (err) {
      console.error('Error toggling holiday:', err);
    }
  };

  const months = [
    'حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله',
    'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت'
  ];
  const jalaliYears = [1405, 1406, 1407, 1408, 1409, 1410];

  const renderRegister = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0">
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder={`جستجوی ${isTeacherMode ? 'معلم' : 'شاگرد'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchPeople(true)}
              className="w-full bg-slate-50 border-none rounded-2xl py-3.5 pr-11 pl-4 text-sm focus:ring-2 focus:ring-orange-500/10 outline-none transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {people.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPerson(p)}
              className={`w-full flex items-center gap-4 p-4 rounded-[1.5rem] transition-all border-2 ${
                selectedPerson?.id === p.id 
                ? 'bg-orange-50 text-orange-900 border-orange-200 shadow-sm'
                : 'hover:bg-slate-50 border-transparent'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-black shadow-sm ${selectedPerson?.id === p.id ? 'bg-orange-500' : 'bg-slate-200'}`}>
                {p.name.charAt(0)}
              </div>
              <div className="text-right">
                <p className="text-sm font-black">{p.name}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">{p.id_number || 'بدون کد'}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedPerson ? (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl p-8 flex flex-col justify-between overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 rounded-full -mr-16 -mt-16 bg-orange-500" />
            
            <div className="space-y-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center text-2xl font-black text-orange-600">
                  {selectedPerson.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">{selectedPerson.name}</h3>
                  <p className="text-xs text-slate-400 font-bold">ثبت مرخصی</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">تاریخ شروع</label>
                  <div className="flex gap-1">
                    <select value={startJDay} onChange={e => setStartJDay(parseInt(e.target.value))} className="flex-1 bg-slate-50 rounded-xl py-2 px-1 text-xs font-bold outline-none ring-1 ring-slate-100">
                      {Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={startJMonth} onChange={e => setStartJMonth(parseInt(e.target.value))} className="flex-[2] bg-slate-50 rounded-xl py-2 px-1 text-xs font-bold outline-none ring-1 ring-slate-100">
                      {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">تاریخ پایان</label>
                  <div className="flex gap-1">
                    <select value={endJDay} onChange={e => setEndJDay(parseInt(e.target.value))} className="flex-1 bg-slate-50 rounded-xl py-2 px-1 text-xs font-bold outline-none ring-1 ring-slate-100">
                      {Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={endJMonth} onChange={e => setEndJMonth(parseInt(e.target.value))} className="flex-[2] bg-slate-50 rounded-xl py-2 px-1 text-xs font-bold outline-none ring-1 ring-slate-100">
                      {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 text-right block">دلیل یا توضیحات</label>
                <textarea 
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="دلیل مرخصی را اینجا بنویسید..."
                  className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-medium h-32 focus:ring-2 focus:ring-orange-500/10 outline-none resize-none transition-all"
                />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50 flex gap-3">
              <button onClick={() => setSelectedPerson(null)} className="flex-1 py-4 rounded-2xl font-black text-sm text-slate-500 hover:bg-slate-50 transition-all">انصراف</button>
              <button 
                onClick={handleRegisterLeave} 
                className="flex-[2] py-4 bg-orange-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-orange-100 hover:bg-orange-700 transition-all active:scale-95"
              >
                تایید و ثبت مرخصی
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="hidden lg:flex flex-col items-center justify-center bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-slate-300">
            <User className="w-12 h-12 opacity-10 mb-4" />
            <p className="text-sm font-black">شاگرد یا معلم را انتخاب کنید</p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderHolidays = () => {
    let statsDate = new Date();
    statsDate = setYear(statsDate, viewYear);
    statsDate = setMonth(statsDate, viewMonth);
    const start = startOfMonth(statsDate);
    const end = endOfMonth(statsDate);
    
    const days = [];
    let curr = new Date(start);
    while (curr <= end) {
      days.push(new Date(curr));
      curr = addDays(curr, 1);
    }

    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 h-full flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-50 rounded-2xl text-red-600">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">تعیین روزهای تعطیل</h3>
              <p className="text-xs text-slate-400 font-bold">روزهای مورد نظر را علامت بزنید</p>
            </div>
          </div>
          <div className="flex gap-2">
            <select value={viewMonth} onChange={e => setViewMonth(parseInt(e.target.value))} className="bg-slate-50 border-none rounded-xl py-2 px-4 text-xs font-black outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-red-500/20">
              {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select value={viewYear} onChange={e => setViewYear(parseInt(e.target.value))} className="bg-slate-50 border-none rounded-xl py-2 px-4 text-xs font-black outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-red-500/20">
              {jalaliYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {days.map(day => {
              const dateStr = day.toISOString().split('T')[0];
              const isFriday = day.getDay() === 5;
              const isHoliday = holidays.some(h => h.date === dateStr) || isFriday;
              
              return (
                <button
                  key={dateStr}
                  onClick={() => !isFriday && toggleHoliday(day)}
                  disabled={isFriday}
                  className={`flex flex-col p-4 rounded-3xl border-2 transition-all group ${
                    isHoliday 
                    ? 'bg-red-50 border-red-200 text-red-900' 
                    : 'bg-slate-50 border-transparent text-slate-500 hover:border-slate-200'
                  } ${isFriday ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <span className="text-[10px] font-black opacity-50 uppercase tracking-widest">{format(day, 'EEEE')}</span>
                  <span className="text-2xl font-black my-1">{getDate(day)}</span>
                  <div className="flex items-center gap-1 mt-auto">
                    {isHoliday ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3 opacity-20" />}
                    <span className="text-[8px] font-black uppercase">{isHoliday ? (isFriday ? 'جمعه' : 'تعطیل است') : 'روز کاری'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 h-full min-h-0">
      <div className="bg-slate-100 p-1 rounded-2xl flex max-w-md mx-auto w-full">
        <button 
          onClick={() => setActiveSubTab('register')}
          className={`flex-1 py-3.5 rounded-xl text-xs font-black transition-all ${activeSubTab === 'register' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          ثبت مرخصی جدید
        </button>
        <button 
          onClick={() => setActiveSubTab('holidays')}
          className={`flex-1 py-3.5 rounded-xl text-xs font-black transition-all ${activeSubTab === 'holidays' ? 'bg-white shadow-sm text-red-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          تعیین روزهای تعطیل
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {activeSubTab === 'register' ? renderRegister() : renderHolidays()}
      </div>

      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <p className="text-sm font-bold">{success}</p>
          </motion.div>
        )}
        {errorStatus && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-rose-900 text-white px-8 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-300" />
            <p className="text-sm font-bold">{errorStatus}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
