/**
 * unifiedAudioClientCore.ts — Ядро UnifiedAudioClient:
 * Управление жизненным циклом AudioStreamManager, переключение и Fallback между режимами
 * ('gemini_live' -> 'server_whisper' -> 'browser_speech'), интеграция с AudioStreamTransport,
 * VadDetector, localStorage и SoundFeedbackService.
 */

import { AudioStreamManager } from "../../../components/audio/AudioStreamManager";
import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../../../lib/safeLocalStorage";
import { soundFeedback } from "../../audio/SoundFeedbackService";
import type { DentalDspProfile } from "../audioFilters";
import {
	globalVoiceOfflineQueue,
	type PendingTranscriptionRecord,
	type VoiceOfflineQueue,
} from "../VoiceOfflineQueue";
import { AudioStreamTransport, type AudioTransportHost } from "./audioStreamTransport";
import { appendSentenceToTranscript, buildTwoLayerTranscript } from "./pcmAudioProcessor";
import {
	type InternalUnifiedAudioClientOptions,
	resolveUnifiedAudioClientOptions,
	type TwoLayerTranscriptState,
	type UnifiedAudioClientOptions,
	type UnifiedAudioContextUpdate,
	type UnifiedAudioListener,
	type UnifiedAudioMode,
	type UnifiedAudioState,
} from "./types";
import { VadDetector } from "./vadDetector";

export class UnifiedAudioClient {
	private options: InternalUnifiedAudioClientOptions;
	private offlineQueue: VoiceOfflineQueue;
	private currentMode: UnifiedAudioMode;
	private state: UnifiedAudioState = "idle";
	private streamManager: AudioStreamManager | null = null;
	private transport: AudioStreamTransport;
	private vadDetector: VadDetector;

	private static sessionCounter = 0;
	private interimText = "";
	private accumulatedText = "";
	private recordingId = `rec_${Date.now()}_${++UnifiedAudioClient.sessionCounter}`;
	private chunkIndex = 0;
	private listeners = new Set<UnifiedAudioListener>();
	private isDisposed = false;

	constructor(options: UnifiedAudioClientOptions = {}) {
		this.options = resolveUnifiedAudioClientOptions(options);
		this.offlineQueue = options.offlineQueue ?? globalVoiceOfflineQueue;
		this.currentMode = this.options.preferredMode;

		this.vadDetector = new VadDetector(this.options.vadOptions, {
			onRmsUpdate: (rms, isSpeaking) => this.emitRmsUpdate(rms, isSpeaking),
			onSilenceTimeout: (collectedPcm, durationMs) => {
				void this.handleSilenceTimeoutChunk(collectedPcm, durationMs);
			},
		});

		const host: AudioTransportHost = {
			getOptions: () => this.options,
			getState: () => this.state,
			getMode: () => this.currentMode,
			getIsDisposed: () => this.isDisposed,
			getRecordingId: () => this.recordingId,
			nextChunkIndex: () => this.chunkIndex++,
			getAccumulatedText: () => this.accumulatedText,
			getStreamManager: () => this.streamManager,
			getOfflineQueue: () => this.offlineQueue,
			onInterimTranscript: (text) => {
				this.interimText = text;
				this.emitInterimText(this.interimText);
			},
			onFinalSegment: (text) => this.appendFinalText(text),
			onProviderFallback: async (reason) => this.fallbackToNextMode(reason),
			onFatalSpeechError: (message) => {
				this.setState("error");
				this.emitError(message);
			},
			onOfflineRecordSaved: (record) => this.emitOfflineRecordSaved(record),
		};

		this.transport = new AudioStreamTransport(host);

		if (typeof window !== "undefined" && this.options.persistDraftKey) {
			const saved = safeLocalStorageGetItem(this.options.persistDraftKey);
			if (saved?.trim()) this.accumulatedText = saved.trim();
		}
	}

	public get ws(): WebSocket | null {
		return this.transport.ws;
	}

	public set ws(value: WebSocket | null) {
		this.transport.ws = value;
	}

	public subscribe(listener: UnifiedAudioListener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	public getState(): UnifiedAudioState {
		return this.state;
	}

	public getMode(): UnifiedAudioMode {
		return this.currentMode;
	}

	public getStreamManager(): AudioStreamManager | null {
		return this.streamManager;
	}

	public getVadDetector(): VadDetector {
		return this.vadDetector;
	}

	public setDspProfile(profile: DentalDspProfile): void {
		this.options.filterOptions = { ...this.options.filterOptions, dspProfile: profile };
		if (this.streamManager) this.streamManager.setDspProfile(profile);
	}

	public getDspProfile(): DentalDspProfile {
		if (this.streamManager) return this.streamManager.getDspProfile();
		return this.options.filterOptions.dspProfile ?? "dental_balanced";
	}

	public getOfflineQueue(): VoiceOfflineQueue {
		return this.offlineQueue;
	}

	public getTranscript(): string {
		return this.accumulatedText;
	}

	public getInterimText(): string {
		return this.interimText;
	}

	public getTwoLayerTranscript(): TwoLayerTranscriptState {
		return buildTwoLayerTranscript(this.accumulatedText, this.interimText);
	}

	public getBufferedPcmChunksCount(): number {
		return this.transport.getBufferedPcmChunksCount();
	}

	public getRingBufferCapacity(): number {
		return this.options.ringBufferCapacity;
	}

	public getIsReconnecting(): boolean {
		return this.transport.getIsReconnecting();
	}

	public clearBufferedPcmChunks(): void {
		this.transport.clearBufferedPcmChunks();
	}

	public bufferPcmChunk(pcm: Int16Array, rms: number): void {
		this.transport.bufferPcmChunk(pcm, rms);
	}

	public flushBufferedPcmChunks(): number {
		return this.transport.flushBufferedPcmChunks();
	}

	public setMode(mode: UnifiedAudioMode): void {
		if (this.currentMode === mode) return;
		const prevMode = this.currentMode;
		if (this.state === "listening" || this.state === "connecting") {
			this.transport.cleanupBackend();
			this.currentMode = mode;
			this.initModeBackend(mode).catch((err) => this.emitError(err));
		} else {
			this.currentMode = mode;
		}
		this.emitModeChange(mode, prevMode, "Пользовательское переключение режима");
	}

	public updateContext(context: UnifiedAudioContextUpdate): void {
		if (context.patientId !== undefined) this.options.patientId = context.patientId;
		if (context.visitId !== undefined) this.options.visitId = context.visitId;
		if (context.specialty !== undefined) this.options.specialty = context.specialty;
		if (context.adminSecret !== undefined) this.options.adminSecret = context.adminSecret ?? "";
	}

	public async start(): Promise<void> {
		if (this.state === "listening" || this.state === "connecting") return;

		this.recordingId = `rec_${Date.now()}_${++UnifiedAudioClient.sessionCounter}`;
		this.chunkIndex = 0;
		this.setState("connecting");

		try {
			this.streamManager = new AudioStreamManager({
				targetSampleRate: 16000,
				chunkSize: 2048,
				filterOptions: this.options.filterOptions,
				vadOptions: this.options.vadOptions,
				onPcmChunk: (pcm, rms, _sampleRate) => this.handleIncomingAudioPcm(pcm, rms),
				onSilenceTimeout: (collectedPcm, durationMs) => {
					void this.handleSilenceTimeoutChunk(collectedPcm, durationMs);
				},
				onRmsUpdate: (rms, isSpeaking) => this.emitRmsUpdate(rms, isSpeaking),
			});
			await this.streamManager.start();
			await this.initModeBackend(this.currentMode);
			void soundFeedback.playMicStart();
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			this.emitError(err);
			this.setState("error");

			if (this.options.autoFallback && this.currentMode !== "browser_speech") {
				await this.fallbackToNextMode("Ошибка инициализации аудиопотока");
			} else {
				void this.stop();
			}
		}
	}

	public async toggle(): Promise<void> {
		if (this.state === "listening" || this.state === "connecting") {
			await this.stop();
		} else {
			await this.start();
		}
	}

	private async initModeBackend(mode: UnifiedAudioMode): Promise<void> {
		if (mode === "gemini_live") {
			const wsReady = await this.transport.startGeminiLiveWs();
			if (!wsReady && this.options.autoFallback) {
				await this.fallbackToNextMode("WebSocket Gemini Live недоступен");
				return;
			}
			this.setState("listening");
		} else if (mode === "server_whisper") {
			this.setState("listening");
		} else if (mode === "browser_speech") {
			this.transport.startBrowserSpeechRecognition();
			this.setState("listening");
		}
	}

	public async reconnectGeminiLiveWs(): Promise<boolean> {
		return this.transport.reconnectGeminiLiveWs();
	}

	private async fallbackToNextMode(reason: string): Promise<void> {
		if (this.isDisposed) return;
		const prevMode = this.currentMode;
		let nextMode: UnifiedAudioMode;

		if (prevMode === "gemini_live") {
			nextMode = "server_whisper";
		} else if (prevMode === "server_whisper") {
			nextMode = "browser_speech";
		} else {
			this.setState("error");
			this.emitError(`Все режимы распознавания исчерпаны: ${reason}`);
			return;
		}

		console.info(`[DENTE Voice] Fallback: ${prevMode} -> ${nextMode}. Reason: ${reason}`);
		this.transport.cleanupBackend();
		this.currentMode = nextMode;
		this.emitModeChange(nextMode, prevMode, reason);
		await this.initModeBackend(nextMode);
	}

	private handleIncomingAudioPcm(pcm: Int16Array, rms: number): void {
		if (this.currentMode === "gemini_live") {
			this.transport.sendOrBufferLivePcmChunk(pcm, rms);
		}
	}

	private async handleSilenceTimeoutChunk(collectedPcm: Int16Array, _durationMs: number): Promise<void> {
		if (this.state !== "listening" || collectedPcm.length === 0) return;
		if (this.currentMode === "server_whisper") {
			await this.transport.transcribePcmViaServerWhisper(collectedPcm);
		}
	}

	private appendFinalText(text: string): void {
		const clean = text.trim();
		if (!clean) return;
		this.accumulatedText = appendSentenceToTranscript(this.accumulatedText, clean);

		if (typeof window !== "undefined" && this.options.persistDraftKey) {
			safeLocalStorageSetItem(this.options.persistDraftKey, this.accumulatedText);
		}

		this.emitFinalText(clean, this.accumulatedText);
		this.emitFullTranscript(this.accumulatedText);
		void soundFeedback.playSpeechCaptured();
	}

	public clearTranscript(): void {
		this.accumulatedText = "";
		this.interimText = "";
		if (typeof window !== "undefined" && this.options.persistDraftKey) {
			safeLocalStorageRemoveItem(this.options.persistDraftKey);
		}
		this.emitInterimText("");
		this.emitFullTranscript("");
	}

	public async stop(): Promise<string> {
		if (this.state === "idle") return this.getTranscript();
		this.setState("processing");

		if (this.streamManager) {
			const remainingPcm = this.streamManager.stop();
			if (remainingPcm.length > 0 && this.currentMode === "server_whisper") {
				await this.transport.transcribePcmViaServerWhisper(remainingPcm);
			}
			this.streamManager = null;
		}

		this.vadDetector.reset();
		this.transport.cleanupBackend();
		this.clearBufferedPcmChunks();
		this.interimText = "";
		this.emitInterimText("");
		this.setState("idle");
		void soundFeedback.playMicStop();
		return this.getTranscript();
	}

	public cancel(): void {
		if (this.streamManager) {
			this.streamManager.dispose();
			this.streamManager = null;
		}
		this.vadDetector.reset();
		this.transport.cleanupBackend();
		this.clearBufferedPcmChunks();
		this.interimText = "";
		this.emitInterimText("");
		this.setState("idle");
	}

	public dispose(): void {
		this.isDisposed = true;
		this.cancel();
		this.vadDetector.dispose();
		this.clearBufferedPcmChunks();
		this.listeners.clear();
	}

	private setState(newState: UnifiedAudioState): void {
		if (this.state === newState) return;
		const prev = this.state;
		this.state = newState;
		for (const listener of this.listeners) listener.onStateChange?.(newState, prev);
	}

	private emitModeChange(newMode: UnifiedAudioMode, prevMode: UnifiedAudioMode, reason?: string): void {
		for (const listener of this.listeners) listener.onModeChange?.(newMode, prevMode, reason);
	}

	private emitInterimText(text: string): void {
		const twoLayer = this.getTwoLayerTranscript();
		for (const listener of this.listeners) {
			listener.onInterimText?.(text);
			listener.onTwoLayerTranscript?.(twoLayer);
		}
	}

	private emitFinalText(text: string, accumulated: string): void {
		const twoLayer = this.getTwoLayerTranscript();
		for (const listener of this.listeners) {
			listener.onFinalText?.(text, accumulated);
			listener.onTwoLayerTranscript?.(twoLayer);
		}
	}

	private emitFullTranscript(transcript: string): void {
		for (const listener of this.listeners) listener.onFullTranscript?.(transcript);
	}

	private emitRmsUpdate(rms: number, isSpeaking: boolean): void {
		for (const listener of this.listeners) listener.onRmsUpdate?.(rms, isSpeaking);
	}

	private emitError(error: Error | string): void {
		for (const listener of this.listeners) listener.onError?.(error);
	}

	private emitOfflineRecordSaved(record: PendingTranscriptionRecord): void {
		for (const listener of this.listeners) listener.onOfflineRecordSaved?.(record);
	}

	public emitOfflineSync(syncedCount: number, badgeMessage: string): void {
		for (const listener of this.listeners) listener.onOfflineSync?.(syncedCount, badgeMessage);
	}
}
