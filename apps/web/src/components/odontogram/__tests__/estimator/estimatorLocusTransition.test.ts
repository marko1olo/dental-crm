import assert from "node:assert/strict";
import test from "node:test";
import {
	getLocusPredecessorToothNumber,
	getLocusSuccessorToothNumber,
	getLocusTransitionDescription,
	getRelatedLocusToothNumbers,
	reconcileAutoSuggestions,
} from "../../treatmentEstimatorPricing";
import { mergeLocusHistoryEvents, type ToothHistoryEvent } from "../../toothHistoryEvents";
import { service, tooth } from "./estimatorTestHelpers";

function build(teeth: any[], catalog: any[]) {
	return reconcileAutoSuggestions([], teeth, catalog).items;
}

test("сменный прикус: молочный 85 связывается с постоянным преемником 45", () => {
	assert.equal(getLocusSuccessorToothNumber(85), 45);
	assert.equal(getLocusSuccessorToothNumber(51), 11);
	assert.equal(getLocusSuccessorToothNumber(55), 15);
	assert.equal(getLocusSuccessorToothNumber(73), 33);
	assert.equal(getLocusSuccessorToothNumber(45), null);
	assert.equal(getLocusSuccessorToothNumber(16), null);
});

test("сменный прикус: постоянный 45 связывается с молочным предшественником 85", () => {
	assert.equal(getLocusPredecessorToothNumber(45), 85);
	assert.equal(getLocusPredecessorToothNumber(11), 51);
	assert.equal(getLocusPredecessorToothNumber(15), 55);
	assert.equal(getLocusPredecessorToothNumber(33), 73);
	assert.equal(getLocusPredecessorToothNumber(46), null);
	assert.equal(getLocusPredecessorToothNumber(16), null);
	assert.equal(getLocusPredecessorToothNumber(27), null);
});

test("связанные номера локуса объединяют молочный и постоянный зубы", () => {
	assert.deepEqual(getRelatedLocusToothNumbers(85), [85, 45]);
	assert.deepEqual(getRelatedLocusToothNumbers(45), [45, 85]);
	assert.deepEqual(getRelatedLocusToothNumbers(46), [46]);
});

test("описание перехода локуса формирует профессиональный текст", () => {
	assert.equal(getLocusTransitionDescription(85), "Сменный локус: молочный зуб #85 ➔ постоянный преемник #45");
	assert.equal(getLocusTransitionDescription(45), "Сменный локус: постоянный зуб #45 (предшественник: молочный #85)");
	assert.equal(getLocusTransitionDescription(46), null);
});

test("история локуса не затирает события молочного зуба при смене на постоянный", () => {
	const adultEvents: ToothHistoryEvent[] = [
		{ kind: "diary", dateIso: "2026-05-10T10:00:00Z", description: "Прорезывание постоянного премоляра 45, герметизация фиссур", author: "Барабаш С.В." },
	];
	const primaryEvents: ToothHistoryEvent[] = [
		{ kind: "diary", dateIso: "2023-02-15T14:30:00Z", description: "Лечение пульпита молочного моляра, цинк-эвгенольная паста", author: "Барабаш С.В." },
		{ kind: "state_change", dateIso: "2025-11-20T09:00:00Z", description: "Физиологическая резорбция корней, удаление подвижного молочного зуба", author: "Барабаш С.В." },
	];
	const merged = mergeLocusHistoryEvents(adultEvents, primaryEvents, 85);
	assert.equal(merged.length, 3);
	assert.equal(merged[0]?.description, "Прорезывание постоянного премоляра 45, герметизация фиссур");
	assert.match(merged[1]?.description ?? "", /\[Молочный зуб #85\]/);
});

test("сметчик корректно разделяет детские и взрослые услуги в прайсе для молочного зуба", () => {
	const mixedCatalog = [
		service("svc-adult-caries", "Лечение кариеса постоянного зуба", "therapy", 4500),
		service("svc-child-caries", "Лечение кариеса молочного зуба", "therapy", 2800),
	];
	const adultItems = build([tooth(45, "Caries")], mixedCatalog);
	assert.equal(adultItems.length, 1);
	assert.equal(adultItems[0]?.priceId, "svc-adult-caries");
	assert.equal(adultItems[0]?.price, 4500);

	const childItems = build([tooth(85, "Caries")], mixedCatalog);
	assert.equal(childItems.length, 1);
	assert.equal(childItems[0]?.priceId, "svc-child-caries");
	assert.equal(childItems[0]?.price, 2800);
});
