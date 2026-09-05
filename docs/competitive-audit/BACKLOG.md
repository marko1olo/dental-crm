# Архитектурный эталон внедрения фич (Архитектура и Реализация)

> 🧭 **Навигация:** [🗺️ Главный Индекс (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) | [📚 Портал Документации (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md) | [📋 Реестр 63 Фич (FEATURES_REGISTRY.md)](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURES_REGISTRY.md) | [🗺️ Карта CRM (OUR_CRM_MAP.md)](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/OUR_CRM_MAP.md)
>
> ⚠️ **СТАТУС (2026-09-04): ВСЕ 63 ФИЧИ, 9 КИЛЛЕР-МОДУЛЕЙ И 20 КИЛЛЕР-ФИЧ АВТОНОМИИ ВРАЧА И СНИЖЕНИЯ ТРЕНИЯ ПОЛНОСТЬЮ РЕАЛИЗОВАНЫ.**  
> В кодовой базе нет нереализованных фич со статусами `[НЕТ]` или `[ЧАСТИЧНО]`. Этот документ фиксирует архитектурные решения и конкретные файлы, где каждая фича работает в production.  
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

## ⚡ ЧАСТЬ II. ДВАДЦАТЬ КИЛЛЕР-ФИЧ СНИЖЕНИЯ ТРЕНИЯ И АВТОНОМИИ ВРАЧА (МАНДАТЫ 8e, 8k, 8n)

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
- **Идея**: Задержка оприходования накладной поставщика никогда не блокирует прием пациента или операцию. Склад списывает расходники в контролируемый минус («emergency_overdraft») с предупреждением, а не выбивает ошибку с прерыванием операции.
- **Статус**: 
  - Сервис бэкенда: `apps/api/src/services/treatmentConsumablesService.ts` (`isOverdraft: true`, `transactionType: "emergency_overdraft"`)
  - Миграция PostgreSQL 18: `apps/api/drizzle/0198_stock_warehouses_fefo_batches_and_bom.sql`
  - Фронтенд: `apps/web/src/components/warehouse/NurseCarpuleDisposalModal.tsx` (информационный бейдж вместо блокировок)

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

## 23. `зуботехническая_лаборатория::автономия_врача_без_начмеда` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e & 8n)
- **Идея**: В частной стоматологии врач свободен в клинических решениях. Ликвидировано бюрократическое требование «Авторизация Главного врача» при отправке наряда ЗТЛ с предоплатой < 50%. Врач подтверждает отправку наряда в 1 клик по клиническим показаниям. Истечение 30 дней предварительного плана лечения переведено в мягкое информационное предупреждение вместо блокировки.
- **Статус**: 
  - Фронтенд: `apps/web/src/components/lab/DentalLabFinancialGate.tsx`, `DentalLabOrderModal.tsx`, `dentalLabFinancialGateEngine.ts` (коммит `e990812b8`)
  - Тесты: 37/37 тестов ZTL пройдены успешно.

---

## 24. `детство::возрастные_пресеты_сменного_прикуса_и_резорбции` [РЕАЛИЗОВАНО] -> KILLER (МАНДАТЫ 8e & 8k)
- **Идея**: Детский стоматолог не тратит время на 20 ручных кликов по молочным зубам. Внедрены мгновенные возрастные пресеты (3–5 лет временный прикус, 6–8 лет ранний сменный, 9–12 лет поздний сменный) и 1-клик установка физиологической резорбции корней по возрасту.
- **Статус**: 
  - Фронтенд: `apps/web/src/components/odontogram/PediatricMixedDentitionModal.tsx`, `PediatricResorptionTab.tsx` (коммит `81b37477b`)
  - Тесты: 26/26 тестов детской одонтограммы пройдены успешно.

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

## 📋 ЧАСТЬ III. СВОДНЫЙ РЕЕСТР КОНКУРЕНТНОГО ПАРИТЕТА

Все 63 канонические фичи из [`FEATURES_REGISTRY.md`](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURES_REGISTRY.md) (IDENT, DentalPRO, iStom) имеют статус **`[РЕАЛИЗОВАНО]`**:
- 203 таблицы PostgreSQL 18 в 20 модулях схемы `apps/api/src/db/schema/*.ts`;
- Полнофункциональные маршруты Fastify 5.3+ в `apps/api/src/routes/`;
- Реальные модули интерфейса React 19 в `apps/web/src/`;
- Полная аппаратная интеграция (эквайринг Сбера, фискальные регистраторы 54-ФЗ, 3D DICOM MPR WebWorker, ЕГИСЗ CDA R3 с УКЭП);
- Строгий аудит Мандатов 8e и 8n: абсолютный приоритет соло-врача и клиники 1–3 кресла, отсутствие тупиков и палок в колёса.
