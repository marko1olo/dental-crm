import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	appendSentenceToTranscript,
	buildTwoLayerTranscript,
	calculateFloat32Rms,
	calculateInt16Rms,
	combineInt16Chunks,
	computeAdaptiveSpeechThreshold,
	encodePcm16ToBase64,
	encodePcm16ToWavBlob,
	float32ToInt16Pcm,
	resampleFloat32ToInt16Pcm,
	UnifiedAudioClient,
	updateAdaptiveNoiseFloor,
	VadDetector,
} from "../UnifiedAudioClient";
import { AudioStreamTransport, type AudioTransportHost } from "../audioClient/audioStreamTransport";
import { resolveUnifiedAudioClientOptions } from "../audioClient/types";
import { VoiceOfflineQueue } from "../VoiceOfflineQueue";

describe("UnifiedAudioClient: State, Modes & Fallback Engine", () => {
	it("initializes in idle state with preferred mode 'gemini_live'", () => {
		const client = new UnifiedAudioClient({
			preferredMode: "gemini_live",
			specialty: "therapy",
			organizationId: "org-test-123",
		});

		assert.strictEqual(client.getState(), "idle");
		assert.strictEqual(client.getMode(), "gemini_live");
		assert.strictEqual(client.getTranscript(), "");
		assert.strictEqual(client.getInterimText(), "");
		client.dispose();
	});

	it("supports explicit mode switching and emits mode_change event", () => {
		const client = new UnifiedAudioClient({
			preferredMode: "gemini_live",
		});

		const modeChanges: Array<{ newMode: string; prevMode: string }> = [];
		const unsub = client.subscribe({
			onModeChange: (newMode, prevMode) => {
				modeChanges.push({ newMode, prevMode });
			},
		});

		client.setMode("server_whisper");
		assert.strictEqual(client.getMode(), "server_whisper");

		client.setMode("browser_speech");
		assert.strictEqual(client.getMode(), "browser_speech");

		assert.strictEqual(modeChanges.length, 2);
		assert.deepStrictEqual(modeChanges[0], {
			newMode: "server_whisper",
			prevMode: "gemini_live",
		});
		assert.deepStrictEqual(modeChanges[1], {
			newMode: "browser_speech",
			prevMode: "server_whisper",
		});

		unsub();
		client.dispose();
	});

	it("supports subscribing and unsubscribing event listeners cleanly", () => {
		const client = new UnifiedAudioClient();
		let stateCallCount = 0;

		const unsub = client.subscribe({
			onStateChange: () => {
				stateCallCount++;
			},
		});

		assert.strictEqual(typeof unsub, "function");
		assert.strictEqual(stateCallCount, 0);
		unsub();
		client.dispose();
	});

	it("updates clinical context (patientId, visitId, adminSecret) dynamically", () => {
		const client = new UnifiedAudioClient({
			organizationId: "org-1",
			patientId: "patient-1",
			visitId: "visit-1",
		});

		assert.doesNotThrow(() => {
			client.updateContext({
				patientId: "patient-2",
				visitId: "visit-2",
				specialty: "surgery",
				adminSecret: "secret-abc",
			});
		});

		client.dispose();
	});

	it("clears accumulated transcript and draft without throwing", () => {
		const client = new UnifiedAudioClient();
		assert.doesNotThrow(() => {
			client.clearTranscript();
		});
		assert.strictEqual(client.getTranscript(), "");
		assert.strictEqual(client.getInterimText(), "");
		client.dispose();
	});

	it("safely handles cancel and stop operations", async () => {
		const client = new UnifiedAudioClient();
		assert.doesNotThrow(() => {
			client.cancel();
		});
		const result = await client.stop();
		assert.strictEqual(typeof result, "string");
		client.dispose();
	});

	it("returns two-layer transcript state with finalized and interim segments", () => {
		const client = new UnifiedAudioClient();
		const twoLayer = client.getTwoLayerTranscript();
		assert.strictEqual(twoLayer.finalized, "");
		assert.strictEqual(twoLayer.interim, "");
		assert.strictEqual(twoLayer.fullWithInterim, "");
		client.dispose();
	});

	it("converts Float32 to Int16 PCM, resamples, and encodes WAV / Base64 accurately", async () => {
		const floatSamples = new Float32Array([0, 0.5, -0.5, 1.0, -1.0]);
		const pcm16 = float32ToInt16Pcm(floatSamples);
		assert.strictEqual(pcm16.length, 5);
		assert.strictEqual(pcm16[0], 0);
		assert.strictEqual(pcm16[3], 32767);
		assert.strictEqual(pcm16[4], -32768);

		const rmsF32 = calculateFloat32Rms(floatSamples);
		const rmsI16 = calculateInt16Rms(pcm16);
		assert.ok(rmsF32 > 0.6 && rmsF32 < 0.75);
		assert.ok(Math.abs(rmsF32 - rmsI16) < 0.01);

		const src48k = new Float32Array(480);
		src48k.fill(0.25);
		const resampled16k = resampleFloat32ToInt16Pcm(src48k, 48000, 16000);
		assert.strictEqual(resampled16k.length, 160);

		const combined = combineInt16Chunks([pcm16, resampled16k]);
		assert.strictEqual(combined.length, 165);

		const base64 = encodePcm16ToBase64(pcm16);
		assert.ok(base64.length > 0);

		const wavBlob = encodePcm16ToWavBlob([pcm16], 16000);
		assert.strictEqual(wavBlob.type, "audio/wav");
		assert.strictEqual(wavBlob.size, 44 + pcm16.length * 2);

		const twoLayer = buildTwoLayerTranscript("Зуб 46", "кариес дентина");
		assert.strictEqual(twoLayer.fullWithInterim, "Зуб 46 кариес дентина");
		assert.strictEqual(
			appendSentenceToTranscript("Зуб 46", "Пульпит"),
			"Зуб 46. Пульпит",
		);
	});

	it("tracks speech and silence transitions in VadDetector", () => {
		let speechStarted = 0;
		let speechEnded = 0;
		const detector = new VadDetector(
			{
				enabled: true,
				speechThresholdRms: 0.02,
				silenceThresholdRms: 0.008,
				silenceTimeoutMs: 50,
				minSpeechDurationMs: 0,
				maxSpeechDurationMs: 5000,
			},
			{
				onSpeechStart: () => {
					speechStarted++;
				},
				onSpeechEnd: () => {
					speechEnded++;
				},
			},
		);

		assert.strictEqual(
			computeAdaptiveSpeechThreshold(0.016, 0.01),
			0.022000000000000002,
		);
		assert.ok(updateAdaptiveNoiseFloor(0.005, 0.015) > 0.005);

		const frame = new Int16Array(512);
		detector.processPcmFrame(frame, 0.05);
		assert.strictEqual(detector.getIsSpeaking(), true);
		assert.strictEqual(speechStarted, 1);

		const flushed = detector.flushSpeechSegment("manual_stop");
		assert.strictEqual(flushed.length, 512);
		assert.strictEqual(detector.getIsSpeaking(), false);
		assert.strictEqual(speechEnded, 1);

		detector.dispose();
	});

	it("authenticates Gemini Live WS via POST /api/v1/speech/live/ticket without adminSecret", async () => {
		const origWindow = (globalThis as { window?: unknown }).window;
		const origWebSocket = (globalThis as { WebSocket?: unknown }).WebSocket;
		const origFetch = globalThis.fetch;

		const sentFrames: string[] = [];
		let connectedUrl = "";
		let ticketHeaders: Record<string, string> = {};

		class FakeWs {
			static OPEN = 1;
			readyState = 1;
			onopen: (() => void) | null = null;
			onmessage: ((ev: { data: string }) => void) | null = null;
			onerror: ((err: unknown) => void) | null = null;
			onclose: ((ev: { code: number }) => void) | null = null;
			constructor(url: string) {
				connectedUrl = url;
				queueMicrotask(() => this.onopen?.());
			}
			send(data: string) {
				sentFrames.push(data);
			}
			close() {}
		}

		(globalThis as { window?: unknown }).window = {
			location: { protocol: "http:", host: "127.0.0.1:5173" },
		};
		(globalThis as { WebSocket?: unknown }).WebSocket = FakeWs;
		globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
			ticketHeaders = (init?.headers ?? {}) as Record<string, string>;
			return new Response(JSON.stringify({ data: { ok: true, ticket: "ws-ticket-xyz" } }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		}) as typeof fetch;

		try {
			const queue = new VoiceOfflineQueue({ autoSyncIntervalMs: 0 });
			const host: AudioTransportHost = {
				getOptions: () =>
					resolveUnifiedAudioClientOptions({
						preferredMode: "gemini_live",
						specialty: "therapy",
						adminSecret: "must-never-leak-over-ws",
					}),
				getState: () => "listening",
				getMode: () => "gemini_live",
				getIsDisposed: () => false,
				getRecordingId: () => "01945000-0000-7000-8000-000000000010",
				nextChunkIndex: () => 0,
				getAccumulatedText: () => "",
				getStreamManager: () => null,
				getOfflineQueue: () => queue,
				onInterimTranscript: () => {},
				onFinalSegment: () => {},
				onProviderFallback: async () => {},
				onFatalSpeechError: () => {},
				onOfflineRecordSaved: () => {},
			};
			const transport = new AudioStreamTransport(host);
			const ok = await transport.startGeminiLiveWs();
			assert.strictEqual(ok, true);
			assert.ok(Boolean(ticketHeaders["Idempotency-Key"]));
			assert.ok(connectedUrl.includes("/api/speech/live?ticket=ws-ticket-xyz"));
			const initPayload = JSON.parse(sentFrames[0] || "{}") as Record<string, unknown>;
			assert.strictEqual(initPayload.type, "session_init");
			assert.strictEqual(initPayload.ticket, "ws-ticket-xyz");
			assert.strictEqual(initPayload.adminSecret, undefined);
			transport.cleanupBackend();
			queue.dispose();
		} finally {
			(globalThis as { window?: unknown }).window = origWindow;
			(globalThis as { WebSocket?: unknown }).WebSocket = origWebSocket;
			globalThis.fetch = origFetch;
		}
	});
});
