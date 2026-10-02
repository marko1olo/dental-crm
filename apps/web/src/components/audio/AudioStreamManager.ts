/**
 * AudioStreamManager.ts — Менеджер захвата аудио, фильтрации стоматологических шумов
 * и интеллектуального VAD (Voice Activity Detection) для DENTE CRM.
 *
 * ВОЗМОЖНОСТИ:
 * 1. Захват микрофона через navigator.mediaDevices.getUserMedia с аппаратным шумоподавлением.
 * 2. Каскад фильтров BiquadFilter:
 *    - Highpass 120Hz (срез компрессорного гула и аспирации/слюноотсоса <120Hz).
 *    - Lowpass 7200Hz (сохранение разборчивости русской клинической речи с отсечением высокочастотных ультразвуковых наводок >7200Hz).
 *    - Notch 4000Hz (точечный срез резонансного свиста турбинного наконечника и бормашины).
 * 3. Полная защита от акустической обратной связи (Mute Gain 0.0) для исключения самовозбуждения динамиков.
 * 4. AnalyserNode для реалтайм-визуализации спектра и осциллограммы на 60 FPS.
 * 5. Интеллектуальный Hands-Free VAD:
 *    - Расчет RMS энергии в реальном времени.
 *    - Автоматическая фиксация тишины > 1.8 сек (1800ms) для отправки чанка без рук (в перчатках).
 * 6. Буферизация PCM и сборка валидного 16kHz 16-bit Mono WAV с 44-байтовым RIFF заголовком.
 */

import {
	DENTAL_AUDIO_WORKLET_PROCESSOR_NAME,
	registerDentalAudioWorklet,
} from "./AudioWorkletProcessor";
import { logger } from "../../utils/logger";
import {
	DENTAL_DSP_PRESETS,
	type DentalDspProfile,
} from "../../services/voice/audioFilters";

export interface DentalNoiseFilterOptions {
	enableHighpass?: boolean | undefined; // Default true: 120 Hz
	highpassFrequency?: number | undefined;
	enableLowpass?: boolean | undefined; // Default true: 7200 Hz
	lowpassFrequency?: number | undefined;
	enableNotch?: boolean | undefined; // Default true: 4500 Hz
	notchFrequency?: number | undefined;
	notchQ?: number | undefined;
	enableTurbineNotch2?: boolean | undefined; // Default true: 6000 Hz
	notch2Frequency?: number | undefined;
	notch2Q?: number | undefined;
	enableCompressor?: boolean | undefined; // Default true (Far-field auto-leveler)
	compressorThreshold?: number | undefined;
	compressorRatio?: number | undefined;
	enableLimiter?: boolean | undefined;
	dspProfile?: DentalDspProfile | undefined;
}

export interface VadOptions {
	enabled?: boolean | undefined;
	speechThresholdRms?: number | undefined; // Порог начала речи (RMS, default: 0.016)
	silenceThresholdRms?: number | undefined; // Порог тишины (RMS, default: 0.008)
	silenceTimeoutMs?: number | undefined; // Время тишины до авто-отправки (default: 1800ms)
	minSpeechDurationMs?: number | undefined; // Минимальная длина речи (default: 300ms)
	maxSpeechDurationMs?: number | undefined; // Максимальная длина непрерывной записи (default: 30000ms)
}

export interface AudioStreamManagerConfig {
	targetSampleRate?: number | undefined; // Default: 16000 Hz
	chunkSize?: number | undefined; // Default: 2048 samples (~128ms @ 16kHz)
	filterOptions?: DentalNoiseFilterOptions | undefined;
	vadOptions?: VadOptions | undefined;
	onPcmChunk?: ((chunk: Int16Array, rms: number, sampleRate: number) => void) | undefined;
	onSpeechStart?: (() => void) | undefined;
	onSpeechEnd?: ((durationMs: number) => void) | undefined;
	onSilenceTimeout?: ((collectedPcm: Int16Array, durationMs: number) => void) | undefined;
	onRmsUpdate?: ((rms: number, isSpeaking: boolean) => void) | undefined;
	onError?: ((error: Error) => void) | undefined;
}

export interface ResolvedDentalNoiseFilterOptions {
	enableHighpass: boolean;
	highpassFrequency: number;
	enableLowpass: boolean;
	lowpassFrequency: number;
	enableNotch: boolean;
	notchFrequency: number;
	notchQ: number;
	enableTurbineNotch2: boolean;
	notch2Frequency: number;
	notch2Q: number;
	enableCompressor: boolean;
	compressorThreshold: number;
	compressorRatio: number;
	enableLimiter: boolean;
	dspProfile: DentalDspProfile;
}

export interface ResolvedVadOptions {
	enabled: boolean;
	speechThresholdRms: number;
	silenceThresholdRms: number;
	silenceTimeoutMs: number;
	minSpeechDurationMs: number;
	maxSpeechDurationMs: number;
}

export interface ResolvedAudioStreamManagerConfig {
	targetSampleRate: number;
	chunkSize: number;
	filterOptions: ResolvedDentalNoiseFilterOptions;
	vadOptions: ResolvedVadOptions;
	onPcmChunk: (chunk: Int16Array, rms: number, sampleRate: number) => void;
	onSpeechStart: () => void;
	onSpeechEnd: (durationMs: number) => void;
	onSilenceTimeout: (collectedPcm: Int16Array, durationMs: number) => void;
	onRmsUpdate: (rms: number, isSpeaking: boolean) => void;
	onError: (error: Error) => void;
}

export class AudioStreamManager {
	private config: ResolvedAudioStreamManagerConfig;
	private audioContext: AudioContext | null = null;
	private mediaStream: MediaStream | null = null;
	private sourceNode: MediaStreamAudioSourceNode | null = null;
	private highpassFilter: BiquadFilterNode | null = null;
	private lowpassFilter: BiquadFilterNode | null = null;
	private notchFilter: BiquadFilterNode | null = null;
	private notch2Filter: BiquadFilterNode | null = null;
	private compressorNode: DynamicsCompressorNode | null = null;
	private limiterNode: DynamicsCompressorNode | null = null;
	private gainNode: GainNode | null = null;
	private analyserNode: AnalyserNode | null = null;
	private workletNode: AudioWorkletNode | null = null;
	private scriptProcessorNode: ScriptProcessorNode | null = null;
	private muteGainNode: GainNode | null = null;

	// Стейт записи и VAD
	private isRunning = false;
	private isPaused = false;
	private isSpeaking = false;
	private speechStartTime = 0;
	private lastSpeechTime = 0;
	private silenceTimer: ReturnType<typeof setTimeout> | null = null;
	private maxDurationTimer: ReturnType<typeof setTimeout> | null = null;

	// Буфер накопления PCM с момента начала речи
	private sessionPcmChunks: Int16Array[] = [];
	private totalSessionSamples = 0;
	private noiseFloorRms = 0.005;
	private isFlushing = false;
	private silenceTimeoutTriggered = false;

	constructor(config: AudioStreamManagerConfig = {}) {
		const profile = config.filterOptions?.dspProfile ?? "dental_balanced";
		const preset = DENTAL_DSP_PRESETS[profile];

		this.config = {
			targetSampleRate: config.targetSampleRate ?? 16000,
			chunkSize: config.chunkSize ?? 2048,
			filterOptions: {
				enableHighpass: config.filterOptions?.enableHighpass ?? preset.enableHighpass,
				highpassFrequency: config.filterOptions?.highpassFrequency ?? preset.highpassFrequency,
				enableLowpass: config.filterOptions?.enableLowpass ?? preset.enableLowpass,
				lowpassFrequency: config.filterOptions?.lowpassFrequency ?? preset.lowpassFrequency,
				enableNotch: config.filterOptions?.enableNotch ?? preset.enableTurbineNotch1,
				notchFrequency: config.filterOptions?.notchFrequency ?? preset.notch1Frequency,
				notchQ: config.filterOptions?.notchQ ?? preset.notch1Q,
				enableTurbineNotch2: config.filterOptions?.enableTurbineNotch2 ?? preset.enableTurbineNotch2,
				notch2Frequency: config.filterOptions?.notch2Frequency ?? preset.notch2Frequency,
				notch2Q: config.filterOptions?.notch2Q ?? preset.notch2Q,
				enableCompressor: config.filterOptions?.enableCompressor ?? preset.enableCompressor,
				compressorThreshold: config.filterOptions?.compressorThreshold ?? preset.compressorThreshold,
				compressorRatio: config.filterOptions?.compressorRatio ?? preset.compressorRatio,
				enableLimiter: config.filterOptions?.enableLimiter ?? preset.enableLimiter,
				dspProfile: profile,
			},
			vadOptions: {
				enabled: config.vadOptions?.enabled ?? true,
				speechThresholdRms: config.vadOptions?.speechThresholdRms ?? 0.016,
				silenceThresholdRms: config.vadOptions?.silenceThresholdRms ?? 0.008,
				silenceTimeoutMs: config.vadOptions?.silenceTimeoutMs ?? 1800,
				minSpeechDurationMs: config.vadOptions?.minSpeechDurationMs ?? 300,
				maxSpeechDurationMs: config.vadOptions?.maxSpeechDurationMs ?? 30000,
			},
			onPcmChunk: config.onPcmChunk ?? (() => {}),
			onSpeechStart: config.onSpeechStart ?? (() => {}),
			onSpeechEnd: config.onSpeechEnd ?? (() => {}),
			onSilenceTimeout: config.onSilenceTimeout ?? (() => {}),
			onRmsUpdate: config.onRmsUpdate ?? (() => {}),
			onError: config.onError ?? (() => {}),
		};
	}

	/**
	 * Запуск захвата микрофона, построение графа фильтров и запуск VAD.
	 */
	public async start(): Promise<void> {
		if (this.isRunning) return;

		try {
			// 1. Запрос микрофона с подавлением эха и системным шумом
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
					channelCount: 1,
				},
			});
			this.mediaStream = stream;

			// 2. Инициализация AudioContext
			const AudioCtxClass =
				window.AudioContext ||
				// biome-ignore lint/suspicious/noExplicitAny: WebKit AudioContext fallback
				(window as any).webkitAudioContext;
			const audioCtx = new AudioCtxClass();
			if (audioCtx.state === "suspended") {
				await audioCtx.resume();
			}
			this.audioContext = audioCtx;

			// 3. Создание источника
			const source = audioCtx.createMediaStreamSource(stream);
			this.sourceNode = source;

			// 4. Построение цепочки стоматологической фильтрации шумов
			let lastNode: AudioNode = source;

			// 4a. Highpass фильтр: срезает компрессор и низкий гул (<120Hz)
			if (this.config.filterOptions.enableHighpass) {
				const highpass = audioCtx.createBiquadFilter();
				highpass.type = "highpass";
				highpass.frequency.value = this.config.filterOptions.highpassFrequency;
				highpass.Q.value = 0.707; // Butterworth
				lastNode.connect(highpass);
				lastNode = highpass;
				this.highpassFilter = highpass;
			}

			// 4b. Lowpass фильтр: срезает высокочастотный ультразвуковой шум (>7200Hz)
			if (this.config.filterOptions.enableLowpass) {
				const lowpass = audioCtx.createBiquadFilter();
				lowpass.type = "lowpass";
				lowpass.frequency.value = this.config.filterOptions.lowpassFrequency;
				lowpass.Q.value = 0.707;
				lastNode.connect(lowpass);
				lastNode = lowpass;
				this.lowpassFilter = lowpass;
			}

			// 4c. Notch фильтр 1: срезает турбинный резонанс (4500Hz)
			if (this.config.filterOptions.enableNotch) {
				const notch = audioCtx.createBiquadFilter();
				notch.type = "notch";
				notch.frequency.value = this.config.filterOptions.notchFrequency;
				notch.Q.value = this.config.filterOptions.notchQ;
				lastNode.connect(notch);
				lastNode = notch;
				this.notchFilter = notch;
			}

			// 4d. Notch фильтр 2: срезает 2-ю гармонику турбины / пьезо-скейлер (6000Hz)
			if (this.config.filterOptions.enableTurbineNotch2) {
				const notch2 = audioCtx.createBiquadFilter();
				notch2.type = "notch";
				notch2.frequency.value = this.config.filterOptions.notch2Frequency;
				notch2.Q.value = this.config.filterOptions.notch2Q;
				lastNode.connect(notch2);
				lastNode = notch2;
				this.notch2Filter = notch2;
			}

			// 4e. Dynamic Range Compressor (выравнивание тихого голоса врача с расстояния 2-4 м)
			if (this.config.filterOptions.enableCompressor) {
				const comp = audioCtx.createDynamicsCompressor();
				comp.threshold.value = this.config.filterOptions.compressorThreshold;
				comp.knee.value = 12;
				comp.ratio.value = this.config.filterOptions.compressorRatio;
				comp.attack.value = 0.003;
				comp.release.value = 0.15;
				lastNode.connect(comp);
				lastNode = comp;
				this.compressorNode = comp;
			}

			// 4f. Brickwall Limiter (защита от перегруза и клиппинга)
			if (this.config.filterOptions.enableLimiter) {
				const lim = audioCtx.createDynamicsCompressor();
				lim.threshold.value = -2.0;
				lim.knee.value = 2.0;
				lim.ratio.value = 20.0;
				lim.attack.value = 0.001;
				lim.release.value = 0.05;
				lastNode.connect(lim);
				lastNode = lim;
				this.limiterNode = lim;
			}

			// 4g. Gain Node
			const gain = audioCtx.createGain();
			gain.gain.value = 1.0;
			lastNode.connect(gain);
			lastNode = gain;
			this.gainNode = gain;

			// 4e. AnalyserNode для 60 FPS CanvasWaveform
			const analyser = audioCtx.createAnalyser();
			analyser.fftSize = 256;
			analyser.smoothingTimeConstant = 0.8;
			lastNode.connect(analyser);
			this.analyserNode = analyser;

			// 5. Подключение AudioWorklet для 16kHz PCM потока
			const workletRegistered = await registerDentalAudioWorklet(audioCtx);
			if (workletRegistered) {
				try {
					const worklet = new AudioWorkletNode(
						audioCtx,
						DENTAL_AUDIO_WORKLET_PROCESSOR_NAME,
						{
							processorOptions: {
								targetSampleRate: this.config.targetSampleRate,
								chunkSize: this.config.chunkSize,
								rmsThreshold: this.config.vadOptions.speechThresholdRms,
							},
						},
					);

					worklet.port.onmessage = (event) => {
						if (this.isPaused || !this.isRunning) return;
						const msg = event.data;
						if (msg && msg.type === "pcm_chunk") {
							this.handleIncomingPcmChunk(msg.pcm, msg.rms);
						}
					};

					analyser.connect(worklet);
					this.workletNode = worklet;
				} catch (workletError) {
					console.warn(
						"AudioWorkletNode creation failed, using ScriptProcessor fallback:",
						workletError,
					);
					this.setupScriptProcessorFallback(analyser, audioCtx);
				}
			} else {
				this.setupScriptProcessorFallback(analyser, audioCtx);
			}

			this.isRunning = true;
			this.isPaused = false;
			this.sessionPcmChunks = [];
			this.totalSessionSamples = 0;
			this.isSpeaking = false;
		} catch (error) {
			const err =
				error instanceof Error ? error : new Error(String(error));
			this.config.onError(err);
			this.dispose();
			throw err;
		}
	}

	/**
	 * Резервный ScriptProcessor для браузеров без AudioWorklet
	 * Включает обязательный Mute Gain (0.0) для полного подавления акустической обратной связи
	 */
	private setupScriptProcessorFallback(
		sourceNode: AudioNode,
		audioCtx: AudioContext,
	): void {
		const bufferSize = 4096;
		const scriptProcessor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
		const inputSampleRate = audioCtx.sampleRate;
		const targetSampleRate = this.config.targetSampleRate;
		const ratio = inputSampleRate / targetSampleRate;

		scriptProcessor.onaudioprocess = (e) => {
			if (this.isPaused || !this.isRunning) return;
			const input = e.inputBuffer.getChannelData(0);
			if (!input || input.length === 0) return;

			// Расчет RMS
			let sumSq = 0;
			for (let i = 0; i < input.length; i++) {
				const sample = input[i] ?? 0;
				sumSq += sample * sample;
			}
			const rms = Math.sqrt(sumSq / input.length);

			// Ресэмплинг в Int16
			const outLen = Math.floor(input.length / ratio);
			const pcm = new Int16Array(outLen);
			for (let i = 0; i < outLen; i++) {
				const srcIdx = Math.floor(i * ratio);
				const sample = Math.max(-1.0, Math.min(1.0, input[srcIdx] ?? 0));
				pcm[i] = sample < 0 ? sample * 32768 : sample * 32767;
			}

			this.handleIncomingPcmChunk(pcm, rms);
		};

		// Mute Gain Node (0.0): обеспечивает работу часов Web Audio без свиста и эха в колонках
		const muteGain = audioCtx.createGain();
		muteGain.gain.value = 0.0;
		this.muteGainNode = muteGain;

		sourceNode.connect(scriptProcessor);
		scriptProcessor.connect(muteGain);
		muteGain.connect(audioCtx.destination);
		this.scriptProcessorNode = scriptProcessor;
	}

	/**
	 * Обработка входящего 16kHz PCM чанка и логика VAD с авто-отправкой при тишине > 1.8с.
	 */
	private handleIncomingPcmChunk(pcm: Int16Array, rms: number): void {
		const now = Date.now();

		// Обновляем плавающий уровень фонового шума
		this.noiseFloorRms = this.noiseFloorRms * 0.95 + rms * 0.05;

		this.config.onRmsUpdate(rms, this.isSpeaking);
		this.config.onPcmChunk(pcm, rms, this.config.targetSampleRate);

		if (!this.config.vadOptions.enabled) {
			this.sessionPcmChunks.push(pcm);
			this.totalSessionSamples += pcm.length;
			return;
		}

		const speechThreshold = Math.max(
			this.config.vadOptions.speechThresholdRms,
			this.noiseFloorRms * 2.2,
		);
		const silenceThreshold = this.config.vadOptions.silenceThresholdRms;

		if (rms >= speechThreshold) {
			// Обнаружена речь
			this.lastSpeechTime = now;
			if (!this.isSpeaking) {
				this.isSpeaking = true;
				this.silenceTimeoutTriggered = false;
				this.speechStartTime = now;
				this.sessionPcmChunks = [];
				this.totalSessionSamples = 0;
				this.config.onSpeechStart();

				// Таймер максимальной длины записи
				if (this.maxDurationTimer) clearTimeout(this.maxDurationTimer);
				this.maxDurationTimer = setTimeout(() => {
					this.maxDurationTimer = null;
					this.flushCurrentSpeechSegment("max_duration");
				}, this.config.vadOptions.maxSpeechDurationMs);
			}

			// Сбрасываем таймер тишины
			if (this.silenceTimer) {
				clearTimeout(this.silenceTimer);
				this.silenceTimer = null;
			}

			this.sessionPcmChunks.push(pcm);
			this.totalSessionSamples += pcm.length;
		} else if (this.isSpeaking) {
			// Была речь, сейчас громкость ниже порога
			this.sessionPcmChunks.push(pcm);
			this.totalSessionSamples += pcm.length;

			if (rms <= silenceThreshold && !this.silenceTimer && !this.silenceTimeoutTriggered) {
				// Запуск таймера тишины на 1.8 сек (Hands-free режим)
				this.silenceTimer = setTimeout(() => {
					this.silenceTimer = null;
					this.flushCurrentSpeechSegment("silence_timeout");
				}, this.config.vadOptions.silenceTimeoutMs);
			}
		}

		// Защита от бесконечного накопления сэмплов в оперативной памяти (Anti-RAM-Hog)
		// 9 600 000 сэмплов @ 16kHz = 10 минут непрерывной записи без пауз (~19.2 МБ)
		if (this.totalSessionSamples > 9_600_000) {
			this.flushCurrentSpeechSegment("max_duration");
		}
	}

	/**
	 * Автоматический сброс речевого сегмента при тишине > 1.8с или превышении лимита
	 */
	private flushCurrentSpeechSegment(
		reason: "silence_timeout" | "max_duration" | "manual_stop",
	): void {
		if (this.isFlushing) return;
		if (!this.isRunning && reason !== "manual_stop") return;
		if (!this.isSpeaking && this.sessionPcmChunks.length === 0) return;
		if (reason === "silence_timeout" && this.silenceTimeoutTriggered) return;

		this.isFlushing = true;
		try {
			if (this.silenceTimer) {
				clearTimeout(this.silenceTimer);
				this.silenceTimer = null;
			}
			if (this.maxDurationTimer) {
				clearTimeout(this.maxDurationTimer);
				this.maxDurationTimer = null;
			}

			if (reason === "silence_timeout") {
				this.silenceTimeoutTriggered = true;
			}

			const durationMs = this.speechStartTime > 0 ? Date.now() - this.speechStartTime : 0;
			const combined = this.exportCombinedInt16Array();

			this.isSpeaking = false;
			this.sessionPcmChunks = [];
			this.totalSessionSamples = 0;

			if (durationMs >= this.config.vadOptions.minSpeechDurationMs) {
				this.config.onSpeechEnd(durationMs);
				if (reason === "silence_timeout") {
					this.config.onSilenceTimeout(combined, durationMs);
				}
			}
		} finally {
			this.isFlushing = false;
		}
	}

	/**
	 * Получение AnalyserNode для рендеринга звуковой волны в CanvasWaveform
	 */
	public getAnalyserNode(): AnalyserNode | null {
		return this.analyserNode;
	}

	/**
	 * Мгновенный уровень громкости от 0.0 до 1.0
	 */
	public getAudioLevel(): number {
		if (!this.analyserNode) return 0;
		const buffer = new Uint8Array(this.analyserNode.frequencyBinCount);
		this.analyserNode.getByteTimeDomainData(buffer);
		let sumSq = 0;
		for (let i = 0; i < buffer.length; i++) {
			const sample = buffer[i] ?? 128;
			const norm = (sample - 128) / 128.0;
			sumSq += norm * norm;
		}
		const rms = Math.sqrt(sumSq / buffer.length);
		return Math.min(1.0, rms * 4.0);
	}

	/**
	 * Объединение всех накопленных кусков PCM в единый Int16Array
	 */
	public exportCombinedInt16Array(customChunks?: Int16Array[]): Int16Array {
		const chunks = customChunks ?? this.sessionPcmChunks;
		let totalLen = 0;
		for (const chunk of chunks) {
			totalLen += chunk.length;
		}
		const result = new Int16Array(totalLen);
		let offset = 0;
		for (const chunk of chunks) {
			result.set(chunk, offset);
			offset += chunk.length;
		}
		return result;
	}

	/**
	 * Сборка валидного 16-bit Mono WAV Blob со стандартным 44-байтовым RIFF заголовком
	 */
	public exportWavBlob(
		customChunks?: Int16Array[],
		sampleRate?: number,
	): Blob {
		const pcm = this.exportCombinedInt16Array(customChunks);
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

		// RIFF chunk descriptor
		this.writeAsciiString(view, 0, "RIFF");
		view.setUint32(4, totalSize - 8, true);
		this.writeAsciiString(view, 8, "WAVE");

		// "fmt " sub-chunk
		this.writeAsciiString(view, 12, "fmt ");
		view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
		view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
		view.setUint16(22, numChannels, true);
		view.setUint32(24, rate, true);
		view.setUint32(28, byteRate, true);
		view.setUint16(32, blockAlign, true);
		view.setUint16(34, bitsPerSample, true);

		// "data" sub-chunk
		this.writeAsciiString(view, 36, "data");
		view.setUint32(40, dataSize, true);

		// Запись PCM сэмплов
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

	public pause(): void {
		this.isPaused = true;
	}

	public resume(): void {
		this.isPaused = false;
	}

	public stop(): Int16Array {
		const combined = this.exportCombinedInt16Array();
		this.flushCurrentSpeechSegment("manual_stop");
		this.dispose();
		return combined;
	}

	/**
	 * Полное освобождение всех Web Audio узлов, остановка треков и закрытие контекста
	 */
	public dispose(): void {
		this.isRunning = false;
		this.isPaused = false;
		this.isSpeaking = false;
		this.silenceTimeoutTriggered = false;

		if (this.silenceTimer) {
			clearTimeout(this.silenceTimer);
			this.silenceTimer = null;
		}
		if (this.maxDurationTimer) {
			clearTimeout(this.maxDurationTimer);
			this.maxDurationTimer = null;
		}

		if (this.workletNode) {
			try {
				this.workletNode.port.onmessage = null;
				this.workletNode.disconnect();
			} catch (err: unknown) {
				logger.warn("[AudioStreamManager] workletNode disconnect error:", err);
			}
			this.workletNode = null;
		}

		if (this.scriptProcessorNode) {
			try {
				this.scriptProcessorNode.onaudioprocess = null;
				this.scriptProcessorNode.disconnect();
			} catch (err: unknown) {
				logger.warn("[AudioStreamManager] scriptProcessorNode disconnect error:", err);
			}
			this.scriptProcessorNode = null;
		}

		if (this.muteGainNode) {
			try {
				this.muteGainNode.disconnect();
			} catch (err: unknown) {
				logger.warn("[AudioStreamManager] muteGainNode disconnect error:", err);
			}
			this.muteGainNode = null;
		}

		if (this.highpassFilter) {
			try {
				this.highpassFilter.disconnect();
			} catch (err: unknown) {
				logger.warn("[AudioStreamManager] highpassFilter disconnect error:", err);
			}
			this.highpassFilter = null;
		}

		if (this.lowpassFilter) {
			try {
				this.lowpassFilter.disconnect();
			} catch (err: unknown) {
				logger.warn("[AudioStreamManager] lowpassFilter disconnect error:", err);
			}
			this.lowpassFilter = null;
		}

		if (this.notchFilter) {
			try {
				this.notchFilter.disconnect();
			} catch (err: unknown) {
				logger.warn("[AudioStreamManager] notchFilter disconnect error:", err);
			}
			this.notchFilter = null;
		}

		if (this.notch2Filter) {
			try {
				this.notch2Filter.disconnect();
			} catch (err: unknown) {
				logger.warn("[AudioStreamManager] notch2Filter disconnect error:", err);
			}
			this.notch2Filter = null;
		}

		if (this.compressorNode) {
			try {
				this.compressorNode.disconnect();
			} catch (err: unknown) {
				logger.warn("[AudioStreamManager] compressorNode disconnect error:", err);
			}
			this.compressorNode = null;
		}

		if (this.limiterNode) {
			try {
				this.limiterNode.disconnect();
			} catch (err: unknown) {
				logger.warn("[AudioStreamManager] limiterNode disconnect error:", err);
			}
			this.limiterNode = null;
		}

		if (this.gainNode) {
			try {
				this.gainNode.disconnect();
			} catch (err: unknown) {
				logger.warn("[AudioStreamManager] gainNode disconnect error:", err);
			}
			this.gainNode = null;
		}

		if (this.analyserNode) {
			try {
				this.analyserNode.disconnect();
			} catch (err: unknown) {
				logger.warn("[AudioStreamManager] analyserNode disconnect error:", err);
			}
			this.analyserNode = null;
		}

		if (this.sourceNode) {
			try {
				this.sourceNode.disconnect();
			} catch (err: unknown) {
				logger.warn("[AudioStreamManager] sourceNode disconnect error:", err);
			}
			this.sourceNode = null;
		}

		if (this.mediaStream) {
			this.mediaStream.getTracks().forEach((t) => {
				try {
					t.stop();
				} catch (err: unknown) {
					logger.warn("[AudioStreamManager] mediaStream track stop error:", err);
				}
			});
			this.mediaStream = null;
		}

		// Очищаем накопленные многомегабайтные буферы PCM в оперативной памяти
		this.sessionPcmChunks = [];
		this.totalSessionSamples = 0;

		if (this.audioContext) {
			const ctx = this.audioContext;
			this.audioContext = null;
			try {
				if (ctx.state !== "closed" && typeof ctx.close === "function") {
					void ctx.close().catch((err: unknown) => {
						logger.warn("[AudioStreamManager] audioContext close async error:", err);
					});
				}
			} catch (err: unknown) {
				logger.warn("[AudioStreamManager] audioContext close error:", err);
			}
		}
	}

	public getDspProfile(): DentalDspProfile {
		return this.config.filterOptions.dspProfile;
	}

	public setDspProfile(profile: DentalDspProfile): void {
		const preset = DENTAL_DSP_PRESETS[profile];
		this.config.filterOptions = {
			...this.config.filterOptions,
			enableHighpass: preset.enableHighpass,
			highpassFrequency: preset.highpassFrequency,
			enableLowpass: preset.enableLowpass,
			lowpassFrequency: preset.lowpassFrequency,
			enableNotch: preset.enableTurbineNotch1,
			notchFrequency: preset.notch1Frequency,
			notchQ: preset.notch1Q,
			enableTurbineNotch2: preset.enableTurbineNotch2,
			notch2Frequency: preset.notch2Frequency,
			notch2Q: preset.notch2Q,
			enableCompressor: preset.enableCompressor,
			compressorThreshold: preset.compressorThreshold,
			compressorRatio: preset.compressorRatio,
			enableLimiter: preset.enableLimiter,
			dspProfile: profile,
		};

		if (this.highpassFilter && this.audioContext) {
			this.highpassFilter.frequency.setValueAtTime(
				preset.highpassFrequency,
				this.audioContext.currentTime,
			);
		}
		if (this.notchFilter && this.audioContext) {
			this.notchFilter.frequency.setValueAtTime(
				preset.notch1Frequency,
				this.audioContext.currentTime,
			);
			this.notchFilter.Q.setValueAtTime(
				preset.notch1Q,
				this.audioContext.currentTime,
			);
		}
		if (this.notch2Filter && this.audioContext) {
			this.notch2Filter.frequency.setValueAtTime(
				preset.notch2Frequency,
				this.audioContext.currentTime,
			);
			this.notch2Filter.Q.setValueAtTime(
				preset.notch2Q,
				this.audioContext.currentTime,
			);
		}
		if (this.compressorNode && this.audioContext) {
			this.compressorNode.threshold.setValueAtTime(
				preset.compressorThreshold,
				this.audioContext.currentTime,
			);
			this.compressorNode.ratio.setValueAtTime(
				preset.compressorRatio,
				this.audioContext.currentTime,
			);
		}
	}
}
