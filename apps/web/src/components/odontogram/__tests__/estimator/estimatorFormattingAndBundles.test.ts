import assert from "node:assert/strict";
import test from "node:test";
import type { PlanPriceCatalogItem } from "../../../treatment-plans/planPricing";
import {
	createChairsideCariesBundle,
	type EstimatorToothInput,
	estimatorTotals,
	expandToothDiagnosisToClinicalBundle,
	formatSurfacesText,
	formatToothFdiLabel,
	reconcileAutoSuggestions,
	surfaceSuffix,
} from "../../treatmentEstimatorPricing";

test("formatSurfacesText исключает утечки [object Object] при любых типах данных", () => {
	assert.equal(formatSurfacesText(undefined), "");
	assert.equal(formatSurfacesText(null), "");
	assert.equal(formatSurfacesText([]), "");
	assert.equal(formatSurfacesText(["M", "O", "D"]), "M, O, D");
	assert.equal(formatSurfacesText("[object Object]"), "");
	const objSurfaces = [{ name: "Вестибулярная" }, { surface: "Окклюзионная" }];
	assert.equal(formatSurfacesText(objSurfaces), "Вестибулярная, Окклюзионная");
	assert.doesNotMatch(formatSurfacesText(objSurfaces), /\[object Object\]/);
});

test("surfaceSuffix чисто форматирует суффикс без мусора", () => {
	assert.equal(surfaceSuffix(undefined), "");
	assert.equal(surfaceSuffix([]), "");
	assert.equal(surfaceSuffix(["окклюзионная"]), " (Поверхности: окклюзионная)");
	assert.equal(surfaceSuffix([{ name: "дистальная" }]), " (Поверхности: дистальная)");
	assert.doesNotMatch(surfaceSuffix([{ invalid: true }]), /\[object Object\]/);
});

test("formatToothFdiLabel никогда не выдает 'Tooth undefined'", () => {
	assert.equal(formatToothFdiLabel(undefined), "Позиция плана (без привязки к зубу)");
	assert.equal(formatToothFdiLabel(null), "Позиция плана (без привязки к зубу)");
	assert.equal(formatToothFdiLabel(99), "Позиция плана (без привязки к зубу)");
	assert.equal(formatToothFdiLabel(46), "Зуб 46");
	assert.doesNotMatch(formatToothFdiLabel(undefined), /undefined/i);
});

test("бесшовный перенос кариеса одонтограммы в смету: кариес 16 -> анестезия + препарирование + световая пломба", () => {
	const clinicCatalog: PlanPriceCatalogItem[] = [
		{ id: "svc-anesth-01", title: "Местная анестезия", category: "Анестезия", basePriceRub: 900, active: true },
		{ id: "svc-isol-01", title: "Коффердам", category: "Терапия", basePriceRub: 1200, active: true },
		{ id: "svc-caries-01", title: "Лечение кариеса", category: "Терапия", basePriceRub: 4800, active: true },
		{ id: "svc-polish-01", title: "Шлифовка и полировка", category: "Терапия", basePriceRub: 600, active: true },
	];
	const items = createChairsideCariesBundle(16, clinicCatalog, { surfaces: ["MOD"], includeAnesthesia: true, includeIsolation: true, includePolishing: true });
	assert.equal(items.length, 4);
	assert.equal(items[0]?.name, "Местная анестезия");
	assert.equal(items[0]?.price, 900);
	assert.equal(items[1]?.name, "Коффердам");
	assert.equal(items[1]?.price, 1200);
	assert.ok(items[2]?.name.includes("Лечение кариеса"));
	assert.equal(items[2]?.price, 4800);
	assert.equal(items[3]?.name, "Шлифовка и полировка");
	assert.equal(items[3]?.price, 600);
	const totals = estimatorTotals(items, null);
	assert.equal(totals.payableKopecks, 750000);
	const expanded = expandToothDiagnosisToClinicalBundle(16, "Caries", clinicCatalog, { surfaces: ["O"] });
	assert.ok(expanded.length >= 2);
});

test("при ретенции зуба (например, 48 на ОПТГ) сметчик подбирает удаление ретенированного зуба на этапе хирургии", () => {
	const clinicCatalog: PlanPriceCatalogItem[] = [
		{ id: "svc-surg-ret-01", title: "Сложное удаление ретенированного зуба", category: "surgery", basePriceRub: 9000, active: true },
	];
	const teeth: EstimatorToothInput[] = [{ toothNumber: 48, state: "Retained" }];
	const { items, changed } = reconcileAutoSuggestions([], teeth, clinicCatalog);
	assert.equal(changed, true);
	assert.equal(items.length, 1);
	assert.equal(items[0]?.toothNumber, 48);
	assert.equal(items[0]?.phase, 2);
	assert.equal(items[0]?.priceId, "svc-surg-ret-01");
	assert.equal(items[0]?.price, 9000);
	const totals = estimatorTotals(items, null);
	assert.equal(totals.payableKopecks, 900000);
});
