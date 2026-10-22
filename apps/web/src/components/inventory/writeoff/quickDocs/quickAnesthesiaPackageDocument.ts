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
import type { QuickAnesthesiaPackageWriteoffParams } from "./quickAnesthesiaPackageParams.js";

export type { QuickAnesthesiaPackageWriteoffParams };

export function createQuickAnesthesiaPackageWriteoffDocument(
	params: QuickAnesthesiaPackageWriteoffParams = {},
): ClinicalWriteoffDocument {
	const batches = params.stockBatches || DENTAL_CABINET_STOCK_PRESETS;
	const cabinetId = params.cabinetId || "cab-01";
	const cabinetNameRu = params.cabinetNameRu || "Кабинет терапевтической стоматологии №1";
	const actDate = params.actDate || new Date().toISOString().slice(0, 10);
	const practitionerName = params.nurseFullName || params.doctorFullName || "Смирнова Анна Викторовна";
	const practitionerRole = params.nurseRole || params.doctorSpecialty || "Медицинская сестра";

	const carpuleCount = Math.max(1, params.carpuleCount ?? 1);
	const needleCount = Math.max(1, params.needleCount ?? 1);
	const antisepticCount = Math.max(1, params.antisepticCount ?? 1);

	const carpuleMat =
		getClinicalMaterialById(params.carpuleMaterialId || "mat_articaine_ultracain") ||
		CLINICAL_MATERIALS_CATALOG.find((m) => m.category === "anesthesia") || CLINICAL_MATERIALS_CATALOG[0]!;

	const needleMat =
		getClinicalMaterialById(params.needleMaterialId || "mat_dental_needle_30g") ||
		CLINICAL_MATERIALS_CATALOG.find((m) => m.id === "mat_dental_needle_30g") || carpuleMat;

	const antisepticMat =
		getClinicalMaterialById(params.antisepticMaterialId || "mat_antiseptic_chlorhexidine") ||
		getClinicalMaterialById("mat_topical_anesthesia_gel") || needleMat;

	const itemsConfig = [
		{ material: carpuleMat, count: carpuleCount, title: "Анестетик артикаиновый 4% (карпула 1.7 мл)" },
		{ material: needleMat, count: needleCount, title: "Игла карпульная стоматологическая 30G" },
		{ material: antisepticMat, count: antisepticCount, title: "Антисептическая обработка инъекционного поля" },
	];

	const lines: ClinicalWriteoffLine[] = itemsConfig.map((item, idx) => {
		const fefoResult = findBestBatchFefo(item.material.id, item.count, batches, cabinetId, actDate);
		const unitCostKopecks = fefoResult.batch?.unitCostKopecks ?? item.material.defaultUnitCostKopecks;
		const stockAvailable = fefoResult.batch?.quantityAvailable ?? 100;
		const criticalThreshold = fefoResult.batch?.criticalThreshold ?? 10;
		const stockStatus = evaluateStockAvailability(stockAvailable, item.count, criticalThreshold);

		return {
			id: `line_anes_pkg_${Date.now()}_${idx}_${generateDocumentRowId()}`,
			serviceCode: "A16.07.030.001",
			serviceTitle: item.title,
			toothNumber: undefined,
			materialId: item.material.id,
			sku: item.material.sku,
			nameRu: item.material.nameRu,
			category: item.material.category,
			unit: item.material.unit,
			okeiCode: item.material.okeiCode,
			standardQuantity: item.count,
			actualQuantity: item.count,
			discrepancyQuantity: 0,
			discrepancyReasonCode: "standard_consumption" as const,
			discrepancyNotes: "Стандартный пакет анестезии: карпула 1.7 мл + игла + антисептик (без комиссии)",
			batchId: fefoResult.batch?.batchId,
			lotNumber: fefoResult.batch?.lotNumber || `LOT-ANES-PKG-${Date.now().toString().slice(-4)}`,
			serialNumber: undefined,
			expirationDate: fefoResult.batch?.expirationDate || "2028-12-31",
			daysUntilExpiration: fefoResult.daysUntilExpiration,
			isExpiringSoon: fefoResult.isExpiringSoon,
			isExpired: false,
			cabinetId,
			cabinetNameRu,
			stockAvailable,
			criticalThreshold,
			stockStatus,
			unitCostKopecks,
			totalCostKopecks: calculateLineCostKopecks(unitCostKopecks, item.count),
			isMandatory: true,
			requiresLotTracking: item.material.requiresLotTracking,
			requiresSerialNumber: false,
		};
	});

	const totals = calculateClinicalWriteoffTotals(lines, 1);
	return {
		id: `doc_anes_pkg_${Date.now()}_${generateDocumentRowId()}`,
		actNumber: `АНЕСТ-${Date.now().toString().slice(-6)}`,
		actDate,
		patientId: params.patientId,
		patientName: params.patientName || "Стандартный пакет анестезии (кабинет)",
		doctorFullName: practitionerName,
		doctorSpecialty: practitionerRole,
		assistantFullName: practitionerName,
		cabinetId,
		cabinetNameRu,
		completedServices: [{ serviceCode: "A16.07.030.001", serviceTitle: "Стандартный пакет анестезии", quantityMultiplier: carpuleCount }],
		lines,
		totals,
		statutoryFormType: params.statutoryFormType || "0504230",
		status: "confirmed",
		notes: params.notes || "Быстрое списание стандартного пакета анестезии медсестрой без комиссии",
		confirmedAt: new Date().toISOString(),
		isQuickCarpuleWriteoff: true,
		isSingleSigner: true,
		writtenOffByRole: practitionerRole,
	};
}
