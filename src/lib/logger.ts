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
    const { data, error } = await supabase.from('activity_logs').insert([
      {
        user_email: userEmail,
        action,
        details: description
      }
    ]).select();

    return { data, error };
  } catch (err: any) {
    console.error('Logger error:', err);
    return { data: null, error: err };
  }
};
