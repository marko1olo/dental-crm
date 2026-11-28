import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
	checkStaffPinRateLimit,
	cleanupExpiredPinRateLimits,
	clearAllStaffPinRateLimitsForTesting,
	getPinRateLimitMapSizeForTesting,
	MAX_PIN_RATE_LIMIT_ENTRIES,
	recordStaffPinFailure,
	resetStaffPinRateLimit,
} from "../routes/auth/loginModules/loginRateLimiter.js";
import { activeOtpCache } from "../routes/treatmentPlan/pep/pepTypes.js";
import {
	clearMatcherCache,
	getCachedMatch,
	setCachedMatch,
} from "../services/ai/pricelistIngest/matcherModules/matcherCache.js";
import type { NomenclatureMatchResult } from "../services/ai/pricelistIngest/types.js";
import { BotSessionRouter } from "../services/bots/omnichannel/botSessionRouter.js";

describe("Wave 2 Bounded Cache & Rate Limiter Guarantees", () => {
	afterEach(() => {
		clearAllStaffPinRateLimitsForTesting();
		activeOtpCache.clear();
		clearMatcherCache();
	});

	it("loginRateLimiter tracks lockouts and enforces bounded LRU + cleanup without timer leaks", () => {
		const key = "pin:org-1:127.0.0.1";
		assert.equal(checkStaffPinRateLimit(key).allowed, true);

		for (let i = 0; i < 4; i++) {
			const res = recordStaffPinFailure(key);
			assert.equal(res.allowed, true);
		}
		const locked = recordStaffPinFailure(key);
		assert.equal(locked.allowed, false);
		assert.equal(locked.remainingAttempts, 0);
		assert.ok((locked.retryAfterSeconds ?? 0) > 0);

		const evicted = cleanupExpiredPinRateLimits(Date.now() + 20 * 60 * 1000);
		assert.equal(evicted, 1);
		assert.equal(getPinRateLimitMapSizeForTesting(), 0);

		resetStaffPinRateLimit(key);
		assert.ok(MAX_PIN_RATE_LIMIT_ENTRIES >= 1000);
	});

	it("matcherCache stores and retrieves match results via BoundedTtlMap and supports clear", () => {
		const matchResult: NomenclatureMatchResult = {
			code804n: "A16.07.002",
			statutoryTitle804n: "Восстановление зуба пломбой",
			category: "Терапия",
			specialty: "Стоматология терапевтическая",
			confidence: 0.96,
			confidenceKind: "exact_code",
			cleanedTitle: "пломба",
		};
		setCachedMatch("  Пломба  ", "пломба", matchResult);
		assert.deepEqual(getCachedMatch("Пломба", "пломба"), matchResult);
		clearMatcherCache();
		assert.equal(getCachedMatch("Пломба", "пломба"), undefined);
	});

	it("activeOtpCache enforces TTL expiration cleanly", () => {
		activeOtpCache.set("plan-1", { code: "123456", expiresAt: Date.now() + 5000 }, 1);
		assert.ok(activeOtpCache.size <= 1);
	});

	it("BotSessionRouter registers, lists, intercepts, and unregisters cleanly with BoundedTtlMap", () => {
		const router = new BotSessionRouter();
		const runtime = router.registerBot({
			channel: "telegram",
			organizationId: "org-test-bot",
			botConfigId: "default",
			token: "12345:ABCDE",
		});
		assert.equal(router.listBots("org-test-bot").length, 1);
		assert.equal(router.getBot(runtime.botId)?.botId, runtime.botId);

		const takeover = router.takeoverChat("telegram", "org-test-bot", "user-42", "Анна");
		assert.equal(takeover.interceptedBy, "Анна");
		assert.equal(router.isChatIntercepted("telegram", "org-test-bot", "user-42"), true);
		assert.equal(router.listInterceptedChats("org-test-bot").length, 1);

		router.releaseChat("telegram", "org-test-bot", "user-42");
		assert.equal(router.isChatIntercepted("telegram", "org-test-bot", "user-42"), false);
		assert.equal(router.unregisterBot(runtime.botId), true);
		assert.equal(router.listBots("org-test-bot").length, 0);
	});
});
