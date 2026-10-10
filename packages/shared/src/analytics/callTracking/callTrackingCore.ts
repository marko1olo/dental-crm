/**
 * packages/shared/src/analytics/callTracking/callTrackingCore.ts
 *
 * Core Call Tracking Aggregations, 5-Stage Marketing Funnel & Clinic Presets.
 */

import { formatKopecksRu, parseKopecks } from "../../utils/money.js";
import type {
	AdvertisingChannelPerformanceInput,
	AdvertisingChannelPerformanceMetric,
	MarketingFunnelSummary,
	FunnelStageMetric,
} from "./types.js";
import {
	calculateConversionRates,
	calculateChannelPerformance,
} from "./roiAndFunnelCalculator.js";

// ─── 1. MARKETING CHANNELS PERFORMANCE AGGREGATOR ────────────────────────────

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

// ─── 2. DEFAULT DENTAL MARKETING CHANNELS PRESETS ───────────────────────────

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
