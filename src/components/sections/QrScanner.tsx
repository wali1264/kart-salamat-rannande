import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, ShieldCheck, XCircle, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Driver, HealthCard } from '../../types';

export const QrScanner: React.FC<{ searchQuery?: string }> = ({ searchQuery }) => {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState<{ card: any, driver: any } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 20, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      /* verbose= */ false
    );

    scanner.render(onScanSuccess, onScanFailure);

    return () => {
      scanner.clear().catch(error => {
        console.error("Failed to clear html5QrcodeScanner. ", error);
      });
    };
  }, []);

  useEffect(() => {
    if (searchQuery && searchQuery.length > 2) {
      verifyCard(searchQuery);
    }
  }, [searchQuery]);

  const onScanSuccess = (decodedText: string) => {
    setScanResult(decodedText);
    verifyCard(decodedText);
  };

  const onScanFailure = (error: any) => {
    // silently handle scan errors
  };

  const verifyCard = async (query: string) => {
    if (!navigator.onLine) {
      setError('ارتباط با سرور قطع است. لطفاً اتصال انترنت خود را بررسی کنید.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Robust search: ID, License Number, Plate, or Name
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(query);
      
      let req = supabase
        .from('health_cards')
        .select('*, drivers!inner(*)');

      if (isUUID) {
        req = req.eq('id', query);
      } else {
        req = req.or(`drivers.license_number.ilike.%${query}%,drivers.license_plate.ilike.%${query}%,drivers.name.ilike.%${query}%`);
      }

      const { data: cards, error: cardError } = await req;

      if (cardError || !cards || cards.length === 0) {
        throw new Error('هیچ کارتی با این مشخصات یافت نشد');
      }

      const card = cards[0];
      setCardData({
        card: card,
        driver: card.drivers
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {!isOnline && (
        <div className="bg-red-600 text-white p-3 rounded-2xl flex items-center justify-center gap-3 animate-pulse">
          <AlertCircle className="w-5 h-5" />
          <span className="font-bold text-sm">عدم دسترسی به شبکه! بررسی اصالت ممکن نیست.</span>
        </div>
      )}

      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <QrCode className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">اسکنر و جستجوی اعتبار‌سنجی</h2>
        <p className="text-slate-500">کد QR را مقابل کمره بگیرید یا از فیلد جستجو استفاده کنید.</p>
      </div>

      {!cardData && !error && (
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden relative">
          <div id="reader" className="w-full"></div>
          {loading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-20">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <p className="font-bold text-slate-800">در حال جستجو...</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 p-8 rounded-[2rem] text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-red-900 mb-2">نتیجه‌ای یافت نشد</h3>
          <p className="text-red-700/80 mb-6">{error}</p>
          <button 
            onClick={() => {
              setCardData(null);
              setError(null);
            }}
            className="flex items-center gap-2 bg-red-600 text-white px-6 py-2 rounded-xl mx-auto font-bold text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            تلاش مجدد
          </button>
        </div>
      )}

      {cardData && (
        <div className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
          <div className={`absolute top-0 right-0 left-0 h-2 ${cardData.card.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
          
          <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
            <div className="w-32 h-40 bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden shadow-inner flex items-center justify-center bg-cover bg-center" 
                 style={{ backgroundImage: cardData.driver.photo_url ? `url(${cardData.driver.photo_url})` : 'none' }}>
              {!cardData.driver.photo_url && <UserIcon className="w-16 h-16 text-slate-200" />}
            </div>
            
            <div className="flex-1 text-center md:text-right">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-slate-800">{cardData.driver.name}</h3>
                <div className={`px-4 py-2 rounded-xl font-bold text-sm ${cardData.card.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {cardData.card.status === 'active' ? 'معتبر و فعال' : 'منقضی شده'}
                </div>
              </div>
              <p className="text-slate-500 font-medium">نام پدر: {cardData.driver.father_name || '---'}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600 uppercase">S/N: {cardData.card.id.slice(0, 8)}</span>
                <span className="px-3 py-1 bg-blue-50 rounded-lg text-[10px] font-bold text-blue-600 uppercase">BLOOD: {cardData.driver.blood_type || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] text-slate-400 mb-1 font-bold uppercase">نمبر جواز</p>
              <p className="font-bold text-slate-800 font-mono tracking-wider">{cardData.driver.license_number}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] text-slate-400 mb-1 font-bold uppercase">پلاک موتر</p>
              <p className="font-bold text-slate-800">{cardData.driver.license_plate}</p>
            </div>
             <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] text-slate-400 mb-1 font-bold uppercase">تاریخ صدور</p>
              <p className="font-bold text-slate-800">{new Date(cardData.card.issue_date).toLocaleDateString('fa-AF')}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] text-slate-400 mb-1 font-bold uppercase">تاریخ انقضا</p>
              <p className="font-bold text-slate-800">{new Date(cardData.card.expiry_date).toLocaleDateString('fa-AF')}</p>
            </div>
          </div>

          <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex items-center gap-4">
             <ShieldCheck className="w-8 h-8 text-emerald-600" />
             <div>
                <h4 className="font-bold text-emerald-900">وضعیت صحت و هوشیاری</h4>
                <p className="text-xs text-emerald-700/80">هوشیاری و عدم اعتیاد این راننده توسط داکتران مرکز ANDHP تایید شده است.</p>
             </div>
          </div>

          <button 
             onClick={() => {
              setCardData(null);
              setError(null);
            }}
            className="w-full mt-6 bg-slate-900 text-white py-4 rounded-2xl font-bold transition-all hover:bg-slate-800 active:scale-[0.98]"
          >
            بستن و استعلام جدید
          </button>
        </div>
      )}
    </div>
  );
};
