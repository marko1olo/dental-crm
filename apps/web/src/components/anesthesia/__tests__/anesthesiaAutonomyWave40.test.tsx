import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { STANDARD_ANESTHESIA_PRESETS } from "../anesthesiaCatalog";
import { AnesthesiaProtocolModal } from "../AnesthesiaProtocolModal";
import { EmergencyAnaphylaxisProtocolModal } from "../EmergencyAnaphylaxisProtocolModal";
import { OrthodonticVisitProtocolWidget } from "../../orthodontics/OrthodonticVisitProtocolWidget";
import { OrthodonticStudioModal } from "../../orthodontics/OrthodonticStudioModal";

describe("Wave 40: Doctor Autonomy & Dead-Ends Elimination (Mandates 8e, 8i, 8k, 8n)", () => {
	describe("1. Anesthesia & Emergency Protocols 1-Click Autonomy", () => {
		it("STANDARD_ANESTHESIA_PRESETS contains ultracain_ds_forte workhorse preset", () => {
			const preset = STANDARD_ANESTHESIA_PRESETS.ultracain_ds_forte;
			assert.ok(preset, "ultracain_ds_forte preset must exist");
			assert.equal(preset.drugId, "articaine_1_100k");
			assert.equal(preset.carpulesCount, 1);
			assert.equal(preset.techniqueId, "infiltration");
		});

		it("AnesthesiaProtocolModal renders 1-click ultracain_ds_forte preset button", () => {
			const html = renderToString(
				<AnesthesiaProtocolModal
					isOpen={true}
					onClose={() => {}}
					toothNumber={16}
					patientName="Иванов И.И."
				/>,
			);
			assert.ok(
				html.includes('data-testid="btn-anesthesia-preset-ultracain-ds-forte"'),
				"Must render data-testid btn-anesthesia-preset-ultracain-ds-forte",
			);
			assert.ok(
				html.includes("Ультракаин Д-С Форте 1.7 мл"),
				"Must show preset label",
			);
		});

		it("EmergencyAnaphylaxisProtocolModal renders 1-click anaphylaxis combo buttons in header and quick grid", () => {
			const html = renderToString(
				<EmergencyAnaphylaxisProtocolModal
					isOpen={true}
					onClose={() => {}}
					patientName="Тестовый Пациент"
					patientAge={35}
					patientWeightKg={70}
				/>,
			);
			assert.ok(
				html.includes('data-testid="header-1click-anaphylaxis-btn"'),
				"Header 1-click anaphylaxis button must be rendered",
			);
			assert.ok(
				html.includes('data-testid="btn-emergency-1click-anaphylaxis-combo"'),
				"Grid 1-click anaphylaxis combo button must be rendered",
			);
			assert.ok(
				html.includes("1-Клик Анафилаксия"),
				"Must display 1-Клик Анафилаксия text in header",
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

		it("OrthodonticStudioModal elastic size select is not disabled when scheme is none", () => {
			const html = renderToString(
				<OrthodonticStudioModal
					isOpen={true}
					onClose={() => {}}
					patientId="pat-102"
				/>,
			);
			assert.ok(
				html.includes('aria-label="Размер эластиков"'),
				"Elastic size select must be present in OrthodonticStudioModal",
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
