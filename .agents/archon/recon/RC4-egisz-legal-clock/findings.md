# RC4-egisz-legal-clock — findings

Статус: **в работе**
HEAD на момент старта: `9bcacf957` (`git log --oneline -5`)
Роль: read-only разведка. Ни один файл вне этого каталога не тронут.

Метка типа факта у каждого пункта:
**[SRC]** факт исходника · **[RUN]** факт живого рантайма (curl по 127.0.0.1:4100) ·
**[DB]** факт живой базы · **[LAW?]** юридическое утверждение — **требует проверки у юриста**.

---

## 1. Инвентарь: что по ЕГИСЗ вообще существует

Команда обнаружения:
```
fd -I -i 'egisz' --exclude node_modules --exclude dist
```
Вывод — ровно 8 файлов. Полный список с вердиктом:

| # | Файл | Строк | Вердикт |
|---|---|---|---|
| 1 | `apps/api/src/routes/egisz.ts` | 341 | РЕАЛЬНЫЙ, 4 роута, зарегистрирован |
| 2 | `apps/api/src/services/egiszCdaGenerator.ts` | см. §1.3 | РЕАЛЬНЫЙ генератор CDA R2 |
| 3 | `apps/api/src/tests/egiszCdaGenerator.test.ts` | см. §1.3 | тест генератора |
| 4 | `apps/api/add-egisz-schema.cjs` | см. §1.4 | скрипт вне пайплайна миграций |
| 5 | `apps/api/drizzle/0064_add_egisz_multiple_diagnoses.sql` | — | миграция |
| 6 | `apps/api/drizzle/0103_add_egisz_blank_permissions.sql` | — | миграция |
| 7 | `apps/web/src/components/EgiszMonitor.tsx` | 161 | СМОНТИРОВАН, зовёт 2 несуществующих адреса (§2) |
| 8 | `apps/web/src/components/integrations/EgiszBlankPermissionsWidget.tsx` | 87 | см. §1.5 |

`wc -l apps/api/src/routes/egisz.ts apps/web/src/components/EgiszMonitor.tsx apps/web/src/components/integrations/EgiszBlankPermissionsWidget.tsx` → 341 / 161 / 87.

### 1.1 Роут зарегистрирован — ПОДТВЕРЖДЕНО
**[SRC]** `rg -rn "registerEgiszRoutes|routes/egisz" apps/api/src` →
`apps/api/src/server.ts:61` импорт, `server.ts:443..448` регистрация без префикса.
Комментарий в `egisz.ts:31-34` про падение Fastify на дубле пути описывает УЖЕ ИСПРАВЛЕННОЕ
состояние: дубля `/api/clinical/custom-examination-form-catalogs` в `egisz.ts` больше нет.

### 1.2 Четыре роута в `egisz.ts` — построчный вердикт
**[SRC]** прочитан целиком (341 строка).

| Адрес | Строка | Читает ли что-нибудь | Вердикт |
|---|---|---|---|
| `GET /api/clinical/egisz/integration-status` | 79 | только `process.env` | ЧЕСТНАЯ ЗАГЛУШКА |
| `POST /api/clinical/egisz/validate-doctor-snils` | 123 | ничего, чистая функция | РЕАЛЬНЫЙ (контрольная сумма СНИЛС) |
| `GET /api/egisz/multiple-diagnoses` | 163 | `db.select().from(egiszMultipleDiagnoses)` с фильтром по организации | РЕАЛЬНОЕ ЧТЕНИЕ |
| `GET /api/egisz/visits/:visitId/cda` | 192 | 4 таблицы: visits, patients, organizations, appointments, users | РЕАЛЬНЫЙ ЭКСПОРТ |

### 1.3 ДЕМОНТИРОВАНО УБЕЖДЕНИЕ БРИФА
Бриф утверждал: «`apps/api/src/routes/egisz.ts:163` serves a hollow read directly, with no query
module behind it».
**Половина этого неверна.** Строка 163 — это `GET /api/egisz/multiple-diagnoses`, и она
НЕ пустая: `egisz.ts:177-180` выполняет настоящий `db.select().from(schema.egiszMultipleDiagnoses)`
с `where(eq(..., orgId))`. Изоляция по организации на месте.
Верно только то, что запрос написан ИНЛАЙНОМ в роуте, без модуля в `db/`. Это стилевой долг,
а не фасад. **Фасад в этом файле один и он честно подписан** — `/integration-status`,
который выводит статус из `process.env` и возвращает `NOT_CONFIGURED`, а не выдуманный `CONNECTED`.

---

## 2. ГЛАВНАЯ НАХОДКА: «Данные приема готовы к отправке» при 404 — ПОДТВЕРЖДЕНО ТРИЖДЫ

### 2.1 Адреса, которые зовёт UI
**[SRC]** `apps/web/src/components/EgiszMonitor.tsx:37` → `GET /api/egisz/logs/${patientId}`
**[SRC]** `apps/web/src/components/EgiszMonitor.tsx:73` → `POST /api/egisz/send`

### 2.2 Их не существует
```
rg -n "egisz/send|egisz/logs|egiszLogs|egisz_logs" apps/api/src packages/shared/src
```
Ни одного объявления роута. Единственные совпадения — в
`apps/api/src/tests/webCallsExistingRoutes.test.ts:86,87`, где оба адреса ВНЕСЕНЫ В СПИСОК
ИЗВЕСТНОГО ДОЛГА под заголовком «Незаконченные разделы». То есть проект знает и молчит.

### 2.3 Живой рантайм — 404 обоих
```
curl -s -w "\nHTTP:%{http_code}\n" -X POST http://127.0.0.1:4100/api/egisz/send \
  -H "Content-Type: application/json" -d '{"patientId":"x","visitId":"y"}'
curl -s -w "\nHTTP:%{http_code}\n" "http://127.0.0.1:4100/api/egisz/logs/abc"
```
**[RUN]** Оба ответа идентичны по форме:
`{"message":"Route POST:/api/egisz/send not found","error":"Not Found","statusCode":404}` / `HTTP:404`
`{"message":"Route GET:/api/egisz/logs/abc not found","error":"Not Found","statusCode":404}` / `HTTP:404`
**[SRC]** `rg -n "setNotFoundHandler" apps/api/src` → пусто: обработчика 404 нет, отвечает
дефолтный Fastify. Значит форма ответа выше — стабильная, а не случайная.

### 2.4 ЧТО ВИДИТ ВРАЧ. Это и есть §3-нарушение
**Чтение статуса (при открытии вкладки).** `EgiszMonitor.tsx:38` — `if (res.ok) {`. На 404
условие ложно, тело 404 не читается, состояние остаётся начальным `"Pending"`
(`EgiszMonitor.tsx:24`). Отрисовка `EgiszMonitor.tsx:129` даёт строку:

> **«Данные приема готовы к отправке»**

рядом с активной синей кнопкой **«Отправить в ЕГИСЗ»**. Ни слова о том, что подсистемы нет.
Сетевой сбой обрабатывается тем же способом: `catch` на `:56-58` делает только `console.error`,
экран не меняется. **Клиника видит утверждение «готово к отправке» ровно тогда, когда отправлять
физически некуда.**

**Нажатие кнопки.** `EgiszMonitor.tsx:78` `await res.json()` успешно парсит тело 404,
`:83` `if (!res.ok)` → `:85` `setErrorDetails(data.error || "Неизвестная ошибка")`, а
`data.error` в дефолтном ответе Fastify равен строке `"Not Found"`. Врач получает:

> **«Ошибка: Not Found»**

Английская техническая строка вместо человеческого текста — §3 («чтобы совковая бабка
разобралась») и §11. Транзакция не создана, документ никуда не ушёл, в базе не осталось следа.

### 2.5 Достижимость — ВАЖНАЯ ОГОВОРКА, БРИФ ЕЁ НЕ ЗНАЛ
**[SRC]** `apps/web/src/components/visit/VisitOdontogramTab.tsx:74` — панель под условием
`{workspaceFlags.hasEngineeringStatus && (`. То есть она видна НЕ ВСЕГДА.
**[SRC]** `apps/web/src/hooks/useWorkspaceProfile.ts:93` — `hasEngineeringStatus: false` в
`DEFAULT_FLAGS`.
**[SRC]** `rg -rn "ngineering" apps/api/src` → **пусто**. Признака нет ни в схеме БД, ни в
`routes/workspaceProfile.ts`; сервер его не отдаёт и сохранить не может.
**[SRC]** Единственный способ включить — тумблер в
`apps/web/src/components/workspace/WorkspaceFeaturesSelector.tsx:225`, подписанный
**«Инженерный статус (Отладка)»**, и он живёт только в localStorage
(`useWorkspaceProfile.ts:143`, `persist`/`partialize`).
**Вывод:** путь пользователя РЕАЛЕН, но лежит за отладочным тумблером, выключенным по умолчанию.
Это понижает частоту, но не снимает дефект: тумблер предъявлен клинике как обычный модуль в
списке возможностей, и включивший его видит ложное «готово к отправке».

### 2.6 Второй дефект того же компонента: подменена сущность идентификатора
**[SRC]** `VisitOdontogramTab.tsx:77` передаёт `visitId={activeAppointment.id}` — то есть
идентификатор ЗАПИСИ В РАСПИСАНИИ под именем идентификатора ПРИЁМА. Существующий рабочий
экспорт `GET /api/egisz/visits/:visitId/cda` (`egisz.ts:192`) ищет по `schema.visits.id`.
Значит даже если `/api/egisz/send` однажды напишут по образцу CDA-роута, он получит чужой ключ
и ответит «Приём не найден» (`egisz.ts:227`). Требует проверки: см. НЕ ПОДТВЕРЖДЕНО.

---

## 3. Часы одного рабочего дня (в работе)
## 4. Согласие на передачу (в работе)
## 5. Право отдельно от кода (в работе)
## НЕ ПОДТВЕРЖДЕНО (в работе)

---

## 2bis. ВТОРАЯ, ХУДШАЯ НАХОДКА: 404 отрисован как «не настроено»

**[SRC]** `EgiszBlankPermissionsWidget.tsx:18` → `fetch("/api/integrations/egisz-blank-permissions")`.
**Проверки `res.ok` нет вообще** — сразу `:20` `.then((res) => res.json())`.
**[RUN]** `curl -s -w "HTTP:%{http_code}" "http://127.0.0.1:4100/api/integrations/egisz-blank-permissions"`
→ `{"message":"Route GET:/api/integrations/egisz-blank-permissions not found","error":"Not Found","statusCode":404}` / `HTTP:404`

Тело 404 — валидный JSON, `res.json()` не бросает. `:22`
`setPermissions(Array.isArray(data) ? data : [])` — объект массивом не является, значит пустой
список. `:50` `permissions.length === 0` → отрисовывается:

> **«Правила выгрузки бланков ЕГИСЗ не настроены»**

Проверка ветки: `node -e "console.log(Array.isArray(JSON.parse(...404 body...)))"` → `false`.

**Это ровно тот случай, о котором предупреждал бриф, и он хуже падения.** Клиника читает
«не настроены», то есть «настроим — заработает». В действительности маршрута нет, писателя нет,
и настраивать нечего. Отличить «правил нет» от «подсистемы нет» из интерфейса НЕВОЗМОЖНО.

**[SRC]** Смонтирован БЕЗУСЛОВНО, без всякого признака модульности:
`apps/web/src/SettingsView.tsx:40` импорт, `:1622` рендер в сетке
`<div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">` рядом с `YandexCalendarSyncsWidget`.
Значит виден любой клинике, открывшей эту вкладку настроек — в отличие от `EgiszMonitor` (§2.5).

**Отдельно: проект УЖЕ ЗАПИСАЛ ЭТО ПРАВИЛО И САМ ЕГО НАРУШАЕТ.** В комментарии прямо над
рендером, `SettingsView.tsx:1613-1619`, лежит объяснение, почему две ДРУГИЕ панели удалены:
«в dadata_geocoded_addresses и single_session_enforcements нет ни одной вставки… обе панели
показывали "данных нет"… Не возвращать, пока не появится код, который в эти таблицы пишет».
Два виджета строкой ниже — в том же состоянии и остались на месте.

---

## 3. ЧАСЫ ОДНОГО РАБОЧЕГО ДНЯ

### 3.1 Начало отсчёта СУЩЕСТВУЕТ
**[SRC]** `apps/api/src/db/schema.ts:413` — `visits.signedAt: timestamp("signed_at", { withTimezone: true })`.
**[SRC]** `apps/api/src/db/visitsQuery.ts:99` — при переходе приёма `draft → signed` пишется
`signedAt: new Date()`. Момент, когда медицинская запись стала окончательной, фиксируется
по-настоящему. Это естественное начало любого срока.

### 3.2 Срока НЕ СУЩЕСТВУЕТ — ПРОВЕРЕНО ПО ВСЕЙ СХЕМЕ БД
Запрос (`db-probe.cjs`, метка `retention_or_deadline_columns`):
```sql
select table_name, column_name from information_schema.columns
where table_schema='public' and (column_name like '%retention%' or column_name like '%deadline%'
 or column_name like '%due_at%' or column_name like '%reportable%' or column_name like '%report_due%')
```
**[DB]** Ровно 3 строки, ни одна не про отчётность: `clinical_tasks.due_at`,
`communication_tasks.due_at`, `scheduler_reservations.recall_due_at`.
**Ни одной колонки «когда запись стала подлежащей передаче», ни одной «срок передачи».**

### 3.3 Календаря рабочих дней В ПРОДУКТЕ НЕТ
```sql
select table_name from information_schema.tables where table_schema='public'
 and (table_name like '%holiday%' or table_name like '%calendar%' or table_name like '%working%')
```
**[DB]** 1 строка: `yandex_calendar_syncs` — синхронизация расписания с Яндекс-календарём,
к производственному календарю РФ отношения не имеет.
**[SRC]** Единственное место, где вопрос «рабочий ли день» вообще решается, —
`apps/api/src/routes/publicBooking.ts`: при незаданном списке дней рабочими считаются Пн–Сб.
Это график клиники, а не производственный календарь: переносов и праздников он не знает.
**Вывод: производственного календаря РФ в продукте нет. Я его не изобретаю и не предлагаю
выдумать.** Любая фича «срок в рабочих днях» без него посчитает срок неверно на майских.

### 3.4 Данных, на которых часы могли бы работать, нет — СО СПЛИТОМ ПО ОРГАНИЗАЦИИ
```sql
select id, name, clinic_mode from organizations order by name;
select organization_id, count(*) as total, count(signed_at) as signed,
       count(*) filter (where is_synced) as synced from visits group by 1;
select organization_id, count(*) from tooth_states group by 1;
select organization_id, count(*) from patients group by 1;
```
**[DB]**
- `organizations` — **4 строки**: `Демо-клиника для снимков` (`d0000000…d001`, `small_clinic`),
  `Клиника диктовки Б` (`dce70000…902`, `one_chair`), `Клиника личного кабинета`
  (`dce70000…901`, `one_chair`), `Стоматология, 1 кабинет` (`4a3420d1…`, `one_chair`).
  **Ни у одной `clinic_mode` не равен `demo`** — прежнее «4 organizations, all clinic_mode=demo»
  неверно в обеих половинах: организаций сейчас правда 4, но режим ни у одной не `demo`.
- `visits` — **10 строк, ВСЕ в фикстурной `d0000000…d001`**, `signed=0`, `synced=0`.
  Живых приёмов у реальной клиники **НОЛЬ**, подписанных приёмов во всей базе НОЛЬ.
- `tooth_states` — **25 строк, ВСЕ в реальной `4a3420d1…`**. Любой JOIN приёмов к зубным
  состояниям даёт пустоту по построению. Подтверждено независимо от брифа.
- `patients` — 3 у реальной `4a3420d1…`, 14 у фикстурной `d0000000…`, 1 у `dce70000…901`.
- `generated_documents` — 4, все в РЕАЛЬНОЙ `4a3420d1…`.

### 3.5 Таблицы ЕГИСЗ и согласий пусты у ВСЕХ организаций
`select organization_id, count(*) … group by 1` по каждой:
**[DB]** `egisz_multiple_diagnoses` — 0, `egisz_blank_permissions` — 0, `egisz_logs` — 0,
`patient_consents` — 0, `patient_communication_consents` — 0. Итог ноль, поэтому загрязнение
фикстурами на эти числа повлиять не может — расщеплять нечего.

### 3.6 НАХОДКА: таблица `egisz_logs` СУЩЕСТВУЕТ, а Drizzle её не видит
**[DB]** `select table_name from information_schema.tables where table_schema='public' and table_name like '%egisz%'`
→ 3 таблицы: `egisz_blank_permissions`, **`egisz_logs`**, `egisz_multiple_diagnoses`.
**[DB]** Колонки `egisz_logs`: `id`, `patient_id`, `visit_id`, `status` (enum), `transaction_id`
varchar, `error_details` jsonb, `created_at`. Значения `egisz_status_enum` —
`Pending, Sent, Error, Accepted`.
**[SRC]** Таблица создана легально: `apps/api/drizzle/0000_freezing_randall_flagg.sql:521-529`.
**[SRC]** `rg -n "egisz_logs|egiszLogs" apps/api/src/db/schema.ts` → **EXIT=1, совпадений нет.**
Таблицы нет в Drizzle-схеме, значит ни один запрос через ORM её прочитать не может.

**Это переворачивает диагноз §2 в лучшую сторону.** Значения состояния в `EgiszMonitor.tsx:23-25`
(`"Pending" | "Sent" | "Error" | "Accepted"`) совпадают с enum БД БУКВА В БУКВУ, а поля
`transactionId`/`errorDetails` — с колонками. Компонент писали ПОД СУЩЕСТВУЮЩУЮ ТАБЛИЦУ.
Пропущено ровно два звена: маршрут и объявление таблицы в `schema.ts`. Это не фантазия
интерфейса, а **мост, недостроенный на один пролёт**, и починка дешевле, чем выглядело.

**[DB] Но у `egisz_logs` НЕТ колонки `organization_id`** — запрос
`select organization_id, count(*) from egisz_logs group by 1` падает с
`column "organization_id" does not exist`. Журнал передач в государственную систему без
изоляции по клинике. Маршрут, написанный по этой таблице наивно, отдаст одной клинике передачи
другой. Изоляцию придётся выводить через `patient_id → patients.organization_id` либо добавлять
колонку миграцией.

### 3.7 То же расхождение у `egisz_blank_permissions` — И Я СНАЧАЛА ОШИБСЯ
**[DB]** У таблицы **12 колонок**, то есть ОБА набора: `form_code, field_name,
is_export_allowed, patient_opt_out_respect, updated_at` И `doctor_id, blank_code, blank_title,
is_allowed, created_at`.
**[SRC]** `apps/api/drizzle/0103_add_egisz_blank_permissions.sql` создаёт ПЕРВЫЙ набор — ровно
тот, который объявляет виджет (`EgiszBlankPermissionsWidget.tsx:3-11`).
**[SRC]** `apps/api/drizzle/0118_align_tables_with_schema.sql:112-118` доклеивает ВТОРОЙ набор и
снимает `NOT NULL` с `form_code` и `field_name`.
**[SRC]** `apps/api/src/db/schema.ts:1905-1913` объявляет ТОЛЬКО второй набор.

**Самокоррекция, оставлена намеренно.** Первым делом я записал, что контракт виджета выдуман
(§10). **Измерение это опровергло: контракт виджета — из миграции 0103, а ушла в сторону
Drizzle-схема.** Колонка `patient_opt_out_respect`, то есть учёт отказа пациента от выгрузки,
**реально существует в базе** и невидима для ORM. Оставляю и ошибку, и опровержение: иначе
ведущий получит третье поколение той же неточности.

---

## 4. СОГЛАСИЕ НА ПЕРЕДАЧУ: ЭТО ДВА РАЗНЫХ СОГЛАСИЯ, И ПУТАТЬ ИХ НЕЛЬЗЯ

### 4.1 Живая подсистема согласий покрывает ТОЛЬКО связь с пациентом
**[SRC]** `apps/api/src/services/communications/consentLoader.ts:21,47` читает
`patientCommunicationConsents` и только её.
**[SRC]** `apps/api/src/db/schema.ts:2281` —
`pgEnum("communication_consent_scope", ["service", "marketing"])`.
**[DB]** Значения enum в живой базе:
```sql
select enumlabel from pg_enum e join pg_type t on t.oid=e.enumtypid
 where t.typname='communication_consent_scope' order by e.enumsortorder
```
→ ровно два: `service`, `marketing`.

**Вывод.** Подсистема согласий по построению отвечает на один вопрос: «можно ли писать пациенту,
и по какому поводу — сервисному или рекламному». Выразить «согласен на передачу данных в
государственную систему» в этой модели НЕЧЕМ: третьего значения нет.
**Считать её согласием на передачу в ЕГИСЗ — ровно та подмена, которую запрещает §10.**
Комментарий в самой схеме (`schema.ts:2278-2279`) привязывает её к рекламе по сетям электросвязи.

### 4.2 Медицинский реестр согласий — МЁРТВАЯ ТАБЛИЦА
**[SRC]** `apps/api/src/db/schema.ts:370` — `patientConsents` с колонками `kind`, `grantedAt`,
`revokedAt`, `documentId`. Форма правильная: вид согласия, выдача, отзыв, ссылка на документ.
Команды:
```
rg -n "patientConsents" apps/api/src apps/web/src packages/shared/src
rg -n "patient_consents" apps/api/src --glob "!*.test.ts"
```
**[SRC]** Всего **две** ссылки на весь монорепозиторий: само объявление схемы и
`apps/api/src/scripts/migrateStateToDb.ts:46` — `await db.delete(schema.patientConsents)`.
**Ни одной вставки. Ни одного чтения. Единственная операция над таблицей — удаление.**
**[DB]** 0 строк.
**Вывод: структурного учёта согласий в продукте нет вообще.** Ни один код не способен ответить
на вопрос «согласен ли пациент X» — ни про передачу, ни про что-либо ещё.

### 4.3 Что существует по-настоящему: согласие как PDF со свободным текстом
**[SRC]** Виды документов в `schema.ts:161-169` включают `informed_consent`,
`personal_data_processing_consent`, `minor_legal_representative_consent`, `photo_video_consent`,
`anesthesia_consent_log`, `procedure_specific_consent_packet` — это РЕАЛЬНЫЕ документы с
формами (`apps/web/src/components/documents/forms/*ConsentForm.tsx`) и рендером в
`apps/api/src/documents/renderDocument.ts`. Здесь фасада нет.
**[SRC]** В `PersonalDataProcessingConsentForm.tsx:89` есть поле **«Передача третьим лицам»** —
и это `<textarea>`, свободный текст. `:107` — **«Срок хранения»**, тоже `<textarea>`.
**[DB]** У `generated_documents` колонки `type` нет вовсе, вид лежит в `kind` (enum) — мой
первый запрос по `type` упал, число документов взято отдельным запросом без него.

**Итог по §4, без изобретений.** Согласие на передачу данных наружу выразимо в продукте
ИСКЛЮЧИТЕЛЬНО прозой, которую клиника сама впишет в поле «Передача третьим лицам» согласия на
ПДн. Машиночитаемо оно не хранится, ничем не проверяется и никакой выгрузке помешать не может.
Срок хранения — тоже проза, ничем не считается и ни на что не влияет.
Единственная машинная колонка про отказ от выгрузки — `egisz_blank_permissions.patient_opt_out_respect`
(§3.7): в базе есть, для ORM невидима, маршрута нет, писателя нет, 0 строк.

---

## 5. ПРАВО — ОТДЕЛЬНО ОТ КОДА, С ЯВНОЙ МЕТКОЙ ДОСТОВЕРНОСТИ

**Я не юрист, и внутри репозитория нет ни одного нормативного документа, по которому это можно
свериться.** Проверено: `fd -I -i "egisz"` не находит ни приказа, ни методических рекомендаций;
в `.agents/*.md` требований к ЕГИСЗ нет. Поэтому ниже — ТОЛЬКО рамка вопросов для юриста,
а не правило, на котором можно строить фичу.

- **[LAW?] Срок регистрации медицинской записи в РЭМД.** Бриф называет «один рабочий день».
  **Подтвердить это внутри репозитория НЕВОЗМОЖНО — источника нет. ТРЕБУЕТ ПРОВЕРКИ У ЮРИСТА.**
  Я НЕ вписываю это число ни в код, ни в рекомендацию. **Выдуманный срок опаснее отсутствующего:**
  на нём построят напоминание, и клиника будет считать, что успевает.
- **[LAW?] Обязательность передачи для частной стоматологии** — с какого момента и для каких
  видов СЭМД. **ТРЕБУЕТ ПРОВЕРКИ У ЮРИСТА.** Продукт продаётся соло-практикам, для которых
  ответ может отличаться от ответа для клиники.
- **[LAW?] Сроки хранения медицинской документации.** В продукте это свободный текст
  (`personalDataRetentionPeriod`). **ТРЕБУЕТ ПРОВЕРКИ У ЮРИСТА.** Сам продукт ничего не удаляет
  и ничего не сторожит, так что нарушить срок хранения кодом нельзя — но и доказать соблюдение
  нечем.
- **[LAW?] Соотношение согласия на обработку ПДн (152-ФЗ) и правового основания передачи в
  государственную информационную систему.** Это разные конструкции, и §4.1 показывает, что код
  их не различает. **ТРЕБУЕТ ПРОВЕРКИ У ЮРИСТА.**
- **ЧТО МОЖНО УТВЕРЖДАТЬ БЕЗ ЮРИСТА, и этого достаточно для наряда:** передача в ЕГИСЗ из этого
  продукта **физически невозможна** (§5.1), а интерфейс в двух местах сообщает обратное
  (§2, §2bis). Ложное сообщение о готовности отчитаться — дефект независимо от того, каков срок
  в законе. Наряд в `recommendation.md` опирается только на это и юридической уверенности
  не требует.

### 5.1 Передача невозможна — ПОДТВЕРЖДЕНО ЖИВЫМ ЗАПРОСОМ
```
curl -s "http://127.0.0.1:4100/api/clinical/egisz/integration-status"
```
**[RUN]** `{"ok":true,"configured":false,"frmoStatus":"NOT_CONFIGURED","frmrStatus":"NOT_CONFIGURED",`
`"remdStatus":"NOT_CONFIGURED","capabilities":{"cdaGeneration":true,"ukepSigning":false,`
`"remdTransmission":false},"missingConfiguration":["EGISZ_N3_BASE_URL","EGISZ_N3_GUID",`
`"EGISZ_N3_LPU_ID","EGISZ_FRMO_ID"],"checkedAt":"2026-07-28T17:01:34.601Z"}` / `HTTP:200`

**[SRC]** Ни один файл окружения не задаёт эти переменные: `rg -l "EGISZ_" --hidden -g ".env*" .`
→ пусто. Имена переменных в `.env` (значения НЕ читались и не приводятся):
`DENTE_CLINICAL_ALLOW_UNGUARDED_READS`, `DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS`,
`DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS`, `NODE_ENV`, `API_HOST`, `API_PORT`, `WEB_ORIGIN`,
`DATABASE_URL`, `REDIS_URL`, `DOCUMENT_STORAGE_PATH`, `ATTACHMENT_STORAGE_PATH`,
`DENTAL_SPEECH_POLISH_TIMEOUT_MS`.
Подписи УКЭП и транспорта в РЭМД нет — сервер говорит это прямо и честно.

### 5.2 ГЛАВНОЕ: ВСЯ ПРОВОДКА ЕГИСЗ СОБРАНА НАОБОРОТ
```
rg -n "egisz/integration-status" apps/web/src                        -> EXIT=1
rg -n "egisz/visits|/cda" apps/web/src                               -> EXIT=1
rg -n "egisz/multiple-diagnoses|validate-doctor-snils" apps/web/src  -> EXIT=1
```
**[SRC]** **Ни один из 4 РАБОЧИХ маршрутов ЕГИСЗ не вызывается интерфейсом.**
**[SRC]** **Все 3 вызова интерфейса адресованы НЕСУЩЕСТВУЮЩИМ маршрутам.**

| Существует на сервере | Зовёт ли UI |
|---|---|
| `GET /api/clinical/egisz/integration-status` | НЕТ |
| `POST /api/clinical/egisz/validate-doctor-snils` | НЕТ |
| `GET /api/egisz/multiple-diagnoses` | НЕТ |
| `GET /api/egisz/visits/:visitId/cda` | НЕТ |

| Зовёт интерфейс | Существует ли |
|---|---|
| `GET /api/egisz/logs/:patientId` | НЕТ |
| `POST /api/egisz/send` | НЕТ |
| `GET /api/integrations/egisz-blank-permissions` | НЕТ |

Пересечение множеств — ПУСТОЕ. Честный `integration-status`, который единственный в системе
знает правду про `NOT_CONFIGURED`, не показан пользователю нигде. Врач видит только две
панели, и обе врут.

---

## 6. ТРЕТИЙ ДЕФЕКТ: КОМПОНЕНТ ПЕРЕДАЁТ ЧУЖОЙ КЛЮЧ — ПОДТВЕРЖДЕНО

**[SRC]** `apps/web/src/components/visit/VisitOdontogramTab.tsx:77` →
`<EgiszMonitor visitId={activeAppointment.id} …>`.
**[SRC]** `apps/web/src/useAppLogic.tsx:2476-2484` — `activeAppointment` ищется в
`dashboard.appointments` по условию `appointment.id === dashboard?.activeVisit?.appointmentId`.
Значит `activeAppointment.id` — это **`appointments.id`, а НЕ `visits.id`**.
**[SRC]** Настоящий идентификатор приёма лежит В ТОМ ЖЕ контексте строкой выше,
`useAppLogic.tsx:2470-2474` — `realActiveVisitId`, и он НЕ передаётся.
**[DB]** У таблицы `egisz_logs` есть настоящий внешний ключ
`egisz_logs_visit_id_visits_id_fk: visit_id → visits.id`:
```sql
select tc.constraint_name, kcu.column_name, ccu.table_name from information_schema.table_constraints tc
 join information_schema.key_column_usage kcu on tc.constraint_name=kcu.constraint_name
 join information_schema.constraint_column_usage ccu on tc.constraint_name=ccu.constraint_name
 where tc.table_name='egisz_logs' and tc.constraint_type='FOREIGN KEY'
```

**Следствие, важное для наряда.** Кто бы ни написал `/api/egisz/send`, он получит от этого
компонента идентификатор ЗАПИСИ РАСПИСАНИЯ. Вставка в `egisz_logs` упадёт на внешнем ключе,
а рабочий экспорт `GET /api/egisz/visits/:visitId/cda` (`egisz.ts:192`, ищет по `visits.id`)
ответит «Приём не найден» (`egisz.ts:227`). **Значит нельзя просто дописать маршрут — сначала
надо исправить, какой ключ передаёт `VisitOdontogramTab`.**

**Дополнительно, замечено попутно (в мой наряд НЕ входит).** У `activeAppointment` есть
подстановка `?? dashboard.appointments?.[0] ?? null` (`useAppLogic.tsx:482`-строка
`useAppLogic.tsx:2482`): при отсутствии активного приёма берётся ПЕРВАЯ запись расписания
подряд. Тот же `visitId` уходит и в `VisitDiaryEditor` (`VisitOdontogramTab.tsx:70-73`).
Насколько это ломает дневник приёма — я НЕ проверял, см. НЕ ПОДТВЕРЖДЕНО п.3.

## 7. ЧЕТВЁРТЫЙ: `egisz_multiple_diagnoses` — ЧИТАТЕЛЬ БЕЗ ПИСАТЕЛЯ
```
rg -n "egiszMultipleDiagnoses" apps/api/src
```
**[SRC]** Ровно 3 совпадения: объявление схемы (`schema.ts:1240`) и чтение
(`egisz.ts:179,180`). **Вставки нет ни одной.**
**[SRC]** У таблицы `patient_name text` и **нет ни `patient_id`, ни `visit_id`**
(`schema.ts:1240-1249`, миграция `0064`). Связать её с приёмом и подать в CDA нельзя
по построению — только по строке с именем пациента.
**[DB]** 0 строк, у всех организаций.
**Вердикт:** маршрут настоящий, таблица настоящая, но заполнить её нечем. Это не фасад
маршрута, а фасад ФУНКЦИИ: «передача нескольких диагнозов в ЕГИСЗ» из
`docs/competitive-audit` существует как таблица и `SELECT`, и ни как что ещё.

---

## НЕ ПОДТВЕРЖДЕНО (честные пробелы, с командой, которая закроет каждый)

1. **Правовой срок регистрации записи и обязательность передачи для соло-практика.**
   Внутри репозитория источника нет. Закроет: заключение юриста либо приложенный текст приказа
   Минздрава. **Командой не закрывается, и я НЕ подставляю число.**
2. **Видит ли реальный врач панель `EgiszMonitor` на практике.** Признак
   `hasEngineeringStatus` живёт только в localStorage браузера (`useWorkspaceProfile.ts:143`,
   `persist`/`partialize`), в БД его нет (`rg -n "hasEngineeringStatus" apps/api/src` → EXIT=1).
   Сколько клиник его включили — из базы не измеримо В ПРИНЦИПЕ.
   Закроет только ручная проверка в браузере: тумблер «Инженерный статус (Отладка)» →
   раздел «Приём» → вкладка «Зубная формула» при открытом приёме.
   **Виджет из §2bis такой оговорки не требует — он смонтирован безусловно.**
3. **Ломает ли подстановка `?? appointments[0]` дневник приёма** (`VisitDiaryEditor`,
   тот же неверный `visitId`). Закроет: `rg -n "visitId" apps/api/src/routes/diary.ts` плюс
   `select column_name from information_schema.columns where table_name='visit_diaries'`.
   Я этого не делал: за пределами моего наряда, и дневник могут держать другие агенты.
4. **Какая именно вкладка настроек содержит `EgiszBlankPermissionsWidget`.** Что рендер
   безусловный на `SettingsView.tsx:1622` — подтверждено чтением. Имя вкладки не проследил.
   Закроет: чтение `apps/web/src/SettingsView.tsx` от объемлющей `motion.section` вверх
   до объявления вкладок.
5. **Запускался ли `apps/api/add-egisz-schema.cjs`.** Скрипт делает
   `fs.appendFileSync("src/db/schema.ts", …)` — ровно та файловая хирургия, которую запрещает
   `.agents/AGENTS.md` §8a. Его текста в `schema.ts` сейчас нет, а таблицы в БД есть и созданы
   миграцией `0000`. Значит либо не запускался, либо результат откатили.
   Закроет: `git log --follow -p -- apps/api/src/db/schema.ts | rg -n "egiszLogs"`.
   **Независимо от истории: файл лежит в репозитории и при повторном запуске припишет дубли
   экспортов в конец схемы.**
6. **Соответствует ли CDA из `egiszCdaGenerator.ts` действующему профилю СЭМД Минздрава.**
   Тест `apps/api/src/tests/egiszCdaGenerator.test.ts` проверяет генератор против собственных
   ожиданий, а не против схемы Минздрава. Закроет только официальная XSD/профиль, которых в
   репозитории нет. **ТРЕБУЕТ ПРОВЕРКИ У ЮРИСТА/интегратора.** Я НЕ утверждаю ни что CDA
   корректен, ни что он некорректен — я подтвердил только, что он генерируется.

## Статус: РАЗВЕДКА ЗАВЕРШЕНА. Наряд — в `recommendation.md`.
