/**
 * wave121PurchaseOrderEngine.test.ts — Warehouse Purchase Order & Receipt Engine Unit Tests.
 *
 * Wave 121 — Domain: Warehouse & Logistics (DentalPin PO & Receipt Engine).
 *
 * Test coverage:
 * 1. Statuses, state machine & allowed/forbidden status transitions:
 *    - DRAFT -> SENT -> CONFIRMED -> COMPLETED
 *    - Terminal states CANCELLED and COMPLETED (forbidden to transition)
 *    - Invalid jumps and forbidden transitions
 *    - Complete Russian status dictionary labels
 * 2. Kopeck-exact calculations and statutory VAT rates (20%, 10%, 0%, EXEMPT):
 *    - 20% VAT standard calculation (net + vat = lineTotal)
 *    - 10% VAT medical reduced rate
 *    - 0% VAT rate
 *    - EXEMPT (пп. 2 п. 2 ст. 149 НК РФ — без НДС)
 *    - Gross price calculation (priceIncludesVat: true)
 *    - Fractional quantities with integer kopeck rounding
 * 3. Generation of Purchase Orders from ROP recommendations:
 *    - Integration with computeReorderSuggestion from Wave 120
 *    - Filtering out optimal items (suggestedQuantity <= 0)
 *    - Correct kopeck totals and default DRAFT status
 * 4. Warehouse Goods Receipt lifecycle:
 *    - Partial receipt (PARTIALLY_RECEIVED, isFullyReceived = false)
 *    - Subsequent receipt completing the order (COMPLETED, isFullyReceived = true)
 *    - Multi-line mixed fulfillment
 *    - Overdraft protection (forbid over-receiving without allowOverdraft flag)
 *    - Soft overdraft acceptance with allowOverdraft: true
 *    - Status guards against receiving on DRAFT, COMPLETED, or CANCELLED
 *    - Object immutability verification
 * 5. Edge cases & boundary safety:
 *    - 0 quantity and 0 price
 *    - Negative quantities and prices
 *    - Non-finite numbers (NaN, Infinity)
 *    - Missing or unknown lineId in receipts
 *    - Zero/negative receipt quantities
 * 6. Statutory Print Summary formatting:
 *    - Complete legal text with requisites and specification
 *    - Absolute zero emojis verification
 * 7. Zod runtime schema validation:
 *    - Valid and invalid PurchaseOrder payloads
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ALLOWED_PO_TRANSITIONS,
	PURCHASE_ORDER_STATUS_LABELS_RU,
	RECEIVABLE_PO_STATUSES,
	VAT_RATE_LABELS_RU,
	applyPurchaseReceipt,
	calculatePOLineTotal,
	computeReorderSuggestion,
	formatPurchaseOrderPrintSummary,
	generatePurchaseOrderFromReorderSuggestions,
	purchaseOrderLineItemSchema,
	purchaseOrderSchema,
	purchaseOrderStatusSchema,
	validatePOStatusTransition,
	vatRateSchema,
	type PurchaseOrder,
	type PurchaseOrderLineItem,
	type PurchaseOrderStatus,
	type ReorderSuggestion,
	type VatRate,
} from "../index.js";

describe("Wave 121: Warehouse Purchase Order & Receipt Engine", () => {
	// ─── 1. Statuses & State Machine Transitions ─────────────────────────────────

	describe("1. Statuses, State Machine & Transition Matrix", () => {
		it("validates standard forward happy path: DRAFT -> SENT -> CONFIRMED -> COMPLETED", () => {
			assert.strictEqual(validatePOStatusTransition("DRAFT", "SENT"), true);
			assert.strictEqual(validatePOStatusTransition("SENT", "CONFIRMED"), true);
			assert.strictEqual(validatePOStatusTransition("CONFIRMED", "COMPLETED"), true);
		});

		it("allows DRAFT to transition to CANCELLED", () => {
			assert.strictEqual(validatePOStatusTransition("DRAFT", "CANCELLED"), true);
		});

		it("allows SENT to return to DRAFT or transition to CANCELLED", () => {
			assert.strictEqual(validatePOStatusTransition("SENT", "DRAFT"), true);
			assert.strictEqual(validatePOStatusTransition("SENT", "CANCELLED"), true);
		});

		it("allows receipt-driven transitions from SENT and CONFIRMED to PARTIALLY_RECEIVED", () => {
			assert.strictEqual(validatePOStatusTransition("SENT", "PARTIALLY_RECEIVED"), true);
			assert.strictEqual(validatePOStatusTransition("CONFIRMED", "PARTIALLY_RECEIVED"), true);
		});

		it("allows PARTIALLY_RECEIVED to transition to COMPLETED or CANCELLED", () => {
			assert.strictEqual(validatePOStatusTransition("PARTIALLY_RECEIVED", "COMPLETED"), true);
			assert.strictEqual(validatePOStatusTransition("PARTIALLY_RECEIVED", "CANCELLED"), true);
		});

		it("strictly forbids any transitions out of COMPLETED (terminal state)", () => {
			const allStatuses: PurchaseOrderStatus[] = [
				"DRAFT",
				"SENT",
				"CONFIRMED",
				"PARTIALLY_RECEIVED",
				"COMPLETED",
				"CANCELLED",
			];
			for (const target of allStatuses) {
				assert.strictEqual(
					validatePOStatusTransition("COMPLETED", target),
					false,
					`Transition COMPLETED -> ${target} must be forbidden`,
				);
			}
			assert.deepStrictEqual(ALLOWED_PO_TRANSITIONS.COMPLETED, []);
		});

		it("strictly forbids any transitions out of CANCELLED (terminal state)", () => {
			const allStatuses: PurchaseOrderStatus[] = [
				"DRAFT",
				"SENT",
				"CONFIRMED",
				"PARTIALLY_RECEIVED",
				"COMPLETED",
				"CANCELLED",
			];
			for (const target of allStatuses) {
				assert.strictEqual(
					validatePOStatusTransition("CANCELLED", target),
					false,
					`Transition CANCELLED -> ${target} must be forbidden`,
				);
			}
			assert.deepStrictEqual(ALLOWED_PO_TRANSITIONS.CANCELLED, []);
		});

		it("forbids invalid jumps (e.g. DRAFT directly to COMPLETED or PARTIALLY_RECEIVED)", () => {
			assert.strictEqual(validatePOStatusTransition("DRAFT", "COMPLETED"), false);
			assert.strictEqual(validatePOStatusTransition("DRAFT", "PARTIALLY_RECEIVED"), false);
		});

		it("forbids self-transitions (currentStatus === targetStatus)", () => {
			assert.strictEqual(validatePOStatusTransition("DRAFT", "DRAFT"), false);
			assert.strictEqual(validatePOStatusTransition("SENT", "SENT"), false);
			assert.strictEqual(validatePOStatusTransition("CONFIRMED", "CONFIRMED"), false);
		});

		it("exports complete Russian status labels for all 6 statuses", () => {
			assert.strictEqual(PURCHASE_ORDER_STATUS_LABELS_RU.DRAFT, "Черновик");
			assert.strictEqual(PURCHASE_ORDER_STATUS_LABELS_RU.SENT, "Отправлен поставщику");
			assert.strictEqual(PURCHASE_ORDER_STATUS_LABELS_RU.CONFIRMED, "Подтвержден поставщиком");
			assert.strictEqual(PURCHASE_ORDER_STATUS_LABELS_RU.PARTIALLY_RECEIVED, "Частично принят");
			assert.strictEqual(PURCHASE_ORDER_STATUS_LABELS_RU.COMPLETED, "Завершен (полностью принят)");
			assert.strictEqual(PURCHASE_ORDER_STATUS_LABELS_RU.CANCELLED, "Отменен");
		});

		it("defines RECEIVABLE_PO_STATUSES as SENT, CONFIRMED, PARTIALLY_RECEIVED", () => {
			assert.deepStrictEqual(RECEIVABLE_PO_STATUSES, [
				"SENT",
				"CONFIRMED",
				"PARTIALLY_RECEIVED",
			]);
		});
	});

	// ─── 2. Kopeck-Exact Financial & VAT Calculations ────────────────────────────

	describe("2. Kopeck-Exact Financial & VAT Calculations", () => {
		it("calculates 20% standard Russian VAT (net price excl. VAT)", () => {
			// 5 units @ 100.00 ₽ (10 000 kopecks)
			// Net = 50 000 kopecks (500 ₽)
			// VAT 20% = 10 000 kopecks (100 ₽)
			// Total = 60 000 kopecks (600 ₽)
			const res = calculatePOLineTotal(5, 10000, 20);
			assert.strictEqual(res.vatKopecks, 10000);
			assert.strictEqual(res.lineTotalKopecks, 60000);
		});

		it("calculates 10% medical reduced VAT (net price excl. VAT)", () => {
			// 10 units @ 150.00 ₽ (15 000 kopecks)
			// Net = 150 000 kopecks (1 500 ₽)
			// VAT 10% = 15 000 kopecks (150 ₽)
			// Total = 165 000 kopecks (1 650 ₽)
			const res = calculatePOLineTotal(10, 15000, 10);
			assert.strictEqual(res.vatKopecks, 15000);
			assert.strictEqual(res.lineTotalKopecks, 165000);
		});

		it("calculates 0% VAT rate (net price excl. VAT)", () => {
			// 4 units @ 250.00 ₽ (25 000 kopecks)
			// Net = 100 000 kopecks
			// VAT = 0
			// Total = 100 000 kopecks
			const res = calculatePOLineTotal(4, 25000, 0);
			assert.strictEqual(res.vatKopecks, 0);
			assert.strictEqual(res.lineTotalKopecks, 100000);
		});

		it("calculates EXEMPT VAT rate (пп. 2 п. 2 ст. 149 НК РФ)", () => {
			// 2 units of dental implant kit @ 12 500.00 ₽ (1 250 000 kopecks)
			// Net = 2 500 000 kopecks
			// VAT = 0
			// Total = 2 500 000 kopecks
			const res = calculatePOLineTotal(2, 1250000, "EXEMPT");
			assert.strictEqual(res.vatKopecks, 0);
			assert.strictEqual(res.lineTotalKopecks, 2500000);
		});

		it("calculates gross price inclusive of VAT (priceIncludesVat = true)", () => {
			// 1 unit @ 120.00 ₽ (12 000 kopecks) incl. 20% VAT
			// Total = 12 000 kopecks
			// VAT = 12000 * 20 / 120 = 2 000 kopecks (20 ₽)
			const res = calculatePOLineTotal(1, 12000, 20, { priceIncludesVat: true });
			assert.strictEqual(res.lineTotalKopecks, 12000);
			assert.strictEqual(res.vatKopecks, 2000);
		});

		it("calculates gross price with EXEMPT VAT (priceIncludesVat = true)", () => {
			const res = calculatePOLineTotal(3, 10000, "EXEMPT", { priceIncludesVat: true });
			assert.strictEqual(res.lineTotalKopecks, 30000);
			assert.strictEqual(res.vatKopecks, 0);
		});

		it("handles fractional quantities correctly with integer kopeck rounding", () => {
			// 2.5 kg of impression alginate @ 450.50 ₽ (45 050 kopecks)
			// Net = Math.round(2.5 * 45050) = 112 625 kopecks
			// VAT 20% = Math.round(112625 * 0.2) = 22 525 kopecks
			// Total = 112625 + 22525 = 135 150 kopecks
			const res = calculatePOLineTotal(2.5, 45050, 20);
			assert.strictEqual(res.vatKopecks, 22525);
			assert.strictEqual(res.lineTotalKopecks, 135150);
		});

		it("exports complete Russian VAT labels", () => {
			assert.strictEqual(VAT_RATE_LABELS_RU[0], "0%");
			assert.strictEqual(VAT_RATE_LABELS_RU[10], "10%");
			assert.strictEqual(VAT_RATE_LABELS_RU[20], "20%");
			assert.strictEqual(VAT_RATE_LABELS_RU.EXEMPT, "Без НДС (Освобожден)");
		});
	});

	// ─── 3. Generation of PO from ROP Reorder Suggestions ────────────────────────

	describe("3. PO Generation from ROP Recommendations (Wave 120 Integration)", () => {
		it("generates a structured PO in DRAFT status from real ROP suggestions", () => {
			// Compute real suggestions via Wave 120 inventoryReorderEngine
			const item1Suggestion = computeReorderSuggestion({
				inventoryItemId: "item-composite-a2",
				itemName: "Композит светоотверждаемый А2",
				stockQuantity: 1,
				onOrderQuantity: 0,
				usageLookbackTotal: 90,
				lookbackDays: 90, // dailyUsage = 1.0
				leadTimeDays: 7, // leadTimeDemand = 7
				minQuantity: 10, // reorderPoint = 10
				coverDays: 30, // cover = 30
				// suggestedQuantity = 10 + 30 - 1 = 39
				unitPriceKopecks: 250000, // 2 500 ₽
				supplierId: "sup-dental-trade",
				supplierName: 'ООО "Дентал Трейд"',
			});
			assert.ok(item1Suggestion);
			assert.strictEqual(item1Suggestion.suggestedQuantity, 39);

			const item2Suggestion = computeReorderSuggestion({
				inventoryItemId: "item-anesthetic-articaine",
				itemName: "Артикаин 4% с адреналином 1:100000 (50 карпул)",
				stockQuantity: 0, // URGENT_OUT_OF_STOCK
				onOrderQuantity: 0,
				usageLookbackTotal: 180,
				lookbackDays: 90, // dailyUsage = 2.0
				leadTimeDays: 5, // leadTimeDemand = 10
				minQuantity: 10, // reorderPoint = 10
				coverDays: 20, // cover = 40
				// suggestedQuantity = 10 + 40 - 0 = 50
				unitPriceKopecks: 380000, // 3 800 ₽
				supplierId: "sup-dental-trade",
				supplierName: 'ООО "Дентал Трейд"',
			});
			assert.ok(item2Suggestion);
			assert.strictEqual(item2Suggestion.suggestedQuantity, 50);

			const po = generatePurchaseOrderFromReorderSuggestions({
				supplierId: "sup-dental-trade",
				supplierName: 'ООО "Дентал Трейд"',
				suggestions: [item1Suggestion, item2Suggestion],
				orderNumber: "PO-2026-TEST-001",
				expectedDeliveryDate: "2026-09-25T00:00:00Z",
				defaultVatRate: "EXEMPT",
			});

			assert.strictEqual(po.orderNumber, "PO-2026-TEST-001");
			assert.strictEqual(po.supplierId, "sup-dental-trade");
			assert.strictEqual(po.supplierName, 'ООО "Дентал Трейд"');
			assert.strictEqual(po.status, "DRAFT");
			assert.strictEqual(po.expectedDeliveryDate, "2026-09-25T00:00:00Z");
			assert.strictEqual(po.lines.length, 2);

			// Line 1 verification
			const line1 = po.lines[0];
			assert.ok(line1);
			assert.strictEqual(line1.itemId, "item-composite-a2");
			assert.strictEqual(line1.itemName, "Композит светоотверждаемый А2");
			assert.strictEqual(line1.orderedQuantity, 39);
			assert.strictEqual(line1.receivedQuantity, 0);
			assert.strictEqual(line1.unitPriceKopecks, 250000);
			assert.strictEqual(line1.vatRate, "EXEMPT");
			assert.strictEqual(line1.totalPriceKopecks, 39 * 250000); // 9 750 000 kopecks (97 500 ₽)

			// Line 2 verification
			const line2 = po.lines[1];
			assert.ok(line2);
			assert.strictEqual(line2.itemId, "item-anesthetic-articaine");
			assert.strictEqual(line2.orderedQuantity, 50);
			assert.strictEqual(line2.unitPriceKopecks, 380000);
			assert.strictEqual(line2.vatRate, "EXEMPT");
			assert.strictEqual(line2.totalPriceKopecks, 50 * 380000); // 19 000 000 kopecks (190 000 ₽)

			// Order grand totals
			assert.strictEqual(
				po.totalAmountKopecks,
				line1.totalPriceKopecks + line2.totalPriceKopecks,
			);
			assert.strictEqual(po.vatAmountKopecks, 0);
		});

		it("filters out suggestions with suggestedQuantity <= 0", () => {
			const zeroQtySuggestion: ReorderSuggestion = {
				inventoryItemId: "item-optimal",
				itemName: "Перчатки нитриловые (достаточный остаток)",
				dailyUsage: 1,
				leadTimeDemand: 5,
				reorderPoint: 10,
				available: 50,
				stockQuantity: 50,
				onOrderQuantity: 0,
				coverDays: 30,
				cover: 0,
				suggestedQuantity: 0,
				status: "OPTIMAL",
				estimatedStockDepletionDays: 50,
				unitPriceKopecks: 50000,
			};

			const activeSuggestion: ReorderSuggestion = {
				inventoryItemId: "item-needed",
				itemName: "Бор алмазный",
				dailyUsage: 1,
				leadTimeDemand: 3,
				reorderPoint: 5,
				available: 1,
				stockQuantity: 1,
				onOrderQuantity: 0,
				coverDays: 10,
				cover: 10,
				suggestedQuantity: 14,
				status: "CRITICAL_REORDER",
				estimatedStockDepletionDays: 1,
				unitPriceKopecks: 12000,
			};

			const po = generatePurchaseOrderFromReorderSuggestions({
				supplierId: "sup-tools",
				supplierName: 'ООО "МедИнструмент"',
				suggestions: [zeroQtySuggestion, activeSuggestion],
			});

			assert.strictEqual(po.lines.length, 1);
			const line0 = po.lines[0];
			assert.ok(line0);
			assert.strictEqual(line0.itemId, "item-needed");
			assert.strictEqual(line0.orderedQuantity, 14);
		});

		it("handles empty suggestions array producing empty draft PO with 0 totals", () => {
			const po = generatePurchaseOrderFromReorderSuggestions({
				supplierId: "sup-empty",
				supplierName: "Поставщик Тест",
				suggestions: [],
			});

			assert.strictEqual(po.lines.length, 0);
			assert.strictEqual(po.totalAmountKopecks, 0);
			assert.strictEqual(po.vatAmountKopecks, 0);
			assert.strictEqual(po.status, "DRAFT");
		});
	});

	// ─── 4. Warehouse Goods Receipt Lifecycle & Overdraft Protection ──────────────

	describe("4. Warehouse Goods Receipt Lifecycle & Overdraft Protection", () => {
		function createSampleOrder(initialStatus: PurchaseOrderStatus = "CONFIRMED"): PurchaseOrder {
			return {
				id: "po-rec-101",
				orderNumber: "PO-2026-REC-101",
				supplierId: "sup-test",
				supplierName: 'ООО "ТестПоставка"',
				status: initialStatus,
				lines: [
					{
						id: "line-1",
						itemId: "item-1",
						itemName: "Пломбировочный материал",
						orderedQuantity: 10,
						receivedQuantity: 0,
						unitPriceKopecks: 200000,
						vatRate: 20,
						totalPriceKopecks: 2400000,
					},
					{
						id: "line-2",
						itemId: "item-2",
						itemName: "Антисептик хлоргексидин 0.05%",
						orderedQuantity: 5,
						receivedQuantity: 0,
						unitPriceKopecks: 5000,
						vatRate: "EXEMPT",
						totalPriceKopecks: 25000,
					},
				],
				totalAmountKopecks: 2425000,
				vatAmountKopecks: 400000,
				createdAt: "2026-09-11T10:00:00Z",
			};
		}

		it("processes partial receipt, transitions order to PARTIALLY_RECEIVED", () => {
			const order = createSampleOrder("CONFIRMED");

			// Partially receive line-1: 4 out of 10 units
			const result = applyPurchaseReceipt(order, [
				{ lineId: "line-1", receivedQuantity: 4 },
			]);

			assert.strictEqual(result.isFullyReceived, false);
			assert.strictEqual(result.totalReceivedItems, 4);
			assert.strictEqual(result.updatedOrder.status, "PARTIALLY_RECEIVED");

			const updatedLine1 = result.updatedOrder.lines.find((l) => l.id === "line-1");
			assert.strictEqual(updatedLine1?.receivedQuantity, 4);

			const updatedLine2 = result.updatedOrder.lines.find((l) => l.id === "line-2");
			assert.strictEqual(updatedLine2?.receivedQuantity, 0);

			// Original order must remain unmutated (immutability check)
			assert.strictEqual(order.lines[0]?.receivedQuantity, 0);
			assert.strictEqual(order.status, "CONFIRMED");
		});

		it("completes full order across two consecutive receipt deliveries", () => {
			const initialOrder = createSampleOrder("CONFIRMED");

			// Delivery 1: Line 1 partial (4/10), Line 2 full (5/5)
			const batch1 = applyPurchaseReceipt(initialOrder, [
				{ lineId: "line-1", receivedQuantity: 4 },
				{ lineId: "line-2", receivedQuantity: 5 },
			]);

			assert.strictEqual(batch1.isFullyReceived, false);
			assert.strictEqual(batch1.totalReceivedItems, 9);
			assert.strictEqual(batch1.updatedOrder.status, "PARTIALLY_RECEIVED");

			// Delivery 2: Remaining 6 units for Line 1
			const batch2 = applyPurchaseReceipt(batch1.updatedOrder, [
				{ lineId: "line-1", receivedQuantity: 6 },
			]);

			assert.strictEqual(batch2.isFullyReceived, true);
			assert.strictEqual(batch2.totalReceivedItems, 6);
			assert.strictEqual(batch2.updatedOrder.status, "COMPLETED");

			const finalLine1 = batch2.updatedOrder.lines.find((l) => l.id === "line-1");
			assert.strictEqual(finalLine1?.receivedQuantity, 10);

			const finalLine2 = batch2.updatedOrder.lines.find((l) => l.id === "line-2");
			assert.strictEqual(finalLine2?.receivedQuantity, 5);
		});

		it("processes immediate full receipt in 1 batch, transitions to COMPLETED", () => {
			const order = createSampleOrder("CONFIRMED");

			const result = applyPurchaseReceipt(order, [
				{ lineId: "line-1", receivedQuantity: 10 },
				{ lineId: "line-2", receivedQuantity: 5 },
			]);

			assert.strictEqual(result.isFullyReceived, true);
			assert.strictEqual(result.totalReceivedItems, 15);
			assert.strictEqual(result.updatedOrder.status, "COMPLETED");
		});

		it("forbids over-receiving when allowOverdraft is false (default)", () => {
			const order = createSampleOrder("CONFIRMED");

			// Attempt to receive 12 units when only 10 were ordered
			assert.throws(
				() => {
					applyPurchaseReceipt(order, [{ lineId: "line-1", receivedQuantity: 12 }]);
				},
				/exceeds ordered quantity/i,
			);
		});

		it("allows over-receiving when allowOverdraft is true (soft overdraft Mandate 8e/8n)", () => {
			const order = createSampleOrder("CONFIRMED");

			// Supplier delivered 12 units instead of 10 (e.g. bonus / packing unit)
			const result = applyPurchaseReceipt(
				order,
				[
					{ lineId: "line-1", receivedQuantity: 12 },
					{ lineId: "line-2", receivedQuantity: 5 },
				],
				{ allowOverdraft: true },
			);

			assert.strictEqual(result.isFullyReceived, true);
			assert.strictEqual(result.totalReceivedItems, 17);
			assert.strictEqual(result.updatedOrder.status, "COMPLETED");

			const line1 = result.updatedOrder.lines.find((l) => l.id === "line-1");
			assert.strictEqual(line1?.receivedQuantity, 12);
		});

		it("forbids receiving goods on COMPLETED order", () => {
			const completedOrder = createSampleOrder("COMPLETED");
			assert.throws(
				() => {
					applyPurchaseReceipt(completedOrder, [{ lineId: "line-1", receivedQuantity: 1 }]);
				},
				/already COMPLETED/i,
			);
		});

		it("forbids receiving goods on CANCELLED order", () => {
			const cancelledOrder = createSampleOrder("CANCELLED");
			assert.throws(
				() => {
					applyPurchaseReceipt(cancelledOrder, [{ lineId: "line-1", receivedQuantity: 1 }]);
				},
				/order is CANCELLED/i,
			);
		});

		it("forbids receiving goods on DRAFT order unless allowDraftReceipt is true", () => {
			const draftOrder = createSampleOrder("DRAFT");
			assert.throws(
				() => {
					applyPurchaseReceipt(draftOrder, [{ lineId: "line-1", receivedQuantity: 1 }]);
				},
				/order must be SENT or CONFIRMED before receiving/i,
			);

			// With allowDraftReceipt flag
			const result = applyPurchaseReceipt(
				draftOrder,
				[{ lineId: "line-1", receivedQuantity: 1 }],
				{ allowDraftReceipt: true },
			);
			assert.strictEqual(result.updatedOrder.status, "PARTIALLY_RECEIVED");
		});
	});

	// ─── 5. Edge Cases & Boundary Safety ──────────────────────────────────────────

	describe("5. Edge Cases & Boundary Safety", () => {
		it("safely handles 0 and negative quantities in calculatePOLineTotal", () => {
			const zeroQty = calculatePOLineTotal(0, 10000, 20);
			assert.strictEqual(zeroQty.lineTotalKopecks, 0);
			assert.strictEqual(zeroQty.vatKopecks, 0);

			const negQty = calculatePOLineTotal(-5, 10000, 20);
			assert.strictEqual(negQty.lineTotalKopecks, 0);
			assert.strictEqual(negQty.vatKopecks, 0);
		});

		it("safely handles 0 and negative unitPriceKopecks in calculatePOLineTotal", () => {
			const zeroPrice = calculatePOLineTotal(10, 0, 20);
			assert.strictEqual(zeroPrice.lineTotalKopecks, 0);
			assert.strictEqual(zeroPrice.vatKopecks, 0);

			const negPrice = calculatePOLineTotal(10, -5000, 20);
			assert.strictEqual(negPrice.lineTotalKopecks, 0);
			assert.strictEqual(negPrice.vatKopecks, 0);
		});

		it("safely handles non-finite numbers (NaN, Infinity) without crashing", () => {
			const nanRes = calculatePOLineTotal(Number.NaN, 10000, 20);
			assert.strictEqual(nanRes.lineTotalKopecks, 0);
			assert.strictEqual(nanRes.vatKopecks, 0);

			const infRes = calculatePOLineTotal(10, Number.POSITIVE_INFINITY, 20);
			assert.strictEqual(infRes.lineTotalKopecks, 0);
			assert.strictEqual(infRes.vatKopecks, 0);
		});

		it("throws error when receiptLine lineId does not exist in order", () => {
			const order: PurchaseOrder = {
				id: "po-1",
				orderNumber: "PO-1",
				supplierId: "sup-1",
				supplierName: "Поставщик",
				status: "CONFIRMED",
				lines: [],
				totalAmountKopecks: 0,
				vatAmountKopecks: 0,
				createdAt: "2026-09-11T10:00:00Z",
			};

			assert.throws(
				() => {
					applyPurchaseReceipt(order, [{ lineId: "non-existent-line", receivedQuantity: 5 }]);
				},
				/does not exist in purchase order/i,
			);
		});

		it("throws error on negative received quantity in receipt lines", () => {
			const order: PurchaseOrder = {
				id: "po-1",
				orderNumber: "PO-1",
				supplierId: "sup-1",
				supplierName: "Поставщик",
				status: "CONFIRMED",
				lines: [
					{
						id: "line-1",
						itemId: "item-1",
						itemName: "Товар 1",
						orderedQuantity: 5,
						receivedQuantity: 0,
						unitPriceKopecks: 1000,
						vatRate: 0,
						totalPriceKopecks: 5000,
					},
				],
				totalAmountKopecks: 5000,
				vatAmountKopecks: 0,
				createdAt: "2026-09-11T10:00:00Z",
			};

			assert.throws(
				() => {
					applyPurchaseReceipt(order, [{ lineId: "line-1", receivedQuantity: -2 }]);
				},
				/must be non-negative/i,
			);
		});

		it("safely handles 0 receivedQuantity in receipt line (no-op)", () => {
			const order: PurchaseOrder = {
				id: "po-1",
				orderNumber: "PO-1",
				supplierId: "sup-1",
				supplierName: "Поставщик",
				status: "CONFIRMED",
				lines: [
					{
						id: "line-1",
						itemId: "item-1",
						itemName: "Товар 1",
						orderedQuantity: 5,
						receivedQuantity: 0,
						unitPriceKopecks: 1000,
						vatRate: 0,
						totalPriceKopecks: 5000,
					},
				],
				totalAmountKopecks: 5000,
				vatAmountKopecks: 0,
				createdAt: "2026-09-11T10:00:00Z",
			};

			const res = applyPurchaseReceipt(order, [{ lineId: "line-1", receivedQuantity: 0 }]);
			assert.strictEqual(res.totalReceivedItems, 0);
			assert.strictEqual(res.isFullyReceived, false);
			assert.strictEqual(res.updatedOrder.status, "CONFIRMED");
		});
	});

	// ─── 6. Statutory Print Summary Formatting ────────────────────────────────────

	describe("6. Statutory Print Summary & Zero Emojis Inspection", () => {
		const sampleOrder: PurchaseOrder = {
			id: "po-print-001",
			orderNumber: "PO-2026-088",
			supplierId: "sup-stom-snab",
			supplierName: 'ООО "СтомСнаб Торг"',
			status: "CONFIRMED",
			lines: [
				{
					id: "line-101",
					itemId: "item-optra-gate",
					itemName: "Роторасширитель OptraGate Regular (80 шт)",
					supplierSku: "IVOC-4482",
					orderedQuantity: 3,
					receivedQuantity: 1,
					unitPriceKopecks: 950000, // 9 500.00 ₽
					vatRate: "EXEMPT",
					totalPriceKopecks: 2850000, // 28 500.00 ₽
				},
				{
					id: "line-102",
					itemId: "item-disinfectant",
					itemName: "Дезинфицирующее средство Аламинол 3л",
					orderedQuantity: 5,
					receivedQuantity: 5,
					unitPriceKopecks: 120000, // 1 200.00 ₽
					vatRate: 20,
					totalPriceKopecks: 720000, // 7 200.00 ₽ incl. VAT
				},
			],
			totalAmountKopecks: 3570000,
			vatAmountKopecks: 120000,
			createdAt: "2026-09-11T12:00:00Z",
			expectedDeliveryDate: "2026-09-18T00:00:00Z",
		};

		it("formats complete structured order summary with buyer and supplier requisites", () => {
			const summary = formatPurchaseOrderPrintSummary(
				sampleOrder,
				'ООО "Стоматологический Центр ДЕНТЕ"',
			);

			assert.ok(summary.includes("ДОГОВОР-ЗАКАЗ ПОСТАВЩИКУ № PO-2026-088"));
			assert.ok(summary.includes('ООО "Стоматологический Центр ДЕНТЕ"'));
			assert.ok(summary.includes('ООО "СтомСнаб Торг"'));
			assert.ok(summary.includes("Подтвержден поставщиком"));
			assert.ok(summary.includes("11.09.2026"));
			assert.ok(summary.includes("18.09.2026"));
			assert.ok(summary.includes("OptraGate Regular"));
			assert.ok(summary.includes("IVOC-4482"));
			assert.ok(summary.includes("Дезинфицирующее средство Аламинол"));
			assert.ok(summary.includes("ПОДПИСИ СТОРОН:"));
			assert.ok(summary.includes("М.П."));
		});

		it("proves 100% absence of cartoon emojis in official document (Mandate 8d)", () => {
			const summary = formatPurchaseOrderPrintSummary(sampleOrder);
			// Test against common emojis forbidden in legal/medical documents
			const emojiPattern =
				/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}]/u;

			const hasEmojis = emojiPattern.test(summary);
			assert.strictEqual(hasEmojis, false, "Official print summary must contain zero emojis");
		});

		it("formats clean summary when order has no lines", () => {
			const emptyOrder: PurchaseOrder = {
				id: "po-empty",
				orderNumber: "PO-EMPTY-001",
				supplierId: "sup-1",
				supplierName: "Поставщик",
				status: "DRAFT",
				lines: [],
				totalAmountKopecks: 0,
				vatAmountKopecks: 0,
				createdAt: "2026-09-11T12:00:00Z",
			};

			const summary = formatPurchaseOrderPrintSummary(emptyOrder);
			assert.ok(summary.includes("ДОГОВОР-ЗАКАЗ ПОСТАВЩИКУ № PO-EMPTY-001"));
			assert.ok(summary.includes("[Позиции заказа отсутствуют]"));
		});
	});

	// ─── 7. Zod Runtime Schema Validation ─────────────────────────────────────────

	describe("7. Zod Runtime Schema Validation", () => {
		it("validates correct PurchaseOrder against purchaseOrderSchema", () => {
			const validPo: PurchaseOrder = {
				id: "po-valid-1",
				orderNumber: "PO-2026-001",
				supplierId: "sup-1",
				supplierName: "Поставщик",
				status: "DRAFT",
				lines: [
					{
						id: "line-1",
						itemId: "item-1",
						itemName: "Товар",
						orderedQuantity: 5,
						receivedQuantity: 0,
						unitPriceKopecks: 1000,
						vatRate: "EXEMPT",
						totalPriceKopecks: 5000,
					},
				],
				totalAmountKopecks: 5000,
				vatAmountKopecks: 0,
				createdAt: "2026-09-11T12:00:00Z",
			};

			const parsed = purchaseOrderSchema.safeParse(validPo);
			assert.strictEqual(parsed.success, true);
		});

		it("rejects invalid status in purchaseOrderStatusSchema", () => {
			const invalid = purchaseOrderStatusSchema.safeParse("UNKNOWN_STATUS");
			assert.strictEqual(invalid.success, false);
		});

		it("validates all supported vatRateSchema values and rejects invalid ones", () => {
			assert.strictEqual(vatRateSchema.safeParse(0).success, true);
			assert.strictEqual(vatRateSchema.safeParse(10).success, true);
			assert.strictEqual(vatRateSchema.safeParse(20).success, true);
			assert.strictEqual(vatRateSchema.safeParse("EXEMPT").success, true);
			assert.strictEqual(vatRateSchema.safeParse(18).success, false); // obsolete Russian rate
			assert.strictEqual(vatRateSchema.safeParse("INVALID").success, false);
		});

		it("rejects negative numbers in line items", () => {
			const invalidLine = {
				id: "line-1",
				itemId: "item-1",
				itemName: "Товар",
				orderedQuantity: -5, // invalid
				receivedQuantity: 0,
				unitPriceKopecks: 1000,
				vatRate: 0,
				totalPriceKopecks: 5000,
			};

			const parsed = purchaseOrderLineItemSchema.safeParse(invalidLine);
			assert.strictEqual(parsed.success, false);
		});
	});
});
