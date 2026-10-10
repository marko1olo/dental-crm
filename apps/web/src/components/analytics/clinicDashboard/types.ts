/**
 * apps/web/src/components/analytics/clinicDashboard/types.ts
 *
 * Типовые контракты и DTO единого дашборда аналитики клиники (Layer 0).
 * Строго 0 рантайм-зависимостей, 100% покрытие типов.
 */

import type {
	RawPaymentItem,
	RawInvoiceItem,
	RawVisitFinancialItem,
	FinancialAnalyticsSummary,
} from "../financialAnalyticsEngine.js";
import type {
	RawAppointmentItem,
	ChairDefinition,
	ClinicChairUtilizationSummary,
} from "../chairUtilizationEngine.js";
import type {
	RawDoctorVisitItem,
	ClinicDoctorProductivitySummary,
} from "../doctorProductivityEngine.js";

export type AnalyticsPeriodChoice = "day" | "week" | "month" | "quarter" | "year";
export type AnalyticsTabChoice = "overview" | "finances" | "chairs" | "doctors";

export interface ClinicAnalyticsDashboardProps {
	readonly initialPeriod?: AnalyticsPeriodChoice | undefined;
	readonly initialTab?: AnalyticsTabChoice | undefined;
	readonly onNavigateToSection?: ((sectionKey: string) => void) | undefined;
	readonly customPayments?: readonly RawPaymentItem[] | undefined;
	readonly customInvoices?: readonly RawInvoiceItem[] | undefined;
	readonly customAppointments?: readonly RawAppointmentItem[] | undefined;
	readonly customDoctorVisits?: readonly RawDoctorVisitItem[] | undefined;
	readonly chairsConfig?: readonly ChairDefinition[] | undefined;
}

export interface ClinicAnalyticsDataState {
	readonly period: AnalyticsPeriodChoice;
	readonly setPeriod: (p: AnalyticsPeriodChoice) => void;
	readonly activeTab: AnalyticsTabChoice;
	readonly setActiveTab: (t: AnalyticsTabChoice) => void;
	readonly isLoading: boolean;
	readonly error: string | null;
	readonly periodDaysCount: number;
	readonly periodLabel: string;
	readonly effectivePayments: readonly RawPaymentItem[];
	readonly effectiveInvoices: readonly RawInvoiceItem[];
	readonly effectiveAppointments: readonly RawAppointmentItem[];
	readonly effectiveDoctorVisits: readonly RawDoctorVisitItem[];
	readonly visitsForFinances: readonly RawVisitFinancialItem[];
	readonly financialSummary: FinancialAnalyticsSummary;
	readonly chairSummary: ClinicChairUtilizationSummary;
	readonly doctorSummary: ClinicDoctorProductivitySummary;
	readonly loadLiveData: () => Promise<void>;
	readonly handleExportCsv: () => void;
}
