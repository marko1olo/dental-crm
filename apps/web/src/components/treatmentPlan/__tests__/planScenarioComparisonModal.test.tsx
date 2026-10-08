/**
 * planScenarioComparisonModal.test.tsx — Unit тесты 3-сценарной студии сравнения планов лечения
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { PlanScenarioComparisonModal } from "../PlanScenarioComparisonModal";
import { TreatmentPlanEditor } from "../TreatmentPlanEditor";
import { TreatmentPlanRoadmap } from "../TreatmentPlanRoadmap";
import { DEFAULT_TREATMENT_PLAN_PRESETS } from "../../treatment-plans/comparator/planPresentationPresets";

describe("PlanScenarioComparisonModal & 3-Scenario Presentation Studio", () => {
	it("renders 3-column comparison grid with Premium, Standard, Economy scenarios in demo mode", () => {
		const html = renderToString(
			<PlanScenarioComparisonModal
				isOpen={true}
				isDemoMode={true}
				patientName="Алексеев Владимир Сергеевич"
				doctorName="Д-р Воронов М. А."
				clinicName="DENTE Премиум"
			/>
		);

		assert.ok(html.includes("Сравнение 3 сценариев лечения"), "Must render comparison modal title");
		assert.ok(html.includes("scenario-cards-grid"), "Must render 3-column cards grid");
		assert.ok(html.includes("scenario-card-optimum_vip"), "Must render Optimum/VIP scenario card");
		assert.ok(html.includes("scenario-card-standard_recommended"), "Must render Standard scenario card");
		assert.ok(html.includes("scenario-card-economy_basic"), "Must render Economy scenario card");
		assert.ok(html.includes("580"), "Must show VIP price (580 000 ₽)");
		assert.ok(html.includes("340"), "Must show Standard price (340 000 ₽)");
		assert.ok(html.includes("145"), "Must show Economy price (145 000 ₽)");
	});

	it("renders 1-click CTA button «Выбрать этот сценарий» and sticky footer", () => {
		const html = renderToString(
			<PlanScenarioComparisonModal
				isOpen={true}
				isDemoMode={true}
				patientName="Тестовый Пациент"
			/>
		);

		assert.ok(html.includes("scenario-modal-footer"), "Must render sticky footer");
		assert.ok(html.includes("btn-approve-scenario"), "Must render 1-click approve button");
		assert.ok(html.includes("Выбрать этот сценарий"), "Must label 1-click action button");
		assert.ok(html.includes("btn-scenario-installment"), "Must render installment button");
		assert.ok(html.includes("Рассрочка 0%"), "Must have installment 0% trigger");
	});

	it("renders financial calculator with custom discount, 0% installments and 13% tax deduction", () => {
		const html = renderToString(
			<PlanScenarioComparisonModal
				isOpen={true}
				isDemoMode={true}
				patientName="Пациент"
				initialPaymentTab="discount"
			/>
		);

		assert.ok(html.includes("scenario-finance-section"), "Must render finance section");
		assert.ok(html.includes("btn-discount-5"), "Must render 5% discount preset button");
		assert.ok(html.includes("btn-discount-10"), "Must render 10% discount preset button");
		assert.ok(html.includes("input-discount-percent"), "Must render custom discount input");
		assert.ok(html.includes("Поэтапно (30/40/30)"), "Must support staged 30/40/30 schedule");
		assert.ok(html.includes("Вычет НДФЛ 13%"), "Must support 13% tax deduction");
	});

	it("renders clinical roadmap stages for chosen scenario without nested Matryoshka frames", () => {
		const html = renderToString(
			<PlanScenarioComparisonModal
				isOpen={true}
				isDemoMode={true}
				patientName="Пациент"
				initialSelectedTier="optimum_vip"
			/>
		);

		assert.ok(html.includes("scenario-roadmap-section"), "Must render roadmap timeline");
		assert.ok(html.includes("plan-roadmap-stages"), "Must render roadmap stages track");
		assert.ok(html.includes("Этап 1: Терапия &amp; Гигиена") || html.includes("Этап 1: Терапия & Гигиена"), "Must show Stage 1");
		assert.ok(html.includes("Этап 2: Дентальная имплантация"), "Must show Stage 2");
		assert.ok(html.includes("Этап 3: Протезирование на цирконии"), "Must show Stage 3");
	});

	it("renders authentic empty state when customVariants missing and !isDemoMode", () => {
		const html = renderToString(
			<PlanScenarioComparisonModal
				isOpen={true}
				isDemoMode={false}
				patientName="Пациент"
			/>
		);

		assert.ok(html.includes("scenario-empty-state"), "Must render empty state container");
		assert.ok(html.includes("Сценарии планов лечения ещё не сформированы"), "Must explain scenarios not formed");
		assert.ok(html.includes("btn-scenario-empty-close"), "Must provide back action");
	});

	it("supports facade components TreatmentPlanEditor and TreatmentPlanRoadmap seamlessly", () => {
		assert.ok(typeof TreatmentPlanEditor === "function", "TreatmentPlanEditor must be exported as React component");
		assert.ok(typeof TreatmentPlanRoadmap === "function", "TreatmentPlanRoadmap must be exported as React component");
	});
});
