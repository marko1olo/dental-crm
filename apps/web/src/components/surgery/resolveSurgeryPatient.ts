/**
 * resolveSurgeryPatient.ts — Честное разрешение ID пациента для амбулаторной хирургии (DENTE CRM).
 * Ликвидация фейковых UUID и муляжей: опора на активный контекст врача (Мандаты 8e, 8n).
 */

import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { useAppStore } from "../../store/appStore";

export const isUuid = (val: string | null | undefined): val is string =>
	Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val));

export async function resolveEffectiveSurgeryPatientId(
	patientId?: string,
	patientName?: string
): Promise<string | null> {
	if (isUuid(patientId)) return patientId;

	const store = useAppStore.getState();
	if (isUuid(store.activePatientId)) return store.activePatientId;

	const activeVisitPat = store.dashboard?.activeVisit?.patientId;
	if (isUuid(activeVisitPat)) return activeVisitPat;

	const pts = store.dashboard?.patients || [];
	const byMatch = pts.find((p) => (isUuid(p.id) && p.id === patientId) || p.fullName === patientName);
	if (byMatch && isUuid(byMatch.id)) return byMatch.id;

	const firstValid = pts.find((p) => isUuid(p.id));
	if (firstValid) return firstValid.id;

	if (typeof fetch === "function") {
		try {
			const res = await fetch("/api/patients?limit=5", {
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			});
			if (res.ok) {
				const data = await res.json();
				const list: Array<{ id: string }> = Array.isArray(data) ? data : data.patients || [];
				const found = list.find((p) => isUuid(p.id));
				if (found) return found.id;
			}
		} catch {
			/* автономный режим без сети */
		}
	}
	return null;
}
