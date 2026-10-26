/**
 * Patient Personal Portal Profile & Summary Types
 * (DOMAIN: PORTAL PATIENT CABINET - LAYER 0 TYPES)
 */

import type { PatientToothInfo } from "../PatientFriendlyOdontogram.js";
import type {
	GeneratedDocumentSummary,
	PatientStatutoryConsent,
	PatientTreatmentPlan,
	PatientWarrantyCard,
	ThreeTierTreatmentPlanModel,
} from "./patientCabinetDocumentTypes.js";
import type {
	PatientCabinetFamilyMember,
	PatientDiagnosticScan,
	PatientPrescriptionItem,
} from "./patientCabinetFamilyAndScanTypes.js";
import type {
	PatientAppointment,
	PatientInvoiceItem,
} from "./patientCabinetTypes.js";

export interface PatientPersonalCabinetData {
	readonly patientId: string;
	readonly fullName: string;
	readonly phone: string;
	readonly email?: string | undefined;
	readonly birthDate?: string | undefined;
	readonly inn?: string | undefined;
	readonly cardNumber: string;
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
	readonly loyaltyBonusBalance: number;
	readonly loyaltyTierRu: "Базовый" | "Серебряный (5%)" | "Золотой (10%)" | "Платиновый VIP (15%)";
	readonly cashbackEarnedRub: number;
	readonly familyBalanceRub?: number | undefined;
	readonly familyBonusPool?: number | undefined;
	readonly familyMembersCount?: number | undefined;
	readonly familyMembers?: readonly PatientCabinetFamilyMember[] | undefined;
	readonly dmsInsuranceName?: string | undefined;
	readonly dmsBalanceLimitRub?: number | undefined;
	readonly invoices: readonly PatientInvoiceItem[];
	readonly appointments: readonly PatientAppointment[];
	readonly treatmentPlans: readonly PatientTreatmentPlan[];
	readonly warranties: readonly PatientWarrantyCard[];
	readonly consents: readonly PatientStatutoryConsent[];
	readonly teeth?: readonly PatientToothInfo[] | undefined;
	readonly threeTierModel?: ThreeTierTreatmentPlanModel | undefined;
	readonly somaticRiskProfile?: {
		readonly hasCardiovascularRisk: boolean;
		readonly hasSulfiteAllergy: boolean;
		readonly hasLocalAnestheticsAllergy: boolean;
		readonly hasBronchialAsthma: boolean;
		readonly hasBleedingDisorder: boolean;
		readonly hasDiabetes: boolean;
		readonly isPregnantOrLactating: boolean;
		readonly customNotes?: string | undefined;
	} | undefined;
	readonly somaticAlerts?: ReadonlyArray<{
		readonly id: string;
		readonly severity: "danger" | "warning" | "caution" | "info";
		readonly title: string;
		readonly message: string;
		readonly recommendedAction: string;
		readonly category: string;
	}> | undefined;
	readonly somaticRiskLevel?: "high" | "moderate" | "low" | undefined;
	readonly documents?: readonly GeneratedDocumentSummary[] | undefined;
	readonly prescriptions?: readonly PatientPrescriptionItem[] | undefined;
	readonly scans?: readonly PatientDiagnosticScan[] | undefined;
}

export interface PatientCabinetSummary {
	readonly totalInvoicesCount: number;
	readonly unpaidInvoicesCount: number;
	readonly totalUnpaidAmountRub: number;
	readonly totalPaidAmountRub: number;
	readonly upcomingAppointmentsCount: number;
	readonly nextAppointment?: PatientAppointment | undefined;
	readonly activePlansCount: number;
	readonly pendingConsentsCount: number;
	readonly activeWarrantiesCount: number;
	readonly nextCheckupDueDateIso?: string | undefined;
	readonly nextCheckupDaysRemaining?: number | undefined;
	readonly loyaltyBonusBalance: number;
	readonly cashbackEarnedRub: number;
}

export interface CheckupDaysCalculation {
	readonly daysRemaining: number;
	readonly isOverdue: boolean;
	readonly isUrgent: boolean;
	readonly formattedDueDateRu: string;
	readonly labelRu: string;
}

export interface WarrantyDaysCalculation {
	readonly daysRemaining: number;
	readonly isExpired: boolean;
	readonly formattedExpirationDateRu: string;
	readonly labelRu: string;
}
