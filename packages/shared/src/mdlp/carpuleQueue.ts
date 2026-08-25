import { parseMdlpDataMatrix } from "./parser.js";
import type {
	DentalAnestheticInfo,
	MdlpCarpuleBatch,
	MdlpCarpuleQueueItem,
	MdlpCarpuleQueueStats,
	MdlpDisposalItem,
	MdlpDisposalParams,
} from "./types.js";

/**
 * Creates a queue item from raw DataMatrix barcode or pre-parsed fields.
 */
export function createCarpuleQueueItem(
	rawBarcode: string,
	options: {
		id?: string | undefined;
		costRub?: number | null | undefined;
		patientId?: string | null | undefined;
		patientName?: string | null | undefined;
		visitId?: string | null | undefined;
		doctorId?: string | null | undefined;
		doctorName?: string | null | undefined;
		cabinetId?: string | null | undefined;
		referenceDate?: Date | undefined;
	} = {},
): MdlpCarpuleQueueItem {
	const refDate = options.referenceDate ?? new Date();
	const parsed = parseMdlpDataMatrix(rawBarcode, refDate);

	const id = options.id ?? `carpule_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
	const scannedAt = new Date().toISOString();

	return {
		id,
		rawBarcode,
		gtin: parsed.gtin,
		serialNumber: parsed.serialNumber,
		sgtin: parsed.sgtin,
		series: parsed.series ?? parsed.lot ?? null,
		expirationDate: parsed.expirationDate,
		expirationDateRaw: parsed.expirationDateRaw,
		isExpired: parsed.isExpired,
		isExpiringSoon: parsed.isExpiringSoon,
		daysUntilExpiration: parsed.daysUntilExpiration,
		drugInfo: parsed.recognizedDrug,
		costRub: options.costRub ?? null,
		patientId: options.patientId ?? null,
		patientName: options.patientName ?? null,
		visitId: options.visitId ?? null,
		doctorId: options.doctorId ?? null,
		doctorName: options.doctorName ?? null,
		cabinetId: options.cabinetId ?? null,
		scannedAt,
		status: "queued",
	};
}

/**
 * Sorts carpule queue items by FEFO (First Expired, First Out) principle.
 * Items with earliest expiration dates come first; expired items top priority for disposal.
 */
export function sortQueueByFefo(items: readonly MdlpCarpuleQueueItem[]): MdlpCarpuleQueueItem[] {
	return [...items].sort((a, b) => {
		// 1. Items with known expiration date come before items without expiration date
		if (!a.expirationDate && b.expirationDate) return 1;
		if (a.expirationDate && !b.expirationDate) return -1;
		if (a.expirationDate && b.expirationDate) {
			const diff = new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
			if (diff !== 0) return diff;
		}

		// 2. Tie-break by scannedAt (FIFO)
		return new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime();
	});
}

/**
 * Groups carpules in queue by drug and series/lot for batch verification.
 */
export function groupQueueByBatch(
	items: readonly MdlpCarpuleQueueItem[],
): readonly MdlpCarpuleBatch[] {
	const batchMap = new Map<string, MdlpCarpuleQueueItem[]>();

	for (const item of items) {
		const drugId = item.drugInfo?.id ?? (item.gtin || "unknown");
		const series = item.series ?? "NO_SERIES";
		const key = `${drugId}_${series}`;

		const list = batchMap.get(key);
		if (!list) {
			batchMap.set(key, [item]);
		} else {
			list.push(item);
		}
	}

	const result: MdlpCarpuleBatch[] = [];
	for (const [_, batchItems] of batchMap) {
		const first = batchItems[0]!;
		const drug = first.drugInfo;
		const tradeName = drug?.tradeName ?? first.gtin;
		const inn = drug?.inn ?? "Медицинский препарат";
		const series = first.series ?? "Без серии";
		const expirationDate = first.expirationDate;
		const isExpired = batchItems.some((it) => it.isExpired);
		const isExpiringSoon = batchItems.some((it) => it.isExpiringSoon);
		const totalCostRub = batchItems.reduce((sum, it) => sum + (it.costRub ?? 0), 0);

		result.push({
			drugId: drug?.id ?? first.gtin,
			tradeName,
			inn,
			series,
			expirationDate,
			isExpired,
			isExpiringSoon,
			count: batchItems.length,
			items: batchItems,
			totalCostRub: Number(totalCostRub.toFixed(2)),
		});
	}

	return result;
}

/**
 * Calculates aggregate statistics for a carpule write-off queue.
 */
export function calculateQueueStats(
	items: readonly MdlpCarpuleQueueItem[],
): MdlpCarpuleQueueStats {
	let totalCostRub = 0;
	let expiredCount = 0;
	let expiringSoonCount = 0;
	let validCount = 0;
	const drugsSet = new Set<string>();
	const seriesSet = new Set<string>();

	for (const item of items) {
		if (item.costRub != null && !Number.isNaN(item.costRub)) {
			totalCostRub += item.costRub;
		}
		if (item.isExpired) {
			expiredCount++;
		} else if (item.isExpiringSoon) {
			expiringSoonCount++;
			validCount++;
		} else {
			validCount++;
		}

		if (item.drugInfo?.id) {
			drugsSet.add(item.drugInfo.id);
		} else if (item.gtin) {
			drugsSet.add(item.gtin);
		}

		if (item.series) {
			seriesSet.add(item.series);
		}
	}

	return {
		totalCount: items.length,
		totalCostRub: Number(totalCostRub.toFixed(2)),
		expiredCount,
		expiringSoonCount,
		validCount,
		uniqueDrugsCount: drugsSet.size,
		uniqueSeriesCount: seriesSet.size,
	};
}

/**
 * Validates a list of queue items before writing off.
 * Flags duplicates, missing SGTINs, and expired items if not explicitly allowed.
 */
export function validateQueueForDisposal(
	items: readonly MdlpCarpuleQueueItem[],
	allowExpired = false,
): { isValid: boolean; errors: string[]; warnings: string[] } {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (items.length === 0) {
		errors.push("Очередь списания пуста. Отсканируйте хотя бы одну карпулу / препарат.");
		return { isValid: false, errors, warnings };
	}

	const sgtinSet = new Set<string>();
	for (let i = 0; i < items.length; i++) {
		const item = items[i]!;
		if (!item.sgtin || item.sgtin.trim().length === 0) {
			errors.push(`Позиция #${i + 1}: отсутствует валидный SGTIN.`);
		} else if (sgtinSet.has(item.sgtin)) {
			errors.push(`Позиция #${i + 1}: дубликат SGTIN "${item.sgtin}" в очереди списания.`);
		} else {
			sgtinSet.add(item.sgtin);
		}

		if (item.isExpired) {
			if (!allowExpired) {
				errors.push(
					`Препарат "${item.drugInfo?.tradeName ?? item.gtin}" (серия ${item.series ?? "—"}) просрочен (${item.expirationDate}). Списание для лечения запрещено.`,
				);
			} else {
				warnings.push(
					`Внимание: списывается просроченный препарат "${item.drugInfo?.tradeName ?? item.gtin}" (${item.expirationDate}).`,
				);
			}
		} else if (item.isExpiringSoon) {
			warnings.push(
				`Препарат "${item.drugInfo?.tradeName ?? item.gtin}" истекает в ближайшие дни (${item.expirationDate}).`,
			);
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
	};
}

/**
 * Builds MdlpDisposalParams for Schema 10560 payload generation from queue items.
 */
export function buildDisposalParamsFromQueue(options: {
	subjectId: string;
	docNum: string;
	docDate: string;
	items: readonly MdlpCarpuleQueueItem[];
	patientId?: string | null;
	visitId?: string | null;
	doctorId?: string | null;
	notes?: string | null;
	operationDate?: string | Date;
}): MdlpDisposalParams {
	const disposalItems: MdlpDisposalItem[] = options.items.map((it) => ({
		sgtin: it.sgtin,
		gtin: it.gtin,
		serialNumber: it.serialNumber,
		series: it.series,
		lot: it.series,
		expirationDate: it.expirationDate,
		costRub: it.costRub,
		tradeName: it.drugInfo?.tradeName,
		inn: it.drugInfo?.inn,
	}));

	return {
		subjectId: options.subjectId,
		docNum: options.docNum,
		docDate: options.docDate,
		withdrawalType: 13,
		operationDate: options.operationDate ?? new Date().toISOString(),
		patientId: options.patientId ?? null,
		visitId: options.visitId ?? null,
		doctorId: options.doctorId ?? null,
		notes: options.notes ?? null,
		items: disposalItems,
	};
}
