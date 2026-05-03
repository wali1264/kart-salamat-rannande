import React, { useState, useEffect } from 'react';
import { Search, User, Clock, Calendar as CalendarIcon, CheckCircle2, XCircle, AlertCircle, ChevronLeft, Filter, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useSystem } from '../../../contexts/SystemContext';
import { useSync } from '../../../contexts/SyncContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format, getYear, getMonth, getDate, startOfMonth, endOfMonth, setYear, setMonth, setDate } from 'date-fns-jalali';

export const ManualAttendance: React.FC = () => {
  const { isTeacherMode } = useSystem();
  const { performAction, isOnline } = useSync();
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

  const [todayRecords, setTodayRecords] = useState<any[]>([]);
  const [fetchingToday, setFetchingToday] = useState(false);

  useEffect(() => {
    fetchPeople(true);
  }, [isTeacherMode, statsMonth, statsYear]);

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
    setFetchingToday(true);

    if (!isOnline) {
      try {
        const cached = await offlineDb.cache.where('collection').equals('attendance').toArray();
        const targetDate = getTargetDateGregorian();
        const start = new Date(targetDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(targetDate);
        end.setHours(23, 59, 59, 999);

        const filtered = cached
          .map(c => c.data)
          .filter(a => 
            a.student_id === selectedPerson.id && 
            new Date(a.recorded_at) >= start && 
            new Date(a.recorded_at) <= end
          )
          .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());

        setTodayRecords(filtered);
        setFetchingToday(false);
        return;
      } catch (err) {
        console.warn('Offline today records fetch failed:', err);
      }
    }

    try {
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
        .lte('recorded_at', end.toISOString())
        .order('recorded_at', { ascending: false });

      if (error) throw error;
      setTodayRecords(data || []);
    } catch (err) {
      console.error('Error fetching today records:', err);
    } finally {
      setFetchingToday(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm('آیا از حذف این رکورد اطمینان دارید؟')) return;
    try {
      const { error, queued } = await performAction(
        'attendance',
        'delete',
        { id },
        () => supabase.from('attendance').delete().eq('id', id)
      );
      if (error) throw error;
      setSuccess(queued ? 'درخواست حذف در صف قرار گرفت' : 'رکورد با موفقیت حذف شد');
      setTimeout(() => setSuccess(null), 3000);
      fetchTodayRecords();
      fetchPeople(true);
    } catch (err) {
      console.error('Error deleting record:', err);
    }
  };

  const fetchPeople = async (reset = false) => {
    setLoading(true);
    const currentLimit = reset ? 5 : limit + 5;
    if (reset) setLimit(5);
    else setLimit(currentLimit);

    if (!isOnline) {
      try {
        const cached = await offlineDb.cache.where('collection').equals('students').toArray();
        let filtered = cached.map(c => c.data).filter(s => s.type === (isTeacherMode ? 'teacher' : 'student'));
        
        if (searchQuery.trim()) {
          const val = searchQuery.trim().toLowerCase();
          filtered = filtered.filter(s => s.name?.toLowerCase().includes(val) || s.id_number?.toLowerCase().includes(val));
        }

        // Sort by created_at descending
        filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

        const hasMoreData = filtered.length > currentLimit;
        const pageData = filtered.slice(0, currentLimit);

        const results = await Promise.all(pageData.map(async (p) => {
          // Approximate stats from cache for offline
          const attendance = await offlineDb.cache.where('collection').equals('attendance').toArray();
          const studentAttendance = attendance.map(a => a.data).filter(a => a.student_id === p.id);
          
          return {
            ...p,
            attendanceCount: studentAttendance.length,
            totalHours: 0,
            isPresentToday: studentAttendance.some(a => new Date(a.recorded_at) >= new Date(new Date().setHours(0,0,0,0)))
          };
        }));

        setPeople(results);
        setHasMore(hasMoreData);
        setLoading(false);
        return;
      } catch (err) {
        console.warn('Offline fetch failed:', err);
      }
    }

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
      
      // Fetch stats for each person (unique presence days, working/attendance hours, absences and holidays this month)
      const peopleWithStats = await Promise.all((data || []).map(async (p) => {
        let statsDate = new Date();
        statsDate = setYear(statsDate, statsYear);
        statsDate = setMonth(statsDate, statsMonth);
        
        const start = startOfMonth(statsDate);
        const end = endOfMonth(statsDate);

        // Fetch Attendance
        const { data: monthRecords } = await supabase
          .from('attendance')
          .select('recorded_at, type')
          .eq('student_id', p.id)
          .gte('recorded_at', start.toISOString())
          .lte('recorded_at', end.toISOString());

        // Fetch Absences (Leave)
        const { data: absenceRecords } = await supabase
          .from('absences')
          .select('start_date, end_date')
          .eq('student_id', p.id)
          .or(`start_date.lte.${end.toISOString().split('T')[0]},end_date.gte.${start.toISOString().split('T')[0]}`);

        // Fetch Holidays
        const { data: holidayRecords } = await supabase
          .from('holidays')
          .select('date')
          .gte('date', start.toISOString().split('T')[0])
          .lte('date', end.toISOString().split('T')[0]);

        // Process Attendance records for statistics
        const dailyRecords: Record<string, { entry?: Date; exit?: Date }> = {};
        (monthRecords || []).forEach(r => {
          const d = new Date(r.recorded_at);
          const dateStr = format(d, 'yyyy-MM-dd');
          if (!dailyRecords[dateStr]) dailyRecords[dateStr] = {};
          if (r.type === 'entry') {
            if (!dailyRecords[dateStr].entry || d < dailyRecords[dateStr].entry) dailyRecords[dateStr].entry = d;
          } else if (r.type === 'exit') {
            if (!dailyRecords[dateStr].exit || d > dailyRecords[dateStr].exit) dailyRecords[dateStr].exit = d;
          }
        });

        const uniqueDays = Object.keys(dailyRecords).length;
        let totalHours = 0;
        let netBalanceHours = 0;

        Object.values(dailyRecords).forEach(day => {
          const standard = (p.standard_working_hours || 8);
          if (day.entry && day.exit) {
            const duration = (day.exit.getTime() - day.entry.getTime()) / (1000 * 60 * 60);
            totalHours += duration;
            netBalanceHours += (duration - standard);
          } else if (day.entry) {
            // Using standard hours for entry-only records
            totalHours += standard;
            // Balance is 0 if we assume they worked standard hours
          }
        });

        // Process Leave (Absences)
        const absenceDays = new Set<string>();
        (absenceRecords || []).forEach(abs => {
          let s = new Date(abs.start_date);
          let e = new Date(abs.end_date);
          let curr = new Date(s);
          while (curr <= e) { // Inclusive of end_date
            if (curr >= start && curr <= end) {
              absenceDays.add(format(curr, 'yyyy-MM-dd'));
            }
            curr.setDate(curr.getDate() + 1);
          }
        });

        // Process Holidays (Fridays + manual holidays)
        const holidaysCount = new Set<string>();
        (holidayRecords || []).forEach(h => holidaysCount.add(h.date));
        let currDay = new Date(start);
        const dayNames: string[] = []; // Not needed but keeping structure
        while (currDay <= end) {
          if (currDay.getDay() === 5) { // Friday
            holidaysCount.add(format(currDay, 'yyyy-MM-dd'));
          }
          currDay.setDate(currDay.getDate() + 1);
        }

        // Calculate actual absences (Days that are NOT holidays, NOT leave, and have NO attendance records)
        let totalAbsenceCount = 0;
        let checkDay = new Date(start);
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        while (checkDay <= end) {
          // Only count absences up to today
          if (checkDay > today) break;

          const dateStr = format(checkDay, 'yyyy-MM-dd');
          const isHoliday = holidaysCount.has(dateStr);
          const isLeave = absenceDays.has(dateStr);
          const isPresent = !!dailyRecords[dateStr];

          if (!isHoliday && !isLeave && !isPresent) {
            totalAbsenceCount++;
          }
          checkDay.setDate(checkDay.getDate() + 1);
        }

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
          attendanceCount: uniqueDays,
          leaveCount: absenceDays.size,
          holidaysCount: holidaysCount.size,
          absenceCount: totalAbsenceCount,
          totalHours: Math.round(totalHours * 10) / 10,
          netBalance: Math.round(netBalanceHours * 10) / 10,
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
    const hasArrival = todayRecords.some(r => r.type === 'entry' || r.type === 'present');
    const hasExit = todayRecords.some(r => r.type === 'exit');

    if ((actionType === 'entry' || actionType === 'present') && hasArrival) {
      setErrorStatus('وضعیت حضور (ورود/حاضری) قبلاً برای این روز ثبت شده است.');
      setTimeout(() => setErrorStatus(null), 3000);
      return;
    }

    if (actionType === 'exit' && hasExit) {
      setErrorStatus('خروج برای این روز قبلاً ثبت شده است.');
      setTimeout(() => setErrorStatus(null), 3000);
      return;
    }

    if (actionType === 'exit' && !hasArrival) {
      setErrorStatus('ابتدا باید ورود یا حاضری ثبت شود.');
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

      const record = {
        student_id: selectedPerson.id,
        type: actionType === 'present' ? 'entry' : actionType,
        recorded_at: timestamp,
        method: 'manual'
      };

      const { error, queued } = await performAction(
        'attendance',
        'insert',
        record,
        () => supabase.from('attendance').insert([record])
      );

      if (error) throw error;

      setSuccess(queued 
        ? `حضور در صف انتظار ذخیره شد. پس از اتصال همگام می‌شود.` 
        : `حضور ${actionType === 'entry' ? 'ورود' : actionType === 'exit' ? 'خروج' : 'حاضری'} برای ${selectedPerson.name} ثبت شد.`);
      
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

  const jalaliYears = [1405, 1406, 1407, 1408, 1409, 1410];

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
                  className={`w-full flex items-center justify-between p-6 rounded-[2.5rem] transition-all border-2 ${
                    selectedPerson?.id === p.id 
                      ? (isTeacherMode ? 'bg-emerald-50 text-emerald-900 border-emerald-500/20 shadow-xl scale-[1.02]' : 'bg-blue-50 text-blue-900 border-blue-500/20 shadow-xl scale-[1.02]')
                      : 'hover:bg-slate-50 text-slate-600 border-transparent hover:border-slate-100 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-6 flex-1">
                    <div className="relative">
                      {p.photo_url ? (
                        <img 
                          src={p.photo_url} 
                          alt={p.name} 
                          className="w-20 h-20 rounded-3xl object-cover border-4 border-white shadow-lg"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-3xl text-white font-black shadow-lg ${
                          selectedPerson?.id === p.id 
                            ? (isTeacherMode ? 'bg-emerald-500' : 'bg-blue-500') 
                            : 'bg-slate-200'
                        }`}>
                          {p.name.charAt(0)}
                        </div>
                      )}
                      {p.isPresentToday && (
                        <div className="absolute -top-2 -right-2 w-7 h-7 bg-emerald-500 border-4 border-white rounded-full shadow-md flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-1">
                      <p className="text-xl font-black tracking-tight text-slate-800 mb-2">{p.name}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black px-3 py-1 rounded-lg bg-white shadow-sm text-slate-400 border border-slate-100">
                          {p.id_number || '---'}
                        </span>
                        <div className="flex items-center gap-2.5 mr-auto flex-wrap justify-end no-print">
                          <div className={`flex flex-col items-center px-4 py-2 rounded-2xl border-2 ${p.attendanceCount > 0 ? 'bg-blue-50 border-blue-100/50' : 'bg-slate-50 border-transparent'}`}>
                            <span className="text-[10px] font-black text-slate-400 uppercase mb-1">حضور</span>
                            <span className="text-lg font-black text-blue-600 whitespace-nowrap">{p.attendanceCount} <span className="text-xs">روز</span></span>
                          </div>
                          <div className={`flex flex-col items-center px-4 py-2 rounded-2xl border-2 ${p.totalHours > 0 ? 'bg-orange-50 border-orange-100/50' : 'bg-slate-50 border-transparent'}`}>
                            <span className="text-[10px] font-black text-slate-400 uppercase mb-1">{isTeacherMode ? 'کاری' : 'حضور'}</span>
                            <span className="text-lg font-black text-orange-600 whitespace-nowrap">{p.totalHours} <span className="text-xs">ساعت</span></span>
                          </div>
                          <div className={`flex flex-col items-center px-4 py-2 rounded-2xl border-2 ${p.leaveCount > 0 ? 'bg-amber-50 border-amber-100/50' : 'bg-slate-50 border-transparent'}`}>
                            <span className="text-[10px] font-black text-slate-400 uppercase mb-1">مرخصی</span>
                            <span className="text-lg font-black text-amber-600 whitespace-nowrap">{p.leaveCount} <span className="text-xs">روز</span></span>
                          </div>
                          <div className={`flex flex-col items-center px-4 py-2 rounded-2xl border-2 ${p.holidaysCount > 0 ? 'bg-red-50 border-red-100/50' : 'bg-slate-50 border-transparent'}`}>
                            <span className="text-[10px] font-black text-slate-400 uppercase mb-1">تعطیل</span>
                            <span className="text-lg font-black text-red-600 whitespace-nowrap">{p.holidaysCount} <span className="text-xs">روز</span></span>
                          </div>
                          {p.absenceCount > 0 && (
                            <div className="flex flex-col items-center px-4 py-2 rounded-2xl border-2 bg-rose-50 border-rose-200/50">
                              <span className="text-[10px] font-black text-slate-400 uppercase mb-1">غیبت</span>
                              <span className="text-lg font-black text-rose-600 whitespace-nowrap">{p.absenceCount} <span className="text-xs">روز</span></span>
                            </div>
                          )}
                          {p.netBalance > 0 && (
                            <div className="flex flex-col items-center px-4 py-2 rounded-2xl border-2 bg-emerald-50 border-emerald-100/50">
                              <span className="text-[10px] font-black text-slate-400 uppercase mb-1">اضافه کاری</span>
                              <span className="text-lg font-black text-emerald-600 whitespace-nowrap">{p.netBalance} <span className="text-xs">ساعت</span></span>
                            </div>
                          )}
                          {p.netBalance < 0 && (
                            <div className="flex flex-col items-center px-4 py-2 rounded-2xl border-2 bg-rose-50 border-rose-100/50">
                              <span className="text-[10px] font-black text-slate-400 uppercase mb-1">کم کاری</span>
                              <span className="text-lg font-black text-rose-600 whitespace-nowrap">{Math.abs(p.netBalance)} <span className="text-xs">ساعت</span></span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
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
                      { 
                        id: 'entry', 
                        label: 'ورود', 
                        color: 'emerald', 
                        icon: <CheckCircle2 className="w-5 h-5" />, 
                        active: !todayRecords.some(r => r.type === 'entry' || r.type === 'present') 
                      },
                      { 
                        id: 'exit', 
                        label: 'خروج', 
                        color: 'rose', 
                        icon: <XCircle className="w-5 h-5" />, 
                        active: todayRecords.some(r => r.type === 'entry' || r.type === 'present') && !todayRecords.some(r => r.type === 'exit') 
                      },
                      { 
                        id: 'present', 
                        label: 'حاضر', 
                        color: 'blue', 
                        icon: <Clock className="w-5 h-5" />, 
                        active: !todayRecords.some(r => r.type === 'entry' || r.type === 'present') 
                      },
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

                  {/* Today's History Section */}
                  <div className="mt-8 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">سوابق ثبت شده امروز</h4>
                      {fetchingToday && <div className="w-3 h-3 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />}
                    </div>
                    
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {todayRecords.length === 0 ? (
                        <div className="py-4 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                          <p className="text-[10px] font-bold text-slate-300">هیچ ترددی برای امروز ثبت نشده است.</p>
                        </div>
                      ) : (
                        todayRecords.map((rec) => (
                          <div key={rec.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                rec.type === 'entry' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                              }`}>
                                {rec.type === 'entry' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-700 capitalize">{rec.type === 'entry' ? 'ورود' : 'خروج'}</p>
                                <p className="text-[8px] font-bold text-slate-400" dir="ltr">{format(new Date(rec.recorded_at), 'HH:mm:ss')}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleDeleteRecord(rec.id)}
                              className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
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
