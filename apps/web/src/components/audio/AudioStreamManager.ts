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

export interface DentalNoiseFilterOptions {
	enableHighpass?: boolean | undefined; // Default true: 120 Hz
	highpassFrequency?: number | undefined;
	enableLowpass?: boolean | undefined; // Default true: 7200 Hz
	lowpassFrequency?: number | undefined;
	enableNotch?: boolean | undefined; // Default true: 4000 Hz
	notchFrequency?: number | undefined;
	notchQ?: number | undefined;
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

	constructor(config: AudioStreamManagerConfig = {}) {
		this.config = {
			targetSampleRate: config.targetSampleRate ?? 16000,
			chunkSize: config.chunkSize ?? 2048,
			filterOptions: {
				enableHighpass: config.filterOptions?.enableHighpass ?? true,
				highpassFrequency: config.filterOptions?.highpassFrequency ?? 120,
				enableLowpass: config.filterOptions?.enableLowpass ?? true,
				lowpassFrequency: config.filterOptions?.lowpassFrequency ?? 7200,
				enableNotch: config.filterOptions?.enableNotch ?? true,
				notchFrequency: config.filterOptions?.notchFrequency ?? 4000,
				notchQ: config.filterOptions?.notchQ ?? 4.0,
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

			// 4c. Notch фильтр: срезает турбинный резонанс 4000Hz
			if (this.config.filterOptions.enableNotch) {
				const notch = audioCtx.createBiquadFilter();
				notch.type = "notch";
				notch.frequency.value = this.config.filterOptions.notchFrequency;
				notch.Q.value = this.config.filterOptions.notchQ;
				lastNode.connect(notch);
				lastNode = notch;
				this.notchFilter = notch;
			}

			// 4d. Gain Node
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
				this.speechStartTime = now;
				this.sessionPcmChunks = [];
				this.totalSessionSamples = 0;
				this.config.onSpeechStart();

				// Таймер максимальной длины записи
				if (this.maxDurationTimer) clearTimeout(this.maxDurationTimer);
				this.maxDurationTimer = setTimeout(() => {
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

			if (rms <= silenceThreshold && !this.silenceTimer) {
				// Запуск таймера тишины на 1.8 сек (Hands-free режим)
				this.silenceTimer = setTimeout(() => {
					this.flushCurrentSpeechSegment("silence_timeout");
				}, this.config.vadOptions.silenceTimeoutMs);
			}
		}
	}

	/**
	 * Автоматический сброс речевого сегмента при тишине > 1.8с или превышении лимита
	 */
	private flushCurrentSpeechSegment(
		reason: "silence_timeout" | "max_duration" | "manual_stop",
	): void {
		if (!this.isSpeaking && this.sessionPcmChunks.length === 0) return;

		const durationMs = this.speechStartTime > 0 ? Date.now() - this.speechStartTime : 0;
		const combined = this.exportCombinedInt16Array();

		if (this.silenceTimer) {
			clearTimeout(this.silenceTimer);
			this.silenceTimer = null;
		}
		if (this.maxDurationTimer) {
			clearTimeout(this.maxDurationTimer);
			this.maxDurationTimer = null;
		}

		this.isSpeaking = false;
		this.sessionPcmChunks = [];
		this.totalSessionSamples = 0;

		if (durationMs >= this.config.vadOptions.minSpeechDurationMs) {
			this.config.onSpeechEnd(durationMs);
			if (reason === "silence_timeout") {
				this.config.onSilenceTimeout(combined, durationMs);
			}
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
		this.flushCurrentSpeechSegment("manual_stop");
		const combined = this.exportCombinedInt16Array();
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
				this.workletNode.disconnect();
			} catch {}
			this.workletNode = null;
		}

		if (this.scriptProcessorNode) {
			try {
				this.scriptProcessorNode.disconnect();
			} catch {}
			this.scriptProcessorNode = null;
		}

		if (this.muteGainNode) {
			try {
				this.muteGainNode.disconnect();
			} catch {}
			this.muteGainNode = null;
		}

		if (this.highpassFilter) {
			try {
				this.highpassFilter.disconnect();
			} catch {}
			this.highpassFilter = null;
		}

		if (this.lowpassFilter) {
			try {
				this.lowpassFilter.disconnect();
			} catch {}
			this.lowpassFilter = null;
		}

		if (this.notchFilter) {
			try {
				this.notchFilter.disconnect();
			} catch {}
			this.notchFilter = null;
		}

		if (this.gainNode) {
			try {
				this.gainNode.disconnect();
			} catch {}
			this.gainNode = null;
		}

		if (this.analyserNode) {
			try {
				this.analyserNode.disconnect();
			} catch {}
			this.analyserNode = null;
		}

		if (this.sourceNode) {
			try {
				this.sourceNode.disconnect();
			} catch {}
			this.sourceNode = null;
		}

		if (this.mediaStream) {
			this.mediaStream.getTracks().forEach((t) => {
				try {
					t.stop();
				} catch {}
			});
			this.mediaStream = null;
		}

		if (this.audioContext && this.audioContext.state !== "closed") {
			try {
				this.audioContext.close();
			} catch {}
			this.audioContext = null;
		}
	}
}
