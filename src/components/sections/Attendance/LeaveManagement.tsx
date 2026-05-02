import React, { useState, useEffect } from 'react';
import { Search, User, Calendar as CalendarIcon, CheckCircle2, XCircle, AlertCircle, ChevronLeft, Filter, Plus, Trash2, Home, Map, Edit2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useSystem } from '../../../contexts/SystemContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format, getYear, getMonth, getDate, startOfMonth, endOfMonth, setYear, setMonth, setDate, addDays, isSameDay } from 'date-fns-jalali';

export const LeaveManagement: React.FC = () => {
  const { isTeacherMode } = useSystem();
  const [activeSubTab, setActiveSubTab] = useState<'register' | 'holidays' | 'history'>('register');
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);
  const [limit, setLimit] = useState(5);
  const [hasMore, setHasMore] = useState(true);
  
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

  // History state
  const [history, setHistory] = useState<any[]>([]);
  const [editingLeave, setEditingLeave] = useState<any | null>(null);

  useEffect(() => {
    if (activeSubTab === 'register') {
      fetchPeople();
    } else if (activeSubTab === 'holidays') {
      fetchHolidays();
    } else if (activeSubTab === 'history' && selectedPerson) {
      fetchLeaveHistory();
    }
  }, [isTeacherMode, activeSubTab, viewMonth, viewYear, selectedPerson, limit]);

  const fetchPeople = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('students')
        .select('*', { count: 'exact' })
        .eq('type', isTeacherMode ? 'teacher' : 'student')
        .order('name', { ascending: true })
        .limit(limit);

      if (searchQuery.trim()) {
        const val = `%${searchQuery.trim()}%`;
        query = query.or(`name.ilike.${val},id_number.ilike.${val},father_name.ilike.${val}`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      setPeople(data || []);
      setHasMore(count ? count > limit : false);
    } catch (err) {
      console.error('Error fetching people:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveHistory = async () => {
    if (!selectedPerson) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('absences')
        .select('*')
        .eq('student_id', selectedPerson.id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLeave = async (id: string) => {
    if (!window.confirm('آیا از حذف این مرخصی اطمینان دارید؟')) return;
    try {
      const { error } = await supabase.from('absences').delete().eq('id', id);
      if (error) throw error;
      fetchLeaveHistory();
      setSuccess('مرخصی با موفقیت حذف شد');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting leave:', err);
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

  // Range Selection for leave
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [viewYearRegister, setViewYearRegister] = useState(getYear(now));
  const [viewMonthRegister, setViewMonthRegister] = useState(getMonth(now));

  const handleDateClick = (day: Date) => {
    if (selectedDates.length === 0) {
      setSelectedDates([day]);
    } else if (selectedDates.length === 1) {
      const d1 = selectedDates[0];
      const d2 = day;
      const start = d1 < d2 ? d1 : d2;
      const end = d1 < d2 ? d2 : d1;
      
      const range = [];
      let curr = new Date(start);
      while (curr <= end) {
        range.push(new Date(curr));
        curr = addDays(curr, 1);
      }
      setSelectedDates(range);
    } else {
      setSelectedDates([day]);
    }
  };

  const isInRange = (day: Date) => {
    return selectedDates.some(d => isSameDay(d, day));
  };

  const handleRegisterLeave = async () => {
    if (!selectedPerson || selectedDates.length === 0) return;
    
    setSubmitting(true);
    try {
      const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
      const startDate = sortedDates[0];
      const endDate = sortedDates[sortedDates.length - 1];

      if (editingLeave) {
        const { error } = await supabase
          .from('absences')
          .update({
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            reason: reason
          })
          .eq('id', editingLeave.id);
        if (error) throw error;
        setSuccess('مرخصی با موفقیت ویرایش شد.');
      } else {
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
      }

      setTimeout(() => setSuccess(null), 3000);
      setSelectedPerson(null);
      setEditingLeave(null);
      setReason('');
      setSelectedDates([]);
      fetchLeaveHistory();
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

  const renderRegister = () => {
    let statsDate = new Date();
    statsDate = setYear(statsDate, viewYearRegister);
    statsDate = setMonth(statsDate, viewMonthRegister);
    const start = startOfMonth(statsDate);
    const end = endOfMonth(statsDate);
    
    const days = [];
    let curr = new Date(start);
    while (curr <= end) {
      days.push(new Date(curr));
      curr = addDays(curr, 1);
    }

    return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0">
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder={`جستجوی ${isTeacherMode ? 'معلم' : 'شاگرد'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchPeople()}
              className="w-full bg-slate-50 border-none rounded-2xl py-3.5 pr-11 pl-4 text-sm focus:ring-2 focus:ring-orange-500/10 outline-none transition-all"
            />
          </div>
          <button 
            onClick={() => fetchPeople()} 
            className="px-6 bg-orange-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all"
          >
            جستجو
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {people.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPerson(p)}
              className={`w-full flex items-center gap-4 p-4 rounded-[2rem] transition-all border-2 ${
                selectedPerson?.id === p.id 
                ? 'bg-orange-50 text-orange-900 border-orange-200 shadow-lg'
                : 'hover:bg-slate-50 border-transparent hover:border-slate-100'
              }`}
            >
              <div className="relative">
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md" referrerPolicy="no-referrer" />
                ) : (
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-md ${selectedPerson?.id === p.id ? 'bg-orange-500' : 'bg-slate-200'}`}>
                    {p.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-base font-black">{p.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10px] text-slate-400 font-bold">{p.father_name ? `فرزند ${p.father_name}` : (p.id_number || 'بدون کد')}</p>
                </div>
              </div>
            </button>
          ))}
          {hasMore && (
            <button 
              onClick={() => setLimit(prev => prev + 10)}
              className="w-full py-4 text-xs font-black text-slate-400 hover:text-orange-600 transition-colors"
            >
              بارگذاری بیشتر...
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedPerson ? (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl p-8 flex flex-col overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 rounded-full -mr-16 -mt-16 bg-orange-500" />
            
            <div className="space-y-4 flex flex-col h-full relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center text-2xl font-black text-orange-600">
                    {selectedPerson.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">{selectedPerson.name}</h3>
                    <p className="text-xs text-slate-400 font-bold">انتخاب روزهای مرخصی</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <select value={viewMonthRegister} onChange={e => setViewMonthRegister(parseInt(e.target.value))} className="bg-slate-50 border-none rounded-xl py-2 px-2 text-[10px] font-black outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-orange-500/20">
                    {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                  </select>
                  <select value={viewYearRegister} onChange={e => setViewYearRegister(parseInt(e.target.value))} className="bg-slate-50 border-none rounded-xl py-2 px-2 text-[10px] font-black outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-orange-500/20">
                    {jalaliYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto max-h-64 pr-2 space-y-2 custom-scrollbar">
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {days.map(day => {
                    const isSelected = isInRange(day);
                    const isFriday = day.getDay() === 5;
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => handleDateClick(day)}
                        className={`group flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-all ${
                          isSelected 
                          ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-100' 
                          : isFriday
                            ? 'bg-red-50 border-transparent text-red-400 opacity-50'
                            : 'bg-slate-50 border-transparent text-slate-600 hover:border-slate-200'
                        }`}
                      >
                        <span className="text-[8px] font-black opacity-60 uppercase">{format(day, 'EEEE').substring(0, 3)}</span>
                        <span className="text-sm font-black">{getDate(day)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-50">
                <div className="flex items-center justify-between px-2">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase">تعداد روزها</span>
                      <span className="text-xl font-black text-orange-600">{selectedDates.length} روز</span>
                   </div>
                   {selectedDates.length > 0 && (
                     <div className="text-left">
                        <span className="text-[10px] font-black text-slate-400 uppercase block">بازه مرخصی</span>
                        <span className="text-[10px] font-black text-slate-600">
                          {format(selectedDates.sort((a,b)=>a.getTime()-b.getTime())[0], 'yyyy/MM/dd')}
                          {" تا "}
                          {format(selectedDates.sort((a,b)=>a.getTime()-b.getTime())[selectedDates.length-1], 'yyyy/MM/dd')}
                        </span>
                     </div>
                   )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 text-right block">دلیل یا توضیحات</label>
                  <textarea 
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="دلیل مرخصی را اینجا بنویسید..."
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-medium h-24 focus:ring-2 focus:ring-orange-500/10 outline-none resize-none transition-all"
                  />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => { setSelectedPerson(null); setSelectedDates([]); }} className="flex-1 py-4 rounded-2xl font-black text-sm text-slate-500 hover:bg-slate-50 transition-all">انصراف</button>
                  <button 
                    onClick={handleRegisterLeave} 
                    disabled={submitting || selectedDates.length === 0}
                    className="flex-[2] py-4 bg-orange-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-orange-100 hover:bg-orange-700 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {submitting ? 'در حال ثبت...' : editingLeave ? 'بروزرسانی مرخصی' : 'تایید و ثبت مرخصی'}
                  </button>
                </div>
              </div>
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
  ); };

  const renderHistory = () => (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800">سابقه مرخصی</h3>
            <p className="text-xs text-slate-400 font-bold">{selectedPerson?.name || 'فردی انتخاب نشده است'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Filters could be added here */}
        </div>
      </div>

      {!selectedPerson ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
          <Filter className="w-12 h-12 opacity-10 mb-4" />
          <p className="text-sm font-black">ابتدا یک نفر را از تب ثبت مرخصی انتخاب کنید</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-4 space-y-4">
          {history.length === 0 ? (
            <p className="text-center py-10 text-slate-400 text-sm font-bold">هیچ مرخصی ثبت نشده است.</p>
          ) : (
            history.map(item => (
              <div key={item.id} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between group">
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-white rounded-2xl shadow-sm text-center min-w-[100px]">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">بازه زمانی</p>
                    <p className="text-xs font-black text-slate-700">{format(new Date(item.start_date), 'MM/dd')} تا {format(new Date(item.end_date), 'MM/dd')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-800 mb-1">{item.reason || 'بدون توضیح'}</p>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black rounded-lg">
                        {Math.ceil((new Date(item.end_date).getTime() - new Date(item.start_date).getTime()) / (1000 * 60 * 60 * 24))} روز
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                      setEditingLeave(item);
                      setReason(item.reason || '');
                      const start = new Date(item.start_date);
                      const end = new Date(item.end_date);
                      const range = [];
                      let curr = new Date(start);
                      while (curr <= end) {
                        range.push(new Date(curr));
                        curr = addDays(curr, 1);
                      }
                      setSelectedDates(range);
                      setViewYearRegister(getYear(start));
                      setViewMonthRegister(getMonth(start));
                      setActiveSubTab('register');
                    }} 
                    className="p-3 bg-white text-blue-500 rounded-xl hover:bg-blue-50 transition-colors shadow-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteLeave(item.id)} className="p-3 bg-white text-rose-500 rounded-xl hover:bg-rose-50 transition-colors shadow-sm">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
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
      <div className="bg-slate-100 p-1 rounded-2xl flex max-w-lg mx-auto w-full">
        <button 
          onClick={() => setActiveSubTab('register')}
          className={`flex-1 py-3.5 rounded-xl text-xs font-black transition-all ${activeSubTab === 'register' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          ثبت مرخصی جدید
        </button>
        <button 
          onClick={() => setActiveSubTab('history')}
          className={`flex-1 py-3.5 rounded-xl text-xs font-black transition-all ${activeSubTab === 'history' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          سابقه مرخصی
        </button>
        <button 
          onClick={() => setActiveSubTab('holidays')}
          className={`flex-1 py-3.5 rounded-xl text-xs font-black transition-all ${activeSubTab === 'holidays' ? 'bg-white shadow-sm text-red-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          تعیین روزهای تعطیل
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {activeSubTab === 'register' ? renderRegister() : activeSubTab === 'history' ? renderHistory() : renderHolidays()}
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
