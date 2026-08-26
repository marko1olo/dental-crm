/**
 * voiceDictationEngine.ts — Движок непрерывного распознавания речи для врача за креслом.
 * Поддерживает SpeechRecognition Web Speech API, AnalyserNode (VU-Meter),
 * глобальные хоткеи (Space, Ctrl+Space) и стриминг парсинга в DentalVoiceIntent.
 */

import { parseDentalVoiceSpeech, type DentalVoiceIntent } from "./dentalGrammarParser";
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
	private mediaStream: MediaStream | null = null;
	private audioContext: AudioContext | null = null;
	private analyser: AnalyserNode | null = null;
	private animFrameId: number | null = null;
	// biome-ignore lint/suspicious/noExplicitAny: Browser SpeechRecognition API
	private recognition: any = null;
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

	public async start(): Promise<boolean> {
		if (this.isListening) return true;

		// 1. Инициализация Web Speech API
		// biome-ignore lint/suspicious/noExplicitAny: SpeechRecognition window check
		const SpeechRec =
			(window as any).SpeechRecognition ||
			(window as any).webkitSpeechRecognition;

		if (!SpeechRec) {
			const err = "Распознавание речи не поддерживается в этом браузере. Используйте Chrome, Edge или Яндекс.Браузер.";
			this.emitError(err);
			showToast(err, "error");
			return false;
		}

		try {
			// 2. Инициализация AudioContext для живого VU-Meter
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
			this.mediaStream = stream;

			// biome-ignore lint/suspicious/noExplicitAny: AudioContext fallback
			const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
			if (AudioCtx) {
				const ctx = new AudioCtx();
				this.audioContext = ctx;
				const source = ctx.createMediaStreamSource(stream);
				const analyser = ctx.createAnalyser();
				analyser.fftSize = 64;
				source.connect(analyser);
				this.analyser = analyser;
				this.startVolumeLoop();
			}

			const rec = new SpeechRec();
			this.recognition = rec;
			rec.lang = "ru-RU";
			rec.continuous = true;
			rec.interimResults = true;

			// biome-ignore lint/suspicious/noExplicitAny: SpeechRecognition event
			rec.onresult = (event: any) => {
				let interim = "";
				let final = "";

				for (let i = 0; i < event.results.length; i++) {
					const item = event.results[i];
					if (item.isFinal) {
						final += item[0].transcript + " ";
					} else {
						interim += item[0].transcript;
					}
				}

				this.interimTranscript = interim.trim();
				this.finalTranscript = final.trim();

				const fullText = (this.finalTranscript + " " + this.interimTranscript).trim();

				for (const l of this.listeners) {
					l.onTranscriptChange?.(this.interimTranscript, this.finalTranscript);
				}

				this.debounceParse(fullText);
			};

			// biome-ignore lint/suspicious/noExplicitAny: error event
			rec.onerror = (e: any) => {
				if (e.error !== "no-speech") {
					this.emitError(`Ошибка микрофона: ${e.error}`);
				}
			};

			rec.onend = () => {
				if (this.isListening) {
					// Автоматический рестарт при обрыве тишины
					try {
						rec.start();
					} catch {
						this.stop();
					}
				}
			};

			rec.start();
			this.isListening = true;
			this.emitListening(true);
			return true;
		} catch (err: any) {
			const msg = err.message || "Не удалось получить доступ к микрофону";
			this.emitError(msg);
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
		if (this.animFrameId) {
			cancelAnimationFrame(this.animFrameId);
			this.animFrameId = null;
		}
		if (this.recognition) {
			try {
				this.recognition.stop();
			} catch {
				// ignore
			}
			this.recognition = null;
		}
		if (this.mediaStream) {
			for (const track of this.mediaStream.getTracks()) {
				track.stop();
			}
			this.mediaStream = null;
		}
		if (this.audioContext) {
			try {
				void this.audioContext.close();
			} catch {
				// ignore
			}
			this.audioContext = null;
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
		for (const l of this.listeners) {
			l.onTranscriptChange?.("", "");
		}
	}

	private debounceParse(text: string): void {
		if (this.parseDebounceTimer) {
			clearTimeout(this.parseDebounceTimer);
		}
		this.parseDebounceTimer = setTimeout(() => {
			if (!text) return;
			const intent = parseDentalVoiceSpeech(text);
			for (const l of this.listeners) {
				l.onIntentParsed?.(intent);
			}
		}, 200);
	}

	private startVolumeLoop(): void {
		const loop = () => {
			if (!this.isListening || !this.analyser) {
				this.emitVolume(0);
				return;
			}
			const data = new Uint8Array(this.analyser.frequencyBinCount);
			this.analyser.getByteFrequencyData(data);
			let sum = 0;
			for (let i = 0; i < data.length; i++) {
				sum += data[i] || 0;
			}
			const avg = sum / (data.length || 1);
			this.emitVolume(avg);
			this.animFrameId = requestAnimationFrame(loop);
		};
		this.animFrameId = requestAnimationFrame(loop);
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
