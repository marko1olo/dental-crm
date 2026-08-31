/**
 * VadEngine.ts — Клиентский движок интеллектуального обнаружения голосовой активности (VAD).
 *
 * ФУНКЦИОНАЛ И ИНВАРИАНТЫ:
 * 1. Непрерывный расчет RMS энергии в децибелах (dB):
 *    - dB = 20 * log10(max(RMS, 1e-6)).
 * 2. Порог голосовой активности:
 *    - speechThresholdDb: -45 dB (настраиваемый, по умолчанию -45 dB).
 *    - Гистерезис отключения: silenceThresholdDb (-50 dB).
 * 3. Детектор пауз и завершения фраз:
 *    - Автоматическая фиксация тишины > 1.5 сек (1500 мс) с генерацией флага 'silence_pause'.
 * 4. Потоковая передача и буферизация PCM Int16:
 *    - Передача чанков в реальном времени через postMessage и коллбеки.
 *    - Накопление сегмента речи и экспорт в 16kHz Int16Array / WAV Blob.
 * 5. Прямая интеграция с AudioWorkletNode и MessagePort:
 *    - Поддержка фоновых воркеров и прямого подключения к шине Web Audio.
 */

import { calculateRms } from "./ResamplingAudioWorklet";

export type VadState = "idle" | "listening" | "speaking" | "silence" | "paused";

export interface VadEngineConfig {
	speechThresholdDb?: number; // Порог начала речи в dB (default: -45 dB)
	silenceThresholdDb?: number; // Порог тишины в dB (default: -50 dB)
	silenceTimeoutMs?: number; // Таймаут тишины до флага 'silence_pause' (default: 1500 ms)
	minSpeechDurationMs?: number; // Минимальная длина речи для валидного сегмента (default: 250 ms)
	maxSpeechDurationMs?: number; // Максимальная длина непрерывного сегмента речи (default: 30000 ms)
	targetSampleRate?: number; // Частота дискретизации PCM (default: 16000 Hz)
	autoResetOnSilence?: boolean; // Сбрасывать накопленный буфер после pause (default: true)
	onPcmChunk?: (chunk: Int16Array, rms: number, rmsDb: number, isSpeaking: boolean) => void;
	onVoiceStart?: (timestamp: number, rmsDb: number) => void;
	onVoiceEnd?: (totalDurationMs: number) => void;
	onSilencePause?: (event: VadSilencePauseEvent) => void;
	onRmsUpdate?: (rms: number, rmsDb: number, isSpeaking: boolean) => void;
	onStateChange?: (newState: VadState, prevState: VadState) => void;
	onError?: (error: Error) => void;
}

export interface ResolvedVadEngineConfig {
	speechThresholdDb: number;
	silenceThresholdDb: number;
	silenceTimeoutMs: number;
	minSpeechDurationMs: number;
	maxSpeechDurationMs: number;
	targetSampleRate: number;
	autoResetOnSilence: boolean;
	onPcmChunk: (chunk: Int16Array, rms: number, rmsDb: number, isSpeaking: boolean) => void;
	onVoiceStart: (timestamp: number, rmsDb: number) => void;
	onVoiceEnd: (totalDurationMs: number) => void;
	onSilencePause: (event: VadSilencePauseEvent) => void;
	onRmsUpdate: (rms: number, rmsDb: number, isSpeaking: boolean) => void;
	onStateChange: (newState: VadState, prevState: VadState) => void;
	onError: (error: Error) => void;
}

export interface VadSilencePauseEvent {
	type: "silence_pause";
	timestamp: number;
	silenceDurationMs: number;
	speechDurationMs: number;
	accumulatedPcm: Int16Array;
	sampleRate: number;
	samplesCount: number;
}

export class VadEngine {
	private config: ResolvedVadEngineConfig;
	private state: VadState = "idle";
	private isSpeaking = false;
	private speechStartTime = 0;
	private lastSpeechTime = 0;
	private silenceTimer: ReturnType<typeof setTimeout> | null = null;
	private maxDurationTimer: ReturnType<typeof setTimeout> | null = null;

	// Буфер накопления PCM чанков для текущего сегмента речи
	private accumulatedChunks: Int16Array[] = [];
	private totalAccumulatedSamples = 0;
	private connectedPort: MessagePort | null = null;
	private boundPortHandler: ((event: MessageEvent) => void) | null = null;

	constructor(config: VadEngineConfig = {}) {
		this.config = {
			speechThresholdDb: config.speechThresholdDb ?? -45.0,
			silenceThresholdDb: config.silenceThresholdDb ?? -50.0,
			silenceTimeoutMs: config.silenceTimeoutMs ?? 1500, // 1.5 секунды
			minSpeechDurationMs: config.minSpeechDurationMs ?? 250,
			maxSpeechDurationMs: config.maxSpeechDurationMs ?? 30000,
			targetSampleRate: config.targetSampleRate ?? 16000,
			autoResetOnSilence: config.autoResetOnSilence ?? true,
			onPcmChunk: config.onPcmChunk ?? (() => {}),
			onVoiceStart: config.onVoiceStart ?? (() => {}),
			onVoiceEnd: config.onVoiceEnd ?? (() => {}),
			onSilencePause: config.onSilencePause ?? (() => {}),
			onRmsUpdate: config.onRmsUpdate ?? (() => {}),
			onStateChange: config.onStateChange ?? (() => {}),
			onError: config.onError ?? (() => {}),
		};
	}

	public getState(): VadState {
		return this.state;
	}

	public getIsSpeaking(): boolean {
		return this.isSpeaking;
	}

	public getSpeechThresholdDb(): number {
		return this.config.speechThresholdDb;
	}

	public setSpeechThresholdDb(db: number): void {
		this.config.speechThresholdDb = db;
	}

	public setSilenceTimeoutMs(ms: number): void {
		this.config.silenceTimeoutMs = Math.max(200, ms);
	}

	public start(): void {
		if (this.state === "listening" || this.state === "speaking") return;
		this.resetAccumulator();
		this.setState("listening");
	}

	public pause(): void {
		if (this.state === "paused" || this.state === "idle") return;
		this.clearTimers();
		this.setState("paused");
	}

	public resume(): void {
		if (this.state !== "paused") return;
		this.setState("listening");
	}

	public stop(): Int16Array {
		const combined = this.flushCurrentSpeechSegment("manual_stop");
		this.clearTimers();
		this.setState("idle");
		return combined;
	}

	/**
	 * Прямое подключение к AudioWorkletNode через MessagePort
	 */
	public connectAudioWorklet(workletNode: AudioWorkletNode): void {
		this.disconnectPort();
		const port = workletNode.port;
		this.connectedPort = port;

		this.boundPortHandler = (event: MessageEvent) => {
			const data = event.data;
			if (!data) return;

			if (data.type === "pcm_chunk" && data.pcm instanceof Int16Array) {
				this.feedPcmChunk(data.pcm, data.rmsDb, data.rms);
			}
		};

		port.addEventListener("message", this.boundPortHandler);
		if (typeof port.start === "function") {
			port.start();
		}
	}

	/**
	 * Передача сообщения или команды в подключенный AudioWorklet
	 */
	public postMessageToWorklet(message: unknown, transfer: Transferable[] = []): void {
		if (this.connectedPort) {
			this.connectedPort.postMessage(message, transfer);
		}
	}

	public disconnectPort(): void {
		if (this.connectedPort && this.boundPortHandler) {
			this.connectedPort.removeEventListener("message", this.boundPortHandler);
			this.boundPortHandler = null;
			this.connectedPort = null;
		}
	}

	/**
	 * Основной метод обработки входящего PCM чанка.
	 * Принимает Int16Array, рассчитывает RMS (или использует переданный),
	 * выполняет VAD классификацию и отслеживает паузы тишины.
	 */
	public feedPcmChunk(pcm: Int16Array, precalculatedRmsDb?: number, precalculatedRms?: number): void {
		if (this.state === "idle" || this.state === "paused" || pcm.length === 0) {
			return;
		}

		let rms = precalculatedRms;
		let rmsDb = precalculatedRmsDb;

		if (rms === undefined || rmsDb === undefined) {
			const calc = calculateRms(pcm);
			rms = calc.rms;
			rmsDb = calc.rmsDb;
		}

		const now = Date.now();
		const isAboveSpeechThreshold = rmsDb >= this.config.speechThresholdDb;
		const isBelowSilenceThreshold = rmsDb <= this.config.silenceThresholdDb;

		this.config.onRmsUpdate(rms, rmsDb, this.isSpeaking);
		this.config.onPcmChunk(pcm, rms, rmsDb, this.isSpeaking);

		if (isAboveSpeechThreshold) {
			this.lastSpeechTime = now;

			if (!this.isSpeaking) {
				this.isSpeaking = true;
				this.speechStartTime = now;
				this.resetAccumulator();
				this.setState("speaking");
				this.config.onVoiceStart(now, rmsDb);

				// Таймер предельной длины одного речевого сегмента
				this.clearMaxDurationTimer();
				this.maxDurationTimer = setTimeout(() => {
					this.flushCurrentSpeechSegment("max_duration");
				}, this.config.maxSpeechDurationMs);
			}

			// Сбрасываем таймер тишины, так как снова обнаружена речь
			this.clearSilenceTimer();

			this.accumulatedChunks.push(pcm);
			this.totalAccumulatedSamples += pcm.length;
		} else if (this.isSpeaking) {
			// Речь была активна, но текущий сэмпл ниже порога
			this.accumulatedChunks.push(pcm);
			this.totalAccumulatedSamples += pcm.length;

			if (isBelowSilenceThreshold && !this.silenceTimer) {
				// Запуск таймера фиксации паузы (по умолчанию 1.5 сек)
				this.silenceTimer = setTimeout(() => {
					this.flushCurrentSpeechSegment("silence_timeout");
				}, this.config.silenceTimeoutMs);
			}
		}
	}

	/**
	 * Сброс и экспорт текущего речевого сегмента при наступлении тишины > 1.5с
	 */
	private flushCurrentSpeechSegment(
		reason: "silence_timeout" | "max_duration" | "manual_stop",
	): Int16Array {
		const combined = this.exportCombinedInt16Array();
		const now = Date.now();
		const speechDurationMs = this.speechStartTime > 0 ? now - this.speechStartTime : 0;
		const silenceDurationMs = this.lastSpeechTime > 0 ? now - this.lastSpeechTime : 0;

		this.clearTimers();
		const wasSpeaking = this.isSpeaking;
		this.isSpeaking = false;

		if (wasSpeaking) {
			this.setState(reason === "silence_timeout" ? "silence" : "listening");

			if (speechDurationMs >= this.config.minSpeechDurationMs && combined.length > 0) {
				this.config.onVoiceEnd(speechDurationMs);

				if (reason === "silence_timeout") {
					const silenceEvent: VadSilencePauseEvent = {
						type: "silence_pause",
						timestamp: now,
						silenceDurationMs,
						speechDurationMs,
						accumulatedPcm: combined,
						sampleRate: this.config.targetSampleRate,
						samplesCount: combined.length,
					};
					this.config.onSilencePause(silenceEvent);
				}
			}
		}

		if (this.config.autoResetOnSilence || reason === "manual_stop") {
			this.resetAccumulator();
		}

		return combined;
	}

	/**
	 * Объединение всех накопленных чанков в монолитный Int16Array
	 */
	public exportCombinedInt16Array(): Int16Array {
		if (this.accumulatedChunks.length === 0) return new Int16Array(0);

		let totalLen = 0;
		for (const chunk of this.accumulatedChunks) {
			totalLen += chunk.length;
		}

		const result = new Int16Array(totalLen);
		let offset = 0;
		for (const chunk of this.accumulatedChunks) {
			result.set(chunk, offset);
			offset += chunk.length;
		}

		return result;
	}

	/**
	 * Сборка стандартного 16-bit Mono WAV файла с 44-байтовым RIFF заголовком
	 */
	public exportWavBlob(customPcm?: Int16Array, sampleRate?: number): Blob {
		const pcm = customPcm ?? this.exportCombinedInt16Array();
		const rate = sampleRate ?? this.config.targetSampleRate;
		const numChannels = 1;
		const bitsPerSample = 16;
		const byteRate = (rate * numChannels * bitsPerSample) / 8;
		const blockAlign = (numChannels * bitsPerSample) / 8;
		const dataSize = pcm.length * 2;
		const headerSize = 44;
		const totalSize = headerSize + dataSize;

		const buffer = new ArrayBuffer(totalSize);
		const view = new DataView(buffer);

		// RIFF header
		this.writeAsciiString(view, 0, "RIFF");
		view.setUint32(4, totalSize - 8, true);
		this.writeAsciiString(view, 8, "WAVE");

		// "fmt " subchunk
		this.writeAsciiString(view, 12, "fmt ");
		view.setUint32(16, 16, true);
		view.setUint16(20, 1, true); // PCM Format
		view.setUint16(22, numChannels, true);
		view.setUint32(24, rate, true);
		view.setUint32(28, byteRate, true);
		view.setUint16(32, blockAlign, true);
		view.setUint16(34, bitsPerSample, true);

		// "data" subchunk
		this.writeAsciiString(view, 36, "data");
		view.setUint32(40, dataSize, true);

		let offset = 44;
		for (let i = 0; i < pcm.length; i++) {
			view.setInt16(offset, pcm[i] ?? 0, true);
			offset += 2;
		}

		return new Blob([buffer], { type: "audio/wav" });
	}

	private writeAsciiString(view: DataView, offset: number, str: string): void {
		for (let i = 0; i < str.length; i++) {
			view.setUint8(offset + i, str.charCodeAt(i));
		}
	}

	private resetAccumulator(): void {
		this.accumulatedChunks = [];
		this.totalAccumulatedSamples = 0;
	}

	private clearTimers(): void {
		this.clearSilenceTimer();
		this.clearMaxDurationTimer();
	}

	private clearSilenceTimer(): void {
		if (this.silenceTimer) {
			clearTimeout(this.silenceTimer);
			this.silenceTimer = null;
		}
	}

	private clearMaxDurationTimer(): void {
		if (this.maxDurationTimer) {
			clearTimeout(this.maxDurationTimer);
			this.maxDurationTimer = null;
		}
	}

	private setState(newState: VadState): void {
		if (this.state === newState) return;
		const prev = this.state;
		this.state = newState;
		this.config.onStateChange(newState, prev);
	}

	public dispose(): void {
		this.stop();
		this.disconnectPort();
		this.resetAccumulator();
	}
}
