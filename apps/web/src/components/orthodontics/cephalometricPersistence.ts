/**
 * @dental/web/components/orthodontics/cephalometricPersistence.ts
 * Утилиты сохранения цефалометрии для радиологии (Мандат 8b).
 */

import type { LandmarkMap, CephalometricAnalysisResult } from "./cephalometric";

export interface CephalometricSavedStudy {
	id: string;
	patientId?: string | undefined;
	patientName?: string | undefined;
	imageUrl?: string | null | undefined;
	landmarks?: LandmarkMap | undefined;
	scaleMmPerPixel?: number | undefined;
	analysis?: CephalometricAnalysisResult | undefined;
	source?: string | undefined;
	backendUsed?: string | undefined;
	isCalibratedFallback?: boolean | undefined;
	placedCount?: number | undefined;
	latencyMs?: number | undefined;
}

export function saveCephalometricAnalysisToEmr(study: Partial<CephalometricSavedStudy>): CephalometricSavedStudy {
	const id = study.id || `ceph-${Date.now()}`;
	const record: CephalometricSavedStudy = {
		id,
		patientId: study.patientId,
		patientName: study.patientName,
		imageUrl: study.imageUrl,
		landmarks: study.landmarks,
		scaleMmPerPixel: study.scaleMmPerPixel,
		analysis: study.analysis,
		source: study.source,
		backendUsed: study.backendUsed,
		isCalibratedFallback: study.isCalibratedFallback,
		placedCount: study.placedCount,
		latencyMs: study.latencyMs,
	};
	if (typeof window !== "undefined") {
		try {
			const key = study.patientId ? getCephStorageKey(study.patientId) : "dente_latest_ceph_study";
			localStorage.setItem(key, JSON.stringify(record));
			localStorage.setItem("dente_latest_ceph_study", JSON.stringify(record));
		} catch {
			// ignore storage errors
		}
	}
	return record;
}

export function loadLatestCephalometricStudy(patientId?: string): CephalometricSavedStudy | null {
	if (typeof window === "undefined") return null;
	try {
		const key = patientId ? getCephStorageKey(patientId) : "dente_latest_ceph_study";
		const raw = localStorage.getItem(key) ?? localStorage.getItem("dente_latest_ceph_study");
		if (!raw) return null;
		return JSON.parse(raw) as CephalometricSavedStudy;
	} catch {
		return null;
	}
}

export function loadPatientCephalometricStudies(patientId: string): CephalometricSavedStudy[] {
	const latest = loadLatestCephalometricStudy(patientId);
	return latest ? [latest] : [];
}

export function getCephStorageKey(patientId: string): string {
	return `dente_ceph_${patientId}`;
}
