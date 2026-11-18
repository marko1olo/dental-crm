import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Buffer } from "node:buffer";
import {
	DEFAULT_GROQ_WHISPER_MODEL,
	GroqWhisperProvider,
	transcribeWithGroqWhisper,
} from "./groqWhisperProvider.js";

describe("GroqWhisperProvider Suite", () => {
	it("handles silent or empty audio without network call or error", async () => {
		const emptyBuf = Buffer.alloc(0);
		const result = await transcribeWithGroqWhisper({
			audio: emptyBuf,
		});

		assert.equal(result.isSilent, true);
		assert.equal(result.text, "");
		assert.equal(result.rawText, "");
		assert.equal(result.model, DEFAULT_GROQ_WHISPER_MODEL);
	});

	it("passes dental glossary prompt and default whisper-large-v3-turbo model in request", async () => {
		// Minimum fake WAV header (44 bytes)
		const fakeWav = Buffer.alloc(100, 0x55);

		let capturedFormData: FormData | null = null;
		let capturedAuthHeader: string | null = null;

		const mockFetch: typeof fetch = async (_url, init) => {
			capturedFormData = init?.body as FormData;
			capturedAuthHeader = (init?.headers as Record<string, string>)?.Authorization || null;

			return new Response(
				JSON.stringify({
					text: "провел препарирование верти преп под коронку и зафиксировал на паракер",
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			);
		};

		const result = await transcribeWithGroqWhisper({
			audio: fakeWav,
			explicitApiKey: "gsk_test_mock_key_123",
			fetchFn: mockFetch,
		});

		assert.ok(capturedFormData);
		const formData = capturedFormData as any;
		assert.equal(formData.get("model"), "whisper-large-v3-turbo");
		assert.equal(formData.get("language"), "ru");

		const prompt = formData.get("prompt") as string;
		assert.ok(prompt && typeof prompt === "string");
		assert.ok(prompt.includes("коффердам") || prompt.includes("DENTE"));

		assert.equal(capturedAuthHeader, "Bearer gsk_test_mock_key_123");

		// Verifies phonetic postprocessing was applied
		assert.equal(result.isSilent, false);
		assert.ok(result.rawText.includes("верти преп"));
		assert.ok(result.text.includes("вертипреп / Vertiprep"));
		assert.ok(result.text.includes("ParaCore"));
	});

	it("filters out Whisper hallucination loops and blacklisted subtitles", async () => {
		const fakeWav = Buffer.alloc(100, 0xaa);

		const mockFetch: typeof fetch = async () => {
			return new Response(
				JSON.stringify({
					text: "Субтитры сделал DimaTorzok",
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			);
		};

		const result = await transcribeWithGroqWhisper({
			audio: fakeWav,
			explicitApiKey: "gsk_test_mock_key_456",
			fetchFn: mockFetch,
		});

		assert.equal(result.isSilent, true);
		assert.equal(result.text, "");
		assert.ok(result.rawText.includes("DimaTorzok"));
	});

	it("GroqWhisperProvider class instance adheres to interface", async () => {
		const provider = new GroqWhisperProvider();
		assert.equal(provider.providerId, "groq_whisper");
		assert.equal(provider.defaultModel, "whisper-large-v3-turbo");

		const fakeWav = Buffer.alloc(80, 0x11);
		const mockFetch: typeof fetch = async () => {
			return new Response(
				JSON.stringify({
					text: "установлен кофердам и плагер",
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			);
		};

		const res = await provider.transcribe({
			audio: fakeWav,
			explicitApiKey: "gsk_test_instance_key",
			fetchFn: mockFetch,
		});

		assert.ok(res.text.includes("коффердам"));
		assert.ok(res.text.includes("плаггер"));
	});
});
