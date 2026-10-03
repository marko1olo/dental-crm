import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	type CbctVoxelVolume, type Point3D, type SlabProjectionMode, type ObliqueRotationAngles,
	type ViewportTransform, type CbctMeasurementRuler, type CbctAngleMeasurement, type CbctProbeMarker, type CbctViewportType,
	CBCT_HOUNSFIELD_PRESETS, DEFAULT_OBLIQUE_ROTATION, DEFAULT_VIEWPORT_TRANSFORM, ROMEXIS_COLORS, disposeCbctVolume, getTissueNameFromHU, sampleVoxelHU, worldMmToVoxel,
} from "./cbctMprMath";
import { useCbctKeyboardShortcuts, applyStepZoom } from "./useCbctKeyboardShortcuts";
import { CbctHotkeysStatusBar } from "./CbctHotkeysStatusBar";
import {
	DEFAULT_MANDIBULAR_ARCH_ANCHORS, DEFAULT_MAXILLARY_ARCH_ANCHORS,
	type CrossSectionSliceData, type DentalArchCurve, type PanoramicReconstructionResult,
	autoDetectDentalArch, buildDentalArchCurve, findOcclusalZPlane, generateCrossSectionSlices, reconstructPanoramicView,
} from "./dentalCurveEngine";
import { getSharedCbctWorkerBridge } from "./mpr/cbctWorkerBridge";
import { getSharedCbctGlContext } from "./mpr/webgl/CbctVolumeGlContext";
import {
	type ImplantBrandKey, type VirtualImplantSpec, type CrossSectionImplantPose,
	type MandibularCanalCrossSection, type Implant3DWorldProjection, type LiveImplantTelemetry, type Vec3,
	STANDARD_IMPLANT_CATALOG, auditNerveSafetyMargin, calculateApexCoordinates, calculateImplant3DWorldPose,
	computeLiveImplantTelemetry, playNerveSafetyAudioAlarm, sampleCrossSectionHUProfile,
} from "./implantSafetyEngine";
import {
	calculateSplineLength3DMm, interpolateNerveSpline3D, project3DNerveToCrossSection, type AlveolarRidgeCaliperMeasurement,
} from "./cbctCaliperNerveMath";
import {
	type HUZoneSampling, type MischClassificationResult, classifyMischBoneQuality,
} from "./boneDensityMischMath";
import { CbctLeftToolDock, type CbctToolMode } from "./CbctLeftToolDock";
import { showToast } from "../GlobalToast";
import { useCbctStudioExports } from "./mpr/useCbctStudioExports";
import {
	type StudioMode, type ViewLayoutMode, type CbctMprImplantStudioModalProps,
	DEFAULT_IAN_NERVE_POINTS, formatNerveNodesPlural, ROTATE_CURSOR, getDefaultViewportTransforms,
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
// Re-exports for backwards compatibility & wave224 test anchors (data-testid="cbct-empty-volume-dropzone")
export type { StudioMode, ViewLayoutMode, CbctMprImplantStudioModalProps };
export { DEFAULT_IAN_NERVE_POINTS, formatNerveNodesPlural, ROTATE_CURSOR, getTissueNameFromHU };

export const CbctMprImplantStudioModal: React.FC<
	CbctMprImplantStudioModalProps & {
		readonly initialViewLayout?: ViewLayoutMode | undefined;
		readonly initialVolume?: CbctVoxelVolume | null | undefined;
	}
> = ({
	isOpen,
	onClose,
	study,
	patientName,
	patientId,
	onApplyToDiary043,
	onApplyToPlan,
	initialStudioMode,
	initialSidebarOpen,
	initialCaliper,
	initialViewLayout,
	initialVolume,
	initialImageIds,
	autoLoadDemo,
}) => {
	const modalId = "cbct-studio-modal";

	// Studio mode & layout
	const [studioMode, setStudioMode] = useState<StudioMode>(initialStudioMode ?? "diagnostic");
	const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(initialSidebarOpen ?? (initialStudioMode === "implant"));
	const [activeCaliper, setActiveCaliper] = useState<AlveolarRidgeCaliperMeasurement | null>(initialCaliper ?? null);
	const [viewLayout, setViewLayout] = useState<ViewLayoutMode>(initialViewLayout ?? "quad_view");
	const [maximizedViewport, setMaximizedViewport] = useState<CbctViewportType | null>(null), [isFullscreen, setIsFullscreen] = useState<boolean>(false);
	const [isStudioMenuOpen, setIsStudioMenuOpen] = useState<boolean>(false), studioMenuRef = useRef<HTMLDivElement | null>(null), [isUnsharpActive, setIsUnsharpActive] = useState<boolean>(false);

	const handleToggleUnsharp = useCallback(() => {
		setIsUnsharpActive((prev) => {
			const next = !prev;
			try {
				getSharedCbctGlContext().setSharpenAmount(next ? 0.6 : 0.0);
			} catch {
				/* safe in non-webgl */
			}
			showToast(next ? "Резкость трабекул: ВКЛ (SHARP ON)" : "Резкость: Исходный воксел (RAW VOXEL)", "info");
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

	// Volume state
	const [volume, setVolume] = useState<CbctVoxelVolume | null>(() => {
		if (initialVolume) return initialVolume;
		const isDemo = isDemoShowcaseMode() || isDemoPatientId(patientId);
		if (isDemo && typeof window !== "undefined") {
			const win = window as unknown as { __cbctDemoVolume?: CbctVoxelVolume };
			if (win.__cbctDemoVolume) return win.__cbctDemoVolume;
		}
		return null;
	});
	const [doctorDefaults] = useState(() => loadDoctorCbctSettings());
	const [activePreset, setActivePreset] = useState<string>("standard");
	const [windowWidth, setWindowWidth] = useState<number>(() => doctorDefaults.windowWidth), [windowLevel, setWindowLevel] = useState<number>(() => doctorDefaults.windowLevel);
	const [invertColors, setInvertColors] = useState<boolean>(false), [slabMode, setSlabMode] = useState<SlabProjectionMode>("single");
	const [slabThicknessMm, setSlabThicknessMm] = useState<number>(() => doctorDefaults.mprThicknessMm), [panoThicknessMm, setPanoThicknessMm] = useState<number>(() => doctorDefaults.panoThicknessMm);
	const [panoProjectionMode, setPanoProjectionMode] = useState<string>("average"), [loadedSliceCount, setLoadedSliceCount] = useState<number>(0);
	const [patientDisplayName, setPatientDisplayName] = useState<string>(patientName || "3D КЛКТ исследование");

	// Crosshair & oblique angles
	const [crosshairMm, setCrosshairMm] = useState<Point3D>({ x: 0, y: 0, z: 0 });
	const [obliqueAngles, setObliqueAngles] = useState<ObliqueRotationAngles>(DEFAULT_OBLIQUE_ROTATION);
	const [mobileActiveTab, setMobileActiveTab] = useState<"axial" | "coronal" | "sagittal" | "panoramic" | "planner">("axial");

	// Dental arch & panorama (Default false in diagnostic MPR, active in panoramic, Mandate 8l)
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

	// Implant planning & nerve safety
	const [selectedBrand, setSelectedBrand] = useState<ImplantBrandKey>("osstem");
	const [selectedDiameterMm, setSelectedDiameterMm] = useState<number>(4.0), [selectedLengthMm, setSelectedLengthMm] = useState<number>(10.0);
	const [implantEntryXOffsetMm, setImplantEntryXOffsetMm] = useState<number>(0.0), [implantEntryDepthMm, setImplantEntryDepthMm] = useState<number>(2.0);
	const [implantAngulationDeg, setImplantAngulationDeg] = useState<number>(0.0), [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(false);
	const [nervePoints, setNervePoints] = useState<Point3D[]>([]), [selectedNerveNodeIdx, setSelectedNerveNodeIdx] = useState<number | null>(null);
	const [dragImplantPart, setDragImplantPart] = useState<string | null>(null), [hoveredImplantPart, setHoveredImplantPart] = useState<string | null>(null);
	const [crossSectionDragStart, setCrossSectionDragStart] = useState<{ clientX: number; clientY: number; startX: number; startY: number; startAng: number } | null>(null);
	const [canalXOffsetMm, setCanalXOffsetMm] = useState<number>(2.0), [canalYDepthMm, setCanalYDepthMm] = useState<number>(16.5);

	// Measurement tools & transforms
	const [activeTool, setActiveTool] = useState<CbctToolMode>("crosshair");
	const [activeViewport, setActiveViewport] = useState<CbctViewportType>("axial");
	const [rulers, setRulers] = useState<CbctMeasurementRuler[]>([]), [activeRuler, setActiveRuler] = useState<(CbctMeasurementRuler & { currentMm: Point3D }) | null>(null);
	const [angles, setAngles] = useState<CbctAngleMeasurement[]>([]), [activeAngle, setActiveAngle] = useState<(CbctAngleMeasurement & { currentMm: Point3D }) | null>(null);
	const [probeMarkers, setProbeMarkers] = useState<CbctProbeMarker[]>([]), [activeProbe, setActiveProbe] = useState<(CbctProbeMarker & { hu: number; tissueName: string }) | null>(null);
	const [selectedMeasurement, setSelectedMeasurement] = useState<CbctMeasurementRuler | CbctAngleMeasurement | CbctProbeMarker | null>(null);
	const [hoveredMeasurementHandle, setHoveredMeasurementHandle] = useState<{ id: string; handleIndex: number } | null>(null);
	const [draggingMeasurementHandle, setDraggingMeasurementHandle] = useState<{ id: string; handleIndex: number } | null>(null);
	const [transforms, setTransforms] = useState<Record<CbctViewportType, ViewportTransform>>(getDefaultViewportTransforms);

	// Canvas refs
	const axialBaseCanvasRef = useRef<HTMLCanvasElement | null>(null), axialOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const coronalBaseCanvasRef = useRef<HTMLCanvasElement | null>(null), coronalOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const sagittalBaseCanvasRef = useRef<HTMLCanvasElement | null>(null), sagittalOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const panoBaseCanvasRef = useRef<HTMLCanvasElement | null>(null), panoOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const crossSectionBaseCanvasRef = useRef<HTMLCanvasElement | null>(null), crossSectionOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

	// Calculations
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

	// Audio alarm
	useEffect(() => {
		if (studioMode === "implant" && nerveAuditResult.shouldTriggerAudioAlarm && isAudioEnabled) {
			playNerveSafetyAudioAlarm(nerveAuditResult.safetyStatus, isAudioEnabled);
		}
	}, [studioMode, nerveAuditResult.shouldTriggerAudioAlarm, nerveAuditResult.safetyStatus, isAudioEnabled]);

	// 1-Click Clipboard Snapshot Sharing (Mandate 8l, Zero-Friction Sharing Ctrl+C)
	const clipboardSnapshot = useCbctClipboardSnapshot({
		activeViewport,
		patientDisplayName,
		crossSectionBaseCanvasRef,
		crossSectionOverlayCanvasRef,
		panoBaseCanvasRef,
		panoOverlayCanvasRef,
		axialBaseCanvasRef,
		axialOverlayCanvasRef,
		coronalBaseCanvasRef,
		coronalOverlayCanvasRef,
		sagittalBaseCanvasRef,
		sagittalOverlayCanvasRef,
		isEnabled: isOpen,
	});

	// Auto-detect dental arch (switches to panoramic if called explicitly, Mandate 8l)
	const handleAutoDetectArch = useCallback(() => {
		if (!volume) {
			showToast("Для авто-поиска дуги требуется активный 3D объем КТ", "error");
			return;
		}
		try {
			const detected = autoDetectDentalArch(volume, jawType);
			setArchCurve(detected);
			if (studioMode !== "panoramic") handleSelectStudioMode("panoramic");
			setShowDentalArch(true);
			const occlusalZMm = findOcclusalZPlane(volume, jawType);
			const midAnchor = detected.anchors[Math.floor(detected.anchors.length / 2)];
			setCrosshairMm({ x: midAnchor?.positionMm.x ?? 0, y: midAnchor?.positionMm.y ?? 0, z: occlusalZMm });
			showToast(`Авто-поиск дуги: выровнено ${detected.anchors.length} ориентиров`, "success");
		} catch {
			if (studioMode !== "panoramic") handleSelectStudioMode("panoramic");
			setShowDentalArch(true);
			showToast("Авто-поиск дуги активирован", "info");
		}
	}, [volume, jawType, studioMode, handleSelectStudioMode]);

	// Physical jaw switcher callback (Switches Z-slice, recalculates arch, OPG, and cross-sections)
	const handleSwitchJaw = useCallback((newJaw: "mandible" | "maxilla") => {
		setJawType(newJaw);
		if (!volume) {
			showToast(newJaw === "maxilla" ? "Верхняя челюсть (ВЧ)" : "Нижняя челюсть (НЧ)", "info");
			return;
		}
		try {
			const detected = autoDetectDentalArch(volume, newJaw);
			setArchCurve(detected);
			if (studioMode === "panoramic") setShowDentalArch(true);
			const occlusalZMm = detected.planeZMm ?? findOcclusalZPlane(volume, newJaw);
			let archCenterX = 0, archCenterY = 0;
			if (detected.splinePointsMm.length > 0) {
				const midIdx = Math.floor(detected.splinePointsMm.length / 2);
				archCenterX = detected.splinePointsMm[midIdx]?.x ?? 0;
				archCenterY = detected.splinePointsMm[midIdx]?.y ?? 0;
			}
			setCrosshairMm({ x: archCenterX, y: archCenterY, z: occlusalZMm });
			showToast(newJaw === "maxilla" ? "ВЧ: Z-срез и дуга обновлены" : "НЧ: Z-срез и дуга обновлены", "success");
		} catch {
			showToast(`Переключено на ${newJaw === "maxilla" ? "ВЧ" : "НЧ"}`, "info");
		}
	}, [volume, studioMode]);

	// Panoramic and cross-sections update (Asynchronous Web Worker offloading for 60 FPS fluidity)
	useEffect(() => {
		if (!volume || !isOpen || volume.isProgressivePreview) return;
		let isCancelled = false;

		const panoRes = reconstructPanoramicView(volume, archCurve, {
			windowWidth,
			windowLevel,
			invert: invertColors,
			heightMm: volume.physicalSizeMm?.z ? Math.min(78.0, volume.physicalSizeMm.z * 0.98) : 74.0,
			pixelSpacingMm: 0.25,
			focalTroughThicknessMm: panoThicknessMm,
			projectionMode: panoProjectionMode,
			sharpenAmount: isUnsharpActive ? 0.18 : 0.0,
			gamma: 1.50,
			useSoftKnee: false,
			airCutoffHU: -500,
		} as any);
		setPanoramicData(panoRes);

		const bridge = getSharedCbctWorkerBridge();
		bridge
			.requestCrossSectionSeries({
				volume,
				archCurve,
				options: {
					stepMm: crossSectionStepMm,
					sliceCenterZMm: crosshairMm.z,
					widthMm: 24.0,
					heightMm: 34.0,
					windowWidth: windowWidth ?? 4025,
					windowLevel: windowLevel ?? 525,
					gamma: 1.50,
					airCutoffHU: -500,
					softKnee: false,
					slabThicknessMm: slabThicknessMm ?? 1.0,
					invert: invertColors,
				},
			})
			.then((crossSlices) => {
				if (!isCancelled && crossSlices.length > 0) {
					setCrossSections(crossSlices);
				}
			})
			.catch(() => {
				if (!isCancelled) {
					const crossSlices = generateCrossSectionSlices(volume, archCurve, crossSectionStepMm, crosshairMm.z, {
						widthMm: 24.0,
						heightMm: 34.0,
						windowWidth: windowWidth ?? 4025,
						windowLevel: windowLevel ?? 525,
						gamma: 1.50,
						airCutoffHU: -500,
						softKnee: false,
						slabThicknessMm: slabThicknessMm ?? 1.0,
						invert: invertColors,
					});
					setCrossSections(crossSlices);
				}
			});

		return () => {
			isCancelled = true;
		};
	}, [volume, isOpen, archCurve, crossSectionStepMm, windowWidth, windowLevel, invertColors, crosshairMm.z, isUnsharpActive, panoThicknessMm, panoProjectionMode]);

	useEffect(() => {
		const isDemo = isDemoShowcaseMode() || isDemoPatientId(patientId);
		const applyVol = (vol: CbctVoxelVolume) => {
			setVolume(vol);
			setLoadedSliceCount(vol.dimensions.depth);
			if (vol.defaultWindowWidth) setWindowWidth(vol.defaultWindowWidth);
			if (vol.defaultWindowLevel) setWindowLevel(vol.defaultWindowLevel);
			if (vol.patientName && vol.patientName.trim()) {
				setPatientDisplayName(vol.patientName.trim());
			} else if (patientName && patientName.trim()) {
				setPatientDisplayName(patientName.trim());
			} else if (isDemo) {
				setPatientDisplayName("Демо 3D КЛКТ");
			} else {
				setPatientDisplayName("3D КЛКТ исследование");
			}
			try {
				const detected = autoDetectDentalArch(vol, jawType);
				setArchCurve(detected);
				if (studioMode === "panoramic") setShowDentalArch(true);
				const occlusalZMm = detected.planeZMm ?? findOcclusalZPlane(vol, jawType);
				let archCenterX = 0, archCenterY = 0;
				if (detected.splinePointsMm.length > 0) {
					const midIdx = Math.floor(detected.splinePointsMm.length / 2);
					archCenterX = detected.splinePointsMm[midIdx]?.x ?? 0;
					archCenterY = detected.splinePointsMm[midIdx]?.y ?? 0;
				}
				setCrosshairMm({ x: archCenterX, y: archCenterY, z: occlusalZMm });
			} catch {
				// keep defaults
			}
		};

		if (initialVolume && !volume) {
			applyVol(initialVolume);
		} else if (typeof window !== "undefined") {
			const win = window as unknown as { __cbctDemoVolume?: CbctVoxelVolume };
			if (win.__cbctDemoVolume && !volume) {
				applyVol(win.__cbctDemoVolume);
			}
			const handleCustomLoad = (e: Event) => {
				const customEvent = e as CustomEvent<CbctVoxelVolume>;
				if (customEvent.detail) {
					applyVol(customEvent.detail);
				}
			};
			window.addEventListener("dente-load-cbct-volume", handleCustomLoad);
			return () => {
				window.removeEventListener("dente-load-cbct-volume", handleCustomLoad);
			};
		}
	}, [initialVolume, volume, jawType, patientId, patientName]);

	const handleResetAll = useCallback(() => {
		if (volume) setCrosshairMm({ x: 0, y: 0, z: 0 });
		setObliqueAngles(DEFAULT_OBLIQUE_ROTATION);
		setTransforms(getDefaultViewportTransforms());
		setRulers([]);
		setAngles([]);
		setProbeMarkers([]);
		setActiveTool("crosshair");
		setSelectedMeasurement(null);
		setWindowWidth(4400);
		setWindowLevel(1300);
		setSlabMode("single");
		setSlabThicknessMm(1.0);
		setPanoThicknessMm(3.0);
		setPanoProjectionMode("ray_sum");
		setActivePreset("standard");
		showToast("Виджеты и проекции КТ сброшены", "info");
	}, [volume]);

	const handleFullResetViewport = useCallback((viewport: CbctViewportType) => {
		setTransforms((prev) => ({ ...prev, [viewport]: { ...DEFAULT_VIEWPORT_TRANSFORM } }));
		showToast(`Масштаб ${viewport} сброшен`, "info");
	}, []);

	const handleClearRulers = useCallback((plane?: CbctViewportType) => {
		setRulers((prev) => (plane ? prev.filter((r) => r.plane !== plane) : []));
		showToast(plane ? `Замеры ${plane} очищены` : "Все экранные замеры очищены", "info");
	}, []);

	const handleClearAngles = useCallback((plane?: CbctViewportType) => {
		setAngles((prev) => (plane ? prev.filter((a) => a.plane !== plane) : []));
		showToast(plane ? `Замеры углов ${plane} очищены` : "Все замеры углов очищены", "info");
	}, []);

	const handleSelectQuickWlPreset = useCallback((preset: { windowWidth: number; windowLevel: number }) => {
		setWindowWidth(preset.windowWidth);
		setWindowLevel(preset.windowLevel);
	}, []);

	// DICOM Loader hook
	const dicomLoader = useCbctDicomLoader({
		jawType, resolvedPatientName: patientDisplayName, setVolume, setLoadedSliceCount,
		setPatientDisplayName, setWindowWidth, setWindowLevel, setArchCurve, setShowDentalArch, setCrosshairMm,
	});

	// Auto-load slices if initialImageIds is provided and volume is not yet set
	useEffect(() => {
		if (isOpen && !volume && initialImageIds && initialImageIds.length > 0) {
			dicomLoader.handleLoadImageIds(initialImageIds);
		}
	}, [isOpen, volume, initialImageIds, dicomLoader.handleLoadImageIds]);

	// Auto-load demo volume (Zakharov 312 slices) if requested or if patientId is demo and volume is not yet set
	const autoLoadDemoAttemptedRef = useRef(false);
	useEffect(() => {
		if (isOpen && !volume && !autoLoadDemoAttemptedRef.current) {
			const isDemoReq =
				Boolean(autoLoadDemo) ||
				patientId === "demo_cbct_patient" ||
				isDemoPatientId(patientId) ||
				(typeof window !== "undefined" &&
					(window.location.search.includes("cbct=") ||
						window.location.search.includes("cbct") ||
						window.location.hash.includes("cbct=") ||
						window.location.hash.includes("cbct")));
			if (isDemoReq) {
				autoLoadDemoAttemptedRef.current = true;
				void dicomLoader.handleLoadDemoVolume();
			}
		}
	}, [isOpen, volume, autoLoadDemo, patientId, dicomLoader.handleLoadDemoVolume]);

	// Interaction handlers hook
	const interactions = useCbctInteractionHandlers({
		volume, crosshairMm, setCrosshairMm, obliqueAngles, setObliqueAngles, activeTool, studioMode,
		windowWidth, setWindowWidth, windowLevel, setWindowLevel, transforms, setTransforms,
		rulers, setRulers, activeRuler, setActiveRuler, angles, setAngles, activeAngle, setActiveAngle,
		probeMarkers, setProbeMarkers, activeProbe, setActiveProbe, selectedMeasurement, setSelectedMeasurement,
		hoveredMeasurementHandle, setHoveredMeasurementHandle, draggingMeasurementHandle, setDraggingMeasurementHandle,
		nervePoints, setNervePoints, selectedNerveNodeIdx, setSelectedNerveNodeIdx,
		showDentalArch, archCurve, setArchCurve, panoramicData, crossSections,
		activeCrossSection, activeCrossSectionIdx, setActiveCrossSectionIdx, currentImplantSpec,
		implantEntryXOffsetMm, setImplantEntryXOffsetMm, implantEntryDepthMm, setImplantEntryDepthMm,
		implantAngulationDeg, setImplantAngulationDeg, hoveredImplantPart, setHoveredImplantPart,
		dragImplantPart, setDragImplantPart, crossSectionDragStart, setCrossSectionDragStart,
		handleToggleMaximize, panoCanvasRef: panoBaseCanvasRef, crossSectionCanvasRef: crossSectionBaseCanvasRef,
		axialCanvasRef: axialBaseCanvasRef, coronalCanvasRef: coronalBaseCanvasRef, sagittalCanvasRef: sagittalBaseCanvasRef,
	});

	// Slice renderer hook
	useCbctSliceRenderer({
		isOpen, volume, crosshairMm, obliqueAngles, windowWidth, windowLevel, invertColors, slabMode, slabThicknessMm,
		transforms, maximizedViewport, viewLayout, layoutBurstCount: 0, activeTool, studioMode,
		rulers, activeRuler, angles, activeAngle, probeMarkers, activeProbe,
		selectedMeasurement, hoveredMeasurementHandle, draggingMeasurementHandle,
		implant3DWorld, currentImplantPose, nerveAuditResult, interpolatedNerve3D,
		nervePoints, nerveTotalLengthMm, selectedNerveNodeIdx,
		activeRotationHandle: interactions.activeRotationHandle, hoveredHandle: interactions.hoveredHandle,
		showDentalArch, showEdgeRulers, hoveredViewport, archCurve, activeCrossSection, currentImplantSpec,
		selectedArchAnchorIdx: null, hoveredArchAnchorIdx: interactions.hoveredArchAnchorIdx,
		isDraggingArchAnchor: interactions.isDraggingArchAnchor, panoramicData, crossSections,
		activeCrossSectionIdx, currentCanal, hoveredImplantPart, dragImplantPart,
		axialBaseCanvasRef, axialOverlayCanvasRef, coronalBaseCanvasRef, coronalOverlayCanvasRef,
		sagittalBaseCanvasRef, sagittalOverlayCanvasRef, panoBaseCanvasRef, panoOverlayCanvasRef,
		crossSectionBaseCanvasRef, crossSectionOverlayCanvasRef,
	});

	const handleSelectPreset = useCallback((p: string) => {
		setActivePreset(p);
		const clinical = CLINICAL_RADIOLOGY_PRESETS.find((pr) => pr.id === p);
		if (clinical) {
			setWindowWidth(clinical.windowWidth);
			setWindowLevel(clinical.windowLevel);
			setSlabThicknessMm(clinical.slabThicknessMm);
			setSlabMode(clinical.slabMode);
			setPanoThicknessMm(clinical.panoThicknessMm);
			setPanoProjectionMode(clinical.panoProjectionMode);
			showToast(`Пресет: ${clinical.label}`, "info");
			return;
		}
		const preset = CBCT_HOUNSFIELD_PRESETS.find((pr) => pr.id === p);
		if (preset) {
			setWindowWidth(preset.windowWidth);
			setWindowLevel(preset.windowLevel);
		}
	}, []);

	const handleSelectClinicalPreset = useCallback((presetId: string) => {
		handleSelectPreset(presetId);
	}, [handleSelectPreset]);

	const {
		handleExportToPlan, handleExportToSchedule, handleExportToEmr,
		handleExportCbctToFinance, handleExportPdfReport,
	} = useCbctStudioExports({
		patientId, patientDisplayName, study, activeCrossSection, activeCaliper,
		currentImplantSpec, currentImplantPose, currentCanal, implantAngulationDeg,
		displayBoneClass, displayMeanHU, displayNerveClearanceMm, displayTorque,
		displayDrillingProtocol, nerveAuditResult, huSamplingResult, mischClassification,
		onApplyToPlan, onApplyToDiary043,
	});

	const modalContainerRef = useRef<HTMLDivElement | null>(null);

	const isExternalVolume = useCallback((vol: CbctVoxelVolume | null): boolean => {
		if (!vol) return false;
		if (initialVolume && vol === initialVolume) return true;
		if (typeof window !== "undefined") {
			const win = window as unknown as { __cbctDemoVolume?: CbctVoxelVolume };
			if (win.__cbctDemoVolume && vol === win.__cbctDemoVolume) return true;
		}
		return false;
	}, [initialVolume]);

	const handleCloseStudio = useCallback(() => {
		if (modalContainerRef.current) {
			teardownViewportCanvases(modalContainerRef.current);
		}
		if (volume) {
			if (!isExternalVolume(volume)) {
				disposeCbctVolume(volume);
			}
			setVolume(null);
		}
		onClose();
	}, [volume, onClose, isExternalVolume]);

	// Deterministic teardown of WebGL & 2D canvas backing stores and volume memory (Mandate 8c & Frontend Rules)
	useEffect(() => {
		if (!isOpen) {
			if (modalContainerRef.current) teardownViewportCanvases(modalContainerRef.current);
			if (volume) {
				if (!isExternalVolume(volume)) disposeCbctVolume(volume);
				setVolume(null);
			}
		}
		return () => {
			if (modalContainerRef.current) teardownViewportCanvases(modalContainerRef.current);
			if (volume && !isExternalVolume(volume)) disposeCbctVolume(volume);
		};
	}, [isOpen, volume, isExternalVolume]);

	// Hotkeys hook
	useCbctKeyboardShortcuts({
		enabled: isOpen,
		activeViewport,
		setActiveViewport,
		onToggleMaximize: () => handleToggleMaximize(activeViewport),
		onScrollSlice: (direction, step) => {
			if (!volume) return;
			const delta = (direction === "next" ? 1 : -1) * step;
			setCrosshairMm((prev) => ({ ...prev, z: prev.z + delta * volume.spacingMm.z }));
		},
		onZoom: (direction) => {
			setTransforms((prev) => ({
				...prev,
				[activeViewport]: applyStepZoom(prev[activeViewport] ?? DEFAULT_VIEWPORT_TRANSFORM, direction),
			}));
		},
		onResetTransform: () => handleFullResetViewport(activeViewport),
		onSelectPreset: (preset) => {
			const id = preset === "bone" ? "bone_dense" : preset === "endo" ? "enamel_dentin" : "soft_tissue";
			setActivePreset(id);
			const p = CBCT_HOUNSFIELD_PRESETS.find((pr) => pr.id === id);
			if (p) {
				setWindowWidth(p.windowWidth);
				setWindowLevel(p.windowLevel);
			}
		},
		onToggleMode: () => setActiveTool((prev) => (prev === "ruler" ? "crosshair" : "ruler")),
		onTogglePanel: () => setIsSidebarOpen((prev) => !prev),
		onClose: handleCloseStudio,
	});

	// 1-Click Keyboard Shortcuts ('M' for Ruler, 'U' for Unsharp Masking)
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.target && (e.target as HTMLElement).tagName && ["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) return;
			if ((e.target as HTMLElement)?.isContentEditable) return;
			if (e.ctrlKey || e.metaKey || e.altKey) return;
			if (e.key === "m" || e.key === "M" || e.key === "ь" || e.key === "Ь") {
				e.preventDefault();
				setActiveTool((prev) => (prev === "ruler" ? "crosshair" : "ruler"));
			} else if (e.key === "a" || e.key === "A" || e.key === "ф" || e.key === "Ф") {
				e.preventDefault();
				setActiveTool((prev) => (prev === "angle" ? "crosshair" : "angle"));
			} else if (e.key === "u" || e.key === "U" || e.key === "г" || e.key === "Г") {
				e.preventDefault();
				handleToggleUnsharp();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, handleToggleUnsharp]);

	if (!isOpen) return null;

	const modalContent = (
		<div
			id={`cbct-modal-${modalId}`}
			data-testid="cbct-studio-modal"
			data-cbct-cockpit="true"
			data-theme="dark"
			style={{ colorScheme: "dark" }}
			className={`fixed inset-0 z-50 flex flex-col bg-zinc-950 text-zinc-300 font-sans select-none overflow-hidden cbct-dark-cockpit ${
				isFullscreen ? "p-0" : "p-1 sm:p-2 bg-black/80 backdrop-blur-sm"
			}`}
		>
			<div
				ref={modalContainerRef}
				className="flex-1 flex flex-col w-full h-full min-h-0 bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden shadow-2xl relative"
				onDragOver={(e) => {
					e.preventDefault();
					dicomLoader.setIsDragOverWindow(true);
				}}
				onDragLeave={() => dicomLoader.setIsDragOverWindow(false)}
				onDrop={dicomLoader.handleDropFiles}
			>
				<CbctHeaderBar
					modalId={modalId} patientDisplayName={patientDisplayName} resolvedPatientName={patientDisplayName}
					loadedSliceCount={loadedSliceCount} volume={volume} studioMode={studioMode} handleSelectStudioMode={handleSelectStudioMode}
					handleExportToEmr={handleExportToEmr} handleExportCbctToFinance={handleExportCbctToFinance}
					isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
					isStudioMenuOpen={isStudioMenuOpen} setIsStudioMenuOpen={setIsStudioMenuOpen} studioMenuRef={studioMenuRef}
					handleResetAll={handleResetAll} handleAutoDetectArch={handleAutoDetectArch}
					showDentalArch={showDentalArch} setShowDentalArch={setShowDentalArch}
					showEdgeRulers={showEdgeRulers} setShowEdgeRulers={setShowEdgeRulers}
					handleExportPdfReport={handleExportPdfReport} maximizedViewport={maximizedViewport} setMaximizedViewport={setMaximizedViewport}
					viewLayout={viewLayout} setViewLayout={setViewLayout} isFullscreen={isFullscreen}
					handleToggleFullscreenModal={() => setIsFullscreen((prev) => !prev)} onClose={handleCloseStudio}
					activePresetId={activePreset} onSelectPreset={handleSelectPreset}
					crossSectionStepMm={crossSectionStepMm} onChangeCrossSectionStepMm={setCrossSectionStepMm}
					isUnsharpActive={isUnsharpActive} onToggleUnsharp={handleToggleUnsharp} sharpenAmount={isUnsharpActive ? 0.18 : 0.0}
					windowWidth={windowWidth} onChangeWindowWidth={setWindowWidth} windowLevel={windowLevel} onChangeWindowLevel={setWindowLevel}
					slabThicknessMm={slabThicknessMm} onChangeSlabThicknessMm={setSlabThicknessMm} slabMode={slabMode} onChangeSlabMode={setSlabMode}
					panoThicknessMm={panoThicknessMm} onChangePanoThicknessMm={setPanoThicknessMm}
					onSelectClinicalPreset={handleSelectClinicalPreset}
					onCopySnapshotToClipboard={clipboardSnapshot.copySnapshotToClipboard}
				/>

				<main className="flex-1 flex min-h-0 w-full overflow-hidden relative">
					<CbctLeftToolDock
						activeTool={activeTool} onSelectTool={setActiveTool} activePresetId={activePreset} onSelectPreset={handleSelectPreset}
						slabMode={slabMode} onSelectSlabMode={setSlabMode} slabThicknessMm={slabThicknessMm} onChangeSlabThicknessMm={setSlabThicknessMm}
						invertColors={invertColors} onToggleInvertColors={() => setInvertColors((prev) => !prev)}
						onResetAll={handleResetAll} showDentalArch={showDentalArch} onToggleDentalArch={() => {
							setShowDentalArch((prev) => {
								const next = !prev;
								if (next && studioMode !== "panoramic") handleSelectStudioMode("panoramic");
								return next;
							});
						}}
						onAutoDetectArch={handleAutoDetectArch}
					/>

					<CbctMprViewportsGrid
						isSidebarOpen={isSidebarOpen} mobileActiveTab={mobileActiveTab} patientDisplayName={patientDisplayName} onSelectMobileTab={setMobileActiveTab}
						volume={volume} dicomLoadingStatus={dicomLoader.dicomLoadingStatus} dicomProgress={dicomLoader.dicomProgress}
						maximizedViewport={maximizedViewport} viewLayout={viewLayout} studioMode={studioMode} onSelectStudioMode={handleSelectStudioMode}
						folderInputRef={dicomLoader.folderInputRef} zipInputRef={dicomLoader.zipInputRef} handleDicomFilesChange={dicomLoader.handleDicomFilesChange}
						activeViewport={activeViewport} setActiveViewport={setActiveViewport} hoveredViewport={hoveredViewport} onHoverViewport={setHoveredViewport}
						showEdgeRulers={showEdgeRulers} handleToggleMaximize={handleToggleMaximize}
						axialBaseCanvasRef={axialBaseCanvasRef} axialOverlayCanvasRef={axialOverlayCanvasRef}
						coronalBaseCanvasRef={coronalBaseCanvasRef} coronalOverlayCanvasRef={coronalOverlayCanvasRef}
						sagittalBaseCanvasRef={sagittalBaseCanvasRef} sagittalOverlayCanvasRef={sagittalOverlayCanvasRef}
						panoBaseCanvasRef={panoBaseCanvasRef} panoOverlayCanvasRef={panoOverlayCanvasRef}
						crossSectionBaseCanvasRef={crossSectionBaseCanvasRef} crossSectionOverlayCanvasRef={crossSectionOverlayCanvasRef}
						handleCanvasDoubleClick={interactions.handleCanvasDoubleClick} handleCanvasMouseDown={interactions.handleCanvasMouseDown}
						handleCanvasMouseMove={interactions.handleCanvasMouseMove} handleCanvasMouseUp={interactions.handleCanvasMouseUp}
						handleCanvasWheel={interactions.handleCanvasWheel} getCanvasCursor={interactions.getCanvasCursor}
						crosshairMm={crosshairMm} currentVoxel={currentVoxel} slabMode={slabMode} slabThicknessMm={slabThicknessMm}
						obliqueAngles={obliqueAngles} setObliqueAngles={setObliqueAngles} handleFullResetViewport={handleFullResetViewport}
						activeRotationHandle={interactions.activeRotationHandle} isShiftRotating={interactions.isShiftRotating} hoveredHandle={interactions.hoveredHandle}
						transforms={transforms} windowWidth={windowWidth} windowLevel={windowLevel} renderViewportOverlays={() => null}
						handlePanoMouseDown={interactions.handlePanoMouseDown} handlePanoMouseMove={interactions.handlePanoMouseMove} handlePanoMouseUp={interactions.handlePanoMouseUp}
						handleCrossSectionMouseDown={interactions.handleCrossSectionMouseDown} handleCrossSectionMouseMove={interactions.handleCrossSectionMouseMove} handleCrossSectionMouseUp={interactions.handleCrossSectionMouseUp}
						dragImplantPart={dragImplantPart} hoveredImplantPart={hoveredImplantPart} activeCrossSection={activeCrossSection} activeCrossSectionIdx={activeCrossSectionIdx}
						crossSections={crossSections} onLoadDemoVolume={dicomLoader.handleLoadDemoVolume} activeTool={activeTool} onSelectTool={setActiveTool}
						rulers={rulers} onClearRulers={handleClearRulers} angles={angles} onClearAngles={handleClearAngles} onSelectQuickWlPreset={handleSelectQuickWlPreset} handleSelectTooth={interactions.handleSelectTooth}
						archCurve={archCurve} jawType={jawType} onSwitchJaw={handleSwitchJaw} activeToothFdi={activeCrossSection?.nearestToothFdi}
						isUnsharpActive={isUnsharpActive} onToggleUnsharp={handleToggleUnsharp} onChangeCrossSectionIdx={setActiveCrossSectionIdx}
						selectedBrand={selectedBrand} onSelectBrand={setSelectedBrand} selectedDiameterMm={selectedDiameterMm} onSelectDiameterMm={setSelectedDiameterMm}
						selectedLengthMm={selectedLengthMm} onSelectLengthMm={setSelectedLengthMm} displayBoneClass={displayBoneClass} displayMeanHU={displayMeanHU} displayTorque={displayTorque}
						displayNerveClearanceMm={displayNerveClearanceMm} displayDrillingProtocol={displayDrillingProtocol}
						nerveSafetyStatus={nerveAuditResult.safetyStatus === "danger" ? "danger" : nerveAuditResult.safetyStatus === "warning" ? "warning" : "safe"}
						nervePoints={nervePoints} interpolatedNerve3D={interpolatedNerve3D} implant3DWorld={implant3DWorld} nerveAuditResult={nerveAuditResult}
						handleExportToEmr={handleExportToEmr} handleExportToPlan={handleExportToPlan}
						onChangeWindowWidth={setWindowWidth} onChangeWindowLevel={setWindowLevel} onChangeSlabThicknessMm={setSlabThicknessMm} onChangeSlabMode={setSlabMode}
						onSelectClinicalPreset={handleSelectClinicalPreset} activePresetId={activePreset} panoThicknessMm={panoThicknessMm} onChangePanoThicknessMm={setPanoThicknessMm}
						panoProjectionMode={panoProjectionMode} onChangePanoProjectionMode={setPanoProjectionMode} crossSectionStepMm={crossSectionStepMm} onChangeCrossSectionStepMm={setCrossSectionStepMm}
						implantEntryXOffsetMm={implantEntryXOffsetMm} onChangeImplantEntryXOffsetMm={setImplantEntryXOffsetMm} implantEntryDepthMm={implantEntryDepthMm} onChangeImplantEntryDepthMm={setImplantEntryDepthMm}
						implantAngulationDeg={implantAngulationDeg} onChangeImplantAngulationDeg={setImplantAngulationDeg}
					/>

					<CbctRightSidebar
						isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} mobileActiveTab={mobileActiveTab}
						activeCrossSection={activeCrossSection} activeCrossSectionIdx={activeCrossSectionIdx}
						setActiveCrossSectionIdx={setActiveCrossSectionIdx} crossSections={crossSections}
						studioMode={studioMode} setStudioMode={setStudioMode} implantAngulationDeg={implantAngulationDeg}
						setImplantAngulationDeg={setImplantAngulationDeg} volume={volume} handleToggleMaximize={handleToggleMaximize}
						crossSectionBaseCanvasRef={crossSectionBaseCanvasRef} crossSectionOverlayCanvasRef={crossSectionOverlayCanvasRef}
						handleCrossSectionMouseDown={interactions.handleCrossSectionMouseDown} handleCrossSectionMouseMove={interactions.handleCrossSectionMouseMove} handleCrossSectionMouseUp={interactions.handleCrossSectionMouseUp}
						dragImplantPart={dragImplantPart} hoveredImplantPart={hoveredImplantPart} handleFullResetViewport={handleFullResetViewport} maximizedViewport={maximizedViewport}
						windowWidth={windowWidth} windowLevel={windowLevel} renderViewportOverlays={() => null} sampledVoxelHU={sampledVoxelHU}
						handleSelectTooth={interactions.handleSelectTooth} implant3DWorld={implant3DWorld} nerveAuditResult={nerveAuditResult} huSamplingResult={huSamplingResult}
						currentImplantSpec={currentImplantSpec} nervePoints={nervePoints} setNervePoints={setNervePoints} nerveTotalLengthMm={nerveTotalLengthMm}
						selectedNerveNodeIdx={selectedNerveNodeIdx} setSelectedNerveNodeIdx={setSelectedNerveNodeIdx} displayBoneClass={displayBoneClass}
						displayMeanHU={displayMeanHU} displayTorque={displayTorque} displayNerveClearanceMm={displayNerveClearanceMm} displayDrillingProtocol={displayDrillingProtocol}
						selectedBrand={selectedBrand} setSelectedBrand={setSelectedBrand} selectedDiameterMm={selectedDiameterMm} setSelectedDiameterMm={setSelectedDiameterMm}
						selectedLengthMm={selectedLengthMm} setSelectedLengthMm={setSelectedLengthMm} implantEntryXOffsetMm={implantEntryXOffsetMm} setImplantEntryXOffsetMm={setImplantEntryXOffsetMm}
						setImplantEntryDepthMm={setImplantEntryDepthMm} activeCaliper={activeCaliper} handleExportToEmr={handleExportToEmr}
						handleExportPdfReport={() => { void handleExportPdfReport(); }} handleExportToPlan={handleExportToPlan} handleExportToSchedule={handleExportToSchedule} handleExportToFinance={handleExportCbctToFinance}
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
			</div>
		</div>
	);

	return typeof document !== "undefined" && document.body ? createPortal(modalContent, document.body) : modalContent;
};
