import type { RomiPerformanceStatus } from "./romiTypes.js";

export interface ChannelRomiResult {
	profitKopecks: number;
	romiPercent: number | null;
	cacKopecks: number | null;
	averageCheckKopecks: number | null;
	romiStatus: RomiPerformanceStatus;
}

export function safeKopecks(value: number): number {
	return Math.max(0, Math.round(value));
}

export function calculateChannelProfitKopecks(revenueKopecks: number, spentKopecks: number): number {
	return safeKopecks(revenueKopecks) - safeKopecks(spentKopecks);
}

export function calculateChannelRomi(
	spentKopecks: number,
	primaryPatientsCount: number,
	revenueKopecks: number,
): ChannelRomiResult {
	const safeSpent = safeKopecks(spentKopecks);
	const safePatients = safeKopecks(primaryPatientsCount);
	const safeRevenue = safeKopecks(revenueKopecks);
	const profitKopecks = safeRevenue - safeSpent;

	const cacKopecks = safePatients > 0 ? Math.round(safeSpent / safePatients) : null;
	const averageCheckKopecks = safePatients > 0 ? Math.round(safeRevenue / safePatients) : null;

	if (safeSpent === 0) {
		const cac = safePatients > 0 ? 0 : null;
		return {
			profitKopecks: safeRevenue > 0 ? profitKopecks : 0,
			romiPercent: null,
			cacKopecks: cac,
			averageCheckKopecks,
			romiStatus: safeRevenue > 0 || safePatients > 0 ? "organic" : "break_even",
		};
	}

	const rawRomi = (profitKopecks / safeSpent) * 100;
	const romiPercent = Number.isFinite(rawRomi) ? Number(rawRomi.toFixed(1)) : null;

	let romiStatus: RomiPerformanceStatus = "profitable";
	if (romiPercent !== null && romiPercent >= 300) {
		romiStatus = "super_profitable";
	} else if (romiPercent !== null && romiPercent > 0) {
		romiStatus = "profitable";
	} else if (romiPercent === 0) {
		romiStatus = "break_even";
	} else {
		romiStatus = "loss";
	}

	return { profitKopecks, romiPercent, cacKopecks, averageCheckKopecks, romiStatus };
}
