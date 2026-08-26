/**
 * Notification Gateway Unit Tests
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { channelRegistry } from "../channelRegistry.js";
import {
	calculateBackoffSeconds,
	isSessionWindowOpen,
} from "../notificationGateway.js";
import type { AdapterResult, ChannelAdapter, OutboundMessage } from "../types.js";

describe("Notification Gateway Unit Tests", () => {
	it("calculates exponential backoff with 1h cap", () => {
		assert.equal(calculateBackoffSeconds(1), 60); // 1 minute
		assert.equal(calculateBackoffSeconds(2), 120); // 2 minutes
		assert.equal(calculateBackoffSeconds(3), 240); // 4 minutes
		assert.equal(calculateBackoffSeconds(4), 480); // 8 minutes
		assert.equal(calculateBackoffSeconds(7), 3600); // capped at 3600s
		assert.equal(calculateBackoffSeconds(10), 3600);
	});

	it("evaluates 24h Meta session window correctly", () => {
		const now = Date.now();

		// Received 2 hours ago -> window is OPEN
		const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);
		assert.equal(isSessionWindowOpen(twoHoursAgo), true);

		// Received 23.5 hours ago -> window is OPEN
		const twentyThreeHoursAgo = new Date(now - 23.5 * 60 * 60 * 1000);
		assert.equal(isSessionWindowOpen(twentyThreeHoursAgo), true);

		// Received 25 hours ago -> window is CLOSED
		const twentyFiveHoursAgo = new Date(now - 25 * 60 * 60 * 1000);
		assert.equal(isSessionWindowOpen(twentyFiveHoursAgo), false);

		// Null or undefined -> window is CLOSED
		assert.equal(isSessionWindowOpen(null), false);
		assert.equal(isSessionWindowOpen(undefined), false);
	});

	it("manages channel adapter registration and retrieval", () => {
		const mockAdapter: ChannelAdapter = {
			channel: "sms",
			adapterName: "custom_sms_provider",
			supports: async () => true,
			send: async (msg: OutboundMessage): Promise<AdapterResult> => ({
				status: "sent",
				provider: "custom_sms_provider",
				providerMessageId: "sms-msg-123",
				sentAt: new Date(),
			}),
		};

		channelRegistry.register(mockAdapter);

		const retrieved = channelRegistry.getForChannel("sms");
		assert.ok(retrieved);
		assert.equal(retrieved?.adapterName, "custom_sms_provider");

		const byName = channelRegistry.getByName("custom_sms_provider");
		assert.equal(byName?.adapterName, "custom_sms_provider");

		channelRegistry.unregister("custom_sms_provider");
		assert.equal(channelRegistry.getByName("custom_sms_provider"), null);
	});
});
