## VERDICT: NEEDS_REWORK

Пакет сделал заявленную работу и снял слепоту кампании: досье настоящее, мутация настоящая,
список 61 красного гейта совпадает с измеренными красными **точно, без пропусков и без выдумок**.
Но **два числа, которые ведущий понесёт дальше, посчитаны неверно, и одно из них уже лежит в
постоянном тексте коммита**. Оба ошибаются в оптимистичную сторону, то есть следующая волна
недооценит объём. Правка узкая: перечитать четыре полных лога и переклассифицировать семь гейтов.
Досье выбрасывать НЕЛЬЗЯ — 90 % его проверено и подтверждено.

---

## 1. ЧТО ПРОВЕРЕНО КОМАНДОЙ, ДОСЛОВНО, С КОДАМИ ВЫХОДА

### 1.1 Мутация повторена мной, независимо. Она поведенческая, не компиляционная

```
$ node /tmp/qq5/probe-identity.mjs apps/api/dist/security/identity.js
EXIT_PASS=0
PASS  staff token WITHOUT userId is ignored entirely (org stays null) -> 401  (organizationId=null)
PASS  staff token WITH userId resolves the organization  (organizationId=11111111-2222-3333-4444-555555555555)
assertions=2 failed=0 module=identity.js
```

Свою копию я сделал сам, своим именем, и мутировал ровно одну строку:

```
$ diff apps/api/dist/security/identity.js apps/api/dist/security/__revbiteidentity.js
134c134
<     if (staffPayload && typeof staffPayload.userId === "string") {
---
>     if (staffPayload) {

$ node /tmp/qq5/probe-identity.mjs apps/api/dist/security/__revbiteidentity.js
EXIT_BITE=1
FAIL  staff token WITHOUT userId is ignored entirely (org stays null) -> 401  (organizationId=11111111-2222-3333-4444-555555555555)
PASS  staff token WITH userId resolves the organization  (organizationId=11111111-2222-3333-4444-555555555555)
assertions=2 failed=1 module=__revbiteidentity.js
```

Это **поведение, а не компиляция**: файл — готовый JS в `dist`, компилятора в контуре нет вовсе,
и мутант исполняется до конца, просто отвечает другой организацией. Мутация точно попадает в предмет
утверждения: снятие проверки `userId` возвращает организацию из токена, который продукт обязан
игнорировать. Свою копию удалил, `git status --porcelain apps/api/dist/security/` пуст.

Источник в TS совпадает с `dist` дословно — `apps/api/src/security/identity.ts:160` та же строка,
так что проба меряет живой продукт, а не отставшую сборку.

### 1.2 COUNT пересчитан по его же журналу — сходится

```
$ wc -l < /tmp/qq5/results.tsv                     -> 126
$ awk -F'\t' '$2==0'  results.tsv | wc -l          -> 65   (зелёных)
$ awk -F'\t' '$2!=0'  results.tsv | wc -l          -> 61   (красных)
$ awk -F'\t' '{print $2}' | sort | uniq -c         -> 65×0, 55×1, 5×127, 1×124
$ ls /tmp/qq5/logs | wc -l                         -> 126  (лог на каждый гейт)
```

**Главная проверка честности досье — совпадение множеств, и она пройдена:**

```
dossier_rows= 61      tsv_reds= 61
in_dossier_not_red= []        red_not_in_dossier= []
```

Ни одного гейта в досье, который не был красным. Ни одного красного, пропущенного досье. Это
исключает и подгонку, и «разобрал двадцать, написал шестьдесят».

Арифметика классов тоже сходится: 26 + 15 + 6 + 6 + 8 = 61. В таблице §3.1 27 строк, но лишняя —
`smoke:wave12`, помеченная там же `BROKEN:auth-fixture ✔ «см. §3.2 — это не среда»` и посчитанная
в §3.2. Уникальных гейтов ровно 61, двойного счёта нет.

### 1.3 Одиннадцать гейтов прогнал сам. Все одиннадцать кодов совпали с досье

```
EXIT smoke:dental-persistence-routes-source     = 1
EXIT smoke:schema-column-parity                 = 1
EXIT smoke:imaging-manifest-parser              = 1
EXIT smoke:speech-local-bridge-readiness        = 1
EXIT smoke:segmented-controls-accessibility-source = 1
EXIT smoke:payment-idempotency                  = 1
EXIT smoke:db-runtime-contract                  = 1
EXIT smoke:visit-route-validation               = 1
EXIT smoke:document-legal-confirmations         = 1
EXIT smoke:browser-imaging-scan-progress-source = 0
EXIT smoke:browser-migration-scan-progress-source = 0
```

**Опровержение брифа ведущего подтверждено независимо.** Оба `browser-*-scan-progress-source`
зелёные на тихой машине (код 0). Они и не браузерные: имя гейта начинается с `browser-`, а работа
у них — чтение исходника. Класс «нужен безголовый браузер» им приписан по имени, а не по коду.

### 1.4 Ключи и дубль — пересчитаны

```
$ node -e "...Object.keys(scripts).filter(startsWith('smoke:'))"
SMOKE_KEYS=128
DUP_GROUPS=1
DUP: smoke:mobile | smoke:mobile-overflow  => node scripts/smoke-mobile-overflow.mjs
```

128, не 127. Дубль реален и байт-в-байт. `smoke:schedule-configuration` действительно начинается
с `npm run db:reset-seed && …`, `smoke:all` действительно `node scripts/run-smoke-suite.mjs`.
Отвод обоих законен.

### 1.5 Точные ссылки досье — проверены по диску, все совпали

| утверждение досье | проверка | итог |
|---|---|---|
| `odontogram.ts:426` `broadcastToOrganization` | `rg -n` → единственное вхождение, ровно 426 | ✔ дословно |
| `security/identity.ts:160` | `sed -n '160p'` → `if (staffPayload && typeof staffPayload.userId === "string")` | ✔ |
| `accessGuard.ts:141-152` — арендатор только из токена | шапка `resolveOrganizationId` говорит именно это | ✔ |
| `routes/auth.ts:233,522,579,691` подписывают `userId` | все четыре строки содержат `userId: user.id` | ✔ 4/4 |
| `smoke-payment-idempotency.mjs:93-95` — признание + PGlite | комментарий начинается ровно на 93 | ✔ |
| PGlite не установлена | `node_modules/@electric-sql` пуст, `pglite` в package.json нет | ✔ |
| 521 строка `Compliance:` | `rg -c` → **521** (сам страж в шапке пишет 517 — устарел на 4) | ✔ |
| `smoke-settings-view-source.mjs:34` «СОЗНАТЕЛЬНО НЕ ЧИТАЕТСЯ» и замер 13 против 49 | есть на :34 и :163 дословно | ✔ |
| `visits.ts:233` — запрещённая подстрока есть префикс безопасной строки | `const message = error instanceof Error ? error.message.trim() : "";` | ✔ BRITTLE верен |
| `useAppLogic.tsx:3784` `saveUiPreferences(currentUiPreferencesInput())` | точное совпадение строки | ✔ |
| `PaymentCapture.tsx:122,125` новые имена классов | `payment-capture-detail-section` / `-grid` | ✔ |
| `af3e2a01c` / `624d7ae65` — коммиты сноса 2026-07-07 | оба существуют, оба 2026-07-07 | ✔ |
| `app-logic-source.mjs` шапка: «35 проверок», «в 86 красных проверках» | дословно в шапке | ✔ |
| `useAppLogic.tsx:3977` — два таба против четырёх пробелов в якоре | `cat -A` → `^I^Iconst settings = telegramStatus?.settings;`, в скрипте `:8` → `\n    const settings` | ✔ |
| поиск идёт по НЕнормализованному `source` | `:6-10` и `:16` используют `source`; `normalizedSource` только в `requireSourceSnippet`, до которого бросок на `:13` не доходит | ✔ по существу |
| `serverVoiceRecordingAvailable` — 0 файлов | `rg -ln` → 0, и по синонимам 0 | ✔ |
| STALE `document-legal-confirmations` | символ в 6 файлах, страж читает 3 | ✔ |

### 1.6 Находка про журнал миграций — подтверждена, и она крупная

```
$ node -e "journal entries + existsSync per tag"
entries=28
missing_sql=28
first_tag=0000_gifted_masked_marvel      диск: 0000_freezing_randall_flagg
```

**28 из 28.** Связка «.sql + journal + snapshot» из `.agents/AGENTS.md` 8b разорвана целиком.
Это самостоятельный пакет, и досье право, что ни один гейт этого не ловит.

### 1.7 Дыра «список путей, которых нет» — есть, и она шире, чем пишет досье

Пункт 3 задания ведущего. Тестов пакет не добавлял, но ровно эта дыра нашлась в продукте гейтов:

```
$ rg -o 'drizzle/[0-9A-Za-z_]+\.sql' scripts/smoke-db-runtime-contract.mjs | sort -u | wc -l   -> 12
$ for p in ...; do [ -f "apps/api/$p" ] || echo MISSING; done | wc -l                          -> 12
```

**12 из 12 захардкоженных путей не существуют.** Гейт падает `ENOENT` на первом (`:8`, до первого
утверждения) и остальные 11 маскирует. Досье назвало один путь; их дюжина.

### 1.8 Гигиена коммита

```
$ git show --name-only --format='' 68176467b
.agents/archon/packets/QQ5/commitmsg.txt
.agents/archon/recon/QQ5-smoke-triage/DOSSIER.md
$ git log -1 --format='%(trailers)' 68176467b   -> (пусто)
```

Два файла, оба заявленные. Трейлеры пусты, атрибуции нет, автор `marko1olo`. `[ARCHON]` в теме есть.
Чужая незакоммиченная работа не подметена: в дереве 529 записей `git status`, ни одна не попала
в коммит. Продукт не тронут. Мутационных остатков пакета нет.

---

## 2. ПОЧЕМУ ВСЁ-ТАКИ NEEDS_REWORK — ЧЕТЫРЕ ЧИСЛА, ДВА ИЗ НИХ РАБОЧИЕ

### 2.1 ГЛАВНОЕ: ответ на твой вопрос завышен. «26 из-за среды» — на самом деле ≈19

Это единственное число, за которым ты посылал пакет, и оно в постоянном тексте коммита
(«ОТВЕТ НА ГЛАВНЫЙ ВОПРОС: только из-за среды краснеют 26 из 61»).

Из 12 гейтов, отнесённых к `NEEDS_ENV:db-seed`, **минимум семь не касаются базы вообще**. Они
монтируют роут из `dist` в свой Fastify и работают против `apps/api/dist/sampleData.js` при
`DENTAL_STATE_PERSISTENCE = "off"`:

```
$ for s in ...; do rg -c 'dist/sampleData' ; rg -c 'DENTAL_STATE_PERSISTENCE'; rg -c 'DATABASE_URL|drizzle|getDb\('; done
patient-create-contract          sampleData=1 persistOff=1 dbUrl=0
billing-document-link            sampleData=1 persistOff=1 dbUrl=0
document-route-validation        sampleData=1 persistOff=1 dbUrl=0
tax-payment-explicit-payer       sampleData=1 persistOff=1 dbUrl=0
patient-forms-lifecycle          sampleData=1 persistOff=1 dbUrl=0
visit-workflow-forms-lifecycle   sampleData=1 persistOff=1 dbUrl=0
telegram-outbox-persistence      sampleData=0 persistOff=1 dbUrl=0   (пишет свой state.json в mkdtemp)
```

`npm run db:reset-seed` не сдвинет ни один из них ни на байт. Их фикстуру строит сам скрипт,
в памяти. Значит это BROKEN (гейт строит негодную фикстуру) или REAL (роут отвечает не по контракту),
но **не среда**.

Два места, где это особенно больно:

* **`smoke:document-route-validation` помечен `✔`** — то есть «класс проверен чтением продукта».
  Его же строка 6 — `process.env.DENTAL_STATE_PERSISTENCE = "off";`, а строка 25 монтирует
  `dist/sampleData.js`. Утверждение «нужна фикстура визита в базе» опровергается первыми десятью
  строками файла, который пакет объявил прочитанным. Это ровно тот класс, за которым ты просил
  следить: галочка проверки там, где проверки не было.
* **`smoke:telegram-outbox-persistence`** — «persistence» у него файловая: `mkdtempSync` →
  `DENTAL_STATE_FILE`. PostgreSQL там не участвует. Твой бриф отнёс его к «живая PostgreSQL с
  фикстурами» — и пакет унаследовал твою посылку вместо того, чтобы её сломать. Именно за это
  ломание он и посылался.

Пересчёт: `NEEDS_ENV` ≈ 19, «никакая среда не перекрасит» ≈ 42, а не 35. Цена твоей слепоты
не 26, а около 19 — и это делает досье ещё выгоднее, чем оно себя продаёт.
`smoke:chains` в среде я оставляю: его собственная шапка требует живую PostgreSQL прямым текстом,
классификация верна.

### 2.2 Самая ценная REAL-находка занижена в 2,4 раза: 8 таблиц против 19

§5.4 озаглавлен «**8 таблиц**». Гейт печатает **девятнадцать** — и это видно в его же логе,
сохранённом пакетом:

```
$ rg -c 'в schema.ts объявлены колонки' /tmp/qq5/logs/smoke_schema-column-parity.log   -> 19
$ rg -c 'в schema.ts объявлены колонки' /tmp/rev-QQ5-smoke_schema-column-parity.log    -> 19
```

Досье выписало последние 8 строк вывода. Причина видна в его же инструменте: `extract.sh`
печатает `tail -n "${TAILN:-14}"`, и в досье ушёл ровно хвост, а не лог.

Одиннадцать потерянных таблиц, каждая ломает все запросы к себе:

```
advance_deposit_taggings      tagged_target_name
cancellation_reasons_two_level reason_code
communication_outbox          campaign_id, dedupe_key, locked_at, recipient_address
communication_settings        block_marketing_in_quiet_hours, channel_fallback_json,
                              defer_service_in_quiet_hours, quiet_hours_start_minute, timezone
crm_email_dispatch_logs       document_title
dadata_geocoded_addresses     geo_lat
extended_odontogram_states    mobility_degree, pediatric_crown_present
migration_entity_links        source_entity_id, source_system, target_entity_id
migration_quarantine_records  blocking, field_path, message, staging_record_id, suggested_fix
migration_reconciliations     balanced, checks_json, entity_breakdown_json, source_money_total_rub
migration_runs                detected_encoding, dry_run, llm_calls, mapping_json,
                              source_fingerprint, source_name, source_rows, vendor_profile
```

`communication_outbox` и `communication_settings` — те самые таблицы, по которым кампания сейчас
работает над телеграм-очередью. Планировать пакет по «8 таблиц» значит не увидеть их.
И «худшая — `migration_staging_records` с 8» неверно: у `migration_runs` тоже 8, это ничья.

### 2.3 Раздел «честные границы» занижает собственную неуверенность: 11 против 16

§8: «Пометка `≈` стоит у **11** гейтов». Пересчёт по таблицам:

```
APPROX_UNIQUE= 16   CHECK_UNIQUE= 45   45+16 = 61
['billing-document-link','core-route-validation','import-contracts','patient-create-contract',
 'patient-forms-lifecycle','settings-persistence-file','speech-clinical-scope','speech-provider-errors',
 'tax-payment-explicit-payer','telegram-outbox-persistence','visit-workflow-forms-lifecycle',
 'wave10','wave11','wave12','wave6','wave7']
```

Ошибка направлена в сторону «проверено больше, чем на самом деле» — худшее направление именно
для раздела о границах. Шесть из семи гейтов из §2.1 сидят в этом списке: пакет знал, что не
смотрел их, и всё равно посчитал их в твёрдое число 26.

### 2.4 Код 127 назван, но не объяснён — а это не «команда не найдена»

Пять волновых гейтов вышли с 127, и в bash это обычно «command not found», то есть повод решить,
что гейт не запускался. Он запускался. В логах:

```
❌ WAVE 6 SUITE FAILED: 200 valid org: expected 200 got 404
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 76
```

Это жёсткий abort libuv на выходе node: собственный код провала гейта затирается кодом падения
рантайма. Досье пишет «127» без разбора. Само это — отдельный дефект пяти волновых скриптов
(незакрытые хендлы), и он маскирует любой их будущий exit-код.

### 2.5 Мелочи, не влияющие на вердикт, но их надо знать

* `104` `.sql` в папке → сейчас **105**: `0147_treatment_plan_items_organization_not_null.sql`
  создан в 14:27, коммит пакета в 14:25. Это дрейф, не ошибка, и он усиливает §6: новый файл
  в журнал тоже не попал.
* `SettingsAiTab.tsx:266` → фактически `:304`; `useAppLogic.tsx:12876` → фактически `:12896`.
  Первое переписано из вывода стража (устарел страж), второе — дрейф правок других агентов.
  Существо в обоих случаях подтверждено: `aria-pressed|aria-selected` в `SettingsAiTab.tsx` — 0.
* В возвращённом CLAIM указано `.gitignore:117 **/__bite*`. На 117 комментарий; шаблон
  `**/__*bite*` — на 125. В коммит эта ссылка не попала.

---

## 3. ЧТО ИМЕННО НАДО ПОПРАВИТЬ (узко, без нового прогона гейтов)

1. Перечитать **полные** логи, не хвосты, для четырёх гейтов, где вывод длиннее 14 строк, начиная
   со `schema-column-parity`; заменить «8 таблиц» на 19 и дописать 11 таблиц.
2. Переклассифицировать семь гейтов из §2.1 из `NEEDS_ENV:db-seed` в `BROKEN`/REAL по чтению
   скрипта; снять `✔` с `document-route-validation`.
3. Пересчитать `NEEDS_ENV` (≈19) и «среда не перекрасит» (≈42) и **исправить сообщение коммита**
   отдельной поправкой — число 26 уже в постоянном тексте.
4. Исправить §8: `≈` у 16 гейтов, не у 11.
5. Дописать одной строкой, что 127 — это abort libuv, а не отсутствие команды.

Ни правки стражей, ни нового полного прогона не требуется: все данные уже лежат в
`C:\Users\Admin\AppData\Local\Temp\qq5\logs\`.

---

## FOUND

**F1. Число, за которым посылали пакет, завышено на семь гейтов — и оно уже в коммите.**
Семь из двенадцати «нужна посевная база» гейтов работают в процессе против
`apps/api/dist/sampleData.js` при `DENTAL_STATE_PERSISTENCE = "off"` и не имеют ни одной ссылки на
БД. `db:reset-seed` их не перекрасит. Настоящая цена слепоты ведущего — около 19 из 61, а не 26,
и «неисправимых средой» не 35, а ≈42. Ошибка оптимистична: следующая волна недооценит объём.

**F2. Галочка «проверено чтением продукта» стоит там, где чтения не было.**
`smoke:document-route-validation` помечен `NEEDS_ENV:db-seed ✔`. Его строка 6 —
`process.env.DENTAL_STATE_PERSISTENCE = "off"`, строка 25 монтирует `dist/sampleData.js`.
Класс опровергается файлом, объявленным прочитанным. Это тот же класс дефекта, что кампания уже
ловила семь раз: подпись о проверке вместо проверки.

**F3. Самый ценный REAL занижен в 2,4 раза, и виноват `tail` собственного инструмента.**
`smoke:schema-column-parity` печатает 19 таблиц с колонками, которых нет ни в одном DDL; досье
выписало 8 — ровно хвост, который показывал `extract.sh` с `tail -n 14`. Среди потерянных
одиннадцати — `communication_outbox` (4 колонки) и `communication_settings` (5), то есть таблицы
активной телеграм-темы кампании, и `migration_runs` с 8 колонками, который делит первое место
с `migration_staging_records`, объявленным «худшим». Любой `select()` по такой колонке падает
в рантайме — это 19 таблиц, до которых нельзя дотрагиваться, а не 8.

**F4. Раздел «честные границы» преувеличивает собственную честность.** Заявлено 11 гейтов
с пометкой «класс выведен, продукт не вскрывался», в таблицах их 16. Шесть из семи гейтов F1 —
в этом списке: пакет знал о своей неуверенности и всё равно сложил их в твёрдое число.

**F5. `exit 127` у пяти волновых гейтов — abort libuv, а не «команда не найдена».**
`Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 76` затирает
собственный код провала скрипта. Пять гейтов физически не способны вернуть осмысленный exit-код
— их результат читается только из текста лога. Любой конвейер, который смотрит на код возврата,
получает от них шум. Это отдельный дефект `test-edge-cases-wave{6,7,10,11,12}.mjs`.

**F6. Дыра «список путей, которых нет» шире названной в двенадцать раз.**
`scripts/smoke-db-runtime-contract.mjs` держит 12 захардкоженных `drizzle/*.sql`, и **12 из 12
не существуют**. Гейт умирает `ENOENT` на первом, на строке 8, до первого утверждения — остальные
одиннадцать не видны никому. Досье назвало один. Вместе с §6 досье (28 из 28 тегов журнала без
`.sql` на диске, при 105 `.sql` в папке — 105-й лёг в 14:27, через две минуты после коммита, и
в журнал тоже не попал) это значит: линия миграций проекта существует в трёх взаимно
противоречивых версиях — на диске, в журнале и в проверочном скрипте.

**F7. Чужие мутационные копии живут в исходниках прямо сейчас, и `.gitignore` их прячет.**
```
apps/web/src/components/settings/sources/__biteProbeAny.tsx      14:27
apps/web/src/components/settings/sources/__biteNewContract.tsx   14:26
apps/web/src/components/settings/sources/__biteOldAsAny.tsx      14:24
```
Не QQ5: он работал в `apps/api/dist/security/` и за собой убрал. Но шаблон `**/__*bite*`
(`.gitignore:125`) убирает их из `git status --porcelain`, поэтому обычная проверка «остатков нет»
их не видит — а `tsc` по `apps/web` видит. Результаты гейтов они пока не искажают: набор файлов
в `smoke-settings-view-source.mjs:83` задан явным списком имён, а не `readdirSync`. Owner
неизвестен; проверять `%TEMP%`-и `git status` для этого класса недостаточно, нужен
`fd -H -I '__*bite*' apps`.

---

## 4. ЧТО ОСТАЛОСЬ НЕПРОВЕРЕННЫМ МНОЮ

* 50 из 61 гейта я не перепрогонял — сверял по его логам, которые лежат на диске и совпали в тех
  11 случаях, где я прогонял сам. Расхождений между его логом и моим прогоном не нашлось ни одного.
* Классы `STALE`/`BRITTLE` я вскрыл по три из шести; остальные проверял только по тексту падения.
* Пять оставшихся `NEEDS_ENV:db-seed` (`chains`, `wave6/7/10/11`) на зависимость от БД я не
  разбирал до конца: `chains` подтверждён его собственной шапкой, волновые не имеют ни
  `sampleData`, ни `DATABASE_URL` в тексте и требуют отдельного разбора.
* `smoke:chains` не доигран ни им, ни мной — его 2 нарушения в `chainReconProof` и расхождение
  формул долга в `chainWeldProof` остаются незачтёнными. Досье это признаёт.

Ничего долгоживущего я не запускал и не оставил. Прогон 13 гейтов писал только в `/tmp`;
`apps/api/.data/*.json` менялись рантаймом api-модулей, как и у исполнителя, — я их не
трогал и не коммитил. Свою копию `apps/api/dist/security/__revbiteidentity.js` удалил.
