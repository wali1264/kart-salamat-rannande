import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  User as UserIcon,
  Clock,
  Search,
  X
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useSystem } from '../../contexts/SystemContext';
import { offlineDb } from '../../lib/db';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

const data = [
  { name: 'حمل', value: 400 },
  { name: 'ثور', value: 300 },
  { name: 'جوزا', value: 600 },
  { name: 'سرطان', value: 800 },
  { name: 'اسد', value: 500 },
  { name: 'سنبله', value: 900 },
];

export const DashboardHome: React.FC = () => {
  const { profile } = useAuth();
  const { mode, isTeacherMode } = useSystem();
  const isOnline = useOnlineStatus();
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeCards: 0,
    expiringSoon: [] as any[],
    presentCount: 0,
    absentCount: 0,
    presentList: [] as any[],
    absentList: [] as any[]
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [filter, setFilter] = useState<'today' | 'yesterday' | 'date'>('today');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [modalType, setModalType] = useState<'present' | 'absent' | null>(null);
  const [modalSearch, setModalSearch] = useState('');

  const fetchStats = async () => {
    // Determine filter date boundaries dynamically
    const startDate = new Date();
    const endDate = new Date();

    if (filter === 'today') {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (filter === 'yesterday') {
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
    } else if (filter === 'date' && selectedDate) {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        startDate.setFullYear(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        startDate.setHours(0, 0, 0, 0);
        endDate.setFullYear(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        endDate.setHours(23, 59, 59, 999);
      } else {
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
      }
    }

    if (!isOnline) {
      try {
        const studentCache = await offlineDb.cache.where('collection').equals('students').toArray();
        const filteredStudents = studentCache.map(c => c.data).filter(s => s.type === mode);
        const studentIds = new Set(filteredStudents.map(s => s.id));
        
        const cardCache = await offlineDb.cache.where('collection').equals('health_cards').toArray();
        const activeCards = cardCache.map(c => c.data).filter(c => c.status === 'active' && studentIds.has(c.student_id));

        const oneMonthFromNow = new Date();
        oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
        const expiring = cardCache.map(c => c.data).filter(c => 
          c.status === 'active' && 
          studentIds.has(c.student_id) && 
          new Date(c.expiry_date) < oneMonthFromNow
        ).slice(0, 3).map(c => ({
          ...c,
          students: filteredStudents.find(s => s.id === c.student_id)
        }));

        // Fetch offline attendance logs for date filter
        const attendanceCache = await offlineDb.cache.where('collection').equals('attendance').toArray();
        const dayLogs = attendanceCache
          .map(c => c.data)
          .filter(l => {
            const rDate = new Date(l.recorded_at);
            return rDate >= startDate && rDate <= endDate;
          });

        const presentIds = new Set(dayLogs.map(l => l.student_id));
        const presentList = filteredStudents.filter(p => presentIds.has(p.id));
        const absentList = filteredStudents.filter(p => !presentIds.has(p.id));

        setStats({
          totalStudents: filteredStudents.length,
          activeCards: activeCards.length,
          expiringSoon: expiring,
          presentCount: presentList.length,
          absentCount: absentList.length,
          presentList: presentList,
          absentList: absentList
        });
        return;
      } catch (err) {
        console.warn('Offline stats failed:', err);
      }
    }

    try {
      const { data: onlineStudents, error: pError } = await supabase
        .from('students')
        .select('*')
        .eq('type', mode);

      if (pError) throw pError;
      const filteredStudents = onlineStudents || [];
      const studentIds = new Set(filteredStudents.map(s => s.id));
      
      const { count: cardsCount } = await supabase
        .from('health_cards')
        .select('*, students!inner(id)', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('students.type', mode);
      
      const oneMonthFromNow = new Date();
      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
      
      const { data: expiring } = await supabase
        .from('health_cards')
        .select('*, students!inner(*)')
        .eq('status', 'active')
        .eq('students.type', mode)
        .lt('expiry_date', oneMonthFromNow.toISOString())
        .limit(3);

      const { data: attendanceLogs, error: lError } = await supabase
        .from('attendance')
        .select('*')
        .gte('recorded_at', startDate.toISOString())
        .lte('recorded_at', endDate.toISOString());

      if (lError) throw lError;

      const logs = attendanceLogs || [];
      const relevantLogs = logs.filter(l => studentIds.has(l.student_id));
      const presentIds = new Set(relevantLogs.map(l => l.student_id));

      const presentList = filteredStudents.filter(p => presentIds.has(p.id));
      const absentList = filteredStudents.filter(p => !presentIds.has(p.id));

      setStats({
        totalStudents: filteredStudents.length,
        activeCards: cardsCount || 0,
        expiringSoon: expiring || [],
        presentCount: presentList.length,
        absentCount: absentList.length,
        presentList: presentList,
        absentList: absentList
      });
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  };

  const fetchActivities = async () => {
    setLoadingActivities(true);
    if (!isOnline) {
      try {
        const cached = await offlineDb.cache.where('collection').equals('activity_logs').toArray();
        setActivities(cached.map(c => c.data).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50));
        setLoadingActivities(false);
        return;
      } catch (err) {
        console.warn('Offline activities failed:', err);
      }
    }
    try {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      if (filter === 'today') {
        query = query.gte('created_at', today.toISOString());
      } else if (filter === 'yesterday') {
        query = query
          .gte('created_at', yesterday.toISOString())
          .lt('created_at', today.toISOString());
      } else if (filter === 'date' && selectedDate) {
        const d = new Date(selectedDate);
        d.setHours(0, 0, 0, 0);
        const nextDay = new Date(d);
        nextDay.setDate(nextDay.getDate() + 1);
        query = query.gte('created_at', d.toISOString()).lt('created_at', nextDay.toISOString());
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;
      setActivities(data || []);
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setLoadingActivities(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchActivities();
  }, [filter, selectedDate, mode]);

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'login': return 'ورود به سیستم';
      case 'logout': return 'خروج از سیستم';
      case 'create_student': return isTeacherMode ? 'ثبت معلم جدید' : 'ثبت شاگرد جدید';
      case 'update_student': return isTeacherMode ? 'ویرایش اطلاعات معلم' : 'ویرایش اطلاعات شاگرد';
      case 'delete_student': return isTeacherMode ? 'حذف معلم' : 'حذف شاگرد';
      case 'issue_card': return isTeacherMode ? 'صدور کارت هویت معلم' : 'صدور کارت هویت';
      case 'renew_card': return isTeacherMode ? 'تمدید کارت هویت معلم' : 'تمدید کارت هویت';
      case 'payment': return isTeacherMode ? 'ثبت پرداخت معاش' : 'ثبت پرداخت فیس';
      default: return action;
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('issue') || action === 'login') return 'text-emerald-600 bg-emerald-50';
    if (action.includes('update') || action.includes('renew')) return 'text-amber-600 bg-amber-50';
    if (action.includes('delete')) return 'text-rose-600 bg-rose-50';
    return 'text-blue-600 bg-blue-50';
  };

  const getFilterLabel = () => {
    if (filter === 'today') return 'امروز';
    if (filter === 'yesterday') return 'دیروز';
    if (filter === 'date' && selectedDate) {
      try {
        return new Date(selectedDate).toLocaleDateString('fa-AF', { year: 'numeric', month: 'long', day: 'numeric' });
      } catch {
        return selectedDate;
      }
    }
    return 'امروز';
  };

  const listToDisplay = modalType === 'present' ? stats.presentList : stats.absentList;
  const filteredList = listToDisplay.filter(p => {
    const q = modalSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.student_id_no && p.student_id_no.toLowerCase().includes(q)) ||
      (p.license_number && p.license_number.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {/* 4 Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Total Registered */}
        <div className="bento-card !p-6 bg-white border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{isTeacherMode ? 'مجموع معلمین' : 'مجموع شاگردان'}</span>
            <div className={`w-10 h-10 rounded-xl ${isTeacherMode ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'} flex items-center justify-center`}>
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-black text-slate-800 tracking-tighter mb-2">{stats.totalStudents.toLocaleString('fa-AF')}</div>
          <div className={`${isTeacherMode ? 'text-emerald-600' : 'text-blue-600'} text-[10px] font-bold flex items-center gap-1`}>
            <ArrowUpRight className="w-3 h-3" /> ثبت نام‌های جدید {isTeacherMode ? 'اساتید' : 'شاگردان'}
          </div>
        </div>

        {/* Issued Identity Cards */}
        <div className="bento-card !p-6 bg-white border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{isTeacherMode ? 'کارت‌های صادر شده معلمین' : 'کارت‌های صادر شده'}</span>
            <div className={`w-10 h-10 rounded-xl ${isTeacherMode ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'} flex items-center justify-center`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-black text-slate-800 tracking-tighter mb-2">{stats.activeCards.toLocaleString('fa-AF')}</div>
          <div className="text-blue-600 text-[10px] font-bold">{isTeacherMode ? 'کارت‌های هویت دارای اعتبار معلمان' : 'کارت‌های هویت دارای اعتبار'}</div>
        </div>

        {/* Present Count Card with Popup trigger */}
        <div 
          onClick={() => {
            setModalType('present');
            setModalSearch('');
          }}
          className="bento-card !p-6 bg-white border-l-4 border-l-teal-500 shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99] cursor-pointer transition-all"
        >
          <div className="flex justify-between items-start mb-4">
            <span className="text-slate-450 text-[10px] font-black uppercase tracking-widest text-[#0d9488]">
              {isTeacherMode ? 'معلمان حاضر' : 'شاگردان حاضر'} ({getFilterLabel()})
            </span>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-black text-slate-800 tracking-tighter mb-2">{(stats.presentCount || 0).toLocaleString('fa-AF')}</div>
          <div className="text-teal-600 text-[10px] font-bold flex items-center gap-1">
            برای مشاهده لیست کلیک کنید
          </div>
        </div>

        {/* Absent Count Card with Popup trigger */}
        <div 
          onClick={() => {
            setModalType('absent');
            setModalSearch('');
          }}
          className="bento-card !p-6 bg-white border-l-4 border-l-rose-500 shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99] cursor-pointer transition-all"
        >
          <div className="flex justify-between items-start mb-4">
            <span className="text-slate-450 text-[10px] font-black uppercase tracking-widest text-[#e11d48]">
              {isTeacherMode ? 'معلمان غیرحاضر' : 'شاگردان غیرحاضر'} ({getFilterLabel()})
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-black text-slate-800 tracking-tighter mb-2">{(stats.absentCount || 0).toLocaleString('fa-AF')}</div>
          <div className="text-rose-600 text-[10px] font-bold flex items-center gap-1">
            برای مشاهده لیست کلیک کنید
          </div>
        </div>
      </div>

      {/* Activity Log Section */}
      <div className="bento-card bg-white border border-slate-100 shadow-sm flex flex-col min-h-[500px]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Clock className="w-6 h-6 text-blue-600" /> گزارش فعالیتهای سیستم
            </h3>
            <p className="text-xs text-slate-500 mt-1">شفافیت کامل در عملکرد ادمین‌ها و اپراتورهای سیستم</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
              <button 
                onClick={() => setFilter('today')}
                className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${filter === 'today' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
              >
                امروز
              </button>
              <button 
                onClick={() => setFilter('yesterday')}
                className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${filter === 'yesterday' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
              >
                دیروز
              </button>
              <button 
                onClick={() => setFilter('date')}
                className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${filter === 'date' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
              >
                تاریخ خاص
              </button>
            </div>
            
            {filter === 'date' && (
              <input 
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/10"
              />
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          {loadingActivities ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-[10px] text-slate-400 font-bold">در حال بارگزاری فعالیت‌ها...</p>
            </div>
          ) : activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((log) => (
                <div key={log.id} className="group flex items-start gap-4 p-4 rounded-3xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${getActionColor(log.action)}`}>
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-800 text-sm">{getActionLabel(log.action)}</span>
                        <span className="text-[10px] text-slate-400">•</span>
                        <span className="text-[10px] text-slate-500 font-bold">بوسیله: {log.user_email}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium ltr">{new Date(log.created_at).toLocaleTimeString('fa-AF')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <p className="text-xs text-slate-500 line-clamp-1">{log.details || 'توضیحات بیشتری ثبت نشده است.'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-300 gap-4 opacity-40">
              <TrendingUp className="w-16 h-16" />
              <p className="text-sm font-bold italic">هیچ فعالیتی در این بازه زمانی یافت نشد</p>
            </div>
          )}
        </div>
        
        <div className="mt-8 pt-6 border-t border-dashed border-slate-100 flex justify-center">
           <button className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-6 py-2.5 rounded-2xl transition-all border border-blue-100">
             مشاهده تمام گزارشات
           </button>
        </div>
      </div>

      {/* Attendance List Modal */}
      <AnimatePresence>
        {modalType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalType(null)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.35 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-6 pb-4 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-800">
                    {modalType === 'present' 
                      ? (isTeacherMode ? 'لیست اساتید حاضر' : 'لیست شاگردان حاضر') 
                      : (isTeacherMode ? 'لیست اساتید غیرحاضر' : 'لیست شاگردان غیرحاضر')
                    }
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                    مربوط به بازه زمانی: {getFilterLabel()} • تعداد: {(modalType === 'present' ? stats.presentCount : stats.absentCount).toLocaleString('fa-AF')} نفر
                  </p>
                </div>
                <button 
                  onClick={() => setModalType(null)}
                  className="p-2 rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-6 pb-2">
                <div className="relative">
                  <span className="absolute inset-y-0 right-3.5 flex items-center text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="جستجو بر اساس نام یا نمبر..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all text-right placeholder:text-slate-400"
                  />
                  {modalSearch && (
                    <button 
                      onClick={() => setModalSearch('')} 
                      className="absolute inset-y-0 left-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Modal List Body (Vertical auto-scroll) */}
              <div className="p-6 pt-0 flex-1 overflow-y-auto max-h-[350px] space-y-2 custom-scrollbar">
                {filteredList.length > 0 ? (
                  filteredList.map((person, index) => (
                    <div 
                      key={person.id} 
                      className={`flex items-center justify-between p-3.5 bg-slate-50/50 rounded-2xl border-r-4 ${
                        modalType === 'present' ? 'border-r-teal-500' : 'border-r-rose-400'
                      } hover:bg-slate-50 hover:shadow-xs transition-all`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          modalType === 'present' ? 'bg-teal-50 text-teal-600' : 'bg-rose-50 text-rose-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-800">{person.name}</p>
                          {person.phone && (
                            <p className="text-[9px] text-slate-400 font-bold mt-0.5">{person.phone}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-left">
                        <span className="text-[10px] font-mono font-bold bg-white text-slate-600 border border-slate-100 px-2 py-1 rounded-lg">
                          ID: {person.student_id_no || person.license_number}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-300 gap-3 opacity-60">
                    <UserIcon className="w-12 h-12" />
                    <p className="text-xs font-bold italic">شخصی با این مشخصات یافت نشد</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


