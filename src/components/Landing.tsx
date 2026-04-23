import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  PlusCircle, 
  Search, 
  QrCode, 
  LogOut, 
  Menu, 
  X, 
  Settings,
  Bell,
  User as UserIcon,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DashboardHome } from './sections/DashboardHome';
import { DriverRegistration } from './sections/DriverRegistration';
import { DriverList } from './sections/DriverList';
import { QrScanner } from './sections/QrScanner';
import { SettingsSection } from './sections/SettingsSection';
import { Auth } from './Auth';

type Section = 'home' | 'registration' | 'drivers' | 'scanner' | 'settings' | 'auth';

const SectionWrapper: React.FC<{ 
  activeSection: Section; 
  user: any; 
  profile: any; 
  signOut: () => void; 
  setActiveSection: (s: Section) => void;
  searchQuery?: string;
}> = ({ activeSection, user, profile, signOut, setActiveSection, searchQuery }) => {
  switch (activeSection) {
    case 'home': return <DashboardHome />;
    case 'registration': return <DriverRegistration onComplete={() => setActiveSection('drivers')} />;
    case 'drivers': return <DriverList />;
    case 'scanner': return <QrScanner searchQuery={searchQuery} />;
    case 'settings': return <SettingsSection />;
    case 'auth': return <Auth />;
    default: return <DashboardHome />;
  }
};

export const Landing: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>(user ? 'home' : 'scanner');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveSection('scanner');
    }
  };

  const navItems = [
    { id: 'home', label: 'داشبورد', icon: LayoutDashboard, protected: true },
    { id: 'drivers', label: 'لیست رانندگان', icon: Users, protected: true },
    { id: 'registration', label: 'ثبت راننده جدید', icon: PlusCircle, protected: true },
    { id: 'scanner', label: 'اسکنر QR', icon: QrCode, protected: false },
    { id: 'settings', label: 'تنظیمات', icon: Settings, protected: true },
  ];

  const visibleNavItems = navItems.filter(item => !item.protected || user);

  return (
    <div className="min-h-screen bg-slate-50 flex" dir="rtl">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 right-0 z-50 w-72 bg-white border-l border-slate-200 transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 navy-gradient rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 text-white font-bold text-xl">A</div>
            <div>
              <h1 className="font-bold text-slate-800 leading-tight text-sm">سامانه ملی سلامت</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Afghanistan ANDHP</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            {visibleNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id as Section);
                  setIsSidebarOpen(false);
                  setSearchQuery('');
                }}
                className={`
                  w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold transition-all text-xs
                  ${activeSection === item.id 
                    ? 'navy-gradient text-white shadow-xl shadow-blue-100' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}
                `}
              >
                <item.icon className={`w-4 h-4 ${activeSection === item.id ? 'opacity-100' : 'opacity-40'}`} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-8 border-t border-slate-100 space-y-4 text-right">
            {user ? (
              <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden shadow-sm">
                    <UserIcon className="w-6 h-6 text-slate-300" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{profile?.name || 'کاربر سیستم'}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{profile?.role === 'doctor' ? 'داکتر موظف' : 'اپراتور سیستم'}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-slate-100">
                   <span className="text-[9px] text-slate-400 font-bold">وضعیت حساب:</span>
                   <span className={`status-chip ${profile?.is_approved ? 'status-approved' : 'status-pending'} !px-2 !py-0.5`}>
                     {profile?.is_approved ? 'تایید شده' : 'در انتظار تایید'}
                   </span>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setActiveSection('auth')}
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-bold text-xs transition-all border-2 ${activeSection === 'auth' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100'}`}
              >
                <ShieldCheck className="w-4 h-4" />
                ورود کارکنان (ادمین)
              </button>
            )}
            
            {user && (
              <button 
                onClick={() => signOut()}
                className="w-full flex items-center gap-3 px-5 py-3 text-rose-500 hover:bg-rose-50 rounded-2xl font-bold text-xs transition-all"
              >
                <LogOut className="w-4 h-4 opacity-70" />
                خروج از سامانه
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header */}
        <header className="h-24 bg-white/40 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-30">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-3 bg-white border border-slate-200 rounded-2xl lg:hidden transition-colors"
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </button>

          <div className="flex-1 max-w-xl mx-6 hidden md:block">
            <form onSubmit={handleSearch} className="relative group">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی سریع راننده (نمبر جواز، پلاک...)"
                className="w-full bg-white border border-slate-200 rounded-2xl py-3 pr-11 pl-4 text-xs focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
              />
            </form>
          </div>


          <div className="flex items-center gap-3">
            {activeSection !== 'scanner' && (
              <>
                <button className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl relative transition-colors">
                  <Bell className="w-5 h-5 text-slate-600" />
                  <span className="absolute top-2.5 left-2.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full" />
                </button>
                <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block" />
              </>
            )}
            <div className="text-left hidden sm:block">
               <p className="text-[10px] text-slate-500 font-medium">امروز</p>
               <p className="text-xs font-bold text-slate-800">{new Date().toLocaleDateString('fa-AF', { dateStyle: 'medium' })}</p>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <SectionWrapper 
                activeSection={activeSection} 
                user={user} 
                profile={profile} 
                signOut={signOut} 
                setActiveSection={setActiveSection}
                searchQuery={searchQuery}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
