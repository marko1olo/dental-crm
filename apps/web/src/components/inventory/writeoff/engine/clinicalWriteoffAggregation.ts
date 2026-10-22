import type {
	CabinetStockBatch,
	DiscrepancyReasonCode,
} from "../clinicalWriteoffPresets.js";
import {
	DENTAL_CABINET_STOCK_PRESETS,
	getClinicalMaterialById,
	getOrder804nServiceNorm,
} from "../clinicalWriteoffPresets.js";
import type {
	ClinicalWriteoffLine,
	CompletedClinicalService,
} from "./clinicalWriteoffTypes.js";
import { generateDocumentRowId } from "./clinicalWriteoffTypes.js";
import { calculateLineCostKopecks } from "./clinicalWriteoffMath.js";
import {
	evaluateStockAvailability,
	findBestBatchFefo,
} from "./clinicalWriteoffFefo.js";
import { validateWriteoffDocument } from "./clinicalWriteoffValidation.js";

export { validateWriteoffDocument };

export function aggregateWriteoffFromServices(
	completedServices: readonly CompletedClinicalService[],
	stockBatches: readonly CabinetStockBatch[] = DENTAL_CABINET_STOCK_PRESETS,
	cabinetId?: string,
	referenceDateIso: string = new Date().toISOString().slice(0, 10),
): ClinicalWriteoffLine[] {
	const lines: ClinicalWriteoffLine[] = [];

	for (const service of completedServices) {
		const norm = getOrder804nServiceNorm(service.serviceCode);
		const serviceTitle = service.serviceTitle || norm?.serviceTitle || `Услуга ${service.serviceCode}`;
		const multiplier = Math.max(1, service.quantityMultiplier || 1);

		if (norm && norm.materials.length > 0) {
			for (const normItem of norm.materials) {
				const material = getClinicalMaterialById(normItem.materialId);
				if (!material) continue;

				const stdQty = Number((normItem.standardQuantity * multiplier).toFixed(4));
				const fefoResult = findBestBatchFefo(material.id, stdQty, stockBatches, cabinetId, referenceDateIso);
				const unitCostKopecks = fefoResult.batch?.unitCostKopecks ?? material.defaultUnitCostKopecks;
				const stockAvailable = fefoResult.batch?.quantityAvailable ?? 0;
				const criticalThreshold = fefoResult.batch?.criticalThreshold ?? 0;
				const stockStatus = evaluateStockAvailability(stockAvailable, stdQty, criticalThreshold);

				lines.push({
					id: `line_${service.serviceCode}_${material.id}_${Date.now()}_${generateDocumentRowId()}`,
					serviceCode: service.serviceCode,
					serviceTitle,
					toothNumber: service.toothNumber,
					materialId: material.id,
					sku: material.sku,
					nameRu: material.nameRu,
					category: material.category,
					unit: material.unit,
					okeiCode: material.okeiCode,
					standardQuantity: stdQty,
					actualQuantity: stdQty,
					discrepancyQuantity: 0,
					discrepancyReasonCode: "standard_consumption",
					batchId: fefoResult.batch?.batchId,
					lotNumber: fefoResult.batch?.lotNumber,
					serialNumber: fefoResult.batch?.serialNumber,
					expirationDate: fefoResult.batch?.expirationDate,
					daysUntilExpiration: fefoResult.daysUntilExpiration,
					isExpiringSoon: fefoResult.isExpiringSoon,
					isExpired: fefoResult.isExpired,
					cabinetId: fefoResult.batch?.cabinetId || cabinetId,
					cabinetNameRu: fefoResult.batch?.cabinetNameRu,
					stockAvailable,
					criticalThreshold,
					stockStatus,
					unitCostKopecks,
					totalCostKopecks: calculateLineCostKopecks(unitCostKopecks, stdQty),
					isMandatory: normItem.isMandatory,
					requiresLotTracking: material.requiresLotTracking,
					requiresSerialNumber: material.requiresSerialNumber,
				});
			}
		}
	}
	return lines;
}

export function updateLineActualQuantity(
	line: ClinicalWriteoffLine,
	newActualQuantity: number,
	reasonCode?: DiscrepancyReasonCode,
	customNotes?: string,
): ClinicalWriteoffLine {
	const validQty = Math.max(0, Number(newActualQuantity.toFixed(4)));
	const discrepancyQuantity = Number((validQty - line.standardQuantity).toFixed(4));

	let effectiveReason = reasonCode || line.discrepancyReasonCode;
	if (discrepancyQuantity === 0 && !reasonCode) {
		effectiveReason = "standard_consumption";
	} else if (discrepancyQuantity !== 0 && effectiveReason === "standard_consumption") {
		effectiveReason = discrepancyQuantity > 0 ? "anatomical_complexity" : "standard_consumption";
	}

	const totalCostKopecks = calculateLineCostKopecks(line.unitCostKopecks, validQty);
	const stockStatus = evaluateStockAvailability(line.stockAvailable, validQty, line.criticalThreshold);

	return {
		...line,
		actualQuantity: validQty,
		discrepancyQuantity,
		discrepancyReasonCode: effectiveReason,
		discrepancyNotes: customNotes !== undefined ? customNotes : line.discrepancyNotes,
		totalCostKopecks,
		stockStatus,
	};
}
