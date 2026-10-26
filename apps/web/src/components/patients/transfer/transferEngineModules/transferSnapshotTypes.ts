/**
 * transferSnapshotTypes.ts — Типы клинических снепшотов трансфера медкарты.
 * Лимит <= 120 строк по Мандату 8b.
 */

import type { ClinicBranchInfo } from "./clinicBranches.js";
import type { PatientBranchTransferConsent } from "./transferConsentTypes.js";

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
		// biome-ignore lint/suspicious/noExplicitAny: teeth map
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
		// biome-ignore lint/suspicious/noExplicitAny: imaging studies
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
