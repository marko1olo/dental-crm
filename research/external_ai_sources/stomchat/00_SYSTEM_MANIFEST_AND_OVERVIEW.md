# 🏛️ STOMCHAT: ПОЛНЫЙ АРХИТЕКТУРНЫЙ АТЛАС СИСТЕМЫ

> **Статус документа:** Канонический мастер-манифест архитектуры  
> **Версия системы:** StomChat Production 2026.4 (Post-Refactoring & Red-Team Hardened)  
> **Назначение:** Исчерпывающее техническое руководство для архитекторов, ведущих разработчиков и аудиторов.

---

## 1. НАЗНАЧЕНИЕ И МИССИЯ СИСТЕМЫ

**StomChat** — это автономная клиническая операционная среда и ИИ-ассистент доказательной стоматологии (EBM), работающий в реальном времени внутри Telegram. Система обслуживает закрытое профессиональное сообщество врачей-стоматологов (более 117 000 архивных сообщений, более 420 активных врачей-клиницистов).

В отличие от стандартных ботов-викторин или тривиальных обёрток над ChatGPT/Claude, StomChat представляет собой многослойный отказоустойчивый комплекс, включающий:
1. **Chairside Clinical Peer:** Бот общается строго на равных — как опытный врач у кресла с коллегой. Категорически исключены менторский тон, академическая духота, лекторские нотации и сервисные шаблоны.
2. **Многоуровневую фильтрацию (7-Gate Triage):** Бот не спамит в чат, а вмешивается только при адресации, клинической необходимости или острых профессиональных спорах.
3. **Строгую валидацию безопасности (EBM Validator):** Автоматическая проверка дозировок местных анестетиков (с прецизионным контролем токсичности артикаина у детей), лекарственных взаимодействий, соматических рисков и анатомических ориентиров перед отправкой каждого сообщения.
4. **Собственную базу знаний RAG (12 778 клинических фактов):** База сформирована методом дистилляции 117 000 реальных врачебных кейсов с полнотекстовым поиском FTS5 и семантическим ранжированием BM25.
5. **Мультимодальное зрение (Computer Vision):** Анализ ОПТГ (панорамных снимков), КЛКТ (3D-срезов), прицельных рентгенограмм и интраоральных фотографий.
6. **Голосовой конвейер (Speech-to-Text):** Транскрибация аудиосообщений через Whisper/Gemini с автоматической фонетической коррекцией стоматологической терминологии (по словарю `dental_vocab.py`).
7. **Клинические суперсилы (51 интерактивная карта):** SOS-протоколы неотложных состояний (включая протокол LAST при интоксикации анестетиками, анафилаксию, поломку инструментов), шаблоны Формы № 043/у, чекер соматических рисков, батлы материалов и симулятор консилиума.
8. **Долговременную клиническую память:** Автоматическое ведение досье на каждого врача (специализация, используемые протоколы, типичные ошибки, уровень экспертизы).
9. **Автоматическую дайджест-систему:** Ежедневные и еженедельные выжимки чата с публикацией на Telegraph и автоматической версткой PDF-версий журнального качества.

---

## 2. КАРТА КОМПОНЕНТОВ И СТЕК ТЕХНОЛОГИЙ

```
                                    ┌────────────────────────────────────────────────────────┐
                                    │               TELEGRAM ECOSYSTEM (MTProto)             │
                                    │    - Group Chat (Врачебный консилиум)                  │
                                    │    - Private Messages (Персональный ассистент)         │
                                    │    - Inline Callbacks (Интерактивные суперсилы)         │
                                    └───────────────────────────┬────────────────────────────┘
                                                                │
                                                                ▼
                                    ┌────────────────────────────────────────────────────────┐
                                    │           CORE RUNTIME & DISPATCHER (main.py)          │
                                    │  - Telethon Client Loop (events.NewMessage)            │
                                    │  - Single-Instance Mutex Lock                          │
                                    │  - Per-User Async Locks & Burst Queues                 │
                                    │  - Historical Message Catch-Up Sync                    │
                                    │  - Background Schedulers & Health Watchdogs            │
                                    └──────────────┬──────────────────────────┬──────────────┘
                                                   │                          │
                 ┌─────────────────────────────────┴──┐                      ┌┴─────────────────────────────────┐
                 │                                    │                      │                                  │
                 ▼                                    ▼                      ▼                                  ▼
   ┌───────────────────────────┐        ┌───────────────────────────┐  ┌───────────────────────────┐      ┌───────────────────────────┐
   │    GROUP MESSAGE TRIAGE   │        │     PRIVATE MESSAGE BUS   │  │       VOICE PIPELINE      │      │      VISION PIPELINE      │
   │  - Gate 1: Entity Filter  │        │  - Per-user Burst Queue   │  │  - OGG/Opus Download      │      │  - Album Grouping         │
   │  - Gate 2: Cooldown Guard │        │  - Doctor Memory Inject   │  │  - FFmpeg to 16kHz WAV    │      │  - Image Resizing/Hash    │
   │  - Gate 3: Mention/Reply  │        │  - Style Selector         │  │  - Whisper / Gemini STT   │      │  - Gemini Multimodal API  │
   │  - Gate 4: Clinical Class.│        │  - Interactive Cases      │  │  - Dental Vocab Repair    │      │  - Caching in Disk DB     │
   │  - Gate 5: Passive Case   │        │  - Clinical Superpowers   │  │  - Auto-publish in thread │      │  - Clinical OCR & Report  │
   │  - Gate 6: Dispute Referee│        └─────────────┬─────────────┘  └─────────────┬─────────────┘      └─────────────┬─────────────┘
   │  - Gate 7: Cost/Token Budg│                      │                              │                                  │
   └─────────────┬─────────────┘                      │                              │                                  │
                 │                                    │                              │                                  │
                 └────────────────────────────────────┼──────────────────────────────┴──────────────────────────────────┘
                                                      │
                                                      ▼
                                    ┌────────────────────────────────────────────────────────┐
                                    │            CONTEXT & KNOWLEDGE ENGINE (RAG)            │
                                    │  - Dynamic Chat History Fetch (fetch_dynamic_context)  │
                                    │  - RAG FTS5 Search on stomat_wiki.db (12 778 facts)    │
                                    │  - Clinician Dossier Fetch (user_memory.py)            │
                                    │  - Clinical Superpowers Mesh (51 cards cross-linked)   │
                                    └───────────────────────────┬────────────────────────────┘
                                                                │
                                                                ▼
                                    ┌────────────────────────────────────────────────────────┐
                                    │             MULTI-TIER LLM CASCADE ENGINE              │
                                    │  - Tier 1: Google Gemini 1.5 Pro / 2.0 Flash           │
                                    │  - Tier 2: Groq Llama-3.3-70b-versatile Fallback       │
                                    │  - Tier 3: DeepSeek-R1-distill-llama-70b Fallback      │
                                    │  - Key Pool Rotation & 2-3s Cooldown Safety Rules      │
                                    │  - Exponential Backoff & 429 / 503 Retry Handlers       │
                                    └───────────────────────────┬────────────────────────────┘
                                                                │
                                                                ▼
                                    ┌────────────────────────────────────────────────────────┐
                                    │         EBM VALIDATOR & CLINICAL SAFETY ENGINE         │
                                    │  - check_response_quality() [Mandatory Gate]           │
                                    │  - Pediatric Local Anesthesia Safety Calculator        │
                                    │  - Stop-Factor Lexicon (Toxic doses, contraindications)│
                                    │  - RegEx Meta-Purge (Erasing "Вердикт", "Арбитраж")    │
                                    │  - HTML Sanitization (Telegram entity protection)       │
                                    └───────────────────────────┬────────────────────────────┘
                                                                │
                                                                ▼
                                    ┌────────────────────────────────────────────────────────┐
                                    │               TELEGRAM SAFE DELIVERY ENGINE            │
                                    │  - Message Chunking (4096-char safe boundary splitting)│
                                    │  - FloodWait Handling with Automatic Backoff           │
                                    │  - Deduplication & Bot-Sent Message Registry           │
                                    │  - Interactive Next-Best-Action (NBA) Buttons          │
                                    └────────────────────────────────────────────────────────┘
```

---

## 3. СТРУКТУРА КАТАЛОГА ДОКУМЕНТАЦИИ

На рабочем столе в папке `C:\Users\danat\Desktop\STOMCHAT_PROMPTS_AND_LOGIC` развернута полная библиотека документов:

| Файл | Описание |
| :--- | :--- |
| `00_SYSTEM_MANIFEST_AND_OVERVIEW.md` | Мастер-манифест, топология, технологический стек и глобальный data flow |
| `01_RUNTIME_SUPERVISOR_AND_EVENT_LOOP.md` | Устройство `main.py`, `runtime_guard.py`, `start.bat`, очереди событий и задачи здоровья |
| `02_TRIAGE_7GATES_AND_ROUTING_ENGINE.md` | Алгоритмы фильтрации сообщений, 7 шлюзов допуска, арбитраж споров, медиа-очереди |
| `03_PROMPTS_ENCYCLOPEDIA_VERBATIM.md` | **Полный каталог всех промптов системы досимвольно** (без сокращений и многоточий) |
| `04_LLM_CASCADE_FAILOVER_AND_PACING.md` | Каскад Gemini ↔ Groq ↔ DeepSeek, ротация API-ключей, правила cooldown и бэкофф |
| `05_EBM_VALIDATION_AND_CLINICAL_SAFETY.md` | Рецензент безопасности, педиатрические формулы анестезии, стоп-факторы, санитизация |
| `06_COMPUTER_VISION_AND_MULTIMODAL_PIPELINE.md` | Анализ снимков (ОПТГ, КЛКТ, фото), группировка альбомов, кэширование и OCR |
| `07_VOICE_PIPELINE_AND_SPEECH_RECOGNITION.md` | Голосовой пайплайн, FFmpeg, Whisper/Gemini STT, словарь стоматологической фонетики |
| `08_DATABASE_SCHEMAS_AND_STORAGE_ENGINE.md` | Полные DDL-схемы, таблицы, индексы баз `stomat_bot.db`, `stomat_wiki.db`, `stomat_archive.db` |
| `09_KNOWLEDGE_BASE_RAG_AND_DISTILLER.md` | Дистилляция 117 тыс. сообщений в 12 778 фактов, FTS5 полнотекстовый поиск, BM25 |
| `10_SUMMARIZATION_DIGESTS_AND_TELEGRAPH.md` | Пакетные дайджесты, генерация статей Telegraph, журнальная верстка PDF через WeasyPrint |
| `11_CLINICAL_SUPERPOWERS_AND_SOS_MESH.md` | Все 51 интерактивная карточка (SOS-спасение, 043/у, фармакология, батлы, консилиумы) |
| `12_TEST_SUITE_CONTRACTS_AND_SAFETY_SUITE.md` | Реестр тестов (AST-контракты, red-team атаки, валидаторы дозировок, изоляция) |
| `13_DEVELOPER_OPERATIONS_MANUAL.md` | Инструкция по развертыванию, переменным окружения, запуску, мониторингу и траблшутингу |
| `all_system_prompts.py` | Исполняемый Python-модуль, экспортирующий все промпты системы в виде констант |
| `triage_rules_engine.py` | Исполняемый Python-модуль с чистой реализацией всех 7 шлюзов триажа и регулярок |
| `database_schemas_reference.py` | Исполняемый скрипт для валидации, инспекции и инициализации всех БД |

---

## 4. СВОДНЫЕ ТЕХНИЧЕСКИЕ ХАРАКТЕРИСТИКИ

| Параметр | Значение | Примечание |
| :--- | :--- | :--- |
| **Язык разработки** | Python 3.10+ (тестирован на 3.13) | Асинхронный asyncio / Telethon |
| **Telegram фреймворк** | Telethon (MTProto Client API) | Прямое соединение без Bot API ограничений |
| **Базы данных** | SQLite3 (WAL-режим) | `stomat_bot.db`, `stomat_wiki.db`, `stomat_archive.db` |
| **Объем базы знаний** | 12 778 дистиллированных фактов | Полнотекстовый поиск FTS5 |
| **Количество суперсил** | 51 карточка (6 категорий) | Каждая имеет 4 перекрестные ссылки (Crosslink Mesh) |
| **Основной LLM-провайдер** | Google Gemini (1.5 Pro, 2.0 Flash) | Ротация ключей с задержкой 2-3с |
| **Резервный LLM-провайдер** | Groq (Llama-3.3-70b, DeepSeek-R1) | Мгновенный failover при 429/503 |
| **Speech-to-Text** | Whisper Local / Gemini Multimodal | Фонетический постпроцессинг терминологии |
| **Публикация дайджестов** | Telegraph API + WeasyPrint HTML/PDF | Автоматический постинг и закреп в чате |
| **Процессный контроль** | `runtime_guard.py` + `start.bat` | Автоперезапуск, контроль утечек RAM, убийство зомби |
