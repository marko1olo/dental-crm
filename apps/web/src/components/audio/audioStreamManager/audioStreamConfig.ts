/**
 * audioStreamConfig.ts — Резолвинг конфигурации и пресетов AudioStreamManager.
 * Строго <= 120 строк по Мандату 8b.
 */

import {
	DENTAL_DSP_PRESETS,
	type DentalDspProfile,
} from "../../../services/voice/audioFilters";
import type {
	AudioStreamManagerConfig,
	ResolvedAudioStreamManagerConfig,
} from "./types";

export function resolveAudioStreamConfig(
	config: AudioStreamManagerConfig = {},
): ResolvedAudioStreamManagerConfig {
	const profile: DentalDspProfile =
		config.filterOptions?.dspProfile ?? "dental_balanced";
	const preset = DENTAL_DSP_PRESETS[profile];

	return {
		targetSampleRate: config.targetSampleRate ?? 16000,
		chunkSize: config.chunkSize ?? 2048,
		filterOptions: {
			enableHighpass:
				config.filterOptions?.enableHighpass ?? preset.enableHighpass,
			highpassFrequency:
				config.filterOptions?.highpassFrequency ?? preset.highpassFrequency,
			enableLowpass:
				config.filterOptions?.enableLowpass ?? preset.enableLowpass,
			lowpassFrequency:
				config.filterOptions?.lowpassFrequency ?? preset.lowpassFrequency,
			enableNotch:
				config.filterOptions?.enableNotch ?? preset.enableTurbineNotch1,
			notchFrequency:
				config.filterOptions?.notchFrequency ?? preset.notch1Frequency,
			notchQ: config.filterOptions?.notchQ ?? preset.notch1Q,
			enableTurbineNotch2:
				config.filterOptions?.enableTurbineNotch2 ?? preset.enableTurbineNotch2,
			notch2Frequency:
				config.filterOptions?.notch2Frequency ?? preset.notch2Frequency,
			notch2Q: config.filterOptions?.notch2Q ?? preset.notch2Q,
			enableCompressor:
				config.filterOptions?.enableCompressor ?? preset.enableCompressor,
			compressorThreshold:
				config.filterOptions?.compressorThreshold ?? preset.compressorThreshold,
			compressorRatio:
				config.filterOptions?.compressorRatio ?? preset.compressorRatio,
			enableLimiter:
				config.filterOptions?.enableLimiter ?? preset.enableLimiter,
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
