import React, { useState } from 'react';
import { BookOpen, Sparkles, Compass, ShieldCheck, Play } from 'lucide-react';
import { LESSON_INFO } from '../data/tafsirContent';

interface StudentWelcomeProps {
  onStartJourney: (studentName: string, className: string) => void;
  onOpenTeacherLogin: () => void;
}

export const StudentWelcome: React.FC<StudentWelcomeProps> = ({
  onStartJourney,
  onOpenTeacherLogin,
}) => {
  const [studentName, setStudentName] = useState('');
  const [className, setClassName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = studentName.trim();
    if (!trimmed || trimmed.length < 2) {
      setErrorMsg('يرجى إدخال اسم الطالب كاملاً للبدء في الرحلة.');
      return;
    }
    if (!className) {
      setErrorMsg('يرجى اختيار الفصل الدراسي أو الشعبة أولاً.');
      return;
    }
    setErrorMsg('');
    onStartJourney(trimmed, className);
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-2xl bg-slate-900/90 border border-teal-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30">
            <BookOpen className="w-4 h-4 text-amber-400" />
            المادة: {LESSON_INFO.subjectName}
          </span>
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Sparkles className="w-4 h-4 text-amber-400" />
            {LESSON_INFO.gradeLevel}
          </span>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-l from-amber-300 via-teal-200 to-teal-400 mb-3">
            مرحبًا بك في رحلة التدبر
          </h1>
          <p className="text-lg sm:text-xl font-bold text-slate-200 mb-2">
            {LESSON_INFO.lessonTitle}
          </p>
          <p className="text-sm text-slate-400 max-w-lg mx-auto">
            منصة ألعاب تعليمية تفاعلية لاستكشاف معاني الآيات الكريمة ومفرداتها وهداياتها العقدية والتربوية.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-teal-200 mb-2">
              اسم الطالب <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => {
                setStudentName(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="اكتب اسمك الثلاثي هنا..."
              className="w-full px-4 py-3.5 rounded-xl bg-slate-950/90 border border-slate-700 focus:border-teal-400 focus:outline-none text-white placeholder-slate-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-teal-200 mb-2">
              الفصل الدراسي / الشعبة <span className="text-amber-400">*</span>
            </label>
            <select
              value={className}
              onChange={(e) => {
                setClassName(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              className="w-full px-4 py-3.5 rounded-xl bg-slate-950/90 border border-slate-700 focus:border-teal-400 focus:outline-none text-white transition"
            >
              <option value="">-- اختر الفصل أو الشعبة --</option>
              {LESSON_INFO.availableClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-sm font-medium">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-4 px-6 rounded-xl bg-gradient-to-l from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-extrabold text-lg shadow-lg shadow-teal-500/20 flex items-center justify-center gap-3 transition transform hover:-translate-y-0.5"
          >
            <Play className="w-5 h-5 fill-current" />
            ابدأ الرحلة
          </button>
        </form>

        <div className="mt-8 pt-5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-teal-400" />
            6 ألعاب تدبرية مستقلة بحفظ تلقائي فوري
          </span>
          <button
            type="button"
            onClick={onOpenTeacherLogin}
            className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-semibold transition"
          >
            <ShieldCheck className="w-4 h-4" />
            لوحة تحكم المعلم
          </button>
        </div>
      </div>
    </div>
  );
};
