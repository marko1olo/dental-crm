/**
 * voiceDictationEngine.ts — Движок непрерывного распознавания речи для врача за креслом.
 * Поддерживает UnifiedAudioClient (Gemini Live / Server Whisper / Web Speech fallback),
 * шумоподавление бормашины AudioStreamManager (4000Hz notch), VU-Meter и
 * стриминг парсинга в DentalVoiceIntent для Одонтограммы FDI и 043/у.
 */

import { parseDentalVoiceSpeech, type DentalVoiceIntent } from "./dentalGrammarParser";
import {
	UnifiedAudioClient,
	type UnifiedAudioMode,
} from "./UnifiedAudioClient";
import { showToast } from "../../components/GlobalToast";

export interface VoiceEngineListener {
	onListeningChange?: (isListening: boolean) => void;
	onTranscriptChange?: (interimTranscript: string, finalTranscript: string) => void;
	onIntentParsed?: (intent: DentalVoiceIntent) => void;
	onVolumeChange?: (volume: number) => void;
	onError?: (error: string) => void;
}

export class VoiceDictationEngine {
	private isListening = false;
	private interimTranscript = "";
	private finalTranscript = "";
	private client: UnifiedAudioClient | null = null;
	private unsubscribeClient: (() => void) | null = null;
	private listeners: Set<VoiceEngineListener> = new Set();
	private parseDebounceTimer: NodeJS.Timeout | null = null;

	public addListener(listener: VoiceEngineListener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	public getIsListening(): boolean {
		return this.isListening;
	}

	public getTranscripts(): { interim: string; final: string } {
		return { interim: this.interimTranscript, final: this.finalTranscript };
	}

	public async start(preferredMode: UnifiedAudioMode = "gemini_live"): Promise<boolean> {
		if (this.isListening && this.client) return true;

		try {
			this.stop();

			const client = new UnifiedAudioClient({
				preferredMode,
				specialty: "therapy",
				autoFallback: true,
			});
			this.client = client;

			this.unsubscribeClient = client.subscribe({
				onStateChange: (state) => {
					const listening = state === "listening" || state === "connecting";
					this.isListening = listening;
					this.emitListening(listening);
				},
				onInterimText: (interim) => {
					this.interimTranscript = interim;
					const fullText = (this.finalTranscript + " " + interim).trim();
					for (const l of this.listeners) {
						l.onTranscriptChange?.(this.interimTranscript, this.finalTranscript);
					}
					this.debounceParse(fullText);
				},
				onFinalText: (final, accumulated) => {
					this.finalTranscript = accumulated || final;
					for (const l of this.listeners) {
						l.onTranscriptChange?.(this.interimTranscript, this.finalTranscript);
					}
					this.debounceParse(this.finalTranscript);
				},
				onTwoLayerTranscript: (data) => {
					this.finalTranscript = data.finalized;
					this.interimTranscript = data.interim;
					for (const l of this.listeners) {
						l.onTranscriptChange?.(this.interimTranscript, this.finalTranscript);
					}
					this.debounceParse(data.fullWithInterim || data.finalized);
				},
				onRmsUpdate: (rms) => {
					this.emitVolume(Math.min(100, Math.round(rms * 250)));
				},
				onError: (err) => {
					const msg = typeof err === "string" ? err : err.message;
					this.emitError(msg);
				},
			});

			await client.start();
			this.isListening = true;
			this.emitListening(true);
			return true;
		} catch (err: unknown) {
			const msg =
				err instanceof Error
					? err.message
					: "Не удалось получить доступ к микрофону";
			this.emitError(msg);
			showToast(msg, "error");
			this.stop();
			return false;
		}
	}

	public stop(): void {
		this.isListening = false;
		if (this.parseDebounceTimer) {
			clearTimeout(this.parseDebounceTimer);
			this.parseDebounceTimer = null;
		}
		if (this.unsubscribeClient) {
			this.unsubscribeClient();
			this.unsubscribeClient = null;
		}
		if (this.client) {
			this.client.dispose();
			this.client = null;
		}
		this.emitListening(false);
		this.emitVolume(0);
	}

	public toggle(): void {
		if (this.isListening) {
			this.stop();
		} else {
			void this.start();
		}
	}

	public clear(): void {
		this.interimTranscript = "";
		this.finalTranscript = "";
		if (this.client) {
			this.client.clearTranscript();
		}
		for (const l of this.listeners) {
			l.onTranscriptChange?.("", "");
		}
	}

	private debounceParse(text: string): void {
		if (this.parseDebounceTimer) {
			clearTimeout(this.parseDebounceTimer);
		}
		this.parseDebounceTimer = setTimeout(() => {
			if (!text.trim()) return;
			const intent = parseDentalVoiceSpeech(text.trim());
			for (const l of this.listeners) {
				l.onIntentParsed?.(intent);
			}
		}, 180);
	}

	private emitListening(isL: boolean): void {
		for (const l of this.listeners) {
			l.onListeningChange?.(isL);
		}
	}

	private emitVolume(vol: number): void {
		for (const l of this.listeners) {
			l.onVolumeChange?.(vol);
		}
	}

	private emitError(err: string): void {
		for (const l of this.listeners) {
			l.onError?.(err);
		}
	}
}

export const globalDentalVoiceEngine = new VoiceDictationEngine();
