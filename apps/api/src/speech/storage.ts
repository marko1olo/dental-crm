/**
 * Канонический фасад Speech Audio Storage Service (Layer 5)
 * Тонкий фасад над модульным пакетом audioStorage/
 */

import { ensureSpeechTranscriptionChunksRestored } from "./audioStorage/index.js";

export {
	SpeechChunkIdentityConflictError,
	SpeechChunkOrganizationScopeError,
	assembleSpeechRecording,
	ensureSpeechTranscriptionChunksRestored,
	getUndurableCachedChunkCountForTesting,
	listSpeechRecordingRecoveries,
	listSpeechTranscriptionChunks,
	recordSpeechTranscriptionChunk,
	resetSpeechTranscriptionCacheForRestart,
	seedSpeechTranscriptionChunkForTesting,
	speechDurableRestoreState,
	trimSpeechTranscriptionChunkRetentionForTesting,
} from "./audioStorage/index.js";

export * from "./audioStorage/index.js";

// Идемпотентная фоновая загрузка расшифровок при старте модуля
void ensureSpeechTranscriptionChunksRestored();
