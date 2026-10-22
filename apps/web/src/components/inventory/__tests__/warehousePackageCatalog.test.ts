import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CLINICAL_WRITEOFF_PACKAGES } from "../warehousePackageWriteOffEngine";

describe("Wave 64 (Feature 253): Warehouse Package Write-off Engine & Catalog", () => {
	it("1. Содержит все 4 канонических клинических пакета стоматологического приёма", () => {
		const packageIds = CLINICAL_WRITEOFF_PACKAGES.map((p) => p.id);
		assert.ok(packageIds.includes("anesthesia"), "Пакет «Стандартная анестезия» должен присутствовать");
		assert.ok(packageIds.includes("hygiene"), "Пакет «Профгигиена» должен присутствовать");
		assert.ok(packageIds.includes("filling"), "Пакет «Пломба световая» должен присутствовать");
		assert.ok(packageIds.includes("surgery"), "Пакет «Хирургия» должен присутствовать");

		const anesPkg = CLINICAL_WRITEOFF_PACKAGES.find((p) => p.id === "anesthesia")!;
		assert.equal(anesPkg.buttonClass, "btn-writeoff-anesthesia-packet");
		assert.equal(anesPkg.testId, "btn-writeoff-anesthesia-packet");

		const hygPkg = CLINICAL_WRITEOFF_PACKAGES.find((p) => p.id === "hygiene")!;
		assert.equal(hygPkg.buttonClass, "btn-writeoff-hygiene-packet");
		assert.equal(hygPkg.testId, "btn-writeoff-hygiene-packet");
	});

	it("2. Пакет «Стандартная анестезия» включает карпулу артикаина 1.7 мл, иглу 30G, валики и салфетку", () => {
		const anesPkg = CLINICAL_WRITEOFF_PACKAGES.find((p) => p.id === "anesthesia")!;
		assert.ok(anesPkg.items.length >= 4);

		const carpule = anesPkg.items.find((i) => i.category === "anesthesia" && i.unit === "карп.")!;
		assert.ok(carpule, "Карпула анестетика должна входить в пакет");
		assert.equal(carpule.standardQuantity, 1);
		assert.ok(carpule.nameRu.toLowerCase().includes("артикаин"));
		assert.equal(carpule.unitCostKopecks, 14500);

		const needle = anesPkg.items.find((i) => i.id.includes("needle"))!;
		assert.ok(needle, "Игла карпульная должна входить в пакет");
		assert.equal(needle.standardQuantity, 1);
	});

	it("3. Пакет «Профгигиена» включает СИЗ, Оптрагейт, порошок Air-Flow, пасту, щетку и валики", () => {
		const hygPkg = CLINICAL_WRITEOFF_PACKAGES.find((p) => p.id === "hygiene")!;
		assert.ok(hygPkg.items.length >= 6);

		const names = hygPkg.items.map((i) => i.nameRu.toLowerCase());
		assert.ok(names.some((n) => n.includes("оптрагейт") || n.includes("optragate")));
		assert.ok(names.some((n) => n.includes("air-flow") || n.includes("порошок")));
		assert.ok(names.some((n) => n.includes("паста")));
		assert.ok(names.some((n) => n.includes("перчатки")));
		assert.ok(names.some((n) => n.includes("маска")));
	});

	it("4. Пакет «Пломба световая» включает нанокомпозит, адгезив, протравочный гель и матрицу", () => {
		const fillPkg = CLINICAL_WRITEOFF_PACKAGES.find((p) => p.id === "filling")!;
		const names = fillPkg.items.map((i) => i.nameRu.toLowerCase());
		assert.ok(names.some((n) => n.includes("композит")));
		assert.ok(names.some((n) => n.includes("адгезив")));
		assert.ok(names.some((n) => n.includes("протравочный")));
		assert.ok(names.some((n) => n.includes("матрица")));
	});
});
