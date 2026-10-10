import type { CSSProperties } from "react";
import type {
	AcceptVisitDraftResponse,
	AiJobKind,
	AiRecognitionTarget,
	Appointment,
	ClinicalToothRow,
	CreateAppointmentInput,
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
	DicomSeriesPreviewGroup,
	DicomViewerToolStateBundleResponse,
	DicomViewerWorkbenchManifestResponse,
	DocumentIngestionResponse,
	DocumentIngestionTarget,
	DocumentIssueSignatureMode,
	DocumentVoidReasonCode,
	GeneratedDocument,
	ImagingSourceKind,
	ImagingStudyKind,
	ImagingViewerAnnotation,
	ImagingViewerImplantPlan,
	ImagingViewerSessionState,
	ImagingViewerWindowPreset,
	ImportSourceKind,
	InstallmentPaymentStatus,
	OdontogramViewMode,
	Patient,
	PatientIntakePregnancyStatus,
	PaymentMethod,
	PhotoVideoConsentMaterial,
	PostVisitCareTopic,
	PricelistSourceKind,
	ProcedureSpecificConsentProcedure,
	SmartImportMode,
	SpeechChunkUploadInput,
	SpeechGatewayStatus,
	SpeechProviderConnector,
	SpeechTranscriptionResponse,
	TaxDeductionApplicationDeliveryChannel,
	TaxDeductionApplicationForm,
	TaxDeductionApplicationRelationship,
	TreatmentPlanAcceptanceVariant,
	UiLanguage,
	UpdateAppointmentInput,
	UpdatePatientInput,
	VisitNoteDraft,
	XrayCbctReferralPregnancyStatus,
	XrayCbctReferralPriority,
	XrayCbctReferralStudyType,
} from "@dental/shared";
import type { CtImplantLibraryItem } from "../ctPlanningTools";
import type { MprProjection, MprWindowPreset } from "../imagingUiLabels";
import type { AppView } from "../utils/routeUtils";
import type {
	ClinicProfileDraft,
	PatientAdministrativeProfileDraft,
	StaffScheduleDraft,
} from "../utils/clinicProfileUtils";

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

export type VisitNoteForm = Record<VisitNoteField, string> & {
	recommendations?: string;
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

export type TelegramOutboxStatusFilter =
	| DenteTelegramOutboxResponse["items"][number]["deliveryStatus"]
	| "all"
	| "due";

export type TelegramOutboxTemplateFilter =
	| DenteTelegramMessagePreview["templateKind"]
	| "all";

export type UiLanguageOption = {
	value: UiLanguage;
	label: string;
	detail: string;
};

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

export type TelegramInlineButtonPreview = {
	text: string;
	target: string;
	kind: "url" | "callback" | "unknown";
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

export type ClinicProfileSaveState = "idle" | "saving" | "saved" | "error";

export type PatientCoreDraft = {
	fullName: string;
	birthDate: string;
	phone: string;
	email: string;
	notes: string;
};

export type PatientCoreSaveState = "idle" | "saving" | "saved" | "error";

export type PatientAdministrativeProfileSaveState =
	| "idle"
	| "saving"
	| "saved"
	| "error";

export type StaffScheduleSaveState = "idle" | "saving" | "saved" | "error";

export type AppointmentScheduleDraft = {
	patientId: string;
	doctorUserId: string;
	assistantUserId?: string | null;
	chairId: string;
	status: Appointment["status"];
	startsAt: string;
	endsAt: string;
	reason?: string;
	comment?: string;
	notes?: string;
	cancellationReason?: string;
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

export type ClinicalToothSurface = ClinicalToothRow["surfaces"][number];

export type ClinicalToothStatus = ClinicalToothRow["status"];

export type OnboardingDismissalState = {
	dismissed: boolean;
	savedAt: string;
	draftMode: boolean;
};

export type PricelistImageMimeType = "image/jpeg" | "image/png" | "image/webp";

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

export type AdminSecretSessionDomain =
	| "clinical"
	| "settings"
	| "schedule"
	| "telegram";

export type AdminSecretUnlockDomain = AdminSecretSessionDomain | "all";

export type {
	ClinicProfileDraft,
	PatientAdministrativeProfileDraft,
	StaffScheduleDraft,
};
