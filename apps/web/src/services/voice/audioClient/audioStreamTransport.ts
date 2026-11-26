/**
 * audioStreamTransport.ts — Сетевой транспорт аудиопотока для UnifiedAudioClient:
 * Кольцевой буфер PCM-фреймов, WebSocket Gemini Live (/api/speech/live),
 * HTTP-чанки Server Whisper (/api/speech/transcribe-chunk) + VoiceOfflineQueue и Web Speech API.
 */

import { generateUuidV7 } from "@dental/shared";
import { AudioStreamManager } from "../../../components/audio/AudioStreamManager";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders";
import { logger } from "../../../utils/logger";
import type { PendingTranscriptionRecord, VoiceOfflineQueue } from "../VoiceOfflineQueue";
import { calculatePcmDurationMs, combineBufferedPcmChunks, encodeBlobToBase64, encodePcm16ToBase64 } from "./pcmAudioProcessor";
import type { InternalUnifiedAudioClientOptions, PcmAudioChunk, UnifiedAudioMode, UnifiedAudioState } from "./types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toCleanUuid(value?: string | null): string | null {
	if (!value) return null;
	const trimmed = value.trim();
	return UUID_PATTERN.test(trimmed) ? trimmed : null;
}

function normalizeTranscriptionSource(
	source?: string | null,
	visitId?: string | null,
): "visit" | "import" | "document" | "settings_lab" {
	if (source === "visit") return visitId ? "visit" : "document";
	if (source === "import" || source === "document" || source === "settings_lab") return source;
	return visitId ? "visit" : "document";
}

function unwrapEnvelope<T>(json: unknown): T {
	if (json && typeof json === "object" && "data" in json && (json as Record<string, unknown>).data !== undefined) {
		return (json as Record<string, unknown>).data as T;
	}
	return json as T;
}

export interface AudioTransportHost {
	getOptions(): InternalUnifiedAudioClientOptions;
	getState(): UnifiedAudioState;
	getMode(): UnifiedAudioMode;
	getIsDisposed(): boolean;
	getRecordingId(): string;
	nextChunkIndex(): number;
	getAccumulatedText(): string;
	getStreamManager(): AudioStreamManager | null;
	getOfflineQueue(): VoiceOfflineQueue;
	onInterimTranscript(text: string): void;
	onFinalSegment(text: string): void;
	onProviderFallback(reason: string): Promise<void>;
	onFatalSpeechError(message: string): void;
	onOfflineRecordSaved(record: PendingTranscriptionRecord): void;
}

const INTERIM_MESSAGE_TYPES = new Set(["interim_token", "interim_transcript", "transcript_interim", "interim"]);
const FINAL_MESSAGE_TYPES = new Set(["final_token", "final_transcript", "transcript_final", "final", "turn_complete"]);

interface SpeechRecognitionAlternativeLike {
	transcript: string;
	confidence?: number;
}

interface SpeechRecognitionResultLike {
	isFinal: boolean;
	length: number;
	[index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
	length: number;
	[index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike extends Event {
	resultIndex: number;
	results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
	error: string;
	message?: string;
}

interface SpeechRecognitionLike {
	lang: string;
	continuous: boolean;
	interimResults: boolean;
	onresult: ((event: SpeechRecognitionEventLike) => void) | null;
	onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
	onend: (() => void) | null;
	start(): void;
	stop(): void;
	abort(): void;
}

interface SpeechRecognitionConstructorLike {
	new (): SpeechRecognitionLike;
}

interface WindowWithSpeechRecognition {
	SpeechRecognition?: SpeechRecognitionConstructorLike;
	webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
}

export class AudioStreamTransport {
	private host: AudioTransportHost;
	public ws: WebSocket | null = null;
	public browserRecognition: SpeechRecognitionLike | null = null;

	private pcmRingBuffer: PcmAudioChunk[] = [];
	private isReconnecting = false;
	private reconnectAttempts = 0;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private wsConnectTimeoutTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(host: AudioTransportHost) {
		this.host = host;
	}

	public getBufferedPcmChunksCount(): number {
		return this.pcmRingBuffer.length;
	}

	public getIsReconnecting(): boolean {
		return this.isReconnecting;
	}

	public clearBufferedPcmChunks(): void {
		this.pcmRingBuffer = [];
	}

	public bufferPcmChunk(pcm: Int16Array, rms: number): void {
		if (this.pcmRingBuffer.length >= this.host.getOptions().ringBufferCapacity) {
			this.pcmRingBuffer.shift();
		}
		this.pcmRingBuffer.push({ pcm, rms, timestamp: Date.now() });
	}

	public flushBufferedPcmChunks(): number {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.pcmRingBuffer.length === 0) {
			return 0;
		}
		const chunksToFlush = [...this.pcmRingBuffer];
		this.pcmRingBuffer = [];
		let flushedCount = 0;

		for (const chunk of chunksToFlush) {
			try {
				const base64 = encodePcm16ToBase64(chunk.pcm);
				this.ws.send(
					JSON.stringify({
						type: "audio_chunk",
						audioBase64: base64,
						data: base64,
						rms: chunk.rms,
						timestamp: chunk.timestamp,
						isBufferedReplay: true,
					}),
				);
				flushedCount++;
			} catch (err) {
				logger.warn("[DENTE Voice] Error flushing buffered PCM chunk:", err);
				this.pcmRingBuffer.unshift(chunk);
				break;
			}
		}
		return flushedCount;
	}

	public sendOrBufferLivePcmChunk(pcm: Int16Array, rms: number): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN && !this.isReconnecting) {
			try {
				const base64 = encodePcm16ToBase64(pcm);
				this.ws.send(JSON.stringify({ type: "audio_chunk", audioBase64: base64, data: base64, rms, timestamp: Date.now() }));
			} catch (err) {
				logger.warn("[DENTE Voice] Error sending audio chunk via WebSocket:", err);
				this.bufferPcmChunk(pcm, rms);
				void this.reconnectGeminiLiveWs();
			}
		} else {
			this.bufferPcmChunk(pcm, rms);
			if (this.host.getState() === "listening" && !this.isReconnecting && !this.host.getIsDisposed()) {
				void this.reconnectGeminiLiveWs();
			}
		}
	}

	private clearConnectTimeout(): void {
		if (this.wsConnectTimeoutTimer) {
			clearTimeout(this.wsConnectTimeoutTimer);
			this.wsConnectTimeoutTimer = null;
		}
	}

	public async startGeminiLiveWs(): Promise<boolean> {
		if (typeof window === "undefined") {
			return false;
		}
		const opts = this.host.getOptions();
		const patientUuid = toCleanUuid(opts.patientId);
		const visitUuid = toCleanUuid(opts.visitId);

		let ticket = "";
		try {
			const ticketResponse = await fetch("/api/v1/speech/live/ticket", {
				method: "POST",
				credentials: "include",
				headers: denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				}),
				body: JSON.stringify({
					...(opts.specialty ? { specialty: opts.specialty } : {}),
					sampleRate: 16000,
				}),
			});
			if (!ticketResponse.ok) {
				logger.warn(`[DENTE Voice] Speech live ticket rejected with status ${ticketResponse.status}`);
				return false;
			}
			const rawTicketJson: unknown = await ticketResponse.json();
			const ticketPayload = unwrapEnvelope<{ ticket?: string }>(rawTicketJson);
			ticket = typeof ticketPayload?.ticket === "string" ? ticketPayload.ticket.trim() : "";
		} catch (ticketErr) {
			logger.warn("[DENTE Voice] Speech live ticket request failed:", ticketErr);
			return false;
		}

		if (!ticket) {
			logger.warn("[DENTE Voice] Speech live ticket response did not contain a ticket");
			return false;
		}

		return new Promise((resolve) => {
			const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
			const wsUrl = `${protocol}//${window.location.host}/api/speech/live?ticket=${encodeURIComponent(ticket)}`;

			try {
				const ws = new WebSocket(wsUrl);
				this.ws = ws;
				this.clearConnectTimeout();
				this.wsConnectTimeoutTimer = setTimeout(() => {
					this.wsConnectTimeoutTimer = null;
					if (ws.readyState !== WebSocket.OPEN) {
						ws.close();
						resolve(false);
					}
				}, 4000);

				ws.onopen = () => {
					this.clearConnectTimeout();
					ws.send(
						JSON.stringify({
							type: "session_init",
							ticket,
							recordingId: this.host.getRecordingId(),
							patientId: patientUuid,
							visitId: visitUuid,
							specialty: opts.specialty,
							language: opts.language,
							sampleRate: 16000,
						}),
					);
					if (this.pcmRingBuffer.length > 0) this.flushBufferedPcmChunks();
					resolve(true);
				};

				ws.onmessage = (event) => {
					try {
						const data = JSON.parse(event.data);
						if (data.type === "session_ready" || data.type === "auth_ok") {
							return;
						}
						if (INTERIM_MESSAGE_TYPES.has(data.type)) {
							this.host.onInterimTranscript(data.text || "");
						} else if (FINAL_MESSAGE_TYPES.has(data.type)) {
							const text = data.text || data.finalText || "";
							if (text.trim()) this.host.onFinalSegment(text.trim());
							this.host.onInterimTranscript("");
						} else if (data.type === "reconnecting") {
							logger.info(`[DENTE Voice] Gemini Live reconnecting/rotating (attempt ${data.attempt}):`, data.reason);
						} else if (data.type === "key_rotated") {
							logger.info("[DENTE Voice] Gemini Live key successfully rotated");
						} else if (data.type === "error" || data.type === "provider_error") {
							logger.warn("[DENTE Voice] Gemini Live server error:", data.message);
							if (this.host.getOptions().autoFallback) {
								void this.host.onProviderFallback(data.message || "Ошибка распознавания Gemini Live");
							}
						}
					} catch (e) {
						logger.error("[DENTE Voice] Error parsing WebSocket message:", e);
					}
				};

				ws.onerror = (err) => {
					this.clearConnectTimeout();
					logger.warn("[DENTE Voice] Gemini Live WebSocket error:", err);
					if (this.host.getState() === "listening" && !this.isReconnecting && !this.host.getIsDisposed()) {
						void this.reconnectGeminiLiveWs();
					}
					resolve(false);
				};

				ws.onclose = (event) => {
					this.clearConnectTimeout();
					if (event.code === 4001) {
						logger.warn("[DENTE Voice] Gemini Live WebSocket unauthorized (4001)");
						if (opts.autoFallback && this.host.getState() === "listening" && !this.host.getIsDisposed()) {
							void this.host.onProviderFallback("Требуется повторная авторизация потока Gemini Live");
						}
						return;
					}
					if (
						this.host.getState() === "listening" &&
						this.host.getMode() === "gemini_live" &&
						!this.isReconnecting &&
						!this.host.getIsDisposed() &&
						event.code !== 1000
					) {
						void this.reconnectGeminiLiveWs();
					}
				};
			} catch (err) {
				logger.warn("[DENTE Voice] WebSocket creation failed:", err);
				resolve(false);
			}
		});
	}

	public async reconnectGeminiLiveWs(): Promise<boolean> {
		if (
			this.isReconnecting ||
			this.host.getIsDisposed() ||
			this.host.getState() !== "listening" ||
			this.host.getMode() !== "gemini_live"
		) {
			return false;
		}

		const opts = this.host.getOptions();
		if (this.reconnectAttempts >= opts.maxReconnectAttempts) {
			logger.warn(`[DENTE Voice] Max WebSocket reconnect attempts (${opts.maxReconnectAttempts}) reached.`);
			if (opts.autoFallback) {
				if (this.pcmRingBuffer.length > 0) {
					const combinedPcm = combineBufferedPcmChunks(this.pcmRingBuffer);
					this.pcmRingBuffer = [];
					void this.transcribePcmViaServerWhisper(combinedPcm);
				}
				await this.host.onProviderFallback("Превышено число попыток реконнекта Gemini Live");
			}
			return false;
		}

		this.isReconnecting = true;
		this.reconnectAttempts++;
		this.detachAndCloseSocket(false);

		logger.info(
			`[DENTE Voice] Reconnecting WebSocket (attempt ${this.reconnectAttempts}/${opts.maxReconnectAttempts}, buffered chunks: ${this.pcmRingBuffer.length})...`,
		);

		const connected = await this.startGeminiLiveWs();
		if (connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.isReconnecting = false;
			this.reconnectAttempts = 0;
			if (this.reconnectTimer) {
				clearTimeout(this.reconnectTimer);
				this.reconnectTimer = null;
			}
			const flushed = this.flushBufferedPcmChunks();
			logger.info(`[DENTE Voice] WebSocket reconnected successfully. Flushed ${flushed} buffered audio chunks without speech loss.`);
			return true;
		}

		this.isReconnecting = false;
		if (this.host.getState() === "listening" && !this.host.getIsDisposed() && this.reconnectAttempts < opts.maxReconnectAttempts) {
			const backoff = Math.min(opts.reconnectBackoffMs * Math.pow(1.5, this.reconnectAttempts - 1), 5000);
			if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
			this.reconnectTimer = setTimeout(() => {
				this.reconnectTimer = null;
				if (this.host.getState() === "listening" && !this.host.getIsDisposed()) {
					void this.reconnectGeminiLiveWs();
				}
			}, backoff);
		} else if (this.reconnectAttempts >= opts.maxReconnectAttempts && opts.autoFallback) {
			await this.host.onProviderFallback("Обрыв WebSocket соединения Gemini Live");
		}
		return false;
	}

	public async transcribePcmViaServerWhisper(pcm: Int16Array): Promise<void> {
		if (pcm.length === 0) return;

		const opts = this.host.getOptions();
		const currentChunkIdx = this.host.nextChunkIndex();
		const streamManager = this.host.getStreamManager();
		const wavBlob = streamManager ? streamManager.exportWavBlob([pcm], 16000) : new AudioStreamManager().exportWavBlob([pcm], 16000);

		let audioBase64 = "";
		const durationMs = calculatePcmDurationMs(pcm.length, 16000);

		try {
			audioBase64 = await encodeBlobToBase64(wavBlob);
			const orgUuid = toCleanUuid(opts.organizationId);
			const patientUuid = toCleanUuid(opts.patientId);
			const visitUuid = toCleanUuid(opts.visitId);
			const normalizedSource = normalizeTranscriptionSource(opts.source, visitUuid);
			const response = await fetch("/api/speech/transcribe-chunk", {
				method: "POST",
				credentials: "include",
				headers: denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				}),
				body: JSON.stringify({
					recordingId: this.host.getRecordingId(),
					chunkIndex: currentChunkIdx,
					mimeType: "audio/wav" as const,
					audioBase64,
					durationMs,
					source: normalizedSource,
					...(orgUuid ? { organizationId: orgUuid } : {}),
					patientId: patientUuid,
					visitId: visitUuid,
					specialty: opts.specialty,
					language: opts.language,
				}),
			});

			if (!response.ok) throw new Error(`Server Whisper returned status ${response.status}`);
			const rawJson: unknown = await response.json();
			const data = unwrapEnvelope<{ chunk?: { transcript?: string }; text?: string }>(rawJson);
			const text = (data?.chunk?.transcript ?? data?.text ?? "").trim();
			if (text) this.host.onFinalSegment(text);
		} catch (error) {
			logger.warn("[DENTE Voice] Server Whisper transcription error:", error);
			try {
				void this.host
					.getOfflineQueue()
					.enqueue({
						durationMs,
						audioBase64: audioBase64 || undefined,
						wavBlob,
						rawText: this.host.getAccumulatedText(),
						specialty: opts.specialty,
						context: {
							organizationId: toCleanUuid(opts.organizationId),
							patientId: toCleanUuid(opts.patientId),
							visitId: toCleanUuid(opts.visitId),
						},
					})
					.then((rec) => this.host.onOfflineRecordSaved(rec))
					.catch((queueErr) => logger.warn("[DENTE Voice] Failed to save transcription segment to offline queue:", queueErr));
			} catch (queueErr) {
				logger.warn("[DENTE Voice] Failed to save transcription segment to offline queue:", queueErr);
			}
			if (opts.autoFallback) await this.host.onProviderFallback("Сбой бэкенда Whisper");
		}
	}

	public startBrowserSpeechRecognition(): void {
		if (typeof window === "undefined") return;
		const win = window as Window & WindowWithSpeechRecognition;
		const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
		if (!SpeechRec) {
			logger.warn("[DENTE Voice] Web Speech API not supported in this browser");
			this.host.onFatalSpeechError("Web Speech API не поддерживается в данном браузере или окружении");
			return;
		}

		try {
			const recognition = new SpeechRec();
			this.browserRecognition = recognition;
			recognition.lang = this.host.getOptions().language === "ru" ? "ru-RU" : "en-US";
			recognition.continuous = true;
			recognition.interimResults = true;

			recognition.onresult = (event: SpeechRecognitionEventLike) => {
				let interim = "";
				for (let i = event.resultIndex; i < event.results.length; i++) {
					const transcript = event.results[i]?.[0]?.transcript || "";
					if (event.results[i]?.isFinal) {
						if (transcript.trim()) this.host.onFinalSegment(transcript.trim());
					} else {
						interim += transcript;
					}
				}
				this.host.onInterimTranscript(interim);
			};

			recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
				logger.warn("[DENTE Voice] Browser Speech Recognition error:", event.error);
				if (event.error === "not-allowed" || event.error === "service-not-allowed") {
					this.host.onFatalSpeechError("Доступ к распознаванию речи в браузере заблокирован");
				}
			};

			recognition.onend = () => {
				if (this.host.getState() === "listening" && this.host.getMode() === "browser_speech") {
					try {
						recognition.start();
					} catch (err: unknown) {
						logger.warn("[UnifiedAudioClient] Error restarting SpeechRecognition onend:", err);
					}
				}
			};

			recognition.start();
		} catch (err) {
			logger.warn("[DENTE Voice] Failed to initialize Web Speech Recognition:", err);
			this.host.onFatalSpeechError(
				err instanceof Error
					? `Не удалось запустить распознавание речи браузера: ${err.message}`
					: "Не удалось запустить распознавание речи браузера",
			);
		}
	}

	private detachAndCloseSocket(sendSessionClose: boolean): void {
		if (!this.ws) return;
		try {
			this.ws.onopen = null;
			this.ws.onmessage = null;
			this.ws.onerror = null;
			this.ws.onclose = null;
			if (sendSessionClose && this.ws.readyState === WebSocket.OPEN) {
				this.ws.send(JSON.stringify({ type: "session_close" }));
			}
			this.ws.close();
		} catch (err: unknown) {
			logger.warn("[UnifiedAudioClient] Error closing WebSocket:", err);
		}
		this.ws = null;
	}

	public cleanupBackend(): void {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		this.clearConnectTimeout();
		this.isReconnecting = false;
		this.reconnectAttempts = 0;
		this.detachAndCloseSocket(true);

		if (this.browserRecognition) {
			try {
				this.browserRecognition.onresult = null;
				this.browserRecognition.onerror = null;
				this.browserRecognition.onend = null;
				this.browserRecognition.stop();
			} catch (err: unknown) {
				logger.warn("[UnifiedAudioClient] Error stopping SpeechRecognition on stop:", err);
			}
			this.browserRecognition = null;
		}
	}
}
