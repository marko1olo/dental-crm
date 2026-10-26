import type { ReportsSummary } from "../ManagerReportsTypes";

export interface PatientFlowMetrics {
	readonly newPatients: number;
	readonly returningPatients: number;
	readonly totalFlow: number;
	readonly primarySharePct: number;
}

export interface FunnelMetrics {
	readonly completedApts: number;
}

export interface ReportsDashboardKpisProps {
	readonly summary: ReportsSummary | null;
	readonly clinicAverageTicketRub: number;
	readonly patientFlowStats: PatientFlowMetrics;
	readonly funnelStats: FunnelMetrics;
}
