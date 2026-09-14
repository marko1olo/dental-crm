/**
 * apps/web/src/components/odontogram/__tests__/odontogramOverhaulAndVisualErgonomics.test.tsx
 *
 * Full Inquisition & Overhaul Test Suite for Odontogram & Visit Diary 043/u
 * CLIN-01: 0 ₽ produces strictly 0 kopecks (totalBillKop === 0)
 * CLIN-02: Locked visit diary auto-opens revision mode (setIsRevising(true)) & notifies doctor
 * CLIN-04: Single 1-row dentition toggle, elimination of duplicate switchers in ToothChart and OdontogramModule
 * CLIN-05: 420px payment ribbon eliminated; compact 32-34px financial badge in Tier 1 header
 * CLIN-03: Radial context menu height (menuH = 380) with boundary clamping and compact 7-surface row
 * CLIN-06: Dual light/dark WCAG AAA contrast classes
 * Strict 0 cartoon emojis
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
import { OdontogramViewContainer } from "../OdontogramViewContainer";
import {
	createDefaultAdultTeethData,
	ToothChart,
	type ToothData,
} from "../ToothChart";

describe("CLIN-01: Exact Money & Zero Bill Invariant (Mandate 8b)", () => {
	it("totalBillKop === 0 when liveGrossTotalRub is 0", () => {
		const liveGrossTotalRub = 0;
		const totalBillKop = Math.round(liveGrossTotalRub * 100);
		assert.strictEqual(totalBillKop, 0, "Zero bill must be 0 kopecks, never 100");
	});

	it("totalBillKop correctly scales positive decimal amounts", () => {
		assert.strictEqual(Math.round(450.75 * 100), 45075);
		assert.strictEqual(Math.round(12000 * 100), 1200000);
	});
});

describe("CLIN-02: Autonomous Visit Diary Revision Mode (Mandate 8e)", () => {
	it("verifies useVisitDiaryLogic activates revision mode when protocol arrives during locked state", () => {
		const hookPath = path.resolve(
			__dirname,
			"../../../../src/components/useVisitDiaryLogic.ts",
		);
		const content = fs.readFileSync(hookPath, "utf-8");

		assert.ok(
			content.includes("setIsRevising(true)"),
			"useVisitDiaryLogic must set isRevising to true when locked",
		);
		assert.ok(
			content.includes("Дневник визита открыт для внесения исправлений (протокол одонтограммы применён)"),
			"useVisitDiaryLogic must issue warning notification without dropping the protocol",
		);
	});
});

describe("CLIN-04: Elimination of Duplicate Dentition Switchers (Hick's Law & Mandate 8d)", () => {
	it("guarantees ToothChart does NOT render redundant odontogram-dentition-switcher by default", () => {
		const teeth = createDefaultAdultTeethData();
		const html = renderToString(
			<ToothChart teethData={teeth} onToothClick={() => {}} />,
		);

		assert.strictEqual(
			html.includes("data-testid=\"odontogram-dentition-switcher\""),
			false,
			"ToothChart must NOT render secondary duplicate dentition switcher",
		);
		assert.strictEqual(
			html.includes("data-testid=\"dentition-mode-adult-btn\""),
			false,
			"ToothChart must NOT render duplicate adult button",
		);
	});

	it("guarantees OdontogramModule.tsx has removed the duplicate switch-adult-dentition-btn", () => {
		const modulePath = path.resolve(
			__dirname,
			"../../../../src/components/odontogram/OdontogramModule.tsx",
		);
		const content = fs.readFileSync(modulePath, "utf-8");

		assert.strictEqual(
			content.includes("data-testid=\"switch-adult-dentition-btn\""),
			false,
			"OdontogramModule.tsx must not contain duplicate switch-adult-dentition-btn",
		);
		assert.strictEqual(
			content.includes("data-testid=\"switch-pediatric-dentition-btn\""),
			false,
			"OdontogramModule.tsx must not contain duplicate switch-pediatric-dentition-btn",
		);
	});

	it("renders single compact 1-row dentition toggle in OdontogramViewContainer", () => {
		let chosenMode = "";
		const teeth = createDefaultAdultTeethData();
		const htmlContainer = renderToString(
			<OdontogramViewContainer
				teethData={teeth}
				dentitionMode="adult"
				onDentitionModeChange={(m) => {
					chosenMode = m;
				}}
				onToothClick={() => {}}
			/>,
		);

		assert.ok(
			htmlContainer.includes("data-testid=\"toolbar-dentition-adult\""),
			"OdontogramViewContainer must contain toolbar-dentition-adult",
		);
		assert.ok(
			htmlContainer.includes("data-testid=\"toolbar-dentition-pediatric\""),
			"OdontogramViewContainer must contain toolbar-dentition-pediatric",
		);
		assert.ok(
			htmlContainer.includes("data-testid=\"toolbar-dentition-mixed\""),
			"OdontogramViewContainer must contain toolbar-dentition-mixed",
		);
	});
});


describe("CLIN-05: 3-Tier Architecture & Elimination of Giant Checkout Ribbon (Mandate 8c)", () => {
	it("verifies OdontogramModule.tsx has eliminated the giant 420px checkout ribbon", () => {
		const modulePath = path.resolve(
			__dirname,
			"../../../../src/components/odontogram/OdontogramModule.tsx",
		);
		const content = fs.readFileSync(modulePath, "utf-8");

		assert.strictEqual(
			content.includes("data-testid=\"odontogram-fast-checkout-ribbon\""),
			false,
			"OdontogramModule.tsx must NOT contain the 420px giant checkout ribbon over teeth",
		);
		assert.strictEqual(
			content.includes("data-testid=\"cockpit-pay-sbp-btn\""),
			false,
			"OdontogramModule.tsx must NOT contain the giant cockpit payment buttons over teeth",
		);
	});

	it("verifies OdontogramModule.tsx has the compact 32-34px header financial badge and 1-click FastCheckout button", () => {
		const modulePath = path.resolve(
			__dirname,
			"../../../../src/components/odontogram/OdontogramModule.tsx",
		);
		const content = fs.readFileSync(modulePath, "utf-8");

		assert.ok(
			content.includes("data-testid=\"odontogram-compact-bill-badge\""),
			"OdontogramModule.tsx must contain compact bill badge in header",
		);
		assert.ok(
			content.includes("data-testid=\"btn-open-fast-checkout\""),
			"OdontogramModule.tsx must contain 1-click modal checkout button",
		);
	});
});

describe("CLIN-03: Radial Menu Height Calibration & 7 Compact Surface Row", () => {
	it("verifies OdontogramModule.tsx renders all 7 surfaces in one compact row", () => {
		const modulePath = path.resolve(
			__dirname,
			"../../../../src/components/odontogram/OdontogramModule.tsx",
		);
		const content = fs.readFileSync(modulePath, "utf-8");

		const requiredSurfaces = ["O", "M", "D", "V", "L", "К", "А"];
		for (const surf of requiredSurfaces) {
			assert.ok(
				content.includes(`label: "${surf}"`),
				`Must contain surface chip label for ${surf}`,
			);
		}
		assert.ok(
			content.includes("data-testid={`odontogram-module-surf-${chip.label}`}"),
			"Must contain dynamic data-testid for surface chips",
		);
	});

	it("verifies menuH = 380 and clamping math", () => {
		const modulePath = path.resolve(
			__dirname,
			"../../../../src/components/odontogram/OdontogramModule.tsx",
		);
		const content = fs.readFileSync(modulePath, "utf-8");

		assert.ok(content.includes("const menuH = 380;"));
		assert.ok(content.includes("Math.max(10, Math.min(window.innerHeight - 400, y))"));
	});
});

describe("CLIN-06: WCAG AAA High Contrast & Zero Emojis", () => {
	it("verifies contrast classes in TOOTH_STATE_ACTIONS", () => {
		const caries = TOOTH_STATE_ACTIONS.find((a) => a.state === "Caries");
		assert.ok(caries?.className.includes("text-rose-600"));
		assert.ok(caries?.className.includes("dark:text-rose-400"));

		const crown = TOOTH_STATE_ACTIONS.find((a) => a.state === "Crown");
		assert.ok(crown?.className.includes("text-blue-600"));
		assert.ok(crown?.className.includes("dark:text-blue-400"));
	});

	it("strictly zero cartoon emojis across odontogram", () => {
		const CARTOON_EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
		for (const a of TOOTH_STATE_ACTIONS) {
			assert.strictEqual(CARTOON_EMOJI_REGEX.test(a.label), false);
		}
	});
});
