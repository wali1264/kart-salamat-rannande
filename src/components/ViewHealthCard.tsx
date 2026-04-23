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
            position: absolute;
            top: 15.5mm;
            left: 0;
            right: 0;
            font-size: 5.2pt; 
            font-weight: 700; 
            color: #fff; 
            background: #1a365d;
            text-transform: uppercase; 
            text-align: center;
            padding: 0.8mm 0;
            letter-spacing: 0.5mm;
            z-index: 5;
          }
          
          .info-section {
            position: absolute;
            top: 22mm;
            right: 32mm;
            left: 24mm;
            display: flex;
            flex-direction: column;
            gap: 4mm;
            z-index: 10;
          }
          
          .info-block { display: flex; flex-direction: column; align-items: flex-start; text-align: right; width: 100%; }
          .info-label { 
            font-size: 5pt; 
            color: #1a365d; 
            font-weight: 700; 
            display: flex;
            flex-direction: column;
            gap: 0.2mm;
            margin-bottom: 0.6mm;
            line-height: 1;
          }
          .info-label span:last-child {
            font-size: 3.8pt;
            color: #666;
            font-weight: 500;
            text-transform: uppercase;
          }
          .info-value { 
            font-size: 9pt; 
            font-weight: 700; 
            color: #000; 
            line-height: 1;
          }
          
          .technical-panel {
            position: absolute;
            bottom: 3.5mm;
            right: 4mm;
            width: 23mm;
            display: flex;
            flex-direction: column;
            gap: 2mm;
            background: rgba(26,54,93,0.03);
            padding: 1.5mm;
            border-radius: 0.5mm;
            border: 0.1mm solid rgba(26,54,93,0.1);
          }
          
          .tech-item {
            display: flex;
            flex-direction: column;
          }
          
          .tech-label { 
            font-size: 4pt; 
            color: #1a365d; 
            font-weight: 800; 
            margin-bottom: 0.4mm;
            display: flex;
            justify-content: space-between;
          }
          .tech-label span:last-child { font-size: 3.2pt; color: #777; font-weight: 500; }
          
          .tech-value { font-size: 7pt; font-weight: bold; color: #111; }
          .tech-date { font-size: 5.5pt; font-weight: bold; }
          
          .qr-container {
            position: absolute;
            bottom: 3.5mm;
            left: 4mm;
            width: 17mm;
            height: 17mm;
            background: #fff;
            padding: 0.5mm;
            border: 0.15mm solid #ddd;
            z-index: 20;
          }
          
          .serial-no {
            position: absolute;
            bottom: 1.5mm;
            left: 23mm;
            font-size: 4pt;
            color: #999;
            font-family: monospace;
          }

          @media print {
            body { background: white; }
            .a4-page { padding: 0; margin: 15mm auto; }
            .card { border-width: 0.25mm; box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="a4-page">
          <!-- FRONT SIDE -->
          <div class="card">
            <div class="security-mesh"></div>
            
            <div class="card-header-titles">
              <div class="title-afg">د افغانستان اسلامی امارت</div>
              <div class="title-afg-ps" style="font-size: 5.5pt; font-weight: 600; color: #333;">امارت اسلامی افغانستان</div>
              <div class="title-en-ie" style="font-size: 4.8pt; margin-bottom: 0.5mm; font-weight: 500;">Islamic Emirate of Afghanistan</div>
              <div style="font-size: 5pt; color: #1a365d; font-weight: 700; margin-top: 1mm; border-top: 0.1mm solid #eee; padding-top: 0.8mm;">د عامې روغتیا وزارت / وزارت صحت عامه</div>
              <div class="title-card-type">National Health Card</div>
            </div>

            <div class="driver-photo-frame">
              ${driver.photo_url ? `<img src="${driver.photo_url}" />` : ''}
            </div>

            <div class="info-section">
              <div class="info-block">
                <div class="info-label">
                  <span>نوم / نام</span>
                  <span>Driver Name</span>
                </div>
                <div class="info-value">${driver.name}</div>
              </div>
              
              <div class="info-block">
                <div class="info-label">
                  <span>د پلار نوم / نام پدر</span>
                  <span>Father Name</span>
                </div>
                <div class="info-value" style="font-size: 8.5pt;">${driver.father_name || '---'}</div>
              </div>
            </div>

            <!-- Side technical panel under the photo -->
            <div class="technical-panel">
               <div class="tech-item">
                  <div class="tech-label"><span>پلیت / پلاک</span><span>Plate</span></div>
                  <div class="tech-value">${driver.license_plate}</div>
               </div>
               <div class="tech-item">
                  <div class="tech-label"><span>د جواز نمبر</span><span>Lic. No</span></div>
                  <div class="tech-value" style="font-size: 6.5pt; font-family: monospace;">${driver.license_number}</div>
               </div>
               <div class="tech-item">
                  <div class="tech-label"><span>صدور / انقضا</span><span>Dates</span></div>
                  <div class="tech-date" style="color: #1a365d;">${new Date(card.issue_date).toLocaleDateString('fa-AF')} / <span style="color: #900;">${new Date(card.expiry_date).toLocaleDateString('fa-AF')}</span></div>
               </div>
               <div class="tech-item">
                  <div class="tech-label"><span>د وینې نوعه</span><span>BT</span></div>
                  <div class="tech-value" style="font-size: 6.5pt;">${driver.blood_type || 'O+'}</div>
               </div>
            </div>

            <div class="qr-container" id="qrcode-front"></div>
            <div class="serial-no">S/N: ${driver.id.slice(0, 12).toUpperCase()}</div>
          </div>

          <!-- BACK SIDE -->
          <div class="card">
            <div class="security-mesh"></div>
            <div style="padding: 5mm; display: flex; flex-direction: column; height: 100%; box-sizing: border-box;">
              <div style="display: flex; align-items: center; gap: 2mm; border-bottom: 0.3mm solid #1a365d; padding-bottom: 2mm; margin-bottom: 4mm;">
                <span style="font-size: 6.5pt; font-weight: 800; color: #1a365d; text-transform: uppercase;">Regulations / د استفادې مقررات</span>
              </div>
              
              <div style="display: flex; flex-direction: column; gap: 4mm;">
                <div style="font-size: 5.5pt; line-height: 1.5; color: #222; display: flex; gap: 2mm;">
                  <span style="color: #1a365d; font-weight: 800;">۱.</span>
                  <span>این کارت تاییدیه رسمی وضعیت سلامت راننده جهت فعالیت در سیستم حمل و نقل است.</span>
                </div>
                <div style="font-size: 5.5pt; line-height: 1.5; color: #222; display: flex; gap: 2mm;">
                  <span style="color: #1a365d; font-weight: 800;">۲.</span>
                  <span>راننده متعهد می‌گردد در صورت بروز هرگونه عارضه صحی، به مراکز تایید شده مراجعه نماید.</span>
                </div>
                <div style="font-size: 5.5pt; line-height: 1.5; color: #222; display: flex; gap: 2mm;">
                  <span style="color: #1a365d; font-weight: 800;">۳.</span>
                  <span>جعل یا استفاده سوء از این کارت پیگرد قانونی داشته و منجر به ابطال جواز خواهد شد.</span>
                </div>
              </div>

              <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; border-top: 0.1mm solid #ddd; padding-top: 4mm;">
                <div style="display: flex; flex-direction: column;">
                  <span style="font-size: 7.5pt; font-weight: 800; color: #1a365d; font-family: monospace;">www.andhp.gov.af</span>
                  <span style="font-size: 4pt; color: #666; font-weight: 600;">Islamic Emirate of Afghanistan / MoPH</span>
                </div>
                <div style="width: 20mm; height: 12mm; border: 0.3mm dashed #1a365d; border-radius: 0.5mm; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.01);">
                  <span style="font-size: 4pt; color: #1a365d; text-align: center; font-weight: 700;">STAMP & SIGN<br>مهر او امضا</span>
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
