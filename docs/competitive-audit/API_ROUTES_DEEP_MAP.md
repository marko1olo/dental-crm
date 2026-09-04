# 🛣️ Полная Карта Бэкенд-Маршрутов API Dental CRM (Fastify 5.3+)

> **Архитектурная матрица и глубокая карта всех 9 канонических категорий HTTP & WebSocket маршрутов сервера Fastify 5.3+ (`apps/api/src/server.ts`).**  
> Каждый эндпоинт проверен на соответствие реальной кодовой базе, подключен к боевым таблицам PostgreSQL 18.4 и снабжен строгой Zod-валидацией.

---

## 🧭 Навигация и перекрестные ссылки

* 🗺️ **[Главный Индекс (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)** — Центральная навигационная матрица ИИ-агентов.
* 🛣️ **[Исчерпывающий Каталог маршрутов (.agents/API_ROUTES_CATALOG.md)](file:///C:/Clinic_MVP/dental-crm/.agents/API_ROUTES_CATALOG.md)** — Полный реестр 771 эндпоинта в 14 доменах с Zod-схемами, RBAC и привязкой к таблицам.
* 📚 **[Портал Документации (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md)** — Центральный каталог спецификаций и нормативных актов РФ.
* 🗄️ **[Реестр Базы Данных (.agents/DATABASE.md)](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md)** — PostgreSQL 18.4 TCP, 203 таблицы в 20 модулях, RLS изоляция.
* 🗄️ **[Глубокая Карта Базы Данных (docs/competitive-audit/DATABASE_DEEP_MAP.md)](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/DATABASE_DEEP_MAP.md)** — Модульная схема, перечисления и реестр сущностей.
* 🚀 **[Руководство по API-серверу (apps/api/README.md)](file:///C:/Clinic_MVP/dental-crm/apps/api/README.md)** — Стек Fastify 5.3+, WebSocket-шлюз, мигратор и тесты.
* 📋 **[Главная Конституция (.agents/AGENTS.md)](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md)** — Абсолютные стандарты качества, Мандат 8e (автономия врача), запрет моков.

---

## 🌟 Архитектурные принципы шлюза Fastify 5.3+

1. **Строгая типизация и Zod-контракты**: Все входящие `body`, `querystring` и `params` валидируются на границе контроллера. Схемы синхронизированы с фронтендом через `@dental/shared`.
2. **Изоляция арендаторов через RLS**: Каждый входящий запрос проходит через плагин идентификации `getRequestIdentity` и оборачивается в транзакционный контекст `withTenantCtx`, выставляющий параметр `app.current_tenant = organizationId` в сессии PostgreSQL.
3. **Защита автономии врача (Мандат 8e)**:
   - Эндпоинты сохранения визита, дневника 043/у и добавления услуг никогда не возвращают `403/422` из-за незаполненных второстепенных полей.
   - Истечение 30 дней с момента создания плана лечения не блокирует выставление счетов, нарядов ЗТЛ или проведение оплат.
   - Врач имеет право на скидки до 100% без согласований начмеда.
4. **Копеечная точность расчётов**: Все финансовые поля маршрутов биллинга оперируют целочисленными копейками (1 рубль = 100 копеек).
5. **Асинхронные очереди**: Тяжелые операции (выгрузка в РЭМД ЕГИСЗ, фискализация чеков 54-ФЗ, фоновый импорт баз) вынесены в очереди задач с автоматическими повторами.

---

## 1. Пациенты, Лиды и Семейный баланс

> **Обработчики:** `apps/api/src/routes/patients.ts`, `leads.ts`, `finance_family.ts`, `crmLeakDetector.ts`, `loyalty.ts`, `patientDuplicates.ts`, `patientRelationships.ts`.  
> **Таблицы БД:** `patients`, `crm_leads`, `family_groups`, `family_wallets`, `patient_bonus_balances`, `crm_leak_detector_leads`.

| Метод | Эндпоинт | Назначение | RBAC / Доступ | Ключевые параметры |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/patients` | Реестр пациентов с фильтрацией по ФИО, телефону, статусу и тегам | Клиника / Сотрудник | `query: { search, status, limit, offset }` |
| `POST` | `/api/patients` | Создание карточки пациента (быстрая регистрация) | Клиника / Администратор | `body: { firstName, lastName, phone, birthDate? }` |
| `GET` | `/api/patients/:id` | Полная электронная карточка пациента (анкеты, баланс, согласия) | Клиника / Сотрудник | `params: { id }` |
| `PATCH`| `/api/patients/:id` | Обновление персональных и контактных данных пациента | Клиника / Администратор | `params: { id }, body: PatientUpdateSchema` |
| `POST` | `/api/patients/:id/archive` | Перевод пациента в архив с указанием причины (без удаления истории) | Клиника / Управляющий | `params: { id }, body: { reasonId, comment? }` |
| `GET` | `/api/leads` | Воронка лидов и первичных обращений с сайтов и мессенджеров | Клиника / Администратор | `query: { status, source, dateFrom, dateTo }` |
| `POST` | `/api/leads` | Создание нового лида (в т.ч. через вебхуки внешних лендингов) | Публичный / API-ключ | `body: { name, phone, channel, note? }` |
| `POST` | `/api/finance-family/link` | Объединение пациентов в семейную группу с общим счётом | Клиника / Администратор | `body: { primaryPatientId, memberPatientIds[] }` |
| `GET` | `/api/finance-family/:familyId/wallet` | Баланс и история транзакций общего семейного кошелька | Клиника / Сотрудник | `params: { familyId }` |
| `POST` | `/api/finance-family/:familyId/deposit` | Пополнение общего семейного депозита | Клиника / Кассир | `body: { amountKopecks, paymentMethod }` |
| `GET` | `/api/loyalty/patient/:id` | Бонусный баланс, уровень программы лояльности, рефералы | Клиника / Сотрудник | `params: { id }` |
| `POST` | `/api/crm-leak-detector/audit` | Запуск детектора утечки лидов и необработанных звонков | Клиника / Управляющий | `body: { timeWindowMinutes? }` |
| `GET` | `/api/patient-duplicates/candidates` | Список потенциальных дубликатов для безопасного слияния | Клиника / Администратор | `query: { threshold? }` |

---

## 2. Расписание, Дневник смен и Онлайн-запись

> **Обработчики:** `apps/api/src/routes/schedule.ts`, `diary.ts`, `dayConfirmations.ts`, `publicBooking.ts`, `waitlist.ts`, `yandexCalendar.ts`.  
> **Таблицы БД:** `appointments`, `chairs`, `clinic_chairs`, `appointment_waitlists`, `yandex_calendar_syncs`.

| Метод | Эндпоинт | Назначение | RBAC / Доступ | Ключевые параметры |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/schedule/appointments` | Выборка визитов сетки расписания по филиалу, дате, врачу и креслу | Клиника / Сотрудник | `query: { clinicId, dateFrom, dateTo, doctorId? }` |
| `POST` | `/api/schedule/appointments` | Создание записи на приём (без принудительного выбора ассистента) | Клиника / Администратор | `body: AppointmentCreateSchema` |
| `PATCH`| `/api/schedule/appointments/:id` | Изменение времени приёма, статуса, кресла или длительности | Клиника / Сотрудник | `params: { id }, body: AppointmentPatchSchema` |
| `POST` | `/api/schedule/appointments/:id/cancel` | Двухэтапная отмена записи с фиксацией клинической/бытовой причины | Клиника / Администратор | `params: { id }, body: { reasonId, note? }` |
| `GET` | `/api/diary/shifts` | Табель рабочих смен врачей и ассистентов по кабинетам | Клиника / Сотрудник | `query: { clinicId, month, year }` |
| `POST` | `/api/diary/shifts` | Назначение индивидуального графика смен медицинского персонала | Клиника / Управляющий | `body: { staffId, clinicId, chairId, startTime, endTime }` |
| `GET` | `/api/public-booking/slots` | Публичные доступные интервалы для виджетов онлайн-записи | Публичный эндпоинт | `query: { clinicId, specialtyId?, doctorId? }` |
| `POST` | `/api/public-booking/book` | Оформление онлайн-записи пациентом с подтверждением по СМС | Публичный эндпоинт | `body: { slotId, phone, patientName, otpCode }` |
| `GET` | `/api/waitlist` | Реестр пациентов в листе ожидания с автоподбором окон | Клиника / Администратор | `query: { specialty, priority, status }` |
| `POST` | `/api/waitlist/auto-match` | Автоматический подбор пациентов из листа ожидания в освободившееся окно | Клиника / Администратор | `body: { appointmentSlotId, clinicId }` |
| `POST` | `/api/day-confirmations/bulk` | Массовое подтверждение визитов на завтра через WhatsApp/SMS | Клиника / Администратор | `body: { date, channel }` |
| `POST` | `/api/schedule/yandex-sync` | Двусторонняя синхронизация расписания с Яндекс.Календарем | Клиника / Администратор | `body: { calendarId, enableSync }` |

---

## 3. Приём (EHR), Одонтограмма и Голосовой ввод

> **Обработчики:** `apps/api/src/routes/visits.ts`, `clinical.ts`, `odontogram.ts`, `toothHistory.ts`, `speech.ts`, `copilot.ts`, `anesthesia.ts`.  
> **Таблицы БД:** `visits`, `visit_diaries`, `clinical_teeth_catalog`, `patient_tooth_defects`, `treatment_plans`, `anesthesia_logs`.

| Метод | Эндпоинт | Назначение | RBAC / Доступ | Ключевые параметры |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/visits` | Журнал амбулаторных визитов и приёмов клиники | Клиника / Сотрудник | `query: { patientId?, doctorId?, dateFrom?, dateTo? }` |
| `POST` | `/api/visits` | Открытие амбулаторного приёма у кресла | Клиника / Врач | `body: { appointmentId, patientId, doctorId }` |
| `GET` | `/api/visits/:id` | Полная электронная медицинская карта приёма по Форме 043/у | Клиника / Врач | `params: { id }` |
| `PATCH`| `/api/visits/:id/draft/autosave` | Фоновое автосохранение черновика протокола 043/у (защита от потери) | Клиника / Врач | `params: { id }, body: { draftContent, diagnosisMkb10? }`|
| `POST` | `/api/visits/:id/accept` | Подписание визита врачом (печать доступна со штампом «Подписано») | Клиника / Врач | `params: { id }, body: { finalSummary, servicesCompleted[] }`|
| `GET` | `/api/odontogram/patient/:patientId` | Интерактивная формула зубов FDI (11–48 постоянные + 51–85 молочные) | Клиника / Сотрудник | `params: { patientId }` |
| `POST` | `/api/odontogram/tooth-state` | Изменение клинического статуса зуба (кариес, пульпит, пломба, имплант) | Клиника / Врач | `body: { patientId, toothNumber, condition, surfaces? }` |
| `GET` | `/api/odontogram/history/:patientId` | Хронологическая эволюция одонтограммы по всем визитам | Клиника / Врач | `params: { patientId, toothNumber? }` |
| `POST` | `/api/clinical/quick-norm` | Заполнение осмотра и анамнеза физиологической нормой в 1 клик | Клиника / Врач | `body: { visitId, templateId? }` |
| `POST` | `/api/clinical/treatment-plans` | Составление 3-уровневого плана лечения (Эконом / Оптимум / Премиум) | Клиника / Врач | `body: TreatmentPlanPayloadSchema` |
| `POST` | `/api/speech/transcribe-chunk` | Потоковое распознавание врачебной диктовки (Yandex SpeechKit / Whisper) | Клиника / Врач | `multipart/form-data: audio/webm; codec=opus` |
| `GET` | `/api/speech/status` | Мониторинг провайдеров распознавания речи и состояния прокси | Клиника / Администратор | — |
| `POST` | `/api/copilot/analyze-case` | Анализ клинического случая Copilot (проверка совместимости услуг) | Клиника / Врач | `body: { toothNumber, proposedServices[], anamnesis }` |

---

## 4. 3D DICOM MPR Viewer, Рентгенология & ИИ

> **Обработчики:** `apps/api/src/routes/xray.ts`, `imaging.ts`, `dicomweb.ts`, `imaging_planning.ts`, `integrations/diagnocat.js`.  
> **Таблицы БД:** `imaging_studies`, `imaging_series`, `imaging_instances`, `patient_ct_plannings`, `diagnocat_reports`.

| Метод | Эндпоинт | Назначение | RBAC / Доступ | Ключевые параметры |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/imaging/patient/:patientId` | Список всех радиологических исследований (КТ, ОПТГ, визиография) | Клиника / Сотрудник | `params: { patientId }` |
| `POST` | `/api/imaging/upload` | Загрузка DICOM-архива (.dcm / .zip) или графического снимка визиографа | Клиника / Сотрудник | `multipart/form-data: { file, patientId, modality }` |
| `GET` | `/api/xray/fast-preview/:id` | Мгновенная отдача 16-битного снимка визиографа **< 50 мс** | Клиника / Врач | `params: { id }, query: { windowWidth?, windowCenter? }` |
| `GET` | `/api/imaging/dicom-web/studies/:studyInstanceUid/series` | DICOMweb QIDO-RS интерфейс серий для веб-просмотрщика Cornerstone 3D | Клиника / Врач | `params: { studyInstanceUid }` |
| `GET` | `/api/imaging/dicom-web/studies/:studyUid/series/:seriesUid/instances/:instanceUid/frames/:frame` | DICOMweb WADO-RS получение срезов КЛКТ для мультипланарной реконструкции (MPR) | Клиника / Врач | `params: { studyUid, seriesUid, instanceUid, frame }` |
| `POST` | `/api/imaging/planning/implant` | Сохранение 3D-планирования дентальной имплантации (угол, глубина, ось) | Клиника / Хирург | `body: { patientId, toothNumber, implantModel, coordinates3D }`|
| `POST` | `/api/integrations/diagnocat/upload` | Запуск ИИ-диагностики Diagnocat строго по отдельной кнопке врача | Клиника / Врач | `body: { studyId, callbackUrl? }` |
| `GET` | `/api/integrations/diagnocat/report/:studyId` | Получение отчёта нейросети с патологиями (без автоперезаписи формулы)| Клиника / Врач | `params: { studyId }` |

---

## 5. Документооборот, ИДС, Справки НДФЛ & ЕГИСЗ

> **Обработчики:** `apps/api/src/routes/documents.ts`, `documentTemplates.ts`, `egisz.ts`, `files.ts`.  
> **Таблицы БД:** `documents`, `document_templates`, `document_template_variables`, `signed_outpatient_cards`.

| Метод | Эндпоинт | Назначение | RBAC / Доступ | Ключевые параметры |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/documents/patient/:patientId` | Реестр всех подписанных договоров, актов, ИДС и смет пациента | Клиника / Сотрудник | `params: { patientId }` |
| `POST` | `/api/documents/issue` | Генерация PDF-документа из 31 канонического вида (Форма 043/у, ИДС, Акт) | Клиника / Сотрудник | `body: { kind, patientId, visitId?, templateData }` |
| `GET` | `/api/documents/:id/pdf` | Выгрузка сгенерированного PDF документа (с водяным знаком «Черновик»/«Подписано») | Клиника / Сотрудник | `params: { id }` (поддержка `tenantTxSelfManaged`) |
| `POST` | `/api/documents/blank-contract` | Печать чистого договора с 0 ₽ и строками `_______` без 403-ошибок | Клиника / Регистратор | `body: { patientId }` |
| `POST` | `/api/documents/ndfl/xml` | Формирование XML-справки для налогового вычета 13% (ФНС КНД 1151156) | Клиника / Бухгалтер | `body: { patientId, taxYear, payerInn, amountKopecks }` |
| `POST` | `/api/egisz/export-cda` | Формирование структурированного электронного меддокумента HL7 CDA R3 | Клиника / Начмед | `body: { visitId, documentKind }` |
| `POST` | `/api/egisz/sign-and-send` | Подписание СЭМД через УКЭП КриптоПро и отправка в РЭМД ЕГИСЗ N3.Health | Клиника / Начмед | `body: { cdaXml, doctorCertificate, clinicCertificate }` |
| `GET` | `/api/egisz/status/:taskId` | Статус регистрации документа в федеральном регистре РЭМД ЕГИСЗ | Клиника / Администратор | `params: { taskId }` |

---

## 6. Омниканальные Коммуникации (Telegram, WhatsApp, VK, АТС)

> **Обработчики:** `apps/api/src/routes/communications.ts`, `communicationsOutbox.ts`, `telegram.ts`, `whatsapp.ts`, `whatsappWebhook.ts`, `vk.ts`, `telephony.ts`.  
> **Таблицы БД:** `communication_events`, `communication_tasks`, `message_templates`, `outbound_message_queue`, `telegram_bot_configs`.

| Метод | Эндпоинт | Назначение | RBAC / Доступ | Ключевые параметры |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/communications/timeline/:patientId` | Хронологическая омниканальная лента звонков, SMS и чатов пациента | Клиника / Сотрудник | `params: { patientId }` |
| `POST` | `/api/communications/send` | Отправка сообщения пациенту в выбранный канал (WhatsApp/Telegram/SMS/VK)| Клиника / Сотрудник | `body: { patientId, channel, text, templateId? }` |
| `POST` | `/api/telegram/webhook` | Вебхук входящих сообщений бота клиники в Telegram | Внешний вебхук TG | `body: TelegramUpdateObject` |
| `POST` | `/api/telegram/link-code` | Генерация одноразового кода для безопасной привязки Telegram без утечки PHI | Клиника / Сотрудник | `body: { patientId, ttlMinutes? }` |
| `POST` | `/api/whatsapp/webhook` | Вебхук входящих событий и статусов доставки WhatsApp Cloud API | Внешний вебхук WA | `body: WhatsAppWebhookPayload` |
| `POST` | `/api/vk/webhook` | Вебхук Callback API социальной сети ВКонтакте (VK MAX) | Внешний вебхук VK | `body: VkCallbackPayload` |
| `POST` | `/api/telephony/webhook` | Входящий вебхук виртуальной АТС (UIS / Mango Telecom / Zadarma) | Внешний вебхук АТС | `body: TelephonyEventPayload` |
| `GET` | `/api/telephony/status` | Статус регистрации линий софтфона и активных операторов | Клиника / Администратор | — |
| `POST` | `/api/telephony/originate` | Инициация исходящего звонка кликом по номеру телефона (Click-to-Call) | Клиника / Сотрудник | `body: { destinationPhone, staffExtension }` |

---

## 7. Финансы, Платежи, ККМ (54-ФЗ) & Расчет ЗП

> **Обработчики:** `apps/api/src/routes/billing.ts`, `cashbox_v2.ts`, `expenses.ts`, `fiscal/index.ts`, `sbpQr.ts`, `financialPnl.ts`.  
> **Таблицы БД:** `payments`, `patient_invoices`, `cash_boxes`, `cash_shifts`, `fiscal_receipt_queue`, `doctor_payroll_statements`.

| Метод | Эндпоинт | Назначение | RBAC / Доступ | Ключевые параметры |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/billing/ledger` | Главная финансовая книга проводок клиники | Клиника / Бухгалтер | `query: { clinicId, dateFrom, dateTo, method? }` |
| `POST` | `/api/billing/payments` | Проведение оплаты за визит с защитой от двойного списания (UUID Idempotency)| Клиника / Кассир | `body: { invoiceId, amountKopecks, method, idempotencyKey }`|
| `POST` | `/api/fiscal/receipts` | Фискализация чека 54-ФЗ (ФФД 1.2, теги 1212/2108, комбинированная оплата) | Клиника / Кассир | `body: FiscalReceiptPayloadSchema` |
| `POST` | `/api/fiscal/refund` | Формирование чека возврата прихода (полный или частичный) | Клиника / Кассир | `body: { originalReceiptId, refundAmountKopecks, reason }` |
| `GET` | `/api/fiscal/queue` | Мониторинг очереди неотправленных чеков при авариях связи с ОФД | Клиника / Администратор | `query: { status? }` |
| `POST` | `/api/sbp/generate-qr` | Генерация динамического QR-кода Системы Быстрых Платежей (СБП) | Клиника / Кассир | `body: { invoiceId, amountKopecks }` |
| `POST` | `/api/cashbox/shift/open` | Открытие кассовой смены с фиксацией разменного фонда | Клиника / Кассир | `body: { cashboxId, openingBalanceKopecks }` |
| `POST` | `/api/cashbox/shift/close` | Закрытие смены, снятие Z-отчёта и сверка расхождений | Клиника / Кассир | `body: { cashboxId, actualCashKopecks }` |
| `GET` | `/api/payroll/calculate` | Расчёт заработной платы и сдельного процента врачей по нарядам 804н | Клиника / Бухгалтер | `query: { doctorId, month, year }` |
| `GET` | `/api/financial-pnl/report` | Отчёт о прибылях и убытках (P&L) с детализацией прямых затрат | Клиника / Владелец | `query: { clinicId, period }` |

---

## 8. Склад, Стерилизация и Лаборатория

> **Обработчики:** `apps/api/src/routes/inventory.ts`, `warehouse/index.ts`, `sanpin.ts`, `sterilization.ts`, `lab.ts`, `mdlp.ts`.  
> **Таблицы БД:** `inventory_items`, `warehouses`, `stock_batches`, `sterilization_logs`, `dental_lab_orders`, `mdlp_items`.

| Метод | Эндпоинт | Назначение | RBAC / Доступ | Ключевые параметры |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/inventory/items` | Складской каталог материалов с текущими остатками по филиалам | Клиника / Сотрудник | `query: { warehouseId?, category?, lowStockOnly? }` |
| `POST` | `/api/warehouse/:orgId/quick-carpule-disposal` | **1-клик списание пустых карпул анестетиков** медсестрой без комиссии | Клиника / Медсестра | `params: { orgId }, body: { carpuleCount, anestheticItemId }`|
| `POST` | `/api/warehouse/:orgId/soft-overdraft-deduct` | **Мягкий овердрафт склада**: списание материалов при задержке накладной | Клиника / Врач | `params: { orgId }, body: { itemsToDeduct[] }` (200 OK) |
| `POST` | `/api/inventory/write-off` | Списание расходников на визит по технологической карте услуги 804н | Клиника / Ассистент | `body: { visitId, serviceCatalogId }` |
| `POST` | `/api/sterilization/pso/quick-norm` | Фиксация предстерилизационной очистки (азопирам — норма в 1 клик) | Клиника / Медсестра | `body: { batchNumber, instrumentsCount }` |
| `POST` | `/api/sterilization/daily-tests` | Журнал контроля работы стерилизаторов (Бови-Дик, вакуум-тест, тест-полоски)| Клиника / Медсестра | `body: { autoclaveId, testType, result }` |
| `POST` | `/api/sterilization/link` | Привязка простерилизованного крафт-пакета по штрихкоду к карте 043/у | Клиника / Ассистент | `body: { barcode, visitId }` |
| `GET` | `/api/lab/orders` | Реестр заказ-нарядов в зуботехническую лабораторию (коронки, протезы) | Клиника / Сотрудник | `query: { clinicId?, status?, patientId? }` |
| `POST` | `/api/lab/orders` | Создание заказ-наряда в ЗТЛ с привязкой зубов FDI и оттенка шкалы VITA | Клиника / Ортопед | `body: LabOrderCreateSchema` |
| `PATCH`| `/api/lab/orders/:id/status` | Смена статуса готовности работы ЗТЛ (в работе / примерка / готова) | Клиника / Сотрудник | `params: { id }, body: { newStatus, trackingNotes? }` |
| `POST` | `/api/mdlp/scan-and-verify` | Проверка 2D DataMatrix кода препарата через шлюз Честный ЗНАК | Клиника / Медсестра | `body: { sgtinBarcode }` |

---

## 9. Умная Миграция Данных (Smart Imports)

> **Обработчики:** `apps/api/src/routes/smartImports.ts`, `migration.ts`, `migrationRuns.ts`, `imports.ts`.  
> **Таблицы БД:** `migration_runs`, `migration_reconciliations`, `ingestion_runs`.

| Метод | Эндпоинт | Назначение | RBAC / Доступ | Ключевые параметры |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/smart-imports/preview` | Быстрый парсинг выгрузки конкурентов (IDENT, DentalPRO, Инфоклиника, 1С) | Клиника / Управляющий | `multipart/form-data: { file, sourceSystem }` |
| `POST` | `/api/smart-imports/commit` | Запуск фоновой миграции сущностей (пациенты, балансы, визиты, врачи) | Клиника / Управляющий | `body: { previewSessionId, mappingConfig }` |
| `GET` | `/api/migration-runs` | Журнал выполнения сессий миграций с процентом прогресса | Клиника / Администратор | `query: { limit?, offset? }` |
| `GET` | `/api/migration-runs/:id` | Детальный лог импорта конкретной базы с выявленными ошибками строк | Клиника / Администратор | `params: { id }` |
| `POST` | `/api/migration-runs/:id/rollback` | Полный безопасный откат загруженных данных при выявлении брака | Клиника / Управляющий | `params: { id }` |
| `POST` | `/api/migration-runs/:id/reconcile` | Сверка контрольных сумм импортированных оплат и финансовых балансов | Клиника / Бухгалтер | `params: { id }` |

---

## 🌐 WebSocket Маршрут реального времени

| Метод | Маршрут | Протокол | Авторизация | Описание |
| :--- | :--- | :---: | :--- | :--- |
| `GET` | `/api/ws/schedule` | **WSS** | Внутриканальный JSON-кадр `AUTH` | Полнодуплексный шлюз оповещений расписания, входящих звонков телефонии, статусов ЗТЛ и чатов |

```
[WebSocket Client]  ---> CONNECT ws://127.0.0.1:3000/api/ws/schedule
[WebSocket Server]  <--- ACCEPT (Connection open, 10s Auth Timeout started)
[WebSocket Client]  ---> SEND {"type": "AUTH", "clinicToken": "...", "staffToken": "..."}
[WebSocket Server]  <--- VERIFY TOKENS (binds client to organizationId)
[WebSocket Server]  ---> SEND {"type": "AUTH_OK", "organizationId": "..."}
[wsBroker Broadcast]---> PUSH {"type": "SCHEDULE_APPOINTMENT_CHANGE", "appointmentId": "..."}
```

---

> Для получения подробных TypeScript интерфейсов, схем Zod и параметров каждого из 771 эндпоинта обращайтесь к **[`API_ROUTES_CATALOG.md`](file:///C:/Clinic_MVP/dental-crm/.agents/API_ROUTES_CATALOG.md)**.
