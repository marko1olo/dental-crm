import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { STANDARD_ANESTHESIA_PRESETS } from "../anesthesiaCatalog";
import { AnesthesiaQuickBar } from "../AnesthesiaQuickBar";
import { EmergencyRescueModal } from "../../emergency/EmergencyRescueModal";
import { OrthodonticVisitProtocolWidget } from "../../orthodontics/OrthodonticVisitProtocolWidget";

describe("Wave 40: Doctor Autonomy & Dead-Ends Elimination (Mandates 8e, 8i, 8k, 8n)", () => {
	describe("1. Anesthesia & Emergency Protocols 1-Click Autonomy", () => {
		it("STANDARD_ANESTHESIA_PRESETS contains ultracain_ds_forte workhorse preset", () => {
			const preset = STANDARD_ANESTHESIA_PRESETS.ultracain_ds_forte;
			assert.ok(preset, "ultracain_ds_forte preset must exist");
			assert.equal(preset.drugId, "articaine_1_100k");
			assert.equal(preset.carpulesCount, 1);
			assert.equal(preset.techniqueId, "infiltration");
		});

		it("AnesthesiaQuickBar renders 1-click anesthesia presets and carpule buttons", () => {
			const html = renderToString(
				<AnesthesiaQuickBar
					targetToothNumberFdi={16}
					patientWeightKg={70}
					onApplyAnesthesia={() => {}}
				/>,
			);
			assert.ok(
				html.includes('data-testid="anesthesia-dose-norm-preset"') ||
				html.includes('data-testid="anesthesia-preset-mandibular-infiltration-ultracaine-forte"'),
				"Must render 1-click anesthesia preset buttons",
			);
			assert.ok(
				html.includes("Артикаин") || html.includes("Ультракаин"),
				"Must show preset label",
			);
		});

		it("EmergencyRescueModal renders 1-click resuscitation and anaphylaxis protocols", () => {
			const html = renderToString(
				<EmergencyRescueModal
					isOpen={true}
					onClose={() => {}}
					initialPatientName="Тестовый Пациент"
					initialPatientAgeYears={35}
					initialPatientWeightKg={70}
					defaultScenarioId="anaphylactic_shock"
				/>,
			);
			assert.ok(
				html.includes("Адреналин 0.1% (Эпинефрин)"),
				"Adrenaline 1st line resuscitation card must be rendered",
			);
			assert.ok(
				html.includes("Преднизолон"),
				"Prednisolone 2nd line resuscitation card must be rendered",
			);
			assert.ok(
				html.includes("Анафилактический шок"),
				"Must display Anaphylaxis protocol title",
			);
		});
	});

	describe("2. Orthodontics Dead-Ends Elimination", () => {
		it("OrthodonticVisitProtocolWidget elastic size select is not disabled when scheme is none", () => {
			const html = renderToString(
				<OrthodonticVisitProtocolWidget
					isOpen={true}
					onClose={() => {}}
					patientId="pat-101"
				/>,
			);
			assert.ok(
				html.includes('aria-label="Размер эластиков"'),
				"Elastic size select must be present",
			);
			const selectMatch = html.match(
				/<select[^>]*aria-label="Размер эластиков"[^>]*>/,
			);
			assert.ok(selectMatch, "Select element found");
			assert.ok(
				!selectMatch[0].includes("disabled"),
				"Select must not have disabled attribute",
			);
		});
	});
});
