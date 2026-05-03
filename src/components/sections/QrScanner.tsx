import React, { useEffect, useState } from 'react';
import { ShieldCheck, Loader2, AlertCircle, Camera, Info, ShieldAlert, Clock, User as UserIcon, Search, PowerOff, Fingerprint, Bell, QrCode, GraduationCap, Calendar } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { offlineDb } from '../../lib/db';
import { useSystem } from '../../contexts/SystemContext';
import { useSync } from '../../contexts/SyncContext';

import { useScanner } from '../../hooks/useScanner';

export const QrScanner: React.FC = () => {
  const { mode, isTeacherMode } = useSystem();
  const { isOnline } = useSync();
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState<{ card: any, student: any } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'expired' | 'fake'>('idle');
  const [activeTab, setActiveTab] = useState<'scan' | 'announcements' | 'grades'>('scan');
  const [announcement, setAnnouncement] = useState<{ text: string, images: string[] } | null>(null);
  const [gradeSearchInput, setGradeSearchInput] = useState('');
  const [gradeData, setGradeData] = useState<{ student: any, grades: any[], recommendations: any[] } | null>(null);
  const [gradeLoading, setGradeLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [fingerprintMode, setFingerprintMode] = useState(false);
  const [isScannerConnected, setIsScannerConnected] = useState(true); // Default to true since HID is passive
  const [lastMatchedFinger, setLastMatchedFinger] = useState<number | null>(null);
  
  const [selectedContent, setSelectedContent] = useState<{ type: 'text' | 'image', value: string } | null>(null);

  // Real scanner input listener
  useScanner((code) => {
    if (fingerprintMode && !cardData && !loading) {
      handleFingerprintSearch(code);
    }
  }, fingerprintMode);
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Helper to normalize Persian/Arabic characters
  const normalize = (text: string) => {
    if (!text) return '';
    return text.trim().replace(/ي/g, 'ی').replace(/ك/g, 'ک');
  };


  // Live Suggestion Search Logic
  useEffect(() => {
    const fetchSuggestions = async () => {
      const q = normalize(searchInput);
      if (q.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsSearching(true);
      try {
        // Advanced Search: Look up students by Name, ID, Phone, Father Name, Class
        const { data: students, error: dError } = await supabase
          .from('students')
          .select(`*, health_cards(id, expiry_date)`)
          .eq('type', mode)
          .or(`name.ilike.%${q}%,student_id_no.ilike.%${q}%,license_number.ilike.%${q}%,license_plate.ilike.%${q}%,id_number.ilike.%${q}%,phone.ilike.%${q}%,father_name.ilike.%${q}%,vehicle_type.ilike.%${q}%`)
          .limit(5);

        // Also search by S/N directly in health_cards if query is short/alphanumeric
        let snResults: any[] = [];
        if (q.length >= 4 && /^[a-zA-Z0-9]+$/.test(q)) {
          const { data: cards } = await supabase
            .from('health_cards')
            .select('*, students!inner(*)')
            .ilike('id', `${q}%`)
            .eq('students.type', mode)
            .limit(3);
          
          if (cards) {
            snResults = cards.map(c => ({
              ...c.students,
              health_cards: [{ id: c.id, expiry_date: c.expiry_date }]
            }));
          }
        }

        const combined = [...students || [], ...snResults];
        // Remove duplicates by ID
        const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        setSuggestions(unique.slice(0, 6));

      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        if (isOnline) {
          const { data } = await supabase.from('announcements').select('*').eq('id', '00000000-0000-0000-0000-000000000000').maybeSingle();
          if (data) setAnnouncement({
            text: data.content || '',
            images: Array.isArray(data.images) ? data.images : []
          });
        } else {
          const cached = await offlineDb.cache.where('collection').equals('announcements').first();
          if (cached?.data) setAnnouncement({
            text: cached.data.content || '',
            images: Array.isArray(cached.data.images) ? cached.data.images : []
          });
        }
      } catch (err) {
        console.error("Fetch announcements error:", err);
        // Fallback to cache even if online fetch failed
        const cached = await offlineDb.cache.where('collection').equals('announcements').first();
        if (cached?.data) setAnnouncement({
          text: cached.data.content || '',
          images: Array.isArray(cached.data.images) ? cached.data.images : []
        });
      }
    };
    fetchAnnouncements();
  }, [isOnline]);

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;

    const startScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode("reader");
        const config = { fps: 15, qrbox: { width: 220, height: 220 } };
        
        await html5QrCode.start(
          { facingMode: "environment" }, 
          config, 
          (decodedText) => {
            if (navigator.vibrate) navigator.vibrate(100);
            verifyCard(decodedText);
            setShowScanner(false);
          },
          () => {} 
        );
      } catch (err) {
        console.error("Scanner failed to start", err);
      }
    };

    if (showScanner && !cardData && !loading) {
      startScanner();
    }

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(e => console.error(e));
      }
    };
  }, [showScanner, cardData]);

  const verifyCard = async (query: string) => {
    if (!isOnline) {
      setError('ارتباط با سرور قطع است. استعلام در حالت آفلاین فعلاً فعال نیست.');
      return;
    }

    setLoading(true);
    setError(null);
    setScanStatus('idle');
    setSuggestions([]);
    setSearchInput('');

    const qRaw = normalize(query);
    // 1. URL/SN Extraction: Get the core identifier
    let q = qRaw;
    if (qRaw.includes('/')) {
      const parts = qRaw.split('/');
      q = parts[parts.length - 1];
    }
    
    // Clean S/N patterns (e.g., 'A513345B-233' -> 'A513345B')
    // We keep the prefix to match the start of the UUID
    const qClean = q.includes('-') ? q.split('-')[0].trim() : q.trim();

    try {
      let card = null;

      // STEP 1: Search by all student fields
      const { data: students, error: dError } = await supabase
        .from('students')
        .select('id, name')
        .eq('type', mode)
        .or(`name.ilike.%${qClean}%,student_id_no.ilike.%${qClean}%,license_number.ilike.%${qClean}%,license_plate.ilike.%${qClean}%,id_number.ilike.%${qClean}%,phone.ilike.%${qClean}%,father_name.ilike.%${qClean}%,vehicle_type.ilike.%${qClean}%`);

      if (dError) throw dError;

      let targetStudentId = null;

      if (students && students.length > 0) {
        targetStudentId = students[0].id;
      } else {
        const { data: allStudents } = await supabase.from('students').select('id').limit(100);
        const match = allStudents?.find(d => d.id.toLowerCase().startsWith(qClean.toLowerCase()));
        if (match) targetStudentId = match.id;
      }

      if (targetStudentId) {
        const { data: cData } = await supabase
          .from('health_cards')
          .select('*, students!inner(*)')
          .eq('driver_id', targetStudentId)
          .eq('students.type', mode)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (cData && cData.length > 0) card = cData[0];
      }

      if (!card) {
        const { data: directCard } = await supabase.from('health_cards').select('*, students!inner(*)').eq('students.type', mode).limit(100);
        const cardMatch = directCard?.find(c => c.id.toLowerCase().startsWith(qClean.toLowerCase()));
        if (cardMatch) card = cardMatch;
      }

      if (!card) {
        setScanStatus('fake');
        throw new Error('کارت در سیستم یافت نشد. این کارت جعلی است یا با این مشخصات شاگردی وجود ندارد.');
      }

      const isExpired = new Date(card.expiry_date) < new Date();
      setCardData({ card, student: card.students });
      setScanStatus(isExpired ? 'expired' : 'success');

    } catch (err: any) {
      console.error("Verification error:", err);
      setError(err.message);
      setScanStatus('fake');
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setCardData(null);
    setError(null);
    setScanStatus('idle');
    setShowScanner(false);
    setSearchInput('');
    setFingerprintMode(false);
  };

  const handleFingerprintSearch = async (fingerprintId: string) => {
    if (!fingerprintId || !isOnline) return;
    
    setLoading(true);
    setScanStatus('idle');
    setError(null);

    try {
      // Search for a student who has this fingerprint ID in their fingerprints array
      const { data, error: fetchError } = await supabase
        .from('students')
        .select('*')
        .eq('type', mode)
        .contains('fingerprints', [fingerprintId])
        .limit(1);

      if (fetchError) throw fetchError;

      if (!data || data.length === 0) {
        throw new Error('اثر انگشت در سامانه یافت نشد. این فرد ثبت‌نام نشده است.');
      }

      const matchedStudent = data[0];
      const fingerIndex = (matchedStudent.fingerprints || []).indexOf(fingerprintId);
      setLastMatchedFinger(fingerIndex !== -1 ? fingerIndex + 1 : null);
      
      // If found, trigger the normal verification using the student ID
      await verifyCard(matchedStudent.id);
    } catch (err: any) {
      console.error("Fingerprint search error:", err);
      setError(err.message);
      setScanStatus('fake');
    } finally {
      setLoading(false);
    }
  };

  const fetchGradeData = async (studentIdNo: string) => {
    if (!studentIdNo || !isOnline) return;
    setGradeLoading(true);
    setGradeData(null);
    try {
      // 1. Find student by ID No
      const { data: student, error: sError } = await supabase
        .from('students')
        .select('*')
        .eq('student_id_no', studentIdNo.trim())
        .eq('type', 'student')
        .maybeSingle();

      if (sError) throw sError;
      if (!student) throw new Error('شاگردی با این کد شناسایی یافت نشد.');

      // 2. Fetch grades and recommendations
      const { data: grades } = await supabase
        .from('student_grades')
        .select('*, subject:grade_subjects(*)')
        .eq('student_id', student.id)
        .eq('academic_year', selectedYear);

      const { data: recs } = await supabase
        .from('student_recommendations')
        .select('*')
        .eq('student_id', student.id)
        .order('date', { ascending: false });

      setGradeData({
        student,
        grades: grades || [],
        recommendations: recs || []
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGradeLoading(false);
    }
  };

  useEffect(() => {
    if (gradeData?.student?.student_id_no) {
      fetchGradeData(gradeData.student.student_id_no);
    }
  }, [selectedYear]);

  return (
    <div className="max-w-xl mx-auto px-2">
      {/* 0. Section Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-3xl mb-6 border border-slate-200">
        <button 
          onClick={() => setActiveTab('scan')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black transition-all ${activeTab === 'scan' ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <QrCode className="w-4 h-4" />
          اسکنر و استعلام
        </button>
        <button 
          onClick={() => setActiveTab('announcements')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black transition-all ${activeTab === 'announcements' ? 'bg-white text-orange-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Bell className="w-4 h-4" />
          اعلانات مکتب
        </button>
        {!isTeacherMode && (
          <button 
            onClick={() => setActiveTab('grades')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black transition-all ${activeTab === 'grades' ? 'bg-white text-emerald-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <GraduationCap className="w-4 h-4" />
            نمرات و توصیه‌ها
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'scan' ? (
          <motion.div
            key="scan"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* 1. Global Loading Overlay during Verification */}
            {loading && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex flex-col items-center justify-center animate-in fade-in duration-300">
                <div className="bg-white p-10 rounded-[3rem] shadow-2xl flex flex-col items-center gap-6">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                    <Search className="absolute inset-0 m-auto w-6 h-6 text-blue-600/50" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-black text-slate-800 mb-1">در حال استعلام...</h3>
                    <p className="text-xs text-slate-500 font-bold">در حال بازیابی اطلاعات از سرور مرکزی</p>
                  </div>
                </div>
              </div>
            )}

            {/* 1. Advanced Live Search Header */}
            <div className="mb-4 relative">
              <div className="relative z-50 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && verifyCard(searchInput)}
                    placeholder={isTeacherMode ? "جستجوی استاد (نام، کد، موبایل...)" : "جستجوی شاگرد (نام، پلاک، جواز...)"}
                    className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pr-11 pl-4 text-sm outline-none focus:border-blue-500 shadow-sm transition-all"
                  />
                  {isSearching && (
                    <Loader2 className="absolute left-12 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
                  )}
                </div>
                <button 
                  onClick={() => verifyCard(searchInput)}
                  className="bg-slate-800 text-white px-6 py-3.5 rounded-2xl font-bold text-sm hover:bg-slate-900 transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  جستجو
                </button>
              </div>

              {/* Floating Suggestions List */}
              {suggestions.length > 0 && !cardData && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2">
                  <div className="p-3 border-b border-slate-50 bg-slate-50 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase">نتایج پیشنهادی</span>
                    <Info className="w-3 h-3 text-slate-300" />
                  </div>
                  {suggestions.map((driver) => (
                    <button
                      key={driver.id}
                      onClick={() => verifyCard(driver.name)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0 text-right active:bg-blue-100"
                    >
                      <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden shadow-sm flex-shrink-0">
                        {driver.photo_url ? (
                          <img src={driver.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-6 h-6 text-slate-300 m-3" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-800 truncate text-sm mb-1">{driver.name}</h4>
                        <div className="flex gap-2 items-center">
                          <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-500">{isTeacherMode ? 'رتبه' : 'صنف'}: {driver.class_name || driver.vehicle_type}</span>
                          <span className="text-[9px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded font-bold">{isTeacherMode ? 'کد شناسایی' : 'نمبر اساس'}: {driver.student_id_no || driver.license_number}</span>
                        </div>
                      </div>
                      <div className="bg-blue-100 text-blue-600 p-2 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Manual Scanner Toggles */}
            {!cardData && !error && (
              <div className="flex justify-center gap-3 mb-4">
                <button 
                  onClick={() => {
                    setShowScanner(!showScanner);
                    setFingerprintMode(false);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-black text-xs transition-all shadow-md active:scale-95 ${showScanner ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-blue-600 text-white shadow-blue-100'}`}
                >
                  {showScanner ? (
                    <><PowerOff className="w-4 h-4" /> قطع کمره</>
                  ) : (
                    <><Camera className="w-4 h-4" /> اسکن کمره</>
                  )}
                </button>

                <button 
                  onClick={() => {
                    setFingerprintMode(!fingerprintMode);
                    setShowScanner(false);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-black text-xs transition-all shadow-md active:scale-95 ${fingerprintMode ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-white text-blue-600 border border-blue-100'}`}
                >
                  <Fingerprint className="w-4 h-4" />
                  {fingerprintMode ? 'درحال انتظار...' : 'اسکن اثر انگشت'}
                </button>
              </div>
            )}

            {/* Fingerprint Active UI */}
            {!cardData && !error && fingerprintMode && (
              <div className="mb-6 p-10 bg-blue-50 border-2 border-dashed border-blue-200 rounded-[3rem] text-center animate-in zoom-in duration-300">
                 <div className="relative mx-auto w-24 h-24 mb-6">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
                    <div className="relative bg-blue-600 w-24 h-24 rounded-full flex items-center justify-center shadow-xl">
                       <Fingerprint className="w-12 h-12 text-white animate-pulse" />
                    </div>
                 </div>
                 <h3 className="text-xl font-black text-blue-900 mb-2">آماده شناسایی اثر انگشت</h3>
                 <p className="text-xs text-blue-600 font-bold mb-6">لطفاً انگشت خود را روی دستگاه قرار دهید</p>
                 
                  <div className="bg-white/60 p-4 rounded-2xl border border-blue-100 flex items-center justify-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] text-slate-500 font-bold">سیستم آماده دریافت داده از اسکنر می‌باشد</p>
                  </div>
              </div>
            )}

            {/* Camera Section */}
            {!cardData && !error && showScanner && (
              <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                <div className="relative aspect-square max-w-[340px] mx-auto bg-black rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white">
                  <div id="reader" className="w-full h-full"></div>
                  <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-white/20 rounded-3xl relative">
                      <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl animate-pulse" />
                      <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl animate-pulse" />
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl animate-pulse" />
                      <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl animate-pulse" />
                      <div className="absolute left-2 right-2 h-0.5 bg-blue-500/40 animate-[scan_2s_infinite]" />
                    </div>
                  </div>
                  {loading && (
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-center text-slate-400 font-black uppercase tracking-widest">کارت را مقابل کمره بگیرید</p>
              </div>
            )}

            {/* Result: FAKE (Error) */}
            {error && scanStatus === 'fake' && (
              <div className="bg-rose-50 border-2 border-rose-100 p-8 rounded-[3rem] text-center shadow-xl animate-in slide-in-from-bottom duration-500">
                <div className="w-20 h-20 bg-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-rose-200">
                  <ShieldAlert className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-black text-rose-900 mb-3 text-[18px]">کارت غیرمعتبر!</h3>
                <p className="text-rose-700 font-bold mb-8 text-sm px-4 leading-relaxed">
                  این کارت در سیستم ثبت نشده است و غیرمعتبر می‌باشد. احتمال جعل وجود دارد.
                </p>
                <button onClick={resetScanner} className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all">تلاش مجدد</button>
              </div>
            )}

            {/* Result: SUCCESS or EXPIRED */}
            {cardData && (
              <div className="bg-white border border-slate-100 rounded-[3rem] shadow-2xl overflow-hidden relative animate-in slide-in-from-bottom duration-500">
                <div className={`p-4 flex flex-col items-center justify-center gap-2 ${scanStatus === 'expired' ? 'bg-amber-500' : isTeacherMode ? 'bg-emerald-500' : 'bg-blue-600'} text-white`}>
                  <div className="flex items-center gap-3">
                    {scanStatus === 'expired' ? <Clock className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                    <span className="text-sm font-black uppercase tracking-tight">
                      {scanStatus === 'expired' 
                        ? (isTeacherMode ? 'کارت استاد منقضی شده است' : 'کارت شاگرد منقضی شده است')
                        : (isTeacherMode ? 'کارت استاد معتبر و تایید شده' : 'کارت شاگرد معتبر و تایید شده')}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold opacity-90">
                    {scanStatus === 'expired' 
                      ? (isTeacherMode ? 'این کارت در سیستم موجود است اما تاریخ اعتبار آن برای استاد مذکور منقضی شده است.' : 'این کارت در سیستم موجود است اما تاریخ اعتبار آن منقضی شده و نیاز به تمدید دارد.')
                      : (isTeacherMode ? 'هویت استاد در سامانه تایید گردید. کارت کاملاً معتبر است.' : 'این کارت موجود و کاملاً معتبر است و نیازی به تمدید ندارد.')}
                  </p>
                  {lastMatchedFinger && (
                    <div className="mt-2 bg-white/20 px-3 py-1 rounded-lg flex items-center gap-2">
                      <Fingerprint className="w-3 h-3" />
                      <span className="text-[10px] font-black uppercase tracking-tighter">شناسایی شده توسط: انگشت {lastMatchedFinger}</span>
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <div className="flex flex-col items-center gap-4 mb-6 pb-6 border-b border-slate-100 text-center">
                    <div className={`w-28 h-40 bg-slate-100 rounded-[1.5rem] border-4 border-white shadow-xl overflow-hidden bg-cover bg-center ${isTeacherMode ? 'ring-2 ring-emerald-100' : 'ring-2 ring-blue-100'}`} 
                         style={{ backgroundImage: cardData.student.photo_url ? `url(${cardData.student.photo_url})` : 'none' }}>
                      {!cardData.student.photo_url && <UserIcon className="w-16 h-16 text-slate-300 mt-12 mx-auto" />}
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase mb-1">نوم / نام</p>
                      <h3 className="text-2xl font-black text-slate-800 leading-tight">{cardData.student.name}</h3>
                      <span className={`inline-block mt-2 px-3 py-1 ${isTeacherMode ? 'bg-emerald-600' : 'bg-slate-900'} text-white rounded-lg text-[9px] font-bold`}>S/N: {cardData.card.id.slice(0, 8)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6 text-right">
                    {[
                      { label: 'د پلار نوم / نام پدر', value: cardData.student.father_name },
                      { label: isTeacherMode ? 'کد شناسایی' : 'نمبر اساس', value: cardData.student.student_id_no || cardData.student.license_number, mono: true },
                      { label: isTeacherMode ? 'بخش / شعبه' : 'بخش/شعبه', value: cardData.student.license_plate },
                      { label: isTeacherMode ? 'بست / رتبه' : 'صنف', value: cardData.student.class_name || cardData.student.vehicle_type },
                      { label: 'نمبر تذکره', value: cardData.student.id_number },
                      { label: 'گروه خون', value: cardData.student.blood_type, color: 'text-rose-600' },
                      { label: 'شماره تماس', value: cardData.student.phone, mono: true },
                      { label: 'تاریخ انقضا', value: new Date(cardData.card.expiry_date).toLocaleDateString('fa-AF'), color: scanStatus === 'expired' ? 'text-rose-600' : isTeacherMode ? 'text-emerald-600' : 'text-blue-600' }
                    ].map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                        <p className="text-[8px] text-slate-400 font-bold mb-1 uppercase">{item.label}</p>
                        <p className={`font-bold text-slate-800 text-xs sm:text-sm ${item.mono ? 'font-mono' : ''} ${item.color || ''}`}>{item.value || '---'}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mb-6 space-y-3">
                    <div className="flex items-center gap-2 pr-1">
                      <div className={`w-1 h-3 ${isTeacherMode ? 'bg-emerald-600' : 'bg-blue-600'} rounded-full`} />
                      <h4 className="text-[10px] font-black text-slate-900 uppercase">{isTeacherMode ? 'اطلاعات بیومتریک و اداری' : 'اطلاعات پرونده صحی'}</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`${isTeacherMode ? 'bg-emerald-50/50 border-emerald-100' : 'bg-blue-50/50 border-blue-100'} p-3 rounded-xl border`}>
                        <p className={`text-[8px] ${isTeacherMode ? 'text-emerald-500' : 'text-blue-400'} font-bold mb-0.5 uppercase`}>{isTeacherMode ? 'وضعیت تایید' : 'فشار خون'}</p>
                        <p className={`text-xs font-bold ${isTeacherMode ? 'text-emerald-900' : 'text-blue-900'}`}>{isTeacherMode ? 'تایید شده' : (cardData.card.blood_pressure || 'سالم')}</p>
                      </div>
                      <div className={`${isTeacherMode ? 'bg-emerald-50/50 border-emerald-100' : 'bg-blue-50/50 border-blue-100'} p-3 rounded-xl border`}>
                        <p className={`text-[8px] ${isTeacherMode ? 'text-emerald-500' : 'text-blue-400'} font-bold mb-0.5 uppercase`}>{isTeacherMode ? 'آخرین استعلام' : 'وضعیت بینایی'}</p>
                        <p className={`text-xs font-bold ${isTeacherMode ? 'text-emerald-900' : 'text-blue-900'}`}>{isTeacherMode ? 'امروز' : (cardData.card.vision_status || 'سالم')}</p>
                      </div>
                    </div>
                    {cardData.card.notes && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <p className="text-[8px] text-slate-400 font-bold mb-1 uppercase">{isTeacherMode ? 'ملاحظات مدیریتی' : 'ملاحظات داکتر'}</p>
                        <p className="text-[10px] text-slate-700 leading-relaxed font-medium">{cardData.card.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button onClick={resetScanner} className={`w-full py-4 rounded-[1.5rem] font-bold text-lg shadow-xl ${isTeacherMode ? 'bg-emerald-900' : 'bg-slate-900'} text-white active:scale-95 transition-all`}>استعلام جدید</button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ) : activeTab === 'announcements' ? (
          <motion.div
            key="announcements"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="space-y-6 pb-20"
          >
            <div className="flex items-center justify-between mb-4 px-2">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-2xl flex items-center justify-center">
                    <Bell className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">اطلاعیه‌های آموزشی</h3>
                    <p className="text-[10px] font-bold text-slate-400">آخرین اخبار و رویدادهای مکتب</p>
                  </div>
               </div>
               <span className="bg-orange-50 text-orange-600 text-[10px] font-black px-3 py-1 rounded-full border border-orange-100 uppercase">فعال</span>
            </div>

            {announcement ? (
              <div className="space-y-4">
                {/* 1. Text Card */}
                {announcement.text && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => setSelectedContent({ type: 'text', value: announcement.text })}
                    className="group bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 cursor-pointer transition-all hover:border-orange-200 active:scale-95"
                  >
                    <div className="flex items-center gap-2 mb-4">
                       <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">متن اطلاعیه</span>
                    </div>
                    <p className="text-slate-700 leading-loose text-lg font-medium text-right whitespace-pre-wrap group-hover:text-slate-900 transition-colors">
                      {announcement.text}
                    </p>
                    <div className="mt-6 flex justify-end">
                      <div className="text-[10px] font-black text-orange-600 flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-xl group-hover:bg-orange-600 group-hover:text-white transition-all">
                        <Search className="w-3 h-3" />
                        مشاهده کامل متن
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 2. Image Cards */}
                {announcement.images && announcement.images.length > 0 && announcement.images.map((img, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (idx + 1) * 0.1 }}
                    whileHover={{ scale: 1.01 }}
                    className="bg-white border border-slate-100 rounded-[2.5rem] p-3 shadow-xl shadow-slate-200/50 cursor-pointer transition-all hover:border-orange-200 active:scale-95 group overflow-hidden"
                    onClick={() => setSelectedContent({ type: 'image', value: img })}
                  >
                    <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden bg-slate-50 border border-slate-50">
                      <img src={img} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                         <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl px-5 py-3 text-white flex items-center justify-between">
                            <span className="text-xs font-black">مشاهده تصویر {idx + 1}</span>
                            <Search className="w-4 h-4" />
                         </div>
                      </div>
                    </div>
                  </motion.div>
                ))}

                <div className="pt-10 flex flex-col items-center gap-2 opacity-30 grayscale hover:grayscale-0 transition-all">
                  <ShieldCheck className="w-8 h-8 text-slate-400" />
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Smart Education System</p>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-dashed border-slate-200 rounded-[3rem] p-20 text-center">
                <Bell className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                <p className="text-slate-400 font-bold">در حال حاضر اعلانی موجود نیست</p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="grades"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="space-y-6 pb-20"
          >
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl">
              <div className="flex flex-col items-center gap-4 text-center mb-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
                  <GraduationCap className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">استعلام نمرات آموزشی</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1">مشاهده کارنامه و توصیه‌های اساتید</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text"
                    value={gradeSearchInput}
                    onChange={(e) => setGradeSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchGradeData(gradeSearchInput)}
                    placeholder="نمبر اساس (Student ID) را وارد کنید..."
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 pr-14 pl-6 text-sm outline-none focus:border-emerald-500 shadow-inner text-right font-black"
                  />
                </div>
                <button 
                  onClick={() => fetchGradeData(gradeSearchInput)}
                  disabled={gradeLoading}
                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-emerald-100 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  {gradeLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'نمایش کارنامه'}
                </button>
              </div>
            </div>

            {gradeData && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16" />
                   
                   <div className="flex items-center gap-6 mb-8 relative z-10">
                      <div className="w-20 h-28 bg-slate-100 rounded-2xl overflow-hidden border-2 border-white shadow-xl">
                        {gradeData.student.photo_url ? (
                          <img src={gradeData.student.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-10 h-10 text-slate-300 mx-auto mt-8" />
                        )}
                      </div>
                      <div className="text-right">
                        <h4 className="text-2xl font-black text-slate-800 leading-tight">{gradeData.student.name}</h4>
                        <p className="text-sm font-bold text-slate-400">فرزند: {gradeData.student.father_name}</p>
                        <div className="flex items-center gap-2 mt-2">
                           <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-3 py-1 rounded-lg uppercase">{gradeData.student.class_name}</span>
                           <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-3 py-1 rounded-lg border border-emerald-100 uppercase">S/N: {gradeData.student.student_id_no}</span>
                        </div>
                      </div>
                   </div>

                   <div className="flex items-center justify-between mb-6 bg-slate-50 p-4 rounded-2xl">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-black text-slate-800">سال تحصیلی</span>
                      </div>
                      <select 
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black outline-none focus:border-emerald-500"
                      >
                        {[0, 1, 2, 3].map(n => {
                          const yr = (new Date().getFullYear() - n).toString();
                          return <option key={yr} value={yr}>{yr}</option>;
                        })}
                      </select>
                   </div>

                   <div className="space-y-4">
                      <div className="flex items-center gap-2 pr-1">
                        <div className="w-1 h-3 bg-emerald-600 rounded-full" />
                        <h5 className="text-[10px] font-black text-slate-900 uppercase">نمرات مضامین</h5>
                      </div>
                      <div className="bg-slate-50/50 border border-slate-100 rounded-[2rem] overflow-hidden">
                        <table className="w-full text-right text-sm">
                          <thead className="bg-slate-100/50 text-[10px] font-black text-slate-400 border-b border-slate-100">
                            <tr>
                              <th className="px-6 py-4">مضمون</th>
                              <th className="px-6 py-4 text-center">۴.۵ ماهه</th>
                              <th className="px-6 py-4 text-center">سالانه</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {gradeData.grades.length > 0 ? gradeData.grades.map((g, idx) => (
                              <tr key={idx} className="hover:bg-white transition-colors">
                                <td className="px-6 py-4 font-black text-slate-800">{g.subject?.name}</td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`px-3 py-1.5 rounded-xl font-mono text-xs ${g.midterm_grade >= 50 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {g.midterm_grade || '--'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`px-3 py-1.5 rounded-xl font-mono text-xs ${g.final_grade >= 50 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {g.final_grade || '--'}
                                  </span>
                                </td>
                              </tr>
                            )) : (
                              <tr>
                                <td colSpan={3} className="px-6 py-10 text-center text-slate-400 text-xs font-bold">نمره‌ای برای سال {selectedYear} ثبت نشده است</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                   </div>

                   <div className="mt-10 space-y-4">
                      <div className="flex items-center gap-2 pr-1">
                        <div className="w-1 h-3 bg-orange-600 rounded-full" />
                        <h5 className="text-[10px] font-black text-slate-900 uppercase">توصیه‌های معلمین</h5>
                      </div>
                      <div className="space-y-3">
                        {gradeData.recommendations.length > 0 ? gradeData.recommendations.map((re, idx) => (
                          <div key={idx} className="bg-orange-50/50 border border-orange-100 p-5 rounded-3xl relative">
                            <div className="flex justify-between items-center mb-2">
                               <span className="text-[10px] font-black text-orange-600 bg-white px-3 py-1 rounded-full border border-orange-100">{re.reason}</span>
                               <span className="text-[9px] font-bold text-slate-400">{new Date(re.date).toLocaleDateString('fa-AF')}</span>
                            </div>
                            <p className="text-[11px] text-slate-700 leading-relaxed font-medium">{re.content}</p>
                          </div>
                        )) : (
                          <div className="bg-slate-50 p-6 rounded-3xl border border-dashed border-slate-200 text-center">
                             <p className="text-[10px] text-slate-400 font-bold">توصیه‌ای برای این شاگرد ثبت نشده است</p>
                          </div>
                        )}
                      </div>
                   </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full View Lightbox Modal */}
      <AnimatePresence>
        {selectedContent && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-slate-950/95 backdrop-blur-xl flex flex-col overflow-y-auto"
          >
            <div className="sticky top-0 left-0 right-0 p-6 flex justify-between items-center bg-gradient-to-b from-slate-950 to-transparent z-10">
               <button 
                onClick={() => setSelectedContent(null)}
                className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all active:scale-90"
              >
                <PowerOff className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-3 text-white">
                <div className="text-right">
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">مشاهده کامل</p>
                  <p className="text-xs font-bold">{selectedContent.type === 'text' ? 'متن اطلاعیه' : 'تصویر اطلاعیه'}</p>
                </div>
                <div className="w-1 h-8 bg-orange-600 rounded-full" />
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-6 sm:p-20">
               {selectedContent.type === 'text' ? (
                 <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="bg-white/5 border border-white/10 p-10 sm:p-20 rounded-[4rem] max-w-4xl w-full shadow-2xl relative"
                 >
                    <div className="absolute top-10 right-10 opacity-10">
                      <Bell className="w-20 h-20 text-white" />
                    </div>
                    <p className="text-white text-xl sm:text-3xl leading-relaxed font-medium text-right whitespace-pre-wrap select-text">
                      {selectedContent.value}
                    </p>
                 </motion.div>
               ) : (
                 <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="relative group"
                 >
                    <img 
                      src={selectedContent.value} 
                      alt="" 
                      className="max-w-full max-h-[85vh] rounded-[3rem] shadow-2xl border-2 border-white/10 object-contain cursor-zoom-in" 
                      onClick={(e) => {
                        const img = e.currentTarget;
                        img.style.transform = img.style.transform === 'scale(1.5)' ? 'scale(1)' : 'scale(1.5)';
                        img.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
                      }}
                    />
                    <div className="mt-4 flex items-center justify-center gap-2 text-white/40 text-[10px] font-bold">
                       <Info className="w-3 h-3" />
                       <span>برای بزرگنمایی روی تصویر کلیک کنید</span>
                    </div>
                 </motion.div>
               )}
            </div>

            <div className="p-10 text-center">
              <button 
                onClick={() => setSelectedContent(null)}
                className="bg-white text-slate-900 px-10 py-4 rounded-3xl font-black text-sm transition-all hover:bg-orange-500 hover:text-white shadow-2xl"
              >
                بستن و بازگشت
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
      `}</style>
    </div>
  );
};
