/**
 * ============================================================================
 * PATIENT BRANCH TRANSFER VALIDATION RULES & FORMATTING HELPERS
 *
 * Validates 152-FZ consent, clinical snapshot integrity, and transfer draft
 * readiness checklist.
 * ============================================================================
 */

import type {
	PatientBranchTransferConsent,
	PatientClinicalSnapshot,
	PatientDemographicsSnapshot,
	PatientTransferDraft,
	TransferValidationResult,
} from "./types.js";

import {
	formatCurrencyRu,
	formatDateRu as formatDateRuShared,
	formatDateTimeRu as formatDateTimeRuShared,
} from "@dental/shared";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Formatting & Helpers (SSOT via @dental/shared)
// ─────────────────────────────────────────────────────────────────────────────

export const formatRubCurrency = formatCurrencyRu;
export const formatDateRu = formatDateRuShared;
export const formatDateTimeRu = formatDateTimeRuShared;

// ─────────────────────────────────────────────────────────────────────────────
// 2. Consent, Snapshot & Draft Validation Rules
// ─────────────────────────────────────────────────────────────────────────────

export function validatePatientBranchTransferConsent(consent: PatientBranchTransferConsent): boolean {
	return Boolean(consent.consentId && consent.patientId && consent.signatureHash);
}

export function validatePatientClinicalSnapshot(snapshot: PatientClinicalSnapshot): boolean {
	return Boolean(snapshot.snapshotId && snapshot.patientId && snapshot.checksumSha256);
}

export function validateTransferDraft(
	draft: PatientTransferDraft,
	patientData?: {
		readonly demographics?: PatientDemographicsSnapshot | undefined;
		readonly balanceRub?: number | undefined;
	},
): TransferValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (!draft.patientId) {
		errors.push("Не выбран пациент для межфилиального трансфера.");
	}
	if (!draft.sourceBranchId || !draft.targetBranchId) {
		errors.push("Необходимо указать филиал-отправитель и филиал-получатель.");
	}
	if (draft.sourceBranchId === draft.targetBranchId) {
		errors.push("Филиал-отправитель и филиал-получатель не могут совпадать.");
	}
	if (!draft.is152FzConsentGiven) {
		errors.push("Отсутствует согласие пациента на передачу данных между филиалами.");
	}
	if (!draft.operatorStaffName.trim()) {
		errors.push("Укажите ФИО ответственного сотрудника/администратора, проводящего трансфер.");
	}

	// Check that at least one component is selected
	const comp = draft.selectedComponents;
	const anySelected = Object.values(comp).some(Boolean);
	if (!anySelected) {
		errors.push("Выберите хотя бы один клинический раздел для передачи в целевой филиал.");
	}

	if (patientData?.balanceRub && patientData.balanceRub < 0) {
		warnings.push(`У пациента имеется дебиторская задолженность в размере ${formatRubCurrency(Math.abs(patientData.balanceRub))}. Перевод возможен, долг переносится в новый филиал.`);
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
	};
}
