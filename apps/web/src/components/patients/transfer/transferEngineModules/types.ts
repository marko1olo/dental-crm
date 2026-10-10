/**
 * ============================================================================
 * PATIENT BRANCH TRANSFER & CENTRALIZED LAB SYNC ENGINE — TYPES & REGISTRY
 * ============================================================================
 */

export type ClinicBranchId = "branch-central" | "branch-west" | "branch-north" | "branch-east";

export interface ClinicBranchInfo {
	readonly id: string;
	readonly code: string;
	readonly nameRu: string;
	readonly shortNameRu: string;
	readonly addressRu: string;
	readonly chiefDoctorRu: string;
	readonly phone: string;
}

export const CLINIC_NETWORK_BRANCHES: readonly ClinicBranchInfo[] = [
	{
		id: "branch-central",
		code: "ЦЕНТР",
		nameRu: "Флагманский филиал «DENTE Центральный»",
		shortNameRu: "DENTE Центр",
		addressRu: "г. Москва, ул. Тверская, д. 12, стр. 2",
		chiefDoctorRu: "Смирнов А. П.",
		phone: "",
	},
	{
		id: "branch-west",
		code: "ЗАПАД",
		nameRu: "Филиал «DENTE Запад»",
		shortNameRu: "DENTE Запад",
		addressRu: "г. Москва, Кутузовский пр-т, д. 24",
		chiefDoctorRu: "Кузнецов И. В.",
		phone: "+7 (495) 234-56-78",
	},
	{
		id: "branch-north",
		code: "СЕВЕР",
		nameRu: "Филиал «DENTE Север»",
		shortNameRu: "DENTE Север",
		addressRu: "г. Москва, Ленинградский пр-т, д. 36",
		chiefDoctorRu: "Морозова Е. С.",
		phone: "+7 (495) 345-67-89",
	},
	{
		id: "branch-east",
		code: "ВОСТОК",
		nameRu: "Филиал «DENTE Восток»",
		shortNameRu: "DENTE Восток",
		addressRu: "г. Москва, ул. Первомайская, д. 42",
		chiefDoctorRu: "Васильев П. Н.",
		phone: "+7 (495) 456-78-90",
	},
];

export function getClinicBranch(idOrCode: string): ClinicBranchInfo {
	return CLINIC_NETWORK_BRANCHES.find((b) => b.id === idOrCode || b.code === idOrCode) || CLINIC_NETWORK_BRANCHES[0]!;
}

export type PatientSignatureType =
	| "simple_electronic_signature_sms"
	| "sms_code"
	| "tablet_stylus"
	| "paper_scan"
	| "paper_signed_consent"
	| "ukep_crypto_pro";

export interface SelectedTransferComponents {
	readonly demographics: boolean;
	readonly somaticAnamnesis: boolean;
	readonly odontogram043u: boolean;
	readonly visitDiaries: boolean;
	readonly treatmentPlans: boolean;
	readonly imagingArchive: boolean;
	readonly depositBalance: boolean;
	readonly activeLabOrders: boolean;
	readonly medicalHistory?: boolean | undefined;
	readonly odontogramAndPerio?: boolean | undefined;
	readonly financialDeposit?: boolean | undefined;
}

export interface PatientDemographicsSnapshot {
	readonly fullName: string;
	readonly birthDate?: string | null;
	readonly gender?: "male" | "female" | null;
	readonly phone?: string | null;
	readonly email?: string | null;
	readonly address?: string | null;
	readonly identityDocument?: string | null;
	readonly snils?: string | null;
	readonly taxpayerInn?: string | null;
	readonly omsPolicyNumber?: string | null;
}

export interface SomaticAnamnesisSnapshot {
	readonly allergies: readonly string[];
	readonly chronicDiseases: readonly string[];
	readonly isPregnantOrLactating?: boolean;
	readonly contraindications: readonly string[];
}

export interface VisitDiaryEntrySnapshot {
	readonly id: string;
	readonly dateIso: string;
	readonly doctorFullName: string;
	readonly diagnosisIcd10: string;
	readonly complaints: string;
	readonly objectiveStatus: string;
	readonly therapyProtocol: string;
	readonly recommendations: string;
}

export interface TreatmentPlanSnapshot {
	readonly id: string;
	readonly title: string;
	readonly totalCostRub: number;
	readonly status: string;
	readonly itemsCount: number;
}

export interface CentralizedLabOrderSyncItem {
	readonly orderId: string;
	readonly restorationType: string;
	readonly toothNumber?: number;
	readonly status: string;
	readonly shadeGuide?: string;
	readonly etaIso?: string;
}

export interface DepositTransferVoucher {
	readonly voucherCode: string;
	readonly amountRub: number;
	readonly amountKopecks: number;
	readonly issuedAtIso: string;
	readonly expiresAtIso: string;
	readonly payloadHash: string;
	readonly isRedeemed: boolean;
}

export interface PatientBranchTransferConsent {
	readonly consentId: string;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly patientPassportOrId: string;
	readonly sourceBranchId: string;
	readonly targetBranchId: string;
	readonly transferPurposeRu: string;
	readonly operatorFullName: string;
	readonly operatorPosition: string;
	readonly signatureType: PatientSignatureType;
	readonly signedAtIso: string;
	readonly signatureHash: string;
}

export interface PatientClinicalSnapshot {
	readonly snapshotId: string;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly exportedAtIso: string;
	readonly sourceBranch: ClinicBranchInfo;
	readonly targetBranch: ClinicBranchInfo;
	readonly demographics: PatientDemographicsSnapshot;
	readonly somaticAnamnesis: SomaticAnamnesisSnapshot;
	readonly odontogramAndPerio: {
		readonly teeth: Record<number, any>;
		readonly cariesTeethCount: number;
		readonly filledTeethCount: number;
		readonly implantsCount: number;
	};
	readonly medicalHistory043u: {
		readonly totalVisitsCount: number;
		readonly visits: readonly VisitDiaryEntrySnapshot[];
	};
	readonly imagingArchive: {
		readonly totalAccumulatedDoseMicroSv: number;
		readonly studies: readonly any[];
	};
	readonly treatmentPlansAndEstimates: {
		readonly totalPlannedCostRub: number;
		readonly plans: readonly TreatmentPlanSnapshot[];
	};
	readonly activeLabOrders: readonly CentralizedLabOrderSyncItem[];
	readonly financialDeposit: {
		readonly currentBalanceRub: number;
		readonly currentBalanceKopecks: number;
		readonly transferVoucher?: DepositTransferVoucher;
	};
	readonly consent152Fz: PatientBranchTransferConsent;
	readonly initiatedByStaffName: string;
	readonly initiatedByStaffPosition: string;
	readonly transferReasonRu: string;
	readonly checksumSha256: string;
}

export interface TransferVerificationQrMatrixResult {
	readonly matrix: boolean[][];
	readonly size: number;
	readonly version: number;
	readonly payload: string;
}

export interface PatientTransferDraft {
	readonly patientId: string;
	readonly patientFullName: string;
	readonly sourceBranchId: string;
	readonly targetBranchId: string;
	readonly transferReasonRu: string;
	readonly operatorStaffName: string;
	readonly operatorStaffPosition: string;
	readonly signatureType: PatientSignatureType;
	readonly is152FzConsentGiven: boolean;
	readonly selectedComponents: SelectedTransferComponents;
	readonly customNotes?: string | undefined;
}

export interface TransferValidationResult {
	readonly isValid: boolean;
	readonly errors: readonly string[];
	readonly warnings: readonly string[];
}

export interface ExecuteTransferInput {
	readonly draft: PatientTransferDraft;
	readonly demographics: PatientDemographicsSnapshot;
	readonly somaticAnamnesis?: Partial<SomaticAnamnesisSnapshot> | undefined;
	readonly odontogramTeeth?: Record<number, any> | undefined;
	readonly visitDiaries?: readonly VisitDiaryEntrySnapshot[] | undefined;
	readonly treatmentPlans?: readonly TreatmentPlanSnapshot[] | undefined;
	readonly imagingStudies?: readonly any[] | undefined;
	readonly balanceRub?: number | undefined;
	readonly balanceKopecks?: number | undefined;
	readonly familyGroupId?: string | null | undefined;
	readonly labOrders?: readonly CentralizedLabOrderSyncItem[] | undefined;
}

export interface ExecuteTransferResult {
	readonly success: boolean;
	readonly snapshot: PatientClinicalSnapshot;
	readonly voucher?: DepositTransferVoucher | undefined;
	readonly qrDataUri: string;
	readonly transferActHtml: string;
	readonly csvSummary: string;
	readonly errorReason?: string | undefined;
}
