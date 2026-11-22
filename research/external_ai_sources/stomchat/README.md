# 🦷 STOMCHAT ARCHITECTURAL ATLAS & CODEBASE REPOSITORY

Добро пожаловать в каноническую библиотеку архитектуры, промптов и алгоритмов системы StomChat.
Данная папка содержит исчерпывающее, законченное техническое описание всех 12 подсистем бота, все используемые промпты (досимвольно verbatim), исполняемые эталонные Python-модули и DDL-схемы баз данных.

---

## 🗂️ НАВИГАЦИОННЫЙ РЕЕСТР ДОКУМЕНТОВ

### Фундаментальная архитектура и устройство системы
1. [00_SYSTEM_MANIFEST_AND_OVERVIEW.md](file:///C:/Users/danat/Desktop/STOMCHAT_PROMPTS_AND_LOGIC/00_SYSTEM_MANIFEST_AND_OVERVIEW.md)  
   *Глобальный мастер-манифест, архитектурные слои, топология компонентов, сводная таблица характеристик и стек технологий.*
2. [01_RUNTIME_SUPERVISOR_AND_EVENT_LOOP.md](file:///C:/Users/danat/Desktop/STOMCHAT_PROMPTS_AND_LOGIC/01_RUNTIME_SUPERVISOR_AND_EVENT_LOOP.md)  
   *Событийный цикл Telethon (`main.py`), single-instance сокет-локер, дебаунс пакетирования сообщений в ЛС (`_PM_PENDING_QUEUES`), сторожевые псы RAM/Latency и скрипт супервизора `start.bat`.*
3. [02_TRIAGE_7GATES_AND_ROUTING_ENGINE.md](file:///C:/Users/danat/Desktop/STOMCHAT_PROMPTS_AND_LOGIC/02_TRIAGE_7GATES_AND_ROUTING_ENGINE.md)  
   *Исчерпывающий алгоритм 7 шлюзов допуска групповых сообщений, пассивный шлюз кейсов, медиа-триаж альбомов и триаж клинических споров (коллега у кресла, 15м кулдаун).*

### Промпты, стили и персона
4. [03_PROMPTS_ENCYCLOPEDIA_VERBATIM.md](file:///C:/Users/danat/Desktop/STOMCHAT_PROMPTS_AND_LOGIC/03_PROMPTS_ENCYCLOPEDIA_VERBATIM.md)  
   Полная энциклопедия всех промптов системы до единого символа: *стили `STYLE_PROMPTS`, групповой ответ, пассивный ответ, промпт разрешения споров (без судейского мусора и вердиктов), EBM-рецензент, мультимодальное зрение, консилиум в ЛС, дистиллятор базы знаний и память врачей.*
5. [all_system_prompts.py](file:///C:/Users/danat/Desktop/STOMCHAT_PROMPTS_AND_LOGIC/all_system_prompts.py)  
   *Исполняемый Python-модуль с константами всех промптов для непосредственного импорта в другие сервисы.*

### Интеллектуальный каскад и безопасность
6. [04_LLM_CASCADE_FAILOVER_AND_PACING.md](file:///C:/Users/danat/Desktop/STOMCHAT_PROMPTS_AND_LOGIC/04_LLM_CASCADE_FAILOVER_AND_PACING.md)  
   *Трехуровневый каскад Gemini ↔ Groq Llama-3.3-70b ↔ DeepSeek-R1, ротация пула API-ключей, правило задержки 2–3с от бана, обработка ошибок 429/503 и очистка `<think>` токенов.*
7. [05_EBM_VALIDATION_AND_CLINICAL_SAFETY.md](file:///C:/Users/danat/Desktop/STOMCHAT_PROMPTS_AND_LOGIC/05_EBM_VALIDATION_AND_CLINICAL_SAFETY.md)  
   *Обязательный рецензент безопасности `check_response_quality`, прецизионный калькулятор детских доз анестетиков (лимит 5 мг/кг артикаина), соматические стоп-факторы и регулярная очистка вердиктов.*

### Мультимодальность: Зрение и Голос
8. [06_COMPUTER_VISION_AND_MULTIMODAL_PIPELINE.md](file:///C:/Users/danat/Desktop/STOMCHAT_PROMPTS_AND_LOGIC/06_COMPUTER_VISION_AND_MULTIMODAL_PIPELINE.md)  
   *Анализ рентгеновских снимков (ОПТГ, КЛКТ, прицельные), интраоральных фото, сборка альбомов, кэширование в `uploaded_media/` и защита от артефактов полимеризатора (Правило 10.1).*
9. [07_VOICE_PIPELINE_AND_SPEECH_RECOGNITION.md](file:///C:/Users/danat/Desktop/STOMCHAT_PROMPTS_AND_LOGIC/07_VOICE_PIPELINE_AND_SPEECH_RECOGNITION.md)  
   *Загрузка Telegram OGG Opus, конвертация FFmpeg в 16 kHz WAV, распознавание Whisper / Gemini STT, фонетический словарь стоматологических терминов (`dental_vocab.py`) и автопубликация транскриптов.*

### Хранилище, База знаний и Дайджесты
10. [08_DATABASE_SCHEMAS_AND_STORAGE_ENGINE.md](file:///C:/Users/danat/Desktop/STOMCHAT_PROMPTS_AND_LOGIC/08_DATABASE_SCHEMAS_AND_STORAGE_ENGINE.md)  
    *Полные DDL-схемы таблиц и индексов всех трех баз: `stomat_bot.db` (22 MB), `stomat_wiki.db` (10.8 MB), `stomat_archive.db` (47.5 MB), WAL-режим и потокобезопасная сериализация записи.*
11. [database_schemas_reference.py](file:///C:/Users/danat/Desktop/STOMCHAT_PROMPTS_AND_LOGIC/database_schemas_reference.py)  
    *Исполняемый скрипт для мгновенной валидации и инспекции целостности всех баз данных и таблиц.*
12. [09_KNOWLEDGE_BASE_RAG_AND_DISTILLER.md](file:///C:/Users/danat/Desktop/STOMCHAT_PROMPTS_AND_LOGIC/09_KNOWLEDGE_BASE_RAG_AND_DISTILLER.md)  
    *Конвейер дистилляции 117 тыс. сообщений в 12 778 доказательных фактов, трехуровневая таксономия, полнотекстовый поиск FTS5 и семантическое ранжирование BM25.*
13. [10_SUMMARIZATION_DIGESTS_AND_TELEGRAPH.md](file:///C:/Users/danat/Desktop/STOMCHAT_PROMPTS_AND_LOGIC/10_SUMMARIZATION_DIGESTS_AND_TELEGRAPH.md)  
    *Пакетная обработка чата, автоматическая публикация иллюстрированных статей через Telegraph API и журнальная верстка еженедельных PDF-выпусков через WeasyPrint.*

### Суперсилы, Тесты и Эксплуатация
14. [11_CLINICAL_SUPERPOWERS_AND_SOS_MESH.md](file:///C:/Users/danat/Desktop/STOMCHAT_PROMPTS_AND_LOGIC/11_CLINICAL_SUPERPOWERS_AND_SOS_MESH.md)  
    *Каталог всех 51 интерактивных карточек: 10 SOS-протоколов (включая LAST и инфузию липидов), 8 шаблонов 043/у, 8 чекеров соматики Rx, 12 скриптов перевода с пациентского, 10 батлов материалов и контракт 4 кросс-линков.*
15. [12_TEST_SUITE_CONTRACTS_AND_SAFETY_SUITE.md](file:///C:/Users/danat/Desktop/STOMCHAT_PROMPTS_AND_LOGIC/12_TEST_SUITE_CONTRACTS_AND_SAFETY_SUITE.md)  
    *Архитектурные тесты, AST-валидация покрытия `check_response_quality`, red-team эксплойты детских дозировок и контракты надежности.*
16. [13_DEVELOPER_OPERATIONS_MANUAL.md](file:///C:/Users/danat/Desktop/STOMCHAT_PROMPTS_AND_LOGIC/13_DEVELOPER_OPERATIONS_MANUAL.md)  
    *Практическое руководство по развертыванию, конфигурации `.env`, мониторингу логов, аварийному восстановлению и устранению сбоев.*
17. [triage_rules_engine.py](file:///C:/Users/danat/Desktop/STOMCHAT_PROMPTS_AND_LOGIC/triage_rules_engine.py)  
    *Автономный исполняемый модуль проверки правил 7 шлюзов триажа.*
