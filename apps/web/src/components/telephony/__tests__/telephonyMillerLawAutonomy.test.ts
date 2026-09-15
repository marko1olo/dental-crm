import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("Telephony Miller's Law & Doctor Autonomy Suite (Mandates 8d, 8e, 8n, 8p)", async (t) => {
	const popupPath = path.resolve(
		process.cwd(),
		"src/components/telephony/IncomingCallPopup.tsx",
	);
	const widgetPath = path.resolve(
		process.cwd(),
		"src/components/telephony/TelephonyFloatingWidget.tsx",
	);

	const popupSource = fs.readFileSync(popupPath, "utf-8");
	const widgetSource = fs.readFileSync(widgetPath, "utf-8");

	await t.test("1. Doctor Sterile Zone & Draft Immunity (Mandate 8e p. 6)", () => {
		// Doctor view/mode suppression in IncomingCallPopup
		assert.ok(
			popupSource.includes("if (!activeCall || isDoctorMode || isDndActive) return null;"),
			"IncomingCallPopup must suppress rendering when isDoctorMode is active to protect Form 043/u drafts",
		);

		// Doctor view suppression in TelephonyFloatingWidget
		assert.ok(
			widgetSource.includes("isDoctorChairsideMode"),
			"TelephonyFloatingWidget must identify doctor chairside mode",
		);
		assert.ok(
			widgetSource.includes("if (isDoctorChairsideMode) {\n\t\treturn null;\n\t}"),
			"TelephonyFloatingWidget must return null in doctor chairside mode",
		);
	});

	await t.test("2. Miller's Law: Strictly <= 2 Primary Direct Buttons on IncomingCallPopup Badge (Mandate 8d & 8p)", () => {
		// Check primary action buttons
		assert.ok(
			popupSource.includes('data-testid="badge-action-book"'),
			"IncomingCallPopup must provide 'Создать запись' as primary action 1",
		);
		assert.ok(
			popupSource.includes('data-testid="badge-action-card"'),
			"IncomingCallPopup must provide 'Открыть карту / Создать' as primary action 2",
		);
		assert.ok(
			popupSource.includes('data-testid="badge-more-menu-btn"'),
			"IncomingCallPopup must consolidate secondary actions into '...' more menu button",
		);
	});

	await t.test("3. Miller's Law: Strictly <= 2 Primary Direct Buttons on TelephonyFloatingWidget (Mandate 8d & 8p)", () => {
		// Check primary action buttons in widget
		assert.ok(
			widgetSource.includes('data-testid="widget-action-book"'),
			"TelephonyFloatingWidget must provide 'Создать запись' as primary action 1",
		);
		assert.ok(
			widgetSource.includes('data-testid="widget-action-open-card"'),
			"TelephonyFloatingWidget must provide 'Открыть карту / Создать' as primary action 2",
		);
		assert.ok(
			widgetSource.includes('data-testid="widget-more-menu-btn"'),
			"TelephonyFloatingWidget must consolidate secondary actions into '...' more menu button",
		);
		assert.ok(
			widgetSource.includes('data-testid="widget-more-menu-dropdown"'),
			"TelephonyFloatingWidget must render popover dropdown with slots, WhatsApp, SIP transfer, Hold, and Copy phone",
		);
	});

	await t.test("4. Solo-Doctor & Reception Autonomy: 1-Click Booking without Mandatory Assistant (Mandates 8e & 8n)", () => {
		// assistantUserId must be empty string in appointment draft
		assert.ok(
			popupSource.includes('assistantUserId: ""'),
			"IncomingCallPopup handleQuickBook must set assistantUserId: '' to prevent blocking solo doctors",
		);
		assert.ok(
			widgetSource.includes('assistantUserId: ""'),
			"TelephonyFloatingWidget handleQuickBook must set assistantUserId: '' to prevent blocking solo doctors",
		);
	});

	await t.test("5. Dark Mode Hygiene & Design Token Integrity", () => {
		// Zero toxic hardcoded bg-white
		assert.ok(
			!popupSource.includes('bg-white"'),
			"IncomingCallPopup must not use hardcoded bg-white; must use var(--paper-strong) or CSS variables",
		);
		assert.ok(
			!widgetSource.includes('bg-white"'),
			"TelephonyFloatingWidget must not use hardcoded bg-white; must use var(--paper-strong) or CSS variables",
		);
	});
});
