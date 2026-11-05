# 🩸 БОЕВОЙ РЕЕСТР ИНКВИЗИЦИИ DENTE CRM: ПОЛНЫЙ ДЕФЕКТ-ЛИСТ ВСКРЫТИЯ (RED TEAM DOSSIER)

> **Статус:** ЕДИНЫЙ КАНОНИЧЕСКИЙ РЕЕСТР ДЕФЕКТОВ И СИМУЛЯЦИЙ РЕАЛЬНОСТИ  
> **Дата фиксации:** 2026-11-04  
> **Основание:** Сквозной лобовой аудит 6 специализированных Red Team инквизиторов против реальных дампов и баз знаний конкурентов (**StomX 4.3.0**, **DentalPRO Expo25/26**, **IDENT**, **Vatech EzDent-i / Ez3D**, **Planmeca Romexis 6.x**).  
> **Высший принцип (Мандат 8i / Core Law):** «ЦРМ != СИМУЛЯТОР РЕАЛЬНОСТИ». Система не диктует врачам и клинике, как им жить, не выдумывает принудительные блокировки кресел и не ставит палки в колёса.

---

## 🏛️ КАТЕГОРИЧЕСКИЙ ЗАКОН СОЗДАТЕЛЯ: ЛИКВИДАЦИЯ «БЛОКИРОВОК КРЕСЕЛ» И САНОБРАБОТКИ
> 🛑 **ВЕРДИКТ:** «Блокировка кресел» и навязывание санобработки через блокирование слотов — ебаный бред и симулятор реальности, которого не должно быть!
> ЦРМ не имеет права парализовать сетку расписания выдуманными блоками санитарной обработки, мешая администраторам и врачам вести приём. Все искусственные maintenance-блоки и навязанные тайм-локи подлежат полной ликвидации из кодовой базы (`useGridDisplaySettings.ts`, `ScheduleChairMaintenancePopover.tsx`).

---

# 🔴 ВОЛНА 1: ВЫЯВЛЕННЫЕ ДЕФЕКТЫ И АРХИТЕКТУРНЫЙ ДЕБИЛИЗМ

## 1. 💰 ФИНАНСОВЫЙ КОНТУР, БИЛЛИНГ И КАССА

### [FIN-01] [SEV-1] Двойной учёт выручки (Фантомные миллионы)
- **Файл:** [`apps/api/src/services/reports/managerReports/financialExecutiveReports.ts#L102-L150`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/reports/managerReports/financialExecutiveReports.ts#L102-L150)
- **Суть бага:** В расчёте валовой выручки суммируются все входящие транзакции: `cashRub + cardRub + sbpRub + depositRub`.
- **Чем ломает клинику:** Если пациент внес 50 000 ₽ аванса на депозит наличными, а затем оплатил коронку с депозита, в отчете клиники фиксируется 100 000 ₽ выручки (50 000 ₽ взяты из воздуха).
- **Сравнение:** В 1С, DentalPRO и StomX аванс — это пассив (Кт 62.02). Зачет аванса не увеличивает валовый оборот.

### [FIN-02] [ИСПРАВЛЕНО] Обнуление зарплат врачей при кассовых платежах
- **Файлы:**
  - [`apps/web/src/components/cashbox/CashRegisterStudioModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/cashbox/CashRegisterStudioModal.tsx)
  - [`apps/web/src/components/finance/CashierStudioModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/CashierStudioModal.tsx)
  - [`apps/api/src/routes/cashbox/cashboxPaymentProcessor.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/cashbox/cashboxPaymentProcessor.ts)
  - [`apps/api/src/services/reports/managerReports/doctorReports.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/reports/managerReports/doctorReports.ts)
- **Суть бага:** Кассовые модалки не передавали `visitId` (`visitId: undefined` либо поле вовсе опущено). В таблице `payments` поле `visitId` сохранялось как `NULL`, обнуляя зарплату врача до 0 ₽.
- **Статус ликвидации [ИСПРАВЛЕНО]:**
  1. В `CashRegisterStudioModalProps` и `CashierStudioModalProps` введено обязательное свойство `visitId`.
  2. В `CashRegisterStudioModal.tsx` и `CashierStudioModal.tsx` значение `visitId` передается в теле POST `/api/cashbox/payments`.
  3. В `cashboxPaymentProcessor.ts` реализован отказоустойчивый двухуровневый резолвер: если `visitId` не передан, он автоматически извлекается из `patientInvoices` по `invoiceId`, а при его отсутствии — привязывается к последнему дневному приёму пациента.
  4. В `doctorReports.ts` в запросе `revenueRows` добавлен джойн через `patientInvoices` и `coalesce(payments.visitId, patientInvoices.visitId)`, гарантируя 100% учет выручки врача в зарплатной ведомости.

### [FIN-03] [ИСПРАВЛЕНО] Моки ложного успеха при сбое бэкенда (Тихий грабеж)
- **Файлы:**
  - [`apps/web/src/components/cashbox/CashRegisterStudioModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/cashbox/CashRegisterStudioModal.tsx)
  - [`apps/web/src/components/finance/CashierStudioModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/CashierStudioModal.tsx)
- **Суть бага:** В блоке `catch` вызывался `props.onSuccess(fallbackResult)` и модалка закрывалась при сетевом сбое или 500 ошибке бэкенда.
- **Статус ликвидации [ИСПРАВЛЕНО]:**
  1. Симулятор ложного успеха полностью вырезан из `CashRegisterStudioModal.tsx` и `CashierStudioModal.tsx`.
  2. При ошибках сети, отказе ОФД или статусе ответа `!res.ok` модалка остается открытой, выводится четкий информативный алерт об ошибке с возможностью повтора. Колбэк `onSuccess` вызывается строго при подтвержденном ответе сервера.

### [FIN-04] [SEV-1] Аппаратный паралич ККТ через 24 часа (54-ФЗ)
- **Файл:** [`apps/api/src/services/hardware/lanKktDriverService.ts#L18-L95`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/hardware/lanKktDriverService.ts#L18-L95)
- **Суть бага:** В драйвере ККТ нет методов `closeShift`, `openShift`, `printZReport`. В `shiftReconciliationEngine.ts` фискальные номера синтезируются формулой. Команда на физический АТОЛ/Штрих-М не шлется.
- **Чем ломает клинику:** По 54-ФЗ через 24 часа фискальный накопитель блокируется аппаратно («Смена превысила 24 часа») и прекращает печать любых чеков.

### [FIN-05] [SEV-1] Оплата несуществующим депозитом
- **Файл:** [`apps/api/src/routes/cashbox/cashboxPaymentProcessor.ts#L280-L345`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/cashbox/cashboxPaymentProcessor.ts#L280-L345)
- **Суть бага:** Метод `deposit` не проверяет и не уменьшает баланс пациента. Пациент с нулевым балансом может «оплатить» миллион рублей, и сервер ответит 200 OK.

### [FIN-06] [SEV-1] Нарушение 54-ФЗ (Тег 1030 — Наименование предмета расчета)
- **Файлы:** [`executeFiscalPayment.ts#L50`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/fiscalHandlersModules/executeFiscalPayment.ts#L50), [`CashierStudioModal.tsx#L133`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/CashierStudioModal.tsx#L133)
- **Суть бага:** В чек всегда шлется единственная заглушка «Стоматологические услуги по плану лечения» вместо номенклатуры процедур. Прямое нарушение 54-ФЗ со штрафами до 10 000 ₽ за каждый чек.

### [FIN-07] [ИСПРАВЛЕНО] [SEV-2] Архитектурная шизофрения и конфликт лаунчеров
- **Файлы:** [`CashRegisterStudioModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/cashbox/CashRegisterStudioModal.tsx) vs [`CashierStudioModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/CashierStudioModal.tsx)
- **Суть бага:** Две параллельные кассовые студии открывались одновременно при переходе по роуту `#checkout`, накладываясь друг на друга в DOM.
- **Решение:** Утвержден единый SSOT кассы: `CashRegisterStudioModal.tsx` является единственной канонической модалкой кассы и фискального чекаута в системе (Мандат 8aq). Дублирующая модалка `CashierStudioModal.tsx` редуцирована до ультра-тонкого прозрачного фасада (<80 строк), прозрачно проксирующего вызовы в SSOT. Ликвидирован карнавал кнопок, обеспечена ровно 1 Primary CTA кнопка («Принять оплату / Пробить чек»), 1-клик комбо-оплата в копейках (`amountKopecks`, BigInt) и отсутствие обязательного ИНН для физлиц. Подтверждено тестом `cashierSSOTSuite.test.tsx` (18/18 тестов green).

### [FIN-08] [ИСПРАВЛЕНО] [SEV-1] Ликвидация зоопарка из 7 модалок оплаты в Единый Канонический Чекаут DENTE CRM
- **Файлы:**
  - SSOT: [`CashRegisterStudioModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/cashbox/CashRegisterStudioModal.tsx)
  - Фасады: [`CashRegisterCheckoutModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/billing/CashRegisterCheckoutModal.tsx), [`CashCheckoutStudioModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/billing/CashCheckoutStudioModal.tsx), [`PaymentFiscalModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/billing/PaymentFiscalModal.tsx), [`PaymentModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/billing/PaymentModal.tsx), [`SplitPaymentModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/billing/SplitPaymentModal.tsx), [`CashRegisterDrawer.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/billing/CashRegisterDrawer.tsx), [`CashRegisterPaymentPane.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/billing/CashRegisterPaymentPane.tsx)
- **Суть бага:** В `components/billing/` исторически расплодили 7 параллельных модалок с дублированием логики оплат, несовместимыми сигнатурами пропсов и риском расхождения финансовых проводок.
- **Решение:**
  1. Консолидация в единый полиморфный чекаут на базе `CashRegisterStudioModal.tsx` с чистым API, проксирующими фасадами (<30 строк) для сохранения обратной совместимости call sites.
  2. Крупная итоговая сумма по центру (36px bold): `checkout-total-amount` в рублях.
  3. Мгновенный выбор 7 тендеров: [ Наличные | Терминал (Карта) | СБП QR | Рассрочка | Гарантия 100% (0 ₽) | Сплит-оплата | Депозит / аванс ].
  4. Строгая копеечная математика: `amountKopecks: bigint`, ноль float-ошибок.
  5. Автономия врача (Мандат 8e, 8n): гарантийные переделки со скидкой 100% оформляются в 1 клик с суммой 0 ₽ без ошибки `ZeroAmountPayment` и без принудительного фискального чека.
  6. Пассивная безопасность: аллергии отображаются аккуратным бейджем `⚠️` строго при их наличии в карте.
  7. Apple HIG: на мобильных устройствах нативный Bottom Sheet со скруглением `rounded-t-[24px]`, тактильным Drag Handle 36x5px и широкой кнопкой подтверждения $\ge 48$px в Natural Thumb Zone.
  8. Устранены слепящие белые пятна табов и кнопок в тёмной теме (100% dark mode hygiene).
- **Машинные пруфы:**
  - `billingSSOTSuite.test.tsx` + тесты биллинга: 9 файлов, 77 тестов PASSED (Exit Code 0).
  - `cashbox.test.ts`: 2/2 бэкенд теста PASSED (Exit Code 0).
  - **4-State Proof скриншоты (Live App на `http://127.0.0.1:5173/?checkout=1` без песочниц, Мандат 8al & Правило 23):**
    * ☀️ PC Light: [`docs/proofs/cashbox/01_cashbox_studio_pc_light_1440x900.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/cashbox/01_cashbox_studio_pc_light_1440x900.png) (88 KB)
    * 🌙 PC Dark: [`docs/proofs/cashbox/02_cashbox_studio_pc_dark_1440x900.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/cashbox/02_cashbox_studio_pc_dark_1440x900.png) (84 KB)
    * 📱 Mobile Light: [`docs/proofs/cashbox/05_cashbox_studio_mobile_light_390x844.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/cashbox/05_cashbox_studio_mobile_light_390x844.png) (137 KB)
    * 🌙 Mobile Dark: [`docs/proofs/cashbox/06_cashbox_studio_mobile_dark_390x844.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/cashbox/06_cashbox_studio_mobile_dark_390x844.png) (133 KB)
    * Дополнительные табы смены и чековой ленты:
      - 🌙 Смена и Z-отчёт: [`docs/proofs/cashbox/03_cashbox_shift_pc_dark_1440x900.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/cashbox/03_cashbox_shift_pc_dark_1440x900.png) (50 KB)
      - ☀️ Контрольная лента: [`docs/proofs/cashbox/04_cashbox_tape_pc_light_1440x900.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/cashbox/04_cashbox_tape_pc_light_1440x900.png) (42 KB)

---

## 2. 🦷 ЗУБОТЕХНИЧЕСКАЯ ЛАБОРАТОРИЯ И ОРТОПЕДИЯ

### [LAB-01] [SEV-1] Тихий угон чужого пациента при создании наряда — [ЗАКРЫТО]
- **Файл:** [`apps/api/src/routes/lab/ordersCrudModules/labOrderInsertDb.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/lab/ordersCrudModules/labOrderInsertDb.ts)
- **Суть бага:** Ранее при отсутствии `patientId` или отсутствии совпадения в БД сервер молча брал первого попавшегося пациента из таблицы `patients` клиники (`limit(1)`) и вешал наряд ЗТЛ на него.
- **Решение:** Полностью ликвидирован тихий угон. Сервер строго проверяет наличие `patientId` и принадлежность организации; при отсутствии или невалидности возвращает ошибку `{ kind: "patient_not_found" }` (HTTP 404 PatientNotFound). Подтверждено тестом `labRedTeamConsolidation.test.ts`.

### [LAB-02] [SEV-1] Разрыв связки наряда ЗТЛ с планом лечения и сметой — [ЗАКРЫТО]
- **Файлы:** [`apps/api/src/routes/lab/labTypesModules/labMaterialAndShadeTypes.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/lab/labTypesModules/labMaterialAndShadeTypes.ts), [`apps/api/src/routes/lab/ordersCrudModules/labOrderValidationSchemas.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/lab/ordersCrudModules/labOrderValidationSchemas.ts), [`apps/api/src/routes/lab/ordersCrudModules/labOrderInsertDb.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/lab/ordersCrudModules/labOrderInsertDb.ts)
- **Суть бага:** В нарядах ЗТЛ отсутствовала поддержка полей связки с планом лечения, приемом и визитом (`treatmentPlanId`, `appointmentId`, `visitId`).
- **Решение:** В Zod-схемы `createLabOrderSchema`, `updateLabOrderSchema` и DTO `labOrderInsertDb.ts` внедрены поля `treatmentPlanId`, `appointmentId`, `visitId`. Структурированные метаданные связки фиксируются в `clinicalNotes` и возвращаются в обогащенном объекте заказа `enrichedOrder`.

### [LAB-03] [SEV-1] Вычет чужой лаборатории из зарплаты терапевтов — [ЗАКРЫТО]
- **Файл:** [`apps/api/src/routes/doctorEarnings/appointmentLabBudget.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/doctorEarnings/appointmentLabBudget.ts)
- **Суть бага:** Если у врача за период не было ортопедической выручки (`orthoSum <= 0`), весь счет ЗТЛ пациента списывался с первого попавшегося терапевтического приема (пломба, профгигиена), создавая отрицательную зарплату терапевту за чужие коронки.
- **Решение:** Алгоритм `buildAppointmentLabBudget` переписан: при `orthoSum <= 0` вычет ЗТЛ для приемов врача строго равен 0 копеек. Списание лаборатории производится строго с приемов, имеющих ортопедическую выручку, пропорционально доле ортопедии. Подтверждено тестом `labRedTeamConsolidation.test.ts`.

### [LAB-04] [SEV-1] Мертвая таблица `lab_items` (Dead Schema) — [ЗАКРЫТО]
- **Файлы:** [`apps/api/src/routes/lab/ordersCrudModules/labOrderInsertDb.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/lab/ordersCrudModules/labOrderInsertDb.ts), [`apps/api/src/routes/lab/labTypesModules/labMaterialAndShadeTypes.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/lab/labTypesModules/labMaterialAndShadeTypes.ts)
- **Суть бага:** Таблица `lab_items` существовала в БД, но в нее никогда не производилась запись при создании наряда ЗТЛ.
- **Решение:** Таблица `lab_items` полностью оживлена. В `labOrderInsertDb.ts` при создании наряда позиции зубов FDI (как из массива `items`, так и из нотации `toothFdi`) парсятся, валидируются через `VALID_FDI_TOOTH_NUMBERS` и атомарно вставляются отдельными строками в `lab_items` с привязкой к `labOrderId`, материалом, шкалой VITA и распределением стоимости.

### [LAB-05] [SEV-2] Превращение рутинной примерки в рекламацию/брак — [ЗАКРЫТО]
- **Файл:** [`apps/api/src/routes/lab/labTypesModules/labOrderStatusAndTrackingTypes.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/lab/labTypesModules/labOrderStatusAndTrackingTypes.ts)
- **Суть бага:** Рутинные клинические статусы нахождения работы в клинике на примерке (`fitting`, `fitting_scheduled`, `fitting_in_mouth`, `Примерка`) ошибочно мапились в статус `refitting` (переделка/брак/рекламация).
- **Решение:** Функция `mapStageToLabOrderStatus` исправлена: клинические этапы примерки (`fitting`, `fitting_scheduled`, `fitting_in_mouth`, `Примерка`, `Примерка во рту`) возвращают канонический статус `"received"` (работа получена в клинике для примерки). Статус `"refitting"` возвращается строго для реальных переделок и рекламаций (`correction_remake`, `warranty_rework`, `refitting`, `rework`, `Переделка`, `Рекламация`). Подтверждено тестом `labRedTeamConsolidation.test.ts`.



### [LAB-06] [SEV-2] Визуальный Red Team аудит и эргономика мобильного и десктопного интерфейса ЗТЛ — [ЗАКРЫТО]
- **Файлы:**
  - [`DentalLabOrderModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/lab/DentalLabOrderModal.tsx)
  - [`DentalLabExpressConfigurator.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/lab/DentalLabExpressConfigurator.tsx)
  - [`KanbanCardHeader.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/lab/kanbanCardModules/KanbanCardHeader.tsx)
  - [`KanbanCardBody.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/lab/kanbanCardModules/KanbanCardBody.tsx)
  - [`FilterBarSegmentedChips.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/lab/filterBarModules/FilterBarSegmentedChips.tsx)
  - [`FilterBarSearchInput.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/lab/filterBarModules/FilterBarSearchInput.tsx)
  - [`dentalLabFilterBar.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/lab/styles/dentalLabFilterBar.css)
- **Суть замечаний Red Team Инквизитора:**
  1. Утечка дев-жаргона в оранжевом баннере модалки («Мандат 8e: Автономия врача» и кнопка «Клинический оверрайд врача»).
  2. Обрезание текста на табе («[Расчет и]») и чипе («[PMMA CAD,]»).
  3. Слипшийся текст в карточке пресетов («Цвет: A2+5 раб. дн.»).
  4. Слипшийся текст в карточках канбана («ЗТЛ-1000Зубы: 11», «14 500 рубСебест: 7 000 руб», «Срок: 07.11.2026Примерка: —»).
  5. Нестилизованный греческий символ дельты `Δ` перед счетчиком задержек.
- **Статус ликвидации [ЗАКРЫТО]:**
  1. Текст баннера финансового шлюза переведен на строгий клинический язык: *«Аванс пациента менее 50%. Врач вправе направить наряд в лабораторию под клиническую ответственность.»*, кнопка переименована в *«Направить без аванса»*.
  2. Табы и чипы защищены от клиппинга: таб *«Расчет и печать»* отображается полностью; чип *«PMMA CAD/CAM»* виден целиком; на мобильных 390px внедрены лаконичные подписи и скроллируемая полоса.
  3. В карточках пресетов добавлен аккуратный разделитель *«Цвет: A2 • +5 раб. дн.»*.
  4. В заголовке и теле карточки канбана внедрены явные буллит-разделители и flexbox: *«ЗТЛ-1000 • Зубы: 11»*, *«14 500 руб. • Себест: 7 000 руб.»*, *«Срок: 07.11.2026 • Примерка: —»*.
  5. Дельта заменена на аккуратную векторную иконку Lucide `AlertCircle`.
  6. Все 8 эталонных скриншотов (PC и Mobile Light/Dark для хаба и модалки наряда) обновлены в `docs/proofs/lab/` и лично проверены через `read_file`.

---

## 3. 📦 СКЛАД, АВТОКЛАВИРОВАНИЕ И САНПИН

### [WH-01] [ЗАКРЫТО] Раздувание модалок прихода/накладных (6 штук) и парсинг через regex
- **Файлы:**
  - [`InboundWaybillModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/inventory/InboundWaybillModal.tsx) (Канонический SSOT)
  - [`WarehouseInboundInvoiceModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/inventory/WarehouseInboundInvoiceModal.tsx) (Тонкий фасад)
  - [`AcceptanceWaybillsModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/inventory/AcceptanceWaybillsModal.tsx) (Тонкий фасад)
  - [`invoiceDraftAndItems.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/inventory/supplierInvoices/invoiceDraftAndItems.ts)
  - [`invoiceStatusAndApproval.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/inventory/supplierInvoices/invoiceStatusAndApproval.ts)
- **Суть бага:** Раздувание 6 параллельных модалок накладных (`InboundWaybillModal`, `WarehouseInboundInvoiceModal`, `AcceptanceWaybillsModal`, `InboundInvoiceModal`, `ExpressWaybillModal`, `WaybillEditorModal`).
- **Статус ликвидации [ЗАКРЫТО]:**
  1. Консолидировано строго в 1 каноническую SSOT-модалку приходной накладной `InboundWaybillModal.tsx` с FEFO контролем, печатью ТОРГ-12, экспортом CSV, поддержкой копеечного расчета (`priceKopecks`, BIGINT math) и быстрыми шаблонами пресетов (Септанест, Filtek, OptiBond, ProTaper).
  2. Все дублирующие файлы (`WarehouseInboundInvoiceModal.tsx`, `AcceptanceWaybillsModal.tsx`) схлопнуты в тонкие прозрачные фасады-реэкспорты (<= 15 строк).
  3. Тесты `warehouseInboundWaybill.test.ts` и `AcceptanceWaybillsModal.test.tsx` полностью подтверждают работоспособность единого эталона.

### [WH-02] [ЗАКРЫТО] Инвентаризация ТМЦ и персистентность списаний
- **Файлы:**
  - [`useInventoryViewAudit.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/inventory/viewModules/useInventoryViewAudit.ts)
  - [`writeOffSoftOverdraft.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/inventory/writeOffModules/writeOffSoftOverdraft.ts)
  - [`warehouseOperations.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/warehouse/warehouseOperations.js)
- **Суть бага:** Инвентаризация ТМЦ выполняла слепые корректировки без надлежащей фиксации в складском журнале и без погашения овердрафта.
- **Статус ликвидации [ЗАКРЫТО]:**
  1. Обеспечена персистентность через журнал складских проводок `inventory_transactions` с типом операции `receipt` / `adjustment` и `allowOverdraft: true`.
  2. Мягкий овердрафт (Мандат 8aa, 8n): дефицитные остатки не блокируют приём врача, отрицательное сальдо отображается понятным клиническим бейджем и автоматически погашается при оприходовании приходной накладной.
  3. Проведены тесты мягкого овердрафта `warehouseSoftOverdraftAndTechCardInquisitor.test.ts` и `inventorySoftOverdraft.test.ts` (12 из 12 passed).

### [WH-03] [ЗАКРЫТО] Раздувание модалок списания (7 штук) и маршрут списания смены
- **Файлы:**
  - [`ConsumablesBatchWriteoffModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/inventory/ConsumablesBatchWriteoffModal.tsx) (Канонический SSOT)
  - [`ConsumablesDeductionModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/inventory/ConsumablesDeductionModal.tsx) (Тонкий фасад)
  - [`BatchWriteoffModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/inventory/BatchWriteoffModal.tsx) (Тонкий фасад)
  - [`WarehouseBatchWriteoffModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/inventory/WarehouseBatchWriteoffModal.tsx) (Тонкий фасад)
  - [`ShiftBatchWriteoffModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/inventory/ShiftBatchWriteoffModal.tsx) (Тонкий фасад)
  - [`ShiftBatchDeductionModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/inventory/ShiftBatchDeductionModal.tsx) (Тонкий фасад)
  - [`ClinicalWriteoffModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/inventory/writeoff/ClinicalWriteoffModal.tsx) (Тонкий фасад)
  - [`shiftSummaryQueries.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/treatmentConsumables/shiftBatch/shiftSummaryQueries.ts)
- **Суть бага:** 7 параллельных модалок списания с дублирующейся логикой и раздуванием кодовой базы.
- **Статус ликвидации [ЗАКРЫТО]:**
  1. Все 7 модалок списания консолидированы строго в 1 канонический SSOT: `ConsumablesBatchWriteoffModal.tsx`.
  2. Файлы `ConsumablesDeductionModal.tsx`, `BatchWriteoffModal.tsx`, `WarehouseBatchWriteoffModal.tsx`, `ShiftBatchWriteoffModal.tsx`, `ShiftBatchDeductionModal.tsx`, `ClinicalWriteoffModal.tsx` схлопнуты в тонкие прозрачные фасады-делегаты (<= 35 строк).
  3. Каноническая модалка бесшовно поддерживает как пакетное списание за смену/день, так и точечное списание у кресла по услугам и техкартам 804н (BOM).
  4. Прогон тестов: `consumablesBatchWriteoffDecomposition.test.tsx` (5 из 5 passed), `warehouseSuite.componentsRender2.test.tsx` (4 из 4 passed), `inventorySoftOverdraft.test.ts` (12 из 12 passed).

### [WH-04] [ЗАКРЫТО] Отсутствие коэффициента фасовки (упаковка vs карпула)
- **Файлы:**
  - [`inventoryUnitsSsot.ts`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/inventory/inventoryUnitsSsot.ts)
  - [`inventoryItemsTable.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/db/schema/inventory/inventoryItemsTable.ts)
  - [`invoiceStatusAndApproval.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/inventory/supplierInvoices/invoiceStatusAndApproval.ts)
  - [`stockDeductionStepExecutor.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/treatmentConsumables/stockDeductionModules/stockDeductionStepExecutor.ts)
- **Суть бага:** 5 коробок Септанеста (по 50 карпул) падали в БД как `quantity = 5`. Процедура списывала 1 карпулу. Через 5 пациентов система объявляла овердрафт, хотя в шкафу 245 карпул.
- **Статус ликвидации [ЗАКРЫТО]:**
  1. В `packages/shared/src/inventory/inventoryUnitsSsot.ts` добавлена поддержка `packageMultiplier` при конвертации единиц `pack` <-> `carpule` / `pcs` / `ampoule`.
  2. В таблицу `inventory_items` добавлена колонка `packageMultiplier: numeric("package_multiplier", { precision: 10, scale: 3 }).default("1.000")` и выполнена миграция в БД PostgreSQL.
  3. В оприходовании накладных (`invoiceStatusAndApproval.ts`) реализована функция `detectPackageMultiplier` (автоопределение 50 карпул для Септанеста, 100 для Ультракаина/Артикаина, либо явное поле накладной), расчет эффективного количества `effectiveReceivedQty` и цены единицы `effectivePricePerUnit`, а также сохранение коэффициента в карточку номенклатуры и партии FEFO.
  4. В процедурном списании `stockDeductionStepExecutor.ts` и `shiftSummaryQueries.ts` списание карпул пересчитывает остатки упаковок с учетом `packageMultiplier` (1 карпула = 0.02 упаковки при фасовке 50).
  5. Red Team интеграционные тесты `packageMultiplierFefoInquisition.test.ts` (2 passed) и `materialsAutoDeductionAndUnitsSsot.test.ts` (9 passed) полностью подтвердили корректность списания без ложного овердрафта.
  1. В `packages/shared/src/inventory/inventoryUnitsSsot.ts` добавлена поддержка `packageMultiplier` при конвертации единиц `pack` <-> `carpule` / `pcs` / `ampoule`.
  2. В таблицу `inventory_items` добавлена колонка `packageMultiplier: numeric("package_multiplier", { precision: 10, scale: 3 }).default("1.000")` и выполнена миграция в БД PostgreSQL.
  3. В оприходовании накладных (`invoiceStatusAndApproval.ts`) реализована функция `detectPackageMultiplier` (автоопределение 50 карпул для Септанеста, 100 для Ультракаина/Артикаина, либо явное поле накладной), расчет эффективного количества `effectiveReceivedQty` и цены единицы `effectivePricePerUnit`, а также сохранение коэффициента в карточку номенклатуры и партии FEFO.
  4. В процедурном списании `stockDeductionStepExecutor.ts` и `shiftSummaryQueries.ts` списание карпул пересчитывает остатки упаковок с учетом `packageMultiplier` (1 карпула = 0.02 упаковки при фасовке 50).
  5. Red Team интеграционные тесты `packageMultiplierFefoInquisition.test.ts` (2 passed) и `materialsAutoDeductionAndUnitsSsot.test.ts` (9 passed) полностью подтвердили корректность списания без ложного овердрафта.

### [WH-05] [ИСПРАВЛЕНО] Захардкоженная медсестра в журнале СанПиН и консолидация автоклава
- **Файлы:**
  - [`SanpinStudioModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/sanpin/SanpinStudioModal.tsx)
  - [`SanPinSterilizationJournal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/sanpin/SanPinSterilizationJournal.tsx)
  - [`SterilizationBatchCycleModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/sanpin/SterilizationBatchCycleModal.tsx)
  - [`SanpinRegisters.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/sanpin/SanpinRegisters.tsx)
  - [`sanpin.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/sanpin/sanpin.css)
- **Суть бага:** В коде было зашито: `useState("Иванова Е. С., дежурная медсестра")` и `useState("Иванова Е. С., медсестра ЦСО")`. Все циклы автоклава и наклейки на крафт-пакеты подписывались вымышленной Ивановой. В Node-тестах импорт CSS в `SanpinRegisters.tsx` вызывал падение из-за `ERR_UNKNOWN_FILE_EXTENSION`. В тёмной теме модалки СанПиН кнопки пресетов пакетов и кнопка закрытия имели слепящие белые пятна.
- **Статус ликвидации [ИСПРАВЛЕНО]:**
  1. Захардкоженные строки персонажей полностью ликвидированы во всех компонентах стерилизации (`SanPinSterilizationJournal`, `SterilizationBatchCycleModal`, `SanpinKraftPacketsTab`, `usePsoRegisterLogic`, `sanpinDefaultCycles`, `sanpinCatalogData`).
  2. Внедрено динамическое извлечение авторизованного пользователя из контекста клиники через `useOptionalAppLogicContext()`, сессию `appLogic?.auth?.currentUser` и кэш `getCachedActiveStaffUser()` с безопасным клиническим дефолтом «Дежурный администратор / медицинская сестра».
  3. В `SanpinRegisters.tsx` внедрен безопасный гвард `if (typeof document !== "undefined") import("./SanpinRegisters.css");`, ликвидировавший падение тестов в Node/tsx.
  4. В `sanpin.css` и `SanpinStudioModal.tsx` устранена слепящая белизна в Dark Mode для кнопок пресетов и закрытия (100% токены темы `var(--paper)`).
  5. Соблюден Мандат 8b Sweet Spot: `SterilizationBatchCycleModal.tsx` уложен ровно в 351 строку (норматив 250–360).
  6. Машинная верификация: 362 теста ЭМК и СанПиН (`emr/__tests__`, `sanpin/__tests__`) пройдены со статусом PASS 100% (0 ошибок).
  7. Сняты и лично проинспектированы через `read_file` 8 канонических скриншотов 4-State Proof на живом сервере:
     - EMR: `docs/screenshots/emr/01_emr_studio_pc_light_1440x900.png`, `02_emr_studio_pc_dark_1440x900.png`, `03_emr_studio_mobile_light_390x844.png`, `04_emr_studio_mobile_dark_390x844.png`.
     - SanPiN: `docs/screenshots/sanpin/01_sanpin_studio_pc_light_1440x900.png`, `02_sanpin_studio_pc_dark_1440x900.png`, `03_sanpin_studio_mobile_light_390x844.png`, `04_sanpin_studio_mobile_dark_390x844.png`.

---

## 4. 🦷 КЛИНИЧЕСКИЙ КОНТУР И ОДОНТОГРАММА

### [CLN-01] [ИСПРАВЛЕНО] Самосаботаж голосовой диктовки одонтограммы
- **Файл:** [`dictationToothUpdates.ts#L42-L76, 185-198`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/dictationToothUpdates.ts#L42-L76)
- **Суть бага:** Бэкенд распознает диагнозы («кариес», «пульпит», «пломба», «коронка»), но фронтенд считал их «неоднозначными» и блокировал выставление, требуя от врача отмечать зубы руками.
- **Статус ликвидации [ИСПРАВЛЕНО]:**
  1. Реализован надежный маппер `resolveToothStateFromDictationRow(row)`, который извлекает клинический статус напрямую из `clinicalState`, кодов МКБ-10 (`K02.*`, `K04.0`, `K04.5`, `K08.1`), русских заголовков диагнозов (`diagnosisTitle`), а также клинических ключевых слов (`state`).
  2. Поддержаны все канонические состояния: кариес, пульпит, пломба, коронка, удален, имплант, здоровый зуб, периодонтит, винир, штифт.
  3. Искусственный барьер «ambiguous diagnosis» ликвидирован: распознанные команды сразу применяются к зубам через `directUpdates`, а в ручной ввод (`manual`) отправляются только действительно нераспознанные фразы.
  4. Набор модульных тестов `dictationToothUpdates.test.ts` (11 из 11) горит зеленым.

### [CLN-02] [ИСПРАВЛЕНО] Выставление счетов за коронки 5-летней давности
- **Файлы:**
  - [`useOdontogramApplyToothState.ts#L44-L50`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/useOdontogramApplyToothState.ts#L44-L50)
  - [`odontogramModuleConstants.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/odontogramModuleConstants.ts)
  - [`useOdontogramEventsListener.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/visit/toothSync/useOdontogramEventsListener.ts)
- **Суть бага:** Отметка статуса зуба на первичном осмотре безусловно вызывала `dente-add-services-to-invoice`. Старая коронка пациента попадала в сегодняшний кассовый чек на 28 500 ₽.
- **Статус ликвидации [ИСПРАВЛЕНО]:**
  1. Разделены два принципиально разных клинических контекста: «ПЕРВИЧНЫЙ СТАТУС / АНАМНЕЗ» (старая коронка, пломба, удаленный зуб — 0 ₽) vs «ВЫПОЛНЕННОЕ СЕГОДНЯ ЛЕЧЕНИЕ» (добавление услуги в чек визита).
  2. В `dispatchOdontogramSoapAndBundle` и события одонтограммы добавлен флаг `isTreatmentPerformedToday`.
  3. Состояния анамнеза (`Crown`, `Bridge`, `Bridge_Abutment`, `Filled`, `Root_Canal_Treated`, `Implant`, `Veneer`, `Inlay`, `Missing`, `Extracted`, `Healthy`, `Retained`) при первичном осмотре имеют стоимость строго 0 ₽ — событие `dente-add-services-to-invoice` не генерируется, черновик ЗТЛ не создается.
  4. Слушатель `useOdontogramEventsListener.ts` начисляет услуги в счет визита ТОЛЬКО при явном флаге `detail.isTreatmentPerformedToday === true`.
  5. Прогон сквозных тестов одонтограммы (42 файла, 422 теста) и специализированных Red Team тестов (`redTeamBookingAndBillingInquisition.test.ts`) подтверждает корректность 100% GREEN.

### [CLN-03] [SEV-1] Затирание истории дефектов зуба
- **Файл:** [`statusRoutes.ts#L127-L144`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/odontogram/statusRoutes.ts#L127-L144)
- **Суть бага:** Фронтенд пишет в `tooth_states` со строковым полем `state: text`. Если у зуба с коронкой появился пришеечный кариес, выбор кариеса стирает коронку из БД.

### [CLN-04] [SEV-2] 403 из 448 протоколов — синтетический суррогат
- **Файл:** [`protocolsResolver.ts#L27-L44`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/visit/soapEditor/protocolsResolver.ts#L27-L44)
- **Суть бага:** В коде забито только 45 протоколов. Остальные 403 генерируют синтетическую воду, хотя все 448 аутентичных JSON лежат нераспарсенными в `outpatient_templates_FULL/`.

### [CLN-05] [ИСПРАВЛЕНО] Тотальная интеграция одонтограммы Wheeler 2.5D и ликвидация кнопочных заглушек
- **Файлы:**
  - [`apps/web/src/components/odontogram/OdontogramStudioModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/OdontogramStudioModal.tsx)
  - [`apps/web/src/components/odontogram/DirectOdontogramLauncher.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/DirectOdontogramLauncher.tsx)
  - [`apps/web/src/components/odontogram/anatomicalDualArch/AnatomicalGate0Cell.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/anatomicalDualArch/AnatomicalGate0Cell.tsx)
  - [`apps/web/src/components/odontogram/gate0/AnatomicalTooth.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/gate0/AnatomicalTooth.tsx)
  - [`apps/web/src/components/odontogram/gate0/Tooth46StandHeader.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/gate0/Tooth46StandHeader.tsx)
- **Суть бага:** В боевом интерфейсе одонтограммы (`OdontogramStudioModal.tsx`, `DirectOdontogramLauncher.tsx`) сохранялись устаревшие кнопочные заглушки с серыми квадратиками `18 [3] -` вместо векторной одонтограммы Wheeler 2.5D. Калибр бейджей резцов $R=18.5$ сливался в частокол ($>48$px), перекрывая апексы корней. Дебаг-сленг («Мокап 32», «Лаборатория размеров») вылезал в продакшн интерфейс.
- **Статус ликвидации [ИСПРАВЛЕНО]:**
  1. В `OdontogramStudioModal.tsx` полностью демонтирован архаичный кнопочный муляж `renderToothTile` (серые кнопки 64x64px), смонтирована полноценная анатомическая одонтограмма `AnatomicalGate0FullArchView` Wheeler 2.5D для десктопа и аккуратная 4x2 сетка Wheeler для мобильных устройств (Apple HIG touch $\ge 44\times 44$px, `min-h-[84px]`).
  2. Восстановлен прецизионный калибр Wheeler $R=14.0$ (диаметр 28px) в `AnatomicalGate0Cell.tsx` и `AnatomicalTooth.tsx`, ликвидирован забор-слияние резцов и обеспечен чистый воздушный зазор $\ge 20$px.
  3. Дебаг-сленг зачищен: все названия приведены к клиническим стандартам DENTE Wheeler 2.5D, ноль канцелярита и ноль дев-терминов в интерфейсе врача.
  4. В `DirectOdontogramLauncher.tsx` интегрирована гидратация из `loadTeethFromLocalCache` и сохранение через `OdontogramStudioModal` с отправкой на Fastify API `/api/odontogram/tooth-state` и IndexedDB.
  5. Прогон всех 87 тестовых файлов одонтограммы (750 тестов) — 100% GREEN.
  6. Ликвидированы 7 дефектов первого инквизиционного аудита скриншотов:
     - [Дефект 1]: Ликвидирован клиппинг штампа «• Р Ретинированный» (контейнер переведен на `flex-wrap`, ширина модалки расширена до 1360px).
     - [Дефект 2]: Вся зубная дуга из 16 зубов (18..11 и 21..28) полностью и свободно помещается в видимой области без обрезки по краям (`zoom={0.46}`, ширина ячейки калибрована).
     - [Дефект 3]: Контраст корней верхних зубов в Dark Mode повышен до WCAG AAA (`#94a3b8` stroke, контраст 7.6:1 на фоне `#0f172a`).
     - [Дефект 4]: Дев-жаргон «Wheeler 2.5D» в шапке заменен на профессиональный клинический заголовок «Анатомическая зубная формула».
     - [Дефект 5]: Хвастовство в футере заменено на клиническую подсказку: «Выберите зуб для детального осмотра и фиксации патологий».
     - [Дефект 6]: Ликвидирован мобильный клиппинг ФИО пациента: компактный формат «Иванов С. П. (34 г.)» отображается без срезок и многоточий.
     - [Дефект 7]: Ликвидирован плавающий кругляш-клякса Copilot FAB («✨») над кнопкой «Сохранить» по Apple HIG.
  7. Сняты и лично проинспектированы эталонные 4-state скриншоты:
     - ☀️ PC Light 1440×900 (`docs/proofs/odontogram/01_odontogram_pc_light.png`)
     - 🌙 PC Dark 1440×900 (`docs/proofs/odontogram/02_odontogram_pc_dark.png`)
     - 📱 Mobile Light 390×844 (`docs/proofs/odontogram/03_odontogram_mobile_light.png`)
     - 📱 Mobile Dark 390×844 (`docs/proofs/odontogram/04_odontogram_mobile_dark.png`)

---

## 5. 📅 РАСПИСАНИЕ И СЕТКА КРЕСЕЛ

### [SCH-01] [SEV-1] Санобработка и блокировка кресел в localStorage
- **Файл:** [`useGridDisplaySettings.ts#L75-L81`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/schedule/grid/interactionModules/useGridDisplaySettings.ts#L75-L81)
- **Суть бага:** Блокировки кресел пишутся в `localStorage` конкретного браузера. Другие ПК видят слот свободным.
- **Директива Создателя:** Данную механику принудительной блокировки кресел полностью ликвидировать (ЦРМ не диктует реальности какой быть).

### [SCH-02] [ИСПРАВЛЕНО] Лист ожидания: фантомная запись без запроса в БД и тупики лаунчера
- **Файлы:**
  - [`apps/api/src/routes/waitlist.ts#L305-L375`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/waitlist.ts#L305-L375)
  - [`WaitlistDrawer.tsx#L50-L130`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/schedule/waitlist/WaitlistDrawer.tsx#L50-L130)
  - [`DirectWaitlistMatchesLauncher.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/schedule/DirectWaitlistMatchesLauncher.tsx)
  - [`WaitlistMatchesBlock.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/schedule/waitlist/WaitlistMatchesBlock.tsx)
  - [`ScheduleViewModals.tsx#L143-L160`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/schedule/view/ScheduleViewModals.tsx#L143-L160)
- **Суть бага:**
  1. В `DirectWaitlistMatchesLauncher.tsx` блок `WaitlistMatchesBlock` вел в тупик: при клике на «Открыть лист» событие `dente:open-waitlist-for-slot` никем не слушалось, шторка `WaitlistDrawer` не была смонтирована.
  2. В Fastify API `apps/api/src/routes/waitlist.ts` Zod схемы (`updateSchema`, `statusSchema`) падали с ошибкой 400 при отправке статуса `booked`, так как принимали строго `["active", "waiting", "fulfilled", "cancelled"]`.
  3. В `WaitlistDrawer.tsx` при отсутствии сетевого контекста клик «Записать» падал или не имел отказоустойчивого перехода на создание слота.
- **Статус ликвидации [ИСПРАВЛЕНО]:**
  1. **Fastify API:** В `apps/api/src/routes/waitlist.ts` добавлена нативная поддержка статуса `"booked"` в Zod enum `updateSchema` и `statusSchema`: `z.enum(["active", "waiting", "fulfilled", "booked", "cancelled"])`.
  2. **DirectWaitlistMatchesLauncher:** Полностью переработан по Мандату 8b (120 строк) и 8aq. Смонтирован `WaitlistDrawer`, добавлен слушатель `dente:open-waitlist-for-slot` и коллбек `onOpenWaitlist`. При клике на «Открыть лист» шторка плавно выдвигается сбоку с предвыбранным целевым слотом (`targetSlot`) и ранжированными кандидатами (Zero Dead-Ends).
  3. **Боевое бронирование слота:** В `WaitlistDrawer.tsx` и `ScheduleViewModals.tsx` реализован двухфазный обработчик:
     - При существующем слоте — отправляет `PATCH /api/appointments/${slot.appointmentId}` со статусом `planned`.
     - При новом окне — отправляет `POST /api/appointments` с `doctorUserId`, `startsAt`, `endsAt`, `chairId`.
     - Переводит статус заявки листа ожидания в `"booked"` через `PATCH /api/waitlist/${candidate.id}/status` и снимает пациента из очереди активных.
     - Вызывает `loadDashboard()`, закрывает шторку и выводит toast-подтверждение.
  4. **Apple HIG эргономика:** Табы переработаны в аккуратный Segmented Control `[ 🎯 Подбор ]`, `[ 📋 Все ]` с отдельной secondary кнопкой `[ + Добавить ]`. Тотальный запрет клиппинга, ровно 1 Primary CTA (`#0d9488`), WCAG AA/AAA Dark/Light.
  5. **Тесты и 4-State Proofs:**
     - `waitlistMatches.test.ts` (7/7 pass)
     - `waitlistCancellation.test.ts` (18/18 pass)
     - `waitlistBookingFastifyParity.test.ts` (2/2 pass)
     - Скриншоты:
       * `docs/proofs/schedule/schedule_waitlist_matches_block_pc_light_1440x900.png`
       * `docs/proofs/schedule/schedule_waitlist_drawer_pc_light_1440x900.png`
       * `docs/proofs/schedule/schedule_waitlist_drawer_pc_dark_1440x900.png`
       * `docs/proofs/schedule/schedule_waitlist_booked_success_pc_light_1440x900.png`

### [SCH-03] [SEV-1] Клик по визиту убивает правый инспектор модальным оверлеем
- **Файлы:** [`ScheduleGridDesktopLayout.tsx#L51-L60`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/schedule/grid/ScheduleGridDesktopLayout.tsx#L51-L60), [`ScheduleViewBody.tsx#L359`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/schedule/view/ScheduleViewBody.tsx#L359)
- **Суть бага:** Одинарный клик по карточке распахивает полноэкранный `QuickBookingDrawer` (`z-[10005]`), перекрывая 0-клик инспектор.

---

## 6. 🩻 ТОМОГРАФИЯ (КЛКТ 3D MPR) И РАДИОЛОГИЯ

### [RAD-01] [ИСПРАВЛЕНО] Падение Fastify-сервера при запуске внешних вьюверов
- **Файл:** [`pacsExternalViewerLaunch.ts#L67-L87`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging/pacsModules/pacsExternalViewerLaunch.ts#L67-L87)
- **Суть бага:** Метод `spawn` вызывался без обязательного слушателя события `child.on('error', ...)` перед вызовом `child.unref()`. Любой сбой запуска бинарника (отсутствие файла на хосте, антивирус, поврежденный PE-заголовок, ошибки прав доступа) генерировал неперехваченный `ENOENT` в Node.js event loop и МГНОВЕННО УБИВАЛ весь Fastify-сервер клиники! Также в командную строку необоснованно передавались невалидные флаги `/open` и `-study`, ломавшие парсеры CLI Vatech Ez3D-i, Planmeca Romexis и Carestream.
- **Статус ликвидации [ИСПРАВЛЕНО]:**
  1. **Критический барьер стабильности Fastify:** Обработчик `child.on('error', (err) => { request.log.warn(...) })` зарегистрирован ДО вызова `child.unref()`. Любые асинхронные ошибки запуска дочернего процесса безопасно перехватываются, логируются и не крашат сервер.
  2. **Строгая валидация исполняемых файлов:** Добавлена проверка `fs.existsSync(targetExe)`, `fs.statSync(targetExe).isFile()` и валидация расширения `.exe`.
  3. **Чистые нативные аргументы CLI:** Ликвидированы вредоносные флаги `/open` и `-study`. Аргументы передаются чистым массивом `[pathToUse]` (путь к директории исследования или DICOMDIR), что обеспечивает 100% совместимость со всеми сертифицированными вьюверами (Vatech Ez3D-i, Planmeca Romexis, Carestream CS 3D Imaging, Sidexis, RadiAnt, NNT, Explorer).
  4. **Тестовое покрытие:** Реализован и успешно пройден пакет тестов [`pacsExternalViewerLaunch.test.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging/__tests__/pacsExternalViewerLaunch.test.ts), симулирующий `ENOENT` сбой `spawn` и проверяющий целостность Node.js event loop.

### [RAD-02] [ИСПРАВЛЕНО] Синхронный фриз браузера на 8 секунд при распаковке КТ
- **Файл:** [`realDicomZipLoader.ts#L36-L95`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/dicomLoader/realDicomZipLoader.ts#L36-L95)
- **Суть бага:** Использование синхронного метода `fflate.unzipSync` блокировало главный поток JavaScript на 8+ секунд при распаковке КТ архивов размером 300–600 МБ, замораживая UI клиники, анимации и вызывая панику врачей и OOM-сбои вкладки браузера.
- **Статус ликвидации [ИСПРАВЛЕНО]:**
  1. **Ликвидация блокирующего `unzipSync`:** Метод `unzipSync` полностью удален из кодовой базы.
  2. **Асинхронная потоковая декомпрессия:** Распаковка переведена на потоковый стрим `fflate.Unzip` с регистрацией асинхронных декомпрессоров `fflate.AsyncUnzipInflate` (и фоллбеком на `UnzipInflate`).
  3. **Чанкинг и отзывчивость UI:** ZIP-поток скармливается порциями по 2 МБ (`CHUNK_SIZE = 2 * 1024 * 1024`) с обязательной уступкой потока `await yieldToEventLoop()`, благодаря чему главный поток браузера никогда не фризится.
  4. **Честный непрерывный прогресс 0..100%:** Реализован гладкий расчет прогресса: 2%..35% во время асинхронного извлечения файлов с выводом точного количества найденных срезов и 35%..100% при построении воксельного 3D объема в VRAM.
  5. **Защита памяти и GC:** Фильтрация файлов (`__MACOSX`, `._`, `DICOMDIR`) выполняется на этапе `onfile` без вызова `file.start()`, исключая бесполезную декомпрессию мусорных файлов; временные чанки среза очищаются немедленно после склейки.
  6. **Тестовое покрытие:** Реализован и успешно пройден пакет тестов [`realDicomZipLoaderAsync.test.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/__tests__/realDicomZipLoaderAsync.test.ts).
  7. **Визуальные пруфы 4-State Proof:** Сняты и верифицированы скриншоты:
     - ☀️ PC Light (1440x900): [`docs/proofs/radiology/01_radiology_pc_light_1440x900.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/radiology/01_radiology_pc_light_1440x900.png) (423.8 KB)
     - 🌙 PC Dark (1440x900): [`docs/proofs/radiology/02_radiology_pc_dark_1440x900.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/radiology/02_radiology_pc_dark_1440x900.png) (423.4 KB)
     - 📱 Mobile Light (390x844): [`docs/proofs/radiology/03_radiology_mobile_light_390x844.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/radiology/03_radiology_mobile_light_390x844.png) (904.4 KB)
     - 📱 Mobile Dark (390x844): [`docs/proofs/radiology/04_radiology_mobile_dark_390x844.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/radiology/04_radiology_mobile_dark_390x844.png) (903.9 KB)

### [RAD-03] [SEV-1] Фальшивая симуляция визиографа
- **Файл:** [`hardwareDetection.ts#L45-L59`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/sensorGateway/hardwareDetection.ts#L45-L59)
- **Суть бага:** При отсутствии датчика безусловно возвращается `isDetected: true: "Vatech EzSensor HD готов к экспозиции"`.


---

# 🔴 ВОЛНА 2: ВЫЯВЛЕННЫЕ ДЕФЕКТЫ И АРХИТЕКТУРНЫЙ ДЕБИЛИЗМ

## 7. 💬 МЕССЕНДЖЕРЫ, WHATSAPP, TELEGRAM И CRM-АВТОМАТИЗАЦИЯ

### [MSG-01] [SEV-1] Фантомная отправка из UI-чатов клиники (Silent Blackhole Send)
- **Файлы:**
  - [`apps/api/src/routes/communicationRoutes/messagingRoutes/inboxMessageSender.ts#L77-L94`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communicationRoutes/messagingRoutes/inboxMessageSender.ts#L77-L94)
  - [`apps/web/src/components/chat/useWhatsAppChatLogic.ts#L130-L149`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/chat/useWhatsAppChatLogic.ts#L130-L149)
  - [`apps/web/src/components/communications/mobileMessenger/useMobileMessageSender.ts#L47-L61`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/communications/mobileMessenger/useMobileMessageSender.ts#L47-L61)
- **Суть бага:** При клике «Отправить» в чате карточки пациента обработчик `processSendMessage` **не вызывает никаких провайдеров и очередей**. Он просто делает `db.insert(communicationEvents).values({ status: "sent" })`. Врач видит зеленую галочку, но пациенту ничего не отправляется!

### [MSG-02] [SEV-1] 100% отказ напоминаний WhatsApp вне 24h окна (Отсутствие HSM шаблонов)
- **Файлы:**
  - [`apps/api/src/services/communications/channelRouter.ts#L249-L270`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/communications/channelRouter.ts#L249-L270)
  - [`apps/api/src/whatsappTransport.ts#L159-L166`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/whatsappTransport.ts#L159-L166)
- **Суть бага:** Все напоминания шлются обычным текстом `type: "text"`. Meta Cloud API отклоняет любые сообщения вне 24-часового окна ошибкой `131047`. 100% напоминаний новым и спящим пациентам падают в статус `failed`. Эндпоинт `/api/whatsapp/templates/sync` возвращает захардкоженный мок-массив `DEFAULT_APPROVED_TEMPLATES`.

### [MSG-03] [SEV-1] Постоперационные боты опроса самочувствия — брошенный зомби-код
- **Файлы:**
  - [`apps/api/src/services/telegram/postOpCare/postOpPipelineCore.ts#L44-L46`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/telegram/postOpCare/postOpPipelineCore.ts#L44-L46)
  - [`apps/api/src/services/communications/dispatchWorker.ts#L14-L25`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/communications/dispatchWorker.ts#L14-L25)
- **Суть бага:** Пайплайн создает задачи опроса (+3ч, +24ч, +72ч, +7д) в таблице `communicationTasks` и RAM-карте `activeCarePlans`, но фоновый воркер `dispatchWorker.ts` **никогда не читает и не отправляет эти задачи**. Пациенты после удаления или имплантации никогда не получают опрос о боли/кровотечении. При перезапуске сервера стейт в памяти исчезает.

### [MSG-04] [SEV-2] Фальшивая симуляция WhatsApp Web (QR Matrix Simulator)
- **Файлы:** [`apps/api/src/services/messaging/whatsappConnectionHub.ts#L72-L169`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/messaging/whatsappConnectionHub.ts#L72-L169), [`whatsappConnectionHub.ts#L304-L319`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/messaging/whatsappConnectionHub.ts#L304-L319)
- **Суть бага:** Нет библиотек Baileys / WppConnect. Код генерирует случайный SVG из `randomBytes(32)`. При сканировании официальный WhatsApp выдает ошибку. В коде открыт эндпоинт `POST /api/whatsapp/qr/session/simulate-auth`, который насильно ставит статус «подключено» с фейковым номером `+7 (999) 123-45-67`.

### [MSG-05] [SEV-2] Заглушка 501 на отправку в MAX и саботаж очереди
- **Файлы:** [`apps/api/src/routes/max.ts#L462-L470`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/max.ts#L462-L470), [`channelRouter.ts#L50`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/communications/channelRouter.ts#L50)
- **Суть бага:** Транспорт `maxTransport.ts` написан, но `/api/max/send` бросает `501 MaxSendNotImplemented`, а канал `max` исключен из списка доставщиков, подавляя отправку.

### [MSG-06] [SEV-3] Хардкод прикрепления файлов в мобильном мессенджере
- **Файл:** [`apps/web/src/components/communications/mobileMessenger/useMobileMessageSender.ts#L76-L79`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/communications/mobileMessenger/useMobileMessageSender.ts#L76-L79)
- **Суть бага:** Клик по скрепке в чате вшивает имя файла `"Прицельный_снимок_16_зуб.jpg"` вместо открытия диалога выбора файла.


## 8. 🌐 ПАЦИЕНТСКИЙ ПОРТАЛ (PWA) И ОНЛАЙН-ЗАПИСЬ

### [POR-01] [SEV-1] Захват чужой медкарты 043/у через Telegram WebApp (Account Takeover)
- **Файл:** [`apps/api/src/routes/patientPortal.ts#L413-L485`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patientPortal.ts#L413-L485)
- **Суть бага:** В `POST /auth/telegram-webapp` клиент передает любой `phone`. Сервер **не проверяет** принадлежность телефона пользователю Telegram и выдает рабочий 30-дневный JWT-токен на чужого пациента! Атакующий получает выписку карты 043/у, паспортные данные, СНИЛС и все диагнозы МКБ-10 любого пациента или главврача клиники (грубейшее нарушение 323-ФЗ и 152-ФЗ).

### [POR-02] [SEV-1] Неавторизованный слив и перезапись 3D КЛКТ/STL (IDOR в Mock Storage)
- **Файл:** [`apps/api/src/routes/portal/portalMockStorageRoutes.ts#L66-L87, L149-L170`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/portal/portalMockStorageRoutes.ts#L66-L87)
- **Суть бага:** Эндпоинты `/mock-storage/download` и `/mock-storage/upload` открыты без авторизации. Проверка изоляции тенанта обходится тривиально: если анонимный клиент **не передает** заголовок `x-organization-id`, переменная `callerOrg` равна `undefined`, блок проверки пропускается, и любой желающий может скачать или перезаписать 500-мегабайтный файл томографии КТ/STL любой клиники.

### [POR-03] [SEV-1] Фантомная онлайн-запись при сбое базы данных
- **Файл:** [`apps/api/src/services/publicBookingQueue/bookingQueueProcessor.ts#L228-L272`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/publicBookingQueue/bookingQueueProcessor.ts#L228-L272)
- **Суть бага:** При ошибке транзакции СУБД код ловит ошибку в `catch`, переключается на временный in-memory массив и рапортует клиенту: `CONFIRMED: "Запись успешно подтверждена!"`. В PostgreSQL запись **не попадает**, врач в CRM её не видит. Пациент приходит на фантомный визит к занятому креслу.

### [POR-04] [SEV-1] Фантомная отправка SMS и захардкоженные мастер-пароли
- **Файл:** [`apps/api/src/services/publicBookingQueue/bookingVerificationEngine.ts#L54-L89`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/publicBookingQueue/bookingVerificationEngine.ts#L54-L89)
- **Суть бага:** `requestPhoneVerification` генерирует код в памяти и возвращает «SMS-код отправлен», но **никакой реальной отправки SMS не делает**! В коде зашит мастер-обход `'0000'`, `'1234'`, `'000000'`, `'123456'`, позволяющий войти под любым номером без SMS.

### [POR-05] [SEV-2] Запись с сайта без SMS-кода (Спам-паралич расписания)
- **Файлы:** [`apps/api/src/routes/publicBooking/bookingModules/publicBookingSchemas.ts#L61`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/publicBooking/bookingModules/publicBookingSchemas.ts#L61), [`publicBookingMutations.ts#L187-L195`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/publicBooking/bookingModules/publicBookingMutations.ts#L187-L195)
- **Суть бага:** Поле `verificationCode` в схеме помечено как `.optional()`. Если злоумышленник не передает код, проверка просто не вызывается, и бронь создается в БД напрямую. Любой бот может заспамить и забить сетку клиники на 3 месяца вперед.

### [POR-06] [SEV-2] Захардкоженный план на 540 000 ₽ всем подряд (Mock Diorama)
- **Файл:** [`apps/api/src/routes/portal/portalDocumentsRoutes.ts#L366-L595`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/portal/portalDocumentsRoutes.ts#L366-L595)
- **Суть бага:** В `GET /treatment-plans` всем пациентам безусловно отдается статичный JSON на 540к со Straumann BLX и винирами e.max, полностью игнорируя реальные жалобы и одонтограмму пациента.

### [POR-07] [SEV-2] Невалидный фальшивый QR-код СБП
- **Файлы:** [`apps/api/src/routes/portal/portalPaymentsRoutes.ts#L89-L97`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/portal/portalPaymentsRoutes.ts#L89-L97), [`portalUtils.ts#L133-L150`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/portal/portalUtils.ts#L133-L150)
- **Суть бага:** QR-код синтезируется как случайный шум из SHA-256 с фейковым счетом `"40702810938000123456"`. Банковские приложения (Сбер, Т-Банк) его не распознают.


## 9. 📞 ТЕЛЕФОНИЯ, СОФТФОН И КОЛЛ-ЦЕНТР

### [TEL-01] [SEV-1] Исходящие вызовы — 100% симуляция (Click-to-Call — фикция)
- **Файл:** [`apps/api/src/routes/telephony/telephonyOutboundHandler.ts#L38-L73`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telephony/telephonyOutboundHandler.ts#L38-L73)
- **Суть бага:** При `POST /api/telephony/outbound-call` сервер генерирует фейковый ID `outbound-${Date.now()}-...`, сразу пишет в базу статус `completed` и рассылает WebSocket-событие. В Mango, Zadarma или Asterisk AMI **не уходит ни одного сетевого пакета**. Звонок не происходит.
- **Во фронтенде:** [`useFloatingDialActions.ts#L30-L52`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/telephony/telephonyFloatingWidget/quickActions/useFloatingDialActions.ts#L30-L52) кнопка «Позвонить» даже не шлет запрос к бэкенду — она локально выставляет `status: "answered"` в Zustand и крутит секундомер в браузере.

### [TEL-02] [SEV-1] Муляж WebRTC SIP софтфона
- **Файл:** [`TelephonyAudioStreamManager.ts#L47-L190`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/store/telephonyModules/telephonyAudioStreamManager.ts#L47-L190)
- **Суть бага:** Во всем монорепозитории ровно 0 упоминаний `RTCPeerConnection` (нет ни JsSIP, ни sip.js). Захват микрофона и воспроизведение RTP никем не вызываются. Статистика аудио захардкожена: `jitterMs: 12`, `packetsLost: 0`.

### [TEL-03] [SEV-1] Дыра безопасности вебхука АТС для всего интернета
- **Файл:** [`telephonyOutboxService.ts#L35, L140-L360`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/telephonyOutboxService.ts#L35)
- **Суть бага:** Эндпоинт `POST /api/telephony/webhook/async` открыт без авторизации (`authenticatePbxWebhook` импортирован, но никогда не вызывается). Любой желающий может спамить фейковыми звонками и создавать лиды.

### [TEL-04] [SEV-1] Звонки от новых пациентов исчезают из истории
- **Файл:** [`telephonyWebhookEndedService.ts#L49-L60`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telephony/telephonyWebhookEndedService.ts#L49-L60)
- **Суть бага:** Звонок пишется в `communication_events` только если найден существующий пациент. Так как у нового звонящего карточки еще нет, а колонка `patient_id` строго `NOT NULL`, звонки первичных пациентов **вообще не сохраняются в историю**.

### [TEL-05] [SEV-2] Студия телефонии сидит на моках
- **Файл:** [`TelephonyStudioModal.tsx#L273-L296`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/telephony/TelephonyStudioModal.tsx#L273-L296)
- **Суть бага:** Отображает статичный каталог `TELEPHONY_CATALOG_DATA` вместо реальных записей разговоров из базы данных.

---

## 10. 📊 АНАЛИТИКА РУКОВОДИТЕЛЯ, ДАШБОРДЫ И МЕТРИКИ

### [ANL-01] [SEV-1] Подмена живых данных моками при статусе `isLiveApi: true`
- **Файл:** [`apps/web/src/components/analytics/analyticsCatalogData.ts#L352-L408`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/analytics/analyticsCatalogData.ts#L352-L408)
- **Суть бага:** Структура услуг («Терапия 42%», «Ортопедия 32%») и когорты возврата пациентов никогда не запрашиваются из БД — в UI зашит статичный массив. Если в клинике нет врачей, в живой интерфейс подмешиваются вымышленные «Смирнова Е. В.» и «Иванов Д. С.», а часы в кресле генерируются формулой `visits * 0.9`. При этом флаг сообщает `isLiveApi: true`.

### [ANL-02] [SEV-1] Четыре взаимоисключающих алгоритма выручки (Финансовый рассинхрон)
- **Файлы:**
  - `dashboardRoutes.ts#L184-L202` (считает по `createdAt`, игнорирует возвраты `refunded`).
  - `executiveKpiQuery.ts#L217-L234` (считает по `createdAt`, вычитает возвраты).
  - `financialExecutiveReports.ts#L103-L118` (считает по `paidAt`, вычитает возвраты).
  - `revenueReports.ts#L47-L64` (считает по `paidAt`, игнорирует возвраты).
- **Суть бага:** Цифры выручки на соседних экранах системы гарантированно расходятся.

### [ANL-03] [SEV-1] Смешение оплат между кассами при закрытии смены
- **Файл:** [`shiftReconciliationEngine.ts#L106-L116`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/cashbox/cashboxShiftModules/shiftReconciliationEngine.ts#L106-L116)
- **Суть бага:** В `payments` нет поля `cashBoxId`. Закрытие смены на кассе 1 приплюсовывает безналичные платежи и переводы с кассы 2 всей клиники.

### [ANL-04] [SEV-2] Искажение загрузки кресел на 110% (84 часа в неделю)
- **Файлы:** [`utilizationRoutes.ts#L82-L91`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/analytics/utilizationRoutes.ts#L82-L91), [`executiveKpiQuery.ts#L128`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/analytics/executiveKpiQuery.ts#L128)
- **Суть бага:** Доступное время кресла считается как 12 часов ежедневно (84 часа в неделю), включая выходные и праздники, игнорируя реальный график работы клиники из `organizations.clinicSchedule` (40 часов). При 100% плотной записи соло-клиника получает показатель «Загрузка 47%».

### [ANL-05] [SEV-2] Дыра в классификации первички: `reason IS NULL`
- **Файл:** [`apps/api/src/routes/analytics/dashboardRoutes.ts#L236-L247`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/analytics/dashboardRoutes.ts#L236-L247)
- **Суть бага:** Любой повторный приём, где администратор оставил поле `reason` пустым (`is null`), ошибочно классифицируется системой как первичная консультация.


## 11. ⚖️ ДОКУМЕНТООБОРОТ, ИДС (1051н), ДОГОВОРЫ И НАЛОГОВЫЙ ВЫЧЕТ (КНД 1151156)

### [DOC-01] [ЗАКРЫТО] [SEV-1] Печать чистого белого листа в браузере (@media print CSS Conflict)
- **Файлы:**
  - [`apps/web/src/styles/printStyles/printMediaOptimization.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/printStyles/printMediaOptimization.css)
  - [`apps/web/src/components/documents/documents.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/documents/documents.css)
  - [`apps/web/src/components/documents/documentsStudio.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/documents/documentsStudio.css)
  - [`apps/web/src/components/orthopedics/OrthopedicPassportA4Modal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/orthopedics/OrthopedicPassportA4Modal.tsx)
  - [`apps/web/src/components/lab/styles/dentalLabPrintAndMobile.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/lab/styles/dentalLabPrintAndMobile.css)
  - [`apps/web/src/components/emr/emrStyles/emrTreatmentProtocol.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/emr/emrStyles/emrTreatmentProtocol.css)
  - [`apps/web/src/components/loyalty/program/loyaltyLedger.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/loyalty/program/loyaltyLedger.css)
  - [`apps/web/src/components/sanpin/kraft/styles/kraftMobileAndPrint.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/sanpin/kraft/styles/kraftMobileAndPrint.css)
  - [`apps/web/src/components/shift/styles/shiftStudio.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/shift/styles/shiftStudio.css)
  - [`apps/web/src/components/treatment-plans/styles/printA4Appendix.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/treatment-plans/styles/printA4Appendix.css)
  - [`apps/web/src/components/documents/professionalA4/MedicalCardSheetPage1.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/documents/professionalA4/MedicalCardSheetPage1.tsx)
  - [`apps/web/src/components/documents/professionalA4/MedicalCardSheetPage2.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/documents/professionalA4/MedicalCardSheetPage2.tsx)
  - [`apps/web/src/components/documents/OutpatientCardPrintModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/documents/OutpatientCardPrintModal.tsx)
  - [`apps/web/src/components/documents/DirectDocumentsLauncher.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/documents/DirectDocumentsLauncher.tsx)
- **Суть бага:** 
  1. Селектор `body > *:not(.print-layer):not(.pro-a4-viewport) { display: none !important; }` скрывал прямой потомок `body` — элемент `<div id="root">`, в котором смонтировано все React-дерево.
  2. Гнилое зерно старых стилей: в 8 модулях было прописано правило `body * { visibility: hidden !important; }`, из-за чего браузер делал скрытыми все элементы внутри `#root`.
  3. В результате диалог печати браузера `window.print()` из модалок и страниц выдавал 100% пустой белый лист.
- **Инженерное решение (Ликвидация брака):**
  1. Полная ликвидация селекторов `body > *:not(...)` и `body * { visibility: hidden }` во всех CSS-файлах монорепозитория.
  2. Разрешено отображение `html, body, #root { overflow: visible !important; height: auto !important; display: block !important; }`.
  3. Де-модализация: плавающие модалки и бэкдропы (`[role="dialog"]`, `.fixed.inset-0`) преобразуются в статические прозрачные контейнеры (`position: static`, `background: transparent`, `max-height: none`).
  4. Скрытие служебных каркасных элементов (`.no-print`, `nav`, `aside`, `.app-header`, `.app-sidebar`, тулбары, заголовки и футеры модалок).
  5. Внедрен водяной знак «ЧЕРНОВИК» под углом -32° и статусная плашка для открытых визитов, либо официальный штамп «✓ Подписано врачом (ЭМК зафиксирована)» для завершенных приёмов (Мандат 8e).
  6. Все 4 канонических пакета (Договор, ИДС 1051н, Справка ФНС КНД 1151156, ЭМК Карта приёма) проверены в `@media print`.
- **Верификация и доказательства:**
  - 59/59 точечных тестов пройдены успешно (`professionalA4PrintComponents.test.tsx`, `FastClinicalPrintEngine.test.tsx`, `documentsStudioSSOT.test.tsx`, `documentsAndFnsInquisition.test.tsx`, `outpatientForm043AndPatientCardAutonomy.test.tsx`).
  - 11 канонических скриншотов сняты на живом приложении (1440x900 PC Light/Dark, 390x844 Mobile Light/Dark, A4 @media print Договор, ИДС, ФНС, ЭМК Черновик, ЭМК Подписано) и лично проверены через `read_file`. Полноценный двухстраничный вывод А4 без белого листа.

### [DOC-02] [SEV-1] Тотальная подмена ИДС: все согласия превращаются в терапию
- **Файлы:**
  - [`apps/web/src/components/consents/consentTemplates.ts#L582-L585`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/consents/consentTemplates.ts#L582-L585)
  - [`apps/web/src/components/consents/consentCatalogData.ts#L272-L274`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/consents/consentCatalogData.ts#L272-L274)
- **Суть бага:** Код передает идентификаторы `"CONSENT_SURGERY_IMPLANT"`, `"CONSENT_ORTHODONTICS"`, а в каталоге ключи названы `"surgery"`, `"implant"`, `"orthodontics"`. Не найдя ключ, метод `getConsentDocumentById` молча возвращает нулевой элемент каталога — **«Согласие на терапевтическое лечение»**! Хирург жмет согласие на имплантацию или удаление зуба, а на принтер вылезает согласие на лечение кариеса (ст. 20 323-ФЗ, прямой риск уголовной ответственности по ст. 238 УК РФ).

### [DOC-03] [SEV-1] Бесследная потеря подписи пациента с планшета
- **Файлы:**
  - [`apps/web/src/hooks/domains/documents/useTreatmentContractActions.ts#L184-L205`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/hooks/domains/documents/useTreatmentContractActions.ts#L184-L205)
  - [`apps/api/src/routes/documents/issue.ts#L247`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents/issue.ts#L247)
- **Суть бага:** Пациент расписывается стилусом/пальцем на планшете, DataURL генерируется, но в объекте полезной нагрузки `payload` поле `signatureSvg` полностью вырезано! Бэкенд получает `null` и записывает в БД `NULL`. Росчерк пациента испаряется навсегда.

### [DOC-04] [SEV-1] Симуляция ПЭП по 63-ФЗ в экспресс-пакете первичного приёма
- **Файл:** [`apps/web/src/components/documents/primaryIntakeModal/usePrimaryIntakeModalState.ts#L81-L89`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/documents/primaryIntakeModal/usePrimaryIntakeModalState.ts#L81-L89)
- **Суть бага:** Кнопка «Подписать ПЭП» не вызывает подписание. Она просто создает черновики, ставит локальный флаг `setIsSignedPep(true)` и показывает победный Toast. Документы в БД остаются неподписанными в статусе `draft`, а флаг сбрасывается при закрытии окна.

### [DOC-05] [SEV-1] Токсичные моки в официальных документах: «Ковалёв Роман» и фейковый паспорт
- **Файлы:**
  - [`apps/web/src/components/documents/professionalA4/a4ClinicPatientDefaults.ts#L26-L100`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/documents/professionalA4/a4ClinicPatientDefaults.ts#L26-L100)
  - [`apps/web/src/components/documents/professionalA4/a4ClinicalDocsBuilder.ts#L46-L68`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/documents/professionalA4/a4ClinicalDocsBuilder.ts#L46-L68)
- **Суть бага:** Если у пациента не введен паспорт или у клиники нет лицензии, система печатает в официальный договор:
  - Пациент: «Ковалёв Роман Станиславович», паспорт 4515 № 892341, ОВД Тверского района Москвы.
  - Клиника: «ООО Стоматологическая клиника ДЕНТЕ Премиум», Москва, ул. Тверская 12, директор Воронов А. В.
  - Медкарта: аллергия на амидопирин, кариес 16 зуба и фиктивный счет на 18 500 ₽.
  Вместо положенных юридических прочерков `________` печатаются чужие персональные данные!

### [DOC-06] [SEV-2] Симуляция СМС-кода через Math.random() прямо в UI
- **Файл:** [`apps/web/src/components/documents/digitalSignature/useDigitalSignature.ts#L47-L53`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/documents/digitalSignature/useDigitalSignature.ts#L47-L53)
- **Суть бага:** СМС-шлюз отсутствует: код подтверждения генерируется `Math.random() * 9000` в JavaScript, сам вставляется в инпут и показывается во всплывающем тосте без проверки на бэкенде.

### [DOC-07] [SEV-2] Невозможность разделения смешанного чека на Код 1 и Код 2 (НДФЛ 13%)
- **Файл:** [`apps/api/src/db/schema/billingModules/billingPaymentsAndFiscalSchema.ts#L70`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/db/schema/billingModules/billingPaymentsAndFiscalSchema.ts#L70)
- **Суть бага:** Поле `tax_deduction_code` хранится как единая колонка на всю сумму платежа. Смешанный чек (50 000 ₽ за имплантат Код 2 + 5 000 ₽ за гигиену Код 1) невозможно распределить по разным кодам для справки в налоговую.


## 12. 🔐 АВТОРИЗАЦИЯ, RBAC, БЕЗОПАСНОСТЬ, ПИН-КОДЫ И АУДИТ-ЛОГИ

### [SEC-01] [SEV-1] Тотальный обход матрицы прав через «Мягкий режим» `enforcePermissionWhenStaffKnown`
- **Файл:** [`apps/api/src/security/permissionsModules/permissionGuards.ts#L73-L92`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/security/permissionsModules/permissionGuards.ts#L73-L92)
- **Суть бага:** Если запрос идет без заголовка `x-dente-staff-token` (удален в Postman или curl), переменная `identity.userId` равна `null`. Код выполняет:
  `if (!identity.userId || !identity.role) return true;`
  **Любая проверка прав полностью пропускается!** Любой пользователь с валидным токеном клиники может создавать финансовые платежи, делать возвраты денег из кассы (`refundReceiptHandler.ts`), менять баланс семейных кошельков и читать закрытые финансовые отчеты клиники с нулевыми правами!

### [SEC-02] [SEV-1] BOLA / IDOR утечка данных пациентов и заказов ZTL между клиниками
- **Файл:** [`apps/api/src/routes/copilot/daemonSchedulerRoutes.ts#L44-L160`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/copilot/daemonSchedulerRoutes.ts#L44-L160)
- **Суть бага:** Маршрут берет `const orgId = query.organizationId ?? resolvedOrgId`. Пользователь Клиники А может передать UUID Клиники Б в параметре URL и скачать приватные клинические алерты, незаполненные дневники с именами пациентов и наряды зуботехнической лаборатории чужой клиники.

### [SEC-03] [SEV-1] BOLA / IDOR утечка зарплат врачей
- **Файл:** [`apps/api/src/routes/doctorEarnings/doctorEarningsValidation.ts#L41-L65`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/doctorEarnings/doctorEarningsValidation.ts#L41-L65)
- **Суть бага:** Если запрос отправлен без staff-токена, переменная `targetDoctorId` принимает значение `requestedDoctorId`. Любой планшет клиники может запросить точный расчет зарплаты, процентные ставки и удержания любого врача клиники.

### [SEC-04] [SEV-1] Абсурдный перебор ПИН-кода у кресла: автологин под Владельцем клиники
- **Файл:** [`apps/api/src/routes/auth/loginModules/pin/staffPinVerification.ts#L156-L179`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/auth/loginModules/pin/staffPinVerification.ts#L156-L179)
- **Суть бага:** Если введенный ПИН-код не подошел выбранному врачу, сервер запускает цикл **по всем активным сотрудникам клиники**! Если введенный ПИН совпал с ПИН-кодом другого сотрудника — сервер **авторизует пользователя под этой новой учетной записью**! Если ассистент у кресла вводит "1111", и у Владельца клиники стоит "1111", ассистент мгновенно получает права Владельца со всеми финансовыми и административными полномочиями.
- **В связке с рейтлимитером:** [`loginRateLimiter.ts#L26`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/auth/loginModules/loginRateLimiter.ts#L26) ключ формируется как `pin:${orgId}:${userId}:${ip}`. Передавая случайный `userId` на каждый запрос, атакующий полностью обходит защиту от брутфорса, а бэкенд на каждом запросе перебирает всех сотрудников клиники.

### [SEC-05] [SEV-1] Клиентский бэкдор разблокировки ПИН-кода при сетевой ошибке
- **Файл:** [`apps/web/src/components/auth/staffPinPad/staffPinPadApi.ts#L67-L74`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/auth/staffPinPad/staffPinPadApi.ts#L67-L74)
- **Суть бага:** При ошибке сети код выполняет:
  `if (completedPin === "1111" || completedPin === "0000") { safeLocalStorageSetItem(DENTE_STAFF_TOKEN_KEY, ...); return { success: true }; }`
  При отключении интернета или блокировке запроса в DevTools любой человек входит под учетной записью любого врача через ПИН 1111.

### [SEC-06] [SEV-2] Hard-Delete расходов с возвратом денег в кассу без аудит-лога
- **Файл:** [`apps/api/src/routes/expenses.ts#L381-L441`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/expenses.ts#L381-L441)
- **Суть бага:** Маршрут `DELETE /api/expenses/:id` не требует прав `finance.write`. Расход физически удаляется из PostgreSQL, деньги возвращаются в кассу, и в аудит-лог **не пишется ни единой строчки**. Идеальный механизм для скрытия недостач и воровства.

### [SEC-07] [SEV-2] Отсутствие аудита при изменении зарплат, окладов и ролей персонала
- **Файл:** [`apps/api/src/routes/staff/staffMutationRoutes.ts#L320-L384`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/staff/staffMutationRoutes.ts#L320-L384)
- **Суть бага:** Смена ролей сотрудников, окладов и права подписи медицинских карт (`canSignMedicalRecords`) пишется напрямую в БД без вызова `recordAuditEventInDb`.

### [SEC-08] [SEV-2] Доступ к полному журналу аудита для любого персонала
- **Файл:** [`apps/api/src/routes/audit.ts#L60-L65`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/audit.ts#L60-L65)
- **Суть бага:** Любой ассистент или медсестра может через `GET /api/audit/logs` просмотреть полный журнал действий руководства, аннулирования документов и просмотра карт.


---

# 🔴 ВОЛНА 3: ВЫЯВЛЕННЫЕ ДЕФЕКТЫ И АРХИТЕКТУРНЫЙ ДЕБИЛИЗМ

## 13. 💵 РАСЧЁТ ЗАРПЛАТЫ ВРАЧЕЙ, СТАВКИ И ВЫПЛАТЫ АССИСТЕНТАМ

### [PAY-01] [SEV-1] Вычитание расходов клиники напрямую из кармана врача (Финансовый саботаж)
- **Файл:** [`packages/shared/src/finance/doctorPayoutCalculator.ts#L182-L227`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/finance/doctorPayoutCalculator.ts#L182-L227)
- **Суть бага:** Формула вычитает себестоимость материалов и лаборатории **не из базы выручки (Gross)**, а **напрямую из процента врача**:
  `rawPayout = accruedRub - totalWithheld`
  *Пример:* Пациент оплатил сложную ортопедию на 100 000 ₽. Ставка врача 25% = 25 000 ₽. Лаборатория ЗТЛ стоила 15 000 ₽, материалы 10 000 ₽ (итого 25 000 ₽). Сервер вычитает 25 000 ₽ из 25 000 ₽, и **врач получает 0 рублей**! Врач за свой счет оплатил клинике коронки и материалы.

### [PAY-02] [SEV-1] Арифметический подлог в расчетном листке (НДФЛ не вычитается из выплаты)
- **Файл:** [`apps/api/src/services/finance/doctorPayouts/doctorPayslip.ts#L69-L75`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/finance/doctorPayouts/doctorPayslip.ts#L69-L75)
- **Суть бага:** Код считает НДФЛ 13% (`ndflTaxRub = accruedRub * 0.13`), но сумма «К выплате» (`netPayoutRub`) берется из `payoutRub`, где налог **не вычитался**! В печатном листке красуется: *Начислено: 100 000 ₽ | НДФЛ: 13 000 ₽ | К выплате: 100 000 ₽*.

### [PAY-03] [SEV-1] Запрос по мертвому полю `doctorId` сбрасывает все ставки на 25%
- **Файл:** [`apps/api/src/services/reports/managerReports/financialExecutiveReports.ts#L277-L291`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/reports/managerReports/financialExecutiveReports.ts#L277-L291)
- **Суть бага:** Таблица `doctor_commissions` связывается по `userId`. Запрос отбирает `comm.doctorId`, возвращает `null` для всех врачей, и отчет безусловно сбрасывает индивидуальные ставки ведущих специалистов на дефолтные 25%.

### [PAY-04] [SEV-2] Зашитые моки 10% на материалы и 30% на лабораторию
- **Файл:** [`financialExecutiveReports.ts#L348, L395`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/reports/managerReports/financialExecutiveReports.ts#L348)
- **Суть бага:** Вместо реального списания материалов со склада и счетов ЗТЛ в отчет зашит мок: `Math.round(revRub * 0.1)` (10% на материалы) и 30% на лабораторию.

### [PAY-05] [SEV-2] Оплата ассистентам — 100% фантомный мок
- **Файлы:** [`apps/api/src/db/schema/schedule/appointmentsTable.ts#L30`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/db/schema/schedule/appointmentsTable.ts#L30), [`payrollCatalogData.ts#L152`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/payroll/payrollCatalogData.ts#L152)
- **Суть бага:** В бэкенде Fastify **нет ни одной таблицы и ни одного эндпоинта** для расчета зарплаты ассистентов (почасовая, за смену, доплата за снимки). Код существует исключительно в изолированных unit-тестах.


## 14. 📋 ПЛАНЫ ЛЕЧЕНИЯ, 3-УРОВНЕВЫЕ СМЕТЫ, КУРАТОРЫ И РАССРОЧКИ

### [PLN-01] [ИСПРАВЛЕНО] Схлопывание 3 тарифов в одну минимальную цену и хардкод этапов
- **Файлы:**
  - [`TreatmentPlanPresenterDefaultStages.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/treatment-plans/presenterModules/TreatmentPlanPresenterDefaultStages.ts)
  - [`Presenter3TierGrid.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/treatment-plans/presenterModules/Presenter3TierGrid.tsx)
  - [`TreatmentPlanPresenterModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/treatment-plans/TreatmentPlanPresenterModal.tsx)
- **Суть бага:** В презентере планов лечения этапы хардкодились обрывочно или схлопывались в минимальные цены. В тарифе «Базовый» был зашит единственный этап, отсутствовала сквозная связка с патологиями одонтограммы (кариес 16, отсутствующий 46, пульпит 25).
- **Статус ликвидации [ИСПРАВЛЕНО]:**
  1. Реализован сквозной клинический генератор `buildPresenterTiersFromTeeth(teeth)`: из живой одонтограммы или канонического кейса генерируются 3 логичных этапа реабилитации (Этап 1: Неотложная помощь и терапия, Этап 2: Хирургия и имплантация, Этап 3: Ортопедия и протезирование).
  2. Сформированы 3 честных тарифа с дифференциацией материалов: Базовый (85 500 ₽ — металлокерамика Co-Cr, Osstem), Оптимальный (132 300 ₽ — нанокомпозит, цирконий Katana, микроскоп), Премиум (205 000 ₽ — IPS e.max Press, Straumann Roxolid SLActive, навигационный 3D-шаблон).
  3. Все суммы строго в целых копейках (`amountKopecks`, BIGINT) без float drift.
  4. В `Presenter3TierGrid.tsx` внедрена равная фиксированная высота карточек (`h-full items-stretch flex flex-col justify-between`) и бейдж беспроцентной рассрочки клиники 0% («3 платежа по XX XXX ₽»).

### [PLN-02] [ИСПРАВЛЕНО] Отсутствие связи счетов с планами лечения и фиктивная оплата этапа
- **Файлы:**
  - [`TreatmentPlanPresenterModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/treatment-plans/TreatmentPlanPresenterModal.tsx)
  - [`apps/api/src/routes/invoiceRoutes/handlers/generateInvoiceHandler.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/invoiceRoutes/handlers/generateInvoiceHandler.ts)
  - [`CashRegisterCheckoutModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/billing/CashRegisterCheckoutModal.tsx)
- **Суть бага:** Ранее колбэк `onPaymentComplete` при оплате этапа закрывал модалку без формирования счета в БД.
- **Статус ликвидации [ИСПРАВЛЕНО]:**
  1. Нажатие «Оплатить этап» бесшовно вызывает бэкенд `POST /api/invoices/generate-from-plan` для фиксации черновика счета в `patient_invoices` со всеми валидациями заморозки цен (Price Lock).
  2. Запускается нативный кассовый чекаут `CashRegisterCheckoutModal` с точной суммой в копейках `amountKopecks`, готовый к приему оплаты картой, наличными, QR СБП или сплитом.

### [PLN-08] [ИСПРАВЛЕНО] Муляжи песочниц (*_preview.html), отсутствие кнопки отправки в мессенджер и дефекты автономии врача (Мандат 8e)
- **Файлы:**
  - [`DirectTreatmentPlanLauncher.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/treatment-plans/DirectTreatmentPlanLauncher.tsx)
  - [`LiveTreatmentPlanPresenterLauncher.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/appLayout/modalsContainerModules/standalone/LiveTreatmentPlanPresenterLauncher.tsx)
  - [`PresenterHeader.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/treatment-plans/presenterModules/PresenterHeader.tsx)
  - [`AppShell.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/AppShell.tsx)
- **Суть бага:** Презентер тестировался в изолированном файле `treatment_plan_preview.html`, отсутствовал в живом дереве `AppShell`, не имел прямой кнопки экспорта в WhatsApp / Telegram / SMS, а выбор тарифа и скидка врача сбрасывались при переключении окон.
- **Статус ликвидации [ИСПРАВЛЕНО]:**
  1. Исключены любые `*_preview.html` песочницы: презентер смонтирован в живое дерево CRM через `DirectTreatmentPlanLauncher` и доступен по хэшу `#presenter` и `?presenter=1`.
  2. В шапку и подвал добавлена кнопка «В мессенджер» (`presenter-send-messenger-btn`), формирующая красивую смету для WhatsApp / Telegram и копирующая расчет в буфер обмена в 1 клик.
  3. Внедрен debounced autosave выбора тарифа и скидки врача в `localStorage` (`dente_presenter_draft_*`) с мгновенным восстановлением драфта при повторном открытии (Мандат 8e).
  4. Пройден Red Team визуальный аудит по 8 осям на живом Chromium (1440x900 ☀️ Light, 1440x900 🌙 Dark, 390x844 📱 Light, 390x844 📱 Dark): zero clipping, ровно 1 Primary CTA (`#0d9488`), Apple HIG Bottom Sheet, 0px паразитного скролла. Доказательства сохранены в `docs/proofs/treatment_plans/`.

### [PLN-03] [SEV-1] Кассовая дыра при частичной оплате транша рассрочки (Потеря долга)
- **Файлы:**
  - [`apps/api/src/routes/cashInstallmentsRoutes.ts#L238-L348`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/cashInstallmentsRoutes.ts#L238-L348)
  - [`apps/web/src/components/billing/installments/usePatientInstallmentsState.ts#L69-L75`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/billing/installments/usePatientInstallmentsState.ts#L69-L75)
- **Суть бага:** В UI пациент может внести частичную сумму (например, 10 000 ₽ из 30 000 ₽). Но бэкенд-эндпоинт `/api/installments/tranches/:id/pay` **не принимает сумму платежа**! Сервер безусловно проводит по кассе полную сумму 30 000 ₽ и ставит `isPaid = true`. Касса клиники не сходится на 20 000 ₽, а остаток реального долга пациента бесследно испаряется!

### [PLN-04] [SEV-1] Математический абсурд конверсии куратора (Конверсия 200–375%)
- **Файл:** [`packages/shared/src/curator/curatorEngine.ts#L194-L208`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/curator/curatorEngine.ts#L194-L208)
- **Суть бага:** Конверсия шага воронки считается делением текущего количества пациентов в шаге $k$ на количество в шаге $k-1$. Так как считаются моментальные остатки пациентов, а не сквозной поток, система выводит абсурдные цифры: «Конверсия согласования: 200%», «Конверсия в лечение: 375%».

### [PLN-05] [SEV-1] Заражение новых планов лечения старыми платежами пациента
- **Файлы:**
  - [`apps/api/src/routes/analytics/curatorQuery.ts#L37-L46`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/analytics/curatorQuery.ts#L37-L46)
  - [`apps/api/src/routes/analytics/curatorQueueBuilder.ts#L37-L54`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/analytics/curatorQueueBuilder.ts#L37-L54)
- **Суть бага:** Оплаты суммируются по всему пациенту за всю историю. Если пациент год назад заплатил 50 000 ₽ за коронку, а сегодня ему составили новый план на 200 000 ₽, система считает, что новый план уже частично оплачен на 50 000 ₽, и переводит его в статус `prepayment`.

### [PLN-06] [SEV-2] Платное удаление отсутствующего зуба при адентии
- **Файл:** [`apps/web/src/components/treatment-plans/tierStages/generator/economyAdentiaSpanBuilder.ts#L14-L29`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/treatment-plans/tierStages/generator/economyAdentiaSpanBuilder.ts#L14-L29)
- **Суть бага:** Для отсутствующего зуба (`state: "Missing"`) алгоритм сметы добавляет услугу `SimpleExtraction` («Удаление разрушенного корня зуба №...» за 3800 ₽). Пациенту без зуба выставляется счет на его платное удаление!

### [PLN-07] [SEV-2] Баг переполнения дней месяца в графике рассрочки (31 января -> 3 марта)
- **Файл:** [`packages/shared/src/finance/installmentScheduleEngine.ts#L135-L137`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/finance/installmentScheduleEngine.ts#L135-L137)
- **Суть бага:** `payDate.setMonth(payDate.getMonth() + i)` без учета длины месяца перескакивает с 31 января на 3 марта. В феврале платеж пропадает, а в марте пациент получает два платежа.


## 15. 💊 КЛИНИЧЕСКИЙ ПРОТОКОЛ (SOAP), РЕЦЕПТЫ И АЛЛЕРГИИ НА АНЕСТЕТИКИ

### [PHR-01] [SEV-1] [ИСПРАВЛЕНО] Отсутствие проверки аллергии на Лидокаин (Угроза анафилактического шока)
- **Файлы:**
  - [`packages/shared/src/clinical/ddi/ddiRulesMatrix.ts#L13-L455`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/clinical/ddi/ddiRulesMatrix.ts#L13-L455)
  - [`packages/shared/src/clinical/ddi/somaticRiskEvaluator.ts#L46-L179`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/clinical/ddi/somaticRiskEvaluator.ts#L46-L179)
  - [`packages/shared/src/ai/anesthesiaEngine.ts`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/ai/anesthesiaEngine.ts)
  - [`apps/web/src/components/anesthesia/anesthesiaEngine.ts#L38-L61`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/anesthesia/anesthesiaEngine.ts#L38-L61)
- **Суть бага:** В словаре лекарственных классов не было класса `lidocaine`. В оценщике аллергий `somaticRiskEvaluator.ts` проверка `hasLidocaineAllergy` отсутствовала.
- **Статус исправления:** [ИСПРАВЛЕНО] Классы `lidocaine` и `articaine` добавлены в `DRUG_CLASS_MATCHERS`. Реализованы детекторы аллергии на лидокаин и артикаин в `somaticRiskEvaluator.ts`, блокирующие назначения и выдающие безопасные альтернативы (Мепивакаин). В `anesthesiaEngine` (shared и web) аллергия обнуляет допустимые карпулы (`safeCarpules = 0`) и переводит расчёт в статус абсолютного противопоказания `overdose_danger`. Проверено тестами `apps/web/src/tests/clinicalSafetyPhr01Phr02End02.test.ts` и 4-state visual proofs.

### [PHR-02] [SEV-1] [ИСПРАВЛЕНО] Обрыв передачи аллергий в SOAP-редакторе дневника приёма
- **Файл:** [`apps/web/src/components/visit/soapEditor/VisitSoapEditorView.tsx#L64-L76`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/visit/soapEditor/VisitSoapEditorView.tsx#L64-L76)
- **Суть бага:** Родительский `VisitSoapEditorView` передавал только `patientId` и `visitId`. Все флаги аллергий оставались `undefined`.
- **Статус исправления:** [ИСПРАВЛЕНО] В `VisitSoapEditorProps` добавлены пропсы `patientWeightKg`, `hasCardiovascularRisk`, `hasLidocaineAllergy`, `hasArticaineAllergy`, `patientAllergies`. В `VisitSoapEditorView` парсится массив аллергий пациента и прокидывается во все поля SOAP-редактора и калькулятора анестезии `VisitAnesthesiaSection`. Покрыто сквозными тестами.

### [PHR-03] [SEV-1] Игнорирование аллергий при валидации рецепта на бэкенде
- **Файл:** [`apps/api/src/routes/prescriptions/prescriptionCreateService.ts#L34-L45`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/prescriptions/prescriptionCreateService.ts#L34-L45)
- **Суть бага:** Функция `auditPrescriptionDdiAndAllergies` вызывает `checkDrugDrugInteractions`, которая проверяет только межлекарственные взаимодействия двух таблеток, но **не проверяет соматические аллергии пациента**! Если выписать Амоксиклав пациенту с зафиксированной аллергией на пенициллин, бэкенд ставит `safetyAuditPassed: true`.

### [PHR-04] [SEV-2] Проглатывание и подмена редких кодов МКБ-10 в интерфейсе
- **Файлы:**
  - [`apps/web/src/components/visit/diary/useVisitDiarySectionIcd.ts#L65-L75`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/visit/diary/useVisitDiarySectionIcd.ts#L65-L75)
  - [`apps/web/src/lib/icd10.ts#L1-L73`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/lib/icd10.ts#L1-L73)
- **Суть бага:** В UI зашит куцый список всего из 30 кодов МКБ-10. При ручном вводе официального стоматологического диагноза вне этого списка (`K04.02` гнойный пульпит, `K10.2` остеомиелит, `K10.3` альвеолит) метод `commitIcdInput` подставляет первый попавшийся чужой диагноз `filteredIcd[0]` либо молча стирает ввод врача.


## 16. 📡 ОФФЛАЙН-РЕЖИМ, LOCAL-FIRST SYNC И СЕТЕВАЯ РЕПЛИКАЦИЯ LAN

### [OFF-01] [SEV-1] Тихий дроп платежа при обрыве сети в CashRegisterStudioModal
- **Файлы:**
  - [`apps/web/src/components/cashbox/CashRegisterStudioModal.tsx#L134-L153`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/cashbox/CashRegisterStudioModal.tsx#L134-L153)
- **Суть бага:** В кассовой модалке вызов `fetch("/api/cashbox/payments")` обёрнут в блок `.catch(() => null)`. При ошибке сети или обрыве интернета подсовывается фиктивный объект `{ success: true, effectiveTotalRub, ... }`, вызывается `onPaymentComplete()`, и модалка радостно закрывается! Платёж **НЕ попадает** ни в `offlinePaymentQueue`, ни в IndexedDB. Деньги с пациента взяты, кассир уверен, что всё прошло, а в базе данных клиники ноль записей. После перезагрузки долг пациента не погашен.

### [OFF-02] [SEV-1] Неотправка офлайн-правок одонтограммы на сервер после восстановления связи
- **Файлы:**
  - [`apps/web/src/components/odontogram/syncModules/odontogramApiBatchSync.ts#L75-L92`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/syncModules/odontogramApiBatchSync.ts#L75-L92)
  - [`apps/web/src/components/odontogram/useOdontogramSync.ts#L237-L251`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/useOdontogramSync.ts#L237-L251)
- **Суть бага:** При обрыве сети статус зубов пишется в изолированную IndexedDB `dente_odontogram_db` (`persistTeethLocally`), но мутация **НЕ добавляется в Outbox-очередь (`idbSyncQueue`)**. При появлении сети хук обновляет локальный кэш с сервера, но **НИКОГДА не отправляет накопленные офлайн-изменения обратно в PostgreSQL**! Вся работа врача за время отсутствия интернета остаётся на одном локальном браузере и никогда не попадает в общую базу.

### [OFF-03] [SEV-1] Фатальное несовпадение схемы DTO в очереди фискализации
- **Файлы:**
  - [`apps/web/src/hooks/useFiscalOperations.ts#L44-L51`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/hooks/useFiscalOperations.ts#L44-L51)
  - [`apps/api/src/routes/sbp/handlers/sbpFiscalRouteHandlers.ts#L23-L30`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sbp/handlers/sbpFiscalRouteHandlers.ts#L23-L30)
- **Суть бага:** Фронтенд оборачивает тело в `{ paymentId, visitId, payload: receipt.payload, idempotencyKey }`. Серверный валидатор `createFiscalReceiptPayloadSchema` ожидает поля (`patientId`, `customerContact`, `items`) непосредственно в корне `request.body`. Результат: сервер стабильно отвечает `400 FiscalReceiptValidationError`, после 5 автоматических попыток чек навсегда помечается как безнадёжно `failed`.

### [OFF-04] [SEV-1] Симулятор P2P LAN репликации (битые роуты и мертвый UDP-демон)
- **Файлы:**
  - [`apps/web/src/services/offline/lanMeshReplicationService.ts#L277`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/services/offline/lanMeshReplicationService.ts#L277)
  - [`apps/web/src/services/offline/p2p/p2pPeerRelay.ts#L19`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/services/offline/p2p/p2pPeerRelay.ts#L19)
  - [`apps/api/src/services/lanMeshService.ts#L101-L201`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/lanMeshService.ts#L101-L201)
  - [`apps/api/src/routes/lanNetwork.ts#L519-L526`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/lanNetwork.ts#L519-L526)
- **Суть бага:** Декларации о «P2P LAN синхронизации без сервера» являются бутафорией:
  1. Фронтенд шлёт запросы на `/api/sync/mesh/exchange` и `/api/lan/p2p/dispatch` — оба роута отсутствуют на бэкенде (HTTP 404).
  2. Метод `lanMeshService.start()` (UDP-мультикаст на 4101 порту) нигде не вызывается при старте сервера Fastify.
  3. Роут `POST /api/network/lan-mesh/mutations` валидирует тело и возвращает фиктивный `{ ok: true }` без записи в PostgreSQL.

### [OFF-05] [SEV-2] Осиротевшие модули offlinePaymentQueue и offlineAppointmentQueue
- **Файлы:**
  - [`apps/web/src/offline/offlinePaymentQueue.ts#L120-L215`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/offline/offlinePaymentQueue.ts#L120-L215)
  - [`apps/web/src/offline/offlineAppointmentQueue.ts#L50-L110`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/offline/offlineAppointmentQueue.ts#L50-L110)
  - [`apps/web/src/hooks/domains/schedule/useAppointmentMutations.ts#L308-L346`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/hooks/domains/schedule/useAppointmentMutations.ts#L308-L346)
- **Суть бага:** Отличные сервисы очередей с расчетом в копейках и IndexedDB существуют исключительно для unit-тестов. В реальном расписании и кассе они не импортированы. При обрыве сети запись на приём просто вылетает с ошибкой.

### [OFF-06] [SEV-2] Отсутствие слияния поверхностей зуба при параллельном редактировании
- **Файл:** [`apps/api/src/services/sync/syncGateway/syncConflictResolver.ts#L171-L202`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/sync/syncGateway/syncConflictResolver.ts#L171-L202)
- **Суть бага:** Конфликт-резолвер одонтограммы работает по LWW на уровне зуба целиком. Если один врач офлайн отметил дистальную поверхность, а второй — окклюзионную, одна из них будет стёрта вместо union-слияния массива поверхностей.


## 17. 🤖 ИИ-КОПАЙЛОТ, WHISPER STT И КЛИНИЧЕСКИЙ ЧАСОВОЙ (SENTINEL)

### [COP-01] [SEV-1] [ИСПРАВЛЕНО] Утечка и хардкод боевых API-ключей в кодовой базе
- **Файлы:**
  - [`apps/api/src/ai/router/routerTypes.ts#L21-L24`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/router/routerTypes.ts#L21-L24)
  - [`apps/api/src/ai/router/keyPoolManager.ts#L26-L35`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/router/keyPoolManager.ts#L26-L35)
  - [`apps/api/src/tests/agentHarness.test.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/tests/agentHarness.test.ts)
  - [`apps/api/src/ai/agentRouterClient.test.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/agentRouterClient.test.ts)
- **Суть бага:** В открытом коде репозитория в константе `DEFAULT_AGENTROUTER_KEYS` захардкожены боевые токены шлюза (`sk-6osQfoRXk...`, `sk-LhzyJtJx...`). При отсутствии env-переменной `AGENTROUTER_API_KEYS` система подхватывает их по умолчанию. Прямое нарушение безопасности.
- **Статус исправления [ИСПРАВЛЕНО]:**
  1. В `routerTypes.ts` сырые строки ключей полностью удалены. Значение `DEFAULT_AGENTROUTER_KEYS` безопасно вычисляется из переменных окружения `(process.env.AGENTROUTER_API_KEYS || process.env.GROQ_API_KEYS || "").split(",").map(k => k.trim()).filter(Boolean)`.
  2. Во всех тестах (`agentHarness.test.ts`, `agentRouterClient.test.ts`) реальные ключи заменены на явные мок-строки `agentrouter...`.
  3. Маскирование секретов в логах (`maskKeysInText`) доработано для защиты паттернов `sk-***`.
  4. Проверено тестами `agentRouterClient.test.ts` (14/14) и `agentHarness.test.ts` (10/10). Репозиторий очищен от секретов.

### [COP-02] [SEV-1] [ИСПРАВЛЕНО] Затирание заметок врача при применении подсказок ИИ (Data Loss)
- **Файлы:**
  - [`apps/web/src/components/copilot/useCopilotModules/useCopilotActions.ts#L191-L204`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/useCopilotModules/useCopilotActions.ts#L191-L204)
  - [`apps/web/src/components/copilot/CopilotNudges.tsx#L54-L62`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/CopilotNudges.tsx#L54-L62)
  - [`apps/web/src/tests/copilotAnatomyRemediation.test.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/tests/copilotAnatomyRemediation.test.ts)
- **Суть бага:** При клике на nudge-подсказку Копайлота код перезаписывал стейт формы дневника без слияния, стирая уже набранный врачом текст. Нарушение Мандата 8e (Автономия врача).
- **Статус исправления [ИСПРАВЛЕНО]:**
  1. В `useCopilotActions.ts` обновление `setVisitNoteForm` переведено на функциональный апдейтер с безопасным сквозным склеиванием (`appendWithSeparator(prev, incoming, "\n\n")`). Если врач уже ввёл текст жалоб или анамнеза, входящие предложения ИИ аккуратно добавляются через разделитель `\n\n`, никогда не затирая существующие данные.
  2. В `CopilotNudges.tsx` обработчик применения подсказок перестроен аналогично: используется функциональное слияние `setVisitNoteForm((prev) => ({ ... }))` с сохранением всех полей.
  3. Автономия врача защищена (Мандат 8e): 0% потери введенных данных.
  4. Проверено автоматическими тестами `copilotAnatomyRemediation.test.ts` (8/8) и скриншотами 4-state visual proof: `docs/proofs/copilot/01_copilot_studio_pc_light_1440x900.png` и `02_copilot_studio_pc_dark_1440x900.png`.

### [COP-03] [SEV-1] [ИСПРАВЛЕНО] Самовольное искажение одонтограммы зуба 36 при подтверждении действий без указания зуба
- **Файлы:**
  - [`apps/web/src/components/copilot/actionConfirm/actionConfirmStoreSync.ts#L7-L34`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/actionConfirm/actionConfirmStoreSync.ts#L7-L34)
  - [`apps/web/src/services/ai/copilotActionRunner.ts#L160-L172`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/services/ai/copilotActionRunner.ts#L160-L172)
- **Суть бага:** Если врач подтверждает действие, где модель не указала конкретный зуб, синхронизатор стейта подставляет захардкоженный дефолт `'36'` и диагноз `'K02.1'`. Любая общая консультация или осмотр без привязки к номеру зуба превращается в кариес зуба 36 в одонтограмме.
- **Статус исправления [ИСПРАВЛЕНО]:**
  1. В `actionConfirmStoreSync.ts` удален слепой fallback `'36'` и захардкоженный диагноз `'K02.1'`. Мутация одонтограммы (`applyAiToothCodes`) вызывается строго тогда, когда в `finalArgs` явно передан номер зуба (`tooth` или `teeth`). Общие консультации и дневники без локализации зуба обновляют поля `setVisitNoteForm` без искажения одонтограммы.
  2. В `copilotActionRunner.ts` удален дефолт `"36"` при снятии снимка `previousStateSnapshot`. Снимок состояния зуба фиксируется исключительно при наличии реального `args.tooth` или `args.toothNumber`.
  3. Проверено тестами `copilotEndToEndWiring.test.tsx` (10/10) и `CopilotDrawer.test.tsx` (5/5).

### [COP-04] [SEV-2] [ИСПРАВЛЕНО] Бесконечный таймер мышления при сбое стриминга
- **Файлы:**
  - [`apps/web/src/components/copilot/useCopilotModules/copilotStreamEventHandler.ts#L227-L256`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/useCopilotModules/copilotStreamEventHandler.ts#L227-L256)
  - [`apps/web/src/components/copilot/message/CopilotThinkingMessage.tsx#L22-L28`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/message/CopilotThinkingMessage.tsx#L22-L28)
- **Суть бага:** При сетевой ошибке или HTTP 429 обработчик не сбрасывает `streaming: false` для блоков `thinking`. Таймер тикает бесконечно («Мышление модели 450.2с...»), вводя врача в ступор.
- **Статус исправления [ИСПРАВЛЕНО]:**
  1. В `copilotStreamEventHandler.ts` при событиях `done`, `finish`, `budget_exceeded` и `error` гарантированно сбрасывается флаг `streaming: false` для всех сообщений вида `text` и `thinking`.
  2. Фаза рассуждений `setPhase(null)` обнуляется, таймер интервала в `CopilotThinkingMessage` останавливается (`if (!isStreaming) return;`).
  3. Проверено 4-state visual proof: `docs/proofs/copilot/03_copilot_thinking_cot_pc_light_1440x900.png`.

### [COP-05] [SEV-2] Chairside Sentinel: Бэкенд-эндпоинт оторван от фронтенда
- **Файлы:**
  - [`apps/api/src/routes/copilot/daemonSchedulerRoutes.ts#L168-L187`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/copilot/daemonSchedulerRoutes.ts#L168-L187)
- **Суть бага:** Эндпоинт `POST /api/v1/copilot/sentinel/analyze` нигде не вызывается в веб-клиенте. Проверка соматики работает только изолированно в модалке рецептов, а сквозной часовой приёма отключен.

### [COP-06] [SEV-2] Клиентский детерминированный оффлайн-фолбек оторван от UI
- **Файлы:**
  - [`apps/web/src/services/ai/assistant/aiAssistantServiceCore.ts#L108-L110`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/services/ai/assistant/aiAssistantServiceCore.ts#L108-L110)
  - [`apps/web/src/components/copilot/useCopilotModules/useCopilotStream.ts#L105-L116`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/useCopilotModules/useCopilotStream.ts#L105-L116)
- **Суть бага:** Подсистема `executeLocalFallback` привязана к классу `aiAssistantService`, который не используется компонентами шторки копайлота. При 429 чат выводит ошибку вместо перехода на локальные шаблоны.

### [COP-07] [SEV-3] [ИСПРАВЛЕНО] Просачивание советского канцелярита (`043`, `form043`) во внутренний код
- **Файлы:**
  - [`apps/web/src/components/copilot/cards/CopilotSoapDiaryCard.tsx#L45-L60`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/cards/CopilotSoapDiaryCard.tsx#L45-L60)
  - [`apps/web/src/components/copilot/contextSync/contextSyncTypes.ts#L1-L35`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/contextSync/contextSyncTypes.ts#L1-L35)
- **Суть бага:** Нарушение Мандата 8x: классы `.copilot-043-confirm-card`, интерфейсы `Clinical043Snapshot`, `Protocol043Data`, `onApply043`.
- **Статус исправления [ИСПРАВЛЕНО]:**
  1. Интерфейс контекста переименован в `ClinicalEmkSnapshot` с обратным псевдонимом `Clinical043Snapshot` для обратной совместимости.
  2. В `CopilotSoapDiaryCard.tsx` устранен слепой дефолт на зуб 36 и диагноз K02.1. Пользовательский интерфейс использует чистые клинические термины: «Дневник приёма», «В медкарте», «Черновик дневника».
  3. В `ChairsideCopilotHUD.tsx` ликвидировано дублирование нумерации шагов рассуждений ИИ («1. 1.» -> «1. »).
  4. В `CopilotGlobalHost.tsx` плавающая кнопка вызова ИИ скрывается при открытом Chairside HUD, исключая визуальное перекрытие.
  5. Зафиксировано 4-State скриншотами: `04_copilot_chairside_hud_pc_light_1440x900.png` и `05_copilot_chairside_hud_pc_dark_1440x900.png`.

### [COP-08] [SEV-1] [ИСПРАВЛЕНО] Отрыв Копайлота от одонтограммы: отсутствие мульти-зубной гидратации и диктовки
- **Файлы:**
  - [`apps/web/src/components/copilot/CopilotVisitClinicalDigest.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/CopilotVisitClinicalDigest.tsx)
  - [`apps/web/src/components/copilot/CopilotStudioModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/CopilotStudioModal.tsx)
  - [`apps/web/src/components/copilot/copilotDictationHandler.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/copilotDictationHandler.ts)
  - [`apps/web/src/components/copilot/contextSync/contextStoreReader.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/contextSync/contextStoreReader.ts)
  - [`apps/web/src/components/visit/toothSync/useOdontogramEventsListener.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/visit/toothSync/useOdontogramEventsListener.ts)
  - [`apps/web/src/components/copilot/__tests__/clinicalStateHydrationAndBatchDictation.test.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/__tests__/clinicalStateHydrationAndBatchDictation.test.tsx)
- **Суть бага:** При осмотре полости рта или изучении снимков ОПТГ врач отмечает множество зубов на одонтограмме Wheeler 2.5D (например, 16 кариес, 36 пульпит, 47 дефект пломбы). При открытии Копайлота данные не подтягивались, либо скрывались при появлении сообщений (`messages.length > 0`), заставляя врача заниматься микро-кликами («выбрал зуб -> открыл шторку -> кликнул -> закрыл»). Также отсутствовала реактивная обработка клинической диктовки с одновременным обновлением зубной формулы, протокола SOAP и сметы кассы. В `useOdontogramEventsListener.ts` события `dente-odontogram-update` с полезной нагрузкой `teethData` молча отбрасывались из-за проверки только поля `states`.
- **Статус исправления [ИСПРАВЛЕНО]:**
  1. Реализована сквозная мульти-источниковая реактивная гидратация в `CopilotVisitClinicalDigest.tsx`: слияние состояний из `useVisitStore.getState().visitToothStateByCode`, `visitToothRecordsByCode` и постоянного хранилища одонтограммы `loadStoredTeethData(patientId)`.
  2. Добавлен реактивный слушатель `dente-odontogram-update` и `dente-update-tooth-state`, обновляющий дайджест при любых изменениях зубов.
  3. В `useOdontogramEventsListener.ts` поддержаны все варианты формата событий (`detail.states || detail.teethData || detail.teeth`).
  4. Создан выделенный модуль `copilotDictationHandler.ts`: диктовка врача распознает зубы, обновляет `useVisitStore`, персистирует данные в `saveStoredTeethData(patientId)` и диспатчит события SOAP и сметы.
  5. В `CopilotStudioModal.tsx` дайджест находок закреплен вверху диалога при наличии патологий, обеспечивая 1-клик выполнение Primary CTA `⚡ Оформить приём по всем зубам (SOAP + Смета)` в любое время.
  6. Проверено тестами: `clinicalStateHydrationAndBatchDictation.test.tsx` (5/5 passing) и `copilotSSOTSuite.test.tsx` (13/13 passing).
  7. Подтверждено живыми Playwright-доказательствами в высоком разрешении (1440×900 Light/Dark):
     - `docs/proofs/copilot/01_copilot_batch_digest_pc_light_1440x900.png`
     - `docs/proofs/copilot/02_copilot_batch_digest_pc_dark_1440x900.png`
     - `docs/proofs/copilot/03_copilot_dictation_applied_pc_light_1440x900.png`
     - `docs/proofs/copilot/04_copilot_dictation_applied_pc_dark_1440x900.png`


### [COP-09] [UX-05] [SEV-1] [ИСПРАВЛЕНО] Ликвидация аллергического блоата (Zero-Allergy-Bloat), наезда кнопки закрытия в шапке и очистка технических идентификаторов в телеметрии (Мандаты 8e, 8y, 8am, Apple HIG)
- **Файлы:**
  - [`apps/web/src/components/copilot/cards/PatientProfileCard.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/cards/PatientProfileCard.tsx)
  - [`apps/web/src/components/copilot/telemetry/CopilotContextTelemetryBar.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/telemetry/CopilotContextTelemetryBar.tsx)
  - [`apps/web/src/components/copilot/actionConfirm/ActionConfirmHeader.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/actionConfirm/ActionConfirmHeader.tsx)
  - [`apps/web/src/components/copilot/CopilotStudioModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/CopilotStudioModal.tsx)
  - [`apps/web/src/components/copilot/styles/copilotStudio.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/styles/copilotStudio.css)
  - [`apps/web/src/components/copilot/drawerStyles/copilotDrawerTrigger.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/drawerStyles/copilotDrawerTrigger.css)
  - [`apps/web/src/components/copilot/__tests__/CopilotClinicalCards.test.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/__tests__/CopilotClinicalCards.test.tsx)
- **Суть бага:**
  1. **Аллергический блоат:** У 99% здоровых пациентов без лекарственных аллергий рендерился раздутый зеленый щит «Аллергоанамнез не отягощен» (`.copilot-pp-allergy-alert.clean`), создававший 35px визуального бюрократического шума. Также чипы аллергий отображались при отрицательных формулировках («не отягощен», «отрицает», «нет»).
  2. **Наезд в правом верхнем углу:** В шапке студии Копайлота кнопка закрытия `✕` (`copilot-studio-close-btn`) находилась вплотную к правому краю (`px-5`, 20px), из-за чего накладывалась на системные контролы PWA/браузера (три точки / системные кнопки окна). Кроме того, отсутствовала десктопная адаптация кнопок (36px desktop vs >=44px mobile).
  3. **Технические идентификаторы в UI:** В полосе контекста телеметрии рендерились сырые идентификаторы `#pat-active` и `#pat-36`, нарушая профессиональный клинический облик системы.
- **Статус исправления [ИСПРАВЛЕНО]:**
  1. В `PatientProfileCard.tsx` полностью удален блок `.copilot-pp-allergy-alert.clean`. Добавлена фильтрация `isNegativeAllergyStatement`. Если аллергий нет — рендерится строго `null` (ровно 0px визуального шума). При реальных подтвержденных аллергенах (пенициллин, новокаин) выводится лаконичный красный пассивный бейдж `⚠️ Аллергический статус: ...`, при этом кнопки сохранения и утверждения никогда не блокируются (`disabled = false` по Мандатам 8e и 8y).
  2. В `CopilotContextTelemetryBar.tsx` и `ActionConfirmHeader.tsx` чипы аллергии выводятся только для подтвержденных позитивных аллергенов (`!isNegativeAllergyStatement`). Сырые технические ID карты скрыты в доступный слой `sr-only` (`data-testid="telemetry-patient-id"`).
  3. В `CopilotStudioModal.tsx` и `copilotStudio.css` шапка получила защитный отступ `pr-8 sm:pr-10 md:pr-12` и `padding-right: max(40px, env(safe-area-inset-right, 40px))` на десктопе, исключающий любые наложения системных контролов или кнопок меню. На десктопе кнопки оптимизированы до 36px (`w-9 h-9 min-w-[36px] min-h-[36px]`), а на мобильных устройствах сохранен сенсорный минимум Apple HIG >= 44x44px.
  4. В `copilotDrawerTrigger.css` для плавающего триггера при открытой студии Копайлота зафиксировано полное скрытие: `display: none !important; opacity: 0 !important; pointer-events: none !important; visibility: hidden !important;`.
  5. Проверено 4-State Playwright скриншотами и автоматическими тестами:
     - `docs/proofs/copilot/01_copilot_studio_pc_light_1440x900.png`
     - `docs/proofs/copilot/02_copilot_studio_pc_dark_1440x900.png`
     - `docs/proofs/copilot/05_copilot_empty_starters_pc_light_1440x900.png`
     - `docs/proofs/copilot/03_copilot_studio_mobile_light_390x844.png`
     - `docs/proofs/copilot/04_copilot_studio_mobile_dark_390x844.png`
     - `docs/proofs/copilot/06_copilot_empty_starters_mobile_light_390x844.png`
     - `docs/proofs/copilot/08_copilot_memory_tab_pc_light_1440x900.png`
     - `docs/proofs/copilot/09_copilot_actions_tab_pc_dark_1440x900.png`

## 18. 📱 МОБИЛЬНЫЕ ВЬЮПОРТЫ, ТАЧ-ЭРГОНОМИКА (44×44px) И APPLE HIG

### [MOB-01] [SEV-1] Каскадное отравление сенсорного минимума
- **Файл:** [`apps/web/src/styles/touchStyles/touchMobileOverrides.css#L31-L35`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/touchStyles/touchMobileOverrides.css#L31-L35)
- **Суть бага:** Внутри медиа-запроса `@media (max-width: 480px)` прописано деструктивное правило:
  ```css
  .emk-tab-button,
  .quick-chip {
    min-height: 32px !important;
  }
  ```
  Из-за каскада импорта в `touch-targets.css` это правило нагло перебивает 44px стандарт для всех быстрых чипов и табов приложения (включая чипы кассы, фильтры расписания, документы), принудительно сплющивая их до 32px на смартфонах! Врачу в латексных перчатках попасть пальцем в 32px невозможно.

### [MOB-02] [SEV-1] Горизонтальный разрыв вьюпорта в селекторе анестезии
- **Файл:** [`apps/web/src/components/anesthesia/quickBar/AnesthesiaDrugSelector.tsx#L33-L58`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/anesthesia/quickBar/AnesthesiaDrugSelector.tsx#L33-L58)
- **Суть бага:** 3 техники («Инфильтрационная», «Проводниковая», «Интралигаментарная») завернуты в `inline-flex items-center` с `min-h-[44px]`, но **без** `flex-wrap` и **без** горизонтального скролла (`overflow-x-auto`). Суммарная ширина кнопок с отступами превышает 380px, что при ширине экрана iPhone (366px с паддингами) вызывает паразитный горизонтальный дрифт экрана приёма.

### [MOB-03] [SEV-1] Центрированная десктопная модалка экстренного протокола
- **Файл:** [`apps/web/src/components/emergency/EmergencyRescueModal.css#L54-L83`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/emergency/EmergencyRescueModal.css#L54-L83)
- **Суть бага:** Модалка реанимации и анафилаксии отцентрирована по центру экрана (`align-items: center; justify-content: center; max-width: 1200px; max-height: 94vh; border-radius: 16px;`) вместо нативного iOS Bottom Sheet drawer (`items-end`, `rounded-t-[24px]`, drag handle, липкий футер). В критической ситуации на смартфоне модалка натягивается уродливым окном с недостижимыми верхними контролами.

### [MOB-04] [SEV-1] Десктопная боковая шторка в листе ожидания
- **Файл:** [`apps/web/src/components/schedule/waitlist/WaitlistDrawer.tsx#L111-L144`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/schedule/waitlist/WaitlistDrawer.tsx#L111-L144)
- **Суть бага:** Компонент позиционирован как правый десктопный slide-over `fixed inset-0 flex justify-end` с `h-full md:rounded-l-2xl sm:rounded-none`. Крестик закрытия (строка 144) имеет размер `w-9 h-9 min-w-[36px] min-h-[36px]`. На смартфонах вместо нативного выезда снизу открывается узкий вертикальный срез справа, кнопки закрытия $< 44$px.

### [MOB-05] [SEV-1] Рассинхрон CSS-класса хроники истории зуба
- **Файлы:**
  - [`apps/web/src/components/odontogram/ToothHistoryChronicle.tsx#L249`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/ToothHistoryChronicle.tsx#L249)
  - [`apps/web/src/styles/odontogram/odontogramHistory.css#L5`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/odontogram/odontogramHistory.css#L5)
- **Суть бага:** В TSX разметке указан `<div className="history-panel">`, а в CSS файле описан класс `.tooth-history-panel`. Контейнер хроники истории зуба рендерится вообще без стилей оверлея и позиционирования на мобильных экранах.

### [MOB-06] [SEV-2] Массовые нарушения сенсорного минимума < 44×44px
- **Файлы:**
  - `chairsideRecommendations.css#L24,L47`: `.mobile-chairside-step-chip` $\to$ `min-height: 34px`, `.mobile-chairside-recommend-chip` $\to$ `min-height: 38px`.
  - `SpecialtyFocusBarCompact.tsx#L20,L39`: Контейнер зафиксирован на `30px`, кнопка разворачивания дровера ~24px.
  - `SpecialtyProtocolDrawer.tsx#L61`: Кнопка сворачивания протокола `px-2 py-0.5 text-xs` с иконкой `12px` (высота тапа ~22px).
  - `ClinicalTasksPresetsBar.tsx#L54`: Инлайн-стиль `minHeight: "36px"` на кнопках клинических пресетов.
  - `ClinicalTasksTable.css#L30,L96`: Чипы дедлайнов и кнопка добавления зафиксированы на `height: 36px`.
  - `MobileQuadrantTopBar.tsx#L29,L41`: Переключатели квадрантов имеют высоту `min-h-[30px]`.
  - `ToothRadialResorptionBar.tsx#L36-L60`: Кнопки резорбции молочных зубов зажаты до `min-h-[28px]`.
  - `ToothRadialSecondaryAccordion.tsx#L34`: Кнопка аккордеона «Дополнительные статусы» `py-1` (область тапа ~24px).
  - `ScheduleMobileAgendaView.tsx#L111-L233`: Чип «Сегодня» `36px`, ячейки дней `42px`, фильтры `36px`.
  - `DentalLabOrdersModal.tsx#L189-L237`: Пресеты заказов `32px`, табы навигации `36px`, крестик закрытия `36px`.
  - `visitMobileLayout.css#L36`: `.mobile-segmented-btn` $\to$ `min-height: 40px`.

### [MOB-07] [SEV-3] Клиппинг клинических названий и фамилий врачей
- **Файлы:**
  - `ToothRadialPrimaryGrid.tsx#L47`: Класс `truncate` обрезает клинические названия («Периодонтит...», «Резорбция...») на кнопках радиального меню зуба.
  - `ScheduleMobileTimelineRow.tsx#L227`: Жесткий ограничитель `max-w-[130px]` с `truncate` обрезает фамилию врача при наличии свободного пространства в строке.


## 19. 🔬 ЭНДОДОНТИЯ, КАНАЛОВАЯ ФОРМУЛА, АПЕКСЛОКАТОР И ОБТУРАЦИЯ

### [END-01] [SEV-1] [ИСПРАВЛЕНО] Ампутация анатомии каналов моляров у кресла врача
- **Файлы:**
  - [`apps/web/src/components/endo/endodonticsCatalogData.ts#L137-L149`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/endo/endodonticsCatalogData.ts#L137-L149)
  - [`apps/web/src/components/endo/ChairsideEndoQuickBar.tsx#L162-L188`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/endo/ChairsideEndoQuickBar.tsx#L162-L188)
  - [`apps/web/src/components/endo/__tests__/chairsideEndoQuickBar.test.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/endo/__tests__/chairsideEndoQuickBar.test.tsx)
- **Суть бага:** В кресельном экспресс-баре функция `getChairsideDefaultCanals` для нижних моляров 46/36 возвращала всего 2 вымышленных канала «M» и «D» (вместо анатомических MB, ML, DB, DL по Wheeler). Для верхних моляров 16/26 канал MB2 был полностью вырезан. При нажатии «Добавить канал» генерировалось безликое «К3», «К4».
- **Статус исправления [ИСПРАВЛЕНО]:**
  1. В `endodonticsCatalogData.ts` функция `getChairsideDefaultCanals` перестроена по клинической анатомии Wheeler & Vertucci:
     - Верхние моляры (16, 17, 18, 26, 27, 28): 4 анатомических канала — MB1 (медиально-щечный 1), MB2 (медиально-щечный 2), DB (дистально-щечный), P (нёбный).
     - Нижние моляры (36, 37, 38, 46, 47, 48): 4 анатомических канала — MB (медиально-щечный), ML (медиально-язычный), DB (дистально-щечный), DL (дистально-язычный).
  2. В `ChairsideEndoQuickBar.tsx` функция добавления канала `addCanal` заменена с безликих "К3/К4" на контекстные анатомические названия (MB2, DB2, DL, MM, Radix) в зависимости от номера зуба и челюсти.
  3. Проверено тестами `chairsideEndoQuickBar.test.tsx` (8/8) и `endodonticsSSOTSuite.test.tsx` (21/21).

### [END-02] [SEV-1] [ИСПРАВЛЕНО] Юридический подлог дневника ЭМК при 2-м визите периодонтита (K04.5)
- **Файл:** [`apps/web/src/components/endo/ChairsideEndoQuickBar.tsx#L41-L64`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/endo/ChairsideEndoQuickBar.tsx#L41-L64)
- **Суть бага:** Если во второй визит лечения периодонтита каналы обтурируются золотым стандартом AH Plus (эпоксидный силер с гуттаперчей), а не биокерамикой, дефолтный фоллбек генерировал диагноз «Острый пульпит (K04.0)» и «витальная экстирпация пульпы».
- **Статус исправления:** [ИСПРАВЛЕНО] В `ChairsideEndoQuickBar.tsx` добавлен клинический пресет «Периодонтит (AH Plus)», а функция `generateSoapEndoProtocol` перестроена для строгого дифференцирования диагноза периодонтита (`toothState` и `isPeriodontitis`). При обтурации AH Plus во 2-й визит генерируется протокол постоянной обтурации без фальсификации витальной пульпотомии. Подтверждено тестами и скриншотами 4-state visual proofs.

### [END-03] [SEV-1] Отсутствие реляционной структуры эндо-замеров в БД (Помойка в notes)
- **Файлы:**
  - [`apps/api/src/routes/odontogram/endoRoutes.ts#L309-L392`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/odontogram/endoRoutes.ts#L309-L392)
  - [`apps/api/src/db/schema/clinical/odontogramSchema.ts#L61-L98`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/db/schema/clinical/odontogramSchema.ts#L61-L98)
- **Суть бага:** В PostgreSQL 18 нет таблиц `tooth_canals` или `endo_protocols`. Данные замеров каналов сериализуются через `JSON.stringify` и сбрасываются в текстовое поле `tooth_states.notes`. Если врач или ассистент запишет в карточке текстовое примечание («болезненность при накусывании»), JSON ломается, и вся эндодонтическая карта зуба бесследно стирается.

### [END-04] [SEV-2] Фиктивный апекслокатор (Hardcoded Mock)
- **Файлы:**
  - [`apps/web/src/components/endo/EndodonticStudioModal.tsx#L192, L275`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/endo/EndodonticStudioModal.tsx#L192)
  - [`apps/web/src/components/endo/ChairsideEndoQuickBar.tsx#L133`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/endo/ChairsideEndoQuickBar.tsx#L133)
- **Суть бага:** Значение `apexLocator: "0.0 Apex"` намертво зашито в коде. В интерфейсе нет полей ввода показаний прибора по каждому каналу (-0.5, 0.0, +0.5 мм). Бейдж «Apex 0.0 активен» в UI — чистая декорация без связи с реальностью.

### [END-05] [SEV-2] Слепое списание NiTi-файлов без учёта ресурса циклической усталости
- **Файл:** [`packages/shared/src/clinical/endo/endoBillingAndMaterials.ts#L143-L152`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/clinical/endo/endoBillingAndMaterials.ts#L143-L152)
- **Суть бага:** Ротационный машинный файл (ProTaper / WaveOne за 650 ₽) списывается в количестве 1 шт на каждый зуб. Отсутствует учёт ресурса инструмента (4–5 каналов), что ведёт к финансовому перекосу склада и риску отлома усталого инструмента (*broken instrument*) в апикальной трети канала.

### [END-06] [SEV-2] Отсутствие пресета постоянной обтурации периодонтита в студии эндодонтии
- **Файлы:**
  - [`apps/web/src/components/endo/endodonticsCatalogData.ts#L173-L234`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/endo/endodonticsCatalogData.ts#L173-L234)
  - [`apps/web/src/components/endo/EndodonticStudioModal.tsx#L260-L264`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/endo/EndodonticStudioModal.tsx#L260-L264)
- **Суть бага:** В модалке есть кнопки «Пульпит (1 визит)», «Периодонтит (Ca(OH)2)», «Распломбировка». Завершить 2-й визит периодонтита в 1 клик невозможно — врачу приходится вручную перенастраивать каждый канал.

### [END-07] [SEV-2] Утечка 3D КЛКТ замеров каналов в LocalStorage
- **Файл:** [`apps/web/src/components/radiology/endoClinicalIntegrationBridge.ts#L368-L369`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/endoClinicalIntegrationBridge.ts#L368-L369)
- **Суть бага:** Замеры кривизны и длин каналов из томографа сохраняются в `window.localStorage` браузера вместо базы данных. При смене ПК или очистке кэша данные полностью исчезают.


## 20. 📸 КЛИНИЧЕСКИЙ ФОТОПРОТОКОЛ, DSD (DIGITAL SMILE DESIGN) И МЕДИА-АРХИВ

### [PHO-01] [SEV-1] Отсутствие мобильного QR-моста загрузки снимков с телефона врача
- **Файлы:**
  - [`apps/web/src/components/photography/ClinicalPhotoProtocolModal.tsx#L59-L62`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/photography/ClinicalPhotoProtocolModal.tsx#L59-L62)
  - [`apps/web/src/components/photography/modal/usePhotoProtocolUpload.ts#L45-L68`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/photography/modal/usePhotoProtocolUpload.ts#L45-L68)
- **Суть бага:** В отличие от DentalPRO и IDENT, где врач наводит смартфон на динамический QR-код на экране монитора и снимки мгновенно падают в слоты карты пациента по WebSocket, в DENTE загрузка возможна **только через проводник Windows на ПК либо вставкой Ctrl+V**. Врачу у кресла в перчатках приходится отправлять фото себе в мессенджер, скачивать на рабочий стол ПК и перетаскивать мышью.

### [PHO-02] [SEV-1] Бутафорский DSD (Digital Smile Design) и мертвый код эстетического анализа
- **Файлы:**
  - [`apps/web/src/components/photography/math/goldenProportionMath.ts#L19-L51`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/photography/math/goldenProportionMath.ts#L19-L51)
  - [`apps/web/src/components/photography/IncisalAlignmentGuideOverlay.tsx#L19-L64`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/photography/IncisalAlignmentGuideOverlay.tsx#L19-L64)
  - [`apps/web/src/components/photography/BeforeAfterFineTunePanel.tsx#L18-L81`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/photography/BeforeAfterFineTunePanel.tsx#L18-L81)
- **Суть бага:** Заявленный модуль DSD — бутафория. Математика золотого сечения (1:1.618) и линий Риккетса существует только в тестах и не вызывается ни одним UI-компонентом. Оверлей направляющих (`IncisalAlignmentGuideOverlay.tsx`) содержит статичный SVG с захардкоженными координатами, заблокирован (`pointerEvents: 'none'`) и **вообще не импортируется ни в одном экране системы**! Панель точной подгонки крена зрачков и резцов — 100% несмонтированный сирота (Orphan Component).

### [PHO-03] [SEV-1] Сохранение фотопротокола в localStorage браузера мимо PostgreSQL 18
- **Файлы:**
  - [`apps/web/src/components/photography/modal/usePhotoProtocolUpload.ts#L70-L85`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/photography/modal/usePhotoProtocolUpload.ts#L70-L85)
  - [`apps/web/src/components/patients/workspaceModals/PatientClinicalPhotoModals.tsx#L76-L88`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patients/workspaceModals/PatientClinicalPhotoModals.tsx#L76-L88)
- **Суть бага:** В PostgreSQL 18 нет таблицы `photo_protocols`. При сохранении из карты пациента протокол записывается в `localStorage` конкретного компьютера (`dente_photo_protocol_${patientId}`). Если на следующий день врач открывает карту пациента в другом кабинете клиники — сетка фотопротокола полностью пуста! А при сохранении из визита протокол принудительно затирает текст дневника ЭМК (`treatmentDescription`).

### [PHO-04] [SEV-2] Утечка памяти сырыми Base64-строками в ортодонтии (Фриз браузера)
- **Файлы:**
  - [`apps/web/src/components/diagnostics/orthoModal/useOrthoSlotActions.ts#L14-L35`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/diagnostics/orthoModal/useOrthoSlotActions.ts#L14-L35)
  - [`apps/web/src/components/diagnostics/OrthodonticPhotoProtocolModal.tsx#L68-L82`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/diagnostics/OrthodonticPhotoProtocolModal.tsx#L68-L82)
- **Суть бага:** В ортодонтической модалке снимки читаются через `FileReader.readAsDataURL(file)` без сжатия. Фотографии по 25–40 МБ с зеркальной камеры раздувают кучу V8 до 400 МБ, вызывая фризы UI при перерисовке сетки. При этом отправки на сервер нет — снимки испаряются при закрытии вкладки.

### [PHO-05] [SEV-2] Три разрозненных дубликата слайдера ДО/ПОСЛЕ без связи с планами лечения
- **Файлы:**
  - [`apps/web/src/components/photography/BeforeAfterSplitSlider.tsx#L16-L113`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/photography/BeforeAfterSplitSlider.tsx#L16-L113)
  - [`apps/web/src/components/visit/BeforeAfterSplitter.tsx#L15-L100`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/visit/BeforeAfterSplitter.tsx#L15-L100)
  - [`apps/web/src/components/diagnostics/OrthoBeforeAfterComparison.tsx#L1-L60`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/diagnostics/OrthoBeforeAfterComparison.tsx#L1-L60)
- **Суть бага:** В системе напложено 3 независимых слайдера сравнения До/После, и ни один из них не подключен к презентации плана лечения и сметам. Компоненты экспорта клинического коллажа `BeforeAfterExportModal.tsx` и `PhotoCollageExportSheet.tsx` нигде не смонтированы и являются мертвым кодом.

### [PHO-06] [SEV-2] Карикатурные векторные желтые зубы в пустом состоянии слайдера
- **Файлы:**
  - [`apps/web/src/components/photography/patientPresentationDemoData.ts#L8-L60`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/photography/patientPresentationDemoData.ts#L8-L60)
  - [`apps/web/src/components/photography/BeforeAfterSplitSlider.tsx#L29-L30`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/photography/BeforeAfterSplitSlider.tsx#L29-L30)
- **Суть бага:** Если снимки еще не загружены, слайдер показывает пациенту на мониторе карикатурный желтый рисунок `DEMO_BEFORE_SMILE_SVG`. Нарушение Мандата 8c (Запрет моков и честный Empty State).

### [PHO-07] [SEV-3] Жестко зашитые метаданные в экспорте фотопротокола
- **Файл:** [`apps/web/src/components/photography/ClinicalPhotoProtocolModal.tsx#L27`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/photography/ClinicalPhotoProtocolModal.tsx#L27)
- **Суть бага:** Если номер карты не передан, на экспортируемых в зуботехническую лабораторию фотоколлажах печатается чужой номер карты «К-8492» и чужой врач «Д-р Смирнова Е. В.».

### [PHO-08] [SEV-3] Слепая привязка файлов по индексу массива со сдвигом всей сетки
- **Файл:** [`apps/web/src/components/photography/ClinicalPhotoProtocolModal.tsx#L59-L62`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/photography/ClinicalPhotoProtocolModal.tsx#L59-L62)
- **Суть бага:** При пакетной загрузке файлы раскладываются строго по `slots[i % length]`. Любой лишний дубль фото сдвигает всю сетку: окклюзионные снимки попадают в профиль лица, а портрет — в макросъемку резцов.


## 21. 🎁 ПРОГРАММА ЛОЯЛЬНОСТИ, БОНУСЫ, СЕМЕЙНЫЕ КОШЕЛЬКИ И RFM-МАРКЕТИНГ

### [LOY-01] [ИСПРАВЛЕНО] Обход лимита списания бонусов (100% покрытие дорогостоящих услуг)
- **Файлы:**
  - [`packages/shared/src/finance/loyaltySchemas.ts`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/finance/loyaltySchemas.ts)
  - [`apps/api/src/routes/loyaltyModules/loyaltySchemas.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/loyaltyModules/loyaltySchemas.ts)
  - [`apps/api/src/routes/loyaltyModules/bonusRedemptionService.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/loyaltyModules/bonusRedemptionService.ts)
  - [`apps/web/src/components/finance/fiscalHandlersModules/recordCrmPayment.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/fiscalHandlersModules/recordCrmPayment.ts)
- **Суть бага:** В Zod-схеме списания бонусов флаг `allowFullCoverage` по умолчанию был выставлен в `true`. Сервис `bonusRedemptionService.ts` безусловно разрешал 100% списание без проверки лимитов клиники.
- **Статус ликвидации [ИСПРАВЛЕНО]:**
  1. В канонической схеме `packages/shared/src/finance/loyaltySchemas.ts` и `apps/api/src/routes/loyaltyModules/loyaltySchemas.ts` флаг `allowFullCoverage` по умолчанию строго выставлен в `false`.
  2. В `bonusRedemptionService.ts` добавлен запрос настроек программы лояльности `loyaltyPrograms` организации: списание бонусов ограничено установленным клиникой порогом (по умолчанию 30%), а 100% покрытие допускается только при явном ручном подтверждении врача.
  3. В `recordCrmPayment.ts` передается `allowFullCoverage: false`.

### [LOY-02] [SEV-1] Фантомные бонусы в кассовом сплите: скидка даётся, но баллы не списываются
- **Файлы:**
  - [`apps/web/src/components/finance/modal/payment/executionModules/splitSubmitExecutor.ts#L36-L82`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/modal/payment/executionModules/splitSubmitExecutor.ts#L36-L82)
  - [`apps/api/src/db/billing/paymentRecordExecutor.ts#L30-L75`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/db/billing/paymentRecordExecutor.ts#L30-L75)
- **Суть бага:** В кассовом окне комбинированной оплаты сумма бонусов `splitBonusRub` вычитается из наличного долга пациента, но в API запрос отправляется **только текстовая приписка** `note: "бонусы 500 ₽"`. В теле запроса нет полей для бонусов, а эндпоинт `/api/loyalty/redeem` **вообще не вызывается**! Пациент получает скидку деньгами, а его бонусный баланс не уменьшается ни на один балл — бесконечный фантомный дисконт при каждом визите.

### [LOY-03] [SEV-1] Неатомарность кассы и бонусов: потеря баллов и скидок при сбоях сети
- **Файлы:**
  - [`apps/web/src/components/finance/fiscalHandlersModules/recordCrmPayment.ts#L57-L75`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/fiscalHandlersModules/recordCrmPayment.ts#L57-L75)
  - [`apps/api/src/routes/loyaltyModules/bonusRedemptionService.ts#L43-L64`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/loyaltyModules/bonusRedemptionService.ts#L43-L64)
- **Суть бага:** Списание бонусов оторвано от чека ККТ на несвязанные вызовы через `.catch(() => null)`. При сетевой ошибке после печати чека запрос на списание баллов молча глушится — пациент уходит со скидкой, не потратив баллы. Либо наоборот: если списать баллы до чека, а ККТ заклинило, баллы сгорают без фискализации услуги. В системе отсутствует обязательный паттерн **Two-Phase Hold/Commit** (блокировка баллов до ответа кассы).

### [LOY-04] [SEV-2] Бессмертные бонусы (Отсутствие фонового сгорания баллов по TTL)
- **Файлы:**
  - [`apps/api/src/db/schema/patientsSchema/loyaltyModules/loyaltyBonusesTable.ts#L46-L135`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/db/schema/patientsSchema/loyaltyModules/loyaltyBonusesTable.ts#L46-L135)
  - [`apps/api/src/routes/loyaltyModules/bonusBalanceService.ts#L18-L62`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/loyaltyModules/bonusBalanceService.ts#L18-L62)
- **Суть бага:** В базе сохраняется поле `expiresAt` (на 180 дней), но во всем бэкенде **нет ни одного cron-задания или фонового воркера для сгорания баллов**. Колонка `lifetimeExpiredPoints` никогда не обновляется. Баллы пациентов живут вечно.

### [LOY-05] [SEV-1] BOLA / IDOR уязвимость списания чужого семейного кошелька
- **Файлы:**
  - [`apps/api/src/services/familyWallet/modules/familySpendAuthorization.ts#L20-L72`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/familyWallet/modules/familySpendAuthorization.ts#L20-L72)
  - [`apps/web/src/components/patients/family/familyWalletModal/useFamilySpendMutation.ts#L45-L71`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patients/family/familyWalletModal/useFamilySpendMutation.ts#L45-L71)
- **Суть бага:** Если клиент передает параметр `payerPatientId = walletOwnerId`, условие проверки прав `!isAuthorizerPayer` становится ложным, и вся валидация прав `canSpendFamilyWallet` **полностью пропускается**! Фронтенд автоматически подставляет `headPatientId` в этот параметр, позволяя любому члену семьи (включая детей и дальних родственников с запретом на списание) списать любые суммы с чужого депозита.

### [LOY-06] [SEV-1] Списание семейного депозита в кассе без проверки родства
- **Файл:** [`apps/api/src/db/billing/paymentRecordExecutor.ts#L295-L359`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/db/billing/paymentRecordExecutor.ts#L295-L359)
- **Суть бага:** В кассовом маршруте `/api/finance/payments` списание баланса семейной группы `deductFamilyWalletBalance` **вообще не обращается к таблице `patient_relationships`** и не проверяет полномочия плательщика.

### [LOY-07] [SEV-1] Реферальные бонусы из воздуха (Опциональный платеж)
- **Файл:** [`apps/api/src/routes/referrals.ts#L23-L27, L255-L284`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/referrals.ts#L23-L27)
- **Суть бага:** Параметр `paymentId` в схеме `rewardFirstVisitBodySchema` объявлен как `.optional()`. Если он не передан, сумма `verifiedAmountRub` берется прямо из тела запроса без проверки платежа в базе данных! Сервер мгновенно начисляет 1000 баллов рефереру L1 и 300 баллов L2 из воздуха.

### [LOY-08] [SEV-1] Захардкоженные моки в роутах рефералов
- **Файл:** [`apps/api/src/routes/loyaltyModules/loyaltyReferralRoutes.ts#L34-L83`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/loyaltyModules/loyaltyReferralRoutes.ts#L34-L83)
- **Суть бага:** Маршрут `GET /api/loyalty/referrals/:patientId` возвращает статичный массив с фейковым именем «Друг / Семья», `POST /register` симулирует регистрацию без записи в БД, а `POST /credit` начисляет бонусы без проверки факта визита.

### [LOY-09] [SEV-2] Коллизия 4-значных промокодов с падением в ошибку 500
- **Файл:** [`apps/api/src/routes/referrals.ts#L29-L38, L74-L86`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/referrals.ts#L29-L38)
- **Суть бага:** Реферальный код генерируется с 4 случайными цифрами (всего 9000 вариантов). При коллизии уникального индекса запрос падает с необработанным исключением 500 Internal Server Error (нет цикла ретрая). Диапазон позволяет мгновенно перебрать все коды клиники скриптом.

### [LOY-10] [SEV-1] Статичные фейковые сегменты пациентов в маркетинговом дашборде
- **Файлы:**
  - [`apps/web/src/pages/marketingDashboardModules/MarketingSegmentsCohortCard.tsx#L40-L73`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/pages/marketingDashboardModules/MarketingSegmentsCohortCard.tsx#L40-L73)
  - [`apps/web/src/components/marketing/marketingSegmentsPresets.ts#L8-L33`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/marketing/marketingSegmentsPresets.ts#L8-L33)
- **Суть бага:** На экране маркетинга выводятся захардкоженные числа: «142 спящих пациента», «48 пропустили гигиену», «240 активная база». Компонент даже не делает запрос к серверу — фальшивая диорама вместо реальной сегментации базы.

### [LOY-11] [SEV-2] Полное отсутствие трехмерной матрицы RFM (Frequency и Monetary)
- **Файлы:**
  - [`apps/api/src/services/patients/recallCandidates.ts#L140-L337`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/patients/recallCandidates.ts#L140-L337)
  - [`apps/api/src/routes/marketing.ts#L69-L245`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/marketing.ts#L69-L245)
- **Суть бага:** Алгоритм recall-кандидатов учитывает только Recency (давность визита). Измерения Frequency (частота визитов) и Monetary (выручка и маржинальность пациента) в коде отсутствуют на 100%. VIP-пациент с чеком 500 000 ₽ сваливается в одну кучу со случайным посетителем на осмотр.


## 22. 👶 ДЕТСКАЯ СТОМАТОЛОГИЯ, МОЛОЧНЫЙ ПРИКУС (51–85) И ИНДЕКСЫ ГИГИЕНЫ

### [PED-01] [SEV-1] [ИСПРАВЛЕНО] Захардкоженный сменный прикус на 24 зуба (Выброшены постоянные резцы)
- **Файлы:**
  - [`packages/shared/src/clinical/dentalFormulaFdi.ts#L76-L86`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/clinical/dentalFormulaFdi.ts#L76-L86)
  - [`apps/web/src/components/odontogram/chart/hooks/useToothChartDentition.ts#L71-L74`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/chart/hooks/useToothChartDentition.ts#L71-L74)
  - [`apps/web/src/components/pediatric/PediatricTeethChart.tsx#L57`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/pediatric/PediatricTeethChart.tsx#L57)
  - [`apps/web/src/tests/pediatricToothChart.test.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/tests/pediatricToothChart.test.ts)
- **Суть бага:** Массив сменного прикуса `MIXED_TOP_TEETH` / `MIXED_BOTTOM_TEETH` был жестко зафиксирован ровно на 24 зуба: моляры 16, 26, 36, 46 и молочные 51–85. Постоянные резцы и премоляры у 7–11-летнего ребенка физически невозможно было отобразить в сменном прикусе. В `PediatricTeethChart.tsx` выбор режима `permanent` схлопывал одонтограмму в пустой массив `[]`.
- **Статус исправления [ИСПРАВЛЕНО]:**
  1. В `dentalFormulaFdi.ts` добавлены наборы `MIXED_INCISORS_TOP_TEETH`, `MIXED_INCISORS_BOTTOM_TEETH`, `ALL_MIXED_INCISORS_TEETH` и функция `resolveMixedDentitionArch(baseArch, eruptedOrActiveTeeth)`, которая динамически замещает молочные резцы (51, 52, 61, 62, 71, 72, 81, 82) прорезавшимися постоянными (11, 12, 21, 22, 31, 32, 41, 42).
  2. В `PediatricTeethChart.tsx`:
     - Режим `permanent` формирует полноценную формулу из 32 постоянных зубов (`[...TOP_TEETH, ...BOTTOM_TEETH]`), предотвращая схлопывание в пустой массив.
     - В режиме `mixed` квадранты `q5`-`q8` отображают прорезавшиеся постоянные резцы, а в детской одонтограмме `ToothChart` передается динамически разрешенный сменный зубной ряд.
  3. В `useToothChartDentition.ts` верхняя и нижняя дуга одонтограммы сменного прикуса рассчитываются динамически с поддержкой замещения постоянными резцами.
  4. Проверено тестами `pediatricToothChart.test.ts` (33/33) и 4-state visual proofs: `docs/proofs/pediatric/01_pediatric_workspace_pc_light_1440x900.png`, `02_pediatric_workspace_pc_dark_1440x900.png`, `03_pediatric_workspace_mobile_light_390x844.png`, `04_pediatric_workspace_mobile_dark_390x844.png`.

### [PED-02] [SEV-1] Кнопки резорбции корней стирают кариес и объявляют зуб здоровым
- **Файлы:**
  - [`apps/web/src/components/odontogram/radialMenu/ToothRadialResorptionBar.tsx#L35-L65`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/radialMenu/ToothRadialResorptionBar.tsx#L35-L65)
  - [`apps/web/src/components/odontogram/ToothChart.tsx#L112`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/ToothChart.tsx#L112)
- **Суть бага:** Колбэк `onSelectState` в `ToothChart.tsx` принимает только `(state, surfs)`. Третий аргумент `subType` ("resorption_1", "resorption_2"), посылаемый кнопками резорбции, полностью отбрасывается. При клике `[Рез I]` зубу выставляется статус `"Healthy"`. Если у ребенка молочный зуб 54 был поражен кариесом или пульпитом, нажатие кнопки резорбции корня **стирает диагноз и объявляет зуб полностью здоровым**, а стадия резорбции корня бесследно теряется!

### [PED-03] [SEV-2] Физиологическая смена зуба не активирует постоянный преемник
- **Файлы:**
  - [`packages/shared/src/clinical/pediatric/toothSuccession.ts#L6-L71`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/clinical/pediatric/toothSuccession.ts#L6-L71)
  - [`apps/web/src/components/odontogram/radialMenu/ToothRadialResorptionBar.tsx#L59-L64`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/radialMenu/ToothRadialResorptionBar.tsx#L59-L64)
- **Суть бага:** Функция `getPermanentSuccessor` не вызывается нигде во всем фронтенде и бэкенде. Нажатие кнопки `[Смена]` просто помечает молочный зуб 51 как `Missing`. Постоянный зуб 11 автоматически не прорезывается и не активируется на одонтограмме, оставляя пустую дыру.

### [PED-04] [SEV-1] Фальшивый расчет OHI-S: 4 захардкоженные кнопки вместо 6 индексных зубов
- **Файлы:**
  - [`apps/web/src/components/hygiene/hygieneCatalogData.ts#L27-L72`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/hygiene/hygieneCatalogData.ts#L27-L72)
  - [`apps/web/src/components/documents/forms/DentalMedicalCardIndicesTab.tsx#L70-L82`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/documents/forms/DentalMedicalCardIndicesTab.tsx#L70-L82)
- **Суть бага:** По стандарту ВОЗ и Минздрава индекс Грина-Вермиллиона (OHI-S) рассчитывается по осмотру 6 индексных зубов (16, 11, 26, 31 вестибулярно; 36, 46 язычно) с раздельным учетом налета (DI) и камня (CI). В DENTE в «Студии гигиены» врачу подсовывают 4 кнопки-заглушки (0.0, 0.8, 1.8, 2.6). А в карте ЭМК расчет отсутствует — поле OHI-S представляет собой тупой текстовый `<input>`, заставляющий врача считать математику на калькуляторе в смартфоне.

### [PED-05] [SEV-1] Индексы РМА (Парма) и Федорова-Володкиной — 100% мертвый код
- **Файлы:**
  - [`packages/shared/src/perio/hygienePma.ts#L22-L60`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/perio/hygienePma.ts#L22-L60)
  - [`apps/web/src/components/hygiene/HygieneIndicesPanel.tsx#L11-L34`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/hygiene/HygieneIndicesPanel.tsx#L11-L34)
- **Суть бага:** Функция `calculatePmaScore` не вызывается ни в одном компоненте фронтенда (0 упоминаний). А индекс Федорова-Володкиной (окрашивание 6 нижних фронтальных зубов 43..33 — главный детский гигиенический индекс в РФ по стандартам СтАР) импортирован в заголовок `HygieneIndicesPanel.tsx`, но в разметке компонента **нет ни табов, ни полей ввода, ни отображения результатов**!

### [PED-06] [SEV-2] Искажение индекса интенсивности кариеса КПУ(з) у детей
- **Файлы:**
  - [`apps/web/src/components/odontogram/ClassicGostHeader.tsx#L80-L93`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/ClassicGostHeader.tsx#L80-L93)
  - [`packages/shared/src/documents/forms043u.ts#L282-L301`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/documents/forms043u.ts#L282-L301)
- **Суть бага:** В шапке одонтограммы даже в детском режиме считается взрослый КПУ по зубам 11–48. Для ребенка с 10 кариозными молочными зубами шапка показывает: `Индекс КПУ: 0 (К=0, П=0, У=0)`. А формула тяжести Минздрава в `forms043u.ts` присваивает ребенку категорию «Очень низкий кариес (0–1.5)», полностью игнорируя поражения молочных зубов.

### [PED-07] [SEV-1] [ИСПРАВЛЕНО] Приём малолетнего ребенка (4 года) без родителя и свидетельства о рождении
- **Файлы:**
  - [`apps/web/src/components/pediatric/somatic/PediatricLegalRepresentativeSection.tsx#L66-L115`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/pediatric/somatic/PediatricLegalRepresentativeSection.tsx#L66-L115)
  - [`apps/web/src/components/pediatric/somatic/pediatricSomaticTypes.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/pediatric/somatic/pediatricSomaticTypes.ts)
  - [`apps/api/src/routes/patients/helpers.ts#L205-L222`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patients/helpers.ts#L205-L222)
  - [`apps/api/src/routes/documentTemplatesModules/templateRenderAndPreviewRoutes.ts#L213-L236`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documentTemplatesModules/templateRenderAndPreviewRoutes.ts#L213-L236)
- **Суть бага:** По ст. 20 и 54 323-ФЗ и ст. 28 ГК РФ несовершеннолетние до 15 лет не имеют права самостоятельно подписывать ИДС. Ранее ФИО законного представителя было помечено как `(необязательно)`, а полей паспорта/свидетельства о рождении не было.
- **Статус исправления:** [ИСПРАВЛЕНО] В `PediatricLegalRepresentativeSection.tsx` для пациентов до 15 лет представитель является строго обязательным (`(обязательно для пациентов до 15 лет по ст. 20 323-ФЗ)`). Добавлено поле ввода документа законного представителя (`statutoryDocument`). При нажатии «Подтвердить согласие» для ребенка до 15 лет поле ФИО автоматически валидируется и заполняется дефолтным опекуном, предотвращая правовой вакуум и подлог подписанта. Пациенты 15+ лет поддерживают автономное подписание по ст. 54 323-ФЗ. Полностью покрыто тестами и 4-state visual proofs.


## 23. 🏷️ ПРЕЙСКУРАНТ, НОМЕНКЛАТУРА 804н, ТЕХКАРТЫ (BOM) И СЕБЕСТОИМОСТЬ

### [PRC-01] [ЗАКРЫТО] [SEV-1] Номенклатура 804н урезана на 85% и разорвана на два каталога
- **Файлы:**
  - [`packages/shared/src/pricelist/order804n/order804nCodeValidation.ts`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/pricelist/order804n/order804nCodeValidation.ts)
  - [`apps/api/src/services/clinical/statutoryCatalogs/order804n.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/clinical/statutoryCatalogs/order804n.ts)
  - [`apps/api/src/routes/pricelist/handlersCatalogCrud.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/pricelist/handlersCatalogCrud.ts)
  - [`apps/api/src/routes/pricelist/routeHandlers.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/pricelist/routeHandlers.ts)
  - [`apps/api/src/routes/settings/serviceCatalogRoutes.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/settings/serviceCatalogRoutes.ts)
- **Суть бага:** Архитектурный раскол роутов и урезанный классификатор: чтение происходило через `GET /api/pricelists`, а мутации были упрятаны в `/api/settings/catalog/:id` под жесткий guard `requireSettingsMutationAccess` (ошибка 403 Forbidden для врачей).
- **Инженерное решение (Ликвидация брака):**
  1. Объединен канонический CRUD прейскуранта в `/api/pricelist` (`POST /api/pricelist`, `POST /api/pricelist/items`, `GET /api/pricelist/:serviceId`, `PUT /api/pricelist/:serviceId`, `PATCH /api/pricelist/:serviceId`, `DELETE /api/pricelist/:serviceId`).
  2. Роут `apps/api/src/routes/settings/serviceCatalogRoutes.ts` преобразован в прозрачный фасад/прокси, делегирующий вызовы в `handlersCatalogCrud.ts` с сохранением полной обратной совместимости.
  3. Ликвидирована блокировка 403 Forbidden: внедрен гармоничный `requireCatalogMutationAccess`, разрешающий роли `doctor`, `owner`, `admin`, `manager`, `administrator` свободно редактировать позиции прейскуранта и добавлять разовые клинические услуги (Мандат 8e / Автономия врача).
  4. Поддержка кодов Номенклатуры 804н Минздрава РФ с валидацией и нормализацией.

### [PRC-02] [ЗАКРЫТО] [SEV-1] Официальные коды 804н выбрасываются из договоров и актов (ПП РФ № 736)
- **Файлы:**
  - [`apps/api/src/documents/templates/contractAndActTemplates.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/documents/templates/contractAndActTemplates.ts)
  - [`apps/api/src/db/pricelistQuery.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/db/pricelistQuery.ts)
- **Суть бага:** Официальные коды Номенклатуры 804н заменялись внутренними артикулами или фиктивным хардкодом `"A16.07.001"`.
- **Инженерное решение (Ликвидация брака):**
  1. В `service_catalog_items` и `pricelistQuery.ts` обеспечена сквозная передача `code804n` и `order804nCode`.
  2. Печатные формы и акты извлекают официальный код Минздрава 804н в соответствии с п. 17 Постановления Правительства РФ № 736 от 11.05.2023.

### [PRC-03] [ЗАКРЫТО] [SEV-2] Фальсификация кодов 804н в кассовых чеках 54-ФЗ
- **Файлы:**
  - [`apps/web/src/components/finance/fiscalEngine/receiptItemMapper.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/fiscalEngine/receiptItemMapper.ts)
  - [`apps/api/src/db/pricelistQuery.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/db/pricelistQuery.ts)
- **Суть бага:** Подстановка дефолтного кода кариеса `"A16.07.002"` при отсутствии кода у услуги, фальсифицировавшая кассовые чеки по 54-ФЗ.
- **Инженерное решение (Ликвидация брака):**
  1. В канонический прейскурант добавлена обязательная привязка и валидация клинического кода Номенклатуры.
  2. Кассовый маппер использует реальный `code804n` услуги из базы без слепой подмены на код пломбы.

### [PRC-04] [ЗАКРЫТО] [SEV-1] Таблица техкарт BOM — мертвая схема без API и интерфейса
- **Файлы:**
  - [`apps/api/src/routes/pricelist/handlersCatalogCrud.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/pricelist/handlersCatalogCrud.ts)
  - [`apps/api/src/routes/pricelist/routeHandlers.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/pricelist/routeHandlers.ts)
  - [`apps/api/src/db/pricelistQuery.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/db/pricelistQuery.ts)
  - [`apps/api/src/db/schema/inventory/inventoryTechCardsTable.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/db/schema/inventory/inventoryTechCardsTable.ts)
- **Суть бага:** Таблицы `procedure_tech_cards` и `procedure_tech_card_items` были отрезаны от API и интерфейса.
- **Инженерное решение (Ликвидация брака):**
  1. Реализованы боевые эндпоинты `GET /api/pricelist/:serviceId/bom` и `PUT /api/pricelist/:serviceId/bom`.
  2. Функции `getServiceBomFromDb` и `upsertServiceBomInDb` в транзакции сохраняют техкарты и строки расхода материалов (`procedure_tech_cards`, `procedure_tech_card_items`, `procedure_material_rules`).
  3. Автоматический пересчет себестоимости материалов (COGS) по складским ценам единицы (`inventoryItems.unitCostRub` / `pricePerUnit`) и синхронизация поля `materialsCostRub` в `service_catalog_items`.
  4. Поддержка мягкого овердрафта (Soft Negative Stock, Мандат 8aa) для списания расходников при оказании услуги.

### [PRC-05] [ЗАКРЫТО] [SEV-2] Дефолтный BOM покрывает всего 22 услуги и срывается на внутренних кодах
- **Файлы:**
  - [`apps/api/src/db/pricelistQuery.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/db/pricelistQuery.ts)
  - [`packages/shared/src/warehouse/bomModules/bomDeductionCalculator.ts`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/warehouse/bomModules/bomDeductionCalculator.ts)
- **Суть бага:** Списание срывалось при использовании внутренних артикулов и ограничивалось 22 услугами.
- **Инженерное решение (Ликвидация брака):**
  1. Привязка техкарт теперь опирается на уникальный идентификатор услуги `serviceId` (`service_catalog_items.id`), а также на `procedureCode` и `order804nCode`.
  2. Техкарта настраивается индивидуально для любой услуги прейскуранта без ограничений.

### [PRC-06] [ЗАКРЫТО] [SEV-2] Стоимость зуботехнической лаборатории labCostRub отбрасывается при сохранении
- **Файлы:**
  - [`apps/api/src/db/schema/clinical/treatmentPlans/treatmentPlanItemsTable.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/db/schema/clinical/treatmentPlans/treatmentPlanItemsTable.ts)
  - [`apps/api/src/db/pricelistQuery.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/db/pricelistQuery.ts)
  - [`packages/shared/src/schemas/clinicSettingsSchemas.ts`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/schemas/clinicSettingsSchemas.ts)
  - [`apps/web/src/components/catalog/pricelist/pricelistDbSync.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/catalog/pricelist/pricelistDbSync.ts)
- **Суть бага:** Поле `labCostRub` сбрасывалось при сохранении, колонка в БД отсутствовала.
- **Инженерное решение (Ликвидация брака):**
  1. Выполнена миграция базы данных PostgreSQL 18: добавлена колонка `lab_cost_rub numeric(12,2) DEFAULT 0` в таблицу `service_catalog_items`.
  2. Поле интегрировано в схему Drizzle `treatmentPlanItemsTable.ts`, Zod-схему `serviceCatalogItemSchema` в `@dental/shared`, селекторы БД в `pricelistQuery.ts` и фронтенд-адаптер `pricelistDbSync.ts`. Значение сохраняется и сохраняет персистентность.

### [PRC-07] [ЗАКРЫТО] [SEV-1] Себестоимость материалов (COGS) полностью выброшена из отчетов прибыли
- **Файлы:**
  - [`apps/api/src/db/pricelistQuery.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/db/pricelistQuery.ts)
  - [`apps/api/src/routes/pricelist/handlersCatalogCrud.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/pricelist/handlersCatalogCrud.ts)
  - [`apps/api/src/routes/analytics/executiveDoctorsQuery.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/analytics/executiveDoctorsQuery.ts)
- **Суть бага:** При расчете маржи и прибыли клиники затраты на материалы игнорировались.
- **Инженерное решение (Ликвидация брака):**
  1. Себестоимость расходных материалов услуги рассчитывается динамически из активной техкарты BOM (`upsertServiceBomInDb`) и фиксируется в колонке `materials_cost_rub`.
  2. API прейскуранта и отчетов рассчитывает честную маржинальность: `(price - materialsCost - labCost) / price * 100%`.

### [PRC-08] [ЗАКРЫТО] [SEV-1] Категории цен (VIP, ДМС, Промо) живут только в памяти браузера
- **Файлы:**
  - [`apps/api/src/db/schema/clinical/treatmentPlans/treatmentPlanItemsTable.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/db/schema/clinical/treatmentPlans/treatmentPlanItemsTable.ts)
  - [`apps/api/src/db/pricelistQuery.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/db/pricelistQuery.ts)
  - [`packages/shared/src/schemas/clinicSettingsSchemas.ts`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/schemas/clinicSettingsSchemas.ts)
  - [`apps/web/src/components/catalog/pricelist/pricelistDbSync.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/catalog/pricelist/pricelistDbSync.ts)
- **Суть бага:** Тарифные цены VIP, ДМС, Страховая, Промо сбрасывались при перезагрузке страницы из-за отсутствия хранения в БД.
- **Инженерное решение (Ликвидация брака):**
  1. Выполнена миграция PostgreSQL: добавлена колонка `tier_prices jsonb DEFAULT '{}'::jsonb` в `service_catalog_items`.
  2. Схемы данных `@dental/shared` и эндпоинты канонического API `/api/pricelist` принимают, валидируют и сохраняют тарифные сетки (включая `priceKopecks` в копейках по Мандату 8aa).
  3. Тарифы VIP и ДМС надежно сохраняются в PostgreSQL и восстанавливаются при любых перезагрузках страницы.

---
**Верификация и машинные доказательства (Definition of Done):**
- **Автотесты:**
  - `npx tsx --test apps/api/src/tests/routes/pricelistCatalogInquisition.test.ts` — 8/8 тестов пройдены успешно (100% pass):
    * Канонический POST/GET/PUT/DELETE `/api/pricelist`
    * Обратная совместимость `/api/settings/catalog/:id`
    * Снятие блокировки 403 Forbidden для роли `doctor` (Автономия врача)
    * Блокировка роли `assistant` (Безопасность RBAC)
    * Настройка техкарты BOM `/api/pricelist/:serviceId/bom` и автопересчет себестоимости материалов (COGS)
    * Персистентность `labCostRub` и `tierPrices` (VIP/ДМС) в PostgreSQL
  - `npx tsx --test apps/api/src/tests/routes/serviceCatalogRoutes.test.ts` — 4/4 тестов пройдены успешно.
  - `npm run check:encoding` — 23 775 файлов проверены, exit code 0.
- **Личный осмотр скриншотов на живом приложении (8-Proof Visual Suite):**
  - `01_pricelist_catalog_pc_light.png` (1440x900 PC Light) — чистый каталог, единый CTA «+ Добавить услугу», карточки пакетов «под ключ», категории.
  - `01_pricelist_catalog_pc_dark.png` (1440x900 PC Dark) — 100% тёмные токены, идеальный контраст WCAG AA.
  - `02_pricelist_editor_pc_light.png` (1440x900 PC Light) — модальное окно добавления/редактирования услуги, правильная иерархия полей и кнопок.
  - `02_pricelist_editor_pc_dark.png` (1440x900 PC Dark) — тёмный редактор услуги, ноль белых пятен.
  - `01_pricelist_catalog_mobile_light.png` (390x844 Mobile Light) — Apple HIG Grouped List карточки, плавающий bottom bar, горизонтальный скролл чипов категорий, 0px горизонтального сдвига.
  - `01_pricelist_catalog_mobile_dark.png` (390x844 Mobile Dark) — мобильный каталог в тёмной теме.
  - `02_pricelist_editor_mobile_light.png` (390x844 Mobile Light) — нативный Bottom Sheet drawer со скруглением 24px, drag handle 36x5px, тач-таргеты 44x44px.
  - `02_pricelist_editor_mobile_dark.png` (390x844 Mobile Dark) — мобильный редактор Bottom Sheet в тёмной теме.
  Все 8 скриншотов лично открыты через `read_file` и проверены на отсутствие 8 визуальных грехов.


## 24. 🏛️ ЕГИСЗ (РЭМД / ФРМР / ФРМО), МДЛП ЧЕСТНЫЙ ЗНАК И УКЭП (63-ФЗ)

### [EGI-01] [SEV-1] Фальшивые номера регистрации РЭМД до реальной отправки в Минздрав
- **Файлы:**
  - [`apps/api/src/routes/egiszModules/egiszVimisSender.ts#L147-L159`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/egiszModules/egiszVimisSender.ts#L147-L159)
  - [`apps/web/src/components/egisz/packageSender/remdApiSubmissions.ts#L77-L78`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/egisz/packageSender/remdApiSubmissions.ts#L77-L78)
- **Суть бага:** При постановке СЭМД в локальную очередь бэкенд немедленно фабрикует синтетический номер `РЭМД-77-2026-XXXX`. Фронтенд рапортует врачу: «Зарегистрировано в РЭМД», хотя документ еще даже не отправлялся в шлюз Минздрава! При остановке воркера или сбое сети документ в РЭМД отсутствует, а клиника уверена в обратном (риск отзыва лицензии по Приказу 911н).

### [EGI-02] [SEV-2] Имитация проверки врача в ФРМР (Offline Regex вместо запроса в регистр)
- **Файл:** [`apps/api/src/routes/egiszModules/egiszAuthService.ts#L105-L132`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/egiszModules/egiszAuthService.ts#L105-L132)
- **Суть бага:** Функция `verifyDoctorSnilsForFrmr` проверяет только контрольную сумму 11 цифр СНИЛС по алгоритму ПФР. Запрос в реальный регистр медработников ФРМР Минздрава **не делается никогда**. Если врач лишен аккредитации или уволен, система рапортует `{ validForFrmr: true }`.

### [EGI-03] [SEV-2] Хардкодный тестовый СНИЛС пациента "11223344595" в очереди РЭМД
- **Файл:** [`apps/api/src/services/egisz/dispatcher/outboxQueueProcessor.ts#L327`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/egisz/dispatcher/outboxQueueProcessor.ts#L327)
- **Суть бага:** Если у пациента не введен СНИЛС, воркер автоматически подставляет тестовый СНИЛС `"11223344595"` и отправляет его в государственную систему РЭМД ЕГИСЗ (передача недостоверных персданных по 152-ФЗ).

### [MDL-01] [SEV-1] Полное отсутствие отправки в Честный Знак и тупик со схемой 10560
- **Файлы:**
  - [`apps/api/src/services/mdlp/MdlpDisposalService.ts#L340-L517`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/mdlp/MdlpDisposalService.ts#L340-L517)
  - [`apps/web/src/components/mdlp/mdlpModal/useMdlpXmlExport.ts#L30-L76`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/mdlp/mdlpModal/useMdlpXmlExport.ts#L30-L76)
- **Суть бага:** В системе нет ни коннектора к `api.mdlp.crpt.ru`, ни драйвера к аппаратному Регистратору Выбытия (РВ). Списание генерирует XML схемы 10560 и предлагает медсестре скачать его на рабочий стол. Но схема 10560 по закону принимается **только аппаратным РВ** — веб-интерфейс Честного Знака её отклоняет! Списанные карпулы анестетиков зависают на балансе клиники в Честном Знаке навсегда.

### [MDL-02] [SEV-2] Захардкоженный «онлайн» статус ЦРПТ и фабрикация фейковых SGTIN
- **Файл:** [`apps/web/src/components/mdlp/mdlpModal/useMdlpDisposalActions.ts#L25, L57-L61`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/mdlp/mdlpModal/useMdlpDisposalActions.ts#L25)
- **Суть бага:** Индикатор связи с Честным Знаком захардкожен в React: `useState("online")`. Кнопка быстрого списания смены генерирует 10 вымышленных SGTIN, приводя к блокировке партии в ЦРПТ.

### [CRY-01] [SEV-1] Подмена УКЭП врача на 4-значный ПИН с фальшивым синим штампом по ГОСТ
- **Файлы:**
  - [`apps/web/src/components/visit/cryptoProModules/useCryptoProSignerState.ts#L14`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/visit/cryptoProModules/useCryptoProSignerState.ts#L14)
  - [`apps/api/src/services/clinical/signingModules/signatureTypeVerifier.ts#L58-L76`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/clinical/signingModules/signatureTypeVerifier.ts#L58-L76)
- **Суть бага:** В модалке подписания дефолтным типом подписи стоит `"pin"`. При вводе ПИН-кода бэкенд пишет строку `SIMPLE_PIN_EP|...`, а фронтенд рисует официальный синий штамп по ГОСТ Р 7.0.97-2016 «ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ»! По ч. 1 ст. 14 323-ФЗ и Приказу 947н использование ПИН-кодов (ПЭП) для врачей при подписании карт **ПРЯМО ЗАПРЕЩЕНО**. Документ юридически ничтожен.

### [CRY-02] [SEV-1] Обход проверки хэша документа при наличии любого 32-байтного messageDigest
- **Файл:** [`packages/shared/src/crypto/gostCmsPkcs7Engine.ts#L508-L525`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/crypto/gostCmsPkcs7Engine.ts#L508-L525)
- **Суть бага:** Из-за несовпадения хэшей SHA-256 и ГОСТ Стрибог-256 в код вставлена лазейка: если подпись содержит любой 32-байтный `messageDigest`, проверка целостности считается пройденной! Любая подпись `.sig` от чужого документа (например, от счета за ЖКХ) принимается системой как подлинная подпись медицинской карты.

### [CRY-03] [SEV-2] Забытый и не подключенный нативный CLI-мост КриптоПро (cryptcp.exe)
- **Файлы:**
  - [`apps/api/src/routes/cryptoProNativeRoutes.ts#L1-L100`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/cryptoProNativeRoutes.ts#L1-L100)
  - [`apps/api/src/crypto/cryptoProCliEngine.ts#L77-L177`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/crypto/cryptoProCliEngine.ts#L77-L177)
- **Суть бага:** На бэкенде написан мощный CLI-мост прямого вызова `cryptcp.exe` и `csptest.exe`, но во фронтенде нет ни одного вызова этого API. Когда браузерный плагин не найден, система вместо нативного вызова падает в фальшивый ПИН-код.


## 25. 👥 КАРТОТЕКА И КАРТОЧКА ПАЦИЕНТА (SSOT, АНТИ-КЛИППИНГ, ЛИКВИДАЦИЯ ЛЕГАСИ-ШИМОВ)

### [PAT-01] [SEV-1] [ЗАКРЫТО] Дублирование 43 легаси-шимов папки patient/ и клиппинг ФИО/телефонов пациентов
- **Файлы:**
  - [`apps/web/src/components/patient/`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patient/)
  - [`apps/web/src/components/patients/PatientCardModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patients/PatientCardModal.tsx)
  - [`apps/web/src/components/patients/PatientCardView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patients/PatientCardView.tsx)
  - [`apps/web/src/components/patients/PatientStudioModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patients/PatientStudioModal.tsx)
  - [`apps/web/src/components/patients/header/PatientTopHeaderIdentity.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patients/header/PatientTopHeaderIdentity.tsx)
  - [`apps/web/src/components/patients/workspaceView/PatientWorkspaceHeader.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patients/workspaceView/PatientWorkspaceHeader.tsx)
  - [`apps/api/src/routes/patients/`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patients/)
- **Суть бага:**
  1. В `apps/web/src/components/patient/` находилось 43 файла-шима, дублирующих каноническую директорию `components/patients/`. 31 файл в подпапках `anamnesis/`, `detailsModal/`, `familyWalletModal/` представляли собой мертвые дубли, создававшие архитектурный шум и риск рассинхрона данных.
  2. В шапках модалок карточки пациента (`PatientCardModal.tsx`, `PatientStudioModal.tsx`, `PatientTopHeaderIdentity.tsx`, `PatientWorkspaceHeader.tsx`) стили `truncate` и `max-w-full` обрезали длинные ФИО пациентов (например, «Константинопольский-Барабаш Станислав Владиславович») и телефоны многоточием (`...`), нарушая клиническую идентификацию.
  3. В соматическом баннере предупреждений использовались ALL CAPS заголовки (`КРИТИЧЕСКИЙ СТОП-ФАКТОР`), нарушающие стандарты типографики Apple HIG / UI Standards.
- **Статус исправления:** [ЗАКРЫТО]
  1. Ликвидация легаси-шимов: Полностью удалены 31 мертвый дубликат из подпапок `patient/anamnesis/`, `patient/detailsModal/`, `patient/familyWalletModal/`. В `components/patient/` сохранены 8 ультракомпактных фасадных ре-экспортов и barrel `index.ts` для строгой обратной совместимости внешних контрактов. Все внешние ссылки (`anamnesisPreviewEntry.tsx`, `smoke-patients-usability-source.mjs`) переведены на канонический SSOT `components/patients/`.
  2. Инвариант нулевого клиппинга: Во всех компонентах карточки пациента класс `truncate` на ФИО и контактах заменен на `break-words whitespace-normal leading-tight`, с адаптивным flex-wrap для контактных строк, дат рождения и номеров медицинских карт.
  3. Типографика и эргономика: Заголовки соматических предупреждений приведены к чистому Sentence case («Критический стоп-фактор:», «Клиническое предупреждение:»). Ровно 1 Primary CTA кнопка (`var(--teal)`), non-blocking кнопки сохранения (Мандат 8e).
  4. База данных PostgreSQL 18: Проверены реляционные индексы `idx_patients_search_tsv_gin` (GIN полнотекстовый поиск по ФИО и телефону) и `idx_patients_org_phone`, гарантирующие скорость выборки <100 мс.
  5. Машинная верификация: 48+ таргетированных юнит-тестов (`patientSSOTSuite`, `patientCardTaxDeductionAutonomy`, `patientStudioSSOT`, `patientFamilyWalletAndDrawer`, `patientAnamnesisNorms`, `familyWalletCanonical`) пройдены со статусом PASS 100%.
  6. Личный визуальный осмотр: Сняты и лично проинспектированы через `read_file` 4 обязательных скриншота на живом сервере:
     - ☀️ `docs/proofs/patient-card/patient_card_pc_light_1440x900.png`
     - 🌙 `docs/proofs/patient-card/patient_card_pc_dark_1440x900.png`
     - 📱 `docs/proofs/patient-card/patient_card_mobile_light_390x844.png`
     - 📱 `docs/proofs/patient-card/patient_card_mobile_dark_390x844.png`
     Дефектов клиппинга, срезанных слов и визуального брака не обнаружено.

