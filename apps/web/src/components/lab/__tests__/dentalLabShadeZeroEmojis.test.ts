import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { DentalLabOrdersView } from "../DentalLabOrdersView";
import { DentalLabShadePicker } from "../DentalLabShadePicker";
import { DentalLabFinancialGate } from "../DentalLabFinancialGate";
import { checkDentalLabFinancialGate } from "../dentalLabFinancialGateEngine";
import { DentalLabCreateOrderSection } from "../DentalLabCreateOrderSection";

describe("Dental Lab — Mandate 8d Zero Emojis Compliance", () => {
	it("10. Zero emojis across rendered Dental Lab views, pickers, and gates (Mandate 8d Sin #7)", () => {
		const gateResult = checkDentalLabFinancialGate({ stageTotalKopecks: 2000000, paidKopecks: 1000000 });
		const renders = [
			renderToString(React.createElement(DentalLabOrdersView, { initialOrders: [] })),
			renderToString(
				React.createElement(DentalLabShadePicker, {
					selectedShade: "A2",
					onSelectShade: () => {},
				}),
			),
			renderToString(React.createElement(DentalLabFinancialGate, { gateResult, isOpen: true })),
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

		const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
		const extPictRegex = /\p{Extended_Pictographic}/u;

		for (const html of renders) {
			const cleaned = html.replace(/[✓✕•→]/g, "");
			assert.equal(emojiRegex.test(cleaned), false);
			assert.equal(extPictRegex.test(cleaned), false);
		}
	});
});
