import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	createDraftAcceptanceWaybill,
	createSampleDentalWaybill,
	createWaybillItem,
	reconcileOverdraftOnReceipt,
	validateWaybillDraft,
	type AcceptanceWaybillItem,
} from "../acceptanceWaybillsEngine.js";

describe("AcceptanceWaybills: Overdraft & Draft Validation", () => {
	it("автоматически гасит отрицательный остаток (дефицит у кресла) при оприходовании", () => {
		const currentNegativeStock = -3;
		const incomingQuantity = 10;
		const reconciliation = reconcileOverdraftOnReceipt(currentNegativeStock, incomingQuantity);

		assert.equal(reconciliation.overdraftResolved, true);
		assert.equal(reconciliation.previousStock, -3);
		assert.equal(reconciliation.clearedDeficit, 3);
		assert.equal(reconciliation.newStockQuantity, 7);
	});

	it("корректно обрабатывает частичное погашение овердрафта", () => {
		const currentNegativeStock = -10;
		const incomingQuantity = 4;
		const reconciliation = reconcileOverdraftOnReceipt(currentNegativeStock, incomingQuantity);

		assert.equal(reconciliation.overdraftResolved, true);
		assert.equal(reconciliation.previousStock, -10);
		assert.equal(reconciliation.clearedDeficit, 4);
		assert.equal(reconciliation.newStockQuantity, -6);
	});

	it("корректно обрабатывает стандартный приход без овердрафта", () => {
		const currentPositiveStock = 5;
		const incomingQuantity = 10;
		const reconciliation = reconcileOverdraftOnReceipt(currentPositiveStock, incomingQuantity);

		assert.equal(reconciliation.overdraftResolved, false);
		assert.equal(reconciliation.previousStock, 5);
		assert.equal(reconciliation.clearedDeficit, 0);
		assert.equal(reconciliation.newStockQuantity, 15);
	});

	it("бракует черновик без номера накладной или позиций", () => {
		const baseDraft = createDraftAcceptanceWaybill();
		const draft = {
			...baseDraft,
			waybillNumber: "",
			items: [] as AcceptanceWaybillItem[],
		};

		const validation = validateWaybillDraft(draft);
		assert.equal(validation.isValid, false);
		assert.ok(validation.errors.some((e) => e.includes("номер накладной")));
		assert.ok(validation.errors.some((e) => e.includes("не содержит позиций")));
	});

	it("бракует просроченные материалы в накладной и предупреждает о критических сроках", () => {
		const sample = createSampleDentalWaybill();
		const expiredItem = createWaybillItem({
			name: "Просроченный композит",
			category: "Терапия",
			unit: "шпр",
			quantity: 1,
			unitPriceKopecks: 100000,
			vatRate: 0,
			batchNumber: "BAD-LOT",
			expirationDate: "2020-01-01",
		});
		const draft = {
			...sample,
			items: [...sample.items, expiredItem],
		};

		const validation = validateWaybillDraft(draft);
		assert.equal(validation.isValid, false);
		assert.ok(validation.errors.some((e) => e.includes("истек") || e.includes("просрочен")));
	});

	it("предупреждает о критических остаточных сроках годности", () => {
		const sample = createSampleDentalWaybill();
		const draft = {
			...sample,
			items: [
				createWaybillItem({
					name: "Критичный бонд",
					category: "Адгезивы",
					unit: "фл",
					quantity: 2,
					unitPriceKopecks: 200000,
					vatRate: 0,
					batchNumber: "CRIT-LOT-01",
					expirationDate: new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10),
				}),
			],
		};

		const validation = validateWaybillDraft(draft);
		assert.equal(validation.isValid, true);
		assert.ok(validation.warnings.some((w) => w.includes("критический") || w.includes("приоритетное")));
	});

	it("успешно валидирует корректный образец накладной", () => {
		const sample = createSampleDentalWaybill();
		const validation = validateWaybillDraft(sample);
		assert.equal(validation.isValid, true);
		assert.equal(validation.errors.length, 0);
	});
});
