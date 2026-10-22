import {
	CLINICAL_MATERIALS_CATALOG,
	DENTAL_CABINET_STOCK_PRESETS,
	getClinicalMaterialById,
} from "../clinicalWriteoffPresets.js";
import {
	type ClinicalWriteoffDocument,
	type ClinicalWriteoffLine,
	calculateClinicalWriteoffTotals,
	calculateLineCostKopecks,
	evaluateStockAvailability,
	findBestBatchFefo,
	generateDocumentRowId,
} from "../clinicalWriteoffEngine.js";
import { createQuickAnesthesiaPackageWriteoffDocument } from "./quickAnesthesiaPackageDocument.js";
import type { QuickCarpuleWriteoffParams } from "./quickCarpuleParams.js";

export type { QuickCarpuleWriteoffParams };

export function createQuickCarpuleWriteoffDocument(
	params: QuickCarpuleWriteoffParams = {},
): ClinicalWriteoffDocument {
	if (params.includePackage) {
		return createQuickAnesthesiaPackageWriteoffDocument({
			carpuleCount: params.count,
			carpuleMaterialId: params.materialId,
			cabinetId: params.cabinetId,
			cabinetNameRu: params.cabinetNameRu,
			actDate: params.actDate,
			nurseFullName: params.nurseFullName,
			nurseRole: params.nurseRole,
			notes: params.notes,
			stockBatches: params.stockBatches,
			statutoryFormType: params.statutoryFormType,
		});
	}

	const materialId = params.materialId || "mat_articaine_ultracain";
	const material =
		getClinicalMaterialById(materialId) ||
		CLINICAL_MATERIALS_CATALOG.find((m) => m.category === "anesthesia") ||
		CLINICAL_MATERIALS_CATALOG[0]!;
	const count = Math.max(1, params.count ?? 1);
	const batches = params.stockBatches || DENTAL_CABINET_STOCK_PRESETS;
	const cabinetId = params.cabinetId || "cab-01";
	const cabinetNameRu = params.cabinetNameRu || "Кабинет терапевтической стоматологии №1";
	const actDate = params.actDate || new Date().toISOString().slice(0, 10);
	const nurseFullName = params.nurseFullName || "Смирнова Анна Викторовна";
	const nurseRole = params.nurseRole || "Старшая медицинская сестра";

	const fefoResult = findBestBatchFefo(material.id, count, batches, cabinetId, actDate);
	const unitCostKopecks = fefoResult.batch?.unitCostKopecks ?? material.defaultUnitCostKopecks;
	const stockAvailable = fefoResult.batch?.quantityAvailable ?? 100;
	const criticalThreshold = fefoResult.batch?.criticalThreshold ?? 10;
	const stockStatus = evaluateStockAvailability(stockAvailable, count, criticalThreshold);

	const line: ClinicalWriteoffLine = {
		id: `line_carpule_${Date.now()}_${generateDocumentRowId()}`,
		serviceCode: "A16.07.030.001",
		serviceTitle: "Утилизация пустых карпул/ампул анестетика",
		toothNumber: undefined,
		materialId: material.id,
		sku: material.sku,
		nameRu: material.nameRu,
		category: material.category,
		unit: material.unit,
		okeiCode: material.okeiCode,
		standardQuantity: count,
		actualQuantity: count,
		discrepancyQuantity: 0,
		discrepancyReasonCode: "standard_consumption",
		discrepancyNotes: params.notes || "Экспресс-списание использованных карпул анестетика",
		batchId: fefoResult.batch?.batchId,
		lotNumber: params.lotNumber || fefoResult.batch?.lotNumber || "LOT-ART-2026",
		serialNumber: undefined,
		expirationDate: fefoResult.batch?.expirationDate || "2027-12-31",
		daysUntilExpiration: fefoResult.daysUntilExpiration,
		isExpiringSoon: fefoResult.isExpiringSoon,
		isExpired: false,
		cabinetId,
		cabinetNameRu,
		stockAvailable,
		criticalThreshold,
		stockStatus,
		unitCostKopecks,
		totalCostKopecks: calculateLineCostKopecks(unitCostKopecks, count),
		isMandatory: true,
		requiresLotTracking: material.requiresLotTracking,
		requiresSerialNumber: false,
	};

	const totals = calculateClinicalWriteoffTotals([line], 1);
	return {
		id: `doc_carpule_${Date.now()}_${generateDocumentRowId()}`,
		actNumber: `КАРП-${Date.now().toString().slice(-6)}`,
		actDate,
		patientName: "Списание пустых карпул (кабинет)",
		doctorFullName: nurseFullName,
		doctorSpecialty: nurseRole,
		assistantFullName: nurseFullName,
		cabinetId,
		cabinetNameRu,
		completedServices: [{ serviceCode: "A16.07.030.001", serviceTitle: "Утилизация использованных карпул/ампул анестетика", quantityMultiplier: count }],
		lines: [line],
		totals,
		statutoryFormType: params.statutoryFormType || "0504230",
		status: "confirmed",
		notes: params.notes || "Единоличное экспресс-списание использованных карпул анестетика старшей медсестрой без созыва комиссии",
		confirmedAt: new Date().toISOString(),
		isQuickCarpuleWriteoff: true,
		isSingleSigner: true,
		writtenOffByRole: nurseRole,
	};
}
