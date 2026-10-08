import type {
	AiJobKind,
	ClinicalToothRow,
	Dashboard,
	DocumentIssueSignatureMode,
	DocumentVoidReasonCode,
	InstallmentPaymentStatus,
	PatientIntakePregnancyStatus,
	PhotoVideoConsentMaterial,
	PricelistSourceKind,
	ProcedureSpecificConsentProcedure,
	TaxDeductionApplicationDeliveryChannel,
	TaxDeductionApplicationForm,
	TaxDeductionApplicationRelationship,
	TreatmentPlanAcceptanceVariant,
	VisitNoteDraft,
} from "@dental/shared";

export const pricelistSourceKindLabels: Record<PricelistSourceKind, string> = {
	text: "Текст",
	ocr_text: "OCR",
	photo_ocr: "Фото",
	spreadsheet_copy: "Таблица",
	manual: "Вручную",
};

export const defaultClinicalToothRowsText =
	"36 | окклюзионная, дистальная | кариес | кариес дентина 36 зуба по осмотру и снимку | восстановление функции и профилактика осложнений | лечение кариеса и композитная реставрация | прогноз зависит от гигиены и контроля | десна без острого воспаления | | ";

export const toothRows = [
	[
		"18",
		"17",
		"16",
		"15",
		"14",
		"13",
		"12",
		"11",
		"21",
		"22",
		"23",
		"24",
		"25",
		"26",
		"27",
		"28",
	],
	[
		"48",
		"47",
		"46",
		"45",
		"44",
		"43",
		"42",
		"41",
		"31",
		"32",
		"33",
		"34",
		"35",
		"36",
		"37",
		"38",
	],
] as const;

export const toothStateByCode: Record<
	string,
	"watch" | "planned" | "done" | "missing"
> = {
	"16": "watch",
	"26": "done",
	"36": "planned",
	"46": "watch",
	"48": "missing",
};

/**
 * Что печатается вместо суммы, которой программа не знает.
 *
 * Вынесено в имя, а не написано строкой по месту: разметке местами нужно
 * ОТЛИЧИТЬ неизвестное от суммы, не разбирая текст на части, — например чтобы
 * не подсвечивать красным долг, которого никто не считал.
 */
export const moneyUnknownLabel = "не определено";

export type VisitNoteField =
	| "complaint"
	| "anamnesis"
	| "objectiveStatus"
	| "diagnosis"
	| "treatmentPlan";

export type VisitNoteForm = Record<VisitNoteField, string> & {
	recommendations?: string;
};

export const emptyVisitNoteForm: VisitNoteForm = {
	complaint: "",
	anamnesis: "",
	objectiveStatus: "",
	diagnosis: "",
	treatmentPlan: "",
};

export const visitNoteFieldDefinitions: Array<{
	key: VisitNoteField;
	label: string;
}> = [
	{ key: "complaint", label: "Жалобы" },
	{ key: "anamnesis", label: "Анамнез" },
	{ key: "objectiveStatus", label: "Объективно" },
	{ key: "diagnosis", label: "Диагноз" },
	{ key: "treatmentPlan", label: "План" },
];

export const visitDraftQualityLabels: Record<
	NonNullable<VisitNoteDraft["quality"]>["level"],
	string
> = {
	ready: "Черновик плотный",
	review: "Нужна проверка",
	needs_more_dictation: "Нужно дописать",
};

export const visitDraftSignalLabels: Record<string, string> = {
	complaint_detected: "жалобы есть",
	anamnesis_detected: "анамнез есть",
	objective_detected: "осмотр есть",
	diagnosis_mentioned: "диагноз есть",
	plan_detected: "план есть",
	tooth_codes_detected: "зуб указан",
	imaging_mentioned: "снимки упомянуты",
	consent_mentioned: "согласие упомянуто",
	medical_risk_mentioned: "есть медриск",
	procedure_mentioned: "процедура упомянута",
};

export const visitDraftMissingFieldLabels: Record<string, string> = {
	complaint: "жалобы",
	anamnesis: "анамнез",
	objective_status: "объективный статус",
	diagnosis_review: "диагноз",
	treatment_plan: "план лечения",
	tooth_or_region: "зуб или область",
};

export const documentPaymentSelectionStorageKey =
	"dental-crm:document-payment-selection:v1";

export const documentPayloadDraftStorageKey =
	"dental-crm:document-payload-drafts:v1";

export const documentIssueSignatureStorageKey =
	"dental-crm:document-issue-signature:v1";

export type DocumentPaymentSelectionEntry = {
	paymentIds: string[];
	savedAt: string;
};

export type DocumentPaymentSelectionStore = {
	version: 1;
	selections: Record<string, DocumentPaymentSelectionEntry>;
};

export type MedicalRecordExtractDocumentDraftFields = {
	recordExtractPeriodStart: string;
	recordExtractPeriodEnd: string;
	recordExtractSourceVisitIds: string;
	recordExtractComplaintAndAnamnesis: string;
	recordExtractObjectiveStatus: string;
	recordExtractDiagnosis: string;
	recordExtractTreatmentProvided: string;
	recordExtractRecommendations: string;
	recordExtractDoctorFullName: string;
	recordExtractRecipientFullName: string;
	recordExtractRecipientAuthority: string;
	recordExtractIssuedAt: string;
	recordExtractPreparedFromSignedRecords: boolean;
	recordExtractThirdPartyDataChecked: boolean;
};

export type DocumentPayloadDraftEntry = {
	kind: "dental_outpatient_card_043u" | "medical_record_extract";
	patientId: string;
	visitId: string | null;
	savedAt: string;
	fields:
		| MedicalRecordExtractDocumentDraftFields
		| Record<string, unknown>;
};

export type DocumentPayloadDraftStore = {
	version: 1;
	drafts: Record<string, DocumentPayloadDraftEntry>;
};

export type DocumentIssueSignatureDraft = {
	version: 1;
	mode: DocumentIssueSignatureMode;
	staffFullName: string;
	staffRole: string;
	savedAt: string;
};

export const documentIssueSignatureModeLabels: Record<
	DocumentIssueSignatureMode,
	string
> = {
	paper_signed: "Бумажный экземпляр подписан",
	simple_electronic_signature: "Простая электронная подпись",
	enhanced_non_qualified_electronic_signature: "УНЭП",
	qualified_electronic_signature: "УКЭП",
};

export const documentVoidReasonLabels: Record<DocumentVoidReasonCode, string> =
	{
		draft_error: "Ошибка в черновике",
		issued_in_error: "Документ выдан с ошибкой",
		patient_request: "Запрос пациента или представителя",
		duplicate_document: "Дубль документа",
		tax_certificate_correction: "Коррекция налоговой справки",
		medical_release_correction: "Коррекция выдачи меддокументов",
		payment_correction: "Коррекция оплаты или чека",
		other: "Другая причина",
	};

export type MedicalDocumentReleaseChannel =
	| "paper"
	| "pdf"
	| "dicom_archive"
	| "secure_link"
	| "physical_media"
	| "other";

export const medicalDocumentReleaseChannelLabels: Record<
	MedicalDocumentReleaseChannel,
	string
> = {
	paper: "Бумага",
	pdf: "PDF",
	dicom_archive: "архив снимков",
	secure_link: "Защищенная ссылка",
	physical_media: "Физический носитель",
	other: "Иной канал",
};

export type PaymentRefundCorrectionAction =
	| "full_refund"
	| "partial_refund"
	| "payment_transfer"
	| "receipt_correction"
	| "payer_details_correction";

export type PaymentRefundCorrectionMethod =
	| "cash"
	| "card"
	| "bank_transfer"
	| "internal_offset"
	| "no_money_movement";

export const paymentRefundCorrectionActionOptions: readonly PaymentRefundCorrectionAction[] =
	[
		"full_refund",
		"partial_refund",
		"payment_transfer",
		"receipt_correction",
		"payer_details_correction",
	];

export const paymentRefundCorrectionMethodOptions: readonly PaymentRefundCorrectionMethod[] =
	["cash", "card", "bank_transfer", "internal_offset", "no_money_movement"];

export const treatmentAcceptanceVariantOptions: readonly TreatmentPlanAcceptanceVariant[] =
	["urgent", "standard", "optimal", "staged", "maintenance", "other"];

export const patientIntakePregnancyStatusOptions: Array<{
	value: PatientIntakePregnancyStatus;
	label: string;
}> = [
	{ value: "not_applicable", label: "Не применимо" },
	{ value: "denied", label: "Со слов пациента нет" },
	{ value: "possible", label: "Возможна беременность" },
	{ value: "confirmed", label: "Беременность подтверждена" },
	{ value: "lactation", label: "Лактация" },
	{ value: "unknown", label: "Не уточнено" },
];

export const taxApplicationRelationshipOptions: Array<{
	value: TaxDeductionApplicationRelationship;
	label: string;
}> = [
	{ value: "self", label: "Пациент сам" },
	{ value: "spouse", label: "Супруг / супруга" },
	{ value: "parent", label: "Родитель" },
	{ value: "child", label: "Ребенок" },
	{ value: "ward", label: "Подопечный" },
];

export const taxApplicationFormOptions: Array<{
	value: TaxDeductionApplicationForm;
	label: string;
}> = [
	{ value: "knd_1151156", label: "Справка для налогового вычета (с 2024)" },
	{ value: "legacy_2021_2023", label: "Старая справка, оплаты 2021-2023" },
];

export const taxApplicationDeliveryChannelOptions: Array<{
	value: TaxDeductionApplicationDeliveryChannel;
	label: string;
}> = [
	{ value: "paper", label: "Бумажно в клинике" },
	{ value: "pdf", label: "PDF после подписи" },
	{ value: "secure_link", label: "Защищенная ссылка" },
	{ value: "email", label: "Email" },
	{ value: "portal", label: "Личный кабинет" },
	{ value: "other", label: "Иной канал" },
];

export type ClinicalToothSurface = ClinicalToothRow["surfaces"][number];

export type ClinicalToothStatus = ClinicalToothRow["status"];

export const clinicalToothSurfaceAliases: Record<string, ClinicalToothSurface> =
	{
		o: "occlusal",
		окклюзионная: "occlusal",
		окклюзионно: "occlusal",
		жевательная: "occlusal",
		жевательно: "occlusal",
		m: "mesial",
		медиальная: "mesial",
		мезиальная: "mesial",
		медиально: "mesial",
		мезиально: "mesial",
		d: "distal",
		дистальная: "distal",
		дистально: "distal",
		b: "buccal",
		щечная: "buccal",
		щечно: "buccal",
		вестибулярная: "buccal",
		l: "lingual",
		язычная: "lingual",
		язычно: "lingual",
		p: "palatal",
		небная: "palatal",
		небно: "palatal",
		i: "incisal",
		режущий: "incisal",
		"режущий край": "incisal",
		корень: "root",
		корневая: "root",
		root: "root",
		имплантация: "implant_site",
		"зона имплантации": "implant_site",
		"implant site": "implant_site",
		"не применимо": "not_applicable",
		нет: "not_applicable",
		"-": "not_applicable",
	};

export const clinicalToothStatusAliases: Record<string, ClinicalToothStatus> = {
	норма: "sound",
	"без патологии": "sound",
	наблюдение: "watch",
	контроль: "watch",
	кариес: "caries",
	caries: "caries",
	пульпит: "pulpitis_periodontitis",
	периодонтит: "pulpitis_periodontitis",
	эндо: "pulpitis_periodontitis",
	пародонт: "periodontal",
	пародонтология: "periodontal",
	отсутствует: "missing",
	удален: "missing",
	удаленый: "missing",
	удаленный: "missing",
	имплант: "implant",
	имплантат: "implant",
	ортопедия: "prosthetic",
	коронка: "prosthetic",
	протез: "prosthetic",
	ортодонтия: "orthodontic",
	брекеты: "orthodontic",
	элайнеры: "orthodontic",
	план: "planned",
	planned: "planned",
	запланировано: "planned",
	выполнено: "completed",
	completed: "completed",
	готово: "completed",
	иное: "other",
	другое: "other",
};

export const installmentPaymentStatusAliases: Record<
	string,
	InstallmentPaymentStatus
> = {
	план: "planned",
	запланирован: "planned",
	запланировано: "planned",
	ожидается: "planned",
	planned: "planned",
	оплачен: "paid",
	оплачено: "paid",
	paid: "paid",
	просрочен: "overdue",
	просрочено: "overdue",
	просрочка: "overdue",
	overdue: "overdue",
	перенесен: "rescheduled",
	перенесено: "rescheduled",
	перенос: "rescheduled",
	rescheduled: "rescheduled",
	отменен: "cancelled",
	отменено: "cancelled",
	отмена: "cancelled",
	cancelled: "cancelled",
};

export const procedureSpecificConsentProcedureOptions: Array<{
	value: ProcedureSpecificConsentProcedure;
	label: string;
}> = [
	{ value: "local_anesthesia", label: "Местная анестезия" },
	{
		value: "therapy_endo_restoration",
		label: "Терапия, эндодонтия, реставрация",
	},
	{ value: "surgery_extraction", label: "Хирургия / удаление" },
	{ value: "implantation_bone_graft", label: "Имплантация / костная пластика" },
	{ value: "prosthetics", label: "Ортопедия" },
	{ value: "orthodontics", label: "Ортодонтия" },
	{ value: "hygiene_whitening", label: "Гигиена / отбеливание" },
	{ value: "periodontology", label: "Пародонтология" },
	{ value: "other", label: "Другая процедура" },
];

export const photoVideoMaterialOptions: Array<{
	value: PhotoVideoConsentMaterial;
	label: string;
}> = [
	{ value: "intraoral_photo", label: "Внутриротовые фото" },
	{ value: "face_photo", label: "Фото лица" },
	{ value: "video", label: "Видео" },
	{ value: "xray", label: "Рентген" },
	{ value: "cbct", label: "КЛКТ/КТ" },
	{ value: "scan", label: "Цифровые сканы" },
	{ value: "other", label: "Иные материалы" },
];

export const aiJobKindPreferenceValues: readonly AiJobKind[] = [
	"voice_transcription",
	"visit_note_draft",
	"image_summary",
	"document_draft",
	"paper_ocr",
];

export const aiJobKindLabels: Record<AiJobKind, string> = {
	voice_transcription: "диктовка врача",
	visit_note_draft: "черновик приема",
	image_summary: "описание снимка",
	document_draft: "черновик документа",
	paper_ocr: "разбор бумажного журнала",
};

export type PricelistImageMimeType = "image/jpeg" | "image/png" | "image/webp";

export const pricelistImageMimeTypes: PricelistImageMimeType[] = [
	"image/jpeg",
	"image/png",
	"image/webp",
];

export const maxPricelistImageBase64Chars = 3_800_000;

export const workspaceScopeLabels: Record<
	Dashboard["clinicSettings"]["workspaceProfiles"][number]["scope"],
	string
> = {
	personal: "лично",
	clinic: "клиника",
	branch: "филиал",
	network: "сеть",
};

export const patientInsightRiskLabels: Record<
	Dashboard["patientInsights"][number]["riskLevel"],
	string
> = {
	low: "спокойно",
	watch: "контроль",
	high: "срочно",
};

export const recommendedActionPriorityLabels: Record<
	Dashboard["recommendedActions"][number]["priority"],
	string
> = {
	routine: "план",
	important: "важно",
	urgent: "срочно",
};

export const appointmentReadinessLabels: Record<
	Dashboard["appointmentReadiness"][number]["state"],
	string
> = {
	ready: "готово",
	needs_attention: "проверить",
	blocked: "важно",
};
