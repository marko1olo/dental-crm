import type { TreatmentPlanStage } from "./patientCabinetTypes.js";
import type { ConsentSignatureAudit } from "./patientCabinetPlanTypes.js";

export interface TreatmentPlanTier {
	readonly tierId?: "basic" | "standard" | "premium" | string | undefined;
	readonly tierNameRu?: string | undefined;
	readonly nameRu?: string | undefined;
	readonly titleRu?: string | undefined;
	readonly subtitleRu?: string | undefined;
	readonly totalCostRub: number;
	readonly durationWeeks?: number | undefined;
	readonly warrantyMonths?: number | undefined;
	readonly summaryRu?: string | undefined;
	readonly advantagesRu?: readonly string[] | undefined;
	readonly benefits?: readonly string[] | undefined;
	readonly stages?: readonly TreatmentPlanStage[] | undefined;
	readonly implantSystemRu?: string | undefined;
	readonly crownMaterialRu?: string | undefined;
	readonly warrantyYears?: number | undefined;
}

export interface ThreeTierTreatmentPlanModel {
	readonly selectedTier: "basic" | "standard" | "premium";
	readonly tiers: readonly TreatmentPlanTier[];
}

export interface PatientStatutoryConsent {
	readonly id: string;
	readonly codeOrderRu: string;
	readonly titleRu: string;
	readonly dateIso: string;
	readonly status: "signed" | "pending" | "refused";
	readonly signMethod?: "sms_otp" | "portal_pep" | "paper_scan" | "touch_screen" | undefined;
	readonly signedAtIso?: string | undefined;
	readonly downloadUrl?: string | undefined;
	readonly audit?: ConsentSignatureAudit | undefined;
	readonly fullTextHtml?: string | undefined;
	readonly expirationDateIso?: string | undefined;
}

export interface GeneratedDocumentSummary {
	readonly id: string;
	readonly titleRu: string;
	readonly category: "tax_certificate" | "form_043_extract" | "consent_1051n" | "fiscal_receipt" | "contract";
	readonly issueDateIso: string;
	readonly status: "ready" | "pending" | "archived";
	readonly downloadUrl?: string | undefined;
	readonly verificationCode?: string | undefined;
	readonly totalAmountRub?: number | undefined;
	readonly detailsHtml?: string | undefined;
}

export interface PatientPrescriptionItem {
	readonly id: string;
	readonly tradeNameRu: string;
	readonly innNameRu: string;
	readonly dosageRu: string;
	readonly regimenRu: string;
	readonly courseDurationDays: number;
	readonly doctorName: string;
	readonly issueDateIso: string;
	readonly status: "active" | "completed" | "cancelled";
	readonly isAntibiotic?: boolean | undefined;
	readonly warningsRu?: string | undefined;
}

export interface PatientCabinetFamilyMember {
	readonly id: string;
	readonly fullName: string;
	readonly relationshipRu: "Супруг(а)" | "Ребёнок" | "Родитель" | "Родственник";
	readonly birthDateIso?: string | undefined;
	readonly cardRef?: string | undefined;
	readonly avatarUrl?: string | undefined;
	readonly upcomingAppointmentsCount: number;
	readonly depositBalanceRub: number;
	readonly isPrimaryAccountHolder?: boolean | undefined;
}

export interface PatientDiagnosticScan {
	readonly id: string;
	readonly modality: "cbct" | "panoramic" | "rvg" | "intraoral_photo";
	readonly titleRu: string;
	readonly dateIso: string;
	readonly doctorName: string;
	readonly thumbnailBase64?: string | undefined;
	readonly dicomStudyUid?: string | undefined;
	readonly toothFdi?: string | undefined;
}
