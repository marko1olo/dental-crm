/**
 * UnifiedAudioClient.ts — Единый клиент захвата и распознавания речи для DENTE CRM.
 *
 * ВОЗМОЖНОСТИ:
 * 1. Бесшовное переключение между 3 режимами распознавания:
 *    - 'gemini_live': WebSocket стриминг в реальном времени (/api/speech/live) с ультранизкой задержкой.
 *    - 'server_whisper': Чанковая отправка аудио в backend Whisper (/api/speech/transcribe-chunk) по VAD.
 *    - 'browser_speech': Локальный Web Speech API fallback без сетевых зависимостей.
 * 2. Автоматический Fallback:
 *    - При обрыве WebSocket / Gemini Live -> мгновенное переключение на server_whisper.
 *    - При сетевой изоляции / оффлайн -> переключение на browser_speech.
 * 3. Локальное автосохранение черновика диктовки в localStorage с защитой от сброса при перезагрузке.
 * 4. Полная подписка на события (интерим-текст, финальный текст, RMS громкость, смена режима).
 */

import {
	AudioStreamManager,
	type DentalNoiseFilterOptions,
	type VadOptions,
} from "../../components/audio/AudioStreamManager";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import { soundFeedback } from "../audio/SoundFeedbackService";
import {
	globalVoiceOfflineQueue,
	type PendingTranscriptionRecord,
	VoiceOfflineQueue,
} from "./VoiceOfflineQueue";

export type UnifiedAudioMode =
	| "gemini_live"
	| "server_whisper"
	| "browser_speech";

export type UnifiedAudioState =
	| "idle"
	| "connecting"
	| "listening"
	| "processing"
	| "error";

export interface UnifiedAudioClientOptions {
	preferredMode?: UnifiedAudioMode | undefined;
	organizationId?: string | null | undefined;
	patientId?: string | null | undefined;
	visitId?: string | null | undefined;
	specialty?: string | undefined;
	language?: string | undefined;
	adminSecret?: string | null | undefined;
	filterOptions?: DentalNoiseFilterOptions | undefined;
	vadOptions?: VadOptions | undefined;
	autoFallback?: boolean | undefined;
	persistDraftKey?: string | null | undefined;
	offlineQueue?: VoiceOfflineQueue | undefined;
}

export type UnifiedAudioListener = {
	onInterimText?: (text: string) => void;
	onFinalText?: (text: string, accumulated: string) => void;
	onFullTranscript?: (transcript: string) => void;
	onTwoLayerTranscript?: (data: {
		finalized: string;
		interim: string;
		fullWithInterim: string;
	}) => void;
	onStateChange?: (state: UnifiedAudioState, prevState: UnifiedAudioState) => void;
	onModeChange?: (
		newMode: UnifiedAudioMode,
		prevMode: UnifiedAudioMode,
		reason?: string,
	) => void;
	onRmsUpdate?: (rms: number, isSpeaking: boolean) => void;
	onError?: (error: Error | string) => void;
	onOfflineRecordSaved?: (record: PendingTranscriptionRecord) => void;
	onOfflineSync?: (syncedCount: number, badgeMessage: string) => void;
};

interface InternalUnifiedAudioClientOptions {
	preferredMode: UnifiedAudioMode;
	organizationId: string | null;
	patientId: string | null;
	visitId: string | null;
	specialty: string;
	language: string;
	adminSecret: string;
	filterOptions: DentalNoiseFilterOptions;
	vadOptions: VadOptions;
	autoFallback: boolean;
	persistDraftKey: string;
}

export class UnifiedAudioClient {
	private options: InternalUnifiedAudioClientOptions;
	private offlineQueue: VoiceOfflineQueue;
	private currentMode: UnifiedAudioMode;
	private state: UnifiedAudioState = "idle";
	private streamManager: AudioStreamManager | null = null;
	private ws: WebSocket | null = null;
	// biome-ignore lint/suspicious/noExplicitAny: Web Speech API instance
	private browserRecognition: any = null;

	private interimText = "";
	private accumulatedText = "";
	private recordingId = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
	private chunkIndex = 0;
	private listeners = new Set<UnifiedAudioListener>();
	private isDisposed = false;

	constructor(options: UnifiedAudioClientOptions = {}) {
		this.options = {
			preferredMode: options.preferredMode ?? "gemini_live",
			organizationId: options.organizationId ?? null,
			patientId: options.patientId ?? null,
			visitId: options.visitId ?? null,
			specialty: options.specialty ?? "therapy",
			language: options.language ?? "ru",
			adminSecret: options.adminSecret ?? "",
			filterOptions: options.filterOptions ?? {
				enableHighpass: true,
				highpassFrequency: 120,
				enableLowpass: true,
				lowpassFrequency: 4500,
				enableNotch: true,
				notchFrequency: 4000,
				notchQ: 4.0,
			},
			vadOptions: options.vadOptions ?? {
				enabled: true,
				speechThresholdRms: 0.016,
				silenceThresholdRms: 0.008,
				silenceTimeoutMs: 1800,
				minSpeechDurationMs: 300,
				maxSpeechDurationMs: 30000,
			},
			autoFallback: options.autoFallback ?? true,
			persistDraftKey:
				options.persistDraftKey ?? "dente_voice_dictation_draft",
		};

		this.offlineQueue = options.offlineQueue ?? globalVoiceOfflineQueue;
		this.currentMode = this.options.preferredMode;

		// Восстановление ранее сохраненного черновика транскрипта
		if (typeof window !== "undefined" && this.options.persistDraftKey) {
			const saved = safeLocalStorageGetItem(this.options.persistDraftKey);
			if (saved && saved.trim()) {
				this.accumulatedText = saved.trim();
			}
		}
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

	public getOfflineQueue(): VoiceOfflineQueue {
		return this.offlineQueue;
	}

	public getTranscript(): string {
		return this.accumulatedText;
	}

	public getInterimText(): string {
		return this.interimText;
	}

	public getTwoLayerTranscript(): {
		finalized: string;
		interim: string;
		fullWithInterim: string;
	} {
		const finalized = this.accumulatedText;
		const interim = this.interimText;
		const fullWithInterim = interim.trim()
			? finalized.trim()
				? `${finalized.trim()} ${interim.trim()}`
				: interim.trim()
			: finalized.trim();
		return { finalized, interim, fullWithInterim };
	}

	public setMode(mode: UnifiedAudioMode): void {
		if (this.currentMode === mode) return;
		const prevMode = this.currentMode;
		if (this.state === "listening" || this.state === "connecting") {
			this.cleanupCurrentModeBackend();
			this.currentMode = mode;
			this.initModeBackend(mode).catch((err) => {
				this.emitError(err);
			});
		} else {
			this.currentMode = mode;
		}
		this.emitModeChange(mode, prevMode, "Пользовательское переключение режима");
	}

	public updateContext(context: {
		patientId?: string | null | undefined;
		visitId?: string | null | undefined;
		specialty?: string | undefined;
		adminSecret?: string | null | undefined;
	}): void {
		if (context.patientId !== undefined) this.options.patientId = context.patientId;
		if (context.visitId !== undefined) this.options.visitId = context.visitId;
		if (context.specialty !== undefined) this.options.specialty = context.specialty;
		if (context.adminSecret !== undefined) this.options.adminSecret = context.adminSecret ?? "";
	}

	/**
	 * Запуск распознавания в текущем режиме с авто-переключением при сбоях
	 */
	public async start(): Promise<void> {
		if (this.state === "listening" || this.state === "connecting") return;

		this.recordingId = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
		this.chunkIndex = 0;
		this.setState("connecting");

		try {
			// 1. Инициализация аппаратного захвата микрофона и фильтров
			this.streamManager = new AudioStreamManager({
				targetSampleRate: 16000,
				chunkSize: 2048,
				filterOptions: this.options.filterOptions,
				vadOptions: this.options.vadOptions,
				onPcmChunk: (pcm, rms, _sampleRate) => {
					this.handleIncomingAudioPcm(pcm, rms);
				},
				onSilenceTimeout: (collectedPcm, durationMs) => {
					this.handleSilenceTimeoutChunk(collectedPcm, durationMs);
				},
				onRmsUpdate: (rms, isSpeaking) => {
					this.emitRmsUpdate(rms, isSpeaking);
				},
				onError: (err) => {
					this.emitError(err);
				},
			});

			await this.streamManager.start();

			// 2. Запуск соответствующего бекенда распознавания
			await this.initModeBackend(this.currentMode);

			// Аппаратный звуковой отклик: микрофон включен
			void soundFeedback.playMicStart();
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			this.emitError(err);
			this.setState("error");

			// Попытка отката на Web Speech API
			if (this.options.autoFallback && this.currentMode !== "browser_speech") {
				await this.fallbackToNextMode("Ошибка инициализации аудиопотока");
			} else {
				this.stop();
			}
		}
	}

	/**
	 * Инициализация конкретного бэкенда распознавания
	 */
	private async initModeBackend(mode: UnifiedAudioMode): Promise<void> {
		if (mode === "gemini_live") {
			const wsReady = await this.startGeminiLiveWs();
			if (!wsReady && this.options.autoFallback) {
				await this.fallbackToNextMode("WebSocket Gemini Live недоступен");
				return;
			}
			this.setState("listening");
		} else if (mode === "server_whisper") {
			// В режиме server_whisper чанки отправляются по событиям VAD/тишины
			this.setState("listening");
		} else if (mode === "browser_speech") {
			this.startBrowserSpeechRecognition();
			this.setState("listening");
		}
	}

	/**
	 * Подключение WebSocket для Gemini Live (/api/speech/live)
	 */
	private startGeminiLiveWs(): Promise<boolean> {
		return new Promise((resolve) => {
			if (typeof window === "undefined") {
				resolve(false);
				return;
			}

			const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
			const host = window.location.host;
			const wsUrl = `${protocol}//${host}/api/speech/live`;

			try {
				const ws = new WebSocket(wsUrl);
				this.ws = ws;

				const timeoutTimer = setTimeout(() => {
					if (ws.readyState !== WebSocket.OPEN) {
						ws.close();
						resolve(false);
					}
				}, 4000);

				ws.onopen = () => {
					clearTimeout(timeoutTimer);
					// Отправка конфигурации сессии
					ws.send(
						JSON.stringify({
							type: "session_init",
							recordingId: this.recordingId,
							organizationId: this.options.organizationId,
							patientId: this.options.patientId,
							visitId: this.options.visitId,
							specialty: this.options.specialty,
							language: this.options.language,
							adminSecret: this.options.adminSecret,
							sampleRate: 16000,
						}),
					);
					resolve(true);
				};

				ws.onmessage = (event) => {
					try {
						const data = JSON.parse(event.data);
						if (
							data.type === "interim_token" ||
							data.type === "interim_transcript" ||
							data.type === "transcript_interim"
						) {
							this.interimText = data.text || "";
							this.emitInterimText(this.interimText);
						} else if (
							data.type === "final_token" ||
							data.type === "final_transcript" ||
							data.type === "transcript_final"
						) {
							const text = data.text || "";
							if (text.trim()) {
								this.appendFinalText(text.trim());
							}
							this.interimText = "";
							this.emitInterimText("");
						} else if (data.type === "error" || data.type === "provider_error") {
							console.warn("Gemini Live server error:", data.message);
							if (this.options.autoFallback) {
								this.fallbackToNextMode(data.message || "Ошибка распознавания Gemini Live");
							}
						}
					} catch (e) {
						console.error("Error parsing WebSocket message:", e);
					}
				};

				ws.onerror = (err) => {
					clearTimeout(timeoutTimer);
					console.warn("Gemini Live WebSocket error:", err);
					if (this.state === "listening" && this.options.autoFallback) {
						this.fallbackToNextMode("Сбой WebSocket соединения Gemini Live");
					}
					resolve(false);
				};

				ws.onclose = () => {
					if (
						this.state === "listening" &&
						this.options.autoFallback &&
						this.currentMode === "gemini_live"
					) {
						this.fallbackToNextMode("Обрыв WebSocket соединения");
					}
				};
			} catch (err) {
				console.warn("WebSocket creation failed:", err);
				resolve(false);
			}
		});
	}

	/**
	 * Запуск браузерного Web Speech API как локального fallback
	 */
	private startBrowserSpeechRecognition(): void {
		// biome-ignore lint/suspicious/noExplicitAny: SpeechRecognition window check
		const SpeechRec =
			(window as any).SpeechRecognition ||
			// biome-ignore lint/suspicious/noExplicitAny: webkitSpeechRecognition window check
			(window as any).webkitSpeechRecognition;

		if (!SpeechRec) {
			console.warn("Web Speech API not supported in this browser");
			return;
		}

		try {
			const recognition = new SpeechRec();
			this.browserRecognition = recognition;
			recognition.lang = this.options.language === "ru" ? "ru-RU" : "en-US";
			recognition.continuous = true;
			recognition.interimResults = true;
			recognition.maxAlternatives = 1;

			// biome-ignore lint/suspicious/noExplicitAny: SpeechRecognitionEvent
			recognition.onresult = (event: any) => {
				let interim = "";
				for (let i = event.resultIndex; i < event.results.length; i++) {
					const result = event.results[i];
					if (result.isFinal) {
						const finalTranscript = result[0]?.transcript?.trim() || "";
						if (finalTranscript) {
							this.appendFinalText(finalTranscript);
						}
					} else {
						interim += result[0]?.transcript || "";
					}
				}
				this.interimText = interim;
				this.emitInterimText(interim);
			};

			// biome-ignore lint/suspicious/noExplicitAny: SpeechRecognitionErrorEvent
			recognition.onerror = (event: any) => {
				console.warn("Browser Speech Recognition error:", event.error);
				if (event.error !== "no-speech") {
					this.emitError(`Web Speech error: ${event.error}`);
				}
			};

			recognition.onend = () => {
				if (this.state === "listening" && this.currentMode === "browser_speech") {
					try {
						recognition.start();
					} catch {}
				}
			};

			recognition.start();
		} catch (err) {
			console.warn("Failed to start Web Speech Recognition:", err);
		}
	}

	/**
	 * Переключение на следующий режим при сбое (gemini_live -> server_whisper -> browser_speech)
	 */
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
		this.cleanupCurrentModeBackend();
		this.currentMode = nextMode;
		this.emitModeChange(nextMode, prevMode, reason);

		await this.initModeBackend(nextMode);
	}

	/**
	 * Передача потока PCM чанков в WebSocket (для Gemini Live)
	 */
	private handleIncomingAudioPcm(pcm: Int16Array, rms: number): void {
		if (
			this.currentMode === "gemini_live" &&
			this.ws &&
			this.ws.readyState === WebSocket.OPEN
		) {
			try {
				const uint8Buffer = new Uint8Array(
					pcm.buffer,
					pcm.byteOffset,
					pcm.byteLength,
				);
				let binary = "";
				const len = uint8Buffer.byteLength;
				for (let i = 0; i < len; i++) {
					const byte = uint8Buffer[i] ?? 0;
					binary += String.fromCharCode(byte);
				}
				const base64 = btoa(binary);

				this.ws.send(
					JSON.stringify({
						type: "audio_chunk",
						audioBase64: base64,
						data: base64,
						rms,
						timestamp: Date.now(),
					}),
				);
			} catch (err) {
				console.warn("Error sending audio chunk via WebSocket:", err);
			}
		}
	}

	/**
	 * Обработка окончания речевого фрагмента по VAD (тишина > 1.8 сек) для Whisper
	 */
	private async handleSilenceTimeoutChunk(
		collectedPcm: Int16Array,
		_durationMs: number,
	): Promise<void> {
		if (this.state !== "listening" || collectedPcm.length === 0) return;

		if (this.currentMode === "server_whisper") {
			await this.transcribePcmViaServerWhisper(collectedPcm);
		}
	}

	/**
	 * Отправка чанка звука в backend Whisper (/api/speech/transcribe-chunk)
	 */
	private async transcribePcmViaServerWhisper(pcm: Int16Array): Promise<void> {
		if (pcm.length === 0) return;

		const currentChunkIdx = this.chunkIndex++;
		const wavBlob = this.streamManager
			? this.streamManager.exportWavBlob([pcm], 16000)
			: new AudioStreamManager().exportWavBlob([pcm], 16000);

		let audioBase64 = "";
		const durationMs = Math.round((pcm.length / 16000) * 1000);

		try {
			const arrayBuffer = await wavBlob.arrayBuffer();
			const uint8 = new Uint8Array(arrayBuffer);
			let binary = "";
			for (let i = 0; i < uint8.length; i++) {
				const byte = uint8[i] ?? 0;
				binary += String.fromCharCode(byte);
			}
			audioBase64 = btoa(binary);

			const payload = {
				recordingId: this.recordingId,
				chunkIndex: currentChunkIdx,
				mimeType: "audio/wav" as const,
				audioBase64,
				durationMs,
				organizationId: this.options.organizationId,
				patientId: this.options.patientId,
				visitId: this.options.visitId,
				specialty: this.options.specialty,
				language: this.options.language,
			};

			const response = await fetch("/api/speech/transcribe-chunk", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders({}, this.options.adminSecret),
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				throw new Error(`Server Whisper returned status ${response.status}`);
			}

			const data = await response.json();
			if (data && data.text && data.text.trim()) {
				this.appendFinalText(data.text.trim());
			}
		} catch (error) {
			console.warn("Server Whisper transcription error:", error);

			// Сохранение аудиофрагмента в персистентную оффлайн-очередь IndexedDB
			try {
				void this.offlineQueue
					.enqueue({
						durationMs,
						audioBase64: audioBase64 || undefined,
						wavBlob,
						rawText: this.accumulatedText,
						specialty: this.options.specialty,
						context: {
							organizationId: this.options.organizationId,
							patientId: this.options.patientId,
							visitId: this.options.visitId,
							adminSecret: this.options.adminSecret,
						},
					})
					.then((rec) => {
						this.emitOfflineRecordSaved(rec);
					});
			} catch (queueErr) {
				console.warn("Failed to save transcription segment to offline queue:", queueErr);
			}

			if (this.options.autoFallback) {
				await this.fallbackToNextMode("Сбой бэкенда Whisper");
			}
		}
	}

	/**
	 * Добавление распознанного предложения к накопленному транскрипту
	 */
	private appendFinalText(text: string): void {
		if (!text) return;
		const clean = text.trim();
		if (!clean) return;

		if (this.accumulatedText.length > 0) {
			const endsWithPunct = /[.?!,]$/.test(this.accumulatedText.trim());
			this.accumulatedText += (endsWithPunct ? " " : ". ") + clean;
		} else {
			this.accumulatedText = clean;
		}

		// Автосохранение черновика в localStorage
		if (typeof window !== "undefined" && this.options.persistDraftKey) {
			safeLocalStorageSetItem(
				this.options.persistDraftKey,
				this.accumulatedText,
			);
		}

		this.emitFinalText(clean, this.accumulatedText);
		this.emitFullTranscript(this.accumulatedText);

		// Аппаратный звуковой отклик: речевой токен захвачен
		void soundFeedback.playSpeechCaptured();
	}

	private cleanupCurrentModeBackend(): void {
		if (this.ws) {
			try {
				if (this.ws.readyState === WebSocket.OPEN) {
					this.ws.send(JSON.stringify({ type: "session_close" }));
				}
				this.ws.close();
			} catch {}
			this.ws = null;
		}

		if (this.browserRecognition) {
			try {
				this.browserRecognition.stop();
			} catch {}
			this.browserRecognition = null;
		}
	}

	/**
	 * Сброс накопленного транскрипта и очистка локального черновика
	 */
	public clearTranscript(): void {
		this.accumulatedText = "";
		this.interimText = "";
		if (typeof window !== "undefined" && this.options.persistDraftKey) {
			safeLocalStorageRemoveItem(this.options.persistDraftKey);
		}
		this.emitInterimText("");
		this.emitFullTranscript("");
	}

	/**
	 * Остановка записи с возвратом накопленного финального текста
	 */
	public async stop(): Promise<string> {
		if (this.state === "idle") return this.getTranscript();

		this.setState("processing");

		// Завершаем остаточный сегмент в streamManager если был
		if (this.streamManager) {
			const remainingPcm = this.streamManager.stop();
			if (
				remainingPcm.length > 0 &&
				this.currentMode === "server_whisper"
			) {
				await this.transcribePcmViaServerWhisper(remainingPcm);
			}
			this.streamManager = null;
		}

		this.cleanupCurrentModeBackend();
		this.interimText = "";
		this.emitInterimText("");
		this.setState("idle");

		// Аппаратный звуковой отклик: микрофон выключен
		void soundFeedback.playMicStop();

		return this.getTranscript();
	}

	public cancel(): void {
		if (this.streamManager) {
			this.streamManager.dispose();
			this.streamManager = null;
		}
		this.cleanupCurrentModeBackend();
		this.interimText = "";
		this.emitInterimText("");
		this.setState("idle");
	}

	public dispose(): void {
		this.isDisposed = true;
		this.cancel();
		this.listeners.clear();
	}

	private setState(newState: UnifiedAudioState): void {
		if (this.state === newState) return;
		const prev = this.state;
		this.state = newState;
		for (const listener of this.listeners) {
			listener.onStateChange?.(newState, prev);
		}
	}

	private emitModeChange(
		newMode: UnifiedAudioMode,
		prevMode: UnifiedAudioMode,
		reason?: string,
	): void {
		for (const listener of this.listeners) {
			listener.onModeChange?.(newMode, prevMode, reason);
		}
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
		for (const listener of this.listeners) {
			listener.onFullTranscript?.(transcript);
		}
	}

	private emitRmsUpdate(rms: number, isSpeaking: boolean): void {
		for (const listener of this.listeners) {
			listener.onRmsUpdate?.(rms, isSpeaking);
		}
	}

	private emitError(error: Error | string): void {
		for (const listener of this.listeners) {
			listener.onError?.(error);
		}
	}

	private emitOfflineRecordSaved(record: PendingTranscriptionRecord): void {
		for (const listener of this.listeners) {
			listener.onOfflineRecordSaved?.(record);
		}
	}

	private emitOfflineSync(syncedCount: number, badgeMessage: string): void {
		for (const listener of this.listeners) {
			listener.onOfflineSync?.(syncedCount, badgeMessage);
		}
	}
}
