/**
 * Firebase Cloud Functions — Server-Side Answer Validation & Randomized Attempt Generator
 * يحمي مفاتيح الإجابات الصحيحة من الكشف المسبق على أجهزة الطلاب في بيئة الإنتاج.
 */
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

/**
 * دالة سحابية آمنة (Callable Cloud Function) للتحقق من إجابة الطالب باستخدام المعرف الدائم (selectedOptionId)
 * دون إرسال مفتاح الإجابات الكامل إلى متصفح الطالب قبل الإجابة.
 */
export const validateStudentAnswer = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'يجب تسجيل الدخول عبر Firebase Anonymous Auth للتحقق من الإجابة.'
    );
  }

  const { attemptId, questionId, selectedOptionId, displayedOptionIds, timeSpentSeconds } = data;
  if (!attemptId || !questionId || !selectedOptionId) {
    throw new functions.https.HttpsError('invalid-argument', 'بيانات السؤال أو الاختيار غير مكتملة.');
  }

  // قراءة مفتاح الإجابة المحمي من مجموعة answer_keys (غير متاحة للطلاب في firestore.rules)
  const keyDoc = await db.collection('answer_keys').doc(questionId).get();
  if (!keyDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'لم يتم العثور على مفتاح السؤال.');
  }

  const keyData = keyDoc.data()!;
  // التحقق يعتمد حصرياً على المعرف الدائم (Permanent Option ID) وليس موقع الحرف (A, B, C, D)
  const isCorrect = selectedOptionId === keyData.correctOptionId;

  const positionLabels = ['A', 'B', 'C', 'D'];
  const selectedPosIdx = Array.isArray(displayedOptionIds)
    ? displayedOptionIds.indexOf(selectedOptionId)
    : -1;
  const correctPosIdx = Array.isArray(displayedOptionIds)
    ? displayedOptionIds.indexOf(keyData.correctOptionId)
    : -1;

  const answerRecord = {
    questionId,
    questionText: keyData.questionText,
    originalOptionIds: keyData.originalOptionIds || [],
    originalCorrectOptionId: keyData.correctOptionId,
    displayedOptionIds: displayedOptionIds || [],
    selectedOptionId,
    correctOptionId: keyData.correctOptionId,
    displayedSelectedPosition: selectedPosIdx >= 0 ? positionLabels[selectedPosIdx] : 'A',
    displayedCorrectPosition: correctPosIdx >= 0 ? positionLabels[correctPosIdx] : 'A',
    selectedAnswer: keyData.optionsMap?.[selectedOptionId] || '',
    correctAnswer: keyData.optionsMap?.[keyData.correctOptionId] || '',
    isCorrect,
    explanation: keyData.explanation,
    answeredAt: new Date().toISOString(),
    timeSpentSeconds: Number(timeSpentSeconds) || 1
  };

  // تحديث وثيقة محاولة الطالب في Firestore بشرط ملكية الطالب للمحاولة
  const attemptRef = db.collection('attempts').doc(attemptId);
  const attemptSnap = await attemptRef.get();
  if (!attemptSnap.exists || attemptSnap.data()?.studentUid !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', 'لا تملك صلاحية تعديل هذه المحاولة.');
  }

  const currentAnswers = (attemptSnap.data()?.answers || []).filter(
    (a: any) => a.questionId !== questionId
  );
  currentAnswers.push(answerRecord);

  await attemptRef.update({
    answers: currentAnswers,
    submittedAt: new Date().toISOString()
  });

  return {
    isCorrect,
    correctOptionId: keyData.correctOptionId,
    correctAnswer: keyData.optionsMap?.[keyData.correctOptionId] || '',
    explanation: keyData.explanation
  };
});
