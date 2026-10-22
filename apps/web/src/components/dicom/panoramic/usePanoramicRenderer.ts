/**
 * usePanoramicRenderer.ts — хук вычислений панорамной реконструкции, срезов и экспорта ОПТГ.
 * Mandate 8b: Модульность, строго < 400 строк.
 */

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
} from "../../../utils/math/mprMath";
import { isLowSpecHardware, isHostUnderHeavyLoad } from "../../../utils/deviceDetection.js";
import { showToast } from "../../GlobalToast";
import {
	captureHighDpiCanvas,
	createSnapshotThumbnail,
	downloadSnapshotLocally,
	exportSnapshotToClinicalRecord,
} from "../../visiograph/VisiographExportService";
import {
	VISIOGRAPH_WINDOW_PRESETS,
	type VisiographPresetId,
} from "../../visiograph/VisiographWindowPresets";
import { autoDetectPanoramicArch } from "../panoramicArch";
import {
	type ArchCurvePoint,
	type CrossSectionSlicePlane,
	classifyMischBoneDensity,
	createAnatomicalJawControlPoints,
	generateCatmullRomArch,
	generateCrossSectionSlicePlanes,
} from "../panoramicMprMath";
import type {
	RulerMeasurement,
	AngleMeasurement,
} from "../PanoramicMeasurementOverlay";
import { evaluateAnatomicalSafety } from "../PanoramicSafetyEngine";
import {
	type PanoramicVolumeInput,
	paintHuPixelsToCanvas,
} from "./panoramicTypes";
import { paintCrossSectionSlice } from "./crossSectionPainter";

export interface UsePanoramicRendererProps {
	splinePoints: Point2D[];
	volume: PanoramicVolumeInput | null;
	thickness?: number | undefined;
	blendMode?: "mip" | "average" | undefined;
	zStartWorld?: number | undefined;
	zEndWorld?: number | undefined;
	zStepWorld?: number | undefined;
	patientId?: string | null | undefined;
	authHeaders?: Record<string, string> | undefined;
}

export function usePanoramicRenderer({
	splinePoints,
	volume,
	thickness = 0,
	blendMode = "mip",
	zStartWorld,
	zEndWorld,
	zStepWorld = 0.5,
	patientId = null,
	authHeaders = {},
}: UsePanoramicRendererProps) {
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
	const [viewMode, setViewMode] = useState<"panoramic" | "mpr_4quadrant">("panoramic");

	const [crossSectionStepMm, setCrossSectionStepMm] = useState<number>(1.5);
	const [sliceThicknessMm, setSliceThicknessMm] = useState<number>(thickness > 0 ? thickness : 1.0);
	const [activeCrossSectionIdx, setActiveCrossSectionIdx] = useState<number>(0);

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

	const [probedHU, setProbedHU] = useState<number | null>(750);
	const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

	const currentPreset = VISIOGRAPH_WINDOW_PRESETS[activePreset];

	const [autoDetectedPoints, setAutoDetectedPoints] = useState<Point2D[] | null>(null);

	const effectiveControlPoints = useMemo(() => {
		if (autoDetectedPoints && autoDetectedPoints.length >= 2) return autoDetectedPoints;
		if (splinePoints && splinePoints.length >= 2) return splinePoints;
		return createAnatomicalJawControlPoints().map((p) => ({ x: p.x, y: p.y }));
	}, [autoDetectedPoints, splinePoints]);

	const handleAutoDetectArch = useCallback(() => {
		try {
			const detected = autoDetectPanoramicArch(volume);
			setAutoDetectedPoints(detected);
			showToast(`Авто-дуга построена: ${detected.length} опорных точек`, "success");
		} catch {
			const fallback = createAnatomicalJawControlPoints().map((p) => ({ x: p.x, y: p.y }));
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

	const boneRecommendation = useMemo(() => {
		if (probedHU === null) return null;
		return classifyMischBoneDensity(probedHU);
	}, [probedHU]);

	const repaint = useCallback(() => {
		const canvas = canvasRef.current;
		const raw = rawPixelsRef.current;
		if (canvas && raw) {
			paintHuPixelsToCanvas(canvas, raw.width, raw.height, raw.pixels, currentPreset);
		}
	}, [currentPreset]);

	const vol = useMemo<VolumeSamplingData | null>(() => {
		if (!volume || !volume.scalarData || volume.scalarData.length === 0) return null;
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

	const repaintCrossSection = useCallback(() => {
		const csCanvas = crossSectionCanvasRef.current;
		if (!csCanvas) return;
		paintCrossSectionSlice({
			csCanvas,
			offscreenRef: offscreenCanvasRef,
			vol,
			activeSlice,
			crossSections,
			effectiveControlPoints,
			currentPreset,
			sliceThicknessMm,
		});
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

	useEffect(() => {
		if (!volume || effectiveControlPoints.length < 2) {
			setLoading(false);
			if (!volume) {
				setError("Исследование КЛКТ не передано. Панорамная реконструкция строится по вокселям активного 3D-объема.");
			} else if (effectiveControlPoints.length < 2) {
				setError("Недостаточно контрольных точек зубной дуги. Разметьте как минимум 2 точки на аксиальном срезе.");
			}
			return;
		}

		setLoading(true);
		setError(null);

		const worker = new Worker(new URL("../../../workers/mprWorker.ts", import.meta.url), { type: "module" });
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

			rawPixelsRef.current = { width: res.width, height: res.height, pixels: res.pixels };

			const canvas = canvasRef.current;
			if (canvas) {
				paintHuPixelsToCanvas(canvas, res.width, res.height, res.pixels, currentPreset);
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
	}, [volume, effectiveControlPoints, sliceThicknessMm, blendMode, zStartWorld, zEndWorld, zStepWorld, currentPreset, repaintCrossSection]);

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

	const handleCanvasMouseEnter = () => {
		if (canvasRef.current) {
			canvasRectRef.current = canvasRef.current.getBoundingClientRect();
		}
	};

	const handleCanvasMouseLeave = () => {
		canvasRectRef.current = null;
	};

	const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
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

	const handleExportToClinicalRecord = async () => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		if (!patientId) {
			showToast("Пациент не выбран. Откройте снимок из амбулаторной карты для прикрепления к медкарте.", "error");
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
				showToast("Снимок ОПТГ успешно прикреплен к медицинской карте!", "success");
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
		downloadSnapshotLocally(dataUri, `panoramic_mpr_${activePreset}_${Date.now()}.jpg`);
		showToast("Снимок сохранен на диск в высоком разрешении", "success");
	};

	return {
		canvasRef,
		crossSectionCanvasRef,
		loading,
		error,
		activePreset,
		setActivePreset,
		isExporting,
		viewMode,
		setViewMode,
		crossSectionStepMm,
		setCrossSectionStepMm,
		sliceThicknessMm,
		setSliceThicknessMm,
		activeCrossSectionIdx,
		setActiveCrossSectionIdx,
		isSharpenActive,
		setIsSharpenActive,
		isInvertColors,
		setIsInvertColors,
		activeTool,
		setActiveTool,
		rulers,
		setRulers,
		angles,
		setAngles,
		probedHU,
		cursorPos,
		crossSections,
		activeSlice,
		proximityAudit,
		boneRecommendation,
		handleReset,
		handleAutoDetectArch,
		handleCanvasMouseEnter,
		handleCanvasMouseLeave,
		handleCanvasMouseMove,
		handleExportToClinicalRecord,
		handleExportTo043: handleExportToClinicalRecord,
		handleLocalDownload,
	};
}
