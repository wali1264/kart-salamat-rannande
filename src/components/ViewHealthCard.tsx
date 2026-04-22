import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Printer, ShieldCheck, MapPin, User, Hash, CreditCard } from 'lucide-react';
import { Driver, HealthCard } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  driver: Driver;
  card: HealthCard;
  autoPrint?: boolean;
}

export const ViewHealthCard: React.FC<Props> = ({ isOpen, onClose, driver, card, autoPrint = false }) => {
  const [showBack, setShowBack] = React.useState(false);

  React.useEffect(() => {
    if (isOpen && autoPrint) {
      // Small timeout to ensure QR codes are fully rendered
      const timer = setTimeout(() => {
        window.print();
        onClose(); // Close the "invisible" modal after triggering print
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint, onClose]);

  if (!isOpen) return null;

  // Shared Card Component for duplication in print view
  const CardSide = ({ isBack = false, printOnly = false }) => (
    <div 
      className={`bg-white rounded-[1mm] overflow-hidden relative border border-slate-200 ${printOnly ? 'print-card-standard' : ''}`} 
      style={{ width: '85.6mm', height: '54mm' }}
    >
      {!isBack ? (
        <>
          {/* FRONT SIDE */}
          {/* National Pattern Background */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none overflow-hidden text-slate-800">
              <ShieldCheck className="w-[120mm] h-[120mm] -mt-[30mm] -mr-[20mm] rotate-12" />
          </div>

          {/* Tazkira Background Waves */}
          <div className="absolute bottom-0 right-0 w-full h-[20mm] bg-gradient-to-t from-emerald-50/30 to-transparent pointer-events-none" />
          <div className="absolute top-0 left-0 w-full h-[15mm] bg-gradient-to-b from-blue-50/20 to-transparent pointer-events-none" />

          {/* Header section inspired by Tazkira */}
          <div className="relative z-10 px-[4mm] pt-[2mm] flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-[5pt] font-bold text-slate-800">جمهوری اسلامی افغانستان</span>
                <span className="text-[4.5pt] text-slate-600">وزارت صحت عامه</span>
              </div>
              
              <div className="absolute left-1/2 -translate-x-1/2 top-[1mm]">
                <div className="w-[8mm] h-[8mm] bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20">
                    <ShieldCheck className="w-[6mm] h-[6mm] text-amber-600" />
                </div>
              </div>

              <div className="flex flex-col text-left">
                <span className="text-[5pt] font-bold text-slate-800 uppercase">National Health Card</span>
                <span className="text-[4.5pt] text-slate-600 italic">ID Code: {driver.id.slice(0, 8)}</span>
              </div>
          </div>

          {/* Main Content Area */}
          <div className="relative z-10 px-[4mm] mt-[1mm] flex gap-[3.5mm]">
              {/* Left Side: Photo and Enlarge QR */}
              <div className="flex flex-col items-center w-[23mm]">
                <div className="w-[23mm] h-[24mm] bg-slate-50 border border-slate-200 rounded-[1mm] overflow-hidden shadow-sm relative -mt-[1mm]">
                    {driver.photo_url ? (
                      <img src={driver.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-[10mm] h-[10mm] text-slate-200 mt-6 mx-auto" />
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-blue-600/90 text-white text-[4pt] font-bold py-[0.5mm] text-center">
                      Blood Type: {driver.blood_type || 'O+'}
                    </div>
                </div>
                
                {/* LARGER QR CODE SPACE */}
                <div className="bg-white p-[1.5mm] border border-slate-100 rounded-sm mt-[2mm] shadow-sm">
                    <QRCodeSVG 
                      value={`${window.location.origin}/verify/${card.id}`} 
                      size={52} // Increased size from 38 to 52 for better scannability
                      level="H"
                    />
                </div>
                <span className="text-[3pt] font-mono text-slate-400 mt-[0.5mm]">{card.id.slice(0, 10)}</span>
              </div>

              {/* Right Side: Information */}
              <div className="flex-1 pt-[1mm]">
                <div className="grid grid-cols-1 gap-y-[1.8mm]">
                    <div className="flex flex-col">
                      <span className="text-[4.5pt] text-slate-400 font-bold uppercase tracking-tight">نوم / نام مکمل راننده</span>
                      <span className="text-[9pt] font-bold text-slate-900 border-b border-slate-100 pb-[0.2mm] leading-tight">{driver.name}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[4.5pt] text-slate-400 font-bold uppercase">د پلار نوم / نام پدر</span>
                      <span className="text-[7.5pt] font-bold text-slate-700">{driver.father_name || '---'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-[2mm]">
                      <div className="flex flex-col">
                          <span className="text-[4.5pt] text-slate-400 font-bold uppercase">نمبر جواز</span>
                          <span className="text-[6.5pt] font-bold text-slate-800 font-mono tracking-tighter">{driver.license_number}</span>
                      </div>
                      <div className="flex flex-col">
                          <span className="text-[4.5pt] text-slate-400 font-bold uppercase">پلاک موتر</span>
                          <span className="text-[6.5pt] font-bold text-slate-800">{driver.license_plate}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-[2mm] mt-[1.5mm] pt-[1.5mm] border-t border-slate-100">
                      <div className="flex flex-col">
                          <span className="text-[4.5pt] text-slate-400 font-bold uppercase">تاریخ صدور</span>
                          <span className="text-[6pt] font-bold text-slate-700">{new Date(card.issue_date).toLocaleDateString('fa-AF')}</span>
                      </div>
                      <div className="flex flex-col">
                          <span className="text-[4.5pt] text-rose-400 font-bold uppercase">تاریخ انقضا</span>
                          <span className="text-[6pt] font-bold text-rose-700">{new Date(card.expiry_date).toLocaleDateString('fa-AF')}</span>
                      </div>
                    </div>
                </div>
              </div>
          </div>

          {/* Footer Security */}
          <div className="absolute bottom-[2mm] left-[4mm] right-[4mm] border-t border-slate-100 pt-[1mm] flex justify-between items-center bg-white/50">
              <span className="text-[3.5pt] text-slate-400 uppercase tracking-[2pt]">Electronic Health Record • ANDHP</span>
              <div className="flex gap-[0.5mm]">
                <div className="w-[12mm] h-[1.5mm] rounded-full bg-blue-600/10 border border-blue-600/20" />
              </div>
          </div>
        </>
      ) : (
        <>
          {/* BACK SIDE */}
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none select-none">
              <ShieldCheck className="w-[100mm] h-[100mm] rotate-45 -ml-10" />
          </div>

          <div className="p-[4mm] h-full flex flex-col">
              <div className="flex items-center gap-2 mb-[2mm] border-b border-slate-100 pb-[1mm]">
                <ShieldCheck className="w-[4mm] h-[4mm] text-blue-600" />
                <span className="text-[6pt] font-bold text-slate-800 uppercase tracking-tight">مقررات و شرایط استفاده (Health Regulations)</span>
              </div>

              <div className="flex-1 space-y-[2mm] pr-[1mm]">
                <p className="text-[5pt] text-slate-600 leading-snug flex items-start gap-1">
                    <span className="w-[3pt] h-[3pt] bg-slate-300 rounded-full mt-[1.5pt] shrink-0" />
                    ماده ۱: این کارت به عنوان تاییدیه رسمی وضعیت سلامت و هوشیاری راننده جهت فعالیت در سیستم حمل و نقل کشوری صادر شده است.
                </p>
                <p className="text-[5pt] text-slate-600 leading-snug flex items-start gap-1">
                    <span className="w-[3pt] h-[3pt] bg-slate-300 rounded-full mt-[1.5pt] shrink-0" />
                    ماده ۲: راننده متعهد می‌گردد در صورت بروز هرگونه عارضه صحی یا حادثه، فوراً جهت ارزیابی مجدد به مراکز تایید شده مراجعه نماید.
                </p>
                <p className="text-[5pt] text-slate-600 leading-snug flex items-start gap-1">
                    <span className="w-[3pt] h-[3pt] bg-slate-300 rounded-full mt-[1.5pt] shrink-0" />
                    ماده ۳: جعل یا استفاده غیرمجاز از این کارت پیگرد قانونی داشته و منجر به ابطال جواز رانندگی فرد خاطی خواهد شد.
                </p>
                <p className="text-[5pt] text-slate-600 leading-snug flex items-start gap-1">
                    <span className="w-[3pt] h-[3pt] bg-slate-300 rounded-full mt-[1.5pt] shrink-0" />
                    ماده ۴: اعتبار این کارت تنها با کد QR هوشمند و استعلام از پایگاه داده مرکزی ANDHP قابل تایید می‌باشد.
                </p>
              </div>

              <div className="mt-auto flex justify-between items-end pb-[2mm]">
                <div className="flex flex-col gap-1">
                    <span className="text-[4pt] text-slate-400 font-bold uppercase tracking-widest">Official Verification Portal</span>
                    <span className="text-[6.5pt] font-bold text-blue-600 font-mono tracking-tighter">www.andhp.gov.af</span>
                </div>
                <div className="w-[22mm] h-[12mm] border border-dashed border-slate-200 rounded-sm flex flex-col items-center justify-center relative">
                    <span className="text-[4pt] text-slate-300 absolute top-[-2.5mm] bg-white px-1 font-bold">مهر و امضای مسئول</span>
                    <div className="text-[4pt] text-slate-400 opacity-20 mt-2">Authority Signature</div>
                </div>
              </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* PRINT ONLY SECTION - This is invisible in UI but becomes the only thing visible in Print */}
        <div className="direct-print-zone hidden print:flex">
          <CardSide isBack={false} printOnly={true} />
          <div className="page-break" />
          <CardSide isBack={true} printOnly={true} />
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className={`absolute inset-0 bg-slate-900/60 backdrop-blur-md print-hide ${autoPrint ? 'opacity-0 pointer-events-none' : ''}`}
        />

        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className={`relative w-full max-w-fit print-hide ${autoPrint ? 'opacity-0 pointer-events-none scale-0' : ''}`}
          dir="rtl"
        >
          {/* UI PREVIEW - Only show one side at a time for clarity in UI */}
          <div className="shadow-2xl rounded-[2mm] bg-white p-2">
            <CardSide isBack={showBack} />
          </div>

          {/* Controls - Professional UI */}
          <div className="mt-8 flex flex-col gap-4">
            <div className="flex gap-3">
               <button 
                  onClick={() => setShowBack(!showBack)}
                  className={`flex-1 font-bold py-3.5 px-4 rounded-2xl transition-all border flex items-center justify-center gap-2 ${showBack ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-xl shadow-amber-50/20' : 'bg-white text-slate-700 border-slate-200'}`}
               >
                  <CreditCard className="w-5 h-5" />
                  {showBack ? 'مشاهده روی کارت' : 'مشاهده پشت کارت'}
               </button>
               
               <button 
                  onClick={() => window.print()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-2xl transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-2"
               >
                  <Printer className="w-5 h-5" />
                  چاپ همزمان دو طرف
               </button>
            </div>
            
            <button 
              onClick={onClose}
              className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl transition-all text-sm font-bold"
            >
              خروج از پیش‌نمایش
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
