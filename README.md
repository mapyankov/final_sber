# Генератор тестов из заданного текста

Веб-приложение для автоматической генерации тестов по произвольному тексту (ввод вручную или загрузка файла).

## Требования

- **Node.js** 20+
- **Python** 3.11+
- Windows 10/11, macOS или Linux

## Быстрый старт

```bash
npm run install:all   # один раз: зависимости root + frontend
npm run dev           # backend + frontend + браузер
```

При первом запуске скрипт:

1. Проверит наличие Python 3.11+
2. Создаст `backend/venv` при отсутствии
3. Установит зависимости backend
4. Запустит FastAPI на `http://127.0.0.1:8000`
5. Запустит Vite на `http://127.0.0.1:5173`
6. Откроет браузер

## Структура проекта

```
project-root/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routes/       # health, generate, upload
│   │   ├── services/     # NLP, генерация вопросов
│   │   ├── models/       # Pydantic-схемы
│   │   └── utils/
│   ├── requirements.txt
│   └── tests/
├── frontend/
│   └── src/              # React + TypeScript + Tailwind
├── package.json
├── start-dev.js
└── README.md
```

## API

**Base URL:** `http://localhost:8000/api`

### Health

```http
GET /api/health
```

### Генерация теста

```http
POST /api/generate
Content-Type: application/json

{
  "text": "Париж является столицей Франции...",
  "questionsCount": 10,
  "difficulty": "medium",
  "language": "ru",
  "types": ["single", "multiple", "true_false", "open"],
  "shuffleOptions": true
}
```

### Загрузка файла

```http
POST /api/upload
Content-Type: multipart/form-data

file: <.txt | .docx | .pdf>
```

## Типы вопросов

| Тип | Код |
|-----|-----|
| Один правильный ответ | `single` |
| Несколько ответов | `multiple` |
| Правда / ложь | `true_false` |
| Открытый вопрос | `open` |

## Тестирование

```bash
# Backend
cd backend
venv\Scripts\activate    # Windows
pip install -r requirements.txt
pytest

# Frontend
cd frontend
npm test
```

## Docker (опционально)

```bash
docker-compose up --build
```

## Troubleshooting

### Python не найден

Установите Python 3.11+ с [python.org](https://www.python.org/downloads/) и отметьте «Add to PATH».

### Backend не стартует

```bash
cd backend
python -m venv venv
venv\Scripts\pip install -r requirements.txt
venv\Scripts\python -m uvicorn app.main:app --reload
```

### spaCy модели

При первом запуске модели скачиваются автоматически. Вручную:

```bash
python -m spacy download ru_core_news_sm
python -m spacy download en_core_web_sm
```

Без моделей приложение работает с упрощённым NER.

### Порт занят

Измените порт в `start-dev.js` (backend 8000) или `frontend/vite.config.ts` (5173).

## Расширение (LLM)

Архитектура позволяет подключить OpenAI / transformers в `backend/app/services/question_generator.py` без изменения API.

## Лицензия

MIT
