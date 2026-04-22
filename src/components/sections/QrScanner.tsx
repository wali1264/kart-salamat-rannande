import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, ShieldCheck, XCircle, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Driver, HealthCard } from '../../types';

export const QrScanner: React.FC = () => {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState<{ card: HealthCard, driver: Driver } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scanner.render(onScanSuccess, onScanFailure);

    return () => {
      scanner.clear().catch(error => {
        console.error("Failed to clear html5QrcodeScanner. ", error);
      });
    };
  }, []);

  const onScanSuccess = (decodedText: string) => {
    setScanResult(decodedText);
    verifyCard(decodedText);
  };

  const onScanFailure = (error: any) => {
    // silently handle scan errors (common during scanning process)
  };

  const verifyCard = async (cardId: string) => {
    setLoading(true);
    setError(null);
    try {
      // Expecting cardId directly from QR
      const { data: card, error: cardError } = await supabase
        .from('health_cards')
        .select('*, drivers(*)')
        .eq('id', cardId)
        .single();

      if (cardError || !card) {
        throw new Error('کارت معتبر یافت نشد');
      }

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
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <QrCode className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">اسکنر اعتبار‌سنجی</h2>
        <p className="text-slate-500">برای بررسی وضعیت سلامت راننده، کد QR روی کارت را مقابل کمره بگیرید.</p>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden relative">
        <div id="reader" className="w-full"></div>
        {loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-20">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="font-bold text-slate-800">در حال بررسی اعتبار...</p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-8 rounded-[2rem] text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-red-900 mb-2">کارت غیرمعتبر</h3>
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
          
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center font-bold text-2xl text-slate-400">
                {cardData.driver.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">{cardData.driver.name}</h3>
                <p className="text-xs text-slate-500">مشخصات تایید شده</p>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-xl font-bold text-sm ${cardData.card.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              {cardData.card.status === 'active' ? 'معتبر و فعال' : 'منقضی شده'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 bg-slate-50 rounded-2xl">
              <p className="text-[10px] text-slate-400 mb-1">نمبر جواز</p>
              <p className="font-bold text-slate-800">{cardData.driver.license_number}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl">
              <p className="text-[10px] text-slate-400 mb-1">پلاک موتر</p>
              <p className="font-bold text-slate-800">{cardData.driver.license_plate}</p>
            </div>
             <div className="p-4 bg-slate-50 rounded-2xl">
              <p className="text-[10px] text-slate-400 mb-1">تاریخ صدور</p>
              <p className="font-bold text-slate-800">{new Date(cardData.card.issue_date).toLocaleDateString('fa-AF')}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl">
              <p className="text-[10px] text-slate-400 mb-1">تاریخ انقضا</p>
              <p className="font-bold text-slate-800">{new Date(cardData.card.expiry_date).toLocaleDateString('fa-AF')}</p>
            </div>
          </div>

          <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex items-center gap-4">
             <ShieldCheck className="w-8 h-8 text-emerald-600" />
             <div>
                <h4 className="font-bold text-emerald-900">نتیجه بررسی هوشیاری</h4>
                <p className="text-xs text-emerald-700/80">{cardData.card.is_sober ? 'هوشیاری راننده در زمان صدور تایید شده است.' : 'نیاز به بررسی مجدد هوشیاری.'}</p>
             </div>
          </div>

          <button 
             onClick={() => {
              setCardData(null);
              setError(null);
            }}
            className="w-full mt-6 bg-slate-900 text-white py-4 rounded-2xl font-bold transition-all hover:bg-slate-800"
          >
            بستن و اسکن مجدد
          </button>
        </div>
      )}
    </div>
  );
};
