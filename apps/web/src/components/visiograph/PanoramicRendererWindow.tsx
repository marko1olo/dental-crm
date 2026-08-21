import { Camera, Download, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
} from "./VisiographExportService";
import {
	type VisiographPresetId,
	type VisiographWindowPreset,
	VISIOGRAPH_PRESETS_LIST,
	VISIOGRAPH_WINDOW_PRESETS,
	huToGrayscale,
} from "./VisiographWindowPresets";

/**
 * Volume slab extracted from the cornerstone cache on the UI thread and handed
 * to the MPR worker. `scalarData` is a caller-owned copy (see
 * `toTransferableScalarData`) whose buffer is transferred to the worker.
 */
export interface PanoramicVolumeInput {
	scalarData: Float32Array | Uint16Array;
	dimensions: [number, number, number];
	origin: [number, number, number];
	direction: Float32Array; // 16-element mat4 layout
	spacing: [number, number, number];
}

export interface PanoramicRendererWindowProps {
	/** Curve control points in the axial world plane (from SplineROITool). */
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
 * Paints a Float32 HU panorama into the canvas via a windowed grayscale ramp.
 * Kept out of the worker so the worker returns raw HU (transferable Float32)
 * and window/level can change in real-time without recomputing the 3D MPR raycast.
 */
function paintPanoramaWithPreset(
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

	const currentPreset = VISIOGRAPH_WINDOW_PRESETS[activePreset];

	// Repaint canvas whenever preset changes without recomputing raycast
	const repaint = useCallback(() => {
		const canvas = canvasRef.current;
		const raw = rawPixelsRef.current;
		if (canvas && raw) {
			paintPanoramaWithPreset(
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

	useEffect(() => {
		// Nothing to render until the volume slab is available.
		if (!volume || splinePoints.length < 2) {
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
				paintPanoramaWithPreset(
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
			setError(ev.message || "MPR worker crashed");
			setLoading(false);
		};

		const req: PanoramicWorkerRequest = {
			scalarData: volume.scalarData,
			dimensions: volume.dimensions,
			origin: volume.origin,
			direction: volume.direction,
			spacing: volume.spacing,
			splinePoints,
			zStartWorld: zStart,
			zEndWorld: zEnd,
			zStepWorld,
			thickness,
			blendMode,
		};

		// Transfer the scalar buffer (zero-copy)
		worker.postMessage(req, [req.scalarData.buffer]);

		return () => {
			worker.terminate();
			if (workerRef.current === worker) workerRef.current = null;
		};
	}, [
		volume,
		splinePoints,
		thickness,
		blendMode,
		zStartWorld,
		zEndWorld,
		zStepWorld,
		currentPreset,
	]);

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
					finding: `Панорамная томография (Curved MPR), слой: ${thickness} мм (${blendMode.toUpperCase()})`,
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
						sensorType: "Panoramic Digital CCD/CMOS",
					},
					radiologicalFinding:
						"Панорамная томографическая реконструкция (Curved MPR) зубных рядов и челюстных костей.",
					clinicalNote: `Панорамная реконструкция (Curved MPR). Толщина слоя: ${thickness} мм, режим объединения: ${blendMode.toUpperCase()}.`,
				},
				authHeaders,
			);

			if (outcome.success) {
				showToast("Снимок ОПТГ успешно прикреплен к карте 043/у!", "success");
			} else {
				showToast(outcome.message, "error");
			}
		} catch (err) {
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
	const screenW = isClient ? window.innerWidth : 800;
	const screenH = isClient ? window.innerHeight : 600;
	const initialWidth = Math.min(880, Math.max(320, screenW - 32));
	const initialHeight = Math.min(380, Math.max(240, Math.round(screenH * 0.5)));
	const minW = Math.min(420, Math.max(280, screenW - 16));

	return (
		<Rnd
			default={{
				x: Math.max(8, Math.round((screenW - initialWidth) / 2)),
				y: Math.max(50, Math.round((screenH - initialHeight) / 2)),
				width: initialWidth,
				height: initialHeight,
			}}
			minWidth={minW}
			minHeight={200}
			bounds="window"
			className="bg-neutral-900 border border-neutral-700 shadow-2xl rounded-xl overflow-hidden flex flex-col z-50 text-white"
		>
			{/* HEADER */}
			<div className="bg-neutral-800 px-3 py-2 flex flex-wrap justify-between items-center cursor-move handle border-b border-neutral-700 gap-2">
				<div className="flex items-center gap-2">
					<h3 className="text-white font-medium text-sm">
						Панорамная реконструкция (Curved MPR)
					</h3>
					<span className="text-xs text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-700">
						{thickness > 0 ? `Слой: ${thickness} мм (${blendMode.toUpperCase()})` : "Тонкий срез (Ray)"}
					</span>
				</div>

				<div className="flex items-center gap-1.5">
					<button
						type="button"
						onClick={handleExportTo043}
						disabled={loading || isExporting}
						aria-label="Экспорт в форму 043/у"
						className="inline-flex items-center gap-1 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
						title="Прикрепить снимок к амбулаторной карте 043/у"
					>
						{isExporting ? (
							<Loader2 className="w-3.5 h-3.5 animate-spin" />
						) : (
							<Camera className="w-3.5 h-3.5" />
						)}
						В карту 043/у
					</button>

					<button
						type="button"
						onClick={handleLocalDownload}
						disabled={loading}
						aria-label="Скачать снимок"
						className="inline-flex items-center gap-1 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 text-white text-xs px-2 py-1.5 rounded-lg transition-colors"
						title="Скачать JPG"
					>
						<Download className="w-3.5 h-3.5" />
					</button>

					<button
						type="button"
						onClick={onClose}
						aria-label="Закрыть окно панорамы"
						className="text-neutral-400 hover:text-white min-h-[32px] min-w-[32px] inline-flex items-center justify-center p-1 rounded-lg text-lg font-bold transition-colors hover:bg-neutral-700"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			</div>

			{/* HU PRESET SELECTOR BAR */}
			<div className="bg-neutral-950/80 px-3 py-1.5 flex items-center gap-2 border-b border-neutral-800 overflow-x-auto text-xs">
				<span className="text-neutral-400 whitespace-nowrap">Режим HU:</span>
				<div className="flex gap-1">
					{VISIOGRAPH_PRESETS_LIST.map((preset) => (
						<button
							key={preset.id}
							type="button"
							onClick={() => setActivePreset(preset.id)}
							className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
								activePreset === preset.id
									? "bg-blue-600 text-white shadow-sm"
									: "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
							}`}
							title={preset.description}
						>
							{preset.shortLabel}
						</button>
					))}
				</div>
				<span className="text-[11px] text-neutral-500 ml-auto hidden sm:inline">
					WW: {currentPreset.windowWidth} | WL: {currentPreset.windowCenter}
				</span>
			</div>

			{/* CANVAS BODY */}
			<div className="flex-1 relative bg-black flex items-center justify-center p-2 min-h-0 overflow-hidden">
				{loading && (
					<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
						<div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
						<span className="text-teal-400 mt-4 text-sm font-medium animate-pulse">
							Построение трилинейной интерполяции среза...
						</span>
					</div>
				)}
				{error && (
					<div className="text-red-500 text-sm px-4 text-center">{error}</div>
				)}
				<canvas
					ref={canvasRef}
					width={800}
					height={300}
					className="w-full h-full object-contain"
				/>
			</div>
		</Rnd>
	);
}
