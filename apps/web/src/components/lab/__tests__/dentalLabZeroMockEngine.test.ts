import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	generateDeterministicLabOrderNumber,
	generateDeterministicLabOrderId,
	createDentalLabOrderRecord,
	calculateZtlWageFinancials,
	CANONICAL_5_CLINICAL_LAB_STATUSES,
	mapTo5StageLabStatus,
	type Canonical5LabStatus,
} from "../dentalLabOrderEngine";

describe("dentalLabZeroMock — Engine & 5-Stage Canonical Lifecycle", () => {
	it("generateDeterministicLabOrderNumber и Id производят детерминированные значения", () => {
		const fixedDate = new Date("2026-10-15T10:00:00Z");
		const orderNum1 = generateDeterministicLabOrderNumber({ date: fixedDate, sequence: 101 });
		const orderNum2 = generateDeterministicLabOrderNumber({ date: fixedDate, sequence: 102 });

		assert.equal(orderNum1, "ЗТЛ-2026-101");
		assert.equal(orderNum2, "ЗТЛ-2026-102");

		const id1 = generateDeterministicLabOrderId({ date: fixedDate, patientId: "pat-ivanychev-4821", sequence: 101 });
		assert.ok(id1.startsWith("ztl-ord-"));
		assert.ok(id1.includes("4821"));
	});

	it("createDentalLabOrderRecord создает наряд со 100% детерминированными полями", () => {
		const record = createDentalLabOrderRecord({
			patientId: "pat-smirnova-77",
			patientName: "Смирнова Е.А.",
			doctorId: "doc-petrov",
			doctorName: "Д-р Петров С.В.",
			teethFdi: [16, 17],
			constructionType: "crown_zirconia",
			vitaShade: "A2",
		});

		assert.ok(record.id.startsWith("ztl-ord-"));
		assert.ok(record.orderNumber.startsWith("ЗТЛ-"));
		assert.equal(record.patientName, "Смирнова Е.А.");
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
