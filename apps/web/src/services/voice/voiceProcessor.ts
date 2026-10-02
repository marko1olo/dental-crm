/**
 * voiceProcessor.ts — Центральный процессор клинического аудио и мульти-движковой диктовки.
 *
 * ФУНКЦИОНАЛ:
 * 1. Инкапсуляция каскада ClinicalAudioDspChain в AudioContext.
 * 2. Реалтайм-мониторинг акустического фона кабинета (Noise Floor, Speech Peak, SNR в dB).
 * 3. Динамическое адаптивное переключение профилей DSP на лету:
 *    - clean_studio -> dental_balanced -> far_field_boost -> ultra_noise_rejection.
 * 4. Защита от потери речи при плохом микрофоне и диктовке с другого конца кабинета.
 * 5. Интерактивная выдача спектральных данных для AudioSpectrumWidget и MicrophoneCalibrationModal.
 */

import {
	ClinicalAudioDspChain,
	DENTAL_DSP_PRESETS,
	type DentalDspFilterConfig,
	type DentalDspProfile,
	evaluateAcousticQuality,
	type AcousticQualityReport,
	processNoiseGatePcm,
	softClipSample,
} from "./audioFilters";
import { logger } from "../../utils/logger";

export interface VoiceProcessorStats {
	readonly currentRms: number;
	readonly currentRmsDb: number;
	readonly noiseFloorDb: number;
	readonly speechPeakDb: number;
	readonly snrDb: number;
	readonly activeProfile: DentalDspProfile;
	readonly isSpeaking: boolean;
	readonly isClipping: boolean;
}

export type VoiceProcessorListener = {
	onStatsUpdate?: (stats: VoiceProcessorStats) => void;
	onProfileChange?: (newProfile: DentalDspProfile, prevProfile: DentalDspProfile) => void;
	onAcousticReport?: (report: AcousticQualityReport) => void;
};

export class VoiceAudioProcessor {
	private audioContext: AudioContext | null = null;
	private dspChain: ClinicalAudioDspChain | null = null;
	private analyserNode: AnalyserNode | null = null;
	private sourceNode: MediaStreamAudioSourceNode | null = null;
	private mediaStream: MediaStream | null = null;

	private currentProfile: DentalDspProfile = "dental_balanced";
	private listeners: Set<VoiceProcessorListener> = new Set();

	// Акустическая телеметрия
	private noiseFloorDb = -65.0;
	private speechPeakDb = -20.0;
	private isSpeaking = false;
	private isRunning = false;
	private statsIntervalTimer: ReturnType<typeof setInterval> | null = null;

	constructor(initialProfile: DentalDspProfile = "dental_balanced") {
		this.currentProfile = initialProfile;
	}

	public subscribe(listener: VoiceProcessorListener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	public getProfile(): DentalDspProfile {
		return this.currentProfile;
	}

	public setProfile(profile: DentalDspProfile): void {
		if (this.currentProfile === profile) return;
		const prev = this.currentProfile;
		this.currentProfile = profile;
		if (this.dspChain) {
			this.dspChain.setProfile(profile);
		}
		for (const l of this.listeners) {
			l.onProfileChange?.(profile, prev);
		}
	}

	public getDspConfig(): DentalDspFilterConfig {
		if (this.dspChain) {
			return this.dspChain.getConfig();
		}
		return { ...DENTAL_DSP_PRESETS[this.currentProfile] };
	}

	public updateDspConfig(partial: Partial<DentalDspFilterConfig>): void {
		if (this.dspChain) {
			this.dspChain.updateCustomConfig(partial);
		}
	}

	public getAnalyserNode(): AnalyserNode | null {
		return this.analyserNode;
	}

	public getAudioContext(): AudioContext | null {
		return this.audioContext;
	}

	/**
	 * Инициализация процессора поверх существующего или нового MediaStream
	 */
	public async attachStream(stream: MediaStream): Promise<AnalyserNode> {
		this.dispose();

		this.mediaStream = stream;
		const AudioCtx =
			window.AudioContext ||
			// biome-ignore lint/suspicious/noExplicitAny: WebKit fallback
			(window as any).webkitAudioContext;
		const ctx = new AudioCtx();
		if (ctx.state === "suspended") {
			await ctx.resume();
		}
		this.audioContext = ctx;

		// 1. Создаем источник
		const source = ctx.createMediaStreamSource(stream);
		this.sourceNode = source;

		// 2. Создаем клинический DSP-тракт
		const dsp = new ClinicalAudioDspChain(ctx, this.currentProfile);
		this.dspChain = dsp;

		// 3. Создаем AnalyserNode для спектрального анализатора
		const analyser = ctx.createAnalyser();
		analyser.fftSize = 512;
		analyser.smoothingTimeConstant = 0.85;
		this.analyserNode = analyser;

		// Соединяем: source -> dsp.inputNode -> dsp.outputNode -> analyser
		source.connect(dsp.inputNode);
		dsp.outputNode.connect(analyser);

		this.isRunning = true;
		this.startTelemetryLoop();

		return analyser;
	}

	/**
	 * Обработка массива сэмплов PCM с применением гейта и мягкого ограничения
	 */
	public processOfflinePcm(
		inputPcm: Float32Array,
		sampleRate = 16000,
	): Float32Array {
		const config = this.getDspConfig();
		let processed = inputPcm;

		// 1. Noise Gate
		if (config.enableNoiseGate) {
			processed = processNoiseGatePcm(
				processed,
				config.noiseGateThresholdDb,
				config.noiseGateFloorDb,
				15,
				80,
				sampleRate,
			);
		}

		// 2. Soft-clipping сатуратор для защиты от клиппинга при AGC
		const out = new Float32Array(processed.length);
		const drive =
			config.enableAgc && config.makeupGainDb > 0
				? Math.pow(10, config.makeupGainDb / 20)
				: 1.0;

		for (let i = 0; i < processed.length; i++) {
			out[i] = softClipSample(processed[i] ?? 0, drive);
		}

		return out;
	}

	/**
	 * Получение текущего акустического отчета кабинета
	 */
	public getAcousticReport(): AcousticQualityReport {
		return evaluateAcousticQuality(this.speechPeakDb, this.noiseFloorDb);
	}

	/**
	 * Калибровка уровня фонового шума в течение заданного окна (мс)
	 */
	public async calibrateNoiseFloor(durationMs = 1200): Promise<number> {
		if (!this.analyserNode) return this.noiseFloorDb;

		const samples: number[] = [];
		const buffer = new Uint8Array(this.analyserNode.frequencyBinCount);
		const start = Date.now();

		return new Promise((resolve) => {
			const interval = setInterval(() => {
				if (!this.analyserNode || Date.now() - start >= durationMs) {
					clearInterval(interval);
					if (samples.length > 0) {
						// Медианный уровень фонового шума
						samples.sort((a, b) => a - b);
						const median = samples[Math.floor(samples.length / 2)] ?? -65;
						this.noiseFloorDb = Math.round(median * 10) / 10;
					}
					resolve(this.noiseFloorDb);
					return;
				}

				this.analyserNode.getByteTimeDomainData(buffer);
				let sumSq = 0;
				for (let i = 0; i < buffer.length; i++) {
					const norm = ((buffer[i] ?? 128) - 128) / 128;
					sumSq += norm * norm;
				}
				const rms = Math.sqrt(sumSq / buffer.length);
				const rmsDb = 20 * Math.log10(Math.max(rms, 1e-6));
				samples.push(rmsDb);
			}, 40);
		});
	}

	private startTelemetryLoop(): void {
		if (this.statsIntervalTimer) {
			clearInterval(this.statsIntervalTimer);
		}

		const buffer = new Uint8Array(256);

		this.statsIntervalTimer = setInterval(() => {
			if (!this.analyserNode || !this.isRunning) return;

			this.analyserNode.getByteTimeDomainData(buffer);
			let sumSq = 0;
			let maxAbs = 0;

			for (let i = 0; i < buffer.length; i++) {
				const norm = ((buffer[i] ?? 128) - 128) / 128;
				sumSq += norm * norm;
				if (Math.abs(norm) > maxAbs) {
					maxAbs = Math.abs(norm);
				}
			}

			const rms = Math.sqrt(sumSq / buffer.length);
			const rmsDb = 20 * Math.log10(Math.max(rms, 1e-6));
			const isClipping = maxAbs >= 0.98;

			// Обновление шума и речи
			if (rmsDb > -42.0) {
				this.isSpeaking = true;
				this.speechPeakDb = Math.max(
					this.speechPeakDb * 0.9 + rmsDb * 0.1,
					rmsDb,
				);
			} else {
				this.isSpeaking = false;
				this.noiseFloorDb = this.noiseFloorDb * 0.95 + rmsDb * 0.05;
			}

			const snrDb =
				Math.round((this.speechPeakDb - this.noiseFloorDb) * 10) / 10;

			const stats: VoiceProcessorStats = {
				currentRms: rms,
				currentRmsDb: Math.round(rmsDb * 10) / 10,
				noiseFloorDb: Math.round(this.noiseFloorDb * 10) / 10,
				speechPeakDb: Math.round(this.speechPeakDb * 10) / 10,
				snrDb,
				activeProfile: this.currentProfile,
				isSpeaking: this.isSpeaking,
				isClipping,
			};

			for (const l of this.listeners) {
				l.onStatsUpdate?.(stats);
			}
		}, 80);
	}

	public dispose(): void {
		this.isRunning = false;
		if (this.statsIntervalTimer) {
			clearInterval(this.statsIntervalTimer);
			this.statsIntervalTimer = null;
		}

		if (this.dspChain) {
			this.dspChain.dispose();
			this.dspChain = null;
		}

		if (this.analyserNode) {
			try {
				this.analyserNode.disconnect();
			} catch (err: unknown) {
				logger.warn("[VoiceAudioProcessor] analyserNode disconnect error:", err);
			}
			this.analyserNode = null;
		}

		if (this.sourceNode) {
			try {
				this.sourceNode.disconnect();
			} catch (err: unknown) {
				logger.warn("[VoiceAudioProcessor] sourceNode disconnect error:", err);
			}
			this.sourceNode = null;
		}

		if (this.audioContext) {
			const ctx = this.audioContext;
			this.audioContext = null;
			try {
				if (ctx.state !== "closed" && typeof ctx.close === "function") {
					void ctx.close().catch((err: unknown) => {
						logger.warn("[VoiceAudioProcessor] audioContext close async error:", err);
					});
				}
			} catch (err: unknown) {
				logger.warn("[VoiceAudioProcessor] audioContext close error:", err);
			}
		}
	}
}

export const globalVoiceAudioProcessor = new VoiceAudioProcessor();
