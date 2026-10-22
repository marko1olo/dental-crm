import type { CabinetStockBatch } from "../clinicalWriteoffPresets.js";
import {
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
import { VISIT_CONFIGS } from "./quickVisitConfigs.js";

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

export function createQuickVisitWriteoffDocument(params: QuickVisitWriteoffParams = {}): ClinicalWriteoffDocument {
	const visitType = params.visitType || "therapy";
	const batches = params.stockBatches || DENTAL_CABINET_STOCK_PRESETS;
	const cabinetId = params.cabinetId || (visitType === "surgery" ? "cab_02_surgery" : "cab_01_therapy");
	const cabinetNameRu = params.cabinetNameRu || (visitType === "surgery" ? "Кабинет хирургии №2" : "Кабинет терапии №1");
	const actDate = params.actDate || new Date().toISOString().slice(0, 10);
	const doctorFullName = params.doctorFullName || "Кузнецов Михаил Сергеевич";
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
		statutoryFormType: params.statutoryFormType || "0504230",
		status: "confirmed",
		notes: params.notes || `Списание набора визита (${visitType === "surgery" ? "Хирургия" : "Терапия"}) без комиссии`,
		confirmedAt: new Date().toISOString(),
		isQuickCarpuleWriteoff: false,
		isSingleSigner: params.isSingleSigner !== false,
		writtenOffByRole: doctorSpecialty,
	};
}
