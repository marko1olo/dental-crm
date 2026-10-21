import type {
	ChairHourlyCostResult,
	ChairRentalResult,
	ClinicLostRevenueAnalysis,
	ExecutivePeriod,
} from "@dental/shared";
import { formatRubles } from "../../../utils/formatters.js";

export type MobileAnalyticsPeriod =
	| "day"
	| "yesterday"
	| "week"
	| "month"
	| "quarter"
	| "year"
	| "custom";

/**
 * Нормализует любое рублевое значение или строку, гарантируя отсутствие копеек (,00).
 * Соответствует мандату 8e и каноническому формату валюты DENTE («142 500 ₽»).
 */
export function formatRublesClean(val: string | number | null | undefined): string {
	if (val === null || val === undefined || val === "") return "0 ₽";
	if (typeof val === "number") {
		return formatRubles(Math.round(val));
	}
	const cleaned = String(val)
		.replace(/,00(\s*|\u00A0*)₽?/, "")
		.replace(/(\s*|\u00A0*)₽?$/, "")
		.trim();
	const parsed = parseFloat(cleaned.replace(/\s+/g, "").replace(/[^\d.-]/g, ""));
	if (Number.isFinite(parsed)) {
		return formatRubles(Math.round(parsed));
	}
	return String(val);
}

export interface ExecutiveDashboardProps {
	readonly initialPeriod?: ExecutivePeriod | undefined;
	readonly period?: ExecutivePeriod | undefined;
	readonly onPeriodChange?: ((period: ExecutivePeriod) => void) | undefined;
	readonly onNavigateToSection?: ((sectionKey: string) => void) | undefined;
	readonly onOpenFinancialAnalytics?: (() => void) | undefined;
	readonly hideBottomBar?: boolean | undefined;
	readonly hideHeaderToolbar?: boolean | undefined;
}

export interface DirectorExecutiveDashboardProps {
	readonly initialPeriod?: ExecutivePeriod | undefined;
	readonly period?: ExecutivePeriod | undefined;
	readonly onPeriodChange?: ((period: ExecutivePeriod) => void) | undefined;
	readonly hideHeaderToolbar?: boolean | undefined;
	readonly onNavigateToSection?: ((sectionKey: string) => void) | undefined;
	readonly onOpenFinancialAnalytics?: (() => void) | undefined;
}

export interface ExecutivePeriodComputedMetrics {
	readonly revenueFormatted: string;
	readonly revenuePlanFormatted: string;
	readonly revenuePercent: number;
	readonly revenueDelta: string;
	readonly occupancyPercent: number;
	readonly averageCheck: string;
	readonly averageCheckDelta: string;
	readonly primaryPatients: number;
	readonly repeatPatients: number;
	readonly primaryDelta: string;
	readonly ltv: string;
	readonly cac: string;
	readonly netProfit: string;
	readonly netMarginPercent: number;
	readonly chairHourlyCostFormatted: string;
	readonly chairEffectiveHourlyYieldFormatted: string;
	readonly lostRevenueFromNoShowsFormatted: string;
	readonly doctorPayrollFormatted: string;
	readonly doctorNetIncomeFormatted: string;
	readonly materialsCostFormatted: string;
	readonly labCostFormatted: string;
	readonly directCogsFormatted: string;
	readonly paymentBreakdown?: {
		readonly cashRub: number;
		readonly cashPercent: number;
		readonly cashFormatted?: string | undefined;
		readonly cardDmsRub: number;
		readonly cardDmsPercent: number;
		readonly cardDmsFormatted?: string | undefined;
		readonly sbpRub: number;
		readonly sbpPercent: number;
		readonly sbpFormatted?: string | undefined;
		readonly depositRub?: number | undefined;
		readonly depositPercent?: number | undefined;
		readonly depositFormatted?: string | undefined;
		readonly totalRub: number;
	} | undefined;
}

export interface ExecutiveChairEconomicsSummary {
	readonly chairCost: ChairHourlyCostResult;
	readonly rentalEconomics: ChairRentalResult;
	readonly lostRevenue: ClinicLostRevenueAnalysis;
	readonly chairHourlyCostRub: number;
	readonly chairHourlyMarginRub: number;
	readonly noShowLostRevenueRub: number;
}

export interface TopDoctorPerformanceRow {
	readonly id: string;
	readonly name: string;
	readonly specialty: string;
	readonly initials: string;
	readonly billed: string;
	readonly averageCheckFormatted: string;
	readonly visits: number;
	readonly attendance: string;
	readonly complexPlansShare: string;
	readonly rank: number;
	readonly badgeColor: string;
}
