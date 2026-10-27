/**
 * AudioStreamStateBase.ts — Базовый класс состояния Web Audio узлов и VAD-активности.
 * Строго <= 120 строк по Мандату 8b.
 */

import { AudioSessionManager } from "./audioSessionManager";
import { AudioVadDetector } from "./audioVadDetector";
import type { ResolvedAudioStreamManagerConfig } from "./types";

export abstract class AudioStreamStateBase {
	protected config: ResolvedAudioStreamManagerConfig;
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

	public readonly sessionManager: AudioSessionManager;
	public readonly vadDetector: AudioVadDetector;
	protected isFlushing = false;

	constructor(config: ResolvedAudioStreamManagerConfig) {
		this.config = config;
		this.sessionManager = new AudioSessionManager({
			onSampleCeilingExceeded: () => this.flushCurrentSpeechSegment("max_duration"),
		});
		this.vadDetector = new AudioVadDetector(this.config.vadOptions, {
			onSpeechStart: () => {
				this.sessionManager.clearChunks();
				this.config.onSpeechStart();
			},
			onSpeechEnd: (dur) => {
				if (dur >= this.config.vadOptions.minSpeechDurationMs) this.config.onSpeechEnd(dur);
			},
			onSilenceTimeout: () => this.flushCurrentSpeechSegment("silence_timeout"),
			onMaxDuration: () => this.flushCurrentSpeechSegment("max_duration"),
		});
	}

	public abstract flushCurrentSpeechSegment(reason: "silence_timeout" | "max_duration" | "manual_stop"): void;

	public get isRunning(): boolean { return this.sessionManager.isRunning; }
	public set isRunning(v: boolean) { this.sessionManager.isRunning = v; }
	public get isPaused(): boolean { return this.sessionManager.isPaused; }
	public set isPaused(v: boolean) { this.sessionManager.isPaused = v; }
	public get isSpeaking(): boolean { return this.vadDetector.isSpeaking; }
	public set isSpeaking(v: boolean) { this.vadDetector.isSpeaking = v; }
	public get speechStartTime(): number { return this.vadDetector.speechStartTime; }
	public set speechStartTime(v: number) { this.vadDetector.speechStartTime = v; }
	public get lastSpeechTime(): number { return this.vadDetector.lastSpeechTime; }
	public set lastSpeechTime(v: number) { this.vadDetector.lastSpeechTime = v; }
	public get silenceTimer() { return this.vadDetector.silenceTimer; }
	public set silenceTimer(t) { this.vadDetector.silenceTimer = t; }
	public get maxDurationTimer() { return this.vadDetector.maxDurationTimer; }
	public set maxDurationTimer(t) { this.vadDetector.maxDurationTimer = t; }
	public get silenceTimeoutTriggered() { return this.vadDetector.silenceTimeoutTriggered; }
	public set silenceTimeoutTriggered(v: boolean) { this.vadDetector.silenceTimeoutTriggered = v; }
	public get noiseFloorRms(): number { return this.vadDetector.noiseFloorRms; }
	public set noiseFloorRms(v: number) { this.vadDetector.noiseFloorRms = v; }
	public get sessionPcmChunks(): Int16Array[] { return this.sessionManager.sessionPcmChunks; }
	public set sessionPcmChunks(c: Int16Array[]) { this.sessionManager.sessionPcmChunks = c; }
	public get totalSessionSamples(): number { return this.sessionManager.totalSessionSamples; }
	public set totalSessionSamples(n: number) { this.sessionManager.totalSessionSamples = n; }
}
