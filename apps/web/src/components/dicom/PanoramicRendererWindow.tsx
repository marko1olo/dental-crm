import {
	computeCrossSection,
	type Point2,
	type VolumeSamplingData,
} from "@dental/shared";
import {
	Activity,
	Camera,
	ChevronLeft,
	ChevronRight,
	Download,
	Loader2,
	Sparkles,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import type {
	PanoramicWorkerRequest,
	PanoramicWorkerResponse,
	Point2D,
} from "../../utils/math/mprMath";
import { showToast } from "../GlobalToast";
import {
	captureHighDpiCanvas,
	createSnapshotThumbnail,
	downloadSnapshotLocally,
	exportSnapshotToClinicalRecord,
} from "../visiograph/VisiographExportService";
import {
	huToGrayscale,
	VISIOGRAPH_PRESETS_LIST,
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
import "./panoramicMpr.css";

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
	thickness?: number;
	blendMode?: "mip" | "average";
	/** World-space Z extent of the unwrap. Defaults derived from the volume. */
	zStartWorld?: number;
	zEndWorld?: number;
	zStepWorld?: number;
	patientId?: string | null;
	authHeaders?: Record<string, string>;
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

			ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
			ctx.lineWidth = 1;
			for (let x = 0; x <= width; x += 40) {
				ctx.beginPath();
				ctx.moveTo(x, 0);
				ctx.lineTo(x, height);
				ctx.stroke();
			}
			for (let y = 0; y <= height; y += 40) {
				ctx.beginPath();
				ctx.moveTo(0, y);
				ctx.lineTo(width, y);
				ctx.stroke();
			}

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

		const req: PanoramicWorkerRequest = {
			scalarData: volume.scalarData,
			dimensions: volume.dimensions,
			origin: volume.origin,
			direction: volume.direction,
			spacing: volume.spacing,
			splinePoints: effectiveControlPoints,
			zStartWorld: zStart,
			zEndWorld: zEnd,
			zStepWorld,
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
				const ctx = canvasRef.current.getContext("2d");
				if (ctx)
					ctx.clearRect(
						0,
						0,
						canvasRef.current.width,
						canvasRef.current.height,
					);
				// Освобождаем GPU backing store холста панорамы
				canvasRef.current.width = 0;
				canvasRef.current.height = 0;
			}
			if (crossSectionCanvasRef.current) {
				const ctx = crossSectionCanvasRef.current.getContext("2d");
				if (ctx)
					ctx.clearRect(
						0,
						0,
						crossSectionCanvasRef.current.width,
						crossSectionCanvasRef.current.height,
					);
				// Освобождаем GPU backing store холста кросс-секции
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

	// Handle Canvas Mouse Move for HU Probe & Synchronized Crosshair
	const handleCanvasMouseMove = (
		e: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
	) => {
		const canvas = canvasRef.current;
		const raw = rawPixelsRef.current;
		if (!canvas || !raw) return;

		const rect = canvas.getBoundingClientRect();
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
				"Пациент не выбран. Откройте снимок из амбулаторной карты для прикрепления к Форме 043/у.",
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
				showToast("Снимок ОПТГ успешно прикреплен к карте 043/у!", "success");
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
		<Rnd
			default={{
				x: Math.max(8, Math.round((screenW - initialWidth) / 2)),
				y: Math.max(40, Math.round((screenH - initialHeight) / 2)),
				width: initialWidth,
				height: initialHeight,
			}}
			minWidth={minW}
			minHeight={260}
			bounds="window"
			className="mpr-container shadow-2xl rounded-2xl border border-[var(--line-strong)] overflow-hidden flex flex-col z-50 text-white"
			style={{ background: "var(--paper, #09090b)" }}
		>
			{/* CLINICAL HEADER */}
			<div className="mpr-toolbar bg-neutral-900 border-b border-neutral-800 px-3 py-1.5 flex flex-nowrap justify-between items-center cursor-move handle gap-2 overflow-x-auto no-scrollbar min-h-[36px]">
				<div className="flex items-center gap-2 shrink-0 min-w-0">
					<div className="flex items-center gap-1.5 min-w-0">
						<Activity className="w-4 h-4 text-[var(--teal)] shrink-0" />
						<h3 className="text-white font-bold text-xs sm:text-sm tracking-tight truncate max-w-[180px] sm:max-w-none min-w-0">
							3D MPR & ОПТГ
						</h3>
					</div>
					<span className="text-[11px] font-bold text-neutral-300 bg-neutral-800 px-2 py-0.5 rounded-lg border border-neutral-700 whitespace-nowrap hidden sm:inline-flex shrink-0">
						{sliceThicknessMm > 0
							? `Слой: ${sliceThicknessMm} мм (${blendMode.toUpperCase()})`
							: "Тонкий луч (Ray)"}
					</span>
				</div>

				{/* ACTIONS */}
				<div className="flex items-center gap-1.5 shrink-0">
					<button
						type="button"
						onClick={handleAutoDetectArch}
						disabled={loading}
						aria-label="Автоматическое определение зубной дуги"
						className="mpr-btn-touch text-xs font-bold bg-indigo-600/80 hover:bg-indigo-600 text-white px-2.5 py-1 rounded-lg border border-indigo-500/50 flex items-center gap-1 transition-all shadow-sm active:scale-95 whitespace-nowrap min-h-[32px]"
						title="Автоматическое определение зубной дуги по MIP срезу КЛКТ"
					>
						<Sparkles className="w-3.5 h-3.5 text-amber-300" />
						<span className="hidden sm:inline">Авто-дуга</span>
					</button>

					<button
						type="button"
						onClick={handleExportTo043}
						disabled={loading || isExporting}
						aria-label="Экспорт в форму 043/у"
						className="mpr-btn-touch mpr-btn-success text-xs font-bold px-2.5 py-1 whitespace-nowrap min-h-[32px] flex items-center gap-1"
						title="Прикрепить снимок к амбулаторной карте 043/у"
					>
						{isExporting ? (
							<Loader2 className="w-3.5 h-3.5 animate-spin" />
						) : (
							<Camera className="w-3.5 h-3.5" />
						)}
						<span className="hidden sm:inline">В карту 043/у</span>
					</button>

					<button
						type="button"
						onClick={handleLocalDownload}
						disabled={loading}
						aria-label="Скачать снимок"
						className="mpr-btn-touch text-xs font-medium px-2 py-1 min-h-[32px] min-w-[32px]"
						title="Скачать JPG"
					>
						<Download className="w-3.5 h-3.5" />
					</button>

					<button
						type="button"
						onClick={onClose}
						data-testid="panoramic-close-btn"
						aria-label="Закрыть окно панорамы"
						className="text-neutral-400 hover:text-white min-h-[32px] min-w-[32px] inline-flex items-center justify-center p-1 rounded-lg text-base font-bold transition-colors hover:bg-neutral-800"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			</div>

			{/* SECONDARY TOOLBAR: HU PRESETS & CROSS-SECTION NAVIGATOR */}
			<div className="bg-neutral-950/90 px-3 py-1.5 flex flex-nowrap items-center justify-between gap-2 border-b border-neutral-800 text-xs overflow-x-auto no-scrollbar min-h-[36px]">
				{/* HU Presets */}
				<div className="flex items-center gap-1.5 shrink-0 overflow-x-auto">
					<span className="text-neutral-400 font-medium whitespace-nowrap text-[11px]">
						HU:
					</span>
					<div className="flex gap-1">
						{VISIOGRAPH_PRESETS_LIST.map((preset) => (
							<button
								key={preset.id}
								type="button"
								onClick={() => setActivePreset(preset.id)}
								className={`px-2.5 py-1 rounded-lg text-[11px] font-bold min-h-[30px] transition-all whitespace-nowrap ${
									activePreset === preset.id
										? "bg-blue-600 text-white shadow-md"
										: "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
								}`}
								title={preset.description}
							>
								{preset.shortLabel}
							</button>
						))}
					</div>
				</div>

				{/* Cross-Section Stepper (Step 1.0 - 2.0 mm) */}
				{crossSections.length > 0 && (
					<div className="flex items-center gap-1.5 shrink-0 mpr-slice-stepper">
						<span className="text-neutral-400 font-bold text-[11px] hidden sm:inline">
							Кросс-срез:
						</span>
						<button
							type="button"
							onClick={() =>
								setActiveCrossSectionIdx((prev) => Math.max(0, prev - 1))
							}
							disabled={activeCrossSectionIdx <= 0}
							className="mpr-btn-touch min-h-[30px] min-w-[30px] p-1 rounded-md"
							title="Предыдущий срез (шаг 1.5мм)"
						>
							<ChevronLeft className="w-3.5 h-3.5" />
						</button>

						<span className="text-[11px] font-extrabold text-blue-400 min-w-[65px] text-center">
							#{activeCrossSectionIdx + 1} / {crossSections.length} (
							{activeSlice?.arcLengthMm.toFixed(1)} мм)
						</span>

						<button
							type="button"
							onClick={() =>
								setActiveCrossSectionIdx((prev) =>
									Math.min(crossSections.length - 1, prev + 1),
								)
							}
							disabled={activeCrossSectionIdx >= crossSections.length - 1}
							className="mpr-btn-touch min-h-[30px] min-w-[30px] p-1 rounded-md"
							title="Следующий срез (шаг 1.5мм)"
						>
							<ChevronRight className="w-3.5 h-3.5" />
						</button>
					</div>
				)}

				{/* Slice Thickness Slider */}
				<div className="flex items-center gap-1.5 shrink-0">
					<span className="text-neutral-400 font-medium text-[11px] hidden sm:inline">
						Толщина:
					</span>
					<input
						type="range"
						min="0.5"
						max="20"
						step="0.5"
						value={sliceThicknessMm}
						onChange={(e) => setSliceThicknessMm(Number(e.target.value))}
						className="mpr-slider-touch w-16 sm:w-20"
					/>
					<span className="text-[11px] font-bold text-[var(--teal)] w-10 text-right">
						{sliceThicknessMm.toFixed(1)} мм
					</span>
				</div>
			</div>

			{/* MAIN VIEWPORT BODY */}
			<div className="flex-1 relative bg-black flex flex-col sm:flex-row items-center justify-center p-2 min-h-0 overflow-hidden">
				{loading && (
					<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 z-20">
						<div className="w-10 h-10 border-4 border-[var(--teal)] border-t-transparent rounded-full animate-spin"></div>
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

				{/* PANORAMIC REFORMAT CANVAS */}
				<div className="flex-1 w-full h-full relative flex items-center justify-center min-w-0 min-h-[140px]">
					<canvas
						ref={canvasRef}
						width={800}
						height={300}
						onMouseMove={handleCanvasMouseMove}
						className="w-full h-full object-contain cursor-crosshair"
					/>
				</div>

				{/* CROSS-SECTION SLICE VIEWPORT (240x240px) */}
				<div className="w-[200px] h-[200px] sm:w-[240px] sm:h-[240px] shrink-0 sm:ml-2 mt-2 sm:mt-0 relative rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden flex flex-col shadow-lg z-10">
					<div className="bg-neutral-900/90 px-2.5 py-1 border-b border-neutral-800 flex items-center justify-between">
						<span className="text-xs font-bold text-blue-400 flex items-center gap-1">
							<span>Кросс-срез #{activeCrossSectionIdx + 1}</span>
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

				{/* REAL-TIME MISCH BONE QUALITY DENSITY METER (HUD) */}
				{boneRecommendation && (
					<div className="mpr-density-hud">
						<div className="flex items-center justify-between gap-2">
							<div className="flex items-center gap-2">
								<span
									className={`mpr-density-badge ${
										boneRecommendation.mischClass === "D1"
											? "mpr-badge-d1"
											: boneRecommendation.mischClass === "D2"
												? "mpr-badge-d2"
												: boneRecommendation.mischClass === "D3"
													? "mpr-badge-d3"
													: boneRecommendation.mischClass === "D4"
														? "mpr-badge-d4"
														: "mpr-badge-d5"
									}`}
								>
									{boneRecommendation.mischClass}
								</span>
								<span className="text-xs font-bold text-white">
									{boneRecommendation.label}
								</span>
							</div>
							<span className="text-sm font-black text-[var(--teal)]">
								{probedHU} HU
							</span>
						</div>

						<p className="text-[12px] text-neutral-300 leading-snug">
							{boneRecommendation.clinicalAdvice}
						</p>

						<div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 border-t border-neutral-800 pt-1.5">
							<span>Обороты: {boneRecommendation.drillingRpm}</span>
							<span>Торк: {boneRecommendation.torqueNcm}</span>
							{boneRecommendation.corticalTap && (
								<span className="text-red-400">МЕТЧИК ОБЯЗАТЕЛЕН</span>
							)}
							{boneRecommendation.underDrilling && (
								<span className="text-amber-400">НЕДОПРЕПАРИРОВАНИЕ</span>
							)}
						</div>
					</div>
				)}

				{/* HUD Crosshair Indicator */}
				{cursorPos && (
					<div className="mpr-hud-overlay">
						<span>
							X: {cursorPos.x} | Y: {cursorPos.y}
						</span>
						<span className="mpr-hud-value">{probedHU ?? 0} HU</span>
					</div>
				)}
			</div>
		</Rnd>
	);
}
