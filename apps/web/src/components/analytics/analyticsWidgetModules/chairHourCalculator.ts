export interface ChairHourMetrics {
	readonly chairId: string | null;
	readonly chairName: string;
	readonly occupiedMinutes: number;
	readonly availableMinutes: number;
	readonly utilizationRatePercent: number;
	readonly revenueKopecks: number;
	readonly revenuePerHourKopecks: number;
	readonly capacityYieldPerHourKopecks: number;
}

export function calculateChairUtilizationPercent(
	occupiedMinutes: number,
	availableMinutes: number,
): number {
	if (
		!Number.isFinite(occupiedMinutes) ||
		!Number.isFinite(availableMinutes) ||
		availableMinutes <= 0
	) {
		return 0;
	}
	const safeOccupied = Math.max(0, occupiedMinutes);
	const rate = (safeOccupied / availableMinutes) * 100;
	return Math.max(0, Math.min(100, Math.round(rate * 10) / 10));
}

export function calculateHourlyRevenueKopecks(
	revenueKopecks: number,
	occupiedMinutes: number,
): number {
	if (
		!Number.isFinite(revenueKopecks) ||
		revenueKopecks <= 0 ||
		!Number.isFinite(occupiedMinutes) ||
		occupiedMinutes <= 0
	) {
		return 0;
	}
	const hours = occupiedMinutes / 60;
	return Math.round(revenueKopecks / hours);
}

export function calculateCapacityYieldKopecks(
	revenueKopecks: number,
	availableMinutes: number,
): number {
	if (
		!Number.isFinite(revenueKopecks) ||
		revenueKopecks <= 0 ||
		!Number.isFinite(availableMinutes) ||
		availableMinutes <= 0
	) {
		return 0;
	}
	const hours = availableMinutes / 60;
	return Math.round(revenueKopecks / hours);
}

export function formatKopecksToRub(
	kopecks: number,
	includeKopecks = true,
): string {
	if (!Number.isFinite(kopecks) || kopecks === 0) {
		return includeKopecks ? "0,00 ₽" : "0 ₽";
	}
	const isNegative = kopecks < 0;
	const absKopecks = Math.abs(Math.round(kopecks));
	const rubles = Math.floor(absKopecks / 100);
	const remainderKopecks = absKopecks % 100;
	const formattedRubles = rubles
		.toLocaleString("ru-RU")
		.replace(/\u00A0/g, " ");

	if (includeKopecks) {
		const kopStr = remainderKopecks.toString().padStart(2, "0");
		return `${isNegative ? "-" : ""}${formattedRubles},${kopStr} ₽`;
	}
	return `${isNegative ? "-" : ""}${formattedRubles} ₽`;
}

export function formatKopecksPerHour(kopecksPerHour: number): string {
	return `${formatKopecksToRub(kopecksPerHour, false)}/час`;
}
