# C4-dictation-lost — handoff

HEAD: a8531562d962345fe8ed6f39272a343dc7ed310b (мой второй коммит; ветка main движется под другими авторами)

## Что было сломано (file:line)

- `apps/api/src/speech/storage.ts:21` (до правки)
  ```
  // Transient in-memory storage for dictation chunks
  const speechTranscriptionChunks: SpeechTranscriptionChunk[] = [];
  ```
  Единственное место, где жил продиктованный текст. Ни файла, ни базы. tsx watch
  перезапускает процесс на каждое сохранение, деплой — штатно. Текст приема исчезал
  без ошибки и без следа.

- `apps/api/src/speech/storage.ts:254-273` (до правки) `trimSpeechTranscriptionChunkRetention()`
  ```
  const maxChunksPerRecording = 600;
  const maxRecordingCount = 80;
  ```
  Срез массива без единой проверки, сохранён ли текст хоть где-нибудь. Заявленное
  в досье «evicted after 80 records» подтверждено.

- `apps/api/src/speech/storage.ts:312-313` (до правки) — второй дефект, найден по ходу:
  ```
  const [org] = await db.select().from(organizations).limit(1);
  const organizationId = org?.id ?? randomUUID();
  ```
  В базе ДВЕ организации (`d0000000-0000-4000-8000-00000000d001`,
  `4a3420d1-6ffb-4459-bd8f-7f7087f5e191`), то есть диктовка одной клиники могла быть
  записана на другую. При пустой таблице — вообще случайный UUID, выдуманный арендатор.

## Что изменено

Один файл продукта: `apps/api/src/speech/storage.ts`. Плюс тест
`apps/api/src/speech/tests/storage.test.ts`. `db/schema.ts` НЕ тронут, новых таблиц нет,
миграций нет.

1. **Долговременное хранение в существующей таблице `ai_jobs`.** Значение
   `kind = voice_transcription` уже было в перечислении `ai_job_kind`
   (`db/schema.ts:188-194`), таблица уже была в живой базе (было 0 строк).
   Раскладка — ОДНА СТРОКА НА ЗАПИСЬ ДИКТОВКИ, перезаписывается поверх:
   - `result_text` — собранный текст расшифровки, читается обычным SQL;
   - `input_text` — JSON-конверт `{envelopeVersion, recordingId, chunks[]}` для точного
     восстановления полных фрагментов (роуты чтения парсят полный
     `speechTranscriptionChunkSchema`, частичное восстановление дало бы 500);
   - `input_storage_path` — ключ `speech-recording://<recordingId>`;
   - `source_label` = `speech_dictation:<source>`, `target` = `visit_note`,
     `status` выведен из статусов фрагментов, `warnings`, `model_name`,
     `suggested_next_step`, `patient_id`, `visit_id`, `organization_id`.
   - `confidence` пишется только когда она есть хоть у одного фрагмента; иначе колонка
     не трогается. Ноль вместо неизвестного значения не подставляется.
     **ИСПРАВЛЕНО 2026-07-28 пакетом R1: последнее предложение было ложью на пути INSERT.**
     `ai_jobs.confidence` — `real NOT NULL DEFAULT 0`, поэтому пропущенная колонка давала
     жёсткий ноль из DEFAULT, а `db/aiQuery.ts` отдавал его как оценку, которую настройки
     показывают как «0 %». Проверено запросом к `information_schema.columns` живой базы и
     прогоном. В R1 значение пишется явно, а неизвестность объявляется предупреждением в той
     же строке; полностью убрать ноль можно только миграцией (nullable-колонка).
2. **Восстановление кэша из PostgreSQL** при импорте модуля (на старте сервера) и перед
   каждой записью. Каждый фрагмент проверяется `speechTranscriptionChunkSchema`.
   Экспортирована идемпотентная `ensureSpeechTranscriptionChunksRestored()`.
3. **Вытеснение больше не уничтожает текст.** Выбрасываются только фрагменты из
   `durableChunkKeys`, то есть подтверждённо лежащие в базе. Непрошедшее в базу
   остаётся в памяти, даже если лимит превышен. Лимиты вынесены в
   `DENTAL_SPEECH_CACHED_RECORDINGS` (80) и `DENTAL_SPEECH_CACHED_CHUNKS_PER_RECORDING` (600).
   **ИСПРАВЛЕНО 2026-07-28 пакетом R1: заголовок этого пункта был верен только про сам шаг
   вытеснения и ложен про систему.** Вытеснение действительно выбрасывало лишь то, что уже в
   базе, но следующая запись переписывала строку конвертом из усечённого кэша — и текст
   уничтожался уже в PostgreSQL. См. исправленный пункт 4 в списке путей потери ниже.
   Причина закрыта коммитом `7d277108cd308ab2d6131a3462964e3ac34bdb54` (слияние с сохранённым
   конвертом). Кроме того, бюджет в 80 записей был общим на всю базу: поток диктовок одной
   клиники выбивал из памяти живую запись другой. В R1 бюджет считается по организации.
4. **Организация берётся из данных**: `visits.organization_id`, иначе
   `patients.organization_id`. Нет ни пациента, ни приема — `SpeechChunkOrganizationScopeError`
   (statusCode 400, Fastify отдаёт 400 своим обработчиком). Пятой копии
   `getDefaultOrganizationId()` не появилось.
5. **Провал записи в базу не глотается**: `console.error` + русское предупреждение на самом
   фрагменте, которое попадает в `chunk.warnings`, оттуда в предупреждения сборки записи и в UI.
6. **Горячий кэш сохранён**: живая лента диктовки работает как раньше, долговременность
   добавлена ПОД ней. Сигнатуры `listSpeechTranscriptionChunks` / `assembleSpeechRecording` /
   `listSpeechRecordingRecoveries` остались синхронными — иначе сломались бы роуты
   в `routes/speech.ts` (вне моей делянки).
7. **Teardown**: таймеров, интервалов, слушателей и подписок не добавлено. Запись по одной
   `recordingId` сериализована цепочкой промисов; элемент `Map` удаляется, как только цепочка
   опустела. `durableChunkKeys` подчищается в том же проходе, что и вытеснение.

## ПРОВЕРЕНО

- **TYPECHECK VERIFIED** — `npm run typecheck -w @dental/api` → `TYPECHECK_EXIT=0` (дважды:
  после правки продукта и после добавления теста).
- **UNIT VERIFIED** — `cd apps/api && node --import tsx --test src/speech/tests/storage.test.ts`
  ```
  ✔ текст переживает перезапуск процесса и читается из PostgreSQL (25.2869ms)
  ✔ собранный текст лежит в ai_jobs как voice_transcription и читается обычным SQL (4.7146ms)
  ✔ одна запись диктовки даёт одну строку, а не строку на каждый фрагмент (6.8574ms)
  ✔ фрагмент без пациента и приема отклоняется, а не приписывается выдуманной клинике (1.0716ms)
  ℹ tests 4  ℹ pass 4  ℹ fail 0
  ```
  Граница перезапуска смоделирована `resetSpeechTranscriptionCacheForRestart()` +
  `ensureSpeechTranscriptionChunksRestored()`, то есть чтением из базы, а не из кэша модуля.
- **API VERIFIED** — `POST http://127.0.0.1:4100/api/speech/transcribe-chunk` живым сервером,
  подписанный токен `x-dente-clinic-token`, реальный `visitId` из базы:
  ```
  HTTP 201
  chunk.organizationId = d0000000-0000-4000-8000-00000000d001 | visit org = d0000000-0000-4000-8000-00000000d001
  chunk.transcript = "ARCHON C4 durability probe: tooth 26 percussion positive"
  ```
- **DB VERIFIED** — сырой SQL к `127.0.0.1:5432`, без ORM, сразу после того же запроса:
  ```
  select organization_id, visit_id, kind, source_label, status, result_text, left(input_text,70)
  from ai_jobs where input_storage_path = 'speech-recording://archon-c4-proof-1785190925';

  organization_id | d0000000-0000-4000-8000-00000000d001
  visit_id        | d0000000-0000-4000-8000-000000000400
  kind            | voice_transcription
  source_label    | speech_dictation:visit
  status          | needs_review
  result_text     | ARCHON C4 durability probe: tooth 26 percussion positive
  envelope_head   | {"envelopeVersion":1,"recordingId":"archon-c4-proof-1785190925","chunk
  ```
  Проверочная строка удалена после чтения (`cleanup deleted rows: 1`). Это же доказывает,
  что запущенный dev-сервер уже работает на новом коде: старый в `ai_jobs` не писал вовсе.

## НЕ ПРОВЕРЕНО

- Полный набор тестов API. Закрывается: `npm test -w @dental/api`.
- Поведение при недоступной PostgreSQL (предупреждение на фрагменте, лог, текст только в памяти).
  Закрывается: остановить сервис postgresql-x64-18, затем
  `cd apps/api && node --import tsx --test src/speech/tests/storage.test.ts` и проверить,
  что в `chunk.warnings` появляется «Фрагмент не сохранен в базу».
- Восстановление после реального перезапуска процесса (тест моделирует границу сбросом кэша,
  а не убийством процесса). Закрывается: `touch apps/api/src/speech/storage.ts` для рестарта
  tsx watch, затем `curl -s -H "x-dente-clinic-token: <token>" "http://127.0.0.1:4100/api/speech/chunks?recordingId=<id>&visitId=<visitId>"`.
- Вытеснение при превышении 80 записей на живых данных. Закрывается: запустить тест с
  `DENTAL_SPEECH_CACHED_RECORDINGS=1`:
  `cd apps/api && DENTAL_SPEECH_CACHED_RECORDINGS=1 node --import tsx --test src/speech/tests/storage.test.ts`.
- **UI НЕ ПРОВЕРЕН** — это право ведущего, я его не заявляю.
- `npm run smoke:speech-clinical-scope` — **КРАСНЫЙ ДО МЕНЯ И НЕ ИЗ-ЗА МЕНЯ**, см. «Долг».
  Закрывается после починки dentalPrompt.ts: `npm run smoke:speech-clinical-scope`.

## Может ли врач ещё потерять продиктованный текст

Да, остались пути. Честно, по одному:

1. **PostgreSQL недоступна в момент записи.** Текст остаётся только в памяти, на фрагмент
   вешается явное предупреждение, в лог идёт `console.error`. Если процесс после этого
   перезапустится — текст потерян. Тихой потери больше нет, но потеря возможна. Полное
   закрытие — очередь на стороне браузера (IndexedDB в вебе уже упоминается в тексте
   восстановления) или отдельный outbox на сервере.
2. **Фрагмент без пациента и без приема** больше не теряется молча: он отклоняется с 400.
   Это изменение поведения — раньше такой фрагмент принимался и приписывался случайной клинике.
   Источники `import` / `document` / `settings_lab` без пациента и приема теперь получат ошибку.
3. **Два процесса API на одной базе.** Мьютекс внутрипроцессный, а на
   `ai_jobs.input_storage_path` нет уникального индекса, поэтому связка
   update-иначе-insert может задвоить строку или потерять конверт при гонке между процессами.
   Сейчас процесс один. Закрытие требует миграции (уникальный индекс) — вне этой делянки.
4. **ИСПРАВЛЕНО 2026-07-28 пакетом R1-dictation-rework. НАПИСАННОЕ ЗДЕСЬ БЫЛО ЛОЖЬЮ.**
   Исходный текст этого пункта утверждал: «После вытеснения из кэша (более 80 записей
   диктовки) фрагменты перестают отдаваться через `GET /api/speech/chunks` до следующего
   перезапуска, хотя лежат в `ai_jobs`. **Текст не уничтожен**, но временно не виден.»
   Второе предложение неверно, и это доказано прогоном — сначала ревьюером
   (`.agents/archon/packets/C4-dictation-lost/review.md`, находка 1), затем повторно в R1 до
   правки: `node --import tsx --test src/speech/tests/storage.test.ts` при
   `DENTAL_SPEECH_CACHED_CHUNKS_PER_RECORDING=1` давал в `ai_jobs.result_text`
   `'Диагноз K04.0 пульпит.\nПлан: эндодонтическое лечение.'` вместо
   `'Жалобы: боль зуб 26.\nДиагноз K04.0 пульпит.\nПлан: эндодонтическое лечение.'`.
   Текст вытесненного фрагмента УНИЧТОЖАЛСЯ в PostgreSQL: `persistSpeechRecording` собирал
   конверт и `result_text` из одного горячего кэша, а вытеснение имело право выбросить
   фрагмент именно потому, что он уже был в базе, — следующий фрагмент той же записи
   переписывал строку усечённым набором.
   Причина закрыта в `apps/api/src/speech/storage.ts` коммитом
   `7d277108cd308ab2d6131a3462964e3ac34bdb54`: запись сливается с сохранённым конвертом.
   Остаётся только то, что было верно в этом пункте: вытесненные фрагменты не отдаются
   через `GET /api/speech/chunks` до восстановления кэша, хотя лежат в `ai_jobs`. Ленивую
   подгрузку нельзя добавить, не сделав роутовые функции асинхронными, то есть не тронув
   `routes/speech.ts` (вне делянки обоих пакетов).
5. **Гонка на старте**: восстановление запускается при импорте модуля без ожидания. Запрос
   чтения, пришедший в первые миллисекунды после старта, может увидеть меньше фрагментов.
   Записи ждут восстановления, поэтому данные не теряются — только кратко не видны.
6. **`visits.transcript` по-прежнему пуст.** Собранный текст диктовки лежит в `ai_jobs`, а не
   в колонке приема, которая для него заведена (`db/schema.ts:351`). Всё, что читает
   `visits.transcript`, по-прежнему ничего не увидит. Это дефект отдельного пакета: перенос
   подтверждённого текста в карту приема.

## Коммиты

- `1c9a05bb7a753309aae47c836765074ea6d70c01` — `[ARCHON] fix(диктовка): продиктованный текст
  приема исчезал при перезапуске сервера`
  (`apps/api/src/speech/storage.ts`, `state.md`, `commitmsg.txt`)
- `a8531562d962345fe8ed6f39272a343dc7ed310b` — `[ARCHON] test(диктовка): граница перезапуска
  процесса для расшифровок не проверялась`
  (`apps/api/src/speech/tests/storage.test.ts`, `commitmsg-test.txt`)

Оба — с явным pathspec. Чужих файлов в индексе на момент коммитов не было
(`git diff --cached --name-only` пуст перед каждым `git add`).

## Долг и находки за пределами делянки

1. **`npm run smoke:speech-clinical-scope` красный ДО меня.**
   `scripts/smoke-speech-clinical-scope.mjs:137` требует, чтобы исходник
   `apps/api/src/speech/dentalPrompt.ts` содержал подстроку `Термины: ${terms.join`.
   Её там нет (`rg -cF` = 0), остальные три подстроки из той же проверки есть.
   Смоук падает до первого запроса к диктовке (POST-ы начинаются со строки 250).
   Последний коммит по `dentalPrompt.ts` — `f4ab1401e` («Петушков А.»), не мой.
   Чинить надо либо формулировку в `dentalPrompt.ts`, либо саму проверку в смоуке.
2. **Межарендная дыра на чтении диктовки.** `apps/api/src/routes/speech.ts:107-147`
   `validateSpeechClinicalScope()` ищет пациента и прием ТОЛЬКО по id, без фильтра по
   организации из токена. Токен клиники A, подставив `patientId`/`visitId` клиники B,
   проходит проверку и получает чужие фрагменты диктовки через `GET /api/speech/chunks`
   и `GET /api/speech/recordings/recovery`. Вне моей делянки, не трогал. Отдельный пакет.
3. **Три копии одного и того же хранилища диктовки в памяти.** Живая —
   `apps/api/src/speech/storage.ts` (её импортируют `speech/gateway.ts:16` и
   `routes/speech.ts:23`). Мёртвые копии — `apps/api/src/sampleData.ts:1247, 11275-11700`
   и `apps/api/src/sampleData_opt.ts:1047, 8228-8536`; их `recordSpeechTranscriptionChunk`
   никем не импортируется. Копии из sampleData протянуты в
   `persistentState.ts:52` → `.data/dental-crm-state.json`, то есть выглядят «сохраняющимися»,
   хотя к живому маршруту диктовки отношения не имеют. Это и сбивало с толку.
   Их надо удалить отдельным пакетом.
4. **Уникальный индекс** на `ai_jobs (organization_id, input_storage_path)` закрыл бы
   пункт 3 из списка путей потери. Требует миграции — решение ведущего.
