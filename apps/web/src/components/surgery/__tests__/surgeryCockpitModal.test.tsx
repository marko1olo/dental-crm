import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { SurgeryCockpitModal } from "../SurgeryCockpitModal";
import { SurgeryProtocolPanel } from "../SurgeryProtocolPanel";

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
		assert.ok(html.includes("btn-insert-surgery-diary"), "Must have Insert into diary button");
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
		assert.ok(html.includes("btn-panel-apply-diary"), "Must have Apply to diary button");
	});
});
