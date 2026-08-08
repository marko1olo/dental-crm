import type {
	AiJobKind,
	AiRecognitionTarget,
	Appointment,
	ClinicalToothRow,
	Dashboard,
	DentalSpecialty,
	DenteTelegramBotMode,
	DenteTelegramFeature,
	DenteTelegramLinkCodePublic,
	DenteTelegramMessagePreview,
	DenteTelegramOutboxResponse,
	DenteTelegramPrivacyMode,
	DenteTelegramVisualCardKey,
	DenteTelegramVisualCardUrls,
	DicomViewerWorkbenchManifestResponse,
	DocumentIngestionResponse,
	DocumentIngestionTarget,
	DocumentIssueSignatureMode,
	DocumentVoidReasonCode,
	GeneratedDocument,
	ImagingSourceKind,
	ImagingStudyKind,
	ImagingViewerAnnotation,
	ImagingViewerSessionState,
	ImportSourceKind,
	InstallmentPaymentStatus,
	MigrationLocalSourceDiscoveryResponse,
	PatientAdministrativeProfile,
	PatientIntakePregnancyStatus,
	PaymentMethod,
	PhotoVideoConsentMaterial,
	PostVisitCareTopic,
	PricelistSourceKind,
	ProcedureSpecificConsentProcedure,
	SmartImportMode,
	SpeechChunkUploadInput,
	SpeechProviderConnector,
	SpeechTranscriptionResponse,
	StaffRole,
	StaffWorkingHours,
	TaxDeductionApplicationDeliveryChannel,
	TaxDeductionApplicationForm,
	TaxDeductionApplicationRelationship,
	TreatmentPlanAcceptanceVariant,
	VisitNoteDraft,
	XrayCbctReferralPregnancyStatus,
	XrayCbctReferralPriority,
	XrayCbctReferralStudyType,
} from "@dental/shared";
import type { CSSProperties } from "react";
import type { MprProjection, MprWindowPreset } from "./imagingUiLabels";
import { readDenteClinicToken } from "./lib/safeLocalStorage";
import type { UiLanguage } from "./store/uiStore";
import type { AppView } from "./utils/routeUtils";

export const imagingSourceLabels: Record<ImagingSourceKind, string> = {
	manual_upload: "Файл",
	dicom_file: "КТ/серия",
	dicomweb: "Архив снимков",
	pacs: "Архив снимков",
	twain_wia: "TWAIN/WIA",
	sensor_bridge: "Датчик",
	folder_watch: "Папка",
};

export const pricelistSourceKindLabels: Record<PricelistSourceKind, string> = {
	text: "Текст",
	ocr_text: "OCR",
	photo_ocr: "Фото",
	spreadsheet_copy: "Таблица",
	manual: "Вручную",
};

export const defaultClinicalToothRowsText =
	"36 | окклюзионная, дистальная | кариес | кариес дентина 36 зуба по осмотру и снимку | восстановление функции и профилактика осложнений | лечение кариеса и композитная реставрация | прогноз зависит от гигиены и контроля | десна без острого воспаления | | ";

export const defaultDicomFirstFrameViewerState: ImagingViewerState = {
	rotationDeg: 0,
	flipHorizontal: false,
	inverted: false,
	brightness: 1,
	contrast: 1,
	zoom: 1,
	panX: 0,
	panY: 0,
	projection: "axial",
	preset: "bone",
};

export const defaultImagingViewerState: ImagingViewerState = {
	rotationDeg: 0,
	flipHorizontal: false,
	inverted: false,
	brightness: 1,
	contrast: 1.08,
	zoom: 1,
	panX: 0,
	panY: 0,
	projection: "axial",
	preset: "bone",
};

export const emptyTelegramVisualCardUrlDrafts =
	(): DenteTelegramVisualCardUrls => ({
		mainMenu: null,
		appointment: null,
		documents: null,
		tax: null,
		billing: null,
		care: null,
		review: null,
		staff: null,
	});

export const emptyVisitNoteForm: VisitNoteForm = {
	complaint: "",
	anamnesis: "",
	objectiveStatus: "",
	diagnosis: "",
	treatmentPlan: "",
};

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

export type SettingsTab = (typeof settingsTabs)[number]["id"];

export const settingsTabs = [
	{ id: "profile", title: "Мой профиль", group: "account" },
	{ id: "clinic", title: "Клиника", group: "main" },
	{ id: "modules", title: "Модули", group: "main" },
	{ id: "staff", title: "Сотрудники", group: "main" },
	{ id: "access", title: "Доступы", group: "main" },
	{ id: "telegram", title: "Мессенджеры", group: "main" },
	{ id: "protocols", title: "Протоколы", group: "clinical" },
	{ id: "rules", title: "Правила", group: "clinical" },
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

export type ImagingViewerState = {
	rotationDeg: number;
	flipHorizontal: boolean;
	inverted: boolean;
	brightness: number;
	contrast: number;
	zoom: number;
	panX: number;
	panY: number;
	projection: MprProjection;
	preset: MprWindowPreset;
};

export type ImagingViewerPlan = {
	label: string;
	mode: "two_d" | "ceph" | "cbct_mpr" | "photo";
	primaryTools: string[];
	presets: string[];
	nextAction: string;
	warnings: string[];
};

export type CbctWorkbenchPlane = {
	key: MprProjection;
	title: string;
	detail: string;
};

export type MprAxisVisualizerStyle = CSSProperties & {
	"--mpr-axis-deg": string;
	"--mpr-slab-width": string;
	"--mpr-slice-position": string;
};

export type ImagingViewerLocalDraft = {
	state: ImagingViewerSessionState;
	annotations: ImagingViewerAnnotation[];
	clientSavedAt: string;
	serverSavedAt: string | null;
};

export type ImagingViewerSaveState =
	| "idle"
	| "local"
	| "saving"
	| "saved"
	| "queued"
	| "error";

export type DicomWorkbenchLocalDraft = {
	manifest: DicomViewerWorkbenchManifestResponse;
	clientSavedAt: string;
	seriesKey: string;
};

export type DicomWorkbenchIndexedDbDraft = DicomWorkbenchLocalDraft & {
	storageKey: string;
	organizationId: string | null;
};

export type MprWorkbenchState = {
	projection: MprProjection;
	axisDeg: number;
	slabMm: number;
	sliceIndex: number;
	windowPreset: MprWindowPreset;
	crosshair: boolean;
	linkedPlanes: boolean;
};

export type MprWorkbenchLocalDraft = {
	version: 1;
	seriesKey: string;
	state: MprWorkbenchState;
	clientSavedAt: string;
};

export type MprWorkbenchIndexedDbDraft = MprWorkbenchLocalDraft & {
	storageKey: string;
	organizationId: string | null;
};

export type LocalImagingFolderDraft = {
	version: 1;
	folderPath: string;
	safeDisplayName: string;
	sourceLabel: string;
	sourceKind: string;
	folderFingerprint: string | null;
	origin: "manual" | "discovery" | "organizer" | "workbench";
	savedAt: string;
};

export type DicomFirstFramePreviewMetadata = Partial<
	Omit<LocalImagingFolderDraft, "version" | "folderPath" | "savedAt">
>;

export type DicomFirstFramePreviewRequestContext = {
	folderPath: string;
	metadata: DicomFirstFramePreviewMetadata;
};

export type DicomFirstFramePreviewOptions = {
	preferredFileIndex?: number;
	resetViewer?: boolean;
};

export type BrowserFileSystemFileHandle = {
	kind: "file";
	name: string;
	getFile: () => Promise<File>;
};

export type BrowserFileSystemDirectoryHandle = {
	kind: "directory";
	name: string;
	entries: () => AsyncIterable<[string, BrowserFileSystemHandle]>;
};

export type BrowserFileSystemHandle =
	| BrowserFileSystemFileHandle
	| BrowserFileSystemDirectoryHandle;

export type BrowserDirectoryPickerWindow = Window & {
	showDirectoryPicker?: (options?: {
		id?: string;
		mode?: "read" | "readwrite";
		startIn?: string;
	}) => Promise<BrowserFileSystemDirectoryHandle>;
};

export type DentalDesktopRuntimeWindow = BrowserDirectoryPickerWindow & {
	dentalCrmDesktop?: { dicomBridge?: unknown; localFileBridge?: unknown };
	__DENTAL_CRM_DESKTOP__?: unknown;
	__TAURI__?: unknown;
	electronAPI?: unknown;
};

export type BrowserPickedImagingFolderPreview = {
	version: 1;
	safeDisplayName: string;
	sourceLabel: string;
	sourceKind: "browser_directory_picker" | "browser_file_input";
	folderFingerprint: string;
	rootName: string;
	scannedFiles: number;
	scannedFolders: number;
	dicomLikeFiles: number;
	archiveFiles: number;
	modelFiles: number;
	imageFiles: number;
	totalBytes: number;
	createdAt: string;
	nextAction: string;
	warnings: string[];
};

export type BrowserPickedImagingScanStats = {
	rootName: string;
	sourceKind: BrowserPickedImagingFolderPreview["sourceKind"];
	scannedFiles: number;
	scannedFolders: number;
	dicomLikeFiles: number;
	archiveFiles: number;
	modelFiles: number;
	imageFiles: number;
	totalBytes: number;
	warnings: string[];
};

export type BrowserImagingScanPhase = "scanning" | "done" | "cancelled";

export type BrowserImagingScanProgress = BrowserPickedImagingScanStats & {
	phase: BrowserImagingScanPhase;
	currentItem: string | null;
	startedAt: string;
	updatedAt: string;
	elapsedMs: number;
	processedUnits: number;
	fileLimit: number;
	folderLimit: number;
	magicReadLimit: number;
};

export type BrowserImagingScanOptions = {
	signal?: AbortSignal;
	startedAt: string;
	onProgress?: (progress: BrowserImagingScanProgress) => void;
};

export type LocalDicomOperationOptions = {
	signal?: AbortSignal;
};

export type BrowserImagingScanRuntime = {
	startedAt: string;
	startedAtMs: number;
	processedUnits: number;
	lastYieldAtMs: number;
	lastProgressAtMs: number;
};

export type BrowserMigrationSourceKind =
	MigrationLocalSourceDiscoveryResponse["candidates"][number]["sourceKind"];

export type BrowserMigrationFileKind =
	| "database"
	| "dump"
	| "table"
	| "archive"
	| "dicom"
	| "image"
	| "model"
	| "other";

export type BrowserMigrationFolderStats = {
	folderKey: string;
	folderHint: string;
	depth: number;
	databaseFiles: number;
	dumpFiles: number;
	tableFiles: number;
	archiveFiles: number;
	dicomLikeFiles: number;
	imageFiles: number;
	modelFiles: number;
	hasDicomDir: boolean;
	latestModifiedAt: string | null;
	totalBytes: number;
};

export type BrowserMigrationScanStats = {
	rootName: string;
	sourceKind: "browser_directory_picker" | "browser_file_input";
	scannedFiles: number;
	scannedFolders: number;
	databaseFiles: number;
	dumpFiles: number;
	tableFiles: number;
	archiveFiles: number;
	dicomLikeFiles: number;
	imageFiles: number;
	modelFiles: number;
	totalBytes: number;
	warnings: string[];
};

export type BrowserMigrationScanPhase = "scanning" | "done" | "cancelled";

export type BrowserMigrationScanProgress = BrowserMigrationScanStats & {
	phase: BrowserMigrationScanPhase;
	currentItem: string | null;
	startedAt: string;
	updatedAt: string;
	elapsedMs: number;
	processedUnits: number;
	fileLimit: number;
	folderLimit: number;
	magicReadLimit: number;
};

export type BrowserMigrationScanOptions = {
	signal?: AbortSignal;
	startedAt: string;
	onProgress?: (progress: BrowserMigrationScanProgress) => void;
};

export type BrowserMigrationScanRuntime = {
	startedAt: string;
	startedAtMs: number;
	processedUnits: number;
	lastYieldAtMs: number;
	lastProgressAtMs: number;
};

export const imagingViewerLocalStoragePrefix = "dental-crm:imaging-viewer:";

export const dicomWorkbenchLocalStorageKey = "dental-crm:dicom-workbench:last";

export const mprWorkbenchLocalStoragePrefix = "dental-crm:ct-mpr-workbench:";

export const localImagingFolderStorageKey =
	"dental-crm:local-imaging-folder:last";

export const browserPickedImagingFolderStorageKey =
	"dental-crm:browser-picked-imaging-folder:last";

export const browserMigrationScanFileLimit = 1200;

export const browserMigrationScanFolderLimit = 320;

export const browserMigrationScanDirectoryEntryLimit = 1600;

export const browserMigrationScanMagicReadLimit = 220;

export const browserMigrationScanYieldEveryUnits = 24;

export const browserMigrationScanYieldEveryMs = 20;

export const browserMigrationScanProgressEveryUnits = 12;

export const browserMigrationScanProgressEveryMs = 96;

export const browserImagingScanFileLimit = 900;

export const browserImagingScanFolderLimit = 260;

export const browserImagingScanDirectoryEntryLimit = 1600;

export const browserImagingScanMagicReadLimit = 180;

export const browserImagingScanYieldEveryUnits = 24;

export const browserImagingScanYieldEveryMs = 20;

export const browserImagingScanProgressEveryUnits = 12;

export const browserImagingScanProgressEveryMs = 96;

export const documentPaymentSelectionStorageKey =
	"dental-crm:document-payment-selection:v1";

export const documentPayloadDraftStorageKey =
	"dental-crm:document-payload-drafts:v1";

export const documentIssueSignatureStorageKey =
	"dental-crm:document-issue-signature:v1";

export const uiPreferencesServerPath = "/api/settings/preferences";

export const onboardingStorageKey = "dental-crm:onboarding:v1";

export const clinicProfileEndpoint = "/api/settings/clinic/profile";

export const denteAdminSecretHeaderName = "x-dente-admin-secret";

export const localConvenienceRetentionMs = 30 * 24 * 60 * 60 * 1000;

export const sensitiveLocalDraftRetentionMs = 7 * 24 * 60 * 60 * 1000;

export const speechAudioQueueRetentionMs = 48 * 60 * 60 * 1000;

export type DocumentPaymentSelectionEntry = {
	paymentIds: string[];
	savedAt: string;
};

export type DocumentPaymentSelectionStore = {
	version: 1;
	selections: Record<string, DocumentPaymentSelectionEntry>;
};

export type Outpatient025uDocumentDraftFields = {
	recordExtractPeriodStart: string;
	recordExtractPeriodEnd: string;
	recordExtractSourceVisitIds: string;
	recordExtractComplaintAndAnamnesis: string;
	recordExtractObjectiveStatus: string;
	recordExtractDiagnosis: string;
	recordExtractTreatmentProvided: string;
	recordExtractRecommendations: string;
	recordExtractDoctorFullName: string;
	recordExtractPreparedFromSignedRecords: boolean;
	outpatient025uMedicalCardNumber: string;
	outpatient025uOpenedAt: string;
	outpatient025uPatientSexCode: "1" | "2" | "unknown";
	outpatient025uCitizenship: string;
	outpatient025uRegistrationUrbanRuralCode: "1" | "2" | "unknown";
	outpatient025uStayUrbanRuralCode: "1" | "2" | "unknown";
	outpatient025uOmsIssuedAt: string;
	outpatient025uInsurerName: string;
	outpatient025uSocialSupportCode: string;
	outpatient025uHealthStatusDisclosureContact: string;
	outpatient025uEmploymentCode: string;
	outpatient025uDisabilityGroup: string;
	outpatient025uWorkOrStudyPlace: string;
	outpatient025uPalliativeCareNeedCode: string;
	outpatient025uBloodGroup: string;
	outpatient025uRhFactor: string;
	outpatient025uKellK1: string;
	outpatient025uOtherBloodData: string;
	outpatient025uAllergyHistory: string;
	outpatient025uFinalEpicrisis: string;
	outpatient025uOfficialForm274nChecked: boolean;
	outpatient025uThirdPartyDataChecked: boolean;
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
	kind: "outpatient_medical_card_025u" | "medical_record_extract";
	patientId: string;
	visitId: string | null;
	savedAt: string;
	fields:
		| Outpatient025uDocumentDraftFields
		| MedicalRecordExtractDocumentDraftFields;
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

export const dicomDownloadRedactionWarning =
	"Скачанный пакет скрывает локальные пути снимков; перед загрузкой пикселей переподключите папку или устройство на рабочей станции.";

export const browserMigrationSourceTitles: Record<
	BrowserMigrationSourceKind,
	string
> = {
	mis_database: "Старая МИС или CRM",
	firebird_database: "Старая серверная база программы",
	access_database: "Старая настольная база",
	sqlite_database: "Локальная база программы",
	sql_dump: "Резервная копия старой базы",
	spreadsheet_export: "Табличная выгрузка",
	csv_export: "табличная выгрузка",
	archive_export: "Архив выгрузки",
	pacs_dicom: "архив снимков",
	dicom_folder: "папка КЛКТ/КТ",
	xray_image_archive: "Архив RVG/ОПТГ/фото",
	vendor_imaging_system: "Программа снимков",
	network_share: "Сетевая папка обмена",
	unknown_legacy_source: "Неопознанный источник старой системы",
};

export const browserLegacyMisTextPattern =
	/1c|1с|\.1cd\b|мис|инфоклиника|infoclinica|infodent|инфодент|дента\s*офис|denta\s*office|clinic\s*cards|cliniccards|dental\s*4\s*windows|d4w|dental4windows|dental\s*pro|dentpro|dental\s*soft|dentasoft|dental\s*cloud|clinic\s*365|clinic365|medangel|медангел|medialog|медиалог|arnica|арника|sycret\s*dent|secret\s*dent|адента|adenta|dent\s*crm\s*24|dentcrm24|dent\.crm24|клиентикс|clientix|klientix|2v.*(?:стоматолог|dental)|future\s*it\s*dent|futureitdent|32\s*top|32top|medods|медодс|dental\s*tap|dentaltap|(?:^|[\\/])ident(?:[\\/]|$)|\bident\b|stomx|stom\s*x|стомx|стомикс|i[-\s]?stom|ай\s*стом|q[-\s]?stoma|кью\s*стома|бит\.?\s*стоматолог|bit\.?\s*stomatolog|1c.*стоматолог|1с.*стоматолог|mac\s*dent|macdent|stom\s*box|stombox|open\s*dent(?:al)?|opendental|opendent|open\s*dent\s*images|atoz|dentrix|eaglesoft|patterson|softdent|practice\s*works|curve\s*dental|denticon|tab32|dolphin\s*(?:imaging|management)|legacy|старая\s+баз/i;

export const imagingViewerPlans: Record<ImagingStudyKind, ImagingViewerPlan> = {
	periapical: {
		label: "RVG / прицельный",
		mode: "two_d",
		primaryTools: ["window/level", "invert", "rotate", "zoom", "measure"],
		presets: ["endo", "caries", "implant"],
		nextAction: "Смотреть локально; ИИ-описание только как черновик.",
		warnings: [
			"Не заменяет диагноз врача.",
			"Измерения требуют калибровки датчика.",
		],
	},
	bitewing: {
		label: "Интерпроксимальный снимок",
		mode: "two_d",
		primaryTools: ["window/level", "invert", "zoom", "compare"],
		presets: ["caries", "bone"],
		nextAction: "Смотреть локально; удобно для кариеса и контактов.",
		warnings: ["Сравнение серий требует одинаковой проекции."],
	},
	opg: {
		label: "ОПТГ / панорама",
		mode: "two_d",
		primaryTools: ["window/level", "invert", "rotate", "zoom", "measure"],
		presets: ["bone", "teeth", "implant"],
		nextAction:
			"2D-просмотрщик достаточен для обзора; КТ открывать отдельным рабочим местом срезов.",
		warnings: ["Панорама имеет искажения; линейные измерения проверять по КТ."],
	},
	ceph: {
		label: "ТРГ / цефалометрия",
		mode: "ceph",
		primaryTools: ["window/level", "rotate", "zoom", "landmarks"],
		presets: ["soft", "bone", "airway"],
		nextAction:
			"Для ортодонтии нужен отдельный цефалометрический анализ с точками и углами.",
		warnings: ["Точки/углы не должны автозаполняться без проверки врача."],
	},
	cbct: {
		label: "КЛКТ / КТ",
		mode: "cbct_mpr",
		primaryTools: ["MPR", "axial", "coronal", "sagittal", "panoramic curve"],
		presets: ["bone", "implant", "endo"],
		nextAction:
			"Открывать в просмотре КЛКТ/КТ-срезов; здесь только быстрый предпросмотр.",
		warnings: [
			"Нельзя диагностировать КЛКТ по одной плоской картинке.",
			"Нужны срезы серии, предварительная подготовка и полноценный просмотрщик КТ.",
		],
	},
	photo: {
		label: "Фото",
		mode: "photo",
		primaryTools: ["zoom", "rotate", "brightness", "contrast"],
		presets: ["clinical", "shade", "before/after"],
		nextAction:
			"Фото можно использовать для коммуникации и черновиков документов.",
		warnings: ["Цвет зависит от света и камеры."],
	},
	other: {
		label: "Другое изображение",
		mode: "two_d",
		primaryTools: ["zoom", "rotate", "brightness", "contrast"],
		presets: ["neutral"],
		nextAction:
			"Проверить источник и привязку к пациенту перед использованием.",
		warnings: ["Неизвестный тип требует ручной проверки."],
	},
};

export const imagingSourceChoices: ImagingSourceKind[] = [
	"folder_watch",
	"sensor_bridge",
	"dicom_file",
	"dicomweb",
	"pacs",
	"twain_wia",
	"manual_upload",
];

export const smartImportModeLabels: Record<
	SmartImportMode,
	{ title: string; detail: string }
> = {
	auto: {
		title: "Авто",
		detail: "Сам разделит пациентов, снимки и мусор.",
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

export const documentIngestionQualityLabels: Record<
	DocumentIngestionResponse["quality"]["extractionQuality"],
	string
> = {
	ready: "Можно открыть предпросмотр",
	review: "Нужна ручная проверка",
	ocr_required: "Нужен OCR / vision",
	unsupported: "Формат не разобран",
};

export const telegramBlockedReasonLabels: Record<string, string> = {
	missing_patient_portal_base_url: "Не настроена ссылка на портал пациента.",
	missing_clinic_review_url: "Не настроена ссылка клиники для отзывов.",
	phi_requires_consent:
		"Шаблон содержит медданные и требует согласий перед отправкой.",
	telegram_bot_disabled: "Telegram выключен в настройках клиники.",
	telegram_bot_token_missing:
		"В серверных настройках клиники не подключен бот Telegram.",
	encrypted_chat_transport_missing_or_unreadable:
		"Чат пациента еще не привязан или защищенная ссылка недоступна.",
	patient_or_staff_not_linked_to_telegram:
		"Чат еще не связан через QR-код или одноразовую ссылку.",
	post_visit_recommendation_document_not_issued:
		"Сначала выпустите памятку после приема.",
	telegram_outbox_item_not_found_or_no_longer_open:
		"Задача уже не доступна для отправки.",
	telegram_outbox_already_sent: "Это сообщение уже отправлено.",
	telegram_outbox_not_due_yet: "Время отправки еще не наступило.",
	telegram_outbox_preview_empty: "В сообщении нет текста для отправки.",
	telegram_delivery_processing: "Отправка уже обрабатывается.",
	telegram_transport_failed:
		"Telegram не принял сообщение. Проверьте подключение бота, сеть и связанный чат.",
	// Без этих двух строк telegramHumanMessage не находит подписи и выдаёт общее «Нужна проверка
	// настройки Telegram», то есть отправляет оператора чинить настройки при полностью исправных
	// настройках. Для частичной доставки это ещё и опасно: оператор жмёт «отправить» снова, и пациент
	// получает фото второй раз.
	telegram_photo_sent_text_failed:
		"Фото уже доставлено пациенту, а текст под ним не ушёл. Повторная отправка дошлёт только текст — фото заново не уйдёт.",
	telegram_outbox_schedule_unreadable:
		"Время отправки в задаче не распознано как дата. Сообщение не отправлено; исправьте время в задаче коммуникации.",
};

export const telegramWarningLabels: Record<string, string> = {
	idempotent_replay: "Повторная отправка распознана и не продублирована.",
};

export const documentDetectedKindLabels: Record<string, string> = {
	archive: "архив",
	csv: "таблица",
	docx: "документ Word",
	html: "веб-страница",
	image: "изображение",
	json: "структурированный текст",
	legacy_database: "старая база",
	legacy_dump: "резервная копия старой базы",
	ods: "таблица",
	odt: "документ",
	pdf: "PDF",
	pptx: "презентация",
	rtf: "текстовый документ",
	spreadsheet: "таблица",
	text: "текст",
	unknown: "не определено",
	xlsx: "таблица Excel",
	xml: "структурированный текст",
	zip: "архив",
};

export const dicomFirstFrameStatusLabels: Record<string, string> = {
	ready: "готово",
	unsupported: "не поддерживается",
	not_found: "не найдено",
};

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

export type BrowserSpeechRecognition = {
	continuous: boolean;
	interimResults: boolean;
	lang: string;
	onend: (() => void) | null;
	onerror: (() => void) | null;
	onresult:
		| ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void)
		| null;
	start: () => void;
};

export type BrowserWindowWithSpeech = Window &
	typeof globalThis & {
		SpeechRecognition?: new () => BrowserSpeechRecognition;
		webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
		webkitAudioContext?: typeof AudioContext;
	};

export type VisitNoteField =
	| "complaint"
	| "anamnesis"
	| "objectiveStatus"
	| "diagnosis"
	| "treatmentPlan";

export type VisitNoteForm = Record<VisitNoteField, string>;

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

export const speechQualityLabels: Record<
	SpeechTranscriptionResponse["chunk"]["quality"]["level"],
	string
> = {
	clear: "чисто",
	review: "проверить",
	empty: "пусто",
	failed: "сбой",
};

export type VisitLocalDraft = {
	version: 1;
	visitId: string;
	savedAt: string;
	transcript: string;
	selectedSpecialty: DentalSpecialty;
	visitNoteForm: VisitNoteForm;
};

export type PendingVisitSave = {
	version: 1;
	id: string;
	organizationId: string | null;
	visitId: string;
	clientMutationId: string;
	baseRevision: number | null;
	queuedAt: string;
	draft: VisitNoteDraft;
	doctorSummary: string | null;
	transcript: string;
	selectedSpecialty: DentalSpecialty;
};

export type PendingSpeechChunk = SpeechChunkUploadInput & {
	version: 1;
	id: string;
	organizationId: string | null;
	queuedAt: string;
};

export type PersistenceHealth = {
	enabled: boolean;
	filePath: string;
	exists: boolean;
	version: number | null;
	savedAt: string | null;
	checksum: string | null;
	backupDirectoryPath: string;
	backupCount: number;
	latestBackupAt: string | null;
	latestBackupSizeBytes: number | null;
	maxBackupCount: number;
};

export type PersistenceBackupCheck = {
	fileName: string;
	savedAt: string;
	sizeBytes: number;
	fileHash: string | null;
	checksumVerified: boolean | null;
	readable: boolean;
	warning: string | null;
};

export type PersistenceIntegrityReport = {
	ok: boolean;
	checkedAt: string;
	stateFileHash: string | null;
	checksumVerified: boolean | null;
	stateCounts: Record<string, number>;
	backups: PersistenceBackupCheck[];
	warnings: string[];
	nextAction: string;
};

export const pendingVisitSaveQueueKey = "dental-crm:pending-visit-saves";

export const pendingSpeechChunkQueueKey = "dental-crm:pending-speech-chunks";

export const speechChunkDbName = "dental-crm-offline";

export const speechChunkDbVersion = 4;

export const pendingVisitSaveStoreName = "pendingVisitSaves";

export const dicomWorkbenchDraftStoreName = "dicomWorkbenchDrafts";

export const mprWorkbenchDraftStoreName = "mprWorkbenchDrafts";

export const speechChunkStoreName = "pendingSpeechChunks";

export const speechLocalStorageFallbackMaxBytes = 4_000_000;

export const requiredSpeechChunkDbStoreNames = [
	pendingVisitSaveStoreName,
	dicomWorkbenchDraftStoreName,
	mprWorkbenchDraftStoreName,
	speechChunkStoreName,
] as const;

export const speechChunkDbPromise: Promise<IDBDatabase> | null = null;

export type TelegramOutboxStatusFilter =
	| DenteTelegramOutboxResponse["items"][number]["deliveryStatus"]
	| "all"
	| "due";

export type TelegramOutboxTemplateFilter =
	| DenteTelegramMessagePreview["templateKind"]
	| "all";

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

export const telegramPublicUrlSensitiveQueryKeys = new Set([
	"patient",
	"patientid",
	"patient_id",
	"pid",
	"fio",
	"name",
	"phone",
	"tel",
	"email",
	"inn",
	"snils",
	"passport",
	"visit",
	"visitid",
	"visit_id",
	"appointment",
	"appointmentid",
	"appointment_id",
	"document",
	"documentid",
	"document_id",
	"doc",
	"diagnosis",
	"tooth",
	"treatment",
	"payment",
	"receipt",
	"order",
	"token",
	"code",
]);

export const telegramPublicUrlSensitivePathSegments = new Set([
	"patient",
	"patients",
	"person",
	"people",
	"visit",
	"visits",
	"appointment",
	"appointments",
	"document",
	"documents",
	"medical-record",
	"medical-records",
	"record",
	"records",
	"tax",
	"payment",
	"payments",
	"receipt",
	"receipts",
	"order",
	"orders",
	"token",
	"code",
	"passport",
	"snils",
	"inn",
]);

export const onboardingTelegramVisualCardKeys: DenteTelegramVisualCardKey[] = [
	"mainMenu",
	"appointment",
	"documents",
	"tax",
	"billing",
	"care",
	"review",
	"staff",
];

export type TelegramFeaturePlan = {
	productName: string;
	botUsername: string | null;
	modes: string[];
	enabledFeatures: DenteTelegramFeature[];
	patientSafeActions: string[];
	staffSafeActions: string[];
	blockedByDefault: string[];
};

export type TelegramLinkSubjectType = "patient" | "staff";

export const telegramModeLabels: Record<DenteTelegramBotMode, string> = {
	disabled: "выключен",
	shared_dente_bot: "общий бот платформы",
	clinic_owned_bot: "бот клиники",
};

export const telegramModeHints: Record<DenteTelegramBotMode, string> = {
	disabled: "Telegram не создает новые задачи и не отправляет сообщения.",
	shared_dente_bot:
		"Одна общая основа: клиника определяется QR-кодом и связкой пациента.",
	clinic_owned_bot:
		"Собственный бот клиники: имя сохраняется в настройках, секрет бота хранится в серверных настройках клиники.",
};

export const telegramPrivacyModeLabels: Record<
	DenteTelegramPrivacyMode,
	string
> = {
	no_phi_by_default: "Без медицинских данных в Telegram",
	limited_admin_only: "Только административные сведения",
	consented_phi_templates: "Чувствительные шаблоны только по согласию",
};

export const telegramPrivacyModeHints: Record<
	DenteTelegramPrivacyMode,
	string
> = {
	no_phi_by_default:
		"В чат уходят только статусы, время, ссылки и общие памятки.",
	limited_admin_only:
		"Разрешены административные статусы без диагноза, снимков и документов.",
	consented_phi_templates:
		"Режим для будущих шаблонов с явным согласием пациента и аудитом.",
};

export const telegramTemplateLabels: Record<
	DenteTelegramMessagePreview["templateKind"],
	string
> = {
	appointment_reminder: "напоминание о приеме",
	appointment_confirmation: "подтверждение приема",
	payment_reminder_notice: "напоминание об оплате",
	document_ready_notice: "документ готов",
	tax_document_request_status: "статус налоговой справки",
	callback_request_received: "заявка на звонок",
	post_visit_instruction_link: "памятка после приема",
	post_visit_checkup: "контроль после приема",
	recall_notice: "профилактический recall",
	review_request: "просьба оставить отзыв",
	staff_daily_digest: "сводка сотруднику",
};

export const telegramClassificationLabels: Record<
	DenteTelegramMessagePreview["classification"],
	string
> = {
	no_phi: "без медтайны",
	limited_admin: "административное",
	phi_requires_consent: "медданные только с согласием",
};

export const telegramDeliveryStatusLabels: Record<
	DenteTelegramOutboxResponse["items"][number]["deliveryStatus"],
	string
> = {
	ready: "готово",
	needs_chat_link: "нужно подключить Telegram",
	blocked_by_policy: "заблокировано политикой",
	transport_not_ready: "отправка не готова",
	disabled: "выключено",
};

export const telegramLinkCodeStatusLabels: Record<
	DenteTelegramLinkCodePublic["status"],
	string
> = {
	pending: "ожидает",
	used: "использован",
	expired: "истек",
	revoked: "отозван",
};

export const telegramOutboxStatusFilterOptions: TelegramOutboxStatusFilter[] = [
	"all",
	"due",
	"ready",
	"needs_chat_link",
	"transport_not_ready",
	"blocked_by_policy",
	"disabled",
];

export const telegramOutboxStatusFilterLabels: Record<
	TelegramOutboxStatusFilter,
	string
> = {
	all: "вся очередь",
	due: "к отправке сейчас",
	...telegramDeliveryStatusLabels,
};

export const telegramOutboxTemplateFilterOptions: TelegramOutboxTemplateFilter[] =
	[
		"all",
		...(Object.keys(
			telegramTemplateLabels,
		) as DenteTelegramMessagePreview["templateKind"][]),
	];

export const telegramOutboxTemplateFilterLabels: Record<
	TelegramOutboxTemplateFilter,
	string
> = {
	all: "все сценарии",
	...telegramTemplateLabels,
};

export type TelegramInlineButtonPreview = {
	text: string;
	target: string;
	kind: "url" | "callback" | "unknown";
};

export const telegramInlineButtonKindLabels: Record<
	TelegramInlineButtonPreview["kind"],
	string
> = {
	url: "ссылка",
	callback: "действие",
	unknown: "кнопка",
};

export type OnboardingStep =
	| "intro"
	| "role"
	| "clinic"
	| "legal"
	| "team"
	| "sources"
	| "telegram"
	| "done";

export const onboardingStepValues: readonly OnboardingStep[] = [
	"intro",
	"role",
	"clinic",
	"legal",
	"team",
	"sources",
	"telegram",
	"done",
];

export type ClinicProfileDraft = {
	clinicName: string;
	legalName: string;
	inn: string;
	kpp: string;
	ogrn: string;
	address: string;
	phone: string;
	email: string;
	website: string;
	medicalLicenseNumber: string;
	medicalLicenseIssuedAt: string;
	medicalLicenseIssuer: string;
	bankDetails: string;
	signatoryName: string;
	signatoryTitle: string;
	timezone: string;
	defaultVisitMinutes: string;
	workdayStart: string;
	workdayEnd: string;
	workingDays: number[];
	appointmentBufferMinutes: string;
	egiszEnabled: boolean;
};

export type ClinicProfileSaveState = "idle" | "saving" | "saved" | "error";

export type PatientCoreDraft = {
	fullName: string;
	birthDate: string;
	phone: string;
	email: string;
	notes: string;
};

export type PatientCoreSaveState = "idle" | "saving" | "saved" | "error";

export type PatientAdministrativeProfileDraft = {
	[K in Exclude<
		keyof PatientAdministrativeProfile,
		"preferredAppointmentWeekdays"
	>]: string;
} & {
	preferredAppointmentWeekdays: number[];
};

export type PatientAdministrativeProfileSaveState =
	| "idle"
	| "saving"
	| "saved"
	| "error";

export type StaffScheduleDraft = {
	start: string;
	end: string;
	workingDays: number[];
	perDay: StaffWorkingHours;
};

export type StaffScheduleSaveState = "idle" | "saving" | "saved" | "error";

export type AppointmentScheduleDraft = {
	patientId: string;
	doctorUserId: string;
	assistantUserId: string;
	chairId: string;
	status: Appointment["status"];
	startsAt: string;
	endsAt: string;
	reason: string;
	comment: string;
};

export type AppointmentScheduleSaveState =
	| "idle"
	| "saving"
	| "saved"
	| "error";

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

export const xrayPriorityOptions: readonly XrayCbctReferralPriority[] = [
	"routine",
	"urgent",
];

export const outpatient025uDemographicCodeOptions = [
	"1",
	"2",
	"unknown",
] as const;

export type Outpatient025uDemographicCode =
	(typeof outpatient025uDemographicCodeOptions)[number];

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
	{ value: "knd_1151156", label: "КНД 1151156, расходы с 2024" },
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

export const xrayStudyTypeOptions: Array<{
	value: XrayCbctReferralStudyType;
	label: string;
}> = [
	{ value: "rvg", label: "RVG / прицельный" },
	{ value: "opg", label: "ОПТГ" },
	{ value: "cbct", label: "КЛКТ / КТ" },
	{ value: "trg", label: "ТРГ" },
	{ value: "tmj", label: "ВНЧС" },
	{ value: "sinus", label: "Пазуха" },
	{ value: "photo_protocol", label: "Фотопротокол" },
	{ value: "other", label: "Другое" },
];

export const xrayPregnancyStatusOptions: Array<{
	value: XrayCbctReferralPregnancyStatus;
	label: string;
}> = [
	{ value: "not_applicable", label: "Не применимо" },
	{ value: "denied", label: "Со слов пациента нет" },
	{ value: "possible", label: "Возможна" },
	{ value: "confirmed", label: "Подтверждена" },
	{ value: "unknown", label: "Не уточнено" },
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

export const technicalWorkflowFailurePattern =
	/\b(TypeError|DOMException|SyntaxError|ReferenceError|Failed to fetch|NetworkError|Load failed|fetch|JSON|ENOENT|EACCES|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|stack|undefined|null|NaN|[A-Z][A-Z0-9_]{5,})\b|\/api\/|https?:\/\/|[A-Za-z]:\\|\\\\[^\\]+\\|\/(Users|home|var|tmp)\//i;

export type OnboardingDismissalState = {
	dismissed: boolean;
	savedAt: string;
	draftMode: boolean;
};

export const weekdayOptions = [
	{ value: 1, label: "Пн" },
	{ value: 2, label: "Вт" },
	{ value: 3, label: "Ср" },
	{ value: 4, label: "Чт" },
	{ value: 5, label: "Пт" },
	{ value: 6, label: "Сб" },
	{ value: 0, label: "Вс" },
];

export const defaultWorkingDays = [1, 2, 3, 4, 5];

export type PricelistImageMimeType = "image/jpeg" | "image/png" | "image/webp";

export const pricelistImageMimeTypes: PricelistImageMimeType[] = [
	"image/jpeg",
	"image/png",
	"image/webp",
];

export const maxPricelistImageBase64Chars = 3_800_000;

export type DenteTelegramPortalSection =
	| "home"
	| "documents"
	| "tax"
	| "billing"
	| "care"
	| "schedule";

export type DenteTelegramHandoffTarget = {
	section: DenteTelegramPortalSection;
	view: AppView;
	hash: AppView;
	title: string;
	detail: string;
	documentKind?: GeneratedDocument["kind"];
};

export const denteTelegramHandoffTargets: Record<
	DenteTelegramPortalSection,
	DenteTelegramHandoffTarget
> = {
	home: {
		section: "home",
		view: "shift",
		hash: "shift",
		title: "Рабочий стол клиники",
		detail:
			"Открыт стартовый экран клиники: ближайшие приемы, готовность команды, быстрые действия и рабочие настройки.",
	},
	documents: {
		section: "documents",
		view: "documents",
		hash: "documents",
		title: "Документы",
		detail: "Открыт раздел договоров, согласий, справок и архивов.",
		documentKind: "patient_intake_questionnaire",
	},
	tax: {
		section: "tax",
		view: "documents",
		hash: "documents",
		title: "Налоговые документы",
		detail: "Открыт раздел КНД 1151156, заявлений, справок и фискальных оплат.",
		documentKind: "tax_deduction_certificate",
	},
	billing: {
		section: "billing",
		view: "finance",
		hash: "finance",
		title: "Оплаты",
		detail: "Открыт раздел оплат, чеков, счетов и налоговых реквизитов.",
	},
	care: {
		section: "care",
		view: "communications",
		hash: "communications",
		title: "Связь и памятки",
		detail:
			"Открыта очередь связи: запросы памяток, инструкции после приема и задачи администратора.",
	},
	schedule: {
		section: "schedule",
		view: "schedule",
		hash: "schedule",
		title: "Расписание",
		detail:
			"Открыта очередь записей, фильтры врачей, ассистентов и кресел сохранены.",
	},
};

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

/*
 * Вкладки настроек.
 *
 * Семь панелей были смонтированы в SettingsView под идентификаторы, которых в
 * этом списке не было: inventory, modules, insurance, reporting, marketing,
 * bpmn и messengers. Кнопки не рисовались (панель строится из этого массива),
 * setSettingsTab с такими значениями нигде не звался, а ручной переход по
 * адресу вида #settings/inventory откидывало на «Клинику»
 * (settingsTabFromHash пропускает только то, что здесь перечислено).
 *
 * То есть 2713 строк готовых экранов и рабочие маршруты сервера были
 * недоступны пользователю целиком. Рядом стояли фильтры вида
 * `if (!flags.hasInventoryModule) ... filter(t => t.id !== "inventory")` —
 * они отсеивали элемент, которого в списке нет, и работали вхолостую.
 *
 * Лишнего маленькая клиника по-прежнему не увидит: показ каждой новой вкладки
 * решает свой признак модуля в SettingsView, а не этот список.
 *
 * Вкладка мессенджеров переименована из «ТГ-бот»: за ней давно живут ещё
 * WhatsApp и MAX, но по названию об этом никто не догадывался.
 */
/*
 * Разделы левого списка настроек.
 *
 * Группа объявлена прямо у вкладки, а не отдельным списком в разметке. Так
 * было: SettingsView раскладывал вкладки по группам своими списками
 * идентификаторов вида `["clinic", "staff", "access"].includes(t.id)`. Любая
 * вкладка, не упомянутая ни в одном таком списке, просто исчезала из левого
 * меню — молча, потому что забыть дописать идентификатор в четвёртом по счёту
 * месте ничего не стоит. Именно так пропала кнопка настроек Telegram: раздел
 * работал и открывался по адресу, но нажать на него было негде.
 */
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

export const onboardingSteps: Array<{
	id: OnboardingStep;
	title: string;
	detail: string;
}> = [
	{ id: "intro", title: "Режим запуска", detail: "демо или чистая" },
	{ id: "clinic", title: "Клиника", detail: "название и телефон" },
	{ id: "team", title: "Команда", detail: "первый врач и кресло" },
	{ id: "telegram", title: "ТГ-бот", detail: "бот, QR и отзывы" },
	{ id: "done", title: "Готово", detail: "проверка и старт" },
];

export const roleFocusOrder: StaffRole[] = [
	"doctor",
	"administrator",
	"assistant",
	"manager",
	"owner",
];

export const speechProviderConnectorLabels: Record<
	SpeechProviderConnector,
	string
> = {
	client_only: "браузер",
	server_wired: "сервер",
	server_cataloged: "каталог",
	local_bridge: "локальный модуль",
	local_planned: "локально",
};

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
