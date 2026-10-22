import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "vitest";
import { CHANNEL_BADGE_COLORS, CHANNEL_DISPLAY_NAMES } from "../telephonyAttribution";

describe("Telephony Lead Capture Visual & Ergonomics Integrity (Miller's Law & Tokens)", () => {
	const srcDir = fs.existsSync(path.resolve(process.cwd(), "apps/web/src"))
		? path.resolve(process.cwd(), "apps/web/src")
		: path.resolve(process.cwd(), "src");

	const callerCardPath = path.resolve(srcDir, "components/telephony/IncomingCallerCard.tsx");
	const badgeMoreMenuPath = path.resolve(srcDir, "components/telephony/IncomingCallBadgeMoreMenu.tsx");
	const drawerPanelPath = path.resolve(srcDir, "components/telephony/drawerModules/TelephonyActiveCallPanel.tsx");
	const widgetMoreMenuPath = path.resolve(srcDir, "components/telephony/TelephonyWidgetMoreMenu.tsx");

	it("3.1. IncomingCallPopup provides 1-click lead capture and marketing attribution badge", () => {
		const callerCardSource = fs.readFileSync(callerCardPath, "utf-8");
		const badgeMoreMenuSource = fs.readFileSync(badgeMoreMenuPath, "utf-8");

		assert.ok(callerCardSource.includes('data-testid="incoming-call-marketing-channel-badge"'));
		assert.ok(badgeMoreMenuSource.includes('data-testid="badge-action-capture-lead"'));
		assert.ok(callerCardSource.includes('data-testid="drawer-action-capture-lead"'));
	});

	it("3.2. TelephonyDrawer provides dedicated 1-click lead capture card with attribution", () => {
		const drawerPanelSource = fs.readFileSync(drawerPanelPath, "utf-8");

		assert.ok(drawerPanelSource.includes('data-testid="telephony-drawer-marketing-channel-badge"'));
		assert.ok(drawerPanelSource.includes('data-testid="telephony-drawer-lead-capture-card"'));
		assert.ok(drawerPanelSource.includes('data-testid="drawer-action-capture-lead"'));
	});

	it("3.3. TelephonyFloatingWidget provides 1-click lead capture in consolidated more menu", () => {
		const widgetMoreMenuSource = fs.readFileSync(widgetMoreMenuPath, "utf-8");
		assert.ok(widgetMoreMenuSource.includes('data-testid="widget-action-capture-lead"'));
	});

	it("3.4. All 8 canonical marketing channels have defined display names and tokens", () => {
		const expectedKeys = [
			"yandex_direct",
			"gis_2",
			"prodoctorov",
			"napopravku",
			"site_seo",
			"social_media",
			"recommendations",
			"other",
		];

		for (const key of expectedKeys) {
			assert.ok(CHANNEL_DISPLAY_NAMES[key as keyof typeof CHANNEL_DISPLAY_NAMES], `Missing display name for ${key}`);
			assert.ok(CHANNEL_BADGE_COLORS[key as keyof typeof CHANNEL_BADGE_COLORS], `Missing badge colors for ${key}`);
		}
	});
});
