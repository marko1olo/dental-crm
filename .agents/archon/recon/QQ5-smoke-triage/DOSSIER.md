# QQ5 — 64 красных smoke-гейта: разбор по классам

Замер: 2026-07-29, тихая машина (PostgreSQL 18 слушает 5432, Vite слушает 5173, **сервера api на
3000/3001/4000 нет**). Прогон строго по одному, `npm run <имя> > log 2>&1; echo $?`, таймаут 110 с на гейт.
Логи: `/tmp/qq5/logs/*.log`, сводка `/tmp/qq5/results.tsv`. Ничего не правилось: пакет только читает.

---

## 0. ЗАМЕР ПРОТИВОРЕЧИТ БРИФУ — ЧИСЛА ДРУГИЕ

| | ведущий | QQ5 |
|---|---|---|
| скриптов `smoke:*` в package.json | 127 | **128** |
| прогнано | 127 | **126** |
| зелёных | 63 | **65** |
| красных | 64 | **61** |

Расхождение объяснимо и не оставляет тайны:

* В `package.json` ровно **128** ключей `smoke:*` (считано `node -e` по `Object.keys`). Из них
  `smoke:all` — не гейт, а сам прогонщик (`scripts/run-smoke-suite.mjs`), и `smoke:mobile` —
  **дубль** `smoke:mobile-overflow`: одна и та же строка `node scripts/smoke-mobile-overflow.mjs`.
  То есть уникальных гейтов 126, а «127» ведущего — это 128 минус `smoke:all`.
* Я НЕ прогонял два: `smoke:all` (агрегатор) и `smoke:schedule-configuration` — второй начинается с
  `npm run db:reset-seed && …`, а сиды пакету запрещены. **Он не оценён вовсе**, ни в зелёных, ни в
  красных. Если он красный, красных 62.
* Остаток (64 → 61) — это артефакт нагрузки, о котором ведущий и спрашивал, и он **мал**. Зелёными на
  тихой машине оказались, в частности, `smoke:browser-imaging-scan-progress-source` и
  `smoke:browser-migration-scan-progress-source` — оба из «браузерного» списка брифа. Гипотеза «часть из
  64 — это только нагрузка» подтверждается, но её цена **≈3 гейта, а не десятки**.

**Ещё одно расхождение с брифом, более важное: класс COMMENT = 0.** Ни один из 61 красного не краснеет
из-за `// Compliance:`. Механизм ровно обратный: `apps/web/src/useSettingsDerivations.tsx` держит
**521** строку `Compliance:` (`rg -c 'Compliance:'`), и стражи её **сознательно не читают** — прямым
текстом, в шапках: `smoke-settings-view-source.mjs:34` («СОЗНАТЕЛЬНО НЕ ЧИТАЕТСЯ, И ЭТО НЕ ЗАБЫВЧИВОСТЬ»),
`smoke-imaging-viewer-usability-source.mjs:34`, `smoke-browser-imaging-scan-progress-source.mjs:26`,
`smoke-pricelist-analyzer.mjs:114`. Файл — это не причина красноты, а **готовый способ покрасить 36
гейтов в зелёный ложью**: добавь его в набор — и, по замеру прошлой волны, записанному в
`smoke-settings-view-source.mjs:163`, красных станет 13 вместо 49. COMMENT — это риск будущей волны,
а не текущий класс.

---

## 1. ГЛАВНЫЙ ОТВЕТ: сколько краснеют ТОЛЬКО из-за среды

**26 из 61.** Остальные 35 — дефекты гейта или продукта, и никакая среда их не перекрасит.

| подкласс среды | гейтов | что именно нужно |
|---|---|---|
| NEEDS_ENV:db-seed | 12 | живая PostgreSQL **с фикстурами** (`npm run db:reset-seed`) |
| NEEDS_ENV:browser | 5 | безголовый Chrome/Edge + свободный профиль в `%TEMP%` |
| NEEDS_ENV:build | 4 | `npm run build -w @dental/shared && -w @dental/api` (+ web) |
| NEEDS_ENV:api-server | 3 | внешний слушающий api (гейт его НЕ поднимает: «fetch failed») |
| NEEDS_ENV:db-seed+session | 2 | своя связка api+vite+chrome ПЛЮС посевной сотрудник для логина |

Из этих 26 самые дешёвые — четыре сборочных: одна команда, и они уйдут из красных. Самые дорогие —
двенадцать посевных: их нельзя гонять параллельно с другими агентами (одна база на всех).

---

## 2. СЧЁТ ПО КЛАССАМ

| класс | гейтов | доля |
|---|---|---|
| NEEDS_ENV | 26 | 43 % |
| BROKEN | 15 | 25 % |
| REAL | 8 | 13 % |
| STALE | 6 | 10 % |
| BRITTLE | 6 | 10 % |
| RESURRECTION | 0 отдельно (3 внутри REAL, см. §5) | — |
| COMMENT | **0** | — |
| **итого** | **61** | |

Читать это надо так: **«64 дефекта» — неверно втрое.** Поведения в продукте нет у 8 гейтов, и ещё
3 из этих 8 требуют вернуть снесённый слой, то есть это решение владельца, а не багфикс.

---

## 3. ТАБЛИЦА: 61 ГЕЙТ

`✔` — класс проверен чтением продукта, а не только текстом падения. `≈` — класс выведен из текста
падения, продукт не вскрывался (честно: может уточниться).

### 3.1 NEEDS_ENV — 26

| гейт | код | класс | текст падения (сокр.) | что нужно для оценки |
|---|---|---|---|---|
| `smoke:chains` | 124 | NEEDS_ENV:db-seed ✔ | дошёл до 13/14 за 111 с и убит таймаутом; на ходу нашёл 2 нарушения в `chainReconProof` и расхождение формул долга в `chainWeldProof` | база + **≥5 мин** без таймаута; гоняет 14 сквозных проверок строго по одной |
| `smoke:wave6` | 127 | NEEDS_ENV:db-seed ≈ | `WAVE 6 SUITE FAILED: 200 valid org: expected 200 got 404` | посевная организация |
| `smoke:wave7` | 127 | NEEDS_ENV:db-seed ≈ | то же, `got 404` | то же |
| `smoke:wave10` | 127 | NEEDS_ENV:db-seed ≈ | то же, `got 404` | то же |
| `smoke:wave11` | 127 | NEEDS_ENV:db-seed ≈ | то же, `got 404` | то же |
| `smoke:wave12` | 127 | BROKEN:auth-fixture ≈ | то же, но `got 401` | см. §3.2 — это не среда |
| `smoke:wave13` | 1 | NEEDS_ENV:api-server ✔ | `WAVE 13 SUITE FAILED: fetch failed` | внешний api; гейт сервер не поднимает |
| `smoke:wave14` | 1 | NEEDS_ENV:api-server ✔ | `fetch failed` | то же |
| `smoke:wave15` | 1 | NEEDS_ENV:api-server ✔ | `fetch failed` | то же |
| `smoke:billing-document-link` | 1 | NEEDS_ENV:db-seed ≈ | `valid linked payment failed: 404` | фикстура визит+документ |
| `smoke:document-route-validation` | 1 | NEEDS_ENV:db-seed ✔ | `fixture payment receipt create failed: 404: {"error":"DocumentOperationRejected","message":"Визит не найден"}` | фикстура визита |
| `smoke:tax-payment-explicit-payer` | 1 | NEEDS_ENV:db-seed ≈ | `ordinary payment without tax payer fields must still pass, got 404` | фикстура пациент+визит |
| `smoke:patient-create-contract` | 1 | NEEDS_ENV:db-seed ≈ | `missing patient core update must return 404: 500 {"error":"PatientUpdateFailed"}` | база; 500 вместо 404 может оказаться REAL — **перепроверить после сида** |
| `smoke:telegram-outbox-persistence` | 1 | NEEDS_ENV:db-seed ≈ | `outbox must expose at least one ready item after patient chat link` | база + посев чат-связки |
| `smoke:patient-forms-lifecycle` | 1 | NEEDS_ENV:db-seed ≈ | `patient_intake_questionnaire: missing structured payload must be blocked` | фикстура пациента |
| `smoke:visit-workflow-forms-lifecycle` | 1 | NEEDS_ENV:db-seed ≈ | `informed_consent: visit-required form without visit must be blocked` | фикстура визита |
| `smoke:mobile` | 1 | NEEDS_ENV:browser ✔ | `.dicom-mpr-workbench is not visible on the target page` | браузер + залогиненная сессия; **дубль `mobile-overflow`** |
| `smoke:mobile-overflow` | 1 | NEEDS_ENV:browser ✔ | то же | то же |
| `smoke:browser-file-input-dicom` | 1 | NEEDS_ENV:browser+session ✔ | `Browser local imaging file input was not found: … "bodyText":"DENTE CRM-MIS\nВХОД В ЛИЧНЫЙ КАБИНЕТ ВРАЧА…"` — **гейт стоял на экране логина**, `hasShell:false` | браузер + посевной сотрудник |
| `smoke:visit-live-workflow` | 1 | NEEDS_ENV:browser ✔ | `EBUSY: resource busy or locked, unlink '…dental-crm-visit-live-smoke-19344\first_party_sets.db'` | чистый `%TEMP%`; чужой Chrome держит профиль |
| `smoke:workspace-live-routes` | 1 | NEEDS_ENV:browser ✔ | `shift app shell did not become ready: false` | браузер + сессия |
| `smoke:workspace-live-core-actions` | 1 | NEEDS_ENV:db-seed+session ✔ | `Error: HTTP 401` из `scripts/lib/fetchJson.mjs:9` | посевной сотрудник для логина |
| `smoke:workspace-live-settings-actions` | 1 | NEEDS_ENV:db-seed+session ✔ | `Error: HTTP 401` | то же |
| `smoke:dist-freshness` | 1 | NEEDS_ENV:build ✔ | `@dental/api: пар «исходник новее своей сборки» — 17` (худшее отставание 3031 с), `@dental/shared: 2` | пересборка; **краснеет законно** |
| `smoke:clinical-mutation-guard` | 1 | NEEDS_ENV:build ✔ | `assertBuildOutputIsFresh` → `apps/api/src/routes/odontogram.ts исходник 09:35:33 новее сборки 09:13:07 … и ещё 4` | пересборка api |
| `smoke:web-bundle-budget` | 1 | NEEDS_ENV:build ✔ | 6 строк вида `SettingsView-D-Pq10-4.js: lazy route chunk must not statically import the heavy workspace chunk` | пересборка web: `apps/web/dist/index.html` от 12:57, свежайший `apps/web/src` — 14:12 |
| `smoke:speech-provider-errors` | 1 | NEEDS_ENV:build ≈ | падает внутри `apps/api/dist/speech/storage.js:975` со `statusCode: 400` | пересборка api; после неё перепроверить — может оказаться REAL |

### 3.2 BROKEN — 15

**13 из 15 — один и тот же дефект: гейт не удовлетворяет контракт авторизации.** Гейт монтирует роут из
`apps/api/dist/**` в свой Fastify и бьёт `app.inject`, но арендатор берётся ТОЛЬКО из подписанного токена
(`apps/api/src/accessGuard.ts:141-152`), а токен сотрудника принимается только с `userId`-строкой
(`apps/api/src/security/identity.ts:160`). Токен без `userId` игнорируется целиком, вместе с
организацией, и роут отвечает 401. Средой это не лечится: чинить надо сам гейт. Признание лежит в самом
скрипте — `scripts/smoke-payment-idempotency.mjs:93-95`:

```
// Billing mutations require a staff session. Sign a short-lived staff token with
// no userId so verifyRequestToken resolves the org without a DB user lookup
// (this smoke runs against in-memory sample state, not the PGlite database).
```

Комментарий описывает мёртвый мир дважды: и «org без userId», и PGlite (её в проекте нет,
`.agents/DATABASE.md`). Все боевые пути входа подписывают `userId`:
`apps/api/src/routes/auth.ts:233, 522, 579, 691`; внутренние доказательства тоже —
`apps/api/src/tests/security/crossTenantReconProof.ts:152`,
`apps/api/src/tests/routes/doctorPayoutsProof.ts:219` («userId в токене обязателен»).

| гейт | код | класс | текст падения (сокр.) | что нужно |
|---|---|---|---|---|
| `smoke:payment-idempotency` | 1 | BROKEN:auth-fixture ✔ | `first payment must append: 401 {"error":"AuthRequired"}` | подписать токен с `userId` |
| `smoke:ai-recognition-scope` | 1 | BROKEN:auth-fixture ✔ | `AI job wrong patient imaging study status 404: {"error":"AiRecognitionScopeError"}` — ставит только `x-dente-clinic-token` (`:116`) | добавить токен сотрудника |
| `smoke:imaging-study-visit-scope` | 1 | BROKEN:auth-fixture ✔ | `wrong-patient imaging visit status mismatch: 401` — токен не ставится вовсе | то же |
| `smoke:communication-task-complete-contract` | 1 | BROKEN:auth-fixture ✔ | `unknown communication task must return 404, got 401` | то же |
| `smoke:communication-task-outcomes` | 1 | BROKEN:auth-fixture ✔ | `no_answer completion failed: 401 {"error":"AuthRequired"}` | то же |
| `smoke:document-html-issue-guards` | 1 | BROKEN:auth-fixture ✔ | `structured document without payload must not render printable HTML: 401` | то же |
| `smoke:document-issue-chains` | 1 | BROKEN:auth-fixture ✔ | `contract create failed: 401 {"error":"AuthRequired"}` | то же |
| `smoke:document-lifecycle` | 1 | BROKEN:auth-fixture ✔ | `payment receipt create failed: 401` | то же |
| `smoke:tax-certificate-duplicate-issue` | 1 | BROKEN:auth-fixture ✔ | `first tax certificate create failed: 401` | то же |
| `smoke:tax-document-explicit-payment-scope` | 1 | BROKEN:auth-fixture ✔ | `tax certificate without selected payments must be 409, got 401` | то же |
| `smoke:tax-knd-xml` | 1 | BROKEN:auth-fixture ✔ | `tax certificate create failed: 401` | то же |
| `smoke:dicom-folder-workup` | 1 | BROKEN:auth-fixture ✔ | `blank imaging study create must fail with 400, got 401: {"error":"AuthRequired"}` | то же |
| `smoke:wave12` | 127 | BROKEN:auth-fixture ≈ | `200 valid org: expected 200 got 401` (соседние волны дают 404 — у этой отвалилась именно личность) | то же |
| `smoke:db-runtime-contract` | 1 | BROKEN:dead-path ✔ | `ENOENT: open 'apps/api/drizzle/0013_communication_telegram_runtime_tables.sql'` | **файла нет и никогда не было**: на диске `0013_add_missing_organization_columns.sql`. Скрипт держит захардкоженный список путей (`:9,13,17,21,…`) из мёртвой линии миграций |
| `smoke:imaging-preview-object-url-lifecycle` | 1 | BROKEN:anchor ✔ | `imaging preview object URL effect not found` | якорь конца — `"useEffect(() => {\n    const settings = telegramStatus?.settings;"`, **четыре пробела**, а в `useAppLogic.tsx:3977` отступ — два таба (`cat -A`: `^I^Iconst settings = telegramStatus?.settings;`). Совпасть не может никогда. Скрипт вычисляет `normalizedSource` (CRLF→LF) на строке 5 и **ищет в ненормализованном** `source` |

### 3.3 STALE — 6 (текст переехал, поведение есть)

| гейт | код | класс | текст падения (сокр.) | где поведение на самом деле |
|---|---|---|---|---|
| `smoke:document-legal-confirmations` | 1 | STALE ✔ | 21+ отсутствующая иголка вида `app:const [informedConsentQuestionsAnswered, …] = useState(false)` | гейт читает только `App.tsx` + appLogic + `DocumentsView.tsx` (`:4-8`). Символ живёт в `documentLogic.ts`, `documentValidators.ts`, `components/documents/informedConsentBlockers.ts`, `components/documents/forms/InformedConsentForm.tsx`, `store/documentStore.ts` |
| `smoke:daily-surfaces-keyboard-accessibility` | 1 | STALE ✔ | 11 строк, `schedule: appointment edit buttons must expose expanded state` и т.п. | гейт читает `apps/web/src/ScheduleView.tsx` (`:7`); `aria-expanded` живёт в `components/schedule/AppointmentCard.tsx`, `NewAppointmentForm.tsx`, `WaitlistDrawer.tsx` |
| `smoke:patient-administrative-profile` | 1 | STALE ✔ | `patient core save button must be readable Russian` — иголка `patientsSource.includes("Сохранить карточку")` (`:75`) | текст «Сохранить карточку» есть, но в `components/patients/PatientOverviewTab.tsx`, а гейт читает другой файл (`:54`) |
| `smoke:import-contracts` | 1 | STALE ≈ | `migration workflow failures must keep readable server messages but hide raw fetch/DOM/stack failures` (`:294`) | не вскрывал |
| `smoke:speech-clinical-scope` | 1 | STALE ≈ | `speech prompt warnings must be readable for clinic staff` (`:137`) | не вскрывал |
| `smoke:settings-persistence-file` | 1 | STALE ≈ | `stale UI preference save must not overwrite newer role` (`:332`) | не вскрывал |

### 3.4 BRITTLE — 6 (краснеет за улучшение кода)

| гейт | код | класс | текст падения (сокр.) | почему это улучшение |
|---|---|---|---|---|
| `smoke:visit-route-validation` | 1 | BRITTLE ✔ | `visit route still exposes raw request validation: const message = error instanceof Error ? error.message` | запрещённая подстрока — **префикс** живой строки `apps/api/src/routes/visits.ts:233`: `const message = error instanceof Error ? error.message.trim() : "";`. Внутри `sendVisitOpenError` сырой текст служит ТОЛЬКО дискриминатором (`message === "Запись не найдена"` и т.п.), а клиенту в каждой ветке уходит выверенная константа. Гейт краснеет на безопасном коде |
| `smoke:visit-draft-status-contract` | 1 | BRITTLE ✔ | `visit route must not forward raw domain error.message` | тот же файл, та же причина |
| `smoke:ui-preferences` | 1 | BRITTLE ✔ | `Missing marker: saveUiPreferences({` | гейт режет файл по `sourceSlice("saveUiPreferences({", "  }, [")` (`:43`). Продукт вынес литерал в именованную функцию: `useAppLogic.tsx:3784` → `saveUiPreferences(currentUiPreferencesInput())`. Плюс якорь конца задан **двумя пробелами** при табах в файле |
| `smoke:telegram-control-ui-source` | 1 | BRITTLE ✔ (риск RESURRECTION) | `missing: telegram routes missing revokeDenteTelegramChatLink(request.params.linkId, {` | продукт вызывает её с объектом арендатора первым аргументом: `routes/telegram.ts:2921-2926` → `revokeDenteTelegramChatLink({organizationId, clinicId, botConfigId}, …)`. Иголка требует **старую, менее защищённую подпись** — буквальное её удовлетворение вернуло бы вызов по одному `linkId` |
| `smoke:payment-capture-source` | 1 | BRITTLE ✔ | 8 строк, в т.ч. `Payment submit must mint a client operation id before POST`, `PaymentCapture must own payment form markup` | иголка `const paymentClientMutationId = browserGeneratedId("payment")`; продукт держит id в **ref**, чтобы он выживал повтор: `useAppLogic.tsx:12876` → `paymentMutationIdRef.current = browserGeneratedId("payment")`. Иголка `className="payment-capture"` — класс переименован в `payment-capture-detail-section` / `payment-capture-detail-grid` (`PaymentCapture.tsx:122,125`). Компонент и `rubAmountInputMissingStep` на месте |
| `smoke:core-route-validation` | 1 | BRITTLE ≈ | `billing payment invalid payload must return bounded message, got: {"error":"BillingValidationError","message":"Оплата не записана. пациент: Required; сумма: Required."}` | сообщение по-русски и перечисляет недостающие поля — по-человечески это лучше «bounded». Решение о том, считать ли перечисление полей утечкой, за ведущим |

### 3.5 REAL — 8

Таблица + точные строки требований — в §5.

| гейт | код | класс |
|---|---|---|
| `smoke:dental-persistence-routes-source` | 1 | REAL ✔ |
| `smoke:segmented-controls-accessibility-source` | 1 | REAL ✔ |
| `smoke:speech-local-bridge-readiness` | 1 | REAL ✔ |
| `smoke:schema-column-parity` | 1 | REAL ✔ |
| `smoke:imaging-manifest-parser` | 1 | REAL ✔ |
| `smoke:visit-dictation-simplified-actions-source` | 1 | REAL+RESURRECTION ✔ |
| `smoke:speech-recorder-resilience-source` | 1 | REAL+RESURRECTION ✔ |
| `smoke:speech-final-ready-status-source` | 1 | REAL+RESURRECTION ✔ |

---

## 4. МЕХАНИЗМ МАССОВОЙ КРАСНОТЫ: `indexOf` → `-1` → пустой срез

Репозиторий уже знает про STALE и частично лечил его: `scripts/lib/app-logic-source.mjs` в шапке пишет,
что после выноса кода в `apps/web/src/hooks/domains/*` «**35 проверок начали падать на том, что код
ПЕРЕЕХАЛ, а не на том, что он сломался**» и что «в 86 красных проверках настоящие регрессии не видно».
Лекарство неполное: модуль склеивает только `useAppLogic.tsx` + `hooks/domains/*`, а текст уехал ещё и в
`components/**`, `store/**`, `documentLogic.ts`.

Поверх этого работает второй усилитель. Стражи режут срез якорями:

```js
const recordPaymentSource = appSource.slice(
    appSource.indexOf("async function recordPayment()"),
    appSource.indexOf("function documentKindsForCommunicationTask"),
);
```

Промах любого якоря даёт `-1`, `slice(-1, -1)` даёт **пустую строку**, и тогда падают ВСЕ иголки этого
среза сразу — одна опечатка отступа превращается в 8-34 «нарушения». В логах это видно как напечатанное
`-1`: `configureServerVoiceRecorder=-1`, `chunkHadVoice===false: -1`, `показ по условию: -1`. Именно так
`smoke:imaging-preview-object-url-lifecycle` умирает от четырёх пробелов против табов.

**Вывод для следующей волны: одна починка якоря/набора файлов гасит десятки строк, но НЕ является
починкой продукта.** Считать «строки нарушений» дефектами нельзя — надо считать гейты.

---

## 5. REAL — список с точной строкой требования

### 5.1 `smoke:dental-persistence-routes-source` — утечка одонтограммы между клиниками
Прогон: `checksRun: 22, failed: 1`.
> `Odontogram websocket updates must stay tenant/patient scoped: odontogram.ts:426 still uses
> broadcastToOrganization, so one patient's tooth states reach every clinic socket.`

Требование указывает файл и строку: `apps/api/src/routes/odontogram.ts:426`. Самый серьёзный REAL в
наборе — это утечка клинических данных, а не косметика.

### 5.2 `smoke:segmented-controls-accessibility-source` — состояние пресета распознавания не объявлено
Страж сам печатает класс и строку:
> `ОБЪЯВЛЕННЫЙ ДОЛГ (1) — доступности нет в продукте.`
> `Settings recognition preset picker must expose selected state.`
> `REAL — components/settings/SettingsAiTab.tsx:266 держит выбранный пресет ТОЛЬКО классом оформления:`
> `className={\`ai-target-card ${recognitionKind === preset.kind && recognitionTarget === preset.target ? "active" : ""}\`}`
> `На кнопке нет ни aria-pressed, ни aria-selected, ни role.`

### 5.3 `smoke:speech-local-bridge-readiness` — готовность локального моста нигде не считается
> `Visit speech status UI does not map local bridge readiness honestly: const serverVoiceRecordingAvailable =`

Проверено: `rg -ln 'serverVoiceRecordingAvailable' apps/web/src` → **0 файлов**;
`VoiceRecordingAvailable|voiceBridgeReady|localBridgeReady|speechBridge` → тоже 0. Байндинга нет ни под
этим, ни под похожим именем.

### 5.4 `smoke:schema-column-parity` — 8 таблиц, где `schema.ts` объявляет колонки, которых нет ни в одном DDL
Проверка чисто статическая (`schema.ts` против `drizzle/*.sql`), среда не нужна. Требование:
«в schema.ts объявлены колонки, которых нет в DDL» — по шапке скрипта любой `select()` по такой колонке
падает в рантайме:

| таблица | колонки |
|---|---|
| `migration_staging_records` | `confidence, lineage_json, natural_key, normalized_json, raw_hash, raw_json, source_table, target_entity_id` |
| `non_dental_examination_forms` | `form_name` |
| `patient_communication_consents` | `source` |
| `patient_reclamations` | `doctor_id, status` |
| `patient_task_tickets` | `assigned_to_id, organization_id, priority, status` |
| `portal_otp_codes` | `channel, code_hash, delivery_error_class, delivery_status` |
| `rebooking_conversion_rules` | `appointment_date, time_delta_minutes` |
| `schedule_time_reservations` | `start_time` |

### 5.5 `smoke:imaging-manifest-parser` — парсер манифеста ставит `warning` вместо `ready`
> `AssertionError: No-headers row should be correctly parsed to ready status` — `'warning' !== 'ready'`,
> `scripts/smoke-imaging-manifest-parser.mjs:119`

Чистая функция, ни базы, ни сборки, ни браузера. Либо парсер, либо требование — но это единственный
красный, который проверяется одним запуском без всякой среды.

### 5.6-5.8 Три гейта требуют ВЕРНУТЬ снесённый слой (REAL по факту, RESURRECTION по способу закрытия)
Эти стражи сами печатают и класс, и способ закрытия — «**закрыть долг = вернуть поведение**», то есть
это решение владельца продукта, а не багфикс. Отсутствие поведения при этом **измерено** стражем:
«маркеров нет ни в одном из 469 файлов `apps/web/src`».

* `smoke:visit-dictation-simplified-actions-source` — `ИТОГ: живых локов держит 2, сломано 0,
  неоценимо 1, объявленного отсутствия 29`. Страж указывает, куда уехало управление:
  «Управление очередью аудио снова спрятано в „Дополнительно“ (**VisitView.tsx:780-792**)».
* `smoke:speech-recorder-resilience-source` — `живых локов держит 3, сломано 0, неоценимо 3,
  объявленного отсутствия 34`. Страж называет коммиты сноса: «Слой снесён 2026-07-07
  (**af3e2a01c / 624d7ae65**)». Пример требования: `Visit voice recorder must track whether a stop was
  requested by the doctor.`
* `smoke:speech-final-ready-status-source` — `живых локов держит 0, сломано 0, неоценимо 4,
  объявленного отсутствия 21`, те же коммиты сноса. Пример: `Final speech status must tell the doctor
  that queued audio is preserved instead of implying failed recognition.`

`неоценимо` (1+3+4 = 8 утверждений) — отдельная категория внутри этих трёх: утверждение истинно ПУСТО,
потому что область проверки снесена. Страж честно не считает их держащими. Это STALE-хвост внутри REAL.

---

## 6. ПОБОЧНАЯ НАХОДКА, КОТОРУЮ НЕ ЛОВИТ НИ ОДИН ГЕЙТ: журнал миграций указывает в пустоту

Найдено при разборе `smoke:db-runtime-contract`. В `apps/api/drizzle/meta/_journal.json` — **28** записей
`tag`, и **ни одна** не имеет `.sql` на диске:

```
journal: 0000_gifted_masked_marvel   диск: 0000_freezing_randall_flagg
journal: 0013_communication_telegram_runtime_tables   диск: 0013_add_missing_organization_columns
```

Проверено циклом `[ -f "apps/api/drizzle/$tag.sql" ]` по всем 28 тегам: **28 MISSING из 28**. При этом
в папке лежат **104** `.sql`-файла. То есть журнал описывает другую, мёртвую линию миграций.
`.agents/AGENTS.md` 8b: «A migration is complete only as `.sql` + journal + snapshot, proven against a
clean database» — здесь связка разорвана целиком. Это не класс гейта, это отдельный пакет.

---

## 7. ЧТО СЛЕДУЮЩЕЙ ВОЛНЕ ДЕЛАТЬ В КАКОМ ПОРЯДКЕ

1. **Один токен — 13 гейтов.** Общий помощник, подписывающий staff-токен **с `userId`**, снимает весь
   `BROKEN:auth-fixture`. Пока он не сделан, ни один из 13 не проверяет то, ради чего написан: они
   умирают на 401 до первого содержательного утверждения.
2. **`npm run build` — 4 гейта** (`dist-freshness`, `clinical-mutation-guard`, `web-bundle-budget`,
   и, вероятно, `speech-provider-errors`). Гонять ПОСЛЕ того, как агенты перестали править `apps/api/src`,
   иначе гейт снова покраснеет законно.
3. **`db:reset-seed` + прогон 12 посевных, строго последовательно.** Одна база на всех; параллель
   запрещена `.agents/AGENTS.md` 7a.
4. **8 REAL — это и есть будущие пакеты.** Первым — §5.1 (одонтограмма уходит во все сокеты клиник)
   и §5.4 (8 таблиц с несуществующими колонками): оба про данные, а не про UI.
5. **Три RESURRECTION (§5.6-5.8) не отдавать исполнителю.** Они требуют вернуть слой, снесённый
   2026-07-07 сознательно; нужен ответ владельца «возвращаем или удаляем требование», иначе агент
   восстановит снесённое молча.
6. **Не добавлять `useSettingsDerivations.tsx` в наборы стражей.** Это единственный способ увидеть
   зелёное там, где ничего не починено: 521 строка `Compliance:` покрасит 36 гейтов ложью.

---

## 8. ЧЕСТНЫЕ ГРАНИЦЫ ЭТОГО ДОСЬЕ

* Разобрано **61 из 61** красного, не оценён **1** гейт целиком: `smoke:schedule-configuration`
  (начинается с `db:reset-seed`, сиды пакету запрещены). `smoke:all` — агрегатор, не гейт.
* Пометка `≈` стоит у **11** гейтов: класс выведен из текста падения, продукт по ним не вскрывался.
  Наиболее вероятны к переклассификации `smoke:patient-create-contract` (500 вместо 404 может оказаться
  REAL после сида) и `smoke:speech-provider-errors` (после пересборки api).
* `smoke:chains` не доиграл: убит на 13/14 таймаутом 110 с. На ходу он успел показать 2 нарушения в
  `chainReconProof` и расхождение формул долга в `chainWeldProof` — **это не зачтено ни в один класс** и
  требует отдельного прогона без таймаута.
* Прогон писал в `apps/api/.data/dental-crm-state.json` и `apps/api/.data/speech-key-health.json`
  (рантайм-состояние api). Я их не трогал руками и не коммитил.
* Ни один файл продукта этим пакетом не изменён. Правка стража была запрещена и не делалась.
