import type React from "react";
import type { AnalyticsDashboardData } from "../analyticsDoctorMetrics.js";

export type AnalyticsSection =
	| "executive"
	| "operational"
	| "curators"
	| "lost_patients"
	| "freed_slots"
	| "marketing"
	| "clinic";

/**
 * Recharts типизирует `data` как изменяемый массив, а модель дашборда — только
 * на чтение. Копию делать незачем: библиотека массив не изменяет.
 */
export type CohortChartRow = {
	cohort: string;
	"Month 12": number;
};

export type NamedValueChartRow = {
	name: string;
	value: number;
	fill?: string;
};

export interface DoctorProfitabilityRow {
	name: string;
	revenue: number;
	margin: number | null;
	completionRate: number | null;
	services804nCount?: number;
	labOrdersCount?: number;
	labOrdersCostRub?: number;
	doctorPayrollRub?: number;
	clinicMarginRub?: number | null | undefined;
}

export interface RebookingConversionSummary {
	readonly totalCompletedVisits: number;
	readonly totalVisits: number;
	readonly totalRebookings: number;
	readonly rebookingRate: number;
	readonly doctorRebookingsCount: number;
	readonly chairsideRebookingsCount: number;
	readonly adminRebookingsCount: number;
	readonly frontdeskRebookingsCount: number;
	readonly doctorConversionRate: number;
	readonly adminConversionRate: number;
	readonly overallConversionRate: number;
	readonly chairsideRetentionRate: number;
	readonly thresholdMinutes: number;
	readonly isSoloDoctor: boolean;
	readonly isEmpty: boolean;
}

export interface RebookingItem {
	readonly id: string;
	readonly patientName: string;
	readonly rebookedBy: string;
	readonly timeDeltaMinutes: number | null;
	readonly creditedRole: "doctor" | "administrator";
	readonly appointmentDate: string;
	readonly createdAt?: string;
	readonly attributionReason?: string;
	readonly doctorName?: string | null;
	readonly specialty?: string;
}

export interface RebookingConversionResponse {
	readonly summary: RebookingConversionSummary;
	readonly events: readonly RebookingItem[];
	readonly records: readonly RebookingItem[];
}

export interface KpiCardProps {
	icon: React.ReactNode;
	label: string;
	value: string;
	color: string;
	subtitle?: React.ReactNode;
}

export interface AnalyticsKpiCardsProps {
	data: AnalyticsDashboardData | null;
}

export interface AnalyticsHeaderBarProps {
	updatedAt: Date | null;
	dateRange: string;
	setDateRange: (range: string) => void;
	branchFilter: string;
	setBranchFilter: (branch: string) => void;
	analyticsSection: AnalyticsSection;
	setAnalyticsSection: (section: AnalyticsSection) => void;
	loading: boolean;
	onExportCsv: () => void;
	onRetry: () => void;
	onOpenMarketingRoi: () => void;
	onOpenFinancialAnalytics: () => void;
}

export interface AnalyticsRevenueChartsProps {
	data: AnalyticsDashboardData | null;
}

export interface AnalyticsDoctorsTableProps {
	rows: readonly DoctorProfitabilityRow[];
}

export interface AnalyticsSubDashboardsProps {
	analyticsSection: AnalyticsSection;
	setAnalyticsSection: (section: AnalyticsSection) => void;
	dateRange: string;
	setDateRange: (range: string) => void;
	isMarketingRoiOpen: boolean;
	setIsMarketingRoiOpen: (open: boolean) => void;
	isFinancialAnalyticsOpen: boolean;
	setIsFinancialAnalyticsOpen: (open: boolean) => void;
}

export interface RebookingConversionRulesWidgetProps {
	dateRange: string;
}
