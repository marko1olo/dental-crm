import assert from "node:assert/strict";
import test from "node:test";
import {
	convertGhostItemToImplant,
	detectGhostTeethConflicts,
	type EstimatorToothInput,
	getGhostToothConflict,
	type PlanItem,
} from "../../treatmentEstimatorPricing";
import { service } from "./estimatorTestHelpers";

test("удаленный зуб со старым терапевтическим лечением опознается как конфликт зуба-призрака", () => {
	const currentTeeth: EstimatorToothInput[] = [{ toothNumber: 46, state: "Missing" }, { toothNumber: 11, state: "Caries" }];
	const ghostItem: PlanItem = { id: "p-46", toothNumber: 46, name: "Коронка", priceId: "s-c", price: 28000, quantity: 1, discount: 0, phase: 3, suggestion: "crown" };
	const conflict = getGhostToothConflict(ghostItem, currentTeeth);
	assert.ok(conflict);
	assert.equal(conflict.toothNumber, 46);
	assert.equal(conflict.toothState, "Missing");
	assert.match(conflict.warningBadgeText, /Зуб 46 удален на формуле!/);
	assert.match(conflict.message, /зуб #46/i);
});

test("имплантат и навигационный шаблон на удаленном зубе НЕ считаются зубами-призраками", () => {
	const currentTeeth: EstimatorToothInput[] = [{ toothNumber: 46, state: "Missing" }];
	const implantItem: PlanItem = { toothNumber: 46, name: "Имплантат", priceId: "s-i", price: 45000, quantity: 1, discount: 0, phase: 2, suggestion: "implant" };
	const guideItem: PlanItem = { toothNumber: 46, name: "Шаблон", priceId: "s-g", price: 12000, quantity: 1, discount: 0, phase: 2, suggestion: "implantGuide" };
	assert.equal(getGhostToothConflict(implantItem, currentTeeth), null);
	assert.equal(getGhostToothConflict(guideItem, currentTeeth), null);
});

test("замена позиции зуба-призрака преобразует терапию в имплантацию на этапе хирургии", () => {
	const catalog = [service("svc-implant", "Установка дентального имплантата", "surgery", 35000)];
	const ghostItem: PlanItem = { toothNumber: 46, name: "Пломбирование", priceId: "s-c", price: 3500, quantity: 1, discount: 0, phase: 1, suggestion: "caries" };
	const converted = convertGhostItemToImplant(ghostItem, catalog);
	assert.equal(converted.toothNumber, 46);
	assert.equal(converted.phase, 2);
	assert.equal(converted.suggestion, "implant");
	assert.equal(converted.priceId, "svc-implant");
	assert.equal(converted.price, 35000);
});

test("детектор конфликтов зубов-призраков находит все невалидные позиции плана", () => {
	const currentTeeth: EstimatorToothInput[] = [{ toothNumber: 36, state: "extracted" }, { toothNumber: 46, state: "Missing" }, { toothNumber: 11, state: "Healthy" }];
	const items: PlanItem[] = [
		{ toothNumber: 36, name: "Пульпит 36", priceId: "s-1", price: 8000, quantity: 1, discount: 0, phase: 1, suggestion: "pulpitis" },
		{ toothNumber: 46, name: "Коронка 46", priceId: "s-2", price: 15000, quantity: 1, discount: 0, phase: 3, suggestion: "crown" },
		{ toothNumber: 11, name: "Кариес 11", priceId: "s-3", price: 3000, quantity: 1, discount: 0, phase: 1, suggestion: "caries" },
	];
	const conflicts = detectGhostTeethConflicts(items, currentTeeth);
	assert.equal(conflicts.length, 2);
	assert.equal(conflicts[0]?.toothNumber, 36);
	assert.equal(conflicts[1]?.toothNumber, 46);
});

test("при сосуществовании имплантата и пломбы на удаленном зубе конфликт присваивается только пломбе", () => {
	const currentTeeth: EstimatorToothInput[] = [{ toothNumber: 46, state: "Missing" }];
	const implantItem: PlanItem = { id: "imp-46", toothNumber: 46, name: "Имплантат", suggestion: "implant", priceId: "s-i", price: 35000, quantity: 1, discount: 0, phase: 2 };
	const fillingItem: PlanItem = { id: "fill-46", toothNumber: 46, name: "Пломбирование", suggestion: "caries", priceId: "s-f", price: 4500, quantity: 1, discount: 0, phase: 1 };
	assert.equal(getGhostToothConflict(implantItem, currentTeeth), null);
	assert.ok(getGhostToothConflict(fillingItem, currentTeeth));
	const allConflicts = detectGhostTeethConflicts([implantItem, fillingItem], currentTeeth);
	assert.equal(allConflicts.length, 1);
	assert.equal(allConflicts[0]?.itemName, "Пломбирование");
});
