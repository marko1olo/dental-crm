# ⚙️ 01. RUNTIME, EVENT LOOP И ПРОЦЕССНЫЙ СУПЕРВИЗОР

> Модули-источники: `main.py` (3162 строки), `runtime_guard.py` (535 строк), `start.bat`  
> Ключевые сущности: `TelegramClient`, `acquire_single_instance_lock`, `_PM_PENDING_QUEUES`, `health_watchdog_task`, `scheduler_task`

---

## 1. АРХИТЕКТУРА ИНИЦИАЛИЗАЦИИ И СИНХРОНИЗАЦИИ (`main.py`)

### 1.1. Single-Instance Mutex (Защита от расщепления мозга / Dual Boot)
Критическая уязвимость любого Telegram-бота на базе пользовательских сессий MTProto — одновременный запуск двух процессов с одной сессией. Это приводит к дублированию сообщений в чате, гонкам транзакций SQLite и блокировке аккаунта Telegram за подозрительную активность.

В `main.py` реализован механизм монопольной блокировки через локальный сокет (`acquire_single_instance_lock`):
```python
def acquire_single_instance_lock(port: int = 49152):
    """
    Создает локальный TCP-сокет на выделенном порту 127.0.0.1.
    Если порт занят — значит, предыдущий процесс бота еще жив или завис.
    Второй экземпляр немедленно завершает работу с кодом 1.
    """
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(('127.0.0.1', port))
        s.listen(1)
        return s
    except socket.error:
        logging.critical("CRITICAL: Another instance of StomChat is already running! Terminating.")
        sys.exit(1)
```

### 1.2. Регистрация обработчиков Telethon
Telethon перехватывает апдейты MTProto на самом низком уровне:
1. `@client.on(events.NewMessage)`:
   - Если `event.is_private`: отправка в пайплайн личных сообщений (`handle_private_message`).
   - Если `event.chat_id == CHAT_ID`: отправка в диспетчер группы (`handle_new_message`).
   - Если сообщение содержит медиа (фото/видео/документ): буферизация в альбом или постановка в очередь анализа (`process_media_message`).
   - Если сообщение содержит войс (`event.voice` / `event.audio`): вызов аудио-пайплайна (`transcribe_group_voice`).
2. `@client.on(events.MessageEdited)`:
   - Обновляет текст в таблице `messages` базы данных `stomat_bot.db`. Предотвращает рассинхронизацию контекста, когда врач исправляет опечатку в дозировке или номере зуба.
3. `@client.on(events.MessageDeleted)`:
   - Удаляет записи из оперативной базы `messages` во избежание галлюцинаций LLM на удаленные врачами реплики.
4. `@client.on(events.CallbackQuery)`:
   - Обрабатывает нажатия инлайн-кнопок (меню суперсил, выбор стиля, навигация по Wiki, кнопки подтверждения) через `assistant.handle_callback_query`.

---

## 2. КОНКУРРЕНТНОСТЬ И ФОНОВЫЕ ДЕМОНЫ

При запуске `start_bot()` регистрируется пул постоянных асинхронных задач (`asyncio.create_task`):

```
                                      asyncio Event Loop
                                              │
    ┌───────────────────┬─────────────────────┼─────────────────────┬───────────────────┐
    ▼                   ▼                     ▼                     ▼                   ▼
scheduler_task   health_watchdog       media_workers         telemetry_task     pm_ping_scheduler
(09:00 Дайджесты   (RAM < 500MB,       (Фоновый анализ      (Heartbeat в файл   (Пинги неактивным
 и 043-шаблоны)     Loop Lag < 2s)      снимков из очереди)   stomat_health)     докторам в ЛС)
```

### 2.1. Фоновый планировщик (`scheduler_task`, строки 644–836)
- Ежедневный дайджест: Формируется в 09:00 по МСК. Извлекает нерезюмированные сообщения за 24 часа, фильтрует флуд, генерирует клиническую выжимку и пост в Telegraph.
- Еженедельный клинический выпуск: Формируется по воскресеньям. Создает масштабный лонгрид и PDF-журнал высокого разрешения (`digest_pdf.py`).
- **Защита от дублей доставок (`load_sent_targets`, `mark_target_delivered`):** Ведется реестр хэшей дат доставок, исключающий повторную публикацию при перезапуске бота.

### 2.2. Сторожевой пес здоровья (`health_watchdog_task`, строки 2950–3032)
1. Контроль задержки цикла (Event Loop Lag): Раз в 15 секунд измеряется фактическое время сна `await asyncio.sleep(1)`. Если задержка превышает 2 секунды (событийный цикл заблокирован синхронным вызовом) — пишется критический аларм в лог.
2. Контроль потребления оперативной памяти (RSS Memory): Проверяется объем используемой памяти (`psutil.Process().memory_info().rss`). Если потребление превышает 500 МБ (утечка памяти в буферах медиа или библиотеке изображений) — инициируется контролируемый `sys.exit(42)`, и внешний супервизор перезапускает бота в чистом состоянии.

---

## 3. СУПЕРВИЗОР И ВНЕШНИЙ КОНТРОЛЬ ПРОЦЕССА

### 3.1. Батник-супервизор (`start.bat`)
Бот запускается в вечном цикле с автоматической ротацией логов и задержкой перед рестартом:
```bat
@echo off
:loop
echo [%date% %time%] Starting StomChat Core Runtime... >> bot_runtime.log
python -X utf8 main.py >> bot_runtime.log 2>&1
echo [%date% %time%] StomChat crashed or exited with code %ERRORLEVEL%. Restarting in 5s... >> bot_runtime.log
timeout /t 5 /nobreak >nul
goto loop
```

### 3.2. Автономный сторож (`runtime_guard.py`)
`runtime_guard.py` может запускаться как независимый сервис в ОС Windows. Он выполняет:
1. Мониторинг файла `bot_runtime.log` — если файл не обновлялся более 5 минут при наличии сетевой активности, процесс считается зависшим.
2. Очистку процессов-зомби: принудительное завершение осиротевших процессов `ffmpeg.exe`, `tesseract.exe`, `python.exe` с признаками утечки дескрипторов.
3. Проверку валидности соединения с серверами MTProto Telegram.

---

## 4. ДЕБАУНС И ПАКЕТИРОВАНИЕ СООБЩЕНИЙ В ЛС (`_PM_PENDING_QUEUES`)

Типичное поведение врача в Telegram: вместо одного длинного сообщения клинический кейс отправляется серией коротких реплик за 5–15 секунд:
1. *"Привет! Пациент 42 года"*
2. *"Жалобы на боли в 46 зубе при накусывании"*
3. *"Снимок сейчас прикреплю"*
4. *(фото рентгенограммы)*

Если бы бот отвечал на каждую реплику мгновенно, он бы сгенерировал 4 обрывочных нерелевантных ответа, потратил 4 запроса к LLM и заспамил врача.

Решение в StomChat — Пакетирующий буфер (Burst Debounce Buffer):
```python
_PM_PENDING_QUEUES: Dict[int, List[events.NewMessage.Event]] = {}
_PM_DEBOUNCE_SECONDS = 7.0

async def handle_private_message(event):
    user_id = event.sender_id
    async with _pm_user_lock(user_id):
        # Добавляем входящее сообщение в персональную очередь врача
        if user_id not in _PM_PENDING_QUEUES:
            _PM_PENDING_QUEUES[user_id] = []
            asyncio.create_task(run_burst_worker(user_id))
        _PM_PENDING_QUEUES[user_id].append(event)

async def run_burst_worker(user_id: int):
    # Ожидаем паузы в наборе текста пользователем
    await asyncio.sleep(_PM_DEBOUNCE_SECONDS)
    async with _pm_user_lock(user_id):
        events_bundle = _PM_PENDING_QUEUES.pop(user_id, [])
    # Склеиваем все тексты и медиа в единый клинический запрос
    await process_bundled_pm(user_id, events_bundle)
```
Результат: Врач получает один фундаментальный, развернутый клинический ответ, учитывающий весь контекст, анамнез и все прикрепленные снимки.
