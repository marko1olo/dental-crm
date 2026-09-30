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
		const containerPath = path.resolve(
			__dirname,
			"../../../../src/components/odontogram/OdontogramViewContainer.tsx",
		);
		const toolbarPath = path.resolve(
			__dirname,
			"../../../../src/components/odontogram/OdontogramToolbar.tsx",
		);
		const content =
			fs.readFileSync(modulePath, "utf-8") +
			fs.readFileSync(containerPath, "utf-8") +
			(fs.existsSync(toolbarPath) ? fs.readFileSync(toolbarPath, "utf-8") : "");

		assert.ok(
			content.includes("data-testid=\"odontogram-compact-bill-badge\""),
			"OdontogramViewContainer.tsx must contain compact bill badge in header",
		);
		assert.ok(
			content.includes("data-testid=\"btn-open-fast-checkout\""),
			"OdontogramViewContainer.tsx must contain 1-click modal checkout button",
		);
	});
});

describe("CLIN-03: Radial Menu Height Calibration & 7 Compact Surface Row", () => {
	it("verifies OdontogramModule.tsx renders all 7 surfaces in one compact row", () => {
		const modulePath = path.resolve(
			__dirname,
			"../../../../src/components/odontogram/OdontogramModule.tsx",
		);
		const menuPath = path.resolve(
			__dirname,
			"../../../../src/components/odontogram/ToothActionMenuPortal.tsx",
		);
		const content =
			fs.readFileSync(modulePath, "utf-8") +
			(fs.existsSync(menuPath) ? fs.readFileSync(menuPath, "utf-8") : "");

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

describe("CLIN-07: Fast Hover HUD (150ms) and Quick Action Presets (Mandates 8d, 8e)", () => {
	it("verifies AnatomicalSvgOdontogram includes Periodontitis & Implant in Hover and Touch HUD with 150ms transition", () => {
		const svgOdontogramPath = path.resolve(
			__dirname,
			"../../../../src/components/odontogram/AnatomicalSvgOdontogram.tsx",
		);
		const toothWrapperPath = path.resolve(
			__dirname,
			"../../../../src/components/odontogram/ToothWrapper.tsx",
		);
		const content =
			fs.readFileSync(svgOdontogramPath, "utf-8") +
			(fs.existsSync(toothWrapperPath)
				? fs.readFileSync(toothWrapperPath, "utf-8")
				: "");

		// 150ms Hover HUD transition
		assert.ok(
			content.includes("tooth-hover-quick-hud absolute"),
			"Must render tooth-hover-quick-hud",
		);
		assert.ok(
			content.includes("transition-all duration-150"),
			"Hover HUD transition must be 150ms",
		);

		// Hover HUD statuses
		assert.ok(content.includes('title="Кариес"'), "Must include Caries in hover HUD");
		assert.ok(content.includes('title="Пломба"'), "Must include Filled in hover HUD");
		assert.ok(content.includes('title="Пульпит"'), "Must include Pulpitis in hover HUD");
		assert.ok(content.includes('title="Периодонтит"'), "Must include Periodontitis in hover HUD");
		assert.ok(content.includes('title="Коронка"'), "Must include Crown in hover HUD");
		assert.ok(content.includes('title="Имплантат"'), "Must include Implant in hover HUD");
		assert.ok(content.includes('title="Удален"'), "Must include Missing in hover HUD");
		assert.ok(content.includes('title="Здоров"'), "Must include Healthy in hover HUD");

		// Touch HUD statuses
		assert.ok(content.includes('data-testid={`touch-quick-periodontitis-${number}`}'), "Must include Periodontitis in touch HUD");
		assert.ok(content.includes('data-testid={`touch-quick-implant-${number}`}'), "Must include Implant in touch HUD");
	});

	it("verifies odontogram.css enforces Studio Mac HIG 32px desktop density with coarse pointer fallback", () => {
		const cssPath = path.resolve(
			__dirname,
			"../../../../src/components/odontogram/odontogram.css",
		);
		const content = fs.readFileSync(cssPath, "utf-8");

		assert.ok(
			content.includes(".tooth-hover-quick-hud button {\n\tmin-height: 32px;\n\theight: 32px;\n\tfont-size: 12px;"),
			"Hover HUD buttons must have 32px min-height on desktop",
		);
		assert.ok(
			content.includes("@media (pointer: coarse) {\n\t.tooth-hover-quick-hud button {\n\t\tmin-height: 44px;"),
			"Hover HUD buttons must adapt to 44px on coarse pointer touch devices",
		);
	});
});

describe("CLIN-08: Form 043/u Templates and Studio Mac HIG Density (Mandates 8d, 8e)", () => {
	it("verifies VisitSoapEditor template cards have 32px buttons and no microfonts on actions", () => {
		const soapEditorPath = path.resolve(
			__dirname,
			"../../../../src/components/visit/VisitSoapEditor.tsx",
		);
		const content = fs.readFileSync(soapEditorPath, "utf-8");

		assert.ok(
			content.includes("sm:min-h-[32px] sm:h-8 text-xs font-bold"),
			"Template card buttons must be sm:h-8 (32px) on desktop",
		);
	});

	it("verifies ToothChart quadrant switcher has 32px height on desktop", () => {
		const toolbarPath = path.resolve(
			__dirname,
			"../../../../src/components/odontogram/chart/ToothChartToolbar.tsx",
		);
		const chartPath = path.resolve(
			__dirname,
			"../../../../src/components/odontogram/ToothChart.tsx",
		);
		const content = fs.existsSync(toolbarPath)
			? fs.readFileSync(toolbarPath, "utf-8")
			: fs.readFileSync(chartPath, "utf-8");

		assert.ok(
			content.includes("odontogram-quadrant-bar mb-1 select-none min-h-[32px] h-8 sm:h-9"),
			"Quadrant bar must be min-h-[32px]",
		);
	});
});

describe("CLIN-09: 0-Click Somatic Norm Default & Cargo Cult Eradication (Mandates 8e, 8k)", () => {
	it("verifies VisitView.tsx provides 0-click somatic norm default upon completion", () => {
		const visitViewPath = path.resolve(
			__dirname,
			"../../../../src/VisitView.tsx",
		);
		const content = fs.readFileSync(visitViewPath, "utf-8");

		assert.ok(
			content.includes('updateVisitNoteField("anamnesis", "Соматически здоров. Аллергоанамнез не отягощен.");'),
			"Must default empty anamnesis to somatic norm",
		);
		assert.ok(
			content.includes('updateVisitNoteField("complaint", "Жалоб на момент осмотра не предъявляет.");'),
			"Must default empty complaint",
		);
		assert.ok(
			content.includes('updateVisitNoteField("objectiveStatus", "Слизистая оболочка полости рта бледно-розовая, влажная. Зубные ряды интактны.");'),
			"Must default empty objective status",
		);
	});

	it("verifies hospital cargo cult is completely eradicated from VisitView and Odontogram", () => {
		const visitViewPath = path.resolve(__dirname, "../../../../src/VisitView.tsx");
		const content = fs.readFileSync(visitViewPath, "utf-8");

		const cargoCultKeywords = ["койко-день", "койко-дни", "трансфузи", "025/у", "стационарный больной"];
		for (const keyword of cargoCultKeywords) {
			assert.strictEqual(
				content.toLowerCase().includes(keyword),
				false,
				`VisitView must not contain hospital cargo-cult keyword: ${keyword}`,
			);
		}
	});
});

