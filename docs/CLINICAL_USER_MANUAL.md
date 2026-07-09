# Руководство пользователя для клиники (CLINICAL USER MANUAL)

## 1. Введение
Данное руководство описывает работу с модулями планирования имплантации, генерации смет и КЛКТ/DICOM.

## 2. Работа с КЛКТ и кэшированием
Для работы с тяжелыми DICOM/КЛКТ файлами используется кэширование в браузере (OPFS).
- При загрузке томограммы она кэшируется локально.
- **Очистка кэша**: В настройках приложения нажмите "Очистить локальный кэш" при замедлении работы. 
- **Производительность**: Не открывайте более 3 КЛКТ-исследований одновременно во избежание переполнения VRAM.

## 3. Клиническое обоснование алгоритмов
- **Расчет плотности кости (Шкала Хаунсфилда / Misch)**: Приложение анализирует радиологическую плотность. D1 (>1250 HU), D2 (850-1250 HU), D3 (350-850 HU), D4 (<350 HU). Это влияет на первичную стабильность.
- **Подбор фрез**: Подбор фрез (Osstem, Straumann, Nobel) осуществляется на базе выбранной системы имплантации и плотности (D1-D4). Например, для D1/D2 автоматически предлагается кортикальное расширение.
- **Оси имплантатов (Угол расхождения >15°)**: Алгоритм предупреждает о коаксиальном расхождении осей имплантатов более 15°, так как это критически снижает выживаемость конструкции (особенно при опоре на мультиюниты) и вызывает биомеханические перегрузки.

## 4. Сметы и финансы
Система использует модуль `ShadowAnalyst` для автоматического расчета стоимости на основе выбранного плана лечения и прайс-листа клиники. Все цены подтягиваются автоматически.

## 5. Универсальный Пылесос Данных (Data Ingestion & AI Mapping)
Для переезда клиники с других CRM (Ident, Инфодент, Open Dental, Dentrix) используется модуль умного импорта.
- **DICOM Пылесос**: При натравливании системы на директорию с КЛКТ, она автоматически парсит теги `1.2.840...` (DICOM), извлекает ФИО пациента и привязывает 3D-снимок к его электронной карте. Генерируются легкие PNG-превью.
- **ИИ Маппинг Схем (Schema Mapper)**: Если вы загружаете базу от неизвестной CRM, система использует ИИ-маршрутизатор для автоматического сопоставления колонок (например, `fio_klienta` -> `fullName`). Вы можете проверить и утвердить связи на интерактивном холсте.
- **Движок Дедупликации**: При загрузке тысяч пациентов система ищет дубликаты. Совпадение имен проверяется алгоритмом Левенштейна, а телефоны приводятся к стандарту E.164. Если уверенность (Confidence Score) > 85%, профили сливаются автоматически. При уверенности 65-85% вам будет показана **Панель Слияния (Merge Panel)** для ручного подтверждения.
- **BI Dashboard Руководителя**: Все импортированные исторические данные автоматически формируют графики: когортный LTV (пожизненная ценность клиента), воронки планов лечения и тепловые карты должников.

## 6. Сквозная ERP Автоматизация (Сметы, Лаборатория, ДМС)
Мы расширили систему до уровня полноценной ERP для автоматизации работы между врачами, координаторами, пациентами и внешними агентами (лабораториями и страховыми).
- **Сравнительный Конструктор Смет (Comparative Estimator)**: Координатор может продемонстрировать пациенту до 3 альтернативных планов лечения (например, Премиум и Стандарт) в параллельных колонках. Пациент может включать и отключать опциональные услуги чекбоксами (например, временные коронки), при этом итоговая сумма и гарантийные условия пересчитываются на лету. При утверждении одного плана, остальные архивируются.
- **Страховое расщепление (ДМС / Copay Engine)**: При прикреплении к пациенту полиса ДМС, смета лечения автоматически разбивается на две части: "Покрывает Страховая" и "К оплате (Patient Copay)". Проценты покрытия (например, Терапия 80%) настраиваются в профиле страховой компании.
- **Внешний Портал Лаборатории (Guest Lab Portal)**: При заказе ортопедических конструкций генерируется защищенная токеном ссылка. Зубной техник открывает её без регистрации в нашей CRM, видит параметры заказа (FDI, цвет Vita, материал) и может менять статусы (например, на "Отправлен в клинику").
- **Клинический Маршрутизатор (Clinical Handoffs)**: Передача пациента от одного специалиста к другому (например, от терапевта к ортопеду после санации) происходит автоматически. Система генерирует задачу для консилиума со всеми необходимыми ссылками на снимки и комментариями.

## 7. Когнитивная Эргономика и Dental UX Laws
Интерфейс DENTE спроектирован с учетом законов когнитивной психологии для снижения усталости врачей:
- **Закон Хика и Закон Фиттса**: Интерфейс избегает перегруженности (визуального паралича). Второстепенные действия в сметах спрятаны в Dropdown-меню. Интерактивная зубная формула (Одонтограмма) использует всплывающее Radial Menu (Радиальное меню) с крупными целями для клика (минимум 44px), что ускоряет заполнение медкарты на планшетах.
- **Эффект Зейгарник**: В ленте приемов пациента (Journey Timeline) отображается интерактивный Прогресс-бар выполнения плана лечения. Незавершенность плана стимулирует пациента не прерывать лечение.
- **Эффект Фон Ресторфф и Эффект Края**: Наиболее важные события в ленте приемов (первый визит и следующий шаг) визуально укрупнены. Критические медицинские алерты (аллергии) выделяются мягким неоновым пульсирующим свечением, привлекая внимание врача без агрессивного визуального шума (отказ от жестких рамок в пользу Glassmorphism).


## 8. E2E Testing & Memory Leak Verification
To ensure enterprise-grade stability, DENTE incorporates continuous E2E testing via Playwright. The automated suite, 	est_master_clinical_crm_flow.cjs, validates the following across Desktop and Mobile viewports:

- **SOAP Journal Data Entry**: Tests multi-line input and state hydration.
- **Calendar Crosshair Interaction**: Verifies autofocus and popover performance.
- **Odontogram Multi-select**: Checks modifier key (Shift+Click) bindings.
- **Patient Portal OTP Flow**: Asserts focus management across code cells.
- **Tab-switching Memory Validation**: Rapidly toggles between Heavy Views (Patient, Schedule, Finance) and audits DOM count and app crash state to detect memory leaks and detached node accumulation.
## 9. Multitenancy Security & Memory Management (The Grand Audit)
**Data Privacy & Organization Isolation:**
DENTE strictly enforces multi-tenant data boundaries at the ORM layer. Every backend REST and WebSocket request verifies the organizationId from the active session context against the database query (e.g. WHERE patient.organizationId = :currentOrg). This robust access-guard implementation prevents any cross-tenant data leakage. Queries are intentionally joined with parent tables (like patients) whenever the entity itself doesn't carry a direct reference, locking down data ownership with certainty.

**OOM Safety Gates:**
To run smoothly on varying hardware profiles, especially across long clinic shifts, DENTE aggressively manages memory using a two-pronged strategy:
- **EventListener Cleanup:** Components relying on global events (window, document, WebSocket subscriptions, SpeechSynthesis events) are mandated to return cleanup un-subscribers from useEffect hooks, thereby releasing objects from V8 heap.
- **Store Flushes:** The frontend application actively intercepts unmount cycles on heavy visualization tabs (e.g., 3D/2D Odontograms, Document Stores, Patient Journals) and invokes .reset() on Zustand stores. This explicitly severs references to bloated state arrays, guaranteeing garbage collection and preventing runaway memory allocation across patient profile swaps.
