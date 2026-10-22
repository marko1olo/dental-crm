import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	CANONICAL_DENTAL_SUPPLIERS,
	CANONICAL_DENTAL_MATERIAL_TEMPLATES,
	calculateFefoStatus,
	createWaybillItem,
	sortWaybillItemsByFefo,
} from "../acceptanceWaybillsEngine.js";

describe("AcceptanceWaybills: Canonical Suppliers & Templates", () => {
	it("содержит канонических стоматологических поставщиков с корректными ИНН и реквизитами", () => {
		assert.ok(CANONICAL_DENTAL_SUPPLIERS.length >= 5);

		const stomtorg = CANONICAL_DENTAL_SUPPLIERS.find((s) => s.id === "sup_stomtorg");
		assert.ok(stomtorg);
		assert.equal(stomtorg.inn, "7701234567");

		const vladmiva = CANONICAL_DENTAL_SUPPLIERS.find((s) => s.id === "sup_vladmiva");
		assert.ok(vladmiva);
		assert.equal(vladmiva.inn, "3123014589");

		for (const supplier of CANONICAL_DENTAL_SUPPLIERS) {
			assert.ok(supplier.name.length > 0);
			assert.ok(/^\d{10}(\d{2})?$/.test(supplier.inn));
		}
	});

	it("содержит стоматологические материалы с правильными ставками НДС", () => {
		assert.ok(CANONICAL_DENTAL_MATERIAL_TEMPLATES.length >= 6);

		const septanest = CANONICAL_DENTAL_MATERIAL_TEMPLATES.find((t) => t.name.includes("Септанест"));
		assert.ok(septanest);
		assert.equal(septanest.vatRate, 0);

		const filtek = CANONICAL_DENTAL_MATERIAL_TEMPLATES.find((t) => t.name.includes("Filtek"));
		assert.ok(filtek);
		assert.equal(filtek.vatRate, 0);

		const gloves = CANONICAL_DENTAL_MATERIAL_TEMPLATES.find((t) => t.name.includes("Перчатки"));
		assert.ok(gloves);
		assert.equal(gloves.vatRate, 20);

		for (const tpl of CANONICAL_DENTAL_MATERIAL_TEMPLATES) {
			assert.ok(tpl.name.length > 0);
			assert.ok(tpl.defaultUnitPriceKopecks > 0);
			assert.ok(tpl.shelfLifeMonths > 0);
		}
	});

	it("определяет свежую партию (FEFO fresh: > 180 дней)", () => {
		const futureDate = new Date();
		futureDate.setDate(futureDate.getDate() + 250);
		const status = calculateFefoStatus(futureDate.toISOString().slice(0, 10));
		assert.equal(status.fefoStatus, "fresh");
		assert.ok(status.daysRemaining >= 240);
	});

	it("определяет предупреждение и критический срок (FEFO warning / critical)", () => {
		const warnDate = new Date();
		warnDate.setDate(warnDate.getDate() + 90);
		const warnStatus = calculateFefoStatus(warnDate.toISOString().slice(0, 10));
		assert.equal(warnStatus.fefoStatus, "warning");

		const critDate = new Date();
		critDate.setDate(critDate.getDate() + 25);
		const critStatus = calculateFefoStatus(critDate.toISOString().slice(0, 10));
		assert.equal(critStatus.fefoStatus, "critical");
	});

	it("определяет просроченную партию (FEFO expired: <= 0 дней)", () => {
		const pastDate = new Date();
		pastDate.setDate(pastDate.getDate() - 5);
		const status = calculateFefoStatus(pastDate.toISOString().slice(0, 10));
		assert.equal(status.fefoStatus, "expired");
		assert.ok(status.daysRemaining <= 0);
	});

	it("сортирует позиции накладной строго по правилу FEFO", () => {
		const now = new Date();
		const d1 = new Date(now.getTime() + 10 * 86400000).toISOString().slice(0, 10);
		const d2 = new Date(now.getTime() + 300 * 86400000).toISOString().slice(0, 10);
		const d3 = new Date(now.getTime() + 50 * 86400000).toISOString().slice(0, 10);

		const item1 = createWaybillItem({ id: "1", name: "Дальний", category: "Р", unit: "уп", quantity: 1, batchNumber: "B1", expirationDate: d2, unitPriceKopecks: 10000, vatRate: 0 });
		const item2 = createWaybillItem({ id: "2", name: "Критический", category: "Р", unit: "уп", quantity: 1, batchNumber: "B2", expirationDate: d1, unitPriceKopecks: 10000, vatRate: 0 });
		const item3 = createWaybillItem({ id: "3", name: "Средний", category: "Р", unit: "уп", quantity: 1, batchNumber: "B3", expirationDate: d3, unitPriceKopecks: 10000, vatRate: 0 });

		const sorted = sortWaybillItemsByFefo([item1, item2, item3]);
		assert.equal(sorted[0]!.id, "2");
		assert.equal(sorted[1]!.id, "3");
		assert.equal(sorted[2]!.id, "1");
	});
});
