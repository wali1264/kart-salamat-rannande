import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  Eye, 
  PlusCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  QrCode,
  Trash2,
  Edit,
  Printer,
  ChevronDown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Driver, HealthCard } from '../../types';
import { HealthCardModal } from '../HealthCardModal';
import { ViewHealthCard } from '../ViewHealthCard';
import { EditDriverModal } from '../EditDriverModal';
import { useAuth } from '../../contexts/AuthContext';
import { useSystem } from '../../contexts/SystemContext';
import { useSync } from '../../contexts/SyncContext';
import { logActivity } from '../../lib/logger';

export const DriverList: React.FC = () => {
  const { user } = useAuth();
  const { mode, isTeacherMode } = useSystem();
  const { performAction, isOnline } = useSync();
  const [drivers, setDrivers] = useState<(Driver & { health_cards: HealthCard[] })[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [displayLimit, setDisplayLimit] = useState(5);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedCard, setSelectedCard] = useState<HealthCard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRenewalMode, setIsRenewalMode] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    fetchDrivers();
  }, [mode]);

  const fetchDrivers = async (query: string = '', reset = false) => {
    setLoading(true);
    const newLimit = reset ? 5 : limit;
    if (reset) setLimit(5);

    if (!isOnline) {
      try {
        const cached = await offlineDb.cache.where('collection').equals('students').toArray();
        let filtered = cached.map(c => c.data).filter(s => s.type === mode);
        
        if (query) {
          const q = query.toLowerCase();
          filtered = filtered.filter(s => 
            s.name?.toLowerCase().includes(q) || 
            s.license_number?.toLowerCase().includes(q) ||
            s.id_number?.toLowerCase().includes(q)
          );
        }

        // Sort by created_at descending (last registered first)
        filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

        const hasMoreData = filtered.length > newLimit;
        const pageData = filtered.slice(0, newLimit);

        // Get health cards from cache
        const results = await Promise.all(pageData.map(async (s) => {
          const cards = await offlineDb.cache.where('collection').equals('health_cards').toArray();
          const studentCards = cards.map(c => c.data).filter(c => c.student_id === s.id);
          return { ...s, health_cards: studentCards };
        }));

        setDrivers(results);
        setHasMore(hasMoreData);
        setLoading(false);
        return;
      } catch (err) {
        console.warn('Offline fetch failed:', err);
      }
    }

    let supabaseQuery = supabase
      .from('students')
      .select('*, health_cards(*)', { count: 'exact' })
      .eq('type', mode);

    if (query) {
      supabaseQuery = supabaseQuery.or(`name.ilike.%${query}%,license_number.ilike.%${query}%,id_number.ilike.%${query}%`);
    }

    const { data, error } = await supabaseQuery
      .order('created_at', { ascending: false })
      .range(0, displayLimit + 20); // Fetch a bit more than limit to show "Load More"

    if (error) console.error(error);
    else setDrivers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchDrivers(search);
  }, [mode, displayLimit]);

  const handleDelete = async (id: string) => {
    const driverToDelete = drivers.find(d => d.id === id);
    if (!window.confirm(`آیا از حذف این ${isTeacherMode ? 'معلم' : 'شاگرد'} اطمینان دارید؟`)) return;
    
    try {
      const { error } = await performAction(
        'students',
        'delete',
        { id },
        () => supabase
          .from('students')
          .delete()
          .eq('id', id)
      );
      
      if (error) throw error;

      if (user?.email && driverToDelete) {
        await performAction(
          'activity_logs',
          'insert',
          {
            user_email: user.email,
            action: 'delete_student',
            details: `${isTeacherMode ? 'معلم' : 'شاگرد'} به نام ${driverToDelete.name} از سیستم حذف گردید.`,
            created_at: new Date().toISOString()
          },
          () => logActivity(user.email!, 'delete_student', `${isTeacherMode ? 'معلم' : 'شاگرد'} به نام ${driverToDelete.name} از سیستم حذف گردید.`)
        );
      }

      if (isOnline) fetchDrivers(search);
      else {
        // Optimistic delete
        setDrivers(prev => prev.filter(d => d.id !== id));
      }
    } catch (err: any) {
      alert('خطا در حذف شاگرد: ' + err.message);
    }
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    // Debounce or immediate search for small sets, here we can do it on change 
    // but with server-side logic it's better to fetch on enter or after typing stop
  };

  // We can trigger search effectively
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchDrivers(search);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const filteredDrivers = drivers; // Now filtering is done server-side

  const displayedDrivers = filteredDrivers.slice(0, displayLimit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{isTeacherMode ? 'لیست معلمین' : 'لیست شاگردان'}</h2>
          <p className="text-slate-500">مدیریت {isTeacherMode ? 'معلمان' : 'شاگردان'} و صدور کارت هویت مکتب</p>
        </div>
        
        <div className="flex gap-2">
           <div className="relative flex-1 md:w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="جستجو..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 pr-10 pl-4 text-sm focus:ring-2 focus:ring-blue-500/10 outline-none"
              />
           </div>
        </div>
      </div>

      <div className="bento-card !p-0 overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin" />
            <p className="text-sm font-bold uppercase tracking-tighter">در حال دریافت اطلاعات...</p>
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-400 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-2">
              <Search className="w-8 h-8 opacity-20" />
            </div>
            <p className="font-bold text-slate-800">{isTeacherMode ? 'هیچ معلمی یافت نشد' : 'هیچ شاگردی یافت نشد'}</p>
            <p className="text-[10px] uppercase">No Match for Search Query</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-slate-400 font-normal">
                  <th className="p-5 font-bold uppercase text-[10px] tracking-widest text-center">وضعیت کارت</th>
                  <th className="p-5 font-bold uppercase text-[10px] tracking-widest">نوم / نام</th>
                  <th className="p-5 font-bold uppercase text-[10px] tracking-widest">د پلار نوم / نام پدر</th>
                  <th className="p-5 font-bold uppercase text-[10px] tracking-widest">{isTeacherMode ? 'کد شناسایی' : 'نمبر اساس'}</th>
                  <th className="p-5 font-bold uppercase text-[10px] tracking-widest">{isTeacherMode ? 'رتبه/بست' : 'صنف'}</th>
                  <th className="p-5 font-bold uppercase text-[10px] tracking-widest">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayedDrivers.map((driver) => {
                  const activeCard = driver.health_cards?.find(c => c.status === 'active');
                  const isExpired = activeCard && new Date(activeCard.expiry_date) < new Date();
                  
                  return (
                    <tr key={driver.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-5">
                        <div className="flex justify-center">
                          {activeCard && !isExpired ? (
                            <span className="status-chip status-approved">فعال</span>
                          ) : (
                            <span className="status-chip status-pending">بدون کارت</span>
                          )}
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors text-xs overflow-hidden">
                            {driver.photo_url ? <img src={driver.photo_url} className="w-full h-full object-cover" /> : driver.name.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-800">{driver.name}</span>
                        </div>
                      </td>
                      <td className="p-5">
                        <span className="text-slate-600 text-sm">{driver.father_name || '---'}</span>
                      </td>
                      <td className="p-5 text-slate-600 font-mono text-xs">{driver.license_number}</td>
                      <td className="p-5 text-slate-600 text-xs font-bold">{driver.vehicle_type}</td>
                      <td className="p-5">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-wrap gap-2">
                            {activeCard ? (
                              <button 
                                onClick={() => {
                                  setSelectedDriver(driver);
                                  setSelectedCard(activeCard);
                                  setIsPrinting(true);
                                  setIsViewOpen(true);
                                }}
                                className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2"
                              >
                                <Printer className="w-4 h-4" />
                                <span>چاپ کارت</span>
                              </button>
                            ) : (
                              <button 
                                onClick={() => {
                                  setSelectedDriver(driver);
                                  setIsRenewalMode(false);
                                  setIsModalOpen(true);
                                }}
                                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2"
                              >
                                <PlusCircle className="w-4 h-4" />
                                <span>صدور کارت</span>
                              </button>
                            )}
                            
                            <button 
                              onClick={() => {
                                setSelectedDriver(driver);
                                setIsEditModalOpen(true);
                              }}
                              className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-100 rounded-xl transition-all"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button 
                              onClick={() => handleDelete(driver.id)}
                              className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-100 rounded-xl transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination / Load More */}
      {!loading && displayLimit < filteredDrivers.length && (
        <div className="flex justify-center pt-4">
          <button 
            onClick={() => setDisplayLimit(prev => prev + 5)}
            className="px-8 py-3 bg-white hover:bg-slate-50 text-slate-500 font-bold text-xs rounded-2xl transition-all border border-slate-100 shadow-sm flex items-center gap-3 active:scale-95"
          >
            <ChevronDown className="w-4 h-4" />
            مشاهده {isTeacherMode ? 'اساتید' : 'شاگردان'} بیشتر ({filteredDrivers.length - displayLimit} مورد باقی‌مانده)
          </button>
        </div>
      )}

      <HealthCardModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setIsRenewalMode(false);
          fetchDrivers();
        }} 
        driver={selectedDriver}
        isRenewal={isRenewalMode}
      />

      <EditDriverModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        driver={selectedDriver}
        onUpdate={fetchDrivers}
      />

      {selectedDriver && selectedCard && (
        <ViewHealthCard 
          isOpen={isViewOpen} 
          onClose={() => {
            setIsViewOpen(false);
            setIsPrinting(false);
          }} 
          driver={selectedDriver}
          card={selectedCard}
          autoPrint={isPrinting}
        />
      )}
    </div>
  );
};

