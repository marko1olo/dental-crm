/**
 * audioVadDetector.ts — Layer 2: Real-time voice activity detection (VAD), energy calculation, and silence timer management.
 */

import type { ResolvedVadOptions } from "./types";

export interface VadCallbacks {
	onSpeechStart: () => void;
	onSpeechEnd: (durationMs: number) => void;
	onSilenceTimeout: (durationMs: number) => void;
	onMaxDuration: () => void;
}

export class AudioVadDetector {
	public vadOptions: ResolvedVadOptions;
	private callbacks: VadCallbacks;

	public isSpeaking = false;
	public speechStartTime = 0;
	public lastSpeechTime = 0;
	public noiseFloorRms = 0.005;
	public silenceTimeoutTriggered = false;

	public silenceTimer: ReturnType<typeof setTimeout> | null = null;
	public maxDurationTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(vadOptions: ResolvedVadOptions, callbacks: VadCallbacks) {
		this.vadOptions = vadOptions;
		this.callbacks = callbacks;
	}

	public updateOptions(options: ResolvedVadOptions): void {
		this.vadOptions = options;
	}

	/**
	 * Обработка одного чанка RMS энергии и обновление стейта VAD
	 */
	public processRms(rms: number, now: number = Date.now()): void {
		// Обновляем плавающий уровень фонового шума
		this.noiseFloorRms = this.noiseFloorRms * 0.95 + rms * 0.05;

		if (!this.vadOptions.enabled) {
			return;
		}

		const speechThreshold = Math.max(
			this.vadOptions.speechThresholdRms,
			this.noiseFloorRms * 2.2,
		);
		const silenceThreshold = this.vadOptions.silenceThresholdRms;

		if (rms >= speechThreshold) {
			// Обнаружена речь
			this.lastSpeechTime = now;
			if (!this.isSpeaking) {
				this.isSpeaking = true;
				this.silenceTimeoutTriggered = false;
				this.speechStartTime = now;
				this.callbacks.onSpeechStart();

				// Таймер максимальной длины записи
				if (this.maxDurationTimer) clearTimeout(this.maxDurationTimer);
				this.maxDurationTimer = setTimeout(() => {
					this.maxDurationTimer = null;
					this.callbacks.onMaxDuration();
				}, this.vadOptions.maxSpeechDurationMs);
			}

			// Сбрасываем таймер тишины
			if (this.silenceTimer) {
				clearTimeout(this.silenceTimer);
				this.silenceTimer = null;
			}
		} else if (this.isSpeaking) {
			// Была речь, сейчас громкость ниже порога
			if (rms <= silenceThreshold && !this.silenceTimer && !this.silenceTimeoutTriggered) {
				// Запуск таймера тишины на 1.8 сек (Hands-free режим)
				this.silenceTimer = setTimeout(() => {
					this.silenceTimer = null;
					const durationMs = this.speechStartTime > 0 ? Date.now() - this.speechStartTime : 0;
					this.callbacks.onSilenceTimeout(durationMs);
				}, this.vadOptions.silenceTimeoutMs);
			}
		}
	}

	/**
	 * Очистка активных таймеров VAD
	 */
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

	/**
	 * Полный сброс VAD детектора
	 */
	public reset(): void {
		this.clearTimers();
		this.isSpeaking = false;
		this.speechStartTime = 0;
		this.lastSpeechTime = 0;
		this.silenceTimeoutTriggered = false;
	}
}
