/**
 * wave122TreatmentConsumables.test.ts — Treatment Consumables Auto-Deduction Engine Tests.
 *
 * Wave 122 — Bill of Materials (BOM) & Treatment Consumables Consumption Engine.
 *
 * Test coverage:
 * - Test 1: Standard consumable deduction for dental filling (1 carpal anesthetic, 1 compule composite, 1 microbrush);
 * - Test 2: Multiplication by service quantity (serviceQuantity = 2);
 * - Test 3: Soft overdraft (stock goes negative with hasOverdraft: true, non-blocking per Mandate 8e/8n);
 * - Test 4: Strict overdraft ban when allowOverdraft: false;
 * - Test 5: Batch calculation across multiple services of a visit with cumulative stock recalculation;
 * - Test 6: Service without linked consumables returns empty items: [];
 * - Test 7: Receipt formatting and 100% absence of cartoon emojis (Mandate 8d);
 * - Test 8: Fractional quantities handling (0.5 карпулы, 1.5 порции) and rounding accuracy;
 * - Test 9: Zod runtime schema validation for links, events, and deduction results.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type ConsumableDeductionItem,
	type TreatmentConsumableLink,
	type TreatmentDeductionResult,
	type TreatmentPerformedEvent,
	calculateBatchTreatmentConsumables,
	calculateConsumablesForTreatment,
	consumableDeductionItemSchema,
	formatConsumablesDeductionReceipt,
	formatQuantityRu,
	roundQuantity,
	treatmentConsumableLinkSchema,
	treatmentDeductionResultSchema,
	treatmentPerformedEventSchema,
} from "../treatmentConsumablesEngine.js";

// ─── FIXTURES & TEST DATA ─────────────────────────────────────────────────────

const FILLING_SERVICE_ID = "srv-caries-filling-01";
const ANESTHESIA_SERVICE_ID = "srv-anesthesia-01";
const CONSULTATION_SERVICE_ID = "srv-consultation-01";

const sampleFillingLinks: TreatmentConsumableLink[] = [
	{
		id: "link-001",
		catalogItemId: FILLING_SERVICE_ID,
		catalogItemName: "A16.07.002.010 Восстановление зуба пломбой (лечение кариеса)",
		inventoryItemId: "mat-anes-01",
		inventoryItemName: "Анестетик Артикаин с адреналином 1:100 000 1.7 мл",
		unit: "карпула",
		quantityPerService: 1.0,
		note: "Местная инфильтрационная анестезия",
	},
	{
		id: "link-002",
		catalogItemId: FILLING_SERVICE_ID,
		catalogItemName: "A16.07.002.010 Восстановление зуба пломбой (лечение кариеса)",
		inventoryItemId: "mat-comp-01",
		inventoryItemName: "Композит светового отверждения Filtek Ultimate A2",
		unit: "порция",
		quantityPerService: 1.0,
		note: "1 компьюла на пломбу",
	},
	{
		id: "link-003",
		catalogItemId: FILLING_SERVICE_ID,
		catalogItemName: "A16.07.002.010 Восстановление зуба пломбой (лечение кариеса)",
		inventoryItemId: "mat-brush-01",
		inventoryItemName: "Аппликаторы стоматологические Microbrush",
		unit: "шт",
		quantityPerService: 1.0,
		note: "Нанесение адгезивной системы",
	},
];

const sampleAnesthesiaLinks: TreatmentConsumableLink[] = [
	{
		id: "link-004",
		catalogItemId: ANESTHESIA_SERVICE_ID,
		catalogItemName: "A11.07.012 Проводниковая / инфильтрационная анестезия",
		inventoryItemId: "mat-anes-01",
		inventoryItemName: "Анестетик Артикаин с адреналином 1:100 000 1.7 мл",
		unit: "карпула",
		quantityPerService: 1.0,
	},
	{
		id: "link-005",
		catalogItemId: ANESTHESIA_SERVICE_ID,
		catalogItemName: "A11.07.012 Проводниковая / инфильтрационная анестезия",
		inventoryItemId: "mat-needle-01",
		inventoryItemName: "Иглы карпульные стоматологические 0.3x21 мм",
		unit: "шт",
		quantityPerService: 1.0,
	},
];

const allSampleLinks: TreatmentConsumableLink[] = [
	...sampleFillingLinks,
	...sampleAnesthesiaLinks,
];

// ─── TEST SUITE ───────────────────────────────────────────────────────────────

describe("Wave 122: Treatment Consumables Consumption Engine", () => {
	it("Test 1: Standard consumable deduction for a dental filling (1 carpal anesthetic, 1 compule composite, 1 microbrush)", () => {
		const currentStocks: Record<string, number> = {
			"mat-anes-01": 50,
			"mat-comp-01": 20,
			"mat-brush-01": 200,
		};

		const event: TreatmentPerformedEvent = {
			treatmentReferenceId: "visit-act-001",
			catalogItemId: FILLING_SERVICE_ID,
			serviceQuantity: 1,
			performedAt: "2026-09-11T10:30:00.000Z",
			doctorId: "doc-barabash-01",
			patientId: "pat-smirnova-01",
		};

		const result = calculateConsumablesForTreatment(event, sampleFillingLinks, currentStocks);

		assert.strictEqual(result.treatmentReferenceId, "visit-act-001");
		assert.strictEqual(result.catalogItemId, FILLING_SERVICE_ID);
		assert.strictEqual(result.hasOverdraft, false);
		assert.strictEqual(result.items.length, 3);

		// 1 carpal anesthetic
		const anes = result.items.find((i) => i.inventoryItemId === "mat-anes-01");
		assert.ok(anes, "Anesthetic line item must exist");
		assert.strictEqual(anes.deductedQuantity, 1.0);
		assert.strictEqual(anes.currentStock, 50);
		assert.strictEqual(anes.resultingStock, 49);
		assert.strictEqual(anes.isOverdraft, false);

		// 1 compule composite
		const comp = result.items.find((i) => i.inventoryItemId === "mat-comp-01");
		assert.ok(comp, "Composite line item must exist");
		assert.strictEqual(comp.deductedQuantity, 1.0);
		assert.strictEqual(comp.currentStock, 20);
		assert.strictEqual(comp.resultingStock, 19);
		assert.strictEqual(comp.isOverdraft, false);

		// 1 microbrush
		const brush = result.items.find((i) => i.inventoryItemId === "mat-brush-01");
		assert.ok(brush, "Microbrush line item must exist");
		assert.strictEqual(brush.deductedQuantity, 1.0);
		assert.strictEqual(brush.currentStock, 200);
		assert.strictEqual(brush.resultingStock, 199);
		assert.strictEqual(brush.isOverdraft, false);
	});

	it("Test 2: Multiplication by service quantity (serviceQuantity = 2)", () => {
		const currentStocks: Record<string, number> = {
			"mat-anes-01": 50,
			"mat-comp-01": 20,
			"mat-brush-01": 200,
		};

		const event: TreatmentPerformedEvent = {
			treatmentReferenceId: "visit-act-002",
			catalogItemId: FILLING_SERVICE_ID,
			serviceQuantity: 2,
			performedAt: "2026-09-11T12:00:00.000Z",
		};

		const result = calculateConsumablesForTreatment(event, sampleFillingLinks, currentStocks);

		assert.strictEqual(result.hasOverdraft, false);
		assert.strictEqual(result.items.length, 3);

		// Deductions must be doubled (1.0 * 2 = 2.0)
		const anes = result.items.find((i) => i.inventoryItemId === "mat-anes-01");
		assert.strictEqual(anes?.deductedQuantity, 2.0);
		assert.strictEqual(anes?.resultingStock, 48);

		const comp = result.items.find((i) => i.inventoryItemId === "mat-comp-01");
		assert.strictEqual(comp?.deductedQuantity, 2.0);
		assert.strictEqual(comp?.resultingStock, 18);

		const brush = result.items.find((i) => i.inventoryItemId === "mat-brush-01");
		assert.strictEqual(brush?.deductedQuantity, 2.0);
		assert.strictEqual(brush?.resultingStock, 198);
	});

	it("Test 3: Soft overdraft (stock goes negative with hasOverdraft: true, non-blocking per Mandate 8e/8n)", () => {
		// Clinic warehouse has only 1 carpal left, 0 composite, and plenty of microbrushes
		const deficitStocks: Record<string, number> = {
			"mat-anes-01": 1,
			"mat-comp-01": 0,
			"mat-brush-01": 100,
		};

		const event: TreatmentPerformedEvent = {
			treatmentReferenceId: "visit-act-003",
			catalogItemId: FILLING_SERVICE_ID,
			serviceQuantity: 2, // requires 2 carpals, 2 compules, 2 microbrushes
			performedAt: "2026-09-11T14:15:00.000Z",
		};

		// Default allowOverdraft = true
		const result = calculateConsumablesForTreatment(event, sampleFillingLinks, deficitStocks, true);

		assert.strictEqual(result.hasOverdraft, true, "Result must flag hasOverdraft: true");

		// Anesthetic: 1 - 2 = -1 (overdraft)
		const anes = result.items.find((i) => i.inventoryItemId === "mat-anes-01");
		assert.strictEqual(anes?.currentStock, 1);
		assert.strictEqual(anes?.deductedQuantity, 2);
		assert.strictEqual(anes?.resultingStock, -1);
		assert.strictEqual(anes?.isOverdraft, true);

		// Composite: 0 - 2 = -2 (overdraft)
		const comp = result.items.find((i) => i.inventoryItemId === "mat-comp-01");
		assert.strictEqual(comp?.currentStock, 0);
		assert.strictEqual(comp?.deductedQuantity, 2);
		assert.strictEqual(comp?.resultingStock, -2);
		assert.strictEqual(comp?.isOverdraft, true);

		// Microbrush: 100 - 2 = 98 (sufficient, no overdraft)
		const brush = result.items.find((i) => i.inventoryItemId === "mat-brush-01");
		assert.strictEqual(brush?.currentStock, 100);
		assert.strictEqual(brush?.deductedQuantity, 2);
		assert.strictEqual(brush?.resultingStock, 98);
		assert.strictEqual(brush?.isOverdraft, false);
	});

	it("Test 4: Strict overdraft ban when allowOverdraft: false", () => {
		const deficitStocks: Record<string, number> = {
			"mat-anes-01": 1,
			"mat-comp-01": 0,
			"mat-brush-01": 100,
		};

		const event: TreatmentPerformedEvent = {
			treatmentReferenceId: "visit-act-004",
			catalogItemId: FILLING_SERVICE_ID,
			serviceQuantity: 2,
			performedAt: "2026-09-11T15:00:00.000Z",
		};

		// Must throw error when allowOverdraft is false
		assert.throws(
			() => calculateConsumablesForTreatment(event, sampleFillingLinks, deficitStocks, false),
			(err: unknown) => {
				assert.ok(err instanceof Error, "Should throw an Error instance");
				assert.match(
					err.message,
					/недостаточно остатка на складе/i,
					"Error message must specify warehouse shortage",
				);
				return true;
			},
		);
	});

	it("Test 5: Batch calculation across multiple services of a visit with cumulative stock recalculation", () => {
		const initialStocks: Record<string, number> = {
			"mat-anes-01": 2, // exactly 2 carpals in stock
			"mat-needle-01": 10,
			"mat-comp-01": 5,
			"mat-brush-01": 20,
		};

		const events: TreatmentPerformedEvent[] = [
			// Event 1: Infiltration anesthesia (uses 1 carpal + 1 needle)
			{
				treatmentReferenceId: "visit-005-ev1",
				catalogItemId: ANESTHESIA_SERVICE_ID,
				serviceQuantity: 1,
				performedAt: "2026-09-11T16:00:00.000Z",
			},
			// Event 2: Tooth restoration (uses 1 carpal + 1 composite + 1 brush)
			{
				treatmentReferenceId: "visit-005-ev2",
				catalogItemId: FILLING_SERVICE_ID,
				serviceQuantity: 1,
				performedAt: "2026-09-11T16:15:00.000Z",
			},
		];

		const batchResult = calculateBatchTreatmentConsumables(
			events,
			allSampleLinks,
			initialStocks,
			true,
		);

		assert.strictEqual(batchResult.results.length, 2);

		// Event 1 checks
		const res1 = batchResult.results[0];
		assert.strictEqual(res1.treatmentReferenceId, "visit-005-ev1");
		const anes1 = res1.items.find((i) => i.inventoryItemId === "mat-anes-01");
		assert.strictEqual(anes1?.currentStock, 2);
		assert.strictEqual(anes1?.resultingStock, 1);
		assert.strictEqual(anes1?.isOverdraft, false);

		// Event 2 checks (cumulative: stock was 1 after event 1, becomes 0)
		const res2 = batchResult.results[1];
		assert.strictEqual(res2.treatmentReferenceId, "visit-005-ev2");
		const anes2 = res2.items.find((i) => i.inventoryItemId === "mat-anes-01");
		assert.strictEqual(anes2?.currentStock, 1, "Must see updated stock from event 1");
		assert.strictEqual(anes2?.resultingStock, 0, "Deduction leaves 0");
		assert.strictEqual(anes2?.isOverdraft, false);

		// Cumulative final stocks
		assert.strictEqual(batchResult.finalStocks["mat-anes-01"], 0);
		assert.strictEqual(batchResult.finalStocks["mat-needle-01"], 9);
		assert.strictEqual(batchResult.finalStocks["mat-comp-01"], 4);
		assert.strictEqual(batchResult.finalStocks["mat-brush-01"], 19);

		// Total deducted quantities by item
		assert.strictEqual(batchResult.totalDeductedByItem["mat-anes-01"], 2);
		assert.strictEqual(batchResult.totalDeductedByItem["mat-needle-01"], 1);
		assert.strictEqual(batchResult.totalDeductedByItem["mat-comp-01"], 1);
		assert.strictEqual(batchResult.totalDeductedByItem["mat-brush-01"], 1);
	});

	it("Test 6: Service without linked consumables returns empty items: []", () => {
		const currentStocks: Record<string, number> = {
			"mat-anes-01": 10,
			"mat-comp-01": 10,
		};

		const event: TreatmentPerformedEvent = {
			treatmentReferenceId: "visit-act-006",
			catalogItemId: CONSULTATION_SERVICE_ID, // Consultation has no materials linked
			serviceQuantity: 1,
			performedAt: "2026-09-11T17:00:00.000Z",
		};

		const result = calculateConsumablesForTreatment(event, allSampleLinks, currentStocks);

		assert.strictEqual(result.treatmentReferenceId, "visit-act-006");
		assert.strictEqual(result.catalogItemId, CONSULTATION_SERVICE_ID);
		assert.deepStrictEqual(result.items, []);
		assert.strictEqual(result.hasOverdraft, false);
	});

	it("Test 7: Receipt formatting and 100% absence of cartoon emojis (Mandate 8d)", () => {
		const currentStocks: Record<string, number> = {
			"mat-anes-01": 10,
			"mat-comp-01": 5,
			"mat-brush-01": 30,
		};

		const event: TreatmentPerformedEvent = {
			treatmentReferenceId: "REF-20260911-043U",
			catalogItemId: FILLING_SERVICE_ID,
			serviceQuantity: 1,
			performedAt: "2026-09-11T17:30:00.000Z",
		};

		const result = calculateConsumablesForTreatment(event, sampleFillingLinks, currentStocks);
		const receipt = formatConsumablesDeductionReceipt(
			result,
			"Д-р Барабаш С.В.",
			"Смирнова Е.А.",
		);

		// Must contain required document attributes
		assert.ok(receipt.includes("АКТ АВТОМАТИЧЕСКОГО СПИСАНИЯ РАСХОДНЫХ МАТЕРИАЛОВ"));
		assert.ok(receipt.includes("REF-20260911-043U"));
		assert.ok(receipt.includes(FILLING_SERVICE_ID));
		assert.ok(receipt.includes("Д-р Барабаш С.В."));
		assert.ok(receipt.includes("Смирнова Е.А."));
		assert.ok(receipt.includes("Анестетик Артикаин"));
		assert.ok(receipt.includes("Композит светового"));
		assert.ok(receipt.includes("Microbrush"));
		assert.ok(receipt.includes("[НОРМА]"));
		assert.ok(receipt.includes("ОТВЕТСТВЕННЫЕ ЛИЦА"));

		// Strict Mandate 8d check: ZERO cartoon emojis
		const emojiPattern =
			/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}]/u;

		assert.strictEqual(
			emojiPattern.test(receipt),
			false,
			"Warehouse deduction receipt must contain zero cartoon emojis",
		);
	});

	it("Test 8: Fractional quantities handling (0.5 карпулы, 1.5 порции) and rounding accuracy", () => {
		const fractionalLinks: TreatmentConsumableLink[] = [
			{
				id: "link-frac-01",
				catalogItemId: "srv-pediatric-01",
				inventoryItemId: "mat-anes-01",
				inventoryItemName: "Анестетик детский 1.7 мл",
				unit: "карпула",
				quantityPerService: 0.5, // half a carpal for child
			},
			{
				id: "link-frac-02",
				catalogItemId: "srv-pediatric-01",
				inventoryItemId: "mat-fluor-01",
				inventoryItemName: "Фторлак Belak-F",
				unit: "мл",
				quantityPerService: 0.25,
			},
		];

		const stocks: Record<string, number> = {
			"mat-anes-01": 5.0,
			"mat-fluor-01": 10.0,
		};

		const event: TreatmentPerformedEvent = {
			treatmentReferenceId: "pediatric-visit-01",
			catalogItemId: "srv-pediatric-01",
			serviceQuantity: 3, // 3 teeth treated
			performedAt: "2026-09-11T18:00:00.000Z",
		};

		const result = calculateConsumablesForTreatment(event, fractionalLinks, stocks);

		const anes = result.items.find((i) => i.inventoryItemId === "mat-anes-01");
		// 0.5 * 3 = 1.5; 5.0 - 1.5 = 3.5
		assert.strictEqual(anes?.deductedQuantity, 1.5);
		assert.strictEqual(anes?.resultingStock, 3.5);

		const fluor = result.items.find((i) => i.inventoryItemId === "mat-fluor-01");
		// 0.25 * 3 = 0.75; 10.0 - 0.75 = 9.25
		assert.strictEqual(fluor?.deductedQuantity, 0.75);
		assert.strictEqual(fluor?.resultingStock, 9.25);

		assert.strictEqual(formatQuantityRu(1.5, "карпула"), "1,5 карпула");
		assert.strictEqual(roundQuantity(0.1 + 0.2, 4), 0.3);
	});

	it("Test 9: Zod runtime schema validation for links, events, and deduction results", () => {
		// Valid link parses cleanly
		const validLink = treatmentConsumableLinkSchema.parse(sampleFillingLinks[0]);
		assert.strictEqual(validLink.id, "link-001");

		// Invalid link throws ZodError
		assert.throws(() => {
			treatmentConsumableLinkSchema.parse({
				id: "",
				catalogItemId: "",
				inventoryItemId: "mat-1",
				inventoryItemName: "Item",
				unit: "шт",
				quantityPerService: -5,
			});
		});

		// Valid event parses cleanly
		const validEvent = treatmentPerformedEventSchema.parse({
			treatmentReferenceId: "ref-123",
			catalogItemId: "cat-456",
			serviceQuantity: 1,
			performedAt: "2026-09-11T19:00:00.000Z",
		});
		assert.strictEqual(validEvent.serviceQuantity, 1);

		// Deduction item validation
		const validItem: ConsumableDeductionItem = {
			inventoryItemId: "mat-1",
			inventoryItemName: "Material",
			unit: "шт",
			deductedQuantity: 1,
			currentStock: 10,
			resultingStock: 9,
			isOverdraft: false,
		};
		const parsedItem = consumableDeductionItemSchema.parse(validItem);
		assert.strictEqual(parsedItem.isOverdraft, false);

		// Treatment deduction result validation
		const validResult: TreatmentDeductionResult = {
			treatmentReferenceId: "ref-123",
			catalogItemId: "cat-456",
			items: [parsedItem],
			hasOverdraft: false,
			deductionTimestamp: "2026-09-11T19:00:00.000Z",
		};
		const parsedResult = treatmentDeductionResultSchema.parse(validResult);
		assert.strictEqual(parsedResult.items.length, 1);
	});
});
