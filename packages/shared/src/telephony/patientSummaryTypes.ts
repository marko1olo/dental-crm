/**
 * Telephony Patient Summary Contracts (Financials, Visits, Somatic Alerts)
 */

export interface PatientFinancialSummary {
	balanceRub: number;
	formattedBalance: string;
	hasDebt: boolean;
	debtRub: number;
	formattedDebt: string;
	hasInsurance: boolean;
	insuranceName: string | null;
	policyNumber: string | null;
}

export interface PatientLastVisitSummary {
	lastVisitDate: string | null;
	formattedLastVisit: string;
	doctorName: string | null;
	doctorSpecialty: string | null;
	appointmentReason: string | null;
	isNewPatient: boolean;
}

export interface PatientUpcomingAppointmentSummary {
	appointmentId: string;
	startsAt: string;
	endsAt: string;
	formattedDate: string;
	formattedTime: string;
	doctorName: string | null;
	chairName: string | null;
	reason: string | null;
	status: "planned" | "confirmed" | "completed" | "cancelled";
	isToday: boolean;
	isTomorrow: boolean;
}

export interface PatientSomaticAlert {
	readonly id: string;
	readonly label: string;
	readonly category: "allergy" | "chronic" | "alert" | "pain" | "risk";
	readonly severity: "high" | "medium" | "info";
	readonly icon: string;
}

export interface PatientNextVisitSummary {
	readonly hasNextVisit: boolean;
	readonly appointmentId: string | null;
	readonly formattedDate: string;
	readonly formattedTime: string;
	readonly doctorName: string | null;
	readonly doctorSpecialty: string | null;
	readonly reason: string | null;
	readonly isToday: boolean;
	readonly isTomorrow: boolean;
	readonly startsAt: string | null;
	readonly fullTextRu: string;
}

export type TelephonyPatientCategory = "VIP" | "Постоянный" | "Первичный";

export interface PatientActiveTreatmentPlanSummary {
	readonly hasActivePlan: boolean;
	readonly planTitle: string | null;
	readonly totalCostRub: number;
	readonly formattedTotalCost: string;
	readonly itemsCount: number;
	readonly completedCount: number;
	readonly pendingCount: number;
	readonly progressPercent: number;
	readonly nextService: string | null;
}

export type PatientTreatmentPlanSummary = PatientActiveTreatmentPlanSummary;

export interface CallerLookupResult {
	found: boolean;
	patient: {
		id: string;
		fullName: string;
		phone: string | null;
		birthDate: string | null;
		notes: string | null;
		status: string;
		administrativeProfile?: Record<string, unknown> | null;
	} | null;
	lead: {
		id: string;
		name: string;
		phone: string;
		status: string;
		source: string | null;
	} | null;
	financialSummary: PatientFinancialSummary;
	upcomingAppointment: PatientUpcomingAppointmentSummary | null;
	lastVisitSummary: PatientLastVisitSummary | null;
	somaticAlerts: PatientSomaticAlert[];
	allergyAlerts: PatientSomaticAlert[];
	acutePainAlerts: PatientSomaticAlert[];
	activeTreatmentPlan: PatientActiveTreatmentPlanSummary;
	patientCategory: TelephonyPatientCategory;
}
