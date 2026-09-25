/**
 * wave134AutoVisitBomEngine.test.ts — Unit tests for Auto-Visit BOM & Class B Waste Engine.
 *
 * Validates:
 * - Mandate 8v: "No-Nurse-Clicking" & Background Automation.
 * - Mandate 8k: Integer kopeck exactness.
 * - Mandate 8s: Soft Overdraft (Warehouse shortage never blocks patient care).
 * - Mandate 8d: 100% absence of cartoon emojis.
 * - Class B medical waste recognition & SanPiN 2.1.3684-21 weight calculation.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CLASS_B_WEIGHT_ESTIMATES,
	calculateClassBWasteWeightKg,
	processConsumablesStockDeduction,
} from "../treatmentConsumablesEngine.js";
import {
	autoVisitBomDeductionInputSchema,
	autoVisitBomDeductionResultSchema,
	calculateAutoVisitConsumables,
	calculateClassBWasteFromItems,
	executeAutoVisitBomDeduction,
} from "../autoVisitBomEngine.js";

describe("Wave 134: Auto-Visit BOM & Class B Medical Waste Engine", () => {
	describe("1. Class B Waste Recognition & Weight Calculation (SanPiN 2.1.3684-21)", () => {
		it("correctly calculates Class B waste weights using SSOT constants", () => {
			const carpules = 3;
			const sharps = 4;
			const contaminated = 2;

			const expectedCarpules = carpules * CLASS_B_WEIGHT_ESTIMATES.carpuleGlassKg; // 3 * 0.005 = 0.015
			const expectedSharps = sharps * CLASS_B_WEIGHT_ESTIMATES.sharpsNeedleKg; // 4 * 0.002 = 0.008
			const expectedContaminated = contaminated * CLASS_B_WEIGHT_ESTIMATES.contaminatedPpeKg; // 2 * 0.015 = 0.030, min 0.05 => 0.05
			const expectedTotalKg = 0.073;

			const weight = calculateClassBWasteWeightKg(carpules, sharps, contaminated);
			assert.strictEqual(weight, expectedTotalKg);
		});

		it("classifies carpules, needles, blades, and PPE into appropriate waste items", () => {
			const deductedItems = [
				{ itemName: "Анестетик Артикаин 1.7 мл", category: "anesthetic", unit: "карпула", deductedQty: 2 },
				{ itemName: "Игла карпульная 30G короткая", category: "other", unit: "шт.", deductedQty: 2 },
				{ itemName: "Перчатки смотровые нитриловые", category: "other", unit: "пара", deductedQty: 1 },
			];

			const summary = calculateClassBWasteFromItems(deductedItems, new Date("2026-09-25T12:00:00Z"));
			assert.strictEqual(summary.carpulesCount, 2);
			assert.strictEqual(summary.sharpsCount, 2);
			assert.strictEqual(summary.contaminatedItemsCount, 1);
			assert.strictEqual(summary.totalUnits, 5);
			assert.strictEqual(summary.wasteClass, "class_B");
			assert.strictEqual(summary.packagingRecommended, "yellow_container_sharps");
			assert.strictEqual(summary.singlePersonApproval, true);
			assert.ok(summary.estimatedWeightKg > 0);
			assert.ok(summary.sealNumber.startsWith("ПЛ-Б-2026-"));
			assert.ok(summary.barcode.startsWith("WASTE-CLASS_B-DENT-20260925-"));
		});
	});

	describe("2. Canonical BOM Resolver (calculateAutoVisitConsumables)", () => {
		it("includes standard PPE (B01.065.001) by default", () => {
			const services = [
				{ serviceCode: "A16.07.002.010", serviceTitle: "Восстановление зуба пломбой", quantity: 1, toothNumber: 16 },
			];

			const planned = calculateAutoVisitConsumables(services);
			assert.ok(planned.length > 0);
			const hasPpe = planned.some((p) => p.service804nCode === "B01.065.001");
			assert.strictEqual(hasPpe, true, "Standard PPE must be included automatically");
		});

		it("respects includeStandardPpe = false option", () => {
			const services = [
				{ serviceCode: "A16.07.002.010", serviceTitle: "Восстановление зуба пломбой", quantity: 1, toothNumber: 16 },
			];

			const planned = calculateAutoVisitConsumables(services, { includeStandardPpe: false });
			const hasPpe = planned.some((p) => p.service804nCode === "B01.065.001");
			assert.strictEqual(hasPpe, false, "PPE should not be included when explicitly disabled");
		});

		it("prefers custom links over statutory default links", () => {
			const services = [
				{ serviceCode: "A16.07.002.010", serviceTitle: "Восстановление зуба пломбой", quantity: 1, toothNumber: 26 },
			];
			const customLinks = [
				{
					id: "custom-link-1",
					service804nCode: "A16.07.002.010",
					serviceTitle: "Кастомная пломба",
					inventoryItemId: "custom-comp-01",
					itemName: "Кастомный премиум композит",
					category: "composite" as const,
					unit: "dose" as const,
					quantityPerService: 2,
					isMandatory: true,
					costPriceKopecks: 120000,
					notes: "Кастомный рецепт",
				},
			];

			const planned = calculateAutoVisitConsumables(services, {
				customLinks,
				includeStandardPpe: false,
			});

			assert.strictEqual(planned.length, 1);
			assert.strictEqual(planned[0]?.inventoryItemId, "custom-comp-01");
			assert.strictEqual(planned[0]?.requiredQuantity, 2);
			assert.strictEqual(planned[0]?.totalCostPriceKopecks, 240000);
		});
	});

	describe("3. Background Deduction Execution & Soft Overdraft", () => {
		it("executes deduction with soft overdraft when inventory is insufficient (Mandate 8e/8n/8s)", () => {
			const result = executeAutoVisitBomDeduction({
				visitId: "visit-101",
				patientId: "pat-202",
				doctorId: "doc-303",
				renderedServices: [
					{ serviceCode: "A16.07.002.010", serviceTitle: "Восстановление зуба", quantity: 1, toothNumber: 36 },
				],
				currentStockMap: {
					// empty stock => all deducted items trigger soft overdraft
				},
				allowOverdraft: true,
			});

			assert.strictEqual(result.visitId, "visit-101");
			assert.strictEqual(result.hasOverdraft, true);
			assert.ok(result.softOverdrafts.length > 0);
			assert.ok(result.totalCostPriceKopecks > 0);
			assert.ok(result.items.some((it) => it.isOverdraft));
			assert.ok(result.softOverdrafts[0]?.includes("Мандат 8e/8n: Мягкий овердрафт"));
			assert.ok(result.softOverdrafts[0]?.includes("Лечение не блокируется"));
			assert.strictEqual(result.classBWaste.wasteClass, "class_B");
			assert.ok(result.statutoryActText.includes("АКТ СПИСАНИЯ РАСХОДНЫХ МАТЕРИАЛОВ"));
		});

		it("throws an explicit error when allowOverdraft is false and stock is insufficient", () => {
			assert.throws(
				() =>
					executeAutoVisitBomDeduction({
						visitId: "visit-102",
						patientId: "pat-202",
						doctorId: "doc-303",
						renderedServices: [
							{ serviceCode: "A16.07.002.010", quantity: 1 },
						],
						currentStockMap: {},
						allowOverdraft: false,
					}),
				/Складской дефицит: недостаточно остатка/i,
			);
		});
	});

	describe("4. Statutory A4 Output & Mandate 8d Zero Emojis", () => {
		it("proves 100% absence of cartoon emojis in generated statutory text", () => {
			const result = executeAutoVisitBomDeduction({
				visitId: "visit-103",
				patientId: "pat-202",
				doctorId: "doc-303",
				patientFullName: "Иванов Иван Иванович",
				doctorFullName: "Петров Петр Сергеевич",
				visitDate: "2026-09-25",
				renderedServices: [
					{ serviceCode: "A16.07.002.010", quantity: 1, toothNumber: 46 },
				],
				currentStockMap: {
					"inv-art-100": 10,
					"inv-comp-filtek": 5,
					"inv-gloves-m": 100,
				},
				allowOverdraft: true,
			});

			const text = result.statutoryActText;
			// Cartoon emojis test
			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
			assert.strictEqual(
				emojiRegex.test(text),
				false,
				"Statutory Form 043/u text must contain 0 cartoon emojis per Mandate 8d",
			);
			assert.ok(text.includes("МИНИСТЕРСТВО ЗДРАВООХРАНЕНИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ"));
			assert.ok(text.includes("МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО БОЛЬНОГО: ФОРМА N 043/У"));
		});
	});

	describe("5. Zod Schemas Validation", () => {
		it("validates autoVisitBomDeductionInputSchema and autoVisitBomDeductionResultSchema", () => {
			const rawInput = {
				visitId: "v-1",
				patientId: "p-1",
				doctorId: "d-1",
				renderedServices: [{ serviceCode: "A16.07.002.010" }],
			};

			const parsedInput = autoVisitBomDeductionInputSchema.parse(rawInput);
			assert.strictEqual(parsedInput.visitId, "v-1");
			assert.strictEqual(parsedInput.allowOverdraft, true);
			assert.strictEqual(parsedInput.includeStandardPpe, true);

			const result = executeAutoVisitBomDeduction(parsedInput);
			const parsedResult = autoVisitBomDeductionResultSchema.parse(result);
			assert.strictEqual(parsedResult.visitId, "v-1");
			assert.strictEqual(parsedResult.classBWaste.wasteClass, "class_B");
		});
	});
});
