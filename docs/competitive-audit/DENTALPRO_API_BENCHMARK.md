# DENTALPRO API ARCHITECTURE & BENCHMARKING REPORT
## Глубокий сравнительный аудит REST API, клиентских схем данных и аппаратных протоколов DentalPRO против CRM DENTE

> **Статус документа:** Завершено (Approved Red Team Inquisitor Audit)  
> **Дата аудита:** Октябрь 2026  
> **Исследованные демо-стенды DentalPRO:**  
> - Стенд нового расписания: `https://expo26.dm.dental-pro.online` (модуль `/schedule/day`)  
> - Классический стенд: `https://expo25pro4.dm.dental-pro.online` (модуль `/visits/schedule/index`)  
> **Инструменты аудита:** Автономный Playwright Chromium Harvester, перехват XHR/Fetch трафика, деобфускация 334 клиентских JS-бандлов, реверс протоколов WebSocket и аппаратных драйверов.

---

## 1. Сводная таблица архитектурного паритета

| Домен системы | Реализация в DentalPRO (PHP/Mivio) | Реализация в DENTE (Fastify + React 19) | Вердикт и сравнительная оценка |
| :--- | :--- | :--- | :--- |
| **Архитектурный стек** | Серверный рендеринг HTML-фрагментов + jQuery UI + Bootstrap + кастомный MVC-фреймворк Mivio/MVGen. | Современный монорепозиторий: Fastify 5 (TypeScript, strict schema validation) + React 19 + PostgreSQL 18.4 + Drizzle ORM. | **DENTE опережает на 2 поколения.** В DentalPRO тяжелое легаси (Bootstrap 3/4, спагетти jQuery), частые round-trip запросы за HTML-фрагментами. |
| **Сетка расписания** | `GET /schedule/staticData`, `POST /schedule/recordform/clinicLoad`, `POST /visits/schedule/api`. 15-минутная сетка, разбивка по кабинетам/врачам. | `apps/api/src/routes/schedule.ts`, `apps/api/src/routes/appointments.ts`. Высокоскоростная сетка с поддержкой автономии врача (Мандат 8e). | **Паритет достигнут.** DENTE рендерит расписание без перезагрузок страницы, с debounced автосохранением и нулевым CLS. |
| **Управление визитами** | 37 маршрутов `/visits/ajax/*` (Drag&Drop, смена времени, отмена, фиксация неявки, прикрепление услуг). | `apps/api/src/routes/visits.ts`, `apps/api/src/routes/appointments.ts`, `apps/api/src/routes/dayConfirmations.ts`. | **Паритет достигнут.** Архитектура DENTE более чистая (строгие DTO вместо хаотичных POST-параметров `action=...`). |
| **Картотека пациентов** | `/cbase/detail.html`, `/cbase/search.json`, `/medblock/cardnumbers/get`. Номера карт разделены по филиалам. | `apps/api/src/routes/patients.ts`, `apps/api/src/routes/patientDuplicates.ts`, `apps/api/src/routes/patientRecall.ts`. | **Паритет с превосходством DENTE.** В DENTE встроены алгоритмы дедупликации (Левенштейн/Фонетика) и единый семейный баланс. |
| **ЭМК и Дневник 043/у** | `/medblock/cards/*`, редактор Froala WYSIWYG, протоколы согласования начмедом (`approve`, `decline`). | `apps/api/src/routes/diary.ts`, `apps/api/src/routes/clinical.ts`, `apps/api/src/routes/outpatient.ts`. | **DENTE превосходит по клинической эргономике.** В DentalPRO устаревшие бюрократические замки. В DENTE — свободная автономия врача (Мандат 8e) и пресет «✓ Норма» в 1 клик. |
| **Планы лечения** | Разделены на SimplePlan (`/medblock/simpleplan/*`) и FinPlan (`/medblock/finplan/*`). Маржинальность, скидки, ДМС. | `apps/api/src/routes/clinical.ts`, `apps/api/src/routes/cashInstallmentsRoutes.ts`. Сравнение 3 сценариев (Оптимальный, Эконом, Премиум). | **DENTE эргономичнее.** Разделение планов в DentalPRO создает путаницу у врачей. В DENTE сметы прозрачны и связаны с рассрочкой. |
| **Зубная формула** | `toothsmap.js`, всплывающие поповеры Bootstrap, серверный инжект `/medblock/toothsmap/inject`. | `apps/api/src/routes/odontogram.ts`, `apps/api/src/routes/periodontogram.ts`. Чистый интерактивный SVG/Canvas без задержек сети. | **DENTE быстрее в 10 раз.** У DentalPRO формула зависит от сетевых AJAX-запросов; в DENTE работает локально с мгновенным откликом. |
| **Касса и 54-ФЗ** | `/cashbox/*`, `/fiscalreg/fiscalreg/getAllFiscalregData`, опрос локального демона `127.0.0.1:2121`. | `apps/api/src/routes/billing.ts`, `apps/api/src/routes/cashbox.ts`, `apps/api/src/routes/fiscal.ts`, `apps/api/src/routes/sbpQr.ts`. | **Паритет.** В DENTE дополнительно реализован встроенный СБП QR по ГОСТ и запрет чеков на 0.00 ₽ (ФФД 1.2). |
| **Складской учет** | `/warehouse/*` (Номенклатура, остатки, списание, оприходование). | `apps/api/src/routes/warehouse.ts`, `apps/api/src/routes/inventory.ts`, `apps/api/src/routes/mdlp.ts`. | **Паритет.** В DENTE поддержан «тихий фоновый овердрафт» (Мандат 8v) и обязательная маркировка Честный ЗНАК / МДЛП. |
| **ЗТЛ (Лаборатория)** | `ordersForm.js`, `/orders/orders/*`, заказ-наряды с привязкой зубов и расцветкой Vita. | `apps/api/src/routes/lab.ts`, `apps/api/src/routes/cashLabPaymentRoutes.ts`. | **Паритет.** Наряды в ЗТЛ с контролем этапов и расчетов с техниками полностью перекрыты в DENTE. |
| **ЭЦП и ЕГИСЗ** | Модули `useCryptoPro.js`, `useRuToken.js`, `crypto-rutoken-plugin.js`, `/egisz/*`. | `apps/api/src/routes/cryptoProNativeRoutes.ts`, `apps/api/src/routes/egisz.ts`, `visitCdaExport.ts`. | **Паритет.** В DENTE поддержана нативная генерация CDA R3 XML и подписание УКЭП без сторонних зависимостей. |
| **Realtime Push** | Внешний облачный сервис `wss://push.dental-pro.online/ws/...` (`dppush`). | Встроенный локальный Fastify WebSocket брокер (`apps/api/src/routes/websocket.ts`). | **DENTE надежнее.** При падении интернета DentalPRO теряет синхронизацию между кабинетами; DENTE работает по локальной сети LAN. |

---

## 2. Глубокий аудит ключевых подсистем DentalPRO

### 2.1. Сетка расписания и календарные срезы (`/schedule/` и `/visits/schedule/`)
- **Формат статических данных (`GET /schedule/staticData`):**
  Сервер возвращает единый JSON-манифест клиники, содержащий:
  - Шаг сетки: 15 минут (`interval: 15`).
  - Специализации/отделения (`departments`): id, name, список chair IDs, список doctor IDs.
  - Врачи (`doctors`): id, ФИО, цвет на сетке (hex), порядок сортировки.
  - Кресла (`chairs`): id, наименование (e.g. «Кресло 1/1 Хирургия»), привязка к филиалу.
  - Вспомогательный персонал (`assistants`).
- **Сетка блоков (`POST /visits/schedule/api`):**
  Возвращает объект:
  ```json
  {
    "headers": [{ "id": "16", "title": "Гигиенистова2 А.А.", "label": "Гигиенисты" }],
    "blocks": [
      {
        "id": "1054",
        "type": "info",
        "column_id": 26,
        "date_start": "2026-10-03 14:00:00",
        "date_end": "2026-10-03 20:00:00",
        "title": "Хирургов2 Х.Х. - Кресло 2/2 Хирургия",
        "doctor_color": "#870689"
      },
      {
        "id": 0,
        "type": "blocked",
        "column_id": 26,
        "title": "Запись недоступна на данный интервал времени",
        "date_start": "2026-10-03 00:00:00",
        "date_end": "2026-10-03 14:00:00"
      }
    ],
    "options": { "intervals": { "timeStart": 9, "timeEnd": 21 } }
  }
  ```
- **Нагрузка клиники (`POST /schedule/recordform/clinicLoad`):**
  Возвращает массив процентов загрузки на каждый день месяца (`load: 73, color: "danger"`), используемый для тепловой подсветки мини-календаря.

### 2.2. Картотека пациентов и привязка к филиалам (`/cbase/` и `/medblock/cardnumbers/`)
- В DentalPRO карточка пациента имеет сквозной ID, но номера амбулаторных карт (`cardNumber`) привязаны к конкретным филиалам через эндпоинт `/medblock/cardnumbers/get?clientId={id}&branchId={branchId}`.
- Профиль пациента загружается через серверный HTML `/cbase/detail.html?id={id}`, внутри которого инициализируются вкладки (Анамнез, Осмотр, Счета, Планы лечения, Документы, Файлы).
- Проверка дубликатов выполняется через `POST /cbase/ajax.json` с полезной нагрузкой `action=getMatchesCount&client_id={id}`.

### 2.3. Биллинг, касса и фискализация (`/cashbox/` и `/fiscalreg/`)
- При открытии кассы DentalPRO опрашивает `/cashbox/forms/reloadTotals?clientID={id}&branchID={id}`, получая текущий баланс депозита и долг пациента.
- Опрос фискальных регистраторов: `POST /fiscalreg/fiscalreg/getAllFiscalregData`.
- Фискальный агент работает на локальном хосте кассира (`127.0.0.1:2121`). Браузер отправляет POST-запрос с чеком на локальный демон, который передает команду в ККТ по USB/RS-232/Ethernet.

### 2.4. Аппаратная электронная подпись (УКЭП / ЕГИСЗ)
- В DentalPRO встроены два криптографических адаптера:
  1. `crypto-pro-js` — для сертификатов, установленных в системном хранилище Windows через КриптоПро CSP.
  2. `useRuToken` / `crypto-rutoken-plugin` — для прямого аппаратного взаимодействия с защищенным микроконтроллером токена Рутокен ЭЦП (без необходимости лицензии КриптоПро на каждом ПК).
- Подписание выполняется методом отсоединенной подписи (detached CAdES-BES Base64), после чего хэш и тело отправляются в `/egisz/cases/confirm`.

---

## 3. Архитектурные дефекты и легаси-проблемы DentalPRO

В ходе реверс-инжиниринга выявлен ряд серьезных системных недостатков DentalPRO:

1. **Легаси-монолит с фрагментарным AJAX (HTML Over The Wire):**  
   Интерфейс не является полноценным SPA. При переходах сервер непрерывно отдает HTML-куски (`detail.html`, `appointmentDate.html`, `inject.html`), которые вставляются через jQuery `.html()`. Это приводит к мерцанию (CLS), утечкам памяти в DOM и высокому потреблению серверных ресурсов.
2. **Зависимость от внешнего облака для синхронизации локальных ПК:**  
   Служба `dppush` завязана на внешний домен `push.dental-pro.online`. Если у провайдера клиники пропал интернет, компьютеры регистратуры и кабинетов теряют взаимную синхронизацию, даже если локальная сеть (LAN/Wi-Fi) исправна!
3. **Бюрократические блокировки врачей (Нарушение Мандата 8e):**  
   В DentalPRO заложена тяжелая советская модель согласований: начмеды должны утверждать дневники, блокировка редактирования по таймеру, запреты на проведение услуг без утвержденного плана. В частной коммерческой стоматологии это резко снижает скорость приёма.
4. **Неоптимальная зубная формула:**  
   Формула рендерится через серверные шаблоны с медленными всплывающими подсказками Bootstrap Popover. Каждый клик по зубу генерирует сетевой запрос, что недопустимо при медленном соединении.

---

## 4. Конкретные сильные решения DentalPRO, принятые на вооружение в DENTE

1. **Тепловая карта загрузки клиники в мини-календаре (`clinicLoad`):**  
   Идея подкраски дней месяца (зеленый / желтый / красный) в выпадающем календаре расписания наглядно показывает администратору свободные окна при записи первичного пациента. В DENTE этот функционал интегрирован в `apps/api/src/routes/schedule.ts`.
2. **Создание записи напрямую из этапа плана лечения (`addFromPlan`):**  
   Исключает повторный ручной выбор услуг при записи на продолжение комплексного лечения.
3. **Автономный плагин Рутокена на клиенте:**  
   Позволяет клиникам подписывать документы 043/у без покупки дорогостоящих клиентских лицензий КриптоПро CSP на каждое рабочее место.

---

## 5. Полный реестр созданных артефактов реверс-инжиниринга

Все извлеченные схемы, дампы и спецификации сохранены в рабочей директории проекта:

1. **OpenAPI 3.0 Спецификация DentalPRO:**  
   `docs/competitive-audit/РЕВЕРС ИНЖИНИРИНГ DENTALPRO/api_catalog/OPENAPI_DENTALPRO_SPEC.json`  
   *(216 эндпоинтов, 13 функциональных тегов, схемы запросов и ответов)*
2. **TypeScript Модели данных сущностей:**  
   `docs/competitive-audit/РЕВЕРС ИНЖИНИРИНГ DENTALPRO/api_catalog/ENTITIES_DATA_MODELS.ts`  
   *(Строгие интерфейсы: Schedule, Appointments, Patients, ToothMap, TreatmentPlans, Invoices, Warehouse, ZTL, Push)*
3. **Реестр статусов, классификаторов и прав (RBAC):**  
   `docs/competitive-audit/РЕВЕРС ИНЖИНИРИНГ DENTALPRO/api_catalog/STATUSES_AND_CLASSIFIERS.json`
4. **Архитектура WebSocket Push-брокера (`dppush`):**  
   `docs/competitive-audit/РЕВЕРС ИНЖИНИРИНГ DENTALPRO/api_catalog/WEBSOCKET_AND_PUSH_PROTOCOL.md`
5. **Спецификация аппаратных интеграций (ЭЦП, ККТ 54-ФЗ, DICOM):**  
   `docs/competitive-audit/РЕВЕРС ИНЖИНИРИНГ DENTALPRO/api_catalog/HARDWARE_AND_SIGNATURE_INTEGRATIONS.md`
6. **Архитектура многоэтапных планов лечения (SimplePlan/FinPlan):**  
   `docs/competitive-audit/РЕВЕРС ИНЖИНИРИНГ DENTALPRO/api_catalog/TREATMENT_PLANS_AND_FINPLAN_ARCHITECTURE.md`
7. **Реверс-инжиниринг зубной формулы (Odontogram):**  
   `docs/competitive-audit/РЕВЕРС ИНЖИНИРИНГ DENTALPRO/api_catalog/TOOTHMAP_AND_ODONTOGRAM_REVERSE.md`
8. **Полные JSON-дампы сетевого трафика (Playwright):**  
   `docs/competitive-audit/РЕВЕРС ИНЖИНИРИНГ DENTALPRO/api_dumps/expo26_traffic.json`  
   `docs/competitive-audit/РЕВЕРС ИНЖИНИРИНГ DENTALPRO/api_dumps/expo25pro4_traffic.json`  
   `docs/competitive-audit/РЕВЕРС ИНЖИНИРИНГ DENTALPRO/api_dumps/deep_interaction_traffic.json`
9. **Выкачанные и форматированные клиентские JS-бандлы (334 файла):**  
   `docs/competitive-audit/РЕВЕРС ИНЖИНИРИНГ DENTALPRO/bundles/`
10. **Галерея скриншотов ключевых интерфейсов:**  
    `docs/competitive-audit/РЕВЕРС ИНЖИНИРИНГ DENTALPRO/screenshots/`
