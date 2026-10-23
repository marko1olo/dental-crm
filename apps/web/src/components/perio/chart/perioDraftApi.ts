/**
 * perioDraftApi.ts — Сетевой клиент сохранения и закрытия снапшотов периодонтограммы.
 * Архитектурный слой Layer 2: API Client (Мандат 8b, <= 120 строк).
 */

import {
	convertPerioDentitionToSepa,
	convertSepaDentitionToPerio,
	createDefaultPerioTeeth,
	type PerioToothRecord,
} from "@dental/shared";

export async function fetchRemoteDraft(
	patientId: string,
): Promise<{ id: string; teeth: PerioToothRecord[] } | null> {
	try {
		const res = await fetch(`/api/periodontogram/patients/${patientId}/draft`);
		if (!res.ok) return null;
		const json = await res.json();
		if (json.success && json.data?.id) {
			const converted = Array.isArray(json.data.teeth) && json.data.teeth.length > 0
				? convertSepaDentitionToPerio(json.data.teeth)
				: createDefaultPerioTeeth(2);
			return { id: json.data.id, teeth: converted };
		}
	} catch {
		// offline
	}
	return null;
}

export async function createRemoteDraft(
	patientId: string,
): Promise<{ id: string; teeth: PerioToothRecord[] } | null> {
	try {
		const res = await fetch(`/api/periodontogram/patients/${patientId}/draft`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});
		if (!res.ok) return null;
		const json = await res.json();
		if (json.success && json.data?.id) {
			const converted = Array.isArray(json.data.teeth) && json.data.teeth.length > 0
				? convertSepaDentitionToPerio(json.data.teeth)
				: createDefaultPerioTeeth(2);
			return { id: json.data.id, teeth: converted };
		}
	} catch {
		// offline
	}
	return null;
}

export async function patchRemoteDraftTeethAndSites(
	snapshotId: string,
	teeth: PerioToothRecord[],
): Promise<boolean> {
	const sepaTeeth = convertPerioDentitionToSepa(teeth);
	const teethPayload = sepaTeeth.map((t) => ({
		toothNumber: t.toothNumber,
		isPresent: t.isPresent,
		isImplant: t.isImplant,
		mobility: t.mobility,
		furcationBuccal: t.furcationBuccal,
		furcationLingual: t.furcationLingual,
	}));
	const sitesPayload = sepaTeeth.flatMap((t) =>
		(t.sites ?? []).map((s) => ({
			toothNumber: t.toothNumber,
			siteCode: s.siteCode,
			probingDepthMm: s.probingDepthMm,
			gingivalMarginMm: s.gingivalMarginMm,
			bleedingOnProbing: s.bleedingOnProbing,
			plaque: s.plaque,
			suppuration: s.suppuration,
			calculus: s.calculus,
		})),
	);

	const [patchTeethRes, patchSitesRes] = await Promise.all([
		fetch(`/api/periodontogram/snapshots/${snapshotId}/teeth`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ teeth: teethPayload }),
		}),
		fetch(`/api/periodontogram/snapshots/${snapshotId}/sites`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ sites: sitesPayload }),
		}),
	]);
	return patchTeethRes.ok && patchSitesRes.ok;
}

export async function closeRemoteDraftSnapshot(
	snapshotId: string,
	notes: string,
): Promise<boolean> {
	try {
		const res = await fetch(`/api/periodontogram/snapshots/${snapshotId}/close`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ notes }),
		});
		return res.ok;
	} catch {
		return false;
	}
}
