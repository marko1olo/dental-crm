/**
 * anesthesiaPkuDisposal.test.tsx
 * DENTE Dental CRM — Unit tests for 1-click anesthesia carpule disposal presets & single-nurse PKU clearance
 * Mandates 8e item 10, 8k, 8n / SanPiN 3.3686-21 (Medical Waste Class B).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	ANESTHESIA_PKU_PRESETS,
	calculateDefaultCarpuleExpirationDate,
	createAnesthesiaPkuFromPreset,
	createAnesthesiaPkuRecord,
	generateAnesthesiaPkuDisposalAct,
	generateAnesthesiaPkuDisposalHtml,
	type AnesthesiaPkuPresetKey,
} from "@dental/shared";
import { AnesthesiaPkuDisposalModal } from "../AnesthesiaPkuDisposalModal";

describe("Anesthesia PKU 1-Click Disposal & Single-Nurse Clearance (Mandate 8e / SanPiN 3.3686-21)", () => {
	// ── 1. Preset Catalog & Default Values ─────────────────────────────────────
	it("1. Verifies that all 4 required 1-click presets are configured in ANESTHESIA_PKU_PRESETS", () => {
		const requiredKeys: AnesthesiaPkuPresetKey[] = [
			"ultracain_ds_forte_1",
			"septanest_100_1",
			"scandonest_3_1",
			"damaged_broken_1",
		];

		for (const key of requiredKeys) {
			const preset = ANESTHESIA_PKU_PRESETS[key];
			assert.ok(preset, `Preset ${key} must exist`);
			assert.equal(preset.carpulesCount, 1, `Preset ${key} must dispose 1 carpule`);
			assert.equal(preset.expirationOffsetYears, 2, `Preset ${key} must default to +2 years`);
			assert.equal(preset.disinfectionMethod, "chemical_disinfection");
			assert.equal(preset.disinfectantNameRu, "Аламинол 3%");
			assert.equal(preset.disinfectantExposureMinutes, 60);
			assert.equal(preset.assistantSignatureConfirmed, true);
		}
	});

	it("2. Ultracain DS Forte preset: fills 1 carpule, standard series ART-2026, reason used_in_procedure", () => {
		const preset = ANESTHESIA_PKU_PRESETS.ultracain_ds_forte_1;
		assert.equal(preset.drugId, "articaine_4_epi_100k");
		assert.equal(preset.drugTradeNameRu, "Ультракаин Д-С форте");
		assert.equal(preset.standardSeriesNumber, "ART-2026");
		assert.equal(preset.standardBatchNumber, "84019");
		assert.equal(preset.disposalReason, "used_in_procedure");
	});

	it("3. Septanest 1:100 000 preset: fills 1 carpule, standard series SP-2026, reason used_in_procedure", () => {
		const preset = ANESTHESIA_PKU_PRESETS.septanest_100_1;
		assert.equal(preset.drugId, "articaine_4_epi_100k");
		assert.equal(preset.drugTradeNameRu, "Септанест 1:100 000");
		assert.equal(preset.standardSeriesNumber, "SP-2026");
		assert.equal(preset.standardBatchNumber, "73104");
		assert.equal(preset.disposalReason, "used_in_procedure");
	});

	it("4. Scandonest 3% (Cardio) preset: fills 1 carpule, adrenaline-free, series SC-2026", () => {
		const preset = ANESTHESIA_PKU_PRESETS.scandonest_3_1;
		assert.equal(preset.drugId, "mepivacaine_3_plain");
		assert.equal(preset.drugTradeNameRu, "Скандонест 3%");
		assert.equal(preset.standardSeriesNumber, "SC-2026");
		assert.equal(preset.standardBatchNumber, "51208");
		assert.equal(preset.disposalReason, "used_in_procedure");
	});

	it("5. Damaged / Broken carpule preset: sets reason damaged_broken and Class B waste disposal", () => {
		const preset = ANESTHESIA_PKU_PRESETS.damaged_broken_1;
		assert.equal(preset.disposalReason, "damaged_broken");
		assert.ok(preset.notesRu.includes("боя"));
		assert.ok(preset.notesRu.includes("Класса Б"));
	});

	it("6. calculateDefaultCarpuleExpirationDate: calculates +2 years in YYYY-MM format", () => {
		const refDate = new Date("2026-09-06T12:00:00Z");
		const expDate = calculateDefaultCarpuleExpirationDate(2, refDate);
		assert.equal(expDate, "2028-09");
	});

	// ── 2. Helper createAnesthesiaPkuFromPreset & Single-Nurse Clearance ───────
	it("7. createAnesthesiaPkuFromPreset creates valid record with single-nurse confirmation (no commission)", () => {
		const record = createAnesthesiaPkuFromPreset("ultracain_ds_forte_1", {
			doctorFullName: "Д-р Волкова Е. С.",
			nurseFullName: "Смирнова А. В.",
			patientFullName: "Пациент Тестовый",
			referenceDate: new Date("2026-09-06T10:00:00Z"),
		});

		assert.equal(record.drugId, "articaine_4_epi_100k");
		assert.equal(record.drugNameRu, "Ультракаин Д-С форте");
		assert.equal(record.carpulesUsedCount, 1);
		assert.equal(record.carpulesDisposedCount, 1);
		assert.equal(record.volumeMlTotal, 1.7);
		assert.equal(record.disposalReason, "used_in_procedure");
		assert.equal(record.wasteClass, "class_b_hazardous");
		assert.equal(record.disinfectionMethod, "chemical_disinfection");
		assert.equal(record.disinfectantNameRu, "Аламинол 3%");
		assert.equal(record.disinfectantExposureMinutes, 60);
		assert.equal(record.assistantSignatureConfirmed, true);
		assert.equal(record.seriesNumber, "ART-2026");
		assert.equal(record.batchNumber, "84019");
		assert.equal(record.expirationDate, "2028-09");

		// Act generation test: confirms single nurse signature without 3-person commission
		const actText = generateAnesthesiaPkuDisposalAct(record);
		assert.ok(actText.includes("Ультракаин Д-С форте"));
		assert.ok(actText.includes("Аламинол 3%"));
		assert.ok(actText.includes("Медицинская сестра / ассистент: ____________________ / Смирнова А. В. / [ЭЦП ПОДТВЕРЖДЕНА В 1 КЛИК]"));
		assert.ok(actText.includes("комиссия из 3 человек не требуется"));

		// HTML Act test
		const actHtml = generateAnesthesiaPkuDisposalHtml(record);
		assert.ok(actHtml.includes("Ультракаин Д-С форте"));
		assert.ok(actHtml.includes("Смирнова А. В."));
		assert.ok(actHtml.includes("СанПиН 3.3686-21: оформлено медсестрой без комиссии из 3 человек"));
	});

	it("8. createAnesthesiaPkuFromPreset for Scandonest 3% Cardio retains trade name and mepivacaine", () => {
		const record = createAnesthesiaPkuFromPreset("scandonest_3_1");
		assert.equal(record.drugId, "mepivacaine_3_plain");
		assert.equal(record.drugNameRu, "Скандонест 3%");
		assert.equal(record.seriesNumber, "SC-2026");
		assert.equal(record.carpulesUsedCount, 1);
		assert.equal(record.assistantSignatureConfirmed, true);

		const actText = generateAnesthesiaPkuDisposalAct(record);
		assert.ok(actText.includes("Скандонест 3%"));
	});

	// ── 3. Component Rendering: Modal & 1-Click UI Presets ────────────────────
	it("9. AnesthesiaPkuDisposalModal renders 1-click nurse disposal facade over NurseCarpuleDisposalModal", () => {
		const html = renderToString(
			<AnesthesiaPkuDisposalModal
				isOpen={true}
				onClose={() => {}}
			/>,
		);

		// Modal title and SanPiN 1-click clearance
		assert.ok(html.includes("1-Клик списание пустых карпул анестетиков"), "Modal title must be rendered");
		assert.ok(html.includes("СанПиН 3.3686-21 • Единолично медсестрой (без комиссии из 3 человек)"), "Single nurse SanPiN text must be rendered");

		// 1-click clinical writeoff packet button
		assert.ok(html.includes('data-testid="btn-writeoff-anesthesia-packet"'), "Standard anesthesia packet button must exist");

		// Single nurse affirmation
		assert.ok(html.includes("Единоличное утверждение медсестрой"), "Single nurse affirmation must be displayed");
	});

	it("10. AnesthesiaPkuDisposalModal renders nothing when isOpen is false", () => {
		const html = renderToString(
			<AnesthesiaPkuDisposalModal
				isOpen={false}
				onClose={() => {}}
			/>,
		);
		assert.equal(html, "");
	});
});
