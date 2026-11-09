/**
 * @dental/web/components/orthodontics/cephalometricPersistence.ts
 * Утилиты сохранения цефалометрии для радиологии (Мандат 8b).
 */

import type { LandmarkMap, CephalometricAnalysisResult } from "./cephalometric";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";

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
	savedAt?: string | undefined;
}

export async function saveCephalometricAnalysisToApi(study: Partial<CephalometricSavedStudy>): Promise<CephalometricSavedStudy | null> {
	if (!study.patientId || typeof window === "undefined") return null;
	try {
		const res = await fetch(`/api/orthodontics/${study.patientId}/ceph-analysis`, {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
				Accept: "application/json",
			}),
			body: JSON.stringify({
				id: study.id,
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
			}),
		});

		if (res.ok) {
			const data = (await res.json()) as { success?: boolean; study?: CephalometricSavedStudy };
			return data.study ?? null;
		}
	} catch (err) {
		console.warn("[CephPersistence] API save offline fallback:", err);
	}
	return null;
}

export async function fetchPatientCephalometricStudyFromApi(patientId: string): Promise<CephalometricSavedStudy | null> {
	if (!patientId || typeof window === "undefined") return null;
	try {
		const res = await fetch(`/api/orthodontics/${patientId}/ceph-analysis`, {
			headers: denteAdminSecretRequestHeaders({
				Accept: "application/json",
			}),
		});
		if (res.ok) {
			const data = (await res.json()) as { success?: boolean; study?: CephalometricSavedStudy };
			return data.study ?? null;
		}
	} catch (err) {
		console.warn("[CephPersistence] API fetch offline fallback:", err);
	}
	return null;
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
		savedAt: new Date().toISOString(),
	};
	if (typeof window !== "undefined") {
		try {
			const key = study.patientId ? getCephStorageKey(study.patientId) : "dente_latest_ceph_study";
			localStorage.setItem(key, JSON.stringify(record));
			localStorage.setItem("dente_latest_ceph_study", JSON.stringify(record));
		} catch {
			// ignore storage errors
		}

		// Фоновая сетевая синхронизация с Fastify API и PostgreSQL 18
		if (study.patientId) {
			void saveCephalometricAnalysisToApi(record);
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
