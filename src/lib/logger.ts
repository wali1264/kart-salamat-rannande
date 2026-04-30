import { supabase } from './supabase';

export type LogAction = 
  | 'login' 
  | 'logout' 
  | 'create_student' 
  | 'update_student' 
  | 'delete_student' 
  | 'issue_card' 
  | 'renew_card' 
  | 'payment'
  | 'system_update';

export const logActivity = async (
  userEmail: string, 
  action: LogAction, 
  description: string, 
  details: any = {}
) => {
  try {
    const { error } = await supabase.from('activity_logs').insert([
      {
        user_email: userEmail,
        action,
        details: description // Storing the main description in the details column as seen in screenshot
      }
    ]);

    if (error) {
      // If table doesn't exist, this will fail gracefully but log to console for dev
      console.warn('Logging failed. Check if activity_logs table exists:', error);
    }
  } catch (err) {
    console.error('Logger error:', err);
  }
};
