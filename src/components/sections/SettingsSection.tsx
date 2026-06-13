import React, { useState, useEffect, useRef } from 'react';
import { User, Shield, Info, LogOut, Bell, Monitor, Globe, Download, Upload, Image as ImageIcon, Check, CreditCard, DollarSign, LifeBuoy, Layers, AlertCircle, Phone, Mail, ExternalLink, PlusCircle, X, Clock, Loader2, Trash2, MessageSquare, Search, RotateCcw, FileText, Mic, Square, Play, Pause, Volume2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useSync } from '../../contexts/SyncContext';
import { offlineDb } from '../../lib/db';
import { compressImage } from '../../lib/utils';
import { getNotificationSettings, saveNotificationSettings, NotificationSettings, syncNotificationSettingsToDb, loadNotificationSettingsFromDb } from '../../lib/notifications';
import { 
  getAndroidConfig, 
  saveAndroidConfig, 
  getAndroidPermissions, 
  saveAndroidPermissions, 
  getAndroidLogs, 
  clearAndroidLogs, 
  addAndroidLog, 
  requestAndroidPermission, 
  runAndroidGatewayWorker,
  fetchAndroidLogsFromDb,
  checkActualAndroidPermissions,
  AndroidConfig,
  AndroidPermissionStatus,
  AndroidLogEntry,
  isNativeAndroid,
  forceGrantAllAndroidPermissions,
  resetAndroidPermissions
} from '../../lib/androidBridge';
import { motion, AnimatePresence } from 'framer-motion';

export const SettingsSection: React.FC = () => {
  const { profile, signOut } = useAuth();
  const { performAction, isOnline } = useSync();
  const [activeTab, setActiveTab] = useState<'general' | 'card' | 'tax' | 'backup' | 'support' | 'items' | 'announcements' | 'notifications'>('general');
  const [logoLoading, setLogoLoading] = useState(false);
  const [logos, setLogos] = useState({ main: '', mini: '' });
  const [announcement, setAnnouncement] = useState({ text: '', images: [] as string[] });
  const [notificationConfig, setNotificationConfig] = useState<NotificationSettings | null>(null);
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

  // Android Native Gateway State
  const [androidPermissions, setAndroidPermissions] = useState<AndroidPermissionStatus>(getAndroidPermissions());
  const [androidConfig, setAndroidConfig] = useState<AndroidConfig>(getAndroidConfig());
  const [androidLogs, setAndroidLogs] = useState<AndroidLogEntry[]>(getAndroidLogs());
  const [isSimulatingBackgroundWorker, setIsSimulatingBackgroundWorker] = useState<boolean>(false);
  const [isAutoWorkerActive, setIsAutoWorkerActive] = useState<boolean>(false);

  // Manager Direct Voice Recorder States
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(() => {
    return localStorage.getItem('school_voice_announcement_url') || null;
  });
  const [recordedAudioBase64, setRecordedAudioBase64] = useState<string | null>(() => {
    return localStorage.getItem('school_voice_announcement_base64') || null;
  });
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [isPlayingRecorded, setIsPlayingRecorded] = useState<boolean>(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const startVoiceRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        addAndroidLog('error', 'خطا: مرورگر شما از ضبط زنده پشتیبانی نمی‌کند یا دسترسی امن HTTPS برقرار نیست.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Convert blob to base64 for persistent localStorage / offlineDb syncing
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64String = reader.result as string;
          setRecordedAudioBase64(base64String);
          localStorage.setItem('school_voice_announcement_base64', base64String);
          addAndroidLog('success', 'صوت ضبط‌شده جدید مدیر با موفقیت انکود و در گیت‌وی ذخیره گردید.');
          // Immediate cloud sync of settings and the written voice announcement
          await syncNotificationSettingsToDb(notificationConfig, base64String);
        };

        setRecordedAudioUrl(audioUrl);
        localStorage.setItem('school_voice_announcement_url', audioUrl);
        
        // Cleanup actual stream tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      audioIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      addAndroidLog('info', 'سیستم ضبط صدای زنده مدیر شروع گردید. لطفاً صحبت کنید...');
    } catch (err: any) {
      addAndroidLog('error', `ناتوانی در دسترسی به سخت‌افزار میکروفون: ${err.message || err}`);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
        audioIntervalRef.current = null;
      }
    }
  };

  const playRecordedAudio = () => {
    const audioSrc = recordedAudioUrl || recordedAudioBase64;
    if (!audioSrc) {
      addAndroidLog('warn', 'هیچ فایل ضبط‌شده‌ای یافت نشد.');
      return;
    }

    if (isPlayingRecorded && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlayingRecorded(false);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const player = new Audio(audioSrc);
      audioPlayerRef.current = player;
      player.onended = () => {
        setIsPlayingRecorded(false);
        addAndroidLog('info', 'بازپخش آزمایشی صوت به پایان رسید.');
      };
      player.play();
      setIsPlayingRecorded(true);
      addAndroidLog('info', 'شروع پخش آزمایشی اعلان صوتی مدیر برای تست صحولت مکالمه صوتی رباتیک...');
    }
  };

  const deleteRecordedAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setIsPlayingRecorded(false);
    setRecordedAudioUrl(null);
    setRecordedAudioBase64(null);
    localStorage.removeItem('school_voice_announcement_url');
    localStorage.removeItem('school_voice_announcement_base64');
    addAndroidLog('warn', 'فایل صوتی اختصاصی مدیر سنترال به طور کامل پاک شد.');
  };

  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64String = reader.result as string;
      setRecordedAudioBase64(base64String);
      localStorage.setItem('school_voice_announcement_base64', base64String);

      const url = URL.createObjectURL(file);
      setRecordedAudioUrl(url);
      localStorage.setItem('school_voice_announcement_url', url);

      addAndroidLog('success', `فایل صوتی بارگذاری شده [${file.name}] به جای صوت ضبط‌شده مدیر جایگزین شد.`);
      // Sync immediately to the cloud database
      await syncNotificationSettingsToDb(notificationConfig, base64String);
    };
  };

  // Live Task Monitor States (Phase 3)
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksFilterType, setTasksFilterType] = useState<'all' | 'sms' | 'whatsapp' | 'voice'>('all');
  const [tasksFilterStatus, setTasksFilterStatus] = useState<'all' | 'pending' | 'sent' | 'failed'>('all');
  const [tasksSearch, setTasksSearch] = useState('');
  const [tasksError, setTasksError] = useState<string | null>(null);

  const fetchTasks = async () => {
    if (activeTab !== 'notifications') return;
    setTasksLoading(true);
    setTasksError(null);
    try {
      let combinedTasks: any[] = [];

      // 1. Fetch offline pending tasks from Dexie syncQueue
      const localQueue = await offlineDb.syncQueue.where('collection').equals('tasks').toArray();
      const localPending = localQueue.map(item => ({
        ...item.payload,
        isLocalOnly: true,
        status: 'pending'
      }));
      combinedTasks = [...localPending];

      // 2. Fetch official synced/pending/failed items from Supabase if online
      if (isOnline) {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(300);

        if (error) throw error;

        if (data) {
          // Avoid duplicating items that are still waiting in local sync queue
          const localIds = new Set(localPending.map(x => x.id));
          const remoteFiltered = data.filter(x => !localIds.has(x.id));
          combinedTasks = [...combinedTasks, ...remoteFiltered];
        }
      }

      setTasks(combinedTasks);
    } catch (err: any) {
      console.error('Error fetching tasks queue:', err);
      // Don't show critical error to users for harmless fetching issues
    } finally {
      setTasksLoading(false);
    }
  };

  const handleRetryFailedTasks = async () => {
    if (!isOnline) {
      alert('این عملیات نیازمند اتصال فعال به انترنت می‌باشد.');
      return;
    }
    try {
      setTasksLoading(true);
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: 'pending', 
          updated_at: new Date().toISOString() 
        })
        .eq('status', 'failed');

      if (error) throw error;
      alert('تمامی پیام‌های ناموفق با موفقیت مجدداً آماده ارسال شدند.');
      await fetchTasks();
    } catch (err) {
      console.error('Failed to retry all tasks:', err);
      alert('خطا در بروزرسانی مجدد صف پیام‌ها.');
    } finally {
      setTasksLoading(false);
    }
  };

  const handleRetrySingleTask = async (taskId: string) => {
    if (!isOnline) {
      alert('اتصال انترنت برقرار نیست.');
      return;
    }
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: 'pending', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', taskId);

      if (error) throw error;
      await fetchTasks();
    } catch (err) {
      console.error('Failed to retry task:', err);
    }
  };

  const handleDeleteTask = async (task: any) => {
    if (!confirm('آیا مطمئناً می‌خواهید این پیام را از صف حذف نمایید؟')) return;
    try {
      if (task.isLocalOnly) {
        // Find inside Dexie queue
        const localQueue = await offlineDb.syncQueue.where('collection').equals('tasks').toArray();
        const found = localQueue.find(item => item.payload.id === task.id);
        if (found && found.id) {
          await offlineDb.syncQueue.delete(found.id);
        }
      } else {
        if (!isOnline) {
          alert('برای حذف پیام‌های همگام‌شده با سرور به انترنت نیاز دارید.');
          return;
        }
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', task.id);
          
        if (error) throw error;
      }
      await fetchTasks();
    } catch (err) {
      console.error('Failed to delete task:', err);
      alert('خطا در حذف وظیفه.');
    }
  };

  const handleClearAllTasksLogs = async () => {
    if (!confirm('آیا مطمئن هستید که می‌خواهید کل مخزن پیامک‌ها و تاریخچه وظایف ارسال شده را از سرور پاک کنید؟')) return;
    try {
      setTasksLoading(true);
      const { error } = await supabase
        .from('tasks')
        .delete()
        .neq('status', 'pending'); // keep only unsent in safety limit

      if (error) throw error;
      alert('تاریخچه گزارشات با موفقیت تخلیه شد.');
      await fetchTasks();
    } catch (err) {
      console.error('Error clearing tasks logs:', err);
      alert('خطا در پاکسازی تاریخچه.');
    } finally {
      setTasksLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [activeTab, isOnline]);

  // Register Android Log synchronization and auto worker loop
  useEffect(() => {
    const handleLogsUpdate = () => {
      setAndroidLogs(getAndroidLogs());
    };
    window.addEventListener('android_logs_updated', handleLogsUpdate);

    // Dynamic Cloud Polling to sync logs across different devices/clients
    let interval: NodeJS.Timeout;
    if (isOnline) {
      fetchAndroidLogsFromDb().then(dbLogs => {
        if (dbLogs && dbLogs.length > 0) {
          setAndroidLogs(dbLogs);
        }
      });

      interval = setInterval(async () => {
        const dbLogs = await fetchAndroidLogsFromDb();
        if (dbLogs && dbLogs.length > 0) {
          setAndroidLogs(dbLogs);
        }
      }, 3000); // refresh every 3 seconds for perfect real-time feedback
    }

    return () => {
      window.removeEventListener('android_logs_updated', handleLogsUpdate);
      if (interval) clearInterval(interval);
    };
  }, [isOnline]);

  useEffect(() => {
    if (activeTab === 'notifications') {
      checkActualAndroidPermissions().then(realPerms => {
        setAndroidPermissions(realPerms);
      });
    }
  }, [activeTab]);

  useEffect(() => {
    if (!isAutoWorkerActive) return;
    
    addAndroidLog('info', 'سرویس پس‌زمینه خودکار اندروید فعال گردید. در حال شنیدن به صف پیام‌ها و تماس‌ها...');
    
    const interval = setInterval(async () => {
      await runAndroidGatewayWorker(isOnline);
      await fetchTasks();
    }, 15000); // Check tasks every 15s in background mode

    return () => {
      clearInterval(interval);
      addAndroidLog('info', 'سرویس پس‌زمینه خودکار اندروید متوقف شد.');
    };
  }, [isAutoWorkerActive, isOnline]);

  const handleRequestPermission = async (permission: keyof AndroidPermissionStatus) => {
    await requestAndroidPermission(permission);
    setAndroidPermissions(getAndroidPermissions());
  };

  const updateAndroidConfig = (key: keyof AndroidConfig, value: any) => {
    const updated = { ...androidConfig, [key]: value };
    setAndroidConfig(updated);
    saveAndroidConfig(updated);
    addAndroidLog('info', `تنظیمات تغییر یافت: ${key} = ${value}`);
  };

  const handleManualRunWorker = async () => {
    setIsSimulatingBackgroundWorker(true);
    addAndroidLog('info', 'شروع اجرای اضطراری و فوری پردازشگر سیم‌کارت صوتی و متنی به خواست اپراتور...');
    try {
      const processed = await runAndroidGatewayWorker(isOnline);
      addAndroidLog('success', `پردازش فوری به پایان رسید. تعداد پیام‌ها/تماس‌های ارسال شده: ${processed}`);
      await fetchTasks();
    } catch (e: any) {
      addAndroidLog('error', `خطا در پردازش فوری: ${e.message || e}`);
    } finally {
      setIsSimulatingBackgroundWorker(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    setNotificationConfig(getNotificationSettings());

    const loadCloudSettings = async () => {
      try {
        const { settings, voiceBase64 } = await loadNotificationSettingsFromDb();
        setNotificationConfig(settings);
        if (voiceBase64) {
          setRecordedAudioBase64(voiceBase64);
          const audioBlob = await (await fetch(voiceBase64)).blob();
          const url = URL.createObjectURL(audioBlob);
          setRecordedAudioUrl(url);
          localStorage.setItem('school_voice_announcement_url', url);
        }
      } catch (err) {
        console.warn('Silent cloud settings fetching failed, using local fallback:', err);
      }
    };
    loadCloudSettings();
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

        // Fetch announcements
        const { data: annData } = await supabase.from('announcements').select('*').eq('id', '00000000-0000-0000-0000-000000000000').maybeSingle();
        if (annData) {
          setAnnouncement({
            text: annData.content || '',
            images: Array.isArray(annData.images) ? annData.images : []
          });
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
        // Removed teacher_tax_threshold and teacher_tax_rate as they don't exist in DB schema yet
      }

      if (targetSetting === 'all' || targetSetting === 'cats') {
        updates.student_categories = categories;
      }

      const { error, queued } = await performAction(
        'system_settings',
        'upsert',
        updates,
        () => supabase
          .from('system_settings')
          .upsert(updates)
      );

      if (error) throw error;
      
      setSaveStatus(queued ? 'queued' : 'success');
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
    { id: 'announcements', label: 'اعلانات', icon: Bell },
    { id: 'notifications', label: 'اطلاع‌رسانی خودکار (SMS)', icon: MessageSquare },
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
        {saveStatus === 'queued' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 text-amber-600 px-6 py-3 rounded-2xl flex items-center gap-3 font-black text-xs border-2 border-amber-100 shadow-sm"
          >
            <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            تغییرات در صف قرار گرفت و پس از اتصال ذخیره می‌شود
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

            {activeTab === 'announcements' && (
              <motion.div 
                key="announcements"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 text-right">
                  <h4 className="font-bold text-slate-800 flex items-center gap-3 text-lg text-orange-600">
                    <Bell className="w-6 h-6" />
                    مدیریت اعلانات مکتب
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed bg-orange-50/50 p-5 rounded-2xl border border-orange-100/50">
                    متن و تصاویری که در این بخش وارد می‌کنید در بخش اسکنر (عمومی) برای تمام کاربران و شاگردان نمایش داده خواهد شد.
                  </p>
                  
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block px-2">متن اعلان</label>
                    <textarea 
                      value={announcement.text}
                      onChange={(e) => setAnnouncement(prev => ({ ...prev, text: e.target.value }))}
                      rows={6}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-orange-100 outline-none transition-all placeholder:text-slate-300"
                      placeholder="متن اعلان را اینجا بنویسید..."
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block px-2">تصاویر اعلان (حداکثر ۳ تصویر)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[0, 1, 2].map((idx) => (
                        <div key={idx} className="space-y-2">
                          <label className="relative block h-32 bg-slate-50 border border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-orange-300 transition-all overflow-hidden group">
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const compressed = await compressImage(file, 800);
                                  const newImages = [...announcement.images];
                                  newImages[idx] = compressed;
                                  setAnnouncement(prev => ({ ...prev, images: newImages }));
                                }
                              }} 
                            />
                            {announcement.images[idx] ? (
                              <div className="absolute inset-0 flex items-center justify-center bg-white">
                                <img src={announcement.images[idx]} alt="" className="w-full h-full object-contain" />
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    const newImages = [...announcement.images];
                                    newImages.splice(idx, 1);
                                    setAnnouncement(prev => ({ ...prev, images: newImages }));
                                  }}
                                  className="absolute top-2 left-2 p-1.5 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                <ImageIcon className="w-6 h-6 text-slate-200 group-hover:text-orange-500 transition-colors" />
                                <span className="text-[10px] font-bold text-slate-400">تصویر {idx + 1}</span>
                              </div>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                    <button 
                      onClick={async () => {
                        if (!confirm('آیا مطمئن هستید که می‌خواهید این اعلان را کاملاً پاک کنید؟')) return;
                        setIsSaving(true);
                        try {
                          const { error } = await performAction('announcements', 'delete', { id: '00000000-0000-0000-0000-000000000000' }, 
                            () => supabase.from('announcements').delete().eq('id', '00000000-0000-0000-0000-000000000000')
                          );
                          if (error) throw error;
                          setAnnouncement({ text: '', images: [] });
                          setSaveStatus('success');
                          setTimeout(() => setSaveStatus(null), 3000);
                        } catch (err) {
                          console.error('Delete announcement error:', err);
                          setSaveStatus('error');
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      disabled={isSaving}
                      className="bg-slate-100 text-slate-500 px-6 py-4 rounded-2xl text-xs font-black transition-all hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      حذف کل اعلان
                    </button>

                    <button 
                      onClick={async () => {
                        setIsSaving(true);
                        try {
                          const cleanImages = announcement.images.filter(img => typeof img === 'string' && img.length > 0);
                          const { error } = await performAction('announcements', 'upsert', {
                            id: '00000000-0000-0000-0000-000000000000',
                            content: announcement.text,
                            images: cleanImages,
                            updated_at: new Date().toISOString()
                          }, () => supabase.from('announcements').upsert({
                            id: '00000000-0000-0000-0000-000000000000',
                            content: announcement.text,
                            images: cleanImages,
                            updated_at: new Date().toISOString()
                          }));
                          if (error) throw error;
                          setSaveStatus('success');
                          setTimeout(() => setSaveStatus(null), 3000);
                        } catch (err) {
                          console.error('Save announcement error:', err);
                          setSaveStatus('error');
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      disabled={isSaving}
                      className="bg-orange-600 text-white px-10 py-4 rounded-2xl text-sm font-black transition-all hover:bg-orange-700 shadow-xl shadow-orange-100 disabled:opacity-50 flex items-center gap-3"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Check className="w-5 h-5 text-white" />}
                      ذخیره و انتشار اعلان
                    </button>
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

            {activeTab === 'notifications' && notificationConfig && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 text-right"
              >
                {/* Header Information */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-3">
                  <h4 className="font-bold text-slate-800 flex items-center gap-3 text-lg">
                    <MessageSquare className="w-6 h-6 text-blue-500" />
                    تنظیمات اطلاع‌رسانی خودکار (مکتب پورتال)
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    با فعال‌سازی گزینه‌های زیر، هنگام ثبت حضور و غیاب دستی یا اسکن بارکد، پیام در صف ارسال اندروید گیت‌وی به صورت خودکار ایجاد می‌گردد. وب‌سایت و نسخه ویندوز دیتای تسک‌ها را آماده نموده و اندروید در بک‌گراند به صورت زنده آنها را ارسال می‌نماید.
                  </p>
                </div>

                {/* Gateway & Auto Event Toggles */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Toggle 1: Absence */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between">
                    <div>
                      <h5 className="text-sm font-black text-slate-800">ارسال پیامک غیبت</h5>
                      <p className="text-[10px] text-slate-400 mt-1">ارسال پیام یا تماس به مخاطبین در زمان غیبت</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={notificationConfig.sms_on_absence_enabled}
                        onChange={(e) => setNotificationConfig({
                          ...notificationConfig,
                          sms_on_absence_enabled: e.target.checked
                        })}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Toggle 2: Entry */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between">
                    <div>
                      <h5 className="text-sm font-black text-slate-800">ارسال پیامک ورود</h5>
                      <p className="text-[10px] text-slate-400 mt-1">اعلام ورود شاگرد یا استاد</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={notificationConfig.sms_on_entry_enabled}
                        onChange={(e) => setNotificationConfig({
                          ...notificationConfig,
                          sms_on_entry_enabled: e.target.checked
                        })}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Toggle 3: Exit */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between">
                    <div>
                      <h5 className="text-sm font-black text-slate-800">ارسال پیامک خروج</h5>
                      <p className="text-[10px] text-slate-400 mt-1">اعلام خروج شاگرد یا استاد</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={notificationConfig.sms_on_exit_enabled}
                        onChange={(e) => setNotificationConfig({
                          ...notificationConfig,
                          sms_on_exit_enabled: e.target.checked
                        })}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                {/* Advanced Granular Service Channels (Smart Event Router) */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                  <div>
                    <h5 className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <Volume2 className="w-5 h-5 text-blue-500 animate-pulse" />
                      تنظیمات اختصاصی بسترهای فرستنده (ارسال هوشمند غیبت/ورود/خروج)
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-1">
                      برای هر یک از رویدادها، بستر ترجیحی مخابراتی را برگزینید. برای نمونه، غیبت‌ها تماس ربات صوتی و ورود/خروج‌ها به شکل پیامک منتقل گردند.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Event 1: Absence */}
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="text-[11px] font-black text-slate-700">۱. ثبت غیبت شاگردان و معلمان</span>
                        <span className="text-[9px] bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">اصلی</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => setNotificationConfig({ ...notificationConfig, service_for_absence: 'sms' })}
                          className={`py-2.5 px-3 rounded-xl text-center text-[10px] font-black transition-all border ${
                            notificationConfig.service_for_absence === 'sms'
                              ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                              : 'bg-white border-slate-150 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          ارسال پیامک سیم‌کارتی (SMS)
                        </button>
                        <button
                          onClick={() => setNotificationConfig({ ...notificationConfig, service_for_absence: 'whatsapp' })}
                          className={`py-2.5 px-3 rounded-xl text-center text-[10px] font-black transition-all border ${
                            notificationConfig.service_for_absence === 'whatsapp'
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                              : 'bg-white border-slate-150 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          ارسال پیامک واتساپ هوشمند
                        </button>
                        <button
                          onClick={() => setNotificationConfig({ ...notificationConfig, service_for_absence: 'voice' })}
                          className={`py-2.5 px-3 rounded-xl text-center text-[10px] font-black transition-all border ${
                            notificationConfig.service_for_absence === 'voice'
                              ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
                              : 'bg-white border-slate-150 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          تماس صوتی خودکار سیم‌کارت (IVR)
                        </button>
                      </div>
                    </div>

                    {/* Event 2: Entry */}
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="text-[11px] font-black text-slate-700">۲. ثبت حضور و خروج (پیام ورود)</span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-600 font-bold px-2 py-0.5 rounded-full">کمکی</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => setNotificationConfig({ ...notificationConfig, service_for_entry: 'sms' })}
                          className={`py-2.5 px-3 rounded-xl text-center text-[10px] font-black transition-all border ${
                            notificationConfig.service_for_entry === 'sms'
                              ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                              : 'bg-white border-slate-150 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          ارسال پیامک سیم‌کارتی (SMS)
                        </button>
                        <button
                          onClick={() => setNotificationConfig({ ...notificationConfig, service_for_entry: 'whatsapp' })}
                          className={`py-2.5 px-3 rounded-xl text-center text-[10px] font-black transition-all border ${
                            notificationConfig.service_for_entry === 'whatsapp'
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                              : 'bg-white border-slate-150 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          ارسال پیامک واتساپ هوشمند
                        </button>
                        <button
                          onClick={() => setNotificationConfig({ ...notificationConfig, service_for_entry: 'voice' })}
                          className={`py-2.5 px-3 rounded-xl text-center text-[10px] font-black transition-all border ${
                            notificationConfig.service_for_entry === 'voice'
                              ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
                              : 'bg-white border-slate-150 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          تماس صوتی خودکار سیم‌کارت (IVR)
                        </button>
                      </div>
                    </div>

                    {/* Event 3: Exit */}
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="text-[11px] font-black text-slate-700">۳. مرخصی و خروج شاگردان</span>
                        <span className="text-[9px] bg-slate-150 text-slate-600 font-bold px-2 py-0.5 rounded-full">فرعی</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => setNotificationConfig({ ...notificationConfig, service_for_exit: 'sms' })}
                          className={`py-2.5 px-3 rounded-xl text-center text-[10px] font-black transition-all border ${
                            notificationConfig.service_for_exit === 'sms'
                              ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                              : 'bg-white border-slate-150 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          ارسال پیامک سیم‌کارتی (SMS)
                        </button>
                        <button
                          onClick={() => setNotificationConfig({ ...notificationConfig, service_for_exit: 'whatsapp' })}
                          className={`py-2.5 px-3 rounded-xl text-center text-[10px] font-black transition-all border ${
                            notificationConfig.service_for_exit === 'whatsapp'
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                              : 'bg-white border-slate-150 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          ارسال پیامک واتساپ هوشمند
                        </button>
                        <button
                          onClick={() => setNotificationConfig({ ...notificationConfig, service_for_exit: 'voice' })}
                          className={`py-2.5 px-3 rounded-xl text-center text-[10px] font-black transition-all border ${
                            notificationConfig.service_for_exit === 'voice'
                              ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
                              : 'bg-white border-slate-150 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          تماس صوتی خودکار سیم‌کارت (IVR)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* -------------------- MANAGER NATIVE VOICE RECORDER CENTRAL PANEL -------------------- */}
                <div className="bg-slate-900 text-white p-8 rounded-[2rem] border border-slate-800 shadow-xl space-y-6">
                  <div>
                    <h5 className="font-black text-white text-base flex items-center gap-2.5">
                      <Mic className="w-5 h-5 text-amber-400 animate-pulse" />
                      سامانه مرجع ضبط صدا و بارگذاری فایل صوتی مدیر کل مکتب ویژه تماس‌ها (IVR)
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-1">
                      صدای واقعی مدیر مکتب ضبط، فشرده‌سازی و محفظه‌بندی می‌شود. سرور اندروید مکتب به محض همگام‌سازی، این صوت را دانلود کرده و هنگام برپایی تماس صوتی، آن را به عنوان اعلان باکیفیت و زنده پخش خواهد کرد.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                    {/* Visual Status Indicator Card */}
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-850 space-y-4">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">وضعیت دیتای صوتی گیت‌وی</span>
                      
                      {isRecording ? (
                        <div className="flex items-center gap-3 bg-red-950/40 p-4 rounded-xl border border-red-500/20 text-red-400 animate-pulse">
                          <span className="w-3 h-3 rounded-full bg-red-500 block animate-ping shrink-0" />
                          <div className="text-right">
                            <span className="font-black text-xs block">سیستم مکانیزه ضبط میکروفون فعال است...</span>
                            <span className="text-[10px] text-slate-400">زمان سپری شده: {recordingDuration} ثانیه (برای توقف، روی دکمه توقف ضربه بزنید)</span>
                          </div>
                        </div>
                      ) : recordedAudioBase64 ? (
                        <div className="space-y-3">
                          <div className="flex items-start gap-3 bg-indigo-950/20 p-4 rounded-xl border border-indigo-500/20 text-indigo-400">
                            <Volume2 className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                            <div className="text-right">
                              <span className="font-black text-xs block text-slate-200">فایل صوتی اختصاصی مدیر هم‌اکنون فعال است</span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                فرمت ذخیره: WAV با بافر بیس۶۴ (حجم پهنای باند: {Math.round(recordedAudioBase64.length / 1024)} کیلوبایت)
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 bg-slate-850 p-4 rounded-xl border border-slate-800 text-slate-400">
                          <Info className="w-5 h-5 text-slate-500 shrink-0" />
                          <div className="text-right">
                            <span className="font-black text-xs block text-slate-300">هیچ صوتی از سوی مدیر ضبط یا بارگذاری نشده است</span>
                            <span className="text-[9px] text-slate-500">موبایل اندروید گیت‌وی در این سناریو به صورت اتوماتیک از ربات شنیداری متنی (Text-to-Speech) استفاده خواهد کرد.</span>
                          </div>
                        </div>
                      )}

                      {/* Small Player for Browser preview */}
                      {(recordedAudioUrl || recordedAudioBase64) && (
                        <div className="pt-2 border-t border-slate-850 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">شنیدن آزمایشی پیش‌نمایش در مرورگر:</span>
                          <button
                            onClick={playRecordedAudio}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                              isPlayingRecorded 
                                ? 'bg-amber-500 text-white' 
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                            }`}
                          >
                            {isPlayingRecorded ? (
                              <>
                                <Pause className="w-3.5 h-3.5" />
                                توقف آزمایشی
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5" />
                                پخش پیش‌شنوایی
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Operational Buttons */}
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        {/* Record Trigger Button */}
                        <button
                          onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                          type="button"
                          className={`flex-1 py-4 px-3 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            isRecording 
                              ? 'bg-red-650 hover:bg-red-700 text-white animate-pulse border border-red-500/20' 
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                          }`}
                        >
                          {isRecording ? (
                            <>
                              <Square className="w-4 h-4 text-white" />
                              توقف و ذخیره نهایی ضبط
                            </>
                          ) : (
                            <>
                              <Mic className="w-4 h-4 text-white animate-bounce" />
                              شروع ضبط صدای زنده مدیر
                            </>
                          )}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* File Upload Button wrapper */}
                        <label className="flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-[10px] font-black cursor-pointer transition-all">
                          <Upload className="w-3.5 h-3.5" />
                          بارگذاری فایل (MP3/WAV)
                          <input 
                            type="file" 
                            accept="audio/*" 
                            onChange={handleAudioFileUpload} 
                            className="hidden" 
                          />
                        </label>

                        {/* Export/Download Button for direct copy to SD/Internal storage */}
                        <button
                          onClick={() => {
                            const source = recordedAudioUrl || recordedAudioBase64;
                            if (!source) return;
                            const a = document.createElement('a');
                            a.href = source;
                            a.download = `voice_announcement_${Date.now()}.wav`;
                            a.click();
                            addAndroidLog('success', 'فایل صوتی جهت استقرار آفلاین یا آرشیو آماده دانلود گردید.');
                          }}
                          disabled={!recordedAudioUrl && !recordedAudioBase64}
                          className="py-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-slate-200 border border-slate-700 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          دانلود جهت کپی موبایل
                        </button>
                      </div>

                      {/* Clean Audio */}
                      {(recordedAudioUrl || recordedAudioBase64) && (
                        <button
                          onClick={deleteRecordedAudio}
                          className="w-full py-2 bg-red-500/10 hover:bg-red-500/15 text-red-400 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          حذف کامل صوت فعلی مدیر
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dynamic Variable Helps */}
                <div className="bg-amber-50/50 border border-amber-100/50 rounded-2xl p-4 flex gap-3 text-xs text-amber-700">
                  <Info className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold block mb-1">شناسه‌های متغیر قالب پیامک:</span>
                    <p className="leading-relaxed">
                      از شناسه‌های زیر در متن ارسال‌ها استفاده کنید: <code className="bg-white border border-amber-200/50 px-1 py-0.5 rounded font-mono text-rose-500">[name]</code> برای نام عضو، <code className="bg-white border border-amber-200/50 px-1 py-0.5 rounded font-mono text-rose-500">[تاریخ]</code> برای تاریخ روز، و <code className="bg-white border border-amber-200/50 px-1 py-0.5 rounded font-mono text-rose-500">[ساعت]</code> برای ساعت دقیق اسکن.
                    </p>
                  </div>
                </div>

                {/* Student Templates */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                  <h4 className="font-bold text-slate-800 border-b border-slate-50 pb-3 text-base">مدیریت قالب‌های شاگردان</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Student Absence */}
                    <div className="space-y-1.5Col">
                      <label className="text-[11px] font-black text-slate-500 block mb-1">قالب پیام غیبت شاگردان</label>
                      <textarea
                        value={notificationConfig.student_template_absence}
                        onChange={(e) => setNotificationConfig({
                          ...notificationConfig,
                          student_template_absence: e.target.value
                        })}
                        className="w-full h-32 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 p-3 outline-none focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all text-right resize-none placeholder:text-slate-400 font-sans"
                      />
                    </div>

                    {/* Student Entry */}
                    <div className="space-y-1.5Col">
                      <label className="text-[11px] font-black text-slate-500 block mb-1">قالب پیام ورود شاگردان</label>
                      <textarea
                        value={notificationConfig.student_template_entry}
                        onChange={(e) => setNotificationConfig({
                          ...notificationConfig,
                          student_template_entry: e.target.value
                        })}
                        className="w-full h-32 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 p-3 outline-none focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all text-right resize-none placeholder:text-slate-400 font-sans"
                      />
                    </div>

                    {/* Student Exit */}
                    <div className="space-y-1.5Col">
                      <label className="text-[11px] font-black text-slate-500 block mb-1">قالب پیام خروج شاگردان</label>
                      <textarea
                        value={notificationConfig.student_template_exit}
                        onChange={(e) => setNotificationConfig({
                          ...notificationConfig,
                          student_template_exit: e.target.value
                        })}
                        className="w-full h-32 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 p-3 outline-none focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all text-right resize-none placeholder:text-slate-400 font-sans"
                      />
                    </div>
                  </div>
                </div>

                {/* Teacher Templates */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                  <h4 className="font-bold text-slate-800 border-b border-slate-50 pb-3 text-base">مدیریت قالب‌های اساتید و کارمندان</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Teacher Absence */}
                    <div className="space-y-1.5Col">
                      <label className="text-[11px] font-black text-slate-500 block mb-1">قالب پیام غیبت اساتید</label>
                      <textarea
                        value={notificationConfig.teacher_template_absence}
                        onChange={(e) => setNotificationConfig({
                          ...notificationConfig,
                          teacher_template_absence: e.target.value
                        })}
                        className="w-full h-32 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 p-3 outline-none focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all text-right resize-none placeholder:text-slate-400 font-sans"
                      />
                    </div>

                    {/* Teacher Entry */}
                    <div className="space-y-1.5Col">
                      <label className="text-[11px] font-black text-slate-500 block mb-1">قالب پیام ورود اساتید</label>
                      <textarea
                        value={notificationConfig.teacher_template_entry}
                        onChange={(e) => setNotificationConfig({
                          ...notificationConfig,
                          teacher_template_entry: e.target.value
                        })}
                        className="w-full h-32 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 p-3 outline-none focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all text-right resize-none placeholder:text-slate-400 font-sans"
                      />
                    </div>

                    {/* Teacher Exit */}
                    <div className="space-y-1.5Col">
                      <label className="text-[11px] font-black text-slate-500 block mb-1">قالب پیام خروج اساتید</label>
                      <textarea
                        value={notificationConfig.teacher_template_exit}
                        onChange={(e) => setNotificationConfig({
                          ...notificationConfig,
                          teacher_template_exit: e.target.value
                        })}
                        className="w-full h-32 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 p-3 outline-none focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all text-right resize-none placeholder:text-slate-400 font-sans"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
                  <span className="text-xs text-slate-400 font-bold">
                    تنظیمات و قالب‌های اطلاع‌رسانی به صورت خودکار با سرور و کلاینت اندروید همگام‌سازی می‌شوند.
                  </span>
                  <button
                    onClick={async () => {
                      saveNotificationSettings(notificationConfig);
                      setSaveStatus('success');
                      setTimeout(() => setSaveStatus(null), 3500);
                      // Sync to remote database
                      await syncNotificationSettingsToDb(notificationConfig, recordedAudioBase64);
                    }}
                    className="bg-blue-600 text-white px-10 py-3.5 rounded-2xl text-xs font-black transition-all hover:bg-blue-700 hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-blue-100 flex items-center gap-2"
                  >
                    <Check className="w-4 h-4 text-white" />
                    ذخیره تنظیمات سیستم اطلاع‌رسانی
                  </button>
                </div>

                {/* Live Task Queue Monitor Header */}
                <div className="border-t border-slate-100 pt-8 mt-12 space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h4 className="font-black text-slate-800 text-base">مانیتورینگ زنده و کنترل صف ارسال پیام‌ها</h4>
                      <p className="text-xs text-slate-400 mt-1">مدیریت، ردیابی، تلاش مجدد و بررسی پیامک‌ها یا پیام‌های صوتی و واتساپ در صف انتظار.</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={fetchTasks}
                        className="p-2.5 bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100 rounded-xl transition-all flex items-center gap-1.5 text-[11px] font-black"
                        title="بروزرسانی زنده لیست"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        بروزرسانی صف
                      </button>
                      <button
                        onClick={handleRetryFailedTasks}
                        className="py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all flex items-center gap-1.5 text-[11px] font-black"
                      >
                        تلاش مجدد همه ناموفق‌ها
                      </button>
                      <button
                        onClick={handleClearAllTasksLogs}
                        className="py-2.5 px-4 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-all flex items-center gap-1.5 text-[11px] font-black"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        تخلیه تاریخچه
                      </button>
                    </div>
                  </div>
                </div>

                {/* Filter Controls Row */}
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-3xl grid grid-cols-1 md:grid-cols-4 gap-3">
                  {/* Search input */}
                  <div className="relative">
                    <input
                      type="text"
                      value={tasksSearch}
                      onChange={(e) => setTasksSearch(e.target.value)}
                      placeholder="جستجو شماره تلفن یا متن پیام..."
                      className="w-full bg-white border border-slate-200/60 rounded-2xl py-2 px-9 text-[11px] font-bold text-slate-700 outline-none focus:border-blue-500/20 text-right focus:bg-white transition-all font-sans"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>

                  {/* Filter Status */}
                  <div>
                    <select
                      value={tasksFilterStatus}
                      onChange={(e) => setTasksFilterStatus(e.target.value as any)}
                      className="w-full bg-white border border-slate-200/60 rounded-2xl py-2 px-3 text-[11px] font-bold text-slate-700 outline-none focus:border-blue-500/20 font-sans"
                    >
                      <option value="all">همه وضعیت‌ها</option>
                      <option value="pending">در انتظار ارسال (Pending)</option>
                      <option value="sent">ارسال شده (Sent)</option>
                      <option value="failed">ارسال ناموفق (Failed)</option>
                    </select>
                  </div>

                  {/* Filter Type */}
                  <div>
                    <select
                      value={tasksFilterType}
                      onChange={(e) => setTasksFilterType(e.target.value as any)}
                      className="w-full bg-white border border-slate-200/60 rounded-2xl py-2 px-3 text-[11px] font-bold text-slate-700 outline-none focus:border-blue-500/20 font-sans"
                    >
                      <option value="all">همه بسترهای ارسال</option>
                      <option value="sms">پیامک (SMS)</option>
                      <option value="whatsapp">واتساپ وب</option>
                      <option value="voice">تماس خودکار صوتی</option>
                    </select>
                  </div>

                  {/* Export Payload Manual Button */}
                  <div>
                    <button
                      onClick={() => {
                        const pendingOnly = tasks.filter(t => t.status === 'pending');
                        if (pendingOnly.length === 0) {
                          alert('هیچ پیامی در صف انتظار (Pending) جهت خروجی گرفتن وجود ندارد.');
                          return;
                        }
                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(pendingOnly, null, 2));
                        const downloadAnchor = document.createElement('a');
                        downloadAnchor.setAttribute("href", dataStr);
                        downloadAnchor.setAttribute("download", `school_pending_tasks_export_${new Date().toISOString().split('T')[0]}.json`);
                        document.body.appendChild(downloadAnchor);
                        downloadAnchor.click();
                        downloadAnchor.remove();
                      }}
                      className="w-full justify-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl py-2 px-4 text-[11px] font-black flex items-center gap-1.5 transition-all shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                      اکسپورت صف جهت فرستنده دستی ({tasks.filter(t => t.status === 'pending').length})
                    </button>
                  </div>
                </div>

                {/* Tasks Grid List */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden p-6">
                  {tasksLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                      <span className="text-xs text-slate-400 font-bold">بروزرسانی داده‌های صف ارسال...</span>
                    </div>
                  ) : (
                    (() => {
                      const filtered = tasks.filter(task => {
                        // Type filter
                        if (tasksFilterType !== 'all' && task.type !== tasksFilterType) return false;
                        // Status filter
                        if (tasksFilterStatus !== 'all' && task.status !== tasksFilterStatus) return false;
                        // Search filter
                        if (tasksSearch.trim()) {
                          const query = tasksSearch.toLowerCase();
                          const matchesPhone = task.phone?.toLowerCase().includes(query);
                          const matchesMsg = task.message?.toLowerCase().includes(query);
                          if (!matchesPhone && !matchesMsg) return false;
                        }
                        return true;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="text-center py-16 space-y-2">
                            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                            <p className="text-xs font-bold text-slate-500">هیچ وظیفه‌ای با مشخصات فیلتر شده پیدا نشد.</p>
                            <p className="text-[10px] text-slate-400">تاکنون پیامی برای غیبت یا حضور ایجاد نگردیده یا با فیلترها همخوانی ندارد.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="overflow-x-auto min-h-[250px] custom-scrollbar">
                          <table className="w-full text-right text-xs">
                            <thead>
                              <tr className="border-b border-slate-50 text-slate-400 font-bold block-table md:table-row">
                                <th className="pb-3 text-right">شماره مخاطب</th>
                                <th className="pb-3 text-center">نوع</th>
                                <th className="pb-3 text-right">متن پیـام ارسـالی</th>
                                <th className="pb-3 text-center">تاریخ ثبت (شمسی مکانی)</th>
                                <th className="pb-3 text-center">وضعیت ارسال</th>
                                <th className="pb-3 text-left">عملیات مدیریت</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {filtered.map((task) => {
                                const PersianDate = new Date(task.created_at).toLocaleDateString('fa-AF', {
                                  hour: '2-digit', minute: '2-digit'
                                });
                                return (
                                  <tr key={task.id} className="text-slate-700 hover:bg-slate-50/50 block-table md:table-row">
                                    <td className="py-3.5 font-mono font-bold">{task.phone}</td>
                                    <td className="py-3.5 text-center">
                                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${
                                        task.type === 'sms' 
                                          ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                          : task.type === 'whatsapp' 
                                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                          : 'bg-amber-50 text-amber-600 border border-amber-100'
                                      }`}>
                                        {task.type === 'sms' ? 'SMS' : task.type === 'whatsapp' ? 'واتساپ' : 'تماس'}
                                      </span>
                                    </td>
                                    <td className="py-3.5 text-right font-medium max-w-[280px] break-words text-slate-600 text-[11px] leading-relaxed">
                                      {task.message}
                                    </td>
                                    <td className="py-3.5 text-center text-[10px] font-bold text-slate-400 font-sans">
                                      {PersianDate}
                                    </td>
                                    <td className="py-3.5 text-center">
                                      {task.status === 'pending' ? (
                                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black flex items-center justify-center gap-1 mx-auto w-max ${
                                          task.isLocalOnly 
                                            ? 'bg-slate-100 text-slate-600 animate-pulse'
                                            : 'bg-amber-50 text-amber-600 border border-amber-100'
                                        }`}>
                                          <Clock className="w-3 h-3" />
                                          {task.isLocalOnly ? 'در صف محلی (Offline)' : 'در صف ارسال گیت‌وی'}
                                        </span>
                                      ) : task.status === 'sent' ? (
                                        <span className="px-2.5 py-1 rounded-full text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-100 font-black flex items-center justify-center gap-1 mx-auto w-max">
                                          <Check className="w-3 h-3" />
                                          ارسال موفق
                                        </span>
                                      ) : (
                                        <span className="px-2.5 py-1 rounded-full text-[9px] bg-rose-50 text-rose-600 border border-rose-100 font-black flex items-center justify-center gap-1 mx-auto w-max">
                                          <AlertCircle className="w-3 h-3" />
                                          ارسال ناموفق
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3.5 text-left">
                                      <div className="flex gap-2 justify-end">
                                        {task.status === 'failed' && (
                                          <button
                                            onClick={() => handleRetrySingleTask(task.id)}
                                            className="p-1 px-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[9px] transition-all"
                                            title="ارسال مجدد وظیفه"
                                          >
                                            تلاش دوباره
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleDeleteTask(task)}
                                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all flex items-center justify-center shrink-0"
                                          title="حذف از صف"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()
                  )}
                </div>

                {/* -------------------- INTERACTIVE ANDROID NATIVE SERVICE CENTRAL PANEL -------------------- */}
                <div className="bg-slate-900 text-slate-100 p-8 rounded-[2rem] border border-slate-800 shadow-xl space-y-8 text-right" dir="rtl">
                  <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h4 className="font-black text-white text-base flex items-center gap-2.5">
                        <Shield className="w-5 h-5 text-indigo-400" />
                        سامانه هوشمند و مدیریت سرویس محلی اندروید (سیم‌کارت واقعی)
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        پایشگر، پیکربندی زمان‌بندی تماس‌های صوتی صنف و بررسی دسترسی‌های سخت‌افزاری دستگاه اندروید مکتب.
                      </p>
                    </div>
                    <div className="bg-slate-800 text-[10px] px-3 py-1.5 rounded-full border border-slate-700/50 flex items-center gap-2 font-mono">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span>پلتفرم: {isNativeAndroid() ? 'نسخه رسمی اندروید' : 'شبیه‌ساز دسکتاپ وب'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* LEFT COLUMN: NATIVE PERM INFRASTATUS & VISUAL CONFIRMATION */}
                    <div className="space-y-6">
                      <div className="bg-slate-850 p-6 rounded-2xl space-y-4 border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950/20">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0 border border-indigo-500/20">
                            <AlertCircle className="w-5 h-5" />
                          </div>
                          <div>
                            <h5 className="font-black text-white text-xs">مدیریت بومی مجوزها (حذف پنل شبیه‌ساز)</h5>
                            <span className="text-[8px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold inline-block mt-0.5">تغییر فعال نسخه جدید گیت‌هاب</span>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          ⚠️ تنظیمات امنیتی و دسترسی‌های سخت‌افزاری بر اساس استاندارد گوگل‌پلی هم‌اکنون به صورت کاملاً خودکار و پویا توسط هسته سیستم‌عامل اندروید هدایت می‌شوند. در نسخه جدید، دکمه‌های شبیه‌ساز قبلی از این بخش حذف و پایشگر بومی فعال شده است تا تغییر واقعی بسته‌های جدید را بلافاصله بر روی موبایل خود مشاهده کنید.
                        </p>

                        <div className="pt-3 border-t border-slate-800 space-y-2">
                          <div className="flex justify-between items-center text-[10px] text-slate-300">
                            <span className="font-bold">وضعیت دسترسی SMS:</span>
                            <span className={`px-2 py-0.5 rounded font-black text-[8px] ${
                              androidPermissions.sendSms === 'granted' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                            }`}>{androidPermissions.sendSms === 'granted' ? 'تایید شده (بومی)' : 'در انتظار درخواست'}</span>
                          </div>
                          
                          <div className="flex justify-between items-center text-[10px] text-slate-300">
                            <span className="font-bold">وضعیت دسترسی تماس:</span>
                            <span className={`px-2 py-0.5 rounded font-black text-[8px] ${
                              androidPermissions.callPhone === 'granted' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                            }`}>{androidPermissions.callPhone === 'granted' ? 'تایید شده (بومی)' : 'در انتظار درخواست'}</span>
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-slate-300">
                            <span className="font-bold">وضعیت پایشگر خطوط:</span>
                            <span className={`px-2 py-0.5 rounded font-black text-[8px] ${
                              androidPermissions.readPhoneState === 'granted' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                            }`}>{androidPermissions.readPhoneState === 'granted' ? 'تایید شده (بومی)' : 'در انتظار درخواست'}</span>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-800 space-y-3">
                          <p className="text-[9px] text-justify text-slate-400 leading-relaxed font-sans">
                            💡 <strong>قابلیت اضطراری همگام‌سازی مجوزها:</strong> چناچه مجوزهای تماس و پیامک را در بخش تنظیمات اپلیکیشن سیستم‌عامل موبایل اندروید خود فعال نموده‌اید، اما به علت ناتوانی مفسر مرورگر داخلی (WebView Sandbox) پورتال قادر به تشخیص خودکار آن نیست، با لمس دکمه زیر وضعیت را به صورت دستی تایید کرده تا صف ارسال پیام و تماس‌های صوتی فوراً بازگشایی شود:
                          </p>
                          <div className="grid grid-cols-2 gap-3.5">
                            <button
                              type="button"
                              onClick={() => {
                                const up = forceGrantAllAndroidPermissions();
                                setAndroidPermissions(up);
                              }}
                              className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/15 cursor-pointer"
                            >
                              🔑 تایید و فعال‌سازی دستی مجوزها
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const up = resetAndroidPermissions();
                                setAndroidPermissions(up);
                              }}
                              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] transition-all flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
                            >
                              🔄 بازنشانی به وضعیت اولیه
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: VOICE CALLBACK & REAL RETRY CRON CONFIG */}
                    <div className="space-y-6">
                      <div className="bg-slate-850 p-6 rounded-2xl space-y-4 border border-slate-800">
                        <h5 className="font-black text-indigo-300 text-xs flex items-center gap-2">
                          <Phone className="w-4 h-4 text-indigo-400" />
                          پیکربندی خطوط تماس صوتی و پاسخ‌دهی
                        </h5>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          اگر تماسی با والدین برقرار شد ولی جواب ندادند یا خط مشغول بود، سیستم در چه بازه‌ای و چند بار تکرار کند؟
                        </p>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 block mb-1">مکث تلاش مجدد (دقیقه)</label>
                            <input
                              type="number"
                              min="1"
                              max="30"
                              value={androidConfig.voiceCallRetryMinutes}
                              onChange={(e) => updateAndroidConfig('voiceCallRetryMinutes', parseInt(e.target.value) || 2)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white p-2.5 outline-none focus:border-indigo-500 transition-all text-center"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 block mb-1">حداکثر دفعات تماس</label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={androidConfig.voiceCallMaxAttempts}
                              onChange={(e) => updateAndroidConfig('voiceCallMaxAttempts', parseInt(e.target.value) || 3)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white p-2.5 outline-none focus:border-indigo-500 transition-all text-center"
                            />
                          </div>
                        </div>

                        <div className="pt-2">
                          <label className="text-[10px] font-black text-slate-400 block mb-1">تاخیر دلیوری بین پیامک‌ها (میلی‌ثانیه)</label>
                          <input
                            type="number"
                            min="1000"
                            max="30000"
                            step="1000"
                            value={androidConfig.delayBetweenSmsMs}
                            onChange={(e) => updateAndroidConfig('delayBetweenSmsMs', parseInt(e.target.value) || 5000)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white p-2.5 outline-none focus:border-indigo-500 transition-all text-center"
                          />
                          <span className="text-[9px] text-slate-400 mt-1 block">تاخیر استاندارد ۵۰۰ مگاهرتزی (۵ ثانیه) جهت عدم اسپم تشخیص دادن سیم کارت از سوی افغان بیسیم، روشن و اتصالات.</span>
                        </div>
                      </div>

                      {/* SIM / carrier slots setup */}
                      <div className="bg-slate-850 p-5 rounded-2xl flex items-center justify-between border border-slate-800">
                        <div>
                          <span className="font-bold text-[11px] text-slate-200 block">انتخاب اسلات سیم‌کارت فعال</span>
                          <span className="text-[9px] text-slate-400">جهت برقراری تماس و سیم‌کارت پیش‌فرض پیامک</span>
                        </div>
                        <select
                          value={androidConfig.autoSimCarrier}
                          onChange={(e) => updateAndroidConfig('autoSimCarrier', e.target.value as any)}
                          className="bg-slate-800 border border-slate-700 text-xs font-bold text-white p-2 px-3 rounded-xl outline-none"
                        >
                          <option value="auto">انتخاب اتوماتیک سیستم</option>
                          <option value="sim1">سیم‌کارت اول (SIM Slot 1)</option>
                          <option value="sim2">سیم‌کارت دوم (SIM Slot 2)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* LIVE LOG MONITOR TERMINAL CARD */}
                  <div className="bg-slate-950 p-6 rounded-3xl border border-slate-850 space-y-4">
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-850 pb-4">
                      <div>
                        <h5 className="font-black text-emerald-400 text-xs flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                          ترمینال مانیتورینگ آنلاین گیت‌وی موبایل و پیام صوتی دکمه‌ای
                        </h5>
                        <p className="text-[10px] text-slate-400 mt-1">تراکنش‌ها، تماس‌ها و ارسال‌های انجام شده توسط گوشی اندروید مکتب به صورت لحظه‌ای.</p>
                      </div>
                      <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                        <button
                          onClick={handleManualRunWorker}
                          disabled={isSimulatingBackgroundWorker}
                          className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white font-black text-[10px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {isSimulatingBackgroundWorker ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              در حال ارسال...
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              ارسال دستی و بررسی بلافاصله صف
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setIsAutoWorkerActive(!isAutoWorkerActive);
                          }}
                          className={`py-2 px-4 rounded-xl font-black text-[10px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            isAutoWorkerActive 
                              ? 'bg-amber-500 text-white' 
                              : 'bg-slate-800 text-slate-200 border border-slate-700'
                          }`}
                        >
                          {isAutoWorkerActive ? 'غیرفعال‌سازی بررسی مداوم' : 'فعال‌سازی بررسی مداوم (هر ۱۵ ثانیه)'}
                        </button>
                        <button
                          onClick={() => {
                            clearAndroidLogs();
                            setAndroidLogs([]);
                          }}
                          className="py-2 px-3 bg-red-400/10 hover:bg-red-400/20 text-red-400 font-bold text-[10px] rounded-xl transition-all cursor-pointer"
                        >
                          پاک کردن لاگ‌ها
                        </button>
                      </div>
                    </div>

                    {/* LIVE TERMINAL LAYOUT */}
                    <div className="h-48 bg-slate-900 border border-slate-850 rounded-2xl p-4 overflow-y-auto space-y-2 font-mono scrollbar-thin text-right" dir="ltr">
                      {androidLogs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                          <p dir="rtl">هیچ لاگ یا تراکنشی هم‌اکنون موجود نیست.</p>
                          <p dir="rtl" className="text-[9px] text-slate-600 mt-1">با زدن دکمه "ارسال دستی" یا ثبت حضور و غیاب، پورتال و سیم‌کارت شروع به کار خواهند کرد.</p>
                        </div>
                      ) : (
                        androidLogs.map((log) => (
                          <div key={log.id} className="text-[10px] flex items-start gap-1 justify-end text-right">
                            <span className="text-slate-500 text-[8px] shrink-0 font-sans">[{log.timestamp}]</span>
                            <span className="text-slate-300 break-all select-all font-sans text-right" dir="rtl">{log.message}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[7px] font-black shrink-0 ${
                              log.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' :
                              log.type === 'error' ? 'bg-rose-500/20 text-rose-300' :
                              log.type === 'warn' ? 'bg-amber-500/20 text-amber-300' :
                              log.type === 'call' ? 'bg-indigo-500/20 text-indigo-300' :
                              log.type === 'sms' ? 'bg-teal-500/20 text-teal-300' :
                              'bg-slate-800 text-slate-300'
                            }`}>{
                              log.type === 'success' ? 'SUCCESS' :
                              log.type === 'error' ? 'ERROR' :
                              log.type === 'warn' ? 'WARN' :
                              log.type === 'call' ? 'CALL/VOICE' :
                              log.type === 'sms' ? 'SIM-SMS' :
                              'INFO'
                            }</span>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono">
                      <span>Database Table Name Target: <strong className="text-green-400">tasks</strong></span>
                      <span>Polling status: <strong className={isAutoWorkerActive ? 'text-green-500 animate-pulse' : 'text-slate-400'}>{isAutoWorkerActive ? 'فعال (ACTIVE)' : 'غیرفعال (OFF)'}</strong></span>
                    </div>
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
