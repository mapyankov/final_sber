import type { GenerationSettings, QuestionType, Difficulty, Language } from '../types';
import { useI18n } from '../i18n';

interface Props {
  settings: GenerationSettings;
  onChange: (s: GenerationSettings) => void;
}

const ALL_TYPES: QuestionType[] = ['single', 'multiple', 'true_false', 'open'];

export function SettingsPanel({ settings, onChange }: Props) {
  const { t, locale, setLocale } = useI18n();

  const typeLabels: Record<QuestionType, string> = {
    single: t('typeSingle'),
    multiple: t('typeMultiple'),
    true_false: t('typeTrueFalse'),
    open: t('typeOpen'),
  };

  const toggleType = (type: QuestionType) => {
    const types = settings.types.includes(type)
      ? settings.types.filter((x) => x !== type)
      : [...settings.types, type];
    if (types.length === 0) return;
    onChange({ ...settings, types });
  };

  return (
    <div className="space-y-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <h2 className="font-semibold text-lg">{t('settings')}</h2>

      <div>
        <label className="block text-sm font-medium mb-1">
          {t('questionsCount')}: {settings.questionsCount}
        </label>
        <input
          type="range"
          min={1}
          max={100}
          value={settings.questionsCount}
          onChange={(e) =>
            onChange({ ...settings, questionsCount: Number(e.target.value) })
          }
          className="w-full accent-primary-600"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{t('difficulty')}</label>
        <select
          value={settings.difficulty}
          onChange={(e) =>
            onChange({ ...settings, difficulty: e.target.value as Difficulty })
          }
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2"
        >
          <option value="easy">{t('easy')}</option>
          <option value="medium">{t('medium')}</option>
          <option value="hard">{t('hard')}</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{t('language')}</label>
        <select
          value={settings.language}
          onChange={(e) => {
            const lang = e.target.value as Language;
            setLocale(lang);
            onChange({ ...settings, language: lang });
          }}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2"
        >
          <option value="ru">RU</option>
          <option value="en">EN</option>
        </select>
      </div>

      <div>
        <span className="block text-sm font-medium mb-2">{t('questionTypes')}</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ALL_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.types.includes(type)}
                onChange={() => toggleType(type)}
                className="rounded accent-primary-600"
              />
              <span className="text-sm">{typeLabels[type]}</span>
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={settings.shuffleOptions}
          onChange={(e) => onChange({ ...settings, shuffleOptions: e.target.checked })}
          className="rounded accent-primary-600"
        />
        <span className="text-sm">{t('shuffleOptions')}</span>
      </label>
    </div>
  );
}
