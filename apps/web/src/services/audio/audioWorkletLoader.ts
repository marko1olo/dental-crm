/**
 * audioWorkletLoader.ts — Модуль инициализации, загрузки и связывания AudioWorklet в AudioContext.
 *
 * ФУНКЦИОНАЛ:
 * 1. Безопасная проверка поддержки Web Audio API и AudioWorklet в браузере.
 * 2. Генерация и кэширование Blob URL из исходного кода ResamplingAudioWorklet.
 * 3. Регистрация AudioWorkletProcessor в AudioContext с защитой от повторной регистрации.
 * 4. Фабрика создания настроенного AudioWorkletNode.
 * 5. Построение комплексного аппаратного аудиопайплайна: MediaStream -> AudioContext -> AudioWorklet -> VadEngine.
 */

import {
	RESAMPLING_AUDIO_WORKLET_NAME,
	RESAMPLING_AUDIO_WORKLET_SOURCE,
	type ResamplingWorkletOptions,
} from "./ResamplingAudioWorklet";
import { VadEngine, type VadEngineConfig } from "./VadEngine";

let cachedWorkletBlobUrl: string | null = null;
const registeredContexts = new WeakSet<AudioContext>();

/**
 * Проверка поддержки Web Audio API и AudioWorklet в текущем браузере
 */
export function isAudioWorkletSupported(): boolean {
	if (typeof window === "undefined") return false;

	const hasAudioContext =
		typeof window.AudioContext !== "undefined" ||
		// biome-ignore lint/suspicious/noExplicitAny: WebKit AudioContext support check
		typeof (window as any).webkitAudioContext !== "undefined";

	const hasAudioWorklet =
		typeof window.AudioWorkletNode !== "undefined" &&
		typeof Blob !== "undefined" &&
		typeof URL !== "undefined" &&
		typeof URL.createObjectURL === "function";

	return hasAudioContext && hasAudioWorklet;
}

/**
 * Создание или получение кэшированного Blob URL с исходным кодом ресэмплинг-ворклета
 */
export function getResamplingAudioWorkletBlobUrl(): string {
	if (cachedWorkletBlobUrl) return cachedWorkletBlobUrl;

	if (typeof Blob === "undefined" || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
		return "";
	}

	const blob = new Blob([RESAMPLING_AUDIO_WORKLET_SOURCE], {
		type: "application/javascript",
	});
	cachedWorkletBlobUrl = URL.createObjectURL(blob);
	return cachedWorkletBlobUrl;
}

/**
 * Освобождение Blob URL из памяти
 */
export function revokeResamplingAudioWorkletBlobUrl(): void {
	if (cachedWorkletBlobUrl && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
		try {
			URL.revokeObjectURL(cachedWorkletBlobUrl);
		} catch {}
		cachedWorkletBlobUrl = null;
	}
}

/**
 * Регистрация ресэмплинг-ворклета в AudioContext
 */
export async function registerResamplingAudioWorklet(
	audioContext: AudioContext,
): Promise<boolean> {
	if (
		!audioContext ||
		typeof audioContext.audioWorklet === "undefined" ||
		typeof audioContext.audioWorklet.addModule !== "function"
	) {
		return false;
	}

	if (registeredContexts.has(audioContext)) {
		return true;
	}

	try {
		const blobUrl = getResamplingAudioWorkletBlobUrl();
		if (!blobUrl) return false;

		await audioContext.audioWorklet.addModule(blobUrl);
		registeredContexts.add(audioContext);
		return true;
	} catch (error) {
		const err = error as Error;
		if (
			err &&
			(err.name === "NotSupportedError" ||
				(typeof err.message === "string" && err.message.includes("already registered")))
		) {
			registeredContexts.add(audioContext);
			return true;
		}
		console.warn("Failed to register resampling audio worklet module:", error);
		return false;
	}
}

/**
 * Создание сконфигурированного экземпляра AudioWorkletNode
 */
export function createResamplingAudioWorkletNode(
	audioContext: AudioContext,
	options: ResamplingWorkletOptions = {},
): AudioWorkletNode {
	return new AudioWorkletNode(audioContext, RESAMPLING_AUDIO_WORKLET_NAME, {
		numberOfInputs: 1,
		numberOfOutputs: 1,
		outputChannelCount: [1],
		processorOptions: {
			targetSampleRate: options.targetSampleRate ?? 16000,
			chunkSize: options.chunkSize ?? 2048,
			lowPassCutoffHz: options.lowPassCutoffHz ?? 7200,
			speechThresholdDb: options.speechThresholdDb ?? -45,
		},
	});
}

export interface AudioCapturePipeline {
	audioContext: AudioContext;
	mediaStream: MediaStream;
	sourceNode: MediaStreamAudioSourceNode;
	workletNode: AudioWorkletNode;
	vadEngine: VadEngine;
	stop: () => void;
	dispose: () => void;
}

/**
 * Комплексный фабричный метод создания и запуска полного сквозного пайплайна захвата звука:
 * Microphone -> AudioContext -> ResamplingWorklet (AntiAliasing + 16kHz + Int16) -> VadEngine
 */
export async function createResamplingAudioCapturePipeline(config: {
	mediaStream?: MediaStream;
	audioContext?: AudioContext;
	workletOptions?: ResamplingWorkletOptions;
	vadConfig?: VadEngineConfig;
	audioConstraints?: MediaTrackConstraints;
}): Promise<AudioCapturePipeline> {
	// 1. Получение микрофонного стрима если не передан
	const stream =
		config.mediaStream ??
		(await navigator.mediaDevices.getUserMedia({
			audio: {
				echoCancellation: true,
				noiseSuppression: true,
				autoGainControl: true,
				channelCount: 1,
				...(config.audioConstraints ?? {}),
			},
		}));

	// 2. Инициализация AudioContext
	const AudioCtxClass =
		window.AudioContext ||
		// biome-ignore lint/suspicious/noExplicitAny: WebKit AudioContext support
		(window as any).webkitAudioContext;
	const audioCtx = config.audioContext ?? new AudioCtxClass();

	if (audioCtx.state === "suspended") {
		await audioCtx.resume();
	}

	// 3. Регистрация ворклета
	const registered = await registerResamplingAudioWorklet(audioCtx);
	if (!registered) {
		throw new Error("Не удалось зарегистрировать ResamplingAudioWorklet в Web Audio Context");
	}

	// 4. Построение аудиографа
	const sourceNode = audioCtx.createMediaStreamSource(stream);
	const workletNode = createResamplingAudioWorkletNode(audioCtx, config.workletOptions);

	sourceNode.connect(workletNode);

	// 5. Инициализация и подключение VAD движка
	const vadEngine = new VadEngine({
		speechThresholdDb: -45,
		silenceTimeoutMs: 1500,
		targetSampleRate: 16000,
		...(config.vadConfig ?? {}),
	});

	vadEngine.connectAudioWorklet(workletNode);
	vadEngine.start();

	const dispose = () => {
		vadEngine.dispose();
		try {
			sourceNode.disconnect();
		} catch {}
		try {
			workletNode.disconnect();
		} catch {}
		stream.getTracks().forEach((track) => {
			try {
				track.stop();
			} catch {}
		});
		if (!config.audioContext && audioCtx.state !== "closed") {
			try {
				audioCtx.close();
			} catch {}
		}
	};

	const stop = () => {
		vadEngine.stop();
		dispose();
	};

	return {
		audioContext: audioCtx,
		mediaStream: stream,
		sourceNode,
		workletNode,
		vadEngine,
		stop,
		dispose,
	};
}
