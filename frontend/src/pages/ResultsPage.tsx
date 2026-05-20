import { useLocation, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { QuestionCard } from '../components/QuestionCard';
import { useI18n } from '../i18n';
import type { Question } from '../types';
import { exportDocx, exportJson, exportPdf } from '../utils/export';

export function ResultsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const questions = (location.state as { questions?: Question[] })?.questions ?? [];

  if (!questions.length) {
    return (
      <Layout>
        <p className="text-center text-gray-500">{t('noQuestions')}</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-4 mx-auto block px-6 py-2 rounded-lg bg-primary-600 text-white"
        >
          {t('back')}
        </button>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold">
          {t('results')} ({questions.length})
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {t('back')}
          </button>
          <button
            type="button"
            onClick={() => exportJson(questions)}
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            {t('exportJson')}
          </button>
          <button
            type="button"
            onClick={() => exportPdf(questions, t('appTitle'))}
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            {t('exportPdf')}
          </button>
          <button
            type="button"
            onClick={() => exportDocx(questions, t('appTitle'))}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700"
          >
            {t('exportDocx')}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <QuestionCard key={q.id} question={q} index={i} showAnswers />
        ))}
      </div>
    </Layout>
  );
}
