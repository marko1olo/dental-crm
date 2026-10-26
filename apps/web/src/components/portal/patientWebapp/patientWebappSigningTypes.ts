import type {
	PatientAppointmentItem,
	PatientInvoiceBillItem,
	PatientTreatmentPlanProfile,
	BeforeAfterComparisonPair,
} from "./patientWebappPlanTypes";

export interface PepSignatureAuditTrail {
	readonly verificationMethod: "sms_otp" | "sms_63fz_pep";
	readonly phone: string;
	readonly smsOtpCode: string;
	readonly integritySha256: string;
	readonly timestampMs: number;
	readonly signedAtIso: string;
	readonly legalBasis: "63-ФЗ ст. 5, ст. 6 (ПЭП)";
	readonly statutoryActBasis: "323-ФЗ ст. 20 (ИДС)" | "ПП РФ № 736 (Договор)" | "Приказ МЗ РФ № 804н (Акт)";
	readonly signerFullName: string;
	readonly signerPassport?: string | undefined;
	readonly ipAddress?: string | undefined;
	readonly userAgent?: string | undefined;
	readonly documentDigest: string;
}

export interface SignableStatutoryDocument {
	readonly id: string;
	readonly documentType: "ids_1051n" | "contract_736" | "act_804n" | "warranty_card" | "personal_data_152fz";
	readonly documentNumber: string;
	readonly titleRu: string;
	readonly dateIso: string;
	readonly doctorFullName: string;
	readonly summaryTextRu: string;
	readonly fullTextHtml: string;
	readonly status: "pending_signature" | "signed" | "rejected";
	readonly signedAtIso?: string | undefined;
	readonly signatureAudit?: PepSignatureAuditTrail | undefined;
	readonly pdfDownloadUrl?: string | undefined;
}

export interface PatientWebappAggregatedProfile {
	readonly patientId: string;
	readonly clinicId: string;
	readonly clinicName: string;
	readonly clinicAddress: string;
	readonly clinicPhone: string;
	readonly clinicInn: string;
	readonly fullName: string;
	readonly phone: string;
	readonly email?: string | undefined;
	readonly birthDate: string;
	readonly cardNumber: string;
	readonly curatingDoctor: string;
	readonly loyaltyBonusBalance: number;
	readonly loyaltyCashbackRub: number;
	readonly upcomingAppointments: readonly PatientAppointmentItem[];
	readonly pastAppointments: readonly PatientAppointmentItem[];
	readonly activeTreatmentPlan: PatientTreatmentPlanProfile | null;
	readonly invoices: readonly PatientInvoiceBillItem[];
	readonly beforeAfterGalleries: readonly BeforeAfterComparisonPair[];
	readonly signableDocuments: readonly SignableStatutoryDocument[];
	readonly totalDebtKopecks: number;
	readonly totalDebtRub: number;
	readonly nextAppointment?: PatientAppointmentItem | undefined;
}
