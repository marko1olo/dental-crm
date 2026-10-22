import assert from "node:assert/strict";
import test from "node:test";
import {
	calculateTreatmentWarranty,
	estimatorStagesBreakdown,
	exportEstimatorToCashier,
	type PlanItem,
} from "../../treatmentEstimatorPricing";

test("смета группирует услуги по 5 клиническим этапам с копеечной точностью", () => {
	const items: PlanItem[] = [
		{ id: "item-1", name: "Лечение кариеса", toothNumber: 16, priceId: "s-1", price: 4500, quantity: 1, discount: 500, phase: 1, category: "therapy", suggestion: "caries" },
		{ id: "item-2", name: "Обработка каналов", toothNumber: 16, priceId: "s-2", price: 7000, quantity: 1, discount: 0, phase: 1, category: "therapy", suggestion: "pulpitis" },
		{ id: "item-3", name: "Имплантат Straumann", toothNumber: 26, priceId: "s-3", price: 45000, quantity: 1, discount: 0, phase: 2, category: "surgery", suggestion: "implant" },
		{ id: "item-4", name: "Коронка цирконий", toothNumber: 26, priceId: "s-4", price: 28000, quantity: 1, discount: 0, phase: 3, category: "prosthetics", suggestion: "crown" },
		{ id: "item-5", name: "AirFlow гигиена", priceId: "s-5", price: 6000, quantity: 1, discount: 1000, phase: 1, category: "hygiene" },
	];
	const stages = estimatorStagesBreakdown(items, null);
	assert.equal(stages.length, 5);
	assert.equal(stages.find((s) => s.stageId === "stage_1_therapy")?.payableRub, 4000);
	assert.equal(stages.find((s) => s.stageId === "stage_2_endo")?.payableRub, 7000);
	assert.equal(stages.find((s) => s.stageId === "stage_3_surgery")?.payableRub, 45000);
	assert.equal(stages.find((s) => s.stageId === "stage_4_orthopedics")?.payableRub, 28000);
	assert.equal(stages.find((s) => s.stageId === "stage_5_hygiene")?.payableRub, 5000);
});

test("гарантийные обязательства определяют регламентные сроки 12/24/36 мес по СтАР", () => {
	const caries = calculateTreatmentWarranty({ name: "Пломба", priceId: "p-1", price: 5000, quantity: 1, discount: 0, phase: 1, suggestion: "caries" });
	assert.equal(caries.warrantyMonths, 12);
	assert.equal(caries.serviceLifeMonths, 24);

	const endo = calculateTreatmentWarranty({ name: "Пульпит", priceId: "p-2", price: 9000, quantity: 1, discount: 0, phase: 1, suggestion: "pulpitis" });
	assert.equal(endo.warrantyMonths, 12);

	const crown = calculateTreatmentWarranty({ name: "Коронка", priceId: "p-3", price: 32000, quantity: 1, discount: 0, phase: 3, suggestion: "crown" });
	assert.equal(crown.warrantyMonths, 24);
	assert.equal(crown.serviceLifeMonths, 60);

	const implant = calculateTreatmentWarranty({ name: "Имплантат", priceId: "p-4", price: 55000, quantity: 1, discount: 0, phase: 2, suggestion: "implant" });
	assert.equal(implant.warrantyMonths, 36);
	assert.equal(implant.isManufacturerLifetimeWarranty, true);
});

test("экспорт сметы в кассу 54-ФЗ формирует валидный пэйлоад с копейками", () => {
	const items: PlanItem[] = [
		{ id: "it-1", name: "Пломба", toothNumber: 15, priceId: "pr-1", price: 5000, quantity: 1, discount: 500, phase: 1, category: "therapy" },
		{ id: "it-2", name: "Коронка", toothNumber: 15, priceId: "pr-2", price: 25000, quantity: 1, discount: 0, phase: 3, category: "prosthetics" },
	];
	const cashierExport = exportEstimatorToCashier(items, "patient-uuid-123", "Иванов Иван Иванович", 10);
	assert.equal(cashierExport.patientId, "patient-uuid-123");
	assert.equal(cashierExport.items.length, 2);
	assert.equal(cashierExport.items[0]?.priceRub, 4500);
	assert.equal(cashierExport.items[1]?.priceRub, 22500);
	assert.equal(cashierExport.totalRub, 27000);
	assert.equal(cashierExport.totalKopecks, 2_700_000);
});
