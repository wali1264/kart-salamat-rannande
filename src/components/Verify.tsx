import React, { useEffect, useState } from 'react';
import { ShieldCheck, User, CreditCard, Calendar, Activity, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';

export const Verify: React.FC<{ cardId: string }> = ({ cardId }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: card, error: cardError } = await supabase
          .from('health_cards')
          .select('*, students(*)')
          .eq('id', cardId)
          .single();

        if (cardError) throw cardError;
        setData(card);
      } catch (err: any) {
        setError('کارت یافت نشد یا معتبر نیست');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [cardId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
           <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-rose-500" />
           </div>
           <h2 className="text-xl font-bold text-slate-800 mb-2">خطا در تایید اصالت</h2>
           <p className="text-slate-500 text-sm mb-8">{error || 'اطلاعات در سامانه یافت نشد'}</p>
           <div className="p-4 bg-slate-50 rounded-2xl text-[10px] text-slate-400 font-mono">ID: {cardId}</div>
        </div>
      </div>
    );
  }

  const isExpired = new Date(data.expiry_date) < new Date();
  const driver = data.students;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col items-center justify-center" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full"
      >
        {/* Header Badge */}
        <div className="flex items-center justify-center mb-8">
           <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center">
                 <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                 <h1 className="text-xs font-bold text-slate-800">سامانه مدیریت مکتب و هویت شاگردان</h1>
                 <p className="text-[10px] text-slate-500">امارت اسلامی افغانستان</p>
              </div>
           </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
          {/* Validity Banner */}
          <div className={`p-4 text-center text-white font-bold text-sm tracking-wide ${isExpired ? 'bg-rose-500' : 'bg-emerald-500'}`}>
             {isExpired ? 'کارت منقضی شده است (Expired)' : 'کارت معتبر و اصلی است (Verified)'}
          </div>

          <div className="p-8">
             <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
                <div className="w-32 h-40 bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden shadow-inner flex items-center justify-center bg-cover bg-center" 
                     style={{ backgroundImage: driver.photo_url ? `url(${driver.photo_url})` : 'none' }}>
                   {!driver.photo_url && <User className="w-16 h-16 text-slate-200" />}
                </div>
                
                <div className="flex-1 space-y-4 w-full">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                         <p className="text-[10px] text-slate-400 font-bold uppercase">نوم / نام</p>
                         <p className="font-bold text-slate-800">{driver.name}</p>
                      </div>
                      <div className="space-y-1 text-left md:text-right">
                         <p className="text-[10px] text-slate-400 font-bold uppercase">د پلار نوم / نام پدر</p>
                         <p className="font-bold text-slate-800">{driver.father_name || '---'}</p>
                      </div>
                      <div className="space-y-1">
                         <p className="text-[10px] text-slate-400 font-bold uppercase">نمبر اساس</p>
                         <p className="font-bold text-slate-800 font-mono tracking-wider">{driver.student_id_no || driver.license_number}</p>
                      </div>
                      <div className="space-y-1 text-left md:text-right">
                         <p className="text-[10px] text-slate-400 font-bold uppercase">صنف</p>
                         <p className="font-bold text-slate-800">{driver.class_name || driver.vehicle_type}</p>
                      </div>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                   <Activity className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                   <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase">گروه خون</p>
                   <p className="text-sm font-bold text-slate-800">{driver.blood_type || 'نامعلوم'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                   <Calendar className="w-5 h-5 text-indigo-600 mx-auto mb-2" />
                   <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase">تاریخ انقضای کارت</p>
                   <p className="text-sm font-bold text-slate-800">{new Date(data.expiry_date).toLocaleDateString('fa-AF')}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                   <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-2" />
                   <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase">وضعیت انضباطی</p>
                   <p className="text-sm font-bold text-emerald-600">تایید شده</p>
                </div>
             </div>

             <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-blue-800/80 leading-relaxed">
                   این اطلاعات مستقیماً از سامانه مدیریت هویت شاگردان مکتب استخراج شده و نشان‌دهنده اصالت فیزیکی کارت می‌باشد. هرگونه تغییر فیزیکی در کارت بدون تایید سامانه، باطل است.
                </p>
             </div>
          </div>
          
          <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
             <p className="text-[9px] text-slate-400 font-mono tracking-widest uppercase mb-1">Authenticity ID Reference</p>
             <p className="text-[10px] text-slate-500 font-bold font-mono">{data.id}</p>
          </div>
        </div>

        <div className="mt-8 text-center">
           <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-loose">
              ID Management System v1.5 • National Student Database<br/>
              KABUL, AFGHANISTAN
           </p>
        </div>
      </motion.div>
    </div>
  );
};
