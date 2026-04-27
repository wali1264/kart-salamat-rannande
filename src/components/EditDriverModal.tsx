import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, CreditCard, Hash, Phone, Upload, CheckCircle, AlertCircle, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { compressImage } from '../lib/utils';
import { Driver } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  driver: Driver | null;
  onUpdate: () => void;
}

export const EditDriverModal: React.FC<Props> = ({ isOpen, onClose, driver, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    father_name: '',
    license_plate: '',
    license_number: '',
    phone: '',
    id_number: '',
    vehicle_type: 'باربری',
    blood_type: 'O+',
  });
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (driver) {
      setFormData({
        name: driver.name || '',
        father_name: driver.father_name || '',
        license_plate: driver.license_plate || '',
        license_number: driver.license_number || '',
        phone: driver.phone || '',
        id_number: driver.id_number || '',
        vehicle_type: driver.vehicle_type || 'باربری',
        blood_type: driver.blood_type || 'O+',
      });
      setPhoto(driver.photo_url || null);
    }
  }, [driver]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImage(file);
      setPhoto(compressed);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driver) return;
    
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('drivers')
        .update({ ...formData, photo_url: photo || '' })
        .eq('id', driver.id);

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onUpdate();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'خطایی در بروزرسانی اطلاعات رخ داد');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !driver) return null;

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
          className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
          dir="rtl"
        >
          <div className="flex flex-col h-full max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-800">ویرایش مشخصات راننده</h3>
                <p className="text-xs text-slate-500 mt-1">تغییر اطلاعات در سیستم مرکزی</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {success ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-100">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-emerald-900 mb-2">اطلاعات بروزرسانی شد!</h3>
                  <p className="text-emerald-700/80 text-sm">تغییرات با موفقیت در سیستم ذخیره گردید.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Photo Section */}
                  <div className="md:col-span-2 flex flex-col items-center mb-4">
                    <label className="w-32 h-32 bento-card flex flex-col items-center justify-center gap-2 bg-slate-50 border-dashed border-2 group cursor-pointer hover:border-blue-300 transition-colors relative overflow-hidden rounded-3xl">
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
                            <Upload className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      ) : (
                        <Upload className="w-8 h-8 text-slate-300 group-hover:text-blue-500" />
                      )}
                    </label>
                    <span className="text-[10px] text-slate-400 font-bold mt-2 uppercase">تصویر راننده</span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">نام راننده</label>
                    <div className="relative">
                      <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
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
                        className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 pr-11 pl-4 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none border transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">شماره تماس</label>
                    <div className="relative">
                      <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="tel" 
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 pr-11 pl-4 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none border transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">نمبر جواز رانندگی</label>
                    <div className="relative">
                      <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        required
                        value={formData.license_number}
                        onChange={(e) => setFormData({...formData, license_number: e.target.value})}
                        className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 pr-11 pl-4 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none border transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">نوع موتر</label>
                    <select 
                      value={formData.vehicle_type}
                      onChange={(e) => setFormData({...formData, vehicle_type: e.target.value})}
                      className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none border transition-all"
                    >
                      <option value="باربری">باربری (Truck)</option>
                      <option value="مسافربری">مسافربری (Bus)</option>
                      <option value="تیزرفتار">تیزرفتار (Taxi/Private)</option>
                      <option value="ترانزیت">ترانزیت (Transit)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">گروه خون</label>
                    <select 
                      value={formData.blood_type}
                      onChange={(e) => setFormData({...formData, blood_type: e.target.value})}
                      className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none border transition-all"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">پلاک موتر</label>
                    <div className="relative">
                      <Hash className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        required
                        value={formData.license_plate}
                        onChange={(e) => setFormData({...formData, license_plate: e.target.value})}
                        className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 pr-11 pl-4 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none border transition-all"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 pt-6 flex flex-col items-center">
                    {error && (
                      <div className="flex items-center gap-2 text-rose-500 text-xs font-bold mb-4">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                      </div>
                    )}
                    <button 
                      type="submit" 
                      disabled={loading}
                      className="w-full bg-blue-900 hover:bg-blue-950 text-white font-bold py-4 rounded-xl shadow-xl shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? 'در حال ذخیره...' : (
                        <>
                          <Save className="w-5 h-5" />
                          <span>ثبت تغییرات</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
