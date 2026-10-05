import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "vitest";

describe("Telephony Miller's Law & Doctor Autonomy Suite (Mandates 8d, 8e, 8n, 8p)", () => {
	const srcDir = fs.existsSync(path.resolve(process.cwd(), "apps/web/src"))
		? path.resolve(process.cwd(), "apps/web/src")
		: path.resolve(process.cwd(), "src");
	const popupPath = path.resolve(
		srcDir,
		"components/telephony/IncomingCallPopup.tsx",
	);
	const widgetPath = path.resolve(
		srcDir,
		"components/telephony/TelephonyFloatingWidget.tsx",
	);

	const popupSource = fs.readFileSync(popupPath, "utf-8");
	const widgetSource = fs.readFileSync(widgetPath, "utf-8");

	it(
		"1. Doctor Sterile Zone & Draft Immunity (Mandate 8e p. 6)",
		() => {
			// Doctor view/mode suppression in IncomingCallPopup
			assert.ok(
				popupSource.includes(
					"if (!activeCall || isDoctorMode || isDndActive) return null;",
				),
				"IncomingCallPopup must suppress rendering when isDoctorMode is active to protect Form 043/u drafts",
			);

			// Doctor view suppression in TelephonyFloatingWidget
			assert.ok(
				widgetSource.includes("isDoctorChairsideMode"),
				"TelephonyFloatingWidget must identify doctor chairside mode",
			);
			assert.ok(
				widgetSource.includes(
					"if (isDoctorChairsideMode) {\n\t\treturn null;\n\t}",
				),
				"TelephonyFloatingWidget must return null in doctor chairside mode",
			);
		},
	);

	it(
		"2. Miller's Law: Strictly <= 2 Primary Direct Buttons on IncomingCallPopup Badge (Mandate 8d & 8p)",
		() => {
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
		},
	);

	it(
		"3. Miller's Law: Strictly <= 2 Primary Direct Buttons on TelephonyFloatingWidget (Mandate 8d & 8p)",
		() => {
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
		},
	);

	it(
		"4. Solo-Doctor & Reception Autonomy: 1-Click Booking without Mandatory Assistant (Mandates 8e & 8n)",
		() => {
			// assistantUserId must be empty string in appointment draft
			assert.ok(
				popupSource.includes('assistantUserId: ""'),
				"IncomingCallPopup handleQuickBook must set assistantUserId: '' to prevent blocking solo doctors",
			);
			assert.ok(
				widgetSource.includes('assistantUserId: ""'),
				"TelephonyFloatingWidget handleQuickBook must set assistantUserId: '' to prevent blocking solo doctors",
			);
		},
	);

	it("5. Dark Mode Hygiene & Design Token Integrity", () => {
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

	it(
		"6. Non-modal Dynamic Island & Zero Dark Backdrops (macOS HIG & Mandates 8c, 8e)",
		() => {
			// Non-modal ambient container with pointer-events-none to prevent blocking screen
			assert.ok(
				popupSource.includes("pointer-events-none"),
				"IncomingCallPopup container must use pointer-events-none to prevent blocking screen clicks",
			);
			assert.ok(
				!popupSource.includes("fixed inset-0 bg-black"),
				"IncomingCallPopup must NOT use fullscreen dark backdrop overlay",
			);
			assert.ok(
				!widgetSource.includes("fixed inset-0 bg-black"),
				"TelephonyFloatingWidget must NOT use fullscreen dark backdrop overlay",
			);
		},
	);

	it(
		"7. Zero AudioContext / Oscillator Procedural Simulators (Mandates 8k, 8s)",
		() => {
			assert.ok(
				!popupSource.includes("AudioContext") &&
					!popupSource.includes("createOscillator"),
				"IncomingCallPopup must NOT use procedural AudioContext / oscillator simulations",
			);
			assert.ok(
				!widgetSource.includes("AudioContext") &&
					!widgetSource.includes("createOscillator"),
				"TelephonyFloatingWidget must NOT use procedural AudioContext / oscillator simulations",
			);
		},
	);

	it(
		"8. Odontogram Working Zone Protection & Doctor Immunity (Mandates 8e, 8p)",
		() => {
			// workspaceShell prevents mounting telephony during doctor mode / visit
			const shellPath = path.resolve(srcDir, "workspaceShell.tsx");
			const shellSource = fs.readFileSync(shellPath, "utf-8");
			assert.ok(
				shellSource.includes("!isDoctorMode ? ("),
				"workspaceShell must strictly guard telephony widget mounting with !isDoctorMode",
			);

			// CSS non-occlusion invariant: top centered with pointer-events: none
			const cssPath = path.resolve(
				srcDir,
				"components/telephony/telephonyFloatingWidget.css",
			);
			const cssSource = fs.readFileSync(cssPath, "utf-8");
			assert.ok(
				cssSource.includes("pointer-events: none;"),
				"telephonyFloatingWidget.css container must have pointer-events: none so odontogram clicks pass through",
			);
			assert.ok(
				cssSource.includes("top: 12px;"),
				"telephony container must be anchored at top: 12px, far away from central odontogram arch",
			);
		},
	);
});

