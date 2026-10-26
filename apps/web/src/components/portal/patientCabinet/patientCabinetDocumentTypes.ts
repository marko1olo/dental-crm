/**
 * Patient Personal Portal Document & Profile Types
 * (DOMAIN: PORTAL PATIENT CABINET - LAYER 0 TYPES)
 */

import type { PatientToothInfo } from "../PatientFriendlyOdontogram.js";
import type {
	PatientAppointment,
	PatientInvoiceItem,
	TreatmentPlanStage,
} from "./patientCabinetTypes.js";

export interface ConsentSignatureAudit {
	readonly verificationMethod: "sms_otp" | "portal_pep" | "paper_physical" | "tablet_stylus" | "touch_screen";
	readonly phone: string;
	readonly smsOtpCode?: string | undefined;
	readonly integrityHash: string;
	readonly timestamp: number;
	readonly signedAtIso: string;
	readonly legalBasis: "63-ФЗ ПЭП" | "323-ФЗ ст. 20";
	readonly signatureSvg?: string | undefined;
	readonly ipAddress?: string | undefined;
}

export interface PatientTreatmentPlan {
	readonly id: string;
	readonly planNumber: string;
	readonly titleRu: string;
	readonly curatingDoctor: string;
	readonly createdAtIso: string;
	readonly totalCostRub: number;
	readonly paidCostRub: number;
	readonly remainingDueRub: number;
	readonly progressPercent: number;
	readonly status: "in_progress" | "completed" | "on_hold";
	readonly stages: readonly TreatmentPlanStage[];
	readonly approvedByPatient?: boolean | undefined;
	readonly approvedAtIso?: string | undefined;
	readonly approvalAudit?: ConsentSignatureAudit | undefined;
}

export interface WarrantyPassportItem {
	readonly toothFdi: string;
	readonly workTitleRu: string;
	readonly materialName: string;
	readonly manufacturer: string;
	readonly vitaShade?: string | undefined;
	readonly lotNumber?: string | undefined;
}

export interface PatientWarrantyCard {
	readonly certificateId: string;
	readonly issueDateIso: string;
	readonly expirationDateIso: string;
	readonly adjustedWarrantyMonths: number;
	readonly doctorName: string;
	readonly status: "active" | "at_risk" | "expired";
	readonly nextCheckupDueDateIso: string;
	readonly checkupIntervalMonths: number;
	readonly checkupScheduleCount: number;
	readonly items: readonly WarrantyPassportItem[];
	readonly verificationUrl: string;
	readonly qrCodeSvg?: string | undefined;
}

export interface TreatmentPlanTier {
	readonly tierId: "basic" | "standard" | "premium";
	readonly tierNameRu: string;
	readonly titleRu?: string | undefined;
	readonly nameRu?: string | undefined;
	readonly subtitleRu: string;
	readonly totalCostRub: number;
	readonly warrantyMonths: number;
	readonly durationWeeks: number;
	readonly benefits: readonly string[];
	readonly stages: readonly TreatmentPlanStage[];
}

export interface ThreeTierTreatmentPlanModel {
	readonly selectedTier: "basic" | "standard" | "premium";
	readonly tiers: readonly TreatmentPlanTier[];
}

export interface PatientStatutoryConsent {
	readonly id: string;
	readonly code: string;
	readonly titleRu: string;
	readonly categoryRu: "Терапия" | "Хирургия & Имплантация" | "Ортопедия" | "Анестезия" | "Персональные данные";
	readonly statutoryBasis: "323-ФЗ" | "152-ФЗ" | "63-ФЗ";
	readonly status: "pending_signature" | "signed" | "rejected";
	readonly diagnosisIcd?: string | undefined;
	readonly toothNumbers?: string | undefined;
	readonly summaryTextRu: string;
	readonly fullTextContent: string;
	readonly signedAtIso?: string | undefined;
	readonly signatureAudit?: ConsentSignatureAudit | undefined;
	readonly pdfDownloadUrl?: string | undefined;
}

export interface GeneratedDocumentSummary {
	readonly id: string;
	readonly kind: string;
	readonly title: string;
	readonly status: "draft" | "issued" | "voided" | string;
	readonly dateIso: string;
	readonly totalAmountRub?: number | undefined;
	readonly visitId?: string | undefined;
	readonly documentNumber?: string | undefined;
	readonly sha256?: string | undefined;
	readonly storagePath?: string | undefined;
	readonly htmlUrl?: string | undefined;
	readonly payloadJson?: string | undefined;
}
