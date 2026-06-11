import { supabase } from './supabase';

export interface NotificationSettings {
  sms_on_absence_enabled: boolean;
  sms_on_entry_enabled: boolean;
  sms_on_exit_enabled: boolean;
  
  // Student templates
  student_template_absence: string;
  student_template_entry: string;
  student_template_exit: string;

  // Teacher templates
  teacher_template_absence: string;
  teacher_template_entry: string;
  teacher_template_exit: string;

  default_service: 'sms' | 'whatsapp' | 'voice';
}

const DEFAULT_SETTINGS: NotificationSettings = {
  sms_on_absence_enabled: false,
  sms_on_entry_enabled: false,
  sms_on_exit_enabled: false,

  student_template_absence: 'محترم والدین گرامی، با سلام. به اطلاع می‌رسانیم فرزند شما [name] امروز [تاریخ] در صنف حاضر نبوده است. اداره مکتب.',
  student_template_entry: 'محترم والدین گرامی، به اطلاع می‌رسانیم فرزند شما [name] در تاریخ [تاریخ] ساعت [ساعت] وارد صنف گردید. اداره مکتب.',
  student_template_exit: 'محترم والدین گرامی، به اطلاع می‌رسانیم فرزند شما [name] در تاریخ [تاریخ] ساعت [ساعت] از صنف ترخص گردید. اداره مکتب.',

  teacher_template_absence: 'همکار گرامی جناب [name]، با احترام خواهشمندیم دلیل عدم حضور خود در تاریخ [تاریخ] را به اداره گزارش دهید. دفتر اساتید.',
  teacher_template_entry: 'همکار گرامی جناب [name]، حضور ورود شما در تاریخ [تاریخ] ساعت [ساعت] ثبت گردید.',
  teacher_template_exit: 'همکار گرامی جناب [name]، خروج شما در تاریخ [تاریخ] ساعت [ساعت] ثبت گردید.',

  default_service: 'sms'
};

export const getNotificationSettings = (): NotificationSettings => {
  try {
    const saved = localStorage.getItem('school_notification_settings');
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.error('Error reading notification settings', err);
  }
  return DEFAULT_SETTINGS;
};

export const saveNotificationSettings = (settings: NotificationSettings): void => {
  try {
    localStorage.setItem('school_notification_settings', JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving notification settings', err);
  }
};

/**
 * Automatically queues a notification task when attendance events occur.
 */
export const queueAutoNotification = async (
  person: { id: string; name: string; phone?: string; father_name?: string },
  type: 'entry' | 'exit' | 'absent',
  isTeacherMode: boolean,
  performAction: any
): Promise<boolean> => {
  try {
    const phone = person.phone || '';
    if (!phone) {
      console.log(`Skipping auto-notification for ${person.name}: no phone number.`);
      return false;
    }

    const config = getNotificationSettings();

    // Check if the specific event notification toggle is enabled
    if (type === 'absent' && !config.sms_on_absence_enabled) return false;
    if (type === 'entry' && !config.sms_on_entry_enabled) return false;
    if (type === 'exit' && !config.sms_on_exit_enabled) return false;

    // Grab correct template based on role and action type
    let template = '';
    if (isTeacherMode) {
      if (type === 'absent') template = config.teacher_template_absence;
      else if (type === 'entry') template = config.teacher_template_entry;
      else if (type === 'exit') template = config.teacher_template_exit;
    } else {
      if (type === 'absent') template = config.student_template_absence;
      else if (type === 'entry') template = config.student_template_entry;
      else if (type === 'exit') template = config.student_template_exit;
    }

    if (!template) return false;

    // Format current date & time
    const now = new Date();
    // Simple Persian/Dari readable date representation
    const dateStr = now.toLocaleDateString('fa-AF', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('fa-AF', { hour: '2-digit', minute: '2-digit' });

    // Substitute placeholders
    let message = template
      .replace(/\[name\]/g, person.name || 'مخاطب')
      .replace(/\[تاریخ\]/g, dateStr)
      .replace(/\[ساعت\]/g, timeStr);

    const taskRecord = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      type: config.default_service,
      phone: phone,
      message: message,
      status: 'pending',
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };

    await performAction(
      'tasks',
      'insert',
      taskRecord,
      () => supabase.from('tasks').insert([taskRecord])
    );

    console.log(`Notification task auto-queued for ${person.name} (${type})`);
    return true;
  } catch (err) {
    console.error('Error queueing notification task:', err);
    return false;
  }
};
