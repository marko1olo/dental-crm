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

function getCephApiUrl(path: string): string {
	const origin = typeof window !== "undefined" && window.location?.origin && window.location.origin !== "null"
		? window.location.origin
		: "http://localhost";
	return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function saveCephalometricAnalysisToApi(study: Partial<CephalometricSavedStudy>): Promise<CephalometricSavedStudy | null> {
	if (!study.patientId || typeof window === "undefined") return null;
	try {
		const res = await fetch(getCephApiUrl(`/api/orthodontics/${study.patientId}/ceph-analysis`), {
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
			const json = (await res.json()) as unknown;
			const payload = (json && typeof json === "object" && "data" in json && (json as { data: unknown }).data
				? (json as { data: unknown }).data
				: json) as { success?: boolean; study?: CephalometricSavedStudy } | null;
			return payload?.study ?? null;
		}
	} catch (err) {
		console.warn("[CephPersistence] API save offline fallback:", err);
	}
	return null;
}

export async function fetchPatientCephalometricStudyFromApi(patientId: string): Promise<CephalometricSavedStudy | null> {
	if (!patientId || typeof window === "undefined") return null;
	try {
		const res = await fetch(getCephApiUrl(`/api/orthodontics/${patientId}/ceph-analysis`), {
			headers: denteAdminSecretRequestHeaders({
				Accept: "application/json",
			}),
		});
		if (res.ok) {
			const json = (await res.json()) as unknown;
			const payload = (json && typeof json === "object" && "data" in json && (json as { data: unknown }).data
				? (json as { data: unknown }).data
				: json) as { success?: boolean; study?: CephalometricSavedStudy } | null;
			return payload?.study ?? null;
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
			// DEF-ORTHO-SEV1-04 (Мандаты 8zq, 8bn): Изоляция ТРГ строго по patientId без глобальных сливов
			const key = getCephStorageKey(study.patientId);
			localStorage.setItem(key, JSON.stringify(record));
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
		// DEF-ORTHO-SEV1-04: Читаем строго ключ указанного patientId без фолбэка на чужих пациентов
		const key = getCephStorageKey(patientId);
		const raw = localStorage.getItem(key);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as CephalometricSavedStudy;
		// Дополнительная валидация: если запрошен конкретный patientId, проверяем соответствие
		if (patientId && parsed.patientId && parsed.patientId !== patientId) {
			return null;
		}
		return parsed;
	} catch {
		return null;
	}
}

export function clearPatientCephalometricStudy(patientId?: string): void {
	if (typeof window === "undefined") return;
	try {
		const key = getCephStorageKey(patientId);
		localStorage.removeItem(key);
	} catch {
		// ignore
	}
}

export function loadPatientCephalometricStudies(patientId: string): CephalometricSavedStudy[] {
	const latest = loadLatestCephalometricStudy(patientId);
	return latest ? [latest] : [];
}

export function getCephStorageKey(patientId?: string): string {
	return patientId ? `dente_ceph_${patientId}` : "dente_ceph_anonymous_draft";
}
