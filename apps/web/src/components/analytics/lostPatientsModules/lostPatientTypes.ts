export interface LostPatientRow {
	id: string;
	organizationId: string;
	patientName: string;
	phone: string;
	daysSinceLastVisit: number;
	hasFutureAppointment: boolean;
	createdAt: string;
	lastTreatmentCategory?:
		| "sanitation"
		| "implantation"
		| "orthodontics"
		| "general_therapy";
	lastDoctorName?: string;
}

export type TabMode = "risk_list" | "recall_cohorts";

export interface ChairConfig {
	chairId: string;
	chairName: string;
	occupiedMinutes: number;
	revenueKopecks: number;
}

export interface LostPatientsKpis {
	readonly totalRiskPatients: number;
	readonly due6mCount: number;
	readonly overdue12mCount: number;
	readonly critical24mCount: number;
	readonly sanRecall6m: number;
	readonly implRecall12m: number;
	readonly estimatedRecallRevenueKopecks: number;
}
