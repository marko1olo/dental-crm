import { type Kopecks, parseKopecks } from "@dental/shared";
import {
	CLINICAL_MATERIALS_CATALOG,
	type CabinetStockBatch,
	type ClinicalMaterialDefinition,
	DENTAL_CABINET_STOCK_PRESETS,
	getClinicalMaterialById,
	type MaterialMeasurementUnit,
} from "./clinicalWriteoffPresets.js";
import {
	type ClinicalWriteoffDocument,
	type ClinicalWriteoffLine,
	calculateClinicalWriteoffTotals,
	calculateLineCostKopecks,
	evaluateStockAvailability,
	findBestBatchFefo,
	generateDocumentRowId,
	kopecksToRubles,
} from "./clinicalWriteoffEngine.js";

export interface QuickCarpuleWriteoffParams {
	readonly cabinetId?: string | undefined;
	readonly cabinetNameRu?: string | undefined;
	readonly nurseFullName?: string | undefined;
	readonly nurseRole?: string | undefined;
	readonly count?: number | undefined;
	readonly materialId?: string | undefined;
	readonly lotNumber?: string | undefined;
	readonly notes?: string | undefined;
	readonly stockBatches?: readonly CabinetStockBatch[] | undefined;
	readonly actDate?: string | undefined;
	readonly statutoryFormType?: "0504230" | "M11" | "TORG16" | undefined;
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
	readonly statutoryFormType?: "0504230" | "M11" | "TORG16" | undefined;
}

/**
 * Быстрое списание стандартного пакета анестезии:
 * (1 карпула 1.7 мл + карпульная игла + антисептик инъекционного поля).
 * Врач или медсестра списывают оперативно без создания комиссий, накладных и согласований (Мандаты 8e, 8n).
 */
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
		CLINICAL_MATERIALS_CATALOG.find((m) => m.category === "anesthesia") ||
		CLINICAL_MATERIALS_CATALOG[0]!;

	const needleMat =
		getClinicalMaterialById(params.needleMaterialId || "mat_dental_needle_30g") ||
		CLINICAL_MATERIALS_CATALOG.find((m) => m.id === "mat_dental_needle_30g") ||
		carpuleMat;

	const antisepticMat =
		getClinicalMaterialById(params.antisepticMaterialId || "mat_antiseptic_chlorhexidine") ||
		getClinicalMaterialById("mat_topical_anesthesia_gel") ||
		needleMat;

	const itemsConfig = [
		{
			material: carpuleMat,
			count: carpuleCount,
			title: "Анестетик артикаиновый 4% (карпула 1.7 мл)",
		},
		{
			material: needleMat,
			count: needleCount,
			title: "Игла карпульная стоматологическая 30G",
		},
		{
			material: antisepticMat,
			count: antisepticCount,
			title: "Антисептическая обработка инъекционного поля",
		},
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
	const actNumber = `АНЕСТ-${Date.now().toString().slice(-6)}`;

	return {
		id: `doc_anes_pkg_${Date.now()}_${generateDocumentRowId()}`,
		actNumber,
		actDate,
		patientId: params.patientId,
		patientName: params.patientName || "Стандартный пакет анестезии (кабинет)",
		doctorFullName: practitionerName,
		doctorSpecialty: practitionerRole,
		assistantFullName: practitionerName,
		cabinetId,
		cabinetNameRu,
		completedServices: [
			{
				serviceCode: "A16.07.030.001",
				serviceTitle: "Стандартный пакет анестезии (1 карпула 1.7 мл + карпульная игла + антисептик)",
				quantityMultiplier: carpuleCount,
			},
		],
		lines,
		totals,
		statutoryFormType: params.statutoryFormType || "0504230",
		status: "confirmed",
		notes:
			params.notes ||
			"Быстрое списание стандартного пакета анестезии (1 карпула 1.7 мл + карпульная игла + антисептик) — списание медсестрой без комиссии (Клинический регламент)",
		confirmedAt: new Date().toISOString(),
		isQuickCarpuleWriteoff: true,
		isSingleSigner: true,
		writtenOffByRole: practitionerRole,
	};
}

/**
 * Быстрое списание пустых использованных карпул и ампул анестетиков
 * старшей медсестрой или ассистентом без необходимости созыва комиссии из 3 человек.
 */
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
	const actNumber = `КАРП-${Date.now().toString().slice(-6)}`;

	return {
		id: `doc_carpule_${Date.now()}_${generateDocumentRowId()}`,
		actNumber,
		actDate,
		patientName: "Списание пустых карпул (кабинет)",
		doctorFullName: nurseFullName,
		doctorSpecialty: nurseRole,
		assistantFullName: nurseFullName,
		cabinetId,
		cabinetNameRu,
		completedServices: [
			{
				serviceCode: "A16.07.030.001",
				serviceTitle: "Утилизация использованных карпул/ампул анестетика",
				quantityMultiplier: count,
			},
		],
		lines: [line],
		totals,
		statutoryFormType: params.statutoryFormType || "0504230",
		status: "confirmed",
		notes:
			params.notes ||
			"Единоличное экспресс-списание использованных карпул анестетика старшей медсестрой без созыва комиссии",
		confirmedAt: new Date().toISOString(),
		isQuickCarpuleWriteoff: true,
		isSingleSigner: true,
		writtenOffByRole: nurseRole,
	};
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
	readonly statutoryFormType?: "0504230" | "M11" | "TORG16" | undefined;
	readonly notes?: string | undefined;
	readonly isSingleSigner?: boolean | undefined;
}

/**
 * 1-клик формирование акта списания материалов по типовой карте клинического визита:
 * - «Терапия»: карпула анестетика + игла + перчатки + слюноотсос + валики + нагрудник
 * - «Хирургия»: карпула анестетика + игла + скальпель + шовный материал + гемостатическая губка
 * Без бюрократического созыва комиссии из 3 человек (Мандат 8e п. 10, Мандат 8n п. 2).
 */
export function createQuickVisitWriteoffDocument(
	params: QuickVisitWriteoffParams = {},
): ClinicalWriteoffDocument {
	const visitType = params.visitType || "therapy";
	const batches = params.stockBatches || DENTAL_CABINET_STOCK_PRESETS;
	const cabinetId = params.cabinetId || (visitType === "surgery" ? "cab_02_surgery" : "cab_01_therapy");
	const cabinetNameRu =
		params.cabinetNameRu ||
		(visitType === "surgery" ? "Кабинет хирургической стоматологии №2" : "Кабинет терапевтической стоматологии №1");
	const actDate = params.actDate || new Date().toISOString().slice(0, 10);
	const doctorFullName = params.doctorFullName || "Кузнецов Михаил Сергеевич";
	const doctorSpecialty = params.doctorSpecialty || (visitType === "surgery" ? "Врач-стоматолог-хирург" : "Врач-стоматолог-терапевт");
	const patientName = params.patientName || "Пациент клинического приёма";

	const visitItemConfigs: Record<
		"therapy" | "surgery",
		Array<{
			materialId: string;
			quantity: number;
			fallbackName: string;
			fallbackCategory: "composite" | "adhesive" | "endo" | "implant" | "suture" | "anesthesia" | "hygiene" | "ppe" | "disinfection" | "auxiliary" | "surgery";
			fallbackUnit: MaterialMeasurementUnit;
			fallbackCostKopecks: Kopecks;
		}>
	> = {
		therapy: [
			{
				materialId: "mat_articaine_ultracain",
				quantity: 1,
				fallbackName: "Анестетик артикаиновый 4% с эпинефрином 1:100000 1.7 мл",
				fallbackCategory: "anesthesia",
				fallbackUnit: "карп",
				fallbackCostKopecks: 23000,
			},
			{
				materialId: "mat_dental_needle_30g",
				quantity: 1,
				fallbackName: "Игла карпульная стоматологическая 30G евростандарт 25 мм",
				fallbackCategory: "anesthesia",
				fallbackUnit: "шт",
				fallbackCostKopecks: 3000,
			},
			{
				materialId: "mat_nitrile_gloves",
				quantity: 2,
				fallbackName: "Перчатки нитриловые неопудренные (пара)",
				fallbackCategory: "ppe",
				fallbackUnit: "пар",
				fallbackCostKopecks: 3800,
			},
			{
				materialId: "mat_saliva_ejector",
				quantity: 1,
				fallbackName: "Слюноотсос одноразовый стоматологический с гибким наконечником",
				fallbackCategory: "ppe",
				fallbackUnit: "шт",
				fallbackCostKopecks: 1400,
			},
			{
				materialId: "mat_cotton_rolls",
				quantity: 6,
				fallbackName: "Ватные валики стоматологические стерильные №2",
				fallbackCategory: "ppe",
				fallbackUnit: "шт",
				fallbackCostKopecks: 400,
			},
			{
				materialId: "mat_patient_bib",
				quantity: 1,
				fallbackName: "Салфетка нагрудная стоматологическая двухслойная (нагрудник)",
				fallbackCategory: "ppe",
				fallbackUnit: "шт",
				fallbackCostKopecks: 800,
			},
		],
		surgery: [
			{
				materialId: "mat_articaine_ultracain",
				quantity: 1,
				fallbackName: "Анестетик артикаиновый 4% с эпинефрином 1:100000 1.7 мл",
				fallbackCategory: "anesthesia",
				fallbackUnit: "карп",
				fallbackCostKopecks: 23000,
			},
			{
				materialId: "mat_dental_needle_30g",
				quantity: 1,
				fallbackName: "Игла карпульная стоматологическая 30G евростандарт 25 мм",
				fallbackCategory: "anesthesia",
				fallbackUnit: "шт",
				fallbackCostKopecks: 3000,
			},
			{
				materialId: "mat_surg_blade_15",
				quantity: 1,
				fallbackName: "Лезвие скальпеля хирургическое №15 Swann-Morton",
				fallbackCategory: "surgery",
				fallbackUnit: "шт",
				fallbackCostKopecks: 8500,
			},
			{
				materialId: "mat_suture_vicryl_40",
				quantity: 1,
				fallbackName: "Шовный материал Викрил / Монофил 4-0 с атравматической иглой",
				fallbackCategory: "suture",
				fallbackUnit: "шт",
				fallbackCostKopecks: 38000,
			},
			{
				materialId: "mat_hemostatic_sponge",
				quantity: 1,
				fallbackName: "Гемостатическая коллагеновая губка Альвостаз / Тахокомб",
				fallbackCategory: "surgery",
				fallbackUnit: "шт",
				fallbackCostKopecks: 32000,
			},
		],
	};

	const items = visitItemConfigs[visitType] || visitItemConfigs.therapy;
	const lines: ClinicalWriteoffLine[] = [];

	for (const item of items) {
		const matDef = getClinicalMaterialById(item.materialId);
		const nameRu = matDef?.nameRu || item.fallbackName;
		const category = matDef?.category || item.fallbackCategory;
		const unit = matDef?.unit || item.fallbackUnit;
		const sku = matDef?.sku || `SKU-${item.materialId.toUpperCase()}`;
		const okeiCode = matDef?.okeiCode || "796";
		const standardQty = item.quantity;
		const actualQty = item.quantity;

		const fefoResult = findBestBatchFefo(item.materialId, standardQty, batches, cabinetId, actDate);
		const unitCostKopecks = fefoResult.batch?.unitCostKopecks ?? matDef?.defaultUnitCostKopecks ?? item.fallbackCostKopecks;
		const stockAvailable = fefoResult.batch?.quantityAvailable ?? 50;
		const criticalThreshold = fefoResult.batch?.criticalThreshold ?? 5;
		const stockStatus = evaluateStockAvailability(stockAvailable, actualQty, criticalThreshold);

		lines.push({
			id: `line_visit_${Date.now()}_${generateDocumentRowId()}`,
			serviceCode: visitType === "surgery" ? "A16.07.001.001" : "A16.07.002.001",
			serviceTitle: visitType === "surgery" ? "Хирургический приём" : "Терапевтический приём",
			toothNumber: undefined,
			materialId: item.materialId,
			sku,
			nameRu,
			category,
			unit,
			okeiCode,
			standardQuantity: standardQty,
			actualQuantity: actualQty,
			discrepancyQuantity: 0,
			discrepancyReasonCode: "standard_consumption",
			discrepancyNotes: params.notes || `Типовой визит (${visitType === "surgery" ? "Хирургия" : "Терапия"})`,
			batchId: fefoResult.batch?.batchId,
			lotNumber: fefoResult.batch?.lotNumber || "LOT-VISIT-2026",
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
			totalCostKopecks: calculateLineCostKopecks(unitCostKopecks, actualQty),
			isMandatory: true,
			requiresLotTracking: matDef?.requiresLotTracking || false,
			requiresSerialNumber: false,
		});
	}

	const totals = calculateClinicalWriteoffTotals(lines, 1);
	const actNumber = `ВИЗИТ-${Date.now().toString().slice(-6)}`;

	return {
		id: `doc_visit_${Date.now()}_${generateDocumentRowId()}`,
		actNumber,
		actDate,
		patientName,
		doctorFullName,
		doctorSpecialty,
		assistantFullName: params.assistantFullName || doctorFullName,
		cabinetId,
		cabinetNameRu,
		completedServices: [
			{
				serviceCode: visitType === "surgery" ? "A16.07.001.001" : "A16.07.002.001",
				serviceTitle: visitType === "surgery" ? "Хирургический стоматологический приём" : "Терапевтический стоматологический приём",
				quantityMultiplier: 1,
			},
		],
		lines,
		totals,
		statutoryFormType: params.statutoryFormType || "0504230",
		status: "confirmed",
		notes:
			params.notes ||
			`Списание набора визита (${visitType === "surgery" ? "Хирургия" : "Терапия"}) без комиссии из 3 человек`,
		confirmedAt: new Date().toISOString(),
		isQuickCarpuleWriteoff: false,
		isSingleSigner: params.isSingleSigner !== false,
		writtenOffByRole: doctorSpecialty,
	};
}

