import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { TreatmentPlanPresenterModal } from "../TreatmentPlanPresenterModal";
import { generate3TierPlanComparison } from "../treatmentPlanStagesEngine";
import type { ToothData } from "../../odontogram/ToothChart";

describe("TreatmentPlanPresenterModal (Wave 19: Chairside Presentation & RF Decree 736)", () => {
	const sampleTeeth: ToothData[] = [
		{
			id: 16,
			toothNumber: 16,
			state: "Caries",
			systemicNotes: "Глубокий кариес",
		} as any,
		{
			id: 36,
			toothNumber: 36,
			state: "Missing",
			systemicNotes: "Отсутствует зуб, показана имплантация",
		} as any,
		{
			id: 46,
			toothNumber: 46,
			state: "Pulpitis",
			systemicNotes: "Острый пульпит",
		} as any,
	];

	const sampleTiers = generate3TierPlanComparison(sampleTeeth);

	it("renders 3-column side-by-side comparison with doctor recommendation badge and DENTE tokens", () => {
		const html = renderToString(
			<TreatmentPlanPresenterModal
				isOpen={true}
				onClose={() => {}}
				tiers={sampleTiers}
				patientName="Смирнова Екатерина Васильевна"
				patientId="PAT-2026-0891"
				doctorFullName="Д-р Смирнов Алексей Петрович"
				clinicName="Стоматологическая клиника «ДЕНТЕ СТОМАТОЛОГИЯ»"
			/>
		);

		assert.ok(html.includes("Презентация планов лечения"), "Must contain main title");
		assert.ok(html.includes("ПП РФ № 736 &amp; 804н") || html.includes("ПП РФ № 736 & 804н"), "Must include regulatory badge");
		assert.ok(html.includes("Смирнова Екатерина Васильевна"), "Must render patient name");
		assert.ok(html.includes("Д-р Смирнов Алексей Петрович"), "Must render doctor name");
		assert.ok(html.includes("Рекомендация врача"), "Must render doctor recommendation ribbon");
		assert.ok(html.includes("tier-card-economy"), "Must render economy tier card");
		assert.ok(html.includes("tier-card-standard"), "Must render standard tier card");
		assert.ok(html.includes("tier-card-optimum"), "Must render optimum tier card");
		assert.ok(html.includes("treatment-3tier-grid"), "Must render 3-tier comparative grid");
	});

	it("renders collapsible clinical stages with Order 804n codes, FDI teeth, and timeline metrics", () => {
		const html = renderToString(
			<TreatmentPlanPresenterModal
				isOpen={true}
				onClose={() => {}}
				tiers={sampleTiers}
				initialSelectedTierId="standard"
			/>
		);

		assert.ok(html.includes("Клинические этапы плана"), "Must render clinical stages section");
		assert.ok(html.includes("Этап 1"), "Must render Stage 1");
		assert.ok(html.includes("Этап 2"), "Must render Stage 2");
		assert.ok(html.includes("Этап 3"), "Must render Stage 3");
		assert.ok(html.includes("A16.07"), "Must render Order 804n nomenclature codes");
		assert.ok(html.includes("code-804n-badge"), "Must render 804n code badge class");
	});

	it("renders dynamic patient choice fixation button and print trigger", () => {
		const html = renderToString(
			<TreatmentPlanPresenterModal
				isOpen={true}
				onClose={() => {}}
				tiers={sampleTiers}
				initialSelectedTierId="standard"
				patientName="Смирнова Екатерина Васильевна"
			/>
		);

		assert.ok(html.includes("confirm-patient-choice-btn"), "Must contain patient choice fixation button");
		assert.ok(html.includes("Пациент выбрал Вариант Б: Оптимум"), "Must have dynamic label with selected variant B");
		assert.ok(html.includes("Печать Приложения №1 (ПП РФ № 736)"), "Must contain 1-click official print button");
	});

	it("renders touch-first Segmented Control, 1-click NDFL calculation, and instant tariff apply buttons", () => {
		const html = renderToString(
			<TreatmentPlanPresenterModal
				isOpen={true}
				onClose={() => {}}
				tiers={sampleTiers}
				initialSelectedTierId="standard"
				patientName="Смирнова Екатерина Васильевна"
			/>
		);

		// 1. Mobile & iPad Segmented Control
		assert.ok(html.includes("treatment-mobile-tier-bar"), "Must contain Segmented Control container");
		assert.ok(html.includes("mobile-tier-btn-economy"), "Must contain Economy segment button");
		assert.ok(html.includes("mobile-tier-btn-standard"), "Must contain Standard (Optimum) segment button");
		assert.ok(html.includes("mobile-tier-btn-optimum"), "Must contain Premium segment button");
		assert.ok(html.includes("Оптимум"), "Must render Optimum segment");

		// 2. 1-click NDFL 13% tax deduction calculation button
		assert.ok(html.includes("calc-ndfl-btn-standard"), "Must contain 1-click NDFL calculation trigger for standard tier");
		assert.ok(html.includes("Вычет 13% НДФЛ:"), "Must display 13% NDFL refund label");
		assert.ok(html.includes("Итого с вычетом:"), "Must display net price after tax refund");

		// 3. 1-click instant tariff apply button
		assert.ok(html.includes("apply-tier-btn-standard"), "Must contain 1-click instant tariff apply button for standard tier");
		assert.ok(html.includes("Применить"), "Must display instant apply action title");
	});

	it("returns null when isOpen is false", () => {
		const html = renderToString(
			<TreatmentPlanPresenterModal
				isOpen={false}
				onClose={() => {}}
			/>
		);

		assert.equal(html, "", "Should return empty string when isOpen is false");
	});
});
