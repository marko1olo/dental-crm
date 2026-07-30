# P3-syncdaemon — handoff

HEAD: c97ceb4d8136e70d4c764050403eae166e379b4a
Пакет начат на HEAD 0b208ef17edba4b8e145bbdbb3e42ea68cd87267 (не на f09869601 из брифа — за это
время соседние агенты успели закоммитить).

## Что было сломано

`apps/api/src/services/syncDaemon.ts` (326 строк, удалён). Все цитаты досье подтверждены лично
чтением файла целиком до правки.

| Утверждение досье | Проверка |
|---|---|
| `:185-227` при выключенном моке `response` — жёстко зашитый литерал | ТОЧНО. Тернарник `:185-196`, ложная ветка = `{ success: true, cloudChanges: {5 пустых массивов} }` |
| `if (response.success)` запускает пять `db.update().set({ isSynced: true })` | ТОЧНО. `:198` условие, `:200-233` пять апдейтов: patients, visitDiaries, toothStates, treatmentPlans, patientInvoices |
| В файле НОЛЬ сетевых вызовов | ТОЧНО. Импорты только `drizzle-orm` и `db/*`. Ни fetch, ни http, ни axios, ни undici |
| `mockCloudVaultExchange()` на `:51-99` подсовывает реальный счёт как оплаченный | ПОЧТИ. Функция занимает `:51-101`, а не `:51-99` — единственная неточность досье. SELECT неоплаченного счёта `:69-73`, инъекция `status:"paid"`, `version+1` — `:81-87` |
| Гейт `NODE_ENV!=="production" && DENTE_SYNC_MOCK_CLOUD_ENABLED==="1"` | ТОЧНО, `:20-25` |
| `startSyncDaemon` на `:27`, ноль точек вызова | ТОЧНО, см. перепись ниже |

**Найдено сверх брифа:** дефект не ограничивался `isSynced`. На `:285-299` путь слияния при
«оплате из облака» дополнительно делал `db.insert(cashLedger)` с `paymentMethod: "card"` и
`amountRub: record.totalAmountRub`. То есть выдуманная оплата попадала в кассовую книгу —
это фабрикация денег, а не только ложная отметка о резервной копии.

Мелочь: `:5` импортировал `organizations` и нигде его не использовал.

### Перепись точек вызова (делал сам, не поверил на слово)

`rg` по `apps`, `packages`, `scripts` для `startSyncDaemon|stopSyncDaemon|runSyncCycle|SyncReport|
mockCloudVaultExchange` — совпадения ТОЛЬКО внутри самого `syncDaemon.ts`. Барреля
`services/index.ts` не существует. Все прочие упоминания имени по репозиторию — комментарии и
документация, ни одного `import`:

- `apps/api/tsconfig.json:17` — комментарий
- `apps/api/src/services/syncEngine.ts:6` — комментарий
- `apps/api/src/db/schema.ts:1391,:2126` — комментарии (P2 владеет schema.ts, НЕ ТРОГАЛ)
- `HANDOVER_AUDIT_2026-07-26.md:304-306`, `.agents/archon/*` — документация
- `.dente-ops-shots/backup/schema.ts` — дамп бэкапа, не исходник

Живых вызовов нет. Удаление ничего не ломает.

## Что изменено

1. **`apps/api/src/services/syncDaemon.ts` — УДАЛЁН** (`git rm`, 326 строк).
2. **`apps/api/tsconfig.json`** — только комментарий `:16-20`. Он перечислял `syncDaemon` среди
   живых сломанных модулей; теперь там записано, что файл удалён и почему. **Список `exclude`
   не тронут**, поведение сборки не менялось.
3. **`apps/api/dist/services/syncDaemon.js`** — удалена осиротевшая скомпилированная копия.
   Файл был untracked и под `.gitignore:2 (dist/)`, в git не попадал. Проверено: ни один файл в
   `dist` его не импортирует, в `dist/server.js` (боевой вход `npm start`) ноль упоминаний.
   На git это никак не влияет.

Не тронуто: `db/schema.ts` (P2), `syncEngine.ts` (только отчёт), `scratch/`, `.env*`.

## ПРОВЕРЕНО

**TYPECHECK VERIFIED** — `npm run typecheck -w @dental/api` → exit 0, пустой вывод.
```
> @dental/api@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit
=== TYPECHECK EXIT: 0 ===
```

**UNIT VERIFIED** — `npm test -w @dental/api` → exit 0.
```
ℹ tests 844
ℹ suites 135
ℹ pass 844
ℹ fail 0
ℹ duration_ms 20560.5733
=== TEST EXIT: 0 ===
```
Ни один тест не ссылался на демон (проверено переписью до удаления), поэтому вместе с ним
не удалено ни одного теста. Тесты реального поведения не пострадали.

**API VERIFIED** — `curl http://127.0.0.1:4100/api/health` → `HTTP 200`,
`{"ok":true,"service":"dental-crm-api","time":"2026-07-27T20:47:59.523Z"}`.
Это не формальность: дев-сервер работает через `tsx watch src/server.ts`, то есть после удаления
файла он перезагрузился. Если бы демон кто-то импортировал, загрузка упала бы с
«does not provide an export named». Живой 200 — независимое подтверждение переписи точек вызова.

**Кодировка** — `node scripts/check-encoding.mjs` мой файл НЕ помечает (`grep -c tsconfig` = 0).
Русский комментарий в `tsconfig.json` записан редактором, UTF-8 без BOM, мохибаки нет.
Русский заголовок коммита в `git log -1` отображается корректно.

### Главный ответ на вопрос лида: кто теперь пишет `isSynced`?

**После удаления `isSynced: true` не пишет НИ ОДИН путь в коде.** Полная перепись `isSynced|is_synced`
по `apps`, `packages`, `scripts` — все оставшиеся записи ставят только `false` при вставке:

- `apps/api/src/routes/workspaceProfile.ts:333` → `isSynced: false`
- `apps/api/src/routes/odontogram.ts:341`, `:447`, `:468` → `isSynced: false`
- `apps/api/src/tests/db/patientsQuery.test.ts:192` → `isSynced: false` (фикстура)
- `apps/api/src/db/schema.ts:300, 1319, 1393, 1435, 1544` → определение колонки, `.default(false)`

Колонка честно остаётся `false` навсегда, потому что выгрузки в облако действительно не существует.
Это правильное состояние: раньше база утверждала обратное.

## НЕ ПРОВЕРЕНО

- Что удаление не ломает боевую сборку `dist`: типчек гоняет `--noEmit`.
  Закрывается: `npm run build -w @dental/api`.
- Что в БД нет строк, которым фальшивый демон уже проставил `isSynced = true` в прошлых прогонах.
  Демон никогда не вызывался, так что записей быть не должно, но я это не читал из базы.
  Закрывается: `psql -h 127.0.0.1 -p 5432 -d <db> -c "select count(*) from patients where is_synced;
  select count(*) from visit_diaries where is_synced; select count(*) from tooth_states where is_synced;
  select count(*) from treatment_plans where is_synced; select count(*) from patient_invoices where is_synced;"`
- Что в `cash_ledger` нет фальшивых строк от мок-ветки.
  Закрывается: `psql -h 127.0.0.1 -p 5432 -d <db> -c "select id, invoice_id, amount_rub, timestamp
  from cash_ledger where payment_method = 'card' order by timestamp desc limit 20;"`

## Коммит

`c97ceb4d8136e70d4c764050403eae166e379b4a`
`[ARCHON] fix(синхронизация): медкарты помечались выгруженными в облако после нуля отправленных байт`
`git log -1 --stat`: 1 file changed, 6 insertions(+), 2 deletions(-) — только `apps/api/tsconfig.json`.
Чужих файлов в коммите нет.

## Долг / Blockers

### 1. КОЛЛИЗИЯ: моё удаление уехало в чужой коммит

`git rm` проиндексировал удаление. До того, как я успел закоммитить, соседний агент собрал мою
уже проиндексированную правку в СВОЙ коммит **`8c87dcd93`**
«[ARCHON] docs(агенты): закон утверждал, что базы нет на 5432 — агентов уводили от живого движка».

```
git show --stat 8c87dcd93
 .agents/AGENTS.md                   |   2 +-
 .agents/DATABASE.md                 | 115 +++++++++----
 apps/api/src/services/syncDaemon.ts | 326 ------------------------------------
```

Это ровно тот вред, от которого предостерегает `.agents/INDEX.md` («Local Swarm Rules», не
использовать `git add .`). Последствие: удаление 326 строк фабрикующего кода лежит в истории под
заголовком про документацию. По `git log` причину исчезновения демона не найти. Чужой коммит я
**не переписывал** (ни amend, ни rebase); полную причину записал в тело своего `c97ceb4d8`.
Решение — за лидом.

### 2. `syncEngine.ts` — мёртвый, но НЕ той же природы (отчёт, не удалял)

`apps/api/src/services/syncEngine.ts` прочитан целиком (108 строк).

- Ноль точек вызова: `startSyncEngine`/`stopSyncEngine` определены и нигде не вызываются.
- Исключён из типчека: `apps/api/tsconfig.json:32`.
- Импортирует `@electric-sql/pglite` и `@electric-sql/pglite-sync`. **Ни один не установлен и
  ни один не значится ни в одном `package.json`** (проверено). При реальной загрузке файл упадёт.
- Принимает параметр `pgliteClient: PGlite`, а движок PGlite из проекта удалён.
- Ссылка на `syncDaemon` — комментарий `:6`, не импорт. Удаление демона его не задело.

**Той же фабрикации в нём НЕТ.** Он не пишет в БД вообще, не подделывает `success`, не трогает
`isSynced`. Без `ELECTRIC_SYNC_URL` он честно печатает «Local-Only Isolated Mode» и выходит.
Это мёртвый, но не лгущий код. Отдельным пакетом на удаление он тянет, но по приоритету он
несопоставим с P3 — вреда он причинить не может.

Отдельный запашок: `syncEngine.ts:42-43` собирает SQL-условие `WHERE` склейкой строк
(`orgIds.map(id => \`'${id}'\`).join(",")`). Значения — UUID из своей же БД, но форма опасная.

### 3. Досье и бриф: неточности

- `RECON_DOSSIER.md:298` — `mockCloudVaultExchange` занимает `:51-101`, а не `:51-99`. Всё остальное
  в разделе 5.4 подтвердилось дословно.
- **Бриф про базовый red у `check-encoding.mjs` сильно занижен.** Заявлено: «мохибаке в
  `scripts/smoke-visit-workflow-forms-lifecycle.mjs`» (один файл). Реально:
  `Найдены проблемы с кодировкой (28) среди 2041 файлов`. Среди них — не только смоки:
  `apps/api/src/migration/encoding.ts` (U+FFFD 3 раза, строка 373),
  `apps/api/src/migration/parsers/index.ts:151`, `apps/api/src/migration/tests/parsers.test.ts:68`,
  `apps/api/src/migration/tests/valueNormalize.test.ts:434` — это утраченный текст в боевом коде
  миграции, а не в смоках. Плюс четыре файла вообще не декодируются как UTF-8
  (`apps/api/test_trim.ts`, `apps/web/take_screenshots_auth.mjs`, `audit.cjs`,
  `CLINICAL_USER_MANUAL.md`). Часть из 28 — намеренные фикстуры (`repairMojibake.test.ts`).
  Ничего из этого не мой пакет и ничего из этого я не трогал.

### 4. Постороннее, найдено и не тронуто

- `apps/api/src/services/patients/recallCandidates.ts` — untracked файл в каталоге моего пакета,
  создан другим агентом. Не стейджил.
- `apps/api/dist` — 149 файлов лежат в git, хотя `.gitignore:2` содержит `dist/`. Их закоммитили
  до появления правила, поэтому они так и висят отслеживаемыми. Наследие, не мой пакет.
