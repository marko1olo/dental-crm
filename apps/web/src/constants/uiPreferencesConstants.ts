import type {
	AiJobKind,
	AiRecognitionTarget,
	Appointment,
	DentalSpecialty,
	DocumentIngestionTarget,
	DocumentIssueSignatureMode,
	GeneratedDocument,
	ImagingSourceKind,
	ImagingStudyKind,
	ImportSourceKind,
	OdontogramViewMode,
	PaymentMethod,
	PostVisitCareTopic,
	PricelistSourceKind,
	ProcedureSpecificConsentProcedure,
	SmartImportMode,
	StaffRole,
	TaxDeductionApplicationDeliveryChannel,
	TaxDeductionApplicationForm,
	UiLanguage,
} from "@dental/shared";
import { readDenteClinicToken } from "../lib/safeLocalStorage";
import type { OnboardingStep } from "./onboardingConstants";
import type {
	TelegramLinkSubjectType,
	TelegramOutboxStatusFilter,
	TelegramOutboxTemplateFilter,
} from "./telegramConstants";

export const defaultUiPreferences: UiPreferences = {
	version: 1,
	uiLanguage: "ru",
	selectedWorkspaceRole: "owner",
	selectedSpecialty: "therapist",
	selectedProtocolId: null,
	selectedPatientId: null,
	scheduleDoctorFilterId: null,
	scheduleAssistantFilterId: null,
	scheduleChairFilterId: null,
	scheduleDefaultDoctorUserId: null,
	scheduleDefaultAssistantUserId: null,
	scheduleDefaultChairId: null,
	scheduleStatusFilter: "all",
	scheduleDateFilter: "",
	paymentMethod: "card",
	taxDocumentYear: new Date().getFullYear(),
	selectedDocumentKind: "patient_intake_questionnaire",
	taxApplicationForm: "knd_1151156",
	taxApplicationDeliveryChannel: "paper",
	paymentReceiptTaxSupportRequested: false,
	documentIssueSignatureMode: "paper_signed",
	documentIssueStaffFullName: "",
	documentIssueStaffRole: "Врач/администратор",
	procedureConsentProcedureType: "implantation_bone_graft",
	postVisitCareTopic: "filling_restoration",
	pricelistSourceKind: "spreadsheet_copy",
	usePricelistAi: false,
	odontogramUseSurfaces: false,
	odontogramViewMode: "anatomical_svg",
	recognitionKind: "voice_transcription",
	recognitionTarget: "visit_note",
	importSourceKind: "csv_text",
	documentIngestionTarget: "smart_import",
	imagingImportSourceKind: "folder_watch",
	smartImportMode: "auto",
	imagingKindFilter: "all",
	dicomWebEndpointUrl: "http://127.0.0.1:8042/dicom-web",
	ohifBaseUrl: "http://127.0.0.1:3000",
	telegramBotConfigId: "",
	telegramLinkSubjectType: "patient",
	telegramLinkStaffId: null,
	telegramOutboxStatusFilter: "all",
	telegramOutboxTemplateFilter: "all",
	onboardingDismissed: false,
	onboardingDismissedAt: null,
	onboardingStep: "intro",
	onboardingDraftMode: false,
	savedAt: "",
};

export type UiPreferences = {
	version: 1;
	uiLanguage: UiLanguage;
	selectedWorkspaceRole: StaffRole;
	selectedSpecialty: DentalSpecialty;
	selectedProtocolId: string | null;
	selectedPatientId: string | null;
	scheduleDoctorFilterId: string | null;
	scheduleAssistantFilterId: string | null;
	scheduleChairFilterId: string | null;
	scheduleDefaultDoctorUserId: string | null;
	scheduleDefaultAssistantUserId: string | null;
	scheduleDefaultChairId: string | null;
	scheduleStatusFilter: Appointment["status"] | "all";
	scheduleDateFilter: string;
	paymentMethod: PaymentMethod;
	taxDocumentYear: number;
	selectedDocumentKind: GeneratedDocument["kind"];
	taxApplicationForm: TaxDeductionApplicationForm;
	taxApplicationDeliveryChannel: TaxDeductionApplicationDeliveryChannel;
	paymentReceiptTaxSupportRequested: boolean;
	documentIssueSignatureMode: DocumentIssueSignatureMode;
	documentIssueStaffFullName: string;
	documentIssueStaffRole: string;
	procedureConsentProcedureType: ProcedureSpecificConsentProcedure;
	postVisitCareTopic: PostVisitCareTopic;
	pricelistSourceKind: PricelistSourceKind;
	usePricelistAi: boolean;
	odontogramUseSurfaces: boolean;
	odontogramViewMode: OdontogramViewMode;
	recognitionKind: AiJobKind;
	recognitionTarget: AiRecognitionTarget;
	importSourceKind: ImportSourceKind;
	documentIngestionTarget: DocumentIngestionTarget;
	imagingImportSourceKind: ImagingSourceKind;
	smartImportMode: SmartImportMode;
	imagingKindFilter: ImagingStudyKind | "all";
	dicomWebEndpointUrl: string;
	ohifBaseUrl: string;
	telegramBotConfigId: string;
	telegramLinkSubjectType: TelegramLinkSubjectType;
	telegramLinkStaffId: string | null;
	telegramOutboxStatusFilter: TelegramOutboxStatusFilter;
	telegramOutboxTemplateFilter: TelegramOutboxTemplateFilter;
	onboardingDismissed: boolean;
	onboardingDismissedAt: string | null;
	onboardingStep: OnboardingStep;
	onboardingDraftMode: boolean;
	savedAt: string;
};

export type UiPreferencesInput = Omit<UiPreferences, "version" | "savedAt">;

export const uiPreferencesStorageKey = "dental-crm:web-ui-preferences:v1";

export type SettingsTab = (typeof settingsTabs)[number]["id"];

export const settingsTabs = [
	{ id: "profile", title: "Мой профиль", group: "account" },
	{ id: "preferences", title: "Клинические пресеты", group: "clinical" },
	{ id: "clinic", title: "Клиника", group: "main" },
	{ id: "modules", title: "Модули", group: "main" },
	{ id: "staff", title: "Сотрудники", group: "main" },
	{ id: "access", title: "Доступы", group: "main" },
	{ id: "telegram", title: "Мессенджеры", group: "main" },
	{ id: "hardware", title: "Оборудование", group: "main" },
	{ id: "protocols", title: "Протоколы", group: "clinical" },
	{ id: "rules", title: "Правила", group: "clinical" },
	{ id: "procedure-boms", title: "Технологические карты", group: "clinical" },
	{ id: "prices", title: "Прайс", group: "clinical" },
	{ id: "ai", title: "ИИ", group: "clinical" },
	{ id: "insurance", title: "Страховые", group: "stock" },
	{ id: "marketing", title: "Отзывы и NPS", group: "marketing" },
	{ id: "bpmn", title: "Сценарии", group: "marketing" },
	{ id: "sources", title: "Источники", group: "system" },
	{ id: "reporting", title: "Отчёты", group: "system" },
	{ id: "imports", title: "Импорт", group: "system" },
	{ id: "audit", title: "Аудит", group: "system" },
] as const;

export const uiPreferencesServerPath = "/api/settings/preferences";

export const denteAdminSecretHeaderName = "x-dente-admin-secret";

export const localConvenienceRetentionMs = 30 * 24 * 60 * 60 * 1000;

export const sensitiveLocalDraftRetentionMs = 7 * 24 * 60 * 60 * 1000;

export const uiLanguageLabels: Record<UiLanguage, string> = {
	ru: "Русский",
	en: "English",
};

export type UiLanguageOption = {
	value: UiLanguage;
	label: string;
	detail: string;
};

export const defaultUiLanguageOption: UiLanguageOption = {
	value: "ru",
	label: uiLanguageLabels.ru,
	detail:
		"Русский интерфейс включен сейчас. Выбор сохраняется автоматически и остается до смены языка.",
};

export const uiLanguageOptions: UiLanguageOption[] = [defaultUiLanguageOption];

export const technicalWorkflowFailurePattern =
	/\b(TypeError|DOMException|SyntaxError|ReferenceError|Failed to fetch|NetworkError|Load failed|fetch|JSON|ENOENT|EACCES|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|stack|undefined|null|NaN|[A-Z][A-Z0-9_]{5,})\b|\/api\/|https?:\/\/|[A-Za-z]:\\|\\\\[^\\]+\\|\/(Users|home|var|tmp)\//i;

export const settingsTabGroups = [
	{ id: "account", title: "Мой аккаунт" },
	{ id: "main", title: "Основные" },
	{ id: "clinical", title: "Клинические" },
	{ id: "stock", title: "Учёт" },
	{ id: "marketing", title: "Маркетинг" },
	{ id: "system", title: "Системные" },
] as const;

export type SettingsTabGroup = (typeof settingsTabGroups)[number]["id"];

export type AdminSecretSessionDomain =
	| "clinical"
	| "settings"
	| "schedule"
	| "telegram";

export type AdminSecretUnlockDomain = AdminSecretSessionDomain | "all";

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
export const initialUiPreferences = {} as any;

export const auth = {
	denteClinicalReadHeaders: (
		customHeaders: Record<string, string> = {},
		adminSecret?: string,
	): Record<string, string> => {
		const token = readDenteClinicToken();
		const headers: Record<string, string> = { ...customHeaders };
		if (token) headers["x-dente-clinic-token"] = token;
		if (adminSecret) headers["x-dente-admin-secret"] = adminSecret;
		return headers;
	},
	denteClinicalMutationHeaders: (
		customHeaders: Record<string, string> = {},
		adminSecret?: string,
	): Record<string, string> => {
		const token = readDenteClinicToken();
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			...customHeaders,
		};
		if (token) headers["x-dente-clinic-token"] = token;
		if (adminSecret) headers["x-dente-admin-secret"] = adminSecret;
		return headers;
	},
};
