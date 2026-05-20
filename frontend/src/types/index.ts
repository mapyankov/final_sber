export type QuestionType = 'single' | 'multiple' | 'true_false' | 'open';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Language = 'ru' | 'en';

export interface Question {
  id: number;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswers: number[];
}

export interface GenerateRequest {
  text: string;
  questionsCount: number;
  difficulty: Difficulty;
  language: Language;
  types: QuestionType[];
  shuffleOptions: boolean;
}

export interface GenerateResponse {
  questions: Question[];
}

export interface GenerationSettings {
  questionsCount: number;
  difficulty: Difficulty;
  language: Language;
  types: QuestionType[];
  shuffleOptions: boolean;
}

export const DEFAULT_SETTINGS: GenerationSettings = {
  questionsCount: 10,
  difficulty: 'medium',
  language: 'ru',
  types: ['single', 'multiple', 'true_false', 'open'],
  shuffleOptions: true,
};
