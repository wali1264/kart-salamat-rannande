import React, { useEffect, useState } from 'react';
import { QrCode, ShieldCheck, XCircle, Loader2, AlertCircle, RefreshCw, Camera, Info, ShieldAlert, Clock, User as UserIcon, Search } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../../lib/supabase';

export const QrScanner: React.FC<{ searchQuery?: string }> = ({ searchQuery }) => {
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState<{ card: any, driver: any } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isScannerStarted, setIsScannerStarted] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'expired' | 'fake'>('idle');

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
    let html5QrCode: Html5Qrcode;

    const startScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode("reader");
        const config = { fps: 20, qrbox: { width: 250, height: 250 } };
        
        await html5QrCode.start(
          { facingMode: "environment" }, 
          config, 
          (decodedText) => {
            // Success: Trigger vibration simulation if supported
            if (navigator.vibrate) navigator.vibrate(100);
            verifyCard(decodedText);
            // Stop scanner temporarily to show result
            html5QrCode.stop().then(() => setIsScannerStarted(false));
          },
          () => {} // scan errors are silent
        );
        setIsScannerStarted(true);
      } catch (err) {
        console.error("Scanner failed to start", err);
      }
    };

    if (!cardData && !error) {
      startScanner();
    }

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(e => console.error(e));
      }
    };
  }, [cardData, error]);

  useEffect(() => {
    if (searchQuery && searchQuery.length > 2) {
      verifyCard(searchQuery);
    }
  }, [searchQuery]);

  const verifyCard = async (query: string) => {
    if (!navigator.onLine) {
      setError('ارتباط با سرور قطع است. استعلام امکان‌پذیر نیست.');
      return;
    }

    setLoading(true);
    setError(null);
    setScanStatus('idle');
    
    try {
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
        setScanStatus('fake');
        throw new Error('کارت در سیستم یافت نشد. هشدار: این کارت جعلی است!');
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
  };

  return (
    <div className="max-w-xl mx-auto px-2">
      {/* Mobile-First Search Top */}
      <div className="mb-4">
        <div className="relative group">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            defaultValue={searchQuery || ''}
            onChange={(e) => e.target.value.length > 2 && verifyCard(e.target.value)}
            placeholder="جستجوی سریع (نمبر جواز یا پلاک...)"
            className="w-full bg-white border border-slate-200 rounded-2xl py-3 pr-11 pl-4 text-sm outline-none focus:border-blue-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Network Alert - Compact */}
      {!isOnline && (
        <div className="mb-4 bg-rose-600 text-white p-2 rounded-xl flex items-center justify-center gap-2 animate-pulse">
          <AlertCircle className="w-4 h-4" />
          <span className="font-bold text-[10px]">قطع ارتباط با مرکز!</span>
        </div>
      )}

      {/* Camera Section */}
      {!cardData && !error && (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-lg font-black text-slate-800">کارت را اسکن کنید</h2>
          </div>

          <div className="relative aspect-square bg-black rounded-[2.5rem] overflow-hidden shadow-xl border-2 border-white">
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

          {/* Minimal Instruction */}
          <p className="text-[9px] text-center text-slate-400 font-bold">
            در صورت خرابی کد QR، از فیلد جستجوی بالا استفاده کنید.
          </p>
        </div>
      )}

      {/* Result: FAKE (Error) */}
      {error && scanStatus === 'fake' && (
        <div className="bg-rose-50 border-2 border-rose-100 p-10 rounded-[3rem] text-center shadow-xl">
          <div className="w-20 h-20 bg-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-rose-200">
            <ShieldAlert className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-black text-rose-900 mb-3">هشدار: کارت غیرمعتبر!</h3>
          <p className="text-rose-700 font-bold mb-8 leading-relaxed">
            این کارت در بانک اطلاعاتی مرکزی ثبت نشده است.<br/>
            احتمال جعل یا تقلب وجود دارد.
          </p>
          <button 
            onClick={resetScanner}
            className="w-full bg-rose-600 text-white py-5 rounded-2xl font-black text-lg shadow-lg shadow-rose-200 active:scale-95 transition-all"
          >
            تلاش مجدد و اسکن جدید
          </button>
        </div>
      )}

      {/* Result: SUCCESS or EXPIRED */}
      {cardData && (
        <div className="bg-white border border-slate-100 rounded-[3rem] shadow-2xl overflow-hidden relative">
          {/* Status Header */}
          <div className={`p-6 flex items-center justify-center gap-3 ${scanStatus === 'expired' ? 'bg-amber-500' : 'bg-emerald-500'} text-white`}>
            {scanStatus === 'expired' ? <Clock className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
            <span className="text-lg font-black uppercase tracking-tight">
              {scanStatus === 'expired' ? 'کارت منقضی شده است' : 'کارت معتبر و تایید شده'}
            </span>
          </div>

          <div className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-8 mb-8 border-b border-slate-50 pb-8">
              <div className="w-36 h-48 bg-slate-100 rounded-[2rem] border-4 border-white shadow-xl overflow-hidden bg-cover bg-center" 
                   style={{ backgroundImage: cardData.driver.photo_url ? `url(${cardData.driver.photo_url})` : 'none' }}>
                {!cardData.driver.photo_url && <UserIcon className="w-20 h-20 text-slate-300 mt-12 mx-auto" />}
              </div>
              
              <div className="flex-1 text-center md:text-right space-y-2">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">نام و تخلص راننده</p>
                <h3 className="text-3xl font-black text-slate-800">{cardData.driver.name}</h3>
                <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-4">
                  <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-bold">S/N: {cardData.card.id.slice(0, 8)}</span>
                  <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold">BLOOD: {cardData.driver.blood_type || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-right">
              <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase">نام پدر</p>
                <p className="font-bold text-slate-800 text-lg">{cardData.driver.father_name || '---'}</p>
              </div>
              <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase">نمبر جواز رانندگی</p>
                <p className="font-bold text-slate-800 text-lg font-mono">{cardData.driver.license_number}</p>
              </div>
              <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase">پلاک موتر</p>
                <p className="font-bold text-slate-800 text-lg">{cardData.driver.license_plate}</p>
              </div>
              <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase">تاریخ انقضای کارت</p>
                <p className={`font-bold text-lg ${scanStatus === 'expired' ? 'text-rose-600' : 'text-slate-800'}`}>
                  {new Date(cardData.card.expiry_date).toLocaleDateString('fa-AF')}
                </p>
              </div>
            </div>

            {/* Renewal Note for Expired Cards */}
            {scanStatus === 'expired' && (
              <div className="mb-8 p-6 bg-amber-50 rounded-[2rem] border border-amber-200 flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
                <p className="text-sm font-bold text-amber-800 leading-relaxed">
                  زمان اعتبار این کارت به اتمام رسیده است. طبق مقررات، راننده موظف است جهت تمدید تست‌های صحی و تمدید کارت به مراکز مربوطه مراجعه نماید.
                </p>
              </div>
            )}

            <div className={`p-6 rounded-[2rem] border flex items-center gap-4 ${scanStatus === 'expired' ? 'bg-slate-50 border-slate-100' : 'bg-emerald-50 border-emerald-100'}`}>
               <ShieldCheck className={`w-8 h-8 ${scanStatus === 'expired' ? 'text-slate-400' : 'text-emerald-600'}`} />
               <div>
                  <h4 className="font-black text-slate-800">تاییدیه صحت و هوشیاری</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    این راننده در زمان صدور کارت فاقد هرگونه اعتیاد بوده و سلامت جسمانی وی تایید گردیده است.
                  </p>
               </div>
            </div>

            <button 
              onClick={resetScanner}
              className={`w-full mt-8 py-5 rounded-[2rem] font-black text-xl transition-all shadow-xl active:scale-[0.98] ${scanStatus === 'expired' ? 'bg-amber-600 text-white shadow-amber-100' : 'bg-slate-900 text-white shadow-slate-200'}`}
            >
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
