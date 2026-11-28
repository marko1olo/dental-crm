import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { DentalLabOrdersView } from "../DentalLabOrdersView";
import { DentalLabShadePicker } from "../DentalLabShadePicker";
import { DentalLabCreateOrderSection } from "../DentalLabCreateOrderSection";

describe("Wave 243 — Zero Emojis Compliance", () => {
	it("3. Zero emojis across rendered Dental Lab studio views (Mandate 8d Sin #7)", () => {
		const emojiRegex = /\p{Extended_Pictographic}/u;
		const renders = [
			renderToString(React.createElement(DentalLabOrdersView, { initialOrders: [] })),
			renderToString(
				React.createElement(DentalLabShadePicker, {
					selectedShade: "A2",
					onSelectShade: () => {},
				}),
			),
			renderToString(
				React.createElement(DentalLabCreateOrderSection, {
					activeMainTab: "new_order",
					patientInput: "Пациент",
					setPatientInput: () => {},
					availablePatients: [],
					selectedTeeth: [16],
					setSelectedTeeth: () => {},
					toggleTooth: () => {},
					selectedMaterialId: "zirconia_multilayer",
					setSelectedMaterialId: () => {},
					selectedShade: "A2",
					setSelectedShade: () => {},
					selectedLab: "Лаборатория",
					setSelectedLab: () => {},
					allLaboratories: ["Лаборатория"],
					customLabs: [],
					setCustomLabs: () => {},
					effectiveDueDate: "2026-12-05",
					setCustomDueDate: () => {},
					isUrgent: false,
					setIsUrgent: () => {},
					notes: "",
					setNotes: () => {},
					teethCount: 1,
					totalLabCostKopecks: 750000,
					totalPatientPriceKopecks: 2400000,
					netClinicRevenueKopecks: 1650000,
					handleCreateOrder: () => {},
					handlePrintA5Blank: () => {},
					handleCourierBlank: () => {},
				}),
			),
		];

		for (const html of renders) {
			assert.equal(emojiRegex.test(html.replace(/[✓✕•→]/g, "")), false);
		}
	});
});
