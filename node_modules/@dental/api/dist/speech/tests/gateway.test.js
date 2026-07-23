import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { speechJsonBodyLimitBytes, getSpeechGatewayStatus } from "../gateway.js";
describe("speechJsonBodyLimitBytes", () => {
    it("should calculate correct limit based on default env value when env var is not set", () => {
        const originalEnv = process.env.DENTAL_SPEECH_MAX_CHUNK_BYTES;
        try {
            delete process.env.DENTAL_SPEECH_MAX_CHUNK_BYTES;
            // 6_000_000 is default * 1.4 + 4096 = 8404096
            assert.strictEqual(speechJsonBodyLimitBytes(), 8404096);
        }
        finally {
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
        }
        finally {
            if (originalEnv !== undefined) {
                process.env.DENTAL_SPEECH_MAX_CHUNK_BYTES = originalEnv;
            }
            else {
                delete process.env.DENTAL_SPEECH_MAX_CHUNK_BYTES;
            }
        }
    });
});
describe("getSpeechGatewayStatus", () => {
    let originalEnv;
    beforeEach(() => {
        originalEnv = process.env;
        process.env = { ...originalEnv };
        // Clear out speech related env vars to start fresh
        delete process.env.DENTAL_SPEECH_PROVIDER;
        delete process.env.GROQ_API_KEY;
        delete process.env.DENTAL_LOCAL_WHISPER_URL;
        delete process.env.DENTAL_LOCAL_WHISPER_TRANSCRIBE_URL;
        delete process.env.DENTAL_SPEECH_MAX_CHUNK_BYTES;
        delete process.env.DENTAL_SPEECH_RECOMMENDED_CHUNK_MS;
        delete process.env.DENTAL_SPEECH_MIN_CHUNK_MS;
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
        process.env.DENTAL_LOCAL_WHISPER_TRANSCRIBE_URL = "http://localhost:1234/transcribe";
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
