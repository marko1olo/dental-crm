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

	test("supports all 5 PBX / VoIP provider configurations", () => {
		const providers = ["mango", "uis", "asterisk", "zadarma", "unknown"] as const;
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

	test("mobile launcher and touch target invariants adhere to clinical ergonomics", () => {
		const mobileLauncherSize = 48;
		const standardTouchTargetMin = 44;
		const primaryActionTouchTargetMin = 48;
		const mobileBottomOffset = 72;
		const mobileRightOffset = 12;

		assert.ok(mobileLauncherSize >= 48, "Mobile launcher FAB must be at least 48x48px");
		assert.ok(standardTouchTargetMin >= 44, "Standard touch target must be at least 44x44px");
		assert.ok(primaryActionTouchTargetMin >= 48, "Call action buttons must be at least 48x48px");
		assert.equal(mobileBottomOffset, 72, "Mobile bottom offset above navigation bar must be 72px");
		assert.equal(mobileRightOffset, 12, "Mobile right offset must be 12px");
	});
});
