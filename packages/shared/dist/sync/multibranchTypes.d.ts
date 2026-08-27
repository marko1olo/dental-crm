/**
 * ============================================================================
 * DENTE Dental CRM — Multi-Branch & Centralized Lab Sync Data Contracts
 *
 * Types, Zod schemas, and statutory constants for:
 * 1. Clinic network branches registry
 * 2. 152-FZ & 323-FZ Consent schemas
 * 3. Deposit Transfer Vouchers
 * 4. Centralized Lab (ZTL) order sync models
 * 5. Complete Patient Clinical Snapshot (043/у)
 * ============================================================================
 */
import { z } from "zod";
import type { VectorClock } from "./types.js";
import { type ToothClinicalStatusCode, type ToothSurface } from "../documents/forms043u.js";
export declare const clinicBranchIdSchema: z.ZodEnum<["central_hub", "branch_center", "branch_north", "branch_south", "branch_east"]>;
export type ClinicBranchId = z.infer<typeof clinicBranchIdSchema>;
export interface ClinicBranchInfo {
    readonly id: string;
    readonly code: string;
    readonly okpoCode: string;
    readonly nameRu: string;
    readonly shortNameRu: string;
    readonly addressRu: string;
    readonly phone: string;
    readonly chiefDoctorRu: string;
    readonly seniorNurseRu: string;
    readonly isCentralHub: boolean;
}
export declare const CLINIC_NETWORK_BRANCHES: readonly ClinicBranchInfo[];
export declare function getClinicBranch(branchId: string): ClinicBranchInfo;
export declare const patientSignatureTypeSchema: z.ZodEnum<["simple_electronic_signature_sms", "tablet_stylus_biometric", "paper_scan", "ukep_crypto_pro"]>;
export type PatientSignatureType = z.infer<typeof patientSignatureTypeSchema>;
export declare const patientBranchTransferConsentSchema: z.ZodObject<{
    consentId: z.ZodString;
    patientId: z.ZodString;
    patientFullName: z.ZodString;
    patientPassportOrId: z.ZodString;
    sourceBranchId: z.ZodString;
    targetBranchId: z.ZodString;
    transferPurposeRu: z.ZodString;
    signedAtIso: z.ZodString;
    validUntilIso: z.ZodString;
    operatorFullName: z.ZodString;
    operatorPosition: z.ZodString;
    signatureType: z.ZodEnum<["simple_electronic_signature_sms", "tablet_stylus_biometric", "paper_scan", "ukep_crypto_pro"]>;
    signatureHash: z.ZodString;
    legalBasis: z.ZodDefault<z.ZodString>;
    isRevoked: z.ZodDefault<z.ZodBoolean>;
    revokedAtIso: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    patientId: string;
    patientFullName: string;
    consentId: string;
    patientPassportOrId: string;
    sourceBranchId: string;
    targetBranchId: string;
    transferPurposeRu: string;
    signedAtIso: string;
    validUntilIso: string;
    operatorFullName: string;
    operatorPosition: string;
    signatureType: "simple_electronic_signature_sms" | "tablet_stylus_biometric" | "paper_scan" | "ukep_crypto_pro";
    signatureHash: string;
    legalBasis: string;
    isRevoked: boolean;
    revokedAtIso?: string | undefined;
}, {
    patientId: string;
    patientFullName: string;
    consentId: string;
    patientPassportOrId: string;
    sourceBranchId: string;
    targetBranchId: string;
    transferPurposeRu: string;
    signedAtIso: string;
    validUntilIso: string;
    operatorFullName: string;
    operatorPosition: string;
    signatureType: "simple_electronic_signature_sms" | "tablet_stylus_biometric" | "paper_scan" | "ukep_crypto_pro";
    signatureHash: string;
    legalBasis?: string | undefined;
    isRevoked?: boolean | undefined;
    revokedAtIso?: string | undefined;
}>;
export type PatientBranchTransferConsent = z.infer<typeof patientBranchTransferConsentSchema>;
export declare const transferVoucherStatusSchema: z.ZodEnum<["issued", "in_transit", "redeemed", "cancelled", "expired"]>;
export type TransferVoucherStatus = z.infer<typeof transferVoucherStatusSchema>;
export declare const depositTransferVoucherSchema: z.ZodObject<{
    voucherId: z.ZodString;
    voucherCode: z.ZodString;
    patientId: z.ZodString;
    patientFullName: z.ZodString;
    sourceBranchId: z.ZodString;
    targetBranchId: z.ZodString;
    amountKopecks: z.ZodNumber;
    amountRub: z.ZodNumber;
    issuedAtIso: z.ZodString;
    expiresAtIso: z.ZodString;
    status: z.ZodEnum<["issued", "in_transit", "redeemed", "cancelled", "expired"]>;
    issuedByStaffId: z.ZodString;
    issuedByStaffName: z.ZodString;
    redeemedAtIso: z.ZodOptional<z.ZodString>;
    redeemedByStaffId: z.ZodOptional<z.ZodString>;
    redeemedByStaffName: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodString;
    payloadHash: z.ZodString;
    crdtClock: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "expired" | "cancelled" | "issued" | "in_transit" | "redeemed";
    amountKopecks: number;
    patientId: string;
    patientFullName: string;
    idempotencyKey: string;
    payloadHash: string;
    sourceBranchId: string;
    targetBranchId: string;
    voucherId: string;
    voucherCode: string;
    amountRub: number;
    issuedAtIso: string;
    expiresAtIso: string;
    issuedByStaffId: string;
    issuedByStaffName: string;
    notes?: string | undefined;
    redeemedAtIso?: string | undefined;
    redeemedByStaffId?: string | undefined;
    redeemedByStaffName?: string | undefined;
    crdtClock?: Record<string, number> | undefined;
}, {
    status: "expired" | "cancelled" | "issued" | "in_transit" | "redeemed";
    amountKopecks: number;
    patientId: string;
    patientFullName: string;
    idempotencyKey: string;
    payloadHash: string;
    sourceBranchId: string;
    targetBranchId: string;
    voucherId: string;
    voucherCode: string;
    amountRub: number;
    issuedAtIso: string;
    expiresAtIso: string;
    issuedByStaffId: string;
    issuedByStaffName: string;
    notes?: string | undefined;
    redeemedAtIso?: string | undefined;
    redeemedByStaffId?: string | undefined;
    redeemedByStaffName?: string | undefined;
    crdtClock?: Record<string, number> | undefined;
}>;
export type DepositTransferVoucher = z.infer<typeof depositTransferVoucherSchema>;
export declare const ztlSyncStageRank: Record<string, number>;
export interface CentralizedLabOrderSyncItem {
    readonly orderId: string;
    readonly orderNumber: string;
    readonly patientId: string;
    readonly patientFullName: string;
    readonly doctorId: string;
    readonly doctorFullName: string;
    readonly originalBranchId: string;
    readonly destinationBranchId: string;
    readonly prostheticTypeId: string;
    readonly prostheticTypeNameRu: string;
    readonly selectedTeeth: readonly number[];
    readonly materialId: string;
    readonly materialNameRu: string;
    readonly shadeCode: string;
    readonly currentStage: string;
    readonly stageRank: number;
    readonly deadlineIso: string;
    readonly labName: string;
    readonly isRerouted: boolean;
    readonly reroutedReason?: string | undefined;
    readonly courierTrackingCode?: string | undefined;
    readonly lastUpdatedAtIso: string;
    readonly crdtClock: VectorClock;
}
export interface PatientDemographicsSnapshot {
    readonly id: string;
    readonly fullName: string;
    readonly birthDate: string | null;
    readonly phone: string | null;
    readonly email: string | null;
    readonly notes: string | null;
    readonly status: "active" | "archived";
    readonly identityDocument: string | null;
    readonly taxpayerInn: string | null;
    readonly snils: string | null;
    readonly insurancePolicyNumber: string | null;
    readonly registrationAddress: string | null;
    readonly residentialAddress: string | null;
    readonly legalRepresentativeFullName: string | null;
    readonly legalRepresentativePhone: string | null;
    readonly loyaltyTier?: string | null | undefined;
}
export interface SomaticAnamnesisSnapshot {
    readonly allergies: readonly string[];
    readonly chronicDiseases: readonly string[];
    readonly somaticAlerts: readonly string[];
    readonly bloodType?: string | undefined;
    readonly cardiacPacemaker: boolean;
    readonly diabetes: boolean;
    readonly pregnancyTrimester?: number | null | undefined;
    readonly hepatitisB_C: boolean;
    readonly hivAids: boolean;
    readonly notes?: string | undefined;
}
export interface OdontogramToothEntrySnapshot {
    readonly toothNumber: number;
    readonly statusCode: ToothClinicalStatusCode;
    readonly statusLabelRu: string;
    readonly affectedSurfaces: readonly ToothSurface[];
    readonly rootCanalsCount?: number | undefined;
    readonly mobilityDegree?: 0 | 1 | 2 | 3 | undefined;
    readonly periodontalPocketDepthMm?: Record<string, number> | undefined;
    readonly clinicalNotes?: string | undefined;
}
export interface OdontogramAndPerioSnapshot {
    readonly teeth: Record<number, OdontogramToothEntrySnapshot>;
    readonly viewMode: "standard_fdi" | "pediatric" | "perio";
    readonly missingTeethCount: number;
    readonly cariesTeethCount: number;
    readonly filledTeethCount: number;
    readonly implantsCount: number;
    readonly crownsCount: number;
}
export interface VisitDiaryEntrySnapshot {
    readonly visitId: string;
    readonly visitDateIso: string;
    readonly doctorId: string;
    readonly doctorFullName: string;
    readonly doctorSpecialty: string;
    readonly complaintsRu: string;
    readonly anamnesisMorbiRu: string;
    readonly objectiveStatusRu: string;
    readonly icd10Code: string;
    readonly icd10DiagnosisRu: string;
    readonly treatmentProtocolRu: string;
    readonly recommendationsRu?: string | undefined;
    readonly performedProcedures804n: readonly {
        readonly code: string;
        readonly nameRu: string;
        readonly uetDoctor?: number | undefined;
    }[];
    readonly isSigned: boolean;
}
export interface MedicalHistory043uSnapshot {
    readonly form043Number: string;
    readonly openingDateIso: string;
    readonly visitDiaries: readonly VisitDiaryEntrySnapshot[];
    readonly totalVisitsCount: number;
    readonly firstVisitDateIso?: string | undefined;
    readonly lastVisitDateIso?: string | undefined;
}
export interface TreatmentPlanStageSnapshot {
    readonly stageIndex: number;
    readonly stageNameRu: string;
    readonly costKopecks: number;
    readonly costRub: number;
    readonly isCompleted: boolean;
}
export interface TreatmentPlanSnapshot {
    readonly planId: string;
    readonly title: string;
    readonly status: "draft" | "accepted" | "in_progress" | "completed";
    readonly totalCostKopecks: number;
    readonly totalCostRub: number;
    readonly stages: readonly TreatmentPlanStageSnapshot[];
}
export interface TreatmentPlansAndEstimatesSnapshot {
    readonly plans: readonly TreatmentPlanSnapshot[];
    readonly totalPlannedCostKopecks: number;
    readonly totalPlannedCostRub: number;
}
export interface ImagingStudyItemSnapshot {
    readonly studyId: string;
    readonly kind: string;
    readonly kindLabelRu: string;
    readonly performedAtIso: string;
    readonly performedByDoctorName: string;
    readonly anatomicalAreaRu: string;
    readonly effectiveDoseMicroSv: number;
    readonly fileUri?: string | undefined;
    readonly fileHashSha256?: string | undefined;
}
export interface ImagingArchiveSnapshot {
    readonly studies: readonly ImagingStudyItemSnapshot[];
    readonly totalAccumulatedDoseMicroSv: number;
    readonly totalAccumulatedDoseMilliSv: number;
}
export interface PatientFinancialSnapshot {
    readonly currentBalanceKopecks: number;
    readonly currentBalanceRub: number;
    readonly familyGroupId?: string | null | undefined;
    readonly transferVoucher?: DepositTransferVoucher | undefined;
}
export interface SelectedTransferComponents {
    readonly demographics: boolean;
    readonly somaticAnamnesis: boolean;
    readonly odontogram043u: boolean;
    readonly visitDiaries: boolean;
    readonly treatmentPlans: boolean;
    readonly imagingArchive: boolean;
    readonly depositBalance: boolean;
    readonly activeLabOrders: boolean;
}
export interface PatientClinicalSnapshot {
    readonly snapshotId: string;
    readonly schemaVersion: "dente-clinical-snapshot-v1.0";
    readonly exportedAtIso: string;
    readonly sourceBranch: ClinicBranchInfo;
    readonly targetBranch: ClinicBranchInfo;
    readonly patientId: string;
    readonly patientFullName: string;
    readonly demographics: PatientDemographicsSnapshot;
    readonly somaticAnamnesis: SomaticAnamnesisSnapshot;
    readonly odontogramAndPerio: OdontogramAndPerioSnapshot;
    readonly medicalHistory043u: MedicalHistory043uSnapshot;
    readonly treatmentPlansAndEstimates: TreatmentPlansAndEstimatesSnapshot;
    readonly imagingArchive: ImagingArchiveSnapshot;
    readonly financialDeposit: PatientFinancialSnapshot;
    readonly activeLabOrders: readonly CentralizedLabOrderSyncItem[];
    readonly consent152Fz: PatientBranchTransferConsent;
    readonly selectedComponents: SelectedTransferComponents;
    readonly transferReasonRu: string;
    readonly initiatedByStaffName: string;
    readonly initiatedByStaffPosition: string;
    readonly checksumSha256: string;
}
