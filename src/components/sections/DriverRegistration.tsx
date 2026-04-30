import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, CreditCard, Hash, Phone, Upload, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { compressImage } from '../../lib/utils';

interface Props {
  onComplete: () => void;
}

export const DriverRegistration: React.FC<Props> = ({ onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        // Use new specialized columns if they exist, or fallback to repurposed ones
        class_name: formData.vehicle_type, // Grade
        student_id_no: formData.license_number, // Roll Number
        license_plate: formData.license_plate, // Section/Group
        vehicle_type: formData.vehicle_type, // Maintain legacy field compatibility
        license_number: formData.license_number // Maintain legacy field compatibility
      };

      const { error: insertError } = await supabase
        .from('students')
        .insert([studentData]);

      if (insertError) throw insertError;

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
        <h2 className="text-2xl font-bold text-slate-800">ثبت شاگرد جدید</h2>
        <p className="text-slate-500 text-sm">مشخصات شاگرد را طبق اسناد رسمی وارد نمایید.</p>
      </div>

      {success ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bento-card bg-emerald-50 border-emerald-100 flex flex-col items-center py-16 text-center"
        >
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-100">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-emerald-900 mb-2">ثبت موفقیت‌آمیز!</h3>
          <p className="text-emerald-700/80 text-sm">اطلاعات شاگرد در سامانه مکتب ذخیره شد.</p>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-6">
          <label className="col-span-12 lg:col-span-4 bento-card flex flex-col items-center justify-center gap-4 bg-slate-50 border-dashed border-2 group cursor-pointer hover:border-blue-300 transition-colors py-12 relative overflow-hidden">
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
                  <h4 className="font-bold text-slate-700 text-sm">تصویر شاگرد</h4>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase">کلیک کنید یا عکس را بکشید (MAX 10MB)</p>
                </div>
              </>
            )}
          </label>

          <div className="col-span-12 lg:col-span-8 bento-card space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">نام شاگرد</label>
                  <div className="relative">
                    <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="احمد ولی"
                      className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 pr-11 pl-4 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none border transition-all"
                    />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">نام پدر</label>
                  <div className="relative">
                    <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 opacity-50" />
                    <input 
                      type="text" 
                      required
                      value={formData.father_name}
                      onChange={(e) => setFormData({...formData, father_name: e.target.value})}
                      placeholder="محمد علی"
                      className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 pr-11 pl-4 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none border transition-all"
                    />
                  </div>
               </div>

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
                      className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 pr-11 pl-4 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none border transition-all"
                    />
                  </div>
               </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-12 bento-card">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">شماره تماس والدین</label>
                  <div className="relative">
                    <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="tel" 
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="۰۷XXXXXXXX"
                      className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 pr-11 pl-4 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none border transition-all"
                    />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">نمبر اساس (Roll Number)</label>
                  <div className="relative">
                    <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      required
                      value={formData.license_number}
                      onChange={(e) => setFormData({...formData, license_number: e.target.value})}
                      placeholder="SN-XXXX"
                      className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 pr-11 pl-4 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none border transition-all"
                    />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">صنف / صنف تحصیلی</label>
                  <select 
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({...formData, vehicle_type: e.target.value})}
                    className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none border transition-all"
                  >
                    {categories.map(grade => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">گروه خون</label>
                  <select 
                    value={formData.blood_type}
                    onChange={(e) => setFormData({...formData, blood_type: e.target.value})}
                    className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none border transition-all"
                  >
                    {['نامعلوم', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">بخش / شعبه (Section)</label>
                  <div className="relative">
                    <Hash className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      required
                      value={formData.license_plate}
                      onChange={(e) => setFormData({...formData, license_plate: e.target.value})}
                      placeholder="بخش الف / ب"
                      className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 pr-11 pl-4 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none border transition-all"
                    />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">فیس ماهانه (افغانی)</label>
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
                  {loading ? 'در حال ثبت...' : 'ثبت شاگرد جدید +'}
                </button>
            </div>
          </div>
        </form>
      )}
    </div>

  );
};
