import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Search, DollarSign, Calendar, TrendingUp, User, Users, X, Info, CheckCircle2, History, TrendingDown, ShieldCheck, PlusCircle, Calculator, AlertCircle, Edit3, Trash2, Filter, ChevronLeft, ChevronRight, Download, Printer, FileText, Table, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { useAuth } from '../../contexts/AuthContext';
import { useSystem } from '../../contexts/SystemContext';
import { logActivity } from '../../lib/logger';

const AFGHAN_MONTHS = [
  'حمل (Hamal)', 'ثور (Sawr)', 'جوزا (Jawza)', 
  'سرطان (Saratan)', 'اسد (Asad)', 'سنبله (Sunbola)', 
  'میزان (Mizan)', 'عقرب (Aqrab)', 'قوس (Qaws)', 
  'جدی (Jadi)', 'دلو (Dalw)', 'حوت (Hut)'
];

const YEARS = Array.from({ length: 11 }, (_, i) => (1402 + i).toString());

export const FinancialManagement: React.FC = () => {
  const { user } = useAuth();
  const { mode, isTeacherMode } = useSystem();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [displayLimit, setDisplayLimit] = useState(5);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [historyStudent, setHistoryStudent] = useState<any | null>(null);
  const [editingPayment, setEditingPayment] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(AFGHAN_MONTHS[0]);
  const [processing, setProcessing] = useState(false);
  
  // Inline Editing State
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineAmount, setInlineAmount] = useState<string>('');
  const [inlineProcessing, setInlineProcessing] = useState(false);
  const [taxSettings, setTaxSettings] = useState({ threshold: 500, rate: 5 });
  const [systemSettings, setSystemSettings] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters for History Modal
  const [historyMonthFilter, setHistoryMonthFilter] = useState<string>('همه ماه ها');
  const [historyYearFilter, setHistoryYearFilter] = useState<string>(YEARS[0]);

  useEffect(() => {
    fetchFees();
    fetchSystemSettings();
  }, [mode]);

  const fetchSystemSettings = async () => {
    const { data } = await supabase.from('system_settings').select('*').eq('id', '00000000-0000-0000-0000-000000000000').single();
    if (data) {
      setSystemSettings(data);
      if (isTeacherMode) {
        // Teacher tax settings from system settings if they exist, or defaults
        setTaxSettings({ 
          threshold: data.teacher_tax_threshold || 5000, 
          rate: data.teacher_tax_rate || 10 
        });
      } else {
        setTaxSettings({ 
          threshold: data.fee_tax_threshold || 500, 
          rate: data.fee_tax_rate || 5 
        });
      }
    }
  };

  const fetchFees = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          fee_payments (
            id,
            for_month,
            amount_paid,
            payment_date,
            tax_amount,
            net_amount,
            balance_remaining,
            notes
          )
        `)
        .eq('type', mode);
      
      if (error) throw error;
      setRecords(data || []);
      
      // Update history student if modal is open
      if (historyStudent) {
        const updated = (data || []).find(s => s.id === historyStudent.id);
        if (updated) setHistoryStudent(updated);
      }
    } catch (err: any) {
      console.error('Error fetching fees:', err);
      setError(err.message || 'خطا در بارگذاری اطلاعات مالی');
    } finally {
      setLoading(false);
    }
  };

  const calculateTax = (amount: number) => {
    if (amount <= taxSettings.threshold) return 0;
    const taxable = amount - taxSettings.threshold;
    return (taxable * taxSettings.rate) / 100;
  };

  const handlePayment = async () => {
    if (!selectedStudent || !paymentAmount) return;
    
    setProcessing(true);
    const amount = parseFloat(paymentAmount);
    const tax = calculateTax(amount);
    const netAmount = amount - tax;

    try {
      if (editingPayment) {
        // Update existing record
        const { error } = await supabase
          .from('fee_payments')
          .update({
            amount_paid: amount,
            tax_amount: tax,
            net_amount: netAmount,
            for_month: selectedMonth,
            balance_remaining: Math.max(0, (selectedStudent.total_monthly_fee || 0) - amount)
          })
          .eq('id', editingPayment.id);

        if (error) throw error;

        if (user?.email) {
          await logActivity(
            user.email, 
            'payment', 
            `${isTeacherMode ? 'پرداخت حقوق معلم' : 'پرداخت فیس شاگرد'} ${selectedStudent.name} بابت ماه ${selectedMonth} به مبلغ ${amount} افغانی (ویرایش شده) ثبت گردید.`,
            { payment_id: editingPayment.id, student_id: selectedStudent.id }
          );
        }
      } else {
        // Insert new record
        const { data: insertData, error } = await supabase
          .from('fee_payments')
          .insert([{
            student_id: selectedStudent.id,
            amount_paid: amount,
            tax_amount: tax,
            net_amount: netAmount,
            for_month: selectedMonth,
            payment_date: new Date().toISOString(),
            payment_method: 'نقدی',
            balance_remaining: Math.max(0, (selectedStudent.total_monthly_fee || 0) - amount)
          }])
          .select()
          .single();

        if (error) throw error;

        if (user?.email) {
          await logActivity(
            user.email, 
            'payment', 
            `${isTeacherMode ? 'پرداخت حقوق معلم' : 'پرداخت فیس شاگرد'} ${selectedStudent.name} بابت ماه ${selectedMonth} به مبلغ ${amount} افغانی ثبت گردید.`,
            { payment_id: insertData?.id, student_id: selectedStudent.id }
          );
        }
      }
      
      setPaymentAmount('');
      setSelectedStudent(null);
      setEditingPayment(null);
      fetchFees();
    } catch (err) {
      console.error('Error processing payment:', err);
      alert('خطا در ثبت اطلاعات. لطفا دوباره تلاش کنید.');
    } finally {
      setProcessing(false);
    }
  };

  const startEditingInPlace = (p: any) => {
    setInlineEditingId(p.id);
    setInlineAmount(p.amount_paid.toString());
  };

  const handleInlineSave = async (p: any) => {
    if (!inlineAmount || inlineProcessing) return;
    setInlineProcessing(true);
    
    try {
      const amount = parseFloat(inlineAmount);
      const tax = calculateTax(amount);
      const netAmount = amount - tax;
      const monthlyFee = historyStudent?.total_monthly_fee || 0;

      const { error } = await supabase
        .from('fee_payments')
        .update({
          amount_paid: amount,
          tax_amount: tax,
          net_amount: netAmount,
          balance_remaining: Math.max(0, monthlyFee - amount)
        })
        .eq('id', p.id);

      if (error) throw error;
      
      setInlineEditingId(null);
      fetchFees();
    } catch (err) {
      console.error('Inline update failed:', err);
      alert('خطا در بروزرسانی مبلغ');
    } finally {
      setInlineProcessing(false);
    }
  };

  const handleInlineCancel = () => {
    setInlineEditingId(null);
    setInlineAmount('');
  };

  const exportToExcel = () => {
    if (!historyStudent || !historyStudent.fee_payments) return;
    const data = historyStudent.fee_payments.map((p: any) => ({
      [isTeacherMode ? 'نام معلم' : 'نام شاگرد']: historyStudent.name,
      'ماه': p.for_month,
      [isTeacherMode ? 'حقوق پرداختی' : 'مبلغ پرداختی']: p.amount_paid,
      'مالیات': p.tax_amount,
      'مبلغ خالص': p.net_amount,
      'تاریخ پرداخت': new Date(p.payment_date).toLocaleDateString('fa-AF'),
      'باقی‌مانده': p.balance_remaining
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, isTeacherMode ? 'تاریخچه حقوق' : 'تاریخچه فیس');
    XLSX.writeFile(workbook, `${historyStudent.name}_History.xlsx`);
  };

  const printHistory = () => {
    // Before printing, ensure the hidden element is visible for the media query
    const element = document.getElementById('printable-invoice');
    if (!element) return;
    
    // Force visibility for printing
    const originalDisplay = element.style.display;
    const originalVisibility = element.style.visibility;
    const originalPosition = element.style.position;
    
    element.style.setProperty('display', 'block', 'important');
    element.style.setProperty('visibility', 'visible', 'important');
    element.style.setProperty('position', 'fixed', 'important');
    element.style.top = '0';
    element.style.left = '0';
    element.style.width = '100%';
    element.style.height = 'auto';
    element.style.zIndex = '9999999';
    
    // Small delay to allow the browser to process the visual change before the print dialog opens
    setTimeout(() => {
      window.print();
      // Restore state after print dialog is closed
      element.style.display = originalDisplay;
      element.style.visibility = originalVisibility;
      element.style.position = originalPosition;
    }, 150);
  };

  const deletePayment = async (paymentId: string) => {
    if (!window.confirm(`آیا از حذف این تراکنش مطمئن هستید؟ این عمل وضعیت ${isTeacherMode ? 'معاش استاد' : 'فیس شاگرد'} را تغییر می‌دهد.`)) return;
    try {
      const { error } = await supabase.from('fee_payments').delete().eq('id', paymentId);
      if (error) throw error;
      fetchFees();
    } catch (err) {
      alert('خطا در حذف تراکنش');
    }
  };

  const filteredStudents = records.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.father_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.student_id_no && s.student_id_no.includes(searchQuery))
  );

  const displayedStudents = filteredStudents.slice(0, displayLimit);

  const getTotalStats = () => {
    let totalRevenue = 0;
    let totalTax = 0;
    let thisYearRevenue = 0;
    let thisYearTax = 0;
    
    const currentYear = new Date().getFullYear();

    records.forEach(s => {
      s.fee_payments?.forEach((p: any) => {
        const paymentDate = new Date(p.payment_date);
        totalRevenue += p.amount_paid;
        totalTax += (p.tax_amount || 0);
        
        if (paymentDate.getFullYear() === currentYear) {
          thisYearRevenue += p.amount_paid;
          thisYearTax += (p.tax_amount || 0);
        }
      });
    });
    return { totalRevenue, totalTax, thisYearRevenue, thisYearTax };
  };

  const stats = getTotalStats();

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10 flex flex-col h-full">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{isTeacherMode ? 'مدیریت مالی و معاشات اساتید' : 'مدیریت مالی و فیس شاگردان'}</h2>
          <p className="text-slate-500 text-sm">{isTeacherMode ? 'ثبت معاشات، محاسبه مالیات و گزارش عواید سالانه' : 'ثبت پرداخت‌ها، محاسبه مالیات و گزارش عواید سالانه'}</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1">
            <p className="text-[9px] font-bold text-slate-400 uppercase">{isTeacherMode ? 'مجموع معاشات (کل)' : 'مجموع عواید (کل)'}</p>
            <p className="text-lg font-black text-slate-800">{stats.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1">
            <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">{isTeacherMode ? 'معاشات سال جاری' : 'عواید سال جاری'}</p>
            <p className="text-lg font-black text-emerald-600">{stats.thisYearRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1">
            <p className="text-[9px] font-bold text-slate-400 uppercase">مجموع مالیات (کل)</p>
            <p className="text-lg font-black text-slate-800">{stats.totalTax.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm flex flex-col gap-1 bg-blue-50/30">
            <p className="text-[9px] font-bold text-blue-600 uppercase tracking-tighter">مالیات سال جاری (امارت)</p>
            <p className="text-lg font-black text-blue-700">{stats.thisYearTax.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
        <div className="lg:col-span-8 flex flex-col min-h-0">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20 overflow-hidden flex flex-col flex-1">
            <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                {isTeacherMode ? 'لیست معلمین و وضعیت حقوق' : 'لیست شاگردان و وضعیت فیس'}
              </h3>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder={isTeacherMode ? "جستجوی معلم..." : "جستجوی شاگرد..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl py-2 pr-10 pl-4 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 transition-all w-full md:w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-right">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100">
                    <th className="px-6 py-4">{isTeacherMode ? 'معلومات معلم' : 'معلومات شاگرد'}</th>
                    <th className="px-6 py-4">{isTeacherMode ? 'رتبه / بست' : 'صنف / بخش'}</th>
                    <th className="px-6 py-4">{isTeacherMode ? 'حقوق ماهانه' : 'فیس ماهانه'}</th>
                    <th className="px-6 py-4">{isTeacherMode ? 'آخرین دریافتی' : 'آخرین پرداخت'}</th>
                    <th className="px-6 py-4">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayedStudents.map(student => {
                    const payments = student.fee_payments || [];
                    const lastPayment = payments.length > 0 
                      ? [...payments].sort((a:any, b:any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0]
                      : null;

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold overflow-hidden border border-slate-100">
                              {student.photo_url ? <img src={student.photo_url} className="w-full h-full object-cover" /> : student.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{student.name}</p>
                              <p className="text-[10px] text-slate-500">فرزند {student.father_name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold border border-blue-100">
                            {student.class_name || 'نامعلوم'} - {student.license_plate || 'بخش'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-700">{student.total_monthly_fee?.toLocaleString() || 0} <span className="text-[10px] opacity-50">افغانی</span></p>
                        </td>
                        <td className="px-6 py-4">
                          {lastPayment ? (
                            <div>
                              <p className="text-xs font-bold text-slate-800">{lastPayment.amount_paid.toLocaleString()} افغانی</p>
                              <p className="text-[10px] text-emerald-500 font-bold">بابت ماه {lastPayment.for_month}</p>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-300">بدون تاریخچه</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setHistoryStudent(student)}
                              className="p-2.5 bg-slate-50 hover:bg-white text-slate-400 hover:text-indigo-600 rounded-xl transition-all border border-slate-100 hover:border-indigo-200 hover:shadow-md active:scale-95"
                              title="مشاهده تاریخچه و فیلترها"
                            >
                              <History className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => setSelectedStudent(student)}
                              className="p-2.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-xl transition-all group shadow-sm border border-blue-100 active:scale-95"
                              title="ثبت پرداخت جدید"
                            >
                              <PlusCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  
                  {error && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <div className="bg-rose-50 text-rose-600 p-6 rounded-3xl border border-rose-100 max-w-md mx-auto">
                          <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                          <p className="font-bold mb-2">خطا در ارتباط با سرور</p>
                          <p className="text-xs leading-relaxed opacity-80">{error}</p>
                          <button 
                            onClick={() => fetchFees()}
                            className="mt-4 px-6 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all"
                          >
                            تلاش مجدد
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {!error && loading && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-400 text-sm">در حال دریافت اطلاعات مالی...</p>
                      </td>
                    </tr>
                  )}
                  {!error && !loading && filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <p className="text-slate-400 text-sm italic">{isTeacherMode ? 'استادی با این مشخصات یافت نشد.' : 'شاگردی با این مشخصات یافت نشد.'}</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination / Load More */}
            {displayLimit < filteredStudents.length && (
              <div className="p-6 border-t border-slate-50 text-center print:hidden">
                <button 
                  onClick={() => setDisplayLimit(prev => prev + 5)}
                  className="px-8 py-3 bg-slate-50 hover:bg-white text-slate-500 font-bold text-xs rounded-2xl transition-all border border-slate-100 hover:shadow-md active:scale-95 flex items-center gap-2 mx-auto"
                >
                  <ChevronDown className="w-4 h-4" />
                  نمایش موارد بیشتر ({filteredStudents.length - displayLimit})
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pr-1">
          <AnimatePresence mode="wait">
            {selectedStudent ? (
              <motion.div 
                key="payment-form"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[2rem] border border-blue-200 shadow-2xl shadow-blue-500/10 p-8 space-y-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    {editingPayment ? (isTeacherMode ? 'ویرایش معاش قبلی' : 'ویرایش فیس قبلی') : (isTeacherMode ? 'ثبت معاش جدید' : 'ثبت فیس جدید')}
                  </h3>
                  <button onClick={() => { setSelectedStudent(null); setEditingPayment(null); setPaymentAmount(''); }} className="bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 p-2 rounded-xl transition-colors">
                     <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100/50">
                  <p className="text-[10px] font-bold text-blue-400 uppercase mb-3 text-right">{isTeacherMode ? 'استاد انتخاب شده:' : 'شاگرد انتخاب شده:'}</p>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-blue-600 font-bold border border-blue-100 shadow-sm overflow-hidden">
                      {selectedStudent.photo_url ? <img src={selectedStudent.photo_url} className="w-full h-full object-cover" /> : selectedStudent.name.charAt(0)}
                    </div>
                    <div className="text-right">
                      <h4 className="font-bold text-slate-800 text-lg leading-none mb-1">{selectedStudent.name}</h4>
                      <p className="text-xs text-slate-500">{isTeacherMode ? 'بست' : 'صنف'} {selectedStudent.class_name} ({isTeacherMode ? 'دیپارتمنت' : 'بخش'} {selectedStudent.license_plate})</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 mr-2 uppercase tracking-widest block text-right">{isTeacherMode ? 'انتخاب ماه معاش (Afghan Months)' : 'انتخاب ماه پرداخت (Afghan Months)'}</label>
                    <select 
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-slate-700 appearance-none text-right cursor-pointer"
                      dir="rtl"
                    >
                      {AFGHAN_MONTHS.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 mr-2 uppercase tracking-widest block text-right">{isTeacherMode ? 'مبلغ معاش (افغانی)' : 'مبلغ پرداختی (افغانی)'}</label>
                    <div className="relative">
                      <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="number"
                        required
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="مبلغ را وارد کنید..."
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 pr-12 pl-6 text-2xl font-black text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-right"
                      />
                    </div>
                  </div>

                  {paymentAmount && parseFloat(paymentAmount) > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 bg-slate-900 rounded-3xl text-white space-y-4 shadow-xl"
                    >
                      <div className="flex items-center justify-between text-xs opacity-70">
                        <span>مالیات ({calculateTax(parseFloat(paymentAmount)) > 0 ? taxSettings.rate : 0}%):</span>
                        <span className="font-bold">{calculateTax(parseFloat(paymentAmount)).toLocaleString()} AFN</span>
                      </div>
                      <div className="flex items-center justify-between text-xl font-black border-t border-white/10 pt-4">
                        <span className="text-sm opacity-70">{isTeacherMode ? 'خالص معاش:' : 'خالص عواید:'}</span>
                        <span>{(parseFloat(paymentAmount) - calculateTax(parseFloat(paymentAmount))).toLocaleString()} <span className="text-[10px] font-normal opacity-50">افغانی</span></span>
                      </div>
                      <p className="text-[10px] text-blue-400 leading-relaxed italic border-t border-white/5 pt-3">
                        {parseFloat(paymentAmount) >= (selectedStudent.total_monthly_fee || 0)
                          ? (isTeacherMode ? '✔️ تبریک! این مبلغ تمام معاش این ماه استاد را تسویه می‌کند.' : '✔️ تبریک! این مبلغ تمام فیس این ماه شاگرد را تسویه می‌کند.') 
                          : `⚠️ هشدار: مبلغ ${( (selectedStudent.total_monthly_fee || 0) - parseFloat(paymentAmount)).toLocaleString()} افغانی از ${isTeacherMode ? 'معاش' : 'فیس'} این ماه باقی می‌ماند.`}
                      </p>
                    </motion.div>
                  )}

                  <button 
                    disabled={!paymentAmount || processing}
                    onClick={handlePayment}
                    className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-bold flex items-center justify-center gap-3 shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:grayscale active:scale-95"
                  >
                    {processing ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <CheckCircle2 className="w-6 h-6" />
                        {editingPayment ? 'بروزرسانی تغییرات' : (isTeacherMode ? 'تایید و ثبت نهایی معاش' : 'تایید و ثبت نهایی پرداخت')}
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-[2rem] border-2 border-dashed border-slate-100 p-12 text-center flex flex-col items-center justify-center gap-6"
              >
                <div className="p-8 bg-slate-50 text-slate-200 rounded-[2.5rem]">
                  <Calculator className="w-20 h-20" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-xl mb-2">{isTeacherMode ? 'ثبت معاش جدید' : 'پرداخت فیس جدید'}</p>
                  <p className="text-slate-400 text-xs px-6 leading-relaxed">
                    {isTeacherMode 
                      ? 'جهت ثبت معاش ماهوار اساتید، ابتدا نام یا کد استاد را از لیست سمت راست پیدا کرده و روی آیکون پلس کلیک نمایید.'
                      : 'جهت ثبت فیس ماهواره شاگردان، ابتدا نام یا کد شاگرد را از لیست سمت راست پیدا کرده و روی آیکون پلس کلیک نمایید.'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Advanced History Modal */}
      <AnimatePresence>
        {historyStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHistoryStudent(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              className="relative w-full max-w-5xl bg-white rounded-[2rem] md:rounded-[3.5rem] shadow-3xl overflow-hidden flex flex-col max-h-[92vh] border border-white"
            >
              {/* Modal Header */}
              <div className="p-6 md:p-10 border-b border-slate-50 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8">
                 <div className="flex items-center gap-4 md:gap-6">
                    <div className="relative shrink-0">
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-[1.4rem] md:rounded-[1.8rem] bg-indigo-600 text-white flex items-center justify-center text-3xl font-black shadow-2xl shadow-indigo-100 overflow-hidden ring-4 ring-white">
                        {historyStudent.photo_url ? <img src={historyStudent.photo_url} className="w-full h-full object-cover" /> : historyStudent.name.charAt(0)}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 md:w-8 md:h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                         <ShieldCheck className="w-3 md:w-4 h-3 md:h-4" />
                      </div>
                    </div>
                    <div className="text-right">
                       <h3 className="text-xl md:text-3xl font-black text-slate-800 leading-tight">{isTeacherMode ? 'تاریخچه تخصصی معاشات' : 'تاریخچه تخصصی مالی'}</h3>
                       <p className="text-slate-500 font-bold text-[10px] md:text-sm mt-1">{isTeacherMode ? 'استاد' : 'شاگرد'}: {historyStudent.name} / {isTeacherMode ? 'بست' : 'صنف'} {historyStudent.class_name}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="flex bg-white rounded-2xl border border-slate-100 p-1 shadow-sm">
                       <button onClick={exportToExcel} className="p-2.5 md:p-3 text-slate-400 hover:text-emerald-500 transition-colors" title="Download Excel">
                          <Table className="w-5 h-5" />
                       </button>
                       <button onClick={printHistory} className="p-2.5 md:p-3 text-slate-400 hover:text-blue-600 transition-colors" title="Print History">
                          <Printer className="w-5 h-5" />
                       </button>
                    </div>
                    <button 
                      onClick={() => setHistoryStudent(null)}
                      className="p-3 md:p-4 bg-white text-slate-400 hover:text-rose-600 border border-slate-100 rounded-[1.2rem] shadow-sm transition-all hover:shadow-md active:scale-95"
                    >
                       <X className="w-5 md:w-6 h-5 md:h-6" />
                    </button>
                 </div>
              </div>

              {/* Filter Bar */}
              <div className="px-6 md:px-10 py-4 md:py-6 bg-slate-50/30 border-b border-slate-100 flex flex-wrap items-center gap-4 md:gap-6">
                 <div className="flex items-center gap-4 bg-white px-5 py-2.5 rounded-2xl border border-slate-100 shadow-sm ring-1 ring-slate-50">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <select 
                      value={historyMonthFilter}
                      onChange={(e) => setHistoryMonthFilter(e.target.value)}
                      className="bg-transparent text-[11px] font-black text-slate-800 outline-none cursor-pointer rtl"
                    >
                      <option value="همه ماه ها">همه ماه ها</option>
                      {AFGHAN_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                 </div>

                 <div className="flex items-center gap-4 bg-white px-5 py-2.5 rounded-2xl border border-slate-100 shadow-sm ring-1 ring-slate-50">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <select 
                      value={historyYearFilter}
                      onChange={(e) => setHistoryYearFilter(e.target.value)}
                      className="bg-transparent text-[11px] font-black text-slate-800 outline-none cursor-pointer rtl"
                    >
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                 </div>

                 <div className="mr-auto hidden sm:flex items-center gap-3">
                    <div className="px-5 py-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 flex flex-col items-center">
                       <span className="text-[7px] font-black uppercase opacity-60">{isTeacherMode ? 'کل معاشات دریافتی' : 'کل پرداختی'}</span>
                       <span className="text-xs font-black">{historyStudent.fee_payments?.reduce((s:number, p:any) => s+p.amount_paid, 0).toLocaleString()} <span className="text-[9px] font-normal opacity-50">AFN</span></span>
                    </div>
                 </div>
              </div>

              {/* Transactions List */}
              <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-white">
                 <div className="space-y-4 md:space-y-6">
                    {historyStudent.fee_payments && historyStudent.fee_payments
                      .filter((p: any) => historyMonthFilter === 'همه ماه ها' || p.for_month === historyMonthFilter)
                      .sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
                      .map((p: any) => (
                        <motion.div 
                          layout
                          key={p.id}
                          className="group bg-slate-50/50 hover:bg-white rounded-[1.8rem] md:rounded-[2.5rem] border border-slate-100 hover:border-blue-200 transition-all p-5 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 relative overflow-hidden"
                        >
                           <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-slate-200 group-hover:bg-blue-600 transition-colors" />
                           <div className="flex items-center gap-4 md:gap-6 flex-1">
                              <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-xl md:rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform shrink-0">
                                 <DollarSign className="w-6 h-6 md:w-7 md:h-7" />
                              </div>
                              <div className="text-right flex-1">
                                 <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1">
                                    {inlineEditingId === p.id ? (
                                      <div className="flex items-center gap-2">
                                        <input 
                                          autoFocus
                                          type="number"
                                          value={inlineAmount}
                                          onChange={(e) => setInlineAmount(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleInlineSave(p);
                                            if (e.key === 'Escape') handleInlineCancel();
                                          }}
                                          className="w-32 bg-white border-2 border-blue-400 rounded-xl px-3 py-1 font-black text-slate-800 outline-none text-right text-lg"
                                        />
                                        <button 
                                          onClick={() => handleInlineSave(p)}
                                          disabled={inlineProcessing}
                                          className="text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 transition-colors"
                                        >
                                          ذخیره
                                        </button>
                                        <button 
                                          onClick={handleInlineCancel}
                                          className="text-[10px] font-bold text-slate-400 hover:bg-slate-100 px-2 py-1 rounded-lg border border-slate-100 transition-colors"
                                        >
                                          لغو
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <h4 className="text-xl md:text-2xl font-black text-slate-800">{p.amount_paid.toLocaleString()} AFN</h4>
                                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-500 rounded-full text-[9px] md:text-[10px] font-black">ماه {p.for_month.split(' ')[0]}</span>
                                      </>
                                    )}
                                 </div>
                                 <div className="flex items-center gap-4 text-slate-400 text-[10px] md:text-[11px] font-bold">
                                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3 md:w-3.5 md:h-3.5" /> {new Date(p.payment_date).toLocaleDateString('fa-AF')}</span>
                                 </div>
                              </div>
                           </div>

                           <div className="flex items-center justify-between md:justify-end gap-6 md:gap-10 border-t md:border-t-0 md:border-r border-slate-100 pt-4 md:pt-0 md:pr-6">
                              <div className="text-right">
                                 <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5 md:mb-1">{isTeacherMode ? 'باقی‌مانده معاش' : 'باقی‌مانده فیس'}</p>
                                 <p className={`text-md md:text-lg font-black ${p.balance_remaining <= 0 ? 'text-emerald-500' : 'text-orange-500'}`}>
                                    {p.balance_remaining <= 0 ? (isTeacherMode ? 'تسویه کامل' : 'تسویه ') : `${p.balance_remaining.toLocaleString()} AFN`}
                                 </p>
                              </div>
                              <div className="flex items-center gap-2">
                                 <button 
                                  onClick={() => startEditingInPlace(p)}
                                   className={`p-2.5 md:p-3 transition-all border shadow-sm active:scale-90 rounded-xl md:rounded-2xl ${
                                     inlineEditingId === p.id 
                                       ? 'bg-blue-600 text-white border-blue-600' 
                                       : 'bg-blue-50 text-blue-500 border-blue-100 hover:bg-blue-600 hover:text-white'
                                   }`}
                                  title="ویرایش تراکنش"
                                 >
                                    <Edit3 className="w-4 md:w-5 h-4 md:h-5" />
                                 </button>
                                 <button 
                                  onClick={() => deletePayment(p.id)}
                                  className="p-2.5 md:p-3 bg-rose-50 hover:bg-rose-600 text-rose-500 hover:text-white rounded-xl md:rounded-2xl transition-all border border-rose-100 shadow-sm active:scale-90"
                                  title="حذف دائمی تراکنش"
                                 >
                                    <Trash2 className="w-4 md:w-5 h-4 md:h-5" />
                                 </button>
                              </div>
                           </div>
                        </motion.div>
                      ))}
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden Printable Invoice Section */}
      <div id="printable-invoice" className="hidden print-only fixed inset-0 bg-white z-[9999] p-12 font-sans text-right" dir="rtl" style={{ backgroundColor: '#ffffff' }}>
        <div className="flex justify-between items-center mb-10 pb-8" style={{ borderBottom: '4px solid #0f172a' }}>
          <div className="flex items-center gap-6">
            {systemSettings?.card_logo_main && (
              <img src={systemSettings.card_logo_main} alt="Logo" className="w-24 h-24 object-contain" />
            )}
            <div className="text-right">
              <div className="text-3xl font-black mb-1" style={{ color: '#0f172a' }}>{systemSettings?.card_front_text_dari || 'د افغانستان اسلامی امارت'}</div>
              <div className="text-lg font-bold" style={{ color: '#475569' }}>{systemSettings?.card_front_text_pashto || 'امارت اسلامی افعانستان'}</div>
              <div className="text-sm font-bold" style={{ color: '#64748b' }}>{systemSettings?.card_back_text_dari || 'وزارت معارف / ریاست معارف'}</div>
            </div>
          </div>
          <div className="text-left">
            <h1 className="text-3xl font-black inline-block mb-4 pb-1" style={{ color: '#e11d48', borderBottom: '2px solid #e11d48' }}>{isTeacherMode ? 'صورت حساب معاش استاد' : 'فاکتور تصفیه فیس شاگرد'}</h1>
            <p className="text-sm font-bold" style={{ color: '#64748b' }}>تاریخ گزارش: {new Date().toLocaleDateString('fa-AF')}</p>
            <p className="text-xs mt-1" dir="ltr" style={{ color: '#94a3b8' }}>Ref: {historyStudent?.id?.slice(0,8).toUpperCase()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mb-12 p-8 rounded-3xl border" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
          <div className="space-y-3">
             <div className="flex gap-2">
                <span className="font-bold" style={{ color: '#94a3b8' }}>{isTeacherMode ? 'نام استاد:' : 'نام شاگرد:'}</span>
                <span className="text-xl font-black" style={{ color: '#1e293b' }}>{historyStudent?.name}</span>
             </div>
             <div className="flex gap-2 text-lg">
                <span className="font-bold" style={{ color: '#94a3b8' }}>نام پدر:</span>
                <span className="font-bold" style={{ color: '#334155' }}>{historyStudent?.father_name}</span>
             </div>
          </div>
          <div className="space-y-3">
             <div className="flex gap-2 text-lg">
                <span className="font-bold" style={{ color: '#94a3b8' }}>{isTeacherMode ? 'رتبه/بست:' : 'صنف:'}</span>
                <span className="font-bold" style={{ color: '#334155' }}>{historyStudent?.class_name}</span>
             </div>
             <div className="flex gap-2 text-lg">
                <span className="font-bold" style={{ color: '#94a3b8' }}>{isTeacherMode ? 'دیپارتمنت / کد:' : 'بخش / نمبر اساس:'}</span>
                <span className="font-bold" style={{ color: '#334155' }}>{historyStudent?.license_plate} - {historyStudent?.license_number}</span>
             </div>
          </div>
        </div>

        <table className="w-full border-collapse mb-12">
          <thead>
            <tr className="text-white text-lg" style={{ backgroundColor: '#0f172a' }}>
              <th className="border-2 p-4" style={{ borderColor: '#0f172a' }}>ماه</th>
              <th className="border-2 p-4" style={{ borderColor: '#0f172a' }}>{isTeacherMode ? 'مبلغ دریافتی (AFN)' : 'مبلغ پرداختی (AFN)'}</th>
              <th className="border-2 p-4" style={{ borderColor: '#0f172a' }}>{isTeacherMode ? 'تاریخ دریافت' : 'تاریخ پرداخت'}</th>
              <th className="border-2 p-4" style={{ borderColor: '#0f172a' }}>{isTeacherMode ? 'باقی‌مانده معاش' : 'باقی‌مانده فیس'}</th>
            </tr>
          </thead>
          <tbody className="text-center text-lg">
            {(historyStudent?.fee_payments || [])
              .filter((p: any) => historyMonthFilter === 'همه ماه ها' || p.for_month === historyMonthFilter)
              .map((p: any) => (
              <tr key={p.id} className="border-2" style={{ borderColor: '#0f172a' }}>
                <td className="p-4 font-black">{p.for_month}</td>
                <td className="p-4 font-black">{p.amount_paid.toLocaleString()}</td>
                <td className="p-4">{new Date(p.payment_date).toLocaleDateString('fa-AF')}</td>
                <td className="p-4 font-black" style={{ color: p.balance_remaining > 0 ? '#e11d48' : '#10b981' }}>
                  {p.balance_remaining <= 0 ? 'تسویه ' : p.balance_remaining.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-black text-2xl" style={{ backgroundColor: '#f1f5f9' }}>
              <td className="border-2 p-5 text-right" style={{ borderColor: '#0f172a' }}>{isTeacherMode ? 'مجموع معاشات:' : 'مجموع پرداختی:'}</td>
              <td colSpan={3} className="border-2 p-5 text-right" style={{ borderColor: '#0f172a', color: '#4338ca' }}>
                {historyStudent?.fee_payments?.reduce((s:number, p:any) => s+p.amount_paid, 0).toLocaleString()} افغانی
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="grid grid-cols-2 gap-20 mt-32 px-10">
          <div className="text-center">
            <p className="font-black text-xl mb-20">{isTeacherMode ? 'مضاء و مهر بخش منابع بشری' : 'مضاء و مهر مدیریت مکتب'}</p>
            <div className="w-64 h-0.5 mx-auto" style={{ backgroundColor: '#0f172a' }}></div>
          </div>
          <div className="text-center">
            <p className="font-black text-xl mb-20">{isTeacherMode ? 'امضاء و اثر انگشت استاد' : 'امضاء و اثر انگشت ولی شاگرد'}</p>
            <div className="w-64 h-0.5 mx-auto" style={{ backgroundColor: '#0f172a' }}></div>
          </div>
        </div>

        <div className="absolute bottom-12 left-12 right-12 text-center">
           <div className="pt-6 flex justify-between items-center text-[10px]" style={{ borderTop: '1px solid #e2e8f0', color: '#94a3b8' }}>
             <span>زمان صدور گزارش: {new Date().toLocaleTimeString('fa-AF')}</span>
             <span className="font-bold uppercase tracking-widest" style={{ color: '#64748b' }}>{systemSettings?.school_name_dept || 'Islamic Emirate of Afghanistan'}</span>
             <span>صفحه ۱ از ۱</span>
           </div>
        </div>
      </div>
    </div>
  );
};
