import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	extractAppointmentStageInfo,
	getStandardStageTitle,
	groupTreatmentPlanByStages,
} from "../../visit/visitPlanStageHandoff";
import { dispatchOpenLabOrderForStage } from "../../visit/visitPlanStageHandoffEvents";
import { DentalLabCreateOrderSection } from "../DentalLabCreateOrderSection";

describe("visitDentalLabOrder — Stage Extraction, Kopecks & Clinical Language", () => {
	it("Извлекает этап и план из прямых свойств активного визита", () => {
		const appointment = {
			id: "apt-101",
			patientId: "pat-999",
			treatmentPlanId: "plan-777",
			stageNumber: 3,
			stageTitle: "Ортопедический этап (протезирование)",
			stageId: "stg-333",
		};
		const stageInfo = extractAppointmentStageInfo(appointment);
		assert.equal(stageInfo.treatmentPlanId, "plan-777");
		assert.equal(stageInfo.stageNumber, 3);
		assert.equal(stageInfo.stageTitle, "Ортопедический этап (протезирование)");
		assert.equal(stageInfo.stageId, "stg-333");
	});

	it("Извлекает этап и treatmentPlanId из комментариев визита", () => {
		const appointmentWithComment = {
			id: "apt-102",
			patientId: "pat-999",
			comment: "[План лечения: plan-uuid-555 | Хирургия] [Этап: 2]",
		};
		const stageInfo = extractAppointmentStageInfo(appointmentWithComment);
		assert.equal(stageInfo.treatmentPlanId, "plan-uuid-555");
		assert.equal(stageInfo.stageNumber, 2);
		assert.equal(stageInfo.stageTitle, "Хирургия");

		assert.equal(getStandardStageTitle(1), "Неотложная помощь и терапия");
		assert.equal(getStandardStageTitle(2), "Хирургический этап и санация");
		assert.equal(getStandardStageTitle(3), "Ортопедический этап");
		assert.equal(getStandardStageTitle(4), "Ортодонтия и эстетика");
		assert.equal(getStandardStageTitle(5), "Диспансерный контроль и гигиена");
	});

	it("Группирует этапы через groupTreatmentPlanByStages и считает в копейках с передачей в dispatchOpenLabOrderForStage", () => {
		const loadedPlan = {
			id: "plan-auto-888",
			title: "Комплексная реабилитация",
			stages: [
				{
					stageNumber: 1,
					title: "Санация",
					items: [{ title: "Лечение кариеса", priceKopecks: 450000, status: "completed", toothNumber: 16 }],
				},
				{
					stageNumber: 2,
					title: "Керамические коронки E.max",
					items: [
						{ title: "Коронка E.max", priceKopecks: 2850000, status: "in_progress", toothNumber: 26 },
						{ title: "Слепок", priceKopecks: 350000, status: "planned", toothNumber: 26 },
					],
				},
			],
		};
		const grouped = groupTreatmentPlanByStages(loadedPlan);
		assert.equal(grouped.hasMultipleStages, true);
		assert.equal(grouped.stages.length, 2);
		assert.equal(grouped.totalPlanPriceKopecks, 3650000);
		assert.equal(grouped.stages[1]?.status, "in_progress");
		assert.equal(grouped.stages[1]?.totalPriceKopecks, 3200000);

		const originalWindow = (globalThis as { window?: unknown }).window;
		const capturedEvents: Array<{ type: string; detail: Record<string, unknown> }> = [];
		(globalThis as { window: unknown }).window = {
			dispatchEvent: (evt: Event) => {
				const custom = evt as CustomEvent<Record<string, unknown>>;
				capturedEvents.push({ type: custom.type, detail: custom.detail });
				return true;
			},
		};
		try {
			dispatchOpenLabOrderForStage(
				{ title: grouped.stages[1]!.title, stageNumber: 2, items: grouped.stages[1]!.items },
				grouped.stages[1]!.items,
				loadedPlan.id,
				{ id: "pat-1", fullName: "Тестовый Пациент" },
			);
			const modalEvent = capturedEvents.find((e) => e.type === "dente-open-lab-order-modal");
			assert.ok(modalEvent, "Must dispatch dente-open-lab-order-modal");
			assert.equal(modalEvent.detail.treatmentPlanId, "plan-auto-888");
			assert.equal(modalEvent.detail.priceKopecks, 3200000);
			assert.equal(modalEvent.detail.toothNumber, 26);
		} finally {
			(globalThis as { window?: unknown }).window = originalWindow;
		}
	});

	it("Мандат 8x/8y: DentalLabCreateOrderSection рендерит клинический UI без бюрократического языка", () => {
		const html = renderToStaticMarkup(
			React.createElement(DentalLabCreateOrderSection, {
				activeMainTab: "new_order",
				patientInput: "Петров Пётр",
				setPatientInput: () => {},
				availablePatients: [{ id: "pat-1", fullName: "Петров Пётр" }],
				selectedTeeth: [16, 26],
				setSelectedTeeth: () => {},
				toggleTooth: () => {},
				selectedMaterialId: "zirconia_multilayer",
				setSelectedMaterialId: () => {},
				selectedShade: "A2",
				setSelectedShade: () => {},
				selectedLab: "ЗТЛ Премиум",
				setSelectedLab: () => {},
				allLaboratories: ["ЗТЛ Премиум"],
				customLabs: [],
				setCustomLabs: () => {},
				effectiveDueDate: "2026-12-01",
				setCustomDueDate: () => {},
				isUrgent: false,
				setIsUrgent: () => {},
				notes: "Контактные пункты",
				setNotes: () => {},
				teethCount: 2,
				totalLabCostKopecks: 1200000,
				totalPatientPriceKopecks: 4800000,
				netClinicRevenueKopecks: 3600000,
				handleCreateOrder: () => {},
				handlePrintA5Blank: () => {},
				handleCourierBlank: () => {},
			}),
		);
		assert.ok(html.includes("Экспресс-наряд у кресла"));
		assert.equal(html.includes("043/у"), false);
		assert.equal(html.includes("804н"), false);
		assert.equal(html.includes("54-ФЗ"), false);
	});
});
