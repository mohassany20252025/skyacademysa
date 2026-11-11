import { AttemptRecord } from '../types';

function escapeCsvCell(value: string | number | boolean | undefined | null): string {
  const str = value === undefined || value === null ? '' : String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportAllStudentsAttemptsCsv(attempts: AttemptRecord[]): void {
  const headers = [
    'معرف المحاولة (attemptId)',
    'معرف الطالب (studentUid)',
    'اسم الطالب',
    'الفصل الدراسي',
    'معرف اللعبة',
    'اسم اللعبة',
    'الحالة',
    'الدرجة',
    'الدرجة العظمى',
    'النسبة المئوية (%)',
    'عدد الإجابات الصحيحة',
    'عدد الإجابات الخاطئة',
    'الزمن المستغرق (ثانية)',
    'تاريخ البدء',
    'تاريخ التسليم',
    'حالة الحفظ السحابي'
  ];

  const rows = attempts.map((att) => {
    const correctCount = att.answers.filter((a) => a.isCorrect).length;
    const wrongCount = att.answers.length - correctCount;
    return [
      att.attemptId,
      att.studentUid,
      att.studentName,
      att.className,
      att.gameId,
      att.gameName,
      att.status === 'completed' ? 'مكتملة' : 'قيد التقدم',
      att.score,
      att.maxScore,
      `${att.percentage}%`,
      correctCount,
      wrongCount,
      att.duration,
      new Date(att.startedAt).toLocaleString('ar-EG'),
      new Date(att.submittedAt).toLocaleString('ar-EG'),
      att.syncedToCloud ? 'محفوظ سحابياً (Firestore)' : 'محلي (Demo / بانتظار المزامنة)'
    ].map(escapeCsvCell).join(',');
  });

  // إضافة UTF-8 BOM (\uFEFF) لدعم الحروف العربية بشكل سليم في Microsoft Excel
  const csvContent = '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
  triggerCsvDownload(csvContent, `تقرير_جميع_الطلاب_رحلة_التدبر_${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportSingleStudentCsv(studentName: string, className: string, attempts: AttemptRecord[]): void {
  const headers = [
    'اسم الطالب',
    'الفصل',
    'معرف المحاولة',
    'اللعبة',
    'تاريخ المحاولة',
    'درجة المحاولة',
    'النسبة المئوية',
    'رقم/معرف السؤال',
    'نص السؤال',
    'إجابة الطالب',
    'الإجابة الصحيحة',
    'النتيجة (صحيحة/خاطئة)',
    'زمن الإجابة (ثانية)',
    'الشرح التفسيري'
  ];

  const rows: string[] = [];
  attempts.forEach((att) => {
    if (att.answers.length === 0) {
      rows.push([
        studentName,
        className,
        att.attemptId,
        att.gameName,
        new Date(att.startedAt).toLocaleString('ar-EG'),
        `${att.score}/${att.maxScore}`,
        `${att.percentage}%`,
        '-',
        'لم يتم الإجابة عن أسئلة بعد',
        '-',
        '-',
        '-',
        '-',
        '-'
      ].map(escapeCsvCell).join(','));
    } else {
      att.answers.forEach((ans) => {
        rows.push([
          studentName,
          className,
          att.attemptId,
          att.gameName,
          new Date(att.startedAt).toLocaleString('ar-EG'),
          `${att.score}/${att.maxScore}`,
          `${att.percentage}%`,
          ans.questionId,
          ans.questionText,
          ans.selectedAnswer,
          ans.correctAnswer,
          ans.isCorrect ? 'إجابة صحيحة' : 'إجابة خاطئة',
          ans.timeSpentSeconds ?? '-',
          ans.explanation
        ].map(escapeCsvCell).join(','));
      });
    }
  });

  const csvContent = '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
  const safeName = studentName.replace(/\s+/g, '_');
  triggerCsvDownload(csvContent, `تقرير_الطالب_${safeName}_رحلة_التدبر.csv`);
}

function triggerCsvDownload(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
