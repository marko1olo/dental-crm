import { getCephStorageKey, type CephalometricStudyRecord } from "./types";

export function loadPatientCephalometricStudies(patientId?: string): CephalometricStudyRecord[] {
	if (!patientId || typeof window === "undefined" || !window.localStorage) return [];
	try {
		const storageKey = getCephStorageKey(patientId);
		const raw = window.localStorage.getItem(storageKey);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

export function loadLatestCephalometricStudy(patientId?: string): CephalometricStudyRecord | null {
	const list = loadPatientCephalometricStudies(patientId);
	return list.length > 0 ? list[0] ?? null : null;
}
