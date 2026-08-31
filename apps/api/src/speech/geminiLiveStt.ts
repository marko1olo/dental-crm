import { EventEmitter } from "node:events";
import { Buffer } from "node:buffer";
import type { DentalSpecialty } from "@dental/shared";
import WebSocket, { type ClientOptions, type Data } from "ws";
import {
	buildGeminiLiveSystemInstruction,
} from "./dentalPrompt.js";
import {
	getProxyAgent,
	getWsProxyAgent,
	keyRetryLimit,
	recordProviderKeyFailure,
	recordProviderKeySuccess,
	selectProviderKey,
	type SpeechProviderKeyCandidate,
} from "./keyPool.js";

export const DEFAULT_GEMINI_LIVE_WS_ENDPOINT =
	"wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

export const DEFAULT_GEMINI_LIVE_MODEL = "models/gemini-3.5-transcribe-live";
export const DEFAULT_SAMPLE_RATE = 16000;
export const DEFAULT_VOICE_NAME = "Puck";
export const DEFAULT_MIME_TYPE = "audio/pcm;rate=16000";

export type GeminiLiveSetupFrame = {
	setup: {
		model: string;
		generationConfig: {
			responseModalities: string[];
			speechConfig?: {
				voiceConfig: {
					prebuiltVoiceConfig: {
						voiceName: string;
					};
				};
			};
		};
		systemInstruction: {
			parts: Array<{ text: string }>;
		};
	};
};

export type GeminiLiveMediaChunkFrame = {
	realtimeInput: {
		mediaChunks: Array<{
			mimeType: string;
			data: string;
		}>;
	};
};

export type GeminiLiveTranscriptEvent = {
	text: string;
	interim: boolean;
	finalized: boolean;
	isFinal: boolean;
	turnComplete: boolean;
	timestampMs: number;
	raw?: unknown;
};

export type GeminiLiveSessionConfig = {
	apiKey?: string | undefined;
	model?: string | undefined;
	endpoint?: string | undefined;
	specialty?: DentalSpecialty | null | undefined;
	customTerms?: string[] | undefined;
	sampleRate?: number | undefined;
	voiceName?: string | undefined;
	systemInstructionText?: string | undefined;
	maxRetryAttempts?: number | undefined;
	providerId?: ("google_speech" | "gemini_transcribe_live") | undefined;
	wsFactory?:
		| ((
				url: string,
				protocols?: string | string[],
				options?: ClientOptions,
		  ) => WebSocket)
		| undefined;
};

export function buildGeminiLiveSetupFrame(options?: {
	model?: string | undefined;
	voiceName?: string | undefined;
	specialty?: DentalSpecialty | null | undefined;
	customTerms?: string[] | undefined;
	systemInstructionText?: string | undefined;
}): GeminiLiveSetupFrame {
	const model =
		options?.model ||
		process.env.GEMINI_LIVE_STT_MODEL ||
		DEFAULT_GEMINI_LIVE_MODEL;
	const voiceName = options?.voiceName || DEFAULT_VOICE_NAME;
	const systemText =
		options?.systemInstructionText ||
		buildGeminiLiveSystemInstruction(
			options?.specialty,
			options?.customTerms,
		);

	return {
		setup: {
			model,
			generationConfig: {
				responseModalities: ["TEXT"],
				speechConfig: {
					voiceConfig: {
						prebuiltVoiceConfig: {
							voiceName,
						},
					},
				},
			},
			systemInstruction: {
				parts: [{ text: systemText }],
			},
		},
	};
}

export function buildGeminiLiveMediaChunkFrame(
	chunk: Buffer | Uint8Array,
	sampleRate = DEFAULT_SAMPLE_RATE,
): GeminiLiveMediaChunkFrame {
	const pcmBuffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
	return {
		realtimeInput: {
			mediaChunks: [
				{
					mimeType: `audio/pcm;rate=${sampleRate}`,
					data: pcmBuffer.toString("base64"),
				},
			],
		},
	};
}

export type GeminiLiveParsedServerMessage = {
	isSetupComplete: boolean;
	transcript?: GeminiLiveTranscriptEvent | undefined;
	error?:
		| {
				code: number;
				message: string;
				status?: string | undefined;
		  }
		| undefined;
	turnComplete?: boolean | undefined;
};

export function parseGeminiLiveServerMessage(
	data: Data | string,
): GeminiLiveParsedServerMessage | null {
	try {
		const rawStr =
			typeof data === "string"
				? data
				: Buffer.isBuffer(data)
					? data.toString("utf8")
					: Array.isArray(data)
						? Buffer.concat(data).toString("utf8")
						: Buffer.from(data).toString("utf8");

		if (!rawStr.trim()) return null;
		const payload = JSON.parse(rawStr);

		if (payload.setupComplete !== undefined) {
			return { isSetupComplete: true };
		}

		if (payload.error) {
			return {
				isSetupComplete: false,
				error: {
					code: Number(payload.error.code ?? 500),
					message: String(payload.error.message ?? "Unknown Gemini Live error"),
					status: payload.error.status ? String(payload.error.status) : undefined,
				},
			};
		}

		const serverContent = payload.serverContent;
		if (serverContent) {
			const isTurnComplete = Boolean(serverContent.turnComplete);

			// 1. Check interimInputTranscription (realtime interim user transcription token)
			if (
				serverContent.interimInputTranscription &&
				typeof serverContent.interimInputTranscription.text === "string"
			) {
				const text = serverContent.interimInputTranscription.text;
				return {
					isSetupComplete: false,
					turnComplete: isTurnComplete,
					transcript: {
						text,
						interim: true,
						finalized: false,
						isFinal: false,
						turnComplete: isTurnComplete,
						timestampMs: Date.now(),
						raw: payload,
					},
				};
			}

			// 2. Check inputTranscription (finalized user transcription token)
			if (
				serverContent.inputTranscription &&
				typeof serverContent.inputTranscription.text === "string"
			) {
				const text = serverContent.inputTranscription.text;
				return {
					isSetupComplete: false,
					turnComplete: isTurnComplete,
					transcript: {
						text,
						interim: false,
						finalized: true,
						isFinal: true,
						turnComplete: isTurnComplete,
						timestampMs: Date.now(),
						raw: payload,
					},
				};
			}

			if (isTurnComplete) {
				return {
					isSetupComplete: false,
					turnComplete: true,
					transcript: {
						text: "",
						interim: false,
						finalized: true,
						isFinal: true,
						turnComplete: true,
						timestampMs: Date.now(),
						raw: payload,
					},
				};
			}
		}

		return null;
	} catch {
		return null;
	}
}

export class GeminiLiveSession extends EventEmitter {
	private readonly config: GeminiLiveSessionConfig;
	private currentKey: SpeechProviderKeyCandidate | null = null;
	private readonly triedFingerprints = new Set<string>();
	private ws: WebSocket | null = null;
	private isConnected = false;
	private isSetupDone = false;
	private isClosed = false;
	private readonly audioBuffer: Buffer[] = [];
	private fullFinalizedText = "";
	private currentInterimText = "";
	private reconnectAttempts = 0;
	private readonly maxRetries: number;
	private finishDeferred: {
		resolve: (text: string) => void;
		reject: (err: Error) => void;
	} | null = null;
	private finishTimeoutTimer: NodeJS.Timeout | null = null;

	constructor(config: GeminiLiveSessionConfig = {}) {
		super();
		this.config = {
			model: process.env.GEMINI_LIVE_STT_MODEL || DEFAULT_GEMINI_LIVE_MODEL,
			endpoint:
				process.env.GEMINI_LIVE_WS_ENDPOINT || DEFAULT_GEMINI_LIVE_WS_ENDPOINT,
			sampleRate: DEFAULT_SAMPLE_RATE,
			voiceName: DEFAULT_VOICE_NAME,
			providerId: config.providerId || "google_speech",
			...config,
		};
		const provider = this.config.providerId || "google_speech";
		this.maxRetries =
			config.maxRetryAttempts ??
			Math.max(1, keyRetryLimit(provider) || 8);
	}

	public async connect(): Promise<void> {
		if (this.isClosed) {
			throw new Error("Cannot connect a closed GeminiLiveSession");
		}
		if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
			return;
		}

		await this.initiateConnection();
	}

	private async initiateConnection(): Promise<void> {
		const provider = this.config.providerId || "google_speech";

		let apiKey = this.config.apiKey;
		if (!apiKey) {
			const candidate = selectProviderKey(provider, this.triedFingerprints);
			if (!candidate) {
				const error = new Error(
					`No available API keys in key pool for provider "${provider}" (tried ${this.triedFingerprints.size} keys)`,
				);
				this.emit("error", error);
				throw error;
			}
			this.currentKey = candidate;
			apiKey = candidate.value;
		} else if (!this.currentKey) {
			this.currentKey = {
				value: apiKey,
				fingerprint: "manual_key",
				source: "config.apiKey",
				ordinal: 1,
			};
		}

		const endpointUrl = new URL(
			this.config.endpoint || DEFAULT_GEMINI_LIVE_WS_ENDPOINT,
		);
		endpointUrl.searchParams.set("key", apiKey);

		const wsAgent = getWsProxyAgent();
		const wsOptions: ClientOptions = {
			headers: {
				"User-Agent": "Dente-Clinic-LiveSTT/1.0",
			},
			...(wsAgent ? { agent: wsAgent } : {}),
		};

		return new Promise<void>((resolve, reject) => {
			let connectionSettled = false;

			try {
				const wsFactory = this.config.wsFactory || ((url, protocols, opts) => new WebSocket(url, protocols, opts));
				this.ws = wsFactory(endpointUrl.toString(), undefined, wsOptions);
			} catch (creationError) {
				const err = creationError instanceof Error ? creationError : new Error(String(creationError));
				this.handleSocketFailure(err);
				reject(err);
				return;
			}

			const onOpen = () => {
				this.isConnected = true;
				if (!connectionSettled) {
					connectionSettled = true;
					resolve();
				}
				this.sendSetupFrame();
			};

			const onMessage = (data: Data) => {
				this.handleMessage(data);
			};

			const onError = (err: Error) => {
				if (!connectionSettled) {
					connectionSettled = true;
					reject(err);
				}
				this.handleSocketFailure(err);
			};

			const onClose = (code: number, reasonBuffer: Buffer) => {
				const reason = reasonBuffer.toString("utf8");
				this.isConnected = false;
				this.isSetupDone = false;

				if (this.isClosed) {
					this.emit("close", code, reason);
					return;
				}

				if (
					code === 403 ||
					code === 429 ||
					code === 1006 ||
					code === 1008 ||
					code === 1011 ||
					code >= 4000
				) {
					const error = new Error(
						`Gemini Live WS closed abnormally (code: ${code}, reason: ${reason || "none"})`,
					);
					this.handleSocketFailure(error);
				} else {
					this.emit("close", code, reason);
				}
			};

			this.ws.on("open", onOpen);
			this.ws.on("message", onMessage);
			this.ws.on("error", onError);
			this.ws.on("close", onClose);
		});
	}

	private sendSetupFrame(): void {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

		const setupFrame = buildGeminiLiveSetupFrame({
			model: this.config.model,
			voiceName: this.config.voiceName,
			specialty: this.config.specialty,
			customTerms: this.config.customTerms,
			systemInstructionText: this.config.systemInstructionText,
		});

		this.ws.send(JSON.stringify(setupFrame));
	}

	private handleMessage(data: Data): void {
		const parsed = parseGeminiLiveServerMessage(data);
		if (!parsed) return;

		if (parsed.isSetupComplete) {
			this.isSetupDone = true;
			this.emit("setup_complete");
			this.flushBufferedAudio();
			return;
		}

		if (parsed.error) {
			const err = new Error(
				`Gemini Live API Error [${parsed.error.code}]: ${parsed.error.message}`,
			);
			const isQuotaOrAuth =
				parsed.error.code === 429 ||
				parsed.error.code === 403 ||
				parsed.error.code === 401 ||
				parsed.error.code === 1008 ||
				parsed.error.status === "RESOURCE_EXHAUSTED" ||
				parsed.error.status === "PERMISSION_DENIED" ||
				parsed.error.status === "UNAUTHENTICATED";

			if (isQuotaOrAuth) {
				this.handleSocketFailure(err);
			} else {
				this.emit("error", err);
			}
			return;
		}

		if (parsed.transcript) {
			const transcriptEvent = parsed.transcript;
			if (this.currentKey) {
				const provider = this.config.providerId || "google_speech";
				recordProviderKeySuccess(provider, this.currentKey);
			}

			if (transcriptEvent.finalized || transcriptEvent.isFinal || transcriptEvent.turnComplete) {
				if (transcriptEvent.text.trim()) {
					this.fullFinalizedText = this.fullFinalizedText
						? `${this.fullFinalizedText} ${transcriptEvent.text.trim()}`
						: transcriptEvent.text.trim();
				}
				this.currentInterimText = "";
				// Audio for finalized turn is fully processed — clear buffer to prevent replay/echo on reconnect
				this.audioBuffer.length = 0;
				this.emit("final_token", {
					text: transcriptEvent.text,
					isFinal: true,
					interim: false,
					finalized: true,
					fullTranscript: this.fullFinalizedText,
					timestampMs: transcriptEvent.timestampMs,
				});
			} else if (transcriptEvent.interim || !transcriptEvent.isFinal) {
				this.currentInterimText = transcriptEvent.text;
				this.emit("interim_token", {
					text: transcriptEvent.text,
					isFinal: false,
					interim: true,
					finalized: false,
					timestampMs: transcriptEvent.timestampMs,
				});
			}

			this.emit("transcript", transcriptEvent);

			if (this.finishDeferred && (transcriptEvent.turnComplete || transcriptEvent.finalized || transcriptEvent.isFinal)) {
				if (this.finishTimeoutTimer) {
					clearTimeout(this.finishTimeoutTimer);
					this.finishTimeoutTimer = null;
				}
				const full = this.getTranscript();
				this.finishDeferred.resolve(full);
				this.finishDeferred = null;
			}
		}
	}

	private handleSocketFailure(error: Error): void {
		if (this.isClosed) return;

		const provider = this.config.providerId || "google_speech";
		if (this.currentKey) {
			recordProviderKeyFailure(provider, this.currentKey, error);
			this.triedFingerprints.add(this.currentKey.fingerprint);
		}

		if (this.reconnectAttempts < this.maxRetries) {
			this.reconnectAttempts++;
			const nextKey = selectProviderKey(provider, this.triedFingerprints);
			if (nextKey) {
				this.currentKey = nextKey;
				this.emit("key_rotated", {
					fingerprint: nextKey.fingerprint,
					attempt: this.reconnectAttempts,
				});

				this.cleanupCurrentSocket();
				this.initiateConnection().catch((reconnErr) => {
					this.emit("error", reconnErr);
				});
				return;
			}
		}

		this.emit("error", error);
		if (this.finishDeferred) {
			this.finishDeferred.reject(error);
			this.finishDeferred = null;
		}
	}

	private cleanupCurrentSocket(): void {
		if (this.ws) {
			try {
				this.ws.removeAllListeners();
				this.ws.close();
			} catch {
				// ignore
			}
			this.ws = null;
		}
		this.isConnected = false;
		this.isSetupDone = false;
	}

	public sendAudioChunk(chunk: Buffer | Uint8Array): void {
		if (this.isClosed) {
			throw new Error("Cannot send audio chunk to closed GeminiLiveSession");
		}

		const pcmBuffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
		this.audioBuffer.push(pcmBuffer);
		if (this.audioBuffer.length > 300) {
			this.audioBuffer.shift();
		}

		if (this.isConnected && this.isSetupDone && this.ws?.readyState === WebSocket.OPEN) {
			const frame = buildGeminiLiveMediaChunkFrame(
				pcmBuffer,
				this.config.sampleRate ?? DEFAULT_SAMPLE_RATE,
			);
			this.ws.send(JSON.stringify(frame));
		}
	}

	private flushBufferedAudio(): void {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isSetupDone) return;
		while (this.audioBuffer.length > 0) {
			const chunk = this.audioBuffer.shift();
			if (!chunk) continue;
			const frame = buildGeminiLiveMediaChunkFrame(
				chunk,
				this.config.sampleRate ?? DEFAULT_SAMPLE_RATE,
			);
			this.ws.send(JSON.stringify(frame));
		}
	}

	public async finish(timeoutMs = 15000): Promise<string> {
		if (this.isClosed) {
			return this.getTranscript();
		}

		return new Promise<string>((resolve, reject) => {
			this.finishDeferred = { resolve, reject };

			this.finishTimeoutTimer = setTimeout(() => {
				if (this.finishDeferred) {
					const result = this.getTranscript();
					this.finishDeferred.resolve(result);
					this.finishDeferred = null;
				}
				this.close();
			}, timeoutMs);

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
			} else if (!this.isConnected) {
				resolve(this.getTranscript());
				this.finishDeferred = null;
				if (this.finishTimeoutTimer) {
					clearTimeout(this.finishTimeoutTimer);
					this.finishTimeoutTimer = null;
				}
			}
		});
	}

	public close(): void {
		if (this.isClosed) return;
		this.isClosed = true;
		this.audioBuffer.length = 0;
		if (this.finishTimeoutTimer) {
			clearTimeout(this.finishTimeoutTimer);
			this.finishTimeoutTimer = null;
		}
		this.cleanupCurrentSocket();
	}

	public getTranscript(): string {
		if (this.currentInterimText) {
			return this.fullFinalizedText
				? `${this.fullFinalizedText} ${this.currentInterimText}`.trim()
				: this.currentInterimText.trim();
		}
		return this.fullFinalizedText.trim();
	}

	public getFinalizedTranscript(): string {
		return this.fullFinalizedText.trim();
	}

	public isActive(): boolean {
		return !this.isClosed && this.isConnected && this.isSetupDone;
	}

	public getCurrentKeyFingerprint(): string | null {
		return this.currentKey?.fingerprint ?? null;
	}
}

export async function transcribeWithGeminiLiveStt(input: {
	audio: Buffer;
	mimeType?: string;
	specialty?: DentalSpecialty | null;
	language?: string;
	sampleRate?: number;
	config?: GeminiLiveSessionConfig;
}): Promise<{
	text: string;
	confidence: number | null;
	warnings: string[];
}> {
	const session = new GeminiLiveSession({
		specialty: input.specialty,
		sampleRate: input.sampleRate ?? DEFAULT_SAMPLE_RATE,
		...input.config,
	});

	await session.connect();

	// Chunk audio into ~160ms slices (5120 bytes for 16kHz 16-bit mono = 32000 bytes/sec)
	const chunkSize = 5120;
	for (let offset = 0; offset < input.audio.length; offset += chunkSize) {
		const chunk = input.audio.subarray(
			offset,
			Math.min(offset + chunkSize, input.audio.length),
		);
		session.sendAudioChunk(chunk);
	}

	const text = await session.finish();
	session.close();

	return {
		text: text.trim(),
		confidence: null,
		warnings: [],
	};
}
