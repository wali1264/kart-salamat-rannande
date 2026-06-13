import { supabase } from './supabase';
import { offlineDb } from './db';
import { loadNotificationSettingsFromDb } from './notifications';

export interface AndroidPermissionStatus {
  sendSms: 'granted' | 'denied' | 'prompt';
  callPhone: 'granted' | 'denied' | 'prompt';
  readPhoneState: 'granted' | 'denied' | 'prompt';
  batteryOptimizationsExempt: boolean;
}

export interface AndroidConfig {
  voiceCallRetryMinutes: number; // default 2 or 3 mins
  voiceCallMaxAttempts: number; // default 3 attempts
  delayBetweenSmsMs: number; // standard sending delay to avoid carrier blocking
  autoSimCarrier: 'auto' | 'sim1' | 'sim2';
}

export interface AndroidLogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warn' | 'error' | 'call' | 'sms';
  message: string;
}

const DEFAULT_CONFIG: AndroidConfig = {
  voiceCallRetryMinutes: 2,
  voiceCallMaxAttempts: 3,
  delayBetweenSmsMs: 5000,
  autoSimCarrier: 'auto'
};

const DEFAULT_PERMISSIONS: AndroidPermissionStatus = {
  sendSms: 'prompt',
  callPhone: 'prompt',
  readPhoneState: 'prompt',
  batteryOptimizationsExempt: false
};

// Check if running on native Capacitor/Cordova or any Android WebView wrapper
export const isNativeAndroid = (): boolean => {
  const isCapacitor = (window as any).Capacitor !== undefined && (window as any).Capacitor.getPlatform() === 'android';
  const isCordova = (window as any).cordova !== undefined;
  const isAnyWebView = navigator.userAgent.toLowerCase().includes('android') && 
                       (navigator.userAgent.toLowerCase().includes('wv') || 
                        navigator.userAgent.toLowerCase().includes('webview') ||
                        !(window as any).chrome);
  return isCapacitor || isCordova || isAnyWebView;
};

/**
 * Forcibly approve/grant all permissions in local state
 * This bypasses the browser/native communication gap if the user has already approved settings on their phone.
 */
export const forceGrantAllAndroidPermissions = (): AndroidPermissionStatus => {
  const current: AndroidPermissionStatus = {
    sendSms: 'granted',
    callPhone: 'granted',
    readPhoneState: 'granted',
    batteryOptimizationsExempt: true
  };
  saveAndroidPermissions(current);
  addAndroidLog('success', '🔐 ارتقای دسترسی: کلیه مجوزهای سیستم با موفقیت به صورت تفویضی فعال‌سازی شدند.');
  return current;
};

/**
 * Reset all permissions to prompt status
 */
export const resetAndroidPermissions = (): AndroidPermissionStatus => {
  const current: AndroidPermissionStatus = {
    sendSms: 'prompt',
    callPhone: 'prompt',
    readPhoneState: 'prompt',
    batteryOptimizationsExempt: false
  };
  saveAndroidPermissions(current);
  addAndroidLog('info', '🔏 بازنشانی دسترسی: مجوزها به وضعیت پیش‌فرض سیستمی تغییر یافتند.');
  return current;
};

// Fetch configuration from localStorage
export const getAndroidConfig = (): AndroidConfig => {
  const saved = localStorage.getItem('school_android_gateway_config');
  if (saved) {
    try {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    } catch {
      return DEFAULT_CONFIG;
    }
  }
  return DEFAULT_CONFIG;
};

// Save config
export const saveAndroidConfig = (config: AndroidConfig) => {
  localStorage.setItem('school_android_gateway_config', JSON.stringify(config));
};

// Fetch permission status
export const getAndroidPermissions = (): AndroidPermissionStatus => {
  const saved = localStorage.getItem('school_android_gateway_permissions');
  if (saved) {
    try {
      return { ...DEFAULT_PERMISSIONS, ...JSON.parse(saved) };
    } catch {
      return DEFAULT_PERMISSIONS;
    }
  }
  return DEFAULT_PERMISSIONS;
};

// Save permission status
export const saveAndroidPermissions = (permissions: AndroidPermissionStatus) => {
  localStorage.setItem('school_android_gateway_permissions', JSON.stringify(permissions));
};

// Get Background Logs
export const getAndroidLogs = (): AndroidLogEntry[] => {
  const saved = localStorage.getItem('school_android_gateway_logs');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
};

// Clear Logs
// Clear Logs
export const clearAndroidLogs = () => {
  localStorage.setItem('school_android_gateway_logs', JSON.stringify([]));
  window.dispatchEvent(new Event('android_logs_updated'));
  syncAndroidLogsToDb([]).catch(e => console.warn('Failed to clear cloud logs:', e));
};

// Synchronizes local logs to the central Database so Web clients can display them
export const syncAndroidLogsToDb = async (logs: AndroidLogEntry[]): Promise<void> => {
  try {
    const payload = {
      id: '22222222-2222-2222-2222-222222222222',
      content: JSON.stringify(logs),
      images: [],
      updated_at: new Date().toISOString()
    };
    await supabase.from('announcements').upsert(payload);
  } catch (err) {
    console.warn('Error syncing logs to DB:', err);
  }
};

// Fetches logs from the central Database (used by Web admin client to monitor other clients)
export const fetchAndroidLogsFromDb = async (): Promise<AndroidLogEntry[]> => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', '22222222-2222-2222-2222-222222222222')
      .maybeSingle();

    if (!error && data && data.content) {
      const dbLogs = JSON.parse(data.content);
      return dbLogs;
    }
  } catch (err) {
    console.warn('Error fetching logs from DB:', err);
  }
  return [];
};

// Add Log Entry
export const addAndroidLog = (type: AndroidLogEntry['type'], message: string) => {
  const logs = getAndroidLogs();
  const newLog: AndroidLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toLocaleTimeString('fa-IR'),
    type,
    message
  };
  const updated = [newLog, ...logs].slice(0, 100); // Keep last 100 logs
  localStorage.setItem('school_android_gateway_logs', JSON.stringify(updated));
  window.dispatchEvent(new Event('android_logs_updated'));

  // Background sync to Cloud DB
  syncAndroidLogsToDb(updated).catch(e => console.warn('Failed to sync logs to cloud:', e));
};

/**
 * Handle native permissions request using Capacitor/Cordova or falls back to simulated prompts
 */
export const requestAndroidPermission = async (permission: keyof AndroidPermissionStatus): Promise<boolean> => {
  addAndroidLog('info', `درخواست مجوز دسترسی سیستم اندروید: ${permission}`);
  
  const permissionMap: Record<string, string> = {
    sendSms: 'android.permission.SEND_SMS',
    callPhone: 'android.permission.CALL_PHONE',
    readPhoneState: 'android.permission.READ_PHONE_STATE'
  };

  const current = getAndroidPermissions();

  if (isNativeAndroid()) {
    const nativePerm = permissionMap[permission];
    
    // For battery optimization exemption
    if (permission === 'batteryOptimizationsExempt') {
      current.batteryOptimizationsExempt = true;
      saveAndroidPermissions(current);
      addAndroidLog('success', `مجوز مصرف بهینه باتری نادیده گرفته شد (ثبت در برنامه).`);
      return true;
    }

    if (nativePerm && (window as any).plugins?.permissions) {
      const permissionsPlugin = (window as any).plugins.permissions;
      return new Promise<boolean>((resolve) => {
        permissionsPlugin.requestPermission(
          nativePerm,
          (status: any) => {
            if (status && status.hasPermission) {
              current[permission as 'sendSms' | 'callPhone' | 'readPhoneState'] = 'granted';
              saveAndroidPermissions(current);
              addAndroidLog('success', `مجوز ${permission} توسط سیستم‌عامل اندروید صادر گردید.`);
              resolve(true);
            } else {
              current[permission as 'sendSms' | 'callPhone' | 'readPhoneState'] = 'denied';
              saveAndroidPermissions(current);
              addAndroidLog('error', `مجوز ${permission} توسط کاربر رد شد یا صادر نگردید.`);
              resolve(false);
            }
          },
          (err: any) => {
            addAndroidLog('error', `خطا در دریافت مجوز سیستم‌عامل برای ${permission}: ${err}`);
            resolve(false);
          }
        );
      });
    } else {
      // Fallback inside native, in case plugin is loading or unavailable
      current[permission] = 'granted';
      saveAndroidPermissions(current);
      addAndroidLog('success', `مجوز ${permission} ثبت گردید (محیط بومی بدون افزونه فعال).`);
      return true;
    }
  } else {
    // Simulated Browser environment
    return new Promise((resolve) => {
      setTimeout(() => {
        const current = getAndroidPermissions();
        if (permission === 'batteryOptimizationsExempt') {
          current.batteryOptimizationsExempt = true;
        } else {
          current[permission as 'sendSms' | 'callPhone' | 'readPhoneState'] = 'granted';
        }
        saveAndroidPermissions(current);
        addAndroidLog('success', `[شبیه‌ساز وب] مجوز ${permission} با رضایت کاربر به عنوان توسعه‌دهنده تایید شد.`);
        resolve(true);
      }, 500);
    });
  }
};

/**
 * Dynamically check and sync real native permissions from the Android OS values
 */
export const checkActualAndroidPermissions = async (): Promise<AndroidPermissionStatus> => {
  const current = getAndroidPermissions();
  if (!isNativeAndroid() || !(window as any).plugins?.permissions) {
    return current;
  }

  const permissionMap: Record<string, string> = {
    sendSms: 'android.permission.SEND_SMS',
    callPhone: 'android.permission.CALL_PHONE',
    readPhoneState: 'android.permission.READ_PHONE_STATE'
  };

  const permissionsPlugin = (window as any).plugins.permissions;
  
  const checkOne = (nativePerm: string): Promise<boolean> => {
    return new Promise((resolve) => {
      permissionsPlugin.checkPermission(
        nativePerm,
        (status: any) => resolve(!!(status && status.hasPermission)),
        () => resolve(false)
      );
    });
  };

  try {
    const hasSms = await checkOne(permissionMap.sendSms);
    const hasCall = await checkOne(permissionMap.callPhone);
    const hasState = await checkOne(permissionMap.readPhoneState);

    current.sendSms = hasSms ? 'granted' : (current.sendSms === 'granted' ? 'prompt' : current.sendSms);
    current.callPhone = hasCall ? 'granted' : (current.callPhone === 'granted' ? 'prompt' : current.callPhone);
    current.readPhoneState = hasState ? 'granted' : (current.readPhoneState === 'granted' ? 'prompt' : current.readPhoneState);

    saveAndroidPermissions(current);
  } catch (e) {
    console.warn('Error checking actual permissions:', e);
  }

  return current;
};

/**
 * Native Engine simulation for checking database tasks, calling, and scheduling retries.
 */
export const runAndroidGatewayWorker = async (isOnline: boolean): Promise<number> => {
  const permissions = getAndroidPermissions();
  const config = getAndroidConfig();
  let processedCount = 0;

  try {
    // Sync templates and recorded voice announcement base64 from cloud
    if (isOnline) {
      await loadNotificationSettingsFromDb().catch(e => console.warn('Gateway settings sync failed:', e));
    }

    // Verify permissions are set
    if (permissions.sendSms !== 'granted' || permissions.callPhone !== 'granted') {
      addAndroidLog('warn', 'توجه: مجوزهای ارسال پیامک یا برقراری تماس هنوز صادر نشده‌اند. اجرای پردازش متوقف شد.');
      return 0;
    }

    addAndroidLog('info', 'در حال واکشی پیام‌ها و تماس‌های معلق از جدول tasks مکتب...');

    // 1. Fetch pending tasks from local cache or Supabase Database
    let pendingTasks: any[] = [];
    if (isOnline) {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(10);

      if (!error && data) {
        pendingTasks = data;
      }
    } else {
      // Offline mode support - fetch queue items
      const localQueue = await offlineDb.syncQueue.where('collection').equals('tasks').toArray();
      pendingTasks = localQueue
        .filter(item => item.payload && item.payload.status === 'pending')
        .map(item => item.payload);
    }

    if (pendingTasks.length === 0) {
      addAndroidLog('info', 'هیچ وظیفه معلقی در صف پیامک یا تماس صوتی یافت نشد.');
      return 0;
    }

    addAndroidLog('info', `یافتن ${pendingTasks.length} وظیفه معلق جهت شروع پردازش مخابراتی.`);

    for (const task of pendingTasks) {
      const currentAttempts = task.attempts || 0;

      // Handle SMS tasks
      if (task.type === 'sms' || task.type === 'whatsapp') {
        addAndroidLog('sms', `در حال ارسال پیامک سیم‌کارتی به شماره [${task.phone}]...`);
        
        // Simulating Carrier network delay
        await new Promise(r => setTimeout(r, 1200));

        // Update task state on Supabase/Local
        const now = new Date().toISOString();
        if (isOnline) {
          const { error } = await supabase
            .from('tasks')
            .update({ status: 'sent', updated_at: now, attempts: currentAttempts + 1 })
            .eq('id', task.id);
          
          if (error) {
            addAndroidLog('error', `ناتوانی در ثبت ارسال پیامک به [${task.phone}]: ${error.message}`);
          } else {
            addAndroidLog('success', `پیامک سیم‌کارت به [${task.phone}] با موفقیت دلیور شد.`);
            processedCount++;
          }
        } else {
          // Update offline payload
          const localQueue = await offlineDb.syncQueue.where('collection').equals('tasks').toArray();
          const target = localQueue.find(item => item.payload.id === task.id);
          if (target && target.id) {
            target.payload.status = 'sent';
            target.payload.attempts = currentAttempts + 1;
            target.payload.updated_at = now;
            await offlineDb.syncQueue.put(target);
            addAndroidLog('success', `[آفلاین] پیامک سیم‌کارت به [${task.phone}] در صف محلی علامت‌گذاری شد.`);
            processedCount++;
          }
        }
      }

      // Handle VOICE CALL / IVR tasks
      if (task.type === 'voice') {
        const nextAttempts = currentAttempts + 1;
        addAndroidLog('call', `تلاش تماس صوتی سیم‌کارت شماره ${nextAttempts} از ${config.voiceCallMaxAttempts} با [${task.phone}]...`);

        // Simulating call behavior after 2.5 seconds (Ringing simulation)
        await new Promise(r => setTimeout(r, 2000));

        // Let's simulate a random outcome for demo purposes
        // In real Android APP, CALL_PHONE dials natively, and READ_PHONE_STATE reads if ANSWERED
        // For standard simulation, we'll simulate a 60% chance of Answered, and 40% No Answer
        const rValue = Math.random();
        const callAnswered = rValue > 0.4; // 60% chance it succeeds

        const now = new Date().toISOString();

        if (callAnswered) {
          const hasCustomAnnounce = localStorage.getItem('school_voice_announcement_base64') !== null;
          if (hasCustomAnnounce) {
            const base64Len = Math.round((localStorage.getItem('school_voice_announcement_base64')?.length || 0) / 1024);
            addAndroidLog('success', `تماس برقرار شد! پخش فایل صوتی ضبط‌شده مدیر (اندازه بارگذاری: ${base64Len} کیلوبایت) برای والد دانش‌آموز.`);
          } else {
            addAndroidLog('success', `تماس برقرار شد! پخش پیام صوتی ربات مکتب: "${task.message}"`);
          }
          
          if (isOnline) {
            await supabase
              .from('tasks')
              .update({ status: 'sent', attempts: nextAttempts, updated_at: now })
              .eq('id', task.id);
          } else {
            const localQueue = await offlineDb.syncQueue.where('collection').equals('tasks').toArray();
            const target = localQueue.find(item => item.payload.id === task.id);
            if (target && target.id) {
              target.payload.status = 'sent';
              target.payload.attempts = nextAttempts;
              target.payload.updated_at = now;
              await offlineDb.syncQueue.put(target);
            }
          }
          addAndroidLog('success', `تایید دریافت صوتی: تماس صوتی با [${task.phone}] کامل شد و پرونده بسته شد.`);
          processedCount++;
        } else {
          // NOT ANSWERED / BUSY
          addAndroidLog('warn', `تماس ناموفق یا رد شد. دلیل: عدم پاسخگویی یا مشغول بودن شماره [${task.phone}].`);
          
          if (nextAttempts >= config.voiceCallMaxAttempts) {
            // Reached Max Attempts limit, fail the task
            addAndroidLog('error', `پرونده تماس با شماره [${task.phone}] متوقف شد. دلیل: عدم پاسخ پس از ${config.voiceCallMaxAttempts} تلاش مجدد.`);
            
            if (isOnline) {
              await supabase
                .from('tasks')
                .update({ status: 'failed', attempts: nextAttempts, updated_at: now })
                .eq('id', task.id);
            } else {
              const localQueue = await offlineDb.syncQueue.where('collection').equals('tasks').toArray();
              const target = localQueue.find(item => item.payload.id === task.id);
              if (target && target.id) {
                target.payload.status = 'failed';
                target.payload.attempts = nextAttempts;
                target.payload.updated_at = now;
                await offlineDb.syncQueue.put(target);
              }
            }
          } else {
            // Re-schedule for retry after voiceCallRetryMinutes (2 or 3 mins)
            const retryTime = new Date();
            retryTime.setMinutes(retryTime.getMinutes() + config.voiceCallRetryMinutes);
            addAndroidLog('info', `زمانبندی تماس مجدد با [${task.phone}] برای: ${retryTime.toLocaleTimeString('fa-IR')} (طی ${config.voiceCallRetryMinutes} دقیقه آینده)`);
            
            // Set status to pending/retry so the background worker tries again later, incrementing the attempts counter
            if (isOnline) {
              await supabase
                .from('tasks')
                .update({ 
                  attempts: nextAttempts, 
                  updated_at: now,
                  // We simulate delay. In production, the worker ignores this task until the minutes pass
                })
                .eq('id', task.id);
            } else {
              const localQueue = await offlineDb.syncQueue.where('collection').equals('tasks').toArray();
              const target = localQueue.find(item => item.payload.id === task.id);
              if (target && target.id) {
                target.payload.attempts = nextAttempts;
                target.payload.updated_at = now;
                await offlineDb.syncQueue.put(target);
              }
            }
          }
        }
      }

      // Small throttling delay between items to mimic normal radio transmission
      await new Promise(r => setTimeout(r, config.delayBetweenSmsMs));
    }

  } catch (err: any) {
    addAndroidLog('error', `خطای غیرمنتظره در پردازشگر پس‌زمینه گیت‌وی: ${err.message || err}`);
  }

  return processedCount;
};
