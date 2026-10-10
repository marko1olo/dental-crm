/**
 * audioStreamTransport.ts — Сетевой транспорт аудиопотока для UnifiedAudioClient:
 * Кольцевой буфер PCM-фреймов, WebSocket Gemini Live (/api/speech/live),
 * HTTP-чанки Server Whisper (/api/speech/transcribe-chunk) + VoiceOfflineQueue и Web Speech API.
 */

import { AudioStreamManager } from "../../../components/audio/AudioStreamManager";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import type { PendingTranscriptionRecord, VoiceOfflineQueue } from "../VoiceOfflineQueue";
import { calculatePcmDurationMs, combineBufferedPcmChunks, encodeBlobToBase64, encodePcm16ToBase64 } from "./pcmAudioProcessor";
import type { InternalUnifiedAudioClientOptions, PcmAudioChunk, UnifiedAudioMode, UnifiedAudioState } from "./types";

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

export class AudioStreamTransport {
	private host: AudioTransportHost;
	public ws: WebSocket | null = null;
	// biome-ignore lint/suspicious/noExplicitAny: Web Speech API instance
	public browserRecognition: any = null;

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
				console.warn("Error flushing buffered PCM chunk:", err);
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
				console.warn("Error sending audio chunk via WebSocket:", err);
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

	public startGeminiLiveWs(): Promise<boolean> {
		return new Promise((resolve) => {
			if (typeof window === "undefined") {
				resolve(false);
				return;
			}
			const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
			const wsUrl = `${protocol}//${window.location.host}/api/speech/live`;
			const opts = this.host.getOptions();

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
							recordingId: this.host.getRecordingId(),
							organizationId: opts.organizationId,
							patientId: opts.patientId,
							visitId: opts.visitId,
							specialty: opts.specialty,
							language: opts.language,
							adminSecret: opts.adminSecret,
							sampleRate: 16000,
						}),
					);
					if (this.pcmRingBuffer.length > 0) this.flushBufferedPcmChunks();
					resolve(true);
				};

				ws.onmessage = (event) => {
					try {
						const data = JSON.parse(event.data);
						if (INTERIM_MESSAGE_TYPES.has(data.type)) {
							this.host.onInterimTranscript(data.text || "");
						} else if (FINAL_MESSAGE_TYPES.has(data.type)) {
							const text = data.text || data.finalText || "";
							if (text.trim()) this.host.onFinalSegment(text.trim());
							this.host.onInterimTranscript("");
						} else if (data.type === "error" || data.type === "provider_error") {
							console.warn("Gemini Live server error:", data.message);
							if (this.host.getOptions().autoFallback) {
								void this.host.onProviderFallback(data.message || "Ошибка распознавания Gemini Live");
							}
						}
					} catch (e) {
						console.error("Error parsing WebSocket message:", e);
					}
				};

				ws.onerror = (err) => {
					this.clearConnectTimeout();
					console.warn("Gemini Live WebSocket error:", err);
					if (this.host.getState() === "listening" && !this.isReconnecting && !this.host.getIsDisposed()) {
						void this.reconnectGeminiLiveWs();
					}
					resolve(false);
				};

				ws.onclose = (event) => {
					this.clearConnectTimeout();
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
				console.warn("WebSocket creation failed:", err);
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
			console.warn(`[DENTE Voice] Max WebSocket reconnect attempts (${opts.maxReconnectAttempts}) reached.`);
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

		console.info(
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
			console.info(`[DENTE Voice] WebSocket reconnected successfully. Flushed ${flushed} buffered audio chunks without speech loss.`);
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
			const response = await fetch("/api/speech/transcribe-chunk", {
				method: "POST",
				headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders({}, opts.adminSecret) },
				body: JSON.stringify({
					recordingId: this.host.getRecordingId(),
					chunkIndex: currentChunkIdx,
					mimeType: "audio/wav" as const,
					audioBase64,
					durationMs,
					organizationId: opts.organizationId,
					patientId: opts.patientId,
					visitId: opts.visitId,
					specialty: opts.specialty,
					language: opts.language,
				}),
			});

			if (!response.ok) throw new Error(`Server Whisper returned status ${response.status}`);
			const data = await response.json();
			if (data?.text?.trim()) this.host.onFinalSegment(data.text.trim());
		} catch (error) {
			console.warn("Server Whisper transcription error:", error);
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
							organizationId: opts.organizationId,
							patientId: opts.patientId,
							visitId: opts.visitId,
							adminSecret: opts.adminSecret,
						},
					})
					.then((rec) => this.host.onOfflineRecordSaved(rec))
					.catch((queueErr) => console.warn("Failed to save transcription segment to offline queue:", queueErr));
			} catch (queueErr) {
				console.warn("Failed to save transcription segment to offline queue:", queueErr);
			}
			if (opts.autoFallback) await this.host.onProviderFallback("Сбой бэкенда Whisper");
		}
	}

	public startBrowserSpeechRecognition(): void {
		if (typeof window === "undefined") return;
		// biome-ignore lint/suspicious/noExplicitAny: SpeechRecognition window check
		const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
		if (!SpeechRec) {
			console.warn("Web Speech API not supported in this browser");
			return;
		}

		try {
			const recognition = new SpeechRec();
			this.browserRecognition = recognition;
			recognition.lang = this.host.getOptions().language === "ru" ? "ru-RU" : "en-US";
			recognition.continuous = true;
			recognition.interimResults = true;

			// biome-ignore lint/suspicious/noExplicitAny: Event type
			recognition.onresult = (event: any) => {
				let interim = "";
				for (let i = event.resultIndex; i < event.results.length; i++) {
					const transcript = event.results[i][0].transcript;
					if (event.results[i].isFinal) {
						if (transcript.trim()) this.host.onFinalSegment(transcript.trim());
					} else {
						interim += transcript;
					}
				}
				this.host.onInterimTranscript(interim);
			};

			// biome-ignore lint/suspicious/noExplicitAny: Event type
			recognition.onerror = (event: any) => {
				console.warn("Browser Speech Recognition error:", event.error);
				if (event.error === "not-allowed" || event.error === "service-not-allowed") {
					this.host.onFatalSpeechError("Доступ к распознаванию речи в браузере заблокирован");
				}
			};

			recognition.onend = () => {
				if (this.host.getState() === "listening" && this.host.getMode() === "browser_speech") {
					try {
						recognition.start();
					} catch (err: unknown) {
						console.warn("[UnifiedAudioClient] Error restarting SpeechRecognition onend:", err);
					}
				}
			};

			recognition.start();
		} catch (err) {
			console.warn("Failed to initialize Web Speech Recognition:", err);
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
			console.warn("[UnifiedAudioClient] Error closing WebSocket:", err);
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
				console.warn("[UnifiedAudioClient] Error stopping SpeechRecognition on stop:", err);
			}
			this.browserRecognition = null;
		}
	}
}
