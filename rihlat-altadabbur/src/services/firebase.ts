import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  Auth,
  User
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
  Firestore
} from 'firebase/firestore';
import { AttemptRecord, AnswerRecord, GameId } from '../types';

// إعدادات Firebase من متغيرات البيئة (Vite)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

// البريد الداخلي لحساب المعلم (تتم المصادقة عبر Firebase Auth دون تخزين كلمة المرور في الكود)
export const TEACHER_INTERNAL_EMAIL =
  import.meta.env.VITE_TEACHER_EMAIL || 'teacher@tafsir-game.com';

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'YOUR_API_KEY' &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== 'your-project-id'
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error('خطأ في تهيئة Firebase:', error);
  }
}

export { auth, db };

// مفاتيح التخزين المحلي لوضع Demo وقائمة انتظار المزامنة عند انقطاع الإنترنت
const LOCAL_ATTEMPTS_KEY = 'rihlat_altadabbur_attempts_v1';
const PENDING_SYNC_QUEUE_KEY = 'rihlat_altadabbur_sync_queue_v1';

export function safeGetStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function safeSetStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // تجاهل أخطاء التخزين في البيئات المقيدة
  }
}

// تسجيل دخول الطالب عبر Firebase Anonymous Authentication
export async function authenticateStudentAnonymously(): Promise<string> {
  if (isFirebaseConfigured && auth) {
    try {
      if (auth.currentUser && auth.currentUser.isAnonymous) {
        return auth.currentUser.uid;
      }
      const credential = await signInAnonymously(auth);
      return credential.user.uid;
    } catch (error) {
      console.warn('تعذر الاتصال بـ Firebase Anonymous Auth، جاري استخدام معرف جلسة محلي مؤقت:', error);
    }
  }
  const existingUid = safeGetStorage<string>('rihlat_student_uid', '');
  if (existingUid) return existingUid;
  const generatedUid = 'stu_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
  safeSetStorage('rihlat_student_uid', generatedUid);
  return generatedUid;
}

// تسجيل دخول المعلم عبر Firebase Authentication باستخدام البريد الداخلي وحقل كلمة المرور فقط
export async function loginTeacherWithPassword(password: string): Promise<{ success: boolean; mode: 'cloud' | 'demo'; error?: string }> {
  if (isFirebaseConfigured && auth) {
    try {
      await signInWithEmailAndPassword(auth, TEACHER_INTERNAL_EMAIL, password);
      return { success: true, mode: 'cloud' };
    } catch (err: any) {
      return {
        success: false,
        mode: 'cloud',
        error: 'كلمة المرور غير صحيحة أو لم يتم تفعيل حساب المعلم في Firebase Authentication بعد.'
      };
    }
  }
  return {
    success: false,
    mode: 'demo',
    error: 'وضع العرض التجريبي (Demo Mode): لم يتم ربط إعدادات Firebase في ملف .env بعد.'
  };
}

export async function logoutTeacher(): Promise<void> {
  if (isFirebaseConfigured && auth) {
    await signOut(auth);
  }
}

// حفظ أو تحديث المحاولة (أثناء تقدم الطالب في كل سؤال وعند انتهاء اللعبة)
export async function saveOrUpdateAttempt(attempt: AttemptRecord): Promise<{ savedToCloud: boolean; queuedOffline: boolean }> {
  // 1. حفظ محلي فوري لضمان عدم ضياع أي إجابة عند إغلاق المتصفح أو انقطاع الإنترنت
  const localAttempts = safeGetStorage<AttemptRecord[]>(LOCAL_ATTEMPTS_KEY, []);
  const idx = localAttempts.findIndex((a) => a.attemptId === attempt.attemptId);
  if (idx >= 0) {
    localAttempts[idx] = attempt;
  } else {
    localAttempts.unshift(attempt);
  }
  safeSetStorage(LOCAL_ATTEMPTS_KEY, localAttempts);

  // 2. إذا كان Firebase مفعلًا ومتصلًا بالإنترنت، نحفظ في مجموعة attempts في Cloud Firestore
  if (isFirebaseConfigured && db && navigator.onLine) {
    try {
      const attemptRef = doc(collection(db, 'attempts'), attempt.attemptId);
      await setDoc(attemptRef, {
        ...attempt,
        syncedToCloud: true
      }, { merge: true });

      // تحديث علامة المزامنة السحابية محليًا بعد التأكد الفعلي من نجاح الحفظ
      attempt.syncedToCloud = true;
      const updatedLocal = safeGetStorage<AttemptRecord[]>(LOCAL_ATTEMPTS_KEY, []);
      const uIdx = updatedLocal.findIndex((a) => a.attemptId === attempt.attemptId);
      if (uIdx >= 0) {
        updatedLocal[uIdx].syncedToCloud = true;
        safeSetStorage(LOCAL_ATTEMPTS_KEY, updatedLocal);
      }
      return { savedToCloud: true, queuedOffline: false };
    } catch (error) {
      console.warn('تعذر الحفظ السحابي اللحظي، تمت إضافته لقائمة انتظار المزامنة:', error);
      enqueueAttemptForSync(attempt.attemptId);
      return { savedToCloud: false, queuedOffline: true };
    }
  } else if (isFirebaseConfigured && !navigator.onLine) {
    enqueueAttemptForSync(attempt.attemptId);
    return { savedToCloud: false, queuedOffline: true };
  }

  return { savedToCloud: false, queuedOffline: false };
}

function enqueueAttemptForSync(attemptId: string): void {
  const queue = safeGetStorage<string[]>(PENDING_SYNC_QUEUE_KEY, []);
  if (!queue.includes(attemptId)) {
    queue.push(attemptId);
    safeSetStorage(PENDING_SYNC_QUEUE_KEY, queue);
  }
}

// مزامنة الإجابات والمحاولات تلقائيًا عند عودة الاتصال بالإنترنت
export async function syncPendingAttemptsToCloud(): Promise<number> {
  if (!isFirebaseConfigured || !db || !navigator.onLine) return 0;
  const queue = safeGetStorage<string[]>(PENDING_SYNC_QUEUE_KEY, []);
  if (queue.length === 0) return 0;

  const localAttempts = safeGetStorage<AttemptRecord[]>(LOCAL_ATTEMPTS_KEY, []);
  const remainingQueue: string[] = [];
  let syncedCount = 0;

  for (const attemptId of queue) {
    const attempt = localAttempts.find((a) => a.attemptId === attemptId);
    if (!attempt) continue;
    try {
      const attemptRef = doc(collection(db, 'attempts'), attempt.attemptId);
      await setDoc(attemptRef, { ...attempt, syncedToCloud: true }, { merge: true });
      attempt.syncedToCloud = true;
      syncedCount++;
    } catch {
      remainingQueue.push(attemptId);
    }
  }

  safeSetStorage(LOCAL_ATTEMPTS_KEY, localAttempts);
  safeSetStorage(PENDING_SYNC_QUEUE_KEY, remainingQueue);
  return syncedCount;
}

// جلب جميع المحاولات للوحة تحكم المعلم
export async function fetchAllAttemptsForTeacher(): Promise<{ attempts: AttemptRecord[]; fromCloud: boolean }> {
  if (isFirebaseConfigured && db && navigator.onLine) {
    try {
      const q = query(collection(db, 'attempts'), orderBy('startedAt', 'desc'));
      const snapshot = await getDocs(q);
      const cloudAttempts: AttemptRecord[] = [];
      snapshot.forEach((docSnap) => {
        cloudAttempts.push(docSnap.data() as AttemptRecord);
      });
      return { attempts: cloudAttempts, fromCloud: true };
    } catch (error) {
      console.error('تعذر جلب المحاولات من Cloud Firestore:', error);
    }
  }
  const localAttempts = safeGetStorage<AttemptRecord[]>(LOCAL_ATTEMPTS_KEY, []);
  return { attempts: localAttempts, fromCloud: false };
}
