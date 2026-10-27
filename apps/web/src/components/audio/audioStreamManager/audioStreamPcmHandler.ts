/**
 * audioStreamPcmHandler.ts — Обработка 16kHz PCM чанков, скользящий шум и VAD сегменты.
 * Строго <= 120 строк по Мандату 8b.
 */

import type { AudioSessionManager } from "./audioSessionManager";
import type { AudioVadDetector } from "./audioVadDetector";
import type { ResolvedAudioStreamManagerConfig } from "./types";

export interface PcmProcessingContext {
	config: ResolvedAudioStreamManagerConfig;
	sessionManager: AudioSessionManager;
	vadDetector: AudioVadDetector;
	isRunning: boolean;
	flushCurrentSpeechSegment: (reason: "silence_timeout" | "max_duration" | "manual_stop") => void;
	exportCombinedInt16Array: () => Int16Array;
}

export function processPcmChunk(
	pcm: Int16Array,
	rms: number,
	ctx: PcmProcessingContext,
): void {
	const now = Date.now();
	const { config, sessionManager, vadDetector } = ctx;

	config.onRmsUpdate(rms, vadDetector.isSpeaking);
	config.onPcmChunk(pcm, rms, config.targetSampleRate);

	if (!config.vadOptions.enabled) {
		sessionManager.appendChunk(pcm);
		return;
	}

	const speechThreshold = Math.max(
		config.vadOptions.speechThresholdRms,
		vadDetector.noiseFloorRms * 2.2,
	);
	vadDetector.noiseFloorRms = vadDetector.noiseFloorRms * 0.95 + rms * 0.05;

	if (rms >= speechThreshold) {
		vadDetector.lastSpeechTime = now;
		if (!vadDetector.isSpeaking) {
			vadDetector.isSpeaking = true;
			vadDetector.silenceTimeoutTriggered = false;
			vadDetector.speechStartTime = now;
			sessionManager.clearChunks();
			config.onSpeechStart();

			if (vadDetector.maxDurationTimer) clearTimeout(vadDetector.maxDurationTimer);
			vadDetector.maxDurationTimer = setTimeout(() => {
				vadDetector.maxDurationTimer = null;
				ctx.flushCurrentSpeechSegment("max_duration");
			}, config.vadOptions.maxSpeechDurationMs);
		}

		if (vadDetector.silenceTimer) {
			clearTimeout(vadDetector.silenceTimer);
			vadDetector.silenceTimer = null;
		}

		sessionManager.appendChunk(pcm);
	} else if (vadDetector.isSpeaking) {
		sessionManager.appendChunk(pcm);

		if (rms <= config.vadOptions.silenceThresholdRms && !vadDetector.silenceTimer && !vadDetector.silenceTimeoutTriggered) {
			vadDetector.silenceTimer = setTimeout(() => {
				vadDetector.silenceTimer = null;
				ctx.flushCurrentSpeechSegment("silence_timeout");
			}, config.vadOptions.silenceTimeoutMs);
		}
	}

	if (sessionManager.totalSessionSamples > sessionManager.sampleCeiling) {
		ctx.flushCurrentSpeechSegment("max_duration");
	}
}

export function flushSpeechSegment(
	reason: "silence_timeout" | "max_duration" | "manual_stop",
	ctx: PcmProcessingContext,
): void {
	const { config, sessionManager, vadDetector } = ctx;
	if (!ctx.isRunning && reason !== "manual_stop") return;
	if (!vadDetector.isSpeaking && sessionManager.sessionPcmChunks.length === 0) return;
	if (reason === "silence_timeout" && vadDetector.silenceTimeoutTriggered) return;

	if (vadDetector.silenceTimer) {
		clearTimeout(vadDetector.silenceTimer);
		vadDetector.silenceTimer = null;
	}
	if (vadDetector.maxDurationTimer) {
		clearTimeout(vadDetector.maxDurationTimer);
		vadDetector.maxDurationTimer = null;
	}
	if (reason === "silence_timeout") {
		vadDetector.silenceTimeoutTriggered = true;
	}

	const durationMs = vadDetector.speechStartTime > 0 ? Date.now() - vadDetector.speechStartTime : 0;
	const combined = ctx.exportCombinedInt16Array();

	vadDetector.isSpeaking = false;
	sessionManager.clearChunks();

	if (durationMs >= config.vadOptions.minSpeechDurationMs) {
		config.onSpeechEnd(durationMs);
		if (reason === "silence_timeout") {
			config.onSilenceTimeout(combined, durationMs);
		}
	}
}
