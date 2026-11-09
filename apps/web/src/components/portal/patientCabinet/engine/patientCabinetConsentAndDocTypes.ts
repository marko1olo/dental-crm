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
	readonly isRecommended?: boolean | undefined;
}

export type ThreeTierOption = TreatmentPlanTier;
export type PatientThreeTierTreatmentPlan = ThreeTierTreatmentPlanModel;

export interface ThreeTierTreatmentPlanModel {
	readonly selectedTier: "basic" | "standard" | "premium";
	readonly tiers: readonly TreatmentPlanTier[];
}

export interface PatientStatutoryConsent {
	readonly id: string;
	readonly code?: string | undefined;
	readonly codeOrderRu?: string | undefined;
	readonly titleRu: string;
	readonly categoryRu?: "Терапия" | "Хирургия & Имплантация" | "Ортопедия" | "Анестезия" | "Персональные данные" | string | undefined;
	readonly statutoryBasis?: "323-ФЗ" | "152-ФЗ" | "63-ФЗ" | string | undefined;
	readonly dateIso?: string | undefined;
	readonly status: "signed" | "pending" | "refused" | "pending_signature" | "rejected" | string;
	readonly signMethod?: "sms_otp" | "portal_pep" | "paper_scan" | "touch_screen" | undefined;
	readonly signedAtIso?: string | undefined;
	readonly downloadUrl?: string | undefined;
	readonly pdfDownloadUrl?: string | undefined;
	readonly audit?: ConsentSignatureAudit | undefined;
	readonly signatureAudit?: ConsentSignatureAudit | undefined;
	readonly fullTextHtml?: string | undefined;
	readonly fullTextContent?: string | undefined;
	readonly expirationDateIso?: string | undefined;
	readonly diagnosisIcd?: string | undefined;
	readonly toothNumbers?: string | undefined;
	readonly summaryTextRu?: string | undefined;
}

export interface GeneratedDocumentSummary {
	readonly id: string;
	readonly titleRu?: string | undefined;
	readonly title?: string | undefined;
	readonly category?: "tax_certificate" | "form_043_extract" | "consent_1051n" | "fiscal_receipt" | "contract" | string | undefined;
	readonly kind?: string | undefined;
	readonly issueDateIso?: string | undefined;
	readonly dateIso?: string | undefined;
	readonly status: "ready" | "pending" | "archived" | "draft" | "issued" | "voided" | string;
	readonly downloadUrl?: string | undefined;
	readonly verificationCode?: string | undefined;
	readonly totalAmountRub?: number | undefined;
	readonly detailsHtml?: string | undefined;
	readonly visitId?: string | undefined;
	readonly documentNumber?: string | undefined;
	readonly sha256?: string | undefined;
	readonly storagePath?: string | undefined;
	readonly htmlUrl?: string | undefined;
	readonly payloadJson?: string | undefined;
}

export interface PatientPrescriptionItem {
	readonly id: string;
	readonly tradeNameRu?: string | undefined;
	readonly medicationName?: string | undefined;
	readonly innNameRu?: string | undefined;
	readonly dosageRu: string;
	readonly regimenRu?: string | undefined;
	readonly instructionRu?: string | undefined;
	readonly durationRu?: string | undefined;
	readonly courseDurationDays?: number | undefined;
	readonly doctorName: string;
	readonly issueDateIso?: string | undefined;
	readonly dateIso?: string | undefined;
	readonly status?: "active" | "completed" | "cancelled" | "expired" | string | undefined;
	readonly isAntibiotic?: boolean | undefined;
	readonly warningsRu?: string | undefined;
	readonly validityDays?: number | undefined;
	readonly orderNumber?: string | undefined;
}

export interface PatientCabinetFamilyMember {
	readonly id: string;
	readonly fullName: string;
	readonly relationshipRu: "Супруг(а)" | "Ребёнок" | "Родитель" | "Родственник" | "Сын" | "Дочь" | "Другой родственник" | string;
	readonly birthDateIso?: string | undefined;
	readonly birthDate?: string | undefined;
	readonly cardRef?: string | undefined;
	readonly cardNumber?: string | undefined;
	readonly avatarUrl?: string | undefined;
	readonly avatarInitials?: string | undefined;
	readonly upcomingAppointmentsCount?: number | undefined;
	readonly depositBalanceRub?: number | undefined;
	readonly isPrimaryAccountHolder?: boolean | undefined;
	readonly phone?: string | undefined;
	readonly allowSpendFamilyBalance?: boolean | undefined;
	readonly allowBooking?: boolean | undefined;
	readonly nextAppointmentDateIso?: string | undefined;
	readonly nextAppointmentTimeRu?: string | undefined;
	readonly nextAppointmentTitleRu?: string | undefined;
	readonly nextAppointmentDoctor?: string | undefined;
}

export type { PatientDiagnosticScan } from "../../scans/PlanScanViewerModal.js";
