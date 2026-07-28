# Разведка: сторожа, которые не умеют покраснеть

HEAD на момент разбора: `a094f1268`
Дата: 2026-07-28. Код НЕ правился — только чтение и запуск проверок.

Область: `apps/api/src/tests/**`, `apps/web/src/tests/**`, `scripts/*.mjs`, `scripts/tests/**`.
Всего в дереве: 125 записей `smoke:*` в корневом `package.json`, 148 файлов `scripts/*.mjs`,
79 тестов API, 36 тестов веба.

Признак «сторож не умеет поймать» понимается шире, чем «всегда зелёный». Сторож, который
падает на первой строке по исчезнувшему файлу, тоже не проверяет ничего: его утверждения не
выполняются, а постоянный красный не несёт сигнала. Оба вида ниже помечены явно.

---

## 1. `noFabricatedDataFallback.test.ts` зелён, а подмена данных в слое доступа живёт

**Файл сторожа:** `apps/api/src/tests/noFabricatedDataFallback.test.ts:69-98`
**Нарушитель:** `apps/api/src/db/patientArchiveReasonsAndBlacklistsQuery.ts:29-31, 50-52, 89-91`

Сторож объявляет правило прозой (строки 36-38): «Слой доступа к данным возвращает то, что в
базе. Пусто — значит пустой массив. Сбой — значит исключение до обработчика.» Ловит он это
тремя шаблонами:

```
/DB Fallback/                                        (:73)
/if \(rows && rows\.length > 0\) return rows;/       (:76)  — точная строка исходника
/catch \([^)]*\) \{\s*\n\s*console\.warn/            (:89)
```

В `patientArchiveReasonsAndBlacklistsQuery.ts` нарушены все три пункта правила, и ни один из
трёх шаблонов не совпадает:

* `:50-52` — `catch (err) { return inMemoryBlacklist.has(...) }`. Сбой базы не доходит до
  маршрута, вместо него отдаётся значение из `Set` в памяти процесса. После перезапуска
  сервера `Set` пуст, значит при любой ошибке базы `isPatientBookingBlocked` вернёт `false`.
* `:89-91` — `catch (err) { // safe in-memory fallback }`. Отказ записи проглочен целиком:
  администратор получает успех, а строки в базе нет.
* `:29-31` — `catch (e) { // ignore lookup failure }`. Если чтение ФИО пациента упало,
  `fullName` остаётся пустым, и правило чёрного списка ПО ИМЕНИ (а `setPatientArchiveStatusInDb`
  пишет именно `patientName`, `:71`) молча выпадает из условия `:38-41`.

Почему шаблоны молчат: строки `DB Fallback` в файле нет; точной строки `if (rows && ...)` нет
(здесь `return rows.length > 0`); в catch-блоках нет `console.warn` вообще. Проверки на
«catch, возвращающий подставное значение» у сторожа нет ни одной.

**Чем доказано, что сторож зелёный:** `npx tsx --test src/tests/noFabricatedDataFallback.test.ts`
из `apps/api` — `pass 3, fail 0`. Нарушение существует, сторож молчит.

**Цена для клиники.** `isPatientBookingBlocked` — единственная проверка чёрного списка при
записи на приём: `apps/api/src/db/appointmentsQuery.ts:126-127` бросает «Пациент внесен в
черный список. Запись заблокирована.» ровно по её результату. Любая ошибка базы в этом
запросе бесшумно выключает запрет, и конфликтного пациента запишут на приём. Внесение в
список тоже может не сохраниться и исчезнуть при перезапуске, о чём администратору не
скажут.

**Как починить, чтобы ловило.** Убрать регулярку по точной строке и по имени лога — судить
по форме, а не по тексту: любой `catch`, чьё тело возвращает значение (`return` внутри
`CatchClause`) или не содержит `throw`/`reply.code(5xx)`, в модуле `db/**` — нарушение.
Разбор через `typescript` уже есть в дереве и работает
(`scripts/census-hollow-query-modules.mjs` строит AST по 44 таблицам за секунды) — та же
техника здесь. Дополнительно: обход `db` сейчас нерекурсивный и только по маске `*Query.ts`
(`:46-50`), поэтому `db/tests/`, `db/domainStateHydration.ts`, `db/patientsSchema.ts` вне
поля зрения; и регулярка `catch (…) { \n console.warn` уже обходится одной строкой
комментария — так `apps/api/src/db/aiQuery.ts:132-135` не попадает под неё (там это
осознанно, но лазейка общая). Обязательный самотест: подсунуть фикстуру с проглатывающим
catch и убедиться, что сторож краснеет.

---

## 2. `routeRegistrationCoverage.test.ts` не видит подкаталоги `routes/` — два маршрута документов не подключены

**Файл сторожа:** `apps/api/src/tests/routeRegistrationCoverage.test.ts:46-53`
**Нарушители:** `apps/api/src/routes/documents/sign.ts:8`, `apps/api/src/routes/documents/signUkep.ts:8`

Сторож написан против «самой дорогой ошибки этого репозитория» (его же слова, `:8-12`):
модуль маршрутов есть, в `server.ts` не подключён, все его пути отвечают 404. Перепись
модулей:

```ts
readdirSync(routesDir, { withFileTypes: true })
  .filter((entry) => entry.isFile())      // :48 — ТОЛЬКО верхний уровень
```

Рекурсии нет. При этом `documents.ts` внесён в `NOT_ROUTE_MODULES` (`:39-44`) именно с
причиной «сами маршруты лежат в `routes/documents/*`» — то есть каталог, куда переехали
маршруты, исключён из проверки дважды: и как подкаталог, и через исключение родителя.

Что там лежит и как подключено:

* `routes/documents/` содержит 9 файлов, объявляющих HTTP-маршруты;
* `apps/api/src/routes/documents.ts:1023-1029` импортирует семь: `create`, `issue`, `void`,
  `taxXml`, `auditFacts`, `pdf`, `html`;
* `sign.js` и `signUkep.js` не импортирует НИКТО — `rg 'sign\.js|signUkep\.js|registerDocumentSign'`
  по `apps/api/src` даёт ноль совпадений;
* `server.ts:11` берёт из этой области только `registerDocumentRoutes`.

Значит `POST /api/documents/:id/sign` (`sign.ts:8`, подпись пациента SVG, с защитой от
повторного использования подписи, проверкой статуса «draft» и изоляцией по организации) и
`POST /api/documents/:id/sign-ukep` (`signUkep.ts:8`) не зарегистрированы и отвечают 404.
Это не заготовки: `sign.ts` — 115 строк рабочего кода с `requireResolvedStaffOrAdminOrganizationId`,
валидацией SVG, запретом `<script>/<iframe>/on*=` и разбором 409 при повторе подписи.

**Чем доказано, что сторож зелёный:** `npx tsx --test src/tests/routeRegistrationCoverage.test.ts` —
оба теста `✔`, `pass 2, fail 0`.

**Цена для клиники.** Подпись пациента на документе — юридическое основание документа.
Кнопка УКЭП в вебе уже зовёт этот адрес: `apps/web/src/components/documents/DocumentUkepSignButton.tsx:95`
делает `fetch('/api/documents/${documentId}/sign-ukep')`. Сегодня она не видна (компонент
числится несмонтированным в `apps/web/src/tests/panelsAreMounted.test.ts:203`), поэтому
пациент 404 не увидит; но при монтировании увидит, и сторож об этом не предупредит.

**Как починить.** Обходить `routes/` рекурсивно и судить по РЕГИСТРАТОРУ, а не по имени
файла: собрать все `export async function register*` (включая ровно `register`) из всех
файлов под `routes/`, затем требовать для каждого путь вызова до `server.ts` — прямой импорт
либо импорт из уже подключённого родителя. Исключение `documents.ts` тогда не нужно: оно
перестаёт быть дыркой, потому что дети проверяются по родителю. Плюс самотест: добавить
фикстурный файл-регистратор, никем не импортированный, и убедиться, что тест покраснел.
Заодно `declaresHttpRoutes` (`:58`) использует `(?:<[^>]*>)?` — тот самый разбор дженерика,
который `webCallsExistingRoutes.test.ts:159-165` уже разобрал как сломанный на
`app.get<{ Querystring: Record<string, unknown> }>(...)`; здесь он живой и молча выкидывает
такой модуль из переписи.

---

## 3. `webCallsExistingRoutes.test.ts` считает «объявлен в файле» = «обслуживается»

**Файл сторожа:** `apps/api/src/tests/webCallsExistingRoutes.test.ts:156-183`

Сторож написан против ровно того же дефекта, что и №2: «отсутствующий маршрут молча
превращается в пустой список, и на экране просто нет раздела» (`:5-8`). Но `serverRoutes()`
собирает адреса регулярным выражением по ТЕКСТУ всех файлов под `apps/api/src/routes`
(рекурсивно, `collectFiles` `:112-124`) и не проверяет ни разу, что модуль зарегистрирован в
`server.ts`. Утверждение поэтому верно по построению: любой адрес, написанный в любом файле
внутри `routes/`, автоматически объявляется «обслуживаемым».

Следствие проверяемо на живом дереве: `apps/web/src/components/documents/DocumentUkepSignButton.tsx:95`
зовёт `/api/documents/${documentId}/sign-ukep`; `normalizePath` приводит это к
`/api/documents/:param/sign-ukep`; такой же литерал лежит в `routes/documents/signUkep.ts:8`,
файл попадает в обход, адрес попадает в набор `routes`, `isServed()` возвращает `true`. Адрес
при этом 404 (см. №2). Тот самый класс «фронт зовёт, сервера нет», против которого написан
сторож, проходит через него насквозь.

**Чем доказано, что сторож зелёный:** `npx tsx --test src/tests/webCallsExistingRoutes.test.ts` —
`pass 3, fail 0`, включая тест «каждый вызванный адрес обслуживается сервером».

**Как починить.** Считать обслуживаемым только адрес из модуля, у которого есть цепочка
регистрации до `server.ts` (переиспользовать перепись из №2). Дополнительно закрыть
подавление по префиксу: `:245` глушит нарушение по `candidate.startsWith(known + "/")`, то
есть запись `/api/settings/catalog` в `KNOWN_MISSING` заранее гасит любой будущий
`/api/settings/catalog/<что угодно>` — сравнивать надо путь целиком, как это уже сделано в
`panelsAreMounted.test.ts:61`.

Отдельно, в пользу этого сторожа: храповик `KNOWN_MISSING.length <= 23` (`:277-281`) стоит
ровно по фактической длине списка (23 записи, пересчитано вручную), запаса нет, и его
комментарий это прямо оговаривает. Это НЕ дефект «порог больше факта».

---

## 4. `smoke-db-runtime-contract.mjs` падает на 8-й строке — ни одна из ~60 проверок не выполняется

**Файл:** `scripts/smoke-db-runtime-contract.mjs:8-62`

Скрипт читает 12 файлов миграций и 2 снимка Drizzle, которых в дереве нет:
`0011,0012,0013,0014,0015,0016,0017,0018,0019,0021,0022,0023,0034_*.sql`,
`meta/0017_snapshot.json`, `meta/0018_snapshot.json`. Фактически в `apps/api/drizzle/` лежат
файлы с другими именами (`0008_add_settings.sql`, `0011_add_snils_and_diagnosis.sql`, …,
последний `0142_material_quantities_numeric.sql`), а `meta/` содержит снимки только
`0000`-`0008`.

**Чем доказано:** `node scripts/smoke-db-runtime-contract.mjs` →
`Error: ENOENT ... apps\api\drizzle\0013_communication_telegram_runtime_tables.sql`, exit 1,
на строке 8. Ни одно `assert` ниже не выполняется.

Что из-за этого не проверяется вообще: 8 обязательных runtime-таблиц связи и Telegram,
13 перечислений, `document_id` и `payment_status` у платежей, структурированный фискальный
чек, аттестация подписи и аннулирования документа, снимок налогового XML, колонки
`organization_id` у `family_groups`/`sterilization_logs`/`crm_leads` — и, главное,
`forbiddenSecretPatterns` (`:314-365`), то есть запрет хранить сырой токен Telegram-бота в
схеме и миграциях вместо `secret_ref`.

Важно: сами теги в журнале ЕСТЬ — `apps/api/drizzle/meta/_journal.json` содержит
`0011_document_tax_payment_snapshot`, `0017_document_issue_attestation_and_release_journal`
и т. д. То есть журнал ссылается на миграции, чьих `.sql` в дереве нет. Это отдельный долг
не по моей задаче, но он объясняет, почему сторож нельзя «просто починить путями».

**Как починить.** Не адресовать миграции по номеру файла. Читать `meta/_journal.json`,
резолвить `.sql` по тегу и падать с внятным текстом, если файл тега отсутствует (это и будет
честный красный про рассогласование журнала и дерева). Проверки по schema.ts (`:68-107`) от
миграций не зависят вовсе — их надо выполнять до чтения любого `.sql`, чтобы отсутствие
файла не гасило их.

---

## 5. `smoke-dental-persistence-routes-source.mjs` падает на 19-й строке — 30 проверок изоляции клиники и транзакций мертвы

**Файл:** `scripts/smoke-dental-persistence-routes-source.mjs:19-41`

Читает `apps/web/src/pages/InvoiceSplitPaymentModal.tsx` (`:19`) и
`apps/web/src/pages/ThermalReceiptSimulator.tsx` (`:38`). Оба файла удалены коммитом
`c4f2b9240` — это записано в самом файле, в комментарии `:32-36`, автором предыдущей правки:
«этот скрипт УЖЕ падает выше… Пока их не уберут, `npm run smoke:dental-persistence-routes-source`
не доходит ни до одной проверки».

**Чем доказано:** оба пути отсутствуют (проверено перебором всех строковых литералов-путей в
сторожах против диска). Первый `readFileSync` на удалённый файл — строка 19, до первого
`assert` на строке 55.

Что не проверяется: обязательность `requireResolvedOrganizationId` / `requireResolvedStaffOrAdminOrganizationId`
на чтении и записи состояний зубов (`:55-63`), принадлежность пациента организации
(`ensurePatientInOrganization`, `:65-69`), областность websocket-рассылки (`:70-74`),
атомарность апсерта плана лечения (`:75-84`), и весь блок семейного кошелька: изоляция
чтения, права на платёж, `eq(patients.organizationId, organizationId)`, транзакционность
платежа, областность рассылки (`:91-115`).

**Цена для клиники.** Это деньги семьи и клинические данные: снятие любой из этих проверок
означает, что чужая клиника видит или правит платежи и зубную формулу, либо что платёж по
семейному кошельку проходит без транзакции.

**Как починить.** Убрать чтения и относящиеся к удалённым экранам проверки (по образцу
комментария `:23-31`, где так уже поступили с `FinancialDashboard.tsx`). Чтобы это не
повторилось, читать файлы через обёртку, которая на ENOENT падает с текстом «сторож
ссылается на удалённый файл — почините сторожа», а не с трассой `node:fs`; и завести один
общий тест, проверяющий, что каждый путь-литерал в `scripts/*.mjs` существует на диске.

---

## 6. `smoke-telegram-control-ui-source.mjs` падает на 36-й строке по той же причине

**Файл:** `scripts/smoke-telegram-control-ui-source.mjs:36`

`readFileSync("apps/api/drizzle/0008_document_payload_storage.sql")` — файла нет (на диске
`0008_add_settings.sql`).

**Чем доказано:** `node scripts/smoke-telegram-control-ui-source.mjs` →
`Error: ENOENT ... 0008_document_payload_storage.sql`.

Не выполняется весь блок проверок панели управления Telegram, включая наличие правил стилей
`.telegram-status-grid`, `.telegram-link-ledger*`, `.telegram-outbox-*` (`:652-658`).
Починка — та же, что в №4: адресация по журналу, а не по номеру.

---

## 7. `smoke-booking-blacklist-enforcement.mjs` не запускается ничем и не загружается вовсе

**Файл:** `scripts/smoke-booking-blacklist-enforcement.mjs`

Два независимых обстоятельства, каждое достаточно:

1. **Не подключён.** `rg 'booking-blacklist'` по всему дереву — ноль совпадений вне самого
   файла. В `package.json` записи `smoke:booking-blacklist-enforcement` нет, а
   `scripts/run-smoke-suite.mjs:14-20` перечисляет ИМЕННО записи `smoke:*` из `package.json`.
   Значит `npm run smoke:all` его не берёт. Это один из 24 файлов `scripts/*.mjs`, не
   привязанных ни к одной записи `package.json`.
2. **Не грузится.** `:2-3` импортируют `.ts`-модули по ESM-пути без `tsx`.
   `node scripts/smoke-booking-blacklist-enforcement.mjs` →
   `ERR_MODULE_NOT_FOUND: apps/api/src/db/client.js`, до первого `assert` дело не доходит.

Проверяемый инвариант сегодня выполняется (`appointmentsQuery.ts:126` действительно бросает),
поэтому нарушения к этой находке я не предъявляю — но сторож не подтвердил бы и обратного.
Обратите внимание на связку с №1: этот сторож охраняет ровно тот модуль, в котором №1 нашёл
проглатывание сбоя.

**Как починить.** Либо завести `smoke:booking-blacklist-enforcement` в `package.json` и
запускать через `npx tsx` (у скрипта есть побочные эффекты в базе — писать в неё он должен
только в фикстурной организации, как это делает `apps/api/src/tests/support/fixtureOrganizations.ts`),
либо перенести проверку в `apps/api/src/tests/` как `.test.ts`, где её подхватит
`node --import tsx --test "src/**/*.test.ts"`. Заодно добавить сторожа на самих сторожей:
файл `scripts/smoke-*.mjs` без записи `smoke:*` в `package.json` — нарушение.

---

## 8. `enumContractDrift.test.ts` сверяет 12 перечислений из 44

**Файл:** `apps/api/src/tests/enumContractDrift.test.ts:44-77`

Список `pairs` поимённый и содержит 12 пар. В `apps/api/src/db/schema.ts` объявлено 44
`pgEnum`. Среди непокрытых как минимум 24 имеют одноимённый контракт в
`packages/shared/src/index.ts` / `migration.ts`: `aiJobKind`, `aiJobStatus`,
`aiRecognitionTarget`, `clinicalRuleAction`, `clinicalRuleSeverity`, `dentalSpecialty`,
`imagingSourceKind`, `serviceCategory`, `treatmentPlanScenarioPriority`,
`treatmentPlanScenarioStrategy`, семь `denteTelegram*`, семь `migration*`. Расхождение в
любом из них даёт ровно тот дефект, который описан в шапке файла (`:22-28`): строку молча
отбрасывает `safeParse` в `db/domainStateHydration.ts`.

Это тот самый структурный порок, который `panelsAreMounted.test.ts:36-42` отверг словами
«поимённый список структурно не способен заметить файл, которого в списке нет».

**Чего я НЕ доказал:** живого расхождения. Я сверил вручную 8 непокрытых пар
(`dentalSpecialty`, `serviceCategory`, `aiJobKind`, `aiRecognitionTarget`,
`clinicalRuleAction`, `imagingSourceKind`, `denteTelegramUpdateKind`,
`treatmentPlanScenarioStrategy`) — значения совпадают. Остальные 16 не сверял. Поэтому это
находка про структуру, а не про сегодняшнюю поломку.

**Как починить.** Строить пары автоматически: снять все `export const X = pgEnum(...)` из
`schema.ts`, найти `XSchema` в `@dental/shared` и требовать, чтобы у каждого `pgEnum` либо
нашлась пара, либо стояла запись в списке «сверять нечего» С ПРИЧИНОЙ (как уже сделано в
`:42-43` для `users.role`). Тесты `:96-108` — «проверка не выродилась» и «канал содержит vk и
max» — оставить: это правильные самопроверки, они и должны остаться.

---

## 9. `scripts/check-css-tokens.mjs` и его тест не подключены ни к одному гейту

**Файлы:** `scripts/check-css-tokens.mjs`, `scripts/tests/check-css-tokens.test.mjs`

`rg 'check-css-tokens'` по дереву даёт только упоминания в комментариях исходников
(`apps/web/src/styles/token-aliases.css:15,26,92,101,114`,
`apps/web/src/components/settings/SettingsPricesTab.tsx:342`,
`apps/web/src/PaymentCapture.tsx:382`) и сам тест. В `package.json` записи нет; `npm run lint`
= `check:encoding && typecheck`, тесты воркспейсов ищут `src/**/*.test.ts(x)`, каталог
`scripts/tests/` не входит ни в один glob. Проверка запускается только руками, при этом на
неё ссылаются как на постоянную («Постоянная проверка — scripts/check-css-tokens.mjs»,
`token-aliases.css:15`).

**Состояние сейчас:** `node scripts/check-css-tokens.mjs` → exit 0,
`НЕ РАЗРЕШАЕТСЯ НИ В ОДНОЙ ТЕМЕ: 0 имён`. Так же не подключён `scripts/check-schema-type-drift.mjs`
(ссылок вне себя нет вообще) и `scripts/census-hollow-query-modules.test.mjs`.

**ГРАНИЦА:** `scripts/check-css-tokens.mjs` на момент разбора занят другим инженером
(`git status --porcelain` — ` M`). Не трогал. Правку подключения делать после того, как файл
освободится, и не мне.

**Как починить.** Завести `check:css-tokens` в `package.json`, включить в `lint` рядом с
`check:encoding`, и добавить `scripts/tests/**/*.test.mjs` в какой-нибудь запускаемый
`node --test`. Тест у этой проверки уже написан и умеет краснеть на фикстурах — он просто
никогда не выполняется.

---

## 10. `routeHookScope.test.ts` — та же слепота к подкаталогам плюс шаблон имени

**Файл:** `apps/api/src/tests/routeHookScope.test.ts:69-85`

`routeModulesWithOwnHooks()` обходит только верхний уровень `routes/` (`readdirSync` +
`isFile()`, `:73-75`) и берёт имя регистратора шаблоном `/export async function (register\w+)/`
(`:81`). Модули под `routes/documents/` экспортируют ровно `register` — `register\w+` требует
минимум один символ после, значит такой модуль был бы пропущен и на верхнем уровне тоже.
Кроме того, берётся только ПЕРВОЕ совпадение: модуль с двумя регистраторами проверяется по
одному.

**Чего я НЕ доказал:** живого нарушения. `app.addHook(` внутри `routes/` есть ровно в двух
файлах — `routes/max.ts` и `routes/whatsapp.ts` — и оба подключены правильно, через
`app.register` (`server.ts:412,416`). Сегодня сторож честно зелёный. Находка про то, что он
перестанет ловить, как только хук появится в подкаталоге или в модуле с экспортом `register`.

Первые два теста этого файла (`:39-63`) — образцовые: они на живом Fastify показывают, что
дефект воспроизводится, то есть сторож доказал, что умеет краснеть. Слаб только третий.

**Как починить.** Переиспользовать рекурсивную перепись регистраторов из починки №2 и
принимать имя `register` без суффикса; собирать ВСЕ экспортированные регистраторы файла.

---

# Систематическое, за рамками десятки

**`npm run smoke:all` не может стать зелёным, поэтому им никто не пользуется как гейтом.**
`scripts/run-smoke-suite.mjs:88-97` выходит с кодом 1 при любом падении. Среди 125
перечисленных проверок минимум три (`smoke:db-runtime-contract`,
`smoke:dental-persistence-routes-source`, `smoke:telegram-control-ui-source`) падают до
первого `assert` по отсутствующим файлам, а `smoke:schema-column-parity` красный по существу:
`node scripts/smoke-schema-column-parity.mjs` → exit 1, 17 строк расхождений schema.ts и DDL,
среди них `portal_otp_codes: channel, code_hash, delivery_error_class, delivery_status`.
Пока суммарный прогон гарантированно красный, ни одно из остальных 120 утверждений не
охраняет ничего: их падение не отличимо от фона. Это не находка про отдельного сторожа, это
причина, по которой находки №4-6 могли пролежать незамеченными.

**Чего я не проверял и не заявляю.** Полный прогон `npm run smoke:all` не делал: часть
проверок поднимает браузер, слушающие порты и живую PostgreSQL на `127.0.0.1:5432`, а в
дереве одновременно работают другие инженеры — правило одного писателя на гейт
(`.agents/AGENTS.md` §7a). Поэтому «остальные 120 зелёные» я НЕ утверждаю; я утверждаю
только то, что запускал сам.

---

# ПРОВЕРЕНО

Запущено мной, вывод прочитан:

* `apps/api` `npx tsx --test src/tests/noFabricatedDataFallback.test.ts` → pass 3, fail 0
  (при живом нарушении в `patientArchiveReasonsAndBlacklistsQuery.ts`).
* `apps/api` `npx tsx --test src/tests/routeRegistrationCoverage.test.ts` → pass 2, fail 0
  (при неподключённых `documents/sign.ts`, `documents/signUkep.ts`).
* `apps/api` `npx tsx --test src/tests/webCallsExistingRoutes.test.ts` → pass 3, fail 0.
* `node scripts/smoke-db-runtime-contract.mjs` → ENOENT на строке 8, exit 1.
* `node scripts/smoke-telegram-control-ui-source.mjs` → ENOENT на строке 36.
* `node scripts/smoke-booking-blacklist-enforcement.mjs` → ERR_MODULE_NOT_FOUND.
* `node scripts/smoke-schema-column-parity.mjs` → exit 1, 17 расхождений.
* `node scripts/smoke-schema-ddl-coverage.mjs` → exit 0, `tablesInSchema: 123`.
* `node scripts/check-encoding.mjs` → 2219 файлов, 0 замечаний.
* `node scripts/check-css-tokens.mjs` → exit 0, 0 неразрешимых имён.
* `npm test -w @dental/web` → tests 738, pass 738, fail 0.
* `npm run smoke:web-text-encoding` → `ok: true`, 425 файлов, 0 мохибаки.
* Отсутствие файлов на диске — перебором всех строковых литералов-путей из сторожей
  против файловой системы; отсутствие импортёров `sign.js`/`signUkep.js` — `rg` по
  `apps/api/src`; 44 `pgEnum` против 12 пар — `rg -o` по `schema.ts` и `pairs`;
  23 записи `KNOWN_MISSING` против потолка 23 и 29 записей
  `LEGACY_UNMOUNTED_BACKLOG` против потолка 29 — пересчитаны вручную.

# НЕ ПРОВЕРЕНО

* 404 у `/api/documents/:id/sign` и `/api/documents/:id/sign-ukep` на живом сервере. Вывод
  статический: `server.ts:11` берёт только `registerDocumentRoutes`, `documents.ts:1023-1029`
  импортирует семь детей из девяти, других импортёров нет. Ловушка «живой API на 4100 бывает
  устаревшим» тут не помогла бы в обе стороны, а `app.inject` требует нового файла — код я не
  правил.
* Расхождение в 16 из 24 непокрытых перечислений (сверил 8, все совпали).
* Полный `npm run smoke:all` и `npm test -w @dental/api` — не запускал (общая база и порты,
  параллельные инженеры).
* Что `smoke-schema-column-parity` красный именно из-за долга схемы, а не из-за собственной
  ошибки разбора: сами 17 расхождений я построчно против DDL не сверял.

# Занятые файлы, к которым я не прикасался

На момент разбора держали другие инженеры (`git status --porcelain`):
`scripts/check-css-tokens.mjs`, `scripts/ops-panels-shots.mjs`,
`scripts/smoke-patients-usability-source.mjs`, `apps/api/src/db/schema.ts`,
`apps/api/src/db/pricelistQuery.ts`, `apps/api/src/documents/taxXml.ts`,
`apps/api/src/migration/**`, `apps/web/src/PatientsView.tsx` и остальные из списка задания.
Читал, не правил. Находка №9 касается занятого файла — её исполнение за тем, кто его держит.
