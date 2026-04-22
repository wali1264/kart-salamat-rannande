/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Menu, 
  Home, 
  PlusCircle, 
  Scan, 
  LogOut, 
  CheckCircle2, 
  AlertCircle,
  Car,
  Search,
  ChevronRight,
  Bell,
  LayoutDashboard,
  User as UserIcon,
  Camera,
  X
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from "html5-qrcode";
import { formatToJalali, getCurrentJalaliDate } from "@/lib/dateUtils";

// shadcn components
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

// Types
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

interface User {
  id: string;
  name: string;
  role: 'manager' | 'employee';
  email: string;
  isApproved: boolean;
}

interface ActivityLog {
  id: string;
  user_email: string;
  action: string;
  details: string;
  created_at: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [view, setView] = useState<'home' | 'drivers' | 'verify' | 'new-card'>('home');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [recentExams, setRecentExams] = useState<{ card: HealthCard, driver: Driver }[]>([]);
  const [stats, setStats] = useState({
    totalDrivers: 0,
    activeCards: 0,
    pendingRenewal: 0,
    violations: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [verifyId, setVerifyId] = useState('');
  const [verifiedData, setVerifiedData] = useState<{ card: HealthCard, driver: Driver } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [newDriverDialogOpen, setNewDriverDialogOpen] = useState(false);
  const [newDriver, setNewDriver] = useState({
    name: '',
    licensePlate: '',
    vehicleType: 'کامیون بزرگ',
    licenseNumber: '',
    bloodType: 'A+',
    tazkiraNumber: '',
    phoneNumber: ''
  });

  // Initial Data Fetch
  useEffect(() => {
    if (user && user.isApproved) {
      const loadData = async () => {
        try {
          const [dRes, sRes, rRes, aRes] = await Promise.all([
            fetch('/api/drivers'),
            fetch('/api/stats'),
            fetch('/api/cards/recent'),
            fetch('/api/activities')
          ]);
          
          const [drivers, stats, recent, activities] = await Promise.all([
            dRes.json(),
            sRes.json(),
            rRes.json(),
            aRes.json()
          ]);
          
          setDrivers(drivers);
          setStats(stats);
          setRecentExams(recent);
          setActivities(activities);
        } catch (err) {
          console.error('Error loading initial data:', err);
        }
      };
      
      loadData();
    }
  }, [user]);

  // Scanner Logic
  useEffect(() => {
    if (scanning) {
      const scanner = new Html5QrcodeScanner("reader", { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true
      }, false);

      scanner.render((decodedText: string) => {
        setVerifyId(decodedText);
        setScanning(false);
        scanner.clear();
      }, (error: string) => {
        // quiet error
      });

      return () => {
        scanner.clear().catch(err => console.error(err));
      };
    }
  }, [scanning]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const endpoint = isRegistering ? '/api/signup' : '/api/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...loginForm, fullName: loginForm.email.split('@')[0] })
      });
      const data = await res.json();
      if (data.success) {
        if (isRegistering) {
            alert("ثبت‌نام با موفقیت انجام شد. لطفا منتظر تایید حساب توسط مدیر بمانید.");
            setIsRegistering(false);
        } else {
            setUser(data.user);
        }
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setLoginForm({ email: '', password: '' });
  };

  const handleVerify = async () => {
    if (!verifyId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/cards/${verifyId}`);
      const data = await res.json();
      if (data.success) {
        setVerifiedData(data);
      } else {
        alert("کارت یافت نشد یا معتبر نیست");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const [issueForm, setIssueForm] = useState({ driverId: '', location: 'کابل - مرکز معاینات' });

  const handleIssueCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueForm.driverId) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...issueForm, userEmail: user?.email })
      });
      const data = await res.json();
      if (data.id) {
        // Refresh data
        const [sRes, rRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/cards/recent')
        ]);
        setStats(await sRes.json());
        setRecentExams(await rRes.json());
        setView('home');
        setVerifyId(data.id);
        handleVerify(); // Show the new card immediately
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newDriver, userEmail: user?.email })
      });
      const data = await res.json();
      if (data.success) {
        setDrivers([...drivers, data.driver]);
        setNewDriverDialogOpen(false);
        setNewDriver({
          name: '',
          licensePlate: '',
          vehicleType: 'کامیون بزرگ',
          licenseNumber: '',
          bloodType: 'A+',
          tazkiraNumber: '',
          phoneNumber: '',
          photo: ''
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || !user.isApproved) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-white mb-4">
              <ShieldCheck size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">سامانه سلامت رانندگان</h1>
            <p className="text-slate-500 mt-2">وزارت صحت عامه و ترافیک افغانستان</p>
          </div>

          {(user && !user.isApproved) ? (
            <Card className="border-none shadow-xl bg-white p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
                    <AlertCircle size={40} />
                </div>
                <div className="space-y-2">
                    <h2 className="text-xl font-bold">دسترسی محدود شده</h2>
                    <p className="text-slate-500 text-sm">حساب کاربری شما (`{user.email}`) در انتظار تایید مدیریت است.</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-400 text-right">
                    لطفاً تا تایید نهایی توسط ادمین سیستم صبور باشید. پس از تایید مدیر، با رفرش کردن صفحه به پنل دسترسی خواهید داشت.
                </div>
                <Button variant="outline" className="w-full" onClick={handleLogout}>خروج و ورود با حساب دیگر</Button>
            </Card>
          ) : (
            <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader>
                <CardTitle className="text-xl">{isRegistering ? "ثبت‌نام حساب جدید" : "ورود به سیستم"}</CardTitle>
                <CardDescription>
                    {isRegistering ? "اطلاعات خود را برای ایجاد حساب وارد کنید" : "لطفاً مشخصات خود را وارد کنید"}
                </CardDescription>
                </CardHeader>
                <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                    <label className="text-sm font-medium">ایمیل کاری</label>
                    <Input 
                        type="email" 
                        placeholder="name@gmail.com" 
                        value={loginForm.email}
                        onChange={e => setLoginForm({...loginForm, email: e.target.value})}
                        required
                    />
                    </div>
                    <div className="space-y-2">
                    <label className="text-sm font-medium">رمز عبور</label>
                    <Input 
                        type="password" 
                        value={loginForm.password}
                        onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                        required
                    />
                    </div>
                    <Button className="w-full h-12 text-lg" disabled={isLoading}>
                    {isLoading ? "در حال پردازش..." : (isRegistering ? "ثبت‌نام در سامانه" : "ورود به پنل")}
                    </Button>
                    <div className="text-center mt-4">
                        <button 
                            type="button" 
                            className="text-sm text-primary font-bold hover:underline"
                            onClick={() => setIsRegistering(!isRegistering)}
                        >
                            {isRegistering ? "قبلاً ثبت‌نام کرده‌اید؟ وارد شوید" : "حساب ندارید؟ ثبت‌نام کنید"}
                        </button>
                    </div>
                </form>
                </CardContent>
            </Card>
          )}
          
          <p className="text-center text-xs text-slate-400 mt-8">
            تمامی فعالیت‌ها در این سامانه ثبت و مانیتور می‌شوند.
          </p>
        </motion.div>
      </div>
    );
  }

  const NavItem = ({ icon: Icon, label, id, active }: { icon: any, label: string, id: any, active: boolean }) => (
    <button 
      onClick={() => { setView(id); setSidebarOpen(false); }}
      className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${
        active 
          ? 'bg-primary/10 text-primary font-bold' 
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <Icon size={20} />
      <span className="text-sm">{label}</span>
      {active && <motion.div layoutId="nav-active" className="mr-auto w-1 h-5 bg-primary rounded-full" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row font-sans pb-16 md:pb-0" dir="rtl">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b sticky top-0 z-50">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="focus:outline-none">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0 border-l">
             <div className="p-6 h-full flex flex-col" dir="rtl">
                <div className="flex items-center gap-3 mb-10">
                  <ShieldCheck className="text-primary" />
                  <span className="font-bold text-lg">سلامت راننده</span>
                </div>
                <nav className="space-y-2 flex-grow">
                  <NavItem icon={Home} label="داشبورد" id="home" active={view === 'home'} />
                  <NavItem icon={Car} label="لیست رانندگان" id="drivers" active={view === 'drivers'} />
                  <NavItem icon={Scan} label="تایید اصالت کارت" id="verify" active={view === 'verify'} />
                  <NavItem icon={PlusCircle} label="صدور کارت جدید" id="new-card" active={view === 'new-card'} />
                </nav>
                <div className="pt-6 border-t font-mono mt-auto">
                  <Button variant="ghost" className="w-full justify-start gap-3 text-red-500 hover:bg-red-50" onClick={handleLogout}>
                    <LogOut size={20} /> LOGOUT
                  </Button>
                </div>
             </div>
          </SheetContent>
        </Sheet>
        <span className="font-bold flex items-center gap-2">
          <ShieldCheck className="text-primary w-5 h-5" /> سلامت راننده
        </span>
        <Avatar className="w-8 h-8">
          <AvatarFallback>{user.email[0]}</AvatarFallback>
        </Avatar>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 flex-col bg-white border-l p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight">سلامت راننده</h2>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Driver Health System</p>
          </div>
        </div>

        <nav className="space-y-2 flex-grow">
          <NavItem icon={LayoutDashboard} label="داشبورد اصلی" id="home" active={view === 'home'} />
          <NavItem icon={Car} label="مدیریت رانندگان" id="drivers" active={view === 'drivers'} />
          <NavItem icon={Scan} label="تایید اصالت (اسکن)" id="verify" active={view === 'verify'} />
          <NavItem icon={PlusCircle} label="صدور کارت جدید" id="new-card" active={view === 'new-card'} />
        </nav>

        <div className="bg-slate-50 rounded-2xl p-4 mb-4 font-mono">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="w-10 h-10 border-2 border-white">
              <AvatarFallback>{user.email[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs font-bold truncate w-32">{user.email}</p>
              <Badge variant="secondary" className="text-[9px] uppercase">{user.role}</Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-red-500 gap-2 h-8" onClick={handleLogout}>
            <LogOut size={14} /> LOGOUT
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-4 md:p-10 overflow-auto">
        <header className="mb-8 hidden md:flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {view === 'home' && "خوش آمدید، " + user.email.split('@')[0]}
              {view === 'drivers' && "مدیریت رانندگان"}
              {view === 'verify' && "سیستم تایید اصالت کارت"}
              {view === 'new-card' && "صدور کارت دیجیتال"}
            </h1>
            <p className="text-slate-500 mt-1">
              {view === 'home' && "آخرین وضعیت و آمارهای نظارتی کل کشور"}
              {view === 'drivers' && "لیست تمامی رانندگان دارای پروفایل در سیستم"}
              {view === 'verify' && "بررسی اعتبار کارت‌های صادر شده با شماره سریال"}
              {view === 'new-card' && "ثبت نتایج آزمایش سلامت و صدور کارت جدید"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="rounded-full shadow-sm"><Bell size={20} /></Button>
            <div className="h-10 w-[1px] bg-slate-200 mx-2" />
            <div className="text-left font-sans">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">SOLAR DATE</p>
              <p className="text-sm font-bold text-primary">{getCurrentJalaliDate()}</p>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'کل رانندگان', val: stats.totalDrivers.toLocaleString(), unit: 'نفر', icon: Car, color: 'text-blue-500' },
                  { label: 'کارت‌های فعال', val: stats.activeCards.toLocaleString(), unit: 'کارت', icon: CheckCircle2, color: 'text-green-500' },
                  { label: 'در انتظار تمدید', val: stats.pendingRenewal.toLocaleString(), unit: 'نفر', icon: AlertCircle, color: 'text-orange-500' },
                  { label: 'تخلفات گزارش شده', val: stats.violations.toLocaleString(), unit: 'مورد', icon: ShieldCheck, color: 'text-red-500' },
                ].map((stat, i) => (
                  <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <stat.icon size={26} className={stat.color} />
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Live System</span>
                      </div>
                      <p className="text-sm font-medium text-slate-600 mb-1">{stat.label}</p>
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-black text-slate-900">{stat.val}</h3>
                        <span className="text-xs font-bold text-slate-400">{stat.unit}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-none shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">آخرین معاینات انجام شده</CardTitle>
                    <Button variant="link" className="text-xs">مشاهده همه</Button>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">شماره کارت</TableHead>
                          <TableHead className="font-bold">نام راننده</TableHead>
                          <TableHead className="font-bold">نتیجه تست</TableHead>
                          <TableHead className="text-left font-bold">تاریخ انقضا (جلالی)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentExams.length > 0 ? recentExams.map((item, i) => (
                          <TableRow key={i} className="hover:bg-slate-50 transition-colors">
                            <TableCell className="font-mono text-xs font-bold text-primary">{item.card.id}</TableCell>
                            <TableCell className="font-medium">{item.driver.name}</TableCell>
                            <TableCell>
                              <Badge className={`${item.card.isSober ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} border-none`}>
                                {item.card.isSober ? 'سالم (منفی)' : 'مثبت (تخلف)'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-left text-slate-700 font-bold">{formatToJalali(item.card.expiryDate)}</TableCell>
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-10 text-slate-400">هیچ معاینه‌ای ثبت نشده است</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-primary text-white overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                  <CardHeader>
                    <CardTitle>دسترسی سریع</CardTitle>
                    <CardDescription className="text-white/70">اقدامات پرکاربرد سیستم</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 relative z-10">
                    <Button className="w-full bg-white text-primary hover:bg-white/90 gap-2" onClick={() => setView('verify')}>
                      <Scan size={18} /> اسکن و تایید کارت
                    </Button>
                    <Button variant="outline" className="w-full bg-transparent border-white/30 text-white hover:bg-white/10 gap-2" onClick={() => setView('new-card')}>
                      <PlusCircle size={18} /> ثبت آزمایش جدید
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">فعالیت‌های اخیر (Recent Activities)</CardTitle>
                    <CardDescription>گزارش عملکرد کاربران در سیستم</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                        {activities.length > 0 ? activities.map((log) => (
                            <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors border-r-4 border-primary/20">
                                <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                                    <Bell size={16} />
                                </div>
                                <div className="flex-grow">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="font-bold text-sm text-slate-800">{log.action}</p>
                                        <span className="text-[10px] font-mono text-slate-400">{new Date(log.created_at).toLocaleTimeString('fa-IR')}</span>
                                    </div>
                                    <p className="text-xs text-slate-600 line-clamp-1">{log.details}</p>
                                    <p className="text-[10px] font-bold text-primary mt-1">{log.user_email}</p>
                                </div>
                            </div>
                        )) : (
                            <p className="text-center py-6 text-slate-400 text-sm">هیچ فعالیتی ثبت نشده است</p>
                        )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {view === 'verify' && (
            <motion.div 
              key="verify"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto space-y-6"
            >
              <Card className="border-none shadow-lg">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Scan className="text-primary" size={32} />
                  </div>
                  <CardTitle>تایید اعتبار کارت سلامت</CardTitle>
                  <CardDescription>شماره سریال کارت را وارد کنید یا کد QR را اسکن نمایید</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input 
                      placeholder="مثلاً: C-1001" 
                      className="h-12 text-lg font-mono tracking-widest text-center"
                      value={verifyId}
                      onChange={e => setVerifyId(e.target.value)}
                    />
                    <Button size="lg" className="h-12 px-8" onClick={handleVerify} disabled={isLoading}>
                      {isLoading ? "بررسی" : "بررسی"}
                    </Button>
                  </div>
                  {scanning ? (
                    <div className="space-y-4">
                      <div id="reader" className="w-full border-2 border-dashed rounded-2xl overflow-hidden bg-black" />
                      <Button variant="destructive" className="w-full" onClick={() => setScanning(false)}>انصراف از اسکن</Button>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full h-16 text-lg gap-3 border-dashed border-2 hover:border-primary" onClick={() => setScanning(true)}>
                      <Scan size={24} /> باز کردن اسکنر روی دوربین
                    </Button>
                  )}
                </CardContent>
              </Card>

              {verifiedData && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-8 max-w-2xl mx-auto"
                >
                  <Card className="border-none shadow-2xl bg-white overflow-hidden relative">
                      <div className="absolute top-0 right-0 p-4 opacity-5">
                        <ShieldCheck size={200} />
                      </div>
                      <CardContent className="p-0">
                         {/* Card Header (Official Look) */}
                         <div className="bg-slate-900 p-6 text-white flex justify-between items-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-white to-green-600" />
                            <div className="flex gap-4 items-center">
                               <div className="bg-white p-1 rounded-lg">
                                 <ShieldCheck className="text-primary" size={32} />
                               </div>
                               <div>
                                  <h3 className="font-bold text-lg leading-tight">جمهوری اسلامی افغانستان</h3>
                                  <p className="text-[10px] opacity-70 uppercase tracking-widest font-mono">Ministry of Public Health - Traffic Dept</p>
                               </div>
                            </div>
                            <div className="text-left font-mono">
                               <p className="text-[10px] opacity-60">ID CODE</p>
                               <p className="font-bold tracking-tighter text-blue-400">{verifiedData.card.id}</p>
                            </div>
                         </div>

                         {/* Card Body */}
                         <div className="p-8">
                            <div className="flex flex-col md:flex-row gap-8">
                               <div className="flex flex-col items-center gap-4">
                                  <div className="w-32 h-40 bg-slate-100 rounded-lg border-2 border-slate-200 overflow-hidden shadow-inner flex items-center justify-center text-center">
                                     {verifiedData.driver.photo ? (
                                        <img src={verifiedData.driver.photo} alt={verifiedData.driver.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                     ) : (
                                        <UserIcon size={48} className="text-slate-300" />
                                     )}
                                  </div>
                                  <div className="text-center font-mono text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded border overflow-hidden">
                                     BIOMETRIC VERIFIED
                                  </div>
                               </div>

                               <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-right">
                                  <div className="sm:col-span-2 border-b pb-2 mb-2">
                                     <h4 className="text-2xl font-black text-slate-900">{verifiedData.driver.name}</h4>
                                     <p className="text-xs text-slate-500 font-bold">Driver Identity Card</p>
                                  </div>
                                  
                                  <div>
                                     <p className="text-[10px] font-bold text-slate-400 uppercase">Tazkira Number</p>
                                     <p className="font-bold text-lg font-mono text-slate-800">{verifiedData.driver.tazkiraNumber}</p>
                                  </div>
                                  <div>
                                     <p className="text-[10px] font-bold text-slate-400 uppercase">License Plate</p>
                                     <p className="font-bold text-lg font-mono text-primary">{verifiedData.driver.licensePlate}</p>
                                  </div>
                                  <div>
                                     <p className="text-[10px] font-bold text-slate-400 uppercase">Vehicle Type</p>
                                     <p className="font-bold text-slate-800">{verifiedData.driver.vehicleType}</p>
                                  </div>
                                  <div>
                                     <p className="text-[10px] font-bold text-slate-400 uppercase">Blood Group</p>
                                     <Badge className="bg-red-600 text-white font-black px-3">{verifiedData.driver.bloodType}</Badge>
                                  </div>
                                  
                                  <div className="sm:col-span-2 mt-4 flex items-center justify-between p-4 bg-green-50 rounded-2xl border-2 border-green-200 shadow-sm relative overflow-hidden group">
                                     <div className="absolute inset-0 bg-green-500/5 group-hover:bg-green-500/10 transition-colors" />
                                      <div className="flex items-center gap-6 relative z-10">
                                         <div className="bg-white p-2 rounded-lg shadow-sm border">
                                            <QRCodeSVG 
                                               value={`https://verify.health.gov.af/card/${verifiedData.card.id}`}
                                               size={64}
                                               level="H"
                                               includeMargin={false}
                                            />
                                         </div>
                                         <div className="text-right">
                                            <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest">Medical Health Status</p>
                                            <div className="flex items-center gap-2 text-green-700">
                                               <CheckCircle2 size={24} />
                                               <span className="font-black text-xl">VALID / معتبر</span>
                                            </div>
                                         </div>
                                      </div>
                                     <div className="text-left relative z-10 font-mono">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Expiry Date (Jalali)</p>
                                        <p className="font-black text-xl text-green-800 tracking-tight">{formatToJalali(verifiedData.card.expiryDate)}</p>
                                     </div>
                                  </div>
                               </div>
                            </div>
                         </div>
                         
                         {/* Card Footer */}
                         <div className="bg-slate-50 p-4 border-t flex justify-between items-center text-[10px] font-bold text-slate-400">
                            <div>ISSUE LOC: {verifiedData.card.location}</div>
                            <div className="flex gap-2 items-center">
                               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                               SYSTEM AUTHENTICATED
                            </div>
                         </div>
                      </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          )}

          {view === 'drivers' && (
            <motion.div 
              key="drivers"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                 <div className="relative w-full sm:w-96">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input className="pr-10" placeholder="جستجوی راننده، پلیت یا تذکره..." />
                 </div>
                 <Dialog open={newDriverDialogOpen} onOpenChange={setNewDriverDialogOpen}>
                    <DialogTrigger asChild>
                       <Button className="w-full sm:w-auto gap-2 h-11">
                          <PlusCircle size={18} /> ثبت راننده جدید
                       </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl" dir="rtl">
                       <DialogHeader>
                          <DialogTitle className="text-xl font-black">ثبت راننده جدید در سامانه</DialogTitle>
                          <DialogDescription>اطلاعات هویتی و مسلکی راننده را با دقت وارد کنید.</DialogDescription>
                       </DialogHeader>
                       <form onSubmit={handleCreateDriver} className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                          <div className="md:col-span-2 flex justify-center mb-4">
                             <div className="relative group">
                                <div className="w-24 h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                                   {newDriver.photo ? (
                                      <img src={newDriver.photo} alt="Preview" className="w-full h-full object-cover" />
                                   ) : (
                                      <>
                                         <Camera className="text-slate-400 mb-1" size={24} />
                                         <span className="text-[10px] font-bold text-slate-400 text-center px-1">آپلود عکس ۳×۴</span>
                                      </>
                                   )}
                                   <input 
                                      type="file" 
                                      accept="image/*" 
                                      className="absolute inset-0 opacity-0 cursor-pointer"
                                      onChange={async (e) => {
                                         if (e.target.files && e.target.files[0]) {
                                            const base64 = await fileToBase64(e.target.files[0]);
                                            setNewDriver({...newDriver, photo: base64});
                                         }
                                      }}
                                   />
                                </div>
                                {newDriver.photo && (
                                   <button 
                                      type="button"
                                      onClick={() => setNewDriver({...newDriver, photo: ''})}
                                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg"
                                   >
                                      <X size={12} />
                                   </button>
                                )}
                             </div>
                          </div>
                          <div className="space-y-2">
                             <label className="text-sm font-bold text-slate-600">نام و تخلص کامل</label>
                             <Input required value={newDriver.name} onChange={e => setNewDriver({...newDriver, name: e.target.value})} placeholder="مثلاً: احمد نوری" className="h-11 bg-slate-50" />
                          </div>
                          <div className="space-y-2">
                             <label className="text-sm font-bold text-slate-600">نمبر تذکره</label>
                             <Input required value={newDriver.tazkiraNumber} onChange={e => setNewDriver({...newDriver, tazkiraNumber: e.target.value})} placeholder="مثلاً: 1395-..." className="h-11 bg-slate-50 font-mono" />
                          </div>
                          <div className="space-y-2">
                             <label className="text-sm font-bold text-slate-600">نمبر پلیت موتر</label>
                             <Input required value={newDriver.licensePlate} onChange={e => setNewDriver({...newDriver, licensePlate: e.target.value})} placeholder="مثلاً: KBL-12345" className="h-11 bg-slate-50 font-mono" />
                          </div>
                          <div className="space-y-2">
                             <label className="text-sm font-bold text-slate-600">نمبر جواز رانندگی</label>
                             <Input required value={newDriver.licenseNumber} onChange={e => setNewDriver({...newDriver, licenseNumber: e.target.value})} placeholder="مثلاً: AF-98765" className="h-11 bg-slate-50 font-mono" />
                          </div>
                          <div className="space-y-2">
                             <label className="text-sm font-bold text-slate-600">نوع واسطه</label>
                             <select className="w-full h-11 px-3 border rounded-md bg-slate-50 font-bold" value={newDriver.vehicleType} onChange={e => setNewDriver({...newDriver, vehicleType: e.target.value})}>
                                <option value="کامیون بزرگ">کامیون بزرگ (باربری)</option>
                                <option value="بس مسافربری">بس مسافربری</option>
                                <option value="تاکسی">تاکسی</option>
                                <option value="موتر شخصی">موتر شخصی</option>
                             </select>
                          </div>
                          <div className="space-y-2">
                             <label className="text-sm font-bold text-slate-600">گروه خون</label>
                             <select className="w-full h-11 px-3 border rounded-md bg-slate-50 font-bold" value={newDriver.bloodType} onChange={e => setNewDriver({...newDriver, bloodType: e.target.value})}>
                                <option value="A+">A+</option>
                                <option value="A-">A-</option>
                                <option value="B+">B+</option>
                                <option value="B-">B-</option>
                                <option value="O+">O+</option>
                                <option value="O-">O-</option>
                                <option value="AB+">AB+</option>
                                <option value="AB-">AB-</option>
                             </select>
                          </div>
                          <div className="space-y-2 md:col-span-2">
                             <label className="text-sm font-bold text-slate-600">شماره تماس (افغانستان)</label>
                             <Input required value={newDriver.phoneNumber} onChange={e => setNewDriver({...newDriver, phoneNumber: e.target.value})} placeholder="مثلاً: 0788123456" className="h-11 bg-slate-50 font-mono" />
                          </div>
                          <div className="md:col-span-2 pt-6 flex gap-3 border-t mt-4">
                             <Button type="submit" className="flex-grow h-12 text-lg font-bold" disabled={isLoading}>
                                {isLoading ? "در حال ثبت..." : "ثبت نهایی و بایومتریک"}
                             </Button>
                             <Button type="button" variant="outline" className="h-12 px-6" onClick={() => setNewDriverDialogOpen(false)}>انصراف</Button>
                          </div>
                       </form>
                    </DialogContent>
                 </Dialog>
              </div>

              <Card className="border-none shadow-sm overflow-hidden">
                 <Table>
                    <TableHeader className="bg-slate-50">
                       <TableRow>
                          <TableHead className="w-16">تصویر</TableHead>
                          <TableHead className="font-bold">نام و تخلص</TableHead>
                          <TableHead className="font-bold">تذکره / پلیت</TableHead>
                          <TableHead className="font-bold">گروه خون</TableHead>
                          <TableHead className="font-bold">نوع وسائط</TableHead>
                          <TableHead className="text-left font-bold">عملیات</TableHead>
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                       {drivers.map(driver => (
                          <TableRow key={driver.id} className="hover:bg-slate-50/50 cursor-pointer group" onClick={() => setSelectedDriver(driver)}>
                             <TableCell>
                                <Avatar className="w-10 h-10 border shadow-sm rounded-lg overflow-hidden">
                                   <AvatarImage src={driver.photo} className="object-cover" />
                                   <AvatarFallback className="rounded-none">{driver.name[0]}</AvatarFallback>
                                </Avatar>
                             </TableCell>
                             <TableCell>
                                <p className="font-bold text-slate-900">{driver.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">ID: {driver.id}</p>
                             </TableCell>
                             <TableCell>
                                <div className="flex flex-col">
                                   <span className="font-mono text-xs font-bold text-slate-600">{driver.tazkiraNumber}</span>
                                   <span className="font-mono text-xs text-primary">{driver.licensePlate}</span>
                                </div>
                             </TableCell>
                             <TableCell><Badge variant="outline" className="border-red-200 text-red-600 font-bold bg-red-50">{driver.bloodType}</Badge></TableCell>
                             <TableCell className="text-xs font-semibold text-slate-600">{driver.vehicleType}</TableCell>
                             <TableCell className="text-left">
                                <Button variant="ghost" size="icon" className="group-hover:text-primary transition-colors"><ChevronRight size={18} /></Button>
                             </TableCell>
                          </TableRow>
                       ))}
                    </TableBody>
                 </Table>
              </Card>
            </motion.div>
          )}

          {view === 'new-card' && (
            <motion.div 
              key="new-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto"
            >
              <Card className="border-none shadow-xl overflow-hidden">
                 <div className="grid grid-cols-1 md:grid-cols-3">
                    <div className="bg-primary p-12 text-white flex flex-col justify-between">
                       <div>
                          <h2 className="text-2xl font-bold mb-4 whitespace-pre-wrap">صدور آنی کارت هوشمند سلامت</h2>
                          <p className="text-white/70 text-sm">لطفاً ابتدا راننده را انتخاب کرده و نتایج آزمایش الکل و مواد مخدر را وارد نمایید.</p>
                       </div>
                       <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                          <p className="text-xs uppercase tracking-tighter opacity-60 mb-2">اطلاعات ضروری</p>
                          <ul className="text-xs space-y-2">
                             <li className="flex items-center gap-2"><CheckCircle2 size={12}/> نتیجه آزمایش طبی</li>
                             <li className="flex items-center gap-2"><CheckCircle2 size={12}/> تایید هویت بایومتریک</li>
                             <li className="flex items-center gap-2"><CheckCircle2 size={12}/> ثبت موقعیت معاینه</li>
                          </ul>
                       </div>
                    </div>
                    <div className="md:col-span-2 p-8 md:p-12">
                       <form onSubmit={handleIssueCard} className="space-y-6">
                          <div className="space-y-2">
                             <label className="text-sm font-bold">انتخاب راننده</label>
                             <select 
                               required
                               value={issueForm.driverId}
                               onChange={e => setIssueForm({...issueForm, driverId: e.target.value})}
                               className="w-full h-11 px-3 border rounded-md bg-slate-50 font-medium"
                             >
                                <option value="">انتخاب راننده مورد نظر...</option>
                                {drivers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.tazkiraNumber})</option>)}
                             </select>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <label className="text-sm font-bold">نتیجه تست الکل</label>
                                <Badge className="w-full h-11 flex justify-center cursor-default bg-green-500 hover:bg-green-500 text-white font-bold">سالم (منفی)</Badge>
                             </div>
                             <div className="space-y-2">
                                <label className="text-sm font-bold">نتیجه تست مواد</label>
                                <Badge className="w-full h-11 flex justify-center cursor-default bg-green-500 hover:bg-green-500 text-white font-bold">سالم (منفی)</Badge>
                             </div>
                          </div>

                          <div className="space-y-2">
                             <label className="text-sm font-bold">مرکز صادرکننده و ثبت موقعیت</label>
                             <Input 
                               value={issueForm.location} 
                               onChange={e => setIssueForm({...issueForm, location: e.target.value})}
                               className="bg-slate-50" 
                             />
                          </div>

                          <div className="pt-6 border-t flex gap-4">
                             <Button type="submit" className="flex-grow h-12 text-lg" disabled={isLoading || !issueForm.driverId}>
                               {isLoading ? "در حال صدور..." : "صدور و ثبت کارت هوشمند"}
                             </Button>
                             <Button variant="outline" type="button" className="h-12 px-6" onClick={() => setView('home')}>انصراف</Button>
                          </div>
                       </form>
                    </div>
                 </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Verification Overlay Container (Floating) */}
      <Dialog open={!!verifiedData} onOpenChange={(open) => !open && setVerifiedData(null)}>
         <DialogContent className="max-w-3xl border-none p-0 overflow-hidden bg-transparent shadow-none" dir="rtl">
            {/* The content is already managed inside the view blocks, but we can put a dedicated detailed modal here if needed */}
         </DialogContent>
      </Dialog>
      {/* Persistent Bottom Nav for Mobile */}
      <Dialog open={!!selectedDriver} onOpenChange={(open) => !open && setSelectedDriver(null)}>
          <DialogContent className="max-w-xl" dir="rtl">
             {selectedDriver && (
               <>
                 <DialogHeader>
                    <DialogTitle className="text-2xl font-black">پروفایل کامل راننده</DialogTitle>
                    <DialogDescription>اطلاعات ثبت شده در بایومتریک مرکزی</DialogDescription>
                 </DialogHeader>
                 <div className="flex flex-col gap-6 py-4">
                    <div className="flex items-start gap-6">
                       <div className="w-24 h-32 rounded-lg bg-slate-100 overflow-hidden border shadow-sm">
                          {selectedDriver.photo ? (
                            <img src={selectedDriver.photo} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300"><UserIcon size={40} /></div>
                          )}
                       </div>
                       <div className="flex-grow space-y-3">
                          <div>
                             <h4 className="text-xl font-bold">{selectedDriver.name}</h4>
                             <p className="text-sm text-slate-500">{selectedDriver.vehicleType}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div>
                                <p className="text-[10px] font-bold text-slate-400">نمبر تذکره</p>
                                <p className="font-mono font-bold">{selectedDriver.tazkiraNumber}</p>
                             </div>
                             <div>
                                <p className="text-[10px] font-bold text-slate-400">گروه خون</p>
                                <Badge className="bg-red-500">{selectedDriver.bloodType}</Badge>
                             </div>
                             <div>
                                <p className="text-[10px] font-bold text-slate-400">نمبر پلیت</p>
                                <p className="font-mono font-bold text-primary">{selectedDriver.licensePlate}</p>
                             </div>
                             <div>
                                <p className="text-[10px] font-bold text-slate-400">شماره تماس</p>
                                <p className="font-mono font-bold">{selectedDriver.phoneNumber}</p>
                             </div>
                          </div>
                       </div>
                    </div>
                    
                    <div className="border-t pt-4">
                       <h5 className="font-bold mb-3 text-slate-700">سوابق و اقدامات</h5>
                       <div className="space-y-2">
                          <Button variant="outline" className="w-full justify-start gap-3 h-12" onClick={() => {
                            setIssueForm({...issueForm, driverId: selectedDriver.id});
                            setSelectedDriver(null);
                            setView('new-card');
                          }}>
                             <PlusCircle size={18} /> صدور کارت سلامت جدید برای این راننده
                          </Button>
                          <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-slate-500">
                             <ShieldCheck size={18} /> مشاهده تاریخچه تخلفات (غیرفعال)
                          </Button>
                       </div>
                    </div>
                 </div>
               </>
             )}
          </DialogContent>
      </Dialog>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t flex items-center justify-around px-2 z-50">
        {[
          { id: 'home', icon: Home, label: 'خانه' },
          { id: 'drivers', icon: Car, label: 'رانندگان' },
          { id: 'verify', icon: Scan, label: 'اسکنر' },
          { id: 'new-card', icon: PlusCircle, label: 'صدور' }
        ].map(item => (
          <button 
            key={item.id} 
            onClick={() => setView(item.id as any)}
            className={`flex flex-col items-center gap-1 flex-1 py-2 transition-colors ${view === item.id ? 'text-primary' : 'text-slate-400'}`}
          >
            <item.icon size={22} className={view === item.id ? 'scale-110 transition-transform' : ''} />
            <span className="text-[10px] font-bold">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

