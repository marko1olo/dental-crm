/**
 * @file apps/api/src/speech/gateway.ts
 * @description Canonical thin facade for Speech Gateway (<100 lines).
 * Decomposed into modular units under ./gateway/ following Layered DAG architecture.
 */

import {
	GeminiLiveSession,
	type GeminiLiveSessionConfig,
} from "./geminiLiveStt.js";

// Re-export core speech gateway functionality from modular package
export * from "./gateway/index.js";

// Re-export Gemini Batch Transcription
export {
	transcribeGeminiBatch,
	type GeminiBatchTranscribeInput,
	type GeminiBatchTranscribeResult,
	type GeminiSpeakerSegment,
	type GeminiWordTimestamp,
} from "./geminiBatchTranscribe.js";

// Re-export Gemini Live Translation
export {
	GeminiLiveTranslateSession,
	createGeminiLiveTranslateSession,
	type GeminiLiveTranslateOptions,
	type GeminiLiveTranslateSessionState,
} from "./geminiLiveTranslate.js";

// Re-export Whisper Cascade
export {
	transcribeWhisperCascade,
	isHallucinatedWhisperTranscript,
	WHISPER_HALLUCINATION_BLACKLIST,
	type WhisperCascadeInput,
	type WhisperCascadeResult,
	type WhisperCascadeAttempt,
	type WhisperProviderId,
} from "./whisperCascade.js";

// Gemini Live STT factory
export function createGeminiLiveSttSession(
	config?: GeminiLiveSessionConfig,
): GeminiLiveSession {
	return new GeminiLiveSession(config);
}

// Re-export Gemini Live STT frames and helpers
export {
	GeminiLiveSession,
	type GeminiLiveSessionConfig,
	type GeminiLiveTranscriptEvent,
	type GeminiLiveSetupFrame,
	type GeminiLiveMediaChunkFrame,
	type GeminiLiveParsedServerMessage,
	buildGeminiLiveSetupFrame,
	buildGeminiLiveMediaChunkFrame,
	parseGeminiLiveServerMessage,
	transcribeWithGeminiLiveStt,
} from "./geminiLiveStt.js";
