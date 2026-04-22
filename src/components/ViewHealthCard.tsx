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

  // Shared Card Component for printing
  const CardSide = ({ isBack = false }) => (
    <div 
      className="print-card-standard bg-white overflow-hidden relative" 
      style={{ width: '85.6mm', height: '54mm' }}
    >
      {!isBack ? (
        <>
          {/* FRONT SIDE CONTENT */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none overflow-hidden text-slate-800">
              <ShieldCheck className="w-[120mm] h-[120mm] -mt-[30mm] -mr-[20mm] rotate-12" />
          </div>
          <div className="relative z-10 px-[4mm] pt-[2mm] flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-[5pt] font-bold text-slate-800">جمهوری اسلامی افغانستان</span>
                <span className="text-[4.5pt] text-slate-600">وزارت صحت عامه</span>
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 top-[1mm]">
                <ShieldCheck className="w-[6mm] h-[6mm] text-amber-600" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[5pt] font-bold text-slate-800 uppercase">National Health Card</span>
                <span className="text-[4.5pt] text-slate-600 italic">ID: {driver.id.slice(0, 8)}</span>
              </div>
          </div>
          <div className="relative z-10 px-[4mm] mt-[1mm] flex gap-[3.5mm]">
              <div className="flex flex-col items-center w-[23mm]">
                <div className="w-[23mm] h-[24mm] bg-slate-50 border border-slate-200 rounded-[1mm] overflow-hidden relative">
                    {driver.photo_url ? (
                      <img src={driver.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-[10mm] h-[10mm] text-slate-200 mt-6 mx-auto" />
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-blue-600 text-white text-[4pt] font-bold py-[0.5mm] text-center">
                      BT: {driver.blood_type || 'O+'}
                    </div>
                </div>
                <div className="bg-white p-[1.5mm] border border-slate-100 rounded-sm mt-[2mm]">
                    <QRCodeSVG 
                      value={`${window.location.origin}/verify/${card.id}`} 
                      size={52} 
                      level="H"
                    />
                </div>
              </div>
              <div className="flex-1 pt-[1mm]">
                <div className="grid grid-cols-1 gap-y-[1.8mm]">
                    <div className="flex flex-col">
                      <span className="text-[4.5pt] text-slate-400 font-bold uppercase">نام مکمل راننده</span>
                      <span className="text-[9pt] font-bold text-slate-900 leading-tight">{driver.name}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[4.5pt] text-slate-400 font-bold uppercase">نام پدر</span>
                      <span className="text-[7.5pt] font-bold text-slate-700">{driver.father_name || '---'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-[2mm]">
                      <div className="flex flex-col">
                          <span className="text-[4.5pt] text-slate-400 font-bold uppercase">نمبر جواز</span>
                          <span className="text-[6.5pt] font-bold text-slate-800 font-mono">{driver.license_number}</span>
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
        </>
      ) : (
        <>
          {/* BACK SIDE CONTENT */}
          <div className="p-[4mm] h-full flex flex-col">
              <div className="flex items-center gap-2 mb-[2mm] border-b border-slate-100 pb-[1mm]">
                <ShieldCheck className="w-[4mm] h-[4mm] text-blue-600" />
                <span className="text-[6pt] font-bold text-slate-800">مقررات و شرایط استفاده (Health Regulations)</span>
              </div>
              <div className="flex-1 space-y-[2mm]">
                <p className="text-[5pt] text-slate-600 tracking-tighter">ماده ۱: این کارت تاییدیه رسمی وضعیت سلامت راننده جهت فعالیت در سیستم حمل و نقل است.</p>
                <p className="text-[5pt] text-slate-600 tracking-tighter">ماده ۲: راننده متعهد می‌گردد در صورت بروز هرگونه عارضه صحی، به مراکز تایید شده مراجعه نماید.</p>
                <p className="text-[5pt] text-slate-600 tracking-tighter">ماده ۳: جعل این کارت پیگرد قانونی داشته و منجر به ابطال جواز خواهد شد.</p>
                <p className="text-[5pt] text-slate-600 tracking-tighter">ماده ۴: اعتبار این کارت تنها با استعلام از پایگاه داده مرکزی ANDHP قابل تایید است.</p>
              </div>
              <div className="mt-auto flex justify-between items-end">
                <span className="text-[6.5pt] font-bold text-blue-600 font-mono">www.andhp.gov.af</span>
                <div className="w-[20mm] h-[10mm] border border-dashed border-slate-200 rounded-sm" />
              </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[99999] pointer-events-none opacity-0">
      <div className="direct-print-zone">
        <CardSide isBack={false} />
        <div className="page-break" />
        <CardSide isBack={true} />
      </div>
    </div>
  );
};
