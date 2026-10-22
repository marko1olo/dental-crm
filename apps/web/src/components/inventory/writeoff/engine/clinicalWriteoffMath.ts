import { type Kopecks, multiplyKopecks } from "@dental/shared";

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

export function kopecksToRubles(kopecks: Kopecks): number {
	return Math.round(kopecks) / 100;
}

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
