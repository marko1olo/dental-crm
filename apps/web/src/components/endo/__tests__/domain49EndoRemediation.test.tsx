import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	calculateEndoBillingAndMaterialsEstimate,
	calculateEndoTreatmentCostKopecks,
	generateEndoClinicalProtocolTable,
	getAnatomicalRootCanalCount,
	type EndoCanalData,
} from "@dental/shared";
import { EndoCanalsTableSection } from "../studioModules/EndoCanalsTableSection";
import { ToothDrawerSurfacesAccordion } from "../../diagnostics/toothDrawer/ToothDrawerSurfacesAccordion";

describe("Domain 49: Endodontics & Apex Locators Remediation Suite (SEV-1 — SEV-4)", () => {
	it("1. [SEV-1 / Mandate 8bm] Financial DTOs enforce exact BigInt kopecks without float drift", () => {
		const estimate = calculateEndoBillingAndMaterialsEstimate({
			toothNumber: 16,
			stageStamp: "COMPLETED",
		});

		assert.equal(typeof estimate.totalServicesPriceKopecks, "bigint");
		assert.equal(typeof estimate.totalMaterialsCostKopecks, "bigint");
		assert.ok(estimate.totalServicesPriceKopecks > 0n);
		assert.ok(estimate.totalMaterialsCostKopecks > 0n);

		const cost = calculateEndoTreatmentCostKopecks({
			toothNumber: 16,
			canalsCount: 3,
			protocolId: "primary_endo",
		});
		assert.equal(typeof cost.totalKopecks, "bigint");
		assert.ok(cost.totalKopecks > 0n);
	});

	it("2. [SEV-2] Pediatric endodontics unblocked chairside for deciduous teeth (51–85)", () => {
		// Зуб 54 — молочный моляр
		const html = renderToString(
			<ToothDrawerSurfacesAccordion
				activeSection="surfaces_endo"
				toggleSection={() => {}}
				toothNumber={54}
				toothData={{
					toothNumber: 54,
					surfaces: ["O"],
					state: "caries",
				}}
			/>,
		);

		// ChairsideEndoQuickBar должен быть отрендерен даже для молочного зуба
		assert.ok(html.includes("chairside-endo-quickbar"), "ChairsideEndoQuickBar must render for primary teeth");
		assert.ok(html.includes("54"), "Tooth 54 rendered in quickbar");
	});

	it("3. [SEV-2 / Mandate 8e] Wheeler topology anatomical variation hint renders when canals exceed norm", () => {
		// Резец 11: анатомическая норма = 1 канал
		const expectedNorm = getAnatomicalRootCanalCount(11);
		assert.equal(expectedNorm, 1);

		// Создаем 3 канала на резце (аномалия)
		const canals: EndoCanalData[] = [
			{ id: "c1", canalName: "Main", referencePoint: "Режущий край", workingLengthMm: 21, masterApicalFile: "#25", taper: ".04", obturationTechnique: "AH Plus" },
			{ id: "c2", canalName: "Lingual", referencePoint: "Бугорок", workingLengthMm: 20, masterApicalFile: "#20", taper: ".04", obturationTechnique: "AH Plus" },
			{ id: "c3", canalName: "Distal", referencePoint: "Край", workingLengthMm: 19.5, masterApicalFile: "#20", taper: ".04", obturationTechnique: "AH Plus" },
		];

		const html = renderToString(
			<EndoCanalsTableSection
				activeTooth={11}
				canals={canals}
				onApplyAllCanalsApex00={() => {}}
				onUpdateCanal={() => {}}
				onToggleObliteration={() => {}}
				onAdjustLength={() => {}}
				onUpdateCanalLength={() => {}}
				onRemoveCanal={() => {}}
			/>,
		);

		assert.ok(html.includes("endo-anatomical-variation-hint"), "Hint container must be present");
		assert.ok(html.includes("Редкая анатомическая вариация"), "Text must alert about variation");
		assert.ok(html.includes("резца"), "Tooth group must be resolved to incisor");
	});

	it("4. [SEV-3 & SEV-4] Canonical protocol table alias generateEndoClinicalProtocolTable is exported and formats cleanly", () => {
		const canals: EndoCanalData[] = [
			{ id: "c1", canalName: "MB", referencePoint: "Бугор", workingLengthMm: 21.5, masterApicalFile: "#25.04", taper: ".04", obturationTechnique: "AH Plus" },
		];
		const table = generateEndoClinicalProtocolTable(canals);
		assert.ok(typeof table === "string");
		assert.ok(table.includes("Таблица учёта рабочей длины корневых каналов"));
		assert.ok(table.includes("MB"));
	});
});
