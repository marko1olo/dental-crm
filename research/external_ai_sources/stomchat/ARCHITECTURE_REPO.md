# StomChat Bot — Гайд по архитектуре: промпты, триажи, потоки

> Актуально для коммита `81a244f` (2026-09-24). Все номера строк ориентировочные — файл живёт и меняется.

---

## 1. Файловая карта

```
stomchat/
├── main.py           # Точка входа. Event-loop, Telethon-хендлеры, PM burst workers.
├── assistant.py      # Монолит 13 500+ строк. Вся клиническая логика, промпты, триажи.
├── blocking_tools.py # Всё что блокирует event loop. generate_gemini_text_async() живёт здесь.
├── gemini_client.py  # Каскад Gemini API + Groq fallback. Ротация ключей, rate limiting.
├── user_memory.py    # Персистентная память врача. SQLite. PM история, портрет, закладки.
├── database.py       # Низкоуровневые SQLite-операции. WAL mode. stomat_bot.db.
├── runtime_guard.py  # Регистрация фоновых задач (runtime_guard.create_task). Watchdog.
├── config.py         # API ключи, токены, chat_id, флаги. НЕ коммитится.
└── config.example.py # Шаблон конфига для новых инстансов.
```

Остальные файлы (`vision.py`, `web_lookup.py`, `search_engine.py` и т.д.) — вспомогательные инструменты, вызываемые из `assistant.py`.

---

## 2. Где хранятся промпты

### Жёстко закодированные промпты — `assistant.py`

Все системные роли и инструкции встроены прямо в код как f-строки внутри функций. **Никаких отдельных файлов `.txt` или `.yaml` нет.**

| Блок | Строки | Что это |
|---|---|---|
| `STYLE_PROMPTS` dict | ~L144 | 3 стиля: `colleague_friendly`, `clinical_dry`, `humor_cynic`. Выбирается командой `/style`. |
| `style_instruction_block()` | ~L155 | Формирует вставку про стиль в групповой промпт. |
| `_JAILBREAK_PATTERNS` | ~L2977 | Regex-список попыток взлома/инъекций. |
| Промпт `check_dialogue_continuation_triage` | ~L487 | Решает: продолжать ли диалог (YES/NO). |
| Промпт `check_response_quality` (валидатор) | ~L2620–2700 | Прогоняет черновик ответа через отдельный LLM-вызов, проверяет клиническую безопасность. |
| Промпт `check_and_trigger_assistant` (групповой) | ~L3800–4115 | Основной системный промпт при ответе в группе. Собирается динамически: RAG-справка + архив + история. |
| Промпт `check_and_trigger_assistant_media` | ~L4350–4560 | Вариант для сообщений с изображением в группе. |
| Промпт NaOCl SOS-протокол | ~L5210–5260 | Встроен в карточку неотложной ситуации `v_naocl`. |
| Промпт эндокардита | ~L6600–6630 | Протокол антибиотикопрофилактики. |
| Промпт `handle_private_message` (ЛС с фото) | ~L9380–9480 | Системная роль + инструкции для фотоанализа в ЛС. |
| Промпт `handle_private_message` (ЛС клиника) | ~L9485–9510 | Системная роль + инструкции для клинического диалога в ЛС. |
| Промпт `handle_private_message` (ЛС свободная тема) | ~L9510–9540 | Для нестоматологических бесед. |
| Промпт `check_bot_mention_trigger` | ~L9830–9842 | Когда бота упомянули через @. |

### Динамические переменные внутри промптов

Каждый промпт в группе собирается из кусков:

```python
system_role = f"""Ты — врач-стоматолог...
{style_prompt_text}          # STYLE_PROMPTS[выбранный_стиль]
{portrait}                   # user_memory: AI-портрет врача
{group_msgs_str}             # последние N сообщений из чата
"""

prompt = f"""
{wiki_corpus}                # RAG из stomat_wiki.db (SQLite FTS)
{archive_corpus}             # архив обсуждений чата
...от {sanitize_user_input_xml(sender_first_name or "коллеги")}...
"""
```

---

## 3. Как работают триажи

Бот **не отвечает на каждое сообщение в группе**. Перед генерацией сообщение проходит несколько ворот. Каждый шаг может остановить поток.

### 3.1 Групповой путь — `check_and_trigger_assistant` (~L3413)

```
Входящее сообщение
        │
        ▼
[GATE 1] Базовые фильтры (синхронно, ~1ms)
  - Слишком короткий текст → игнор
  - Отправитель — бот → игнор
  - _ACTIVE_DIALOGUE_THREADS: уже обрабатываем эту цепочку? → игнор
  - check_user_cooldown: кулдаун по user_id
        │
        ▼
[GATE 2] Проверка триггера
  - Прямой reply на сообщение бота?
  - Упоминание @бота?
  - Ключевые стоматологические слова?
  - Клинический контекст?
        │ YES → продолжаем
        │ NO  → check_and_react_standalone (реакция без ответа, 10% шанс)
        ▼
[GATE 3] Педиатрическая безопасность (синхронно)
  check_pediatric_anesthesia_safety()
  - Аспирин < 15 лет → жёсткий блок
  - Нимесулид < 12 лет → жёсткий блок
  - Лидокаин-гели (грудные дети) → жёсткий блок
  - Тетрациклины < 8 лет → жёсткий блок
  - Превышение доз анестетика → блок
        │
        ▼
[GATE 4] Jailbreak-детектор (синхронно)
  _JAILBREAK_PATTERNS (20+ regex)
  - "Ignore previous instructions", "[SYSTEM MESSAGE]", и т.д.
  → блок, ответ: "это клинический бот"
        │
        ▼
[GATE 5] Диалоговый триаж (async LLM ~1–3с)
  check_dialogue_continuation_triage()
  - Только если это reply в цепочке ПОСЛЕ предыдущего ответа бота
  - LLM (thinking_level=LOW) решает: YES или NO
  - Timeout → эвристика по "?" в тексте
        │ NO  → молчим
        │ YES → продолжаем
        ▼
[GATE 6] Генерация ответа (async ~5–30с)
  generate_gemini_text_async(prompt, thinking_level=HIGH, timeout=120)
  Собирает: RAG-справку + архив + стиль + историю диалога
        │
        ▼
[GATE 7] Валидатор (async LLM ~5–15с)
  check_response_quality()
  - Отдельный LLM-вызов (thinking_level=LOW)
  - Проверяет: нет ли дозовых ошибок, галлюцинаций, запрещённых рекомендаций
  - ok=False → черновик НЕ отправляется, новая попытка (до 3 раз)
  - Валидатор недоступен (503) + invited=True → пропускаем, WARNING в лог
        │
        ▼
  Отправка + send_message_chunks_async() (нарезка если > 4000 символов)
```

### 3.2 PM-путь

```
PM-событие → _PM_PENDING_QUEUES[user_id].put()
                     │
              run_burst_worker запущен?
              └─ нет → запустить → ждать 5с burst window → flush
              └─ да  → добавить в очередь; после генерации текущего
                        while True drain всё накопившееся
                     │
                     ▼
handle_private_message_bundle()
  - Объединяет бурст в один запрос
  - Голосовое? → whisper транскрипт
  - Изображение? → vision pipeline → base64 + описание
                     │
                     ▼
handle_private_message()
  - Проверка: врач есть в базе?
  - RAG из stomat_wiki.db
  - Портрет врача из user_memory
  - Недавние группы сообщений из чата
  - Выбор ветки промпта: фото / клиника / свободная тема
  - Генерация → Валидатор (PM-версия)
  - MED-01 guard: emoji в rejection ≠ auto-approve если clinical_danger
  - [MED-06] флегмона/Ludwig → обязательно "🚨 СКОРАЯ 112"
  - Отправка + фоновый supplement job (runtime_guard.create_task)
```

### 3.3 Реакции без ответа — `check_and_react_standalone` (~L320)

Когда GATE 2 не находит триггера, бот может поставить emoji-реакцию:

```
  → per-sender cooldown: 5 мин
  → глобальный слот-пул: 8 реакций/час на весь чат
  → вероятностный гейт: 10%
  → LLM (thinking_level=LOW, 15с) выбирает emoji
  → _try_send_reaction()
     ├─ [SYS-07] _REACTION_FLOOD_UNTIL → пропустить если активен FloodWait
     ├─ per-sender cooldown: 60с
     └─ уже поставлена реакция? → пропустить
```

---

## 4. LLM-каскад

`generate_gemini_text_async()` в `blocking_tools.py` — единственная точка вызова LLM. Принимает `context` с `thinking_level`:

| `thinking_level` | Когда используется | Timeout |
|---|---|---|
| `"LOW"` | Триажи, реакции, валидатор, диалоговый тест | 15–60s |
| `"HIGH"` | Основная генерация ответа в группе и ЛС | 120s |

`gemini_client.py` держит каскад моделей. При 503/timeout/ошибке — следующая модель. Groq — крайний fallback. Ключи ротируются автоматически. При FloodWait — обязательная пауза ≥3с между запросами к тому же провайдеру.

---

## 5. Память врача

| Что | Где хранится | TTL/Ёмкость |
|---|---|---|
| История PM-диалога | SQLite `stomat_bot.db` | 50 последних сообщений |
| Портрет врача (AI-резюме) | SQLite | Пересчитывается раз в 4ч |
| Выбранный стиль `/style` | SQLite | Бессрочно |
| Закладки `/save` | SQLite | Бессрочно |
| `_LAST_PM_UPDATE_TS` | TTLCache(maxsize=5000, ttl=3600) | В памяти, 1ч |
| `_ACTIVE_PM_REQUESTS` | TTLCache(maxsize=5000, ttl=600) | В памяти, 10мин |
| `_ACTIVE_DIALOGUE_THREADS` | TTLCache | В памяти |

RAG-база фактов: `stomat_wiki.db` — 12 778 записей, SQLite FTS5. Пополняется через `distiller.py`.

---

## 6. Команды бота

| Команда | Что делает |
|---|---|
| `/help` | Меню помощи |
| `/style` | Выбор стиля общения |
| `/sos` | Неотложные протоколы (NaOCl, кровотечение, Ludwig) |
| `/ask <вопрос>` | Прямой вопрос в группе без триггера |
| `/save` | Сохранить сообщение в закладки |
| `/quiz` | Клинический тест |
| `/digest` | Дайджест обсуждений за период |
| `/case` | Генерация клинического случая |
| `/anesthesia` | Калькулятор доз анестетика + педиатрические стоп-факторы |
| `/stats` | Статистика бота |

---

## 7. Safety-guards (после audit-патча 2026-09-24)

| Что защищает | Механизм |
|---|---|
| Педиатрические дозы | Синхронный стоп-фактор до LLM (`check_pediatric_anesthesia_safety`) |
| Jailbreak / prompt injection | Regex `_JAILBREAK_PATTERNS` (20+ паттернов) |
| Inject через имя отправителя | `sanitize_user_input_xml(sender_first_name)` во всех 5 местах промпта |
| Клинически ошибочный ответ | LLM-валидатор `check_response_quality()`, до 3 попыток |
| Emoji bypass в PM | `has_clinical_danger` guard (MED-01) |
| SOS в ЛС (флегмона, Ludwig) | Явный carve-out в системном промпте (MED-06) |
| FloodWait реакций | `_REACTION_FLOOD_UNTIL` global cooldown (SYS-07) |
| Накопление памяти (leaks) | TTLCache вместо plain dict для PM-структур (SYS-05) |

---

## 8. Известные нерешённые ограничения

- **MED-05**: `check_response_quality()` не вызывается для Quiz, Case simulator, Fallback, Summary, Referee. Эти ветки отдают контент без клинической проверки.
- **MED-09**: Протокол LAST (Local Anesthetic Systemic Toxicity) / Интралипид 20% полностью отсутствует в кодовой базе.
- **SYS-02**: TOCTOU в `_ACTIVE_DIALOGUE_THREADS` — ~3–6 секунд между fast-fail check (~L3416) и add (~L3735). Дублирующие ответы теоретически возможны при точном совпадении тайминга.

---

## 9. Быстрый старт для разработчика

```bash
# 1. Конфиг
cp config.example.py config.py
# Заполнить: BOT_TOKEN, API_ID, API_HASH, GEMINI_API_KEYS, GROQ_API_KEY, CHAT_ID

# 2. Зависимости
pip install -r requirements.txt

# 3. Запуск (supervisor loop)
start.bat

# 4. Логи
tail -f bot.log
tail -f bot_supervisor.log

# 5. Синтаксис после правок
python -m py_compile assistant.py
python -m py_compile main.py
python -m py_compile user_memory.py
```

> Промпты менять в `assistant.py` в соответствующей f-строке функции. После правки — обязательно `py_compile`, потом kill PID бота (supervisor перезапустит через 5с).
