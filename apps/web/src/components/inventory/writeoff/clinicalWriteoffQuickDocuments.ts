import type { CabinetStockBatch, MaterialMeasurementUnit } from "./clinicalWriteoffPresets.js";
import {
	DENTAL_CABINET_STOCK_PRESETS,
	CLINICAL_MATERIALS_CATALOG,
	getClinicalMaterialById,
} from "./clinicalWriteoffPresets.js";
import {
	type ClinicalWriteoffDocument,
	type ClinicalWriteoffLine,
	calculateClinicalWriteoffTotals,
	calculateLineCostKopecks,
	evaluateStockAvailability,
	findBestBatchFefo,
	generateDocumentRowId,
} from "./clinicalWriteoffEngine.js";

export interface QuickCarpuleWriteoffParams {
	readonly cabinetId?: string | undefined;
	readonly cabinetNameRu?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly doctorSpecialty?: string | undefined;
	readonly nurseFullName?: string | undefined;
	readonly nurseRole?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly count?: number | undefined;
	readonly materialId?: string | undefined;
	readonly lotNumber?: string | undefined;
	readonly notes?: string | undefined;
	readonly stockBatches?: readonly CabinetStockBatch[] | undefined;
	readonly actDate?: string | undefined;
	readonly statutoryFormType?: "0504230" | "M11" | "TORG16" | "material_writeoff" | undefined;
	readonly includePackage?: boolean | undefined;
}

export interface QuickAnesthesiaPackageWriteoffParams {
	readonly carpuleCount?: number | undefined;
	readonly carpuleMaterialId?: string | undefined;
	readonly needleCount?: number | undefined;
	readonly needleMaterialId?: string | undefined;
	readonly antisepticCount?: number | undefined;
	readonly antisepticMaterialId?: string | undefined;
	readonly cabinetId?: string | undefined;
	readonly cabinetNameRu?: string | undefined;
	readonly actDate?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly doctorSpecialty?: string | undefined;
	readonly nurseFullName?: string | undefined;
	readonly nurseRole?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly notes?: string | undefined;
	readonly stockBatches?: readonly CabinetStockBatch[] | undefined;
	readonly statutoryFormType?: "0504230" | "M11" | "TORG16" | "material_writeoff" | undefined;
}

export interface QuickVisitWriteoffParams {
	readonly visitType?: "therapy" | "surgery" | undefined;
	readonly cabinetId?: string | undefined;
	readonly cabinetNameRu?: string | undefined;
	readonly actDate?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly doctorSpecialty?: string | undefined;
	readonly assistantFullName?: string | undefined;
	readonly patientName?: string | undefined;
	readonly stockBatches?: readonly CabinetStockBatch[] | undefined;
	readonly statutoryFormType?: "0504230" | "M11" | "TORG16" | "material_writeoff" | undefined;
	readonly notes?: string | undefined;
	readonly isSingleSigner?: boolean | undefined;
}

export const VISIT_CONFIGS = {
	therapy: [
		{ materialId: "mat_articaine_ultracain", quantity: 1, fallbackName: "Анестетик артикаиновый 4% 1.7 мл", fallbackCategory: "anesthesia" as const, fallbackUnit: "карп" as MaterialMeasurementUnit, fallbackCostKopecks: 23000 },
		{ materialId: "mat_dental_needle_30g", quantity: 1, fallbackName: "Игла карпульная 30G", fallbackCategory: "anesthesia" as const, fallbackUnit: "шт" as MaterialMeasurementUnit, fallbackCostKopecks: 3000 },
		{ materialId: "mat_nitrile_gloves", quantity: 2, fallbackName: "Перчатки нитриловые (пара)", fallbackCategory: "ppe" as const, fallbackUnit: "пар" as MaterialMeasurementUnit, fallbackCostKopecks: 3800 },
		{ materialId: "mat_saliva_ejector", quantity: 1, fallbackName: "Слюноотсос одноразовый", fallbackCategory: "ppe" as const, fallbackUnit: "шт" as MaterialMeasurementUnit, fallbackCostKopecks: 1400 },
		{ materialId: "mat_cotton_rolls", quantity: 6, fallbackName: "Ватные валики стерильные №2", fallbackCategory: "ppe" as const, fallbackUnit: "шт" as MaterialMeasurementUnit, fallbackCostKopecks: 400 },
		{ materialId: "mat_patient_bib", quantity: 1, fallbackName: "Салфетка нагрудная", fallbackCategory: "ppe" as const, fallbackUnit: "шт" as MaterialMeasurementUnit, fallbackCostKopecks: 800 },
	],
	surgery: [
		{ materialId: "mat_articaine_ultracain", quantity: 1, fallbackName: "Анестетик артикаиновый 4% 1.7 мл", fallbackCategory: "anesthesia" as const, fallbackUnit: "карп" as MaterialMeasurementUnit, fallbackCostKopecks: 23000 },
		{ materialId: "mat_dental_needle_30g", quantity: 1, fallbackName: "Игла карпульная 30G", fallbackCategory: "anesthesia" as const, fallbackUnit: "шт" as MaterialMeasurementUnit, fallbackCostKopecks: 3000 },
		{ materialId: "mat_surg_blade_15", quantity: 1, fallbackName: "Лезвие скальпеля №15", fallbackCategory: "surgery" as const, fallbackUnit: "шт" as MaterialMeasurementUnit, fallbackCostKopecks: 8500 },
		{ materialId: "mat_suture_vicryl_40", quantity: 1, fallbackName: "Шовный материал Викрил 4-0", fallbackCategory: "suture" as const, fallbackUnit: "шт" as MaterialMeasurementUnit, fallbackCostKopecks: 38000 },
		{ materialId: "mat_hemostatic_sponge", quantity: 1, fallbackName: "Гемостатическая губка", fallbackCategory: "surgery" as const, fallbackUnit: "шт" as MaterialMeasurementUnit, fallbackCostKopecks: 32000 },
	],
};

export function createQuickAnesthesiaPackageWriteoffDocument(
	params: QuickAnesthesiaPackageWriteoffParams = {},
): ClinicalWriteoffDocument {
	const batches = params.stockBatches || DENTAL_CABINET_STOCK_PRESETS;
	const cabinetId = params.cabinetId || "cab-01";
	const cabinetNameRu = params.cabinetNameRu || "Кабинет терапевтической стоматологии №1";
	const actDate = params.actDate || new Date().toISOString().slice(0, 10);
	const practitionerName = params.nurseFullName || params.doctorFullName || "Дежурный врач";
	const practitionerRole = params.nurseRole || params.doctorSpecialty || "Врач-стоматолог";

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
		getClinicalMaterialById(params.antisepticMaterialId || "mat_antiseptic_chlorhexidine") || needleMat;

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
			discrepancyNotes: "Стандартный пакет анестезии: карпула 1.7 мл + игла + антисептик",
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
		patientName: params.patientName || "Стандартный пакет анестезии",
		doctorFullName: practitionerName,
		doctorSpecialty: practitionerRole,
		assistantFullName: practitionerName,
		cabinetId,
		cabinetNameRu,
		completedServices: [{ serviceCode: "A16.07.030.001", serviceTitle: "Стандартный пакет анестезии", quantityMultiplier: carpuleCount }],
		lines,
		totals,
		statutoryFormType: params.statutoryFormType || "material_writeoff",
		status: "confirmed",
		notes: params.notes || "Списание пакета анестезии по клиническому протоколу",
		confirmedAt: new Date().toISOString(),
		isQuickCarpuleWriteoff: true,
		isSingleSigner: true,
		writtenOffByRole: practitionerRole,
	};
}

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
	const nurseFullName = params.nurseFullName || params.doctorFullName || "Дежурный персонал";
	const nurseRole = params.nurseRole || "Медицинская сестра";

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
		discrepancyNotes: params.notes || "Списание использованных карпул анестетика",
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
		patientName: "Списание пустых карпул",
		doctorFullName: nurseFullName,
		doctorSpecialty: nurseRole,
		assistantFullName: nurseFullName,
		cabinetId,
		cabinetNameRu,
		completedServices: [{ serviceCode: "A16.07.030.001", serviceTitle: "Утилизация использованных карпул/ампул анестетика", quantityMultiplier: count }],
		lines: [line],
		totals,
		statutoryFormType: params.statutoryFormType || "material_writeoff",
		status: "confirmed",
		notes: params.notes || "Пакетное списание использованных карпул анестетика",
		confirmedAt: new Date().toISOString(),
		isQuickCarpuleWriteoff: true,
		isSingleSigner: true,
		writtenOffByRole: nurseRole,
	};
}

export function createQuickVisitWriteoffDocument(params: QuickVisitWriteoffParams = {}): ClinicalWriteoffDocument {
	const visitType = params.visitType || "therapy";
	const batches = params.stockBatches || DENTAL_CABINET_STOCK_PRESETS;
	const cabinetId = params.cabinetId || (visitType === "surgery" ? "cab_02_surgery" : "cab_01_therapy");
	const cabinetNameRu = params.cabinetNameRu || (visitType === "surgery" ? "Кабинет хирургии №2" : "Кабинет терапии №1");
	const actDate = params.actDate || new Date().toISOString().slice(0, 10);
	const doctorFullName = params.doctorFullName || "Врач-стоматолог";
	const doctorSpecialty = params.doctorSpecialty || (visitType === "surgery" ? "Врач-стоматолог-хирург" : "Врач-стоматолог-терапевт");

	const items = VISIT_CONFIGS[visitType] || VISIT_CONFIGS.therapy;
	const lines: ClinicalWriteoffLine[] = items.map((item) => {
		const matDef = getClinicalMaterialById(item.materialId);
		const fefoResult = findBestBatchFefo(item.materialId, item.quantity, batches, cabinetId, actDate);
		const unitCostKopecks = fefoResult.batch?.unitCostKopecks ?? matDef?.defaultUnitCostKopecks ?? item.fallbackCostKopecks;
		const stockAvailable = fefoResult.batch?.quantityAvailable ?? 50;
		const criticalThreshold = fefoResult.batch?.criticalThreshold ?? 5;
		const stockStatus = evaluateStockAvailability(stockAvailable, item.quantity, criticalThreshold);

		return {
			id: `line_visit_${Date.now()}_${generateDocumentRowId()}`,
			serviceCode: visitType === "surgery" ? "A16.07.001.001" : "A16.07.002.001",
			serviceTitle: visitType === "surgery" ? "Хирургический приём" : "Терапевтический приём",
			materialId: item.materialId,
			sku: matDef?.sku || `SKU-${item.materialId.toUpperCase()}`,
			nameRu: matDef?.nameRu || item.fallbackName,
			category: matDef?.category || item.fallbackCategory,
			unit: matDef?.unit || item.fallbackUnit,
			okeiCode: matDef?.okeiCode || "796",
			standardQuantity: item.quantity,
			actualQuantity: item.quantity,
			discrepancyQuantity: 0,
			discrepancyReasonCode: "standard_consumption" as const,
			discrepancyNotes: params.notes || `Типовой визит (${visitType === "surgery" ? "Хирургия" : "Терапия"})`,
			batchId: fefoResult.batch?.batchId,
			lotNumber: fefoResult.batch?.lotNumber || "LOT-VISIT-2026",
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
			totalCostKopecks: calculateLineCostKopecks(unitCostKopecks, item.quantity),
			isMandatory: true,
			requiresLotTracking: matDef?.requiresLotTracking || false,
			requiresSerialNumber: false,
		};
	});

	const totals = calculateClinicalWriteoffTotals(lines, 1);
	return {
		id: `doc_visit_${Date.now()}_${generateDocumentRowId()}`,
		actNumber: `ВИЗИТ-${Date.now().toString().slice(-6)}`,
		actDate,
		patientName: params.patientName || "Пациент клинического приёма",
		doctorFullName,
		doctorSpecialty,
		assistantFullName: params.assistantFullName || doctorFullName,
		cabinetId,
		cabinetNameRu,
		completedServices: [{ serviceCode: visitType === "surgery" ? "A16.07.001.001" : "A16.07.002.001", serviceTitle: "Клинический приём", quantityMultiplier: 1 }],
		lines,
		totals,
		statutoryFormType: params.statutoryFormType || "material_writeoff",
		status: "confirmed",
		notes: params.notes || `Списание набора визита (${visitType === "surgery" ? "Хирургия" : "Терапия"})`,
		confirmedAt: new Date().toISOString(),
		isQuickCarpuleWriteoff: false,
		isSingleSigner: params.isSingleSigner !== false,
		writtenOffByRole: doctorSpecialty,
	};
}
