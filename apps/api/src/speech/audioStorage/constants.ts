// Локальная копия, как в polish.ts: хранилище расшифровок не должно тянуть за
// собой пул ключей вместе с undici, socks и tls ради одного разбора числа.
export function numberFromEnv(name: string, fallback: number): number {
	const parsed = Number(process.env[name]);
	return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export const durableRecordingPathPrefix = "speech-recording://";
export const durableSourceLabelPrefix = "speech_dictation:";
export const durableEnvelopeVersion = 1;
export const durableRecordingJobKind = "voice_transcription" as const;
export const durableWriteFailureWarningPrefix = "Фрагмент не сохранен в базу";

export const unknownConfidenceColumnValue = 0;

export function maxCachedRecordingCount(): number {
	return Math.max(1, numberFromEnv("DENTAL_SPEECH_CACHED_RECORDINGS", 80));
}

export function maxCachedChunksPerRecording(): number {
	return Math.max(
		1,
		numberFromEnv("DENTAL_SPEECH_CACHED_CHUNKS_PER_RECORDING", 600),
	);
}

export function maxUndurableChunksPerRecording(): number {
	return Math.max(
		maxCachedChunksPerRecording(),
		numberFromEnv("DENTAL_SPEECH_MAX_UNDURABLE_CHUNKS_PER_RECORDING", 1200),
	);
}

export function maxGlobalCachedChunks(): number {
	return Math.max(
		1000,
		numberFromEnv("DENTAL_SPEECH_MAX_GLOBAL_CACHED_CHUNKS", 10_000),
	);
}

export function maxRestoredRecordingCount(): number {
	return Math.max(
		1,
		numberFromEnv("DENTAL_SPEECH_RESTORED_RECORDINGS_TOTAL", 160),
	);
}

export function maxRestoredChunkCount(): number {
	return Math.max(
		1,
		numberFromEnv("DENTAL_SPEECH_RESTORED_CHUNKS_TOTAL", 48_000),
	);
}

export function maxRestoredTranscriptChars(): number {
	return Math.max(
		1,
		numberFromEnv("DENTAL_SPEECH_RESTORED_CHARS_TOTAL", 64_000_000),
	);
}

export function durableRecordingPath(recordingId: string): string {
	return `${durableRecordingPathPrefix}${recordingId}`;
}

export function speechChunkKey(recordingId: string, chunkIndex: number): string {
	return `${recordingId}#${chunkIndex}`;
}

// Константы шифрования AES-256-GCM аудиозаписей врача по 323-ФЗ
export const DEFAULT_AUDIO_ENCRYPTION_ALGORITHM = "aes-256-gcm" as const;
export const AUDIO_GCM_IV_LENGTH_BYTES = 12;
export const AUDIO_GCM_AUTH_TAG_LENGTH_BYTES = 16;
export const AUDIO_MAGIC_HEADER = Buffer.from("DENTEAUD", "ascii");

export const ALLOWED_SPEECH_AUDIO_MIME_TYPES = [
	"audio/webm",
	"audio/ogg",
	"audio/wav",
	"audio/x-wav",
	"audio/wave",
	"audio/opus",
] as const;

export const MAX_AUDIO_CHUNK_FILE_BYTES = 25 * 1024 * 1024; // 25MB ceiling
