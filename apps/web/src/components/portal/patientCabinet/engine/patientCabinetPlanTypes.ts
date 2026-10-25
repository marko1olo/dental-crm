export interface TreatmentPlanStage {
	readonly id: string;
	readonly orderIndex: number;
	readonly titleRu: string;
	readonly categoryRu: "Диагностика" | "Терапия" | "Хирургия" | "Ортопедия" | "Ортодонтия" | "Гигиена";
	readonly teethFdi: readonly string[];
	readonly costRub: number;
	readonly status: "completed" | "in_progress" | "planned";
	readonly procedures: readonly string[];
	readonly targetDateRu?: string | undefined;
	readonly estimatedVisitsCount?: number | undefined;
}

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
