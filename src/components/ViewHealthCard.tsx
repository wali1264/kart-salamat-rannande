import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Printer, ShieldCheck, MapPin, User, Hash } from 'lucide-react';
import { Driver, HealthCard } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  driver: Driver;
  card: HealthCard;
}

export const ViewHealthCard: React.FC<Props> = ({ isOpen, onClose, driver, card }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        />

        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md"
          dir="rtl"
        >
          {/* Virtual Card Rendering */}
          <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden print:shadow-none border border-slate-100">
            {/* Card Header */}
            <div className="bg-blue-700 p-8 text-white relative">
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                     <ShieldCheck className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">د افغانستان اسلامی امارت</h3>
                    <p className="text-[10px] text-blue-100 font-medium opacity-80 uppercase tracking-widest">Ministry of Public Health</p>
                  </div>
                </div>
                <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold border border-white/20 uppercase tracking-widest">
                  Official Record
                </div>
              </div>
              <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none overflow-hidden">
                 <ShieldCheck className="w-48 h-48 -ml-10 -mt-10" />
              </div>
            </div>

             {/* Card Body */}
             <div className="p-8">
               <div className="flex items-start gap-6 mb-8">
                 <div className="w-24 h-24 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center overflow-hidden shadow-inner">
                    {driver.photo_url ? (
                      <img src={driver.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-slate-300" />
                    )}
                 </div>
                 <div className="flex-1 space-y-3">
                   <div>
                     <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">نام راننده</p>
                     <p className="text-lg font-bold text-slate-800 leading-tight">{driver.name}</p>
                   </div>
                   <div>
                     <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">نام پدر</p>
                     <p className="text-sm font-bold text-slate-700">{driver.father_name || '---'}</p>
                   </div>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4 mb-8 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                 <div>
                   <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">نمبر جواز</p>
                   <p className="text-sm font-bold text-slate-800 font-mono tracking-wider">{driver.license_number}</p>
                 </div>
                 <div>
                   <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">پلاک موتر</p>
                   <p className="text-xs font-bold text-slate-800">{driver.license_plate}</p>
                 </div>
                 <div className="pt-2 border-t border-slate-200/50">
                   <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">تاریخ صدور</p>
                   <p className="text-xs font-bold text-slate-800">{new Date(card.issue_date).toLocaleDateString('fa-AF')}</p>
                 </div>
                 <div className="pt-2 border-t border-slate-200/50">
                   <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">تاریخ انقضا</p>
                   <p className="text-xs font-bold text-slate-800">{new Date(card.expiry_date).toLocaleDateString('fa-AF')}</p>
                 </div>
               </div>

               {/* QR Code Container */}
               <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                 <div className="bg-white p-4 rounded-2xl shadow-sm mb-4 border border-slate-100">
                    <QRCodeSVG 
                     value={`${window.location.origin}/verify/${card.id}`} 
                     size={160}
                     level="H"
                     includeMargin={false}
                    />
                 </div>
                 <p className="text-[10px] text-slate-400 text-center font-bold uppercase tracking-widest leading-relaxed">
                   Scan to Verify Authenticity<br/>
                   <span className="text-blue-600">ID: {card.id.slice(0, 12)}</span>
                 </p>
               </div>
             </div>

            {/* Footer / Buttons */}
            <div className="px-8 pb-8 flex gap-3">
              <button 
                onClick={() => window.print()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                چاپ کارت
              </button>
              <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                دانلود PDF
              </button>
              <button 
                onClick={onClose}
                className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
