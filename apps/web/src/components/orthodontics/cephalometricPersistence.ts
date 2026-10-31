/**
 * @dental/web/components/orthodontics/cephalometricPersistence.ts
 * Утилиты сохранения цефалометрии для радиологии (Мандат 8b).
 */

export function saveCephalometricAnalysisToEmr(study: unknown): boolean {
	if (typeof window === "undefined") return false;
	try {
		const key = "dente_latest_ceph_study";
		localStorage.setItem(key, JSON.stringify(study));
		return true;
	} catch {
		return false;
	}
}

export function loadLatestCephalometricStudy(): unknown | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = localStorage.getItem("dente_latest_ceph_study");
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

export function loadPatientCephalometricStudies(_patientId: string): unknown[] {
	const latest = loadLatestCephalometricStudy();
	return latest ? [latest] : [];
}

export function getCephStorageKey(patientId: string): string {
	return `dente_ceph_${patientId}`;
}
