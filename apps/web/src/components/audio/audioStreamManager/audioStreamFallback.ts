/**
 * audioStreamFallback.ts — Резервный ScriptProcessor для браузеров без AudioWorklet.
 * Включает Mute Gain (0.0) для исключения свиста и эха в колонках врача.
 * Строго <= 120 строк по Мандату 8b.
 */

import { calculateRms, resampleFloat32ToInt16 } from "./audioPcmProcessor";

export interface ScriptProcessorFallbackResult {
	scriptProcessorNode: ScriptProcessorNode;
	muteGainNode: GainNode;
}

export function setupScriptProcessorFallback(
	sourceNode: AudioNode,
	audioCtx: AudioContext,
	targetSampleRate: number,
	onChunk: (pcm: Int16Array, rms: number) => void,
	isPaused: () => boolean,
	isRunning: () => boolean,
): ScriptProcessorFallbackResult {
	const bufferSize = 4096;
	const scriptProcessor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
	const inputSampleRate = audioCtx.sampleRate;
	const ratio = inputSampleRate / targetSampleRate;

	scriptProcessor.onaudioprocess = (e) => {
		if (isPaused() || !isRunning()) return;
		const input = e.inputBuffer.getChannelData(0);
		if (!input || input.length === 0) return;

		const rms = calculateRms(input);
		const pcm = resampleFloat32ToInt16(input, ratio);

		onChunk(pcm, rms);
	};

	const muteGain = audioCtx.createGain();
	muteGain.gain.value = 0.0;

	sourceNode.connect(scriptProcessor);
	scriptProcessor.connect(muteGain);
	muteGain.connect(audioCtx.destination);

	return {
		scriptProcessorNode: scriptProcessor,
		muteGainNode: muteGain,
	};
}
