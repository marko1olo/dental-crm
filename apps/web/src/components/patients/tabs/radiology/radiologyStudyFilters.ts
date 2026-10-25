import type { ImagingStudy } from "@dental/shared";
import {
	matchesDatePreset,
	matchesTactileModality,
	type RadiologyTactileFilterState,
} from "../../../radiology/RadiologyPatientSearchModal";

export function filterAndSortStudies(
	studies: ImagingStudy[],
	tactileFilters: RadiologyTactileFilterState,
): { sortedStudies: ImagingStudy[]; filteredStudies: ImagingStudy[] } {
	const sortedStudies = [...studies].sort(
		(a, b) => new Date(b.capturedAt || b.studyDate || 0).getTime() - new Date(a.capturedAt || a.studyDate || 0).getTime(),
	);

	const filteredStudies = sortedStudies.filter((study) => {
		if (!matchesTactileModality(study.kind || study.modality, tactileFilters.mode)) return false;
		if (!matchesDatePreset(study.capturedAt || study.studyDate, tactileFilters.datePreset, tactileFilters.customDateFrom, tactileFilters.customDateTo)) return false;
		if (tactileFilters.query) {
			const q = tactileFilters.query.toLowerCase().trim();
			if (!(study.title || "").toLowerCase().includes(q) && !(study.toothCode || "").includes(q) && !(study.seriesDescription || "").toLowerCase().includes(q)) return false;
		}
		return true;
	});

	return { sortedStudies, filteredStudies };
}
