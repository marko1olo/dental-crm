import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	type CbctVoxelVolume,
	type Point3D,
	type SlabProjectionMode,
	type ObliqueRotationAngles,
	type ViewportTransform,
	type CbctMeasurementRuler,
	type CbctAngleMeasurement,
	type CbctViewportType,
	CBCT_HOUNSFIELD_PRESETS,
	DEFAULT_OBLIQUE_ROTATION,
	sampleVoxelHU,
	worldMmToVoxel,
} from "../cbctMprMath.js";
import {
	DEFAULT_MANDIBULAR_ARCH_ANCHORS,
	type CrossSectionSliceData,
	type DentalArchCurve,
	autoDetectDentalArch,
	buildDentalArchCurve,
} from "../dentalCurveEngine.js";
import { getSharedCbctGlContext, disposeSharedCbctGlContext } from "../mpr/webgl/CbctVolumeGlContext.js";
import {
	type ImplantBrandKey,
	type VirtualImplantSpec,
	type CrossSectionImplantPose,
	type MandibularCanalCrossSection,
	type Implant3DWorldProjection,
	STANDARD_IMPLANT_CATALOG,
	auditNerveSafetyMargin,
	calculateApexCoordinates,
	calculateImplant3DWorldPose,
	sampleCrossSectionHUProfile,
} from "../implantSafetyEngine.js";
import {
	calculateSplineLength3DMm,
	interpolateNerveSpline3D,
	project3DNerveToCrossSection,
	type AlveolarRidgeCaliperMeasurement,
} from "../cbctCaliperNerveMath.js";
import { analyzeMischBoneQuality, type HUZoneSampling } from "../boneDensityMischMath.js";
import type { CbctToolMode } from "../CbctLeftToolDock.js";
import { showToast } from "../../GlobalToast.js";
import {
	type StudioMode,
	type ViewLayoutMode,
	type NerveCanalSide,
	getDefaultViewportTransforms,
} from "../mpr/cbctStudioTypes.js";
import { useCbctSliceRenderer } from "../mpr/useCbctSliceRenderer.js";
import { useCbctInteractionHandlers } from "../mpr/useCbctInteractionHandlers.js";
import { useCbctDicomLoader } from "../mpr/useCbctDicomLoader.js";
import { useCbctClipboardSnapshot } from "../mpr/useCbctClipboardSnapshot.js";
import { teardownViewportCanvases } from "../../../utils/viewportTeardownHelper.js";
import { isDemoShowcaseMode, isDemoPatientId } from "../../../utils/demoModeEngine.js";
import { CLINICAL_RADIOLOGY_PRESETS, loadDoctorCbctSettings } from "../cbctLutMath.js";
import type { DentalLabOrderData } from "../../lab/DentalLabOrderModal.js";
import {
	publishCbctSyncEvent,
	getCachedActiveCbctVolume,
	cacheActiveCbctVolume,
} from "../mpr/cbctStudioSyncChannel.js";
import { parseCbctStudioRoute } from "../../../utils/runtimeRouter.js";
import { CbctNerveTracingHud } from "../CbctNerveTracingHud.js";
import type { CbctStandaloneStudioViewProps } from "./types.js";

export function useCbctStandaloneStudio(props: CbctStandaloneStudioViewProps) {
	const routeParams = useMemo(() => parseCbctStudioRoute(), []);
	const effectiveStudyId = props.studyId || routeParams.studyId;
	const effectivePatientId = props.patientId || routeParams.patientId || "demo_cbct_patient";
	const effectivePatientName = props.patientName || routeParams.patientName || "3D КЛКТ исследование";
	const effectiveInitialMode = (props.initialMode || props.initialStudioMode || (routeParams.mode as StudioMode) || "diagnostic") as StudioMode;

	const modalId = "cbct-standalone-studio";
	const containerRef = useRef<HTMLDivElement | null>(null);

	// Studio mode & layout
	const [studioMode, setStudioMode] = useState<StudioMode>(effectiveInitialMode);
	const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
	const [activeCaliper, setActiveCaliper] = useState<AlveolarRidgeCaliperMeasurement | null>(null);
	const [viewLayout, setViewLayout] = useState<ViewLayoutMode>("quad_view");
	const [maximizedViewport, setMaximizedViewport] = useState<CbctViewportType | null>(null);
	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
	const [isStudioMenuOpen, setIsStudioMenuOpen] = useState<boolean>(false);
	const studioMenuRef = useRef<HTMLDivElement | null>(null);
	const [isUnsharpActive, setIsUnsharpActive] = useState<boolean>(false);
	const [isComparisonSplitOpen, setIsComparisonSplitOpen] = useState<boolean>(false);
	const [isLabOrderModalOpen, setIsLabOrderModalOpen] = useState<boolean>(false);
	const [labOrderDraft, setLabOrderDraft] = useState<DentalLabOrderData | null>(null);

	// Responsive mobile guard (<768px)
	const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() => {
		if (typeof window !== "undefined") {
			return window.innerWidth < 768;
		}
		return false;
	});

	useEffect(() => {
		const handleResize = () => {
			setIsMobileScreen(window.innerWidth < 768);
		};
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	// Volume state — hydrated from opener/memory cache or demo
	const [volume, setVolume] = useState<CbctVoxelVolume | null>(() => {
		const cached = getCachedActiveCbctVolume();
		if (cached) return cached;
		if (routeParams.isDemo || isDemoShowcaseMode() || isDemoPatientId(effectivePatientId)) {
			if (typeof window !== "undefined") {
				const win = window as unknown as { __cbctDemoVolume?: CbctVoxelVolume };
				if (win.__cbctDemoVolume) return win.__cbctDemoVolume;
			}
		}
		return null;
	});

	// Keep shared volume cache updated
	useEffect(() => {
		if (volume) {
			cacheActiveCbctVolume(volume);
		}
	}, [volume]);

	const [doctorDefaults] = useState(() => loadDoctorCbctSettings());
	const [activePreset, setActivePreset] = useState<string>("standard");
	const [windowWidth, setWindowWidth] = useState<number>(() => doctorDefaults.windowWidth);
	const [windowLevel, setWindowLevel] = useState<number>(() => doctorDefaults.windowLevel);
	const [invertColors, setInvertColors] = useState<boolean>(false);
	const [slabMode, setSlabMode] = useState<SlabProjectionMode>("single");
	const [slabThicknessMm, setSlabThicknessMm] = useState<number>(() => doctorDefaults.mprThicknessMm);
	const [panoThicknessMm, setPanoThicknessMm] = useState<number>(() => doctorDefaults.panoThicknessMm);
	const [panoProjectionMode, setPanoProjectionMode] = useState<string>("average");
	const [loadedSliceCount, setLoadedSliceCount] = useState<number>(volume?.dimensions.depth ?? 0);
	const [patientDisplayName, setPatientDisplayName] = useState<string>(effectivePatientName);

	// Crosshair & oblique angles
	const [crosshairMm, setCrosshairMm] = useState<Point3D>({ x: 0, y: 0, z: 0 });
	const [obliqueAngles, setObliqueAngles] = useState<ObliqueRotationAngles>(DEFAULT_OBLIQUE_ROTATION);
	const [mobileActiveTab, setMobileActiveTab] = useState<"axial" | "coronal" | "sagittal" | "panoramic" | "planner">("axial");

	// Dental arch & panorama
	const [jawType, setJawType] = useState<"mandible" | "maxilla">("mandible");
	const [showDentalArch, setShowDentalArch] = useState<boolean>(effectiveInitialMode === "panoramic");
	const [showEdgeRulers, setShowEdgeRulers] = useState<boolean>(false);
	const [hoveredViewport, setHoveredViewport] = useState<CbctViewportType | null>(null);
	const [archCurve, setArchCurve] = useState<DentalArchCurve>(() =>
		buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible"),
	);
	const [crossSections, setCrossSections] = useState<CrossSectionSliceData[]>([]);
	const [activeCrossSectionIdx, setActiveCrossSectionIdx] = useState<number>(0);
	const [crossSectionStepMm, setCrossSectionStepMm] = useState<number>(1.5);

	// Implant planning & nerve safety
	const [selectedBrand, setSelectedBrand] = useState<ImplantBrandKey>("osstem");
	const [selectedDiameterMm, setSelectedDiameterMm] = useState<number>(4.0);
	const [selectedLengthMm, setSelectedLengthMm] = useState<number>(10.0);
	const [implantEntryXOffsetMm, setImplantEntryXOffsetMm] = useState<number>(0.0);
	const [implantEntryDepthMm, setImplantEntryDepthMm] = useState<number>(2.0);
	const [implantAngulationDeg, setImplantAngulationDeg] = useState<number>(0.0);
	const [activeNerveSide, setActiveNerveSide] = useState<NerveCanalSide>("right");
	const [rightNervePoints, setRightNervePoints] = useState<Point3D[]>([]);
	const [leftNervePoints, setLeftNervePoints] = useState<Point3D[]>([]);
	const [selectedNerveNodeIdx, setSelectedNerveNodeIdx] = useState<number | null>(null);
	const nervePoints = useMemo(() => (activeNerveSide === "right" ? rightNervePoints : leftNervePoints), [activeNerveSide, rightNervePoints, leftNervePoints]);
	const setNervePoints = useCallback((action: React.SetStateAction<Point3D[]>) => {
		if (activeNerveSide === "right") setRightNervePoints(action);
		else setLeftNervePoints(action);
	}, [activeNerveSide]);
	const [dragImplantPart, setDragImplantPart] = useState<string | null>(null);
	const [hoveredImplantPart, setHoveredImplantPart] = useState<string | null>(null);

	// Measurement tools & transforms
	const [activeTool, setActiveTool] = useState<CbctToolMode>("crosshair");
	const [activeViewport, setActiveViewport] = useState<CbctViewportType>("axial");
	const [rulers, setRulers] = useState<CbctMeasurementRuler[]>([]);
	const [angles, setAngles] = useState<CbctAngleMeasurement[]>([]);
	const [transforms, setTransforms] = useState<Record<CbctViewportType, ViewportTransform>>(getDefaultViewportTransforms);

	// Canvas refs
	const axialBaseCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const axialOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const coronalBaseCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const coronalOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const sagittalBaseCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const sagittalOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const panoBaseCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const panoOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const crossSectionBaseCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const crossSectionOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

	// Calculations
	const currentVoxel = useMemo(() => (volume ? worldMmToVoxel(crosshairMm, volume) : { x: 0, y: 0, z: 0 }), [volume, crosshairMm]);
	const sampledVoxelHU = useMemo(() => (volume && currentVoxel ? sampleVoxelHU(currentVoxel.x ?? 0, currentVoxel.y ?? 0, currentVoxel.z ?? 0, volume) : 0), [volume, currentVoxel]);
	const interpolatedNerve3D = useMemo(() => (nervePoints.length < 2 ? nervePoints : interpolateNerveSpline3D(nervePoints, 12)), [nervePoints]);
	const nerveTotalLengthMm = useMemo(() => (interpolatedNerve3D.length < 2 ? 0 : calculateSplineLength3DMm(interpolatedNerve3D)), [interpolatedNerve3D]);

	const currentImplantSpec: VirtualImplantSpec = useMemo(() => {
		const match = STANDARD_IMPLANT_CATALOG.find(
			(i) => i.brand === selectedBrand && Math.abs(i.diameterMm - selectedDiameterMm) <= 0.25 && Math.abs(i.lengthMm - selectedLengthMm) <= 0.5,
		);
		return match ?? STANDARD_IMPLANT_CATALOG[0]!;
	}, [selectedBrand, selectedDiameterMm, selectedLengthMm]);

	const activeCrossSection: CrossSectionSliceData | null = useMemo(() => {
		if (crossSections.length === 0) return null;
		const idx = Math.max(0, Math.min(crossSections.length - 1, activeCrossSectionIdx));
		return crossSections[idx] ?? null;
	}, [crossSections, activeCrossSectionIdx]);

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

	const implant3DWorld: Implant3DWorldProjection | null = useMemo(() => {
		if (!activeCrossSection) return null;
		return calculateImplant3DWorldPose(currentImplantPose, activeCrossSection.centerPointMm, activeCrossSection.normalVector2D, activeCrossSection.heightMm, 4.0);
	}, [currentImplantPose, activeCrossSection]);

	const currentCanal: MandibularCanalCrossSection = useMemo(() => {
		if (activeCrossSection && interpolatedNerve3D.length >= 2) {
			const proj = project3DNerveToCrossSection(
				interpolatedNerve3D,
				activeCrossSection.centerPointMm,
				activeCrossSection.normalVector2D,
				activeCrossSection.tangentVector2D,
				activeCrossSection.heightMm,
			);
			const pt = proj ? { x: proj.xOffsetMm, y: proj.yDepthMm } : { x: 2.0, y: 16.5 };
			return {
				isDetected: proj !== null,
				center: pt,
				canalCenterMm: pt,
				radiusMm: 1.75,
				safetyMarginMm: 2.0,
			} as unknown as MandibularCanalCrossSection;
		}
		const fallbackPt = { x: 2.0, y: 16.5 };
		return {
			isDetected: false, center: fallbackPt, canalCenterMm: fallbackPt, radiusMm: 1.75, safetyMarginMm: 2.0,
		} as unknown as MandibularCanalCrossSection;
	}, [activeCrossSection, interpolatedNerve3D]);

	const nerveAuditResult = useMemo(
		() => auditNerveSafetyMargin(currentImplantPose, currentCanal),
		[currentImplantPose, currentCanal],
	);

	const huSamplingResult: HUZoneSampling = useMemo(() => {
		return sampleCrossSectionHUProfile(
			volume,
			currentImplantPose,
			implant3DWorld,
		);
	}, [volume, currentImplantPose, implant3DWorld]);

	const boneQuality = useMemo(
		() => analyzeMischBoneQuality(huSamplingResult),
		[huSamplingResult],
	);

	const displayBoneClass = boneQuality.mischClass || "D2";
	const displayMeanHU = Math.round(huSamplingResult.overallMeanHU);
	const displayTorque = `${boneQuality.estimatedInsertionTorqueNcm.expectedNcm} Н·см`;
	const displayNerveClearanceMm = nerveAuditResult.netClearanceToCanalWallMm;
	const displayDrillingProtocol = boneQuality.recommendedDrillingRpm;

	// Broadcast STUDIO_OPENED on mount
	useEffect(() => {
		publishCbctSyncEvent("STUDIO_OPENED", {
			studyId: effectiveStudyId,
			patientId: effectivePatientId,
			patientName: effectivePatientName,
		});
	}, [effectiveStudyId, effectivePatientId, effectivePatientName]);

	// Broadcast events when clinical actions occur
	const handleBroadcastImplantPlaced = useCallback(() => {
		publishCbctSyncEvent("IMPLANT_PLACED", {
			brand: selectedBrand,
			diameterMm: selectedDiameterMm,
			lengthMm: selectedLengthMm,
			toothFdi: activeCrossSection?.nearestToothFdi ?? 46,
			entryPoint: currentImplantPose.entryPoint,
			apexPoint: currentImplantPose.apexPoint,
			angulationDeg: implantAngulationDeg,
			nerveSafetyMarginMm: nerveAuditResult.netClearanceToCanalWallMm,
			boneQuality: displayBoneClass,
			summaryText: `[3D КЛКТ] Установлен имплантат ${selectedBrand.toUpperCase()} Ø${selectedDiameterMm}x${selectedLengthMm} мм (зуб #${activeCrossSection?.nearestToothFdi ?? 46}). Кость ${displayBoneClass}, зазор до нерва ${nerveAuditResult.netClearanceToCanalWallMm.toFixed(1)} мм.`,
		});
		showToast(`Имплантат ${selectedBrand} Ø${selectedDiameterMm}x${selectedLengthMm} синхронизирован с картой приёма`, "success");
	}, [selectedBrand, selectedDiameterMm, selectedLengthMm, activeCrossSection, currentImplantPose, implantAngulationDeg, nerveAuditResult, displayBoneClass]);

	const handleBroadcastCaliperMeasured = useCallback((caliper: AlveolarRidgeCaliperMeasurement) => {
		publishCbctSyncEvent("CALIPER_MEASURED", {
			toothFdi: caliper.fdiTooth ?? undefined,
			ridgeWidthMm: caliper.crestWidthMm,
			crestHeightMm: caliper.heightMm,
			label: caliper.label,
		});
	}, []);

	// Unmount cleanup: memory leak prevention
	useEffect(() => {
		return () => {
			publishCbctSyncEvent("STUDIO_CLOSED", {
				reason: "unmounted",
			});
			if (containerRef.current) {
				teardownViewportCanvases(containerRef.current);
			}
			try {
				disposeSharedCbctGlContext();
			} catch {
				// safe
			}
		};
	}, []);

	const handleCloseStudio = useCallback(() => {
		publishCbctSyncEvent("STUDIO_CLOSED", { reason: "user_closed" });
		if (props.onClose) {
			props.onClose();
		} else if (typeof window !== "undefined") {
			try {
				window.close();
			} catch {
				// window.close() might be blocked if not opened by script
			}
		}
	}, [props]);

	const handleToggleUnsharp = useCallback(() => {
		setIsUnsharpActive((prev) => {
			const next = !prev;
			try {
				getSharedCbctGlContext().setSharpenAmount(next ? 0.6 : 0.0);
			} catch {
				// safe
			}
			showToast(next ? "Резкость трабекул: ВКЛ" : "Резкость: Исходный воксел", "info");
			return next;
		});
	}, []);

	const handleToggleMaximize = useCallback((type: CbctViewportType) => {
		setMaximizedViewport((prev) => (prev === type ? null : type));
	}, []);

	const handleSelectStudioMode = useCallback((mode: StudioMode) => {
		setStudioMode(mode);
		if (mode === "panoramic") setShowDentalArch(true);
		else if (mode === "diagnostic") setShowDentalArch(false);
	}, []);

	// DICOM Loader hook
	const dicomLoader = useCbctDicomLoader({
		jawType,
		resolvedPatientName: patientDisplayName,
		setVolume,
		setLoadedSliceCount,
		setPatientDisplayName,
		setWindowWidth,
		setWindowLevel,
		setArchCurve,
		setShowDentalArch,
		setCrosshairMm,
	});

	// Auto-load demo volume (Zakharov 312 slices) if demo requested and volume is not yet set
	const autoLoadDemoAttemptedRef = useRef(false);
	useEffect(() => {
		if (!volume && !autoLoadDemoAttemptedRef.current) {
			const isDemoReq =
				Boolean(props.autoLoadDemo) ||
				routeParams.isDemo ||
				effectivePatientId === "demo_cbct_patient" ||
				isDemoPatientId(effectivePatientId) ||
				isDemoShowcaseMode();
			if (isDemoReq) {
				autoLoadDemoAttemptedRef.current = true;
				void dicomLoader.handleLoadDemoVolume();
			}
		}
	}, [volume, dicomLoader.handleLoadDemoVolume, effectivePatientId, props.autoLoadDemo, routeParams.isDemo]);

	// Interactions hook
	const interactions = useCbctInteractionHandlers({
		volume,
		transforms,
		setTransforms,
		crosshairMm,
		setCrosshairMm,
		activeTool,
		studioMode,
		windowWidth,
		setWindowWidth,
		windowLevel,
		setWindowLevel,
		rulers,
		setRulers,
		angles,
		setAngles,
		nervePoints,
		setNervePoints,
		selectedNerveNodeIdx,
		setSelectedNerveNodeIdx,
		obliqueAngles,
		setObliqueAngles,
		crossSections,
		activeCrossSectionIdx,
		setActiveCrossSectionIdx,
		implantEntryXOffsetMm,
		setImplantEntryXOffsetMm,
		implantEntryDepthMm,
		setImplantEntryDepthMm,
		implantAngulationDeg,
		setImplantAngulationDeg,
		currentImplantSpec,
		activeCrossSection,
		dragImplantPart,
		setDragImplantPart,
		hoveredImplantPart,
		setHoveredImplantPart,
		jawType,
		archCurve,
		axialCanvasRef: axialBaseCanvasRef,
		coronalCanvasRef: coronalBaseCanvasRef,
		sagittalCanvasRef: sagittalBaseCanvasRef,
		panoCanvasRef: panoBaseCanvasRef,
		crossSectionCanvasRef: crossSectionBaseCanvasRef,
	} as any);

	// Slice renderer hook
	useCbctSliceRenderer({
		isOpen: true,
		volume,
		windowWidth,
		windowLevel,
		invertColors,
		slabMode,
		slabThicknessMm,
		obliqueAngles,
		crosshairMm,
		transforms,
		archCurve,
		activeCrossSectionIdx,
		crossSections,
		axialBaseCanvasRef,
		axialOverlayCanvasRef,
		coronalBaseCanvasRef,
		coronalOverlayCanvasRef,
		sagittalBaseCanvasRef,
		sagittalOverlayCanvasRef,
		panoBaseCanvasRef,
		panoOverlayCanvasRef,
		crossSectionBaseCanvasRef,
		crossSectionOverlayCanvasRef,
	} as any);

	const handleResetNerve = useCallback(() => {
		setNervePoints([]);
		setSelectedNerveNodeIdx(null);
		showToast("Трассировка нерва сброшена", "info");
	}, [setNervePoints]);

	const handleDeleteSelectedNode = useCallback(() => {
		if (selectedNerveNodeIdx === null) return;
		setNervePoints((prev) => prev.filter((_, idx) => idx !== selectedNerveNodeIdx));
		setSelectedNerveNodeIdx(null);
		showToast(`Узел нерва #${selectedNerveNodeIdx + 1} удален`, "info");
	}, [selectedNerveNodeIdx, setNervePoints]);

	const renderViewportOverlays = useCallback(
		(viewport: CbctViewportType) => {
			if (viewport !== activeViewport) return null;
			return React.createElement(CbctNerveTracingHud, {
				activeTool,
				activeSide: activeNerveSide,
				onSwitchSide: setActiveNerveSide,
				nervePoints,
				nerveTotalLengthMm,
				selectedNerveNodeIdx,
				onResetNerve: handleResetNerve,
				onDeleteSelectedNode: handleDeleteSelectedNode,
			});
		},
		[activeViewport, activeTool, activeNerveSide, nervePoints, nerveTotalLengthMm, selectedNerveNodeIdx, handleResetNerve, handleDeleteSelectedNode],
	);

	// Clipboard snapshot hook
	const clipboardSnapshot = useCbctClipboardSnapshot({
		activeViewport,
		axialBaseCanvasRef,
		coronalBaseCanvasRef,
		sagittalBaseCanvasRef,
		panoBaseCanvasRef,
		crossSectionBaseCanvasRef,
		axialOverlayCanvasRef,
		coronalOverlayCanvasRef,
		sagittalOverlayCanvasRef,
		panoOverlayCanvasRef,
		crossSectionOverlayCanvasRef,
		patientDisplayName,
	});

	const handleResetAll = useCallback(() => {
		setTransforms(getDefaultViewportTransforms());
		setObliqueAngles(DEFAULT_OBLIQUE_ROTATION);
		setCrosshairMm({ x: 0, y: 0, z: 0 });
		setWindowWidth(doctorDefaults.windowWidth);
		setWindowLevel(doctorDefaults.windowLevel);
		setSlabThicknessMm(doctorDefaults.mprThicknessMm);
		setSlabMode("single");
		setMaximizedViewport(null);
		showToast("Вид КЛКТ сброшен (100% масштаб, 0° наклон)", "info");
	}, [doctorDefaults]);

	const handleAutoDetectArch = useCallback(() => {
		if (!volume) return;
		const detected = autoDetectDentalArch(volume, jawType);
		if (detected) {
			setArchCurve(detected);
			showToast(`Анатомическая дуга ${jawType === "mandible" ? "нижней" : "верхней"} челюсти обнаружена`, "success");
		}
	}, [volume, jawType]);

	const handleSwitchJaw = useCallback((jaw: "mandible" | "maxilla") => {
		setJawType(jaw);
		setArchCurve(buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, jaw));
	}, []);

	const handleClearRulers = useCallback(() => {
		setRulers([]);
		showToast("Линейки удалены", "info");
	}, []);

	const handleClearAngles = useCallback(() => {
		setAngles([]);
		showToast("Угломеры удалены", "info");
	}, []);

	const handleSelectPreset = useCallback((presetId: string) => {
		setActivePreset(presetId);
		const preset = CBCT_HOUNSFIELD_PRESETS.find((p) => p.id === presetId);
		if (preset) {
			setWindowWidth(preset.windowWidth);
			setWindowLevel(preset.windowLevel);
		}
	}, []);

	const handleSelectClinicalPreset = useCallback((presetId: string) => {
		setActivePreset(presetId);
		const preset = CLINICAL_RADIOLOGY_PRESETS.find((p) => p.id === presetId);
		if (preset) {
			setWindowWidth(preset.windowWidth);
			setWindowLevel(preset.windowLevel);
			setSlabThicknessMm(preset.slabThicknessMm);
			setSlabMode(preset.slabMode);
		}
	}, []);

	const handleExportToEmr = useCallback(() => {
		handleBroadcastImplantPlaced();
		publishCbctSyncEvent("STUDIO_SNAPSHOT_SAVED", {
			toothFdi: activeCrossSection?.nearestToothFdi ?? 46,
			protocolNote: `[3D КЛКТ] Протокол планирования имплантации (зуб #${activeCrossSection?.nearestToothFdi ?? 46}): ${selectedBrand} Ø${selectedDiameterMm}x${selectedLengthMm} мм. Кость ${displayBoneClass}, отступ до нерва ${nerveAuditResult.netClearanceToCanalWallMm.toFixed(1)} мм.`,
			capturedAtIso: new Date().toISOString(),
		});
		showToast("Протокол КЛКТ отправлен в медицинскую карту приёма", "success");
	}, [handleBroadcastImplantPlaced, activeCrossSection, selectedBrand, selectedDiameterMm, selectedLengthMm, displayBoneClass, nerveAuditResult]);

	const handleExportPdfReport = useCallback(() => {
		showToast("Формирование печатного PDF протокола КЛКТ...", "info");
	}, []);

	return {
		modalId,
		containerRef,
		studioMode,
		setStudioMode,
		handleSelectStudioMode,
		isSidebarOpen,
		setIsSidebarOpen,
		activeCaliper,
		setActiveCaliper,
		viewLayout,
		setViewLayout,
		maximizedViewport,
		setMaximizedViewport,
		handleToggleMaximize,
		isFullscreen,
		setIsFullscreen,
		isStudioMenuOpen,
		setIsStudioMenuOpen,
		studioMenuRef,
		isUnsharpActive,
		handleToggleUnsharp,
		isComparisonSplitOpen,
		setIsComparisonSplitOpen,
		isLabOrderModalOpen,
		setIsLabOrderModalOpen,
		labOrderDraft,
		setLabOrderDraft,
		isMobileScreen,
		volume,
		setVolume,
		doctorDefaults,
		activePreset,
		setActivePreset,
		handleSelectPreset,
		handleSelectClinicalPreset,
		windowWidth,
		setWindowWidth,
		windowLevel,
		setWindowLevel,
		invertColors,
		setInvertColors,
		slabMode,
		setSlabMode,
		slabThicknessMm,
		setSlabThicknessMm,
		panoThicknessMm,
		setPanoThicknessMm,
		panoProjectionMode,
		setPanoProjectionMode,
		loadedSliceCount,
		patientDisplayName,
		setPatientDisplayName,
		crosshairMm,
		setCrosshairMm,
		obliqueAngles,
		setObliqueAngles,
		mobileActiveTab,
		setMobileActiveTab,
		jawType,
		setJawType,
		handleSwitchJaw,
		showDentalArch,
		setShowDentalArch,
		showEdgeRulers,
		setShowEdgeRulers,
		hoveredViewport,
		setHoveredViewport,
		archCurve,
		setArchCurve,
		crossSections,
		setCrossSections,
		activeCrossSectionIdx,
		setActiveCrossSectionIdx,
		crossSectionStepMm,
		setCrossSectionStepMm,
		handleAutoDetectArch,
		selectedBrand,
		setSelectedBrand,
		selectedDiameterMm,
		setSelectedDiameterMm,
		selectedLengthMm,
		setSelectedLengthMm,
		implantEntryXOffsetMm,
		setImplantEntryXOffsetMm,
		implantEntryDepthMm,
		setImplantEntryDepthMm,
		implantAngulationDeg,
		setImplantAngulationDeg,
		activeNerveSide,
		setActiveNerveSide,
		nervePoints,
		setNervePoints,
		selectedNerveNodeIdx,
		setSelectedNerveNodeIdx,
		dragImplantPart,
		setDragImplantPart,
		hoveredImplantPart,
		setHoveredImplantPart,
		activeTool,
		setActiveTool,
		activeViewport,
		setActiveViewport,
		rulers,
		setRulers,
		handleClearRulers,
		angles,
		setAngles,
		handleClearAngles,
		transforms,
		setTransforms,
		axialBaseCanvasRef,
		axialOverlayCanvasRef,
		coronalBaseCanvasRef,
		coronalOverlayCanvasRef,
		sagittalBaseCanvasRef,
		sagittalOverlayCanvasRef,
		panoBaseCanvasRef,
		panoOverlayCanvasRef,
		crossSectionBaseCanvasRef,
		crossSectionOverlayCanvasRef,
		currentVoxel,
		sampledVoxelHU,
		interpolatedNerve3D,
		nerveTotalLengthMm,
		currentImplantSpec,
		activeCrossSection,
		currentImplantPose,
		implant3DWorld,
		currentCanal,
		nerveAuditResult,
		huSamplingResult,
		boneQuality,
		displayBoneClass,
		displayMeanHU,
		displayTorque,
		displayNerveClearanceMm,
		displayDrillingProtocol,
		dicomLoader,
		interactions,
		clipboardSnapshot,
		renderViewportOverlays,
		handleResetAll,
		handleCloseStudio,
		handleExportToEmr,
		handleExportPdfReport,
		handleBroadcastImplantPlaced,
		handleBroadcastCaliperMeasured,
		effectivePatientId,
		effectivePatientName,
		effectiveStudyId,
	};
}
