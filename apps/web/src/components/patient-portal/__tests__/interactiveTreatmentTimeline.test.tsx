import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	InteractiveTreatmentTimelineWidget,
} from "../InteractiveTreatmentTimelineWidget.js";
import type { PatientTreatmentPlanProfile } from "../patientWebappEngine.js";

describe("InteractiveTreatmentTimelineWidget (Treatment Roadmap & 323-FZ Consent)", () => {
	it("renders default stages, progress bar, curator, and financial summary in kopecks", () => {
		const html = renderToString(
			<InteractiveTreatmentTimelineWidget />,
		);

		assert.ok(html.includes("Комплексный план комплексной реабилитации"));
		assert.ok(html.includes("Д-р Иванов А.С."));
		assert.ok(html.includes("Общая смета:"));
		assert.ok(html.includes("Оплачено:"));
	});

	it("renders medical nomenclature 804n, procedure names, and FDI teeth numbers", () => {
		const html = renderToString(
			<InteractiveTreatmentTimelineWidget />,
		);

		// Stages
		assert.ok(html.includes("Этап 1: Терапия и терапевтическая санация"));
		assert.ok(html.includes("Этап 2: Хирургия и дентальная имплантация"));
		assert.ok(html.includes("Этап 3: Ортопедия и циркониевые коронки"));
		assert.ok(html.includes("Этап 4: Профгигиена и диспансерное наблюдение"));

		// FDI teeth
		assert.ok(html.includes("14"));
		assert.ok(html.includes("26"));
		assert.ok(html.includes("36"));
		assert.ok(html.includes("46"));

		// 804n codes & procedures in expanded stage 2
		assert.ok(html.includes("A16.07.006.002"));
		assert.ok(html.includes("Установка титанового имплантата Osstem TS III CA"));
		assert.ok(html.includes("Атравматичное удаление корня"));
	});

	it("renders 323-FZ statutory consent buttons, SBP payment, and 1-click booking", () => {
		const html = renderToString(
			<InteractiveTreatmentTimelineWidget
				onPayStageSbp={() => {}}
				onBookStage={() => {}}
			/>,
		);

		assert.ok(html.includes("ИДС по 323-ФЗ"));
		assert.ok(html.includes("Подписать ИДС по 323-ФЗ") || html.includes("ИДС по 323-ФЗ подписано"));
		assert.ok(html.includes("СБП Оплата"));
		assert.ok(html.includes("Записаться на прием"));
	});

	it("renders custom treatment plan profile accurately", () => {
		const customPlan: PatientTreatmentPlanProfile = {
			id: "plan-custom-88",
			planNumber: "PLAN-2026-8800",
			titleRu: "Индивидуальный план ортодонтического лечения",
			curatingDoctor: "Д-р Кузнецова В.И.",
			createdAtIso: "2026-09-01T10:00:00.000Z",
			status: "in_progress",
			progressPercent: 50,
			totalCostRub: 150000,
			paidCostRub: 75000,
			remainingDueRub: 75000,
			totalCostKopecks: 15000000,
			paidCostKopecks: 7500000,
			remainingDueKopecks: 7500000,
			stages: [
				{
					id: "st-custom-1",
					orderIndex: 1,
					titleRu: "Установка прозрачных элайнеров 3D",
					categoryRu: "Ортодонтия",
					teethFdi: ["11", "21", "31", "41"],
					costKopecks: 7500000,
					costRub: 75000,
					status: "completed",
					procedures: [
						{
							id: "p-1",
							code804n: "A16.07.047",
							nameRu: "Фиксация ортодонтического аппарата (элайнеры)",
							toothFdi: "11",
							quantity: 1,
							unitPriceKopecks: 7500000,
							unitPriceRub: 75000,
							totalKopecks: 7500000,
							totalRub: 75000,
						},
					],
					targetDateRu: "Завершено 01.08.2026",
				},
			],
		};

		const html = renderToString(
			<InteractiveTreatmentTimelineWidget planProfile={customPlan} />,
		);

		assert.ok(html.includes("Индивидуальный план ортодонтического лечения"));
		assert.ok(html.includes("Д-р Кузнецова В.И."));
		assert.ok(html.includes("Установка прозрачных элайнеров 3D"));
		assert.ok(html.includes("Зубы: 11, 21, 31, 41"));
	});
});
