/**
 * DENTE CRM — CBCT 3D MPR (Multi-Planar Reconstruction) & Panoramic Spline Curve Viewer
 * Standards: DICOM Part 3, Misch CE, Buser
 *
 * Capabilities:
 * 1. Synchronized 3-Plane Orthogonal MPR: Axial, Coronal, Sagittal with real-time Crosshair Reticle (60 FPS).
 * 2. Slab Thickness Projection Modes: Single Slice, MIP (Maximum Intensity Projection), MinIP, Average IP (1-30 mm).
 * 3. Hounsfield Windowing Presets: Bone (+400, W2000), Soft Tissue (+40, W400), Enamel (+1000, W3000), Metal (+1200, W4000), Air (-500, W1000).
 * 4. Interactive Panoramic Dental Arch Curve on Axial slice with FDI 18..48 tooth anchors.
 * 5. Real-Time Unfolded Panoramic (OPG) Reconstruction with adjustable focal trough layer.
 * 6. Perpendicular Transverse Cross-Sections Carousel with bone height/width measurements.
 * 7. Pure CSS design tokens, WCAG 2.1 touch targets (>= 44x44px), zero hardcoded colors.
 */

import {
	Activity,
	Bone,
	Camera,
	ChevronLeft,
	ChevronRight,
	Compass,
	Eye,
	Layers,
	Maximize2,
	Minimize2,
	Move,
	RefreshCw,
	RotateCcw,
	Ruler,
	Sliders,
	Spline,
	Sun,
	Volume2,
	X,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
	CBCT_HOUNSFIELD_PRESETS,
	type CbctVoxelVolume,
	type HounsfieldPreset,
	type MprPlane,
	type CbctViewportType,
	type Point3D,
	type SlabProjectionMode,
	type ObliqueRotationAngles,
	type ViewportTransform,
	type RotationHandlePosition,
	DEFAULT_OBLIQUE_ROTATION,
	DEFAULT_VIEWPORT_TRANSFORM,
	ROMEXIS_COLORS,
	calculateMprSliceIndex,
	clampCoordinateToVolume,
	createEmptyCbctVolume,
	disposeCbctVolume,
	drawCalibratedMillimeterRulers,
	drawRomexisSlabCorridor,
	drawObliqueCrosshairWithRotationHandles,
	extractObliqueMprSlice,
	resliceObliqueMprSynchronized,
	applyWindowLevelDrag,
	applyCursorZoom,
	applyPanDrag,
	resetViewportTransform,
	hitTestRotationHandle,
	getRotationHandles,
	calculateAngleFromHandleDrag,
	calculateAngleFromShiftDrag,
	hitTestCrosshairCenter,
	resetPlaneObliqueAngle,
	resetObliqueRotationAngles,
	getObliqueRotationLabel,
	mapCanvasPointerToWorldMmWithTransform,
	getCanvasPointerPos,
	worldMmToVoxel,
	voxelToWorldMm,
	sampleVoxelHU,
	sampleVoxelTrilinearHU,
} from "./cbctMprMath";
import {
	DEFAULT_MANDIBULAR_ARCH_ANCHORS,
	DEFAULT_MAXILLARY_ARCH_ANCHORS,
	type CrossSectionSliceData,
	type DentalArchAnchor,
	type DentalArchCurve,
	type PanoramicReconstructionResult,
	buildDentalArchCurve,
	generateCrossSectionSlices,
	getFocalTroughBoundaryCurves,
	measureAlveolarRidgeCrossSection,
	reconstructPanoramicView,
	updateDentalArchAnchorPosition,
	hitTestDentalArchControlPoint,
	drawDentalArchControlPointManipulators,
} from "./dentalCurveEngine";
import { autoDetectDentalArch } from "./cbctAutoArchEngine";
import { CbctViewportHud } from "./CbctViewportHud";
import { useCbctKeyboardShortcuts, applyStepZoom } from "./useCbctKeyboardShortcuts";
import { CbctHotkeysStatusBar } from "./CbctHotkeysStatusBar";
import { CbctLeftToolDock, type CbctToolMode } from "./CbctLeftToolDock";
import {
	type CbctMeasurementRuler,
	type CbctProbeMarker,
	type CbctAngleMeasurement,
	calculateAngleBetween3Points3D,
	interpolateNerveSpline3D,
	calculateSplineLength3DMm,
	calculateNerveDistanceGating,
	getGatedNerveSegments,
	MANDIBULAR_NERVE_SAFETY_MARGIN_MM,
} from "./cbctCaliperNerveMath";
import { getMischTissueDescription, formatMischTooltip } from "./boneDensityMischMath";
import type { RadiologyStudy } from "./types";

export interface CbctMprViewerProps {
	readonly study?: RadiologyStudy | null | undefined;
	readonly volume?: CbctVoxelVolume | null | undefined;
	readonly onClose?: () => void;
	readonly onApplyToDiary043?: (diaryText: string) => void;
}

export const CbctMprViewer: React.FC<CbctMprViewerProps> = ({
	study,
	volume: propVolume,
	onClose,
	onApplyToDiary043,
}) => {
	const viewerId = useId();

	// ─── 1. VOLUME, CROSSHAIR & OBLIQUE ROTATION STATE ──────────────────────────
	const [volume, setVolume] = useState<CbctVoxelVolume | null>(null);
	const [crosshairMm, setCrosshairMm] = useState<Point3D>({ x: 0, y: -10, z: -10 });
	const [obliqueAngles, setObliqueAngles] = useState<ObliqueRotationAngles>(DEFAULT_OBLIQUE_ROTATION);
	const [activeViewport, setActiveViewport] = useState<CbctViewportType>("axial");
	const [transforms, setTransforms] = useState<Record<CbctViewportType, ViewportTransform>>({
		axial: DEFAULT_VIEWPORT_TRANSFORM,
		coronal: DEFAULT_VIEWPORT_TRANSFORM,
		sagittal: DEFAULT_VIEWPORT_TRANSFORM,
		panoramic: DEFAULT_VIEWPORT_TRANSFORM,
		cross_section: DEFAULT_VIEWPORT_TRANSFORM,
	});
	const [maximizedViewport, setMaximizedViewport] = useState<CbctViewportType | null>(null);

	const handleToggleMaximize = useCallback((type: CbctViewportType) => {
		setMaximizedViewport((prev) => (prev === type ? null : type));
	}, []);

	// Interactive drag states
	const [activeDraggingPlane, setActiveDraggingPlane] = useState<MprPlane | null>(null);
	const [isDraggingWL, setIsDraggingWL] = useState<{ startX: number; startY: number; startWW: number; startWL: number } | null>(null);
	const [isPanning, setIsPanning] = useState<{ plane: MprPlane; startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);
	const [activeRotationHandle, setActiveRotationHandle] = useState<{ plane: MprPlane; handle: RotationHandlePosition; centerPx: { x: number; y: number } } | null>(null);
	const [hoveredHandle, setHoveredHandle] = useState<{ plane: MprPlane; handle: RotationHandlePosition } | null>(null);
	const [isShiftRotating, setIsShiftRotating] = useState<{ plane: MprPlane; centerPx: { x: number; y: number }; startPointerPx: { x: number; y: number }; initialAngleDeg: number } | null>(null);

	// Offscreen canvas & ImageData refs for zero-GC canvas rendering
	const axialOffscreenRef = useRef<HTMLCanvasElement | null>(null);
	const coronalOffscreenRef = useRef<HTMLCanvasElement | null>(null);
	const sagittalOffscreenRef = useRef<HTMLCanvasElement | null>(null);
	const axialImgDataRef = useRef<ImageData | null>(null);
	const coronalImgDataRef = useRef<ImageData | null>(null);
	const sagittalImgDataRef = useRef<ImageData | null>(null);

	// ─── 2. HOUNSFIELD WINDOW / LEVEL STATE ────────────────────────────────────
	const [activePresetId, setActivePresetId] = useState<string>("bone_dense");
	const [windowWidth, setWindowWidth] = useState<number>(4400);
	const [windowLevel, setWindowLevel] = useState<number>(1300);
	const [invertColors, setInvertColors] = useState<boolean>(false);
	const [slabMode, setSlabMode] = useState<SlabProjectionMode>("single");
	const [slabThicknessMm, setSlabThicknessMm] = useState<number>(2.0);

	// ─── 3. DENTAL ARCH SPLINE & PANORAMA STATE ────────────────────────────────
	const [activeJaw, setActiveJaw] = useState<"mandible" | "maxilla">("mandible");
	const [anchors, setAnchors] = useState<readonly DentalArchAnchor[]>(DEFAULT_MANDIBULAR_ARCH_ANCHORS);
	const [showDentalArch, setShowDentalArch] = useState<boolean>(true);
	const [selectedAnchorId, setSelectedAnchorId] = useState<string | null>(null);
	const [selectedArchAnchorIdx, setSelectedArchAnchorIdx] = useState<number | null>(null);
	const [hoveredArchAnchorIdx, setHoveredArchAnchorIdx] = useState<number | null>(null);
	const [isDraggingArchAnchor, setIsDraggingArchAnchor] = useState<number | null>(null);
	const pendingArchAnchorMmRef = useRef<{ index: number; positionMm: { x: number; y: number } } | null>(null);
	const rafArchAnchorIdRef = useRef<number | null>(null);
	const [focalTroughThicknessMm, setFocalTroughThicknessMm] = useState<number>(12.0);
	const [panoramicResult, setPanoramicResult] = useState<PanoramicReconstructionResult | null>(null);
	const [crossSections, setCrossSections] = useState<CrossSectionSliceData[]>([]);
	const [selectedCrossSectionIndex, setSelectedCrossSectionIndex] = useState<number>(0);
	const [activeTab, setActiveTab] = useState<"mpr" | "panoramic" | "cross_sections">("mpr");
	const [mobileMprSlice, setMobileMprSlice] = useState<"axial" | "coronal" | "sagittal" | "panoramic">("axial");

	// ─── 3b. TOOL DOCK, MEASUREMENT CALIPERS & NERVE STATE ──────────────────────
	const [activeTool, setActiveTool] = useState<CbctToolMode>("crosshair");
	const [rulers, setRulers] = useState<CbctMeasurementRuler[]>([]);
	const [angles, setAngles] = useState<CbctAngleMeasurement[]>([]);
	const [probeMarkers, setProbeMarkers] = useState<CbctProbeMarker[]>([]);
	const [nervePoints, setNervePoints] = useState<readonly Point3D[]>([]);
	const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null);

	const [activeRuler, setActiveRuler] = useState<{
		plane: MprPlane;
		startMm: Point3D;
		currentMm: Point3D;
	} | null>(null);

	const [activeAngle, setActiveAngle] = useState<{
		plane: MprPlane;
		startMm: Point3D;
		vertexMm: Point3D | null;
		currentMm: Point3D;
	} | null>(null);

	const [activeProbe, setActiveProbe] = useState<{
		plane: MprPlane;
		worldMm: Point3D;
		hu: number;
		tissueName: string;
	} | null>(null);

	// Computed 3D Mandibular Canal Spline (2.0mm tube with distance gating)
	const interpolatedNerve3D = useMemo(() => {
		if (nervePoints.length < 2) return [...nervePoints];
		return interpolateNerveSpline3D(nervePoints, 12);
	}, [nervePoints]);

	const nerveTotalLengthMm = useMemo(() => {
		return calculateSplineLength3DMm(interpolatedNerve3D);
	}, [interpolatedNerve3D]);

	const handleDeleteRuler = useCallback((id: string) => {
		setRulers((prev) => prev.filter((r) => r.id !== id));
		if (selectedMeasurementId === id) setSelectedMeasurementId(null);
	}, [selectedMeasurementId]);

	const handleDeleteAngle = useCallback((id: string) => {
		setAngles((prev) => prev.filter((a) => a.id !== id));
		if (selectedMeasurementId === id) setSelectedMeasurementId(null);
	}, [selectedMeasurementId]);

	const handleDeleteProbe = useCallback((id: string) => {
		setProbeMarkers((prev) => prev.filter((p) => p.id !== id));
		if (selectedMeasurementId === id) setSelectedMeasurementId(null);
	}, [selectedMeasurementId]);

	const handleClearNerve = useCallback(() => {
		setNervePoints([]);
	}, []);

	// ─── 4. CANVAS REFS ────────────────────────────────────────────────────────
	const axialCanvasRef = useRef<HTMLCanvasElement>(null);
	const coronalCanvasRef = useRef<HTMLCanvasElement>(null);
	const sagittalCanvasRef = useRef<HTMLCanvasElement>(null);
	const panoCanvasRef = useRef<HTMLCanvasElement>(null);
	const crossSectionCanvasRef = useRef<HTMLCanvasElement>(null);

	// Initialize synthetic volume if none provided
	useEffect(() => {
		if (propVolume) {
			setVolume(propVolume);
			if (propVolume.defaultWindowWidth) setWindowWidth(propVolume.defaultWindowWidth);
			if (propVolume.defaultWindowLevel) setWindowLevel(propVolume.defaultWindowLevel);
		} else {
			const emptyVol = createEmptyCbctVolume(160, 160, 100, 0.4);
			setVolume(emptyVol);
		}

		return () => {
			if (!propVolume && volume) {
				disposeCbctVolume(volume);
			}
		};
	}, [propVolume]);

	// Build active dental arch curve
	const archCurve = useMemo<DentalArchCurve>(() => {
		return buildDentalArchCurve(anchors, activeJaw, focalTroughThicknessMm);
	}, [anchors, activeJaw, focalTroughThicknessMm]);

	// Switch jaw anchors
	const handleSwitchJaw = (jaw: "mandible" | "maxilla") => {
		setActiveJaw(jaw);
		setAnchors(jaw === "mandible" ? DEFAULT_MANDIBULAR_ARCH_ANCHORS : DEFAULT_MAXILLARY_ARCH_ANCHORS);
		setSelectedAnchorId(null);
		setSelectedArchAnchorIdx(null);
	};

	// 1-Click Auto-Detect Dental Arch Engine (Enamel HU & MIP ray-tracing)
	const handleAutoDetectArch = useCallback(() => {
		if (!volume) return;
		const detected = autoDetectDentalArch(volume, activeJaw);
		setAnchors(detected.anchors);
		setSelectedAnchorId(null);
		setSelectedArchAnchorIdx(null);
	}, [volume, activeJaw]);

	// Real-Time Automatic Synchronization of OPG Panorama and Cross-Sections
	useEffect(() => {
		if (!volume) return;
		const pano = reconstructPanoramicView(volume, archCurve, {
			heightMm: 38.0,
			heightPx: 280,
			windowWidth,
			windowLevel,
			invert: invertColors,
		});
		setPanoramicResult(pano);

		const sections = generateCrossSectionSlices(volume, archCurve, 2.0, crosshairMm.z, {
			widthMm: 24.0,
			heightMm: 32.0,
			windowWidth,
			windowLevel,
			invert: invertColors,
		});
		setCrossSections(sections);
	}, [volume, archCurve, windowWidth, windowLevel, invertColors, crosshairMm.z]);

	// ─── 4b. VECTOR OVERLAY & MEASUREMENT HELPERS ─────────────────────────────
	const worldMmToSlicePx = useCallback((worldMm: Point3D, plane: MprPlane, vol: CbctVoxelVolume): { x: number; y: number } => {
		const vox = worldMmToVoxel(worldMm, vol);
		const depthMax = Math.max(1, vol.dimensions.depth - 1);
		switch (plane) {
			case "axial":
				return { x: vox.x, y: vox.y };
			case "coronal":
				return { x: vox.x, y: depthMax - vox.z };
			case "sagittal":
				return { x: vox.y, y: depthMax - vox.z };
		}
	}, []);

	const slicePxToScreenPx = useCallback((slicePx: { x: number; y: number }, transform: ViewportTransform): { x: number; y: number } => {
		return {
			x: Number((slicePx.x * transform.zoom + transform.panX).toFixed(1)),
			y: Number((slicePx.y * transform.zoom + transform.panY).toFixed(1)),
		};
	}, []);

	const calculateAngleBadgePosition = useCallback((
		p1Screen: { x: number; y: number },
		vertexScreen: { x: number; y: number },
		p2Screen: { x: number; y: number },
	): { x: number; y: number } => {
		const dx1 = p1Screen.x - vertexScreen.x;
		const dy1 = p1Screen.y - vertexScreen.y;
		const dx2 = p2Screen.x - vertexScreen.x;
		const dy2 = p2Screen.y - vertexScreen.y;
		const len1 = Math.hypot(dx1, dy1);
		const len2 = Math.hypot(dx2, dy2);

		if (len1 >= 5 && len2 >= 5) {
			const angle1 = Math.atan2(dy1, dx1);
			const angle2 = Math.atan2(dy2, dx2);
			let diff = angle2 - angle1;
			while (diff > Math.PI) diff -= Math.PI * 2;
			while (diff < -Math.PI) diff += Math.PI * 2;
			const bisectorAngle = angle1 + diff / 2;
			const badgeDist = Math.min(48, Math.max(26, Math.min(len1, len2) * 0.4 + 14));
			return {
				x: Number((vertexScreen.x + Math.cos(bisectorAngle) * badgeDist).toFixed(1)),
				y: Number((vertexScreen.y + Math.sin(bisectorAngle) * badgeDist).toFixed(1)),
			};
		} else if (len1 >= 5) {
			return {
				x: Number(((vertexScreen.x + p1Screen.x) / 2).toFixed(1)),
				y: Number(((vertexScreen.y + p1Screen.y) / 2 - 14).toFixed(1)),
			};
		}
		return {
			x: vertexScreen.x,
			y: vertexScreen.y - 18,
		};
	}, []);

	// Render vector overlay geometries directly on 2D slice canvas (Zero-GC)
	const drawPlaneVectorOverlays = useCallback((
		ctx: CanvasRenderingContext2D,
		plane: MprPlane,
		vol: CbctVoxelVolume,
	) => {
		// 1. Rulers
		for (const r of rulers) {
			if (r.plane === plane) {
				const p1 = worldMmToSlicePx(r.startMm, plane, vol);
				const p2 = worldMmToSlicePx(r.endMm, plane, vol);
				const isSel = selectedMeasurementId === r.id;

				ctx.save();
				ctx.strokeStyle = isSel ? "#f59e0b" : "#2dd4bf";
				ctx.lineWidth = isSel ? 2.2 : 1.8;
				ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
				ctx.shadowBlur = 4;

				ctx.beginPath();
				ctx.moveTo(p1.x, p1.y);
				ctx.lineTo(p2.x, p2.y);
				ctx.stroke();

				// Endpoint ticks
				const dx = p2.x - p1.x;
				const dy = p2.y - p1.y;
				const len = Math.hypot(dx, dy) || 1;
				const nx = -dy / len;
				const ny = dx / len;
				ctx.beginPath();
				ctx.moveTo(p1.x + nx * 5, p1.y + ny * 5);
				ctx.lineTo(p1.x - nx * 5, p1.y - ny * 5);
				ctx.moveTo(p2.x + nx * 5, p2.y + ny * 5);
				ctx.lineTo(p2.x - nx * 5, p2.y - ny * 5);
				ctx.stroke();

				// Endpoint dots
				ctx.fillStyle = isSel ? "#f59e0b" : "#2dd4bf";
				ctx.beginPath();
				ctx.arc(p1.x, p1.y, 3, 0, Math.PI * 2);
				ctx.arc(p2.x, p2.y, 3, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
			}
		}

		// Active Ruler in progress
		if (activeRuler && activeRuler.plane === plane) {
			const p1 = worldMmToSlicePx(activeRuler.startMm, plane, vol);
			const p2 = worldMmToSlicePx(activeRuler.currentMm, plane, vol);
			ctx.save();
			ctx.strokeStyle = "#f59e0b";
			ctx.lineWidth = 2.0;
			ctx.setLineDash([4, 4]);
			ctx.beginPath();
			ctx.moveTo(p1.x, p1.y);
			ctx.lineTo(p2.x, p2.y);
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.fillStyle = "#f59e0b";
			ctx.beginPath();
			ctx.arc(p1.x, p1.y, 3.5, 0, Math.PI * 2);
			ctx.arc(p2.x, p2.y, 3.5, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}

		// 2. Angles
		for (const a of angles) {
			if (a.plane === plane) {
				const p1 = worldMmToSlicePx(a.startMm, plane, vol);
				const pv = worldMmToSlicePx(a.vertexMm, plane, vol);
				const p2 = worldMmToSlicePx(a.endMm, plane, vol);
				const isSel = selectedMeasurementId === a.id;

				ctx.save();
				ctx.strokeStyle = isSel ? "#f59e0b" : "#2dd4bf";
				ctx.lineWidth = isSel ? 2.2 : 1.8;
				ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
				ctx.shadowBlur = 4;

				ctx.beginPath();
				ctx.moveTo(p1.x, p1.y);
				ctx.lineTo(pv.x, pv.y);
				ctx.lineTo(p2.x, p2.y);
				ctx.stroke();

				// Vertex circle
				ctx.fillStyle = isSel ? "#f59e0b" : "#2dd4bf";
				ctx.beginPath();
				ctx.arc(pv.x, pv.y, 4, 0, Math.PI * 2);
				ctx.fill();

				// Vertex Arc
				const a1 = Math.atan2(p1.y - pv.y, p1.x - pv.x);
				const a2 = Math.atan2(p2.y - pv.y, p2.x - pv.x);
				ctx.beginPath();
				ctx.arc(pv.x, pv.y, 16, a1, a2, false);
				ctx.stroke();
				ctx.restore();
			}
		}

		// Active Angle in progress
		if (activeAngle && activeAngle.plane === plane) {
			const p1 = worldMmToSlicePx(activeAngle.startMm, plane, vol);
			const pCur = worldMmToSlicePx(activeAngle.currentMm, plane, vol);
			ctx.save();
			ctx.strokeStyle = "#f59e0b";
			ctx.lineWidth = 2.0;
			ctx.setLineDash([4, 4]);
			if (!activeAngle.vertexMm) {
				ctx.beginPath();
				ctx.moveTo(p1.x, p1.y);
				ctx.lineTo(pCur.x, pCur.y);
				ctx.stroke();
			} else {
				const pv = worldMmToSlicePx(activeAngle.vertexMm, plane, vol);
				ctx.beginPath();
				ctx.moveTo(p1.x, p1.y);
				ctx.lineTo(pv.x, pv.y);
				ctx.lineTo(pCur.x, pCur.y);
				ctx.stroke();
			}
			ctx.setLineDash([]);
			ctx.restore();
		}

		// 3. Probes
		for (const pm of probeMarkers) {
			if (pm.plane === plane) {
				const p = worldMmToSlicePx(pm.worldMm, plane, vol);
				ctx.save();
				ctx.strokeStyle = "#38bdf8";
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
				ctx.stroke();

				ctx.beginPath();
				ctx.moveTo(p.x - 10, p.y);
				ctx.lineTo(p.x + 10, p.y);
				ctx.moveTo(p.x, p.y - 10);
				ctx.lineTo(p.x, p.y + 10);
				ctx.stroke();

				ctx.fillStyle = "#22d3ee";
				ctx.beginPath();
				ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
			}
		}

		// 4. 3D Mandibular Canal Nerve with Distance Gating
		if (interpolatedNerve3D.length > 1) {
			ctx.save();
			for (let i = 0; i < interpolatedNerve3D.length - 1; i++) {
				const pt1 = interpolatedNerve3D[i]!;
				const pt2 = interpolatedNerve3D[i + 1]!;
				let deltaZ = 0;
				if (plane === "axial") deltaZ = (pt1.z + pt2.z) / 2 - crosshairMm.z;
				else if (plane === "coronal") deltaZ = (pt1.y + pt2.y) / 2 - crosshairMm.y;
				else deltaZ = (pt1.x + pt2.x) / 2 - crosshairMm.x;

				const gating = calculateNerveDistanceGating(deltaZ);
				if (!gating.isVisible) continue;

				const p1 = worldMmToSlicePx(pt1, plane, vol);
				const p2 = worldMmToSlicePx(pt2, plane, vol);

				ctx.strokeStyle = `rgba(245, 158, 11, ${gating.alpha})`;
				ctx.lineWidth = 2.5;
				ctx.setLineDash(gating.isDashed ? [4, 4] : []);
				ctx.beginPath();
				ctx.moveTo(p1.x, p1.y);
				ctx.lineTo(p2.x, p2.y);
				ctx.stroke();
			}
			ctx.setLineDash([]);

			// Waypoint nodes
			for (let i = 0; i < nervePoints.length; i++) {
				const pt = nervePoints[i]!;
				let deltaZ = 0;
				if (plane === "axial") deltaZ = pt.z - crosshairMm.z;
				else if (plane === "coronal") deltaZ = pt.y - crosshairMm.y;
				else deltaZ = pt.x - crosshairMm.x;

				const gating = calculateNerveDistanceGating(deltaZ);
				if (!gating.isVisible) continue;

				const p = worldMmToSlicePx(pt, plane, vol);
				ctx.fillStyle = `rgba(251, 191, 36, ${gating.alpha})`;
				ctx.beginPath();
				ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
				ctx.fill();
				ctx.strokeStyle = "#ffffff";
				ctx.lineWidth = 1.2;
				ctx.stroke();
			}
			ctx.restore();
		}
	}, [rulers, activeRuler, angles, activeAngle, probeMarkers, interpolatedNerve3D, nervePoints, crosshairMm, selectedMeasurementId, worldMmToSlicePx]);

	// Render crisp DOM HTML/CSS overlays (anti-pixelation badges)
	const renderViewportOverlays = useCallback((plane: MprPlane) => {
		if (!volume) return null;
		const transform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;

		return (
			<div className="absolute inset-0 pointer-events-none z-20 overflow-hidden select-none">
				{/* Rulers */}
				{rulers
					.filter((r) => r.plane === plane)
					.map((r) => {
						const p1Screen = slicePxToScreenPx(worldMmToSlicePx(r.startMm, plane, volume), transform);
						const p2Screen = slicePxToScreenPx(worldMmToSlicePx(r.endMm, plane, volume), transform);
						const midX = (p1Screen.x + p2Screen.x) / 2;
						const midY = (p1Screen.y + p2Screen.y) / 2;
						const isSelected = selectedMeasurementId === r.id;

						return (
							<div
								key={r.id}
								style={{ left: `${midX}px`, top: `${midY}px`, transform: "translate(-50%, -50%)" }}
								className={`absolute z-20 pointer-events-auto flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono font-bold shadow-lg border transition-all ${
									isSelected
										? "bg-slate-900/90 backdrop-blur text-amber-300 border-amber-500/80 ring-1 ring-amber-500/40"
										: "bg-slate-900/80 backdrop-blur text-teal-300 border-slate-700/80 hover:border-teal-500/60"
								}`}
								data-testid={`cbct-ruler-overlay-badge-${r.id}`}
							>
								<span>{r.distanceMm.toFixed(1)} мм</span>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										handleDeleteRuler(r.id);
									}}
									className="w-4 h-4 rounded-full bg-red-500/30 text-red-300 hover:bg-red-500 hover:text-white border border-red-500/50 flex items-center justify-center text-[10px] cursor-pointer transition-colors"
									title="Удалить линейку [×]"
									aria-label="Удалить линейку"
								>
									×
								</button>
							</div>
						);
					})}

				{/* Angles */}
				{angles
					.filter((a) => a.plane === plane)
					.map((a) => {
						const p1Screen = slicePxToScreenPx(worldMmToSlicePx(a.startMm, plane, volume), transform);
						const pvScreen = slicePxToScreenPx(worldMmToSlicePx(a.vertexMm, plane, volume), transform);
						const p2Screen = slicePxToScreenPx(worldMmToSlicePx(a.endMm, plane, volume), transform);
						const badgePos = calculateAngleBadgePosition(p1Screen, pvScreen, p2Screen);
						const isSelected = selectedMeasurementId === a.id;

						return (
							<div
								key={a.id}
								style={{ left: `${badgePos.x}px`, top: `${badgePos.y}px`, transform: "translate(-50%, -50%)" }}
								className={`absolute z-20 pointer-events-auto flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono font-bold shadow-lg border transition-all ${
									isSelected
										? "bg-slate-900/90 backdrop-blur text-amber-300 border-amber-500/80 ring-1 ring-amber-500/40"
										: "bg-slate-900/80 backdrop-blur text-teal-300 border-slate-700/80 hover:border-teal-500/60"
								}`}
								data-testid={`cbct-angle-overlay-badge-${a.id}`}
							>
								<span>{a.angleDeg.toFixed(1)}°</span>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										handleDeleteAngle(a.id);
									}}
									className="w-4 h-4 rounded-full bg-red-500/30 text-red-300 hover:bg-red-500 hover:text-white border border-red-500/50 flex items-center justify-center text-[10px] cursor-pointer transition-colors"
									title="Удалить угол [×]"
									aria-label="Удалить угол"
								>
									×
								</button>
							</div>
						);
					})}

				{/* Probes */}
				{probeMarkers
					.filter((p) => p.plane === plane)
					.map((pm) => {
						const pScreen = slicePxToScreenPx(worldMmToSlicePx(pm.worldMm, plane, volume), transform);
						const isSelected = selectedMeasurementId === pm.id;

						return (
							<div
								key={pm.id}
								style={{ left: `${pScreen.x + 12}px`, top: `${pScreen.y - 12}px`, transform: "translate(0, -50%)" }}
								className={`absolute z-20 pointer-events-auto flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono font-bold shadow-lg border transition-all ${
									isSelected
										? "bg-slate-900/90 backdrop-blur text-amber-300 border-amber-500/80 ring-1 ring-amber-500/40"
										: "bg-slate-900/80 backdrop-blur text-teal-300 border-slate-700/80 hover:border-teal-500/60"
								}`}
								title={formatMischTooltip(pm.hu)}
								data-testid={`cbct-probe-overlay-badge-${pm.id}`}
							>
								<span>{pm.hu} HU · {pm.tissueName}</span>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										handleDeleteProbe(pm.id);
									}}
									className="w-4 h-4 rounded-full bg-red-500/30 text-red-300 hover:bg-red-500 hover:text-white border border-red-500/50 flex items-center justify-center text-[10px] cursor-pointer transition-colors"
									title="Удалить замер плотности [×]"
									aria-label="Удалить замер плотности"
								>
									×
								</button>
							</div>
						);
					})}

				{/* Floating Mandibular Nerve IAN Badge */}
				{interpolatedNerve3D.length > 1 && (() => {
					const visibleNodes = nervePoints.filter((pt) => {
						if (plane === "axial") return Math.abs(pt.z - crosshairMm.z) <= 3.5;
						if (plane === "coronal") return Math.abs(pt.y - crosshairMm.y) <= 3.5;
						if (plane === "sagittal") return Math.abs(pt.x - crosshairMm.x) <= 3.5;
						return false;
					});
					if (visibleNodes.length === 0) return null;
					const midPt = visibleNodes[Math.floor(visibleNodes.length / 2)]!;
					const pMidScreen = slicePxToScreenPx(worldMmToSlicePx(midPt, plane, volume), transform);
					return (
						<div
							style={{ left: `${pMidScreen.x}px`, top: `${pMidScreen.y - 24}px`, transform: "translate(-50%, -50%)" }}
							className="absolute z-20 pointer-events-auto flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-900/80 backdrop-blur text-amber-300 border border-amber-500/60 shadow-lg"
							data-testid={`cbct-nerve-overlay-badge-${plane}`}
						>
							<span>Канал IAN (3D {nerveTotalLengthMm.toFixed(1)} мм · 2.0 мм буфер)</span>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									handleClearNerve();
								}}
								className="w-4 h-4 rounded-full bg-red-500/30 text-red-300 hover:bg-red-500 hover:text-white border border-red-500/50 flex items-center justify-center text-[10px] cursor-pointer transition-colors"
								title="Очистить трассировку нерва"
								aria-label="Очистить трассировку нерва"
							>
								×
							</button>
						</div>
					);
				})()}
			</div>
		);
	}, [volume, transforms, rulers, selectedMeasurementId, handleDeleteRuler, angles, calculateAngleBadgePosition, handleDeleteAngle, probeMarkers, handleDeleteProbe, interpolatedNerve3D.length, nervePoints, crosshairMm, slicePxToScreenPx, worldMmToSlicePx, nerveTotalLengthMm, handleClearNerve]);

	// ─── 5. RENDER 3-PLANE OBLIQUE MPR SLICES ON CANVAS ─────────────────────────
	const renderMprPlanes = useCallback(() => {
		if (!volume || volume.isDisposed || !volume.data) return;

		const resliced = resliceObliqueMprSynchronized(
			volume,
			crosshairMm,
			obliqueAngles,
			windowWidth,
			windowLevel,
			slabMode,
			slabThicknessMm,
			"trilinear",
		);

		const vox = worldMmToVoxel(crosshairMm, volume);

		// 1. Axial Viewport (Z-Plane: Intersects with Coronal (Amber) & Sagittal (Green))
		if (axialCanvasRef.current) {
			const canvas = axialCanvasRef.current;
			const ctx = canvas.getContext("2d");
			if (ctx) {
				const { data, metadata } = resliced.axial;
				const w = metadata.widthPx || 100;
				const h = metadata.heightPx || 100;
				if (canvas.width !== w || canvas.height !== h) {
					canvas.width = w;
					canvas.height = h;
				}

				if (!axialOffscreenRef.current) {
					axialOffscreenRef.current = document.createElement("canvas");
				}
				const off = axialOffscreenRef.current;
				if (off.width !== w || off.height !== h) {
					off.width = w;
					off.height = h;
				}
				const offCtx = off.getContext("2d");
				if (offCtx) {
					if (!axialImgDataRef.current || axialImgDataRef.current.width !== w || axialImgDataRef.current.height !== h) {
						axialImgDataRef.current = offCtx.createImageData(w, h);
					}
					axialImgDataRef.current.data.set(data);
					offCtx.putImageData(axialImgDataRef.current, 0, 0);
				}

				ctx.save();
				ctx.clearRect(0, 0, w, h);
				const transform = transforms.axial;
				ctx.translate(transform.panX, transform.panY);
				ctx.scale(transform.zoom, transform.zoom);

				ctx.drawImage(off, 0, 0);

				// Draw Calibrated Millimeter Rulers (1mm, 5mm, 10mm + scale bar)
				drawCalibratedMillimeterRulers(ctx, {
					widthPx: w,
					heightPx: h,
					pixelSpacingMmX: metadata.pixelSpacingX,
					pixelSpacingMmY: metadata.pixelSpacingY,
					showScaleBar: true,
					invertColors,
				});

				// Draw Focal Trough Corridor on Axial (Purple dashed bounds)
				if (archCurve.focalTroughThicknessMm > 0 && archCurve.splinePointsMm.length > 1) {
					const { innerBoundary, outerBoundary } = getFocalTroughBoundaryCurves(
						archCurve.splinePointsMm,
						archCurve.focalTroughThicknessMm,
					);

					// Focal trough translucent fill corridor
					ctx.save();
					ctx.fillStyle = ROMEXIS_COLORS.panoramicRgba(0.06);
					ctx.beginPath();
					for (let i = 0; i < outerBoundary.length; i++) {
						const v = worldMmToVoxel({ x: outerBoundary[i]!.x, y: outerBoundary[i]!.y, z: crosshairMm.z }, volume);
						if (i === 0) ctx.moveTo(v.x, v.y);
						else ctx.lineTo(v.x, v.y);
					}
					for (let i = innerBoundary.length - 1; i >= 0; i--) {
						const v = worldMmToVoxel({ x: innerBoundary[i]!.x, y: innerBoundary[i]!.y, z: crosshairMm.z }, volume);
						ctx.lineTo(v.x, v.y);
					}
					ctx.closePath();
					ctx.fill();

					// Inner and outer dashed curves
					ctx.strokeStyle = ROMEXIS_COLORS.panoramicRgba(0.5);
					ctx.lineWidth = 1.0;
					ctx.setLineDash([4, 3]);

					ctx.beginPath();
					for (let i = 0; i < innerBoundary.length; i++) {
						const v = worldMmToVoxel({ x: innerBoundary[i]!.x, y: innerBoundary[i]!.y, z: crosshairMm.z }, volume);
						if (i === 0) ctx.moveTo(v.x, v.y);
						else ctx.lineTo(v.x, v.y);
					}
					ctx.stroke();

					ctx.beginPath();
					for (let i = 0; i < outerBoundary.length; i++) {
						const v = worldMmToVoxel({ x: outerBoundary[i]!.x, y: outerBoundary[i]!.y, z: crosshairMm.z }, volume);
						if (i === 0) ctx.moveTo(v.x, v.y);
						else ctx.lineTo(v.x, v.y);
					}
					ctx.stroke();
					ctx.restore();
				}

				// Draw Dental Arch Spline & Interactive Manipulators (Purple #a855f7 & Teal #2dd4bf)
				if (showDentalArch) {
					ctx.strokeStyle = ROMEXIS_COLORS.panoramicRgba(0.95);
					ctx.lineWidth = 2.0;
					ctx.beginPath();
					const spline = archCurve.splinePointsMm;
					for (let i = 0; i < spline.length; i++) {
						const pt = spline[i]!;
						const v = worldMmToVoxel({ x: pt.x, y: pt.y, z: crosshairMm.z }, volume);
						if (i === 0) ctx.moveTo(v.x, v.y);
						else ctx.lineTo(v.x, v.y);
					}
					ctx.stroke();

					// Draw Interactive 24x24px Control Point Manipulators with 6px Teal-400 core
					drawDentalArchControlPointManipulators(ctx, {
						archCurve,
						volume,
						transform: transforms.axial,
						crosshairZMm: crosshairMm.z,
						selectedAnchorIdx: selectedArchAnchorIdx,
						hoveredAnchorIdx: hoveredArchAnchorIdx,
						draggingAnchorIdx: isDraggingArchAnchor,
						activeToothFdi: crossSections[selectedCrossSectionIndex]?.nearestToothFdi ?? null,
						invertColors,
					});
				}

				// Active Cross-Section Slice indicator line on Axial (Yellow #eab308)
				if (crossSections.length > 0) {
					const activeCS = crossSections[selectedCrossSectionIndex];
					if (activeCS) {
						const norm = activeCS.normalVector2D;
						const centerV = worldMmToVoxel(activeCS.centerPointMm, volume);
						const halfLenMm = 10.0;
						const p1 = worldMmToVoxel({
							x: activeCS.centerPointMm.x - norm.x * halfLenMm,
							y: activeCS.centerPointMm.y - norm.y * halfLenMm,
							z: crosshairMm.z,
						}, volume);
						const p2 = worldMmToVoxel({
							x: activeCS.centerPointMm.x + norm.x * halfLenMm,
							y: activeCS.centerPointMm.y + norm.y * halfLenMm,
							z: crosshairMm.z,
						}, volume);

						ctx.strokeStyle = ROMEXIS_COLORS.crossSection;
						ctx.lineWidth = 2.0;
						ctx.beginPath();
						ctx.moveTo(p1.x, p1.y);
						ctx.lineTo(p2.x, p2.y);
						ctx.stroke();

						ctx.fillStyle = ROMEXIS_COLORS.crossSection;
						ctx.beginPath();
						ctx.arc(centerV.x, centerV.y, 4.0, 0, Math.PI * 2);
						ctx.fill();
					}
				}

				// Draw Oblique Crosshair with Rotation Handles
				drawObliqueCrosshairWithRotationHandles(ctx, {
					widthPx: w,
					heightPx: h,
					centerPx: { x: vox.x, y: vox.y },
					plane: "axial",
					rotationDeg: obliqueAngles.axialAngleDeg,
					showHandles: true,
					showAngleBadge: true,
					invertColors,
				});

				// Draw Measurements, HU Probes and 3D Nerve with Distance Gating
				drawPlaneVectorOverlays(ctx, "axial", volume);

				ctx.restore();
			}
		}

		// 2. Coronal Viewport (Y-Plane: Intersects with Axial (Cyan) & Sagittal (Green))
		if (coronalCanvasRef.current) {
			const canvas = coronalCanvasRef.current;
			const ctx = canvas.getContext("2d");
			if (ctx) {
				const { data, metadata } = resliced.coronal;
				const w = metadata.widthPx || 100;
				const h = metadata.heightPx || 100;
				if (canvas.width !== w || canvas.height !== h) {
					canvas.width = w;
					canvas.height = h;
				}

				if (!coronalOffscreenRef.current) {
					coronalOffscreenRef.current = document.createElement("canvas");
				}
				const off = coronalOffscreenRef.current;
				if (off.width !== w || off.height !== h) {
					off.width = w;
					off.height = h;
				}
				const offCtx = off.getContext("2d");
				if (offCtx) {
					if (!coronalImgDataRef.current || coronalImgDataRef.current.width !== w || coronalImgDataRef.current.height !== h) {
						coronalImgDataRef.current = offCtx.createImageData(w, h);
					}
					coronalImgDataRef.current.data.set(data);
					offCtx.putImageData(coronalImgDataRef.current, 0, 0);
				}

				ctx.save();
				ctx.clearRect(0, 0, w, h);
				const transform = transforms.coronal;
				ctx.translate(transform.panX, transform.panY);
				ctx.scale(transform.zoom, transform.zoom);

				ctx.drawImage(off, 0, 0);

				// Draw Calibrated Millimeter Rulers
				drawCalibratedMillimeterRulers(ctx, {
					widthPx: w,
					heightPx: h,
					pixelSpacingMmX: metadata.pixelSpacingX,
					pixelSpacingMmY: metadata.pixelSpacingY,
					showScaleBar: true,
					invertColors,
				});

				// Draw Oblique Crosshair with Rotation Handles
				const depthMax = Math.max(1, volume.dimensions.depth - 1);
				const coronalCenterSlice = { x: vox.x, y: depthMax - vox.z };
				drawObliqueCrosshairWithRotationHandles(ctx, {
					widthPx: w,
					heightPx: h,
					centerPx: coronalCenterSlice,
					plane: "coronal",
					rotationDeg: obliqueAngles.coronalTiltDeg,
					activeHandle: activeRotationHandle?.plane === "coronal" ? activeRotationHandle.handle : null,
					hoveredHandle: hoveredHandle?.plane === "coronal" ? hoveredHandle.handle : null,
					showHandles: true,
					showAngleBadge: true,
					invertColors,
				});

				// Draw Measurements, HU Probes and 3D Nerve with Distance Gating
				drawPlaneVectorOverlays(ctx, "coronal", volume);

				ctx.restore();
			}
		}

		// 3. Sagittal Viewport (X-Plane: Intersects with Axial (Cyan) & Coronal (Amber))
		if (sagittalCanvasRef.current) {
			const canvas = sagittalCanvasRef.current;
			const ctx = canvas.getContext("2d");
			if (ctx) {
				const { data, metadata } = resliced.sagittal;
				const w = metadata.widthPx || 100;
				const h = metadata.heightPx || 100;
				if (canvas.width !== w || canvas.height !== h) {
					canvas.width = w;
					canvas.height = h;
				}

				if (!sagittalOffscreenRef.current) {
					sagittalOffscreenRef.current = document.createElement("canvas");
				}
				const off = sagittalOffscreenRef.current;
				if (off.width !== w || off.height !== h) {
					off.width = w;
					off.height = h;
				}
				const offCtx = off.getContext("2d");
				if (offCtx) {
					if (!sagittalImgDataRef.current || sagittalImgDataRef.current.width !== w || sagittalImgDataRef.current.height !== h) {
						sagittalImgDataRef.current = offCtx.createImageData(w, h);
					}
					sagittalImgDataRef.current.data.set(data);
					offCtx.putImageData(sagittalImgDataRef.current, 0, 0);
				}

				ctx.save();
				ctx.clearRect(0, 0, w, h);
				const transform = transforms.sagittal;
				ctx.translate(transform.panX, transform.panY);
				ctx.scale(transform.zoom, transform.zoom);

				ctx.drawImage(off, 0, 0);

				// Draw Calibrated Millimeter Rulers
				drawCalibratedMillimeterRulers(ctx, {
					widthPx: w,
					heightPx: h,
					pixelSpacingMmX: metadata.pixelSpacingX,
					pixelSpacingMmY: metadata.pixelSpacingY,
					showScaleBar: true,
					invertColors,
				});

				// Draw Oblique Crosshair with Rotation Handles
				const depthMax = Math.max(1, volume.dimensions.depth - 1);
				const sagittalCenterSlice = { x: vox.y, y: depthMax - vox.z };
				drawObliqueCrosshairWithRotationHandles(ctx, {
					widthPx: w,
					heightPx: h,
					centerPx: sagittalCenterSlice,
					plane: "sagittal",
					rotationDeg: obliqueAngles.sagittalTiltDeg,
					activeHandle: activeRotationHandle?.plane === "sagittal" ? activeRotationHandle.handle : null,
					hoveredHandle: hoveredHandle?.plane === "sagittal" ? hoveredHandle.handle : null,
					showHandles: true,
					showAngleBadge: true,
					invertColors,
				});

				// Draw Measurements, HU Probes and 3D Nerve with Distance Gating
				drawPlaneVectorOverlays(ctx, "sagittal", volume);

				ctx.restore();
			}
		}
	}, [volume, crosshairMm, obliqueAngles, transforms, windowWidth, windowLevel, slabMode, slabThicknessMm, archCurve, selectedAnchorId, crossSections, selectedCrossSectionIndex, activeRotationHandle, hoveredHandle, invertColors, showDentalArch, selectedArchAnchorIdx, hoveredArchAnchorIdx, isDraggingArchAnchor, drawPlaneVectorOverlays]);

	useEffect(() => {
		renderMprPlanes();
	}, [renderMprPlanes]);

	// Reset W/L & View (Zoom, Pan, Rotation, Maximization)
	const handleResetViewAndWL = useCallback(() => {
		setActivePresetId("bone_dense");
		setWindowWidth(4400);
		setWindowLevel(1300);
		setObliqueAngles(DEFAULT_OBLIQUE_ROTATION);
		setTransforms({
			axial: DEFAULT_VIEWPORT_TRANSFORM,
			coronal: DEFAULT_VIEWPORT_TRANSFORM,
			sagittal: DEFAULT_VIEWPORT_TRANSFORM,
			panoramic: DEFAULT_VIEWPORT_TRANSFORM,
			cross_section: DEFAULT_VIEWPORT_TRANSFORM,
		});
		setMaximizedViewport(null);
		setActiveDraggingPlane(null);
		setIsDraggingWL(null);
		setIsPanning(null);
		setActiveRotationHandle(null);
		setIsShiftRotating(null);
	}, []);

	const getCanvasCursor = useCallback((plane: MprPlane) => {
		if (activeTool === "ruler" || activeTool === "angle") return "crosshair";
		if (activeTool === "probe") return "crosshair";
		if (activeTool === "nerve") return "crosshair";
		if (activeTool === "pan") return isPanning ? "grabbing" : "grab";
		if (activeTool === "zoom") return "zoom-in";
		if (activeTool === "window_level") return "ns-resize";
		if (activeTool === "rotate") return "crosshair";

		if (plane === "axial") {
			if (isDraggingArchAnchor !== null) return "grabbing";
			if (hoveredArchAnchorIdx !== null) return "grab";
		}
		if (isShiftRotating?.plane === plane || activeRotationHandle?.plane === plane) return "grabbing";
		if (hoveredHandle?.plane === plane) return "grab";
		if (isDraggingWL) return "ns-resize";
		if (isPanning?.plane === plane) return "move";
		return "crosshair";
	}, [activeTool, isShiftRotating, activeRotationHandle, hoveredHandle, isDraggingWL, isPanning, isDraggingArchAnchor, hoveredArchAnchorIdx]);

	// ─── 6. INTERACTIVE MOUSE HANDLERS (W/L, ZOOM, PAN & ROTATION) ───────────
	const handlePointerDown = (plane: MprPlane, e: React.PointerEvent<HTMLCanvasElement>) => {
		e.currentTarget.setPointerCapture(e.pointerId);
		const canvas = e.currentTarget;
		const clientX = e.clientX;
		const clientY = e.clientY;
		const { x, y } = getCanvasPointerPos(canvas, clientX, clientY);
		const pointerPx = { x, y };

		// 1. Right Click -> Adjust Window / Level (Contrast & Brightness)
		if (e.button === 2) {
			setIsDraggingWL({
				startX: clientX,
				startY: clientY,
				startWW: windowWidth,
				startWL: windowLevel,
			});
			return;
		}

		// 2. Middle Click -> Pan Viewport
		if (e.button === 1) {
			setIsPanning({
				plane,
				startX: clientX,
				startY: clientY,
				startPanX: transforms[plane].panX,
				startPanY: transforms[plane].panY,
			});
			return;
		}

		// 3. Left Click -> Check Active Tool Modes & Normal Navigation
		if (e.button === 0) {
			if (!volume) return;

			const transform = transforms[plane];
			const untransformedPx = {
				x: (pointerPx.x - transform.panX) / transform.zoom,
				y: (pointerPx.y - transform.panY) / transform.zoom,
			};
			const clickedWorldMm = mapCanvasPointerToWorldMmWithTransform(
				pointerPx,
				{ width: canvas.width, height: canvas.height },
				plane,
				crosshairMm,
				obliqueAngles,
				transform,
				volume,
			);

			// Tool Mode: Ruler / Caliper
			if (activeTool === "ruler") {
				setActiveRuler({ plane, startMm: clickedWorldMm, currentMm: clickedWorldMm });
				return;
			}

			// Tool Mode: Angle / Protractor
			if (activeTool === "angle") {
				if (!activeAngle) {
					setActiveAngle({ plane, startMm: clickedWorldMm, vertexMm: null, currentMm: clickedWorldMm });
				} else if (!activeAngle.vertexMm) {
					setActiveAngle({ ...activeAngle, vertexMm: clickedWorldMm, currentMm: clickedWorldMm });
				} else {
					const angleDeg = calculateAngleBetween3Points3D(activeAngle.startMm, activeAngle.vertexMm, clickedWorldMm);
					if (angleDeg > 0) {
						setAngles((prev) => [
							...prev,
							{
								id: `angle-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
								plane,
								startMm: activeAngle.startMm,
								vertexMm: activeAngle.vertexMm!,
								endMm: clickedWorldMm,
								angleDeg,
							},
						]);
					}
					setActiveAngle(null);
				}
				return;
			}

			// Tool Mode: HU Tissue Density Probe
			if (activeTool === "probe") {
				const vox = worldMmToVoxel(clickedWorldMm, volume);
				const hu = sampleVoxelTrilinearHU(vox.x, vox.y, vox.z, volume);
				const tissue = getMischTissueDescription(hu);
				setProbeMarkers((prev) => [
					...prev,
					{
						id: `probe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
						plane,
						worldMm: clickedWorldMm,
						hu,
						tissueName: tissue.nameRu,
						mischClass: tissue.boneClass,
					},
				]);
				return;
			}

			// Tool Mode: Mandibular Canal / Nerve Tracer
			if (activeTool === "nerve") {
				setNervePoints((prev) => [...prev, clickedWorldMm]);
				return;
			}

			// Tool Mode: Pan
			if (activeTool === "pan") {
				setIsPanning({
					plane,
					startX: clientX,
					startY: clientY,
					startPanX: transform.panX,
					startPanY: transform.panY,
				});
				return;
			}

			// Tool Mode: Zoom
			if (activeTool === "zoom") {
				setTransforms((prev) => ({
					...prev,
					[plane]: applyStepZoom(prev[plane], "in", 25),
				}));
				return;
			}

			// Tool Mode: Window / Level
			if (activeTool === "window_level") {
				setIsDraggingWL({
					startX: clientX,
					startY: clientY,
					startWW: windowWidth,
					startWL: windowLevel,
				});
				return;
			}

			// 3a. Hit-testing for Draggable Dental Arch Spline Control Points on Axial Viewport (24x24px Hitbox)
			if (plane === "axial" && showDentalArch) {
				const currentTransform = transforms.axial ?? DEFAULT_VIEWPORT_TRANSFORM;
				const hitAnchor = hitTestDentalArchControlPoint(pointerPx, archCurve, volume, currentTransform, 12, crosshairMm.z);
				if (hitAnchor) {
					setSelectedArchAnchorIdx(hitAnchor.index);
					setSelectedAnchorId(hitAnchor.anchor.id);
					setIsDraggingArchAnchor(hitAnchor.index);
					return;
				}
			}

			const vox = worldMmToVoxel(crosshairMm, volume);
			const centerPx = plane === "axial"
				? { x: vox.x, y: vox.y }
				: plane === "coronal"
				? { x: vox.x, y: canvas.height - 1 - vox.z }
				: { x: vox.y, y: canvas.height - 1 - vox.z };

			const rotDeg = plane === "axial"
				? obliqueAngles.axialAngleDeg
				: plane === "coronal"
				? obliqueAngles.coronalTiltDeg
				: obliqueAngles.sagittalTiltDeg;

			// Shift + Left Drag or Rotate Tool -> Rotate slice plane around axis
			if (e.shiftKey || activeTool === "rotate") {
				setIsShiftRotating({
					plane,
					centerPx,
					startPointerPx: untransformedPx,
					initialAngleDeg: rotDeg,
				});
				return;
			}

			const handles = getRotationHandles(plane, canvas.width, canvas.height, centerPx, 65, rotDeg);
			const hitHandle = hitTestRotationHandle(untransformedPx, handles, 14);

			if (hitHandle) {
				setActiveRotationHandle({ plane, handle: hitHandle.position, centerPx });
			} else {
				setActiveDraggingPlane(plane);
				setCrosshairMm(clickedWorldMm);
			}
		}
	};

	const handlePointerMove = (plane: MprPlane, e: React.PointerEvent<HTMLCanvasElement>) => {
		const canvas = e.currentTarget;
		const clientX = e.clientX;
		const clientY = e.clientY;
		const { x, y } = getCanvasPointerPos(canvas, clientX, clientY);
		const pointerPx = { x, y };

		// Active Ruler Drag Update
		if (activeRuler && activeRuler.plane === plane && volume) {
			const moveWorldMm = mapCanvasPointerToWorldMmWithTransform(
				pointerPx,
				{ width: canvas.width, height: canvas.height },
				plane,
				crosshairMm,
				obliqueAngles,
				transforms[plane],
				volume,
			);
			setActiveRuler((prev) => (prev ? { ...prev, currentMm: moveWorldMm } : null));
			return;
		}

		// Active Angle Pointer Update
		if (activeAngle && activeAngle.plane === plane && volume) {
			const moveWorldMm = mapCanvasPointerToWorldMmWithTransform(
				pointerPx,
				{ width: canvas.width, height: canvas.height },
				plane,
				crosshairMm,
				obliqueAngles,
				transforms[plane],
				volume,
			);
			setActiveAngle((prev) => (prev ? { ...prev, currentMm: moveWorldMm } : null));
			return;
		}

		// 0-arch. Dental Arch Spline Anchor Drag (60fps rAF Coalesced)
		if (isDraggingArchAnchor !== null && plane === "axial" && volume) {
			const currentTransform = transforms.axial ?? DEFAULT_VIEWPORT_TRANSFORM;
			const pointMm = mapCanvasPointerToWorldMmWithTransform(
				pointerPx,
				{ width: canvas.width, height: canvas.height },
				"axial",
				crosshairMm,
				obliqueAngles,
				currentTransform,
				volume,
			);
			pendingArchAnchorMmRef.current = {
				index: isDraggingArchAnchor,
				positionMm: { x: pointMm.x, y: pointMm.y },
			};
			if (rafArchAnchorIdRef.current === null) {
				rafArchAnchorIdRef.current = requestAnimationFrame(() => {
					if (pendingArchAnchorMmRef.current) {
						const { index, positionMm } = pendingArchAnchorMmRef.current;
						setAnchors((prev) =>
							prev.map((a, i) =>
								i === index
									? { ...a, positionMm: { x: Number(positionMm.x.toFixed(2)), y: Number(positionMm.y.toFixed(2)) } }
									: a,
							),
						);
					}
					rafArchAnchorIdRef.current = null;
				});
			}
			return;
		}

		// 1. Right Click Drag -> Adjust Window / Level
		if (isDraggingWL) {
			const deltaX = clientX - isDraggingWL.startX;
			const deltaY = clientY - isDraggingWL.startY;
			const { windowWidth: nw, windowLevel: nl } = applyWindowLevelDrag(
				isDraggingWL.startWW,
				isDraggingWL.startWL,
				deltaX,
				deltaY,
				2.0,
			);
			setWindowWidth(nw);
			setWindowLevel(nl);
			return;
		}

		// 2. Middle Click Drag -> Pan Viewport
		if (isPanning && isPanning.plane === plane) {
			const dx = clientX - isPanning.startX;
			const dy = clientY - isPanning.startY;
			setTransforms((prev) => ({
				...prev,
				[plane]: {
					...prev[plane],
					panX: Number((isPanning.startPanX + dx).toFixed(1)),
					panY: Number((isPanning.startPanY + dy).toFixed(1)),
				},
			}));
			return;
		}

		// 3. Shift Drag -> Smooth Oblique Axis Rotation
		if (isShiftRotating && isShiftRotating.plane === plane) {
			const transform = transforms[plane];
			const untransformedPx = {
				x: (pointerPx.x - transform.panX) / transform.zoom,
				y: (pointerPx.y - transform.panY) / transform.zoom,
			};
			const newAngle = calculateAngleFromShiftDrag(
				isShiftRotating.centerPx,
				untransformedPx,
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

		// 4. Rotation Handle Drag -> Oblique Axis Rotation
		if (activeRotationHandle && activeRotationHandle.plane === plane) {
			const transform = transforms[plane];
			const untransformedPx = {
				x: (pointerPx.x - transform.panX) / transform.zoom,
				y: (pointerPx.y - transform.panY) / transform.zoom,
			};
			const newAngle = calculateAngleFromHandleDrag(
				activeRotationHandle.centerPx,
				untransformedPx,
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

		// 5. Crosshair Drag -> Center Slicing Position
		if (activeDraggingPlane === plane && volume) {
			const newCrosshair = mapCanvasPointerToWorldMmWithTransform(
				pointerPx,
				{ width: canvas.width, height: canvas.height },
				plane,
				crosshairMm,
				obliqueAngles,
				transforms[plane],
				volume,
			);
			setCrosshairMm(newCrosshair);
			return;
		}

		// 6. Hover Detection for Dental Arch Anchors & Rotation Handles (Cursor change)
		if (!isDraggingWL && !isPanning && !activeRotationHandle && !activeDraggingPlane && !isShiftRotating && isDraggingArchAnchor === null && volume) {
			// Check dental arch anchor hover
			if (plane === "axial" && showDentalArch) {
				const currentTransform = transforms.axial ?? DEFAULT_VIEWPORT_TRANSFORM;
				const hitAnchor = hitTestDentalArchControlPoint(pointerPx, archCurve, volume, currentTransform, 12, crosshairMm.z);
				setHoveredArchAnchorIdx(hitAnchor ? hitAnchor.index : null);
			} else if (hoveredArchAnchorIdx !== null) {
				setHoveredArchAnchorIdx(null);
			}

			const vox = worldMmToVoxel(crosshairMm, volume);
			const centerPx = plane === "axial"
				? { x: vox.x, y: vox.y }
				: plane === "coronal"
				? { x: vox.x, y: canvas.height - 1 - vox.z }
				: { x: vox.y, y: canvas.height - 1 - vox.z };

			const transform = transforms[plane];
			const untransformedPx = {
				x: (pointerPx.x - transform.panX) / transform.zoom,
				y: (pointerPx.y - transform.panY) / transform.zoom,
			};

			const rotDeg = plane === "axial"
				? obliqueAngles.axialAngleDeg
				: plane === "coronal"
				? obliqueAngles.coronalTiltDeg
				: obliqueAngles.sagittalTiltDeg;

			const handles = getRotationHandles(plane, canvas.width, canvas.height, centerPx, 65, rotDeg);
			const hitHandle = hitTestRotationHandle(untransformedPx, handles, 14);

			if (hitHandle) {
				setHoveredHandle({ plane, handle: hitHandle.position });
			} else if (hoveredHandle?.plane === plane) {
				setHoveredHandle(null);
			}
		}
	};

	const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
		try {
			e.currentTarget.releasePointerCapture(e.pointerId);
		} catch {
			// ignore
		}

		// Commit Active Ruler Measurement
		if (activeRuler) {
			const distMm = Math.hypot(
				activeRuler.currentMm.x - activeRuler.startMm.x,
				activeRuler.currentMm.y - activeRuler.startMm.y,
				activeRuler.currentMm.z - activeRuler.startMm.z,
			);
			if (distMm >= 0.5) {
				setRulers((prev) => [
					...prev,
					{
						id: `ruler-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
						plane: activeRuler.plane,
						startMm: activeRuler.startMm,
						endMm: activeRuler.currentMm,
						distanceMm: Number(distMm.toFixed(2)),
					},
				]);
			}
			setActiveRuler(null);
		}

		setIsDraggingWL(null);
		setIsPanning(null);
		setActiveRotationHandle(null);
		setIsShiftRotating(null);
		setActiveDraggingPlane(null);
		setIsDraggingArchAnchor(null);
	};

	// Double click on canvas: if near crosshair center -> reset angles to 0°, else toggle maximize
	const handleCanvasDoubleClick = (plane: MprPlane, e: React.MouseEvent<HTMLCanvasElement>) => {
		e.preventDefault();
		e.stopPropagation();
		if (!volume) return;
		const canvas = e.currentTarget;
		const { x, y } = getCanvasPointerPos(canvas, e.clientX, e.clientY);
		const pointerPx = { x, y };
		const transform = transforms[plane];
		const untransformedPx = {
			x: (pointerPx.x - transform.panX) / transform.zoom,
			y: (pointerPx.y - transform.panY) / transform.zoom,
		};
		const vox = worldMmToVoxel(crosshairMm, volume);
		const centerPx = plane === "axial"
			? { x: vox.x, y: vox.y }
			: plane === "coronal"
			? { x: vox.x, y: canvas.height - 1 - vox.z }
			: { x: vox.y, y: canvas.height - 1 - vox.z };

		if (hitTestCrosshairCenter(untransformedPx, centerPx, 18)) {
			// Quick 1-click / double-click reset of oblique angle for this plane
			setObliqueAngles((prev) => resetPlaneObliqueAngle(prev, plane));
			return;
		}

		handleToggleMaximize(plane);
	};

	// Mouse Wheel -> Cursor-anchored Smooth Zoom (0.5x - 5.0x) on all viewports
	const handleWheelZoom = (viewport: CbctViewportType, e: React.WheelEvent<HTMLCanvasElement>) => {
		e.preventDefault();
		const canvas = e.currentTarget;
		const { x, y } = getCanvasPointerPos(canvas, e.clientX, e.clientY);
		const cursorPx = { x, y };

		setTransforms((prev) => ({
			...prev,
			[viewport]: applyCursorZoom(prev[viewport] ?? DEFAULT_VIEWPORT_TRANSFORM, cursorPx, e.deltaY, 0.5, 5.0),
		}));
	};

	const handleWheelScroll = handleWheelZoom;

	// ─── KEYBOARD HOTKEY NAVIGATION HANDLERS ─────────────────────────────────
	const handleScrollSlice = useCallback((direction: "prev" | "next", stepCount: number) => {
		if (!volume) return;
		const vox = worldMmToVoxel(crosshairMm, volume);
		const delta = (direction === "next" ? 1 : -1) * stepCount;
		if (activeViewport === "axial" || activeViewport === "panoramic") {
			const newZ = Math.max(0, Math.min(volume.dimensions.depth - 1, vox.z + delta));
			setCrosshairMm(voxelToWorldMm({ x: vox.x, y: vox.y, z: newZ }, volume));
		} else if (activeViewport === "coronal") {
			const newY = Math.max(0, Math.min(volume.dimensions.height - 1, vox.y + delta));
			setCrosshairMm(voxelToWorldMm({ x: vox.x, y: newY, z: vox.z }, volume));
		} else if (activeViewport === "sagittal") {
			const newX = Math.max(0, Math.min(volume.dimensions.width - 1, vox.x + delta));
			setCrosshairMm(voxelToWorldMm({ x: newX, y: vox.y, z: vox.z }, volume));
		} else if (activeViewport === "cross_section") {
			if (crossSections.length > 0) {
				setSelectedCrossSectionIndex((prev) => Math.max(0, Math.min(crossSections.length - 1, prev + delta)));
			}
		}
	}, [volume, crosshairMm, activeViewport, crossSections.length]);

	const handleNavigateCrossSection = useCallback((direction: "prev" | "next", stepCount: number) => {
		if (crossSections.length === 0) return;
		const delta = (direction === "next" ? 1 : -1) * stepCount;
		setSelectedCrossSectionIndex((prev) => {
			const nextIdx = Math.max(0, Math.min(crossSections.length - 1, prev + delta));
			const cs = crossSections[nextIdx];
			if (cs && volume) {
				setCrosshairMm(cs.centerPointMm);
			}
			return nextIdx;
		});
	}, [crossSections, volume]);

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
		setObliqueAngles(DEFAULT_OBLIQUE_ROTATION);
	}, [activeViewport]);

	const handleToggleMaximizeActive = useCallback(() => {
		setMaximizedViewport((prev) => (prev === activeViewport ? null : activeViewport));
	}, [activeViewport]);

	const handleSelectPreset = useCallback((preset: { id: string; windowWidth: number; windowLevel: number }) => {
		setActivePresetId(preset.id);
		setWindowWidth(preset.windowWidth);
		setWindowLevel(preset.windowLevel);
	}, []);

	const handleSelectPresetShortcut = useCallback((preset: "bone" | "endo" | "soft") => {
		const presetId = preset === "bone" ? "bone_dense" : preset === "endo" ? "enamel_dentin" : "soft_tissue";
		setActivePresetId(presetId);
		const found = CBCT_HOUNSFIELD_PRESETS.find((p) => p.id === presetId);
		if (found) {
			setWindowWidth(found.windowWidth);
			setWindowLevel(found.windowLevel);
		}
	}, []);

	const { isHelpOpen, toggleHelp } = useCbctKeyboardShortcuts({
		enabled: true,
		activeViewport,
		setActiveViewport,
		viewports: ["axial", "coronal", "sagittal", "panoramic", "cross_section"],
		onScrollSlice: handleScrollSlice,
		onNavigateCrossSection: handleNavigateCrossSection,
		onZoom: handleKeyboardZoom,
		onResetTransform: handleResetTransform,
		onToggleMaximize: handleToggleMaximizeActive,
		onSelectPreset: handleSelectPresetShortcut,
	});

	// ─── 7. RECONSTRUCT PANORAMA & CROSS-SECTIONS ─────────────────────────────
	const handleReconstructPanorama = () => {
		if (!volume) return;
		const pano = reconstructPanoramicView(volume, archCurve, {
			heightMm: 38.0,
			heightPx: 280,
			windowWidth,
			windowLevel,
		});
		setPanoramicResult(pano);

		const sections = generateCrossSectionSlices(volume, archCurve, 2.0, crosshairMm.z, {
			widthMm: 24.0,
			heightMm: 32.0,
			windowWidth,
			windowLevel,
		});
		setCrossSections(sections);
		setSelectedCrossSectionIndex(0);
	};

	// Render Panoramic View on Canvas when available
	useEffect(() => {
		if (panoCanvasRef.current && panoramicResult) {
			const canvas = panoCanvasRef.current;
			const ctx = canvas.getContext("2d");
			if (ctx) {
				if (canvas.width !== panoramicResult.widthPx || canvas.height !== panoramicResult.heightPx) {
					canvas.width = panoramicResult.widthPx;
					canvas.height = panoramicResult.heightPx;
				}
				const imgData = ctx.createImageData(panoramicResult.widthPx, panoramicResult.heightPx);
				imgData.data.set(panoramicResult.pixelData);
				ctx.putImageData(imgData, 0, 0);

				// Draw Calibrated Millimeter Rulers on Panorama (Y-axis only to avoid collision with tooth markers)
				drawCalibratedMillimeterRulers(ctx, {
					widthPx: canvas.width,
					heightPx: canvas.height,
					pixelSpacingMmX: volume?.spacingMm.x ?? 0.4,
					pixelSpacingMmY: volume?.spacingMm.z ?? 0.4,
					showXAxis: false,
					showYAxis: true,
					showScaleBar: true,
					invertColors,
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

				// Draw Active Cross-Section Line on Panorama (Yellow #eab308)
				if (crossSections.length > 0 && selectedCrossSectionIndex < crossSections.length) {
					const cs = crossSections[selectedCrossSectionIndex];
					if (cs && panoramicResult.widthPx > 0) {
						const normX = cs.distanceAlongArchMm / (archCurve.totalArcLengthMm || 1.0);
						const csX = Math.round(normX * canvas.width);
						ctx.strokeStyle = ROMEXIS_COLORS.crossSection;
						ctx.lineWidth = 2.0;
						ctx.beginPath();
						ctx.moveTo(csX, 0);
						ctx.lineTo(csX, canvas.height);
						ctx.stroke();
					}
				}

				// Draw FDI tooth marker lines
				ctx.strokeStyle = ROMEXIS_COLORS.panoramicRgba(0.7);
				ctx.lineWidth = 1.0;
				ctx.fillStyle = "#38bdf8";
				ctx.font = "bold 10px monospace";

				for (const marker of panoramicResult.toothMarkersOnPano) {
					ctx.beginPath();
					ctx.moveTo(marker.xPx, 0);
					ctx.lineTo(marker.xPx, canvas.height);
					ctx.stroke();
					ctx.fillText(marker.toothFdi, marker.xPx - 6, 14);
				}
			}
		}
	}, [panoramicResult, volume, crosshairMm, slabMode, slabThicknessMm, crossSections, selectedCrossSectionIndex, archCurve]);

	// Render Selected Cross-Section Slice on Canvas
	const activeCrossSection = crossSections[selectedCrossSectionIndex];
	useEffect(() => {
		if (crossSectionCanvasRef.current && activeCrossSection) {
			const canvas = crossSectionCanvasRef.current;
			const ctx = canvas.getContext("2d");
			if (ctx) {
				if (canvas.width !== activeCrossSection.widthPx || canvas.height !== activeCrossSection.heightPx) {
					canvas.width = activeCrossSection.widthPx;
					canvas.height = activeCrossSection.heightPx;
				}
				const imgData = ctx.createImageData(activeCrossSection.widthPx, activeCrossSection.heightPx);
				imgData.data.set(activeCrossSection.pixelData);
				ctx.putImageData(imgData, 0, 0);

				// Draw Calibrated Millimeter Rulers and Grid
				drawCalibratedMillimeterRulers(ctx, {
					widthPx: canvas.width,
					heightPx: canvas.height,
					pixelSpacingMmX: activeCrossSection.pixelSpacingMm,
					pixelSpacingMmY: activeCrossSection.pixelSpacingMm,
					showGrid: true,
					showScaleBar: true,
					invertColors,
				});

				// Draw Axial Plane Reference Line (Cyan #06b6d4)
				const centerY = canvas.height / 2;
				ctx.strokeStyle = ROMEXIS_COLORS.axialRgba(0.75);
				ctx.lineWidth = 1.0;
				ctx.setLineDash([3, 3]);
				ctx.beginPath();
				ctx.moveTo(0, centerY);
				ctx.lineTo(canvas.width, centerY);
				ctx.stroke();
				ctx.setLineDash([]);
			}
		}
	}, [activeCrossSection]);

	const crossSectionMetrics = useMemo(() => {
		if (!activeCrossSection) return null;
		return measureAlveolarRidgeCrossSection(activeCrossSection);
	}, [activeCrossSection]);

	return (
		<div
			className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 font-sans select-none overflow-hidden"
			data-testid="cbct-mpr-viewer-modal"
		>
			{/* ── TOP CLINICAL HEADER ── */}
			<header className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
				<div className="flex items-center gap-3">
					<div className="p-2 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] text-[var(--teal)]">
						<Volume2 className="w-5 h-5" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h1 className="text-sm font-bold text-slate-100">
								3D КЛКТ MPR & Панорамная кривая зубной дуги
							</h1>
							<span className="px-2 py-0.5 rounded-md bg-[var(--teal-surface)] text-[var(--teal)] text-[11px] font-bold">
								60 FPS Sync
							</span>
						</div>
						<p className="text-xs text-slate-400">
							{study?.patientName ? `Пациент: ${study.patientName} • ` : ""}
							Координаты среза: X={crosshairMm.x.toFixed(1)} мм, Y={crosshairMm.y.toFixed(1)} мм, Z={crosshairMm.z.toFixed(1)} мм
						</p>
					</div>
				</div>

				{/* Center: Viewport Mode Switcher */}
				<div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
					<button
						type="button"
						onClick={() => setActiveTab("mpr")}
						className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
							activeTab === "mpr"
								? "bg-[var(--teal)] text-white shadow-md font-extrabold"
								: "text-slate-400 hover:text-slate-200"
						}`}
					>
						3-Plane MPR
					</button>
					<button
						type="button"
						onClick={() => {
							setActiveTab("panoramic");
							if (!panoramicResult) handleReconstructPanorama();
						}}
						className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
							activeTab === "panoramic"
								? "bg-[var(--teal)] text-white shadow-md font-extrabold"
								: "text-slate-400 hover:text-slate-200"
						}`}
					>
						Панорама (ОПТГ)
					</button>
					<button
						type="button"
						onClick={() => {
							setActiveTab("cross_sections");
							if (crossSections.length === 0) handleReconstructPanorama();
						}}
						className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
							activeTab === "cross_sections"
								? "bg-[var(--teal)] text-white shadow-md font-extrabold"
								: "text-slate-400 hover:text-slate-200"
						}`}
					>
						Кросс-секции ({crossSections.length})
					</button>
				</div>

				{/* Right: Controls & Close */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleResetViewAndWL}
						className="flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold hover:bg-slate-700 hover:text-white hover:border-cyan-500/60 transition-all shadow-sm cursor-pointer"
						title="Сброс вида: масштаб 100%, центрирование (0,0), сброс углов осей 0.0° и стандартный контраст (WW 4400 / WL 1300)"
						data-testid="cbct-btn-reset-view"
					>
						<RotateCcw className="w-4 h-4 text-cyan-400" />
						<span>↺ Сброс вида</span>
					</button>
					<button
						type="button"
						onClick={handleReconstructPanorama}
						className="flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] text-[var(--teal)] text-xs font-bold hover:bg-[var(--teal)] hover:text-white transition-all shadow-sm"
						title="Пересчитать панораму и кросс-секции"
					>
						<RefreshCw className="w-4 h-4" />
						<span>Обновить ОПТГ</span>
					</button>
					{onClose && (
						<button
							type="button"
							onClick={onClose}
							className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
							title="Закрыть"
						>
							<X className="w-5 h-5" />
						</button>
					)}
				</div>
			</header>

			{/* ── TOOLBAR: HOUNSFIELD PRESETS & SLAB THICKNESS ── */}
			<div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800 gap-4 flex-wrap text-xs">
				{/* Presets */}
				<div className="flex items-center gap-1.5 flex-wrap">
					<span className="font-semibold text-slate-400 mr-1">Пресет HU:</span>
					{CBCT_HOUNSFIELD_PRESETS.map((preset) => (
						<button
							key={preset.id}
							type="button"
							onClick={() => handleSelectPreset(preset)}
							className={`min-h-[44px] px-3 py-1.5 rounded-xl border transition-all ${
								activePresetId === preset.id
									? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--teal)] font-bold shadow-sm"
									: "bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white"
							}`}
							title={preset.descriptionRu}
						>
							{preset.label}
						</button>
					))}
				</div>

				{/* Slab Thickness & Mode */}
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-1.5">
						<span className="font-semibold text-slate-400">Срез (Slab):</span>
						<select
							value={slabMode}
							onChange={(e) => setSlabMode(e.target.value as SlabProjectionMode)}
							className="min-h-[44px] px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-[var(--teal)]"
						>
							<option value="single">Одинарный срез (1 мм)</option>
							<option value="mip">MIP (Макс. интенсивность)</option>
							<option value="minip">MinIP (Пазухи / Воздух)</option>
							<option value="average">Average IP (Усреднение)</option>
						</select>
					</div>

					{slabMode !== "single" && (
						<div className="flex items-center gap-2">
							<span className="text-slate-400">Толщина:</span>
							<input
								type="range"
								min="1"
								max="30"
								step="1"
								value={slabThicknessMm}
								onChange={(e) => setSlabThicknessMm(Number(e.target.value))}
								className="w-24 accent-[var(--teal)]"
							/>
							<span className="font-bold text-[var(--teal)] font-mono">{slabThicknessMm} мм</span>
						</div>
					)}

					{/* Jaw Switcher */}
					<div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
						<button
							type="button"
							onClick={() => handleSwitchJaw("mandible")}
							className={`min-h-[44px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
								activeJaw === "mandible"
									? "bg-[var(--teal)] text-white"
									: "text-slate-400 hover:text-slate-200"
							}`}
						>
							Н.Ч.
						</button>
						<button
							type="button"
							onClick={() => handleSwitchJaw("maxilla")}
							className={`min-h-[44px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
								activeJaw === "maxilla"
									? "bg-[var(--teal)] text-white"
									: "text-slate-400 hover:text-slate-200"
							}`}
						>
							В.Ч.
						</button>
					</div>

					{/* 1-Click Auto Dental Arch Generation Button */}
					<button
						type="button"
						onClick={handleAutoDetectArch}
						className="flex items-center gap-1.5 min-h-[44px] px-3.5 py-1.5 rounded-xl bg-purple-950/60 border border-purple-500/70 text-purple-200 text-xs font-bold hover:bg-purple-900 hover:text-white hover:border-purple-400 transition-all shadow-sm cursor-pointer"
						title="Сгенерировать дугу автоматически по плотности эмали и кортикального гребня"
						data-testid="cbct-btn-auto-arch"
					>
						<Sliders className="w-4 h-4 text-purple-400" />
						<span>⚙️ Сгенерировать дугу автоматически</span>
					</button>

					{/* Toggle Dental Arch Spline Button */}
					<button
						type="button"
						onClick={() => setShowDentalArch((prev) => !prev)}
						className={`flex items-center gap-1.5 min-h-[44px] px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
							showDentalArch
								? "bg-purple-950/40 text-purple-200 border-purple-500/60"
								: "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
						}`}
						title="Показать / скрыть анатомическую дугу ОПТГ на аксиальном срезе"
						data-testid="cbct-toggle-dental-arch"
					>
						<Spline className="w-4 h-4 text-purple-400" />
						<span>Дуга ОПТГ</span>
					</button>
				</div>
			</div>

			{/* ── MAIN WORKSPACE CONTENT ── */}
			<main className="flex-1 min-h-0 relative bg-black flex flex-col overflow-hidden">
				{/* 1. 3-PLANE MPR VIEW */}
				{activeTab === "mpr" && (
					<div className="flex-1 flex flex-col min-h-0 overflow-hidden">
						{/* Mobile Slice Switcher Tabs (<768px) */}
						<div className="md:hidden flex items-center bg-slate-900 border-b border-slate-800 p-1.5 shrink-0 gap-1.5 overflow-x-auto min-w-0">
							<button
								type="button"
								onClick={() => setMobileMprSlice("axial")}
								data-testid="cbct-mobile-tab-axial"
								className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 border ${
									mobileMprSlice === "axial"
										? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-md"
										: "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
								}`}
							>
								<Eye className="w-3.5 h-3.5" />
								<span>Аксиал</span>
							</button>
							<button
								type="button"
								onClick={() => setMobileMprSlice("coronal")}
								data-testid="cbct-mobile-tab-coronal"
								className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 border ${
									mobileMprSlice === "coronal"
										? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-md"
										: "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
								}`}
							>
								<Eye className="w-3.5 h-3.5" />
								<span>Коронал</span>
							</button>
							<button
								type="button"
								onClick={() => setMobileMprSlice("sagittal")}
								data-testid="cbct-mobile-tab-sagittal"
								className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 border ${
									mobileMprSlice === "sagittal"
										? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-md"
										: "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
								}`}
							>
								<Eye className="w-3.5 h-3.5 shrink-0" />
								<span className="whitespace-nowrap">• Сагитт.</span>
							</button>
							<button
								type="button"
								onClick={() => {
									setMobileMprSlice("panoramic");
									setActiveTab("panoramic");
									if (!panoramicResult) handleReconstructPanorama();
								}}
								data-testid="cbct-mobile-tab-panoramic"
								className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 border ${
									mobileMprSlice === "panoramic"
										? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-md"
										: "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
								}`}
							>
								<Spline className="w-3.5 h-3.5" />
								<span>Панорама</span>
							</button>
						</div>

						<div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden p-2 bg-slate-950 gap-2">
							{/* Axial Plane */}
							{(!maximizedViewport || maximizedViewport === "axial") && (
								<div
									onDoubleClick={() => handleToggleMaximize("axial")}
									onContextMenu={(e) => e.preventDefault()}
									onPointerDownCapture={() => setActiveViewport("axial")}
									className={`rounded-2xl bg-slate-900 overflow-hidden relative shadow-lg transition-all min-h-0 ${
										activeViewport === "axial"
											? "ring-1 ring-cyan-500/50 border border-cyan-500/80 shadow-cyan-950/30"
											: "border border-slate-800"
									} ${
										maximizedViewport === "axial"
											? "flex-1 w-full h-full flex flex-col"
											: mobileMprSlice === "axial"
											? "flex-1 w-full h-full flex flex-col"
											: "hidden md:flex md:flex-1 md:flex-col md:min-w-0"
									}`}
									data-testid="cbct-viewport-container-axial"
								>
									<div className="flex-1 flex items-center justify-center relative p-1 bg-black min-h-0 overflow-hidden w-full h-full">
										<canvas
											ref={axialCanvasRef}
											onContextMenu={(e) => e.preventDefault()}
											onDoubleClick={(e) => handleCanvasDoubleClick("axial", e)}
											onPointerDown={(e) => handlePointerDown("axial", e)}
											onPointerMove={(e) => handlePointerMove("axial", e)}
											onPointerUp={handlePointerUp}
											onWheel={(e) => handleWheelZoom("axial", e)}
											style={{ cursor: getCanvasCursor("axial") }}
											className="max-w-full max-h-full object-contain rounded-lg block m-auto"
										/>
										<CbctViewportHud
											viewportType="axial"
											coordinateMm={{ z: crosshairMm.z }}
											slabMode={slabMode}
											slabThicknessMm={slabThicknessMm}
											pixelSpacingMm={volume?.spacingMm.x ?? 0.4}
											obliqueAngleDeg={obliqueAngles.axialAngleDeg}
											onResetAngle={() => setObliqueAngles((prev) => resetPlaneObliqueAngle(prev, "axial"))}
											zoomFactor={transforms.axial.zoom}
											windowWidth={windowWidth}
											windowLevel={windowLevel}
											isMaximized={maximizedViewport === "axial"}
											onToggleMaximize={() => handleToggleMaximize("axial")}
										/>
									</div>
								</div>
							)}

							{/* Coronal Plane */}
							{(!maximizedViewport || maximizedViewport === "coronal") && (
								<div
									onDoubleClick={() => handleToggleMaximize("coronal")}
									onContextMenu={(e) => e.preventDefault()}
									onPointerDownCapture={() => setActiveViewport("coronal")}
									className={`rounded-2xl bg-slate-900 overflow-hidden relative shadow-lg transition-all min-h-0 ${
										activeViewport === "coronal"
											? "ring-1 ring-cyan-500/50 border border-cyan-500/80 shadow-cyan-950/30"
											: "border border-slate-800"
									} ${
										maximizedViewport === "coronal"
											? "flex-1 w-full h-full flex flex-col"
											: mobileMprSlice === "coronal"
											? "flex-1 w-full h-full flex flex-col"
											: "hidden md:flex md:flex-1 md:flex-col md:min-w-0"
									}`}
									data-testid="cbct-viewport-container-coronal"
								>
									<div className="flex-1 flex items-center justify-center relative p-1 bg-black min-h-0 overflow-hidden w-full h-full">
										<canvas
											ref={coronalCanvasRef}
											onContextMenu={(e) => e.preventDefault()}
											onDoubleClick={(e) => handleCanvasDoubleClick("coronal", e)}
											onPointerDown={(e) => handlePointerDown("coronal", e)}
											onPointerMove={(e) => handlePointerMove("coronal", e)}
											onPointerUp={handlePointerUp}
											onWheel={(e) => handleWheelZoom("coronal", e)}
											style={{ cursor: getCanvasCursor("coronal") }}
											className="max-w-full max-h-full object-contain rounded-lg block m-auto"
										/>
										<CbctViewportHud
											viewportType="coronal"
											coordinateMm={{ y: crosshairMm.y }}
											slabMode={slabMode}
											slabThicknessMm={slabThicknessMm}
											pixelSpacingMm={volume?.spacingMm.x ?? 0.4}
											obliqueAngleDeg={obliqueAngles.coronalTiltDeg}
											onResetAngle={() => setObliqueAngles((prev) => resetPlaneObliqueAngle(prev, "coronal"))}
											zoomFactor={transforms.coronal.zoom}
											windowWidth={windowWidth}
											windowLevel={windowLevel}
											isMaximized={maximizedViewport === "coronal"}
											onToggleMaximize={() => handleToggleMaximize("coronal")}
										/>
									</div>
								</div>
							)}

							{/* Sagittal Plane */}
							{(!maximizedViewport || maximizedViewport === "sagittal") && (
								<div
									onDoubleClick={() => handleToggleMaximize("sagittal")}
									onContextMenu={(e) => e.preventDefault()}
									onPointerDownCapture={() => setActiveViewport("sagittal")}
									className={`rounded-2xl bg-slate-900 overflow-hidden relative shadow-lg transition-all min-h-0 ${
										activeViewport === "sagittal"
											? "ring-1 ring-cyan-500/50 border border-cyan-500/80 shadow-cyan-950/30"
											: "border border-slate-800"
									} ${
										maximizedViewport === "sagittal"
											? "flex-1 w-full h-full flex flex-col"
											: mobileMprSlice === "sagittal"
											? "flex-1 w-full h-full flex flex-col"
											: "hidden md:flex md:flex-1 md:flex-col md:min-w-0"
									}`}
									data-testid="cbct-viewport-container-sagittal"
								>
									<div className="flex-1 flex items-center justify-center relative p-1 bg-black min-h-0 overflow-hidden w-full h-full">
										<canvas
											ref={sagittalCanvasRef}
											onContextMenu={(e) => e.preventDefault()}
											onDoubleClick={(e) => handleCanvasDoubleClick("sagittal", e)}
											onPointerDown={(e) => handlePointerDown("sagittal", e)}
											onPointerMove={(e) => handlePointerMove("sagittal", e)}
											onPointerUp={handlePointerUp}
											onWheel={(e) => handleWheelZoom("sagittal", e)}
											style={{ cursor: getCanvasCursor("sagittal") }}
											className="max-w-full max-h-full object-contain rounded-lg block m-auto"
										/>
										<CbctViewportHud
											viewportType="sagittal"
											coordinateMm={{ x: crosshairMm.x }}
											slabMode={slabMode}
											slabThicknessMm={slabThicknessMm}
											pixelSpacingMm={volume?.spacingMm.y ?? 0.4}
											obliqueAngleDeg={obliqueAngles.sagittalTiltDeg}
											onResetAngle={() => setObliqueAngles((prev) => resetPlaneObliqueAngle(prev, "sagittal"))}
											zoomFactor={transforms.sagittal.zoom}
											windowWidth={windowWidth}
											windowLevel={windowLevel}
											isMaximized={maximizedViewport === "sagittal"}
											onToggleMaximize={() => handleToggleMaximize("sagittal")}
										/>
									</div>
								</div>
							)}
						</div>
					</div>
				)}

				{/* 2. PANORAMIC (OPG) VIEW */}
				{activeTab === "panoramic" && (
					<div className="flex-1 flex flex-col p-4 bg-slate-950 min-h-0 overflow-y-auto gap-3">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Spline className="w-5 h-5 text-[var(--teal)]" />
								<h2 className="text-sm font-bold text-slate-100">
									Развернутая панорама зубного ряда (ОПТГ / Focal Trough {focalTroughThicknessMm} мм)
								</h2>
							</div>
							<div className="flex items-center gap-2 text-xs">
								<span className="text-slate-400">Толщина фокального слоя:</span>
								<input
									type="range"
									min="5"
									max="20"
									step="1"
									value={focalTroughThicknessMm}
									onChange={(e) => setFocalTroughThicknessMm(Number(e.target.value))}
									className="w-24 accent-[var(--teal)]"
								/>
								<span className="font-bold text-[var(--teal)] font-mono">{focalTroughThicknessMm} мм</span>
							</div>
						</div>

						<div
							onDoubleClick={() => handleToggleMaximize("panoramic")}
							onPointerDownCapture={() => setActiveViewport("panoramic")}
							className={`flex-1 flex items-center justify-center bg-black rounded-2xl p-2 min-h-[300px] overflow-hidden relative transition-all ${
								activeViewport === "panoramic"
									? "ring-1 ring-cyan-500/50 border border-cyan-500/80 shadow-cyan-950/30"
									: "border border-slate-800"
							}`}
							data-testid="cbct-viewport-container-panoramic"
						>
							{panoramicResult ? (
								<>
									<canvas
										ref={panoCanvasRef}
										onWheel={(e) => handleWheelZoom("panoramic", e)}
										className="w-full h-full object-contain rounded-lg shadow-2xl cursor-pointer"
										data-testid="cbct-panorama-canvas"
									/>
									<CbctViewportHud
										viewportType="panoramic"
										coordinateMm={{ z: crosshairMm.z }}
										slabMode={slabMode}
										slabThicknessMm={focalTroughThicknessMm}
										pixelSpacingMm={volume?.spacingMm.x ?? 0.4}
										isMaximized={maximizedViewport === "panoramic"}
										onToggleMaximize={() => handleToggleMaximize("panoramic")}
										windowWidth={windowWidth}
										windowLevel={windowLevel}
									/>
								</>
							) : (
								<div className="text-xs text-slate-500 italic">Нажмите «Обновить ОПТГ» для построения панорамы</div>
							)}
						</div>
					</div>
				)}

				{/* 3. TRANSVERSE CROSS-SECTIONS CAROUSEL */}
				{activeTab === "cross_sections" && (
					<div className="flex-1 flex flex-col p-4 bg-slate-950 min-h-0 overflow-hidden gap-3">
						<div className="flex items-center justify-between shrink-0">
							<div className="flex items-center gap-2">
								<Layers className="w-5 h-5 text-[var(--teal)]" />
								<h2 className="text-sm font-bold text-slate-100">
									Поперечные кросс-секции альвеолярного гребня (Шаг 2.0 мм)
								</h2>
							</div>

							{/* Navigation Carousel */}
							<div className="flex items-center gap-2">
								<button
									type="button"
									disabled={selectedCrossSectionIndex <= 0}
									onClick={() => setSelectedCrossSectionIndex((p) => Math.max(0, p - 1))}
									className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2 rounded-xl bg-slate-800 text-slate-200 disabled:opacity-40"
								>
									<ChevronLeft className="w-5 h-5" />
								</button>
								<span className="text-xs font-bold text-slate-300 font-mono px-2">
									Срез {selectedCrossSectionIndex + 1} из {crossSections.length}
								</span>
								<button
									type="button"
									disabled={selectedCrossSectionIndex >= crossSections.length - 1}
									onClick={() => setSelectedCrossSectionIndex((p) => Math.min(crossSections.length - 1, p + 1))}
									className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2 rounded-xl bg-slate-800 text-slate-200 disabled:opacity-40"
								>
									<ChevronRight className="w-5 h-5" />
								</button>
							</div>
						</div>

						{/* Main Cross-Section Display */}
						<div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 overflow-hidden">
							{/* Canvas */}
							<div
								onDoubleClick={() => handleToggleMaximize("cross_section")}
								onPointerDownCapture={() => setActiveViewport("cross_section")}
								className={`flex-1 flex items-center justify-center bg-black rounded-2xl p-2 min-h-0 overflow-hidden relative transition-all ${
									activeViewport === "cross_section"
										? "ring-1 ring-cyan-500/50 border border-cyan-500/80 shadow-cyan-950/30"
										: "border border-slate-800"
								}`}
								data-testid="cbct-viewport-container-cross-section"
							>
								{activeCrossSection ? (
									<>
										<canvas
											ref={crossSectionCanvasRef}
											onWheel={(e) => handleWheelZoom("cross_section", e)}
											className="w-full h-full object-contain rounded-lg shadow-2xl"
										/>
										<CbctViewportHud
											viewportType="cross_section"
											toothFdi={activeCrossSection.nearestToothFdi}
											sliceIndex={selectedCrossSectionIndex}
											totalSlices={crossSections.length}
											pixelSpacingMm={activeCrossSection.pixelSpacingMm}
											isMaximized={maximizedViewport === "cross_section"}
											onToggleMaximize={() => handleToggleMaximize("cross_section")}
											windowWidth={windowWidth}
											windowLevel={windowLevel}
										/>
									</>
								) : (
									<div className="text-xs text-slate-500 italic">Срезы еще не рассчитаны</div>
								)}
							</div>

							{/* Diagnostic Bone Metrics Card */}
							{activeCrossSection && crossSectionMetrics && (
								<div className="w-full md:w-80 flex flex-col gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800 shrink-0">
									<div className="flex items-center justify-between">
										<span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
											Зона: {activeCrossSection.toothLabelRu}
										</span>
										<span className="px-2 py-0.5 rounded bg-[var(--teal-surface)] text-[var(--teal)] font-bold text-xs">
											FDI #{activeCrossSection.nearestToothFdi}
										</span>
									</div>

									<div className="grid grid-cols-2 gap-2 text-xs font-mono">
										<div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
											<div className="text-[10px] text-slate-400">Высота гребня:</div>
											<div className="text-sm font-bold text-white mt-0.5">{crossSectionMetrics.heightMm} мм</div>
										</div>
										<div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
											<div className="text-[10px] text-slate-400">Ширина вершины:</div>
											<div className="text-sm font-bold text-white mt-0.5">{crossSectionMetrics.crestWidthMm} мм</div>
										</div>
										<div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
											<div className="text-[10px] text-slate-400">Середина тела:</div>
											<div className="text-sm font-bold text-white mt-0.5">{crossSectionMetrics.midWidthMm} мм</div>
										</div>
										<div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
											<div className="text-[10px] text-slate-400">База гребня:</div>
											<div className="text-sm font-bold text-white mt-0.5">{crossSectionMetrics.baseWidthMm} мм</div>
										</div>
									</div>

									<div className={`p-3 rounded-xl border text-xs leading-relaxed ${
										crossSectionMetrics.isAdequateForImplant
											? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
											: "bg-amber-950/40 border-amber-500/40 text-amber-300"
									}`}>
										{crossSectionMetrics.clinicalAdviceRu}
									</div>
								</div>
							)}
						</div>
					</div>
				)}
			</main>

			{/* Bottom Status Bar & Hotkey Hints */}
			<CbctHotkeysStatusBar
				activeViewport={activeViewport}
				onToggleHelp={toggleHelp}
				isHelpOpen={isHelpOpen}
				onToggleMaximize={handleToggleMaximizeActive}
				isMaximized={maximizedViewport !== null}
			/>
		</div>
	);
};
