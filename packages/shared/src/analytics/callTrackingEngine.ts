/**
 * callTrackingEngine.ts — End-to-End Analytics & Call-Tracking Engine for Dental Clinics.
 *
 * DOMAIN RESPONSIBILITIES:
 * 1. UTM Parameters & External Call Tracking Integration:
 *    - UTM tags parsing & normalization (utm_source, utm_medium, utm_campaign, utm_content, utm_term).
 *    - Roistat, Calltouch, UIS / Comagic, Mango Office session & call ID binding to patient primary card.
 * 2. 5-Stage Conversion Funnel:
 *    - Stage 1: Clicks & Impressions (Ad Traffic / Visits)
 *    - Stage 2: Calls & Inquiries (SIP Telephony / PBX / Web forms)
 *    - Stage 3: Booked Appointments (Online & Reception bookings)
 *    - Stage 4: Attended Visits (Actual patient appearance in chair)
 *    - Stage 5: Paid Treatment Plans (Completed acts & fiscal payments in kopecks)
 * 3. Exact Unit Economics & ROMI in Integer Kopecks:
 *    - CPL (Cost per Lead / Call): Ad Spend / Calls
 *    - CPA (Cost per Appointment): Ad Spend / Bookings
 *    - CAC (Customer Acquisition Cost): Ad Spend / Paying Patients
 *    - Average Ticket / Check: Total Revenue / Paying Patients
 *    - Net Profit: Revenue - Ad Spend
 *    - ROMI (%): ((Revenue - Ad Spend) / Ad Spend) * 100%
 *    - Multi-attribution model support (First Touch, Last Touch, Linear).
 */

import { z } from "zod";
import { formatKopecksRu, parseKopecks } from "../utils/money.js";
import type { RomiPerformanceStatus } from "../marketing/marketingRomiEngine.js";

// ─── 1. UTM PARAMETERS & CALLTRACKING EXTERNAL IDS SCHEMAS ──────────────────

export const utmParametersSchema = z.object({
	utm_source: z.string().optional().default(""),
	utm_medium: z.string().optional().default(""),
	utm_campaign: z.string().optional().default(""),
	utm_content: z.string().optional().default(""),
	utm_term: z.string().optional().default(""),
	referrer: z.string().optional().default(""),
	landingPage: z.string().optional().default(""),
});

export type UtmParameters = z.infer<typeof utmParametersSchema>;

export const externalCallTrackingIdsSchema = z.object({
	calltouchId: z.string().optional(),
	roistatId: z.string().optional(),
	uisId: z.string().optional(),
	comagicId: z.string().optional(),
	mangoCallId: z.string().optional(),
	yandexClientId: z.string().optional(),
	googleClientId: z.string().optional(),
	customSessionId: z.string().optional(),
});

export type ExternalCallTrackingIds = z.infer<typeof externalCallTrackingIdsSchema>;

// ─── 2. PATIENT ATTRIBUTION & CALL RECORD SCHEMAS ────────────────────────────

export type FunnelStage = "click" | "call" | "booked" | "attended" | "paid_plan" | "lost";

export const patientAttributionRecordSchema = z.object({
	id: z.string().min(1),
	patientId: z.string().min(1),
	patientFullName: z.string().min(1),
	phone: z.string().min(1),
	createdAtIso: z.string().min(1),
	channelKey: z.string().min(1),
	channelNameRu: z.string().min(1),
	categoryRu: z.string().default("Реклама"),
	utm: utmParametersSchema.default({}),
	externalIds: externalCallTrackingIdsSchema.default({}),
	currentStage: z.enum(["click", "call", "booked", "attended", "paid_plan", "lost"]),
	sipCallDurationSeconds: z.number().int().nonnegative().optional().default(0),
	sipProvider: z.string().optional().default("mango"),
	doctorName: z.string().optional(),
	specialtyRu: z.string().optional(),
	appointmentDateIso: z.string().optional(),
	treatmentPlanTitle: z.string().optional(),
	totalPaidKopecks: z.number().int().nonnegative().default(0),
	notes: z.string().optional(),
});

export type PatientAttributionRecord = z.infer<typeof patientAttributionRecordSchema>;

// ─── 3. ROMI STATUS & CHANNEL METRIC CONTRACTS ──────────────────────────────

export const advertisingChannelPerformanceInputSchema = z.object({
	id: z.string().min(1),
	channelKey: z.string().min(1),
	nameRu: z.string().min(1, "Укажите название рекламного канала"),
	categoryRu: z.string().default("Реклама"),
	adSpendKopecks: z.number().int().nonnegative("Сумма затрат не может быть отрицательной"),
	clicksCount: z.number().int().nonnegative().default(0),
	callsCount: z.number().int().nonnegative().default(0),
	bookedAppointmentsCount: z.number().int().nonnegative().default(0),
	attendedVisitsCount: z.number().int().nonnegative().default(0),
	paidPlansCount: z.number().int().nonnegative().default(0),
	revenueKopecks: z.number().int().nonnegative("Выручка не может быть отрицательной"),
	notes: z.string().optional(),
});

export type AdvertisingChannelPerformanceInput = z.infer<
	typeof advertisingChannelPerformanceInputSchema
>;

export interface ChannelConversionRates {
	clickToCallRate: number;     // (calls / clicks) * 100%
	callToBookRate: number;      // (booked / calls) * 100%
	bookToAttendRate: number;    // (attended / booked) * 100%
	attendToPaidRate: number;    // (paid / attended) * 100%
	overallConversionRate: number; // (paid / clicks) * 100% or (paid / calls) * 100%
}

export interface AdvertisingChannelPerformanceMetric {
	id: string;
	channelKey: string;
	nameRu: string;
	categoryRu: string;
	adSpendKopecks: number;
	clicksCount: number;
	callsCount: number;
	bookedAppointmentsCount: number;
	attendedVisitsCount: number;
	paidPlansCount: number;
	revenueKopecks: number;
	profitKopecks: number;
	romiPercent: number | null;
	cplKopecks: number | null;
	cpaKopecks: number | null;
	cacKopecks: number | null;
	averageCheckKopecks: number | null;
	conversionRates: ChannelConversionRates;
	romiStatus: RomiPerformanceStatus;
	adSpendFormatted: string;
	revenueFormatted: string;
	profitFormatted: string;
	cplFormatted: string;
	cpaFormatted: string;
	cacFormatted: string;
	averageCheckFormatted: string;
	romiFormatted: string;
	notes?: string | undefined;
}

// ─── 4. SUMMARY FUNNEL CONTRACT ─────────────────────────────────────────────

export interface FunnelStageMetric {
	stage: FunnelStage;
	stageLabelRu: string;
	count: number;
	conversionFromPrevious: number; // %
	conversionFromFirst: number;    // %
	dropOffCount: number;
	dropOffPercent: number;
	unitCostKopecks: number | null;
	unitCostFormatted: string;
}

export interface MarketingFunnelSummary {
	totalChannelsCount: number;
	activeChannelsCount: number;
	totalAdSpendKopecks: number;
	totalClicksCount: number;
	totalCallsCount: number;
	totalBookedAppointmentsCount: number;
	totalAttendedVisitsCount: number;
	totalPaidPlansCount: number;
	totalRevenueKopecks: number;
	totalProfitKopecks: number;
	overallRomiPercent: number | null;
	overallCplKopecks: number | null;
	overallCpaKopecks: number | null;
	overallCacKopecks: number | null;
	overallAverageCheckKopecks: number | null;
	conversionRates: ChannelConversionRates;
	funnelStages: FunnelStageMetric[];
	profitableChannelsCount: number;
	lossChannelsCount: number;
	organicChannelsCount: number;
	topChannelName: string | null;
	totalAdSpendFormatted: string;
	totalRevenueFormatted: string;
	totalProfitFormatted: string;
	overallCplFormatted: string;
	overallCpaFormatted: string;
	overallCacFormatted: string;
	overallAverageCheckFormatted: string;
	overallRomiFormatted: string;
}

// ─── 5. PURE CALCULATION ALGORITHMS (NO FLOAT MONEY) ─────────────────────────

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

/**
 * Aggregates summary funnel and performance metrics across all channels.
 */
export function calculateMarketingChannelsPerformance(
	channels: readonly AdvertisingChannelPerformanceInput[],
): {
	channels: AdvertisingChannelPerformanceMetric[];
	summary: MarketingFunnelSummary;
} {
	const calculatedChannels = channels.map(calculateChannelPerformance);

	let totalAdSpendKopecks = 0;
	let totalClicksCount = 0;
	let totalCallsCount = 0;
	let totalBookedAppointmentsCount = 0;
	let totalAttendedVisitsCount = 0;
	let totalPaidPlansCount = 0;
	let totalRevenueKopecks = 0;

	let profitableCount = 0;
	let lossCount = 0;
	let organicCount = 0;
	let activeCount = 0;

	let maxRevenue = -1;
	let topChannelName: string | null = null;

	for (const ch of calculatedChannels) {
		totalAdSpendKopecks += ch.adSpendKopecks;
		totalClicksCount += ch.clicksCount;
		totalCallsCount += ch.callsCount;
		totalBookedAppointmentsCount += ch.bookedAppointmentsCount;
		totalAttendedVisitsCount += ch.attendedVisitsCount;
		totalPaidPlansCount += ch.paidPlansCount;
		totalRevenueKopecks += ch.revenueKopecks;

		if (
			ch.adSpendKopecks > 0 ||
			ch.callsCount > 0 ||
			ch.revenueKopecks > 0 ||
			ch.clicksCount > 0
		) {
			activeCount++;
		}

		if (ch.romiStatus === "organic") {
			organicCount++;
		} else if (
			ch.romiStatus === "super_profitable" ||
			ch.romiStatus === "profitable"
		) {
			profitableCount++;
		} else if (ch.romiStatus === "loss") {
			lossCount++;
		}

		if (ch.revenueKopecks > maxRevenue && ch.revenueKopecks > 0) {
			maxRevenue = ch.revenueKopecks;
			topChannelName = ch.nameRu;
		}
	}

	const totalProfitKopecks = totalRevenueKopecks - totalAdSpendKopecks;

	let overallRomiPercent: number | null = null;
	if (totalAdSpendKopecks > 0) {
		overallRomiPercent = Number(
			(((totalProfitKopecks) / totalAdSpendKopecks) * 100).toFixed(1),
		);
	}

	let overallCplKopecks: number | null = null;
	if (totalCallsCount > 0) {
		overallCplKopecks = Math.round(totalAdSpendKopecks / totalCallsCount);
	}

	let overallCpaKopecks: number | null = null;
	if (totalBookedAppointmentsCount > 0) {
		overallCpaKopecks = Math.round(
			totalAdSpendKopecks / totalBookedAppointmentsCount,
		);
	}

	let overallCacKopecks: number | null = null;
	if (totalPaidPlansCount > 0) {
		overallCacKopecks = Math.round(totalAdSpendKopecks / totalPaidPlansCount);
	} else if (totalAttendedVisitsCount > 0) {
		overallCacKopecks = Math.round(
			totalAdSpendKopecks / totalAttendedVisitsCount,
		);
	}

	let overallAverageCheckKopecks: number | null = null;
	if (totalPaidPlansCount > 0) {
		overallAverageCheckKopecks = Math.round(
			totalRevenueKopecks / totalPaidPlansCount,
		);
	} else if (totalAttendedVisitsCount > 0) {
		overallAverageCheckKopecks = Math.round(
			totalRevenueKopecks / totalAttendedVisitsCount,
		);
	}

	let overallRomiFormatted = "—";
	if (overallRomiPercent !== null) {
		overallRomiFormatted = `${overallRomiPercent > 0 ? "+" : ""}${overallRomiPercent.toFixed(1)}%`;
	} else if (totalRevenueKopecks > 0 && totalAdSpendKopecks === 0) {
		overallRomiFormatted = "100% Органика";
	}

	const conversionRates = calculateConversionRates(
		totalClicksCount,
		totalCallsCount,
		totalBookedAppointmentsCount,
		totalAttendedVisitsCount,
		totalPaidPlansCount,
	);

	// Build 5-Stage Visual Funnel metrics
	const firstStageCount = totalClicksCount > 0 ? totalClicksCount : totalCallsCount;

	const funnelStages: FunnelStageMetric[] = [
		{
			stage: "click",
			stageLabelRu: "1. Трафик / Клики",
			count: totalClicksCount,
			conversionFromPrevious: 100.0,
			conversionFromFirst: 100.0,
			dropOffCount: Math.max(0, totalClicksCount - totalCallsCount),
			dropOffPercent:
				totalClicksCount > 0
					? Number(
							(
								((totalClicksCount - totalCallsCount) / totalClicksCount) *
								100
							).toFixed(1),
						)
					: 0,
			unitCostKopecks:
				totalClicksCount > 0
					? Math.round(totalAdSpendKopecks / totalClicksCount)
					: null,
			unitCostFormatted:
				totalClicksCount > 0
					? formatKopecksRu(Math.round(totalAdSpendKopecks / totalClicksCount))
					: "—",
		},
		{
			stage: "call",
			stageLabelRu: "2. Звонки / Лиды (SIP)",
			count: totalCallsCount,
			conversionFromPrevious:
				totalClicksCount > 0
					? Number(((totalCallsCount / totalClicksCount) * 100).toFixed(1))
					: 100.0,
			conversionFromFirst:
				firstStageCount > 0
					? Number(((totalCallsCount / firstStageCount) * 100).toFixed(1))
					: 0,
			dropOffCount: Math.max(0, totalCallsCount - totalBookedAppointmentsCount),
			dropOffPercent:
				totalCallsCount > 0
					? Number(
							(
								((totalCallsCount - totalBookedAppointmentsCount) /
									totalCallsCount) *
								100
							).toFixed(1),
						)
					: 0,
			unitCostKopecks: overallCplKopecks,
			unitCostFormatted:
				overallCplKopecks !== null ? formatKopecksRu(overallCplKopecks) : "—",
		},
		{
			stage: "booked",
			stageLabelRu: "3. Записи на приём",
			count: totalBookedAppointmentsCount,
			conversionFromPrevious:
				totalCallsCount > 0
					? Number(
							(
								(totalBookedAppointmentsCount / totalCallsCount) *
								100
							).toFixed(1),
						)
					: 0,
			conversionFromFirst:
				firstStageCount > 0
					? Number(
							(
								(totalBookedAppointmentsCount / firstStageCount) *
								100
							).toFixed(1),
						)
					: 0,
			dropOffCount: Math.max(
				0,
				totalBookedAppointmentsCount - totalAttendedVisitsCount,
			),
			dropOffPercent:
				totalBookedAppointmentsCount > 0
					? Number(
							(
								((totalBookedAppointmentsCount - totalAttendedVisitsCount) /
									totalBookedAppointmentsCount) *
								100
							).toFixed(1),
						)
					: 0,
			unitCostKopecks: overallCpaKopecks,
			unitCostFormatted:
				overallCpaKopecks !== null ? formatKopecksRu(overallCpaKopecks) : "—",
		},
		{
			stage: "attended",
			stageLabelRu: "4. Явки в клинику",
			count: totalAttendedVisitsCount,
			conversionFromPrevious:
				totalBookedAppointmentsCount > 0
					? Number(
							(
								(totalAttendedVisitsCount / totalBookedAppointmentsCount) *
								100
							).toFixed(1),
						)
					: 0,
			conversionFromFirst:
				firstStageCount > 0
					? Number(
							(
								(totalAttendedVisitsCount / firstStageCount) *
								100
							).toFixed(1),
						)
					: 0,
			dropOffCount: Math.max(
				0,
				totalAttendedVisitsCount - totalPaidPlansCount,
			),
			dropOffPercent:
				totalAttendedVisitsCount > 0
					? Number(
							(
								((totalAttendedVisitsCount - totalPaidPlansCount) /
									totalAttendedVisitsCount) *
								100
							).toFixed(1),
						)
					: 0,
			unitCostKopecks:
				totalAttendedVisitsCount > 0
					? Math.round(totalAdSpendKopecks / totalAttendedVisitsCount)
					: null,
			unitCostFormatted:
				totalAttendedVisitsCount > 0
					? formatKopecksRu(
							Math.round(totalAdSpendKopecks / totalAttendedVisitsCount),
						)
					: "—",
		},
		{
			stage: "paid_plan",
			stageLabelRu: "5. Оплаченные планы",
			count: totalPaidPlansCount,
			conversionFromPrevious:
				totalAttendedVisitsCount > 0
					? Number(
							(
								(totalPaidPlansCount / totalAttendedVisitsCount) *
								100
							).toFixed(1),
						)
					: 0,
			conversionFromFirst:
				firstStageCount > 0
					? Number(
							(
								(totalPaidPlansCount / firstStageCount) *
								100
							).toFixed(1),
						)
					: 0,
			dropOffCount: 0,
			dropOffPercent: 0,
			unitCostKopecks: overallCacKopecks,
			unitCostFormatted:
				overallCacKopecks !== null ? formatKopecksRu(overallCacKopecks) : "—",
		},
	];

	const summary: MarketingFunnelSummary = {
		totalChannelsCount: calculatedChannels.length,
		activeChannelsCount: activeCount,
		totalAdSpendKopecks,
		totalClicksCount,
		totalCallsCount,
		totalBookedAppointmentsCount,
		totalAttendedVisitsCount,
		totalPaidPlansCount,
		totalRevenueKopecks,
		totalProfitKopecks,
		overallRomiPercent,
		overallCplKopecks,
		overallCpaKopecks,
		overallCacKopecks,
		overallAverageCheckKopecks,
		conversionRates,
		funnelStages,
		profitableChannelsCount: profitableCount,
		lossChannelsCount: lossCount,
		organicChannelsCount: organicCount,
		topChannelName,
		totalAdSpendFormatted: formatKopecksRu(totalAdSpendKopecks),
		totalRevenueFormatted: formatKopecksRu(totalRevenueKopecks),
		totalProfitFormatted: formatKopecksRu(totalProfitKopecks),
		overallCplFormatted:
			overallCplKopecks !== null ? formatKopecksRu(overallCplKopecks) : "—",
		overallCpaFormatted:
			overallCpaKopecks !== null ? formatKopecksRu(overallCpaKopecks) : "—",
		overallCacFormatted:
			overallCacKopecks !== null ? formatKopecksRu(overallCacKopecks) : "—",
		overallAverageCheckFormatted:
			overallAverageCheckKopecks !== null
				? formatKopecksRu(overallAverageCheckKopecks)
				: "—",
		overallRomiFormatted,
	};

	return {
		channels: calculatedChannels,
		summary,
	};
}

// ─── 6. UTM PARSER UTILITY ───────────────────────────────────────────────────

/**
 * Parses UTM parameters from full URL or query string safely.
 */
export function parseUtmFromUrl(urlOrQuery: string): UtmParameters {
	if (!urlOrQuery || typeof urlOrQuery !== "string") {
		return {
			utm_source: "",
			utm_medium: "",
			utm_campaign: "",
			utm_content: "",
			utm_term: "",
			referrer: "",
			landingPage: "",
		};
	}

	try {
		let queryPart = urlOrQuery.trim();
		let landingPage = "";

		if (queryPart.startsWith("http://") || queryPart.startsWith("https://")) {
			const parsedUrl = new URL(queryPart);
			queryPart = parsedUrl.search;
			landingPage = parsedUrl.pathname;
		} else if (queryPart.includes("?")) {
			const parts = queryPart.split("?");
			landingPage = parts[0] ?? "";
			queryPart = `?${parts[1] ?? ""}`;
		} else if (!queryPart.startsWith("?")) {
			queryPart = `?${queryPart}`;
		}

		const params = new URLSearchParams(queryPart);

		return {
			utm_source: params.get("utm_source")?.trim() || "",
			utm_medium: params.get("utm_medium")?.trim() || "",
			utm_campaign: params.get("utm_campaign")?.trim() || "",
			utm_content: params.get("utm_content")?.trim() || "",
			utm_term: params.get("utm_term")?.trim() || "",
			referrer: params.get("ref")?.trim() || params.get("referrer")?.trim() || "",
			landingPage,
		};
	} catch {
		return {
			utm_source: "",
			utm_medium: "",
			utm_campaign: "",
			utm_content: "",
			utm_term: "",
			referrer: "",
			landingPage: "",
		};
	}
}

// ─── 7. REALISTIC DENTAL CLINIC PRESETS & SAMPLE DATA ───────────────────────

export const DEFAULT_DENTAL_MARKETING_CHANNELS: readonly AdvertisingChannelPerformanceInput[] =
	[
		{
			id: "ch_yandex_direct",
			channelKey: "yandex_direct",
			nameRu: "Яндекс.Директ (Контекст / Поиск + РСЯ)",
			categoryRu: "Контекстная реклама",
			adSpendKopecks: parseKopecks("75000.00"), // 75 000 ₽
			clicksCount: 1420,
			callsCount: 68,
			bookedAppointmentsCount: 42,
			attendedVisitsCount: 36,
			paidPlansCount: 28,
			revenueKopecks: parseKopecks("485000.00"), // 485 000 ₽
			notes: "Горячие запросы по имплантации All-on-4 и лечению каналов под микроскопом",
		},
		{
			id: "ch_gis_2",
			channelKey: "gis_2",
			nameRu: "2ГИС (Приоритетное размещение + онлайн-запись)",
			categoryRu: "Гео-сервисы и карты",
			adSpendKopecks: parseKopecks("24000.00"), // 24 000 ₽
			clicksCount: 580,
			callsCount: 34,
			bookedAppointmentsCount: 24,
			attendedVisitsCount: 21,
			paidPlansCount: 17,
			revenueKopecks: parseKopecks("210000.00"), // 210 000 ₽
			notes: "Гео-профиль клиники в радиусе 3 км: чистка зубов и лечение кариеса",
		},
		{
			id: "ch_telegram_ads",
			channelKey: "telegram_ads",
			nameRu: "Telegram Ads & Клинический канал",
			categoryRu: "Мессенджеры",
			adSpendKopecks: parseKopecks("35000.00"), // 35 000 ₽
			clicksCount: 890,
			callsCount: 29,
			bookedAppointmentsCount: 18,
			attendedVisitsCount: 15,
			paidPlansCount: 11,
			revenueKopecks: parseKopecks("165000.00"), // 165 000 ₽
			notes: "Таргет на городские каналы: эстетическая реставрация и элайнеры",
		},
		{
			id: "ch_seo_organic",
			channelKey: "seo_organic",
			nameRu: "SEO / Органический поиск Яндекса и Google",
			categoryRu: "Органика",
			adSpendKopecks: parseKopecks("20000.00"), // 20 000 ₽ (SEO-аудит)
			clicksCount: 2100,
			callsCount: 52,
			bookedAppointmentsCount: 38,
			attendedVisitsCount: 33,
			paidPlansCount: 26,
			revenueKopecks: parseKopecks("390000.00"), // 390 000 ₽
			notes: "Статьи врачей по симптомам периодонтита и стоимости циркониевых коронок",
		},
		{
			id: "ch_prodoctorov",
			channelKey: "prodoctorov",
			nameRu: "ПроДокторов / СберЗдоровье (Мед-агрегаторы)",
			categoryRu: "Медицинские порталы",
			adSpendKopecks: parseKopecks("18000.00"), // 18 000 ₽
			clicksCount: 340,
			callsCount: 22,
			bookedAppointmentsCount: 16,
			attendedVisitsCount: 14,
			paidPlansCount: 12,
			revenueKopecks: parseKopecks("154000.00"), // 154 000 ₽
			notes: "Платные профили ведущих ортопедов и хирургов с реальными отзывами",
		},
		{
			id: "ch_vk_ads",
			channelKey: "vk_ads",
			nameRu: "VK Реклама (Таргетинг по гео-локации)",
			categoryRu: "Социальные сети",
			adSpendKopecks: parseKopecks("28000.00"), // 28 000 ₽
			clicksCount: 620,
			callsCount: 19,
			bookedAppointmentsCount: 11,
			attendedVisitsCount: 9,
			paidPlansCount: 6,
			revenueKopecks: parseKopecks("68000.00"), // 68 000 ₽
			notes: "Тестовая кампания на профгигиену полости рта и отбеливание Zoom 4",
		},
		{
			id: "ch_word_of_mouth",
			channelKey: "word_of_mouth",
			nameRu: "Сарафанное радио / Рекомендации пациентов",
			categoryRu: "Органика",
			adSpendKopecks: 0, // 0 ₽
			clicksCount: 0,
			callsCount: 45,
			bookedAppointmentsCount: 41,
			attendedVisitsCount: 39,
			paidPlansCount: 35,
			revenueKopecks: parseKopecks("620000.00"), // 620 000 ₽
			notes: "Рекомендации постоянных пациентов своим родственникам и коллегам",
		},
	];

export const SAMPLE_PATIENT_ATTRIBUTIONS: readonly PatientAttributionRecord[] = [
	{
		id: "attr-101",
		patientId: "PAT-001",
		patientFullName: "Смирнова Екатерина Васильевна",
		phone: "+7 (926) 555-12-34",
		createdAtIso: "2026-08-20T10:14:00.000Z",
		channelKey: "yandex_direct",
		channelNameRu: "Яндекс.Директ",
		categoryRu: "Контекстная реклама",
		utm: {
			utm_source: "yandex",
			utm_medium: "cpc",
			utm_campaign: "msk_implants_microscope",
			utm_content: "banner_3",
			utm_term: "лечение корневых каналов цена",
			referrer: "https://yandex.ru/search",
			landingPage: "/services/endodontics",
		},
		externalIds: {
			calltouchId: "ct-984210",
			roistatId: "roi-44021",
			mangoCallId: "mng-88412",
			yandexClientId: "ya-client-771249",
		},
		currentStage: "paid_plan",
		sipCallDurationSeconds: 184,
		sipProvider: "mango",
		doctorName: "Д-р Смирнов Алексей Петрович",
		specialtyRu: "Терапевт-эндодонтист",
		appointmentDateIso: "2026-08-21T11:30:00.000Z",
		treatmentPlanTitle: "Эндодонтическое лечение зуба 1.6 под микроскопом",
		totalPaidKopecks: parseKopecks("24500.00"),
		notes: "Обратилась по острой боли после перехода с рекламы Яндекса",
	},
	{
		id: "attr-102",
		patientId: "PAT-002",
		patientFullName: "Барабаш Сергей Владимирович",
		phone: "+7 (916) 123-45-67",
		createdAtIso: "2026-08-22T14:20:00.000Z",
		channelKey: "gis_2",
		channelNameRu: "2ГИС",
		categoryRu: "Гео-сервисы и карты",
		utm: {
			utm_source: "2gis",
			utm_medium: "maps_profile",
			utm_campaign: "geo_radius_3km",
			utm_content: "button_online_booking",
			utm_term: "стоматология рядом",
			referrer: "https://2gis.ru",
			landingPage: "/booking",
		},
		externalIds: {
			calltouchId: "ct-984235",
			roistatId: "roi-44056",
			mangoCallId: "mng-88450",
		},
		currentStage: "paid_plan",
		sipCallDurationSeconds: 142,
		sipProvider: "mango",
		doctorName: "Д-р Барабаш Сергей Владимирович",
		specialtyRu: "Хирург-имплантолог",
		appointmentDateIso: "2026-08-23T15:00:00.000Z",
		treatmentPlanTitle: "Дентальная имплантация Astra Tech (21, 22)",
		totalPaidKopecks: parseKopecks("72000.00"),
		notes: "Записался через кнопку 2ГИС, выбрал ближайшую клинику к офису",
	},
	{
		id: "attr-103",
		patientId: "PAT-003",
		patientFullName: "Кузнецов Дмитрий Игоревич",
		phone: "+7 (903) 777-99-11",
		createdAtIso: "2026-08-24T09:45:00.000Z",
		channelKey: "telegram_ads",
		channelNameRu: "Telegram Ads",
		categoryRu: "Мессенджеры",
		utm: {
			utm_source: "telegram",
			utm_medium: "tg_ads",
			utm_campaign: "tg_channel_dental_care",
			utm_content: "post_aligners_discount",
			utm_term: "элайнеры москва",
			referrer: "https://t.me/dental_msk",
			landingPage: "/orthodontics/aligners",
		},
		externalIds: {
			calltouchId: "ct-984288",
			roistatId: "roi-44102",
		},
		currentStage: "attended",
		sipCallDurationSeconds: 210,
		sipProvider: "uis",
		doctorName: "Д-р Смирнов Алексей Петрович",
		specialtyRu: "Ортодонт",
		appointmentDateIso: "2026-08-25T16:30:00.000Z",
		treatmentPlanTitle: "Консультация ортодонта + 3D-сканирование для элайнеров",
		totalPaidKopecks: parseKopecks("5000.00"),
		notes: "Прошел консультацию, ожидает расчет плана лечения элайнерами",
	},
	{
		id: "attr-104",
		patientId: "PAT-004",
		patientFullName: "Волкова Анна Михайловна",
		phone: "+7 (915) 333-88-22",
		createdAtIso: "2026-08-25T11:10:00.000Z",
		channelKey: "prodoctorov",
		channelNameRu: "ПроДокторов",
		categoryRu: "Медицинские порталы",
		utm: {
			utm_source: "prodoctorov",
			utm_medium: "profile_card",
			utm_campaign: "doc_smirnov_reviews",
			utm_content: "badge_top_rating",
			utm_term: "лучший терапевт отзывы",
			referrer: "https://prodoctorov.ru",
			landingPage: "/doctors/smirnov-alexey",
		},
		externalIds: {
			calltouchId: "ct-984312",
			roistatId: "roi-44140",
		},
		currentStage: "paid_plan",
		sipCallDurationSeconds: 165,
		sipProvider: "mango",
		doctorName: "Д-р Смирнов Алексей Петрович",
		specialtyRu: "Терапевт",
		appointmentDateIso: "2026-08-26T12:00:00.000Z",
		treatmentPlanTitle: "Профессиональная гигиена AirFlow + фторирование",
		totalPaidKopecks: parseKopecks("8500.00"),
		notes: "Записалась по отзывам о враче на портале ПроДокторов",
	},
	{
		id: "attr-105",
		patientId: "PAT-005",
		patientFullName: "Федоров Максим Сергеевич",
		phone: "+7 (925) 444-11-99",
		createdAtIso: "2026-08-26T16:00:00.000Z",
		channelKey: "vk_ads",
		channelNameRu: "VK Реклама",
		categoryRu: "Социальные сети",
		utm: {
			utm_source: "vkontakte",
			utm_medium: "targeted_ads",
			utm_campaign: "geo_district_whitening",
			utm_content: "creative_zoom4_promo",
			utm_term: "отбеливание зубов акция",
			referrer: "https://vk.com",
			landingPage: "/whitening",
		},
		externalIds: {
			calltouchId: "ct-984390",
		},
		currentStage: "booked",
		sipCallDurationSeconds: 95,
		sipProvider: "mango",
		doctorName: "Д-р Смирнов Алексей Петрович",
		specialtyRu: "Терапевт",
		appointmentDateIso: "2026-08-29T10:00:00.000Z",
		treatmentPlanTitle: "Первичный осмотр перед отбеливанием Zoom 4",
		totalPaidKopecks: 0,
		notes: "Записан на завтра, подтвердил визит по SMS",
	},
];
