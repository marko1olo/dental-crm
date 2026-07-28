# S3-aijobs-index-and-ram — сдача

HEAD на момент сдачи: `1acbb98d718879bc4adff928a4499554c4ebc85d`
Мои коммиты: `b46ddf7b4c20d76d750233afb929e2b7afe0349d` (исправление), `1acbb98d718879bc4adff928a4499554c4ebc85d` (тест)
HEAD двигался под мной трижды: `40dd853fc` -> `8f4d42fe3` (S1) -> `b46ddf7b4` (мой) -> `d6c1eed82` (S2) -> `1acbb98d7` (мой).

## Что было сломано (file:line)

**(а) У восстановления расшифровок не было общего предела памяти.**
`apps/api/src/speech/storage.ts:729-747` до коммита (`git show b46ddf7b4^:apps/api/src/speech/storage.ts`):
запрос заканчивался на `WHERE ranked.recording_rank <= ${perOrganizationLimit}` и внешнего `LIMIT` не
имел вообще, при `perOrganizationLimit = maxCachedRecordingCount()` (строка 730) — то есть предел
принадлежал КЛИНИКЕ. До перехода на `row_number() OVER (PARTITION BY organization_id)` там стоял
`.limit(maxCachedRecordingCount())` — один жёсткий предел на весь процесс. Итог: число поднятых при
старте записей равнялось `80 x (число арендаторов)`, и никакого потолка над этим произведением не было.
Загрузка жадная: `storage.ts:913` (до правки) `void ensureSpeechTranscriptionChunksRestored()` на импорт
модуля. `trimSpeechTranscriptionChunkRetention()` на пути восстановления не вызывается вообще (rg: единственный
вызов — путь нового фрагмента).

Ещё две оси, из-за которых предела по числу ЗАПИСЕЙ недостаточно, проверены мной по исходникам:
* `packages/shared/src/index.ts:1208` — `transcript: z.string()`, у ПЕРСИСТЕНТНОГО фрагмента максимума НЕТ;
* `packages/shared/src/index.ts:997` — `localTranscript: z.string().max(20_000)`, ограничена только загрузка;
* конверт в базе растёт всю запись: `persistSpeechRecording` пишет `merge(stored, cached)`, вытеснение
  чистит только горячий кэш.

**(б) У `ai_jobs` не было ни одного индекса кроме первичного ключа.**
Прочитано мной на живой базе (`dental_crm`, PostgreSQL 18.4 на 127.0.0.1:5432), а не взято из отчёта:
```
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'ai_jobs';
  ai_jobs_pkey | CREATE UNIQUE INDEX ai_jobs_pkey ON public.ai_jobs USING btree (id)
```
Ровно одна строка. А хранилище диктовки ищет строку записи по паре
`(organization_id, input_storage_path)`: `storage.ts:531-538` (чтение конверта) и `storage.ts:632-636`
(его перезапись). То есть два последовательных чтения таблицы на КАЖДЫЙ фрагмент диктовки.

## Что изменено

**`apps/api/drizzle/0134_ai_jobs_recording_path_index.sql` (новый).**
Проверка дубликатов в `DO`-блоке (падает читаемым сообщением с числом конфликтующих групп — иначе на
чужой базе была бы невнятная «could not create unique index»), затем
`CREATE UNIQUE INDEX IF NOT EXISTS ai_jobs_organization_storage_path_key ON ai_jobs (organization_id, input_storage_path)`.
Номер выбран по факту: `fd -e sql` дал 91 файл с максимумом `0133_portal_otp_codes.sql`.
`db:generate` не запускался — `drizzle.config.ts` до сих пор объявляет `driver: "pglite"`.
Без `CONCURRENTLY`: `apps/api/src/scripts/migrate.ts` выполняет файл целиком в ОДНОЙ транзакции, где
`CONCURRENTLY` запрещён Postgres.

**`apps/api/src/db/schema.ts`.** `uniqueIndex` добавлен в список импорта из `drizzle-orm/pg-core`;
у `aiJobs` появилось объявление того же индекса. Ничего кроме индекса не тронуто.

**`apps/api/src/speech/storage.ts`.**
* Три новых предела, все из окружения: `DENTAL_SPEECH_RESTORED_RECORDINGS_TOTAL` (160),
  `DENTAL_SPEECH_RESTORED_CHUNKS_TOTAL` (48 000), `DENTAL_SPEECH_RESTORED_CHARS_TOTAL` (64 000 000).
* Внешний `LIMIT` с порядком `ORDER BY ranked.recording_rank ASC, ranked.updated_at DESC` — сначала
  самая свежая запись КАЖДОЙ клиники, потом вторая по свежести каждой. Простой `updated_at DESC` вернул
  бы несправедливость, ради устранения которой появилось ранжирование по организации.
* Запись поднимается ЦЕЛИКОМ или не поднимается: половина записи выглядела бы как запись с дырами в
  нумерации, и сборка сообщала бы «нет фрагментов с индексами …» про текст, который в базе есть.
* Бюджет считается от ВСЕГО горячего кэша, а не от прибавки восстановления.
* Пропущенной записи ключи `durableChunkKeys` НЕ выдаются: иначе повторный фрагмент такой записи попал бы
  в кэш, а `withDurableSpeechRecording` счёл бы его уже сохранённым и не записал бы улучшенный текст.
* `speechDurableRestoreState()` отдаёт `loadedRecordings`, `skippedRecordings`, `cachedChunks`,
  `cachedChars`; `resetSpeechTranscriptionCacheForRestart()` их сбрасывает; `speechDurableStoreWarning()`
  получила третью ветку с числом неподнятых записей.

**`apps/api/src/speech/tests/storageRestoreCeiling.test.ts` (новый).** Три проверки, см. ниже.

## НОВЫЙ ПОТОЛОК ПАМЯТИ — арифметика на ИЗМЕРЕННОЙ константе

Константа измерена мной, а не взята из головы:
`node --expose-gc --import tsx .agents/archon/packets/S3-aijobs-index-and-ram/ram-probe.mjs measure 20 100 2000`
```
cold cache before measurement: cachedChunks=0 cachedChars=0
loadedRecordings=20 skippedRecordings=0
cachedChunks=2000 cachedChars=4000000
heapUsed before=37671976 after=49703688 delta=12031712 bytes (11.47 MB)
bytes per cached character: 3.008
bytes per cached chunk: 6015.9
bytes per chunk OBJECT with a two-byte-per-char string assumption: 2015.9
```
2000 фрагментов по 2000 кириллических символов = 11.47 МиБ живой памяти. Разложение сходится:
`2000 симв. x 2 Б = 4000 Б` строки плюс `~2016 Б` объекта фрагмента = 6016 Б, что совпадает с
измеренными 6015.9 Б на фрагмент.

**Худший случай ПОСЛЕ правки, на значениях по умолчанию:**
```
строки:  64 000 000 симв. x 2 Б  = 128 000 000 Б
объекты:     48 000 фрагм. x 2016 Б =  96 768 000 Б
итого                              = 224 768 000 Б = 214.4 МиБ
```
Оба бюджета могут быть насыщены одновременно (64 млн символов на 48 000 фрагментов — это 1333 символа на
фрагмент, вполне достижимо), поэтому 214 МиБ — именно потолок, а не сумма несовместимых случаев.
**Он НЕ зависит от числа арендаторов.** Число записей ограничено дополнительно:
`min(160, 80 x число клиник)`.

**Худший случай ДО правки, на той же измеренной константе:**
`80 записей x 600 фрагментов = 48 000 фрагм.`, `48 000 x 20 000 симв. = 960 000 000 симв.` НА КАЖДУЮ
организацию:
```
960 000 000 x 2 Б + 48 000 x 2016 Б = 2 016 768 000 Б = 1.88 ГиБ НА ОРГАНИЗАЦИЮ, x число организаций
```
То есть ревьюер, посчитавший «примерно 960 МБ на организацию», занизил ровно вдвое: он считал по одному
байту на символ, а кириллица в строках V8 занимает два. Это уточнение в пользу его вывода, не против.

## ПРОВЕРЕНО

**DB VERIFIED — `EXPLAIN (ANALYZE, BUFFERS)` того же предиката ДО индекса** (настоящее состояние до
миграции, 5000 строк в `ai_jobs`, `ANALYZE` выполнен):
```
ai_jobs rows at EXPLAIN time: 5000
Limit  (cost=0.00..251.00 rows=1 width=69) (actual time=0.021..0.021 rows=1.00 loops=1)
  Buffers: shared hit=9
  ->  Seq Scan on ai_jobs  (cost=0.00..251.00 rows=1 width=69) (actual time=0.020..0.020 rows=1.00 loops=1)
        Filter: ((organization_id = '4a3420d1-6ffb-4459-bd8f-7f7087f5e191'::uuid) AND (input_storage_path = 'speech-recording://s3-index-probe-100'::text))
        Rows Removed by Filter: 100
        Buffers: shared hit=9
Execution Time: 0.028 ms
```

**DB VERIFIED — тот же предикат ПОСЛЕ индекса, те же 5000 строк:**
```
Limit  (cost=0.28..8.30 rows=1 width=69) (actual time=0.007..0.008 rows=1.00 loops=1)
  Buffers: shared hit=3
  ->  Index Scan using ai_jobs_organization_storage_path_key on ai_jobs  (cost=0.28..8.30 rows=1 width=69)
        Index Cond: ((organization_id = 'd0000000-0000-4000-8000-00000000d001'::uuid) AND (input_storage_path = 'speech-recording://s3-index-probe-4999'::text))
        Index Searches: 1
Execution Time: 0.013 ms
```
`Seq Scan` заменён на `Index Scan`, оценка узла 251.00 -> 8.30.

**DB VERIFIED — худший случай для перебора, для честного сравнения на ОДНОЙ И ТОЙ ЖЕ строке.**
Настоящий замер «до» выше сделан по физически ранней строке, где `Seq Scan` под `LIMIT 1` останавливается
после сотни строк. Для физически последней строки прежний план воспроизведён отключением индексных
планов В СЕССИИ (`SET enable_indexscan=off` и т. д.; база не менялась):
```
Limit  (cost=0.00..251.00 rows=1) (actual time=0.431..0.431 rows=1.00 loops=1)
  ->  Seq Scan on ai_jobs
        Rows Removed by Filter: 4999
        Buffers: shared hit=176
Execution Time: 0.437 ms
```
Против `Buffers: shared hit=3` и 0.013 мс по индексу на той же строке: 176 буферов -> 3, время 0.437 -> 0.013 мс.

**DB VERIFIED — миграция применена:**
```
$ npm run db:migrate:check -w @dental/api
[migrate] будет применён: 0134_ai_jobs_recording_path_index.sql
[migrate] Готово. Всего файлов: 92, к применению: 1, уже было: 91.        (exit 0)

$ npm run db:migrate -w @dental/api
[migrate] применён: 0134_ai_jobs_recording_path_index.sql
[migrate] Готово. Всего файлов: 92, применено: 1, уже было: 91.           (exit 0)
```
Ожидающей была РОВНО одна миграция — моя; чужих файлов проход не подхватил.

**DB VERIFIED — запись в журнале и индекс в каталоге:**
```
_dente_migrations: 0134_ai_jobs_recording_path_index.sql
  checksum a6d197df4a131a08ad3b43309a05a08d966540b39562b4c03d4b1821ae2ed023  applied_at 2026-07-28T00:44:32.462Z
pg_indexes ON ai_jobs:
  ai_jobs_organization_storage_path_key | CREATE UNIQUE INDEX ... USING btree (organization_id, input_storage_path)
  ai_jobs_pkey                          | CREATE UNIQUE INDEX ... USING btree (id)
```

**DB VERIFIED — уникальность действительно держит, и второго автора таблицы не ломает**
(вставки в транзакции с обязательным ROLLBACK, база не изменена):
```
DUPLICATE REFUSED: code=23505 constraint=ai_jobs_organization_storage_path_key
  message: duplicate key value violates unique constraint "ai_jobs_organization_storage_path_key"
THREE ROWS WITH NULL input_storage_path IN ONE ORGANIZATION ACCEPTED — db/aiQuery.ts is unaffected
```

**UNIT VERIFIED — потолок держится на нескольких клиниках:**
```
$ node --import tsx --test src/speech/tests/storageRestoreCeiling.test.ts
▶ потолок памяти восстановления расшифровок
  ✔ общее число поднятых записей не растёт с числом клиник (30.5835ms)
  ✔ запись, не влезающая в бюджет фрагментов, не поднимается половиной и не теряет текст (12.7356ms)
  ✔ символьный бюджет отказывает длинной записи и оставляет её в базе целой (5.3749ms)
ℹ tests 3  ℹ pass 3  ℹ fail 0                                            (exit 0)
```
Первая проверка СНАЧАЛА измеряет прежнее поведение: с общим пределом 1000 восстановление поднимает все
четыре записи двух клиник (`loadedRecordings >= 4`), то есть `предел клиники x число клиник`. Затем тот же
набор данных при общем пределе 2 даёт `loadedRecordings === 2`, не больше двух засеянных записей в памяти
и записи ОБЕИХ клиник под потолком. Вторая проверка: запись из трёх фрагментов при бюджете в два фрагмента
не поднимается вовсе (0, а не 2), пропуск виден в предупреждении сборки, строка в базе цела, и следующий
фрагмент даёт в `result_text` все четыре строки — усечение восстановления текст не теряет. Третья:
`cachedChars` не превышает предел, текст длинной записи в базе не изменён.

**UNIT VERIFIED — регресса нет:**
```
$ node --import tsx --test src/speech/tests/storage.test.ts            -> tests 9  pass 9  fail 0  (exit 0)
$ node --import tsx --test src/speech/tests/storageRestoreRetry.test.ts -> tests 3  pass 3  fail 0  (exit 0)
```

**TYPECHECK VERIFIED** — `npm run typecheck -w @dental/api` -> `TYPECHECK_EXIT=0` (дважды: до и после
добавления теста).

**Кодировка** — `node .agents/archon/packets/S3-aijobs-index-and-ram/encoding-check.cjs` ->
`FILES WITH PROBLEMS: 0` по всем четырём файлам.

**База возвращена в исходное состояние.** Все зондовые строки удалены по своей метке:
`DELETED 5000 probe rows; probe rows left: 0; ai_jobs rows now: 0` и
`DELETED 20 ram-probe rows; ai_jobs rows now: 0`. `ai_jobs` — 0 строк, как и до начала работы. Индекс
остался (он и есть результат).

## НЕ ПРОВЕРЕНО

1. **Повторный замер стоимости фрагмента на 200-фрагментной записи (первые 20 против последних 20).**
   Ревьюер получил 3.3 мс -> 10.45 мс ДО индекса; я показал заменой плана, что предикат стал
   индексным, но саму кривую записи заново не гонял. Закрывается: прогнать те же 200
   `recordSpeechTranscriptionChunk` подряд и напечатать среднее по первым и последним двадцати.
   Точная команда: `node --expose-gc --import tsx <скрипт с 200 фрагментами через recordSpeechTranscriptionChunk>`
   — скрипта в репозитории нет, его надо написать.
   **Важно:** индекс убирает только слагаемое перебора. Пересериализация ВСЕГО конверта на каждый
   фрагмент осталась, поэтому кривая роста никуда не денется, она лишь станет ниже. Обещать «рост
   исчез» было бы ложью.
2. **`ON CONFLICT ... DO UPDATE` в `persistSpeechRecording` не сделан.** Уникальный индекс уже
   превращает гонку в громкий отказ (доказано выше кодом 23505), но запись всё ещё «UPDATE, потом
   INSERT». Это вне делянки: строки 632-645 — регион, который в этом же цикле правил пакет S2.
   Закрывается: переписать вставку на `.onConflictDoUpdate({ target: [aiJobs.organizationId, aiJobs.inputStoragePath], set: values })`
   плюс тест на две параллельные первые записи одной `recordingId`.
3. **Записи, отрезанные внешним `LIMIT`, не попадают в счётчик `skippedRecordings`.** Считаются только
   отказы по бюджету фрагментов и символов: строки, обрезанные SQL-лимитом, из базы не возвращаются, и
   узнать их число этот код не может. То есть САМОЕ вероятное усечение (по числу записей) остаётся
   молчаливым. Закрывается отдельным дешёвым запросом без `input_text`:
   `SELECT count(*) FROM (SELECT row_number() OVER (PARTITION BY organization_id ORDER BY updated_at DESC) AS r FROM ai_jobs WHERE kind='voice_transcription' AND input_storage_path LIKE 'speech-recording://%') t WHERE t.r <= <предел клиники>`
   — разница с числом вернувшихся строк и есть точное число отрезанных. Внутрь основного запроса
   `count(*) OVER ()` добавлять НЕЛЬЗЯ: `WindowAgg` протащит через себя все `input_text`, то есть
   вернёт ровно то чтение, от которого потолок и защищает. Не сделано здесь потому, что это ещё одна
   правка `storage.ts`, а файл к тому моменту был занят пакетом S2, и коммит по этому пути забрал бы
   его незакоммиченную работу.
4. **Жадная загрузка на импорт модуля НЕ переделана — это осознанный отказ, а не забывчивость.**
   Задание прямо велело оценить форму и не выполнять переделку в этом отрезке. Оценка: жадная загрузка
   здесь лишняя. Горячий кэш нужен ровно одному читателю — `GET /api/speech/chunks`; путь записи уже
   читает конверт по `recordingId` (`loadDurableRecordingEnvelope`) и в кэше не нуждается. Правильная
   форма — ленивое чтение по `recordingId` на первое обращение, тогда потолок становится не нужен
   вовсе. Переделка задевает роуты чтения и границу перезапуска процесса, поэтому это отдельная задача.
5. **Значение 214 МиБ — арифметика на измеренной константе, а не прямое измерение насыщенного потолка.**
   Измерены 2000 фрагментов и 4 млн символов (11.47 МиБ живой памяти) и получены 3.008 Б на символ и
   2016 Б на объект фрагмента; до полного бюджета (48 000 фрагментов, 64 млн символов) я
   экстраполировал. Закрывается: `ram-probe.mjs seed 160 300 4000` (48 000 фрагментов, 192 млн символов)
   и затем `ram-probe.mjs measure 160 300 4000` — это запишет в общую базу около 400 МБ, поэтому на
   общем сервере разработки я этого делать не стал.
6. **`API VERIFIED` не заявляется.** Живой сервер на 4100 запущен без `--watch` и мой изменённый
   `storage.ts` в него не попал, а перезапускать общий сервер запрещено. Восстановление вообще не
   имеет своего HTTP-входа: оно срабатывает на импорт модуля.
7. **`npm test -w @dental/api` целиком не гонялся** (844+ теста). Запускались три файла речи и
   компилятор. Закрывается: `npm test -w @dental/api`.

## Коммит

* `b46ddf7b4c20d76d750233afb929e2b7afe0349d` —
  `[ARCHON] fix(диктовка): память восстановления росла с числом клиник, а строка записи искалась перебором таблицы`
  7 файлов: миграция, `db/schema.ts`, `speech/storage.ts`, `state.md`, `commitmsg.txt`, `db-probe.mjs`,
  `encoding-check.cjs`.
* `1acbb98d718879bc4adff928a4499554c4ebc85d` —
  `[ARCHON] test(диктовка): рост памяти восстановления по числу клиник не проверял ни один тест`
  4 файла: тест, `db-probe.mjs`, `state.md`, `commitmsg-test.txt`.

Ни `apps/api/dist/**`, ни `.data/*.json`, ни `*.tsbuildinfo`, ни `scratch/**`, ни чужих файлов.
**Замечание по гигиене индекса:** `git commit -F <msg> -- <пути>` на НЕотслеживаемых путях падает
(«did not match any file(s) known to git») и не коммитит ничего — новые файлы надо сначала добавить
поштучно, потом коммитить тем же списком путей. Первая попытка поэтому не создала коммита вообще; индекс
после неё проверен и был пуст, чужого не подметено. В момент второго коммита в общем индексе лежал
`apps/api/src/speech/tests/storageIdentity.test.ts` пакета S2 (`A`) — он НЕ снят с индекса и НЕ сброшен,
явный список путей просто его не тронул.

## Долг

1. **Долг из пункта 3 «НЕ ПРОВЕРЕНО» — молчаливое усечение по числу записей.** Самый значимый из
   оставшихся: администратор не узнает, что часть расшифровок не поднята.
2. **`ON CONFLICT DO UPDATE`** (пункт 2). Индекс сделал гонку громкой, но не бесшовной.
3. **Русские строки на сервере.** Новое предупреждение о неподнятых записях — ещё одна русская строка
   в коде без словаря. Словаря для предупреждений речи не существует, файл и без того целиком русский;
   долг объявляется, а не прикрывается.
4. **Три новых переменных окружения нигде не задокументированы** кроме комментария в
   `storage.ts:108-149`: ни `.env.example`, ни `.agents/DATABASE.md`, ни `COMMANDS_AND_TESTS.md` о них не
   знают. Их отсутствие безопасно (все три имеют значения по умолчанию), но администратор их не найдёт.
5. **Индекс создан без `CONCURRENTLY`.** На маленькой таблице это неважно, но если `ai_jobs` вырастет,
   пересоздавать его придётся вне мигратора: мигратор держит файл в одной транзакции.
