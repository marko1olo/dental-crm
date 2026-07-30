# U6-state-snapshot-writes — сдача

HEAD: 94871d09a9b99d9a4122cb8a7299a175e6c5ef50 (`git rev-parse HEAD` на момент сдачи)
HEAD на момент старта: e14c09862cf9ba58c7bfa05713695b4fcfece8da

## Что было сломано (file:line)

`apps/api/src/sampleData.ts:4782` — `persistMutableState()`:

```ts
function persistMutableState(): void {
	savePersistentState(mutableStateSnapshot());
}
```

Вызывался из **31 места** этого же файла, синхронно, прямо в обработчике
запроса, до ответа клиенту. Каждый вызов записывал ВЕСЬ снимок изменяемого
состояния в `apps/api/.data/dental-crm-state.json`.

Одна такая запись — это не одна запись файла. `persistentState.ts:242-265`:

1. `checksumPersistentState()` — полный `JSON.stringify` всего состояния + sha256;
2. `rotateStateBackup()` — `copyFileSync` предыдущего файла целиком в
   `backups/`, затем `readdirSync` + `statSync` по каждой копии + `unlinkSync`
   устаревших;
3. `JSON.stringify(payload, null, 2)` — второй полный проход, с отступами;
4. `writeFileSync` + `renameSync`.

Массивы, которые сериализует `mutableStateSnapshot()` (`sampleData.ts:4751`),
наполняются строками Postgres в `db/domainStateHydration.ts`, поэтому файл
растёт вместе с базой. В живом файле уже сейчас `clinicalRules` 79 488 Б и
`auditEvents` 76 401 Б, причём журнал аудита только пополняется, и каждое
`recordAuditEvent()` (`sampleData.ts:12078`) и добавляет в него запись, и
переписывает файл целиком.

### Досягаемость (проверено импортами, не строкой регистрации)

`apps/api/src/routes/telegram.ts:36-65` импортирует из `sampleData.ts` 12
мутаторов, дающих **15 из 31** места вызова: `claimDenteTelegramWebhookUpdate`,
`recordDenteTelegramWebhookEvent`, `consumeDenteTelegramLinkCode`,
`createDenteTelegramLinkCode`, `createDenteTelegramCareRequest`,
`createDenteTelegramContactRequest`, `createDenteTelegramDocumentRequest`,
`handleDenteTelegramAppointmentCallback`, `recordDenteTelegramOutboxDelivery`,
`claimDenteTelegramOutboxDeliveryReceipt`, `revokeDenteTelegramChatLink`,
`updateDenteTelegramBotSettings`. Маршруты зарегистрированы (`server.ts:41`
`registerTelegramRoutes`, `registerTelegramWebhookRoutes`). Тот же файл на
:1477 вызывает `hydrateDomainStateFromDb()` — то есть вебхук СНАЧАЛА заливает
строки Postgres в массивы, а ПОТОМ пишет их все в JSON-файл. Утверждение досье
о «записи размера базы на действие Telegram» подтверждено.

Остальные 16 мест вызова живут в мутаторах, у которых есть `*InDb`-двойники, и
маршруты зовут именно двойников (`saveUiPreferences`, `upsertVisitDraftAutosave`,
`issueGeneratedDocument`, `voidGeneratedDocument`, `storeTaxXmlSnapshot`,
`storeIssuedDocumentSnapshot`, `recordImportBatch`,
`recordSpeechTranscriptionChunk`, `resetToDemo`, `resetToZeroMode`,
`recordAuditEvent`, `getOrCreateImagingViewerSession`,
`saveImagingViewerSession` — последние два маршрут imaging берёт из
`db/imagingQuery.ts`, а не отсюда). Из HTTP они сегодня не достигаются. Я не
выдаю их за живые.

## Что изменено

`apps/api/src/sampleData.ts` — только тело `persistMutableState()` и то, что
ему нужно:

- фиксированное окно слияния: вызов помечает состояние изменённым и заводит
  ОДИН таймер; все вызовы до его срабатывания дают одну запись, и запись уходит
  с пути запроса (после ответа клиенту);
- окно фиксированное, а не продлеваемое при каждом изменении. Продлеваемое
  (классический debounce) при непрерывном потоке изменений не записало бы файл
  никогда; фиксированное ограничивает устаревание снимка сверху окном;
- окно по умолчанию 250 мс = пятикратная стоимость одной записи на клинике в
  10 000 пациентов по замеру ниже, то есть не больше пятой части времени цикла
  событий даже при непрерывных изменениях. Переопределяется
  `DENTAL_STATE_FLUSH_DELAY_MS`; `0` возвращает прежнее синхронное поведение;
  нечитаемое значение даёт значение по умолчанию, а НЕ тихий ноль;
- таймер `unref()` — не удерживает процесс; одноразовые скрипты и тесты
  завершаются сразу;
- `flushPersistentStateNow()` (экспорт) + `process.on("exit", …)`:
  `gracefulShutdown` в `server.ts:531` доходит до `process.exit(0)`, поэтому
  корректная остановка дописывает отложенный снимок и ничего не теряет.

`apps/api/src/tests/mutableStateFlushCoalescing.test.ts` — новый тест (7
случаев), считает РЕАЛЬНЫЕ записи файла.

Файл удалять было нельзя: `applyPersistentState()` читает его на загрузке
модуля (`sampleData.ts:4976`, вызов на :5044), `routes/system.ts:669` и `:694`
отдают по нему отчёт целостности и экспорт, `scripts/migrateStateToDb.ts:57`
читает его при миграции. Читателей проверял `rg`, а не память.

## ПРОВЕРЕНО

**ЗАМЕР ДО (реальные числа, не оценка).**
`node .agents/archon/packets/U6-state-snapshot-writes/measure-state-write.mjs`
— повтор алгоритма `savePersistentState()` в каталог `os.tmpdir()`, живой файл
состояния только на чтение, медиана из 10 прогонов:

```
REAL state file: C:\Clinic_MVP\dental-crm\apps\api\.data\dental-crm-state.json
  on-disk bytes (pretty, indent 2): 236,648
  compact re-serialize bytes:       177,187
  clinicalRules 176 items 79,488 bytes | auditEvents 183 items 76,401 bytes

CASE A: current database (3 patients) — 236,648 B per save
  checksumMs 1.08 | backupRotationMs 1.61 | prettyStringifyMs 0.78 | writeRenameMs 1.00
  totalMs median 4.61 ms
CASE B: synthetic 10,000 patients (cloned real records) — 5,803,929 B per save
  checksumMs 19.60 | backupRotationMs 4.04 | prettyStringifyMs 15.05 | writeRenameMs 10.73
  totalMs median 49.54 ms
  TOTAL wall clock for 10 saves: 494.54 ms
  TOTAL bytes for 10 saves: 58,039,290 (+ same again copied as backups)
```

То есть на клинике в 10 000 пациентов одно мелкое действие стоило **49,54 мс
заблокированного цикла событий и 11,6 МБ дискового ввода-вывода** (файл плюс
его резервная копия).

**UNIT VERIFIED (ДО/ПОСЛЕ в одном прогоне).**
`cd apps/api && node --import tsx --test src/tests/mutableStateFlushCoalescing.test.ts`
→ exit 0:

```
  ДО (DENTAL_STATE_FLUSH_DELAY_MS=0): 20 действий -> 20 записей, 725 680 Б
  ✔ ДО: синхронный режим повторяет полную запись на каждое действие
  ПОСЛЕ (окно 60 мс): 20 действий -> 1 запись, 36 284 Б
  ✔ ПОСЛЕ: 20 действий подряд дают ОДНУ запись, и ни одной до ответа клиенту
  ✔ слияние не теряет последнее изменение
  поток: 25 действий за ~250 мс -> 7 записей (окно 50 мс)
  ✔ непрерывный поток изменений не откладывает запись бесконечно
  ✔ разные места вызова сливаются в одну запись, а не в запись на каждое
  ✔ flushPersistentStateNow дописывает отложенное и не пишет повторно
  ✔ мусор в DENTAL_STATE_FLUSH_DELAY_MS не превращается в синхронную запись
ℹ tests 7  ℹ pass 7  ℹ fail 0
```

20 действий: **20 записей и 725 680 Б → 1 запись и 36 284 Б** (в 20 раз меньше
записей, на 95,0 % меньше байт). Первый случай обязателен: если перехват
`fs.writeFileSync` перестанет работать, тест упадёт на нём, а не сделает вид,
что слияние доказано.

**TYPECHECK VERIFIED.** `npm run typecheck -w @dental/api` → EXIT=0 (дважды: до
коммита и на текущем HEAD, уже с чужим коммитом 87e367c40 в дереве).

**ПОЛНЫЙ ПРОГОН.** `npm test -w @dental/api` →
`ℹ tests 964  ℹ suites 157  ℹ pass 964  ℹ fail 0  ℹ duration_ms 25966.35`,
код выхода 0. Мой набор внутри прогона зелёный.

## НЕ ПРОВЕРЕНО

1. **API VERIFIED не заявляю.** Живой сервер отвечает (`curl -s -o /dev/null -w
   "%{http_code}" http://127.0.0.1:4100/api/health` → `200`), и `tsx watch`
   код перечитывает, но единственные достижимые из HTTP места вызова —
   мутаторы Telegram, а Telegram в этом цикле заморожен, и его состояние общее
   с другими агентами. Закрывающая команда (её НЕ запускал):
   `curl -s -X POST http://127.0.0.1:4100/api/telegram/link-codes -H "x-dente-clinic-token: <token>" -H "content-type: application/json" -d '{"subjectType":"patient","subjectId":"<uuid>"}'`
   дважды подряд, затем `ls apps/api/.data/backups | wc -l` до и после: под
   старым кодом каталог пополнялся дважды, под новым — один раз.
2. **Числа CASE B — синтетика по форме реальных записей.** Массив пациентов
   раздут до 10 000 клонированием реальных записей с новыми id, прочие
   коллекции оставлены как есть. Это честный замер стоимости сериализации на
   таком объёме, но не замер живой клиники на 10 000 пациентов. Закрывается
   только замером на такой базе.
3. **Экономию на живой нагрузке не мерил.** Сколько записей в минуту сервер
   делает под реальной работой клиники — неизвестно; известно только
   соотношение на пачку действий. Закрывается счётчиком записей в
   `getPersistentStateMeta()` и наблюдением за сутки.
4. **UI VERIFIED — не моё.**

## Коммит

- `01f7a797b52dacc024b7cebe53530e6595e36a52` —
  `[ARCHON] fix(состояние): любое мелкое действие переписывало весь снимок базы в файл`
  (`apps/api/src/sampleData.ts`, 80 insertions(+), 1 deletion(-))
- `0d219199e708fbbae66073cef69e195ad15c8c25` —
  `[ARCHON] test(состояние): число записей снимка на пачку действий никто не измерял`
  (новый файл теста, 226 insertions(+))
- `94871d09a9b99d9a4122cb8a7299a175e6c5ef50` —
  `[ARCHON] test(состояние): слияние записей проверялось только на одном месте вызова`
  (+34/-3 в том же тесте)

Чужого в коммитах нет, индекс на момент каждого коммита содержал только мой
путь (проверял `git diff --cached --name-only` перед каждым).

## Долг

1. **Правка досье, а не кода.** `RECON_DOSSIER.md` §5.7 говорит «32
   `persistMutableState()` call sites». Мест вызова **31**. 32 — это число
   совпадений `rg` вместе со строкой объявления `sampleData.ts:4782`.
   Проверка: `rg -n "persistMutableState\(\)" apps/api/src/sampleData.ts | wc -l`
   → 32, минус строка объявления.
2. **Записывается всё, а не изменившееся.** Стоимость записи по-прежнему
   пропорциональна ВСЕМУ состоянию, а не изменению. Правильный уровень —
   поколлекционная отметка «изменено» и формат файла, который умеет частичное
   обновление; это `persistentState.ts`, вне моего клейма. Самая быстро
   растущая коллекция — `auditEvents`, она только пополняется, и её место —
   таблица Postgres `auditEvents` (она уже есть, `audit.ts:21` в неё пишет), а
   не JSON-файл рядом с процессом. Долговечность принадлежит Postgres.
3. **Резервные копии обесценены ротацией на каждую запись.**
   `persistentState.ts:196-211` копирует файл при КАЖДОЙ записи и держит 30
   копий. Замер на диске: 30 копий за 50 минут (06:27→07:17, 6,5 МБ). Тридцать
   копий за час — это не резервное копирование, это шум: ошибочную запись,
   замеченную через час, восстановить уже нечем. Слияние записей уменьшает шум
   пропорционально, но не лечит саму схему: ротация должна быть по времени
   (одна копия в N минут), а не по записи. Файл вне моего клейма.
   Дополнительно: имя копии содержит миллисекунды, поэтому две записи в одну
   миллисекунду молча затирают одну копию другой.
4. **Отчёт целостности и экспорт могут отставать на окно.**
   `routes/system.ts:669` и `:694` читают файл с диска, а не память. После
   изменения в течение окна (250 мс) они покажут предыдущий снимок. В людских
   масштабах это незаметно, но честная правка — вызвать
   `flushPersistentStateNow()` первой строкой этих двух обработчиков.
   `routes/system.ts` вне моего клейма, поэтому не сделано.
5. **Наблюдаемость.** Числа записей и сэкономленных байт нигде не видны в
   рантайме. `getPersistentStateMeta()` — естественное место для счётчика
   «записей с момента старта», но это `persistentState.ts`, вне клейма.
6. **Чужое, замечено по ходу.** `apps/api/src/tests/routes/portalOtp.test.ts:147`
   (`after`-хук) падает на удалении организации: FK `patients_organization_id…`
   и `portal_otp_codes_patient_id_fkey` — в базе остаются строки, которые хук
   не убирает. В первом прогоне это дало `npm test` код выхода 1, во втором —
   0 при `fail 0`, то есть тест плавающий и зависит от остатков в общей базе.
   Мой пакет Postgres не касается; чинить не мой клейм (файл из пакета
   `P2-portal-otp`, коммит `e14bc316a`).
7. **Мёртвая копия.** `apps/api/src/sampleData_opt.ts` содержит те же 32
   совпадения и ту же схему записи; импортёров ноль, в `tsconfig.json:41`
   исключён. Не правил специально: править мёртвый код — значит делать вид, что
   он живой. Его место — удаление отдельным пакетом.
