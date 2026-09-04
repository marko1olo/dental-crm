# Архитектурный эталон внедрения фич (Архитектура и Реализация)

> 🧭 **Навигация:** [🗺️ Главный Индекс (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) | [📚 Портал Документации (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md) | [📋 Реестр 63 Фич (FEATURES_REGISTRY.md)](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURES_REGISTRY.md) | [🗺️ Карта CRM (OUR_CRM_MAP.md)](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/OUR_CRM_MAP.md)
>
> ⚠️ **СТАТУС (2026-09-04): ВСЕ 63 ФИЧИ, 9 КИЛЛЕР-МОДУЛЕЙ И 10 КИЛЛЕР-ФИЧ АВТОНОМИИ ВРАЧА И СНИЖЕНИЯ ТРЕНИЯ ПОЛНОСТЬЮ РЕАЛИЗОВАНЫ.**  
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

## ⚡ ЧАСТЬ II. ШЕСТЬ КИЛЛЕР-ФИЧ СНИЖЕНИЯ ТРЕНИЯ И АВТОНОМИИ ВРАЧА (МАНДАТЫ 8e, 8k, 8n)

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

## 📋 ЧАСТЬ III. СВОДНЫЙ РЕЕСТР КОНКУРЕНТНОГО ПАРИТЕТА

Все 63 канонические фичи из [`FEATURES_REGISTRY.md`](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURES_REGISTRY.md) (IDENT, DentalPRO, iStom) имеют статус **`[РЕАЛИЗОВАНО]`**:
- 203 таблицы PostgreSQL 18 в 20 модулях схемы `apps/api/src/db/schema/*.ts`;
- Полнофункциональные маршруты Fastify 5.3+ в `apps/api/src/routes/`;
- Реальные модули интерфейса React 19 в `apps/web/src/`;
- Полная аппаратная интеграция (эквайринг Сбера, фискальные регистраторы 54-ФЗ, 3D DICOM MPR WebWorker, ЕГИСЗ CDA R3 с УКЭП);
- Строгий аудит Мандатов 8e и 8n: абсолютный приоритет соло-врача и клиники 1–3 кресла, отсутствие тупиков и палок в колёса.
