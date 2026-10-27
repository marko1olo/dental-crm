import { formatKopecksRu } from "../../utils/money.js";
import { roundQuantity, calculateServiceConsumables } from "./consumableLinkManager.js";
import { processConsumablesStockDeduction } from "./consumableSoftOverdraft.js";
import type {
	BatchTreatmentConsumablesResult,
	ConsumableDeductionItem,
	ConsumableDeductionRequest,
	ConsumableDeductionResult,
	ConsumableItemLink,
	TreatmentConsumableLink,
	TreatmentDeductionResult,
	TreatmentPerformedEvent,
} from "./consumableTypes.js";

export function calculateConsumablesForTreatment(
	event: TreatmentPerformedEvent,
	links: TreatmentConsumableLink[],
	currentStocks: Record<string, number>,
	allowOverdraft = true,
): TreatmentDeductionResult {
	const matchingLinks = links.filter((lnk) => lnk.catalogItemId === event.catalogItemId);
	const rawQuantity = event.serviceQuantity ?? 1;
	const serviceMultiplier = Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 1;
	const deductionTimestamp = event.performedAt || new Date().toISOString();

	if (matchingLinks.length === 0) {
		return { treatmentReferenceId: event.treatmentReferenceId, catalogItemId: event.catalogItemId, items: [], hasOverdraft: false, deductionTimestamp };
	}

	const localStocks: Record<string, number> = { ...currentStocks };
	const items: ConsumableDeductionItem[] = [];
	let hasOverdraft = false;

	for (const link of matchingLinks) {
		const deductedQuantity = roundQuantity(link.quantityPerService * serviceMultiplier);
		const currentStock = localStocks[link.inventoryItemId] ?? 0;
		const resultingStock = roundQuantity(currentStock - deductedQuantity);
		const isOverdraft = resultingStock < 0;

		if (isOverdraft && !allowOverdraft) {
			throw new Error(
				`Запрет списания: недостаточно остатка на складе для позиции "${link.inventoryItemName}" (ID: ${link.inventoryItemId}). В наличии: ${currentStock} ${link.unit}, требуется: ${deductedQuantity} ${link.unit}`,
			);
		}

		if (isOverdraft) hasOverdraft = true;
		localStocks[link.inventoryItemId] = resultingStock;

		items.push({
			inventoryItemId: link.inventoryItemId, inventoryItemName: link.inventoryItemName,
			unit: link.unit, deductedQuantity, currentStock, resultingStock, isOverdraft,
		});
	}

	return { treatmentReferenceId: event.treatmentReferenceId, catalogItemId: event.catalogItemId, items, hasOverdraft, deductionTimestamp };
}

export function calculateBatchTreatmentConsumables(
	events: TreatmentPerformedEvent[],
	links: TreatmentConsumableLink[],
	initialStocks: Record<string, number>,
	allowOverdraft = true,
): BatchTreatmentConsumablesResult {
	const runningStocks: Record<string, number> = { ...initialStocks };
	const totalDeductedByItem: Record<string, number> = {};
	const results: TreatmentDeductionResult[] = [];

	for (const event of events) {
		const result = calculateConsumablesForTreatment(event, links, runningStocks, allowOverdraft);
		results.push(result);
		for (const item of result.items) {
			runningStocks[item.inventoryItemId] = item.resultingStock;
			totalDeductedByItem[item.inventoryItemId] = roundQuantity(
				(totalDeductedByItem[item.inventoryItemId] ?? 0) + item.deductedQuantity,
			);
		}
	}

	return { results, finalStocks: runningStocks, totalDeductedByItem };
}

export function executeBatchConsumablesDeduction(
	request: ConsumableDeductionRequest,
	links: ConsumableItemLink[],
): ConsumableDeductionResult {
	const plannedConsumables = calculateServiceConsumables(request.renderedServices, links);
	const deduction = processConsumablesStockDeduction(
		plannedConsumables,
		request.currentStockMap,
		{
			allowOverdraft: request.allowOverdraft !== false,
			overdraftMessagePrefix: "Складской овердрафт",
			overdraftMessageSuffix: "Операция не блокируется.",
		},
	);

	return {
		visitId: request.visitId, patientId: request.patientId, doctorId: request.doctorId,
		totalDeductedItems: deduction.deductedItems.length, totalCostPriceKopecks: deduction.totalCostPriceKopecks,
		totalCostPriceRub: formatKopecksRu(deduction.totalCostPriceKopecks), items: deduction.deductedItems,
		softOverdrafts: deduction.softOverdrafts, hasOverdraft: deduction.hasOverdraft,
	};
}
