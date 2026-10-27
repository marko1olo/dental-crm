/**
 * packages/shared/src/analytics/executiveModules/planConversionAnalytics.ts
 * Calculates 8-stage conversion funnel, dropoffs, step costs and defect prevention.
 * Mandate 8b: <= 120 lines.
 */

import { formatKopecksRu } from "../../utils/money.js";
import { EXECUTIVE_FUNNEL_STAGE_DEFINITIONS, type ExecutiveFunnelStage } from "./executiveFunnelDefinitions.js";
import type { ExecutiveFunnelStageItem, RawFunnelStageInput } from "./executiveFunnelTypes.js";

/**
 * Расчет сквозной 8-этапной воронки первичных пациентов с отвалами и стоимостью шага.
 * Устраняет аномалии деления (DEFECT-FUNNEL-01): значения нормируются, конверсия не превышает 100%.
 */
export function calculateExecutiveFunnel(
	rawStages: readonly RawFunnelStageInput[],
	totalMarketingSpendKopecks = 0,
): ExecutiveFunnelStageItem[] {
	const countMap = new Map<ExecutiveFunnelStage, number>();
	const volumeMap = new Map<ExecutiveFunnelStage, number>();

	for (const input of rawStages) {
		countMap.set(input.stage, Math.max(0, Math.round(input.count)));
		if (input.totalVolumeKopecks !== undefined) {
			volumeMap.set(input.stage, Math.max(0, Math.round(input.totalVolumeKopecks)));
		}
	}

	const leadCount = countMap.get("lead") ?? 0;
	let previousCount = leadCount;

	return EXECUTIVE_FUNNEL_STAGE_DEFINITIONS.map((def, index) => {
		const currentCount = countMap.get(def.stage) ?? 0;
		const volumeKopecks = volumeMap.get(def.stage) ?? 0;

		let conversionFromPrevious = 100.0;
		if (index > 0) {
			if (previousCount > 0) {
				conversionFromPrevious = Math.min(100.0, Number(((currentCount / previousCount) * 100).toFixed(1)));
			} else if (leadCount > 0) {
				conversionFromPrevious = Math.min(100.0, Number(((currentCount / leadCount) * 100).toFixed(1)));
			} else {
				conversionFromPrevious = 0.0;
			}
		}

		let conversionFromLead = 100.0;
		if (index > 0) {
			conversionFromLead = leadCount > 0
				? Math.min(100.0, Number(((currentCount / leadCount) * 100).toFixed(1)))
				: 0.0;
		}

		const dropOffCount = index > 0 ? Math.max(0, previousCount - currentCount) : 0;
		const dropOffPercent = index > 0 && previousCount > 0
			? Math.min(100.0, Number(((dropOffCount / previousCount) * 100).toFixed(1)))
			: 0.0;

		let unitCostKopecks: number | null = null;
		if (totalMarketingSpendKopecks > 0 && currentCount > 0) {
			unitCostKopecks = Math.round(totalMarketingSpendKopecks / currentCount);
		}

		previousCount = currentCount;

		return {
			stage: def.stage,
			stepNumber: def.stepNumber,
			title: def.title,
			shortTitle: def.shortTitle,
			count: currentCount,
			conversionFromPreviousPercent: Math.min(100, Math.max(0, conversionFromPrevious)),
			conversionFromLeadPercent: Math.min(100, Math.max(0, conversionFromLead)),
			dropOffCount,
			dropOffPercent: Math.min(100, Math.max(0, dropOffPercent)),
			totalVolumeKopecks: volumeKopecks,
			totalVolumeRub: Math.round(volumeKopecks / 100),
			totalVolumeFormatted: formatKopecksRu(volumeKopecks),
			unitCostKopecks,
			unitCostFormatted: unitCostKopecks !== null ? formatKopecksRu(unitCostKopecks) : "—",
			...(def.isAiAssisted !== undefined ? { isAiAssisted: def.isAiAssisted } : {}),
		};
	});
}
