import React, { useState, useEffect } from 'react';
import { User, Shield, Info, LogOut, Bell, Monitor, Globe, Download, Upload, Image as ImageIcon, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { compressImage } from '../../lib/utils';

export const SettingsSection: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'card' | 'tax' | 'backup'>('general');
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
    enabled: true
  });

  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = () => {
    try {
      const main = localStorage.getItem('andhp_main_logo') || '';
      const mini = localStorage.getItem('andhp_mini_logo') || '';
      setLogos({ main, mini });

      const storedCustom = localStorage.getItem('andhp_card_customization');
      if (storedCustom) {
        const parsed = JSON.parse(storedCustom);
        if (!parsed.regulations_ps) parsed.regulations_ps = customization.regulations_ps;
        if (!parsed.regulations_dr) parsed.regulations_dr = customization.regulations_dr;
        if (!parsed.title_card_dr || parsed.title_card_dr.includes('صحت')) {
          parsed.title_card_ps = 'د زده کوونکي د هویت کارت';
          parsed.title_card_dr = 'کارت هویت شاگرد';
          parsed.title_card_en = 'Student Identity Card';
        }
        setCustomization(parsed);
      }

      const storedTax = localStorage.getItem('andhp_tax_settings');
      if (storedTax) {
        setTaxSettings(JSON.parse(storedTax));
      }
    } catch (err) {
      console.error('Error fetching settings from localStorage:', err);
    }
  };

  const saveSettings = (newLogos: { main: string; mini: string }, newCustom: any, newTax?: any) => {
    setLogoLoading(true);
    try {
      localStorage.setItem('andhp_main_logo', newLogos.main);
      localStorage.setItem('andhp_mini_logo', newLogos.mini);
      localStorage.setItem('andhp_card_customization', JSON.stringify(newCustom));
      if (newTax) localStorage.setItem('andhp_tax_settings', JSON.stringify(newTax));
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error('Error saving settings to localStorage:', err);
      setSaveStatus('error');
    } finally {
      setLogoLoading(false);
    }
  };

  const handleLogoUpload = async (type: 'main' | 'mini', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImage(file, type === 'main' ? 400 : 200);
      const updatedLogos = { ...logos, [type]: compressed };
      setLogos(updatedLogos);
      saveSettings(updatedLogos, customization, taxSettings);
    }
  };

  const updateCustomization = (key: string, value: any) => {
    const updated = { ...customization, [key]: value };
    setCustomization(updated);
    saveSettings(logos, updated, taxSettings);
  };

  const updateTaxSettings = (updates: Partial<typeof taxSettings>) => {
    const updated = { ...taxSettings, ...updates };
    setTaxSettings(updated);
    saveSettings(logos, customization, updated);
  };

  const tabs = [
    { id: 'general', label: 'حساب و ظاهر', icon: User },
    { id: 'card', label: 'شخصی‌سازی کارت', icon: CreditCard },
    { id: 'tax', label: 'تنظیمات مالیات', icon: DollarSign },
    { id: 'backup', label: 'پشتیبان‌گیری', icon: Shield },
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
            className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl flex items-center gap-2 font-bold text-xs border border-emerald-100"
          >
            <Check className="w-4 h-4" /> تمام تغییرات ذخیره شد
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
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
                  <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                    <div className="w-28 h-28 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center text-white text-4xl font-bold shadow-xl shadow-blue-100">
                      {profile?.name.charAt(0)}
                    </div>
                    <div className="text-center md:text-right flex-1">
                      <h3 className="text-2xl font-bold text-slate-800 mb-1">{profile?.name}</h3>
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
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
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
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400">نام مکتب یا دیپارتمنت (دری/پشتو)</label>
                        <input 
                          type="text" 
                          value={customization.title_secondary_dr}
                          onChange={(e) => updateCustomization('title_secondary_dr', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4 px-6 text-sm outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-bold"
                        />
                      </div>
                  </div>
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
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block px-2">سقف معافیت مالیاتی (افغانی)</label>
                      <div className="relative">
                        <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="number" 
                          value={taxSettings.threshold}
                          onChange={(e) => updateTaxSettings({ threshold: parseFloat(e.target.value) })}
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pr-12 pl-6 text-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 italic">مبالغ فیس تا {taxSettings.threshold} افغانی شامل مالیات نمی‌شوند.</p>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block px-2">درصد مالیات (Percentage)</label>
                      <div className="relative">
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</span>
                        <input 
                          type="number" 
                          value={taxSettings.rate}
                          onChange={(e) => updateTaxSettings({ rate: parseFloat(e.target.value) })}
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pr-12 pl-6 text-xl font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 italic">درصد مالیات برای مبالغ مازاد بر سقف تعیین شده.</p>
                    </div>
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
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
