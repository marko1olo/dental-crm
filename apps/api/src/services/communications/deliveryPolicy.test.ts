import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
	minuteOfDayInTimeZone,
	isQuietMinute,
	minutesUntilQuietHoursEnd,
	decideQuietHours,
	decideConsent,
	isRetryableErrorClass,
	isSuppressingErrorClass,
	computeRetryDelaySeconds,
	decideAfterFailure
} from "./deliveryPolicy.js";
import type { CommunicationChannelCode, CommunicationConsentScope } from "./channelRouter.js";

describe("deliveryPolicy", () => {
	describe("minuteOfDayInTimeZone", () => {
		it("calculates correct minute for UTC", () => {
			const date = new Date("2023-10-15T14:30:00Z");
			assert.equal(minuteOfDayInTimeZone(date, "UTC"), 14 * 60 + 30);
		});

		it("calculates correct minute for Europe/Moscow", () => {
			const date = new Date("2023-10-15T14:30:00Z"); // 17:30 in Moscow
			assert.equal(minuteOfDayInTimeZone(date, "Europe/Moscow"), 17 * 60 + 30);
		});

		it("handles midnight correctly", () => {
			const date = new Date("2023-10-15T00:00:00Z");
			assert.equal(minuteOfDayInTimeZone(date, "UTC"), 0);
		});

		it("handles end of day correctly", () => {
			const date = new Date("2023-10-15T23:59:00Z");
			assert.equal(minuteOfDayInTimeZone(date, "UTC"), 23 * 60 + 59);
		});

		it("falls back to UTC on invalid timezone", () => {
			const date = new Date("2023-10-15T14:30:00Z");
			assert.equal(minuteOfDayInTimeZone(date, "Invalid/TimeZone"), 14 * 60 + 30);
		});
	});

	describe("isQuietMinute", () => {
		it("returns false when start equals end", () => {
			assert.equal(isQuietMinute(600, 600, 600), false);
		});

		it("handles same-day quiet hours (start < end)", () => {
			const start = 10 * 60; // 10:00
			const end = 18 * 60; // 18:00

			assert.equal(isQuietMinute(9 * 60, start, end), false); // 09:00 - not quiet
			assert.equal(isQuietMinute(10 * 60, start, end), true); // 10:00 - quiet
			assert.equal(isQuietMinute(12 * 60, start, end), true); // 12:00 - quiet
			assert.equal(isQuietMinute(18 * 60, start, end), false); // 18:00 - not quiet
		});

		it("handles overnight quiet hours (start > end)", () => {
			const start = 21 * 60; // 21:00
			const end = 9 * 60; // 09:00

			assert.equal(isQuietMinute(20 * 60, start, end), false); // 20:00 - not quiet
			assert.equal(isQuietMinute(21 * 60, start, end), true); // 21:00 - quiet
			assert.equal(isQuietMinute(23 * 60, start, end), true); // 23:00 - quiet
			assert.equal(isQuietMinute(2 * 60, start, end), true); // 02:00 - quiet
			assert.equal(isQuietMinute(9 * 60, start, end), false); // 09:00 - not quiet
			assert.equal(isQuietMinute(10 * 60, start, end), false); // 10:00 - not quiet
		});

		it("normalizes negative values or values >= 1440", () => {
			const start = 21 * 60;
			const end = 9 * 60;
			assert.equal(isQuietMinute(-60, start, end), true); // 23:00 yesterday
			assert.equal(isQuietMinute(1440 + 2 * 60, start, end), true); // 02:00 tomorrow
		});
	});

	describe("minutesUntilQuietHoursEnd", () => {
		it("returns 0 if not in quiet hours", () => {
			assert.equal(minutesUntilQuietHoursEnd(12 * 60, 21 * 60, 9 * 60), 0);
		});

		it("returns correct minutes for same-day quiet hours", () => {
			const start = 10 * 60;
			const end = 18 * 60;
			assert.equal(minutesUntilQuietHoursEnd(12 * 60, start, end), 6 * 60); // 6 hours left
			assert.equal(minutesUntilQuietHoursEnd(17 * 60 + 30, start, end), 30); // 30 mins left
		});

		it("returns correct minutes for overnight quiet hours", () => {
			const start = 21 * 60;
			const end = 9 * 60;
			assert.equal(minutesUntilQuietHoursEnd(22 * 60, start, end), 11 * 60); // 11 hours left
			assert.equal(minutesUntilQuietHoursEnd(2 * 60, start, end), 7 * 60); // 7 hours left
		});

		it("returns 0 when start equals end", () => {
			assert.equal(minutesUntilQuietHoursEnd(600, 600, 600), 0);
		});
	});

	describe("decideQuietHours", () => {
		const settingsBase = {
			timezone: "UTC",
			quietHoursStartMinute: 21 * 60,
			quietHoursEndMinute: 9 * 60,
			deferServiceInQuietHours: true,
			blockMarketingInQuietHours: true
		};

		it("sends immediately if not in quiet hours", () => {
			const now = new Date("2023-10-15T12:00:00Z");
			assert.deepEqual(decideQuietHours(now, "service", settingsBase), { action: "send" });
			assert.deepEqual(decideQuietHours(now, "marketing", settingsBase), { action: "send" });
		});

		it("handles marketing in quiet hours (blocked)", () => {
			const now = new Date("2023-10-15T22:00:00Z");
			assert.deepEqual(decideQuietHours(now, "marketing", settingsBase), {
				action: "suppress",
				reason: "Рекламное сообщение в тихие часы не отправляется."
			});
		});

		it("handles marketing in quiet hours (not blocked)", () => {
			const now = new Date("2023-10-15T22:00:00Z");
			const settings = { ...settingsBase, blockMarketingInQuietHours: false };
			assert.deepEqual(decideQuietHours(now, "marketing", settings), { action: "send" });
		});

		it("handles service in quiet hours (deferred)", () => {
			const now = new Date("2023-10-15T22:00:00Z");
			const decision = decideQuietHours(now, "service", settingsBase);

			// 11 hours until 9:00 next day
			const expectedDate = new Date(now.getTime() + 11 * 60 * 60_000);
			assert.deepEqual(decision, { action: "defer", notBefore: expectedDate });
		});

		it("handles service in quiet hours (not deferred)", () => {
			const now = new Date("2023-10-15T22:00:00Z");
			const settings = { ...settingsBase, deferServiceInQuietHours: false };
			assert.deepEqual(decideQuietHours(now, "service", settings), { action: "send" });
		});
	});

	describe("decideConsent", () => {
		const records = [
			{ channel: "sms" as CommunicationChannelCode, scope: "marketing" as CommunicationConsentScope, state: "granted" as const },
			{ channel: "email" as CommunicationChannelCode, scope: "marketing" as CommunicationConsentScope, state: "revoked" as const },
			{ channel: "telegram" as CommunicationChannelCode, scope: "service" as CommunicationConsentScope, state: "revoked" as const }
		];

		it("allows service by default", () => {
			assert.deepEqual(decideConsent(records, "sms" as CommunicationChannelCode, "service"), { allowed: true, reason: null });
		});

		it("blocks marketing by default", () => {
			assert.deepEqual(decideConsent(records, "telegram" as CommunicationChannelCode, "marketing"), {
				allowed: false,
				reason: "Нет согласия на рекламные сообщения по этому каналу."
			});
		});

		it("allows when explicitly granted", () => {
			assert.deepEqual(decideConsent(records, "sms" as CommunicationChannelCode, "marketing"), { allowed: true, reason: null });
		});

		it("blocks when explicitly revoked (marketing)", () => {
			assert.deepEqual(decideConsent(records, "email" as CommunicationChannelCode, "marketing"), {
				allowed: false,
				reason: "Пациент отказался от рекламных сообщений по этому каналу."
			});
		});

		it("blocks when explicitly revoked (service)", () => {
			assert.deepEqual(decideConsent(records, "telegram" as CommunicationChannelCode, "service"), {
				allowed: false,
				reason: "Пациент отказался от сообщений по этому каналу."
			});
		});
	});

	describe("isRetryableErrorClass", () => {
		it("returns true for retryable errors", () => {
			assert.equal(isRetryableErrorClass("rate_limited"), true);
			assert.equal(isRetryableErrorClass("timeout"), true);
			assert.equal(isRetryableErrorClass("network"), true);
			assert.equal(isRetryableErrorClass("server"), true);
			assert.equal(isRetryableErrorClass("insufficient_funds"), true);
			assert.equal(isRetryableErrorClass("unknown"), true);
		});

		it("returns false for non-retryable errors", () => {
			assert.equal(isRetryableErrorClass("not_configured"), false);
			assert.equal(isRetryableErrorClass("auth"), false);
			assert.equal(isRetryableErrorClass("recipient_unavailable"), false);
			assert.equal(isRetryableErrorClass("chat_blocked"), false);
			assert.equal(isRetryableErrorClass("bad_request"), false);
		});
	});

	describe("isSuppressingErrorClass", () => {
		it("returns true for not_configured", () => {
			assert.equal(isSuppressingErrorClass("not_configured"), true);
		});

		it("returns false for other errors", () => {
			assert.equal(isSuppressingErrorClass("auth"), false);
			assert.equal(isSuppressingErrorClass("timeout"), false);
		});
	});

	describe("computeRetryDelaySeconds", () => {
		const settings = { retryBaseSeconds: 60, retryMaxSeconds: 3600 };

		it("computes exponential backoff", () => {
			const delay1 = computeRetryDelaySeconds(1, "network", settings, "seed");
			assert.ok(delay1 >= 60 * 0.8 && delay1 <= 60 * 1.2);

			const delay2 = computeRetryDelaySeconds(2, "network", settings, "seed");
			assert.ok(delay2 >= 120 * 0.8 && delay2 <= 120 * 1.2);

			const delay3 = computeRetryDelaySeconds(3, "network", settings, "seed");
			assert.ok(delay3 >= 240 * 0.8 && delay3 <= 240 * 1.2);
		});

		it("respects ceiling", () => {
			const delay = computeRetryDelaySeconds(10, "network", settings, "seed"); // 60 * 2^9 = 30720 > 3600
			assert.ok(delay >= 3600 * 0.8 && delay <= 3600 * 1.2);
		});

		it("handles insufficient_funds floor", () => {
			const delay = computeRetryDelaySeconds(1, "insufficient_funds", settings, "seed");
			assert.ok(delay >= 1800 * 0.8 && delay <= 1800 * 1.2);
		});

		it("computes reproducibly with same seed and attempt", () => {
			const delayA = computeRetryDelaySeconds(1, "network", settings, "test");
			const delayB = computeRetryDelaySeconds(1, "network", settings, "test");
			assert.equal(delayA, delayB);
		});
	});

	describe("decideAfterFailure", () => {
		const settings = { retryBaseSeconds: 60, retryMaxSeconds: 3600 };

		it("suppresses not_configured", () => {
			const result = decideAfterFailure({
				attempt: 1,
				maxAttempts: 3,
				errorClass: "not_configured",
				errorMessage: "No token",
				settings
			});
			assert.deepEqual(result, {
				kind: "suppressed",
				errorClass: "not_configured",
				errorMessage: "No token"
			});
		});

		it("fails non-retryable errors immediately", () => {
			const result = decideAfterFailure({
				attempt: 1,
				maxAttempts: 3,
				errorClass: "auth",
				errorMessage: "Bad auth",
				settings
			});
			assert.deepEqual(result, {
				kind: "failed",
				errorClass: "auth",
				errorMessage: "Bad auth"
			});
		});

		it("fails retryable errors if max attempts reached", () => {
			const result = decideAfterFailure({
				attempt: 3,
				maxAttempts: 3,
				errorClass: "network",
				errorMessage: "Timeout",
				settings
			});
			assert.deepEqual(result, {
				kind: "failed",
				errorClass: "network",
				errorMessage: "Timeout"
			});
		});

		it("retries retryable errors if within max attempts", () => {
			const result = decideAfterFailure({
				attempt: 1,
				maxAttempts: 3,
				errorClass: "network",
				errorMessage: "Timeout",
				settings,
				jitterSeed: "seed"
			});
			assert.equal(result.kind, "retry");
			assert.equal((result as any).errorClass, "network");
			assert.equal((result as any).errorMessage, "Timeout");
			assert.ok("delaySeconds" in result && typeof (result as any).delaySeconds === "number");
		});
	});
});
