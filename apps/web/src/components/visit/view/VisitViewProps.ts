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
import type { ToothState } from "../../../store/visit/types";

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
	name?: string;
	birthDate?: string | null;
	phone?: string | null;
	address?: string | null;
	activeTreatmentPlanId?: string | null;
	allergies?: string | null;
	allergyHistory?: string | null;
	somaticNotes?: string | null;
	somaticHistory?: string | null;
	concomitantDiseases?: string | null;
	chronicDiseases?: string | null;
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
	doctorUserId?: string | null;
	chairId?: string | null;
	status?: Appointment["status"] | "signed" | "closed" | string;
	startsAt?: string | null;
	endsAt?: string | null;
	startTime?: string | null;
	startAt?: string | null;
	createdAt?: string | null;
	date?: string | null;
	reason?: string | null;
	diagnosisMkb10?: string | null;
	clinicalStage?: string | null;
	stageIndex?: number | null;
	toothNumber?: number | null;
	treatmentPlanId?: string | null;
	stageNumber?: number | null;
	stageTitle?: string | null;
	stageId?: string | null;
}

export interface VisitDoctorEntity
	extends Omit<
		Partial<StaffMember>,
		"id" | "fullName" | "role" | "specialty" | "specialties"
	> {
	id?: string;
	userId?: string;
	fullName?: string;
	name?: string;
	role?: StaffRole;
	specialty?: DentalSpecialty | string;
	specialties?: DentalSpecialty[];
}

export interface VisitProtocolTemplateItem
	extends Omit<Partial<ProtocolTemplate>, "id" | "title" | "specialty"> {
	id: string;
	title: string;
	specialty: DentalSpecialty | string;
	summary?: string;
	primaryComplaint?: string;
	diagnosisICD?: string;
}

export interface VisitNoteFormExtended extends VisitNoteForm {
	status?: string | undefined;
	complaints?: string | undefined;
	objective?: string | undefined;
	treatment?: string | undefined;
}

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
	updateVisitNoteField: (field: VisitNoteField | string, value: string) => void;
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
