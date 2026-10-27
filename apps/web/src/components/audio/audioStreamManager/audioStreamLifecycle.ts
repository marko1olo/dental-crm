/**
 * audioStreamLifecycle.ts — Управление жизненным циклом Web Audio узлов, захвата и очистки.
 * Строго <= 120 строк по Мандату 8b.
 */

import { logger } from "../../../utils/logger";
import {
	DENTAL_AUDIO_WORKLET_PROCESSOR_NAME,
	registerDentalAudioWorklet,
} from "../AudioWorkletProcessor";
import {
	createAudioContext,
	requestMicrophoneStream,
	buildDentalFilterChain,
	disconnectNode,
	stopMediaStreamTracks,
	closeAudioContext,
} from "./audioContextFactory";
import { setupScriptProcessorFallback } from "./audioStreamFallback";
import type { DentalAudioFilterNodes, ResolvedAudioStreamManagerConfig } from "./types";

export interface AudioStreamNodes extends DentalAudioFilterNodes {
	audioContext: AudioContext;
	mediaStream: MediaStream;
	sourceNode: MediaStreamAudioSourceNode;
	workletNode: AudioWorkletNode | null;
	scriptProcessorNode: ScriptProcessorNode | null;
	muteGainNode: GainNode | null;
}

export async function startAudioStreamCapture(
	config: ResolvedAudioStreamManagerConfig,
	onChunk: (pcm: Int16Array, rms: number) => void,
	isPaused: () => boolean,
	isRunning: () => boolean,
): Promise<AudioStreamNodes> {
	const mediaStream = await requestMicrophoneStream();
	const audioContext = createAudioContext();
	if (audioContext.state === "suspended") {
		await audioContext.resume();
	}

	const sourceNode = audioContext.createMediaStreamSource(mediaStream);
	const filterNodes = buildDentalFilterChain(audioContext, sourceNode, config.filterOptions);
	const analyser = filterNodes.analyserNode;
	if (!analyser) throw new Error("Failed to initialize analyser node");

	let workletNode: AudioWorkletNode | null = null;
	let scriptProcessorNode: ScriptProcessorNode | null = null;
	let muteGainNode: GainNode | null = null;

	const workletRegistered = await registerDentalAudioWorklet(audioContext);
	if (workletRegistered) {
		try {
			const worklet = new AudioWorkletNode(audioContext, DENTAL_AUDIO_WORKLET_PROCESSOR_NAME, {
				processorOptions: {
					targetSampleRate: config.targetSampleRate,
					chunkSize: config.chunkSize,
					rmsThreshold: config.vadOptions.speechThresholdRms,
				},
			});
			worklet.port.onmessage = (event) => {
				if (isPaused() || !isRunning()) return;
				const msg = event.data;
				if (msg?.type === "pcm_chunk") onChunk(msg.pcm, msg.rms);
			};
			analyser.connect(worklet);
			workletNode = worklet;
		} catch (workletError) {
			logger.warn("[AudioStream] Worklet failed, using fallback:", workletError);
			const fallback = setupScriptProcessorFallback(analyser, audioContext, config.targetSampleRate, onChunk, isPaused, isRunning);
			scriptProcessorNode = fallback.scriptProcessorNode;
			muteGainNode = fallback.muteGainNode;
		}
	} else {
		const fallback = setupScriptProcessorFallback(analyser, audioContext, config.targetSampleRate, onChunk, isPaused, isRunning);
		scriptProcessorNode = fallback.scriptProcessorNode;
		muteGainNode = fallback.muteGainNode;
	}

	return { ...filterNodes, audioContext, mediaStream, sourceNode, workletNode, scriptProcessorNode, muteGainNode };
}

export function disposeAudioStreamNodes(nodes: {
	workletNode: AudioWorkletNode | null;
	scriptProcessorNode: ScriptProcessorNode | null;
	muteGainNode: GainNode | null;
	highpassFilter: BiquadFilterNode | null;
	lowpassFilter: BiquadFilterNode | null;
	notchFilter: BiquadFilterNode | null;
	notch2Filter: BiquadFilterNode | null;
	compressorNode: DynamicsCompressorNode | null;
	limiterNode: DynamicsCompressorNode | null;
	gainNode: GainNode | null;
	analyserNode: AnalyserNode | null;
	sourceNode: MediaStreamAudioSourceNode | null;
	mediaStream: MediaStream | null;
	audioContext: AudioContext | null;
}): void {
	if (nodes.workletNode) {
		try { nodes.workletNode.port.onmessage = null; } catch (err) { logger.warn("[AudioStream] worklet err", err); }
		disconnectNode(nodes.workletNode, "workletNode");
	}
	if (nodes.scriptProcessorNode) {
		try { nodes.scriptProcessorNode.onaudioprocess = null; } catch (err) { logger.warn("[AudioStream] script err", err); }
		disconnectNode(nodes.scriptProcessorNode, "scriptProcessorNode");
	}
	disconnectNode(nodes.muteGainNode, "muteGainNode");
	disconnectNode(nodes.highpassFilter, "highpassFilter");
	disconnectNode(nodes.lowpassFilter, "lowpassFilter");
	disconnectNode(nodes.notchFilter, "notchFilter");
	disconnectNode(nodes.notch2Filter, "notch2Filter");
	disconnectNode(nodes.compressorNode, "compressorNode");
	disconnectNode(nodes.limiterNode, "limiterNode");
	disconnectNode(nodes.gainNode, "gainNode");
	disconnectNode(nodes.analyserNode, "analyserNode");
	disconnectNode(nodes.sourceNode, "sourceNode");
	if (nodes.mediaStream) stopMediaStreamTracks(nodes.mediaStream);
	if (nodes.audioContext) closeAudioContext(nodes.audioContext);
}
