# Разведка: горячие чтения, N+1 и отсутствующие индексы

`HEAD: 423a7a39d24ec83af825e64849eac4774ea54b1e` (на момент разбора)
Дата: 2026-07-28. Код НЕ правился — это только разбор.

## Чем мерил

- Живая база: PostgreSQL **18.4** на `127.0.0.1:5432/dental_crm` (`DATABASE_URL` из корневого `.env`).
  Клиент — `.postgres/bin/psql.exe` (14.13), он есть в дереве; в PATH `psql` нет.
- `pg_stat_user_tables` — накопленные счётчики `seq_scan` / `seq_tup_read` / `idx_scan`.
  **`stats_reset` у базы пустой**, то есть счётчики копятся с момента создания базы и
  сбрасывались только при пересоздании — это суммарная история разработки, а не сессия.
- `pg_indexes` — фактический список индексов.
- `EXPLAIN (ANALYZE, BUFFERS)` — реальные планы.
- Один раз создавал пробный индекс внутри `BEGIN … ROLLBACK`, чтобы сравнить планы. После
  откат проверен: `select count(*) from pg_indexes where indexname='tmp_probe_audit_org_created'` → `0`.
  Схема базы не изменена.

## Оговорка о масштабе (важно, чтобы не соврать)

Живая база — **разработческая и крошечная**: `appointments` 27 строк, `patients` 17, `visits` 10,
`treatment_items` 10, `payments` 8, `audit_events` 1005. Поэтому:

- **ПРОВЕРЕНО**: форма плана (Seq Scan / Sort / Index Scan), наличие и отсутствие индексов,
  количество запросов на один вход в раздел, накопленные счётчики сканирований.
- **НЕ ПРОВЕРЕНО**: абсолютные миллисекунды на данных живой клиники. Все цифры «сколько это
  будет на 30 приёмах в день» — это пересчёт по форме плана (линейный по числу строк), а не
  замер на боевом объёме. Так и помечено в каждой находке.

---

## 1. У 13 из 16 таблиц, которые читает дашборд, НЕТ ни одного индекса кроме первичного ключа

**Что доказано.** `pg_indexes` по `public`: 212 индексов, из них **145 — `*_pkey`**.
Для таблиц горячего пути:

| Таблица | не-pkey индексов | seq_scan | seq_tup_read | idx_scan | строк сейчас |
|---|---|---|---|---|---|
| `patients` | 1 (частичный по `merged_into_patient_id`) | 254 575 | 5 939 841 | 1 692 531 | 17 |
| `appointments` | **0** | 108 347 | 1 435 846 | 3 394 | 27 |
| `visits` | 1 (`UNIQUE (id, patient_id, organization_id)`) | 95 723 | 428 206 | 8 437 | 10 |
| `communication_tasks` | **0** | 76 582 | 1 372 | 52 | 0 |
| `treatment_items` | **0** | 73 032 | 262 084 | 320 | 10 |
| `generated_documents` | **0** | 71 422 | 42 855 | 191 | 4 |
| `payments` | 1 (`UNIQUE (organization_id, client_mutation_id)`) | 70 812 | 213 521 | 3 678 | 8 |
| `communication_events` | **0** | 70 571 | 2 592 | 27 | 0 |
| `imaging_studies` | **0** | 68 210 | 64 397 | 2 283 | 2 |
| `users` | **0** | 45 393 | 285 581 | 4 290 | 7 |
| `clinics` | **0** | 23 651 | 28 319 | 1 104 | 1 |
| `chairs` | **0** | 12 999 | 19 823 | 457 | 2 |
| `service_catalog_items` | **0** | 6 756 | 6 419 | 155 | 0 |
| `audit_events` | **0** | 4 315 | 3 362 991 | **0** | 1 005 |

`audit_events` — **ноль индексных сканирований за всю историю базы**. Индекса, которым можно
воспользоваться, там физически нет.

**Почему это не «оно и так быстро».** `apps/api/src/db/schema.ts` ЭТИ индексы объявляет:

- `schema.ts:366` — `index("idx_patients_org_created").on(organizationId, createdAt)`
- `schema.ts:394` — `index("idx_appointments_org_time").on(organizationId, startsAt, endsAt)`
- `schema.ts:554` — `index("idx_payments_org_paid_at").on(organizationId, paidAt)`
- `schema.ts:839` — `index("idx_audit_org_created").on(organizationId, createdAt)`

Ни одного из них в базе нет:
`select indexname from pg_indexes where indexname in ('idx_patients_org_created','idx_appointments_org_time','idx_payments_org_paid_at','idx_audit_org_created')` → **пусто**.
И ни один `.sql` в `apps/api/drizzle/` их не создаёт: `rg -i 'create index.*(appointments|treatment_items|visits|generated_documents|communication_tasks|communication_events|imaging_studies)' apps/api/drizzle/*.sql` → **0 совпадений**.

Причина известна и записана в `.agents/DATABASE.md:65-70`: миграции пишутся руками, а
`db:generate` (drizzle-kit) в этом репозитории мёртв. То есть `index(...)` в `schema.ts` — это
декорация: **объявление есть, DDL нет, и никто этого не заметил**, потому что на 27 строках
Seq Scan неотличим от Index Scan.

**Замер выигрыша (ПРОВЕРЕНО, форма плана; масштаб — пересчёт).**
Запрос вида `/api/audit/logs` (`apps/api/src/routes/audit.ts:56-61`):
`WHERE organization_id = … ORDER BY created_at DESC LIMIT 50`.

```
БЕЗ индекса (как сейчас):
  Limit  (cost=377.47..377.60)
    Sort  Sort Key: audit_events.created_at DESC
      Seq Scan on audit_events  (cost=0.00..347.20)
        Rows Removed by Filter: 1005
        Buffers: shared hit=337
  Execution Time: 42.2 ms (холодный) / 1.8 ms (прогретый)

С индексом (organization_id, created_at DESC), в откаченной транзакции:
  Index Scan using tmp_probe_audit_org_created  (cost=0.28..6.04)
  Сортировки НЕТ вообще
  Execution Time: 0.36 ms
```

`cost` 347.20 → 6.04, это **57×** уже на 1005 строках, и разрыв растёт линейно: ветка Seq Scan
читает всю таблицу целиком, индексная — `log n + 50`.

**Масштаб (пересчёт, НЕ замер).** `audit_events` — журнал доступа к персональным данным по
152-ФЗ, одна строка на каждое чтение ПД, и это самая быстрорастущая таблица продукта. Уже сейчас
на 17 пациентах в ней 1005 строк. За год работы клиники — сотни тысяч. При 500 000 строк
таблица занимает ~168 000 страниц против нынешних 337, то есть один запрос «покажи последние 50
событий» прочитает всю таблицу и отсортирует полмиллиона строк, чтобы отдать 50.
`appointments` при 30 приёмах в день — ~7500 строк в год на клинику, и таблица общая на всех
арендаторов.

**План правки.** Одна написанная руками миграция (следующий свободный ординал — проверить `ls`,
не считать по количеству файлов, в `apps/api/drizzle/` 98 файлов и четыре дублирующихся ординала):

```sql
CREATE INDEX IF NOT EXISTS idx_audit_org_created         ON audit_events        (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_org_time     ON appointments        (organization_id, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_appointments_org_patient  ON appointments        (organization_id, patient_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_patients_org_created      ON patients            (organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_org_paid_at      ON payments            (organization_id, paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_org_created      ON payments            (organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_visits_org_patient        ON visits              (organization_id, patient_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_treatment_items_org_pat   ON treatment_items     (organization_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_generated_docs_org_pat    ON generated_documents (organization_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_imaging_org_patient       ON imaging_studies     (organization_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_comm_tasks_org_due        ON communication_tasks (organization_id, due_at);
CREATE INDEX IF NOT EXISTS idx_comm_events_org_created   ON communication_events(organization_id, created_at);
```

Обязательные условия приёмки миграции (`.agents/AGENTS.md` §8b): `.sql` + запись в
`_dente_migrations` + `db:migrate:check` до и `EXPLAIN` после, с приложенными планами.
Перед написанием — сверить точные имена колонок в живой базе (`information_schema.columns`), а не
брать их из `schema.ts`: `payments.paid_at` и `treatment_items.patient_id` я видел, остальные
нужно подтвердить. **`schema.ts` занят другим исполнителем — только читать**, поэтому
объявления `index(...)` в нём приводить в соответствие сейчас нельзя, миграция самодостаточна.

---

## 2. `/api/dashboard` = 16 запросов `SELECT *` по ВСЕЙ организации без единого `LIMIT`, и вызывается он из 36 мест

**Что доказано.** `apps/api/src/db/domainStateHydration.ts:237-337` — один `Promise.all` из
**16** выборок. Каждая из них идёт через `selectByOrganization()`, а это
`domainStateHydration.ts:184`:

```ts
return (await db.select().from(table).where(eq(table.organizationId, organizationId))) as T[];
```

`select()` без списка колонок, без `limit`, без фильтра по дате. Таблицы:
`organizations`, `clinics`, `users`, `chairs`, `patients`, `appointments`, `visits`,
`treatment_items`, `payments`, `generated_documents`, `communication_tasks`,
`communication_events`, `imaging_studies`, `service_catalog_items`, `clinical_rules`,
`protocol_templates`.

То есть **вся история клиники целиком** — все приёмы за все годы, все платежи, все документы,
все снимки — переносится в оперативную память процесса, чтобы `buildDashboard()`
(`dashboardQuery.ts:58`) посчитал по ним готовность приёма, чек-лист и сводку.
Ни один счётчик, ни одна страница не считается в SQL.

**Кто это вызывает.**
- `apps/api/src/routes/dashboard.ts:16` → `getDashboardFromDb` → `dashboardQuery.ts:53` → гидратация.
- `apps/api/src/routes/schedule.ts:182` — **после каждого создания приёма**;
  `routes/schedule.ts:230` — **после каждого переноса/отмены**. То есть один drag-and-drop в
  расписании = 16 полных чтений организации.
- Во фронтенде `loadDashboard()` вызывается из **36 мест** (`rg 'loadDashboard\(\)|loadDashboard\(\{|void loadDashboard' apps/web/src -g '!*.test.*'` → 37 строк, одна из них комментарий
  `useAppLogic.tsx:2785`). Сам комментарий в коде это признаёт: «loadDashboard вызывается из 34 мест».

**Усилитель, который легко пропустить.** `domainStateHydration.ts:197-206` — глобальная цепочка:

```ts
let hydrationChain: Promise<unknown> = Promise.resolve();
export function hydrateDomainStateFromDb(organizationId) {
  const run = hydrationChain.then(() => hydrateDomainStateFromDbUnsynchronized(organizationId), …);
  hydrationChain = run.catch(() => undefined);
  return run;
}
```

Гидратация **сериализована на весь процесс**, потому что она переписывает разделяемые массивы
`sampleData.ts` (`replaceAll`, строки 768-777). Это правильная защита от смешивания данных двух
клиник, но следствие: **все запросы дашборда всех арендаторов встают в одну очередь**. Четыре
администратора, сохраняющие приёмы одновременно, ждут друг друга, а не работают параллельно.
При этом ни один индекс из находки №1 не существует — значит каждая из 16 выборок — Seq Scan.

**Масштаб.** Накопленные `seq_scan` подтверждают частоту: `communication_tasks` 76 582,
`treatment_items` 73 032, `generated_documents` 71 422, `payments` 70 812,
`communication_events` 70 571, `imaging_studies` 68 210 — шесть таблиц, у которых почти нет
других читателей, стоят на одном уровне ≈70 000. Это ≈70 000 гидратаций.
На боевых данных (пересчёт, НЕ замер): 7500 приёмов/год, ~3000 пациентов, ~15 000 платежей,
~20 000 позиций плана — каждый вход в раздел и каждый перенос приёма читает и валидирует
zod-схемами ~50 000 строк, чтобы показать один экран.

**План правки.** Двумя независимыми шагами, порядок важен:

1. Дешёвый и безопасный: снять гидратацию с мутаций расписания. `routes/schedule.ts:182` и
   `:230` возвращают целый `Dashboard` в ответе на POST/PATCH только потому, что фронтенд
   ждёт этот контракт. Ответ должен нести созданную/изменённую запись, а не сводку;
   `wsBroker.broadcastToOrganization` (уже стоит на `schedule.ts:187` и `:233`) сообщает
   остальным, что нужно перечитать. Это убирает 16 полных чтений с каждой записи в расписание.
   Требует согласованной правки клиента — **`ScheduleView.tsx` держит ведущий**, поэтому это
   его вызов, а не моя правка.
2. Настоящий: разбить `Dashboard` на срезы с параметрами и считать агрегаты в SQL.
   `appointments`/`visits` — окном по дате (`starts_at BETWEEN`), а не целиком;
   `patients` — страницей + `count(*)` отдельным запросом; `payments`/`treatment_items` —
   `SUM`/`GROUP BY` в базе вместо `paidByPatient`/`plannedByPatient`, которые сейчас
   считаются в JS по всем строкам (`domainStateHydration.ts:436-447`);
   `generated_documents`/`imaging_studies` — только по открытому пациенту.
   Это ломает контракт `dashboardSchema`, поэтому идёт отдельной работой с версией эндпоинта.

Долгом отдельно: `selectByOrganization` глотает ЛЮБУЮ ошибку базы в `warnings` и возвращает `[]`
(`domainStateHydration.ts:185-191`). Отказ сервера превращается в пустой список — ровно та
ошибка, которая в этом проекте стоит дороже всего. К производительности не относится, но живёт
в том же коде и должно быть починено вместе.

---

## 3. Настоящий N+1: «потерянные пациенты» — один запрос на каждого пациента картотеки

**Файл:** `apps/api/src/db/lostPatientsFiltersQuery.ts:7-34`.

```ts
const allPatients = await db.select().from(patients)          // :7-10   вся картотека, SELECT *
  .where(eq(patients.organizationId, orgId));
…
for (const p of allPatients) {                                 // :14
  const futureApps = await db.select().from(appointments)      // :15-19  запрос НА КАЖДОГО
    .where(and(eq(appointments.organizationId, orgId),
               eq(appointments.patientId, p.id),
               gt(appointments.startsAt, now)))
    .limit(1);
```

Это учебный N+1: **1 + N запросов**, где N — размер всей картотеки, без страницы и без
ограничения. Каждый из N запросов ещё и Seq Scan по `appointments`, потому что индекса
`(organization_id, patient_id, starts_at)` нет (находка №1).

**Вызывающий:** `apps/api/src/routes/clinical.ts:447-454`, `GET /api/analytics/lost-patients-filters`,
монтируется виджетом `apps/web/src/components/analytics/LostPatientsFiltersWidget.tsx:49`.

**Масштаб.** 17 пациентов сейчас → 18 запросов. Клиника на 3000 пациентов → **3001 запрос
на один вход в раздел**, и каждый читает таблицу приёмов целиком: 3000 × 7500 строк = 22,5 млн
прочитанных кортежей на один экран (пересчёт, НЕ замер). Это худшее соотношение
«запросов на экран» из всего, что я нашёл.

**План правки — один запрос вместо 3001:**

```sql
SELECT p.id, p.full_name, p.phone, p.created_at
FROM patients p
LEFT JOIN appointments a
       ON a.patient_id = p.id
      AND a.organization_id = p.organization_id
      AND a.starts_at > now()
WHERE p.organization_id = $1
  AND a.id IS NULL
ORDER BY p.created_at DESC
LIMIT $2 OFFSET $3;
```

(или `NOT EXISTS` — план тот же). На drizzle это `leftJoin` + `isNull(appointments.id)`.
Страница обязательна: без `LIMIT` эндпоинт остаётся линейным по картотеке.

**Долг, вскрытый попутно (НЕ производительность, но врать нельзя):**
- `lostPatientsFiltersQuery.ts:28` — `daysSinceLastVisit: 90` **захардкожено**. Виджет показывает
  «90 дней с последнего визита» для каждого пациента независимо от факта. Это выдуманное число
  на экране руководителя.
- `:22` — «потерянным» считается любой пациент без будущей записи, включая заведённого вчера.
  То есть виджет «потерянные пациенты» на новой клинике покажет ВСЮ картотеку.
- `:35-41` — если по расчёту вышло пусто, возвращаются строки таблицы `lost_patients_filters`,
  то есть совсем другая сущность (сохранённые фильтры) под тем же контрактом.

---

## 4. День расписания на ~30 приёмов читает всю картотеку, весь журнал рассылок и все коды подтверждения

**Файл:** `apps/api/src/routes/dayConfirmations.ts`, `GET /api/schedule/day-confirmations`.

Приёмы дня выбраны правильно — окном по дате (`:121-137`, `starts_at BETWEEN bounds`).
А дальше, чтобы подписать ~30 строк именами и статусами:

- `:151-155` — **вся картотека организации**, чтобы найти ~30 ФИО и телефонов.
- `:157-161` — все сотрудники (тут ограничение естественное, ~10 строк, вопросов нет).
- `:163-176` — **весь исходящий журнал организации** с `like(dedupeKey, 'reminder:%')`. Ни фильтра
  по дню, ни по идентификаторам приёмов. `LIKE 'reminder:%'` с ведущим литералом индексируем
  только при `text_pattern_ops`, которого нет; сейчас это Seq Scan по всей `communication_outbox`.
- `:205-208` — **вся таблица `appointment_action_codes` организации**, чтобы найти отметки
  переходов по ссылке для тех же ~30 приёмов.

В файле стоит комментарий `:149-150`: «по одному запросу на всё, а не по запросу на строку».
Это верно — N+1 здесь нет, автор его сознательно избежал. Но лечение оказалось наполовину:
запросов стало 6, а прочитанных строк — все, что есть в клинике.

**Масштаб (пересчёт, НЕ замер).** 3000 пациентов + журнал рассылок за год (при 30 приёмах в день
и двух напоминаниях на приём — ~15 000 строк) + столько же кодов действий = ~33 000 прочитанных
строк, чтобы отдать 30. Растёт линейно с возрастом клиники: на второй год вдвое, при неизменных
30 приёмах в день.

**План правки.** Идентификаторы уже собраны — `appointmentRows` получен на `:121`, из него
берутся `patientId`. Три запроса переписываются на `inArray`:

- пациенты: `inArray(patients.id, patientIds)` вместо чтения всей картотеки;
- напоминания: `inArray(communicationOutbox.dedupeKey, appointmentIds.flatMap(id => leadHours.map(h => \`reminder:${id}:${h}\`)))`
  — ключ детерминированный, он разбирается тут же на `:188-189`; если набор `leadHours` неизвестен
  на этом уровне, то `and(inArray(…appointmentId-часть…))` не выразить, и тогда нужен
  либо отдельный столбец `appointment_id` в `communication_outbox`, либо
  `like(dedupeKey, 'reminder:' || id || ':%')` через `or(...)` по 30 приёмам — это 30 условий
  в одном запросе, а не 30 запросов;
- коды: `inArray(appointmentActionCodes.appointmentId, appointmentIds)`.

Плюс индексы `communication_outbox (organization_id, dedupe_key)` (уникальный уже есть —
`communication_outbox_org_dedupe_unique`, его хватит для `inArray`) и
`appointment_action_codes (organization_id, appointment_id)` — последнего нет, проверено.

---

## 5. Планировщик напоминаний: 3 запроса на каждый приём — при том, что соседний модуль это уже исправил и объяснил почему

**Файл:** `apps/api/src/services/communications/appointmentReminders.ts:255-288`.

Окно приёмов выбрано одним запросом (`:237-253`) — правильно. Внутри цикла по нему:

- `:259-263` — ФИО пациента, по одному запросу на приём;
- `:266-274` — ФИО врача, по одному запросу на приём;
- `:276-288` — согласия пациента на канал, по одному запросу на приём.

Итого **3N + 1** на каждый порог оповещения, и цикл по `leadHours` (`:229`) умножает это на число
порогов.

**Почему это точно дефект, а не «так задумано».** Соседний модуль той же подсистемы,
`apps/api/src/services/communications/audience.ts:351-353`, делает то же самое пакетом и прямо
пишет причину:

```ts
// Согласия читаются одним запросом на всю выборку: по одному на пациента —
// это тысяча запросов на тысячную рассылку.
const consentsByPatient = await loadConsents(input.organizationId, matchedIds);
```

`loadConsents` (`audience.ts:391-408`) — ровно тот запрос через `inArray`, которого не хватает в
`appointmentReminders.ts`. Правило в проекте есть, оно записано в коде, и один из двух
потребителей его не соблюдает.

**Масштаб.** 30 приёмов в день, два порога (сутки и два часа) → `2 × (1 + 30 × 3)` = **182 запроса**
за проход планировщика вместо 8. При 60 приёмах — 362. Это фон, а не экран, поэтому выигрыш
меньше, чем в находках 1-4; но каждый из этих запросов держит соединение из пула, а пул общий с
интерактивными запросами администраторов.

**План правки.** Ровно как в `audience.ts`: после `:253` собрать `patientIds` и `doctorIds` из
`dueAppointments`, сделать три пакетных запроса (`inArray` по `patients`, по `users`, и
переиспользовать `loadConsents` из `audience.ts` — он уже экспортируем или делается таким),
разложить в `Map`, а в цикле только читать из `Map`.

---

## 6. Проверка занятости слота: `SELECT *` полным сканом `appointments` внутри транзакции, которая держит блокировки строк

**Файл:** `apps/api/src/db/appointmentsQuery.ts:102-106`.

```ts
const overlapping = await executor
  .select()                                   // все колонки, а нужны три
  .from(schema.appointments)
  .where(and(...conditions, or(...matchConditions)))
  .limit(1);
```

`conditions` (`:85-91`) — `organization_id = … AND status <> 'cancelled' AND status <> 'no_show'
AND starts_at < :end AND ends_at > :start`, `matchConditions` (`:97-99`) — `OR` по кресду, врачу и
пациенту. Индекса `(organization_id, starts_at, ends_at)` нет (находка №1), значит это Seq Scan
всей таблицы приёмов.

**Почему это хуже, чем просто медленный запрос.** Он выполняется **внутри транзакции, которая
уже взяла `FOR UPDATE` на строки кресла, врача и пациента** (`lockAppointmentResources`,
`:31-60`, вызывается на `:141-145` при создании и `:225-229` при переносе). Пока идёт полный скан,
эти блокировки держатся. Все параллельные попытки записать того же врача или то же кресло стоят
ровно столько, сколько длится скан. Логика блокировок написана правильно и по делу — комментарий
`:17-29` описывает воспроизведённую гонку с двумя 201 на один слот; проблема не в блокировках, а в
том, что под ними выполняется линейный по таблице запрос.

И сразу после этого маршрут вызывает полную гидратацию дашборда (`routes/schedule.ts:182`, `:230`,
находка №2) — то есть одно нажатие «Записать» = один полный скан приёмов под блокировкой + 16
полных чтений организации.

**Масштаб (пересчёт, НЕ замер).** `appointments` — 108 347 seq_scan накоплено при 27 строках.
На клинике с 7500 приёмами в год каждая запись и каждый перенос читают все 7500 строк со всеми
колонками, чтобы выяснить, занят ли один слот. С индексом это чтение нескольких страниц:
условие `organization_id = … AND starts_at < :end AND ends_at > :start` — ровно префикс
`(organization_id, starts_at)`.

**План правки.**
1. Индекс `idx_appointments_org_time (organization_id, starts_at, ends_at)` — он уже в списке
   находки №1 и уже объявлен в `schema.ts:394`, просто не создан.
2. Заменить `.select()` на `.select({ id, patientId, doctorUserId, chairId })` — дальше
   (`:108-119`) используются только `patientId` и `doctorUserId`, остальные колонки, включая
   тексты `reason`/`comment`, читаются и передаются по сети зря.

---

## Не вошло в шесть, но зафиксировано как долг

- **`db/patientArchiveReasonsAndBlacklistsQuery.ts:7-12`** — `getPatientArchiveReasonsAndBlacklistsFromDb(orgId, _patientId)`
  принимает пациента, **не использует его** и возвращает строки всей клиники; отбор делает
  маршрут в JS (`routes/patients.ts:170-181, 383`). Открытие карточки любого пациента читает всю
  таблицу чёрного списка. Таблица сейчас пустая, выигрыш от правки мал — но подпись функции
  врёт, а такая подпись уже один раз привела к утечке (см. комментарий `routes/patients.ts:150-168`).
  Правка: перенести отбор в `WHERE` — `or(eq(patientId, …), and(isNull(patientId), eq(patientName, …)))`.
- **`db.select().from(organizations).limit(1)` без `WHERE`** — «взять первую организацию» в
  `audit.ts:13`, `db/billingQuery.ts:15`, `db/documentQuery.ts:82`, `db/imagingQuery.ts:167`,
  `db/pricelistQuery.ts:163`, `routes/communications.ts:22`, `routes/system.ts:684`.
  `organizations` набрала **750 684 seq_scan**. Таблица из двух строк, поэтому по скорости это
  ничто; но это выбор арендатора наугад, и в мультиклиничной установке он неверен.
  `pricelistQuery.ts` и `documentQuery.ts` заняты другими исполнителями — не мои.
- **`routes/imports.ts:225`** — вся картотека одним `SELECT *` для поиска дублей при импорте.
  Путь пакетный, вход разовый; при импорте на 5000 строк это один раз, а не N раз. Приемлемо,
  но при росте картотеки станет заметно.
- **Раздутый `patients_pkey`: 1296 кБ индекса на 8 кБ данных** (17 строк). Это след многократных
  `db:reset-seed`, не дефект кода. `REINDEX` на разработческой базе — уборка, не оптимизация.
- **`tooth_states` — 59 861 seq_scan, 1,49 млн кортежей, 135 idx_scan** при существующем
  `patient_tooth_idx (patient_id, tooth_number)`. Планировщик на 25 строках просто предпочитает
  скан; на боевом объёме индекс будет выбран. Это НЕ находка, специально проверил, чтобы не
  притащить микрооптимизацию с выдуманной ценой.

## Что я проверял и НЕ нашёл проблемы (чтобы следующий не искал заново)

- `apps/api/src/routes/analytics.ts` — восемь отдельных запросов, все агрегаты `GROUP BY`/`count`/`sum`
  считаются в SQL, ни одного цикла с `await`. Единственная беда — отсутствующие индексы (находка №1).
- `apps/api/src/services/reports/managerReports.ts` — 980 строк без единого обращения к `db` в цикле;
  на `:620-663` прямо описано, почему оконная функция заменена двумя агрегатами. Написано грамотно.
- `apps/api/src/routes/inventory.ts` — 548 строк, N+1 нет, `for update` на корректировке остатка
  стоит правильно.
- `apps/api/src/routes/odontogram.ts:186-210` — планы лечения читаются пакетом через
  `inArray(planId, planIds)`, группировка в `Map`. Образцовый код.
- `apps/api/src/routes/diary.ts:223-264` — вложенный цикл с запросами есть, но это путь подписания
  дневника (запись, не чтение), в транзакции, и он ограничен позициями одного приёма (~5) на
  правила услуги (~3). Цена мала, трогать не за что.
