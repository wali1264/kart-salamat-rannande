import React, { useEffect, useState } from 'react';
import { ShieldCheck, Loader2, AlertCircle, Camera, Info, ShieldAlert, Clock, User as UserIcon, Search, PowerOff, Fingerprint, Bell, QrCode, GraduationCap, Calendar, Sparkles, Award } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'scan' | 'announcements' | 'grades' | 'attendance'>('scan');
  const [announcement, setAnnouncement] = useState<{ text: string, images: string[] } | null>(null);
  const [gradeSearchInput, setGradeSearchInput] = useState('');
  const [gradeData, setGradeData] = useState<{ student: any, grades: any[], recommendations: any[] } | null>(null);
  const [attendanceInput, setAttendanceInput] = useState('');
  const [attendanceData, setAttendanceData] = useState<{ person: any, logs: any[] } | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [weeksToShow, setWeeksToShow] = useState(1);
  const [gradeLoading, setGradeLoading] = useState(false);
  const luxMode = false;

  const fetchAttendance = async (id: string, isMore = false) => {
    const cleanedId = cleanInputId(id);
    if (!cleanedId) {
      alert('لطفاً یک کد معتبر وارد کنید.');
      return;
    }
    setAttendanceLoading(true);
    try {
      let person = null;
      
      if (isOnline) {
        // Find person - STRICT ID-only search for attendance tab to maintain privacy
        const { data: people, error: pError } = await supabase
          .from('students')
          .select('*')
          .eq('type', isTeacherMode ? 'teacher' : 'student')
          .or(`student_id_no.eq.${cleanedId},license_number.eq.${cleanedId}`);
        
        if (pError) throw pError;
        person = people?.[0];
      } else {
        // Offline: Check cache
        const cached = await offlineDb.cache.where('collection').equals('students').toArray();
        person = cached.map(c => c.data).find(s => 
          s.type === (isTeacherMode ? 'teacher' : 'student') && 
          (cleanInputId(s.student_id_no) === cleanedId || cleanInputId(s.license_number) === cleanedId)
        );
      }
      
      if (!person) {
        setAttendanceData(null);
        alert('شخصی با این کد شناسایی یافت نشد.');
        return;
      }

      const daysCount = (isMore ? weeksToShow + 1 : 1) * 7;
      if (isMore) setWeeksToShow(weeksToShow + 1);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysCount + 1);
      startDate.setHours(0, 0, 0, 0);

      let logs = [];
      if (isOnline) {
        const { data, error: lError } = await supabase
          .from('attendance')
          .select('*')
          .eq('student_id', person.id)
          .gte('recorded_at', startDate.toISOString())
          .order('recorded_at', { ascending: false });

        if (lError) throw lError;
        logs = data || [];
      } else {
        // Offline: Fetch logs from cache
        const cachedLogs = await offlineDb.cache.where('collection').equals('attendance').toArray();
        logs = cachedLogs
          .map(c => c.data)
          .filter(l => l.student_id === person.id && new Date(l.recorded_at) >= startDate)
          .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
      }

      setAttendanceData({ person, logs });
    } catch (err) {
      console.error('Fetch attendance error:', err);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const getAttendanceForDay = (date: Date) => {
    if (!attendanceData) return null;
    const dateStr = date.toISOString().split('T')[0];
    const dayLogs = attendanceData.logs.filter(l => l.recorded_at.startsWith(dateStr));
    
    return {
      entry: dayLogs.find(l => l.type === 'entry')?.recorded_at,
      exit: dayLogs.find(l => l.type === 'exit')?.recorded_at,
      present: dayLogs.find(l => l.type === 'present')?.recorded_at
    };
  };
  const jalaliYears = ['۱۴۰۵', '۱۴۰۶', '۱۴۰۷', '۱۴۰۸', '۱۴۰۹', '۱۴۱۰'];
  const [selectedYear, setSelectedYear] = useState(jalaliYears[0]);
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

  // Convert Persian/Arabic numbers to English and strip all spaces for strict matching
  const cleanInputId = (idStr: string) => {
    if (!idStr) return '';
    const persianDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
    const arabicDigits = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
    let cleaned = idStr.toString().trim();
    for (let i = 0; i < 10; i++) {
      cleaned = cleaned.replace(persianDigits[i], i.toString());
      cleaned = cleaned.replace(arabicDigits[i], i.toString());
    }
    return cleaned.replace(/\s+/g, '');
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
        if (isOnline) {
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
        } else {
          // Offline search in cache
          const cached = await offlineDb.cache.where('collection').equals('students').toArray();
          const qLower = q.toLowerCase();
          const filtered = cached
            .map(c => c.data)
            .filter(s => 
              s.type === mode && 
              (
                normalize(s.name).includes(q) || 
                s.student_id_no?.toLowerCase().includes(qLower) || 
                s.license_number?.toLowerCase().includes(qLower) ||
                s.phone?.includes(q) ||
                normalize(s.father_name).includes(q)
              )
            )
            .slice(0, 6);
          setSuggestions(filtered);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchInput, isOnline, mode]);

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
    
    // Clean S/N patterns (e.g., 'A513345B-233' -> 'A513345B') and strip spaces + convert Persian/Arabic numerals
    const qClean = cleanInputId(q.includes('-') ? q.split('-')[0].trim() : q.trim());

    try {
      let card = null;

      if (isOnline) {
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
      } else {
        // OFFLINE VERIFICATION
        const cachedStudents = await offlineDb.cache.where('collection').equals('students').toArray();
        const student = cachedStudents.map(c => c.data).find(s => 
          s.type === mode && 
          (
            normalize(s.name).includes(qClean) || 
            cleanInputId(s.student_id_no) === qClean || 
            cleanInputId(s.license_number) === qClean ||
            s.id.startsWith(qClean)
          )
        );

        if (student) {
          const cachedCards = await offlineDb.cache.where('collection').equals('health_cards').toArray();
          const studentCard = cachedCards
            .map(c => c.data)
            .filter(c => c.driver_id === student.id)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
          
          if (studentCard) {
            card = { ...studentCard, students: student };
          }
        }
      }

      if (!card) {
        setScanStatus('fake');
        throw new Error('کارت در سیستم یافت نشد. این کارت جعلی است یا اطلاعات آن ثبت نشده است.');
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
    if (!studentIdNo) return;
    setGradeLoading(true);
    setGradeData(null);
    try {
      let student = null;
      if (isOnline) {
        // 1. Find student by ID No
        const { data, error: sError } = await supabase
          .from('students')
          .select('*')
          .eq('student_id_no', studentIdNo.trim())
          .eq('type', 'student')
          .maybeSingle();

        if (sError) throw sError;
        student = data;
      } else {
        // Check offline cache
        const cached = await offlineDb.cache.where('collection').equals('students').toArray();
        student = cached.map(c => c.data).find(s => s.student_id_no === studentIdNo.trim() && s.type === 'student');
      }

      if (!student) throw new Error('شاگردی با این کد شناسایی یافت نشد.');

      // 2. Fetch grades and recommendations
      let grades = [];
      let recs = [];

      if (isOnline) {
        const { data: gData } = await supabase
          .from('grades')
          .select('*, subject:subjects(*)')
          .eq('student_id', student.id)
          .eq('academic_year', selectedYear);
        grades = gData || [];

        const { data: rData } = await supabase
          .from('recommendations')
          .select('*')
          .eq('student_id', student.id)
          .order('issue_date', { ascending: false });
        recs = rData || [];
      } else {
        // Fetch from cache
        const cachedGrades = await offlineDb.cache.where('collection').equals('grades').toArray();
        grades = cachedGrades.map(c => c.data).filter(g => g.student_id === student.id && g.academic_year === selectedYear);
        
        // Match with subjects from cache for display
        const cachedSubjects = await offlineDb.cache.where('collection').equals('subjects').toArray();
        grades = grades.map(g => ({
          ...g,
          subject: cachedSubjects.map(c => c.data).find(s => s.id === g.subject_id)
        }));

        const cachedRecs = await offlineDb.cache.where('collection').equals('recommendations').toArray();
        recs = cachedRecs
          .map(c => c.data)
          .filter(r => r.student_id === student.id)
          .sort((a, b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime());
      }

      setGradeData({
        student,
        grades,
        recommendations: recs
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
      {/* 0. Section Tabs with Framer Motion sliding pill layout */}
      <div className={`flex p-1.5 rounded-2xl mb-6 border transition-all duration-300 ${
        luxMode ? 'bg-zinc-900/90 border-zinc-800' : 'bg-slate-100 border-slate-200'
      }`}>
        {[
          { id: 'scan', label: 'اسکنر هوشمند', icon: QrCode, activeColor: luxMode ? 'text-amber-500' : isTeacherMode ? 'text-emerald-600' : 'text-blue-600' },
          { id: 'announcements', label: 'اعلانات مکتب', icon: Bell, activeColor: luxMode ? 'text-amber-400' : 'text-orange-600' },
          { id: 'attendance', label: 'استعلام حضور', icon: Calendar, activeColor: luxMode ? 'text-amber-400' : 'text-indigo-600' },
          ...(!isTeacherMode ? [{ id: 'grades', label: 'نمرات آموزشی', icon: GraduationCap, activeColor: luxMode ? 'text-amber-400' : 'text-emerald-600' }] : [])
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 sm:py-2.5 rounded-xl text-[10px] font-black transition-all relative z-10 cursor-pointer ${
                isActive ? tab.activeColor : luxMode ? 'text-zinc-500 hover:text-zinc-400' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeScannerTab"
                  className={`absolute inset-0 rounded-xl -z-10 ${
                    luxMode 
                      ? 'bg-zinc-950 border border-amber-500/30 shadow-[0_4px_15px_rgba(245,158,11,0.15)]' 
                      : 'bg-white shadow-[0_4px_15px_rgba(15,23,42,0.06)]'
                  }`}
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                />
              )}
            </button>
          );
        })}
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
              <div className={`fixed inset-0 z-[200] flex flex-col items-center justify-center animate-in fade-in duration-300 ${
                luxMode ? 'bg-black/80 backdrop-blur-md' : 'bg-slate-900/60 backdrop-blur-md'
              }`}>
                <div className={`p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-6 border ${
                  luxMode ? 'bg-zinc-950 border-amber-500/30 text-amber-100' : 'bg-white border-slate-100'
                }`}>
                  <div className="relative">
                    <div className={`w-16 h-16 border-4 rounded-full animate-spin ${
                      luxMode ? 'border-amber-500/20 border-t-amber-500' : 'border-blue-100 border-t-blue-600'
                    }`} />
                    <Search className={`absolute inset-0 m-auto w-6 h-6 ${luxMode ? 'text-amber-500/50' : 'text-blue-600/50'}`} />
                  </div>
                  <div className="text-center">
                    <h3 className={`text-lg font-black mb-1 ${luxMode ? 'text-amber-400 font-sans' : 'text-slate-800'}`}>در حال استعلام هوشمند...</h3>
                    <p className={`text-xs font-bold ${luxMode ? 'text-zinc-500' : 'text-slate-500'}`}>در حال بازیابی هویت دیجیتال و بیومتریک</p>
                  </div>
                </div>
              </div>
            )}

            {/* 1. Advanced Live Search Header */}
            <div className="mb-4 relative">
              <div className="relative z-50 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 ${luxMode ? 'text-amber-500/70' : 'text-slate-400'}`} />
                  <input 
                    type="text" 
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && verifyCard(searchInput)}
                    placeholder={isTeacherMode ? "جستجوی استاد (نام، کد، موبایل...)" : "جستجوی شاگرد (نام، پلاک، جواز...)"}
                    className={`w-full rounded-2xl py-3.5 pr-11 pl-4 text-sm outline-none shadow-sm transition-all ${
                      luxMode 
                        ? 'bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:border-amber-500/80 shadow-[0_4px_12px_rgba(0,0,0,0.5)]' 
                        : 'bg-white border border-slate-200 focus:border-blue-500 text-slate-800'
                    }`}
                  />
                  {isSearching && (
                    <Loader2 className={`absolute left-12 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin ${luxMode ? 'text-amber-500' : 'text-blue-500'}`} />
                  )}
                </div>
                <button 
                  onClick={() => verifyCard(searchInput)}
                  className={`px-6 py-3.5 rounded-2xl font-black text-sm transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap ${
                    luxMode 
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/15' 
                      : 'bg-slate-800 text-white hover:bg-slate-900'
                  }`}
                >
                  جستجو
                </button>
              </div>

              {/* Floating Suggestions List */}
              {suggestions.length > 0 && !cardData && (
                <div className={`absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 border ${
                  luxMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100'
                }`}>
                  <div className={`p-3 flex justify-between items-center border-b ${
                    luxMode ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-slate-50 border-slate-50 text-slate-400'
                  }`}>
                    <span className="text-[10px] font-black uppercase">نتایج پیشنهادی</span>
                    <Info className={`w-3 h-3 ${luxMode ? 'text-amber-500/50' : 'text-slate-300'}`} />
                  </div>
                  {suggestions.map((driver) => (
                    <button
                      key={driver.id}
                      onClick={() => verifyCard(driver.name)}
                      className={`w-full flex items-center gap-4 p-4 transition-colors border-b last:border-0 text-right active:scale-[0.99] origin-center ${
                        luxMode 
                          ? 'hover:bg-zinc-800/80 border-zinc-800/50 text-amber-50 bg-zinc-900' 
                          : 'hover:bg-blue-50 border-slate-50 text-slate-800 bg-white'
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-xl overflow-hidden shadow-sm flex-shrink-0 border ${
                        luxMode ? 'bg-zinc-800 border-zinc-700' : 'bg-slate-100 border-slate-100'
                      }`}>
                        {driver.photo_url ? (
                          <img src={driver.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className={`w-5 h-5 mx-auto mt-3 ${luxMode ? 'text-amber-500/40' : 'text-slate-300'}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-black truncate text-sm mb-0.5 ${luxMode ? 'text-amber-100' : 'text-slate-800'}`}>{driver.name}</h4>
                        <div className="flex gap-2 items-center">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                            luxMode ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-100 text-slate-500'
                          }`}>{isTeacherMode ? 'رتبه' : 'صنف'}: {driver.class_name || driver.vehicle_type}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            luxMode ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-50 text-blue-500'
                          }`}>{isTeacherMode ? 'کد شناسایی' : 'نمبر اساس'}: {driver.student_id_no || driver.license_number}</span>
                        </div>
                      </div>
                      <div className={`p-2 rounded-lg transition-colors ${
                        luxMode ? 'bg-zinc-800 text-amber-500' : 'bg-blue-100 text-blue-600'
                      }`}>
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
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer ${
                    showScanner 
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20' 
                      : luxMode 
                        ? 'bg-zinc-950 text-amber-400 border border-amber-500/30 hover:bg-zinc-900 shadow-amber-500/5' 
                        : 'bg-blue-600 text-white shadow-blue-100'
                  }`}
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
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer ${
                    fingerprintMode 
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' 
                      : luxMode 
                        ? 'bg-zinc-950 text-amber-400 border border-amber-500/30 hover:bg-zinc-900' 
                        : 'bg-white text-blue-600 border border-blue-100'
                  }`}
                >
                  <Fingerprint className="w-4 h-4" />
                  {fingerprintMode ? 'درحال انتظار...' : 'اسکن اثر انگشت'}
                </button>
              </div>
            )}

            {/* Fingerprint Active UI */}
            {!cardData && !error && fingerprintMode && (
              <div className={`mb-6 p-10 rounded-[2.5rem] text-center animate-in zoom-in duration-300 border ${
                luxMode 
                  ? 'bg-zinc-950 border-amber-500/30' 
                  : 'bg-blue-50 border-2 border-dashed border-blue-200'
              }`}>
                 <div className="relative mx-auto w-24 h-24 mb-6">
                    <div className={`absolute inset-0 rounded-full animate-ping ${luxMode ? 'bg-amber-500/10' : 'bg-blue-500/20'}`} />
                    <div className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-xl ${
                      luxMode ? 'bg-amber-500 text-black' : 'bg-blue-600 text-white'
                    }`}>
                       <Fingerprint className="w-12 h-12 animate-pulse" />
                    </div>
                 </div>
                 <h3 className={`text-xl font-black mb-2 ${luxMode ? 'text-amber-400 font-sans' : 'text-blue-900'}`}>آماده شناسایی اثر انگشت</h3>
                 <p className={`text-xs font-bold mb-6 ${luxMode ? 'text-zinc-500' : 'text-blue-600'}`}>لطفاً انگشت خود را روی دستگاه قرار دهید</p>
                 
                  <div className={`p-4 rounded-2xl border flex items-center justify-center gap-3 ${
                    luxMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white/60 border-blue-100'
                  }`}>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className={`text-[10px] font-bold ${luxMode ? 'text-zinc-400' : 'text-slate-500'}`}>سیستم آماده دریافت داده از اسکنر می‌باشد</p>
                  </div>
              </div>
            )}

            {/* Camera Section */}
            {!cardData && !error && showScanner && (
              <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                <div className={`relative aspect-square max-w-[340px] mx-auto rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-300 ${
                  luxMode ? 'border-4 border-amber-500/30 bg-black/90 shadow-amber-500/5' : 'border-4 border-white bg-black'
                }`}>
                  <div id="reader" className="w-full h-full"></div>
                  <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                    <div className={`w-48 h-48 border-2 rounded-3xl relative ${luxMode ? 'border-amber-500/20' : 'border-white/20'}`}>
                      <div className={`absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 rounded-tr-xl animate-pulse ${luxMode ? 'border-amber-400' : 'border-blue-500'}`} />
                      <div className={`absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 rounded-tl-xl animate-pulse ${luxMode ? 'border-amber-400' : 'border-blue-500'}`} />
                      <div className={`absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 rounded-br-xl animate-pulse ${luxMode ? 'border-amber-400' : 'border-blue-500'}`} />
                      <div className={`absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 rounded-bl-xl animate-pulse ${luxMode ? 'border-amber-400' : 'border-blue-500'}`} />
                      <div className={`absolute left-2 right-2 h-0.5 animate-[scan_2s_infinite] ${luxMode ? 'bg-amber-400/60' : 'bg-blue-500/40'}`} />
                    </div>
                  </div>
                  {loading && (
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                      <Loader2 className={`w-8 h-8 animate-spin ${luxMode ? 'text-amber-400' : 'text-white'}`} />
                    </div>
                  )}
                </div>
                <p className={`text-[10px] text-center font-black uppercase tracking-widest ${luxMode ? 'text-amber-500/70' : 'text-slate-400'}`}>
                  کارت را مقابل کمره بگیرید
                </p>
              </div>
            )}

            {/* Result: FAKE (Error) */}
            {error && scanStatus === 'fake' && (
              <div className={`p-8 rounded-[2.5rem] text-center shadow-xl animate-in slide-in-from-bottom duration-500 border ${
                luxMode ? 'bg-zinc-950 border-rose-500/40 text-rose-100 shadow-rose-950/20' : 'bg-rose-50 border-2 border-rose-100 text-rose-900'
              }`}>
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg ${
                  luxMode ? 'bg-rose-950/80 border border-rose-500/40 text-rose-500' : 'bg-rose-500 text-white shadow-rose-200'
                }`}>
                  <ShieldAlert className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-black mb-3">کارت غیرمعتبر!</h3>
                <p className={`font-bold mb-8 text-xs sm:text-sm px-4 leading-relaxed ${luxMode ? 'text-zinc-400' : 'text-rose-700'}`}>
                  این کارت در سیستم ثبت نشده است و غیرمعتبر می‌باشد. احتمال جعل یا عدم هماهنگی اطلاعات وجود دارد.
                </p>
                <button 
                  onClick={resetScanner} 
                  className={`w-full py-4 rounded-xl font-black text-sm active:scale-95 transition-all cursor-pointer ${
                    luxMode ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-600/20' : 'bg-rose-600 text-white shadow-lg'
                  }`}
                >
                  تلاش مجدد
                </button>
              </div>
            )}

            {/* Result: SUCCESS or EXPIRED */}
            {cardData && (
              <div className={`rounded-[2.5rem] shadow-2xl overflow-hidden relative animate-in slide-in-from-bottom duration-500 border-2 ${
                luxMode 
                  ? 'bg-zinc-950 border-amber-500/30 text-amber-100 shadow-[0_12px_40px_rgba(234,179,8,0.15)] font-sans' 
                  : 'bg-white border-slate-100'
              }`}>
                <div className={`p-5 flex flex-col items-center justify-center gap-2 text-white ${
                  scanStatus === 'expired' 
                    ? 'bg-amber-600' 
                    : luxMode 
                      ? 'bg-gradient-to-r from-zinc-900 via-amber-900/40 to-zinc-900 border-b border-amber-500/20' 
                      : isTeacherMode 
                        ? 'bg-emerald-500' 
                        : 'bg-blue-600'
                }`}>
                  <div className="flex items-center gap-3">
                    {scanStatus === 'expired' ? (
                      <Clock className={`w-5 h-5 ${luxMode ? 'text-amber-400' : 'text-white'}`} />
                    ) : (
                      <ShieldCheck className={`w-5 h-5 ${luxMode ? 'text-amber-400' : 'text-white'}`} />
                    )}
                    <span className={`text-xs font-black uppercase tracking-tight ${luxMode ? 'text-amber-400' : 'text-white'}`}>
                      {scanStatus === 'expired' 
                        ? (isTeacherMode ? 'کارت استاد منقضی شده است' : 'کارت شاگرد منقضی شده است')
                        : (isTeacherMode ? 'کارت استاد معتبر و تایید شده' : 'کارت شاگرد معتبر و تایید شده')}
                    </span>
                  </div>
                  <p className={`text-[10px] text-center font-bold px-2 ${luxMode ? 'text-zinc-400' : 'text-white/90'}`}>
                    {scanStatus === 'expired' 
                      ? (isTeacherMode ? 'این کارت در سیستم موجود است اما تاریخ اعتبار آن برای استاد مذکور منقضی شده است.' : 'این کارت در سیستم موجود است اما تاریخ اعتبار آن منقضی شده و نیاز به تمدید دارد.')
                      : (isTeacherMode ? 'هویت استاد در سامانه تایید گردید. کارت کاملاً معتبر است.' : 'این کارت موجود و کاملاً معتبر است و نیازی به تمدید ندارد.')}
                  </p>
                  {lastMatchedFinger && (
                    <div className={`mt-2 px-3 py-1 rounded-lg flex items-center gap-2 ${luxMode ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-white/20'}`}>
                      <Fingerprint className="w-3 h-3" />
                      <span className="text-[10px] font-black uppercase tracking-tighter">شناسایی شده توسط: اثر انگشت {lastMatchedFinger}</span>
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <div className="flex flex-col items-center gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-zinc-800 text-center relative">
                    {luxMode && (
                      <div className="absolute top-0 right-0 left-0 flex justify-center -translate-y-4">
                        <span className="bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[8px] font-black tracking-widest px-3 py-0.5 rounded-full uppercase flex items-center gap-1.5 shadow-[0_2px_10px_rgba(245,158,11,0.05)]">
                          <Award className="w-3 h-3" />
                          عضو ویژه مکتب ملکی
                        </span>
                      </div>
                    )}
                    
                    <div className={`w-28 h-36 rounded-2xl border-4 shadow-xl overflow-hidden bg-cover bg-center transition-all ${
                      luxMode 
                        ? 'border-amber-500/40 shadow-amber-500/5 ring-4 ring-amber-500/10' 
                        : isTeacherMode 
                          ? 'border-white ring-2 ring-emerald-100' 
                          : 'border-white ring-2 ring-blue-100'
                    }`} 
                         style={{ backgroundImage: cardData.student.photo_url ? `url(${cardData.student.photo_url})` : 'none' }}>
                      {!cardData.student.photo_url && <UserIcon className={`w-16 h-16 mt-10 mx-auto ${luxMode ? 'text-amber-500/20' : 'text-slate-300'}`} />}
                    </div>
                    
                    <div>
                      <p className={`text-[8px] font-black uppercase mb-1 ${luxMode ? 'text-zinc-500' : 'text-slate-400'}`}>نوم / نام</p>
                      <h3 className={`text-xl font-bold leading-tight ${luxMode ? 'text-amber-100 font-sans' : 'text-slate-800'}`}>{cardData.student.name}</h3>
                      <span className={`inline-block mt-2 px-3 py-1 rounded-md text-[9px] font-bold ${
                        luxMode ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400' : isTeacherMode ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'
                      }`}>S/N: {cardData.card.id.slice(0, 8)}</span>
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
                      { label: 'تاریخ انقضا', value: new Date(cardData.card.expiry_date).toLocaleDateString('fa-AF'), color: scanStatus === 'expired' ? 'text-rose-500' : luxMode ? 'text-amber-400' : isTeacherMode ? 'text-emerald-500' : 'text-blue-500' }
                    ].map((item, idx) => (
                      <div key={idx} className={`p-3 rounded-xl border ${
                        luxMode 
                          ? 'bg-zinc-900/60 border-zinc-800/80 text-zinc-300' 
                          : 'bg-slate-50/80 border-slate-100 text-slate-800'
                      }`}>
                        <p className={`text-[8px] font-bold mb-1 uppercase ${luxMode ? 'text-zinc-500' : 'text-slate-400'}`}>{item.label}</p>
                        <p className={`font-bold text-xs sm:text-xs ${item.mono ? 'font-mono' : ''} ${item.color || ''}`}>{item.value || '---'}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mb-6 space-y-3">
                    <div className="flex items-center gap-2 pr-1">
                      <div className={`w-1 h-3 rounded-full ${luxMode ? 'bg-amber-500' : isTeacherMode ? 'bg-emerald-600' : 'bg-blue-600'}`} />
                      <h4 className={`text-[10px] font-black uppercase ${luxMode ? 'text-amber-400' : 'text-slate-900'}`}>
                        {isTeacherMode ? 'اطلاعات بیومتریک و اداری' : 'اطلاعات پرونده صحی'}
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`p-3 rounded-xl border ${
                        luxMode 
                          ? 'bg-zinc-900/40 border-zinc-800 text-zinc-300' 
                          : isTeacherMode 
                            ? 'bg-emerald-50/50 border-emerald-100 text-slate-800' 
                            : 'bg-blue-50/50 border-blue-100 text-slate-800'
                      }`}>
                        <p className={`text-[8px] font-bold mb-0.5 uppercase ${
                          luxMode ? 'text-amber-500/60' : isTeacherMode ? 'text-emerald-500' : 'text-blue-400'
                        }`}>{isTeacherMode ? 'وضعیت تایید' : 'فشار خون'}</p>
                        <p className="text-xs font-bold">{isTeacherMode ? 'تایید شده' : (cardData.card.blood_pressure || 'سالم')}</p>
                      </div>
                      <div className={`p-3 rounded-xl border ${
                        luxMode 
                          ? 'bg-zinc-900/40 border-zinc-800 text-zinc-300' 
                          : isTeacherMode 
                            ? 'bg-emerald-50/50 border-emerald-100 text-slate-800' 
                            : 'bg-blue-50/50 border-blue-100 text-slate-800'
                      }`}>
                        <p className={`text-[8px] font-bold mb-0.5 uppercase ${
                          luxMode ? 'text-amber-500/60' : isTeacherMode ? 'text-emerald-500' : 'text-blue-400'
                        }`}>{isTeacherMode ? 'آخرین استعلام' : 'وضعیت بینایی'}</p>
                        <p className="text-xs font-bold">{isTeacherMode ? 'امروز' : (cardData.card.vision_status || 'سالم')}</p>
                      </div>
                    </div>
                    {cardData.card.notes && (
                      <div className={`p-3 rounded-xl border ${
                        luxMode ? 'bg-zinc-900/40 border-zinc-850' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <p className={`text-[8px] font-bold mb-1 uppercase ${luxMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                          {isTeacherMode ? 'ملاحظات مدیریتی' : 'ملاحظات داکتر'}
                        </p>
                        <p className={`text-[10px] leading-relaxed font-medium ${luxMode ? 'text-zinc-400' : 'text-slate-700'}`}>
                          {cardData.card.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={resetScanner} 
                      className={`w-full py-4 rounded-xl font-bold text-sm shadow-xl active:scale-95 transition-all cursor-pointer ${
                        luxMode 
                          ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-black shadow-lg shadow-amber-500/10' 
                          : isTeacherMode 
                            ? 'bg-emerald-950 text-white' 
                            : 'bg-slate-900 text-white'
                      }`}
                    >
                      استعلام جدید
                    </button>
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
        ) : activeTab === 'attendance' ? (
          <motion.div
            key="attendance"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="space-y-6 pb-20"
          >
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl">
              <div className="flex flex-col items-center gap-4 text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">استعلام حضور و غیاب</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1">مشاهده زمان ورود و خروج هفتگی</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text"
                    value={attendanceInput}
                    onChange={(e) => setAttendanceInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchAttendance(attendanceInput)}
                    placeholder={isTeacherMode ? "کد شناسایی استاد را وارد کنید..." : "نمبر اساس شاگرد را وارد کنید..."}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 pr-14 pl-6 text-sm outline-none focus:border-blue-500 shadow-inner text-right font-black"
                  />
                </div>
                <button 
                  onClick={() => fetchAttendance(attendanceInput)}
                  disabled={attendanceLoading}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  {attendanceLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'نمایش گزارش حضور'}
                </button>
              </div>
            </div>

            {attendanceData && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16" />
                   
                   <div className="flex items-center gap-6 mb-8 relative z-10">
                      <div className="w-20 h-28 bg-slate-100 rounded-2xl overflow-hidden border-2 border-white shadow-xl">
                        {attendanceData.person.photo_url ? (
                          <img src={attendanceData.person.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-10 h-10 text-slate-300 mx-auto mt-8" />
                        )}
                      </div>
                      <div className="text-right flex-1">
                        <h4 className="text-2xl font-black text-slate-800 leading-tight">{attendanceData.person.name}</h4>
                        <p className="text-sm font-bold text-slate-400">فرزند: {attendanceData.person.father_name}</p>
                        <div className="flex items-center gap-2 mt-2">
                           <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-3 py-1 rounded-lg uppercase">{attendanceData.person.class_name || attendanceData.person.vehicle_type}</span>
                           <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-3 py-1 rounded-lg border border-blue-100 uppercase">S/N: {attendanceData.person.student_id_no || attendanceData.person.license_number}</span>
                        </div>
                      </div>
                   </div>

                   <div className="overflow-hidden rounded-3xl border border-slate-100">
                      <table className="w-full text-right">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase">روز و تاریخ</th>
                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase text-center">{isTeacherMode ? 'ورود استاد' : 'ورود شاگرد'}</th>
                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase text-center">{isTeacherMode ? 'خروج استاد' : 'خروج شاگرد'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {Array.from({ length: 7 * weeksToShow }).map((_, i) => {
                            const date = new Date();
                            date.setDate(date.getDate() - i);
                            const records = getAttendanceForDay(date);
                            const isToday = i === 0;
                            const dayName = date.toLocaleDateString('fa-AF', { weekday: 'long' });
                            const dateStr = date.toLocaleDateString('fa-AF', { day: 'numeric', month: 'long' });

                            return (
                              <tr key={i} className={`group transition-colors ${isToday ? 'bg-orange-50/50' : 'hover:bg-slate-50'}`}>
                                <td className="px-4 py-4">
                                  <div className="flex flex-col">
                                    <span className={`text-sm font-black ${isToday ? 'text-orange-600' : 'text-slate-700'}`}>
                                      {dayName} {isToday && '(امروز)'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-bold">{dateStr}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-center">
                                  {records?.entry || records?.present ? (
                                    <div className="flex flex-col items-center">
                                       <span className="bg-emerald-100 text-emerald-700 text-[11px] font-black px-3 py-1 rounded-full border border-emerald-200">
                                          {new Date(records.entry || records.present!).toLocaleTimeString('fa-AF', { hour: '2-digit', minute: '2-digit' })}
                                       </span>
                                       <span className="text-[9px] text-emerald-500 font-bold mt-1">تایید شد</span>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-300 font-bold italic">ثبت نشده</span>
                                  )}
                                </td>
                                <td className="px-4 py-4 text-center">
                                  {records?.exit ? (
                                    <div className="flex flex-col items-center">
                                       <span className="bg-rose-100 text-rose-700 text-[11px] font-black px-3 py-1 rounded-full border border-rose-200">
                                          {new Date(records.exit).toLocaleTimeString('fa-AF', { hour: '2-digit', minute: '2-digit' })}
                                       </span>
                                       <span className="text-[9px] text-rose-500 font-bold mt-1">خروج ثبت شد</span>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-300 font-bold italic">ثبت نشده</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                   </div>

                   <button 
                    onClick={() => fetchAttendance(attendanceInput, true)}
                    disabled={attendanceLoading}
                    className="w-full mt-6 py-4 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 transition-all font-black text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                   >
                     {attendanceLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                     نمایش رکوردهای بیشتر (هفته قبل)
                   </button>
                </div>
              </motion.div>
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
                        {jalaliYears.map(yr => (
                          <option key={yr} value={yr}>{yr}</option>
                        ))}
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
                                  <span className={`px-3 py-1.5 rounded-xl font-mono text-xs ${g.midterm_score >= 50 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {g.midterm_score || '--'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`px-3 py-1.5 rounded-xl font-mono text-xs ${g.final_score >= 50 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {g.final_score || '--'}
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
                               <span className="text-[10px] font-black text-orange-600 bg-white px-3 py-1 rounded-full border border-orange-100">{re.recommendation_type}</span>
                               <span className="text-[9px] font-bold text-slate-400">{new Date(re.issue_date).toLocaleDateString('fa-AF')}</span>
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
