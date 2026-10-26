/**
 * useRadiologyArchiveLogic.ts — Логика фильтрации и автопривязки картотеки снимков (Мандат 8b).
 */

import { useMemo, useState } from "react";
import type { ImagingStudy } from "@dental/shared";
import { isDemoShowcaseMode } from "../../../../lib/demoMode";
import { DEMO_ARCHIVE_STUDIES } from "../demoArchiveStudies";
import type { ArchiveBindingFilter, ArchiveModalityFilter } from "./RadiologyArchiveTypes";

export function useRadiologyArchiveLogic(initialStudies?: ImagingStudy[], initialLoading?: boolean) {
	const [studies, setStudies] = useState<ImagingStudy[]>(() =>
		initialStudies ?? (isDemoShowcaseMode() ? DEMO_ARCHIVE_STUDIES : []),
	);
	const [isLoading, setIsLoading] = useState<boolean>(() => initialLoading ?? false);
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [modalityFilter, setModalityFilter] = useState<ArchiveModalityFilter>("all");
	const [bindingFilter, setBindingFilter] = useState<ArchiveBindingFilter>("all");
	const [activeControlStudy, setActiveControlStudy] = useState<ImagingStudy | null>(null);

	const filteredStudies = useMemo(() => {
		return studies.filter((study) => {
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const patientName = study.patientFullName || study.dicomPatientName || "";
				const matchName = patientName.toLowerCase().includes(q);
				const matchId = study.id.toLowerCase().includes(q);
				if (!matchName && !matchId) return false;
			}
			if (modalityFilter === "cbct" && study.modality !== "CT") return false;
			if (modalityFilter === "opg" && study.modality !== "DX") return false;
			if (bindingFilter === "bound" && !study.patientId) return false;
			if (bindingFilter === "unassigned" && study.patientId) return false;
			return true;
		});
	}, [studies, searchQuery, modalityFilter, bindingFilter]);

	return {
		studies,
		setStudies,
		isLoading,
		setIsLoading,
		searchQuery,
		setSearchQuery,
		modalityFilter,
		setModalityFilter,
		bindingFilter,
		setBindingFilter,
		activeControlStudy,
		setActiveControlStudy,
		filteredStudies,
	};
}
