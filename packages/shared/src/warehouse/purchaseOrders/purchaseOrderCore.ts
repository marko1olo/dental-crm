/**
 * purchaseOrderCore.ts — Layer 2: Purchase Order Lifecycle, Receipt Execution & Statutory Reports.
 *
 * Wave 121 — Purchase Order Lifecycle & Warehouse Receipt Core Engine.
 * Verbatim extraction preserving 100% Behavioral Conservation.
 *
 * Invariants:
 * 1. Zero Mocks & Zero Dead-Ends (Mandate 8e, 8n).
 * 2. Exact Integer Kopecks Math (Mandate 8b).
 * 3. Statutory Russian Tax & B2B Purchasing (ст. 149, 164, 168 НК РФ).
 * 4. Purchase Order State Machine: DRAFT -> SENT -> CONFIRMED -> COMPLETED / CANCELLED.
 * 5. Goods Receipt & Overdraft Governance.
 * 6. Clean Statutory Print Summaries & Form M-7 (Mandate 8d, zero emojis).
 */

import type {
	PurchaseOrderStatus,
	VatRate,
	PurchaseOrderLineItem,
	PurchaseOrder,
	POLineTotalOptions,
	GeneratePurchaseOrderParams,
	PurchaseReceiptLineInput,
	ApplyPurchaseReceiptOptions,
	ApplyPurchaseReceiptResult,
	ProcurementOrderStatus,
	PurchaseOrderLineStatus,
	PurchaseOrderLine,
	PurchaseReceiptLine,
	PurchaseReceipt,
	PurchaseOrderRecord,
	CreatePurchaseOrderParams,
	ReceiveDeliveryBatchInput,
	ReceiveDeliveryBatchOptions,
	ReceiveDeliveryBatchResult,
	FormatMaterialReceiptActM7Options,
} from "./types.js";
import {
	ALLOWED_PO_TRANSITIONS,
	PURCHASE_ORDER_STATUS_LABELS_RU,
	VAT_RATE_LABELS_RU,
	ALLOWED_PROCUREMENT_PO_TRANSITIONS,
	RECEIVABLE_PROCUREMENT_STATUSES,
} from "./types.js";
import {
	generatePurchaseOrderNumber,
	generatePurchaseOrderId,
	generatePurchaseReceiptId,
} from "../../utils/idGenerators.js";

// ─── 1. STATUS TRANSITION VALIDATION ──────────────────────────────────────────

/**
 * Validates whether a Purchase Order status transition from currentStatus to
 * targetStatus is legally and logically permitted.
 *
 * @param currentStatus - The existing status of the purchase order.
 * @param targetStatus - The desired target status.
 * @returns boolean - True if the transition is allowed, false otherwise.
 */
export function validatePOStatusTransition(
	currentStatus: PurchaseOrderStatus,
	targetStatus: PurchaseOrderStatus,
): boolean {
	if (currentStatus === targetStatus) {
		return false;
	}
	const allowed = ALLOWED_PO_TRANSITIONS[currentStatus];
	return allowed ? allowed.includes(targetStatus) : false;
}

// ─── 2. LINE TOTAL & STATUTORY VAT CALCULATIONS ───────────────────────────────

/**
 * Calculates statutory line total and VAT amount in exact integer kopecks.
 *
 * Statutory formulas:
 * - When price excludes VAT (standard B2B Russian invoice / УПД / ТОРГ-12):
 *     netKopecks = Math.round(quantity * unitPriceKopecks)
 *     vatKopecks = (vatRate === 'EXEMPT' || vatRate === 0) ? 0 : Math.round((netKopecks * vatRate) / 100)
 *     lineTotalKopecks = netKopecks + vatKopecks
 * - When price includes VAT (gross price):
 *     lineTotalKopecks = Math.round(quantity * unitPriceKopecks)
 *     vatKopecks = (vatRate === 'EXEMPT' || vatRate === 0) ? 0 : Math.round((lineTotalKopecks * vatRate) / (100 + vatRate))
 *
 * @param quantity - Number of units ordered (can be fractional for bulk materials, e.g. 1.5 kg).
 * @param unitPriceKopecks - Unit price in integer kopecks.
 * @param vatRate - Statutory VAT rate (0, 10, 20, or 'EXEMPT').
 * @param options - Optional calculation flags (e.g. priceIncludesVat).
 * @returns { lineTotalKopecks: number; vatKopecks: number }
 */
export function calculatePOLineTotal(
	quantity: number,
	unitPriceKopecks: number,
	vatRate: VatRate,
	options?: POLineTotalOptions,
): { lineTotalKopecks: number; vatKopecks: number } {
	// Guard against non-finite or negative values
	if (
		!Number.isFinite(quantity) ||
		quantity <= 0 ||
		!Number.isFinite(unitPriceKopecks) ||
		unitPriceKopecks <= 0
	) {
		return { lineTotalKopecks: 0, vatKopecks: 0 };
	}

	const isExemptOrZero = vatRate === "EXEMPT" || vatRate === 0;

	if (options?.priceIncludesVat) {
		const lineTotalKopecks = Math.round(quantity * unitPriceKopecks);
		if (isExemptOrZero) {
			return { lineTotalKopecks, vatKopecks: 0 };
		}
		const ratePercent = typeof vatRate === "number" ? vatRate : 0;
		const vatKopecks = Math.round((lineTotalKopecks * ratePercent) / (100 + ratePercent));
		return { lineTotalKopecks, vatKopecks };
	}

	const netKopecks = Math.round(quantity * unitPriceKopecks);
	if (isExemptOrZero) {
		return { lineTotalKopecks: netKopecks, vatKopecks: 0 };
	}

	const ratePercent = typeof vatRate === "number" ? vatRate : 0;
	const vatKopecks = Math.round((netKopecks * ratePercent) / 100);
	const lineTotalKopecks = netKopecks + vatKopecks;

	return { lineTotalKopecks, vatKopecks };
}

// ─── 3. PURCHASE ORDER GENERATION ─────────────────────────────────────────────

/**
 * Generates a structured Purchase Order in DRAFT status from ROP warehouse
 * replenishment recommendations (inventoryReorderEngine from Wave 120).
 *
 * Rules:
 * - Automatically filters out suggestions where suggestedQuantity <= 0.
 * - Computes exact line totals and VAT amounts in integer kopecks.
 * - Sets default status to 'DRAFT'.
 * - Generates statutory order number if omitted (e.g. PO-YYYY-XXX).
 *
 * @param params - Supplier metadata and reorder suggestion list.
 * @returns PurchaseOrder
 */
export function generatePurchaseOrderFromReorderSuggestions(
	params: GeneratePurchaseOrderParams,
): PurchaseOrder {
	const orderId =
		params.id ??
		(typeof crypto !== "undefined" && crypto.randomUUID
			? crypto.randomUUID()
			: `po-${Date.now()}`);
	const defaultVat = params.defaultVatRate ?? "EXEMPT";
	const currentYear = new Date().getFullYear();
	const orderNumber =
		params.orderNumber ??
		generatePurchaseOrderNumber(currentYear, {
			seedKey: params.supplierId,
		});

	const lines: PurchaseOrderLineItem[] = [];
	let totalAmountKopecks = 0;
	let totalVatKopecks = 0;

	let lineIdx = 1;
	for (const suggestion of params.suggestions) {
		// Filter out suggestions that don't need ordering
		if (!suggestion.suggestedQuantity || suggestion.suggestedQuantity <= 0) {
			continue;
		}

		const lineId =
			typeof crypto !== "undefined" && crypto.randomUUID
				? crypto.randomUUID()
				: `line-${orderId}-${lineIdx++}`;
		const itemId = suggestion.inventoryItemId ?? `item-${lineIdx}`;
		const itemName = suggestion.itemName ?? "Расходный стоматологический материал";
		const orderedQuantity = suggestion.suggestedQuantity;
		const unitPriceKopecks = suggestion.unitPriceKopecks ?? 0;
		const vatRate = defaultVat;

		const { lineTotalKopecks, vatKopecks } = calculatePOLineTotal(
			orderedQuantity,
			unitPriceKopecks,
			vatRate,
		);

		lines.push({
			id: lineId,
			itemId,
			itemName,
			orderedQuantity,
			receivedQuantity: 0,
			unitPriceKopecks,
			vatRate,
			totalPriceKopecks: lineTotalKopecks,
		});

		totalAmountKopecks += lineTotalKopecks;
		totalVatKopecks += vatKopecks;
	}

	return {
		id: orderId,
		orderNumber,
		supplierId: params.supplierId,
		supplierName: params.supplierName,
		status: "DRAFT",
		lines,
		totalAmountKopecks,
		vatAmountKopecks: totalVatKopecks,
		createdAt: new Date().toISOString(),
		...(params.expectedDeliveryDate ? { expectedDeliveryDate: params.expectedDeliveryDate } : {}),
	};
}

// ─── 4. GOODS RECEIPT LIFECYCLE ───────────────────────────────────────────────

/**
 * Applies a goods delivery receipt to an active Purchase Order.
 *
 * Rules:
 * 1. Status Guard: Order must be in a receivable status (SENT, CONFIRMED, or PARTIALLY_RECEIVED).
 *    Receiving on COMPLETED or CANCELLED is strictly forbidden.
 * 2. Overdraft Protection: If receivedQuantity + newReceived > orderedQuantity and
 *    allowOverdraft is false, throws a detailed error.
 * 3. Status Progression:
 *    - If all lines have receivedQuantity >= orderedQuantity, status becomes COMPLETED.
 *    - If at least one item was received but order is not complete, status becomes PARTIALLY_RECEIVED.
 * 4. Immutability: Returns a new updated PurchaseOrder instance without mutating original object.
 *
 * @param order - The target purchase order.
 * @param receiptLines - Array of received quantities per line ID.
 * @param options - Overdraft and validation options.
 * @returns ApplyPurchaseReceiptResult
 */
export function applyPurchaseReceipt(
	order: PurchaseOrder,
	receiptLines: readonly PurchaseReceiptLineInput[],
	options?: ApplyPurchaseReceiptOptions,
): ApplyPurchaseReceiptResult {
	// 1. Guard order status
	if (order.status === "COMPLETED") {
		throw new Error(
			`Cannot apply receipt to purchase order "${order.orderNumber}": order is already COMPLETED`,
		);
	}
	if (order.status === "CANCELLED") {
		throw new Error(
			`Cannot apply receipt to purchase order "${order.orderNumber}": order is CANCELLED`,
		);
	}
	if (order.status === "DRAFT" && !options?.allowDraftReceipt) {
		throw new Error(
			`Cannot apply receipt to purchase order "${order.orderNumber}" in DRAFT status: order must be SENT or CONFIRMED before receiving`,
		);
	}

	// 2. Clone lines into a lookup map
	const lineMap = new Map<string, PurchaseOrderLineItem>(
		order.lines.map((l) => [l.id, { ...l }]),
	);

	let batchReceivedQuantity = 0;

	// 3. Process incoming receipt lines
	for (const receiptEntry of receiptLines) {
		const line = lineMap.get(receiptEntry.lineId);
		if (!line) {
			throw new Error(
				`Receipt line ID "${receiptEntry.lineId}" does not exist in purchase order "${order.orderNumber}"`,
			);
		}

		if (receiptEntry.receivedQuantity < 0) {
			throw new Error(
				`Received quantity must be non-negative, got ${receiptEntry.receivedQuantity} for line "${line.itemName}"`,
			);
		}

		if (receiptEntry.receivedQuantity === 0) {
			continue;
		}

		const nextReceived = line.receivedQuantity + receiptEntry.receivedQuantity;

		// Check overdraft
		if (nextReceived > line.orderedQuantity && !options?.allowOverdraft) {
			throw new Error(
				`Received quantity (${nextReceived}) exceeds ordered quantity (${line.orderedQuantity}) for item "${line.itemName}". Overdraft flag required.`,
			);
		}

		line.receivedQuantity = nextReceived;
		batchReceivedQuantity += receiptEntry.receivedQuantity;
	}

	// 4. Reconstruct updated lines preserving original order
	const updatedLines = order.lines.map((l) => lineMap.get(l.id)!);

	// 5. Evaluate completion status
	const isFullyReceived =
		updatedLines.length > 0 &&
		updatedLines.every((l) => l.receivedQuantity >= l.orderedQuantity);

	const hasAnyReceived = updatedLines.some((l) => l.receivedQuantity > 0);

	let nextStatus: PurchaseOrderStatus = order.status;
	if (isFullyReceived) {
		nextStatus = "COMPLETED";
	} else if (hasAnyReceived) {
		nextStatus = "PARTIALLY_RECEIVED";
	}

	const updatedOrder: PurchaseOrder = {
		...order,
		status: nextStatus,
		lines: updatedLines,
	};

	return {
		updatedOrder,
		isFullyReceived,
		totalReceivedItems: batchReceivedQuantity,
	};
}

// ─── 5. FORMATTING HELPERS & PRINT SUMMARY ────────────────────────────────────

/**
 * Formats integer kopecks as human-readable Russian rubles string with 2 decimals.
 * Example: 150000 -> "1 500,00 ₽"
 */
function formatKopecksToRublesRu(kopecks: number): string {
	if (!Number.isFinite(kopecks)) return "0,00 ₽";
	const rubles = Math.floor(Math.abs(kopecks) / 100);
	const remKopecks = Math.round(Math.abs(kopecks) % 100);
	const rublesStr = rubles.toLocaleString("ru-RU");
	const kopecksStr = String(remKopecks).padStart(2, "0");
	const sign = kopecks < 0 ? "-" : "";
	return `${sign}${rublesStr},${kopecksStr} ₽`;
}

/**
 * Formats an ISO date string (e.g. "2026-09-11T12:00:00Z") to Russian date "DD.MM.YYYY".
 */
function formatDateRu(isoString: string): string {
	try {
		const d = new Date(isoString);
		if (Number.isNaN(d.getTime())) return isoString;
		const day = String(d.getDate()).padStart(2, "0");
		const month = String(d.getMonth() + 1).padStart(2, "0");
		const year = d.getFullYear();
		return `${day}.${month}.${year}`;
	} catch {
		return isoString;
	}
}

/**
 * Formats a clean, structured, statutory text summary of a Purchase Order
 * suitable for printing, emailing to suppliers, or legal archiving.
 *
 * Adheres strictly to Mandate 8d (7 deadly sins checklist):
 * - ZERO cartoon emojis (no 🎉, 🚀, 💡, 🦷, 📦, 📄).
 * - Complete supplier details, order number, dates, and Russian status label.
 * - Itemized specification table with quantities, kopeck-exact prices, VAT, and totals.
 * - Summary totals (total ordered, total received, VAT amount, grand total).
 * - Statutory signature blocks for Buyer and Supplier.
 *
 * @param order - The purchase order to format.
 * @param clinicName - Optional custom clinic / buyer legal entity name.
 * @returns string - Clean plain-text print summary.
 */
export function formatPurchaseOrderPrintSummary(
	order: PurchaseOrder,
	clinicName?: string,
): string {
	const legalClinicName = clinicName || 'ООО "ДЕНТЕ"';
	const statusLabel = PURCHASE_ORDER_STATUS_LABELS_RU[order.status] ?? order.status;
	const dateCreated = formatDateRu(order.createdAt);
	const deliveryDate = order.expectedDeliveryDate
		? formatDateRu(order.expectedDeliveryDate)
		: "По согласованию сторон";

	const headerSep = "=".repeat(80);
	const sectionSep = "-".repeat(80);

	let totalOrderedUnits = 0;
	let totalReceivedUnits = 0;

	const lineItemsText = order.lines.map((line, index) => {
		totalOrderedUnits += line.orderedQuantity;
		totalReceivedUnits += line.receivedQuantity;

		const num = String(index + 1).padStart(2, " ");
		const skuStr = line.supplierSku ? ` (Артикул поставщика: ${line.supplierSku})` : "";
		const unitPriceStr = formatKopecksToRublesRu(line.unitPriceKopecks);
		const vatLabel = VAT_RATE_LABELS_RU[line.vatRate] ?? String(line.vatRate);
		const lineTotalStr = formatKopecksToRublesRu(line.totalPriceKopecks);

		return [
			` ${num}. ${line.itemName}${skuStr}`,
			`     Заказано: ${line.orderedQuantity} шт. | Принято: ${line.receivedQuantity} шт.`,
			`     Цена за ед.: ${unitPriceStr} | Ставка НДС: ${vatLabel}`,
			`     Стоимость по строке: ${lineTotalStr}`,
		].join("\n");
	});

	const specificationSection =
		order.lines.length > 0
			? lineItemsText.join("\n\n")
			: " [Позиции заказа отсутствуют]";

	const grandTotalStr = formatKopecksToRublesRu(order.totalAmountKopecks);
	const grandVatStr = formatKopecksToRublesRu(order.vatAmountKopecks);

	return [
		headerSep,
		`                     ДОГОВОР-ЗАКАЗ ПОСТАВЩИКУ № ${order.orderNumber}`,
		headerSep,
		`Покупатель (Заказчик):  ${legalClinicName}`,
		`Поставщик:              ${order.supplierName} (ID: ${order.supplierId})`,
		`Дата составления:       ${dateCreated}`,
		`Статус заказа:          ${statusLabel}`,
		`Ожидаемый срок поставки:${deliveryDate}`,
		sectionSep,
		"СПЕЦИФИКАЦИЯ ТОВАРОВ К ПОСТАВКЕ:",
		sectionSep,
		specificationSection,
		sectionSep,
		"ИТОГОВЫЙ РАСЧЕТ:",
		`Всего номенклатурных позиций:     ${order.lines.length}`,
		`Всего единиц товара к поставке:   ${totalOrderedUnits}`,
		`Всего единиц товара принято:      ${totalReceivedUnits}`,
		`Сумма НДС:                        ${grandVatStr}`,
		`Итого к оплате (с учетом НДС):    ${grandTotalStr}`,
		headerSep,
		"ПОДПИСИ СТОРОН:",
		"",
		"Заказчик (Покупатель):                         Поставщик:",
		"",
		"____________________ / ____________________ /   ____________________ / ____________________ /",
		"М.П.                                            М.П.",
		headerSep,
	].join("\n");
}

// ─── 6. DENTALPIN PROCUREMENT TRANSITIONS & BATCHES ───────────────────────────

/**
 * Validates whether a procurement purchase order status transition is allowed.
 */
export function validatePurchaseOrderStatusTransition(
	fromStatus: ProcurementOrderStatus,
	toStatus: ProcurementOrderStatus,
): boolean {
	if (fromStatus === toStatus) return false;
	const allowed = ALLOWED_PROCUREMENT_PO_TRANSITIONS[fromStatus];
	return allowed ? allowed.includes(toStatus) : false;
}

/**
 * Transitions a purchase order status if allowed, throwing an error otherwise.
 */
export function transitionPurchaseOrderStatus(
	order: PurchaseOrderRecord,
	toStatus: ProcurementOrderStatus,
): PurchaseOrderRecord {
	if (!validatePurchaseOrderStatusTransition(order.status, toStatus)) {
		throw new Error(
			`Status transition from "${order.status}" to "${toStatus}" is not permitted for purchase order ${order.id}`,
		);
	}
	return {
		...order,
		status: toStatus,
		updatedAt: new Date().toISOString(),
	};
}

/**
 * Computes line fulfillment status based on ordered vs received quantities.
 */
export function computePurchaseOrderLineStatus(
	quantityOrdered: number,
	quantityReceived: number,
): PurchaseOrderLineStatus {
	if (quantityReceived <= 0) return "unfulfilled";
	if (quantityReceived < quantityOrdered) return "partially_received";
	if (quantityReceived === quantityOrdered) return "fully_received";
	return "over_received";
}

/**
 * Creates a new purchase order record in draft status with calculated totals.
 */
export function createPurchaseOrderRecord(params: CreatePurchaseOrderParams): PurchaseOrderRecord {
	if (params.lines.length === 0) {
		throw new Error("Purchase order must contain at least one line item");
	}

	const seenItemIds = new Set<string>();
	for (const line of params.lines) {
		if (seenItemIds.has(line.inventoryItemId)) {
			throw new Error(`Duplicate inventoryItemId "${line.inventoryItemId}" in purchase order lines`);
		}
		seenItemIds.add(line.inventoryItemId);
		if (line.quantityOrdered <= 0) {
			throw new Error(`Quantity ordered must be positive for item "${line.itemName}"`);
		}
		if (line.unitPriceKopecks < 0) {
			throw new Error(`Unit price cannot be negative for item "${line.itemName}"`);
		}
	}

	let totalAmountKopecks = 0;
	let lineIdx = 1;
	const lines: PurchaseOrderLine[] = params.lines.map((l) => {
		const lineTotal = Math.round(l.quantityOrdered * l.unitPriceKopecks);
		totalAmountKopecks += lineTotal;
		return {
			id: l.id ?? `pol-${Date.now()}-${lineIdx++}`,
			inventoryItemId: l.inventoryItemId,
			itemName: l.itemName,
			quantityOrdered: l.quantityOrdered,
			quantityReceived: 0,
			unitPriceKopecks: l.unitPriceKopecks,
			status: "unfulfilled",
		};
	});

	const orderId = params.id ?? generatePurchaseOrderId();
	const now = new Date().toISOString();

	return {
		id: orderId,
		clinicId: params.clinicId,
		supplierId: params.supplierId,
		supplierName: params.supplierName,
		status: "draft",
		expectedDate: params.expectedDate ?? null,
		notes: params.notes ?? null,
		lines,
		receipts: [],
		totalAmountKopecks,
		receivedAmountKopecks: 0,
		createdAt: now,
		updatedAt: now,
	};
}

/**
 * Receives a delivery batch against a purchase order with good/rejected quality verdicts.
 */
export function receiveDeliveryBatch(
	order: PurchaseOrderRecord,
	batch: ReceiveDeliveryBatchInput,
	options?: ReceiveDeliveryBatchOptions,
): ReceiveDeliveryBatchResult {
	if (!RECEIVABLE_PROCUREMENT_STATUSES.includes(order.status)) {
		throw new Error(
			`Purchase order in status "${order.status}" cannot receive deliveries. Status must be "sent" or "confirmed".`,
		);
	}

	if (batch.lines.length === 0) {
		throw new Error("Delivery batch must contain at least one line item");
	}

	const lineMap = new Map<string, PurchaseOrderLine>(
		order.lines.map((l) => [l.id, { ...l }]),
	);

	const receiptId = batch.receiptId ?? generatePurchaseReceiptId();
	const receivedAt = batch.receivedAt ?? new Date().toISOString();
	let receiptLineIdx = 1;

	const receiptLines: PurchaseReceiptLine[] = [];
	let totalGoodQuantity = 0;
	let totalRejectedQuantity = 0;

	for (const entry of batch.lines) {
		const line = lineMap.get(entry.purchaseOrderLineId);
		if (!line) {
			throw new Error(
				`Receipt line references unknown purchaseOrderLineId "${entry.purchaseOrderLineId}" in PO ${order.id}`,
			);
		}

		if (entry.quantityReceived <= 0) {
			throw new Error(
				`Received quantity must be positive, got ${entry.quantityReceived} for line "${line.itemName}"`,
			);
		}

		if (entry.quality === "good") {
			const nextReceived = line.quantityReceived + entry.quantityReceived;
			if (nextReceived > line.quantityOrdered && !options?.allowOverdelivery) {
				throw new Error(
					`Received quantity (${nextReceived}) exceeds ordered quantity (${line.quantityOrdered}) for line "${line.itemName}". Overdelivery flag required.`,
				);
			}
			line.quantityReceived = nextReceived;
			totalGoodQuantity += entry.quantityReceived;
		} else {
			totalRejectedQuantity += entry.quantityReceived;
		}

		line.status = computePurchaseOrderLineStatus(line.quantityOrdered, line.quantityReceived);

		receiptLines.push({
			id: `rcptl-${receiptId}-${receiptLineIdx++}`,
			purchaseOrderLineId: line.id,
			inventoryItemId: line.inventoryItemId,
			quantityReceived: entry.quantityReceived,
			quality: entry.quality,
		});
	}

	const updatedLines = order.lines.map((l) => lineMap.get(l.id)!);
	const fullyReceived =
		updatedLines.length > 0 &&
		updatedLines.every((l) => l.quantityReceived >= l.quantityOrdered);

	let receivedAmountKopecks = 0;
	for (const l of updatedLines) {
		receivedAmountKopecks += Math.round(l.quantityReceived * l.unitPriceKopecks);
	}

	const newReceipt: PurchaseReceipt = {
		id: receiptId,
		purchaseOrderId: order.id,
		receivedAt,
		receivedBy: batch.receivedBy ?? null,
		lines: receiptLines,
	};

	const nextStatus: ProcurementOrderStatus = fullyReceived ? "received" : order.status;

	const updatedOrder: PurchaseOrderRecord = {
		...order,
		status: nextStatus,
		lines: updatedLines,
		receipts: [...order.receipts, newReceipt],
		receivedAmountKopecks,
		updatedAt: new Date().toISOString(),
	};

	return {
		updatedOrder,
		receipt: newReceipt,
		fullyReceived,
		totalGoodQuantity,
		totalRejectedQuantity,
	};
}

// ─── 7. REGULATORY FORM M-7 A4 (МАТЕРИАЛЬНЫЙ АКТ ПРИЕМКИ) ─────────────────────

/**
 * Formats a clean, statutory Russian Form M-7 / TORG-1 material receipt act (Акт о приемке материалов).
 * Adheres strictly to Mandate 8d p. 7: ZERO EMOJIS!
 */
export function formatMaterialReceiptActM7A4(
	order: PurchaseOrderRecord,
	options?: FormatMaterialReceiptActM7Options,
): string {
	const clinicName = options?.clinicName || 'ООО "ДЕНТЕ"';
	const actNumber = options?.actNumber || `М7-${order.id.replace(/^po-/, "")}`;
	const actDate = formatDateRu(options?.actDate || new Date().toISOString());
	const president = options?.commissionPresident || "Главный врач клиники";
	const members = options?.commissionMembers || ["Старшая медицинская сестра", "Заведующий складом"];
	const storekeeper = options?.storekeeperName || "Материально ответственное лицо";
	const docNum = options?.supplierDocumentNumber || `СФ-${order.id}`;
	const docDate = formatDateRu(options?.supplierDocumentDate || order.expectedDate || new Date().toISOString());

	const sep = "=".repeat(80);
	const subSep = "-".repeat(80);

	// Aggregate good and rejected quantities across all receipts
	const goodQtyByLine = new Map<string, number>();
	const rejectedQtyByLine = new Map<string, number>();

	for (const receipt of order.receipts) {
		for (const rline of receipt.lines) {
			if (rline.quality === "good") {
				goodQtyByLine.set(
					rline.purchaseOrderLineId,
					(goodQtyByLine.get(rline.purchaseOrderLineId) ?? 0) + rline.quantityReceived,
				);
			} else {
				rejectedQtyByLine.set(
					rline.purchaseOrderLineId,
					(rejectedQtyByLine.get(rline.purchaseOrderLineId) ?? 0) + rline.quantityReceived,
				);
			}
		}
	}

	let totalOrderedUnits = 0;
	let totalGoodUnits = 0;
	let totalRejectedUnits = 0;
	let totalAcceptedKopecks = 0;

	const lineRows = order.lines.map((line, index) => {
		const num = String(index + 1).padStart(2, " ");
		const goodQty = goodQtyByLine.get(line.id) ?? line.quantityReceived;
		const rejectedQty = rejectedQtyByLine.get(line.id) ?? 0;
		const lineAcceptedKopecks = Math.round(goodQty * line.unitPriceKopecks);

		totalOrderedUnits += line.quantityOrdered;
		totalGoodUnits += goodQty;
		totalRejectedUnits += rejectedQty;
		totalAcceptedKopecks += lineAcceptedKopecks;

		const priceStr = formatKopecksToRublesRu(line.unitPriceKopecks);
		const sumStr = formatKopecksToRublesRu(lineAcceptedKopecks);

		return [
			` ${num}. ${line.itemName} (Код: ${line.inventoryItemId})`,
			`     Заказано: ${line.quantityOrdered} шт. | Принято годных: ${goodQty} шт. | Брак/дефект: ${rejectedQty} шт.`,
			`     Цена за ед.: ${priceStr} | Сумма принятого: ${sumStr}`,
		].join("\n");
	});

	const itemsSection = lineRows.length > 0 ? lineRows.join("\n\n") : " [Позиции отсутствуют]";
	const hasDiscrepancy = totalRejectedUnits > 0 || totalGoodUnits !== totalOrderedUnits;

	const conclusionText = hasDiscrepancy
		? `ВНИМАНИЕ: При приемке выявлены расхождения/дефекты. Принято годных: ${totalGoodUnits} шт., забраковано: ${totalRejectedUnits} шт. Составлена рекламация поставщику.`
		: "ЗАКЛЮЧЕНИЕ КОМИССИИ: Материалы поступили в полном объеме, надлежащего качества, дефектов и повреждений тары не обнаружено. Оприходовано на баланс склада.";

	return [
		sep,
		"               ТИПОВАЯ МЕЖОТРАСЛЕВАЯ ФОРМА № М-7 (ТОРГ-1)",
		"          Утверждена постановлением Госкомстата России от 30.10.97 № 71а",
		`                     АКТ О ПРИЕМКЕ МАТЕРИАЛОВ № ${actNumber}`,
		sep,
		`Организация-получатель:   ${clinicName}`,
		`Поставщик:                ${order.supplierName} (ID: ${order.supplierId})`,
		`Дата составления акта:    ${actDate}`,
		`Документ поставщика:      Накладная/УПД № ${docNum} от ${docDate}`,
		`Номер заказа (PO):        ${order.id}`,
		subSep,
		"СОСТАВ КОМИССИИ:",
		`Председатель комиссии:    ${president}`,
		`Члены комиссии:           ${members.join(", ")}`,
		subSep,
		"ВЕДОМОСТЬ ПРИНЯТЫХ МАТЕРИАЛОВ И РАСХОЖДЕНИЙ:",
		subSep,
		itemsSection,
		subSep,
		"ИТОГИ ПРИЕМКИ:",
		`Всего номенклатурных позиций:          ${order.lines.length}`,
		`Всего единиц по заказу:                ${totalOrderedUnits} шт.`,
		`Фактически принято годных (Good):      ${totalGoodUnits} шт.`,
		`Забраковано / дефект / бой (Rejected): ${totalRejectedUnits} шт.`,
		`Общая сумма принятых материалов:      ${formatKopecksToRublesRu(totalAcceptedKopecks)}`,
		subSep,
		conclusionText,
		sep,
		"ПОДПИСИ ЧЛЕНОВ КОМИССИИ:",
		"",
		`Председатель комиссии:     ____________________ / ${president} /`,
		"",
		...members.map((m) => `Член комиссии:             ____________________ / ${m} /`),
		"",
		`Материально ответственное`,
		`лицо (принял на склад):    ____________________ / ${storekeeper} /`,
		sep,
	].join("\n");
}
