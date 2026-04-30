import React, { useState, useEffect } from 'react';
import { User, Shield, Info, LogOut, Bell, Monitor, Globe, Download, Upload, Image as ImageIcon, Check, CreditCard, DollarSign, LifeBuoy, Layers, AlertCircle, Phone, Mail, ExternalLink, PlusCircle, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { compressImage } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export const SettingsSection: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'card' | 'tax' | 'backup' | 'support' | 'items'>('general');
  const [logoLoading, setLogoLoading] = useState(false);
  const [logos, setLogos] = useState({ main: '', mini: '' });
  const [customization, setCustomization] = useState<any>({
    title_primary_dr: 'د افغانستان اسلامی امارت',
    title_primary_ps: 'امارت اسلامی افغانستان',
    title_primary_en: 'Islamic Emirate of Afghanistan',
    title_secondary_dr: 'وزارت معارف / ریاست معارف ولایت مربوطه',
    title_card_ps: 'د زده کوونکي د هویت کارت',
    title_card_dr: 'کارت هویت شاگرد',
    title_card_en: 'Student Identity Card',
    footer_en: 'Islamic Emirate of Afghanistan / Ministry of Education (MoE)',
    regulations_ps: [
      'دا کارت د ښوونځي په سیسټم کې د فعالیت لپاره د زده کوونکي د هویت رسمي تاییدیه ده.',
      'زده کوونکی مکلف دی چې په ښوونځي کې د ټاکل شویو مقرراتو او انضباطي اصولو مراعات وکړي.',
      'دغه کارت یوازې د ټاکل شوې ښوونیزې دورې پورې اعتبار لري.'
    ],
    regulations_dr: [
      'این کارت تاییدیه رسمی هویت شاگرد جهت فعالیت در محیط مکتب است.',
      'شاگرد متعهد می‌گردد تمامی مقررات انضباطی و آموزشی مکتب را به طور کامل رعایت نماید.',
      'این کارت صرفاً تا تاریخ انقضای مندرج در آن (پایان سال تحصیلی) اعتبار دارد.'
    ]
  });
  
  const [taxSettings, setTaxSettings] = useState({
    threshold: 500,
    rate: 5,
    enabled: true,
    teacherThreshold: 5000,
    teacherRate: 10
  });

  const [categories, setCategories] = useState(['اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم', 'هفتم', 'هشتم', 'نهم', 'دهم', 'یازدهم', 'دوازدهم']);

  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setLogos({
          main: data.card_logo_main || '',
          mini: data.card_logo_mini || ''
        });

        setCustomization({
          title_primary_dr: data.card_front_text_dari || 'د افغانستان اسلامی امارت',
          title_primary_ps: data.card_front_text_pashto || 'امارت اسلامی افغانستان',
          title_primary_en: data.card_front_text_english || 'Islamic Emirate of Afghanistan',
          title_secondary_dr: data.card_back_text_dari || 'وزارت معارف / ریاست معارف ولایت مربوطه',
          title_secondary_ps: data.card_back_text_pashto || '',
          title_secondary_en: data.school_name_dept || '',
          regulations_ps: customization.regulations_ps,
          regulations_dr: customization.regulations_dr
        });

        setTaxSettings({
          threshold: data.fee_tax_threshold || 500,
          rate: data.fee_tax_rate || 5,
          enabled: true,
          teacherThreshold: data.teacher_tax_threshold || 5000,
          teacherRate: data.teacher_tax_rate || 10
        });

        if (data.student_categories) {
          setCategories(data.student_categories);
        }
      }
    } catch (err) {
      console.error('Error fetching settings from Supabase:', err);
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const saveSettings = async (targetSetting: 'all' | 'logos' | 'custom' | 'tax' | 'cats' = 'all') => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      // Create a base update object with common fields
      const updates: any = {
        id: '00000000-0000-0000-0000-000000000000',
        updated_at: new Date().toISOString()
      };

      // Add specific fields based on what's being saved
      if (targetSetting === 'all' || targetSetting === 'logos') {
        updates.card_logo_main = logos.main;
        updates.card_logo_mini = logos.mini;
      }
      
      if (targetSetting === 'all' || targetSetting === 'custom') {
        updates.card_front_text_dari = customization.title_primary_dr;
        updates.card_front_text_pashto = customization.title_primary_ps;
        updates.card_front_text_english = customization.title_primary_en;
        updates.card_back_text_dari = customization.title_secondary_dr;
        updates.card_back_text_pashto = customization.title_secondary_ps || '';
        updates.school_name_dept = customization.title_secondary_en || '';
      }

      if (targetSetting === 'all' || targetSetting === 'tax') {
        updates.fee_tax_threshold = taxSettings.threshold;
        updates.fee_tax_rate = taxSettings.rate;
        // Optionally omit these if they cause 400 errors during migration
        updates.teacher_tax_threshold = taxSettings.teacherThreshold;
        updates.teacher_tax_rate = taxSettings.teacherRate;
      }

      if (targetSetting === 'all' || targetSetting === 'cats') {
        updates.student_categories = categories;
      }

      const { error } = await supabase
        .from('system_settings')
        .upsert(updates);

      if (error) throw error;
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err) {
      console.error('Error saving settings to Supabase:', err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (type: 'main' | 'mini', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImage(file, type === 'main' ? 400 : 200);
      setLogos(prev => ({ ...prev, [type]: compressed }));
    }
  };

  const updateCustomization = (key: string, value: any) => {
    setCustomization(prev => ({ ...prev, [key]: value }));
  };

  const updateTaxSettings = (updates: Partial<typeof taxSettings>) => {
    setTaxSettings(prev => ({ ...prev, ...updates }));
  };

  const updateCategories = (newCats: string[]) => {
    setCategories(newCats);
  };

  const tabs = [
    { id: 'general', label: 'حساب و ظاهر', icon: User },
    { id: 'items', label: 'دسته‌بندی‌ها', icon: Layers },
    { id: 'card', label: 'شخصی‌سازی کارت', icon: CreditCard },
    { id: 'tax', label: 'تنظیمات مالیات', icon: DollarSign },
    { id: 'backup', label: 'پشتیبان‌گیری', icon: Shield },
    { id: 'support', label: 'پشتیبانی', icon: LifeBuoy },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">تنظیمات سامانه</h2>
          <p className="text-slate-500">مدیریت حساب کاربری، متون کارت و پارامترهای مالی</p>
        </div>
        {saveStatus === 'success' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-50 text-emerald-600 px-6 py-3 rounded-2xl flex items-center gap-3 font-black text-xs border-2 border-emerald-100 shadow-sm"
          >
            <div className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center">
              <Check className="w-4 h-4" />
            </div>
            تغییرات با موفقیت در دیتابیس ثبت گردید
          </motion.div>
        )}
        {saveStatus === 'error' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-rose-50 text-rose-600 px-6 py-3 rounded-2xl flex items-center gap-3 font-black text-xs border-2 border-rose-100 shadow-sm"
          >
            <div className="w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center">
              <X className="w-4 h-4" />
            </div>
            خطا در ذخیره‌سازی! لطفاً اتصال انترنت را بررسی کنید
          </motion.div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/50 rounded-[2rem] overflow-x-auto no-scrollbar border border-slate-100">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-[1.5rem] text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400'}`} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12">
          <AnimatePresence mode="wait">
            {activeTab === 'general' && (
              <motion.div 
                key="general"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Profile Card */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden text-right">
                  <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                    <div className="w-28 h-28 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center text-white text-4xl font-bold shadow-xl shadow-blue-100">
                      {profile?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="text-center md:text-right flex-1">
                      <h3 className="text-2xl font-bold text-slate-800 mb-1">{profile?.name || 'مدیر سامانه'}</h3>
                      <p className="text-slate-500 text-sm mb-4">{profile?.email}</p>
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-bold border border-blue-100">
                        <Shield className="w-3.5 h-3.5" />
                        مدیر سامانه / اپراتور سیستم
                      </div>
                    </div>
                    <button className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-sm font-bold transition-all hover:bg-slate-800 shadow-lg shadow-slate-100">
                      ویرایش پروفایل کاربری
                    </button>
                  </div>
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <User className="w-48 h-48" />
                  </div>
                </div>

                {/* UI Preferences */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 text-right">
                  <h4 className="font-bold text-slate-800 flex items-center gap-3 text-lg">
                    <Monitor className="w-6 h-6 text-blue-500" />
                    تنظیمات ظاهری برنامه
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-6 bg-slate-50 border border-slate-100 rounded-[2rem]">
                      <div>
                        <p className="text-sm font-bold text-slate-800">حالت شب (Dark Mode)</p>
                        <p className="text-xs text-slate-500 mt-1">تغییر تم برنامه برای محیط‌های کم‌نور</p>
                      </div>
                      <div className="w-12 h-6 bg-slate-200 rounded-full cursor-not-allowed opacity-50 relative">
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-6 bg-slate-50 border border-slate-100 rounded-[2rem]">
                       <div>
                        <p className="text-sm font-bold text-slate-800">زبان سامانه</p>
                        <p className="text-xs text-slate-500 mt-1">انتخاب بین دری/پشتو/English</p>
                      </div>
                      <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-xs font-bold text-blue-600 border border-slate-200 shadow-sm">
                        <Globe className="w-4 h-4" />
                        دری (پیش‌فرض)
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => signOut()}
                  className="w-full p-6 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-[2rem] border border-rose-100 font-bold transition-all flex items-center justify-center gap-3 shadow-sm"
                >
                  <LogOut className="w-6 h-6" />
                  خروج کامل از حساب کاربری
                </button>
              </motion.div>
            )}

            {activeTab === 'items' && (
              <motion.div 
                key="items"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 text-right">
                  <h4 className="font-bold text-slate-800 flex items-center gap-3 text-lg text-amber-600">
                    <Layers className="w-6 h-6" />
                    مدیریت صنف‌ها و دسته‌بندی‌ها
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed bg-amber-50/50 p-5 rounded-2xl border border-amber-100/50">
                    در این بخش می‌توانید لیست صنف‌های موجود در مکتب را مدیریت کنید. این لیست در هنگام ثبت‌نام شاگرد جدید برای انتخاب صنف استفاده می‌شود.
                  </p>
                  
                  <div className="flex flex-wrap gap-3">
                    {categories.map((cat, idx) => (
                      <div key={idx} className="group relative flex items-center gap-3 bg-white border border-slate-200 px-5 py-3 rounded-2xl font-bold text-slate-700 shadow-sm hover:border-amber-300 transition-all">
                        {cat}
                        <button 
                          onClick={() => updateCategories(categories.filter((_, i) => i !== idx))}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-500 hover:text-rose-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        const name = prompt('نام صنف جدید را وارد کنید:');
                        if (name) updateCategories([...categories, name]);
                      }}
                      className="flex items-center gap-2 bg-amber-600 text-white px-6 py-3 rounded-2xl text-xs font-bold hover:bg-amber-700 shadow-lg shadow-amber-100 transition-all active:scale-95"
                    >
                      <PlusCircle className="w-4 h-4" /> افزودن صنف جدید
                    </button>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex justify-end">
                    <button 
                      onClick={() => saveSettings('cats')}
                      disabled={isSaving}
                      className="bg-slate-900 text-white px-10 py-4 rounded-2xl text-sm font-black transition-all hover:bg-slate-800 shadow-xl disabled:opacity-50 flex items-center gap-3"
                    >
                      {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-5 h-5 text-emerald-400" />}
                      تایید و ذخیره نهایی صنف‌ها
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'card' && (
              <motion.div 
                key="card"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Logo Management */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                  <h4 className="font-bold text-slate-800 flex items-center gap-3 text-lg text-blue-600">
                    <ImageIcon className="w-6 h-6" />
                    مدیریت لوگوهای کارت هویت
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed bg-blue-50/50 p-5 rounded-2xl border border-blue-100/50">
                    در این بخش می‌توانید لوگوهای رسمی مکتب و امارت اسلامی را برای نمایش روی کارت‌های هویت آپلود نمایید. در صورت عدم آپلود، فضای مربوطه در کارت خالی می‌ماند.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    {/* Log uploading blocks same as before but styled better */}
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block px-2 text-center">لوگوی اصلی (سمت راست عنوان)</label>
                      <label className="relative block h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:border-blue-300 transition-all overflow-hidden group">
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload('main', e)} />
                        {logos.main ? (
                          <div className="absolute inset-0 flex items-center justify-center p-6 bg-white">
                            <img src={logos.main} alt="Main Logo" className="max-w-full max-h-full object-contain" />
                            <div className="absolute inset-0 bg-blue-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Upload className="w-8 h-8 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                            <Upload className="w-8 h-8 text-slate-200 group-hover:text-blue-500 transition-colors" />
                            <span className="text-xs font-bold text-slate-400">آپلود لوگوی اصلی</span>
                          </div>
                        )}
                      </label>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block px-2 text-center">لوگوی ثانویه (سمت چپ عنوان)</label>
                      <label className="relative block h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:border-blue-300 transition-all overflow-hidden group">
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload('mini', e)} />
                        {logos.mini ? (
                          <div className="absolute inset-0 flex items-center justify-center p-6 bg-white">
                            <img src={logos.mini} alt="Mini Logo" className="max-w-full max-h-full object-contain" />
                            <div className="absolute inset-0 bg-blue-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Upload className="w-8 h-8 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                            <Upload className="w-8 h-8 text-slate-200 group-hover:text-blue-500 transition-colors" />
                            <span className="text-xs font-bold text-slate-400">آپلود لوگوی ثانویه</span>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                {/* Card Texts Implementation - Same logic as before but in this tab */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                  <h4 className="font-bold text-slate-800 flex items-center gap-3 text-lg text-indigo-600">
                    <Globe className="w-6 h-6" />
                    شخصی سازی متون روی کارت
                  </h4>
                  <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400">عنوان اصلی (دری/پشتو)</label>
                          <input 
                            type="text" 
                            value={customization.title_primary_dr}
                            onChange={(e) => updateCustomization('title_primary_dr', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm outline-none focus:border-indigo-300 transition-all font-bold"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400">عنوان ثانویه (پشتو/دری)</label>
                          <input 
                            type="text" 
                            value={customization.title_primary_ps}
                            onChange={(e) => updateCustomization('title_primary_ps', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm outline-none focus:border-indigo-300 transition-all font-bold"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400">عنوان انگلیسی</label>
                          <input 
                            type="text" 
                            value={customization.title_primary_en}
                            onChange={(e) => updateCustomization('title_primary_en', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm outline-none focus:border-indigo-300 transition-all font-bold font-mono"
                            dir="ltr"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-4 pt-6 border-t border-slate-100">
                        <label className="text-xs font-bold text-slate-600 block">فیلدهای تکمیلی کارت (نام مکتب و فوتر)</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400">نام مکتب (دری)</label>
                            <input 
                              type="text" 
                              value={customization.title_secondary_dr}
                              onChange={(e) => updateCustomization('title_secondary_dr', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm outline-none focus:border-indigo-300 transition-all font-bold"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400">نام مکتب (پشتو)</label>
                            <input 
                              type="text" 
                              value={customization.title_secondary_ps}
                              onChange={(e) => updateCustomization('title_secondary_ps', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm outline-none focus:border-indigo-300 transition-all font-bold"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400">فوتر انگلیسی (پشت کارت)</label>
                            <input 
                              type="text" 
                              value={customization.title_secondary_en}
                              onChange={(e) => updateCustomization('title_secondary_en', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm outline-none focus:border-indigo-300 transition-all font-mono"
                              dir="ltr"
                            />
                          </div>
                        </div>
                      </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] border-2 border-indigo-100 shadow-xl shadow-indigo-50/50 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-right">
                    <h4 className="font-black text-slate-800 text-lg">تایید نهایی تغییرات هویت بصری</h4>
                    <p className="text-slate-500 text-xs mt-1">با کلیک بر روی دکمه روبرو، تمام لوگوها و متون جدید روی کارت‌های هویت اعمال خواهند شد.</p>
                  </div>
                  <button 
                    onClick={() => saveSettings('all')}
                    disabled={isSaving}
                    className="w-full md:w-auto bg-indigo-600 text-white px-12 py-5 rounded-2xl text-sm font-black transition-all hover:bg-indigo-700 shadow-xl shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95"
                  >
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Check className="w-5 h-5 text-emerald-300" />
                    )}
                    ذخیره و بروزرسانی طرح کارت
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'tax' && (
              <motion.div 
                key="tax"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                  <h4 className="font-bold text-slate-800 flex items-center gap-3 text-lg text-emerald-600">
                    <DollarSign className="w-6 h-6" />
                    تنظیمات مالیات بر فیس
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100/50">
                    بر اساس قوانین مالیاتی جدید، بر مبالغ فیس بالاتر از یک سقف مشخص، مالیات تعلق می‌گیرد. در این بخش می‌توانید سقف معافیت و درصد مالیات را تعیین کنید.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block px-2">سقف معافیت مالیاتی شاگردان (افغانی)</label>
                      <div className="relative">
                        <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="number" 
                          value={taxSettings.threshold}
                          onChange={(e) => updateTaxSettings({ threshold: parseFloat(e.target.value) })}
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pr-12 pl-6 text-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block px-2">درصد مالیات شاگردان</label>
                      <div className="relative">
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</span>
                        <input 
                          type="number" 
                          value={taxSettings.rate}
                          onChange={(e) => updateTaxSettings({ rate: parseFloat(e.target.value) })}
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pr-12 pl-6 text-xl font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block px-2">سقف معافیت مالیاتی اساتید (افغانی)</label>
                      <div className="relative">
                        <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                        <input 
                          type="number" 
                          value={taxSettings.teacherThreshold}
                          onChange={(e) => updateTaxSettings({ teacherThreshold: parseFloat(e.target.value) })}
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pr-12 pl-6 text-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block px-2">درصد مالیات اساتید</label>
                      <div className="relative">
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-emerald-400">%</span>
                        <input 
                          type="number" 
                          value={taxSettings.teacherRate}
                          onChange={(e) => updateTaxSettings({ teacherRate: parseFloat(e.target.value) })}
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pr-12 pl-6 text-xl font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button 
                      onClick={() => saveSettings('tax')}
                      disabled={isSaving}
                      className="bg-emerald-600 text-white px-10 py-4 rounded-2xl text-sm font-black transition-all hover:bg-emerald-700 shadow-xl shadow-emerald-100 disabled:opacity-50 flex items-center gap-3 active:scale-95"
                    >
                      {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-5 h-5 text-emerald-200" />}
                      بروزرسانی پارامترهای مالیاتی
                    </button>
                  </div>

                  <div className="p-6 bg-slate-900 rounded-3xl text-white">
                    <h5 className="font-bold mb-4 flex items-center gap-2 text-sm">
                      <Info className="w-4 h-4 text-blue-400" />
                      مثال محاسبه:
                    </h5>
                    <div className="space-y-2 opacity-80 text-xs">
                      <p>اگر فیس شاگرد ۱۰۰۰ افغانی باشد:</p>
                      <ul className="list-disc list-inside space-y-1 pr-4">
                        <li>سقف معافیت: {taxSettings.threshold} افغانی</li>
                        <li>مبلغ مشمول مالیات: {1000 - taxSettings.threshold} افغانی</li>
                        <li>مالیات ({taxSettings.rate}%): {((1000 - taxSettings.threshold) * taxSettings.rate / 100).toFixed(0)} افغانی</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'backup' && (
              <motion.div 
                key="backup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                  {/* Backup content same as before but in this tab */}
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                    <h4 className="font-bold text-slate-800 flex items-center gap-3 text-lg text-blue-500">
                      <Shield className="w-6 h-6" />
                      پشتیبان گیری و مدیریت داده‌ها
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      شما می‌توانید از تمام اطلاعات ثبت شده (شاگردان، دیتای مالی و تنظیمات) یک خروجی آفلاین تهیه کنید.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button 
                        onClick={async () => {
                          const { data: students } = await supabase.from('students').select('*');
                          const { data: payments } = await supabase.from('fee_payments').select('*');
                          const backup = { 
                            students, 
                            payments,
                            settings: customization,
                            tax: taxSettings,
                            timestamp: new Date().toISOString() 
                          };
                          const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `school_mgt_full_backup_${new Date().toISOString().split('T')[0]}.json`;
                          a.click();
                        }}
                        className="flex items-center justify-center gap-3 py-5 bg-slate-900 text-white rounded-[1.5rem] text-sm font-bold hover:bg-slate-800 shadow-xl shadow-slate-100"
                      >
                        <Download className="w-5 h-5" /> ایجاد فایل بک‌آپ کامل
                      </button>
                      <label className="flex items-center justify-center gap-3 py-5 bg-blue-50 text-blue-700 border border-blue-100 rounded-[1.5rem] text-sm font-bold hover:bg-blue-100 cursor-pointer shadow-sm">
                        <Upload className="w-5 h-5" /> بازیابی دیتای قدیمی
                        <input type="file" className="hidden" />
                      </label>
                    </div>
                  </div>
              </motion.div>
            )}
            {activeTab === 'support' && (
              <motion.div 
                key="support"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20 text-center space-y-8">
                  <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
                    <LifeBuoy className="w-12 h-12" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 mb-2">مرکز پشتیبانی و خدمات مشتریان</h3>
                    <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
                      در صورت بروز هرگونه مشکل فنی در سامانه، سوال در مورد تنظیمات مالی یا نیاز به آموزش، همکاران ما آماده پاسخگویی هستند.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center gap-5">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">شماره تماس مستقیم</p>
                        <p className="text-lg font-black text-slate-800" dir="ltr">+93 700 000 000</p>
                      </div>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center gap-5">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-sm">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">ایمیل پشتیبانی</p>
                        <p className="text-sm font-black text-slate-800">support@school.gov.af</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-50 flex flex-col items-center gap-4">
                    <p className="text-xs text-slate-400 flex items-center gap-2">
                       <AlertCircle className="w-4 h-4" />
                       ساعت کاری: شنبه تا پنجشنبه - ۸ صبح الی ۴ بعد از ظهر
                    </p>
                    <button className="flex items-center gap-2 text-blue-600 font-bold text-xs hover:underline">
                      <ExternalLink className="w-4 h-4" /> مشاهده مستندات راهنمای سامانه
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
