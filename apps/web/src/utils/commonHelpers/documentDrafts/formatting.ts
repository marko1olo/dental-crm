import type {
    AiJobKind,
    Dashboard,
    DenteTelegramVisualCardKey,
    DenteTelegramVisualCardUrls,
    DocumentIngestionTarget,
    ImportSourceKind,
    InstallmentPaymentStatus,
    PaymentRefundCorrectionAction,
    PaymentRefundCorrectionMethod,
    ProcedureSpecificConsentProcedure,
    SmartImportMode,
    TaxDeductionApplicationDeliveryChannel,
    TaxDeductionApplicationForm,
    TaxDeductionApplicationRelationship,
    TreatmentPlanAcceptanceVariant,
    XrayCbctReferralPregnancyStatus,
    XrayCbctReferralPriority,
    XrayCbctReferralStudyType
} from "@dental/shared";
import { showToast } from "../../../components/GlobalToast";
import { actionFailureToast } from "../../../lib/panelStateText";
import { telegramVisualCardFields } from "../../../workspaceStaticOptions";
import {
    clinicalRuleActionLabels,
    clinicalRuleSeverityLabels,
    serviceCategoryLabels
} from "../../../workspaceUiLabels";
import { treatmentAcceptanceVariantOptions } from "../../AppointmentHelpers";
import {
    isBrowserMigrationScanAbortError
} from "../../browserScanUtils";
import {
    todayDateInputValue
} from "../../dateTimeUtils";
import type { MedicalDocumentReleaseChannel, PersistenceHealth, PricelistImageMimeType } from "./types";
import {
    type MedicalRecordExtractDocumentDraftFields,
    taxApplicationRelationshipOptions
} from "../../DocumentHelpers";
import {
    loadImageFromDataUrl,
    readFileAsDataUrl,
    xrayPregnancyStatusOptions,
    xrayPriorityOptions,
    xrayStudyTypeOptions,
} from "../../ImagingHelpers";
import { isOptionValue, isRecordKey, isStringUnionValue } from "./validation";
import { defaultUiPreferences } from "../../preferencesUtils";
import {
    telegramPublicUrlSensitivePathSegments,
    telegramPublicUrlSensitiveQueryKeys
} from "../../TelegramHelpers";
import {
    isProcedureSpecificConsentProcedurePreference,
    isTaxApplicationDeliveryChannelPreference,
    isTaxApplicationFormPreference,
} from "../uiPreferencesHelpers";

export function browserGeneratedId(prefix: string): string {
    return `${prefix}-${crypto.randomUUID()}`;
}

export function createLocalQueueId(): string {
    if (typeof crypto !== "undefined") {
    	if ("randomUUID" in crypto) return crypto.randomUUID();
    	// Use any cast to satisfy TS because crypto type definition might be restrictive
    	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
    	const cryptoAny = crypto as any;
    	if (typeof cryptoAny.getRandomValues === "function") {
    		const array = new Uint32Array(1);
    		cryptoAny.getRandomValues(array);
    		return `local-${Date.now()}-${(array[0] || 0).toString(16)}`;
    	}
    }

    const timeStr = Date.now().toString(16);
    let hash = 0;
    for (let i = 0; i < timeStr.length; i++) {
    	hash = (Math.imul(31, hash) + timeStr.charCodeAt(i)) | 0;
    }

    return `local-${Date.now()}-${Math.abs(hash).toString(16)}`;
}

export function normalizePersistenceHealth(payload: unknown): PersistenceHealth | null {
    if (!payload || typeof payload !== "object") return null;
    const persistence = (
        			payload as {
        				meta?: Partial<PersistenceHealth>;
        				persistence?: Partial<PersistenceHealth>;
        			}
        		).meta ??
        		(payload as { persistence?: Partial<PersistenceHealth> }).persistence;
    if (!persistence || typeof persistence !== "object") return null;
    return {
    	enabled: persistence.enabled === true,
    	filePath:
    		typeof persistence.filePath === "string" ? persistence.filePath : "",
    	exists: persistence.exists === true,
    	version:
    		typeof persistence.version === "number" ? persistence.version : null,
    	savedAt:
    		typeof persistence.savedAt === "string" ? persistence.savedAt : null,
    	checksum:
    		typeof persistence.checksum === "string" ? persistence.checksum : null,
    	backupDirectoryPath:
    		typeof persistence.backupDirectoryPath === "string"
    			? persistence.backupDirectoryPath
    			: "",
    	backupCount:
    		typeof persistence.backupCount === "number" ? persistence.backupCount : 0,
    	latestBackupAt:
    		typeof persistence.latestBackupAt === "string"
    			? persistence.latestBackupAt
    			: null,
    	latestBackupSizeBytes:
    		typeof persistence.latestBackupSizeBytes === "number"
    			? persistence.latestBackupSizeBytes
    			: null,
    	maxBackupCount:
    		typeof persistence.maxBackupCount === "number"
    			? persistence.maxBackupCount
    			: 0,
    };
}

export function localDraftString(value: unknown, maxLength = 1200): string {
    return typeof value === "string" ? value.slice(0, maxLength) : "";
}

export function emptyMedicalRecordExtractDocumentDraftFields(): MedicalRecordExtractDocumentDraftFields {
    const today = todayDateInputValue();
    return {
    	recordExtractPeriodStart: today,
    	recordExtractPeriodEnd: today,
    	recordExtractSourceVisitIds: "",
    	recordExtractComplaintAndAnamnesis: "",
    	recordExtractObjectiveStatus: "",
    	recordExtractDiagnosis: "",
    	recordExtractTreatmentProvided: "",
    	recordExtractRecommendations: "",
    	recordExtractDoctorFullName: "",
    	recordExtractRecipientFullName: "",
    	recordExtractRecipientAuthority: "пациент лично",
    	recordExtractIssuedAt: new Date().toLocaleString("ru-RU"),
    	recordExtractPreparedFromSignedRecords: false,
    	recordExtractThirdPartyDataChecked: false,
    };
}

export function normalizeMedicalRecordExtractDocumentDraftFields(value: unknown): MedicalRecordExtractDocumentDraftFields | null {
    if (!value || typeof value !== "object") return null;
    const candidate = value as Partial<
        		Record<keyof MedicalRecordExtractDocumentDraftFields, unknown>
        	>;
    return {
    	recordExtractPeriodStart: localDraftString(
    		candidate.recordExtractPeriodStart,
    		40,
    	),
    	recordExtractPeriodEnd: localDraftString(
    		candidate.recordExtractPeriodEnd,
    		40,
    	),
    	recordExtractSourceVisitIds: localDraftString(
    		candidate.recordExtractSourceVisitIds,
    		2400,
    	),
    	recordExtractComplaintAndAnamnesis: localDraftString(
    		candidate.recordExtractComplaintAndAnamnesis,
    	),
    	recordExtractObjectiveStatus: localDraftString(
    		candidate.recordExtractObjectiveStatus,
    	),
    	recordExtractDiagnosis: localDraftString(candidate.recordExtractDiagnosis),
    	recordExtractTreatmentProvided: localDraftString(
    		candidate.recordExtractTreatmentProvided,
    	),
    	recordExtractRecommendations: localDraftString(
    		candidate.recordExtractRecommendations,
    	),
    	recordExtractDoctorFullName: localDraftString(
    		candidate.recordExtractDoctorFullName,
    		240,
    	),
    	recordExtractRecipientFullName: localDraftString(
    		candidate.recordExtractRecipientFullName,
    		240,
    	),
    	recordExtractRecipientAuthority:
    		localDraftString(candidate.recordExtractRecipientAuthority, 240) ||
    		"пациент лично",
    	recordExtractIssuedAt: localDraftString(
    		candidate.recordExtractIssuedAt,
    		80,
    	),
    	recordExtractPreparedFromSignedRecords:
    		candidate.recordExtractPreparedFromSignedRecords === true,
    	recordExtractThirdPartyDataChecked:
    		candidate.recordExtractThirdPartyDataChecked === true,
    };
}

export function normalizeTelegramPublicHttpsUrlDraft(fieldLabel: string, value: string | null | undefined): string | null {
    const raw = value?.trim() ?? "";
    if (!raw) return null;
    let parsed: URL;
    try {
    	parsed = new URL(raw);
    } catch {
    	throw new Error(`${fieldLabel}: укажите полный адрес вида https://...`);
    }

    if (parsed.protocol !== "https:") {
    	throw new Error(`${fieldLabel}: нужна ссылка https://...`);
    }

    if (parsed.username || parsed.password) {
    	throw new Error(`${fieldLabel}: уберите логин и пароль из ссылки.`);
    }

    const pathSegments = parsed.pathname
        		.split("/")
        		.map((segment) => {
        			try {
        				return decodeURIComponent(segment).trim().toLowerCase();
        			} catch (scanError) {
        				showToast(
        					actionFailureToast(
        						"Ошибка выполнения операции",
        						(scanError as { status?: number })?.status ?? null,
        					),
        					"error",
        				);
        				if (isBrowserMigrationScanAbortError(scanError)) throw scanError;
        				throw new Error(`${fieldLabel}: исправьте кодировку пути в ссылке.`);
        			}
        		})
        		.filter(Boolean);
    for (const segment of pathSegments) {
    	const compactDigits = segment.replace(/\D/g, "");
    	if (telegramPublicUrlSensitivePathSegments.has(segment)) {
    		throw new Error(
    			`${fieldLabel}: ссылка должна вести на общую публичную страницу, без patient/visit/document/token в пути.`,
    		);
    	}
    	if (
    		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    			segment,
    		)
    	) {
    		throw new Error(
    			`${fieldLabel}: уберите идентификатор пациента, визита или документа из пути.`,
    		);
    	}
    	if (compactDigits.length >= 10 || /\b\d{12}\b/.test(segment)) {
    		throw new Error(
    			`${fieldLabel}: уберите телефон, ИНН, СНИЛС или другой личный номер из пути.`,
    		);
    	}
    }

    const sensitiveQueryKeys = Array.from(parsed.searchParams.keys()).filter(
        		(key) => telegramPublicUrlSensitiveQueryKeys.has(key.trim().toLowerCase()),
        	);
    if (sensitiveQueryKeys.length) {
    	throw new Error(
    		`${fieldLabel}: уберите персональные параметры из ссылки: ${sensitiveQueryKeys.join(", ")}.`,
    	);
    }

    for (const valuePart of parsed.searchParams.values()) {
    	const compactDigits = valuePart.replace(/\D/g, "");
    	if (compactDigits.length >= 10 || /\b\d{12}\b/.test(valuePart)) {
    		throw new Error(
    			`${fieldLabel}: уберите телефон, ИНН, СНИЛС или другой личный номер из параметров.`,
    		);
    	}
    }

    parsed.hash = "";
    return parsed.toString();
}

export function normalizeTelegramVisualCardUrlDraftsForSave(drafts: DenteTelegramVisualCardUrls): DenteTelegramVisualCardUrls {
    const fieldLabel = (key: DenteTelegramVisualCardKey) =>
        		telegramVisualCardFields.find((field) => field.key === key)?.label ??
        		`Картинка Telegram ${key}`;
    return {
    	mainMenu: normalizeTelegramPublicHttpsUrlDraft(
    		fieldLabel("mainMenu"),
    		drafts.mainMenu,
    	),
    	appointment: normalizeTelegramPublicHttpsUrlDraft(
    		fieldLabel("appointment"),
    		drafts.appointment,
    	),
    	documents: normalizeTelegramPublicHttpsUrlDraft(
    		fieldLabel("documents"),
    		drafts.documents,
    	),
    	tax: normalizeTelegramPublicHttpsUrlDraft(fieldLabel("tax"), drafts.tax),
    	billing: normalizeTelegramPublicHttpsUrlDraft(
    		fieldLabel("billing"),
    		drafts.billing,
    	),
    	care: normalizeTelegramPublicHttpsUrlDraft(fieldLabel("care"), drafts.care),
    	review: normalizeTelegramPublicHttpsUrlDraft(
    		fieldLabel("review"),
    		drafts.review,
    	),
    	staff: normalizeTelegramPublicHttpsUrlDraft(
    		fieldLabel("staff"),
    		drafts.staff,
    	),
    };
}

export function normalizeTelegramBotUsernameDraft(fieldLabel: string, value: string | null | undefined): string | null {
    const normalized = value?.trim().replace(/^@/, "") ?? "";
    if (!normalized) return null;
    if (!/^[A-Za-z][A-Za-z0-9_]{1,28}[Bb][Oo][Tt]$/.test(normalized)) {
    	throw new Error(
    		`${fieldLabel}: укажите имя Telegram-бота без ссылки, 5-32 символа: латинские буквы, цифры, подчёркивания и окончание bot.`,
    	);
    }

    return normalized;
}

export function normalizeTaxApplicationRelationship(value: string | null | undefined): TaxDeductionApplicationRelationship | null {
    const normalized = value
        			?.trim()
        			.toLocaleLowerCase("ru-RU")
        			.replaceAll("ё", "е")
        			.replace(/[\s_-]+/g, " ") ?? "";
    if (!normalized) return null;
    if (
    	[
    		"self",
    		"patient",
    		"пациент",
    		"сам пациент",
    		"сама пациентка",
    		"налогоплательщик",
    	].includes(normalized)
    )
    	return "self";
    if (
    	["spouse", "husband", "wife", "супруг", "супруга", "муж", "жена"].includes(
    		normalized,
    	)
    )
    	return "spouse";
    if (
    	[
    		"parent",
    		"father",
    		"mother",
    		"родитель",
    		"отец",
    		"мать",
    		"папа",
    		"мама",
    	].includes(normalized)
    )
    	return "parent";
    if (
    	[
    		"child",
    		"son",
    		"daughter",
    		"ребенок",
    		"сын",
    		"дочь",
    		"усыновленный",
    		"усыновленная",
    	].includes(normalized)
    )
    	return "child";
    if (
    	["ward", "подопечный", "подопечная", "опекаемый", "опекаемая"].includes(
    		normalized,
    	)
    )
    	return "ward";
    return null;
}

export function normalizedTaxApplicationRelationshipSelect(value: unknown): TaxDeductionApplicationRelationship {
    return isOptionValue<TaxDeductionApplicationRelationship>(value, taxApplicationRelationshipOptions)
    ? value
    : "self";
}

export function normalizedTaxApplicationForm(value: unknown): TaxDeductionApplicationForm {
    return isTaxApplicationFormPreference(value)
    ? value
    : defaultUiPreferences.taxApplicationForm;
}

export function normalizedTaxApplicationDeliveryChannel(value: unknown): TaxDeductionApplicationDeliveryChannel {
    return isTaxApplicationDeliveryChannelPreference(value)
    ? value
    : defaultUiPreferences.taxApplicationDeliveryChannel;
}

export function normalizedProcedureSpecificConsentProcedure(value: unknown): ProcedureSpecificConsentProcedure {
    return isProcedureSpecificConsentProcedurePreference(value)
    ? value
    : defaultUiPreferences.procedureConsentProcedureType;
}

export function normalizedTreatmentPlanAcceptanceVariant(value: unknown): TreatmentPlanAcceptanceVariant {
    return isStringUnionValue<TreatmentPlanAcceptanceVariant>(value, treatmentAcceptanceVariantOptions)
    ? value
    : "standard";
}

export function normalizedXrayStudyType(value: unknown): XrayCbctReferralStudyType {
    return isOptionValue<XrayCbctReferralStudyType>(value, xrayStudyTypeOptions) ? value : "cbct";
}

export function normalizedXrayPriority(value: unknown): XrayCbctReferralPriority {
    return isStringUnionValue<XrayCbctReferralPriority>(value, xrayPriorityOptions) ? value : "routine";
}

export function normalizedXrayPregnancyStatus(value: unknown): XrayCbctReferralPregnancyStatus {
    return isOptionValue<XrayCbctReferralPregnancyStatus>(value, xrayPregnancyStatusOptions) ? value : "unknown";
}

export function normalizedMedicalDocumentReleaseChannel(value: unknown): MedicalDocumentReleaseChannel {
    return isRecordKey<MedicalDocumentReleaseChannel>(value, medicalDocumentReleaseChannelLabels)
    ? value
    : "paper";
}

export function normalizedPaymentRefundCorrectionAction(value: unknown): PaymentRefundCorrectionAction {
    return isStringUnionValue<PaymentRefundCorrectionAction>(value, paymentRefundCorrectionActionOptions)
    ? value
    : "partial_refund";
}

export function normalizedPaymentRefundCorrectionMethod(value: unknown): PaymentRefundCorrectionMethod {
    return isStringUnionValue<PaymentRefundCorrectionMethod>(value, paymentRefundCorrectionMethodOptions)
    ? value
    : "card";
}

export function normalizedClinicalRuleAction(value: unknown): Dashboard["clinicalRules"][number]["action"] {
    return isRecordKey<Dashboard["clinicalRules"][number]["action"]>(value, clinicalRuleActionLabels as Record<Dashboard["clinicalRules"][number]["action"], unknown>)
    ? value
    : "add_required_service";
}

export function normalizedClinicalRuleSeverity(value: unknown): Dashboard["clinicalRules"][number]["severity"] {
    return isRecordKey<Dashboard["clinicalRules"][number]["severity"]>(value, clinicalRuleSeverityLabels as Record<Dashboard["clinicalRules"][number]["severity"], unknown>) ? value : "warning";
}

export function normalizedServiceCategory(value: unknown): Dashboard["serviceCatalog"][number]["category"] {
    return isRecordKey<Dashboard["serviceCatalog"][number]["category"]>(value, serviceCategoryLabels as Record<Dashboard["serviceCatalog"][number]["category"], unknown>) ? value : "therapy";
}

export async function preparePricelistImage(file: File): Promise<{
    	base64: string;
    	mimeType: PricelistImageMimeType;
    	note: string;
    }> {
    if (!pricelistImageMimeTypes.includes(file.type as PricelistImageMimeType)) {
    	throw new Error("Поддерживаются JPEG, PNG или WebP.");
    }

    const dataUrl = await readFileAsDataUrl(file);
    const image = await loadImageFromDataUrl(dataUrl);
    const originalLongestSide = Math.max(image.naturalWidth, image.naturalHeight);
    const outputMimeType: PricelistImageMimeType = "image/jpeg";
    for (const maxSide of [1600, 1200, 900, 720]) {
    	const scale = Math.min(1, maxSide / originalLongestSide);
    	const width = Math.max(1, Math.round(image.naturalWidth * scale));
    	const height = Math.max(1, Math.round(image.naturalHeight * scale));
    	const canvas = document.createElement("canvas");
    	canvas.width = width;
    	canvas.height = height;
    	const context = canvas.getContext("2d");
    	if (!context) throw new Error("Canvas недоступен для сжатия изображения.");
    	context.fillStyle = "#ffffff";
    	context.fillRect(0, 0, width, height);
    	context.drawImage(image, 0, 0, width, height);

    	for (const quality of [0.82, 0.72, 0.62]) {
    		const compressed = canvas.toDataURL(outputMimeType, quality);
    		const base64 = compressed.split(",")[1] ?? "";
    		if (base64.length <= maxPricelistImageBase64Chars) {
    			const megapixels = ((width * height) / 1_000_000).toFixed(1);
    			return {
    				base64,
    				mimeType: outputMimeType,
    				note: `Фото подготовлено: ${width}x${height}, ${megapixels} Мп, JPEG ${Math.round(quality * 100)}%.`,
    			};
    		}
    	}
    }

    throw new Error(
    	"Фото прайса слишком большое даже после сжатия. Нужен более четкий фрагмент страницы.",
    );
}

export const smartImportModeLabels: Record<
    	SmartImportMode,
    	{ title: string; detail: string }
    > = {
    	auto: {
    		title: "Авто",
    		detail: "Автоматически классифицирует пациентов, снимки и сопутствующие данные.",
    	},
    	mixed: {
    		title: "Смешанный экспорт",
    		detail: "Пациенты + снимки из одной старой программы.",
    	},
    	patients: {
    		title: "Только пациенты",
    		detail: "Принудительно отправить строки в базу пациентов.",
    	},
    	imaging: {
    		title: "Только снимки",
    		detail: "Принудительно разобрать как RVG/ОПТГ/КТ.",
    	},
    };
export const importSourceLabels: Record<
    	ImportSourceKind,
    	{ title: string; detail: string }
    > = {
    	csv_text: {
    		title: "Таблица / Excel",
    		detail: "Копипаст таблицы или списка с разделителями.",
    	},
    	xlsx_copy: {
    		title: "Excel-вставка",
    		detail: "Строки из Excel или Google Sheets без ручной подготовки.",
    	},
    	mis_export: {
    		title: "Экспорт старой МИС",
    		detail:
    			"32top, IDENT, Cliniccards, Open Dental и другие форматы через адаптеры.",
    	},
    	image_ocr: {
    		title: "Фото журнала",
    		detail:
    			"OCR/vision распознает фото бумажного журнала, затем показывает предпросмотр.",
    	},
    	voice_dictation: {
    		title: "Диктовка",
    		detail: "Надиктовка администратора превращается в строки пациентов.",
    	},
    	free_text: {
    		title: "Свободный текст",
    		detail: "Умный разбор: ФИО, телефон, дата рождения, комментарий.",
    	},
    };
export const ingestionTargetLabels: Record<DocumentIngestionTarget, string> = {
    	smart_import: "Умный импорт",
    	patients: "Пациенты",
    	imaging: "Снимки",
    	pricelist: "Прайс",
    	plain_text: "Текст",
    };
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
export const paymentRefundCorrectionActionOptions: readonly PaymentRefundCorrectionAction[] = [
    		"full_refund",
    		"partial_refund",
    		"payment_transfer",
    		"receipt_correction",
    		"payer_details_correction",
    	];
export const paymentRefundCorrectionMethodOptions: readonly PaymentRefundCorrectionMethod[] = ["cash", "card", "bank_transfer", "internal_offset", "no_money_movement"];
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
export const recommendedActionPriorityLabels: Record<
    	Dashboard["recommendedActions"][number]["priority"],
    	string
    > = {
    	routine: "план",
    	important: "важно",
    	urgent: "срочно",
    };
