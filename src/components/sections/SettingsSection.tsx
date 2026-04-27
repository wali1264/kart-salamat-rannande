import React, { useState, useEffect } from 'react';
import { User, Shield, Info, LogOut, Bell, Monitor, Globe, Download, Upload, Image as ImageIcon, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { compressImage } from '../../lib/utils';

export const SettingsSection: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [logoLoading, setLogoLoading] = useState(false);
  const [logos, setLogos] = useState({ main: '', mini: '' });
  const [customization, setCustomization] = useState<any>({
    title_primary_dr: 'د افغانستان اسلامی امارت',
    title_primary_ps: 'امارت اسلامی افغانستان',
    title_primary_en: 'Islamic Emirate of Afghanistan',
    title_secondary_dr: 'د عامې روغتیا وزارت / وزارت صحت عامه',
    title_secondary_ps: 'د چلوونکي د روغتیا کارت',
    title_secondary_en: 'Driver\'s Health Card',
    footer_en: 'Islamic Emirate of Afghanistan / Ministry of Public Health (MoPH)',
    regulations_ps: [
      'دا کارت د ټرانسپورټ په سیسټم کې د فعالیت لپاره د چلوونکي د روغتیا حالت رسمي تاییدیه ده.',
      'چلوونکی مکلف دی چې د هر ډول روغتیايي ستونزو درامنځته کېدو سره تایید شویو روغتیايي مرکزونو ته مراجعه وکړي.',
      'دغه کارت یوازې د ټاکل شوې مودې (انقضا نیټې) پورې اعتبار لري.'
    ],
    regulations_dr: [
      'این کارت تاییدیه رسمی وضعیت سلامت راننده جهت فعالیت در سیستم حمل و نقل است.',
      'راننده متعهد می‌گردد در صورت بروز هرگونه عارضه صحی، به مراکز تایید شده مراجعه نماید.',
      'این کارت صرفاً تا تاریخ انقضای مندرج در آن اعتبار دارد.'
    ]
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
        setCustomization(JSON.parse(storedCustom));
      }
    } catch (err) {
      console.error('Error fetching settings from localStorage:', err);
    }
  };

  const saveSettings = (newLogos: { main: string; mini: string }, newCustom: any) => {
    setLogoLoading(true);
    try {
      localStorage.setItem('andhp_main_logo', newLogos.main);
      localStorage.setItem('andhp_mini_logo', newLogos.mini);
      localStorage.setItem('andhp_card_customization', JSON.stringify(newCustom));
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
      saveSettings(updatedLogos, customization);
    }
  };

  const updateCustomization = (key: string, value: any) => {
    const updated = { ...customization, [key]: value };
    setCustomization(updated);
    saveSettings(logos, updated);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">تنظیمات</h2>
        <p className="text-slate-500">مدیریت حساب کاربری و پیکربندی سامانه</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Logo Management Section */}
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-blue-600" />
                مدیریت لوگوهای کارت سلامت
              </h4>
              {saveStatus === 'success' && (
                <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full flex items-center gap-1 font-bold animate-pulse">
                  <Check className="w-3 h-3" /> ذخیره شد
                </span>
              )}
            </div>
            
            <p className="text-[11px] text-slate-500 leading-relaxed bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
              در این بخش می‌توانید لوگوهای رسمی وزارت صحت عامه و امارت اسلامی را برای نمایش روی کارت‌های سلامت آپلود نمایید. در صورت عدم آپلود، فضای مربوطه در کارت خالی می‌ماند.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Main Logo */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">لوگوی اصلی (سمت راست عنوان)</label>
                <label className="relative block h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-blue-300 transition-all overflow-hidden group">
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload('main', e)} />
                  {logos.main ? (
                    <div className="absolute inset-0 flex items-center justify-center p-4 bg-white">
                      <img src={logos.main} alt="Main Logo" className="max-w-full max-h-full object-contain" />
                      <div className="absolute inset-0 bg-blue-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                      <Upload className="w-6 h-6 text-slate-300 group-hover:text-blue-500 transition-colors" />
                      <span className="text-[10px] font-bold text-slate-400">آپلود لوگوی اصلی</span>
                    </div>
                  )}
                  {logoLoading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>}
                </label>
              </div>

              {/* Mini Logo */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">لوگوی ثانویه (سمت چپ عنوان)</label>
                <label className="relative block h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-blue-300 transition-all overflow-hidden group text-center">
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload('mini', e)} />
                  {logos.mini ? (
                    <div className="absolute inset-0 flex items-center justify-center p-4 bg-white">
                      <img src={logos.mini} alt="Mini Logo" className="max-w-full max-h-full object-contain" />
                      <div className="absolute inset-0 bg-blue-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                      <Upload className="w-6 h-6 text-slate-300 group-hover:text-blue-500 transition-colors" />
                      <span className="text-[10px] font-bold text-slate-400">آپلود لوگوی ثانویه</span>
                    </div>
                  )}
                  {logoLoading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>}
                </label>
              </div>
            </div>
            
            {(logos.main || logos.mini) && (
              <button 
                onClick={async () => {
                   setLogos({ main: '', mini: '' });
                   saveSettings({ main: '', mini: '' }, customization);
                }}
                className="text-[10px] font-bold text-red-500 hover:text-red-600 underline"
              >
                حذف لوگوها و بازگشت به حالت پیش‌فرض
              </button>
            )}
          </div>

          {/* Card Text Customization */}
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-600" />
              شخصی‌سازی متون روی کارت
            </h4>
            <p className="text-[11px] text-slate-500 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
              در این بخش می‌توانید عناوین و متون ثابت روی کارت (مانند نام وزارتخانه، شعارها و مقررات پشت کارت) را بر اساس نیاز ارگان خود تغییر دهید.
            </p>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400">عنوان اصلی (دری/پشتو)</label>
                  <input 
                    type="text" 
                    value={customization.title_primary_dr}
                    onChange={(e) => updateCustomization('title_primary_dr', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-xs outline-none focus:border-indigo-300 transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400">عنوان ثانویه (پشتو/دری)</label>
                  <input 
                    type="text" 
                    value={customization.title_primary_ps}
                    onChange={(e) => updateCustomization('title_primary_ps', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-xs outline-none focus:border-indigo-300 transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400">عنوان انگلیسی</label>
                  <input 
                    type="text" 
                    value={customization.title_primary_en}
                    onChange={(e) => updateCustomization('title_primary_en', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-xs outline-none focus:border-indigo-300 transition-all font-bold font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400">نام دیپارتمنت/وزارت (دری/پشتو)</label>
                  <input 
                    type="text" 
                    value={customization.title_secondary_dr}
                    onChange={(e) => updateCustomization('title_secondary_dr', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-xs outline-none focus:border-indigo-300 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400">نام کارت (پشتو/دری)</label>
                  <input 
                    type="text" 
                    value={customization.title_secondary_ps}
                    onChange={(e) => updateCustomization('title_secondary_ps', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-xs outline-none focus:border-indigo-300 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400">پاورقی کارت (English)</label>
                <input 
                  type="text" 
                  value={customization.footer_en}
                  onChange={(e) => updateCustomization('footer_en', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-[10px] outline-none focus:border-indigo-300 transition-all font-mono"
                  dir="ltr"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-slate-800 uppercase">مقررات پشت کارت (۳ مورد)</label>
                <div className="space-y-2">
                  {customization.regulations_dr.map((reg: string, idx: number) => (
                    <div key={`reg-dr-${idx}`} className="flex gap-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                      <input 
                        type="text"
                        value={reg}
                        onChange={(e) => {
                          const newRegs = [...customization.regulations_dr];
                          newRegs[idx] = e.target.value;
                          updateCustomization('regulations_dr', newRegs);
                        }}
                        className="flex-1 bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-[11px] outline-none focus:border-indigo-300"
                        placeholder={`مورد ${idx + 1} (دری)`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                if (confirm('آیا مطمئن هستید که می‌خواهید تمام متون را به حالت پیش‌فرض برگردانید؟')) {
                  const defaultCustom = {
                    title_primary_dr: 'د افغانستان اسلامی امارت',
                    title_primary_ps: 'امارت اسلامی افغانستان',
                    title_primary_en: 'Islamic Emirate of Afghanistan',
                    title_secondary_dr: 'د عامې روغتیا وزارت / وزارت صحت عامه',
                    title_secondary_ps: 'د چلوونکي د روغتیا کارت',
                    title_secondary_en: 'Driver\'s Health Card',
                    footer_en: 'Islamic Emirate of Afghanistan / Ministry of Public Health (MoPH)',
                    regulations_ps: [
                      'دا کارت د ټرانسپورټ په سیسټم کې د فعالیت لپاره د چلوونکي د روغتیا حالت رسمي تاییدیه ده.',
                      'چلوونکی مکلف دی چې د هر ډول روغتیايي ستونزو درامنځته کېدو سره تایید شویو روغتیايي مرکزونو ته مراجعه وکړي.',
                      'دغه کارت یوازې د ټاکل شوې مودې (انقضا نیټې) پورې اعتبار لري.'
                    ],
                    regulations_dr: [
                      'این کارت تاییدیه رسمی وضعیت سلامت راننده جهت فعالیت در سیستم حمل و نقل است.',
                      'راننده متعهد می‌گردد در صورت بروز هرگونه عارضه صحی، به مراکز تایید شده مراجعه نماید.',
                      'این کارت صرفاً تا تاریخ انقضای مندرج در آن اعتبار دارد.'
                    ]
                  };
                  setCustomization(defaultCustom);
                  saveSettings(logos, defaultCustom);
                }
              }}
              className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 underline"
            >
              بازنشانی متون به پیش‌فرض سامانه
            </button>
          </div>

          {/* Profile Card */}
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
              <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-blue-100">
                {profile?.name.charAt(0)}
              </div>
              <div className="text-center md:text-right flex-1">
                <h3 className="text-2xl font-bold text-slate-800 mb-1">{profile?.name}</h3>
                <p className="text-slate-500 text-sm mb-4">{profile?.email}</p>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold border border-blue-100">
                  <Shield className="w-3 h-3" />
                  {profile?.role === 'officer' ? 'مامور ترافیک' : 'داکتر موظف'}
                </div>
              </div>
              <button className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm font-bold transition-all hover:bg-slate-800">
                ویرایش پروفایل
              </button>
            </div>
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <User className="w-32 h-32" />
            </div>
          </div>

          {/* App Preferences */}
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <Monitor className="w-5 h-5 text-blue-500" />
              تنظیمات ظاهری
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div>
                  <p className="text-sm font-bold text-slate-800">حالت شب (Dark Mode)</p>
                  <p className="text-[10px] text-slate-500">تغییر تم برنامه برای محیط‌های کم‌نور</p>
                </div>
                <div className="w-10 h-5 bg-slate-200 rounded-full cursor-not-allowed"></div>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                 <div>
                  <p className="text-sm font-bold text-slate-800">زبان سامانه</p>
                  <p className="text-[10px] text-slate-500">انتخاب بین دری/پشتو/English</p>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600">
                  <Globe className="w-3 h-3" />
                  دری (پیش‌فرض)
                </div>
              </div>
            </div>
          </div>
          
          {/* Backup & Restore */}
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              پشتیبان‌گیری و بازیابی
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              شما می‌توانید از تمام اطلاعات ثبت شده (رانندگان، کارت‌ها و تصاویر) یک خروجی JSON تهیه کرده و در مواقع لزوم آن را بازیابی کنید.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <button 
                  onClick={async () => {
                    const { data: drivers } = await supabase.from('drivers').select('*');
                    const { data: cards } = await supabase.from('health_cards').select('*');
                    const backup = { drivers, cards, timestamp: new Date().toISOString() };
                    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `andhp_backup_${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                  }}
                  className="flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-slate-800 transition-all"
               >
                 <Download className="w-4 h-4" /> دریافت فایل پشتیبان
               </button>
               <label className="flex items-center justify-center gap-2 py-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl text-xs font-bold hover:bg-emerald-100 cursor-pointer transition-all">
                 <Upload className="w-4 h-4" /> بازیابی اطلاعات (Restore)
                 <input 
                    type="file" 
                    className="hidden" 
                    accept=".json"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          try {
                            const backup = JSON.parse(event.target?.result as string);
                            if (backup.drivers) {
                              await supabase.from('drivers').insert(backup.drivers);
                              if (backup.cards) await supabase.from('health_cards').insert(backup.cards);
                              alert('اطلاعات با موفقیت بازیابی شد. صفحه را رفرش کنید.');
                            }
                          } catch (err) {
                            alert('فایل پشتیبان معتبر نیست');
                          }
                        };
                        reader.readAsText(file);
                      }
                    }} 
                 />
               </label>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-blue-600 p-8 rounded-[2rem] text-white shadow-xl shadow-blue-100">
            <Info className="w-8 h-8 mb-4 opacity-50" />
            <h4 className="font-bold mb-2">اطلاعات نسخه</h4>
            <p className="text-xs text-blue-100 leading-relaxed mb-6">
               شما در حال استفاده از نسخه ۱.۰.۲ سامانه ملی سلامت رانندگان هستید. تمامی حقوق برای وزارت صحت عامه محفوظ است.
            </p>
            <div className="p-4 bg-white/10 rounded-xl text-[10px] font-mono">
              Build ID: afg-prod-2024-v1
            </div>
          </div>

          <button 
             onClick={() => signOut()}
             className="w-full p-6 bg-red-50 hover:bg-red-100 text-red-600 rounded-[2rem] border border-red-100 font-bold transition-all flex items-center justify-center gap-3"
          >
            <LogOut className="w-6 h-6" />
            خروج از حساب کاربری
          </button>
        </div>
      </div>
    </div>
  );
};
