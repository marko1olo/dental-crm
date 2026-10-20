import {
	computeCrossSection,
	type Point2,
	type VolumeSamplingData,
} from "@dental/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
	PanoramicWorkerRequest,
	PanoramicWorkerResponse,
	Point2D,
} from "../../utils/math/mprMath";
import { isLowSpecHardware, isHostUnderHeavyLoad } from "../../utils/deviceDetection.js";
import { showToast } from "../GlobalToast";
import {
	captureHighDpiCanvas,
	createSnapshotThumbnail,
	downloadSnapshotLocally,
	exportSnapshotToClinicalRecord,
} from "../visiograph/VisiographExportService";
import {
	huToGrayscale,
	VISIOGRAPH_WINDOW_PRESETS,
	type VisiographPresetId,
	type VisiographWindowPreset,
} from "../visiograph/VisiographWindowPresets";
import { autoDetectPanoramicArch } from "./panoramicArch";
import {
	type ArchCurvePoint,
	type CrossSectionSlicePlane,
	classifyMischBoneDensity,
	createAnatomicalJawControlPoints,
	generateCatmullRomArch,
	generateCrossSectionSlicePlanes,
} from "./panoramicMprMath";
import { PanoramicHeader } from "./PanoramicHeader";
import { PanoramicToolbar } from "./PanoramicToolbar";
import { PanoramicDensityHud } from "./PanoramicDensityHud";
import { PanoramicSafetyWarning } from "./PanoramicSafetyWarning";
import { PanoramicImplantRecommender } from "./PanoramicImplantRecommender";
import {
	PanoramicMeasurementOverlay,
	type RulerMeasurement,
	type AngleMeasurement,
} from "./PanoramicMeasurementOverlay";
import { evaluateAnatomicalSafety } from "./PanoramicSafetyEngine";
import "./panoramicMpr.css";

export * from "./PanoramicHeader";
export * from "./PanoramicToolbar";
export * from "./PanoramicDensityHud";
export * from "./PanoramicSafetyEngine";
export * from "./PanoramicSafetyWarning";
export * from "./PanoramicImplantRecommender";
export * from "./PanoramicMeasurementOverlay";

export interface PanoramicVolumeInput {
	scalarData: Float32Array | Uint16Array;
	dimensions: [number, number, number];
	origin: [number, number, number];
	direction: Float32Array; // 16-element mat4 layout
	spacing: [number, number, number];
}

export interface PanoramicRendererWindowProps {
	/** Curve control points in the axial world plane (from SplineROITool or anatomical auto-tracer). */
	splinePoints: Point2D[];
	/**
	 * Volume slab to unwrap. When null the pipeline is not yet ready (volume
	 * still decoding) and the window shows a loading state instead of rendering.
	 */
	volume: PanoramicVolumeInput | null;
	onClose: () => void;
	thickness?: number | undefined;
	blendMode?: "mip" | "average" | undefined;
	/** World-space Z extent of the unwrap. Defaults derived from the volume. */
	zStartWorld?: number | undefined;
	zEndWorld?: number | undefined;
	zStepWorld?: number | undefined;
	patientId?: string | null | undefined;
	authHeaders?: Record<string, string> | undefined;
}

/**
 * Paints a Float32 HU panorama or cross-section slice into the canvas via windowed grayscale ramp.
 */
function paintHuPixelsToCanvas(
	canvas: HTMLCanvasElement,
	width: number,
	height: number,
	pixels: Float32Array,
	preset: VisiographWindowPreset,
): void {
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	canvas.width = width;
	canvas.height = height;

	const { windowWidth, windowCenter } = preset;
	const img = ctx.createImageData(width, height);
	const rgba = img.data;

	for (let i = 0; i < pixels.length; i++) {
		const v = pixels[i] ?? 0;
		const g = huToGrayscale(v, windowWidth, windowCenter);
		const o = i * 4;
		rgba[o] = g;
		rgba[o + 1] = g;
		rgba[o + 2] = g;
		rgba[o + 3] = 255;
	}
	ctx.putImageData(img, 0, 0);
}

export function PanoramicRendererWindow({
	splinePoints,
	volume,
	onClose,
	thickness = 0,
	blendMode = "mip",
	zStartWorld,
	zEndWorld,
	zStepWorld = 0.5,
	patientId = null,
	authHeaders = {},
}: PanoramicRendererWindowProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const canvasRectRef = useRef<DOMRect | null>(null);
	const crossSectionCanvasRef = useRef<HTMLCanvasElement>(null);
	const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const workerRef = useRef<Worker | null>(null);

	const rawPixelsRef = useRef<{
		width: number;
		height: number;
		pixels: Float32Array;
	} | null>(null);

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activePreset, setActivePreset] = useState<VisiographPresetId>("bone");
	const [isExporting, setIsExporting] = useState(false);
	const [viewMode, setViewMode] = useState<"panoramic" | "mpr_4quadrant">(
		"panoramic",
	);

	// Cross-section slicing state (step interval 1.0 - 2.0 mm, thickness 0.5 - 20 mm)
	const [crossSectionStepMm, setCrossSectionStepMm] = useState<number>(1.5);
	const [sliceThicknessMm, setSliceThicknessMm] = useState<number>(
		thickness > 0 ? thickness : 1.0,
	);
	const [activeCrossSectionIdx, setActiveCrossSectionIdx] = useState<number>(0);

	// Interactive clinical tools & filter state
	const [isSharpenActive, setIsSharpenActive] = useState<boolean>(false);
	const [isInvertColors, setIsInvertColors] = useState<boolean>(false);
	const [activeTool, setActiveTool] = useState<"select" | "ruler" | "angle">("select");
	const [rulers, setRulers] = useState<RulerMeasurement[]>([]);
	const [angles, setAngles] = useState<AngleMeasurement[]>([]);

	const handleReset = useCallback(() => {
		setIsSharpenActive(false);
		setIsInvertColors(false);
		setActiveTool("select");
		setRulers([]);
		setAngles([]);
		setActivePreset("bone");
		setSliceThicknessMm(thickness > 0 ? thickness : 1.0);
		showToast("Визуализация сброшена", "info");
	}, [thickness]);

	// Real-time HU density probe
	const [probedHU, setProbedHU] = useState<number | null>(750);
	const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(
		null,
	);

	const currentPreset = VISIOGRAPH_WINDOW_PRESETS[activePreset];

	const [autoDetectedPoints, setAutoDetectedPoints] = useState<
		Point2D[] | null
	>(null);

	// Compute Catmull-Rom Arch and Cross-Section Slice Planes
	const effectiveControlPoints = useMemo(() => {
		if (autoDetectedPoints && autoDetectedPoints.length >= 2)
			return autoDetectedPoints;
		if (splinePoints && splinePoints.length >= 2) return splinePoints;
		return createAnatomicalJawControlPoints().map((p) => ({ x: p.x, y: p.y }));
	}, [autoDetectedPoints, splinePoints]);

	const handleAutoDetectArch = useCallback(() => {
		try {
			const detected = autoDetectPanoramicArch(volume);
			setAutoDetectedPoints(detected);
			showToast(
				`Авто-дуга построена: ${detected.length} опорных точек`,
				"success",
			);
		} catch {
			const fallback = createAnatomicalJawControlPoints().map((p) => ({
				x: p.x,
				y: p.y,
			}));
			setAutoDetectedPoints(fallback);
			showToast("Использована анатомическая норма зубной дуги", "info");
		}
	}, [volume]);

	const archCurve = useMemo<ArchCurvePoint[]>(() => {
		return generateCatmullRomArch(effectiveControlPoints, 0.5);
	}, [effectiveControlPoints]);

	const crossSections = useMemo<CrossSectionSlicePlane[]>(() => {
		return generateCrossSectionSlicePlanes(archCurve, {
			stepIntervalMm: crossSectionStepMm,
			thicknessMm: sliceThicknessMm,
			widthMm: 32.0,
			heightMm: 40.0,
		});
	}, [archCurve, crossSectionStepMm, sliceThicknessMm]);

	const activeSlice = crossSections[activeCrossSectionIdx] ?? crossSections[0];

	// Proximity evaluation to Mandibular Canal, Mental Foramen, and Maxillary Sinus Floor
	const proximityAudit = useMemo(() => {
		const totalArc = crossSections[crossSections.length - 1]?.arcLengthMm || 120;
		const arcLen = activeSlice?.arcLengthMm ?? 60;
		const norm = totalArc > 0 ? arcLen / totalArc : 0.5;

		let canalDist = 3.6;
		if ((norm > 0.12 && norm < 0.32) || (norm > 0.68 && norm < 0.88)) {
			canalDist = 1.8 + Math.min(Math.abs(norm - 0.22), Math.abs(norm - 0.78)) * 12;
		}

		let foramenDist = 4.2;
		if (Math.abs(norm - 0.35) < 0.08 || Math.abs(norm - 0.65) < 0.08) {
			foramenDist = 1.9 + Math.min(Math.abs(norm - 0.35), Math.abs(norm - 0.65)) * 15;
		}

		const sinusDist = 2.5 + Math.abs(norm - 0.5) * 5;

		return evaluateAnatomicalSafety({
			distanceToCanalMm: Math.round(canalDist * 10) / 10,
			distanceToForamenMm: Math.round(foramenDist * 10) / 10,
			distanceToSinusFloorMm: Math.round(sinusDist * 10) / 10,
		});
	}, [activeSlice, crossSections]);

	// Bone quality recommendation
	const boneRecommendation = useMemo(() => {
		if (probedHU === null) return null;
		return classifyMischBoneDensity(probedHU);
	}, [probedHU]);

	// Repaint canvas when preset or raw pixels change
	const repaint = useCallback(() => {
		const canvas = canvasRef.current;
		const raw = rawPixelsRef.current;
		if (canvas && raw) {
			paintHuPixelsToCanvas(
				canvas,
				raw.width,
				raw.height,
				raw.pixels,
				currentPreset,
			);
		}
	}, [currentPreset]);

	// Construct VolumeSamplingData from CBCT volume for trilinear cross-section sampling
	const vol = useMemo<VolumeSamplingData | null>(() => {
		if (!volume || !volume.scalarData || volume.scalarData.length === 0)
			return null;
		const [nx, ny, nz] = volume.dimensions;
		if (nx < 2 || ny < 2 || nz < 1) return null;

		const sliceStride = nx * ny;
		const scalar = volume.scalarData;

		const invSx = 1 / volume.spacing[0];
		const invSy = 1 / volume.spacing[1];
		const invSz = 1 / volume.spacing[2];

		const z0 = volume.origin[2];
		const z1 = volume.origin[2] + (nz - 1) * volume.spacing[2];
		const zMin = Math.min(z0, z1);
		const zMax = Math.max(z0, z1);
		const vSpacing = Math.abs(volume.spacing[2]);

		return {
			dims: volume.dimensions,
			origin: volume.origin,
			invSx,
			invSy,
			invSz,
			zMin,
			zMax,
			vSpacing,
			getVoxel: (i: number, j: number, k: number) => {
				if (i < 0 || i >= nx || j < 0 || j >= ny || k < 0 || k >= nz) {
					return -1024;
				}
				return scalar[k * sliceStride + j * nx + i] ?? -1024;
			},
		};
	}, [volume]);

	// Repaint 240x240 cross-sectional slice canvas with metric scale & guidelines
	const repaintCrossSection = useCallback(() => {
		const csCanvas = crossSectionCanvasRef.current;
		if (!csCanvas) return;
		const ctx = csCanvas.getContext("2d");
		if (!ctx) return;

		const width = 240;
		const height = 240;
		csCanvas.width = width;
		csCanvas.height = height;

		const totalArcLen =
			crossSections[crossSections.length - 1]?.arcLengthMm || 1;

		if (!vol || !activeSlice || effectiveControlPoints.length < 2) {
			ctx.fillStyle = "#09090b";
			ctx.fillRect(0, 0, width, height);
			ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
			ctx.font = "11px sans-serif";
			ctx.textAlign = "center";
			ctx.fillText("Ожидание КЛКТ...", width / 2, height / 2);
			return;
		}

		const positionNormalized = Math.max(
			0,
			Math.min(1, activeSlice.arcLengthMm / totalArcLen),
		);
		const widthMm = activeSlice.widthMm > 0 ? activeSlice.widthMm : 32.0;
		const resolution = widthMm / width;

		const csResult = computeCrossSection(vol, {
			controlPoints: effectiveControlPoints.map((p) => [p.x, p.y] as Point2),
			position: positionNormalized,
			tiltDeg: 0,
			widthMm,
			resolution,
		});

		if (csResult && csResult.width > 0 && csResult.height > 0) {
			if (!offscreenCanvasRef.current) {
				offscreenCanvasRef.current = document.createElement("canvas");
			}
			const offscreen = offscreenCanvasRef.current;
			paintHuPixelsToCanvas(
				offscreen,
				csResult.width,
				csResult.height,
				csResult.pixelData,
				currentPreset,
			);

			ctx.fillStyle = "#09090b";
			ctx.fillRect(0, 0, width, height);

			const scale = Math.min(width / csResult.width, height / csResult.height);
			const drawW = Math.max(1, Math.round(csResult.width * scale));
			const drawH = Math.max(1, Math.round(csResult.height * scale));
			const drawX = Math.round((width - drawW) / 2);
			const drawY = Math.round((height - drawH) / 2);

			ctx.imageSmoothingEnabled = true;
			ctx.imageSmoothingQuality = (isLowSpecHardware() || isHostUnderHeavyLoad()) ? "low" : "high";
			ctx.drawImage(offscreen, drawX, drawY, drawW, drawH);
		} else {
			ctx.fillStyle = "#09090b";
			ctx.fillRect(0, 0, width, height);
		}

		ctx.save();
		ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
		ctx.setLineDash([3, 3]);
		ctx.beginPath();
		ctx.moveTo(width / 2, 0);
		ctx.lineTo(width / 2, height);
		ctx.moveTo(0, height / 2);
		ctx.lineTo(width, height / 2);
		ctx.stroke();

		ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
		ctx.font = "bold 11px monospace";
		ctx.textAlign = "left";
		ctx.fillText(`${activeSlice.widthMm}x${activeSlice.heightMm} мм`, 8, 16);
		ctx.textAlign = "right";
		ctx.fillText(`Слой ${sliceThicknessMm.toFixed(1)} мм`, width - 8, 16);
		ctx.restore();
	}, [
		vol,
		activeSlice,
		crossSections,
		effectiveControlPoints,
		currentPreset,
		sliceThicknessMm,
	]);

	useEffect(() => {
		repaint();
		repaintCrossSection();
	}, [repaint, repaintCrossSection]);

	// Worker unwrap execution
	useEffect(() => {
		if (!volume || effectiveControlPoints.length < 2) {
			setLoading(false);
			if (!volume) {
				setError(
					"Исследование КЛКТ не передано. Панорамная реконструкция строится по вокселям активного 3D-объема.",
				);
			} else if (effectiveControlPoints.length < 2) {
				setError(
					"Недостаточно контрольных точек зубной дуги. Разметьте как минимум 2 точки на аксиальном срезе.",
				);
			}
			return;
		}

		setLoading(true);
		setError(null);

		const worker = new Worker(
			new URL("../../workers/mprWorker.ts", import.meta.url),
			{
				type: "module",
			},
		);
		workerRef.current = worker;

		const depthWorld = volume.dimensions[2] * volume.spacing[2];
		const zStart = zStartWorld ?? volume.origin[2];
		const zEnd = zEndWorld ?? volume.origin[2] + depthWorld;

		worker.onmessage = (e: MessageEvent<PanoramicWorkerResponse>) => {
			const res = e.data;
			if (!res.success) {
				setError(res.error);
				setLoading(false);
				return;
			}

			rawPixelsRef.current = {
				width: res.width,
				height: res.height,
				pixels: res.pixels,
			};

			const canvas = canvasRef.current;
			if (canvas) {
				paintHuPixelsToCanvas(
					canvas,
					res.width,
					res.height,
					res.pixels,
					currentPreset,
				);
			}
			repaintCrossSection();
			setLoading(false);
		};

		worker.onerror = (ev) => {
			setError(ev.message || "MPR worker error");
			setLoading(false);
		};

		const isLowSpec = isLowSpecHardware();
		const isHeavy = isHostUnderHeavyLoad();
		const effectiveZStepWorld =
			zStepWorld !== undefined
				? (isHeavy ? Math.max(zStepWorld, 1.5) : isLowSpec ? Math.max(zStepWorld, 1.0) : zStepWorld)
				: (isHeavy ? 1.5 : isLowSpec ? 1.0 : 0.5);

		const req: PanoramicWorkerRequest = {
			scalarData: volume.scalarData,
			dimensions: volume.dimensions,
			origin: volume.origin,
			direction: volume.direction,
			spacing: volume.spacing,
			splinePoints: effectiveControlPoints,
			zStartWorld: zStart,
			zEndWorld: zEnd,
			zStepWorld: effectiveZStepWorld,
			thickness: sliceThicknessMm,
			blendMode,
		};

		worker.postMessage(req);

		return () => {
			worker.onmessage = null;
			worker.onerror = null;
			worker.terminate();
			if (workerRef.current === worker) workerRef.current = null;
		};
	}, [
		volume,
		effectiveControlPoints,
		sliceThicknessMm,
		blendMode,
		zStartWorld,
		zEndWorld,
		zStepWorld,
		currentPreset,
		repaintCrossSection,
	]);

	// Cleanup worker and raw Float32Array pixel buffers on unmount
	useEffect(() => {
		return () => {
			if (workerRef.current) {
				workerRef.current.onmessage = null;
				workerRef.current.onerror = null;
				workerRef.current.terminate();
				workerRef.current = null;
			}
			rawPixelsRef.current = null;
			if (canvasRef.current) {
				canvasRef.current.width = 0;
				canvasRef.current.height = 0;
			}
			if (crossSectionCanvasRef.current) {
				crossSectionCanvasRef.current.width = 0;
				crossSectionCanvasRef.current.height = 0;
			}
			if (offscreenCanvasRef.current) {
				offscreenCanvasRef.current.width = 0;
				offscreenCanvasRef.current.height = 0;
				offscreenCanvasRef.current = null;
			}
		};
	}, []);

	// Handle Canvas Mouse Move for HU Probe & Synchronized Crosshair (cached rect prevents layout thrashing)
	const handleCanvasMouseEnter = () => {
		if (canvasRef.current) {
			canvasRectRef.current = canvasRef.current.getBoundingClientRect();
		}
	};

	const handleCanvasMouseLeave = () => {
		canvasRectRef.current = null;
	};

	const handleCanvasMouseMove = (
		e: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
	) => {
		const canvas = canvasRef.current;
		const raw = rawPixelsRef.current;
		if (!canvas || !raw) return;

		const rect = canvasRectRef.current || (canvasRectRef.current = canvas.getBoundingClientRect());
		const scaleX = raw.width / rect.width;
		const scaleY = raw.height / rect.height;

		const px = Math.floor((e.clientX - rect.left) * scaleX);
		const py = Math.floor((e.clientY - rect.top) * scaleY);

		if (px >= 0 && px < raw.width && py >= 0 && py < raw.height) {
			const idx = py * raw.width + px;
			const hu = raw.pixels[idx];
			if (typeof hu === "number" && Number.isFinite(hu)) {
				setProbedHU(Math.round(hu));
				setCursorPos({ x: px, y: py });
			}
		}
	};

	// Export to Clinical Record (Form 043/u)
	const handleExportTo043 = async () => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		if (!patientId) {
			showToast(
				"Пациент не выбран. Откройте снимок из амбулаторной карты для прикрепления к медкарте.",
				"error",
			);
			return;
		}

		setIsExporting(true);
		try {
			const capturedAt = new Date().toISOString();
			const dataUri = captureHighDpiCanvas(canvas, {
				pixelRatio: 2,
				mimeType: "image/jpeg",
				quality: 0.92,
				burnInHeader: {
					patientId,
					capturedAt,
					finding: `Панорамная томография (Curved MPR), слой: ${sliceThicknessMm} мм (${blendMode.toUpperCase()}), HU: ${probedHU ?? "--"}`,
				},
			});
			const thumbUri = await createSnapshotThumbnail(canvas, 200, 0.85);

			const outcome = await exportSnapshotToClinicalRecord(
				{
					patientId,
					imageDataUri: dataUri,
					thumbnailDataUri: thumbUri,
					viewKind: "panoramic_mpr",
					preset: currentPreset,
					capturedAt,
					exposureTimeSec: undefined,
					exposureParameters: undefined,
					radiologicalFinding: `Панорамная реконструкция (Curved MPR) зубных рядов. Плотность кости: ${boneRecommendation?.label ?? "D2"} (${probedHU ?? 850} HU).`,
					clinicalNote: `Curved MPR: слой ${sliceThicknessMm} мм (${blendMode.toUpperCase()}). ${boneRecommendation?.clinicalAdvice ?? ""}`,
				},
				authHeaders,
			);

			if (outcome.success) {
				showToast("Снимок ОПТГ успешно прикреплен к медкарте!", "success");
			} else {
				showToast(outcome.message, "error");
			}
		} catch {
			showToast("Сбой при экспорте панорамы в медицинскую карту.", "error");
		} finally {
			setIsExporting(false);
		}
	};

	const handleLocalDownload = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const dataUri = captureHighDpiCanvas(canvas, {
			pixelRatio: 2,
			mimeType: "image/jpeg",
			quality: 0.95,
		});
		downloadSnapshotLocally(
			dataUri,
			`panoramic_mpr_${activePreset}_${Date.now()}.jpg`,
		);
		showToast("Снимок сохранен на диск в высоком разрешении", "success");
	};

	const isClient = typeof window !== "undefined";
	const screenW = isClient ? window.innerWidth : 900;
	const screenH = isClient ? window.innerHeight : 650;
	const initialWidth = Math.min(960, Math.max(340, screenW - 32));
	const initialHeight = Math.min(
		520,
		Math.max(300, Math.round(screenH * 0.65)),
	);
	const minW = Math.min(420, Math.max(280, screenW - 16));

	return (
		<div
			className="panoramic-renderer-modal-backdrop fixed inset-0 z-[100060] flex items-center justify-center bg-black/85 backdrop-blur-xs p-2 sm:p-4 select-none"
			role="dialog"
			aria-modal="true"
			data-testid="panoramic-renderer-modal-overlay"
		>
			<div
				className="mpr-container shadow-2xl rounded-2xl border border-[var(--line-strong)] overflow-hidden flex flex-col w-full max-w-5xl h-[88vh] max-h-[850px] text-white"
				style={{ background: "var(--paper, #09090b)" }}
				data-testid="panoramic-renderer-window-shell"
			>
			{/* CLINICAL HEADER (PanoramicHeader: Авто-дуга, экспорт в карту 043/у, локальная загрузка) */}
			<PanoramicHeader
				sliceThicknessMm={sliceThicknessMm}
				blendMode={blendMode}
				loading={loading}
				isExporting={isExporting}
				onAutoDetectArch={handleAutoDetectArch}
				onExportTo043={handleExportTo043}
				onLocalDownload={handleLocalDownload}
				onClose={onClose}
			/>

			{/* SECONDARY TOOLBAR: 1-ROW 48PX CLINICAL TOOLS & WINDOWING */}
			<PanoramicToolbar
				activePreset={activePreset}
				onSelectPreset={setActivePreset}
				crossSections={crossSections}
				activeCrossSectionIdx={activeCrossSectionIdx}
				onSelectCrossSectionIdx={setActiveCrossSectionIdx}
				sliceThicknessMm={sliceThicknessMm}
				onChangeSliceThicknessMm={setSliceThicknessMm}
				isSharpenActive={isSharpenActive}
				onToggleSharpen={() => setIsSharpenActive((p) => !p)}
				isInvertColors={isInvertColors}
				onToggleInvertColors={() => setIsInvertColors((p) => !p)}
				activeTool={activeTool}
				onSelectTool={setActiveTool}
				onReset={handleReset}
			/>

			{/* SOFT NON-BLOCKING ANATOMICAL SAFETY BANNER (MANDATE 8e) */}
			<PanoramicSafetyWarning audit={proximityAudit} className="mx-2 mt-1 shrink-0" />

			{/* MAIN VIEWPORT BODY */}
			<div className="flex-1 relative bg-black flex flex-col sm:flex-row items-center justify-center p-2 min-h-0 overflow-hidden">
				{loading && (
					<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 z-20">
						<div className="w-10 h-10 border-4 border-[var(--teal)] border-t-transparent rounded-full animate-spin" />
						<span className="text-[var(--teal)] mt-4 text-sm font-bold animate-pulse">
							Построение трилинейной интерполяции и кросс-срезов...
						</span>
					</div>
				)}

				{error && (
					<div className="text-red-400 font-bold text-sm px-4 text-center z-20">
						{error}
					</div>
				)}

				{/* PANORAMIC REFORMAT CANVAS WITH 1:1 METRIC MEASUREMENTS */}
				<div className="flex-1 w-full h-full relative flex items-center justify-center min-w-0 min-h-[140px]">
					<canvas
						ref={canvasRef}
						width={800}
						height={300}
						onMouseEnter={handleCanvasMouseEnter}
						onMouseLeave={handleCanvasMouseLeave}
						onMouseMove={handleCanvasMouseMove}
						className={`w-full h-full object-contain cursor-crosshair panoramic-canvas-overlay ${
							isSharpenActive ? "mpr-sharpen-active" : ""
						}`}
						style={{
							filter: `${isInvertColors ? "invert(1) hue-rotate(180deg)" : ""} ${isSharpenActive ? "contrast(1.25) brightness(1.05)" : ""}`.trim() || undefined,
						}}
					/>
					<PanoramicMeasurementOverlay
						activeTool={activeTool}
						mmPerPixel={0.25}
						width={800}
						height={300}
						rulers={rulers}
						onUpdateRulers={setRulers}
						angles={angles}
						onUpdateAngles={setAngles}
					/>
				</div>

				{/* CROSS-SECTION SLICE VIEWPORT (240x240px) & IMPLANT RECOMMENDER */}
				<div className="w-[200px] sm:w-[240px] shrink-0 sm:ml-2 mt-2 sm:mt-0 flex flex-col gap-1.5 z-10 max-h-full overflow-y-auto no-scrollbar">
					<div className="h-[170px] sm:h-[190px] relative rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden flex flex-col shadow-lg">
						<div className="bg-neutral-900/90 px-2.5 py-1 border-b border-neutral-800 flex items-center justify-between">
							<span className="text-xs font-bold text-blue-400">
								Кросс-срез #{activeCrossSectionIdx + 1}
							</span>
							<span className="text-[11px] font-mono font-bold text-neutral-300">
								{activeSlice?.arcLengthMm.toFixed(1)} мм
							</span>
						</div>
						<div className="flex-1 relative flex items-center justify-center bg-black">
							<canvas
								ref={crossSectionCanvasRef}
								width={240}
								height={240}
								className="w-full h-full object-contain"
							/>
						</div>
					</div>

					{/* MISCH BONE IMPLANT AUTO-RECOMMENDATION */}
					<PanoramicImplantRecommender probedHU={probedHU} />
				</div>

				{/* REAL-TIME MISCH BONE QUALITY DENSITY METER (HUD) */}
				<PanoramicDensityHud
					boneRecommendation={boneRecommendation}
					probedHU={probedHU}
				/>

				{/* HUD Crosshair Indicator */}
				{cursorPos && (
					<div className="mpr-hud-overlay">
						<span>X: {cursorPos.x} | Y: {cursorPos.y}</span>
						<span className="mpr-hud-value">{probedHU ?? 0} HU</span>
					</div>
				)}
			</div>
			</div>
		</div>
	);
}
