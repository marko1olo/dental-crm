/**
 * utils.ts — Layer 1: Чистые функции группировки и фильтрации визитов для рентгеновского архива.
 */

import type { ImagingStudy } from "@dental/shared";
import {
	DEFAULT_VISIOGRAPHY_VISITS,
	matchesDatePreset,
	type ClinicalVisiographyVisit,
	type TactileDatePreset,
} from "./types";

export function buildVisiographyVisitsList(
	studies?: readonly ImagingStudy[] | undefined,
): readonly ClinicalVisiographyVisit[] {
	if (!studies || studies.length === 0) return DEFAULT_VISIOGRAPHY_VISITS;
	const groups = new Map<string, ImagingStudy[]>();
	for (const s of studies) {
		const d = s.studyDate || s.capturedAt?.slice(0, 10) || "2026-10-03";
		(groups.get(d) || groups.set(d, []).get(d)!).push(s);
	}
	return Array.from(groups.entries()).map(([d, stList]) => ({
		id: `visit-${d}`,
		dateStr: d,
		displayDate: d.split("-").reverse().join("."),
		relativeLabel:
			d === "2026-10-03" ? "Сегодня (Текущий приём)" : d === "2026-10-02" ? "Вчера" : "Архивный визит",
		doctorName: stList[0]?.patientFullName ? "Лечащий врач" : "Д-р Иванов А.С.",
		specialty: "Стоматолог-терапевт",
		teeth: Array.from(new Set(stList.map((s) => s.toothCode).filter(Boolean) as string[])),
		shotCount: stList.length,
		clinicalNote: stList[0]?.title || "Прицельная визиография RVG",
		previewThumbnails: stList.map((s) => s.previewUrl).filter(Boolean) as string[],
	})).sort((a, b) => b.dateStr.localeCompare(a.dateStr));
}

export function filterVisiographyVisits(
	visits: readonly ClinicalVisiographyVisit[],
	searchQuery: string,
	datePreset: TactileDatePreset,
	customDateFrom: string,
	customDateTo: string,
): readonly ClinicalVisiographyVisit[] {
	const q = searchQuery.toLowerCase().trim();
	return visits.filter((v) => {
		if (!matchesDatePreset(v.dateStr, datePreset, customDateFrom, customDateTo)) return false;
		if (!q) return true;
		return (
			v.teeth.some((t) => t.toLowerCase().includes(q)) ||
			v.doctorName.toLowerCase().includes(q) ||
			v.clinicalNote.toLowerCase().includes(q) ||
			v.displayDate.includes(q)
		);
	});
}
