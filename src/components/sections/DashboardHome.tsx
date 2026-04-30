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
  Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
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
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeCards: 0,
    expiringSoon: [] as any[]
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [filter, setFilter] = useState<'today' | 'yesterday' | 'date'>('today');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchStats = async () => {
    const { count: studentsCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
    const { count: cardsCount } = await supabase.from('health_cards').select('*', { count: 'exact', head: true }).eq('status', 'active');
    
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    
    const { data: expiring } = await supabase
      .from('health_cards')
      .select('*, students(*)')
      .eq('status', 'active')
      .lt('expiry_date', oneMonthFromNow.toISOString())
      .limit(3);

    setStats({
      totalStudents: studentsCount || 0,
      activeCards: cardsCount || 0,
      expiringSoon: expiring || []
    });
  };

  const fetchActivities = async () => {
    setLoadingActivities(true);
    try {
      let query = supabase
        .from('activity_logs')
        .select('*, profiles(name, email)')
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
  }, [filter, selectedDate]);

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'login': return 'ورود به سیستم';
      case 'logout': return 'خروج از سیستم';
      case 'create_student': return 'ثبت شاگرد جدید';
      case 'update_student': return 'ویرایش اطلاعات شاگرد';
      case 'delete_student': return 'حذف شاگرد';
      case 'issue_card': return 'صدور کارت هویت';
      case 'renew_card': return 'تمدید کارت هویت';
      case 'payment': return 'ثبت پرداخت مالی';
      default: return action;
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('issue') || action === 'login') return 'text-emerald-600 bg-emerald-50';
    if (action.includes('update') || action.includes('renew')) return 'text-amber-600 bg-amber-50';
    if (action.includes('delete')) return 'text-rose-600 bg-rose-50';
    return 'text-blue-600 bg-blue-50';
  };

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {/* 3 Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <div className="bento-card !p-8 bg-white border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">مجموع شاگردان</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-5xl font-black text-slate-800 tracking-tighter mb-2">{stats.totalStudents.toLocaleString('fa-AF')}</div>
          <div className="text-emerald-600 text-[10px] font-bold flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> ثبت نام‌های جدید در سیستم
          </div>
        </div>

        <div className="bento-card !p-8 bg-white border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">کارت‌های صادر شده</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-5xl font-black text-slate-800 tracking-tighter mb-2">{stats.activeCards.toLocaleString('fa-AF')}</div>
          <div className="text-blue-600 text-[10px] font-bold">کارت‌های هویت دارای اعتبار</div>
        </div>

        <div className="bento-card !p-8 bg-amber-50/30 border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow border-amber-100">
          <div className="flex justify-between items-start mb-4">
            <span className="text-amber-700 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
              <Clock className="w-3 h-3" /> نیاز به تمدید
            </span>
            <div className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold tracking-tighter">
              {stats.expiringSoon.length.toLocaleString('fa-AF')} مورد
            </div>
          </div>
          <div className="space-y-2 mt-4">
            {stats.expiringSoon.length > 0 ? stats.expiringSoon.slice(0, 2).map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-white/60 rounded-xl border border-amber-100/50">
                <div className="flex items-center gap-2">
                   <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-[8px]">
                     {item.students?.name?.charAt(0)}
                   </div>
                   <div className="text-[10px] font-bold text-slate-800">{item.students?.name}</div>
                </div>
                <div className="text-[9px] text-amber-600 font-bold">
                   {Math.ceil((new Date(item.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} روز
                </div>
              </div>
            )) : (
              <div className="text-center py-4 text-slate-400 text-[10px] italic">موردی برای تمدید یافت نشد</div>
            )}
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
                        <span className="text-[10px] text-slate-500 font-bold">بوسیله: {log.profiles?.name || 'کاربر سیستم'}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium ltr">{new Date(log.created_at).toLocaleTimeString('fa-AF')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <p className="text-xs text-slate-500 line-clamp-1">{log.details?.description || 'توضیحات بیشتری برای این فعالیت ثبت نشده است.'}</p>
                       <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded-lg text-[8px] font-black">{log.profiles?.email}</span>
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
    </div>
  );
};


