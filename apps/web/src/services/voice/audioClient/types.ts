/**
 * types.ts — Контракты типов, конфигурации аудио, параметров VAD,
 * состояний соединения и слушателей событий для UnifiedAudioClient.
 */

import type {
	DentalNoiseFilterOptions,
	VadOptions,
} from "../../../components/audio/AudioStreamManager";
import type { DentalDspProfile } from "../audioFilters";
import type {
	PendingTranscriptionRecord,
	VoiceOfflineQueue,
} from "../VoiceOfflineQueue";

export type {
	DentalDspProfile,
	DentalNoiseFilterOptions,
	PendingTranscriptionRecord,
	VadOptions,
};

export type UnifiedAudioMode =
	| "gemini_live"
	| "server_whisper"
	| "browser_speech";

export type UnifiedAudioState =
	| "idle"
	| "connecting"
	| "listening"
	| "processing"
	| "error";

export interface PcmAudioChunk {
	readonly pcm: Int16Array;
	readonly rms: number;
	readonly timestamp: number;
}

export interface TwoLayerTranscriptState {
	finalized: string;
	interim: string;
	fullWithInterim: string;
}

export interface UnifiedAudioContextUpdate {
	patientId?: string | null | undefined;
	visitId?: string | null | undefined;
	specialty?: string | undefined;
	adminSecret?: string | null | undefined;
}

export interface UnifiedAudioClientOptions {
	preferredMode?: UnifiedAudioMode | undefined;
	organizationId?: string | null | undefined;
	patientId?: string | null | undefined;
	visitId?: string | null | undefined;
	specialty?: string | undefined;
	language?: string | undefined;
	adminSecret?: string | null | undefined;
	filterOptions?: DentalNoiseFilterOptions | undefined;
	vadOptions?: VadOptions | undefined;
	autoFallback?: boolean | undefined;
	persistDraftKey?: string | null | undefined;
	offlineQueue?: VoiceOfflineQueue | undefined;
	ringBufferCapacity?: number | undefined;
	maxReconnectAttempts?: number | undefined;
	reconnectBackoffMs?: number | undefined;
}

export type UnifiedAudioListener = {
	onInterimText?: (text: string) => void;
	onFinalText?: (text: string, accumulated: string) => void;
	onFullTranscript?: (transcript: string) => void;
	onTwoLayerTranscript?: (data: TwoLayerTranscriptState) => void;
	onStateChange?: (
		state: UnifiedAudioState,
		prevState: UnifiedAudioState,
	) => void;
	onModeChange?: (
		newMode: UnifiedAudioMode,
		prevMode: UnifiedAudioMode,
		reason?: string,
	) => void;
	onRmsUpdate?: (rms: number, isSpeaking: boolean) => void;
	onError?: (error: Error | string) => void;
	onOfflineRecordSaved?: (record: PendingTranscriptionRecord) => void;
	onOfflineSync?: (syncedCount: number, badgeMessage: string) => void;
};

export interface InternalUnifiedAudioClientOptions {
	preferredMode: UnifiedAudioMode;
	organizationId: string | null;
	patientId: string | null;
	visitId: string | null;
	specialty: string;
	language: string;
	adminSecret: string;
	filterOptions: DentalNoiseFilterOptions;
	vadOptions: VadOptions;
	autoFallback: boolean;
	persistDraftKey: string;
	ringBufferCapacity: number;
	maxReconnectAttempts: number;
	reconnectBackoffMs: number;
}

export const DEFAULT_UNIFIED_FILTER_OPTIONS: DentalNoiseFilterOptions = {
	enableHighpass: true,
	highpassFrequency: 120,
	enableLowpass: true,
	lowpassFrequency: 4500,
	enableNotch: true,
	notchFrequency: 4000,
	notchQ: 4.0,
};

export const DEFAULT_UNIFIED_VAD_OPTIONS: VadOptions = {
	enabled: true,
	speechThresholdRms: 0.016,
	silenceThresholdRms: 0.008,
	silenceTimeoutMs: 1800,
	minSpeechDurationMs: 300,
	maxSpeechDurationMs: 30000,
};

export function resolveUnifiedAudioClientOptions(
	options: UnifiedAudioClientOptions = {},
): InternalUnifiedAudioClientOptions {
	return {
		preferredMode: options.preferredMode ?? "gemini_live",
		organizationId: options.organizationId ?? null,
		patientId: options.patientId ?? null,
		visitId: options.visitId ?? null,
		specialty: options.specialty ?? "therapy",
		language: options.language ?? "ru",
		adminSecret: options.adminSecret ?? "",
		filterOptions: options.filterOptions ?? {
			...DEFAULT_UNIFIED_FILTER_OPTIONS,
		},
		vadOptions: options.vadOptions ?? {
			...DEFAULT_UNIFIED_VAD_OPTIONS,
		},
		autoFallback: options.autoFallback ?? true,
		persistDraftKey: options.persistDraftKey ?? "dente_voice_dictation_draft",
		ringBufferCapacity: options.ringBufferCapacity ?? 200,
		maxReconnectAttempts: options.maxReconnectAttempts ?? 5,
		reconnectBackoffMs: options.reconnectBackoffMs ?? 800,
	};
}
