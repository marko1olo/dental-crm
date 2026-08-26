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

import { canonicalJsonStringify, sha256Hex } from "./hashing.js";
import { createVectorClock, incrementVectorClock, compareVectorClocks, type VectorClockComparison } from "./mesh.js";
import { kopecksToRub, rubToKopecks } from "../fiscal/kopecksArithmetic.js";
import { generateQrCodeDataUri, generateQrCodeSvg } from "../fiscal/qrGenerator.js";
import type { ToothClinicalStatusCode } from "../documents/forms043u.js";
import {
	getClinicBranch,
	ztlSyncStageRank,
	type CentralizedLabOrderSyncItem,
	type DepositTransferVoucher,
	type ImagingArchiveSnapshot,
	type ImagingStudyItemSnapshot,
	type MedicalHistory043uSnapshot,
	type OdontogramAndPerioSnapshot,
	type OdontogramToothEntrySnapshot,
	type PatientBranchTransferConsent,
	type PatientClinicalSnapshot,
	type PatientDemographicsSnapshot,
	type PatientFinancialSnapshot,
	type PatientSignatureType,
	type SelectedTransferComponents,
	type SomaticAnamnesisSnapshot,
	type TreatmentPlanSnapshot,
	type TreatmentPlansAndEstimatesSnapshot,
	type VisitDiaryEntrySnapshot,
} from "./multibranchTypes.js";

// Re-export all type contracts & constants
export * from "./multibranchTypes.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. 152-FZ Personal Data & Medical Secrecy (323-FZ) Consent
// ─────────────────────────────────────────────────────────────────────────────

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

export function createPatientBranchTransferConsent(input: CreateConsentInput): PatientBranchTransferConsent {
	if (input.sourceBranchId === input.targetBranchId) {
		throw new Error("Филиал-отправитель и филиал-получатель не могут совпадать.");
	}
	const signedAt = input.signedAtIso || new Date().toISOString();
	const validDays = input.validDays ?? 365;
	const validUntil = new Date(new Date(signedAt).getTime() + validDays * 86400000).toISOString();
	const consentId = input.consentId || `consent-152fz-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	const signatureType = input.signatureType || "simple_electronic_signature_sms";

	const payloadToSign = `${input.patientId}|${input.sourceBranchId}|${input.targetBranchId}|${signedAt}|${input.operatorFullName}|${signatureType}`;
	const signatureHash = sha256Hex(payloadToSign);

	return {
		consentId,
		patientId: input.patientId,
		patientFullName: input.patientFullName.trim(),
		patientPassportOrId: input.patientPassportOrId.trim(),
		sourceBranchId: input.sourceBranchId,
		targetBranchId: input.targetBranchId,
		transferPurposeRu: input.transferPurposeRu?.trim() || "Продолжение стоматологического лечения и диспансерное наблюдение в филиале сети",
		signedAtIso: signedAt,
		validUntilIso: validUntil,
		operatorFullName: input.operatorFullName.trim(),
		operatorPosition: input.operatorPosition?.trim() || "Администратор филиала",
		signatureType,
		signatureHash,
		legalBasis: "152-ФЗ ст. 6, 9; 323-ФЗ ст. 13; Постановление Правительства РФ № 140",
		isRevoked: false,
	};
}

export function validatePatientBranchTransferConsent(consent: PatientBranchTransferConsent): {
	isValid: boolean;
	reasons: string[];
} {
	const reasons: string[] = [];
	if (consent.isRevoked) {
		reasons.push(`Согласие отозвано пациентом ${consent.revokedAtIso || ""}`.trim());
	}
	const now = Date.now();
	const expiryTime = new Date(consent.validUntilIso).getTime();
	if (Number.isFinite(expiryTime) && now > expiryTime) {
		reasons.push(`Срок действия согласия истек ${consent.validUntilIso}`);
	}
	if (!consent.signatureHash || consent.signatureHash.length < 16) {
		reasons.push("Отсутствует цифровая подпись / контрольный хеш согласия.");
	}
	if (consent.sourceBranchId === consent.targetBranchId) {
		reasons.push("Исходный и целевой филиалы совпадают.");
	}
	return {
		isValid: reasons.length === 0,
		reasons,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Multi-Branch Deposit Transfer Voucher Engine (Double-Spending Defenses)
// ─────────────────────────────────────────────────────────────────────────────

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

export function issueDepositTransferVoucher(params: IssueVoucherParams): {
	voucher: DepositTransferVoucher;
	debitedKopecks: number;
} {
	if (params.sourceBranchId === params.targetBranchId) {
		throw new Error("Невозможно выпустить трансфер-ваучер на тот же филиал.");
	}
	const kopecks = typeof params.amountKopecks === "number"
		? Math.max(0, Math.floor(params.amountKopecks))
		: typeof params.amountRub === "number"
			? rubToKopecks(params.amountRub)
			: 0;

	const nowIso = new Date().toISOString();
	const validDays = params.validDays ?? 30;
	const expiresIso = new Date(Date.now() + validDays * 86400000).toISOString();
	const dateStr = nowIso.slice(0, 10).replace(/-/g, "");
	const randSuffix = Math.floor(100000 + Math.random() * 900000).toString();
	const voucherCode = `VCH-${dateStr}-${randSuffix}`;
	const voucherId = `voucher-${Date.now()}-${randSuffix}`;

	const idempotencyKey = `idemp-vch-issue-${params.patientId}-${params.sourceBranchId}-${params.targetBranchId}-${kopecks}-${dateStr}`;
	const payloadCanonical = canonicalJsonStringify({
		voucherCode,
		patientId: params.patientId,
		sourceBranchId: params.sourceBranchId,
		targetBranchId: params.targetBranchId,
		amountKopecks: kopecks,
		issuedAtIso: nowIso,
	});
	const payloadHash = sha256Hex(payloadCanonical);
	const crdtClock = createVectorClock(params.sourceBranchId, 1);

	const voucher: DepositTransferVoucher = {
		voucherId,
		voucherCode,
		patientId: params.patientId,
		patientFullName: params.patientFullName.trim(),
		sourceBranchId: params.sourceBranchId,
		targetBranchId: params.targetBranchId,
		amountKopecks: kopecks,
		amountRub: kopecksToRub(kopecks),
		issuedAtIso: nowIso,
		expiresAtIso: expiresIso,
		status: "issued",
		issuedByStaffId: params.staffId,
		issuedByStaffName: params.staffName,
		idempotencyKey,
		payloadHash,
		crdtClock,
		notes: params.notes,
	};

	return {
		voucher,
		debitedKopecks: kopecks,
	};
}

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

export function redeemDepositTransferVoucher(params: RedeemVoucherParams): RedeemVoucherResult {
	const { voucher, redeemingBranchId, staffId, staffName } = params;

	// 1. Idempotency replay check
	if (voucher.status === "redeemed") {
		if (voucher.targetBranchId === redeemingBranchId) {
			return {
				success: true,
				updatedVoucher: voucher,
				creditedKopecks: voucher.amountKopecks,
				isDuplicateReplay: true,
			};
		}
		return {
			success: false,
			updatedVoucher: voucher,
			creditedKopecks: 0,
			isDuplicateReplay: false,
			errorReason: `Ваучер ${voucher.voucherCode} уже был погашен в филиале ${voucher.targetBranchId}`,
		};
	}

	// 2. Cancellation check
	if (voucher.status === "cancelled") {
		return {
			success: false,
			updatedVoucher: voucher,
			creditedKopecks: 0,
			isDuplicateReplay: false,
			errorReason: `Ваучер ${voucher.voucherCode} аннулирован и не подлежит зачислению.`,
		};
	}

	// 3. Expiration check
	const now = Date.now();
	const expiry = new Date(voucher.expiresAtIso).getTime();
	if (Number.isFinite(expiry) && now > expiry) {
		return {
			success: false,
			updatedVoucher: { ...voucher, status: "expired" },
			creditedKopecks: 0,
			isDuplicateReplay: false,
			errorReason: `Срок действия ваучера ${voucher.voucherCode} истек (${voucher.expiresAtIso}).`,
		};
	}

	// 4. Branch authorization check
	if (voucher.targetBranchId !== redeemingBranchId) {
		return {
			success: false,
			updatedVoucher: voucher,
			creditedKopecks: 0,
			isDuplicateReplay: false,
			errorReason: `Несоответствие филиала: ваучер предназначен для ${voucher.targetBranchId}, а предъявлен в ${redeemingBranchId}.`,
		};
	}

	// 5. Payload hash verification
	const payloadCanonical = canonicalJsonStringify({
		voucherCode: voucher.voucherCode,
		patientId: voucher.patientId,
		sourceBranchId: voucher.sourceBranchId,
		targetBranchId: voucher.targetBranchId,
		amountKopecks: voucher.amountKopecks,
		issuedAtIso: voucher.issuedAtIso,
	});
	const expectedHash = sha256Hex(payloadCanonical);
	if (expectedHash !== voucher.payloadHash) {
		return {
			success: false,
			updatedVoucher: voucher,
			creditedKopecks: 0,
			isDuplicateReplay: false,
			errorReason: "Нарушена целостность криптографического хеша ваучера (манипуляция данными).",
		};
	}

	// 6. Execute atomic redemption
	const redeemedAtIso = params.redeemedAtIso || new Date().toISOString();
	const nextClock = incrementVectorClock(voucher.crdtClock || {}, redeemingBranchId);

	const updatedVoucher: DepositTransferVoucher = {
		...voucher,
		status: "redeemed",
		redeemedAtIso,
		redeemedByStaffId: staffId,
		redeemedByStaffName: staffName,
		crdtClock: nextClock,
	};

	return {
		success: true,
		updatedVoucher,
		creditedKopecks: voucher.amountKopecks,
		isDuplicateReplay: false,
	};
}

export function resolveDepositTransferConflict(
	v1: DepositTransferVoucher,
	v2: DepositTransferVoucher,
): {
	winner: DepositTransferVoucher;
	strategy: "redeemed_priority" | "cancelled_priority" | "vector_clock_lww" | "identical";
} {
	if (v1.voucherId !== v2.voucherId && v1.voucherCode !== v2.voucherCode) {
		throw new Error("Невозможно разрешить конфликт для разных ваучеров.");
	}

	if (v1.status === v2.status && v1.payloadHash === v2.payloadHash) {
		return { winner: v1, strategy: "identical" };
	}

	// Redeemed status has highest operational precedence (money claimed at branch)
	if (v1.status === "redeemed" && v2.status !== "redeemed") {
		return { winner: v1, strategy: "redeemed_priority" };
	}
	if (v2.status === "redeemed" && v1.status !== "redeemed") {
		return { winner: v2, strategy: "redeemed_priority" };
	}

	// Cancelled status beats unredeemed issued
	if (v1.status === "cancelled" && v2.status === "issued") {
		return { winner: v1, strategy: "cancelled_priority" };
	}
	if (v2.status === "cancelled" && v1.status === "issued") {
		return { winner: v2, strategy: "cancelled_priority" };
	}

	// Vector clock & LWW tie-break
	const clockComp: VectorClockComparison = compareVectorClocks(v1.crdtClock || {}, v2.crdtClock || {});
	if (clockComp === "after") {
		return { winner: v1, strategy: "vector_clock_lww" };
	}
	if (clockComp === "before") {
		return { winner: v2, strategy: "vector_clock_lww" };
	}

	// Fallback to timestamp
	const t1 = new Date(v1.redeemedAtIso || v1.issuedAtIso).getTime();
	const t2 = new Date(v2.redeemedAtIso || v2.issuedAtIso).getTime();
	return {
		winner: t1 >= t2 ? v1 : v2,
		strategy: "vector_clock_lww",
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Centralized Dental Lab (ZTL) Order Sync & Re-routing Engine
// ─────────────────────────────────────────────────────────────────────────────

export function rerouteLabOrderDestination(
	order: CentralizedLabOrderSyncItem,
	newDestinationBranchId: string,
	reason: string,
	operatorStaffName: string,
): CentralizedLabOrderSyncItem {
	if (order.destinationBranchId === newDestinationBranchId) {
		return order;
	}
	const nowIso = new Date().toISOString();
	const nextClock = incrementVectorClock(order.crdtClock, newDestinationBranchId);

	return {
		...order,
		destinationBranchId: newDestinationBranchId,
		isRerouted: true,
		reroutedReason: `Перенаправлен оператором ${operatorStaffName}: ${reason} (было: ${getClinicBranch(order.destinationBranchId).shortNameRu} -> стало: ${getClinicBranch(newDestinationBranchId).shortNameRu})`,
		lastUpdatedAtIso: nowIso,
		crdtClock: nextClock,
	};
}

export function mergeLabOrderSyncCrdt(
	local: CentralizedLabOrderSyncItem,
	remote: CentralizedLabOrderSyncItem,
): {
	merged: CentralizedLabOrderSyncItem;
	conflictResolved: boolean;
	winner: "local" | "remote" | "merged";
} {
	if (local.orderId !== remote.orderId) {
		throw new Error("Невозможно объединить разные наряды лаборатории.");
	}

	const localRank = local.stageRank ?? ztlSyncStageRank[local.currentStage] ?? 0;
	const remoteRank = remote.stageRank ?? ztlSyncStageRank[remote.currentStage] ?? 0;

	// 1. If stages differ, higher production progression wins (e.g. milling wins over CAD)
	if (localRank > remoteRank) {
		return { merged: local, conflictResolved: true, winner: "local" };
	}
	if (remoteRank > localRank) {
		return { merged: remote, conflictResolved: true, winner: "remote" };
	}

	// 2. If rerouted flag is set in remote, preserve destination rerouting
	let destBranch = local.destinationBranchId;
	let isRerouted = local.isRerouted;
	let reroutedReason = local.reroutedReason;
	if (remote.isRerouted && !local.isRerouted) {
		destBranch = remote.destinationBranchId;
		isRerouted = true;
		reroutedReason = remote.reroutedReason;
	}

	const tLocal = new Date(local.lastUpdatedAtIso).getTime();
	const tRemote = new Date(remote.lastUpdatedAtIso).getTime();
	const base = tRemote >= tLocal ? remote : local;

	const merged: CentralizedLabOrderSyncItem = {
		...base,
		destinationBranchId: destBranch,
		isRerouted,
		reroutedReason,
		crdtClock: {
			...(local.crdtClock || {}),
			...(remote.crdtClock || {}),
		},
		lastUpdatedAtIso: new Date(Math.max(tLocal, tRemote)).toISOString(),
	};

	return {
		merged,
		conflictResolved: true,
		winner: "merged",
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Snapshot Builder & Validation Engine
// ─────────────────────────────────────────────────────────────────────────────

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

export function buildPatientClinicalSnapshot(options: BuildSnapshotOptions): PatientClinicalSnapshot {
	const { sourceBranchId, targetBranchId, demographics, consent152Fz } = options;

	if (sourceBranchId === targetBranchId) {
		throw new Error("Филиал-отправитель и филиал-получатель не могут совпадать.");
	}

	const consentCheck = validatePatientBranchTransferConsent(consent152Fz);
	if (!consentCheck.isValid) {
		throw new Error(`Недействительное согласие 152-ФЗ: ${consentCheck.reasons.join("; ")}`);
	}

	const sourceBranch = getClinicBranch(sourceBranchId);
	const targetBranch = getClinicBranch(targetBranchId);
	const snapshotId = `snap-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	const exportedAtIso = new Date().toISOString();

	// 1. Somatic Anamnesis
	const somatic: SomaticAnamnesisSnapshot = {
		allergies: options.somaticAnamnesis?.allergies ?? [],
		chronicDiseases: options.somaticAnamnesis?.chronicDiseases ?? [],
		somaticAlerts: options.somaticAnamnesis?.somaticAlerts ?? [],
		bloodType: options.somaticAnamnesis?.bloodType,
		cardiacPacemaker: options.somaticAnamnesis?.cardiacPacemaker ?? false,
		diabetes: options.somaticAnamnesis?.diabetes ?? false,
		pregnancyTrimester: options.somaticAnamnesis?.pregnancyTrimester ?? null,
		hepatitisB_C: options.somaticAnamnesis?.hepatitisB_C ?? false,
		hivAids: options.somaticAnamnesis?.hivAids ?? false,
		notes: options.somaticAnamnesis?.notes,
	};

	// 2. Odontogram & Perio
	const teethRecord: Record<number, OdontogramToothEntrySnapshot> = {};
	let missingCount = 0;
	let cariesCount = 0;
	let filledCount = 0;
	let implantsCount = 0;
	let crownsCount = 0;

	if (options.odontogramTeeth) {
		for (const [tNumStr, entry] of Object.entries(options.odontogramTeeth)) {
			const tNum = Number(tNumStr);
			const code: ToothClinicalStatusCode = entry.statusCode || "healthy";
			if (code === "extracted_absent") missingCount++;
			else if (code.startsWith("caries_") || code.startsWith("pulpitis_") || code.startsWith("periodontitis_")) cariesCount++;
			else if (code.startsWith("filled_")) filledCount++;
			else if (code === "implant") implantsCount++;
			else if (code.startsWith("crown_")) crownsCount++;

			teethRecord[tNum] = {
				toothNumber: tNum,
				statusCode: code,
				statusLabelRu: entry.statusLabelRu || "Норма (здоровый)",
				affectedSurfaces: entry.affectedSurfaces || [],
				rootCanalsCount: entry.rootCanalsCount,
				mobilityDegree: entry.mobilityDegree,
				periodontalPocketDepthMm: entry.periodontalPocketDepthMm,
				clinicalNotes: entry.clinicalNotes,
			};
		}
	}

	const odontogramAndPerio: OdontogramAndPerioSnapshot = {
		teeth: teethRecord,
		viewMode: "standard_fdi",
		missingTeethCount: missingCount,
		cariesTeethCount: cariesCount,
		filledTeethCount: filledCount,
		implantsCount: implantsCount,
		crownsCount: crownsCount,
	};

	// 3. Medical History 043/u
	const diaries = options.visitDiaries ?? [];
	const sortedDiaries = [...diaries].sort((a, b) => new Date(a.visitDateIso).getTime() - new Date(b.visitDateIso).getTime());
	const medicalHistory043u: MedicalHistory043uSnapshot = {
		form043Number: `043/у-${demographics.id.slice(0, 8)}`,
		openingDateIso: sortedDiaries[0]?.visitDateIso || exportedAtIso,
		visitDiaries: sortedDiaries,
		totalVisitsCount: sortedDiaries.length,
		firstVisitDateIso: sortedDiaries[0]?.visitDateIso,
		lastVisitDateIso: sortedDiaries[sortedDiaries.length - 1]?.visitDateIso,
	};

	// 4. Treatment Plans
	const plans = options.treatmentPlans ?? [];
	let totalPlanKopecks = 0;
	for (const p of plans) {
		totalPlanKopecks += p.totalCostKopecks;
	}
	const treatmentPlansAndEstimates: TreatmentPlansAndEstimatesSnapshot = {
		plans,
		totalPlannedCostKopecks: totalPlanKopecks,
		totalPlannedCostRub: kopecksToRub(totalPlanKopecks),
	};

	// 5. Imaging Studies & Radiation Doses
	const studies = options.imagingStudies ?? [];
	let totalMicroSv = 0;
	for (const s of studies) {
		totalMicroSv += s.effectiveDoseMicroSv || 0;
	}
	const imagingArchive: ImagingArchiveSnapshot = {
		studies,
		totalAccumulatedDoseMicroSv: totalMicroSv,
		totalAccumulatedDoseMilliSv: Math.round((totalMicroSv / 1000) * 1000) / 1000,
	};

	// 6. Financial Deposit & Voucher
	const balanceKopecks = typeof options.balanceKopecks === "number"
		? Math.max(0, Math.floor(options.balanceKopecks))
		: typeof options.balanceRub === "number"
			? rubToKopecks(options.balanceRub)
			: 0;

	let transferVoucher: DepositTransferVoucher | undefined;
	if (balanceKopecks > 0) {
		const issued = issueDepositTransferVoucher({
			patientId: demographics.id,
			patientFullName: demographics.fullName,
			sourceBranchId,
			targetBranchId,
			amountKopecks: balanceKopecks,
			staffId: "staff-system",
			staffName: options.staffName,
			notes: "Автоматический трансфер-ваучер баланса при переносе медкарты 043/у",
		});
		transferVoucher = issued.voucher;
	}

	const financialDeposit: PatientFinancialSnapshot = {
		currentBalanceKopecks: balanceKopecks,
		currentBalanceRub: kopecksToRub(balanceKopecks),
		familyGroupId: options.familyGroupId,
		transferVoucher,
	};

	// 7. Active Lab Orders (ZTL)
	const rawLabOrders = options.labOrders ?? [];
	const labOrders: CentralizedLabOrderSyncItem[] = rawLabOrders.map((ord) => {
		if (ord.destinationBranchId !== targetBranchId) {
			return rerouteLabOrderDestination(
				ord,
				targetBranchId,
				"Автоматическое перенаправление при трансфере пациента",
				options.staffName,
			);
		}
		return ord;
	});

	// 8. Selected components
	const selectedComponents: SelectedTransferComponents = {
		demographics: options.selectedComponents?.demographics ?? true,
		somaticAnamnesis: options.selectedComponents?.somaticAnamnesis ?? true,
		odontogram043u: options.selectedComponents?.odontogram043u ?? true,
		visitDiaries: options.selectedComponents?.visitDiaries ?? true,
		treatmentPlans: options.selectedComponents?.treatmentPlans ?? true,
		imagingArchive: options.selectedComponents?.imagingArchive ?? true,
		depositBalance: options.selectedComponents?.depositBalance ?? true,
		activeLabOrders: options.selectedComponents?.activeLabOrders ?? true,
	};

	// 9. Compute Checksum
	const payloadForHash = canonicalJsonStringify({
		snapshotId,
		schemaVersion: "dente-clinical-snapshot-v1.0",
		exportedAtIso,
		sourceBranchId,
		targetBranchId,
		patientId: demographics.id,
		patientFullName: demographics.fullName,
		demographics,
		somatic,
		odontogramAndPerio,
		medicalHistory043u,
		treatmentPlansAndEstimates,
		imagingArchive,
		financialDeposit,
		labOrders,
		consent152Fz,
		selectedComponents,
	});
	const checksumSha256 = sha256Hex(payloadForHash);

	return {
		snapshotId,
		schemaVersion: "dente-clinical-snapshot-v1.0",
		exportedAtIso,
		sourceBranch,
		targetBranch,
		patientId: demographics.id,
		patientFullName: demographics.fullName,
		demographics,
		somaticAnamnesis: somatic,
		odontogramAndPerio,
		medicalHistory043u,
		treatmentPlansAndEstimates,
		imagingArchive,
		financialDeposit,
		activeLabOrders: labOrders,
		consent152Fz,
		selectedComponents,
		transferReasonRu: options.transferReasonRu || "Перевод пациента на продолжение лечения в филиале сети",
		initiatedByStaffName: options.staffName,
		initiatedByStaffPosition: options.staffPosition || "Администратор филиала",
		checksumSha256,
	};
}

export function validatePatientClinicalSnapshot(snapshot: PatientClinicalSnapshot): {
	isValid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	if (!snapshot.snapshotId || !snapshot.patientId) {
		errors.push("Снимок не содержит обязательных идентификаторов (snapshotId, patientId).");
	}
	if (snapshot.schemaVersion !== "dente-clinical-snapshot-v1.0") {
		errors.push(`Неподдерживаемая версия схемы: ${snapshot.schemaVersion}`);
	}
	if (snapshot.sourceBranch.id === snapshot.targetBranch.id) {
		errors.push("Филиал-отправитель и филиал-получатель совпадают.");
	}

	// 152-FZ consent validation
	const consentValidation = validatePatientBranchTransferConsent(snapshot.consent152Fz);
	if (!consentValidation.isValid) {
		errors.push(`Ошибка согласия 152-ФЗ: ${consentValidation.reasons.join(", ")}`);
	}

	// Checksum verification
	const payloadForHash = canonicalJsonStringify({
		snapshotId: snapshot.snapshotId,
		schemaVersion: snapshot.schemaVersion,
		exportedAtIso: snapshot.exportedAtIso,
		sourceBranchId: snapshot.sourceBranch.id,
		targetBranchId: snapshot.targetBranch.id,
		patientId: snapshot.patientId,
		patientFullName: snapshot.patientFullName,
		demographics: snapshot.demographics,
		somatic: snapshot.somaticAnamnesis,
		odontogramAndPerio: snapshot.odontogramAndPerio,
		medicalHistory043u: snapshot.medicalHistory043u,
		treatmentPlansAndEstimates: snapshot.treatmentPlansAndEstimates,
		imagingArchive: snapshot.imagingArchive,
		financialDeposit: snapshot.financialDeposit,
		labOrders: snapshot.activeLabOrders,
		consent152Fz: snapshot.consent152Fz,
		selectedComponents: snapshot.selectedComponents,
	});
	const recalculatedHash = sha256Hex(payloadForHash);
	if (recalculatedHash !== snapshot.checksumSha256) {
		errors.push("Несоответствие контрольной суммы SHA-256 (повреждение данных при передаче).");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. QR Code Verification Generator (ISO/IEC 18004 SVG & Data-URI)
// ─────────────────────────────────────────────────────────────────────────────

export function generateTransferVerificationQrPayload(snapshot: PatientClinicalSnapshot): string {
	const voucherCode = snapshot.financialDeposit.transferVoucher?.voucherCode || "NONE";
	const voucherKopecks = snapshot.financialDeposit.transferVoucher?.amountKopecks || 0;
	return [
		"DENTE-TRF-V1",
		`SID:${snapshot.snapshotId}`,
		`PID:${snapshot.patientId}`,
		`SRC:${snapshot.sourceBranch.code}`,
		`DST:${snapshot.targetBranch.code}`,
		`VCH:${voucherCode}:${voucherKopecks}`,
		`CSUM:${snapshot.checksumSha256.slice(0, 16)}`,
		`EXP:${snapshot.exportedAtIso}`,
	].join("|");
}

export function generateTransferVerificationQrSvg(snapshot: PatientClinicalSnapshot, size = 180): string {
	const payload = generateTransferVerificationQrPayload(snapshot);
	return generateQrCodeSvg(payload, {
		size,
		margin: 4,
		foregroundColor: "#0f172a",
		backgroundColor: "#ffffff",
		title: `QR верификации трансфера ${snapshot.patientFullName}`,
	});
}

export function generateTransferVerificationQrDataUri(snapshot: PatientClinicalSnapshot, size = 180): string {
	const payload = generateTransferVerificationQrPayload(snapshot);
	return generateQrCodeDataUri(payload, {
		size,
		margin: 4,
		foregroundColor: "#0f172a",
		backgroundColor: "#ffffff",
		title: `QR верификации трансфера ${snapshot.patientFullName}`,
	});
}
