/**
 * FUNNEL ENGINE MODULES: CONVERSION CALCULATOR (FACADE)
 *
 * Layer 5: Канонический фасад расчетного движка воронки лидов и сквозной аналитики.
 * Реэкспортирует чистые функции расчета когорт, ROI и периодов.
 *
 * ИНВАРИАНТЫ:
 * - 100% защита от деления на 0 во всех операциях (safePercent, safeDivide).
 * - Точность до копеек и рублей (без NaN / Infinity).
 * - Чистые функции без сайд-эффектов.
 */

import {
	type CanonicalMarketingChannelKey,
	type ChannelFunnelMetric,
	type ChannelSpendMap,
	FUNNEL_STAGES,
	type FunnelAnalysisResult,
	type FunnelLead,
	type FunnelStageMetric,
	type FunnelTimePeriod,
	type LeadFunnelStageKey,
	MARKETING_CHANNELS,
	type MarketingMetricsSummary,
	normalizeMarketingChannel,
} from "./types.js";

import {
	detectLeadStage,
	filterLeadsByPeriod,
	hasLeadPassedStage,
} from "./funnelCohortCalculator.js";

import {
	buildChannelFunnelMetric,
	extractLeadRevenueRub,
	getDefaultChannelSpendMap,
	safeDivide,
	safePercent,
} from "./funnelRoiEngine.js";

// Реэкспорт всех типов и функций Layer 0, 1, 2
export * from "./funnelConversionTypes.js";
export * from "./funnelCohortCalculator.js";
export * from "./funnelRoiEngine.js";

/**
 * Комплексный расчет сквозной воронки лидов и маркетинговой аналитики клиники.
 */
export function calculateFunnelAnalysis(
	rawLeads: readonly FunnelLead[],
	period: FunnelTimePeriod = "all",
	customSpendMap?: ChannelSpendMap,
	referenceDate: Date = new Date(),
): FunnelAnalysisResult {
	const leads = filterLeadsByPeriod(rawLeads, period, referenceDate);
	const defaultSpends = getDefaultChannelSpendMap();

	// Объединяем бюджеты
	const channelSpends: Record<CanonicalMarketingChannelKey, number> = {
		...defaultSpends,
		...(customSpendMap ?? {}),
	};

	// 1. Определение этапов для каждого лида
	const leadsWithStages = leads.map((lead) => ({
		lead,
		stage: detectLeadStage(lead),
		channel: normalizeMarketingChannel(lead.source),
		revenueRub: extractLeadRevenueRub(lead),
	}));

	// 2. Расчет счетчиков этапов
	const stageCounts: Record<LeadFunnelStageKey, number> = {
		new: 0,
		contacted: 0,
		consult_booked: 0,
		showed_up: 0,
		treatment_plan_accepted: 0,
		paid: 0,
	};

	for (const item of leadsWithStages) {
		for (const stageCfg of FUNNEL_STAGES) {
			if (hasLeadPassedStage(item.stage, stageCfg.key)) {
				stageCounts[stageCfg.key] += 1;
			}
		}
	}

	const totalLeadsCount = stageCounts.new;

	// 3. Формирование поэтапной воронки
	const stages: FunnelStageMetric[] = FUNNEL_STAGES.map((cfg, idx) => {
		const count = stageCounts[cfg.key] ?? 0;
		const nextStageCfg = FUNNEL_STAGES[idx + 1];
		const nextCount = nextStageCfg ? (stageCounts[nextStageCfg.key] ?? 0) : 0;
		const dropCount =
			idx < FUNNEL_STAGES.length - 1 ? Math.max(0, count - nextCount) : 0;
		const dropRatePercent = safePercent(dropCount, count);

		const prevStageCfg = idx > 0 ? FUNNEL_STAGES[idx - 1] : undefined;
		const prevCount = prevStageCfg
			? (stageCounts[prevStageCfg.key] ?? count)
			: count;
		const conversionFromPrevPercent =
			idx === 0 ? 100 : safePercent(count, prevCount);
		const conversionFromFirstPercent = safePercent(count, totalLeadsCount);

		return {
			key: cfg.key,
			index: cfg.index,
			label: cfg.label,
			shortLabel: cfg.shortLabel,
			color: cfg.color,
			badgeColor: cfg.badgeColor,
			count,
			dropCount,
			dropRatePercent,
			conversionFromFirstPercent,
			conversionFromPrevPercent,
		};
	});

	// 4. Финансовые и маркетинговые суммы
	let totalMarketingSpendRub = 0;
	for (const key of Object.keys(channelSpends) as CanonicalMarketingChannelKey[]) {
		totalMarketingSpendRub += channelSpends[key];
	}

	let totalRevenueRub = 0;
	for (const item of leadsWithStages) {
		if (hasLeadPassedStage(item.stage, "paid")) {
			totalRevenueRub += item.revenueRub;
		}
	}

	const paidLeads = stageCounts.paid;
	const bookedLeads = stageCounts.consult_booked;
	const showUpLeads = stageCounts.showed_up;
	const contactedLeads = stageCounts.contacted;
	const agreedPlanLeads = stageCounts.treatment_plan_accepted;

	const showUpRatePercent = safePercent(showUpLeads, bookedLeads);
	const bookingRatePercent = safePercent(bookedLeads, totalLeadsCount);
	const planAcceptanceRatePercent = safePercent(agreedPlanLeads, showUpLeads);
	const overallConversionPercent = safePercent(paidLeads, totalLeadsCount);

	const avgBillRub = safeDivide(totalRevenueRub, paidLeads);
	const cplRub = safeDivide(totalMarketingSpendRub, totalLeadsCount);
	const cpsRub = safeDivide(totalMarketingSpendRub, showUpLeads);
	const cacRub = safeDivide(totalMarketingSpendRub, paidLeads);

	const netMarketingProfitRub = totalRevenueRub - totalMarketingSpendRub;
	const romiPercent =
		totalMarketingSpendRub > 0
			? safePercent(netMarketingProfitRub, totalMarketingSpendRub)
			: 0;

	// Фактический LTV на основе реальных оплат пациентов
	const ltvEstimatedRub = avgBillRub;
	const ltvToCacRatio = cacRub > 0 ? safeDivide(ltvEstimatedRub, cacRub, 1) : 0;

	const summary: MarketingMetricsSummary = {
		totalLeads: totalLeadsCount,
		contactedLeads,
		bookedLeads,
		showUpLeads,
		agreedPlanLeads,
		paidLeads,
		showUpRatePercent,
		bookingRatePercent,
		planAcceptanceRatePercent,
		overallConversionPercent,
		totalMarketingSpendRub,
		totalRevenueRub,
		totalRevenueKopecks: totalRevenueRub * 100,
		avgBillRub,
		netMarketingProfitRub,
		cplRub,
		cpsRub,
		cacRub,
		romiPercent,
		ltvEstimatedRub,
		ltvToCacRatio,
	};

	// 5. Расчет по маркетинговым каналам
	const channels: ChannelFunnelMetric[] = MARKETING_CHANNELS.map((ch) => {
		const channelLeads = leadsWithStages.filter((l) => l.channel === ch.key);
		const spendRub = channelSpends[ch.key] ?? 0;

		let leadsCount = 0;
		let bookedCount = 0;
		let showUpCount = 0;
		let agreedCount = 0;
		let paidCount = 0;
		let revenueRub = 0;

		for (const item of channelLeads) {
			leadsCount += 1;
			if (hasLeadPassedStage(item.stage, "consult_booked")) bookedCount += 1;
			if (hasLeadPassedStage(item.stage, "showed_up")) showUpCount += 1;
			if (hasLeadPassedStage(item.stage, "treatment_plan_accepted")) agreedCount += 1;
			if (hasLeadPassedStage(item.stage, "paid")) {
				paidCount += 1;
				revenueRub += item.revenueRub;
			}
		}

		return buildChannelFunnelMetric({
			channelKey: ch.key,
			channelLabel: ch.label,
			color: ch.color,
			spendRub,
			leadsCount,
			bookedCount,
			showUpCount,
			agreedCount,
			paidCount,
			revenueRub,
		});
	});

	return {
		period,
		filteredLeadsCount: leads.length,
		stages,
		summary,
		channels,
	};
}
