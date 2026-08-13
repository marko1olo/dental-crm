import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import {
	appLogicSourceFiles,
	readAppLogicSourceSync,
} from "./lib/app-logic-source.mjs";

/**
 * Формы документов больше не живут одним файлом: семь из них вынесены в
 * apps/web/src/components/documents/**. Проверка читала только DocumentsView.tsx
 * и поэтому объявляла пропавшей подсказку «12 цифр, если есть» — текст никуда не
 * делся, он ПЕРЕЕХАЛ. Такое падение опаснее, чем кажется: в красной проверке не
 * видно настоящей регрессии. Каталог читается целиком, а не поимённо, чтобы
 * следующий вынесенный файл не ронял проверку заново.
 */
function documentComponentSources(directory) {
	const collected = [];
	let entries = [];
	try {
		entries = fs.readdirSync(directory, { withFileTypes: true });
	} catch {
		return collected;
	}
	for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
		const full = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			collected.push(...documentComponentSources(full));
			continue;
		}
		if (full.endsWith(".tsx") || full.endsWith(".ts")) {
			collected.push(fs.readFileSync(full, "utf8"));
		}
	}
	return collected;
}

/*
 * ТРИ ФАЙЛА, КОТОРЫХ ЗДЕСЬ НЕ ХВАТАЛО. Из 49 пропавших игл 20 обнаружились
 * целыми в файлах, которые проверка просто не читала:
 *
 *   documentLogic.ts       — сборщик содержимого документа. Из useAppLogic сюда
 *                            вынесены documentPayloadForKind и
 *                            validateDocumentPayloadForKind вместе с телами всех
 *                            структурных видов (xrayCbctReferral,
 *                            outpatientMedicalCard025u, completedWorksAct,
 *                            treatmentCostEstimate, taxDeductionApplication …).
 *   documentValidators.ts  — проверки обязательных полей форм.
 *   AppHelpers.tsx         — локальное восстановление черновиков (loadDraft/
 *                            saveDraft, normalizeOutpatient025uDocumentDraftFields).
 *
 * Ни одна из этих 20 игл не описывала пропавшее поведение — они описывали
 * поведение, которое ПЕРЕЕХАЛО. Красная проверка на живом коде хуже отсутствующей:
 * в её красноте не видно настоящей регрессии.
 */
const source = [
	fs.readFileSync("apps/web/src/App.tsx", "utf8"),
	readAppLogicSourceSync(),
	fs.readFileSync("apps/web/src/AppHelpers.tsx", "utf8"),
	fs.readFileSync("apps/web/src/documentLogic.ts", "utf8"),
	fs.readFileSync("apps/web/src/documentValidators.ts", "utf8"),
	fs.readFileSync("apps/web/src/DocumentsView.tsx", "utf8"),
	...documentComponentSources("apps/web/src/components/documents"),
	fs.readFileSync("apps/web/src/store/documentStore.ts", "utf8"),
	fs.readFileSync("apps/web/src/CommunicationsView.tsx", "utf8"),
	fs.readFileSync("apps/web/src/communicationTaskData.ts", "utf8"),
	fs.readFileSync("apps/web/src/postVisitCareData.ts", "utf8"),
	fs.readFileSync("apps/web/src/workspaceUiLabels.ts", "utf8"),
].join("\n");

const requiredSnippets = [
	"type DocumentPayload",
	"type DocumentAuditFacts",
	"structuredPayloadDocumentKinds",
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
	'"Пациент запросил налоговые документы": [',
	'"tax_deduction_certificate"',
	'"legacy_tax_deduction_certificate"',
	'"tax_deduction_registry"',
	'"Пациент запросил финансовые документы": [',
	'"payment_receipt"',
	'"payment_refund_correction_request"',
	"telegram_billing_document_request",
	'"Пациент запросил медицинские документы": [',
	'"medical_record_copy_request"',
	'"medical_document_release_receipt"',
	'"visit_attendance_certificate"',
	'"Пациент запросил формы и согласия": [',
	'"personal_data_processing_consent"',
	'"procedure_specific_consent_packet"',
	'"medical_intervention_refusal"',
	'"minor_legal_representative_consent"',
	'"Пациент запросил памятку после удаления"',
	'"Пациент запросил памятку после имплантации"',
	'telegram_care_endo_request: "endo"',
	'telegram_care_surgery_request: "surgery"',
	'telegram_care_anesthesia_request: "local_anesthesia"',
	'telegram_care_prosthetics_request: "prosthetics"',
	'telegram_care_orthodontics_request: "orthodontics"',
	'telegram_care_periodontology_request: "periodontology"',
	'post_visit_recommendations: "Подготовить памятку"',
	"communicationDocumentTaskActionLabels",
	'medical_intervention_refusal: "Отказ"',
	"documentKindsForCommunicationTask(task)",
	"documentKinds.map",
	"openCommunicationTaskDocumentWorkflow",
	"setSelectedDocumentKind(kind)",
	"setSelectedPatientId(task.patientId)",
	'window.location.hash = "documents"',
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
	/*
	 * СНЯТА ИГЛА «Перед созданием CRM проверит обязательные поля этой формы».
	 *
	 * Это было требование ВЕРНУТЬ УЖЕ ПОЧИНЕННЫЙ ДЕФЕКТ. Текст убран намеренно, и
	 * причина записана рядом с местом правки — DocumentsView.tsx:1161:
	 *   «Было "Перед созданием CRM проверит обязательные поля" — программа
	 *    говорила о себе аббревиатурой.»
	 * Сейчас там: «Заполните форму ниже: без обязательных полей документ не
	 * создастся.» — то же обещание словами для администратора, а не про CRM.
	 *
	 * Этот же страж НИЖЕ запрещает «Telegram-бота DENTE» ровно по той причине
	 * («must use clinic-facing wording, not internal DENTE wording»). Оставить иглу
	 * означало бы требовать в одном файле то, что запрещено в другом его абзаце.
	 *
	 * Требование сохранено по СУТИ, а не по фразе: подсказка обязана существовать,
	 * быть привязана к полю через aria-describedby (обе иглы выше) и различать
	 * случаи «нужна форма» и «можно создать сразу» — это проверяет
	 * `selectedDocumentNeedsPayload` в паре с `selectedDocumentCreateGuidanceId`.
	 * Конкретная формулировка требованием не является: она уже менялась один раз
	 * по делу, и страж не должен запирать её навсегда.
	 */
	"documentAuditFacts",
	"documentAuditFactsLoadingId",
	"documentIssueSignatureStorageKey",
	"documentIssueSignatureLocalKey",
	"documentIssueSignatureModeLabels",
	"initialUiPreferences.documentIssueSignatureMode",
	"initialUiPreferences.documentIssueStaffFullName",
	"initialUiPreferences.documentIssueStaffRole",
	"loadDocumentIssueSignatureDraft(organizationId",
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
	'setReleaseDocumentTypes(request.requestedDocumentTypes.join("\\n"))',
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
	"loadOutpatient025uDocumentDraft(",
	"saveOutpatient025uDocumentDraft(",
	"loadMedicalRecordExtractDocumentDraft(",
	"saveMedicalRecordExtractDocumentDraft(",
	"outpatient025uDraftPersistenceKey",
	"outpatient025uDraftHydratedKeyRef",
	"medicalRecordExtractDraftPersistenceKey",
	"medicalRecordExtractDraftHydratedKeyRef",
	"applyOutpatient025uDocumentDraftFields(",
	"currentOutpatient025uDocumentDraftFields()",
	"applyMedicalRecordExtractDocumentDraftFields(",
	"currentMedicalRecordExtractDocumentDraftFields()",
	"setRecordExtractRecipientFullName(fields.recordExtractRecipientFullName)",
	"setRecordExtractRecipientAuthority(fields.recordExtractRecipientAuthority)",
	"setRecordExtractIssuedAt(fields.recordExtractIssuedAt)",
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
	'setTaxApplicationAuthorityDocument("")',
	"taxApplicationDuplicateWarningAccepted",
	"taxApplicationRelationshipOptions",
	"taxDeductionApplication",
	"documentPatient",
	"documentPatientMatchesActiveVisit",
	"patientId: documentPatient.id",
	"taxDeductionCode: paymentTaxDeductionCode || null",
	"Не выбран",
];

/*
 * ТРЕБОВАНИЯ-СВЯЗИ ВМЕСТО ТРЕБОВАНИЙ-НАПИСАНИЯ.
 *
 * Ниже — иглы, которые краснели НЕ на пропавшем поведении, а на форме записи. Три
 * причины, все не про документы:
 *
 *  1. ПЕРЕНОС СТРОКИ. Игла записывала вызов одной строкой, форматтер разносит его
 *     по аргументу на строку, потому что одной строкой он длиннее лимита. Так
 *     краснели все шесть load/save локального восстановления черновиков: адрес
 *     `loadDocumentPaymentSelection(documentLocalPersistenceOrganizationId,
 *     taxPaymentSelectionPersistenceKey)` в коде занимает четыре строки.
 *  2. ОТСТУП. Игла несла 6 пробелов, а файл — табуляции.
 *  3. `?.`. Игла требовала `dashboard?.clinicSettings.profile.organizationId`,
 *     а в коде появилась защита от пустых полей:
 *     `dashboard?.clinicSettings?.profile?.organizationId`. Страж покраснел на
 *     ДОБАВЛЕННОЙ защите — то есть наказывал за правку в верную сторону.
 *
 * Что закрепляется взамен: не обёртка, а СВЯЗЬ. Идентификатор организации идёт
 * ПЕРВЫМ аргументом в каждый load/save — именно в этом смысл требования, потому
 * что без него черновики и выбранные чеки одной клиники всплывали бы в другой.
 * Поменяйте аргументы местами, потеряйте организацию, подставьте чужой ключ —
 * покраснеет. Переформатируйте — нет.
 */
const requiredPatterns = [
	{
		pattern: /validateDocumentPayloadForKind\(\s*kind\s*[,)]/,
		as: "validateDocumentPayloadForKind must be called for the selected kind",
	},
	{
		pattern: /documentPayloadForKind\(\s*kind\s*[,)]/,
		as: "documentPayloadForKind must be called for the selected kind",
	},
	{
		pattern:
			/task\.workflowCode\s*\?\s*telegramDocumentRequestWorkflowDocumentKinds\[\s*task\.workflowCode\s*\]\s*:\s*null/,
		as: "Telegram document request must resolve kinds through the stable workflowCode",
	},
	{
		pattern:
			/saveDocumentIssueSignatureDraft\(\s*dashboard\??\.clinicSettings\??\.profile\??\.organizationId\s*\?\?\s*null/,
		as: "document issue signature draft must be saved under the clinic organization id",
	},
	{
		pattern:
			/taxApplicationForm === "knd_1151156"\s*&&\s*normalizedInn\s*&&\s*normalizedInn\.length !== 12/,
		as: "KND 1151156 must require a 12-digit taxpayer INN when an INN is given",
	},
	{
		pattern:
			/documentPayloadDraftKey\(\s*"outpatient_medical_card_025u"\s*,\s*documentLocalPersistenceOrganizationId/,
		as: "025/u draft key must be scoped by clinic organization id",
	},
	{
		pattern:
			/documentPayloadDraftKey\(\s*"medical_record_extract"\s*,\s*documentLocalPersistenceOrganizationId/,
		as: "medical record extract draft key must be scoped by clinic organization id",
	},
	{
		pattern:
			/loadDocumentPaymentSelection\(\s*documentLocalPersistenceOrganizationId\s*,\s*taxPaymentSelectionPersistenceKey/,
		as: "tax fiscal receipt selection must be loaded with the clinic organization id first",
	},
	{
		pattern:
			/saveDocumentPaymentSelection\(\s*documentLocalPersistenceOrganizationId\s*,/,
		as: "payment selection must be saved with the clinic organization id first",
	},
	{
		pattern:
			/loadOutpatient025uDocumentDraft\(\s*documentLocalPersistenceOrganizationId\s*,\s*outpatient025uDraftPersistenceKey/,
		as: "025/u draft must be loaded with the clinic organization id first",
	},
	{
		pattern:
			/saveOutpatient025uDocumentDraft\(\s*documentLocalPersistenceOrganizationId\s*,/,
		as: "025/u draft must be saved with the clinic organization id first",
	},
	{
		pattern:
			/loadMedicalRecordExtractDocumentDraft\(\s*documentLocalPersistenceOrganizationId\s*,/,
		as: "medical record extract draft must be loaded with the clinic organization id first",
	},
	{
		pattern:
			/saveMedicalRecordExtractDocumentDraft\(\s*documentLocalPersistenceOrganizationId\s*,/,
		as: "medical record extract draft must be saved with the clinic organization id first",
	},
	{
		pattern:
			/setRecordExtractPreparedFromSignedRecords\(\s*fields\.recordExtractPreparedFromSignedRecords\s*,?\s*\)/,
		as: "restored extract draft must rehydrate the signed-records attestation",
	},
	{
		pattern:
			/setRecordExtractThirdPartyDataChecked\(\s*fields\.recordExtractThirdPartyDataChecked\s*,?\s*\)/,
		as: "restored extract draft must rehydrate the third-party data check",
	},
	{
		pattern:
			/setOutpatient025uOfficialForm274nChecked\(\s*fields\.outpatient025uOfficialForm274nChecked\s*,?\s*\)/,
		as: "restored 025/u draft must rehydrate the order 274n form check",
	},
	{
		pattern:
			/setOutpatient025uThirdPartyDataChecked\(\s*fields\.outpatient025uThirdPartyDataChecked\s*,?\s*\)/,
		as: "restored 025/u draft must rehydrate the third-party data check",
	},
	/*
	 * Игла была `useState<"" | "1" | "2">("")`. Состояние переехало из useState в
	 * хранилище useDocumentStore, поэтому требовать `useState` — требовать способ
	 * хранения. Суть требования в другом: код налогового вычета имеет ТРИ значения,
	 * и третье — пустая строка «не выбран», отличимая от «1» и «2». Подмена пустого
	 * значения на "1" молча проставила бы вычет там, где его не выбирали, а
	 * `?? 0`-подобная подстановка напечатала бы неизвестное как измеренное.
	 */
	{
		pattern: /paymentTaxDeductionCode:\s*"" \| "1" \| "2";/,
		as: 'tax deduction code must stay a tri-state including the explicit "not selected" empty value',
	},
	{
		pattern: /paymentTaxDeductionCode:\s*"",/,
		as: 'tax deduction code must default to the explicit "not selected" empty value',
	},
	{
		pattern:
			/selectedPaymentIds:\s*refundSelectedPaymentId\s*\?\s*\[\s*refundSelectedPaymentId\s*\]\s*:\s*\[\s*\]/,
		as: "refund/correction payload must persist explicit selected source payment ids",
	},
];

const missing = requiredSnippets.filter((snippet) => !source.includes(snippet));
for (const { pattern, as } of requiredPatterns) {
	if (!pattern.test(source)) missing.push(as);
}

/*
 * ГРАНИЦЫ createDocument — У КОМПИЛЯТОРА, И ЭТО ПОЧИНКА ПУСТОЙ ПРОВЕРКИ.
 *
 * Здесь стояли две регулярки по тексту. Вторая, `fullCreateDocumentBlock`,
 * заканчивалась маркером `\n {2}async function updateDocumentStatus` — ДВА
 * ПРОБЕЛА отступа, тогда как useAppLogic.tsx набран ТАБУЛЯЦИЯМИ. Совпадений
 * ноль, `?? ""` превращал промах в пустую строку, и опирающаяся на неё проверка
 *
 *   if (fullCreateDocumentBlock.includes("patientId: activePatient.id"))
 *
 * была ВАКУУМНОЙ: `"".includes(...)` — всегда false, требование не срабатывало
 * никогда и не сработало бы ни при какой регрессии. Замерено: регулярка не
 * матчит, `patientId: activePatient.id` в файле ЕСТЬ (useAppLogic.tsx:13523),
 * просто вне createDocument (12054-12385) — то есть запрет молчал, а не был
 * выполнен. Проверка, зелёная без правки, — не проверка.
 *
 * Тело функции теперь берётся у `ts.createSourceFile`: границы знает парсер,
 * отступы и соседи не влияют. Часть «до отправки» отрезается от найденного тела
 * по первому fetch — порядок здесь и есть требование (проверить поля ДО POST).
 */
function documentUiFunctionSource(name) {
	const searchFiles = [
		"apps/web/src/App.tsx",
		...appLogicSourceFiles(),
		"apps/web/src/AppHelpers.tsx",
		"apps/web/src/DocumentsView.tsx",
	];
	for (const file of searchFiles) {
		let text;
		try {
			text = fs.readFileSync(file, "utf8");
		} catch {
			continue;
		}
		const sourceFile = ts.createSourceFile(
			file,
			text,
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TSX,
		);
		let found = null;
		const visit = (node) => {
			if (found) return;
			const declaresName =
				(ts.isFunctionDeclaration(node) && node.name?.text === name) ||
				(ts.isVariableDeclaration(node) &&
					ts.isIdentifier(node.name) &&
					node.name.text === name &&
					node.initializer &&
					(ts.isArrowFunction(node.initializer) ||
						ts.isFunctionExpression(node.initializer)));
			if (declaresName) {
				found = text.slice(node.getStart(sourceFile), node.getEnd());
				return;
			}
			ts.forEachChild(node, visit);
		};
		ts.forEachChild(sourceFile, visit);
		if (found) return found;
	}
	return null;
}

const fullCreateDocumentBlock = documentUiFunctionSource("createDocument");
if (!fullCreateDocumentBlock) {
	missing.push("createDocument declaration not found in document UI sources");
}
const createDocumentFetchIndex = fullCreateDocumentBlock
	? fullCreateDocumentBlock.search(
			/const response = await fetch\("\/api\/documents"/,
		)
	: -1;
if (fullCreateDocumentBlock && createDocumentFetchIndex < 0) {
	missing.push("createDocument must POST the document to /api/documents");
}
const createDocumentBlock =
	fullCreateDocumentBlock && createDocumentFetchIndex >= 0
		? fullCreateDocumentBlock.slice(0, createDocumentFetchIndex)
		: "";

if (
	!/validateDocumentPayloadForKind\(\s*kind\s*[,)]/.test(createDocumentBlock)
) {
	missing.push("createDocument payload validation before fetch");
}

if (!/documentPayloadForKind\(\s*kind\s*[,)]/.test(createDocumentBlock)) {
	missing.push("createDocument payload builder before fetch");
}
if (!createDocumentBlock.includes("documentPatientMatchesActiveVisit")) {
	missing.push(
		"createDocument does not block active-visit documents for a different selected patient",
	);
}
if (!source.includes("patientId: documentPatient.id")) {
	missing.push(
		"createDocument must use selected/document patient instead of active visit patient",
	);
}
if (fullCreateDocumentBlock?.includes("patientId: activePatient.id")) {
	missing.push("createDocument still posts documents for activePatient.id");
}
if (source.includes("setSelectedTaxPaymentIds(eligibleTaxPayments.map")) {
	missing.push(
		"tax document UI must not auto-select all eligible fiscal receipts",
	);
}
if (
	source.includes(
		"setSelectedPaymentReceiptIds(eligiblePaymentReceiptPayments.map((payment) => payment.id));",
	)
) {
	missing.push(
		"payment receipt selection must not reset to all eligible payments after reload",
	);
}
if (!source.includes("selectedTaxPaymentIdsForCurrentDocument()")) {
	missing.push(
		"tax application/certificate/registry must use one explicit selected fiscal receipt source",
	);
}
if (source.includes("selectedPaymentIds: selectedEligibleTaxPayments.map")) {
	missing.push(
		"tax application payload must not use broad eligible payment mapping",
	);
}
if (
	source.includes(
		"? { taxPaymentSelection: { selectedPaymentIds: selectedTaxPaymentIdsForDocument } }",
	)
) {
	missing.push(
		"tax payment payload must merge with structured document payload instead of replacing it",
	);
}
/*
 * Требование «возврат несёт явно выбранный чек-источник» переехало в
 * requiredPatterns: в documentLogic.ts (1236-1238) это тернарник на трёх строках,
 * и игла в одну строку требовала бы отсутствия переноса.
 */
if (
	!source.includes("selectRefundOriginalPayment") ||
	!source.includes("eligibleRefundCorrectionPayments")
) {
	missing.push(
		"refund/correction UI must choose an eligible paid fiscal receipt before creating payload",
	);
}
if (
	!source.includes("tax:${organizationId}:") ||
	!source.includes("receipt:${organizationId}:")
) {
	missing.push(
		"saved payment selections must be scoped by clinic organization id",
	);
}
if (
	source.includes(
		"loadDocumentPaymentSelection(taxPaymentSelectionPersistenceKey)",
	) ||
	source.includes(
		"loadDocumentPaymentSelection(paymentReceiptSelectionPersistenceKey)",
	) ||
	source.includes(
		"saveDocumentPaymentSelection(taxPaymentSelectionPersistenceKey",
	) ||
	source.includes(
		"saveDocumentPaymentSelection(paymentReceiptSelectionPersistenceKey",
	)
) {
	missing.push(
		"document payment local recovery must pass clinic organization id into load/save",
	);
}
if (
	source.includes(
		"loadOutpatient025uDocumentDraft(outpatient025uDraftPersistenceKey)",
	) ||
	source.includes(
		"saveOutpatient025uDocumentDraft(outpatient025uDraftPersistenceKey",
	)
) {
	missing.push(
		"025/u payload drafts must pass clinic organization id into load/save",
	);
}
if (
	source.includes(
		"loadMedicalRecordExtractDocumentDraft(medicalRecordExtractDraftPersistenceKey)",
	) ||
	source.includes(
		"saveMedicalRecordExtractDocumentDraft(medicalRecordExtractDraftPersistenceKey",
	)
) {
	missing.push(
		"medical record extract payload drafts must pass clinic organization id into load/save",
	);
}
if (
	source.includes(
		"window.localStorage.setItem(\n      documentPaymentSelectionStorageKey",
	) ||
	source.includes(
		"window.localStorage.setItem(\n      documentPayloadDraftStorageKey",
	)
) {
	missing.push(
		"document local recovery stores must write to clinic-scoped localStorage keys",
	);
}
if (
	source.includes(
		"firstPaymentReceiptPayment()?.payerBirthDate?.trim() || toDateInputValue(documentPatient?.birthDate)",
	)
) {
	missing.push(
		"payment receipt must not fall back to patient birth date for payer tax facts",
	);
}
if (
	source.includes(
		"firstPaymentReceiptPayment()?.payerInn?.trim() || documentPatient?.administrativeProfile?.taxpayerInn",
	)
) {
	missing.push(
		"payment receipt must not fall back to patient INN for payer tax facts",
	);
}
if (source.includes('updateDocumentStatus(document.id, "void")')) {
	missing.push(
		"document list must open structured void confirmation instead of direct void status mutation",
	);
}
if (!source.includes("satisfies VoidDocumentInput")) {
	missing.push("document void UI must submit shared VoidDocumentInput payload");
}
if (source.includes("payload СБП")) {
	missing.push(
		"payment invoice QR field must use staff-facing wording, not raw payload jargon",
	);
}
if (source.includes("Telegram-бота DENTE")) {
	missing.push(
		"post-visit recommendation helper must use clinic-facing wording, not internal DENTE wording",
	);
}
if (source.includes("ID подписанных визитов, по одному в строке")) {
	missing.push(
		"medical record extract must not ask administrators for internal visit IDs",
	);
}
if (source.includes("ID визитов или номера записей, по одному в строке")) {
	missing.push(
		"medical copy request must not ask administrators for internal visit IDs",
	);
}
if (source.includes("привязана к нему по ID")) {
	missing.push(
		"medical release receipt must not explain source request binding through internal IDs",
	);
}
if (source.includes('paymentFiscalReceiptNumber || "ФН/ФД/ФП"')) {
	missing.push(
		"refund correction receipt placeholder must not expose unexplained fiscal abbreviations",
	);
}
if (source.includes("<span>sha256</span>")) {
	missing.push(
		"document audit passport must use operator wording instead of raw hash labels",
	);
}

if (
	!source.includes("documentPayloadSchema") &&
	!source.includes("DocumentPayload")
) {
	missing.push("shared document payload type is not referenced");
}

const hiddenDocumentPayloadCards =
	source.match(
		/className="document-payload-card" hidden=\{selectedDocumentKind !==/g,
	) ?? [];
/*
 * Считаются ВИДЫ ДОКУМЕНТОВ, а не теги <article>. Раньше проверка требовала
 * «не меньше 28 раз className="document-payload-card"», и это работало только
 * пока каждый вид держал свою копию оболочки карточки. Шесть видов перешли на
 * общий DocumentPayloadCard — копий стало 21 вместо 28, и проверка покраснела
 * на том, что разметку перестали дублировать. Смысл требования был другой:
 * каждый вид документа монтируется только при своём выборе, а не рисуется
 * всегда и прячется атрибутом hidden. Именно это и проверяется теперь.
 */
const payloadKindMounts =
	source.match(/\{selectedDocumentKind === "[^"]+" \? \(/g) ?? [];
const inlineCardMounts =
	source.match(
		/\{selectedDocumentKind === "[^"]+" \? \(\s+<article className="document-payload-card">/g,
	) ?? [];
const extractedFormMounts =
	source.match(
		/\{selectedDocumentKind === "[^"]+" \? \(\s+<[A-Z][A-Za-z0-9]*Form\b/g,
	) ?? [];
if (hiddenDocumentPayloadCards.length) {
	missing.push(
		"document payload cards must be conditionally mounted instead of rendered as hidden DOM",
	);
}
if (
	payloadKindMounts.length < 28 ||
	inlineCardMounts.length + extractedFormMounts.length !==
		payloadKindMounts.length
) {
	missing.push(
		"every structured document payload card must be mounted only for the selected document kind",
	);
}

const communicationDocumentWorkflowBlock =
	/function openCommunicationTaskDocumentWorkflow\([\s\S]*?\n {2}\}/.exec(
		source,
	)?.[0] ?? "";
if (
	!communicationDocumentWorkflowBlock.includes("setSelectedDocumentKind(kind)")
) {
	missing.push(
		"communication document workflow does not preselect document kind",
	);
}
if (
	!communicationDocumentWorkflowBlock.includes(
		'window.location.hash = "documents"',
	)
) {
	missing.push(
		"communication document workflow does not navigate to documents",
	);
}
if (
	!communicationDocumentWorkflowBlock.includes(
		"changePostVisitCareTopic(careTopic)",
	)
) {
	missing.push(
		"communication care workflow does not preselect Telegram care topic",
	);
}
if (
	!communicationDocumentWorkflowBlock.includes(
		"telegramCareRequestWorkflowCareTopics[task.workflowCode]",
	)
) {
	missing.push(
		"communication care workflow still does not use stable Telegram workflowCode",
	);
}
if (communicationDocumentWorkflowBlock.includes("createDocument(")) {
	missing.push(
		"communication document workflow must not auto-create documents",
	);
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
	"setDocumentVoidReasonCode(event.target.value as DocumentVoidReasonCode)",
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
				"medical_intervention_refusal",
			],
		},
		null,
		2,
	),
);
