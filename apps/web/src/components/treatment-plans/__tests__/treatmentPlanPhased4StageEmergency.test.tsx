/**
 * treatmentPlanPhased4StageEmergency.test.tsx — маршрутизация неотложной помощи и купирования боли.
 * (Мандат 8b: строго <= 120 строк).
 */

import React from "react";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { TreatmentPlanPhased4StageView } from "../TreatmentPlanPhased4StageView";
import type { TreatmentPlanStage } from "../types";

describe("TreatmentPlanPhased4StageView — Неотложная помощь", () => {
	it("routes emergency and acute pain relief procedures into Stage 1 (hygiene_sanitation)", () => {
		const emergencyStages: TreatmentPlanStage[] = [
			{
				stageNumber: 1,
				title: "Неотложная помощь",
				stageKind: "stage_1_therapy",
				subtitle: "Купирование боли",
				clinicalGoal: "Купирование острой боли",
				totalRub: 8000,
				totalKopecks: 800000 as any,
				estimatedVisits: 1,
				estimatedWeeks: 1,
				order804nCodes: ["A16.07.007", "A16.07.016"],
				items: [
					{
						id: "em-1",
						name: "Купирование острой боли: ампутация пульпы (пульпотомия)",
						code804n: "A16.07.007",
						category: "therapy",
						priceRub: 4500,
						stageKind: "stage_1_therapy",
						phase: 1,
						quantity: 1,
						unitPriceRub: 4500,
						discountRub: 0,
						isAuto: true,
					},
					{
						id: "em-2",
						name: "Вскрытие поднадкостничного очага воспаления (дренирование)",
						code804n: "A16.07.016",
						category: "surgery",
						priceRub: 3500,
						stageKind: "stage_1_therapy",
						phase: 1,
						quantity: 1,
						unitPriceRub: 3500,
						discountRub: 0,
						isAuto: true,
					},
				],
			},
		];

		const html = renderToString(
			<TreatmentPlanPhased4StageView
				stages={emergencyStages}
				planTierTitle="Неотложный план"
				patientName="Сидоров С. С."
			/>
		);

		assert.ok(html.includes("phased-stage-card-hygiene_sanitation"));
		assert.ok(html.includes("Неотложная помощь и купирование боли / Санация"));
		assert.ok(html.includes("Рассрочка 0% клиники"));
		assert.ok(html.includes("Этапы 30/40/30"));
		assert.ok(html.includes("Готовность маршрута:"));
		assert.ok(html.includes("Финансовая сводка и график оплаты по этапам"));
	});
});
