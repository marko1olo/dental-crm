/**
 * audioContextFactory.ts — Layer 1: Web Audio context lifecycle, dental noise filter chain, and hardware microphone capture.
 */

import { logger } from "../../../utils/logger";
import {
	DENTAL_DSP_PRESETS,
	type DentalDspProfile,
} from "../../../services/voice/audioFilters";
import type {
	DentalAudioFilterNodes,
	ResolvedDentalNoiseFilterOptions,
} from "./types";

/**
 * Получение конструктора AudioContext с поддержкой префикса webkit
 */
export function getAudioContextClass(): typeof AudioContext {
	return (
		window.AudioContext ||
		// biome-ignore lint/suspicious/noExplicitAny: WebKit AudioContext fallback
		(window as any).webkitAudioContext
	);
}

/**
 * Инициализация нового экземпляра AudioContext
 */
export function createAudioContext(): AudioContext {
	const AudioCtxClass = getAudioContextClass();
	return new AudioCtxClass();
}

/**
 * Запрос микрофона с подавлением эха и системным шумоподавлением
 */
export async function requestMicrophoneStream(): Promise<MediaStream> {
	return navigator.mediaDevices.getUserMedia({
		audio: {
			echoCancellation: true,
			noiseSuppression: true,
			autoGainControl: true,
			channelCount: 1,
		},
	});
}

/**
 * Построение цепочки стоматологической фильтрации шумов
 */
export function buildDentalFilterChain(
	audioCtx: AudioContext,
	source: MediaStreamAudioSourceNode,
	filterOptions: ResolvedDentalNoiseFilterOptions,
): DentalAudioFilterNodes {
	let lastNode: AudioNode = source;
	let highpassFilter: BiquadFilterNode | null = null;
	let lowpassFilter: BiquadFilterNode | null = null;
	let notchFilter: BiquadFilterNode | null = null;
	let notch2Filter: BiquadFilterNode | null = null;
	let compressorNode: DynamicsCompressorNode | null = null;
	let limiterNode: DynamicsCompressorNode | null = null;

	// Highpass фильтр: срезает компрессор и низкий гул (<120Hz)
	if (filterOptions.enableHighpass) {
		const highpass = audioCtx.createBiquadFilter();
		highpass.type = "highpass";
		highpass.frequency.value = filterOptions.highpassFrequency;
		highpass.Q.value = 0.707; // Butterworth
		lastNode.connect(highpass);
		lastNode = highpass;
		highpassFilter = highpass;
	}

	// Lowpass фильтр: срезает высокочастотный ультразвуковой шум (>7200Hz)
	if (filterOptions.enableLowpass) {
		const lowpass = audioCtx.createBiquadFilter();
		lowpass.type = "lowpass";
		lowpass.frequency.value = filterOptions.lowpassFrequency;
		lowpass.Q.value = 0.707;
		lastNode.connect(lowpass);
		lastNode = lowpass;
		lowpassFilter = lowpass;
	}

	// Notch фильтр 1: срезает турбинный резонанс (4500Hz)
	if (filterOptions.enableNotch) {
		const notch = audioCtx.createBiquadFilter();
		notch.type = "notch";
		notch.frequency.value = filterOptions.notchFrequency;
		notch.Q.value = filterOptions.notchQ;
		lastNode.connect(notch);
		lastNode = notch;
		notchFilter = notch;
	}

	// Notch фильтр 2: срезает 2-ю гармонику турбины / пьезо-скейлер (6000Hz)
	if (filterOptions.enableTurbineNotch2) {
		const notch2 = audioCtx.createBiquadFilter();
		notch2.type = "notch";
		notch2.frequency.value = filterOptions.notch2Frequency;
		notch2.Q.value = filterOptions.notch2Q;
		lastNode.connect(notch2);
		lastNode = notch2;
		notch2Filter = notch2;
	}

	// Dynamic Range Compressor (выравнивание тихого голоса врача с расстояния 2-4 м)
	if (filterOptions.enableCompressor) {
		const comp = audioCtx.createDynamicsCompressor();
		comp.threshold.value = filterOptions.compressorThreshold;
		comp.knee.value = 12;
		comp.ratio.value = filterOptions.compressorRatio;
		comp.attack.value = 0.003;
		comp.release.value = 0.15;
		lastNode.connect(comp);
		lastNode = comp;
		compressorNode = comp;
	}

	// Brickwall Limiter (защита от перегруза и клиппинга)
	if (filterOptions.enableLimiter) {
		const lim = audioCtx.createDynamicsCompressor();
		lim.threshold.value = -2.0;
		lim.knee.value = 2.0;
		lim.ratio.value = 20.0;
		lim.attack.value = 0.001;
		lim.release.value = 0.05;
		lastNode.connect(lim);
		lastNode = lim;
		limiterNode = lim;
	}

	// Gain Node
	const gain = audioCtx.createGain();
	gain.gain.value = 1.0;
	lastNode.connect(gain);
	lastNode = gain;

	// AnalyserNode для 60 FPS CanvasWaveform
	const analyser = audioCtx.createAnalyser();
	analyser.fftSize = 256;
	analyser.smoothingTimeConstant = 0.8;
	lastNode.connect(analyser);

	return {
		highpassFilter,
		lowpassFilter,
		notchFilter,
		notch2Filter,
		compressorNode,
		limiterNode,
		gainNode: gain,
		analyserNode: analyser,
		lastNode,
	};
}

/**
 * Динамическое обновление DSP параметров и узлов при смене профиля
 */
export function applyDspPresetToNodes(
	nodes: {
		highpassFilter: BiquadFilterNode | null;
		notchFilter: BiquadFilterNode | null;
		notch2Filter: BiquadFilterNode | null;
		compressorNode: DynamicsCompressorNode | null;
	},
	audioCtx: AudioContext | null,
	profile: DentalDspProfile,
	currentOptions: ResolvedDentalNoiseFilterOptions,
): ResolvedDentalNoiseFilterOptions {
	const preset = DENTAL_DSP_PRESETS[profile];
	const updatedOptions: ResolvedDentalNoiseFilterOptions = {
		...currentOptions,
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

	if (audioCtx) {
		const curTime = audioCtx.currentTime;
		if (nodes.highpassFilter) {
			nodes.highpassFilter.frequency.setValueAtTime(preset.highpassFrequency, curTime);
		}
		if (nodes.notchFilter) {
			nodes.notchFilter.frequency.setValueAtTime(preset.notch1Frequency, curTime);
			nodes.notchFilter.Q.setValueAtTime(preset.notch1Q, curTime);
		}
		if (nodes.notch2Filter) {
			nodes.notch2Filter.frequency.setValueAtTime(preset.notch2Frequency, curTime);
			nodes.notch2Filter.Q.setValueAtTime(preset.notch2Q, curTime);
		}
		if (nodes.compressorNode) {
			nodes.compressorNode.threshold.setValueAtTime(preset.compressorThreshold, curTime);
			nodes.compressorNode.ratio.setValueAtTime(preset.compressorRatio, curTime);
		}
	}

	return updatedOptions;
}

/**
 * Безопасное отключение Web Audio узла
 */
export function disconnectNode(node: AudioNode | null, label: string): void {
	if (!node) return;
	try {
		node.disconnect();
	} catch (err: unknown) {
		logger.warn(`[AudioStreamManager] ${label} disconnect error:`, err);
	}
}

/**
 * Остановка всех треков MediaStream для освобождения микрофона
 */
export function stopMediaStreamTracks(stream: MediaStream | null): void {
	if (!stream) return;
	stream.getTracks().forEach((t) => {
		try {
			t.stop();
		} catch (err: unknown) {
			logger.warn("[AudioStreamManager] mediaStream track stop error:", err);
		}
	});
}

/**
 * Безопасное закрытие AudioContext
 */
export function closeAudioContext(ctx: AudioContext | null): void {
	if (!ctx) return;
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
