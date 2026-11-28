import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	CANONICAL_LAB_MATERIALS,
	CANONICAL_LAB_STAGES,
	calcNetRevenueKopecks,
	formatKopecksToRubles,
} from "../dentalLabCatalogData";
import {
	CANONICAL_LAB_WORK_TYPES,
	DENTAL_LAB_CONSTRUCTIONS,
	formatLabConstructionTitle,
	formatLabMaterial,
} from "../dentalLabDefinitions";
import { DentalLabCreateOrderSection } from "../DentalLabCreateOrderSection";
import { DentalLabShadePicker } from "../DentalLabShadePicker";

const sampleCreateSectionProps = {
	activeMainTab: "new_order",
	patientInput: "Тест Пациент",
	setPatientInput: () => {},
	availablePatients: [],
	selectedTeeth: [16],
	setSelectedTeeth: () => {},
	toggleTooth: () => {},
	selectedMaterialId: "zirconia_multilayer",
	setSelectedMaterialId: () => {},
	selectedShade: "A2",
	setSelectedShade: () => {},
	selectedLab: "Лаборатория Альфа",
	setSelectedLab: () => {},
	allLaboratories: ["Лаборатория Альфа"],
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
};

describe("dentalLabMarketCatalogCodeQuality — Catalog Runtime & Zero Emojis", () => {
	it("Catalog materials and work types use positive integer kopecks and clean labels", () => {
		assert.ok(CANONICAL_LAB_MATERIALS.length >= 6);
		assert.ok(CANONICAL_LAB_WORK_TYPES.length >= 4);
		assert.ok(Object.keys(DENTAL_LAB_CONSTRUCTIONS).length >= 4);
		assert.equal(CANONICAL_LAB_STAGES.length, 5);

		for (const mat of CANONICAL_LAB_MATERIALS) {
			assert.equal(Number.isInteger(mat.baseLabCostKopecks), true);
			assert.equal(Number.isInteger(mat.defaultPatientPriceKopecks), true);
			assert.ok(mat.baseLabCostKopecks > 0);
			assert.ok(mat.defaultPatientPriceKopecks > mat.baseLabCostKopecks);
		}

		assert.ok(formatLabConstructionTitle("single_crown").length > 0);
		assert.ok(formatLabMaterial("zirconia_multilayer").length > 0);
		assert.equal(calcNetRevenueKopecks(2500000, 750000), 1750000);
		assert.ok(formatKopecksToRubles(1750000).includes("₽"));
	});

	it("Mandate 8d: Zero cartoon emojis in rendered ZTL order form and shade picker", () => {
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		const formHtml = renderToString(
			React.createElement(DentalLabCreateOrderSection, sampleCreateSectionProps),
		);
		const shadeHtml = renderToString(
			React.createElement(DentalLabShadePicker, {
				selectedShade: "A2",
				onSelectShade: () => {},
			}),
		);

		assert.equal(emojiRegex.test(formHtml.replace(/✓/g, "")), false);
		assert.equal(emojiRegex.test(shadeHtml.replace(/✓/g, "")), false);
	});
});
