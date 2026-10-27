/**
 * apps/web/src/components/visit/anamnesisTab/anamnesisDraftStorage.ts
 *
 * Безопасное сохранение и восстановление локальных черновиков анамнеза (LocalStorage).
 * Предотвращает потерю клинических данных при случайной перезагрузке или смене вкладки.
 */

import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../../lib/safeLocalStorage";
import type { PregnancyTrimester } from "./types";

export interface AnamnesisDraftPayload {
	selectedAllergies: Record<string, string>;
	selectedRisks: string[];
	anticoagulantName: string;
	bisphosphonateName: string;
	pregnancyTrimester: PregnancyTrimester;
	selectedHistory: string[];
	selectedComplaints: string[];
	customNotes: string;
	updatedAt?: string;
}

export function getAnamnesisStorageKey(patientId?: string | null): string {
	return `dente_anamnesis_tab_draft_${patientId || "draft"}`;
}

export function loadAnamnesisDraft(storageKey: string): AnamnesisDraftPayload | null {
	try {
		const raw = safeLocalStorageGetItem(storageKey);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object") return null;

		return {
			selectedAllergies:
				parsed.selectedAllergies && typeof parsed.selectedAllergies === "object"
					? parsed.selectedAllergies
					: {},
			selectedRisks: Array.isArray(parsed.selectedRisks) ? parsed.selectedRisks : [],
			anticoagulantName:
				typeof parsed.anticoagulantName === "string" ? parsed.anticoagulantName : "",
			bisphosphonateName:
				typeof parsed.bisphosphonateName === "string" ? parsed.bisphosphonateName : "",
			pregnancyTrimester:
				parsed.pregnancyTrimester === "trimester_1" ||
				parsed.pregnancyTrimester === "trimester_2" ||
				parsed.pregnancyTrimester === "trimester_3" ||
				parsed.pregnancyTrimester === "lactation"
					? parsed.pregnancyTrimester
					: "trimester_2",
			selectedHistory: Array.isArray(parsed.selectedHistory) ? parsed.selectedHistory : [],
			selectedComplaints: Array.isArray(parsed.selectedComplaints)
				? parsed.selectedComplaints
				: [],
			customNotes: typeof parsed.customNotes === "string" ? parsed.customNotes : "",
			updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : undefined,
		};
	} catch {
		return null;
	}
}

export function saveAnamnesisDraft(
	storageKey: string,
	payload: AnamnesisDraftPayload,
): void {
	try {
		const toSave = {
			...payload,
			updatedAt: new Date().toISOString(),
		};
		safeLocalStorageSetItem(storageKey, JSON.stringify(toSave));
	} catch {
		// Silent safety: QuotaExceeded or disabled localStorage
	}
}
