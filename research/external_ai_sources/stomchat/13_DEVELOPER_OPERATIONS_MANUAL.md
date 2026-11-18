# 🛠️ 13. ИНСТРУКЦИЯ ПО ЭКСПЛУАТАЦИИ И РАЗВЕРТЫВАНИЮ (DEV OPS MANUAL)

> **Назначение:** Полное практическое руководство по установке, настройке переменных окружения, мониторингу, аварийному восстановлению и обслуживанию бота StomChat.

---

## 1. СИСТЕМНЫЕ ТРЕБОВАНИЯ И ЗАВИСИМОСТИ

1. **Окружение:** Windows 10/11 / Windows Server или Linux (Ubuntu 22.04+).
2. **Интерпретатор:** Python 3.10+ (рекомендуется Python 3.13 с флагом `-X utf8`).
3. **Внешние утилиты:**
   - **`ffmpeg`:** Обязателен для голосового конвейера (конвертация OGG -> WAV). Должен быть прописан в системном `PATH` либо находиться в корневой папке проекта.
   - **GTK3 / WeasyPrint зависимости:** Необходимы для генерации еженедельных PDF-дайджестов (`digest_pdf.py`).

---

## 2. КОНФИГУРАЦИЯ И ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ (`.env` / `config.py`)

В корне проекта должен присутствовать файл `.env` со следующими ключами:

```ini
# --- TELEGRAM MTPROTO CREDENTIALS ---
TELEGRAM_API_ID=1234567
TELEGRAM_API_HASH=abcdef0123456789abcdef0123456789
BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ
CHAT_ID=-1001234567890

# --- LLM API KEYS (ПУЛЫ КЛЮЧЕЙ ЧЕРЕЗ ЗАПЯТУЮ) ---
GEMINI_API_KEYS=AIzaSyA...,AIzaSyB...,AIzaSyC...
GROQ_API_KEYS=gsk_...,gsk_...

# --- НАСТРОЙКИ КУЛДАУНОВ И ТРИАЖА ---
REFEREE_COOLDOWN_MINUTES=15
PASSIVE_GATE_CONFIDENCE_THRESHOLD=0.88
PM_BURST_DEBOUNCE_SECONDS=7.0

# --- ПУТИ К БАЗАМ ДАННЫХ И ЛОГАМ ---
DB_PATH=stomat_bot.db
WIKI_DB_PATH=stomat_wiki.db
ARCHIVE_DB_PATH=stomat_archive.db
STOMCHAT_LOG_PATH=bot_runtime.log
```

---

## 3. ПРОЦЕДУРА ЗАПУСКА

### 3.1. Запуск в режиме разработки (Debugging)
```bash
python -X utf8 main.py
```
*При запуске проверяется single-instance сокет (порт 49152). Если порт занят другим процессом, запуск блокируется.*

### 3.2. Запуск в продакшн под супервизором (Production)
```bash
# Запуск через Windows Batch супервизор с бесконечным авторестартом:
start.bat
```
Супервизор перехватывает сбои, пишет stdout/stderr в `bot_runtime.log` и при падении процесса перезапускает бота через 5 секунд.

### 3.3. Запуск независимого сторожевого пса (Watchdog)
В отдельном окне или службе:
```bash
python -X utf8 runtime_guard.py
```

---

## 4. МОНИТОРИНГ И ДИАГНОСТИКА

1. **Просмотр логов в реальном времени:**
   ```powershell
   Get-Content bot_runtime.log -Wait -Tail 50
   ```
2. **Проверка файла здоровья:**
   Каждые 60 секунд обновляется `stomat_health.json` (timestamp, статус подключения, размер очередей, потребление RAM).
3. **Клинические диагностические команды в Telegram:**
   - `/status` — Проверка доступности ключей LLM и аптайма.
   - `/help` — Вызов перечня всех доступных клинических суперсил.
   - `/043`, `/rx`, `/sos`, `/vs`, `/concilium` — Тестирование интерактивных модулей.

---

## 5. АВАРИЙНЫЕ СИТУАЦИИ И ИХ РЕШЕНИЕ (TROUBLESHOOTING)

| Симптом | Причина | Действие администратора |
| :--- | :--- | :--- |
| `Another instance is already running!` | Завис старый процесс `python.exe`, порт 49152 занят | Найти PID через `netstat -ano \| findstr 49152` и завершить процесс: `taskkill /PID <PID> /F` |
| `sqlite3.OperationalError: database is locked` | Зависла пишущая транзакция в стороннем скрипте | Выполнить сброс журнала WAL: `sqlite3 stomat_bot.db "PRAGMA wal_checkpoint(TRUNCATE);"` |
| Бот перестал отвечать на голосовые | Отсутствует или поврежден `ffmpeg.exe` | Проверить команду `ffmpeg -version` в терминале |
| Бот замолчал в группе | Сработал триггер тишины (`is_silenced`) после критики | Дождаться истечения таймера (30 мин) или удалить запись в `assistant_state.json` |
| Ошибка `429 ResourceExhausted` на всех ключах Gemini | Исчерпан суточный лимит Google API | Бот автоматически переключится на Groq Llama-3.3-70b. При необходимости добавить новые ключи в `.env` |
