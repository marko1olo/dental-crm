/**
 * types.ts — Layer 0: Audio stream contracts, VAD options, and DSP interfaces.
 */

import type { DentalDspProfile } from "../../../services/voice/audioFilters";

export type AudioRecordingState = "idle" | "recording" | "paused" | "stopped";

export type SampleRateOptions = 16000 | 44100 | 48000;

export interface PcmChunkPayload {
	type: "pcm_chunk";
	pcm: Int16Array;
	rms: number;
	sampleRate?: number | undefined;
}

export interface VadEvents {
	onSpeechStart?: (() => void) | undefined;
	onSpeechEnd?: ((durationMs: number) => void) | undefined;
	onSilenceTimeout?: ((collectedPcm: Int16Array, durationMs: number) => void) | undefined;
	onRmsUpdate?: ((rms: number, isSpeaking: boolean) => void) | undefined;
}

export interface DentalNoiseFilterOptions {
	enableHighpass?: boolean | undefined; // Default true: 120 Hz
	highpassFrequency?: number | undefined;
	enableLowpass?: boolean | undefined; // Default true: 7200 Hz
	lowpassFrequency?: number | undefined;
	enableNotch?: boolean | undefined; // Default true: 4500 Hz
	notchFrequency?: number | undefined;
	notchQ?: number | undefined;
	enableTurbineNotch2?: boolean | undefined; // Default true: 6000 Hz
	notch2Frequency?: number | undefined;
	notch2Q?: number | undefined;
	enableCompressor?: boolean | undefined; // Default true (Far-field auto-leveler)
	compressorThreshold?: number | undefined;
	compressorRatio?: number | undefined;
	enableLimiter?: boolean | undefined;
	dspProfile?: DentalDspProfile | undefined;
}

export interface VadOptions {
	enabled?: boolean | undefined;
	speechThresholdRms?: number | undefined; // Порог начала речи (RMS, default: 0.016)
	silenceThresholdRms?: number | undefined; // Порог тишины (RMS, default: 0.008)
	silenceTimeoutMs?: number | undefined; // Время тишины до авто-отправки (default: 1800ms)
	minSpeechDurationMs?: number | undefined; // Минимальная длина речи (default: 300ms)
	maxSpeechDurationMs?: number | undefined; // Максимальная длина непрерывной записи (default: 30000ms)
}

export interface AudioStreamManagerConfig {
	targetSampleRate?: number | undefined; // Default: 16000 Hz
	chunkSize?: number | undefined; // Default: 2048 samples (~128ms @ 16kHz)
	filterOptions?: DentalNoiseFilterOptions | undefined;
	vadOptions?: VadOptions | undefined;
	onPcmChunk?: ((chunk: Int16Array, rms: number, sampleRate: number) => void) | undefined;
	onSpeechStart?: (() => void) | undefined;
	onSpeechEnd?: ((durationMs: number) => void) | undefined;
	onSilenceTimeout?: ((collectedPcm: Int16Array, durationMs: number) => void) | undefined;
	onRmsUpdate?: ((rms: number, isSpeaking: boolean) => void) | undefined;
	onError?: ((error: Error) => void) | undefined;
}

export interface ResolvedDentalNoiseFilterOptions {
	enableHighpass: boolean;
	highpassFrequency: number;
	enableLowpass: boolean;
	lowpassFrequency: number;
	enableNotch: boolean;
	notchFrequency: number;
	notchQ: number;
	enableTurbineNotch2: boolean;
	notch2Frequency: number;
	notch2Q: number;
	enableCompressor: boolean;
	compressorThreshold: number;
	compressorRatio: number;
	enableLimiter: boolean;
	dspProfile: DentalDspProfile;
}

export interface ResolvedVadOptions {
	enabled: boolean;
	speechThresholdRms: number;
	silenceThresholdRms: number;
	silenceTimeoutMs: number;
	minSpeechDurationMs: number;
	maxSpeechDurationMs: number;
}

export interface ResolvedAudioStreamManagerConfig {
	targetSampleRate: number;
	chunkSize: number;
	filterOptions: ResolvedDentalNoiseFilterOptions;
	vadOptions: ResolvedVadOptions;
	onPcmChunk: (chunk: Int16Array, rms: number, sampleRate: number) => void;
	onSpeechStart: () => void;
	onSpeechEnd: (durationMs: number) => void;
	onSilenceTimeout: (collectedPcm: Int16Array, durationMs: number) => void;
	onRmsUpdate: (rms: number, isSpeaking: boolean) => void;
	onError: (error: Error) => void;
}

export interface DentalAudioFilterNodes {
	highpassFilter: BiquadFilterNode | null;
	lowpassFilter: BiquadFilterNode | null;
	notchFilter: BiquadFilterNode | null;
	notch2Filter: BiquadFilterNode | null;
	compressorNode: DynamicsCompressorNode | null;
	limiterNode: DynamicsCompressorNode | null;
	gainNode: GainNode | null;
	analyserNode: AnalyserNode | null;
	lastNode: AudioNode;
}
