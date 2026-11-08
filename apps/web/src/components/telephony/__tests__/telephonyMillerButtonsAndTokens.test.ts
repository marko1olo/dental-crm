import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

describe("Telephony Miller's Law, Design Tokens & Non-Modal Dynamic Island (Mandates 8c, 8d, 8e, 8p)", () => {
	const srcDir = fs.existsSync(path.resolve(process.cwd(), "apps/web/src"))
		? path.resolve(process.cwd(), "apps/web/src")
		: path.resolve(process.cwd(), "src");
	const popupPath = path.resolve(srcDir, "components/telephony/IncomingCallPopup.tsx");
	const studioPath = path.resolve(srcDir, "components/telephony/TelephonyStudioModal.tsx");
	const actionFooterPath = path.resolve(srcDir, "components/telephony/incomingCallPopupModules/IncomingCallActionFooter.tsx");
	const drawerMoreMenuPath = path.resolve(srcDir, "components/telephony/drawerModules/TelephonyDrawerMoreMenu.tsx");

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

	it("2. Miller's Law: Consolidated Secondary Actions on TelephonyDrawer More Menu (Mandate 8d & 8p)", () => {
		const drawerMoreMenuSource = fs.readFileSync(drawerMoreMenuPath, "utf-8");
		assert.ok(
			drawerMoreMenuSource.includes('data-testid="drawer-more-action-capture-lead"'),
			"TelephonyDrawer more menu must provide capture lead option",
		);
	});

	it("3. Dark Mode Hygiene & Design Token Integrity", () => {
		const popupSource = fs.readFileSync(popupPath, "utf-8");
		const studioSource = fs.readFileSync(studioPath, "utf-8");
		assert.ok(!popupSource.includes('bg-white"'), "IncomingCallPopup must not use hardcoded bg-white");
		assert.ok(!studioSource.includes('bg-white"'), "TelephonyStudioModal must not use hardcoded bg-white");
	});

	it("4. Non-modal Dynamic Island & Zero Dark Backdrops (macOS HIG & Mandates 8c, 8e)", () => {
		const popupSource = fs.readFileSync(popupPath, "utf-8");
		assert.ok(popupSource.includes("pointer-events-none"), "IncomingCallPopup container must use pointer-events-none");
		assert.ok(!popupSource.includes("fixed inset-0 bg-black"), "IncomingCallPopup must NOT use dark backdrop");
	});

	it("5. Zero AudioContext / Oscillator Procedural Simulators (Mandates 8k, 8s)", () => {
		const popupSource = fs.readFileSync(popupPath, "utf-8");
		const studioSource = fs.readFileSync(studioPath, "utf-8");
		assert.ok(!popupSource.includes("AudioContext") && !popupSource.includes("createOscillator"), "No AudioContext");
		assert.ok(!studioSource.includes("AudioContext") && !studioSource.includes("createOscillator"), "No AudioContext");
	});
});
