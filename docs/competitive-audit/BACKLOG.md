# Архитектурный эталон внедрения фич (Архитектура и Реализация)

> 🧭 **Навигация:** [🗺️ Главный Индекс (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) | [📚 Портал Документации (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md) | [📋 Реестр 63 Фич (FEATURES_REGISTRY.md)](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURES_REGISTRY.md) | [🗺️ Карта CRM (OUR_CRM_MAP.md)](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/OUR_CRM_MAP.md)
>
> ⚠️ **СТАТУС (2026-09-06 / WAVE 20): ВСЕ 63 ФИЧИ, 9 КИЛЛЕР-МОДУЛЕЙ И 98 КИЛЛЕР-ФИЧ АВТОНОМИИ ВРАЧА, КЛИНИЧЕСКИХ ПРЕСЕТОВ 1-КЛИКА И СНИЖЕНИЯ ТРЕНИЯ ПОЛНОСТЬЮ РЕАЛИЗОВАНЫ.**  
> В кодовой базе нет нереализованных фич со статусами `[НЕТ]` или `[ЧАСТИЧНО]`. Все модули покрыты автоматическими тестами, работают в production и соответствуют Высшей Конституции THE HAMMER и Мандатам 8e (Автономия врача), 8k (CRM != тренажер), 8n (Соло-врач и небольшая клиника), 8o (Анти-карго-культ). Этот документ фиксирует архитектурные решения и конкретные файлы, где каждая фича работает в production.  
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

## ⚡ ЧАСТЬ II. ПЯТЬДЕСЯТ ТРИ КИЛЛЕР-ФИЧИ СНИЖЕНИЯ ТРЕНИЯ, КЛИНИЧЕСКИХ ПРЕСЕТОВ И АВТОНОМИИ ВРАЧА (МАНДАТЫ 8e, 8k, 8n)

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
  - Бэкенд: `apps/api/src/routes/treatmentConsumables.ts`, `apps/api/src/services/treatmentConsumablesService.ts`
  - Фронтенд: `apps/web/src/components/InventoryView.tsx`, `useInventoryLogic.ts`, `NurseCarpuleDisposalModal.tsx`, `packages/shared/src/anesthesia/pkuDisposal.ts` (коммит `5c39b86a0`).
  - Тесты: `apps/web/src/components/inventory/__tests__/clinical804nWriteoff.test.ts` (100% passing).

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
  - Фронтенд: `apps/web/src/components/sanpin/autoclaveLog/AutoclaveNewCycleTab.tsx` (коммит `31cb4a2c4`).
  - Тесты: `apps/web/src/components/sanpin/__tests__/autoclaveExpressCycle.test.ts` (17 тестов, 100% passing).

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

## 📋 ЧАСТЬ III. СВОДНЫЙ РЕЕСТР КОНКУРЕНТНОГО ПАРИТЕТА

Все 63 канонические фичи из [`FEATURES_REGISTRY.md`](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURES_REGISTRY.md) (IDENT, DentalPRO, iStom), а также 48 дополнительных системных аддендум-фич клинической автономии (Wave 15..22, фичи 64..111) имеют статус **`[РЕАЛИЗОВАНО]`**:
- 203 таблицы PostgreSQL 18 в 20 модулях схемы `apps/api/src/db/schema/*.ts`;
- Полнофункциональные маршруты Fastify 5.3+ в `apps/api/src/routes/`;
- Реальные модули интерфейса React 19 в `apps/web/src/`;
- Полная аппаратная интеграция (эквайринг Сбера, фискальные регистраторы 54-ФЗ, 3D DICOM MPR WebWorker, ЕГИСЗ CDA R3 с УКЭП);
- Строгий аудит Мандатов 8e и 8n: абсолютный приоритет соло-врача и клиники 1–3 кресла, отсутствие тупиков и палок в колёса.

