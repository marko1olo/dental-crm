import type {
	AcceptVisitDraftResponse,
	Dashboard,
	DentalSpecialty,
	SpeechChunkUploadInput,
	SpeechGatewayHealthReport,
	SpeechGatewayStatus,
	SpeechProviderRuntimeStatus,
	SpeechRecordingAssembly,
	SpeechRecordingRecoveryList,
	SpeechRecordingStrategy,
	SpeechTranscriptionResponse,
	SpeechTranscriptPolishResponse,
	VisitDraftAutosaveResponse,
	VisitFlowResult,
	VisitNoteDraft,
} from "@dental/shared";
import type React from "react";
import type { VisitNoteField, VisitNoteForm } from "../../../AppHelpers";
import type { useVisitStore } from "../../../store/visitStore";

export interface UseVisitLogicParams {
	dashboard?: Dashboard | null;
	query?: string;
	setError: (err: string | null) => void;
	// biome-ignore lint/suspicious/noExplicitAny: auth client carries headers
	auth: any;
	setDashboard: React.Dispatch<React.SetStateAction<Dashboard | null>>;
	setQuery?: (query: string) => void;
	selectedPatientId?: string;
	// biome-ignore lint/suspicious/noExplicitAny: patient documents
	documentPatient?: any;
	// biome-ignore lint/suspicious/noExplicitAny: active patient entity
	activePatient?: any;
	// biome-ignore lint/suspicious/noExplicitAny: appointment entity
	activeAppointment?: any;
	// biome-ignore lint/suspicious/noExplicitAny: doctor entity
	activeDoctor?: any;
	// biome-ignore lint/suspicious/noExplicitAny: chair entity
	activeChair?: any;
	paymentPatientContextReady?: boolean;
	paymentPatientContextMessage?: string;
	loadDashboard?: () => Promise<void>;
	// biome-ignore lint/suspicious/noExplicitAny: drafts
	clinicProfileDraft?: any;
	// biome-ignore lint/suspicious/noExplicitAny: drafts
	patientCoreDraft?: any;
	documentPatientMatchesActiveVisit?: boolean;
	activeOrganizationId?: string | null;
	// biome-ignore lint/suspicious/noExplicitAny: import kind
	importSourceKind?: any;
	// biome-ignore lint/suspicious/noExplicitAny: import setter
	setImportSourceKind?: (val: any) => void;
	importText?: string;
	setImportText?: React.Dispatch<React.SetStateAction<string>>;
	// biome-ignore lint/suspicious/noExplicitAny: import preview
	setImportPreview?: (val: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: import commit
	setImportCommit?: (val: any) => void;
}

export type VisitStoreSlice = ReturnType<typeof useVisitStore>;

export interface UseVisitSpeechParams {
	// biome-ignore lint/suspicious/noExplicitAny: auth client carries headers
	auth: any;
	setError: (err: string | null) => void;
	dashboard: Dashboard | null;
	activeOrganizationId: string | null;
	isOnline: boolean;
	selectedSpecialty: DentalSpecialty;
	appendVisitDictationText: (value: string) => void;
	// biome-ignore lint/suspicious/noExplicitAny: import setter
	setImportSourceKind?: ((val: any) => void) | undefined;
	setImportText?: React.Dispatch<React.SetStateAction<string>> | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: import preview
	setImportPreview?: ((val: any) => void) | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: import commit
	setImportCommit?: ((val: any) => void) | undefined;
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
	// biome-ignore lint/suspicious/noExplicitAny: import setter
	setImportSourceKind?: ((val: any) => void) | undefined;
	setImportText?: React.Dispatch<React.SetStateAction<string>> | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: import preview
	setImportPreview?: ((val: any) => void) | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: import commit
	setImportCommit?: ((val: any) => void) | undefined;
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
	// biome-ignore lint/suspicious/noExplicitAny: provider health object
	speechProviderHealthById: Map<string, any>;
	// biome-ignore lint/suspicious/noExplicitAny: active provider health
	activeSpeechProviderHealth: any;
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
	preferredSpeechMimeType: () => string;
	uploadSpeechBlob: (blob: Blob) => Promise<void>;
	stopSpeechMonitor: () => void;
	requestSpeechChunk: (reason: "silence" | "max_time" | "manual") => void;
	startSpeechMonitor: (stream: MediaStream, recorder: MediaRecorder, status: SpeechGatewayStatus | null) => void;
	startImportDictation: () => void;
}

export interface UseVisitAutosaveParams {
	// biome-ignore lint/suspicious/noExplicitAny: auth client carries headers
	auth: any;
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
	// biome-ignore lint/suspicious/noExplicitAny: auth client carries headers
	auth: any;
	setError: (err: string | null) => void;
	dashboard: Dashboard | null;
	setDashboard: React.Dispatch<React.SetStateAction<Dashboard | null>>;
	activeOrganizationId: string | null;
	setDraft: (draft: VisitNoteDraft | null) => void;
	setVisitNoteForm: React.Dispatch<React.SetStateAction<VisitNoteForm>>;
	// biome-ignore lint/suspicious/noExplicitAny: receipt
	setLastVisitSaveReceipt: (receipt: any) => void;
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
	// biome-ignore lint/suspicious/noExplicitAny: auth client carries headers
	auth: any;
	setError: (err: string | null) => void;
	dashboard: Dashboard | null;
	// biome-ignore lint/suspicious/noExplicitAny: active patient entity
	activePatient?: any;
	// biome-ignore lint/suspicious/noExplicitAny: active doctor entity
	activeDoctor?: any;
	speechGatewayStatus: SpeechGatewayStatus | null;
	scrollToVisitArea: (selector: string) => void;
}

export interface UseVisitNotesReturn {
	// biome-ignore lint/suspicious/noExplicitAny: checklist
	visitCloseChecklist: any;
	// biome-ignore lint/suspicious/noExplicitAny: warnings
	visitWarnings: any[];
	// biome-ignore lint/suspicious/noExplicitAny: warning
	primaryVisitWarning: any;
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
