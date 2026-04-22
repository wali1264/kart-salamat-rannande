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
    totalDrivers: 0,
    activeCards: 0,
    expiringSoon: [] as any[]
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { count: driversCount } = await supabase.from('drivers').select('*', { count: 'exact', head: true });
      const { count: cardsCount } = await supabase.from('health_cards').select('*', { count: 'exact', head: true }).eq('status', 'active');
      
      const oneMonthFromNow = new Date();
      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
      
      const { data: expiring } = await supabase
        .from('health_cards')
        .select('*, drivers(*)')
        .eq('status', 'active')
        .lt('expiry_date', oneMonthFromNow.toISOString())
        .limit(3);

      setStats({
        totalDrivers: driversCount || 0,
        activeCards: cardsCount || 0,
        expiringSoon: expiring || []
      });
    };
    fetchStats();
  }, []);

  return (
    <div className="grid grid-cols-12 auto-rows-fr gap-4 lg:gap-6 min-h-[600px]">
      {/* Top Banner - Span 12 in mobile, Span 8 in desktop */}
      <div className="col-span-12 lg:col-span-8 lg:row-span-2 bento-card navy-gradient text-white flex flex-col justify-center relative overflow-hidden group">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-3">خوش آمدید به پنل ANDHP</h2>
          <p className="text-blue-100 text-sm max-w-lg mb-6 leading-relaxed">
            سیستم مدیریت سلامت و استعلام اصالت کارتهای صحی وزارت ترافیک. تمامی آمارها بصورت لحظه‌ای بروزرسانی می‌شوند.
          </p>
          <div className="flex gap-2">
             <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse mt-1"></span>
             <span className="text-xs font-medium text-blue-100/80 uppercase tracking-widest">System Online & Secure</span>
          </div>
        </div>
        <div className="absolute left-0 bottom-0 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-700">
          <ShieldCheck className="w-64 h-64 -mb-16 -ml-16" />
        </div>
      </div>

      {/* Profile/Status Card - Span 12/4 */}
      <div className="col-span-12 sm:col-span-6 lg:col-span-4 lg:row-span-2 bento-card flex flex-col">
        <h3 className="font-bold mb-4 text-xs flex items-center gap-2 text-slate-400 uppercase tracking-widest">
          <UserIcon className="w-4 h-4" /> وضعیت دسترسی
        </h3>
        <div className="flex items-center gap-4 border-b border-slate-100 pb-5 mb-5 mt-auto">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-blue-600 font-bold text-xl border border-slate-200">
            {profile?.name?.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-slate-800">{profile?.name}</div>
            <div className="text-[10px] text-slate-500 font-medium">{profile?.role === 'officer' ? 'مامور ترافیک' : 'داکتر موظف'}</div>
          </div>
        </div>
        <div className="space-y-4">
           <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">حالت حساب:</span>
              <span className="status-chip status-approved">تایید شده</span>
           </div>
           <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">آخرین ورود:</span>
              <span className="font-medium text-slate-700">۱۰ دقیقه پیش</span>
           </div>
        </div>
      </div>

      {/* Stat 1 */}
      <div className="col-span-12 sm:col-span-6 lg:col-span-3 bento-card">
        <span className="text-slate-400 text-[10px] font-bold uppercase mb-2 block tracking-widest">مجموع رانندگان</span>
        <div className="text-4xl font-bold text-slate-800 tracking-tighter">{stats.totalDrivers.toLocaleString('fa-AF')}</div>
        <div className="mt-auto text-emerald-600 text-[10px] font-bold flex items-center gap-1">
          <ArrowUpRight className="w-3 h-3" /> ثبت نام‌های جدید
        </div>
      </div>

      {/* Stat 2 */}
      <div className="col-span-12 sm:col-span-6 lg:col-span-3 bento-card border-l-4 border-l-blue-500">
        <span className="text-slate-400 text-[10px] font-bold uppercase mb-2 block tracking-widest">کارت‌های فعال</span>
        <div className="text-4xl font-bold text-slate-800 tracking-tighter">{stats.activeCards.toLocaleString('fa-AF')}</div>
        <div className="mt-auto text-blue-600 text-[10px] font-bold">تاییدیه صحی معتبر</div>
      </div>

      {/* Expiring Soon Section */}
      <div className="col-span-12 sm:col-span-6 lg:col-span-6 bento-card bg-amber-50/50 border-amber-100 h-full">
        <div className="flex items-center justify-between mb-4">
          <span className="text-amber-700 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
            <Clock className="w-3 h-3" /> نیاز به تمدید (کمتر از ۱ ماه)
          </span>
          <span className="bg-amber-100 px-2 py-0.5 rounded-full text-amber-700 text-[9px] font-bold">{stats.expiringSoon.length} مورد</span>
        </div>
        <div className="space-y-3">
           {stats.expiringSoon.length > 0 ? stats.expiringSoon.map((item: any) => (
             <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-amber-100/50 shadow-sm">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs">
                     {item.drivers?.name?.charAt(0)}
                   </div>
                   <div className="text-xs font-bold text-slate-800">{item.drivers?.name}</div>
                </div>
                <div className="text-[10px] text-amber-600 font-bold">
                   تنها {Math.ceil((new Date(item.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} روز
                </div>
             </div>
           )) : (
             <div className="text-center py-6 text-slate-400 text-xs italic">موردی برای تمدید یافت نشد</div>
           )}
        </div>
      </div>

      {/* Large Chart Container */}
      <div className="col-span-12 lg:col-span-12 lg:row-span-3 bento-card mt-2">
         <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-bold text-slate-800">گزارش فعالیتهای اخیر سیستم</h3>
              <p className="text-xs text-slate-500">مشاهده روند صدور و استعلامات در بازه‌های زمانی مختلف</p>
            </div>
            <div className="flex gap-2">
               <button className="px-3 py-1.5 bg-slate-50 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors">هفتگی</button>
               <button className="px-3 py-1.5 bg-blue-600 rounded-lg text-xs font-bold text-white shadow-lg shadow-blue-100">ماهانه</button>
            </div>
          </div>
          <div className="h-64 sm:h-80 min-h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={250}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dx={-10} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', direction: 'rtl' }}
                />
                <Area type="monotone" dataKey="value" stroke="#1e40af" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
      </div>
    </div>
  );
};

