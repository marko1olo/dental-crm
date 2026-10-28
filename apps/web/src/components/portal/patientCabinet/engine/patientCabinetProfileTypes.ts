import type { PatientToothInfo } from "../../PatientFriendlyOdontogram.js";
import type { PatientAppointment, PatientInvoiceItem, PatientTreatmentPlan, PatientWarrantyCard } from "./patientCabinetTypes.js";
import type { GeneratedDocumentSummary, PatientCabinetFamilyMember, PatientDiagnosticScan, PatientPrescriptionItem, PatientStatutoryConsent, ThreeTierTreatmentPlanModel } from "./patientCabinetConsentAndDocTypes.js";

export * from "./patientCabinetConsentAndDocTypes.js";

export interface PatientPersonalCabinetData {
	readonly patientId: string;
	readonly fullName: string;
	readonly phone: string;
	readonly email?: string | undefined;
	readonly birthDateIso: string;
	readonly cardNumberRu: string;
	readonly curatingDoctor: string;
	readonly curatingDoctorSpecialtyRu: string;
	readonly curatingDoctorAvatarUrl?: string | undefined;
	readonly depositBalanceRub: number;
	readonly loyaltyBonusBalance: number;
	readonly loyaltyTierRu: "Базовый (3%)" | "Серебряный (5%)" | "Золотой (10%)" | "Платиновый (15%)";
	readonly cashbackPercent: number;
	readonly dmsPolicy?: {
		readonly insurerName: string;
		readonly policyNumber: string;
		readonly coverageLimitRub: number;
		readonly validUntilIso: string;
	} | undefined;
	readonly teeth?: readonly PatientToothInfo[] | undefined;
	readonly appointments: readonly PatientAppointment[];
	readonly treatmentPlans: readonly PatientTreatmentPlan[];
	readonly threeTierModel?: ThreeTierTreatmentPlanModel | undefined;
	readonly invoices: readonly PatientInvoiceItem[];
	readonly statutoryConsents: readonly PatientStatutoryConsent[];
	readonly documents: readonly GeneratedDocumentSummary[];
	readonly warranties: readonly PatientWarrantyCard[];
	readonly prescriptions: readonly PatientPrescriptionItem[];
	readonly familyMembers: readonly PatientCabinetFamilyMember[];
	readonly diagnosticScans: readonly PatientDiagnosticScan[];
	readonly scans?: readonly PatientDiagnosticScan[] | undefined;
	readonly somaticRiskProfile?: Record<string, unknown> | undefined;
	readonly somaticRiskLevel?: "high" | "moderate" | "low" | undefined;
}

export interface PatientCabinetSummary {
	readonly totalInvoicesCount?: number | undefined;
	readonly unpaidInvoicesCount?: number | undefined;
	readonly totalPaidAmountRub?: number | undefined;
	readonly upcomingAppointmentsCount?: number | undefined;
	readonly nextAppointment?: PatientAppointment | undefined;
	readonly activeTreatmentPlan?: PatientTreatmentPlan | undefined;
	readonly totalUnpaidAmountRub: number;
	readonly activeWarrantiesCount: number;
	readonly pendingConsentsCount: number;
	readonly dentalHealthIndex: number;
	readonly dentalHealthStatusRu: string;
	readonly urgentRecallsCount: number;
	readonly nextHygieneRecommendedDateIso?: string | undefined;
}
