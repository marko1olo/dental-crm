import { useMemo, useState } from "react";
import type { ImagingStudy } from "./types.js";

export function useImagingStudyFilter(
	visibleImagingStudies: ImagingStudy[],
	activeImagingStudies: ImagingStudy[],
	imagingToothFilter?: string,
	setImagingToothFilter?: (filter: string) => void,
	onSelectStudy?: (studyId: string) => void,
) {
	const [localToothFilter, setLocalToothFilter] = useState("all");
	const effectiveToothFilter = imagingToothFilter ?? localToothFilter;

	const handleToothChange = (tooth: string) => {
		if (setImagingToothFilter) setImagingToothFilter(tooth);
		else setLocalToothFilter(tooth);
		if (tooth !== "all" && onSelectStudy) {
			const candidateStudies =
				activeImagingStudies?.length > 0
					? activeImagingStudies
					: visibleImagingStudies;
			const matching = (candidateStudies || []).find(
				(s) => String(s.toothCode ?? "").trim() === String(tooth).trim(),
			);
			if (matching?.id) onSelectStudy(matching.id);
		}
	};

	const availableTeeth = useMemo(() => {
		const set = new Set<string>();
		for (const s of activeImagingStudies ?? []) {
			if (s.toothCode) {
				const cleaned = String(s.toothCode).trim();
				if (cleaned) set.add(cleaned);
			}
		}
		return Array.from(set).sort((a, b) => {
			const na = Number.parseInt(a, 10);
			const nb = Number.parseInt(b, 10);
			return !Number.isNaN(na) && !Number.isNaN(nb)
				? na - nb
				: a.localeCompare(b);
		});
	}, [activeImagingStudies]);

	const displayStudies = useMemo(() => {
		if (!effectiveToothFilter || effectiveToothFilter === "all")
			return visibleImagingStudies;
		return visibleImagingStudies.filter(
			(s) =>
				String(s.toothCode ?? "").trim() ===
				String(effectiveToothFilter).trim(),
		);
	}, [visibleImagingStudies, effectiveToothFilter]);

	return {
		effectiveToothFilter,
		handleToothChange,
		availableTeeth,
		displayStudies,
	};
}
