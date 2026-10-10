/**
 * index.ts — Layer 4: AudioStreamManager master coordinator.
 * Coordinates microphone capture, dental acoustic noise filtering, VAD, and 16kHz PCM streaming.
 */

import {
	DENTAL_AUDIO_WORKLET_PROCESSOR_NAME,
	registerDentalAudioWorklet,
} from "../AudioWorkletProcessor";
import { logger } from "../../../utils/logger";
import {
	DENTAL_DSP_PRESETS,
	type DentalDspProfile,
} from "../../../services/voice/audioFilters";
import {
	type AudioStreamManagerConfig,
	type ResolvedAudioStreamManagerConfig,
} from "./types";
import {
	createAudioContext,
	requestMicrophoneStream,
	buildDentalFilterChain,
	applyDspPresetToNodes,
	disconnectNode,
	stopMediaStreamTracks,
	closeAudioContext,
} from "./audioContextFactory";
import {
	exportCombinedInt16Array,
	exportWavBlob,
	writeAsciiString,
	calculateAudioLevelFromAnalyser,
	calculateRms,
	resampleFloat32ToInt16,
} from "./audioPcmProcessor";
import { AudioVadDetector } from "./audioVadDetector";
import { AudioSessionManager } from "./audioSessionManager";

export * from "./types";
export * from "./audioContextFactory";
export * from "./audioPcmProcessor";
export * from "./audioVadDetector";
export * from "./audioSessionManager";

export class AudioStreamManager {
	private config: ResolvedAudioStreamManagerConfig;
	public audioContext: AudioContext | null = null;
	public mediaStream: MediaStream | null = null;
	public sourceNode: MediaStreamAudioSourceNode | null = null;
	public highpassFilter: BiquadFilterNode | null = null;
	public lowpassFilter: BiquadFilterNode | null = null;
	public notchFilter: BiquadFilterNode | null = null;
	public notch2Filter: BiquadFilterNode | null = null;
	public compressorNode: DynamicsCompressorNode | null = null;
	public limiterNode: DynamicsCompressorNode | null = null;
	public gainNode: GainNode | null = null;
	public analyserNode: AnalyserNode | null = null;
	public workletNode: AudioWorkletNode | null = null;
	public scriptProcessorNode: ScriptProcessorNode | null = null;
	public muteGainNode: GainNode | null = null;

	// Суб-менеджеры VAD и аудио-сессии
	public readonly sessionManager: AudioSessionManager;
	public readonly vadDetector: AudioVadDetector;
	private isFlushing = false;

	// Прокси-геттеры и сеттеры для прозрачной обратной совместимости с тестами
	public get isRunning(): boolean {
		return this.sessionManager.isRunning;
	}
	public set isRunning(value: boolean) {
		this.sessionManager.isRunning = value;
	}

	public get isPaused(): boolean {
		return this.sessionManager.isPaused;
	}
	public set isPaused(value: boolean) {
		this.sessionManager.isPaused = value;
	}

	public get isSpeaking(): boolean {
		return this.vadDetector.isSpeaking;
	}
	public set isSpeaking(value: boolean) {
		this.vadDetector.isSpeaking = value;
	}

	public get speechStartTime(): number {
		return this.vadDetector.speechStartTime;
	}
	public set speechStartTime(value: number) {
		this.vadDetector.speechStartTime = value;
	}

	public get lastSpeechTime(): number {
		return this.vadDetector.lastSpeechTime;
	}
	public set lastSpeechTime(value: number) {
		this.vadDetector.lastSpeechTime = value;
	}

	public get silenceTimer(): ReturnType<typeof setTimeout> | null {
		return this.vadDetector.silenceTimer;
	}
	public set silenceTimer(timer: ReturnType<typeof setTimeout> | null) {
		this.vadDetector.silenceTimer = timer;
	}

	public get maxDurationTimer(): ReturnType<typeof setTimeout> | null {
		return this.vadDetector.maxDurationTimer;
	}
	public set maxDurationTimer(timer: ReturnType<typeof setTimeout> | null) {
		this.vadDetector.maxDurationTimer = timer;
	}

	public get silenceTimeoutTriggered(): boolean {
		return this.vadDetector.silenceTimeoutTriggered;
	}
	public set silenceTimeoutTriggered(val: boolean) {
		this.vadDetector.silenceTimeoutTriggered = val;
	}

	public get noiseFloorRms(): number {
		return this.vadDetector.noiseFloorRms;
	}
	public set noiseFloorRms(val: number) {
		this.vadDetector.noiseFloorRms = val;
	}

	public get sessionPcmChunks(): Int16Array[] {
		return this.sessionManager.sessionPcmChunks;
	}
	public set sessionPcmChunks(chunks: Int16Array[]) {
		this.sessionManager.sessionPcmChunks = chunks;
	}

	public get totalSessionSamples(): number {
		return this.sessionManager.totalSessionSamples;
	}
	public set totalSessionSamples(count: number) {
		this.sessionManager.totalSessionSamples = count;
	}

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

		this.sessionManager = new AudioSessionManager({
			onSampleCeilingExceeded: () => {
				this.flushCurrentSpeechSegment("max_duration");
			},
		});

		this.vadDetector = new AudioVadDetector(this.config.vadOptions, {
			onSpeechStart: () => {
				this.sessionManager.clearChunks();
				this.config.onSpeechStart();
			},
			onSpeechEnd: (durationMs: number) => {
				if (durationMs >= this.config.vadOptions.minSpeechDurationMs) {
					this.config.onSpeechEnd(durationMs);
				}
			},
			onSilenceTimeout: () => {
				this.flushCurrentSpeechSegment("silence_timeout");
			},
			onMaxDuration: () => {
				this.flushCurrentSpeechSegment("max_duration");
			},
		});
	}

	/**
	 * Запуск захвата микрофона, построение графа фильтров и запуск VAD.
	 */
	public async start(): Promise<void> {
		if (this.isRunning) return;

		try {
			// 1. Запрос микрофона с подавлением эха и системным шумом
			const stream = await requestMicrophoneStream();
			this.mediaStream = stream;

			// 2. Инициализация AudioContext
			const audioCtx = createAudioContext();
			if (audioCtx.state === "suspended") {
				await audioCtx.resume();
			}
			this.audioContext = audioCtx;

			// 3. Создание источника
			const source = audioCtx.createMediaStreamSource(stream);
			this.sourceNode = source;

			// 4. Построение цепочки стоматологической фильтрации шумов
			const filterNodes = buildDentalFilterChain(
				audioCtx,
				source,
				this.config.filterOptions,
			);
			this.highpassFilter = filterNodes.highpassFilter;
			this.lowpassFilter = filterNodes.lowpassFilter;
			this.notchFilter = filterNodes.notchFilter;
			this.notch2Filter = filterNodes.notch2Filter;
			this.compressorNode = filterNodes.compressorNode;
			this.limiterNode = filterNodes.limiterNode;
			this.gainNode = filterNodes.gainNode;
			this.analyserNode = filterNodes.analyserNode;

			const analyser = filterNodes.analyserNode;
			if (!analyser) {
				throw new Error("Failed to initialize analyser node");
			}

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

			this.sessionManager.start();
			this.vadDetector.reset();
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
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

			const rms = calculateRms(input);
			const pcm = resampleFloat32ToInt16(input, ratio);

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
	public handleIncomingPcmChunk(pcm: Int16Array, rms: number): void {
		const now = Date.now();

		this.config.onRmsUpdate(rms, this.isSpeaking);
		this.config.onPcmChunk(pcm, rms, this.config.targetSampleRate);

		if (!this.config.vadOptions.enabled) {
			this.sessionManager.appendChunk(pcm);
			return;
		}

		const speechThreshold = Math.max(
			this.config.vadOptions.speechThresholdRms,
			this.noiseFloorRms * 2.2,
		);
		const silenceThreshold = this.config.vadOptions.silenceThresholdRms;

		// Обновляем плавающий уровень фонового шума
		this.noiseFloorRms = this.noiseFloorRms * 0.95 + rms * 0.05;

		if (rms >= speechThreshold) {
			// Обнаружена речь
			this.lastSpeechTime = now;
			if (!this.isSpeaking) {
				this.isSpeaking = true;
				this.silenceTimeoutTriggered = false;
				this.speechStartTime = now;
				this.sessionManager.clearChunks();
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

			this.sessionManager.appendChunk(pcm);
		} else if (this.isSpeaking) {
			// Была речь, сейчас громкость ниже порога
			this.sessionManager.appendChunk(pcm);

			if (rms <= silenceThreshold && !this.silenceTimer && !this.silenceTimeoutTriggered) {
				// Запуск таймера тишины на 1.8 сек (Hands-free режим)
				this.silenceTimer = setTimeout(() => {
					this.silenceTimer = null;
					this.flushCurrentSpeechSegment("silence_timeout");
				}, this.config.vadOptions.silenceTimeoutMs);
			}
		}

		// Защита от бесконечного накопления сэмплов в оперативной памяти (Anti-RAM-Hog)
		if (this.totalSessionSamples > this.sessionManager.sampleCeiling) {
			this.flushCurrentSpeechSegment("max_duration");
		}
	}

	/**
	 * Автоматический сброс речевого сегмента при тишине > 1.8с или превышении лимита
	 */
	public flushCurrentSpeechSegment(
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
			this.sessionManager.clearChunks();

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
		return calculateAudioLevelFromAnalyser(this.analyserNode);
	}

	/**
	 * Объединение всех накопленных кусков PCM в единый Int16Array
	 */
	public exportCombinedInt16Array(customChunks?: Int16Array[]): Int16Array {
		const chunks = customChunks ?? this.sessionPcmChunks;
		return exportCombinedInt16Array(chunks);
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
		return exportWavBlob(pcm, rate);
	}

	public writeAsciiString(view: DataView, offset: number, str: string): void {
		writeAsciiString(view, offset, str);
	}

	public pause(): void {
		this.sessionManager.pause();
	}

	public resume(): void {
		this.sessionManager.resume();
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
		this.sessionManager.stop();
		this.vadDetector.reset();

		if (this.workletNode) {
			try {
				this.workletNode.port.onmessage = null;
			} catch (err: unknown) {
				logger.warn("[AudioStreamManager] workletNode message listener clear error:", err);
			}
			disconnectNode(this.workletNode, "workletNode");
			this.workletNode = null;
		}

		if (this.scriptProcessorNode) {
			try {
				this.scriptProcessorNode.onaudioprocess = null;
			} catch (err: unknown) {
				logger.warn("[AudioStreamManager] scriptProcessorNode handler clear error:", err);
			}
			disconnectNode(this.scriptProcessorNode, "scriptProcessorNode");
			this.scriptProcessorNode = null;
		}

		disconnectNode(this.muteGainNode, "muteGainNode");
		this.muteGainNode = null;

		disconnectNode(this.highpassFilter, "highpassFilter");
		this.highpassFilter = null;

		disconnectNode(this.lowpassFilter, "lowpassFilter");
		this.lowpassFilter = null;

		disconnectNode(this.notchFilter, "notchFilter");
		this.notchFilter = null;

		disconnectNode(this.notch2Filter, "notch2Filter");
		this.notch2Filter = null;

		disconnectNode(this.compressorNode, "compressorNode");
		this.compressorNode = null;

		disconnectNode(this.limiterNode, "limiterNode");
		this.limiterNode = null;

		disconnectNode(this.gainNode, "gainNode");
		this.gainNode = null;

		disconnectNode(this.analyserNode, "analyserNode");
		this.analyserNode = null;

		disconnectNode(this.sourceNode, "sourceNode");
		this.sourceNode = null;

		if (this.mediaStream) {
			stopMediaStreamTracks(this.mediaStream);
			this.mediaStream = null;
		}

		this.sessionManager.clearChunks();

		if (this.audioContext) {
			const ctx = this.audioContext;
			this.audioContext = null;
			closeAudioContext(ctx);
		}
	}

	public getDspProfile(): DentalDspProfile {
		return this.config.filterOptions.dspProfile;
	}

	public setDspProfile(profile: DentalDspProfile): void {
		this.config.filterOptions = applyDspPresetToNodes(
			{
				highpassFilter: this.highpassFilter,
				notchFilter: this.notchFilter,
				notch2Filter: this.notch2Filter,
				compressorNode: this.compressorNode,
			},
			this.audioContext,
			profile,
			this.config.filterOptions,
		);
	}
}
