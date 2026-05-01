import React, { useState, useEffect } from 'react';
import { Search, User, Clock, Calendar as CalendarIcon, CheckCircle2, XCircle, AlertCircle, ChevronLeft, Filter } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useSystem } from '../../../contexts/SystemContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format, getYear, getMonth, getDate, startOfMonth, endOfMonth, setYear, setMonth, setDate } from 'date-fns-jalali';

export const ManualAttendance: React.FC = () => {
  const { isTeacherMode } = useSystem();
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'entry' | 'exit' | 'present'>('entry');
  const [customDateTime, setCustomDateTime] = useState(false);
  
  // Jalali Date Parts
  const now = new Date();
  const [jYear, setJYear] = useState(getYear(now));
  const [jMonth, setJMonth] = useState(getMonth(now));
  const [jDay, setJDay] = useState(getDate(now));
  const [manualTime, setManualTime] = useState(now.toTimeString().slice(0, 5));
  
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  
  // Stats filtering
  const [statsMonth, setStatsMonth] = useState(getMonth(now));
  const [statsYear, setStatsYear] = useState(getYear(now));

  // Pagination and Search states
  const [limit, setLimit] = useState(5);
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  // Selected person's attendance history for today (based on selected date)
  const [todayRecords, setTodayRecords] = useState<any[]>([]);

  useEffect(() => {
    fetchPeople(true);
  }, [isTeacherMode, statsMonth, statsYear]);

  // Update today's records when selected person or date changes
  useEffect(() => {
    if (selectedPerson) {
      fetchTodayRecords();
    }
  }, [selectedPerson, jYear, jMonth, jDay, customDateTime]);

  const getTargetDateGregorian = () => {
    if (customDateTime) {
      let gDate = new Date();
      gDate = setYear(gDate, jYear);
      gDate = setMonth(gDate, jMonth);
      gDate = setDate(gDate, jDay);
      return gDate;
    }
    return new Date();
  };

  const fetchTodayRecords = async () => {
    if (!selectedPerson) return;
    
    const targetDate = getTargetDateGregorian();
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', selectedPerson.id)
      .gte('recorded_at', start.toISOString())
      .lte('recorded_at', end.toISOString());

    if (!error && data) {
      setTodayRecords(data);
    }
  };

  const fetchPeople = async (reset = false) => {
    setLoading(true);
    const currentLimit = reset ? 5 : limit + 5;
    if (reset) setLimit(5);
    else setLimit(currentLimit);

    try {
      let query = supabase
        .from('students')
        .select('*', { count: 'exact' })
        .eq('type', isTeacherMode ? 'teacher' : 'student')
        .order('created_at', { ascending: false })
        .range(0, currentLimit - 1);

      if (searchQuery.trim()) {
        const val = `%${searchQuery.trim()}%`;
        query = query.or(`name.ilike.${val},id_number.ilike.${val}`);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      
      // Fetch stats for each person (absences this month)
      const peopleWithStats = await Promise.all((data || []).map(async (p) => {
        let statsDate = new Date();
        statsDate = setYear(statsDate, statsYear);
        statsDate = setMonth(statsDate, statsMonth);
        
        const start = startOfMonth(statsDate);
        const end = endOfMonth(statsDate);

        const { count: attCount } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', p.id)
          .gte('recorded_at', start.toISOString())
          .lte('recorded_at', end.toISOString());

        // Also check if they are present today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { count: todayCount } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', p.id)
          .gte('recorded_at', todayStart.toISOString());
        
        return { 
          ...p, 
          attendanceCount: attCount || 0,
          isPresentToday: (todayCount || 0) > 0
        };
      }));

      setPeople(peopleWithStats);
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
    
    // Logic checks
    const hasEntry = todayRecords.some(r => r.type === 'entry');
    const hasExit = todayRecords.some(r => r.type === 'exit');
    const hasPresent = todayRecords.some(r => r.type === 'present');

    if (actionType === 'entry' && (hasEntry || hasPresent)) {
      setErrorStatus('ورود برای این روز قبلاً ثبت شده است.');
      setTimeout(() => setErrorStatus(null), 3000);
      return;
    }

    if (actionType === 'exit' && (hasExit || hasPresent)) {
      setErrorStatus('خروج برای این روز قبلاً ثبت شده است.');
      setTimeout(() => setErrorStatus(null), 3000);
      return;
    }

    if (actionType === 'exit' && !hasEntry) {
      setErrorStatus('ابتدا باید ورود ثبت شود.');
      setTimeout(() => setErrorStatus(null), 3000);
      return;
    }

    if (actionType === 'present' && (hasEntry || hasExit || hasPresent)) {
      setErrorStatus('وضعیت حضور قبلاً ثبت شده است.');
      setTimeout(() => setErrorStatus(null), 3000);
      return;
    }

    setSubmitting(true);
    setSuccess(null);

    try {
      let timestamp;
      if (customDateTime) {
        const gregorianDate = getTargetDateGregorian();
        const [h, m] = manualTime.split(':');
        gregorianDate.setHours(parseInt(h), parseInt(m), 0, 0);
        timestamp = gregorianDate.toISOString();
      } else {
        timestamp = new Date().toISOString();
      }

      const { error } = await supabase
        .from('attendance')
        .insert([{
          student_id: selectedPerson.id,
          type: actionType,
          recorded_at: timestamp,
          method: 'manual'
        }]);

      if (error) throw error;

      setSuccess(`حضور ${actionType === 'entry' ? 'ورود' : actionType === 'exit' ? 'خروج' : 'حاضری'} برای ${selectedPerson.name} ثبت شد.`);
      setTimeout(() => setSuccess(null), 3000);
      setSelectedPerson(null);
      fetchPeople(true); // Refresh stats
    } catch (err) {
      console.error('Error recording attendance:', err);
      alert('خطا در ثبت حضور و غیاب');
    } finally {
      setSubmitting(false);
    }
  };

  const months = [
    'حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله',
    'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت'
  ];

  const jalaliYears = [1402, 1403, 1404, 1405, 1406];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0">
      {/* List Section */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-50 space-y-4">
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

          <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
            <div className="flex items-center gap-2">
              <Filter className="w-3 h-3" />
              <span>آمار حضور در:</span>
              <select 
                value={statsMonth}
                onChange={(e) => setStatsMonth(parseInt(e.target.value))}
                className="bg-transparent border-none p-0 focus:ring-0 cursor-pointer text-blue-600 font-bold"
              >
                {months.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <select 
                value={statsYear}
                onChange={(e) => setStatsYear(parseInt(e.target.value))}
                className="bg-transparent border-none p-0 focus:ring-0 cursor-pointer text-blue-600 font-bold ml-1"
              >
                {jalaliYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
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
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border-2 ${
                    selectedPerson?.id === p.id 
                      ? (isTeacherMode ? 'bg-emerald-50 text-emerald-900 border-emerald-500/20' : 'bg-blue-50 text-blue-900 border-blue-500/20 shadow-sm')
                      : 'hover:bg-slate-50 text-slate-600 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {p.photo_url ? (
                        <img 
                          src={p.photo_url} 
                          alt={p.name} 
                          className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shadow-sm ${
                          selectedPerson?.id === p.id 
                            ? (isTeacherMode ? 'bg-emerald-500' : 'bg-blue-500') 
                            : 'bg-slate-200'
                        }`}>
                          {p.name.charAt(0)}
                        </div>
                      )}
                      {p.isPresentToday && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black">{p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] opacity-60 font-bold">{p.id_number || 'بدون کد'}</p>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <p className={`text-[10px] font-bold ${p.attendanceCount < 5 ? 'text-rose-500' : 'text-slate-400'}`}>
                          {p.attendanceCount} روز حضور
                        </p>
                      </div>
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
            className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl p-8 flex flex-col justify-between relative overflow-hidden"
          >
            {/* Background Accent */}
            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 rounded-full -mr-16 -mt-16 ${isTeacherMode ? 'bg-emerald-500' : 'bg-blue-500'}`} />

            <div className="relative z-10">
              <div className="flex items-center gap-6 mb-8">
                <div className="relative">
                  {selectedPerson.photo_url ? (
                    <img 
                      src={selectedPerson.photo_url} 
                      alt={selectedPerson.name} 
                      className="w-20 h-20 rounded-[2rem] object-cover shadow-xl border-4 border-white"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center text-3xl text-white font-black shadow-lg ${isTeacherMode ? 'emerald-gradient shadow-emerald-100' : 'navy-gradient shadow-blue-100'}`}>
                      {selectedPerson.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">{selectedPerson.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-tighter">
                      {isTeacherMode ? 'معلم' : 'شاگرد'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">{selectedPerson.id_number}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">نوع وضعیت</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'entry', label: 'ورود', color: 'emerald', icon: <CheckCircle2 className="w-5 h-5" />, active: !todayRecords.some(r => r.type === 'entry' || r.type === 'present') },
                      { id: 'exit', label: 'خروج', color: 'rose', icon: <XCircle className="w-5 h-5" />, active: todayRecords.some(r => r.type === 'entry') && !todayRecords.some(r => r.type === 'exit' || r.type === 'present') },
                      { id: 'present', label: 'حاضر', color: 'blue', icon: <Clock className="w-5 h-5" />, active: todayRecords.length === 0 },
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        onClick={() => setActionType(btn.id as any)}
                        disabled={!btn.active}
                        className={`flex flex-col items-center gap-2 p-4 rounded-3xl border-2 transition-all ${
                          !btn.active ? 'opacity-30 cursor-not-allowed grayscale' : ''
                        } ${
                          actionType === btn.id 
                            ? `border-${btn.color}-500 bg-${btn.color}-50 text-${btn.color}-600 shadow-md`
                            : 'border-slate-100 text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        {btn.icon}
                        <span className="text-xs font-black">{btn.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تنظیم زمان و تاریخ (هجری شمسی)</label>
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
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 px-2">روز</label>
                          <select 
                            value={jDay}
                            onChange={(e) => setJDay(parseInt(e.target.value))}
                            className="w-full bg-slate-50 border-none rounded-xl py-3 px-3 text-xs font-bold outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-blue-500/20"
                          >
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 px-2">ماه</label>
                          <select 
                            value={jMonth}
                            onChange={(e) => setJMonth(parseInt(e.target.value))}
                            className="w-full bg-slate-50 border-none rounded-xl py-3 px-3 text-xs font-bold outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-blue-500/20"
                          >
                            {months.map((m, i) => (
                              <option key={m} value={i}>{m}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 px-2">سال</label>
                          <select 
                            value={jYear}
                            onChange={(e) => setJYear(parseInt(e.target.value))}
                            className="w-full bg-slate-50 border-none rounded-xl py-3 px-3 text-xs font-bold outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-blue-500/20"
                          >
                            {jalaliYears.map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 px-2 block">ساعت و دقیقه</label>
                        <div className="relative">
                          <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="time"
                            value={manualTime}
                            onChange={(e) => setManualTime(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-xl py-3 pr-10 pl-3 text-xs font-bold outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {!customDateTime && (
                    <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-bold text-slate-600">ثبت در تاریخ امروز</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-black text-blue-600 tracking-wider">
                          {format(new Date(), 'dd MMMM yyyy')}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1" dir="ltr">
                          {format(new Date(), 'HH:mm:ss')}
                        </span>
                      </div>
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

      {/* Notifications */}
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
        {errorStatus && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-rose-900/90 backdrop-blur-xl text-white px-8 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3 border border-rose-500/20"
          >
            <AlertCircle className="w-5 h-5 text-rose-300" />
            <p className="text-sm font-bold">{errorStatus}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
