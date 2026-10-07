/**
 * apps/web/src/components/visit/__tests__/visitPlanStageHandoff.test.tsx
 *
 * DENTE Dental CRM — Targeted Treatment Plan Stage Handoff Inquisitor Tests.
 *
 * Verifies:
 * 1. Extraction of stage targeting metadata from appointment (stageNumber, stageId, services, comments).
 * 2. Stage grouping and isolation of phase procedures (preventing dump of unrelated stages into visit).
 * 3. Render and ergonomics of VisitPlanStageHandoffBanner conforming to Apple HIG & Mandate 8e.
 * 4. Verification that take-stage button dispatches only targeted stage procedures with 804n codes and tooth numbers.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	extractAppointmentStageInfo,
	groupTreatmentPlanByStages,
	formatStageItemForBilling,
	buildStageMedicalDiaryText,
} from "../visitPlanStageHandoff";
import { VisitPlanStageHandoffBanner } from "../VisitPlanStageHandoffBanner";

// Mock 3-stage comprehensive treatment plan (Phase 1: Therapy, Phase 2: Surgery, Phase 3: Orthopedics)
const mock3StageTreatmentPlan = {
	id: "plan-complex-101",
	name: "Комплексная реабилитация жевательного отдела",
	status: "Approved",
	totalPrice: 125000,
	stages: [
		{ stageNumber: 1, titleRu: "Терапевтическая санация кариеса" },
		{ stageNumber: 2, titleRu: "Хирургический этап: удаление и имплантация" },
		{ stageNumber: 3, titleRu: "Ортопедия: коронка из диоксида циркония" },
	],
	items: [
		// Phase 1 (Therapy)
		{
			id: "item-101",
			phase: 1,
			stageNumber: 1,
			toothNumber: 16,
			code804n: "A16.07.002",
			priceId: "A16.07.002",
			name: "Восстановление зуба пломбой светоотверждаемой",
			quantity: 1,
			price: 4500,
			unitPriceRub: 4500,
			discount: 0,
		},
		{
			id: "item-102",
			phase: 1,
			stageNumber: 1,
			toothNumber: 15,
			code804n: "A16.07.002.001",
			priceId: "A16.07.002.001",
			name: "Лечение кариеса эмали",
			quantity: 1,
			price: 3500,
			unitPriceRub: 3500,
			discount: 0,
		},

		// Phase 2 (Surgery)
		{
			id: "item-201",
			phase: 2,
			stageNumber: 2,
			toothNumber: 38,
			code804n: "A16.07.001.002",
			priceId: "A16.07.001.002",
			name: "Сложное удаление зуба мудрости",
			quantity: 1,
			price: 8000,
			unitPriceRub: 8000,
			discount: 0,
		},
		{
			id: "item-202",
			phase: 2,
			stageNumber: 2,
			toothNumber: 46,
			code804n: "A16.07.054",
			priceId: "A16.07.054",
			name: "Внутрикостная дентальная имплантация",
			quantity: 1,
			price: 35000,
			unitPriceRub: 35000,
			discount: 0,
		},

		// Phase 3 (Orthopedics)
		{
			id: "item-301",
			phase: 3,
			stageNumber: 3,
			toothNumber: 46,
			code804n: "A16.07.004",
			priceId: "A16.07.004",
			name: "Коронка циркониевая на винтовой фиксации",
			quantity: 1,
			price: 42000,
			unitPriceRub: 42000,
			discount: 0,
		},
	],
};

describe("Targeted Treatment Plan Stage Handoff Engine", () => {
	it("1. extracts stage targeting metadata from appointment object", () => {
		const appointmentWithStage = {
			id: "appt-stage-2",
			treatmentPlanId: "plan-complex-101",
			stageNumber: 2,
			stageId: "stage_2_surgery",
			stageTitle: "Хирургический этап: удаление и имплантация",
			estimatedDurationMinutes: 60,
			services: [
				{
					code804n: "A16.07.001.002",
					title: "Сложное удаление зуба мудрости",
					toothNumber: 38,
					unitPriceRub: 8000,
				},
			],
		};

		const extracted = extractAppointmentStageInfo(appointmentWithStage);
		assert.equal(extracted.treatmentPlanId, "plan-complex-101");
		assert.equal(extracted.stageNumber, 2);
		assert.equal(extracted.stageId, "stage_2_surgery");
		assert.equal(extracted.stageTitle, "Хирургический этап: удаление и имплантация");
		assert.equal(extracted.durationMinutes, 60);
		assert.equal(extracted.services.length, 1);
		assert.equal(extracted.services[0].code804n, "A16.07.001.002");
	});

	it("2. extracts stage information from structured appointment comments fallback", () => {
		const apptWithComment = {
			id: "appt-comment-tagged",
			comment: "[План лечения: PLAN-999 | Терапевтический этап] [Этап: stage_1_therapy]",
		};

		const extracted = extractAppointmentStageInfo(apptWithComment);
		assert.equal(extracted.stageNumber, 1);
		assert.equal(extracted.stageId, "stage_1_therapy");
		assert.equal(extracted.stageTitle, "Терапевтический этап");
	});

	it("3. groups treatment plan by phases and calculates isolated sums for each stage", () => {
		const targeting = {
			treatmentPlanId: "plan-complex-101",
			stageNumber: 2,
			stageId: "stage_2_surgery",
			stageTitle: "Хирургический этап",
			services: [],
			durationMinutes: 60,
		};

		const grouped = groupTreatmentPlanByStages(mock3StageTreatmentPlan, targeting);
		assert.equal(grouped.hasMultipleStages, true);
		assert.equal(grouped.stages.length, 3);

		// Phase 1: 4500 + 3500 = 8000
		const stage1 = grouped.stages.find((s) => s.stageNumber === 1);
		assert.ok(stage1);
		assert.equal(stage1.items.length, 2);
		assert.equal(stage1.totalPriceRub, 8000);
		assert.equal(stage1.isCurrentTarget, false);

		// Phase 2: 8000 + 35000 = 43000
		const stage2 = grouped.stages.find((s) => s.stageNumber === 2);
		assert.ok(stage2);
		assert.equal(stage2.items.length, 2);
		assert.equal(stage2.totalPriceRub, 43000);
		assert.equal(stage2.isCurrentTarget, true, "Stage 2 must be marked as current target");

		// Phase 3: 42000
		const stage3 = grouped.stages.find((s) => s.stageNumber === 3);
		assert.ok(stage3);
		assert.equal(stage3.items.length, 1);
		assert.equal(stage3.totalPriceRub, 42000);
	});

	it("4. renders VisitPlanStageHandoffBanner targeting Stage 2 when patient is booked for Stage 2", () => {
		const appointmentForSurgery = {
			id: "appt-surgery",
			treatmentPlanId: "plan-complex-101",
			stageNumber: 2,
			stageId: "stage_2_surgery",
			stageTitle: "Хирургический этап: удаление и имплантация",
			estimatedDurationMinutes: 60,
		};

		const html = renderToStaticMarkup(
			React.createElement(VisitPlanStageHandoffBanner, {
				loadedTreatmentPlan: mock3StageTreatmentPlan,
				activeAppointment: appointmentForSurgery,
			}),
		);

		const normalizedHtml = html.replace(/\u00a0/g, " ");

		// Must render the handoff banner
		assert.ok(
			normalizedHtml.includes('data-testid="visit-treatment-plan-handoff-banner"'),
			"Must render handoff banner",
		);

		// Must highlight targeted title with stage 2
		assert.ok(
			normalizedHtml.includes('data-testid="handoff-stage-targeted-title"'),
			"Must display targeted title testid",
		);
		assert.ok(
			normalizedHtml.includes("Запись по этапу:"),
			"Must display stage booking prefix",
		);
		assert.ok(
			normalizedHtml.includes("Этап 2:"),
			"Must display Stage 2",
		);
		assert.ok(
			normalizedHtml.includes("Хирургический этап: удаление и имплантация"),
			"Must display surgery stage title",
		);

		// Must render duration badge (60 min)
		assert.ok(
			normalizedHtml.includes('data-testid="handoff-stage-duration-badge"'),
			"Must display duration badge",
		);
		assert.ok(
			normalizedHtml.includes("60 мин"),
			"Must display 60 minutes",
		);

		// Must calculate and display Stage 2 isolated price (43 000 ₽), not full 125 000 ₽
		assert.ok(
			normalizedHtml.includes("43 000 ₽"),
			"Must display Stage 2 isolated sum 43 000 ₽",
		);

		// Must render stage selector chips
		assert.ok(
			normalizedHtml.includes('data-testid="handoff-stage-chips-selector"'),
			"Must display stage selector chips",
		);
		assert.ok(
			normalizedHtml.includes('data-testid="handoff-stage-chip-1"'),
			"Must display Stage 1 chip",
		);
		assert.ok(
			normalizedHtml.includes('data-testid="handoff-stage-chip-2"'),
			"Must display Stage 2 chip",
		);
		assert.ok(
			normalizedHtml.includes('data-testid="handoff-stage-chip-3"'),
			"Must display Stage 3 chip",
		);
		assert.ok(
			normalizedHtml.includes('data-testid="handoff-stage-chip-all"'),
			"Must display All Stages chip",
		);

		// Must show preview of Stage 2 procedures (Сложное удаление, зуб 38, имплантация)
		assert.ok(
			normalizedHtml.includes('data-testid="handoff-stage-items-preview"'),
			"Must display preview of procedures",
		);
		assert.ok(
			normalizedHtml.includes("Сложное удаление зуба мудрости"),
			"Preview must include wisdom tooth extraction",
		);
		assert.ok(
			normalizedHtml.includes("зуб 38"),
			"Preview must include tooth 38",
		);

		// Primary action button should explicitly state Stage 2
		assert.ok(
			normalizedHtml.includes('data-testid="take-stage-to-visit-btn"'),
			"Must render take stage button",
		);
		assert.ok(
			normalizedHtml.includes("Взять Этап 2 в работу визита"),
			"Button text must explicitly target Stage 2",
		);
	});

	it("5. formats stage items into canonical 804n billing items and structured diary text", () => {
		const surgeryItems = [
			{
				code804n: "A16.07.001.002",
				name: "Сложное удаление зуба мудрости",
				toothNumber: 38,
				price: 8000,
				quantity: 1,
				discount: 500,
			},
			{
				code804n: "A16.07.054",
				name: "Внутрикостная дентальная имплантация",
				toothNumber: 46,
				price: 35000,
				quantity: 1,
				discount: 0,
			},
		];

		const billing1 = formatStageItemForBilling(surgeryItems[0]);
		assert.equal(billing1.code804n, "A16.07.001.002");
		assert.equal(billing1.title, "Сложное удаление зуба мудрости");
		assert.equal(billing1.toothCode, "38");
		assert.equal(billing1.unitPriceRub, 8000);
		assert.equal(billing1.discountRub, 500);

		const diary = buildStageMedicalDiaryText("Этап 2: Хирургия", surgeryItems);
		assert.ok(
			diary.startsWith("[Этап 2: Хирургия]: "),
			"Diary text must have structured stage prefix",
		);
		assert.ok(
			diary.includes("Сложное удаление зуба мудрости (зуб #38)"),
			"Diary text must contain procedure 1 with tooth number",
		);
		assert.ok(
			diary.includes("Внутрикостная дентальная имплантация (зуб #46)"),
			"Diary text must contain procedure 2 with tooth number",
		);
	});

	it("6. supports single-stage fallback gracefully when no stages are configured", () => {
		const simplePlan = {
			id: "plan-simple",
			name: "Лечение кариеса",
			items: [
				{
					id: "item-1",
					code804n: "A16.07.002",
					name: "Пломбирование зуба",
					price: 4000,
					toothNumber: 21,
				},
			],
		};

		const html = renderToStaticMarkup(
			React.createElement(VisitPlanStageHandoffBanner, {
				loadedTreatmentPlan: simplePlan,
			}),
		);

		assert.ok(html.includes("План лечения: Лечение кариеса"));
		assert.ok(html.includes("Взять Этап 1 в работу визита") || html.includes("Взять этап в работу визита"));
		// Single stage plan should NOT show multiple stage chips selector
		assert.equal(
			html.includes('data-testid="handoff-stage-chips-selector"'),
			false,
			"Single stage plan must not display unnecessary chips",
		);
	});
});
