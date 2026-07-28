# Разбор: «интерфейс зовёт 19+ адресов, которых сервер не обслуживает»

Дата разбора: 2026-07-29. HEAD на момент начала: `23e2a96ada75bc4b59a1304a399ebac3aabd58a4`.

## Главный вывод, он же опровержение постановки задачи

**Из 19 адресов списка 14 обслуживаются сервером. Весь «блок снимков» — ложная тревога.**
Ни один из них не отвечает 404. Настоящих отсутствующих маршрутов — 5 адресных форм из
списка (плюс 4 формы, которых в списке не было, — они прятались под родительскими
строками `KNOWN_MISSING`).

Утверждение «основная масса — блок снимков» неверно на всём объёме блока. Если бы разбор
пошёл от доверия к списку, работа состояла бы в написании четырнадцати маршрутов, которые
уже существуют и уже работают, — с почти неизбежным конфликтом имён при регистрации.

## МОИ ОШИБКИ (первыми)

1. **Первая редакция моего же зонда врала.** Я проверял существование маршрута через
   `app.hasRoute({ method, url })`, подставляя КОНКРЕТНЫЙ путь
   `/api/imaging/studies/<uuid>/viewer-session`. `hasRoute` сверяет аргумент с ШАБЛОНОМ
   маршрута и параметрического сопоставления не делает — он объявил несуществующими живые
   параметрические маршруты. Поймано тем, что тот же адрес через `app.inject` ответил
   `401 Требуется авторизация`, то есть обработчик до него дошёл. Вывод, который стоит
   держать: в этом вопросе `hasRoute` — негодный инструмент, годный — `inject`.
   Если бы я остановился на первом прогоне, я записал бы `viewer-session` в отсутствующие
   и «починил» бы существующий маршрут.
2. Я изначально предположил, что причина ложных тревог — незарегистрированный модуль
   (по образцу разбора в `apps/api/src/tests/support/routeRegistrationCensus.ts`). Это
   оказалось неверно: `registerImagingRoutes` вызывается безусловно, `server.ts:372`.
   Гипотезу опровергла таблица маршрутов, а не чтение.

## Чем доказано (метод)

Не чтением исходников, а поднятым приложением:
`createDenteApiApp({ startTelegramWorker: false, startCommunicationWorker: false,
startMigrationWorker: false })` → `app.ready()` → `app.printRoutes()` +
`app.inject()` тем же методом, каким адрес зовёт интерфейс.

Признак «маршрута нет» — ровно подпись Fastify:
`{"message":"Route <МЕТОД>:<путь> not found","error":"Not Found","statusCode":404}`.
Любой другой ответ (401, 400, 403) доказывает, что маршрут есть: до него дошёл обработчик.
В `apps/api/src` нет ни одного `setNotFoundHandler`, поэтому подпись стабильна.

Живой dev-API на 127.0.0.1:4100 в доказательстве НЕ участвовал: он бывает устаревшим.

## Достижимость экранов

Считана существующей переписью `apps/web/src/tests/utils/componentReachability.ts` (та же,
на которой стоит `tests/panelsAreMounted.test.ts`), третий механизм не писался. Прогон:
333 файла, 183 компонента. Все семь интересующих компонентов — `state: rendered`,
`detail` пустой: `SettingsBpmnTab`, `SettingsProtocolsTab`, `EgiszMonitor`,
`VisiographAnalyzer`, `ImagingView`, `SettingsAuditTab`, `SettingsImportsTab`.

Но статический граф — не весь ответ: перепись не вычисляет признаки во время работы.
Поверх неё проверены гейты, и они меняют картину:

| Экран | Кто рендерит | Дорога от пользователя |
|---|---|---|
| `SettingsPricesTab` (прайс) | `SettingsView.tsx:1536` | **Есть.** Настройки → «Прайс», ни одного фильтра. Отказ видят люди. |
| `SettingsProtocolsTab` | `SettingsView.tsx:1532` | **Есть.** Настройки → «Протоколы», гейта нет, `#settings/protocols` тоже работает. Отказ видят люди. |
| `EgiszMonitor` | `VisitOdontogramTab.tsx:99` ← `VisitView.tsx:505` | Есть, но за отладочным переключателем: Настройки → Модули → «Инженерный статус (Отладка)» → Приём → «Зубная формула». Писатель у признака есть (`WorkspaceFeaturesSelector.tsx:225`). |
| `SettingsBpmnTab` (сценарии) | `SettingsView.tsx:1559` | **Фактически нет.** См. ниже. |

**Отдельная находка: признак `hasBpmWorkflows` не включается ничем.** Кнопка вкладки
вырезается из меню (`SettingsView.tsx:1225`), панель закрыта тем же признаком (`:1558`), а
писателя у признака нет ни одного: в `apps/web/src` только объявление
(`hooks/useWorkspaceProfile.ts:58`), умолчание `false` (`:99`), запись в localStorage (`:149`)
и два чтения; в переключателях «Настройки → Модули» его нет
(`WorkspaceFeaturesSelector.tsx` перечисляет признаки до `hasClinicalRules`); сервер его
выбрасывает, потому что в `DEFAULT_WORKSPACE_FEATURE_FLAGS` его нет
(`routes/workspaceProfile.ts:60-80`, неизвестные ключи отбрасываются `:94-103`). Включить
можно только правкой `localStorage` руками. То есть вся аккуратная работа по текстам отказа
для `/api/clinic/workflows` сегодня не показывается никому.

## Почему страж ошибся (установленная часть)

Разбор `webCalls()` в `apps/api/src/tests/webCallsExistingRoutes.test.ts` считает вызовом
ЛЮБОЙ строковый литерал, начинающийся с `/api/`. Поэтому в список попали:

1. **Ключи словаря подписей.** `migrationHandoffEndpointLabels: Record<string, string>` —
   `components/settings/SettingsAuditTab.tsx:672-677`,
   `SettingsImportsTab.tsx:666-671`, `SettingsViewHelpers.tsx:506-511`:
   ```
   "/api/imaging/dicom/folder-workup-plan": "проверка КТ-серий",
   "/api/imaging/imports/preview": "предпросмотр списка снимков",
   "/api/imaging/folders/scan-preview": "сканирование папки снимков",
   ```
   Это отображение «адрес → русская подпись для человека», а не обращение к сети.
   Измерено: в этих трёх файлах **ноль** вызовов `fetch(`. Атрибуция стража
   «зовут: SettingsAuditTab.tsx, SettingsImportsTab.tsx, SettingsViewHelpers.tsx»
   ложна целиком — эти файлы не зовут ничего.
2. **Строки в комментариях.** `components/imaging/VisiographAnalyzer.tsx:7` и `:210` —
   документация («Синхронный анализ через /api/imaging/visiograph-ai»,
   «POST /api/imaging/visiograph-ai — requireClinicalReadAccess (imaging.ts:6225)»).
   Настоящий вызов один, строка 473. Предыдущий инженер прямо в комментарии указал номер
   строки маршрута на сервере — то есть уже знал, что маршрут есть.

**НЕ ПРОВЕРЕНО:** почему переписанная редакция стража потеряла сами маршруты
`/api/imaging/*` из набора обслуживаемых. Её исходник мне недоступен (файл правит другой
агент, править и читать его редакцию я не стал). Установлено только то, что маршруты
существуют и отвечают. Причина на стороне стража — за мной не закреплена.

## Таблица разбора

Столбец «метод» — тот, которым адрес РЕАЛЬНО зовёт интерфейс.

### `false-alarm` — маршрут есть, страж не нашёл (14)

Все объявлены в `apps/api/src/routes/imaging.ts`, внутри
`export async function registerImagingRoutes(app: FastifyInstance)` (строка 6223),
зарегистрирован безусловно в `apps/api/src/server.ts:372` (`await registerImagingRoutes(app)`).
Способ объявления — прямой `app.post("<путь>", ...)` / `app.get` / `app.put`.

| Адрес | Метод | Объявление | Ответ на живой запрос | Настоящий вызывающий |
|---|---|---|---|---|
| `/api/imaging/visiograph-ai` | POST | `imaging.ts:6224` | 400 `ImagingValidationError` | `VisiographAnalyzer.tsx:473` |
| `/api/imaging/imports/preview` | POST | `imaging.ts:6239` | 400 `ImagingValidationError` | `useAppLogic.tsx:8618` |
| `/api/imaging/dicom/series-preview` | POST | `imaging.ts:6257` | 400 `ImagingValidationError` | `useAppLogic.tsx:10108` |
| `/api/imaging/dicomweb/check` | POST | `imaging.ts:6275` | 400 `ImagingValidationError` | `useAppLogic.tsx:10160` |
| `/api/imaging/dicom/viewer-launch-manifest` | POST | `imaging.ts:6287` | 400 `ImagingValidationError` | `useAppLogic.tsx:10283` |
| `/api/imaging/dicom/viewer-workbench-manifest` | POST | `imaging.ts:6335` | 400 `ImagingValidationError` | `useAppLogic.tsx:10033, 10214, 10621` |
| `/api/imaging/dicom/local-folder-discovery` | POST | `imaging.ts:6388` | 400 `ImagingValidationError` | `useAppLogic.tsx:9599` |
| `/api/imaging/local-organizer/scan-preview` | POST | `imaging.ts:6400` | 400 `ImagingValidationError` | `useAppLogic.tsx:9655` |
| `/api/imaging/dicom/folder-series-preview` | POST | `imaging.ts:6412` | 400 `ImagingValidationError` | `useAppLogic.tsx:9767` |
| `/api/imaging/dicom/first-frame-preview` | POST | `imaging.ts:6427` | 400 `ImagingValidationError` | `useAppLogic.tsx:9837` |
| `/api/imaging/dicom/folder-workup-plan` | POST | `imaging.ts:6439` | 400 `ImagingValidationError` | `useAppLogic.tsx:9908, 10575` |
| `/api/imaging/folders/scan-preview` | POST | `imaging.ts:6472` | 400 `ImagingValidationError` | `useAppLogic.tsx:9712` |
| `/api/imaging/studies/:id/viewer-session` | GET + PUT | `imaging.ts:6520`, `:6538` | 401 `AuthRequired` | `useAppLogic.tsx:6643`, `:6709` |
| `/api/imaging/studies/:id/analyze` | POST | `imaging.ts:6614` | 401 `AuthRequired` | `ImagingView.tsx:345` |

Что видит пользователь при 404: **вопрос не возникает — 404 не бывает.** Тексты отказов у
этих маршрутов русские и человеческие («Предпросмотр DICOM-серии не построен: передайте
непустой список метаданных серии»), то есть при пустом теле экран получает объяснение, а не
пустоту.

Вред клинике: **нулевой от самого маршрута.** Вред от записи в списке долга — ненулевой:
четырнадцать строк ложного долга обесценивают список, на который должны смотреть.

### `route-missing` — функция нужна клинике, маршрут надо написать (2 адресные формы из списка + 2 родительские)

| Адрес | Метод | Доказательство отсутствия | Что видит пользователь при 404 | Вред клинике |
|---|---|---|---|---|
| `/api/settings/catalog` | POST | `Route POST:/api/settings/catalog not found` | Человеческий отказ: `setError(await responseErrorMessage(response, "Не удалось создать услугу"))` — `useAppLogic.tsx:7430-7432` | **Клиника не может добавить услугу в прайс.** |
| `/api/settings/catalog/:id` | PUT | `Route PUT:/api/settings/catalog/abc not found` | Человеческий отказ, `useAppLogic.tsx:7452` | **Нельзя изменить цену услуги.** |
| `/api/settings/catalog/:id` | DELETE | `Route DELETE:/api/settings/catalog/abc not found` | Человеческий отказ, `useAppLogic.tsx:7473` | **Нельзя убрать услугу из прайса.** |
| `/api/settings/protocols` | POST | `Route POST:/api/settings/protocols not found` | Человеческий отказ: `setError(await refusalMessage(res, "Шаблон не сохранён"))` — `SettingsProtocolsTab.tsx:117` | **Нельзя создать шаблон протокола приёма.** |
| `/api/settings/protocols/:id` | PUT | `Route PUT:/api/settings/protocols/abc not found` | Человеческий отказ, там же | **Нельзя исправить шаблон.** |
| `/api/settings/protocols/:id` | DELETE | `Route DELETE:/api/settings/protocols/abc not found` | Человеческий отказ, `SettingsProtocolsTab.tsx:148-150` | **Нельзя удалить устаревший шаблон.** |

Почему это `route-missing`, а не `debt`: обе функции стоят на ГОТОВОМ основании, дописать
надо только запись.

**Уточнение по прайсу, которое делает исход хуже «терпимого».** Текст отказа при 404 —
«Не удалось создать услугу: нужный маршрут не найден» (`AppHelpers.tsx:4208`,
`responseErrorMessage`; английское тело Fastify отбрасывается фильтром на кириллицу, так
что «Not Found» на экран не попадает). Но обёртка проглатывает отказ ДЛЯ ВЫЗЫВАЮЩЕГО:
функция возвращается нормально и исключения не бросает. Поэтому в
`components/settings/SettingsPricesTab.tsx:189` следом выполняется `setEditServiceId(null)` —
**форма закрывается так, будто услуга сохранена**, одновременно с плашкой об отказе, а
`loadDashboard()` не вызывается вовсе. Экран одновременно говорит «не удалось» и ведёт себя
как после успеха. Это уже не честный отказ, а противоречие в интерфейсе.

Побочно: формулировка «нужный маршрут не найден» — язык разработчика, тогда как тот же 404 в
`lib/panelStateText.ts:126` объяснён по-человечески («сервер не знает такого раздела —
скорее всего программа клиники обновлена не полностью, сообщите администратору»). Два
владельца одного текста расходятся. В область этой задачи правка текста не входит.

**Прайс услуг (`/api/settings/catalog`).**
- Таблица есть: `service_catalog_items`, `apps/api/src/db/schema.ts:426`.
- Чтение работает: `getServiceCatalogForOrganization` (`db/pricelistQuery.ts:172`), приходит
  на экран полем `dashboard.serviceCatalog`.
- Контракт есть: `serviceCatalogItemSchema`, `packages/shared/src/index.ts:1629`.
- Писателя нет ни одного: единственные записи в таблицу — посев мастера первого запуска
  (`routes/workspaceProfile.ts:841`, `:1002`). То есть прайс можно получить при установке и
  больше НИКОГДА не изменить.
- Чем это платится: прайс — основание счёта пациенту, плана лечения
  (`components/plan/ComparativePlannerDashboard.tsx`), расчёта стоимости
  (`components/odontogram/TreatmentEstimator.tsx`) и правил списания материалов
  (`routes/inventory.ts:380`). Клиника, которая подняла цены, не имеет ни одного способа
  внести это в программу.

**Шаблоны протоколов (`/api/settings/protocols`).**
- Таблица есть: `protocol_templates`, `apps/api/src/db/schema.ts:2207` (в ней
  `complaintPrompt`, `objectiveTemplate`, `treatmentPlanTemplate`, `requiredDocuments`,
  `suggestedImaging`, `safetyWarnings`).
- Чтение работает: `dashboard.protocolTemplates`, используется на приёме
  (`VisitView.tsx:1218`, `useAppLogic.tsx:6914`).
- Контракт есть: `protocolTemplateSchema`, `packages/shared/src/index.ts` (рядом с 1625).
- Писателя нет ни одного.
- Чем это платится: шаблон протокола — это заготовка осмотра, плана лечения и списка
  обязательных документов. Клиника не может ни завести свой протокол, ни исправить чужой.

### `debt` — нужен, но объём больше этой задачи (3 адресные формы из списка + 1 родительская)

| Адрес | Метод | Доказательство | Что видит пользователь при 404 | Что предстоит |
|---|---|---|---|---|
| `/api/clinic/workflows` | GET | `Route GET:/api/clinic/workflows not found` | **Честный отказ, уже сделан.** «Список не прочитан» + «Не считайте, что сценариев нет… Создание тоже выключено» (`settingsWorkflowsPanel.ts:78-85`); форма создания при отказе не рисуется | Таблицы `clinic_workflows` в схеме НЕТ. Нужен движок автоматизации: таблица сценариев, модель триггеров (`patient_created`, `appointment_booked`, `appointment_completed`, `recall_due`, `invoice_issued`), исполнитель действий, журнал срабатываний. Маршрут без движка вернул бы список сценариев, которые ничего не делают, — это мок. |
| `/api/clinic/workflows` | POST | `Route POST:...` | там же | то же |
| `/api/clinic/workflows/:id/toggle` | POST | `Route POST:/api/clinic/workflows/abc/toggle not found` | Всплывающий отказ с кодом ответа (`SettingsBpmnTab.tsx:82-88`) | то же |
| `/api/clinic/workflows/:id` | DELETE | `Route DELETE:/api/clinic/workflows/abc not found` | Всплывающий отказ (`SettingsBpmnTab.tsx:119-123`) | то же |
| `/api/egisz/logs/:id` | GET | `Route GET:/api/egisz/logs/abc not found` | **Честный отказ, уже сделан.** «Раздел ЕГИСЗ на этом сервере недоступен… отправлять пока просто некуда, и ни один документ по этому приёму в Минздрав не уходил», кнопка отправки заблокирована (`egiszAvailability.ts:448-462`) | Таблицы `egisz_logs` в схеме НЕТ (есть только `egisz_multiple_diagnoses`, `egisz_blank_permissions`). Сам сервер уже честно отвечает `capabilities.ukepSigning:false`, `remdTransmission:false` (`routes/egisz.ts:79`). Предстоит: транспорт в РЭМД, подпись УКЭП над CDA, модель согласия пациента, таблица журнала. Журнал выгрузок без отправителя — мок, и мок именно здесь опаснее всего: клиника решит, что отчиталась в Минздрав. |

### `facade` — ни одного

Ни один адрес не получил этот вердикт, и это осознанно. Удалять нечего:

- `catalog` и `protocols` — живые таблицы, живое чтение, работающие экраны. Удалить вызов
  значило бы отнять у клиники прайс и протоколы.
- `egisz/logs` — вокруг него уже написан аккуратный слой честного отказа
  (`egiszAvailability.ts`) со своим тестом (`tests/egiszAvailability.test.ts`). Экран НЕ
  выдаёт пустоту за норму и глушит кнопку отправки. Снести — уничтожить сделанную работу и
  вернуть ровно ту ложь, против которой её делали.
- `workflows` — **здесь довод за `facade` самый сильный, и он рассмотрен всерьёз.** Экран
  недостижим (признак `hasBpmWorkflows` не включается ничем, см. выше), таблицы
  `clinic_workflows` нет, движка нет. Формально это «недостижимый вызов недостижимого
  экрана». Вердикт всё же `debt`, и вот на каком основании: удалению подлежал бы не
  осиротевший виджет, а целая вкладка настроек вместе с продуманным слоем честного отказа
  (`settingsWorkflowsPanel.ts` — 202 строки с разбором прежней ошибки и своими тестами) и
  русскими подписями пяти событий-триггеров. Отсутствует здесь ОДНО звено — писатель
  признака, а не работоспособность экрана. Удалять слой правды, написанный против
  конкретной прошлой лжи, чтобы «закрыть» отсутствие движка автоматизации, — это потеря, а
  не уборка. Правильный порядок обратный: сначала движок и таблица, потом писатель признака.
  Если владелец решит, что движка не будет, — тогда удалять, и удалять целиком, вместе с
  вкладкой, признаком и подписями.

## Итог по вердиктам

| Вердикт | Адресов из списка 19 |
|---|---|
| `false-alarm` | 14 |
| `route-missing` | 2 (`/api/settings/protocols/:param`, `/api/settings/catalog/:param`) |
| `debt` | 3 (`/api/clinic/workflows/:param`, `/api/clinic/workflows/:param/toggle`, `/api/egisz/logs/:param`) |
| `facade` | 0 |

Сверх списка найдено 4 отсутствующие адресные формы, которые страж скрыл, потому что их
родитель уже лежал в `KNOWN_MISSING`: `GET`/`POST /api/clinic/workflows`,
`POST /api/settings/protocols`, `POST /api/settings/catalog`. Проверено 26 сочетаний
метод+путь.

## Что беру в починку в этой задаче

1. `/api/settings/catalog` — POST, PUT, DELETE. Прайс услуг. Самый вредный: без него
   клиника не может изменить цену.
2. `/api/settings/protocols` — POST, PUT, DELETE. Шаблоны протоколов приёма.

Удаление `DELETE` делается отключением (`is_active = false`), а не удалением строки: на
`service_catalog_items.id` ссылаются `treatment_items.service_id` (`schema.ts:455`) и
`procedure_material_rules.service_id` (`routes/inventory.ts:531`). Физическое удаление
порвало бы историю лечения и уже выставленные счета. Это тот же приём, что уже принят в
`settings.ts` для сотрудников и кресел.

## Что закрыто (с доказательством)

| Цель | Коммит | Доказательство | Сторож |
|---|---|---|---|
| `/api/settings/catalog` POST + PUT + DELETE | `068d6810e` | `apps/api/src/tests/routes/serviceCatalogWriteProof.ts` — живая PostgreSQL, независимый SQL, «ВСЕ СВЕРКИ СОШЛИСЬ» | `tests/routes/serviceCatalogRoutes.test.ts`, проверен на покраснение |
| `/api/settings/protocols` POST + PUT + DELETE | `3fcc5e961` | `apps/api/src/tests/routes/protocolTemplateWriteProof.ts` — то же, плюс сверка, что записанный шаблон проходит контракт чтения | `tests/routes/protocolTemplateRoutes.test.ts`, проверен на покраснение |

Удаление в двух целях сделано ПО-РАЗНОМУ, и это не непоследовательность:
услуга прайса отключается (`is_active = false`), потому что на неё ссылаются позиции лечения
и правила списания материалов; шаблон протокола удаляется по-настоящему, потому что на
`protocol_templates.id` не ссылается ни одна таблица и признака активности у него нет. В обоих
случаях сервер делает то, что экран обещает оператору в подтверждении.

## ТРЕБУЕТСЯ ОТ ВЛАДЕЛЬЦА СТРАЖА (не моя правка)

`apps/api/src/tests/webCallsExistingRoutes.test.ts` правит другой агент, и я его не трогал.
После моих двух коммитов его проверка «починенные адреса удаляются из списка долга» КРАСНАЯ, и
это её штатное поведение, а не поломка:

```
✖ починенные адреса удаляются из списка долга
  AssertionError: Эти адреса уже обслуживаются — уберите их из KNOWN_MISSING:
  /api/settings/catalog, /api/settings/protocols
```

Нужно убрать две строки из `KNOWN_MISSING` и уменьшить границу в проверке «список известного
долга не разрастается молча» с `<= 23` до `<= 21`.

Вторая красная проверка того же файла — НЕ моя: `/api/communications/campaigns/SEGMENT/SEGMENT`
и `/api/settings/staff*` падали там же и до моей работы (замерено на `23e2a96ad` в начале
разбора, тот же список из двух строк).

## Остаётся долгом

1. `/api/clinic/workflows` (GET, POST, `:id/toggle`, `:id`) — движок автоматизации: таблица,
   модель триггеров, исполнитель, журнал срабатываний. Плюс отдельный дефект: признак
   `hasBpmWorkflows` не включается ничем, поэтому экран не показывается никому.
2. `/api/egisz/logs/:id` — транспорт в РЭМД, подпись УКЭП, модель согласия, таблица журнала.
3. **Вкладка «Протоколы» шлёт НЕ ТОТ заголовок.** `SettingsProtocolsTab.tsx:111` и `:144`
   ставят в `x-dente-admin-secret` значение `localStorage.getItem("dente_clinic_token")` с
   комментарием «For fallback compatibility», тогда как остальные вкладки настроек шлют
   настоящий секрет через `auth.settingsAccessHeaders()`. Сегодня это ни на что не влияет:
   `DENTE_SETTINGS_ADMIN_SECRET` в `.env` не задан, а `DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS`
   задан, поэтому охрана пропускает по второй ветке. В production, где обход выключен, запись
   протоколов упрётся в 403. Я это не правил сознательно: комментарий заявляет намеренную
   совместимость, и менять его без выяснения, на что она рассчитана, — второе решение о
   поведении внутри задачи про отсутствующие маршруты. **НЕ ПРОВЕРЕНО:** что именно ломается,
   если поставить туда настоящий секрет.

## Отдельная находка мимо задачи (не чинил)

`routes/workspaceProfile.ts:821-828` — посев прайса мастером первого запуска складывает
объекты с полем `name:`, тогда как колонка называется `title` и она `NOT NULL`
(`schema.ts:430`). Поле `name` в `service_catalog_items` не существует. Рядом, в том же
посеве, стоит `category: "orthopedics"` — такого значения в `serviceCategorySchema` нет
(там `prosthetics`), то есть даже прошедшая вставку строка была бы выброшена чтением как не
прошедшая контракт. Это отдельный дефект отдельного файла, в область этой задачи не входит и
остаётся долгом.
**НЕ ПРОВЕРЕНО:** доходит ли этот код до вставки на живом мастере первого запуска.

## Как перепроверить весь список одной командой

Зонд, которым получены все приговоры выше, в дереве не оставлен (он был разведочным и жил в
`scratch/`). Воспроизводится он так: поднять приложение
`createDenteApiApp({ startTelegramWorker: false, startCommunicationWorker: false,
startMigrationWorker: false })`, дождаться `app.ready()` и для каждого адреса сделать
`app.inject` ТЕМ методом, каким его зовёт интерфейс, считая «маршрута нет» только по подписи
`Route <МЕТОД>:<путь> not found`. Ключевая ловушка названа выше: `app.hasRoute` для этого не
годится, он не сопоставляет параметрические пути.
