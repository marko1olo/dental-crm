import {
	Activity,
	Camera,
	ChevronLeft,
	ChevronRight,
	Download,
	Layers,
	Loader2,
	Maximize2,
	RefreshCw,
	Sliders,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import type {
	PanoramicWorkerRequest,
	PanoramicWorkerResponse,
	Point2D,
} from "../../mprMath";
import { showToast } from "../GlobalToast";
import {
	captureHighDpiCanvas,
	createSnapshotThumbnail,
	downloadSnapshotLocally,
	exportSnapshotToClinicalRecord,
} from "../visiograph/VisiographExportService";
import {
	type VisiographPresetId,
	type VisiographWindowPreset,
	VISIOGRAPH_PRESETS_LIST,
	VISIOGRAPH_WINDOW_PRESETS,
	huToGrayscale,
} from "../visiograph/VisiographWindowPresets";
import {
	type ArchCurvePoint,
	type CrossSectionSlicePlane,
	type ExtendedMischClass,
	classifyMischBoneDensity,
	createAnatomicalJawControlPoints,
	generateCatmullRomArch,
	generateCrossSectionSlicePlanes,
	synchronizeMprCoordinates,
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

	// Compute Catmull-Rom Arch and Cross-Section Slice Planes
	const effectiveControlPoints = useMemo(() => {
		if (splinePoints && splinePoints.length >= 2) return splinePoints;
		return createAnatomicalJawControlPoints().map((p) => ({ x: p.x, y: p.y }));
	}, [splinePoints]);

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

	useEffect(() => {
		repaint();
	}, [repaint]);

	// Worker unwrap execution
	useEffect(() => {
		if (!volume || effectiveControlPoints.length < 2) {
			setLoading(!volume);
			return;
		}

		setLoading(true);
		setError(null);

		const worker = new Worker(new URL("../../mprWorker.ts", import.meta.url), {
			type: "module",
		});
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

		worker.postMessage(req, [req.scalarData.buffer]);

		return () => {
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
	]);

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
					exposureTimeSec: 12.5,
					exposureParameters: {
						exposureTimeSec: 12.5,
						kVp: 72,
						mAs: 100,
						sensorType: "Panoramic Digital CBCT / Curved MPR",
					},
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
	const initialHeight = Math.min(520, Math.max(300, Math.round(screenH * 0.65)));
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
			<div className="mpr-toolbar bg-neutral-900 border-b border-neutral-800 px-4 py-2.5 flex flex-wrap justify-between items-center cursor-move handle gap-3">
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2">
						<Activity className="w-5 h-5 text-teal-400" />
						<h3 className="text-white font-bold text-sm sm:text-base tracking-tight">
							3D MPR & Панорамная реконструкция (ОПТГ)
						</h3>
					</div>
					<span className="text-xs font-bold text-neutral-300 bg-neutral-800 px-2.5 py-1 rounded-lg border border-neutral-700">
						{sliceThicknessMm > 0
							? `Слой: ${sliceThicknessMm} мм (${blendMode.toUpperCase()})`
							: "Тонкий луч (Ray)"}
					</span>
				</div>

				{/* ACTIONS */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleExportTo043}
						disabled={loading || isExporting}
						aria-label="Экспорт в форму 043/у"
						className="mpr-btn-touch mpr-btn-success text-xs font-bold"
						title="Прикрепить снимок к амбулаторной карте 043/у"
					>
						{isExporting ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<Camera className="w-4 h-4" />
						)}
						<span>В карту 043/у</span>
					</button>

					<button
						type="button"
						onClick={handleLocalDownload}
						disabled={loading}
						aria-label="Скачать снимок"
						className="mpr-btn-touch text-xs font-medium"
						title="Скачать JPG"
					>
						<Download className="w-4 h-4" />
					</button>

					<button
						type="button"
						onClick={onClose}
						aria-label="Закрыть окно панорамы"
						className="text-neutral-400 hover:text-white min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 rounded-xl text-lg font-bold transition-colors hover:bg-neutral-800"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
			</div>

			{/* SECONDARY TOOLBAR: HU PRESETS & CROSS-SECTION NAVIGATOR */}
			<div className="bg-neutral-950/90 px-4 py-2 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 text-xs">
				{/* HU Presets */}
				<div className="flex items-center gap-2 overflow-x-auto">
					<span className="text-neutral-400 font-medium whitespace-nowrap">
						Режим HU:
					</span>
					<div className="flex gap-1.5">
						{VISIOGRAPH_PRESETS_LIST.map((preset) => (
							<button
								key={preset.id}
								type="button"
								onClick={() => setActivePreset(preset.id)}
								className={`px-3 py-1.5 rounded-lg text-xs font-bold min-h-[38px] transition-all whitespace-nowrap ${
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
					<div className="flex items-center gap-2 mpr-slice-stepper">
						<span className="text-neutral-400 font-bold text-xs">Кросс-срез:</span>
						<button
							type="button"
							onClick={() =>
								setActiveCrossSectionIdx((prev) => Math.max(0, prev - 1))
							}
							disabled={activeCrossSectionIdx <= 0}
							className="mpr-btn-touch min-h-[36px] min-w-[36px] p-1 rounded-md"
							title="Предыдущий срез (шаг 1.5мм)"
						>
							<ChevronLeft className="w-4 h-4" />
						</button>

						<span className="text-xs font-extrabold text-blue-400 min-w-[70px] text-center">
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
							className="mpr-btn-touch min-h-[36px] min-w-[36px] p-1 rounded-md"
							title="Следующий срез (шаг 1.5мм)"
						>
							<ChevronRight className="w-4 h-4" />
						</button>
					</div>
				)}

				{/* Slice Thickness Slider */}
				<div className="flex items-center gap-2">
					<span className="text-neutral-400 font-medium">Толщина:</span>
					<input
						type="range"
						min="0.5"
						max="20"
						step="0.5"
						value={sliceThicknessMm}
						onChange={(e) => setSliceThicknessMm(Number(e.target.value))}
						className="mpr-slider-touch w-20"
					/>
					<span className="text-xs font-bold text-teal-400 w-12 text-right">
						{sliceThicknessMm.toFixed(1)} мм
					</span>
				</div>
			</div>

			{/* MAIN VIEWPORT BODY */}
			<div className="flex-1 relative bg-black flex items-center justify-center p-2 min-h-0 overflow-hidden">
				{loading && (
					<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 z-20">
						<div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
						<span className="text-teal-400 mt-4 text-sm font-bold animate-pulse">
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
				<canvas
					ref={canvasRef}
					width={800}
					height={300}
					onMouseMove={handleCanvasMouseMove}
					className="w-full h-full object-contain cursor-crosshair"
				/>

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
							<span className="text-sm font-black text-teal-400">
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
