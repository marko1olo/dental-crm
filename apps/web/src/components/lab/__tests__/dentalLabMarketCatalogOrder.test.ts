import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	ORTHOPEDIC_WORK_TYPES,
	ORDERED_MARKET_ORTHOPEDIC_TYPES,
	createDentalLabOrder,
	sendOrderToWarrantyRework,
	type OrthopedicWorkTypeId,
} from "../dentalLabWorkflowEngine";
import { calculateLabFinancialSplit } from "../labMath";

describe("dentalLabMarketCatalogOrder — Popularity & Invariants", () => {
	it("1. Verifies 90%+ CIS/RU market catalog in exact descending order of popularity", () => {
		const expectedOrder: OrthopedicWorkTypeId[] = [
			"crown_zirconia",
			"crown_emax",
			"metal_ceramic",
			"temporary_pmma",
			"clasp_prosthesis",
			"custom_abutment",
			"removable_acrylic",
			"aligners",
		];
		assert.deepEqual([...ORDERED_MARKET_ORTHOPEDIC_TYPES], expectedOrder);

		for (const typeId of expectedOrder) {
			const item = ORTHOPEDIC_WORK_TYPES[typeId];
			assert.ok(item);
			assert.equal(item.id, typeId);
			assert.ok(item.nameRu.length > 5);
			assert.ok(item.standardTurnaroundWorkingDays > 0);
			assert.ok(item.defaultPriceKopecks > item.defaultCostKopecks);
		}
	});

	it("2. Verifies temporary_pmma first-class citizen properties", () => {
		const pmma = ORTHOPEDIC_WORK_TYPES.temporary_pmma;
		assert.ok(pmma);
		assert.ok(pmma.nameRu.includes("PMMA"));
		assert.ok(pmma.standardTurnaroundWorkingDays <= 3);

		const order = createDentalLabOrder({
			patientId: "pat-pmma",
			patientName: "Сидорова Анна",
			doctorId: "doc-01",
			doctorName: "Д-р Смирнов",
			workTypeId: "temporary_pmma",
			selectedTeeth: [21],
		});
		assert.equal(order.workTypeId, "temporary_pmma");
		assert.equal(order.selectedTeeth[0], 21);
		assert.ok(order.financials.isBalanced);
	});

	it("3. Financial kopeck-exact integrity and warranty rework (0 ₽ for patient)", () => {
		const split = calculateLabFinancialSplit(35000, 25);
		assert.equal(split.totalKopecks, 3500000);
		assert.equal(split.doctorKopecks, 875000);
		assert.equal(split.clinicKopecks, 2625000);
		assert.equal(split.isBalanced, true);

		const order = createDentalLabOrder({
			patientId: "pat-warr",
			patientName: "Ковалев В. В.",
			doctorId: "doc-02",
			doctorName: "Д-р Белов",
			workTypeId: "crown_emax",
			selectedTeeth: [11],
			initialStatus: "installed_completed",
		});

		const rework = sendOrderToWarrantyRework(order, "Скол керамики", "Д-р Белов");
		assert.equal(rework.currentStage, "warranty_rework");
		assert.equal(rework.financials.patientPriceTotalKopecks, 0);
		assert.equal(rework.financials.isBalanced, true);
	});
});
