import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	ImplantSurgicalPassportModal,
	type ImplantSurgicalPassportData,
} from "../ImplantSurgicalPassportModal";

describe("ImplantSurgicalPassportModal (Implantology Surgical Passport & ISQ Suite)", () => {
	it("renders surgical passport modal with Misch bone densities, torque slider, and ISQ tabs", () => {
		const html = renderToString(
			<ImplantSurgicalPassportModal
				isOpen={true}
				onClose={() => {}}
				patientName="Иванов Сергей Павлович"
				patientId="PAT-2026-0741"
				doctorName="Др. Ковалев А. В."
				initialTooth={46}
			/>
		);

		// Modal container & Header
		assert.ok(html.includes("implant-surgical-passport-modal"), "Must render modal container");
		assert.ok(html.includes("Хирургический паспорт имплантации"), "Must display title");
		assert.ok(html.includes("46"), "Must display tooth number");
		assert.ok(html.includes("Иванов Сергей Павлович"), "Must display patient name");
		assert.ok(html.includes("Др. Ковалев А. В."), "Must display surgeon name");

		// Nav Tabs
		assert.ok(html.includes("implant-tab-protocol"), "Must render protocol tab button");
		assert.ok(html.includes("implant-tab-isq"), "Must render isq tab button");
		assert.ok(html.includes("implant-tab-diary"), "Must render diary tab button");
		assert.ok(html.includes("implant-tab-passport"), "Must render passport tab button");

		// Implant brand presets
		assert.ok(html.includes("implant-preset-btn-Straumann"), "Must render Straumann preset button");
		assert.ok(html.includes("implant-preset-btn-Nobel Biocare"), "Must render Nobel preset button");
		assert.ok(html.includes("implant-preset-btn-Osstem"), "Must render Osstem preset button");

		// Misch Bone Density cards
		assert.ok(html.includes("bone-card-D1"), "Must render D1 bone density card");
		assert.ok(html.includes("bone-card-D2"), "Must render D2 bone density card");
		assert.ok(html.includes("bone-card-D3"), "Must render D3 bone density card");
		assert.ok(html.includes("bone-card-D4"), "Must render D4 bone density card");

		// Torque & Dimensions inputs
		assert.ok(html.includes("torque-slider"), "Must render torque slider");
		assert.ok(html.includes("input-diameter"), "Must render diameter input");
		assert.ok(html.includes("input-length"), "Must render length input");
		assert.ok(html.includes("input-lot"), "Must render lot input");

		// Action buttons in footer
		assert.ok(html.includes("implant-insert-diary-btn"), "Must render Insert into diary button");
		assert.ok(html.includes("implant-save-passport-btn"), "Must render Save passport button");
	});

	it("returns null when isOpen is false", () => {
		const html = renderToString(
			<ImplantSurgicalPassportModal
				isOpen={false}
				onClose={() => {}}
			/>
		);

		assert.equal(html, "", "Should return empty string when isOpen is false");
	});
});
