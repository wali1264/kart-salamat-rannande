import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  MessageSquare,
  History,
  AlertCircle,
  CheckCircle2,
  X,
  PlusCircle,
  User as UserIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useSystem } from '../../contexts/SystemContext';
import { useSync } from '../../contexts/SyncContext';

interface Student {
  id: string;
  name: string;
  father_name: string;
  student_id_no: string;
  photo_url: string | null;
  class_name: string;
}

interface Subject {
  id: string;
  name: string;
  type: string;
  grade_level: string;
}

interface Grade {
  id: string;
  student_id: string;
  subject_id: string;
  midterm_grade: number | null;
  final_grade: number | null;
  academic_year: string;
  subject?: Subject;
}

interface Recommendation {
  id: string;
  student_id: string;
  content: string;
  reason: string;
  date: string;
}

export const GradesManagement: React.FC = () => {
  const { isTeacherMode } = useSystem();
  const { performAction } = useSync();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [displayCount, setDisplayCount] = useState(5);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isManagingSubjects, setIsManagingSubjects] = useState(false);
  
  // Grade Form State
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [studentGrades, setStudentGrades] = useState<Grade[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  
  const [newRecommendation, setNewRecommendation] = useState({ content: '', reason: '', date: new Date().toISOString().split('T')[0] });
  const [showRecForm, setShowRecForm] = useState(false);

  // Subject Management State
  const [newSubject, setNewSubject] = useState({ name: '', type: 'school', grade_level: '1' });

  useEffect(() => {
    fetchStudents();
    fetchSubjects();
  }, [searchTerm]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      let query = supabase.from('students').select('*').eq('type', 'student');
      
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,father_name.ilike.%${searchTerm}%,student_id_no.ilike.%${searchTerm}%`);
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query.limit(displayCount);
      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
      console.error('Fetch students error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase.from('grade_subjects').select('*').order('name');
      if (error) throw error;
      setSubjects(data || []);
    } catch (err) {
      console.error('Fetch subjects error:', err);
    }
  };

  const fetchStudentData = async (studentId: string) => {
    try {
      const { data: grades, error: gError } = await supabase
        .from('student_grades')
        .select('*, subject:grade_subjects(*)')
        .eq('student_id', studentId);
      if (gError) throw gError;
      setStudentGrades(grades || []);

      const { data: recs, error: rError } = await supabase
        .from('student_recommendations')
        .select('*')
        .eq('student_id', studentId)
        .order('date', { ascending: false });
      if (rError) throw rError;
      setRecommendations(recs || []);
    } catch (err) {
      console.error('Fetch student data error:', err);
    }
  };

  const saveGrade = async (grade: Partial<Grade>) => {
    try {
      const { error } = await performAction('student_grades', grade.id ? 'update' : 'insert', grade, 
        () => supabase.from('student_grades').upsert({
          ...grade,
          student_id: selectedStudent?.id,
          academic_year: selectedYear
        })
      );
      if (error) throw error;
      if (selectedStudent) fetchStudentData(selectedStudent.id);
    } catch (err) {
      alert('خطا در ثبت نمره');
    }
  };

  const deleteGrade = async (id: string) => {
    if (!confirm('آیا مطمئن هستید؟')) return;
    try {
      const { error } = await performAction('student_grades', 'delete', { id }, 
        () => supabase.from('student_grades').delete().eq('id', id)
      );
      if (error) throw error;
      if (selectedStudent) fetchStudentData(selectedStudent.id);
    } catch (err) {
      alert('خطا در حذف نمره');
    }
  };

  const saveRecommendation = async () => {
    if (!newRecommendation.content || !newRecommendation.reason) return;
    try {
      const { error } = await performAction('student_recommendations', 'insert', newRecommendation, 
        () => supabase.from('student_recommendations').insert({
          ...newRecommendation,
          student_id: selectedStudent?.id
        })
      );
      if (error) throw error;
      setNewRecommendation({ content: '', reason: '', date: new Date().toISOString().split('T')[0] });
      setShowRecForm(false);
      if (selectedStudent) fetchStudentData(selectedStudent.id);
    } catch (err) {
      alert('خطا در ثبت توصیه');
    }
  };

  const deleteRecommendation = async (id: string) => {
    if (!confirm('آیا مطمئن هستید؟')) return;
    try {
      const { error } = await performAction('student_recommendations', 'delete', { id }, 
        () => supabase.from('student_recommendations').delete().eq('id', id)
      );
      if (error) throw error;
      if (selectedStudent) fetchStudentData(selectedStudent.id);
    } catch (err) {
      alert('خطا در حذف توصیه');
    }
  };

  const addSubject = async () => {
    if (!newSubject.name) return;
    try {
      const { error } = await performAction('grade_subjects', 'insert', newSubject, 
        () => supabase.from('grade_subjects').insert(newSubject)
      );
      if (error) throw error;
      setNewSubject({ name: '', type: 'school', grade_level: '1' });
      fetchSubjects();
    } catch (err) {
      alert('خطا در ثبت صنف/موضوع');
    }
  };

  const deleteSubject = async (id: string) => {
    if (!confirm('آیا مطمئن هستید؟ این موضوع از تمام نمرات حذف خواهد شد.')) return;
    try {
      const { error } = await performAction('grade_subjects', 'delete', { id }, 
        () => supabase.from('grade_subjects').delete().eq('id', id)
      );
      if (error) throw error;
      fetchSubjects();
    } catch (err) {
      alert('خطا در حذف');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">مدیریت نمرات و توصیه‌ها</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Academic Record Management</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsManagingSubjects(!isManagingSubjects)}
            className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-xs transition-all active:scale-95"
          >
            <BookOpen className="w-4 h-4" />
            {isManagingSubjects ? 'بازگشت به شاگردان' : 'مدیریت مضامین و صنوف'}
          </button>
        </div>
      </div>

      {!isManagingSubjects && !selectedStudent && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="جستجوی شاگرد بر اساس نام، پدر یا کد شناسایی..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-100 rounded-3xl py-5 pr-14 pl-6 text-sm outline-none focus:border-blue-500 shadow-sm transition-all text-right"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-48 bg-slate-100 rounded-[2.5rem] animate-pulse" />
              ))
            ) : students.length > 0 ? (
              students.map((student) => (
                <motion.div
                  key={student.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => {
                    setSelectedStudent(student);
                    fetchStudentData(student.id);
                  }}
                  className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden flex-shrink-0">
                      {student.photo_url ? (
                        <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <UserIcon className="w-8 h-8 text-slate-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-slate-800 truncate mb-1">{student.name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold mb-2">فرزند: {student.father_name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg font-bold">ID: {student.student_id_no}</span>
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg font-bold">{student.class_name}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center">
                <Users className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                <p className="text-slate-400 font-bold">هیچ شاگردی یافت نشد</p>
              </div>
            )}
          </div>

          {!searchTerm && students.length >= displayCount && (
            <button 
              onClick={() => setDisplayCount(prev => prev + 5)}
              className="w-full py-4 bg-white border border-slate-100 rounded-2xl text-slate-500 font-bold text-xs hover:bg-slate-50 transition-all"
            >
              مشاهده موارد بیشتر
            </button>
          )}
        </div>
      )}

      {isManagingSubjects && (
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 animate-in slide-in-from-bottom duration-500">
          <div className="flex items-center gap-3 mb-8">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-black text-slate-800">تعریف مضامین و صنوف</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 pr-2">نام مضمون/صنف</label>
              <input 
                value={newSubject.name}
                onChange={(e) => setNewSubject({...newSubject, name: e.target.value})}
                placeholder="مثلاً: ریاضی، فیزیک..."
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 pr-2">نوعیت</label>
              <select 
                value={newSubject.type}
                onChange={(e) => setNewSubject({...newSubject, type: e.target.value})}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="school">مکتب / مدرسه</option>
                <option value="university">پوهنتون / دانشگاه</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 pr-2">درجه/صنف</label>
              <input 
                value={newSubject.grade_level}
                onChange={(e) => setNewSubject({...newSubject, grade_level: e.target.value})}
                placeholder="مثلاً: صنف اول، ترم اول..."
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button 
                onClick={addSubject}
                className="w-full bg-blue-600 text-white font-black py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                افزودن به لیست
              </button>
            </div>
          </div>

          <div className="overflow-hidden border border-slate-100 rounded-2xl">
            <table className="w-full text-right">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400">نام مضمون</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400">نوعیت</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400">صنف/درجه</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 text-left">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {subjects.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-slate-700">{sub.name}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">{sub.type === 'school' ? 'مکتب' : 'پوهنتون'}</td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-500">{sub.grade_level}</td>
                    <td className="px-6 py-4 text-left">
                      <button onClick={() => deleteSubject(sub.id)} className="p-2 text-rose-400 hover:text-rose-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedStudent && (
        <div className="space-y-6 animate-in slide-in-from-right duration-500">
          <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-10 border-b border-slate-100">
               <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-[2rem] bg-slate-50 border-2 border-slate-100 overflow-hidden shadow-inner">
                    {selectedStudent.photo_url ? (
                      <img src={selectedStudent.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UserIcon className="w-10 h-10 text-slate-200" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 mb-1">{selectedStudent.name}</h3>
                    <p className="text-sm font-bold text-slate-400">فرزند: {selectedStudent.father_name}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-4 py-1.5 rounded-xl border border-blue-100 uppercase">S/N: {selectedStudent.student_id_no}</span>
                      <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-4 py-1.5 rounded-xl uppercase">{selectedStudent.class_name}</span>
                    </div>
                  </div>
               </div>
               <button 
                onClick={() => setSelectedStudent(null)}
                className="px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-xs transition-all"
               >
                 بازگشت به لیست
               </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Grades Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GraduationCap className="w-6 h-6 text-blue-600" />
                    <h4 className="text-lg font-black text-slate-800">نمرات تحصیلی</h4>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                    <Calendar className="w-4 h-4 text-slate-400 mx-2" />
                    <select 
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="bg-transparent text-xs font-black p-2 outline-none"
                    >
                      {[0, 1, 2].map(n => {
                        const yr = (new Date().getFullYear() - n).toString();
                        return <option key={yr} value={yr}>{yr}</option>;
                      })}
                    </select>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead className="text-[10px] font-black text-slate-400 border-b border-slate-200">
                        <tr>
                          <th className="pb-4 px-2">مضمون</th>
                          <th className="pb-4 px-2">چهارونیم ماهه</th>
                          <th className="pb-4 px-2">سالانه</th>
                          <th className="pb-4 px-2">عملیات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {subjects.map(sub => {
                          const existing = studentGrades.find(g => g.subject_id === sub.id && g.academic_year === selectedYear);
                          return (
                            <tr key={sub.id} className="group">
                              <td className="py-4 px-2 font-bold text-slate-700 text-sm">{sub.name} <span className="text-[9px] text-slate-400">({sub.grade_level})</span></td>
                              <td className="py-4 px-2">
                                <input 
                                  type="number"
                                  defaultValue={existing?.midterm_grade || ''}
                                  onBlur={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val)) saveGrade({ id: existing?.id, subject_id: sub.id, midterm_grade: val });
                                  }}
                                  className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center text-xs font-mono outline-none focus:border-blue-500"
                                />
                              </td>
                              <td className="py-4 px-2">
                                <input 
                                  type="number"
                                  defaultValue={existing?.final_grade || ''}
                                  onBlur={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val)) saveGrade({ id: existing?.id, subject_id: sub.id, final_grade: val });
                                  }}
                                  className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center text-xs font-mono outline-none focus:border-blue-500"
                                />
                              </td>
                              <td className="py-4 px-2">
                                {existing && (
                                  <button onClick={() => deleteGrade(existing.id)} className="p-1 text-slate-300 hover:text-rose-500 transition-colors">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Recommendations Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-6 h-6 text-orange-600" />
                    <h4 className="text-lg font-black text-slate-800">توصیه‌ها و نظرات اساتید</h4>
                  </div>
                  <button 
                    onClick={() => setShowRecForm(!showRecForm)}
                    className="p-2 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-600 hover:text-white transition-all shadow-sm shadow-orange-100"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <AnimatePresence>
                  {showRecForm && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-orange-50 border border-orange-100 p-6 rounded-[2rem] space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-orange-400 pr-2">علت توصیه</label>
                          <input 
                            value={newRecommendation.reason}
                            onChange={(e) => setNewRecommendation({...newRecommendation, reason: e.target.value})}
                            placeholder="مثلاً: فعالیت کلاسی عالی"
                            className="w-full bg-white border border-orange-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-orange-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-orange-400 pr-2">تاریخ</label>
                          <input 
                            type="date"
                            value={newRecommendation.date}
                            onChange={(e) => setNewRecommendation({...newRecommendation, date: e.target.value})}
                            className="w-full bg-white border border-orange-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-orange-500 text-right"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-orange-400 pr-2">متن توصیه</label>
                        <textarea 
                          value={newRecommendation.content}
                          onChange={(e) => setNewRecommendation({...newRecommendation, content: e.target.value})}
                          rows={3}
                          placeholder="توصیه خود را اینجا بنویسید..."
                          className="w-full bg-white border border-orange-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-orange-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={saveRecommendation}
                          className="flex-1 bg-orange-600 text-white font-black py-3 rounded-xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-100"
                        >
                          ثبت توصیه
                        </button>
                        <button 
                          onClick={() => setShowRecForm(false)}
                          className="px-6 py-3 bg-white border border-orange-200 text-orange-600 font-bold rounded-xl transition-all"
                        >
                          انصراف
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-4">
                  {recommendations.length > 0 ? (
                    recommendations.map(re => (
                      <div key={re.id} className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm relative group">
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-50">
                           <div className="flex items-center gap-2">
                              <History className="w-3 h-3 text-slate-300" />
                              <span className="text-[10px] font-black text-slate-400">{new Date(re.date).toLocaleDateString('fa-AF')}</span>
                           </div>
                           <button onClick={() => deleteRecommendation(re.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-500 transition-all">
                              <Trash2 className="w-3 h-3" />
                           </button>
                        </div>
                        <h5 className="text-xs font-black text-slate-800 mb-2">{re.reason}</h5>
                        <p className="text-xs text-slate-600 leading-loose whitespace-pre-wrap">{re.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
                       <MessageSquare className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                       <p className="text-[10px] text-slate-400 font-bold">توصیه‌ای ثبت نشده است</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
