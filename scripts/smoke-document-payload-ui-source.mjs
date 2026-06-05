import fs from "node:fs";

const source = [
  fs.readFileSync("apps/web/src/App.tsx", "utf8"),
  fs.readFileSync("apps/web/src/DocumentsView.tsx", "utf8"),
  fs.readFileSync("apps/web/src/CommunicationsView.tsx", "utf8"),
  fs.readFileSync("apps/web/src/communicationTaskData.ts", "utf8"),
  fs.readFileSync("apps/web/src/postVisitCareData.ts", "utf8"),
  fs.readFileSync("apps/web/src/workspaceUiLabels.ts", "utf8")
].join("\n");

const requiredSnippets = [
  "type DocumentPayload",
  "type DocumentAuditFacts",
  "structuredPayloadDocumentKinds",
  "validateDocumentPayloadForKind(kind)",
  "documentPayloadForKind(kind)",
  "selectedDocumentKind",
  "normalizedDocumentKind",
  "normalizedPatientIntakePregnancyStatus",
  "normalizedTaxApplicationRelationshipSelect",
  "normalizedTaxApplicationForm",
  "normalizedTaxApplicationDeliveryChannel",
  "normalizedProcedureSpecificConsentProcedure",
  "normalizedTreatmentPlanAcceptanceVariant",
  "normalizedPostVisitCareTopic",
  "normalizedXrayStudyType",
  "normalizedXrayPriority",
  "normalizedXrayPregnancyStatus",
  "normalizedOutpatient025uDemographicCode",
  "normalizedMedicalDocumentReleaseChannel",
  "normalizedPaymentRefundCorrectionAction",
  "normalizedPaymentRefundCorrectionMethod",
  "normalizedDocumentVoidReasonCode",
  "CommunicationTaskWorkflowCode",
  "telegramDocumentRequestTaskDocumentKinds",
  "telegramCareRequestTaskCareTopics",
  "telegramDocumentRequestWorkflowDocumentKinds",
  "telegramCareRequestWorkflowCareTopics",
  "task.workflowCode ? telegramDocumentRequestWorkflowDocumentKinds[task.workflowCode] : null",
  "\"Пациент запросил налоговые документы\": [",
  "\"tax_deduction_certificate\"",
  "\"legacy_tax_deduction_certificate\"",
  "\"tax_deduction_registry\"",
  "\"Пациент запросил финансовые документы\": [",
  "\"payment_receipt\"",
  "\"payment_refund_correction_request\"",
  "telegram_billing_document_request",
  "\"Пациент запросил медицинские документы\": [",
  "\"medical_record_copy_request\"",
  "\"medical_document_release_receipt\"",
  "\"visit_attendance_certificate\"",
  "\"Пациент запросил формы и согласия\": [",
  "\"personal_data_processing_consent\"",
  "\"procedure_specific_consent_packet\"",
  "\"medical_intervention_refusal\"",
  "\"minor_legal_representative_consent\"",
  "\"Пациент запросил памятку после удаления\"",
  "\"Пациент запросил памятку после имплантации\"",
  "telegram_care_endo_request: \"endo\"",
  "telegram_care_surgery_request: \"surgery\"",
  "telegram_care_anesthesia_request: \"local_anesthesia\"",
  "telegram_care_prosthetics_request: \"prosthetics\"",
  "telegram_care_orthodontics_request: \"orthodontics\"",
  "telegram_care_periodontology_request: \"periodontology\"",
  "post_visit_recommendations: \"Подготовить памятку\"",
  "communicationDocumentTaskActionLabels",
  "medical_intervention_refusal: \"Отказ\"",
  "documentKindsForCommunicationTask(task)",
  "documentKinds.map",
  "openCommunicationTaskDocumentWorkflow",
  "setSelectedDocumentKind(kind)",
  "setSelectedPatientId(task.patientId)",
  "window.location.hash = \"documents\"",
  "communicationDocumentTaskActionLabels[kind] ?? documentLabels[kind]",
  "documentSourceStatusLabels",
  "documentSourceStatusClassNames",
  "document-source-card",
  "document-source-links",
  "typedSelectedDocumentMetadata.sourceUrls.map",
  "documentAuditFacts.sourceUrls.map",
  "Контрольная метка",
  "Официальные источники формы",
  "Официальные источники паспорта документа",
  "document-factory-kind-button",
  "documentKindMetadata[document.kind].sourceStatus",
  "Создать выбранный документ",
  "selectedDocumentCreateGuidanceId",
  "selectedDocumentNeedsPayload",
  "aria-describedby={selectedDocumentCreateGuidanceId}",
  "Перед созданием CRM проверит обязательные поля этой формы",
  "documentAuditFacts",
  "documentAuditFactsLoadingId",
  "documentIssueSignatureStorageKey",
  "documentIssueSignatureLocalKey",
  "documentIssueSignatureModeLabels",
  "initialUiPreferences.documentIssueSignatureMode",
  "initialUiPreferences.documentIssueStaffFullName",
  "initialUiPreferences.documentIssueStaffRole",
  "loadDocumentIssueSignatureDraft(organizationId",
  "saveDocumentIssueSignatureDraft(\n      dashboard?.clinicSettings.profile.organizationId ?? null",
  "setDocumentIssueSignatureMode(normalizedDocumentIssueSignatureMode(event.target.value))",
  "documentIssueAttestationReady",
  "documentIssueIdentityChecked",
  "documentIssueDocumentOpenedAndChecked",
  "documentIssueRecipientSigned",
  "documentIssueClinicSigned",
  "signatureAttestation",
  "voidAttestation",
  "documentVoidReasonLabels",
  "documentVoidReady",
  "requestDocumentVoid(document)",
  "confirmDocumentVoid()",
  "releaseJournalEntry",
  "sourceSnapshotSha256",
  "loadDocumentAuditFacts(document.id)",
  "/api/documents/${documentId}/audit-facts",
  "issuedDocumentHtmlDownloadUrl(documentId)",
  "/api/documents/${documentId}/pdf",
  "downloadIssuedDocumentHtml(document.id)",
  "downloadIssuedDocumentPdf(document.id)",
  "Паспорт",
  "Скачать HTML",
  "Скачать PDF",
  "Паспорт выдачи",
  "payloadForDocument",
  "...(documentPayload ?? {})",
  "taxPaymentSelection",
  "taxApplicationForm === \"knd_1151156\" && normalizedInn && normalizedInn.length !== 12",
  "12 цифр, если есть",
  "paid_medical_services_contract",
  "completed_works_act",
  "payment_invoice",
  "payment_receipt",
  "installment_payment_schedule",
  "patient_intake_questionnaire",
  "tax_deduction_application",
  "anesthesia_consent_log",
  "prescription_medication_order",
  "lab_work_order",
  "photo_video_consent",
  "xray_cbct_referral",
  "outpatient_medical_card_025u",
  "medical_record_extract",
  "medical_record_copy_request",
  "post_visit_recommendations",
  "treatment_plan",
  "treatment_plan_acceptance",
  "visit_attendance_certificate",
  "medical_document_release_receipt",
  "payment_refund_correction_request",
  "informed_consent",
  "procedure_specific_consent_packet",
  "personal_data_processing_consent",
  "medical_intervention_refusal",
  "informedConsent",
  "informedConsentIntervention",
  "informedConsentRisks",
  "informedConsentAlternatives",
  "informedConsentQuestionsAnswered",
  "informedConsentRisksUnderstood",
  "informedConsentWithdrawUnderstood",
  "procedureSpecificConsent",
  "procedureConsentProcedureType",
  "procedureSpecificConsentProcedureOptions",
  "procedureConsentSpecificRisks",
  "procedureConsentLocalFormAttached",
  "procedureConsentQuestionsAnswered",
  "procedureConsentExactProcedureConfirmed",
  "procedureConsentRisksUnderstood",
  "clinicalToothRowsText",
  "clinicalToothRowsValue",
  "Клинические строки по зубам и сегментам",
  "anesthesiaMethod",
  "anesthesiaRisksExplained",
  "anesthesiaAllergyRestrictionsChecked",
  "anesthesiaConsentConfirmed",
  "prescriptionMedication",
  "labWorkType",
  "photoVideoConsent",
  "photoVideoMaterials",
  "photoVideoMaterialOptions",
  "photoVideoClinicalRecordUseConfirmed",
  "photoVideoAnonymizationConfirmed",
  "xrayCbctReferral",
  "xrayStudyTypeOptions",
  "xrayClinicalQuestion",
  "xrayIncludeDicomExport",
  "outpatientMedicalCard025u",
  "outpatient025uMedicalCardNumber",
  "outpatient025uSourceVisitIdsValue",
  "outpatient025uPayloadValue",
  "outpatient025uOfficialForm274nChecked",
  "outpatient025uThirdPartyDataChecked",
  "Структура сверена с приказом Минздрава России от 13.05.2025 N 274н",
  "medicalRecordExtract",
  "recordExtractDiagnosis",
  "recordExtractPreparedFromSignedRecords",
  "medicalRecordCopyRequest",
  "copyRequestDocumentTypes",
  "copyRequestIdentityVerified",
  "postVisitRecommendations",
  "Telegram-бота клиники",
  "postVisitCareTopicOptions",
  "postVisitCarePresets",
  "applyPostVisitCarePreset",
  "changePostVisitCareTopic",
  "postVisitManualEdited",
  "Подставить памятку для темы",
  "Памятка после удаления готова",
  "Памятка после имплантации готова",
  "Памятка после пломбы или реставрации готова",
  "postVisitTelegramSummary",
  "treatmentPlan",
  "treatmentPlanStages",
  "treatmentPlanQuestionsAnswered",
  "treatmentPlanAcceptance",
  "treatmentAcceptanceStages",
  "treatmentAcceptanceQuestionsAnswered",
  "visitAttendanceCertificate",
  "attendanceStartedAt",
  "attendanceDiagnosisDisclosureExcluded",
  "releaseSourceRequestDocumentId",
  "issuedMedicalCopyRequestDocuments",
  "releaseSourceRequestAutofillRef",
  "chainSummary?.medicalRecordCopyRequest",
  "метки подписанных визитов, по одной в строке",
  "метки визитов или номера записей, по одной в строке",
  "Расписка будет привязана к выбранному запросу.",
  "setReleaseRecipientFullName(request.recipientFullName)",
  "setReleaseRecipientIdentityDocument(request.recipientIdentityDocument)",
  "setReleaseChannel(request.requestedFormat)",
  "setReleaseDocumentTypes(request.requestedDocumentTypes.join(\"\\n\"))",
  "releaseRecipientFullName",
  "refundOriginalFiscalReceiptNumber",
  "номер чека или данные фискального чека",
  "refundAccountantDecision",
  "personalDataProcessingConsent",
  "personalDataPurposes",
  "personalDataTransferRules",
  "personalDataVoluntaryConsentConfirmed",
  "personalDataMedicalProcessingAcknowledged",
  "medicalInterventionRefusal",
  "refusalIntervention",
  "refusalExplainedRisks",
  "refusalConsequencesUnderstood",
  "refusalSecondOpinionOffered",
  "refusalEmergencyCareExplained",
  "completedWorksAct",
  "linkedContractDocumentId",
  "completedActContractReferenceForUi",
  "chainSummary?.paidMedicalServicesContract",
  "activeIssuedPaidContracts",
  "selectedCompletedActContractDocumentId",
  "completedActNumber",
  "completedActFiscalReceiptsVerified",
  "treatment_cost_estimate",
  "treatmentCostEstimate",
  "treatmentEstimateNumber",
  "treatmentEstimateChangeRulesConfirmed",
  "paidMedicalServicesContract",
  "paidContractNumber",
  "paidContractCustomerFullNameValue",
  "customerFullName: paidContractCustomerFullNameValue()",
  "paidContractWrittenChangesConfirmed",
  "paymentInvoice",
  "paymentInvoiceNumber",
  "paymentInvoiceFiscalNoticeConfirmed",
  "необязательно: данные СБП или платежная ссылка",
  "paymentReceipt",
  "selectedPaymentReceiptIds",
  "documentPaymentSelectionStorageKey",
  "documentPaymentSelectionLocalKey",
  "loadDocumentPaymentSelection(",
  "saveDocumentPaymentSelection(",
  "documentPayloadDraftStorageKey",
  "documentPayloadDraftLocalKey",
  "type Outpatient025uDocumentDraftFields",
  "type MedicalRecordExtractDocumentDraftFields",
  "recordExtractPreparedFromSignedRecords: boolean;",
  "recordExtractRecipientFullName: string;",
  "recordExtractRecipientAuthority: string;",
  "recordExtractIssuedAt: string;",
  "recordExtractThirdPartyDataChecked: boolean;",
  "outpatient025uOfficialForm274nChecked: boolean;",
  "outpatient025uThirdPartyDataChecked: boolean;",
  "recordExtractPreparedFromSignedRecords: candidate.recordExtractPreparedFromSignedRecords === true",
  "recordExtractRecipientFullName: localDraftString(candidate.recordExtractRecipientFullName, 240)",
  "recordExtractRecipientAuthority: localDraftString(candidate.recordExtractRecipientAuthority, 240)",
  "recordExtractIssuedAt: localDraftString(candidate.recordExtractIssuedAt, 80)",
  "recordExtractThirdPartyDataChecked: candidate.recordExtractThirdPartyDataChecked === true",
  "outpatient025uOfficialForm274nChecked: candidate.outpatient025uOfficialForm274nChecked === true",
  "outpatient025uThirdPartyDataChecked: candidate.outpatient025uThirdPartyDataChecked === true",
  "documentPayloadDraftKey(\n        \"outpatient_medical_card_025u\",\n        documentLocalPersistenceOrganizationId",
  "documentPayloadDraftKey(\n        \"medical_record_extract\",\n        documentLocalPersistenceOrganizationId",
  "loadOutpatient025uDocumentDraft(",
  "saveOutpatient025uDocumentDraft(",
  "loadMedicalRecordExtractDocumentDraft(",
  "saveMedicalRecordExtractDocumentDraft(",
  "loadDocumentPaymentSelection(documentLocalPersistenceOrganizationId, taxPaymentSelectionPersistenceKey)",
  "saveDocumentPaymentSelection(\n      documentLocalPersistenceOrganizationId,",
  "loadOutpatient025uDocumentDraft(documentLocalPersistenceOrganizationId, outpatient025uDraftPersistenceKey)",
  "saveOutpatient025uDocumentDraft(\n      documentLocalPersistenceOrganizationId,",
  "loadMedicalRecordExtractDocumentDraft(\n      documentLocalPersistenceOrganizationId,",
  "saveMedicalRecordExtractDocumentDraft(\n      documentLocalPersistenceOrganizationId,",
  "outpatient025uDraftPersistenceKey",
  "outpatient025uDraftHydratedKeyRef",
  "medicalRecordExtractDraftPersistenceKey",
  "medicalRecordExtractDraftHydratedKeyRef",
  "applyOutpatient025uDocumentDraftFields(",
  "currentOutpatient025uDocumentDraftFields()",
  "applyMedicalRecordExtractDocumentDraftFields(",
  "currentMedicalRecordExtractDocumentDraftFields()",
  "setRecordExtractPreparedFromSignedRecords(fields.recordExtractPreparedFromSignedRecords)",
  "setRecordExtractRecipientFullName(fields.recordExtractRecipientFullName)",
  "setRecordExtractRecipientAuthority(fields.recordExtractRecipientAuthority)",
  "setRecordExtractIssuedAt(fields.recordExtractIssuedAt)",
  "setRecordExtractThirdPartyDataChecked(fields.recordExtractThirdPartyDataChecked)",
  "setOutpatient025uOfficialForm274nChecked(fields.outpatient025uOfficialForm274nChecked)",
  "setOutpatient025uThirdPartyDataChecked(fields.outpatient025uThirdPartyDataChecked)",
  "taxPaymentSelectionPersistenceKey",
  "paymentReceiptSelectionPersistenceKey",
  "taxPaymentSelectionHydratedKeyRef",
  "paymentReceiptSelectionHydratedKeyRef",
  "paymentReceiptNumber",
  "paymentReceiptTaxSupportRequested",
  "taxSupportRequested",
  "Нужна налоговая опора",
  "paymentReceiptPaymentsVerified",
  "paymentReceiptPayerVerified",
  "paymentReceiptFiscalNoticeConfirmed",
  "installmentPaymentSchedule",
  "installmentScheduleNumber",
  "installmentPaymentStatusAliases",
  "запланировано / оплачено / просрочено / перенесено / отменено",
  "installmentScheduleWrittenChangesConfirmed",
  "minor_legal_representative_consent",
  "minorLegalRepresentativeConsent",
  "minorRepresentativeFullName",
  "minorConsentIdentityVerified",
  "minorConsentAuthorityVerified",
  "minorConsentExplained",
  "minorConsentStored",
  "minorConsentAgeExplanation",
  "warranty_service_memo",
  "warrantyServiceMemo",
  "warrantyServiceOrWorkName",
  "warrantyControlVisitsUnderstood",
  "document-payload-forms",
  "intakeChiefComplaint",
  "intakeAccuracyConfirmed",
  "patientIntakePregnancyStatusOptions",
  "patientIntakeQuestionnaire",
  "taxApplicationTaxpayerFullName",
  "isDateInputValue(taxApplicationTaxpayerBirthDate)",
  "isDateTimeLocalInputValue(taxApplicationRequestedAt)",
  "fromDateTimeLocalValue(taxApplicationRequestedAt)",
  "setTaxApplicationAuthorityDocument(\"\")",
  "taxApplicationDuplicateWarningAccepted",
  "taxApplicationRelationshipOptions",
  "taxDeductionApplication",
  "documentPatient",
  "documentPatientMatchesActiveVisit",
  "patientId: documentPatient.id",
  "useState<\"\" | \"1\" | \"2\">(\"\")",
  "taxDeductionCode: paymentTaxDeductionCode || null",
  "Не выбран"
];

const missing = requiredSnippets.filter((snippet) => !source.includes(snippet));

const createDocumentBlock = /async function createDocument\(kind: GeneratedDocument\["kind"\]\) \{[\s\S]*?const response = await fetch\("\/api\/documents"/.exec(
  source
)?.[0] ?? "";
const fullCreateDocumentBlock = /async function createDocument\(kind: GeneratedDocument\["kind"\]\) \{[\s\S]*?\n  async function updateDocumentStatus/.exec(
  source
)?.[0] ?? "";

if (!createDocumentBlock.includes("validateDocumentPayloadForKind(kind)")) {
  missing.push("createDocument payload validation before fetch");
}

if (!createDocumentBlock.includes("documentPayloadForKind(kind)")) {
  missing.push("createDocument payload builder before fetch");
}
if (!createDocumentBlock.includes("documentPatientMatchesActiveVisit")) {
  missing.push("createDocument does not block active-visit documents for a different selected patient");
}
if (!source.includes("patientId: documentPatient.id")) {
  missing.push("createDocument must use selected/document patient instead of active visit patient");
}
if (fullCreateDocumentBlock.includes("patientId: activePatient.id")) {
  missing.push("createDocument still posts documents for activePatient.id");
}
if (source.includes("setSelectedTaxPaymentIds(eligibleTaxPayments.map")) {
  missing.push("tax document UI must not auto-select all eligible fiscal receipts");
}
if (source.includes("setSelectedPaymentReceiptIds(eligiblePaymentReceiptPayments.map((payment) => payment.id));")) {
  missing.push("payment receipt selection must not reset to all eligible payments after reload");
}
if (!source.includes("selectedTaxPaymentIdsForCurrentDocument()")) {
  missing.push("tax application/certificate/registry must use one explicit selected fiscal receipt source");
}
if (source.includes("selectedPaymentIds: selectedEligibleTaxPayments.map")) {
  missing.push("tax application payload must not use broad eligible payment mapping");
}
if (source.includes("? { taxPaymentSelection: { selectedPaymentIds: selectedTaxPaymentIdsForDocument } }")) {
  missing.push("tax payment payload must merge with structured document payload instead of replacing it");
}
if (!source.includes("selectedPaymentIds: refundSelectedPaymentId ? [refundSelectedPaymentId] : []")) {
  missing.push("refund/correction payload must persist explicit selected source payment ids");
}
if (!source.includes("selectRefundOriginalPayment") || !source.includes("eligibleRefundCorrectionPayments")) {
  missing.push("refund/correction UI must choose an eligible paid fiscal receipt before creating payload");
}
if (!source.includes("tax:${organizationId}:") || !source.includes("receipt:${organizationId}:")) {
  missing.push("saved payment selections must be scoped by clinic organization id");
}
if (source.includes("loadDocumentPaymentSelection(taxPaymentSelectionPersistenceKey)") ||
    source.includes("loadDocumentPaymentSelection(paymentReceiptSelectionPersistenceKey)") ||
    source.includes("saveDocumentPaymentSelection(taxPaymentSelectionPersistenceKey") ||
    source.includes("saveDocumentPaymentSelection(paymentReceiptSelectionPersistenceKey")) {
  missing.push("document payment local recovery must pass clinic organization id into load/save");
}
if (source.includes("loadOutpatient025uDocumentDraft(outpatient025uDraftPersistenceKey)") ||
    source.includes("saveOutpatient025uDocumentDraft(outpatient025uDraftPersistenceKey")) {
  missing.push("025/u payload drafts must pass clinic organization id into load/save");
}
if (source.includes("loadMedicalRecordExtractDocumentDraft(medicalRecordExtractDraftPersistenceKey)") ||
    source.includes("saveMedicalRecordExtractDocumentDraft(medicalRecordExtractDraftPersistenceKey")) {
  missing.push("medical record extract payload drafts must pass clinic organization id into load/save");
}
if (source.includes("window.localStorage.setItem(\n      documentPaymentSelectionStorageKey") ||
    source.includes("window.localStorage.setItem(\n      documentPayloadDraftStorageKey")) {
  missing.push("document local recovery stores must write to clinic-scoped localStorage keys");
}
if (source.includes("firstPaymentReceiptPayment()?.payerBirthDate?.trim() || toDateInputValue(documentPatient?.birthDate)")) {
  missing.push("payment receipt must not fall back to patient birth date for payer tax facts");
}
if (source.includes("firstPaymentReceiptPayment()?.payerInn?.trim() || documentPatient?.administrativeProfile?.taxpayerInn")) {
  missing.push("payment receipt must not fall back to patient INN for payer tax facts");
}
if (source.includes('updateDocumentStatus(document.id, "void")')) {
  missing.push("document list must open structured void confirmation instead of direct void status mutation");
}
if (!source.includes("satisfies VoidDocumentInput")) {
  missing.push("document void UI must submit shared VoidDocumentInput payload");
}
if (source.includes("payload СБП")) {
  missing.push("payment invoice QR field must use staff-facing wording, not raw payload jargon");
}
if (source.includes("Telegram-бота DENTE")) {
  missing.push("post-visit recommendation helper must use clinic-facing wording, not internal DENTE wording");
}
if (source.includes("ID подписанных визитов, по одному в строке")) {
  missing.push("medical record extract must not ask administrators for internal visit IDs");
}
if (source.includes("ID визитов или номера записей, по одному в строке")) {
  missing.push("medical copy request must not ask administrators for internal visit IDs");
}
if (source.includes("привязана к нему по ID")) {
  missing.push("medical release receipt must not explain source request binding through internal IDs");
}
if (source.includes('paymentFiscalReceiptNumber || "ФН/ФД/ФП"')) {
  missing.push("refund correction receipt placeholder must not expose unexplained fiscal abbreviations");
}
if (source.includes("<span>sha256</span>")) {
  missing.push("document audit passport must use operator wording instead of raw hash labels");
}

if (!source.includes("documentPayloadSchema") && !source.includes("DocumentPayload")) {
  missing.push("shared document payload type is not referenced");
}

const hiddenDocumentPayloadCards = source.match(/className="document-payload-card" hidden=\{selectedDocumentKind !==/g) ?? [];
const documentPayloadCardCount = (source.match(/className="document-payload-card"/g) ?? []).length;
const conditionallyMountedPayloadCardCount = (source.match(/\{selectedDocumentKind === "[^"]+" \? \(\s+<article className="document-payload-card">/g) ?? []).length;
if (hiddenDocumentPayloadCards.length) {
  missing.push("document payload cards must be conditionally mounted instead of rendered as hidden DOM");
}
if (documentPayloadCardCount < 28 || conditionallyMountedPayloadCardCount !== documentPayloadCardCount) {
  missing.push("every structured document payload card must be mounted only for the selected document kind");
}

const communicationDocumentWorkflowBlock = /function openCommunicationTaskDocumentWorkflow\([\s\S]*?\n  \}/.exec(source)?.[0] ?? "";
if (!communicationDocumentWorkflowBlock.includes("setSelectedDocumentKind(kind)")) {
  missing.push("communication document workflow does not preselect document kind");
}
if (!communicationDocumentWorkflowBlock.includes('window.location.hash = "documents"')) {
  missing.push("communication document workflow does not navigate to documents");
}
if (!communicationDocumentWorkflowBlock.includes("changePostVisitCareTopic(careTopic)")) {
  missing.push("communication care workflow does not preselect Telegram care topic");
}
if (!communicationDocumentWorkflowBlock.includes("telegramCareRequestWorkflowCareTopics[task.workflowCode]")) {
  missing.push("communication care workflow still does not use stable Telegram workflowCode");
}
if (communicationDocumentWorkflowBlock.includes("createDocument(")) {
  missing.push("communication document workflow must not auto-create documents");
}

if (missing.length) {
  console.error(JSON.stringify({ ok: false, missing }, null, 2));
  process.exit(1);
}

const forbiddenDocumentSelectCasts = [
  "setSelectedDocumentKind(event.target.value as GeneratedDocument",
  "setIntakePregnancyStatus(event.target.value as PatientIntakePregnancyStatus)",
  "event.target.value as TaxDeductionApplicationRelationship",
  "setTaxApplicationForm(event.target.value as TaxDeductionApplicationForm)",
  "setTaxApplicationDeliveryChannel(event.target.value as TaxDeductionApplicationDeliveryChannel)",
  "setProcedureConsentProcedureType(event.target.value as ProcedureSpecificConsentProcedure)",
  "setTreatmentAcceptanceVariant(event.target.value as TreatmentPlanAcceptanceVariant)",
  "changePostVisitCareTopic(event.target.value as PostVisitCareTopic)",
  "setXrayStudyType(event.target.value as XrayCbctReferralStudyType)",
  "setXrayPriority(event.target.value as XrayCbctReferralPriority)",
  "setXrayPregnancyStatus(event.target.value as XrayCbctReferralPregnancyStatus)",
  'setOutpatient025uPatientSexCode(event.target.value as "1" | "2" | "unknown")',
  'setOutpatient025uRegistrationUrbanRuralCode(event.target.value as "1" | "2" | "unknown")',
  'setOutpatient025uStayUrbanRuralCode(event.target.value as "1" | "2" | "unknown")',
  "setCopyRequestFormat(event.target.value as MedicalDocumentReleaseChannel)",
  "setReleaseChannel(event.target.value as MedicalDocumentReleaseChannel)",
  "setRefundAction(event.target.value as PaymentRefundCorrectionAction)",
  "setRefundMethod(event.target.value as PaymentRefundCorrectionMethod)",
  "setDocumentVoidReasonCode(event.target.value as DocumentVoidReasonCode)"
];

for (const forbiddenCast of forbiddenDocumentSelectCasts) {
  if (source.includes(forbiddenCast)) {
    console.error(JSON.stringify({ ok: false, forbiddenCast }, null, 2));
    process.exit(1);
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "document payload UI source",
      requiredStructuredKinds: [
        "paid_medical_services_contract",
        "completed_works_act",
        "treatment_cost_estimate",
        "payment_invoice",
        "payment_receipt",
        "installment_payment_schedule",
        "minor_legal_representative_consent",
        "warranty_service_memo",
        "patient_intake_questionnaire",
        "tax_deduction_application",
        "anesthesia_consent_log",
        "prescription_medication_order",
        "lab_work_order",
        "photo_video_consent",
        "xray_cbct_referral",
        "outpatient_medical_card_025u",
        "medical_record_extract",
        "medical_record_copy_request",
        "post_visit_recommendations",
        "treatment_plan",
        "treatment_plan_acceptance",
        "visit_attendance_certificate",
        "medical_document_release_receipt",
        "payment_refund_correction_request",
        "informed_consent",
        "procedure_specific_consent_packet",
        "personal_data_processing_consent",
        "medical_intervention_refusal"
      ]
    },
    null,
    2
  )
);
