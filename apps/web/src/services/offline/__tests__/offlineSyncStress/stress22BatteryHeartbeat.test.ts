import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	HEARTBEAT_INTERVAL_ACTIVE_MS,
	HEARTBEAT_INTERVAL_IDLE_MS,
	HEARTBEAT_INTERVAL_LOW_BATTERY_MS,
	lanHeartbeatManager,
} from "../../../lanDiscovery/lanServerDiscovery";
import { offlineSyncService } from "../../index";

describe("STRESS 22: Low battery power-saving mode", () => {
	test("Switch LAN heartbeats to ultra-quiet while keeping instant UI response", async () => {
		const mockBattery = {
			level: 0.1,
			charging: false,
			chargingTime: Infinity,
			dischargingTime: 1800,
			addEventListener: () => {},
			removeEventListener: () => {},
		};

		const hadNav = typeof globalThis.navigator !== "undefined";
		if (!hadNav) (globalThis as any).navigator = {};

		Object.defineProperty(globalThis.navigator, "getBattery", {
			value: async () => mockBattery,
			configurable: true,
			writable: true,
		});

		try {
			const isSaverActive = await offlineSyncService.isBatterySaverActive();
			assert.strictEqual(isSaverActive, true);

			await lanHeartbeatManager.checkBatteryStatus();
			assert.strictEqual(lanHeartbeatManager.getInterval(), HEARTBEAT_INTERVAL_LOW_BATTERY_MS);
			assert.strictEqual(lanHeartbeatManager.getState().isLowBatteryDischarging, true);

			mockBattery.charging = true;
			await lanHeartbeatManager.checkBatteryStatus();
			assert.strictEqual(lanHeartbeatManager.getInterval(), HEARTBEAT_INTERVAL_IDLE_MS);

			mockBattery.charging = false;
			await lanHeartbeatManager.checkBatteryStatus();
			lanHeartbeatManager.setCloudReachable(false);
			assert.strictEqual(lanHeartbeatManager.getInterval(), HEARTBEAT_INTERVAL_ACTIVE_MS);

			lanHeartbeatManager.setCloudReachable(true);
			assert.strictEqual(lanHeartbeatManager.getInterval(), HEARTBEAT_INTERVAL_LOW_BATTERY_MS);
		} finally {
			try { delete (globalThis.navigator as any).getBattery; } catch {}
			lanHeartbeatManager.setLowBatteryState(false);
			lanHeartbeatManager.setCloudReachable(true);
		}
	});
});
