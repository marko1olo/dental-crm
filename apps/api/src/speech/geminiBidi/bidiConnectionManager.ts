/**
 * @file bidiConnectionManager.ts
 * @description Resilient WebSocket connection management for Google Gemini 3.5 Transcribe Live,
 * handling auth rotation, network shield routing, server message parsing, and incremental transcription.
 */

import { Buffer } from "node:buffer";
import { EventEmitter } from "node:events";
import { URL } from "node:url";
import WebSocket, { type ClientOptions, type Data } from "ws";
import { getNetworkShieldWsAgent } from "../../services/agent/networkShield.js";
import {
	keyRetryLimit,
	recordProviderKeyFailure,
	recordProviderKeySuccess,
	selectProviderKey,
	type SpeechProviderKeyCandidate,
} from "../keyPool.js";
import {
	BidiAudioStreamer,
	buildBidiMediaChunkFrame,
} from "./audioStreamer.js";
import { buildBidiSetupFrame } from "./dentalVocabulary.js";
import {
	DEFAULT_GEMINI_BIDI_ENDPOINT,
	DEFAULT_GEMINI_BIDI_MODEL,
	DEFAULT_MAX_BIDI_BUFFER_BYTES,
	DEFAULT_SAMPLE_RATE,
	type GeminiBidiBridgeOptions,
	type GeminiBidiParsedMessage,
} from "./types.js";

/**
 * Parses incoming server message from Google Gemini Live WebSocket.
 *
 * CRITICAL RULE:
 * - serverContent.interimInputTranscription.text -> { type: 'interim', text: ... }
 * - serverContent.inputTranscription.text -> { type: 'final', text: ... }
 * - ZERO searching in modelTurn.parts for Live STT transcription!
 */
export function parseBidiServerMessage(
	data: Data | string,
): GeminiBidiParsedMessage | null {
	try {
		const rawStr =
			typeof data === "string"
				? data
				: Buffer.isBuffer(data)
					? data.toString("utf8")
					: Array.isArray(data)
						? Buffer.concat(data).toString("utf8")
						: Buffer.from(data).toString("utf8");

		if (!rawStr.trim()) {
			return null;
		}

		const payload = JSON.parse(rawStr);

		if (payload.setupComplete !== undefined) {
			return { isSetupComplete: true };
		}

		if (payload.error) {
			return {
				isSetupComplete: false,
				error: {
					code: Number(payload.error.code ?? 500),
					message: String(payload.error.message ?? "Gemini Live STT error"),
					status: payload.error.status
						? String(payload.error.status)
						: undefined,
				},
			};
		}

		const serverContent = payload.serverContent;
		if (serverContent) {
			const isTurnComplete = Boolean(serverContent.turnComplete);

			// 1. Interim user input transcription
			if (
				serverContent.interimInputTranscription &&
				typeof serverContent.interimInputTranscription.text === "string"
			) {
				const text = serverContent.interimInputTranscription.text;
				return {
					isSetupComplete: false,
					turnComplete: isTurnComplete,
					transcript: {
						type: "interim",
						text,
						timestampMs: Date.now(),
						raw: payload,
					},
				};
			}

			// 2. Finalized user input transcription
			if (
				serverContent.inputTranscription &&
				typeof serverContent.inputTranscription.text === "string"
			) {
				const text = serverContent.inputTranscription.text;
				return {
					isSetupComplete: false,
					turnComplete: isTurnComplete,
					transcript: {
						type: "final",
						text,
						timestampMs: Date.now(),
						raw: payload,
					},
				};
			}

			if (isTurnComplete) {
				return {
					isSetupComplete: false,
					turnComplete: true,
				};
			}
		}

		return null;
	} catch {
		return null;
	}
}

/**
 * Checks if a close code or error requires key rotation.
 */
export function isBidiKeyRotationError(
	codeOrError:
		| number
		| {
				code?: number | undefined;
				status?: string | undefined;
				message?: string | undefined;
		  },
): boolean {
	if (typeof codeOrError === "number") {
		return (
			codeOrError === 1008 ||
			codeOrError === 403 ||
			codeOrError === 429 ||
			codeOrError === 401
		);
	}

	const code = codeOrError.code;
	const status = (codeOrError.status || "").toUpperCase();
	const msg = (codeOrError.message || "").toLowerCase();

	if (code === 1008 || code === 403 || code === 429 || code === 401) {
		return true;
	}

	if (
		status === "UNAUTHENTICATED" ||
		status === "PERMISSION_DENIED" ||
		status === "RESOURCE_EXHAUSTED"
	) {
		return true;
	}

	return /quota|rate limit|unauthorized|forbidden|invalid api key|key not valid|permission denied/i.test(
		msg,
	);
}

/**
 * GeminiBidiBridge manages a resilient, live bidirectional connection to Google Gemini 3.5 Transcribe Live,
 * handling audio streaming, transcript dispatching, SOCKS5 proxy tunneling, and automatic key rotation.
 */
export class GeminiBidiBridge extends EventEmitter {
	private readonly options: GeminiBidiBridgeOptions;
	private currentKey: SpeechProviderKeyCandidate | null = null;
	private readonly triedFingerprints = new Set<string>();
	private ws: WebSocket | null = null;
	private isConnected = false;
	private isSetupDone = false;
	private isClosed = false;
	private reconnectAttempts = 0;
	private readonly maxRetries: number;
	private readonly streamer: BidiAudioStreamer;
	private fullFinalizedText = "";
	private currentInterimText = "";

	constructor(options: GeminiBidiBridgeOptions = {}) {
		super();
		this.options = {
			model:
				options.model ||
				process.env.GEMINI_BIDI_MODEL ||
				process.env.GEMINI_LIVE_STT_MODEL ||
				DEFAULT_GEMINI_BIDI_MODEL,
			endpoint:
				options.endpoint ||
				process.env.GEMINI_BIDI_WS_ENDPOINT ||
				process.env.GEMINI_LIVE_WS_ENDPOINT ||
				DEFAULT_GEMINI_BIDI_ENDPOINT,
			sampleRate: options.sampleRate || DEFAULT_SAMPLE_RATE,
			providerId: options.providerId || "google_speech",
			...options,
		};

		const provider = this.options.providerId || "google_speech";
		this.maxRetries =
			options.maxRetryAttempts ??
			Math.max(1, keyRetryLimit(provider) || 8);

		const maxBufferBytes =
			options.maxBufferSizeBytes ?? DEFAULT_MAX_BIDI_BUFFER_BYTES;
		this.streamer = new BidiAudioStreamer(maxBufferBytes);
	}

	public get activeKeyFingerprint(): string | null {
		return this.currentKey?.fingerprint ?? null;
	}

	public get ready(): boolean {
		return (
			this.isConnected &&
			this.isSetupDone &&
			this.ws?.readyState === WebSocket.OPEN
		);
	}

	public get accumulatedText(): string {
		return (
			this.fullFinalizedText +
			(this.currentInterimText ? ` ${this.currentInterimText}` : "")
		);
	}

	/**
	 * Establishes the WebSocket connection to Google Gemini.
	 */
	public async connect(): Promise<void> {
		if (this.isClosed) {
			throw new Error("Cannot connect a closed GeminiBidiBridge");
		}
		if (this.ready) {
			return;
		}

		await this.initiateSocketConnection();
	}

	private async initiateSocketConnection(): Promise<void> {
		const provider = this.options.providerId || "google_speech";

		let apiKey = this.options.apiKey;
		if (!apiKey) {
			const candidate = selectProviderKey(provider, this.triedFingerprints);
			if (!candidate) {
				const error = new Error(
					`[GeminiBidiBridge] No available API keys in key pool for provider "${provider}" (tried ${this.triedFingerprints.size} keys)`,
				);
				this.safeEmitError(error);
				throw error;
			}
			this.currentKey = candidate;
			apiKey = candidate.value;
		} else if (!this.currentKey) {
			this.currentKey = {
				value: apiKey,
				fingerprint: "manual_key",
				source: "options.apiKey",
				ordinal: 1,
			};
		}

		const endpointUrl = new URL(
			this.options.endpoint || DEFAULT_GEMINI_BIDI_ENDPOINT,
		);
		endpointUrl.searchParams.set("key", apiKey);

		// Resolve WebSocket agent via Network Shield (SOCKS5/HTTPS)
		const wsAgent = getNetworkShieldWsAgent(this.options.proxyUrl);

		const wsOptions: ClientOptions = {
			headers: {
				"User-Agent": "Dente-Clinic-BidiBridge/1.0",
			},
			...(wsAgent ? { agent: wsAgent } : {}),
		};

		return new Promise<void>((resolve, reject) => {
			let settled = false;

			try {
				if (this.options.wsFactory) {
					this.ws = this.options.wsFactory(
						endpointUrl.toString(),
						undefined,
						wsOptions,
					);
				} else {
					this.ws = new WebSocket(endpointUrl.toString(), wsOptions);
				}
			} catch (err) {
				settled = true;
				reject(err);
				return;
			}

			const socket = this.ws;

			socket.on("open", () => {
				this.isConnected = true;
				this.reconnectAttempts = 0;

				// Send Setup Frame immediately upon opening
				try {
					const setupPayload = buildBidiSetupFrame({
						model: this.options.model,
						specialty: this.options.specialty,
						customTerms: this.options.customTerms,
					});
					socket.send(JSON.stringify(setupPayload));
				} catch (sendErr) {
					if (!settled) {
						settled = true;
						reject(sendErr);
					}
					return;
				}

				if (!settled) {
					settled = true;
					resolve();
				}
			});

			socket.on("message", (data: Data) => {
				this.handleServerMessage(data);
			});

			socket.on("error", (error: Error) => {
				if (!settled) {
					settled = true;
					reject(error);
				}
				this.handleSocketError(error);
			});

			socket.on("close", (code: number, reasonBuffer: Buffer) => {
				const reason = reasonBuffer.toString("utf8");
				this.handleSocketClose(code, reason);
			});
		});
	}

	private handleServerMessage(data: Data): void {
		const parsed = parseBidiServerMessage(data);
		if (!parsed) {
			return;
		}

		if (parsed.isSetupComplete) {
			this.isSetupDone = true;
			this.emit("setup_complete");
			this.emit("ready");

			// Flush queued audio chunks if any
			this.flushQueuedAudio();
			return;
		}

		if (parsed.error) {
			const { code, message, status } = parsed.error;
			if (isBidiKeyRotationError({ code, message, status })) {
				this.rotateKeyAndReconnect(
					new Error(
						`Gemini Live Error ${code} (${status || "UNKNOWN"}): ${message}`,
					),
				);
				return;
			}
			this.safeEmitError(new Error(`[Gemini Live STT ${code}]: ${message}`));
			return;
		}

		if (parsed.transcript) {
			const transcriptEvent = parsed.transcript;

			if (transcriptEvent.type === "final") {
				if (transcriptEvent.text.trim()) {
					this.fullFinalizedText = this.fullFinalizedText
						? `${this.fullFinalizedText} ${transcriptEvent.text.trim()}`
						: transcriptEvent.text.trim();
				}
				this.currentInterimText = "";

				if (this.currentKey) {
					recordProviderKeySuccess(
						this.options.providerId || "google_speech",
						this.currentKey,
					);
				}
			} else if (transcriptEvent.type === "interim") {
				this.currentInterimText = transcriptEvent.text;
			}

			this.emit("transcript", transcriptEvent);
		}

		if (parsed.turnComplete) {
			this.emit("turn_complete", {
				finalText: this.fullFinalizedText,
				timestampMs: Date.now(),
			});
		}
	}

	private handleSocketError(error: Error): void {
		if (isBidiKeyRotationError({ message: error.message })) {
			this.rotateKeyAndReconnect(error);
			return;
		}
		this.safeEmitError(error);
	}

	private handleSocketClose(code: number, reason: string): void {
		this.isConnected = false;
		this.isSetupDone = false;

		if (this.isClosed) {
			this.emit("close", code, reason);
			return;
		}

		// Check if close code indicates key rejection (e.g. 1008 policy violation / auth)
		if (isBidiKeyRotationError(code)) {
			this.rotateKeyAndReconnect(
				new Error(
					`WebSocket closed with auth/quota rejection code ${code}: ${reason}`,
				),
			);
			return;
		}

		// Abnormal disconnect: attempt recovery
		if (code !== 1000 && this.reconnectAttempts < this.maxRetries) {
			this.reconnectAttempts += 1;
			this.emit("reconnecting", {
				attempt: this.reconnectAttempts,
				keyFingerprint: this.activeKeyFingerprint,
				reason: `Abnormal close ${code}: ${reason}`,
			});

			setTimeout(() => {
				if (!this.isClosed) {
					this.initiateSocketConnection().catch((reconnErr) => {
						this.safeEmitError(reconnErr);
					});
				}
			}, 1000);
			return;
		}

		this.emit("close", code, reason);
	}

	private rotateKeyAndReconnect(triggerError: Error): void {
		if (this.isClosed) return;

		const provider = this.options.providerId || "google_speech";
		const oldFingerprint = this.currentKey?.fingerprint;

		if (this.currentKey) {
			this.triedFingerprints.add(this.currentKey.fingerprint);
			recordProviderKeyFailure(provider, this.currentKey, triggerError);
		}

		if (this.options.apiKey) {
			// Manual static key — cannot rotate from pool
			this.safeEmitError(triggerError);
			return;
		}

		if (this.reconnectAttempts >= this.maxRetries) {
			this.safeEmitError(
				new Error(
					`[GeminiBidiBridge] Max key rotation retries (${this.maxRetries}) exceeded. Last error: ${triggerError.message}`,
				),
			);
			return;
		}

		this.reconnectAttempts += 1;
		this.currentKey = null;

		// Clean up existing socket
		if (this.ws) {
			try {
				this.ws.removeAllListeners();
				this.ws.close(1000, "Key Rotation");
			} catch {
				// cleanup
			}
			this.ws = null;
		}

		this.isConnected = false;
		this.isSetupDone = false;

		this.emit("reconnecting", {
			attempt: this.reconnectAttempts,
			keyFingerprint: oldFingerprint ?? "unknown",
			reason: triggerError.message,
		});

		// Small delay before reconnecting with fresh key
		setTimeout(() => {
			if (!this.isClosed) {
				this.initiateSocketConnection()
					.then(() => {
						this.emit("key_rotated", {
							oldFingerprint,
							newFingerprint: this.activeKeyFingerprint ?? "none",
						});
					})
					.catch((reconnErr) => {
						this.safeEmitError(reconnErr);
					});
			}
		}, 800);
	}

	private safeEmitError(error: Error): void {
		if (this.listenerCount("error") > 0) {
			this.emit("error", error);
		} else {
			console.error(
				"[GeminiBidiBridge] Unhandled bridge error event:",
				error.message,
			);
		}
	}

	public get queuedChunksCount(): number {
		return this.streamer.queuedChunksCount;
	}

	public get queuedBytes(): number {
		return this.streamer.queuedBytes;
	}

	private flushQueuedAudio(): void {
		if (!this.ready) return;
		this.streamer.flush((chunk) => {
			if (!this.ready) return false;
			this.sendAudioChunkDirect(chunk);
			return true;
		});
	}

	private sendAudioChunkDirect(chunk: Buffer): void {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			this.streamer.enqueue(chunk);
			return;
		}

		try {
			const mediaFrame = buildBidiMediaChunkFrame(
				chunk,
				this.options.sampleRate || DEFAULT_SAMPLE_RATE,
			);
			this.ws.send(JSON.stringify(mediaFrame), (err) => {
				if (err) {
					console.warn("[GeminiBidiBridge] ws.send error:", err.message);
				}
			});
		} catch (err) {
			console.warn("[GeminiBidiBridge] ws.send exception:", err);
			this.streamer.enqueue(chunk);
		}
	}

	/**
	 * Feeds raw audio data into the live transcription pipeline.
	 * Supports Buffer, Uint8Array, ArrayBuffer, or base64 PCM string.
	 * Enforces strict single-chunk and total queue memory ceilings (Anti-RAM-Hog law).
	 */
	public sendAudio(data: Buffer | Uint8Array | ArrayBuffer | string): void {
		if (this.isClosed) {
			throw new Error("Cannot send audio to a closed GeminiBidiBridge");
		}

		const buffer = this.streamer.validateAndConvertChunk(data);

		if (!this.ready) {
			this.streamer.enqueue(buffer);
			return;
		}

		this.sendAudioChunkDirect(buffer);
	}

	/**
	 * Informs the Gemini service that the current audio turn is complete.
	 */
	public endAudioStream(): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			try {
				this.ws.send(
					JSON.stringify({
						clientContent: {
							turnComplete: true,
						},
					}),
				);
			} catch {
				// ignore
			}
		}
	}

	/**
	 * Closes the bridge connection cleanly and frees all in-memory buffers.
	 */
	public close(code = 1000, reason = "Client Closed"): void {
		this.isClosed = true;
		this.streamer.clear();

		if (this.ws) {
			try {
				this.ws.close(code, reason);
			} catch {
				// ignore
			}
			this.ws = null;
		}

		this.isConnected = false;
		this.isSetupDone = false;
	}
}
