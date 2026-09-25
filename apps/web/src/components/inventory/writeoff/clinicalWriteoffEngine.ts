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

/**
 * Детерминированный генератор ID строк и документов списания.
 * Использует криптографический UUID (Web Crypto API) или монотонный счётчик на базе времени/performance.
 * Исключает недетерминированный Math.random() в складских документах.
 */
export const generateDocumentRowId = (): string =>
	typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
		? crypto.randomUUID().slice(0, 8)
		: Date.now().toString(36).slice(-6) + Math.floor(typeof performance !== "undefined" ? performance.now() : 0).toString(36);


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
	readonly isSingleSigner?: boolean | undefined;
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


export * from "./clinicalWriteoffQuickDocuments.js";
export * from "./clinicalWriteoffPrintForms.js";

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
