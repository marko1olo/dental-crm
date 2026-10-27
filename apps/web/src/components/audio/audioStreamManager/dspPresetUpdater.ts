/**
 * dspPresetUpdater.ts — Динамическое обновление DSP параметров при смене профиля.
 */

import {
	DENTAL_DSP_PRESETS,
	type DentalDspProfile,
} from "../../../services/voice/audioFilters";
import type { ResolvedDentalNoiseFilterOptions } from "./types";

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
