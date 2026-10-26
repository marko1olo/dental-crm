/**
 * prescriptionDraftStorage.ts — Debounced Prescription Draft Autosave & Restore
 * Mandates: 8e (Doctor Autonomy), 8b (<= 120 lines). Zero data loss on modal collapse.
 */

import type { PrescriptionDrugItem } from "./prescriptionPreviewTypes";

export interface PrescriptionDraftData {
	readonly selectedDrugIds?: readonly string[];
	readonly customDrugsList?: readonly PrescriptionDrugItem[];
	readonly activePresetId?: string | undefined;
	readonly customTradeName?: string;
	readonly customLatinRp?: string;
	readonly customDispense?: string;
	readonly customSigna?: string;
	readonly validityDays?: "15" | "30" | "60" | "365";
	readonly isChronicSpecialCare?: boolean;
	readonly chronicPeriodicity?: string;
	readonly patientAddress?: string;
}

function getDraftKey(patientId?: string): string {
	const sanitized = (patientId || "default").replace(/[^a-zA-Z0-9_-]/g, "_");
	return `dente_rx_draft_${sanitized}`;
}

export function loadPrescriptionDraft(
	patientId?: string,
): PrescriptionDraftData | null {
	if (typeof window === "undefined" || !window.sessionStorage) return null;
	try {
		const raw = window.sessionStorage.getItem(getDraftKey(patientId));
		if (!raw) return null;
		return JSON.parse(raw) as PrescriptionDraftData;
	} catch {
		return null;
	}
}

export function savePrescriptionDraft(
	patientId: string | undefined,
	data: PrescriptionDraftData,
): void {
	if (typeof window === "undefined" || !window.sessionStorage) return;
	try {
		window.sessionStorage.setItem(getDraftKey(patientId), JSON.stringify(data));
	} catch {
		// Silent quota catch per Mandate 8e
	}
}

export function clearPrescriptionDraft(patientId?: string): void {
	if (typeof window === "undefined" || !window.sessionStorage) return;
	try {
		window.sessionStorage.removeItem(getDraftKey(patientId));
	} catch {
		// Ignore
	}
}
