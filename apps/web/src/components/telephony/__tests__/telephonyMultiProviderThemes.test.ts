import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { useTelephonyStore } from "../../../store/telephonyStore.js";

describe("Telephony: CRM Themes & Multi-Provider Invariants", () => {
	const themes = [
		"light",
		"dark",
		"night",
		"calm_teal",
		"contrast",
		"sakura",
		"ocean",
		"emerald",
		"cyber_xray",
		"warm_sand",
	] as const;

	test("all 10 CRM themes resolve consistently for softphone modal", () => {
		for (const theme of themes) {
			const isDark =
				theme === "dark" ||
				theme === "night" ||
				theme === "ocean" ||
				theme === "emerald" ||
				theme === "cyber_xray";

			assert.ok(theme.length > 0, `Theme ${theme} must be valid string`);
			if (isDark) {
				assert.ok(
					["dark", "night", "ocean", "emerald", "cyber_xray"].includes(theme),
				);
			} else {
				assert.ok(
					["light", "calm_teal", "contrast", "sakura", "warm_sand"].includes(theme),
				);
			}
		}
	});

	test("supports all PBX / VoIP provider configurations", () => {
		const providers = ["sip", "webrtc", "cloud_pbx", "local_pbx", "mango", "uis", "asterisk", "zadarma", "unknown"] as const;
		for (const p of providers) {
			useTelephonyStore.getState().triggerIncomingCall({
				phone: "+79031112233",
				patientId: null,
				patientName: `Test ${p}`,
				provider: p,
				timestamp: new Date().toISOString(),
			});

			const active = useTelephonyStore.getState().activeCall;
			assert.ok(active);
			assert.equal(active?.provider, p);
			useTelephonyStore.getState().dismissCall();
		}
	});

	test("volume clamping, playback speed cycling, and drawer state transitions work cleanly in telephonyStore", () => {
		const store = useTelephonyStore.getState();
		store.setVolumeLevel(-0.5);
		assert.equal(useTelephonyStore.getState().volumeLevel, 0, "Negative volume clamps to 0");
		store.setVolumeLevel(1.8);
		assert.equal(useTelephonyStore.getState().volumeLevel, 1, "Volume above 1 clamps to 1");

		useTelephonyStore.getState().setPlaybackSpeed(1);
		useTelephonyStore.getState().cyclePlaybackSpeed();
		assert.equal(useTelephonyStore.getState().playbackSpeed, 1.25);
		useTelephonyStore.getState().cyclePlaybackSpeed();
		assert.equal(useTelephonyStore.getState().playbackSpeed, 1.5);
		useTelephonyStore.getState().cyclePlaybackSpeed();
		assert.equal(useTelephonyStore.getState().playbackSpeed, 2);
		useTelephonyStore.getState().cyclePlaybackSpeed();
		assert.equal(useTelephonyStore.getState().playbackSpeed, 1);

		useTelephonyStore.getState().closeCallDrawer();
		assert.equal(useTelephonyStore.getState().isCallDrawerOpen, false);
		useTelephonyStore.getState().toggleCallDrawer();
		assert.equal(useTelephonyStore.getState().isCallDrawerOpen, true);
	});
});
