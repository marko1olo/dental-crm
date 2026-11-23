import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	calculateZtlWageFinancials,
	CANONICAL_5_CLINICAL_LAB_STATUSES,
	mapTo5StageLabStatus,
	type Canonical5LabStatus,
} from "../dentalLabOrderEngine";
import {
	CANONICAL_PG_LAB_STATUSES,
	STAGE_TO_CANONICAL_PG_STATUS,
	canTransitionLabOrderStatus,
} from "@dental/shared";

describe("dentalLabZeroMock — Engine & 5-Stage Canonical Lifecycle", () => {
	it("CANONICAL_PG_LAB_STATUSES и STAGE_TO_CANONICAL_PG_STATUS валидируют статусы", () => {
		assert.ok(CANONICAL_PG_LAB_STATUSES.includes("sent"));
		assert.ok(CANONICAL_PG_LAB_STATUSES.includes("in_progress"));
		assert.ok(CANONICAL_PG_LAB_STATUSES.includes("fitting"));
		assert.ok(CANONICAL_PG_LAB_STATUSES.includes("ready_in_clinic"));
		assert.ok(CANONICAL_PG_LAB_STATUSES.includes("completed"));

		assert.equal(STAGE_TO_CANONICAL_PG_STATUS.sent, "sent");
		assert.equal(STAGE_TO_CANONICAL_PG_STATUS.in_progress, "in_progress");
		assert.equal(STAGE_TO_CANONICAL_PG_STATUS.fitting, "fitting");
		assert.equal(STAGE_TO_CANONICAL_PG_STATUS.ready, "ready_in_clinic");
		assert.equal(STAGE_TO_CANONICAL_PG_STATUS.completed, "completed");
	});

	it("canTransitionLabOrderStatus разрешает канонические переходы жизненного цикла", () => {
		assert.equal(canTransitionLabOrderStatus("sent", "in_progress"), true);
		assert.equal(canTransitionLabOrderStatus("in_progress", "fitting"), true);
		assert.equal(canTransitionLabOrderStatus("fitting", "ready"), true);
		assert.equal(canTransitionLabOrderStatus("ready", "completed"), true);
	});

	it("в кодовой базе engine отсутствует Math.random()", () => {
		const currentFile = fileURLToPath(import.meta.url);
		const enginePath = path.resolve(path.dirname(currentFile), "../dentalLabOrderEngine.ts");
		const engineContent = fs.readFileSync(enginePath, "utf-8");
		const codeLines = engineContent
			.split("\n")
			.filter((line) => !line.trim().startsWith("*") && !line.trim().startsWith("//"));
		assert.equal(codeLines.some((l) => l.includes("Math.random()")), false);
	});

	it("CANONICAL_5_CLINICAL_LAB_STATUSES содержит все 5 канонических этапов", () => {
		assert.equal(CANONICAL_5_CLINICAL_LAB_STATUSES.length, 5);
		const expectedOrder: Canonical5LabStatus[] = [
			"sent",
			"in_progress",
			"fitting",
			"ready",
			"completed",
		];
		CANONICAL_5_CLINICAL_LAB_STATUSES.forEach((item, idx) => {
			assert.equal(item.step, idx + 1);
			assert.equal(item.id, expectedOrder[idx]);
		});
		assert.equal(mapTo5StageLabStatus("draft"), "sent");
		assert.equal(mapTo5StageLabStatus("sent_to_lab"), "sent");
		assert.equal(mapTo5StageLabStatus("in_progress"), "in_progress");
		assert.equal(mapTo5StageLabStatus("model_cad_design"), "in_progress");
		assert.equal(mapTo5StageLabStatus("fitting_scheduled"), "fitting");
		assert.equal(mapTo5StageLabStatus("ready_in_clinic"), "ready");
		assert.equal(mapTo5StageLabStatus("installed_completed"), "completed");
		assert.equal(mapTo5StageLabStatus("delivered_to_patient"), "completed");
	});

	it("вычитает себестоимость ЗТЛ из сдельной базы врача с нулевым копеечным дрейфом", () => {
		const fin = calculateZtlWageFinancials({
			unitsCount: 1,
			patientPriceKopecks: 3200000,
			ztlCostKopecks: 900000,
			doctorSharePercent: 25,
		});

		assert.equal(fin.patientPriceKopecks, 3200000);
		assert.equal(fin.ztlCostKopecks, 900000);
		assert.equal(fin.doctorWageBaseKopecks, 2300000);
		assert.equal(fin.doctorWageKopecks, 575000);
		assert.equal(fin.clinicMarginKopecks, 1725000);
		assert.ok(fin.isBalanced);

		const rework = calculateZtlWageFinancials({
			unitsCount: 1,
			patientPriceKopecks: 2800000,
			ztlCostKopecks: 850000,
			doctorSharePercent: 20,
			isWarrantyRework: true,
			warrantyLiabilityType: "lab_defect",
		});
		assert.equal(rework.patientPriceKopecks, 0);
		assert.equal(rework.doctorWageKopecks, 0);
		assert.equal(rework.ztlCostKopecks, 0);
	});
});
