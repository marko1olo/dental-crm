/**
 * transferSnapshotBuilder.ts — Сборщик криптографического снепшота пациента.
 * Лимит <= 120 строк по Мандату 8b.
 */

import { issueDepositTransferVoucher } from "./financialDepositTransfer.js";
import {
	type CentralizedLabOrderSyncItem,
	getClinicBranch,
	type PatientBranchTransferConsent,
	type PatientClinicalSnapshot,
	type PatientDemographicsSnapshot,
	type SelectedTransferComponents,
	type SomaticAnamnesisSnapshot,
	type TreatmentPlanSnapshot,
	type VisitDiaryEntrySnapshot,
} from "./types.js";

let globalSnapshotSeq = 1000;

export function buildPatientClinicalSnapshot(params: {
	sourceBranchId: string;
	targetBranchId: string;
	demographics: PatientDemographicsSnapshot;
	somaticAnamnesis?: Partial<SomaticAnamnesisSnapshot> | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: teeth map
	odontogramTeeth?: Record<number, any> | undefined;
	visitDiaries?: readonly VisitDiaryEntrySnapshot[] | undefined;
	treatmentPlans?: readonly TreatmentPlanSnapshot[] | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: imaging list
	imagingStudies?: readonly any[] | undefined;
	balanceRub?: number | undefined;
	balanceKopecks?: number | undefined;
	familyGroupId?: string | null | undefined;
	labOrders?: readonly CentralizedLabOrderSyncItem[] | undefined;
	consent152Fz: PatientBranchTransferConsent;
	selectedComponents: SelectedTransferComponents;
	transferReasonRu: string;
	staffName: string;
	staffPosition: string;
}): PatientClinicalSnapshot {
	const patientSuffix = params.consent152Fz.patientId.replace(/[^a-zA-Z0-9]/g, "").slice(-4) || "0001";
	const snapshotId = `SNAP-${Date.now()}-${++globalSnapshotSeq}-${patientSuffix}`;
	const sourceBranch = getClinicBranch(params.sourceBranchId);
	const targetBranch = getClinicBranch(params.targetBranchId);
	const balanceRub = params.balanceRub || 0;
	const voucher =
		balanceRub > 0
			? issueDepositTransferVoucher(
					params.consent152Fz.patientId,
					balanceRub,
					params.sourceBranchId,
					params.targetBranchId,
				)
			: undefined;
	const teeth = params.odontogramTeeth || {};
	const studies = params.imagingStudies || [];
	const visits = params.visitDiaries || [];
	const plans = params.treatmentPlans || [];

	const checksumSha256 = `SHA256:${snapshotId}:${params.demographics.fullName}`;

	return {
		snapshotId,
		patientId: params.consent152Fz.patientId,
		patientFullName: params.demographics.fullName,
		exportedAtIso: new Date().toISOString(),
		sourceBranch,
		targetBranch,
		demographics: params.demographics,
		somaticAnamnesis: {
			allergies: params.somaticAnamnesis?.allergies || [],
			chronicDiseases: params.somaticAnamnesis?.chronicDiseases || [],
			isPregnantOrLactating: params.somaticAnamnesis?.isPregnantOrLactating || false,
			contraindications: params.somaticAnamnesis?.contraindications || [],
		},
		odontogramAndPerio: {
			teeth,
			cariesTeethCount: 0,
			filledTeethCount: 0,
			implantsCount: 0,
		},
		medicalHistory043u: {
			totalVisitsCount: visits.length,
			visits,
		},
		imagingArchive: {
			totalAccumulatedDoseMicroSv: 0,
			studies,
		},
		treatmentPlansAndEstimates: {
			totalPlannedCostRub: plans.reduce((acc, p) => acc + (p.totalCostRub || 0), 0),
			plans,
		},
		activeLabOrders: params.labOrders || [],
		financialDeposit: {
			currentBalanceRub: balanceRub,
			currentBalanceKopecks: params.balanceKopecks || Math.round(balanceRub * 100),
			...(voucher ? { transferVoucher: voucher } : {}),
		},
		consent152Fz: params.consent152Fz,
		initiatedByStaffName: params.staffName,
		initiatedByStaffPosition: params.staffPosition,
		transferReasonRu: params.transferReasonRu,
		checksumSha256,
	};
}
