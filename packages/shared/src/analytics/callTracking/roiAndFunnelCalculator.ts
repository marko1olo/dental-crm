/**
 * packages/shared/src/analytics/callTracking/roiAndFunnelCalculator.ts
 *
 * Pure Calculation Algorithms for Channel Unit Economics & Conversion Rates.
 */

import { formatKopecksRu } from "../../utils/money.js";
import type { RomiPerformanceStatus } from "../../marketing/marketingRomiEngine.js";
import type {
	ChannelConversionRates,
	AdvertisingChannelPerformanceInput,
	AdvertisingChannelPerformanceMetric,
} from "./types.js";

/**
 * Calculates conversion rates safely preventing division by zero.
 */
export function calculateConversionRates(
	clicks: number,
	calls: number,
	booked: number,
	attended: number,
	paid: number,
): ChannelConversionRates {
	const safeClicks = Math.max(0, Math.round(clicks));
	const safeCalls = Math.max(0, Math.round(calls));
	const safeBooked = Math.max(0, Math.round(booked));
	const safeAttended = Math.max(0, Math.round(attended));
	const safePaid = Math.max(0, Math.round(paid));

	const clickToCallRate =
		safeClicks > 0 ? Number(((safeCalls / safeClicks) * 100).toFixed(1)) : 0;
	const callToBookRate =
		safeCalls > 0 ? Number(((safeBooked / safeCalls) * 100).toFixed(1)) : 0;
	const bookToAttendRate =
		safeBooked > 0 ? Number(((safeAttended / safeBooked) * 100).toFixed(1)) : 0;
	const attendToPaidRate =
		safeAttended > 0 ? Number(((safePaid / safeAttended) * 100).toFixed(1)) : 0;

	let overallConversionRate = 0;
	if (safeClicks > 0) {
		overallConversionRate = Number(((safePaid / safeClicks) * 100).toFixed(1));
	} else if (safeCalls > 0) {
		overallConversionRate = Number(((safePaid / safeCalls) * 100).toFixed(1));
	}

	return {
		clickToCallRate,
		callToBookRate,
		bookToAttendRate,
		attendToPaidRate,
		overallConversionRate,
	};
}

/**
 * Calculates individual channel unit economics and ROMI in integer kopecks.
 */
export function calculateChannelPerformance(
	input: AdvertisingChannelPerformanceInput,
): AdvertisingChannelPerformanceMetric {
	const safeSpend = Math.max(0, Math.round(input.adSpendKopecks));
	const safeRevenue = Math.max(0, Math.round(input.revenueKopecks));
	const safeClicks = Math.max(0, Math.round(input.clicksCount));
	const safeCalls = Math.max(0, Math.round(input.callsCount));
	const safeBooked = Math.max(0, Math.round(input.bookedAppointmentsCount));
	const safeAttended = Math.max(0, Math.round(input.attendedVisitsCount));
	const safePaid = Math.max(0, Math.round(input.paidPlansCount));

	const profitKopecks = safeRevenue - safeSpend;

	let cplKopecks: number | null = null;
	if (safeCalls > 0) {
		cplKopecks = Math.round(safeSpend / safeCalls);
	}

	let cpaKopecks: number | null = null;
	if (safeBooked > 0) {
		cpaKopecks = Math.round(safeSpend / safeBooked);
	}

	let cacKopecks: number | null = null;
	if (safePaid > 0) {
		cacKopecks = Math.round(safeSpend / safePaid);
	} else if (safeAttended > 0) {
		cacKopecks = Math.round(safeSpend / safeAttended);
	}

	let averageCheckKopecks: number | null = null;
	if (safePaid > 0) {
		averageCheckKopecks = Math.round(safeRevenue / safePaid);
	} else if (safeAttended > 0) {
		averageCheckKopecks = Math.round(safeRevenue / safeAttended);
	}

	let romiPercent: number | null = null;
	let romiStatus: RomiPerformanceStatus = "profitable";
	let romiFormatted = "—";

	if (safeSpend === 0) {
		if (safeRevenue > 0) {
			romiStatus = "organic";
			romiFormatted = "Органика (∞)";
		} else {
			romiStatus = "break_even";
			romiPercent = 0;
			romiFormatted = "0.0%";
		}
	} else {
		const rawRomi = (profitKopecks / safeSpend) * 100;
		romiPercent = Number(rawRomi.toFixed(1));

		if (romiPercent >= 300) {
			romiStatus = "super_profitable";
		} else if (romiPercent > 0) {
			romiStatus = "profitable";
		} else if (romiPercent === 0) {
			romiStatus = "break_even";
		} else {
			romiStatus = "loss";
		}

		romiFormatted = `${romiPercent > 0 ? "+" : ""}${romiPercent.toFixed(1)}%`;
	}

	const conversionRates = calculateConversionRates(
		safeClicks,
		safeCalls,
		safeBooked,
		safeAttended,
		safePaid,
	);

	return {
		id: input.id,
		channelKey: input.channelKey,
		nameRu: input.nameRu,
		categoryRu: input.categoryRu || "Реклама",
		adSpendKopecks: safeSpend,
		clicksCount: safeClicks,
		callsCount: safeCalls,
		bookedAppointmentsCount: safeBooked,
		attendedVisitsCount: safeAttended,
		paidPlansCount: safePaid,
		revenueKopecks: safeRevenue,
		profitKopecks,
		romiPercent,
		cplKopecks,
		cpaKopecks,
		cacKopecks,
		averageCheckKopecks,
		conversionRates,
		romiStatus,
		adSpendFormatted: formatKopecksRu(safeSpend),
		revenueFormatted: formatKopecksRu(safeRevenue),
		profitFormatted: formatKopecksRu(profitKopecks),
		cplFormatted: cplKopecks !== null ? formatKopecksRu(cplKopecks) : "—",
		cpaFormatted: cpaKopecks !== null ? formatKopecksRu(cpaKopecks) : "—",
		cacFormatted: cacKopecks !== null ? formatKopecksRu(cacKopecks) : "—",
		averageCheckFormatted:
			averageCheckKopecks !== null ? formatKopecksRu(averageCheckKopecks) : "—",
		romiFormatted,
		...(input.notes ? { notes: input.notes } : {}),
	};
}
