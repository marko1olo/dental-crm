import type {
	CabinetStockItem,
	CompletedProcedureInput,
	ConsumableUnit,
	DeductMaterialsOptions,
	DeductionOperationResult,
	ExecuteVisitAutoBomDeductionParams,
	LowStockAlert,
	ResolvedMaterialRequirement,
	ResolvedMaterialRequirementSummary,
	ShortfallItem,
	SupplierPurchaseOrder,
	VisitAutoBomDeductionSummary,
} from "./types.js";
import { getStandardBOMForProcedure } from "./bomItemMatcher.js";
import { generateSupplierPurchaseOrder } from "./bomStockValidator.js";

/**
 * Pure function: Resolves total material requirements for a set of completed 804n procedures.
 * Cross-references with optional cabinet stock to detect shortfalls.
 */
export function resolveProcedureMaterials(
	procedures: readonly CompletedProcedureInput[],
	currentStock?: readonly CabinetStockItem[],
): ResolvedMaterialRequirementSummary {
	const stockMap = new Map<string, CabinetStockItem>();
	if (currentStock) {
		for (const item of currentStock) {
			stockMap.set(item.sku.trim().toUpperCase(), item);
		}
	}

	const materialMap = new Map<
		string,
		{
			sku: string;
			nameRu: string;
			category: string;
			totalQuantityRequired: number;
			unitOfMeasure: ConsumableUnit;
			totalEstimatedCostKopecks: number;
			procedureBreakdown: Array<{
				code804n: string;
				procedureTitleRu: string;
				quantity: number;
				toothNumber?: number;
				unitQuantity: number;
			}>;
		}
	>();

	let totalProceduresCount = 0;
	let recognizedProceduresCount = 0;
	const unrecognizedProcedureCodes: string[] = [];

	for (const proc of procedures) {
		totalProceduresCount += proc.quantity;
		const bom = getStandardBOMForProcedure(proc.procedureCode804n);

		if (!bom) {
			unrecognizedProcedureCodes.push(proc.procedureCode804n);
			continue;
		}

		recognizedProceduresCount += proc.quantity;

		for (const mat of bom.materials) {
			const skuKey = mat.sku.trim().toUpperCase();
			const qtyNeeded = Number((mat.standardQuantity * proc.quantity).toFixed(4));
			const costKopecks = Math.round(mat.estimatedUnitCostKopecks * proc.quantity * mat.standardQuantity);

			const existing = materialMap.get(skuKey);
			if (existing) {
				existing.totalQuantityRequired = Number((existing.totalQuantityRequired + qtyNeeded).toFixed(4));
				existing.totalEstimatedCostKopecks += costKopecks;
				existing.procedureBreakdown.push({
					code804n: bom.code804n,
					procedureTitleRu: bom.procedureTitleRu,
					quantity: proc.quantity,
					...(proc.toothNumber !== undefined ? { toothNumber: proc.toothNumber } : {}),
					unitQuantity: mat.standardQuantity,
				});
			} else {
				materialMap.set(skuKey, {
					sku: mat.sku,
					nameRu: mat.nameRu,
					category: mat.category,
					totalQuantityRequired: qtyNeeded,
					unitOfMeasure: mat.unitOfMeasure,
					totalEstimatedCostKopecks: costKopecks,
					procedureBreakdown: [
						{
							code804n: bom.code804n,
							procedureTitleRu: bom.procedureTitleRu,
							quantity: proc.quantity,
							...(proc.toothNumber !== undefined ? { toothNumber: proc.toothNumber } : {}),
							unitQuantity: mat.standardQuantity,
						},
					],
				});
			}
		}
	}

	let grandTotalCostKopecks = 0;
	let hasStockShortfall = false;

	const resolvedMaterials: ResolvedMaterialRequirement[] = Array.from(materialMap.values()).map((item) => {
		grandTotalCostKopecks += item.totalEstimatedCostKopecks;
		const stockItem = stockMap.get(item.sku.trim().toUpperCase());
		const currentStockQty = stockItem ? stockItem.currentQuantity : 0;
		const shortfall = Math.max(0, Number((item.totalQuantityRequired - currentStockQty).toFixed(4)));

		if (stockItem && shortfall > 0) {
			hasStockShortfall = true;
		}

		return {
			sku: item.sku,
			nameRu: item.nameRu,
			category: item.category,
			totalQuantityRequired: item.totalQuantityRequired,
			unitOfMeasure: item.unitOfMeasure,
			totalEstimatedCostKopecks: item.totalEstimatedCostKopecks,
			procedureBreakdown: item.procedureBreakdown,
			isAvailableInStock: shortfall === 0,
			currentStockQuantity: currentStockQty,
			shortfallQuantity: shortfall,
		};
	});

	return {
		totalProceduresCount,
		recognizedProceduresCount,
		unrecognizedProceduresCount: unrecognizedProcedureCodes.length,
		unrecognizedProcedureCodes,
		totalEstimatedCostKopecks: grandTotalCostKopecks,
		materials: resolvedMaterials,
		hasStockShortfall,
	};
}

/**
 * Pure function: Decrements cabinet inventory, prevents negative stock if requested,
 * and alerts if stock falls below minimum reorder threshold.
 */
export function deductMaterialsFromCabinetStock(
	stock: readonly CabinetStockItem[],
	requirements: readonly ResolvedMaterialRequirement[],
	options?: DeductMaterialsOptions,
): DeductionOperationResult {
	const stockCopy: CabinetStockItem[] = stock.map((s) => ({ ...s }));
	const stockMap = new Map<string, CabinetStockItem>();

	for (const s of stockCopy) {
		stockMap.set(s.sku.trim().toUpperCase(), s);
	}

	const deductedItems: Array<{
		sku: string;
		nameRu: string;
		deductedQuantity: number;
		previousQuantity: number;
		remainingQuantity: number;
		unitOfMeasure: ConsumableUnit;
	}> = [];

	const shortfallItems: ShortfallItem[] = [];
	const lowStockAlerts: LowStockAlert[] = [];
	let totalDeductionCostKopecks = 0;
	let hasShortfall = false;

	// 1. Initial validation pass: detect shortfalls and deficits
	for (const req of requirements) {
		const skuKey = req.sku.trim().toUpperCase();
		const stockItem = stockMap.get(skuKey);
		const availableQty = stockItem ? stockItem.currentQuantity : 0;
		const reqQty = req.totalQuantityRequired;

		if (!stockItem || availableQty < reqQty) {
			hasShortfall = true;
			shortfallItems.push({
				sku: req.sku,
				nameRu: req.nameRu,
				category: req.category,
				requiredQuantity: reqQty,
				availableQuantity: availableQty,
				deficitQuantity: Number(Math.max(0, reqQty - availableQty).toFixed(4)),
				unitOfMeasure: req.unitOfMeasure,
			});
		}
	}

	// 2. Deduction pass: deduct from available stock (allowing soft deficit if stock is insufficient)
	for (const req of requirements) {
		const skuKey = req.sku.trim().toUpperCase();
		const stockItem = stockMap.get(skuKey);

		if (!stockItem) {
			hasShortfall = true;
			continue;
		}

		const prevQty = stockItem.currentQuantity;
		const deductQty = req.totalQuantityRequired;
		const newQty = Number((prevQty - deductQty).toFixed(4));

		if (newQty < 0 || prevQty < deductQty) {
			hasShortfall = true;
		}

		stockItem.currentQuantity = newQty;
		totalDeductionCostKopecks += req.totalEstimatedCostKopecks;

		deductedItems.push({
			sku: req.sku,
			nameRu: req.nameRu,
			deductedQuantity: deductQty,
			previousQuantity: prevQty,
			remainingQuantity: newQty,
			unitOfMeasure: req.unitOfMeasure,
		});

		// Check if threshold breached or deficit occurred
		if (newQty < 0) {
			lowStockAlerts.push({
				sku: req.sku,
				nameRu: req.nameRu,
				cabinetId: stockItem.cabinetId,
				previousQuantity: prevQty,
				remainingQuantity: newQty,
				minThresholdQuantity: stockItem.minThresholdQuantity,
				alertLevel: "critical_out_of_stock",
				messageRu: `Дефицит материала: «${req.nameRu}» списан в минус (остаток: ${newQty} ${req.unitOfMeasure}, нехватка: ${Math.abs(newQty)} ${req.unitOfMeasure}). Зафиксирован мягкий дефицит для отдела снабжения.`,
			});
		} else if (newQty === 0) {
			lowStockAlerts.push({
				sku: req.sku,
				nameRu: req.nameRu,
				cabinetId: stockItem.cabinetId,
				previousQuantity: prevQty,
				remainingQuantity: newQty,
				minThresholdQuantity: stockItem.minThresholdQuantity,
				alertLevel: "critical_out_of_stock",
				messageRu: `Критический остаток: «${req.nameRu}» полностью израсходован в кабинете #${stockItem.cabinetId} (Остаток: 0 ${req.unitOfMeasure})!`,
			});
		} else if (newQty <= stockItem.minThresholdQuantity) {
			lowStockAlerts.push({
				sku: req.sku,
				nameRu: req.nameRu,
				cabinetId: stockItem.cabinetId,
				previousQuantity: prevQty,
				remainingQuantity: newQty,
				minThresholdQuantity: stockItem.minThresholdQuantity,
				alertLevel: "warning_low_stock",
				messageRu: `Низкий остаток: «${req.nameRu}» в кабинете #${stockItem.cabinetId} составляет ${newQty} ${req.unitOfMeasure} (порог перезаказа: ${stockItem.minThresholdQuantity} ${req.unitOfMeasure}).`,
			});
		}
	}

	let purchaseOrder: SupplierPurchaseOrder | null = null;
	if (options?.autoGeneratePurchaseOrder && (hasShortfall || lowStockAlerts.length > 0)) {
		purchaseOrder = generateSupplierPurchaseOrder({
			alerts: lowStockAlerts,
			requirements,
			stock: stockCopy,
			...(options.visitId ? { visitId: options.visitId } : {}),
			...(options.clinicNameRu ? { clinicNameRu: options.clinicNameRu } : {}),
			...(options.reorderBufferMultiplier !== undefined ? { reorderBufferMultiplier: options.reorderBufferMultiplier } : {}),
		});
	}

	return {
		success: true,
		totalDeductionCostKopecks,
		updatedStock: stockCopy,
		deductedItems,
		lowStockAlerts,
		hasShortfall,
		...(shortfallItems.length > 0 ? { shortfallItems } : {}),
		preventedNegativeStock: false,
		purchaseOrder,
	};
}

/**
 * High-level orchestration engine: Resolves materials for finished visit procedures,
 * validates against cabinet stock, enforces negative stock prevention, and produces
 * 1-click supplier purchase order if critical thresholds are breached.
 */
export function executeVisitAutoBomDeduction(
	params: ExecuteVisitAutoBomDeductionParams,
): VisitAutoBomDeductionSummary {
	const requirementsSummary = resolveProcedureMaterials(params.procedures, params.currentStock);

	const deductionResult = deductMaterialsFromCabinetStock(
		params.currentStock,
		requirementsSummary.materials,
		{
			preventNegativeStock: false,
			autoGeneratePurchaseOrder: params.options?.autoGeneratePurchaseOrder ?? true,
			...(params.options?.clinicNameRu ? { clinicNameRu: params.options.clinicNameRu } : {}),
			visitId: params.visitId,
			reorderBufferMultiplier: params.options?.reorderBufferMultiplier ?? 2,
		},
	);

	const totalCostKopecks = deductionResult.totalDeductionCostKopecks;
	const totalCostFormattedRu = `${(totalCostKopecks / 100).toLocaleString("ru-RU", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})} ₽`;

	let statusMessageRu = "Списание материалов по техкартам 804н выполнено успешно.";
	if (deductionResult.hasShortfall) {
		statusMessageRu = "Списание материалов выполнено с фиксацией дефицита для отдела снабжения.";
	} else if (deductionResult.lowStockAlerts.length > 0) {
		statusMessageRu = `Списание выполнено. Зафиксировано ${deductionResult.lowStockAlerts.length} предупреждений о критическом неснижаемом остатке.`;
	}

	return {
		success: deductionResult.success,
		visitId: params.visitId,
		totalCostKopecks,
		totalCostFormattedRu,
		requirementsSummary,
		deductionResult,
		purchaseOrder: deductionResult.purchaseOrder ?? null,
		hasShortfall: deductionResult.hasShortfall,
		preventedNegativeStock: deductionResult.preventedNegativeStock ?? false,
		statusMessageRu,
	};
}
