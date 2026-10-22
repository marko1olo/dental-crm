import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { TreatmentPlanRoadmap } from "../TreatmentPlanRoadmap";
import { buildStagesFromPlanItems } from "../treatmentPlanPersistenceEngine";
import { sampleCompletedStage } from "./helpers/roadmapCompletionTestHelpers";

describe("TreatmentPlanRoadmap — Completed Stage Progress and Financials", () => {
	it("3. Displays progress indicator «Выполнено N из M процедур ({X}%)»", () => {
		const html = renderToString(
			<TreatmentPlanRoadmap customRoadmapStages={[sampleCompletedStage]} planTitle="Тестовый план" />,
		);
		assert.ok(html.includes("Выполнено 2 из 2 процедур (100%)"));
		assert.ok(html.includes("roadmap-stage-progress-indicator"));
	});

	it("4. Recalculates and displays remaining cost as 0 ₽ for completed stage", () => {
		const html = renderToString(
			<TreatmentPlanRoadmap customRoadmapStages={[sampleCompletedStage]} planTitle="Тестовый план" />,
		);
		assert.ok(html.includes("Остаток к оплате: 0,00 ₽"));
	});

	it("5. buildStagesFromPlanItems sets status = 'completed' when all stage items are done", () => {
		const rawItems = [
			{ id: "raw-1", phase: 1, priceId: "A16.07.002", name: "Лечение кариеса", price: 5000, quantity: 1, isCompleted: true },
			{ id: "raw-2", phase: 1, priceId: "A16.07.030", name: "Лечение каналов", price: 6000, quantity: 1, status: "completed" },
			{ id: "raw-3", phase: 2, priceId: "A16.07.004", name: "Коронка", price: 18000, quantity: 1, isCompleted: false },
		];

		const stages = buildStagesFromPlanItems(rawItems);
		assert.equal(stages.length, 2);
		assert.equal(stages[0]!.stageNumber, 1);
		assert.equal(stages[0]!.status, "completed");
		assert.equal(stages[0]!.items[0]!.isCompleted, true);
		assert.equal(stages[0]!.items[1]!.isCompleted, true);
		assert.equal(stages[1]!.stageNumber, 2);
		assert.equal(stages[1]!.status, "agreed");
		assert.equal(stages[1]!.items[0]!.isCompleted, false);
	});
});
