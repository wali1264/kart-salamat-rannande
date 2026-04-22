import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, User } from 'lucide-react';
import { Driver, HealthCard } from '../types';
import { renderToString } from 'react-dom/server';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  driver: Driver;
  card: HealthCard;
  autoPrint?: boolean;
}

export const ViewHealthCard: React.FC<Props> = ({ isOpen, onClose, driver, card, autoPrint = false }) => {
  
  React.useEffect(() => {
    if (isOpen && autoPrint) {
      handlePrint();
    }
  }, [isOpen, autoPrint]);

  const handlePrint = () => {
    // 1. Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '100%';
    iframe.style.bottom = '100%';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    // 2. Generate the HTML content
    const cardHtml = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700&display=swap');
          
          body { 
            font-family: 'Vazirmatn', sans-serif; 
            margin: 0; 
            padding: 0; 
            background: #f0f0f0; 
            display: flex;
            justify-content: center;
            -webkit-print-color-adjust: exact;
          }
          
          .a4-page {
            width: 210mm;
            padding: 10mm;
            display: flex;
            flex-direction: row;
            justify-content: center;
            gap: 8mm;
          }
          
          .card { 
            width: 85.6mm; 
            height: 54mm; 
            background: #fff; 
            border: 0.3mm solid #1a365d; 
            border-radius: 2mm;
            position: relative; 
            overflow: hidden; 
            box-sizing: border-box;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.83L40 15.457l-.83-.83L54.627 0zM5.373 0l-.83.83L19.543 15.457l.83-.83L5.373 0zm49.254 60l-.83-.83L40 44.543l.83.83L54.627 60zM5.373 60l.83-.83L19.543 44.543l-.83.83L5.373 60zM30 45.457l-4.543-4.543L30 36.37l4.543 4.543L30 45.457zM0 30l4.543-4.543L9.086 30l-4.543 4.543L0 30zm60 0l-4.543 4.543L50.914 30l4.543-4.543L60 30zM30 14.543l4.543 4.543L30 23.63l-4.543-4.543L30 14.543z' fill='%231a365d' fill-opacity='0.03' fill-rule='evenodd'/%3E%3C/svg%3E");
          }
          
          /* Specialized Elements */
          .card::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; height: 1.5mm;
            background: linear-gradient(90deg, #d4af37, #1a365d, #d4af37);
          }
          
          .security-mesh {
            position: absolute;
            inset: 0;
            background-image: radial-gradient(#1a365d 0.5px, transparent 0.5px);
            background-size: 4mm 4mm;
            opacity: 0.05;
            pointer-events: none;
          }
          
          .emblem {
            position: absolute;
            top: 3mm;
            left: 50%;
            transform: translateX(-50%);
            width: 10mm;
            height: 10mm;
            opacity: 0.8;
          }
          
          .driver-photo-frame {
            position: absolute;
            top: 4mm;
            right: 4mm;
            width: 23mm;
            height: 29mm;
            padding: 0.8mm;
            background: #fff;
            border: 0.4mm solid #1a365d;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            z-index: 10;
          }
          
          .driver-photo-frame img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          
          .blood-type-tag {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: #1a365d;
            color: #fff;
            font-size: 5pt;
            font-weight: 700;
            text-align: center;
            padding: 0.6mm 0;
          }
          
          .card-header-titles {
            position: absolute;
            top: 3mm;
            left: 4mm;
            display: flex;
            flex-direction: column;
            gap: 0.5mm;
          }
          
          .title-afg { font-size: 5.5pt; font-weight: 700; color: #1a365d; }
          .title-ministry { font-size: 5pt; color: #444; }
          .title-en { font-size: 5.5pt; font-weight: 700; color: #1a365d; text-transform: uppercase; border-top: 0.1mm solid #ddd; margin-top: 1mm; padding-top: 0.5mm; }
          
          .info-section {
            position: absolute;
            top: 15mm;
            right: 31mm;
            left: 4mm;
            display: flex;
            flex-direction: column;
            gap: 2.2mm;
          }
          
          .info-block { display: flex; flex-direction: column; }
          .info-label { 
            font-size: 4.8pt; 
            color: #777; 
            font-weight: 500; 
            display: flex; 
            justify-content: space-between;
          }
          .info-value { 
            font-size: 9.5pt; 
            font-weight: 700; 
            color: #1a365d; 
            margin-top: -0.8mm;
          }
          .info-value.compact { font-size: 8pt; }
          
          .grid-info { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
          
          .footer-strip {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 1.5mm 4mm;
            background: #f8fafc;
            border-top: 0.2mm solid #1a365d;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .qr-container {
            position: absolute;
            bottom: 2.5mm;
            left: 4mm;
            width: 17mm;
            height: 17mm;
            background: #fff;
            padding: 1mm;
            border: 0.2mm solid #1a365d;
            z-index: 20;
          }
          
          .card-id {
            position: absolute;
            bottom: 1.5mm;
            right: 4mm;
            font-size: 4.5pt;
            color: #999;
            font-family: monospace;
          }

          @media print {
            body { background: white; }
            .a4-page { padding: 0; margin: 15mm auto; }
            .card { box-shadow: none; border-width: 0.15mm; }
          }
        </style>
      </head>
      <body>
        <div class="a4-page">
          <!-- FRONT SIDE -->
          <div class="card">
            <div class="security-mesh"></div>
            
            <div class="emblem">
              <svg viewBox="0 0 24 24" fill="none" stroke="%23d4af37" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M12 8v4M12 16h.01" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>

            <div class="card-header-titles">
              <div class="title-afg">جمهوری اسلامی افغانستان</div>
              <div class="title-ministry">وزارت صحت عامه</div>
              <div class="title-en">National Health Card</div>
            </div>

            <div class="driver-photo-frame">
              ${driver.photo_url ? `<img src="${driver.photo_url}" />` : ''}
              <div class="blood-type-tag">BT: ${driver.blood_type || 'O+'}</div>
            </div>

            <div class="info-section">
              <div class="info-block">
                <div class="info-label"><span>نام مکمل راننده</span><span>Full Name</span></div>
                <div class="info-value">${driver.name}</div>
              </div>
              
              <div class="info-block">
                <div class="info-label"><span>نام پدر</span><span>Father Name</span></div>
                <div class="info-value compact">${driver.father_name || '---'}</div>
              </div>

              <div class="info-block">
                <div class="info-label"><span>نمبر جواز</span><span>License No.</span></div>
                <div class="info-value compact" style="font-family: monospace;">${driver.license_number}</div>
              </div>
            </div>

            <!-- Technical info column shifted right under the photo -->
            <div style="position: absolute; top: 35mm; right: 4mm; width: 23mm; display: flex; flex-direction: column; gap: 1mm;">
               <div class="info-block">
                  <div class="info-label"><span>پلاک موتر</span><span>Plate</span></div>
                  <div class="info-value compact" style="font-size: 7.5pt;">${driver.license_plate}</div>
               </div>
               <div style="display: flex; flex-direction: column; gap: 0.5mm; border-top: 0.1mm solid #eee; padding-top: 0.5mm;">
                  <div class="info-label"><span>صدور / انقضا</span></div>
                  <div style="font-size: 5pt; font-weight: 700; color: #1a365d;">${new Date(card.issue_date).toLocaleDateString('fa-AF')}</div>
                  <div style="font-size: 5pt; font-weight: 700; color: #900;">${new Date(card.expiry_date).toLocaleDateString('fa-AF')}</div>
               </div>
            </div>

            <div class="qr-container" id="qrcode-front"></div>
            <div class="card-id">ID: ${driver.id.slice(0, 8).toUpperCase()}</div>
          </div>

          <!-- BACK SIDE -->
          <div class="card">
            <div class="security-mesh"></div>
            <div style="padding: 5mm; display: flex; flex-direction: column; height: 100%; box-sizing: border-box;">
              <div style="display: flex; align-items: center; gap: 2mm; border-bottom: 0.3mm solid #1a365d; padding-bottom: 2mm; margin-bottom: 3mm;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="%231a365d" stroke-width="2.5" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span style="font-size: 6.5pt; font-weight: 700; color: #1a365d; letter-spacing: -0.1mm;">مقررات و شرایط استفاده (Regulations)</span>
              </div>
              
              <div style="display: flex; flex-direction: column; gap: 3mm;">
                <div style="font-size: 5.2pt; line-height: 1.5; color: #333; display: flex; gap: 2mm;">
                  <span style="color: #1a365d; font-weight: 700;">۱.</span>
                  <span>این کارت تاییدیه رسمی وضعیت سلامت راننده جهت فعالیت در سیستم حمل و نقل است.</span>
                </div>
                <div style="font-size: 5.2pt; line-height: 1.5; color: #333; display: flex; gap: 2mm;">
                  <span style="color: #1a365d; font-weight: 700;">۲.</span>
                  <span>راننده متعهد می‌گردد در صورت بروز هرگونه عارضه صحی، به مراکز تایید شده مراجعه نماید.</span>
                </div>
                <div style="font-size: 5.2pt; line-height: 1.5; color: #333; display: flex; gap: 2mm;">
                  <span style="color: #1a365d; font-weight: 700;">۳.</span>
                  <span>جعل یا استفاده سوء از این کارت پیگرد قانونی داشته و منجر به ابطال جواز خواهد شد.</span>
                </div>
                <div style="font-size: 5.2pt; line-height: 1.5; color: #333; display: flex; gap: 2mm;">
                  <span style="color: #1a365d; font-weight: 700;">۴.</span>
                  <span>اعتبار این کارت تنها با استعلام از پایگاه داده مرکزی ANDHP قابل تایید است.</span>
                </div>
              </div>

              <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; border-top: 0.1mm solid #ddd; padding-top: 3mm;">
                <div style="display: flex; flex-direction: column;">
                  <span style="font-size: 6.5pt; font-weight: 700; color: #1a365d; font-family: monospace;">www.andhp.gov.af</span>
                  <span style="font-size: 4pt; color: #999;">Islamic Republic of Afghanistan / MoPH</span>
                </div>
                <div style="width: 20mm; height: 12mm; border: 0.2mm dashed #1a365d; border-radius: 1mm; display: flex; align-items: center; justify-content: center; background: rgba(26,54,93,0.02);">
                  <span style="font-size: 4pt; color: #1a365d; opacity: 0.5; font-weight: 700;">STAMP & SIGN</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
        <script>
          function generateQR() {
            var qr = qrcode(0, 'M');
            qr.addData('${window.location.origin}/verify/${card.id}');
            qr.make();
            document.getElementById('qrcode-front').innerHTML = qr.createSvgTag(1.8);
            
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.parent.postMessage('close-print', '*');
              }, 600);
            };
          }
          generateQR();
        </script>
      </body>
      </html>
    `;

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(cardHtml);
      doc.close();
    }
  };

  // Listen for the iframe completion signal
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'close-print') {
        const iframes = document.querySelectorAll('iframe[style*="right: 100%"]');
        iframes.forEach(f => f.remove());
        onClose();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onClose]);

  return null; // The print engine is completely invisible
};
