# Red Team Inquisition & Purification: Schedule & Appointments Domain

## 1. Контекст и архитектурная цель (Why)
- **Ликвидация монолитов расписания (Мандат 8b: строго $\le 120$ строк на файл, фасады $\le 15$ строк или компактные композиции):**
  1. `apps/web/src/components/schedule/doctorFreeSlotsEngine.ts` (714 строк) распилен на 6 сфокусированных математических и фильтрационных модулей в `freeSlotsModules/` с чистым 13-строчным фасадом.
  2. `apps/web/src/components/schedule/useWaitlistDrawerOperations.ts` (689 строк) распилен на 7 доменных хуков в `waitlistModules/` с компактным фасадом 101 строка.
  3. `apps/web/src/components/schedule/grid/useScheduleAppointmentInteractions.ts` (672 строки) распилен на 6 сфокусированных интеракционных хуков в `interactionModules/` с фасадом 69 строк.
- **Суверенитет соло-врача и ноль бюрократии (Мандаты 8e, 8n):**
  - Без обязательных ассистентов в расписании (все роли опциональны).
  - Автопростановка 1-го кресла и врача в 0 кликов. Запись постоянного пациента в 2 клика.
  - Non-blocking debounced автосейв, отсутствие блокировок `disabled={...}` на кнопках «Сохранить», «В кресло», «Чек».
- **Apple HIG Touch Ergonomics на мобильных (390×844) & Design System (Мандаты 8al, 8am, 8ze):**
  - Мобильный Agenda View на смартфонах $\le 768$px с крупным таймлайном, цветными статусами и свободными окнами.
  - Сенсорные области тач-таргетов $\ge 44\times 44$px (`pointer-coarse:min-h-[44px]`).
  - Ровно ОДНА Primary CTA кнопка на видимый мобильный контекст: «+ Новая запись» (высота 52px, Natural Thumb Zone, плавающая нижняя панель с blur-эффектом).
  - 0px паразитного горизонтального скролла.

---

## 2. Архитектура декомпозиции (What & Where)

### А. Модули свободных окон (`freeSlotsModules/`)
- `freeSlotsTypes.ts` (116 строк): контракты интервалов, занятости кресел и врачебных окон.
- `intervalIntersectionMath.ts` (113 строк): математика пересечений временных интервалов и коллизий.
- `slotAvailabilityFilters.ts` (115 строк): фильтрация свободных окон по врачам, креслам и кабинетам.
- `freeSlotsChipFormatter.ts` (78 строк): форматирование меток времени и чипов слотов.
- `chairDoctorOccupancyTally.ts` (115 строк): подсчет загрузки кресел и врачей.
- `index.ts` (11 строк): единая точка реэкспорта.
- `doctorFreeSlotsEngine.ts` (13 строк): сверхкомпактный фасад обратной совместимости.

### Б. Модули листа ожидания (`waitlistModules/`)
- `waitlistTypes.ts` (118 строк): контракты кандидатов, слотов и быстрых действий.
- `useWaitlistData.ts` (118 строк): загрузка и кэширование записей листа ожидания.
- `useWaitlistSlotMatching.ts` (87 строк): поиск подходящих окон для пациентов листа ожидания.
- `useWaitlistContactActions.ts` (85 строк): быстрые коммуникации (звонок, мессенджер) без выхода из карточки.
- `useWaitlistQuickAdd.ts` (118 строк): быстрое добавление в лист ожидания в 1 клик.
- `useWaitlistBooking.ts` (118 строк): перемещение из листа ожидания в подтвержденную запись.
- `index.ts` (12 строк): единая точка реэкспорта.
- `useWaitlistDrawerOperations.ts` (101 строка): фасад композиции хуков.

### В. Модули сетки и интеракций (`interactionModules/`)
- `interactionTypes.ts` (33 строки): контракты контекстных меню, ховеров и зума.
- `useGridDisplaySettings.ts` (116 строк): масштабирование сетки, переключение шага времени (15/30/60 мин).
- `useAppointmentHoverAndMenu.ts` (118 строк): быстрый предпросмотр и контекстное меню визита.
- `useAppointmentDurationAndShift.ts` (118 строк): изменение длительности и сдвиг времени записи.
- `useAppointmentReassignAndWaitlist.ts` (110 строк): перенос между креслами и перемещение в лист ожидания.
- `index.ts` (11 строк): единая точка реэкспорта.
- `useScheduleAppointmentInteractions.ts` (69 строк): компактный фасад интеракций.

### Г. Эргономика мобильного бара (`ScheduleMobileBottomBar.tsx`)
- Унифицирован лейбл главной транзакционной кнопки: «+ Новая запись» (`data-testid="schedule-mobile-add-btn"`).
- Высота кнопки 52px, Natural Thumb Zone, backdrop-filter: blur(20px).

---

## 3. Доказательства работоспособности (Proof & Verification)

1. **Unit & Integration Tests:**
   - Команда: `npx vitest run apps/web/src/components/schedule/`
   - Результат: **84 passed test files, 762 passed tests, 0 failed** (Exit Code 0).
   - Все 16 тестов в `doctorFreeSlotsEngine.test.ts` зеленые.
   - Все 18 тестов в `waitlistCancellation.test.ts` зеленые.
   - Все 11 тестов в `WaitlistQuickFillModal.test.tsx` зеленые.
   - Все тесты в `scheduleDurationAndLatenessQuickAdjustWave58.test.tsx` и `scheduleAppointmentDecompositionInquisition.test.tsx` зеленые.

2. **Машинные гейты компиляции:**
   - `npm run check:encoding` $\to$ **Exit Code 0** (21 968 файлов проверено, замечаний нет).
   - `npm run check:css-tokens` $\to$ **Exit Code 0** (1 565 файлов проверено, 0 неразрешенных var, 0 ошибок).

3. **4-State Red Team Visual Proofs (сняты на живом сервере Vite 127.0.0.1:5173 через Playwright Chrome):**
   - ☀️ **01 PC Light (1440×900):** [`01_schedule_grid_pc_light_1440x900.png`](01_schedule_grid_pc_light_1440x900.png) (188 222 байт).
   - 🌙 **02 PC Dark (1440×900):** [`02_schedule_grid_pc_dark_1440x900.png`](02_schedule_grid_pc_dark_1440x900.png) (154 784 байт).
   - 📱 **03 Mobile Light (390×844):** [`03_schedule_agenda_mobile_light_390x844.png`](03_schedule_agenda_mobile_light_390x844.png) (141 721 байт).
   - 📱 **04 Mobile Dark (390×844):** [`04_schedule_agenda_mobile_dark_390x844.png`](04_schedule_agenda_mobile_dark_390x844.png) (163 712 байт).
   - Личный просмотр через `read_file`: 0 сплэш-скринов, ровно 1 Primary CTA «+ Запись» / «+ Новая запись», 0px горизонтального скролла, безупречная токенизация Dark Mode (изумрудно-обсидиановые тона).

---

## 4. Консолидация модалок быстрой записи и SSOT Расписания (Mandate 8b, 8e, 8n, 8ap, 8am)

### А. Ликвидация дублирования и Sweet Spot размера файлов (Мандат 8b / 8zi)
- **Канонический компонент:** `apps/web/src/components/schedule/QuickBookingDrawer.tsx` консолидирован в **392 строки** (целевой диапазон 300–500 строк).
- В единый модуль собраны: шапка с CITO-бейдж пульсацией, шторка с overlay, клавиатурные акселераторы (Esc, Ctrl+Enter), интеграция с пациентом/креслом/длительностью, и футер.
- **Унификация модалок:** `AppointmentBookingModal.tsx` преобразован в чистый фасадный ре-экспорт `QuickBookingDrawer as AppointmentBookingModal`, исключив параллельный 288-строчный дубль.
- `QuickBookingDrawerHeader.tsx` и `QuickBookingDrawerFooter.tsx` сохранены как фасадные ре-экспорты для 100% обратной совместимости.

### Б. Автономия соло-врача и малого кабинета (Мандаты 8e, 8n)
- 1-клик запись: Пациент (поиск/создание в 1 поле) + Время + Кресло.
- Селектор ассистента строго опционален: вариант по умолчанию `-- Без ассистента (соло-приём) --` и пояснение `Выбор ассистента строго опционален`.
- Мягкий овербукинг (Soft Overbooking): кнопка «Записать на это время (острая боль)» всегда доступна. Кнопка сохранения никогда не блокируется (`disabled`).

### В. Чистый доменный язык и снос regex-скоринга (Мандаты 8ap, 8x)
- Скоринг надежности пациента строится исключительно на нормализованных столбцах PostgreSQL 18 (`appointments.status`, количество `no_show`, `cancelled`, lateness timestamps).
- Ликвидированы ссылки на советские приказы и номера законов ("54-FZ") из комментариев и рантайма `patientAlerts.ts`.

### Г. Единый дизайн-код (Мандат 8am & Apple HIG)
- Ровно ОДНА Primary CTA кнопка в видимом контексте: `+ Записать на приём (Создать запись Ctrl+Enter)` (`#0d9488`, `bg-[var(--teal)] text-white shadow-xs font-bold`).
- Вторичные кнопки: `Отмена (Esc)`, `Сбросить`, `Скопировать для пациента` выполнены в нейтральных токенах `var(--line)` / `var(--paper)`.
- Сенсорный минимум $\ge 44\times 44$px для всех интерактивных элементов на мобильных экранах.

### Д. Доказательства (4-State Red Team Visual Proofs)
- ☀️ **PC Light (1440×900):** [`proof_schedule_quickbooking_01_pc_light_1440x900.png`](proof_schedule_quickbooking_01_pc_light_1440x900.png) (68 KB).
- 🌙 **PC Dark (1440×900):** [`proof_schedule_quickbooking_02_pc_dark_1440x900.png`](proof_schedule_quickbooking_02_pc_dark_1440x900.png) (74 KB).
- 📱 **Mobile Light (390×844):** [`proof_schedule_quickbooking_03_mobile_light_390x844.png`](proof_schedule_quickbooking_03_mobile_light_390x844.png) (55 KB).
- 📱 **Mobile Dark (390×844):** [`proof_schedule_quickbooking_04_mobile_dark_390x844.png`](proof_schedule_quickbooking_04_mobile_dark_390x844.png) (55 KB).
- **Результат инструментальной автопсии через `read_file`:** 0 дефектов верстки, идеальная адаптивность нижней шторки (Apple HIG Bottom Sheet), 0px горизонтального скролла, безупречная темная тема.

