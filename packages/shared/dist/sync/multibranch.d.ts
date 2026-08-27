/**
 * ============================================================================
 * DENTE Dental CRM — Multi-Branch Patient Transfer & Centralized Lab Sync Engine
 *
 * Provides statutory, multi-clinic network synchronization capabilities:
 * 1. Full Patient Clinical Snapshot Export & Import (Demographics, 043/у EMR,
 *    Somatic Anamnesis, Odontogram FDI 11..48/51..85, Visits, X-Rays, Lab Orders, Balance).
 * 2. Statutory 152-FZ & 323-FZ (Art. 13 Medical Secrecy) Patient Consent Ledger.
 * 3. Atomic Deposit Transfer Voucher Engine (Double-spending protection,
 *    zero floating-point drift with integer kopecks, idempotent redemption).
 * 4. Centralized Dental Laboratory (ZTL) Synchronization & Courier Re-routing.
 * 5. Cryptographic SHA-256 Checksums and Pure TS ISO/IEC 18004 Verification QR Codes.
 * ============================================================================
 */
import { type CentralizedLabOrderSyncItem, type DepositTransferVoucher, type ImagingStudyItemSnapshot, type OdontogramToothEntrySnapshot, type PatientBranchTransferConsent, type PatientClinicalSnapshot, type PatientDemographicsSnapshot, type PatientSignatureType, type SelectedTransferComponents, type SomaticAnamnesisSnapshot, type TreatmentPlanSnapshot, type VisitDiaryEntrySnapshot } from "./multibranchTypes.js";
export * from "./multibranchTypes.js";
export interface CreateConsentInput {
    readonly consentId?: string | undefined;
    readonly patientId: string;
    readonly patientFullName: string;
    readonly patientPassportOrId: string;
    readonly sourceBranchId: string;
    readonly targetBranchId: string;
    readonly transferPurposeRu?: string | undefined;
    readonly operatorFullName: string;
    readonly operatorPosition?: string | undefined;
    readonly signatureType?: PatientSignatureType | undefined;
    readonly signedAtIso?: string | undefined;
    readonly validDays?: number | undefined;
}
export declare function createPatientBranchTransferConsent(input: CreateConsentInput): PatientBranchTransferConsent;
export declare function validatePatientBranchTransferConsent(consent: PatientBranchTransferConsent): {
    isValid: boolean;
    reasons: string[];
};
export interface IssueVoucherParams {
    readonly patientId: string;
    readonly patientFullName: string;
    readonly sourceBranchId: string;
    readonly targetBranchId: string;
    readonly amountKopecks?: number | undefined;
    readonly amountRub?: number | undefined;
    readonly staffId: string;
    readonly staffName: string;
    readonly notes?: string | undefined;
    readonly validDays?: number | undefined;
}
export declare function issueDepositTransferVoucher(params: IssueVoucherParams): {
    voucher: DepositTransferVoucher;
    debitedKopecks: number;
};
export interface RedeemVoucherParams {
    readonly voucher: DepositTransferVoucher;
    readonly redeemingBranchId: string;
    readonly staffId: string;
    readonly staffName: string;
    readonly redemptionIdempotencyKey?: string | undefined;
    readonly redeemedAtIso?: string | undefined;
}
export interface RedeemVoucherResult {
    readonly success: boolean;
    readonly updatedVoucher: DepositTransferVoucher;
    readonly creditedKopecks: number;
    readonly isDuplicateReplay: boolean;
    readonly errorReason?: string | undefined;
}
export declare function redeemDepositTransferVoucher(params: RedeemVoucherParams): RedeemVoucherResult;
export declare function resolveDepositTransferConflict(v1: DepositTransferVoucher, v2: DepositTransferVoucher): {
    winner: DepositTransferVoucher;
    strategy: "redeemed_priority" | "cancelled_priority" | "vector_clock_lww" | "identical";
};
export declare function rerouteLabOrderDestination(order: CentralizedLabOrderSyncItem, newDestinationBranchId: string, reason: string, operatorStaffName: string): CentralizedLabOrderSyncItem;
export declare function mergeLabOrderSyncCrdt(local: CentralizedLabOrderSyncItem, remote: CentralizedLabOrderSyncItem): {
    merged: CentralizedLabOrderSyncItem;
    conflictResolved: boolean;
    winner: "local" | "remote" | "merged";
};
export interface BuildSnapshotOptions {
    readonly sourceBranchId: string;
    readonly targetBranchId: string;
    readonly demographics: PatientDemographicsSnapshot;
    readonly somaticAnamnesis?: Partial<SomaticAnamnesisSnapshot> | undefined;
    readonly odontogramTeeth?: Record<number, Partial<OdontogramToothEntrySnapshot>> | undefined;
    readonly visitDiaries?: readonly VisitDiaryEntrySnapshot[] | undefined;
    readonly treatmentPlans?: readonly TreatmentPlanSnapshot[] | undefined;
    readonly imagingStudies?: readonly ImagingStudyItemSnapshot[] | undefined;
    readonly balanceKopecks?: number | undefined;
    readonly balanceRub?: number | undefined;
    readonly familyGroupId?: string | null | undefined;
    readonly labOrders?: readonly CentralizedLabOrderSyncItem[] | undefined;
    readonly consent152Fz: PatientBranchTransferConsent;
    readonly selectedComponents?: Partial<SelectedTransferComponents> | undefined;
    readonly transferReasonRu?: string | undefined;
    readonly staffName: string;
    readonly staffPosition?: string | undefined;
}
export declare function buildPatientClinicalSnapshot(options: BuildSnapshotOptions): PatientClinicalSnapshot;
export declare function validatePatientClinicalSnapshot(snapshot: PatientClinicalSnapshot): {
    isValid: boolean;
    errors: string[];
};
export declare function generateTransferVerificationQrPayload(snapshot: PatientClinicalSnapshot): string;
export declare function generateTransferVerificationQrSvg(snapshot: PatientClinicalSnapshot, size?: number): string;
export declare function generateTransferVerificationQrDataUri(snapshot: PatientClinicalSnapshot, size?: number): string;
