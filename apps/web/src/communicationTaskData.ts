import type { CommunicationTaskWorkflowCode, GeneratedDocument, PostVisitCareTopic } from "@dental/shared";

export const telegramDocumentRequestTaskDocumentKinds: Record<string, readonly GeneratedDocument["kind"][]> = {
  "Пациент запросил налоговые документы": [
    "tax_deduction_application",
    "tax_deduction_certificate",
    "legacy_tax_deduction_certificate",
    "tax_deduction_registry"
  ],
  "Пациент запросил финансовые документы": [
    "payment_invoice",
    "payment_receipt",
    "completed_works_act",
    "installment_payment_schedule",
    "payment_refund_correction_request"
  ],
  "Пациент запросил медицинские документы": [
    "medical_record_copy_request",
    "outpatient_medical_card_025u",
    "medical_record_extract",
    "medical_document_release_receipt",
    "visit_attendance_certificate"
  ],
  "Пациент запросил формы и согласия": [
    "patient_intake_questionnaire",
    "personal_data_processing_consent",
    "informed_consent",
    "procedure_specific_consent_packet",
    "medical_intervention_refusal",
    "minor_legal_representative_consent",
    "photo_video_consent"
  ]
};

export const telegramCareRequestTaskCareTopics: Record<string, PostVisitCareTopic> = {
  "Пациент запросил памятку после удаления": "extraction",
  "Пациент запросил памятку после имплантации": "implantation",
  "Пациент запросил памятку после пломбы": "filling_restoration",
  "Пациент запросил памятку после эндодонтии": "endo",
  "Пациент запросил памятку после хирургии": "surgery",
  "Пациент запросил памятку после анестезии": "local_anesthesia",
  "Пациент запросил памятку после гигиены": "hygiene",
  "Пациент запросил памятку после протезирования": "prosthetics",
  "Пациент запросил памятку после ортодонтии": "orthodontics",
  "Пациент запросил памятку после пародонтологии": "periodontology"
};

export const telegramDocumentRequestWorkflowDocumentKinds: Partial<
  Record<NonNullable<CommunicationTaskWorkflowCode>, readonly GeneratedDocument["kind"][]>
> = {
  telegram_tax_document_request: [
    "tax_deduction_application",
    "tax_deduction_certificate",
    "legacy_tax_deduction_certificate",
    "tax_deduction_registry"
  ],
  telegram_billing_document_request: [
    "payment_invoice",
    "payment_receipt",
    "completed_works_act",
    "installment_payment_schedule",
    "payment_refund_correction_request"
  ],
  telegram_medical_document_request: [
    "medical_record_copy_request",
    "outpatient_medical_card_025u",
    "medical_record_extract",
    "medical_document_release_receipt",
    "visit_attendance_certificate"
  ],
  telegram_patient_forms_request: [
    "patient_intake_questionnaire",
    "personal_data_processing_consent",
    "informed_consent",
    "procedure_specific_consent_packet",
    "medical_intervention_refusal",
    "minor_legal_representative_consent",
    "photo_video_consent"
  ]
};

export const telegramCareRequestWorkflowCareTopics: Partial<Record<NonNullable<CommunicationTaskWorkflowCode>, PostVisitCareTopic>> = {
  telegram_care_extraction_request: "extraction",
  telegram_care_implant_request: "implantation",
  telegram_care_filling_request: "filling_restoration",
  telegram_care_endo_request: "endo",
  telegram_care_surgery_request: "surgery",
  telegram_care_anesthesia_request: "local_anesthesia",
  telegram_care_hygiene_request: "hygiene",
  telegram_care_prosthetics_request: "prosthetics",
  telegram_care_orthodontics_request: "orthodontics",
  telegram_care_periodontology_request: "periodontology"
};

export const communicationDocumentTaskActionLabels: Partial<Record<GeneratedDocument["kind"], string>> = {
  tax_deduction_application: "Заявка",
  tax_deduction_certificate: "Справка 2024+",
  legacy_tax_deduction_certificate: "Справка 2021-2023",
  tax_deduction_registry: "Реестр",
  outpatient_medical_card_025u: "Карта 025/у",
  medical_record_extract: "Выписка",
  medical_record_copy_request: "Копии карты",
  medical_document_release_receipt: "Расписка выдачи",
  visit_attendance_certificate: "Справка визита",
  patient_intake_questionnaire: "Анкета",
  personal_data_processing_consent: "Персональные данные",
  informed_consent: "Согласие на лечение",
  procedure_specific_consent_packet: "Согласие по процедуре",
  medical_intervention_refusal: "Отказ",
  minor_legal_representative_consent: "Представитель",
  photo_video_consent: "Фото и видео",
  post_visit_recommendations: "Подготовить памятку"
};
