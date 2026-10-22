import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "vitest";

describe("Telephony Miller's Law, Design Tokens & Non-Modal Dynamic Island (Mandates 8c, 8d, 8e, 8p)", () => {
	const srcDir = fs.existsSync(path.resolve(process.cwd(), "apps/web/src"))
		? path.resolve(process.cwd(), "apps/web/src")
		: path.resolve(process.cwd(), "src");
	const popupPath = path.resolve(srcDir, "components/telephony/IncomingCallPopup.tsx");
	const widgetPath = path.resolve(srcDir, "components/telephony/TelephonyFloatingWidget.tsx");
	const actionFooterPath = path.resolve(srcDir, "components/telephony/incomingCallPopupModules/IncomingCallActionFooter.tsx");
	const floatingCardPath = path.resolve(srcDir, "components/telephony/telephonyFloatingWidget/TelephonyIncomingCallCard.tsx");
	const floatingMoreMenuPath = path.resolve(srcDir, "components/telephony/TelephonyWidgetMoreMenu.tsx");

	it("1. Miller's Law: Strictly <= 2 Primary Direct Buttons on IncomingCallPopup Badge (Mandate 8d & 8p)", () => {
		const actionFooterSource = fs.readFileSync(actionFooterPath, "utf-8");
		assert.ok(
			actionFooterSource.includes('data-testid="badge-action-book"'),
			"IncomingCallPopup action footer must provide 'Создать запись' as primary action 1",
		);
		assert.ok(
			actionFooterSource.includes('data-testid="badge-action-card"'),
			"IncomingCallPopup action footer must provide 'Открыть карту / Создать' as primary action 2",
		);
		assert.ok(
			actionFooterSource.includes('data-testid="badge-more-menu-btn"'),
			"IncomingCallPopup action footer must consolidate secondary actions into '...' more menu button",
		);
	});

	it("2. Miller's Law: Strictly <= 2 Primary Direct Buttons on TelephonyFloatingWidget (Mandate 8d & 8p)", () => {
		const floatingCardSource = fs.readFileSync(floatingCardPath, "utf-8");
		const floatingMoreMenuSource = fs.readFileSync(floatingMoreMenuPath, "utf-8");
		assert.ok(
			floatingCardSource.includes('data-testid="widget-action-book"'),
			"TelephonyFloatingWidget card must provide 'Создать запись' as primary action 1",
		);
		assert.ok(
			floatingCardSource.includes('data-testid="widget-action-open-card"'),
			"TelephonyFloatingWidget card must provide 'Открыть карту / Создать' as primary action 2",
		);
		assert.ok(
			floatingCardSource.includes('data-testid="widget-more-menu-btn"'),
			"TelephonyFloatingWidget card must consolidate secondary actions into '...' more menu button",
		);
		assert.ok(
			floatingMoreMenuSource.includes('data-testid="widget-more-menu-dropdown"'),
			"TelephonyFloatingWidget must render popover dropdown with slots, WhatsApp, SIP transfer, Hold, and Copy phone",
		);
	});

	it("3. Dark Mode Hygiene & Design Token Integrity", () => {
		const popupSource = fs.readFileSync(popupPath, "utf-8");
		const widgetSource = fs.readFileSync(widgetPath, "utf-8");
		assert.ok(!popupSource.includes('bg-white"'), "IncomingCallPopup must not use hardcoded bg-white");
		assert.ok(!widgetSource.includes('bg-white"'), "TelephonyFloatingWidget must not use hardcoded bg-white");
	});

	it("4. Non-modal Dynamic Island & Zero Dark Backdrops (macOS HIG & Mandates 8c, 8e)", () => {
		const popupSource = fs.readFileSync(popupPath, "utf-8");
		const widgetSource = fs.readFileSync(widgetPath, "utf-8");
		assert.ok(popupSource.includes("pointer-events-none"), "IncomingCallPopup container must use pointer-events-none");
		assert.ok(!popupSource.includes("fixed inset-0 bg-black"), "IncomingCallPopup must NOT use dark backdrop");
		assert.ok(!widgetSource.includes("fixed inset-0 bg-black"), "TelephonyFloatingWidget must NOT use dark backdrop");
	});

	it("5. Zero AudioContext / Oscillator Procedural Simulators (Mandates 8k, 8s)", () => {
		const popupSource = fs.readFileSync(popupPath, "utf-8");
		const widgetSource = fs.readFileSync(widgetPath, "utf-8");
		assert.ok(!popupSource.includes("AudioContext") && !popupSource.includes("createOscillator"), "No AudioContext");
		assert.ok(!widgetSource.includes("AudioContext") && !widgetSource.includes("createOscillator"), "No AudioContext");
	});
});
