import { formatKopecksRu } from "../../utils/money.js";
import { calculateChannelRomi } from "./romiKopeckCalculator.js";
import { calculateRepeatRatePercent, calculateEstimatedCohortLtvKopecks } from "./romiCohortAnalyzer.js";
import { findTopChannelByRevenue } from "./romiChannelRanker.js";
import type { AdvertisingChannelInput, AdvertisingChannelMetric, MarketingRomiSummary } from "./romiTypes.js";

export function buildAdvertisingChannelMetric(input: AdvertisingChannelInput): AdvertisingChannelMetric {
	const { profitKopecks, romiPercent, cacKopecks, averageCheckKopecks, romiStatus } =
		calculateChannelRomi(input.spentKopecks, input.primaryPatientsCount, input.revenueKopecks);
	const leadsCount = input.leadsCount ?? (input.primaryPatientsCount > 0 ? Math.round(input.primaryPatientsCount * 1.25) : 0);
	const showUpRatePercent = leadsCount > 0
		? Number(((input.primaryPatientsCount / leadsCount) * 100).toFixed(1))
		: (input.primaryPatientsCount > 0 ? 100 : 0);
	const repeatVisitsCount = input.repeatVisitsCount ?? 0;
	const repeatRatePercent = calculateRepeatRatePercent(input.primaryPatientsCount, repeatVisitsCount);
	const ltvKopecks = calculateEstimatedCohortLtvKopecks(
		input.primaryPatientsCount, input.revenueKopecks, repeatVisitsCount, averageCheckKopecks, input.totalLtvRevenueKopecks,
	);
	let romiFormatted = "—";
	if (romiStatus === "organic") romiFormatted = "Органика (∞)";
	else if (romiPercent !== null) romiFormatted = `${romiPercent > 0 ? "+" : ""}${romiPercent.toFixed(1)}%`;

	return {
		id: input.id, channelKey: input.channelKey, nameRu: input.nameRu, categoryRu: input.categoryRu || "Реклама",
		spentKopecks: input.spentKopecks, leadsCount, primaryPatientsCount: input.primaryPatientsCount,
		showUpRatePercent, revenueKopecks: input.revenueKopecks, profitKopecks, romiPercent, cacKopecks,
		averageCheckKopecks, repeatVisitsCount, repeatRatePercent, repeatRateFormatted: `${repeatRatePercent.toFixed(1)}%`,
		ltvKopecks, ltvFormatted: ltvKopecks !== null ? formatKopecksRu(ltvKopecks) : "—", romiStatus,
		spentFormatted: formatKopecksRu(input.spentKopecks), revenueFormatted: formatKopecksRu(input.revenueKopecks),
		profitFormatted: formatKopecksRu(profitKopecks), cacFormatted: cacKopecks !== null ? formatKopecksRu(cacKopecks) : "—",
		averageCheckFormatted: averageCheckKopecks !== null ? formatKopecksRu(averageCheckKopecks) : "—", romiFormatted,
		...(input.notes ? { notes: input.notes } : {}),
	};
}

export function calculateMarketingRomiSummary(channels: readonly AdvertisingChannelMetric[]): MarketingRomiSummary {
	let totalSpentKopecks = 0, totalLeadsCount = 0, totalPrimaryPatientsCount = 0;
	let totalRevenueKopecks = 0, totalRepeatVisitsCount = 0, totalLtvRevenueAccKopecks = 0;
	let profitableCount = 0, lossCount = 0, organicCount = 0, activeCount = 0;

	for (const ch of channels) {
		totalSpentKopecks += ch.spentKopecks; totalLeadsCount += ch.leadsCount;
		totalPrimaryPatientsCount += ch.primaryPatientsCount; totalRevenueKopecks += ch.revenueKopecks;
		totalRepeatVisitsCount += ch.repeatVisitsCount;
		if (ch.ltvKopecks !== null && ch.primaryPatientsCount > 0) totalLtvRevenueAccKopecks += ch.ltvKopecks * ch.primaryPatientsCount;
		if (ch.spentKopecks > 0 || ch.primaryPatientsCount > 0 || ch.revenueKopecks > 0) activeCount++;
		if (ch.romiStatus === "organic") organicCount++;
		else if (ch.romiStatus === "super_profitable" || ch.romiStatus === "profitable") profitableCount++;
		else if (ch.romiStatus === "loss") lossCount++;
	}

	const totalProfitKopecks = totalRevenueKopecks - totalSpentKopecks;
	const overallRomiPercent = totalSpentKopecks > 0 ? Number(((totalProfitKopecks / totalSpentKopecks) * 100).toFixed(1)) : null;
	const overallCacKopecks = totalPrimaryPatientsCount > 0 ? Math.round(totalSpentKopecks / totalPrimaryPatientsCount) : null;
	const overallAverageCheckKopecks = totalPrimaryPatientsCount > 0 ? Math.round(totalRevenueKopecks / totalPrimaryPatientsCount) : null;
	const overallShowUpRatePercent = totalLeadsCount > 0
		? Number(((totalPrimaryPatientsCount / totalLeadsCount) * 100).toFixed(1))
		: (totalPrimaryPatientsCount > 0 ? 100 : 0);
	const overallRepeatRatePercent = calculateRepeatRatePercent(totalPrimaryPatientsCount, totalRepeatVisitsCount);
	const overallLtvKopecks = totalPrimaryPatientsCount > 0
		? Math.round((totalLtvRevenueAccKopecks > 0 ? totalLtvRevenueAccKopecks : totalRevenueKopecks) / totalPrimaryPatientsCount)
		: null;

	let overallRomiFormatted = "—";
	if (overallRomiPercent !== null) overallRomiFormatted = `${overallRomiPercent > 0 ? "+" : ""}${overallRomiPercent.toFixed(1)}%`;
	else if (totalRevenueKopecks > 0 && totalSpentKopecks === 0) overallRomiFormatted = "100% Органика";

	return {
		totalChannelsCount: channels.length, activeChannelsCount: activeCount, totalSpentKopecks, totalLeadsCount,
		totalPrimaryPatientsCount, overallShowUpRatePercent, totalRevenueKopecks, totalProfitKopecks, overallRomiPercent,
		overallCacKopecks, overallAverageCheckKopecks, totalRepeatVisitsCount, overallRepeatRatePercent, overallLtvKopecks,
		overallLtvFormatted: overallLtvKopecks !== null ? formatKopecksRu(overallLtvKopecks) : "—",
		profitableChannelsCount: profitableCount, lossChannelsCount: lossCount, organicChannelsCount: organicCount,
		topChannelName: findTopChannelByRevenue(channels), totalSpentFormatted: formatKopecksRu(totalSpentKopecks),
		totalRevenueFormatted: formatKopecksRu(totalRevenueKopecks), totalProfitFormatted: formatKopecksRu(totalProfitKopecks),
		overallCacFormatted: overallCacKopecks !== null ? formatKopecksRu(overallCacKopecks) : "—",
		overallAverageCheckFormatted: overallAverageCheckKopecks !== null ? formatKopecksRu(overallAverageCheckKopecks) : "—",
		overallRomiFormatted,
	};
}
