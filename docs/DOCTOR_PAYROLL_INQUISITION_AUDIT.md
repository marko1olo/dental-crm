# DOCTOR PAYROLL, COMMISSIONS, NET REVENUE & SHIFT TIMESHEET AUDIT (MANDATES 8e, 8n, 8x, HIG)

> 🏛️ **SUPREME RED TEAM AUDIT & PURGE OF BUREAUCRATIC CODES:**  
> Autonomous audit and refactoring of Doctor Payroll, Payout Wallet, Timesheets and Commission Calculations in DENTE CRM.

---

## 1. Ликвидация советского канцелярита (Мандат 8x & 8ap)
- **Ликвидация «Т-13»**:
  - Все вхождения советской аббревиатуры «Т-13» в UI заменены на живой клинический русский язык: **«Табель смен и часов»**, **«Сводный табель смен и часов персонала»**, **«Печать табеля смен и часов»**, **«Выгрузить табель смен в CSV»**.
  - Имя скачиваемого CSV-файла табеля переведено на `табель_смен_и_часов_YYYY_MM.csv`.
- **Ликвидация «Форма Т-51»**:
  - Тосты, кнопки и контекстные меню очищены от канцелярита: вместо «Ошибка формирования бланка Т-51» -> **«Ошибка формирования расчётной ведомости»**, кнопка **«Экспорт ведомости (CSV)»**.
- **Ликвидация «ЗУП 3.1 Экспорт»**:
  - В тулбар действий добавлен нативный экспорт в 1С: **«1С:Зарплата»** (генерация EnterpriseData XML 1.13 через `calculateConsolidatedStaffPayroll` и `generateStaffPayrollXml`).

---

## 2. Архитектурная декомпозиция монолитов (Мандат 8b & Мандат 8aq)
- **Декомпозиция `DoctorPayrollTab.tsx`**:
  - Исходный монолит (195 строк) распилен на ультра-тонкий координирующий фасад в **61 строку** (норматив $\le 120$ строк строго соблюден).
  - Устранены все устаревшие `.js` расширения в импортах (`types.js`, `PayrollTabHeader.js`, `PayrollStatCards.js`, `PayrollChecksTable.js`, `PayrollChecksMobileCards.js`).
  - Выделены независимые модули:
    * [`useDoctorPayrollTabData.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/views/financeView/payrollTabModules/useDoctorPayrollTabData.ts) (100 строк) — стейт периода, выбор врача, реактивный фетчинг и расчет сдельной оплаты.
    * [`mapEarningsApiServices.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/views/financeView/payrollTabModules/mapEarningsApiServices.ts) (45 строк) — нормализация ответов бэкенда по 804н и кассовым чекам.
    * [`payrollTabExportUtils.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/views/financeView/payrollTabModules/payrollTabExportUtils.ts) (24 строки) — генерация Т-51 CSV и HTML печатных листков A4.
- **Декомпозиция модальных окон зарплаты**:
  - `DoctorPayrollModal.tsx` декомпозирован со 150 строк до **77 строк** (логика экспорта вынесена в `useDoctorPayrollModalActions.ts` — 93 строки).
  - `DoctorPayrollModalContent.tsx` декомпозирован со 139 строк до **110 строк** (выделен `PayrollEmptyDoctorState.tsx` — 45 строк).
  - `PayrollActionButtonsBar.tsx` декомпозирован со 137 строк до **104 строк** (выделен `PayrollMobileThumbBar.tsx` — 50 строк).
  - `PayrollRentalInputs.tsx` декомпозирован со 132 строк до **83 строк** (выделен `PayrollFixedRentalInputs.tsx` — 70 строк).
  - **100% модулей пакета соответствуют нормативу $\le 120$ строк**.

---

## 3. Автономия врача и суверенитет масштаба (Мандаты 8e & 8n)
- **Zero-Blocking Buttons**:
  - Кнопки («Расчетный листок», «Экспорт ведомости (CSV)», «1С:Зарплата», «В мессенджер») **НИКОГДА** не блокируются (`disabled`) из-за второстепенных полей.
- **Прозрачный Net Revenue & Вычет ЗТЛ/Материалов**:
  - Расчетная база комиссионных врача строится строго по формуле: `База = Выручка (Оплачено в кассу) - Списания ЗТЛ - Дорогие биоматериалы`.
  - Все расчеты ведутся в целочисленных копейках (`amountKopecks`, `BIGINT`).
- **Суверенитет соло-врача на аренде кресла (Мандат 8n)**:
  - Мгновенный выбор модели: «Фикс за смену» ($N$ смен $\times$ ставка) либо «Сплит 70 / 30».
  - Прозрачная экономика без бухгалтеров: выручка кассы минус аренда, ЗТЛ и материалы = 100% чистый доход врача.

---

## 4. Мобильный дизайн Apple HIG & Natural Thumb Zone (Мандаты 8am & 8ze)
- **Grouped List Cards**:
  - На экранах $\le 768\text{px}$ десктопная таблица трансформируется в группированные карточки приемов с разделителями 1px, бейджами оплат, затрат ЗТЛ/материалов и начисленной комиссией.
- **Natural Thumb Zone & Сенсорный минимум**:
  - Все кликабельные кнопки на мобильном экране имеют тач-таргет $\ge 44\times 44\text{px}$.
  - Кнопки не сжимаются и не обрезаются многоточиями, обеспечен адаптивный перенос бейджа специальности.
  - Полное отсутствие паразитного горизонтального скролла (`0px`).

---

## 5. Визуальные доказательства Red Team (4-State Visual Proofs)
Все скриншоты сняты в браузере в разрешениях 1440×900 (PC) и 390×844 (Mobile) и лично проверены инквизитором через `read_file`:

1. **PC Light (1440×900)** — [238 КБ]:  
   [`docs/proofs/payroll/01_pc_light_1440x900.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/payroll/01_pc_light_1440x900.png)  
   *Статус: [ПРОВЕРЕНО: ЧИСТО]. Ровно 1 Primary CTA кнопка («Расчетный листок»), кнопки экспорта CSV и печати 36px, 6 карточек показателей Net Revenue, таблица реестра закрытых чеков.*

2. **PC Dark (1440×900)** — [228 КБ]:  
   [`docs/proofs/payroll/02_pc_dark_1440x900.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/payroll/02_pc_dark_1440x900.png)  
   *Статус: [ПРОВЕРЕНО: ЧИСТО]. 0 слепящих белых пятен, глубокая темная тема, четкий контраст цифр и шрифтов.*

3. **Mobile Light (390×844)** — [145 КБ]:  
   [`docs/proofs/payroll/03_mobile_light_390x844.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/payroll/03_mobile_light_390x844.png)  
   *Статус: [ПРОВЕРЕНО: ЧИСТО]. Тач-таргеты $\ge 44\text{px}$, адаптивная шапка, бейдж специальности полностью видим, группированные карточки чеков, 0px горизонтального скролла.*

4. **Mobile Dark (390×844)** — [147 КБ]:  
   [`docs/proofs/payroll/04_mobile_dark_390x844.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/payroll/04_mobile_dark_390x844.png)  
   *Статус: [ПРОВЕРЕНО: ЧИСТО]. Темная тема на мобильном устройстве без дефектов.*

---

## 6. Результаты тестирования
- Запущены все наборы тестов зарплаты, табеля и смен:
  - `apps/web/src/components/payroll/__tests__/staffPayrollEngine.test.ts` (10 tests) — **PASS**
  - `apps/web/src/tests/doctorPayroll.test.ts` (11 tests, включая проверку лимитов строк $\le 120$) — **PASS**
  - `apps/web/src/components/payroll/__tests__/timesheetT13.test.ts` (6 tests) — **PASS**
  - `apps/web/src/components/payroll/__tests__/advancedPayrollComponents.test.ts` (5 tests) — **PASS**
  - `apps/web/src/components/payroll/__tests__/payrollTimesheetSoloDoctorAutonomy.test.ts` (18 tests) — **PASS**
- **Итого: 50 тестов успешно пройдены (0 failing).**

---

## 7. Волна 2: Выкос канцелярита «Т-51» в подсистеме сдельного расчёта и мобильного кошелька выплат врача
- **Тотальный выкос «Т-51» (Мандат 8x & 8ap)**:
  - `packages/shared/src/finance/netSalary/doctorNetSalaryCore.ts`: унифицированная форма Госкомстата № 1 и ОКУД 0301009 полностью заменены на современный клинический бланк **«Сдельный расчёт и зарплата врача (Doctor Earnings & Net Revenue)»**. Функция переименована в `generateDoctorEarningsPayslipHtml`.
  - `DoctorPieceRateWalletView.tsx` и `DoctorShiftEarningsWidget.tsx`: уничтожены все CSS-классы и селекторы `dpr-print-t51-btn`, `btn-print-shift-t51`, тексты переведены на живой клинический русский язык.
  - `DoctorPayoutMobileWallet.tsx` и `DoctorPayoutDashboard.tsx`: чистая сделка врача, налог НПД 0/6%, аренда кресла, ноль советского канцелярита.
  - `payroll-preview.html` и `payrollPreviewEntry.tsx`: заголовки обновлены до **«Зарплата врачей (Doctor Payroll & Net Revenue)»**.
- **Декомпозиция монолитов строго $\le 120$ строк (Мандат 8b)**:
  - Бэкенд `apps/api/src/routes/doctorEarnings/` декомпозирован на 14 специализированных модулей: `constants.ts`, `responseTypes.ts`, `types.ts`, `doctorEarningsValidation.ts`, `doctorEarningsDbQueries.ts`, `doctorEarningsHandlers.ts`, `liveLabOrdersProcessor.ts`, `calculateLiveAppointmentItem.ts`, `liveEarningsTypes.ts`, `liveEarningsCalculator.ts`, `adaptSampleAppointmentItem.ts`, `sampleSummaryCalculator.ts`, `sampleEarningsAdapter.ts`, `index.ts`.
  - Стили `apps/web/src/components/doctor/doctorPieceRateWallet.css` распилены на `doctorWalletLayout.css`, `doctorWalletCards.css`, `doctorWalletTable.css`, `doctorWalletActions.css`.
  - Компоненты `DoctorPieceRateWalletView.tsx` и `DoctorShiftEarningsWidget.tsx` декомпозированы в `pieceRateWallet/` и `shiftWidget/`.
  - Кошелек `apps/web/src/components/finance/doctorPayoutWallet/` распилен на `dateUtils.ts`, `demoDoctorVisits.ts`, `demoDoctorData.ts`, `demoSoloDoctorData.ts`, `demoShowcaseData.ts`, `types.ts`, `categoryCardComputer.ts`, `DoctorEarningsBreakdownCard.tsx`, `doctorShiftsComputer.ts`, `DoctorShiftDetailSheet.tsx`, `DoctorPayoutHistoryList.tsx`, `useDoctorPayoutWallet.ts`, `DoctorPayoutMobileWallet.tsx`.
  - Страница `DoctorPayoutDashboard.tsx` распилена на `payoutDashboard/DoctorSelectionNotice.tsx`, `payoutDashboard/DoctorPayoutMobileSection.tsx`, `payoutDashboard/usePayoutModalEventBridge.ts`, `payoutDashboard/PayoutModalWrapper.tsx`.
- **Red Team Visual Proofs (docs/proofs/doctor_earnings/)**:
  1. [`doctor_earnings_pc_light_1440x900.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/doctor_earnings/doctor_earnings_pc_light_1440x900.png) (91.7 КБ) — [ПРОВЕРЕНО: ЧИСТО].
  2. [`doctor_earnings_pc_dark_1440x900.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/doctor_earnings/doctor_earnings_pc_dark_1440x900.png) (88.6 КБ) — [ПРОВЕРЕНО: ЧИСТО].
  3. [`doctor_earnings_mobile_light_390x844.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/doctor_earnings/doctor_earnings_mobile_light_390x844.png) (145.4 КБ) — [ПРОВЕРЕНО: ЧИСТО]. Apple HIG Touch Zone, тач-таргеты $\ge 44\text{px}$, 0px паразитного скролла.
  4. [`doctor_earnings_mobile_dark_390x844.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/doctor_earnings/doctor_earnings_mobile_dark_390x844.png) (147.2 КБ) — [ПРОВЕРЕНО: ЧИСТО].
  5. [`doctor_payroll_modal_pc_light_1440x900.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/doctor_earnings/doctor_payroll_modal_pc_light_1440x900.png) (143.7 КБ) — [ПРОВЕРЕНО: ЧИСТО].
  6. [`doctor_payroll_modal_mobile_light_390x844.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/doctor_earnings/doctor_payroll_modal_mobile_light_390x844.png) (140.8 КБ) — [ПРОВЕРЕНО: ЧИСТО].
- **Результаты тестов**:
  - `apps/web/src/components/doctor/__tests__/` (6 passing, 0 failing) — **PASS**
  - `apps/web/src/components/finance/doctorPayoutWallet/__tests__/` (10 passing, 0 failing) — **PASS**
  - `apps/api/src/tests/routes/doctorEarningsRoutes.test.ts` (5 passing, 0 failing) — **PASS**
  - `npm run check:encoding` (20136 файлов) — **PASS**

