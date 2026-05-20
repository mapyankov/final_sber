import { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import type { Language } from '../types';

type Locale = Language;

const translations = {
  ru: {
    appTitle: 'Генератор тестов',
    appSubtitle: 'Автоматическая генерация тестов из произвольного текста',
    textInput: 'Исходный текст',
    textPlaceholder: 'Вставьте или введите текст для генерации теста...',
    uploadFile: 'Загрузить файл',
    uploadHint: '.txt, .docx, .pdf (до 20 МБ)',
    settings: 'Настройки генерации',
    questionsCount: 'Количество вопросов',
    difficulty: 'Сложность',
    easy: 'Лёгкая',
    medium: 'Средняя',
    hard: 'Сложная',
    language: 'Язык',
    questionTypes: 'Типы вопросов',
    typeSingle: 'Один ответ',
    typeMultiple: 'Несколько ответов',
    typeTrueFalse: 'Правда / ложь',
    typeOpen: 'Открытый вопрос',
    shuffleOptions: 'Перемешивать варианты',
    generate: 'Сгенерировать',
    generating: 'Генерация...',
    results: 'Результаты',
    back: 'Назад',
    export: 'Экспорт',
    exportJson: 'JSON',
    exportPdf: 'PDF',
    exportDocx: 'DOCX',
    correctAnswer: 'Правильный ответ',
    correctAnswers: 'Правильные ответы',
    chars: 'символов',
    maxChars: 'Максимум 50 000 символов',
    fileTooLarge: 'Файл слишком большой (максимум 20 МБ)',
    unsupportedFormat: 'Неподдерживаемый формат файла',
    textTooShort: 'Текст слишком короткий (минимум 10 символов)',
    themeLight: 'Светлая тема',
    themeDark: 'Тёмная тема',
    noQuestions: 'Вопросы не сгенерированы',
    optionLabel: 'Вариант',
    openAnswerHint: 'Открытый вопрос — эталонный ответ в тексте вопроса',
  },
  en: {
    appTitle: 'Test Generator',
    appSubtitle: 'Automatic test generation from arbitrary text',
    textInput: 'Source text',
    textPlaceholder: 'Paste or enter text to generate a test...',
    uploadFile: 'Upload file',
    uploadHint: '.txt, .docx, .pdf (up to 20 MB)',
    settings: 'Generation settings',
    questionsCount: 'Number of questions',
    difficulty: 'Difficulty',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    language: 'Language',
    questionTypes: 'Question types',
    typeSingle: 'Single choice',
    typeMultiple: 'Multiple choice',
    typeTrueFalse: 'True / False',
    typeOpen: 'Open question',
    shuffleOptions: 'Shuffle options',
    generate: 'Generate',
    generating: 'Generating...',
    results: 'Results',
    back: 'Back',
    export: 'Export',
    exportJson: 'JSON',
    exportPdf: 'PDF',
    exportDocx: 'DOCX',
    correctAnswer: 'Correct answer',
    correctAnswers: 'Correct answers',
    chars: 'characters',
    maxChars: 'Maximum 50,000 characters',
    fileTooLarge: 'File too large (max 20 MB)',
    unsupportedFormat: 'Unsupported file format',
    textTooShort: 'Text too short (minimum 10 characters)',
    themeLight: 'Light theme',
    themeDark: 'Dark theme',
    noQuestions: 'No questions generated',
    optionLabel: 'Option',
    openAnswerHint: 'Open question — reference answer is in the question text',
  },
} as const;

export type TranslationKey = keyof typeof translations.ru;

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('ru');
  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: (key: TranslationKey) => translations[locale][key],
    }),
    [locale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
