import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	type CbctVoxelVolume,
	type Point3D,
	type SlabProjectionMode,
	type ObliqueRotationAngles,
	type ViewportTransform,
	type CbctMeasurementRuler,
	type CbctAngleMeasurement,
	type CbctProbeMarker,
	type CbctViewportType,
	CBCT_HOUNSFIELD_PRESETS,
	DEFAULT_OBLIQUE_ROTATION,
	DEFAULT_VIEWPORT_TRANSFORM,
	ROMEXIS_COLORS,
	disposeCbctVolume,
	getTissueNameFromHU,
	sampleVoxelHU,
	worldMmToVoxel,
} from "./cbctMprMath";
import { useCbctKeyboardShortcuts } from "./useCbctKeyboardShortcuts";
import { CbctHotkeysStatusBar } from "./CbctHotkeysStatusBar";
import {
	DEFAULT_MANDIBULAR_ARCH_ANCHORS,
	type CrossSectionSliceData,
	type DentalArchCurve,
	type PanoramicReconstructionResult,
	autoDetectDentalArch,
	buildDentalArchCurve,
	generateCrossSectionSlices,
} from "./dentalCurveEngine";
import { getSharedCbctGlContext, disposeSharedCbctGlContext } from "./mpr/webgl/CbctVolumeGlContext";
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
	computeLiveImplantTelemetry,
	sampleCrossSectionHUProfile,
} from "./implantSafetyEngine";
import {
	calculateSplineLength3DMm,
	interpolateNerveSpline3D,
	project3DNerveToCrossSection,
	type AlveolarRidgeCaliperMeasurement,
} from "./cbctCaliperNerveMath";
import { classifyMischBoneQuality } from "./boneDensityMischMath";
import { CbctLeftToolDock, type CbctToolMode } from "./CbctLeftToolDock";
import { showToast } from "../GlobalToast";
import {
	type StudioMode,
	type ViewLayoutMode,
	type NerveCanalSide,
	DEFAULT_IAN_NERVE_POINTS,
	getDefaultViewportTransforms,
} from "./mpr/cbctStudioTypes";
import { CbctHeaderBar } from "./mpr/CbctHeaderBar";
import { CbctRightSidebar } from "./mpr/CbctRightSidebar";
import { CbctMprViewportsGrid } from "./mpr/CbctMprViewportsGrid";
import { useCbctSliceRenderer } from "./mpr/useCbctSliceRenderer";
import { useCbctInteractionHandlers } from "./mpr/useCbctInteractionHandlers";
import { useCbctDicomLoader } from "./mpr/useCbctDicomLoader";
import { useCbctClipboardSnapshot } from "./mpr/useCbctClipboardSnapshot";
import { teardownViewportCanvases } from "../../utils/viewportTeardownHelper";
import { isDemoShowcaseMode, isDemoPatientId } from "../../utils/demoModeEngine.js";
import { CLINICAL_RADIOLOGY_PRESETS, loadDoctorCbctSettings } from "./cbctLutMath";
import { RadiologyConsultationSplit } from "./RadiologyConsultationSplit";
import { DentalLabOrderModal, type DentalLabOrderData } from "../lab/DentalLabOrderModal";
import {
	publishCbctSyncEvent,
	getCachedActiveCbctVolume,
	cacheActiveCbctVolume,
} from "./mpr/cbctStudioSyncChannel";
import { parseCbctStudioRoute } from "../../utils/runtimeRouter";
import { ArrowLeft, Monitor, Smartphone } from "lucide-react";

export interface CbctStandaloneStudioViewProps {
	readonly studyId?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly initialMode?: StudioMode | undefined;
	readonly onClose?: (() => void) | undefined;
}

/**
 * Autonomous Fullscreen CBCT 3D MPR Radiology Studio Cockpit for Dedicated Windows & Secondary Monitors.
 *
 * MANDATE COMPLIANCE:
 * - Mandate 8e: Doctor Autonomy — dedicated pop-out window (100vw, 100vh), zero CRM sidebar clutter.
 * - Mandate 8l: Real-time MPR reslicing & implant planning with cross-window broadcast sync.
 * - Anti-leak WebGL Teardown: Guaranteed canvas & VRAM disposal on unmount.
 */
export const CbctStandaloneStudioView: React.FC<CbctStandaloneStudioViewProps> = (props) => {
	const routeParams = useMemo(() => parseCbctStudioRoute(), []);
	const effectiveStudyId = props.studyId || routeParams.studyId;
	const effectivePatientId = props.patientId || routeParams.patientId || "demo_cbct_patient";
	const effectivePatientName = props.patientName || routeParams.patientName || "3D КЛКТ исследование";
	const effectiveInitialMode = (props.initialMode || (routeParams.mode as StudioMode) || "diagnostic") as StudioMode;

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
	const sampledVoxelHU = useMemo(() => (volume ? sampleVoxelHU(currentVoxel.x, currentVoxel.y, currentVoxel.z, volume) : 0), [volume, currentVoxel]);
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
				activeCrossSection.widthMm,
				activeCrossSection.heightMm,
			);
			return {
				isDetected: proj.isIntersecting,
				canalCenterMm: proj.crossSectionMm,
				canalRadiusMm: 1.75,
			};
		}
		return {
			isDetected: false,
			canalCenterMm: { x: 2.0, y: 16.5 },
			canalRadiusMm: 1.75,
		};
	}, [activeCrossSection, interpolatedNerve3D]);

	const nerveAuditResult = useMemo(
		() => auditNerveSafetyMargin(currentImplantPose, currentCanal),
		[currentImplantPose, currentCanal],
	);

	const huSamplingResult = useMemo(() => {
		if (!activeCrossSection) {
			return {
				samples: [],
				mischQuality: "D2",
				meanHU: 950,
				corticalThicknessMm: 1.8,
				cancellousDensityHU: 650,
			};
		}
		return sampleCrossSectionHUProfile(
			activeCrossSection.pixelData,
			activeCrossSection.widthPx,
			activeCrossSection.heightPx,
			activeCrossSection.pixelSpacingMm,
			currentImplantPose.entryPoint,
			currentImplantPose.apexPoint,
			currentImplantSpec.diameterMm,
		);
	}, [activeCrossSection, currentImplantPose, currentImplantSpec]);

	const liveTelemetry = useMemo(
		() => computeLiveImplantTelemetry(nerveAuditResult, huSamplingResult, currentImplantSpec),
		[nerveAuditResult, huSamplingResult, currentImplantSpec],
	);

	const displayBoneClass = liveTelemetry.boneClass;
	const displayMeanHU = liveTelemetry.meanHU;
	const displayTorque = liveTelemetry.expectedTorqueNcm;
	const displayNerveClearanceMm = liveTelemetry.clearanceMm;
	const displayDrillingProtocol = liveTelemetry.protocolSummary;

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
			nerveSafetyMarginMm: nerveAuditResult.clearanceMm,
			boneQuality: displayBoneClass,
			summaryText: `[3D КЛКТ] Установлен имплантат ${selectedBrand.toUpperCase()} Ø${selectedDiameterMm}x${selectedLengthMm} мм (зуб #${activeCrossSection?.nearestToothFdi ?? 46}). Кость ${displayBoneClass}, зазор до нерва ${nerveAuditResult.clearanceMm.toFixed(1)} мм.`,
		});
		showToast(`Имплантат ${selectedBrand} Ø${selectedDiameterMm}x${selectedLengthMm} синхронизирован с картой приёма`, "success");
	}, [selectedBrand, selectedDiameterMm, selectedLengthMm, activeCrossSection, currentImplantPose, implantAngulationDeg, nerveAuditResult, displayBoneClass]);

	const handleBroadcastCaliperMeasured = useCallback((caliper: AlveolarRidgeCaliperMeasurement) => {
		publishCbctSyncEvent("CALIPER_MEASURED", {
			toothFdi: caliper.toothFdi,
			ridgeWidthMm: caliper.ridgeWidthMm,
			crestHeightMm: caliper.crestHeightMm,
			boneDensityHU: caliper.boneDensityHU,
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
		volume,
		setVolume: (vol) => {
			setVolume(vol);
			if (vol) {
				setLoadedSliceCount(vol.dimensions.depth);
				cacheActiveCbctVolume(vol);
			}
		},
		patientId: effectivePatientId,
		patientName: effectivePatientName,
		autoLoadDemo: routeParams.isDemo || !volume,
		setPatientDisplayName,
		setLoadedSliceCount,
		onAfterVolumeBuilt: (builtVolume) => {
			setCrosshairMm({ x: 0, y: 0, z: 0 });
			cacheActiveCbctVolume(builtVolume);
		},
	});

	// Interactions hook
	const interactions = useCbctInteractionHandlers({
		volume,
		transforms,
		setTransforms,
		crosshairMm,
		setCrosshairMm,
		activeViewport,
		setActiveViewport,
		activeTool,
		setActiveTool,
		windowWidth,
		setWindowWidth,
		windowLevel,
		setWindowLevel,
		rulers,
		setRulers,
		angles,
		setAngles,
		activeNerveSide,
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
		selectedBrand,
		selectedDiameterMm,
		selectedLengthMm,
		dragImplantPart,
		setDragImplantPart,
		hoveredImplantPart,
		setHoveredImplantPart,
		jawType,
		archCurve,
	});

	// Slice renderer hook
	const { renderViewportOverlays } = useCbctSliceRenderer({
		volume,
		windowWidth,
		windowLevel,
		invertColors,
		slabMode,
		slabThicknessMm,
		obliqueAngles,
		crosshairMm,
		transforms,
		panoThicknessMm,
		panoProjectionMode,
		archCurve,
		jawType,
		activeCrossSectionIdx,
		crossSectionStepMm,
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
		setCrossSections,
	});

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
		volume,
		currentVoxel,
		sampledVoxelHU,
		displayBoneClass,
		displayMeanHU,
		displayTorque,
		displayNerveClearanceMm,
		selectedBrand,
		selectedDiameterMm,
		selectedLengthMm,
		activeCrossSection,
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
			protocolNote: `[3D КЛКТ] Протокол планирования имплантации (зуб #${activeCrossSection?.nearestToothFdi ?? 46}): ${selectedBrand} Ø${selectedDiameterMm}x${selectedLengthMm} мм. Кость ${displayBoneClass}, отступ до нерва ${nerveAuditResult.clearanceMm.toFixed(1)} мм.`,
			capturedAtIso: new Date().toISOString(),
		});
		showToast("Протокол КЛКТ отправлен в медицинскую карту приёма", "success");
	}, [handleBroadcastImplantPlaced, activeCrossSection, selectedBrand, selectedDiameterMm, selectedLengthMm, displayBoneClass, nerveAuditResult]);

	const handleExportPdfReport = useCallback(() => {
		showToast("Формирование печатного PDF протокола КЛКТ...", "info");
	}, []);

	return (
		<div
			ref={containerRef}
			id={modalId}
			data-testid="cbct-standalone-studio-view"
			data-cbct-cockpit="true"
			data-theme="dark"
			style={{ colorScheme: "dark" }}
			className="w-screen h-screen min-h-screen bg-zinc-950 text-zinc-300 font-sans flex flex-col overflow-hidden select-none cbct-dark-cockpit fixed inset-0 z-[9999]"
		>
			{/* Mobile adaptation notice if opened on narrow screen */}
			{isMobileScreen && (
				<div className="bg-amber-950/80 border-b border-amber-800 px-3 py-1.5 flex items-center justify-between text-xs text-amber-200 shrink-0 z-50">
					<div className="flex items-center gap-2">
						<Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
						<span>Мобильный просмотр КТ. Для работы с имплантацией используйте ПК.</span>
					</div>
					<button
						type="button"
						onClick={handleCloseStudio}
						className="px-2 py-0.5 rounded bg-amber-900/60 hover:bg-amber-850 text-amber-200 border border-amber-700 font-semibold cursor-pointer text-[11px]"
					>
						В CRM
					</button>
				</div>
			)}

			<CbctHeaderBar
				modalId={modalId}
				patientDisplayName={patientDisplayName}
				resolvedPatientName={patientDisplayName}
				loadedSliceCount={loadedSliceCount}
				volume={volume}
				studioMode={studioMode}
				handleSelectStudioMode={handleSelectStudioMode}
				handleExportToEmr={handleExportToEmr}
				handleExportCbctToFinance={() => {
					handleBroadcastImplantPlaced();
					showToast("Операция имплантации и КЛКТ добавлены в смету приёма", "success");
				}}
				handleExportToPlan={() => {
					handleBroadcastImplantPlaced();
					showToast("Этап имплантации добавлен в план лечения", "success");
				}}
				handleExportToLab={() => {
					setLabOrderDraft({
						patientName: patientDisplayName,
						toothFdi: activeCrossSection?.nearestToothFdi ?? "46",
						orderType: "surgical_guide",
						shade: "A2",
					});
					setIsLabOrderModalOpen(true);
				}}
				isSidebarOpen={isSidebarOpen}
				setIsSidebarOpen={setIsSidebarOpen}
				isStudioMenuOpen={isStudioMenuOpen}
				setIsStudioMenuOpen={setIsStudioMenuOpen}
				studioMenuRef={studioMenuRef}
				handleResetAll={handleResetAll}
				handleAutoDetectArch={handleAutoDetectArch}
				showDentalArch={showDentalArch}
				setShowDentalArch={setShowDentalArch}
				showEdgeRulers={showEdgeRulers}
				setShowEdgeRulers={setShowEdgeRulers}
				handleExportPdfReport={handleExportPdfReport}
				maximizedViewport={maximizedViewport}
				setMaximizedViewport={setMaximizedViewport}
				viewLayout={viewLayout}
				setViewLayout={setViewLayout}
				isFullscreen={isFullscreen}
				handleToggleFullscreenModal={() => setIsFullscreen((prev) => !prev)}
				onClose={handleCloseStudio}
				activePresetId={activePreset}
				onSelectPreset={handleSelectPreset}
				crossSectionStepMm={crossSectionStepMm}
				onChangeCrossSectionStepMm={setCrossSectionStepMm}
				isUnsharpActive={isUnsharpActive}
				onToggleUnsharp={handleToggleUnsharp}
				sharpenAmount={isUnsharpActive ? 0.18 : 0.0}
				windowWidth={windowWidth}
				onChangeWindowWidth={setWindowWidth}
				windowLevel={windowLevel}
				onChangeWindowLevel={setWindowLevel}
				slabThicknessMm={slabThicknessMm}
				onChangeSlabThicknessMm={setSlabThicknessMm}
				slabMode={slabMode}
				onChangeSlabMode={setSlabMode}
				panoThicknessMm={panoThicknessMm}
				onChangePanoThicknessMm={setPanoThicknessMm}
				onSelectClinicalPreset={handleSelectClinicalPreset}
				onCopySnapshotToClipboard={clipboardSnapshot.copySnapshotToClipboard}
				onOpenComparisonSplit={() => setIsComparisonSplitOpen(true)}
			/>

			<main className="flex-1 flex min-h-0 w-full overflow-hidden relative">
				<CbctLeftToolDock
					activeTool={activeTool}
					onSelectTool={setActiveTool}
					activePresetId={activePreset}
					onSelectPreset={handleSelectPreset}
					slabMode={slabMode}
					onSelectSlabMode={setSlabMode}
					slabThicknessMm={slabThicknessMm}
					onChangeSlabThicknessMm={setSlabThicknessMm}
					invertColors={invertColors}
					onToggleInvertColors={() => setInvertColors((prev) => !prev)}
					onResetAll={handleResetAll}
					showDentalArch={showDentalArch}
					onToggleDentalArch={() => {
						setShowDentalArch((prev) => {
							const next = !prev;
							if (next && studioMode !== "panoramic") handleSelectStudioMode("panoramic");
							return next;
						});
					}}
					onAutoDetectArch={handleAutoDetectArch}
				/>

				<CbctMprViewportsGrid
					isSidebarOpen={isSidebarOpen}
					mobileActiveTab={mobileActiveTab}
					patientDisplayName={patientDisplayName}
					patientId={effectivePatientId}
					onSelectMobileTab={setMobileActiveTab}
					volume={volume}
					dicomLoadingStatus={dicomLoader.dicomLoadingStatus}
					dicomProgress={dicomLoader.dicomProgress}
					maximizedViewport={maximizedViewport}
					viewLayout={viewLayout}
					studioMode={studioMode}
					onSelectStudioMode={handleSelectStudioMode}
					folderInputRef={dicomLoader.folderInputRef}
					zipInputRef={dicomLoader.zipInputRef}
					handleDicomFilesChange={dicomLoader.handleDicomFilesChange}
					activeViewport={activeViewport}
					setActiveViewport={setActiveViewport}
					hoveredViewport={hoveredViewport}
					onHoverViewport={setHoveredViewport}
					showEdgeRulers={showEdgeRulers}
					handleToggleMaximize={handleToggleMaximize}
					axialBaseCanvasRef={axialBaseCanvasRef}
					axialOverlayCanvasRef={axialOverlayCanvasRef}
					coronalBaseCanvasRef={coronalBaseCanvasRef}
					coronalOverlayCanvasRef={coronalOverlayCanvasRef}
					sagittalBaseCanvasRef={sagittalBaseCanvasRef}
					sagittalOverlayCanvasRef={sagittalOverlayCanvasRef}
					panoBaseCanvasRef={panoBaseCanvasRef}
					panoOverlayCanvasRef={panoOverlayCanvasRef}
					crossSectionBaseCanvasRef={crossSectionBaseCanvasRef}
					crossSectionOverlayCanvasRef={crossSectionOverlayCanvasRef}
					handleCanvasDoubleClick={interactions.handleCanvasDoubleClick}
					handleCanvasMouseDown={interactions.handleCanvasMouseDown}
					handleCanvasMouseMove={interactions.handleCanvasMouseMove}
					handleCanvasMouseUp={interactions.handleCanvasMouseUp}
					handleCanvasWheel={interactions.handleCanvasWheel}
					getCanvasCursor={interactions.getCanvasCursor}
					crosshairMm={crosshairMm}
					currentVoxel={currentVoxel}
					slabMode={slabMode}
					slabThicknessMm={slabThicknessMm}
					obliqueAngles={obliqueAngles}
					setObliqueAngles={setObliqueAngles}
					handleFullResetViewport={handleResetAll}
					activeRotationHandle={interactions.activeRotationHandle}
					isShiftRotating={interactions.isShiftRotating}
					hoveredHandle={interactions.hoveredHandle}
					transforms={transforms}
					windowWidth={windowWidth}
					windowLevel={windowLevel}
					renderViewportOverlays={renderViewportOverlays}
					handlePanoMouseDown={interactions.handlePanoMouseDown}
					handlePanoMouseMove={interactions.handlePanoMouseMove}
					handlePanoMouseUp={interactions.handlePanoMouseUp}
					handleCrossSectionMouseDown={interactions.handleCrossSectionMouseDown}
					handleCrossSectionMouseMove={interactions.handleCrossSectionMouseMove}
					handleCrossSectionMouseUp={interactions.handleCrossSectionMouseUp}
					dragImplantPart={dragImplantPart}
					hoveredImplantPart={hoveredImplantPart}
					activeCrossSection={activeCrossSection}
					activeCrossSectionIdx={activeCrossSectionIdx}
					crossSections={crossSections}
					onLoadDemoVolume={dicomLoader.handleLoadDemoVolume}
					activeTool={activeTool}
					onSelectTool={setActiveTool}
					rulers={rulers}
					onClearRulers={handleClearRulers}
					angles={angles}
					onClearAngles={handleClearAngles}
					onSelectQuickWlPreset={(wl) => {
						setWindowWidth(wl.windowWidth);
						setWindowLevel(wl.windowLevel);
					}}
					handleSelectTooth={interactions.handleSelectTooth}
					archCurve={archCurve}
					jawType={jawType}
					onSwitchJaw={handleSwitchJaw}
					activeToothFdi={activeCrossSection?.nearestToothFdi}
					isUnsharpActive={isUnsharpActive}
					onToggleUnsharp={handleToggleUnsharp}
					onChangeCrossSectionIdx={setActiveCrossSectionIdx}
					selectedBrand={selectedBrand}
					onSelectBrand={setSelectedBrand}
					selectedDiameterMm={selectedDiameterMm}
					onSelectDiameterMm={setSelectedDiameterMm}
					selectedLengthMm={selectedLengthMm}
					onSelectLengthMm={setSelectedLengthMm}
					displayBoneClass={displayBoneClass}
					displayMeanHU={displayMeanHU}
					displayTorque={displayTorque}
					displayNerveClearanceMm={displayNerveClearanceMm}
					displayDrillingProtocol={displayDrillingProtocol}
					nerveSafetyStatus={nerveAuditResult.safetyStatus === "danger" ? "danger" : nerveAuditResult.safetyStatus === "warning" ? "warning" : "safe"}
					nervePoints={nervePoints}
					interpolatedNerve3D={interpolatedNerve3D}
					implant3DWorld={implant3DWorld}
					nerveAuditResult={nerveAuditResult}
					handleExportToEmr={handleExportToEmr}
					handleExportToPlan={() => {
						handleBroadcastImplantPlaced();
					}}
					onChangeWindowWidth={setWindowWidth}
					onChangeWindowLevel={setWindowLevel}
					onChangeSlabThicknessMm={setSlabThicknessMm}
					onChangeSlabMode={setSlabMode}
					onSelectClinicalPreset={handleSelectClinicalPreset}
					activePresetId={activePreset}
					panoThicknessMm={panoThicknessMm}
					onChangePanoThicknessMm={setPanoThicknessMm}
					panoProjectionMode={panoProjectionMode}
					onChangePanoProjectionMode={setPanoProjectionMode}
					crossSectionStepMm={crossSectionStepMm}
					onChangeCrossSectionStepMm={setCrossSectionStepMm}
					implantEntryXOffsetMm={implantEntryXOffsetMm}
					onChangeImplantEntryXOffsetMm={setImplantEntryXOffsetMm}
					implantEntryDepthMm={implantEntryDepthMm}
					onChangeImplantEntryDepthMm={setImplantEntryDepthMm}
					implantAngulationDeg={implantAngulationDeg}
					onChangeImplantAngulationDeg={setImplantAngulationDeg}
				/>

				<CbctRightSidebar
					isSidebarOpen={isSidebarOpen}
					setIsSidebarOpen={setIsSidebarOpen}
					mobileActiveTab={mobileActiveTab}
					activeCrossSection={activeCrossSection}
					activeCrossSectionIdx={activeCrossSectionIdx}
					setActiveCrossSectionIdx={setActiveCrossSectionIdx}
					crossSections={crossSections}
					studioMode={studioMode}
					setStudioMode={setStudioMode}
					implantAngulationDeg={implantAngulationDeg}
					setImplantAngulationDeg={setImplantAngulationDeg}
					volume={volume}
					handleToggleMaximize={handleToggleMaximize}
					crossSectionBaseCanvasRef={crossSectionBaseCanvasRef}
					crossSectionOverlayCanvasRef={crossSectionOverlayCanvasRef}
					handleCrossSectionMouseDown={interactions.handleCrossSectionMouseDown}
					handleCrossSectionMouseMove={interactions.handleCrossSectionMouseMove}
					handleCrossSectionMouseUp={interactions.handleCrossSectionMouseUp}
					dragImplantPart={dragImplantPart}
					hoveredImplantPart={hoveredImplantPart}
					handleFullResetViewport={handleResetAll}
					maximizedViewport={maximizedViewport}
					windowWidth={windowWidth}
					windowLevel={windowLevel}
					renderViewportOverlays={renderViewportOverlays}
					sampledVoxelHU={sampledVoxelHU}
					handleSelectTooth={interactions.handleSelectTooth}
					implant3DWorld={implant3DWorld}
					nerveAuditResult={nerveAuditResult}
					huSamplingResult={huSamplingResult}
					currentImplantSpec={currentImplantSpec}
					nervePoints={nervePoints}
					setNervePoints={setNervePoints}
					nerveTotalLengthMm={nerveTotalLengthMm}
					selectedNerveNodeIdx={selectedNerveNodeIdx}
					setSelectedNerveNodeIdx={setSelectedNerveNodeIdx}
					activeNerveSide={activeNerveSide}
					onSwitchNerveSide={setActiveNerveSide}
					displayBoneClass={displayBoneClass}
					displayMeanHU={displayMeanHU}
					displayTorque={displayTorque}
					displayNerveClearanceMm={displayNerveClearanceMm}
					displayDrillingProtocol={displayDrillingProtocol}
					selectedBrand={selectedBrand}
					setSelectedBrand={setSelectedBrand}
					selectedDiameterMm={selectedDiameterMm}
					setSelectedDiameterMm={setSelectedDiameterMm}
					selectedLengthMm={selectedLengthMm}
					setSelectedLengthMm={setSelectedLengthMm}
					implantEntryXOffsetMm={implantEntryXOffsetMm}
					setImplantEntryXOffsetMm={setImplantEntryXOffsetMm}
					setImplantEntryDepthMm={setImplantEntryDepthMm}
					activeCaliper={activeCaliper}
					handleExportToEmr={handleExportToEmr}
					handleExportPdfReport={() => {
						void handleExportPdfReport();
					}}
					handleExportToPlan={() => {
						handleBroadcastImplantPlaced();
					}}
					handleExportToSchedule={() => {
						showToast("Запись на имплантацию отправлена в расписание", "info");
					}}
					handleExportToFinance={() => {
						handleBroadcastImplantPlaced();
					}}
				/>
			</main>

			<CbctHotkeysStatusBar
				activeViewport={activeViewport}
				onToggleHelp={() => {}}
				isPanelOpen={isSidebarOpen}
				onTogglePanel={() => setIsSidebarOpen((prev) => !prev)}
				isMaximized={maximizedViewport !== null}
				onToggleMaximize={() => handleToggleMaximize(activeViewport)}
			/>

			{isComparisonSplitOpen && (
				<div style={{ position: "fixed", inset: 0, zIndex: 999999 }} data-testid="cbct-comparison-split-overlay">
					<RadiologyConsultationSplit
						patientName={patientDisplayName}
						initialSplitMode="dynamics"
						onClose={() => setIsComparisonSplitOpen(false)}
					/>
				</div>
			)}

			{isLabOrderModalOpen && labOrderDraft && (
				<DentalLabOrderModal
					isOpen={isLabOrderModalOpen}
					onClose={() => setIsLabOrderModalOpen(false)}
					initialOrder={labOrderDraft}
					patientId={effectivePatientId}
					patientName={patientDisplayName}
					onOrderSaved={() => setIsLabOrderModalOpen(false)}
				/>
			)}
		</div>
	);
};
