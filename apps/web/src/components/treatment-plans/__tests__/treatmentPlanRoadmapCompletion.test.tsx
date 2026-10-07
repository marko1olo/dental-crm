/**
 * treatmentPlanRoadmapCompletion.test.tsx
 *
 * Closed-Loop Verification for TreatmentPlanRoadmap & treatmentPlanPersistenceEngine:
 * 1. Verifies completed stage renders green badge «✓ Этап выполнен».
 * 2. Verifies completed stage replaces «Записаться на этот этап» with «✓ Пройден на приеме {дата}».
 * 3. Verifies stage progress indicator shows «Выполнено N из M процедур ({X}%)».
 * 4. Verifies remaining cost is 0 ₽ for completed stages.
 * 5. Verifies buildStagesFromPlanItems sets stage status = 'completed' when all items are done.
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { TreatmentPlanRoadmap, type RoadmapStageData } from "../TreatmentPlanRoadmap";
import { buildStagesFromPlanItems } from "../treatmentPlanPersistenceEngine";

describe("TreatmentPlanRoadmap Closed-Loop Lifecycle & Visual Indicators", () => {
	const sampleProcedures = [
		{
			id: "proc-1",
			code804n: "A16.07.002",
			medicalTitleRu: "Лечение кариеса 16",
			patientFriendlyTitleRu: "Лечение кариеса с анатомической реставрацией",
			toothNumber: 16,
			priceRub: 5000,
			priceKopecks: 500000,
			quantity: 1,
			isCompleted: true,
		},
		{
			id: "proc-2",
			code804n: "A16.07.030",
			medicalTitleRu: "Эндодонтия 16",
			patientFriendlyTitleRu: "Лечение корневых каналов под микроскопом",
			toothNumber: 16,
			priceRub: 6000,
			priceKopecks: 600000,
			quantity: 1,
			isCompleted: true,
		},
	];

	const sampleCompletedStage: RoadmapStageData = {
		stageNumber: 2,
		stageKind: "stage_2_therapy",
		titleRu: "Этап 2: Терапевтическая санация",
		subtitleRu: "Лечение кариеса и корневых каналов",
		patientGoalRu: "Ликвидация кариеса и инфекции",
		timelineRu: "1 визит • 1.5 часа",
		preparationRu: "Поесть за 2 часа",
		warrantyRu: "Гарантия 2 года",
		status: "completed",
		teethFdiList: ["16"],
		procedures: sampleProcedures,
		totalRub: 11000,
		totalKopecks: 1100000,
		completedRub: 11000,
		completedKopecks: 1100000,
		remainingRub: 0,
		remainingKopecks: 0,
		estimatedVisitsCount: 1,
	};

	it("1. Renders green badge «✓ Этап выполнен» for completed stage", () => {
		const html = renderToString(
			<TreatmentPlanRoadmap
				customRoadmapStages={[sampleCompletedStage]}
				planTitle="Тестовый план"
				todayRu="12.10.2026"
			/>,
		);

		assert.ok(html.includes("✓ Этап выполнен"), "Must display «✓ Этап выполнен» badge");
	});

	it("2. Replaces «Записаться на этот этап» with «✓ Пройден на приеме {дата}» for completed stage", () => {
		const html = renderToString(
			<TreatmentPlanRoadmap
				customRoadmapStages={[sampleCompletedStage]}
				planTitle="Тестовый план"
				todayRu="12.10.2026"
			/>,
		);

		// Must NOT render booking button
		assert.ok(!html.includes("Записаться на этот этап"), "Booking button must NOT be rendered for completed stage");

		// Must render completed badge with date
		assert.ok(html.includes("✓ Пройден на приеме 12.10.2026"), "Must render «✓ Пройден на приеме 12.10.2026»");
		assert.ok(html.includes("roadmap-stage-completed-badge"), "Must have class roadmap-stage-completed-badge");
	});

	it("3. Displays progress indicator «Выполнено N из M процедур ({X}%)»", () => {
		const html = renderToString(
			<TreatmentPlanRoadmap
				customRoadmapStages={[sampleCompletedStage]}
				planTitle="Тестовый план"
			/>,
		);

		assert.ok(
			html.includes("Выполнено 2 из 2 процедур (100%)"),
			"Must render progress indicator «Выполнено 2 из 2 процедур (100%)»",
		);
		assert.ok(html.includes("roadmap-stage-progress-indicator"), "Must have class roadmap-stage-progress-indicator");
	});

	it("4. Recalculates and displays remaining cost as 0 ₽ for completed stage", () => {
		const html = renderToString(
			<TreatmentPlanRoadmap
				customRoadmapStages={[sampleCompletedStage]}
				planTitle="Тестовый план"
			/>,
		);

		assert.ok(
			html.includes("Остаток к оплате: 0,00 ₽"),
			"Must display remaining cost as 0,00 ₽ for completed stage",
		);
	});

	it("5. buildStagesFromPlanItems sets status = 'completed' when all stage items are done", () => {
		const rawItems = [
			{
				id: "raw-1",
				phase: 1,
				priceId: "A16.07.002",
				name: "Лечение кариеса",
				price: 5000,
				quantity: 1,
				isCompleted: true,
			},
			{
				id: "raw-2",
				phase: 1,
				priceId: "A16.07.030",
				name: "Лечение каналов",
				price: 6000,
				quantity: 1,
				status: "completed",
			},
			{
				id: "raw-3",
				phase: 2,
				priceId: "A16.07.004",
				name: "Коронка",
				price: 18000,
				quantity: 1,
				isCompleted: false,
			},
		];

		const stages = buildStagesFromPlanItems(rawItems);
		assert.equal(stages.length, 2);

		// Stage 1: all completed -> status = 'completed'
		assert.equal(stages[0]!.stageNumber, 1);
		assert.equal(stages[0]!.status, "completed");
		assert.equal(stages[0]!.items[0]!.isCompleted, true);
		assert.equal(stages[0]!.items[1]!.isCompleted, true);

		// Stage 2: none completed -> status = 'agreed'
		assert.equal(stages[1]!.stageNumber, 2);
		assert.equal(stages[1]!.status, "agreed");
		assert.equal(stages[1]!.items[0]!.isCompleted, false);
	});
});
