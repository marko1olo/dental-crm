import type { FefoTrafficLightInfo } from "./fefoTypes.js";
import { getFefoTrafficLight } from "./fefoTrafficLightCore.js";

export function getWarehouseFefoTrafficLight(
	expirationDateIso: string | null | undefined,
	referenceDate: string | Date = new Date(),
): FefoTrafficLightInfo {
	return getFefoTrafficLight(expirationDateIso, referenceDate, { warehouseMode: true });
}

export function isBatchExpired(
	expirationDateIso: string | null | undefined,
	referenceDate: string | Date = new Date(),
): boolean {
	const traffic = getFefoTrafficLight(expirationDateIso, referenceDate);
	return traffic.daysLeft <= 0;
}
