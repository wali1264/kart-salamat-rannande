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
  QrCode
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Driver, HealthCard } from '../../types';
import { HealthCardModal } from '../HealthCardModal';
import { ViewHealthCard } from '../ViewHealthCard';

export const DriverList: React.FC = () => {
  const [drivers, setDrivers] = useState<(Driver & { health_cards: HealthCard[] })[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedCard, setSelectedCard] = useState<HealthCard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('drivers')
      .select('*, health_cards(*)')
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    else setDrivers(data || []);
    setLoading(false);
  };

  const filteredDrivers = drivers.filter(d => 
    d.name.includes(search) || 
    d.license_number.includes(search) || 
    d.license_plate.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">لیست رانندگان</h2>
          <p className="text-slate-500">مدیریت رانندگان و صدور کارت سلامت</p>
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
           <button className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              <Filter className="w-5 h-5 text-slate-600" />
           </button>
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
            <p className="font-bold text-slate-800">هیچ راننده‌ای یافت نشد</p>
            <p className="text-[10px] uppercase">No Match for Search Query</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-slate-400 font-normal">
                  <th className="p-5 font-bold uppercase text-[10px] tracking-widest text-center">وضعیت سلامت</th>
                  <th className="p-5 font-bold uppercase text-[10px] tracking-widest">نام راننده</th>
                  <th className="p-5 font-bold uppercase text-[10px] tracking-widest">شماره جواز</th>
                  <th className="p-5 font-bold uppercase text-[10px] tracking-widest">پلاک موتر</th>
                  <th className="p-5 font-bold uppercase text-[10px] tracking-widest">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredDrivers.map((driver) => {
                  const activeCard = driver.health_cards?.find(c => c.status === 'active');
                  const isExpired = activeCard && new Date(activeCard.expiry_date) < new Date();
                  
                  return (
                    <tr key={driver.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-5">
                        <div className="flex justify-center">
                          {activeCard && !isExpired ? (
                            <span className="status-chip status-approved">سالم (پاک)</span>
                          ) : (
                            <span className="status-chip status-pending">نیاز به معاینه</span>
                          )}
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                            {driver.name.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-800">{driver.name}</span>
                        </div>
                      </td>
                      <td className="p-5 text-slate-600 font-mono text-xs">{driver.license_number}</td>
                      <td className="p-5 text-slate-600 text-xs">{driver.license_plate}</td>
                      <td className="p-5">
                        <div className="flex items-center gap-2">
                          {activeCard ? (
                             <button 
                              onClick={() => {
                                setSelectedDriver(driver);
                                setSelectedCard(activeCard);
                                setIsViewOpen(true);
                              }}
                              className="bg-blue-900 text-white px-4 py-2 rounded-lg text-[10px] font-bold hover:bg-blue-950 transition-all"
                            >
                              مشاهده کارت
                            </button>
                          ) : (
                            <button 
                              onClick={() => {
                                setSelectedDriver(driver);
                                setIsModalOpen(true);
                              }}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-[10px] font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                            >
                              صدور کارت
                            </button>
                          )}
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


      <HealthCardModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          fetchDrivers();
        }} 
        driver={selectedDriver}
      />

      {selectedDriver && selectedCard && (
        <ViewHealthCard 
          isOpen={isViewOpen} 
          onClose={() => setIsViewOpen(false)} 
          driver={selectedDriver}
          card={selectedCard}
        />
      )}
    </div>
  );
};

