/**
 * vadDetector.ts — Конечный автомат Voice Activity Detection (VAD),
 * адаптивное отслеживание шумового порога (Noise Floor), таймеры тишины (Hangover)
 * и контроль максимальной длительности речевого сегмента.
 */

import { combineInt16Chunks } from "./pcmAudioProcessor";
import type { VadOptions } from "./types";
import { DEFAULT_UNIFIED_VAD_OPTIONS } from "./types";

export type VadFlushReason = "silence_timeout" | "max_duration" | "manual_stop";

export interface VadDetectorCallbacks {
	onSpeechStart?: (() => void) | undefined;
	onSpeechEnd?: ((durationMs: number) => void) | undefined;
	onSilenceTimeout?: (
		(collectedPcm: Int16Array, durationMs: number) => void
	) | undefined;
	onRmsUpdate?: ((rms: number, isSpeaking: boolean) => void) | undefined;
}

export interface ResolvedVadDetectorConfig {
	enabled: boolean;
	speechThresholdRms: number;
	silenceThresholdRms: number;
	silenceTimeoutMs: number;
	minSpeechDurationMs: number;
	maxSpeechDurationMs: number;
}

/**
 * Вычисление адаптивного порога начала речи с учетом текущего уровня фонового шума кабинета.
 */
export function computeAdaptiveSpeechThreshold(
	baseSpeechThresholdRms: number,
	noiseFloorRms: number,
): number {
	return Math.max(baseSpeechThresholdRms, noiseFloorRms * 2.2);
}

/**
 * Экспоненциальное сглаживание оценки фонового шума (EMA 95/5).
 */
export function updateAdaptiveNoiseFloor(
	currentNoiseFloorRms: number,
	frameRms: number,
): number {
	return currentNoiseFloorRms * 0.95 + frameRms * 0.05;
}

/**
 * Конечный автомат детектора голосовой активности (VAD) с защитой от утечек таймеров и ОЗУ.
 */
export class VadDetector {
	private config: ResolvedVadDetectorConfig;
	private callbacks: VadDetectorCallbacks;

	private isSpeaking = false;
	private speechStartTime = 0;
	private lastSpeechTime = 0;
	private noiseFloorRms = 0.005;
	private silenceTimer: ReturnType<typeof setTimeout> | null = null;
	private maxDurationTimer: ReturnType<typeof setTimeout> | null = null;
	private sessionPcmChunks: Int16Array[] = [];
	private totalSessionSamples = 0;
	private isFlushing = false;
	private silenceTimeoutTriggered = false;
	private isDisposed = false;

	// 9 600 000 сэмплов @ 16kHz = 10 минут непрерывной записи (~19.2 МБ потолок)
	private static readonly MAX_CONTINUOUS_SAMPLES = 9_600_000;

	constructor(
		options: VadOptions = DEFAULT_UNIFIED_VAD_OPTIONS,
		callbacks: VadDetectorCallbacks = {},
	) {
		this.config = {
			enabled: options.enabled ?? true,
			speechThresholdRms:
				options.speechThresholdRms ??
				DEFAULT_UNIFIED_VAD_OPTIONS.speechThresholdRms ??
				0.016,
			silenceThresholdRms:
				options.silenceThresholdRms ??
				DEFAULT_UNIFIED_VAD_OPTIONS.silenceThresholdRms ??
				0.008,
			silenceTimeoutMs:
				options.silenceTimeoutMs ??
				DEFAULT_UNIFIED_VAD_OPTIONS.silenceTimeoutMs ??
				1800,
			minSpeechDurationMs:
				options.minSpeechDurationMs ??
				DEFAULT_UNIFIED_VAD_OPTIONS.minSpeechDurationMs ??
				300,
			maxSpeechDurationMs:
				options.maxSpeechDurationMs ??
				DEFAULT_UNIFIED_VAD_OPTIONS.maxSpeechDurationMs ??
				30000,
		};
		this.callbacks = callbacks;
	}

	public getIsSpeaking(): boolean {
		return this.isSpeaking;
	}

	public getNoiseFloorRms(): number {
		return this.noiseFloorRms;
	}

	public getLastSpeechTime(): number {
		return this.lastSpeechTime;
	}

	public getTotalBufferedSamples(): number {
		return this.totalSessionSamples;
	}

	/**
	 * Обработка очередного PCM-фрейма и обновление состояния VAD / таймеров тишины.
	 */
	public processPcmFrame(pcm: Int16Array, rms: number): void {
		if (this.isDisposed) return;

		const now = Date.now();
		this.noiseFloorRms = updateAdaptiveNoiseFloor(this.noiseFloorRms, rms);
		this.callbacks.onRmsUpdate?.(rms, this.isSpeaking);

		if (!this.config.enabled) {
			this.sessionPcmChunks.push(pcm);
			this.totalSessionSamples += pcm.length;
			return;
		}

		const speechThreshold = computeAdaptiveSpeechThreshold(
			this.config.speechThresholdRms,
			this.noiseFloorRms,
		);
		const silenceThreshold = this.config.silenceThresholdRms;

		if (rms >= speechThreshold) {
			this.lastSpeechTime = now;
			if (!this.isSpeaking) {
				this.isSpeaking = true;
				this.silenceTimeoutTriggered = false;
				this.speechStartTime = now;
				this.sessionPcmChunks = [];
				this.totalSessionSamples = 0;
				this.callbacks.onSpeechStart?.();

				if (this.maxDurationTimer) clearTimeout(this.maxDurationTimer);
				this.maxDurationTimer = setTimeout(() => {
					this.maxDurationTimer = null;
					this.flushSpeechSegment("max_duration");
				}, this.config.maxSpeechDurationMs);
			}

			if (this.silenceTimer) {
				clearTimeout(this.silenceTimer);
				this.silenceTimer = null;
			}

			this.sessionPcmChunks.push(pcm);
			this.totalSessionSamples += pcm.length;
		} else if (this.isSpeaking) {
			this.sessionPcmChunks.push(pcm);
			this.totalSessionSamples += pcm.length;

			if (
				rms <= silenceThreshold &&
				!this.silenceTimer &&
				!this.silenceTimeoutTriggered
			) {
				this.silenceTimer = setTimeout(() => {
					this.silenceTimer = null;
					this.flushSpeechSegment("silence_timeout");
				}, this.config.silenceTimeoutMs);
			}
		}

		if (this.totalSessionSamples > VadDetector.MAX_CONTINUOUS_SAMPLES) {
			this.flushSpeechSegment("max_duration");
		}
	}

	/**
	 * Принудительный сброс и сборка накопленного речевого сегмента.
	 */
	public flushSpeechSegment(reason: VadFlushReason): Int16Array {
		if (this.isFlushing) return new Int16Array(0);
		if (!this.isSpeaking && this.sessionPcmChunks.length === 0) {
			return new Int16Array(0);
		}
		if (reason === "silence_timeout" && this.silenceTimeoutTriggered) {
			return new Int16Array(0);
		}

		this.isFlushing = true;
		try {
			this.clearTimers();

			if (reason === "silence_timeout") {
				this.silenceTimeoutTriggered = true;
			}

			const durationMs =
				this.speechStartTime > 0 ? Date.now() - this.speechStartTime : 0;
			const combined = combineInt16Chunks(this.sessionPcmChunks);

			this.isSpeaking = false;
			this.sessionPcmChunks = [];
			this.totalSessionSamples = 0;

			if (durationMs >= this.config.minSpeechDurationMs) {
				this.callbacks.onSpeechEnd?.(durationMs);
				if (reason === "silence_timeout") {
					this.callbacks.onSilenceTimeout?.(combined, durationMs);
				}
			}

			return combined;
		} finally {
			this.isFlushing = false;
		}
	}

	public exportBufferedPcm(): Int16Array {
		return combineInt16Chunks(this.sessionPcmChunks);
	}

	public clearTimers(): void {
		if (this.silenceTimer) {
			clearTimeout(this.silenceTimer);
			this.silenceTimer = null;
		}
		if (this.maxDurationTimer) {
			clearTimeout(this.maxDurationTimer);
			this.maxDurationTimer = null;
		}
	}

	public reset(): void {
		this.clearTimers();
		this.isSpeaking = false;
		this.silenceTimeoutTriggered = false;
		this.speechStartTime = 0;
		this.sessionPcmChunks = [];
		this.totalSessionSamples = 0;
	}

	public dispose(): void {
		this.isDisposed = true;
		this.reset();
	}
}
