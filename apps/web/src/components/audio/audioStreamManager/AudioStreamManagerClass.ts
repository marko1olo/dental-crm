/**
 * AudioStreamManagerClass.ts — Координатор захвата звука, фильтрации и VAD.
 * Строго <= 120 строк по Мандату 8b.
 */

import type { DentalDspProfile } from "../../../services/voice/audioFilters";
import { applyDspPresetToNodes } from "./audioContextFactory";
import { calculateAudioLevelFromAnalyser, exportCombinedInt16Array, exportWavBlob, writeAsciiString } from "./audioPcmProcessor";
import { resolveAudioStreamConfig } from "./audioStreamConfig";
import { disposeAudioStreamNodes, startAudioStreamCapture } from "./audioStreamLifecycle";
import { flushSpeechSegment, processPcmChunk, type PcmProcessingContext } from "./audioStreamPcmHandler";
import { AudioStreamStateBase } from "./AudioStreamStateBase";
import type { AudioStreamManagerConfig } from "./types";

export class AudioStreamManager extends AudioStreamStateBase {
	constructor(config: AudioStreamManagerConfig = {}) {
		super(resolveAudioStreamConfig(config));
	}

	private get pcmCtx(): PcmProcessingContext {
		return {
			config: this.config,
			sessionManager: this.sessionManager,
			vadDetector: this.vadDetector,
			isRunning: this.isRunning,
			flushCurrentSpeechSegment: (r) => this.flushCurrentSpeechSegment(r),
			exportCombinedInt16Array: () => this.exportCombinedInt16Array(),
		};
	}

	public async start(): Promise<void> {
		if (this.isRunning) return;
		try {
			const nodes = await startAudioStreamCapture(
				this.config,
				(pcm, rms) => this.handleIncomingPcmChunk(pcm, rms),
				() => this.isPaused,
				() => this.isRunning,
			);
			Object.assign(this, nodes);
			this.sessionManager.start();
			this.vadDetector.reset();
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			this.config.onError(err);
			this.dispose();
			throw err;
		}
	}

	public handleIncomingPcmChunk(pcm: Int16Array, rms: number): void {
		processPcmChunk(pcm, rms, this.pcmCtx);
	}

	public flushCurrentSpeechSegment(reason: "silence_timeout" | "max_duration" | "manual_stop"): void {
		if (this.isFlushing) return;
		this.isFlushing = true;
		try {
			flushSpeechSegment(reason, this.pcmCtx);
		} finally {
			this.isFlushing = false;
		}
	}

	public getAnalyserNode(): AnalyserNode | null { return this.analyserNode; }
	public getAudioLevel(): number { return calculateAudioLevelFromAnalyser(this.analyserNode); }
	public exportCombinedInt16Array(chunks?: Int16Array[]): Int16Array {
		return exportCombinedInt16Array(chunks ?? this.sessionPcmChunks);
	}
	public exportWavBlob(chunks?: Int16Array[], sampleRate?: number): Blob {
		return exportWavBlob(this.exportCombinedInt16Array(chunks), sampleRate ?? this.config.targetSampleRate);
	}
	public writeAsciiString(view: DataView, offset: number, str: string): void { writeAsciiString(view, offset, str); }
	public pause(): void { this.sessionManager.pause(); }
	public resume(): void { this.sessionManager.resume(); }

	public stop(): Int16Array {
		const combined = this.exportCombinedInt16Array();
		this.flushCurrentSpeechSegment("manual_stop");
		this.dispose();
		return combined;
	}

	public dispose(): void {
		this.sessionManager.stop();
		this.vadDetector.reset();
		disposeAudioStreamNodes(this);
		this.workletNode = null;
		this.scriptProcessorNode = null;
		this.muteGainNode = null;
		this.highpassFilter = null;
		this.lowpassFilter = null;
		this.notchFilter = null;
		this.notch2Filter = null;
		this.compressorNode = null;
		this.limiterNode = null;
		this.gainNode = null;
		this.analyserNode = null;
		this.sourceNode = null;
		this.mediaStream = null;
		this.audioContext = null;
		this.sessionManager.clearChunks();
	}

	public getDspProfile(): DentalDspProfile { return this.config.filterOptions.dspProfile; }
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
