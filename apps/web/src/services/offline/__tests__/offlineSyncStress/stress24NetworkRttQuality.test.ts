import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	formatRttLabel,
	getRttQuality,
} from "../../../../utils/networkConnectivity";

describe("STRESS 24: Network RTT micro-indicator latency tiers", () => {
	test("Measure and grade latency", () => {
		assert.strictEqual(getRttQuality(5, true), "good");
		assert.strictEqual(getRttQuality(100, true), "good");
		assert.strictEqual(getRttQuality(101, true), "moderate");
		assert.strictEqual(getRttQuality(400, true), "moderate");
		assert.strictEqual(getRttQuality(401, true), "poor");
		assert.strictEqual(getRttQuality(null, false), "offline");

		assert.strictEqual(formatRttLabel("cloud_online", 15), "Облако (15 мс)");
		assert.strictEqual(formatRttLabel("lan_online", 2), "Локальный Wi-Fi (2 мс)");
		assert.strictEqual(formatRttLabel("offline", null), "Офлайн (0 мс)");
	});
});
