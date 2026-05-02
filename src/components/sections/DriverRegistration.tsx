import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, CreditCard, Hash, Phone, Upload, CheckCircle, AlertCircle, DollarSign, Fingerprint, WifiOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { compressImage } from '../../lib/utils';
import { logActivity } from '../../lib/logger';
import { useAuth } from '../../contexts/AuthContext';
import { useSystem } from '../../contexts/SystemContext';

interface Props {
  onComplete: () => void;
}

import { useScanner } from '../../hooks/useScanner';
import { useSync } from '../../contexts/SyncContext';

export const DriverRegistration: React.FC<Props> = ({ onComplete }) => {
  const { user } = useAuth();
  const { mode, isTeacherMode } = useSystem();
  const { isOnline, performAction } = useSync();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    father_name: '',
    license_plate: '', // Repurposed for Class/Grade Section
    license_number: '', // Repurposed for Roll Number
    phone: '',
    id_number: '',
    vehicle_type: '', // Repurposed for Grade/Level
    blood_type: 'نامعلوم',
    total_monthly_fee: '1500', // Default fee
  });
  const [photo, setPhoto] = useState<string | null>(null);
  const [fingerprints, setFingerprints] = useState<string[]>([]);
  const [activeFingerIndex, setActiveFingerIndex] = useState<number | null>(null);

  // Real scanner input listener for registration
  useScanner((code) => {
    if (activeFingerIndex !== null) {
      const newFingerprints = [...fingerprints];
      newFingerprints[activeFingerIndex] = code;
      setFingerprints(newFingerprints);
      setActiveFingerIndex(null);
      
      // Optional: Add a small feedback sound or vibration if supported
      if (navigator.vibrate) navigator.vibrate(50);
    }
  }, activeFingerIndex !== null);

  // Fetch dynamic categories from localStorage
  const [categories, setCategories] = useState<string[]>([]);

  React.useEffect(() => {
    const fetchCats = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('student_categories')
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .single();
      
      const cats = data?.student_categories || [
        'آمادگی', 'صنف اول', 'صنف دوم', 'صنف سوم', 'صنف چهارم', 
        'صنف پنجم', 'صنف ششم', 'صنف هفتم', 'صنف هشتم', 
        'صنف نهم', 'صنف دهم', 'صنف یازدهم', 'صنف دوازدهم'
      ];
      setCategories(cats);
      if (cats.length > 0) {
        setFormData(prev => ({ ...prev, vehicle_type: cats[0] }));
      }
    };
    fetchCats();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImage(file);
      setPhoto(compressed);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Map form data to the correct database columns in the 'students' table
      const studentData = {
        name: formData.name,
        father_name: formData.father_name,
        phone: formData.phone,
        id_number: formData.id_number,
        blood_type: formData.blood_type,
        photo_url: photo || '',
        total_monthly_fee: parseFloat(formData.total_monthly_fee),
        fingerprints: fingerprints.filter(f => f),
        type: mode,
        // Use new specialized columns if they exist, or fallback to repurposed ones
        class_name: formData.vehicle_type, // Grade
        student_id_no: formData.license_number, // Roll Number
        license_plate: formData.license_plate, // Section/Group
        vehicle_type: formData.vehicle_type, // Maintain legacy field compatibility
        license_number: formData.license_number // Maintain legacy field compatibility
      };

      const { error: insertError, queued: isQueued } = await performAction(
        'students',
        'insert',
        studentData,
        () => supabase.from('students').insert([studentData])
      );

      if (insertError) throw insertError;
      if (isQueued) setQueued(true);

      // Log activity
      if (user?.email) {
        await performAction(
          'activity_logs',
          'insert',
          {
            email: user.email,
            action: 'create_student',
            details: `${isTeacherMode ? 'معلم' : 'شاگرد'} جدید به نام ${formData.name} ثبت گردید.`,
            metadata: { student_id_no: formData.license_number },
            created_at: new Date().toISOString()
          },
          () => logActivity(user.email!, 'create_student', `${isTeacherMode ? 'معلم' : 'شاگرد'} جدید به نام ${formData.name} ثبت گردید.`, { student_id_no: formData.license_number })
        );
      }

      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'خطایی در ثبت اطلاعات رخ داد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="mb-2">
        <h2 className="text-2xl font-bold text-slate-800">{isTeacherMode ? 'ثبت معلم جدید' : 'ثبت شاگرد جدید'}</h2>
        <p className="text-slate-500 text-sm">{isTeacherMode ? 'مشخصات معلم را طبق اسناد رسمی وارد نمایید.' : 'مشخصات شاگرد را طبق اسناد رسمی وارد نمایید.'}</p>
      </div>

      {!isOnline && (
        <div className="bento-card bg-amber-50 border-amber-100 flex items-center gap-4 mb-6 transition-all animate-pulse">
          <div className="w-12 h-12 bg-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-100 shrink-0">
            <WifiOff className="w-6 h-6 text-white" />
          </div>
          <div className="text-right">
            <h4 className="font-black text-amber-900 text-sm">حالت آفلاین (ذخیره‌سازی هوشمند)</h4>
            <p className="text-amber-700/70 text-xs">شما می‌توانید به کار خود ادامه دهید. اطلاعات در حافظه مرورگر ذخیره شده و پس از وصل شدن اینترنت، به صورت خودکار به سرور ارسال خواهند شد.</p>
          </div>
        </div>
      )}

      {success ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bento-card bg-emerald-50 border-emerald-100 flex flex-col items-center py-16 text-center"
        >
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-100">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-emerald-900 mb-2">
            {queued ? 'در صف انتظار ذخیره شد' : 'ثبت موفقیت‌آمیز!'}
          </h3>
          <p className="text-emerald-700/80 text-sm">
            {queued 
              ? 'اطلاعات در حافظه مرورگر ذخیره شد و با اولین اتصال ارسال می‌شود.' 
              : 'اطلاعات شاگرد در سامانه مکتب ذخیره شد.'}
          </p>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-6">
          <fieldset className="col-span-12 grid grid-cols-12 gap-6 p-0 m-0 border-0 min-w-0">
            <label className="col-span-12 lg:col-span-4 bento-card flex flex-col items-center justify-center gap-4 bg-slate-50 border-dashed border-2 group transition-colors py-12 relative overflow-hidden cursor-pointer hover:border-blue-300">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handlePhotoUpload}
                className="hidden" 
              />
            {photo ? (
              <div className="absolute inset-0">
                <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Upload className="w-8 h-8 text-white" />
                </div>
              </div>
            ) : (
              <>
                <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-slate-300 group-hover:text-blue-500" />
                </div>
                <div className="text-center">
                  <h4 className="font-bold text-slate-700 text-sm">{isTeacherMode ? 'تصویر معلم' : 'تصویر شاگرد'}</h4>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase">کلیک کنید یا عکس را بکشید (MAX 10MB)</p>
                </div>
              </>
            )}
          </label>

          <div className="col-span-12 lg:col-span-8 bento-card space-y-6 text-right">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">نوم / نام</label>
                  <div className="relative">
                    <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 opacity-50" />
                    <input 
                      type="text" 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder={isTeacherMode ? "استاد محمد علی" : "احمد ولی"}
                      className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 pr-11 pl-4 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none border transition-all text-right"
                    />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">د پلار نوم / نام پدر</label>
                  <div className="relative">
                    <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 opacity-50" />
                    <input 
                      type="text" 
                      required
                      value={formData.father_name}
                      onChange={(e) => setFormData({...formData, father_name: e.target.value})}
                      placeholder={isTeacherMode ? "محمد علی (پدر استاد)" : "محمد علی"}
                      className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 pr-11 pl-4 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none border transition-all text-right"
                    />
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">نمبر تذکره</label>
                  <div className="relative">
                    <Hash className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      required
                      value={formData.id_number}
                      onChange={(e) => setFormData({...formData, id_number: e.target.value})}
                      placeholder="۱۰۰-XXXXXX"
                      className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 pr-11 pl-4 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none border transition-all text-right"
                    />
                  </div>
               </div>
            </div>
          </div>

          {/* Fingerprint Section */}
          <div className="col-span-12 bento-card bg-slate-50/50 border-slate-100 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100">
                  <Fingerprint className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-sm">{isTeacherMode ? 'ثبت اثر انگشت استاد' : 'ثبت اثر انگشت شاگرد'} (اختیاری)</h4>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{isTeacherMode ? 'ثبت اطلاعات بیومتریک برای سیستم حضور و غیاب اساتید' : 'ثبت اطلاعات بیومتریک برای سیستم شناسایی هوشمند (روزنامچه)'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-emerald-600 font-black tracking-tighter">سیستم آماده دریافت داده از اسکنر می‌باشد</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setActiveFingerIndex(num - 1)}
                  className={`flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all relative group ${
                    activeFingerIndex === num - 1
                      ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-inner'
                      : fingerprints[num - 1]
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                  }`}
                >
                  <Fingerprint className={`w-10 h-10 mb-2 transition-transform group-hover:scale-110 ${fingerprints[num - 1] ? 'text-emerald-500' : ''}`} />
                  <span className="text-[10px] font-black">انگشت {num}</span>
                  {fingerprints[num - 1] && (
                    <div className="absolute top-2 left-2 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                  )}
                  {activeFingerIndex === num - 1 && (
                     <div className="mt-2 text-[8px] font-black animate-bounce">منتظر دستگاه...</div>
                  )}
                </button>
              ))}
            </div>
            {activeFingerIndex !== null && (
              <div className="bg-blue-600 text-white p-4 rounded-2xl flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold">دستگاه آماده است. لطفاً انگشت مورد نظر را روی اسکنر قرار دهید...</span>
                </div>
                <button 
                   onClick={(e) => {
                     e.preventDefault();
                     setActiveFingerIndex(null);
                   }}
                   className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-[10px] font-black"
                >
                  انصراف
                </button>
              </div>
            )}
          </div>

          <div className="col-span-12 lg:col-span-12 bento-card">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="space-y-2 text-right">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">{isTeacherMode ? 'شماره تماس' : 'شماره تماس والدین'}</label>
                  <div className="relative">
                    <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="tel" 
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="۰۷XXXXXXXX"
                      className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 pr-11 pl-4 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none border transition-all text-right"
                    />
                  </div>
               </div>

               <div className="space-y-2 text-right">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">{isTeacherMode ? 'کد شناسایی (Employee ID)' : 'نمبر اساس (Roll Number)'}</label>
                  <div className="relative">
                    <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      required
                      value={formData.license_number}
                      onChange={(e) => setFormData({...formData, license_number: e.target.value})}
                      placeholder={isTeacherMode ? "T-XXXX" : "SN-XXXX"}
                      className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 pr-11 pl-4 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none border transition-all text-right"
                    />
                  </div>
               </div>

               <div className="space-y-2 text-right">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">{isTeacherMode ? 'رتبه / بست' : 'صنف / صنف تحصیلی'}</label>
                  <select 
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({...formData, vehicle_type: e.target.value})}
                    className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none border transition-all text-right"
                    dir="rtl"
                  >
                    {categories.map(grade => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
               </div>

               <div className="space-y-2 text-right">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">گروه خون</label>
                  <select 
                    value={formData.blood_type}
                    onChange={(e) => setFormData({...formData, blood_type: e.target.value})}
                    className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none border transition-all text-right"
                    dir="rtl"
                  >
                    {['نامعلوم', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
               </div>

               <div className="space-y-2 text-right">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">{isTeacherMode ? 'دیپارتمنت / بخش (Department)' : 'بخش / شعبه (Section)'}</label>
                  <div className="relative">
                    <Hash className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      required
                      value={formData.license_plate}
                      onChange={(e) => setFormData({...formData, license_plate: e.target.value})}
                      placeholder={isTeacherMode ? "مثلا ساینس / ادبیات" : "بخش الف / ب"}
                      className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 pr-11 pl-4 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none border transition-all text-right"
                    />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">{isTeacherMode ? 'حقوق ماهانه (افغانی)' : 'فیس ماهانه (افغانی)'}</label>
                  <div className="relative">
                    <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="number" 
                      required
                      value={formData.total_monthly_fee}
                      onChange={(e) => setFormData({...formData, total_monthly_fee: e.target.value})}
                      placeholder="مثلا ۱۵۰۰"
                      className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 pr-11 pl-4 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none border transition-all font-bold"
                    />
                  </div>
               </div>
            </div>

            <div className="mt-8 flex items-center justify-between gap-4 border-t border-slate-100 pt-8">
               {error && (
                 <div className="flex items-center gap-2 text-rose-500 text-xs font-bold">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                 </div>
               )}
               <button 
                  type="submit" 
                  disabled={loading}
                  className="bg-blue-900 hover:bg-blue-950 text-white font-bold py-4 px-12 rounded-xl shadow-xl shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 mr-auto"
                >
                  {loading ? 'در حال ثبت...' : isTeacherMode ? 'ثبت معلم جدید +' : 'ثبت شاگرد جدید +'}
                </button>
            </div>
          </div>
        </fieldset>
      </form>
      )}
    </div>

  );
};
