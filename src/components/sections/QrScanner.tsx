import React, { useEffect, useState } from 'react';
import { ShieldCheck, Loader2, AlertCircle, Camera, Info, ShieldAlert, Clock, User as UserIcon, Search, PowerOff } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../../lib/supabase';

export const QrScanner: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState<{ card: any, driver: any } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showScanner, setShowScanner] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'expired' | 'fake'>('idle');
  
  // Search states
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Helper to normalize Persian/Arabic characters
  const normalize = (text: string) => {
    if (!text) return '';
    return text.trim().replace(/ي/g, 'ی').replace(/ك/g, 'ک');
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

  // Live Suggestion Search Logic
  useEffect(() => {
    const fetchSuggestions = async () => {
      const q = normalize(searchInput);
      if (q.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsSearching(true);
      try {
        // Advanced Search: Look up drivers by Name, License, Plate, ID, Phone
        // Plus S/N (first 8 chars of health card ID)
        const { data: drivers, error: dError } = await supabase
          .from('drivers')
          .select(`*, health_cards(id, expiry_date)`)
          .or(`name.ilike.%${q}%,license_number.ilike.%${q}%,license_plate.ilike.%${q}%,id_number.ilike.%${q}%,phone.ilike.%${q}%`)
          .limit(5);

        // Also search by S/N directly in health_cards if query is short/alphanumeric
        let snResults: any[] = [];
        if (q.length >= 4 && /^[a-zA-Z0-9]+$/.test(q)) {
          const { data: cards } = await supabase
            .from('health_cards')
            .select('*, drivers(*)')
            .ilike('id', `${q}%`)
            .limit(3);
          
          if (cards) {
            snResults = cards.map(c => ({
              ...c.drivers,
              health_cards: [{ id: c.id, expiry_date: c.expiry_date }]
            }));
          }
        }

        const combined = [...drivers || [], ...snResults];
        // Remove duplicates by ID
        const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        setSuggestions(unique.slice(0, 6));

      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchInput]);

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
            setShowScanner(false);
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

  const verifyCard = async (query: string) => {
    if (!navigator.onLine) {
      setError('ارتباط با سرور قطع است');
      return;
    }

    setLoading(true);
    setError(null);
    setScanStatus('idle');
    setSuggestions([]); // Close suggestions
    setSearchInput(''); // Clear input

    const qRaw = normalize(query);
    // 1. URL extraction
    let q = qRaw;
    if (qRaw.includes('/')) {
      const parts = qRaw.split('/');
      q = parts[parts.length - 1];
    }
    
    // 2. Clean S/N patterns (e.g., 'A513345B-233' -> 'A513345B')
    const qClean = q.includes('-') ? q.split('-')[0].trim() : q.trim();

    try {
      let card = null;
      
      // Pattern: Is it potentially a shortened or full ID?
      const isPotentialID = /^[0-9a-fA-F]{8,36}$/.test(qClean);

      if (isPotentialID) {
        // Step 1: Force cast ID to TEXT in database to allow partial matching without UUID errors
        // We check health_cards first
        const { data: cardMatches } = await supabase
          .from('health_cards')
          .select('*, drivers(*)')
          .filter('id', 'ilike', `${qClean}%`)
          .limit(1);

        if (cardMatches && cardMatches.length > 0) {
          card = cardMatches[0];
        } else {
          // Step 2: Try matching prefix in drivers table (since QR/SN often uses Driver ID)
          const { data: driverMatches } = await supabase
            .from('drivers')
            .select('id')
            .filter('id', 'ilike', `${qClean}%`)
            .limit(1);

          if (driverMatches && driverMatches.length > 0) {
            // Found a driver, now fetch their latest health card
            const { data: driverCard } = await supabase
              .from('health_cards')
              .select('*, drivers(*)')
              .eq('driver_id', driverMatches[0].id)
              .order('created_at', { ascending: false })
              .limit(1);
            
            if (driverCard && driverCard.length > 0) card = driverCard[0];
          }
        }
      } 
      
      // Step 3: Global fallback (Name, License, etc.)
      if (!card) {
        const { data: drivers } = await supabase
          .from('drivers')
          .select('id')
          .or(`name.ilike.%${q}%,license_number.ilike.%${q}%,license_plate.ilike.%${q}%,phone.ilike.%${q}%,id_number.ilike.%${q}%`)
          .limit(1);

        if (drivers && drivers.length > 0) {
          const { data: cData } = await supabase
            .from('health_cards')
            .select('*, drivers(*)')
            .eq('driver_id', drivers[0].id)
            .order('created_at', { ascending: false })
            .limit(1);
          if (cData && cData.length > 0) card = cData[0];
        }
      }

      if (!card) {
        setScanStatus('fake');
        throw new Error('کارت در سیستم یافت نشد. این کارت جعلی است!');
      }

      const isExpired = new Date(card.expiry_date) < new Date();
      setCardData({ card, driver: card.drivers });
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
    setSearchInput('');
  };

  return (
    <div className="max-w-xl mx-auto px-2">
      {/* 1. Advanced Live Search Header */}
      <div className="mb-4 relative">
        <div className="relative z-50">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && verifyCard(searchInput)}
            placeholder="جستجوی پیشرفته (نام، پلاک، جواز...)"
            className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pr-11 pl-4 text-sm outline-none focus:border-blue-500 shadow-sm transition-all"
          />
          {isSearching && (
            <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
          )}
        </div>

        {/* Floating Suggestions List */}
        {suggestions.length > 0 && !cardData && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2">
            <div className="p-3 border-b border-slate-50 bg-slate-50 flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase">نتایج پیشنهادی</span>
              <Info className="w-3 h-3 text-slate-300" />
            </div>
            {suggestions.map((driver) => (
              <button
                key={driver.id}
                onClick={() => verifyCard(driver.name)}
                className="w-full flex items-center gap-4 p-4 hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0 text-right active:bg-blue-100"
              >
                <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden shadow-sm flex-shrink-0">
                  {driver.photo_url ? (
                    <img src={driver.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-6 h-6 text-slate-300 m-3" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 truncate text-sm mb-1">{driver.name}</h4>
                  <div className="flex gap-2 items-center">
                    <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-500">پلاک: {driver.license_plate}</span>
                    <span className="text-[9px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded font-bold">جواز: {driver.license_number}</span>
                  </div>
                </div>
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <UserIcon className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Manual Scanner Toggle */}
      {!cardData && !error && (
        <div className="flex justify-center mb-4">
          <button 
            onClick={() => setShowScanner(!showScanner)}
            className={`flex items-center gap-2 px-8 py-3 rounded-full font-black text-sm transition-all shadow-md active:scale-95 ${showScanner ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-blue-600 text-white shadow-blue-100'}`}
          >
            {showScanner ? (
              <><PowerOff className="w-4 h-4" /> توقف دوربین</>
            ) : (
              <><Camera className="w-4 h-4" /> اسکن بارکد</>
            )}
          </button>
        </div>
      )}

      {/* Camera Section */}
      {!cardData && !error && showScanner && (
        <div className="space-y-4 animate-in fade-in zoom-in duration-300">
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
          <p className="text-[10px] text-center text-slate-400 font-black uppercase tracking-widest">کارت را مقابل کمره بگیرید</p>
        </div>
      )}

      {/* Result: FAKE (Error) */}
      {error && scanStatus === 'fake' && (
        <div className="bg-rose-50 border-2 border-rose-100 p-8 rounded-[3rem] text-center shadow-xl animate-in slide-in-from-bottom duration-500">
          <div className="w-20 h-20 bg-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-rose-200">
            <ShieldAlert className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-black text-rose-900 mb-3 text-[18px]">کارت غیرمعتبر!</h3>
          <p className="text-rose-700 font-bold mb-8 text-sm px-4 leading-relaxed">این مشخصات در سیستم مرکزی یافت نشد. احتمال جعل وجود دارد.</p>
          <button onClick={resetScanner} className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all">تلاش مجدد</button>
        </div>
      )}

      {/* Result: SUCCESS or EXPIRED */}
      {cardData && (
        <div className="bg-white border border-slate-100 rounded-[3rem] shadow-2xl overflow-hidden relative animate-in slide-in-from-bottom duration-500">
          <div className={`p-4 flex items-center justify-center gap-3 ${scanStatus === 'expired' ? 'bg-amber-500' : 'bg-emerald-500'} text-white`}>
            {scanStatus === 'expired' ? <Clock className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            <span className="text-sm font-black uppercase tracking-tight">
              {scanStatus === 'expired' ? 'کارت منقضی شده است' : 'کارت معتبر و تایید شده'}
            </span>
          </div>

          <div className="p-5">
            <div className="flex flex-col items-center gap-4 mb-6 pb-6 border-b border-slate-100 text-center">
              <div className="w-28 h-40 bg-slate-100 rounded-[1.5rem] border-4 border-white shadow-xl overflow-hidden bg-cover bg-center" 
                   style={{ backgroundImage: cardData.driver.photo_url ? `url(${cardData.driver.photo_url})` : 'none' }}>
                {!cardData.driver.photo_url && <UserIcon className="w-16 h-16 text-slate-300 mt-12 mx-auto" />}
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase mb-1">شناسه راننده</p>
                <h3 className="text-2xl font-black text-slate-800 leading-tight">{cardData.driver.name}</h3>
                <span className="inline-block mt-2 px-3 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-bold">S/N: {cardData.card.id.slice(0, 8)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6 text-right">
              {[
                { label: 'نام پدر', value: cardData.driver.father_name },
                { label: 'نمبر جواز', value: cardData.driver.license_number, mono: true },
                { label: 'پلاک موتر', value: cardData.driver.license_plate },
                { label: 'نوع وسایط', value: cardData.driver.vehicle_type },
                { label: 'نمبر تذکره', value: cardData.driver.id_number },
                { label: 'گروه خون', value: cardData.driver.blood_type, color: 'text-rose-600' },
                { label: 'شماره تماس', value: cardData.driver.phone, mono: true },
                { label: 'تاریخ انقضا', value: new Date(cardData.card.expiry_date).toLocaleDateString('fa-AF'), color: scanStatus === 'expired' ? 'text-rose-600' : 'text-emerald-600' }
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                  <p className="text-[8px] text-slate-400 font-bold mb-1 uppercase">{item.label}</p>
                  <p className={`font-bold text-slate-800 text-xs sm:text-sm ${item.mono ? 'font-mono' : ''} ${item.color || ''}`}>{item.value || '---'}</p>
                </div>
              ))}
            </div>

            <div className="mb-6 space-y-3">
              <div className="flex items-center gap-2 pr-1">
                <div className="w-1 h-3 bg-blue-600 rounded-full" />
                <h4 className="text-[10px] font-black text-slate-900 uppercase">اطلاعات پرونده صحی</h4>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                  <p className="text-[8px] text-blue-400 font-bold mb-0.5 uppercase">فشار خون</p>
                  <p className="text-xs font-bold text-blue-900">{cardData.card.blood_pressure || 'سالم'}</p>
                </div>
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                  <p className="text-[8px] text-blue-400 font-bold mb-0.5 uppercase">وضعیت بینایی</p>
                  <p className="text-xs font-bold text-blue-900">{cardData.card.vision_status || 'سالم'}</p>
                </div>
              </div>
              {cardData.card.notes && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-[8px] text-slate-400 font-bold mb-1 uppercase">ملاحظات داکتر</p>
                  <p className="text-[10px] text-slate-700 leading-relaxed font-medium">{cardData.card.notes}</p>
                </div>
              )}
            </div>

            <button onClick={resetScanner} className="w-full py-4 rounded-[1.5rem] font-bold text-lg shadow-xl bg-slate-900 text-white active:scale-95 transition-all">استعلام جدید</button>
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
