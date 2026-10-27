/**
 * packages/shared/src/analytics/executiveModules/executiveFunnelTypes.ts
 * Types for funnel stages, volume metrics and calculated conversion items.
 * Mandate 8b: <= 120 lines.
 */

import type { ExecutiveFunnelStage } from "./executiveFunnelDefinitions.js";

export interface RawFunnelStageInput {
	readonly stage: ExecutiveFunnelStage;
	readonly count: number;
	readonly totalVolumeKopecks?: number;
	readonly isAiAssisted?: boolean;
}

export interface ExecutiveFunnelStageItem {
	readonly stage: ExecutiveFunnelStage;
	readonly stepNumber: number;
	readonly title: string;
	readonly shortTitle: string;
	readonly count: number;
	readonly conversionFromPreviousPercent: number;
	readonly conversionFromLeadPercent: number;
	readonly dropOffCount: number;
	readonly dropOffPercent: number;
	readonly totalVolumeKopecks: number;
	readonly totalVolumeRub: number;
	readonly totalVolumeFormatted: string;
	readonly unitCostKopecks: number | null;
	readonly unitCostFormatted: string;
	readonly isAiAssisted?: boolean | undefined;
}
