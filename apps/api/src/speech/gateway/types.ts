import type {
	SpeechGatewayProvider,
	SpeechProviderKind,
} from "@dental/shared";

/**
 * Known hallucination strings that Whisper-class models produce on silence or non-speech audio.
 * This list is populated from empirical testing (10 samples of varying duration/noise).
 * Add new entries as discovered. All comparisons are case-insensitive and trimmed.
 */
export const HALLUCINATION_BLACKLIST: ReadonlyArray<RegExp | string> = [
	// Whisper silence/noise hallucinations — confirmed in batch tests 2026-07-04
	// 15 noise types tested (silence, white, pink, brown, sine, modulated hum, mixes)
	// 3 unique patterns discovered: all variants listed below
	"Продолжение следует", // 11/15 tests — the dominant hallucination
	"продолжение следует",
	"To be continued",
	"Субтитры создавал", // 2/15 tests — high amplitude white noise, brown+hum mix
	"Субтитры сделал", // 1/15 tests — modulated 150Hz hum
	"Субтитры подготовлены",
	"DimaTorzok", // Appears in all "Субтитры" variants
	"Amara.org",
	"amara.org",
	"Спасибо за просмотр",
	"Спасибо за внимание",
	"Подписывайтесь на канал",
	"Ставьте лайки",
	"www.youtube.com",
	// Whisper repetition loops (detected with regex)
	/^(.{1,60})\1{4,}$/s,
];

export type ProviderTranscript = {
	text: string;
	confidence: number | null;
	warnings: string[];
};

export class SpeechChunkPayloadError extends Error {
	readonly statusCode = 400;

	constructor(message: string) {
		super(message);
		this.name = "SpeechChunkPayloadError";
	}
}

export const wiredServerProviders: SpeechProviderKind[] = [
	"groq_whisper",
	"openai_transcribe",
	"deepgram_streaming",
	"assemblyai_async",
	"cloudflare_whisper",
	"google_speech",
	"gemini_transcribe_live",
];

export const localSpeechProviders: SpeechProviderKind[] = [
	"local_whisper",
	"vosk_local",
];

export type LocalSpeechBridgeProbeStatus =
	| "unknown"
	| "ready"
	| "unreachable"
	| "blocked"
	| "misconfigured";

export type LocalSpeechBridgeProbeState = {
	status: LocalSpeechBridgeProbeStatus;
	checkedAt: number | null;
	latencyMs: number | null;
	urlRedacted: string | null;
	warning: string | null;
	pending: Promise<void> | null;
};

export const providerLabels: Record<SpeechGatewayProvider, string> = {
	none: "Не настроен",
	browser_speech: "Браузерная диктовка",
	groq_whisper: "Groq Whisper",
	openai_transcribe: "OpenAI Transcribe",
	deepgram_streaming: "Deepgram",
	assemblyai_async: "AssemblyAI",
	cloudflare_whisper: "Cloudflare Workers AI Whisper",
	azure_speech: "Azure AI Speech",
	google_speech: "Google Cloud Speech-to-Text",
	gemini_transcribe_live: "Gemini 3.5 Transcribe Live",
	huggingface_asr: "Hugging Face распознавание",
	mobile_native_speech: "Мобильная диктовка",
	local_whisper: "Локальный Whisper.cpp",
	vosk_local: "Vosk Local",
};

export const providerAliases: Record<string, SpeechGatewayProvider> = {
	browser: "browser_speech",
	groq: "groq_whisper",
	openai: "openai_transcribe",
	deepgram: "deepgram_streaming",
	assemblyai: "assemblyai_async",
	cloudflare: "cloudflare_whisper",
	azure: "azure_speech",
	google: "google_speech",
	gemini: "gemini_transcribe_live",
	gemini_live: "gemini_transcribe_live",
	gemini_transcribe: "gemini_transcribe_live",
	google_live: "gemini_transcribe_live",
	huggingface: "huggingface_asr",
	hf: "huggingface_asr",
	mobile: "mobile_native_speech",
	native: "mobile_native_speech",
	local: "local_whisper",
	whisper: "local_whisper",
	vosk: "vosk_local",
};

/**
 * Асинхронное задание источника распознавания не успело завершиться за бюджет
 * ожидания CRM.
 */
export class SpeechAsyncJobTimeoutError extends Error {
	readonly providerLabel: string;
	readonly waitedMs: number;
	readonly pollCount: number;

	constructor(input: {
		providerLabel: string;
		waitedMs: number;
		pollCount: number;
	}) {
		super(
			`${input.providerLabel}: задание распознавания не завершилось за ${Math.round(
				input.waitedMs / 1000,
			)} сек. (опросов ${input.pollCount}).`,
		);
		this.name = "SpeechAsyncJobTimeoutError";
		this.providerLabel = input.providerLabel;
		this.waitedMs = input.waitedMs;
		this.pollCount = input.pollCount;
	}
}

/** Ответ `GET /v2/transcript/{id}`: состояние задания и готовый текст, когда он есть. */
export type AssemblyAiPollPayload = {
	status?: string;
	text?: string;
	confidence?: number;
	error?: string;
};

export type AssemblyAiPollPolicy = {
	budgetMs: number;
	firstIntervalMs: number;
	maxIntervalMs: number;
	maxAttempts: number;
	failureTolerance: number;
};

export type SpeechRemoteArtifactDeletion = {
	deleted: boolean;
	attempts: number;
	failureReason: string | null;
};

export type SpeechResolvedProvider = {
	providerId: SpeechGatewayProvider;
	requestedProviderId: SpeechGatewayProvider;
	providerSelectionMode: "disabled" | "manual" | "auto" | "fallback";
	configuredProviderIds: SpeechProviderKind[];
	fallbackProviderIds: SpeechProviderKind[];
	warnings: string[];
	nextSetupStep: string;
};
