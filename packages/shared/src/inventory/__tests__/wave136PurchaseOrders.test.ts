/**
 * wave136PurchaseOrders.test.ts — Unit Tests for Procurement & Purchase Orders Engine.
 *
 * Wave 136 — Procurement Lifecycle, Delivery Receiving with Quality Verdicts & 3-Way Matching.
 * Reference: DentalPin reverse-engineering (models.py, schemas.py, service.py).
 *
 * Test Coverage:
 * 1. PO Lifecycle State Machine (draft -> sent -> confirmed -> partial -> full -> received).
 * 2. Quality Verdicts & Batch Rejections (rejected units leave line open, replacement closes PO).
 * 3. 3-Way Matching (PO vs Goods Receipt vs Invoice: exact match, price mismatch, quantity mismatch).
 * 4. Statutory Form M-7 A4 Printing & Zero-Emoji Mandate (Mandate 8d item 7).
 * 5. Exact integer kopecks arithmetic and Zod validation contracts.
 * 6. Module exports verification from inventory/index.ts and shared/index.ts.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ALLOWED_PROCUREMENT_PO_TRANSITIONS,
	RECEIVABLE_PROCUREMENT_STATUSES,
	computePurchaseOrderLineStatus,
	createPurchaseOrderRecord,
	formatMaterialReceiptActM7A4,
	procurementOrderStatusSchema,
	purchaseOrderLineSchema,
	purchaseOrderLineStatusSchema,
	purchaseOrderRecordSchema,
	purchaseOrderStatusSchema,
	purchaseReceiptLineSchema,
	purchaseReceiptSchema,
	receiptQualityVerdictSchema,
	receiveDeliveryBatch,
	transitionPurchaseOrderStatus,
	validatePurchaseOrderStatusTransition,
	validateThreeWayMatching,
	type PurchaseOrderRecord,
	type SupplierInvoiceInput,
} from "../purchaseOrdersEngine.js";

// Import from inventory index to ensure architectural re-export integrity
import * as inventoryExports from "../index.js";

describe("Wave 136 — Procurement & Purchase Orders Engine (DentalPin Adapter)", () => {
	// ─── 1. ARCHITECTURAL INTEGRITY & RE-EXPORTS ──────────────────────────────
	describe("1. Architectural Integrity & Re-exports", () => {
		it("re-exports all core schemas and functions from inventory/index.ts", () => {
			assert.ok(inventoryExports.purchaseOrderStatusSchema, "purchaseOrderStatusSchema must be exported");
			assert.ok(inventoryExports.procurementOrderStatusSchema, "procurementOrderStatusSchema must be exported");
			assert.ok(inventoryExports.receiptQualityVerdictSchema, "receiptQualityVerdictSchema must be exported");
			assert.ok(inventoryExports.purchaseOrderLineSchema, "purchaseOrderLineSchema must be exported");
			assert.ok(inventoryExports.purchaseReceiptSchema, "purchaseReceiptSchema must be exported");
			assert.ok(inventoryExports.purchaseOrderRecordSchema, "purchaseOrderRecordSchema must be exported");
			assert.ok(inventoryExports.createPurchaseOrderRecord, "createPurchaseOrderRecord must be exported");
			assert.ok(inventoryExports.receiveDeliveryBatch, "receiveDeliveryBatch must be exported");
			assert.ok(inventoryExports.validateThreeWayMatching, "validateThreeWayMatching must be exported");
			assert.ok(inventoryExports.formatMaterialReceiptActM7A4, "formatMaterialReceiptActM7A4 must be exported");
		});

		it("validates Zod schemas against compliant payloads", () => {
			const statusParsed = purchaseOrderStatusSchema.safeParse("confirmed");
			assert.strictEqual(statusParsed.success, true);

			const qualityParsed = receiptQualityVerdictSchema.safeParse("good");
			assert.strictEqual(qualityParsed.success, true);

			const qualityRejectedParsed = receiptQualityVerdictSchema.safeParse("rejected");
			assert.strictEqual(qualityRejectedParsed.success, true);

			const invalidQuality = receiptQualityVerdictSchema.safeParse("broken");
			assert.strictEqual(invalidQuality.success, false);
		});
	});

	// ─── 2. PO CREATION & STATE MACHINE ───────────────────────────────────────
	describe("2. PO Creation & State Machine", () => {
		it("creates a purchase order in draft status with exact kopecks math", () => {
			const po = createPurchaseOrderRecord({
				clinicId: "clinic-main",
				supplierId: "supp-stoma-dent",
				supplierName: 'ООО "СтомаДент Поставка"',
				notes: "Плановая закупка анестетиков и боров на сентябрь 2026",
				lines: [
					{
						id: "line-1",
						inventoryItemId: "item-articaine",
						itemName: "Артикаин ИНИБСА 1:100 000 (карпулы 50 шт)",
						quantityOrdered: 10,
						unitPriceKopecks: 450000, // 4 500,00 руб.
					},
					{
						id: "line-2",
						inventoryItemId: "item-burs-diamond",
						itemName: "Боры алмазные конусные NTI 856-016 (5 шт)",
						quantityOrdered: 5,
						unitPriceKopecks: 125000, // 1 250,00 руб.
					},
				],
			});

			assert.strictEqual(po.status, "draft");
			assert.strictEqual(po.lines.length, 2);
			// 10 * 450000 + 5 * 125000 = 4500000 + 625000 = 5125000 kopecks (51 250,00 руб)
			assert.strictEqual(po.totalAmountKopecks, 5125000);
			assert.strictEqual(po.receivedAmountKopecks, 0);
			assert.strictEqual(po.lines[0]!.status, "unfulfilled");
			assert.strictEqual(po.lines[1]!.status, "unfulfilled");

			// Validate with full Zod schema
			const validated = purchaseOrderRecordSchema.safeParse(po);
			assert.strictEqual(validated.success, true);
		});

		it("rejects duplicate inventory item IDs in lines", () => {
			assert.throws(
				() =>
					createPurchaseOrderRecord({
						clinicId: "clinic-main",
						supplierId: "supp-1",
						supplierName: "Поставщик",
						lines: [
							{
								inventoryItemId: "item-same",
								itemName: "Товар 1",
								quantityOrdered: 5,
								unitPriceKopecks: 10000,
							},
							{
								inventoryItemId: "item-same",
								itemName: "Товар 1 дубль",
								quantityOrdered: 10,
								unitPriceKopecks: 10000,
							},
						],
					}),
				/Duplicate inventoryItemId/,
			);
		});

		it("enforces statutory status transition rules", () => {
			assert.strictEqual(validatePurchaseOrderStatusTransition("draft", "sent"), true);
			assert.strictEqual(validatePurchaseOrderStatusTransition("draft", "cancelled"), true);
			assert.strictEqual(validatePurchaseOrderStatusTransition("draft", "confirmed"), false);
			assert.strictEqual(validatePurchaseOrderStatusTransition("draft", "received"), false);

			assert.strictEqual(validatePurchaseOrderStatusTransition("sent", "confirmed"), true);
			assert.strictEqual(validatePurchaseOrderStatusTransition("sent", "draft"), true);
			assert.strictEqual(validatePurchaseOrderStatusTransition("sent", "cancelled"), true);

			assert.strictEqual(validatePurchaseOrderStatusTransition("confirmed", "cancelled"), true);
			assert.strictEqual(validatePurchaseOrderStatusTransition("confirmed", "draft"), false);

			// Terminal states
			assert.strictEqual(validatePurchaseOrderStatusTransition("received", "draft"), false);
			assert.strictEqual(validatePurchaseOrderStatusTransition("received", "sent"), false);
			assert.strictEqual(validatePurchaseOrderStatusTransition("cancelled", "draft"), false);
		});

		it("transitions status correctly via transitionPurchaseOrderStatus", () => {
			const po = createPurchaseOrderRecord({
				clinicId: "c1",
				supplierId: "s1",
				supplierName: "Поставщик",
				lines: [
					{
						inventoryItemId: "item-1",
						itemName: "Пломбировочный материал",
						quantityOrdered: 2,
						unitPriceKopecks: 300000,
					},
				],
			});

			const sentPO = transitionPurchaseOrderStatus(po, "sent");
			assert.strictEqual(sentPO.status, "sent");

			const confirmedPO = transitionPurchaseOrderStatus(sentPO, "confirmed");
			assert.strictEqual(confirmedPO.status, "confirmed");

			assert.throws(
				() => transitionPurchaseOrderStatus(confirmedPO, "draft"),
				/Status transition from "confirmed" to "draft" is not permitted/,
			);
		});
	});

	// ─── 3. DELIVERY RECEIVING & LIFECYCLE PROGRESSION ─────────────────────────
	describe("3. Delivery Receiving & Full PO Lifecycle", () => {
		it("progresses draft -> sent -> confirmed -> partial receipt -> full receipt -> received", () => {
			const po = createPurchaseOrderRecord({
				clinicId: "clinic-1",
				supplierId: "supp-1",
				supplierName: 'ООО "Дентал Маркет"',
				lines: [
					{
						id: "line-composite",
						inventoryItemId: "item-estelite",
						itemName: "Estelite Sigma Quick шприц 3.8г А2",
						quantityOrdered: 4,
						unitPriceKopecks: 320000, // 3 200,00 руб
					},
					{
						id: "line-bond",
						inventoryItemId: "item-bond-g2",
						itemName: "OptiBond FL набор",
						quantityOrdered: 2,
						unitPriceKopecks: 850000, // 8 500,00 руб
					},
				],
			});

			// 1. Attempt receiving on DRAFT throws error
			assert.throws(
				() =>
					receiveDeliveryBatch(po, {
						lines: [{ purchaseOrderLineId: "line-composite", quantityReceived: 2, quality: "good" }],
					}),
				/cannot receive deliveries. Status must be "sent" or "confirmed"/,
			);

			// 2. Advance to sent -> confirmed
			const sentPO = transitionPurchaseOrderStatus(po, "sent");
			const confirmedPO = transitionPurchaseOrderStatus(sentPO, "confirmed");
			assert.strictEqual(confirmedPO.status, "confirmed");

			// 3. Partial Delivery Batch (2 of 4 composites, 0 bonds)
			const partialResult = receiveDeliveryBatch(confirmedPO, {
				receivedBy: "nurse-anna",
				lines: [
					{
						purchaseOrderLineId: "line-composite",
						quantityReceived: 2,
						quality: "good",
					},
				],
			});

			assert.strictEqual(partialResult.fullyReceived, false);
			assert.strictEqual(partialResult.totalGoodQuantity, 2);
			assert.strictEqual(partialResult.totalRejectedQuantity, 0);
			assert.strictEqual(partialResult.updatedOrder.status, "confirmed"); // remains open
			assert.strictEqual(partialResult.updatedOrder.receipts.length, 1);

			const compositeLine = partialResult.updatedOrder.lines.find((l) => l.id === "line-composite");
			assert.strictEqual(compositeLine?.quantityReceived, 2);
			assert.strictEqual(compositeLine?.status, "partially_received");
			// 2 * 320000 = 640000 kopecks
			assert.strictEqual(partialResult.updatedOrder.receivedAmountKopecks, 640000);

			// 4. Final Delivery Batch (remaining 2 composites, and 2 bonds)
			const finalResult = receiveDeliveryBatch(partialResult.updatedOrder, {
				receivedBy: "nurse-anna",
				lines: [
					{
						purchaseOrderLineId: "line-composite",
						quantityReceived: 2,
						quality: "good",
					},
					{
						purchaseOrderLineId: "line-bond",
						quantityReceived: 2,
						quality: "good",
					},
				],
			});

			assert.strictEqual(finalResult.fullyReceived, true);
			// Auto-transition to 'received'
			assert.strictEqual(finalResult.updatedOrder.status, "received");
			assert.strictEqual(finalResult.updatedOrder.receipts.length, 2);

			const finalComposite = finalResult.updatedOrder.lines.find((l) => l.id === "line-composite");
			const finalBond = finalResult.updatedOrder.lines.find((l) => l.id === "line-bond");
			assert.strictEqual(finalComposite?.status, "fully_received");
			assert.strictEqual(finalBond?.status, "fully_received");

			// Total received amount: 4 * 320000 + 2 * 850000 = 1280000 + 1700000 = 2980000 kopecks
			assert.strictEqual(finalResult.updatedOrder.receivedAmountKopecks, 2980000);
			assert.strictEqual(finalResult.updatedOrder.totalAmountKopecks, 2980000);
		});
	});

	// ─── 4. QUALITY VERDICTS & BATCH REJECTION ────────────────────────────────
	describe("4. Quality Verdicts & Batch Rejections", () => {
		it("keeps line open when items are rejected; replacement delivery fulfills PO", () => {
			const po = createPurchaseOrderRecord({
				clinicId: "clinic-1",
				supplierId: "supp-anesthesia",
				supplierName: 'ООО "Фарма-Дент"',
				lines: [
					{
						id: "line-ultracain",
						inventoryItemId: "item-ultracain-ds",
						itemName: "Ультракаин Д-С форте 1:100 000 (упаковка 100 карпул)",
						quantityOrdered: 5, // 5 упаковок
						unitPriceKopecks: 680000,
					},
				],
			});

			const activePO = transitionPurchaseOrderStatus(
				transitionPurchaseOrderStatus(po, "sent"),
				"confirmed",
			);

			// Batch 1: Supplier delivers 5 units, but 2 packages are cracked/broken (rejected)
			const batch1Result = receiveDeliveryBatch(activePO, {
				receivedBy: "storekeeper-ivan",
				lines: [
					{
						purchaseOrderLineId: "line-ultracain",
						quantityReceived: 3,
						quality: "good",
					},
					{
						purchaseOrderLineId: "line-ultracain",
						quantityReceived: 2,
						quality: "rejected", // бой флаконов при транспортировке
					},
				],
			});

			assert.strictEqual(batch1Result.fullyReceived, false);
			assert.strictEqual(batch1Result.totalGoodQuantity, 3);
			assert.strictEqual(batch1Result.totalRejectedQuantity, 2);

			// Rejected units did NOT increase receivedQuantity
			const lineAfterBatch1 = batch1Result.updatedOrder.lines[0]!;
			assert.strictEqual(lineAfterBatch1.quantityReceived, 3);
			assert.strictEqual(lineAfterBatch1.status, "partially_received");
			assert.strictEqual(batch1Result.updatedOrder.status, "confirmed"); // still open!

			// Batch 2: Supplier sends replacement for the 2 rejected packages
			const batch2Result = receiveDeliveryBatch(batch1Result.updatedOrder, {
				receivedBy: "storekeeper-ivan",
				lines: [
					{
						purchaseOrderLineId: "line-ultracain",
						quantityReceived: 2,
						quality: "good",
					},
				],
			});

			assert.strictEqual(batch2Result.fullyReceived, true);
			assert.strictEqual(batch2Result.totalGoodQuantity, 2);
			assert.strictEqual(batch2Result.totalRejectedQuantity, 0);

			const lineAfterBatch2 = batch2Result.updatedOrder.lines[0]!;
			assert.strictEqual(lineAfterBatch2.quantityReceived, 5);
			assert.strictEqual(lineAfterBatch2.status, "fully_received");
			assert.strictEqual(batch2Result.updatedOrder.status, "received"); // now closed!
			assert.strictEqual(batch2Result.updatedOrder.receipts.length, 2);
		});

		it("prevents over-delivery unless allowOverdelivery option is enabled", () => {
			const po = createPurchaseOrderRecord({
				clinicId: "clinic-1",
				supplierId: "supp-1",
				supplierName: "Поставщик",
				lines: [
					{
						id: "line-1",
						inventoryItemId: "item-gloves",
						itemName: "Перчатки нитриловые М",
						quantityOrdered: 10,
						unitPriceKopecks: 45000,
					},
				],
			});

			const activePO = transitionPurchaseOrderStatus(
				transitionPurchaseOrderStatus(po, "sent"),
				"confirmed",
			);

			// Attempt to receive 15 units without allowOverdelivery -> throws
			assert.throws(
				() =>
					receiveDeliveryBatch(activePO, {
						lines: [{ purchaseOrderLineId: "line-1", quantityReceived: 15, quality: "good" }],
					}),
				/exceeds ordered quantity.*Overdelivery flag required/,
			);

			// With allowOverdelivery -> succeeds and marks line over_received
			const overResult = receiveDeliveryBatch(
				activePO,
				{
					lines: [{ purchaseOrderLineId: "line-1", quantityReceived: 15, quality: "good" }],
				},
				{ allowOverdelivery: true },
			);

			assert.strictEqual(overResult.updatedOrder.lines[0]!.quantityReceived, 15);
			assert.strictEqual(overResult.updatedOrder.lines[0]!.status, "over_received");
			assert.strictEqual(overResult.fullyReceived, true);
			assert.strictEqual(overResult.updatedOrder.status, "received");
		});
	});

	// ─── 5. THREE-WAY MATCHING (3-WAY MATCHING ENGINE) ─────────────────────────
	describe("5. Three-Way Matching (PO vs Goods Receipt vs Supplier Invoice)", () => {
		function buildBasePO(): PurchaseOrderRecord {
			const po = createPurchaseOrderRecord({
				id: "PO-2026-001",
				clinicId: "clinic-main",
				supplierId: "supp-stoma",
				supplierName: 'ООО "СтомаТорг"',
				lines: [
					{
						id: "line-1",
						inventoryItemId: "item-composite",
						itemName: "Filtek Z250 шприц А3",
						quantityOrdered: 10,
						unitPriceKopecks: 250000, // 2 500,00 руб
					},
					{
						id: "line-2",
						inventoryItemId: "item-etch",
						itemName: "Гель травильный 37% 5мл",
						quantityOrdered: 5,
						unitPriceKopecks: 60000, // 600,00 руб
					},
				],
			});

			const confirmed = transitionPurchaseOrderStatus(
				transitionPurchaseOrderStatus(po, "sent"),
				"confirmed",
			);

			// Receive exact ordered quantities in good condition
			const receiptResult = receiveDeliveryBatch(confirmed, {
				lines: [
					{ purchaseOrderLineId: "line-1", quantityReceived: 10, quality: "good" },
					{ purchaseOrderLineId: "line-2", quantityReceived: 5, quality: "good" },
				],
			});

			return receiptResult.updatedOrder;
		}

		it("confirms perfect 3-way match when quantities and prices match exactly", () => {
			const order = buildBasePO();

			const matchingInvoice: SupplierInvoiceInput = {
				invoiceNumber: "INV-9981",
				invoiceDate: "2026-09-12",
				supplierId: "supp-stoma",
				totalAmountKopecks: 10 * 250000 + 5 * 60000, // 2800000 kopecks (28 000,00 руб)
				lines: [
					{
						inventoryItemId: "item-composite",
						itemName: "Filtek Z250 шприц А3",
						quantityInvoiced: 10,
						unitPriceKopecks: 250000,
						totalAmountKopecks: 2500000,
					},
					{
						inventoryItemId: "item-etch",
						itemName: "Гель травильный 37% 5мл",
						quantityInvoiced: 5,
						unitPriceKopecks: 60000,
						totalAmountKopecks: 300000,
					},
				],
			};

			const match = validateThreeWayMatching(order, matchingInvoice);
			assert.strictEqual(match.isMatched, true);
			assert.strictEqual(match.verdict, "match");
			assert.strictEqual(match.discrepancies.length, 0);
			assert.strictEqual(match.summary.netVarianceKopecks, 0);
			assert.strictEqual(match.summary.totalOrderedKopecks, 2800000);
			assert.strictEqual(match.summary.totalInvoicedKopecks, 2800000);
		});

		it("detects unit price discrepancy (over-billing per item)", () => {
			const order = buildBasePO();

			const overpriceInvoice: SupplierInvoiceInput = {
				invoiceNumber: "INV-OVERPRICE",
				invoiceDate: "2026-09-12",
				supplierId: "supp-stoma",
				totalAmountKopecks: 10 * 280000 + 5 * 60000, // 3100000 kopecks (31 000,00 руб)
				lines: [
					{
						inventoryItemId: "item-composite",
						itemName: "Filtek Z250 шприц А3",
						quantityInvoiced: 10,
						unitPriceKopecks: 280000, // Supplier raised price from 2500.00 to 2800.00 руб (+300.00)
						totalAmountKopecks: 2800000,
					},
					{
						inventoryItemId: "item-etch",
						itemName: "Гель травильный 37% 5мл",
						quantityInvoiced: 5,
						unitPriceKopecks: 60000,
						totalAmountKopecks: 300000,
					},
				],
			};

			const result = validateThreeWayMatching(order, overpriceInvoice);
			assert.strictEqual(result.isMatched, false);
			assert.strictEqual(result.verdict, "price_discrepancy");
			assert.strictEqual(result.discrepancies.length, 1);

			const disc = result.discrepancies[0]!;
			assert.strictEqual(disc.discrepancyType, "price_mismatch");
			assert.strictEqual(disc.expectedValue, 250000);
			assert.strictEqual(disc.actualValue, 280000);
			assert.strictEqual(disc.difference, 30000); // 300,00 руб discrepancy
			assert.strictEqual(result.summary.netVarianceKopecks, 300000); // 3 000,00 руб total variance
		});

		it("detects quantity discrepancy (billed for more than received)", () => {
			const order = buildBasePO();

			const overbilledQuantityInvoice: SupplierInvoiceInput = {
				invoiceNumber: "INV-OVERQTY",
				invoiceDate: "2026-09-12",
				supplierId: "supp-stoma",
				totalAmountKopecks: 12 * 250000 + 5 * 60000, // 3300000 kopecks
				lines: [
					{
						inventoryItemId: "item-composite",
						itemName: "Filtek Z250 шприц А3",
						quantityInvoiced: 12, // Billed 12 units, but warehouse only received 10!
						unitPriceKopecks: 250000,
						totalAmountKopecks: 3000000,
					},
					{
						inventoryItemId: "item-etch",
						itemName: "Гель травильный 37% 5мл",
						quantityInvoiced: 5,
						unitPriceKopecks: 60000,
						totalAmountKopecks: 300000,
					},
				],
			};

			const result = validateThreeWayMatching(order, overbilledQuantityInvoice);
			assert.strictEqual(result.isMatched, false);
			assert.strictEqual(result.verdict, "quantity_discrepancy");
			assert.strictEqual(result.discrepancies.length, 1);

			const disc = result.discrepancies[0]!;
			assert.strictEqual(disc.discrepancyType, "quantity_mismatch");
			assert.strictEqual(disc.expectedValue, 10);
			assert.strictEqual(disc.actualValue, 12);
			assert.strictEqual(disc.difference, 2);
		});

		it("detects unbilled item (goods received on warehouse but omitted from invoice)", () => {
			const order = buildBasePO();

			const incompleteInvoice: SupplierInvoiceInput = {
				invoiceNumber: "INV-PARTIAL",
				invoiceDate: "2026-09-12",
				supplierId: "supp-stoma",
				totalAmountKopecks: 10 * 250000, // missing the etch item
				lines: [
					{
						inventoryItemId: "item-composite",
						quantityInvoiced: 10,
						unitPriceKopecks: 250000,
					},
				],
			};

			const result = validateThreeWayMatching(order, incompleteInvoice);
			assert.strictEqual(result.isMatched, false);
			assert.strictEqual(result.verdict, "unmatched_items");
			assert.strictEqual(result.discrepancies.some((d) => d.discrepancyType === "missing_in_receipt"), true);
		});

		it("honors tolerance thresholds when small price fluctuations are accepted", () => {
			const order = buildBasePO();

			// 1% price fluctuation (ordered at 2500.00 руб, invoice at 2520.00 руб = +0.8%)
			const slightlyHigherInvoice: SupplierInvoiceInput = {
				invoiceNumber: "INV-TOLERANCE",
				invoiceDate: "2026-09-12",
				supplierId: "supp-stoma",
				totalAmountKopecks: 10 * 252000 + 5 * 60000,
				lines: [
					{
						inventoryItemId: "item-composite",
						quantityInvoiced: 10,
						unitPriceKopecks: 252000, // 2 520,00 руб
					},
					{
						inventoryItemId: "item-etch",
						quantityInvoiced: 5,
						unitPriceKopecks: 60000,
					},
				],
			};

			// Strict 0% tolerance flags price mismatch
			const strictResult = validateThreeWayMatching(order, slightlyHigherInvoice);
			assert.strictEqual(strictResult.isMatched, false);

			// 2% price tolerance permits the line variance
			const tolerantResult = validateThreeWayMatching(order, slightlyHigherInvoice, {
				priceTolerancePercent: 2,
			});
			// Discrepancies array is empty because it fits tolerance
			assert.strictEqual(tolerantResult.discrepancies.length, 0);
		});
	});

	// ─── 6. STATUTORY FORM M-7 A4 PRINTING & ZERO-EMOJI MANDATE ──────────────
	describe("6. Statutory Form M-7 A4 Printing (Mandate 8d Item 7)", () => {
		it("generates a clean statutory Form M-7 document with complete table and signatures", () => {
			const po = createPurchaseOrderRecord({
				id: "PO-2026-042",
				clinicId: "clinic-main",
				supplierId: "supp-ross",
				supplierName: 'АО "РосДентХим"',
				expectedDate: "2026-09-15",
				lines: [
					{
						id: "line-1",
						inventoryItemId: "item-septanest",
						itemName: "Септанест с адреналином 1:100 000 (50 карпул)",
						quantityOrdered: 20,
						unitPriceKopecks: 410000,
					},
					{
						id: "line-2",
						inventoryItemId: "item-needles",
						itemName: "Иглы карпульные 30G короткие 0.3x21мм (100 шт)",
						quantityOrdered: 10,
						unitPriceKopecks: 85000,
					},
				],
			});

			const activePO = transitionPurchaseOrderStatus(
				transitionPurchaseOrderStatus(po, "sent"),
				"confirmed",
			);

			// Receive with 1 defective needle box
			const receiptResult = receiveDeliveryBatch(activePO, {
				receivedBy: "nurse-irina",
				lines: [
					{ purchaseOrderLineId: "line-1", quantityReceived: 20, quality: "good" },
					{ purchaseOrderLineId: "line-2", quantityReceived: 9, quality: "good" },
					{ purchaseOrderLineId: "line-2", quantityReceived: 1, quality: "rejected" },
				],
			});

			const printM7 = formatMaterialReceiptActM7A4(receiptResult.updatedOrder, {
				clinicName: 'ООО "ДЕНТЕ КЛИНИК"',
				actNumber: "М7-2026/089",
				actDate: "2026-09-12",
				commissionPresident: "Петров С.В. (Главный врач)",
				commissionMembers: ["Ковалева Е.А. (Старшая медсестра)", "Ильин М.А. (Зав. складом)"],
				storekeeperName: "Ильин М.А.",
				supplierDocumentNumber: "ТОРГ12-7788",
			});

			assert.ok(printM7.includes("ТИПОВАЯ МЕЖОТРАСЛЕВАЯ ФОРМА № М-7"));
			assert.ok(printM7.includes("АКТ О ПРИЕМКЕ МАТЕРИАЛОВ № М7-2026/089"));
			assert.ok(printM7.includes('ООО "ДЕНТЕ КЛИНИК"'));
			assert.ok(printM7.includes('АО "РосДентХим"'));
			assert.ok(printM7.includes("Септанест с адреналином"));
			assert.ok(printM7.includes("Иглы карпульные"));
			assert.ok(printM7.includes("Принято годных: 9 шт. | Брак/дефект: 1 шт."));
			assert.ok(printM7.includes("Петров С.В."));
			assert.ok(printM7.includes("Ковалева Е.А."));
			assert.ok(printM7.includes("ПОДПИСИ ЧЛЕНОВ КОМИССИИ"));

			// MANDATE 8d ITEM 7 INVARIANT: STRICTLY 0 EMOJIS!
			// Unicode emoji blocks: Emoticons, Misc Symbols, Transport, Dingbats, Supplemental, Pictographs
			const emojiRegex =
				/[\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu;
			const emojiMatches = printM7.match(emojiRegex);
			assert.strictEqual(
				emojiMatches,
				null,
				`Statutory print document must not contain cartoon emojis! Found: ${JSON.stringify(emojiMatches)}`,
			);
		});

		it("outputs pristine zero-discrepancy conclusion when delivery is 100% good", () => {
			const po = createPurchaseOrderRecord({
				id: "PO-CLEAN",
				clinicId: "clinic-main",
				supplierId: "supp-1",
				supplierName: 'ООО "Чистая Поставка"',
				lines: [
					{
						id: "line-1",
						inventoryItemId: "item-cotton",
						itemName: "Валики ватные стоматологические №2 (500 шт)",
						quantityOrdered: 5,
						unitPriceKopecks: 35000,
					},
				],
			});

			const active = transitionPurchaseOrderStatus(
				transitionPurchaseOrderStatus(po, "sent"),
				"confirmed",
			);
			const received = receiveDeliveryBatch(active, {
				lines: [{ purchaseOrderLineId: "line-1", quantityReceived: 5, quality: "good" }],
			});

			const doc = formatMaterialReceiptActM7A4(received.updatedOrder);
			assert.ok(doc.includes("Материалы поступили в полном объеме, надлежащего качества"));
			assert.ok(!doc.includes("ВНИМАНИЕ: При приемке выявлены расхождения"));
		});
	});
});
