/**
 * imagingMeasurementsApi.ts — Загрузка и сохранение замеров и состояния сессии просмотрщика
 * Mandate 8b: строго <= 120 строк.
 */

import type { ViewerRulerMeasurement } from "../types.js";

export async function fetchStudyMeasurementsAndSession(
	studyId: string,
	headers: Record<string, string>,
): Promise<{ measurements: ViewerRulerMeasurement[]; sessionState?: any }> {
	const [measRes, sessionRes] = await Promise.all([
		fetch(`/api/imaging/studies/${studyId}/measurements`, { headers }),
		fetch(`/api/imaging/studies/${studyId}/viewer-session`, { headers }),
	]);

	let measurements: ViewerRulerMeasurement[] = [];
	if (measRes.ok) {
		const data = await measRes.json();
		if (Array.isArray(data)) {
			measurements = data.map((item: any) => {
				const coords = item.coordinates || {};
				const measures = item.measurements || {};
				return {
					id: item.id || `m_${Math.random().toString(36).substring(2, 9)}`,
					startX: Number(coords.startX ?? coords.start?.x ?? 0),
					startY: Number(coords.startY ?? coords.start?.y ?? 0),
					endX: Number(coords.endX ?? coords.end?.x ?? 0),
					endY: Number(coords.endY ?? coords.end?.y ?? 0),
					lengthMm: Number(measures.lengthMm ?? measures.distanceMm ?? measures.value ?? 0),
					distanceMm: Number(measures.distanceMm ?? measures.lengthMm ?? measures.value ?? 0),
					label: item.notes || (item.toothCode ? `Зуб ${item.toothCode}` : undefined),
				};
			});
		}
	}

	let sessionState: any = undefined;
	if (sessionRes.ok) {
		const sessionData = await sessionRes.json();
		sessionState = sessionData.session?.state;
	}

	return { measurements, sessionState };
}

export async function saveStudyMeasurements(
	studyId: string,
	toothCode: string | null | undefined,
	rulerMeasurements: ViewerRulerMeasurement[],
	headers: Record<string, string>,
): Promise<boolean> {
	const payload = {
		measurements: rulerMeasurements.map((m) => ({
			id: m.id,
			toothCode: toothCode ?? null,
			annotationType: "distance",
			coordinates: { startX: m.startX, startY: m.startY, endX: m.endX, endY: m.endY },
			measurements: { lengthMm: m.lengthMm, distanceMm: m.distanceMm ?? m.lengthMm },
			notes: m.label ?? null,
		})),
	};
	const res = await fetch(`/api/imaging/studies/${studyId}/measurements`, {
		method: "PUT",
		headers,
		body: JSON.stringify(payload),
	});
	return res.ok;
}
