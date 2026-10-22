/**
 * treatmentPlanModuleHicksToolbar.test.tsx — закон Хика в тулбаре TreatmentPlanModule.
 * (Мандат 8b: строго <= 120 строк).
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { TreatmentPlanModule } from "../TreatmentPlanModule";
import { AppLogicProvider } from "../../../contexts/AppLogicContext";
import { mockAppContextWave49, sampleTeethWave49 } from "./helpers/wave49TestHelpers";

describe("TreatmentPlanModule — Чистый тулбар по закону Хика", () => {
	it("renders clean single-line toolbar with mode toggles and actions", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppContextWave49}>
				<TreatmentPlanModule
					patientId="PAT-WAVE49"
					patientName="Смирнова Екатерина Васильевна"
					teethData={sampleTeethWave49}
				/>
			</AppLogicProvider>
		);

		assert.ok(html.includes("3 Варианта"));
		assert.ok(html.includes("Поэтапный (I, II, III)"));
		assert.ok(html.includes("tp-sign-btn"));
		assert.ok(html.includes("tp-invoice-btn"));
		assert.ok(html.includes("tp-fiscal-btn"));
		assert.ok(html.includes("treatment-plan-options-menu-btn"));
	});

	it("guarantees 'Куратор' button is NOT duplicated in main toolbar row (Hick's Law)", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppContextWave49}>
				<TreatmentPlanModule
					patientId="PAT-WAVE49"
					patientName="Смирнова Екатерина Васильевна"
					teethData={sampleTeethWave49}
				/>
			</AppLogicProvider>
		);

		assert.ok(!html.includes('title="Закрепить куратора лечения за пациентом и планом (Фича #27)"'));
	});

	it("renders Curator of treatment inside Options menu with UserCheck and curator badge", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppContextWave49}>
				<TreatmentPlanModule
					patientId="PAT-WAVE49"
					patientName="Смирнова Екатерина Васильевна"
					teethData={sampleTeethWave49}
					initialOptionsMenuOpen={true}
				/>
			</AppLogicProvider>
		);

		assert.ok(html.includes("options-menu-curator-btn"));
		assert.ok(html.includes("Куратор лечения (воронка и комиссия)"));
		assert.ok(html.includes("Петрова"));
	});

	it("ensures Apple HIG touch-targets (>= 44px mobile, >= 38px desktop) for toolbar buttons", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppContextWave49}>
				<TreatmentPlanModule
					patientId="PAT-WAVE49"
					patientName="Смирнова Екатерина Васильевна"
					teethData={sampleTeethWave49}
				/>
			</AppLogicProvider>
		);

		assert.ok(html.includes("min-h-[44px]"));
		assert.ok(html.includes("sm:min-h-[38px]"));
		assert.ok(html.includes("touch-manipulation"));
	});
});
