import type {
	SpeechVadConfig,
	SpeechVadPauseEvent,
	SpeechVadState,
} from "./types";

/**
 * Расчет среднеквадратичной энергии RMS для сэмплов Int16 PCM (нормализовано к [0.0 .. 1.0]).
 */
export function calculateRmsFromInt16(pcm: Int16Array): number {
	if (pcm.length === 0) return 0;
	let sum = 0;
	for (let i = 0; i < pcm.length; i++) {
		const norm = (pcm[i] ?? 0) / 32768.0;
		sum += norm * norm;
	}
	return Math.sqrt(sum / pcm.length);
}

/**
 * Расчет RMS для Float32Array сэмплов [-1.0 .. 1.0].
 */
export function calculateRmsFromFloat32(samples: Float32Array): number {
	if (samples.length === 0) return 0;
	let sum = 0;
	for (let i = 0; i < samples.length; i++) {
		const s = samples[i] ?? 0;
		sum += s * s;
	}
	return Math.sqrt(sum / samples.length);
}

/**
 * Перевод линейного RMS в децибелы (dB).
 * Уровень 0 dB соответствует максимальной амплитуде full-scale (1.0).
 */
export function calculateRmsDb(rms: number, minFloor = 1e-6): number {
	const safe = Math.max(rms, minFloor);
	return 20 * Math.log10(safe);
}

/**
 * Быстрый предикат: является ли текущий фрейм PCM речевой активностью по порогу громкости.
 */
export function detectVoiceActivity(
	pcm: Int16Array,
	thresholdDb = -45.0,
): boolean {
	const rms = calculateRmsFromInt16(pcm);
	const db = calculateRmsDb(rms);
	return db >= thresholdDb;
}

/**
 * Быстрый предикат: является ли текущий фрейм тишиной (ниже порога гистерезиса).
 */
export function isSilenceSegment(
	pcm: Int16Array,
	silenceThresholdDb = -50.0,
): boolean {
	const rms = calculateRmsFromInt16(pcm);
	const db = calculateRmsDb(rms);
	return db < silenceThresholdDb;
}

/**
 * Детектор голосовой активности врача (VAD) с гистерезисом,
 * обнаружением пауз (тишина > 1.5 сек) и накоплением речевых квантов.
 */
export class VadSilenceDetector {
	private speechThresholdDb: number;
	private silenceThresholdDb: number;
	private silenceTimeoutMs: number;
	private minSpeechDurationMs: number;
	private maxSpeechDurationMs: number;
	private sampleRate: number;
	private autoResetOnSilence: boolean;

	private state: SpeechVadState = "idle";
	private isSpeaking = false;
	private speechStartTimestamp = 0;
	private lastVoiceTimestamp = 0;
	private accumulatedChunks: Int16Array[] = [];
	private totalAccumulatedSamples = 0;

	constructor(config: SpeechVadConfig = {}) {
		this.speechThresholdDb = config.speechThresholdDb ?? -45.0;
		this.silenceThresholdDb = config.silenceThresholdDb ?? -50.0;
		this.silenceTimeoutMs = config.silenceTimeoutMs ?? 1500;
		this.minSpeechDurationMs = config.minSpeechDurationMs ?? 250;
		this.maxSpeechDurationMs = config.maxSpeechDurationMs ?? 30000;
		this.sampleRate = config.sampleRate ?? 16000;
		this.autoResetOnSilence = config.autoResetOnSilence ?? true;
	}

	/**
	 * Обработка входящего фрейма PCM. Возвращает метрики и флаг фиксации паузы между фразами.
	 */
	public processPcmChunk(
		chunk: Int16Array,
		now = Date.now(),
	): {
		isSpeaking: boolean;
		rms: number;
		rmsDb: number;
		isPauseDetected: boolean;
		pauseEvent: SpeechVadPauseEvent | null;
	} {
		const rms = calculateRmsFromInt16(chunk);
		const rmsDb = calculateRmsDb(rms);

		// Гистерезис порога детекции
		const voiceActive = this.isSpeaking
			? rmsDb >= this.silenceThresholdDb
			: rmsDb >= this.speechThresholdDb;

		let isPauseDetected = false;
		let pauseEvent: SpeechVadPauseEvent | null = null;

		if (voiceActive) {
			if (!this.isSpeaking) {
				// Старт речи врача
				this.isSpeaking = true;
				this.state = "speaking";
				this.speechStartTimestamp = now;
			}
			this.lastVoiceTimestamp = now;
			this.accumulatedChunks.push(chunk.slice());
			this.totalAccumulatedSamples += chunk.length;

			// Проверка на жесткий предел максимальной непрерывной речи
			const speechDuration = now - this.speechStartTimestamp;
			if (speechDuration >= this.maxSpeechDurationMs) {
				isPauseDetected = true;
				pauseEvent = {
					type: "silence_pause",
					timestamp: now,
					silenceDurationMs: 0,
					speechDurationMs: speechDuration,
					samplesCount: this.totalAccumulatedSamples,
					sampleRate: this.sampleRate,
				};
				this.finalizeSegment(now);
			}
		} else {
			// Текущий блок тихий
			if (this.isSpeaking) {
				this.accumulatedChunks.push(chunk.slice());
				this.totalAccumulatedSamples += chunk.length;

				const silenceDuration = now - this.lastVoiceTimestamp;
				if (silenceDuration >= this.silenceTimeoutMs) {
					// Зафиксирована пауза врача (> 1500 мс)
					const totalSpeechDuration = this.lastVoiceTimestamp - this.speechStartTimestamp;
					if (totalSpeechDuration >= this.minSpeechDurationMs) {
						isPauseDetected = true;
						pauseEvent = {
							type: "silence_pause",
							timestamp: now,
							silenceDurationMs: silenceDuration,
							speechDurationMs: totalSpeechDuration,
							samplesCount: this.totalAccumulatedSamples,
							sampleRate: this.sampleRate,
						};
					}
					this.finalizeSegment(now);
				}
			} else {
				this.state = "silence";
			}
		}

		return {
			isSpeaking: this.isSpeaking,
			rms,
			rmsDb,
			isPauseDetected,
			pauseEvent,
		};
	}

	private finalizeSegment(now: number): void {
		this.isSpeaking = false;
		this.state = "silence";
		this.speechStartTimestamp = 0;
		this.lastVoiceTimestamp = 0;
		if (this.autoResetOnSilence) {
			this.accumulatedChunks = [];
			this.totalAccumulatedSamples = 0;
		}
	}

	/**
	 * Получить все накопленные сэмплы текущего сегмента речи единым непрерывным буфером.
	 */
	public getAccumulatedSamples(): Int16Array {
		const totalLen = this.totalAccumulatedSamples;
		const merged = new Int16Array(totalLen);
		let offset = 0;
		for (const chunk of this.accumulatedChunks) {
			merged.set(chunk, offset);
			offset += chunk.length;
		}
		return merged;
	}

	/**
	 * Полный сброс детектора.
	 */
	public reset(): void {
		this.state = "idle";
		this.isSpeaking = false;
		this.speechStartTimestamp = 0;
		this.lastVoiceTimestamp = 0;
		this.accumulatedChunks = [];
		this.totalAccumulatedSamples = 0;
	}

	public getState(): SpeechVadState {
		return this.state;
	}

	public getSamplesCount(): number {
		return this.totalAccumulatedSamples;
	}
}
