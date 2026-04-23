import React, { useEffect, useState } from 'react';
import { QrCode, ShieldCheck, XCircle, Loader2, AlertCircle, RefreshCw, Camera, Info, ShieldAlert, Clock, User as UserIcon, Search, Power, PowerOff } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../../lib/supabase';

export const QrScanner: React.FC<{ searchQuery?: string }> = ({ searchQuery }) => {
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState<{ card: any, driver: any } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showScanner, setShowScanner] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'expired' | 'fake'>('idle');

  // Helper to normalize Persian/Arabic characters (Yeh/Keheh)
  const normalize = (text: string) => {
    if (!text) return '';
    return text
      .trim()
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک');
  };

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
    let html5QrCode: Html5Qrcode | null = null;

    const startScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode("reader");
        const config = { fps: 15, qrbox: { width: 220, height: 220 } };
        
        await html5QrCode.start(
          { facingMode: "environment" }, 
          config, 
          (decodedText) => {
            if (navigator.vibrate) navigator.vibrate(100);
            verifyCard(decodedText);
            setShowScanner(false); // Stop camera on success
          },
          () => {} 
        );
      } catch (err) {
        console.error("Scanner failed to start", err);
      }
    };

    if (showScanner && !cardData && !loading) {
      startScanner();
    }

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(e => console.error(e));
      }
    };
  }, [showScanner, cardData]);

  useEffect(() => {
    if (searchQuery && searchQuery.length > 1) {
      verifyCard(searchQuery);
    }
  }, [searchQuery]);

  const verifyCard = async (query: string) => {
    if (!navigator.onLine) {
      setError('ارتباط با سرور قطع است');
      return;
    }

    setLoading(true);
    setError(null);
    setScanStatus('idle');

    // Normalize input (Handles 'Ali' with different 'Y' types)
    const q = normalize(query);
    
    try {
      // 1. UUID Check (Direct hit by ID)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(q);
      
      let queryReq = supabase
        .from('health_cards')
        .select('*, drivers!inner(*)');

      if (isUUID) {
        queryReq = queryReq.eq('id', q);
      } else {
        // 2. Comprehensive Search: License, Name, Plate
        const filter = `license_number.ilike.%${q}%,drivers.name.ilike.%${q}%,drivers.license_plate.ilike.%${q}%,drivers.father_name.ilike.%${q}%`;
        queryReq = queryReq.or(filter);
      }

      const { data: cards, error: cardError } = await queryReq;

      if (cardError || !cards || cards.length === 0) {
        setScanStatus('fake');
        throw new Error('کارت در سیستم یافت نشد. این کارت جعلی است!');
      }

      const card = cards[0];
      const isExpired = new Date(card.expiry_date) < new Date();
      
      setCardData({
        card: card,
        driver: card.drivers
      });
      setScanStatus(isExpired ? 'expired' : 'success');

    } catch (err: any) {
      setError(err.message);
      if (err.message.includes('جعلی')) setScanStatus('fake');
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setCardData(null);
    setError(null);
    setScanStatus('idle');
    setShowScanner(false);
  };

  return (
    <div className="max-w-xl mx-auto px-2">
      {/* Search Header - Sticky and prioritized */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 font-black" />
          <input 
            type="text" 
            placeholder="جستجو (نام، نمبر جواز یا پلاک...)"
            onKeyDown={(e) => e.key === 'Enter' && verifyCard((e.target as HTMLInputElement).value)}
            className="w-full bg-white border border-slate-200 rounded-2xl py-3 pr-11 pl-4 text-sm outline-none focus:border-blue-500 shadow-sm transition-all"
          />
        </div>
      </div>

      {/* Manual Scanner Toggle */}
      {!cardData && !error && (
        <div className="flex justify-center mb-4">
          <button 
            onClick={() => setShowScanner(!showScanner)}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-black text-sm transition-all shadow-md active:scale-95 ${showScanner ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-blue-600 text-white'}`}
          >
            {showScanner ? (
              <>
                <PowerOff className="w-4 h-4" />
                توقف دوربین
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                اسکن بارکد (دوربین)
              </>
            )}
          </button>
        </div>
      )}

      {/* Minimal Offline Warning */}
      {!isOnline && (
        <div className="mb-3 bg-rose-600 text-white p-2 rounded-xl flex items-center justify-center gap-2 animate-pulse">
          <AlertCircle className="w-4 h-4" />
          <span className="font-bold text-[10px]">ارتباط با مرکز قطع است!</span>
        </div>
      )}

      {/* Dynamic Camera Section */}
      {!cardData && !error && showScanner && (
        <div className="space-y-3 animate-in fade-in zoom-in duration-300">
          <div className="relative aspect-square max-w-[340px] mx-auto bg-black rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white">
            <div id="reader" className="w-full h-full"></div>
            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-white/20 rounded-3xl relative">
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl animate-pulse" />
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl animate-pulse" />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl animate-pulse" />
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl animate-pulse" />
                <div className="absolute left-2 right-2 h-0.5 bg-blue-500/40 animate-[scan_2s_infinite]" />
              </div>
            </div>
            {loading && (
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
          </div>
          <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest">کارت را مقابل کمره بگیرید</p>
        </div>
      )}

      {/* FAKE Result UI */}
      {error && scanStatus === 'fake' && (
        <div className="bg-rose-50 border-2 border-rose-100 p-8 rounded-[3rem] text-center shadow-xl animate-in slide-in-from-bottom duration-500">
          <div className="w-20 h-20 bg-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-rose-200">
            <ShieldAlert className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-black text-rose-900 mb-3">کارت غیرمعتبر!</h3>
          <p className="text-rose-700 font-bold mb-8 text-sm">این کارت در بانک اطلاعات مرکزی ثبت نشده است.</p>
          <button onClick={resetScanner} className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all">
            تلاش مجدد
          </button>
        </div>
      )}

      {/* SUCCESS/EXPIRED Result UI */}
      {cardData && (
        <div className="bg-white border border-slate-100 rounded-[3rem] shadow-2xl overflow-hidden relative animate-in slide-in-from-bottom duration-500">
          <div className={`p-5 flex items-center justify-center gap-3 ${scanStatus === 'expired' ? 'bg-amber-500' : 'bg-emerald-500'} text-white`}>
            {scanStatus === 'expired' ? <Clock className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
            <span className="text-base font-black uppercase tracking-tight">
              {scanStatus === 'expired' ? 'کارت منقضی شده است' : 'کارت معتبر و تایید شده'}
            </span>
          </div>

          <div className="p-6">
            <div className="flex flex-col items-center gap-5 mb-8 pb-8 border-b border-slate-50">
              <div className="w-32 h-44 bg-slate-100 rounded-[1.5rem] border-4 border-white shadow-xl overflow-hidden bg-cover bg-center" 
                   style={{ backgroundImage: cardData.driver.photo_url ? `url(${cardData.driver.photo_url})` : 'none' }}>
                {!cardData.driver.photo_url && <UserIcon className="w-16 h-16 text-slate-300 mt-12 mx-auto" />}
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-400 font-black uppercase mb-1">مشخصات راننده</p>
                <h3 className="text-3xl font-black text-slate-800">{cardData.driver.name}</h3>
                <div className="flex gap-2 mt-4 justify-center">
                  <span className="px-2 py-0.5 bg-slate-900 text-white rounded-lg text-[10px] font-bold">S/N: {cardData.card.id.slice(0, 8)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6 text-right">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[8px] text-slate-400 font-bold mb-1 uppercase">نام پدر</p>
                <p className="font-bold text-slate-800 text-sm">{cardData.driver.father_name || '---'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[8px] text-slate-400 font-bold mb-1 uppercase">نمبر جواز</p>
                <p className="font-bold text-slate-800 text-sm font-mono">{cardData.driver.license_number}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[8px] text-slate-400 font-bold mb-1 uppercase">پلاک موتر</p>
                <p className="font-bold text-slate-800 text-sm">{cardData.driver.license_plate}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[8px] text-slate-400 font-bold mb-1 uppercase">نوع وسایط</p>
                <p className="font-bold text-slate-800 text-sm">{cardData.driver.vehicle_type}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[8px] text-slate-400 font-bold mb-1 uppercase">نمبر تذکره (ID)</p>
                <p className="font-bold text-slate-800 text-sm">{cardData.driver.id_number || '---'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[8px] text-slate-400 font-bold mb-1 uppercase">گروه خون</p>
                <p className="font-bold text-rose-600 text-sm">{cardData.driver.blood_type || 'N/A'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[8px] text-slate-400 font-bold mb-1 uppercase">شماره تماس</p>
                <p className="font-bold text-slate-800 text-sm font-mono">{cardData.driver.phone || '---'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[8px] text-slate-400 font-bold mb-1 uppercase">تاریخ انقضا</p>
                <p className={`font-bold text-sm ${scanStatus === 'expired' ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {new Date(cardData.card.expiry_date).toLocaleDateString('fa-AF')}
                </p>
              </div>
            </div>

            {/* Health Section - The Full File */}
            <div className="mb-6 space-y-3">
              <h4 className="text-[10px] font-black text-slate-900 border-r-4 border-blue-500 pr-2">اطلاعات پرونده صحی</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                  <p className="text-[8px] text-blue-400 font-bold mb-0.5">فشار خون</p>
                  <p className="text-xs font-bold text-blue-900">{cardData.card.blood_pressure || 'سالم'}</p>
                </div>
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                  <p className="text-[8px] text-blue-400 font-bold mb-0.5">وضعیت بینایی</p>
                  <p className="text-xs font-bold text-blue-900">{cardData.card.vision_status || 'سالم'}</p>
                </div>
              </div>
              {cardData.card.notes && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-[8px] text-slate-400 font-bold mb-1">ملاحظات و تشریح معاینات</p>
                  <p className="text-[11px] text-slate-700 leading-relaxed font-medium">{cardData.card.notes}</p>
                </div>
              )}
            </div>

            {scanStatus === 'expired' && (
              <div className="mb-8 p-5 bg-amber-50 rounded-[2rem] border border-amber-200 flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm font-bold text-amber-800 leading-relaxed">اعتبار این کارت پایان یافته است. راننده حق رانندگی طولانی مدت را ندارد.</p>
              </div>
            )}

            <button onClick={resetScanner} className="w-full py-5 rounded-[2rem] font-black text-xl transition-all shadow-xl bg-slate-900 text-white active:scale-95">
              استعلام جدید
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
      `}</style>
    </div>
  );
};
