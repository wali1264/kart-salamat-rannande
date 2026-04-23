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
            background: #fff; 
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
            background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.83L40 15.457l-.83-.83L54.627 0zM5.373 0l-.83.83L19.543 15.457l.83-.83L5.373 0zm49.254 60l-.83-.83L40 44.543l.83.83L54.627 60zM5.373 60l.83-.83L19.543 44.543l-.83.83L5.373 60zM30 45.457l-4.543-4.543L30 36.37l4.543 4.543L30 45.457zM0 30l4.543-4.543L9.086 30l-4.543 4.543L0 30zm60 0l-4.543 4.543L50.914 30l4.543-4.543L60 30zM30 14.543l4.543 4.543L30 23.63l-4.543-4.543L30 14.543z' fill='%231a365d' fill-opacity='0.03' fill-rule='evenodd'/%3E%3C/svg%3E");
          }
          
          .card::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; height: 1.2mm;
            background: #1a365d;
          }
          
          .security-mesh {
            position: absolute;
            inset: 0;
            background-image: radial-gradient(#1a365d 0.5px, transparent 0.5px);
            background-size: 4mm 4mm;
            opacity: 0.04;
            pointer-events: none;
          }
          
          .driver-photo-frame {
            position: absolute;
            top: 4mm;
            right: 4mm;
            width: 23mm;
            height: 29mm;
            padding: 0.8mm;
            background: #fff;
            border: 0.3mm solid #1a365d;
            z-index: 10;
          }
          
          .driver-photo-frame img { width: 100%; height: 100%; object-fit: cover; }
          
          .blood-type-tag {
            position: absolute;
            bottom: 0; left: 0; right: 0;
            background: #1a365d;
            color: #fff;
            font-size: 5pt;
            font-weight: 700;
            text-align: center;
            padding: 0.5mm 0;
          }
          
          .card-header-titles {
            position: absolute;
            top: 2.5mm;
            left: 4mm;
            display: flex;
            flex-direction: column;
            gap: 0.3mm;
          }
          
          .title-afg { font-size: 5.5pt; font-weight: 700; color: #1a365d; }
          .title-afg-ps { font-size: 4.5pt; color: #444; font-weight: 500; }
          .title-en-ie { font-size: 4.8pt; color: #666; text-transform: uppercase; margin-bottom: 1mm; }
          
          .title-card-type { 
            font-size: 5.5pt; 
            font-weight: 700; 
            color: #1a365d; 
            text-transform: uppercase; 
            border-top: 0.1mm solid #ddd; 
            padding-top: 0.5mm; 
            margin-top: 0.5mm;
          }
          
          .info-section {
            position: absolute;
            top: 17mm;
            right: 31mm;
            left: 4mm;
            display: flex;
            flex-direction: column;
            gap: 2.5mm;
          }
          
          .info-block { display: flex; flex-direction: column; }
          .info-label { 
            font-size: 4.5pt; 
            color: #777; 
            font-weight: 500; 
            display: flex; 
            justify-content: space-between;
            border-bottom: 0.05mm solid #f0f0f0;
            padding-bottom: 0.2mm;
            margin-bottom: 0.2mm;
          }
          .info-value { 
            font-size: 9.5pt; 
            font-weight: 700; 
            color: #1a365d; 
            line-height: 1;
          }
          
          .tech-info-grid {
            position: absolute;
            bottom: 2mm;
            right: 4mm;
            width: 58mm;
            display: grid;
            grid-template-columns: 1fr 1.2fr;
            gap: 2mm;
            z-index: 5;
          }
          
          .tech-block {
            display: flex;
            flex-direction: column;
            background: rgba(26,54,93,0.02);
            padding: 1.2mm;
            border: 0.1mm solid #eee;
          }
          
          .tech-label { font-size: 4pt; color: #888; font-weight: bold; margin-bottom: 0.5mm; }
          .tech-value { font-size: 7.5pt; font-weight: bold; color: #1a365d; }
          .tech-date { font-size: 5.5pt; font-weight: bold; }
          
          .qr-container {
            position: absolute;
            bottom: 2.5mm;
            left: 4mm;
            width: 17.5mm;
            height: 17.5mm;
            background: #fff;
            padding: 0.8mm;
            border: 0.2mm solid #1a365d;
            z-index: 20;
          }
          
          .serial-no {
            position: absolute;
            bottom: 1mm;
            left: 23mm;
            font-size: 3.8pt;
            color: #aaa;
            font-family: monospace;
            z-index: 30;
          }

          @media print {
            body { background: white; }
            .a4-page { padding: 0; margin: 15mm auto; }
            .card { border-width: 0.15mm; }
          }
        </style>
      </head>
      <body>
        <div class="a4-page">
          <!-- FRONT SIDE -->
          <div class="card">
            <div class="security-mesh"></div>
            
            <div class="card-header-titles">
              <div class="title-afg">امارت اسلامی افغانستان</div>
              <div class="title-afg-ps">د افغانستان اسلامی امارت</div>
              <div class="title-en-ie">Islamic Emirate of Afghanistan</div>
              <div style="font-size: 4.5pt; color: #333;">وزارت صحت عامه / د عامې روغتیا وزارت</div>
              <div class="title-card-type">National Health Card</div>
            </div>

            <div class="driver-photo-frame">
              ${driver.photo_url ? `<img src="${driver.photo_url}" />` : ''}
              <div class="blood-type-tag">BT: ${driver.blood_type || 'O+'}</div>
            </div>

            <div class="info-section">
              <div class="info-block">
                <div class="info-label"><span>نام / نوم</span><span>Name</span></div>
                <div class="info-value">${driver.name}</div>
              </div>
              
              <div class="info-block">
                <div class="info-label"><span>نام پدر / د پلار نوم</span><span>Father Name</span></div>
                <div class="info-value" style="font-size: 8pt;">${driver.father_name || '---'}</div>
              </div>
            </div>

            <!-- Bottom technical row organized as per request -->
            <div class="tech-info-grid">
               <div class="tech-block">
                  <div class="tech-label">پلاک موتر / پلیت</div>
                  <div class="tech-value">${driver.license_plate}</div>
                  <div class="tech-label" style="margin-top: 1mm;">نمبر جواز / د جواز نمبر</div>
                  <div class="tech-value" style="font-size: 6.5pt; font-family: monospace;">${driver.license_number}</div>
               </div>
               <div class="tech-block">
                  <div class="tech-label">تاریخ صدور / د صادریدو نیټه</div>
                  <div class="tech-date" style="color: #1a365d;">${new Date(card.issue_date).toLocaleDateString('fa-AF')}</div>
                  <div class="tech-label" style="margin-top: 1.5mm; color: #900;">تاریخ انقضا / د پای نیټه</div>
                  <div class="tech-date" style="color: #900;">${new Date(card.expiry_date).toLocaleDateString('fa-AF')}</div>
               </div>
            </div>

            <div class="qr-container" id="qrcode-front"></div>
            <div class="serial-no">S/N: ${driver.id.slice(0, 12).toUpperCase()}</div>
          </div>

          <!-- BACK SIDE -->
          <div class="card">
            <div class="security-mesh"></div>
            <div style="padding: 5mm; display: flex; flex-direction: column; height: 100%; box-sizing: border-box;">
              <div style="display: flex; align-items: center; gap: 2mm; border-bottom: 0.3mm solid #1a365d; padding-bottom: 1.5mm; margin-bottom: 3mm;">
                <span style="font-size: 6pt; font-weight: 700; color: #1a365d;">مقررات و شرایط استفاده (Regulations)</span>
              </div>
              
              <div style="display: flex; flex-direction: column; gap: 2.5mm;">
                <div style="font-size: 5pt; line-height: 1.4; color: #333; display: flex; gap: 1.5mm;">
                  <span style="color: #1a365d; font-weight: 700;">۱.</span>
                  <span>این کارت تاییدیه رسمی وضعیت سلامت راننده جهت فعالیت در سیستم حمل و نقل است.</span>
                </div>
                <div style="font-size: 5pt; line-height: 1.4; color: #333; display: flex; gap: 1.5mm;">
                  <span style="color: #1a365d; font-weight: 700;">۲.</span>
                  <span>راننده متعهد می‌گردد در صورت بروز هرگونه عارضه صحی، به مراکز تایید شده مراجعه نماید.</span>
                </div>
                <div style="font-size: 5pt; line-height: 1.4; color: #333; display: flex; gap: 1.5mm;">
                  <span style="color: #1a365d; font-weight: 700;">۳.</span>
                  <span>جعل یا استفاده سوء از این کارت پیگرد قانونی داشته و منجر به ابطال جواز خواهد شد.</span>
                </div>
              </div>

              <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; border-top: 0.1mm solid #ddd; padding-top: 3mm;">
                <div style="display: flex; flex-direction: column;">
                  <span style="font-size: 6.5pt; font-weight: 700; color: #1a365d; font-family: monospace;">www.andhp.gov.af</span>
                  <span style="font-size: 3.8pt; color: #999;">Islamic Emirate of Afghanistan / MoPH</span>
                </div>
                <div style="width: 18mm; height: 11mm; border: 0.2mm dashed #1a365d; border-radius: 1mm; display: flex; align-items: center; justify-content: center; background: rgba(26,54,93,0.01);">
                  <span style="font-size: 3.5pt; color: #1a365d; opacity: 0.4; font-weight: 700; text-align: center;">STAMP / SIGN<br>امضا او مهر</span>
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
