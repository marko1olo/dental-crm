import type {
	AcceptVisitDraftResponse,
	Appointment,
	Chair,
	ClinicalRuleAction,
	ClinicalRuleEvaluation,
	ClinicalRuleSeverity,
	ClinicalRuleSummary,
	Dashboard,
	DentalSpecialty,
	GeneratedDocument,
	ImagingStudy,
	ImagingStudyKind,
	Patient,
	PatientInsight,
	ProtocolTemplate,
	SpeechGatewayStatus,
	StaffMember,
	StaffRole,
	VisitCloseChecklistItem,
	VisitNoteDraft,
} from "@dental/shared";
import type React from "react";
import type { VisitNoteField, VisitNoteForm } from "../../../AppHelpers";
export type { VisitNoteField, VisitNoteForm };
import type { ToothState } from "../../../store/visit/types";
import type { TreatmentPlanLike } from "../visitPlanStageHandoff";

export type VisitLoadedTreatmentPlan = TreatmentPlanLike;

export type VisitDashboardEntity = (Dashboard & {
	organization?: {
		name?: string;
		phone?: string;
		address?: string;
		inn?: string;
		ogrn?: string;
		licenseNumber?: string;
		[key: string]: unknown;
	} | null;
	[key: string]: unknown;
}) | null;

export type VisitIconComponent = React.ComponentType<{
	size?: number | string;
	className?: string;
	"aria-hidden"?: boolean | "true" | "false";
}>;

export interface VisitClinicalRulePanelComponentProps {
	actionLabels: Record<ClinicalRuleAction, string>;
	context: "visit" | "finance";
	evaluations: ClinicalRuleEvaluation[];
	patientId?: string | null;
	serviceTitle: (serviceId: string) => string;
	severityLabels: Record<ClinicalRuleSeverity, string>;
	staffRoleLabels: Record<StaffRole, string>;
	summary: ClinicalRuleSummary;
}

export interface VisitPatientEntity
	extends Omit<
		Partial<Patient>,
		| "id"
		| "fullName"
		| "birthDate"
		| "phone"
		| "address"
		| "allergies"
		| "somaticNotes"
		| "chronicDiseases"
	> {
	id: string;
	fullName: string;
	name?: string | undefined;
	birthDate?: string | null | undefined;
	phone?: string | null | undefined;
	address?: string | null | undefined;
	activeTreatmentPlanId?: string | null | undefined;
	allergies?: string | null | undefined;
	allergyHistory?: string | null | undefined;
	somaticNotes?: string | null | undefined;
	somaticHistory?: string | null | undefined;
	concomitantDiseases?: string | null | undefined;
	chronicDiseases?: string | null | undefined;
	[key: string]: unknown;
}

export interface VisitAppointmentEntity
	extends Omit<
		Partial<Appointment>,
		| "id"
		| "patientId"
		| "doctorUserId"
		| "chairId"
		| "status"
		| "startsAt"
		| "endsAt"
		| "reason"
		| "diagnosisMkb10"
		| "clinicalStage"
		| "toothNumber"
	> {
	id: string;
	patientId: string;
	doctorUserId?: string | null | undefined;
	chairId?: string | null | undefined;
	status?: Appointment["status"] | "signed" | "closed" | string | undefined;
	startsAt?: string | null | undefined;
	endsAt?: string | null | undefined;
	startTime?: string | null | undefined;
	startAt?: string | null | undefined;
	createdAt?: string | null | undefined;
	date?: string | null | undefined;
	reason?: string | null | undefined;
	diagnosisMkb10?: string | null | undefined;
	clinicalStage?: string | null | undefined;
	stageIndex?: number | null | undefined;
	toothNumber?: number | null | undefined;
	treatmentPlanId?: string | null | undefined;
	stageNumber?: number | null | undefined;
	stageTitle?: string | null | undefined;
	stageId?: string | null | undefined;
	[key: string]: unknown;
}

export interface VisitDoctorEntity
	extends Omit<
		Partial<StaffMember>,
		"id" | "fullName" | "role" | "specialty" | "specialties"
	> {
	id?: string | undefined;
	userId?: string | undefined;
	fullName?: string | undefined;
	name?: string | undefined;
	role?: StaffRole | undefined;
	specialty?: DentalSpecialty | string | undefined;
	specialties?: DentalSpecialty[] | undefined;
	[key: string]: unknown;
}

export interface VisitProtocolTemplateItem
	extends Omit<Partial<ProtocolTemplate>, "id" | "title" | "specialty"> {
	id: string;
	title: string;
	specialty: DentalSpecialty | string;
	summary?: string | undefined;
	primaryComplaint?: string | undefined;
	diagnosisICD?: string | undefined;
	[key: string]: unknown;
}

export type VisitNoteFormExtended = VisitNoteForm & {
	status?: string | undefined;
	complaints?: string | undefined;
	objective?: string | undefined;
	treatment?: string | undefined;
	[key: string]: unknown;
};

export interface VisitPrimaryActionConfig {
	label: string;
	detail: string;
	onClick: () => Promise<void> | void;
	kind?: string | undefined;
}

export interface VisitSafetyCard {
	id?: string | undefined;
	title: string;
	detail?: string | undefined;
	severity?: "info" | "warning" | "critical" | "blocker" | string | undefined;
}

export interface VisitWorkflowStep {
	id: string;
	label: string;
	completed?: boolean | undefined;
	active?: boolean | undefined;
}

export interface VisitSpecialtyFocusOption {
	id?: string | undefined;
	specialty: DentalSpecialty | string;
	label: string;
}

export interface VisitNoteFieldDefinitionItem {
	key: VisitNoteField;
	label: string;
	placeholder?: string | undefined;
	rows?: number | undefined;
}

export interface VisitViewProps {
	AlertTriangle: VisitIconComponent;
	Bot: VisitIconComponent;
	Check: VisitIconComponent;
	CheckCircle2: VisitIconComponent;
	ClinicalRulePanel: React.ComponentType<VisitClinicalRulePanelComponentProps>;
	ClipboardCheck: VisitIconComponent;
	Mic: VisitIconComponent;
	Sparkles: VisitIconComponent;
	acceptDraftToVisit: () => Promise<void> | void;
	activeAppointment: VisitAppointmentEntity | null;
	activeChair: Chair | null;
	activeDoctor: VisitDoctorEntity | null;
	activeImagingStudies: ImagingStudy[];
	activePatient: VisitPatientEntity | null;
	activePatientInsight: PatientInsight | null;
	activeUsableDocuments: GeneratedDocument[];
	activeVisitClinicalRuleEvaluations: ClinicalRuleEvaluation[];
	polishingField: VisitNoteField | string | null;
	polishSingleField: (field: VisitNoteField | string) => Promise<void> | void;
	selectedWorkspaceRole: StaffRole | "all";
	activeVisitClinicalRuleSummary: ClinicalRuleSummary;
	appendToTranscript: (text: string) => void;
	applyProtocolTemplate: (template: VisitProtocolTemplateItem) => void;
	buildDraft: () => Promise<void> | void;
	buildOfflineDraft: () => void;
	clearTranscriptWithUndo: () => void;
	clearedTranscriptSnapshot: string | null;
	clinicalRuleActionLabels: Record<ClinicalRuleAction, string>;
	clinicalRuleSeverityLabels: Record<ClinicalRuleSeverity, string>;
	dashboard:
		| (Dashboard & {
				organization?: {
					name?: string;
					phone?: string;
					address?: string;
					inn?: string;
					ogrn?: string;
					licenseNumber?: string;
				} | null;
		  })
		| null;
	dictationQuickPhrases: readonly string[] | null;
	draft: VisitNoteDraft | null;
	emptyDictationVoiceActionLabel: string | null;
	flushPendingSpeechChunks: (options?: { silent?: boolean }) => Promise<void>;
	flushPendingVisitSaves: (options?: { silent?: boolean }) => Promise<void>;
	formatTime: (iso: string | null | undefined) => string;
	handleApplySomaticNormQuick?: (() => void) | undefined;
	handlePolishTranscriptWithAi?: (() => Promise<void> | void) | undefined;
	onOpenLabOrderModal?: (() => void) | undefined;
	onCloseVisit?: (() => void) | undefined;
	visitSubViewTab?: string | undefined;
	onVisitSubViewTabChange?: ((tab: string) => void) | undefined;
	hasVisitTranscriptText: boolean;
	imagingKindLabels: Record<ImagingStudyKind, string>;
	isDraftAccepting: boolean;
	isDraftLoading: boolean;
	isOnline: boolean;
	isPendingVisitSyncing: boolean;
	isServerVoiceRecording: boolean;
	isTranscriptPolishing: boolean;
	isVisitDictating: boolean;
	isVisitNoteDirty: boolean;
	lastLocalSavedAt: string | null;
	lastPendingVisitSaveAt: string | null;
	lastServerDraftSavedAt: string | null;
	lastVisitSaveReceipt: AcceptVisitDraftResponse["saveReceipt"] | null;
	localDraftWasRestored: boolean;
	openVisitWarningAction: () => void;
	pendingSpeechChunkCount: number;
	pendingSpeechFlushActionLabel: string | null;
	pendingSpeechFlushActionTitle: string;
	pendingVisitSaveCount: number;
	polishTranscript: () => Promise<void> | void;
	primaryVisitWarning: VisitCloseChecklistItem | null;
	scrollToVisitArea: (selector: string) => void;
	selectedProtocolTemplate: VisitProtocolTemplateItem | null;
	selectedSpecialty: DentalSpecialty | string;
	serverDraftSyncState: "idle" | "saving" | "saved" | "queued" | "error";
	serviceTitle: ((serviceId: string) => string) | string;
	setClearedTranscriptSnapshot: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	setSelectedProtocolId: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	setSelectedPatientId?: ((id: string | null) => void) | undefined;
	setSelectedSpecialty: (
		val:
			| DentalSpecialty
			| string
			| ((prev: DentalSpecialty) => DentalSpecialty),
	) => void;
	setTranscript: (val: string | ((prev: string) => string)) => void;
	specialtiesWithTemplates: Array<DentalSpecialty | string>;
	specialtyLabels: Record<DentalSpecialty, string>;
	specialtyProtocolTemplates: VisitProtocolTemplateItem[];
	speechGatewayActiveProviderIsLocal: boolean | null;
	speechGatewayStatus: SpeechGatewayStatus | null;
	speechRecognitionReady: boolean | null;
	speechStatusNote: string | null;
	speechTranscriptionBusy: boolean;
	staffRoleLabels: Record<StaffRole, string>;
	startServerVoiceRecording: (() => Promise<void> | void) | null;
	startVisitDictation: () => void;
	stopServerVoiceRecording: (() => Promise<void> | void) | null;
	toothRows: ReadonlyArray<ReadonlyArray<string>>;
	toothStateByCode: Record<string, ToothState | string>;
	transcript: string;
	undoTranscriptClear: () => void;
	updateVisitNoteField: (field: VisitNoteField | string, value: unknown) => void;
	visibleVisitSpecialtyFocusOptions: VisitSpecialtyFocusOption[];
	visitDraftBuildMissingSteps: string[];
	visitDraftMissingFieldLabel: (field: string) => string;
	visitDraftQualityLabels: Record<string, string>;
	visitDraftReadyToBuild: boolean;
	visitDraftSignalLabel: (signal: string) => string;
	visitDraftUserEditedRef: { current: boolean };
	visitNoteAcceptMissingSteps: string[];
	visitNoteActionLabel: string;
	visitNoteFieldDefinitions: readonly VisitNoteFieldDefinitionItem[];
	visitNoteForm: VisitNoteFormExtended;
	visitNoteReadyToAccept: boolean;
	visitNoteStatusLabel: string;
	visitPrimaryAction: VisitPrimaryActionConfig | null;
	visitSafetyCards: VisitSafetyCard[];
	visitSaveReceiptText: (
		receipt: AcceptVisitDraftResponse["saveReceipt"] | null | undefined,
	) => string | null;
	visitWarnings: VisitCloseChecklistItem[];
	visitWorkflowSteps: VisitWorkflowStep[];
	setToothState: (code: string, state: ToothState | string) => void;
	safeSpecialtyLabels?: Record<string, string> | undefined;
	visitCloseChecklist?: VisitCloseChecklistItem[] | undefined;
	openCloseChecklistSection?:
		| ((task: VisitCloseChecklistItem) => void)
		| undefined;
}
