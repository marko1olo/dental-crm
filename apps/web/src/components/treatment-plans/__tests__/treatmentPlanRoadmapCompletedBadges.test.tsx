import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { TreatmentPlanRoadmap } from "../TreatmentPlanRoadmap";
import { sampleCompletedStage } from "./helpers/roadmapCompletionTestHelpers";

describe("TreatmentPlanRoadmap — Completed Badges and Dates", () => {
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

		assert.ok(!html.includes("Записаться на этот этап"), "Booking button must NOT be rendered for completed stage");
		assert.ok(html.includes("✓ Пройден на приеме 12.10.2026"), "Must render «✓ Пройден на приеме 12.10.2026»");
		assert.ok(html.includes("roadmap-stage-completed-badge"), "Must have class roadmap-stage-completed-badge");
	});
});
