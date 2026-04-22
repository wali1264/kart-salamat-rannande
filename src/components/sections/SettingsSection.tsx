import React, { useState } from 'react';
import { User, Shield, Info, LogOut, Bell, Monitor, Globe, Download, Upload } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export const SettingsSection: React.FC = () => {
  const { profile, signOut } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">تنظیمات</h2>
        <p className="text-slate-500">مدیریت حساب کاربری و پیکربندی سامانه</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
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
