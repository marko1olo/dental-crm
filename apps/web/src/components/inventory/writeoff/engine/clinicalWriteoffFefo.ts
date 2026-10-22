import {
	type CabinetStockBatch,
	DENTAL_CABINET_STOCK_PRESETS,
} from "../clinicalWriteoffPresets.js";
import { getDaysUntilExpiration } from "./clinicalWriteoffMath.js";

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
		return { batch: undefined, isExpiringSoon: false, isExpired: false, daysUntilExpiration: undefined };
	}

	const sortedBatches = [...matchingBatches].sort((a, b) => {
		const expA = new Date(a.expirationDate).getTime();
		const expB = new Date(b.expirationDate).getTime();
		if (expA !== expB) return expA - expB;
		return new Date(a.manufactureDate).getTime() - new Date(b.manufactureDate).getTime();
	});

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
		return { batch: undefined, isExpiringSoon: false, isExpired: false, daysUntilExpiration: undefined };
	}

	const days = getDaysUntilExpiration(selectedBatch.expirationDate, referenceDateIso);
	return {
		batch: selectedBatch,
		isExpiringSoon: days >= 0 && days <= 30,
		isExpired: days < 0,
		daysUntilExpiration: days,
	};
}

export function evaluateStockAvailability(
	stockAvailable: number,
	quantityToDeduct: number,
	criticalThreshold: number = 0,
): "ok" | "warning" | "deficit" {
	const current = Number.isFinite(stockAvailable) ? stockAvailable : 0;
	const deduct = Number.isFinite(quantityToDeduct) ? quantityToDeduct : 0;
	const remaining = current - deduct;

	if (remaining < 0 || current <= 0) return "deficit";
	if (remaining <= criticalThreshold) return "warning";
	return "ok";
}
