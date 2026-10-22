/**
 * useCbctStudioModalState.ts — стейт и реактивные вычисления для модального окна 3D КЛКТ Студии.
 * Mandate 8b: Модульность, строго < 200 строк.
 */

import { useCallback, useMemo, useRef, useState } from "react";
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
	DEFAULT_OBLIQUE_ROTATION,
	DEFAULT_VIEWPORT_TRANSFORM,
	sampleVoxelHU,
	worldMmToVoxel,
} from "../cbctMprMath";
import {
	DEFAULT_MANDIBULAR_ARCH_ANCHORS,
	type CrossSectionSliceData,
	type DentalArchCurve,
	type PanoramicReconstructionResult,
	buildDentalArchCurve,
} from "../dentalCurveEngine";
import {
	type ImplantBrandKey,
	type VirtualImplantSpec,
	type CrossSectionImplantPose,
	type MandibularCanalCrossSection,
	type Implant3DWorldProjection,
	type LiveImplantTelemetry,
	type Vec3,
	STANDARD_IMPLANT_CATALOG,
	auditNerveSafetyMargin,
	calculateApexCoordinates,
	calculateImplant3DWorldPose,
	computeLiveImplantTelemetry,
	sampleCrossSectionHUProfile,
} from "../implantSafetyEngine";
import {
	calculateSplineLength3DMm,
	interpolateNerveSpline3D,
	project3DNerveToCrossSection,
	type AlveolarRidgeCaliperMeasurement,
} from "../cbctCaliperNerveMath";
import {
	type HUZoneSampling,
	type MischClassificationResult,
	classifyMischBoneQuality,
} from "../boneDensityMischMath";
import type { CbctToolMode } from "../CbctLeftToolDock";
import {
	type StudioMode,
	type ViewLayoutMode,
	type NerveCanalSide,
	getDefaultViewportTransforms,
} from "../mpr/cbctStudioTypes";
import { isDemoShowcaseMode, isDemoPatientId } from "../../../utils/demoModeEngine.js";
import { loadDoctorCbctSettings } from "../cbctLutMath";

export interface UseCbctStudioModalStateProps {
	readonly initialStudioMode?: StudioMode | undefined;
	readonly initialSidebarOpen?: boolean | undefined;
	readonly initialCaliper?: AlveolarRidgeCaliperMeasurement | null | undefined;
	readonly initialViewLayout?: ViewLayoutMode | undefined;
	readonly initialVolume?: CbctVoxelVolume | null | undefined;
	readonly initialTool?: CbctToolMode | undefined;
	readonly initialNervePoints?: readonly Point3D[] | undefined;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
}

export function useCbctStudioModalState({
	initialStudioMode,
	initialSidebarOpen,
	initialCaliper,
	initialViewLayout,
	initialVolume,
	initialTool,
	initialNervePoints,
	patientName,
	patientId,
}: UseCbctStudioModalStateProps) {
	const [studioMode, setStudioMode] = useState<StudioMode>(initialStudioMode ?? "diagnostic");
	const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(initialSidebarOpen ?? (initialStudioMode === "implant"));
	const [activeCaliper, setActiveCaliper] = useState<AlveolarRidgeCaliperMeasurement | null>(initialCaliper ?? null);
	const [viewLayout, setViewLayout] = useState<ViewLayoutMode>(initialViewLayout ?? "quad_view");
	const [maximizedViewport, setMaximizedViewport] = useState<CbctViewportType | null>(null);
	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
	const [isStudioMenuOpen, setIsStudioMenuOpen] = useState<boolean>(false);
	const studioMenuRef = useRef<HTMLDivElement | null>(null);
	const [isUnsharpActive, setIsUnsharpActive] = useState<boolean>(false);
	const [isComparisonSplitOpen, setIsComparisonSplitOpen] = useState<boolean>(false);

	const [volume, setVolume] = useState<CbctVoxelVolume | null>(() => {
		if (initialVolume) return initialVolume;
		if ((isDemoShowcaseMode() || isDemoPatientId(patientId)) && typeof window !== "undefined") {
			const win = window as unknown as { __cbctDemoVolume?: CbctVoxelVolume };
			if (win.__cbctDemoVolume) return win.__cbctDemoVolume;
		}
		return null;
	});
	const [doctorDefaults] = useState(() => loadDoctorCbctSettings());
	const [activePreset, setActivePreset] = useState<string>("standard");
	const [windowWidth, setWindowWidth] = useState<number>(() => doctorDefaults.windowWidth);
	const [windowLevel, setWindowLevel] = useState<number>(() => doctorDefaults.windowLevel);
	const [invertColors, setInvertColors] = useState<boolean>(false);
	const [slabMode, setSlabMode] = useState<SlabProjectionMode>("single");
	const [slabThicknessMm, setSlabThicknessMm] = useState<number>(() => doctorDefaults.mprThicknessMm);
	const [panoThicknessMm, setPanoThicknessMm] = useState<number>(() => doctorDefaults.panoThicknessMm);
	const [panoProjectionMode, setPanoProjectionMode] = useState<string>("average");
	const [loadedSliceCount, setLoadedSliceCount] = useState<number>(0);
	const [patientDisplayName, setPatientDisplayName] = useState<string>(patientName || "3D КЛКТ исследование");

	const [crosshairMm, setCrosshairMm] = useState<Point3D>({ x: 0, y: 0, z: 0 });
	const [obliqueAngles, setObliqueAngles] = useState<ObliqueRotationAngles>(DEFAULT_OBLIQUE_ROTATION);
	const [mobileActiveTab, setMobileActiveTab] = useState<"axial" | "coronal" | "sagittal" | "panoramic" | "planner">("axial");

	const [jawType, setJawType] = useState<"mandible" | "maxilla">("mandible");
	const [showDentalArch, setShowDentalArch] = useState<boolean>(initialStudioMode === "panoramic");
	const [showEdgeRulers, setShowEdgeRulers] = useState<boolean>(false);
	const [hoveredViewport, setHoveredViewport] = useState<CbctViewportType | null>(null);
	const [archCurve, setArchCurve] = useState<DentalArchCurve>(() =>
		buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible"),
	);
	const [panoramicData, setPanoramicData] = useState<PanoramicReconstructionResult | null>(null);
	const [crossSections, setCrossSections] = useState<CrossSectionSliceData[]>([]);
	const [activeCrossSectionIdx, setActiveCrossSectionIdx] = useState<number>(0);
	const [crossSectionStepMm, setCrossSectionStepMm] = useState<number>(1.5);

	const [selectedBrand, setSelectedBrand] = useState<ImplantBrandKey>("osstem");
	const [selectedDiameterMm, setSelectedDiameterMm] = useState<number>(4.0);
	const [selectedLengthMm, setSelectedLengthMm] = useState<number>(10.0);
	const [implantEntryXOffsetMm, setImplantEntryXOffsetMm] = useState<number>(0.0);
	const [implantEntryDepthMm, setImplantEntryDepthMm] = useState<number>(2.0);
	const [implantAngulationDeg, setImplantAngulationDeg] = useState<number>(0.0);
	const [activeNerveSide, setActiveNerveSide] = useState<NerveCanalSide>("right");
	const [rightNervePoints, setRightNervePoints] = useState<Point3D[]>(() => (initialNervePoints ? [...initialNervePoints] : []));
	const [leftNervePoints, setLeftNervePoints] = useState<Point3D[]>([]);
	const [selectedNerveNodeIdx, setSelectedNerveNodeIdx] = useState<number | null>(null);

	const nervePoints = useMemo(() => (activeNerveSide === "right" ? rightNervePoints : leftNervePoints), [activeNerveSide, rightNervePoints, leftNervePoints]);
	const setNervePoints = useCallback((action: React.SetStateAction<Point3D[]>) => {
		if (activeNerveSide === "right") setRightNervePoints(action);
		else setLeftNervePoints(action);
	}, [activeNerveSide]);

	const [dragImplantPart, setDragImplantPart] = useState<string | null>(null);
	const [hoveredImplantPart, setHoveredImplantPart] = useState<string | null>(null);
	const [crossSectionDragStart, setCrossSectionDragStart] = useState<{ clientX: number; clientY: number; startX: number; startY: number; startAng: number } | null>(null);
	const [canalXOffsetMm, setCanalXOffsetMm] = useState<number>(2.0);
	const [canalYDepthMm, setCanalYDepthMm] = useState<number>(16.5);

	const [activeTool, setActiveTool] = useState<CbctToolMode>(() => initialTool ?? "crosshair");
	const [activeViewport, setActiveViewport] = useState<CbctViewportType>("axial");
	const [rulers, setRulers] = useState<CbctMeasurementRuler[]>([]);
	const [activeRuler, setActiveRuler] = useState<(CbctMeasurementRuler & { currentMm: Point3D }) | null>(null);
	const [angles, setAngles] = useState<CbctAngleMeasurement[]>([]);
	const [activeAngle, setActiveAngle] = useState<(CbctAngleMeasurement & { currentMm: Point3D }) | null>(null);
	const [probeMarkers, setProbeMarkers] = useState<CbctProbeMarker[]>([]);
	const [activeProbe, setActiveProbe] = useState<(CbctProbeMarker & { hu: number; tissueName: string }) | null>(null);
	const [selectedMeasurement, setSelectedMeasurement] = useState<CbctMeasurementRuler | CbctAngleMeasurement | CbctProbeMarker | null>(null);
	const [hoveredMeasurementHandle, setHoveredMeasurementHandle] = useState<{ id: string; handleIndex: number } | null>(null);
	const [draggingMeasurementHandle, setDraggingMeasurementHandle] = useState<{ id: string; handleIndex: number } | null>(null);
	const [transforms, setTransforms] = useState<Record<CbctViewportType, ViewportTransform>>(getDefaultViewportTransforms);

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

	const currentVoxel = useMemo(() => volume ? worldMmToVoxel(crosshairMm, volume) : { x: 0, y: 0, z: 0 }, [volume, crosshairMm]);
	const sampledVoxelHU = useMemo(() => volume ? sampleVoxelHU(currentVoxel.x, currentVoxel.y, currentVoxel.z, volume) : 0, [volume, currentVoxel]);
	const interpolatedNerve3D = useMemo(() => nervePoints.length < 2 ? nervePoints : interpolateNerveSpline3D(nervePoints, 12), [nervePoints]);
	const nerveTotalLengthMm = useMemo(() => interpolatedNerve3D.length < 2 ? 0 : calculateSplineLength3DMm(interpolatedNerve3D), [interpolatedNerve3D]);

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
				interpolatedNerve3D, activeCrossSection.centerPointMm, activeCrossSection.normalVector2D,
				activeCrossSection.tangentVector2D, activeCrossSection.heightMm, 4.0,
			);
			if (proj) return { center: { x: proj.xOffsetMm, y: proj.yDepthMm }, radiusMm: 1.4, safetyMarginMm: 2.0 };
		}
		return { center: { x: canalXOffsetMm, y: canalYDepthMm }, radiusMm: 1.4, safetyMarginMm: 2.0 };
	}, [activeCrossSection, interpolatedNerve3D, canalXOffsetMm, canalYDepthMm]);

	const nerveAuditResult = useMemo(() => auditNerveSafetyMargin(currentImplantPose, currentCanal), [currentImplantPose, currentCanal]);
	const huSamplingResult: HUZoneSampling = useMemo(() => sampleCrossSectionHUProfile(volume, currentImplantPose, implant3DWorld), [volume, currentImplantPose, implant3DWorld]);
	const mischClassification: MischClassificationResult = useMemo(() => classifyMischBoneQuality(huSamplingResult), [huSamplingResult]);

	const liveImplantTelemetry: LiveImplantTelemetry | null = useMemo(() => {
		if (!implant3DWorld && !currentImplantPose) return null;
		const implantTarget = implant3DWorld ?? currentImplantPose;
		const markers = interpolatedNerve3D.length > 0
			? [{ id: "ian-nerve-spline", type: "nerve" as const, radius: 1.4, points: interpolatedNerve3D.map((p) => [p.x, p.y, p.z] as Vec3) }]
			: [];
		return computeLiveImplantTelemetry(implantTarget, volume, markers, []);
	}, [implant3DWorld, currentImplantPose, volume, interpolatedNerve3D]);

	const displayBoneClass = liveImplantTelemetry?.boneClass ?? (huSamplingResult.status === "measured" ? mischClassification.mischClass : "D3");
	const displayMeanHU = liveImplantTelemetry?.meanHU ?? (huSamplingResult.status === "measured" ? huSamplingResult.overallMeanHU : null);
	const displayTorque = liveImplantTelemetry?.recommendedTorqueNcm && liveImplantTelemetry.recommendedTorqueNcm !== "—"
		? liveImplantTelemetry.recommendedTorqueNcm
		: `${mischClassification.estimatedInsertionTorqueNcm.expectedNcm} Н·см`;
	const displayNerveClearanceMm = liveImplantTelemetry?.nerveClearanceMm ?? (nerveAuditResult.safetyStatus !== "unmeasured" ? nerveAuditResult.netClearanceToCanalWallMm : null);
	const displayDrillingProtocol = liveImplantTelemetry?.drillingProtocol ?? mischClassification.recommendedDrillingRpm;

	return {
		studioMode, setStudioMode,
		isSidebarOpen, setIsSidebarOpen,
		activeCaliper, setActiveCaliper,
		viewLayout, setViewLayout,
		maximizedViewport, setMaximizedViewport,
		isFullscreen, setIsFullscreen,
		isStudioMenuOpen, setIsStudioMenuOpen,
		studioMenuRef,
		isUnsharpActive, setIsUnsharpActive,
		isComparisonSplitOpen, setIsComparisonSplitOpen,
		volume, setVolume,
		activePreset, setActivePreset,
		windowWidth, setWindowWidth,
		windowLevel, setWindowLevel,
		invertColors, setInvertColors,
		slabMode, setSlabMode,
		slabThicknessMm, setSlabThicknessMm,
		panoThicknessMm, setPanoThicknessMm,
		panoProjectionMode, setPanoProjectionMode,
		loadedSliceCount, setLoadedSliceCount,
		patientDisplayName, setPatientDisplayName,
		crosshairMm, setCrosshairMm,
		obliqueAngles, setObliqueAngles,
		mobileActiveTab, setMobileActiveTab,
		jawType, setJawType,
		showDentalArch, setShowDentalArch,
		showEdgeRulers, setShowEdgeRulers,
		hoveredViewport, setHoveredViewport,
		archCurve, setArchCurve,
		panoramicData, setPanoramicData,
		crossSections, setCrossSections,
		activeCrossSectionIdx, setActiveCrossSectionIdx,
		crossSectionStepMm, setCrossSectionStepMm,
		selectedBrand, setSelectedBrand,
		selectedDiameterMm, setSelectedDiameterMm,
		selectedLengthMm, setSelectedLengthMm,
		implantEntryXOffsetMm, setImplantEntryXOffsetMm,
		implantEntryDepthMm, setImplantEntryDepthMm,
		implantAngulationDeg, setImplantAngulationDeg,
		activeNerveSide, setActiveNerveSide,
		nervePoints, setNervePoints,
		selectedNerveNodeIdx, setSelectedNerveNodeIdx,
		dragImplantPart, setDragImplantPart,
		hoveredImplantPart, setHoveredImplantPart,
		crossSectionDragStart, setCrossSectionDragStart,
		canalXOffsetMm, setCanalXOffsetMm,
		canalYDepthMm, setCanalYDepthMm,
		activeTool, setActiveTool,
		activeViewport, setActiveViewport,
		rulers, setRulers,
		activeRuler, setActiveRuler,
		angles, setAngles,
		activeAngle, setActiveAngle,
		probeMarkers, setProbeMarkers,
		activeProbe, setActiveProbe,
		selectedMeasurement, setSelectedMeasurement,
		hoveredMeasurementHandle, setHoveredMeasurementHandle,
		draggingMeasurementHandle, setDraggingMeasurementHandle,
		transforms, setTransforms,
		axialBaseCanvasRef, axialOverlayCanvasRef,
		coronalBaseCanvasRef, coronalOverlayCanvasRef,
		sagittalBaseCanvasRef, sagittalOverlayCanvasRef,
		panoBaseCanvasRef, panoOverlayCanvasRef,
		crossSectionBaseCanvasRef, crossSectionOverlayCanvasRef,
		currentVoxel, sampledVoxelHU,
		interpolatedNerve3D, nerveTotalLengthMm,
		currentImplantSpec, activeCrossSection,
		currentImplantPose, implant3DWorld,
		currentCanal, nerveAuditResult,
		huSamplingResult, mischClassification,
		liveImplantTelemetry, displayBoneClass,
		displayMeanHU, displayTorque,
		displayNerveClearanceMm, displayDrillingProtocol,
	};
}
