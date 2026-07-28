# RC3 — hollow panel census

**СТАТУС: в работе**

## Method

## A. No writer

## B. Dead route

## C. Field mismatch

## D. Unreachable

## E. Not hollow

## НЕ ПОДТВЕРЖДЕНО

## Blind spots

---

## Method (instrument, and what it cannot see)

Instrument: `.agents/archon/recon/RC3-hollow-panel-census/census.mjs` — TypeScript 5.9.3
compiler API, not regex. Two inventories from the parse tree:

* ROUTES: every `<x>.get|post|put|patch|delete|head|options|all("<literal path>", ...)` and every
  `<x>.route({url, method})` in `apps/api/src` (non-test), with the Fastify `prefix:` applied per
  registering file. Prefixes were read from `server.ts` `app.register(X, {prefix})` — and
  `rg -n "prefix:" apps/api/src` proves those four are the ONLY prefixes in the API.
* WEB FETCH TARGETS: every `fetch(<arg>)` in `apps/web/src` (non-test) whose first argument is a
  string/template literal starting with `/`. Template substitutions collapse to `:p`.

Commands:
```
node .agents/archon/recon/RC3-hollow-panel-census/census.mjs
node .agents/archon/recon/RC3-hollow-panel-census/census.mjs --json > census.json
rg -n "prefix:" apps/api/src --glob '*.ts' | grep -v "\.test\.ts"
```

Raw numbers (`census.mjs`, run 2026-07-28):
* API files parsed (non-test): 226
* WEB files parsed (non-test): 313
* ROUTES registered with a LITERAL path: **316** (GET 126, POST 147, PUT 24, DELETE 13, PATCH 6)
* WEB `fetch()` sites with a literal `/path`: **266**
* WEB `fetch()` sites NOT statically resolvable: **14** (listed under Blind spots)

### Reconciliation with the lead's «438 routes»
`316 + 126 (Fastify auto-HEAD for every GET) = 442`. Two of those GETs are websockets
(`apps/api/src/routes/websocket.ts:49` and `:96`, `{ websocket: true }`) and get no auto-HEAD →
**440**. The gate says 438. **Delta of 2 is NOT explained** — see НЕ ПОДТВЕРЖДЕНО. It does not
change any verdict below, because every class-B verdict is additionally confirmed by a live 404.

---

## ГЛАВНОЕ КОНТЕКСТНОЕ ОТКРЫТИЕ: класс B уже объявлен как долг, и храповик СЛЕП К МЕТОДУ

`apps/api/src/tests/webCallsExistingRoutes.test.ts` — существующий храповик с 23 поимённо
объявленными отсутствующими адресами (`KNOWN_MISSING`, строки 36–107) и тремя тестами.
Прочитан целиком. **Это ровно тот стандарт объявленного долга, который бриф требует
воспроизвести — он уже есть.** Значит бо́льшая часть класса B — не открытие, а известный долг.

**НО У ХРАПОВИКА ДВА СТРУКТУРНЫХ ПРОБЕЛА, и оба дают реальные дефекты:**

### Пробел 1 — метод не сравнивается вообще (строки 166, 221–234)
Регулярка `serverRoutes()` захватывает только путь; `isServed()` сравнивает только сегменты
пути. Адрес, у которого путь есть, а нужного HTTP-метода нет, храповик объявляет живым.
Fastify на такой запрос отвечает **404**, ровно как на несуществующий путь.
Мой инструмент сравнивает метод и нашёл два таких случая — см. класс B-M ниже.

### Пробел 2 — пять записей долга не зовёт НИКТО (проверено)
Тест сам объявляет правило: «адрес, которого никто не зовёт, — не долг, а мусор в списке»
(строки 41–42, 47–49, 60–61). Пять его собственных записей это правило нарушают.
```
rg -n "crm/patient-duplicate-merge-queues" apps/web/src apps/api/src
rg -n "schedule/external-schedule-action-logs" apps/web/src apps/api/src
rg -n "system/ram-watchdogs" apps/web/src apps/api/src
rg -n "communications/inbox" apps/web/src apps/api/src
rg -n "communications/patients/search" apps/web/src apps/api/src
```
Результат (факт исходников):
| адрес долга | где ещё встречается |
|---|---|
| `/api/crm/patient-duplicate-merge-queues` | только комментарии (5 файлов), ни одного `fetch` |
| `/api/schedule/external-schedule-action-logs` | только комментарий `ScheduleView.tsx:1109` |
| `/api/system/ram-watchdogs` | только комментарии `SettingsView.tsx:27,1297` |
| `/api/communications/inbox` | **только сам файл теста**, больше нигде |
| `/api/communications/patients/search` | **только сам файл теста**, больше нигде |

То есть настоящий живой долг класса B — **18 адресов, а не 23**. Ни один из трёх тестов
этого не видит: `isServed()` подтверждает «не обслуживается», а «никто не зовёт» никем не
проверяется.

---

## КЛАСС B-M — «путь есть, метода нет». ДВА ПОДТВЕРЖДЁННЫХ ДЕФЕКТА, храповик их не видит

Оба подтверждены ЖИВЫМ сервером на 127.0.0.1:4100 (runtime-факт), не только разбором.
Контрольный запрос доказывает, что сервер различает «нет маршрута» и «нет доступа»:
```
curl -s -X DELETE http://127.0.0.1:4100/api/clinical/rules/00000000-0000-0000-0000-000000000000
  -> {"message":"Route DELETE:/api/clinical/rules/... not found","statusCode":404}
curl -s -X PUT    http://127.0.0.1:4100/api/xray/scans/00000000-0000-0000-0000-000000000000
  -> {"message":"Route PUT:/api/xray/scans/... not found","statusCode":404}
curl -s -X PATCH  http://127.0.0.1:4100/api/clinical/rules/00000000-0000-0000-0000-000000000000
  -> {"error":"AuthRequired",...}     <-- КОНТРОЛЬ: существующий маршрут отвечает 401, не 404
```
(идентификатор нулевой — даже если бы маршрут существовал, удалить было бы нечего)

### B-M-1. Кнопка удаления клинического правила не работает никогда
`apps/web/src/useAppLogic.tsx:11066` — `removeClinicalRule()` шлёт `DELETE /api/clinical/rules/${ruleId}`.
`apps/api/src/routes/clinical.ts` регистрирует только:
`POST /api/clinical/rules/evaluate` (:46), `POST /api/clinical/rules` (:75),
`PATCH /api/clinical/rules/:ruleId` (:87). **DELETE нет.**
```
rg -n "clinical/rules" apps/api/src/routes/*.ts
```
Последствие для врача: правило можно создать и выключить, но нельзя удалить — жмёшь
«удалить», получаешь «Не удалось удалить правило» и список не меняется. Ошибка честная
(§3 в этой части соблюдён), но кнопка обещание не держит.

### B-M-2. Заключение AI по прицельному снимку показывается и НЕ СОХРАНЯЕТСЯ — молча
`apps/web/src/components/imaging/VisiographAnalyzer.tsx:416`
```ts
await fetch(`/api/xray/scans/${saved.id}`, {
  method: 'PUT',
  ...
}).catch(() => {}); // best-effort
```
`apps/api/src/routes/xray.ts` регистрирует `POST /api/xray/scans` (:99),
`POST /api/xray/scans/:id/analyze` (:144), `GET /api/xray/scans` (:206),
`GET /api/xray/scans/:id` (:227), `DELETE /api/xray/scans/:id` (:249). **PUT нет.**

Цепочка: POST создаёт строку со `status:"pending"` и пустыми `ai_report`/`ai_summary`/
`ai_tooth_states` (`xray.ts:131`, schema `apps/api/src/db/schema.ts:932-957`). PUT, который
должен был записать результат AI, отвечает 404, а `.catch(() => {})` его глотает. Строка 425
дописывает результат в ЛОКАЛЬНЫЙ `scanHistory`, поэтому на экране всё выглядит записанным.
`loadHistoryScan` (:465) читает `GET /api/xray/scans/:id` из БД — и заключения там нет.

Последствие для врача: снимок загружен, AI выдал заключение, врач его прочитал; после
перезагрузки страницы или при повторном открытии снимка из архива заключение ПУСТО, и ни
на одном шаге не было ни одной ошибки. Это худший вид пустоты: панель показала данные,
которых в базе никогда не было.

Смонтирован в трёх местах — достижим: `components/visit/VisitDiagnosticsTab.tsx:18`,
`PatientsView.tsx:501`, `VisitView.tsx:781` (`rg -n "VisiographAnalyzer" apps/web/src`).

**Рабочий путь УЖЕ НАПИСАН и не используется никем:** `POST /api/xray/scans/:id/analyze`
(`xray.ts:144-204`) сам вызывает `analyzeVisiographImage`, пишет `status:"done"`, `aiReport`,
`aiSummary`, `aiToothStates`, `aiAnalyzedAt` и обрабатывает ошибку. Интерфейс вместо него
зовёт `POST /api/imaging/visiograph-ai` (`VisiographAnalyzer.tsx:349`) и потом пытается
сохранить результат несуществующим PUT.
```
rg -n "scans/.*analyze|/analyze" apps/web/src   # ни одного вызова xray-analyze
```

### Факт БАЗЫ, отдельно от факта исходников
```
select organization_id, status, count(*)::int n, count(ai_report)::int with_report
from xray_scans group by 1,2;   -> []   (таблица ПУСТА в ОБЕИХ организациях)
select id, name, clinic_mode from organizations order by created_at;
  -> 4a3420d1-6ffb-4459-bd8f-7f7087f5e191  Стоматология, 1 кабинет   one_chair   (реальная)
  -> d0000000-0000-4000-8000-00000000d001  Демо-клиника для снимков  small_clinic (фикстура)
```
Организаций РОВНО ДВЕ — подтверждаю исправленную цифру, «4 организации» неверны.
`xray_scans` пуста, поэтому база этот дефект НЕ подтверждает и не опровергает: подтверждение
чисто исходниковое + живой 404. Так и записываю.

---

## КЛАСС C — «маршрут есть, поля называются иначе». ИЗМЕРЕНО ТИПАМИ, НЕ ИМЕНАМИ

### Мой ПЕРВЫЙ инструмент провалил калибровку, и я это фиксирую
`moneyfields.mjs` (диф имён полей: денежное имя, читаемое в web и не объявленное
нигде в api/shared/web) даёт 4 кандидата, все четыре — ложные
(`frequencyBinCount` — Web Audio API, `Count` — КриптоПро COM, `prices` и
`processPriceDictation` — разобраны ниже).

**Этот инструмент НЕ поймал бы дефект, доказанный сегодня.** Проверено:
```
rg -n "\bpriceRub\b" apps/api/src packages/shared/src
  -> packages/shared/src/index.ts:1734  priceRub: nonNegativeMoneyRubSchema.nullable()
  -> packages/shared/src/index.ts:8389  priceRub: nonNegativeMoneyRubSchema
```
`priceRub` — законное имя поля в контракте (строка разобранного прайса и
`visitFlowRequest.completedServices`). Ошибкой оно было только НА ТИПЕ
`ServiceCatalogItem`, у которого поле зовётся `basePriceRub`. Диф имён такое
не видит по устройству. Любая перепись класса C по именам — артефакт.

### Второй инструмент: `anymoney.mjs`, вопрос задан компилятору
Строится настоящая `ts.createProgram` по `apps/web/tsconfig.json` (374 файла) и для
каждого денежного обращения `<obj>.<money>` спрашивается ТИП объекта.
* тип объекта настоящий → поле существует, потому что `typecheck web` = 0 ошибок
  (гейт лида на момент выдачи). Класс C тут невозможен.
* тип объекта `any` / `unknown` / только индексная подпись → компилятор
  `priceRub` от `basePriceRub` не отличает. **Это и есть площадь класса C.**

```
node .agents/archon/recon/RC3-hollow-panel-census/anymoney.mjs
```
Результат (факт исходников):
* денежных обращений всего: **567**
* из них ПРОВЕРЕНО типом: **461**
* из них НЕ ПРОВЕРЕНО (`any`/`unknown`/индексная подпись): **106**, в **28 файлах**
Полный список: `.agents/archon/recon/RC3-hollow-panel-census/anymoney.txt`

### Ручная проверка самых денежных из 106 — НОВЫХ ДЕФЕКТОВ КЛАССА C НЕ НАЙДЕНО
| место | чтение | вердикт |
|---|---|---|
| `components/settings/SettingsPricesTab.tsx:297` | `item.priceRub \|\| item.basePriceRub \|\| 0` | **E, не пустотел** — читает ОБА имени, защищён |
| `components/settings/SettingsPricesTab.tsx:613,654` | `item.priceRub` на строке разбора прайса | **E** — контракт `shared/index.ts:1734` даёт именно `priceRub` |
| `components/visit/CompletedServicesChecklist.tsx:57,59` | `item.unitPriceRub`, `item.discountRub` | **E** — производятся: `db/domainStateHydration.ts:528-529`, `db/schema.ts:466-467` |
| `components/PatientPortal.tsx:47` | `row.totalPrice` → `row.totalPriceRub` | **E** — уже починено, причина написана в комментарии :35-44 |
| `components/patients/PatientFamilyCard.tsx:149` | `familyData.balance` | **E** — маршрут отдаёт именно `balance`: `routes/finance_family.ts:132` |
| `components/patients/OrthodonticProgressWidget.tsx:37` | `orthoData.total` | **E** — это `JSON.parse` легаси-блока в заметках, не контракт API |
| `useAppLogic.tsx:5146` | `contract.annualLimitRub` | **E** — починено раньше, причина в комментарии :5141-5144 |
| `ShiftView.tsx:673` | `dashboard?.billingSummary?.totalPaidRub ?? 0` | **E** — оба поля живые, есть `?? 0` |

### Единственное настоящее несуществующее поле — и вреда пользователю НЕТ
`apps/web/src/components/inventory/useInventoryLogic.ts:596`
```ts
servicesList: dashboard?.prices || [],
```
Поля `prices` в ответе не существует:
```
rg -n "^\s*prices\s*:" apps/api/src packages/shared/src   -> ПУСТО
```
Но `servicesList` не читает НИКТО:
```
rg -n "servicesList" apps/web/src   -> ровно одна строка, та же самая
```
**Вердикт: мёртвое поле, не пустотелая панель.** До экрана значение не доходит,
пользователю показать нечего и нечем. Я НЕ считаю это дефектом и не считаю в
классе C — именно такое раздувание и дало прошлые «42 виджета».

---

## ГЛАВНАЯ НАХОДКА — B-0. «Отправить в ЕГИСЗ» отвечает врачу «Ошибка: Not Found»

Это самая вредная пустотелая панель в дереве, и она стоит на экране приёма.

**Цепочка достижимости, проверена целиком:**
```
apps/web/src/workspaceShell.tsx:54   appViews содержит "visit"
apps/web/src/VisitView.tsx:19,505    <VisitOdontogramTab ... />
apps/web/src/components/visit/VisitOdontogramTab.tsx:4,76   <EgiszMonitor patientId visitId />
```
**Оба её адреса не существуют — подтверждено ЖИВЫМ сервером:**
```
curl -s -X POST -H "Content-Type: application/json" -d '{}' http://127.0.0.1:4100/api/egisz/send
  -> {"message":"Route POST:/api/egisz/send not found","error":"Not Found","statusCode":404}
curl -s http://127.0.0.1:4100/api/egisz/logs/00000000-0000-0000-0000-000000000000
  -> {"message":"Route GET:/api/egisz/logs/... not found","error":"Not Found","statusCode":404}
rg -n 'app\.(get|post|put|patch|delete)\(' apps/api/src/routes/egisz.ts
  -> ровно 4 маршрута: :79, :123, :163, :192 — ни logs, ни send среди них нет
```

**Что видит врач.** Панель рисуется всегда, безусловно (`EgiszMonitor.tsx:98-147`):
заголовок «Интеграция с ЕГИСЗ (РЭМД)» и подпись «Данные приема готовы к отправке»
(`:129`) — потому что `fetchStatus()` (`:37`) получает 404, `res.ok` ложно, статус
остаётся `"Pending"`, и панель утверждает готовность к отправке, которой нет.
Врач нажимает «Отправить в ЕГИСЗ» (`:144`). `handleSend` (`:73`) получает 404,
`data = await res.json()` разбирает тело ошибки Fastify, и `:85`
```ts
setErrorDetails(data.error || "Неизвестная ошибка");
```
берёт из него поле `error`, равное строке **`"Not Found"`**. На экране появляется
**«Ошибка: Not Found»** — по-английски, в русском интерфейсе, врачу, который обязан
выгрузить СЭМД в федеральный реестр.

Нарушено три пункта конституции сразу: §3 (человеческий текст ошибки — здесь его нет
вообще), §10 (выдуманный контракт бэкенда: кнопка обещает выгрузку, маршрута нет),
и «каждая кнопка держит обещание». Плюс §11: английская строка в русском UI.

Оба адреса ЕСТЬ в объявленном долге (`KNOWN_MISSING`, строки 86-87), то есть долг
объявлен — но объявление не говорит, что панель СМОНТИРОВАНА на экране приёма и
показывает англоязычный мусор. Долг зафиксирован как «маршрута нет», а не как
«панель врёт врачу». Это разные вещи, и вторая — дефект, а не долг.

---

## КЛАСС A — «нет писателя». РОВНО 4 МОДУЛЯ, И НИ ОДНОЙ ДОСТИЖИМОЙ ПАНЕЛИ

```
node scripts/census-hollow-query-modules.mjs
```
ИТОГ переписи (её инструмент — TypeScript AST, не regex; я её прочитал целиком):
ПУСТОТЕЛЫЙ 4, СМЕШАННЫЙ 1, ЖИВОЙ 14, ЖИВОЙ (СЫРОЙ SQL) 1, БЕЗ ТАБЛИЦ 1 — всего 21 модуль.
Четыре пустотелых: `customCrmTaskTypesQuery`, `dadataGeocodedAddressesQuery`,
`landingFieldMappingsQuery`, `singleSessionEnforcementsQuery` — все подключены к
`routes/clinical.ts`.

**Но панели над ними НЕ СМОНТИРОВАНЫ — значит пользователю пустоты не показывают:**
```
for w in CustomCrmTaskTypesWidget LandingFieldMappingsWidget \
         DadataGeocodedAddressesWidget SingleSessionEnforcementsWidget; do
  rg -n "import .*$w|<$w" apps/web/src --glob '!tests/*'; done
```
Единственное совпадение на все четыре — **комментарий** `PatientsView.tsx:611`
(«Отсюда убран `<CustomCrmTaskTypesWidget />`»). Ни одного `import`, ни одного JSX.
Все четыре перечислены в `LEGACY_UNMOUNTED_BACKLOG` (`panelsAreMounted.test.ts`:
строки 174, 178, 179, 232) — то есть уже объявлены как несмонтированный долг.

**Вердикт по классу A: 4 мёртвые таблицы, 0 достижимых пустотелых панелей.**
«45 пустотелых модулей из 50» и «42 пустотелых виджета» — обе цифры опровергнуты.

### Обе слепые зоны, которые бриф велел проверить
1. **«перепись ходит только по `apps/api/src`, писатели в `scripts/` ей не видны»** —
   структурно верно, но НЕВЕРНОГО ВЕРДИКТА не даёт. В корневом `scripts/` вообще нет
   ни одной вставки:
   ```
   rg -rn -e "insert into" -e "\.insert\(" -i scripts/ --glob '!census-hollow*'
     -> ПУСТО (после отбрасывания insertBefore/insertAdjacent/insertRule)
   ```
   Четыре мёртвые таблицы в `scripts/` упоминаются только как CSS-селекторы для
   снимков (`generate-wave9-individual-proofs.cjs:9`,
   `generate-wave10-individual-proofs.cjs:11`). Писателя там нет. **Слепая зона
   подтверждена как зона, но пустая.**
2. **«`routes/egisz.ts:163` отдаёт чтение прямо в обработчике, без query-модуля»** —
   **ПОДТВЕРЖДЕНО.** `sed -n '150,180p' apps/api/src/routes/egisz.ts`: на :163
   `app.get("/api/egisz/multiple-diagnoses", ...)` читает
   `db.select().from(schema.egiszMultipleDiagnoses)` прямо в обработчике. Перепись по
   `db/*Query.ts` такое не видит по устройству.

---

## КЛАСС D — «не смонтирован». УЖЕ ЗАКРЫТО ХРАПОВИКОМ, И ХОРОШО

`apps/web/src/tests/panelsAreMounted.test.ts` — полная перепись компонентов через
`@babel/parser` (`tests/utils/componentReachability.ts`), обратное утверждение: ни один
компонент `apps/web/src` не остаётся несмонтированным, кроме прямо перечисленных.
* `DECLARED_UNMOUNTED` — **2** записи с обязательным полем `reason`, и тест проверяет
  глубину причины: `ComparativePlannerDashboard` (:91) и `PublicBookingWidget` (:119).
  Причины на 20+ строк с номерами строк блокеров. **Это и есть тот стандарт
  объявленного долга, о котором говорит бриф.**
* `LEGACY_UNMOUNTED_BACKLOG` — **29** записей, потолок `LEGACY_BACKLOG_CEILING = 29`,
  то есть запаса на молчаливое добавление НЕТ.

**Поправка к брифу:** бриф называет `knownUnwiredPatientComponents` в
`apps/web/src/tests/patientCardDecomposition.test.ts`. Такого идентификатора в дереве
НЕТ:
```
rg -in "knownunwired" apps/web/src apps/api/src
  -> только apps/web/src/tests/documentsViewDecomposition.test.ts:164,202,213
     идентификатор называется knownUnwiredDocumentComponents
```
Образец, который лид похвалил, лежит в другом файле и зовётся иначе. Сам образец
хорош — но `panelsAreMounted.test.ts` строже: там перепись, а не поимённый список,
и `reason` проверяется на глубину.
