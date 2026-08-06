import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
	getSpeechGatewayStatus,
	speechJsonBodyLimitBytes,
} from "../gateway.js";

describe("speechJsonBodyLimitBytes", () => {
	it("should calculate correct limit based on default env value when env var is not set", () => {
		const originalEnv = process.env.DENTAL_SPEECH_MAX_CHUNK_BYTES;
		try {
			delete process.env.DENTAL_SPEECH_MAX_CHUNK_BYTES;

			// 6_000_000 is default * 1.4 + 4096 = 8404096
			assert.strictEqual(speechJsonBodyLimitBytes(), 8404096);
		} finally {
			if (originalEnv !== undefined) {
				process.env.DENTAL_SPEECH_MAX_CHUNK_BYTES = originalEnv;
			}
		}
	});

	it("should calculate correct limit based on custom env value", () => {
		const originalEnv = process.env.DENTAL_SPEECH_MAX_CHUNK_BYTES;
		try {
			process.env.DENTAL_SPEECH_MAX_CHUNK_BYTES = "1000000";

			// 1_000_000 * 1.4 = 1_400_000. 1_400_000 + 4096 = 1404096
			assert.strictEqual(speechJsonBodyLimitBytes(), 1404096);
		} finally {
			if (originalEnv !== undefined) {
				process.env.DENTAL_SPEECH_MAX_CHUNK_BYTES = originalEnv;
			} else {
				delete process.env.DENTAL_SPEECH_MAX_CHUNK_BYTES;
			}
		}
	});
});

/**
 * Любой настроенный провайдер выбирается автоматически, если явный не задан
 * (resolveSpeechProvider: режимы "auto" и "fallback"). Поэтому проверять
 * «ничего не настроено» можно, только убрав ключи ВСЕХ провайдеров.
 *
 * Тесты удаляли лишь GROQ_API_KEY, а рабочий .env задаёт GROQ_API_KEYS —
 * списочный вариант того же ключа. Groq оставался настроенным, подхватывался
 * автоматически, и три проверки получали groq_whisper/manual вместо
 * none/disabled. Результат зависел от .env конкретной машины: на пустом
 * окружении тесты проходили, на рабочем — падали.
 *
 * Стираем по шаблону имён, а не списком: при добавлении провайдера в
 * providerKeySpecs герметичность не потеряется молча.
 */
const SPEECH_ENV_PATTERN =
	/^(DENTAL_SPEECH_|DENTAL_LOCAL_WHISPER_|DENTAL_VOSK_|GROQ_|OPENAI_|DEEPGRAM_|ASSEMBLYAI_|CLOUDFLARE_|AZURE_SPEECH_|GOOGLE_API_KEY|GOOGLE_APPLICATION_CREDENTIALS|HUGGINGFACE_|HF_TOKEN|VOSK_|LOCAL_VOSK_|LOCAL_WHISPER_|WHISPER_CPP_)/;

describe("getSpeechGatewayStatus", () => {
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(() => {
		originalEnv = process.env;
		process.env = { ...originalEnv };
		for (const name of Object.keys(process.env)) {
			if (SPEECH_ENV_PATTERN.test(name)) delete process.env[name];
		}
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("should return default state when no environment variables are set", () => {
		const status = getSpeechGatewayStatus();
		assert.strictEqual(status.providerId, "none");
		assert.strictEqual(status.requestedProviderId, "none");
		assert.strictEqual(status.providerSelectionMode, "disabled");
		assert.strictEqual(status.serverTranscriptionEnabled, false);
		assert.strictEqual(status.keyConfigured, false);
	});

	it("should handle external provider groq_whisper with keys configured", () => {
		process.env.DENTAL_SPEECH_PROVIDER = "groq_whisper";
		process.env.GROQ_API_KEY = "test_key";
		const status = getSpeechGatewayStatus();
		assert.strictEqual(status.providerId, "groq_whisper");
		assert.strictEqual(status.requestedProviderId, "groq_whisper");
		assert.strictEqual(status.providerSelectionMode, "manual");
		assert.strictEqual(status.serverTranscriptionEnabled, true);
		assert.strictEqual(status.keyConfigured, true);
	});

	it("should handle external provider groq_whisper with missing config", () => {
		process.env.DENTAL_SPEECH_PROVIDER = "groq_whisper";
		// Missing GROQ_API_KEY
		const status = getSpeechGatewayStatus();
		assert.strictEqual(status.providerId, "groq_whisper");
		assert.strictEqual(status.requestedProviderId, "groq_whisper");
		assert.strictEqual(status.providerSelectionMode, "disabled"); // Because not configured
		assert.strictEqual(status.serverTranscriptionEnabled, false);
		assert.strictEqual(status.keyConfigured, false);
	});

	it("should handle local provider local_whisper with URL configured", () => {
		process.env.DENTAL_SPEECH_PROVIDER = "local_whisper";
		process.env.DENTAL_LOCAL_WHISPER_URL = "http://localhost:1234";
		process.env.DENTAL_LOCAL_WHISPER_TRANSCRIBE_URL =
			"http://localhost:1234/transcribe";
		const status = getSpeechGatewayStatus();
		assert.strictEqual(status.providerId, "local_whisper");
		assert.strictEqual(status.requestedProviderId, "local_whisper");
		assert.strictEqual(status.providerSelectionMode, "manual");
		assert.strictEqual(status.serverTranscriptionEnabled, true);
		assert.strictEqual(status.keyConfigured, true);
	});

	it("should handle local provider local_whisper with missing config", () => {
		process.env.DENTAL_SPEECH_PROVIDER = "local_whisper";
		// Missing URLs
		const status = getSpeechGatewayStatus();
		assert.strictEqual(status.providerId, "local_whisper");
		assert.strictEqual(status.requestedProviderId, "local_whisper");
		assert.strictEqual(status.providerSelectionMode, "disabled");
		assert.strictEqual(status.serverTranscriptionEnabled, false);
		// When config is missing, providerReady is false, so keyConfigured is false for local providers
		assert.strictEqual(status.keyConfigured, false);
	});

	it("should apply threshold environment variables", () => {
		process.env.DENTAL_SPEECH_MAX_CHUNK_BYTES = "1234567";
		process.env.DENTAL_SPEECH_RECOMMENDED_CHUNK_MS = "23456";
		process.env.DENTAL_SPEECH_MIN_CHUNK_MS = "12345";

		const status = getSpeechGatewayStatus();

		assert.strictEqual(status.maxChunkBytes, 1234567);
		assert.strictEqual(status.recommendedChunkMs, 23456);
		assert.strictEqual(status.chunkingPolicy.minChunkMs, 12345);
	});
});
