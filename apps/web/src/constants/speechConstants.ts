import type {
	DentalSpecialty,
	SpeechChunkUploadInput,
	SpeechProviderConnector,
	SpeechTranscriptionResponse,
	VisitNoteDraft,
} from "@dental/shared";
import type { VisitNoteForm } from "./clinicalConstants";
import {
	dicomWorkbenchDraftStoreName,
	mprWorkbenchDraftStoreName,
} from "./imagingConstants";

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

export const speechAudioQueueRetentionMs = 48 * 60 * 60 * 1000;

export const pendingVisitSaveQueueKey = "dental-crm:pending-visit-saves";

export const pendingSpeechChunkQueueKey = "dental-crm:pending-speech-chunks";

export const speechChunkDbName = "dental-crm-offline";

export const speechChunkDbVersion = 4;

export const pendingVisitSaveStoreName = "pendingVisitSaves";

export const speechChunkStoreName = "pendingSpeechChunks";

export const speechLocalStorageFallbackMaxBytes = 4_000_000;

export const requiredSpeechChunkDbStoreNames = [
	pendingVisitSaveStoreName,
	dicomWorkbenchDraftStoreName,
	mprWorkbenchDraftStoreName,
	speechChunkStoreName,
] as const;

export const speechChunkDbPromise: Promise<IDBDatabase> | null = null;

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
