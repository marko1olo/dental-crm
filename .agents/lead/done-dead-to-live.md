# Мёртвые панели → живой расчёт. Итог исполнения

HEAD на момент отчёта: `983ab3eb9`.
Автор: исполнитель «dead-to-live». База: PostgreSQL 18, `127.0.0.1:5432/dental_crm`.
Задание: `.agents/lead/recon-dead-to-live.md` (5 цели).

## Что сделано, коммитами

| Коммит | Файлы | Суть |
|---|---|---|
| `731bb15b7` (был до меня, того же исполнения) | `apps/api/src/routes/patients.ts`, `services/patients/patientCommunicationLog.ts`, `tests/routes/patientCommunicationLog.test.ts` | Серверный расчёт журнала обращений по живой `communication_events` |
| `d2d4b4571` | `components/patients/PatientCommunicationTimelineWidget.tsx`, `components/crm/PatientCommunicationTimelinesWidget.tsx` | Экранная часть: живой журнал, одна реализация вместо двух копий |
| `ca584d1f1` | удалён `db/patientCommunicationTimelinesQuery.ts`; правки шапок `routes/odontogram.ts`, `services/patients/patientCommunicationLog.ts` | Снят модуль чтения мёртвой таблицы + ложная ссылка на него |
| `59c66ab83` | `components/patients/PatientCommunicationTimelineWidget.tsx`, новый `tests/patientCommunicationLogPanel.test.ts` | Панель посылала в раздел «Общение», которого нет; страж от возврата |
| `983ab3eb9` | `SettingsView.tsx`; удалены `components/system/SystemRamWatchdogsWidget.tsx`, `components/analytics/LostPatientsFiltersWidget.tsx` | Два холостых запроса при каждом открытии настроек, две панели-обманки |

Цель №1 (`fix`, высокая ценность) доведена до конца. Дополнительно закрыты цели
№2 и №5 (`delete`) — их панели к моему приходу уже были сняты с экранов другим
исполнителем, оставались файлы-приглашения «починить мёртвое».

## Разведку проверял, а не принимал на веру

Всё, что перечислено ниже, я сверил сам по файлам и по живой базе. Расхождений с
разбором не нашёл ни одного, но **обстановка изменилась** между разведкой и
исполнением, и это важнее:

- Цель №3 (`SingleSessionEnforcementsWidget`) — панель уже снята с ОБОИХ экранов
  коммитом `929b6d4ee` другого исполнителя. В `SettingsView.tsx:27` и
  `SettingsAccessTab.tsx:7` остались только объяснения. **Файл виджета я не
  тронул сознательно**: комментарий `SettingsView.tsx` прямо пишет «Файлы
  виджетов пока на месте — их снимает ведущий отдельным коммитом вместе с
  серверной частью». Долг ниже.
- Цель №4 (`FamilyRecommendationSourcesWidget`) — `MarketingView.tsx` в списке
  запрещённых мне файлов, снять монтаж я не могу. Не трогал.
- Цель №2 — панель `SystemRamWatchdogsWidget` к моему приходу уже была не
  смонтирована нигде; живой код, звавший `/api/system/ram-watchdogs`, оставался
  ровно один — `SettingsView.tsx`. Убран.
- `patient_communication_timelines`: колонки `patient_name text NOT NULL`,
  `patient_id` отсутствует — сверено по `schema.ts:2038-2047`. Писателя нет.
- `communication_events` (`schema.ts:633-646`): `patient_id uuid NOT NULL →
  patients.id`, `actor_user_id uuid → users.id`. Пять писателей на месте.
- Значения enum сверены по трём источникам сразу и совпадают до значения:
  `schema.ts:102/119-128/130` (pgEnum), `packages/shared/src/index.ts:876` и `:928`
  (zod), `Record<CommunicationChannel, …>` на экране. Канал добавят в схему и
  забудут про экран — сборка упадёт.
- `uis_call_speech_transcripts` связана `patient_phone text` — джойн по телефону
  не сделан. Кнопки записи на экране нет.

## ПРОВЕРЕНО живым запросом

**Маршрут отдаёт данные, а не пустоту, и число совпадает с базой.**
`node --import tsx --test src/tests/routes/patientCommunicationLog.test.ts` —
**10 из 10, ни один не пропущен** (то есть база была доступна и все проверки,
которым она нужна, реально выполнялись). Тест засевает 6 событий в живой
PostgreSQL (4 на карту, 1 соседней карте, 1 чужой клинике), поднимает Fastify с
настоящим `registerPatientRoutes` и читает маршрут; `log.totalEvents` сверяется с
прямым `select count(*)::int from communication_events where organization_id=…
and patient_id=…` — не с ожидаемым числом, а с базой. Порядок строк, `actorName`
как ФИО (а не uuid), `needsCallCount`, границы периода, `?limit=2` с
`truncated:true` и неизменным `totalEvents` — всё сверено.

**Ловушка Drizzle: напечатал `query.toSQL().sql`, как требовало задание.**

```
select "communication_events"."id", … , "users"."full_name"
from "communication_events"
left join "users" on "users"."id" = "communication_events"."actor_user_id"
where ("communication_events"."organization_id" = $1 and "communication_events"."patient_id" = $2)
order by "communication_events"."created_at" desc, "communication_events"."id" desc limit $3

select count(*)::int as "total_events",
 (count(*) filter (where "communication_events"."status" = 'needs_call'))::int as "needs_call_count",
 max("communication_events"."created_at") filter (where "communication_events"."status" = 'needs_call') as "last_needs_call_at",
 min("communication_events"."created_at") as "first_event_at",
 max("communication_events"."created_at") as "last_event_at"
from "communication_events" where (… = $1 and … = $2)
```

Ни одного голого имени колонки: каждое квалифицировано таблицей. `a.patient_id =
a.id` невозможно. Это же закреплено тестом по тексту запроса, а не глазами.

**Изоляция.** Чужая клиника по карте этой клиники получает `404 PatientNotFound`,
а не пустой журнал; переписка соседней карты в журнал не попадает; без токена
кабинета — `401`.

**Живые числа в базе (замер до и после, `select count(*)`).**

| Таблица | Строк |
|---|---|
| `communication_events` | **0** |
| `patient_communication_timelines` | 0 |
| `system_ram_watchdogs` | 0 |
| `lost_patients_filters` | 0 |
| `patient_duplicate_merge_queues` | 0 |
| `single_session_enforcements` | 0 |
| `patients` | 17 |
| `organizations` | 2 |

Честно: **у этой базы `communication_events` пуста**, мессенджеры и телефония к
ней не подключены. Значит после правки панель на этой базе будет пустой — но по
честной причине и с честным текстом («Обращений через систему не записано…»), а
не потому что читается таблица без писателя. Замер после прогона тестов
показывает 0: тест убрал за собой.

**Страж экрана падает на дефекте, а не просто зелёный.** Подменил имя раздела в
панели на «Обращения» — `tests/patientCommunicationLogPanel.test.ts` упал с
текстом «панель отправляет в раздел «Обращения», а в реестре
workspaceShell.viewLabels он называется «Связь»». Вернул «Связь» — 4/4 зелёные.

**Гейты.**

- `cd apps/api && npx tsc --noEmit` — **0 ошибок** (три ошибки в
  `documents/renderDocument.ts`, которые были при старте, закрыл другой
  исполнитель коммитом `377bc0f13`).
- `cd apps/web && npx tsc --noEmit` — **0 ошибок**. При старте было 10, все в
  чужих файлах (незавершённая правка контракта `PanelSubject`); к концу работы
  чужой исполнитель их закрыл. Ни на одном прогоне моих файлов в списке не было.
- `npm run check:encoding` — 2108 файлов, замечаний нет. Мохибаке нет.
- Web-тесты: `__tests__/clinicModeSurface`, `tests/operationsPanelsStyling`,
  `tests/panelsAreMounted`, `tests/patientCommunicationLogPanel` — **31/31**.
- `apps/api/src/tests/webCallsExistingRoutes.test.ts`: «нет новых
  несуществующих адресов» и «список долга не растёт» — зелёные. Третья проверка
  красная, но не из-за меня, см. блокировку ниже.

## НЕ ПРОВЕРЕНО

- **Ни один экран в браузере не открывался. Скриншотов нет.** Всё экранное —
  статическая сверка исходника плюс текстовые стражи. Как выглядит панель с
  живыми данными, я не видел. На этой базе увидеть её непустой нельзя вовсе:
  `communication_events` пуста.
- **Маршрут не вызывался по настоящему HTTP** (curl / браузер). Вызов шёл через
  `app.inject` — тот же обработчик, тот же Fastify, та же живая база, но без
  сетевого уровня, без прокси Vite и без глобальной обёртки `lib/apiAuthFetch.ts`,
  которая в браузере подставляет токен кабинета. Что заголовок доходит именно из
  браузера — не доказано.
- **`?limit=` из интерфейса не передаётся**: панель зовёт адрес без параметра и
  получает 100 последних. Ветка `truncated` на экране, следовательно, ни разу не
  показывалась вживую — она проверена только на сервере (`?limit=2` в тесте).
- Тёмная тема панели не смотрена глазами: классы `dark:` расставлены, но
  контраст не измерен.
- Полный прогон `npm test` в `apps/api` и `apps/web` я не делал: база одна на
  всех исполнителей, и параллельный прогон чужих тестов с записью в неё —
  известный способ испортить чужой замер. Гонял только свои файлы плюс те, что
  могли пострадать от моих правок.
- Миграции не читал целиком. `0096_add_system_ram_watchdogs.sql` и
  `0118_align_tables_with_schema.sql` открывал ровно затем, чтобы убедиться, что
  имена колонок `system_ram_watchdogs` в схеме и в виджете не совпадают.

## Долги, с причиной

1. **Журнал обращений всё ещё смонтирован ДВА раза на экране «Пациенты».**
   `PatientOverviewTab.tsx:161` внутри карточки и `PatientsView.tsx:600` в
   нижней сетке. Разбор требовал оставить одну панель; вторая реализация
   устранена (обёртка переиспользует единственную), но **лишний монтаж снять
   нельзя: `apps/web/src/PatientsView.tsx` занят** — там прямо сейчас чужая
   незакоммиченная правка (вынос `PatientAdministrativeForm`, класс
   `patient-empty-state`). Снять — одна строка: убрать
   `<PatientCommunicationTimelinesWidget patientId={selectedPatientId} />` из
   `.patients-widgets-grid` вместе с импортом. Мелкой клинике один журнал дважды
   не нужен.
2. **`SingleSessionEnforcementsWidget.tsx` жив как файл, и это опаснее пустоты.**
   Панель снята с обоих экранов, но файл печатает на экран
   `Токен сессии: {sess.activeSessionToken}` (строка 80), а таблица
   `single_session_enforcements` спроектирована с колонкой
   `active_session_token text NOT NULL`. Допишет кто-нибудь писателя «как
   задумано» — клиника получит хранение действующих токенов открытым текстом плюс
   вывод их в браузер любому, кто откроет настройки: угон сессии через плечо. Не
   тронул умышленно: комментарий `SettingsView.tsx` резервирует снятие файла за
   ведущим вместе с серверной частью. **Писателя к таблице в текущем виде
   добавлять нельзя ни при каких условиях.** Нужное серверное поведение
   (`routes/auth.ts`): реестр активных сессий с ХЭШЕМ токена, IP, user-agent и
   `last_active_at`, вытеснение предыдущей при новом входе. Сейчас в
   `audit_events` нет ни IP, ни user-agent, ни отметки активности
   (`schema.ts:828-841`), поэтому «два входа за день» ≠ «две параллельные
   сессии», и показывать это как параллельные сессии — выдуманная цифра, по
   которой будут подозревать сотрудника.
3. **Роут `/api/analytics/lost-patients-filters` (`routes/clinical.ts:447`) остался
   без вызывающих**, как и таблица `lost_patients_filters`. Снимать согласованно
   с исполнителем, который держит `clinical.ts` (файл в моём запретном списке).
4. **Список известного долга в `webCallsExistingRoutes.test.ts` устарел на две
   строки** — `/api/system/ram-watchdogs` и
   `/api/crm/patient-duplicate-merge-queues` больше не зовёт никто. По
   собственному правилу того файла («адрес, которого никто не зовёт, — не долг, а
   мусор в списке») их надо убрать, уменьшив на 2 порог в проверке «список не
   разрастается» (сейчас `<= 24`). Файл в моём запретном списке, не тронул.
   Проверка от этого не краснеет — она смотрит только вверх.
5. **Четыре генератора снимков-доказательств ссылаются на удалённые панели.**
   `scripts/generate-wave13-individual-proofs.cjs:12`
   (`system-ram-watchdogs-widget`), `generate-wave12-individual-proofs.cjs:8`
   (`lost-patients-filters-widget`), `generate-real-layout-proofs.cjs:28`
   (`system-ram-watchdog-indicator` — врезка настроек, тоже убрана),
   `generate-wave8-individual-proofs.cjs:106` (там `single-session-enforcements-widget`
   вообще вписан ИНЛАЙНОВОЙ HTML-разметкой внутри самого скрипта, то есть скрипт
   «доказывает» панель, рисуя её сам — это отдельная находка про качество
   доказательств в проекте, и она не про мою задачу). Не правил: это исторические
   скрипты, четыре файла вне моей задачи.
6. **Таблицы `patient_communication_timelines`, `system_ram_watchdogs`,
   `lost_patients_filters` остались в `db/schema.ts`** без единого читателя и
   писателя. `schema.ts` в моём запретном списке.
7. **Панель отправляет в раздел «Связь» дублированной строкой, а не через
   `viewLabels`.** Импортировать `viewLabels` из `workspaceShell.tsx` в лист-виджет
   карточки нельзя — тот модуль тянет контекст рабочего места и соседние виджеты,
   получился бы новый цикл зависимостей (в `apps/web/src` их 107 из 116 по замеру
   `AGENTS.md` п.11). Правильное решение — вынести реестр подписей разделов в
   лёгкий модуль без React, тогда дублирование уйдёт. Пока расхождение держит
   тест `tests/patientCommunicationLogPanel.test.ts`.

## Блокировка (не моя, но ведущему надо знать)

`apps/api/src/tests/webCallsExistingRoutes.test.ts` **красный**: проверка
«починенные адреса удаляются из списка долга» падает на `/api/billing/payouts`.
Причина — коммит `5d9d9b4d5` «feat(зарплата): выплаты врачам считались в тетради»
другого исполнителя: маршрут добавлен, строка из `KNOWN_MISSING` не убрана. К моим
правкам отношения не имеет (проверка смотрит только на существование маршрутов на
сервере, а я удалял вызывающих на клиенте). Файл в моём запретном списке — чинить
тому, кто добавлял маршрут.

## Что теперь на экране, словами

Карточка пациента, панель «Звонки и сообщения»:

- заголовок строки собирается из канала и направления — «Входящий звонок»,
  «Отправлено SMS», «Сообщение в Telegram», «Разговор в клинике»;
- цвет — это статус, а не поле `status_color`, которое никто не заполнял;
- `needs_call` вынесен плашкой ВЫШЕ списка: «машина отправить не смогла,
  позвоните руками» — единственное место на карточке, где такие задачи видны;
- счётчик обращений печатается только вместе с периодом, согласование числа с
  существительным по правилу языка (на 22 было бы «22 обращений»);
- пустое состояние ограничивает утверждение каналом и прямо говорит, что звонок с
  личного телефона врача сюда не попадает;
- отказ сервера показывается отказом; ответ неизвестной формы — тоже отказ, а не
  пустой журнал;
- отсутствие карты пациента — `404` с человеческим текстом, нечитаемый
  идентификатор в адресе — «Пациент не выбран», а не ошибка разбора типа uuid из
  PostgreSQL.
