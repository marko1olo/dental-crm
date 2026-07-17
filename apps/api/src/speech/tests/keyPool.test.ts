import assert from "node:assert";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import {
	getProviderKeyHealthSnapshots,
	recordProviderKeySuccess,
	recordProviderKeyFailure,
	getProviderKeyCandidates,
	providerHttpError,
} from "../keyPool.js";

describe("getProviderKeyHealthSnapshots", () => {
	let originalEnv: NodeJS.ProcessEnv;
    const originalDateNow = Date.now;
    const originalToISOString = Date.prototype.toISOString;

	beforeEach(() => {
		originalEnv = { ...process.env };
        process.env.DENTAL_SPEECH_KEY_HEALTH_FILE = "off";

        Date.now = () => new Date("2025-01-01T12:00:00.000Z").getTime();
        Date.prototype.toISOString = function() {
            if (this.getTime() === new Date("2025-01-01T12:00:00.000Z").getTime()) {
                return "2025-01-01T12:00:00.000Z";
            }
            if (this.getTime() === new Date("2025-01-01T12:01:00.000Z").getTime()) {
                return "2025-01-01T12:01:00.000Z";
            }
            return originalToISOString.call(this);
        };
	});

	afterEach(() => {
		process.env = originalEnv;
        Date.now = originalDateNow;
        Date.prototype.toISOString = originalToISOString;
	});

	it("should return empty array if no keys are configured", () => {
		const snapshots = getProviderKeyHealthSnapshots("groq_whisper");
		assert.strictEqual(snapshots.length, 0);
	});

	it("should return health snapshot for a single configured key", () => {
		process.env.GROQ_API_KEY = "test_key_config";

		const snapshots = getProviderKeyHealthSnapshots("groq_whisper");
		assert.strictEqual(snapshots.length, 1);
		assert.strictEqual(snapshots[0]?.source, "GROQ_API_KEY");
		assert.strictEqual(snapshots[0]?.ordinal, 1);
		assert.strictEqual(snapshots[0]?.available, true);
		assert.strictEqual(snapshots[0]?.coolingDownUntil, null);
		assert.strictEqual(snapshots[0]?.failures, 0);
		assert.strictEqual(snapshots[0]?.successes, 0);
		assert.strictEqual(snapshots[0]?.lastUsedAt, null);
		assert.strictEqual(snapshots[0]?.lastStatusCode, null);
		assert.strictEqual(snapshots[0]?.lastError, null);
	});

	it("should reflect success in the health snapshot", () => {
		process.env.GROQ_API_KEY = "test_key_success";

		const candidates = getProviderKeyCandidates("groq_whisper");
		recordProviderKeySuccess("groq_whisper", candidates[0]!);

		const snapshots = getProviderKeyHealthSnapshots("groq_whisper");
		assert.strictEqual(snapshots.length, 1);
		assert.strictEqual(snapshots[0]?.available, true);
		assert.strictEqual(snapshots[0]?.successes, 1);
		assert.strictEqual(snapshots[0]?.failures, 0);
		assert.strictEqual(snapshots[0]?.lastUsedAt, "2025-01-01T12:00:00.000Z");
	});

	it("should reflect failure and cooldown in the health snapshot", () => {
		process.env.GROQ_API_KEY = "test_key_failure";

		const candidates = getProviderKeyCandidates("groq_whisper");
		const error = providerHttpError(429, "Too Many Requests");
		recordProviderKeyFailure("groq_whisper", candidates[0]!, error);

		const snapshots = getProviderKeyHealthSnapshots("groq_whisper");
		assert.strictEqual(snapshots.length, 1);
		assert.strictEqual(snapshots[0]?.available, false);
		assert.strictEqual(snapshots[0]?.successes, 0);
		assert.strictEqual(snapshots[0]?.failures, 1);
		assert.ok(snapshots[0]?.coolingDownUntil);
		assert.strictEqual(snapshots[0]?.lastUsedAt, "2025-01-01T12:00:00.000Z");
		assert.strictEqual(snapshots[0]?.lastStatusCode, 429);
		assert.strictEqual(snapshots[0]?.lastError, "429 Too Many Requests");
	});

    it("should recover from cooldown after time passes", () => {
		process.env.GROQ_API_KEY = "test_key_recovery";

		const candidates = getProviderKeyCandidates("groq_whisper");
		const error = providerHttpError(429, "Too Many Requests");
		recordProviderKeyFailure("groq_whisper", candidates[0]!, error);

		let snapshots = getProviderKeyHealthSnapshots("groq_whisper");
		assert.strictEqual(snapshots[0]?.available, false);

        // Fast forward time past the cooldown (60 seconds for rate limit)
        Date.now = () => new Date("2025-01-01T12:01:01.000Z").getTime();

        snapshots = getProviderKeyHealthSnapshots("groq_whisper");
		assert.strictEqual(snapshots[0]?.available, true);
	});
});
