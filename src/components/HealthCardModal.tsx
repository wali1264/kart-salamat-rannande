import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, CheckCircle, AlertTriangle, Calculator, Eye, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Driver } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  driver: Driver | null;
  isRenewal?: boolean;
}

export const HealthCardModal: React.FC<Props> = ({ isOpen, onClose, driver, isRenewal = false }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [data, setData] = useState({
    is_sober: true,
    blood_pressure: '12/8',
    vision_status: 'سالم',
    notes: '',
    validity_period: '12', // Store as months (default 12)
  });

  if (!isOpen || !driver) return null;

  const handleIssue = async () => {
    setLoading(true);
    try {
      const issueDate = new Date();
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + parseInt(data.validity_period));

      const { error } = await supabase
        .from('health_cards')
        .insert({
          driver_id: driver.id, // Keeping table column name driver_id for compatibility, but it points to student now
          issuer_id: profile?.id,
          issue_date: issueDate.toISOString(),
          expiry_date: expiryDate.toISOString(),
          status: 'active',
          is_sober: data.is_sober,
          blood_pressure: data.blood_pressure,
          vision_status: data.vision_status,
          notes: data.notes
        });

      if (error) throw error;
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2500);
    } catch (err) {
      console.error(err);
      alert('خطا در صدور کارت');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
          dir="rtl"
        >
          {success ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">
                {isRenewal ? 'کارت با موفقیت تمدید شد' : 'کارت با موفقیت صادر شد'}
              </h3>
              <p className="text-slate-500">
                کارت شاگرد {driver.name} {isRenewal ? 'تمدید' : 'فعال'} و آماده چاپ است.
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full max-h-[90vh]">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    {isRenewal ? 'تمدید اعتبار کارت هویت' : 'صدور کارت هویت شاگرد'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">شاگرد: {driver.name}</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex items-center gap-2 text-blue-600">
                      <Activity className="w-4 h-4" />
                      <span className="text-xs font-bold">فشار خون</span>
                    </div>
                    <input 
                      type="text" 
                      value={data.blood_pressure}
                      onChange={(e) => setData({...data, blood_pressure: e.target.value})}
                      className="w-full bg-transparent border-none p-0 focus:ring-0 text-slate-800 font-bold"
                    />
                  </div>
                  
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex items-center gap-2 text-indigo-600">
                      <Eye className="w-4 h-4" />
                      <span className="text-xs font-bold">وضعیت بینایی</span>
                    </div>
                    <input 
                      type="text" 
                      value={data.vision_status}
                      onChange={(e) => setData({...data, vision_status: e.target.value})}
                      className="w-full bg-transparent border-none p-0 focus:ring-0 text-slate-800 font-bold"
                    />
                  </div>
                </div>

                <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-blue-600" />
                    <div>
                      <h4 className="text-sm font-bold text-blue-900">وضعیت انضباطی شاگرد</h4>
                      <p className="text-[10px] text-blue-700">تایید رعایت قوانین و مقررات مکتب</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setData({...data, is_sober: !data.is_sober})}
                    className={`w-12 h-6 rounded-full transition-colors relative ${data.is_sober ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${data.is_sober ? 'right-7' : 'right-1'}`} />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 mr-2">یادداشت‌های اضافی</label>
                  <textarea 
                    rows={3}
                    value={data.notes}
                    onChange={(e) => setData({...data, notes: e.target.value})}
                    placeholder="هرگونه مورد خاصی که باید ذکر شود..."
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 mr-2">مدت اعتبار کارت</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setData({...data, validity_period: '6'})}
                      className={`py-3 rounded-2xl text-xs font-bold border transition-all ${data.validity_period === '6' ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-slate-50 text-slate-600 border-slate-100 opacity-60'}`}
                    >
                      شش ماه (۶ ماه)
                    </button>
                    <button 
                      onClick={() => setData({...data, validity_period: '12'})}
                      className={`py-3 rounded-2xl text-xs font-bold border transition-all ${data.validity_period === '12' ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-slate-50 text-slate-600 border-slate-100 opacity-60'}`}
                    >
                      یک سال (۱۲ ماه)
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    با کلیک بر روی دکمه تایید، صحت اطلاعات و وضعیت شاگرد مذکور را تایید می‌نماید. این کارت به مدت {data.validity_period === '12' ? 'یک سال' : 'شش ماه'} معتبر خواهد بود.
                  </p>
                </div>
              </div>

              <div className="p-8 border-t border-slate-100">
                <button 
                  onClick={handleIssue}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (isRenewal ? 'در حال تمدید...' : 'در حال صدور...') : (isRenewal ? 'تایید و تمدید کارت هویت' : 'تایید و صدور کارت هویت')}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
