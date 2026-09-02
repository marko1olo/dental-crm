import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
	createGeminiLiveTranslateSession,
	GeminiLiveTranslateSession,
} from "./geminiLiveTranslate.js";
import { SpeechProviderRequestError } from "./keyPool.js";

class MockWebSocket extends EventEmitter {
	static OPEN = 1;
	static CONNECTING = 0;
	static CLOSING = 2;
	static CLOSED = 3;

	readyState = MockWebSocket.CONNECTING;
	url: string;
	sentMessages: string[] = [];

	constructor(url: string) {
		super();
		this.url = url;
		setTimeout(() => {
			this.readyState = MockWebSocket.OPEN;
			this.emit("open");
		}, 10);
	}

	send(data: string): void {
		this.sentMessages.push(data);
	}

	close(code = 1000, reason = ""): void {
		this.readyState = MockWebSocket.CLOSED;
		this.emit("close", code, Buffer.from(reason));
	}
}

describe("geminiLiveTranslate", () => {
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(() => {
		originalEnv = process.env;
		process.env = { ...originalEnv };
		delete process.env.GOOGLE_API_KEY;
		delete process.env.GOOGLE_API_KEYS;
		delete process.env.GEMINI_API_KEY;
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("throws when no API key is provided and keyPool has no keys", async () => {
		const session = createGeminiLiveTranslateSession({
			sourceLanguageCode: "ru",
			targetLanguageCode: "en",
			WebSocketClass: MockWebSocket,
		});

		await assert.rejects(
			async () => {
				await session.connect();
			},
			(err: unknown) => {
				assert.ok(err instanceof SpeechProviderRequestError);
				assert.strictEqual((err as SpeechProviderRequestError).statusCode, 503);
				return true;
			},
		);
	});

	it("connects, sends setup handshake, and processes translated audio and text", async () => {
		let readyCalled = false;
		const translatedTexts: string[] = [];
		const translatedAudios: Buffer[] = [];

		const session = new GeminiLiveTranslateSession({
			sourceLanguageCode: "ru",
			targetLanguageCode: "en",
			apiKey: "test-live-key",
			voiceName: "Puck",
			WebSocketClass: MockWebSocket,
			onReady: () => {
				readyCalled = true;
			},
			onTextTranslated: (text) => {
				translatedTexts.push(text);
			},
			onAudioTranslated: (buf) => {
				translatedAudios.push(buf);
			},
		});

		const connectPromise = session.connect();

		// Simulate server setupComplete response after WS opens
		await new Promise((r) => setTimeout(r, 25));
		const wsInstance = (session as any).ws as MockWebSocket;
		assert.ok(wsInstance);
		assert.strictEqual(wsInstance.sentMessages.length, 1);

		const setupMessage = JSON.parse(wsInstance.sentMessages[0] || "{}");
		assert.strictEqual(
			setupMessage.setup.model,
			"models/gemini-3.5-live-translate-preview",
		);
		assert.strictEqual(
			setupMessage.setup.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName,
			"Puck",
		);
		assert.ok(
			setupMessage.setup.systemInstruction.parts[0].text.includes("clinical interpreter"),
		);

		// Send server setupComplete
		wsInstance.emit(
			"message",
			Buffer.from(JSON.stringify({ setupComplete: {} })),
		);

		await connectPromise;
		assert.strictEqual(session.isConnected(), true);
		assert.strictEqual(session.isReady(), true);
		assert.strictEqual(readyCalled, true);

		// Send audio chunk from client
		const pcmChunk = Buffer.from([0, 1, 2, 3, 4]);
		session.sendAudioChunk(pcmChunk, "audio/pcm;rate=16000");

		assert.strictEqual(wsInstance.sentMessages.length, 2);
		const audioMsg = JSON.parse(wsInstance.sentMessages[1] || "{}");
		assert.strictEqual(
			audioMsg.realtimeInput.mediaChunks[0].mimeType,
			"audio/pcm;rate=16000",
		);
		assert.strictEqual(
			audioMsg.realtimeInput.mediaChunks[0].data,
			pcmChunk.toString("base64"),
		);

		// Simulate server streaming response
		const dummyAudioBase64 = Buffer.from("translated-pcm-data").toString("base64");
		wsInstance.emit(
			"message",
			Buffer.from(
				JSON.stringify({
					serverContent: {
						modelTurn: {
							parts: [
								{ text: "Tooth 36 has caries." },
								{
									inlineData: {
										mimeType: "audio/pcm;rate=24000",
										data: dummyAudioBase64,
									},
								},
							],
						},
						turnComplete: true,
					},
				}),
			),
		);

		assert.strictEqual(translatedTexts.length, 1);
		assert.strictEqual(translatedTexts[0], "Tooth 36 has caries.");
		assert.strictEqual(translatedAudios.length, 1);
		assert.strictEqual(
			translatedAudios[0]?.toString(),
			"translated-pcm-data",
		);

		session.close();
		assert.strictEqual(session.isConnected(), false);
	});
});
