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

### [FIN-02] [SEV-1] Обнуление зарплат врачей при кассовых платежах
- **Файлы:**
  - [`apps/web/src/components/cashbox/CashRegisterStudioModal.tsx#L119`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/cashbox/CashRegisterStudioModal.tsx#L119)
  - [`apps/web/src/components/finance/CashierStudioModal.tsx#L148`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/CashierStudioModal.tsx#L148)
  - [`apps/api/src/services/reports/managerReports/doctorReports.ts#L42-L110`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/services/reports/managerReports/doctorReports.ts#L42-L110)
- **Суть бага:** Кассовые модалки не передают `visitId` (`visitId: undefined` либо поле вовсе опущено). В таблице `payments` поле `visitId` сохраняется как `NULL`.
- **Чем ломает клинику:** Расчёт зарплаты формы Т-51 привязывает выработку к врачу строго через `payments.visitId -> visits.id -> appointments.doctorUserId`. Все платежи из кассы падают в «Не отнесено к врачу», и **врач получает 0 ₽ начислений**.

### [FIN-03] [SEV-1] Моки ложного успеха при сбое бэкенда (Тихий грабеж)
- **Файл:** [`apps/web/src/components/cashbox/CashRegisterStudioModal.tsx#L145-L150`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/cashbox/CashRegisterStudioModal.tsx#L145-L150)
- **Суть бага:** В блоке `catch`:
  ```typescript
  const fallbackResult = { success: true, effectiveTotalRub, method, clientMutationId };
  if (props.onSuccess) props.onSuccess(fallbackResult);
  onClose();
  ```
- **Чем ломает клинику:** Если бэкенд упал или оборвалась сеть, кассиру рисуется зеленая галочка «Оплата успешна», модалка закрывается, пациент уходит без чека и без проводки в БД. Деньги клиники теряются.

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

### [FIN-07] [SEV-2] Архитектурная шизофрения и конфликт лаунчеров
- **Файлы:** [`CashRegisterStudioModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/cashbox/CashRegisterStudioModal.tsx) vs [`CashierStudioModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/CashierStudioModal.tsx)
- **Суть бага:** Две параллельные кассовые студии открываются одновременно при переходе по роуту `#checkout`, накладываясь друг на друга в DOM.

---

## 2. 🦷 ЗУБОТЕХНИЧЕСКАЯ ЛАБОРАТОРИЯ И ОРТОПЕДИЯ

### [LAB-01] [SEV-1] Тихий угон чужого пациента при создании наряда
- **Файл:** [`apps/api/src/routes/lab/ordersCrudModules/labOrderInsertDb.ts#L20-L55`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/lab/ordersCrudModules/labOrderInsertDb.ts#L20-L55)
- **Суть бага:**
  ```typescript
  const [firstPatient] = await tx.select({ id: patients.id }).from(patients).where(eq(patients.organizationId, orgId)).limit(1);
  effectivePatientId = firstPatient.id;
  ```
  Если `patientId` пустой или не найден, сервер молча берет первого попавшегося пациента из клиники и вешает наряд на него!

### [LAB-02] [SEV-1] Разрыв связки наряда ЗТЛ с планом лечения и сметой
- **Файлы:** [`clinicalProtocolsTables.ts#L117-L172`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/db/schema/clinical/clinicalRulesModules/clinicalProtocolsTables.ts#L117-L172), [`TreatmentPlanPresenterStagesTab.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/treatment-plans/TreatmentPlanPresenterStagesTab.tsx)
- **Суть бага:** В `lab_orders` нет колонок `treatment_plan_id`, `appointment_id`, `visit_id`. Из интерфейса плана лечения удалены все кнопки создания наряда.

### [LAB-03] [SEV-1] Вычет чужой лаборатории из зарплаты терапевтов
- **Файл:** [`appointmentLabBudget.ts#L44-L68`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/doctorEarnings/appointmentLabBudget.ts#L44-L68)
- **Суть бага:** Так как у наряда нет `appointment_id`, расчет зарплаты вешает все наряды пациента на его первый хронологический прием. Терапевт получает отрицательную зарплату за коронки ортопеда.

### [LAB-04] [SEV-1] Мертвая таблица `lab_items` (Dead Schema)
- **Файл:** [`clinicalProtocolsTables.ts#L176`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/db/schema/clinical/clinicalRulesModules/clinicalProtocolsTables.ts#L176)
- **Суть бага:** Таблица `lab_items` существует в БД, но код в нее никогда не пишет. Зубы склеиваются в строку `"16, 15, 14"` в `lab_orders.toothFdi`.

### [LAB-05] [SEV-2] Превращение рутинной примерки в рекламацию/брак
- **Файл:** [`labOrderStatusAndTrackingTypes.ts#L75-L81`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/lab/labTypesModules/labOrderStatusAndTrackingTypes.ts#L75-L81)
- **Суть бага:** Статус `fitting` (примерка во рту) бэкендом переводится в `refitting` (переделка/рекламация). Заказ в канбане загорается аварийным бейджем брака.

---

## 3. 📦 СКЛАД, АВТОКЛАВИРОВАНИЕ И САНПИН

### [WH-01] [SEV-1] Накладные парсятся через REGEX из текстового поля notes
- **Файлы:** [`invoiceDraftAndItems.ts#L87-L103`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/inventory/supplierInvoices/invoiceDraftAndItems.ts#L87-L103), [`invoiceStatusAndApproval.ts#L311`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/inventory/supplierInvoices/invoiceStatusAndApproval.ts#L311)
- **Суть бага:** Таблицы накладных в БД нет. Метаданные пишутся в строку `inventory_transactions.notes` и парсятся через `notesStr.match(...)`.

### [WH-02] [SEV-1] Инвентаризация ТМЦ — фикция без базы данных
- **Файл:** [`useInventoryViewAudit.ts#L50-L62`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/inventory/viewModules/useInventoryViewAudit.ts#L50-L62)
- **Суть бага:** Таблицы `inventory_audits` нет. Модалка рисует формы ИНВ-3, но по клику «Утвердить» просто запускает цикл `PATCH /stock`. Документ инвентаризации нигде не сохраняется и исчезает при F5.

### [WH-03] [SEV-1] Маршрут списания смены возвращает 404 и сидит на моках
- **Файл:** [`useConsumablesBatchWriteoff.ts#L100`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/inventory/writeoff/useConsumablesBatchWriteoff.ts#L100)
- **Суть бага:** `GET /api/inventory/:org/shift-summary` не зарегистрирован в Fastify. Модалка всегда откатывается на зашитый мок `DEFAULT_SHIFT_DATA` (12 визитов, 7 кариесов, 12 карпул).

### [WH-04] [SEV-1] Отсутствие коэффициента фасовки (упаковка vs карпула)
- **Суть бага:** 5 коробок Септанеста (по 50 карпул) падают в БД как `quantity = 5`. Процедура списывает 1 карпулу. Через 5 пациентов система объявляет овердрафт, хотя в шкафу 245 карпул.

### [WH-05] [SEV-2] Захардкоженная медсестра в журнале СанПиН
- **Файл:** [`SanpinStudioModal.tsx#L51`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/sanpin/SanpinStudioModal.tsx#L51)
- **Суть бага:** В коде зашито: `useState("Иванова Е. С., дежурная медсестра")`. Все циклы автоклава и наклейки на крафт-пакеты подписываются Ивановой.

---

## 4. 🦷 КЛИНИЧЕСКИЙ КОНТУР И ОДОНТОГРАММА

### [CLN-01] [SEV-1] Самосаботаж голосовой диктовки одонтограммы
- **Файл:** [`dictationToothUpdates.ts#L42-L76, 185-198`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/dictationToothUpdates.ts#L42-L76)
- **Суть бага:** Бэкенд распознает диагнозы («кариес», «пульпит», «пломба», «коронка»), но фронтенд считает их «неоднозначными» и блокирует выставление, требуя от врача отмечать зубы руками.

### [CLN-02] [SEV-1] Выставление счетов за коронки 5-летней давности
- **Файл:** [`useOdontogramApplyToothState.ts#L44-L50`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/useOdontogramApplyToothState.ts#L44-L50)
- **Суть бага:** Отметка статуса зуба на первичном осмотре безусловно вызывает `dente-add-services-to-invoice`. Старая коронка пациента попадает в сегодняшний кассовый чек на 28 500 ₽.

### [CLN-03] [SEV-1] Затирание истории дефектов зуба
- **Файл:** [`statusRoutes.ts#L127-L144`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/odontogram/statusRoutes.ts#L127-L144)
- **Суть бага:** Фронтенд пишет в `tooth_states` со строковым полем `state: text`. Если у зуба с коронкой появился пришеечный кариес, выбор кариеса стирает коронку из БД.

### [CLN-04] [SEV-2] 403 из 448 протоколов — синтетический суррогат
- **Файл:** [`protocolsResolver.ts#L27-L44`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/visit/soapEditor/protocolsResolver.ts#L27-L44)
- **Суть бага:** В коде забито только 45 протоколов. Остальные 403 генерируют синтетическую воду, хотя все 448 аутентичных JSON лежат нераспарсенными в `outpatient_templates_FULL/`.

---

## 5. 📅 РАСПИСАНИЕ И СЕТКА КРЕСЕЛ

### [SCH-01] [SEV-1] Санобработка и блокировка кресел в localStorage
- **Файл:** [`useGridDisplaySettings.ts#L75-L81`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/schedule/grid/interactionModules/useGridDisplaySettings.ts#L75-L81)
- **Суть бага:** Блокировки кресел пишутся в `localStorage` конкретного браузера. Другие ПК видят слот свободным.
- **Директива Создателя:** Данную механику принудительной блокировки кресел полностью ликвидировать (ЦРМ не диктует реальности какой быть).

### [SCH-02] [SEV-1] Лист ожидания: фантомная запись без запроса в БД
- **Файлы:** [`WaitlistDrawer.tsx#L48-L75`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/schedule/waitlist/WaitlistDrawer.tsx#L48-L75), [`ScheduleViewModals.tsx#L143-L160`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/schedule/view/ScheduleViewModals.tsx#L143-L160)
- **Суть бага:** Не передается `onBookSlot`, в результате клик «Записать» просто закрывает шторку без отправки POST `/api/appointments`.

### [SCH-03] [SEV-1] Клик по визиту убивает правый инспектор модальным оверлеем
- **Файлы:** [`ScheduleGridDesktopLayout.tsx#L51-L60`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/schedule/grid/ScheduleGridDesktopLayout.tsx#L51-L60), [`ScheduleViewBody.tsx#L359`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/schedule/view/ScheduleViewBody.tsx#L359)
- **Суть бага:** Одинарный клик по карточке распахивает полноэкранный `QuickBookingDrawer` (`z-[10005]`), перекрывая 0-клик инспектор.

---

## 6. 🩻 ТОМОГРАФИЯ (КЛКТ 3D MPR) И РАДИОЛОГИЯ

### [RAD-01] [SEV-1] Падение Fastify-сервера при запуске внешних вьюверов
- **Файл:** [`pacsExternalViewerLaunch.ts#L58-L75`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging/pacsModules/pacsExternalViewerLaunch.ts#L58-L75)
- **Суть бага:** Метод `spawn` вызывается без `child.on('error')` перед `unref()`. Ошибка запуска роняет весь бэкенд Fastify. Флаги `/open` и `-study` не поддерживаются Vatech/Romexis.

### [RAD-02] [SEV-1] Синхронный фриз браузера на 8 секунд при распаковке КТ
- **Файл:** [`realDicomZipLoader.ts#L42`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/dicomLoader/realDicomZipLoader.ts#L42)
- **Суть бага:** `fflate.unzipSync` на архивах КТ в 300–600 МБ блокирует главный UI-поток, вызывая зависание и OOM.

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

### [DOC-01] [SEV-1] Печать чистого белого листа в браузере (@media print CSS Conflict)
- **Файлы:**
  - [`apps/web/src/styles/printStyles/printMediaOptimization.css#L24-L26`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/printStyles/printMediaOptimization.css#L24-L26)
  - [`apps/web/src/components/visit/diaryStyles/clinicalDiaryPrint.css#L1`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/visit/diaryStyles/clinicalDiaryPrint.css#L1)
- **Суть бага:** Селектор `body > *:not(.print-layer) { display: none !important; }` скрывает корневой `<div id="root">`, в котором смонтирован React. В результате диалог печати браузера `window.print()` отправляет на принтер абсолютно пустую белую страницу.

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

### [PLN-01] [SEV-1] Схлопывание 3 тарифов в одну минимальную цену (Коллизия кода 804н)
- **Файл:** [`apps/web/src/components/treatment-plans/pricingEngine/pricingCatalogMatcher.ts#L36-L56`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/treatment-plans/pricingEngine/pricingCatalogMatcher.ts#L36-L56)
- **Суть бага:** Поиск в прейскуранте сначала идет строго по коду услуги 804н `targetCode`. Но по номенклатуре Минздрава установка бюджетного имплантата (Osstem) и премиального (Straumann Roxolid) имеют **один и тот же код** `A16.07.054.001`! Алгоритм отбирает первую попавшуюся бюджетную позицию, игнорируя ключевые слова («straumann», «nobel»). В итоге сметы «Стандарт» и «Премиум» стоят абсолютно одинаково!

### [PLN-02] [SEV-1] Отсутствие связи счетов с планами лечения и фиктивная оплата этапа
- **Файлы:**
  - [`apps/api/src/db/schema/billingModules/billingInvoicesSchema.ts#L16-L71`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/db/schema/billingModules/billingInvoicesSchema.ts#L16-L71)
  - [`apps/web/src/components/treatment-plans/TreatmentPlanExportModals.tsx#L89-L96`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/treatment-plans/TreatmentPlanExportModals.tsx#L89-L96)
- **Суть бага:** В таблице `patient_invoices` физически **нет колонок `treatment_plan_id` или `stage_id`**! При оплате этапа через кассу колбэк `onPaymentComplete` просто показывает Toast и закрывает модалку. В базу данных запрос на обновление статуса плана не уходит — этап остается неоплаченным, задолженность в CRM не гасится.

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

### [PHR-01] [SEV-1] Отсутствие проверки аллергии на Лидокаин (Угроза анафилактического шока)
- **Файлы:**
  - [`packages/shared/src/clinical/ddi/ddiRulesMatrix.ts#L13-L455`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/clinical/ddi/ddiRulesMatrix.ts#L13-L455)
  - [`packages/shared/src/clinical/ddi/somaticRiskEvaluator.ts#L46-L179`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/clinical/ddi/somaticRiskEvaluator.ts#L46-L179)
  - [`apps/web/src/components/anesthesia/anesthesiaEngine.ts#L38-L61`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/anesthesia/anesthesiaEngine.ts#L38-L61)
- **Суть бага:** В словаре лекарственных классов нет класса `lidocaine`. В оценщике аллергий `somaticRiskEvaluator.ts` проверка `hasLidocaineAllergy` **отсутствует на 100%**. В движке анестезии функция `calculateAnesthesiaSafety` игнорирует аллергию на лидокаин. При назначении лидокаина пациенту с тяжелой аллергией система сообщает: *«Безопасная зона (safe)»*! Прямая угроза анафилактического шока у кресла врача при слепом доверии системе.

### [PHR-02] [SEV-1] Обрыв передачи аллергий в SOAP-редакторе дневника приёма
- **Файл:** [`apps/web/src/components/visit/soapEditor/VisitSoapEditorView.tsx#L64-L76`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/visit/soapEditor/VisitSoapEditorView.tsx#L64-L76)
- **Суть бага:** Компонент `SoapFieldsEditor` требует пропсы `hasLidocaineAllergy`, `hasArticaineAllergy`, `hasPenicillinAllergy`, `hasBronchialAsthma`. Родительский `VisitSoapEditorView` передает только `patientId` и `visitId`. Все флаги аллергий становятся `undefined`, и полоса выбора анестетика `VisitAnesthesiaSection` всегда считает любого пациента здоровым без аллергий.

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

### [COP-01] [SEV-1] Утечка и хардкод боевых API-ключей в кодовой базе
- **Файлы:**
  - [`apps/api/src/ai/router/routerTypes.ts#L21-L24`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/router/routerTypes.ts#L21-L24)
  - [`apps/api/src/ai/router/keyPoolManager.ts#L26-L35`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/ai/router/keyPoolManager.ts#L26-L35)
- **Суть бага:** В открытом коде репозитория в константе `DEFAULT_AGENTROUTER_KEYS` захардкожены боевые токены шлюза (`sk-6osQfoRXk...`, `sk-LhzyJtJx...`). При отсутствии env-переменной `AGENTROUTER_API_KEYS` система подхватывает их по умолчанию. Прямое нарушение безопасности.

### [COP-02] [SEV-1] Затирание заметок врача при применении подсказок ИИ (Data Loss)
- **Файлы:**
  - [`apps/web/src/components/copilot/useCopilotModules/useCopilotActions.ts#L191-L204`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/useCopilotModules/useCopilotActions.ts#L191-L204)
  - [`apps/web/src/components/copilot/CopilotNudges.tsx#L54-L62`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/CopilotNudges.tsx#L54-L62)
- **Суть бага:** При клике на nudge-подсказку Копайлота код перезаписывает стейт формы дневника без слияния:
  `setVisitNoteForm({ complaint: f043.complaint || "", anamnesis: f043.anamnesis || "", ... })`.
  Если врач уже набрал анамнез и жалобы, а подсказка содержала только `objectiveStatus`, всё остальное стирается в пустую строку (`""`). Нарушение Мандата 8e (Автономия врача).

### [COP-03] [SEV-1] Самовольное искажение одонтограммы зуба 36 при подтверждении действий без указания зуба
- **Файлы:**
  - [`apps/web/src/components/copilot/actionConfirm/actionConfirmStoreSync.ts#L7-L11`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/actionConfirm/actionConfirmStoreSync.ts#L7-L11)
  - [`apps/web/src/services/ai/copilotActionRunner.ts#L162`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/services/ai/copilotActionRunner.ts#L162)
- **Суть бага:** Если врач подтверждает действие, где модель не указала конкретный зуб, синхронизатор стейта подставляет захардкоженный дефолт `'36'` и диагноз `'K02.1'`. Любая общая консультация или осмотр без привязки к номеру зуба превращается в кариес зуба 36 в одонтограмме.

### [COP-04] [SEV-2] Бесконечный таймер мышления при сбое стриминга
- **Файлы:**
  - [`apps/web/src/components/copilot/useCopilotModules/copilotStreamEventHandler.ts#L244-L254`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/useCopilotModules/copilotStreamEventHandler.ts#L244-L254)
  - [`apps/web/src/components/copilot/message/CopilotThinkingMessage.tsx#L22-L28`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/message/CopilotThinkingMessage.tsx#L22-L28)
- **Суть бага:** При сетевой ошибке или HTTP 429 обработчик не сбрасывает `streaming: false` для блоков `thinking`. Таймер тикает бесконечно («Мышление модели 450.2с...»), вводя врача в ступор.

### [COP-05] [SEV-2] Chairside Sentinel: Бэкенд-эндпоинт оторван от фронтенда
- **Файлы:**
  - [`apps/api/src/routes/copilot/daemonSchedulerRoutes.ts#L168-L187`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/copilot/daemonSchedulerRoutes.ts#L168-L187)
- **Суть бага:** Эндпоинт `POST /api/v1/copilot/sentinel/analyze` нигде не вызывается в веб-клиенте. Проверка соматики работает только изолированно в модалке рецептов, а сквозной часовой приёма отключен.

### [COP-06] [SEV-2] Клиентский детерминированный оффлайн-фолбек оторван от UI
- **Файлы:**
  - [`apps/web/src/services/ai/assistant/aiAssistantServiceCore.ts#L108-L110`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/services/ai/assistant/aiAssistantServiceCore.ts#L108-L110)
  - [`apps/web/src/components/copilot/useCopilotModules/useCopilotStream.ts#L105-L116`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/useCopilotModules/useCopilotStream.ts#L105-L116)
- **Суть бага:** Подсистема `executeLocalFallback` привязана к классу `aiAssistantService`, который не используется компонентами шторки копайлота. При 429 чат выводит ошибку вместо перехода на локальные шаблоны.

### [COP-07] [SEV-3] Просачивание советского канцелярита (`043`, `form043`) во внутренний код
- **Файлы:**
  - [`apps/web/src/components/copilot/cards/CopilotSoapDiaryCard.tsx#L65-L75`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/cards/CopilotSoapDiaryCard.tsx#L65-L75)
  - [`apps/web/src/components/copilot/contextSync/contextSyncTypes.ts#L1`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/copilot/contextSync/contextSyncTypes.ts#L1)
- **Суть бага:** Нарушение Мандата 8x: классы `.copilot-043-confirm-card`, интерфейсы `Clinical043Snapshot`, `Protocol043Data`, `onApply043`.


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
