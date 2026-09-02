import { Buffer } from "node:buffer";
import WebSocket, { type ClientOptions } from "ws";
import {
	getWsProxyAgent,
	recordProviderKeyFailure,
	recordProviderKeySuccess,
	selectProviderKey,
	SpeechProviderRequestError,
} from "./keyPool.js";

export interface GeminiLiveTranslateOptions {
	sourceLanguageCode: string;
	targetLanguageCode: string;
	echoTargetLanguage?: boolean | undefined;
	voiceName?: string | undefined;
	model?: string | undefined;
	apiKey?: string | undefined;
	wsEndpoint?: string | undefined;
	customSystemInstruction?: string | undefined;
	onTextTranslated?: ((text: string, isFinal: boolean) => void) | undefined;
	onAudioTranslated?: ((audioBuffer: Buffer, mimeType: string) => void) | undefined;
	onError?: ((error: Error) => void) | undefined;
	onClose?: ((code: number, reason: string) => void) | undefined;
	onReady?: (() => void) | undefined;
	// Dependency injection for testing/mocking
	// biome-ignore lint/suspicious/noExplicitAny: generic WebSocket constructor type
	WebSocketClass?: any;
}

export interface GeminiLiveTranslateSessionState {
	connected: boolean;
	ready: boolean;
	sessionId: string;
	model: string;
	sourceLanguage: string;
	targetLanguage: string;
	voiceName: string;
	keyFingerprint?: string | undefined;
}

export function getGeminiLiveTranslateModel(): string {
	return (
		process.env.GEMINI_LIVE_TRANSLATE_MODEL?.trim() ||
		process.env.GOOGLE_LIVE_TRANSLATE_MODEL?.trim() ||
		"models/gemini-3.5-live-translate-preview"
	);
}

export class GeminiLiveTranslateSession {
	private ws: WebSocket | null = null;
	private options: GeminiLiveTranslateOptions;
	private isConnectedState = false;
	private isReadyState = false;
	private sessionId: string;
	private model: string;
	private keyFingerprint?: string | undefined;
	private activeApiKey?: string | undefined;

	constructor(options: GeminiLiveTranslateOptions) {
		this.options = {
			echoTargetLanguage: true,
			voiceName: "Aoede",
			...options,
		};
		this.model = options.model || getGeminiLiveTranslateModel();
		this.sessionId = `live-translate-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
	}

	getState(): GeminiLiveTranslateSessionState {
		return {
			connected: this.isConnectedState,
			ready: this.isReadyState,
			sessionId: this.sessionId,
			model: this.model,
			sourceLanguage: this.options.sourceLanguageCode,
			targetLanguage: this.options.targetLanguageCode,
			voiceName: this.options.voiceName || "Aoede",
			...(this.keyFingerprint ? { keyFingerprint: this.keyFingerprint } : {}),
		};
	}

	isConnected(): boolean {
		return this.isConnectedState;
	}

	isReady(): boolean {
		return this.isReadyState;
	}

	getSessionId(): string {
		return this.sessionId;
	}

	async connect(): Promise<void> {
		if (this.ws && this.isConnectedState) {
			return;
		}

		let apiKey = this.options.apiKey?.trim();
		if (!apiKey) {
			const candidate = selectProviderKey("google_speech");
			if (!candidate) {
				throw new SpeechProviderRequestError(
					"Google Speech API key is not configured or available for Live Translate.",
					{ statusCode: 503, retryable: true },
				);
			}
			apiKey = candidate.value;
			this.keyFingerprint = candidate.fingerprint;
			this.activeApiKey = apiKey;
		}

		const defaultWsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(apiKey)}`;
		const wsUrl = this.options.wsEndpoint || defaultWsUrl;

		const wsAgent = getWsProxyAgent();
		const wsOptions: ClientOptions = {
			headers: {
				"User-Agent": "Dente-Clinic-LiveTranslate/1.0",
			},
			...(wsAgent ? { agent: wsAgent } : {}),
		};

		const WSImpl = this.options.WebSocketClass || WebSocket;

		return new Promise<void>((resolve, reject) => {
			let isResolved = false;

			try {
				this.ws = new WSImpl(wsUrl, wsOptions) as WebSocket;
			} catch (err) {
				const error =
					err instanceof Error
						? err
						: new Error("Failed to initialize WebSocket client");
				this.notifyError(error);
				reject(error);
				return;
			}

			const connectTimeout = setTimeout(() => {
				if (!isResolved) {
					isResolved = true;
					const timeoutErr = new SpeechProviderRequestError(
						"Gemini Live Translate WebSocket connection timed out.",
						{ timedOut: true, retryable: true },
					);
					this.close(1006, "Connection timeout");
					reject(timeoutErr);
				}
			}, 30_000);

			this.ws.on("open", () => {
				this.isConnectedState = true;
				this.sendSetupHandshake();
			});

			this.ws.on("message", (data: WebSocket.RawData) => {
				try {
					const text = data.toString("utf8");
					const message = JSON.parse(text) as Record<string, unknown>;

					// Handle setup confirmation or ready state
					if (message.setupComplete || message.serverContent) {
						if (!this.isReadyState) {
							this.isReadyState = true;
							if (this.keyFingerprint && this.activeApiKey) {
								recordProviderKeySuccess("google_speech", {
									value: this.activeApiKey,
									fingerprint: this.keyFingerprint,
									source: "LIVE_TRANSLATE",
									ordinal: 1,
								});
							}
							if (this.options.onReady) {
								this.options.onReady();
							}
							if (!isResolved) {
								isResolved = true;
								clearTimeout(connectTimeout);
								resolve();
							}
						}
					}

					this.handleServerMessage(message);
				} catch (err) {
					console.error("[GeminiLiveTranslate] Error parsing server message:", err);
				}
			});

			this.ws.on("error", (err: Error) => {
				this.notifyError(err);
				if (!isResolved) {
					isResolved = true;
					clearTimeout(connectTimeout);
					reject(err);
				}
			});

			this.ws.on("close", (code: number, reason: Buffer) => {
				this.isConnectedState = false;
				this.isReadyState = false;
				const reasonStr = reason ? reason.toString("utf8") : "";
				if (this.options.onClose) {
					this.options.onClose(code, reasonStr);
				}
				if (!isResolved) {
					isResolved = true;
					clearTimeout(connectTimeout);
					reject(
						new SpeechProviderRequestError(
							`Gemini Live Translate closed before ready: ${code} ${reasonStr}`,
							{ statusCode: code, retryable: true },
						),
					);
				}
			});
		});
	}

	private sendSetupHandshake(): void {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

		const srcLang = this.options.sourceLanguageCode;
		const tgtLang = this.options.targetLanguageCode;
		const voiceName = this.options.voiceName || "Aoede";

		const defaultSystemInstruction = [
			`You are a professional real-time clinical interpreter in a dental medical tourism clinic.`,
			`Directly interpret spoken audio from source language '${srcLang}' into target language '${tgtLang}'.`,
			`Accurately translate clinical dental terminology (teeth FDI numbers 11-48, anesthesia, restorations, pain levels, instructions).`,
			`Do not add conversational commentary. Speak only the accurate translation.`,
		].join(" ");

		const systemInstructionText =
			this.options.customSystemInstruction?.trim() || defaultSystemInstruction;

		const setupPayload = {
			setup: {
				model: this.model,
				generationConfig: {
					responseModalities: ["AUDIO", "TEXT"],
					speechConfig: {
						voiceConfig: {
							prebuiltVoiceConfig: {
								voiceName,
							},
						},
					},
				},
				systemInstruction: {
					parts: [
						{
							text: systemInstructionText,
						},
					],
				},
			},
		};

		this.ws.send(JSON.stringify(setupPayload));
	}

	sendAudioChunk(
		chunk: Buffer | Uint8Array | string,
		mimeType = "audio/pcm;rate=16000",
	): void {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			throw new Error("Cannot send audio chunk: WebSocket is not open.");
		}

		const base64Data =
			typeof chunk === "string"
				? chunk
				: Buffer.isBuffer(chunk)
					? chunk.toString("base64")
					: Buffer.from(chunk).toString("base64");

		const payload = {
			realtimeInput: {
				mediaChunks: [
					{
						mimeType,
						data: base64Data,
					},
				],
			},
		};

		this.ws.send(JSON.stringify(payload));
	}

	sendText(text: string): void {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			throw new Error("Cannot send text: WebSocket is not open.");
		}

		const payload = {
			clientContent: {
				turns: [
					{
						role: "user",
						parts: [{ text: text.trim() }],
					},
				],
				turnComplete: true,
			},
		};

		this.ws.send(JSON.stringify(payload));
	}

	private handleServerMessage(message: Record<string, unknown>): void {
		const serverContent = message.serverContent as
			| Record<string, unknown>
			| undefined;
		if (!serverContent) return;

		const modelTurn = serverContent.modelTurn as
			| Record<string, unknown>
			| undefined;
		const isTurnComplete = Boolean(serverContent.turnComplete);

		if (modelTurn && Array.isArray(modelTurn.parts)) {
			for (const part of modelTurn.parts) {
				if (typeof part.text === "string" && part.text.length > 0) {
					if (this.options.onTextTranslated) {
						this.options.onTextTranslated(part.text, isTurnComplete);
					}
				}

				if (part.inlineData && typeof part.inlineData.data === "string") {
					const audioBuf = Buffer.from(part.inlineData.data, "base64");
					const mime = part.inlineData.mimeType || "audio/pcm;rate=24000";
					if (this.options.onAudioTranslated) {
						this.options.onAudioTranslated(audioBuf, mime);
					}
				}
			}
		}
	}

	private notifyError(error: Error): void {
		if (this.keyFingerprint && this.activeApiKey) {
			recordProviderKeyFailure(
				"google_speech",
				{
					value: this.activeApiKey,
					fingerprint: this.keyFingerprint,
					source: "LIVE_TRANSLATE",
					ordinal: 1,
				},
				error,
			);
		}
		if (this.options.onError) {
			this.options.onError(error);
		}
	}

	close(code = 1000, reason = "Normal Closure"): void {
		if (this.ws) {
			try {
				if (
					this.ws.readyState === WebSocket.OPEN ||
					this.ws.readyState === WebSocket.CONNECTING
				) {
					this.ws.close(code, reason);
				}
			} catch {
				// Ignore close error
			}
			this.ws = null;
		}
		this.isConnectedState = false;
		this.isReadyState = false;
	}
}

export function createGeminiLiveTranslateSession(
	options: GeminiLiveTranslateOptions,
): GeminiLiveTranslateSession {
	return new GeminiLiveTranslateSession(options);
}
