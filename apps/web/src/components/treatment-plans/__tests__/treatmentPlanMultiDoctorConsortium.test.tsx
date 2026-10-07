import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { TreatmentPlanStageCard } from "../TreatmentPlanStageCard";
import { TreatmentPlanStageItemRow } from "../TreatmentPlanStageItemRow";
import type {
	TreatmentPlanDoctorOption,
	TreatmentPlanItem,
	TreatmentPlanStage,
} from "../types";

const mockDoctors: readonly TreatmentPlanDoctorOption[] = [
	{
		id: "doc-therapist-1",
		fullName: "Д-р Смирнова Е.А.",
		role: "doctor",
		specialty: "Терапевт",
	},
	{
		id: "doc-surgeon-1",
		fullName: "Д-р Барабаш С.В.",
		role: "doctor",
		specialty: "Хирург-имплантолог",
	},
	{
		id: "doc-orthopedist-1",
		fullName: "Д-р Ковалев В.Н.",
		role: "doctor",
		specialty: "Ортопед",
	},
];

const mockItemWithDoctor: TreatmentPlanItem = {
	id: "item-therapy-01",
	toothNumber: 16,
	code804n: "A16.07.002",
	name: "Лечение кариеса 1.6",
	category: "Терапия",
	priceRub: 5500,
	unitPriceRub: 5500,
	discountRub: 500,
	quantity: 1,
	stageKind: "stage_1_therapy",
	phase: 1,
	doctorId: "doc-therapist-1",
	doctorName: "Д-р Смирнова Е.А.",
	doctorSpecialty: "Терапевт",
};

const mockItemWithoutDoctor: TreatmentPlanItem = {
	id: "item-surgery-01",
	toothNumber: 46,
	code804n: "A16.07.006",
	name: "Установка дентального имплантата 4.6",
	category: "Хирургия",
	priceRub: 35000,
	unitPriceRub: 35000,
	discountRub: 0,
	quantity: 1,
	stageKind: "stage_2_surgery",
	phase: 2,
};

const mockStageWithDoctor: TreatmentPlanStage = {
	stageNumber: 1,
	stageKind: "stage_1_therapy",
	title: "Этап I: Терапевтическая санация",
	subtitle: "Лечение кариеса и эндодонтический протокол",
	clinicalGoal: "Полная терапевтическая санация полости рта",
	items: [mockItemWithDoctor],
	totalRub: 5000,
	totalKopecks: 500000 as any,
	estimatedVisits: 1,
	estimatedWeeks: 1,
	order804nCodes: ["A16.07.002"],
	doctorId: "doc-therapist-1",
	doctorName: "Д-р Смирнова Е.А.",
	doctorSpecialty: "Терапевт",
};

const mockStageWithoutDoctor: TreatmentPlanStage = {
	stageNumber: 2,
	stageKind: "stage_2_surgery",
	title: "Этап II: Хирургический этап",
	subtitle: "Дентальная имплантация и костная пластика",
	clinicalGoal: "Восстановление утраченных зубов",
	items: [mockItemWithoutDoctor],
	totalRub: 35000,
	totalKopecks: 3500000 as any,
	estimatedVisits: 1,
	estimatedWeeks: 12,
	order804nCodes: ["A16.07.006"],
};

describe("Multi-Doctor Consortium in Treatment Plans (Web UI)", () => {
	it("1. TreatmentPlanStageItemRow renders doctor badge when specialist is assigned", () => {
		const html = renderToString(
			<TreatmentPlanStageItemRow
				item={mockItemWithDoctor}
				doctors={mockDoctors}
				onAssignDoctor={() => {}}
			/>,
		);

		assert.ok(
			html.includes("item-doctor-badge-item-therapy-01"),
			"Row must contain doctor badge data-testid",
		);
		assert.ok(
			html.includes("Д-р Смирнова Е.А."),
			"Row must render doctor full name",
		);
		assert.ok(
			html.includes("Терапевт"),
			"Row must render doctor specialty",
		);
	});

	it("2. TreatmentPlanStageItemRow renders doctor assignment selector when unassigned", () => {
		const html = renderToString(
			<TreatmentPlanStageItemRow
				item={mockItemWithoutDoctor}
				doctors={mockDoctors}
				onAssignDoctor={() => {}}
			/>,
		);

		assert.ok(
			html.includes("assign-doctor-select-item-surgery-01"),
			"Row must contain doctor assignment selector",
		);
		assert.ok(
			html.includes("+ Врач"),
			"Selector must have default + Врач prompt",
		);
		assert.ok(
			html.includes("Д-р Барабаш С.В."),
			"Selector must include surgeon in options",
		);
		assert.ok(
			html.includes("Д-р Ковалев В.Н."),
			"Selector must include orthopedist in options",
		);
	});

	it("3. TreatmentPlanStageCard renders stage doctor badge in header when stage doctor is assigned", () => {
		const html = renderToString(
			<TreatmentPlanStageCard
				stage={mockStageWithDoctor}
				doctors={mockDoctors}
				onAssignStageDoctor={() => {}}
				onAssignItemDoctor={() => {}}
			/>,
		);

		assert.ok(
			html.includes("stage-1-doctor-badge"),
			"Stage card header must contain stage doctor badge",
		);
		assert.ok(
			html.includes("Д-р Смирнова Е.А."),
			"Stage card header must render stage doctor name",
		);
	});

	it("4. TreatmentPlanStageCard renders stage doctor selector when stage is unassigned", () => {
		const html = renderToString(
			<TreatmentPlanStageCard
				stage={mockStageWithoutDoctor}
				doctors={mockDoctors}
				onAssignStageDoctor={() => {}}
				onAssignItemDoctor={() => {}}
			/>,
		);

		assert.ok(
			html.includes("assign-stage-doctor-select-2"),
			"Stage card header must contain stage doctor selector",
		);
		assert.ok(
			html.includes("+ Врач этапа"),
			"Stage selector must show + Врач этапа option",
		);
	});
});
