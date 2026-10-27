/**
 * packages/shared/src/analytics/executiveModules/executiveDepartmentTypes.ts
 * Types for department breakdowns, raw inputs, and plan fulfillment status.
 * Mandate 8b: <= 120 lines.
 */

import type { DepartmentPerformanceStatus, ExecutiveDepartmentKey } from "./executiveDepartmentDefinitions.js";

export interface RawDepartmentInput {
	readonly departmentKey: ExecutiveDepartmentKey;
	readonly planRevenueKopecks: number;
	readonly factRevenueKopecks: number;
	readonly completedVisitsCount: number;
	readonly uniquePatientsCount: number;
}

export interface ExecutiveDepartmentItem {
	readonly departmentKey: ExecutiveDepartmentKey;
	readonly titleRu: string;
	readonly shortTitleRu: string;
	readonly planRevenueKopecks: number;
	readonly factRevenueKopecks: number;
	readonly planRevenueRub: number;
	readonly factRevenueRub: number;
	readonly planRevenueFormatted: string;
	readonly factRevenueFormatted: string;
	readonly planFulfillmentPercent: number;
	readonly shareOfTotalRevenuePercent: number;
	readonly averageCheckKopecks: number;
	readonly averageCheckRub: number;
	readonly averageCheckFormatted: string;
	readonly completedVisitsCount: number;
	readonly uniquePatientsCount: number;
	readonly status: DepartmentPerformanceStatus;
	readonly statusLabel: string;
	readonly accentColor: string;
}
