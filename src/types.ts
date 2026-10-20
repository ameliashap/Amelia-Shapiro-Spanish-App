export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export type TopicId = 'daily_life' | 'travel' | 'food' | 'school' | 'hobbies' | 'shopping';

export interface TopicInfo {
  id: TopicId;
  labelEs: string;
  labelEn: string;
  icon: string;
  description: string;
  badgeColor: string;
}

export interface PracticeQuestion {
  id: string;
  level: DifficultyLevel;
  topic: TopicId | string;
  questionEs: string;
  questionEn: string;
  context: string;
  hints: string[];
  sampleAnswer: string;
  sampleAnswerEn: string;
}

export interface Correction {
  original: string;
  correction: string;
  explanation: string;
  category: 'grammar' | 'vocabulary' | 'pronunciation' | 'agreement' | 'syntax';
}

export interface EvaluationResult {
  transcription: string;
  transcriptionEn: string;
  overallScore: number;
  fluencyScore: number;
  grammarScore: number;
  vocabularyScore: number;
  praise: string;
  summary: string;
  corrections: Correction[];
  betterWay: {
    nativeSpanish: string;
    englishTranslation: string;
    whyBetter: string;
  };
  pronunciationTips: string[];
  tutorReply: {
    replyEs: string;
    replyEn: string;
  };
  isAudio?: boolean;
}

export interface PracticeHistoryItem {
  id: string;
  timestamp: number;
  question: PracticeQuestion;
  evaluation: EvaluationResult;
  userAudioUrl?: string;
  userText?: string;
}
