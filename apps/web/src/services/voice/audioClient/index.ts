/**
 * index.ts — Публичная точка входа модульного пакета audioClient.
 * Реэкспортирует все типы, PCM-процессоры, VAD-детектор, транспорт и класс UnifiedAudioClient.
 */

export * from "./audioStreamTransport.js";
export * from "./pcmAudioProcessor.js";
export * from "./types.js";
export * from "./unifiedAudioClientCore.js";
export * from "./vadDetector.js";
export type {
	DentalDspProfile,
	DentalNoiseFilterOptions,
	InternalUnifiedAudioClientOptions,
	PcmAudioChunk,
	PendingTranscriptionRecord,
	TwoLayerTranscriptState,
	UnifiedAudioClientOptions,
	UnifiedAudioContextUpdate,
	UnifiedAudioListener,
	UnifiedAudioMode,
	UnifiedAudioState,
	VadOptions,
} from "./types.js";
export { UnifiedAudioClient } from "./unifiedAudioClientCore.js";
