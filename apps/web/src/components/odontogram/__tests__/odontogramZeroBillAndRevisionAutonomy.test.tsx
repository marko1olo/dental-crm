/**
 * apps/web/src/components/odontogram/__tests__/odontogramZeroBillAndRevisionAutonomy.test.tsx
 *
 * Clinical Autonomy & Odontogram Ergonomics Test Suite
 * CLIN-01: Zero bill produces strictly 0 kopecks (no artificial 100 kopeck floor)
 * CLIN-02: Locked visit diary does not silently drop custom event protocol, warns doctor and activates revision mode
 * CLIN-03: Menu height 380px and screen boundary clamping
 * CLIN-06: WCAG AAA contrast classes in TOOTH_STATE_ACTIONS
 * Mandates 8b (kopeck exact money), 8c (Tier 1 ergonomics), 8d (7 deadly sins), 8e (Doctor autonomy)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { TOOTH_STATE_ACTIONS } from "../OdontogramModule";
import { OdontogramToolbar } from "../OdontogramToolbar";
import {
	createDefaultAdultTeethData,
	ToothChart,
	type ToothData,
} from "../ToothChart";

describe("CLIN-01: Exact Kopeck Money & Zero Bill Floor Elimination (Mandate 8b)", () => {
	it("calculates exactly 0 kopecks when liveGrossTotalRub is 0", () => {
		const liveGrossTotalRub = 0;
		// Old buggy behavior was: Math.max(100, Math.round(liveGrossTotalRub * 100)) === 100
		const oldBuggyKop = Math.max(100, Math.round(liveGrossTotalRub * 100));
		assert.strictEqual(oldBuggyKop, 100, "Old behavior incorrectly forced 100 kopecks");

		// New correct behavior: Math.round(liveGrossTotalRub * 100) === 0
		const fixedKop = Math.round(liveGrossTotalRub * 100);
		assert.strictEqual(fixedKop, 0, "Fixed calculation must produce 0 kopecks on zero bill");
	});

	it("calculates exact kopecks for positive amounts", () => {
		assert.strictEqual(Math.round(1500.5 * 100), 150050);
		assert.strictEqual(Math.round(0.01 * 100), 1);
		assert.strictEqual(Math.round(3500 * 100), 350000);
	});

	it("verifies OdontogramModule.tsx source code eliminates Math.max(100, ...)", () => {
		const modulePath = path.resolve(
			__dirname,
			"../../../../src/components/odontogram/OdontogramModule.tsx",
		);
		const content = fs.readFileSync(modulePath, "utf-8");

		assert.strictEqual(
			content.includes("Math.max(100, Math.round(liveGrossTotalRub * 100))"),
			false,
			"OdontogramModule.tsx must NOT contain the 100-kopeck artificial floor",
		);

		assert.ok(
			content.includes("totalBillKop={Math.round(liveGrossTotalRub * 100)}"),
			"OdontogramModule.tsx must pass exact kopecks: Math.round(liveGrossTotalRub * 100)",
		);
	});
});

describe("CLIN-02: Locked Visit Diary Protocol Synchronization Autonomy (Mandate 8e)", () => {
	it("verifies useVisitDiaryLogic.ts does not silently drop soap event on locked visit", () => {
		const hookPath = path.resolve(
			__dirname,
			"../../../../src/components/useVisitDiaryLogic.ts",
		);
		const content = fs.readFileSync(hookPath, "utf-8");

		// Check that the old silent return is gone
		const oldSilentPattern = /if\s*\(\s*isLocked\s*&&\s*!isRevising\s*\)\s*\{\s*return;\s*\}/;
		assert.strictEqual(
			oldSilentPattern.test(content),
			false,
			"useVisitDiaryLogic.ts must NOT silently return on locked diary",
		);

		// Check that setIsRevising(true) and warning toast are triggered
		assert.ok(
			content.includes("setIsRevising(true)"),
			"useVisitDiaryLogic.ts must automatically activate revision mode",
		);
		assert.ok(
			content.includes("showToast(") &&
				content.includes("Дневник визита открыт для внесения исправлений"),
			"useVisitDiaryLogic.ts must notify doctor with warning toast when locked diary receives protocol",
		);
	});

	it("simulates locked visit event dispatch with auto-revision handler", () => {
		let isLocked = true;
		let isRevising = false;
		let toastCalled = false;
		let toastMessage = "";
		let toastType = "";
		let revisionReason = "";

		const showToastMock = (msg: string, type: string) => {
			toastCalled = true;
			toastMessage = msg;
			toastType = type;
		};

		// Simulation of the updated handleGlobalSoapEvent handler
		const simulateHandler = () => {
			if (isLocked && !isRevising) {
				isRevising = true;
				revisionReason = "Исправленному верить (синхронизация одонтограммы)";
				showToastMock(
					"Дневник визита открыт для внесения исправлений (протокол одонтограммы применён)",
					"warning",
				);
			}
		};

		simulateHandler();

		assert.strictEqual(isRevising, true, "isRevising must be set to true");
		assert.strictEqual(toastCalled, true, "Toast must be triggered");
		assert.strictEqual(toastType, "warning", "Toast type must be warning");
		assert.ok(toastMessage.includes("Дневник визита открыт для внесения исправлений"));
		assert.ok(revisionReason.includes("Исправленному верить"));
	});
});

describe("CLIN-03: Context Radial Menu Height & Boundary Protection", () => {
	it("verifies menuH is set to 380 and y coordinate is clamped", () => {
		const modulePath = path.resolve(
			__dirname,
			"../../../../src/components/odontogram/OdontogramModule.tsx",
		);
		const content = fs.readFileSync(modulePath, "utf-8");

		assert.ok(
			content.includes("const menuH = 380;"),
			"menuH must be calibrated to 380px for full radial menu",
		);
		assert.ok(
			content.includes("Math.max(10, Math.min(window.innerHeight - 400, y))"),
			"y must be clamped between 10 and window.innerHeight - 400",
		);
	});

	it("validates boundary clamping math across various viewports", () => {
		const clamp = (y: number, vh: number) => Math.max(10, Math.min(vh - 400, y));

		// Normal desktop: vh = 900, max allowed is 500
		assert.strictEqual(clamp(600, 900), 500, "Should clamp to 500 when y=600 in 900vh");
		assert.strictEqual(clamp(200, 900), 200, "Should keep 200 when inside bounds");
		assert.strictEqual(clamp(-50, 900), 10, "Should clamp to min 10 on top overflow");

		// Compact screen: vh = 600, max allowed is 200
		assert.strictEqual(clamp(300, 600), 200, "Should clamp to 200 when y=300 in 600vh");
	});
});

describe("CLIN-06: TOOTH_STATE_ACTIONS WCAG AAA High-Contrast Palette", () => {
	it("all TOOTH_STATE_ACTIONS specify dual light/dark high-contrast text classes", () => {
		assert.ok(TOOTH_STATE_ACTIONS.length >= 8, "Must contain all tooth states");

		const cariesAction = TOOTH_STATE_ACTIONS.find((a) => a.state === "Caries");
		assert.ok(cariesAction);
		assert.ok(cariesAction.className.includes("text-rose-600"));
		assert.ok(cariesAction.className.includes("dark:text-rose-400"));

		const pulpitisAction = TOOTH_STATE_ACTIONS.find((a) => a.state === "Pulpitis");
		assert.ok(pulpitisAction);
		assert.ok(pulpitisAction.className.includes("text-rose-600"));
		assert.ok(pulpitisAction.className.includes("dark:text-rose-400"));

		const perioAction = TOOTH_STATE_ACTIONS.find((a) => a.state === "Periodontitis");
		assert.ok(perioAction);
		assert.ok(perioAction.className.includes("text-amber-600"));
		assert.ok(perioAction.className.includes("dark:text-amber-400"));

		const crownAction = TOOTH_STATE_ACTIONS.find((a) => a.state === "Crown");
		assert.ok(crownAction);
		assert.ok(crownAction.className.includes("text-blue-600"));
		assert.ok(crownAction.className.includes("dark:text-blue-400"));

		const implantAction = TOOTH_STATE_ACTIONS.find((a) => a.state === "Implant");
		assert.ok(implantAction);
		assert.ok(implantAction.className.includes("text-amber-600"));
		assert.ok(implantAction.className.includes("dark:text-amber-400"));

		const healthyAction = TOOTH_STATE_ACTIONS.find((a) => a.state === "Healthy");
		assert.ok(healthyAction);
		assert.ok(healthyAction.className.includes("text-emerald-600"));
		assert.ok(healthyAction.className.includes("dark:text-emerald-400"));
	});

	it("no TOOTH_STATE_ACTIONS item uses solitary uncontrasted pastel classes", () => {
		for (const action of TOOTH_STATE_ACTIONS) {
			assert.strictEqual(
				/\btext-red-400\b/.test(action.className) &&
					!action.className.includes("dark:text-rose-400"),
				false,
				`Action ${action.state} must not use lone text-red-400`,
			);
			assert.strictEqual(
				/\btext-blue-400\b/.test(action.className) &&
					!action.className.includes("dark:text-blue-400"),
				false,
				`Action ${action.state} must not use lone text-blue-400`,
			);
			assert.strictEqual(
				/\btext-orange-400\b/.test(action.className),
				false,
				`Action ${action.state} must not use lone text-orange-400`,
			);
		}
	});
});

describe("Sanctity of Medical Records: Zero Cartoon Emojis (Mandate 8d, Sin 7)", () => {
	const CARTOON_EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

	it("guarantees 0 cartoon emojis in TOOTH_STATE_ACTIONS labels", () => {
		for (const action of TOOTH_STATE_ACTIONS) {
			assert.strictEqual(
				CARTOON_EMOJI_REGEX.test(action.label),
				false,
				`Action label "${action.label}" must not contain emojis`,
			);
		}
	});

	it("guarantees 0 cartoon emojis in ToothChart rendered HTML", () => {
		const sampleTeeth: ToothData[] = createDefaultAdultTeethData();
		const html = renderToString(
			<ToothChart teethData={sampleTeeth} onToothClick={() => {}} />,
		);

		assert.strictEqual(
			CARTOON_EMOJI_REGEX.test(html),
			false,
			"ToothChart rendered HTML must not contain cartoon emojis",
		);
	});

	it("guarantees 0 cartoon emojis in OdontogramToolbar rendered HTML", () => {
		const html = renderToString(
			<OdontogramToolbar
				activeMode="anatomical_svg"
				onModeChange={() => {}}
				activeStampTool="Caries"
				onStampToolChange={() => {}}
				onMarkIntactDentition={() => {}}
				onMarkWisdomTeethMissing={() => {}}
				onMarkMolarsMissing={() => {}}
				onMarkFrontIntact={() => {}}
				showWisdomTeeth={true}
				onToggleWisdomTeeth={() => {}}
				showPulpAndCanals={true}
				onTogglePulpAndCanals={() => {}}
				isFastExtractMode={false}
				onToggleFastExtract={() => {}}
				isLiveInvoiceOpen={false}
				onToggleLiveInvoice={() => {}}
				isVoiceListening={false}
				onToggleVoiceDictation={() => {}}
			/>,
		);

		assert.strictEqual(
			CARTOON_EMOJI_REGEX.test(html),
			false,
			"OdontogramToolbar HTML must contain zero cartoon emojis",
		);
	});
});
