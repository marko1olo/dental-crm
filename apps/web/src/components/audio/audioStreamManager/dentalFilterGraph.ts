/**
 * dentalFilterGraph.ts — Построение цепочки фильтрации шумов стоматологического кабинета.
 */

import type {
	DentalAudioFilterNodes,
	ResolvedDentalNoiseFilterOptions,
} from "./types";

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

	if (filterOptions.enableHighpass) {
		const highpass = audioCtx.createBiquadFilter();
		highpass.type = "highpass";
		highpass.frequency.value = filterOptions.highpassFrequency;
		highpass.Q.value = 0.707;
		lastNode.connect(highpass);
		lastNode = highpass;
		highpassFilter = highpass;
	}

	if (filterOptions.enableLowpass) {
		const lowpass = audioCtx.createBiquadFilter();
		lowpass.type = "lowpass";
		lowpass.frequency.value = filterOptions.lowpassFrequency;
		lowpass.Q.value = 0.707;
		lastNode.connect(lowpass);
		lastNode = lowpass;
		lowpassFilter = lowpass;
	}

	if (filterOptions.enableNotch) {
		const notch = audioCtx.createBiquadFilter();
		notch.type = "notch";
		notch.frequency.value = filterOptions.notchFrequency;
		notch.Q.value = filterOptions.notchQ;
		lastNode.connect(notch);
		lastNode = notch;
		notchFilter = notch;
	}

	if (filterOptions.enableTurbineNotch2) {
		const notch2 = audioCtx.createBiquadFilter();
		notch2.type = "notch";
		notch2.frequency.value = filterOptions.notch2Frequency;
		notch2.Q.value = filterOptions.notch2Q;
		lastNode.connect(notch2);
		lastNode = notch2;
		notch2Filter = notch2;
	}

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

	const gain = audioCtx.createGain();
	gain.gain.value = 1.0;
	lastNode.connect(gain);
	lastNode = gain;

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
