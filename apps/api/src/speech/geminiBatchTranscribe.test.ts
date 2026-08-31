import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
	type GeminiBatchTranscribeResult,
	normalizeAudioMimeType,
	transcribeGeminiBatch,
} from "./geminiBatchTranscribe.js";
import {
	resetProviderKeyCooldowns,
	SpeechProviderRequestError,
} from "./keyPool.js";

const SPEECH_ENV_PATTERN =
	/^(DENTAL_SPEECH_|DENTAL_GEMINI_|GOOGLE_SPEECH_|GOOGLE_API_|GEMINI_API_)/;

describe("geminiBatchTranscribe", () => {
	let originalEnv: NodeJS.ProcessEnv;
	let originalFetch: typeof globalThis.fetch;

	beforeEach(() => {
		originalEnv = process.env;
		process.env = { ...originalEnv };
		for (const name of Object.keys(process.env)) {
			if (SPEECH_ENV_PATTERN.test(name)) delete process.env[name];
		}
		process.env.DENTAL_SPEECH_KEY_HEALTH_FILE = "off";
		resetProviderKeyCooldowns();
		originalFetch = globalThis.fetch;
	});

	afterEach(() => {
		process.env = originalEnv;
		globalThis.fetch = originalFetch;
	});

	describe("normalizeAudioMimeType", () => {
		it("normalizes standard and vendor mime types correctly", () => {
			assert.strictEqual(normalizeAudioMimeType("audio/wav"), "audio/wav");
			assert.strictEqual(normalizeAudioMimeType("audio/x-wav"), "audio/x-wav");
			assert.strictEqual(normalizeAudioMimeType("audio/mp3"), "audio/mp3");
			assert.strictEqual(normalizeAudioMimeType("audio/mpeg"), "audio/mpeg");
			assert.strictEqual(normalizeAudioMimeType("audio/ogg; codecs=opus"), "audio/ogg");
			assert.strictEqual(normalizeAudioMimeType("audio/webm; codecs=opus"), "audio/webm");
			assert.strictEqual(normalizeAudioMimeType("audio/flac"), "audio/flac");
			assert.strictEqual(normalizeAudioMimeType("audio/m4a"), "audio/m4a");
			assert.strictEqual(normalizeAudioMimeType(undefined), "audio/wav");
			assert.strictEqual(normalizeAudioMimeType("unknown/format"), "audio/wav");
		});
	});

	describe("transcribeGeminiBatch - happy path & features", () => {
		it("throws 400 error when neither audio nor fileUri is provided", async () => {
			await assert.rejects(
				async () => {
					await transcribeGeminiBatch({});
				},
				(err: unknown) => {
					assert.ok(err instanceof SpeechProviderRequestError);
					assert.strictEqual((err as SpeechProviderRequestError).statusCode, 400);
					return true;
				},
			);
		});

		it("performs batch transcription with inline base64 audio and parses diarization + timestamps", async () => {
			const mockAudio = Buffer.from("RIFFtestwavcontent");
			let requestBodyCaptured: any = null;

			globalThis.fetch = async (input: any, init?: any) => {
				const url = String(input);
				assert.ok(url.includes("generativelanguage.googleapis.com"));
				assert.ok(url.includes("key=test-gemini-key"));

				requestBodyCaptured = JSON.parse(String(init?.body || "{}"));

				const mockResponse = {
					candidates: [
						{
							content: {
								parts: [
									{
										text: JSON.stringify({
											text: "Speaker 1 (Врач): Здравствуйте, зуб 36 беспокоит?\nSpeaker 2 (Пациент): Да, реакция на холодное.",
											language: "ru",
											durationMs: 4500,
											speakers: ["Speaker 1 (Врач)", "Speaker 2 (Пациент)"],
											segments: [
												{
													speaker: "Speaker 1 (Врач)",
													role: "Врач",
													text: "Здравствуйте, зуб 36 беспокоит?",
													startOffsetMs: 0,
													endOffsetMs: 2200,
													words: [
														{
															word: "Здравствуйте",
															startOffsetMs: 0,
															endOffsetMs: 800,
															speaker: "Speaker 1 (Врач)",
															confidence: 0.99,
														},
														{
															word: "зуб",
															startOffsetMs: 850,
															endOffsetMs: 1100,
															speaker: "Speaker 1 (Врач)",
															confidence: 0.98,
														},
														{
															word: "36",
															startOffsetMs: 1150,
															endOffsetMs: 1500,
															speaker: "Speaker 1 (Врач)",
															confidence: 0.97,
														},
														{
															word: "беспокоит",
															startOffsetMs: 1550,
															endOffsetMs: 2200,
															speaker: "Speaker 1 (Врач)",
															confidence: 0.96,
														},
													],
												},
												{
													speaker: "Speaker 2 (Пациент)",
													role: "Пациент",
													text: "Да, реакция на холодное.",
													startOffsetMs: 2300,
													endOffsetMs: 4400,
													words: [
														{
															word: "Да",
															startOffsetMs: 2300,
															endOffsetMs: 2600,
															speaker: "Speaker 2 (Пациент)",
															confidence: 0.99,
														},
														{
															word: "реакция",
															startOffsetMs: 2650,
															endOffsetMs: 3200,
															speaker: "Speaker 2 (Пациент)",
															confidence: 0.98,
														},
														{
															word: "на",
															startOffsetMs: 3250,
															endOffsetMs: 3400,
															speaker: "Speaker 2 (Пациент)",
															confidence: 0.99,
														},
														{
															word: "холодное",
															startOffsetMs: 3450,
															endOffsetMs: 4400,
															speaker: "Speaker 2 (Пациент)",
															confidence: 0.95,
														},
													],
												},
											],
											words: [],
											confidence: 0.98,
										}),
									},
								],
							},
						},
					],
				};

				return new Response(JSON.stringify(mockResponse), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			};

			const result: GeminiBatchTranscribeResult = await transcribeGeminiBatch({
				audio: mockAudio,
				mimeType: "audio/wav",
				apiKey: "test-gemini-key",
				language: "ru",
				speechBiasing: ["зуб 36", "пульпит", "холодная проба"],
			});

			assert.ok(result.text.includes("Здравствуйте, зуб 36 беспокоит?"));
			assert.strictEqual(result.language, "ru");
			assert.strictEqual(result.durationMs, 4500);
			assert.strictEqual(result.segments.length, 2);
			assert.strictEqual(result.segments[0]?.speaker, "Speaker 1 (Врач)");
			assert.strictEqual(result.segments[0]?.role, "Врач");
			assert.strictEqual(result.segments[1]?.speaker, "Speaker 2 (Пациент)");
			assert.strictEqual(result.segments[1]?.role, "Пациент");

			// Check word timestamps flattened into words array
			assert.strictEqual(result.words.length, 8);
			assert.strictEqual(result.words[0]?.word, "Здравствуйте");
			assert.strictEqual(result.words[0]?.startOffsetMs, 0);
			assert.strictEqual(result.words[0]?.endOffsetMs, 800);
			assert.strictEqual(result.words[2]?.word, "36");

			// Check request payload verification
			assert.ok(requestBodyCaptured);
			const promptText = requestBodyCaptured.contents[0].parts[0].text;
			assert.ok(promptText.includes("Диаризация спикеров"));
			assert.ok(promptText.includes("Таймкоды слов"));
			assert.ok(promptText.includes("зуб 36"));

			const inlineData = requestBodyCaptured.contents[0].parts[1].inline_data;
			assert.strictEqual(inlineData.mime_type, "audio/wav");
			assert.strictEqual(inlineData.data, mockAudio.toString("base64"));
		});

		it("supports Google File API URI for long recordings", async () => {
			let requestBodyCaptured: any = null;

			globalThis.fetch = async (input: any, init?: any) => {
				requestBodyCaptured = JSON.parse(String(init?.body || "{}"));

				const mockResponse = {
					candidates: [
						{
							content: {
								parts: [
									{
										text: JSON.stringify({
											text: "Проведена операция имплантации.",
											language: "ru",
											segments: [
												{
													speaker: "Speaker 1 (Хирург)",
													text: "Проведена операция имплантации.",
													startOffsetMs: 0,
													endOffsetMs: 3000,
												},
											],
										}),
									},
								],
							},
						},
					],
				};

				return new Response(JSON.stringify(mockResponse), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			};

			const result = await transcribeGeminiBatch({
				fileUri: "https://generativelanguage.googleapis.com/v1beta/files/sample-file-id-123",
				mimeType: "audio/mp3",
				apiKey: "test-file-api-key",
			});

			assert.strictEqual(result.text, "Проведена операция имплантации.");
			const fileData = requestBodyCaptured.contents[0].parts[1].file_data;
			assert.strictEqual(
				fileData.file_uri,
				"https://generativelanguage.googleapis.com/v1beta/files/sample-file-id-123",
			);
			assert.strictEqual(fileData.mime_type, "audio/mp3");
		});

		it("resiliently handles markdown-wrapped JSON response from Gemini", async () => {
			globalThis.fetch = async () => {
				const wrappedMarkdownJson = `\`\`\`json
{
  "text": "Анестезия Ультракаин Д-С 1.7 мл введена.",
  "language": "ru",
  "speakers": ["Speaker 1 (Врач)"],
  "segments": [
    {
      "speaker": "Speaker 1 (Врач)",
      "text": "Анестезия Ультракаин Д-С 1.7 мл введена.",
      "startOffsetMs": 100,
      "endOffsetMs": 2800
    }
  ]
}
\`\`\``;

				const mockResponse = {
					candidates: [
						{
							content: {
								parts: [{ text: wrappedMarkdownJson }],
							},
						},
					],
				};

				return new Response(JSON.stringify(mockResponse), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			};

			const result = await transcribeGeminiBatch({
				audio: Buffer.from("audio-bytes"),
				apiKey: "key-123",
			});

			assert.strictEqual(
				result.text,
				"Анестезия Ультракаин Д-С 1.7 мл введена.",
			);
			assert.strictEqual(result.segments.length, 1);
			assert.strictEqual(result.segments[0]?.startOffsetMs, 100);
		});
	});

	describe("Zero-Downtime Key Pool integration & rotation", () => {
		it("rotates to backup key on 429 Rate Limit and succeeds", async () => {
			process.env.GOOGLE_API_KEYS = "primary_rate_limited_key,backup_working_key";
			delete process.env.GOOGLE_API_KEY;
			process.env.DENTAL_SPEECH_KEY_RETRY_LIMIT = "2";

			let callCount = 0;
			const usedKeys: string[] = [];

			globalThis.fetch = async (input: any) => {
				callCount++;
				const url = new URL(String(input));
				const key = url.searchParams.get("key") || "";
				usedKeys.push(key);

				if (callCount === 1) {
					return new Response(
						JSON.stringify({
							error: {
								code: 429,
								message: "RESOURCE_EXHAUSTED: Rate limit exceeded",
							},
						}),
						{ status: 429, headers: { "Content-Type": "application/json" } },
					);
				}

				return new Response(
					JSON.stringify({
						candidates: [
							{
								content: {
									parts: [
										{
											text: JSON.stringify({
												text: "Успешная расшифровка на резервном ключе.",
												language: "ru",
												segments: [],
											}),
										},
									],
								},
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			};

			const result = await transcribeGeminiBatch({
				audio: Buffer.from("audio-bytes"),
			});

			assert.strictEqual(
				result.text,
				"Успешная расшифровка на резервном ключе.",
			);
			assert.strictEqual(callCount, 2);
			assert.strictEqual(usedKeys.length, 2);
			assert.ok(result.warnings.some((w) => w.includes("восстановился после резервной попытки")));
		});
	});
});
