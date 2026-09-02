import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { SpeechProviderRequestError } from "./keyPool.js";
import {
	isHallucinatedWhisperTranscript,
	transcribeWhisperCascade,
	WHISPER_HALLUCINATION_BLACKLIST,
	type WhisperCascadeResult,
} from "./whisperCascade.js";

const SPEECH_ENV_PATTERN =
	/^(DENTAL_SPEECH_|DENTAL_WHISPER_|GROQ_|OPENAI_|CLOUDFLARE_|LOCAL_WHISPER_|WHISPER_CPP_)/;

describe("whisperCascade", () => {
	let originalEnv: NodeJS.ProcessEnv;
	let originalFetch: typeof globalThis.fetch;

	beforeEach(() => {
		originalEnv = process.env;
		process.env = { ...originalEnv };
		for (const name of Object.keys(process.env)) {
			if (SPEECH_ENV_PATTERN.test(name)) delete process.env[name];
		}
		originalFetch = globalThis.fetch;
	});

	afterEach(() => {
		process.env = originalEnv;
		globalThis.fetch = originalFetch;
	});

	describe("isHallucinatedWhisperTranscript", () => {
		it("detects blacklisted silence and subtitle phrases", () => {
			assert.strictEqual(
				isHallucinatedWhisperTranscript("Продолжение следует").hallucinated,
				true,
			);
			assert.strictEqual(
				isHallucinatedWhisperTranscript("продолжение следует...").hallucinated,
				true,
			);
			assert.strictEqual(
				isHallucinatedWhisperTranscript("To be continued").hallucinated,
				true,
			);
			assert.strictEqual(
				isHallucinatedWhisperTranscript("Субтитры создавал DimaTorzok")
					.hallucinated,
				true,
			);
			assert.strictEqual(
				isHallucinatedWhisperTranscript("Спасибо за просмотр!").hallucinated,
				true,
			);
			assert.strictEqual(
				isHallucinatedWhisperTranscript("Подписывайтесь на канал").hallucinated,
				true,
			);
			assert.strictEqual(
				isHallucinatedWhisperTranscript("www.youtube.com").hallucinated,
				true,
			);
		});

		it("detects character and phrase repetition loops", () => {
			const phraseLoop = "ля ля ля ля ля ля ля ля ля ля ";
			assert.strictEqual(
				isHallucinatedWhisperTranscript(phraseLoop).hallucinated,
				true,
			);

			const wordLoop = "зуб зуб зуб зуб зуб";
			assert.strictEqual(
				isHallucinatedWhisperTranscript(wordLoop).hallucinated,
				true,
			);
		});

		it("does NOT falsely flag genuine clinical phrases containing substrings", () => {
			const legitimateContinuation =
				"Продолжение следует после снятия слепков — второй этап протезирования назначен на вторник.";
			assert.strictEqual(
				isHallucinatedWhisperTranscript(legitimateContinuation).hallucinated,
				false,
			);

			const normalVisit =
				"Жалобы на боль в зубе 36 при накусывании. Проведена изоляция коффердам, обработка каналов.";
			assert.strictEqual(
				isHallucinatedWhisperTranscript(normalVisit).hallucinated,
				false,
			);
		});
	});

	describe("transcribeWhisperCascade execution", () => {
		it("succeeds on first provider (Groq Whisper) in happy path", async () => {
			process.env.GROQ_API_KEY = "test-groq-happy-key";

			let requestedUrl = "";
			let formPrompt = "";

			globalThis.fetch = async (input: any, init?: any) => {
				requestedUrl = String(input);
				const body = init?.body as FormData;
				formPrompt = String(body.get("prompt") || "");

				return new Response(
					JSON.stringify({ text: "Жалобы на боль в зубе 46." }),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				);
			};

			const result: WhisperCascadeResult = await transcribeWhisperCascade({
				audio: Buffer.from("test-audio"),
				mimeType: "audio/wav",
				language: "ru",
			});

			assert.strictEqual(result.provider, "groq_whisper");
			assert.strictEqual(result.text, "Жалобы на боль в зубе 46.");
			assert.strictEqual(result.fallbackOccurred, false);
			assert.strictEqual(result.attempts.length, 1);
			assert.strictEqual(result.attempts[0]?.provider, "groq_whisper");
			assert.strictEqual(result.attempts[0]?.success, true);
			assert.ok(requestedUrl.includes("api.groq.com"));
		});

		it("cascades from Groq to OpenAI on Groq 500 error", async () => {
			process.env.GROQ_API_KEY = "groq-500-error-key";
			process.env.OPENAI_API_KEY = "openai-500-recovery-key";

			const visitedEndpoints: string[] = [];

			globalThis.fetch = async (input: any) => {
				const url = String(input);
				visitedEndpoints.push(url);

				if (url.includes("api.groq.com")) {
					return new Response(
						JSON.stringify({ error: { message: "Internal server error" } }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}

				if (url.includes("api.openai.com")) {
					return new Response(
						JSON.stringify({ text: "Кариес зуба 11 вылечен пломбой Filtek." }),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					);
				}

				return new Response("Not found", { status: 404 });
			};

			const result = await transcribeWhisperCascade({
				audio: Buffer.from("audio-bytes"),
			});

			assert.strictEqual(result.provider, "openai_transcribe");
			assert.strictEqual(
				result.text,
				"Кариес зуба 11 вылечен пломбой Filtek.",
			);
			assert.strictEqual(result.fallbackOccurred, true);
			assert.strictEqual(result.attempts.length, 2);
			assert.strictEqual(result.attempts[0]?.provider, "groq_whisper");
			assert.strictEqual(result.attempts[0]?.success, false);
			assert.strictEqual(result.attempts[1]?.provider, "openai_transcribe");
			assert.strictEqual(result.attempts[1]?.success, true);
			assert.ok(result.warnings.some((w) => w.includes("openai_transcribe")));
		});

		it("cascades from Groq to OpenAI when Groq returns silence hallucination", async () => {
			process.env.GROQ_API_KEY = "groq-halluc-unique-key";
			process.env.OPENAI_API_KEY = "openai-halluc-unique-key";

			globalThis.fetch = async (input: any) => {
				const url = String(input);
				if (url.includes("api.groq.com")) {
					// Hallucination output
					return new Response(
						JSON.stringify({ text: "Продолжение следует" }),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					);
				}

				if (url.includes("api.openai.com")) {
					return new Response(
						JSON.stringify({ text: "Диагноз: К04.0 Пульпит зуба 36." }),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					);
				}

				return new Response("Not found", { status: 404 });
			};

			const result = await transcribeWhisperCascade({
				audio: Buffer.from("audio-bytes"),
			});

			assert.strictEqual(result.provider, "openai_transcribe");
			assert.strictEqual(result.text, "Диагноз: К04.0 Пульпит зуба 36.");
			assert.strictEqual(result.fallbackOccurred, true);
			assert.strictEqual(result.attempts.length, 2);
			assert.strictEqual(result.attempts[0]?.provider, "groq_whisper");
			assert.strictEqual(result.attempts[0]?.success, false);
			assert.ok(
				result.attempts[0]?.hallucinationReason?.includes(
					"Blacklisted hallucination pattern",
				),
			);
			assert.strictEqual(result.attempts[1]?.provider, "openai_transcribe");
			assert.strictEqual(result.attempts[1]?.success, true);
		});

		it("cascades through Groq -> OpenAI -> Cloudflare Workers AI", async () => {
			process.env.GROQ_API_KEY = "groq-cf-cascade-key";
			process.env.OPENAI_API_KEY = "openai-cf-cascade-key";
			process.env.CLOUDFLARE_API_TOKEN = "cf-token-cascade-key";
			process.env.CLOUDFLARE_ACCOUNT_ID = "cf-account-123";

			globalThis.fetch = async (input: any) => {
				const url = String(input);
				if (url.includes("api.groq.com")) {
					return new Response("Groq Error", { status: 503 });
				}
				if (url.includes("api.openai.com")) {
					return new Response("OpenAI Rate Limit", { status: 429 });
				}
				if (url.includes("api.cloudflare.com")) {
					return new Response(
						JSON.stringify({
							success: true,
							result: { text: "Снятие зубных отложений ультразвуком." },
						}),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					);
				}
				return new Response("Not found", { status: 404 });
			};

			const result = await transcribeWhisperCascade({
				audio: Buffer.from("audio-bytes"),
			});

			assert.strictEqual(result.provider, "cloudflare_whisper");
			assert.strictEqual(
				result.text,
				"Снятие зубных отложений ультразвуком.",
			);
			assert.strictEqual(result.fallbackOccurred, true);
			assert.strictEqual(result.attempts.length, 3);
			assert.strictEqual(result.attempts[2]?.provider, "cloudflare_whisper");
			assert.strictEqual(result.attempts[2]?.success, true);
		});

		it("falls back to Local Whisper.cpp HTTP when cloud providers fail or unconfigured", async () => {
			process.env.DENTAL_LOCAL_WHISPER_URL = "http://127.0.0.1:8080";
			process.env.DENTAL_ALLOW_REMOTE_LOCAL_BRIDGES = "true";

			globalThis.fetch = async (input: any) => {
				const url = String(input);
				if (url.includes("127.0.0.1:8080")) {
					return new Response(
						JSON.stringify({ text: "Локальная расшифровка Whisper.cpp." }),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					);
				}
				return new Response("Cloud provider failed", { status: 500 });
			};

			const result = await transcribeWhisperCascade({
				audio: Buffer.from("audio-bytes"),
			});

			assert.strictEqual(result.provider, "local_whisper");
			assert.strictEqual(result.text, "Локальная расшифровка Whisper.cpp.");
		});

		it("throws SpeechProviderRequestError with 502 when all cascade levels fail", async () => {
			process.env.GROQ_API_KEY = "groq-all-fail-key";

			globalThis.fetch = async () => {
				return new Response("Service Unavailable", { status: 503 });
			};

			await assert.rejects(
				async () => {
					await transcribeWhisperCascade({
						audio: Buffer.from("audio-bytes"),
						preferredProviders: ["groq_whisper"],
					});
				},
				(err: unknown) => {
					assert.ok(err instanceof SpeechProviderRequestError);
					assert.strictEqual((err as SpeechProviderRequestError).statusCode, 502);
					assert.ok(err.message.includes("Каскад Whisper исчерпал"));
					return true;
				},
			);
		});
	});
});
