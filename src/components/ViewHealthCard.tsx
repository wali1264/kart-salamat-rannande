import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, User } from 'lucide-react';
import { Driver, HealthCard, AppSettings } from '../types';
import { renderToString } from 'react-dom/server';
import { supabase } from '../lib/supabase';
import { useSystem } from '../contexts/SystemContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  driver: Driver;
  card: HealthCard;
  autoPrint?: boolean;
}

export const ViewHealthCard: React.FC<Props> = ({ isOpen, onClose, driver, card, autoPrint = false }) => {
  const { isTeacherMode } = useSystem();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  
  React.useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      const customization = {
        title_primary_dr: data?.card_front_text_dari || 'د افغانستان اسلامی امارت',
        title_primary_ps: data?.card_front_text_pashto || 'امارت اسلامی افعانستان',
        title_primary_en: data?.card_front_text_english || 'Islamic Emirate of Afghanistan',
        title_secondary_dr: data?.card_back_text_dari || (isTeacherMode ? 'مدیریت منابع بشری' : 'مکتب هوشمند افغان-افغان'),
        title_card_ps: isTeacherMode ? 'د ښوونکي د هویت کارت' : 'د زده کوونکي د هویت کارت',
        title_card_dr: isTeacherMode ? 'کارت هویت معلم' : 'کارت هویت شاگرد',
        title_card_en: isTeacherMode ? 'Teacher Identity Card' : 'Student Identity Card',
        footer_en: data?.school_name_dept || 'Islamic Emirate of Afghanistan / Ministry of Education (MoE)',
        regulations_ps: isTeacherMode ? [
          'دا کارت د ښوونکي د رسمي هویت او مراجعې یوازینۍ معتبره نښه ده.',
          'ښوونکی مکلف دی چې د ښوونځي ټول اکاډمیک او اداري اصول مراعات کړي.',
          'هر ډول غیر قانوني ګټه اخیستنه له دې کارټ څخه د مسؤلیت سبب ګرځي.'
        ] : [
          'دا کارت د ښوونځي په سیسټم کې د فعالیت لپاره د زده کوونکي د هویت رسمي تاییدیه ده.',
          'زده کوونکی مکلف دی چې په ښوونځي کې د ټاکل شویو مقرراتو او انضباطي اصولو مراعات وکړي.',
          'دغه کارت یوازې د ټاکل شوې ښوونیزې دورې پورې اعتبار لري.'
        ],
        regulations_dr: isTeacherMode ? [
          'این کارت تنها مدرک معتبر جهت شناسایی رسمی استاد در محیط آموزشی می‌باشد.',
          'استاد موظف است تمامی شئون اخلاقی و اداری مکتب را رعایت نماید.',
          'در صورت مفقود شدن کارت، مراتب را فوراً به بخش اداری اطلاع دهید.'
        ] : [
          'این کارت تاییدیه رسمی هویت شاگرد جهت فعالیت در محیط مکتب است.',
          'شاگرد متعهد می‌گردد تمامی مقررات انضباطی و آموزشی مکتب را به طور کامل رعایت نماید.',
          'این کارت صرفاً تا تاریخ انقضای مندرج در آن (پایان سال تحصیلی) اعتبار دارد.'
        ]
      };
      
      setSettings({
        id: 'db',
        main_logo_url: data?.card_logo_main || undefined,
        mini_logo_url: data?.card_logo_mini || undefined,
        customization
      });
    } catch (err) {
      console.error('Error fetching settings for card from Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (isOpen && autoPrint && !loading) {
      handlePrint();
    }
  }, [isOpen, autoPrint, loading]);

  const handlePrint = () => {
    if (!settings) return;
    const { customization } = settings;
    if (!customization) return;

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
            top: 2.2mm;
            left: 10.5mm; 
            width: 34mm;
            display: flex;
            flex-direction: column;
            gap: 0.1mm;
            text-align: center;
            align-items: center;
          }

          .main-logo-container {
            position: absolute;
            top: 3.2mm;
            left: 42.5mm; /* Fixed position */
            width: 14mm;
            height: 14mm;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .main-logo-container img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
          }

          .mini-logo-container {
            position: absolute;
            top: 3.5mm;
            left: 3.5mm; /* Shifted slightly for balance */
            width: 6.5mm;
            height: 6.5mm;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .mini-logo-container img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
          }
          
          .title-afg { font-size: 5.5pt; font-weight: 800; color: #1a365d; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .title-afg-ps { font-size: 5.0pt; color: #333; font-weight: 600; margin: 0.1mm 0; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .title-en-ie { font-size: 4.2pt; color: #666; text-transform: uppercase; margin-bottom: 0.8mm; font-weight: 500; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          
          .title-card-type { 
            position: absolute;
            top: 15.2mm;
            left: 10.5mm; /* Exactly aligned with header */
            width: 34mm; /* Exactly aligned with header */
            height: 6.8mm;
            color: #1a365d; 
            text-align: center;
            border-top: 0.15mm solid rgba(26,54,93,0.3);
            border-bottom: 0.15mm solid rgba(26,54,93,0.3);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 0.1mm;
            z-index: 5;
            white-space: nowrap;
          }
          
          .title-card-type .ps { font-size: 5.2pt; font-weight: 800; line-height: 1.1; overflow: hidden; text-overflow: ellipsis; }
          .title-card-type .dr { font-size: 4.8pt; font-weight: 600; line-height: 1.1; overflow: hidden; text-overflow: ellipsis; }
          .title-card-type .en { font-size: 3.8pt; font-weight: 500; line-height: 1.1; text-transform: uppercase; letter-spacing: 0.1mm; color: #666; overflow: hidden; text-overflow: ellipsis; }
          
          .info-section {
            position: absolute;
            top: 22.5mm;
            right: 32mm;
            left: 23mm;
            display: flex;
            flex-direction: column;
            gap: 4.2mm;
            z-index: 10;
          }
          
          .info-block { display: flex; flex-direction: column; align-items: flex-start; text-align: right; width: 100%; }
          .info-label { 
            font-size: 5.2pt; 
            color: #1a365d; 
            font-weight: 700; 
            display: flex;
            flex-direction: column;
            gap: 0.2mm;
            margin-bottom: 0.8mm;
            line-height: 1;
          }
          .info-label span:last-child {
            font-size: 3.8pt;
            color: #777;
            font-weight: 500;
            text-transform: uppercase;
          }
          .info-value { 
            font-size: 9.5pt; 
            font-weight: 700; 
            color: #111; 
            line-height: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
          }
          
          .technical-panel {
            position: absolute;
            bottom: 3.5mm;
            right: 4.5mm;
            width: 25mm;
            display: flex;
            flex-direction: column;
            gap: 1.8mm;
          }
          
          .tech-item {
            display: flex;
            flex-direction: column;
            border-right: 0.8mm solid #1a365d;
            padding-right: 2.2mm;
          }
          
          .tech-label { 
            font-size: 4.2pt; 
            color: #1a365d; 
            font-weight: 800; 
            margin-bottom: 0.5mm;
            display: flex;
            justify-content: space-between;
          }
          .tech-label span:last-child { font-size: 3.5pt; color: #888; font-weight: 500; }
          
          .tech-value { font-size: 7.2pt; font-weight: bold; color: #111; }
          .tech-date { font-size: 5.8pt; font-weight: bold; }
          
          .qr-container {
            position: absolute;
            bottom: 4mm;
            left: 4.5mm;
            width: 17.5mm;
            height: 17.5mm;
            background: #fff;
            padding: 0.8mm;
            border: 0.1mm solid #ddd;
            z-index: 20;
          }
          
          .serial-no {
            position: absolute;
            bottom: 1.5mm;
            left: 23mm;
            font-size: 5.8pt;
            color: #000;
            font-weight: 700;
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
            
            ${settings?.mini_logo_url ? `<div class="mini-logo-container"><img src="${settings.mini_logo_url}" alt="Mini Logo" /></div>` : ''}
            ${settings?.main_logo_url ? `<div class="main-logo-container"><img src="${settings.main_logo_url}" alt="Main Logo" /></div>` : ''}

            <div class="card-header-titles">
              <div class="title-afg">${customization.title_primary_dr}</div>
              <div class="title-afg-ps">${customization.title_primary_ps}</div>
              <div class="title-en-ie">${customization.title_primary_en}</div>
              <div style="font-size: 4.5pt; color: #1a365d; font-weight: 700; margin-top: 0.4mm; border-top: 0.1mm solid #eee; padding-top: 0.3mm; width: 100%; overflow: hidden; text-overflow: ellipsis;">${customization.title_secondary_dr}</div>
            </div>

            <div class="title-card-type">
              <div class="ps">${customization.title_card_ps}</div>
              <div class="dr">${customization.title_card_dr}</div>
              <div class="en">${customization.title_card_en}</div>
            </div>

            <div class="driver-photo-frame">
              ${driver.photo_url ? `<img src="${driver.photo_url}" />` : ''}
            </div>

            <div class="info-section">
              <div class="info-block">
                <div class="info-label">
                  <span>${isTeacherMode ? 'نام معلم' : 'نام شاگرد'}</span>
                  <span>${isTeacherMode ? 'Teacher Name' : 'Student Name'}</span>
                </div>
                <div class="info-value">${driver.name}</div>
              </div>
              
              <div class="info-block">
                <div class="info-label">
                  <span>نام پدر</span>
                  <span>Father Name</span>
                </div>
                <div class="info-value" style="font-size: 8.5pt;">${driver.father_name || '---'}</div>
              </div>
            </div>

            <!-- Side technical panel under the photo -->
            <div class="technical-panel">
               <div class="tech-item">
                  <div class="tech-label"><span>${isTeacherMode ? 'دیپارتمنت / بخش' : 'بخش / شعبه'}</span><span>${isTeacherMode ? 'Department' : 'Section'}</span></div>
                  <div class="tech-value">${driver.license_plate}</div>
               </div>
               <div class="tech-item">
                  <div class="tech-label"><span>${isTeacherMode ? 'کد شناسایی' : 'نمبر اساس'}</span><span>${isTeacherMode ? 'ID No' : 'Roll No'}</span></div>
                  <div class="tech-value" style="font-size: 6.5pt; font-family: monospace;">${driver.license_number}</div>
               </div>
               ${!isTeacherMode ? `
               <div class="tech-item">
                  <div class="tech-label"><span>صنف</span><span>Grade</span></div>
                  <div class="tech-value" style="font-size: 7pt; font-weight: bold;">${driver.vehicle_type}</div>
               </div>` : ''}
               ${driver.blood_type && driver.blood_type !== 'نامعلوم' ? `
               <div class="tech-item">
                  <div class="tech-label"><span>د وینې نوعه</span><span>BT</span></div>
                  <div class="tech-value" style="font-size: 6.5pt;">${driver.blood_type}</div>
               </div>` : ''}
            </div>

            <div class="qr-container" id="qrcode-front"></div>
            <div class="serial-no">S/N: ${driver.id.slice(0, 12).toUpperCase()}</div>
            <div style="position: absolute; bottom: 1.5mm; right: 4.5mm; font-size: 5.2pt; color: #444; font-weight: 600; text-align: right;">
              د تذکرې شمېره / نمبر تذکره: (${driver.id_number || '---'})
            </div>
          </div>

          <!-- BACK SIDE -->
          <div class="card">
            <div class="security-mesh"></div>
            <div style="padding: 4mm; display: flex; flex-direction: column; height: 100%; box-sizing: border-box;">
              <div style="display: flex; align-items: center; justify-content: center; gap: 2mm; border-bottom: 0.2mm solid #1a365d; padding-bottom: 1.5mm; margin-bottom: 3mm;">
                <span style="font-size: 5.8pt; font-weight: 800; color: #1a365d; text-transform: uppercase;">Regulations / مقررات استفاده / د استفادې مقررات</span>
              </div>
              
              <div style="display: flex; flex-direction: column; gap: 1.5mm;">
                <!-- Customized Regulations -->
                <div style="display: flex; flex-direction: column; gap: 0.8mm; border-bottom: 0.1mm solid #f0f0f0; padding-bottom: 1mm; margin-bottom: 1mm;">
                  ${customization.regulations_ps.map((reg: string, idx: number) => `
                    <div style="font-size: 4.5pt; line-height: 1.2; color: #1a365d; display: flex; gap: 1.2mm; font-weight: 600;">
                      <span style="color: #c00; font-weight: 800;">${idx + 1}.</span>
                      <span>${reg}</span>
                    </div>
                  `).join('')}
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.8mm;">
                  ${customization.regulations_dr.map((reg: string, idx: number) => `
                    <div style="font-size: 4.5pt; line-height: 1.2; color: #222; display: flex; gap: 1.2mm;">
                      <span style="color: #1a365d; font-weight: 800;">${idx + 1}.</span>
                      <span>${reg}</span>
                    </div>
                  `).join('')}
                </div>
              </div>

              <div style="margin-top: auto; display: flex; justify-content: center; border-top: 0.1mm solid #eee; padding-top: 2mm; text-align: center;">
                <span style="font-size: 3.8pt; color: #666; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1mm; line-height: 1.2;">${customization.footer_en}</span>
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
