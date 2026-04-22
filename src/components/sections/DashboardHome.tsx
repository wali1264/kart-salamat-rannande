import React from 'react';
import { 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  User as UserIcon
} from 'lucide-react';
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
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-blue-600 font-bold text-xl border border-slate-200">A</div>
          <div>
            <div className="font-bold text-slate-800">احمد ضیا کریمی</div>
            <div className="text-[10px] text-slate-500 font-medium">افسر ارشد ترافیک - کابل</div>
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
        <div className="text-4xl font-bold text-slate-800 tracking-tighter">۱۲,۸۴۰</div>
        <div className="mt-auto text-emerald-600 text-[10px] font-bold flex items-center gap-1">
          <ArrowUpRight className="w-3 h-3" /> +۱۲٪ رشد ماهانه
        </div>
      </div>

      {/* Stat 2 */}
      <div className="col-span-12 sm:col-span-6 lg:col-span-3 bento-card">
        <span className="text-slate-400 text-[10px] font-bold uppercase mb-2 block tracking-widest">کارت‌های فعال</span>
        <div className="text-4xl font-bold text-slate-800 tracking-tighter">۱۰,۵۰۰</div>
        <div className="mt-auto text-blue-600 text-[10px] font-bold">۸۴٪ از کل رانندگان</div>
      </div>

      {/* Stat 3 */}
      <div className="col-span-12 sm:col-span-6 lg:col-span-3 bento-card">
        <span className="text-slate-400 text-[10px] font-bold uppercase mb-2 block tracking-widest">تخلفات شناسایی شده</span>
        <div className="text-4xl font-bold text-rose-600 tracking-tighter">۲۳۸</div>
        <div className="mt-auto text-slate-400 text-[10px] font-bold uppercase">گزارش ۳۰ روز گذشته</div>
      </div>

      {/* Stat 4 */}
      <div className="col-span-12 sm:col-span-6 lg:col-span-3 bento-card">
        <span className="text-slate-400 text-[10px] font-bold uppercase mb-2 block tracking-widest">تاییدیه‌های پزشک</span>
        <div className="text-4xl font-bold text-slate-800 tracking-tighter">۸,۴۲۰</div>
        <div className="mt-auto text-emerald-600 text-[10px] font-bold flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> روند صعودی
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
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
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

