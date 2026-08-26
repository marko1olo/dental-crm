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
	createSyntheticDentalCbctVolume,
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
	mapCanvasPointerToWorldMmWithTransform,
	worldMmToVoxel,
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
} from "./dentalCurveEngine";
import { CbctViewportHud } from "./CbctViewportHud";
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
	const [transforms, setTransforms] = useState<Record<MprPlane, ViewportTransform>>({
		axial: DEFAULT_VIEWPORT_TRANSFORM,
		coronal: DEFAULT_VIEWPORT_TRANSFORM,
		sagittal: DEFAULT_VIEWPORT_TRANSFORM,
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
	const [selectedAnchorId, setSelectedAnchorId] = useState<string | null>(null);
	const [focalTroughThicknessMm, setFocalTroughThicknessMm] = useState<number>(12.0);
	const [panoramicResult, setPanoramicResult] = useState<PanoramicReconstructionResult | null>(null);
	const [crossSections, setCrossSections] = useState<CrossSectionSliceData[]>([]);
	const [selectedCrossSectionIndex, setSelectedCrossSectionIndex] = useState<number>(0);
	const [activeTab, setActiveTab] = useState<"mpr" | "panoramic" | "cross_sections">("mpr");

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
			const synth = createSyntheticDentalCbctVolume(160, 160, 100, 0.4);
			setVolume(synth);
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
	};

	// Apply Hounsfield Preset
	const handleSelectPreset = (preset: { id: string; windowWidth: number; windowLevel: number }) => {
		setActivePresetId(preset.id);
		setWindowWidth(preset.windowWidth);
		setWindowLevel(preset.windowLevel);
	};

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

				// Draw Dental Arch Spline (Purple #a855f7)
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

				// Draw Tooth Anchors
				for (const anchor of archCurve.anchors) {
					const v = worldMmToVoxel({ x: anchor.positionMm.x, y: anchor.positionMm.y, z: crosshairMm.z }, volume);
					const isSelected = selectedAnchorId === anchor.id;
					ctx.fillStyle = isSelected ? ROMEXIS_COLORS.crossSection : ROMEXIS_COLORS.panoramic;
					ctx.strokeStyle = "#ffffff";
					ctx.lineWidth = 1.2;
					ctx.beginPath();
					ctx.arc(v.x, v.y, isSelected ? 5.0 : 3.2, 0, Math.PI * 2);
					ctx.fill();
					ctx.stroke();
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
				});

				const zPx = h - 1 - vox.z;

				// Draw Oblique Crosshair with Rotation Handles
				drawObliqueCrosshairWithRotationHandles(ctx, {
					widthPx: w,
					heightPx: h,
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
				});

				const zPx = h - 1 - vox.z;

				// Draw Oblique Crosshair with Rotation Handles
				drawObliqueCrosshairWithRotationHandles(ctx, {
					widthPx: w,
					heightPx: h,
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
	}, [volume, crosshairMm, obliqueAngles, transforms, windowWidth, windowLevel, slabMode, slabThicknessMm, archCurve, selectedAnchorId, crossSections, selectedCrossSectionIndex, activeRotationHandle, hoveredHandle]);

	useEffect(() => {
		renderMprPlanes();
	}, [renderMprPlanes]);

	// Reset W/L & View (Zoom, Pan, Rotation, Maximization)
	const handleResetViewAndWL = () => {
		setActivePresetId("bone_dense");
		setWindowWidth(2000);
		setWindowLevel(400);
		setObliqueAngles(DEFAULT_OBLIQUE_ROTATION);
		setTransforms({
			axial: DEFAULT_VIEWPORT_TRANSFORM,
			coronal: DEFAULT_VIEWPORT_TRANSFORM,
			sagittal: DEFAULT_VIEWPORT_TRANSFORM,
		});
		setMaximizedViewport(null);
	};

	const getCanvasCursor = useCallback((plane: MprPlane) => {
		if (activeRotationHandle?.plane === plane) return "grabbing";
		if (hoveredHandle?.plane === plane) return "grab";
		if (isDraggingWL) return "ns-resize";
		if (isPanning?.plane === plane) return "move";
		return "crosshair";
	}, [activeRotationHandle, hoveredHandle, isDraggingWL, isPanning]);

	// ─── 6. INTERACTIVE MOUSE HANDLERS (W/L, ZOOM, PAN & ROTATION) ───────────
	const handlePointerDown = (plane: MprPlane, e: React.PointerEvent<HTMLCanvasElement>) => {
		e.currentTarget.setPointerCapture(e.pointerId);
		const canvas = e.currentTarget;
		const rect = canvas.getBoundingClientRect();
		const clientX = e.clientX;
		const clientY = e.clientY;
		const pointerPx = {
			x: ((clientX - rect.left) / rect.width) * canvas.width,
			y: ((clientY - rect.top) / rect.height) * canvas.height,
		};

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

		// 3. Left Click -> Check rotation handle hit vs Crosshair translation
		if (e.button === 0) {
			if (!volume) return;
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
				setActiveRotationHandle({ plane, handle: hitHandle.position, centerPx });
			} else {
				setActiveDraggingPlane(plane);
				const newCrosshair = mapCanvasPointerToWorldMmWithTransform(
					pointerPx,
					{ width: canvas.width, height: canvas.height },
					plane,
					crosshairMm,
					obliqueAngles,
					transform,
					volume,
				);
				setCrosshairMm(newCrosshair);
			}
		}
	};

	const handlePointerMove = (plane: MprPlane, e: React.PointerEvent<HTMLCanvasElement>) => {
		const canvas = e.currentTarget;
		const rect = canvas.getBoundingClientRect();
		const clientX = e.clientX;
		const clientY = e.clientY;
		const pointerPx = {
			x: ((clientX - rect.left) / rect.width) * canvas.width,
			y: ((clientY - rect.top) / rect.height) * canvas.height,
		};

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
			const deltaX = (clientX - isPanning.startX) * (canvas.width / rect.width);
			const deltaY = (clientY - isPanning.startY) * (canvas.height / rect.height);
			setTransforms((prev) => ({
				...prev,
				[plane]: {
					...prev[plane],
					panX: Number((isPanning.startPanX + deltaX).toFixed(1)),
					panY: Number((isPanning.startPanY + deltaY).toFixed(1)),
				},
			}));
			return;
		}

		// 3. Rotation Handle Drag -> Oblique Axis Rotation
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

		// 4. Crosshair Drag -> Center Slicing Position
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

		// 5. Hover Detection for Rotation Handles (Cursor change)
		if (!isDraggingWL && !isPanning && !activeRotationHandle && !activeDraggingPlane && volume) {
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
		setIsDraggingWL(null);
		setIsPanning(null);
		setActiveRotationHandle(null);
		setActiveDraggingPlane(null);
	};

	// Mouse Wheel -> Cursor-anchored Smooth Zoom (0.5x - 5.0x)
	const handleWheelZoom = (plane: MprPlane, e: React.WheelEvent<HTMLCanvasElement>) => {
		e.preventDefault();
		const canvas = e.currentTarget;
		const rect = canvas.getBoundingClientRect();
		const cursorPx = {
			x: ((e.clientX - rect.left) / rect.width) * canvas.width,
			y: ((e.clientY - rect.top) / rect.height) * canvas.height,
		};

		setTransforms((prev) => ({
			...prev,
			[plane]: applyCursorZoom(prev[plane], cursorPx, e.deltaY, 0.5, 5.0),
		}));
	};

	const handleWheelScroll = handleWheelZoom;

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

				// Draw Calibrated Millimeter Rulers on Panorama
				drawCalibratedMillimeterRulers(ctx, {
					widthPx: canvas.width,
					heightPx: canvas.height,
					pixelSpacingMmX: volume?.spacingMm.x ?? 0.4,
					pixelSpacingMmY: volume?.spacingMm.z ?? 0.4,
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
				{/* Right: Controls & Close */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleResetViewAndWL}
						className="flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold hover:bg-slate-700 hover:text-white transition-all shadow-sm"
						title="Сбросить Window/Level, Зум, Панорамирование и Углы поворота"
						data-testid="cbct-reset-view-wl-btn"
					>
						<RotateCcw className="w-4 h-4 text-sky-400" />
						<span>Сброс W/L & Зума</span>
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
				</div>
			</div>

			{/* ── MAIN WORKSPACE CONTENT ── */}
			<main className="flex-1 min-h-0 relative bg-black flex overflow-hidden">
				{/* 1. 3-PLANE MPR VIEW */}
				{activeTab === "mpr" && (
					<div className="flex-1 flex min-h-0 overflow-hidden p-2 bg-slate-950">
						{/* Axial Plane */}
						{(!maximizedViewport || maximizedViewport === "axial") && (
							<div
								onDoubleClick={() => handleToggleMaximize("axial")}
								onContextMenu={(e) => e.preventDefault()}
								className={`flex flex-col rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden relative shadow-lg ${
									maximizedViewport === "axial" ? "flex-1 w-full h-full" : "flex-1 min-w-0"
								}`}
								data-testid="cbct-viewport-container-axial"
							>
								<div className="flex-1 flex items-center justify-center relative p-1 bg-black min-h-0 overflow-hidden">
									<canvas
										ref={axialCanvasRef}
										onContextMenu={(e) => e.preventDefault()}
										onPointerDown={(e) => handlePointerDown("axial", e)}
										onPointerMove={(e) => handlePointerMove("axial", e)}
										onPointerUp={handlePointerUp}
										onWheel={(e) => handleWheelZoom("axial", e)}
										style={{ cursor: getCanvasCursor("axial") }}
										className="max-h-full max-w-full object-contain rounded-lg"
									/>
									<CbctViewportHud
										viewportType="axial"
										coordinateMm={{ z: crosshairMm.z }}
										slabMode={slabMode}
										slabThicknessMm={slabThicknessMm}
										pixelSpacingMm={volume?.spacingMm.x ?? 0.4}
										obliqueAngleDeg={obliqueAngles.axialAngleDeg}
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
								className={`flex flex-col rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden relative shadow-lg ${
									maximizedViewport === "coronal" ? "flex-1 w-full h-full" : "flex-1 min-w-0 ml-2"
								}`}
								data-testid="cbct-viewport-container-coronal"
							>
								<div className="flex-1 flex items-center justify-center relative p-1 bg-black min-h-0 overflow-hidden">
									<canvas
										ref={coronalCanvasRef}
										onContextMenu={(e) => e.preventDefault()}
										onPointerDown={(e) => handlePointerDown("coronal", e)}
										onPointerMove={(e) => handlePointerMove("coronal", e)}
										onPointerUp={handlePointerUp}
										onWheel={(e) => handleWheelZoom("coronal", e)}
										style={{ cursor: getCanvasCursor("coronal") }}
										className="max-h-full max-w-full object-contain rounded-lg"
									/>
									<CbctViewportHud
										viewportType="coronal"
										coordinateMm={{ y: crosshairMm.y }}
										slabMode={slabMode}
										slabThicknessMm={slabThicknessMm}
										pixelSpacingMm={volume?.spacingMm.x ?? 0.4}
										obliqueAngleDeg={obliqueAngles.coronalTiltDeg}
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
								className={`flex flex-col rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden relative shadow-lg ${
									maximizedViewport === "sagittal" ? "flex-1 w-full h-full" : "flex-1 min-w-0 ml-2"
								}`}
								data-testid="cbct-viewport-container-sagittal"
							>
								<div className="flex-1 flex items-center justify-center relative p-1 bg-black min-h-0 overflow-hidden">
									<canvas
										ref={sagittalCanvasRef}
										onContextMenu={(e) => e.preventDefault()}
										onPointerDown={(e) => handlePointerDown("sagittal", e)}
										onPointerMove={(e) => handlePointerMove("sagittal", e)}
										onPointerUp={handlePointerUp}
										onWheel={(e) => handleWheelZoom("sagittal", e)}
										style={{ cursor: getCanvasCursor("sagittal") }}
										className="max-h-full max-w-full object-contain rounded-lg"
									/>
									<CbctViewportHud
										viewportType="sagittal"
										coordinateMm={{ x: crosshairMm.x }}
										slabMode={slabMode}
										slabThicknessMm={slabThicknessMm}
										pixelSpacingMm={volume?.spacingMm.y ?? 0.4}
										obliqueAngleDeg={obliqueAngles.sagittalTiltDeg}
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
							className="flex-1 flex items-center justify-center bg-black rounded-2xl border border-slate-800 p-2 min-h-[300px] overflow-hidden relative"
							data-testid="cbct-viewport-container-panoramic"
						>
							{panoramicResult ? (
								<>
									<canvas
										ref={panoCanvasRef}
										className="max-h-full max-w-full object-contain rounded-lg shadow-2xl cursor-pointer"
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
								className="flex-1 flex items-center justify-center bg-black rounded-2xl border border-slate-800 p-2 min-h-0 overflow-hidden relative"
								data-testid="cbct-viewport-container-cross-section"
							>
								{activeCrossSection ? (
									<>
										<canvas
											ref={crossSectionCanvasRef}
											className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
										/>
										<CbctViewportHud
											viewportType="cross_section"
											toothFdi={activeCrossSection.nearestToothFdi}
											sliceIndex={selectedCrossSectionIndex}
											totalSlices={crossSections.length}
											pixelSpacingMm={activeCrossSection.pixelSpacingMm}
											isMaximized={maximizedViewport === "cross_section"}
											onToggleMaximize={() => handleToggleMaximize("cross_section")}
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
		</div>
	);
};
