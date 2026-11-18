# Архитектурная спецификация: Управление персоналом, Профили врачей, Автономия смен и Расчет сдельной оплаты (T-51 Net Revenue)

## 1. Введение и Архитектурная цель

Данный документ фиксирует каноническую архитектуру подсистемы управления персоналом, расширенных профилей врачей, автономии смен у кресла и сдельной оплаты труда на основе чистой выручки (Net Revenue T-51) в DENTE CRM.

Спецификация разработана в соответствии с высшими архитектурными мандатами:
- **Мандат 8e (Врачебная автономия):** софт для врача, а не врач для софта. Врач приступает к приёму у кресла мгновенно, даже если администратор на ресепшене не открыл смену. Все кнопки действий доступны без блокировок.
- **Мандат 8n (Суверенитет масштаба):** первоочередной фокус на практике соло-врача (1–2 кресла, аренда/самозанятый/ИП) и малой клиники (1–3 кресла) без избыточных бюрократических требований.
- **Мандат 8x (Живой русский клинический язык):** тотальный запрет на советский канцелярит и номера приказов в интерфейсе (вместо «ФОТ» -> «Расчёт зарплаты», вместо «043/у» -> «Медицинская карта приёма»).
- **Мандат 8am & 8al (Apple HIG, единый дизайн-код):** сенсорный минимум $\ge 44\times 44\text{px}$, Natural Thumb Zone, отсутствие горизонтального дрифта (0px overflow), нативные Bottom Sheet на мобильных.

---

## 2. Структура подсистемы и ключевые компоненты

### 2.1. Расширенный профиль сотрудника (`StaffProfileCard`)
- **Desktop (1440×900):** 3-колоночный модальный экран медицинской плотности (`apps/web/src/components/settings/StaffProfileCard.tsx`):
  - **Колонка 1 (Персональные данные и реквизиты):** ФИО, телефон, логин, СНИЛС (ЕГИСЗ / ФРМР), ИНН (ФНС), № ЛМК и дата медосмотра, дата и специальность аккредитации Минздрава РФ, клинические заметки.
  - **Колонка 2 (Роли, специальности, привязка и ЗП):** Должность в клинике, 10 клинических специализаций врачей (терапевт, хирург, ортопед, ортодонт, пародонтолог, имплантолог, детский стоматолог, гигиенист, рентгенолог), привязка филиалов и кабинетов, индивидуальные ставки ЗП (процент комиссии, вычет лаборатории, вычет материалов, фиксированный оклад).
  - **Колонка 3 (Безопасность и доступы):** Смена пароля, быстрый 4-значный PIN-код для планшета у кресла, статус активности («Активен»), сброс сессий, персональные полномочия (подпись ЭМК, управление финансами).
  - **Подвал:** ровно одна Primary CTA кнопка «Сохранить карточку» (Мандат 8am).
- **Mobile (390×844):** Выделенный нативный компонент `MobileSettingsStaffView` (`apps/web/src/components/settings/mobile/MobileSettingsStaffView.tsx`):
  - Grouped Inset Cards в стиле Apple iOS Settings.
  - Кликабельные телефонные номера (`tel:`) для мгновенного вызова.
  - Кнопка «PIN-код планшета» ($\ge 44\text{px}$) и нативный Bottom Sheet для добавления сотрудников.

### 2.2. Автономия смен врача (`DoctorShiftCloseModal`, `DoctorMobileShiftAutonomy`)
- Врач открывает и закрывает смену в 1 клик с мобильного смартфона или планшета у кресла (`apps/web/src/components/doctor-portal/DoctorMobileShiftAutonomy.tsx`).
- Модальное окно закрытия смены (`DoctorShiftCloseModal.tsx`):
  - Автоматическая сводка дня: количество завершенных приёмов, общая кассовая выручка с разбивкой (нал, карта, СБП, аванс).
  - Расчет заработка врача за смену по модели Net Revenue (выручка за вычетом прямых расходов зуботехнической лаборатории и расходников).
  - 1-клик формирование акта инкассации.
  - 1-клик отправка отчёта руководителю в Telegram (`POST /api/shifts/send-shift-summary`).

---

## 3. Схема данных и валидация (`packages/shared/src/security/staffValidation.ts`)

Схема `staffProfileExtendedSchema` и `updateStaffProfileExtendedSchema`:
- Строковая валидация `id`, `organizationId`, `assignedBranches`, `assignedChairIds` (`z.string().min(1).max(120)`) для безопасной работы с любыми идентификаторами без runtime-ошибок.
- Валидаторы РФ-документов:
  - `validateStaffSnils`: алгоритм контрольной суммы СНИЛС по модулю 101.
  - `validateStaffInn`: контрольные разряды для 12-значного ИНН физлица.
  - `validateMedicalBook`: проверка срока действия ЛМК и напоминания о медосмотре.
  - `validateMinzdravAccreditation`: контроль 5-летнего цикла НМО и специальности аккредитации.

---

## 4. Верификационная матрица Red Team (4-State Visual Proof)

Все компоненты прошли обязательный инструментальный аудит в живом браузере Chromium:

| Компонент | Состояние | Разрешение | Файл скриншота | Результат |
| :--- | :--- | :--- | :--- | :--- |
| Карточка сотрудника | ☀️ PC Light | 1440×900 | `docs/proofs/staff/staff_profile_card_pc_light.png` | Чисто: 3-колоночный макет, все реквизиты, 1 CTA |
| Карточка сотрудника | 🌙 PC Dark | 1440×900 | `docs/proofs/staff/staff_profile_card_pc_dark.png` | Чисто: глубокая тёмная тема, высокая контрастность |
| Мобильный список персонала | 🌙 Mobile Dark | 390×844 | `docs/proofs/staff/staff_profile_card_mobile_dark.png` | Чисто: Apple HIG Inset Cards, тач-таргеты $\ge 44\text{px}$, 0px дрифта |
| Мобильный список персонала | ☀️ Mobile Light | 390×844 | `docs/proofs/staff/staff_profile_card_mobile_light.png` | Чисто: чистая белая подложка, читабельные бейджи |
| Закрытие смены врача | ☀️ PC Light | 1440×900 | `docs/proofs/shift/doctor_shift_close_pc_light.png` | Чисто: кассовая сводка, 1-клик инкассация, Telegram |
| Закрытие смены врача | 🌙 PC Dark | 1440×900 | `docs/proofs/shift/doctor_shift_close_pc_dark.png` | Чисто: отсутствие белых вспышек, токенизированные цвета |
| Закрытие смены врача | 🌙 Mobile Dark | 390×844 | `docs/proofs/shift/doctor_shift_close_mobile_dark.png` | Чисто: нативный Bottom Sheet, Drag Handle, Thumb Zone |
| Закрытие смены врача | ☀️ Mobile Light | 390×844 | `docs/proofs/shift/doctor_shift_close_mobile_light.png` | Чисто: кнопки $\ge 44\text{px}$, безопасный отступ снизу |

---

## 5. Гейты качества

- **TypeScript:** 0 ошибок в подсистемах staff, shift, doctor-portal (`npx tsc -p apps/web/tsconfig.json --noEmit`).
- **Vitest:** 62 passed tests (11 test suites) с 0 падений за 11.77с:
  - `apps/web/src/components/doctor-portal/__tests__/doctorMobileShiftAutonomy.test.tsx` (9 tests)
  - `apps/web/src/components/shift/__tests__/doctorShiftDecomposedTelemetryAndTimer.test.ts` (7 tests)
  - `apps/web/src/components/shift/__tests__/chairRentalShiftWidget.test.tsx` (4 tests)
  - `apps/web/src/components/shift/__tests__/mobileShiftCockpitAppleHig.test.tsx` (3 tests)
  - `apps/web/src/components/shift/__tests__/doctorShiftAutoCloseBySchedule.test.ts` (3 tests)
  - `apps/web/src/components/shift/__tests__/doctorShiftRoleSeparation.test.tsx` (5 tests)
  - `apps/web/src/components/shift/__tests__/doctorShiftCloseModalAndReportsDashboard.test.tsx` (6 tests)
  - `apps/web/src/components/doctor-portal/__tests__/doctorShiftRealityAndPurity.test.tsx` (12 tests)
  - `apps/web/src/components/shift/__tests__/cabinetHandoverAutonomy.test.tsx` (3 tests)
  - `apps/web/src/components/settings/__tests__/staffProfileAutonomyAndCommissions.test.tsx` (6 tests)
  - `apps/web/src/components/doctor-portal/__tests__/doctorShiftCockpitIntegration.test.tsx` (4 tests)
- **Кодировка UTF-8:** 0 замечаний на 14 504 файлов (`npm run check:encoding`).
