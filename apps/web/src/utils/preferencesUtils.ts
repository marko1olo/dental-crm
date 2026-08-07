import type {
	AiJobKind,
	AiRecognitionTarget,
	Appointment,
	DentalSpecialty,
	DenteTelegramOutboxDeliveryStatus,
	DenteTelegramSubjectType,
	DenteTelegramTemplateKind,
	DocumentIngestionTarget,
	DocumentIssueSignatureMode,
	GeneratedDocument,
	ImagingSourceKind,
	ImagingStudyKind,
	ImportSourceKind,
	OnboardingStep,
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
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../lib/safeLocalStorage";

export type TelegramLinkSubjectType = DenteTelegramSubjectType;

export type TelegramOutboxStatusFilter =
	| DenteTelegramOutboxDeliveryStatus
	| "all"
	| "due";

export type TelegramOutboxTemplateFilter = "all" | DenteTelegramTemplateKind;

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

export function loadUiPreferences(): UiPreferences {
	if (typeof window === "undefined") return defaultUiPreferences;
	try {
		const raw = safeLocalStorageGetItem(uiPreferencesStorageKey);
		if (!raw) return defaultUiPreferences;
		const parsed = JSON.parse(raw) as Partial<UiPreferences>;
		return {
			...defaultUiPreferences,
			...parsed,
		};
	} catch {
		return defaultUiPreferences;
	}
}

export function saveUiPreferences(
	preferences: UiPreferencesInput,
): UiPreferences | null {
	if (typeof window === "undefined") return null;
	try {
		const full: UiPreferences = {
			version: 1,
			...preferences,
			savedAt: new Date().toISOString(),
		};
		safeLocalStorageSetItem(uiPreferencesStorageKey, JSON.stringify(full));
		return full;
	} catch {
		return null;
	}
}
