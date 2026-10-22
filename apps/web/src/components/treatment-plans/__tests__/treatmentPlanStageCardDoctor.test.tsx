/**
 * treatmentPlanStageCardDoctor.test.tsx — бейдж и селектор врача в карточке этапа.
 * (Мандат 8b: строго <= 120 строк).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { TreatmentPlanStageCard } from "../TreatmentPlanStageCard";
import type { TreatmentPlanStage } from "../types";
import {
	mockDoctorsConsortium,
	mockItemWithDoctorConsortium,
	mockItemWithoutDoctorConsortium,
} from "./helpers/doctorConsortiumTestHelpers";

const mockStageWithDoctor: TreatmentPlanStage = {
	stageNumber: 1,
	stageKind: "stage_1_therapy",
	title: "Этап I: Терапевтическая санация",
	subtitle: "Лечение кариеса",
	clinicalGoal: "Санация",
	items: [mockItemWithDoctorConsortium],
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
	subtitle: "Имплантация",
	clinicalGoal: "Восстановление",
	items: [mockItemWithoutDoctorConsortium],
	totalRub: 35000,
	totalKopecks: 3500000 as any,
	estimatedVisits: 1,
	estimatedWeeks: 12,
	order804nCodes: ["A16.07.006"],
};

describe("Multi-Doctor Consortium — TreatmentPlanStageCard", () => {
	it("3. TreatmentPlanStageCard renders stage doctor badge in header when assigned", () => {
		const html = renderToString(
			<TreatmentPlanStageCard
				stage={mockStageWithDoctor}
				doctors={mockDoctorsConsortium}
				onAssignStageDoctor={() => {}}
				onAssignItemDoctor={() => {}}
			/>,
		);

		assert.ok(html.includes("stage-1-doctor-badge"));
		assert.ok(html.includes("Д-р Смирнова Е.А."));
	});

	it("4. TreatmentPlanStageCard renders stage doctor selector when stage is unassigned", () => {
		const html = renderToString(
			<TreatmentPlanStageCard
				stage={mockStageWithoutDoctor}
				doctors={mockDoctorsConsortium}
				onAssignStageDoctor={() => {}}
				onAssignItemDoctor={() => {}}
			/>,
		);

		assert.ok(html.includes("assign-stage-doctor-select-2"));
		assert.ok(html.includes("+ Врач этапа"));
	});
});
