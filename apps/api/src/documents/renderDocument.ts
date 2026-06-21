import {
  documentKindMetadata,
  legacyTaxDeductionCertificateMaxYear,
  legacyTaxDeductionCertificateMinYear,
  taxDeductionCertificateMinYear,
  type ClinicalToothRow,
  type ClinicProfile,
  type CompletedWorksActPayload,
  type DocumentKind,
  type GeneratedDocument,
  type InformedConsentPayload,
  type InstallmentPaymentSchedulePayload,
  type MedicalInterventionRefusalPayload,
  type MedicalRecordCopyRequestPayload,
  type MedicalRecordExtractPayload,
  type MinorLegalRepresentativeConsentPayload,
  type OutpatientMedicalCard025uPayload,
  type Patient,
  type PaidMedicalServicesContractPayload,
  type Payment,
  type PaymentInvoicePayload,
  type PaymentReceiptPayload,
  type PersonalDataProcessingConsentPayload,
  type PostVisitRecommendationsPayload,
  type ProcedureSpecificConsentPayload,
  type ServiceCatalogItem,
  type TaxDeductionApplicationDeliveryChannel,
  type TaxDeductionApplicationForm,
  type TaxDeductionApplicationRelationship,
  type TreatmentCostEstimatePayload,
  type TreatmentPlanPayload,
  type TreatmentPlanAcceptancePayload,
  type TreatmentPlanItem,
  type VisitAttendanceCertificatePayload,
  type WarrantyServiceMemoPayload
} from "@dental/shared";
import { taxPaymentsForDocumentScope } from "./taxPaymentSnapshot.js";
import { repairMojibakeText } from "../text/repairMojibake.js";

export type DocumentRenderContext = {
  clinicProfile?: ClinicProfile;
  payments?: Payment[];
  serviceCatalog?: ServiceCatalogItem[];
  treatmentPlanItems?: TreatmentPlanItem[];
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function rub(value: number | null) {
  return value === null ? "не указана" : `${value.toLocaleString("ru-RU")} руб.`;
}

function issuedDate(document: GeneratedDocument) {
  return document.issuedAt ? new Date(document.issuedAt).toLocaleDateString("ru-RU") : "не выдан";
}

const documentStatusLabels: Record<GeneratedDocument["status"], string> = {
  draft: "черновик",
  issued: "выдан",
  voided: "аннулирован"
};

function documentStatusBanner(document: GeneratedDocument) {
  const textByStatus: Record<GeneratedDocument["status"], string> = {
    draft: "ЧЕРНОВИК. ПЕРЕД ВЫДАЧЕЙ НУЖНА ПРОВЕРКА КЛИНИКИ",
    issued: "ВЫДАНО. ПРОВЕРИТЬ ПОДПИСИ И ПРИЛОЖЕНИЯ ПЕРЕД ПЕРЕДАЧЕЙ",
    voided: "АННУЛИРОВАНО. НЕ ИСПОЛЬЗОВАТЬ КАК ДЕЙСТВУЮЩИЙ ДОКУМЕНТ"
  };

  return `<div class="document-status-banner status-${document.status}">${escapeHtml(textByStatus[document.status])}</div>`;
}

const unresolvedPlaceholderPatterns = [
  "заполнить",
  "________",
  "указать врачом",
  "указать по",
  "не указана",
  "не указан"
].map((pattern) => repairMojibakeText(pattern));

export function documentHasUnresolvedPlaceholders(html: string): boolean {
  const htmlWithoutSignatureBlanks = html.replace(/<div class="signatures">[\s\S]*?<\/div>/g, "");
  const normalized = htmlWithoutSignatureBlanks.toLocaleLowerCase("ru-RU");
  return unresolvedPlaceholderPatterns.some((pattern) => normalized.includes(pattern));
}

function row(label: string, value: string) {
  return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`;
}

function cell(value: string | null | undefined) {
  return `<td>${escapeHtml(present(value) ?? "")}</td>`;
}

function present(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function digitsOnly(value: string | null | undefined): string {
  return (value ?? "").replace(/\D+/g, "");
}

function hasPersonNameParts(value: string | null | undefined): boolean {
  return (present(value) ?? "").split(/\s+/).filter(Boolean).length >= 2;
}

function compactParts(parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join("; ");
}

function hasClinicalToothRows(value: { clinicalToothRows?: unknown } | null | undefined): boolean {
  return Array.isArray(value?.clinicalToothRows) && value.clinicalToothRows.length > 0;
}

function hasOutpatient025uClinicalRows(value: OutpatientMedicalCard025uPayload | null | undefined): boolean {
  return Boolean(
    value?.specialistVisitRecords.some(
      (record) => Array.isArray(record.clinicalToothRows) && record.clinicalToothRows.length > 0
    )
  );
}

function clinicalToothSurfaceLabel(value: ClinicalToothRow["surfaces"][number]): string {
  const labels: Record<ClinicalToothRow["surfaces"][number], string> = {
    occlusal: "окклюзионная",
    mesial: "мезиальная",
    distal: "дистальная",
    buccal: "щечная",
    lingual: "язычная",
    palatal: "небная",
    incisal: "режущий край",
    root: "корень",
    implant_site: "зона имплантации",
    not_applicable: "не применимо"
  };
  return labels[value] ?? value;
}

function clinicalToothStatusLabel(value: ClinicalToothRow["status"]): string {
  const labels: Record<ClinicalToothRow["status"], string> = {
    sound: "без патологии",
    watch: "наблюдение",
    caries: "кариес",
    pulpitis_periodontitis: "пульпит/периодонтит",
    periodontal: "пародонтологический статус",
    missing: "отсутствует",
    implant: "имплантат",
    prosthetic: "ортопедическая конструкция",
    orthodontic: "ортодонтический статус",
    planned: "запланировано",
    completed: "выполнено",
    other: "иное"
  };
  return labels[value] ?? value;
}

function clinicalToothRowsTable(rows: readonly ClinicalToothRow[]) {
  const toothRows = rows
    .map(
      (item) =>
        `<tr>${cell(item.toothOrArea)}${cell(item.surfaces.map(clinicalToothSurfaceLabel).join(", "))}${cell(
          clinicalToothStatusLabel(item.status)
        )}${cell(item.diagnosisOrFinding)}${cell(item.indication)}${cell(item.plannedAction)}${cell(item.prognosis)}${cell(
          item.periodontalStatus
        )}${cell(item.implantOrProstheticNotes)}${cell(item.orthodonticNotes)}</tr>`
    )
    .join("");

  return `<table>
    <tr>
      <th>Зуб/сегмент</th>
      <th>Поверхности</th>
      <th>Статус</th>
      <th>Диагноз/находка</th>
      <th>Показание</th>
      <th>Действие</th>
      <th>Прогноз</th>
      <th>Пародонт</th>
      <th>Имплант/ортопедия</th>
      <th>Ортодонтия</th>
    </tr>
    ${toothRows}
  </table>`;
}

function patientAdministrativeProfile(patient: Patient) {
  return patient.administrativeProfile ?? null;
}

function patientIdentityDocument(patient: Patient): string | null {
  return present(patientAdministrativeProfile(patient)?.identityDocument);
}

function patientTaxpayerInn(patient: Patient): string | null {
  return present(patientAdministrativeProfile(patient)?.taxpayerInn);
}

function patientRegistrationAddress(patient: Patient): string | null {
  return present(patientAdministrativeProfile(patient)?.registrationAddress);
}

function patientResidentialAddress(patient: Patient): string | null {
  return present(patientAdministrativeProfile(patient)?.residentialAddress);
}

function patientInsurancePolicyNumber(patient: Patient): string | null {
  return present(patientAdministrativeProfile(patient)?.insurancePolicyNumber);
}

function patientSnils(patient: Patient): string | null {
  return present(patientAdministrativeProfile(patient)?.snils);
}

function patientDataProcessingBasisNote(patient: Patient): string | null {
  return present(patientAdministrativeProfile(patient)?.dataProcessingBasisNote);
}

function legalRepresentativeName(patient: Patient): string | null {
  return present(patientAdministrativeProfile(patient)?.legalRepresentativeFullName);
}

function legalRepresentativeDocument(patient: Patient): string | null {
  return present(patientAdministrativeProfile(patient)?.legalRepresentativeIdentityDocument);
}

function legalRepresentativeRelationship(patient: Patient): string | null {
  return present(patientAdministrativeProfile(patient)?.legalRepresentativeRelationship);
}

function legalRepresentativePhone(patient: Patient): string | null {
  return present(patientAdministrativeProfile(patient)?.legalRepresentativePhone);
}

function preferredDocumentRecipient(patient: Patient): string | null {
  return present(patientAdministrativeProfile(patient)?.preferredDocumentRecipient);
}

function representativeDisplayLine(patient: Patient): string {
  return (
    compactParts([
      legalRepresentativeName(patient),
      legalRepresentativeDocument(patient) ? `документ: ${legalRepresentativeDocument(patient)}` : null
    ]) || "ФИО: ____________________; документ: ____________________"
  );
}

function representativeAuthorityLine(patient: Patient): string {
  return (
    compactParts([
      legalRepresentativeRelationship(patient),
      legalRepresentativeDocument(patient) ? `подтверждение: ${legalRepresentativeDocument(patient)}` : null
    ]) || "родитель / опекун / попечитель / доверенность / иное"
  );
}

function representativeContactLine(patient: Patient): string {
  return legalRepresentativePhone(patient) ? `телефон: ${legalRepresentativePhone(patient)}` : "телефон: ____________________; email: ____________________";
}

function documentRecipientLine(patient: Patient): string {
  return preferredDocumentRecipient(patient) || legalRepresentativeName(patient) || "пациент / законный представитель / доверенное лицо";
}

function representativeIdentityLine(patient: Patient): string {
  return (
    compactParts([
      legalRepresentativeName(patient),
      legalRepresentativeDocument(patient),
      legalRepresentativeRelationship(patient)
    ]) || "паспорт/доверенность/документ представителя: ____________________"
  );
}

function clinicDisplayName(profile: ClinicProfile | undefined): string {
  return present(profile?.legalName) ?? present(profile?.clinicName) ?? "Профиль клиники не заполнен";
}

function clinicLicenseLine(profile: ClinicProfile | undefined): string | null {
  const number = present(profile?.medicalLicenseNumber);
  if (!number) return null;
  const issuedAt = present(profile?.medicalLicenseIssuedAt);
  const issuer = present(profile?.medicalLicenseIssuer);
  return compactParts([`лицензия ${number}`, issuedAt ? `от ${issuedAt}` : null, issuer ? `выдана ${issuer}` : null]);
}

function clinicLegalRequisites(profile: ClinicProfile | undefined): string {
  return (
    compactParts([
      clinicDisplayName(profile),
      present(profile?.inn) ? `ИНН ${present(profile?.inn)}` : null,
      present(profile?.kpp) ? `КПП ${present(profile?.kpp)}` : null,
      present(profile?.ogrn) ? `ОГРН/ОГРНИП ${present(profile?.ogrn)}` : null,
      clinicLicenseLine(profile),
      present(profile?.address) ? `адрес ${present(profile?.address)}` : null,
      present(profile?.phone) ? `тел. ${present(profile?.phone)}` : null,
      present(profile?.email) ? `email ${present(profile?.email)}` : null,
      present(profile?.website) ? `сайт ${present(profile?.website)}` : null
    ]) || "Профиль клиники не заполнен"
  );
}

function clinicPaymentRequisites(profile: ClinicProfile | undefined): string {
  return compactParts([clinicLegalRequisites(profile), present(profile?.bankDetails)]) || clinicLegalRequisites(profile);
}

function clinicSignatory(profile: ClinicProfile | undefined): string {
  return compactParts([present(profile?.signatoryTitle), present(profile?.signatoryName)]) || "уполномоченное лицо клиники";
}

const clinicLegalProfileFieldLabels: Record<string, string> = {
  legalName: "юридическое наименование",
  inn: "ИНН",
  address: "адрес",
  phone: "телефон",
  medicalLicenseNumber: "номер медицинской лицензии",
  medicalLicenseIssuedAt: "дата лицензии",
  medicalLicenseIssuer: "орган, выдавший лицензию"
};

const clinicLegalProfileOptionalDocumentKinds = new Set<DocumentKind>([
  "patient_intake_questionnaire",
  "post_visit_recommendations",
  "treatment_plan",
  "anesthesia_consent_log",
  "prescription_medication_order",
  "xray_cbct_referral",
  "lab_work_order",
  "warranty_service_memo"
]);

function documentRequiresClinicLegalProfile(kind: DocumentKind): boolean {
  return !clinicLegalProfileOptionalDocumentKinds.has(kind);
}

function clinicLegalProfileMissingFields(profile: ClinicProfile | undefined): string[] {
  if (!profile) return ["clinicProfile"];
  const checks: Array<[string, string | null | undefined]> = [
    ["legalName", profile.legalName],
    ["inn", profile.inn],
    ["address", profile.address],
    ["phone", profile.phone],
    ["medicalLicenseNumber", profile.medicalLicenseNumber],
    ["medicalLicenseIssuedAt", profile.medicalLicenseIssuedAt],
    ["medicalLicenseIssuer", profile.medicalLicenseIssuer]
  ];
  return checks.filter(([, value]) => !present(value)).map(([field]) => clinicLegalProfileFieldLabels[field] ?? field);
}

function documentPayloadBlockReason(document: GeneratedDocument): string | null {
  if (document.kind === "patient_intake_questionnaire" && !document.payload?.patientIntakeQuestionnaire) {
    return "Для выдачи анкеты пациента нужны структурированные данные: жалоба, аллергии, препараты, хронические заболевания, беременность/лактация, антикоагулянты и подтверждение пациента.";
  }
  if (document.kind === "tax_deduction_application" && !document.payload?.taxDeductionApplication) {
    return "Для выдачи заявления на налоговую справку нужны структурированные данные: заявитель, ИНН, дата рождения, документ, родство, год, форма справки, канал выдачи, контакт и проверка дублей.";
  }
  if (document.kind === "paid_medical_services_contract" && !document.payload?.paidMedicalServicesContract) {
    return "Для выдачи договора платных медицинских услуг нужны структурированные данные: номер и дата договора, сроки, заказчик, основание обращения, состав услуг, сумма, порядок оплаты, изменение цены, уведомление о бесплатной помощи, предупреждение о рекомендациях врача, отказ/возврат, гарантия и подтверждения пациента.";
  }
  if (document.kind === "completed_works_act" && !document.payload?.completedWorksAct) {
    return "Для выдачи акта выполненных работ нужны структурированные данные: номер и дата акта, договор, период оказания, врач, состав работ, суммы, фискальные чеки, претензии или их отсутствие и подтверждения пациента.";
  }
  if (document.kind === "treatment_cost_estimate" && !document.payload?.treatmentCostEstimate) {
    return "Для выдачи сметы лечения нужны структурированные данные: номер, дата, пациент или плательщик, основание лечения, состав услуг, сумма, срок действия, правила изменения цены, исключения, условия оплаты, ответственный врач и подтверждения пациента.";
  }
  if (document.kind === "payment_invoice" && !document.payload?.paymentInvoice) {
    return "Для выдачи счета на оплату нужны структурированные данные: номер и дата счета, плательщик, назначение платежа, состав услуг, сумма, срок оплаты, реквизиты, способы оплаты и подтверждение, что счет не заменяет кассовый чек.";
  }
  if (document.kind === "payment_receipt" && !document.payload?.paymentReceipt) {
    return "Для выдачи платежной квитанции нужны структурированные данные: номер и дата квитанции, выбранные оплаченные платежи, сумма, плательщик, фискальные чеки, назначение оплаты и подтверждение проверки.";
  }
  if (document.kind === "installment_payment_schedule" && !document.payload?.installmentPaymentSchedule) {
    return "Для выдачи графика рассрочки нужны структурированные данные: номер и дата графика, базовый договор или план, плательщик, сумма, предоплата, остаток, платежи, правила просрочки, способы оплаты и подтверждения пациента.";
  }
  if (document.kind === "minor_legal_representative_consent" && !document.payload?.minorLegalRepresentativeConsent) {
    return "Для выдачи согласия законного представителя нужны структурированные данные: представитель, родство, документ личности, основание полномочий, данные несовершеннолетнего, вмешательство, риски, альтернативы, врач и подтверждения проверки.";
  }
  if (document.kind === "warranty_service_memo" && !document.payload?.warrantyServiceMemo) {
    return "Для выдачи гарантийной памятки нужны структурированные данные: работа, дата завершения, зубы или область, материалы, срок гарантии, контрольные визиты, обязанности пациента, исключения, срочные признаки, связанный акт или договор и подтверждения выдачи.";
  }
  if (document.kind === "anesthesia_consent_log" && !document.payload?.anesthesiaConsentLog) {
    return "Для выдачи журнала анестезии нужны структурированные данные: метод, препарат, зона, аллергостатус и дозы.";
  }
  if (document.kind === "prescription_medication_order" && !document.payload?.prescriptionMedicationOrder) {
    return "Для выдачи назначения препаратов нужны структурированные данные: препарат, дозировка, режим, срок и памятка пациенту.";
  }
  if (document.kind === "prescription_medication_order" && !hasClinicalToothRows(document.payload?.prescriptionMedicationOrder)) {
    return "Для выдачи назначения препаратов нужны клинические строки по зубам или сегментам: зуб/область, поверхности, статус, диагноз/находка, показание и действие.";
  }
  if (document.kind === "lab_work_order" && !document.payload?.labWorkOrder) {
    return "Для выдачи лабораторного заказа нужны структурированные данные: работа, зона, материал, цвет, источник данных и срок.";
  }
  if (document.kind === "lab_work_order" && !hasClinicalToothRows(document.payload?.labWorkOrder)) {
    return "Для выдачи лабораторного заказа нужны клинические строки по зубам или сегментам: зуб/область, поверхности, статус, диагноз/находка, показание и действие.";
  }
  if (document.kind === "photo_video_consent" && !document.payload?.photoVideoConsent) {
    return "Для выдачи согласия на фото, видео и снимки нужны структурированные данные: материалы, разрешенные цели, публикация и порядок отзыва.";
  }
  if (document.kind === "xray_cbct_referral" && !document.payload?.xrayCbctReferral) {
    return "Для выдачи направления на рентген или КЛКТ нужны структурированные данные: вид исследования, область, клинический вопрос, показание, ограничения и ответственный врач.";
  }
  if (document.kind === "xray_cbct_referral" && !hasClinicalToothRows(document.payload?.xrayCbctReferral)) {
    return "Для выдачи направления на рентген или КЛКТ нужны клинические строки по зубам или сегментам: зуб/область, поверхности, статус, диагноз/находка, показание и действие.";
  }
  if (document.kind === "medical_record_extract" && !document.payload?.medicalRecordExtract) {
    return "Для выдачи выписки из медицинской карты нужны структурированные данные: период, источники записей, жалобы и анамнез, объективный статус, диагноз, лечение, рекомендации, врач, получатель и проверка данных третьих лиц.";
  }
  if (document.kind === "medical_record_extract" && !hasClinicalToothRows(document.payload?.medicalRecordExtract)) {
    return "Для выдачи выписки из медицинской карты нужны клинические строки по зубам или сегментам: зуб/область, поверхности, статус, диагноз/находка, показание и действие.";
  }
  if (document.kind === "outpatient_medical_card_025u" && !document.payload?.outpatientMedicalCard025u) {
    return "Для выдачи медицинской карты 025/у нужны структурированные данные: организация, номер карты, пациент, период, источники подписанных записей, диагнозы, записи врачей, стоматологические строки и подтверждения формы 274н.";
  }
  if (
    document.kind === "outpatient_medical_card_025u" &&
    !hasOutpatient025uClinicalRows(document.payload?.outpatientMedicalCard025u)
  ) {
    return "Для выдачи медицинской карты 025/у нужны клинические строки по зубам или сегментам хотя бы в одной записи врача.";
  }
  if (document.kind === "medical_record_copy_request" && !document.payload?.medicalRecordCopyRequest) {
    return "Для выдачи запроса копий медицинской документации нужны структурированные данные: состав документов, период, формат, получатель, документ получателя, полномочия, контакт выдачи и проверка лишних данных третьих лиц.";
  }
  if (document.kind === "post_visit_recommendations" && !document.payload?.postVisitRecommendations) {
    return "Для выдачи рекомендаций после приема нужны структурированные данные: процедура, зона, дата, врач, разрешенные действия, ограничения, назначения, питание, гигиена, тревожные признаки, контакт клиники и краткий текст для Telegram.";
  }
  if (document.kind === "treatment_plan" && !document.payload?.treatmentPlan) {
    return "Для выдачи плана лечения нужны структурированные данные: причина обращения, диагноз, область, цели, этапы, стоимость, альтернативы, риски, прогноз, контроль, врач и подтверждения пациента.";
  }
  if (document.kind === "treatment_plan" && !hasClinicalToothRows(document.payload?.treatmentPlan)) {
    return "Для выдачи плана лечения нужны клинические строки по зубам или сегментам: зуб/область, поверхности, статус, диагноз/находка, показание и действие.";
  }
  if (document.kind === "treatment_plan_acceptance" && !document.payload?.treatmentPlanAcceptance) {
    return "Для согласования плана лечения нужны структурированные данные: выбранный вариант, диагноз/цель, зона, этапы, сумма, срок действия сметы, условия оплаты, отклоненные альтернативы, риски, врач и подтверждения пациента.";
  }
  if (document.kind === "treatment_plan_acceptance" && !hasClinicalToothRows(document.payload?.treatmentPlanAcceptance)) {
    return "Для согласования плана лечения нужны клинические строки по зубам или сегментам: зуб/область, поверхности, статус, диагноз/находка, показание и действие.";
  }
  if (document.kind === "visit_attendance_certificate" && !document.payload?.visitAttendanceCertificate) {
    return "Для выдачи справки о посещении нужны структурированные данные: время начала и окончания приема, цель выдачи, получатель, дата, подписант и подтверждение, что диагноз не раскрывается.";
  }
  if (document.kind === "medical_document_release_receipt" && !document.payload?.medicalDocumentReleaseReceipt) {
    return "Для выдачи расписки о передаче медицинских документов нужны структурированные данные: получатель, основание, канал, состав выдачи, дата и защита передачи.";
  }
  if (
    document.kind === "medical_document_release_receipt" &&
    document.payload?.medicalDocumentReleaseReceipt &&
    !document.payload.medicalDocumentReleaseReceipt.sourceRequestDocumentId
  ) {
    return "Для расписки о выдаче медицинских документов выберите конкретный выданный запрос пациента или представителя.";
  }
  if (document.kind === "payment_refund_correction_request" && !document.payload?.paymentRefundCorrection) {
    return "Для выдачи заявления на возврат или коррекцию оплаты нужны структурированные данные: действие, сумма, основание, способ, получатель, исходный чек и решение ответственного.";
  }
  if (document.kind === "informed_consent" && !document.payload?.informedConsent) {
    return "Для выдачи информированного согласия нужны структурированные данные: вмешательство, область, показание, ожидаемая польза, риски, альтернативы, рекомендации после вмешательства, врач и подтверждения пациента.";
  }
  if (document.kind === "procedure_specific_consent_packet" && !document.payload?.procedureSpecificConsent) {
    return "Для выдачи процедурного согласия нужны структурированные данные: вид процедуры, область, показание, анестезия, материалы, персональные риски пациента, процедурные риски, альтернативы, ограничения после процедуры, врач и подтверждения пациента.";
  }
  if (document.kind === "procedure_specific_consent_packet" && !hasClinicalToothRows(document.payload?.procedureSpecificConsent)) {
    return "Для выдачи процедурного согласия нужны клинические строки по зубам или сегментам: зуб/область, поверхности, статус, диагноз/находка, показание и действие.";
  }
  if (document.kind === "personal_data_processing_consent" && !document.payload?.personalDataProcessingConsent) {
    return "Для выдачи согласия на обработку персональных данных нужны структурированные данные: оператор, ИНН, адрес, цели, категории данных, действия обработки, правила передачи третьим лицам, срок хранения, отзыв согласия и подтверждение обработки медицинских данных.";
  }
  if (document.kind === "medical_intervention_refusal" && !document.payload?.medicalInterventionRefusal) {
    return "Для выдачи отказа от медицинского вмешательства нужны структурированные данные: вмешательство, показание, причина отказа, риски, альтернативы, тревожные признаки и подтверждения пациента.";
  }
  return null;
}

function bulletList(items: string[]) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function checkList(items: string[]) {
  return `<ul class="check-list">${items.map((item) => `<li><span>□</span>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function signatureBlock(left = "Пациент", right = "Представитель клиники") {
  return `<div class="signatures">
    <p>${escapeHtml(left)}: ____________________</p>
    <p>${escapeHtml(right)}: ____________________</p>
  </div>`;
}

function signatureParty(role: string, fullName?: string | null) {
  const trimmed = fullName?.trim();
  return trimmed ? `${role} (${trimmed})` : role;
}

function issueSignatureModeLabel(mode: NonNullable<GeneratedDocument["signatureAttestation"]>["mode"]) {
  if (mode === "qualified_electronic_signature") return "усиленная квалифицированная электронная подпись";
  if (mode === "simple_electronic_signature") return "простая электронная подпись";
  return "бумажный экземпляр подписан";
}

function issueSignatureAttestationBlock(document: GeneratedDocument) {
  const attestation = document.signatureAttestation;
  if (!attestation || document.status === "draft") return "";
  return `<section class="issue-attestation">
    <h2>Отметка о подписании и выдаче</h2>
    <table>
      ${row("Способ", issueSignatureModeLabel(attestation.mode))}
      ${row("Дата и время подписи/выдачи", attestation.signedAt)}
      ${row("Получатель", `${attestation.recipientFullName}, ${attestation.recipientRole}`)}
      ${row("Сотрудник клиники", `${attestation.staffFullName}, ${attestation.staffRole}`)}
      ${row("Проверка", "личность получателя проверена; HTML открыт и сверен; получатель и представитель клиники подписали экземпляр")}
      ${attestation.note ? row("Заметка выдачи", attestation.note) : ""}
    </table>
  </section>`;
}

function releaseMaterialKindLabel(kind: NonNullable<GeneratedDocument["releaseJournalEntry"]>["materialKind"]) {
  if (kind === "original") return "оригинал";
  if (kind === "copy") return "копия";
  if (kind === "extract") return "выписка";
  if (kind === "dicom_archive") return "архив исходных снимков";
  if (kind === "mixed") return "смешанный комплект";
  return "иное";
}

function releaseDeliveryMethodLabel(method: NonNullable<GeneratedDocument["releaseJournalEntry"]>["deliveryMethod"]) {
  if (method === "paper") return "бумага";
  if (method === "pdf") return "PDF";
  if (method === "dicom_archive") return "архив исходных снимков";
  if (method === "secure_link") return "защищенная ссылка";
  if (method === "physical_media") return "физический носитель";
  return "иной канал";
}

function releaseJournalEntryKindLabel(kind: NonNullable<GeneratedDocument["releaseJournalEntry"]>["entryKind"]) {
  if (kind === "request_registered") return "зарегистрирован запрос";
  if (kind === "extract_issued") return "выдана выписка";
  return "закрыта выдача";
}

function releaseJournalBlock(document: GeneratedDocument) {
  const journal = document.releaseJournalEntry;
  if (!journal || document.status === "draft") return "";
  const period = compactParts([
    journal.periodStart ? `с ${journal.periodStart}` : null,
    journal.periodEnd ? `по ${journal.periodEnd}` : null
  ]);
  return `<section class="release-journal">
    <h2>Журнал выдачи медицинской документации</h2>
    <table>
      ${row("Запись", releaseJournalEntryKindLabel(journal.entryKind))}
      ${row("Состав", journal.documentTypes.join("; "))}
      ${row("Вид материала", releaseMaterialKindLabel(journal.materialKind))}
      ${row("Канал", releaseDeliveryMethodLabel(journal.deliveryMethod))}
      ${period ? row("Период", period) : ""}
      ${journal.sourceRequestDocumentId ? row("Связанный запрос", journal.sourceRequestDocumentId) : ""}
      ${row("Получатель", journal.recipientFullName)}
      ${journal.recipientIdentityDocument ? row("Документ получателя", journal.recipientIdentityDocument) : ""}
      ${row("Основание", journal.recipientAuthority)}
      ${row("Дата операции", journal.deliveredAt)}
      ${row("Хранение", journal.retentionPolicy)}
      ${journal.sourceSnapshotSha256 ? row("sha256 архива", journal.sourceSnapshotSha256) : ""}
    </table>
  </section>`;
}

function baseDocument(
  title: string,
  patient: Patient,
  document: GeneratedDocument,
  body: string,
  context: DocumentRenderContext
) {
  const clinicProfile = context.clinicProfile;
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { margin: 18mm 16mm; }
    body { color: #211f1c; font: 14px/1.5 Arial, sans-serif; margin: 40px; }
    h1 { font-size: 22px; margin: 10px 0 18px; }
    h2 { font-size: 16px; margin: 24px 0 8px; }
    h3 { font-size: 14px; margin: 18px 0 6px; }
    p { margin: 8px 0; }
    table { border-collapse: collapse; margin: 16px 0; width: 100%; }
    td, th { border: 1px solid #bfb7ad; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f4f0ea; width: 34%; }
    ul { margin: 8px 0 14px 22px; padding: 0; }
    li { margin: 4px 0; }
    .meta { color: #5f574f; margin-bottom: 18px; }
    .document-status-banner { border: 2px solid #a34f32; color: #a34f32; display: inline-block; font-weight: 700; padding: 4px 8px; }
    .status-issued { border-color: #2f7340; color: #2f7340; }
    .status-voided { border-color: #5f574f; color: #5f574f; text-decoration: line-through; }
    .notice { background: #fff8e6; border: 1px solid #e7c56f; border-radius: 6px; padding: 10px 12px; }
    .check-list { list-style: none; margin-left: 0; }
    .check-list li { align-items: baseline; display: flex; gap: 8px; }
    .check-list span { color: #5f574f; font-weight: 700; }
    .signatures { display: grid; gap: 32px; grid-template-columns: 1fr 1fr; margin-top: 48px; }
    .small { color: #5f574f; font-size: 12px; }
    @media print {
      body { margin: 0; }
      .document-status-banner { color: #000; border-color: #000; }
    }
  </style>
</head>
<body>
  ${documentStatusBanner(document)}
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">
    <p>Клиника: ${escapeHtml(clinicDisplayName(clinicProfile))}</p>
    <p>Пациент: ${escapeHtml(patient.fullName)}</p>
    <p>Дата рождения: ${escapeHtml(patient.birthDate ?? "не указана")}</p>
    <p>Телефон: ${escapeHtml(patient.phone ?? "не указан")}</p>
    ${patientIdentityDocument(patient) ? `<p>Документ пациента: ${escapeHtml(patientIdentityDocument(patient) ?? "")}</p>` : ""}
    ${patientTaxpayerInn(patient) ? `<p>ИНН пациента: ${escapeHtml(patientTaxpayerInn(patient) ?? "")}</p>` : ""}
    ${patientRegistrationAddress(patient) ? `<p>Адрес регистрации: ${escapeHtml(patientRegistrationAddress(patient) ?? "")}</p>` : ""}
    ${patientResidentialAddress(patient) ? `<p>Адрес проживания: ${escapeHtml(patientResidentialAddress(patient) ?? "")}</p>` : ""}
    ${patientInsurancePolicyNumber(patient) ? `<p>Полис/ДМС: ${escapeHtml(patientInsurancePolicyNumber(patient) ?? "")}</p>` : ""}
    ${patientSnils(patient) ? `<p>СНИЛС: ${escapeHtml(patientSnils(patient) ?? "")}</p>` : ""}
    <p>Статус документа: ${escapeHtml(documentStatusLabels[document.status])}; дата выдачи: ${escapeHtml(issuedDate(document))}</p>
  </div>
  ${issueSignatureAttestationBlock(document)}
  ${releaseJournalBlock(document)}
  ${body}
</body>
</html>`;
}

const treatmentPlanBackedFinancialKinds = new Set<DocumentKind>([
  "paid_medical_services_contract",
  "completed_works_act",
  "treatment_cost_estimate",
  "payment_invoice",
  "installment_payment_schedule"
]);

const treatmentPlanItemStatusLabels: Record<TreatmentPlanItem["status"], string> = {
  proposed: "предложено",
  approved: "согласовано",
  in_progress: "в работе",
  completed: "выполнено",
  cancelled: "отменено"
};

function treatmentPlanItemTotalRub(item: TreatmentPlanItem) {
  return Math.max(0, item.unitPriceRub * item.quantity - item.discountRub);
}

function serviceCatalogMap(context: DocumentRenderContext) {
  return new Map((context.serviceCatalog ?? []).map((service) => [service.id, service]));
}

function documentTreatmentPlanItems(document: GeneratedDocument, context: DocumentRenderContext) {
  const patientItems = (context.treatmentPlanItems ?? []).filter(
    (item) => item.patientId === document.patientId && item.status !== "cancelled"
  );
  const visitItems = document.visitId ? patientItems.filter((item) => item.visitId === document.visitId) : [];
  return visitItems.length ? visitItems : patientItems;
}

function financialDocumentTreatmentItems(document: GeneratedDocument, context: DocumentRenderContext) {
  return documentTreatmentPlanItems(document, context).sort((left, right) => {
    const leftTooth = left.toothCode ?? "";
    const rightTooth = right.toothCode ?? "";
    if (leftTooth !== rightTooth) return leftTooth.localeCompare(rightTooth, "ru-RU");
    return left.serviceId.localeCompare(right.serviceId, "ru-RU");
  });
}

function treatmentPlanTotalRub(document: GeneratedDocument, context: DocumentRenderContext) {
  const total = financialDocumentTreatmentItems(document, context).reduce(
    (sum, item) => sum + treatmentPlanItemTotalRub(item),
    0
  );
  return total > 0 ? total : document.totalAmountRub;
}

function financialServiceRows(document: GeneratedDocument, context: DocumentRenderContext, includeStatus = false) {
  const services = serviceCatalogMap(context);
  const items = financialDocumentTreatmentItems(document, context);
  if (!items.length) {
    return `<tr><td colspan="${includeStatus ? 7 : 6}">Состав услуг не загружен из плана лечения.</td></tr>`;
  }

  return items
    .map((item) => {
      const service = services.get(item.serviceId);
      const title = service?.title ?? item.serviceId;
      const code = service?.code ? `${service.code} ` : "";
      const tooth = item.toothCode ? `зуб ${item.toothCode}` : "без привязки к зубу";
      const discount = item.discountRub > 0 ? rub(item.discountRub) : "нет";
      const statusCell = includeStatus ? `<td>${escapeHtml(treatmentPlanItemStatusLabels[item.status])}</td>` : "";
      return `<tr>
        <td>${escapeHtml(`${code}${title}`)}</td>
        <td>${escapeHtml(tooth)}</td>
        <td>${item.quantity}</td>
        <td>${escapeHtml(rub(item.unitPriceRub))}</td>
        <td>${escapeHtml(discount)}</td>
        <td>${escapeHtml(rub(treatmentPlanItemTotalRub(item)))}</td>
        ${statusCell}
      </tr>`;
    })
    .join("");
}

function financialServiceTable(document: GeneratedDocument, context: DocumentRenderContext, includeStatus = false) {
  return `<table>
      <tr><th>Услуга</th><th>Зуб/область</th><th>Кол-во</th><th>Цена</th><th>Скидка</th><th>Сумма</th>${includeStatus ? "<th>Статус</th>" : ""}</tr>
      ${financialServiceRows(document, context, includeStatus)}
    </table>`;
}

function paidTotalForDocument(document: GeneratedDocument, context: DocumentRenderContext) {
  return paidPaymentsForDocument(document, context).reduce((total, payment) => total + payment.amountRub, 0);
}

function installmentRows(document: GeneratedDocument, context: DocumentRenderContext) {
  const totalRub = treatmentPlanTotalRub(document, context) ?? document.totalAmountRub ?? 0;
  const paidRub = paidTotalForDocument(document, context);
  const remainingRub = Math.max(0, totalRub - paidRub);
  const rows: string[] = [];
  if (paidRub > 0) {
    rows.push(`<tr><td>Оплачено по сохраненным платежам</td><td>${escapeHtml(rub(paidRub))}</td><td>оплачено</td></tr>`);
  }
  if (remainingRub > 0) {
    const firstPart = Math.ceil(remainingRub / 2);
    const secondPart = remainingRub - firstPart;
    rows.push(`<tr><td>Следующий платеж до ближайшего визита</td><td>${escapeHtml(rub(firstPart))}</td><td>план</td></tr>`);
    if (secondPart > 0) {
      rows.push(`<tr><td>Финальный платеж до выдачи акта</td><td>${escapeHtml(rub(secondPart))}</td><td>план</td></tr>`);
    }
  }
  return rows.length ? rows.join("") : `<tr><td>План полностью оплачен</td><td>${escapeHtml(rub(0))}</td><td>оплачено</td></tr>`;
}

function paidMedicalServicesContract(document: GeneratedDocument, context: DocumentRenderContext) {
  const payload = document.payload?.paidMedicalServicesContract as PaidMedicalServicesContractPayload | undefined;
  if (payload) {
    const customerRows = [
      row("Номер договора", payload.contractNumber),
      row("Дата договора", payload.contractDate),
      row("Исполнитель", clinicLegalRequisites(context.clinicProfile)),
      row("Заказчик", payload.customerFullName || "не указан"),
      row("Представитель", payload.representativeFullName || "отсутствует"),
      row("Срок начала оказания", payload.serviceStart),
      row("Окончание / условие завершения", payload.serviceEndOrCondition),
      row("Ответственный врач", payload.doctorFullName),
      row("Подписано", payload.signedAt)
    ].join("");

    return `<h2>Договор оказания платных медицинских услуг</h2>
    <div class="notice">
      Договор подготовлен по структурированным данным клиники и пациента. Перед выдачей сверить локальную форму договора, лицензию, подписи и приложения.
    </div>
    <table>${customerRows}</table>
    <h2>1. Предмет договора</h2>
    <table>
      ${row("Основание обращения", payload.plannedCareReason)}
      ${row("Состав платных услуг", payload.serviceScopeSummary)}
      ${row("Ориентировочная стоимость", rub(payload.estimatedTotalRub))}
      ${row("Правовая основа", "Правила предоставления медицинскими организациями платных медицинских услуг, постановление Правительства РФ от 11.05.2023 № 736")}
    </table>
    <h2>2. Перечень услуг и стоимость</h2>
    ${financialServiceTable(document, context, true)}
    <h2>3. Оплата и изменение объема</h2>
    <table>
      ${row("Порядок оплаты", payload.paymentTerms)}
      ${row("Изменение цены/объема", payload.priceChangeRules)}
      ${row("Отказ и возврат", payload.refusalAndRefundTerms)}
    </table>
    <h2>4. Информирование пациента</h2>
    ${checkList([
      payload.freeCareAvailabilityNotice,
      payload.medicalRecommendationWarning,
      payload.warrantyAndClaimsTerms,
      "пациент получил сведения об исполнителе, лицензии, услугах, цене, сроках и порядке оплаты",
      "дополнительные платные услуги оформляются письменным соглашением или новым договором до оказания",
      "несоблюдение рекомендаций врача может снизить качество услуги, изменить сроки или повлиять на состояние здоровья"
    ])}
    <h2>5. Подтверждения</h2>
    ${checkList([
      "сведения о клинике и лицензии переданы пациенту до подписания",
      "перечень услуг и стоимость согласованы",
      "пациент понимает платную основу оказания услуг",
      "изменения договора фиксируются письменно"
    ])}
    ${signatureBlock()}`;
  }
  return `<h2>1. Стороны и предмет</h2>
    <p>Медицинская организация оказывает пациенту платные стоматологические услуги по утвержденному прейскуранту, плану лечения, медицинским показаниям и после получения необходимых согласий.</p>
    <table>
      ${row("Исполнитель", clinicLegalRequisites(context.clinicProfile))}
      ${row("Документ", document.title)}
      ${row("Ориентировочная сумма", rub(treatmentPlanTotalRub(document, context)))}
      ${row("Основание", "Правила предоставления медицинскими организациями платных медицинских услуг; локальный договор клиники")}
    </table>
    <h2>2. Перечень услуг и стоимость</h2>
    ${financialServiceTable(document, context, true)}
    <h2>3. Порядок оказания и оплаты</h2>
    ${checkList([
      "услуги оказываются по медицинским показаниям и согласованному плану лечения",
      "изменение состава услуг фиксируется дополнительной сметой или соглашением",
      "кассовый чек и акт выполненных работ хранятся вместе с договором",
      "гарантийные условия и претензионный порядок применяются по локальным правилам клиники"
    ])}
    ${signatureBlock()}`;
}

function completedWorksAct(document: GeneratedDocument, context: DocumentRenderContext) {
  const payload = document.payload?.completedWorksAct as CompletedWorksActPayload | undefined;
  if (payload) {
    return `<h2>Акт выполненных работ</h2>
    <div class="notice">
      Акт закрывает фактически оказанные и оплаченные стоматологические услуги. Состав работ сверяется с договором, медицинской записью, планом лечения и фискальными чеками.
    </div>
    <table>
      ${row("Номер акта", payload.actNumber)}
      ${row("Дата акта", payload.actDate)}
      ${row("Договор", payload.contractNumber)}
      ${row("ID выданного договора", payload.linkedContractDocumentId)}
      ${row("Период оказания", `${payload.servicePeriodStart} - ${payload.servicePeriodEnd}`)}
      ${row("Врач-исполнитель", payload.doctorFullName)}
      ${row("Состав работ", payload.acceptedServicesSummary)}
      ${row("Сумма по акту", rub(payload.totalByActRub))}
      ${row("Фактически оплачено", rub(payload.paidRub))}
      ${row("Фискальные чеки", payload.fiscalReceiptNumbers.join("; "))}
      ${row("Замечания пациента", payload.patientClaimsText?.trim() || "замечаний по объему, срокам и качеству на момент подписания нет")}
    </table>
    <h2>Оказанные услуги</h2>
    ${financialServiceTable(document, context, true)}
    ${checkList([
      "акт связан с подписанным договором и планом лечения",
      "финальный состав работ сверил врач или администратор",
      "фискальные чеки и оплаты проверены",
      "пациент принял выполненные работы; замечания внесены в акт до подписания"
    ])}
    ${signatureBlock("Пациент / плательщик", signatureParty("Врач-исполнитель / представитель клиники", payload.doctorFullName))}`;
  }

  return `<h2>Оказанные услуги</h2>
    <p>Пациент подтверждает получение стоматологических услуг. Замечания по объему, срокам и качеству фиксируются до подписания акта.</p>
    ${financialServiceTable(document, context, true)}
    <table>
      ${row("Фактически оплачено", rub(paidTotalForDocument(document, context) || document.totalAmountRub))}
      ${row("Сумма по акту", rub(treatmentPlanTotalRub(document, context)))}
    </table>
    <h2>Контроль перед выдачей</h2>
    ${checkList([
      "сверить акт с договором, кассовым чеком и фактически оказанными услугами",
      "даты оказания услуг и врач-исполнитель берутся из связанного визита и карты пациента",
      "зафиксировать замечания пациента или отметить их отсутствие"
    ])}
    ${signatureBlock()}`;
}

function documentTaxYear(document: GeneratedDocument) {
  return document.taxYear ? `${document.taxYear}` : "год оплаты: заполнить по кассовым данным";
}

function taxPaymentsForDocument(document: GeneratedDocument, context: DocumentRenderContext): Payment[] {
  return taxPaymentsForDocumentScope(document, context.payments ?? []);
}

function taxPaymentCode(payment: Payment): "1" | "2" | null {
  return payment.taxDeductionCode === "1" || payment.taxDeductionCode === "2" ? payment.taxDeductionCode : null;
}

function taxPaymentCodeLabel(code: "1" | "2" | null) {
  if (!code) return "код не выбран";
  return code === "2" ? "2 - дорогостоящее" : "1 - обычное";
}

function taxPaymentSum(payments: Payment[], code: "1" | "2") {
  return payments
    .filter((payment) => taxPaymentCode(payment) === code)
    .reduce((total, payment) => total + payment.amountRub, 0);
}

function firstTaxPayment(payments: Payment[]): Payment | null {
  return payments[0] ?? null;
}

function namePartsForTax(fullName: string): { lastName: string; firstName: string; middleName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    lastName: parts[0] ?? "",
    firstName: parts[1] ?? "",
    middleName: parts.slice(2).join(" ")
  };
}

function taxCertificateNumber(document: GeneratedDocument): string {
  const year = document.taxYear ? String(document.taxYear) : "";
  const idDigits = document.id.replace(/\D+/g, "");
  const numericHash = Array.from(document.id).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 1_000_000_000, 17);
  const sequence = (idDigits || String(numericHash)).slice(0, 10).padStart(10, "0");
  return `${year}${sequence}`.replace(/\D+/g, "") || "1";
}

function taxpayerPatientSameFlagCode(payment: Payment | null): "0" | "1" {
  return normalizedTaxpayerRelationship(payment?.payerRelationship) === "self" ? "1" : "0";
}

function identityDocumentKindCode(value: string | null | undefined): string {
  const normalized = present(value)?.toLocaleLowerCase("ru-RU") ?? "";
  if (normalized.includes("паспорт") || normalized.includes("passport")) return "21";
  if (normalized.includes("свидетельство о рождении") || normalized.includes("birth certificate")) return "03";
  if (normalized.includes("военн") || normalized.includes("military")) return "07";
  if (normalized.includes("вид на жительство")) return "12";
  return "91";
}

function identityDocumentNumberForTax(value: string | null | undefined): string | null {
  const normalized = present(value);
  if (!normalized) return null;
  const passport = normalized.match(/(\d{2})\s*(\d{2})\s*(\d{6})/);
  if (passport) return `${passport[1]}${passport[2]} ${passport[3]}`;
  const serialNumber = normalized.match(/(?:сер(?:ия)?\.?\s*)?([A-Za-zА-Яа-я0-9-]{1,12})\s*(?:№|N|номер)?\s*([A-Za-zА-Яа-я0-9-]{3,12})/u);
  if (!serialNumber) return null;
  return `${serialNumber[1]} ${serialNumber[2]}`.replace(/\s+/g, " ").trim();
}

function identityDocumentIssuedAtForTax(value: string | null | undefined): string | null {
  const explicit = /(\d{2})[.\-/](\d{2})[.\-/](\d{4})/.exec(value ?? "");
  return explicit ? `${explicit[1]}.${explicit[2]}.${explicit[3]}` : null;
}

function hasTaxInn(value: string | null | undefined): boolean {
  return digitsOnly(value).length === 12;
}

function hasTaxIdentityDocument(value: string | null | undefined): boolean {
  return Boolean(identityDocumentNumberForTax(value) && identityDocumentIssuedAtForTax(value));
}

function hasTaxPersonIdentifier(inn: string | null | undefined, identity: string | null | undefined): boolean {
  return hasTaxInn(inn) || hasTaxIdentityDocument(identity);
}

function taxReceiptList(payments: Payment[]): string {
  return payments.map((payment) => paymentReceiptLabel(payment)).join("; ");
}

function kndPersonRows(prefix: string, parts: { lastName: string; firstName: string; middleName: string }, inn: string, birthDate: string, identity: string) {
  const innValue = hasTaxInn(inn) ? digitsOnly(inn) : "";
  const identityRows = innValue
    ? ""
    : `
    ${row(`${prefix}: Код вида документа`, identityDocumentKindCode(identity))}
    ${row(`${prefix}: Серия и номер документа`, identityDocumentNumberForTax(identity) ?? identity)}
    ${row(`${prefix}: Дата выдачи документа`, identityDocumentIssuedAtForTax(identity) ?? "")}`;
  return `
    ${row(`${prefix}: Фамилия`, parts.lastName)}
    ${row(`${prefix}: Имя`, parts.firstName)}
    ${parts.middleName ? row(`${prefix}: Отчество`, parts.middleName) : ""}
    ${innValue ? row(`${prefix}: ИНН`, innValue) : ""}
    ${row(`${prefix}: Дата рождения`, birthDate)}
    ${identityRows}
  `;
}

function officialKnd1151156PrintBlock(
  document: GeneratedDocument,
  patient: Patient,
  context: DocumentRenderContext,
  taxPayments: Payment[],
  taxpayerPayment: Payment | null,
  regularTreatmentRub: number | null,
  expensiveTreatmentRub: number | null
) {
  const samePersonFlag = taxpayerPatientSameFlagCode(taxpayerPayment);
  const taxpayerIdentityDocument = payerIdentityDocumentForTax(taxpayerPayment, patient);
  const patientIdentity = patientIdentityDocumentForTax(taxpayerPayment, patient);
  const taxpayerNameParts = namePartsForTax(payerNameForTax(taxpayerPayment, patient));
  const patientNameParts = namePartsForTax(patient.fullName);
  const pageCount = samePersonFlag === "1" ? "1" : "2";
  const clinicProfile = context.clinicProfile;
  const clinicKpp = present(clinicProfile?.kpp) ?? "не применяется";
  const clinicOgrn = present(clinicProfile?.ogrn) ?? "не применяется";
  const receiptNumbers = taxPayments.length ? taxReceiptList(taxPayments) : "фискальные чеки будут подтянуты после оплаты";
  const patientPage =
    samePersonFlag === "0"
      ? `<h3>Лист 002. Данные физического лица, которому оказаны медицинские услуги</h3>
      <table>
        ${row("ИНН медицинской организации", present(clinicProfile?.inn) ?? "")}
        ${row("КПП медицинской организации", clinicKpp)}
        ${row("Страница", "002")}
        ${kndPersonRows("Пациент", patientNameParts, patientInnForTax(taxpayerPayment, patient), patientBirthDateForTax(taxpayerPayment, patient), patientIdentity)}
        ${row("Подтверждение страницы", clinicSignatory(clinicProfile))}
      </table>`
      : "";

  return `<h2>Печатный контроль формы КНД 1151156</h2>
    <div class="notice">
      Этот блок повторяет ключевые поля приложения N 1 к приказу ФНС России от 08.11.2023 N ЕА-7-11/824@:
      лист 001 заполняется всегда, лист 002 добавляется, когда налогоплательщик и пациент не являются одним лицом.
      Электронный XML/ТКС-файл ФНС этим HTML не заменяется.
    </div>
    <h3>Лист 001. Форма по КНД 1151156</h3>
    <table>
      ${row("ИНН медицинской организации", present(clinicProfile?.inn) ?? "")}
      ${row("КПП медицинской организации", clinicKpp)}
      ${row("Страница", "001")}
      ${row("Форма", "КНД 1151156")}
      ${row("Номер справки", taxCertificateNumber(document))}
      ${row("Номер корректировки", "0")}
      ${row("Отчетный год", documentTaxYear(document))}
      ${row("Медицинская организация", clinicDisplayName(clinicProfile))}
      ${row("ОГРН/ОГРНИП", clinicOgrn)}
      ${row("Лицензия", clinicLicenseLine(clinicProfile) ?? "")}
      ${kndPersonRows(
        "Налогоплательщик",
        taxpayerNameParts,
        payerInnForTax(taxpayerPayment, patient),
        payerBirthDateForTax(taxpayerPayment, patient),
        taxpayerIdentityDocument
      )}
      ${row("Признак налогоплательщика и пациента", taxpayerPatientSameFlag(taxpayerPayment))}
      ${row("Сумма расходов по коду услуги 1", rub(regularTreatmentRub))}
      ${row("Сумма расходов по коду услуги 2", rub(expensiveTreatmentRub))}
      ${row("Фискальные чеки-основания", receiptNumbers)}
      ${row("Справка составлена на страницах", pageCount)}
      ${row("Зона QR-кода", "формируется при экспорте PDF или электронного пакета клиники")}
      ${row("Достоверность и полноту сведений подтверждает", clinicSignatory(clinicProfile))}
    </table>
    ${patientPage}`;
}

function payerNameForTax(payment: Payment | null, patient: Patient) {
  return payment?.payerFullName?.trim() || patient.fullName;
}

function payerInnForTax(payment: Payment | null, patient?: Patient) {
  const inn = payment?.payerInn?.trim() || (patient ? patientTaxpayerInn(patient) : null);
  if (inn) return inn;
  if (payment?.payerIdentityDocument?.trim() || (patient ? patientIdentityDocument(patient) : null)) return "";
  return "заполнить перед выдачей";
}

function payerBirthDateForTax(payment: Payment | null, patient: Patient) {
  return payment?.payerBirthDate?.trim() || patient.birthDate || "заполнить перед выдачей";
}

function payerIdentityDocumentForTax(payment: Payment | null, patient?: Patient) {
  return payment?.payerIdentityDocument?.trim() || (patient ? patientIdentityDocument(patient) : null) || "заполнить перед выдачей";
}

function payerRelationshipForTax(payment: Payment | null) {
  return payment?.payerRelationship?.trim() || "пациент";
}

const taxApplicationRelationshipLabels: Record<TaxDeductionApplicationRelationship, string> = {
  self: "пациент / сам налогоплательщик",
  spouse: "супруг / супруга",
  parent: "родитель",
  child: "ребенок",
  ward: "подопечный"
};

const taxApplicationFormLabels: Record<TaxDeductionApplicationForm, string> = {
  knd_1151156: "КНД 1151156 для расходов с 2024 года",
  legacy_2021_2023: "справка по прежнему порядку для оплат 2021-2023"
};

const taxApplicationDeliveryChannelLabels: Record<TaxDeductionApplicationDeliveryChannel, string> = {
  paper: "бумажный экземпляр в клинике",
  pdf: "PDF после проверки и подписи",
  secure_link: "защищенная ссылка",
  email: "email после проверки согласия",
  portal: "личный кабинет / портал пациента",
  other: "иной согласованный канал"
};

function normalizedTaxpayerRelationship(value: string | null | undefined): "self" | "spouse" | "parent" | "child" | "ward" | null {
  const normalized = present(value)?.toLocaleLowerCase("ru-RU").replaceAll("ё", "е").replace(/[\s_-]+/g, " ") ?? null;
  if (!normalized) return null;
  if (["self", "patient", "me", "пациент", "сам пациент", "сама пациентка", "налогоплательщик"].includes(normalized)) return "self";
  if (["spouse", "husband", "wife", "супруг", "супруга", "муж", "жена"].includes(normalized)) return "spouse";
  if (["parent", "father", "mother", "родитель", "отец", "мать", "папа", "мама"].includes(normalized)) return "parent";
  if (
    [
      "child",
      "son",
      "daughter",
      "kid",
      "ребенок",
      "ребенок до 18",
      "ребенок до 24 очно",
      "сын",
      "дочь",
      "усыновленный",
      "усыновленная"
    ].includes(normalized)
  ) {
    return "child";
  }
  if (["ward", "подопечный", "подопечная", "опекаемый", "опекаемая"].includes(normalized)) return "ward";
  return null;
}

function taxpayerPatientSameFlag(payment: Payment | null): string {
  return taxpayerPatientSameFlagCode(payment) === "1" ? "1 - да" : "0 - нет";
}

function patientBirthDateForTax(payment: Payment | null, patient: Patient) {
  return patient.birthDate || (normalizedTaxpayerRelationship(payment?.payerRelationship) === "self" ? payment?.payerBirthDate?.trim() : null) || "заполнить перед выдачей";
}

function patientInnForTax(payment: Payment | null, patient: Patient) {
  const inn = patientTaxpayerInn(patient) || (normalizedTaxpayerRelationship(payment?.payerRelationship) === "self" ? payment?.payerInn?.trim() : null);
  if (inn) return inn;
  const identity =
    patientIdentityDocument(patient) ||
    (normalizedTaxpayerRelationship(payment?.payerRelationship) === "self" ? payment?.payerIdentityDocument?.trim() : null);
  if (identity) return "";
  return "заполнить перед выдачей";
}

function patientIdentityDocumentForTax(payment: Payment | null, patient: Patient) {
  return (
    patientIdentityDocument(patient) ||
    (normalizedTaxpayerRelationship(payment?.payerRelationship) === "self" ? payment?.payerIdentityDocument?.trim() : null) ||
    "заполнить перед выдачей"
  );
}

function paymentFiscalReceiptDetailsLabel(payment: Payment): string | null {
  const fiscalReceipt = payment.fiscalReceipt;
  const receiptUrl = present(fiscalReceipt?.receiptUrl) || present(payment.fiscalReceiptUrl);
  if (!fiscalReceipt && !receiptUrl) return null;
  return (
    compactParts([
      present(fiscalReceipt?.fn) ? `ФН ${present(fiscalReceipt?.fn)}` : null,
      present(fiscalReceipt?.fd) ? `ФД ${present(fiscalReceipt?.fd)}` : null,
      present(fiscalReceipt?.fpd) ? `ФПД ${present(fiscalReceipt?.fpd)}` : null,
      present(fiscalReceipt?.cashierName) ? `кассир ${present(fiscalReceipt?.cashierName)}` : null,
      receiptUrl ? `ОФД ${receiptUrl}` : null
    ]) || null
  );
}

function paymentReceiptLabel(payment: Payment) {
  return paymentFiscalReceiptDetailsLabel(payment) || payment.fiscalReceiptNumber?.trim() || `платеж ${payment.id.slice(0, 8)}`;
}

function paymentDateLabel(payment: Payment) {
  const value = payment.fiscalReceiptIssuedAt || payment.paidAt;
  if (!value) return "дата не зафиксирована";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("ru-RU");
}

function paidPaymentsForDocument(document: GeneratedDocument, context: DocumentRenderContext): Payment[] {
  const matchingPayments = (context.payments ?? []).filter(
    (payment) => payment.patientId === document.patientId && payment.status === "paid" && payment.amountRub > 0
  );
  if (document.kind === "payment_receipt" && document.payload?.paymentReceipt?.selectedPaymentIds.length) {
    const selectedPaymentIds = new Set(document.payload.paymentReceipt.selectedPaymentIds);
    return matchingPayments.filter((payment) => selectedPaymentIds.has(payment.id));
  }
  if (document.kind === "payment_refund_correction_request" && document.payload?.paymentRefundCorrection?.selectedPaymentIds.length) {
    const selectedPaymentIds = new Set(document.payload.paymentRefundCorrection.selectedPaymentIds);
    return matchingPayments.filter((payment) => selectedPaymentIds.has(payment.id));
  }
  const linkedPayments = matchingPayments.filter((payment) => payment.documentId === document.id);
  if (linkedPayments.length) return linkedPayments;
  const visitPayments = matchingPayments.filter((payment) => document.visitId && payment.visitId === document.visitId);
  return visitPayments.length ? visitPayments : [];
}

function hasFiscalReceiptNumber(payment: Payment): boolean {
  return Boolean(present(payment.fiscalReceiptNumber));
}

function hasAllFiscalReceipts(payments: Payment[]): boolean {
  return payments.every(hasFiscalReceiptNumber);
}

function hasFiscalReceiptDate(payment: Payment): boolean {
  return isValidDateLike(payment.fiscalReceiptIssuedAt);
}

function hasAllFiscalReceiptDates(payments: Payment[]): boolean {
  return payments.every(hasFiscalReceiptDate);
}

function isValidDateLike(value: string | null | undefined): boolean {
  const clean = present(value);
  if (!clean) return false;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(clean);
  if (iso) {
    const parsed = new Date(clean);
    return !Number.isNaN(parsed.getTime());
  }
  const ru = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(clean);
  if (ru) {
    const parsed = new Date(`${ru[3]}-${ru[2]}-${ru[1]}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime());
  }
  return false;
}

function hasPaymentPayerIdentity(payment: Payment): boolean {
  const payerInnLength = digitsOnly(payment.payerInn).length;
  return Boolean(
    hasPersonNameParts(payment.payerFullName) &&
      isValidDateLike(payment.payerBirthDate) &&
      (payerInnLength === 10 || payerInnLength === 12) &&
      present(payment.payerIdentityDocument) &&
      normalizedTaxpayerRelationship(payment.payerRelationship)
  );
}

function hasAllPaymentPayerIdentities(payments: Payment[]): boolean {
  return payments.every(hasPaymentPayerIdentity);
}

function normalizedFiscalReceiptNumber(value: string | null | undefined): string {
  return (present(value) ?? "").replace(/\s+/g, " ").toLocaleUpperCase("ru-RU");
}

function normalizedDocumentValue(value: string | null | undefined): string {
  return (present(value) ?? "").replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
}

function paymentReceiptStoredFieldMatchesPayload(storedValue: string | null | undefined, payloadValue: string | null | undefined): boolean {
  const normalizedStoredValue = normalizedDocumentValue(storedValue);
  if (!normalizedStoredValue) return true;
  return normalizedStoredValue === normalizedDocumentValue(payloadValue);
}

function paymentReceiptSelectionBlockReason(document: GeneratedDocument, context: DocumentRenderContext): string | null {
  if (document.kind !== "payment_receipt") return null;
  const payload = document.payload?.paymentReceipt;
  if (!payload) return null;

  const paymentsById = new Map((context.payments ?? []).map((payment) => [payment.id, payment]));
  const selectedPayments: Payment[] = [];
  for (const paymentId of payload.selectedPaymentIds) {
    const payment = paymentsById.get(paymentId);
    if (!payment) return "Платежная квитанция содержит выбранный платеж, которого нет в базе. Обновите экран и выберите чек заново.";
    if (payment.patientId !== document.patientId) return "Платежная квитанция содержит платеж другого пациента.";
    if (document.visitId && payment.visitId !== document.visitId) {
      return "Платежная квитанция содержит платеж не из выбранного визита.";
    }
    if (payment.status !== "paid" || payment.amountRub <= 0) {
      return "Платежная квитанция может включать только проведенные положительные оплаты.";
    }
    selectedPayments.push(payment);
  }

  const actualTotalRub = selectedPayments.reduce((total, payment) => total + payment.amountRub, 0);
  if (actualTotalRub !== payload.totalPaidRub) {
    return `Платежная квитанция: сумма ${payload.totalPaidRub} руб. не совпадает с выбранными оплатами ${actualTotalRub} руб.`;
  }

  const actualReceiptNumbers = new Set(
    selectedPayments.map((payment) => normalizedFiscalReceiptNumber(payment.fiscalReceiptNumber)).filter(Boolean)
  );
  const payloadReceiptNumbers = [...new Set(payload.fiscalReceiptNumbers.map(normalizedFiscalReceiptNumber).filter(Boolean))];
  const unknownPayloadReceipts = payloadReceiptNumbers.filter((receiptNumber) => !actualReceiptNumbers.has(receiptNumber));
  if (unknownPayloadReceipts.length) {
    return `Платежная квитанция содержит фискальный чек без связи с выбранной оплатой: ${unknownPayloadReceipts.join(", ")}.`;
  }
  const missingPayloadReceipts = [...actualReceiptNumbers].filter((receiptNumber) => !payloadReceiptNumbers.includes(receiptNumber));
  if (missingPayloadReceipts.length) {
    return `Платежная квитанция должна включать все фискальные чеки выбранных оплат: ${missingPayloadReceipts.join(", ")}.`;
  }

  const payloadPayer = {
    fullName: normalizedDocumentValue(payload.payerFullName),
    birthDate: payload.payerBirthDate,
    inn: payload.payerInn,
    identityDocument: payload.payerIdentityDocument,
    relationship: payload.payerRelationship
  };
  for (const payment of selectedPayments) {
    if (
      normalizedDocumentValue(payment.payerFullName) !== payloadPayer.fullName ||
      (payload.taxSupportRequested &&
        (!paymentReceiptStoredFieldMatchesPayload(payment.payerBirthDate, payloadPayer.birthDate) ||
          !paymentReceiptStoredFieldMatchesPayload(payment.payerInn, payloadPayer.inn) ||
          !paymentReceiptStoredFieldMatchesPayload(payment.payerIdentityDocument, payloadPayer.identityDocument) ||
          !paymentReceiptStoredFieldMatchesPayload(payment.payerRelationship, payloadPayer.relationship)))
    ) {
      return "Платежная квитанция не должна смешивать разные данные плательщика. Проверьте выбранные оплаты и карточку плательщика.";
    }
  }

  return null;
}

function completedWorksActFiscalReceiptBlockReason(document: GeneratedDocument, context: DocumentRenderContext): string | null {
  if (document.kind !== "completed_works_act") return null;
  const payload = document.payload?.completedWorksAct;
  if (!payload) return null;

  const paidPayments = paidPaymentsForDocument(document, context);
  const actualReceiptNumbers = new Set(
    paidPayments.map((payment) => normalizedFiscalReceiptNumber(payment.fiscalReceiptNumber)).filter(Boolean)
  );
  const payloadReceiptNumbers = [...new Set(payload.fiscalReceiptNumbers.map(normalizedFiscalReceiptNumber).filter(Boolean))];

  if (!paidPayments.length) return null;
  if (!actualReceiptNumbers.size) {
    return "Акт выполненных работ требует фискальные чеки из реально оплаченных платежей выбранного визита.";
  }

  const unknownPayloadReceipts = payloadReceiptNumbers.filter((receiptNumber) => !actualReceiptNumbers.has(receiptNumber));
  if (unknownPayloadReceipts.length) {
    return `Акт выполненных работ содержит фискальный чек без связи с оплатой визита: ${unknownPayloadReceipts.join(", ")}.`;
  }

  const missingPayloadReceipts = [...actualReceiptNumbers].filter((receiptNumber) => !payloadReceiptNumbers.includes(receiptNumber));
  if (missingPayloadReceipts.length) {
    return `Акт выполненных работ должен включать все фискальные чеки оплаченных платежей визита: ${missingPayloadReceipts.join(", ")}.`;
  }

  return null;
}

function paymentRefundCorrectionFiscalReceiptBlockReason(document: GeneratedDocument, context: DocumentRenderContext): string | null {
  if (document.kind !== "payment_refund_correction_request") return null;
  const payload = document.payload?.paymentRefundCorrection;
  if (!payload) return null;
  const expectedReceipt = normalizedFiscalReceiptNumber(payload.originalFiscalReceiptNumber);
  if (!expectedReceipt) return "Заявление на возврат или коррекцию требует исходный номер фискального чека.";

  const actualReceiptNumbers = new Set(
    paidPaymentsForDocument(document, context).map((payment) => normalizedFiscalReceiptNumber(payment.fiscalReceiptNumber)).filter(Boolean)
  );
  if (!actualReceiptNumbers.size) return null;
  return actualReceiptNumbers.has(expectedReceipt)
    ? null
    : `Заявление на возврат или коррекцию содержит фискальный чек без связи с оплатой визита: ${expectedReceipt}.`;
}

function hasExplicitTaxDeductionCode(payment: Payment): boolean {
  return payment.taxDeductionCode === "1" || payment.taxDeductionCode === "2";
}

function paymentMethodForDocument(payment: Payment) {
  const labels: Record<Payment["method"], string> = {
    cash: "наличные",
    card: "карта",
    bank_transfer: "банковский перевод",
    online: "онлайн-оплата",
    insurance: "страховая",
    other: "иной способ"
  };
  return labels[payment.method] ?? payment.method;
}

function paymentReceiptRows(payments: Payment[]) {
  if (!payments.length) {
    return `<tr><td colspan="5">Перед выдачей нужен сохраненный оплаченный платеж.</td></tr>`;
  }
  return payments
    .map(
      (payment) =>
        `<tr><td>${escapeHtml(paymentDateLabel(payment))}</td><td>${escapeHtml(paymentMethodForDocument(payment))}</td><td>${escapeHtml(
          rub(payment.amountRub)
        )}</td><td>${escapeHtml(paymentReceiptLabel(payment))}</td><td>${escapeHtml(
          compactParts([
            present(payment.payerFullName),
            present(payment.payerInn) ? `ИНН ${present(payment.payerInn)}` : null,
            present(payment.payerBirthDate) ? `дата рождения ${present(payment.payerBirthDate)}` : null,
            present(payment.payerIdentityDocument) ? `документ ${present(payment.payerIdentityDocument)}` : null,
            present(payment.payerRelationship) ? `связь с пациентом: ${present(payment.payerRelationship)}` : null
          ]) || "плательщик не указан"
        )}</td></tr>`
    )
    .join("");
}

function taxRegistryRows(payments: Payment[], document: GeneratedDocument) {
  if (!payments.length) {
    return `<tr><td>заполнить</td><td>заполнить</td><td>код не выбран</td><td>${escapeHtml(rub(document.totalAmountRub))}</td></tr>`;
  }

  return payments
    .map((payment) => {
      const dateLabel = paymentDateLabel(payment);
      return `<tr><td>${escapeHtml(dateLabel)}</td><td>${escapeHtml(paymentReceiptLabel(payment))}</td><td>${escapeHtml(
        taxPaymentCodeLabel(taxPaymentCode(payment))
      )}</td><td>${escapeHtml(rub(payment.amountRub))}</td></tr>`;
    })
    .join("");
}

function taxDeductionCertificate(document: GeneratedDocument, patient: Patient, context: DocumentRenderContext) {
  const taxPayments = taxPaymentsForDocument(document, context);
  const taxpayerPayment = firstTaxPayment(taxPayments);
  const regularTreatmentRub = taxPayments.length ? taxPaymentSum(taxPayments, "1") : document.totalAmountRub;
  const expensiveTreatmentRub = taxPaymentSum(taxPayments, "2");
  return `<div class="notice">
      <strong>Налоговый документ.</strong>
      С 2024 года для социального вычета используется справка об оплате медицинских услуг по форме КНД 1151156,
      утвержденной приказом ФНС России от 08.11.2023 N ЕА-7-11/824@. Этот HTML - черновик данных, не финальная утвержденная печатная форма.
      Документ выпускается только по фактически оплаченным услугам и на основании заявления пациента/плательщика.
    </div>
    ${officialKnd1151156PrintBlock(
      document,
      patient,
      context,
      taxPayments,
      taxpayerPayment,
      regularTreatmentRub,
      expensiveTreatmentRub
    )}
    <h2>Данные для справки КНД 1151156</h2>
    <table>
      ${row("ФИО пациента", patient.fullName)}
      ${row("ФИО налогоплательщика", payerNameForTax(taxpayerPayment, patient))}
      ${row("ИНН налогоплательщика", payerInnForTax(taxpayerPayment, patient))}
      ${row("Дата рождения налогоплательщика", payerBirthDateForTax(taxpayerPayment, patient))}
      ${row("Документ налогоплательщика", payerIdentityDocumentForTax(taxpayerPayment, patient))}
      ${row("Налогоплательщик и пациент являются одним лицом", taxpayerPatientSameFlag(taxpayerPayment))}
      ${row("Дата рождения пациента", patientBirthDateForTax(taxpayerPayment, patient))}
      ${row("ИНН пациента", patientInnForTax(taxpayerPayment, patient))}
      ${row("Документ пациента", patientIdentityDocumentForTax(taxpayerPayment, patient))}
      ${row("Налоговый период", documentTaxYear(document))}
      ${row("Сумма обычного лечения, код 1", rub(regularTreatmentRub))}
      ${row("Сумма дорогостоящего лечения, код 2", rub(expensiveTreatmentRub))}
      ${row("Родство с пациентом", payerRelationshipForTax(taxpayerPayment))}
      ${row("Реквизиты клиники", clinicLegalRequisites(context.clinicProfile))}
    </table>
    <h2>Фискальные основания</h2>
    <table>
      <tr><th>Дата фискального чека</th><th>Документ/чек</th><th>Код услуги</th><th>Сумма</th></tr>
      ${taxRegistryRows(taxPayments, document)}
    </table>
    <h2>Проверка администратора</h2>
    ${checkList([
      "есть заявление пациента/плательщика на выдачу справки",
      "сумма совпадает с оплатами и фискальными чеками",
      "плановые и неоплаченные услуги не включены",
      "пациент/плательщик указан корректно",
      "есть заявление плательщика; справка готовится в двух экземплярах, повторная справка по тем же расходам не выдавалась",
      "при исправлении ранее выданных сведений оформляется корректировка/аннулирование по правилам ФНС, а не новый дубликат",
      "код услуги выбран по утвержденному перечню и внутренней политике клиники",
      "справка подписана уполномоченным лицом клиники"
    ])}
    ${signatureBlock("Ответственный администратор", "Главный врач/уполномоченное лицо")}`;
}

function legacyTaxDeductionCertificate(document: GeneratedDocument, patient: Patient, context: DocumentRenderContext) {
  const taxPayments = taxPaymentsForDocument(document, context);
  const taxpayerPayment = firstTaxPayment(taxPayments);
  const regularTreatmentRub = taxPayments.length ? taxPaymentSum(taxPayments, "1") : document.totalAmountRub;
  const expensiveTreatmentRub = taxPaymentSum(taxPayments, "2");
  return `<div class="notice">
      <strong>Старая налоговая справка.</strong>
      Для расходов до 2024 года используется прежний порядок справки об оплате медицинских услуг по приказу Минздрава России и МНС России от 25.07.2001 N 289/БГ-3-04/256.
      Этот HTML - черновик данных и контрольный лист для клиники; перед выдачей администратор должен проверить актуальность периода, подпись, печать и локальный бланк клиники.
    </div>
    <h2>Справка об оплате медицинских услуг для налоговой до 2024 года</h2>
    <table>
      ${row("ФИО пациента", patient.fullName)}
      ${row("ФИО налогоплательщика", payerNameForTax(taxpayerPayment, patient))}
      ${row("ИНН налогоплательщика", payerInnForTax(taxpayerPayment, patient))}
      ${row("Документ налогоплательщика", payerIdentityDocumentForTax(taxpayerPayment, patient))}
      ${row("Дата рождения пациента", patientBirthDateForTax(taxpayerPayment, patient))}
      ${row("ИНН пациента", patientInnForTax(taxpayerPayment, patient))}
      ${row("Документ пациента", patientIdentityDocumentForTax(taxpayerPayment, patient))}
      ${row("Налоговый период оплаты", documentTaxYear(document))}
      ${row("Обычные медицинские услуги, код 1", rub(regularTreatmentRub))}
      ${row("Дорогостоящие медицинские услуги, код 2", rub(expensiveTreatmentRub))}
      ${row("Родство с пациентом", payerRelationshipForTax(taxpayerPayment))}
      ${row("Реквизиты клиники", clinicLegalRequisites(context.clinicProfile))}
    </table>
    <h2>Фискальные основания</h2>
    <table>
      <tr><th>Дата оплаты</th><th>Документ/чек</th><th>Код услуги</th><th>Сумма</th></tr>
      ${taxRegistryRows(taxPayments, document)}
    </table>
    <h2>Контроль перед выдачей</h2>
    ${checkList([
      "год оплаты находится в старом порядке 2021-2023, а не в форме КНД 1151156",
      "проверены ФИО, ИНН и документ налогоплательщика",
      "суммы совпадают с фактическими оплатами и фискальными чеками",
      "коды 1/2 разделены по утвержденному перечню и внутренней политике клиники",
      "справка выдается на локальном бланке клиники, подписывается уполномоченным лицом и не включает неоплаченные планы"
    ])}
    ${signatureBlock("Ответственный администратор", "Главный врач/уполномоченное лицо")}`;
}

function taxApplicationFiscalReceiptLine(payment: Payment): string {
  return compactParts([
    payment.fiscalReceiptNumber?.trim() ? `чек ${payment.fiscalReceiptNumber.trim()}` : "чек без номера",
    payment.fiscalReceiptIssuedAt?.trim() ? `от ${payment.fiscalReceiptIssuedAt.trim()}` : payment.paidAt?.trim() ? `оплата ${payment.paidAt.trim()}` : null,
    rub(payment.amountRub)
  ]);
}

function taxApplicationSelectedPaymentsSummary(payments: Payment[], selectedPaymentCount: number): string {
  if (!selectedPaymentCount) {
    return "чеки пока не выбраны: администратор сверит кассу перед выпуском справки";
  }
  if (!payments.length) {
    return "выбранные чеки не найдены в кассе: обновите выбор перед выдачей";
  }
  return payments.map(taxApplicationFiscalReceiptLine).join("; ");
}

function taxDeductionApplication(document: GeneratedDocument, patient: Patient, context: DocumentRenderContext) {
  const payload = document.payload?.taxDeductionApplication;
  const payloadSelectedPaymentIds = payload?.selectedPaymentIds ?? [];
  const selectedPaymentIds = new Set(payloadSelectedPaymentIds);
  const taxPayments = payload
    ? selectedPaymentIds.size
      ? taxPaymentsForDocument(document, context).filter((payment) => selectedPaymentIds.has(payment.id))
      : []
    : taxPaymentsForDocument(document, context);
  const taxpayerPayment = firstTaxPayment(taxPayments);
  const taxpayerName = payload?.taxpayerFullName ?? payerNameForTax(taxpayerPayment, patient);
  const taxpayerInn = payload?.taxpayerInn ?? payerInnForTax(taxpayerPayment, patient);
  const taxpayerBirthDate = payload?.taxpayerBirthDate ?? payerBirthDateForTax(taxpayerPayment, patient);
  const taxpayerIdentityDocument = payload?.taxpayerIdentityDocument ?? payerIdentityDocumentForTax(taxpayerPayment, patient);
  const taxpayerRelationship = payload
    ? taxApplicationRelationshipLabels[payload.relationshipToPatient]
    : payerRelationshipForTax(taxpayerPayment);
  const requestedTaxYear = payload?.requestedTaxYear ?? document.taxYear;
  const requestedForm =
    payload?.requestedForm ??
    (requestedTaxYear && requestedTaxYear < taxDeductionCertificateMinYear ? "legacy_2021_2023" : "knd_1151156");
  const deliveryChannel = payload ? taxApplicationDeliveryChannelLabels[payload.deliveryChannel] : "бумажно / электронно / через личный кабинет при наличии процесса";
  const recipient = payload?.contactForReadyDocument ?? documentRecipientLine(patient);
  const targetCertificate = taxApplicationFormLabels[requestedForm];
  const requestDate = payload?.requestedAt ?? issuedDate(document);
  const authorityDocument = payload?.applicantAuthorityDocument?.trim() || "не требуется, если заявитель и налогоплательщик совпадают";
  return `<h2>Заявление на справку для налогового вычета</h2>
    <p>Прошу подготовить ${escapeHtml(targetCertificate)} для представления в налоговый орган.</p>
    <table>
      ${row("Пациент", patient.fullName)}
      ${row("Налогоплательщик/плательщик", taxpayerName)}
      ${row("ИНН налогоплательщика", taxpayerInn)}
      ${row("Дата рождения налогоплательщика", taxpayerBirthDate)}
      ${row("Документ налогоплательщика", taxpayerIdentityDocument)}
      ${row("Налоговый период", requestedTaxYear ? String(requestedTaxYear) : documentTaxYear(document))}
      ${row("Запрошенная форма", targetCertificate)}
      ${payload ? row("Выбранные фискальные чеки", taxApplicationSelectedPaymentsSummary(taxPayments, payloadSelectedPaymentIds.length)) : ""}
      ${row("Родство с пациентом", taxpayerRelationship)}
      ${row("Кому выдать документ", recipient)}
      ${row("Канал получения", deliveryChannel)}
      ${row("Дата заявления", requestDate)}
      ${row("Основание полномочий представителя", authorityDocument)}
    </table>
    ${
      taxPayments.length
        ? `<h2>Заявленные оплаты</h2>
    <table>
      <tr><th>Дата оплаты</th><th>Документ/чек</th><th>Код услуги</th><th>Сумма</th></tr>
      ${taxRegistryRows(taxPayments, document)}
    </table>`
        : payload
          ? `<div class="notice">Фискальные чеки не включены в заявление автоматически. Администратор выберет оплаченные чеки перед выпуском справки или реестра.</div>`
          : ""
    }
    <h2>Контроль перед выпуском справки</h2>
    ${checkList([
      "заявление подписано пациентом или плательщиком",
      "проверены ФИО, ИНН, родство и контакт для выдачи",
      "дата рождения и документ налогоплательщика сверены с заявлением",
      "оплаты и фискальные чеки найдены в кассе за выбранный налоговый период",
      "обычное лечение код 1 и дорогостоящее лечение код 2 будут разделены перед выдачей справки",
      "неоплаченные планы лечения и предварительные сметы не попадут в КНД 1151156",
      "повторная справка по тем же расходам не выпускается без аннулирования или корректировки предыдущей"
    ])}
    ${signatureBlock("Заявитель", "Администратор")}`;
}

function informedConsent(document: GeneratedDocument) {
  const payload = document.payload?.informedConsent as InformedConsentPayload | undefined;
  if (payload) {
    return `<div class="notice">
      Информированное добровольное согласие оформляется до вмешательства. Основание: 323-ФЗ, клинические разъяснения врача и локально утвержденная форма клиники.
      Документ фиксирует конкретное вмешательство, риски, альтернативы и подтверждения пациента.
    </div>
    <h2>Медицинское вмешательство</h2>
    <table>
      ${row("Планируемое вмешательство", payload.intervention)}
      ${row("Область/зубы", payload.toothOrArea)}
      ${row("Диагноз или клиническое показание", payload.diagnosisOrIndication)}
      ${row("Ожидаемая польза", payload.expectedBenefit)}
      ${row("Анестезия", present(payload.plannedAnesthesia) ?? "не применяется / не указана")}
      ${present(payload.materialOrMedicationNotes) ? row("Материалы, препараты и ограничения", payload.materialOrMedicationNotes ?? "") : ""}
      ${present(payload.trustedContactForMedicalInfo) ? row("Кому можно сообщать медицинские сведения", payload.trustedContactForMedicalInfo ?? "") : ""}
      ${row("Врач, проводивший разъяснение", payload.doctorFullName)}
      ${row("Дата и время подтверждения", payload.consentConfirmedAt)}
    </table>
    <h2>Разъясненные риски</h2>
    ${bulletList(payload.explainedRisks)}
    <h2>Альтернативы</h2>
    ${bulletList(payload.alternatives)}
    <h2>После вмешательства</h2>
    ${bulletList(payload.aftercareRequirements)}
    <h2>Подтверждения пациента</h2>
    ${checkList([
      "пациент получил ответы на вопросы до подписания",
      "пациент понимает характер вмешательства, риски и возможные осложнения",
      "пациент знает, что может отозвать согласие до начала вмешательства"
    ])}
    ${signatureBlock("Пациент/законный представитель", signatureParty("Врач", payload.doctorFullName))}`;
  }
  return `<div class="notice">
      Информированное добровольное согласие оформляется до вмешательства. Основа: 323-ФЗ и действующие формы/порядки Минздрава.
      Стоматологический текст клиники должен быть утвержден локально.
    </div>
    <h2>Медицинское вмешательство</h2>
    <table>
      ${row("Планируемое вмешательство", document.title)}
      ${row("Область/зубы", "заполнить врачом перед подписанием")}
      ${row("Анестезия", "указать препарат/метод при применении")}
      ${row("Кому можно сообщать медсведения", "ФИО/телефон доверенного лица или \"не разрешаю\"")}
    </table>
    <h2>Пациенту разъяснено</h2>
    ${bulletList([
      "цель, характер, объем и ожидаемый результат вмешательства",
      "основные риски, осложнения, боль, отек, кровотечение, аллергические реакции, необходимость повторного приема",
      "альтернативы лечения и последствия отказа",
      "право задавать вопросы и отозвать согласие до вмешательства",
      "необходимость сообщить об аллергиях, лекарствах, беременности, хронических заболеваниях"
    ])}
    <p>Пациент подтверждает, что получил ответы на вопросы и согласен на проведение вмешательства.</p>
    ${signatureBlock("Пациент/законный представитель", "Врач")}`;
}

function procedureSpecificConsentPacket(document: GeneratedDocument) {
  const payload = document.payload?.procedureSpecificConsent as ProcedureSpecificConsentPayload | undefined;
  if (payload) {
    const procedureTypeLabels: Record<ProcedureSpecificConsentPayload["procedureType"], string> = {
      local_anesthesia: "местная анестезия",
      therapy_endo_restoration: "терапия, эндодонтия или реставрация",
      surgery_extraction: "хирургия или удаление зуба",
      implantation_bone_graft: "имплантация, костная пластика или синус-лифтинг",
      prosthetics: "ортопедия",
      orthodontics: "ортодонтия",
      hygiene_whitening: "профессиональная гигиена или отбеливание",
      periodontology: "пародонтология",
      other: "другая процедура"
    };
    return `<div class="notice">
      Процедурное приложение к информированному согласию оформлено по конкретной процедуре. Общие чеклисты без указания области, рисков и подтверждений пациента не считаются готовым согласием.
    </div>
    <h2>Конкретная процедура</h2>
    <table>
      ${row("Блок процедуры", procedureTypeLabels[payload.procedureType])}
      ${row("Процедура/этап", payload.procedureName)}
      ${row("Область/зубы", payload.toothOrArea)}
      ${row("Диагноз или клиническое показание", payload.diagnosisOrIndication)}
      ${row("Анестезия", present(payload.plannedAnesthesia) ?? "не применяется / не указана")}
      ${present(payload.materialsAndSystems) ? row("Материалы, системы и конструкции", payload.materialsAndSystems ?? "") : ""}
      ${row("Врач, проводивший разъяснение", payload.doctorFullName)}
      ${row("Дата и время подтверждения", payload.consentConfirmedAt)}
      ${row("Локальная форма клиники", payload.localClinicFormAttached ? "приложена или включена в пакет" : "не приложена; используется этот структурированный пакет")}
    </table>
    <h2>Клиническая детализация по зубам и сегментам</h2>
    ${clinicalToothRowsTable(payload.clinicalToothRows)}
    <h2>Факторы риска пациента</h2>
    ${bulletList(payload.patientSpecificRiskFactors)}
    <h2>Процедурные риски</h2>
    ${bulletList(payload.procedureSpecificRisks)}
    <h2>Альтернативы и отказ</h2>
    ${bulletList(payload.alternatives)}
    <h2>Ограничения после процедуры</h2>
    ${bulletList(payload.aftercareAndLimits)}
    <h2>Подтверждения перед подписью</h2>
    ${checkList([
      "пациенту разъяснена именно указанная процедура, а не общий стоматологический шаблон",
      "пациент сообщил об аллергиях, препаратах, беременности, хронических заболеваниях и антикоагулянтах либо подтвердил их отсутствие",
      "пациент получил ответы на вопросы до подписания",
      "альтернативы лечения и последствия отказа проговорены",
      "рекомендации после процедуры и признаки срочного обращения понятны пациенту"
    ])}
    ${signatureBlock("Пациент/законный представитель", signatureParty("Врач", payload.doctorFullName))}`;
  }
  return `<div class="notice">
      Приложение к информированному согласию: врач отмечает только фактическую процедуру. Пустые разделы не считаются согласием.
    </div>
    <h2>Процедура</h2>
    <table>
      ${row("Процедура/этап", document.title)}
      ${row("Область/зубы", "заполнить врачом")}
      ${row("Анестезия", "нет / инфильтрационная / проводниковая / аппликационная / иное")}
      ${row("Материалы и конструкции", "композит / керамика / цирконий / имплант-система / брекеты / элайнеры / иное")}
    </table>
    <h2>Отметить применимый блок</h2>
    ${checkList([
      "анестезия: онемение, травма мягких тканей, аллергическая реакция, сердечно-сосудистые реакции",
      "терапия/эндодонтия: повторная боль, перелечивание каналов, перфорация, инструментальный риск, необходимость коронки",
      "хирургия/удаление: кровотечение, отек, альвеолит, повреждение соседних структур, швы, контроль",
      "имплантация/НКР/синус-лифтинг: КТ-планирование, костный объем, мембрана/костный материал, риск отторжения и повторного этапа",
      "ортопедия: препарирование, временная конструкция, примерки, цвет/форма, риск сколов и коррекций",
      "ортодонтия: сроки лечения, гигиена, риск кариеса/резорбции/рецессий, ретенция после лечения",
      "гигиена/отбеливание: чувствительность, раздражение десны, ограничения по питанию и домашнему уходу"
    ])}
    <h2>Перед подписью</h2>
    ${checkList([
      "альтернативы лечения и последствия отказа проговорены",
      "сроки, этапы, стоимость и необходимость снимков/КТ понятны пациенту",
      "пациент сообщил об аллергиях, лекарствах, беременности, хронических заболеваниях и антикоагулянтах",
      "отдельные локальные формы клиники приложены, если процедура требует расширенного согласия"
    ])}
    ${signatureBlock("Пациент/законный представитель", "Врач")}`;
}

function treatmentPlan(document: GeneratedDocument) {
  const payload = document.payload?.treatmentPlan as TreatmentPlanPayload | undefined;
  if (payload) {
    const stageRows = payload.plannedStages
      .map(
        (stage) =>
          `<tr>${cell(stage.stageName)}${cell(stage.plannedServices)}${cell(stage.plannedTiming)}${cell(
            stage.clinicalNotes?.trim() || "по клинической ситуации"
          )}${cell(rub(stage.estimatedAmountRub ?? null))}</tr>`
      )
      .join("");
    return `<h2>Клинический план лечения</h2>
    <div class="notice">
      План лечения фиксирует клиническую логику, этапы, альтернативы и ориентировочную стоимость. Перед вмешательством нужны информированное согласие и, при изменении объема, новое согласование.
    </div>
    <table>
      ${row("Повод обращения", payload.clinicalReason)}
      ${row("Диагноз / клиническое основание", payload.diagnosisSummary)}
      ${row("Зубы / область", payload.teethOrArea)}
      ${row("Ориентировочная стоимость", rub(payload.estimatedTotalRub))}
      ${row("Прогноз и ограничения", payload.prognosisAndLimits)}
      ${row("Контрольный план", payload.controlPlan)}
      ${row("Врач", payload.doctorFullName)}
      ${row("Дата подготовки плана", payload.plannedAt)}
    </table>
    <h2>Клиническая детализация по зубам и сегментам</h2>
    ${clinicalToothRowsTable(payload.clinicalToothRows)}
    <h2>Цели лечения</h2>
    ${bulletList(payload.treatmentGoals)}
    <h2>Планируемые этапы</h2>
    <table>
      <tr><th>Этап</th><th>Услуги и объем</th><th>Срок</th><th>Клинические заметки</th><th>Оценка</th></tr>
      ${stageRows}
    </table>
    <h2>Альтернативы</h2>
    ${bulletList(payload.alternatives)}
    <h2>Риски и ограничения</h2>
    ${bulletList(payload.risksAndLimitations)}
    ${checkList([
      "пациент получил ответы на вопросы по плану лечения",
      "план лечения не заменяет отдельное информированное согласие перед вмешательством",
      "при изменении диагноза, объема, материалов, сроков или стоимости план требует нового согласования"
    ])}
    ${signatureBlock("Пациент ознакомлен", signatureParty("Врач", payload.doctorFullName))}`;
  }

  return `<h2>Клинический план</h2>
    <table>
      ${row("Повод обращения", "заполнить из приема/диктовки")}
      ${row("Диагноз/предварительное заключение", "заполняет врач после осмотра и диагностики")}
      ${row("План лечения", document.title)}
      ${row("Ориентировочная стоимость", rub(document.totalAmountRub))}
    </table>
    <h2>Этапы</h2>
    ${checkList([
      "диагностика, фото-протокол, снимки при показаниях",
      "санация/терапия/гигиена перед ортопедией или хирургией",
      "основное лечение по специальности",
      "контрольный осмотр и рекомендации",
      "альтернативный план и отказанные варианты зафиксированы"
    ])}
    <p class="small">План лечения не является подписанной медицинской записью до проверки врачом.</p>
    ${signatureBlock("Пациент ознакомлен", "Врач")}`;
}

function treatmentPlanAcceptanceVariantLabel(value: TreatmentPlanAcceptancePayload["selectedVariant"]): string {
  const labels: Record<TreatmentPlanAcceptancePayload["selectedVariant"], string> = {
    urgent: "срочный",
    standard: "стандартный",
    optimal: "оптимальный",
    staged: "этапный",
    maintenance: "поддерживающий",
    other: "индивидуальный"
  };
  return labels[value] ?? value;
}

function treatmentPlanAcceptance(document: GeneratedDocument) {
  const payload = document.payload?.treatmentPlanAcceptance as TreatmentPlanAcceptancePayload | undefined;
  if (!payload) {
    return fallbackTreatmentPlanAcceptance(document);
  }

  const stageRows = payload.acceptedStages
    .map(
      (stage) =>
        `<tr>${cell(stage.stageName)}${cell(stage.plannedServices)}${cell(stage.plannedTiming)}${cell(rub(stage.estimatedAmountRub ?? null))}</tr>`
    )
    .join("");

  return `<h2>Согласование плана лечения</h2>
    <div class="notice">
      Документ фиксирует выбранный пациентом вариант лечения, сумму и границы согласия. Изменение диагноза, объема, материалов, сроков или стоимости оформляется новым согласованием или дополнительным соглашением.
    </div>
    <table>
      ${row("Выбранный вариант", treatmentPlanAcceptanceVariantLabel(payload.selectedVariant))}
      ${row("Клиническая цель", payload.clinicalGoal)}
      ${row("Диагноз / клиническое основание", payload.diagnosisSummary)}
      ${row("Зубы / область", payload.teethOrArea)}
      ${row("Ориентировочная стоимость", rub(payload.estimatedTotalRub))}
      ${row("Смета действует до", payload.estimateValidUntil)}
      ${row("Условия оплаты", payload.paymentTerms)}
      ${row("Гарантия и контроль", payload.warrantyAndControlTerms)}
      ${row("Врач", payload.doctorFullName)}
      ${row("Дата и время согласования", payload.acceptedAt)}
    </table>
    <h2>Клиническая детализация по зубам и сегментам</h2>
    ${clinicalToothRowsTable(payload.clinicalToothRows)}
    <h2>Согласованные этапы</h2>
    <table>
      <tr><th>Этап</th><th>Услуги и объем</th><th>Срок</th><th>Оценка</th></tr>
      ${stageRows}
    </table>
    <h2>Отклоненные или отложенные альтернативы</h2>
    ${bulletList(payload.rejectedAlternatives)}
    <h2>Риски и ограничения</h2>
    ${bulletList(payload.risksAndLimitations)}
    ${checkList([
      "пациент получил ответы на вопросы до согласования плана",
      "пациенту объяснены альтернативы, включая наблюдение, второй взгляд, перенос лечения и отказ",
      "пациент понимает, что стоимость и сроки могут измениться при новых клинических данных, снимках, осложнениях или выборе других материалов",
      "существенное изменение объема лечения требует нового согласования"
    ])}
    ${signatureBlock("Пациент согласовал план", "Врач")}`;
}

function fallbackTreatmentPlanAcceptance(document: GeneratedDocument) {
  return `<h2>Согласование плана лечения</h2>
    <table>
      ${row("Выбранный вариант", "срочный / стандартный / оптимальный / этапный / поддерживающий")}
      ${row("Клиническая цель", "заполнить врачом: санация, восстановление функции, эстетика, подготовка к протезированию/имплантации")}
      ${row("Зубы/область", "заполнить по FDI или сегментам")}
      ${row("Ориентировочная стоимость", rub(document.totalAmountRub))}
      ${row("Срок действия сметы", "указать локальным правилом клиники")}
    </table>
    <h2>Пациенту объяснено</h2>
    ${checkList([
      "диагноз, цель лечения, этапы, сроки и ожидаемый результат",
      "альтернативные варианты: наблюдение, терапия, хирургия, ортопедия, ортодонтия, имплантация или отказ",
      "что стоимость меняется при новых клинических данных, КТ/снимках, осложнениях или изменении выбранных материалов",
      "какие варианты пациент отклонил и чем это может повлиять на прогноз",
      "гарантийные условия, ограничения и необходимость контрольных посещений"
    ])}
    <h2>Отклоненные или отложенные варианты</h2>
    <p>______________________________________________________________________________</p>
    <p>______________________________________________________________________________</p>
    ${signatureBlock("Пациент согласовал план", "Врач")}`;
}

function anesthesiaConsentLog(document: GeneratedDocument) {
  const payload = document.payload?.anesthesiaConsentLog;
  if (payload) {
    const doseRows = payload.doseRows
      .map(
        (dose) =>
          `<tr>${cell(dose.time)}${cell(dose.medication)}${cell(dose.doseMl)}${cell(dose.zone)}${cell(dose.reaction ?? "без особенностей")}</tr>`
      )
      .join("");
    return `<h2>Согласие и журнал местной анестезии</h2>
      <div class="notice">
        Структурированные данные заполнены до выдачи. Седация и наркоз требуют отдельного утвержденного пакета клиники.
      </div>
      <table>
        ${row("Планируемый метод", payload.method)}
        ${row("Анестетик", payload.anesthetic)}
        ${row("Вазоконстриктор", payload.vasoconstrictor ?? "не указан")}
        ${row("Зона", payload.plannedZone)}
        ${row("Аллергии и реакции", payload.allergyStatus)}
        ${row("Ограничения и риски", payload.restrictionNotes ?? "не отмечены")}
        ${row("Риски анестезии разъяснены", payload.patientAnesthesiaRisksExplained ? "да" : "нет")}
        ${row("Аллергии и ограничения проверены", payload.allergyAndRestrictionStatusChecked ? "да" : "нет")}
        ${row("Согласие пациента на анестезию", payload.patientConfirmedAnesthesiaConsent ? "да" : "нет")}
      </table>
      <h2>Журнал введения</h2>
      <table>
        <tr><th>Время</th><th>Препарат</th><th>Доза</th><th>Зона</th><th>Реакция</th></tr>
        ${doseRows}
      </table>
      ${checkList([
        "пациент предупрежден об онемении, риске травмы мягких тканей и временном ограничении еды/горячего",
        "перед введением уточнены аллергии, лекарства, хронические заболевания, беременность/лактация и антикоагулянты",
        "при осложнении симптомы, действия врача и дальнейшие рекомендации фиксируются в записи приема"
      ])}
      ${signatureBlock("Пациент/законный представитель", "Врач")}`;
  }
  return `<h2>Согласие на местную анестезию</h2>
    <div class="notice">
      Заполняется перед введением анестетика и дополняется фактическим журналом введения после процедуры.
      При седации/наркозе нужен отдельный утвержденный анестезиологический пакет клиники.
    </div>
    <table>
      ${row("Планируемый метод", "аппликационная / инфильтрационная / проводниковая / интралигаментарная / интраоссальная")}
      ${row("Анестетик", "артикаин / мепивакаин / лидокаин / другое: ____________________")}
      ${row("Вазоконстриктор", "нет / 1:100000 / 1:200000 / другое")}
      ${row("Аллергии и реакции", "нет / есть: ____________________")}
      ${row("Ограничения", "беременность, лактация, антикоагулянты, сердечно-сосудистые риски, сопутствующие препараты")}
    </table>
    <h2>Журнал введения</h2>
    <table>
      <tr><th>Время</th><th>Препарат</th><th>Доза</th><th>Зона</th><th>Реакция</th></tr>
      <tr><td>____:____</td><td>____________________</td><td>____ мл</td><td>____________________</td><td>без особенностей / указать</td></tr>
    </table>
    ${checkList([
      "пациент предупрежден об онемении, риске травмы мягких тканей и временном ограничении еды/горячего",
      "перед введением уточнены аллергии, лекарства и хронические заболевания",
      "при осложнении указаны симптомы, действия врача и дальнейшие рекомендации"
    ])}
    ${signatureBlock("Пациент/представитель", "Врач")}`;
}

function prescriptionMedicationOrder(document: GeneratedDocument) {
  const payload = document.payload?.prescriptionMedicationOrder;
  if (payload) {
    const medicationRows = payload.medications
      .map(
        (medication) =>
          `<tr>${cell(medication.medication)}${cell(medication.dosage)}${cell(medication.instructions)}${cell(medication.duration)}</tr>`
      )
      .join("");
    return `<h2>Назначение лекарственных препаратов</h2>
      <div class="notice">
        Это структурированное назначение клиники. Если нужен рецептурный бланк или электронный рецепт, клиника оформляет его по утвержденному процессу.
      </div>
      <h2>Клиническая привязка назначения</h2>
      ${clinicalToothRowsTable(payload.clinicalToothRows)}
      <table>
        <tr><th>Препарат</th><th>Дозировка</th><th>Как принимать</th><th>Срок</th></tr>
        ${medicationRows}
      </table>
      <h2>Контроль безопасности</h2>
      ${checkList([...payload.safetyNotes, `Срочно связаться с клиникой: ${payload.urgentContactReason}`])}
      ${signatureBlock("Пациент получил назначения", "Врач")}`;
  }
  return `<h2>Назначение лекарственных препаратов</h2>
    <div class="notice">
      Черновик назначения должен быть проверен врачом. Если требуется рецептурный бланк или электронный рецепт,
      клиника оформляет его по своему утвержденному процессу.
    </div>
    <table>
      <tr><th>Препарат</th><th>Дозировка</th><th>Как принимать</th><th>Срок</th></tr>
      <tr><td>____________________</td><td>____________________</td><td>____________________</td><td>__________</td></tr>
      <tr><td>____________________</td><td>____________________</td><td>____________________</td><td>__________</td></tr>
    </table>
    <h2>Контроль безопасности</h2>
    ${checkList([
      "аллергии, беременность/лактация, антикоагулянты и постоянные препараты сверены",
      "пациенту объяснено, что нельзя менять дозировку без врача",
      "указан повод срочно связаться с клиникой: отек, сыпь, одышка, кровотечение, нарастающая боль, температура",
      "назначения согласованы с проведенным вмешательством и медицинской записью"
    ])}
    ${signatureBlock("Пациент получил назначения", "Врач")}`;
}

function personalDataConsent(document: GeneratedDocument, patient: Patient) {
  const payload = document.payload?.personalDataProcessingConsent as PersonalDataProcessingConsentPayload | undefined;

  if (payload) {
    const representativeIdentity = compactParts([
      legalRepresentativeName(patient),
      legalRepresentativeDocument(patient),
      legalRepresentativeRelationship(patient)
    ]);

    return `<h2>Согласие на обработку персональных данных</h2>
      <p>Пациент дает добровольное, конкретное и информированное согласие оператору на обработку персональных данных, включая сведения о здоровье, в пределах целей и правил, указанных ниже.</p>
      <table>
        ${row("Оператор персональных данных", payload.operatorLegalName)}
        ${row("ИНН оператора", payload.operatorInn)}
        ${row("Адрес оператора", payload.operatorAddress)}
        ${row("Субъект персональных данных", patient.fullName)}
        ${patient.birthDate ? row("Дата рождения пациента", patient.birthDate) : ""}
        ${patientIdentityDocument(patient) ? row("Документ пациента", patientIdentityDocument(patient) ?? "") : ""}
        ${patientTaxpayerInn(patient) ? row("ИНН пациента", patientTaxpayerInn(patient) ?? "") : ""}
        ${patientRegistrationAddress(patient) ? row("Адрес регистрации", patientRegistrationAddress(patient) ?? "") : ""}
        ${patientResidentialAddress(patient) ? row("Адрес проживания", patientResidentialAddress(patient) ?? "") : ""}
        ${patientInsurancePolicyNumber(patient) ? row("Полис/ДМС", patientInsurancePolicyNumber(patient) ?? "") : ""}
        ${patientSnils(patient) ? row("СНИЛС", patientSnils(patient) ?? "") : ""}
        ${representativeIdentity ? row("Законный представитель/получатель", representativeIdentity) : ""}
        ${patientDataProcessingBasisNote(patient) ? row("Основание/комментарий клиники", patientDataProcessingBasisNote(patient) ?? "") : ""}
        ${row("Трансграничная передача", payload.crossBorderTransferAllowed ? "разрешена в пределах указанных целей и получателей" : "не разрешена")}
        ${row("Автоматизированные решения", payload.automatedDecisionMakingAllowed ? "разрешены только без юридически значимых решений без участия сотрудника" : "не разрешены")}
        ${row("Срок хранения", payload.retentionPeriod)}
        ${row("Порядок отзыва согласия", payload.revocationChannel)}
        ${row("Дата и время согласия", payload.consentGivenAt)}
      </table>
      <h2>Цели обработки</h2>
      ${bulletList(payload.processingPurposes)}
      <h2>Категории персональных данных</h2>
      ${bulletList(payload.personalDataCategories)}
      <h2>Действия с данными</h2>
      ${bulletList(payload.processingActions)}
      <h2>Передача третьим лицам</h2>
      <p>${escapeHtml(payload.thirdPartyTransferRules)}</p>
      ${checkList([
        "пациент подтвердил добровольное согласие без принуждения",
        "пациент отдельно уведомлен об обработке медицинских данных и сведений о здоровье",
        "оператор обязан прекратить новые необязательные обработки после отзыва согласия, если нет законного основания продолжать хранение",
        "маркетинг, публикации и передача вне медицинского процесса требуют отдельного основания или отдельной отметки пациента"
      ])}
      ${signatureBlock("Пациент/законный представитель", "Оператор/представитель клиники")}`;
  }

  return `<h2>Согласие на обработку персональных данных</h2>
    <p>Пациент дает согласие на обработку персональных данных и медицинской информации в целях оказания медицинской помощи, ведения медицинской документации, расчетов, связи и выполнения требований законодательства.</p>
    <table>
      ${row("Субъект персональных данных", patient.fullName)}
      ${patientIdentityDocument(patient) ? row("Документ пациента", patientIdentityDocument(patient) ?? "") : ""}
      ${patientTaxpayerInn(patient) ? row("ИНН пациента", patientTaxpayerInn(patient) ?? "") : ""}
      ${patientRegistrationAddress(patient) ? row("Адрес регистрации", patientRegistrationAddress(patient) ?? "") : ""}
      ${patientResidentialAddress(patient) ? row("Адрес проживания", patientResidentialAddress(patient) ?? "") : ""}
      ${patientInsurancePolicyNumber(patient) ? row("Полис/ДМС", patientInsurancePolicyNumber(patient) ?? "") : ""}
      ${patientSnils(patient) ? row("СНИЛС", patientSnils(patient) ?? "") : ""}
      ${row("Законный представитель/получатель", representativeIdentityLine(patient))}
      ${patientDataProcessingBasisNote(patient) ? row("Основание/комментарий клиники", patientDataProcessingBasisNote(patient) ?? "") : ""}
    </table>
    <h2>Категории данных</h2>
    ${checkList([
      "ФИО, дата рождения, контакты, документы, адрес",
      "медицинские сведения, диагнозы, снимки, планы лечения, назначения",
      "платежи, договоры, акты, налоговые документы",
      "история обращений, коммуникации и записи согласий"
    ])}
    <h2>Ограничения</h2>
    <p>Перед использованием шаблона клиника должна указать оператора ПДн, цели, сроки хранения, способы обработки, передачу третьим лицам и порядок отзыва согласия.</p>
    ${signatureBlock("Пациент/законный представитель", "Оператор/представитель клиники")}`;
}

function minorLegalRepresentativeConsent(document: GeneratedDocument, patient: Patient) {
  const payload = document.payload?.minorLegalRepresentativeConsent as MinorLegalRepresentativeConsentPayload | undefined;
  if (payload) {
    return `<h2>Согласие законного представителя несовершеннолетнего</h2>
      <div class="notice">
        Документ фиксирует согласие законного представителя на конкретное стоматологическое вмешательство.
        Основание: информирование о целях, методах, рисках, альтернативах и предполагаемом результате медицинской помощи.
      </div>
      <table>
        ${row("Несовершеннолетний пациент", `${payload.minorFullName}, дата рождения: ${payload.minorBirthDate}`)}
        ${row("Законный представитель", payload.representativeFullName)}
        ${row("Родство/статус", payload.representativeRelationship)}
        ${row("Документ представителя", payload.representativeIdentityDocument)}
        ${row("Основание полномочий", payload.authorityDocument)}
        ${row("Контакт представителя", payload.representativePhone?.trim() || "контакт хранится в карте пациента")}
        ${row("Вмешательство", payload.interventionScope)}
        ${row("Диагноз/показание", payload.diagnosisOrIndication)}
        ${row("Врач", payload.doctorFullName)}
        ${row("Дата и время согласия", payload.signedAt)}
      </table>
      <h2>Разъясненные риски</h2>
      ${bulletList(payload.explainedRisks)}
      <h2>Альтернативы</h2>
      ${bulletList(payload.alternativesExplained)}
      ${checkList([
        "личность законного представителя проверена",
        "полномочия представителя подтверждены документом",
        "представитель получил понятное объяснение плана, рисков, альтернатив и ожидаемого результата",
        "согласие будет храниться в медицинской документации пациента",
        "ребенку дано объяснение по возрасту и состоянию"
      ])}
      ${signatureBlock("Законный представитель", signatureParty("Администратор/врач", payload.doctorFullName))}`;
  }
  return `<h2>Согласие законного представителя</h2>
    <table>
      ${row("Пациент", patient.fullName)}
      ${row("Законный представитель", representativeDisplayLine(patient))}
      ${row("Основание полномочий", representativeAuthorityLine(patient))}
      ${row("Контакт представителя", representativeContactLine(patient))}
      ${row("Кому выдавать документы", documentRecipientLine(patient))}
    </table>
    ${checkList([
      "личность представителя проверена",
      "полномочия представителя подтверждены",
      "анамнез ребенка заполнен отдельно: аллергии, лекарства, хронические заболевания, прививки/инфекции по необходимости",
      "представитель получил объяснение плана лечения, рисков, альтернатив и стоимости",
      "при необходимости ребенок получил понятное возрасту объяснение процедуры"
    ])}
    ${signatureBlock("Законный представитель", "Администратор/врач")}`;
}

function consentFlag(value: boolean) {
  return value ? "разрешено" : "не разрешено";
}

function photoVideoConsent(document: GeneratedDocument) {
  const payload = document.payload?.photoVideoConsent;
  if (payload) {
    const materialLabels: Record<string, string> = {
      intraoral_photo: "внутриротовые фото",
      face_photo: "фото лица",
      video: "видео",
      xray: "рентген-снимки",
      cbct: "КЛКТ/КТ",
      scan: "цифровые сканы",
      other: "иные материалы"
    };
    return `<h2>Согласие на фото-, видео- и рентген-материалы</h2>
      <div class="notice">
        Согласие разделяет медицинское использование, передачу подрядчикам, обучение и публикацию. Публикация узнаваемых материалов не считается разрешенной по умолчанию.
      </div>
      <table>
        ${row("Материалы", payload.materials.map((material) => materialLabels[material] ?? material).join(", "))}
        ${row("Медицинская карта и контроль лечения", payload.clinicalRecordUse ? "да, обязательно для медицинской документации" : "нет")}
        ${row("Передача зуботехнической лаборатории", consentFlag(payload.labTransferAllowed))}
        ${row("Консультация коллег / консилиум", consentFlag(payload.colleagueConsultationAllowed))}
        ${row("Обучение и профессиональные разборы", consentFlag(payload.educationUseAllowed))}
        ${row("Маркетинг клиники", consentFlag(payload.marketingUseAllowed))}
        ${row("Узнаваемая публикация лица/улыбки", consentFlag(payload.recognizablePublicationAllowed))}
        ${row("Обезличивание", payload.anonymizationRequired ? "обязательно; ФИО, телефон и лишние признаки не публиковать" : "не подтверждено")}
        ${row("Порядок отзыва", payload.revocationChannel)}
        ${present(payload.scopeNotes) ? row("Ограничения пациента", present(payload.scopeNotes) ?? "") : ""}
      </table>
      ${checkList([
        "использовать материалы только в отмеченных целях",
        "для маркетинга и узнаваемой публикации нужна отдельная явная отметка пациента",
        "после отзыва прекратить новые публикации и зафиксировать дату отзыва в карте/CRM",
        "рентген, КТ и сканы остаются частью медицинской документации и не удаляются из карты без законного основания"
      ])}
      ${signatureBlock("Пациент/законный представитель", "Представитель клиники")}`;
  }

  return `<h2>Согласие на фото-, видео- и рентген-материалы</h2>
    <p>Стоматологические фото, видео, сканы и рентген-материалы используются для диагностики, планирования, контроля качества и ведения медицинской документации.</p>
    <table>
      ${row("Разрешенное использование", "медицинская карта / консультация коллег / лаборатория / обучение / маркетинг")}
      ${row("Маркетинг", "только при отдельной явной отметке пациента")}
      ${row("Обезличивание", "лицо, ФИО и контакты не публиковать без отдельного разрешения")}
      ${row("Отзыв согласия", "пациент может отозвать согласие в порядке, указанном клиникой")}
    </table>
    ${checkList([
      "отдельно отметить, разрешено ли использовать материалы вне медицинской карты",
      "проверить, что передача лаборатории/консилиуму соответствует согласию на ПДн",
      "не публиковать до/после с узнаваемым лицом без отдельной письменной отметки",
      "рентген/КТ остаются частью медицинской документации и не должны удаляться из карты без законного основания"
    ])}
    ${signatureBlock("Пациент/законный представитель", "Представитель клиники")}`;
}

function medicalInterventionRefusal(document: GeneratedDocument) {
  const payload = document.payload?.medicalInterventionRefusal as MedicalInterventionRefusalPayload | undefined;
  if (!payload) {
    return `<h2>Отказ от медицинского вмешательства</h2>
      <p>Пациенту разъяснены характер предложенного вмешательства, возможные последствия отказа, альтернативы и право обратиться за медицинской помощью повторно.</p>
      <table>
        ${row("Предложенное вмешательство", "заполнить врачом")}
        ${row("Причина отказа со слов пациента", "заполнить при наличии")}
        ${row("Возможные последствия", "заполнить врачом: прогрессирование заболевания, боль, инфекция, потеря зуба, осложнения")}
      </table>
      <p>Пациент подтверждает, что последствия отказа понятны.</p>
      ${signatureBlock("Пациент/законный представитель", "Врач")}`;
  }

  return `<h2>Отказ от медицинского вмешательства</h2>
    <p>Пациенту разъяснены характер предложенного вмешательства, медицинские показания, возможные последствия отказа, альтернативы и право обратиться за медицинской помощью повторно.</p>
    <table>
      ${row("Предложенное вмешательство", payload.refusedIntervention)}
      ${row("Клиническое показание", payload.clinicalIndication)}
      ${row("Причина отказа со слов пациента", present(payload.patientReason) ?? "пациент причину не указал")}
      ${row("Врач, проводивший разъяснение", payload.doctorFullName)}
      ${row("Дата и время подтверждения отказа", payload.refusalConfirmedAt)}
    </table>
    <h2>Разъясненные последствия отказа</h2>
    ${bulletList(payload.explainedRisks)}
    <h2>Предложенные альтернативы</h2>
    ${bulletList(payload.alternativesOffered)}
    <h2>Когда срочно обратиться за помощью</h2>
    ${bulletList(payload.urgentWarningSigns)}
    ${checkList([
      "пациент подтвердил, что понял возможные последствия отказа",
      "пациенту предложено получить второе мнение или повторную консультацию",
      "пациенту объяснено, что при ухудшении состояния можно обратиться за экстренной помощью"
    ])}
    ${signatureBlock("Пациент/законный представитель", "Врач")}`;
}

function treatmentCostEstimate(document: GeneratedDocument, context: DocumentRenderContext) {
  const payload = document.payload?.treatmentCostEstimate as TreatmentCostEstimatePayload | undefined;
  if (payload) {
    const serviceRows = payload.serviceLines
      .map(
        (line) => `<tr>
          <td>${escapeHtml(line.serviceName)}</td>
          <td>${escapeHtml(present(line.toothOrArea) ?? "без отдельной области")}</td>
          <td>${line.quantity}</td>
          <td>${escapeHtml(rub(line.unitPriceRub))}</td>
          <td>${escapeHtml(rub(line.discountRub))}</td>
          <td>${escapeHtml(rub(line.totalRub))}</td>
        </tr>`
      )
      .join("");
    return `<h2>Предварительная смета лечения</h2>
      <div class="notice">
        Смета фиксирует предварительный расчет до оказания услуг. Она не заменяет договор платных медицинских услуг,
        информированное согласие, акт выполненных работ и кассовый чек.
      </div>
      <table>
        ${row("Номер сметы", payload.estimateNumber)}
        ${row("Дата сметы", payload.estimateDate)}
        ${row("Пациент или плательщик", payload.patientOrPayerFullName)}
        ${row("Основание лечения", payload.treatmentBasis)}
        ${row("Смета действует до", payload.estimateValidUntil)}
        ${row("Ответственный врач", payload.responsibleDoctorFullName)}
        ${row("Ответственный администратор", present(payload.responsibleAdminFullName) ?? "не указан")}
        ${row("Дата ознакомления", payload.signedAt)}
      </table>
      <h2>Состав услуг и материалов</h2>
      <table>
        <tr><th>Услуга</th><th>Зуб/область</th><th>Кол-во</th><th>Цена</th><th>Скидка</th><th>Итого</th></tr>
        ${serviceRows}
      </table>
      <table>
        ${row("Итого по смете", rub(payload.totalAmountRub))}
        ${row("Условия оплаты", payload.paymentMilestoneNotes)}
        ${row("Правила изменения цены", payload.priceChangeRules)}
      </table>
      <h2>Не входит в текущую смету</h2>
      ${bulletList(payload.excludedItems)}
      ${checkList([
        "пациент понимает предварительный характер сметы и срок ее действия",
        "состав услуг сметы сверён с планом лечения или клиническим назначением",
        "пациент предупрежден, что смета не заменяет договор, акт и кассовый чек",
        "изменение объема или цены требует обновленной сметы либо отдельного согласования"
      ])}
      ${signatureBlock("Пациент/плательщик", "Врач/администратор")}`;
  }
  return `<h2>Предварительная смета</h2>
    ${financialServiceTable(document, context, true)}
    <table>
      ${row("Итого по смете", rub(treatmentPlanTotalRub(document, context)))}
      ${row("Связанный план/визит", document.visitId ? `визит ${document.visitId}` : "план пациента без отдельного визита")}
    </table>
    <h2>Правила сметы</h2>
    ${bulletList([
      "смета предварительная и уточняется после диагностики и согласования плана",
      "материалы, лаборатория, снимки и дополнительные этапы выделяются отдельными строками плана лечения",
      "скидки, рассрочка, предоплата и остаток фиксируются до подписания договора/акта"
    ])}
    ${signatureBlock("Пациент ознакомлен", "Администратор/врач")}`;
}

function paymentInvoice(document: GeneratedDocument, context: DocumentRenderContext) {
  const payload = document.payload?.paymentInvoice as PaymentInvoicePayload | undefined;
  if (payload) {
    const payerContact = compactParts([payload.payerPhone, payload.payerEmail]) || "контакт не передается в счет";
    const serviceRows = payload.serviceLines
      .map(
        (line) => `<tr>
          <td>${escapeHtml(line.serviceName)}</td>
          <td>${escapeHtml(present(line.toothOrArea) ?? "без отдельной области")}</td>
          <td>${line.quantity}</td>
          <td>${escapeHtml(rub(line.unitPriceRub))}</td>
          <td>${escapeHtml(rub(line.discountRub))}</td>
          <td>${escapeHtml(rub(line.totalRub))}</td>
        </tr>`
      )
      .join("");
    return `<h2>Счет на оплату</h2>
      <div class="notice">
        Счет фиксирует согласованную сумму и реквизиты оплаты. Он не заменяет кассовый чек, договор платных медицинских услуг,
        информированное согласие и акт выполненных работ.
      </div>
      <table>
        ${row("Номер счета", payload.invoiceNumber)}
        ${row("Дата счета", payload.invoiceDate)}
        ${row("Плательщик", payload.payerFullName)}
        ${row("Контакт плательщика", payerContact)}
        ${row("Назначение платежа", payload.paymentPurpose)}
        ${row("Срок оплаты", payload.dueDate)}
        ${row("Условия оплаты", payload.paymentTerms)}
        ${row("Получатель и реквизиты", payload.clinicBankDetails)}
        ${row("Оплата безналично", payload.cashlessPaymentAllowed ? "разрешена" : "не используется")}
        ${row("Оплата в кассе", payload.cashDeskPaymentAllowed ? "разрешена" : "не используется")}
        ${present(payload.qrPaymentPayload) ? row("QR/платежная строка", payload.qrPaymentPayload ?? "") : ""}
      </table>
      <h2>Состав счета</h2>
      <table>
        <tr><th>Услуга</th><th>Зуб/область</th><th>Кол-во</th><th>Цена</th><th>Скидка</th><th>Сумма</th></tr>
        ${serviceRows}
      </table>
      <table>
        ${row("Итого к оплате", rub(payload.totalAmountRub))}
      </table>
      ${checkList([
        "реквизиты клиники проверены перед передачей счета",
        "состав услуг соответствует согласованному плану или договору",
        "пациент предупрежден, что счет не является фискальным чеком"
      ])}
      ${signatureBlock("Администратор", "Плательщик")}`;
  }
  return `<h2>Счет на оплату</h2>
    <table>
      ${row("Назначение платежа", `оплата стоматологических услуг по документу ${document.title}`)}
      ${row("Сумма к оплате", rub(treatmentPlanTotalRub(document, context)))}
      ${row("Получатель", clinicPaymentRequisites(context.clinicProfile))}
      ${row("Срок оплаты", "по согласованному плану лечения или договору")}
    </table>
    <h2>Состав счета</h2>
    ${financialServiceTable(document, context, false)}
    <p class="small">Счет не заменяет кассовый чек и медицинские документы.</p>
    ${signatureBlock("Администратор", "Плательщик")}`;
}

function paymentReceipt(document: GeneratedDocument, context: DocumentRenderContext) {
  const payload = document.payload?.paymentReceipt as PaymentReceiptPayload | undefined;
  const documentPayments = paidPaymentsForDocument(document, context);
  const paidRub = documentPayments.reduce((total, payment) => total + payment.amountRub, 0);
  if (payload) {
    const payerTaxRows = payload.taxSupportRequested
      ? `${row("Дата рождения", present(payload.payerBirthDate) ?? "не указана")}
        ${row("ИНН", present(payload.payerInn) ?? "не указан")}
        ${row("Документ удостоверения личности", present(payload.payerIdentityDocument) ?? "не указан")}
        ${row("Связь с пациентом", present(payload.payerRelationship) ?? "не указана")}`
      : row("Налоговая опора", "не запрошена; паспортные данные и ИНН не включались в обычную квитанцию");
    const payerCheck = payload.taxSupportRequested
      ? "налоговые данные плательщика сверены с карточкой пациента, данными оплаты или документом плательщика"
      : "ФИО плательщика сверено; налоговые паспортные данные не запрашивались для обычной квитанции";
    return `<h2>Платежная квитанция DENTE</h2>
      <div class="notice">
        Документ фиксирует состав выбранных фактических оплат и реквизиты фискальных чеков. Квитанция не заменяет кассовый чек и используется как клиническое приложение к платежному досье пациента.
      </div>
      <table>
        ${row("Номер квитанции", payload.receiptNumber)}
        ${row("Дата квитанции", payload.receiptDate)}
        ${row("Клиника", clinicPaymentRequisites(context.clinicProfile))}
        ${row("Связанный документ", document.title)}
        ${row("Назначение оплаты", payload.paymentPurpose)}
        ${row("Оплачено по выбранным платежам", rub(documentPayments.length ? paidRub : payload.totalPaidRub))}
        ${row("Фискальные чеки", payload.fiscalReceiptNumbers.join("; "))}
        ${row("Выдал", payload.issuedByFullName)}
      </table>
      <h2>Плательщик</h2>
      <table>
        ${row("ФИО", payload.payerFullName)}
        ${payerTaxRows}
      </table>
      <h2>Фактические оплаты и чеки</h2>
      <table>
        <tr><th>Дата</th><th>Способ</th><th>Сумма</th><th>Фискальный чек</th><th>Плательщик</th></tr>
        ${paymentReceiptRows(documentPayments)}
      </table>
      ${checkList([
        "выбранные платежи сверены с платежным журналом",
        payerCheck,
        "номера фискальных чеков совпадают с выбранными оплатами",
        "пациент предупрежден, что квитанция не заменяет кассовый чек"
      ])}
      ${signatureBlock("Администратор", "Пациент/плательщик")}`;
  }
  return `<h2>Памятка по оплате</h2>
    <table>
      ${row("Клиника", clinicPaymentRequisites(context.clinicProfile))}
      ${row("Оплачено", rub(documentPayments.length ? paidRub : document.totalAmountRub))}
      ${row("Связанный документ", document.title)}
    </table>
    <h2>Фактические оплаты и чеки</h2>
    <table>
      <tr><th>Дата</th><th>Способ</th><th>Сумма</th><th>Фискальный чек</th><th>Плательщик</th></tr>
      ${paymentReceiptRows(documentPayments)}
    </table>
    ${checkList([
      "выдать кассовый чек",
      "связать оплату с договором/актом",
      "при необходимости подготовить налоговую справку КНД 1151156"
    ])}
    ${signatureBlock("Администратор", "Пациент/плательщик")}`;
}

function installmentPaymentSchedule(document: GeneratedDocument, context: DocumentRenderContext) {
  const payload = document.payload?.installmentPaymentSchedule as InstallmentPaymentSchedulePayload | undefined;
  if (payload) {
    const statusLabels: Record<InstallmentPaymentSchedulePayload["installments"][number]["status"], string> = {
      planned: "запланирован",
      paid: "оплачен",
      overdue: "просрочен",
      rescheduled: "перенесен",
      cancelled: "отменен"
    };
    const rows = payload.installments
      .map(
        (installment) => `<tr>
          <td>${escapeHtml(installment.label)}</td>
          <td>${escapeHtml(installment.dueDate)}</td>
          <td>${escapeHtml(rub(installment.amountRub))}</td>
          <td>${escapeHtml(statusLabels[installment.status])}</td>
        </tr>`
      )
      .join("");
    return `<h2>График рассрочки и оплат</h2>
      <div class="notice">
        График фиксирует внутреннюю договоренность о сроках оплаты к договору или плану лечения. Если применяется банковский продукт,
        заем или кредит, оформляется отдельный договор и юридическая проверка.
      </div>
      <table>
        ${row("Номер графика", payload.scheduleNumber)}
        ${row("Дата графика", payload.scheduleDate)}
        ${row("Основание", payload.baseDocumentTitle)}
        ${row("Плательщик", payload.payerFullName)}
        ${row("Общая сумма", rub(payload.totalAmountRub))}
        ${row("Предоплата", rub(payload.prepaidAmountRub))}
        ${row("Остаток", rub(payload.remainingAmountRub))}
        ${row("Способы оплаты", payload.paymentMethodNotes)}
        ${row("Ответственный сотрудник", payload.responsibleStaffFullName)}
      </table>
      <h2>Платежи</h2>
      <table>
        <tr><th>Этап</th><th>Срок</th><th>Сумма</th><th>Статус</th></tr>
        ${rows}
      </table>
      <h2>Правила изменения графика</h2>
      <p>${escapeHtml(payload.latePaymentPolicy)}</p>
      ${checkList([
        "пациент или плательщик принял график оплат",
        "график не заменяет кассовый чек, акт и договор",
        "изменение суммы или сроков оформляется письменно до нового срока оплаты"
      ])}
      ${signatureBlock("Пациент/плательщик", signatureParty("Ответственный сотрудник", payload.responsibleStaffFullName))}`;
  }
  return `<h2>График рассрочки и оплат</h2>
    <div class="notice">
      Это рабочий график оплат к договору/плану лечения. Если клиника оформляет кредит, заем или банковскую рассрочку,
      нужен отдельный договор и проверка юридической формулировки.
    </div>
    <h2>Состав плана</h2>
    ${financialServiceTable(document, context, true)}
    <table>
      ${row("Общая сумма плана", rub(treatmentPlanTotalRub(document, context)))}
      ${row("Оплачено", rub(paidTotalForDocument(document, context)))}
      ${row("Остаток", rub(Math.max(0, (treatmentPlanTotalRub(document, context) ?? document.totalAmountRub ?? 0) - paidTotalForDocument(document, context))))}
      ${row("Связанный договор/план", document.title)}
    </table>
    <h2>Платежи</h2>
    <table>
      <tr><th>Этап</th><th>Сумма</th><th>Статус</th></tr>
      ${installmentRows(document, context)}
    </table>
    ${checkList([
      "график не заменяет кассовый чек и акт выполненных работ",
      "изменение плана лечения пересогласуется отдельной сметой/дополнительным соглашением",
      "при просрочке администратор фиксирует контакт и новый безопасный срок оплаты"
    ])}
    ${signatureBlock("Пациент/плательщик", "Администратор")}`;
}

function postVisitCareTopicLabel(value: PostVisitRecommendationsPayload["careTopic"]): string {
  const labels: Record<PostVisitRecommendationsPayload["careTopic"], string> = {
    extraction: "удаление зуба",
    implantation: "имплантация / костная пластика",
    filling_restoration: "пломба / реставрация",
    endo: "эндодонтическое лечение",
    surgery: "хирургическое вмешательство",
    local_anesthesia: "местная анестезия",
    hygiene: "профессиональная гигиена",
    prosthetics: "ортопедическое лечение",
    orthodontics: "ортодонтическое лечение",
    periodontology: "пародонтологическое лечение",
    other: "индивидуальные рекомендации"
  };
  return labels[value] ?? value;
}

function postVisitRecommendations(document: GeneratedDocument) {
  const payload = document.payload?.postVisitRecommendations as PostVisitRecommendationsPayload | undefined;
  if (payload) {
    return `<h2>Рекомендации после приема</h2>
    <div class="notice">
      Памятка подготовлена по фактически выполненному приему. Для Telegram используется краткий текст без диагноза, если пациент подключен к боту и дал согласие на уведомления.
    </div>
    <table>
      ${row("Блок рекомендаций", postVisitCareTopicLabel(payload.careTopic))}
      ${row("Процедура", payload.procedureName)}
      ${row("Зубы / область", payload.toothOrArea)}
      ${row("Дата приема", payload.performedAt)}
      ${row("Врач", payload.doctorFullName)}
      ${payload.plannedFollowUpAt ? row("Контрольный прием", payload.plannedFollowUpAt) : ""}
      ${row("Как связаться с клиникой", payload.clinicContactInstruction)}
    </table>
    <h2>Когда можно</h2>
    ${bulletList(payload.allowedAfter)}
    <h2>Временные ограничения</h2>
    ${bulletList(payload.temporaryRestrictions)}
    <h2>Назначения, полоскания и препараты</h2>
    ${bulletList(payload.medicationAndRinsePlan)}
    <h2>Гигиена</h2>
    ${bulletList(payload.hygieneInstructions)}
    <h2>Питание</h2>
    ${bulletList(payload.nutritionInstructions)}
    <h2>Срочно связаться с клиникой при признаках</h2>
    ${bulletList(payload.urgentWarningSigns)}
    <h2>Краткий текст для Telegram</h2>
    <p>${escapeHtml(payload.telegramSummary)}</p>
    ${checkList([
      "пациент получил бумажную или электронную копию рекомендаций",
      "пациент понимает тревожные признаки и канал срочной связи",
      "краткий текст подходит для Telegram и не содержит лишних медицинских подробностей"
    ])}
    ${signatureBlock("Пациент получил рекомендации", signatureParty("Врач", payload.doctorFullName))}`;
  }

  return `<h2>Рекомендации после приема</h2>
    ${checkList([
      "не принимать пищу до окончания действия анестезии",
      "соблюдать назначенный режим, гигиену и прием препаратов",
      "при нарастающей боли, отеке, кровотечении, температуре или аллергической реакции связаться с клиникой",
      "явиться на контрольный прием в согласованный срок",
      "индивидуальные назначения врача вписать ниже"
    ])}
    <h2>Индивидуальные назначения</h2>
    <p>______________________________________________________________________________</p>
    <p>______________________________________________________________________________</p>
    ${signatureBlock("Пациент получил рекомендации", "Врач")}`;
}

function medicalRecordExtract(document: GeneratedDocument, patient: Patient) {
  const payload = document.payload?.medicalRecordExtract as MedicalRecordExtractPayload | undefined;
  if (!payload) {
    return `<h2>Выписка из медицинской карты</h2>
      <p>Документ ожидает структурированные данные из подписанной медицинской записи: период, источники, жалобы, анамнез, статус, диагноз, лечение, рекомендации, врач и получатель.</p>
      ${signatureBlock("Пациент/получатель", "Врач/уполномоченное лицо")}`;
  }
  return `<h2>Выписка из медицинской карты</h2>
    <table>
      ${row("Пациент", patient.fullName)}
      ${patient.birthDate ? row("Дата рождения", patient.birthDate) : ""}
      ${patientIdentityDocument(patient) ? row("Документ пациента", patientIdentityDocument(patient) ?? "") : ""}
      ${row("Период обращения", `с ${payload.periodStart} по ${payload.periodEnd}`)}
      ${row("Источник сведений", payload.sourceVisitIds.join(", "))}
      ${row("Жалобы и анамнез", payload.complaintAndAnamnesis)}
      ${row("Объективный статус", payload.objectiveStatus)}
      ${row("Диагноз", payload.diagnosis)}
      ${row("Проведенное лечение", payload.treatmentProvided)}
      ${row("Рекомендации", payload.recommendations)}
      ${row("Получатель", payload.recipientFullName)}
      ${row("Основание выдачи", payload.recipientAuthority)}
      ${row("Врач", payload.doctorFullName)}
      ${row("Дата выписки", payload.issuedAt)}
    </table>
    <h2>Клиническая детализация по зубам и сегментам</h2>
    ${clinicalToothRowsTable(payload.clinicalToothRows)}
    ${checkList([
      "выписка сформирована только из подписанных медицинских записей",
      "диагноз и рекомендации проверены врачом перед выдачей",
      "лишние сведения о третьих лицах исключены из текста выписки",
      "основание выдачи и получатель проверены администратором клиники"
    ])}
    <p class="small">Выписка отражает сведения медицинской документации за указанный период. Диктовка, черновики и AI-подсказки не являются источником финального диагноза.</p>
    ${signatureBlock(signatureParty("Пациент/получатель", payload.recipientFullName), signatureParty("Врач/уполномоченное лицо", payload.doctorFullName))}`;
}

type Outpatient025uDiagnosisRow = OutpatientMedicalCard025uPayload["finalDiagnoses"][number];
type Outpatient025uTextRecord = OutpatientMedicalCard025uPayload["dynamicObservationRecords"][number];
type Outpatient025uEventRow = OutpatientMedicalCard025uPayload["hospitalizationRows"][number];
type Outpatient025uXrayDoseRow = OutpatientMedicalCard025uPayload["xrayDoseRows"][number];

function outpatient025uValue(value: string | null | undefined): string {
  return present(value) ?? "нет данных";
}

function outpatient025uCode(value: "1" | "2" | "unknown" | null | undefined, labels: Record<"1" | "2", string>): string {
  return value && value !== "unknown" ? labels[value] : "нет данных";
}

function outpatient025uDoctorLine(doctor: Outpatient025uTextRecord["doctor"] | Outpatient025uEventRow["doctor"]): string {
  if (!doctor) return "нет данных";
  return compactParts([doctor.fullName, doctor.position, doctor.specialty]);
}

function outpatient025uDiagnosisDoctorLine(item: Outpatient025uDiagnosisRow): string {
  return compactParts([item.doctorFullName, item.doctorPosition, item.doctorSpecialty]);
}

function outpatient025uFirstOrRepeat(value: Outpatient025uDiagnosisRow["firstOrRepeat"]): string {
  if (value === "first") return "первичный";
  if (value === "repeat") return "повторный";
  return "нет данных";
}

function outpatient025uDiagnosisRowsTable(rows: readonly Outpatient025uDiagnosisRow[], emptyText: string): string {
  if (!rows.length) return `<p>${escapeHtml(emptyText)}</p>`;
  return `<table>
    <tr><th>Дата</th><th>Диагноз</th><th>МКБ-10</th><th>Первичный / повторный</th><th>Врач</th></tr>
    ${rows
      .map(
        (item) =>
          `<tr>${cell(item.date)}${cell(item.diagnosis)}${cell(item.icd10Code)}${cell(outpatient025uFirstOrRepeat(item.firstOrRepeat))}${cell(outpatient025uDiagnosisDoctorLine(item))}</tr>`
      )
      .join("")}
  </table>`;
}

function outpatient025uTextRecordsTable(rows: readonly Outpatient025uTextRecord[], emptyText: string): string {
  if (!rows.length) return `<p>${escapeHtml(emptyText)}</p>`;
  return `<table>
    <tr><th>Дата</th><th>Запись</th><th>Врач</th></tr>
    ${rows.map((item) => `<tr>${cell(item.date)}${cell(item.text)}${cell(outpatient025uDoctorLine(item.doctor))}</tr>`).join("")}
  </table>`;
}

function outpatient025uEventRowsTable(rows: readonly Outpatient025uEventRow[], emptyText: string): string {
  if (!rows.length) return `<p>${escapeHtml(emptyText)}</p>`;
  return `<table>
    <tr><th>Дата</th><th>Событие</th><th>Организация</th><th>Результат</th><th>Врач</th></tr>
    ${rows
      .map(
        (item) =>
          `<tr>${cell(item.date)}${cell(item.event)}${cell(item.organization)}${cell(item.result)}${cell(outpatient025uDoctorLine(item.doctor))}</tr>`
      )
      .join("")}
  </table>`;
}

function outpatient025uXrayDoseTable(rows: readonly Outpatient025uXrayDoseRow[], emptyText: string): string {
  if (!rows.length) return `<p>${escapeHtml(emptyText)}</p>`;
  return `<table>
    <tr><th>Дата</th><th>Исследование</th><th>Область</th><th>Доза</th><th>Источник</th></tr>
    ${rows
      .map((item) => `<tr>${cell(item.date)}${cell(item.study)}${cell(item.area)}${cell(item.dose)}${cell(item.sourceDocument)}</tr>`)
      .join("")}
  </table>`;
}

function outpatientMedicalCard025u(document: GeneratedDocument, patient: Patient) {
  const payload = document.payload?.outpatientMedicalCard025u as OutpatientMedicalCard025uPayload | undefined;
  if (!payload) {
    return `<h2>Медицинская карта пациента, получающего медицинскую помощь в амбулаторных условиях</h2>
      <p>Документ ожидает структурированные данные формы 025/у: сведения о медицинской организации, пациенте, карте, подписанных врачебных записях, диагнозах, стоматологическом статусе и подтверждениях проверки.</p>
      ${signatureBlock("Ответственный врач", "Ответственный за выпуск")}`;
  }

  const firstDoctor = payload.specialistVisitRecords[0]?.doctorFullName ?? null;
  const sexLabel = outpatient025uCode(payload.patientSexCode, { "1": "мужской", "2": "женский" });
  const registrationType = outpatient025uCode(payload.registrationUrbanRuralCode, { "1": "город", "2": "село" });
  const stayType = outpatient025uCode(payload.stayUrbanRuralCode, { "1": "город", "2": "село" });

  const specialistBlocks = payload.specialistVisitRecords
    .map(
      (record, index) => `<section>
        <h3>Запись врача N ${index + 1}</h3>
        <table>
          ${row("Источник DENTE", record.sourceVisitId)}
          ${row("Дата приема", record.visitDate)}
          ${row("Место приема", outpatient025uValue(record.location))}
          ${row("Врач", compactParts([record.doctorFullName, record.doctorPosition, record.doctorSpecialty]))}
          ${row("Первичный / повторный", record.firstOrRepeat === "first" ? "первичный" : record.firstOrRepeat === "repeat" ? "повторный" : "нет данных")}
          ${row("Жалобы", record.complaints)}
          ${row("Анамнез", record.anamnesis)}
          ${row("Объективные данные", record.objectiveData)}
          ${row("Диагноз", record.primaryDiagnosis)}
          ${row("Код МКБ-10", outpatient025uValue(record.primaryDiagnosisIcd10))}
          ${row("Осложнения", outpatient025uValue(record.complications))}
          ${row("Сопутствующие заболевания", outpatient025uValue(record.comorbidities))}
          ${row("Внешняя причина", outpatient025uValue(record.externalCause))}
          ${row("Группа здоровья", outpatient025uValue(record.healthGroup))}
          ${row("Диспансерное наблюдение", outpatient025uValue(record.dispensaryObservation))}
          ${row("Назначения", record.orders)}
          ${row("Проведенное лечение", record.treatmentProvided)}
          ${row("Лекарства и физиотерапия", outpatient025uValue(record.medicinesAndPhysiotherapy))}
          ${row("Лист нетрудоспособности / справка", outpatient025uValue(record.sickLeaveOrCertificate))}
          ${row("Льготные рецепты", outpatient025uValue(record.preferentialPrescriptions))}
          ${row("Согласие / отказ", record.informedConsentOrRefusal)}
        </table>
        <h3>Стоматологическая клиническая детализация</h3>
        ${
          record.clinicalToothRows.length
            ? clinicalToothRowsTable(record.clinicalToothRows)
            : "<p>нет клинических строк в этой записи</p>"
        }
      </section>`
    )
    .join("");

  return `<h2>Медицинская карта пациента, получающего медицинскую помощь в амбулаторных условиях</h2>
    <p class="small">Учетная форма N ${escapeHtml(payload.formNumber)}. Источник структуры: ${escapeHtml(payload.sourceOrderReference)}. Электронный юридически значимый обмен требует отдельного контура подписи и медицинских информационных систем.</p>
    <h2>Медицинская организация и карта</h2>
    <table>
      ${row("Медицинская организация", payload.medicalOrganizationName)}
      ${row("Адрес", outpatient025uValue(payload.medicalOrganizationAddress))}
      ${row("ОГРН / ОГРНИП", outpatient025uValue(payload.medicalOrganizationOgrnOrOgrnip))}
      ${row("Лицензия", outpatient025uValue(payload.medicalOrganizationLicense))}
      ${row("Номер карты", payload.medicalCardNumber)}
      ${row("Дата открытия", payload.openedAt)}
      ${row("Период ведения", `с ${payload.periodStart} по ${payload.periodEnd}`)}
      ${row("Источники подписанных записей", payload.sourceVisitIds.join(", "))}
    </table>
    <h2>Пациент</h2>
    <table>
      ${row("ФИО", payload.patientFullName || patient.fullName)}
      ${row("Дата рождения", outpatient025uValue(payload.patientBirthDate))}
      ${row("Пол", sexLabel)}
      ${row("Гражданство", outpatient025uValue(payload.citizenship))}
      ${row("Документ личности", outpatient025uValue(payload.identityDocument))}
      ${row("Серия документа", outpatient025uValue(payload.identityDocumentSeries))}
      ${row("Номер документа", outpatient025uValue(payload.identityDocumentNumber))}
      ${row("Телефон", outpatient025uValue(payload.patientPhone))}
      ${row("Email", outpatient025uValue(payload.patientEmail))}
      ${row("Адрес регистрации", outpatient025uValue(payload.registrationAddress))}
      ${row("Регистрация: город/село", registrationType)}
      ${row("Адрес пребывания", outpatient025uValue(payload.stayAddress))}
      ${row("Пребывание: город/село", stayType)}
      ${row("Полис ОМС", outpatient025uValue(payload.omsPolicy))}
      ${row("Дата выдачи ОМС", outpatient025uValue(payload.omsIssuedAt))}
      ${row("Страховая организация", outpatient025uValue(payload.insurerName))}
      ${row("СНИЛС", outpatient025uValue(payload.snils))}
      ${row("Социальная поддержка", outpatient025uValue(payload.socialSupportCode))}
      ${row("Контакт для раскрытия сведений о здоровье", outpatient025uValue(payload.healthStatusDisclosureContact))}
      ${row("Занятость", outpatient025uValue(payload.employmentCode))}
      ${row("Группа инвалидности", outpatient025uValue(payload.disabilityGroup))}
      ${row("Место работы / учебы", outpatient025uValue(payload.workOrStudyPlace))}
      ${row("Паллиативная помощь", outpatient025uValue(payload.palliativeCareNeedCode))}
      ${row("Группа крови", outpatient025uValue(payload.bloodGroup))}
      ${row("Rh-фактор", outpatient025uValue(payload.rhFactor))}
      ${row("Kell K1", outpatient025uValue(payload.kellK1))}
      ${row("Иные данные крови", outpatient025uValue(payload.otherBloodData))}
      ${row("Аллергии и нежелательные реакции", outpatient025uValue(payload.allergyHistory))}
    </table>
    <h2>Хронические заболевания и диспансерный учет</h2>
    ${outpatient025uDiagnosisRowsTable(payload.chronicDispensaryRegister, "нет данных по хроническим заболеваниям и диспансерному учету")}
    <h2>Заключительные диагнозы</h2>
    ${outpatient025uDiagnosisRowsTable(payload.finalDiagnoses, "нет данных по заключительным диагнозам")}
    <h2>Записи специалистов</h2>
    ${specialistBlocks}
    <h2>Динамическое наблюдение</h2>
    ${outpatient025uTextRecordsTable(payload.dynamicObservationRecords, "нет данных по динамическому наблюдению")}
    <h2>Этапные эпикризы</h2>
    ${outpatient025uTextRecordsTable(payload.stageEpicrisisRecords, "нет данных по этапным эпикризам")}
    <h2>Консультации заведующего отделением</h2>
    ${outpatient025uTextRecordsTable(payload.departmentHeadConsultations, "нет данных по консультациям заведующего")}
    <h2>Врачебная комиссия</h2>
    ${outpatient025uTextRecordsTable(payload.medicalCommissionRecords, "нет данных по врачебной комиссии")}
    <h2>Диспансерное наблюдение</h2>
    ${outpatient025uTextRecordsTable(payload.dispensaryObservationEntries, "нет данных по диспансерному наблюдению")}
    <h2>Госпитализации</h2>
    ${outpatient025uEventRowsTable(payload.hospitalizationRows, "нет данных по госпитализациям")}
    <h2>Операции в амбулаторных условиях</h2>
    ${outpatient025uEventRowsTable(payload.ambulatorySurgeryRows, "нет данных по амбулаторным операциям")}
    <h2>Рентгенологические исследования и дозы</h2>
    ${outpatient025uXrayDoseTable(payload.xrayDoseRows, "нет данных по рентгенологическим дозам")}
    <h2>Функциональные исследования</h2>
    ${outpatient025uTextRecordsTable(payload.functionalResults, "нет данных по функциональным исследованиям")}
    <h2>Лабораторные исследования</h2>
    ${outpatient025uTextRecordsTable(payload.laboratoryResults, "нет данных по лабораторным исследованиям")}
    <h2>Итоговый эпикриз</h2>
    <p>${escapeHtml(outpatient025uValue(payload.finalEpicrisis))}</p>
    ${checkList([
      "карта сформирована из карточки пациента, профиля клиники и подписанных медицинских записей DENTE",
      "структура сверена с приказом Минздрава России от 13.05.2025 N 274н",
      "лишние сведения о третьих лицах исключены перед выдачей",
      "неизвестные разделы не выдуманы и оставлены как нет данных"
    ])}
    ${signatureBlock(signatureParty("Ответственный врач", firstDoctor), "Ответственный за выпуск")}`;
}

function structuredMedicalRecordCopyRequest(document: GeneratedDocument, patient: Patient) {
  const payload = document.payload?.medicalRecordCopyRequest as MedicalRecordCopyRequestPayload | undefined;
  if (!payload) {
    return `<h2>Запрос на копии медицинской документации</h2>
      <p class="placeholder-warning">Документ ожидает структурированные данные запроса: состав, период, формат, получателя, полномочия, контакт выдачи и проверку лишних данных третьих лиц.</p>`;
  }

  const formatLabels: Record<MedicalRecordCopyRequestPayload["requestedFormat"], string> = {
    paper: "бумажная копия",
    pdf: "PDF",
    dicom_archive: "архив исходных снимков",
    secure_link: "защищенная ссылка",
    physical_media: "физический носитель",
    other: "иной согласованный формат"
  };
  const period =
    payload.periodStart || payload.periodEnd
      ? `с ${payload.periodStart || "начала хранения"} по ${payload.periodEnd || "дату запроса"}`
      : "весь доступный период по запросу";

  return `<h2>Запрос на копии медицинской документации</h2>
    <table>
      ${row("Пациент", patient.fullName)}
      ${patient.birthDate ? row("Дата рождения", patient.birthDate) : ""}
      ${patientIdentityDocument(patient) ? row("Документ пациента в карте", patientIdentityDocument(patient) ?? "") : ""}
      ${row("Запрошенные документы", payload.requestedDocumentTypes.join("; "))}
      ${row("Период", period)}
      ${row("Формат выдачи", formatLabels[payload.requestedFormat])}
      ${row("Получатель", payload.recipientFullName)}
      ${row("Документ получателя", payload.recipientIdentityDocument)}
      ${row("Основание полномочий", payload.recipientAuthority)}
      ${payload.representativeAuthorityDocument ? row("Документ представителя", payload.representativeAuthorityDocument) : ""}
      ${row("Дата запроса", payload.requestedAt)}
      ${row("Контакт и канал выдачи", payload.contactForDelivery)}
      ${payload.specialInstructions ? row("Особые указания", payload.specialInstructions) : ""}
      ${row("Исходные файлы снимков", payload.includeDicomSourceData ? "запрошены при наличии в архиве" : "не запрошены")}
    </table>
    ${checkList([
      "личность получателя проверена до выдачи",
      "объем выдачи соответствует запросу и не содержит лишних данных третьих лиц",
      "КТ и рентген выдаются как исходные медицинские файлы, а не как скриншоты, если пациент запросил исходные данные",
      "факт выдачи нужно закрыть распиской о передаче медицинских документов"
    ])}
    ${signatureBlock(signatureParty("Заявитель/получатель", payload.recipientFullName), "Ответственный сотрудник")}`;
}

function medicalRecordCopyRequest(patient: Patient) {
  return `<h2>Запрос на копии медицинской документации</h2>
    <table>
      ${row("Пациент", patient.fullName)}
      ${patientIdentityDocument(patient) ? row("Документ пациента", patientIdentityDocument(patient) ?? "") : ""}
      ${patientRegistrationAddress(patient) ? row("Адрес регистрации", patientRegistrationAddress(patient) ?? "") : ""}
      ${row("Что выдать", "выписка / копия карты / снимки / КТ / финансовые документы / иное")}
      ${row("Период", "с __________ по __________")}
      ${row("Формат", "бумага / PDF / архив исходных снимков / защищенная ссылка при наличии процесса")}
      ${row("Получатель", documentRecipientLine(patient))}
      ${row("Основание представителя", representativeIdentityLine(patient))}
    </table>
    ${checkList([
      "личность получателя проверена",
      "объем выдачи согласован с врачом/администратором и не содержит лишних данных третьих лиц",
      "КТ и рентген выдаются как исходные медицинские файлы, а не как скриншоты, если пациент запросил исходные данные",
      "факт выдачи и канал передачи записаны в журнале клиники"
    ])}
    ${signatureBlock("Заявитель/получатель", "Ответственный сотрудник")}`;
}

function medicalDocumentReleaseReceipt(document: GeneratedDocument, patient: Patient) {
  const payload = document.payload?.medicalDocumentReleaseReceipt;
  if (payload) {
    const releaseChannelLabels: Record<string, string> = {
      paper: "бумажная выдача",
      pdf: "PDF",
      dicom_archive: "архив исходных снимков",
      secure_link: "защищенная ссылка",
      physical_media: "физический носитель",
      other: "иной канал"
    };
    const period = compactParts([
      present(payload.periodStart) ? `с ${present(payload.periodStart)}` : null,
      present(payload.periodEnd) ? `по ${present(payload.periodEnd)}` : null
    ]);
    return `<h2>Расписка о выдаче медицинской документации</h2>
      <p>Получатель подтверждает, что клиника передала только согласованный состав медицинских документов и проверила полномочия до выдачи.</p>
      <table>
        ${row("Получатель", payload.recipientFullName)}
        ${row("Основание выдачи в DENTE", `запрос на копии медицинской документации ${payload.sourceRequestDocumentId}`)}
        ${row("Документ получателя", payload.recipientIdentityDocument)}
        ${row("Основание полномочий", payload.recipientAuthority)}
        ${row("Канал выдачи", releaseChannelLabels[payload.releaseChannel] ?? payload.releaseChannel)}
        ${row("Состав выдачи", payload.documentTypes.join(", "))}
        ${period ? row("Период документов", period) : ""}
        ${row("Дата и время выдачи", payload.deliveredAt)}
        ${present(payload.accessExpiresAt) ? row("Доступ действует до", present(payload.accessExpiresAt) ?? "") : ""}
        ${row("Защита передачи", payload.deliveryProtectionNote)}
        ${row("Проверка данных третьих лиц", payload.thirdPartyDataChecked ? "лишние данные третьих лиц исключены" : "не подтверждено")}
      </table>
      ${checkList([
        "личность получателя и основание выдачи проверены",
        "состав выдачи совпадает с запросом пациента или законного представителя",
        "при передаче КТ/рентгена/снимков проверена целостность архива и носителя",
        "в журнале клиники сохранен факт выдачи, канал передачи и ответственный сотрудник"
      ])}
      ${signatureBlock("Получатель", "Администратор/ответственный сотрудник")}`;
  }
  return `<h2>Расписка о выдаче медицинской документации</h2>
    <table>
      ${row("Пациент", patient.fullName)}
      ${patientIdentityDocument(patient) ? row("Документ пациента", patientIdentityDocument(patient) ?? "") : ""}
      ${row("Получатель", documentRecipientLine(patient))}
      ${row("Документ получателя", representativeIdentityLine(patient))}
      ${row("Канал выдачи", "лично / бумага / PDF / архив исходных снимков / защищенная ссылка / иной носитель")}
      ${row("Дата и время выдачи", "____.__.____ ____:____")}
    </table>
    <h2>Что выдано</h2>
    ${checkList([
      "выписка из медицинской карты",
      "копии медицинской документации за указанный период",
      "рентген/ОПТГ/ТРГ/КЛКТ: исходные файлы снимков или архив, если они запрошены",
      "финансовые документы: договор, акт, чек/квитанция, налоговая справка при наличии",
      "иное: ____________________"
    ])}
    <h2>Контроль выдачи</h2>
    ${checkList([
      "личность получателя проверена до передачи",
      "лишние данные третьих лиц не включены",
      "факт выдачи записан в журнале/аудите клиники",
      "при электронной передаче указан срок действия ссылки или способ защиты архива"
    ])}
    ${signatureBlock("Получатель", "Ответственный сотрудник")}`;
}

function xrayCbctReferral(document: GeneratedDocument) {
  const payload = document.payload?.xrayCbctReferral;
  if (payload) {
    const studyTypeLabels: Record<string, string> = {
      rvg: "RVG / прицельный снимок",
      opg: "ОПТГ",
      cbct: "КЛКТ / КТ",
      trg: "ТРГ",
      tmj: "ВНЧС",
      sinus: "гайморова пазуха",
      photo_protocol: "фотопротокол",
      other: "иное исследование"
    };
    const priorityLabels: Record<string, string> = {
      routine: "планово",
      urgent: "срочно"
    };
    const pregnancyStatusLabels: Record<string, string> = {
      not_applicable: "не применимо",
      denied: "беременность со слов пациента отрицается",
      possible: "беременность возможна",
      confirmed: "беременность подтверждена",
      unknown: "статус не уточнен"
    };
    return `<h2>Направление на рентген/КЛКТ</h2>
      <div class="notice">
        Исследование назначено врачом с конкретной клинической задачей. Результат, описание и исходные файлы должны быть привязаны к медицинской карте пациента.
      </div>
      <h2>Клиническая привязка направления</h2>
      ${clinicalToothRowsTable(payload.clinicalToothRows)}
      <table>
        ${row("Вид исследования", studyTypeLabels[payload.studyType] ?? payload.studyType)}
        ${row("Область", payload.area)}
        ${row("Клинический вопрос", payload.clinicalQuestion)}
        ${row("Показание", payload.indication)}
        ${row("Срочность", priorityLabels[payload.priority] ?? payload.priority)}
        ${row("Беременность/ограничения", pregnancyStatusLabels[payload.pregnancyStatus] ?? payload.pregnancyStatus)}
        ${row("Комментарий по ограничениям", payload.safetyNotes)}
        ${row("Куда направить", payload.recipientClinic ?? "по маршруту клиники")}
        ${row("Срок", payload.dueDate ?? "по записи пациента")}
        ${row("Назначил", payload.requestedBy)}
        ${row("Передача результата", [payload.includeRadiologistReport ? "описание врача-рентгенолога" : null, payload.includeDicomExport ? "исходные файлы снимков" : null].filter(Boolean).join(", ") || "снимок/отчет в карту пациента")}
      </table>
      ${checkList([
        "пациенту объяснена цель исследования и связь с планом лечения",
        "перед исследованием уточнены беременность, ограничения и необходимость защиты",
        "результат должен быть просмотрен врачом, назначившим исследование",
        "исходные файлы, снимки и описание сохраняются в карте пациента и журнале выдачи"
      ])}
      ${signatureBlock("Пациент", "Врач")}`;
  }
  return `<h2>Направление на рентген/КЛКТ</h2>
    <table>
      ${row("Вид исследования", "RVG / ОПТГ / ТРГ / КЛКТ / фото-протокол")}
      ${row("Область", "зуб/сегмент/челюсть указать врачом")}
      ${row("Клиническая задача", "диагностика, эндодонтия, имплантация, ортодонтия, хирургия, контроль")}
      ${row("Беременность/ограничения", "уточнить перед исследованием")}
    </table>
    ${checkList([
      "пациенту объяснена цель исследования",
      "проверены противопоказания и необходимость защиты",
      "результат должен быть привязан к карте пациента и просмотрен врачом"
    ])}
    ${signatureBlock("Пациент", "Врач")}`;
}

function labWorkOrder(document: GeneratedDocument) {
  const payload = document.payload?.labWorkOrder;
  if (payload) {
    return `<h2>Зуботехнический заказ-наряд</h2>
      <h2>Клиническая привязка лабораторной работы</h2>
      ${clinicalToothRowsTable(payload.clinicalToothRows)}
      <table>
        ${row("Тип работы", payload.workType)}
        ${row("Зубы/область", payload.teethOrArea)}
        ${row("Материал", payload.material)}
        ${row("Цвет и форма", payload.shade)}
        ${row("Источник данных", payload.source)}
        ${row("Срок", payload.deadline)}
        ${row("Ориентировочная стоимость лабораторного этапа", rub(document.totalAmountRub))}
      </table>
      <h2>Технические требования</h2>
      <p>${escapeHtml(payload.technicianNotes ?? "Дополнительные требования не указаны.")}</p>
      ${checkList([
        "контактные пункты, окклюзия, края и требования к препарированию зафиксированы",
        "имплант-платформа, абатмент, тип фиксации и torque указаны, если применимо",
        "фото, карта цвета, сканы и комментарии врача приложены в карте пациента",
        "примерки, коррекции, дата готовности и ответственный техник отслеживаются"
      ])}
      ${signatureBlock("Врач", "Лаборатория")}`;
  }
  return `<h2>Зуботехнический заказ-наряд</h2>
    <table>
      ${row("Тип работы", "коронка / вкладка / винир / мост / съемный протез / капа / элайнер / ретейнер / другое")}
      ${row("Зубы/область", "указать по FDI или сегментам")}
      ${row("Материал", "E.max / цирконий / металлокерамика / композит / PMMA / титан / другое")}
      ${row("Цвет и форма", "VITA shade, индивидуальная карта цвета, фото-протокол")}
      ${row("Основание", "скан / оттиск / прикусной регистрат / фото / КТ / файл STL/PLY/OBJ")}
      ${row("Ориентировочная стоимость лабораторного этапа", rub(document.totalAmountRub))}
    </table>
    <h2>Технические требования</h2>
    ${checkList([
      "указать контактные пункты, окклюзию, межзубные контакты и край препарирования",
      "для имплантов указать систему, платформу, абатмент, винтовую/цементную фиксацию и torque, если применимо",
      "для ортодонтии указать цель, этап, количество кап/ретейнеров и контрольную дату",
      "приложить фото улыбки, шкалу цвета, сканы и комментарии врача",
      "фиксировать примерки, коррекции, срок готовности и ответственного техника"
    ])}
    ${signatureBlock("Врач", "Лаборатория")}`;
}

function visitAttendanceCertificate(document: GeneratedDocument, patient: Patient) {
  const payload = document.payload?.visitAttendanceCertificate as VisitAttendanceCertificatePayload | undefined;
  if (!payload) {
    return `<h2>Справка о посещении врача-стоматолога</h2>
      <p>Документ ожидает структурированные данные о фактическом времени посещения, цели выдачи и подписанте.</p>
      ${signatureBlock("Пациент/получатель", "Врач/администратор")}`;
  }
  return `<h2>Справка о посещении врача-стоматолога</h2>
    <p>Пациент находился на стоматологическом приеме в медицинской организации. Справка подтверждает только факт посещения и не раскрывает диагноз, план лечения или стоимость без отдельного законного основания.</p>
    <table>
      ${row("Пациент", patient.fullName)}
      ${patient.birthDate ? row("Дата рождения", patient.birthDate) : ""}
      ${patientIdentityDocument(patient) ? row("Документ пациента", patientIdentityDocument(patient) ?? "") : ""}
      ${row("Время посещения", `${payload.attendedAtStart} - ${payload.attendedAtEnd}`)}
      ${row("Цель выдачи", payload.purpose)}
      ${present(payload.recipientOrganization) ? row("Куда предъявляется", present(payload.recipientOrganization) ?? "") : ""}
      ${row("Дата выдачи", payload.issuedAt)}
      ${row("Подписант", `${payload.signedByFullName}, ${payload.signedByRole}`)}
      ${row("Ограничение", "не является листком нетрудоспособности и не заменяет медицинское заключение")}
    </table>
    ${checkList([
      "ФИО, дата рождения и документ пациента сверены",
      "указано фактическое время посещения клиники",
      "диагноз, план лечения, снимки и стоимость не раскрыты",
      "при необходимости клиника ставит печать по локальному порядку"
    ])}
    ${signatureBlock("Пациент/получатель", signatureParty(payload.signedByRole, payload.signedByFullName))}`;
}

function warrantyServiceMemo(document: GeneratedDocument) {
  const payload = document.payload?.warrantyServiceMemo as WarrantyServiceMemoPayload | undefined;
  if (payload) {
    return `<h2>Гарантийная памятка по стоматологической работе</h2>
      <div class="notice">
        Памятка фиксирует условия контроля после лечения и границы ответственности клиники по конкретной работе.
        Сроки и условия применяются вместе с договором, актом, медицинскими показаниями и локальным положением клиники.
      </div>
      <table>
        ${row("Работа/услуга", payload.serviceOrWorkName)}
        ${row("Дата завершения", payload.completedAt)}
        ${row("Зубы/область", payload.teethOrArea)}
        ${row("Материалы/системы", payload.materialsOrSystems)}
        ${row("Гарантийный срок/условия", payload.warrantyPeriod)}
        ${row("Контрольные визиты", payload.controlVisitSchedule)}
        ${row("Связанный акт или договор", payload.linkedActOrContract)}
        ${row("Врач", payload.doctorFullName)}
        ${row("Выдано", payload.issuedAt)}
      </table>
      <h2>Что должен соблюдать пациент</h2>
      ${bulletList(payload.patientObligations)}
      <h2>Что требует отдельной оценки</h2>
      ${bulletList(payload.excludedRiskFactors)}
      <h2>Когда связаться с клиникой срочно</h2>
      ${bulletList(payload.urgentContactReasons)}
      ${checkList([
        "условия сверены с локальным гарантийным положением клиники",
        "пациент получил послеоперационные или поствизитные рекомендации",
        "пациент понимает обязательность контрольных визитов и гигиены"
      ])}
      ${signatureBlock("Пациент", signatureParty("Врач", payload.doctorFullName))}`;
  }
  return `<h2>Гарантийная памятка по стоматологической работе</h2>
    <p>Памятка фиксирует условия контроля после лечения и границы ответственности клиники. Конкретные сроки гарантии должны соответствовать локальным правилам клиники, договору и виду работы.</p>
    <table>
      ${row("Работа/услуга", "указать вид лечения, зубы/область, материалы и дату завершения")}
      ${row("Контрольные визиты", "плановые осмотры, профессиональная гигиена, коррекции, снимки по показаниям")}
      ${row("Что сохраняет гарантию", "соблюдение рекомендаций врача, контрольные визиты, гигиена, отсутствие самостоятельных вмешательств")}
      ${row("Что требует отдельной оценки", "травма, бруксизм, перегрузка, новые заболевания, отказ от рекомендованного лечения, нарушение графика контроля")}
    </table>
    ${checkList([
      "вписать точные сроки и условия по локальному положению клиники",
      "отметить материалы, конструкцию, зубы или имплант-систему",
      "объяснить пациенту контрольные визиты и признаки срочного обращения",
      "выдать памятку вместе с актом или финальным этапом лечения"
    ])}
    ${signatureBlock()}`;
}

function paymentRefundCorrectionRequest(document: GeneratedDocument, context: DocumentRenderContext) {
  const payments = paidPaymentsForDocument(document, context);
  const payload = document.payload?.paymentRefundCorrection;
  if (payload) {
    const actionLabels: Record<string, string> = {
      full_refund: "полный возврат",
      partial_refund: "частичный возврат",
      payment_transfer: "перенос оплаты",
      receipt_correction: "коррекция чека",
      payer_details_correction: "коррекция данных плательщика"
    };
    const methodLabels: Record<string, string> = {
      cash: "наличные",
      card: "карта",
      bank_transfer: "банковский перевод",
      internal_offset: "внутренний взаимозачет",
      no_money_movement: "без движения денег"
    };
    return `<h2>Заявление на возврат или коррекцию оплаты</h2>
      <p>Форма фиксирует конкретное бухгалтерское действие и основание. Сумма сверяется с фактической оплатой и фискальным чеком до выдачи.</p>
      <table>
        <tr><th>Дата оплаты</th><th>Способ</th><th>Сумма</th><th>Чек/платеж</th><th>Плательщик</th></tr>
        ${paymentReceiptRows(payments)}
      </table>
      <table>
        ${row("Запрошенное действие", actionLabels[payload.action] ?? payload.action)}
        ${row("Сумма", rub(payload.amountRub))}
        ${row("Основание", payload.reason)}
        ${row("Способ возврата/коррекции", methodLabels[payload.refundMethod] ?? payload.refundMethod)}
        ${row("Получатель", payload.recipientFullName)}
        ${row("Документ получателя", payload.recipientIdentityDocument)}
        ${present(payload.bankDetails) ? row("Банковские реквизиты", present(payload.bankDetails) ?? "") : ""}
        ${row("Исходный фискальный чек", payload.originalFiscalReceiptNumber)}
        ${present(payload.correctionFiscalReceiptNumber) ? row("Корректирующий чек", present(payload.correctionFiscalReceiptNumber) ?? "") : ""}
        ${row("Решение ответственного", payload.accountantDecision)}
      </table>
      ${checkList([
        "личность пациента или плательщика сверена",
        "исходный фискальный чек, кассовая смена и платеж найдены в CRM",
        "сумма не превышает фактическую оплату по выбранному визиту",
        "решение ответственного сотрудника сохранено вместе с документом"
      ])}
      ${signatureBlock("Пациент/плательщик", "Администратор/бухгалтер")}`;
  }
  return `<h2>Заявление на возврат или коррекцию оплаты</h2>
    <p>Форма используется для ошибочной оплаты, частичного возврата, перерасчета или корректировки платежа. Бухгалтерия должна сверить кассу, фискальные чеки и договорные основания перед проведением операции.</p>
    <table>
      <tr><th>Дата оплаты</th><th>Способ</th><th>Сумма</th><th>Чек/платеж</th><th>Плательщик</th></tr>
      ${paymentReceiptRows(payments)}
    </table>
    <table>
      ${row("Запрошенное действие", "возврат / частичный возврат / перенос оплаты / коррекция реквизитов")}
      ${row("Сумма к возврату или коррекции", rub(document.totalAmountRub))}
      ${row("Основание", "заявление пациента/плательщика, кассовая проверка, решение клиники")}
      ${row("Реквизиты для возврата", "заполняются плательщиком и бухгалтерией перед выдачей")}
    </table>
    ${checkList([
      "сверить личность пациента или плательщика",
      "сверить фискальный чек, кассовую смену и платеж в CRM",
      "не проводить возврат по плановой сумме без фактической оплаты",
      "зафиксировать решение ответственного сотрудника и способ возврата"
    ])}
    ${signatureBlock("Пациент/плательщик", "Администратор/бухгалтер")}`;
}

function taxDeductionRegistry(document: GeneratedDocument, context: DocumentRenderContext) {
  const taxPayments = taxPaymentsForDocument(document, context);
  return `<h2>Реестр оплат для налоговой справки КНД 1151156</h2>
    <p>Налоговый период: ${escapeHtml(documentTaxYear(document))}. Суммы ниже должны сверяться с кассовыми и фискальными данными именно за этот год.</p>
    <table>
      <tr><th>Дата оплаты</th><th>Документ/чек</th><th>Код услуги</th><th>Сумма</th></tr>
      ${taxRegistryRows(taxPayments, document)}
    </table>
    ${checkList([
      "сверить все оплаты пациента/плательщика за налоговый период",
      "разделить обычное и дорогостоящее лечение при необходимости",
      "не включать неоплаченные планы лечения",
      "проверить заявление на выдачу справки и ИНН налогоплательщика",
      "использовать реестр как контроль перед выпуском КНД 1151156"
    ])}
    ${signatureBlock("Ответственный администратор", "Бухгалтер/уполномоченное лицо")}`;
}

function patientIntakeQuestionnaire(document: GeneratedDocument) {
  const payload = document.payload?.patientIntakeQuestionnaire;
  if (payload) {
    const pregnancyStatusLabels: Record<string, string> = {
      not_applicable: "не применимо",
      denied: "беременность/лактация со слов пациента отрицается",
      possible: "беременность возможна",
      confirmed: "беременность подтверждена",
      lactation: "лактация",
      unknown: "статус не уточнен"
    };
    return `<h2>Анкета пациента</h2>
      <div class="notice">
        Анкета фиксирует сведения, сообщенные пациентом до приема. Врач использует ее как входные данные для осмотра, но не заменяет ею медицинскую запись и диагноз.
      </div>
      <table>
        ${row("Основная жалоба или цель визита", payload.chiefComplaint)}
        ${row("Аллергии и нежелательные реакции", payload.allergyStatus)}
        ${row("Постоянные препараты", payload.currentMedications)}
        ${row("Хронические заболевания", payload.chronicConditions)}
        ${row("Беременность/лактация", pregnancyStatusLabels[payload.pregnancyStatus] ?? payload.pregnancyStatus)}
        ${row("Антикоагулянты и препараты, влияющие на кровотечение", payload.anticoagulants)}
        ${row("Инфекционные риски", payload.infectiousRiskNotes)}
        ${row("Сердечно-сосудистые, эндокринные и иные риски", payload.cardioEndocrineNotes)}
        ${present(payload.emergencyContact) ? row("Экстренный контакт", present(payload.emergencyContact) ?? "") : ""}
        ${present(payload.additionalNotes) ? row("Дополнительные сведения", present(payload.additionalNotes) ?? "") : ""}
        ${row("Подтверждение пациента", payload.accuracyConfirmed ? "пациент подтверждает достоверность сведений и обязуется сообщать об изменениях" : "не подтверждено")}
      </table>
      ${checkList([
        "администратор сверил ФИО, телефон и дату рождения пациента",
        "врач просмотрел аллергоанамнез, лекарства, хронические заболевания и риски кровотечения до вмешательства",
        "при неясном статусе беременности или системных рисках врач выбирает безопасную тактику или откладывает вмешательство",
        "изменения анкеты сохраняются в карте пациента и учитываются в последующих визитах"
      ])}
      ${signatureBlock("Пациент/законный представитель", "Администратор/врач")}`;
  }
  return `<h2>Анкета пациента</h2>
    <table>
      ${row("Основная жалоба или цель визита", "заполнить со слов пациента")}
      ${row("Аллергии и нежелательные реакции", "заполнить")}
      ${row("Постоянные препараты", "заполнить")}
      ${row("Хронические заболевания", "заполнить")}
      ${row("Беременность/лактация", "уточнить до приема")}
      ${row("Антикоагулянты", "заполнить")}
    </table>
    <p>Пациент подтверждает достоверность сообщенных сведений и обязуется сообщать об изменениях.</p>
    ${signatureBlock("Пациент/законный представитель", "Администратор")}`;
}

const taxFiscalDocumentKinds = new Set<DocumentKind>([
  "tax_deduction_certificate",
  "legacy_tax_deduction_certificate",
  "tax_deduction_registry"
]);

function normalizedTaxpayerIdentityPart(value: string | null | undefined): string {
  return (present(value) ?? "").replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
}

function taxpayerIdentityKey(payment: Payment, patient: Patient): string {
  return [
    normalizedTaxpayerIdentityPart(payerNameForTax(payment, patient)),
    normalizedTaxpayerIdentityPart(payment.payerInn),
    normalizedTaxpayerIdentityPart(payment.payerBirthDate),
    normalizedTaxpayerIdentityPart(payment.payerIdentityDocument),
    normalizedTaxpayerIdentityPart(normalizedTaxpayerRelationship(payment.payerRelationship) ?? payment.payerRelationship)
  ].join("::");
}

function taxDocumentBlockReason(document: GeneratedDocument, patient: Patient, context: DocumentRenderContext): string | null {
  if (!taxFiscalDocumentKinds.has(document.kind)) return null;
  if (!document.taxYear) return "Для налогового документа нужно выбрать налоговый год.";
  if (
    document.kind === "legacy_tax_deduction_certificate" &&
    (document.taxYear < legacyTaxDeductionCertificateMinYear || document.taxYear > legacyTaxDeductionCertificateMaxYear)
  ) {
    return "Старая налоговая справка действует только для оплат 2021-2023; для оплат с 2024 года используйте КНД 1151156.";
  }
  if (document.kind !== "legacy_tax_deduction_certificate" && document.taxYear < taxDeductionCertificateMinYear) {
    return "КНД 1151156 действует только для оплат с 2024 года; для более ранних оплат используйте старую справку.";
  }

  const taxPayments = taxPaymentsForDocument(document, context);
  if (!taxPayments.length) return "Для налогового документа нужен хотя бы один оплаченный платеж за выбранный год.";
  const missingPayerFullName = taxPayments.some((payment) => !present(payment.payerFullName));
  if (missingPayerFullName) return "Налоговый документ требует ФИО плательщика в каждом включенном платеже.";
  const invalidPayerFullName = taxPayments.some((payment) => !hasPersonNameParts(payment.payerFullName));
  if (invalidPayerFullName) return "Налоговый документ требует ФИО плательщика минимум из фамилии и имени.";
  const invalidPayerBirthDate = taxPayments.some((payment) => !isValidDateLike(payment.payerBirthDate));
  if (invalidPayerBirthDate) return "Налоговый документ требует корректную дату рождения плательщика в каждом включенном платеже.";
  const missingPayerIdentifier = taxPayments.some((payment) => !hasTaxPersonIdentifier(payment.payerInn, payment.payerIdentityDocument));
  if (missingPayerIdentifier) {
    return "Налоговый документ требует 12-значный ИНН налогоплательщика либо реквизиты документа личности с датой выдачи в каждом включенном платеже.";
  }
  const missingPayerRelationship = taxPayments.some((payment) => !present(payment.payerRelationship));
  if (missingPayerRelationship) return "Налоговый документ требует родство плательщика с пациентом в каждом включенном платеже.";
  const invalidPayerRelationship = taxPayments.some((payment) => !normalizedTaxpayerRelationship(payment.payerRelationship));
  if (invalidPayerRelationship) {
    return "Налоговый документ поддерживает только отношения: пациент, супруг, родитель, ребенок или подопечный.";
  }
  if (new Set(taxPayments.map((payment) => taxpayerIdentityKey(payment, patient))).size > 1) {
    return "Налоговый документ не может смешивать разных налогоплательщиков; создайте отдельную справку на каждого плательщика.";
  }
  if (document.kind === "tax_deduction_certificate" || document.kind === "tax_deduction_registry") {
    const invalidKndPayerInn = taxPayments.some((payment) => Boolean(present(payment.payerInn)) && digitsOnly(payment.payerInn).length !== 12);
    const explicitDocumentTaxpayerInn = digitsOnly(document.taxPayerInn);
    if (invalidKndPayerInn || (Boolean(present(document.taxPayerInn)) && explicitDocumentTaxpayerInn.length !== 12)) {
      return "КНД 1151156 требует 12-значный ИНН физического лица-налогоплательщика; 10-значный ИНН организации для этой справки/XML не подходит.";
    }
    const nonSelfPayer = taxPayments.some((payment) => normalizedTaxpayerRelationship(payment.payerRelationship) !== "self");
    if (nonSelfPayer) {
      if (!hasPersonNameParts(patient.fullName)) {
        return "Если налогоплательщик и пациент разные, для КНД 1151156 нужно ФИО пациента минимум из фамилии и имени.";
      }
      if (!hasTaxPersonIdentifier(patientTaxpayerInn(patient), patientIdentityDocument(patient))) {
        return "Если налогоплательщик и пациент разные, для КНД 1151156 нужен 12-значный ИНН пациента либо документ личности пациента с датой выдачи.";
      }
      if (!isValidDateLike(patient.birthDate)) {
        return "Если налогоплательщик и пациент разные, для КНД 1151156 нужна корректная дата рождения пациента.";
      }
    }
  }
  if (!hasAllFiscalReceipts(taxPayments)) return "Налоговый документ требует номер фискального чека в каждом включенном платеже.";
  if (!hasAllFiscalReceiptDates(taxPayments)) return "Налоговый документ требует дату фискального чека в каждом включенном платеже.";
  if (taxPayments.some((payment) => !isValidDateLike(payment.fiscalReceiptIssuedAt))) {
    return "Налоговый документ требует корректную дату фискального чека в каждом включенном платеже.";
  }
  if (taxPayments.some((payment) => !hasExplicitTaxDeductionCode(payment))) {
    return "Налоговый документ требует явный код медицинской услуги 1 или 2 в каждом включенном платеже.";
  }
  return null;
}

export function taxFiscalDocumentBlockReason(
  document: GeneratedDocument,
  patient: Patient,
  context: DocumentRenderContext = {}
): string | null {
  const reason = taxDocumentBlockReason(document, patient, context);
  return reason ? repairMojibakeText(reason) : null;
}

export function renderDocumentHtml(document: GeneratedDocument, patient: Patient, context: DocumentRenderContext = {}) {
  const bodyByKind: Record<DocumentKind, string> = {
    paid_medical_services_contract: paidMedicalServicesContract(document, context),
    completed_works_act: completedWorksAct(document, context),
    tax_deduction_certificate: taxDeductionCertificate(document, patient, context),
    informed_consent: informedConsent(document),
    procedure_specific_consent_packet: procedureSpecificConsentPacket(document),
    treatment_plan: treatmentPlan(document),
    treatment_plan_acceptance: treatmentPlanAcceptance(document),
    anesthesia_consent_log: anesthesiaConsentLog(document),
    prescription_medication_order: prescriptionMedicationOrder(document),
    personal_data_processing_consent: personalDataConsent(document, patient),
    minor_legal_representative_consent: minorLegalRepresentativeConsent(document, patient),
    photo_video_consent: photoVideoConsent(document),
    medical_intervention_refusal: medicalInterventionRefusal(document),
    treatment_cost_estimate: treatmentCostEstimate(document, context),
    payment_invoice: paymentInvoice(document, context),
    payment_receipt: paymentReceipt(document, context),
    installment_payment_schedule: installmentPaymentSchedule(document, context),
    post_visit_recommendations: postVisitRecommendations(document),
    medical_record_extract: medicalRecordExtract(document, patient),
    outpatient_medical_card_025u: outpatientMedicalCard025u(document, patient),
    medical_record_copy_request: structuredMedicalRecordCopyRequest(document, patient),
    medical_document_release_receipt: medicalDocumentReleaseReceipt(document, patient),
    xray_cbct_referral: xrayCbctReferral(document),
    lab_work_order: labWorkOrder(document),
    visit_attendance_certificate: visitAttendanceCertificate(document, patient),
    warranty_service_memo: warrantyServiceMemo(document),
    payment_refund_correction_request: paymentRefundCorrectionRequest(document, context),
    tax_deduction_application: taxDeductionApplication(document, patient, context),
    legacy_tax_deduction_certificate: legacyTaxDeductionCertificate(document, patient, context),
    tax_deduction_registry: taxDeductionRegistry(document, context),
    patient_intake_questionnaire: patientIntakeQuestionnaire(document)
  };

  return repairMojibakeText(baseDocument(document.title, patient, document, bodyByKind[document.kind], context));
}

function documentIssueBlockReasonRaw(
  document: GeneratedDocument,
  patient: Patient,
  context: DocumentRenderContext = {}
): string | null {
  if (document.status === "voided") {
    return "Аннулированный документ нельзя выдать.";
  }
  if (document.status === "issued") {
    return null;
  }

  const metadata = documentKindMetadata[document.kind];
  if (metadata.requiresVisit && !document.visitId) {
    return "Документ должен быть связан с конкретным визитом перед выдачей.";
  }

  if (documentRequiresClinicLegalProfile(document.kind)) {
    const missingClinicFields = clinicLegalProfileMissingFields(context.clinicProfile);
    if (missingClinicFields.length) {
      return `Юридический профиль клиники заполнен не полностью: ${missingClinicFields.join(", ")}.`;
    }
  }

  if (treatmentPlanBackedFinancialKinds.has(document.kind) && !financialDocumentTreatmentItems(document, context).length) {
    return "Для выдачи финансового документа нужен состав услуг из плана лечения: услуга, количество, цена, скидка и итоговая сумма.";
  }

  const payloadBlockReason = documentPayloadBlockReason(document);
  if (payloadBlockReason) {
    return payloadBlockReason;
  }
  const completedWorksActFiscalBlockReason = completedWorksActFiscalReceiptBlockReason(document, context);
  if (completedWorksActFiscalBlockReason) {
    return completedWorksActFiscalBlockReason;
  }
  const paymentReceiptSelectionReason = paymentReceiptSelectionBlockReason(document, context);
  if (paymentReceiptSelectionReason) {
    return paymentReceiptSelectionReason;
  }
  const paymentRefundCorrectionFiscalBlockReason = paymentRefundCorrectionFiscalReceiptBlockReason(document, context);
  if (paymentRefundCorrectionFiscalBlockReason) {
    return paymentRefundCorrectionFiscalBlockReason;
  }
  if (
    document.kind === "photo_video_consent" &&
    document.payload?.photoVideoConsent?.recognizablePublicationAllowed &&
    !document.payload.photoVideoConsent.educationUseAllowed &&
    !document.payload.photoVideoConsent.marketingUseAllowed
  ) {
    return "Публикация узнаваемых фото или видео требует отдельного разрешения на обучение или маркетинг.";
  }

  if (metadata.requiresPaidRecord && metadata.group !== "tax") {
    const paidPayments = paidPaymentsForDocument(document, context);
    const paidTotalRub = paidPayments.reduce((total, payment) => total + payment.amountRub, 0);
    const refundPayload = document.payload?.paymentRefundCorrection;
    if (!paidPayments.length) {
      return "Для этого документа нужен хотя бы один сохраненный оплаченный платеж в выбранном визите или документе.";
    }
    if (document.kind === "payment_refund_correction_request" && refundPayload && refundPayload.amountRub > paidTotalRub) {
      return "Сумма возврата или коррекции не может превышать фактически оплаченную сумму по выбранному визиту.";
    }
    if (
      (document.kind === "payment_receipt" || document.kind === "payment_refund_correction_request") &&
      !hasAllFiscalReceipts(paidPayments)
    ) {
      return "Платежный документ требует номер фискального чека в каждом включенном платеже.";
    }
    if (
      (document.kind === "payment_receipt" || document.kind === "payment_refund_correction_request") &&
      !hasAllFiscalReceiptDates(paidPayments)
    ) {
      return "Платежный документ требует дату фискального чека в каждом включенном платеже.";
    }
    if (document.kind === "payment_refund_correction_request" && !hasAllPaymentPayerIdentities(paidPayments)) {
      return "Платежный документ требует ФИО, дату рождения, ИНН, документ удостоверения личности и связь плательщика с пациентом в каждом включенном платеже.";
    }
  }

  const taxBlockReason = taxDocumentBlockReason(document, patient, context);
  if (taxBlockReason) return taxBlockReason;

  const html = renderDocumentHtml(document, patient, context);
  if (documentHasUnresolvedPlaceholders(html)) {
    return "В документе остались незаполненные поля; перед выдачей их нужно заполнить.";
  }

  return null;
}

export function documentIssueBlockReason(
  document: GeneratedDocument,
  patient: Patient,
  context: DocumentRenderContext = {}
): string | null {
  const reason = documentIssueBlockReasonRaw(document, patient, context);
  return reason ? repairMojibakeText(reason) : null;
}
