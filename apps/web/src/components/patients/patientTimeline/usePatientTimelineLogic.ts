import { useMemo, useState } from "react";
import type { ImagingStudy } from "@dental/shared";
import { is3DScanUrl } from "../../lab/LabAttachScanModal";
import { formatStudyDateKey, type PatientTimelineProps, type TimelineDatePreset } from "./types";
import { filterTimelineStudies, groupStudiesByDate } from "./timelineFilterUtils";

export function usePatientTimelineLogic(props: PatientTimelineProps) {
	const {
		studies,
		activeStudyId: externalActiveStudyId,
		onSelectStudy,
		onOpenStudio,
		onOpenScan3d,
		onOpenViewer,
		defaultZoomPx = 140,
	} = props;

	const [internalActiveId, setInternalActiveId] = useState<string | null>(studies[0]?.id || null);
	const activeStudyId = externalActiveStudyId !== undefined ? externalActiveStudyId : internalActiveId;
	const [cardWidth, setCardWidth] = useState<number>(defaultZoomPx);
	const [selectedModalityFilter, setSelectedModalityFilter] = useState<string>("all");
	const [selectedDateFilter, setSelectedDateFilter] = useState<string>("all");
	const [selectedDatePreset, setSelectedDatePreset] = useState<TimelineDatePreset>("all");
	const [selectedToothFilter, setSelectedToothFilter] = useState<string>("all");

	const filteredStudies = useMemo(() => {
		return filterTimelineStudies(studies, {
			modality: selectedModalityFilter,
			date: selectedDateFilter,
			datePreset: selectedDatePreset,
			tooth: selectedToothFilter,
		});
	}, [studies, selectedModalityFilter, selectedDateFilter, selectedDatePreset, selectedToothFilter]);

	const groupedStudies = useMemo(() => groupStudiesByDate(filteredStudies), [filteredStudies]);

	const availableDates = useMemo(() => {
		const datesSet = new Set<string>();
		for (const s of studies) {
			const info = formatStudyDateKey(s.capturedAt || s.studyDate);
			if (info.formattedDate && info.formattedDate !== "Без даты") datesSet.add(info.formattedDate);
		}
		return Array.from(datesSet);
	}, [studies]);

	const availableTeeth = useMemo(() => {
		const teeth = new Set<string>();
		for (const s of studies) {
			if (s.toothCode) teeth.add(String(s.toothCode));
		}
		return Array.from(teeth).sort();
	}, [studies]);

	const handleCardClick = (study: ImagingStudy) => {
		setInternalActiveId(study.id);
		onSelectStudy?.(study);
	};

	const handleCardDoubleClick = (study: ImagingStudy) => {
		const is3DScan = Boolean(
			(study.kind as string) === "scan_3d" ||
			study.modality === "STL" ||
			study.modality === "PLY" ||
			study.modality === "OBJ" ||
			(study.previewUrl && is3DScanUrl(study.previewUrl)) ||
			(study.viewerUrl && is3DScanUrl(study.viewerUrl)) ||
			/\.(stl|ply|obj)($|[?#])/i.test(study.title || "")
		);
		if (is3DScan && onOpenScan3d) {
			onOpenScan3d(study);
			return;
		}
		const isCbct = study.kind === "cbct" || (study.sliceCount && study.sliceCount > 1);
		if (isCbct && onOpenStudio) onOpenStudio(study);
		else onOpenViewer?.(study);
	};

	const activeStudy = useMemo(() => studies.find((s) => s.id === activeStudyId) || null, [studies, activeStudyId]);

	return {
		activeStudyId,
		cardWidth,
		setCardWidth,
		selectedModalityFilter,
		setSelectedModalityFilter,
		selectedDateFilter,
		setSelectedDateFilter,
		selectedDatePreset,
		setSelectedDatePreset,
		selectedToothFilter,
		setSelectedToothFilter,
		filteredStudies,
		groupedStudies,
		availableDates,
		availableTeeth,
		handleCardClick,
		handleCardDoubleClick,
		activeStudy,
	};
}
