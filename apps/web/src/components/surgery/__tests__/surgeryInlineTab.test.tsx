/**
 * surgeryInlineTab.test.tsx — Тесты рендеринга вкладки хирургии в карте визита (Мандаты 8e, 8i).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { VisitSurgeryProtocolTab } = await import("../../visit/surgery/VisitSurgeryProtocolTab");

describe("VisitSurgeryProtocolTab (Surgical Inline Protocol - Outpatient Mandate 8i SSOT)", () => {
	it("1. SurgeryCockpitModal and SurgerySafetyChecklist are eradicated per Mandate 8i", () => {
		const cockpitPath = path.resolve(__dirname, "../SurgeryCockpitModal.tsx");
		const checklistPath = path.resolve(__dirname, "../SurgerySafetyChecklist.tsx");
		assert.equal(fs.existsSync(cockpitPath), false);
		assert.equal(fs.existsSync(checklistPath), false);
	});

	it("2. renders VisitSurgeryProtocolTab with inline controls and norms", () => {
		const html = renderToString(
			<VisitSurgeryProtocolTab
				activeTooth={36}
				patientName="Кузнецов Иван"
			/>,
		);

		assert.ok(html.includes("36"), "Must show active tooth");
		assert.ok(html.includes("FDI"), "Must show FDI label");
		assert.ok(html.includes("btn-surgery-norm-surgery_implant_standard"));
		assert.ok(html.includes("btn-surgery-norm-surgery_extraction_simple"));
		assert.ok(html.includes("btn-surgery-norm-surgery_extraction_complex"));
		assert.ok(html.includes("btn-surgery-norm-surgery_periostotomy"));
		assert.ok(html.includes("btn-apply-to-visit-diary"));

		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
		assert.equal(emojiRegex.test(html), false, "Panel HTML must not contain forbidden emojis");
	});

	it("3. renders 1-click implant presets bar and capType switcher", () => {
		const html = renderToString(
			<VisitSurgeryProtocolTab
				activeTooth={46}
				patientName="Кузнецов Иван"
			/>,
		);

		assert.ok(html.includes("btn-preset-standard-implant-tab"));
		assert.ok(html.includes("btn-implant-cap-fdm"));
		assert.ok(html.includes("btn-implant-cap-plug"));
		assert.ok(html.includes("btn-open-implant-passport-modal"));
	});

	it("4. renders instant print buttons for surgical protocol and IDS package (Mandate 8e)", () => {
		const panelHtml = renderToString(<VisitSurgeryProtocolTab activeTooth={46} />);
		assert.ok(panelHtml.includes("btn-tab-print-protocol"));
		assert.ok(panelHtml.includes("btn-tab-print-ids"));
	});

	it("5. renders 1-click warehouse write-off button with soft overdraft", () => {
		const panelHtml = renderToString(<VisitSurgeryProtocolTab activeTooth={46} />);
		assert.ok(panelHtml.includes("btn-tab-deduct-materials"));
		assert.ok(panelHtml.includes("Списать со склада"));
	});
});
