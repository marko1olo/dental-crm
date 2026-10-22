import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DENTAL_LAB_CONSTRUCTIONS,
	DENTAL_LAB_STATUSES,
	DENTAL_LAB_STATUS_ORDER,
	CANONICAL_5_CLINICAL_LAB_STATUSES,
	mapOrderStatusToCanonical5,
	mapCanonical5ToOrderStatus,
	getNextLabStatus,
	canTransitionLabStatus,
	type DentalLabConstructionType,
	type DentalLabOrderStatus,
} from "../dentalLabOrderEngine";

describe("dentalLabOrderEngine — Catalog & Status Lifecycle", () => {
	it("содержит ровно 6 ключевых стоматологических конструкций ортопедии и ортодонтии", () => {
		const expectedKeys: DentalLabConstructionType[] = [
			"crown_zirconia",
			"crown_emax",
			"metal_ceramic",
			"clasp_denture",
			"aligner_splint",
			"surgical_guide",
		];

		assert.deepEqual(Object.keys(DENTAL_LAB_CONSTRUCTIONS).sort(), expectedKeys.sort());

		const namesAll = Object.values(DENTAL_LAB_CONSTRUCTIONS).map((c) => c.nameRu.toLowerCase()).join(" ");
		assert.ok(!namesAll.includes("биохим"));
		assert.ok(!namesAll.includes("онкомаркер"));
		assert.ok(!namesAll.includes("цитолог"));
		assert.ok(!namesAll.includes("мазок"));
		assert.ok(!namesAll.includes("моч"));
	});

	it("каждая конструкция имеет корректные русские названия, сроки и целочисленные копейки", () => {
		for (const [key, c] of Object.entries(DENTAL_LAB_CONSTRUCTIONS)) {
			assert.equal(c.id, key);
			assert.ok(c.nameRu.length > 5, `Слишком короткое название у ${key}`);
			assert.ok(c.shortNameRu.length > 3, `Слишком короткое краткое название у ${key}`);
			assert.ok(c.standardTurnaroundDays > 0, `Некорректный срок у ${key}`);
			assert.ok(Number.isInteger(c.defaultPatientPriceKopecks), `Цена должна быть целым числом копеек у ${key}`);
			assert.ok(Number.isInteger(c.defaultZtlCostKopecks), `Себестоимость ЗТЛ должна быть целым числом копеек у ${key}`);
			assert.ok(
				c.defaultPatientPriceKopecks > c.defaultZtlCostKopecks,
				`Цена для пациента должна превышать себестоимость ЗТЛ у ${key}`,
			);
		}
	});

	it("содержит ровно 6 канонических статусов ЗТЛ и продвижение по маршруту", () => {
		const expectedStatuses: DentalLabOrderStatus[] = [
			"sent_to_lab",
			"in_progress",
			"ready_in_clinic",
			"try_in",
			"delivered_to_patient",
			"warranty_rework",
		];

		assert.deepEqual(DENTAL_LAB_STATUS_ORDER, expectedStatuses);
		assert.equal(getNextLabStatus("sent_to_lab"), "in_progress");
		assert.equal(getNextLabStatus("in_progress"), "ready_in_clinic");
		assert.equal(getNextLabStatus("ready_in_clinic"), "try_in");
		assert.equal(getNextLabStatus("try_in"), "delivered_to_patient");
		assert.equal(getNextLabStatus("delivered_to_patient"), null);
		assert.equal(getNextLabStatus("warranty_rework"), "sent_to_lab");
		assert.ok(canTransitionLabStatus("sent_to_lab", "in_progress"));
		assert.ok(canTransitionLabStatus("delivered_to_patient", "warranty_rework"));
	});

	it("поддерживает 5 канонических статусов (CANONICAL_5_CLINICAL_LAB_STATUSES) и взаимный маппинг", () => {
		assert.equal(CANONICAL_5_CLINICAL_LAB_STATUSES.length, 5);
		assert.equal(CANONICAL_5_CLINICAL_LAB_STATUSES[0]?.id, "sent");
		assert.equal(CANONICAL_5_CLINICAL_LAB_STATUSES[1]?.id, "in_progress");
		assert.equal(CANONICAL_5_CLINICAL_LAB_STATUSES[2]?.id, "fitting");
		assert.equal(CANONICAL_5_CLINICAL_LAB_STATUSES[3]?.id, "ready");
		assert.equal(CANONICAL_5_CLINICAL_LAB_STATUSES[4]?.id, "completed");

		assert.equal(mapOrderStatusToCanonical5("sent_to_lab"), "sent");
		assert.equal(mapOrderStatusToCanonical5("in_progress"), "in_progress");
		assert.equal(mapOrderStatusToCanonical5("try_in"), "fitting");
		assert.equal(mapOrderStatusToCanonical5("ready_in_clinic"), "ready");
		assert.equal(mapOrderStatusToCanonical5("delivered_to_patient"), "completed");

		assert.equal(mapCanonical5ToOrderStatus("sent"), "sent_to_lab");
		assert.equal(mapCanonical5ToOrderStatus("in_progress"), "in_progress");
		assert.equal(mapCanonical5ToOrderStatus("fitting"), "try_in");
		assert.equal(mapCanonical5ToOrderStatus("ready"), "ready_in_clinic");
		assert.equal(mapCanonical5ToOrderStatus("completed"), "delivered_to_patient");
	});
});
