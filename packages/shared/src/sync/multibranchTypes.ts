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
import {
	type ToothClinicalStatusCode,
	toothClinicalStatusCodeSchema,
	type ToothSurface,
	toothSurfaceSchema,
} from "../documents/forms043u.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Clinic Network Branches Registry
// ─────────────────────────────────────────────────────────────────────────────

export const clinicBranchIdSchema = z.enum([
	"central_hub",
	"branch_center",
	"branch_north",
	"branch_south",
	"branch_east",
]);
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

export const CLINIC_NETWORK_BRANCHES: readonly ClinicBranchInfo[] = [
	{
		id: "central_hub",
		code: "ЦК-01",
		okpoCode: "49201948",
		nameRu: "Центральный клинико-диагностический центр DENTE",
		shortNameRu: "Филиал «Центр-Хаб»",
		addressRu: "г. Москва, ул. Тверская, д. 12, стр. 1",
		phone: "+7 (495) 100-01-00",
		chiefDoctorRu: "Д-р Смирнов Александр Васильевич",
		seniorNurseRu: "Васильева Ольга Николаевна",
		isCentralHub: true,
	},
	{
		id: "branch_center",
		code: "ФИЛ-01",
		okpoCode: "49201954",
		nameRu: "Филиал «Центральный» (Тверская)",
		shortNameRu: "Филиал «Центр»",
		addressRu: "г. Москва, ул. Тверская, д. 24",
		phone: "+7 (495) 100-01-01",
		chiefDoctorRu: "Д-р Иванов Иван Иванович",
		seniorNurseRu: "Смирнова Анна Викторовна",
		isCentralHub: false,
	},
	{
		id: "branch_north",
		code: "ФИЛ-02",
		okpoCode: "49201960",
		nameRu: "Филиал «Северный» (Сокол)",
		shortNameRu: "Филиал «Север»",
		addressRu: "г. Москва, Ленинградский пр-т, д. 74",
		phone: "+7 (495) 100-01-02",
		chiefDoctorRu: "Д-р Кузнецов Павел Сергеевич",
		seniorNurseRu: "Кузнецова Ирина Сергеевна",
		isCentralHub: false,
	},
	{
		id: "branch_south",
		code: "ФИЛ-03",
		okpoCode: "49201977",
		nameRu: "Филиал «Южный» (Профсоюзная)",
		shortNameRu: "Филиал «Юг»",
		addressRu: "г. Москва, ул. Профсоюзная, д. 56",
		phone: "+7 (495) 100-01-03",
		chiefDoctorRu: "Д-р Морозов Дмитрий Алексеевич",
		seniorNurseRu: "Морозова Елена Павловна",
		isCentralHub: false,
	},
	{
		id: "branch_east",
		code: "ФИЛ-04",
		okpoCode: "49201985",
		nameRu: "Филиал «Восточный» (Сокольники)",
		shortNameRu: "Филиал «Восток»",
		addressRu: "г. Москва, ул. Сокольнический Вал, д. 18",
		phone: "+7 (495) 100-01-04",
		chiefDoctorRu: "Д-р Соколова Мария Евгеньевна",
		seniorNurseRu: "Федорова Екатерина Романовна",
		isCentralHub: false,
	},
];

export function getClinicBranch(branchId: string): ClinicBranchInfo {
	const found = CLINIC_NETWORK_BRANCHES.find((b) => b.id === branchId || b.code === branchId);
	if (found) return found;
	return {
		id: branchId,
		code: "ФИЛ-XX",
		okpoCode: "00000000",
		nameRu: `Филиал «${branchId}»`,
		shortNameRu: `Филиал «${branchId}»`,
		addressRu: "г. Москва, филиал сети",
		phone: "+7 (495) 000-00-00",
		chiefDoctorRu: "Главный врач филиала",
		seniorNurseRu: "Старшая медсестра",
		isCentralHub: false,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. 152-FZ Consent Types & Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const patientSignatureTypeSchema = z.enum([
	"simple_electronic_signature_sms",
	"tablet_stylus_biometric",
	"paper_scan",
	"ukep_crypto_pro",
]);
export type PatientSignatureType = z.infer<typeof patientSignatureTypeSchema>;

export const patientBranchTransferConsentSchema = z.object({
	consentId: z.string().min(1),
	patientId: z.string().min(1),
	patientFullName: z.string().min(1),
	patientPassportOrId: z.string().min(1),
	sourceBranchId: z.string().min(1),
	targetBranchId: z.string().min(1),
	transferPurposeRu: z.string().min(1),
	signedAtIso: z.string(),
	validUntilIso: z.string(),
	operatorFullName: z.string().min(1),
	operatorPosition: z.string().min(1),
	signatureType: patientSignatureTypeSchema,
	signatureHash: z.string().min(16),
	legalBasis: z.string().default("152-ФЗ ст. 6, 9; 323-ФЗ ст. 13; Постановление Правительства РФ № 140"),
	isRevoked: z.boolean().default(false),
	revokedAtIso: z.string().optional(),
});
export type PatientBranchTransferConsent = z.infer<typeof patientBranchTransferConsentSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 3. Deposit Transfer Voucher Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const transferVoucherStatusSchema = z.enum([
	"issued",
	"in_transit",
	"redeemed",
	"cancelled",
	"expired",
]);
export type TransferVoucherStatus = z.infer<typeof transferVoucherStatusSchema>;

export const depositTransferVoucherSchema = z.object({
	voucherId: z.string().min(1),
	voucherCode: z.string().min(1),
	patientId: z.string().min(1),
	patientFullName: z.string().min(1),
	sourceBranchId: z.string().min(1),
	targetBranchId: z.string().min(1),
	amountKopecks: z.number().int().nonnegative(),
	amountRub: z.number().nonnegative(),
	issuedAtIso: z.string(),
	expiresAtIso: z.string(),
	status: transferVoucherStatusSchema,
	issuedByStaffId: z.string().min(1),
	issuedByStaffName: z.string().min(1),
	redeemedAtIso: z.string().optional(),
	redeemedByStaffId: z.string().optional(),
	redeemedByStaffName: z.string().optional(),
	idempotencyKey: z.string().min(1),
	payloadHash: z.string().min(16),
	crdtClock: z.record(z.string(), z.number()).optional(),
	notes: z.string().optional(),
});
export type DepositTransferVoucher = z.infer<typeof depositTransferVoucherSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 4. Centralized Lab Order Sync Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const ztlSyncStageRank: Record<string, number> = {
	impression_sent: 10,
	cad_design: 20,
	milling_wax_up: 30,
	try_in_fitting: 40,
	glaze_finish: 50,
	ready_for_dispatch: 60,
	delivered_to_clinic: 70,
	fitted_completed: 80,
	cancelled: 99,
};

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

// ─────────────────────────────────────────────────────────────────────────────
// 5. Complete Patient Clinical Snapshot Types
// ─────────────────────────────────────────────────────────────────────────────

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
