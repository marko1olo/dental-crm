/**
 * UnifiedAudioClient.ts — Канонический фасад единого клиента захвата и распознавания речи DENTE CRM.
 * Реализация декомпозирована в модульный DAG ./audioClient/ (types, pcmAudioProcessor,
 * vadDetector, audioStreamTransport, unifiedAudioClientCore) с гарантией освобождения ресурсов
 * микрофона и Web Audio API (this.streamManager.dispose()).
 */

export * from "./audioClient/index.js";
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
} from "./audioClient/index.js";
export { UnifiedAudioClient } from "./audioClient/index.js";
