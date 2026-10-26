# PATIENT_CABINET_PORTAL_SPEC.md — Личный кабинет пациента и чистые EBM-контракты

## 1. Контекст и архитектурная цель (Why)
В соответствии с Директивой Создателя и архитектурными Мандатами DENTE (Мандат 8b «Anti-Monolith», Мандат 8e «Doctor Autonomy», Мандат 8n «Solo Doctor Sovereignty», Мандат 8y «Zero Pharma Paranoia», Apple HIG Touch Ergonomics):
1. **Декомпозиция CSS-монолита личного кабинета**: Файл `apps/web/src/components/portal/patientCabinet/patientCabinet.css` (289 строк) распилен на независимые модули строго $\le 120$ строк в `cabinetStyles/` с ультратонким фасадом `@import` $\le 15$ строк.
2. **Ликвидация анестезиологического блоата**: Выкошены наукообразные формулы токсичности Кларка/Янга, стрелочные спидометры передозировки и генераторы актов утилизации карпул предметно-количественного учета (ПКУ) из `anesthesiaCalculatorEngine.ts`. Стоматолог лечит зубы, а не ведет тюремный учет карпул септанеста. Внедрены чистые EBM-контракты с физиологической нормой в 1 клик и пассивным оповещением аллергий `⚠️` без блокировки кнопок.
3. **Apple HIG Touch Ergonomics (390×844)**: Устранен дефект вертикального и горизонтального переполнения flexbox в мобильной шапке модалки (`.patient-cabinet-backdrop`), устранен «многоточечный ад» в PWA таббаре (`Докумен...` заменено на `Справки`), тач-таргеты доведены до $\ge 44\times 44\text{px}$.

---

## 2. Архитектура и модули (What & Where)

### 2.1. Декомпозиция стилей личного кабинета пациента (`cabinetStyles/`)
- [`cabinetLayout.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/portal/patientCabinet/cabinetStyles/cabinetLayout.css) (115 строк $\le 120$): базовая сетка профиля, модальный контейнер кабинета, шапка с аватаром, сетка карточек, базовые паддинги.
- [`cabinetAppointments.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/portal/patientCabinet/cabinetStyles/cabinetAppointments.css) (114 строк $\le 120$): карточка ближайшего запланированного приема, кнопки быстрой отмены/переноса, QR-код ресепшена, календарный экспорт.
- [`cabinetInvoices.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/portal/patientCabinet/cabinetStyles/cabinetInvoices.css) (114 строк $\le 120$): история оплат, баланс, авансы, квитанции, банковские кнопки СБП и поле ввода SMS/OTP.
- [`cabinetDarkTheme.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/portal/patientCabinet/cabinetStyles/cabinetDarkTheme.css) (90 строк $\le 120$): глубокая тёмная тема кабинета без хардкодных цветов, токены `:root[data-theme="dark"]` и `.dark`.
- [`cabinetMobile.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/portal/patientCabinet/cabinetStyles/cabinetMobile.css) (119 строк $\le 120$): мобильный адаптив под смартфоны (390×844), PWA Bottom Navigation Bar, touch-targets $\ge 44\text{px}$, 0px горизонтального дрифта (`overflow-x: clip; max-width: 100vw;`).
- [`patientCabinet.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/portal/patientCabinet/patientCabinet.css) (10 строк $\le 15$): ультратонкий фасад импорта.

### 2.2. Ликвидация анестезиологического блоата (`anesthesiaCalculatorEngine.ts`)
- [`anesthesiaCalculatorEngine.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/visit/anesthesiaCalculatorEngine.ts):
  * Удалены импорты и экспорты ПКУ: `ANESTHESIA_PKU_PRESETS`, `create1ClickAnesthesiaPkuDisposalRecord`, `createAnesthesiaPkuFromPreset`, `generateAnesthesiaPkuDisposalAct`, `validateCarpuleExpirationDate`.
  * Удалены академические симуляторы токсичности Кларка и Янга.
  * Внедрен `get1ClickPhysiologicalNorm()`: стандартная карпула 1.7 мл (Артикаин 4% с адреналином 1:200 000 / 1:100 000 или Мепивакаин без адреналина) по умолчанию на 70 кг веса.
  * Внедрен `getPassiveAllergyNotice()`: пассивная строка `⚠️ Аллергический риск: ...` по Мандату 8y без модальных окон, без допросов и без `disabled` кнопок.
  * Сохранены клинические кардио-ворота адреналина $\le 0.04\text{ мг}$ для пациентов с ИБС/ГБ/аритмией.

---

## 3. Доказательства работоспособности (Proof & Verification)

### 3.1. Машинные проверки и тесты
1. `npm run check:encoding`: **0 ошибок** (проверено 21 679 файлов).
2. `npm run check:css-tokens`: **0 ошибок** (проверено 1 536 файлов, 17 595 использований `var()`).
3. `npx vitest run apps/web/src/components/portal/`: **16/16 test files passed, 170/170 tests passed (100%)**.
4. `npx vitest run apps/web/src/components/visit/__tests__/anesthesiaCalculatorEngine.test.ts`: **3/3 passed (100%)**.

### 3.2. Red Team 4-State Visual Proof (Playwright Chromium)
Сняты и лично отсмотрены через `read_file` 4 скриншота высокого разрешения:
1. ☀️ **PC Light (1440×900)**: [`docs/proofs/portal/01_patient_cabinet_pc_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/portal/01_patient_cabinet_pc_light.png) (449 КБ)
2. 🌙 **PC Dark (1440×900)**: [`docs/proofs/portal/02_patient_cabinet_pc_dark.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/portal/02_patient_cabinet_pc_dark.png) (585 КБ)
3. 📱 **Mobile Light (390×844)**: [`docs/proofs/portal/03_patient_cabinet_mobile_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/portal/03_patient_cabinet_mobile_light.png) (160 КБ)
4. 🌙 **Mobile Dark (390×844)**: [`docs/proofs/portal/04_patient_cabinet_mobile_dark.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/portal/04_patient_cabinet_mobile_dark.png) (164 КБ)

---

## 4. Результаты визуального аудита
- **Вертикальное и горизонтальное позиционирование**: Аватарка `В`, полное ФИО `Воронов Алексей Владимирович`, статус `Золотой (10%)` и баланс бонусов отображаются полностью, без клиппинга и сдвигов.
- **PWA Bottom Navigation Bar**: Вкладки `Обзор`, `Записи`, `План`, `Счета`, `Справки`, `Семья` отцентрированы с высотой тач-таргетов $\ge 44\text{px}$. Отсутствует обрезание многоточием.
- **Карточка ближайшего визита**: Дата и наименование процедуры разделены точкой с аккуратным отступом (`2026-12-10 • Примерка и постоянная фиксация циркониевой коронки на зуб #2.6`).
- **Сенсорные зоны Apple HIG**: Все интерактивные кнопки (`Записаться онлайн`, `Оплатить счет`, `Мой план лечения`, `Памятка после приема`, `Показать администратору`, `Я на месте / Чекин`) имеют комфортную сенсорную высоту $\ge 44\text{px}$.
