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

	it("renders VisitSurgeryExtractionBar with 1-click uncomplicated norm, complexity and hemostasis chips", async () => {
		const { VisitSurgeryExtractionBar } = await import("../../visit/surgery/VisitSurgeryExtractionBar");
		const html = renderToString(
			<VisitSurgeryExtractionBar
				effectiveTooth={38}
				patientName="Иванов Петр"
				doctorName="Др. Соколов"
				onApplyProtocolText={() => {}}
			/>,
		);

		assert.ok(html.includes("visit-surgery-extraction-bar"), "Must render extraction bar");
		assert.ok(html.includes("btn-uncomplicated-extraction-norm"), "Must have 1-click uncomplicated norm button");
		assert.ok(html.includes("btn-copy-post-op-memo"), "Must have patient post-op memo button");
		assert.ok(html.includes("btn-extraction-complexity-simple"), "Must have simple complexity button");
		assert.ok(html.includes("btn-extraction-complexity-complex"), "Must have complex complexity button");
		assert.ok(html.includes("btn-extraction-complexity-impacted_dystopic"), "Must have impacted complexity button");
		assert.ok(html.includes("btn-hemostasis-alvogyl"), "Must have Alvogyl chip");
		assert.ok(html.includes("btn-hemostasis-hemostatic_sponge"), "Must have collagen sponge chip");
		assert.ok(html.includes("btn-hemostasis-vicryl_suture"), "Must have Vicryl suture chip");
		assert.ok(html.includes("btn-hemostasis-tampon"), "Must have 20-min tampon chip");
	});

	it("renders VisitSurgerySinusGbrBar with graft selection, membrane options, and titanium pins", async () => {
		const { VisitSurgerySinusGbrBar } = await import("../../visit/surgery/VisitSurgerySinusGbrBar");
		const html = renderToString(
			<VisitSurgerySinusGbrBar
				effectiveTooth={16}
				isClosedSinus={false}
				onApplyProtocolText={() => {}}
			/>,
		);

		assert.ok(html.includes("visit-surgery-sinus-gbr-bar"), "Must render sinus GBR bar");
		assert.ok(html.includes("btn-uncomplicated-gbr-norm"), "Must have 1-click GBR norm button");
		assert.ok(html.includes("Bio-Oss 0.5г"), "Must have Bio-Oss graft option");
		assert.ok(html.includes("Cerabone"), "Must have Cerabone graft option");
		assert.ok(html.includes("SureOss"), "Must have SureOss allograft option");
		assert.ok(html.includes("Аутокость"), "Must have autograft option");
		assert.ok(html.includes("Bio-Gide 25×25"), "Must have Bio-Gide membrane option");
		assert.ok(html.includes("Jason"), "Must have Jason membrane option");
		assert.ok(html.includes("Cytoplast"), "Must have Cytoplast membrane option");
		assert.ok(html.includes("btn-toggle-titanium-pins"), "Must have titanium pins toggle");
	});

	it("renders VisitSurgeryImplantBar with extended brands (Nobel, Ankylos, MIS, MegaGen) and custom brand option (Mandate 8z)", async () => {
		const { VisitSurgeryImplantBar } = await import("../../visit/surgery/VisitSurgeryImplantBar");
		const html = renderToString(
			<VisitSurgeryImplantBar
				implantBrand="Dentium"
				setImplantBrand={() => {}}
				implantDiameter={4.0}
				setImplantDiameter={() => {}}
				implantLength={10.0}
				setImplantLength={() => {}}
				implantTorque={35}
				setImplantTorque={() => {}}
				implantIsq={72}
				setImplantIsq={() => {}}
				implantCap="fdm"
				setImplantCap={() => {}}
				implantSuture="Prolene 4-0"
				setImplantSuture={() => {}}
				onApplyPreset={() => {}}
			/>,
		);

		assert.ok(html.includes("btn-preset-standard-implant-tab"), "Must have standard implant preset button");
		assert.ok(html.includes("btn-implant-system-Dentium"), "Must have Dentium button");
		assert.ok(html.includes("btn-implant-system-Osstem"), "Must have Osstem button");
		assert.ok(html.includes("btn-implant-system-Straumann"), "Must have Straumann button");
		assert.ok(html.includes("btn-implant-system-Nobel Biocare"), "Must have Nobel Biocare button");
		assert.ok(html.includes("btn-implant-system-Ankylos"), "Must have Ankylos button");
		assert.ok(html.includes("btn-implant-system-MIS"), "Must have MIS button");
		assert.ok(html.includes("btn-implant-system-MegaGen"), "Must have MegaGen button");
		assert.ok(html.includes("btn-toggle-custom-brand"), "Must have custom brand toggle (Mandate 8z)");
	});

	it("guarantees zero bird language in surgical and implant cockpit (Mandate 8x/8y)", () => {
		const html = renderToString(
			<VisitSurgeryProtocolTab
				activeTooth={46}
				patientName="Кузнецов Иван"
			/>,
		);

		assert.ok(!html.includes("043/у"), "UI must NOT contain 043/у cipher");
		assert.ok(!html.includes("043-у"), "UI must NOT contain 043-у cipher");
	});
});

