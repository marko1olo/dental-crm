/**
 * packages/shared/src/analytics/executiveModules/executiveKpiTypes.ts
 * Period schemas, payment breakdowns, top doctors and procedure types.
 * Mandate 8b: <= 120 lines.
 */

import { z } from "zod";
import type { ExecutiveFunnelStageItem } from "./executiveFunnelTypes.js";
import type { ExecutiveDepartmentItem } from "./executiveDepartmentTypes.js";
import type { ExecutiveKpis } from "./executiveSummaryTypes.js";

export const executivePeriodSchema = z.enum([
	"day",
	"yesterday",
	"week",
	"month",
	"quarter",
	"year",
	"custom",
]);
export type ExecutivePeriod = z.infer<typeof executivePeriodSchema>;

export interface ExecutivePaymentBreakdown {
	readonly cashRub: number;
	readonly cashPercent: number;
	readonly cardDmsRub: number;
	readonly cardDmsPercent: number;
	readonly sbpRub: number;
	readonly sbpPercent: number;
	readonly depositRub?: number | undefined;
	readonly depositPercent?: number | undefined;
	readonly totalRub: number;
}

export interface ExecutiveTopDoctorItem {
	readonly id: string;
	readonly doctorUserId?: string;
	readonly name: string;
	readonly specialty: string;
	readonly initials: string;
	readonly revenueKopecks: number;
	readonly revenueRub: number;
	readonly revenueFormatted: string;
	readonly visitsCount: number;
	readonly attendancePercent: number;
	readonly averageCheckKopecks: number;
	readonly averageCheckFormatted: string;
	readonly rank: number;
}

export interface ExecutiveTopProcedureItem {
	readonly id: string;
	readonly code804n?: string;
	readonly name: string;
	readonly category: string;
	readonly count: number;
	readonly revenueKopecks: number;
	readonly revenueRub: number;
	readonly revenueFormatted: string;
	readonly sharePercent: number;
}

export interface ExecutiveDashboardPayload {
	readonly kpis: ExecutiveKpis;
	readonly funnelStages: readonly ExecutiveFunnelStageItem[];
	readonly departments: readonly ExecutiveDepartmentItem[];
	readonly topDoctors?: readonly ExecutiveTopDoctorItem[];
	readonly topProcedures?: readonly ExecutiveTopProcedureItem[];
	readonly period: ExecutivePeriod;
	readonly dateRangeStartIso: string;
	readonly dateRangeEndIso: string;
	readonly updatedAtIso: string;
	readonly isEmpty: boolean;
}
