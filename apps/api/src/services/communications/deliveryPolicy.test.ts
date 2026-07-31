import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { decideConsent, type ConsentRecord } from "./deliveryPolicy.js";
import type { CommunicationChannelCode, CommunicationConsentScope } from "./channelRouter.js";

describe("decideConsent", () => {
	it("allows service messages implicitly when there are no consent records", () => {
		const records: ConsentRecord[] = [];
		const result = decideConsent(records, "sms", "service");
		assert.deepEqual(result, { allowed: true, reason: null });
	});

	it("denies marketing messages implicitly when there are no consent records", () => {
		const records: ConsentRecord[] = [];
		const result = decideConsent(records, "sms", "marketing");
		assert.deepEqual(result, { allowed: false, reason: "Нет согласия на рекламные сообщения по этому каналу." });
	});

	it("allows messages when explicit consent is granted", () => {
		const records: ConsentRecord[] = [
			{ channel: "email", scope: "marketing", state: "granted" },
			{ channel: "sms", scope: "service", state: "granted" }
		];

		const marketingResult = decideConsent(records, "email", "marketing");
		assert.deepEqual(marketingResult, { allowed: true, reason: null });

		const serviceResult = decideConsent(records, "sms", "service");
		assert.deepEqual(serviceResult, { allowed: true, reason: null });
	});

	it("denies service messages when explicit consent is revoked", () => {
		const records: ConsentRecord[] = [
			{ channel: "telegram", scope: "service", state: "revoked" }
		];
		const result = decideConsent(records, "telegram", "service");
		assert.deepEqual(result, { allowed: false, reason: "Пациент отказался от сообщений по этому каналу." });
	});

	it("denies marketing messages when explicit consent is revoked", () => {
		const records: ConsentRecord[] = [
			{ channel: "whatsapp", scope: "marketing", state: "revoked" }
		];
		const result = decideConsent(records, "whatsapp", "marketing");
		assert.deepEqual(result, { allowed: false, reason: "Пациент отказался от рекламных сообщений по этому каналу." });
	});

	it("ignores consent records for other channels or scopes", () => {
		const records: ConsentRecord[] = [
			{ channel: "email", scope: "marketing", state: "granted" },
			{ channel: "sms", scope: "service", state: "revoked" }
		];

		// Check SMS marketing (no record, should deny)
		const smsMarketingResult = decideConsent(records, "sms", "marketing");
		assert.deepEqual(smsMarketingResult, { allowed: false, reason: "Нет согласия на рекламные сообщения по этому каналу." });

		// Check Email service (no record, should allow)
		const emailServiceResult = decideConsent(records, "email", "service");
		assert.deepEqual(emailServiceResult, { allowed: true, reason: null });
	});
});
