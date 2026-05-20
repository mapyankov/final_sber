import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateTest, uploadFile, getErrorMessage } from '../api/client';
import { Layout } from '../components/Layout';
import { SettingsPanel } from '../components/SettingsPanel';
import { useI18n } from '../i18n';
import { DEFAULT_SETTINGS, type GenerationSettings } from '../types';

const MAX_CHARS = 50000;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_EXT = ['.txt', '.docx', '.pdf'];

export function HomePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState('');
  const [settings, setSettings] = useState<GenerationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleTextChange = (value: string) => {
    if (value.length <= MAX_CHARS) setText(value);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      setError(t('unsupportedFormat'));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(t('fileTooLarge'));
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const result = await uploadFile(file);
      setText(result.text.slice(0, MAX_CHARS));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (text.trim().length < 10) {
      setError(t('textTooShort'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await generateTest({
        text: text.trim(),
        questionsCount: settings.questionsCount,
        difficulty: settings.difficulty,
        language: settings.language,
        types: settings.types,
        shuffleOptions: settings.shuffleOptions,
      });
      navigate('/results', { state: { questions: result.questions } });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t('textInput')}</label>
            <textarea
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={t('textPlaceholder')}
              rows={12}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 resize-y focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} {t('chars')}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.docx,.pdf"
              className="hidden"
              onChange={handleFile}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {uploading ? '...' : t('uploadFile')}
            </button>
            <span className="text-xs text-gray-500">{t('uploadHint')}</span>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
            >
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || text.trim().length < 10}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? t('generating') : t('generate')}
          </button>
        </div>

        <div className="lg:col-span-1">
          <SettingsPanel settings={settings} onChange={setSettings} />
        </div>
      </div>
    </Layout>
  );
}
