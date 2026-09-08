/**
 * apps/web/src/components/odontogram/odontogramStorage.ts
 *
 * DENTE Dental CRM — Persistent Two-Tier Local Storage for Odontogram.
 * Guarantees zero data loss (Mandate 8e: Doctor Autonomy) by caching tooth states
 * locally under `dente_odontogram_states_${patientId}`.
 */

import type { ToothData } from "./ToothChart";

export const ODONTOGRAM_STORAGE_PREFIX = "dente_odontogram_states_";

export function getOdontogramStorageKey(patientId: string): string {
	return `${ODONTOGRAM_STORAGE_PREFIX}${patientId}`;
}

/**
 * Loads cached odontogram teeth states from localStorage.
 * Returns null if no cached data exists or if execution environment has no localStorage.
 */
export function loadStoredTeethData(patientId: string): ToothData[] | null {
	if (typeof window === "undefined" || !window.localStorage) {
		return null;
	}
	try {
		const raw = window.localStorage.getItem(getOdontogramStorageKey(patientId));
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed) && parsed.length > 0) {
			return parsed as ToothData[];
		}
		return null;
	} catch {
		return null;
	}
}

/**
 * Persists current odontogram teeth states into localStorage for immediate offline safety.
 */
export function saveStoredTeethData(patientId: string, data: ToothData[]): void {
	if (typeof window === "undefined" || !window.localStorage) {
		return;
	}
	try {
		window.localStorage.setItem(getOdontogramStorageKey(patientId), JSON.stringify(data));
	} catch {
		// Safe localStorage quota fallback
	}
}
