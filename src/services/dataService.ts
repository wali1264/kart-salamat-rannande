import { supabase } from '../lib/supabase';

interface Driver {
  id: string;
  name: string;
  licensePlate: string;
  vehicleType: string;
  licenseNumber: string;
  photo: string;
  bloodType: string;
  tazkiraNumber: string;
  phoneNumber: string;
}

interface HealthCard {
  id: string;
  driverId: string;
  issueDate: string;
  expiryDate: string;
  isSober: boolean;
  status: 'valid' | 'expired' | 'revoked';
  location: string;
}

interface ActivityLog {
  id: string;
  user_email: string;
  action: string;
  details: string;
  created_at: string;
}

class DataService {
  // ثبت‌نام کاربر جدید
  async signUp(email: string, password: string, fullName: string) {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    });
  }

  // ورود کاربر و بررسی وضعیت تایید
  async login(email: string, password: string) {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) return { user: null, error: "ایمیل یا رمز عبور اشتباه است" };

    const userId = authData.user.id;
    const isApproved = await this.checkApproval(userId);

    const user = {
      id: userId,
      email: authData.user.email,
      name: authData.user.user_metadata?.full_name || email.split('@')[0],
      role: 'employee', // پیش‌فرض
      isApproved: isApproved
    };

    return { user, error: null };
  }

  // تایید وضعیت تایید کاربر در پروفایل
  async checkApproval(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_approved')
      .eq('id', userId)
      .single();
    
    if (error || !data) return false;
    return data.is_approved;
  }

  // ثبت گزارش فعالیت
  async logActivity(email: string, action: string, details: string) {
    await supabase.from('activity_logs').insert([{
      user_email: email,
      action,
      details
    }]);
  }

  // دریافت گزارشات اخیر
  async getRecentActivities(limit = 10): Promise<ActivityLog[]> {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    return data || [];
  }

  async getDrivers(): Promise<Driver[]> {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return [];
    
    return data.map(d => ({
      id: d.id,
      name: d.name,
      licensePlate: d.license_plate,
      vehicleType: d.vehicle_type,
      licenseNumber: d.license_number,
      photo: d.photo,
      bloodType: d.blood_type,
      tazkiraNumber: d.tazkira_number,
      phoneNumber: d.phone_number
    }));
  }

  async getRecentCards(limit = 5): Promise<{ card: HealthCard, driver: Driver }[]> {
    const { data, error } = await supabase
      .from('health_cards')
      .select(`
        *,
        driver:drivers(*)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return [];

    return data.map(item => ({
      card: {
        id: item.id,
        driverId: item.driver_id,
        issueDate: item.issue_date,
        expiryDate: item.expiry_date,
        isSober: item.is_sober,
        status: item.status,
        location: item.location
      },
      driver: {
        id: item.driver.id,
        name: item.driver.name,
        licensePlate: item.driver.license_plate,
        vehicleType: item.driver.vehicle_type,
        licenseNumber: item.driver.license_number,
        photo: item.driver.photo,
        bloodType: item.driver.blood_type,
        tazkiraNumber: item.driver.tazkira_number,
        phoneNumber: item.driver.phone_number
      }
    }));
  }

  async getCardById(cardId: string): Promise<{ card: HealthCard, driver: Driver } | null> {
    const { data, error } = await supabase
      .from('health_cards')
      .select(`
        *,
        driver:drivers(*)
      `)
      .eq('id', cardId)
      .single();

    if (error || !data) return null;

    return {
      card: {
        id: data.id,
        driverId: data.driver_id,
        issueDate: data.issue_date,
        expiryDate: data.expiry_date,
        isSober: data.is_sober,
        status: data.status,
        location: data.location
      },
      driver: {
        id: data.driver.id,
        name: data.driver.name,
        licensePlate: data.driver.license_plate,
        vehicleType: data.driver.vehicle_type,
        licenseNumber: data.driver.license_number,
        photo: data.driver.photo,
        bloodType: data.driver.blood_type,
        tazkiraNumber: data.driver.tazkira_number,
        phoneNumber: data.driver.phone_number
      }
    };
  }

  async getStats() {
    const [
      { count: driversCount },
      { count: activeCount },
      { count: expiredCount },
      { count: revokedCount }
    ] = await Promise.all([
      supabase.from('drivers').select('*', { count: 'exact', head: true }),
      supabase.from('health_cards').select('*', { count: 'exact', head: true }).eq('status', 'valid'),
      supabase.from('health_cards').select('*', { count: 'exact', head: true }).eq('status', 'expired'),
      supabase.from('health_cards').select('*', { count: 'exact', head: true }).eq('status', 'revoked'),
    ]);

    return {
      totalDrivers: driversCount || 0,
      activeCards: activeCount || 0,
      pendingRenewal: expiredCount || 0,
      violations: revokedCount || 0,
    };
  }

  async createCard(driverId: string, location: string, userEmail: string): Promise<HealthCard> {
    const issueDate = new Date().toISOString().split('T')[0];
    const expiryDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('health_cards')
      .insert([{
        driver_id: driverId,
        issue_date: issueDate,
        expiry_date: expiryDate,
        is_sober: true,
        status: 'valid',
        location
      }])
      .select()
      .single();

    if (error) throw error;
    
    // ثبت فعالیت
    await this.logActivity(userEmail, "صدور کارت سلامت", `کارت جدید برای راننده با شناسه ${driverId} صادر شد.`);

    return {
      id: data.id,
      driverId: data.driver_id,
      issueDate: data.issue_date,
      expiryDate: data.expiry_date,
      isSober: data.is_sober,
      status: data.status,
      location: data.location
    };
  }

  async createDriver(driver: Omit<Driver, 'id'>, userEmail: string): Promise<Driver> {
    const { data, error } = await supabase
      .from('drivers')
      .insert([{
        name: driver.name,
        license_plate: driver.licensePlate,
        vehicle_type: driver.vehicleType,
        license_number: driver.licenseNumber,
        photo: driver.photo,
        blood_type: driver.bloodType,
        tazkira_number: driver.tazkiraNumber,
        phone_number: driver.phoneNumber
      }])
      .select()
      .single();

    if (error) throw error;

    // ثبت فعالیت
    await this.logActivity(userEmail, "ثبت راننده جدید", `راننده با نام ${driver.name} در سیستم ثبت شد.`);

    return {
      id: data.id,
      name: data.name,
      licensePlate: data.license_plate,
      vehicleType: data.vehicle_type,
      licenseNumber: data.license_number,
      photo: data.photo,
      bloodType: data.blood_type,
      tazkiraNumber: data.tazkira_number,
      phoneNumber: data.phone_number
    };
  }
}

export const dataService = new DataService();
