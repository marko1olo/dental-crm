# DENTE Dental CRM — Leads Funnel & Intake Ergonomics Manifest (Red Team Proof)

> 🏛️ **CONSTITUTIONAL COMPLIANCE**: Mandates 8e (Doctor Autonomy), 8n (Solo Practice Scale), 8x (Clinical Russian Language), 8ze & 8al (Apple HIG Touch Ergonomics & 4-State Proof).

---

## 📸 4-State Visual Proof Matrix

| State | Viewport | Mode | Verification Proof |
|---|---|---|---|
| ☀️ **PC Light** | 1440×900 | Clean Light Theme | [`01_pc_leads_kanban_light_1440x900.png`](./01_pc_leads_kanban_light_1440x900.png) |
| 🌙 **PC Dark** | 1440×900 | OLED High Contrast | [`02_pc_leads_kanban_dark_1440x900.png`](./02_pc_leads_kanban_dark_1440x900.png) |
| 📱 **Mobile Light** | 390×844 | Apple HIG Cards | [`03_mobile_leads_light_390x844.png`](./03_mobile_leads_light_390x844.png) |
| 📱 **Mobile Dark** | 390×844 | Thumb Zone Bottom Sheet | [`04_mobile_leads_dark_bottom_sheet_390x844.png`](./04_mobile_leads_dark_bottom_sheet_390x844.png) |

---

## 🎯 Key Architectural Refactorings & Invariants

### 1. 4 Canonical Clinical Columns (Mandates 8e, 8n)
- **Устранение слоеного пирога**: Шапка канбана сокращена до лаконичных элементов без вторичных кнопок-симуляторов.
- **4 канонических клинических этапа**:
  1. `Новые` (`new` / `contacted`)
  2. `Назначен приём` (`consult_booked`)
  3. `Дошли` (`showed_up` / `converted`)
  4. `Отказ/Архив` (`trash` / `no_answer`)
- Поддержка расширенного режима «Все этапы (6)» через сегментированный переключатель без загромождения рабочей области.

### 2. Ликвидация симуляторов и псевдо-физики
- Выжжен симулятор рекламных кликов и расходов (`FunnelBudgetAdjuster.tsx`).
- Удалена кнопка ручной настройки бюджетов из модалки аналитики (`FunnelModalPeriodBar.tsx`).
- Вся аналитика базируется исключительно на реальных данных обращений.

### 3. Вычистка канцелярита и дев-жаргона (Mandate 8x)
- Канцелярит `152-ФЗ` и `ст. 18 ФЗ «О рекламе»` заменен на человеческий русский: **«Согласия и уведомления пациента»** (*«Медицинская карта и обслуживание»* и *«Рекламные предложения и акции»*).
- Дев-жаргон `Zero Attribution Loss: источник и запрос сохраняются в карте` заменен на профессиональный клинический язык: **«Источник обращения и первичные жалобы прикрепляются к карте»**.

### 4. Сквозная связь с картотекой пациентов
- Клик по карточке лида с существующим пациентом (`lead.patientId` или `lead.existingPatient`) мгновенно открывает его электронную медицинскую карту (`onOpenPatientCard`), предотвращая создание дубликатов в базе данных.
- Для редактирования полей карточки лида сохранен компактный инструмент `Edit2` с изоляцией события клика (`e.stopPropagation()`).

### 5. Apple HIG Мобильный адаптив (Mandates 8ze, 8al)
- **Zero Desktop Squeeze**: Мобильный экран спроектирован как суверенный сенсорный слой.
- **Segmented Bar**: Устранен клиппинг русских слов в табах фильтрации (`flex: 0 0 auto`, `padding: 4px 10px`, min-height 38px, плавный горизонтальный скролл).
- **Карточки обращений**: Тач-таргеты кнопок быстрых действий (`Звонок`, `Чат`, `Записать`) $\ge 44\times 44\text{px}$.
- **Нативная шторка деталей (Bottom Sheet)**:
  * Изолирована через React Portal (`createPortal(sheet, document.body)`) от родительских CSS-трансформаций.
  * Верхний тактильный хэндл 36×5px, круглая кнопка закрытия 44×44px.
  * Основные транзакционные действия вынесены в нижнюю треть экрана (Natural Thumb Zone): Primary CTA *«Записать на приём в расписание»* (52px, teal) и *«Создать карту пациента (без записи)»*.

---

## 🧪 Machine Verification
- **Тестовый люкс**: `apps/web/src/components/leads/__tests__/*.test.ts`, `*.test.tsx`.
- **Результат**: **129 passed, 0 failed** (100% green), время выполнения 9.22с ($\le 10\text{с}$).
