/**
 * ============================================================================
 * CLINICAL WRITEOFF, FEFO INVENTORY DEDUCTION & STATUTORY ACT ENGINE
 * Математическое и нормативное ядро автосписания клинических расходников
 * по Приказу Минздрава РФ № 804н, алгоритм FEFO (First Expired, First Out),
 * учет расхождений (Discrepancy Engine) и генерация актов (0504230, М-11, ТОРГ-16).
 * ============================================================================
 */

import {
	type Kopecks,
	formatKopecksRu,
	multiplyKopecks,
	parseKopecks,
	sumKopecks,
} from "@dental/shared";
import {
	CLINICAL_MATERIALS_CATALOG,
	type CabinetStockBatch,
	type ClinicalMaterialDefinition,
	DEFAULT_CLINIC_LEGAL_INFO,
	type ClinicLegalInfo,
	DENTAL_CABINET_STOCK_PRESETS,
	type DiscrepancyReasonCode,
	type MaterialMeasurementUnit,
	ORDER_804N_SERVICE_NORMS,
	type Order804nServiceNorm,
	getClinicalMaterialById,
	getDiscrepancyReason,
	getOrder804nServiceNorm,
} from "./clinicalWriteoffPresets.js";

export {
	CLINICAL_MATERIALS_CATALOG,
	type CabinetStockBatch,
	type ClinicalMaterialDefinition,
	DEFAULT_CLINIC_LEGAL_INFO,
	type ClinicLegalInfo,
	DENTAL_CABINET_STOCK_PRESETS,
	type DiscrepancyReasonCode,
	type MaterialMeasurementUnit,
	ORDER_804N_SERVICE_NORMS,
	type Order804nServiceNorm,
	getClinicalMaterialById,
	getDiscrepancyReason,
	getOrder804nServiceNorm,
};

export interface CompletedClinicalService {
	readonly serviceCode: string;
	readonly toothNumber?: number | string | undefined;
	readonly serviceTitle?: string | undefined;
	readonly quantityMultiplier?: number | undefined; // например, 3 канала для эндодонтии или 1 пломба
	readonly notes?: string | undefined;
}

export interface ClinicalWriteoffLine {
	readonly id: string;
	readonly serviceCode: string;
	readonly serviceTitle: string;
	readonly toothNumber?: number | string | undefined;
	readonly materialId: string;
	readonly sku: string;
	readonly nameRu: string;
	readonly category: string;
	readonly unit: MaterialMeasurementUnit;
	readonly okeiCode: string;
	readonly standardQuantity: number;
	actualQuantity: number;
	discrepancyQuantity: number;
	discrepancyReasonCode: DiscrepancyReasonCode;
	discrepancyNotes?: string | undefined;
	batchId?: string | undefined;
	lotNumber?: string | undefined;
	serialNumber?: string | undefined;
	expirationDate?: string | undefined;
	daysUntilExpiration?: number | undefined;
	isExpiringSoon: boolean; // истекает в течение 30 дней
	isExpired: boolean;
	cabinetId?: string | undefined;
	cabinetNameRu?: string | undefined;
	stockAvailable: number;
	criticalThreshold: number;
	stockStatus: "ok" | "warning" | "deficit";
	unitCostKopecks: Kopecks;
	totalCostKopecks: Kopecks;
	readonly isMandatory: boolean;
	readonly requiresLotTracking: boolean;
	readonly requiresSerialNumber: boolean;
}

export interface ClinicalWriteoffTotals {
	readonly totalServicesCount: number;
	readonly totalMaterialsCount: number;
	readonly totalMaterialsQuantity: number;
	readonly totalCostKopecks: Kopecks;
	readonly totalCostFormatted: string;
	readonly totalCostRubles: number;
	readonly totalDiscrepancyCostKopecks: Kopecks;
	readonly totalDiscrepancyCostFormatted: string;
	readonly totalDiscrepancyCostRubles: number;
	readonly expiringBatchesCount: number;
	readonly expiredBatchesCount: number;
	readonly deficitItemsCount: number;
	readonly hasDeficit: boolean;
	readonly hasExpiringLots: boolean;
	readonly hasExpiredLots: boolean;
}

export interface ClinicalWriteoffDocument {
	readonly id: string;
	readonly actNumber: string;
	readonly actDate: string; // ISO YYYY-MM-DD
	readonly visitId?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientName: string;
	readonly patientBirthDate?: string | undefined;
	readonly doctorFullName: string;
	readonly doctorSpecialty: string;
	readonly assistantFullName?: string | undefined;
	readonly cabinetId: string;
	readonly cabinetNameRu: string;
	readonly completedServices: readonly CompletedClinicalService[];
	readonly lines: readonly ClinicalWriteoffLine[];
	readonly totals: ClinicalWriteoffTotals;
	readonly statutoryFormType: "0504230" | "M11" | "TORG16";
	readonly status: "draft" | "confirmed" | "cancelled";
	readonly notes?: string | undefined;
	readonly confirmedAt?: string | undefined;
	readonly clinicInfo?: ClinicLegalInfo | undefined;
	readonly isQuickCarpuleWriteoff?: boolean | undefined;
	readonly writtenOffByRole?: string | undefined;
}

/**
 * Расчет стоимости строки списания в копейках без потери точности плавающей точки.
 */
export function calculateLineCostKopecks(
	unitCostKopecks: Kopecks,
	quantity: number,
): Kopecks {
	if (!Number.isFinite(quantity) || quantity <= 0) return 0;
	if (Number.isInteger(quantity)) {
		return multiplyKopecks(unitCostKopecks, quantity);
	}
	return Math.round(unitCostKopecks * quantity);
}

/**
 * Перевод копеек в рубли с 2 знаками после запятой
 */
export function kopecksToRubles(kopecks: Kopecks): number {
	return Math.round(kopecks) / 100;
}

/**
 * Расчет количества дней до истечения срока годности
 */
export function getDaysUntilExpiration(
	expirationDateIso: string,
	referenceDateIso: string = new Date().toISOString().slice(0, 10),
): number {
	if (!expirationDateIso) return 9999;
	const expTime = new Date(`${expirationDateIso}T00:00:00Z`).getTime();
	const refTime = new Date(`${referenceDateIso}T00:00:00Z`).getTime();
	const diffMs = expTime - refTime;
	return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Алгоритм FEFO (First Expired, First Out) с резервным FIFO.
 * Находит наиболее раннюю подходящую партию материала в кабинете.
 */
export function findBestBatchFefo(
	materialId: string,
	requiredQuantity: number,
	batches: readonly CabinetStockBatch[] = DENTAL_CABINET_STOCK_PRESETS,
	cabinetId?: string,
	referenceDateIso: string = new Date().toISOString().slice(0, 10),
): {
	batch: CabinetStockBatch | undefined;
	isExpiringSoon: boolean;
	isExpired: boolean;
	daysUntilExpiration: number | undefined;
} {
	const matchingBatches = batches.filter((b) => {
		if (b.materialId !== materialId) return false;
		if (cabinetId && b.cabinetId !== cabinetId) return false;
		return true;
	});

	if (matchingBatches.length === 0) {
		return {
			batch: undefined,
			isExpiringSoon: false,
			isExpired: false,
			daysUntilExpiration: undefined,
		};
	}

	// Сортировка FEFO: срок годности по возрастанию (самые ранние первыми)
	const sortedBatches = [...matchingBatches].sort((a, b) => {
		const expA = new Date(a.expirationDate).getTime();
		const expB = new Date(b.expirationDate).getTime();
		if (expA !== expB) return expA - expB;
		// FIFO вторичный ключ: дата поступления/производства
		return new Date(a.manufactureDate).getTime() - new Date(b.manufactureDate).getTime();
	});

	// Приоритет: неистекшая партия с положительным остатком
	let selectedBatch = sortedBatches.find(
		(b) => b.quantityAvailable >= requiredQuantity && b.expirationDate >= referenceDateIso,
	);

	if (!selectedBatch) {
		selectedBatch = sortedBatches.find(
			(b) => b.quantityAvailable > 0 && b.expirationDate >= referenceDateIso,
		);
	}

	if (!selectedBatch) {
		selectedBatch = sortedBatches[0];
	}

	if (!selectedBatch) {
		return {
			batch: undefined,
			isExpiringSoon: false,
			isExpired: false,
			daysUntilExpiration: undefined,
		};
	}

	const days = getDaysUntilExpiration(selectedBatch.expirationDate, referenceDateIso);
	const isExpired = days < 0;
	const isExpiringSoon = days >= 0 && days <= 30;

	return {
		batch: selectedBatch,
		isExpiringSoon,
		isExpired,
		daysUntilExpiration: days,
	};
}

/**
 * Оценка складского статуса остатка
 */
export function evaluateStockAvailability(
	stockAvailable: number,
	quantityToDeduct: number,
	criticalThreshold: number = 0,
): "ok" | "warning" | "deficit" {
	const current = Number.isFinite(stockAvailable) ? stockAvailable : 0;
	const deduct = Number.isFinite(quantityToDeduct) ? quantityToDeduct : 0;
	const remaining = current - deduct;

	if (remaining < 0 || current <= 0) {
		return "deficit";
	}
	if (remaining <= criticalThreshold) {
		return "warning";
	}
	return "ok";
}

/**
 * Расчет сводных итогов списания (Kopecks & Rubles)
 */
export function calculateClinicalWriteoffTotals(
	lines: readonly ClinicalWriteoffLine[],
	completedServicesCount: number = 0,
): ClinicalWriteoffTotals {
	let totalQty = 0;
	let totalCostKopecks: Kopecks = 0;
	let totalDiscrepancyCostKopecks: Kopecks = 0;
	let expiringBatchesCount = 0;
	let expiredBatchesCount = 0;
	let deficitItemsCount = 0;

	for (const line of lines) {
		const actQty = Number.isFinite(line.actualQuantity) ? line.actualQuantity : 0;
		totalQty += actQty;

		const lineCost = calculateLineCostKopecks(line.unitCostKopecks, actQty);
		totalCostKopecks += lineCost;

		const discQty = line.discrepancyQuantity;
		if (discQty !== 0) {
			const discCost = calculateLineCostKopecks(line.unitCostKopecks, Math.abs(discQty));
			totalDiscrepancyCostKopecks += discCost;
		}

		if (line.isExpired) expiredBatchesCount++;
		else if (line.isExpiringSoon) expiringBatchesCount++;

		if (line.stockStatus === "deficit") deficitItemsCount++;
	}

	return {
		totalServicesCount: completedServicesCount,
		totalMaterialsCount: lines.length,
		totalMaterialsQuantity: Number(totalQty.toFixed(4)),
		totalCostKopecks,
		totalCostFormatted: formatKopecksRu(totalCostKopecks),
		totalCostRubles: kopecksToRubles(totalCostKopecks),
		totalDiscrepancyCostKopecks,
		totalDiscrepancyCostFormatted: formatKopecksRu(totalDiscrepancyCostKopecks),
		totalDiscrepancyCostRubles: kopecksToRubles(totalDiscrepancyCostKopecks),
		expiringBatchesCount,
		expiredBatchesCount,
		deficitItemsCount,
		hasDeficit: deficitItemsCount > 0,
		hasExpiringLots: expiringBatchesCount > 0,
		hasExpiredLots: expiredBatchesCount > 0,
	};
}

/**
 * Автоматическая агрегация расхода материалов из списка выполненных услуг приема (Приказ 804н)
 */
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
				const fefoResult = findBestBatchFefo(
					material.id,
					stdQty,
					stockBatches,
					cabinetId,
					referenceDateIso,
				);

				const unitCostKopecks = fefoResult.batch?.unitCostKopecks ?? material.defaultUnitCostKopecks;
				const stockAvailable = fefoResult.batch?.quantityAvailable ?? 0;
				const criticalThreshold = fefoResult.batch?.criticalThreshold ?? 0;
				const stockStatus = evaluateStockAvailability(stockAvailable, stdQty, criticalThreshold);

				lines.push({
					id: `line_${service.serviceCode}_${material.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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
					discrepancyNotes: undefined,
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

/**
 * Обновление фактического количества строки списания и расчет расхождения
 */
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
}

/**
 * Быстрое списание пустых использованных карпул и ампул анестетиков в 1 клик
 * старшей медсестрой или ассистентом без необходимости созыва комиссии из 3 человек.
 */
export function createQuickCarpuleWriteoffDocument(
	params: QuickCarpuleWriteoffParams = {},
): ClinicalWriteoffDocument {
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
		id: `line_carpule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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
		discrepancyNotes: params.notes || "Экспресс-списание использованных карпул анестетика (1 клик)",
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
		id: `doc_carpule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
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
		writtenOffByRole: nurseRole,
	};
}

/**
 * Валидация готового документа списания перед фиксацией
 */
export function validateWriteoffDocument(
	doc: Partial<ClinicalWriteoffDocument>,
): {
	isValid: boolean;
	errors: string[];
	warnings: string[];
} {
	const errors: string[] = [];
	const warnings: string[] = [];
	const isQuick = doc.isQuickCarpuleWriteoff === true;

	if (!isQuick && (!doc.patientName || doc.patientName.trim().length < 2)) {
		errors.push("Укажите ФИО пациента для списания материалов в медицинскую карту.");
	}

	if (!doc.doctorFullName && !doc.assistantFullName) {
		errors.push(
			isQuick
				? "Укажите лицо, производящее списание карпул (старшая медсестра / ассистент)."
				: "Укажите ФИО лечащего врача (материально ответственного лица).",
		);
	}

	if (!doc.lines || doc.lines.length === 0) {
		errors.push("Акт списания должен содержать хотя бы одну позицию израсходованного материала.");
	} else {
		for (const line of doc.lines) {
			if (line.actualQuantity < 0) {
				errors.push(`Отрицательное количество для материала «${line.nameRu}».`);
			}
			if (line.requiresSerialNumber && line.actualQuantity > 0 && !line.serialNumber) {
				errors.push(`Для имплантата/изделия «${line.nameRu}» обязателен ввод серийного номера (МДЛП).`);
			}
			if (line.isExpired) {
				const isDisposalOrScrap =
					doc.statutoryFormType === "TORG16" ||
					line.discrepancyReasonCode === "expired_quarantine" ||
					line.discrepancyReasonCode === "defect_broken" ||
					(doc as Record<string, unknown>).isDisposalAct === true;

				if (!isDisposalOrScrap) {
					errors.push(
						`Срок годности партии «${line.lotNumber || line.nameRu}» истек (${line.expirationDate})! Списание в клинический наряд пациента запрещено. Для утилизации оформите акт ТОРГ-16.`,
					);
				} else {
					warnings.push(
						`Партия «${line.nameRu}» (${line.lotNumber || "б/н"}) с истекшим сроком годности направлена на списание по акту утилизации/брака (ТОРГ-16).`,
					);
				}
			} else if (line.isExpiringSoon) {
				warnings.push(`Партия «${line.nameRu}» (${line.lotNumber}) истекает в течение 30 дней (${line.expirationDate}).`);
			}
			if (line.stockStatus === "deficit") {
				warnings.push(`Дефицит материала «${line.nameRu}» в кабинете (требуется: ${line.actualQuantity}, в наличии: ${line.stockAvailable}).`);
			}
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
	};
}

/**
 * Генерация Акта о списании материальных запасов (Форма по ОКУД 0504230, Приказ Минфина РФ № 52н)
 */
export function generateAct0504230Html(
	doc: ClinicalWriteoffDocument,
	clinicInfo: ClinicLegalInfo = DEFAULT_CLINIC_LEGAL_INFO,
): string {
	const info = doc.clinicInfo || clinicInfo;
	const totals = doc.totals;

	const rowsHtml = doc.lines
		.map((line, index) => {
			const reasonDef = getDiscrepancyReason(line.discrepancyReasonCode);
			const unitRub = kopecksToRubles(line.unitCostKopecks);
			const totalRub = kopecksToRubles(line.totalCostKopecks);
			const diffStr =
				line.discrepancyQuantity > 0
					? `+${line.discrepancyQuantity}`
					: line.discrepancyQuantity < 0
						? `${line.discrepancyQuantity}`
						: "—";

			return `<tr>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${index + 1}</td>
				<td style="border: 1px solid #000; padding: 4px;">
					<strong>${line.nameRu}</strong>
					${line.serialNumber ? `<br><small style="color: #475569;">SN: ${line.serialNumber}</small>` : ""}
				</td>
				<td style="border: 1px solid #000; padding: 4px; font-family: monospace; text-align: center;">${line.sku}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${line.lotNumber || "—"}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${line.expirationDate || "—"}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${line.unit} (${line.okeiCode})</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${line.standardQuantity}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${line.actualQuantity}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${diffStr}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${unitRub.toFixed(2)}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${totalRub.toFixed(2)}</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">
					${line.serviceCode} (${doc.patientName}${line.toothNumber ? `, Зуб №${line.toothNumber}` : ""})
				</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">
					${line.discrepancyNotes || reasonDef.labelRu}
				</td>
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Акт о списании материальных запасов № ${doc.actNumber}</title>
	<style>
		@page { size: A4 landscape; margin: 10mm; }
		body { font-family: 'Times New Roman', serif; font-size: 9pt; line-height: 1.25; color: #000; }
		.header-flex { display: flex; justify-content: space-between; margin-bottom: 8px; }
		.okud-block { text-align: right; font-size: 8pt; }
		.act-title { text-align: center; font-weight: bold; font-size: 13pt; margin: 10px 0 4px; text-transform: uppercase; }
		table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 12px; }
		th { border: 1px solid #000; padding: 4px; background: #f0f0f0; font-size: 8pt; text-align: center; }
		.signatures-row { display: flex; justify-content: space-between; margin-top: 25px; }
		.sign-col { width: 30%; }
	</style>
</head>
<body>
	<div class="header-flex">
		<div>
			<strong>Учреждение:</strong> ${info.clinicNameRu}<br>
			<strong>Структурное подразделение:</strong> ${doc.cabinetNameRu}<br>
			<strong>Материально ответственное лицо:</strong> ${doc.doctorFullName} (${doc.doctorSpecialty})<br>
			<strong>Пациент:</strong> ${doc.patientName} ${doc.patientBirthDate ? `(д.р. ${doc.patientBirthDate})` : ""}
		</div>
		<div class="okud-block">
			Унифицированная форма по <strong>ОКУД 0504230</strong><br>
			по ОКПО <strong>${info.okpoCode}</strong><br>
			ИНН <strong>${info.inn}</strong> / КПП <strong>${info.kpp}</strong><br>
			Приказ Минфина России № 52н
		</div>
	</div>

	<div class="act-title">АКТ О СПИСАНИИ МАТЕРИАЛЬНЫХ ЗАПАСОВ № ${doc.actNumber}</div>
	<div style="text-align: center; margin-bottom: 8px;">Дата составления: <strong>${doc.actDate} г.</strong></div>

	<table>
		<thead>
			<tr>
				<th rowspan="2">№</th>
				<th rowspan="2">Наименование медикаментов и материалов</th>
				<th rowspan="2">Номенкл. номер</th>
				<th rowspan="2">Партия (LOT)</th>
				<th rowspan="2">Срок годности</th>
				<th rowspan="2">Ед. изм.</th>
				<th colspan="3">Количество</th>
				<th rowspan="2">Цена, руб.</th>
				<th rowspan="2">Сумма, руб.</th>
				<th rowspan="2">Направление расхода (Услуга 804н / Пациент)</th>
				<th rowspan="2">Причина расхождения / обоснование</th>
			</tr>
			<tr>
				<th>По норме</th>
				<th>Факт</th>
				<th>Откл.</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml}
			<tr style="font-weight: bold; background: #f8f8f8;">
				<td colspan="6" style="border: 1px solid #000; padding: 4px; text-align: right;">ИТОГО ПО АКТУ:</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">—</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${totals.totalMaterialsQuantity}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">—</td>
				<td style="border: 1px solid #000; padding: 4px;"></td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${totals.totalCostRubles.toFixed(2)}</td>
				<td colspan="2" style="border: 1px solid #000; padding: 4px;"></td>
			</tr>
		</tbody>
	</table>

	<p>
		Всего израсходовано <strong>${doc.lines.length}</strong> наименований на общую сумму <strong>${totals.totalCostRubles.toFixed(2)} руб.</strong> (${totals.totalCostFormatted}).<br>
		${
			doc.isQuickCarpuleWriteoff
				? "Списание пустых использованных карпул и ампул анестетиков произведено старшей медсестрой / ассистентом в упрощенном порядке (без созыва комиссии)."
				: "Списание произведено в соответствии с клиническими протоколами Минздрава РФ и технологическими картами по Приказу № 804н."
		}
	</p>

	${
		doc.isQuickCarpuleWriteoff
			? `<div class="signatures-row">
		<div class="sign-col" style="width: 45%;">
			<strong>СПИСАНИЕ ПРОИЗВЕЛ (ЕДИНОЛИЧНО):</strong><br>
			${doc.writtenOffByRole || info.headNursePosition || "Старшая медицинская сестра"}<br>
			________________ / ${doc.assistantFullName || doc.doctorFullName || info.headNurseFullName} /<br>
			«____» ________________ 2026 г.
		</div>
		<div class="sign-col" style="width: 45%;">
			<strong>МАТЕРИАЛЬНО ОТВЕТСТВЕННОЕ ЛИЦО:</strong><br>
			${doc.doctorSpecialty || "Заведующий кабинетом"}<br>
			________________ / ${doc.doctorFullName || info.chiefDoctorFullName} /
		</div>
	</div>`
			: `<div class="signatures-row">
		<div class="sign-col">
			<strong>УТВЕРЖДАЮ:</strong><br>
			${info.chiefDoctorPosition}<br>
			________________ / ${info.chiefDoctorFullName} /<br>
			«____» ________________ 2026 г.
		</div>
		<div class="sign-col">
			<strong>ПРЕДСЕДАТЕЛЬ КОМИССИИ:</strong><br>
			${info.headNursePosition}<br>
			________________ / ${info.headNurseFullName} /
		</div>
		<div class="sign-col">
			<strong>ВРАЧ (МОЛ):</strong><br>
			${doc.doctorSpecialty}<br>
			________________ / ${doc.doctorFullName} /
		</div>
	</div>`
	}
</body>
</html>`;
}

/**
 * Генерация Требования-накладной по форме № М-11 (ОКУД 0315003)
 */
export function generateFormM11Html(
	doc: ClinicalWriteoffDocument,
	clinicInfo: ClinicLegalInfo = DEFAULT_CLINIC_LEGAL_INFO,
): string {
	const info = doc.clinicInfo || clinicInfo;
	const totals = doc.totals;

	const rowsHtml = doc.lines
		.map((line, index) => {
			const unitRub = kopecksToRubles(line.unitCostKopecks);
			const totalRub = kopecksToRubles(line.totalCostKopecks);

			return `<tr>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${index + 1}</td>
				<td style="border: 1px solid #000; padding: 4px;">${line.nameRu}</td>
				<td style="border: 1px solid #000; padding: 4px; font-family: monospace; text-align: center;">${line.sku}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${line.unit}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${line.okeiCode}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${line.standardQuantity}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${line.actualQuantity}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${unitRub.toFixed(2)}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${totalRub.toFixed(2)}</td>
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Требование-накладная М-11 № ${doc.actNumber}</title>
	<style>
		@page { size: A4 portrait; margin: 10mm; }
		body { font-family: 'Times New Roman', serif; font-size: 9pt; line-height: 1.25; color: #000; }
		.header { display: flex; justify-content: space-between; margin-bottom: 8px; }
		.title { text-align: center; font-weight: bold; font-size: 12pt; margin: 8px 0; text-transform: uppercase; }
		table { width: 100%; border-collapse: collapse; margin: 10px 0; }
		th { border: 1px solid #000; padding: 4px; background: #f0f0f0; font-size: 8pt; text-align: center; }
		.signs { display: flex; justify-content: space-between; margin-top: 20px; }
	</style>
</head>
<body>
	<div class="header">
		<div>
			<strong>Организация:</strong> ${info.clinicNameRu}<br>
			<strong>Отправитель:</strong> Центральный материальный склад (Аптека)<br>
			<strong>Получатель:</strong> ${doc.cabinetNameRu} (${doc.doctorFullName})
		</div>
		<div style="text-align: right; font-size: 8pt;">
			Типовая межотраслевая форма № <strong>М-11</strong><br>
			Форма по <strong>ОКУД 0315003</strong><br>
			по ОКПО <strong>${info.okpoCode}</strong>
		</div>
	</div>

	<div class="title">ТРЕБОВАНИЕ-НАКЛАДНАЯ № ${doc.actNumber}</div>
	<div style="text-align: center;">Дата: <strong>${doc.actDate} г.</strong></div>

	<table>
		<thead>
			<tr>
				<th>№</th>
				<th>Наименование материала</th>
				<th>Номенклатурный номер</th>
				<th>Ед. изм.</th>
				<th>Код ОКЕИ</th>
				<th>Затребовано</th>
				<th>Отпущено</th>
				<th>Цена, руб.</th>
				<th>Сумма, руб.</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml}
			<tr style="font-weight: bold; background: #f8f8f8;">
				<td colspan="6" style="border: 1px solid #000; padding: 4px; text-align: right;">ИТОГО:</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${totals.totalMaterialsQuantity}</td>
				<td style="border: 1px solid #000; padding: 4px;"></td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${totals.totalCostRubles.toFixed(2)}</td>
			</tr>
		</tbody>
	</table>

	<div class="signs">
		<div>
			<strong>Отпустил:</strong><br>
			${info.headNursePosition}<br>
			________________ / ${info.headNurseFullName} /
		</div>
		<div>
			<strong>Получил:</strong><br>
			${doc.doctorSpecialty}<br>
			________________ / ${doc.doctorFullName} /
		</div>
	</div>
</body>
</html>`;
}

/**
 * Генерация Акта о списании товаров по форме № ТОРГ-16 (ОКУД 0330216)
 */
export function generateTorg16Html(
	doc: ClinicalWriteoffDocument,
	clinicInfo: ClinicLegalInfo = DEFAULT_CLINIC_LEGAL_INFO,
): string {
	const info = doc.clinicInfo || clinicInfo;
	const totals = doc.totals;

	const rowsHtml = doc.lines
		.map((line, index) => {
			const unitRub = kopecksToRubles(line.unitCostKopecks);
			const totalRub = kopecksToRubles(line.totalCostKopecks);
			const reasonDef = getDiscrepancyReason(line.discrepancyReasonCode);

			return `<tr>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${index + 1}</td>
				<td style="border: 1px solid #000; padding: 4px;">${line.nameRu}</td>
				<td style="border: 1px solid #000; padding: 4px; font-family: monospace; text-align: center;">${line.sku}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${line.unit}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${line.actualQuantity}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${unitRub.toFixed(2)}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${totalRub.toFixed(2)}</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">${line.discrepancyNotes || reasonDef.labelRu}</td>
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Акт о списании товаров ТОРГ-16 № ${doc.actNumber}</title>
	<style>
		@page { size: A4 landscape; margin: 10mm; }
		body { font-family: 'Times New Roman', serif; font-size: 9pt; line-height: 1.25; color: #000; }
		.header { display: flex; justify-content: space-between; margin-bottom: 8px; }
		.title { text-align: center; font-weight: bold; font-size: 12pt; margin: 8px 0; text-transform: uppercase; }
		table { width: 100%; border-collapse: collapse; margin: 10px 0; }
		th { border: 1px solid #000; padding: 4px; background: #f0f0f0; font-size: 8pt; text-align: center; }
		.signs { display: flex; justify-content: space-between; margin-top: 25px; }
	</style>
</head>
<body>
	<div class="header">
		<div>
			<strong>Организация:</strong> ${info.clinicNameRu}<br>
			<strong>Структурное подразделение:</strong> ${doc.cabinetNameRu}
		</div>
		<div style="text-align: right; font-size: 8pt;">
			Унифицированная форма № <strong>ТОРГ-16</strong><br>
			Форма по <strong>ОКУД 0330216</strong><br>
			по ОКПО <strong>${info.okpoCode}</strong>
		</div>
	</div>

	<div class="title">АКТ О СПИСАНИИ ТОВАРОВ № ${doc.actNumber}</div>
	<div style="text-align: center;">Дата составления: <strong>${doc.actDate} г.</strong></div>

	<table>
		<thead>
			<tr>
				<th>№</th>
				<th>Наименование товара / материала</th>
				<th>Артикул (SKU)</th>
				<th>Ед. изм.</th>
				<th>Количество</th>
				<th>Цена, руб.</th>
				<th>Сумма, руб.</th>
				<th>Причина списания</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml}
			<tr style="font-weight: bold; background: #f8f8f8;">
				<td colspan="4" style="border: 1px solid #000; padding: 4px; text-align: right;">ИТОГО:</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${totals.totalMaterialsQuantity}</td>
				<td style="border: 1px solid #000; padding: 4px;"></td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${totals.totalCostRubles.toFixed(2)}</td>
				<td style="border: 1px solid #000; padding: 4px;"></td>
			</tr>
		</tbody>
	</table>

	${
		doc.isQuickCarpuleWriteoff
			? `<div class="signs">
		<div style="width: 45%;">
			<strong>Списание произведено единолично:</strong><br>
			${doc.writtenOffByRole || info.headNursePosition || "Старшая медицинская сестра"}<br>
			________________ / ${doc.assistantFullName || doc.doctorFullName || info.headNurseFullName} /
		</div>
		<div style="width: 45%;">
			<strong>Согласовано (МОЛ):</strong><br>
			${doc.doctorSpecialty || info.chiefDoctorPosition}<br>
			________________ / ${doc.doctorFullName || info.chiefDoctorFullName} /
		</div>
	</div>`
			: `<div class="signs">
		<div>
			<strong>Член комиссии:</strong><br>
			${doc.doctorSpecialty}<br>
			________________ / ${doc.doctorFullName} /
		</div>
		<div>
			<strong>Член комиссии:</strong><br>
			${info.headNursePosition}<br>
			________________ / ${info.headNurseFullName} /
		</div>
		<div>
			<strong>Утвердил руководитель:</strong><br>
			${info.chiefDoctorPosition}<br>
			________________ / ${info.chiefDoctorFullName} /
		</div>
	</div>`
	}
</body>
</html>`;
}

/**
 * Экспорт реестра списаний в формат CSV (RFC 4180 с UTF-8 BOM)
 */
export function exportClinicalWriteoffToCsv(
	docs: readonly ClinicalWriteoffDocument[],
): string {
	const headers = [
		"№ акта",
		"Дата акта",
		"Пациент",
		"Врач",
		"Кабинет",
		"Код услуги 804н",
		"Материал",
		"Артикул (SKU)",
		"Серия (LOT)",
		"Серийный номер (SN)",
		"Срок годности",
		"Ед. изм.",
		"По норме",
		"Фактически",
		"Отклонение",
		"Цена, руб.",
		"Сумма, руб.",
		"Причина отклонения",
		"Статус",
	];

	const rows: string[] = [];

	for (const doc of docs) {
		for (const line of doc.lines) {
			const reasonDef = getDiscrepancyReason(line.discrepancyReasonCode);
			const unitRub = kopecksToRubles(line.unitCostKopecks);
			const totalRub = kopecksToRubles(line.totalCostKopecks);

			rows.push(
				[
					`"${doc.actNumber}"`,
					doc.actDate,
					`"${doc.patientName}"`,
					`"${doc.doctorFullName}"`,
					`"${doc.cabinetNameRu}"`,
					`"${line.serviceCode}"`,
					`"${line.nameRu}"`,
					`"${line.sku}"`,
					`"${line.lotNumber || ""}"`,
					`"${line.serialNumber || ""}"`,
					`"${line.expirationDate || ""}"`,
					`"${line.unit}"`,
					line.standardQuantity.toString(),
					line.actualQuantity.toString(),
					line.discrepancyQuantity.toString(),
					unitRub.toFixed(2),
					totalRub.toFixed(2),
					`"${line.discrepancyNotes || reasonDef.labelRu}"`,
					`"${doc.status}"`,
				].join(";"),
			);
		}
	}

	const csvContent = [headers.join(";"), ...rows].join("\r\n");
	return `\uFEFF${csvContent}`;
}
