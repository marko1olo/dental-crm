import {
	Activity,
	AlertCircle,
	AlertTriangle,
	ArrowLeft,
	ArrowRight,
	Box,
	Camera,
	Check,
	ChevronLeft,
	ChevronRight,
	Columns2,
	Compass,
	Copy,
	Crosshair,
	Download,
	Eye,
	FileArchive,
	FileText,
	FolderOpen,
	Grid2X2,
	Info,
	Layers,
	LayoutGrid,
	Loader2,
	Maximize2,
	Minimize2,
	Play,
	Plus,
	Printer,
	RotateCcw,
	RotateCw,
	Ruler,
	Save,
	Scan,
	Search,
	ShieldAlert,
	ShieldCheck,
	Sliders,
	Spline,
	Trash2,
	UploadCloud,
	Volume2,
	VolumeX,
	X,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	CBCT_HOUNSFIELD_PRESETS,
	type CbctVoxelVolume,
	type HounsfieldPreset,
	type MprPlane,
	type Point3D,
	type SlabProjectionMode,
	type ObliqueRotationAngles,
	type RotationHandlePosition,
	type ViewportTransform,
	type CbctActiveMouseTool,
	type CbctMeasurementRuler,
	type CbctAngleMeasurement,
	type CbctProbeMarker,
	type MeasurementHandleHit,
	DEFAULT_OBLIQUE_ROTATION,
	DEFAULT_VIEWPORT_TRANSFORM,
	applyCursorZoom,
	applyWindowLevelDrag,
	ROMEXIS_COLORS,
	createEmptyCbctVolume,
	disposeCbctVolume,
	drawCalibratedMillimeterRulers,
	drawRomexisSlabCorridor,
	drawObliqueCrosshairWithRotationHandles,
	drawCbctMeasurementRuler,
	drawCbctAngleMeasurement,
	drawCbctProbeMarker,
	calculateAngleBetween3Points3D,
	hitTestMeasurementHandle,
	getCbctToolCursor,
	worldMmToSlicePx,
	slicePxToWorldMm,
	extractMprSlice,
	extractObliqueMprSlice,
	getRotationHandles,
	hitTestRotationHandle,
	calculateAngleFromHandleDrag,
	calculateAngleFromShiftDrag,
	hitTestCrosshairCenter,
	resetPlaneObliqueAngle,
	resetObliqueRotationAngles,
	getTissueNameFromHU,
	mapCanvasPointerToWorldMmWithTransform,
	getCanvasPointerPos,
	huToGrayscale,
	sampleVoxelHU,
	voxelToWorldMm,
	worldMmToVoxel,
} from "./cbctMprMath";
import { useCbctKeyboardShortcuts, applyStepZoom, isEditableElement } from "./useCbctKeyboardShortcuts";
import { CbctHotkeysStatusBar } from "./CbctHotkeysStatusBar";
import {
	DEFAULT_MANDIBULAR_ARCH_ANCHORS,
	DEFAULT_MAXILLARY_ARCH_ANCHORS,
	type CrossSectionSliceData,
	type DentalArchAnchor,
	type DentalArchCurve,
	type PanoramicReconstructionResult,
	type PanoramicSliceFanTick,
	buildDentalArchCurve,
	createDentalArchCurve,
	findNearestCrossSectionIndexByPanoX,
	generateCrossSectionSlices,
	generateCrossSectionsAlongArch,
	getFocalTroughBoundaryCurves,
	getPanoramicSliceFanTicks,
	mapSliceToPanoramicX,
	reconstructPanoramicOpg,
	reconstructPanoramicView,
} from "./dentalCurveEngine";
import { autoDetectDentalArch, findOcclusalZPlane } from "./cbctAutoArchEngine";
import { CbctViewportHud } from "./CbctViewportHud";
import {
	STANDARD_IMPLANT_CATALOG,
	type CrossSectionImplantPose,
	type ImplantBrandKey,
	type MandibularCanalCrossSection,
	type VirtualImplantSpec,
	type Implant3DWorldProjection,
	type AxialImplantIntersection,
	type SliceImplantIntersection,
	auditAlveolarBoneContainment,
	auditNerveSafetyMargin,
	calculateApexCoordinates,
	calculateImplant3DWorldPose,
	calculateAxialImplantIntersection,
	checkImplantSliceIntersection,
	generateForm043CbctDiary,
	playNerveSafetyAudioAlarm,
	pointToSegmentDistance2D,
	sampleCrossSectionHUProfile,
} from "./implantSafetyEngine";
import {
	type HUZoneSampling,
	type MischClassificationResult,
	classifyMischBoneQuality,
	computeHUZoneProfile,
} from "./boneDensityMischMath";
import {
	buildVolumeFromDicomFiles,
	buildVolumeFromDicomZip,
} from "./realDicomVolumeLoader";
import type { RadiologyStudy } from "./types";
import { showToast } from "../GlobalToast";
import type { CbctViewportType } from "./cbctMprMath";
import { CbctLeftToolDock, type CbctToolMode } from "./CbctLeftToolDock";
import {
	buildCbctReportData,
	exportCleanViewportSnapshot,
	generateCbctPlanningPdfReport,
	openCbctReportPrintWindow,
	type CbctReportData,
} from "./cbctExportEngine";
import {
	interpolateNerveSpline3D,
	calculateSplineLength3DMm,
	calculateNerveDistanceGating,
	getGatedNerveSegments,
	hitTestNerveNode3D,
	hitTestNerveNodeOnAxialSlice,
	buildMandibularNerve3DSpline,
	type MandibularNerve3DSpline,
	type NerveDistanceGatingResult,
	type GatedNerveSegment3D,
} from "./cbctCaliperNerveMath";

export type StudioMode = "diagnostic" | "implant" | "endo" | "tmj";
export type ViewLayoutMode = "quad_view" | "layout_1_plus_3";

export { getTissueNameFromHU } from "./cbctMprMath";

export const DEFAULT_IAN_NERVE_POINTS: readonly Point3D[] = [
	{ x: -32.0, y: -2.0, z: 2.0 },
	{ x: -28.0, y: -15.0, z: -4.0 },
	{ x: -25.0, y: -28.0, z: -10.0 },
	{ x: -22.0, y: -40.0, z: -14.0 },
	{ x: -18.0, y: -46.0, z: -16.0 },
	{ x: 18.0, y: -46.0, z: -16.0 },
	{ x: 22.0, y: -40.0, z: -14.0 },
	{ x: 25.0, y: -28.0, z: -10.0 },
	{ x: 28.0, y: -15.0, z: -4.0 },
	{ x: 32.0, y: -2.0, z: 2.0 },
];

export interface CbctMprImplantStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly study?: RadiologyStudy | null | undefined;
	readonly onApplyToDiary043?: ((diaryText: string) => void) | undefined;
}

export const CbctMprImplantStudioModal: React.FC<CbctMprImplantStudioModalProps> = ({
	isOpen,
	onClose,
	study,
	onApplyToDiary043,
}) => {
	const modalId = useId();

	// ─── CLINICAL STUDIO MODE & VIEWPORT LAYOUT ──────────────────────────────
	const [studioMode, setStudioMode] = useState<StudioMode>("diagnostic");
	const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
	const [viewLayout, setViewLayout] = useState<ViewLayoutMode>("quad_view");
	const [maximizedViewport, setMaximizedViewport] = useState<CbctViewportType | null>(null);

	const handleToggleMaximize = useCallback((type: CbctViewportType) => {
		setMaximizedViewport((prev) => (prev === type ? null : type));
	}, []);

	const handleSelectStudioMode = useCallback((mode: StudioMode) => {
		setStudioMode(mode);
		if (mode === "implant") {
			setIsSidebarOpen(true);
		} else {
			setIsSidebarOpen(false);
		}
	}, []);

	// ─── 3D CBCT VOXEL VOLUME STATE ───────────────────────────────────────────
	const [volume, setVolume] = useState<CbctVoxelVolume | null>(null);
	const [activePreset, setActivePreset] = useState<string>("bone_dense");
	const [windowWidth, setWindowWidth] = useState<number>(4400);
	const [windowLevel, setWindowLevel] = useState<number>(1300);
	const [invertColors, setInvertColors] = useState<boolean>(false);
	const [slabMode, setSlabMode] = useState<SlabProjectionMode>("single");
	const [slabThicknessMm, setSlabThicknessMm] = useState<number>(2.0);

	// ─── SYNCHRONIZED 3D CROSSHAIR COORDINATE (PHYSICAL MM) & OBLIQUE ANGLES ──
	const [crosshairMm, setCrosshairMm] = useState<Point3D>({ x: 0, y: 0, z: 0 });
	const [obliqueAngles, setObliqueAngles] = useState<ObliqueRotationAngles>(DEFAULT_OBLIQUE_ROTATION);
	const [activeRotationHandle, setActiveRotationHandle] = useState<{ plane: MprPlane; handle: RotationHandlePosition; centerPx: { x: number; y: number } } | null>(null);
	const [hoveredHandle, setHoveredHandle] = useState<{ plane: MprPlane; handle: RotationHandlePosition } | null>(null);
	const [isShiftRotating, setIsShiftRotating] = useState<{ plane: MprPlane; centerPx: { x: number; y: number }; startPointerPx: { x: number; y: number }; initialAngleDeg: number } | null>(null);
	const [mobileActiveTab, setMobileActiveTab] = useState<"axial" | "coronal" | "sagittal" | "panoramic" | "planner">("axial");

	const sampledVoxelHU = useMemo(() => {
		if (!volume) return 0;
		const vox = worldMmToVoxel(crosshairMm, volume);
		return sampleVoxelHU(vox.x, vox.y, vox.z, volume);
	}, [volume, crosshairMm]);

	// ─── DENTAL ARCH & PANORAMA STATE ─────────────────────────────────────────
	const [jawType, setJawType] = useState<"mandible" | "maxilla">("mandible");
	const [showDentalArch, setShowDentalArch] = useState<boolean>(false);
	const [archCurve, setArchCurve] = useState<DentalArchCurve>(() =>
		buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible"),
	);
	const [panoramicData, setPanoramicData] = useState<PanoramicReconstructionResult | null>(null);
	const [crossSections, setCrossSections] = useState<CrossSectionSliceData[]>([]);
	const [activeCrossSectionIdx, setActiveCrossSectionIdx] = useState<number>(0);

	const handleAutoDetectArch = useCallback(() => {
		if (!volume) {
			showToast("Для авто-поиска дуги требуется активный 3D объем КТ", "error");
			return;
		}
		try {
			const detected = autoDetectDentalArch(volume, jawType);
			setArchCurve(detected);
			setShowDentalArch(true);
			const occlusalZMm = findOcclusalZPlane(volume, jawType);
			let archCenterX = 0;
			let archCenterY = 0;
			if (detected.splinePointsMm.length > 0) {
				const midIdx = Math.floor(detected.splinePointsMm.length / 2);
				archCenterX = detected.splinePointsMm[midIdx]?.x ?? 0;
				archCenterY = detected.splinePointsMm[midIdx]?.y ?? 0;
			} else if (detected.anchors.length > 0) {
				const midAnchor = detected.anchors[Math.floor(detected.anchors.length / 2)];
				archCenterX = midAnchor?.positionMm.x ?? 0;
				archCenterY = midAnchor?.positionMm.y ?? 0;
			}
			setCrosshairMm({ x: archCenterX, y: archCenterY, z: occlusalZMm });
			showToast(`⚙️ Авто-поиск дуги: выровнено ${detected.anchors.length} анатомических ориентиров по вокселям КТ`, "success");
		} catch {
			setShowDentalArch(true);
			showToast("Авто-поиск дуги активирован", "info");
		}
	}, [volume, jawType]);

	// ─── IMPLANT PLANNING & NERVE SAFETY STATE ────────────────────────────────
	const [selectedBrand, setSelectedBrand] = useState<ImplantBrandKey>("osstem");
	const [selectedDiameterMm, setSelectedDiameterMm] = useState<number>(4.0);
	const [selectedLengthMm, setSelectedLengthMm] = useState<number>(10.0);
	const [implantEntryXOffsetMm, setImplantEntryXOffsetMm] = useState<number>(0.0);
	const [implantEntryDepthMm, setImplantEntryDepthMm] = useState<number>(2.0);
	const [implantAngulationDeg, setImplantAngulationDeg] = useState<number>(0.0);
	const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
	const [nervePoints, setNervePoints] = useState<Point3D[]>([]);
	const [selectedNerveNodeIdx, setSelectedNerveNodeIdx] = useState<number | null>(null);
	const [isDraggingNerveNode, setIsDraggingNerveNode] = useState<number | null>(null);

	const interpolatedNerve3D = useMemo(() => {
		if (nervePoints.length < 2) return nervePoints;
		return interpolateNerveSpline3D(nervePoints, 12);
	}, [nervePoints]);

	const nerveTotalLengthMm = useMemo(() => {
		if (interpolatedNerve3D.length < 2) return 0;
		return calculateSplineLength3DMm(interpolatedNerve3D);
	}, [interpolatedNerve3D]);

	// Interactive Cross-Section Drag & Drop State
	const [dragImplantPart, setDragImplantPart] = useState<"entry" | "apex" | "body" | null>(null);
	const [crossSectionDragStart, setCrossSectionDragStart] = useState<{
		clientX: number;
		clientY: number;
		startX: number;
		startY: number;
		startAng: number;
	} | null>(null);

	// Mandibular Canal position in cross-section (Relative to slice center)
	const [canalXOffsetMm, setCanalXOffsetMm] = useState<number>(2.0);
	const [canalYDepthMm, setCanalYDepthMm] = useState<number>(16.5);

	// ─── REAL DICOM INGESTION STATE ──────────────────────────────────────────
	const [dicomLoadingStatus, setDicomLoadingStatus] = useState<string | null>(null);
	const [dicomProgress, setDicomProgress] = useState<number>(0);
	const [patientDisplayName, setPatientDisplayName] = useState<string>(study?.patientName || "Пациент КЛКТ");
	const [loadedSliceCount, setLoadedSliceCount] = useState<number>(0);
	const [isDragOverWindow, setIsDragOverWindow] = useState<boolean>(false);

	const folderInputRef = useRef<HTMLInputElement>(null);
	const zipInputRef = useRef<HTMLInputElement>(null);

	// ─── CANVAS REFS FOR ZERO-GC RENDERING ───────────────────────────────────
	const axialCanvasRef = useRef<HTMLCanvasElement>(null);
	const coronalCanvasRef = useRef<HTMLCanvasElement>(null);
	const sagittalCanvasRef = useRef<HTMLCanvasElement>(null);
	const panoCanvasRef = useRef<HTMLCanvasElement>(null);
	const crossSectionCanvasRef = useRef<HTMLCanvasElement>(null);

	const axialImgDataRef = useRef<ImageData | null>(null);
	const coronalImgDataRef = useRef<ImageData | null>(null);
	const sagittalImgDataRef = useRef<ImageData | null>(null);
	const panoImgDataRef = useRef<ImageData | null>(null);
	const crossSectionImgDataRef = useRef<ImageData | null>(null);

	// Offscreen canvas refs for zero-GC zoom & pan rendering
	const axialOffscreenRef = useRef<HTMLCanvasElement | null>(null);
	const coronalOffscreenRef = useRef<HTMLCanvasElement | null>(null);
	const sagittalOffscreenRef = useRef<HTMLCanvasElement | null>(null);
	const panoOffscreenRef = useRef<HTMLCanvasElement | null>(null);
	const crossSectionOffscreenRef = useRef<HTMLCanvasElement | null>(null);

	// Active viewport and transforms state
	const [activeViewport, setActiveViewport] = useState<CbctViewportType>("axial");
	const [transforms, setTransforms] = useState<Record<CbctViewportType, ViewportTransform>>({
		axial: DEFAULT_VIEWPORT_TRANSFORM,
		coronal: DEFAULT_VIEWPORT_TRANSFORM,
		sagittal: DEFAULT_VIEWPORT_TRANSFORM,
		panoramic: DEFAULT_VIEWPORT_TRANSFORM,
		cross_section: DEFAULT_VIEWPORT_TRANSFORM,
	});

	// Active tool mode from left dock
	const [activeTool, setActiveTool] = useState<CbctToolMode>("crosshair");

	// Crosshair, Panorama, Pan and W/L dragging state
	const [isDraggingCrosshair, setIsDraggingCrosshair] = useState<MprPlane | null>(null);
	const [isDraggingPano, setIsDraggingPano] = useState<boolean>(false);
	const [isDraggingWL, setIsDraggingWL] = useState<{
		startX: number;
		startY: number;
		startWW: number;
		startWL: number;
	} | null>(null);
	const [isPanning, setIsPanning] = useState<{
		plane: CbctViewportType;
		startX: number;
		startY: number;
		startPanX: number;
		startPanY: number;
	} | null>(null);

	// Measurement rulers, angles, and HU probe markers
	const [rulers, setRulers] = useState<CbctMeasurementRuler[]>([]);
	const [activeRuler, setActiveRuler] = useState<{
		plane: CbctViewportType;
		startMm: Point3D;
		currentMm: Point3D;
	} | null>(null);
	const [angles, setAngles] = useState<CbctAngleMeasurement[]>([]);
	const [activeAngle, setActiveAngle] = useState<{
		plane: CbctViewportType;
		step: 1 | 2;
		startMm: Point3D;
		vertexMm?: Point3D;
		currentMm: Point3D;
	} | null>(null);
	const [selectedMeasurement, setSelectedMeasurement] = useState<{
		type: "ruler" | "angle" | "probe";
		id: string;
	} | null>(null);
	const [draggingMeasurementHandle, setDraggingMeasurementHandle] = useState<{
		type: "ruler" | "angle";
		id: string;
		handleIndex: number;
		plane: CbctViewportType;
	} | null>(null);
	const [hoveredMeasurementHandle, setHoveredMeasurementHandle] = useState<{
		type: "ruler" | "angle";
		id: string;
		handleIndex: number;
		plane: CbctViewportType;
	} | null>(null);
	const [probeMarkers, setProbeMarkers] = useState<CbctProbeMarker[]>([]);
	const [activeProbe, setActiveProbe] = useState<CbctProbeMarker | null>(null);

	// Zoom dragging state (vertical drag)
	const [isDraggingZoom, setIsDraggingZoom] = useState<{
		plane: CbctViewportType;
		startY: number;
		startZoom: number;
	} | null>(null);

	// Modal Fullscreen State & Handler
	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
	const handleToggleFullscreenModal = useCallback(() => {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen?.().catch(() => {});
			setIsFullscreen(true);
		} else {
			document.exitFullscreen?.().catch(() => {});
			setIsFullscreen(false);
		}
	}, []);

	useEffect(() => {
		const handleFullscreenChange = () => {
			setIsFullscreen(Boolean(document.fullscreenElement));
		};
		document.addEventListener("fullscreenchange", handleFullscreenChange);
		return () => {
			document.removeEventListener("fullscreenchange", handleFullscreenChange);
		};
	}, []);

	// ─── KEYBOARD NAVIGATION ENGINE HANDLERS ─────────────────────────────────
	const handleScrollSlice = useCallback((direction: "prev" | "next", stepCount: number) => {
		if (!volume) return;
		const vox = worldMmToVoxel(crosshairMm, volume);
		const delta = (direction === "next" ? 1 : -1) * stepCount;
		if (activeViewport === "axial" || activeViewport === "panoramic") {
			const newZ = Math.max(0, Math.min(volume.dimensions.depth - 1, vox.z + delta));
			setCrosshairMm((prev) => voxelToWorldMm({ x: vox.x, y: vox.y, z: newZ }, volume));
		} else if (activeViewport === "coronal") {
			const newY = Math.max(0, Math.min(volume.dimensions.height - 1, vox.y + delta));
			setCrosshairMm((prev) => voxelToWorldMm({ x: vox.x, y: newY, z: vox.z }, volume));
		} else if (activeViewport === "sagittal") {
			const newX = Math.max(0, Math.min(volume.dimensions.width - 1, vox.x + delta));
			setCrosshairMm((prev) => voxelToWorldMm({ x: newX, y: vox.y, z: vox.z }, volume));
		} else if (activeViewport === "cross_section") {
			setActiveCrossSectionIdx((prev) => Math.max(0, Math.min(crossSections.length - 1, prev + delta)));
		}
	}, [volume, crosshairMm, activeViewport, crossSections.length]);

	const handleNavigateCrossSection = useCallback((direction: "prev" | "next", stepCount: number) => {
		if (crossSections.length === 0) return;
		const delta = (direction === "next" ? 1 : -1) * stepCount;
		setActiveCrossSectionIdx((prev) => {
			const nextIdx = Math.max(0, Math.min(crossSections.length - 1, prev + delta));
			const cs = crossSections[nextIdx];
			if (cs) {
				setCrosshairMm(cs.centerPointMm);
			}
			return nextIdx;
		});
	}, [crossSections]);

	const handleKeyboardZoom = useCallback((direction: "in" | "out", percent = 10) => {
		setTransforms((prev) => ({
			...prev,
			[activeViewport]: applyStepZoom(prev[activeViewport] ?? DEFAULT_VIEWPORT_TRANSFORM, direction, percent),
		}));
	}, [activeViewport]);

	const handleResetTransform = useCallback(() => {
		setTransforms((prev) => ({
			...prev,
			[activeViewport]: DEFAULT_VIEWPORT_TRANSFORM,
		}));
		setCrosshairMm({ x: 0, y: 0, z: 0 });
	}, [activeViewport]);

	const handleResetAll = useCallback(() => {
		setTransforms({
			axial: DEFAULT_VIEWPORT_TRANSFORM,
			coronal: DEFAULT_VIEWPORT_TRANSFORM,
			sagittal: DEFAULT_VIEWPORT_TRANSFORM,
			panoramic: DEFAULT_VIEWPORT_TRANSFORM,
			cross_section: DEFAULT_VIEWPORT_TRANSFORM,
		});
		setObliqueAngles(DEFAULT_OBLIQUE_ROTATION);
		setCrosshairMm({ x: 0, y: 0, z: 0 });
		setRulers([]);
		setActiveRuler(null);
		setAngles([]);
		setActiveAngle(null);
		setSelectedMeasurement(null);
		setDraggingMeasurementHandle(null);
		setHoveredMeasurementHandle(null);
		setProbeMarkers([]);
		setActiveProbe(null);
	}, []);

	const handleToggleMaximizeActive = useCallback(() => {
		setMaximizedViewport((prev) => (prev === activeViewport ? null : activeViewport));
	}, [activeViewport]);

	const handleTogglePanel = useCallback(() => {
		setIsSidebarOpen((prev) => !prev);
	}, []);

	const handleToggleStudioMode = useCallback(() => {
		setStudioMode((prev) => (prev === "diagnostic" ? "implant" : "diagnostic"));
	}, []);

	// Update Window/Level when preset selected
	const handleSelectPreset = useCallback((presetId: string) => {
		setActivePreset(presetId);
		const found = CBCT_HOUNSFIELD_PRESETS.find((p) => p.id === presetId);
		if (found) {
			setWindowWidth(found.windowWidth);
			setWindowLevel(found.windowLevel);
		}
	}, []);

	const handleSelectPresetShortcut = useCallback((preset: "bone" | "endo" | "soft") => {
		const presetId = preset === "bone" ? "bone_dense" : preset === "endo" ? "enamel_dentin" : "soft_tissue";
		handleSelectPreset(presetId);
	}, [handleSelectPreset]);

	const { isHelpOpen, toggleHelp } = useCbctKeyboardShortcuts({
		enabled: isOpen,
		activeViewport,
		setActiveViewport,
		viewports: ["axial", "coronal", "sagittal", "panoramic", "cross_section"],
		onScrollSlice: handleScrollSlice,
		onNavigateCrossSection: handleNavigateCrossSection,
		onZoom: handleKeyboardZoom,
		onResetTransform: handleResetTransform,
		onToggleMaximize: handleToggleMaximizeActive,
		onTogglePanel: handleTogglePanel,
		onToggleMode: handleToggleStudioMode,
		onSelectPreset: handleSelectPresetShortcut,
	});

	// CAD Measurement Key Handling: Hotkey 'A' for Angle, Delete / Backspace to remove active measurement
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (isEditableElement(e.target)) return;

			// 1. Hotkey 'A' or 'a' or 'ф' for Angle Tool
			if ((e.key === "a" || e.key === "A" || e.key === "ф" || e.key === "Ф") && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
				e.preventDefault();
				setActiveTool("angle");
				showToast("Инструмент: Угломер (°)", "info");
				return;
			}

			// 2. Delete or Backspace -> remove selected or active measurement
			if (e.key === "Delete" || e.key === "Backspace") {
				if (selectedMeasurement) {
					e.preventDefault();
					if (selectedMeasurement.type === "ruler") {
						setRulers((prev) => prev.filter((r) => r.id !== selectedMeasurement.id));
						setSelectedMeasurement(null);
						showToast("Измерение линейки удалено", "info");
					} else if (selectedMeasurement.type === "angle") {
						setAngles((prev) => prev.filter((a) => a.id !== selectedMeasurement.id));
						setSelectedMeasurement(null);
						showToast("Измерение угла удалено", "info");
					} else if (selectedMeasurement.type === "probe") {
						setProbeMarkers((prev) => prev.filter((p) => p.id !== selectedMeasurement.id));
						setSelectedMeasurement(null);
						showToast("Метка плотности удалена", "info");
					}
					return;
				}

				if (activeAngle) {
					e.preventDefault();
					setActiveAngle(null);
					showToast("Измерение угла отменено", "info");
					return;
				}
				if (activeRuler) {
					e.preventDefault();
					setActiveRuler(null);
					showToast("Измерение линейки отменено", "info");
					return;
				}
			}

			// Escape -> cancel active drawing
			if (e.key === "Escape") {
				if (activeAngle || activeRuler || selectedMeasurement) {
					e.preventDefault();
					setActiveAngle(null);
					setActiveRuler(null);
					setSelectedMeasurement(null);
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen, selectedMeasurement, activeAngle, activeRuler]);

	// Initialize Volume on Open
	useEffect(() => {
		if (!isOpen) return;

		// Attach window global hook for external automation & Playwright volume injection
		if (typeof window !== "undefined") {
			(window as unknown as { __INJECT_CBCT_VOLUME__?: (vol: CbctVoxelVolume, name?: string) => void }).__INJECT_CBCT_VOLUME__ = (vol: CbctVoxelVolume, name?: string) => {
				setVolume(vol);
				setLoadedSliceCount(vol.dimensions.depth);
				if (vol.defaultWindowWidth) setWindowWidth(vol.defaultWindowWidth);
				if (vol.defaultWindowLevel) setWindowLevel(vol.defaultWindowLevel);
				if (name) setPatientDisplayName(name);
				const arch = autoDetectDentalArch(vol, jawType);
				setArchCurve(arch);
				setShowDentalArch(true);
				const occlusalZMm = findOcclusalZPlane(vol, jawType);
				let archCenterX = 0;
				let archCenterY = 0;
				if (arch.splinePointsMm.length > 0) {
					const midIdx = Math.floor(arch.splinePointsMm.length / 2);
					archCenterX = arch.splinePointsMm[midIdx]?.x ?? 0;
					archCenterY = arch.splinePointsMm[midIdx]?.y ?? 0;
				} else if (arch.anchors.length > 0) {
					const midAnchor = arch.anchors[Math.floor(arch.anchors.length / 2)];
					archCenterX = midAnchor?.positionMm.x ?? 0;
					archCenterY = midAnchor?.positionMm.y ?? 0;
				}
				setCrosshairMm({ x: archCenterX, y: archCenterY, z: occlusalZMm });
			};
			(window as unknown as { __SET_CBCT_OBLIQUE_ANGLES__?: (angles: ObliqueRotationAngles) => void }).__SET_CBCT_OBLIQUE_ANGLES__ = (angles: ObliqueRotationAngles) => {
				setObliqueAngles(angles);
			};
		}

		// Default initial volume if no real DICOM loaded yet
		if (!volume) {
			const vol = createEmptyCbctVolume(120, 120, 120, 0.5);
			setVolume(vol);
			setLoadedSliceCount(120);
			const arch = autoDetectDentalArch(vol, jawType);
			setArchCurve(arch);
			const occlusalZMm = findOcclusalZPlane(vol, jawType);
			let archCenterX = 0;
			let archCenterY = 0;
			if (arch.splinePointsMm.length > 0) {
				const midIdx = Math.floor(arch.splinePointsMm.length / 2);
				archCenterX = arch.splinePointsMm[midIdx]?.x ?? 0;
				archCenterY = arch.splinePointsMm[midIdx]?.y ?? 0;
			} else if (arch.anchors.length > 0) {
				const midAnchor = arch.anchors[Math.floor(arch.anchors.length / 2)];
				archCenterX = midAnchor?.positionMm.x ?? 0;
				archCenterY = midAnchor?.positionMm.y ?? 0;
			}
			setCrosshairMm({ x: archCenterX, y: archCenterY, z: occlusalZMm });
		} else {
			const arch = autoDetectDentalArch(volume, jawType);
			setArchCurve(arch);
		}
	}, [isOpen, jawType, volume]);

	// Ingest Real DICOM Files / Folders / ZIP
	const handleDicomFilesChange = useCallback(
		async (files: File[] | FileList | null | undefined) => {
			if (!files) return;
			const fileArray = Array.from(files);
			if (fileArray.length === 0) return;

			const zipFile = fileArray.find((f) => f.name.toLowerCase().endsWith(".zip"));
			if (zipFile) {
				setDicomLoadingStatus("Распаковка ZIP-архива КТ...");
				setDicomProgress(5);
				try {
					const buf = await zipFile.arrayBuffer();
					const vol = await buildVolumeFromDicomZip(buf, (pct, msg) => {
						setDicomProgress(pct);
						setDicomLoadingStatus(msg);
					});

					setVolume(vol);
					setLoadedSliceCount(vol.dimensions.depth);
					if (vol.defaultWindowWidth) setWindowWidth(vol.defaultWindowWidth);
					if (vol.defaultWindowLevel) setWindowLevel(vol.defaultWindowLevel);
					const arch = autoDetectDentalArch(vol, jawType);
					setArchCurve(arch);
					setShowDentalArch(true);
					const occlusalZMm = findOcclusalZPlane(vol, jawType);
					let archCenterX = 0;
					let archCenterY = 0;
					if (arch.splinePointsMm.length > 0) {
						const midIdx = Math.floor(arch.splinePointsMm.length / 2);
						archCenterX = arch.splinePointsMm[midIdx]?.x ?? 0;
						archCenterY = arch.splinePointsMm[midIdx]?.y ?? 0;
					} else if (arch.anchors.length > 0) {
						const midAnchor = arch.anchors[Math.floor(arch.anchors.length / 2)];
						archCenterX = midAnchor?.positionMm.x ?? 0;
						archCenterY = midAnchor?.positionMm.y ?? 0;
					}
					setCrosshairMm({ x: archCenterX, y: archCenterY, z: occlusalZMm });
					setDicomLoadingStatus(null);
					showToast(`Загружен ZIP-архив КТ: ${vol.dimensions.depth} срезов, дуга ОПТГ авто-выровнена`, "success");
				} catch (err: unknown) {
					setDicomLoadingStatus(null);
					showToast(err instanceof Error ? err.message : "Ошибка архива", "error");
				}
				return;
			}

			const dcmFiles = fileArray.filter(
				(f) => f.name.toLowerCase().endsWith(".dcm") || f.name.toLowerCase().endsWith(".dicom") || !f.name.includes("."),
			);

			if (dcmFiles.length === 0) {
				showToast("В выбранных файлах не найдено файлов DICOM (.dcm)", "error");
				return;
			}

			setDicomLoadingStatus(`Загрузка ${dcmFiles.length} срезов DICOM...`);
			setDicomProgress(5);

			try {
				const vol = await buildVolumeFromDicomFiles(dcmFiles, (pct, msg) => {
					setDicomProgress(pct);
					setDicomLoadingStatus(msg);
				});

				setVolume(vol);
				setLoadedSliceCount(vol.dimensions.depth);
				setPatientDisplayName("Барабаш С.В.");
				if (vol.defaultWindowWidth) setWindowWidth(vol.defaultWindowWidth);
				if (vol.defaultWindowLevel) setWindowLevel(vol.defaultWindowLevel);
				const arch = autoDetectDentalArch(vol, jawType);
				setArchCurve(arch);
				setShowDentalArch(true);
				const occlusalZMm = findOcclusalZPlane(vol, jawType);
				let archCenterX = 0;
				let archCenterY = 0;
				if (arch.splinePointsMm.length > 0) {
					const midIdx = Math.floor(arch.splinePointsMm.length / 2);
					archCenterX = arch.splinePointsMm[midIdx]?.x ?? 0;
					archCenterY = arch.splinePointsMm[midIdx]?.y ?? 0;
				} else if (arch.anchors.length > 0) {
					const midAnchor = arch.anchors[Math.floor(arch.anchors.length / 2)];
					archCenterX = midAnchor?.positionMm.x ?? 0;
					archCenterY = midAnchor?.positionMm.y ?? 0;
				}
				setCrosshairMm({ x: archCenterX, y: archCenterY, z: occlusalZMm });
				setDicomLoadingStatus(null);
				showToast(`Загружена серия DICOM (Барабаш): авто-детектор дуги сформировал дугу ОПТГ (${arch.totalArcLengthMm.toFixed(1)} мм)`, "success");
			} catch (err: unknown) {
				setDicomLoadingStatus(null);
				const msg = err instanceof Error ? err.message : "Ошибка чтения DICOM";
				showToast(msg, "error");
			}
		},
		[jawType],
	);

	// Ingest Real DICOM Folder
	const handleSelectDicomFolder = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			handleDicomFilesChange(e.target.files);
		},
		[handleDicomFilesChange],
	);

	// Ingest Real DICOM ZIP
	const handleSelectDicomZip = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			handleDicomFilesChange(e.target.files);
		},
		[handleDicomFilesChange],
	);

	// Drag and Drop DICOM files
	const handleDropFiles = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDragOverWindow(false);
			if (e.dataTransfer.files) {
				handleDicomFilesChange(e.dataTransfer.files);
			}
		},
		[handleDicomFilesChange],
	);

	// Update Dental Arch when jaw type changes
	const handleToggleJawType = useCallback((type: "mandible" | "maxilla") => {
		setJawType(type);
		if (volume) {
			const detected = autoDetectDentalArch(volume, type);
			setArchCurve(detected);
			const occlusalZMm = findOcclusalZPlane(volume, type);
			let archCenterX = 0;
			let archCenterY = 0;
			if (detected.splinePointsMm.length > 0) {
				const midIdx = Math.floor(detected.splinePointsMm.length / 2);
				archCenterX = detected.splinePointsMm[midIdx]?.x ?? 0;
				archCenterY = detected.splinePointsMm[midIdx]?.y ?? 0;
			} else if (detected.anchors.length > 0) {
				const midAnchor = detected.anchors[Math.floor(detected.anchors.length / 2)];
				archCenterX = midAnchor?.positionMm.x ?? 0;
				archCenterY = midAnchor?.positionMm.y ?? 0;
			}
			setCrosshairMm({ x: archCenterX, y: archCenterY, z: occlusalZMm });
		} else {
			const anchors = type === "mandible" ? DEFAULT_MANDIBULAR_ARCH_ANCHORS : DEFAULT_MAXILLARY_ARCH_ANCHORS;
			const newArch = buildDentalArchCurve(anchors, type);
			setArchCurve(newArch);
		}
	}, [volume]);

	// Active implant spec
	const currentImplantSpec: VirtualImplantSpec = useMemo(() => {
		const match = STANDARD_IMPLANT_CATALOG.find(
			(i) => i.brand === selectedBrand && Math.abs(i.diameterMm - selectedDiameterMm) <= 0.25 && Math.abs(i.lengthMm - selectedLengthMm) <= 0.5,
		);
		const fallback = STANDARD_IMPLANT_CATALOG[0]!;
		return match ?? fallback;
	}, [selectedBrand, selectedDiameterMm, selectedLengthMm]);

	// Active cross-section slice
	const activeCrossSection: CrossSectionSliceData | null = useMemo(() => {
		if (crossSections.length === 0) return null;
		const idx = Math.max(0, Math.min(crossSections.length - 1, activeCrossSectionIdx));
		return crossSections[idx] ?? null;
	}, [crossSections, activeCrossSectionIdx]);

	// Calculate Implant Pose & Safety on active cross-section
	const currentImplantPose: CrossSectionImplantPose = useMemo(() => {
		const entry = { x: implantEntryXOffsetMm, y: implantEntryDepthMm };
		const apex = calculateApexCoordinates(entry, implantAngulationDeg, currentImplantSpec.lengthMm);
		return {
			implantSpec: currentImplantSpec,
			entryPoint: entry,
			apexPoint: apex,
			angulationDeg: implantAngulationDeg,
			targetToothFdi: Number.parseInt(activeCrossSection?.nearestToothFdi ?? "46", 10) || 46,
		};
	}, [currentImplantSpec, implantEntryXOffsetMm, implantEntryDepthMm, implantAngulationDeg, activeCrossSection]);

	// Compute 3D World Physical Coordinates of Virtual Implant
	const implant3DWorld: Implant3DWorldProjection | null = useMemo(() => {
		if (!activeCrossSection) return null;
		return calculateImplant3DWorldPose(
			currentImplantPose,
			activeCrossSection.centerPointMm,
			activeCrossSection.normalVector2D,
			activeCrossSection.heightMm,
			4.0,
		);
	}, [currentImplantPose, activeCrossSection]);

	const currentCanal: MandibularCanalCrossSection = useMemo(() => {
		return {
			center: { x: canalXOffsetMm, y: canalYDepthMm },
			radiusMm: 1.4,
			safetyMarginMm: 2.0,
		};
	}, [canalXOffsetMm, canalYDepthMm]);

	// Alveolar Ridge Envelope
	const currentEnvelope = useMemo(() => {
		return {
			crestPoint: { x: 0, y: 0 },
			basePoint: { x: 0, y: 22.0 },
			buccalCrestPoint: { x: -4.0, y: 0 },
			lingualCrestPoint: { x: 4.0, y: 0 },
			ridgeWidthMm: 8.0,
			ridgeHeightMm: 22.0,
		};
	}, []);

	// Safety Audit & HU Sampling
	const nerveAuditResult = useMemo(() => {
		return auditNerveSafetyMargin(currentImplantPose, currentCanal);
	}, [currentImplantPose, currentCanal]);

	const boneContainmentResult = useMemo(() => {
		return auditAlveolarBoneContainment(currentImplantPose, currentEnvelope);
	}, [currentImplantPose, currentEnvelope]);

	const huSamplingResult: HUZoneSampling = useMemo(() => {
		return sampleCrossSectionHUProfile(volume, currentImplantPose, implant3DWorld);
	}, [volume, currentImplantPose, implant3DWorld]);

	const mischClassification: MischClassificationResult = useMemo(() => {
		return classifyMischBoneQuality(huSamplingResult);
	}, [huSamplingResult]);

	// ─── AUDIO ALARM SENTINEL EFFECT ──────────────────────────────────────────
	useEffect(() => {
		if (studioMode === "implant" && nerveAuditResult.shouldTriggerAudioAlarm && isAudioEnabled) {
			playNerveSafetyAudioAlarm(nerveAuditResult.safetyStatus, isAudioEnabled);
		}
	}, [studioMode, nerveAuditResult.shouldTriggerAudioAlarm, nerveAuditResult.safetyStatus, isAudioEnabled]);

	// ─── RENDER 3-PLANE MPR SLICES (ZERO-GC CANVAS) ───────────────────────────
	useEffect(() => {
		if (!volume || !isOpen) return;

		const vox = worldMmToVoxel(crosshairMm, volume);

		// 1. Axial Viewport (Z-Plane: Intersects with Coronal (Amber) & Sagittal (Green))
		if (axialCanvasRef.current) {
			const canvas = axialCanvasRef.current;
			const ctx = canvas.getContext("2d");
			if (ctx) {
				const { data, metadata } = extractObliqueMprSlice(volume, "axial", crosshairMm, obliqueAngles, {
					windowWidth,
					windowLevel,
					invert: invertColors,
					slabMode,
					slabThicknessMm,
					interpolation: "trilinear",
				});
				if (!axialOffscreenRef.current) {
					axialOffscreenRef.current = document.createElement("canvas");
				}
				const off = axialOffscreenRef.current;
				if (off.width !== metadata.widthPx || off.height !== metadata.heightPx) {
					off.width = metadata.widthPx;
					off.height = metadata.heightPx;
				}
				const offCtx = off.getContext("2d");
				if (offCtx) {
					if (!axialImgDataRef.current || axialImgDataRef.current.width !== metadata.widthPx || axialImgDataRef.current.height !== metadata.heightPx) {
						axialImgDataRef.current = offCtx.createImageData(metadata.widthPx, metadata.heightPx);
					}
					axialImgDataRef.current.data.set(data);
					offCtx.putImageData(axialImgDataRef.current, 0, 0);
				}

				if (canvas.width !== metadata.widthPx || canvas.height !== metadata.heightPx) {
					canvas.width = metadata.widthPx;
					canvas.height = metadata.heightPx;
				}

				ctx.save();
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				const transform = transforms.axial ?? DEFAULT_VIEWPORT_TRANSFORM;
				ctx.translate(transform.panX, transform.panY);
				ctx.scale(transform.zoom, transform.zoom);
				ctx.drawImage(off, 0, 0);

				// Draw Calibrated Millimeter Rulers (1mm, 5mm, 10mm + scale bar)
				drawCalibratedMillimeterRulers(ctx, {
					widthPx: metadata.widthPx,
					heightPx: metadata.heightPx,
					pixelSpacingMmX: metadata.pixelSpacingX,
					pixelSpacingMmY: metadata.pixelSpacingY,
					showScaleBar: true,
				});

				// Draw Dental Arch Spline on Axial (Clean hairline when enabled)
				if (showDentalArch) {
					ctx.save();
					ctx.strokeStyle = "rgba(168, 85, 247, 0.85)";
					ctx.lineWidth = 1.5;
					ctx.setLineDash([4, 2]);
					ctx.beginPath();
					const spline = archCurve.splinePointsMm;
					for (let i = 0; i < spline.length; i++) {
						const pt = spline[i]!;
						const v = worldMmToVoxel({ x: pt.x, y: pt.y, z: crosshairMm.z }, volume);
						if (i === 0) ctx.moveTo(v.x, v.y);
						else ctx.lineTo(v.x, v.y);
					}
					ctx.stroke();
					ctx.setLineDash([]);

					// Tooth anchor nodes
					for (const anchor of archCurve.anchors) {
						const v = worldMmToVoxel({ x: anchor.positionMm.x, y: anchor.positionMm.y, z: crosshairMm.z }, volume);
						ctx.fillStyle = "rgba(168, 85, 247, 0.9)";
						ctx.beginPath();
						ctx.arc(v.x, v.y, 2.5, 0, Math.PI * 2);
						ctx.fill();
					}
					ctx.restore();
				}

				// Draw Active Cross-Section Reslice Ray across Ridge (Yellow #eab308)
				if (activeCrossSection) {
					const norm2D = activeCrossSection.normalVector2D;
					const rayHalfLenMm = activeCrossSection.widthMm / 2.0;
					const rayP1Mm = {
						x: activeCrossSection.centerPointMm.x - norm2D.x * rayHalfLenMm,
						y: activeCrossSection.centerPointMm.y - norm2D.y * rayHalfLenMm,
						z: crosshairMm.z,
					};
					const rayP2Mm = {
						x: activeCrossSection.centerPointMm.x + norm2D.x * rayHalfLenMm,
						y: activeCrossSection.centerPointMm.y + norm2D.y * rayHalfLenMm,
						z: crosshairMm.z,
					};
					const v1 = worldMmToVoxel(rayP1Mm, volume);
					const v2 = worldMmToVoxel(rayP2Mm, volume);

					ctx.strokeStyle = ROMEXIS_COLORS.crossSection;
					ctx.lineWidth = 2.0;
					ctx.beginPath();
					ctx.moveTo(v1.x, v1.y);
					ctx.lineTo(v2.x, v2.y);
					ctx.stroke();
				}

				// Synchronized Virtual Implant 3D Projection on Axial (Z)
				if (studioMode === "implant" && implant3DWorld) {
					const axialIntersection = calculateAxialImplantIntersection(implant3DWorld, crosshairMm.z, 2.0);
					const statusColor = nerveAuditResult.isDangerous
						? "#ef4444"
						: nerveAuditResult.isWarning
							? "#f59e0b"
							: "#10b981";
					const statusFill = nerveAuditResult.isDangerous
						? "rgba(239, 68, 68, 0.45)"
						: nerveAuditResult.isWarning
							? "rgba(245, 158, 11, 0.4)"
							: "rgba(16, 185, 129, 0.35)";

					const centerVox = worldMmToVoxel(axialIntersection.centerMm, volume);
					const spX = volume.spacingMm.x || 0.4;
					const spY = volume.spacingMm.y || 0.4;

					const bodyMajorPx = axialIntersection.semiMajorMm / spX;
					const bodyMinorPx = axialIntersection.semiMinorMm / spY;
					const haloMajorPx = axialIntersection.safetyHaloSemiMajorMm / spX;
					const haloMinorPx = axialIntersection.safetyHaloSemiMinorMm / spY;

					ctx.save();
					ctx.translate(centerVox.x, centerVox.y);
					ctx.rotate(axialIntersection.rotationRad);

					if (axialIntersection.isInsideSpan) {
						// 2.0 mm IAN Safety Halo Ellipse (dashed)
						ctx.strokeStyle = statusColor;
						ctx.lineWidth = 1.5;
						ctx.setLineDash([3, 2]);
						ctx.beginPath();
						ctx.ellipse(0, 0, Math.max(1, haloMajorPx), Math.max(1, haloMinorPx), 0, 0, Math.PI * 2);
						ctx.stroke();
						ctx.setLineDash([]);

						// Implant Body Ellipse (Solid fill + stroke)
						ctx.fillStyle = statusFill;
						ctx.strokeStyle = statusColor;
						ctx.lineWidth = 2.0;
						ctx.beginPath();
						ctx.ellipse(0, 0, Math.max(1, bodyMajorPx), Math.max(1, bodyMinorPx), 0, 0, Math.PI * 2);
						ctx.fill();
						ctx.stroke();

						// Central Axis Crosshair
						ctx.strokeStyle = "#ffffff";
						ctx.lineWidth = 1.0;
						ctx.beginPath();
						ctx.moveTo(-3, 0);
						ctx.lineTo(3, 0);
						ctx.moveTo(0, -3);
						ctx.lineTo(0, 3);
						ctx.stroke();
					} else if (Math.abs(axialIntersection.signedDistanceToZMm) <= 8.0) {
						// Out of slice range projection footprint (Dotted)
						ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
						ctx.lineWidth = 1.0;
						ctx.setLineDash([2, 2]);
						ctx.beginPath();
						ctx.ellipse(0, 0, Math.max(1, bodyMajorPx), Math.max(1, bodyMinorPx), 0, 0, Math.PI * 2);
						ctx.stroke();
						ctx.setLineDash([]);
					}
					ctx.restore();
				}

				// Coronal Slab MIP Bounding Corridor (Orange #f59e0b)
				if (slabMode !== "single" && slabThicknessMm > 1.0) {
					drawRomexisSlabCorridor(ctx, {
						orientation: "horizontal",
						centerPx: vox.y,
						thicknessMm: slabThicknessMm,
						pixelSpacingMm: metadata.pixelSpacingY,
						lengthPx: metadata.widthPx,
						colorRgba: ROMEXIS_COLORS.coronalRgba(0.65),
						fillColorRgba: ROMEXIS_COLORS.coronalRgba(0.08),
					});
				}

				// Draw Rulers on Axial
				for (const r of rulers) {
					if (r.plane === "axial") {
						const p1 = worldMmToSlicePx(r.startMm, "axial", volume);
						const p2 = worldMmToSlicePx(r.endMm, "axial", volume);
						const isSelected = selectedMeasurement?.id === r.id;
						const activeH = hoveredMeasurementHandle?.id === r.id ? hoveredMeasurementHandle.handleIndex : (draggingMeasurementHandle?.id === r.id ? draggingMeasurementHandle.handleIndex : null);
						drawCbctMeasurementRuler(ctx, p1, p2, r.distanceMm, isSelected, activeH);
					}
				}
				if (activeRuler && activeRuler.plane === "axial") {
					const p1 = worldMmToSlicePx(activeRuler.startMm, "axial", volume);
					const p2 = worldMmToSlicePx(activeRuler.currentMm, "axial", volume);
					const dist = Math.hypot(
						activeRuler.currentMm.x - activeRuler.startMm.x,
						activeRuler.currentMm.y - activeRuler.startMm.y,
						activeRuler.currentMm.z - activeRuler.startMm.z,
					);
					drawCbctMeasurementRuler(ctx, p1, p2, dist, true, null);
				}

				// Draw Angles on Axial
				for (const a of angles) {
					if (a.plane === "axial") {
						const p1 = worldMmToSlicePx(a.startMm, "axial", volume);
						const pv = worldMmToSlicePx(a.vertexMm, "axial", volume);
						const p2 = worldMmToSlicePx(a.endMm, "axial", volume);
						const isSelected = selectedMeasurement?.id === a.id;
						const activeH = hoveredMeasurementHandle?.id === a.id ? hoveredMeasurementHandle.handleIndex : (draggingMeasurementHandle?.id === a.id ? draggingMeasurementHandle.handleIndex : null);
						drawCbctAngleMeasurement(ctx, p1, pv, p2, a.angleDeg, isSelected, activeH);
					}
				}
				if (activeAngle && activeAngle.plane === "axial") {
					const p1 = worldMmToSlicePx(activeAngle.startMm, "axial", volume);
					const pv = activeAngle.vertexMm
						? worldMmToSlicePx(activeAngle.vertexMm, "axial", volume)
						: worldMmToSlicePx(activeAngle.currentMm, "axial", volume);
					const p2 = worldMmToSlicePx(activeAngle.currentMm, "axial", volume);
					const angleDeg = activeAngle.vertexMm
						? calculateAngleBetween3Points3D(activeAngle.startMm, activeAngle.vertexMm, activeAngle.currentMm)
						: 0;
					drawCbctAngleMeasurement(ctx, p1, pv, p2, angleDeg, true, null);
				}

				// Draw Probes on Axial
				for (const pm of probeMarkers) {
					if (pm.plane === "axial") {
						const p = worldMmToSlicePx(pm.worldMm, "axial", volume);
						const isSelected = selectedMeasurement?.id === pm.id;
						drawCbctProbeMarker(ctx, p, pm.hu, pm.tissueName, isSelected);
					}
				}
				if (activeProbe && activeProbe.plane === "axial" && activeTool === "probe") {
					const p = worldMmToSlicePx(activeProbe.worldMm, "axial", volume);
					drawCbctProbeMarker(ctx, p, activeProbe.hu, activeProbe.tissueName, true);
				}

				// Draw Mandibular Canal Nerve (IAN) on Axial with 3D Catmull-Rom Spline & Distance Gating
				if (interpolatedNerve3D.length > 1) {
					ctx.save();
					ctx.lineCap = "round";
					ctx.lineJoin = "round";

					// 1. Draw 2.0 mm Cylindrical Safety Corridor & Central Nerve Spline with Continuous Distance Gating
					for (let i = 0; i < interpolatedNerve3D.length - 1; i++) {
						const p1 = interpolatedNerve3D[i]!;
						const p2 = interpolatedNerve3D[i + 1]!;
						const midZ = (p1.z + p2.z) / 2.0;
						const deltaZ = Math.abs(midZ - crosshairMm.z);
						const gating = calculateNerveDistanceGating(deltaZ);

						if (!gating.isVisible) continue;

						const p1Px = worldMmToSlicePx(p1, "axial", volume);
						const p2Px = worldMmToSlicePx(p2, "axial", volume);

						// 2.0 mm Cylindrical Safety Corridor (Dashed amber halo)
						const haloWidthPx = Math.max(8, 4.0 / (metadata.pixelSpacingX || 0.4));
						ctx.lineWidth = haloWidthPx;
						ctx.setLineDash([5, 3]);
						ctx.strokeStyle = `rgba(245, 158, 11, ${Number((gating.alpha * 0.45).toFixed(3))})`;
						ctx.beginPath();
						ctx.moveTo(p1Px.x, p1Px.y);
						ctx.lineTo(p2Px.x, p2Px.y);
						ctx.stroke();

						// Central 3D Nerve Spline
						ctx.lineWidth = 2.5;
						if (gating.isDashed) {
							ctx.setLineDash([4, 4]);
						} else {
							ctx.setLineDash([]);
						}
						ctx.strokeStyle = `rgba(245, 158, 11, ${Number(gating.alpha.toFixed(3))})`;
						ctx.beginPath();
						ctx.moveTo(p1Px.x, p1Px.y);
						ctx.lineTo(p2Px.x, p2Px.y);
						ctx.stroke();
					}

					// 2. Waypoint nodes with Distance Gating and Selection Ring
					ctx.setLineDash([]);
					for (let i = 0; i < nervePoints.length; i++) {
						const pt = nervePoints[i]!;
						const deltaZ = Math.abs(pt.z - crosshairMm.z);
						const gating = calculateNerveDistanceGating(deltaZ);

						if (!gating.isVisible) continue;

						const p = worldMmToSlicePx(pt, "axial", volume);
						const isSelected = selectedNerveNodeIdx === i;

						if (isSelected) {
							// Highlighted ring for interactive selection
							ctx.strokeStyle = "#38bdf8";
							ctx.lineWidth = 2.0;
							ctx.beginPath();
							ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
							ctx.stroke();

							ctx.fillStyle = "#38bdf8";
							ctx.beginPath();
							ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
							ctx.fill();
						} else {
							ctx.fillStyle = `rgba(251, 191, 36, ${Number(gating.alpha.toFixed(3))})`;
							ctx.beginPath();
							ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
							ctx.fill();
						}
					}

					// 3. Floating 3D Badge on visible segment
					const visibleNodes = nervePoints.filter(
						(pt) => Math.abs(pt.z - crosshairMm.z) <= 3.5,
					);
					if (visibleNodes.length > 0) {
						const midPt = visibleNodes[Math.floor(visibleNodes.length / 2)]!;
						const pMid = worldMmToSlicePx(midPt, "axial", volume);
						ctx.fillStyle = "rgba(9, 9, 11, 0.9)";
						ctx.strokeStyle = "#f59e0b";
						ctx.lineWidth = 1;
						const text = `Канал IAN (3D ${nerveTotalLengthMm.toFixed(1)} мм · 2.0 мм буфер)`;
						ctx.font = "bold 9px monospace";
						const tw = ctx.measureText(text).width;
						ctx.beginPath();
						ctx.roundRect(pMid.x - tw / 2 - 4, pMid.y - 18, tw + 8, 14, 3);
						ctx.fill();
						ctx.stroke();
						ctx.fillStyle = "#fbbf24";
						ctx.textAlign = "center";
						ctx.fillText(text, pMid.x, pMid.y - 8);
					}

					ctx.restore();
				}

				// Draw Oblique Crosshair with Rotation Handles & Clinical Rotation Badge
				drawObliqueCrosshairWithRotationHandles(ctx, {
					widthPx: metadata.widthPx,
					heightPx: metadata.heightPx,
					centerPx: { x: vox.x, y: vox.y },
					plane: "axial",
					rotationDeg: obliqueAngles.axialAngleDeg,
					activeHandle: activeRotationHandle?.plane === "axial" ? activeRotationHandle.handle : null,
					hoveredHandle: hoveredHandle?.plane === "axial" ? hoveredHandle.handle : null,
					showHandles: true,
					showAngleBadge: true,
				});

				ctx.restore();
			}
		}

		// 2. Coronal Viewport (Y-Plane: Intersects with Axial (Cyan) & Sagittal (Green))
		if (coronalCanvasRef.current) {
			const canvas = coronalCanvasRef.current;
			const ctx = canvas.getContext("2d");
			if (ctx) {
				const { data, metadata } = extractObliqueMprSlice(volume, "coronal", crosshairMm, obliqueAngles, {
					windowWidth,
					windowLevel,
					invert: invertColors,
					slabMode,
					slabThicknessMm,
					interpolation: "trilinear",
				});
				if (!coronalOffscreenRef.current) {
					coronalOffscreenRef.current = document.createElement("canvas");
				}
				const off = coronalOffscreenRef.current;
				if (off.width !== metadata.widthPx || off.height !== metadata.heightPx) {
					off.width = metadata.widthPx;
					off.height = metadata.heightPx;
				}
				const offCtx = off.getContext("2d");
				if (offCtx) {
					if (!coronalImgDataRef.current || coronalImgDataRef.current.width !== metadata.widthPx || coronalImgDataRef.current.height !== metadata.heightPx) {
						coronalImgDataRef.current = offCtx.createImageData(metadata.widthPx, metadata.heightPx);
					}
					coronalImgDataRef.current.data.set(data);
					offCtx.putImageData(coronalImgDataRef.current, 0, 0);
				}

				if (canvas.width !== metadata.widthPx || canvas.height !== metadata.heightPx) {
					canvas.width = metadata.widthPx;
					canvas.height = metadata.heightPx;
				}

				ctx.save();
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				const transform = transforms.coronal ?? DEFAULT_VIEWPORT_TRANSFORM;
				ctx.translate(transform.panX, transform.panY);
				ctx.scale(transform.zoom, transform.zoom);
				ctx.drawImage(off, 0, 0);

				// Draw Calibrated Millimeter Rulers
				drawCalibratedMillimeterRulers(ctx, {
					widthPx: metadata.widthPx,
					heightPx: metadata.heightPx,
					pixelSpacingMmX: metadata.pixelSpacingX,
					pixelSpacingMmY: metadata.pixelSpacingY,
					showScaleBar: true,
				});

				// Synchronized Virtual Implant 3D Projection on Coronal (Y) with Distance Gating
				if (studioMode === "implant" && implant3DWorld) {
					const coronalGate = checkImplantSliceIntersection(implant3DWorld, "coronal", crosshairMm.y, 2.5);
					if (coronalGate.isIntersecting) {
						ctx.save();
						ctx.globalAlpha = coronalGate.alpha;
						const vEntry = worldMmToVoxel(implant3DWorld.entry3D, volume);
						const vApex = worldMmToVoxel(implant3DWorld.apex3D, volume);
						const depthMax = volume.dimensions.depth - 1;

						const pEntry = { x: vEntry.x, y: depthMax - vEntry.z };
						const pApex = { x: vApex.x, y: depthMax - vApex.z };

						const spX = volume.spacingMm.x || 0.4;
						const rPlatPx = (implant3DWorld.platformDiameterMm / 2.0) / spX;
						const rApexPx = (implant3DWorld.apexDiameterMm / 2.0) / spX;
						const rHaloPlatPx = rPlatPx + 2.0 / spX;
						const rHaloApexPx = rApexPx + 2.0 / spX;

						const dx = pApex.x - pEntry.x;
						const dy = pApex.y - pEntry.y;
						const len = Math.hypot(dx, dy) || 1.0;
						const nx = -dy / len;
						const ny = dx / len;

						const statusColor = nerveAuditResult.isDangerous
							? "#ef4444"
							: nerveAuditResult.isWarning
								? "#f59e0b"
								: "#10b981";
						const statusFill = nerveAuditResult.isDangerous
							? "rgba(239, 68, 68, 0.45)"
							: nerveAuditResult.isWarning
								? "rgba(245, 158, 11, 0.4)"
								: "rgba(16, 185, 129, 0.35)";

						// 2.0 mm Safety Halo boundary
						ctx.strokeStyle = statusColor;
						ctx.lineWidth = 1.5;
						ctx.setLineDash([3, 2]);
						ctx.beginPath();
						ctx.moveTo(pEntry.x + nx * rHaloPlatPx, pEntry.y + ny * rHaloPlatPx);
						ctx.lineTo(pApex.x + nx * rHaloApexPx, pApex.y + ny * rHaloApexPx);
						ctx.lineTo(pApex.x - nx * rHaloApexPx, pApex.y - ny * rHaloApexPx);
						ctx.lineTo(pEntry.x - nx * rHaloPlatPx, pEntry.y - ny * rHaloPlatPx);
						ctx.closePath();
						ctx.stroke();
						ctx.setLineDash([]);

						// Tapered Implant cylinder body
						ctx.fillStyle = statusFill;
						ctx.strokeStyle = statusColor;
						ctx.lineWidth = 2.0;
						ctx.beginPath();
						ctx.moveTo(pEntry.x + nx * rPlatPx, pEntry.y + ny * rPlatPx);
						ctx.lineTo(pApex.x + nx * rApexPx, pApex.y + ny * rApexPx);
						ctx.lineTo(pApex.x - nx * rApexPx, pApex.y - ny * rApexPx);
						ctx.lineTo(pEntry.x - nx * rPlatPx, pEntry.y - ny * rPlatPx);
						ctx.closePath();
						ctx.fill();
						ctx.stroke();

						// Central Axis
						ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
						ctx.lineWidth = 1.0;
						ctx.beginPath();
						ctx.moveTo(pEntry.x, pEntry.y);
						ctx.lineTo(pApex.x, pApex.y);
						ctx.stroke();

						// Semi-transparent compact Tooth FDI badge with pointer arrow
						const badgeY = Math.max(2, pEntry.y - 18);
						ctx.fillStyle = "rgba(9, 9, 11, 0.9)";
						ctx.strokeStyle = statusColor;
						ctx.lineWidth = 1;
						ctx.beginPath();
						ctx.roundRect(pEntry.x - 13, badgeY, 26, 12, 3);
						ctx.fill();
						ctx.stroke();
						// Pointer arrow
						ctx.beginPath();
						ctx.moveTo(pEntry.x - 3, badgeY + 12);
						ctx.lineTo(pEntry.x, badgeY + 15);
						ctx.lineTo(pEntry.x + 3, badgeY + 12);
						ctx.closePath();
						ctx.fillStyle = statusColor;
						ctx.fill();
						ctx.fillStyle = "#ffffff";
						ctx.font = "bold 8.5px monospace";
						ctx.textAlign = "center";
						ctx.fillText(`#${implant3DWorld.targetToothFdi}`, pEntry.x, badgeY + 9);
						ctx.restore();
					}
				}

				const zPx = metadata.heightPx - 1 - vox.z;

				// Axial Slab MIP Bounding Corridor (Cyan #06b6d4)
				if (slabMode !== "single" && slabThicknessMm > 1.0) {
					drawRomexisSlabCorridor(ctx, {
						orientation: "horizontal",
						centerPx: zPx,
						thicknessMm: slabThicknessMm,
						pixelSpacingMm: metadata.pixelSpacingY,
						lengthPx: metadata.widthPx,
						colorRgba: ROMEXIS_COLORS.axialRgba(0.65),
						fillColorRgba: ROMEXIS_COLORS.axialRgba(0.08),
					});
				}

				// Draw Rulers on Coronal
				for (const r of rulers) {
					if (r.plane === "coronal") {
						const p1 = worldMmToSlicePx(r.startMm, "coronal", volume);
						const p2 = worldMmToSlicePx(r.endMm, "coronal", volume);
						const isSelected = selectedMeasurement?.id === r.id;
						const activeH = hoveredMeasurementHandle?.id === r.id ? hoveredMeasurementHandle.handleIndex : (draggingMeasurementHandle?.id === r.id ? draggingMeasurementHandle.handleIndex : null);
						drawCbctMeasurementRuler(ctx, p1, p2, r.distanceMm, isSelected, activeH);
					}
				}
				if (activeRuler && activeRuler.plane === "coronal") {
					const p1 = worldMmToSlicePx(activeRuler.startMm, "coronal", volume);
					const p2 = worldMmToSlicePx(activeRuler.currentMm, "coronal", volume);
					const dist = Math.hypot(
						activeRuler.currentMm.x - activeRuler.startMm.x,
						activeRuler.currentMm.y - activeRuler.startMm.y,
						activeRuler.currentMm.z - activeRuler.startMm.z,
					);
					drawCbctMeasurementRuler(ctx, p1, p2, dist, true, null);
				}

				// Draw Angles on Coronal
				for (const a of angles) {
					if (a.plane === "coronal") {
						const p1 = worldMmToSlicePx(a.startMm, "coronal", volume);
						const pv = worldMmToSlicePx(a.vertexMm, "coronal", volume);
						const p2 = worldMmToSlicePx(a.endMm, "coronal", volume);
						const isSelected = selectedMeasurement?.id === a.id;
						const activeH = hoveredMeasurementHandle?.id === a.id ? hoveredMeasurementHandle.handleIndex : (draggingMeasurementHandle?.id === a.id ? draggingMeasurementHandle.handleIndex : null);
						drawCbctAngleMeasurement(ctx, p1, pv, p2, a.angleDeg, isSelected, activeH);
					}
				}
				if (activeAngle && activeAngle.plane === "coronal") {
					const p1 = worldMmToSlicePx(activeAngle.startMm, "coronal", volume);
					const pv = activeAngle.vertexMm
						? worldMmToSlicePx(activeAngle.vertexMm, "coronal", volume)
						: worldMmToSlicePx(activeAngle.currentMm, "coronal", volume);
					const p2 = worldMmToSlicePx(activeAngle.currentMm, "coronal", volume);
					const angleDeg = activeAngle.vertexMm
						? calculateAngleBetween3Points3D(activeAngle.startMm, activeAngle.vertexMm, activeAngle.currentMm)
						: 0;
					drawCbctAngleMeasurement(ctx, p1, pv, p2, angleDeg, true, null);
				}

				// Draw Probes on Coronal
				for (const pm of probeMarkers) {
					if (pm.plane === "coronal") {
						const p = worldMmToSlicePx(pm.worldMm, "coronal", volume);
						const isSelected = selectedMeasurement?.id === pm.id;
						drawCbctProbeMarker(ctx, p, pm.hu, pm.tissueName, isSelected);
					}
				}
				if (activeProbe && activeProbe.plane === "coronal" && activeTool === "probe") {
					const p = worldMmToSlicePx(activeProbe.worldMm, "coronal", volume);
					drawCbctProbeMarker(ctx, p, activeProbe.hu, activeProbe.tissueName, true);
				}

				// Draw Mandibular Canal Nerve (IAN) on Coronal with 3D Catmull-Rom Spline & Distance Gating
				if (interpolatedNerve3D.length > 1) {
					ctx.save();
					ctx.lineCap = "round";
					ctx.lineJoin = "round";

					for (let i = 0; i < interpolatedNerve3D.length - 1; i++) {
						const p1 = interpolatedNerve3D[i]!;
						const p2 = interpolatedNerve3D[i + 1]!;
						const midY = (p1.y + p2.y) / 2.0;
						const deltaY = Math.abs(midY - crosshairMm.y);
						const gating = calculateNerveDistanceGating(deltaY);

						if (!gating.isVisible) continue;

						const p1Px = worldMmToSlicePx(p1, "coronal", volume);
						const p2Px = worldMmToSlicePx(p2, "coronal", volume);

						// 2.0 mm Safety Corridor (Dashed amber halo)
						const haloWidthPx = Math.max(8, 4.0 / (metadata.pixelSpacingX || 0.4));
						ctx.lineWidth = haloWidthPx;
						ctx.setLineDash([5, 3]);
						ctx.strokeStyle = `rgba(245, 158, 11, ${Number((gating.alpha * 0.45).toFixed(3))})`;
						ctx.beginPath();
						ctx.moveTo(p1Px.x, p1Px.y);
						ctx.lineTo(p2Px.x, p2Px.y);
						ctx.stroke();

						// Central 3D line
						ctx.lineWidth = 2.5;
						if (gating.isDashed) {
							ctx.setLineDash([4, 4]);
						} else {
							ctx.setLineDash([]);
						}
						ctx.strokeStyle = `rgba(245, 158, 11, ${Number(gating.alpha.toFixed(3))})`;
						ctx.beginPath();
						ctx.moveTo(p1Px.x, p1Px.y);
						ctx.lineTo(p2Px.x, p2Px.y);
						ctx.stroke();
					}

					// Waypoint nodes with Distance Gating and Selection Ring
					ctx.setLineDash([]);
					for (let i = 0; i < nervePoints.length; i++) {
						const pt = nervePoints[i]!;
						const deltaY = Math.abs(pt.y - crosshairMm.y);
						const gating = calculateNerveDistanceGating(deltaY);

						if (!gating.isVisible) continue;

						const p = worldMmToSlicePx(pt, "coronal", volume);
						const isSelected = selectedNerveNodeIdx === i;

						if (isSelected) {
							ctx.strokeStyle = "#38bdf8";
							ctx.lineWidth = 2.0;
							ctx.beginPath();
							ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
							ctx.stroke();

							ctx.fillStyle = "#38bdf8";
							ctx.beginPath();
							ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
							ctx.fill();
						} else {
							ctx.fillStyle = `rgba(251, 191, 36, ${Number(gating.alpha.toFixed(3))})`;
							ctx.beginPath();
							ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
							ctx.fill();
						}
					}
					ctx.restore();
				}

				// Draw Oblique Crosshair with Rotation Handles & Clinical Tilt Badge
				drawObliqueCrosshairWithRotationHandles(ctx, {
					widthPx: metadata.widthPx,
					heightPx: metadata.heightPx,
					centerPx: { x: vox.x, y: zPx },
					plane: "coronal",
					rotationDeg: obliqueAngles.coronalTiltDeg,
					activeHandle: activeRotationHandle?.plane === "coronal" ? activeRotationHandle.handle : null,
					hoveredHandle: hoveredHandle?.plane === "coronal" ? hoveredHandle.handle : null,
					showHandles: true,
					showAngleBadge: true,
				});

				ctx.restore();
			}
		}

		// 3. Sagittal Viewport (X-Plane: Intersects with Axial (Cyan) & Coronal (Amber))
		if (sagittalCanvasRef.current) {
			const canvas = sagittalCanvasRef.current;
			const ctx = canvas.getContext("2d");
			if (ctx) {
				const { data, metadata } = extractObliqueMprSlice(volume, "sagittal", crosshairMm, obliqueAngles, {
					windowWidth,
					windowLevel,
					invert: invertColors,
					slabMode,
					slabThicknessMm,
					interpolation: "trilinear",
				});
				if (!sagittalOffscreenRef.current) {
					sagittalOffscreenRef.current = document.createElement("canvas");
				}
				const off = sagittalOffscreenRef.current;
				if (off.width !== metadata.widthPx || off.height !== metadata.heightPx) {
					off.width = metadata.widthPx;
					off.height = metadata.heightPx;
				}
				const offCtx = off.getContext("2d");
				if (offCtx) {
					if (!sagittalImgDataRef.current || sagittalImgDataRef.current.width !== metadata.widthPx || sagittalImgDataRef.current.height !== metadata.heightPx) {
						sagittalImgDataRef.current = offCtx.createImageData(metadata.widthPx, metadata.heightPx);
					}
					sagittalImgDataRef.current.data.set(data);
					offCtx.putImageData(sagittalImgDataRef.current, 0, 0);
				}

				if (canvas.width !== metadata.widthPx || canvas.height !== metadata.heightPx) {
					canvas.width = metadata.widthPx;
					canvas.height = metadata.heightPx;
				}

				ctx.save();
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				const transform = transforms.sagittal ?? DEFAULT_VIEWPORT_TRANSFORM;
				ctx.translate(transform.panX, transform.panY);
				ctx.scale(transform.zoom, transform.zoom);
				ctx.drawImage(off, 0, 0);

				// Draw Calibrated Millimeter Rulers
				drawCalibratedMillimeterRulers(ctx, {
					widthPx: metadata.widthPx,
					heightPx: metadata.heightPx,
					pixelSpacingMmX: metadata.pixelSpacingX,
					pixelSpacingMmY: metadata.pixelSpacingY,
					showScaleBar: true,
				});

				// Synchronized Virtual Implant 3D Projection on Sagittal (X) with Distance Gating
				if (studioMode === "implant" && implant3DWorld) {
					const sagittalGate = checkImplantSliceIntersection(implant3DWorld, "sagittal", crosshairMm.x, 2.5);
					if (sagittalGate.isIntersecting) {
						ctx.save();
						ctx.globalAlpha = sagittalGate.alpha;
						const vEntry = worldMmToVoxel(implant3DWorld.entry3D, volume);
						const vApex = worldMmToVoxel(implant3DWorld.apex3D, volume);
						const depthMax = volume.dimensions.depth - 1;

						const pEntry = { x: vEntry.y, y: depthMax - vEntry.z };
						const pApex = { x: vApex.y, y: depthMax - vApex.z };

						const spY = volume.spacingMm.y || 0.4;
						const rPlatPx = (implant3DWorld.platformDiameterMm / 2.0) / spY;
						const rApexPx = (implant3DWorld.apexDiameterMm / 2.0) / spY;
						const rHaloPlatPx = rPlatPx + 2.0 / spY;
						const rHaloApexPx = rApexPx + 2.0 / spY;

						const dx = pApex.x - pEntry.x;
						const dy = pApex.y - pEntry.y;
						const len = Math.hypot(dx, dy) || 1.0;
						const nx = -dy / len;
						const ny = dx / len;

						const statusColor = nerveAuditResult.isDangerous
							? "#ef4444"
							: nerveAuditResult.isWarning
								? "#f59e0b"
								: "#10b981";
						const statusFill = nerveAuditResult.isDangerous
							? "rgba(239, 68, 68, 0.45)"
							: nerveAuditResult.isWarning
								? "rgba(245, 158, 11, 0.4)"
								: "rgba(16, 185, 129, 0.35)";

						// 2.0 mm Safety Halo boundary
						ctx.strokeStyle = statusColor;
						ctx.lineWidth = 1.5;
						ctx.setLineDash([3, 2]);
						ctx.beginPath();
						ctx.moveTo(pEntry.x + nx * rHaloPlatPx, pEntry.y + ny * rHaloPlatPx);
						ctx.lineTo(pApex.x + nx * rHaloApexPx, pApex.y + ny * rHaloApexPx);
						ctx.lineTo(pApex.x - nx * rHaloApexPx, pApex.y - ny * rHaloApexPx);
						ctx.lineTo(pEntry.x - nx * rHaloPlatPx, pEntry.y - ny * rHaloPlatPx);
						ctx.closePath();
						ctx.stroke();
						ctx.setLineDash([]);

						// Tapered Implant cylinder body
						ctx.fillStyle = statusFill;
						ctx.strokeStyle = statusColor;
						ctx.lineWidth = 2.0;
						ctx.beginPath();
						ctx.moveTo(pEntry.x + nx * rPlatPx, pEntry.y + ny * rPlatPx);
						ctx.lineTo(pApex.x + nx * rApexPx, pApex.y + ny * rApexPx);
						ctx.lineTo(pApex.x - nx * rApexPx, pApex.y - ny * rApexPx);
						ctx.lineTo(pEntry.x - nx * rPlatPx, pEntry.y - ny * rPlatPx);
						ctx.closePath();
						ctx.fill();
						ctx.stroke();

						// Central Axis
						ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
						ctx.lineWidth = 1.0;
						ctx.beginPath();
						ctx.moveTo(pEntry.x, pEntry.y);
						ctx.lineTo(pApex.x, pApex.y);
						ctx.stroke();

						// Semi-transparent compact Tooth FDI badge with pointer arrow
						const badgeY = Math.max(2, pEntry.y - 18);
						ctx.fillStyle = "rgba(9, 9, 11, 0.9)";
						ctx.strokeStyle = statusColor;
						ctx.lineWidth = 1;
						ctx.beginPath();
						ctx.roundRect(pEntry.x - 13, badgeY, 26, 12, 3);
						ctx.fill();
						ctx.stroke();
						// Pointer arrow
						ctx.beginPath();
						ctx.moveTo(pEntry.x - 3, badgeY + 12);
						ctx.lineTo(pEntry.x, badgeY + 15);
						ctx.lineTo(pEntry.x + 3, badgeY + 12);
						ctx.closePath();
						ctx.fillStyle = statusColor;
						ctx.fill();
						ctx.fillStyle = "#ffffff";
						ctx.font = "bold 8.5px monospace";
						ctx.textAlign = "center";
						ctx.fillText(`#${implant3DWorld.targetToothFdi}`, pEntry.x, badgeY + 9);
						ctx.restore();
					}
				}

				const zPx = metadata.heightPx - 1 - vox.z;

				// Axial Slab MIP Bounding Corridor (Cyan #06b6d4)
				if (slabMode !== "single" && slabThicknessMm > 1.0) {
					drawRomexisSlabCorridor(ctx, {
						orientation: "horizontal",
						centerPx: zPx,
						thicknessMm: slabThicknessMm,
						pixelSpacingMm: metadata.pixelSpacingY,
						lengthPx: metadata.widthPx,
						colorRgba: ROMEXIS_COLORS.axialRgba(0.65),
						fillColorRgba: ROMEXIS_COLORS.axialRgba(0.08),
					});
				}

				// Draw Rulers on Sagittal
				for (const r of rulers) {
					if (r.plane === "sagittal") {
						const p1 = worldMmToSlicePx(r.startMm, "sagittal", volume);
						const p2 = worldMmToSlicePx(r.endMm, "sagittal", volume);
						const isSelected = selectedMeasurement?.id === r.id;
						const activeH = hoveredMeasurementHandle?.id === r.id ? hoveredMeasurementHandle.handleIndex : (draggingMeasurementHandle?.id === r.id ? draggingMeasurementHandle.handleIndex : null);
						drawCbctMeasurementRuler(ctx, p1, p2, r.distanceMm, isSelected, activeH);
					}
				}
				if (activeRuler && activeRuler.plane === "sagittal") {
					const p1 = worldMmToSlicePx(activeRuler.startMm, "sagittal", volume);
					const p2 = worldMmToSlicePx(activeRuler.currentMm, "sagittal", volume);
					const dist = Math.hypot(
						activeRuler.currentMm.x - activeRuler.startMm.x,
						activeRuler.currentMm.y - activeRuler.startMm.y,
						activeRuler.currentMm.z - activeRuler.startMm.z,
					);
					drawCbctMeasurementRuler(ctx, p1, p2, dist, true, null);
				}

				// Draw Angles on Sagittal
				for (const a of angles) {
					if (a.plane === "sagittal") {
						const p1 = worldMmToSlicePx(a.startMm, "sagittal", volume);
						const pv = worldMmToSlicePx(a.vertexMm, "sagittal", volume);
						const p2 = worldMmToSlicePx(a.endMm, "sagittal", volume);
						const isSelected = selectedMeasurement?.id === a.id;
						const activeH = hoveredMeasurementHandle?.id === a.id ? hoveredMeasurementHandle.handleIndex : (draggingMeasurementHandle?.id === a.id ? draggingMeasurementHandle.handleIndex : null);
						drawCbctAngleMeasurement(ctx, p1, pv, p2, a.angleDeg, isSelected, activeH);
					}
				}
				if (activeAngle && activeAngle.plane === "sagittal") {
					const p1 = worldMmToSlicePx(activeAngle.startMm, "sagittal", volume);
					const pv = activeAngle.vertexMm
						? worldMmToSlicePx(activeAngle.vertexMm, "sagittal", volume)
						: worldMmToSlicePx(activeAngle.currentMm, "sagittal", volume);
					const p2 = worldMmToSlicePx(activeAngle.currentMm, "sagittal", volume);
					const angleDeg = activeAngle.vertexMm
						? calculateAngleBetween3Points3D(activeAngle.startMm, activeAngle.vertexMm, activeAngle.currentMm)
						: 0;
					drawCbctAngleMeasurement(ctx, p1, pv, p2, angleDeg, true, null);
				}

				// Draw Probes on Sagittal
				for (const pm of probeMarkers) {
					if (pm.plane === "sagittal") {
						const p = worldMmToSlicePx(pm.worldMm, "sagittal", volume);
						const isSelected = selectedMeasurement?.id === pm.id;
						drawCbctProbeMarker(ctx, p, pm.hu, pm.tissueName, isSelected);
					}
				}
				if (activeProbe && activeProbe.plane === "sagittal" && activeTool === "probe") {
					const p = worldMmToSlicePx(activeProbe.worldMm, "sagittal", volume);
					drawCbctProbeMarker(ctx, p, activeProbe.hu, activeProbe.tissueName, true);
				}

				// Draw Mandibular Canal Nerve (IAN) on Sagittal with 3D Catmull-Rom Spline & Distance Gating
				if (interpolatedNerve3D.length > 1) {
					ctx.save();
					ctx.lineCap = "round";
					ctx.lineJoin = "round";

					for (let i = 0; i < interpolatedNerve3D.length - 1; i++) {
						const p1 = interpolatedNerve3D[i]!;
						const p2 = interpolatedNerve3D[i + 1]!;
						const midX = (p1.x + p2.x) / 2.0;
						const deltaX = Math.abs(midX - crosshairMm.x);
						const gating = calculateNerveDistanceGating(deltaX);

						if (!gating.isVisible) continue;

						const p1Px = worldMmToSlicePx(p1, "sagittal", volume);
						const p2Px = worldMmToSlicePx(p2, "sagittal", volume);

						// 2.0 mm Safety Corridor (Dashed amber halo)
						const haloWidthPx = Math.max(8, 4.0 / (metadata.pixelSpacingY || 0.4));
						ctx.lineWidth = haloWidthPx;
						ctx.setLineDash([5, 3]);
						ctx.strokeStyle = `rgba(245, 158, 11, ${Number((gating.alpha * 0.45).toFixed(3))})`;
						ctx.beginPath();
						ctx.moveTo(p1Px.x, p1Px.y);
						ctx.lineTo(p2Px.x, p2Px.y);
						ctx.stroke();

						// Central 3D line
						ctx.lineWidth = 2.5;
						if (gating.isDashed) {
							ctx.setLineDash([4, 4]);
						} else {
							ctx.setLineDash([]);
						}
						ctx.strokeStyle = `rgba(245, 158, 11, ${Number(gating.alpha.toFixed(3))})`;
						ctx.beginPath();
						ctx.moveTo(p1Px.x, p1Px.y);
						ctx.lineTo(p2Px.x, p2Px.y);
						ctx.stroke();
					}

					// Waypoint nodes with Distance Gating and Selection Ring
					ctx.setLineDash([]);
					for (let i = 0; i < nervePoints.length; i++) {
						const pt = nervePoints[i]!;
						const deltaX = Math.abs(pt.x - crosshairMm.x);
						const gating = calculateNerveDistanceGating(deltaX);

						if (!gating.isVisible) continue;

						const p = worldMmToSlicePx(pt, "sagittal", volume);
						const isSelected = selectedNerveNodeIdx === i;

						if (isSelected) {
							ctx.strokeStyle = "#38bdf8";
							ctx.lineWidth = 2.0;
							ctx.beginPath();
							ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
							ctx.stroke();

							ctx.fillStyle = "#38bdf8";
							ctx.beginPath();
							ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
							ctx.fill();
						} else {
							ctx.fillStyle = `rgba(251, 191, 36, ${Number(gating.alpha.toFixed(3))})`;
							ctx.beginPath();
							ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
							ctx.fill();
						}
					}
					ctx.restore();
				}

				// Draw Oblique Crosshair with Rotation Handles & Clinical Tilt Badge
				drawObliqueCrosshairWithRotationHandles(ctx, {
					widthPx: metadata.widthPx,
					heightPx: metadata.heightPx,
					centerPx: { x: vox.y, y: zPx },
					plane: "sagittal",
					rotationDeg: obliqueAngles.sagittalTiltDeg,
					activeHandle: activeRotationHandle?.plane === "sagittal" ? activeRotationHandle.handle : null,
					hoveredHandle: hoveredHandle?.plane === "sagittal" ? hoveredHandle.handle : null,
					showHandles: true,
					showAngleBadge: true,
				});

				ctx.restore();
			}
		}
	}, [volume, isOpen, crosshairMm, obliqueAngles, activeRotationHandle, hoveredHandle, windowWidth, windowLevel, invertColors, slabMode, slabThicknessMm, archCurve, activeCrossSection, implant3DWorld, nerveAuditResult, studioMode, transforms.axial, transforms.coronal, transforms.sagittal, rulers, activeRuler, angles, activeAngle, selectedMeasurement, draggingMeasurementHandle, hoveredMeasurementHandle, probeMarkers, activeProbe, activeTool, maximizedViewport, viewLayout, nervePoints, interpolatedNerve3D, selectedNerveNodeIdx, nerveTotalLengthMm]);

	// ─── RECONSTRUCT PANORAMIC & CROSS SECTIONS ───────────────────────────────
	useEffect(() => {
		if (!volume || !isOpen) return;

		// Reconstruct Panorama
		const pano = reconstructPanoramicView(volume, archCurve, {
			heightPx: 220,
			windowWidth,
			windowLevel,
			invert: invertColors,
		});
		setPanoramicData(pano);

		// Reconstruct Cross-Sections
		const csList = generateCrossSectionSlices(volume, archCurve, 1.5, 0.0, {
			windowWidth,
			windowLevel,
			invert: invertColors,
		});
		setCrossSections(csList);
	}, [volume, isOpen, archCurve, windowWidth, windowLevel, slabMode, invertColors]);

	// ─── RENDER PANORAMIC VIEW WITH INTERACTIVE CROSS-SECTION FAN ─────────────
	useEffect(() => {
		if (!panoramicData || !panoCanvasRef.current) return;

		const canvas = panoCanvasRef.current;
		canvas.width = panoramicData.widthPx;
		canvas.height = panoramicData.heightPx;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// 1. Draw Panoramic Grayscale Radiograph
		if (!panoOffscreenRef.current) {
			panoOffscreenRef.current = document.createElement("canvas");
		}
		const off = panoOffscreenRef.current;
		if (off.width !== panoramicData.widthPx || off.height !== panoramicData.heightPx) {
			off.width = panoramicData.widthPx;
			off.height = panoramicData.heightPx;
		}
		const offCtx = off.getContext("2d");
		if (offCtx) {
			if (!panoImgDataRef.current || panoImgDataRef.current.width !== panoramicData.widthPx || panoImgDataRef.current.height !== panoramicData.heightPx) {
				panoImgDataRef.current = offCtx.createImageData(panoramicData.widthPx, panoramicData.heightPx);
			}
			panoImgDataRef.current.data.set(panoramicData.pixelData);
			offCtx.putImageData(panoImgDataRef.current, 0, 0);
		}

		ctx.save();
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		const transform = transforms.panoramic ?? DEFAULT_VIEWPORT_TRANSFORM;
		ctx.translate(transform.panX, transform.panY);
		ctx.scale(transform.zoom, transform.zoom);
		ctx.drawImage(off, 0, 0);

		// Draw Calibrated Millimeter Rulers on Panorama (Y-axis vertical depth only; X-axis disabled to prevent conflict with FDI tooth markers)
		drawCalibratedMillimeterRulers(ctx, {
			widthPx: canvas.width,
			heightPx: canvas.height,
			pixelSpacingMmX: volume?.spacingMm.x ?? 0.4,
			pixelSpacingMmY: volume?.spacingMm.z ?? 0.4,
			showXAxis: false,
			showYAxis: true,
			showScaleBar: true,
		});

		// Draw Axial Plane Intersection Line (Cyan #06b6d4)
		if (volume) {
			const vox = worldMmToVoxel(crosshairMm, volume);
			const zNorm = 1.0 - (vox.z / (volume.dimensions.depth - 1));
			const zPx = Math.round(zNorm * canvas.height);

			// Axial Slab corridor on Panorama
			if (slabMode !== "single" && slabThicknessMm > 1.0) {
				drawRomexisSlabCorridor(ctx, {
					orientation: "horizontal",
					centerPx: zPx,
					thicknessMm: slabThicknessMm,
					pixelSpacingMm: volume.spacingMm.z,
					lengthPx: canvas.width,
					colorRgba: ROMEXIS_COLORS.axialRgba(0.6),
					fillColorRgba: ROMEXIS_COLORS.axialRgba(0.08),
				});
			}

			ctx.strokeStyle = ROMEXIS_COLORS.axial;
			ctx.lineWidth = 1.2;
			ctx.beginPath();
			ctx.moveTo(0, zPx);
			ctx.lineTo(canvas.width, zPx);
			ctx.stroke();
		}

		// 2. Draw Tooth Markers on Panorama
		for (const tm of panoramicData.toothMarkersOnPano) {
			ctx.strokeStyle = ROMEXIS_COLORS.panoramicRgba(0.4);
			ctx.lineWidth = 1;
			ctx.setLineDash([2, 3]);
			ctx.beginPath();
			ctx.moveTo(tm.xPx, 18);
			ctx.lineTo(tm.xPx, canvas.height - 18);
			ctx.stroke();
			ctx.setLineDash([]);

			ctx.fillStyle = "rgba(9, 9, 11, 0.9)";
			ctx.beginPath();
			ctx.roundRect(tm.xPx - 10, 2, 20, 14, 3);
			ctx.fill();
			ctx.fillStyle = "#38bdf8";
			ctx.font = "bold 9px monospace";
			ctx.textAlign = "center";
			ctx.fillText(tm.toothFdi, tm.xPx, 12);
		}

		// 3. Draw Numbered Cross-Section Slice Fan Ticks (#1..#N)
		const fanTicks = getPanoramicSliceFanTicks(crossSections, panoramicData.widthPx, archCurve.totalArcLengthMm);
		let lastDrawnTickX = -999;
		for (let i = 0; i < fanTicks.length; i++) {
			const tick = fanTicks[i]!;
			const isActive = i === activeCrossSectionIdx;

			if (isActive) {
				// Highlighted active slice line with vibrant Romexis Yellow
				ctx.strokeStyle = ROMEXIS_COLORS.crossSection;
				ctx.lineWidth = 2.0;
				ctx.beginPath();
				ctx.moveTo(tick.panoX, 0);
				ctx.lineTo(tick.panoX, canvas.height);
				ctx.stroke();

				// Active slice top/bottom badge (Dark matte with subtle yellow border & text)
				ctx.fillStyle = "rgba(9, 9, 11, 0.9)";
				ctx.beginPath();
				ctx.roundRect(Math.max(2, tick.panoX - 16), canvas.height - 18, 32, 16, 4);
				ctx.fill();
				ctx.strokeStyle = ROMEXIS_COLORS.crossSection;
				ctx.lineWidth = 1;
				ctx.stroke();
				ctx.fillStyle = ROMEXIS_COLORS.crossSection;
				ctx.font = "bold 9px monospace";
				ctx.textAlign = "center";
				ctx.fillText(`#${tick.sliceIndex}`, Math.max(18, tick.panoX), canvas.height - 6);
				lastDrawnTickX = tick.panoX;
			} else if (tick.isMajor && Math.abs(tick.panoX - lastDrawnTickX) >= 28) {
				// Major slice tick mark
				ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
				ctx.lineWidth = 1.0;
				ctx.beginPath();
				ctx.moveTo(tick.panoX, canvas.height - 10);
				ctx.lineTo(tick.panoX, canvas.height);
				ctx.stroke();

				ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
				ctx.font = "8px monospace";
				ctx.textAlign = "center";
				ctx.fillText(`${tick.sliceIndex}`, tick.panoX, canvas.height - 12);
				lastDrawnTickX = tick.panoX;
			} else {
				// Minor slice tick mark
				ctx.strokeStyle = "rgba(100, 116, 139, 0.3)";
				ctx.lineWidth = 1.0;
				ctx.beginPath();
				ctx.moveTo(tick.panoX, canvas.height - 4);
				ctx.lineTo(tick.panoX, canvas.height);
				ctx.stroke();
			}
		}

		// 4. Synchronized Virtual Implant 3D Projection on Panorama
		if (studioMode === "implant" && activeCrossSection && implant3DWorld) {
			const panoX = mapSliceToPanoramicX(activeCrossSection, panoramicData.widthPx, archCurve.totalArcLengthMm);
			const panoH = panoramicData.heightPx;
			const panoHMm = 38.0;
			const zTopMm = panoHMm / 2.0;

			const yEntryPx = Math.max(0, Math.min(panoH - 1, ((zTopMm - implant3DWorld.entry3D.z) / panoHMm) * panoH));
			const yApexPx = Math.max(0, Math.min(panoH - 1, ((zTopMm - implant3DWorld.apex3D.z) / panoHMm) * panoH));

			const pxPerMmY = panoH / panoHMm;
			const rPlatPx = (implant3DWorld.platformDiameterMm / 2.0) * pxPerMmY;
			const rApexPx = (implant3DWorld.apexDiameterMm / 2.0) * pxPerMmY;
			const rHaloPlatPx = rPlatPx + 2.0 * pxPerMmY;
			const rHaloApexPx = rApexPx + 2.0 * pxPerMmY;

			const statusColor = nerveAuditResult.isDangerous
				? "#ef4444"
				: nerveAuditResult.isWarning
					? "#f59e0b"
					: "#10b981";
			const statusFill = nerveAuditResult.isDangerous
				? "rgba(239, 68, 68, 0.55)"
				: nerveAuditResult.isWarning
					? "rgba(245, 158, 11, 0.45)"
					: "rgba(16, 185, 129, 0.4)";

			// Safety Corridor Halo on Panorama (2.0 mm)
			ctx.strokeStyle = statusColor;
			ctx.lineWidth = 1.5;
			ctx.setLineDash([3, 2]);
			ctx.beginPath();
			ctx.moveTo(panoX - rHaloPlatPx, yEntryPx);
			ctx.lineTo(panoX + rHaloPlatPx, yEntryPx);
			ctx.lineTo(panoX + rHaloApexPx, yApexPx);
			ctx.lineTo(panoX - rHaloApexPx, yApexPx);
			ctx.closePath();
			ctx.stroke();
			ctx.setLineDash([]);

			// Implant Silhouette Body
			ctx.fillStyle = statusFill;
			ctx.strokeStyle = statusColor;
			ctx.lineWidth = 2.0;
			ctx.beginPath();
			ctx.moveTo(panoX - rPlatPx, yEntryPx);
			ctx.lineTo(panoX + rPlatPx, yEntryPx);
			ctx.lineTo(panoX + rApexPx, yApexPx);
			ctx.lineTo(panoX - rApexPx, yApexPx);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();

			// Central axis line
			ctx.strokeStyle = "#ffffff";
			ctx.lineWidth = 1.0;
			ctx.beginPath();
			ctx.moveTo(panoX, yEntryPx);
			ctx.lineTo(panoX, yApexPx);
			ctx.stroke();

			// Tooth FDI Tag above implant
			ctx.fillStyle = "rgba(9, 9, 11, 0.9)";
			ctx.strokeStyle = statusColor;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.roundRect(panoX - 18, Math.max(2, yEntryPx - 18), 36, 14, 3);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = "#ffffff";
			ctx.font = "bold 9px monospace";
			ctx.textAlign = "center";
			ctx.fillText(`FDI #${implant3DWorld.targetToothFdi}`, panoX, Math.max(2, yEntryPx - 18) + 10);
		}

		ctx.restore();
	}, [panoramicData, crossSections, activeCrossSectionIdx, activeCrossSection, implant3DWorld, nerveAuditResult, archCurve.totalArcLengthMm, volume, crosshairMm, slabMode, slabThicknessMm, studioMode, transforms.panoramic, maximizedViewport, viewLayout]);

	// ─── RENDER ACTIVE CROSS-SECTION WITH IMPLANT & NERVE ─────────────────────
	useEffect(() => {
		if (!activeCrossSection || !crossSectionCanvasRef.current) return;

		const canvas = crossSectionCanvasRef.current;
		canvas.width = activeCrossSection.widthPx;
		canvas.height = activeCrossSection.heightPx;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// 1. Draw Resliced Bone Voxel Texture
		if (!crossSectionOffscreenRef.current) {
			crossSectionOffscreenRef.current = document.createElement("canvas");
		}
		const off = crossSectionOffscreenRef.current;
		if (off.width !== activeCrossSection.widthPx || off.height !== activeCrossSection.heightPx) {
			off.width = activeCrossSection.widthPx;
			off.height = activeCrossSection.heightPx;
		}
		const offCtx = off.getContext("2d");
		if (offCtx) {
			if (!crossSectionImgDataRef.current || crossSectionImgDataRef.current.width !== activeCrossSection.widthPx || crossSectionImgDataRef.current.height !== activeCrossSection.heightPx) {
				crossSectionImgDataRef.current = offCtx.createImageData(activeCrossSection.widthPx, activeCrossSection.heightPx);
			}
			crossSectionImgDataRef.current.data.set(activeCrossSection.pixelData);
			offCtx.putImageData(crossSectionImgDataRef.current, 0, 0);
		}

		ctx.save();
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		const transform = transforms.cross_section ?? DEFAULT_VIEWPORT_TRANSFORM;
		ctx.translate(transform.panX, transform.panY);
		ctx.scale(transform.zoom, transform.zoom);
		ctx.drawImage(off, 0, 0);

		const pxSpacing = activeCrossSection.pixelSpacingMm;
		const centerX = canvas.width / 2;
		const topY = 20; // Alveolar crest baseline in pixels

		// 2. Draw Calibrated Millimeter Rulers and Grid
		drawCalibratedMillimeterRulers(ctx, {
			widthPx: canvas.width,
			heightPx: canvas.height,
			pixelSpacingMmX: pxSpacing,
			pixelSpacingMmY: pxSpacing,
			showGrid: true,
			showScaleBar: true,
		});

		// Draw Axial Reference Plane Line (Cyan #06b6d4)
		const centerY = canvas.height / 2;
		ctx.strokeStyle = ROMEXIS_COLORS.axialRgba(0.75);
		ctx.lineWidth = 1.0;
		ctx.setLineDash([3, 3]);
		ctx.beginPath();
		ctx.moveTo(0, centerY);
		ctx.lineTo(canvas.width, centerY);
		ctx.stroke();
		ctx.setLineDash([]);

		// 3. Draw Mandibular Canal & Virtual Implant (Only in Implant Mode)
		if (studioMode === "implant") {
			const canalCenterX = centerX + (currentCanal.center.x / pxSpacing);
			const canalCenterY = topY + (currentCanal.center.y / pxSpacing);
			const canalRadiusPx = currentCanal.radiusMm / pxSpacing;
			const safetyRadiusPx = (currentCanal.radiusMm + currentCanal.safetyMarginMm) / pxSpacing;

			// Safety Corridor (Yellow/Red Ring)
			ctx.strokeStyle = nerveAuditResult.isDangerous
				? "rgba(239, 68, 68, 0.9)"
				: nerveAuditResult.isWarning
					? "rgba(245, 158, 11, 0.85)"
					: "rgba(34, 197, 94, 0.65)";
			ctx.lineWidth = 1.5;
			ctx.setLineDash([4, 3]);
			ctx.beginPath();
			ctx.arc(canalCenterX, canalCenterY, safetyRadiusPx, 0, Math.PI * 2);
			ctx.stroke();
			ctx.setLineDash([]);

			// Canal Lumen
			ctx.fillStyle = "rgba(239, 68, 68, 0.35)";
			ctx.strokeStyle = "#ef4444";
			ctx.lineWidth = 2.0;
			ctx.beginPath();
			ctx.arc(canalCenterX, canalCenterY, canalRadiusPx, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();

			// 4. Draw Virtual Implant Caliper Outline with 2.0 mm Safety Halo & Interactive CAD Handles
			const entryPxX = centerX + (currentImplantPose.entryPoint.x / pxSpacing);
			const entryPxY = topY + (currentImplantPose.entryPoint.y / pxSpacing);
			const radiusPx = (currentImplantSpec.diameterMm / 2.0) / pxSpacing;
			const haloRadiusPx = radiusPx + (2.0 / pxSpacing);

			ctx.save();
			ctx.translate(entryPxX, entryPxY);
			ctx.rotate((currentImplantPose.angulationDeg * Math.PI) / 180);

			const lengthPx = currentImplantSpec.lengthMm / pxSpacing;
			const haloLengthPx = lengthPx + (2.0 / pxSpacing);

			const statusStroke = nerveAuditResult.isDangerous
				? "#ef4444"
				: nerveAuditResult.isWarning
					? "#f59e0b"
					: "#10b981";
			const statusFill = nerveAuditResult.isDangerous
				? "rgba(239, 68, 68, 0.45)"
				: nerveAuditResult.isWarning
					? "rgba(245, 158, 11, 0.35)"
					: "rgba(16, 185, 129, 0.35)";

			// 2.0 mm IAN Safety Halo boundary
			ctx.strokeStyle = statusStroke;
			ctx.lineWidth = 1.5;
			ctx.setLineDash([3, 2]);
			ctx.beginPath();
			ctx.moveTo(-haloRadiusPx, -2.0 / pxSpacing);
			ctx.lineTo(haloRadiusPx, -2.0 / pxSpacing);
			ctx.lineTo(haloRadiusPx * 0.7, haloLengthPx);
			ctx.lineTo(-haloRadiusPx * 0.7, haloLengthPx);
			ctx.closePath();
			ctx.stroke();
			ctx.setLineDash([]);

			// Implant Platform Cap Bar
			ctx.fillStyle = "#94a3b8";
			ctx.fillRect(-radiusPx - 1, -2, (radiusPx + 1) * 2, 3);

			// Tapered Implant Body
			ctx.fillStyle = statusFill;
			ctx.strokeStyle = statusStroke;
			ctx.lineWidth = 2.0;

			ctx.beginPath();
			ctx.moveTo(-radiusPx, 0);
			ctx.lineTo(radiusPx, 0);
			ctx.lineTo(radiusPx * 0.7, lengthPx);
			ctx.lineTo(-radiusPx * 0.7, lengthPx);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();

			// Central Axis with depth tick marks
			ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
			ctx.lineWidth = 1.0;
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.lineTo(0, lengthPx);
			ctx.stroke();

			// Interactive CAD Handles (Entry Point / Apex)
			// Platform entry handle (Blue circle)
			ctx.fillStyle = "#38bdf8";
			ctx.strokeStyle = "#ffffff";
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();

			// Apex angulation handle (White circle with status stroke)
			ctx.fillStyle = "#ffffff";
			ctx.strokeStyle = statusStroke;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.arc(0, lengthPx, 4.0, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();

			ctx.restore();

			// 5. Direct Clearance Distance Line from Apex to Canal / Sinus
			const apexPxX = entryPxX + (lengthPx * Math.sin((currentImplantPose.angulationDeg * Math.PI) / 180));
			const apexPxY = entryPxY + (lengthPx * Math.cos((currentImplantPose.angulationDeg * Math.PI) / 180));

			ctx.save();
			ctx.strokeStyle = statusStroke;
			ctx.lineWidth = 1.2;
			ctx.setLineDash([2, 2]);
			ctx.beginPath();
			ctx.moveTo(apexPxX, apexPxY);
			ctx.lineTo(canalCenterX, canalCenterY);
			ctx.stroke();
			ctx.setLineDash([]);

			// Clearance label badge along distance vector
			const midLineX = (apexPxX + canalCenterX) / 2;
			const midLineY = (apexPxY + canalCenterY) / 2;
			ctx.fillStyle = "rgba(9, 9, 11, 0.9)";
			ctx.strokeStyle = statusStroke;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.roundRect(midLineX - 22, midLineY - 8, 44, 16, 3);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = "#ffffff";
			ctx.font = "bold 9px monospace";
			ctx.textAlign = "center";
			ctx.fillText(`${nerveAuditResult.netClearanceToCanalWallMm.toFixed(1)} мм`, midLineX, midLineY + 3.5);
			ctx.restore();
		}

		ctx.restore();
	}, [activeCrossSection, currentCanal, currentImplantPose, currentImplantSpec, nerveAuditResult, studioMode, transforms.cross_section, maximizedViewport, viewLayout]);

	// ─── INTERACTIVE PANORAMA CLICK & SCRUB TO JUMP TO CROSS-SECTION ──────────
	const handlePanoMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
		if (crossSections.length === 0 || !panoCanvasRef.current) return;
		setIsDraggingPano(true);
		const { normX } = getCanvasPointerPos(e.currentTarget, e.clientX, e.clientY);
		const panoX = normX * (panoCanvasRef.current.width - 1);
		const closestIdx = findNearestCrossSectionIndexByPanoX(
			panoX,
			panoCanvasRef.current.width,
			crossSections,
			archCurve.totalArcLengthMm,
		);
		setActiveCrossSectionIdx(closestIdx);
		const targetSlice = crossSections[closestIdx];
		if (targetSlice) {
			setCrosshairMm(targetSlice.centerPointMm);
		}
	}, [crossSections, archCurve.totalArcLengthMm]);

	const handlePanoMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!isDraggingPano || crossSections.length === 0 || !panoCanvasRef.current) return;
		const { normX } = getCanvasPointerPos(e.currentTarget, e.clientX, e.clientY);
		const panoX = normX * (panoCanvasRef.current.width - 1);
		const closestIdx = findNearestCrossSectionIndexByPanoX(
			panoX,
			panoCanvasRef.current.width,
			crossSections,
			archCurve.totalArcLengthMm,
		);
		setActiveCrossSectionIdx(closestIdx);
		const targetSlice = crossSections[closestIdx];
		if (targetSlice) {
			setCrosshairMm(targetSlice.centerPointMm);
		}
	}, [isDraggingPano, crossSections, archCurve.totalArcLengthMm]);

	const handlePanoMouseUp = useCallback(() => {
		setIsDraggingPano(false);
	}, []);

	// ─── INTERACTIVE CROSS-SECTION IMPLANT DRAG & DROP ────────────────────────
	const handleCrossSectionMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
		if (studioMode !== "implant" || !activeCrossSection || !crossSectionCanvasRef.current) return;
		const canvas = crossSectionCanvasRef.current;
		const { x, y } = getCanvasPointerPos(canvas, e.clientX, e.clientY);
		const pxSpacing = activeCrossSection.pixelSpacingMm || 0.25;
		const centerX = canvas.width / 2;
		const topY = 20;

		const entryPxX = centerX + (implantEntryXOffsetMm / pxSpacing);
		const entryPxY = topY + (implantEntryDepthMm / pxSpacing);
		const angRad = (implantAngulationDeg * Math.PI) / 180;
		const lengthPx = currentImplantSpec.lengthMm / pxSpacing;
		const apexPxX = entryPxX + lengthPx * Math.sin(angRad);
		const apexPxY = entryPxY + lengthPx * Math.cos(angRad);

		const distToEntry = Math.hypot(x - entryPxX, y - entryPxY);
		const distToApex = Math.hypot(x - apexPxX, y - apexPxY);

		if (distToEntry <= 14) {
			setDragImplantPart("entry");
			setCrossSectionDragStart({
				clientX: e.clientX,
				clientY: e.clientY,
				startX: implantEntryXOffsetMm,
				startY: implantEntryDepthMm,
				startAng: implantAngulationDeg,
			});
			return;
		}
		if (distToApex <= 14) {
			setDragImplantPart("apex");
			setCrossSectionDragStart({
				clientX: e.clientX,
				clientY: e.clientY,
				startX: implantEntryXOffsetMm,
				startY: implantEntryDepthMm,
				startAng: implantAngulationDeg,
			});
			return;
		}

		const seg = pointToSegmentDistance2D({ x, y }, { x: entryPxX, y: entryPxY }, { x: apexPxX, y: apexPxY });
		const radiusPx = (currentImplantSpec.diameterMm / 2.0) / pxSpacing;
		if (seg.distance <= radiusPx + 8) {
			setDragImplantPart("body");
			setCrossSectionDragStart({
				clientX: e.clientX,
				clientY: e.clientY,
				startX: implantEntryXOffsetMm,
				startY: implantEntryDepthMm,
				startAng: implantAngulationDeg,
			});
		}
	}, [studioMode, activeCrossSection, implantEntryXOffsetMm, implantEntryDepthMm, implantAngulationDeg, currentImplantSpec]);

	const handleCrossSectionMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!dragImplantPart || !crossSectionDragStart || !activeCrossSection || !crossSectionCanvasRef.current) return;
		const canvas = crossSectionCanvasRef.current;
		const pxSpacing = activeCrossSection.pixelSpacingMm || 0.25;
		const dxPx = e.clientX - crossSectionDragStart.clientX;
		const dyPx = e.clientY - crossSectionDragStart.clientY;

		if (dragImplantPart === "entry" || dragImplantPart === "body") {
			const newX = Math.max(-8.0, Math.min(8.0, crossSectionDragStart.startX + dxPx * pxSpacing));
			const newY = Math.max(0.0, Math.min(15.0, crossSectionDragStart.startY + dyPx * pxSpacing));
			setImplantEntryXOffsetMm(Number(newX.toFixed(1)));
			setImplantEntryDepthMm(Number(newY.toFixed(1)));
		} else if (dragImplantPart === "apex") {
			const { x, y } = getCanvasPointerPos(canvas, e.clientX, e.clientY);
			const centerX = canvas.width / 2;
			const topY = 20;
			const entryPxX = centerX + (implantEntryXOffsetMm / pxSpacing);
			const entryPxY = topY + (implantEntryDepthMm / pxSpacing);

			const relX = x - entryPxX;
			const relY = y - entryPxY;
			if (Math.hypot(relX, relY) > 8) {
				const angleRad = Math.atan2(relX, relY);
				const angleDeg = Math.round((angleRad * 180) / Math.PI);
				const clampedAngle = Math.max(-30, Math.min(30, angleDeg));
				setImplantAngulationDeg(clampedAngle);
			}
		}
	}, [dragImplantPart, crossSectionDragStart, activeCrossSection, implantEntryXOffsetMm, implantEntryDepthMm]);

	const handleCrossSectionMouseUp = useCallback(() => {
		setDragImplantPart(null);
		setCrossSectionDragStart(null);
	}, []);

	// ─── 1-CLICK TOOTH SELECTION & AUTO-CENTERING ──────────────────────────────
	const handleSelectTooth = useCallback((toothFdi: number) => {
		if (crossSections.length > 0) {
			const idx = crossSections.findIndex(
				(s) => Number.parseInt(s.nearestToothFdi, 10) === toothFdi,
			);
			if (idx >= 0) {
				setActiveCrossSectionIdx(idx);
				const targetSlice = crossSections[idx];
				if (targetSlice) {
					setCrosshairMm(targetSlice.centerPointMm);
				}
				return;
			}
		}
		const anchor = archCurve.anchors.find((a) => Number.parseInt(a.toothFdi, 10) === toothFdi);
		if (anchor) {
			setCrosshairMm((prev) => ({ x: anchor.positionMm.x, y: anchor.positionMm.y, z: prev.z }));
		}
	}, [crossSections, archCurve.anchors]);

	// ─── INTERACTIVE CROSSHAIR DRAGGING & WHEEL NAVIGATION ────────────────────
	const handleCanvasMouseDown = useCallback((plane: MprPlane, e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!volume) return;
		const canvas = e.currentTarget;
		const { x, y, normX, normY } = getCanvasPointerPos(canvas, e.clientX, e.clientY);
		const pointerPx = { x, y };

		// CAD Handle Hit Testing: Check if user clicked on any Ruler or Angle handle on this plane
		const projectedRulers = rulers
			.filter((r) => r.plane === plane)
			.map((r) => ({
				id: r.id,
				plane: r.plane,
				startPx: worldMmToSlicePx(r.startMm, plane, volume),
				endPx: worldMmToSlicePx(r.endMm, plane, volume),
			}));

		const projectedAngles = angles
			.filter((a) => a.plane === plane)
			.map((a) => ({
				id: a.id,
				plane: a.plane,
				startPx: worldMmToSlicePx(a.startMm, plane, volume),
				vertexPx: worldMmToSlicePx(a.vertexMm, plane, volume),
				endPx: worldMmToSlicePx(a.endMm, plane, volume),
			}));

		const handleHit = hitTestMeasurementHandle(pointerPx, projectedRulers, projectedAngles, 10);
		if (handleHit) {
			setDraggingMeasurementHandle({
				type: handleHit.type,
				id: handleHit.id,
				handleIndex: handleHit.handleIndex,
				plane,
			});
			setSelectedMeasurement({
				type: handleHit.type,
				id: handleHit.id,
			});
			return;
		}

		// 1. Shift + Left Click or Rotate tool -> In-plane Oblique Rotation
		if (e.shiftKey || activeTool === "rotate") {
			const vox = worldMmToVoxel(crosshairMm, volume);
			const zPx = volume.dimensions.depth - 1 - vox.z;
			const centerPx = plane === "axial"
				? { x: vox.x, y: vox.y }
				: plane === "coronal"
				? { x: vox.x, y: zPx }
				: { x: vox.y, y: zPx };
			const rotDeg = plane === "axial"
				? obliqueAngles.axialAngleDeg
				: plane === "coronal"
				? obliqueAngles.coronalTiltDeg
				: obliqueAngles.sagittalTiltDeg;

			setIsShiftRotating({
				plane,
				centerPx,
				startPointerPx: pointerPx,
				initialAngleDeg: rotDeg,
			});
			return;
		}

		// 1b. Window/Level Tool Drag
		if (activeTool === "window_level") {
			setIsDraggingWL({
				startX: e.clientX,
				startY: e.clientY,
				startWW: windowWidth,
				startWL: windowLevel,
			});
			return;
		}

		// 1c. Pan Tool Drag
		if (activeTool === "pan" || e.button === 1) {
			const currentTransform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;
			setIsPanning({
				plane,
				startX: e.clientX,
				startY: e.clientY,
				startPanX: currentTransform.panX,
				startPanY: currentTransform.panY,
			});
			return;
		}

		// 1d. Zoom Tool Click / Drag
		if (activeTool === "zoom") {
			const zoomDelta = e.altKey ? 0.85 : 1.15;
			setTransforms((prev) => ({
				...prev,
				[plane]: {
					...prev[plane],
					zoom: Math.max(0.5, Math.min(8.0, prev[plane].zoom * zoomDelta)),
				},
			}));
			return;
		}

		// 1e. Ruler / Distance Caliper Tool
		if (activeTool === "ruler") {
			const currentTransform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;
			const startMm = mapCanvasPointerToWorldMmWithTransform(
				pointerPx,
				{ width: canvas.width, height: canvas.height },
				plane,
				crosshairMm,
				obliqueAngles,
				currentTransform,
				volume,
			);
			setActiveRuler({ plane, startMm, currentMm: startMm });
			setSelectedMeasurement(null);
			return;
		}

		// 1e-angle. Angle / Protractor CAD Tool (3-click creation: Start -> Vertex -> End)
		if (activeTool === "angle") {
			const currentTransform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;
			const pointMm = mapCanvasPointerToWorldMmWithTransform(
				pointerPx,
				{ width: canvas.width, height: canvas.height },
				plane,
				crosshairMm,
				obliqueAngles,
				currentTransform,
				volume,
			);

			if (!activeAngle) {
				// Step 1: Place first arm endpoint
				setActiveAngle({ plane, step: 1, startMm: pointMm, currentMm: pointMm });
				setSelectedMeasurement(null);
				showToast("Угломер: укажите вершину угла (точка перегиба)", "info");
				return;
			}

			if (activeAngle.plane === plane && activeAngle.step === 1) {
				// Step 2: Fix vertex point
				setActiveAngle({
					plane,
					step: 2,
					startMm: activeAngle.startMm,
					vertexMm: pointMm,
					currentMm: pointMm,
				});
				showToast("Угломер: укажите конец второго плеча угла", "info");
				return;
			}

			if (activeAngle.plane === plane && activeAngle.step === 2) {
				// Step 3: Complete angle measurement
				const vertex = activeAngle.vertexMm ?? pointMm;
				const angleDeg = calculateAngleBetween3Points3D(activeAngle.startMm, vertex, pointMm);
				const newAngle: CbctAngleMeasurement = {
					id: `angle-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
					plane,
					startMm: activeAngle.startMm,
					vertexMm: vertex,
					endMm: pointMm,
					angleDeg,
				};
				setAngles((prev) => [...prev, newAngle]);
				setSelectedMeasurement({ type: "angle", id: newAngle.id });
				setActiveAngle(null);
				showToast(`Угол зафиксирован: ${angleDeg.toFixed(1)}°`, "success");
				return;
			}
		}

		// 1f. HU Tissue Density Probe Tool
		if (activeTool === "probe") {
			const currentTransform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;
			const pointMm = mapCanvasPointerToWorldMmWithTransform(
				pointerPx,
				{ width: canvas.width, height: canvas.height },
				plane,
				crosshairMm,
				obliqueAngles,
				currentTransform,
				volume,
			);
			const v = worldMmToVoxel(pointMm, volume);
			const hu = sampleVoxelHU(v.x, v.y, v.z, volume);
			const tissue = getTissueNameFromHU(hu);
			const misch = hu >= 1250 ? "D1" : hu >= 850 ? "D2" : hu >= 350 ? "D3" : hu >= 150 ? "D4" : "D5";
			const label = `${hu > 0 ? "+" : ""}${hu} HU (${misch} • ${tissue})`;
			const newProbe: CbctProbeMarker = {
				id: `probe-${Date.now()}`,
				plane,
				worldMm: pointMm,
				hu,
				tissueName: label,
			};
			setProbeMarkers((prev) => [...prev, newProbe]);
			setActiveProbe(newProbe);
			showToast(`Замер плотности: ${label}`, "info");
			return;
		}

		// Check hit on existing nerve nodes (allows selecting & dragging in 'nerve' or 'crosshair' tools)
		if (nervePoints.length > 0 && (activeTool === "nerve" || activeTool === "crosshair")) {
			const currentTransform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;
			const pointMm = mapCanvasPointerToWorldMmWithTransform(
				pointerPx,
				{ width: canvas.width, height: canvas.height },
				plane,
				crosshairMm,
				obliqueAngles,
				currentTransform,
				volume,
			);
			const hitIdx = hitTestNerveNode3D(pointMm, nervePoints, 3.5);
			if (hitIdx >= 0) {
				setSelectedNerveNodeIdx(hitIdx);
				setIsDraggingNerveNode(hitIdx);
				showToast(`Выбран 3D-узел нерва #${hitIdx + 1} (перетащите для коррекции трассы)`, "info");
				return;
			}
		}

		// 1g. Mandibular Canal / Nerve Tracer Tool (IAN with 2.0 mm Safety Margin)
		if (activeTool === "nerve") {
			const currentTransform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;
			const pointMm = mapCanvasPointerToWorldMmWithTransform(
				pointerPx,
				{ width: canvas.width, height: canvas.height },
				plane,
				crosshairMm,
				obliqueAngles,
				currentTransform,
				volume,
			);
			setNervePoints((prev) => [...prev, pointMm]);
			setSelectedNerveNodeIdx(nervePoints.length);
			showToast(`Добавлен 3D-узел нерва #${nervePoints.length + 1} (Z = ${pointMm.z.toFixed(1)} мм)`, "success");
			return;
		}

		// 2. Click on rotation handle knobs
		const vox = worldMmToVoxel(crosshairMm, volume);
		const zPx = volume.dimensions.depth - 1 - vox.z;
		const centerPx = plane === "axial"
			? { x: vox.x, y: vox.y }
			: plane === "coronal"
			? { x: vox.x, y: zPx }
			: { x: vox.y, y: zPx };
		const rotDeg = plane === "axial"
			? obliqueAngles.axialAngleDeg
			: plane === "coronal"
			? obliqueAngles.coronalTiltDeg
			: obliqueAngles.sagittalTiltDeg;

		const handles = getRotationHandles(plane, canvas.width, canvas.height, centerPx, 65, rotDeg);
		const hitHandle = hitTestRotationHandle(pointerPx, handles, 14);
		if (hitHandle) {
			setActiveRotationHandle({ plane, handle: hitHandle.position, centerPx });
			return;
		}

		// 3. Normal Crosshair Translation Drag
		setIsDraggingCrosshair(plane);
		const dims = volume.dimensions;
		setCrosshairMm((prev) => {
			const v = worldMmToVoxel(prev, volume);
			if (plane === "axial") {
				const vx = Math.round(normX * (dims.width - 1));
				const vy = Math.round(normY * (dims.height - 1));
				return voxelToWorldMm({ x: vx, y: vy, z: v.z }, volume);
			}
			if (plane === "coronal") {
				const vx = Math.round(normX * (dims.width - 1));
				const vz = Math.round((1 - normY) * (dims.depth - 1));
				return voxelToWorldMm({ x: vx, y: v.y, z: vz }, volume);
			}
			// Sagittal
			const vy = Math.round(normX * (dims.height - 1));
			const vz = Math.round((1 - normY) * (dims.depth - 1));
			return voxelToWorldMm({ x: v.x, y: vy, z: vz }, volume);
		});
	}, [volume, crosshairMm, obliqueAngles, activeTool, windowWidth, windowLevel, transforms, nervePoints, rulers, angles, activeAngle]);

	const handleCanvasMouseMove = useCallback((plane: MprPlane, e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!volume) return;
		const canvas = e.currentTarget;
		const { x, y, normX, normY } = getCanvasPointerPos(canvas, e.clientX, e.clientY);
		const pointerPx = { x, y };

		// 0-cad. Measurement Handle Drag
		if (draggingMeasurementHandle && draggingMeasurementHandle.plane === plane) {
			const currentTransform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;
			const currentMm = mapCanvasPointerToWorldMmWithTransform(
				pointerPx,
				{ width: canvas.width, height: canvas.height },
				plane,
				crosshairMm,
				obliqueAngles,
				currentTransform,
				volume,
			);
			if (draggingMeasurementHandle.type === "ruler") {
				setRulers((prev) =>
					prev.map((r) => {
						if (r.id !== draggingMeasurementHandle.id) return r;
						const newStart = draggingMeasurementHandle.handleIndex === 0 ? currentMm : r.startMm;
						const newEnd = draggingMeasurementHandle.handleIndex === 1 ? currentMm : r.endMm;
						const newDist = Math.hypot(newEnd.x - newStart.x, newEnd.y - newStart.y, newEnd.z - newStart.z);
						return { ...r, startMm: newStart, endMm: newEnd, distanceMm: Number(newDist.toFixed(1)) };
					}),
				);
				return;
			}
			if (draggingMeasurementHandle.type === "angle") {
				setAngles((prev) =>
					prev.map((a) => {
						if (a.id !== draggingMeasurementHandle.id) return a;
						const newStart = draggingMeasurementHandle.handleIndex === 0 ? currentMm : a.startMm;
						const newVertex = draggingMeasurementHandle.handleIndex === 1 ? currentMm : a.vertexMm;
						const newEnd = draggingMeasurementHandle.handleIndex === 2 ? currentMm : a.endMm;
						const newAngleDeg = calculateAngleBetween3Points3D(newStart, newVertex, newEnd);
						return { ...a, startMm: newStart, vertexMm: newVertex, endMm: newEnd, angleDeg: newAngleDeg };
					}),
				);
				return;
			}
		}

		// 0. Nerve Node Drag
		if (isDraggingNerveNode !== null && isDraggingNerveNode >= 0 && isDraggingNerveNode < nervePoints.length) {
			const currentTransform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;
			const pointMm = mapCanvasPointerToWorldMmWithTransform(
				pointerPx,
				{ width: canvas.width, height: canvas.height },
				plane,
				crosshairMm,
				obliqueAngles,
				currentTransform,
				volume,
			);
			setNervePoints((prev) => {
				const next = [...prev];
				if (isDraggingNerveNode >= 0 && isDraggingNerveNode < next.length) {
					next[isDraggingNerveNode] = pointMm;
				}
				return next;
			});
			return;
		}

		// 0a. Window/Level Drag
		if (isDraggingWL) {
			const dx = e.clientX - isDraggingWL.startX;
			const dy = e.clientY - isDraggingWL.startY;
			setWindowWidth(Math.max(100, Math.min(10000, Math.round(isDraggingWL.startWW + dx * 8))));
			setWindowLevel(Math.max(-1000, Math.min(4000, Math.round(isDraggingWL.startWL - dy * 4))));
			return;
		}

		// 0b. Viewport Pan Drag
		if (isPanning && isPanning.plane === plane) {
			const dx = e.clientX - isPanning.startX;
			const dy = e.clientY - isPanning.startY;
			setTransforms((prev) => ({
				...prev,
				[plane]: {
					...prev[plane],
					panX: isPanning.startPanX + dx,
					panY: isPanning.startPanY + dy,
				},
			}));
			return;
		}

		// 0c. Ruler Drag
		if (activeRuler && activeRuler.plane === plane) {
			const currentTransform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;
			const currentMm = mapCanvasPointerToWorldMmWithTransform(
				pointerPx,
				{ width: canvas.width, height: canvas.height },
				plane,
				crosshairMm,
				obliqueAngles,
				currentTransform,
				volume,
			);
			setActiveRuler((prev) => (prev ? { ...prev, currentMm } : null));
			return;
		}

		// 0c-angle. Active Angle Drawing
		if (activeAngle && activeAngle.plane === plane) {
			const currentTransform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;
			const currentMm = mapCanvasPointerToWorldMmWithTransform(
				pointerPx,
				{ width: canvas.width, height: canvas.height },
				plane,
				crosshairMm,
				obliqueAngles,
				currentTransform,
				volume,
			);
			setActiveAngle((prev) => (prev ? { ...prev, currentMm } : null));
			return;
		}

		// 1. Shift Drag Rotation
		if (isShiftRotating && isShiftRotating.plane === plane) {
			const newAngle = calculateAngleFromShiftDrag(
				isShiftRotating.centerPx,
				pointerPx,
				isShiftRotating.startPointerPx,
				isShiftRotating.initialAngleDeg,
			);
			setObliqueAngles((prev) => ({
				...prev,
				...(plane === "axial"
					? { axialAngleDeg: newAngle }
					: plane === "coronal"
					? { coronalTiltDeg: newAngle }
					: { sagittalTiltDeg: newAngle }),
			}));
			return;
		}

		// 2. Rotation Handle Drag
		if (activeRotationHandle && activeRotationHandle.plane === plane) {
			const newAngle = calculateAngleFromHandleDrag(
				activeRotationHandle.centerPx,
				pointerPx,
				activeRotationHandle.handle,
			);
			setObliqueAngles((prev) => ({
				...prev,
				...(plane === "axial"
					? { axialAngleDeg: newAngle }
					: plane === "coronal"
					? { coronalTiltDeg: newAngle }
					: { sagittalTiltDeg: newAngle }),
			}));
			return;
		}

		// 3. Normal Crosshair Drag
		if (isDraggingCrosshair === plane) {
			const dims = volume.dimensions;
			setCrosshairMm((prev) => {
				const v = worldMmToVoxel(prev, volume);
				if (plane === "axial") {
					const vx = Math.round(normX * (dims.width - 1));
					const vy = Math.round(normY * (dims.height - 1));
					return voxelToWorldMm({ x: vx, y: vy, z: v.z }, volume);
				}
				if (plane === "coronal") {
					const vx = Math.round(normX * (dims.width - 1));
					const vz = Math.round((1 - normY) * (dims.depth - 1));
					return voxelToWorldMm({ x: vx, y: v.y, z: vz }, volume);
				}
				const vy = Math.round(normX * (dims.height - 1));
				const vz = Math.round((1 - normY) * (dims.depth - 1));
				return voxelToWorldMm({ x: v.x, y: vy, z: vz }, volume);
			});
			return;
		}

		// 4. Hover Detection for Rotation Handles
		if (!isShiftRotating && !activeRotationHandle && !isDraggingCrosshair && isDraggingNerveNode === null && !draggingMeasurementHandle) {
			const vox = worldMmToVoxel(crosshairMm, volume);
			const zPx = volume.dimensions.depth - 1 - vox.z;
			const centerPx = plane === "axial"
				? { x: vox.x, y: vox.y }
				: plane === "coronal"
				? { x: vox.x, y: zPx }
				: { x: vox.y, y: zPx };

			const rotDeg = plane === "axial"
				? obliqueAngles.axialAngleDeg
				: plane === "coronal"
				? obliqueAngles.coronalTiltDeg
				: obliqueAngles.sagittalTiltDeg;

			const handles = getRotationHandles(plane, canvas.width, canvas.height, centerPx, 65, rotDeg);
			const hitHandle = hitTestRotationHandle(pointerPx, handles, 14);
			if (hitHandle) {
				setHoveredHandle({ plane, handle: hitHandle.position });
			} else if (hoveredHandle?.plane === plane) {
				setHoveredHandle(null);
			}

			// 5. Hover Detection for Measurement Handles
			const projectedRulers = rulers
				.filter((r) => r.plane === plane)
				.map((r) => ({
					id: r.id,
					plane: r.plane,
					startPx: worldMmToSlicePx(r.startMm, plane, volume),
					endPx: worldMmToSlicePx(r.endMm, plane, volume),
				}));
			const projectedAngles = angles
				.filter((a) => a.plane === plane)
				.map((a) => ({
					id: a.id,
					plane: a.plane,
					startPx: worldMmToSlicePx(a.startMm, plane, volume),
					vertexPx: worldMmToSlicePx(a.vertexMm, plane, volume),
					endPx: worldMmToSlicePx(a.endMm, plane, volume),
				}));
			const mHandleHit = hitTestMeasurementHandle(pointerPx, projectedRulers, projectedAngles, 10);
			if (mHandleHit) {
				setHoveredMeasurementHandle({
					type: mHandleHit.type,
					id: mHandleHit.id,
					handleIndex: mHandleHit.handleIndex,
					plane,
				});
			} else if (hoveredMeasurementHandle?.plane === plane) {
				setHoveredMeasurementHandle(null);
			}
		}
	}, [volume, isDraggingWL, isPanning, isShiftRotating, activeRotationHandle, isDraggingCrosshair, isDraggingNerveNode, draggingMeasurementHandle, activeAngle, activeRuler, crosshairMm, obliqueAngles, hoveredHandle, hoveredMeasurementHandle, transforms, nervePoints, rulers, angles]);

	const handleCanvasMouseUp = useCallback(() => {
		if (draggingMeasurementHandle) {
			setDraggingMeasurementHandle(null);
		}
		if (activeRuler) {
			const dist = Math.hypot(
				activeRuler.currentMm.x - activeRuler.startMm.x,
				activeRuler.currentMm.y - activeRuler.startMm.y,
				activeRuler.currentMm.z - activeRuler.startMm.z,
			);
			if (dist > 0.3) {
				const newRuler: CbctMeasurementRuler = {
					id: `ruler-${Date.now()}`,
					plane: activeRuler.plane,
					startMm: activeRuler.startMm,
					endMm: activeRuler.currentMm,
					distanceMm: Number(dist.toFixed(1)),
				};
				setRulers((prev) => [...prev, newRuler]);
				setSelectedMeasurement({ type: "ruler", id: newRuler.id });
			}
			setActiveRuler(null);
		}
		setIsDraggingCrosshair(null);
		setActiveRotationHandle(null);
		setIsShiftRotating(null);
		setIsPanning(null);
		setIsDraggingWL(null);
		setIsDraggingNerveNode(null);
	}, [activeRuler, draggingMeasurementHandle]);

	// ─── KEYBOARD SHORTCUTS FOR NERVE TRACE & NODE EDITING ───────────────────
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null;
			if (
				target &&
				(target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.tagName === "SELECT" ||
					target.isContentEditable)
			) {
				return;
			}

			if (e.key === "Backspace" || e.key === "Delete") {
				if (selectedNerveNodeIdx !== null && selectedNerveNodeIdx >= 0 && selectedNerveNodeIdx < nervePoints.length) {
					e.preventDefault();
					setNervePoints((prev) => prev.filter((_, idx) => idx !== selectedNerveNodeIdx));
					setSelectedNerveNodeIdx(null);
					showToast("Удален выбранный 3D-узел нерва", "info");
				} else if (nervePoints.length > 0 && activeTool === "nerve") {
					e.preventDefault();
					setNervePoints((prev) => prev.slice(0, -1));
					showToast("Удалена последняя точка нерва (Backspace)", "info");
				}
			} else if (e.key === "Escape") {
				if (selectedNerveNodeIdx !== null) {
					setSelectedNerveNodeIdx(null);
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, selectedNerveNodeIdx, nervePoints.length, activeTool]);

	const handleCanvasDoubleClick = useCallback((plane: MprPlane, e: React.MouseEvent<HTMLCanvasElement>) => {
		e.preventDefault();
		e.stopPropagation();
		if (!volume) return;
		const canvas = e.currentTarget;
		const { x, y, normX, normY } = getCanvasPointerPos(canvas, e.clientX, e.clientY);
		const pointerPx = { x, y };
		const vox = worldMmToVoxel(crosshairMm, volume);
		const zPx = volume.dimensions.depth - 1 - vox.z;
		const centerPx = plane === "axial"
			? { x: vox.x, y: vox.y }
			: plane === "coronal"
			? { x: vox.x, y: zPx }
			: { x: vox.y, y: zPx };

		if (hitTestCrosshairCenter(pointerPx, centerPx, 18)) {
			// 1-Click / Double-Click quick reset of angle back to 0.0°
			setObliqueAngles((prev) => resetPlaneObliqueAngle(prev, plane));
			return;
		}
	}, [volume, crosshairMm]);

	const getCanvasCursor = useCallback((plane: MprPlane) => {
		if (draggingMeasurementHandle) return "grabbing";
		if (hoveredMeasurementHandle?.plane === plane) return "grab";
		if (isShiftRotating?.plane === plane || activeRotationHandle?.plane === plane) return "grabbing";
		if (hoveredHandle?.plane === plane) return "grab";
		if (activeTool === "pan") return "grab";
		if (activeTool === "zoom") return "zoom-in";
		if (activeTool === "window_level") return "col-resize";
		if (activeTool === "rotate") return "crosshair";
		if (activeTool === "ruler") return "crosshair";
		if (activeTool === "angle") return "crosshair";
		if (activeTool === "probe") return "help";
		return "crosshair";
	}, [isShiftRotating, activeRotationHandle, hoveredHandle, activeTool, draggingMeasurementHandle, hoveredMeasurementHandle]);

	// Mouse Wheel -> Cursor-anchored Zoom (0.5x - 5.0x) or Shift+Wheel for Slices
	const handleCanvasWheel = useCallback((viewport: CbctViewportType, e: React.WheelEvent<HTMLCanvasElement>) => {
		e.preventDefault();
		if (e.shiftKey && volume) {
			const delta = e.deltaY > 0 ? -1 : 1;
			setCrosshairMm((prev) => {
				const vox = worldMmToVoxel(prev, volume);
				if (viewport === "axial" || viewport === "panoramic") {
					const newZ = Math.max(0, Math.min(volume.dimensions.depth - 1, vox.z + delta));
					return voxelToWorldMm({ x: vox.x, y: vox.y, z: newZ }, volume);
				}
				if (viewport === "coronal") {
					const newY = Math.max(0, Math.min(volume.dimensions.height - 1, vox.y + delta));
					return voxelToWorldMm({ x: vox.x, y: newY, z: vox.z }, volume);
				}
				if (viewport === "sagittal") {
					const newX = Math.max(0, Math.min(volume.dimensions.width - 1, vox.x + delta));
					return voxelToWorldMm({ x: newX, y: vox.y, z: vox.z }, volume);
				}
				if (viewport === "cross_section") {
					setActiveCrossSectionIdx((prev) => Math.max(0, Math.min(crossSections.length - 1, prev + delta)));
					return prev;
				}
				return prev;
			});
			return;
		}

		// Cursor-anchored smooth zoom
		const canvas = e.currentTarget;
		const { x, y } = getCanvasPointerPos(canvas, e.clientX, e.clientY);
		const cursorPx = { x, y };

		setTransforms((prev) => ({
			...prev,
			[viewport]: applyCursorZoom(prev[viewport] ?? DEFAULT_VIEWPORT_TRANSFORM, cursorPx, e.deltaY, 0.5, 5.0),
		}));
	}, [volume, crossSections.length]);

	// ─── 1-CLICK CLINICAL EXPORT TO FORM 043/U & EMR SNAPSHOT ──────────────────
	const handleExportToEmr = useCallback(async () => {
		const targetTooth = Number.parseInt(activeCrossSection?.nearestToothFdi ?? "46", 10) || 46;
		const pixelSpacing = volume?.spacingMm.x ?? 0.4;

		// Clean viewport snapshot
		const activeCanvas =
			activeViewport === "cross_section"
				? crossSectionCanvasRef.current
				: activeViewport === "panoramic"
					? panoCanvasRef.current
					: activeViewport === "coronal"
						? coronalCanvasRef.current
						: activeViewport === "sagittal"
							? sagittalCanvasRef.current
							: axialCanvasRef.current;

		if (activeCanvas) {
			await exportCleanViewportSnapshot(
				activeCanvas,
				`Снимок КЛКТ (FDI #${targetTooth})`,
				pixelSpacing,
				{
					patientName: patientDisplayName,
					studyDate: study?.studyDate || new Date().toLocaleDateString("ru-RU"),
					targetToothFdi: targetTooth,
				},
			);
		}

		const diaryText = generateForm043CbctDiary({
			toothFdi: targetTooth,
			implantPose: currentImplantPose,
			canal: currentCanal,
			envelope: currentEnvelope,
			huSampling: huSamplingResult,
		});

		navigator.clipboard.writeText(diaryText).catch(() => {});
		if (onApplyToDiary043) {
			onApplyToDiary043(diaryText);
		}
		showToast(`📷 Снимок и протокол КЛКТ-планирования (FDI #${targetTooth}) перенесены в карту 043/у`, "success");
	}, [
		activeCrossSection,
		activeViewport,
		volume,
		patientDisplayName,
		study,
		currentImplantPose,
		currentCanal,
		currentEnvelope,
		huSamplingResult,
		onApplyToDiary043,
	]);

	const handleExportForm043Diary = handleExportToEmr;

	// ─── 1-CLICK A4 PRINTABLE PDF PLANNING PROTOCOL EXPORT ────────────────────
	const handleExportPdfReport = useCallback(async () => {
		const targetTooth = Number.parseInt(activeCrossSection?.nearestToothFdi ?? "46", 10) || 46;
		const pixelSpacing = volume?.spacingMm.x ?? 0.4;

		// Capture clean snapshots of all available viewports
		const axialSnap = axialCanvasRef.current
			? await exportCleanViewportSnapshot(
					axialCanvasRef.current,
					`Аксиальный срез (Z = ${crosshairMm.z.toFixed(1)} мм)`,
					pixelSpacing,
					{
						patientName: patientDisplayName,
						studyDate: study?.studyDate || new Date().toLocaleDateString("ru-RU"),
						targetToothFdi: targetTooth,
					},
				)
			: undefined;

		const panoSnap = panoCanvasRef.current
			? await exportCleanViewportSnapshot(
					panoCanvasRef.current,
					"Панорамная реконструкция (ОПТГ)",
					pixelSpacing,
					{
						patientName: patientDisplayName,
						studyDate: study?.studyDate || new Date().toLocaleDateString("ru-RU"),
						targetToothFdi: targetTooth,
					},
				)
			: undefined;

		const crossSectionSnap = crossSectionCanvasRef.current
			? await exportCleanViewportSnapshot(
					crossSectionCanvasRef.current,
					`Кросс-секция ложа FDI #${targetTooth}`,
					pixelSpacing,
					{
						patientName: patientDisplayName,
						studyDate: study?.studyDate || new Date().toLocaleDateString("ru-RU"),
						targetToothFdi: targetTooth,
					},
				)
			: undefined;

		const sagittalSnap = sagittalCanvasRef.current
			? await exportCleanViewportSnapshot(
					sagittalCanvasRef.current,
					`Сагиттальный срез (X = ${crosshairMm.x.toFixed(1)} мм)`,
					pixelSpacing,
					{
						patientName: patientDisplayName,
						studyDate: study?.studyDate || new Date().toLocaleDateString("ru-RU"),
						targetToothFdi: targetTooth,
					},
				)
			: coronalCanvasRef.current
				? await exportCleanViewportSnapshot(
						coronalCanvasRef.current,
						`Фронтальный срез (Y = ${crosshairMm.y.toFixed(1)} мм)`,
						pixelSpacing,
						{
							patientName: patientDisplayName,
							studyDate: study?.studyDate || new Date().toLocaleDateString("ru-RU"),
							targetToothFdi: targetTooth,
						},
					)
				: undefined;

		const diaryText = generateForm043CbctDiary({
			toothFdi: targetTooth,
			implantPose: currentImplantPose,
			canal: currentCanal,
			envelope: currentEnvelope,
			huSampling: huSamplingResult,
		});

		const reportData = buildCbctReportData({
			patientName: patientDisplayName || study?.patientName || "Пациент КЛКТ",
			doctorName: "Врач-стоматолог-хирург-имплантолог",
			studyDate: study?.studyDate || new Date().toLocaleDateString("ru-RU"),
			targetToothFdi: targetTooth,
			implantPose: currentImplantPose,
			mischResult: mischClassification,
			huSampling: huSamplingResult,
			containment: boneContainmentResult,
			nerveSafety: nerveAuditResult,
			snapshots: {
				axial: axialSnap ? { title: "Аксиальный срез (Z)", dataUrl: axialSnap } : undefined,
				panoramic: panoSnap ? { title: "Панорамная реконструкция (ОПТГ)", dataUrl: panoSnap } : undefined,
				crossSection: crossSectionSnap
					? { title: `Кросс-секция ложа FDI #${targetTooth}`, dataUrl: crossSectionSnap }
					: undefined,
				sagittal: sagittalSnap ? { title: "Сагиттальный срез", dataUrl: sagittalSnap } : undefined,
			},
			diary043Text: diaryText,
		});

		openCbctReportPrintWindow(reportData);
		showToast(
			`📄 Протокол КЛКТ-планирования для зуба FDI #${targetTooth} сформирован для печати / PDF (A4)`,
			"success",
		);
	}, [
		activeCrossSection,
		volume,
		crosshairMm,
		patientDisplayName,
		study,
		currentImplantPose,
		currentCanal,
		currentEnvelope,
		huSamplingResult,
		mischClassification,
		boneContainmentResult,
		nerveAuditResult,
	]);

	if (!isOpen) return null;

	// Helper render functions for each viewport
	const renderAxialViewport = (extraClassName = "flex-1 flex flex-col") => (
		<div
			onDoubleClick={() => handleToggleMaximize("axial")}
			onPointerDownCapture={() => setActiveViewport("axial")}
			className={`relative bg-black rounded-md overflow-hidden transition-all min-h-0 w-full h-full ${
				activeViewport === "axial"
					? "ring-1 ring-cyan-500/50 border border-cyan-500/80 shadow-cyan-950/30"
					: "border border-zinc-800"
			} ${extraClassName}`}
			data-testid="cbct-viewport-container-axial"
		>
			<div className="flex-1 flex items-center justify-center min-h-0 relative w-full h-full">
				<canvas
					ref={axialCanvasRef}
					onDoubleClick={(e) => handleCanvasDoubleClick("axial", e)}
					onMouseDown={(e) => handleCanvasMouseDown("axial", e)}
					onMouseMove={(e) => handleCanvasMouseMove("axial", e)}
					onMouseUp={handleCanvasMouseUp}
					onWheel={(e) => handleCanvasWheel("axial", e)}
					style={{ cursor: getCanvasCursor("axial") }}
					className="w-full h-full object-contain"
				/>
				<CbctViewportHud
					viewportType="axial"
					coordinateMm={{ z: crosshairMm.z }}
					slabMode={slabMode}
					slabThicknessMm={slabThicknessMm}
					pixelSpacingMm={volume?.spacingMm.x ?? 0.4}
					obliqueAngleDeg={obliqueAngles.axialAngleDeg}
					onResetAngle={() => setObliqueAngles((prev) => resetPlaneObliqueAngle(prev, "axial"))}
					isMaximized={maximizedViewport === "axial"}
					onToggleMaximize={() => handleToggleMaximize("axial")}
					zoomFactor={transforms.axial?.zoom}
				/>
				{/* Dental Arch Auto-Detect & Toggle Buttons */}
				<div className="absolute top-2 right-12 z-20 flex items-center gap-1.5">
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							handleAutoDetectArch();
						}}
						className="px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1 bg-[#09090b]/90 hover:bg-zinc-900 text-purple-300 hover:text-purple-200 border border-purple-500/50 shadow-xs transition-all cursor-pointer"
						title="Авто-поиск зубной дуги ОПТГ по плотности эмали"
						data-testid="cbct-btn-auto-arch"
						id="cbct-auto-arch-btn"
					>
						<span>⚙️ Авто-дуга</span>
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							setShowDentalArch((prev) => !prev);
						}}
						className={`px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1 border transition-all ${
							showDentalArch
								? "bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-xs"
								: "bg-[#09090b]/80 text-zinc-400 hover:text-zinc-200 border-zinc-800 hover:border-zinc-700"
						}`}
						title="Отображение зубной дуги ОПТГ"
						data-testid="cbct-toggle-dental-arch"
					>
						<span>🦷 Дуга ОПТГ</span>
					</button>
				</div>
			</div>
		</div>
	);

	const renderCoronalViewport = (extraClassName = "flex-1 flex flex-col") => (
		<div
			onDoubleClick={() => handleToggleMaximize("coronal")}
			onPointerDownCapture={() => setActiveViewport("coronal")}
			className={`relative bg-black rounded-md overflow-hidden transition-all min-h-0 w-full h-full ${
				activeViewport === "coronal"
					? "ring-1 ring-orange-500/50 border border-orange-500/80 shadow-orange-950/30"
					: "border border-zinc-800"
			} ${extraClassName}`}
			data-testid="cbct-viewport-container-coronal"
		>
			<div className="flex-1 flex items-center justify-center min-h-0 relative w-full h-full">
				<canvas
					ref={coronalCanvasRef}
					onDoubleClick={(e) => handleCanvasDoubleClick("coronal", e)}
					onMouseDown={(e) => handleCanvasMouseDown("coronal", e)}
					onMouseMove={(e) => handleCanvasMouseMove("coronal", e)}
					onMouseUp={handleCanvasMouseUp}
					onWheel={(e) => handleCanvasWheel("coronal", e)}
					style={{ cursor: getCanvasCursor("coronal") }}
					className="w-full h-full object-contain"
				/>
				<CbctViewportHud
					viewportType="coronal"
					coordinateMm={{ y: crosshairMm.y }}
					slabMode={slabMode}
					slabThicknessMm={slabThicknessMm}
					pixelSpacingMm={volume?.spacingMm.x ?? 0.4}
					obliqueAngleDeg={obliqueAngles.coronalTiltDeg}
					onResetAngle={() => setObliqueAngles((prev) => resetPlaneObliqueAngle(prev, "coronal"))}
					isMaximized={maximizedViewport === "coronal"}
					onToggleMaximize={() => handleToggleMaximize("coronal")}
					zoomFactor={transforms.coronal?.zoom}
				/>
			</div>
		</div>
	);

	const renderSagittalViewport = (extraClassName = "flex-1 flex flex-col") => (
		<div
			onDoubleClick={() => handleToggleMaximize("sagittal")}
			onPointerDownCapture={() => setActiveViewport("sagittal")}
			className={`relative bg-black rounded-md overflow-hidden transition-all min-h-0 w-full h-full ${
				activeViewport === "sagittal"
					? "ring-1 ring-emerald-500/50 border border-emerald-500/80 shadow-emerald-950/30"
					: "border border-zinc-800"
			} ${extraClassName}`}
			data-testid="cbct-viewport-container-sagittal"
		>
			<div className="flex-1 flex items-center justify-center min-h-0 relative w-full h-full">
				<canvas
					ref={sagittalCanvasRef}
					onDoubleClick={(e) => handleCanvasDoubleClick("sagittal", e)}
					onMouseDown={(e) => handleCanvasMouseDown("sagittal", e)}
					onMouseMove={(e) => handleCanvasMouseMove("sagittal", e)}
					onMouseUp={handleCanvasMouseUp}
					onWheel={(e) => handleCanvasWheel("sagittal", e)}
					style={{ cursor: getCanvasCursor("sagittal") }}
					className="w-full h-full object-contain"
				/>
				<CbctViewportHud
					viewportType="sagittal"
					coordinateMm={{ x: crosshairMm.x }}
					slabMode={slabMode}
					slabThicknessMm={slabThicknessMm}
					pixelSpacingMm={volume?.spacingMm.y ?? 0.4}
					obliqueAngleDeg={obliqueAngles.sagittalTiltDeg}
					onResetAngle={() => setObliqueAngles((prev) => resetPlaneObliqueAngle(prev, "sagittal"))}
					isMaximized={maximizedViewport === "sagittal"}
					onToggleMaximize={() => handleToggleMaximize("sagittal")}
					zoomFactor={transforms.sagittal?.zoom}
				/>
			</div>
		</div>
	);

	const renderPanoramicViewport = (extraClassName = "flex-1 flex flex-col") => (
		<div
			onDoubleClick={() => handleToggleMaximize("panoramic")}
			onPointerDownCapture={() => setActiveViewport("panoramic")}
			className={`relative bg-black rounded-md overflow-hidden transition-all min-h-0 w-full h-full ${
				activeViewport === "panoramic"
					? "ring-1 ring-purple-500/50 border border-purple-500/80 shadow-purple-950/30"
					: "border border-zinc-800"
			} ${extraClassName}`}
			data-testid="cbct-viewport-container-panoramic"
		>
			<div className="flex-1 flex items-center justify-center min-h-0 relative w-full h-full">
				<canvas
					ref={panoCanvasRef}
					onMouseDown={handlePanoMouseDown}
					onMouseMove={handlePanoMouseMove}
					onMouseUp={handlePanoMouseUp}
					onMouseLeave={handlePanoMouseUp}
					onWheel={(e) => handleCanvasWheel("panoramic", e)}
					className="w-full h-full object-contain cursor-pointer"
					data-testid="cbct-panorama-canvas"
				/>
				<CbctViewportHud
					viewportType="panoramic"
					coordinateMm={{ z: crosshairMm.z }}
					slabMode={slabMode}
					slabThicknessMm={archCurve.focalTroughThicknessMm}
					pixelSpacingMm={volume?.spacingMm.x ?? 0.4}
					isMaximized={maximizedViewport === "panoramic"}
					onToggleMaximize={() => handleToggleMaximize("panoramic")}
					zoomFactor={transforms.panoramic?.zoom}
				/>
			</div>
		</div>
	);

	const renderCrossSectionMaximizedViewport = () => (
		<div
			onDoubleClick={() => handleToggleMaximize("cross_section")}
			onPointerDownCapture={() => setActiveViewport("cross_section")}
			className={`relative bg-black rounded-md overflow-hidden transition-all flex-1 flex flex-col min-h-0 w-full h-full ${
				activeViewport === "cross_section"
					? "ring-1 ring-yellow-500/50 border border-yellow-500/80 shadow-yellow-950/30"
					: "border border-zinc-800"
			}`}
			data-testid="cbct-viewport-container-cross-section"
		>
			<div className="flex-1 flex items-center justify-center min-h-0 relative w-full h-full">
				<canvas
					ref={crossSectionCanvasRef}
					onMouseDown={handleCrossSectionMouseDown}
					onMouseMove={handleCrossSectionMouseMove}
					onMouseUp={handleCrossSectionMouseUp}
					onMouseLeave={handleCrossSectionMouseUp}
					onWheel={(e) => handleCanvasWheel("cross_section", e)}
					className="w-full h-full object-contain cursor-grab active:cursor-grabbing"
					data-testid="cbct-cross-section-canvas"
				/>
				<CbctViewportHud
					viewportType="cross_section"
					toothFdi={activeCrossSection?.nearestToothFdi}
					sliceIndex={activeCrossSectionIdx}
					totalSlices={crossSections.length}
					pixelSpacingMm={activeCrossSection?.pixelSpacingMm ?? 0.25}
					isMaximized={true}
					onToggleMaximize={() => handleToggleMaximize("cross_section")}
					zoomFactor={transforms.cross_section?.zoom}
				/>
			</div>
		</div>
	);

	return createPortal(
		<div
			id={`cbct-mpr-studio-modal-${modalId}`}
			data-testid="cbct-mpr-implant-studio-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby={`cbct-studio-title-${modalId}`}
			data-theme="dark"
			className="fixed inset-0 z-[100] flex flex-col bg-[#09090b] text-zinc-100 font-sans select-none overflow-hidden w-full max-w-full h-full min-w-0"
			style={{ color: "#f4f4f5", backgroundColor: "#09090b" }}
		>
			{/* Real DICOM Ingestion Controls (Hidden file inputs for Left Tool Dock) */}
			<input
				type="file"
				multiple
				ref={folderInputRef}
				onChange={handleSelectDicomFolder}
				data-testid="cbct-dicom-files-input"
				className="hidden"
				aria-hidden="true"
			/>
			<input
				type="file"
				accept=".zip"
				ref={zipInputRef}
				onChange={handleSelectDicomZip}
				data-testid="cbct-dicom-zip-input"
				className="hidden"
				aria-hidden="true"
			/>

			{/* ─── HEADER BAR (TIER 1 CLEAN STATUS & WORKSPACE SWITCHER — TRUE DARK MANDATE) ─── */}
			<header
				data-theme="dark"
				className="min-h-14 px-2 sm:px-4 py-1.5 bg-[#09090b] border-b border-zinc-800 flex items-center justify-between shrink-0 gap-2 sm:gap-3 text-zinc-200 overflow-x-auto min-w-0 w-full max-w-full"
				style={{ color: "#f4f4f5", backgroundColor: "#09090b" }}
			>
				{/* Left: 3D Cube Icon + Title + Quiet Study Status */}
				<div className="flex items-center gap-2.5 shrink-0 min-w-max">
					<div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
						<Box className="w-4 h-4" />
					</div>
					<div className="flex flex-col min-w-0">
						<div className="flex items-center gap-2">
							<h2
								id={`cbct-studio-title-${modalId}`}
								className="text-xs font-bold text-zinc-100 tracking-wide flex items-center gap-1.5 whitespace-nowrap"
								style={{ color: "#f4f4f5" }}
							>
								3D CBCT Studio
								<span
									className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 font-mono border border-zinc-800"
									style={{ color: "#d4d4d8" }}
								>
									Romexis 6 / Ez3D-i
								</span>
							</h2>
						</div>
						<p
							className="text-[10px] text-zinc-400 whitespace-nowrap"
							data-testid="cbct-patient-metadata-badge"
							id="cbct-patient-metadata-badge"
							style={{ color: "#a1a1aa" }}
						>
							{patientDisplayName || "Барабаш С.В."} • {loadedSliceCount > 0 ? loadedSliceCount : 400} срезов • {volume ? volume.spacingMm.x.toFixed(1) : "0.2"} мм изотропный воксель
						</p>
					</div>
				</div>

				{/* Center: 4 Clean Workspace Modes (Romexis Segmented Switcher) */}
				<div className="flex items-center bg-[#000000] p-1 rounded-lg border border-zinc-800 shrink-0 gap-1">
					<button
						type="button"
						onClick={() => handleSelectStudioMode("diagnostic")}
						className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap min-h-[44px] flex items-center gap-1.5 transition-colors ${
							studioMode === "diagnostic"
								? "bg-zinc-900 text-cyan-400 border border-cyan-500/60 shadow-xs"
								: "bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
						}`}
						data-testid="cbct-mode-diagnostic-btn"
						title="Режим общей 3D диагностики (панель свернута)"
					>
						<Search className="w-3.5 h-3.5 text-cyan-400" />
						<span>Диагностика</span>
					</button>
					<button
						type="button"
						onClick={() => handleSelectStudioMode("implant")}
						className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap min-h-[44px] flex items-center gap-1.5 transition-colors ${
							studioMode === "implant"
								? "bg-zinc-900 text-cyan-400 border border-cyan-500/60 shadow-xs"
								: "bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
						}`}
						data-testid="cbct-mode-implant-btn"
						title="Планирование имплантации и контроль нерва"
					>
						<Compass className="w-3.5 h-3.5 text-cyan-400" />
						<span>Имплантация</span>
					</button>
					<button
						type="button"
						onClick={() => handleSelectStudioMode("endo")}
						className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap min-h-[44px] flex items-center gap-1.5 transition-colors ${
							studioMode === "endo"
								? "bg-zinc-900 text-cyan-400 border border-cyan-500/60 shadow-xs"
								: "bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
						}`}
						data-testid="cbct-mode-endo-btn"
						title="Эндодонтия: корневые каналы и апексы"
					>
						<Activity className="w-3.5 h-3.5 text-cyan-400" />
						<span>Эндо</span>
					</button>
					<button
						type="button"
						onClick={() => handleSelectStudioMode("tmj")}
						className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap min-h-[44px] flex items-center gap-1.5 transition-colors ${
							studioMode === "tmj"
								? "bg-zinc-900 text-cyan-400 border border-cyan-500/60 shadow-xs"
								: "bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
						}`}
						data-testid="cbct-mode-tmj-btn"
						title="ВНЧС: суставные головки и ямки"
					>
						<Ruler className="w-3.5 h-3.5 text-cyan-400" />
						<span>ВНЧС</span>
					</button>
				</div>

				{/* Right: Layout Switcher, Sidebar Toggle with Indicator, Maximize, Close */}
				<div className="flex items-center gap-2 shrink-0">
					{/* 1-Click Auto Dental Arch Extraction Button */}
					<button
						type="button"
						onClick={handleAutoDetectArch}
						className="px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap min-h-[44px] flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-purple-300 hover:text-purple-200 border border-purple-500/50 hover:border-purple-400 shadow-xs transition-colors cursor-pointer"
						data-testid="cbct-btn-auto-arch"
						title="Авто-поиск зубной дуги ОПТГ по плотности эмали"
					>
						<span>⚙️ Авто-дуга</span>
					</button>

					{/* 1-Click Clinical EMR Snapshot Export Button */}
					<button
						type="button"
						onClick={handleExportToEmr}
						className="px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap min-h-[44px] flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-cyan-400 hover:text-cyan-300 border border-cyan-500/50 hover:border-cyan-400 shadow-xs transition-colors cursor-pointer"
						data-testid="cbct-btn-export-emr"
						title="Сохранить снимок и протокол планирования в карту 043/у"
					>
						<Camera className="w-3.5 h-3.5" />
						<span>📷 В ЭМК</span>
					</button>

					{/* 1-Click Printable PDF Report Export Button */}
					<button
						type="button"
						onClick={handleExportPdfReport}
						className="px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap min-h-[44px] flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-amber-300 hover:text-amber-200 border border-amber-500/50 hover:border-amber-400 shadow-xs transition-colors cursor-pointer"
						data-testid="cbct-btn-export-pdf"
						title="Сформировать печатный A4 протокол планирования / PDF"
					>
						<FileText className="w-3.5 h-3.5" />
						<span>📄 PDF Отчет</span>
					</button>

					{/* Layout Switcher */}
					<div className="flex items-center bg-[#000000] p-1 rounded-lg border border-zinc-800 shrink-0 gap-1">
						{maximizedViewport !== null ? (
							<button
								type="button"
								onClick={() => setMaximizedViewport(null)}
								className="px-3.5 py-2 rounded-md text-xs font-bold whitespace-nowrap min-h-[44px] flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-cyan-400 border border-cyan-500/60 shadow-xs transition-colors"
								data-testid="cbct-restore-grid-btn"
								title="Восстановить сетку окон"
							>
								<Minimize2 className="w-4 h-4" />
								<span>Восстановить (2x2)</span>
							</button>
						) : (
							<>
								<button
									type="button"
									onClick={() => setViewLayout("quad_view")}
									className={`px-3.5 py-2 rounded-md text-xs font-bold whitespace-nowrap min-h-[44px] flex items-center gap-1.5 transition-colors ${
										viewLayout === "quad_view"
											? "bg-zinc-900 text-cyan-400 border border-cyan-500/60 shadow-xs"
											: "bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
									}`}
									data-testid="cbct-layout-quad-btn"
									title="Сетка 4 окна (2x2)"
								>
									<Grid2X2 className="w-4 h-4" />
									<span>4 окна</span>
								</button>
								<button
									type="button"
									onClick={() => setViewLayout("layout_1_plus_3")}
									className={`px-3.5 py-2 rounded-md text-xs font-bold whitespace-nowrap min-h-[44px] flex items-center gap-1.5 transition-colors ${
										viewLayout === "layout_1_plus_3"
											? "bg-zinc-900 text-cyan-400 border border-cyan-500/60 shadow-xs"
											: "bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
									}`}
									data-testid="cbct-layout-1plus3-btn"
									title="Раскладка 1+3 (Доминантный аксиал)"
								>
									<Columns2 className="w-4 h-4" />
									<span>1+3</span>
								</button>
							</>
						)}
					</div>

					{/* Sidebar Toggle Button with Colored Indicator */}
					<button
						type="button"
						onClick={() => setIsSidebarOpen((prev) => !prev)}
						className={`px-3.5 py-2 rounded-md text-xs font-bold whitespace-nowrap min-h-[44px] flex items-center gap-2 transition-colors border shadow-xs ${
							isSidebarOpen
								? "bg-zinc-900 text-cyan-400 border-cyan-500/60"
								: "bg-[#09090b] text-zinc-400 border-zinc-800 hover:text-zinc-100 hover:bg-zinc-900"
						}`}
						title={isSidebarOpen ? "Скрыть боковую панель" : "Показать боковую панель"}
						data-testid="cbct-toggle-sidebar-btn"
					>
						<span className={`w-2 h-2 rounded-full transition-colors ${isSidebarOpen ? "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" : "bg-zinc-500"}`} />
						<Columns2 className="w-4 h-4" />
						<span>Панель</span>
					</button>

					{/* Window Control Actions: Maximize & Close with comfortable spacing */}
					<div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-zinc-800 shrink-0">
						{/* Modal Maximize / Fullscreen Button */}
						<button
							type="button"
							onClick={handleToggleFullscreenModal}
							className={`w-11 h-11 min-h-[44px] min-w-[44px] rounded-md flex items-center justify-center border transition-colors ${
								isFullscreen
									? "bg-zinc-900 text-cyan-400 border-cyan-500/60 shadow-xs"
									: "bg-[#09090b] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border-zinc-800"
							}`}
							title={isFullscreen ? "Свернуть из полноэкранного режима" : "Развернуть на весь экран"}
							aria-label="Полноэкранный режим"
							data-testid="cbct-modal-maximize-btn"
						>
							{isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
						</button>

						{/* Modal Close Button */}
						<button
							type="button"
							onClick={onClose}
							className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-md bg-[#09090b] hover:bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center border border-zinc-800 transition-colors"
							aria-label="Закрыть КЛКТ студию"
							data-testid="close-cbct-mpr-3d-studio-btn"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>
			</header>

			{/* ─── MOBILE VIEWPORT TABS (VISIBLE ONLY ON < LG SCREENS) ─────────── */}
			<div className="lg:hidden flex items-center bg-[#09090b] border-b border-zinc-800 p-1.5 shrink-0 gap-1.5 overflow-x-auto min-w-0 w-full max-w-full">
				<button
					type="button"
					onClick={() => setMobileActiveTab("axial")}
					data-testid="cbct-mobile-tab-axial"
					className={`px-3.5 py-2 rounded-md text-xs font-bold whitespace-nowrap min-h-[44px] shrink-0 transition-colors flex items-center gap-1.5 border ${
						mobileActiveTab === "axial"
							? "bg-zinc-900 text-cyan-400 border-cyan-500/60 shadow-xs"
							: "bg-[#09090b] text-zinc-400 border-zinc-800 hover:bg-zinc-900 hover:text-zinc-100"
					}`}
				>
					<span className="w-2 h-2 rounded-full bg-cyan-400" />
					Аксиальный (Z)
				</button>
				<button
					type="button"
					onClick={() => setMobileActiveTab("coronal")}
					data-testid="cbct-mobile-tab-coronal"
					className={`px-3.5 py-2 rounded-md text-xs font-bold whitespace-nowrap min-h-[44px] shrink-0 transition-colors flex items-center gap-1.5 border ${
						mobileActiveTab === "coronal"
							? "bg-zinc-900 text-orange-400 border-orange-500/60 shadow-xs"
							: "bg-[#09090b] text-zinc-400 border-zinc-800 hover:bg-zinc-900 hover:text-zinc-100"
					}`}
				>
					<span className="w-2 h-2 rounded-full bg-orange-500" />
					Фронтальный (Y)
				</button>
				<button
					type="button"
					onClick={() => setMobileActiveTab("sagittal")}
					data-testid="cbct-mobile-tab-sagittal"
					className={`px-3.5 py-2 rounded-md text-xs font-bold whitespace-nowrap min-h-[44px] shrink-0 transition-colors flex items-center gap-1.5 border ${
						mobileActiveTab === "sagittal"
							? "bg-zinc-900 text-emerald-400 border-emerald-500/60 shadow-xs"
							: "bg-[#09090b] text-zinc-400 border-zinc-800 hover:bg-zinc-900 hover:text-zinc-100"
					}`}
				>
					<span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
					<span className="whitespace-nowrap">• Сагитт. (X)</span>
				</button>
				<button
					type="button"
					onClick={() => setMobileActiveTab("panoramic")}
					data-testid="cbct-mobile-tab-panoramic"
					className={`px-3.5 py-2 rounded-md text-xs font-bold whitespace-nowrap min-h-[44px] shrink-0 transition-colors flex items-center gap-1.5 border ${
						mobileActiveTab === "panoramic"
							? "bg-zinc-900 text-purple-400 border-purple-500/60 shadow-xs"
							: "bg-[#09090b] text-zinc-400 border-zinc-800 hover:bg-zinc-900 hover:text-zinc-100"
					}`}
				>
					<span className="w-2 h-2 rounded-full bg-purple-500" />
					ОПТГ
				</button>
				<button
					type="button"
					onClick={() => {
						setMobileActiveTab("planner");
						setIsSidebarOpen(true);
					}}
					data-testid="cbct-mobile-tab-planner"
					className={`px-3.5 py-2 rounded-md text-xs font-bold whitespace-nowrap min-h-[44px] shrink-0 transition-colors flex items-center gap-1.5 border ${
						mobileActiveTab === "planner"
							? "bg-zinc-900 text-yellow-400 border-yellow-500/60 shadow-xs"
							: "bg-[#09090b] text-zinc-400 border-zinc-800 hover:bg-zinc-900 hover:text-zinc-100"
					}`}
				>
					<span className="w-2 h-2 rounded-full bg-yellow-400" />
					{studioMode === "implant" ? "Имплант-план" : studioMode === "endo" ? "Эндо & HU" : studioMode === "tmj" ? "ВНЧС & HU" : "Срезы & HU"}
				</button>
			</div>

			{/* ─── MAIN WORKSPACE ROW (LEFT TOOL DOCK + VIEWPORTS + SIDEBAR) ─── */}
			<div className="flex-1 flex flex-row min-h-0 min-w-0 w-full max-w-full overflow-hidden relative">
				<CbctLeftToolDock
					activeTool={activeTool}
					onSelectTool={setActiveTool}
					slabMode={slabMode}
					onSelectSlabMode={setSlabMode}
					slabThicknessMm={slabThicknessMm}
					onChangeSlabThicknessMm={setSlabThicknessMm}
					activePresetId={activePreset}
					onSelectPreset={handleSelectPreset}
					onResetAll={handleResetAll}
					invertColors={invertColors}
					onToggleInvertColors={() => setInvertColors((prev) => !prev)}
					onOpenDicomFolder={() => folderInputRef.current?.click()}
					onOpenDicomZip={() => zipInputRef.current?.click()}
				/>

				{/* ─── VIEWPORTS & SIDEBAR GRID (COLS 1..12) ───────────────────── */}
				<div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-1 p-1 bg-[#000000] min-h-0 min-w-0 w-full max-w-full overflow-hidden">
				{/* ─── VIEWPORTS DISPLAY (COLS 1..8 ON DESKTOP OR 1..12 WHEN SIDEBAR COLLAPSED) ─── */}
				<div className={`${isSidebarOpen ? "lg:col-span-8" : "lg:col-span-12"} ${mobileActiveTab === "planner" ? "hidden lg:flex" : "flex-1 flex flex-col"} min-h-0 min-w-0 w-full h-full transition-all`}>
					{maximizedViewport !== null ? (
						<div className="flex-1 flex flex-col min-h-0 w-full h-full">
							{maximizedViewport === "axial" && renderAxialViewport("flex-1 flex flex-col w-full h-full")}
							{maximizedViewport === "coronal" && renderCoronalViewport("flex-1 flex flex-col w-full h-full")}
							{maximizedViewport === "sagittal" && renderSagittalViewport("flex-1 flex flex-col w-full h-full")}
							{maximizedViewport === "panoramic" && renderPanoramicViewport("flex-1 flex flex-col w-full h-full")}
							{maximizedViewport === "cross_section" && renderCrossSectionMaximizedViewport()}
						</div>
					) : viewLayout === "layout_1_plus_3" ? (
						<div className="flex-1 grid grid-cols-12 gap-1 min-h-0 min-w-0 w-full h-full">
							<div className={`col-span-12 lg:col-span-8 min-h-0 min-w-0 w-full h-full ${mobileActiveTab === "axial" ? "flex-1 flex flex-col" : "hidden lg:flex lg:flex-col"}`}>
								{renderAxialViewport("flex-1 flex flex-col w-full h-full")}
							</div>
							<div className="col-span-12 lg:col-span-4 min-h-0 min-w-0 w-full h-full flex flex-col lg:grid lg:grid-rows-3 gap-1">
								{renderCoronalViewport(mobileActiveTab === "coronal" ? "flex-1 flex flex-col w-full h-full" : "hidden lg:flex lg:flex-col")}
								{renderSagittalViewport(mobileActiveTab === "sagittal" ? "flex-1 flex flex-col w-full h-full" : "hidden lg:flex lg:flex-col")}
								{renderPanoramicViewport(mobileActiveTab === "panoramic" ? "flex-1 flex flex-col w-full h-full" : "hidden lg:flex lg:flex-col")}
							</div>
						</div>
					) : (
						<div className="flex-1 grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-2 gap-1 min-h-0 min-w-0 w-full h-full">
							{renderAxialViewport(mobileActiveTab === "axial" ? "flex-1 flex flex-col w-full h-full" : "hidden lg:flex lg:flex-col")}
							{renderCoronalViewport(mobileActiveTab === "coronal" ? "flex-1 flex flex-col w-full h-full" : "hidden lg:flex lg:flex-col")}
							{renderSagittalViewport(mobileActiveTab === "sagittal" ? "flex-1 flex flex-col w-full h-full" : "hidden lg:flex lg:flex-col")}
							{renderPanoramicViewport(mobileActiveTab === "panoramic" ? "flex-1 flex flex-col w-full h-full" : "hidden lg:flex lg:flex-col")}
						</div>
					)}
				</div>

				{/* ─── RIGHT SIDEBAR: DIAGNOSTIC INSPECTOR & IMPLANT PLANNER (COLS 9..12) ─── */}
				{(isSidebarOpen || mobileActiveTab === "planner") && (
					<aside className={`lg:col-span-4 ${isSidebarOpen ? "" : "lg:hidden"} ${mobileActiveTab === "planner" ? "flex-1 flex flex-col min-h-0 w-full min-w-0 h-full" : "hidden lg:flex lg:flex-col"} bg-[#09090b] rounded-md border border-zinc-800 min-h-0 min-w-0 w-full overflow-y-auto p-3 flex flex-col gap-3`}>
						{/* Active Cross-Section Carousel Header */}
						<div className="flex items-center justify-between pb-2 border-b border-zinc-800">
							<div className="flex items-center gap-2">
								<span className="text-xs font-bold text-cyan-400">
									Срез #{activeCrossSection?.sliceIndex ?? 1} из {crossSections.length}
								</span>
								<span className="px-2.5 py-1 rounded bg-zinc-900 text-zinc-100 font-bold text-xs border border-zinc-800">
									Зуб FDI: #{activeCrossSection?.nearestToothFdi ?? "46"}
								</span>
							</div>
							<div className="flex items-center gap-1.5">
								<button
									type="button"
									onClick={() => setActiveCrossSectionIdx((prev) => Math.max(0, prev - 1))}
									className="p-2.5 rounded-md bg-[#09090b] hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 min-h-[44px] min-w-[44px] flex items-center justify-center border border-zinc-800 transition-colors shadow-xs"
									title="Предыдущий срез"
								>
									<ChevronLeft className="w-5 h-5" />
								</button>
								<button
									type="button"
									onClick={() => setActiveCrossSectionIdx((prev) => Math.min(crossSections.length - 1, prev + 1))}
									className="p-2.5 rounded-md bg-[#09090b] hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 min-h-[44px] min-w-[44px] flex items-center justify-center border border-zinc-800 transition-colors shadow-xs"
									title="Следующий срез"
								>
									<ChevronRight className="w-5 h-5" />
								</button>
								<button
									type="button"
									onClick={() => setIsSidebarOpen(false)}
									className="p-2.5 rounded-md bg-[#09090b] hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 min-h-[44px] min-w-[44px] flex items-center justify-center border border-zinc-800 transition-colors shadow-xs ml-1"
									title="Скрыть панель"
									data-testid="cbct-close-sidebar-btn"
								>
									<X className="w-4 h-4" />
								</button>
							</div>
						</div>

					{/* Cross-Section Viewport Canvas */}
					<div
						onDoubleClick={() => handleToggleMaximize("cross_section")}
						className="relative h-56 bg-black rounded-md overflow-hidden border border-zinc-800 flex items-center justify-center shrink-0 w-full"
					>
						<canvas
							ref={crossSectionCanvasRef}
							onMouseDown={handleCrossSectionMouseDown}
							onMouseMove={handleCrossSectionMouseMove}
							onMouseUp={handleCrossSectionMouseUp}
							onMouseLeave={handleCrossSectionMouseUp}
							className="w-full h-full object-contain cursor-grab active:cursor-grabbing"
							data-testid="cbct-cross-section-sidebar-canvas"
						/>
						<CbctViewportHud
							viewportType="cross_section"
							toothFdi={activeCrossSection?.nearestToothFdi}
							sliceIndex={activeCrossSectionIdx}
							totalSlices={crossSections.length}
							pixelSpacingMm={activeCrossSection?.pixelSpacingMm ?? 0.25}
							isMaximized={maximizedViewport === "cross_section"}
							onToggleMaximize={() => handleToggleMaximize("cross_section")}
						/>

						{/* Quick Ridge Measurements Badge (compact matte HUD) */}
						<div className="absolute top-1.5 right-10 px-2 py-0.5 rounded bg-[#09090b]/90 backdrop-blur-sm text-[10px] text-zinc-400 border border-zinc-800 font-mono shadow-xs flex items-center gap-2">
							<span>H: <strong className="text-cyan-400">{activeCrossSection?.corticalCrestHeightMm ?? 14.2} мм</strong></span>
							<span>W: <strong className="text-cyan-400">{activeCrossSection?.alveolarRidgeWidthMm ?? 7.8} мм</strong></span>
						</div>
					</div>

					{/* ─── CONDITIONAL SIDEBAR CONTENT: DIAGNOSTIC / ENDO / TMJ vs IMPLANT ───────── */}
					{studioMode !== "implant" ? (
						<div className="flex flex-col gap-3">
							{/* Diagnostic HU & Tissue Structure Inspector */}
							<div className="p-3 rounded-md bg-[#000000] border border-zinc-800 flex flex-col gap-2">
								<div className="flex items-center justify-between text-xs">
									<span className="font-bold text-zinc-100">Плотность в курсоре:</span>
									<span className="px-2.5 py-1 rounded bg-zinc-900 text-cyan-400 font-mono font-bold border border-cyan-500/60">
										{sampledVoxelHU} HU
									</span>
								</div>
								<div className="text-[11px] text-zinc-400">
									Структура: <strong className="text-zinc-100">{getTissueNameFromHU(sampledVoxelHU)}</strong>
								</div>
								<div className="grid grid-cols-2 gap-1.5 text-[10px] text-zinc-400 pt-1.5 border-t border-zinc-800">
									<div>Эмаль: <span className="font-mono text-zinc-100">+2000..+3000</span></div>
									<div>Кортекс: <span className="font-mono text-zinc-100">+1000..+1800</span></div>
									<div>Спонгиоза: <span className="font-mono text-zinc-100">+300..+800</span></div>
									<div>Пазухи: <span className="font-mono text-zinc-100">-1000..-500</span></div>
								</div>
							</div>

							{/* Radiological Anatomical Inspection Checklist */}
							<div className="p-3 rounded-md bg-[#000000] border border-zinc-800 flex flex-col gap-2">
								<div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
									<Search className="w-4 h-4 text-cyan-400" />
									<span>
										{studioMode === "endo"
											? "Эндодонтический осмотр корней & каналов:"
											: studioMode === "tmj"
											? "Анатомический осмотр суставных головок ВНЧС:"
											: `Анатомический осмотр зоны #${activeCrossSection?.nearestToothFdi ?? "46"}:`}
									</span>
								</div>
								<div className="flex flex-col gap-1.5 text-[11px] text-zinc-400">
									<div className="flex items-center gap-2.5 p-2 rounded bg-[#09090b] border border-zinc-800">
										<Check className="w-4 h-4 text-emerald-400 shrink-0" />
										<span className="text-zinc-100">Кортикальные пластинки & гребень сохранны</span>
									</div>
									<div className="flex items-center gap-2.5 p-2 rounded bg-[#09090b] border border-zinc-800">
										<Check className="w-4 h-4 text-emerald-400 shrink-0" />
										<span className="text-zinc-100">Периодонтальная щель & апексы корней</span>
									</div>
									<div className="flex items-center gap-2.5 p-2 rounded bg-[#09090b] border border-zinc-800">
										<Check className="w-4 h-4 text-emerald-400 shrink-0" />
										<span className="text-zinc-100">Пневматизация синуса / канал IAN</span>
									</div>
								</div>
							</div>

							{/* Fast Switch to Implant Planning Button */}
							<button
								type="button"
								onClick={() => {
									setStudioMode("implant");
									setIsSidebarOpen(true);
								}}
								className="w-full py-2.5 px-4 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-100 hover:text-cyan-300 border border-zinc-800 hover:border-cyan-500/60 text-xs font-bold flex items-center justify-center gap-2 transition-colors min-h-[44px] shadow-xs"
								data-testid="cbct-switch-to-implant-mode-btn"
							>
								<Compass className="w-4 h-4 text-cyan-400" />
								<span>Перейти к планированию имплантата</span>
							</button>
						</div>
					) : (
						<div className="flex flex-col gap-3">
							{/* ─── 1-CLICK TOOTH FORMULA SELECTOR ───────────────────────── */}
							<div className="p-2.5 rounded-md bg-[#000000] border border-zinc-800 flex flex-col gap-1.5">
								<div className="text-[11px] font-bold text-zinc-400 flex items-center justify-between">
									<span>Выбор позиции зуба (FDI):</span>
									<span className="text-cyan-400 font-mono">#{activeCrossSection?.nearestToothFdi ?? "46"}</span>
								</div>
								<div className="flex flex-col gap-1 text-[10px]">
									{/* Upper jaw teeth */}
									<div className="flex items-center justify-between gap-0.5 overflow-x-auto pb-0.5">
										{[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map((fdi) => {
											const isTarget = Number.parseInt(activeCrossSection?.nearestToothFdi ?? "46", 10) === fdi;
											return (
												<button
													key={fdi}
													type="button"
													onClick={() => handleSelectTooth(fdi)}
													className={`px-1 py-1 rounded min-w-[20px] font-mono font-bold text-center transition-colors ${
														isTarget
															? "bg-cyan-500 text-black shadow-xs shadow-cyan-500/50"
															: "bg-[#09090b] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800"
													}`}
												>
													{fdi}
												</button>
											);
										})}
									</div>
									{/* Lower jaw teeth */}
									<div className="flex items-center justify-between gap-0.5 overflow-x-auto pb-0.5">
										{[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map((fdi) => {
											const isTarget = Number.parseInt(activeCrossSection?.nearestToothFdi ?? "46", 10) === fdi;
											return (
												<button
													key={fdi}
													type="button"
													onClick={() => handleSelectTooth(fdi)}
													className={`px-1 py-1 rounded min-w-[20px] font-mono font-bold text-center transition-colors ${
														isTarget
															? "bg-cyan-500 text-black shadow-xs shadow-cyan-500/50"
															: "bg-[#09090b] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800"
													}`}
												>
													{fdi}
												</button>
											);
										})}
									</div>
								</div>
							</div>

							{/* ─── ANATOMICAL SAFETY ALARM BANNER (SINUS / IAN NERVE SENTINEL) ── */}
							{(() => {
								const isMaxilla = (implant3DWorld?.targetToothFdi ?? 46) < 30;
								const anatomyLabel = isMaxilla ? "Гайморова пазуха (Sinus)" : "Зазор до нерва (IAN)";
								const anatomyNorm = isMaxilla ? "Дно пазухи интактно" : "Норма >= 2.0 мм";
								return (
									<div
										className={`p-3 rounded-md border flex items-start gap-2.5 transition-colors ${
											nerveAuditResult.isDangerous
												? "bg-[#2d1215] border-rose-600/80 text-rose-200"
												: nerveAuditResult.isWarning
													? "bg-[#2d2212] border-amber-600/80 text-amber-200"
													: "bg-[#12241b] border-emerald-600/80 text-emerald-200"
										}`}
										data-testid="cbct-nerve-safety-banner"
									>
										{nerveAuditResult.isDangerous ? (
											<ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
										) : nerveAuditResult.isWarning ? (
											<AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
										) : (
											<ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
										)}
										<div className="text-xs flex-1">
											<div className="font-bold flex items-center justify-between">
												<span>{anatomyLabel}: {nerveAuditResult.netClearanceToCanalWallMm.toFixed(1)} мм</span>
												<span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 font-mono">
													{anatomyNorm}
												</span>
											</div>
											<p className="text-[11px] mt-1 opacity-90 leading-tight">
												{isMaxilla && (implant3DWorld?.targetToothFdi === 16 || implant3DWorld?.targetToothFdi === 26)
													? "✅ Зуб 16/26 (Верхняя челюсть): контроль дна гайморовой пазухи. При дефиците высоты показан синус-лифтинг."
													: nerveAuditResult.clinicalMessageRu}
											</p>
										</div>
									</div>
								);
							})()}

							{/* ─── MISCH BONE DENSITY (HU) & DRILLING PROTOCOL ────────────── */}
							<div className="p-3 rounded-md bg-[#000000] border border-zinc-800 flex flex-col gap-2">
								<div className="flex items-center justify-between text-xs">
									<span className="font-bold text-zinc-400">Плотность кости (Misch):</span>
									<span className="px-2 py-1 rounded bg-zinc-900 text-cyan-400 font-bold border border-cyan-500/60">
										Класс {mischClassification.mischClass} ({huSamplingResult.overallMeanHU} HU)
									</span>
								</div>
								<div className="grid grid-cols-3 gap-1.5 text-center text-[10px] bg-[#09090b] p-2 rounded border border-zinc-800">
									<div>
										<div className="text-zinc-400">Кортекс</div>
										<div className="font-mono font-bold text-cyan-400 text-xs">{huSamplingResult.coronalCrestalHU} HU</div>
									</div>
									<div>
										<div className="text-zinc-400">Спонгиоза</div>
										<div className="font-mono font-bold text-cyan-400 text-xs">{huSamplingResult.trabecularCoreHU} HU</div>
									</div>
									<div>
										<div className="text-zinc-400">Апекс</div>
										<div className="font-mono font-bold text-cyan-400 text-xs">{huSamplingResult.apicalBaseHU} HU</div>
									</div>
								</div>
								<div className="text-[11px] text-zinc-400 flex flex-col gap-0.5">
									<div>
										Протокол: <strong className="text-zinc-100">{mischClassification.recommendedDrillingRpm}</strong>.
										{mischClassification.underdrillingRecommended && (
											<span className="text-amber-400 font-semibold ml-1">Недопрепарирование (Underdrilling).</span>
										)}
									</div>
									<div className="text-[10px] text-zinc-500 flex items-center justify-between pt-1 border-t border-zinc-800">
										<span>Торк: <strong className="text-zinc-400">{mischClassification.estimatedInsertionTorqueNcm.expectedNcm} Н·см</strong></span>
										<span>ISQ: <strong className="text-zinc-400">{mischClassification.estimatedIsqScore.expectedIsq}</strong></span>
									</div>
								</div>
							</div>

							{/* ─── 3D MANDIBULAR NERVE TRACER PANEL (IAN 3D SPLINE) ────────── */}
							<div className="p-3 rounded-md bg-[#000000] border border-zinc-800 flex flex-col gap-2">
								<div className="flex items-center justify-between text-xs">
									<span className="font-bold text-zinc-400 flex items-center gap-1.5">
										<Activity className="w-3.5 h-3.5 text-amber-400" />
										3D Трассировка нерва (IAN)
									</span>
									<span className="px-2 py-0.5 rounded bg-zinc-900 text-amber-400 font-mono text-[11px] font-bold border border-amber-500/50">
										{nervePoints.length} узлов • {nerveTotalLengthMm.toFixed(1)} мм
									</span>
								</div>

								<div className="text-[11px] text-zinc-400 bg-[#09090b] p-2 rounded border border-zinc-800 flex flex-col gap-1">
									<div className="flex justify-between items-center">
										<span>Выбранный узел:</span>
										<span className="font-bold font-mono text-zinc-100">
											{selectedNerveNodeIdx !== null ? `Узел #${selectedNerveNodeIdx + 1}` : "—"}
										</span>
									</div>
									<div className="flex justify-between items-center">
										<span>Буфер безопасности:</span>
										<span className="font-bold text-amber-400 font-mono">2.0 мм цилиндр</span>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-1.5">
									<button
										type="button"
										onClick={() => {
											if (selectedNerveNodeIdx !== null && selectedNerveNodeIdx >= 0 && selectedNerveNodeIdx < nervePoints.length) {
												setNervePoints((prev) => prev.filter((_, idx) => idx !== selectedNerveNodeIdx));
												setSelectedNerveNodeIdx(null);
												showToast("Удален выбранный 3D-узел нерва", "info");
											} else if (nervePoints.length > 0) {
												setNervePoints((prev) => prev.slice(0, -1));
												showToast("Удален последний узел нерва", "info");
											}
										}}
										disabled={nervePoints.length === 0}
										className="py-1.5 px-2 rounded-md bg-[#09090b] hover:bg-zinc-900 text-rose-300 hover:text-rose-200 border border-rose-500/30 hover:border-rose-500 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed"
										data-testid="cbct-delete-nerve-node-btn"
										title="Удалить выбранный или последний узел (Backspace)"
									>
										<Trash2 className="w-3.5 h-3.5 text-rose-400" />
										<span>Удалить узел</span>
									</button>

									<button
										type="button"
										onClick={() => {
											setNervePoints([]);
											setSelectedNerveNodeIdx(null);
											showToast("Трасса канала IAN сброшена", "info");
										}}
										disabled={nervePoints.length === 0}
										className="py-1.5 px-2 rounded-md bg-[#09090b] hover:bg-zinc-900 text-amber-300 hover:text-amber-200 border border-amber-500/30 hover:border-amber-500 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed"
										data-testid="cbct-reset-nerve-trace-btn"
										title="Очистить все точки канала нерва"
									>
										<RotateCcw className="w-3.5 h-3.5 text-amber-400" />
										<span>Сброс трассы</span>
									</button>
								</div>
								<div className="text-[10px] text-zinc-500 leading-tight">
									💡 ЛКМ для добавления узлов • Перетаскивание для смещения • Delete для удаления
								</div>
							</div>

							{/* ─── VIRTUAL IMPLANT CALIPER SELECTION ───────────────────────── */}
							<div className="p-3 rounded-md bg-[#000000] border border-zinc-800 flex flex-col gap-2.5">
								<div className="text-xs font-bold text-zinc-400">Выбор имплантата (Библиотека):</div>

								{/* Brand selector */}
								<div className="grid grid-cols-4 gap-1.5">
									{(["straumann", "nobel_biocare", "osstem", "dentium"] as ImplantBrandKey[]).map((b) => (
										<button
											key={b}
											type="button"
											onClick={() => setSelectedBrand(b)}
											className={`py-2 px-1 rounded-md text-xs font-bold capitalize min-h-[44px] transition-colors border flex items-center justify-center ${
												selectedBrand === b
													? "bg-zinc-900 text-cyan-400 border-cyan-500/60 shadow-xs"
													: "bg-[#09090b] text-zinc-400 hover:text-zinc-100 border-zinc-800 hover:bg-zinc-900"
											}`}
										>
											{b === "straumann" ? "Straumann" : b === "nobel_biocare" ? "Nobel" : b === "osstem" ? "Osstem" : "Dentium"}
										</button>
									))}
								</div>

								{/* Diameter & Length Selectors */}
								<div className="grid grid-cols-2 gap-2 text-xs">
									<div>
										<label className="text-[11px] text-zinc-400 block mb-1 font-semibold">Диаметр (мм):</label>
										<select
											value={selectedDiameterMm}
											onChange={(e) => setSelectedDiameterMm(Number.parseFloat(e.target.value))}
											className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-100 min-h-[44px] focus:border-cyan-500 focus:outline-none"
										>
											<option value={3.5}>Ø 3.5 мм (Узкий)</option>
											<option value={4.0}>Ø 4.0 мм (Стандарт)</option>
											<option value={4.3}>Ø 4.3 мм</option>
											<option value={4.5}>Ø 4.5 мм (Широкий)</option>
											<option value={5.0}>Ø 5.0 мм (Молярный)</option>
										</select>
									</div>

									<div>
										<label className="text-[11px] text-zinc-400 block mb-1 font-semibold">Длина (мм):</label>
										<select
											value={selectedLengthMm}
											onChange={(e) => setSelectedLengthMm(Number.parseFloat(e.target.value))}
											className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-100 min-h-[44px] focus:border-cyan-500 focus:outline-none"
										>
											<option value={8.0}>L 8.0 мм</option>
											<option value={10.0}>L 10.0 мм</option>
											<option value={11.5}>L 11.5 мм</option>
											<option value={13.0}>L 13.0 мм</option>
										</select>
									</div>
								</div>

								{/* Angulation Slider */}
								<div className="flex flex-col gap-1 text-xs">
									<div className="flex items-center justify-between text-[11px] text-zinc-400">
										<span>Наклон оси (Tilt):</span>
										<span className="font-mono font-bold text-zinc-100">{implantAngulationDeg}°</span>
									</div>
									<input
										type="range"
										min={-30}
										max={30}
										step={1}
										value={implantAngulationDeg}
										onChange={(e) => setImplantAngulationDeg(Number.parseInt(e.target.value, 10))}
										className="w-full accent-cyan-400 min-h-[44px] py-2 cursor-pointer bg-transparent"
									/>
								</div>

								{/* Horizontal Entry Offset Slider */}
								<div className="flex flex-col gap-1 text-xs">
									<div className="flex items-center justify-between text-[11px] text-zinc-400">
										<span>Смещение X на гребне:</span>
										<span className="font-mono font-bold text-zinc-100">{implantEntryXOffsetMm.toFixed(1)} мм</span>
									</div>
									<input
										type="range"
										min={-5.0}
										max={5.0}
										step={0.5}
										value={implantEntryXOffsetMm}
										onChange={(e) => setImplantEntryXOffsetMm(Number.parseFloat(e.target.value))}
										className="w-full accent-cyan-400 min-h-[44px] py-2 cursor-pointer bg-transparent"
									/>
								</div>

								{/* ─── 1-CLICK CLINICAL ACTION BUTTONS (TIER 1 HOT PATH) ── */}
								<div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
									<button
										type="button"
										onClick={() => {
											showToast(`Имплантат ${currentImplantSpec.brand.toUpperCase()} Ø${currentImplantSpec.diameterMm}x${currentImplantSpec.lengthMm} добавлен в план лечения (#${activeCrossSection?.nearestToothFdi ?? "46"})`, "success");
										}}
										className="w-full py-2.5 px-3 rounded-md bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs flex items-center justify-center gap-2 transition-colors min-h-[44px] shadow-sm shadow-cyan-600/30"
										data-testid="add-implant-to-plan-btn"
									>
										<Check className="w-4 h-4" />
										<span>Добавить в план лечения (18 500 ₽)</span>
									</button>

									<div className="grid grid-cols-3 gap-1.5">
										<button
											type="button"
											onClick={handleExportToEmr}
											className="py-2 px-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-800 hover:border-cyan-500/60 text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors min-h-[44px]"
											data-testid="cbct-btn-export-emr"
											data-testid-legacy="copy-diary-btn"
											title="Копировать снимок и протокол в карту 043/у"
										>
											<Camera className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
											<span>В ЭМК</span>
										</button>
										<button
											type="button"
											onClick={handleExportPdfReport}
											className="py-2 px-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-amber-300 hover:text-amber-200 border border-zinc-800 hover:border-amber-500/60 text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors min-h-[44px]"
											data-testid="cbct-btn-export-pdf"
											title="Сформировать печатный A4 протокол / PDF"
										>
											<FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
											<span>PDF Отчет</span>
										</button>
										<button
											type="button"
											onClick={() => {
												setImplantEntryXOffsetMm(0);
												setImplantEntryDepthMm(2.0);
												setImplantAngulationDeg(0);
												showToast("Положение имплантата центрировано на гребне", "info");
											}}
											className="py-2 px-1.5 rounded-md bg-[#09090b] hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 border border-zinc-800 text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors min-h-[44px]"
											data-testid="reset-center-btn"
											title="Центрировать имплантат на гребне"
										>
											<Compass className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
											<span>Центр</span>
										</button>
									</div>
								</div>
							</div>
						</div>
					)}
				</aside>
			)}
				</div>
			</div>

			{/* ─── BOTTOM STATUS BAR: HOTKEY CHEATSHEET & TELEMETRY ────────── */}
			<CbctHotkeysStatusBar
				activeViewport={activeViewport}
				onToggleHelp={toggleHelp}
				isHelpOpen={isHelpOpen}
				onToggleMaximize={handleToggleMaximizeActive}
				isMaximized={maximizedViewport !== null}
				onTogglePanel={handleTogglePanel}
				isPanelOpen={isSidebarOpen}
			/>
		</div>,
		document.body,
	);
};

