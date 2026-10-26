/**
 * useCbctStudioLayoutState.ts — Состояние раскладок, полноэкранного режима и адаптива студии КЛКТ (Мандат 8b).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { CbctViewportType } from "../../cbctMprMath";
import type { StudioMode, ViewLayoutMode } from "../../mpr/cbctStudioTypes";
import { parseCbctStudioRoute } from "../../../../utils/runtimeRouter";
import type { CbctStandaloneStudioViewProps } from "../types";

export function useCbctStudioLayoutState(props: CbctStandaloneStudioViewProps) {
	const routeParams = useMemo(() => parseCbctStudioRoute(), []);
	const effectiveStudyId = props.studyId || routeParams.studyId;
	const effectivePatientId = props.patientId || routeParams.patientId || "demo_cbct_patient";
	const effectivePatientName = props.patientName || routeParams.patientName || "3D КЛКТ исследование";
	const effectiveInitialMode = (props.initialMode || props.initialStudioMode || (routeParams.mode as StudioMode) || "diagnostic") as StudioMode;

	const modalId = "cbct-standalone-studio";
	const containerRef = useRef<HTMLDivElement | null>(null);
	const studioMenuRef = useRef<HTMLDivElement | null>(null);

	const [studioMode, setStudioMode] = useState<StudioMode>(effectiveInitialMode);
	const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
	const [viewLayout, setViewLayout] = useState<ViewLayoutMode>("quad_view");
	const [maximizedViewport, setMaximizedViewport] = useState<CbctViewportType | null>(null);
	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
	const [isStudioMenuOpen, setIsStudioMenuOpen] = useState<boolean>(false);
	const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() => {
		if (typeof window !== "undefined") return window.innerWidth < 768;
		return false;
	});

	useEffect(() => {
		const handleResize = () => {
			if (typeof window !== "undefined") setIsMobileScreen(window.innerWidth < 768);
		};
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	const handleToggleFullscreenModal = () => setIsFullscreen((prev) => !prev);

	return {
		modalId,
		effectiveStudyId,
		effectivePatientId,
		effectivePatientName,
		studioMode,
		setStudioMode,
		isSidebarOpen,
		setIsSidebarOpen,
		viewLayout,
		setViewLayout,
		maximizedViewport,
		setMaximizedViewport,
		isFullscreen,
		handleToggleFullscreenModal,
		isStudioMenuOpen,
		setIsStudioMenuOpen,
		studioMenuRef,
		isMobileScreen,
		containerRef,
	};
}
