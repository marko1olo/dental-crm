# Разведка: виджеты над таблицами без писателя

Дата: 2026-07-28. Ветка на момент разбора: HEAD `676afd40fd822f8d4bde690ae9aff3054fa18e25`.
Код не правился — только чтение. Файлы чужих зон (`clinical.ts`, `schema.ts`,
`PatientReclamationsWidget.tsx`, `PatientTaskTicketsWidget.tsx`,
`PatientArchiveAndBlacklistWidget.tsx`, `MarketingView.tsx`,
`AnalyticsDashboardView.tsx`) читались, не изменялись.

## Как считалось

1. `fd -e tsx --glob '*Widget*.tsx' apps/web/src` — 19 файлов.
2. Для каждого выдран адрес запроса, затем адрес искался в `apps/api/src/routes/**`.
3. Писатель искался по всему `apps/api/src` (включая `await import(...)`, сервисы и
   сырой SQL) как `insert(<table>)` / `update(<table>)` / `INSERT INTO <table>`.

**Перепись писателей.** В `apps/api/src` (без тестов) `db.insert` вызывается по
**63 разным таблицам** из **122 объявленных** в `apps/api/src/db/schema.ts`. То есть
почти половина схемы — таблицы, куда никто никогда не пишет. Ни одного писателя нет
у таблиц: `custom_crm_task_types`, `landing_field_mappings`, `lost_patients_filters`,
`dadata_geocoded_addresses`, `single_session_enforcements`, `system_ram_watchdogs`,
`patient_duplicate_merge_queues`, `egisz_blank_permissions`,
`family_recommendation_sources`, `patient_communication_timelines`,
`yandex_calendar_syncs`. Единственная таблица из этого списка, у которой писатель
нашёлся, — `patient_archive_reasons_and_blacklists`
(`apps/api/src/db/patientArchiveReasonsAndBlacklistsQuery.ts:68`), и она уже в работе
у другого исполнителя.

**Уже сделанный образец, на который опираются выводы ниже.**
`apps/web/src/components/crm/PatientDuplicateMergeQueuesWidget.tsx:10` — виджет
переведён с мёртвой таблицы `patient_duplicate_merge_queues` на живой расчёт
`/api/patients/duplicates`. Тот же приём применён к «потерянным пациентам»:
`apps/api/src/services/patients/recallCandidates.ts:16` — «РЕШЕНИЕ ТО ЖЕ, ЧТО С
ДУБЛЯМИ: считать по текущим данным, а не хранить снимок». Разбор №1 ниже — третий
случай того же типа, и он самый дорогой из оставшихся.

---

## 1. Лента звонков и сообщений пациента — ВЕРДИКТ: FIX

**Файлы (два виджета, одна мёртвая таблица, два экрана):**
- `apps/web/src/components/patients/PatientCommunicationTimelineWidget.tsx:82` —
  смонтирован в `apps/web/src/components/patients/PatientOverviewTab.tsx:161`
- `apps/web/src/components/crm/PatientCommunicationTimelinesWidget.tsx:93` —
  смонтирован в `apps/web/src/PatientsView.tsx:679`

Это почти дословные дубликаты: одинаковый интерфейс строки (`patientName`,
`eventType`, `statusColor`, `audioRecordingUrl`, `comment`, `createdAt`), один и тот
же адрес, одинаковые словари подписей. Обе панели врут одновременно, на двух разных
экранах карточки пациента.

### Чем доказано, что таблица мертва

- Адрес живой: `apps/api/src/routes/patients.ts:341`
  `GET /api/patients/:patientId/communication-timelines`.
- Чтение: `apps/api/src/db/patientCommunicationTimelinesQuery.ts:33-43`.
- Писателя нет: `insert(patientCommunicationTimelines)` / `INSERT INTO
  patient_communication_timelines` не встречается в `apps/api/src` нигде. Таблица
  упомянута ровно в трёх местах: объявление схемы, этот query-модуль и роут.

### Второй дефект, хуже первого: связь выдумана

`patient_communication_timelines` (`apps/api/src/db/schema.ts:2038-2047`) **не имеет
колонки `patient_id` вообще.** Есть `patient_name text NOT NULL`. Поэтому фильтр
пациента сделан сравнением строк:

```
apps/api/src/db/patientCommunicationTimelinesQuery.ts:40
eq(patientCommunicationTimelines.patientName, patientName)
```

Следствие, если кто-нибудь всё же начнёт писать в эту таблицу: два «Иванова Ивана
Ивановича» получат общую историю звонков, а любая правка ФИО (замужество, опечатка,
смена паспорта) молча оторвёт всю переписку от карточки. Это ровно тот дефект,
который уже ловили на соседней таблице — см. `apps/api/src/routes/patients.ts:154-168`
про архив и чёрный список: там связь по имени оставлена **только** для строк без
`patient_id`, а здесь `patient_id` нет физически, то есть отступать некуда.

### Нужна ли клинике эта информация

Да, и это одна из самых частых операций регистратуры: «мы ему звонили? он ответил?
предупредили о переносе?». Сейчас на оба вопроса экран отвечает «Записи звонков и
сообщений с пациентом отсутствуют» (`PatientCommunicationTimelineWidget.tsx:126`) —
администратор звонит второй раз, либо не звонит вовсе, считая, что коллега уже
отработал.

### Живой источник существует и связан по uuid

`communication_events` (`apps/api/src/db/schema.ts:633-646`) — **пять реальных
писателей, пять каналов:**

| Писатель | Что пишет |
|---|---|
| `apps/api/src/routes/communications.ts:43` | переходы статуса задачи на связь |
| `apps/api/src/services/messengerIngestion.ts:348` | входящие из мессенджеров |
| `apps/api/src/routes/telephony.ts:168` | входящие SMS |
| `apps/api/src/routes/vk.ts:84` | ВКонтакте |
| `apps/api/src/routes/whatsapp.ts:548` | WhatsApp |

Колонки (прочитаны в `schema.ts`, не угаданы):

- `id uuid` PK
- `organization_id uuid NOT NULL` → `organizations.id`
- `patient_id uuid NOT NULL` → `patients.id` — **настоящая ссылка, не имя**
- `actor_user_id uuid` → `users.id` — кто из сотрудников
- `task_id uuid` → `communication_tasks.id`
- `channel communication_channel NOT NULL` — значения: `phone`, `sms`, `whatsapp`,
  `telegram`, `email`, `in_person`, `vk`, `max` (`schema.ts:102`)
- `direction communication_direction NOT NULL` — `inbound`, `outbound`
  (`schema.ts:130`)
- `status communication_status NOT NULL` — `queued`, `scheduled`, `needs_call`,
  `sent`, `delivered`, `completed`, `failed`, `skipped` (`schema.ts:119-128`)
- `message text NOT NULL`
- `created_at timestamptz NOT NULL DEFAULT now()`

### Расчёт

```sql
SELECT ce.id,
       ce.channel,
       ce.direction,
       ce.status,
       ce.message,
       ce.created_at,
       u.full_name AS actor_name
FROM communication_events ce
LEFT JOIN users u ON u.id = ce.actor_user_id
WHERE ce.organization_id = :orgId
  AND ce.patient_id = :patientId
ORDER BY ce.created_at DESC
LIMIT 100;
```

Пациент проверяется до выборки — так же, как это уже сделано для архива в
`apps/api/src/routes/patients.ts:378-379`: нет пациента → 404, а не пустой список.
Чужой или удалённый пациент и пациент без звонков — разные ответы.

### Что показываем на экране (без выдуманных полей)

- **Заголовок строки** = `direction` + `channel`, оба enum, поэтому подписи полные и
  не требуют «неизвестного» случая: `inbound`/`outbound` × `phone` → «Входящий
  звонок» / «Исходящий звонок»; `sms` → «Входящее SMS» / «Отправлено SMS»;
  `telegram`/`whatsapp`/`vk`/`max` → «Сообщение в Telegram» и т. д.; `email` →
  «Письмо»; `in_person` → «Разговор в клинике».
- **Цвет** = `status`, не отдельная колонка: `delivered`, `completed`, `sent` —
  зелёный; `queued`, `scheduled`, `needs_call` — жёлтый (ещё не доставлено);
  `failed` — красный; `skipped` — серый с подписью «не отправляли».
  `needs_call` обязан быть видимым: это «нужно позвонить руками», а сейчас такие
  задачи не видно нигде на карточке.
- **Текст** = `message`. **Автор** = `actor_name`, при `NULL` — «автоматически».
- **Кнопку «Прослушать запись» убрать.** В `communication_events` поля с записью
  разговора нет. Единственная таблица с записями —
  `uis_call_speech_transcripts` (`schema.ts:2061`), но у неё нет писателя и связь там
  `patient_phone text`, а не `patient_id`. Джойнить ленту по телефону нельзя: у
  членов семьи телефон один. Записи разговоров — отдельный долг, не часть этой правки.

### Малая выборка и пустота

- Лента — журнал, а не показатель, порога выборки нет: одно событие показывается как
  одно событие.
- Ноль строк при успешном запросе — текст обязан ограничить утверждение каналом, а не
  отрицать общение: «Обращений через систему не записано. Здесь появляются SMS,
  сообщения в Telegram, WhatsApp, ВКонтакте и звонки, прошедшие через клинику. Звонок
  с личного телефона врача сюда не попадает.» Формулировка «общения с пациентом не
  было» была бы новым враньём: таблица покрывает только подключённые каналы.
- Отказ сервера уже показан как отказ в обоих виджетах
  (`PatientCommunicationTimelineWidget.tsx:122`,
  `PatientCommunicationTimelinesWidget.tsx:134`) — эту часть менять не нужно.
- Счётчик «N обращений за 12 месяцев» — только вместе с периодом; голый «0» на
  карточке читается как «клинике всё равно», хотя канал может быть просто не подключён.

### Ещё одно требование правки

Оставить **одну** панель. Сейчас на карточке пациента две (`PatientOverviewTab.tsx:161`
и `PatientsView.tsx:679`), обе про звонки и сообщения. Маленькой клинике не нужно
видеть один и тот же журнал дважды.

---

## 2. Watchdog ОЗУ рабочих мест — ВЕРДИКТ: DELETE

**Файл:** `apps/web/src/components/system/SystemRamWatchdogsWidget.tsx`,
смонтирован в `apps/web/src/SettingsView.tsx:1565`.
Второй мёртвый вызов того же адреса: `apps/web/src/SettingsView.tsx:1287`.

Сломано на четырёх уровнях сразу:

1. **Адреса нет.** `/api/system/ram-watchdogs` не зарегистрирован ни в одном роуте;
   он числится в списке несуществующих в
   `apps/api/src/tests/webCallsExistingRoutes.test.ts:68`.
2. **Писателя нет.** `system_ram_watchdogs` (`schema.ts:1780-1789`) упомянута ровно
   один раз во всём `apps/api/src` — в объявлении схемы.
3. **Поля выдуманы.** Виджет читает `clientHostName`, `usedRamMb`, `totalRamMb`,
   `warningLevel` (`SystemRamWatchdogsWidget.tsx:6-10`). В таблице колонки
   `heap_used_mb`, `heap_total_mb`, `rss_mb`, `external_mb`, `gc_count`. Ни одно имя
   не совпадает — даже с живым роутом экран остался бы пустым. Тот же дефект во
   врезке `SettingsView.tsx:1319`: она читает `primaryPatientName`,
   `duplicatePatientName`, `similarityScorePercent`, а в
   `patient_duplicate_merge_queues` (`schema.ts:1831-1841`) есть только
   `source_patient_id`, `target_patient_id`, `match_score`.
4. **Пустого состояния нет вообще.** `SystemRamWatchdogsWidget.tsx:51-70`: после
   загрузки рендерится `<div className="space-y-3">` со списком из нуля элементов.
   Пользователь видит заголовок «Системный Watchdog ОЗУ / Памяти Клиентских Рабочих
   Мест» и зелёную плашку **«RAM Watchdog Active»** над пустотой. Панель утверждает,
   что сторож памяти работает, при том что сторожа нет, адреса нет и данных нет.
   Это ложное успокоение про здоровье системы — хуже, чем отсутствие блока.

Дополнительно: 404 попадает в `.then((res) => res.json())` без проверки `res.ok`
(строка 20), то есть отказ неотличим от пустоты; и панель прибита к тёмной палитре
(`bg-slate-900 text-slate-100`, строка 34) в обход правила тем из `.agents/AGENTS.md`.

**Нужна ли информация клинике.** Нет. Телеметрия ОЗУ рабочих станций — это задача
системного администратора, а не стоматологии, и в CRM ей делать нечего. Даже как
сервисная функция она не реализована ни с одной стороны: нет агента-сборщика, нет
роута, нет писателя. Строить всё это ради строки «heap 512 MB» в настройках клиники
из трёх кресел — не та цена.

**Действие.** Удалить виджет, снять монтаж `SettingsView.tsx:1565`, удалить мёртвый
`fetch` и врезку `SettingsView.tsx:1287, 1311-1315`. Заодно уходит вторая пара
мёртвых запросов при каждом открытии настроек.

---

## 3. Контроль параллельных входов — ВЕРДИКТ: DEBT (и удалить панель)

**Файл:** `apps/web/src/components/settings/SingleSessionEnforcementsWidget.tsx`,
смонтирован дважды: `apps/web/src/SettingsView.tsx:1566` и
`apps/web/src/components/settings/SettingsAccessTab.tsx:214`.

Адрес живой (`GET /api/system/single-session-enforcements`, чужая зона
`apps/api/src/routes/clinical.ts:284`), но у таблицы
`single_session_enforcements` (`schema.ts:1356-1366`) писателя нет. Экран всегда
говорит «Активных параллельных сессий не обнаружено» — то есть утверждает, что
нарушений входа нет, ничего при этом не проверив.

**Потребность настоящая.** Один логин на всю смену — обычная практика мелких клиник,
и она означает, что подпись под медицинской записью не доказывает, кто её сделал.
Контроль тут нужен.

**Но живым расчётом это не закрывается, и я не буду делать вид, что закрывается.**

- Реестра сессий в схеме нет. Поиск `pgTable("...session...")` даёт только
  `imaging_viewer_sessions` (`schema.ts:963`, про просмотр снимков) и саму мёртвую
  `single_session_enforcements`. Токены не хранятся нигде.
- Входы **пишутся**: `apps/api/src/routes/auth.ts:162` → `action:
  "clinic_login_success"`, `auth.ts:226` → `"staff_unlock_success"`, оба в
  `audit_events`. Но `audit_events` (`schema.ts:828-841`) — это `actor_user_id`,
  `entity_type`, `entity_id`, `action`, `reason`, `created_at`. **Нет ни IP, ни
  user-agent, ни отметки активности.** По факту входа нельзя отличить «работает
  прямо сейчас со второго компьютера» от «заходил утром». Показать «два входа за
  день» как «две параллельные сессии» — выдуманная цифра, по которой будут
  подозревать сотрудника.
- `clinical_audit_logs` (`schema.ts:1792-1809`) IP и user-agent имеет, писатель есть
  (`apps/api/src/clinicalAuditService.ts:43`), но пишет клинические действия
  (`routes/diary.ts:387` — `VISIT_SIGNED_AND_LOCKED`), а не входы. Считать по нему
  сессии — значит подменить «кто подписал приём» на «кто залогинен».

**Отдельно, важнее пустоты.** Таблица спроектирована с колонкой
`active_session_token text NOT NULL` (`schema.ts:1361`), а виджет печатает её на
экран: `SingleSessionEnforcementsWidget.tsx:80` — «Токен сессии: {sess.activeSessionToken}».
Если кто-то допишет писателя «как задумано», клиника получит хранение действующих
токенов открытым текстом плюс их вывод в браузер любому, кто откроет настройки. Это
угон сессии в один взгляд через плечо. Писателя к этой таблице в текущем виде
добавлять нельзя.

**Действие.** Панель снять с обоих экранов (она ничего не проверяет и учит доверять
несуществующей проверке). Долг записать так: запрет параллельного входа — это
серверное поведение в `routes/auth.ts` (реестр активных сессий с хэшем токена, IP,
user-agent, `last_active_at`; вытеснение предыдущей при новом входе), и только после
этого имеет смысл экран. Не хватает: таблицы-реестра сессий, записи IP и user-agent
при входе, отметки активности. Токен в открытом виде не хранить и на экран не
выводить ни в каком варианте.

---

## 4. «Автоматический источник — рекомендация семьи» — ВЕРДИКТ: DELETE

**Файл:** `apps/web/src/components/marketing/FamilyRecommendationSourcesWidget.tsx`,
смонтирован в `apps/web/src/MarketingView.tsx:402`.

- Адреса нет: `/api/marketing/family-recommendation-sources` в роутах отсутствует,
  числится несуществующим в `apps/api/src/tests/webCallsExistingRoutes.test.ts:66`.
- Писателя нет: `family_recommendation_sources` (`schema.ts:1928-1936`) встречается
  только в объявлении схемы.
- 404 выдаётся за пустоту: `FamilyRecommendationSourcesWidget.tsx:28-31` —
  `.then((res) => res.json())` без `res.ok`, тело ошибки не массив → `items = []` →
  «Записи семейных рекомендаций отсутствуют» (строка 60). Владелец клиники читает
  это как «сарафанного радио у нас нет» и перекладывает бюджет в платную рекламу.

**Потребность настоящая:** понимать, какая доля пациентов приходит по рекомендации,
— это прямое решение о деньгах на маркетинг.

**Но обещание виджета живым расчётом не закрывается.**

- В самой таблице связей нет ни одной: `family_group_name`, `new_member_name`,
  `referrer_member_name`, `assigned_marketing_source` — четыре текстовых поля.
- Поля «источник привлечения» у пациента не существует. `patients`
  (`schema.ts:340-368`): `status`, `full_name`, `birth_date`, `phone`, `email`,
  `notes`, `administrative_profile`, `family_group_id`, `merged_into_patient_id`,
  `is_synced`, `version`, `created_at`, `updated_at`. В
  `administrative_profile` (`packages/shared/src/index.ts:2526-2549`) — документы,
  ИНН, СНИЛС, адреса, представитель, удобное время, ортодонтия. Источника нет.
- `crm_leads.source` (`schema.ts:1737`) есть, но у `crm_leads` нет `patient_id`:
  только `name`/`patient_name`/`phone` текстом. Связать источник обращения с
  карточкой можно лишь по имени или телефону — а телефон у семьи общий, и тогда
  ребёнку припишут источник матери.
- Единственная настоящая цепочка uuid — `patients.family_group_id` → `family_groups.id`
  (`schema.ts:1698`) плюс `family_groups.head_patient_id` и `patients.created_at`.
  По ней честно считается «в семье лечится N человек, первым завёлся такой-то».
  Но, во-первых, у `family_groups` единственный писатель — создание семейного
  кошелька (`apps/api/src/routes/finance_family.ts:272`), причём `head_patient_id`
  там необязателен (`data.headPatientId || null`), так что групп почти нет.
  Во-вторых, «пришёл в семью позже» ≠ «пришёл по рекомендации»: жена могла найти
  клинику сама. Выдавать порядок регистрации за атрибуцию рекомендации — это
  придуманная причинность в отчёте, по которому режут рекламный бюджет.

**Действие.** Виджет удалить. Долг: чтобы мерить рекомендации, нужно одно из двух —
поле «откуда узнали» на карточке пациента (заполняется при первом обращении) либо
uuid-связь `crm_leads.patient_id`, проставляемая при превращении обращения в
пациента. Не хватает именно этого; без любого из двух блок будет показывать
уверенную цифру, взятую из ниоткуда.

---

## 5. «Пациенты, которые перестали приходить» — ВЕРДИКТ: DELETE (потребность уже закрыта)

**Файл:** `apps/web/src/components/analytics/LostPatientsFiltersWidget.tsx`.

Сам виджет сделан аккуратно: три честных состояния, отказ не выдаётся за пустоту
(строки 95-105), `daysSinceLastVisit` защищён от `NaN` (строки 11-22). Проблема не в
нём, а в источнике: `lost_patients_filters` (`schema.ts:1139-1148`) — писателя нет,
поля `patient_name`/`phone` текстовые, `patient_id` отсутствует. Адрес
`/api/analytics/lost-patients-filters` при этом жив (чужая зона,
`apps/api/src/routes/clinical.ts:447`) и продолжает читать мёртвую таблицу.

**Потребность закрыта другим живым механизмом, полностью:**

- расчёт: `apps/api/src/services/patients/recallCandidates.ts` — считает по
  `patients` + `appointments` при каждом запросе, связь по `patient_id`, полосы
  6/12/24 месяца (`recallCandidates.ts:90-93`), исключает объединённые карточки
  (`:162`) и уже записанных на будущее (`:164`);
- экран: `apps/web/src/components/patients/RecallListPanel.tsx`, смонтирован в
  `apps/web/src/MarketingView.tsx:398` и
  `apps/web/src/pages/AnalyticsDashboardView.tsx:569`, зафиксирован в гейте монтажа
  `apps/web/src/tests/panelsAreMounted.test.ts:44`.

Старый виджет **уже не смонтирован нигде**: единственные упоминания за пределами
самого файла — комментарии о его снятии (`MarketingView.tsx:404`,
`AnalyticsDashboardView.tsx:553` и `:574`). Файл висит мёртвым грузом и приглашает
следующего агента «починить» его вместо живого расчёта.

**Действие.** Удалить файл виджета. Роут `clinical.ts:447` и таблицу снимать
согласованно с исполнителем, который держит `clinical.ts` — сам не трогал.

---

## Что ещё найдено, но не вошло в пятёрку

Четыре панели интеграций и один справочник — та же болезнь (нет писателя, у трёх нет
и адреса), но ценность разбора ниже, потому что все они требуют внешней системы, а не
расчёта по своим данным:

- `apps/web/src/components/integrations/EgiszBlankPermissionsWidget.tsx` —
  `egisz_blank_permissions` (`schema.ts:1905`) без писателя, адреса нет
  (`webCallsExistingRoutes.test.ts:64`). ЕГИСЗ/РЭМД — обязательная отчётность, так что
  это долг, а не мусор; но разрешения врача на бланк из живых данных не выводятся,
  это ролевая политика, а её выдумывать запрещено.
- `apps/web/src/components/integrations/YandexCalendarSyncsWidget.tsx` —
  `yandex_calendar_syncs` (`schema.ts:2085`) без писателя, адреса нет
  (`webCallsExistingRoutes.test.ts:65`). Нужен OAuth к Яндексу, которого нет. Delete.
- `apps/web/src/components/integrations/DadataGeocodedAddressesWidget.tsx` —
  `dadata_geocoded_addresses` (`schema.ts:1343`) без писателя, связь `patient_name`
  текстом, требует внешний DaData. Delete.
- `apps/web/src/components/integrations/LandingFieldMappingsWidget.tsx` —
  `landing_field_mappings` (`schema.ts:1099`) без писателя. Сопоставление полей формы
  лендинга — это редактор настроек, а не расчёт: нужен POST/PUT/DELETE, которых нет.
  Debt.
- `apps/web/src/components/crm/CustomCrmTaskTypesWidget.tsx` — `custom_crm_task_types`
  (`schema.ts:1012`) без писателя, при этом панель смонтирована **трижды**:
  `apps/web/src/PatientsView.tsx:689`, `apps/web/src/MarketingView.tsx:425`,
  `apps/web/src/components/settings/SettingsRulesTab.tsx:570`. Справочник видов задач
  вычислить нельзя по определению — его заводит администратор, значит нужен writer и
  редактор. Debt; заодно убрать два монтажа из трёх.

**Не цели (проверено, писатель есть):**
`apps/web/src/components/workspace/RecentPatientHistoryWidget.tsx` — у
`recent_patient_history` писатель есть, плюс живой `POST /api/hr/recent-patients`
(`clinical.ts:344`). `apps/web/src/components/patients/OrthodonticProgressWidget.tsx`
— пишет в `administrative_profile.orthodonticProgress`, поле реально существует
(`packages/shared/src/index.ts:2548`) и обновляется через
`updatePatientAdministrativeProfileInDb`.
`apps/web/src/pages/PublicBookingWidget.tsx` — публичная запись, отдельный контур.

---

## ПРОВЕРЕНО

- Список 19 виджетов и адрес каждого — `fd` + `rg` по исходникам.
- Перепись писателей: 63 таблицы с `db.insert` из 122 объявленных в `schema.ts`.
- Отсутствие писателя у всех 11 таблиц, названных выше, — поиском по
  `insert(<table>)`, `update(<table>)`, `INSERT INTO <table>` во всём `apps/api/src`,
  включая сервисы и `await import(...)`.
- Отсутствие колонки `patient_id` в `patient_communication_timelines` и фильтрация по
  `patient_name` — чтением `schema.ts:2038` и
  `patientCommunicationTimelinesQuery.ts:40`.
- Все колонки и значения enum для расчёта в разборе №1 — чтением `schema.ts`
  (строки 102, 119-130, 633-646), не по памяти.
- Пять писателей `communication_events` — с точными файлами и строками.
- Несовпадение полей виджета watchdog с колонками таблицы и отсутствие пустого
  состояния — чтением обоих файлов целиком.
- `active_session_token` в схеме и его вывод на экран — `schema.ts:1361` +
  `SingleSessionEnforcementsWidget.tsx:80`.
- Отсутствие поля «источник привлечения» у пациента — чтением `schema.ts:340-368` и
  `packages/shared/src/index.ts:2526-2549`.
- Что `LostPatientsFiltersWidget` не смонтирован нигде, а `RecallListPanel`
  смонтирован в двух местах и закреплён гейтом монтажа.
- Что входы пишутся в `audit_events`, и что в `audit_events` нет IP и user-agent.

## НЕ ПРОВЕРЕНО

- **Ни один запрос к живой базе не выполнялся.** Всё выше — статический разбор кода и
  схемы. Сколько строк реально лежит в `communication_events` у конкретной клиники, я
  не измерял; не исключено, что у клиники без подключённых мессенджеров и телефонии
  таблица пуста, и после правки лента будет пустой по честной причине. Это надо
  измерить до правки: `SELECT channel, direction, count(*) FROM communication_events
  GROUP BY 1, 2`.
- Ответы 404 по адресам `ram-watchdogs`, `yandex-calendar-syncs`,
  `egisz-blank-permissions`, `family-recommendation-sources` живым `curl` я не
  подтверждал — опираюсь на отсутствие регистрации в роутах и на список в
  `apps/api/src/tests/webCallsExistingRoutes.test.ts`. Сам тест я не запускал.
- Ни один экран не открывался в браузере, скриншотов нет.
- Миграции (`apps/api/drizzle/*.sql`) на предмет `INSERT` в эти таблицы я просмотрел
  поиском по именам таблиц, но не читал каждую миграцию целиком. Демонстрационные
  данные (`sampleData.ts`) как писателя не считал: это не работа клиники.
- `npx tsc` не запускал: код не менялся, а дерево сейчас красное из-за чужой
  незавершённой правки контракта `PanelSubject` в `lib/panelStateText.ts`.
