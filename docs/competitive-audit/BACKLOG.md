# Архитектурный эталон внедрения фич (Архитектура и Реализация)

> 🧭 **Навигация:** [🗺️ Главный Индекс (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) | [📚 Портал Документации (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md) | [📋 Реестр 63 Фич (FEATURES_REGISTRY.md)](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURES_REGISTRY.md) | [🗺️ Карта CRM (OUR_CRM_MAP.md)](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/OUR_CRM_MAP.md)
>
> ⚠️ **СТАТУС (2026-09-07 / WAVE 30): ВСЕ 63 ФИЧИ, 9 КИЛЛЕР-МОДУЛЕЙ И 109 КИЛЛЕР-ФИЧ АВТОНОМИИ ВРАЧА, КЛИНИЧЕСКИХ ПРЕСЕТОВ 1-КЛИКА И СНИЖЕНИЯ ТРЕНИЯ ПОЛНОСТЬЮ РЕАЛИЗОВАНЫ (ВСЕГО 172 ФИЧИ: 63 КАНОНИЧЕСКИЕ + 109 АДДЕНДУМ).**  
> В кодовой базе нет нереализованных фич со статусами `[НЕТ]` или `[ЧАСТИЧНО]`. Все модули покрыты автоматическими тестами, работают в production и соответствуют Высшей Конституции THE HAMMER и Мандатам 8e (Автономия врача), 8i (Клинический суверенитет без стационарного блоата), 8k (CRM != тренажер), 8n (Соло-врач и небольшая клиника), 8o (Анти-карго-культ). Этот документ фиксирует архитектурные решения и конкретные файлы, где каждая фича работает в production.  
> Повторная разработка запрещена (Мандаты 8g, 8h).

---

## 🎯 ЧАСТЬ I. ДЕВЯТЬ КЛЮЧЕВЫХ КОНКУРЕНТНЫХ МОДУЛЕЙ IDENT / ISTOM

---

## 1. `маркетинг::фильтр_потерянных_пациентов_в_отчете` [РЕАЛИЗОВАНО] -> KILLER
- **Идея**: Быстрый пресет отбора пациентов, у которых одновременно отсутствуют:
  1. Будущий запланированный визит (`appointments.start_time > NOW()`)
  2. Активная запись в листе ожидания (`waitlist.status = 'active'`)
  3. Открытая задача CRM (`tasks.status IN ('pending', 'in_progress')`)
- **Статус**: 
  - Схема Drizzle: `apps/api/src/db/schema/patients.ts` (`lostPatientsFilters`)
  - Запросы к БД: `apps/api/src/db/lostPatientsFiltersQuery.ts`
  - Маршруты API: `apps/api/src/routes/patients.ts`, `apps/api/src/routes/marketing.ts`
  - Фронтенд: `apps/web/src/PatientsView.tsx` (фильтр `lost_patients`), `apps/web/src/components/patients/PatientFiltersBar.tsx`

---

## 2. `коммуникации::подтверждение_приема_при_обработке_обращения` [РЕАЛИЗОВАНО] -> KILLER
- **Идея**: Встраивание виджета «Ближайший приём» с кнопкой «Подтвердить» в модалку входящего звонка/чата и сводную панель утреннего обзвона.
- **Статус**: 
  - Схема Drizzle: `apps/api/src/db/schema/schedule.ts` (`quickAppointmentConfirmations`)
  - Маршруты API: `apps/api/src/routes/dayConfirmations.ts`, `apps/api/src/routes/schedule.ts`
  - Фронтенд: `apps/web/src/components/schedule/DayConfirmationsPanel.tsx`, `apps/web/src/CommunicationsView.tsx`

---

## 3. `расписание::виджет_срочные_обращения_под_календарем` [РЕАЛИЗОВАНО] -> KILLER
- **Идея**: Красный пульсирующий виджет отмен и переносов визитов под мини-календарем для мгновенной реакции регистратуры.
- **Статус**: 
  - Схема Drizzle: `apps/api/src/db/schema/schedule.ts` (`urgentScheduleRequests`)
  - Маршруты API: `apps/api/src/routes/schedule.ts` (`/api/schedule/urgent-schedule-requests`)
  - Фронтенд: `apps/web/src/components/schedule/UrgentScheduleRequestsWidget.tsx`, `apps/web/src/ScheduleView.tsx`

---

## 4. `прием::рабочий_стол_врача` [РЕАЛИЗОВАНО] -> KILLER
- **Идея**: Специализированный стартовый экран стоматолога с обратным таймером приема, визиткой следующего пациента и панелью вызова одонтограммы, наряда и снимков.
- **Статус**: 
  - Движок Shared: `packages/shared/src/doctor/doctorShiftCockpitEngine.ts`
  - Фронтенд: `apps/web/src/components/doctor/DoctorShiftCockpitModal.tsx`, `apps/web/src/components/doctor/DoctorDesktopHeader.tsx`
  - Тесты: `apps/web/src/components/doctor/__tests__/doctorShiftCockpit.test.tsx`

---

## 5. `прием::раздел_проверка_историй_болезни_главврачом` [РЕАЛИЗОВАНО] -> KILLER
- **Идея**: Раздел контроля качества амбулаторных карт главврачом со статусами `Не заполнен`, `В работе`, `На проверке`, `На доработке`, `Утверждено`.
- **Статус**: 
  - Сервис бэкенда: `apps/api/src/services/clinical/ChiefPhysicianAuditService.ts`
  - Маршруты API: `apps/api/src/routes/clinical.ts`, `apps/api/src/routes/audit.ts`
  - Фронтенд: `apps/web/src/components/emr/audit/CmoComplianceHub.tsx`, `apps/web/src/components/emr/audit/ChiefPhysicianAuditModal.tsx`

---

## 6. `расписание::буфер_обмена_в_расписании_для_быстрого_переноса` [РЕАЛИЗОВАНО] -> KILLER
- **Идея**: Визуальный плавающий буфер переносимой записи на верхней панели расписания для переноса в 1 клик на любую дату.
- **Статус**: 
  - Схема Drizzle: `apps/api/src/db/schema/schedule.ts` (`scheduleClipboardItems`)
  - Маршруты API: `apps/api/src/routes/schedule.ts` (`/api/schedule/clipboard-items`)
  - Фронтенд: `apps/web/src/components/schedule/ScheduleClipboardPanel.tsx`, `apps/web/src/ScheduleView.tsx`

---

## 7. `финансы::отображение_суммы_начислений_врачам_в_прайс_листе` [РЕАЛИЗОВАНО] -> KILLER
- **Идея**: Вывод динамической суммы ЗП врача напротив каждой позиции в прейскуранте для прозрачности начислений и контроля маржи.
- **Статус**: 
  - Схема Drizzle: `apps/api/src/db/schema/billing.ts` (`pricelistDoctorPayrolls`), `finance_v2.ts` (`doctorPaymentRewards`, `doctorPayrollStatements`)
  - Маршруты API: `apps/api/src/routes/pricelist.ts`, `apps/api/src/routes/billing.ts`
  - Фронтенд: `apps/web/src/components/settings/SettingsPricesTab.tsx`, `apps/web/src/components/payroll/DoctorPayrollModal.tsx`

---

## 8. `пациенты::причины_списания_в_архив_и_запрет_записи` [РЕАЛИЗОВАНО] -> KILLER
- **Идея**: Режим «Запрет записи» (Черный список) с блокировкой записи во всех окнах CRM и ярлыком.
- **Статус**: 
  - Схема Drizzle: `apps/api/src/db/schema/patients.ts` (`patientArchiveReasonsAndBlacklists`)
  - Запросы к БД: `apps/api/src/db/patientArchiveReasonsAndBlacklistsQuery.ts`
  - Маршруты API: `apps/api/src/routes/patients.ts`
  - Фронтенд: `apps/web/src/components/patients/PatientArchiveAndBlacklistWidget.tsx`, `apps/web/src/components/patients/PatientCardModal.tsx`

---

## 9. `документы::калькулятор_ндфл_с_блокировкой` [РЕАЛИЗОВАНО] -> MUST-HAVE
- **Идея**: Авто-расчет сумм НДФЛ код 1 с валидацией задолженности, товаров и выделением дорогостоящего лечения код 2.
- **Статус**: 
  - Движок Shared: `packages/shared/src/documents/ndflXmlGenerator.ts`
  - Сервис бэкенда: `apps/api/src/services/documents/ndflTaxService.ts`
  - Маршруты API: `apps/api/src/routes/documents/ndflCalculator.ts`, `apps/api/src/routes/documents/taxXml.ts`
  - Фронтенд: `apps/web/src/components/documents/NdflCalculatorModal.tsx`, `apps/web/src/components/documents/FnsTaxDeductionModal.tsx`

---

## ⚡ ЧАСТЬ II. СТО ШЕСТЬ КИЛЛЕР-ФИЧ СНИЖЕНИЯ ТРЕНИЯ, КЛИНИЧЕСКИХ ПРЕСЕТОВ И АВТОНОМИИ ВРАЧА (МАНДАТЫ 8e, 8i, 8k, 8n, ФИЧИ 64..169)

---

## 10. `прием::1_клик_физиологическая_норма` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТ 8e)
- **Идея**: Автозаполнение соматического анамнеза и первичного осмотра Формы 043/у физиологической нормой в 1 клик («Соматически здоров, норма»). Врач фиксирует только патологию, без рутинного прокликивания 50 чекбоксов.
- **Статус**: 
  - Фронтенд: `apps/web/src/components/patient/PatientAnamnesisModal.tsx` (`title="1 клик: соматически здоров, анамнез не отягощен, физиологическая норма"`), `apps/web/src/components/documents/forms/PatientIntakeQuestionnaireForm.tsx` (`title="1 клик: заполнить все поля анкеты физиологической нормой (соматически здоров)"`)
  - Хуки и протоколы: `apps/web/src/hooks/domains/useVisitLogic.ts`, `apps/web/src/lib/clinicalProtocols043.ts` (`defaultNormalStatus`)

---

## 11. `финансы::касса_54_фз_без_инн_физлиц` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТ 8e)
- **Идея**: Полное отсутствие бюрократических барьеров при приеме оплаты от физических лиц. По закону 54-ФЗ ИНН покупателя требуется **только для юридических лиц и ИП**. Касса принимает нал, карту, СБП QR и сплит-платежи без блокировок по ИНН с авто-расчетом сдачи.
- **Статус**: 
  - Движок и Фронтенд: `apps/web/src/components/finance/fiscal/fiscal54fzEngine.ts` (расчет ФФД 1.2, сдачи `calculateCashChange`, раздельный split tender без требования ИНН физлиц), `apps/web/src/components/finance/PaymentCapture.tsx`
  - Маршруты API: `apps/api/src/routes/billing.ts`, `apps/api/src/routes/fiscal/fiscalReceiptRoutes.ts`

---

## 12. `финансы::100_процентные_скидки_врача_без_паролей` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТ 8e)
- **Идея**: Безусловное право врача применять скидки вплоть до 100% на гарантийные переделки, лечение сотрудников или родственников без ввода мастер-паролей администратора. Истечение 30 дней предварительного плана не блокирует оказание помощи.
- **Статус**: 
  - Движок Shared: `packages/shared/src/finance/priceLockEngine.ts` (поддержка дисконта до 100%, пресеты гарантий и переделок)
  - Фронтенд: `apps/web/src/components/finance/InvoiceGenerationModal.tsx` (свободный ввод скидки до 100%)
  - Маршруты API и тесты: `apps/api/src/routes/invoices.ts`, `apps/api/src/tests/compliance/decree659Wave10DiscountsZeroPriceAndTaxAudit.test.ts`

---

## 13. `склад::1_клик_списание_карпул_медсестрой_без_комиссии` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТ 8e)
- **Идея**: Единоличная утилизация использованных пустых карпул анестетиков медсестрой в 1 клик по СанПиН 3.3686-21 без сбора комиссии из трех человек и бумажных актов.
- **Статус**: 
  - Фронтенд: `apps/web/src/components/warehouse/NurseCarpuleDisposalModal.tsx` (`Списание ${carpulesCount} пустых карпул выполнено единолично в 1 клик... по СанПиН 3.3686-21 без созыва комиссии`)
  - Маршруты API и сервисы: `apps/api/src/routes/warehouse/index.ts` (`/api/warehouse/:orgId/quick-carpule-disposal`), `apps/api/src/services/treatmentConsumablesService.ts`
  - Тесты: `apps/web/src/components/warehouse/__tests__/nurseCarpuleDisposal.test.ts`

---

## 14. `склад::мягкий_овердрафт_склада_с_предупреждением` [РЕАЛИЗОВАНО] -> KILLER (ZERO DEAD-ENDS)
- **Идея**: Задержка оприходования накладной поставщика никогда не блокирует прием пациента, операцию или проведение акта оказанных услуг на ресепшене. Склад списывает расходники в контролируемый минус («emergency_overdraft») с предупреждающим бейджем («Провести списание (Мягкий овердрафт склада)»), а не блокирует кнопки (Мандаты 8e п. 10, 8n п. 2).
- **Статус**: 
  - Сервис бэкенда: `apps/api/src/services/treatmentConsumablesService.ts` (`isOverdraft: true`, `transactionType: "emergency_overdraft"`)
  - Миграция PostgreSQL 18: `apps/api/drizzle/0198_stock_warehouses_fefo_batches_and_bom.sql`
  - Фронтенд проведения акта сдачи-приемки: `apps/web/src/components/treatment-plans/TreatmentPlanCompletedActPrint.tsx` (снята блокировка disabled={isExecuting || hasDeficit}, кнопка трансформируется в мягкий овердрафт с бейджем и подсказкой)
  - Складские модальные окна: `apps/web/src/components/inventory/ProcedureMaterialDeductionModal.tsx`, `apps/web/src/components/inventory/writeoff/ClinicalWriteoffModal.tsx`, `apps/web/src/components/warehouse/NurseCarpuleDisposalModal.tsx`
  - Тесты: `apps/web/src/components/treatment-plans/__tests__/softWarehouseOverdraft.test.ts` (5 pass), `apps/web/src/tests/clinicalWriteoff.test.ts`, `apps/web/src/tests/inventoryDeduction.test.ts`

---

## 15. `прием::autosave_400мс_с_оффлайн_indexeddb` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТ 8e)
- **Идея**: Debounced autosave (400мс) дневника визита 043/у на сервер и в локальную базу данных IndexedDB браузера. Переключение вкладок, входящий звонок телефонии или разрыв соединения никогда не уничтожают набранный врачом текст.
- **Статус**: 
  - Клиентская логика: `apps/web/src/components/useVisitDiaryLogic.ts` (`flushLocalDraft` на каждое изменение, `saveOfflineDraft`, перехват `beforeunload` и `visibilitychange`)
  - Сервис локального хранилища: `apps/web/src/services/offline/offlineStorage.ts` (методы `saveVisitDraft`, `loadVisitDraft`, префиксы `dente_diary_draft_`, `dente_form043_draft_`)

---

## 16. `коммуникации::честный_статус_сообщений_без_симуляторов` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТ 8k)
- **Идея**: Ликвидация процедурных симуляторов `setTimeout` (800мс `delivered` / 2000мс `read`) и хардкода фиктивных сообщений. Честный статус `sent`, реальная интеграция со шлюзом `POST /api/communications/inbox/:patientId/send` и чистый Empty State с врачебными шаблонами («Напоминание о приёме», «Рекомендации после удаления», «Подтверждение визита»).
- **Статус**: 
  - Фронтенд: `apps/web/src/components/chat/WhatsAppChatPanel.tsx` (коммит `6a4de208e`)
  - Валидация: 0 ошибок кодировки, 0 ошибок TypeScript.

---

## 17. `кт::подлинная_анатомия_без_синтетических_координат_нерва` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТ 8k & 8e)
- **Идея**: Запрет на выдумывание анатомии челюсти пациента. Полный снос захардкоженных синтетических координат нижнечелюстного канала (`[x: 25, y: -10, z: -40]`). Честное состояние нулевой разметки, клик по срезам с фиксацией точек через `canvasToWorld`, управление сплайном («+ Точка», «Замкнуть сплайн», «Очистить») и динамический расчет дистанции безопасности 2.0 мм до виртуальных имплантатов.
- **Статус**: 
  - Фронтенд: `apps/web/src/components/visiograph/Cornerstone3DViewer.tsx` (коммит `4830fae69`)
  - Тесты: `mandibularNerveCollision.test.ts` (9 pass), `ctPlanningMarkupReachesServer.test.ts` (11 pass).

---

## 18. `расписание::создание_записи_за_5_секунд_без_барьеров` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТ 8e & 8n)
- **Идея**: Суверенитет соло-врача (1–3 кресла, ИП) — запись на приём за 5 секунд. Авто-выбор активного врача и привязанного кресла по специализации, скрытие поля ассистента при отсутствии ассистента в клинике, отсутствие блокирующих disabled-кнопок из-за необязательных полей. Мгновенные статусные действия в карточке визита.
- **Статус**: 
  - Фронтенд: `apps/web/src/components/schedule/AppointmentModal.tsx`, `NewAppointmentForm.tsx`, `QuickBookingDrawer.tsx`, `AppointmentCard.tsx`, `useScheduleLogic.ts` (коммит `4830fae69`)
  - Тесты: `appointmentMissingFields.test.ts`, `AppointmentCard.test.tsx` (88 pass).

---

## 19. `касса::54_фз_без_дедлоков_копеек_и_сплит_оплата` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТ 8e(9) & 8n)
- **Идея**: Устранение критического дедлока кнопки «Пробить чек 54-ФЗ» из-за целочисленного округления копеек при дробных суммах (`1500.50 ₽` -> `1501 ₽` вызывало ложный отказ по переплате). Точный копеечный расчет `kopecksToRub`, 1-клик автобалансировка излишка, скрытие поля ИНН для физических лиц по 54-ФЗ с маркером соответствия, поддержка 3 методов доплаты в семейном кошельке (СБП QR, банковская карта, наличные с авторасчетом сдачи).
- **Статус**: 
  - Фронтенд и расчетный движок: `apps/web/src/components/finance/FiscalReceipt54FzModal.tsx`, `FamilyCombinedBillingModal.tsx`, `Order804nFiscalReceiptPrint.tsx`, `PaymentModal.tsx`, `order804nFiscalEngine.ts` (коммит `2e58e4074`)
  - Тесты: `order804nFiscalEngine.test.ts`, `familyCombinedBilling.test.ts`, `cashShiftAndFamilyWallet.test.ts` (24 pass).

---

## 20. `пародонтология::1_клик_физиологическая_норма_и_пресеты` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e & 8k)
- **Идея**: Ликвидация процедурного симулятора ручного вбивания 192 точек измерений (32 зуба x 6 поверхностей). 1-клик заполнение физиологической нормой (1-2 мм без BOP), пресеты гингивита и легкого пародонтита, а также 1-клик авто-вставка сформированного протокола осмотра пародонта в дневник Формы 043/у.
- **Статус**: 
  - Фронтенд: `apps/web/src/components/odontogram/PeriodontalChartingModal.tsx` (коммит `93605442c`)
  - Интеграция: `createDefaultPerioTeeth`, расчет индексов, протокол для ЭМК.

---

## 21. `касса::сбп_qr_честная_сверка_без_игрушечных_симуляторов` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8k & 54-ФЗ)
- **Идея**: Снос процедурного таймера `setTimeout 1.4с` и бутафорской кнопки демо-оплаты кассира в СБП. Внедрена честная ручная сверка кассира по мобильному банку/СМС с аудитом и реальный опрос банковского шлюза через API.
- **Статус**: 
  - Фронтенд: `apps/web/src/components/messaging/SbpPaymentQrModal.tsx` (коммит `37c51dc4f`)
  - Безопасность: защита от фиктивных списаний и ошибок кассира.

---

## 22. `егисз::мгновенный_синтез_укэп_без_таймеров` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8k & 8e)
- **Идея**: Ликвидация искусственной 600мс задержки симуляции КриптоПро CSP при генерации контейнера УКЭП подписи ГОСТ Р 34.10-2012 для выгрузки в РЭМД ЕГИСЗ. Мгновенное формирование подписанного XML без зависания интерфейса.
- **Статус**: 
  - Фронтенд: `apps/web/src/components/egisz/EgiszRemdHubModal.tsx` (коммит `46ed926ff`)
  - Тесты: 64/64 тестов EGISZ/REMD пройдены успешно.

---

## 23. `зуботехническая_лаборатория::автономия_врача_без_начмеда_и_1_клик_пресеты` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e & 8n)
- **Идея**: В частной стоматологии врач свободен в клинических решениях. Ликвидировано бюрократическое требование «Авторизация Главного врача» при отправке наряда ЗТЛ с предоплатой < 50%. Врач подтверждает отправку наряда в 1 клик по клиническим показаниям. Истечение 30 дней предварительного плана лечения переведено в мягкое информационное предупреждение (Мандат 8e пункт 7) и НИКОГДА не блокирует создание нарядов ЗТЛ, оказание услуг или приём оплаты. Внедрены 1-клик экспресс-пресеты ортопедических конструкций: диоксид циркония ZrO2 Prettau / Katana ML (5 дней), временная PMMA CAD/CAM (2 дня), металлокерамика Co-Cr Duceram Plus (7 дней), винтовая коронка на имплантате Ti-Base / Multi-unit + ZrO2 (7 дней).
- **Статус**: 
  - Фронтенд: `apps/web/src/components/lab/DentalLabFinancialGate.tsx`, `DentalLabOrderModal.tsx`, `dentalLabFinancialGateEngine.ts`, `LabWorkOrderModal.tsx`, `labWorkOrderPresets.ts`, `labMath.ts` (коммиты `e990812b8`, `96dc7246c`)
  - Тесты: `DentalLabOrderModal.test.tsx` (123 строки тестов 1-клик пресетов и неблокирующего 30-дневного плана, 100% passing).

---

## 24. `детство::возрастные_пресеты_сменного_прикуса_и_резорбции` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e & 8k)
- **Идея**: Детский стоматолог не тратит время на 20 ручных кликов по молочным зубам. Внедрены мгновенные возрастные пресеты (3–5 лет временный прикус, 6–8 лет ранний сменный, 9–12 лет поздний сменный), 1-клик физиологическая норма (Z01.2, 51–85 интактны), 1-клик протоколы по приказу 804н (Saforide A16.07.057, Fissurit FX A16.07.050, Pulpotec A16.07.009), перенос протокола в Форму 043/у без модальных барьеров. Ликвидирован смертный грех №6 (Анти-Матрёшка) — глубина модалок строго 1 с кнопкой возврата «Назад к формуле», тулбар строго в 1 строку 36px, 0 эмодзи в печатной памятке родителям.
- **Статус**: 
  - Фронтенд: `apps/web/src/components/odontogram/PediatricMixedDentitionModal.tsx`, `pediatricDentitionEngine.ts`, `PediatricParentMemoModal.tsx` (коммит `97af039fc`)
  - Тесты: `apps/web/src/tests/pediatricToothChart.test.ts` (41/41 тестов детской одонтограммы и пресетов 804н пройдены успешно).

---

## 25. `финансы::ликвидация_800мс_задержки_фискализации_54_фз` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e & 8k)
- **Идея**: Снос искусственного таймера `setTimeout 800ms` при нажатии «Пробить чек 54-ФЗ», «Чек возврата» и «Чек коррекции». Мгновенное формирование фискального документа, печать на ККТ и отправка в ОФД без зависания интерфейса кассы.
- **Статус**: 
  - Фронтенд: `apps/web/src/components/finance/FiscalReceipt54FzModal.tsx` (коммит `377b92bb1`)
  - Тесты: 151 тест биллинга пройден успешно.

---

## 26. `пациенты::подписание_идс_без_хардкода_смс_кода_и_задержек` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8k & 8e)
- **Идея**: Ликвидация хардкода фиктивного демо-кода СМС `8492` и искусственной задержки 500мс при подписании ИДС по 323-ФЗ. Честная валидация ввода одноразового кода и мгновенный синтез подписи.
- **Статус**: 
  - Фронтенд: `apps/web/src/components/patient-portal/InteractiveTreatmentTimelineWidget.tsx` (коммит `09626c187`)
  - Тесты: 4/4 тестов таймлайна пройдены успешно.

---

## 27. `интерфейс::ликвидация_кнопки_симулятор_из_шапки_клиники` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8d & 8k)
- **Идея**: Удаление нелепой кнопки «Симулятор входящих вызовов» из рабочей шапки CRM в пользу строгого профессионального виджета телефонии «Вызовы» с гарантированным тач-таргетом 44px. Симулятор звонков доступен строго разработчикам в режиме DEV/отладки.
- **Статус**: 
  - Фронтенд: `apps/web/src/components/Header.tsx` (коммит `cbae58db8`)
  - Валидация: 0 ошибок кодировки, 0 ошибок TypeScript.

---

## 28. `кабинет_пациента::защита_от_фиктивного_обнуления_долга_по_сбп` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8k & 54-ФЗ)
- **Идея**: Снос опасного процедурного симулятора `handleSimulateSbpSuccess`, позволявшего пациенту кликом по иконке любого банка или «Я оплатил» обнулить свой долг в CRM на 50 000–200 000 ₽ без поступления денег. Подключение реальных диплинков банков СБП и честной сверки статуса счета через API.
- **Статус**: 
  - Фронтенд: `apps/web/src/components/portal/patientCabinet/PatientCabinetModal.tsx` (коммит `12432fc3b`)
  - Тесты: 33/33 теста портала пациента пройдены успешно.

---

## 29. `ортодонтия::1_клик_протоколы_элайнеров_и_брекетов_в_043_у` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e & 8k)
- **Идея**: Ортодонт не тратит время на ручной многопольный ввод. Внедрены 1-клик клинические пресеты (фиксация аттачментов + выдача элайнеров 1–5, контрольный осмотр трекинга, активация брекетов с дугой NiTi и цепочками Power Chain) с прямой мгновенной вставкой в дневник Формы 043/у.
- **Статус**: 
  - Фронтенд: `apps/web/src/components/diagnostics/OrthodonticPhotoProtocolModal.tsx`, `photoProtocol.css` (коммит `6e41e2458`)
  - Тесты: `OrthodonticPhotoProtocolModal.test.tsx` (4 pass), `anesthesiaMrdCalculator.test.ts` (21 pass).

---

## 30. `расписание::1_клик_cito_овербукинг_дежурному_врачу_и_печать_бланка_договора` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e & 8n)
- **Идея**: Мгновенная запись пациента с острой болью (CITO) в 1 клик прямо из виджета срочных обращений под календарем с авто-подбором дежурного врача, кресла и округленного слота времени. Возможность печати чистого бланка договора со строками `_______` до заведения карты в базе без 403-ошибок.
- **Статус**: 
  - Фронтенд: `apps/web/src/components/schedule/QuickBookingDrawer.tsx`, `UrgentScheduleRequestsWidget.tsx`, `ScheduleView.tsx` (коммит `b67d4cda6`)
  - Тесты: `apps/web/src/components/schedule/__tests__/UrgentScheduleRequestsWidget.test.tsx` (new), `QuickBookingDrawer.test.ts` (12/12 pass).

---

## 31. `рецепты::форма_107_1_у_приказ_1094н_полиграфическая_верстка_и_1_клик_сроки` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e & 1094н)
- **Идея**: Печать рецептурных бланков Минздрава РФ по форме № 107-1/у (Приказ № 1094н) с журнальной типографикой, векторными печатями клиники/врача, 1-клик установкой сроков действия (15 дней / 60 дней / до 1 года для хронических больных) и мгновенным подбором готовых стоматологических пакетов медикаментов.
- **Статус**: 
  - Фронтенд: `apps/web/src/components/prescriptions/MedicalPrescriptionModal.tsx`, `medicalPrescription.css` (коммит `6a1b044e8`)
  - Валидация: соответствие Приказу Минздрава РФ № 1094н.

---

## 32. `хирургия::1_клик_экспресс_протоколы_имплантации_dentium_osstem_straumann_и_детская_эндодонтия` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e & 8k)
- **Идея**: 1-клик составление полного хирургического протокола имплантации (Dentium SuperLine, Osstem TS III, Straumann BLX; торк 35 Н·см, ISQ 72, шовный материал Prolene 4-0) с автоматической вставкой в дневник 043/у. Неблокирующая печать паспорта имплантата со строками `________` для вклейки стикеров вручную. Детская эндодонтия зубов 51..85 с авто-расчетом рабочей длины.
- **Статус**: 
  - Фронтенд: `apps/web/src/components/surgery/SurgeryVisitCockpit.tsx`, `VisitSurgeryProtocolTab.tsx`, `ImplantPassportModal.tsx`, `EndoCanalLogModal.tsx` (коммит `65ab08a3f`)
  - Валидация: 0 блокировок, 0 искусственных задержек.

---

## 33. `элн::неблокирующая_вставка_черновика_в_043_у_и_пресеты_острой_боли` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e & 1089н)
- **Идея**: Врач-стоматолог имеет право в 1 клик вставить черновик открытого ЭЛН в амбулаторную карту 043/у даже до момента завершения полной верификации на сервере СФР. 1-клик клинические пресеты острой боли (острый альвеолит K10.3, острый перикоронит K05.2) по Приказу Минздрава РФ № 1089н. Информативные алерты вместо некликабельных серых кнопок.
- **Статус**: 
  - Фронтенд: `apps/web/src/components/sick-leave/SickLeaveElnModal.tsx`, `sickLeaveElnPresets.ts` (коммит `fe47d21ca`)
  - Тесты: 100% прохождение валидации.

---

## 34. `финансы::клиническое_согласование_врача_в_счетах_и_актах` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e & 8n)
- **Идея**: Устранение блокировок при формировании наряд-заказов, актов и счетов на оплату в `InvoiceGenerationModal`. Врач или соло-доктор вправе согласовать цены и гарантийные скидки в 1 клик («Согласовать врачом») без ввода административного PIN-кода управляющего. Кнопка выписки счета никогда не блокируется мертвым серым курсором.
- **Статус**: 
  - Фронтенд: `apps/web/src/components/finance/InvoiceGenerationModal.tsx`
  - Валидация: автономия соло-врача и клиники 1-3 кресла без бюрократических барьеров.

---

## 35. `финансы::комбинированная_оплата_аванс_карта_в_1_клик` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e & 8k)
- **Идея**: Снятие блокировок кнопок частичной оплаты в `PaymentModal`. Если остаток депозита или семейного баланса меньше общей суммы счета, кнопка не выключается в disabled, а предлагает 1-клик резолвер: «Зачесть аванс N ₽ + остаток картой» без ручного калькулятора. Защита черновика врача от потери (Autosave Flush) при входящем звонке телефонии. Разблокировка гарантийных скидок до 100% с нулевой ценой услуги (0 ₽) в `planToInvoiceValidator.ts` без административных блокировок.
- **Статус**: 
  - Фронтенд: `apps/web/src/components/finance/PaymentModal.tsx`, `apps/web/src/components/finance/InvoiceGenerationModal.tsx`, `apps/web/src/store/telephonyStore.ts`, `apps/web/src/useAppLogic.tsx` (коммиты `388b1ac24`, `1d7d1d2f8`).
  - Тесты: `packages/shared/src/tests/planToInvoiceValidator.test.ts`, 1372 теста shared пройдены.

---

## 36. `ортодонтия::цефалометрия_трг_голосовой_ввод_и_чистый_модальный_центр` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e & 8k)
- **Идея**: Устранение дубликата `OrthodonticCephTrackerModal.tsx`, объединение в канонический `CephalometricAnalysisModal.tsx`. Голосовая диктовка ориентиров цефалометрии через `globalDentalVoiceEngine` («точка Назион», «точка Сэлла»), авто-переход к следующей точке, 1-клик перенос расчетов углов в дневник 043/у.
- **Статус**: 
  - Фронтенд: `apps/web/src/components/orthodontics/CephalometricAnalysisModal.tsx`, `cbctExportEngine.ts` (коммит `95128f01e`).
  - Валидация: Exit Code 0, исключены аркадные HU-слайдеры.

---

## 37. `клиника::отвязка_стоматологической_карты_043_у_от_госпитальной_формы_025_у` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТ 8i)
- **Идея**: Ликвидация госпитального заражения контекста: удалена зависимость амбулаторной стоматологической карты от многопрофильной поликлинической формы 025/у (`outpatient025uMedicalCardNumberValue`). Номер карты 043/у валидируется и формируется строго по стоматологическому регламенту.
- **Статус**: 
  - Фронтенд: `apps/web/src/documentValidators.ts`, `apps/web/src/hooks/domains/useDocumentPayloads.ts`, `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts`, `apps/web/src/hooks/domains/usePatientIntakeLogic.ts` (коммит `65be4645c`).
  - Валидация: 0 ошибок компиляции, строгое соответствие амбулаторному домену.

---

## 38. `рентгенология::ликвидация_аркадных_hu_слайдеров_и_синтетических_svg_диорам` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k & РАЗДЕЛ XI THE HAMMER)
- **Идея**: Ликвидация игровых/аркадных слайдеров плотности кости и синтетических SVG-диорам нижнечелюстного нерва. Внедрение подлинной анатомической шкалы плотности кости по Misch (D1–D5: D1 >1250 HU, D2 850–1250 HU, D3 350–849 HU, D4 150–349 HU, D5 <150 HU), честного состояния неразмеченного нижнечелюстного канала («0 точек») с гарантированным коридором безопасности 2.0 мм в `ImplantCrossSectionPlanner.tsx` и математическом модуле `boneDensityMischMath.ts`. Утилитарное измерение рабочей длины корневых каналов в `EndoCanalMeasurementDrawer.tsx`.
- **Статус**: 
  - Фронтенд / Алгоритмы: `apps/web/src/components/radiology/ImplantCrossSectionPlanner.tsx`, `boneDensityMischMath.ts`, `implantSafetyEngine.ts`, `apps/web/src/components/odontogram/EndoCanalMeasurementDrawer.tsx` (коммит `48c7cdac2`).
  - Валидация: 0 ошибок сборки, отсутствие бутафорских симуляторов, строгая клиническая точность.

---

## 39. `хирургия_имплантация::унификация_хирургического_паспорта_импланта_и_снос_блоата` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8j, 8k, 8e)
- **Идея**: Ликвидация дублирующего раздутого компонента `ImplantSurgicalPassportModal.tsx` (-1097 строк процедурного кода и удаление `implantSurgicalPassport.css`). Полная унификация хирургического паспорта в канонический утилитарный `ImplantPassportModal.tsx` с пресетами ведущих имплантационных систем (Straumann, Osstem, Nobel Biocare, Dentium, Astra Tech), протоколированием торка (Н·см), ISQ (коэффициент стабильности имплантата), параметров лота/партии и 1-клик экспортом готового протокола в дневник Формы 043/у без паразитных задержек и многооконного ада.
- **Статус**: 
  - Фронтенд: `apps/web/src/components/implants/ImplantPassportModal.tsx`, `apps/web/src/components/visit/VisitDiagnosticsTab.tsx` (коммит `13fe5e9a0`).
  - Валидация: Exit Code 0, снос свыше 1000 строк мертвого процедурного блоата.

---

## 40. `зарплата_кадры::табель_учета_рабочего_времени_т13_с_однострочным_тулбаром` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8d, 8e & APPLE HIG)
- **Идея**: Приведение табеля Т-13 (`FormT13TimesheetModal.tsx`, `TimesheetT13Modal.tsx`) к канонам Apple Studio HIG и Закону Хика (ровно 1 строка тулбара 32–36px). Защита от сбоев при выборе сотрудника (`activeEmployee` guard), компактные переключатели расчетных периодов, полиграфическая точность формы Т-13 Госкомстата РФ с автоматическим учетом явок, ночных смен и невыходов врачей и ассистентов.
- **Статус**: 
  - Фронтенд: `apps/web/src/components/payroll/FormT13TimesheetModal.tsx`, `TimesheetT13Modal.tsx`, `apps/web/src/components/payroll/advancedPayroll.css`, `timesheetT13.css` (коммит `ff2dbb9c7`).
  - Валидация: 0 ошибок линтеров, ликвидация многоэтажного частокола кнопок, полное соответствие трудовому учету РФ.

---

## 41. `санпин_портал_врача::крафт_пакеты_без_комиссий_и_мобильные_смены_врача` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8n & САНПИН 3.3686-21)
- **Идея**: Обеспечение полной автономии соло-врача и старшей медсестры при вскрытии крафт-пакетов стерилизации (`SeniorNurseKraftUnsealModal.tsx`, `KraftPackageQuickScanner.tsx`, `sterilizationPresets.ts`). 1-клик вскрытие и привязка индикатора стерильности/QR-кода пакета к приему пациента без созыва комиссий из 3 человек. Мобильный учет смен врача в портале (`DoctorMobileShiftModal.tsx`) со строгой типизацией `shiftDateIso` (`exactOptionalPropertyTypes`) и мгновенным подтверждением явки на смену.
- **Статус**: 
  - Фронтенд: `apps/web/src/components/doctor-portal/DoctorMobileShiftModal.tsx`, `apps/web/src/components/sanpin/kraft/SeniorNurseKraftUnsealModal.tsx`, `apps/web/src/components/sterilization/KraftPackageQuickScanner.tsx`, `sterilizationPresets.ts` (коммит `0dc6e0fad`).
  - Тесты: unit-тесты `sanpinUnsealMandate8e.test.ts` (100% passing).

---

## 42. `интерфейс::ликвидация_матрешек_и_вложенных_модалок_в_резюме_визита_и_печати` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8d(6), 8e & APPLE HIG)
- **Идея**: Полное соблюдение Закона Анти-Матрёшки (глубина модальных окон строго 1) в `VisitSummaryModal.tsx`, `Form043PrintModal.tsx` и `DoctorShiftRosterModal.tsx`. Устранение открытий модалок поверх модалок (печать 043/у, подтверждения действий, графики смен врачей). Все вторичные параметры вынесены во встроенные аккордеоны и плавные inline-панели с сохранением фокуса и автономии врача.
- **Статус**: 
  - Фронтенд: `apps/web/src/components/visit/VisitSummaryModal.tsx`, `apps/web/src/components/emr/Form043PrintModal.tsx`, `apps/web/src/components/schedule/roster/DoctorShiftRosterModal.tsx` (коммит `a5df76320`).
  - Валидация: Exit Code 0, исключены визуальные перекрытия и паразитные многоуровневые оверлеи.

---

## 43. `документы::сессионная_пэп_подпись_дневников_по_63_фз_и_приказу_947н` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8n & 63-ФЗ)
- **Идея**: 1-клик сессионное подписание врачебных записей и дневников формы 043/у простой электронной подписью (ПЭП) по 63-ФЗ и Приказу Минздрава РФ № 947н в `doctorShiftEngine.ts` и `doctorShiftCockpitEngine.ts`. Врач один раз за смену авторизует сессионный токен ЭЦП и подписывает все дневники приемов без повторного ввода паролей, задержек и ожидания сетевых ответов.
- **Статус**: 
  - Shared: `packages/shared/src/doctor-portal/doctorShiftEngine.ts`, `packages/shared/src/doctor/doctorShiftCockpitEngine.ts` (коммит `51f4d0677`).
  - Валидация: Exit Code 0, строгое соответствие Федеральному закону № 63-ФЗ и регламенту ЭМК РФ.

---

## 44. `рецепты::1_клик_стоматологические_пресеты_и_чистая_печать_формы_107_1_у_по_приказу_1094н` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e & ПРИКАЗ 1094н)
- **Идея**: Полное устранение ручного набора рецептурных бланков Минздрава РФ по форме № 107-1/у (Приказ № 1094н). 1-клик профильные стоматологические пресеты (Амоксиклав 1000 мг, Найз 100 мг, Ципролет 500 мг, Хлоргексидин 0.05%, Метрогил Дента) с автозаполнением дозировок, способов применения на русском и латыни, срока действия (15 / 60 / 365 дней) и полиграфической версткой бланка с QR-проверкой в `PrescriptionPrintModal.tsx` и `MedicalPrescriptionModal.tsx`.
- **Статус**: 
  - Фронтенд / Shared: `apps/web/src/components/prescriptions/PrescriptionPrintModal.tsx`, `generator/MedicalPrescriptionModal.tsx`, `generator/prescriptionPresets.ts`, `packages/shared/src/documents/forms107_1u.ts`, `clinicalHtmlRenderers.ts` (коммит `4cd580cc3`).
  - Тесты: `apps/web/src/tests/PrescriptionPrintModal.test.ts`, `prescriptionGenerator.test.ts` (100% passing).

---

## 45. `санпин::экстренное_вскрытие_крафт_лотков_и_прием_острой_боли_без_задержек` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8n & САНПИН 3.3686-21)
- **Идея**: Автономия операционной медсестры и врача при экстренном вскрытии стерилизационных лотков и наборов при острой боли. Вынесение алгоритма в `kraftPackageEngine.ts`, поддержка мягкого допуска и мгновенной фиксации вскрытия крафт-пакета/лотка в `SanpinRegisters.tsx` и `SeniorNurseKraftUnsealModal.tsx` без бюрократических остановок и комиссий.
- **Статус**: 
  - Фронтенд: `apps/web/src/components/sanpin/SanpinRegisters.tsx`, `SeniorNurseKraftUnsealModal.tsx`, `kraft/kraftPackageEngine.ts` (коммит `5f0ee1df3`).
  - Тесты: unit-тесты `sanpinUnsealMandate8e.test.ts` (100% passing).

---

## 46. `рецепты::пакеты_первой_линии_и_резерва_аллергий_формы_107_1_у_по_приказу_1094н` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8i & ПРИКАЗ 1094н)
- **Идея**: 1-клик назначение профильных стоматологических пакетов медикаментов первой линии и резерва: Амоксиклав 875/125 мг (первая линия антибиотикотерапии), Кларитромицин 500 мг (резерв при подтвержденной аллергии на пенициллиновый ряд), Ибупрофен 400 мг (купирование умеренного болевого синдрома), Хлоргексидин 0.05% (антисептические полоскания) и стоматологический противовоспалительный гель Холисал. Генерация регламентного бланка № 107-1/у (Приказ Минздрава РФ № 1094н) с латинскими сигнатурами (Rp:), режимом дозирования и правилами приема в 1 клик.
- **Статус**: 
  - Фронтенд / Shared: `apps/web/src/components/prescriptions/generator/prescriptionPresets.ts`, `packages/shared/src/documents/forms107_1u.ts` (коммит `9e360aac1`).
  - Тесты: unit-тесты `apps/web/src/tests/prescriptionGenerator.test.ts` (100% passing).

---

## 47. `гигиена_пародонтология::1_клик_экспресс_пресеты_нормы_и_патологии_без_рутины_192_точек` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k & СТАР)
- **Идея**: Полная ликвидация процедурного симулятора ручного обхода и ввода 192 точек глубины карманов и кровоточивости. Внедрение 5 клинических экспресс-пресетов: (1) Пародонт в норме (глубина 1–2 мм, без BOP), (2) Катаральный гингивит (2 мм, отек десневых сосочков, BOP+), (3) Пародонтит легкий (3–4 мм, межзубный CAL), (4) Пародонтит средний (4–5 мм, рецессия 1–2 мм, над- и поддесневой зубной камень, подвижность I ст.), (5) Профессиональная гигиена полости рта (5-этапный протокол: ультразвук Piezon + AirFlow глицин + полировка Detartrine + Bifluorid 12). Мгновенный пересчет стоматологических индексов OHI-S, PMA, КПИ Леуса, Silness-Loe, SBI и 1-клик вставка заключения в дневник Формы 043/у. Соблюдение Греха № 7 (ноль эмодзи в медицинских картах).
- **Статус**: 
  - Фронтенд: `apps/web/src/components/hygiene/HygieneIndicesPanel.tsx`, `apps/web/src/components/odontogram/PeriodontalChartingModal.tsx`, `periodontalCharting.css`, `apps/web/src/components/perio/PeriodontogramChart.tsx` (коммит `d9f42454f`).
  - Тесты: unit-тесты `apps/web/src/tests/periodontalCharting.test.tsx` (100% passing).

---

## 48. `анестезия_пку::1_клик_списание_карпул_анестетиков_медсестрой_без_комиссий_из_3_человек` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8n & САНПИН 3.3686-21)
- **Идея**: Автономия медсестры и ассистента при списании и утилизации карпул местных анестетиков предметно-количественного учета (ПКУ) и опасных медицинских отходов Класса Б по СанПиН 3.3686-21. Полный отказ от созыва бюрократической комиссии из 3 человек для амбулаторной стоматологии (Мандат 8e пункт 10). Готовые 1-клик пресеты списания: Ультракаин Д-С форте (артикаин 4% + эпинефрин 1:100 000), Септанест 1:100 000, Скандонест 3% без вазоконстриктора (кардио-пациенты) и бой/брак карпул. Автоматический расчет сроков годности (+2 года), валидация просрочки, фиксация дезинфекции в Аламиноле 3% (60 мин), генерация официального печатного Акта утилизации и HTML-документа с однострочным подтверждением подписи в 1 клик.
- **Статус**: 
  - Фронтенд / Shared: `apps/web/src/components/anesthesia/AnesthesiaPkuDisposalModal.tsx`, `packages/shared/src/anesthesia/pkuDisposal.ts`, `packages/shared/src/anesthesia/types.ts` (коммиты `d6a6eab26`, `2303c297e`).
  - Тесты: `apps/web/src/components/anesthesia/__tests__/anesthesiaPkuDisposal.test.tsx`, `packages/shared/src/tests/anesthesiaPkuDisposal.test.ts` (100% passing).

---

## 49. `ортодонтия::ортодонтическая_студия_1_клика_дуги_cuniti_tma_эластики_элайнеры_брекеты` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k, 8n)
- **Идея**: Полнофункциональная ортодонтическая студия и клинический движок ортодонтии в 1 клик без многооконного хаоса (глубина модалок строго 1 по Закону Анти-Матрёшки). Автоматический расчет номенклатурных кодов по Приказу Минздрава РФ № 804н и 1-клик вставка структурированного дневника SOAP в Форму 043/у.
  - **Клинические экспресс-пресеты 1-клика**:
    1. *Круглые термоактивные дуги CuNiTi (.014 / .016)* — этап нивелирования и выравнивания зубов с минимальным силовым воздействием (A16.07.048).
    2. *Прямоугольные рабочие и торковые дуги TMA (.019x.025) / SS* — этап юстировки торка и закрытия постэкстракционных промежутков с ретракционными петлями (A16.07.048).
    3. *Межчелюстные эластики* — фиксация эластических тяг по II классу (Rabbit 3/16" 4.5 oz), по III классу (Fox 1/4" 4.5 oz), треугольные тяги (A16.07.047).
    4. *Элайнеры и прозрачные каппы* — фиксация композитных аттачментов (клыки, премоляры), сепарация эмали IPR (0.2–0.5 мм), выдача наборов элайнеров 1–5 или 6–10 на 14 дней ношения (A16.07.053).
    5. *Брекет-системы* — фиксация аппаратуры (паз .018 / .022, Damon Q2 / Clarity Advanced) (A16.07.028), активация эластомерных цепочек Power Chain, снятие брекетов с установкой несъемного ретейнера 33–43 / 13–23 (A16.07.049).
  - **Фотопротокол ортодонтии**: 9 стандартизированных ракурсов (портрет анфас, улыбка, профиль 90°, окклюзионный верхний/нижний, боковые прикуса) с drag-and-drop загрузкой и чистой сеткой.
- **Статус**: 
  - Shared: `packages/shared/src/orthodontics/types.ts`, `packages/shared/src/orthodontics/orthoEngine.ts`, `packages/shared/src/orthodontics/index.ts` (коммит `5a007a4ab`)
  - Фронтенд: `apps/web/src/components/orthodontics/OrthodonticStudioModal.tsx`, `apps/web/src/components/orthodontics/OrthoPhotoProtocolModal.tsx` (коммит `5a007a4ab`)
  - Тесты: `packages/shared/src/tests/orthoEngine.test.ts` (14 сценариев, 270 строк тестов, 100% passing).

---

## 50. `хирургия::1_клик_амбулаторная_хирургия_протоколы_удаления_периостотомия_и_мягкий_овердрафт_склада` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k, 8n & ZERO DEAD-ENDS)
- **Идея**: Устранение рутинного набора текста при амбулаторных хирургических вмешательствах. Внедрены 5 стандартизированных клинических протоколов по Номенклатуре медицинских услуг 804н с авто-подстановкой рекомендаций и наложением швов, а также неблокирующий мягкий овердрафт расходных материалов склада под Мандат 8e:
  1. *Простое удаление зуба (A16.07.001)*: проводниковая/инфильтрационная анестезия Артикаин 1:100 000, периотомия, люксация прямым/байонетным элеватором, удаление щипцами, кюретаж грануляций, гемостаз губкой Альвожиль / гемостатической губкой, марлевый тампон 20 мин.
  2. *Сложное удаление зуба с разъединением корней (A16.07.002)*: выкраивание слизисто-надкостничного лоскута, трепанация кортикальной пластинки, фрагментация бифуркации фиссурным бором Lindemann на физиодиспенсере с охлаждением физраствором, удаление корней элеватором, сглаживание костных краев фрезой, ревизия, гемостаз, наложение узловых швов Викрил 4-0.
  3. *Атипичное удаление ретинированного / дистопированного зуба мудрости (A16.07.024)*: разрез по переходной складке и гребню ветви, отслаивание лоскута распатором, костное окно турбиной, одонтотомия (сепарация коронки от корней), извлечение элеватором Леклюза, антисептическая обработка хлоргексидином 0.05%, репозиция лоскута, глухие узловые швы Викрил 4-0.
  4. *Неотложная периостотомия / вскрытие поднадкостничного абсцесса (A16.07.011)*: разрез по переходной складке на протяжении 1.5–2.0 см в зоне максимальной флюктуации до кости, эвакуация гнойного экссудата, туалет раны 0.05% хлоргексидином, дренирование резиновым выпускником на 48 часов.
  5. *Дентальная имплантация (A16.07.006)*: костное ложе 800 об/мин, торк 35 Н·см, ISQ 72, формирователь десны (ФДМ) или винт-заглушка, узловые швы Prolene 4-0, контрольный снимок.
  - **Мягкий овердрафт склада (Zero Dead-Ends)**: Задержка оприходования шовного материала (Викрил, Пролен) или гемостатической губки (Альвожиль) НИКОГДА не блокирует проведение экстренной операции (`canProceed: true`). Выводится мягкое предупреждение с автоматическим отложенным списанием прихода.
  - **HIG и Грех № 7**: Однострочный тулбар 36px (с режимом 48px для работы в стерильных перчатках), 0 эмодзи в официальных медицинских картах Формы 043/у.
- **Статус**: 
  - Фронтенд / Логика: `apps/web/src/components/surgery/surgeryProtocols.ts`, `SurgeryCockpitModal.tsx`, `SurgeryProtocolPanel.tsx`, `SurgerySafetyChecklist.tsx`, `apps/web/src/components/visit/surgery/SurgeryVisitCockpit.tsx`, `VisitSurgeryProtocolTab.tsx`, `surgery.css`, `visitSurgery.css` (коммит `f150e4c7f`)
  - Тесты: `apps/web/src/components/surgery/__tests__/surgeryProtocols.test.ts` (7 проверочных блоков, 106 строк, 100% passing), `surgeryCockpitModal.test.tsx`.

---

## 51. `зуботехническая_лаборатория::1_клик_наряды_зтл_zro2_pmma_мк_винтовая_коронка_и_снятие_30_дневного_блока` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k & СЕКЦИЯ VII THE HAMMER)
- **Идея**: Максимальное ускорение взаимодействия ортопеда с зуботехнической лабораторией (ЗТЛ). Устранение бюрократических блокировок и ручного заполнения параметров ортопедических конструкций:
  - **1-клик экспресс-пресеты ортопедических конструкций**:
    1. *Коронка из диоксида циркония (ZrO2 Prettau / Katana ML)*: анатомическая форма, зазор под цемент 30 мкм, окклюзионный контакт 50 мкм, слепок А-силикон / цифровой скан, срок 5 рабочих дней (24 000 ₽ / 7 500 ₽).
    2. *Временная фрезерованная коронка PMMA CAD/CAM*: высокоточный провизорный полимер, зазор 40 мкм, срок 2 рабочих дня (3 500 ₽ / 1 200 ₽).
    3. *Металлокерамическая коронка Co-Cr (Duceram Plus)*: классическая металлокерамика, цвет VITA A2, зазор 40 мкм, срок 7 рабочих дней (15 000 ₽ / 5 000 ₽).
    4. *Коронка на имплантате с винтовой фиксацией (Ti-Base / Multi-unit + ZrO2)*: индивидуальное титановое основание, зазор 30 мкм, взаимно-защищенная окклюзия, цифровой скан STL/PLY, срок 7 рабочих дней (38 000 ₽ / 13 000 ₽).
    5. *Каппа от бруксизма / прикусной сплинт (3 дня)*, *индивидуальный абатмент Ti-Base (7 дней)*, *съемный нейлоновый / Acry-Free протез (8 дней)*.
  - **Снятие 30-дневного блока плана лечения (Мандат 8e пункт 7)**:
    - По Конституции клиники (Раздел VII THE HAMMER): «Истечение 30 дней с момента составления плана лечения НЕ БЛОКИРУЕТ создание нарядов ЗТЛ, оказание услуг или оплату».
    - Вместо блокировки кнопки создания/отправки наряда ЗТЛ система выводит мягкий бирюзовый бейдж: `✓ План составлен >30 дней назад: по закону клиники срок плана НЕ БЛОКИРУЕТ наряды ЗТЛ, услуги и оплату (Мандат 8e) · Без согласований начмеда`.
- **Статус**: 
  - Фронтенд / Расчеты: `apps/web/src/components/lab/labMath.ts`, `DentalLabOrderModal.tsx`, `DentalLabRestorationTab.tsx`, `dentalLabFinancialGateEngine.ts`, `orders/LabWorkOrderModal.tsx`, `orders/labWorkOrderPresets.ts` (коммиты `96dc7246c`, `97af039fc`).
  - **Ликвидация академического блоата (Мандаты 8i, 8k, 8e)**: Избыточный компонент `DentalLabOcclusionTab.tsx` (концепции окклюзии Доусона, микроны фрезера ЗТЛ, перикиматы) официально снесён и удален из кодовой базы. В `DentalLabOrderModal.tsx` оставлено ровно 5 чистых вкладок (1. Зубы и Конструкция, 2. Расцветка VITA, 3. Этапы и Сроки, 4. Себестоимость, 5. Бланк ГОСТ).
  - Тесты: `apps/web/src/components/lab/__tests__/DentalLabOrderModal.test.tsx` (31 сценарий тестов 1-клик пресетов и снятия 30-дневного блока, 100% passing).

---

## 52. `анестезия_пку::ликвидация_эмодзи_в_актах_утилизации_пку_по_греху_7` [РЕАЛИЗОВАНО] -> POLISH (МАНДАТ 8d / ГРЕХ № 7)
- **Идея**: Полное искоренение несерьёзных мультяшных эмодзи (📦, 📝, 💉) из акта утилизации карпул местных анестетиков предметно-количественного учета (ПКУ) и опасных отходов Класса Б по СанПиН 3.3686-21, а также из кнопок и информационных плашек. В официальной медицинской и юридической документации стоматологии РФ разрешены исключительно строгие векторные иконки Lucide и регламентный русский язык.
- **Статус**: 
  - Фронтенд: `apps/web/src/components/anesthesia/AnesthesiaPkuDisposalModal.tsx` (коммит `2303c297e`).
  - Валидация: 0 эмодзи в тексте и разметке, 100% соответствие Смертному Греху № 7.

---

## 53. `терапия_эндодонтия::1_клик_протоколы_пульпит_обтурация_периодонтит_кариес_без_симулятора` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8i, 8k, 8n)
- **Идея**: Терапевтическая стоматология и эндодонтия без процедурного симулятора. Врач не кликает каждую карпулу или миллиметр рабочей длины. Внедрены 4 потоковых 1-клик протокола по Приказу 804н, клиническим рекомендациям СтАР и Форме 043/у:
  1. *Пульпит (1-е посещение)* (`pulpitis_visit1`): экстирпация пульпы, мехобработка ProTaper/WaveOne, NaOCl 3% + ЭДТА 17%, временное пломбирование гидроксидом кальция Calcept под дентин-пасту (услуги A16.07.030.001 + A16.07.008.002, МКБ-10 K04.0).
  2. *Пульпит (2-е посещение) / Обтурация* (`pulpitis_obturation`): распломбирование временной пасты, высушивание бумажными штифтами, постоянная обтурация гуттаперчей методом латеральной конденсации с силером AH Plus / BioRoot, RVG контроль (услуга A16.07.008.001, МКБ-10 K04.0).
  3. *Периодонтит (деструктивный)* (`periodontitis_destructive`): механическая и ультразвуковая дезинфекция каналов, пролонгированная паста Metapex/Calcept на 14 дней (услуги A16.07.030.002 + A16.07.008.002, МКБ-10 K04.5).
  4. *Кариес дентина (средний / глубокий)* (`caries_medium`): препарирование, адгезивный протокол OptiBond / Single Bond, реставрация Filtek / Estelite Sigma Quick по слоям, полировка Enhance / Prisma Gloss (услуга A16.07.002.001, МКБ-10 K02.1).
- **Эргономика и соблюдение Мандата 8d**:
  - Тулбар в шторке каналов (`EndoCanalMeasurementDrawer.tsx`) строго в 1 строку 32–34px с горизонтальным скроллом `scrollbar-none`.
  - В модальном журнале (`EndoCanalLogModal.tsx`) и баре сценариев (`ClinicalQuickPresetsBar.tsx`) 0 сырых эмодзи — строго векторные иконки Lucide (`<Zap>`, `<Check>`, `<ShieldCheck>`, `<Stethoscope>`).
  - Все тач-таргеты $\ge 44\times 44\text{px}$ ($\ge 50\text{px}$ в карточках сценариев).
  - Мгновенная вставка в дневник визита Формы 043/у через глобальное событие `dente-apply-soap-protocol` и `useVisitStore`.
- **Статус**:
  - Фронтенд / Логика: `apps/web/src/components/visit/clinicalSoapPresets.ts`, `ClinicalQuickPresetsBar.tsx`, `apps/web/src/components/odontogram/EndoCanalLogModal.tsx`, `EndoCanalMeasurementDrawer.tsx` (коммит `1a9ec847f`).
  - Тесты: `apps/web/src/tests/clinicalSoapPresets.test.ts` (21/21 passing), `apps/web/src/components/odontogram/__tests__/EndoCanalLogModal.test.ts` (30/30 passing), `apps/web/src/components/visit/__tests__/clinicalSoapProtocols043.test.ts` (66/66 passing).

---

## 54. `согласия_идс::1_клик_пакетное_подписание_согласий_и_печать_чистых_бланков` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k, 8n & 323-ФЗ)
- **Идея**: Пакетные комплексы информированных добровольных согласий (ИДС) по ст. 20 Федерального закона № 323-ФЗ и Приказу Минздрава РФ № 1051н. Полный отказ от бюрократического прокликивания десятков отдельных согласий.
  - **Шесть регламентных пакетов ИДС**:
    1. *Базовый первичный приём* (`standard_admission`): базовое согласие по 323-ФЗ, первичный осмотр, инфильтрационная/проводниковая анестезия, прицельная радиовизиография.
    2. *Хирургический комплекс (Имплантация и удаление)* (`surgery_implantation`): оперативное вмешательство, удаление зуба, костная пластика, субантральная аугментация (синус-лифтинг), дентальная имплантация с памяткой рисков.
    3. *Ортодонтический пакет* (`orthodontics_aligners`): ортодонтическое лечение брекет-системами, прозрачными элайнерами, ретенционными аппаратами, правила ношения.
    4. *Ортопедический пакет* (`orthopedics_prosthetics`): препарирование твердых тканей, депульпирование по ортопедическим показаниям, снятие прецизионных слепков, фиксация несъемных коронок и съемных протезов.
    5. *Детский приём* (`pediatric_package`): согласие законного представителя ребенка (до 15 лет) с фиксацией паспортных данных родителя/опекуна.
    6. *Комплексная диагностика* (`full_diagnostic`): прицельные снимки RVG, ортопантомограмма ОПТГ, 3D КЛКТ двух челюстей.
  - **Автономия регистратуры и врача (Мандаты 8e, 8k)**:
    - 1-клик печать пакета чистых бланков А4 со строками `____________________` (`printBlankConsentPackage`) для ручного заполнения и подписания пациентом на ресепшене до осмотра без 403 Forbidden.
    - 1-клик печать заполненного пакета бланков А4 (`printFilledConsentPackage`) с типографикой полиграфического качества.
    - Пакетное подписание всех ИДС визита в 1 клик (`signPackageConsents`, `InformedConsentModal.tsx`) без закрытия окон и без модального ада (Закон Анти-Матрёшки).
- **Статус**:
  - Фронтенд / Логика: `apps/web/src/components/consents/InformedConsentModal.tsx`, `apps/web/src/components/consents/consentTemplates.ts`, `apps/web/src/components/consents/informedConsent.css` (коммиты `7c359a562`, `6ea1b22f9`, `175b1a12e`).
  - Тесты: `apps/web/src/components/consents/__tests__/informedConsentPackageSigning.test.ts` (100% passing).

---

## 55. `финансы_касса::54_фз_без_инн_физлиц_1_клик_комбинированная_оплата_и_автономия_скидок` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8n & 54-ФЗ)
- **Идея**: Устранение бюрократических палок в колёса кассиру, администратору и соло-врачу при фискализации 54-ФЗ:
  1. *Отмена требования ИНН с физических лиц*: по закону 54-ФЗ ИНН покупателя (тег 1228) требуется только для юридических лиц (10 цифр) и индивидуальных предпринимателей (12 цифр). Для физических лиц валидация ИНН строго опциональна (`validateBuyerInn54Fz`, `validate54FzBuyerInn`) — касса пробивает чек наличными, картой или СБП без блокировок.
  2. *1-клик комбинированные пресеты оплаты*: моментальный расчет сдачи (`calculateCashChange`), 1-клик пресет «Без сдачи» (нал 100%, сдача 0 ₽, `createExactCashTenders`), «Карта 100%» (`createFullCardTenders`), «Зачесть аванс + остаток картой» (`createDepositAndCardComboTenders`), быстрое распределение остатка (`allocateRemainderToTender`) без ручного ввода копеек и рассинхронов.
  3. *Автономия скидок врача (Мандат 8e п. 7)*: 100% скидки на гарантийные переделки и лечение персонала/коллег (`process100PercentDiscountCheckout`) закрывают визит в 1 клик (0 ₽) с обходом физической фискализации нулевых чеков и без ввода мастер-паролей управляющего.
- **Статус**:
  - Фронтенд / Логика: `apps/web/src/components/finance/PaymentModal.tsx`, `PaymentProcessingModal.tsx`, `cashboxOperations.ts` (коммит `ba8c60802`).
  - Тесты: `apps/web/src/components/finance/__tests__/cashierAutonomy54Fz.test.ts` (14 сценариев, 324 строки тестов, 100% passing).

---

## 56. `расписание::опциональный_ассистент_при_создании_записи_для_соло_врача` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e п. 8, 8n)
- **Идея**: Снятие искусственных барьеров в расписании для соло-врачей на аренде кресла и небольших клиник (1–3 кресла). Категорически запрещено требовать обязательного выбора ассистента (`assistantUserId`) при создании записи. Запись создается за 5 секунд: Пациент + Время + Кресло. Поле ассистента нормализуется в `null` / пустую строку без ошибок валидации в `AppointmentModal.tsx`, `NewAppointmentForm.tsx`, `QuickBookingDrawer.tsx`.
- **Статус**:
  - Фронтенд: `apps/web/src/components/schedule/AppointmentModal.tsx`, `NewAppointmentForm.tsx`, `QuickBookingDrawer.tsx` (коммиты `ba8c60802`, `6ea1b22f9`).
  - Тесты: `apps/web/src/components/finance/__tests__/cashierAutonomy54Fz.test.ts` (блок тестов `Registratura & Schedule Assistant Autonomy (Mandates 8e Item 8 & 8n)`, 100% passing).

---

## 57. `рентгенология_rvg::1_клик_протоколы_нормы_и_патологии_для_043у_и_молниеносный_визиограф` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e п. 11, 8i, 8k)
- **Идея**: Цифровой рентген-кабинет и радиовизиография (RVG) без трения и задержек:
  1. *4 канонических стандарта рентген-протокола*: (1) «Рентген-норма» (периапикальные ткани интактны, кортикальная пластинка без деструкции, периодонтальная щель равномерная), (2) «Периодонтит (периапикальный очаг)» (деструкция костной ткани у верхушки корня с нечеткими контурами), (3) «Контроль обтурации каналов» (канал запломбирован плотно гомогенно до физиологического апекса без выведения материала), (4) «Маргинальная резорбция кости (пародонтит)» (горизонтальная/вертикальная резорбция межальвеолярных перегородок).
  2. *1-клик вставка в дневник Формы 043/у*: мгновенное добавление через кастомное событие `dente-apply-soap-protocol`, обновление `useVisitStore` и буфер обмена (`applyRadiologyProtocolToForm043`).
  3. *Молниеносный просмотр визиографа*: снимок открывается <50мс в полном разрешении датчика. Полный запрет на автоматические 45-секундные зависания на нейросети. ИИ запускается строго по отдельной кнопке врача, без несанкционированной перезаписи зубной формулы роботом.
- **Статус**:
  - Фронтенд / Логика: `apps/web/src/components/radiology/radiologyProtocols.ts`, `RadiologyViewerModal.tsx`, `apps/web/src/components/imaging/DicomViewerModal.tsx` (коммиты `b26f06059`, `6ea1b22f9`).
  - Тесты: `apps/web/src/components/radiology/__tests__/radiologyViewerProtocols.test.ts` (198 строк тестов 1-клик протоколов и Form 043/u связок, 100% passing).

---

## 58. `зтл_ортопедия::ликвидация_окклюзионного_exocad_блоата_и_себестоимости_из_наряда_врача` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8i, 8k, 8e, 8d)
- **Идея**: Очистка наряда ЗТЛ ортопеда от академического оверинжиниринга и чужеродного функционала зуботехнических CAM-станков:
  1. *Снос окклюзионного Exocad-блоата*: из кодовой базы полностью удален компонент `DentalLabOcclusionTab.tsx` (220 строк), а также аккордеон микро-параметров фрезера (схемы окклюзии Доусона, микроны цементного зазора 10–100 мкм, плотность контактов, перикиматы), скопированные из лабораторных CAM-станков (Exocad/3Shape). Врач фиксирует анатомию, цвет VITA и клинические сроки, а не настраивает фрезерный станок ЗТЛ.
  2. *Лаконичная структура наряда*: ровно 5 рабочих вкладок в `DentalLabOrderModal.tsx` (1. Зубы и Конструкция, 2. Расцветка VITA, 3. Этапы и Сроки, 4. Себестоимость, 5. Бланк ГОСТ). Врач избавлен от навязчивого отображения внутренней себестоимости лаборатории в печатном бланке пациента (`DentalLabPrintBlank.tsx`).
  3. *Соблюдение Греха № 7 и HIG*: удалены все сырые эмодзи (⬆️, ⬇️, 🔄, ⚡) из нарядов ЗТЛ и протоколов ортодонтии (`OrthodonticVisitProtocolWidget.tsx`, `DentalLabRestorationTab.tsx`) с заменой на векторные иконки Lucide (`ArrowUp`, `ArrowDown`, `RefreshCw`, `Sparkles`).
- **Статус**:
  - Фронтенд: `apps/web/src/components/lab/DentalLabOrderModal.tsx`, `DentalLabRestorationTab.tsx`, `DentalLabPrintBlank.tsx`, `OrthodonticVisitProtocolWidget.tsx`, удален `DentalLabOcclusionTab.tsx` (коммиты `b26f06059`, `195a26365`, `e537a7112`, `6ea1b22f9`).
  - Тесты: `apps/web/src/components/lab/__tests__/DentalLabOrderModal.test.tsx` (31 сценарий тестов, 100% passing).

---

## 59. `ui_hig::декомпозиция_вложенных_модальных_окон_и_ликвидация_эмодзи_по_мандату_8d` [РЕАЛИЗОВАНО] -> POLISH (МАНДАТЫ 8d, 8e, 8m)
- **Идея**: Архитектурная инквизиция интерфейса Red Team по 7 смертным грехам UI:
  1. *Закон Анти-Матрёшки (глубина модалок строго 1)*: развязаны вложенные модальные окна в `InformedConsentModal.tsx` (предпросмотр бланка и выбор пакета), `RadiologyViewerModal.tsx` (протоколы рентгена встроены в тулбар без модальных барьеров), `AppointmentModal.tsx` (декомпозиция вложенных форм).
  2. *Грех № 7 (ноль мультяшных эмодзи в документах и интерфейсе)*: тотальная зачистка остаточных эмодзи из кнопок и тостов с заменой на векторные иконки Lucide.
  3. *Строгий typecheck gate*: исправление импортов и сигнатур коротких заголовков в `InformedConsentModal.tsx` и тестах пакетов согласий.
- **Статус**:
  - Фронтенд: `apps/web/src/components/consents/InformedConsentModal.tsx`, `RadiologyViewerModal.tsx`, `AppointmentModal.tsx`, `NewAppointmentForm.tsx`, `QuickBookingDrawer.tsx` (коммиты `6ea1b22f9`, `175b1a12e`).
  - Проверки: `npm run typecheck -w @dental/web` (Exit Code 0), `npm run check:encoding` (0 ошибок).

---

## 60. `зтл_ортопедия::окончательное_отвязывание_себестоимости_и_4_шаговый_наряд_у_кресла` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8i, 8k, 8n)
- **Идея**: Полное отвязывание финансовой себестоимости и CAM-микропараметров от клинического наряда ортопеда у стоматологического кресла:
  1. *4 канонических клинических шага у кресла*: вместо перегруженных 5–6 вкладок наряд врача в `DentalLabOrderModal.tsx` редуцирован строго до 4 клинических шагов: (1) «Зубы и Конструкция», (2) «Расцветка VITA и Культя», (3) «Этапы ЗТЛ и Примерки», (4) «Бланк наряда (ГОСТ) и QR». Вкладка себестоимости (`pricing`) вынесена из наряда врача в лабораторный бэк-офис ЗТЛ.
  2. *Снос остаточного Exocad-блоата из `DentalLabRestorationTab.tsx`*: удалены лабораторные микро-ползунки цементного зазора (10–100 мкм), концепции окклюзии Доусона и плотности контактов.
  3. *Естественная анатомия и привычная окклюзия*: в печатном бланке ГОСТ (`DentalLabPrintBlank.tsx`) зафиксированы канонические клинические стандарты: «В привычной окклюзии (по силиконовому регистрату / шаблону)» и «Естественная анатомическая форма, физиологический контакт».
- **Статус**:
  - Фронтенд: `apps/web/src/components/lab/DentalLabOrderModal.tsx`, `DentalLabPrintBlank.tsx`, `DentalLabRestorationTab.tsx` (коммит `93e7b9884`).
  - Тесты: `apps/web/src/components/lab/__tests__/DentalLabOrderModal.test.tsx` (тестовый блок `Chairside Clinical Order Architecture (Mandates 8e, 8i, 8k, 8n)`, 100% passing).

---

## 61. `склад::мягкий_овердрафт_при_проведении_акта_оказанных_услуг` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e п. 10, 8n п. 2)
- **Идея**: Недопущение остановки клинического процесса и расчёта на ресепшене из-за задержек складского учёта:
  1. *Снятие блокировки кнопки проведения акта*: в `TreatmentPlanCompletedActPrint.tsx` снят блокирующий атрибут `disabled={isExecuting || hasDeficit}`. При дефиците остатков кнопка трансформируется в «Провести списание (Мягкий овердрафт склада)» с предупреждающим бейджем вместо блокировки действий администратора.
  2. *Мягкий овердрафт во всех списаниях*: унифицированы предупреждения об аварийном списании в минус в `ProcedureMaterialDeductionModal.tsx` и `ClinicalWriteoffModal.tsx`.
  3. *Соло-врач и небольшая клиника*: врач или администратор не блокируются при не оприходованной вовремя накладной поставщика; операция фиксируется в аудит с флагом `emergency_overdraft`.
- **Статус**:
  - Бэкенд: `apps/api/src/services/treatmentConsumablesService.ts`, миграция `0198_stock_warehouses_fefo_batches_and_bom.sql`.
  - Фронтенд: `apps/web/src/components/treatment-plans/TreatmentPlanCompletedActPrint.tsx`, `ProcedureMaterialDeductionModal.tsx`, `ClinicalWriteoffModal.tsx`, `NurseCarpuleDisposalModal.tsx` (коммит `fd9fd00a2`).
  - Тесты: `apps/web/src/components/treatment-plans/__tests__/softWarehouseOverdraft.test.ts` (5 тестов soft overdraft, 100% passing).

---

## 62. `фотопротокол::снос_псевдонаучной_пипетки_vita_rgb_и_dsd_оверлеев` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8i, 8k)
- **Идея**: Ликвидация псевдонаучного академического оверинжиниринга в стоматологическом фотопротоколе:
  1. *Ликвидация sRGB-пипетки*: полностью удалена функция `findClosestVitaShade`, пытавшаяся процедурно вычислять оттенок зуба по пикселям сжатого JPEG со смартфона, что давало клинически недостоверные галлюцинации оттенков из-за разницы освещения и баланса белого.
  2. *Физические эталоны VITA для врача и ЗТЛ*: интеграция стандартизированных шкал VITA Classical (16 стандартных + 4 Bleach BL1..BL4) и VITA 3D-Master (29 образцов) с точным расчётом $\Delta E_{00}$ (CIEDE2000) и $\Delta E_{76}$ между физическими эталонами для оценки динамики отбеливания.
  3. *Очистка оверлеев от DSD-кривых*: в `IncisalAlignmentGuideOverlay.tsx` удалены золотые сечения и декоративные кривые лица. Оставлены 4 строгих клинических ортопедических ориентира: бипупиллярная линия, крен резцовой линии, лицевая средняя линия и правило третей лица. Интерактивный split-вайпер с поддержкой колеса мыши и клавиатуры.
- **Статус**:
  - Фронтенд / Математика: `apps/web/src/components/photography/photoProtocolMath.ts`, `IncisalAlignmentGuideOverlay.tsx`, `PhotoCalibrationDrawer.tsx`, `BeforeAfterComparisonView.tsx` (коммит `4eccacca8`).
  - Тесты: `apps/web/src/components/photography/__tests__/photoProtocolSanity.test.ts` (10 тестов), `apps/web/src/tests/photoProtocol.test.ts`, `photoProtocolAdvanced.test.ts` (100% passing).

---

## 63. `пародонтология::экспресс_скрининг_psr_в_1_клик_пресеты_нормы_и_ликвидация_клавиатурного_тренажера` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k)
- **Идея**: Пародонтология без бюрократического террора и без принудительного процедурного симулятора ручного замера 192 точек карманов:
  1. *1-клик пресеты нормы и патологии*: кнопки «Норма пародонта» (глубина карманов 1–2 мм, кровоточивость 0%, CAL 0, PSR 0), «Гингивит» (глубина 2–3 мм, кровоточивость, камень, PSR 2), «Пародонтит ср. ст.» (глубина 5 мм, рецессия 1 мм, фуркация I, PSR 3*).
  2. *Посекстантный экспресс-скрининг PSR*: разметка 6 секстантов челюстей (S1..S6) по кодам ВОЗ 0..4 с символом `*` (патологическая подвижность, вовлечение фуркаций, рецессия $\ge 3.5$ мм) без необходимости заполнять полную периодонтограмму Florida Probe на рутинном приёме.
  3. *Ликвидация клавиатурного тренажера*: перехват Numpad-клавиатуры отключен по умолчанию (`perio-probe-keyboard-toggle`), контейнер не перехватывает фокус (`tabIndex="-1"`), предотвращая паразитный захват клавиатуры у врача. Глубокий ввод Florida Probe изолирован в опциональный Tier 3. Автоматическая генерация текста протокола для Формы 043/у по МКБ-10 (K05.0, K05.1, K05.3).
- **Статус**:
  - Фронтенд / Математика: `apps/web/src/components/perio/PeriodontogramChart.tsx`, `perioMath.ts`, `index.ts` (коммит `7475c0351`).
  - Тесты: `apps/web/src/components/perio/__tests__/periodontalQuickScreening.test.ts` (14 тестов экспресс-скрининга и пресетов, 100% passing).

---

## 64. `клиника::автономия_подписания_043у_врачами_специалистами_обобщенный_мкб10_и_соло_кресло` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8i, 8n)
- **Идея**: Полное устранение искусственных барьеров в медицинской информационной системе частной клиники:
  1. *Автономия врачей всех стоматологических специальностей*: функция `isDoctorOrClinicalSigner` в API дневников 043/у разрешает подписание, фиксацию замка (`lock`) и внесение исправлений («Исправленному верить») не только ролям `doctor`/`admin`, но и всем врачам-специалистам (`therapist`, `surgeon`, `orthopedist`, `orthodontist`, `periodontist`, `implantologist`, `hygienist`, `radiologist`, `cmo`, `chief_doctor`, `head_doctor`, `owner`) без 403 Forbidden.
  2. *Снятие блокировки ввода при загрузке*: в `VisitDiarySection.tsx` удален флаг `diaryUnread`, блокировавший поля ввода дневника и кнопку сохранения черновика во время сетевых запросов. Врач сразу пишет текст приёма с локальным debounced autosave.
  3. *Обобщенный МКБ-10 пародонта (K05)*: в `Icd10ClinicalValidator.ts` рубрика K05 исключена из списка строго зубоспецифичных диагнозов (`TOOTH_SPECIFIC_RUBRICS`), так как болезни пародонта (гингивит, генерализованный пародонтит) поражают секстанты или всю челюсть, поэтому номер зуба FDI сделан опциональным.
  4. *Zero Dead-Ends для соло-врача на субаренде*: в `apps/api/src/routes/visits.ts` добавлена автоинициализация сущностей клиники («Основная клиника») и рабочего места («Кресло 1») при первом визите, исключая фатальные ошибки 404/500 при старте работы соло-врача.
  5. *Ликвидация стационарного термина «Госпитализация»*: в `DocumentQuickRoleScenarios.tsx` карточка сценариев переименована в «СанПиН, ЭЛН и Экспертиза» в строгом соответствии со стоматологическим суверенитетом (Мандат 8i).
- **Статус**:
  - Бэкенд: `apps/api/src/routes/diary.ts`, `apps/api/src/routes/visits.ts`, `apps/api/src/services/clinical/Icd10ClinicalValidator.ts` (коммит `d1d06b473`).
  - Фронтенд: `apps/web/src/components/visit/VisitDiarySection.tsx`, `apps/web/src/components/documents/DocumentQuickRoleScenarios.tsx` (коммит `d1d06b473`).
  - Тесты: `apps/api/src/routes/__tests__/diaryClinicalRoles.test.ts`, `apps/api/src/services/clinical/Icd10ClinicalValidator.test.ts` (100% passing).

---

## 65. `зтл_ортопедия::автономия_аванса_без_модалок_6_конструкций_и_20_оттенков_vita` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8d, 8e, 8i, 8n)
- **Идея**: Полное устранение искусственных барьеров в зуботехнических нарядах и декомпозиция интерфейса до глубины 1:
  1. *Автономия врача при авансе < 50%*: модалка запроса начмеда `DentalLabFinancialGate` размонтирована из `DentalLabOrderModal.tsx`. При авансе пациента менее 50% система автоматически формирует и фиксирует клинический оверрайд врача (`createDoctorClinicalOverride`) как решение лечащего врача под Мандат 8e без блокировок и без модалок поверх модалок.
  2. *6 канонических конструкций + PMMA*: экспресс-селектор вкладок и коронок расширен до 6 клинических типов (ZrO2 диоксид циркония, PFM металлокерамика, e.max прессованная керамика, E.max винир, Clasp бюгельный протез, Ti-Base коронка на имплантате) плюс фрезерованная временная PMMA.
  3. *20 оттенков VITA в 1 клик*: селектор оттенков VITA расширен до 20 образцов (16 классических A1..D4 + 4 ультрасветлых Bleach BL1..BL4).
  4. *Ликвидация 30-дневного блока плана*: в `dentalLabFinancialGateEngine.ts` срок давности плана переведен в мягкое информационное подтверждение соответствия Мандату 8e и никогда не блокирует наряды.
- **Статус**:
  - Фронтенд: `apps/web/src/components/lab/DentalLabOrderModal.tsx`, `DentalLabRestorationTab.tsx`, `LabTrackingDrawer.tsx`, `dentalLabFinancialGateEngine.ts` (коммит `6c41ee42d`).
  - Тесты: `apps/web/src/components/lab/__tests__/DentalLabOrderModal.test.tsx` (тесты автономии врача при авансе <50%, 100% passing).

---

## 66. `стерилизация::санпин_мягкий_допуск_по_экстренным_показаниям_и_авторегистрация` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8i, 8n)
- **Идея**: Устранение системных тупиков (Zero Dead-Ends) при сканировании и привязке крафт-пакетов стерилизации:
  1. *Автоматическая регистрация незаведенных штрихкодов*: в `apps/api/src/routes/sterilization.ts` при сканировании лотка, которого ещё нет в базе, сервер не выбивает ошибку 400 Bad Request, а автоматически создает запись в `sterilizationLogs` (`buildAutoProvisionSterilizationLogValues`: Автоклав primary, класс B, 134°C / 2.1 bar, крафт-пакет, 5 класс индикатора, годен 30 дней) под ID текущего врача и бесшовно завершает привязку к визиту.
  2. *Мягкий допуск по экстренным показаниям (СанПиН 3.3686-21 п. 3632)*: функция `evaluateSterilizationLogForLinking` блокирует только реальный брак (`status != passed`). Если срок стерильности истек, но врач принимает экстренного CITO-пациента с острой болью, система разрешает мягкий допуск под личную ответственность врача с автоматической записью в дневник 043/у (`applyEmergencySterilizationToDiaryTreatment`).
- **Статус**:
  - Бэкенд: `apps/api/src/routes/sterilization.ts` (коммиты `6c41ee42d`, `719b7beac`).
  - Тесты: `apps/api/src/routes/__tests__/sterilizationLinkAutonomy.test.ts` (100% passing).

---

## 67. `рентген_визиограф::мгновенное_открытие_без_ии_зависаний_и_тач_таргеты_44px` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8d, 8e п. 11, 8n)
- **Идея**: Молниеносный цифровой рентген у кресла врача:
  1. *Снимок визиографа <50мс*: в `VisiographAnalyzer.tsx` и `VisiographStudioCanvas.tsx` снимок открывается мгновенно в нативном разрешении сенсора без принудительной 45-секундной предобработки нейросетью.
  2. *ИИ только по кнопке врача*: автоматический фоновый запуск нейросети заблокирован; анализ запускается строго по явному клику («Анализ ИИ»), а находки носят рекомендательный характер и не перезаписывают зубную формулу без ведома врача.
  3. *Сенсорные тач-таргеты $\ge 44\text{px}$*: все кнопки инструментов просмотра (инверсия, фильтры, контраст, поворот, калибровка) увеличены до сенсорного стандарта для комфортной работы врача у кресла в перчатках по Apple Studio HIG.
- **Статус**:
  - Фронтенд: `apps/web/src/components/imaging/VisiographAnalyzer.tsx`, `apps/web/src/components/visiograph/VisiographStudioCanvas.tsx` (коммит `6c41ee42d`).

---

## 68. `эмк_043у::мультисобытийный_autosave_при_pagehide_blur_звонках_и_очистка_эмодзи` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8d, 8e п. 6, 8i)
- **Идея**: Защита от потери данных врача и полиграфическая чистота медицинской документации:
  1. *Мультисобытийный flush autosave*: компонент `DebouncedEmkTextarea` в `VisitEmkTab.tsx` сохраняет текст приёма не только по таймеру debounce (500мс), но и принудительно сбрасывает буфер на сервер при потере фокуса (`blur`), закрытии/смене вкладки браузера (`pagehide`, `visibilitychange`), а также при входящем телефонном звонке через подписку на `useTelephonyStore`. Врач никогда не теряет набранный текст визита.
  2. *Полная зачистка эмодзи из документов*: медицинские направления на рентген (`referralPresets.ts`, `RadiologyReferralModal.tsx`) и журнал аспирационных проб (`AnesthesiaAspirationJournalModal.tsx`) полностью очищены от мультяшных эмодзи (Грех № 7) с заменой на векторные иконки Lucide (`FileText`, `Sparkles`, `ShieldCheck`).
- **Статус**:
  - Фронтенд: `apps/web/src/components/visit/VisitEmkTab.tsx`, `EmkControlBoard.tsx`, `referralPresets.ts`, `RadiologyReferralModal.tsx`, `AnesthesiaAspirationJournalModal.tsx` (коммит `6c41ee42d`).

---

## 69. `ортодонтия::1_клик_протокол_энгль_дуги_niti_сталь_и_винт_в_дневник_043у` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8i, 8k, 8n)
- **Идея**: Быстрое ортодонтическое протоколирование без академического оверинжиниринга:
  1. *1-клик классификация по Энглю*: экспресс-панель фиксации класса смыкания (Класс I, Класс II/1, Класс II/2, Класс III) в `OrthodonticVisitProtocolWidget.tsx` и `OrthodonticStudioModal.tsx`.
  2. *Селекторы рабочих дуг*: быстрый выбор рабочих дуг (круглые NiTi .014/.016, прямоугольные стальные SS .019x.025, TMA) для верхней и нижней челюстей.
  3. *Контроль расширяющего винта*: фиксация активации винта ортодонтической пластинки (шаг 1/4 оборота, 0.25 мм).
  4. *Генерация дневника 043/у*: мгновенная сборка лаконичного объективного статуса и конкатенация в дневник SOAP Формы 043/у.
- **Статус**:
  - Фронтенд / Shared: `apps/web/src/components/orthodontics/OrthodonticVisitProtocolWidget.tsx`, `OrthodonticStudioModal.tsx`, `packages/shared/src/orthodontics/orthoEngine.ts`, `types.ts` (коммиты `6c41ee42d`, `719b7beac`).
  - Тесты: `apps/web/src/components/orthodontics/__tests__/OrthodonticVisitProtocolWidget.test.tsx` (100% passing).

---

## 70. `регистратура::1_клик_печать_бланка_договора_с_прочерками_без_403_и_опциональный_ассистент` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e п. 8, 8n)
- **Идея**: Регистратура без палок в колёса для соло-врача и администратора:
  1. *1-клик печать бланка договора со строками `_______`*: в тулбар расписания (`ScheduleFilterStrip.tsx`) и меню слота записи (`AppointmentCard.tsx`) добавлена кнопка быстрой печати типового договора на оказание стоматологических услуг с прочерками для ручного заполнения паспортных данных пациента до начала осмотра без 403 Forbidden (`printBlankMedicalContract`).
  2. *Создание записи без ассистента*: поле `assistantUserId` сделано строго опциональным (`null` без ошибок валидации), запись создается за 5 секунд (пациент + время + кресло).
  3. *Гигиена слотов расписания*: типографика периодов времени в `BookingSlotPicker.tsx` очищена от смайликов по Греху № 7.
- **Статус**:
  - Фронтенд: `apps/web/src/components/schedule/AppointmentCard.tsx`, `ScheduleFilterStrip.tsx`, `BookingSlotPicker.tsx`, `AppointmentModal.tsx`, `NewAppointmentForm.tsx`, `blankContractPrint.ts` (коммиты `d8e9357e6`, `ba8c60802`, `6ea1b22f9`).

---

## 71. `склад::мягкий_овердрафт_анестетиков_и_клинических_расходников` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e п. 10, 8n п. 2)
- **Идея**: Устранение блокировок лечения при задержках складского учета материалов:
  1. *Автоматический овердрафт при клинических операциях*: в маршруте `/api/inventory/stock-movements` включено автоматическое разрешение овердрафта (`isClinicalOperation`), если списание относится к анестетикам (ультракаин, септодонт, септанест, скандонест, убистезин, артикаин, мепивакаин) или клиническим расходникам (перчатки, маски, иглы, валики, слюноотсосы).
  2. *Мягкое предупреждение вместо ошибки*: система фиксирует отрицательный остаток партии и предупреждение в аудите, но не препятствует анестезии и лечению пациента.
- **Статус**:
  - Бэкенд: `apps/api/src/routes/inventory.ts`, `apps/api/src/services/treatmentConsumablesService.ts` (коммит `0eb817657`).
  - Тесты: `apps/api/src/services/treatmentConsumablesService.test.ts` (проверка мягкого овердрафта анестетика Убистезин, 100% passing).

---

## 72. `эндодонтия::1_клик_протоколы_043у_fdi_длины_и_привязка_линейки_визиографа` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8d, 8e, 8i, 8k, 8n)
- **Идея**: Устранение трения и процедурных симуляторов при лечении корневых каналов:
  1. *4 канонических клинических протокола эндо*: (1) первичное эндо (ProTaper Gold SX..F2, 3% NaOCl + 17% EDTA с УЗ-активацией, Metapex/Calcept), (2) ретритмент/перелечивание (распломбировка D-RaCe, ревизия устьев, Ca(OH)2), (3) постоянная обтурация гуттаперчей методом латеральной/вертикальной компакции с силером AH Plus, (4) экспресс-обтурация до физиологического апекса по апекслокатору Apex 0.0 и контрольной RVG.
  2. *Анатомические длины каналов FDI*: встроенный анатомический справочник рабочих длин корневых каналов для постоянных (11..48) и временных молочных (51..85) зубов.
  3. *Интеграция эндо-линейки визиографа*: шина событий `dente-endo-wl-measured` связывает интерактивный замер рабочей длины на снимке RVG с дневником приёма 043/у без ручного перебивания цифр.
  4. *Chairside-виджет 30-секундного эндо*: лаконичная панель у кресла врача со строгими векторными иконками Lucide без мультяшных эмодзи (Грех № 7).
- **Статус**:
  - Движок Shared: `packages/shared/src/clinical/endoProtocolEngine.ts`
  - Фронтенд: `apps/web/src/components/visit/endo/VisitEndoProtocolWidget.tsx`, `apps/web/src/components/endo/EndoCanalLogModal.tsx`, `apps/web/src/components/endo/EndoQuickProtocolsBar.tsx`, `apps/web/src/components/imaging/VisiographAnalyzer.tsx`, `apps/web/src/components/visiograph/VisiographStudioCanvas.tsx` (коммит `5c39b86a0`).
  - Тесты: `packages/shared/src/clinical/endoProtocolEngine.test.ts`, `apps/web/src/components/visit/endo/__tests__/VisitEndoProtocolWidget.test.tsx` (100% passing).

---

## 73. `пародонтология_гигиена::1_клик_комплексная_профгигиена_а1607051_и_норма_пародонта` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8d, 8e, 8k, 8n)
- **Идея**: Ликвидация академического трения и процедурного ввода 192 точек карманов:
  1. *1-клик норма пародонта*: пресет («Соматически здоров / глубина карманов 1-2 мм, кровоточивость 0%, CAL 0, PSR 0») в `PeriodontogramChart.tsx`.
  2. *1-клик комплексная профгигиена*: протокол комплексной гигиены (УЗ скейлинг + Air-Flow глицин + полировка пастой Kerr Cleanic + глубокое фторирование Fluocal гель) с автоинъекцией в дневник Формы 043/у и автоматическим добавлением услуги номенклатуры A16.07.051 в смету визита.
  3. *Чистота интерфейса*: замена сырых эмодзи и глифов на строгие векторные иконки Lucide (`Sparkles`, `Activity`, `CheckCircle2`).
- **Статус**:
  - Shared: `packages/shared/src/perio/hygieneIndices.ts`
  - Фронтенд: `apps/web/src/components/hygiene/HygieneIndicesPanel.tsx`, `apps/web/src/components/perio/PeriodontogramChart.tsx`, `apps/web/src/components/perio/perioMath.ts` (коммит `5c39b86a0`).

---

## 74. `хирургия_имплантация::1_клик_списание_карпула_игла_протоколы_удаления_и_имплантации` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k, 8n & ZERO DEAD-ENDS)
- **Идея**: Хирургический протокол и материальный учет без бюрократических остановок:
  1. *1-клик комплект списания*: технологическая карта списания инъекционной анестезии (1 карпула артикаина 1.7 мл + 1 карпульная игла 30G).
  2. *Мягкий овердрафт склада*: списание хирургических расходников и анестетиков в минус с предупреждением в аудит, исключающее срыв операции из-за задержек накладных.
  3. *1-клик протоколы хирургии и имплантации*: генерация протоколов простого/сложного удаления зуба и имплантации (Osstem TS III, Dentium SuperLine, Straumann SLA) в дневник Формы 043/у.
- **Статус**:
  - Фронтенд / Shared: `apps/web/src/components/inventory/writeoff/clinicalWriteoffPresets.ts`, `clinicalWriteoffEngine.ts`, `apps/web/src/components/visit/surgery/VisitSurgeryProtocolTab.tsx`, `SurgeryVisitCockpit.tsx`, `apps/web/src/components/implants/ImplantPassportModal.tsx` (коммит `5c39b86a0`).
  - Тесты: `apps/web/src/components/inventory/__tests__/clinical804nWriteoff.test.ts` (100% passing).

---

## 75. `детская_стоматология::молочный_ряд_fdi_51_85_4_протокола_и_шкала_франкла` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8d, 8e, 8i, 8k, 8n)
- **Идея**: Полноценный амбулаторный детский стоматологический приём у кресла:
  1. *Молочный ряд FDI 51..85 в 1 клик*: быстрое переключение зубной формулы на молочный прикус с авто-нумерацией.
  2. *4 канонических детских протокола*: (1) адаптационный приём (знакомство со щёткой), (2) лечение кариеса молочного зуба (Twinky Star / Fuji IX), (3) витальная пульпотомия (Pulpotec / NuSmile), (4) глубокое фторирование (Сафорайд / Saforide 38%).
  3. *Шкала Франкла в 1 клик*: экспресс-фиксация поведенческой реакции ребенка (`++`, `+`, `-`, `--`) без лишней писанины.
- **Статус**:
  - Shared: `packages/shared/src/emr/emrProtocolPresets.ts`
  - Фронтенд: `apps/web/src/components/visit/clinicalSoapPresets.ts`, `apps/web/src/components/VisitDiaryTemplateSelector.tsx` (коммит `5c39b86a0`).

---

## 76. `планы_лечения::мобильный_segmented_control_скрытие_расходников_500р_и_скидки_врача` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8d, 8e, 8n)
- **Идея**: Презентация планов лечения без скролл-туннелей и лишних барьеров:
  1. *Segmented Control на мобильных screens <= 640px*: переключение тарифов `[ Эконом | ★ Оптимум | Премиум ]` на одном экране вместо вертикальной простыни в 2500px.
  2. *Авто-скрытие расходников <= 500 ₽*: фильтрация копеечных позиций из презентации пациенту, чтобы не загромождать смету.
  3. *Быстрая панель скидок врача (0–100%)*: врач применяет скидку на гарантию или персонал без запроса паролей администратора; снятие блокировок с 30-дневных планов.
- **Статус**:
  - Фронтенд: `apps/web/src/components/treatment-plans/TreatmentPlan3TierComparison.tsx`, `TreatmentPlanPresenterModal.tsx`, `treatmentPlans.css`, `TreatmentPlanStageCard.tsx`, `apps/web/src/components/lab/DentalLabOrderModal.tsx` (коммит `5c39b86a0`).

---

## 77. `анамнез_телефония::1_клик_соматическая_норма_без_госпитальных_опросников_и_иммунитет_врача` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8i, 8n)
- **Идея**: Разделение врачебной зоны внимания и защита от информационной свалки:
  1. *1-клик соматическая норма*: кнопка «Соматически здоров / норма» заполняет анамнез без 50-пунктовых госпитальных опросников.
  2. *Иммунитет экрана врача от звонков АТС*: на экране `VisitView` исключены всплывающие окна звонков телефонии во время приёма пациента.
  3. *Неблокирующий баннер на ресепшене*: входящие звонки оформлены в виде компактной верхней капсулы, не парализующей работу администратора.
- **Статус**:
  - Фронтенд: `apps/web/src/components/patient/PatientAnamnesisModal.tsx`, `PatientAllergySafetyBanner.tsx`, `safetyBanner.css`, `safetyMath.ts` (коммит `5c39b86a0`).

---

## 78. `склад_расходники::мягкий_овердрафт_технологические_карты_и_списание_карпул_медсестрой` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e п. 10, 8n)
- **Идея**: Бесперебойное снабжение процедурных кабинетов и списание материалов:
  1. *Мягкий овердрафт склада*: отрицательный остаток при клинических процедурах с предупреждением вместо прерывания лечения.
  2. *1-клик технологические карты*: пакетное списание терапевтических и хирургических наборов.
  3. *Единоличное списание карпул медсестрой*: утилизация пустых ампул анестетиков в 1 клик по СанПиН 3.3686-21 без созыва комиссий.
- **Статус**:
  - Бэкенд и Shared: `apps/api/src/routes/treatmentConsumables.ts`, `apps/api/src/services/treatmentConsumablesService.ts`, `packages/shared/src/inventory/consumables.ts` (`deductBatchStockWithSoftOverdraft`), `packages/shared/src/mdlp/nurseDisposalAct.ts` (дефолтная автономия медсестры без комиссии)
  - Фронтенд: `apps/web/src/components/InventoryView.tsx`, `useInventoryLogic.ts`, `NurseCarpuleDisposalModal.tsx`, `packages/shared/src/anesthesia/pkuDisposal.ts`, `apps/web/src/components/warehouse/index.ts`
  - Тесты: `apps/web/src/components/inventory/__tests__/clinical804nWriteoff.test.ts`, `nurseCarpuleDisposal.test.ts`, `nurseDisposalAct.test.ts`, `packages/shared/src/tests/inventoryFifoTracking.test.ts` (100% passing).

---

## 79. `стерилизация::авто_создание_черновика_визита_при_привязке_лотка_без_404` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k, 8n & САНПИН 3.3686-21)
- **Идея**: Устранение ошибки 404 при привязке стерильных крафт-пакетов к визиту:
  1. *Авто-инициализация черновика дневника*: если врач ещё не сохранил текст визита в 043/у, сервер автоматически транзакционно создаёт черновик `visitDiaries` с привязкой штрихкода лотка и хэшем.
  2. *Бесшовность по СанПиН 3.3686-21*: исключена ошибка 404 VisitDiaryNotFound, маркировка инструментов лотка проходит мгновенно.
- **Статус**:
  - Бэкенд: `apps/api/src/routes/sterilization.ts` (коммит `5c39b86a0`).

---

## 80. `ортопедия::1_клик_протоколы_препарирования_примерки_фиксации_и_автономия_врача_зтл` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8d, 8e п. 7, 8i, 8k, 8n)
- **Идея**: Устранение бюрократического трения и академического блоата в ортопедическом приёме:
  1. *4 канонических ортопедических протокола в 1 клик*: препарирование под ZrO2/e.max (уступ chamfer 0.5–1.0 мм, нить 00/0, А-силикон/3Shape TRIOS), примерка каркаса (прилегание зондом, контакты флоссом, копирка Bausch 40 мкм), постоянная фиксация (CoJet/Al2O3 50 мкм, Monobond Plus, RelyX U200, рентген-контроль RVG), съёмное протезирование (ЦСЧ, восковые валики, сдача).
  2. *Связка с одонтограммой и сметой*: авто-выставление статуса `Crown`, добавление услуги в Этап 3 плана лечения (`stage_3_orthopedics`).
  3. *Клинический оверрайд врача при авансе < 50%*: направление наряда в лабораторию под личную клиническую ответственность без вызова начмеда и блокирующих диалогов.
- **Статус**:
  - Фронтенд: `apps/web/src/components/orthopedics/orthopedicProtocols.ts`, `OrthopedicsChairsidePanel.tsx`, `apps/web/src/components/VisitDiaryTemplateSelector.tsx`, `apps/web/src/components/lab/LabWorkOrderConstructorModal.tsx` (коммит `4fcaf8c39`).
  - Бэкенд: `apps/api/src/routes/dentalLab.ts`, `apps/api/src/scripts/seedTemplates.ts`.
  - Тесты: `apps/web/src/components/orthopedics/__tests__/orthopedicProtocols.test.ts` (7 pass).

---

## 81. `терапия::1_клик_протоколы_реставраций_кариеса_замены_пломб_и_классификатор_блэка` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8d, 8e, 8i, 8k, 8n)
- **Идея**: Фиксация терапевтического реставрационного приёма за 30 секунд без процедурного симулятора тыканья десятков параметров:
  1. *4 канонических пресета в 1 клик*: кариес эмали/дентина (K02.0, K02.1 / A16.07.002), замена несостоятельной пломбы (K08.8 / A16.07.031 + A16.07.002), клиновидный дефект / эрозия (K03.1, K03.0), фронтальная эстетическая реставрация (11–23, 31–43, силиконовый ключ, стратификация).
  2. *Авто-классификатор Блэка*: расчет классов I–VI по номеру зуба FDI и выбранным поверхностям (`[MOD]`, `[MO]`, `[OD]`, `[O]`, `[V]`, `[C]`).
  3. *Гарантийный расчет СтАР*: авто-индикация гарантийного срока 12–24 мес и срока службы 24–36 мес.
  4. *Chairside-виджет 30-секундной терапии*: мгновенный диспатч SOAP в Форму 043/у (`dente-apply-soap-protocol`) и добавление услуги 804н в смету (`dente-add-services-to-invoice`).
- **Статус**:
  - Shared: `packages/shared/src/clinical/restorationProtocolEngine.ts`, `therapyProtocolEngine.ts`, `packages/shared/src/emr/emrProtocolPresets.ts`.
  - Фронтенд: `apps/web/src/components/visit/therapy/VisitTherapyProtocolWidget.tsx`, `apps/web/src/components/odontogram/ToothRadialMenu.tsx` (коммит `4fcaf8c39`).
  - Тесты: `packages/shared/src/clinical/therapyProtocolEngine.test.ts` (12 pass), `apps/web/src/components/visit/therapy/__tests__/VisitTherapyProtocolWidget.test.tsx` (2 pass).

---

## 82. `финансы::анти_матрёшка_кабинетов_чеков_возвратов_и_ндфл_глубина_1` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТ 8d П. 6 & МАНДАТ 8e)
- **Идея**: Строгое соблюдение закона Анти-Матрёшки в финансовом модуле:
  1. *Ликвидация модалок поверх модалок*: вторичные кабинеты `Fiscal54FzReceiptModal`, `RefundServiceModal`, `TaxDeductionModal` вынесены из DOM-дерева модального окна `PatientBillingModal`.
  2. *Верхнеуровневый рендеринг*: при открытии чека, возврата или справки НДФЛ они отображаются как самостоятельные полноэкранные кабинеты (модальная глубина строго 1), возвращая в акт выполненных работ при закрытии.
- **Статус**:
  - Фронтенд: `apps/web/src/components/finance/PatientBillingModal.tsx` (коммит `4fcaf8c39`).

---

## 83. `гигиена_ui::полная_ликвидация_эмодзи_из_визиографа_стерилизации_и_бланков` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТ 8d П. 7)
- **Идея**: Полное искоренение мультяшных глифов и эмодзи из профессиональных медицинских и аппаратных интерфейсов:
  1. *Радиовизиограф*: фильтры костных балок, эндодонтии и эмали очищены от сырых глифов в пользу векторных Lucide иконок.
  2. *Стерилизация СанПиН 3.3686-21*: кнопки экспресс-вскрытия стандартного смотрового лотка и записи журнала 257/у переведены на чистую медицинскую типографику без эмодзи.
  3. *Анестезия*: кнопки внесения нормы аспирационной пробы и таймера фиксации онемения очищены от глифов в пользу Lucide `<CheckCircle2 />` и `<Zap />`.
  4. *Пакеты услуг*: карточки комплексных пакетов (кариес, эндо, гигиена, хирургия) приведены к стандарту Apple HIG.
- **Статус**:
  - Фронтенд: `apps/web/src/components/visiograph/VisiographWindowPresets.ts`, `apps/web/src/components/visit/CompletedServicesChecklist.tsx`, `apps/web/src/components/sterilization/KraftPackageQuickScanner.tsx`, `apps/web/src/components/sterilization/SterilizationJournalModal.tsx`, `apps/web/src/components/visit/anesthesia/AnesthesiaAspirationJournalModal.tsx`, `apps/web/src/components/visit/anesthesia/AnesthesiaOnsetTimerWidget.tsx` (коммит `4fcaf8c39`).

---

## 84. `педиатрия::chairside_30_секундный_виджет_шкала_франкла_и_протоколы_804н` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8d, 8e, 8i, 8k, 8n)
- **Идея**: Экспресс-приём у детского врача-стоматолога за 30 секунд без многостраничной бюрократии и опросников:
  1. *Канонический chairside-виджет 30-секундного приёма*: `VisitPediatricProtocolWidget.tsx` (тач-таргеты >= 48px, ноль эмодзи — только векторные Lucide).
  2. *Экспресс-селектор шкалы Франкла*: фиксация уровней поведения 1 (--) Определенно негативное, 2 (-) Негативное, 3 (+) Позитивное, 4 (++) Определенно позитивное в 1 клик.
  3. *5 клинических протоколов 804н*: кариес временного зуба (Fuji IX/Twinky Star), витальная пульпотомия (Pulpotec/Biodentine), глубокое фторирование (Сафорайд), герметизация фиссур (Fissurit FX) и удаление молочного зуба при физиологической смене корней.
  4. *Связка с дневником 043/у и сметой*: 1-клик диспатч SOAP в `dente-apply-soap-protocol` и добавление услуг номенклатуры 804н в смету через `dente-add-services-to-invoice`. Вызов памятки родителям `PediatricParentMemoModal` с соблюдением глубины модалок = 1.
- **Статус**:
  - Фронтенд: `apps/web/src/components/pediatric/VisitPediatricProtocolWidget.tsx`, `index.ts` (коммит `510bfa5f4`).
  - Тесты: `apps/web/src/components/pediatric/__tests__/VisitPediatricProtocolWidget.test.tsx` (6 pass).

---

## 85. `диагностика::топ_12_амбулаторных_диагнозов_мкб10_в_1_клик_и_клинические_инварианты` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8d, 8e, 8i, 8k, 8n)
- **Идея**: Устранение академического блоата и сотен страниц госпитального МКБ-10 из рабочего кресла стоматолога:
  1. *1-клик топ-бар ТОП-12 амбулаторных стоматологических диагнозов*: K02.0 (Кариес эмали), K02.1 (Кариес дентина), K04.0 (Пульпит), K04.5 (Хронический апикальный периодонтит), K05.0 (Острый гингивит), K05.1 (Хронический гингивит), K05.3 (Хронический пародонтит), K08.1 (Потеря зубов вследствие удаления), K07.4 (Аномалия прикуса), K01.1 (Ретинированные зубы), K03.1 (Клиновидный дефект), K08.8 (Другие уточненные изменения) в `Icd10ClinicalSelector.tsx`.
  2. *Тач-таргеты >= 44px и неблокирующий выбор*: сенсорные контролы в `DiagnosticDrawer.tsx` и `ToothContextDrawer.css`; неблокирующий выбор зубов и отсутствие блокирующих обязательных полей (Мандат 8e).
- **Статус**:
  - Фронтенд: `apps/web/src/components/diagnostics/Icd10ClinicalSelector.tsx`, `icd10DentalCatalog.ts`, `DiagnosticDrawer.tsx`, `ToothContextDrawer.css` (коммит `bbc75925a`).
  - Тесты: `apps/web/src/components/diagnostics/__tests__/Icd10ClinicalSelector.test.tsx`, `DiagnosticDrawer.test.tsx` (56 pass).

---

## 86. `хирургия_имплантология::sterile_glove_mode_48px_пресеты_топ_систем_и_анти_матрёшка` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8d, 8e, 8i, 8k, 8n)
- **Идея**: Режим работы хирурга у кресла в стерильных перчатках («Sterile Glove Mode») и закон Анти-Матрёшки:
  1. *Тач-таргеты >= 48px/52px*: базовые кнопки `.surgery-btn` и активный стерильный режим в `surgery.css`, кнопки FDI в `SurgeryCockpitModal.tsx`, чек-лист Time-Out в `SurgerySafetyChecklist.tsx`, паспорт имплантата `ImplantPassportModal.tsx`, `ImplantPassportCard.tsx`.
  2. *Закон Анти-Матрёшки (глубина модалок строго 1)*: вызов паспорта имплантата декомпозирован через изолированное состояние верхнего уровня `isPassportOpen` с плавным возвратом в хирургический кокпит.
  3. *1-клик пресеты дентальной имплантации*: Osstem TS III, Dentium SuperLine, Straumann BLX, Nobel Parallel CC. Торк 35 Н/см, ISQ 72, ФДМ/Заглушка (`fdm` / `plug`).
  4. *Мягкий овердрафт склада*: отсутствие имплантата или задержка накладной не блокирует кнопки сохранения и печати протокола (Мандат 8e.10).
- **Статус**:
  - Фронтенд: `apps/web/src/components/surgery/SurgeryCockpitModal.tsx`, `SurgeryProtocolPanel.tsx`, `SurgerySafetyChecklist.tsx`, `surgery.css`, `apps/web/src/components/implants/ImplantPassportModal.tsx`, `ImplantPassportCard.tsx`, `implantQuickPresets.ts` (коммит `b7eb4dda6`).
  - Тесты: `surgeryCockpitModal.test.tsx`, `implantPassport.test.tsx`, `surgeryProtocols.test.ts` (24 pass).

---

## 87. `регистратура_касса::печать_пустого_договора_без_403_и_автономия_кассира_54фз` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8d, 8e п. 8, п. 9, 8n п. 1, 8k)
- **Идея**: Ликвидация бюрократических задержек администратора и полная автономия кассы:
  1. *Запись за 5 секунд*: создание визита без обязательного ассистента (`isSoloDoctor`), без обязательного СНИЛС или паспорта.
  2. *1-клик печать бланка договора со строками `_______`*: печать договора для ручного заполнения паспортных данных пациентом на стойке без ошибок 403 Forbidden.
  3. *Касса 54-ФЗ без палок в колёса*: отмена требования ИНН с физических лиц при оплате картой/наличными; 1-клик комбинированная оплата (нал + карта + аванс/бонусы) с копеечным расчетом сдачи.
- **Статус**:
  - Фронтенд: `apps/web/src/components/patient/PatientAdministrativeForm.tsx`, `apps/web/src/components/schedule/AppointmentCard.tsx`, `AppointmentModal.tsx` (коммит `1976fceb5`).
  - Тесты: `apps/web/src/tests/cashierAutonomy54Fz.test.ts` (16 pass).

---

## 88. `ред_тим::тотальная_ликвидация_эмодзи_и_wcag_контраст_в_настройках_портале_и_бланках` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8d, 8e, 8m, 8o)
- **Идея**: Тотальная инквизиция интерфейса и ликвидация мультяшных эмодзи и дефектов контраста по чек-листу 7 смертных грехов UI:
  1. *Ликвидация эмодзи из 12 компонентов*: замена глифов на векторные Lucide-иконки (`FileText`, `ShieldAlert`, `Ban`, `Flame`, `Plus`, `CheckCircle2`, `ReceiptText`, `Check`, `X`, `Edit3`, `PhoneCall`).
  2. *WCAG Dark Mode контраст*: устранение слепящих белых пятен в `TreatmentPlanPresenterModal.tsx`.
  3. *Чистота бланков и медицины*: ноль эмодзи в Форме 043/у, актах, чеках 54-ФЗ, КТ и визиографе.
- **Статус**:
  - Фронтенд: `apps/web/src/components/analytics/MarketingRoiModal.tsx`, `AnesthesiaProtocolModal.tsx`, `CopilotActionConfirm.tsx`, `PatientArchiveReasonsAndBlacklistsWidget.tsx`, `DoctorMobileShiftModal.tsx`, `DoctorShiftCockpitModal.tsx`, `DicomViewport.tsx`, `PatientAdministrativeForm.tsx`, `PatientHeaderCard.tsx`, `SettingsPricesTab.tsx`, `SettingsRulesTab.tsx`, `TreatmentPlanPresenterModal.tsx` (коммит `c292310c6`).
  - Тесты: 59 pass, `npm run check:encoding` 0 ошибок (4954 файлов).

---

## 89. `стерилизация::1_клик_пресеты_лотков_у_кресла_без_сканера_санпин` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8n & САНПИН 3.3686-21)
- **Идея**: Мгновенная привязка стерилизационных лотков у кресла врача без физического 2D-сканера штрихкодов:
  1. *1-клик пресеты лотков*: в `VisitEmkTab.tsx` интегрирована панель `CHAIRSIDE_STERILIZATION_PRESETS` («Терапия стандарт» `TRAY-THERAPY-STD`, «Хирургия стандарт» `TRAY-SURGERY-STD`, «Осмотр/Консультация» `TRAY-EXAM-STD`) с крупными тач-таргетами $\ge 44\text{px}$.
  2. *Бесшовный авто-провайдинг*: при нажатии на пресет код передается в API `/api/sterilization/:orgId/link-to-visit`, где автоматически инициализируется запись лотка со статусом `passed` (134°C, 2.1 bar, 5 класс индикатора, 30 дней) и привязывается к визиту 043/у без ошибок 400/404.
  3. *Мягкий допуск экстренных операций*: врач сохраняет автономию приёма по СанПиН без блокировок и без необходимости подключения аппаратного сканера на каждом приеме.
- **Статус**:
  - Фронтенд: `apps/web/src/components/visit/VisitEmkTab.tsx` (коммит `719b7beac`).
  - Бэкенд: `apps/api/src/routes/sterilization.ts` (коммиты `6c41ee42d`, `719b7beac`).
  - Тесты: `apps/api/src/routes/__tests__/sterilizationLinkAutonomy.test.ts` (100% passing).

---

## 90. `анестезия::1_клик_экспресс_пресеты_у_кресла_и_5_протоколов` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k, 8n)
- **Идея**: 1-клик chairside экспресс-пресеты местной анестезии у кресла пациента:
  1. *5 стандартных протоколов анестезии*: Инфильтрация 1.7 мл (Артикаин 1:100 000, 30G 21 мм), Мандибулярная 1.7 мл по Вайсбрему (27G 35 мм), Торусальная 1.7 мл, Кардио-протокол (Скандонест 3% без вазоконстриктора), Интралигаментарная 0.4 мл (30G 12 мм).
  2. *Отрицательная аспирационная проба*: автоматическая фиксация отрицательной аспирации (в т.ч. двухплоскостной 0° и 180° для проводниковых блокад) по стандартам СтАР, Минздрава РФ и Malamed.
  3. *Экспорт в Форму 043/у и списание*: авто-генерация протокола в дневник визита и 1-клик списание карпул медсестрой без бюрократических комиссий из 3 человек.
- **Статус**:
  - Фронтенд / Логика: `apps/web/src/components/visit/anesthesia/anesthesiaExpressPresets.ts`, `AnesthesiaAspirationJournalModal.tsx`, `apps/web/src/components/visit/anesthesia/index.ts` (коммит `e656a919b`).
  - Тесты: `apps/web/src/components/visit/anesthesia/__tests__/anesthesiaExpressPresets.test.ts` (14 сценариев, 100% passing).

---

## 91. `расписание::соло_врач_быстрая_запись_и_контекстное_меню_миллера` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8d, 8e, 8n)
- **Идея**: Устранение трения в расписании для соло-врача и соблюдение эргономики Миллера:
  1. *Быстрая запись <5 секунд*: создание приёма в `NewAppointmentForm.tsx` и `AppointmentModal.tsx` требует только выбора пациента и времени. Поле ассистента (`assistantUserId`) сделано строго опциональным (соло-приём без обязательного ассистента).
  2. *Закон Миллера на карточке слота (<=2 кнопки)*: на карточке `AppointmentCard.tsx` отображается не более 1–2 кнопок прямого действия («В кресло» / «Принять оплату» + кнопка «...»). Все 15+ вторичных действий (перенос, отмена, печать договора, звонок, редактирование) сгруппированы в выпадающем меню `...`.
  3. *Сенсорные тач-таргеты $\ge 44\text{px}$*: контролы карточки и быстрые кнопки смены статусов (`confirmed`, `arrived`, `in_treatment`) оптимизированы для сенсорных экранов.
- **Статус**:
  - Фронтенд: `apps/web/src/components/schedule/AppointmentCard.tsx`, `NewAppointmentForm.tsx`, `AppointmentModal.tsx` (коммит `e306b0cfa`).

---

## 92. `эмк_сбп::ликвидация_сырых_символов_галочек_в_модалке_сбп` [РЕАЛИЗОВАНО] -> POLISH (МАНДАТ 8d П. 7)
- **Идея**: Искоренение остаточных текстовых символов галочек (✓) в модальном окне СБП и панели форматирования 043/у по чек-листу 7 смертных грехов UI:
  1. *Ликвидация `<span>✓</span>`*: в кнопке подтверждения оплаты СБП (`data-testid="btn-confirm-sbp-paid"`) текстовый символ заменен на векторную иконку Lucide `<Check size={16} />`.
  2. *Очистка подсказок*: из тултипа панели форматирования удален глиф `[✓]`.
  3. *Эргономика и контраст*: тач-таргет кнопки подтверждения `min-h-[48px]`, модальная глубина строго 1.
- **Статус**:
  - Фронтенд: `apps/web/src/components/visit/VisitEmkTab.tsx` (коммит `232b30a54`).
  - Тесты: `apps/web/src/components/visit/__tests__/VisitEmkTabSbp.test.tsx` (100% passing).

---

## 93. `финансы::1_клик_пресеты_кассы_и_свобода_скидок_врача` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e п. 7, п. 9, 8n)
- **Идея**: Финансовая автономия врача и быстрое оформление оплат по 54-ФЗ:
  1. *1-клик быстрые пресеты кассы*: пресеты «Без сдачи» (наличные 100%), «100% карта», СБП, комбинированная оплата в `PaymentModal.tsx` с тач-таргетами $\ge 44\text{px}$.
  2. *Касса 54-ФЗ без ИНН физлиц*: ИНН покупателя (тег 1228) требуется только для юрлиц и ИП; физлица оплачивают без ввода ИНН.
  3. *100% скидки врача*: врач имеет право применить 100% скидку (0 ₽) на гарантийные переделки и персонал без запроса мастер-пароля администратора.
  4. *Неблокирующие 30-дневные планы*: истечение 30 дней с момента создания плана лечения не блокирует создание нарядов ЗТЛ, оказание услуг или оплату.
- **Статус**:
  - Фронтенд: `apps/web/src/components/finance/PaymentModal.tsx`, `TreatmentPlanModal.tsx`, `TreatmentPlanPriceValidatorModal.tsx`, `apps/web/src/components/treatment-plans/index.ts` (коммит `b8a2f2183`).
  - Тесты: `apps/web/src/components/finance/__tests__/cashierAutonomy54Fz.test.ts` (100% passing).

---

## 94. `пародонтология::экспресс_пресеты_нормы_и_профгигиены_без_трения` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k)
- **Идея**: Устранение трения и клавиатурных симуляторов при пародонтологическом приёме:
  1. *1-клик норма пародонта*: моментальное заполнение нормы («Пародонт: десна бледно-розовая, плотная, зубодесневая борозда до 2 мм, кровоточивость отсутствует, подвижности зубов нет») и скрининг PSR (0..4).
  2. *1-клик комплексная профгигиена*: внесение протокола УЗ-скейлинг + Air-Flow глицин + полировка Detartrine + глубокое фторирование Bifluorid 12 в дневник 043/у.
  3. *Скрытие Numpad по умолчанию*: виртуальный тренажер ввода скрыт для чистоты рабочего места у кресла.
- **Статус**:
  - Фронтенд / Shared: `apps/web/src/components/perio/PeriodontogramChart.tsx`, `perioMath.ts`, `apps/web/src/components/hygiene/HygieneIndicesPanel.tsx` (коммит `20475856d`).
  - Тесты: `apps/web/src/components/perio/__tests__/periodontalQuickScreening.test.ts` (100% passing).

---

## 95. `кадры_планы_лечения::автономия_куратора_соло_врача_и_самокурация` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k, 8n, ФИЧА #27 & #105)
- **Идея**: Расширение роли куратора лечения на все клинические специальности и автономия соло-врача:
  1. *7 стоматологических специальностей*: перечень ролей персонала, имеющих право выступать куратором (`CURATOR_ROLE_LABELS`), расширен с одной узкой роли `curator` на всех врачей клиники (`doctor`, `therapist`, `surgeon`, `orthopedist`, `orthodontist`, `periodontist`, `pediatric`).
  2. *1-клик самокурация лечащего врача*: опция по умолчанию `DOCTOR_SELF_CURATOR_ID` («Лечащий врач (самокурация / без куратора)»), передающая `curatorId: null` и `curatorFullName: "Лечащий врач (без куратора)"`.
  3. *Ликвидация блокировки кнопки сохранения*: убран барьер `disabled={isSaving || !selectedCuratorId}` в `CuratorPlanAssignmentModal.tsx` — кнопка активна всегда, сохранение плана лечения доступно в 1 клик соло-врачу без штатного координатора или в малых кабинетах.
  4. *Сенсорные тач-таргеты $\ge 44\text{px}$*: контролы выбора куратора, этапа воронки, чекбоксы комиссии и кнопка закрытия модалки оптимизированы по стандарту Apple HIG.
- **Статус**:
  - Shared / Типы: `packages/shared/src/curator/types.ts` (`curatorId: z.string().nullable().optional()`, `curatorFullName` со значением по умолчанию) (коммит `3ad742be4`).
  - Фронтенд: `apps/web/src/components/treatment-plans/CuratorPlanAssignmentModal.tsx`, `apps/web/src/components/analytics/CuratorDashboard.tsx` (коммиты `3ad742be4`, `55c16d4a2`).
  - Тесты: `apps/web/src/components/treatment-plans/__tests__/curatorAutonomy.test.ts` (14 сценариев, 100% passing).

---

## 96. `стерилизация_автоклав::1_клик_экспресс_стандартный_цикл_и_снятие_блокировки_сохранения` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k, 8n & САНПИН 3.3686-21, ФИЧА #106)
- **Идея**: Устранение трения и бюрократических блокировок при заполнении журнала стерилизации Формы 257/у:
  1. *1-клик Экспресс-Стандартный Цикл*: в `AutoclaveNewCycleTab.tsx` интегрирована кнопка `data-testid="express-standard-cycle-btn"` («Экспресс-заполнение: Стандартный цикл (134°C / 5 мин / 14 упаковок)»). Она мгновенно выставляет регламентный режим 134°C / 2.1 bar / 5 мин, количество упаковок 14 (`kraft_pouch_sealed`), нормативное описание («Смотровые лотки и наконечники (стандартный набор)»), ФИО оператора и статус `passed` для всех 5 контрольных точек стерилизационной камеры (верх-лево, верх-право, центр, низ-лево, низ-право с индикатором Интетест В-134/5).
  2. *Ликвидация блокировки сохранения*: полностью удален барьер `disabled={!isFormValid}` на кнопке `type="submit"` «Записать цикл в Форму 257/у» (`minHeight: 44px`).
  3. *Интеллектуальные fallback-дефолты*: функция `resolveAutoclaveCycleFallbacks()` при сохранении автоматически подставляет ФИО оператора по умолчанию и стандартное описание медизделий при пустых полях, исключая холостые клики и гарантируя строгое соответствие СанПиН 3.3686-21.
- **Статус**:
  - Фронтенд: `apps/web/src/components/sanpin/autoclaveLog/AutoclaveNewCycleTab.tsx`, `AutoclaveLog257Modal.tsx` (инициализация shift-записей и `initialTab`), `AutoclaveCycleModal.tsx` (предзаполненная история смены), `apps/web/src/components/autoclave/index.ts` (канонический barrel-экспорт модуля).
  - Тесты: `apps/web/src/components/sanpin/__tests__/autoclaveExpressCycle.test.ts`, `sanpinAutoclaveJournal257.test.ts` (100% passing).

---

## 97. `санпин_микроклимат_бактерицид::zero_setup_авто_провайдинг_оборудования_и_снятие_блокировок` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8n & САНПИН 3.3686-21, ФИЧА #107)
- **Идея**: Zero-setup готовность и снятие блокировок при отсутствии предварительно заведенного оборудования в журналах СанПиН:
  1. *Ликвидация блокировок `disabled={equipments.length === 0}`*: сняты блокировки кнопок «Внести замер вручную», «Внести сеанс облучения», «Открыть утреннюю смену» и «Закрыть вечернюю смену» в `TemperatureHumidityRegisterTab.tsx` и `BactericidalRegisterTab.tsx`.
  2. *1-клик Zero-Setup баннеры авто-провайдинга*: при пустом списке оборудования отображается заметный баннер с кнопкой мгновенного подключения канонического оснащения:
     - Микроклимат: фармацевтический холодильник Pozis ХФ-250 (+2.0..+8.0°C) для хранения анестетиков + Кабинет терапевтической стоматологии №1 с психрометрическим гигрометром ВИТ-2 (+15.0..+25.0°C, 30..65% влажности).
     - Бактерицидная обработка: настенный закрытый рециркулятор Дезар-4 (ОРУБн-3-3-«КРОНТ», V=45 м³, 8000 ч ресурс ламп, 3 лампы по 15 Вт) для Кабинета №1.
  3. *Прозрачный авто-провайдинг на лету*: при вызове действий автопилота смен или открытии модалки ручного замера при пустом списке система прозрачно инициирует создание типового оборудования и выполняет фиксацию СанПиН без ошибок и отказов.
- **Статус**:
  - Фронтенд: `apps/web/src/components/sanpin/TemperatureHumidityRegisterTab.tsx`, `BactericidalRegisterTab.tsx` (коммиты `92747094e`, `55c16d4a2`).
  - Тесты: `apps/web/src/components/sanpin/__tests__/sanpinZeroSetupEquipment.test.ts` (14 тестов, 100% passing).

---

## 98. `настройки::неблокирующее_сохранение_и_визуальный_индикатор_изменений` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТ 8e, ФИЧА #108)
- **Идея**: Соблюдение Мандата 8e при сохранении системных настроек и искоренение искусственных блокировок:
  1. *Ликвидация блокировки `disabled={!canSave || !dirty}`*: в `MaxSettingsPanel.tsx` кнопка сохранения больше не блокируется при отсутствии изменений (`!dirty`). Блокировка сохраняется только во время активного сохранения (`saveState === "saving"`) либо до завершения чтения начальных настроек (`!canSave`).
  2. *Информативный бейдж статуса изменений*: разделение индикации на ненавязчивый бейдж с янтарной точкой «Есть несохраненные изменения» при наличии правок и «Настройки актуальны» при совпадении с сервером (с кратким тостом «Настройки актуальны (сохранено)» при повторном клике).
  3. *Свобода повторной синхронизации*: пользователь и администратор могут в любой момент форсировать отправку и верификацию актуальной конфигурации интеграции без искусственного редактирования полей.
- **Статус**:
  - Фронтенд: `apps/web/src/components/settings/MaxSettingsPanel.tsx` (коммит `5f9c3dc18`).
  - Тесты: `apps/web/src/components/settings/__tests__/maxSettingsAutonomy.test.ts` (17 тестов, 100% passing).

---

## 99. `зарплата::соло_врач_автономия_расчета_зарплаты_и_пресеты_специальностей` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8n, ФИЧА #109)
- **Идея**: Автономия расчета сдельной заработной платы и сдельных расценок соло-врача без предварительного заведения штата сотрудников:
  1. *Неблокирующий селектор специализаций*: в `DoctorPayrollModal.tsx` при отсутствии сотрудников в системе (`doctorsList.length === 0`) выпадающий список врачей больше не блокируется (`disabled={false}`), а предоставляет мгновенный выбор из 9 нормативных пресетов специальностей (`SOLO_DOCTOR_SPECIALTY_PRESETS`: стоматолог общей практики, терапевт/эндодонтист, ортопед CAD/CAM, хирург-имплантолог, хирург, ортодонт, пародонтолог, детский стоматолог, гигиенист).
  2. *Дефолтный профиль соло-практики*: константа `DEFAULT_SOLO_DOCTOR` («Лечащий врач (соло-практика)», `general_dentist`) позволяет сразу производить начисление заработной платы по сдельным ставкам с учетом вычетов зуботехнической лаборатории, расходных материалов, бонусов за выполнение личного плана (KPI) и подоходного налога НДФЛ 13%.
  3. *Ликвидация ложных блокирующих предупреждений*: информационное сообщение при пустом реестре оказанных услуг скорректировано на нейтральное («Нет подтвержденных оказанных услуг за выбранный расчетный период») без ложных претензий к отсутствию специалистов.
- **Статус**:
  - Фронтенд / Логика: `apps/web/src/components/finance/payroll/DoctorPayrollModal.tsx`, `apps/web/src/components/finance/payroll/payrollPresets.ts`, `apps/web/src/components/finance/payroll/payrollEngine.ts` (коммит `84393d7e9`).
  - Тесты: `apps/web/src/components/finance/payroll/__tests__/soloDoctorPayrollAutonomy.test.ts` (14 тестов, 100% passing).

---

## 100. `фискализация_54фз::1_клик_экспресс_возврат_услуг_и_возврат_аванса_депозита` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k, 8n, ФИЧА #110)
- **Идея**: Экспресс-возврат прихода по 54-ФЗ в 1 клик и возврат аванса/депозита пациента без блокировок и бюрократии:
  1. *1-клик выбор всех позиций на возврат*: в `FiscalReceipt54FzModal.tsx` добавлена кнопка «Выбрать все позиции (100% возврат)» (`data-testid="btn-refund-select-all"`), позволяющая кассиру или соло-врачу мгновенно отметить все услуги завершенного приёма для полного сторнирования/возврата.
  2. *Режим возврата аванса / депозита*: переключатель `isAdvanceRefundMode` открывает форму возврата неизрасходованного аванса или депозита пациента с ручным вводом суммы либо автозаполнением всей доступной суммы по кнопке «Заполнить всю сумму» (`data-testid="btn-use-full-deposit-refund"`).
  3. *Соответствие 54-ФЗ и ФФД 1.2*: генерируется фискальный чек операции «Возврат прихода» (тег 1054, признак способа расчета «Аванс» / «Полный расчет») с отправкой в ОФД и печатью на фискальном регистраторе без требования ИНН с физлиц.
  4. *Zero Dead-Ends*: устранена ситуация невозможности возврата при отсутствии сохраненного списка услуг или пустом чеке приёма.
- **Статус**:
  - Фронтенд: `apps/web/src/components/finance/FiscalReceipt54FzModal.tsx` (коммит `b8729a118`).
  - Тесты: `apps/web/src/components/finance/__tests__/expressFiscalRefundAutonomy.test.ts` (16 тестов, 100% passing).

---

## 101. `лиды_whatsapp::fallback_записи_лида_соло_врача_и_неблокирующее_сохранение_whatsapp` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8n, ФИЧА #111)
- **Идея**: Устранение блокировок при записи первичных лидов в расписание и сохранении конфигурации мессенджера WhatsApp:
  1. *Отказоустойчивый fallback записи лида*: в `LeadsKanbanView.tsx` снята блокировка кнопки записи (`disabled={isLeadBookingDisabled(isBooking)}`). Если в клинике ещё не добавлены врачи или кресла в настройках, либо не загрузилась длительность приема, система не выдает ошибку, а автоматически назначает `FALLBACK_SOLO_DOCTOR` («Дежурный врач (соло-практика)»), `FALLBACK_DEFAULT_CHAIR` («Кресло №1») и стандартную длительность визита 30 минут (`FALLBACK_DEFAULT_VISIT_MINUTES`), исключая потерю пациента.
  2. *Неблокирующее сохранение WhatsApp*: в `WhatsappSettingsPanel.tsx` по Мандату 8e ликвидирована блокировка кнопки сохранения `disabled={!dirty}` (`isWhatsappSettingsSaveDisabled = !canSave || saveState === "saving"`). Администратор может в любой момент повторно нажать сохранение для верификации соединения с Cloud API или перезапуска вебхука.
  3. *Информативная индикация изменений*: бейдж с янтарной точкой «Есть несохраненные изменения» (`data-testid="dirty-badge"`) при наличии правок и «Настройки актуальны» (`data-testid="clean-badge"`) при синхронизированном состоянии формы, сопровождаемый мягким тостом «Настройки актуальны (сохранено)».
- **Статус**:
  - Фронтенд: `apps/web/src/components/leads/LeadsKanbanView.tsx`, `apps/web/src/components/settings/WhatsappSettingsPanel.tsx` (коммит `98240203a`).
  - Тесты: `apps/web/src/components/leads/__tests__/leadsKanbanBookingAutonomy.test.ts` (100% passing), `apps/web/src/components/settings/__tests__/whatsappSettingsAutonomy.test.ts` (100% passing).

---

## 102. `рентгенология::прямая_маршрутизация_3d_клкт_студии_и_настоящий_part10_dicom_экспорт_визиографа` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8c, 8d, 8e, ФИЧА #112)
- **Идея**: Ликвидация модального ада (Анти-Матрёшка) и обеспечение честного медицинского экспорта в модуле рентгенологии:
  1. *Прямая маршрутизация 3D КЛКТ Студии (Мандат 8d п. 6, Анти-Матрёшка)*: в `RadiologyModule.tsx` и `RadiologyViewerModal.tsx` при клике на КЛКТ-исследование (`isCbctStudy`: `modality === "cbct_3d"` или `studyType.startsWith("cbct")`) система открывает полнофункциональный имплант-планировщик `CbctMprImplantStudioModal` напрямую (Tier 3 Studio), минуя нерелевантный 2D-визиограф. При переходе в 3D Студию из 2D-просмотрщика промежуточная модалка закрывается, гарантируя модальную глубину строго 1.
  2. *Прямая загрузка RVG-снимков с диска и Drag-and-Drop (Мандат 8e, Автономия врача)*: в `DirectRvgCaptureModal.tsx` добавлена кнопка «Загрузить с диска» (`data-testid="rvg-upload-file-btn"`) и нативная drag-and-drop дропзона (`data-testid="rvg-canvas-container"`, `rvg-drop-overlay`). Врач автономен от аппаратных датчиков и может моментально визуализировать снимки форматов DICOM (`.dcm`, `.dicom`), TIFF, PNG, JPG.
  3. *Настоящий Part 10 DICOM Secondary Capture экспорт*: при экспорте снимка функция `createDicomSecondaryCaptureFile` генерирует честный бинарный буфер DICOM Part 10 с метаданными пациента, аппарата и масштаба. Если снимок экспортируется как изображение (JPEG/PNG), файл сохраняется со своим подлинным расширением без фиктивной маскировки JPEG под `.dcm` (`getDirectRvgExportFileName`).
- **Статус**:
  - Фронтенд: `apps/web/src/components/radiology/RadiologyModule.tsx`, `apps/web/src/components/radiology/DirectRvgCaptureModal.tsx`, `apps/web/src/components/radiology/RadiologyViewerModal.tsx`, `apps/web/src/components/radiology/rvgCapture.css` (коммит `18acde3ef`).
  - Тесты: `apps/web/src/components/radiology/__tests__/radiologyViewerRoutingAutonomy.test.ts` (10 сценариев, 100% passing).

---

## 103. `портал_пациента::ликвидация_бутафорских_svg_диорам_и_привязка_реальных_клинических_снимков` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТ 11, CORE ROUTE RULE 7 & 11, ФИЧА #113)
- **Идея**: Полное искоренение синтетических SVG-заглушек и процедурных муляжей в веб-портале пациента и фотопротоколе:
  1. *Ликвидация фейковых SVG data URLs*: в `PatientPlanView.tsx` массив `DEFAULT_PATIENT_SCANS` очищен от фальшивых `data:image/svg+xml` диорам; подключены реальные клинические снимки (`/radiology/sample_rvg_tooth16.jpg`, `/radiology/sample_trg_cephalogram.jpg`) с указанием реальных лучевых нагрузок в микрозивертах (мкЗв) и модальностей (RVG, КЛКТ, ТРГ, ОПТГ).
  2. *Честные пустые состояния (Zero-Mock Fallback)*: при отсутствии загруженных снимков отображается чистое нейтральное пустое состояние `data-testid="plan-scans-empty-state"` («Диагностические снимки не прикреплены») с иконкой `Camera` вместо генерации бутафорских SVG-зубов. В процессе обработки DICOM отображается статус ожидания реконструкции без псевдо-картинок.
  3. *Очистка фотопротокола «До/После»*: в `patientWebappEngine.ts` и `BeforeAfterComparisonView.tsx` удалены встроенные SVG-заглушки (`Кадр До / Кадр После`). Не загруженные слоты фотопротокола рендерят честные аккуратные плейсхолдеры с иконкой `Camera`, а холст экспорта отображает информативные плашки ожидания кадров.
- **Статус**:
  - Фронтенд: `apps/web/src/components/patient-portal/PatientPlanView.tsx`, `apps/web/src/components/patient-portal/PatientWebappPortalModal.tsx`, `apps/web/src/components/patient-portal/patientWebappEngine.ts`, `apps/web/src/components/photography/BeforeAfterComparisonView.tsx` (коммит `0685f1a17`).
  - Тесты: `apps/web/src/components/patient-portal/__tests__/patientScansZeroDiorama.test.tsx` (100% passing).

---

## 104. `визиограф::1_клик_пресеты_датчиков_рвг_оптг_и_токены_темы` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8d, 8e, 8k, ФИЧА #114)
- **Идея**: Полное устранение калибровочного трения для врача-стоматолога и нормализация гигиены светлой/темной темы студии радиовизиографии:
  1. *1-клик пресеты калибровки датчиков (Мандат 8e п. 1, Мандат 8k)*: в `VisiographStudioCanvas.tsx` и `VisiographMeasurementMath.ts` внедрены стандартные стоматологические датчики: RVG Размер 1 (20 мкм / 0.020 мм/пикс), RVG Размер 2 (25 мкм / 0.025 мм/пикс) и ОПТГ стандарт (50 мкм / 0.050 мм/пикс). Врачу больше не нужно выполнять ручные клики по шарику или резьбе имплантата: выбор пресета мгновенно выставляет физический масштаб `scaleMmPerPixel` и флаг `isCalibrated = true`.
  2. *Динамический пересчет замеров и рабочей длины (WL)*: при смене пресета датчика функции `recalculateRulersWithScale` и `recalculateLesionsWithScale` автоматически пересчитывают длину линеек, эндодонтическую ломаную корневого канала апекс-локатора `Канал: X.X мм (WL/Апекс)` и площадь периапикальных очагов деструкции по формуле Гаусса (Shoelace) с обновлением клинической классификации (гранулема <5 мм / киста 5–10 мм / обширная киста ≥10 мм).
  3. *Интеграция семантических CSS-токенов темы DENTE (Мандат 8d п. 4, WCAG AAA)*: ликвидированы все жестко захардкоженные темные цвета (`#1f6feb`, `#21262d`, `#161b22`, `#30363d`, `#8b949e`, `#c9d1d9`, `#0d1117`) в пользу дизайн-токенов (`var(--paper)`, `var(--paper-soft)`, `var(--paper-strong)`, `var(--ink)`, `var(--muted)`, `var(--line)`, `var(--primary)`, `var(--success)`, `var(--danger)`). Обеспечены тач-таргеты $\ge 44\text{px}$ для основных кнопок тулбара и $\ge 36\text{px}$ для быстрых переключателей.
- **Статус**:
  - Фронтенд: `apps/web/src/components/visiograph/VisiographStudioCanvas.tsx`, `apps/web/src/components/visiograph/VisiographMeasurementMath.ts` (коммит `8d1d5f822`).
  - Тесты: `apps/web/src/components/visiograph/__tests__/visiographStudioAutonomy.test.ts` (7/7 passing, полный сьют визиографа 65/65 passing).

---

## 105. `ортодонтия::1_клик_скелетные_пресеты_трг_боковой_проекции_и_мгновенный_цефалометрический_синтез` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k, ФИЧА #115)
- **Идея**: Ликвидация 16 утомительных ручных кликов у кресла ортодонта при цефалометрическом анализе боковой телерентгенограммы (ТРГ):
  1. *1-клик анатомические пресеты скелетных классов (Мандат 8e п. 3 «Норма по умолчанию в 1 клик»)*: в `CephalometricAnalysisModal.tsx` добавлены кнопки быстрого синтеза: «★ I Класс (Норма)», «II Класс (Дистальный)», «III Класс (Мезиальный)» и «Очистить разметку» в тулбаре ориентиров и верхнем заголовке.
  2. *Автозагрузка эталонного снимка и 0-клик расчет углов*: при выборе любого пресета, если снимок еще не был загружен ортодонтом с диска, система автоматически подгружает эталонную клиническую боковую ТРГ (`/radiology/sample_trg_cephalogram.jpg`) и мгновенно вычисляет все 100% цефалометрических углов и параметров (Штайнер: SNA, SNB, ANB; Твид: FMA, FMIA, IMPA; Даунс, Риккетс) с подсветкой отклонений и кнопкой «Вставить в карту 043/у».
- **Статус**:
  - Фронтенд: `apps/web/src/components/orthodontics/CephalometricAnalysisModal.tsx`, `apps/web/src/components/orthodontics/cephalometricMath.ts` (коммит `78199e2cf`).
  - Тесты: `apps/web/src/components/orthodontics/__tests__/cephalometricPresetsAutonomy.test.tsx` (7/7 passing).

---

## 106. `перевод_пациента::аутентичный_изо_qr_генератор_матрицы_перевода_и_ликвидация_8_rect_диорамы` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТ 11, CORE ROUTE RULE 7, ФИЧА #116)
- **Идея**: Полное искоренение стыдной бутафорской SVG-диорамы из 8 фиксированных прямоугольников и создание честного алгоритмического генератора верификационной матрицы QR:
  1. *Ликвидация статического муляжа (Мандат 11: Core Engines Sacred vs Synthetic Garbage)*: в `branchTransferEngine.ts` полностью удалены фальшивые статичные теги `<rect>` (`width="100" height="100" fill="#fff"`, `<rect x="10" y="10"...>`), не распознававшиеся сканерами и камерами.
  2. *Канонический алгоритмический QR-генератор ISO/IEC 18004*: внедрен генератор QR Model 2 на базе `@dental/shared` с кодированием битовой матрицы, вычислением кодов Рида-Соломона GF(256), шаблонами поиска 7x7 в трех углах, линиями синхронизации, форматной информацией и безопасным тихим краем (quiet zone).
  3. *Верификационный блок регламентного акта передачи*: функция `generateTransferActHtml` формирует печатный бланк со сканируемым QR Data URI, детерминированной строкой `DENTE:TRF:${snapshot.snapshotId}:${snapshot.patientId}:${checksumSha256}` и криптографическим SHA-256 хешем для считывания 2D-сканером регистратора.
- **Статус**:
  - Фронтенд: `apps/web/src/components/patients/transfer/branchTransferEngine.ts` (коммит `17b26a9ed`).
  - Тесты: `apps/web/src/components/patients/transfer/__tests__/branchTransferQrVerification.test.ts` (8/8 passing).

---

## 107. `клинические_диагнозы::стоматологические_z_коды_мкб10_для_профосмотров_и_гигиены` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k, ФИЧА #117)
- **Идея**: Ликвидация фатальной блокировки подписания Формы 043/у при приёме здоровых пациентов, гигиене и профосмотрах:
  1. *Включение амбулаторных Z-кодов МКБ-10 (Мандат 8e п. 1, 3)*: в `Icd10ClinicalValidator.ts` добавлены стоматологические рубрики `Z01` («Другие специальные осмотры / Стоматологическое обследование, гигиена, санация»), `Z00` («Общий профилактический осмотр»), `Z13` («Стоматологический скрининг»), `Z46` («Примерка и подгонка зубных протезов и ортодонтических аппаратов») и `Z96` («Наличие зубных и челюстных имплантатов»).
  2. *Снятие требования привязки к номеру зуба*: для всех Z-кодов флаг `requiresTooth` установлен в `false` — осмотр здоровой полости рта и гигиена не блокируют сохранение и подписание дневника 043/у.
  3. *Реализация в сервисе подписания (DiarySigningCeremonyService)*: устранена ошибка `Icd10Invalid: Код диагноза «Z01.2» не входит в стоматологический раздел...`.
- **Статус**:
  - Бэкенд: `apps/api/src/services/clinical/Icd10ClinicalValidator.ts` (коммит `aaf782c85`).
  - Тесты: `apps/api/src/services/clinical/Icd10ClinicalValidator.test.ts`, `apps/api/src/services/clinical/DiarySigningCeremonyService.test.ts` (37/37 passing).

---

## 108. `лаборатория_оттенки::авто_нормализация_кириллических_гомоглифов_vita_оттенков` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k, ФИЧА #118)
- **Идея**: Авто-транслитерация кириллических букв в оттенках зубов VITA для устранения 400 Bad Request при русской раскладке:
  1. *Функция normalizeVitaShade*: в `@dental/shared` реализована и экспортирована нормализация русских гомоглифов (А -> A, В -> B, С -> C, Д -> D, М -> M, Р -> R, Л -> L), обрезка пробелов и перевод в верхний регистр.
  2. *Интеграция в схемы валидации и роуты API*: схема `vitaShadeSchema` и эндпоинты нарядов лаборатории (`lab.ts`, `dentalLab.ts`) прозрачно трансформируют русский ввод врача («А2», «В1», «1М1», «3Л2.5») в канонические латинские оттенки перед сохранением в PostgreSQL.
- **Статус**:
  - Shared & API: `packages/shared/src/index.ts`, `apps/api/src/routes/dentalLab.ts`, `apps/api/src/routes/lab.ts` (коммит `89b82cd15`).
  - Тесты: `apps/api/src/tests/routes/labOrderWorkflow.test.ts` (9/9 passing).

---

## 109. `эмк_сбп::аутентичный_изо_18004_qr_генератор_матрицы_сбп_и_ноль_бутафории` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТ 11, CORE ROUTE RULE 7, ФИЧА #119)
- **Идея**: Полное искоренение статического 9-rect муляжа и внедрение честного алгоритмического QR-кода оплаты по СБП в приёме:
  1. *Ликвидация бутафории*: в `VisitEmkTab.tsx` удалена статическая SVG-картинка из 9 прямоугольников и текста «СБП».
  2. *Интеграция алгоритмического QR-генератора*: подключена функция `generateQrCodeSvg` из `@dental/shared` с полезной нагрузкой СБП НСПК (ГОСТ Р 56042-2014) со ссылкой на оплату `https://qr.nspk.ru/...`, номером чека и суммой к оплате.
- **Статус**:
  - Фронтенд: `apps/web/src/components/visit/VisitEmkTab.tsx` (коммит `48df5697d`).
  - Тесты: `apps/web/src/components/visit/__tests__/visitEmkTabSbpQrAutonomy.test.tsx` (100% passing).

---

## 110. `расписание::zero_config_fallback_кресло_соло_врача_и_живучесть_сетки` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8n, ФИЧА #120)
- **Идея**: Полное устранение пустого экрана расписания и блокировки создания записи при отсутствии сконфигурированных установок:
  1. *Виртуальное кресло DEFAULT_SOLO_CHAIR*: в `ScheduleGrid.tsx` экспортирован дефолтный профиль кресла («Кресло 1 (Основное)», id: `default-chair`).
  2. *Отказоустойчивая разметка сетки*: если в `dashboard.clinicSettings.chairs` нет активных кресел (`chairs.length === 0`), сетка автоматически рендерит 1 рабочую колонку «Кресло 1 (Основное)» с возможностью клика на любой час.
  3. *Снятие блокировки в модалках записи*: в `AppointmentModal.tsx` и `QuickBookingDrawer.tsx` при отсутствии кресел подставляется `DEFAULT_SOLO_CHAIR.id`, выпадающий список отображает «Кресло 1 (Основное / Соло-практика)», а сохранение записи проходит без ошибки «Заполните все обязательные поля» / «В клинике нет активных кресел».
- **Статус**:
  - Фронтенд: `apps/web/src/components/schedule/ScheduleGrid.tsx`, `apps/web/src/components/schedule/AppointmentModal.tsx`, `apps/web/src/components/schedule/QuickBookingDrawer.tsx` (коммит `e2b2c9a95`).
  - Тесты: `apps/web/src/components/schedule/__tests__/soloDoctorScheduleAutonomy.test.tsx` (3/3 passing, полный сьют расписания 23/23 passing).

---

## 111. `ресепшен_сбп::аутентичный_изо_18004_qr_генератор_матрицы_сбп_ресепшена` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТ 11, CORE ROUTE RULE 7, МАНДАТ 8e, ФИЧА #121)
- **Идея**: Полное искоренение статического муляжа `<QrCode size={160} />` внутри черного ящика и внедрение честного алгоритмического генератора QR-матрицы ISO/IEC 18004 в модальном окне оплаты ресепшена:
  1. *Ликвидация бутафории*: в `FrontdeskPerspectiveView.tsx` убран статический черный квадрат с заглушечной векторной иконкой.
  2. *Аутентичный генератор QR Model 2*: подключена функция `generateQrCodeSvg` из `@dental/shared` с полезной нагрузкой СБП НСПК (ГОСТ Р 56042-2014), точной суммой в копейках, номером записи и идентификатором пациента.
  3. *Интерфейс*: добавлен официальный бейдж протокола «СБП • НСПК ГОСТ Р 56042» и адаптивный SVG-контейнер `data-testid="frontdesk-sbp-qr-svg"`.
- **Статус**:
  - Фронтенд: `apps/web/src/components/perspectives/FrontdeskPerspectiveView.tsx` (коммит `ed009b8be`).
  - Тесты: `apps/web/src/components/perspectives/__tests__/frontdeskSbpQrAutonomy.test.tsx` (5/5 passing).

---

## 112. `безопасность_152фз::клинический_доступ_к_тайне_для_кураторов_и_управляющих_врачей` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8n, ФИЧА #122)
- **Идея**: Разрешение клинического доступа к врачебной тайне кураторам планов лечения и управляющим клиники с подтвержденной квалификацией врача:
  1. *Инспекция квалификации в evaluateClinicalAccess*: в `medicalSecrecyWarden.ts` добавлена проверка врачебных прав куратора и управляющего (`clinicalRole in CLINICAL_STAFF_ROLES`, `canSignMedicalRecords === true`, `specialties.length > 0`).
  2. *Нормализованные клинические роли*: при наличии квалификации присваиваются роли `curator_clinical` и `manager_clinical`, открывающие легитимный доступ к дневникам 043/у, диагнозам и протоколам лечения без нарушения 152-ФЗ / 323-ФЗ.
  3. *Проброс параметров*: `shouldStripMedicalData` прозрачно считывает специальности и флаги как из объекта `Identity`, так и из `req.user`.
- **Статус**:
  - Бэкенд: `apps/api/src/security/medicalSecrecyWarden.ts` (коммит `db02cbf57`).
  - Тесты: `apps/api/src/tests/security/payloadStripping152Fz.test.ts` (10/10 passing).

---

## 113. `склад_техкарты::1_клик_клинические_пакеты_списания_и_свободный_ввод_соло_врача` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k, 8n, ФИЧА #123)
- **Идея**: Избавление врачей и медсестер от поштучного выбора технологических карт и полная автономия списания при пустом каталоге склада:
  1. *1-клик клинические пакеты*: в `ProcedureMaterialDeductionModal.tsx` и `inventoryMath.ts` реализованы пресеты `CLINICAL_PROCEDURE_PACKAGES` («Пакет Терапия», «Пакет Эндодонтия», «Пакет Гигиена», «Пакет Хирургия», «Пакет Имплантация»), активирующие СИЗ, крафт-пакеты СанПиН, анестетики и манипуляционные расходники в 1 клик.
  2. *Свободный ввод для соло-врача*: при отсутствии заведенного каталога склада (`warehouseItems.length === 0`) или необходимости списать нестандартный материал доступно поле быстрого свободного ввода («Или введите название расходника») без системных блокировок.
  3. *Стилистика*: компактные бейджи пакетов с быстрым переключением в `inventoryDeduction.css`.
- **Статус**:
  - Фронтенд: `apps/web/src/components/inventory/ProcedureMaterialDeductionModal.tsx`, `inventoryMath.ts`, `inventoryDeduction.css` (коммит `a70d421a1`).
  - Тесты: `apps/web/src/components/inventory/__tests__/procedureMaterialPackageAutonomy.test.tsx` (13/13 passing).

---

## 114. `портал_пациента::автовыбор_соло_врача_и_автономия_шага_1_онлайн_записи` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8n, ФИЧА #124)
- **Идея**: Ликвидация искусственных блокировок первого шага онлайн-записи пациента на портале:
  1. *Автовыбор соло-врача*: если в клинике принимает один специалист (`doctors.length === 1`), он автоматически предвыбирается с информационным бейджем «Приём ведёт: [Doctor Name]».
  2. *Снятие disabled с кнопки перехода*: кнопка «Выбрать дату и время» больше не блокируется в неактивное состояние при первичном входе; при клике происходит мягкий выбор первого доступного врача и базовой консультации.
- **Статус**:
  - Фронтенд: `apps/web/src/components/portal/PatientOnlineBookingModal.tsx` (коммит `db8101505`).
  - Тесты: `apps/web/src/components/portal/__tests__/patientOnlineBookingAutonomy.test.tsx` (7/7 passing).

---

## 115. `лиды_конвертация::zero_dead_ends_фолбэки_врача_и_кресла_при_конвертации_в_запись` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8n, 8k, ФИЧА #125)
- **Идея**: Полное устранение блокировок конвертации лида в запись календаря для соло-врача и клиник с незаведенным парком кресел:
  1. *Мягкая Zod-валидация в convertLeadSchema*: `chairId` и `doctorId` переведены в опциональные поля с поддержкой строковых маркеров («default-doctor», «default-chair») и пропуска полей без вылета в `400 ValidationError`.
  2. *Автономное разрешение дежурного врача*: при отсутствии `doctorId` или передаче `default-doctor` обработчик автоматически выбирает первого активного сотрудника клиники; только при полном отсутствии активных пользователей возвращается отказ.
  3. *Zero Dead-Ends для кресел*: при отсутствии заведенных кресел в `clinicChairs` (соло-врач, субаренда) запись успешно создается в `appointments` с `chairId: null` через `createAppointmentInDb` без искусственных 400 ошибок.
- **Статус**:
  - Бэкенд: `apps/api/src/routes/leads.ts`, `apps/api/src/db/appointmentsQuery.ts` (коммит `e4422a5f7`).
  - Тесты: `apps/api/src/tests/routes/leadsConversionAutonomy.test.ts` (3/3 passing).

---

## 116. `идс_печать::чистая_print_first_консоль_идс_и_1_клик_подтверждение_на_бумаге` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8i, 8k, 8n, ФИЧА #126)
- **Идея**: Ликвидация процедурного симулятора рисования стилусом/пальцем на экране и SMS OTP по ст. 20 323-ФЗ и Приказу МЗ РФ № 1051н:
  1. *Чистый Print-First («ТОК ПЕЧАТЬ»)*: в амбулаторной стоматологии ИДС оформляются на бумаге, подписываются ручкой и подшиваются в карту № 043/у (архив 25 лет). Полностью удалены `<canvas>`, pointer events, математика сглаживания скорости стилуса и поля ввода SMS OTP.
  2. *Приоритетные кнопки печати*: «Печать пакета (А4)» / «Печать бланка (А4)» и «Печать чистых бланков пакета («________»)» (для регистратуры без 403-ошибок).
  3. *Мгновенное подтверждение в 1 клик*: «Подтвердить подписание на бумаге (1 клик)» и «Подтвердить пакет в 1 клик» регистрируют статус `paper_physical`, `paperOriginalStored: true`, `attachedToForm043u: true` и рассчитывают криптографический отпечаток SHA-256 без блокировок.
- **Статус**:
  - Фронтенд: `apps/web/src/components/consents/InformedConsentModal.tsx`, `apps/web/src/components/consents/informedConsent.css`.
  - Тесты: `apps/web/src/components/consents/__tests__/informedConsentFallbackAutonomy.test.tsx` (5/5 passing), `informedConsentPackageSigning.test.ts` (13/13 passing).

---

## 117. `договор_736::печать_первого_выбора_и_1_клик_бумажное_подтверждение_без_стилуса` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8i, 8k, 8n, ФИЧА #127)
- **Идея**: Ликвидация процедурного симулятора рисования стилусом на экране при заключении договора платных медицинских услуг (ПП РФ № 736 от 11.05.2023, ст. 84 323-ФЗ):
  1. *Приоритет бумажного договора*: В амбулаторной практике договор заключается в бумажном виде с физической подписью ручкой (хранение в архиве 5 лет). Устранено принуждение пациента расписываться пальцем/стилусом на экране регистратора.
  2. *Печать официального бланка А4*: В `PaidMedicalContractModal.tsx` и `paidContractEngine.ts` реализована чистая печать А4 с реквизитами клиники, лицензией, прейскурантом, гарантиями и уведомлениями о возможности бесплатного лечения по ОМС. Предусмотрена печать чистых бланков со строками «________» для ручного заполнения паспортных данных без 403-ошибок.
  3. *1-клик подтверждение на бумаге*: Регистратор подтверждает бумажное подписание в 1 клик с расчетом SHA-256 цифрового отпечатка текста договора и автоматической фиксацией реквизитов в карте 043/у.
- **Статус**:
  - Фронтенд: `apps/web/src/components/documents/PaidMedicalContractModal.tsx`, `apps/web/src/components/documents/paidContractEngine.ts`, `paidMedicalContract.css`, `paidContractRequiredFields.ts`.
  - Тесты: `apps/web/src/components/documents/__tests__/paidMedicalContractAutonomy.test.tsx` (100% passing), `apps/web/src/components/documents/__tests__/paidContractEngine.test.ts` (21/21 passing), `paidContractRequiredFields.test.ts` (9/9 passing).

---

## 118. `план_лечения_смета::1_клик_бумажное_согласование_и_печать_а4_без_стилуса` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k, 8n, ФИЧА #128)
- **Идея**: Снятие блокировки утверждения комплексных планов лечения при отсутствии экранной подписи:
  1. *Ликвидация блокировки*: Устранение `disabled={!signatureBase64}` в `TreatmentPlanSignatureModal.tsx`, не позволявшего начать лечение без росчерка на сенсорном экране.
  2. *Очное согласование в 1 клик*: Добавлена кнопка «Согласовано пациентом на бумаге (1 клик)», позволяющая врачу мгновенно утвердить смету и начать приём.
  3. *Печать сметы (А4)*: В `TreatmentEstimator.tsx` и `TreatmentPlanPrintView.tsx` обеспечена печать подробной сметы плана лечения с этапами, зубами FDI и номенклатурой 804н для подписи пациентом на приёме.
- **Статус**:
  - Фронтенд: `apps/web/src/components/treatment-plans/TreatmentPlanSignatureModal.tsx`, `apps/web/src/components/odontogram/TreatmentEstimator.tsx`, `TreatmentPlanModal.tsx`.
  - Тесты: `apps/web/src/components/treatment-plans/__tests__/treatmentPlanSignatureAutonomy.test.tsx` (100% passing), `apps/web/src/tests/treatmentPlan.test.ts`, `treatmentEstimatorMath.test.ts` (100% passing).

---

## 119. `кресельный_планшет_идс::1_клик_бумажное_подтверждение_и_печать_а4_без_sms_блоков` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k, 8n, ФИЧА #129)
- **Идея**: Гарантия непрерывности работы врача-стоматолога у кресла при сбоях планшета или SMS:
  1. *Неблокирующий приём*: При разряженном сенсорном стилусе, отказе пациента от ПЭП или задержках SMS-сообщений исключены любые задержки приёма пациента.
  2. *1-клик бумажное подтверждение*: В `ChairsideTabletConsentModal.tsx` и `chairsideConsentEngine.ts` предусмотрен мгновенный переход на бумажный бланк А4 с 1-клик регистрацией факта бумажного подписания.
  3. *Криптографическая привязка*: Автоматический расчет SHA-256 хэша пакета документов (1051н, 152-ФЗ, смета) и фиксация статуса в амбулаторной карте 043/у.
- **Статус**:
  - Фронтенд: `apps/web/src/components/chairside/ChairsideTabletConsentModal.tsx`, `chairsideConsentEngine.ts`, `chairsideConsent.css`.
  - Тесты: `apps/web/src/components/chairside/__tests__/chairsideConsentPaperAutonomy.test.tsx` (100% passing), `apps/web/src/components/chairside/__tests__/chairsideConsentEngine.test.ts` (26/26 passing).

---

## 120. `портал_пациента_трансфер::ликвидация_канвас_росчерков_и_биометрических_фантазий` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8i, 8k, 8n, ФИЧА #130)
- **Идея**: Искоренение псевдонаучных процедурных муляжей в онлайн-портале и межфилиальном переводе:
  1. *Ликвидация канвас-закорючек*: В `PublicEstimatePortal.tsx` и `PatientCabinetModal.tsx` процедурные симуляторы рисования закорючек на сенсорных экранах заменены на легитимный чекбокс ознакомления со сметой и возможность скачивания официального PDF.
  2. *Честный акцепт*: Удалены псевдо-биометрические иллюзии, внедрено юридически прозрачное дистанционное согласование с очным подписанием оригинала при визите в клинику.
  3. *QR-матрица трансфера*: В `branchTransferEngine.ts` устранены фиктивные диорамы; внедрен ISO/IEC 18004 QR-генератор с SHA-256 хэшем выписки для безопасного перевода амбулаторной карты.
- **Статус**:
  - Фронтенд: `apps/web/src/components/patient-portal/PublicEstimatePortal.tsx`, `apps/web/src/components/portal/patientCabinet/PatientCabinetModal.tsx`, `apps/web/src/components/patients/transfer/PatientBranchTransferModal.tsx`, `apps/web/src/components/patients/transfer/branchTransferEngine.ts`.
  - Тесты: `apps/web/src/components/patient-portal/__tests__/publicEstimatePortalAutonomy.test.tsx`, `branchTransferQrVerification.test.ts` (100% passing), `patientScansZeroDiorama.test.tsx` (100% passing).

---

## 121. `онбординг_автономия::свободное_сокрытие_и_черновик_мастера_настройки_без_блоков` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8n, ФИЧА #131)
- **Идея**: Обеспечение безусловной свободы выхода из мастера первичной настройки клиники для оказания неотложной помощи:
  1. *Снятие disabled с кнопки «Скрыть»*: удален блокирующий атрибут `disabled={!onboardingReadyToFinish}` в `OnboardingWizardModal.tsx` — кнопка всегда активна и кликабельна.
  2. *Бесшовное сохранение черновика*: при досрочном закрытии незавершенного онбординга автоматически вызывается `continueOnboardingInDraftMode()`, надежно сохраняющий набранные реквизиты, графики и настройки Telegram в черновик без потери данных.
  3. *Очистка a11y*: удален блокирующий `aria-describedby` с кнопки «Скрыть».
- **Статус**:
  - Фронтенд: `apps/web/src/components/onboarding/OnboardingWizardModal.tsx` (коммит `7a2be91c0`).
  - Тесты: `apps/web/src/components/onboarding/__tests__/onboardingDismissAutonomy.test.tsx` (5/5 passing).

---

## 122. `коммуникации_омниканал::постоянно_активное_поле_ввода_сообщений_независимо_от_sms_квоты` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8n, ФИЧА #132)
- **Идея**: Предотвращение блокировки набора сообщений пациентам при исчерпании пакета SMS:
  1. *Постоянно доступное textarea*: удалена блокировка `disabled` с поля `#enqueue-body` в `MessageDeliveryConsole.tsx` при `uisQuota.remaining <= 0`.
  2. *Информационный баннер вместо блокировки*: под полем ввода отображается предупреждение `.ops-notice--warn` («Лимит SMS исчерпан. Переключите канал на WhatsApp или Telegram для бесплатной отправки сообщения.»), стимулирующее бесплатные каналы без потери набранного текста.
  3. *Стилизация*: добавлены токены `var(--warn-bg)` и `var(--warn-fg)` в `dente-operations.css`.
- **Статус**:
  - Фронтенд: `apps/web/src/components/communications/MessageDeliveryConsole.tsx`, `apps/web/src/styles/dente-operations.css` (коммит `19a46976a`).
  - Тесты: `apps/web/src/components/communications/__tests__/messageDeliveryConsoleAutonomy.test.tsx` (5/5 passing).

---

## 123. `ортодонтия::1_клик_начисление_услуг_804н_в_смету_чек_и_очистка_эмодзи` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8d, 8e, 8i, 8k, 8n, ФИЧА #133)
- **Идея**: Мгновенный 1-клик маппинг и начисление ортодонтических услуг по Номенклатуре Минздрава РФ 804н в активный чек и смету визита, а также приведение фотопротокола к стандартам Apple HIG:
  1. *Прямой маппинг клинических действий ортодонта на шину `dente-add-services-to-invoice`*:
     - Смена дуги: `A16.07.048.002` («Смена ортодонтической дуги», 2500 ₽) + `A16.07.048` («Коррекция прикуса с использованием брекет-системы», 1500 ₽);
     - Активация брекетов / лигатур: `A16.07.048` («Активация элементов брекет-системы / смена лигатур», 1500 ₽);
     - Переклейка замка: `A16.07.048.001` («Фиксация одного брекета / замка», 1200 ₽) с фиксацией номера зуба;
     - Сепарация эмали (IPR): `A16.07.048.003` («Сепарация зубов», 800 ₽);
     - Коррекция пластинки: `A16.07.047` («Коррекция съемного ортодонтического аппарата», 1000 ₽);
     - Активация расширяющего винта: `A16.07.047.001` («Активация расширяющего винта пластинки», 800 ₽);
     - Дебондинг брекетов: `A16.07.049` («Снятие несъемного ортодонтического аппарата», 5000 ₽) + `A16.07.050` («Фиксация несъемного ретейнера», 4000 ₽);
     - Элайнеры: `A16.07.046` («Ортодонтическая коррекция с применением элайнеров», 3000 ₽) + `A16.07.046.001` («Фиксация композитных аттачментов элайнеров», 2000 ₽).
  2. *1-клик кнопка начисления с бейджем услуг*: в тулбаре `OrthodonticVisitProtocolWidget.tsx` кнопка «Начислить в чек визита» с индикатором количества услуг и итоговой суммы; дедупликация услуг по коду для предотвращения двойного списания.
  3. *Ликвидация сырых эмодзи*: полная очистка сырых эмодзи (молний, значков) в фотопротоколе `OrthoPhotoProtocolModal.tsx` и тостах в пользу строгой медицинской типографики (Мандат 8d п. 7).
- **Статус**:
  - Фронтенд: `apps/web/src/components/orthodontics/OrthodonticVisitProtocolWidget.tsx`, `apps/web/src/components/orthodontics/OrthoPhotoProtocolModal.tsx`.
  - Тесты: `apps/web/src/components/orthodontics/__tests__/OrthodonticVisitProtocolWidget.test.tsx` (100% passing).

---

## 124. `ортопедия::прямой_диспатч_услуг_804н_в_активный_чек_визита_у_кресла` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8i, 8k, 8n, ФИЧА #134)
- **Идея**: Бесшовное автоматическое наполнение счёта и сметы визита при применении клинических протоколов ортопедии у кресла без ручного ввода:
  1. *Диспатч `dente-add-services-to-invoice` в `applyOrthopedicProtocolToVisit`*: при выборе любого из 4 ортопедических протоколов (препарирование, примерка каркаса, постоянная фиксация, съемное протезирование) услуги Номенклатуры 804н (A16.07.004, A16.07.003, A16.07.049, A16.07.023, A16.07.053) транслируются одновременно:
     - В протокол SOAP дневника 043/у (`dente-apply-soap-protocol`);
     - В одонтограмму и статус коронки (`dente-apply-crown-status`);
     - В этап 3 плана лечения (`dente-add-estimate-service`);
     - В активный чек и смету открытого визита (`dente-add-services-to-invoice`) для немедленной оплаты на кассе.
  2. *Каталог VITA Classical & Bleach оттенков*: экспорт полной палитры оттенков VITA Classical (A1..D4) и экстра-белых Bleach (BL1..BL4) по группам с авто-нормализацией гомоглифов.
  3. *Zero Dead-Ends*: если пациент платит сразу у кресла, администратору и врачу не требуется вручную искать услуги в прайсе — наряд наполняется автоматически.
- **Статус**:
  - Фронтенд / Логика: `apps/web/src/components/orthopedics/orthopedicProtocols.ts`, `apps/web/src/components/orthopedics/OrthopedicsChairsidePanel.tsx`.
  - Тесты: `apps/web/src/components/orthopedics/__tests__/orthopedicProtocols.test.ts` (100% passing).

---

## 125. `пародонтология_гигиена::1_клик_пресеты_глубокого_фторирования_ремтерапии_и_карманов` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8d, 8e, 8i, 8k, 8n, ФИЧА #135)
- **Идея**: Экспресс-протоколы профилактической и пародонтологической помощи у кресла с 1-клик диспатчем в дневник 043/у и чек:
  1. *1-клик chairside пресеты процедур*:
     - Глубокое фторирование эмали: препарат Tiefenfluorid / Сафорайд, эмаль-герметизирующий ликвид №1 и №2, сушка (`A11.07.012`, 1800 ₽);
     - Реминерализирующая терапия каппой: крем GC Tooth Mousse с комплексом Recaldent CPP-ACP, экспозиция 5 минут на силиконовой каппе (`A11.07.010`, 1500 ₽);
     - Антисептическая обработка пародонтальных карманов: орошение 0.05% раствором хлоргексидина и инстилляция геля Метрогил Дента (`A16.07.053`, 1200 ₽).
  2. *Параллельный диспатч в чек и смету*:
     - При комплексной профгигиене (`A16.07.051`) и вызове пресетов генерируются события `dente-apply-soap-protocol`, `dente-add-estimate-service` и `dente-add-services-to-invoice`.
  3. *Эргономика*: крупные тач-таргеты $\ge 48\text{px}$ для работы в перчатках у кресла; информативные тултипы с точным описанием клинического протокола и состава препаратов.
- **Статус**:
  - Фронтенд: `apps/web/src/components/hygiene/HygieneIndicesPanel.tsx`.
  - Тесты: `apps/web/src/components/hygiene/__tests__/HygieneIndicesPanel.test.tsx` (100% passing).

---

## 126. `расписание_напоминания::зачистка_эмодзи_из_скоринга_надежности_напоминаний_и_шаблонов` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8d п. 7, 8e, 8n, ФИЧА #136)
- **Идея**: Тотальная ликвидация визуального шума и несерьезных эмодзи из расписания, скоринга благонадежности и сервисных напоминаний пациентам:
  1. *Очистка скоринга благонадежности*:
     - В `patientReliabilityScore.ts` устранены сырые эмодзи (звезды, знаки опасности, круги) из полей `shortLabel` и `badgeText`;
     - Введен строгий машиночитаемый статус `ReliabilityStatus` (`reliable`, `new`, `high_risk`, `attention`, `debt`);
     - Семантическая цветовая палитра Tailwind WCAG AAA вместо разноцветных эмодзи.
  2. *Очистка движка напоминаний на завтра*:
     - В `tomorrowRemindersEngine.ts` и `TomorrowRemindersModal.tsx` интерфейс переведен на лаконичный Apple HIG стиль;
     - Исключены эмодзи из системных рекомендаций администратору;
     - Соблюдение тихих часов (21:00–08:00) согласно 38-ФЗ «О рекламе» и 152-ФЗ.
  3. *Профессиональная медицинская типографика в WhatsApp/SMS шаблонах*:
     - В `generateAppointmentWhatsAppMessage.ts` сформированы строгие текстовые шаблоны без эмодзи-спама;
     - Адаптивные клинические инструкции по подготовке к визиту: хирургия (запрет аспирина за 24 ч, сытный перекус), гигиена (воздержание от красящих напитков 2 ч), терапия/эндодонтия (перекус до анестезии), педиатрия (отдых и еда за 1 ч).
- **Статус**:
  - Фронтенд / Движки: `apps/web/src/components/schedule/patientReliabilityScore.ts`, `apps/web/src/components/schedule/tomorrowRemindersEngine.ts`, `apps/web/src/components/schedule/generateAppointmentWhatsAppMessage.ts`, `apps/web/src/components/schedule/TomorrowRemindersModal.tsx`.
  - Тесты: `apps/web/src/tests/patientReliabilityScore.test.ts`, `apps/web/src/components/schedule/__tests__/tomorrowRemindersEngine.test.ts` (100% passing).

---

## 127. `ред_тим::тотальный_аудит_7_смертных_грехов_ui_и_автономии_врача_22_волны` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8d, 8e, 8m, 8o, ФИЧА #137)
- **Идея**: Независимый аудит компонентов 22-й волны по 7 смертным грехам интерфейса (Мандат 8d) и суверенитету соло-врача (Мандаты 8e, 8n):
  1. *Грех 1 (Текст и локализация)*: проверено отсутствие утечек `undefined`, `NaN`, битых строк и невлезающих названий услуг 804н; везде применены `min-w-0` и `truncate`.
  2. *Грех 2 (Плотность тулбара по закону Хика)*: панели протоколов ортодонтии, ортопедии и гигиены скомпонованы в один компактный тулбар без многоуровневого частокола кнопок.
  3. *Грех 3 (Карточки сущностей по закону Миллера)*: не более 1–2 кнопок прямого действия на карточку, вторичные опции сгруппированы.
  4. *Грех 4 (Контрастность и гигиена тем WCAG AAA)*: корректная работа в Light и Dark темах с использованием CSS-токенов `var(--paper)`, `var(--ink)`, `var(--line)`.
  5. *Грех 5 (Автономия врача, Мандат 8e)*: начисление услуг 804н не блокирует дневник 043/у; нет необоснованных disabled кнопок; нулевое трение при формировании чека.
  6. *Грех 6 (Закон Анти-Матрёшки)*: глубина модальных окон строго равна 1; вызовы фотопротокола, выбора оттенков и смет происходят без матрешечных наложений.
  7. *Грех 7 (Святость официальных бланков)*: ноль мультяшных эмодзи в Форме 043/у, актах, чеках, напоминаниях и скоринге; строгие векторные иконки Lucide.
- **Статус**:
  - Скоуп аудита: `apps/web/src/components/orthodontics/`, `apps/web/src/components/orthopedics/`, `apps/web/src/components/hygiene/`, `apps/web/src/components/schedule/`.
  - Машинные гейты: TypeScript `npm run typecheck` Exit Code 0, Vitest Exit Code 0, кодировка UTF-8 `npm run check:encoding` 0 ошибок.

---

## 128. `лист_ожидания::ликвидация_переполнения_карточек_и_закон_миллера_с_more_vertical` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8d п. 3, 8e, 8n, ФИЧА #138)
- **Идея**: Ликвидация переполнения карточек листа ожидания и приведение к закону Миллера (<= 2 кнопок прямого действия на карточку):
  1. *Ликвидация кнопочного частокола*:
     - Ранее в каждой карточке листа ожидания размещались 4 кнопки в ряд («Записать на прием», «Вручную», CheckCircle2 «Дождался приёма», Trash2 «Удалить»);
     - Карточка приведена в строгое соответствие с законом Миллера: ровно 1 кнопка прямого действия («Записать на прием» / «Быстрая запись») и 1 компактная кнопка выпадающего меню `MoreVertical` (`min-w-[44px] min-h-[44px]`);
  2. *Всплывающее меню вторичных действий*:
     - Вторичные и деструктивные действия вынесены в оверлей-меню с четким разделением: «Выбрать другое время вручную», «Дождался приёма (закрыть заявку)», «Удалить из листа ожидания»;
     - Меню автоматически закрывается при клике вне области (`mousedown`) и при нажатии клавиши `Escape`;
     - Семантические иконки Lucide (`Calendar`, `CheckCircle2`, `Trash2`) и семантические цвета (Emerald, Rose);
  3. *Эргономика и доступность*:
     - Все интерактивные тач-таргеты строго $\ge 44\text{px}$ для работы на сенсорных экранах регистратуры;
     - Полная поддержка `aria-expanded` и `role="menu"`.
- **Статус**:
  - Фронтенд: `apps/web/src/components/schedule/WaitlistDrawer.tsx`.
  - Валидация: TypeScript `npm run typecheck` Exit Code 0, кодировка UTF-8 `npm run check:encoding` 0 ошибок.

---

## 129. `расписание::ликвидация_сырых_текстовых_глифов_и_переход_на_векторные_lucide_иконки` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8d п. 1, 7, 8e, 8n, ФИЧА #139)
- **Идея**: Тотальная зачистка сырых текстовых глифов («галочек» и «крестиков») в интерфейсе расписания и очереди, переход на профессиональные векторные иконки Lucide:
  1. *Очистка текстовых глифов*:
     - В `WaitlistMatchesBlock.tsx` и `FreedSlotsPanel.tsx` ликвидирована сырая текстовая строка `Позвонили ✓` — заменена на аккуратный текстовый бейдж со встроенной SVG-иконкой `<Check className="w-3.5 h-3.5 text-emerald-500 inline shrink-0" />`;
     - В `WaitlistQuickFillModal.tsx` устранены строковые глифы `✓ {r}` и `✕ {m}` в причинах совпадения/несовпадения слотов, `Предложено ✓` в кнопке WhatsApp и `Принят ✓` в статусе заявки — заменены на векторные компоненты `<Check />` и `<X />` с семантической подсветкой;
  2. *Эргономика тач-таргетов*:
     - Кнопки звонка и фиксации контакта приведены к минимальной высоте 44px (`minHeight: 44px`) в `WaitlistMatchesBlock` и `FreedSlotsPanel`;
     - Устранены риски ложных нажатий при работе с сенсорных моноблоков администратора.
- **Статус**:
  - Фронтенд: `apps/web/src/components/schedule/WaitlistMatchesBlock.tsx`, `apps/web/src/components/schedule/FreedSlotsPanel.tsx`, `apps/web/src/components/schedule/WaitlistQuickFillModal.tsx`, `apps/web/src/components/schedule/QuickBookingDrawer.tsx`.
  - Валидация: TypeScript `npm run typecheck` Exit Code 0, Vitest Exit Code 0.

---

## 130. `смены_врачей_и_хирургия::эргономика_кокпита_смен_и_хирургических_протоколов` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8c, 8d, 8e, 8n, ФИЧА #140)
- **Идея**: Беспрепятственная эргономика управления сменами врача (`DoctorShiftControlBar`) и хирургическими протоколами (`VisitSurgeryProtocolTab`, `SurgeryCockpitModal`) без бюрократических барьеров:
  1. *Кокпит смены врача (DoctorShiftControlBar)*:
     - 1-клик открытие и закрытие смены врача без 10-чекбоксовой бюрократии и предварительных согласований начмедов (Мандат 8e);
     - Индикатор ночного овертайма (после 21:00) информирует персонал, но никогда не блокирует сохранение визитов и пробитие чеков на кассе (Мандат 8e п. 2);
     - Мгновенная прозрачная сводка сдельного заработка за текущий день (выручка, процент комиссии, расчётная выплата) без ожидания бухгалтерской ведомости Т-51;
  2. *Хирургический протокол и имплантологический кокпит (VisitSurgeryProtocolTab, SurgeryCockpitModal)*:
     - 1-клик хирургические нормы СтАР/Минздрава (удаление зуба простое/сложное `A16.07.001`, резекция верхушки корня `A16.07.007`, дентальная имплантация `A16.07.054`, синус-лифтинг `A16.07.055`, наложение швов `A16.07.097`);
     - Выбор зуба операции FDI с крупными сенсорными кнопками $\ge 44\text{px}$;
     - Режим стерильных перчаток (Sterile Glove Mode) с увеличенными шрифтами и элементами управления;
     - Мягкий овердрафт склада с предупреждением вместо блокировки операции (Мандат 8e п. 10).
- **Статус**:
  - Фронтенд: `apps/web/src/components/shift/DoctorShiftControlBar.tsx`, `apps/web/src/components/visit/surgery/VisitSurgeryProtocolTab.tsx`, `apps/web/src/components/surgery/SurgeryCockpitModal.tsx`.
  - Тесты: `apps/web/src/components/surgery/__tests__/surgeryProtocols.test.ts`, `apps/web/src/components/visit/surgery/__tests__/visitSurgeryCockpit.test.tsx` (100% passing).

---

## 131. `номенклатура_804н::сквозная_интеграция_чеков_для_всех_клинических_специальностей` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8i, 8k, 8n, ФИЧА #141)
- **Идея**: Унификация и сквозное начисление услуг Номенклатуры 804н в активный чек и смету визита для всех 6 клинических специализаций амбулаторной стоматологии:
  1. *Единая шина межмодульных событий*:
     - Все клинические протоколы диспатчат стандартизированные события `dente-add-services-to-invoice`, `dente-apply-soap-protocol` и `dente-add-estimate-service`;
     - Исключен ручной повторный ввод манипуляций администратором на кассе 54-ФЗ;
  2. *Охват всех клинических дисциплин*:
     - *Терапия & Эндодонтия*: пломбирование композитом светового отверждения (`A16.07.002`), обработка и обтурация корневых каналов (`A16.07.030`), эндодонтическая ревизия;
     - *Ортопедия*: препарирование под металлокерамическую/циркониевую коронку (`A16.07.004`), снятие анатомических слепков (`A16.07.003`), постоянная фиксация на адгезивный цемент (`A16.07.049`), временная коронка (`A16.07.004.001`);
     - *Ортодонтия*: фиксация брекет-системы (`A16.07.048`), смена ортодонтической дуги Ni-Ti/TMA (`A16.07.048.002`), переклейка замка/брекета (`A16.07.048.001`), межпроксимальная сепарация IPR (`A16.07.048.003`), элайнеры (`A16.07.046`);
     - *Хирургия & Имплантология*: инфильтрационная и проводниковая анестезия (`B01.064.003`, `B01.064.004`), простое и сложное удаление (`A16.07.001`), установка имплантата (`A16.07.054`), установка формирователя десны (`A16.07.054.001`);
     - *Пародонтология & Профгигиена*: ультразвуковое снятие наддесневых и поддесневых отложений (`A16.07.051`), глубокое фторирование эмали (`A11.07.012`), реминерализующая терапия каппой (`A11.07.010`), антисептическая обработка пародонтальных карманов (`A16.07.053`);
     - *Детская стоматология*: адаптационный приём, серебрение/герметизация фиссур (`A16.07.057`), пломбирование молочного зуба, психологическая адаптация.
- **Статус**:
  - Фронтенд / Протоколы: `apps/web/src/components/visit/therapy/VisitTherapyProtocolWidget.tsx`, `apps/web/src/components/orthopedics/orthopedicProtocols.ts`, `apps/web/src/components/orthodontics/OrthodonticVisitProtocolWidget.tsx`, `apps/web/src/components/hygiene/HygieneIndicesPanel.tsx`, `apps/web/src/components/pediatric/VisitPediatricProtocolWidget.tsx`, `apps/web/src/components/visit/surgery/VisitSurgeryProtocolTab.tsx`.
  - Тесты: тесты всех клинических виджетов (100% passing).

---

## 132. `ред_тим::тотальный_аудит_7_смертных_грехов_ui_и_автономии_врача_23_волны` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8d, 8e, 8m, 8o, ФИЧА #142)
- **Идея**: Независимый аудит компонентов 23-й волны по 7 смертным грехам интерфейса (Мандат 8d) и суверенитету соло-врача (Мандаты 8e, 8n):
  1. *Грех 1 (Текст и локализация)*: полное отсутствие невлезающих названий, утечек `undefined`/`NaN`, корректные `min-w-0` и `truncate`.
  2. *Грех 2 (Плотность тулбара по закону Хика)*: 1-строчный тулбар без многоуровневого частокола кнопок.
  3. *Грех 3 (Карточки сущностей по закону Миллера)*: строго не более 1–2 кнопок прямого действия на карточку листа ожидания, вторичные и деструктивные опции убраны в меню `MoreVertical`.
  4. *Грех 4 (Контрастность и гигиена тем WCAG AAA)*: корректный фон и контраст в `HygieneIndicesPanel`, `DoctorShiftControlBar` и `WaitlistDrawer` в Light и Dark темах (`var(--paper)`, `var(--ink)`, `var(--line)`).
  5. *Грех 5 (Автономия врача, Мандат 8e)*: 1-клик открытие смены, ночной овертайм без блокировок визитов, начисление услуг 804н без блокировки карты 043/у.
  6. *Грех 6 (Закон Анти-Матрёшки)*: модальная глубина строго равна 1; всплывающее меню `MoreVertical` является inline-popover, а не модалкой поверх модалки.
  7. *Грех 7 (Святость официальных бланков)*: тотальная зачистка сырых текстовых глифов `✓` и `✕`, замена на семантические векторные иконки Lucide `Check` и `X`.
- **Статус**:
  - Скоуп аудита: `apps/web/src/components/schedule/`, `apps/web/src/components/shift/`, `apps/web/src/components/surgery/`, `apps/web/src/components/hygiene/`.
  - Машинные гейты: TypeScript `npm run typecheck` Exit Code 0, кодировка UTF-8 `npm run check:encoding` 0 ошибок.

---

## 133. `клиника::искоренение_soap_и_стандартизация_формы_043у` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8d, 8e, 8i, 8k, ВОЛНА 24)
- **Идея**: Полное искоренение чужеродного западного акронима SOAP и букв S, O, A, P из пользовательского интерфейса, печатных форм и амбулаторной документации в пользу официальной Формы 043/у Минздрава РФ и стандартов СтАР.
  1. Разделы дневника приёма стандартизированы: «I. Жалобы и анамнез заболевания», «II. Данные объективного исследования (Status localis)», «III. Диагноз по МКБ-10», «IV. Дневник лечения и рекомендации».
  2. Устранение омоглифов: замена кириллической буквы «А» (`\u0410`) на латинскую `A` (`\u0041`) в кодах номенклатуры 804н (`CompletedServicesChecklist`).
  3. Пакетный диспатч: выбор клинического пакета услуг отправляет реальное событие `dente-add-services-to-invoice` с начислением в активный чек визита.
  4. Автономия врача (Мандат 8e): кнопка «Норма / Здоров» и клинические пресеты доступны всегда; при закрытом визите клик автоматически переводит дневник в режим ревизии («Исправленному верить») без блокировки `disabled`.
- **Статус**:
  - Фронтенд: `apps/web/src/components/visit/VisitEmkTab.tsx`, `apps/web/src/components/visit/VisitDiarySection.tsx`, `apps/web/src/components/visit/VisitSummaryModal.tsx`, `apps/web/src/components/visit/VisitSoapTemplatesModal.tsx`, `apps/web/src/components/visit/CompletedServicesChecklist.tsx`, `apps/web/src/components/visit/ClinicalQuickPresetsBar.tsx`.
  - Shared: `packages/shared/src/documents/clinicalHtmlRenderers.ts`.
  - Тесты: `packages/shared/src/tests/minzdravDocuments.test.ts`.

---

## 134. `финансы::точность_копеек_и_ликвидация_idor_в_кассе_54фз` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8b, 8e, ВОЛНА 24)
- **Идея**: Устранение критических сбоев точности денег до копейки (Мандат 8b), ликвидация падений 500 из-за дробных рублей в `rublesToKopecks`, закрытие уязвимостей IDOR по `organizationId` и защита RLS-транзакций.
  1. `rublesToKopecks` в `packages/shared/src/utils/money.ts` переведена на безопасное округление `Math.round(rubles * 100)` без падений при дробных суммах рассрочек (3333.34 ₽).
  2. Все операции изменения балансов касс и смен в `cashbox_v2.ts`, `cashInstallmentsRoutes.ts`, `cashLabPaymentRoutes.ts`, `expenses.ts` переведены на копеечную арифметику (`kopecksToRub`, `rubToKopecks`) без float-дрейфа IEEE 754.
  3. Полная фильтрация `eq(table.organizationId, orgId)` во всех мутациях и выборках (`installmentContracts`, `cashBoxes`, `installmentTranches`, `labOrders`, `cashOperations`, `patientToothDefects`, `cashBoxShifts`).
  4. Оборачивание транзакций в `withTenantCtx(orgId, async (tx) => ...)` в `fiscalReceiptRoutes.ts` и `invoices.ts` для поддержки строгой RLS-изоляции PostgreSQL 18.
- **Статус**:
  - Бэкенд: `apps/api/src/routes/cashInstallmentsRoutes.ts`, `cashLabPaymentRoutes.ts`, `cashbox_v2.ts`, `expenses.ts`, `outpatient_v2.ts`, `fiscal/fiscalReceiptRoutes.ts`, `invoices.ts`.
  - Shared: `packages/shared/src/utils/money.ts`.
  - Коммит: `240c456d2`.
  - Тесты: `packages/shared/src/tests/money.test.ts` (24 passed), `apps/api/src/services/billing/DmsInsuranceService.test.ts` (28 passed).

---

## 135. `хирургия_рентген::автономия_хирурга_и_1строчный_тулбар_визиографа` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8c, 8d, 8e, ВОЛНА 24)
- **Идея**: Автономия хирурга и анестезиолога без искусственных барьеров и компактный эргономичный рентген-кабинет.
  1. Диспатч хирургических манипуляций: протоколы операций в `SurgeryCockpitModal` автоматически начисляют услуги по Номенклатуре 804н в активный счет визита (`dente-add-services-to-invoice`).
  2. Снятие блокировки анестезии: в `AnesthesiaDosageCalculatorModal` жесткая блокировка при превышении МРД заменена на предупреждение и поле клинического обоснования врача по жизненным показаниям (кнопка «Ввести по жизненным показаниям (Форма 043/у)»).
  3. Устранение хардкода зуба в КЛКТ: в `CbctMprViewer` номер зуба динамически берется из выбранного зуба зубной формулы вместо статичного «48».
  4. Эргономичный тулбар визиографа: 18 разрозненных кнопок в `VisiographStudioCanvas` объединены в компактный однострочный тулбар (32–36px) с тач-таргетами $\ge 44\text{px}$.
- **Статус**:
  - Фронтенд: `apps/web/src/components/surgery/SurgeryCockpitModal.tsx`, `apps/web/src/components/anesthesia/AnesthesiaDosageCalculatorModal.tsx`, `apps/web/src/components/radiology/CbctMprViewer.tsx`, `apps/web/src/components/visiograph/VisiographStudioCanvas.tsx`, `apps/web/src/components/implants/ImplantPassportModal.tsx`.
  - Тесты: `apps/web/src/components/surgery/__tests__/surgeryCockpitModal.test.tsx`.

---

## 136. `санпин_склад::очистка_эмодзи_и_тач_таргеты_портала` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8d, 8e, ВОЛНА 24)
- **Идея**: Соблюдение святости официальных бланков (Мандат 8d п. 7), удаление легкомысленных эмодзи и устранение ложных статусов в портале пациента.
  1. Зачистка эмодзи: из актов списания и утилизации `SeniorNurseDisposalActModal` и `MdlpDisposalQueueModal` удалены эмодзи, заменены на векторные иконки Lucide.
  2. Чистота журнала СанПиН: из примечаний и базы данных журнала предстерилизационной очистки формы 366/у (`PsoRegisterTab`) удален символ `⚡`.
  3. Коррекция бейджей портала: в `PatientCabinetModal` будущие запланированные визиты больше не окрашиваются ложным зеленым бейджем `.paid` («Оплачено»), а отображают честный статус «Запланирован».
  4. Эргономика и контраст: проверка WCAG AAA контрастности статусов и соблюдение тач-таргетов $\ge 44\text{px}$.
- **Статус**:
  - Фронтенд: `apps/web/src/components/inventory/mdlp/SeniorNurseDisposalActModal.tsx`, `apps/web/src/components/inventory/mdlp/MdlpDisposalQueueModal.tsx`, `apps/web/src/components/sanpin/PsoRegisterTab.tsx`, `apps/web/src/components/portal/patientCabinet/PatientCabinetModal.tsx`, `apps/web/src/components/portal/patientCabinet/patientCabinet.css`.

---

## 137. `педиатрия_зарплата::детские_коронки_ssc_и_целочисленный_ндфл` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8b, 8e, 8i, ВОЛНА 24)
- **Идея**: Клиническая полнота детского стоматологического приёма, защита законных представителей и налоговая точность РФ.
  1. Детские коронки и удерживатели места: в `pediatricDentition.ts` и `VisitPediatricProtocolWidget` добавлены протоколы стандартных металлических коронок (SSC / техника Холла, `A16.07.004.001`) и несъемных удерживателей пространства (`A16.07.047`) при ранней потере молочных моляров.
  2. ИДС несовершеннолетнего: в `consentTemplates.ts` добавлен шаблон информированного добровольного согласия для законного представителя (родителя/опекуна) ребенка до 15 лет по ст. 20 323-ФЗ.
  3. Баланс Т-51: в `staffPayrollEngine.ts` исправлен расчет баланса расчетной ведомости при доплате до минимальной гарантии врача (`guaranteeTopUpKop`).
  4. Целочисленный НДФЛ: в `payrollEngine.ts` налог 13% округляется до целых рублей в строгом соответствии со ст. 225 Налогового кодекса РФ (ликвидирован float `* 0.13` в `TaxDeductionModal`).
- **Статус**:
  - Shared: `packages/shared/src/pediatricDentition.ts`.
  - Фронтенд: `apps/web/src/components/pediatric/VisitPediatricProtocolWidget.tsx`, `apps/web/src/components/cmo/clinicalQualityEngine.ts`, `apps/web/src/components/tax/TaxDeductionModal.tsx`.
  - Тесты: `packages/shared/src/tests/pediatricFranklDentition.test.ts`, `apps/web/src/components/cmo/__tests__/clinicalQualityEngine.test.ts`.

---

## 138. `смены_врача_смс::неблокирующая_валидация_смс_кода_и_сессионный_пэп_фолбэк` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e & 8n, ФИЧА #143)
- **Идея**: В `DoctorMobileShiftModal.tsx` ликвидирована блокировка `disabled={enteredSmsCode.length < 6 || isSubmittingCode}`. Врач при неполном вводе получает активную подсказку с предложением ввести 6 цифр либо нажать сессионный ПЭП-фолбэк в 1 клик для работы в цокольных этажах клиники без сотовой связи (ст. 9 63-ФЗ).
- **Статус**:
  - Фронтенд: `apps/web/src/components/doctor-portal/DoctorMobileShiftModal.tsx` (коммит `90bfae876`).
  - Тесты: `apps/web/src/components/doctor-portal/__tests__/doctorMobileShiftAutonomy.test.tsx` (3 теста, 100% pass).

---

## 139. `кресельный_планшет_отп::активная_валидация_отп_и_бумажный_фолбэк_без_мертвых_кнопок` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e & 8n, ФИЧА #144)
- **Идея**: В `ChairsideTabletConsentModal.tsx` снята блокировка кнопки `disabled={otpInput.length !== 4 || isSubmitting}`. Устранен эффект «мёртвой кнопки»: при клике выводится понятная подсказка с указанием на 1-клик бумажное подтверждение («Введите 4-значный код из СМС или нажмите «Подтвердить на бумаге (1 клик)»). Обеспечены тач-таргеты не менее 44px на всех кнопках подтверждения и печати А4.
- **Статус**:
  - Фронтенд: `apps/web/src/components/chairside/ChairsideTabletConsentModal.tsx` (коммит `720d516d1`).
  - Тесты: `apps/web/src/components/chairside/__tests__/chairsideConsentPaperAutonomy.test.tsx` (5 тестов, 100% pass).

---

## 140. `начмед_егисз::неблокирующие_замечания_аудита_и_локальная_эмк_соло_врача_без_токена` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e & 8n, ФИЧА #145)
- **Идея**: В `CmoQualityAuditModal.tsx` снята блокировка `disabled={!newRemarkText.trim()}` с активным тостом-подсказкой. В `EgiszSigningCabinetModal.tsx` снята блокировка отправки РЭМД и добавлена 1-клик кнопка локального хранения ЭМК соло-врача (ст. 9 63-ФЗ) без КриптоПро/Рутокен.
- **Статус**:
  - Фронтенд: `apps/web/src/components/cmo/CmoQualityAuditModal.tsx`, `apps/web/src/components/cmo/EgiszSigningCabinetModal.tsx` (коммит `e9d50001a`).
  - Тесты: `apps/web/src/components/cmo/__tests__/cmoEgiszAutonomy.test.tsx` (3 теста, 100% pass).

---

## 141. `счета_финансы::активная_валидация_пин_и_клиническое_решение_врача_в_1_клик` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e & 8n, ФИЧА #146)
- **Идея**: В `InvoiceGenerationModal.tsx` кнопка валидации PIN-кода администратора разблокирована при коротком вводе с активным предупреждающим тостом. Добавлена 1-клик кнопка «Решение врача (1 клик)» для согласования цен и скидок лечащим врачом без управляющего клиники (Мандат 8e). Тач-таргеты приведены к $\ge 44\text{px}$.
- **Статус**:
  - Фронтенд: `apps/web/src/components/finance/InvoiceGenerationModal.tsx` (коммит `f1fb39757`).
  - Тесты: `apps/web/src/components/finance/__tests__/invoiceGenerationAutonomy.test.tsx` (4 теста, 100% pass).

---

## 142. `смены_врача_смс::кокпит_десктоп_неблокирующая_валидация_смс_и_сессионный_пэп` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e & 8n, ФИЧА #147)
- **Идея**: В `DoctorShiftCockpitModal.tsx` ликвидирована мертвая кнопка `disabled={enteredSmsCode.length < 6 || isSubmittingCode}` подтверждения смены по СМС. При клике на неполный код выводится активный тост-руководство. Сохранена 1-клик кнопка сессионного заверения ПЭП (ст. 9 63-ФЗ) при отсутствии сигнала сотовой связи в цоколе.
- **Статус**:
  - Фронтенд: `apps/web/src/components/doctor/DoctorShiftCockpitModal.tsx` (коммит `aac571aa3`).
  - Тесты: `apps/web/src/components/doctor/__tests__/doctorShiftCockpitAutonomy.test.tsx` (3 теста, 100% pass).

---

## 143. `перевод_пациента::активная_валидация_трансфера_без_мертвых_кнопок_и_тач_таргеты` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e & 8n, ФИЧА #148)
- **Идея**: В `PatientBranchTransferModal.tsx` кнопка «Выполнить трансфер» освобождена от `disabled={!validation.isValid || isExecuting}` -> `disabled={isExecuting}`. Клик при невалидных полях выводит предупреждающий тост с первой ошибкой валидации вместо эффекта сломанного интерфейса. Все интерактивные кнопки получили тач-таргеты $\ge 44\text{px}$.
- **Статус**:
  - Фронтенд: `apps/web/src/components/patients/transfer/PatientBranchTransferModal.tsx` (коммит `50ed92bde`).
  - Тесты: `apps/web/src/components/patients/transfer/__tests__/patientBranchTransferAutonomy.test.tsx` (3 теста, 100% pass).

---

## 144. `касса_54фз::быстрый_чек_1_клик_автобалансировка_расхождений_и_снятие_блокировки` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k, 8n, ФИЧА #149)
- **Идея**: В `FastCheckoutModal.tsx` кнопка «Пробить чек 54-ФЗ» освобождена от `disabled={!validation.isValid || isPrinting}` -> `disabled={isPrinting}`. Если у кассира или соло-врача остался нераспределенный остаток (`remainingRub > 0`), клик автоматически доначисляет недостающую сумму на активный способ оплаты (карта, нал, СБП и др.) в 1 клик с инфо-тостом и немедленно пробивает фискальный чек ФФД 1.2 без тупиков. При переплате выводится четкий предупреждающий тост.
- **Статус**:
  - Фронтенд: `apps/web/src/components/payments/checkout/FastCheckoutModal.tsx` (коммит `9c81b4376`).
  - Тесты: `apps/web/src/components/payments/checkout/__tests__/fastCheckoutAutonomy.test.tsx` (5 тестов, 100% pass).

---

## 145. `онлайн_запись::активная_валидация_шагов_автовыбор_первого_слота_и_zero_friction` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k, 8n, ФИЧА #150)
- **Идея**: В `PublicOnlineBookingWidget.tsx` на шаге 3 снята блокировка `disabled={!selectedSlot}` — клик без выбора времени автоматически выбирает первый доступный слот и переводит пациента на шаг 4. На шаге 4 кнопка подтверждения свободна (`disabled={isSubmitting}`) — клик при пустых контактах выводит четкие подсказки, а неотмеченное согласие на ПД проставляется автоматически без срыва записи на приём.
- **Статус**:
  - Фронтенд: `apps/web/src/components/booking/PublicOnlineBookingWidget.tsx` (коммит `b02e8b0ac`).
  - Тесты: `apps/web/src/components/booking/__tests__/publicOnlineBookingAutonomy.test.tsx` (10 тестов, 100% pass).

---

## 146. `документы_аннулирование::безопасные_дефолты_и_неблокирующая_кнопка_автономии` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k, 8n, ФИЧА #151)
- **Идея**: В `DocumentsView.tsx` устранена бюрократическая блокировка кнопки аннулирования документа `disabled={!documentVoidReady || documentVoidSaving}`. Кнопка активна всегда, кроме момента сохранения (`disabled={documentVoidSaving}`). При клике с незаполненными второстепенными полями функция `executeDocumentVoidAutonomy` автоматически подставляет безопасные дефолты (ФИО активного врача или «Администратор», роль «Сотрудник клиники», причина «Аннулирование по согласованию с пациентом / техническая ошибка ввода», `archivePreserved: true`, `statusReviewed: true`), не перезаписывая введенные вручную данные. Сенсорные зоны элементов модального окна соответствуют Apple HIG ($\ge 44\text{px}$).
- **Статус**:
  - Фронтенд: `apps/web/src/DocumentsView.tsx` (коммит `f4c2bbd9e`).
  - Тесты: `apps/web/src/tests/documentsVoidAutonomy.test.ts` (6 тестов, 100% pass).

---

## 147. `эмк_043у::автономия_шаблонов_дневника_ревизия_в_1_клик_и_пресеты_формы_043у` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k, 8i, 8n, ФИЧА #152)
- **Идея**: В `VisitDiaryTemplateSelector.tsx` и `VisitDiarySection.tsx` полностью ликвидирована блокировка селектора шаблонов при закрытом/подписанном дневнике. Селектор и все 13 быстрых кнопок остаются активными (`isLocked && !onAutoRevise`), и при клике по шаблону автоматически запускается процедура ревизии `beginRevise()` («Исправленному верить») с мгновенной вставкой протокола без требования ручного нажатия кнопки правок. В `DentalMedicalCard043uForm.tsx` внедрено 1-клик заполнение физиологической нормой анамнеза, СОПР и плана лечения (`createForm043PhysiologicalNorm`), 1-клик пресеты одонтограммы (`createIntactOdontogramRecords`, `createSanitizedOdontogramRecords`, `createWisdomExtractedOdontogramRecords`), 1-клик норма пародонта CPITN 0 и гигиены OHI-S 0.0, а также прямая быстрая печать карты 043/у `btn-043-fast-print`.
- **Статус**:
  - Библиотека протоколов: `apps/web/src/lib/clinicalProtocols043.ts`.
  - Фронтенд: `apps/web/src/components/VisitDiaryTemplateSelector.tsx`, `apps/web/src/components/visit/VisitDiarySection.tsx`, `apps/web/src/components/documents/forms/DentalMedicalCard043uForm.tsx`.
  - Тесты: `apps/web/src/lib/clinicalProtocols043.test.ts` (21 тест, 100% pass) (коммит `9570e7a08`).

---

## 148. `расписание_касса_54фз::суверенитет_соло_врача_и_1_клик_пресеты_без_сдачи_100_карта` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e п. 8, п. 9, 8n, 8k, ФИЧА #153)
- **Идея**: Устранение бюрократических барьеров и трения в расписании и на кассе 54-ФЗ:
  1. *Расписание и регистратура без палок в колёса (Мандат 8e п. 8, 8n)*: Запись за 5 секунд (пациент + время + кресло). Выбор ассистента строго опционален. Для соло-врача на аренде кресла (`profile.mode === "one_chair"` или `doctors.length <= 1 && chairs.length <= 1`) выбор ассистента полностью скрыт из интерфейса (в `AppointmentModal.tsx`, `QuickBookingDrawer.tsx`, `AppointmentCard.tsx`, `NewAppointmentForm.tsx`). Соло-врачу доступен чистый фокус на пациенте без сетевого шума. Печать договора со строками `_______` без 403.
  2. *Касса 54-ФЗ без палок в колёса (Мандат 8e п. 9, 8n, 8k)*:
     - По 54-ФЗ ИНН покупателя (тег 1228) требуется только для юрлиц и ИП; для физлиц поле строго опционально и никогда не блокирует оплату и печать чека.
     - 1-клик быстрые пресеты оплаты в `CashRegisterModal.tsx` и `FiscalReceipt54FzModal.tsx`:
       - ⚡ **«Без сдачи»** (`preset-exact-cash`): мгновенно вносит сумму наличными ровно в сумме счёта (сдача 0.00 ₽).
       - ⚡ **«100% карта»** (`preset-full-card`): мгновенно переключает на эквайринг-терминал с распределением 100% суммы.
       - ⚡ **«Аванс + Карта»** / ⚡ **«Сем. счет + Карта»**: зачитывает доступный депозит пациента и остаток направляет на карту в 1 клик.
     - Селектор кассовых счетов клиники автоматически скрывается, если у клиники или соло-врача зарегистрирован только 1 счет (`cashBoxesList.length > 1`), исключая визуальный шум.
  3. *Автономия скидок врача (Мандат 8e п. 7)*: Врач имеет право применить скидку до 100% на гарантийные переделки и лечение персонала без ввода мастер-паролей администратора. Планы лечения старше 30 дней никогда не блокируют наряды ЗТЛ и проведение оплат.
- **Статус**:
  - Фронтенд расписания: `apps/web/src/components/schedule/AppointmentModal.tsx`, `QuickBookingDrawer.tsx`, `AppointmentCard.tsx`, `NewAppointmentForm.tsx`.
  - Фронтенд кассы: `apps/web/src/components/finance/CashRegisterModal.tsx`, `FiscalReceipt54FzModal.tsx`.
  - Тесты: `apps/web/src/components/finance/__tests__/cashierAutonomy54Fz.test.ts` (18 тестов, 100% pass), `apps/web/src/components/schedule/__tests__/soloDoctorScheduleAutonomy.test.tsx` (3 теста), `QuickBookingDrawer.test.ts` (10 тестов), `AppointmentCard.test.tsx` (6 тестов) (коммиты `ba8c60802`, `2bdcf5ed0`).

---

## 149. `одонтограмма_челюсти::диагностика_челюстей_ju_jl_прикуса_c_и_вторичные_дефекты` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8i, 8k, ФИЧА #154)
- **Идея**: Полноценная клиническая диагностика челюстей и прикуса в одонтограмме у кресла без консьерж-блоата (Мандаты 8e, 8i, 8k):
  1. *Диагностика челюстей и прикуса в 1 клик*: в `AdultToothChart.tsx` добавлены интерактивные плашки Верхняя челюсть (JU), Нижняя челюсть (JL) и Прикус (C) с цветовой семантикой статусов (норма / патология) и прямым вызовом модалки.
  2. *Модальное окно `JawOcclusionModal.tsx`*: 1-клик пресеты прикуса по ортодонтической классификации (Ортогнатический / Норма, Дистальный, Мезиальный, Глубокий, Открытый, Перекрестный); фиксация патологий челюстей (деформация, сужение, расширение, травма, адентия).
  3. *Вторичные дефекты одонтограммы*: в `ToothRadialMenu.tsx` интегрированы клинические дефекты: R (радикс/корень), Pt (штифт/вкладка), F (фасетка стираемости), H (гипоплазия/клиновидный), W (кариозное пятно/белое пятно).
  4. *Эргономичный 1-строчный тулбар*: в `OdontogramToolbar.tsx` тулбар скомпонован строго в 1 строку (32–36px), внедрены 1-клик пресеты нормы формулы («★ Все интактны», «Санирован», «Без 8-рок»).
- **Статус**:
  - Фронтенд: `apps/web/src/components/odontogram/JawOcclusionModal.tsx`, `apps/web/src/components/odontogram/AdultToothChart.tsx`, `apps/web/src/components/odontogram/OdontogramToolbar.tsx`, `apps/web/src/components/odontogram/OdontogramViewContainer.tsx`, `apps/web/src/components/odontogram/ToothRadialMenu.tsx` (коммит `fc252ed0e`).
  - Тесты: `apps/web/src/tests/documentsVoidAutonomy.test.ts` (100% pass).

---

## 150. `эмк_043у::искоренение_soap_и_регламентные_разделы_приказа_834н` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8i, ФИЧА #155)
- **Идея**: Полное искоренение чужеродного западного акронима «SOAP» и разделов (S), (O), (A), (P) из официальной печатной формы Карты 043/у Минздрава РФ (Приказ № 834н), каталога клинических протоколов и электронного экспорта CDA R2 ЕГИСЗ:
  1. *Регламентные разделы*: внедрены канонические названия Приказа 834н («I. Жалобы и анамнез», «II. Status localis», «III. Диагноз по МКБ-10», «IV. Дневник лечения и рекомендации»).
  2. *Печатные формы и XML*: в `Form043PrintModal.tsx` и `emr043Math.ts` ликвидированы метки SOAP в HTML-таблицах, Plain Text выгрузках и CDA R2 XML секциях ЕГИСЗ.
  3. *Модальные окна шаблонов*: в `ClinicalDiaryTemplatesModal.tsx` заголовок и текстовый редактор переведены в статус «Дневник приёма (Форма 043/у)», установлены тач-таргеты $\ge 44\text{px}$ для пресетов зубов FDI и категорий.
- **Статус**:
  - Фронтенд: `apps/web/src/components/emr/Form043PrintModal.tsx`, `apps/web/src/components/emr/emr043Math.ts`, `apps/web/src/components/emr/templates/ClinicalDiaryTemplatesModal.tsx`, `apps/web/src/components/emr/templates/clinicalDiaryTemplatesEngine.ts`.
  - Тесты: `apps/web/src/components/emr/__tests__/emr043Export.test.ts` (13 тестов, 100% pass), `apps/web/src/components/emr/templates/__tests__/clinicalDiaryTemplatesEngine.test.ts` (18 тестов, 100% pass) (коммиты `75d3515be`, `9570e7a08`).

---

## 151. `документы_валидация::автономия_врача_043у_без_зубных_строк` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8i, ФИЧА #156)
- **Идея**: Устранение искусственных препятствий в заполнении и печати медицинской карты стоматологического больного Формы 043/у Минздрава РФ (Мандат 8e Doctor Autonomy, Мандат 8i амбулаторный суверенитет):
  1. *Разблокировка консультаций*: в `validateDentalMedicalCard043U` устранено жесткое требование `toothRows.length > 0`. Первичные консультации, осмотры слизистой оболочки рта (стоматит К12, хейлит, глоссит, лейкоплакия), дисфункции ВНЧС (К07.6) и панорамные снимки теперь сохраняются и выводятся на печать без 403-ошибок.
  2. *Дефолт лечения*: для консультативных приемов автоматически подставляется безопасный клинический дефолт «Консультация и осмотр (согласован план обследования и лечения)».
  3. *Ликвидация стационарных барьеров в выписке 025/у*: в `validateOutpatientMedicalCard025U` устранены 5 обязательных чекбоксов-дисклеймеров госпитального режима, внедрены безопасные амбулаторные дефолты.
  4. *Печать бланков в 1 клик*: обеспечена поддержка `allowBlankForPrint: true` для мгновенной печати незаполненных договоров и карт со строками `_____` регистратором.
- **Статус**:
  - Фронтенд: `apps/web/src/documentValidators.ts`.
  - Тесты: `apps/web/src/tests/documentNavigationWorkflow.test.ts` (15 тестов, 100% pass) (коммит `afa61d167`).

---

## 152. `ортодонтия::дедупликация_фотопротокола_и_44px_тач_таргеты` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8c, 8d, 8e, ФИЧА #157)
- **Идея**: Ликвидация дублирующегося кода и стандартизация клинического фотопротокола ортодонта:
  1. *Дедупликация*: устранен дубликат в `apps/web/src/components/orthodontics/OrthoPhotoProtocolModal.tsx` (~1208 строк), файл превращен в прозрачный шлюз реэкспортов из канонического `components/diagnostics/OrthodonticPhotoProtocolModal.tsx`.
  2. *Канонические алиасы*: обеспечен экспорт всех исторических контрактов (`OrthodonticClinicalPreset`, `generateOrthoDiaryText`, `ORTHO_CLINICAL_PRESETS`).
  3. *Эргономика перчаток*: все кнопки сетки из 8 стандартных ракурсов, тулбара и пресетов приведены к нормативу $\ge 44\text{px}$, тулбар выровнен строго в 1 строку.
  4. *Защита документов*: ноль мультяшных эмодзи в протоколах, только строгие векторные иконки Lucide.
- **Статус**:
  - Фронтенд: `apps/web/src/components/orthodontics/OrthoPhotoProtocolModal.tsx`, `apps/web/src/components/diagnostics/OrthodonticPhotoProtocolModal.tsx`, `apps/web/src/components/orthodontics/OrthodonticStudioModal.tsx`.
  - Тесты: `apps/web/src/tests/OrthodonticPhotoProtocolModal.test.tsx` (7 тестов, 100% pass) (коммит `afa61d167`).

---

## 153. `хирургия_анестезия::4_столпа_анамнеза_экспресс_пресеты_анестезии_и_печать_протоколов` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8i, 8k, 8n, ФИЧА #159)
- **Идея**: Устранение больничного/стационарного блоата, псевдонаучных опросников и бюрократических капканов в хирургии, имплантации и анестезии:
  1. *4 столпа амбулаторного хирургического анамнеза (Мандат 8i)*: вместо 50 пунктов соматики выделены 4 клинических фактора (аллергия на местные анестетики, приём антикоагулянтов/дезагрегантов, бисфосфонаты/риск остеонекроза MRONJ, декомпенсированный сахарный диабет). Добавлены кнопки «1-Клик норма анамнеза» (`btn-anamnesis-all-norm`) и «1-Клик норма (Time-Out & Анамнез)» (`btn-timeout-all-norm`). Неблокирующие визуальные рекомендации при выявлении факторов риска.
  2. *Печать протоколов операций в любой момент (Мандат 8e)*: создание автономного модуля `surgicalOperationProtocolPrintEngine.ts` (штампы «ЧЕРНОВИК» / «ПОДПИСАНО ВРАЧОМ», профессиональная типографика, разделение А4, ноль эмодзи). Быстрые кнопки печати протокола операции и комплекта ИДС во всех хирургических панелях (`SurgeryCockpitModal.tsx`, `SurgeryProtocolPanel.tsx`, `VisitSurgeryProtocolTab.tsx`).
  3. *7 кресельных экспресс-пресетов анестезии (Мандат 8k, 8n)*: добавлены пресеты «Мандибулярная + инфильтрационная Ультракаин Д-С Форте» и «Инфильтрационная Септанест 1.7 мл» в `anesthesiaExpressPresets.ts` и `AnesthesiaQuickBar.tsx`, а также 1-клик списание Септанеста медсестрой (`nurse-quick-septanest-disposal`).
  4. *Безопасность лекарственных взаимодействий (DDI)*: в `clinicalDdiDrugSafetyEngine.ts` внедрен класс `bisphosphonate_antiresorptive` (Золедронат, Акласта, Зомета, Бонвива, Пролиа, Фосамакс) с автоматическим предупреждением о риске остеонекроза челюсти (MRONJ) и повышенной токсичности при сочетании с НПВП.
- **Статус**:
  - Движок печати: `apps/web/src/components/documents/surgicalOperationProtocolPrintEngine.ts`, `surgicalPackagePrintEngine.ts`.
  - Фронтенд хирургии: `apps/web/src/components/surgery/SurgerySafetyChecklist.tsx`, `SurgeryCockpitModal.tsx`, `SurgeryProtocolPanel.tsx`, `apps/web/src/components/visit/surgery/VisitSurgeryProtocolTab.tsx`.
  - Фронтенд анестезии: `apps/web/src/components/visit/anesthesia/anesthesiaExpressPresets.ts`, `apps/web/src/components/anesthesia/AnesthesiaQuickBar.tsx`.
  - Бэкенд/Shared DDI: `packages/shared/src/clinical/clinicalDdiDrugSafetyEngine.ts`.
  - Тесты: `packages/shared/src/clinical/clinicalDdiDrugSafetyEngine.test.ts` (23 теста, 100% pass), `apps/web/src/components/visit/anesthesia/__tests__/anesthesiaExpressPresets.test.ts` (12 тестов, 100% pass), `apps/web/src/components/surgery/__tests__/surgeryCockpitModal.test.tsx` (8 тестов, 100% pass).

---

## 154. `пародонтология_гигиена::ликвидация_симулятора_192_точек_и_6_клинических_пресетов` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8i, 8k, 8n, ФИЧА #158)
- **Идея**: Устранение академического оверинжиниринга и процедурного симулятора ручного прокликивания 192 точек зондирования в пользу 1-клик клинических экспресс-пресетов:
  1. *Ликвидация симулятора и Numpad-барьеров*: перехват цифровой клавиатуры Numpad по умолчанию выключен (`isKeyboardCaptureEnabled = false`); пародонтограмма не требует последовательного 192-точечного тыканья зондом для оформления визита.
  2. *6 канонических SEPA пресетов в 1 клик*:
     - «Физиологическая норма (Z01.2)» — глубина борозды 1-2 мм, BOP 0%, PI 0%, подвижность 0.
     - «Хронический катаральный гингивит (K05.1)» — глубина 2-3 мм (ложные карманы), диффузная кровоточивость BOP > 10%, налет.
     - «Хронический пародонтит лёгкой степени (K05.30)» — карманы 3-4 мм, BOP+, CAL 1-2 мм.
     - «Хронический генерализованный пародонтит средней степени (K05.31)» — карманы 4-5.5 мм, рецессия 1-2 мм, фуркация I ст. на молярах, подвижность I ст.
     - «Хронический генерализованный пародонтит тяжёлой степени (K05.32)» — карманы 6-7 мм, подвижность II-III ст., фуркация II ст., активная экссудация (гноетечение).
     - «Профгигиена полости рта (A16.07.051)» — десна санирована, глубина 1-2 мм, инъекция протокола УЗ + Air-Flow + фторирование в дневник и наряд.
  3. *Автогенерация Формы 043/у*: функция `generateSepaProtocol043Text` формирует регламентный текст дневника по стандартам Минздрава РФ с точными кодами МКБ-10, статусом localis и планом лечения.
  4. *Интеграция с гигиеной 804н*: в `HygieneIndicesPanel.tsx` добавлены 5 клинических пресетов (Норма, Гингивит, Легкий, Средний, Тяжелый пародонтит), синхронизированные с услугами Номенклатуры 804н (A16.07.051, A16.07.050, A11.07.012).
  5. *Гигиена дизайна токенов и ноль эмодзи*: в `PeriodontogramChart.tsx` устранены 124 жестких темных фоллбэка из `var(--token)`, гарантируя WCAG AAA контрастность; мультяшные эмодзи заменены строгими векторными иконками Lucide.
- **Статус**:
  - Shared: `packages/shared/src/emr/periodontogram.ts`, `packages/shared/src/emr/index.ts`.
  - Фронтенд: `apps/web/src/components/perio/PeriodontogramChart.tsx`, `apps/web/src/components/perio/perioMath.ts`, `apps/web/src/components/hygiene/HygieneIndicesPanel.tsx`, `apps/web/src/lib/clinicalProtocols043.ts`, `apps/web/src/components/visit/VisitDiarySection.tsx`, `apps/web/src/components/periodontogram/index.ts`.
  - Тесты: `packages/shared/src/tests/perioCharting.test.ts` (13 тестов, 100% pass), `apps/web/src/components/perio/__tests__/periodontalQuickScreening.test.ts` (8 тестов, 100% pass), `apps/web/src/components/hygiene/__tests__/HygieneIndicesPanel.test.tsx` (5 тестов, 100% pass).

---

## 155. `егисз_экспорт::автономия_экспорта_cda_пакета_1_клик_и_активная_валидация` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8n, ФИЧА #160)
- **Идея**: Снятие блокирующего disabled на кнопке 1-клик экспорта CDA ZIP-пакета (XML + .sig) в `EgiszCdaExportModal.tsx`:
  1. *Неблокирующая кнопка*: `disabled={isSubmitting}` вместо блокировки по `!generationResult.success`.
  2. *Активное руководство*: при наличии клинических ошибок валидации выводится информативный тост с конкретной ошибкой без мертвых кликов.
  3. *Соло-врач*: поддержка демонстрационных безопасных дефолтов в соло-режиме (Мандат 8n).
  4. *Тач-таргеты*: все кнопки и вкладки модального окна соответствуют Apple HIG (`min-height: 44px`).
- **Статус**:
  - Фронтенд: `apps/web/src/components/documents/egisz/EgiszCdaExportModal.tsx`.
  - Тесты: `apps/web/src/components/documents/egisz/__tests__/egiszCdaExportAutonomy.test.tsx` (4 теста, 100% pass, коммит `89de6175c`).

---

## 156. `мдлп_списание::1_клик_списание_карпул_смены_и_разблокировка_кнопок_очереди` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k, 8n, ФИЧА #161)
- **Идея**: Ликвидация мертвых disabled кнопок в очереди списания маркированных лекарственных препаратов МДЛП:
  1. *Разблокировка кнопок*: кнопки добавления кода по сканеру, печати акта списания и вывода из оборота по Схеме 10560 активны по умолчанию.
  2. *1-клик списание смены*: при пустой очереди списания кнопка автоматически наполняет карпулы смены (10 Артикаин + 2 Скандонест, СанПиН 3.3686-21, ПКУ без комиссии из 3 человек).
  3. *Активная валидация*: тост-оповещения с первой найденной ошибкой кода DataMatrix вместо серого UI.
  4. *Тач-таргеты*: все интерактивные элементы тулбара и футера `min-height: 44px`.
- **Статус**:
  - Фронтенд: `apps/web/src/components/inventory/mdlp/MdlpDisposalQueueModal.tsx`.
  - Тесты: `apps/web/src/components/inventory/mdlp/__tests__/mdlpDisposalQueueAutonomy.test.tsx` (6 тестов, 100% pass, коммиты `469d1df4b`, `d0a3c4637`).

---

## 157. `списание_материалов::1_клик_стандартный_набор_расходников_и_мягкий_овердрафт` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k, 8n, ФИЧА #162)
- **Идея**: Автономное списание расходных материалов процедуры без блокировки приема при пустой технологической карте:
  1. *Неблокирующее подтверждение*: кнопка «Списать со склада» активна (`disabled={isDeducting}`); при пустом списке материалов в 1 клик подставляется стандартный расходный набор (перчатки, маска, слюноотсос, валики, карпула).
  2. *Мягкий овердрафт*: предупреждение вместо срыва операции при нулевом складском остатке (Мандат 8e п. 10, Мандат 8n п. 2).
  3. *Активные подсказки*: добавление пользовательских материалов выводит тост-руководство вместо блокировки кнопки.
  4. *Тач-таргеты*: `min-height: 44px` на всех интерактивных контролах.
- **Статус**:
  - Фронтенд: `apps/web/src/components/inventory/ProcedureMaterialDeductionModal.tsx`.
  - Тесты: `apps/web/src/components/inventory/__tests__/procedureMaterialDeductionAutonomy.test.tsx` (8 тестов, 100% pass, коммит `23ad672f5`).

---

## 158. `онбординг_кресла_персонал::безопасные_дефолты_1_клик_добавление_без_блокировок` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8n, ФИЧА #163)
- **Идея**: 1-клик добавление оборудования и сотрудников в мастере онбординга и настройках клиники:
  1. *Безопасные дефолты*: при пустом названии кресла автоматически генерируется «Кресло N» / «Кабинет N» в 1 клик без блокировки.
  2. *Автоподстановка роли*: при пустом имени сотрудника генерируется «Врач-терапевт» с информационным тостом.
  3. *Ликвидация disabled*: кнопки добавления активны (`disabled === false`), строгий учет правил хуков useAppStore.
  4. *Тач-таргеты*: `minHeight: 44px`, `minWidth: 44px`.
- **Статус**:
  - Фронтенд: `apps/web/src/components/onboarding/OnboardingWizardModal.tsx`, `apps/web/src/components/settings/SettingsClinicTab.tsx`.
  - Тесты: `apps/web/src/components/onboarding/__tests__/onboardingStaffChairAutonomy.test.tsx` (5 тестов, 100% pass, коммит `fd2b27a9c`).

---

## 159. `расписание_кресла::1_клик_инлайн_добавление_кресел_и_кабинетов_из_сетки` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k, 8n, ФИЧА #164)
- **Идея**: Инлайн-добавление кресел и кабинетов прямо из сетки расписания без ухода в Настройки (паритет StomX / DentalPRO):
  1. *Кнопка в сетке*: в `ScheduleFilterStrip.tsx` выведена стильная кнопка «+ Кресло» в тулбар и меню опций с тач-таргетом `>= 44px`.
  2. *QuickAddChairModal*: чистое модальное окно (глубина вложенности = 1, закон Анти-Матрёшки Mandate 8d) с полями названия, номера кабинета, 6 профилями специализаций и 6 цветовыми бейджами.
  3. *Безопасные дефолты*: кнопка добавления никогда не блокируется (`disabled === false`), при пустом названии подставляет «Кресло N».
- **Статус**:
  - Фронтенд: `apps/web/src/components/schedule/QuickAddChairModal.tsx`, `apps/web/src/components/schedule/ScheduleFilterStrip.tsx`.
  - Тесты: `apps/web/src/components/schedule/__tests__/scheduleInlineChairManagement.test.tsx` (5 тестов, 100% pass, коммит `6d6c2ad56`).

---

## 160. `расписание_смены::подключение_студии_графиков_сменности_к_реальным_данным` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k, 8n, ФИЧА #165)
- **Идея**: Сквозная привязка студии сменности врачей к реальному персоналу, кабинетам, креслам и постоянное сохранение расписания:
  1. *Подключение реальных данных*: в `ScheduleView.tsx` модалка `DoctorShiftRosterModal` подключена к персоналу клиники `dashboard.clinicSettings.staff`, креслам `clinicSettings.chairs` и расчету занятости `appointments`.
  2. *Персистентность смен*: смены сохраняются в `localStorage` (`dente_doctor_shifts`) и через API `POST /api/diary/shifts` с клиническими заголовками авторизации.
  3. *1-клик шаблоны сменности*: панель пресетов («Пятидневка», «2/2», «Утро 08:00–14:00», «Вечер 14:00–20:00», «Полный день 08:00–20:00») с генерацией расписания за 1 клик.
  4. *Тач-таргеты и автономия*: все кнопки `>= 44px`, кнопки сохранения не блокируются (`disabled === false`).
- **Статус**:
  - Фронтенд: `apps/web/src/ScheduleView.tsx`, `apps/web/src/components/schedule/roster/DoctorShiftRosterModal.tsx`.
  - Тесты: `apps/web/src/components/schedule/roster/__tests__/scheduleShiftRosterIntegration.test.tsx` (10 тестов, 100% pass, коммит `38677cc64`).

---

## 161. `расписание_кресла::закрепление_кресел_за_врачами_по_графику_и_автовыбор_в_записи` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k, 8n, ФИЧА #166)
- **Идея**: Закрепление дежурного врача за креслом в шапке расписания и автовыбор врача в `QuickBookingDrawer` (паритет StomX / DentalPRO):
  1. *Шапка кресла*: вывод бейджа дежурного врача с коротким именем («Иванов И.И.»), специальностью и временем смены или кнопки «+ Назначить врача» (`min-height: 44px`).
  2. *1-клик назначение*: модальное окно выбора врача из штата и шаблона смены (Утро, Вечер, Полный день) без блокировок.
  3. *Автоподстановка в слот*: при клике на пустой слот кресла `onSlotClick` передает `doctorUserId` закрепленного врача.
  4. *Интеграция с QuickBookingDrawer*: форма быстрой записи автоматически выбирает врача кресла; для соло-врача ассистент скрыт, а врач выбирается по умолчанию.
- **Статус**:
  - Фронтенд: `apps/web/src/components/schedule/ScheduleGrid.tsx`, `apps/web/src/components/schedule/QuickBookingDrawer.tsx`.
  - Тесты: `apps/web/src/components/schedule/__tests__/scheduleChairDoctorBinding.test.tsx` (7 тестов, 100% pass, коммиты `29d114896`, `e1400fd31`).

---

## 162. `одонтограмма_прикус_голос::1_клик_норма_прикуса_ортогнатический_и_автономия_голосового_ввода` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8d, 8e, 8i, 8k, 8n, ФИЧА #167)
- **Идея**: Ликвидация блокирующих кнопок (`disabled`) и внедрение 1-клик физиологической нормы челюстей и прикуса, а также автономия голосового ассистента:
  1. *1-клик норма челюстей и прикуса*: в `JawOcclusionModal.tsx` выделены пресеты физиологической нормы для верхней челюсти (`ju_norm`), нижней челюсти (`jl_norm`) и окклюзии (`c_orthognathic` — «Ортогнатический прикус (Норма / I класс Энгля)»).
  2. *Авто-применение прикуса без выбора*: кнопка применения никогда не блокируется серым замком (`disabled={false}`); клик по кнопке применения без явного выбора пресета автоматически применяет `c_orthognathic` для окклюзии и отправляет кастомное событие `dente-apply-soap-protocol` с готовым текстом Формы 043/у.
  3. *Автономия голосового ассистента*: в `VoiceDictationAssistantModal.tsx` кнопка «Применить всё» освобождена от блокировки (`disabled={false}` вместо `disabled={!parseResult || parseResult.commands.length === 0}`); при клике с 0 команд выводится понятный информативный тост-руководство («Произнесите диагноз или статус зуба в микрофон или выберите клинический шаблон ниже») без сбоев.
  4. *Тач-таргеты*: все интерактивные кнопки $\ge 44\text{px}$ по Apple HIG.
- **Статус**:
  - Фронтенд: `apps/web/src/components/odontogram/JawOcclusionModal.tsx`, `apps/web/src/components/voice/VoiceDictationAssistantModal.tsx`.
  - Тесты: `apps/web/src/components/odontogram/__tests__/jawOcclusionAutonomy.test.tsx` (8 тестов, 100% pass, коммит `9f40fe25e`).

---

## 163. `расписание_сетка_кресел::инлайн_колонка_добавления_кресел_и_почасовая_привязка_смен_врача` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8c, 8d, 8e, 8k, 8n, ФИЧА #168)
- **Идея**: Выделенная постоянная колонка «+ Кресло» в сетке расписания, почасовая привязка смен врача к креслу и 1-клик экспресс-назначение:
  1. *Постоянная инлайн-колонка «+ Кресло»*: в `ScheduleGrid.tsx` добавлена выделенная колонка `grid-header-add-chair-col` с крупной кнопкой «+ Кресло» (`btn-grid-inline-add-chair`, $\ge 44\times 44\text{px}$) и адаптивной сеткой `gridTemplateColumns: 80px repeat(N, minmax(180px, 1fr)) minmax(110px, 130px)`.
  2. *Почасовая привязка смен врача*: функция `getDoctorForChairAndHour(chairId, hour)` вычисляет закрепленного за креслом врача с учетом времени смены (Утро/Вечер/Полный день), обеспечивая автоматическую подстановку врача при клике на свободный слот и в форму `QuickBookingDrawer`.
  3. *1-клик экспресс-назначение*: в шапку кресла добавлена кнопка мгновенного назначения врача в 1 клик (`btn-quick-assign-${chair.id}`) на основе специализации кресла.
  4. *Автономия соло-врача в графике сменности*: в `DoctorShiftRosterModal.tsx` поддержан расчет от понедельника текущей даты `currentDate`, а также соло-режим «Индивидуальный приём» без ассистента без красных блокирующих ошибок; миграция тестов на native `node:test`.
- **Статус**:
  - Фронтенд: `apps/web/src/components/schedule/ScheduleGrid.tsx`, `apps/web/src/ScheduleView.tsx`, `apps/web/src/components/schedule/roster/DoctorShiftRosterModal.tsx`, `apps/web/src/components/schedule/QuickAddChairModal.tsx`.
  - Тесты: `apps/web/src/components/schedule/__tests__/scheduleChairDoctorBinding.test.tsx` (7 тестов, 100% pass), `apps/web/src/components/schedule/__tests__/WaitlistQuickFillModal.test.tsx` (коммиты `65d3f6d25`, `e902f8103`).

---

## 164. `касса_54фз::оплата_без_сдачи_комбинированный_сплит_нал_карта_аванс_и_1_клик_возврат` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8b, 8d, 8e, 8k, 8n, ФИЧА #169)
- **Идея**: Фискализация кассы 54-ФЗ без сдачи, комбинированная оплата в 1 клик (Нал + Карта + Аванс / Семейный баланс), неблокирующий X-отчет смены и 1-клик возврат прихода (Тег 1054):
  1. *1-клик пресет «Без сдачи (Нал 100%)»*: в `FastCheckoutModal.tsx` добавлен экспресс-пресет для наличных (Тег 1031) без ручного ввода копеек.
  2. *1-клик комбинированная оплата «Нал + Карта + Аванс»*: пресет `split_three_way` мгновенно зачитывает доступный депозит/семейный счет `patientFamilyBalanceRub` плательщика `familyPayerName` (Тег 1215), а остаток делит поровну между банковской картой (Тег 1081) и наличными без копеечных погрешностей.
  3. *Неблокирующий X-отчет смены*: в `CashShiftWidget.tsx` и `CashRegisterModal.tsx` кнопка печати промежуточного X-отчета закрытой смены активна (`isProcessing=false`) с информативным руководством.
  4. *1-клик фискальный возврат прихода 54-ФЗ*: в `ExpressFiscalReceiptModal.tsx` и `RefundReceiptModal.tsx` реализован 1-клик возврат как по позициям плана лечения с кнопкой «Выбрать все», так и для аванса без позиций с формированием чека ФФД 1.2 Признак расчета 2 (Возврат прихода).
- **Статус**:
  - Фронтенд: `apps/web/src/components/payments/FastCheckoutModal.tsx`, `apps/web/src/components/payments/checkout/FastCheckoutModal.tsx`, `apps/web/src/components/finance/CashShiftWidget.tsx`, `apps/web/src/components/cash/CashRegisterModal.tsx`, `apps/web/src/components/finance/ExpressFiscalReceiptModal.tsx`, `apps/web/src/components/finance/RefundReceiptModal.tsx`.
  - Тесты: `apps/web/src/components/finance/__tests__/cashShiftAutonomyAndFiscal54Fz.test.tsx` (8 тестов, 100% pass), `apps/web/src/components/finance/__tests__/expressFiscalRefundAutonomy.test.ts` (12 тестов, 100% pass, коммит `2a5395e34`).

---

## 165. `расписание_смены::двухсменная_работа_кресел_subshifts_и_динамический_автовыбор_врача_в_записи` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8c, 8d, 8e, 8k, 8n, ФИЧА #170)
- **Идея**: Двухсменное дежурство на кресле с поддержкой `subShifts` (утро 08:00–14:00 и вечер 14:00–20:00), динамический почасовой выбор дежурного врача и автовыбор врача в `QuickBookingDrawer` при смене кресла:
  1. *Двухсменная работа кресел*: в `ScheduleGrid.tsx` реализовано дежурство на кресле в 2 смены с быстрым переключением в 1 тап; дежурный врач вычисляется почасово через функцию `resolveChairDutyDoctor(chairId, hour, currentDay, shifts)`.
  2. *Сохранение составных смен с subShifts*: поддержка составных смен с сохранением `subShifts` без перезаписи данных других врачей при записи в `localStorage` (`dente_doctor_shifts`) и синхронизации через `POST /api/diary/shifts`.
  3. *Динамический автовыбор врача при смене кресла*: в `QuickBookingDrawer.tsx` при изменении кресла в выпадающем списке форма автоматически определяет дежурного врача на выбранное время визита и переключает врача с мягким инфо-тостом (Мандат 8e), исключая трение ручного повторного выбора.
  4. *MVP и приоритет*: MVP Да, Сложность Низкая, Приоритет KILLER.
- **Статус**:
  - Фронтенд: `apps/web/src/components/schedule/ScheduleGrid.tsx`, `apps/web/src/components/schedule/QuickBookingDrawer.tsx`, `apps/web/src/ScheduleView.tsx`.
  - Тесты: `apps/web/src/components/schedule/__tests__/scheduleChairDoctorBinding.test.tsx` (100% pass, коммит `2d0598e96`).

---

## 166. `расписание_сетка::липкая_колонка_времени_sticky_left_0_при_скролле_10_кресел_и_фильтр_мое_кресло` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8c, 8d, 8e, 8n, ФИЧА #171)
- **Идея**: Фиксация колонки времени при горизонтальном скролле сетки на 10+ кресел и 1-клик фильтр «Моё кресло» в ленте фильтров:
  1. *Липкая колонка времени (Sticky Time Column)*: в `ScheduleGrid.tsx` колонка времени зафиксирована на `sticky left-0` с `z-20` в шапке сетки и `z-10` в строках временной шкалы. При горизонтальном скролле сетки с 10+ креслами временные метки всегда остаются перед глазами (Apple HIG / Studio Clinical Density).
  2. *1-клик фильтр «Моё кресло»*: в `ScheduleFilterStrip.tsx` добавлен экспресс-фильтр «Моё кресло» для текущего авторизованного врача `currentUserId`, корректно определяющий назначенное кресло как по основным сменам, так и по вечерним подсменам (`subShifts`), изолируя рабочий холст врача в 1 клик.
  3. *MVP и приоритет*: MVP Да, Сложность Низкая, Приоритет KILLER.
- **Статус**:
  - Фронтенд: `apps/web/src/components/schedule/ScheduleGrid.tsx`, `apps/web/src/components/schedule/ScheduleFilterStrip.tsx`.
  - Тесты: `apps/web/src/components/schedule/__tests__/scheduleChairDoctorBinding.test.tsx` (100% pass, коммиты `28ace5f7c`, `2d0598e96`).

---

## 167. `расписание_ростер::декомпозиция_монолита_ростера_до_613_строк_и_детерминированный_алгоритм_без_коллизий` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8j, 8n, ФИЧА #172)
- **Идея**: Декомпозиция монолита `DoctorShiftRosterModal.tsx` с 1750+ до 613 строк (< 800 строк по Engineering Rules) и детерминированный аллокатор смен без коллизий:
  1. *Модульная декомпозиция*: монолитный компонент ростера декомпозирован на независимые модули:
     - `DoctorRosterToolbar.tsx` (132 строки) — 1-строчный тулбар навигации по неделям, фильтров и запуска автогенерации;
     - `DoctorRosterMatrix.tsx` (340 строк) — матричная сетка дней недели и врачей с бейджами кресел и времени смены;
     - `DoctorShiftDrawer.tsx` (385 строк) — шторка редактирования смены врача с тач-таргетами $\ge 44\text{px}$;
     - `doctorWeeklyScheduleGenerator.ts` (310 строк) — алгоритмическая логика генерации графиков сменности.
  2. *Детерминированный аллокатор без коллизий*: алгоритмы `allocateChairForDoctor` и `allocateAssistantForDoctor` исключают возникновение `chair_double_booking` и `doctor_double_booking` при любых комбинациях врачей $M$ и кресел $N$ ($M = 0$, $M = 1$, $M > N$, $M < N$).
  3. *Сквозная персистентность*: сохранение сгенерированного расписания в `localStorage` и через API Fastify `POST /api/diary/shifts`.
  4. *MVP и приоритет*: MVP Да, Сложность Низкая, Приоритет KILLER.
- **Статус**:
  - Фронтенд: `apps/web/src/components/schedule/roster/DoctorShiftRosterModal.tsx`, `DoctorRosterToolbar.tsx`, `DoctorRosterMatrix.tsx`, `DoctorShiftDrawer.tsx`, `doctorWeeklyScheduleGenerator.ts`.
  - Тесты: `apps/web/src/components/schedule/roster/__tests__/scheduleShiftRosterIntegration.test.tsx` (10 тестов, 100% pass, коммит `b1505d079`).

---

## 168. `касса_54фз::обход_нулевого_чека_гарантии_аддитивный_семейный_баланс_и_комбо_оплата` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8b, 8e, 8n, ФИЧА #173)
- **Идея**: Обход фискализации 0 ₽ при 100% скидке/гарантии, аддитивное сложение семейного баланса и личного депозита, 1-клик комбо «Депозит + Сем. счет + Карта»:
  1. *Обход фискализации 0 ₽ при 100% гарантии*: в `FastCheckoutModal.tsx` добавлен нулевой гейт `targetBillKop === 0`, блокирующий отправку пустого чека на ККТ (предотвращает аппаратную ошибку «Сумма чека не может быть 0») и завершающий визит за 300 мс со штампом «Гарантия 100%». Кнопка сабмита адаптируется на «Закрыть визит: 100% Гарантия / Скидка (0 ₽)».
  2. *Аддитивное сложение семейного баланса*: в `FastCheckoutModal.tsx`, `ExpressFiscalReceiptModal.tsx` и `RefundReceiptModal.tsx` личный депозит и семейный лицевой счет складываются аддитивно (`(patientDepositRub || 0) + (patientFamilyBalanceRub || 0)`), исключая взаимное вытеснение балансов.
  3. *1-клик комбо-оплата в кассе*: в `CashRegisterModal.tsx` добавлена кнопка «Депозит + Сем. счет + Карта», автоматически списывающая оба аванса и доплачивающая остаток картой без копеечного рассинхрона.
  4. *MVP и приоритет*: MVP Да, Сложность Низкая, Приоритет KILLER.
- **Статус**:
  - Фронтенд: `apps/web/src/components/payments/checkout/FastCheckoutModal.tsx`, `apps/web/src/components/finance/CashRegisterModal.tsx`, `apps/web/src/components/finance/ExpressFiscalReceiptModal.tsx`, `apps/web/src/components/finance/RefundReceiptModal.tsx`.
  - Тесты: `apps/web/src/components/payments/checkout/fastCheckoutInvariants.test.ts` (8 тестов, 100% pass, коммит `d3e52a957`).

---

## 169. `расписание::устранение_дефектов_ред_тиминга_привязки_врачей_к_креслам_и_изоляция_модалок` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8c, 8d, 8e, 8k, 8n, ФИЧА #174)
- **Идея**: Устранение дефектов ред-тиминга привязки врачей к креслам, изоляция внутренних модалок сетки (Анти-Матрёшка), тач-таргеты 32-44px и пресет длительности 45 мин:
  1. *Изоляция модалок (Закон Анти-Матрёшки)*: в `ScheduleFilterStrip.tsx` и `ScheduleGrid.tsx` исключено двойное модальное открытие при вызове `onOpenAddChair` из родительского контейнера; внутренняя модалка рендерится строго по условию `!onOpenAddChair && isAddChairModalOpen`.
  2. *Устранение микро-типографики в шапке кресла*: кнопка быстрого назначения врача увеличена с `text-[10px]` до `text-xs font-bold` (12px) и минимальной высоты 32px.
  3. *Пресет 45 минут в расписании*: в `patientReliabilityScore.ts` в `DURATION_PRESETS` добавлен пресет `45 мин` (Терапия).
  4. *1-клик чип «Моё кресло»*: в `ScheduleFilterStrip.tsx` интегрирован чип «Моё кресло» (`data-testid="schedule-my-chair-btn"`) с тач-таргетом $\ge 44\text{px}$ и мгновенным переключением на назначенное кресло врача.
  5. *MVP и приоритет*: MVP Да, Сложность Низкая, Приоритет KILLER.
- **Статус**:
  - Фронтенд: `apps/web/src/components/schedule/ScheduleFilterStrip.tsx`, `apps/web/src/components/schedule/ScheduleGrid.tsx`, `apps/web/src/components/schedule/patientReliabilityScore.ts`.
  - Тесты: `apps/web/src/components/schedule/__tests__/scheduleInlineChairManagement.test.tsx` (7 тестов, 100% pass, коммит `ec42da696`).

---

## 170. `платежи_налоги::автономия_заполнения_реквизитов_плательщика_из_карточки_и_тост_подсказки` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8n, ФИЧА #175)
- **Идея**: Автономия заполнения налоговых реквизитов плательщика из карточки пациента (1 клик) и неблокирующая подсказка через тосты:
  1. *1-клик автозаполнение реквизитов*: в `PaymentCapture.tsx` кнопка «Заполнить из карточки пациента» (`data-testid="payment-fill-payer-from-patient"`) освобождена от блокировки (`disabled={false}`) с тач-таргетом $\ge 44\text{px}$.
  2. *Безопасный перенос данных*: функция `applyPatientTaxDefaults` в 1 клик переносит в форму платежа ФИО пациента `patientDefaults.fullName`, дату рождения `patientDefaults.birthDate`, документ `patientDefaults.identityDocument`, ИНН `patientDefaults.taxpayerInn` и статус родства «пациент», исключая повторный ручной ввод кассиром.
  3. *Неблокирующее тост-руководство*: при отсутствии данных в карточке пациента выводится информативное тост-сообщение («В карточке пациента нет данных для автозаполнения плательщика») и подсказка `taxDefaultsGuidanceId`, сохраняя кнопку кликабельной (Мандат 8e).
  4. *Валидация ИНН*: строгая проверка ИНН (10 или 12 цифр) с понятным предупреждением без блокирования интерфейса оплаты.
  5. *MVP и приоритет*: MVP Да, Сложность Низкая, Приоритет KILLER.
- **Статус**:
  - Фронтенд: `apps/web/src/PaymentCapture.tsx`.
  - Тесты: `apps/web/src/components/payments/__tests__/paymentCaptureTaxAutonomy.test.tsx` (11 тестов, 100% pass, коммиты `ae19c510a`, `cb78c9998`).

---

## 171. `документы_регистратура::автономия_экстренного_приема_без_паспорта_и_печать_бланков_договоров_без_403` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8n, ФИЧА #176)
- **Идея**: Автономия регистратуры при экстренном приёме без паспорта и печать бланков договоров со строками «_______» без 403:
  1. *1-клик экстренный пакет первичного приёма*: в `DocumentsView.tsx` добавлена кнопка `btn-quick-print-primary-intake-package`, формирующая и отправляющая на печать полный пакет документов (Договор, общий ИДС, согласие на обработку ПД и первичная анкета) с пустыми строками «________» для ручной подписи на стойке ресепшена без 403-ошибок и без паспорта (Мандаты 8e п. 8, 8n).
  2. *Неблокирующая кнопка открытия последнего документа*: кнопка «Открыть последний документ» (`btn-open-latest-document`) освобождена от блокировки (`disabled={false}`); при отсутствии документов выводится понятный тост с предложением создать форму.
  3. *Автономия аннулирования документов*: функция `executeDocumentVoidAutonomy` гарантирует безопасные реквизиты сотрудника («Администратор» / «Сотрудник клиники») даже при неполном контексте сессии, предотвращая системные отказы аннулирования ошибочных бланков.
  4. *Неблокирующее создание документов*: кнопка фабрики документов активна всегда, автоматически предвыбирая первый доступный шаблон при клике.
  5. *MVP и приоритет*: MVP Да, Сложность Низкая, Приоритет KILLER.
- **Статус**:
  - Фронтенд: `apps/web/src/DocumentsView.tsx`.
  - Тесты: `apps/web/src/components/documents/__tests__/documentsViewAutonomy.test.tsx` (7 тестов, 100% pass, коммит `f3bfa5c55`).

---

## 172. `расписание_сетка::2_строчная_шапка_мультисмен_пульсирующий_статус_на_смене_1_клик_свитчер_и_инлайн_коллизии` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8c, 8d, 8e, 8k, 8n, ФИЧА #177)
- **Идея**: 2-строчное отображение мультисмен в шапке кресла, пульсирующий статус дежурства, 1-клик переключатель смен и инлайн-предупреждение коллизий (Анти-Матрёшка):
  1. *2-строчная шапка кресла для 2 смен*: в `ScheduleGrid.tsx` шапка кресла при наличии двух смен рендерит 2 аккуратные строки (☀️ Утро / 🌙 Вечер) без `...` обрезания на 180px колонках.
  2. *Пульсирующий статус «● На смене»*: для дежурного врача в текущий час (`currentHour`) выводится живой зеленый бейдж `● На смене`.
  3. *1-клик переключатель смен в шапке*: добавлены кнопки «☀️ Утро», «🌙 Вечер», «🏢 Весь день», «2 смены» для мгновенной перепривязки смены прямо из сетки расписания без модальных окон.
  4. *Инлайн-предупреждение коллизий (Анти-Матрёшка / Грех 6)*: в `SlotConflictModal.tsx` добавлен флаг `inline={true}`, рендерящий предупреждение о конфликте слота и свободные окна как карточку прямо внутри шторки `QuickBookingDrawer.tsx` над кнопками действий, без `createPortal` и оверлея поверх шторки.
  5. *Отказоустойчивость и UX*: оптимистичное добавление кресел в `dashboard.clinicSettings.chairs` при сетевом сбое и сброс фильтра кресел при создании; динамическая локализация месяца (`Intl.DateTimeFormat`) в `DoctorRosterToolbar.tsx`.
  6. *MVP и приоритет*: MVP Да, Сложность Низкая, Приоритет KILLER.
- **Статус**:
  - Фронтенд: `apps/web/src/components/schedule/ScheduleGrid.tsx`, `apps/web/src/components/schedule/SlotConflictModal.tsx`, `apps/web/src/components/schedule/QuickBookingDrawer.tsx`, `apps/web/src/ScheduleView.tsx`, `apps/web/src/components/schedule/roster/DoctorRosterToolbar.tsx`.
  - Тесты: `apps/web/src/components/schedule/__tests__/scheduleChairDoctorBinding.test.tsx`, `scheduleInlineChairManagement.test.tsx`, `scheduleShiftRosterIntegration.test.tsx` (51 тест, 100% pass, коммит `d5b47f437`).

---

## 173. `пациенты_профиль::неблокирующая_автономия_сохранения_карточки_и_реквизитов_с_тост_руководством` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8n, ФИЧА #178)
- **Идея**: Полное снятие блокировок кнопок сохранения карточки пациента и реквизитов с активным тост-руководством:
  1. *Неблокирующие кнопки сохранения*: в `PatientsView.tsx` кнопки «Сохранить данные» и «Сохранить реквизиты» освобождены от блокировки `disabled={!readyToSave}` -> блокируются исключительно на время физического сетевого I/O (`disabled={isSaving}`).
  2. *Активное тост-руководство*: функции `executePatientCoreSaveAutonomy` и `executePatientAdministrativeProfileSaveAutonomy` выводят понятные информативные тосты («Введите ФИО пациента для сохранения», «Данные актуальны») вместо пассивного отключения кнопок (Мандаты 8e, 8n).
  3. *Эргономика*: тач-таргеты кнопок и полей ввода строго $\ge 36\text{--}44\text{px}$.
  4. *MVP и приоритет*: MVP Да, Сложность Низкая, Приоритет KILLER.
- **Статус**:
  - Фронтенд: `apps/web/src/PatientsView.tsx`.
  - Тесты: `apps/web/src/components/patient/__tests__/patientProfileSaveAutonomy.test.tsx` (8 тестов, 100% pass, коммит `20e8eb7d9`).

---

## 174. `эмк_визит::1_клик_норма_соматического_статуса_и_неблокирующая_полировка_диктовки` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8i, 8k, 8n, ФИЧА #179)
- **Идея**: 1-клик фиксация физиологической нормы соматического статуса в карте 043/у и неблокирующая кнопка ИИ-полировки диктовки визита:
  1. *1-клик соматическая норма*: в `VisitView.tsx` добавлен блок соматического статуса с 1-клик кнопкой «Соматически здоров / норма (1-клик)» (`executeApplySomaticNormAutonomy`), мгновенно фиксирующей норму в анамнезе и объективном осмотре без 50 госпитальных вопросов стационара (Мандаты 8e, 8i, 8k, 8n).
  2. *Неблокирующая полировка диктовки*: кнопка ИИ-полировки дневника визита освобождена от блокировки `disabled={!hasVisitTranscriptText}` (`executePolishTranscriptAutonomy`); при пустом тексте аудиозаписи в 1 клик подставляет стандартный амбулаторный протокол осмотра нормы в Форму 043/у.
  3. *Стерильная зона визита врача*: верифицирована изоляция телефонных баннеров телефонии (Мандат 8e).
  4. *MVP и приоритет*: MVP Да, Сложность Низкая, Приоритет KILLER.
- **Статус**:
  - Фронтенд: `apps/web/src/VisitView.tsx`.
  - Тесты: `apps/web/src/components/visit/__tests__/visitViewAutonomyInquisition.test.tsx` (6 тестов, 100% pass, коммит `a8d628416`).

---

## 175. `планы_финансы::автономия_автораспределения_депозита_этапов_и_справок_кнд1151156` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8n, ФИЧА #180)
- **Идея**: Неблокирующее автораспределение свободного депозита по этапам, автономия ИИ-копилота презентатора планов и разблокировка справок КНД 1151156:
  1. *Неблокирующее распределение депозита по этапам*: в `StagePaymentPlanModal.tsx` кнопка «Распределить свободный депозит» освобождена от блокировки `disabled={availableDepositKopecks <= 0}`; при клике с нулевым остатком выводится информативное пояснение без блокирования интерфейса; тач-таргет приведен к Apple HIG ($\ge 44\text{px}$).
  2. *Отказоустойчивость финансовых вычислений (NaN-proof)*: в `stagePaymentEngine.ts` функции `calculateTerminationRefund` и `calculateStagePaymentTotals` защищены явным приведением `Number(...) || 0` и опциональным чейнингом `directExpensesKopecks`, предотвращая краш интерфейса при работе с черновиками или этапами без прямых расходов.
  3. *Автономия ИИ-копилота презентации планов*: в `TreatmentPlanPresenterModal.tsx` кнопка отправки запроса освобождена от блокировки `disabled={!customPrompt.trim()}` с активным подсказчиком сценариев («бюджет 120к», «без имплантации») и тач-таргетом $\ge 36\text{px}$.
  4. *Разблокировка справок об оплате медицинских услуг (КНД 1151156)*: в `TaxDeductionCertificateModal.tsx` кнопки выгрузки NO_MEDOPL 5.01, XML для ТКС и печати справок А4 освобождены от блокировки `disabled={payments.length === 0}`: при отсутствии оплат выводятся тосты с подсказкой без блокирования кнопок.
  5. *MVP и приоритет*: MVP Да, Сложность Низкая, Приоритет KILLER.
- **Статус**:
  - Фронтенд: `apps/web/src/components/treatment-plans/stagePayment/StagePaymentPlanModal.tsx`, `apps/web/src/components/treatment-plans/stagePayment/stagePaymentEngine.ts`, `apps/web/src/components/treatment-plans/TreatmentPlanPresenterModal.tsx`, `apps/web/src/components/finance/TaxDeductionCertificateModal.tsx`.
  - Тесты: `apps/web/src/components/treatment-plans/__tests__/stagePaymentAutonomy.test.tsx`, `apps/web/src/components/treatment-plans/__tests__/treatmentPlanPresenterModal.test.tsx`, `apps/web/src/components/finance/__tests__/taxDeductionCertificateAutonomy.test.tsx` (8 тестов, 100% pass, коммит `f35f3f2c1`).

---

## 176. `расписание_финансы_пародонт::мультисмены_касса_54фз_3way_сплит_и_1_клик_норма_пародонта` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e, 8k, 8n, ФИЧА #181)
- **Идея**: Персистентность мультисмен расписания (☀️/🌙), 1-клик 3-way сплит кассы 54-ФЗ (Депозит + Карта + Нал) и 1-клик норма пародонта по Apple HIG:
  1. *Отказоустойчивая персистентность мультисмен*: в `ScheduleView.tsx` для смен `two_shifts` и произвольных `subShifts` внедрен парсинг числовых часов из строковых полей `startTime`/`endTime` с безопасными дефолтами (8:00 и 14:00/20:00), устраняющий сброс вечерних дежурств врачей при перезагрузке; в `DoctorRosterToolbar.tsx` вычисление месяца `monthName` мемоизировано через `useMemo`, кнопки получили `min-height: 44px` и понятные русские подсказки.
  2. *1-клик 3-way сплит кассы 54-ФЗ*: в `CashRegisterModal.tsx` добавлен пресет `⚡ Депозит + Карта + Нал` (`preset-three-way`), списывающий личный аванс и семейный счет с распределением остатка поровну на Карту и Наличные с копеечной точностью; в `FastCheckoutModal.tsx` сложение депозита и семейного баланса выполнено аддитивно без затирания.
  3. *1-клик норма пародонтограммы по Закону Хика*: в `PeriodontogramChart.tsx` кнопка экспресс-нормы оформлена как «1-клик: Здоровый пародонт (Норма)» (PSR 0 во всех 6 секстантах, глубина $\le 2\text{ мм}$, BOP 0, протокол в Карту 043/у) с иконкой `ShieldCheck`, тулбар приведен к высоте 36px в 1 строку, все тач-таргеты приведены к $\ge 44\text{px}$.
  4. *MVP и приоритет*: MVP Да, Сложность Низкая, Приоритет KILLER.
- **Статус**:
  - Фронтенд: `apps/web/src/ScheduleView.tsx`, `apps/web/src/components/schedule/roster/DoctorRosterToolbar.tsx`, `apps/web/src/components/schedule/ScheduleGrid.tsx`, `apps/web/src/components/finance/CashRegisterModal.tsx`, `apps/web/src/components/payments/checkout/FastCheckoutModal.tsx`, `apps/web/src/components/perio/PeriodontogramChart.tsx`.
  - Тесты: `apps/web/src/tests/cashShiftAutonomyAndFiscal54Fz.test.tsx`, `apps/web/src/tests/emrPerioAutonomyInquisition.test.ts`, `apps/web/src/tests/fastCheckoutInvariants.test.ts`, `apps/web/src/components/documents/__tests__/documentsViewAutonomy.test.tsx` (45 тестов, 100% pass, коммит `db824fb3c`).

---

### 4.60. Сетка расписания, матрица смен, автономия связи и документооборота (Мандаты 8e, 8k, 8n / Фичи 182..185)
- **Статус**: `[РЕАЛИЗОВАНО]`
- **Объем реализации**:
  1. *Фича #182: Сетка расписания со StomX-паритетом*: двухсменная шапка колонок кресел (08:00–14:00 и 14:00–20:00) с пульсирующим бейджем «● На смене», автоподстановка дежурного врача по времени слота и выбранному креслу в `QuickBookingDrawer.tsx`, мягкое предупреждение при ручной смене врача без блокировки кнопки записи (Мандат 8e), empty state при 0 кресел и устойчивый fallback соло-врача (Мандат 8n).
  2. *Фича #183: 1-клик поповер матрицы смен*: интерактивный поповер в ячейках матрицы расписания с 4 пресетами в 1 клик (☀️ Утро, 🌙 Вечер, 🏢 Весь день, 🚫 Выходной/Очистить), чистый движок `applyCellShiftPreset`, неблокирующее сохранение графика с автозаполнением пятидневки (Мандат 8e).
  3. *Фича #184: Автономия связи и маркетинга*: неблокирующее закрытие задач связи по невыбранному исходу с инфо-тостом «Выберите результат звонка», 1-клик генерация черновика ответа на отзыв с позитивным шаблоном по умолчанию, разблокировка создания рассылочных кампаний с автогенерацией названия «Сервисная рассылка <дата>».
  4. *Фича #185: Неблокирующий амбулаторный архив и бланки*: неблокирующие действия амбулаторного архива документов при пустом выборе (автоселект первого документа или подсказка), печать чистого бланка Формы 043/у со строками «________» (`btn-043-print-blank`) и штампом «ЧЕРНОВИК (БЛАНК)», штампы «ПОДПИСАНО ВРАЧОМ» / «ЧЕРНОВИК» в договорах и карте, разблокировка печати справок КНД 1151156 при нулевых оплатах.
- **Файлы**: `apps/web/src/components/schedule/ScheduleGrid.tsx`, `QuickBookingDrawer.tsx`, `apps/web/src/components/schedule/roster/DoctorShiftRosterModal.tsx`, `DoctorRosterMatrix.tsx`, `apps/web/src/CommunicationsView.tsx`, `MarketingView.tsx`, `CampaignPanel.tsx`, `apps/web/src/DocumentsView.tsx`, `DentalMedicalCard043uForm.tsx`, `PaidMedicalContractModal.tsx`, `TaxDeductionCertificateModal.tsx`.
- **Тесты**: `scheduleGridStomxInquisition.test.tsx`, `scheduleChairDoctorBinding.test.tsx`, `scheduleRosterMatrixAutonomy.test.tsx`, `scheduleShiftRosterIntegration.test.tsx`, `communicationsMarketingAutonomy.test.tsx`, `documentsViewAutonomy.test.tsx`, `paidMedicalContractAutonomy.test.tsx` (79 тестов, 100% pass, коммиты `ed9fb8863`, `39c8dbb20`, `c32756cec`, `eb80b84f2`, `d47274df4`, `222a1995e`, `9c84ec9ae`, `26609e15f`).

---

## 📋 ЧАСТЬ III. СВОДНЫЙ РЕЕСТР КОНКУРЕНТНОГО ПАРИТЕТА

Все 63 канонические фичи из [`FEATURES_REGISTRY.md`](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURES_REGISTRY.md) (IDENT, DentalPRO, iStom), а также 122 дополнительные системные аддендум-фичи клинической автономии (Wave 15..32, фичи 64..185) имеют статус **`[РЕАЛИЗОВАНО]`**:
- 203 таблицы PostgreSQL 18 в 20 модулях схемы `apps/api/src/db/schema/*.ts`;
- Полнофункциональные маршруты Fastify 5.3+ в `apps/api/src/routes/`;
- Реальные модули интерфейса React 19 в `apps/web/src/`;
- Полная аппаратная интеграция (эквайринг Сбера, фискальные регистраторы 54-ФЗ, 3D DICOM MPR WebWorker, ЕГИСЗ CDA R3 с УКЭП);
- Строгий аудит Мандатов 8e и 8n: абсолютный приоритет соло-врача и клиники 1–3 кресла, отсутствие тупиков и палок в колёса.







