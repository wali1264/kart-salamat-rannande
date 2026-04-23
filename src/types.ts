export type UserRole = 'admin' | 'doctor' | 'officer';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_approved: boolean;
  created_at: string;
}

export interface Driver {
  id: string;
  name: string;
  license_plate: string;
  license_number: string;
  photo_url?: string;
  phone: string;
  id_number: string;
  created_at: string;
}

export interface HealthCard {
  id: string;
  driver_id: string;
  issuer_id: string;
  issue_date: string;
  expiry_date: string;
  status: 'active' | 'expired' | 'revoked';
  is_sober: boolean;
  blood_pressure?: string;
  vision_status?: string;
  notes?: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  details: any;
  created_at: string;
}

export interface AppSettings {
  id: string;
  main_logo_url?: string;
  mini_logo_url?: string;
  updated_at?: string;
}
