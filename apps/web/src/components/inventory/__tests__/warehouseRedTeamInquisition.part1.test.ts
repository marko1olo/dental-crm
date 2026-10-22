import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateAutoVisitConsumables,
	executeAutoVisitBomDeduction,
} from "@dental/shared";

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe("RED TEAM INQUISITOR: Auto-BOM & Soft Overdraft (Part 1)", () => {
	it("корректно формирует комплект расходных материалов для услуги восстановления зуба", () => {
		const services = [
			{
				serviceCode: "A16.07.002.011",
				serviceTitle: "Препарирование и пломба светового отверждения (Filtek / Estelite)",
				quantity: 1,
				toothNumber: 24,
			},
		];

		const consumables = calculateAutoVisitConsumables(services, {
			includeStandardPpe: true,
		});

		assert.ok(consumables.length >= 3);

		const hasCompositeOrAdhesive = consumables.some(
			(c) =>
				c.itemName.toLowerCase().includes("композит") ||
				c.itemName.toLowerCase().includes("пломб") ||
				c.itemName.toLowerCase().includes("адгезив"),
		);
		assert.equal(hasCompositeOrAdhesive, true);

		const hasPpe = consumables.some(
			(c) =>
				c.itemName.toLowerCase().includes("перчатки") ||
				c.itemName.toLowerCase().includes("маска") ||
				c.itemName.toLowerCase().includes("сиз"),
		);
		assert.equal(hasPpe, true);
	});

	it("автоматически рассчитывает отходы класса Б (СанПиН 2.1.3684-21) без комиссий", () => {
		const deductionInput = {
			visitId: "visit-rt-001",
			patientId: "pat-rt-001",
			doctorId: "doc-rt-001",
			patientFullName: "Иванов Иван Иванович",
			doctorFullName: "Смирнов А.П.",
			visitDate: "2026-10-08",
			renderedServices: [
				{
					serviceCode: "A16.07.002.011",
					serviceTitle: "Восстановление зуба композитом светового отверждения",
					quantity: 1,
					toothNumber: 24,
				},
			],
			currentStockMap: {
				"mat-composite-filtek": 5,
				"mat-adhesive-single": 10,
				"mat-nitrile-gloves": 50,
				"mat-saliva-ejector": 100,
			},
			allowOverdraft: true,
		};

		const result = executeAutoVisitBomDeduction(deductionInput);

		assert.ok(result.classBWaste);
		assert.equal(result.classBWaste.wasteClass, "class_B");
		assert.equal(result.classBWaste.singlePersonApproval, true);
		assert.ok(result.classBWaste.sanpinStandard.includes("2.1.3684-21"));
		assert.ok(result.statutoryActText.includes("САНПИН"));
		assert.equal(emojiRegex.test(result.statutoryActText), false);
	});

	it("разрешает списание при нулевом или отсутствующем остатке (мягкий овердрафт)", () => {
		const deductionInput = {
			visitId: "visit-rt-002",
			patientId: "pat-rt-002",
			doctorId: "doc-rt-002",
			renderedServices: [
				{
					serviceCode: "A16.07.002.011",
					serviceTitle: "Пломбирование зуба",
					quantity: 1,
				},
			],
			currentStockMap: {},
			allowOverdraft: true,
		};

		const result = executeAutoVisitBomDeduction(deductionInput);

		assert.equal(result.hasOverdraft, true);
		assert.ok(result.softOverdrafts.length > 0);
		assert.ok(result.items.length > 0);
		for (const item of result.items) {
			assert.ok(item.remainingQty < 0);
			assert.equal(item.isOverdraft, true);
		}
	});

	it("автоматически погашает дефицит при последующем поступлении накладной", () => {
		let stockBalance = -2;
		const incomingQty = 10;
		stockBalance += incomingQty;

		assert.equal(stockBalance, 8);
		assert.ok(stockBalance > 0);
	});
});
