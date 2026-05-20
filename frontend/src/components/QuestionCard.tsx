import type { Question } from '../types';
import { useI18n } from '../i18n';

interface Props {
  question: Question;
  index: number;
  showAnswers?: boolean;
}

const typeBadge: Record<string, string> = {
  single: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  multiple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  true_false: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  open: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export function QuestionCard({ question, index, showAnswers = true }: Props) {
  const { t } = useI18n();

  return (
    <article className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <div className="flex flex-wrap items-start gap-2 mb-3">
        <span className="font-bold text-primary-600 dark:text-primary-400">
          {index + 1}.
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${typeBadge[question.type]}`}>
          {question.type}
        </span>
      </div>
      <p className="text-base mb-3">{question.question}</p>

      {question.options && (
        <ul className="space-y-1 mb-3">
          {question.options.map((opt, i) => {
            const isCorrect = question.correctAnswers.includes(i);
            return (
              <li
                key={i}
                className={`text-sm px-3 py-1.5 rounded-lg ${
                  showAnswers && isCorrect
                    ? 'bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-700 font-medium'
                    : 'bg-gray-50 dark:bg-gray-700/50'
                }`}
              >
                <span className="font-mono mr-2">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </li>
            );
          })}
        </ul>
      )}

      {question.type === 'open' && showAnswers && (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          {t('openAnswerHint')}
        </p>
      )}

      {showAnswers && question.type !== 'open' && question.options && (
        <p className="text-sm text-green-700 dark:text-green-400">
          {question.correctAnswers.length > 1 ? t('correctAnswers') : t('correctAnswer')}:{' '}
          {question.correctAnswers
            .map((i) => `${String.fromCharCode(65 + i)}. ${question.options![i]}`)
            .join(', ')}
        </p>
      )}
    </article>
  );
}
