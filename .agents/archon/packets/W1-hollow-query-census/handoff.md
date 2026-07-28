# W1-hollow-query-census — сдача

HEAD: a7b0b2706b04a2bacbf7f9aa1ff3fb79d6e93d45
HEAD на старте: e75df11857f4e2e7202bb4e7ffa557c487147720 (за время работы второй автор
вклинился минимум трижды; каждый коммит делался с явным pathspec, чужого не захвачено)

## ЧИСЛО, КОТОРОЕ БЫЛО НЕВЕРНЫМ

Пакет утверждал: 50 модулей, наивная перепись даёт 45 пустотелых.
Измерено: **42 модуля, из них 24 пустотелых.** Не 45 и не 50.

Наивный `db.insert(<имя модуля>` врёт потому, что имя файла и имя таблицы совпадают не
всегда. `auditQuery.ts` пишет в `auditEvents` и делает настоящие вставки — по имени он
попадал в мёртвые. `.agents/DATABASE.md` правило 4 говорит «примерно 65»; это тоже было
верно когда-то, но не сегодня.

Разбивка на старте (42 модуля):
  ПУСТОТЕЛЫЙ 24 | СМЕШАННЫЙ 2 | ЖИВОЙ 14 | ЖИВОЙ (СЫРОЙ SQL) 1 | БЕЗ ТАБЛИЦ 1
После работы (23 модуля):
  ПУСТОТЕЛЫЙ  5 | СМЕШАННЫЙ 2 | ЖИВОЙ 14 | ЖИВОЙ (СЫРОЙ SQL) 1 | БЕЗ ТАБЛИЦ 1

## Что было сломано (file:line)

- `apps/api/src/routes/clinical.ts:173-523` (в версии e75df1185) — 19 маршрутов
  «COMPETITOR FEATURE #N», каждый динамически подгружал модуль над таблицей без единого
  писателя и мог вернуть только `[]`. 29 маршрутов в файле, из них 14 мёртвых.
- 24 модуля `apps/api/src/db/*Query.ts` — SELECT по таблицам, в которые приложение не
  пишет нигде. Подтверждено живой базой: у всех 24 таблиц **0 строк**.
- `apps/web/src/components/crm/BulkImageOperationLogsWidget.tsx:27` — звал
  `/api/crm/bulk-image-operation-logs`, которого нет ни в одном файле routes/. Ответ 404
  превращался в пустой список: пользователь видел не ошибку, а аккуратную пустую панель.
- `apps/web/src/DocumentsView.tsx:5095-5101` — сетка из трёх панелей плана лечения,
  каждая с текстом «отсутствуют» навсегда.
- `apps/web/src/ShiftView.tsx:433-445` — `UrgentScheduleRequestsWidget` держал на себе
  заголовок раздела «Операционный контроль смены» и кнопку «Показать аналитику»
  (headerExtra). Именно это делало прямое удаление ломающим — и, вероятно, потому блок и
  дожил до сегодня.
- `apps/api/src/db/clinicalTasksQuery.ts:21` — ссылка на `patientServiceLineagesQuery.ts`
  как на образец приёма; модуль удалён, ссылка стала висячей.

## Что изменено

Семь коммитов, каждый закрыт целиком (модуль + маршрут + виджет + место монтирования):

| хеш | что |
|---|---|
| `2ff49559b` | перепись `scripts/census-hollow-query-modules.mjs` + её тест |
| `29a59a80d` | 6 маршрутов без потребителя + 9 модулей |
| `7821bef70` | план лечения: 3 модуля, 3 маршрута, 3 виджета, сетка в DocumentsView |
| `6bb2bb0ab` | расписание: броня кресла и причины отмены — 2 модуля, 2 маршрута, 2 виджета |
| `908be0f54` | «Острая боль»: модуль, маршрут, виджет + заголовок раздела переписан в ShiftView |
| `93a2f1803` | пациенты: 2 модуля, 1 маршрут, 2 виджета + строка долга и её порог |
| `a7b0b2706` | отчёт подтверждений: модуль, маршрут, виджет на трёх экранах + familyRecommendationSources |

Итого удалено: **19 модулей** `db/*Query.ts` (42 → 23), **14 маршрутов** в clinical.ts
(29 → 15, файл 527 → 444 строки), **9 виджетов**.

Инструмент разбирает дерево, а не текст: импорты схемы с разыменованием `as` и
`import * as schema`, `.from()/.insert()` с любым приёмником (`db`, `tx`, `trx`,
параметр), сырой SQL из литералов, наполнение из миграций, и **динамический
`await import()`**. Писатели разделены на рабочий код / тест / скрипт / миграцию.

## ПРОВЕРЕНО

- **DB VERIFIED** `node scripts/census-hollow-query-modules.mjs --db`, код возврата 0.
  Все 24 пустотелые таблицы: `писателей в рабочем коде: 0; строк в живой базе: 0`.
  Читает только `select count(*)` по именам из schema.ts.
- **API VERIFIED** живой сервер 127.0.0.1:4100, `/api/health` = 200.
  Удалённые маршруты дают **404**: `analytics/confirmation-performance-reports`,
  `schedule/urgent-schedule-requests`, `documents/treatment-plan-stages`,
  `schedule/time-reservations`, `crm/patient-service-lineages`,
  `documents/alternative-treatment-plans`, `communications/uis-omni-messenger-queues`.
  Сохранённые маршруты дают **401** (обработчик есть, нужен вход):
  `hr/recent-patients`, `analytics/lost-patients-filters`, `clinical/tasks`,
  `crm/custom-task-types` — последний лежит в том же clinical.ts, то есть файл не
  разрушен. Заголовок ответа 404 приведён в отчёте.
- **UNIT VERIFIED** `node --import tsx --test scripts/census-hollow-query-modules.test.mjs`
  — 6 тестов, pass 6, fail 0, код возврата 0. Проверяет три места, где перепись уже
  давала ложь: имя файла ≠ имя таблицы (auditQuery жив), динамический импорт считается
  потребителем, «пустотелый» означает ноль писателей у каждой читаемой таблицы.
- **UNIT VERIFIED** `node --import tsx --test apps/api/src/tests/webCallsExistingRoutes.test.ts`
  — 3 теста, pass 3, fail 0, код 0, после каждого удаления маршрутов. Интерфейс не зовёт
  ни одного удалённого адреса.
- **UNIT VERIFIED** `node --import tsx --test apps/api/src/services/clinical/ClinicalRouter.test.ts`
  — 5 тестов, pass 5, fail 0 (clinicalTasksQuery правился комментарием).
- **SMOKE VERIFIED** `npm run smoke:web-text-encoding` — `ok: true`, checkedFiles 416,
  mojibakeHits 0, garbledQuestionHits 0.
- **SMOKE VERIFIED** `node scripts/check-css-tokens.mjs` — 0 неразрешимых имён var().
  Новый заголовок в ShiftView использует `--teal-soft/--teal-dark/--ink/--ink-2`,
  переопределённые для светлой и тёмной темы (dente-redesign.css:23-24 и 78-79).
- `git grep -n "<BaseName>" HEAD -- apps/api/src apps/web/src` по всем 19 модулям и 9
  виджетам: живых ссылок ноль. Три совпадения — текст внутри
  поясняющих комментариев `/* */`, проверено контекстом.

## НЕ ПРОВЕРЕНО

- **Поведенческий гейт маршрутов не запускался.** `node scripts/smoke-clinical-mutation-guard.mjs`
  отказался: «СБОРКА УСТАРЕЛА… Соберите API и повторите: npm run build -w @dental/api»,
  код возврата 1, устаревшими названы `db/clinicalTasksQuery.ts` и `routes/clinical.ts`.
  Сборка — гейт ведущего (§7a), я её не брал.
  ЗАКРЫВАЕТСЯ: `npm run build -w @dental/api && node scripts/smoke-clinical-mutation-guard.mjs`
- **TYPECHECK НЕ ЗАПУСКАЛСЯ ни на одном воркспейсе** — общий гейт, принадлежит ведущему.
  Мой сигнал — единичные файлы node:test, они компилируются через tsx и прошли.
  ЗАКРЫВАЕТСЯ: `npm run typecheck -w @dental/api` и `npm run typecheck -w @dental/web`
- Экраны глазами не видел. UI VERIFIED заявить не могу и не заявляю.
  ЗАКРЫВАЕТСЯ ведущим: «Документы» (низ страницы), «Расписание» (блок виджетов),
  «Смена» (раздел «Операционный контроль смены», кнопка «Показать аналитику»),
  «Пациенты» (сетка виджетов), «Аналитика» (низ страницы).

## Коммит

7 штук, хеши выше. HEAD = `a7b0b2706b04a2bacbf7f9aa1ff3fb79d6e93d45`.
В каждом только мои файлы; `git diff --cached --name-only` проверялся перед каждым.
Чужого в индексе не подобрано, чужого не сброшено.

## Долг

**Пять пустотелых модулей НЕ тронуты — их виджеты живут в файлах второго автора:**

| модуль | виджет смонтирован в |
|---|---|
| `singleSessionEnforcementsQuery` | `components/settings/SettingsAccessTab.tsx`, `SettingsView.tsx` |
| `dadataGeocodedAddressesQuery` | `SettingsView.tsx` (и второй маршрут-дубль `/api/integrations/dadata-addresses`) |
| `landingFieldMappingsQuery` | `MarketingView.tsx` |
| `rebookingConversionRulesQuery` | `MarketingView.tsx`, `pages/AnalyticsDashboardView.tsx` |
| `customCrmTaskTypesQuery` | `MarketingView.tsx`, `components/settings/SettingsRulesTab.tsx` (и дубль `/api/crm/custom-crm-task-types`) |

Все пять: писателей 0, строк в живой базе 0. Удаляются тем же порядком, что и остальные
девять, когда `SettingsView.tsx` / `components/settings/**` / `MarketingView.tsx`
освободятся. `FamilyRecommendationSourcesWidget.tsx` остался на экране в MarketingView и
получает 404 — его модуль уже удалён.

**Два дублирующих маршрута** над одной таблицей: `/api/crm/custom-task-types` и
`/api/crm/custom-crm-task-types`; `/api/integrations/dadata-addresses` и
`/api/integrations/dadata-geocoded-addresses`. Уйдут вместе с модулями.

**`/api/egisz/multiple-diagnoses`** (`routes/egisz.ts:163`) читает
`egisz_multiple_diagnoses` напрямую, минуя модуль. Модуль удалён, маршрут остался и
вернёт только пустоту. Не тронут намеренно: удаление адреса из модуля ЕГИСЗ — решение
ведущего.

**`ExternalScheduleActionLogsWidget`** (`ScheduleView.tsx`) звал
`/api/schedule/external-schedule-action-logs`, которого нет — строка в KNOWN_MISSING.
Своего `*Query.ts` у него нет, поэтому в мою перепись он не попал. Тот же класс дефекта.

**СМЕШАННЫЕ, требуют решения, а не удаления:**
`lostPatientsFiltersQuery` строит ответ из `patients` с зашитым
`daysSinceLastVisit: 90` — выдуманное число, а не срок последнего визита. Файл уже
восстанавливали после неудачного удаления, я его не касался.
`patientCommunicationTimelinesQuery` — та же схема.

**Поправки к досье и авторитетным файлам:**
1. `.agents/AGENTS.md` §8 и §8a предписывают `npx @ast-grep/cli`. **Его здесь нет:**
   `npx --yes @ast-grep/cli --version` → код 1, «could not determine executable to run».
   Перепись сделана компилятором TypeScript 5.9.3 из node_modules.
2. `.agents/DATABASE.md` правило 4: «примерно 65 модулей». На старте было 42, сейчас 23.
3. `RECON_DOSSIER.md:268` «42 таких файла виджетов; db/*Query.ts = 65 модулей; страж
   говорит, что 50 несли этот признак» — все три числа устарели.
4. **Ловушка для следующего агента:** в Git Bash на Windows любой аргумент, начинающийся
   с `/`, MSYS переписывает в путь Windows. `rg "/api/egisz/multiple-diagnoses"` вернул
   «нет совпадений» по маршруту, который существует. Ложное «потребителей нет» — прямая
   дорога к сломанному HEAD. Искать без ведущей косой черты либо инструментом Grep.
