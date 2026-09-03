import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	ImplantSurgicalPassportModal,
	type ImplantSurgicalPassportData,
} from "../ImplantSurgicalPassportModal";
import { ImplantIsqProtocolModal } from "../isq/ImplantIsqProtocolModal";
import { evaluateImplantIsqStability } from "../isq/implantIsqEngine";

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

describe("ImplantIsqProtocolModal (Implant RFA ISQ & Torque Stability Protocol)", () => {
	it("renders ISQ protocol modal with Osstell/Penguin badge, 1-click clinical norm button, and 043/u action triggers", () => {
		const html = renderToString(
			<ImplantIsqProtocolModal
				isOpen={true}
				onClose={() => {}}
				initialToothNumber={36}
				initialImplantSystem="Straumann BLX Roxolid SLActive"
				initialDiameterMm={4.0}
				initialLengthMm={10.0}
				surgeonName="Др. Ковалев А. В."
				patientName="Иванов Сергей Павлович"
				patientId="PAT-2026-0741"
			/>
		);

		// Container & Header
		assert.ok(html.includes("isq-modal-container"), "Must render modal container");
		assert.ok(html.includes("Дентальная имплантация: Торк &amp; RFA ISQ Остеоинтеграция") || html.includes("RFA ISQ"), "Must display title");
		assert.ok(html.includes("Зуб 36"), "Must display tooth number badge");
		assert.ok(html.includes("Osstell / Penguin RFA"), "Must display device badge");

		// 1-Click Clinical Norm Button
		assert.ok(html.includes("Клиническая норма (1 клик)"), "Must render 1-click clinical norm fill button");

		// Misch Bone Density options
		assert.ok(html.includes("D1"), "Must display D1 density");
		assert.ok(html.includes("D2"), "Must display D2 density");
		assert.ok(html.includes("D3"), "Must display D3 density");
		assert.ok(html.includes("D4"), "Must display D4 density");

		// Directional ISQ sensors
		assert.ok(html.includes("Вестиб. (V)"), "Must render vestibular sensor input");
		assert.ok(html.includes("Язычн. (L)"), "Must render lingual sensor input");
		assert.ok(html.includes("Медиал. (M)"), "Must render mesial sensor input");
		assert.ok(html.includes("Дистал. (D)"), "Must render distal sensor input");

		// 1-Click 043/u & Export buttons
		assert.ok(html.includes("Внести в 043/у (1 клик)"), "Must render 1-click 043/u insertion button");
		assert.ok(html.includes("Выгрузить"), "Must render export passport button");
		assert.ok(html.includes("Сохранить протокол ISQ"), "Must render save protocol button");
	});

	it("returns null when isOpen is false", () => {
		const html = renderToString(
			<ImplantIsqProtocolModal
				isOpen={false}
				onClose={() => {}}
			/>
		);

		assert.equal(html, "", "Should return empty string when closed");
	});

	it("evaluates clinical norm stability: Torque 38 Ncm, ISQ 70-74 triggers immediate loading", () => {
		const evaluation = evaluateImplantIsqStability({
			implantSystemName: "Straumann BLX Roxolid SLActive",
			diameterMm: 4.0,
			lengthMm: 10.0,
			toothNumberFdi: 36,
			insertionTorqueNcm: 38,
			boneDensity: "D2",
			isqReadings: {
				vestibularBuccal: 72,
				lingualPalatal: 74,
				mesial: 70,
				distal: 71,
			},
			isGbrOrSinusLift: false,
			isImmediateExtractionSocket: false,
			surgeonName: "Др. Ковалев А. В.",
		});

		assert.equal(evaluation.loadingRecommendation, "immediate_loading_safe", "Immediate loading must be permitted for clinical norm");
		assert.ok(evaluation.meanIsq >= 70, `Mean ISQ must be >= 70 (got ${evaluation.meanIsq})`);
		assert.equal(evaluation.torqueCategory, "high_stability");
		assert.ok(evaluation.diaryEntryRu.includes("Форма № 043/у"), "Must contain Form 043/u heading");
		assert.ok(evaluation.diaryEntryRu.includes("38 Н·см"), "Diary must record 38 Ncm torque");
		assert.ok(evaluation.diaryEntryRu.includes("D2"), "Diary must record D2 bone density");
	});
});
