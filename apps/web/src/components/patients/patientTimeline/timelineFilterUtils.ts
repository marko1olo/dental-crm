import type { ImagingStudy } from "@dental/shared";
import { matchesDatePreset, type TactileDatePreset } from "../../radiology/RadiologyPatientSearchModal";
import { formatStudyDateKey, type GroupedDateStudies, type TimelineDatePreset } from "./types";

export interface TimelineFilterCriteria {
	readonly modality: string;
	readonly date: string;
	readonly datePreset: TimelineDatePreset;
	readonly tooth: string;
}

export function filterTimelineStudies(studies: readonly ImagingStudy[], criteria: TimelineFilterCriteria): ImagingStudy[] {
	return studies.filter((study) => {
		if (criteria.modality !== "all") {
			const m = (study.modality || study.kind || "").toLowerCase();
			if (criteria.modality === "io" && !m.includes("io") && !m.includes("rvg") && !m.includes("periapical") && !m.includes("sensor")) return false;
			if (criteria.modality === "opg" && !m.includes("opg") && !m.includes("pan")) return false;
			if (criteria.modality === "cbct" && !m.includes("cbct") && !m.includes("3d") && !m.includes("кт")) return false;
			if (criteria.modality === "ceph" && !m.includes("ceph") && !m.includes("trg")) return false;
			if (criteria.modality === "camera" && !m.includes("camera") && !m.includes("камер") && !m.includes("video")) return false;
			if (criteria.modality === "other" && !m.includes("other") && !m.includes("photo") && !m.includes("twain") && !m.includes("фото")) return false;
		}
		if (criteria.date !== "all") {
			const info = formatStudyDateKey(study.capturedAt || study.studyDate);
			if (info.formattedDate !== criteria.date) return false;
		}
		if (criteria.datePreset !== "all") {
			if (!matchesDatePreset(study.capturedAt || study.studyDate, criteria.datePreset as TactileDatePreset)) return false;
		}
		if (criteria.tooth !== "all" && String(study.toothCode || "") !== criteria.tooth) return false;
		return true;
	});
}

export function groupStudiesByDate(studies: readonly ImagingStudy[]): GroupedDateStudies[] {
	const groupsMap = new Map<string, { formattedDate: string; timestampMs: number; items: ImagingStudy[] }>();
	for (const study of studies) {
		const { dateKey, formattedDate, timestampMs } = formatStudyDateKey(study.capturedAt || study.studyDate);
		const existing = groupsMap.get(dateKey);
		if (existing) existing.items.push(study);
		else groupsMap.set(dateKey, { formattedDate, timestampMs, items: [study] });
	}
	const sortedGroups: GroupedDateStudies[] = [];
	for (const [dateKey, val] of groupsMap.entries()) {
		val.items.sort((a, b) => new Date(b.capturedAt || b.studyDate || 0).getTime() - new Date(a.capturedAt || a.studyDate || 0).getTime());
		sortedGroups.push({ dateKey, formattedDate: val.formattedDate, timestampMs: val.timestampMs, items: val.items });
	}
	sortedGroups.sort((a, b) => b.timestampMs - a.timestampMs);
	return sortedGroups;
}
