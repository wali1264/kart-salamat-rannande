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
          body { font-family: 'Vazirmatn', sans-serif; margin: 0; padding: 0; background: white; }
          .container { display: flex; flex-direction: column; align-items: center; gap: 20mm; padding: 10mm 0; }
          .card { 
            width: 85.6mm; 
            height: 54mm; 
            background: white; 
            border: 0.1mm solid #e2e8f0; 
            border-radius: 1mm; 
            position: relative; 
            overflow: hidden; 
            page-break-inside: avoid;
            box-sizing: border-box;
          }
          .absolute { position: absolute; }
          .relative { position: relative; }
          .flex { display: flex; }
          .flex-col { flex-direction: column; }
          .justify-between { justify-content: space-between; }
          .items-start { align-items: flex-start; }
          .items-center { align-items: center; }
          .w-full { width: 100%; }
          .h-full { height: 100%; }
          .text-slate-800 { color: #1e293b; }
          .text-slate-600 { color: #475569; }
          .text-slate-400 { color: #94a3b8; }
          .text-blue-600 { color: #2563eb; }
          .text-rose-700 { color: #be123c; }
          .font-bold { font-weight: 700; }
          .uppercase { text-transform: uppercase; }
          .italic { font-style: italic; }
          
          /* Specialized Card Styling */
          .header { padding: 4mm 4mm 0; display: flex; justify-content: space-between; }
          .photo-box { width: 23mm; height: 24mm; border: 0.1mm solid #e2e8f0; border-radius: 1mm; overflow: hidden; position: relative; }
          .photo-box img { width: 100%; height: 100%; object-cover: cover; }
          .blood-tag { position: absolute; bottom: 0; width: 100%; background: #2563eb; color: white; font-size: 4pt; font-weight: bold; text-align: center; padding: 0.5mm 0; }
          .info-grid { display: grid; grid-template-columns: 1fr; gap: 1.8mm; }
          .divider { border-top: 0.1mm solid #f1f5f9; margin-top: 1.5mm; padding-top: 1.5mm; display: grid; grid-template-columns: 1fr 1fr; }
          
          @page { size: auto; margin: 0; }
          @media print { body { background: white; } }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- FRONT SIDE -->
          <div class="card">
            <div class="header">
              <div class="flex-col">
                <div style="font-size: 5pt; font-weight: bold;">جمهوری اسلامی افغانستان</div>
                <div style="font-size: 4.5pt; color: #475569;">وزارت صحت عامه</div>
              </div>
              <div style="font-size: 5pt; font-weight: bold; text-align: left;">
                <div class="uppercase">National Health Card</div>
                <div class="italic" style="font-size: 4.5pt; color: #475569;">ID: ${driver.id.slice(0, 8)}</div>
              </div>
            </div>
            
            <div style="display: flex; padding: 2mm 4mm 0; gap: 3.5mm;">
              <div class="flex-col items-center">
                <div class="photo-box">
                  ${driver.photo_url ? `<img src="${driver.photo_url}" />` : '<div style="background: #f8fafc; height: 100%;"></div>'}
                  <div class="blood-tag">BT: ${driver.blood_type || 'O+'}</div>
                </div>
                <div style="margin-top: 2mm; background: white; padding: 1mm; border: 0.1mm solid #f1f5f9;">
                  <div id="qrcode-front"></div>
                </div>
              </div>
              
              <div style="flex: 1; padding-top: 1mm;">
                <div class="info-grid">
                  <div class="flex-col">
                    <div style="font-size: 4.5pt; color: #94a3b8; font-weight: bold;">نام مکمل راننده</div>
                    <div style="font-size: 9pt; font-weight: bold; line-height: 1;">${driver.name}</div>
                  </div>
                  <div class="flex-col">
                    <div style="font-size: 4.5pt; color: #94a3b8; font-weight: bold;">نام پدر</div>
                    <div style="font-size: 7.5pt; font-weight: bold; color: #334155;">${driver.father_name || '---'}</div>
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2mm;">
                    <div class="flex-col">
                      <div style="font-size: 4.5pt; color: #94a3b8; font-weight: bold;">نمبر جواز</div>
                      <div style="font-size: 6.5pt; font-weight: bold; font-family: monospace;">${driver.license_number}</div>
                    </div>
                    <div class="flex-col">
                      <div style="font-size: 4.5pt; color: #94a3b8; font-weight: bold;">پلاک موتر</div>
                      <div style="font-size: 6.5pt; font-weight: bold;">${driver.license_plate}</div>
                    </div>
                  </div>
                  <div class="divider">
                    <div class="flex-col">
                      <div style="font-size: 4.5pt; color: #94a3b8; font-weight: bold;">تاریخ صدور</div>
                      <div style="font-size: 6pt; font-weight: bold;">${new Date(card.issue_date).toLocaleDateString('fa-AF')}</div>
                    </div>
                    <div class="flex-col">
                      <div style="font-size: 4.5pt; color: #f43f5e; font-weight: bold;">تاریخ انقضا</div>
                      <div style="font-size: 6pt; font-weight: bold; color: #be123c;">${new Date(card.expiry_date).toLocaleDateString('fa-AF')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style="page-break-after: always;"></div>

          <!-- BACK SIDE -->
          <div class="card">
            <div style="padding: 4mm; height: 100%; display: flex; flex-direction: column;">
              <div style="border-bottom: 0.1mm solid #f1f5f9; padding-bottom: 1mm; font-size: 6pt; font-weight: bold; display: flex; items-center: center; gap: 2mm;">
                مقررات و شرایط استفاده (Health Regulations)
              </div>
              <div style="flex: 1; padding: 2mm 0; display: flex; flex-direction: column; gap: 2mm;">
                <div style="font-size: 5pt; color: #475569;">ماده ۱: این کارت تاییدیه رسمی وضعیت سلامت راننده جهت فعالیت در سیستم حمل و نقل است.</div>
                <div style="font-size: 5pt; color: #475569;">ماده ۲: راننده متعهد می‌گردد در صورت بروز هرگونه عارضه صحی، به مراکز تایید شده مراجعه نماید.</div>
                <div style="font-size: 5pt; color: #475569;">ماده ۳: جعل این کارت پیگرد قانونی داشته و منجر به ابطال جواز خواهد شد.</div>
                <div style="font-size: 5pt; color: #475569;">ماده ۴: اعتبار این کارت تنها با استعلام از پایگاه داده مرکزی ANDHP قابل تایید است.</div>
              </div>
              <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end;">
                <div style="font-size: 6.5pt; font-weight: bold; color: #2563eb; font-family: monospace;">www.andhp.gov.af</div>
                <div style="width: 20mm; height: 10mm; border: 0.1mm dashed #e2e8f0;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Inject QR Code using the same library logic -->
        <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
        <script>
          function generateQR() {
            var qr = qrcode(0, 'H');
            qr.addData('${window.location.origin}/verify/${card.id}');
            qr.make();
            document.getElementById('qrcode-front').innerHTML = qr.createSvgTag(1.8);
            
            // Wait for images to load, then print
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.parent.postMessage('close-print', '*');
              }, 500);
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
