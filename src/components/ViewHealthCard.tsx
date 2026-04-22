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
          @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700&display=swap');
          body { 
            font-family: 'Vazirmatn', sans-serif; 
            margin: 0; 
            padding: 0; 
            background: white; 
            display: flex;
            justify-content: center;
          }
          .a4-page {
            width: 210mm;
            padding: 10mm;
            display: flex;
            flex-direction: row;
            justify-content: flex-start;
            gap: 5mm;
          }
          .card { 
            width: 85.6mm; 
            height: 54mm; 
            background: white; 
            border: 0.2mm solid #000; 
            position: relative; 
            overflow: hidden; 
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
          }
          
          .absolute { position: absolute; }
          .text-right { text-align: right; }
          
          /* Positioning Strategy */
          .driver-photo {
            top: 2mm;
            right: 2mm;
            width: 22mm;
            height: 28mm;
            border: 0.1mm solid #ccc;
            overflow: hidden;
            background: #f1f5f9;
          }
          .driver-photo img { width: 100%; height: 100%; object-fit: cover; }
          
          .qr-code-box {
            bottom: 2mm;
            left: 2mm;
            width: 18mm;
            height: 18mm;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .card-header {
            top: 2mm;
            left: 2mm;
            display: flex;
            flex-direction: column;
            gap: 0.5mm;
          }
          
          .main-info {
            top: 14mm;
            right: 26mm;
            left: 2mm;
            display: flex;
            flex-direction: column;
            gap: 2mm;
          }
          
          .label { font-size: 5pt; color: #666; font-weight: bold; }
          .value { font-size: 8.5pt; font-weight: 700; color: #000; display: block; margin-top: -0.5mm; }
          .value-small { font-size: 7.5pt; }

          @media print {
            body { background: white; }
            .card { border: 0.1mm solid #999; }
          }
        </style>
      </head>
      <body>
        <div class="a4-page">
          <!-- FRONT SIDE -->
          <div class="card">
            <div class="card-header">
              <div style="font-size: 5pt; font-weight: 700;">جمهوری اسلامی افغانستان</div>
              <div style="font-size: 4.5pt;">وزارت صحت عامه</div>
              <div style="font-size: 5pt; font-weight: 700; margin-top: 1mm; border-top: 0.1mm solid #eee; padding-top: 0.5mm;">NATIONAL HEALTH CARD</div>
            </div>

            <div class="driver-photo">
              ${driver.photo_url ? `<img src="${driver.photo_url}" />` : ''}
              <div style="position: absolute; bottom: 0; width: 100%; background: #000; color: #fff; font-size: 4.5pt; text-align: center; font-weight: bold;">
                BT: ${driver.blood_type || 'O+'}
              </div>
            </div>

            <div class="main-info">
              <div>
                <span class="label">نام مکمل راننده:</span>
                <span class="value">${driver.name}</span>
              </div>
              <div>
                <span class="label">نام پدر:</span>
                <span class="value-small" style="display:block; font-weight: 700;">${driver.father_name || '---'}</span>
              </div>
              <div style="display: flex; gap: 4mm; margin-top: 1mm;">
                <div>
                  <span class="label">نمبر جواز:</span>
                  <span class="value-small" style="display:block; font-family: monospace; font-weight: 700;">${driver.license_number}</span>
                </div>
                <div>
                  <span class="label">پلاک موتر:</span>
                  <span class="value-small" style="display:block; font-weight: 700;">${driver.license_plate}</span>
                </div>
              </div>
              <div style="display: flex; gap: 4mm; margin-top: 1mm; border-top: 0.1mm solid #eee; padding-top: 1mm;">
                <div>
                  <span class="label">تاریخ صدور:</span>
                  <span style="font-size: 5pt; display:block;">${new Date(card.issue_date).toLocaleDateString('fa-AF')}</span>
                </div>
                <div>
                  <span class="label" style="color: #900;">تاریخ انقضا:</span>
                  <span style="font-size: 5pt; font-weight: bold; color: #900; display:block;">${new Date(card.expiry_date).toLocaleDateString('fa-AF')}</span>
                </div>
              </div>
            </div>

            <div class="qr-code-box" id="qrcode-front"></div>
            <div style="position: absolute; bottom: 1mm; right: 2mm; font-size: 4pt; color: #999; font-family: monospace;">
              ID: ${driver.id.slice(0, 8)}
            </div>
          </div>

          <!-- BACK SIDE -->
          <div class="card">
            <div style="padding: 4mm; display: flex; flex-direction: column; height: 100%;">
              <div style="border-bottom: 0.1mm solid #000; padding-bottom: 1.5mm; margin-bottom: 2mm;">
                <span style="font-size: 6pt; font-weight: 700;">مقررات و شرایط استفاده (Health Regulations)</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 2.5mm;">
                <div style="font-size: 4.8pt; line-height: 1.4; color: #333;">۱. این کارت تاییدیه رسمی وضعیت سلامت راننده جهت فعالیت در سیستم حمل و نقل است.</div>
                <div style="font-size: 4.8pt; line-height: 1.4; color: #333;">۲. راننده متعهد می‌گردد در صورت بروز هرگونه عارضه صحی، به مراکز تایید شده مراجعه نماید.</div>
                <div style="font-size: 4.8pt; line-height: 1.4; color: #333;">۳. جعل یا استفاده سوء از این کارت پیگرد قانونی داشته و منجر به ابطال جواز خواهد شد.</div>
                <div style="font-size: 4.8pt; line-height: 1.4; color: #333;">۴. اعتبار این کارت تنها با استعلام از پایگاه داده مرکزی ANDHP قابل تایید است.</div>
              </div>
              <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 2mm;">
                <span style="font-size: 6pt; font-weight: bold; color: #000; font-family: monospace;">www.andhp.gov.af</span>
                <div style="width: 18mm; height: 10mm; border: 0.1mm dashed #999; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 3pt; color: #ccc;">STAMP / امضا</span>
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
            document.getElementById('qrcode-front').innerHTML = qr.createSvgTag(2);
            
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.parent.postMessage('close-print', '*');
              }, 400);
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
