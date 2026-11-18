# 💾 08. БАЗЫ ДАННЫХ И СИСТЕМА ХРАНЕНИЯ (SQLITE ARCHITECTURE)

> **Модули-источники:** `database.py` (1630 строк), `distiller.py`, `apply_content_hash_migration.py`  
> **Физические файлы БД:** `stomat_bot.db` (22 MB), `stomat_wiki.db` (10.8 MB), `stomat_archive.db` (47.5 MB)

---

## 1. ТОПОЛОГИЯ ИЗОЛЯЦИИ ДАННЫХ

В StomChat применено строгое разделение баз данных по функциональному назначению:
1. **`stomat_bot.db` (Оперативная база бота):** Содержит оперативные сообщения чата, трекинг собственных ответов, профили врачей, долговременную клиническую память, интерактивные состояния и сохраненные протоколы.
2. **`stomat_wiki.db` (База знаний RAG):** 12 778 дистиллированных и выверенных клинических фактов доказательной стоматологии с хэшированием и рубрикатором.
3. **`stomat_archive.db` (Исторический архив):** 117 847 архивных сообщений профессионального сообщества за все годы существования чата.

---

## 2. СХЕМЫ ТАБЛИЦ И СТРУКТУРА `stomat_bot.db`

### 2.1. Таблица `messages` (Оперативные сообщения группы)
*Количество записей: ~43 741*
```sql
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    msg_id INTEGER UNIQUE,
    reply_to_msg_id INTEGER,
    sender_id INTEGER,
    sender_name TEXT,
    sender_username TEXT,
    text TEXT,
    date TIMESTAMP,
    has_media BOOLEAN,
    media_type TEXT,
    media_description TEXT,
    is_summarized BOOLEAN DEFAULT 0,
    media_remote_url TEXT
);
CREATE INDEX IF NOT EXISTS idx_messages_msg_id ON messages(msg_id);
CREATE INDEX IF NOT EXISTS idx_messages_date ON messages(date);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
```

### 2.2. Таблица `bot_sent_messages` (Реестр собственных сообщений)
*Количество записей: ~960*
```sql
CREATE TABLE bot_sent_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    msg_id INTEGER,
    chat_id INTEGER,
    UNIQUE(msg_id, chat_id)
);
```
> **Критическое назначение:** Предотвращает зацикливание и рекурсию. По этой таблице бот определяет, отвечает ли врач на его сообщение, и никогда не реагирует сам на себя.

### 2.3. Таблица `user_memories` (Долговременное клиническое досье)
*Количество записей: ~429*
```sql
CREATE TABLE user_memories (
    user_id INTEGER PRIMARY KEY,
    username TEXT DEFAULT '',
    first_name TEXT DEFAULT '',
    specialty TEXT DEFAULT '',
    clinical_summary TEXT DEFAULT '',
    group_summary TEXT DEFAULT '',
    facts_json TEXT DEFAULT '[]',
    message_count INTEGER DEFAULT 0,
    pm_message_count INTEGER DEFAULT 0,
    group_message_count INTEGER DEFAULT 0,
    last_pm_analyzed_id INTEGER DEFAULT 0,
    last_group_analyzed_id INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.4. Таблица `user_profiles` (Стили общения и портреты)
```sql
CREATE TABLE user_profiles (
    user_id INTEGER PRIMARY KEY,
    selected_style TEXT DEFAULT 'colleague_friendly',
    profile_portrait TEXT,
    last_analyzed_msg_id INTEGER DEFAULT 0
);
```

### 2.5. Таблица `pm_messages` (История личных консультаций)
```sql
CREATE TABLE pm_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    sender_name TEXT,
    text TEXT,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.6. Таблица `clinical_protocols` (Извлеченные протоколы лечения)
```sql
CREATE TABLE clinical_protocols (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'Общая стоматология',
    indication TEXT DEFAULT '',
    contraindications TEXT DEFAULT '',
    steps_json TEXT DEFAULT '[]',
    materials TEXT DEFAULT '',
    key_nuances TEXT DEFAULT '',
    author_doctor TEXT DEFAULT '',
    source_msg_id INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.7. Таблица `user_interactive_states` (Машина состояний консилиумов и викторин)
```sql
CREATE TABLE user_interactive_states (
    user_id INTEGER PRIMARY KEY,
    state_type TEXT,
    current_step INTEGER,
    case_id TEXT,
    history TEXT
);
```

---

## 3. СХЕМА `stomat_wiki.db` (БАЗА ЗНАНИЙ RAG)

### Таблица `distilled_facts`
*Количество записей: 12 778*
```sql
CREATE TABLE distilled_facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_code TEXT,
    content TEXT,
    source_ids TEXT,
    media_links TEXT,
    is_case BOOLEAN,
    confidence INTEGER,
    processed_at TIMESTAMP,
    is_reclassified BOOLEAN DEFAULT 0,
    content_hash TEXT UNIQUE
);
CREATE INDEX IF NOT EXISTS idx_facts_cat ON distilled_facts(category_code);
CREATE INDEX IF NOT EXISTS idx_facts_hash ON distilled_facts(content_hash);
```
- **`category_code`:** Иерархический код темы (например, `1.1.1` — Кариесология, `2.2.1` — BOPT/Vertiprep, `3.1.2` — Эндодонтический доступ).
- **`content_hash`:** SHA-256 нормализованного текста факта для дедупликации при повторных прогонах дистиллятора.

---

## 4. СХЕМА `stomat_archive.db` (ИСТОРИЧЕСКИЙ АРХИВ)

### Таблица `archive_messages`
*Количество записей: 117 847*
```sql
CREATE TABLE archive_messages (
    msg_id INTEGER PRIMARY KEY,
    date TIMESTAMP,
    sender_id INTEGER,
    sender_name TEXT,
    sender_username TEXT,
    text TEXT,
    reply_to_msg_id INTEGER,
    has_media BOOLEAN,
    media_type TEXT,
    media_remote_url TEXT,
    vision_description TEXT,
    vision_processed BOOLEAN DEFAULT 0,
    category_l1 TEXT,
    category_l2 TEXT,
    category_l3 TEXT,
    is_processed_for_wiki BOOLEAN DEFAULT 0
);
```

---

## 5. БЛОКИРОВКИ, WAL-РЕЖИМ И СЕРИАЛИЗАЦИЯ ЗАПИСИ

SQLite по умолчанию блокирует весь файл базы при записи. В асинхронном приложении с десятками параллельных корутин попытка одновременного выполнения `INSERT` вызывает исключение `sqlite3.OperationalError: database is locked`.

В StomChat эта проблема решена на фундаментальном уровне:
1. **Режим WAL (Write-Ahead Logging):**
   При старте базы выполняется:
   ```sql
   PRAGMA journal_mode = WAL;
   PRAGMA synchronous = NORMAL;
   PRAGMA busy_timeout = 5000;
   ```
   Это позволяет читать данные сотням параллельных потоков без блокировки пишущей транзакцией.
2. **Dedicated Single-Thread Executor (`_DB_EXECUTOR`):**
   Все операции модификации данных выполняются через выделенный однопоточный пул:
   ```python
   _DB_EXECUTOR = ThreadPoolExecutor(max_workers=1, thread_name_prefix="db_writer")
   
   async def execute_db_write(sql: str, params: tuple):
       loop = asyncio.get_running_loop()
       return await loop.run_in_executor(_DB_EXECUTOR, lambda: _sync_write(sql, params))
   ```
   **Результат:** 100% защита от состояний гонки и повреждения баз данных.
