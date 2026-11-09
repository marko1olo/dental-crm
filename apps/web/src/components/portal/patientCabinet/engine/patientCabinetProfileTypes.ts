import type { PatientToothInfo } from "../../PatientFriendlyOdontogram.js";
import type { PatientAppointment, PatientInvoiceItem, PatientTreatmentPlan, PatientWarrantyCard } from "./patientCabinetTypes.js";
import type { GeneratedDocumentSummary, PatientCabinetFamilyMember, PatientDiagnosticScan, PatientPrescriptionItem, PatientStatutoryConsent, ThreeTierTreatmentPlanModel } from "./patientCabinetConsentAndDocTypes.js";
import type { SomaticHealthProfile, SomaticRiskAlert } from "../../selfCheckin/SomaticQuestionnaireEngine.js";

export * from "./patientCabinetConsentAndDocTypes.js";

export interface PatientPersonalCabinetData {
	readonly patientId: string;
	readonly fullName: string;
	readonly phone: string;
	readonly email?: string | undefined;
	readonly birthDate?: string | undefined;
	readonly birthDateIso?: string | undefined;
	readonly cardNumber?: string | undefined;
	readonly cardNumberRu?: string | undefined;
	readonly inn?: string | undefined;
	readonly clinicInfo?: {
		readonly nameRu?: string | undefined;
		readonly legalName?: string | undefined;
		readonly licenseNumber?: string | undefined;
		readonly inn?: string | undefined;
		readonly ogrn?: string | undefined;
		readonly address?: string | undefined;
		readonly phone?: string | undefined;
	} | undefined;
	readonly curatingDoctor: string;
	readonly curatingDoctorSpecialtyRu?: string | undefined;
	readonly curatingDoctorAvatarUrl?: string | undefined;
	readonly depositBalanceRub?: number | undefined;
	readonly loyaltyBonusBalance: number;
	readonly loyaltyTierRu: "Базовый" | "Базовый (3%)" | "Серебряный (5%)" | "Золотой (10%)" | "Платиновый VIP (15%)" | "Платиновый (15%)" | string;
	readonly cashbackPercent?: number | undefined;
	readonly cashbackEarnedRub?: number | undefined;
	readonly dmsPolicy?: {
		readonly insurerName: string;
		readonly policyNumber: string;
		readonly coverageLimitRub: number;
		readonly validUntilIso: string;
	} | undefined;
	readonly dmsInsuranceName?: string | undefined;
	readonly dmsBalanceLimitRub?: number | undefined;
	readonly familyBalanceRub?: number | undefined;
	readonly familyBonusPool?: number | undefined;
	readonly familyMembersCount?: number | undefined;
	readonly teeth?: readonly PatientToothInfo[] | undefined;
	readonly appointments: readonly PatientAppointment[];
	readonly treatmentPlans: readonly PatientTreatmentPlan[];
	readonly threeTierModel?: ThreeTierTreatmentPlanModel | undefined;
	readonly invoices: readonly PatientInvoiceItem[];
	readonly statutoryConsents?: readonly PatientStatutoryConsent[] | undefined;
	readonly consents?: readonly PatientStatutoryConsent[] | undefined;
	readonly documents?: readonly GeneratedDocumentSummary[] | undefined;
	readonly warranties: readonly PatientWarrantyCard[];
	readonly prescriptions?: readonly PatientPrescriptionItem[] | undefined;
	readonly familyMembers?: readonly PatientCabinetFamilyMember[] | undefined;
	readonly diagnosticScans?: readonly PatientDiagnosticScan[] | undefined;
	readonly scans?: readonly PatientDiagnosticScan[] | undefined;
	readonly somaticRiskProfile?: SomaticHealthProfile | {
		readonly hasCardiovascularRisk?: boolean;
		readonly hasSulfiteAllergy?: boolean;
		readonly hasLocalAnestheticsAllergy?: boolean;
		readonly hasBronchialAsthma?: boolean;
		readonly hasBleedingDisorder?: boolean;
		readonly hasDiabetes?: boolean;
		readonly isPregnantOrLactating?: boolean;
		readonly customNotes?: string | undefined;
	} | undefined;
	readonly somaticAlerts?: readonly SomaticRiskAlert[] | ReadonlyArray<{
		readonly id: string;
		readonly severity: "danger" | "warning" | "caution" | "info";
		readonly title: string;
		readonly message: string;
		readonly recommendedAction: string;
		readonly category: string;
	}> | undefined;
	readonly somaticRiskLevel?: "high" | "moderate" | "low" | undefined;
}

export interface PatientCabinetSummary {
	readonly totalInvoicesCount?: number | undefined;
	readonly unpaidInvoicesCount?: number | undefined;
	readonly totalPaidAmountRub?: number | undefined;
	readonly upcomingAppointmentsCount?: number | undefined;
	readonly nextAppointment?: PatientAppointment | undefined;
	readonly activeTreatmentPlan?: PatientTreatmentPlan | undefined;
	readonly activePlansCount?: number | undefined;
	readonly totalUnpaidAmountRub: number;
	readonly activeWarrantiesCount: number;
	readonly pendingConsentsCount: number;
	readonly dentalHealthIndex?: number | undefined;
	readonly dentalHealthStatusRu?: string | undefined;
	readonly urgentRecallsCount?: number | undefined;
	readonly nextHygieneRecommendedDateIso?: string | undefined;
	readonly nextCheckupDueDateIso?: string | undefined;
	readonly nextCheckupDaysRemaining?: number | undefined;
	readonly loyaltyBonusBalance?: number | undefined;
	readonly cashbackEarnedRub?: number | undefined;
}
