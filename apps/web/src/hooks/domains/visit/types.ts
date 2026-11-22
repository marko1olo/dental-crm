import type {
	AcceptVisitDraftResponse,
	Dashboard,
	DentalSpecialty,
	Patient,
	SpeechChunkUploadInput,
	SpeechGatewayHealthReport,
	SpeechGatewayStatus,
	SpeechProviderRuntimeStatus,
	SpeechRecordingAssembly,
	SpeechRecordingRecoveryList,
	SpeechRecordingStrategy,
	SpeechTranscriptionResponse,
	SpeechTranscriptPolishResponse,
	StaffMember,
	VisitCloseChecklist,
	VisitCloseChecklistItem,
	VisitDraftAutosaveResponse,
	VisitFlowResult,
	VisitNoteDraft,
} from "@dental/shared";
import type React from "react";
import type { VisitNoteField, VisitNoteForm } from "../../../AppHelpers";
import type { VisitStore } from "../../../store/visitStore";

export interface ClinicalAuthClient {
	denteClinicalMutationHeaders: (headers?: Record<string, string>) => Record<string, string>;
	denteClinicalReadHeaders: (headers?: Record<string, string>) => Record<string, string>;
	getHeaders?: (() => HeadersInit) | undefined;
}

export interface UseVisitLogicParams {
	dashboard?: Dashboard | null;
	query?: string;
	setError: (err: string | null) => void;
	auth: ClinicalAuthClient;
	setDashboard: React.Dispatch<React.SetStateAction<Dashboard | null>>;
	setQuery?: (query: string) => void;
	selectedPatientId?: string;
	documentPatient?: Patient | null | undefined;
	activePatient?: Patient | null | undefined;
	activeAppointment?: unknown;
	activeDoctor?: StaffMember | null | undefined;
	activeChair?: unknown;
	paymentPatientContextReady?: boolean;
	paymentPatientContextMessage?: string;
	loadDashboard?: () => Promise<void>;
	clinicProfileDraft?: unknown;
	patientCoreDraft?: unknown;
	documentPatientMatchesActiveVisit?: boolean;
	activeOrganizationId?: string | null;
	importSourceKind?: unknown;
	setImportSourceKind?: (val: unknown) => void;
	importText?: string;
	setImportText?: React.Dispatch<React.SetStateAction<string>>;
	setImportPreview?: (val: unknown) => void;
	setImportCommit?: (val: unknown) => void;
}

export type VisitStoreSlice = VisitStore;

export interface UseVisitSpeechParams {
	auth: ClinicalAuthClient;
	setError: (err: string | null) => void;
	dashboard: Dashboard | null;
	activeOrganizationId: string | null;
	isOnline: boolean;
	selectedSpecialty: DentalSpecialty;
	appendVisitDictationText: (value: string) => void;
	setImportSourceKind?: ((val: unknown) => void) | undefined;
	setImportText?: React.Dispatch<React.SetStateAction<string>> | undefined;
	setImportPreview?: ((val: unknown) => void) | undefined;
	setImportCommit?: ((val: unknown) => void) | undefined;
}

export interface UseVisitSpeechRecordingParams {
	dashboard: Dashboard | null;
	activeOrganizationId: string | null;
	isOnline: boolean;
	selectedSpecialty: DentalSpecialty;
	speechGatewayStatus: SpeechGatewayStatus | null;
	setError: (err: string | null) => void;
	setSpeechStatusNote: (note: string | null) => void;
	appendVisitDictationText: (value: string) => void;
	submitSpeechChunk: (input: SpeechChunkUploadInput) => Promise<SpeechTranscriptionResponse>;
	applySpeechTranscription: (result: SpeechTranscriptionResponse) => void;
	refreshPendingSpeechChunkState: () => Promise<void>;
	setImportSourceKind?: ((val: unknown) => void) | undefined;
	setImportText?: React.Dispatch<React.SetStateAction<string>> | undefined;
	setImportPreview?: ((val: unknown) => void) | undefined;
	setImportCommit?: ((val: unknown) => void) | undefined;
}

export interface UseVisitSpeechRecordingReturn {
	mediaRecorderRef: React.MutableRefObject<MediaRecorder | null>;
	mediaStreamRef: React.MutableRefObject<MediaStream | null>;
	speechAudioContextRef: React.MutableRefObject<AudioContext | null>;
	speechAnalyserRef: React.MutableRefObject<AnalyserNode | null>;
	speechMonitorTimerRef: React.MutableRefObject<number | null>;
	speechRecordingIdRef: React.MutableRefObject<string | null>;
	speechChunkIndexRef: React.MutableRefObject<number>;
	speechSegmentStartedAtRef: React.MutableRefObject<number>;
	speechLastSoundAtRef: React.MutableRefObject<number>;
	speechPendingChunkDurationMsRef: React.MutableRefObject<number | null>;
	startVisitDictation: () => void;
	stopVisitDictation?: (() => void) | undefined;
	preferredSpeechMimeType: () => string;
	uploadSpeechBlob: (blob: Blob) => Promise<void>;
	stopSpeechMonitor: () => void;
	requestSpeechChunk: (reason: "silence" | "max_time" | "manual") => void;
	startSpeechMonitor: (stream: MediaStream, recorder: MediaRecorder, status: SpeechGatewayStatus | null) => void;
	startImportDictation: () => void;
}

export interface UseVisitSpeechReturn extends UseVisitSpeechRecordingReturn {
	speechUploadPromisesRef: React.MutableRefObject<Set<Promise<void>>>;
	appliedSpeechChunkKeysRef: React.MutableRefObject<Set<string>>;
	speechProviderRuntimeById: Map<string, SpeechProviderRuntimeStatus>;
	speechProviderHealthById: Map<string, Record<string, unknown>>;
	activeSpeechProviderHealth: Record<string, unknown> | null;
	loadSpeechGatewayStatus: (options?: { silent?: boolean }) => Promise<SpeechGatewayStatus | null>;
	loadSpeechGatewayHealthReport: (options?: { silent?: boolean }) => Promise<void>;
	loadSpeechProviderRuntimeStatuses: (options?: { silent?: boolean }) => Promise<void>;
	loadSpeechRecordingStrategy: (options?: { silent?: boolean }) => Promise<void>;
	loadSpeechRecordingRecovery: (options?: { silent?: boolean }) => Promise<void>;
	refreshSpeechRuntime: (options?: { silent?: boolean }) => Promise<void>;
	refreshPendingSpeechChunkState: () => Promise<void>;
	submitSpeechChunk: (input: SpeechChunkUploadInput) => Promise<SpeechTranscriptionResponse>;
	speechChunkApplyKey: (result: SpeechTranscriptionResponse) => string;
	speechTranscriptionMatchesActiveVisit: (result: SpeechTranscriptionResponse) => boolean;
	applySpeechTranscription: (result: SpeechTranscriptionResponse) => void;
	assembleSpeechRecording: (recordingId: string, options?: { silent?: boolean }) => Promise<SpeechRecordingAssembly | null>;
	trackSpeechUpload: (upload: Promise<void>) => void;
	waitForSpeechUploads: () => Promise<void>;
	finalizeSpeechRecording: (recordingId: string) => Promise<void>;
	flushPendingSpeechChunks: (options?: { silent?: boolean }) => Promise<void>;
	startVisitDictation: () => void;
	stopVisitDictation?: (() => void) | undefined;
	preferredSpeechMimeType: () => string;
	uploadSpeechBlob: (blob: Blob) => Promise<void>;
	stopSpeechMonitor: () => void;
	requestSpeechChunk: (reason: "silence" | "max_time" | "manual") => void;
	startSpeechMonitor: (stream: MediaStream, recorder: MediaRecorder, status: SpeechGatewayStatus | null) => void;
	startImportDictation: () => void;
}

export interface UseVisitAutosaveParams {
	auth: ClinicalAuthClient;
	setError: (err: string | null) => void;
	dashboard: Dashboard | null;
	isOnline: boolean;
	transcript: string;
	selectedSpecialty: DentalSpecialty;
	visitNoteForm: VisitNoteForm;
	hasVisitNoteFormText: boolean;
	lastServerDraftSignatureRef: React.MutableRefObject<string | null>;
	setServerDraftSyncState: (state: "saved" | "saving" | "queued" | "error") => void;
	setLastServerDraftSavedAt: (savedAt: string | null) => void;
}

export interface UseVisitAutosaveReturn {
	visitDraftSignature: (nextTranscript: string, nextSpecialty: DentalSpecialty, nextForm: VisitNoteForm) => string;
	loadServerVisitDraft: (visitId: string | null | undefined) => Promise<VisitDraftAutosaveResponse>;
	syncVisitDraftAutosave: (clientSavedAt: string, options?: { silent?: boolean }) => Promise<void>;
}

export interface UseVisitOfflineQueueParams {
	auth: ClinicalAuthClient;
	setError: (err: string | null) => void;
	dashboard: Dashboard | null;
	setDashboard: React.Dispatch<React.SetStateAction<Dashboard | null>>;
	activeOrganizationId: string | null;
	setDraft: (draft: VisitNoteDraft | null) => void;
	setVisitNoteForm: React.Dispatch<React.SetStateAction<VisitNoteForm>>;
	setLastVisitSaveReceipt: (receipt: AcceptVisitDraftResponse["saveReceipt"] | null) => void;
	setPendingVisitSaveCount: (count: number) => void;
	setLastPendingVisitSaveAt: (at: string | null) => void;
	isPendingVisitSyncing: boolean;
	setIsPendingVisitSyncing: (syncing: boolean) => void;
	isDraftAccepting: boolean;
	setIsDraftAccepting: (accepting: boolean) => void;
	hasVisitNoteFormText: boolean;
	visitNoteForm: VisitNoteForm;
	draft: VisitNoteDraft | null;
	transcript: string;
	selectedSpecialty: DentalSpecialty;
	visitNoteAcceptMissingSteps: string[];
	visitNoteReadyToAccept: boolean;
	scrollToVisitArea: (selector: string) => void;
	isDraftAcceptingLocalRef: React.MutableRefObject<boolean>;
}

export interface UseVisitOfflineQueueReturn {
	refreshPendingVisitSaveState: () => Promise<void>;
	applyAcceptedVisitResponse: (result: AcceptVisitDraftResponse) => void;
	submitAcceptedVisitDraft: (
		visitId: string | null | undefined,
		draftToAccept: VisitNoteDraft,
		doctorSummary: string | null,
		options?: {
			clientMutationId?: string | null;
			baseRevision?: number | null;
			clientSavedAt?: string | null;
		},
	) => Promise<AcceptVisitDraftResponse>;
	flushPendingVisitSaves: (options?: { silent?: boolean }) => Promise<void>;
	acceptDraftToVisit: () => Promise<void>;
}

export interface UseVisitNotesParams {
	auth: ClinicalAuthClient;
	setError: (err: string | null) => void;
	dashboard: Dashboard | null;
	activePatient?: Patient | null | undefined;
	activeDoctor?: StaffMember | null | undefined;
	speechGatewayStatus: SpeechGatewayStatus | null;
	scrollToVisitArea: (selector: string) => void;
}

export interface UseVisitNotesReturn {
	visitCloseChecklist: VisitCloseChecklist | null;
	visitWarnings: VisitCloseChecklistItem[];
	primaryVisitWarning: VisitCloseChecklistItem | null;
	savedVisitNoteForm: VisitNoteForm;
	isVisitNoteDirty: boolean;
	hasVisitNoteFormText: boolean;
	hasVisitTranscriptText: boolean;
	visitDraftBuildMissingSteps: string[];
	visitDraftReadyToBuild: boolean;
	visitNoteAcceptMissingSteps: string[];
	visitNoteReadyToAccept: boolean;
	visitNoteActionLabel: string;
	visitNoteStatusLabel: string;
	visitHasSavedNote: boolean;
	appendToTranscript: (text: string) => void;
	appendVisitDictationText: (value: string) => void;
	updateVisitNoteField: (field: VisitNoteField | string, value: string) => void;
	buildOfflineDraft: () => void;
	openVisitWarningAction: () => void;
	polishTranscript: () => Promise<void>;
	buildDraft: () => Promise<void>;
	clearTranscriptWithUndo: () => void;
	undoTranscriptClear: () => void;
}

export interface UseVisitSpeechTranscriptionParams {
	auth: {
		denteClinicalReadHeaders: (extra?: Record<string, string>) => Record<string, string>;
		denteClinicalMutationHeaders: (extra?: Record<string, string>) => Record<string, string>;
	};
	setError: (err: string | null) => void;
	dashboard: Dashboard | null;
	activeOrganizationId: string | null;
	isOnline: boolean;
	loadSpeechGatewayStatus: (options?: { silent?: boolean }) => Promise<SpeechGatewayStatus | null>;
	loadSpeechRecordingRecovery: (options?: { silent?: boolean }) => Promise<void>;
	applySpeechTranscription: (result: SpeechTranscriptionResponse) => void;
	refreshPendingSpeechChunkState: () => Promise<void>;
}

export type UseVisitLogicReturn = VisitStoreSlice &
	UseVisitSpeechReturn &
	UseVisitAutosaveReturn &
	UseVisitOfflineQueueReturn &
	UseVisitNotesReturn & {
		isOnline: boolean;
		speechGatewayHealthReport: SpeechGatewayHealthReport | null;
		speechGatewayStatus: SpeechGatewayStatus | null;
		speechProviderRuntimeStatuses: SpeechProviderRuntimeStatus[] | null;
		speechRecordingStrategy: SpeechRecordingStrategy | null;
		speechRecordingRecovery: SpeechRecordingRecoveryList | null;
		pendingSpeechChunkCount: number;
		speechStatusNote: string | null;
		isImportDictating: boolean;
		scrollToVisitArea: (areaId: string) => void;
	};
