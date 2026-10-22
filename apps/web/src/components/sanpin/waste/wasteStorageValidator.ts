import { getWasteStorageLocation, type WasteStorageLocationId } from "./medicalWastePresets.js";
import type { StorageValidationResult } from "./types";

export function validateStorageDuration(
	accumulationTimestamp: string,
	storageLocation: WasteStorageLocationId,
	checkTimestamp: string = new Date().toISOString(),
): StorageValidationResult {
	const startMs = new Date(accumulationTimestamp).getTime();
	const checkMs = new Date(checkTimestamp).getTime();

	if (Number.isNaN(startMs) || Number.isNaN(checkMs)) {
		return {
			isExpired: false,
			hoursElapsed: 0,
			hoursRemaining: 24,
			maxHoursAllowed: 24,
			status: "optimal",
			statusMessageRu: "Некорректная дата накопления",
		};
	}

	const locationDef = getWasteStorageLocation(storageLocation);
	const maxHoursAllowed = locationDef.maxAllowedStorageHours;

	const hoursElapsed = Math.max(0, Math.round(((checkMs - startMs) / (1000 * 60 * 60)) * 10) / 10);
	const hoursRemaining = Math.round((maxHoursAllowed - hoursElapsed) * 10) / 10;
	const isExpired = hoursElapsed > maxHoursAllowed;

	let status: "optimal" | "warning_approaching_limit" | "expired" = "optimal";
	let statusMessageRu = `Срок накопления в норме (осталось ${hoursRemaining} ч)`;

	if (isExpired) {
		status = "expired";
		statusMessageRu = `ВНИМАНИЕ! Превышен нормативный срок накопления на ${Math.abs(hoursRemaining)} ч! Требуется немедленный вывоз или перемещение в холодильник (СанПиН 2.1.3684-21 п. 174).`;
	} else if (hoursRemaining <= maxHoursAllowed * 0.25 || hoursRemaining <= 4) {
		status = "warning_approaching_limit";
		statusMessageRu = `Предупреждение: до истечения срока накопления осталось ${hoursRemaining} ч (режим: ${locationDef.nameRu})`;
	}

	return { isExpired, hoursElapsed, hoursRemaining, maxHoursAllowed, status, statusMessageRu };
}
