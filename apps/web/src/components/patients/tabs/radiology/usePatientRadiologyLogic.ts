import { useCallback, useEffect, useMemo, useState } from "react";
import type { ImagingStudy } from "@dental/shared";
import { showToast } from "../../../GlobalToast";
import { routeOpenCbctPopout } from "../../../../utils/runtimeRouter";
import { isDemoPatientId, isDemoShowcaseMode } from "../../../../lib/demoMode";
import { is3DScanUrl } from "../../../lab/LabAttachScanModal";
import {
	DEFAULT_TACTILE_FILTERS,
	type RadiologyTactileFilterState,
} from "../../../radiology/RadiologyPatientSearchModal";
import { DEMO_PATIENT_STUDIES } from "./demoPatientStudies";
import { filterAndSortStudies } from "./radiologyStudyFilters";

interface UsePatientRadiologyLogicParams {
	patientId?: string | null | undefined;
	patientName?: string | null | undefined;
	onOpenStudio?: ((study: ImagingStudy) => void) | undefined;
	onOpenViewer?: ((study: ImagingStudy) => void) | undefined;
	onOpenScan3d?: ((study: ImagingStudy) => void) | undefined;
}

export function usePatientRadiologyLogic({
	patientId, patientName, onOpenStudio, onOpenViewer, onOpenScan3d,
}: UsePatientRadiologyLogicParams) {
	const [studies, setStudies] = useState<ImagingStudy[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	const [activeScan3dStudy, setActiveScan3dStudy] = useState<ImagingStudy | null>(null);
	const [active2dStudy, setActive2dStudy] = useState<ImagingStudy | null>(null);
	const [showHotFolder, setShowHotFolder] = useState<boolean>(false);
	const [showCtSelector, setShowCtSelector] = useState<boolean>(false);
	const [activeControlStudy, setActiveControlStudy] = useState<ImagingStudy | null>(null);
	const [showTactileSearch, setShowTactileSearch] = useState<boolean>(false);
	const [tactileFilters, setTactileFilters] = useState<RadiologyTactileFilterState>(DEFAULT_TACTILE_FILTERS);
	const [activeStudyId, setActiveStudyId] = useState<string | null>(null);

	const isDemo = isDemoShowcaseMode() || isDemoPatientId(patientId) || isDemoPatientId(patientName);

	const loadPatientStudies = useCallback(async () => {
		if (!patientId) {
			setStudies(isDemo ? DEMO_PATIENT_STUDIES : []);
			setIsLoading(false);
			return;
		}
		setIsLoading(true);
		setError(null);
		try {
			const res = await fetch(`/api/imaging/studies?patientId=${encodeURIComponent(patientId)}`);
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data) && data.length > 0) setStudies(data);
				else if (isDemo) setStudies(DEMO_PATIENT_STUDIES);
				else setStudies([]);
			} else {
				if (isDemo) setStudies(DEMO_PATIENT_STUDIES);
				else setError("Не удалось загрузить снимки с сервера");
			}
		} catch {
			if (isDemo) setStudies(DEMO_PATIENT_STUDIES);
			else setError("Ошибка сетевого соединения с архивом снимков");
		} finally {
			setIsLoading(false);
		}
	}, [patientId, isDemo]);

	useEffect(() => { loadPatientStudies(); }, [loadPatientStudies]);

	const handleOpen3d = useCallback((study: ImagingStudy) => {
		if (onOpenStudio) onOpenStudio(study);
		else {
			routeOpenCbctPopout({
				patientId: (patientId || study.patientId) ?? undefined,
				patientName: (patientName || study.patientFullName) ?? undefined,
				studyId: study.id,
				mode: "mpr",
			});
			showToast("3D КЛКТ исследование открыто в автономном окне для второго монитора", "info");
		}
	}, [onOpenStudio, patientId, patientName]);

	const handleOpenScan3d = useCallback((study: ImagingStudy) => {
		if (onOpenScan3d) onOpenScan3d(study);
		else setActiveScan3dStudy(study);
	}, [onOpenScan3d]);

	const handleOpen2d = useCallback((study: ImagingStudy) => {
		const is3D = Boolean(
			(study.kind as string) === "scan_3d" ||
			study.modality === "STL" || study.modality === "PLY" || study.modality === "OBJ" ||
			(study.previewUrl && is3DScanUrl(study.previewUrl)) ||
			(study.viewerUrl && is3DScanUrl(study.viewerUrl)) ||
			/\.(stl|ply|obj)($|[?#])/i.test(study.title || "")
		);
		if (is3D) { handleOpenScan3d(study); return; }
		if (onOpenViewer) onOpenViewer(study);
		else setActive2dStudy(study);
	}, [onOpenViewer, handleOpenScan3d]);

	const handleStudyUpdated = useCallback((updated: ImagingStudy) => {
		setStudies((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
	}, []);

	const { sortedStudies, filteredStudies } = useMemo(
		() => filterAndSortStudies(studies, tactileFilters),
		[studies, tactileFilters],
	);

	return {
		studies, sortedStudies, filteredStudies, isLoading, error, loadPatientStudies,
		activeScan3dStudy, setActiveScan3dStudy, active2dStudy, setActive2dStudy,
		showHotFolder, setShowHotFolder, showCtSelector, setShowCtSelector,
		activeControlStudy, setActiveControlStudy, showTactileSearch, setShowTactileSearch,
		tactileFilters, setTactileFilters, activeStudyId, setActiveStudyId,
		handleOpen3d, handleOpenScan3d, handleOpen2d, handleStudyUpdated,
	};
}
