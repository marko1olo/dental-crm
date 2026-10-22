/**
 * treatmentPlanStageItemRowDoctor.test.tsx — назначение врача на строку услуги.
 * (Мандат 8b: строго <= 120 строк).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { TreatmentPlanStageItemRow } from "../TreatmentPlanStageItemRow";
import {
	mockDoctorsConsortium,
	mockItemWithDoctorConsortium,
	mockItemWithoutDoctorConsortium,
} from "./helpers/doctorConsortiumTestHelpers";

describe("Multi-Doctor Consortium — TreatmentPlanStageItemRow", () => {
	it("1. TreatmentPlanStageItemRow renders doctor badge when specialist is assigned", () => {
		const html = renderToString(
			<TreatmentPlanStageItemRow
				item={mockItemWithDoctorConsortium}
				doctors={mockDoctorsConsortium}
				onAssignDoctor={() => {}}
			/>,
		);

		assert.ok(html.includes("item-doctor-badge-item-therapy-01"));
		assert.ok(html.includes("Д-р Смирнова Е.А."));
		assert.ok(html.includes("Терапевт"));
	});

	it("2. TreatmentPlanStageItemRow renders doctor assignment selector when unassigned", () => {
		const html = renderToString(
			<TreatmentPlanStageItemRow
				item={mockItemWithoutDoctorConsortium}
				doctors={mockDoctorsConsortium}
				onAssignDoctor={() => {}}
			/>,
		);

		assert.ok(html.includes("assign-doctor-select-item-surgery-01"));
		assert.ok(html.includes("+ Врач"));
		assert.ok(html.includes("Д-р Барабаш С.В."));
		assert.ok(html.includes("Д-р Ковалев В.Н."));
	});
});
