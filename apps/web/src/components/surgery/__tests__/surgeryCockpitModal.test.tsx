import assert from "node:assert/strict";
import { registerHooks } from "node:module";
const { describe, it } = await (async () => {
	try {
		// @ts-ignore
		return await import("vitest");
	} catch {
		return await import("node:test");
	}
})();
import React from "react";
import { renderToString } from "react-dom/server";

if (typeof registerHooks === "function") {
	try {
		registerHooks({
			load(url, context, nextLoad) {
				if (url.endsWith(".css")) {
					return {
						format: "module",
						shortCircuit: true,
						source: "export default {};",
					};
				}
				return nextLoad(url, context);
			},
		});
	} catch {
		// Ignore if already registered
	}
}

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { VisitSurgeryProtocolTab } = await import("../../visit/surgery/VisitSurgeryProtocolTab");

describe("VisitSurgeryProtocolTab (Surgical Inline Protocol - Outpatient Mandate 8i SSOT)", () => {
	it("SurgeryCockpitModal and SurgerySafetyChecklist are eradicated per Mandate 8i & Wave 199", () => {
		const cockpitPath = path.resolve(__dirname, "../SurgeryCockpitModal.tsx");
		const checklistPath = path.resolve(__dirname, "../SurgerySafetyChecklist.tsx");
		assert.equal(fs.existsSync(cockpitPath), false, "SurgeryCockpitModal must be completely eradicated");
		assert.equal(fs.existsSync(checklistPath), false, "SurgerySafetyChecklist must be completely eradicated");
	});

	it("renders VisitSurgeryProtocolTab with inline controls and norms", () => {
		const html = renderToString(
			<VisitSurgeryProtocolTab
				activeTooth={36}
				patientName="Кузнецов Иван"
			/>,
		);

		assert.ok(html.includes("36"), "Must show active tooth");
		assert.ok(html.includes("FDI"), "Must show FDI label");
		assert.ok(html.includes("btn-surgery-norm-surgery_implant_standard"), "Must have implant norm button");
		assert.ok(html.includes("btn-surgery-norm-surgery_extraction_simple"), "Must have simple extraction button");
		assert.ok(html.includes("btn-surgery-norm-surgery_extraction_complex"), "Must have complex extraction button");
		assert.ok(html.includes("btn-surgery-norm-surgery_periostotomy"), "Must have periostotomy button");
		assert.ok(html.includes("A16.07.001"), "Must show 804n code in panel");
		assert.ok(html.includes("btn-apply-to-visit-diary"), "Must have Apply to diary button");

		// Zero emojis in panel HTML
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
		assert.equal(emojiRegex.test(html), false, "Panel HTML must not contain forbidden emojis");
	});

	it("renders 1-click implant presets bar and capType switcher in VisitSurgeryProtocolTab", () => {
		const html = renderToString(
			<VisitSurgeryProtocolTab
				activeTooth={46}
				patientName="Кузнецов Иван"
			/>,
		);

		assert.ok(html.includes("btn-preset-standard-implant-tab"), "Must have panel implant presets button");
		assert.ok(html.includes("btn-implant-cap-fdm"), "Must have panel ФДМ toggle");
		assert.ok(html.includes("btn-implant-cap-plug"), "Must have panel Заглушка toggle");
		assert.ok(html.includes("btn-open-implant-passport-modal"), "Must have button to open passport in panel");
		assert.ok(html.includes("min-h-[48px]"), "Must satisfy >= 48px touch targets in panel");
	});

	it("renders instant print buttons for surgical protocol and IDS package in panel (Mandate 8e)", () => {
		const panelHtml = renderToString(
			<VisitSurgeryProtocolTab
				activeTooth={46}
			/>,
		);

		assert.ok(panelHtml.includes("btn-tab-print-protocol"), "Panel must have print protocol button");
		assert.ok(panelHtml.includes("btn-tab-print-ids"), "Panel must have print IDS package button");
	});

	it("renders 1-click warehouse write-off button with soft overdraft in VisitSurgeryProtocolTab (Mandate 8e)", () => {
		const panelHtml = renderToString(
			<VisitSurgeryProtocolTab
				activeTooth={46}
			/>,
		);

		assert.ok(
			panelHtml.includes("btn-tab-deduct-materials"),
			"Panel must have 1-click warehouse write-off button with soft overdraft",
		);
		assert.ok(
			panelHtml.includes("Списать со склада"),
			"Must display initial write-off button text",
		);
	});
});

