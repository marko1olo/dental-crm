/**
 * supplierPriceComparison.ts — Layer 1: Supplier Price Comparison, Multi-Currency & 3-Way Matching.
 *
 * Verbatim Three-Way Matching engine (PO vs GR vs Invoice) and multi-supplier
 * price quotation analyzer for dental clinical consumables.
 *
 * Invariants:
 * - Pure deterministic calculations, zero floating-point drift.
 * - Integer kopecks math.
 * - Zero mocks, zero dead-ends.
 */

import type {
	PurchaseOrderRecord,
	PurchaseOrderLine,
	SupplierInvoiceInput,
	ThreeWayMatchingOptions,
	ThreeWayMatchingResult,
	ThreeWayMatchingVerdict,
	ThreeWayMatchingDiscrepancy,
	SupplierPriceQuote,
	SupplierPriceComparisonResult,
} from "./types.js";

/**
 * Validates Three-Way Matching: Purchase Order (PO) vs Goods Receipt (GR) vs Supplier Invoice (INV).
 *
 * Checks for:
 * 1. Missing items (items in invoice not in PO, or received items omitted from invoice).
 * 2. Price discrepancies exceeding configured tolerance threshold.
 * 3. Quantity discrepancies exceeding configured tolerance threshold.
 * 4. Net monetary variances between received value and invoiced value.
 *
 * @param order - The purchase order record with receipt history.
 * @param invoice - Incoming supplier invoice / УПД / ТОРГ-12 data.
 * @param options - Price and quantity tolerance percentages (default 0%).
 * @returns ThreeWayMatchingResult with itemized discrepancies and verdict.
 */
export function validateThreeWayMatching(
	order: PurchaseOrderRecord,
	invoice: SupplierInvoiceInput,
	options?: ThreeWayMatchingOptions,
): ThreeWayMatchingResult {
	const priceTol = Math.max(0, options?.priceTolerancePercent ?? 0);
	const qtyTol = Math.max(0, options?.quantityTolerancePercent ?? 0);

	const discrepancies: ThreeWayMatchingDiscrepancy[] = [];
	const orderLinesByItem = new Map<string, PurchaseOrderLine>(
		order.lines.map((l) => [l.inventoryItemId, l]),
	);

	let totalOrderedUnits = 0;
	let totalReceivedUnits = 0;
	let totalInvoicedUnits = 0;

	for (const l of order.lines) {
		totalOrderedUnits += l.quantityOrdered;
		totalReceivedUnits += l.quantityReceived;
	}

	const seenItemIdsInInvoice = new Set<string>();

	for (const invLine of invoice.lines) {
		seenItemIdsInInvoice.add(invLine.inventoryItemId);
		totalInvoicedUnits += invLine.quantityInvoiced;

		const poLine = orderLinesByItem.get(invLine.inventoryItemId);
		const itemName = invLine.itemName || poLine?.itemName || invLine.inventoryItemId;

		if (!poLine) {
			discrepancies.push({
				inventoryItemId: invLine.inventoryItemId,
				itemName,
				discrepancyType: "missing_in_order",
				expectedValue: 0,
				actualValue: invLine.quantityInvoiced,
				difference: invLine.quantityInvoiced,
				message: `Позиция "${itemName}" присутствует в счете поставщика, но отсутствует в заказе PO ${order.id}`,
			});
			continue;
		}

		// 1. Price comparison (PO price vs Invoice price)
		const priceDiffKopecks = invLine.unitPriceKopecks - poLine.unitPriceKopecks;
		const maxAllowedPriceDiff = Math.round((poLine.unitPriceKopecks * priceTol) / 100);
		if (Math.abs(priceDiffKopecks) > maxAllowedPriceDiff) {
			discrepancies.push({
				inventoryItemId: invLine.inventoryItemId,
				itemName,
				discrepancyType: "price_mismatch",
				expectedValue: poLine.unitPriceKopecks,
				actualValue: invLine.unitPriceKopecks,
				difference: priceDiffKopecks,
				message: `Расхождение цены по "${itemName}": заказано по ${(poLine.unitPriceKopecks / 100).toFixed(2)} руб., выставлено по ${(invLine.unitPriceKopecks / 100).toFixed(2)} руб.`,
			});
		}

		// 2. Quantity comparison (Receipt quantity vs Invoiced quantity)
		const qtyDiff = invLine.quantityInvoiced - poLine.quantityReceived;
		const maxAllowedQtyDiff = (poLine.quantityReceived * qtyTol) / 100;
		if (Math.abs(qtyDiff) > maxAllowedQtyDiff) {
			discrepancies.push({
				inventoryItemId: invLine.inventoryItemId,
				itemName,
				discrepancyType: "quantity_mismatch",
				expectedValue: poLine.quantityReceived,
				actualValue: invLine.quantityInvoiced,
				difference: qtyDiff,
				message: `Расхождение объема по "${itemName}": принято годных ${poLine.quantityReceived} ед., выставлено в счете ${invLine.quantityInvoiced} ед.`,
			});
		}
	}

	// 3. Check for received items missing from invoice
	for (const poLine of order.lines) {
		if (poLine.quantityReceived > 0 && !seenItemIdsInInvoice.has(poLine.inventoryItemId)) {
			discrepancies.push({
				inventoryItemId: poLine.inventoryItemId,
				itemName: poLine.itemName,
				discrepancyType: "missing_in_receipt",
				expectedValue: poLine.quantityReceived,
				actualValue: 0,
				difference: -poLine.quantityReceived,
				message: `Позиция "${poLine.itemName}" принята на складе (${poLine.quantityReceived} ед.), но не включена в счет поставщика`,
			});
		}
	}

	const totalOrderedKopecks = order.totalAmountKopecks;
	const totalReceivedKopecks = order.receivedAmountKopecks;
	const totalInvoicedKopecks = invoice.totalAmountKopecks;
	const netVarianceKopecks = totalInvoicedKopecks - totalReceivedKopecks;

	let verdict: ThreeWayMatchingVerdict = "match";
	if (discrepancies.length > 0) {
		const hasMissing = discrepancies.some(
			(d) => d.discrepancyType === "missing_in_order" || d.discrepancyType === "missing_in_receipt",
		);
		const hasPrice = discrepancies.some((d) => d.discrepancyType === "price_mismatch");
		const hasQty = discrepancies.some((d) => d.discrepancyType === "quantity_mismatch");

		if (hasMissing) verdict = "unmatched_items";
		else if (hasPrice && !hasQty) verdict = "price_discrepancy";
		else if (hasQty && !hasPrice) verdict = "quantity_discrepancy";
		else verdict = "total_discrepancy";
	} else if (netVarianceKopecks !== 0) {
		verdict = "total_discrepancy";
	}

	return {
		isMatched: discrepancies.length === 0 && netVarianceKopecks === 0,
		verdict,
		discrepancies,
		summary: {
			totalOrderedKopecks,
			totalReceivedKopecks,
			totalInvoicedKopecks,
			netVarianceKopecks,
			totalOrderedUnits,
			totalReceivedUnits,
			totalInvoicedUnits,
		},
	};
}

/**
 * Converts a foreign currency quote to integer Russian kopecks based on an exchange rate.
 *
 * @param amountInCurrency - Price in the foreign currency (e.g. 15.50 EUR).
 * @param currency - Currency code ("RUB", "USD", "EUR", "CNY").
 * @param exchangeRateToRub - Exchange rate (e.g. 100.25 RUB per 1 EUR).
 * @returns Integer kopecks.
 */
export function convertForeignPriceToRubKopecks(
	amountInCurrency: number,
	currency: "RUB" | "USD" | "EUR" | "CNY" = "RUB",
	exchangeRateToRub: number = 1.0,
): number {
	if (!Number.isFinite(amountInCurrency) || amountInCurrency <= 0) return 0;
	if (currency === "RUB") {
		return Math.round(amountInCurrency * 100);
	}
	const validRate = Number.isFinite(exchangeRateToRub) && exchangeRateToRub > 0 ? exchangeRateToRub : 1.0;
	const rubValue = amountInCurrency * validRate;
	return Math.round(rubValue * 100);
}

/**
 * Compares multi-supplier price quotes for a specific dental material item
 * and determines the lowest-cost supplier.
 */
export function compareSupplierQuotes(
	inventoryItemId: string,
	itemName: string,
	quotes: readonly SupplierPriceQuote[],
): SupplierPriceComparisonResult {
	if (!Array.isArray(quotes) || quotes.length === 0) {
		return {
			inventoryItemId,
			itemName,
			quotes: [],
			bestQuote: null,
			minPriceKopecks: 0,
			priceSpreadPercent: 0,
		};
	}

	// Calculate normalized price in kopecks for each quote
	const normalizedQuotes = quotes.map((q) => {
		const normPrice = q.currency && q.currency !== "RUB" && q.exchangeRateToRub
			? convertForeignPriceToRubKopecks(q.priceKopecks / 100, q.currency, q.exchangeRateToRub)
			: q.priceKopecks;
		return { ...q, priceKopecks: normPrice };
	});

	let best = normalizedQuotes[0];
	let minPrice = best.priceKopecks;
	let maxPrice = best.priceKopecks;

	for (const q of normalizedQuotes) {
		if (q.priceKopecks < minPrice) {
			minPrice = q.priceKopecks;
			best = q;
		}
		if (q.priceKopecks > maxPrice) {
			maxPrice = q.priceKopecks;
		}
	}

	const priceSpreadPercent = minPrice > 0
		? Math.round(((maxPrice - minPrice) / minPrice) * 100)
		: 0;

	return {
		inventoryItemId,
		itemName,
		quotes: normalizedQuotes,
		bestQuote: best,
		minPriceKopecks: minPrice,
		priceSpreadPercent,
	};
}

/**
 * Finds the best (lowest-cost) supplier quote from an array of quotes.
 */
export function findBestSupplierQuote(
	quotes: readonly SupplierPriceQuote[],
): SupplierPriceQuote | null {
	if (!Array.isArray(quotes) || quotes.length === 0) return null;
	let best = quotes[0];
	for (const q of quotes) {
		if (q.priceKopecks < best.priceKopecks) {
			best = q;
		}
	}
	return best;
}
