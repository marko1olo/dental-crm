import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { UnifiedAudioClient } from "../UnifiedAudioClient";

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
});
