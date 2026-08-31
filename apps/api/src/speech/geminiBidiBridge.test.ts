import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { Buffer } from "node:buffer";
import WebSocket, { type ClientOptions } from "ws";
import {
	buildBidiMediaChunkFrame,
	buildBidiSetupFrame,
	buildDentalBidiSystemInstruction,
	DEFAULT_GEMINI_BIDI_MODEL,
	DEFAULT_GEMINI_BIDI_ENDPOINT,
	GeminiBidiBridge,
	isBidiKeyRotationError,
	MANDATORY_DENTAL_BIDI_TERMS,
	parseBidiServerMessage,
} from "./geminiBidiBridge.js";
import {
	getProviderKeyPoolSummary,
	recordProviderKeyFailure,
	recordProviderKeySuccess,
	selectProviderKey,
} from "./keyPool.js";

// Mock WebSocket class for controlled testing
class MockBridgeWebSocket extends EventEmitter {
	static readonly CONNECTING = 0;
	static readonly OPEN = 1;
	static readonly CLOSING = 2;
	static readonly CLOSED = 3;

	public readyState: number = MockBridgeWebSocket.CONNECTING;
	public sentMessages: string[] = [];
	public url: string;
	public options?: ClientOptions;

	constructor(url: string, options?: ClientOptions) {
		super();
		this.url = url;
		this.options = options;

		process.nextTick(() => {
			if (this.readyState === MockBridgeWebSocket.CONNECTING) {
				this.readyState = MockBridgeWebSocket.OPEN;
				this.emit("open");
			}
		});
	}

	public send(data: string | Buffer): void {
		if (this.readyState !== MockBridgeWebSocket.OPEN) {
			throw new Error("WebSocket is not open");
		}
		const str = typeof data === "string" ? data : data.toString("utf8");
		this.sentMessages.push(str);
	}

	public close(code = 1000, reason = "Normal Closure"): void {
		this.readyState = MockBridgeWebSocket.CLOSED;
		this.emit("close", code, Buffer.from(reason));
	}

	public simulateServerPayload(payload: object | string): void {
		const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
		this.emit("message", Buffer.from(raw, "utf8"));
	}

	public simulateError(err: Error): void {
		this.emit("error", err);
	}
}

describe("GeminiBidiBridge & Dental STT Protocol", () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe("Setup Frame & Dental Vocabulary Biasing", () => {
		it("generates correct setup frame with responseModalities: ['TEXT']", () => {
			const frame = buildBidiSetupFrame();
			assert.equal(frame.setup.model, DEFAULT_GEMINI_BIDI_MODEL);
			assert.deepEqual(frame.setup.generationConfig.responseModalities, ["TEXT"]);
			assert.ok(frame.setup.systemInstruction.parts.length > 0);
		});

		it("embeds all required dental terms in system instruction", () => {
			const instruction = buildDentalBidiSystemInstruction("universal");

			const requiredKeywords = [
				"ФДИ 11-48",
				"51-85",
				"апекслокатор",
				"коффердам",
				"пульпит",
				"периодонтит",
				"ЭДТА",
				"гипохлорит натрия",
				"ультракаин",
				"скандонест",
				"E.max",
				"ZrO2",
				"СанПиН 3.3686-21",
			];

			for (const term of requiredKeywords) {
				assert.ok(
					instruction.includes(term),
					`Expected dental instruction to include mandatory term "${term}"`,
				);
			}
		});

		it("embeds anti-hallucination guardrail text in system instruction", () => {
			const instruction = buildDentalBidiSystemInstruction("universal");

			assert.ok(
				instruction.includes("Ты медицинский стенографист клиники DENTE (ассистент ДЕНТА). Выполняй точную транскрипцию речи врача."),
			);
			assert.ok(
				instruction.includes("КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО выдумывать, достраивать или дополнять текст фразами, которых не было в аудио."),
			);
			assert.ok(
				instruction.includes("Если в аудио тишина, шум или неразборчивая речь — не генерируй никаких шаблонных медицинских фраз."),
			);
			assert.ok(
				instruction.includes("Транскрибируй строго и буквально только то, что физически произнес врач."),
			);
		});
	});

	describe("Media Chunk Builder", () => {
		it("converts audio PCM buffer into realtimeInput media chunk with 16kHz rate", () => {
			const rawPcm = Buffer.from([0x00, 0x01, 0x02, 0x03]);
			const chunkFrame = buildBidiMediaChunkFrame(rawPcm, 16000);

			assert.ok(chunkFrame.realtimeInput);
			assert.equal(chunkFrame.realtimeInput.mediaChunks.length, 1);
			const firstChunk = chunkFrame.realtimeInput.mediaChunks[0];
			assert.ok(firstChunk);
			assert.equal(
				firstChunk.mimeType,
				"audio/pcm;rate=16000",
			);
			assert.equal(
				firstChunk.data,
				rawPcm.toString("base64"),
			);
		});
	});

	describe("Google Response Parsing Invariants", () => {
		it("parses interimInputTranscription into { type: 'interim', text: ... }", () => {
			const googleMessage = {
				serverContent: {
					interimInputTranscription: {
						text: "Пациент жалуется на боль в области зуба 36",
					},
				},
			};

			const parsed = parseBidiServerMessage(JSON.stringify(googleMessage));
			assert.ok(parsed);
			assert.equal(parsed.isSetupComplete, false);
			assert.ok(parsed.transcript);
			assert.equal(parsed.transcript.type, "interim");
			assert.equal(
				parsed.transcript.text,
				"Пациент жалуется на боль в области зуба 36",
			);
		});

		it("parses inputTranscription into { type: 'final', text: ... }", () => {
			const googleMessage = {
				serverContent: {
					inputTranscription: {
						text: "Диагноз: К04.0 Пульпит зуба 36. Проведено препарирование.",
					},
					turnComplete: true,
				},
			};

			const parsed = parseBidiServerMessage(JSON.stringify(googleMessage));
			assert.ok(parsed);
			assert.ok(parsed.transcript);
			assert.equal(parsed.transcript.type, "final");
			assert.equal(
				parsed.transcript.text,
				"Диагноз: К04.0 Пульпит зуба 36. Проведено препарирование.",
			);
			assert.equal(parsed.turnComplete, true);
		});

		it("strictly ignores modelTurn.parts for live STT transcription", () => {
			const chatPayload = {
				serverContent: {
					modelTurn: {
						parts: [{ text: "I am an AI assistant responding to text." }],
					},
				},
			};

			const parsed = parseBidiServerMessage(JSON.stringify(chatPayload));
			assert.equal(parsed, null, "Should return null for non-transcription modelTurn");
		});

		it("identifies key rotation errors correctly", () => {
			assert.equal(isBidiKeyRotationError(1008), true);
			assert.equal(isBidiKeyRotationError(403), true);
			assert.equal(isBidiKeyRotationError(429), true);
			assert.equal(isBidiKeyRotationError(1000), false);
			assert.equal(
				isBidiKeyRotationError({
					code: 403,
					status: "PERMISSION_DENIED",
					message: "API key expired",
				}),
				true,
			);
			assert.equal(
				isBidiKeyRotationError({
					code: 429,
					status: "RESOURCE_EXHAUSTED",
					message: "Quota exceeded",
				}),
				true,
			);
		});
	});

	describe("GeminiBidiBridge Connection & Live Streaming Lifecycle", () => {
		it("connects, sends setup frame, and emits events when server responds", async () => {
			let createdWs: MockBridgeWebSocket | null = null;

			const bridge = new GeminiBidiBridge({
				apiKey: "mock_bidi_test_key",
				wsFactory: (url, _protocols, options) => {
					createdWs = new MockBridgeWebSocket(url, options);
					return createdWs as unknown as WebSocket;
				},
			});

			const transcriptEvents: Array<{ type: string; text: string }> = [];
			let setupDone = false;

			bridge.on("setup_complete", () => {
				setupDone = true;
			});

			bridge.on("transcript", (evt) => {
				transcriptEvents.push({ type: evt.type, text: evt.text });
			});

			await bridge.connect();
			assert.ok(createdWs !== null);

			// Verify setup frame was sent
			assert.equal((createdWs as MockBridgeWebSocket).sentMessages.length, 1);
			const firstSent = (createdWs as MockBridgeWebSocket).sentMessages[0];
			assert.ok(firstSent);
			const setupMsg = JSON.parse(firstSent);
			assert.ok(setupMsg.setup);
			assert.deepEqual(setupMsg.setup.generationConfig.responseModalities, ["TEXT"]);

			// Simulate setupComplete from Google
			(createdWs as MockBridgeWebSocket).simulateServerPayload({ setupComplete: {} });
			assert.equal(setupDone, true);
			assert.equal(bridge.ready, true);

			// Send audio chunk
			bridge.sendAudio(Buffer.from([1, 2, 3, 4]));
			assert.equal((createdWs as MockBridgeWebSocket).sentMessages.length, 2);

			// Simulate Interim transcription
			(createdWs as MockBridgeWebSocket).simulateServerPayload({
				serverContent: {
					interimInputTranscription: { text: "Зуб 46" },
				},
			});

			// Simulate Final transcription
			(createdWs as MockBridgeWebSocket).simulateServerPayload({
				serverContent: {
					inputTranscription: { text: "Зуб 46 периодонтит, ЭДТА, апекслокатор." },
				},
			});

			assert.equal(transcriptEvents.length, 2);
			assert.deepEqual(transcriptEvents[0], { type: "interim", text: "Зуб 46" });
			assert.deepEqual(transcriptEvents[1], {
				type: "final",
				text: "Зуб 46 периодонтит, ЭДТА, апекслокатор.",
			});
			assert.equal(
				bridge.accumulatedText,
				"Зуб 46 периодонтит, ЭДТА, апекслокатор.",
			);

			bridge.close();
		});
	});
});
