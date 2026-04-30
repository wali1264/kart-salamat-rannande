import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Search, DollarSign, Calendar, TrendingUp, User, Users, X, Info, CheckCircle2, History, TrendingDown, ShieldCheck, PlusCircle, Calculator, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const AFGHAN_MONTHS = [
  'حمل (Hamal)', 'ثور (Sawr)', 'جوزا (Jawza)', 
  'سرطان (Saratan)', 'اسد (Asad)', 'سنبله (Sunbola)', 
  'میزان (Mizan)', 'عقرب (Aqrab)', 'قوس (Qaws)', 
  'جدی (Jadi)', 'دلو (Dalw)', 'حوت (Hut)'
];

export const FinancialManagement: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(AFGHAN_MONTHS[0]);
  const [processing, setProcessing] = useState(false);
  const [taxSettings, setTaxSettings] = useState({ threshold: 500, rate: 5 });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFees();
    const storedTax = localStorage.getItem('andhp_tax_settings');
    if (storedTax) setTaxSettings(JSON.parse(storedTax));
  }, []);

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
            balance_remaining
          )
        `);
      
      if (error) {
        if (error.code === '42703') {
          throw new Error('ساختار دیتابیس قدیمی است. لطفا کوئری SQL جدید را در پنل سوپابیس اجرا کنید.');
        }
        throw error;
      }
      setRecords(data || []);
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
      const { error } = await supabase
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
        }]);

      if (error) throw error;
      
      setPaymentAmount('');
      setSelectedStudent(null);
      fetchFees();
    } catch (err) {
      console.error('Error recording payment:', err);
    } finally {
      setProcessing(false);
    }
  };

  const filteredStudents = records.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.father_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.student_id_no && s.student_id_no.includes(searchQuery))
  );

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
          <h2 className="text-2xl font-bold text-slate-800">مدیریت مالی و فیس شاگردان</h2>
          <p className="text-slate-500 text-sm">ثبت پرداخت‌ها، محاسبه مالیات و گزارش عواید سالانه</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1">
            <p className="text-[9px] font-bold text-slate-400 uppercase">مجموع عواید (کل)</p>
            <p className="text-lg font-black text-slate-800">{stats.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1">
            <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">عواید سال جاری</p>
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
                لیست شاگردان و وضعیت فیس
              </h3>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="جستجوی شاگرد..."
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
                    <th className="px-6 py-4">معلومات شاگرد</th>
                    <th className="px-6 py-4">صنف / بخش</th>
                    <th className="px-6 py-4">فیس ماهانه</th>
                    <th className="px-6 py-4">آخرین پرداخت</th>
                    <th className="px-6 py-4">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredStudents.map(student => {
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
                          <button 
                            onClick={() => setSelectedStudent(student)}
                            className="p-2 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-xl transition-all group shadow-sm border border-blue-100"
                            title="ثبت پرداخت جدید"
                          >
                            <PlusCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          </button>
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
                        <p className="text-slate-400 text-sm italic">شاگردی با این مشخصات یافت نشد.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
                    ثبت فیس جدید
                  </h3>
                  <button onClick={() => setSelectedStudent(null)} className="bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 p-2 rounded-xl transition-colors">
                     <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100/50">
                  <p className="text-[10px] font-bold text-blue-400 uppercase mb-3">شاگرد انتخاب شده:</p>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-blue-600 font-bold border border-blue-100 shadow-sm overflow-hidden">
                      {selectedStudent.photo_url ? <img src={selectedStudent.photo_url} className="w-full h-full object-cover" /> : selectedStudent.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg leading-none mb-1">{selectedStudent.name}</h4>
                      <p className="text-xs text-slate-500">صنف {selectedStudent.class_name} ({selectedStudent.license_plate})</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 mr-2 uppercase tracking-widest block text-right">انتخاب ماه پرداخت (Afghan Months)</label>
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
                    <label className="text-[10px] font-bold text-slate-400 mr-2 uppercase tracking-widest block text-right">مبلغ پرداختی (افغانی)</label>
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
                        <span className="text-sm opacity-70">خالص عواید:</span>
                        <span>{(parseFloat(paymentAmount) - calculateTax(parseFloat(paymentAmount))).toLocaleString()} <span className="text-[10px] font-normal opacity-50">افغانی</span></span>
                      </div>
                      <p className="text-[10px] text-blue-400 leading-relaxed italic border-t border-white/5 pt-3">
                        {parseFloat(paymentAmount) >= (selectedStudent.total_monthly_fee || 0)
                          ? '✔️ تبریک! این مبلغ تمام فیس این ماه شاگرد را تسویه می‌کند.' 
                          : `⚠️ هشدار: مبلغ ${( (selectedStudent.total_monthly_fee || 0) - parseFloat(paymentAmount)).toLocaleString()} افغانی از فیس این ماه باقی می‌ماند.`}
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
                        تایید و ثبت نهایی پرداخت
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
                  <p className="font-bold text-slate-800 text-xl mb-2">پرداخت فیس جدید</p>
                  <p className="text-slate-400 text-xs px-6 leading-relaxed">جهت ثبت فیس ماهواره شاگردان، ابتدا نام یا کد شاگرد را از لیست سمت راست پیدا کرده و روی آیکون پلس کلیک نمایید.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* History Section for Selected Student */}
          {selectedStudent && selectedStudent.fee_payments && selectedStudent.fee_payments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[2rem] border border-slate-100 p-8 space-y-6 shadow-sm mb-6"
            >
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-blue-500" />
                تاریخچه پرداخت‌های اخیر
              </h4>
              <div className="space-y-3">
                {[...selectedStudent.fee_payments].sort((a:any, b:any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()).slice(0, 5).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-slate-800">بابت ماه {p.for_month}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{new Date(p.payment_date).toLocaleDateString('fa-AF')}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-blue-600">{p.amount_paid.toLocaleString()} AFN</p>
                      <p className={`text-[9px] font-bold mt-0.5 ${p.balance_remaining <= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                        {p.balance_remaining <= 0 ? '✔️ تسویه کامل' : `باقی‌مانده: ${p.balance_remaining.toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
