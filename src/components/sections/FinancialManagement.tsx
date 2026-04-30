import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Search, DollarSign, Calendar, TrendingUp, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface FeeRecord {
  id: string;
  student_id: string;
  month: string;
  total_fee: number;
  amount_paid: number;
  last_payment_date: string;
  driver_name: string; // From join
}

export const FinancialManagement: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');

  useEffect(() => {
    fetchFees();
  }, []);

  const fetchFees = async () => {
    setLoading(true);
    try {
      // Joining students to get names and fee history
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          name,
          father_name,
          total_monthly_fee,
          fee_payments (
            id,
            for_month,
            amount_paid,
            payment_date,
            balance_remaining
          )
        `);

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error('Error fetching fees:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedStudent || !paymentAmount) return;

    try {
      const amountToAdd = parseFloat(paymentAmount);
      const currentMonth = new Date().toLocaleDateString('fa-AF', { month: 'long' });
      
      const { error: insertError } = await supabase
        .from('fee_payments')
        .insert([{
          student_id: selectedStudent.id,
          for_month: currentMonth,
          amount_paid: amountToAdd,
          payment_date: new Date().toISOString(),
          payment_method: 'نقدی',
          balance_remaining: (selectedStudent.total_monthly_fee || 5000) - amountToAdd
        }]);

      if (insertError) throw insertError;

      setPaymentAmount('');
      setSelectedStudent(null);
      fetchFees();
    } catch (err) {
      console.error('Error processing payment:', err);
      alert('خطا در ثبت پرداخت');
    }
  };

  const filteredStudents = records.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.includes(searchQuery)
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">مدیریت مالی و شهریه</h2>
          <p className="text-slate-500 text-sm">کنترل پرداخت‌های شاگردان و مدیریت فیس ماهانه.</p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
             <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
               <TrendingUp className="w-5 h-5 text-emerald-600" />
             </div>
             <div>
               <p className="text-[10px] text-slate-400 font-bold uppercase">مجموع عواید این ماه</p>
               <p className="text-sm font-bold text-slate-800">۴۵۰,۰۰۰ افغانی</p>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Left: Search & Select */}
        <div className="col-span-12 lg:col-span-4 space-y-6 flex flex-col min-h-0">
          <div className="bento-card">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">جستجوی شاگرد</label>
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="نام یا کد شاگرد"
                className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 pr-11 pl-4 text-sm focus:ring-2 focus:ring-blue-500/10 outline-none border transition-all"
              />
            </div>
          </div>

          <div className="bento-card flex-1 overflow-hidden flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-500" />
              لیست شاگردان
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredStudents.map(student => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className={`w-full text-right p-3 rounded-xl border transition-all flex items-center justify-between ${selectedStudent?.id === student.id ? 'bg-blue-50 border-blue-100' : 'bg-white border-transparent hover:bg-slate-50'}`}
                >
                  <div>
                    <p className="text-sm font-bold text-slate-800">{student.name}</p>
                    <p className="text-[10px] text-slate-400">فرزند {student.father_name}</p>
                  </div>
                  <CreditCard className={`w-4 h-4 ${selectedStudent?.id === student.id ? 'text-blue-500' : 'text-slate-200'}`} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Payment Details */}
        <div className="col-span-12 lg:col-span-8 space-y-6 flex flex-col min-h-0">
          {selectedStudent ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 h-full flex flex-col"
            >
              <div className="bento-card">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-blue-900 rounded-2xl flex items-center justify-center text-white font-bold text-xl">
                    {selectedStudent.name[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{selectedStudent.name}</h3>
                    <p className="text-xs text-slate-500">کد شناسایی: {selectedStudent.id.slice(0, 8)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">فیس ماهانه ثابت</p>
                    <p className="text-sm font-bold text-slate-800">{selectedStudent.total_monthly_fee || 5000} افغانی</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] text-emerald-400 font-bold uppercase mb-1">مجموع پرداختی</p>
                    <p className="text-sm font-bold text-emerald-800">
                      {selectedStudent.fee_payments?.reduce((acc: number, curr: any) => acc + curr.amount_paid, 0) || 0} افغانی
                    </p>
                  </div>
                  <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                    <p className="text-[10px] text-rose-400 font-bold uppercase mb-1">باقی‌مانده فیس</p>
                    <p className="text-sm font-bold text-rose-800">---</p>
                  </div>
                </div>
              </div>

              <div className="bento-card flex-1 flex flex-col min-h-0">
                <h3 className="text-sm font-bold text-slate-800 mb-4">ثبت فیس جدید (پرداخت فیس)</h3>
                <div className="flex gap-4 items-end mb-8">
                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">مبلغ پرداختی (افغانی)</label>
                    <div className="relative">
                      <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="number" 
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="مثلا ۱۰۰۰"
                        className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 pr-11 pl-4 text-sm focus:ring-2 focus:ring-blue-500/10 outline-none border transition-all"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handlePayment}
                    className="bg-blue-900 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-950 transition-all active:scale-95 shadow-lg shadow-blue-100"
                  >
                    ثبت پرداخت
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-right text-sm">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-50">
                        <th className="pb-3 font-medium">ماه</th>
                        <th className="pb-3 font-medium">فیس کل</th>
                        <th className="pb-3 font-medium">پرداخت شده</th>
                        <th className="pb-3 font-medium">تاریخ آخرین پرداخت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {selectedStudent.fee_payments?.map((fee: any) => (
                        <tr key={fee.id} className="group hover:bg-slate-50 transition-colors">
                          <td className="py-3 font-bold text-slate-700">{fee.for_month}</td>
                          <td className="py-3 text-slate-500">{selectedStudent.total_monthly_fee || 5000} افغانی</td>
                          <td className="py-3 font-bold text-emerald-600">{fee.amount_paid} افغانی</td>
                          <td className="py-3 text-xs text-slate-400">
                            {fee.payment_date ? new Date(fee.payment_date).toLocaleDateString('fa-AF') : '---'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(!selectedStudent.fee_payments || selectedStudent.fee_payments.length === 0) && (
                    <div className="py-12 text-center text-slate-300 text-xs italic">
                      هیچ سابقه پرداختی برای این شاگرد ثبت نشده است.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bento-card bg-slate-50/50 border-dashed">
              <CreditCard className="w-12 h-12 text-slate-200 mb-4" />
              <p className="text-slate-400 text-sm italic">جهت مدیریت مالی، لطفا یک شاگرد را از لیست سمت راست انتخاب کنید.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
