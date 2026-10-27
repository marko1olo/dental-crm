/**
 * packages/shared/src/sanpin/kraftBatchEngine.ts
 * Пакетная генерация записей крафт-пакетов и экспорт реестра ЦСО.
 * Мандат 8b: строго <= 120 строк.
 */

import { formatKraftDataMatrixPayload, generate1DBarcodeString } from "./barcodeGenerators.js";
import { getDentalToolSetDefinition } from "./kraftCatalogs.js";
import {
	getKraftMaterialDefinition,
	getKraftSizeDefinition,
	type KraftBatchOptions,
	type KraftPackageRecord,
	type KraftPackageStatus,
} from "./kraftPackageTypes.js";
import { calculatePackageExpiration } from "./thermalLabelEngine.js";

export function generateKraftBatchRecords(options: KraftBatchOptions): KraftPackageRecord[] {
	const quantity = Math.max(1, Math.min(200, options.quantity));
	const now = new Date();
	const packDateStr = options.customPackDate || now.toISOString();
	const expResult = calculatePackageExpiration(packDateStr, options.packageType, options.customPackDate ? new Date(options.customPackDate) : now);
	const toolSet = getDentalToolSetDefinition(options.toolSetId);
	const material = getKraftMaterialDefinition(options.packageType);
	const sizeDef = getKraftSizeDefinition(options.packageSize);
	const batchId = options.customBatchId || `KB-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${String(options.cycleNumber).padStart(2, "0")}`;
	const itemsList = options.customItems && options.customItems.length > 0 ? options.customItems : toolSet.typicalItemsRu;
	const records: KraftPackageRecord[] = [];

	for (let i = 1; i <= quantity; i++) {
		const serialNumber = i;
		const barcode128 = generate1DBarcodeString(batchId, serialNumber);
		const dataMatrixPayload = formatKraftDataMatrixPayload({
			batchId,
			autoclaveId: options.autoclaveId,
			cycleNumber: options.cycleNumber,
			packDate: expResult.packDateFormatted,
			expDate: expResult.expDateFormatted,
			operatorId: options.operatorId || "NURSE-01",
			toolSetId: toolSet.shortCode,
			serialNumber,
		});

		records.push({
			id: `kp-${batchId.toLowerCase()}-${String(serialNumber).padStart(3, "0")}`,
			batchId,
			serialNumber,
			packageType: options.packageType,
			packageSize: options.packageSize,
			toolSetId: toolSet.id,
			toolSetNameRu: toolSet.nameRu,
			itemsListRu: [...itemsList],
			packDate: expResult.packDateFormatted,
			expDate: expResult.expDateFormatted,
			daysLifespan: expResult.daysLifespan,
			daysRemaining: expResult.daysRemaining,
			status: expResult.status,
			autoclaveId: options.autoclaveId,
			cycleNumber: options.cycleNumber,
			operatorId: options.operatorId || "NURSE-01",
			operatorName: options.operatorName || "Медсестра ЦСО",
			indicatorId: options.indicatorId || "vinar_intetest_5",
			indicatorVerified: options.indicatorVerified ?? true,
			barcode128,
			barcodeDataMatrixPayload: dataMatrixPayload,
			isBreached: false,
			notes: options.notes || `Партия ${material.shortLabelRu}, размер ${sizeDef.dimensionsMmRu}`,
			createdAt: now.toISOString(),
		});
	}
	return records;
}

export function filterKraftPackages(
	records: readonly KraftPackageRecord[],
	filter: { status?: KraftPackageStatus | "all" | undefined; query?: string | undefined; autoclaveId?: string | undefined },
): KraftPackageRecord[] {
	return records.filter((r) => {
		if (filter.status && filter.status !== "all" && r.status !== filter.status) return false;
		if (filter.autoclaveId && filter.autoclaveId !== "all" && r.autoclaveId !== filter.autoclaveId) return false;
		if (filter.query && filter.query.trim()) {
			const q = filter.query.toLowerCase().trim();
			if (!r.toolSetNameRu.toLowerCase().includes(q) && !r.barcode128.toLowerCase().includes(q) && !r.batchId.toLowerCase().includes(q)) return false;
		}
		return true;
	});
}

export interface KraftBatchStatistics {
	readonly totalPacks: number;
	readonly sterileValidCount: number;
	readonly expiringSoonCount: number;
	readonly expiredCount: number;
	readonly recalledCount: number;
	readonly verifiedIndicatorCount: number;
}

export function calculateKraftBatchStatistics(records: readonly KraftPackageRecord[]): KraftBatchStatistics {
	let sterileValidCount = 0;
	let expiringSoonCount = 0;
	let expiredCount = 0;
	let recalledCount = 0;
	let verifiedIndicatorCount = 0;
	for (const r of records) {
		if (r.status === "sterile_valid") sterileValidCount++;
		else if (r.status === "expiring_soon_7d") expiringSoonCount++;
		else if (r.status === "expired") expiredCount++;
		else if (r.status === "recalled") recalledCount++;
		if (r.indicatorVerified) verifiedIndicatorCount++;
	}
	return { totalPacks: records.length, sterileValidCount, expiringSoonCount, expiredCount, recalledCount, verifiedIndicatorCount };
}

export function exportKraftBatchToCsv(records: readonly KraftPackageRecord[]): string {
	const headers = ["ID записи", "Номер партии", "Серийный номер", "Штрихкод 1D", "2D DataMatrix Payload", "Наименование набора", "Дата стерилизации", "Срок годности (до)", "Нормативный срок (суток)", "Осталось дней", "Статус стерильности", "Автоклав", "Номер цикла", "Оператор ЦСО"];
	const escape = (val: unknown) => `"${String(val ?? "").replace(/"/g, '""')}"`;
	const rows = records.map((r) => [escape(r.id), escape(r.batchId), escape(r.serialNumber), escape(r.barcode128), escape(r.barcodeDataMatrixPayload), escape(r.toolSetNameRu), escape(r.packDate), escape(r.expDate), escape(r.daysLifespan), escape(r.daysRemaining), escape(r.status), escape(r.autoclaveId), escape(r.cycleNumber), escape(r.operatorName)]);
	return `\uFEFF${[headers.join(";"), ...rows.map((row) => row.join(";"))].join("\r\n")}`;
}
