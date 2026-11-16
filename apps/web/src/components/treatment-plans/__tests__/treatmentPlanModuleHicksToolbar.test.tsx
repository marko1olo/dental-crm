/**
 * treatmentPlanModuleHicksToolbar.test.tsx — закон Хика в интерфейсе TreatmentPlanStudioModal.
 * (Мандат 8b: строго <= 120 строк).
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { TreatmentPlanStudioModal } from "../TreatmentPlanStudioModal.js";
import { AppLogicProvider } from "../../../contexts/AppLogicContext.js";
import { mockAppContextWave49, sampleTeethWave49 } from "./helpers/wave49TestHelpers.js";

describe("TreatmentPlanStudioModal — Чистый интерфейс по закону Хика", () => {
	it("renders clean single-line header with depth toggles and actions", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppContextWave49}>
				<TreatmentPlanStudioModal
					isOpen={true}
					onClose={() => {}}
					patientId="PAT-WAVE49"
					patientName="Смирнова Екатерина Васильевна"
					teeth={sampleTeethWave49}
				/>
			</AppLogicProvider>
		);

		assert.ok(html.includes("Экспресс"));
		assert.ok(html.includes("Эксперт"));
		assert.ok(html.includes("Тарифы и этапы"));
		assert.ok(html.includes("print-plan-btn"));
		assert.ok(html.includes("approve-treatment-plan-btn"));
	});

	it("guarantees curator is placed in tabs and NOT duplicated in header row (Hick's Law)", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppContextWave49}>
				<TreatmentPlanStudioModal
					isOpen={true}
					onClose={() => {}}
					patientId="PAT-WAVE49"
					patientName="Смирнова Екатерина Васильевна"
					teeth={sampleTeethWave49}
				/>
			</AppLogicProvider>
		);

		assert.ok(html.includes('data-testid="tab-curator-assignment"'));
		assert.ok(!html.includes('title="Закрепить куратора лечения за пациентом и планом (Фича #27)"'));
	});

	it("guarantees clean clinical labels without commission or broker jargon", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppContextWave49}>
				<TreatmentPlanStudioModal
					isOpen={true}
					onClose={() => {}}
					patientId="PAT-WAVE49"
					patientName="Смирнова Екатерина Васильевна"
					teeth={sampleTeethWave49}
				/>
			</AppLogicProvider>
		);

		assert.ok(!html.includes("комиссия"));
		assert.ok(!html.includes("брокер"));
		assert.ok(html.includes("Куратор плана"));
	});

	it("ensures Apple HIG touch-targets (>= 44px mobile, >= 36px desktop) for interactive buttons", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppContextWave49}>
				<TreatmentPlanStudioModal
					isOpen={true}
					onClose={() => {}}
					patientId="PAT-WAVE49"
					patientName="Смирнова Екатерина Васильевна"
					teeth={sampleTeethWave49}
				/>
			</AppLogicProvider>
		);

		assert.ok(html.includes("min-h-[44px]") || html.includes("min-h-[52px]"));
		assert.ok(html.includes("min-h-[36px]"));
	});
});
