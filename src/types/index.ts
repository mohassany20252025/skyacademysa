export type GameId =
  | 'surah-keys'
  | 'vocab-memory'
  | 'quran-detective'
  | 'order-scenes'
  | 'verse-to-lesson'
  | 'sixty-seconds';

export type AttemptStatus = 'in_progress' | 'completed';

export interface AnswerRecord {
  questionId: string;
  questionText: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
  answeredAt: string;
  timeSpentSeconds?: number;
}

export interface AttemptRecord {
  attemptId: string;
  studentUid: string;
  studentName: string;
  className: string;
  gameId: GameId;
  gameName: string;
  answers: AnswerRecord[];
  score: number;
  maxScore: number;
  percentage: number;
  startedAt: string;
  submittedAt: string;
  duration: number;
  status: AttemptStatus;
  syncedToCloud?: boolean;
}

export interface StudentSession {
  studentUid: string;
  studentName: string;
  className: string;
  sessionId: string;
  loginTime: string;
}

export interface VerseItem {
  ayahNumber: number;
  text: string;
  topic: string;
  tafsirSummary: string;
  lessons: string[];
}

export interface VocabItem {
  id: string;
  word: string;
  ayahNumber: number;
  meaning: string;
  contextHint: string;
}

export interface GameMetadata {
  id: GameId;
  title: string;
  subtitle: string;
  description: string;
  iconName: string;
  maxScore: number;
  questionsCount: number;
  estimatedMinutes: number;
  badgeTitle: string;
}
