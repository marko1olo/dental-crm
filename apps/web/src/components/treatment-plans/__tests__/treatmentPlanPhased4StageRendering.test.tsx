/**
 * treatmentPlanPhased4StageRendering.test.tsx — отображение 4 фаз и отсутствие блокировок кнопок.
 * (Мандат 8b: строго <= 120 строк).
 */

import React from "react";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { TreatmentPlanPhased4StageView } from "../TreatmentPlanPhased4StageView";
import { mockPhasedStages } from "./helpers/phasedStagesTestHelpers";

describe("TreatmentPlanPhased4StageView — Рендеринг 4 этапов", () => {
	it("renders the 4 clinical phases with exact totals and badges", () => {
		const html = renderToString(
			<TreatmentPlanPhased4StageView
				stages={mockPhasedStages}
				planTierTitle="Оптимальный план"
				patientName="Иванов И.И."
			/>
		);

		assert.ok(html.includes('data-testid="treatment-plan-phased-4stage-view"'));
		assert.ok(html.includes("4 клинических этапа"));
		assert.ok(html.includes("phased-stage-card-hygiene_sanitation"));
		assert.ok(html.includes("phased-stage-card-endo_therapy"));
		assert.ok(html.includes("phased-stage-card-surgery_implant"));
		assert.ok(html.includes("phased-stage-card-ortho_prosthetics"));
		assert.ok(html.includes("95") && html.includes("000"));
		assert.ok(html.includes("Air-Flow"));
		assert.ok(html.includes("Straumann"));
		assert.ok(html.includes("диоксида циркония"));
	});

	it("renders 1-click stage-to-visit booking button and execute stage button (Mandate 8e Doctor Autonomy)", () => {
		const html = renderToString(
			<TreatmentPlanPhased4StageView
				stages={mockPhasedStages}
				planTierTitle="Тест план"
				patientName="Петров П.П."
				onBookStageToVisit={() => {}}
				onExecuteStage={() => {}}
				onToggleStage={() => {}}
			/>
		);

		assert.ok(html.includes('data-testid="phased-book-stage-hygiene_sanitation"'));
		assert.ok(html.includes("Записать на приём"));
		assert.ok(html.includes("Приступить к этапу"));
		assert.ok(!html.includes('disabled=""'));
		assert.ok(!html.includes(" disabled "));

		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.ok(!emojiRegex.test(html));
	});
});
