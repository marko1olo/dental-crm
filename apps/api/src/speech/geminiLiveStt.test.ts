import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { Buffer } from "node:buffer";
import WebSocket from "ws";
import {
	buildGeminiLiveSetupFrame,
	buildGeminiLiveMediaChunkFrame,
	parseGeminiLiveServerMessage,
	GeminiLiveSession,
	DEFAULT_GEMINI_LIVE_MODEL,
	DEFAULT_GEMINI_LIVE_WS_ENDPOINT,
	transcribeWithGeminiLiveStt,
} from "./geminiLiveStt.js";
import {
	buildGeminiLiveSystemInstruction,
	getDentalSpeechBiasingTerms,
} from "./dentalPrompt.js";
import {
	getProviderKeyHealthSnapshots,
	getProviderKeyPoolSummary,
	recordProviderKeyFailure,
	recordProviderKeySuccess,
	selectProviderKey,
} from "./keyPool.js";

// Mock WebSocket implementation for controlled unit testing
class MockWebSocket extends EventEmitter {
	static readonly CONNECTING = 0;
	static readonly OPEN = 1;
	static readonly CLOSING = 2;
	static readonly CLOSED = 3;

	public readyState: number = MockWebSocket.CONNECTING;
	public sentMessages: string[] = [];
	public url: string;

	constructor(url: string) {
		super();
		this.url = url;
		// Auto-open on next tick
		process.nextTick(() => {
			if (this.readyState === MockWebSocket.CONNECTING) {
				this.readyState = MockWebSocket.OPEN;
				this.emit("open");
			}
		});
	}

	public send(data: string): void {
		if (this.readyState !== MockWebSocket.OPEN) {
			throw new Error("WebSocket is not open");
		}
		this.sentMessages.push(data);
		try {
			const parsed = JSON.parse(data);
			if (parsed.clientContent?.turnComplete) {
				process.nextTick(() => {
					this.simulateServerMessage({
						serverContent: {
							inputTranscription: {
								text: "Акт выполненных работ: анестезия, пломбирование канала.",
							},
							turnComplete: true,
						},
					});
				});
			}
		} catch {
			// ignore
		}
	}

	public close(code = 1000, reason = "Normal Closure"): void {
		this.readyState = MockWebSocket.CLOSED;
		this.emit("close", code, Buffer.from(reason));
	}

	public simulateServerMessage(payload: object | string): void {
		const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
		this.emit("message", Buffer.from(raw, "utf8"));
	}

	public simulateError(error: Error): void {
		this.emit("error", error);
	}

	public simulateAbnormalClose(code = 1006, reason = "Abnormal Disconnect"): void {
		this.readyState = MockWebSocket.CLOSED;
		this.emit("close", code, Buffer.from(reason));
	}
}

describe("Gemini 3.5 Transcribe Live WebSocket Engine", () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		process.env.GOOGLE_API_KEY = "test-google-key-alpha-111111111111";
		process.env.GOOGLE_API_KEYS =
			"test-key-primary-111111111111,test-key-secondary-222222222222,test-key-tertiary-333333333333";
		delete process.env.GEMINI_LIVE_STT_MODEL;
		delete process.env.GEMINI_LIVE_WS_ENDPOINT;
	});

	afterEach(() => {
		for (const key of Object.keys(process.env)) {
			if (!(key in originalEnv)) {
				delete process.env[key];
			}
		}
		Object.assign(process.env, originalEnv);
	});

	describe("1. Speech Biasing & Setup Frame Generation", () => {
		it("should extract mandatory dental Speech Biasing terms", () => {
			const terms = getDentalSpeechBiasingTerms("therapist");
			const expectedMandatory = [
				"ФДИ",
				"11-48",
				"51-85",
				"эндодонтия",
				"коффердам",
				"виниры",
				"E.max",
				"апекслокатор",
				"кюретаж",
				"резцовое перекрытие",
				"силер",
				"гуттаперча",
				"трихлоруксусная",
				"мепивакаин",
				"артикаин",
				"септонест",
				"убистезин",
				"СанПиН 3.3686-21",
			];

			for (const term of expectedMandatory) {
				assert.ok(
					terms.includes(term),
					`Expected dental biasing list to contain "${term}"`,
				);
			}
		});

		it("should construct valid system instruction with stenographer prompt and biasing terms", () => {
			const instruction = buildGeminiLiveSystemInstruction("universal");
			assert.ok(instruction.includes("Ты медицинский стенографист клиники DENTE (ассистент ДЕНТА). Выполняй точную транскрипцию речи врача."));
			assert.ok(instruction.includes("КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО выдумывать, достраивать или дополнять текст"));
			assert.ok(instruction.includes("ФДИ"));
			assert.ok(instruction.includes("СанПиН 3.3686-21"));
		});

		it("should construct valid Bidi setup frame compliant with Google Live API", () => {
			const frame = buildGeminiLiveSetupFrame({
				specialty: "therapist",
				customTerms: ["Клиновидный дефект", "OptiBond FL"],
			});

			assert.equal(frame.setup.model, DEFAULT_GEMINI_LIVE_MODEL);
			assert.deepEqual(frame.setup.generationConfig.responseModalities, ["TEXT"]);
			assert.equal(
				frame.setup.generationConfig.speechConfig?.voiceConfig.prebuiltVoiceConfig.voiceName,
				"Puck",
			);
			assert.ok(frame.setup.systemInstruction.parts.length > 0);
			const promptText = frame.setup.systemInstruction.parts[0]?.text ?? "";
			assert.ok(promptText.includes("DENTE"));
			assert.ok(promptText.includes("OptiBond FL"));
		});

		it("should allow overriding model and voiceName in setup frame", () => {
			const frame = buildGeminiLiveSetupFrame({
				model: "models/gemini-2.5-flash-native",
				voiceName: "Aoede",
				systemInstructionText: "Custom prompt",
			});

			assert.equal(frame.setup.model, "models/gemini-2.5-flash-native");
			assert.equal(
				frame.setup.generationConfig.speechConfig?.voiceConfig.prebuiltVoiceConfig.voiceName,
				"Aoede",
			);
			assert.equal(frame.setup.systemInstruction.parts[0]?.text, "Custom prompt");
		});
	});

	describe("2. Audio Media Chunk Frame Generation", () => {
		it("should wrap PCM bytes in realtimeInput mediaChunks frame with base64 encoding", () => {
			const rawBytes = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe]);
			const frame = buildGeminiLiveMediaChunkFrame(rawBytes, 16000);

			assert.equal(frame.realtimeInput.mediaChunks.length, 1);
			assert.equal(frame.realtimeInput.mediaChunks[0]?.mimeType, "audio/pcm;rate=16000");
			assert.equal(
				frame.realtimeInput.mediaChunks[0]?.data,
				rawBytes.toString("base64"),
			);
		});

		it("should support custom sample rates like 24000Hz", () => {
			const rawBytes = Buffer.alloc(1024, 0x5a);
			const frame = buildGeminiLiveMediaChunkFrame(rawBytes, 24000);

			assert.equal(frame.realtimeInput.mediaChunks[0]?.mimeType, "audio/pcm;rate=24000");
			assert.equal(
				frame.realtimeInput.mediaChunks[0]?.data,
				rawBytes.toString("base64"),
			);
		});
	});

	describe("3. Server Message Parsing (Interim vs Finalized)", () => {
		it("should use v1beta Bidi WebSocket endpoint by default", () => {
			assert.ok(
				DEFAULT_GEMINI_LIVE_WS_ENDPOINT.includes("v1beta"),
				`Expected endpoint to use v1beta, got: ${DEFAULT_GEMINI_LIVE_WS_ENDPOINT}`,
			);
		});

		it("should parse setupComplete message", () => {
			const parsed = parseGeminiLiveServerMessage(JSON.stringify({ setupComplete: {} }));
			assert.ok(parsed);
			assert.equal(parsed?.isSetupComplete, true);
		});

		it("should parse serverContent.interimInputTranscription as interim token with isFinal: false", () => {
			const payload = {
				serverContent: {
					interimInputTranscription: { text: "Кариес тридцать шестого" },
					turnComplete: false,
				},
			};

			const parsed = parseGeminiLiveServerMessage(JSON.stringify(payload));
			assert.ok(parsed);
			assert.equal(parsed?.isSetupComplete, false);
			assert.ok(parsed?.transcript);
			assert.equal(parsed?.transcript?.text, "Кариес тридцать шестого");
			assert.equal(parsed?.transcript?.interim, true);
			assert.equal(parsed?.transcript?.finalized, false);
			assert.equal(parsed?.transcript?.isFinal, false);
		});

		it("should parse serverContent.inputTranscription as final token with isFinal: true", () => {
			const payload = {
				serverContent: {
					inputTranscription: { text: "Кариес 36 зуба, дистальная поверхность." },
					turnComplete: true,
				},
			};

			const parsed = parseGeminiLiveServerMessage(JSON.stringify(payload));
			assert.ok(parsed);
			assert.ok(parsed?.transcript);
			assert.equal(parsed?.transcript?.text, "Кариес 36 зуба, дистальная поверхность.");
			assert.equal(parsed?.transcript?.interim, false);
			assert.equal(parsed?.transcript?.finalized, true);
			assert.equal(parsed?.transcript?.isFinal, true);
			assert.equal(parsed?.transcript?.turnComplete, true);
		});

		it("should parse interim transcript from interimInputTranscription", () => {
			const payload = {
				serverContent: {
					interimInputTranscription: {
						text: "Зуб тридцать шесть",
					},
					interim: true,
				},
			};

			const parsed = parseGeminiLiveServerMessage(JSON.stringify(payload));
			assert.ok(parsed);
			assert.equal(parsed?.isSetupComplete, false);
			assert.ok(parsed?.transcript);
			assert.equal(parsed?.transcript?.text, "Зуб тридцать шесть");
			assert.equal(parsed?.transcript?.interim, true);
			assert.equal(parsed?.transcript?.finalized, false);
			assert.equal(parsed?.transcript?.isFinal, false);
		});

		it("should parse finalized transcript when turnComplete is true via inputTranscription", () => {
			const payload = {
				serverContent: {
					inputTranscription: {
						text: "Зуб 36: глубокий кариес дентина.",
					},
					turnComplete: true,
				},
			};

			const parsed = parseGeminiLiveServerMessage(JSON.stringify(payload));
			assert.ok(parsed);
			assert.ok(parsed?.transcript);
			assert.equal(parsed?.transcript?.text, "Зуб 36: глубокий кариес дентина.");
			assert.equal(parsed?.transcript?.interim, false);
			assert.equal(parsed?.transcript?.finalized, true);
			assert.equal(parsed?.transcript?.isFinal, true);
			assert.equal(parsed?.transcript?.turnComplete, true);
		});

		it("should parse API error payload", () => {
			const payload = {
				error: {
					code: 429,
					message: "Resource has been exhausted (e.g. check quota).",
					status: "RESOURCE_EXHAUSTED",
				},
			};

			const parsed = parseGeminiLiveServerMessage(JSON.stringify(payload));
			assert.ok(parsed);
			assert.ok(parsed?.error);
			assert.equal(parsed?.error?.code, 429);
			assert.equal(parsed?.error?.status, "RESOURCE_EXHAUSTED");
			assert.ok(parsed?.error?.message.includes("Resource has been exhausted"));
		});

		it("should handle empty or malformed strings gracefully", () => {
			assert.equal(parseGeminiLiveServerMessage(""), null);
			assert.equal(parseGeminiLiveServerMessage("   "), null);
			assert.equal(parseGeminiLiveServerMessage("not-json-content"), null);
		});
	});

	describe("4. Live WebSocket Session Lifecycle & Audio Streaming", () => {
		it("should connect, send setup frame, stream audio, and receive transcripts", async () => {
			let createdSocket: any = null;

			const session = new GeminiLiveSession({
				apiKey: "mock_live_test_key",
				wsFactory: (url) => {
					createdSocket = new MockWebSocket(url);
					return createdSocket as unknown as WebSocket;
				},
			});

			const transcriptEvents: any[] = [];
			const interimTokens: any[] = [];
			const finalTokens: any[] = [];

			session.on("transcript", (event) => transcriptEvents.push(event));
			session.on("interim_token", (event) => interimTokens.push(event));
			session.on("final_token", (event) => finalTokens.push(event));

			let setupCompleteFired = false;
			session.on("setup_complete", () => {
				setupCompleteFired = true;
			});

			await session.connect();
			assert.ok(createdSocket);
			assert.ok(createdSocket.url.includes("key=mock_live_test_key"));

			// Verify setup frame was sent
			assert.equal(createdSocket.sentMessages.length, 1);
			const setupMsg = JSON.parse(createdSocket.sentMessages[0]!);
			assert.ok(setupMsg.setup);
			assert.equal(setupMsg.setup.model, DEFAULT_GEMINI_LIVE_MODEL);

			// Server sends setupComplete
			createdSocket.simulateServerMessage({ setupComplete: {} });
			assert.equal(setupCompleteFired, true);

			// Client sends audio chunks
			const chunk1 = Buffer.alloc(3200, 0x11);
			session.sendAudioChunk(chunk1);

			assert.equal(createdSocket.sentMessages.length, 2);
			const mediaMsg = JSON.parse(createdSocket.sentMessages[1]!);
			assert.ok(mediaMsg.realtimeInput);
			assert.equal(mediaMsg.realtimeInput.mediaChunks[0].mimeType, "audio/pcm;rate=16000");

			// Server returns interim transcript via interimInputTranscription
			createdSocket.simulateServerMessage({
				serverContent: {
					interimInputTranscription: { text: "Жалобы на боль в зубе" },
				},
			});

			assert.equal(session.getTranscript(), "Жалобы на боль в зубе");
			assert.equal(interimTokens.length, 1);
			assert.equal(interimTokens[0].text, "Жалобы на боль в зубе");
			assert.equal(interimTokens[0].isFinal, false);

			// Server returns finalized turn via inputTranscription
			createdSocket.simulateServerMessage({
				serverContent: {
					inputTranscription: { text: "Жалобы на боль в зубе 46." },
					turnComplete: true,
				},
			});

			assert.equal(session.getFinalizedTranscript(), "Жалобы на боль в зубе 46.");
			assert.equal(finalTokens.length, 1);
			assert.equal(finalTokens[0].text, "Жалобы на боль в зубе 46.");
			assert.equal(finalTokens[0].isFinal, true);
			assert.equal(transcriptEvents.length, 2);
			assert.equal(transcriptEvents[1].finalized, true);
			assert.equal(transcriptEvents[1].isFinal, true);

			session.close();
			assert.equal(session.isActive(), false);
		});

		it("should send finish clientContent without destructive turns: [] array", async () => {
			let createdSocket: any = null;

			const session = new GeminiLiveSession({
				apiKey: "test-api-key-finish",
				wsFactory: (url) => {
					createdSocket = new MockWebSocket(url);
					return createdSocket as unknown as WebSocket;
				},
			});

			await session.connect();
			createdSocket.simulateServerMessage({ setupComplete: {} });

			const finishPromise = session.finish(500);

			// Find clientContent message
			const finishMsgRaw = createdSocket.sentMessages.find((m: string) => m.includes("turnComplete"));
			assert.ok(finishMsgRaw, "Expected turnComplete message to be sent");
			const finishMsg = JSON.parse(finishMsgRaw);
			assert.equal(finishMsg.clientContent?.turnComplete, true);
			assert.equal(finishMsg.clientContent?.turns, undefined, "Prohibited turns: [] must not be present");

			await finishPromise;
			session.close();
		});
	});

	describe("5. Zero-Downtime Key Pool Failover & Buffer Reconnection", () => {
		it("should rotate API key and replay audio buffer on 429 quota error", async () => {
			const sockets: MockWebSocket[] = [];

			const session = new GeminiLiveSession({
				providerId: "google_speech",
				wsFactory: (url) => {
					const s = new MockWebSocket(url);
					sockets.push(s);
					return s as unknown as WebSocket;
				},
			});

			const rotatedEvents: Array<{ fingerprint: string; attempt: number }> = [];
			session.on("key_rotated", (evt) => rotatedEvents.push(evt));

			await session.connect();
			assert.equal(sockets.length, 1);
			const socket1 = sockets[0]!;

			// Setup complete on socket 1
			socket1.simulateServerMessage({ setupComplete: {} });

			// Send audio chunk to buffer
			const audioChunk = Buffer.from("audio_payload_bytes_sample");
			session.sendAudioChunk(audioChunk);

			// Socket 1 receives 429 RESOURCE_EXHAUSTED error
			socket1.simulateServerMessage({
				error: {
					code: 429,
					message: "Quota exceeded for project",
					status: "RESOURCE_EXHAUSTED",
				},
			});

			// Allow nextTick for reconnection to settle
			await new Promise((r) => setTimeout(r, 20));

			// Verify key rotated and socket 2 created
			assert.equal(rotatedEvents.length, 1);
			assert.equal(rotatedEvents[0]?.attempt, 1);
			assert.equal(sockets.length, 2);

			const socket2 = sockets[1]!;
			// Socket 2 receives setupComplete
			socket2.simulateServerMessage({ setupComplete: {} });

			// Verify setup frame sent on socket 2
			assert.ok(socket2.sentMessages.length >= 1);
			const setupMsg2 = JSON.parse(socket2.sentMessages[0]!);
			assert.ok(setupMsg2.setup);

			// Verify buffered audio was flushed to socket 2
			assert.ok(socket2.sentMessages.length >= 2);
			const flushedAudio = JSON.parse(socket2.sentMessages[1]!);
			assert.ok(flushedAudio.realtimeInput);

			// Finalize on socket 2
			socket2.simulateServerMessage({
				serverContent: {
					inputTranscription: { text: "Успешное восстановление сессии." },
					turnComplete: true,
				},
			});

			assert.equal(session.getFinalizedTranscript(), "Успешное восстановление сессии.");
			session.close();
		});

		it("should rotate API key on abnormal WebSocket close (code 1006 / 403 / 1008)", async () => {
			const sockets: MockWebSocket[] = [];

			const session = new GeminiLiveSession({
				providerId: "google_speech",
				wsFactory: (url) => {
					const s = new MockWebSocket(url);
					sockets.push(s);
					return s as unknown as WebSocket;
				},
			});

			let rotatedCount = 0;
			session.on("key_rotated", () => {
				rotatedCount++;
			});

			await session.connect();
			assert.equal(sockets.length, 1);

			// Policy violation (code 1008)
			sockets[0]!.simulateAbnormalClose(1008, "Policy violation or key invalid");

			await new Promise((r) => setTimeout(r, 20));

			assert.equal(rotatedCount, 1);
			assert.equal(sockets.length, 2);

			session.close();
		});

		it("should support failover across 8 verified API keys in key pool", async () => {
			process.env.GOOGLE_API_KEYS = Array.from(
				{ length: 8 },
				(_, i) => `test-key-pool-auto-key-index-${i + 1}-abcdef123456`,
			).join(",");

			const sockets: MockWebSocket[] = [];
			const session = new GeminiLiveSession({
				providerId: "google_speech",
				maxRetryAttempts: 8,
				wsFactory: (url) => {
					const s = new MockWebSocket(url);
					sockets.push(s);
					return s as unknown as WebSocket;
				},
			});

			const rotatedKeys: string[] = [];
			session.on("key_rotated", (evt) => {
				rotatedKeys.push(evt.fingerprint);
			});

			await session.connect();
			assert.equal(sockets.length, 1);

			// Simulate 3 successive quota/auth failures
			for (let i = 0; i < 3; i++) {
				const currentSock = sockets[sockets.length - 1]!;
				currentSock.simulateServerMessage({
					error: {
						code: 403,
						message: "The caller does not have permission / quota exhausted",
						status: "PERMISSION_DENIED",
					},
				});
				await new Promise((r) => setTimeout(r, 20));
			}

			assert.equal(rotatedKeys.length, 3);
			assert.equal(sockets.length, 4);
			session.close();
		});

		it("should clear audio buffer on finalized turn to prevent echo/duplicate replay on reconnect", async () => {
			const sockets: MockWebSocket[] = [];

			const session = new GeminiLiveSession({
				providerId: "google_speech",
				wsFactory: (url) => {
					const s = new MockWebSocket(url);
					sockets.push(s);
					return s as unknown as WebSocket;
				},
			});

			await session.connect();
			assert.equal(sockets.length, 1);
			const socket1 = sockets[0]!;
			socket1.simulateServerMessage({ setupComplete: {} });

			// Send first turn audio
			session.sendAudioChunk(Buffer.from("first_sentence_audio_pcm"));

			// Turn 1 is finalized
			socket1.simulateServerMessage({
				serverContent: {
					inputTranscription: { text: "Первое предложение." },
					turnComplete: true,
				},
			});

			assert.equal(session.getFinalizedTranscript(), "Первое предложение.");

			// Socket 1 disconnects abnormally (code 1006)
			socket1.simulateAbnormalClose(1006, "Dropped");
			await new Promise((r) => setTimeout(r, 20));

			assert.equal(sockets.length, 2);
			const socket2 = sockets[1]!;
			socket2.simulateServerMessage({ setupComplete: {} });

			// Verify socket 2 only received setup frame and did NOT replay the finalized first sentence audio
			assert.equal(socket2.sentMessages.length, 1);
			const setupMsg = JSON.parse(socket2.sentMessages[0]!);
			assert.ok(setupMsg.setup);

			// Send second turn audio
			session.sendAudioChunk(Buffer.from("second_sentence_audio_pcm"));
			assert.equal(socket2.sentMessages.length, 2);

			socket2.simulateServerMessage({
				serverContent: {
					inputTranscription: { text: "Второе предложение." },
					turnComplete: true,
				},
			});

			// Final transcript must be cleanly concatenated without echoing turn 1
			assert.equal(
				session.getFinalizedTranscript(),
				"Первое предложение. Второе предложение.",
			);

			session.close();
		});
	});

	describe("6. Proxy Agent Forwarding", () => {
		it("should forward custom proxy agent to WebSocket options when PROXY_URL is configured", async () => {
			process.env.PROXY_URL = "http://127.0.0.1:8080";

			let capturedOptions: any = null;
			const session = new GeminiLiveSession({
				apiKey: "test-proxy-key",
				wsFactory: (url, protocols, opts) => {
					capturedOptions = opts;
					const s = new MockWebSocket(url);
					return s as unknown as WebSocket;
				},
			});

			await session.connect();
			assert.ok(capturedOptions, "Expected wsFactory to receive options");
			assert.ok(capturedOptions.agent, "Expected wsFactory options to contain agent");

			session.close();
		});
	});

	describe("7. transcribeWithGeminiLiveStt High-Level Helper", () => {
		it("should stream full buffer and resolve complete transcript", async () => {
			let socket: MockWebSocket | null = null;

			const audioData = Buffer.alloc(16000 * 2, 0x33); // 1 second of 16kHz 16-bit audio (32000 bytes)

			const promise = transcribeWithGeminiLiveStt({
				audio: audioData,
				specialty: "therapist",
				config: {
					apiKey: "manual-gemini-key",
					wsFactory: (url) => {
						socket = new MockWebSocket(url);
						process.nextTick(() => {
							socket!.simulateServerMessage({ setupComplete: {} });
						});
						return socket as unknown as WebSocket;
					},
				},
			});

			const result = await promise;
			assert.equal(result.text, "Акт выполненных работ: анестезия, пломбирование канала.");
			assert.deepEqual(result.warnings, []);
		});
	});
});
