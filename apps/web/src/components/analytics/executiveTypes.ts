/**
 * apps/web/src/components/analytics/executiveTypes.ts
 *
 * Канонические типы и опции периодов для пульта руководителя DENTE CRM.
 */

import type {
	ChairHourlyCostResult,
	ChairRentalResult,
	ClinicLostRevenueAnalysis,
	ExecutivePeriod,
} from "@dental/shared";

export type MobileAnalyticsPeriod =
	| "day"
	| "yesterday"
	| "week"
	| "month"
	| "quarter"
	| "year"
	| "custom";

export const CANONICAL_PERIOD_OPTIONS: readonly {
	readonly key: MobileAnalyticsPeriod;
	readonly label: string;
}[] = [
	{ key: "day", label: "Сегодня" },
	{ key: "yesterday", label: "Вчера" },
	{ key: "week", label: "Неделя" },
	{ key: "month", label: "Месяц" },
	{ key: "quarter", label: "Квартал" },
	{ key: "year", label: "Год" },
] as const;

export interface ExecutiveDashboardProps {
	readonly initialPeriod?: ExecutivePeriod | undefined;
	readonly period?: ExecutivePeriod | undefined;
	readonly initialTab?: "financial" | "payroll" | "chairs" | undefined;
	readonly onPeriodChange?: ((period: ExecutivePeriod) => void) | undefined;
	readonly onNavigateToSection?: ((sectionKey: string) => void) | undefined;
	readonly onOpenFinancialAnalytics?: (() => void) | undefined;
	readonly hideBottomBar?: boolean | undefined;
	readonly hideHeaderToolbar?: boolean | undefined;
}

export function formatRublesClean(val: number): string {
	const rounded = Math.round(val || 0);
	return `${rounded.toLocaleString("ru-RU")} ₽`;
}
