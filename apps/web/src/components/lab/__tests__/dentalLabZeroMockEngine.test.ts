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
	CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES,
	mapTo6StageOrthopedicLifecycle,
	type CanonicalOrthopedic6StageId,
} from "../dentalLabOrderEngine";

describe("dentalLabZeroMock — Engine & 6-Stage Lifecycle", () => {
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

	it("CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES содержит все 6 этапов", () => {
		assert.equal(CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES.length, 6);
		const expectedOrder: CanonicalOrthopedic6StageId[] = [
			"impression_taken",
			"courier_sent",
			"framework_fitting",
			"ceramic_layering",
			"ready_in_clinic",
			"patient_fixation",
		];
		CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES.forEach((item, idx) => {
			assert.equal(item.step, idx + 1);
			assert.equal(item.id, expectedOrder[idx]);
		});
		assert.equal(mapTo6StageOrthopedicLifecycle("draft"), "impression_taken");
		assert.equal(mapTo6StageOrthopedicLifecycle("sent_to_lab"), "courier_sent");
		assert.equal(mapTo6StageOrthopedicLifecycle("in_progress"), "framework_fitting");
		assert.equal(mapTo6StageOrthopedicLifecycle("ready_in_clinic"), "ready_in_clinic");
		assert.equal(mapTo6StageOrthopedicLifecycle("delivered_to_patient"), "patient_fixation");
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
