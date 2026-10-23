/**
 * perioDraftStorage.ts — Локальное кэширование и восстановление черновика пародонтограммы.
 * Архитектурный слой Layer 1: Local Storage Cache (Мандат 8b, <= 120 строк).
 */

import {
	createDefaultPerioTeeth,
	type PerioToothRecord,
} from "@dental/shared";

export function getPerioStorageKey(patientId?: string, visitId?: string): string {
	return `dente_perio_local_draft_${patientId || visitId || "standalone"}`;
}

export function loadLocalPerioDraft(patientId?: string, visitId?: string): PerioToothRecord[] | null {
	if (typeof window === "undefined" || !window.localStorage) return null;
	const key = getPerioStorageKey(patientId, visitId);
	try {
		const raw = window.localStorage.getItem(key);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed?.teeth) && parsed.teeth.length > 0) {
			const defaults = createDefaultPerioTeeth(2);
			const tMap = new Map<number, PerioToothRecord>();
			for (const t of parsed.teeth) tMap.set(t.toothNumber, t);
			return defaults.map((def) => tMap.get(def.toothNumber) ?? def);
		}
	} catch {
		// ignore JSON parsing errors
	}
	return null;
}

export function saveLocalPerioDraft(
	teeth: PerioToothRecord[],
	patientId?: string,
	visitId?: string,
): void {
	if (typeof window === "undefined" || !window.localStorage) return;
	const key = getPerioStorageKey(patientId, visitId);
	try {
		window.localStorage.setItem(
			key,
			JSON.stringify({
				teeth,
				updatedAt: Date.now(),
				patientId,
				visitId,
			}),
		);
	} catch {
		// ignore quota errors
	}
}
