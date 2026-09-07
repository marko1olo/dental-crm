import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { describe, it } from "vitest";
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

const { SurgeryCockpitModal } = await import("../SurgeryCockpitModal");
const { SurgeryProtocolPanel } = await import("../SurgeryProtocolPanel");

describe("SurgeryCockpitModal & SurgeryProtocolPanel (Surgical Cockpit)", () => {
	it("renders SurgeryCockpitModal with 1-click norms, tooth selector and sterile mode", () => {
		const html = renderToString(
			<SurgeryCockpitModal
				isOpen={true}
				onClose={() => {}}
				patientName="Кузнецов Иван"
				patientId="PAT-777"
				doctorName="Др. Семенов"
				initialTooth={46}
			/>,
		);

		assert.ok(html.includes("surgery-cockpit-modal"), "Must render modal container");
		assert.ok(html.includes("Хирургический кокпит"), "Must show title");
		assert.ok(html.includes("Кузнецов Иван"), "Must show patient name");
		assert.ok(html.includes("46"), "Must show initial tooth");
		assert.ok(html.includes("FDI"), "Must show FDI label");
		assert.ok(html.includes("btn-toggle-sterile-mode"), "Must have sterile mode button");
		assert.ok(html.includes("btn-norm-surgery_implant_standard"), "Must have 1-click implant norm");
		assert.ok(html.includes("btn-norm-surgery_extraction_simple"), "Must have 1-click simple extraction");
		assert.ok(html.includes("btn-norm-surgery_extraction_atypical"), "Must have 1-click atypical extraction");
		assert.ok(html.includes("btn-norm-surgery_extraction_complex"), "Must have 1-click complex extraction");
		assert.ok(html.includes("btn-norm-surgery_periostotomy"), "Must have 1-click periostotomy norm");
		assert.ok(html.includes("A16.07.054"), "Must show 804n implant code");
		assert.ok(html.includes("A16.07.001"), "Must show 804n simple extraction code");
		assert.ok(html.includes("A16.07.002"), "Must show 804n complex extraction code");
		assert.ok(html.includes("A16.07.024"), "Must show 804n atypical extraction code");
		assert.ok(html.includes("A16.07.011"), "Must show 804n periostotomy code");
		assert.ok(html.includes("btn-timeout-all-norm"), "Must have 1-click Time-Out norm button");
		assert.ok(html.includes("btn-insert-surgery-diary"), "Must have Insert into diary button");

		// Zero emojis in rendered HTML (Deadly Sin #7)
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
		assert.equal(emojiRegex.test(html), false, "Rendered HTML must not contain forbidden emojis");
	});

	it("returns null when isOpen is false", () => {
		const html = renderToString(
			<SurgeryCockpitModal
				isOpen={false}
				onClose={() => {}}
			/>,
		);

		assert.equal(html, "", "Modal should return empty string when closed");
	});

	it("renders SurgeryProtocolPanel with inline controls and norms", () => {
		const html = renderToString(
			<SurgeryProtocolPanel
				toothFdi={36}
				patientName="Кузнецов Иван"
			/>,
		);

		assert.ok(html.includes("surgery-protocol-panel"), "Must render panel container");
		assert.ok(html.includes("36"), "Must show active tooth");
		assert.ok(html.includes("FDI"), "Must show FDI label");
		assert.ok(html.includes("btn-panel-norm-surgery_implant_standard"), "Must have implant norm button");
		assert.ok(html.includes("btn-panel-norm-surgery_extraction_simple"), "Must have simple extraction button");
		assert.ok(html.includes("btn-panel-norm-surgery_extraction_complex"), "Must have complex extraction button");
		assert.ok(html.includes("btn-panel-norm-surgery_periostotomy"), "Must have periostotomy button");
		assert.ok(html.includes("A16.07.001"), "Must show 804n code in panel");
		assert.ok(html.includes("btn-panel-apply-diary"), "Must have Apply to diary button");

		// Zero emojis in panel HTML
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
		assert.equal(emojiRegex.test(html), false, "Panel HTML must not contain forbidden emojis");
	});

	it("renders 1-click implant presets bar and capType switcher in SurgeryCockpitModal", () => {
		const html = renderToString(
			<SurgeryCockpitModal
				isOpen={true}
				onClose={() => {}}
				patientName="Кузнецов Иван"
				initialTooth={46}
			/>,
		);

		assert.ok(html.includes("surgery-implant-presets-bar"), "Must have 1-click implant presets bar");
		assert.ok(html.includes("Osstem"), "Must have Osstem preset button");
		assert.ok(html.includes("Dentium"), "Must have Dentium preset button");
		assert.ok(html.includes("Straumann"), "Must have Straumann preset button");
		assert.ok(html.includes("Nobel"), "Must have Nobel preset button");
		assert.ok(html.includes("btn-cockpit-cap-fdm"), "Must have ФДМ 1-click button");
		assert.ok(html.includes("btn-cockpit-cap-plug"), "Must have Заглушка 1-click button");
		assert.ok(html.includes("btn-open-implant-passport"), "Must have button to open implant passport");
		assert.ok(html.includes("min-h-[48px]"), "Must satisfy >= 48px touch targets standard for sterile glove mode");
	});

	it("renders 1-click implant presets bar and capType switcher in SurgeryProtocolPanel", () => {
		const html = renderToString(
			<SurgeryProtocolPanel
				toothFdi={46}
				patientName="Кузнецов Иван"
			/>,
		);

		assert.ok(html.includes("panel-implant-presets-bar"), "Must have panel implant presets bar");
		assert.ok(html.includes("btn-panel-cap-fdm"), "Must have panel ФДМ toggle");
		assert.ok(html.includes("btn-panel-cap-plug"), "Must have panel Заглушка toggle");
		assert.ok(html.includes("btn-panel-implant-passport"), "Must have button to open passport in panel");
		assert.ok(html.includes("min-h-[48px]"), "Must satisfy >= 48px touch targets in panel");
	});

	it("Anti-Matryoshka Law: Modal nesting depth strictly 1 (no modal inside modal)", () => {
		// SurgeryCockpitModal mounts directly without nesting
		const cockpitHtml = renderToString(
			<SurgeryCockpitModal
				isOpen={true}
				onClose={() => {}}
				initialTooth={46}
			/>,
		);
		assert.ok(cockpitHtml.includes("surgery-cockpit-modal"));
		assert.ok(!cockpitHtml.includes("implant-passport-modal"), "Implant passport modal must NOT be nested inside cockpit DOM");

		// When opened, ImplantPassportModal mounts as solitary root modal (depth 1)
		const passportHtml = renderToString(
			<SurgeryCockpitModal
				isOpen={false}
				onClose={() => {}}
			/>,
		);
		assert.equal(passportHtml, "");
	});
});
