import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { resolveCalibratedPixelSpacing, type ViewerPoint2D } from "../dentalViewerMath.js";
import type { RadiologyFilmstripItem } from "../RadiologyFilmstripDock.js";
import { DEFAULT_QUICK_FILTERS_STATE, type RadiologyQuickFilterState } from "../RadiologyQuickFiltersPanel.js";
import { teardownViewportCanvases } from "../../../utils/viewportTeardownHelper.js";
import type { RadiologyStudy } from "../types.js";
import type { SensorStudyViewerProps, ViewerTool, SensorViewerState } from "./types.js";
import { useSensorViewerMeasurements } from "./useSensorViewerMeasurements.js";
import { useSensorViewerGestures } from "./useSensorViewerGestures.js";
import {
	resolveActiveImageUrl, resolveEffectiveStudiesHistory,
	useSensorViewerFilterBuffer, useSensorViewerCanvasRenderer, useSensorViewerExportProtocol,
} from "./state/index.js";

export * from "./state/index.js";

export function useSensorViewerState(props: SensorStudyViewerProps): SensorViewerState {
	const {
		study, studiesHistory = [], initialImageUrl, patientName, patientBirthDate,
		patientAge, medicalCardNumber, toothFdiCode, onSelectStudy, onInsertToProtocol, onClose,
	} = props;

	const [activeStudy, setActiveStudy] = useState<RadiologyStudy | RadiologyFilmstripItem | null>(study || null);
	useEffect(() => { if (study) setActiveStudy(study); }, [study]);

	const activeImageUrl = useMemo(() => resolveActiveImageUrl(activeStudy, initialImageUrl, medicalCardNumber), [activeStudy, initialImageUrl, medicalCardNumber]);
	const effectiveTooth = activeStudy?.teethFdi?.[0] || toothFdiCode || "";
	const effectiveStudiesHistory = useMemo(() => resolveEffectiveStudiesHistory(studiesHistory, activeStudy, effectiveTooth, activeImageUrl), [studiesHistory, activeStudy, effectiveTooth, activeImageUrl]);

	const containerRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const rawImageRef = useRef<HTMLImageElement | null>(null);
	const filteredCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const protocolsDropdownRef = useRef<HTMLDivElement>(null);
	const uploadInputRef = useRef<HTMLInputElement | null>(null);

	const [zoom, setZoom] = useState(1.0);
	const [panX, setPanX] = useState(0);
	const [panY, setPanY] = useState(0);
	const [activeTool, setActiveTool] = useState<ViewerTool>("pan");
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [showConsultationSplit, setShowConsultationSplit] = useState(false);
	const [filters, setFilters] = useState<RadiologyQuickFilterState>(DEFAULT_QUICK_FILTERS_STATE);
	const [brightnessPct, setBrightnessPct] = useState(0);
	const [contrastPct, setContrastPct] = useState(0);
	const [isProtocolsOpen, setIsProtocolsOpen] = useState(false);
	const [magnifierPos, setMagnifierPos] = useState<ViewerPoint2D | null>(null);
	const [isMobileWlDrawerOpen, setIsMobileWlDrawerOpen] = useState(false);
	const [isMobileFilmstripDrawerOpen, setIsMobileFilmstripDrawerOpen] = useState(false);

	const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth <= 768 : false));
	useEffect(() => {
		const onResize = () => setIsMobile(window.innerWidth <= 768);
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);

	const calibratedMmPerPx = useMemo(() => resolveCalibratedPixelSpacing((activeStudy as any)?.apparatusModel || "vatech_ezsensor", 0.0350), [activeStudy]);
	const pixelPitchMicrons = useMemo(() => Number((calibratedMmPerPx * 1000.0).toFixed(1)), [calibratedMmPerPx]);

	const measurementsHook = useSensorViewerMeasurements({ calibratedMmPerPx });
	const gesturesHook = useSensorViewerGestures({
		canvasRef, rawImageRef, zoom, setZoom, panX, setPanX, panY, setPanY, activeTool,
		draftStart: measurementsHook.draftStart, setDraftStart: measurementsHook.setDraftStart,
		setDraftCurrent: measurementsHook.setDraftCurrent, setMagnifierPos, setMeasurements: measurementsHook.setMeasurements,
		setDraftCurvedPoints: measurementsHook.setDraftCurvedPoints, setDraftLesionPoints: measurementsHook.setDraftLesionPoints, calibratedMmPerPx,
	});

	const { updateFilteredBuffer } = useSensorViewerFilterBuffer(rawImageRef, filteredCanvasRef, filters, brightnessPct, contrastPct);
	const { renderScene } = useSensorViewerCanvasRenderer({
		containerRef, canvasRef, rawImageRef, filteredCanvasRef, activeImageUrl, zoom, panX, panY, activeTool, magnifierPos, calibratedMmPerPx,
		measurements: measurementsHook.measurements, draftStart: measurementsHook.draftStart, draftCurrent: measurementsHook.draftCurrent,
		curvedCanals: measurementsHook.curvedCanals, draftCurvedPoints: measurementsHook.draftCurvedPoints,
		lesionContours: measurementsHook.lesionContours, draftLesionPoints: measurementsHook.draftLesionPoints, updateFilteredBuffer,
	});

	useEffect(() => { updateFilteredBuffer(); renderScene(); }, [updateFilteredBuffer, renderScene]);

	const teardown = useCallback(() => {
		if (containerRef.current) teardownViewportCanvases(containerRef.current);
		if (filteredCanvasRef.current) { filteredCanvasRef.current.width = 0; filteredCanvasRef.current.height = 0; filteredCanvasRef.current = null; }
	}, []);

	const handleClose = useCallback(() => { teardown(); onClose?.(); }, [teardown, onClose]);
	useEffect(() => () => teardown(), [teardown]);

	const exportHook = useSensorViewerExportProtocol({
		toothFdiCode, onInsertToProtocol, rawImageRef, filteredCanvasRef,
		measurements: measurementsHook.measurements, curvedCanals: measurementsHook.curvedCanals,
		calibratedMmPerPx, activeStudy, patientName, patientAge, patientBirthDate,
		effectiveTooth, onSelectStudy, setActiveStudy, setIsProtocolsOpen,
	});

	return {
		activeStudy, setActiveStudy, activeImageUrl, effectiveStudiesHistory, effectiveTooth,
		containerRef, canvasRef, uploadInputRef, protocolsDropdownRef, zoom, setZoom, panX, setPanX, panY, setPanY,
		activeTool, setActiveTool, isFullscreen, setIsFullscreen, showConsultationSplit, setShowConsultationSplit,
		filters, setFilters, brightnessPct, setBrightnessPct, contrastPct, setContrastPct, isNormaApplied: exportHook.isNormaApplied,
		isProtocolsOpen, setIsProtocolsOpen, measurements: measurementsHook.measurements, draftStart: measurementsHook.draftStart,
		draftCurrent: measurementsHook.draftCurrent, curvedCanals: measurementsHook.curvedCanals, draftCurvedPoints: measurementsHook.draftCurvedPoints,
		lesionContours: measurementsHook.lesionContours, draftLesionPoints: measurementsHook.draftLesionPoints, measurementsCount: measurementsHook.measurementsCount,
		magnifierPos, isExporting: exportHook.isExporting, isMobile, isMobileWlDrawerOpen, setIsMobileWlDrawerOpen,
		isMobileFilmstripDrawerOpen, setIsMobileFilmstripDrawerOpen, calibratedMmPerPx, pixelPitchMicrons,
		handleResetView: () => { setZoom(1.0); setPanX(0); setPanY(0); },
		handleResetFilters: () => { setFilters(DEFAULT_QUICK_FILTERS_STATE); setBrightnessPct(0); setContrastPct(0); },
		handleInsertNorma: exportHook.handleInsertNorma, handleApplyStandardProtocol: exportHook.handleApplyStandardProtocol,
		handleFinishCurvedCanal: measurementsHook.handleFinishCurvedCanal, handleFinishLesionContour: measurementsHook.handleFinishLesionContour,
		handleClearMeasurements: measurementsHook.handleClearMeasurements, handleExportImage: exportHook.handleExportImage,
		handleProcessUploadedFile: exportHook.handleProcessUploadedFile, handleDirectFileUpload: exportHook.handleDirectFileUpload,
		handleClose, ...gesturesHook,
	};
}
