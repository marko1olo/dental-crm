# Полная Карта Базы Данных и Сущностей Dental CRM (PostgreSQL / Drizzle ORM)

## 1. Базовые перечисления (pgEnum)

### 1.1. Клинические и Приёмные статусы
- `patient_status`: `active`, `archived`
- `appointment_status`: `planned`, `confirmed`, `arrived`, `in_treatment`, `completed`, `cancelled`, `no_show`
- `visit_status`: `draft`, `signed`, `voided`
- `dental_specialty`: `therapist`, `orthopedist`, `surgeon`, `orthodontist`, `periodontist`, `hygienist`, `pediatric`, `implantologist`, `radiologist`, `universal`
- `service_category`: `consultation`, `therapy`, `surgery`, `prosthetics`, `orthodontics`, `periodontology`, `hygiene`, `imaging`, `documents`, `other`
- `treatment_plan_item_status`: `proposed`, `approved`, `in_progress`, `completed`, `cancelled`
- `treatment_plan_scenario_strategy`: `urgent`, `standard`, `optimal`, `phased`, `maintenance`
- `treatment_plan_scenario_priority`: `budget`, `balanced`, `clinical`

### 1.2. Финансы и Платежи
- `payment_method`: `cash`, `card`, `bank_transfer`, `online`, `insurance`, `family_wallet`, `other`
- `payment_status`: `planned`, `paid`, `refunded`, `voided`

### 1.3. Коммуникации и Мессенджеры
- `communication_channel`: `phone`, `sms`, `whatsapp`, `telegram`, `email`, `vk`, `in_person`
- `communication_intent`: `appointment_confirmation`, `payment_reminder`, `post_visit_instruction`, `recall`, `document_ready`, `imaging_review`, `general`
- `communication_status`: `queued`, `scheduled`, `needs_call`, `sent`, `delivered`, `completed`, `failed`, `skipped`
- `communication_priority`: `low`, `normal`, `high`, `urgent`
- `communication_direction`: `inbound`, `outbound`

### 1.4. Telegram Bot API и Безопасность (PHO)
- `dente_telegram_bot_mode`: `disabled`, `shared_dente_bot`, `clinic_owned_bot`
- `dente_telegram_privacy_mode`: `no_phi_by_default`, `limited_admin_only`, `consented_phi_templates`
- `dente_telegram_subject_type`: `patient`, `staff`
- `dente_telegram_link_code_status`: `pending`, `used`, `expired`, `revoked`
- `dente_telegram_chat_link_status`: `active`, `revoked`

---

## 2. Полный Реестр Видов Документов (documentKind — 31 вид!)

В Dental CRM встроен полноценный юридически значимый документооборот стоматологии:

1. `paid_medical_services_contract` — Договор оказания платных медицинских услуг
2. `completed_works_act` — Акт выполненных работ / оказанных услуг
3. `tax_deduction_certificate` — Справка для налогового вычета (Форма ФНС КНД 1151156)
4. `informed_consent` — Общее информированное добровольное согласие (ИДС)
5. `procedure_specific_consent_packet` — Специализированное ИДС на процедуры (Имплантация, Синус-лифтинг, Ортодонтия, Седация)
6. `treatment_plan` — План лечения
7. `treatment_plan_acceptance` — Согласие пациента с выбором плана лечения
8. `anesthesia_consent_log` — Журнал анестезиологического пособия
9. `prescription_medication_order` — Рецептурный бланк на лекарственные препараты
10. `personal_data_processing_consent` — Согласие на обработку персональных данных (152-ФЗ)
11. `minor_legal_representative_consent` — Договор и ИДС с законным представителем несовершеннолетнего
12. `photo_video_consent` — Согласие на фото/видеосъемку и использование материалов
13. `medical_intervention_refusal` — Официальный отказ от медицинского вмешательства
14. `treatment_cost_estimate` — Предварительная смета расходов
15. `payment_invoice` — Счет на оплату
16. `payment_receipt` — Кассовый чек / Квитанция об оплате
17. `installment_payment_schedule` — График рассрочки платежей
18. `post_visit_recommendations` — Памятка и рекомендации пациенту после визита
19. `outpatient_medical_card_025u` — Медицинская карта амбулаторного больного (Форма 025/у)
20. `medical_record_extract` — Выписка из медицинской карты
21. `medical_record_copy_request` — Заявление на выдачу копий медицинских документов
22. `medical_document_release_receipt` — Журнал учета выдачи медицинских документов
23. `xray_cbct_referral` — Направление на КТ / Рентгенографию
24. `lab_work_order` — Заказ-наряд в зуботехническую лабораторию
25. `visit_attendance_certificate` — Справка о посещении стоматологической клиники
26. `warranty_service_memo` — Гарантийный талон и памятка по гарантийным обязательствам
27. `payment_refund_correction_request` — Заявление на возврат денежных средств
28. `tax_deduction_application` — Заявление пациента на выдачу справки НДФЛ
29. `legacy_tax_deduction_certificate` — Архивный реестр справок НДФЛ
30. `tax_deduction_registry` — Сводный журнал отгрузки справок НДФЛ
31. `patient_intake_questionnaire` — Анкеты здоровья и первичного опроса пациента

---

## 3. Таблицы Базы Данных (pgTable)

- `patients` — Картотека пациентов.
- `patient_families` & `family_wallets` — Семейные группы и общие депозиты.
- `appointments` — Расписание визитов.
- `visits` — Электронные медицинские карты (ЭМК), дневник приема.
- `tooth_states` & `tooth_history` — История состояний одонтограммы.
- `documents` — Сгенерированные PDF и подписанные акты/договора.
- `communications` — Лента всех звонков, СМС, мессенджеров.
- `dente_telegram_*` — Схемы бота Телеграм и хранилища ссылок/кодов.
- `ai_recognition_jobs` — Задачи ИИ Диагностики (Diagnocat, SpeechKit, OCR).
- `inventory_*` — Склад и списание материалов.
- `sterilization_logs` — Журнал автоклавирования.
- `lab_work_orders` — Портал зуботехнических лабораторий.
