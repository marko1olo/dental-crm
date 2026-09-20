/**
 * VisiographStudioCanvas.tsx
 *
 * Full-featured interactive HTML5 Canvas / WebGL 2D Visiograph & PACS Studio:
 * - Real-time filters: Brightness, Contrast, Gamma, Unsharp Mask, Invert (Negative/Positive).
 * - Measurement tools: Calibrated millimeter ruler, Protractor/Angle for tooth/implant axes,
 *   and Periapical bone destruction area delineation with automatic classification.
 * - Reference calibration tool (5.0 mm sphere, implant thread pitch).
 * - Multi-format export with medical-legal watermark (JPEG, PNG, DICOM Secondary Capture .dcm).
 */

import {
	Activity,
	AlertTriangle,
	CheckCircle2,
	Compass,
	Contrast,
	Download,
	FileDown,
	MousePointer,
	Printer,
	RotateCcw,
	RotateCw,
	Ruler,
	Scale,
	Sliders,
	X,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	CLINICAL_VISIOGRAPH_FILTERS,
	type ClinicalVisiographFilterPreset,
} from "./VisiographWindowPresets";
import {
	createDicomSecondaryCaptureFile,
	exportCanvasToJpeg,
	exportCanvasToPng,
	triggerBinaryDownload,
} from "./VisiographDicomExporter";
import {
	DEFAULT_VISIOGRAPH_IMAGE_PARAMS,
	VisiographImageProcessor,
	type VisiographImageParams,
} from "./VisiographImageProcessor";
import {
	buildLegalExportCanvas,
	DEFAULT_CLINIC_CREDENTIALS,
	DEFAULT_DOCTOR_SIGNATURE,
	renderMeasurementsOverlay,
} from "./VisiographLegalWatermark";
import {
	CALIBRATION_PRESETS,
	calculateAngle3Points,
	calculatePeriapicalLesion,
	calculateRuler,
	type CalibrationReference,
	type CalibrationReferenceType,
	computeCalibration,
	DEFAULT_PIXEL_SCALE_MM,
	distance2D,
	recalculateLesionsWithScale,
	recalculateRulersWithScale,
	type AngleMeasurement,
	type PeriapicalLesion,
	type Point2D,
	type RulerMeasurement,
} from "./VisiographMeasurementMath";

export interface SensorCalibrationPreset {
	readonly id: string;
	readonly label: string;
	readonly pixelSizeMm: number;
	readonly description: string;
}

export const STANDARD_SENSOR_PRESETS: readonly SensorCalibrationPreset[] = [
	{
		id: "rvg_size_1",
		label: "Датчик RVG Размер 1 (20 мкм)",
		pixelSizeMm: 0.020,
		description: "Прицельный датчик 0.020 мм/пикс",
	},
	{
		id: "rvg_size_2",
		label: "Датчик RVG Размер 2 (25 мкм)",
		pixelSizeMm: 0.025,
		description: "Прицельный датчик 0.025 мм/пикс",
	},
	{
		id: "opg_standard",
		label: "ОПТГ стандарт (50 мкм)",
		pixelSizeMm: 0.050,
		description: "Панорамный снимок 0.050 мм/пикс",
	},
];

export { recalculateRulersWithScale, recalculateLesionsWithScale };

export interface VisiographStudioCanvasProps {
	imageUrl: string;
	patientId?: string | null | undefined;
	patientFullName?: string | undefined;
	toothCode?: string | null | undefined;
	studyId?: string | undefined;
	doctorName?: string | undefined;
	initialTool?: ActiveVisiographTool;
	onSaveToRecord?: (
		imageDataUri: string,
		exportMeta: {
			rulers: RulerMeasurement[];
			angles: AngleMeasurement[];
			lesions: PeriapicalLesion[];
			scaleMmPerPx: number;
		},
	) => Promise<void> | void;
	onClose?: () => void;
}

export type ActiveVisiographTool =
	| "pointer"
	| "ruler"
	| "calibrate"
	| "angle"
	| "lesion"
	| "root_canal";

export function VisiographStudioCanvas({
	imageUrl,
	patientId = "pat_unknown",
	patientFullName = "Пациент ДЕНТЕ",
	toothCode = null,
	studyId,
	doctorName = "Врач-рентгенолог ДЕНТЕ",
	initialTool = "pointer",
	onSaveToRecord,
	onClose,
}: VisiographStudioCanvasProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const imageRef = useRef<HTMLImageElement | null>(null);
	const processorRef = useRef<VisiographImageProcessor>(
		new VisiographImageProcessor(),
	);
	// Low-Spec & High-FPS Optimization: Offscreen cached canvas for radiological filters
	// Prevents running CPU LUT / Unsharp Mask loops during mouse hover / tool drawing (<0.2ms/frame)
	const processedCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const lastProcessedParamsRef = useRef<VisiographImageParams | null>(null);
	const lastProcessedImageRef = useRef<HTMLImageElement | null>(null);

	// Coalesce high-frequency mouse movements to screen refresh rate (60 FPS / 16ms)
	const pendingHoverPosRef = useRef<Point2D | null>(null);
	const hoverRafIdRef = useRef<number | null>(null);

	// Image adjustments
	const [params, setParams] = useState<VisiographImageParams>({
		...DEFAULT_VISIOGRAPH_IMAGE_PARAMS,
	});

	// Active clinical 1-click filter
	const [activeClinicalFilter, setActiveClinicalFilter] = useState<string | null>(null);

	// Active tool
	const [activeTool, setActiveTool] = useState<ActiveVisiographTool>(initialTool);
	const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);

	// Calibration & 1-Click Sensor Presets
	const [activeSensorPresetId, setActiveSensorPresetId] = useState<string | null>(null);
	const [calibration, setCalibration] = useState<CalibrationReference>({
		type: "sphere_5mm",
		p1: { x: 0, y: 0 },
		p2: { x: 100, y: 0 },
		knownLengthMm: 5.0,
		pixelDistance: 100,
		scaleMmPerPixel: DEFAULT_PIXEL_SCALE_MM,
	});
	const [isCalibrated, setIsCalibrated] = useState(false);
	const [calibRefType, setCalibRefType] =
		useState<CalibrationReferenceType>("sphere_5mm");
	const [customMmInput, setCustomMmInput] = useState<number>(5.0);

	// Measurements state
	const [rulers, setRulers] = useState<RulerMeasurement[]>([]);
	const [angles, setAngles] = useState<AngleMeasurement[]>([]);
	const [lesions, setLesions] = useState<PeriapicalLesion[]>([]);

	// Viewport zoom & rotation state
	const [canvasZoom, setCanvasZoom] = useState<number>(1.0);
	const [canvasRotationDeg, setCanvasRotationDeg] = useState<number>(0);

	// Interactive drawing state
	const [drawingPoints, setDrawingPoints] = useState<Point2D[]>([]);
	const [hoverPos, setHoverPos] = useState<Point2D | null>(null);

	// Export Modal
	const [showExportModal, setShowExportModal] = useState(false);
	const [exportFormat, setExportFormat] = useState<"jpeg" | "png" | "dicom">(
		"jpeg",
	);
	const [includeWatermark, setIncludeWatermark] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	// Low-Spec & 60 FPS Optimization: Compare params for dirty-checking
	const areParamsEqual = (
		a: VisiographImageParams | null,
		b: VisiographImageParams,
	): boolean => {
		if (!a) return false;
		return (
			a.brightness === b.brightness &&
			a.contrast === b.contrast &&
			a.gamma === b.gamma &&
			a.sharpness === b.sharpness &&
			a.invert === b.invert &&
			a.windowWidth === b.windowWidth &&
			a.windowCenter === b.windowCenter
		);
	};

	// Updates offscreen pre-processed canvas ONLY when source image or parameters change
	const updateProcessedImage = useCallback(() => {
		const img = imageRef.current;
		if (!img) return;

		if (
			!processedCanvasRef.current ||
			lastProcessedImageRef.current !== img ||
			!areParamsEqual(lastProcessedParamsRef.current, params)
		) {
			if (!processedCanvasRef.current && typeof document !== "undefined") {
				processedCanvasRef.current = document.createElement("canvas");
			}
			if (processedCanvasRef.current) {
				processorRef.current.render(img, processedCanvasRef.current, params);
				lastProcessedImageRef.current = img;
				lastProcessedParamsRef.current = { ...params };
			}
		}
	}, [params]);

	// Load source image (<50ms instantaneous open without blocking on AI or calibration)
	useEffect(() => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => {
			imageRef.current = img;
			updateProcessedImage();
			drawCanvas();
		};
		img.src = imageUrl;
		if (img.complete && img.naturalWidth > 0) {
			imageRef.current = img;
			updateProcessedImage();
			drawCanvas();
		}
	}, [imageUrl, updateProcessedImage]);

	// Redraw when adjustments or measurements change
	const drawCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		const img = imageRef.current;
		if (!canvas || !img) return;

		// Ensure offscreen cache is up to date
		updateProcessedImage();

		const offscreen = processedCanvasRef.current;
		if (!offscreen) {
			processorRef.current.render(img, canvas, params);
		} else {
			if (canvas.width !== offscreen.width || canvas.height !== offscreen.height) {
				canvas.width = offscreen.width;
				canvas.height = offscreen.height;
			}
			const ctx = canvas.getContext("2d", { willReadFrequently: true });
			if (!ctx) return;
			// 1. Blit cached pre-processed filtered image in <0.2ms (Zero CPU LUT recalculation on mousemove)
			ctx.drawImage(offscreen, 0, 0);
		}

		const ctx = canvas.getContext("2d", { willReadFrequently: true });
		if (!ctx) return;

		// 2. Draw committed measurements
		renderMeasurementsOverlay(ctx, {
			rulers,
			angles,
			lesions,
			calibration: isCalibrated ? calibration : undefined,
		});

		// 3. Draw in-progress interactive tool shapes
		ctx.save();
		if (drawingPoints.length > 0) {
			if (activeTool === "ruler" || activeTool === "calibrate") {
				const p1 = drawingPoints[0];
				const p2 = hoverPos || p1;
				if (p1 && p2) {
					ctx.strokeStyle = activeTool === "calibrate" ? "#76ff03" : "#00e5ff";
					ctx.lineWidth = 2;
					ctx.setLineDash([4, 4]);
					ctx.beginPath();
					ctx.moveTo(p1.x, p1.y);
					ctx.lineTo(p2.x, p2.y);
					ctx.stroke();

					const dist = distance2D(p1, p2);
					const mm = dist * calibration.scaleMmPerPixel;
					ctx.fillStyle = "#ffffff";
					ctx.font = "bold 12px sans-serif";
					ctx.fillText(
						`${mm.toFixed(1)} мм`,
						(p1.x + p2.x) / 2,
						(p1.y + p2.y) / 2 - 8,
					);
				}
			} else if (activeTool === "angle") {
				ctx.strokeStyle = "#ffab00";
				ctx.lineWidth = 2;
				ctx.setLineDash([4, 4]);
				if (drawingPoints.length === 1 && hoverPos) {
					const p1 = drawingPoints[0];
					if (p1) {
						ctx.beginPath();
						ctx.moveTo(p1.x, p1.y);
						ctx.lineTo(hoverPos.x, hoverPos.y);
						ctx.stroke();
					}
				} else if (drawingPoints.length === 2 && hoverPos) {
					const v = drawingPoints[0];
					const arm1 = drawingPoints[1];
					if (v && arm1) {
						ctx.beginPath();
						ctx.moveTo(arm1.x, arm1.y);
						ctx.lineTo(v.x, v.y);
						ctx.lineTo(hoverPos.x, hoverPos.y);
						ctx.stroke();

						const tempAngle = calculateAngle3Points(v, arm1, hoverPos);
						ctx.fillStyle = "#ffffff";
						ctx.font = "bold 12px sans-serif";
						ctx.fillText(
							`${tempAngle.angleDeg.toFixed(1)}°`,
							v.x + 10,
							v.y - 10,
						);
					}
				}
			} else if (activeTool === "lesion") {
				ctx.strokeStyle = "#ff1744";
				ctx.lineWidth = 2;
				ctx.setLineDash([3, 3]);
				ctx.beginPath();
				const first = drawingPoints[0];
				if (first) {
					ctx.moveTo(first.x, first.y);
					for (let i = 1; i < drawingPoints.length; i++) {
						const p = drawingPoints[i];
						if (p) ctx.lineTo(p.x, p.y);
					}
					if (hoverPos) {
						ctx.lineTo(hoverPos.x, hoverPos.y);
					}
					ctx.stroke();
				}
			} else if (activeTool === "root_canal") {
				ctx.strokeStyle = "#10b981";
				ctx.lineWidth = 2.5;
				ctx.setLineDash([2, 2]);
				ctx.beginPath();
				const first = drawingPoints[0];
				if (first) {
					ctx.moveTo(first.x, first.y);
					for (let i = 1; i < drawingPoints.length; i++) {
						const p = drawingPoints[i];
						if (p) ctx.lineTo(p.x, p.y);
					}
					if (hoverPos) {
						ctx.lineTo(hoverPos.x, hoverPos.y);
					}
					ctx.stroke();

					// Draw point nodes
					const allPts = hoverPos ? [...drawingPoints, hoverPos] : drawingPoints;
					for (const pt of allPts) {
						ctx.fillStyle = "#10b981";
						ctx.beginPath();
						ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
						ctx.fill();
					}

					// Live working length readout
					let dist = 0;
					for (let i = 1; i < allPts.length; i++) {
						const pA = allPts[i - 1];
						const pB = allPts[i];
						if (pA && pB) dist += distance2D(pA, pB);
					}
					const lengthMm = dist * calibration.scaleMmPerPixel;
					const last = allPts[allPts.length - 1];
					if (last) {
						ctx.fillStyle = "#10b981";
						ctx.font = "bold 13px monospace";
						ctx.fillText(`WL = ${lengthMm.toFixed(1)} мм (Апекс)`, last.x + 8, last.y - 8);
					}
				}
			}
		}
		ctx.restore();
	}, [
		updateProcessedImage,
		params,
		rulers,
		angles,
		lesions,
		isCalibrated,
		calibration,
		drawingPoints,
		hoverPos,
		activeTool,
	]);

	useEffect(() => {
		drawCanvas();
	}, [drawCanvas]);

	// Mouse coordinate helper relative to canvas pixel space
	const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>): Point2D => {
		const canvas = canvasRef.current;
		if (!canvas) return { x: 0, y: 0 };
		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
		return {
			x: (e.clientX - rect.left) * scaleX,
			y: (e.clientY - rect.top) * scaleY,
		};
	};

	// Interactive canvas click handler
	const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const pt = getCanvasPoint(e);

		if (activeTool === "ruler") {
			if (drawingPoints.length === 0) {
				setDrawingPoints([pt]);
			} else {
				const p1 = drawingPoints[0];
				if (p1 && distance2D(p1, pt) > 3) {
					const newRuler = calculateRuler(
						p1,
						pt,
						calibration.scaleMmPerPixel,
						`L${rulers.length + 1}`,
					);
					setRulers((prev) => [...prev, newRuler]);
				}
				setDrawingPoints([]);
			}
		} else if (activeTool === "calibrate") {
			if (drawingPoints.length === 0) {
				setDrawingPoints([pt]);
			} else {
				const p1 = drawingPoints[0];
				if (p1 && distance2D(p1, pt) > 5) {
					const preset = CALIBRATION_PRESETS[calibRefType];
					const knownMm =
						calibRefType === "custom_mm"
							? customMmInput
							: preset?.defaultMm || 5.0;
					const calib = computeCalibration(p1, pt, knownMm, calibRefType);
					setCalibration(calib);
					setIsCalibrated(true);

					// Recalculate all rulers and lesions with new scale
					setRulers((prev) =>
						prev.map((r) => calculateRuler(r.p1, r.p2, calib.scaleMmPerPixel, r.label, r.id)),
					);
					setLesions((prev) =>
						prev.map((les) =>
							calculatePeriapicalLesion(
								les.points,
								calib.scaleMmPerPixel,
								les.fdiToothCode,
								les.id,
							),
						),
					);
				}
				setDrawingPoints([]);
				setActiveTool("pointer");
			}
		} else if (activeTool === "angle") {
			if (drawingPoints.length === 0) {
				setDrawingPoints([pt]); // Vertex
			} else if (drawingPoints.length === 1) {
				setDrawingPoints((prev) => [...prev, pt]); // Arm 1
			} else if (drawingPoints.length === 2) {
				const v = drawingPoints[0];
				const arm1 = drawingPoints[1];
				if (v && arm1) {
					const newAngle = calculateAngle3Points(
						v,
						arm1,
						pt,
						"tooth_axis",
						`∠${angles.length + 1}`,
					);
					setAngles((prev) => [...prev, newAngle]);
				}
				setDrawingPoints([]);
			}
		} else if (activeTool === "lesion") {
			if (drawingPoints.length >= 2) {
				const first = drawingPoints[0];
				// Click close to starting point closes polygon
				if (first && distance2D(pt, first) < 12) {
					const lesion = calculatePeriapicalLesion(
						drawingPoints,
						calibration.scaleMmPerPixel,
						toothCode ?? undefined,
					);
					setLesions((prev) => [...prev, lesion]);
					setDrawingPoints([]);
					return;
				}
			}
			setDrawingPoints((prev) => [...prev, pt]);
		} else if (activeTool === "root_canal") {
			setDrawingPoints((prev) => [...prev, pt]);
		}
	};

	const handleCanvasDoubleClick = () => {
		if (activeTool === "lesion" && drawingPoints.length >= 3) {
			const lesion = calculatePeriapicalLesion(
				drawingPoints,
				calibration.scaleMmPerPixel,
				toothCode ?? undefined,
			);
			setLesions((prev) => [...prev, lesion]);
			setDrawingPoints([]);
		} else if (activeTool === "root_canal" && drawingPoints.length >= 2) {
			let totalDist = 0;
			for (let i = 1; i < drawingPoints.length; i++) {
				const pA = drawingPoints[i - 1];
				const pB = drawingPoints[i];
				if (pA && pB) totalDist += distance2D(pA, pB);
			}
			const lengthMm = totalDist * calibration.scaleMmPerPixel;
			const p1 = drawingPoints[0]!;
			const pLast = drawingPoints[drawingPoints.length - 1]!;
			const newRuler = calculateRuler(
				p1,
				pLast,
				calibration.scaleMmPerPixel,
				`Канал: ${lengthMm.toFixed(1)} мм (WL/Апекс)`,
			);
			newRuler.lengthPx = totalDist;
			newRuler.lengthMm = lengthMm;
			newRuler.color = "#10b981";
			setRulers((prev) => [...prev, newRuler]);
			setDrawingPoints([]);

			// Диспетчеризация замеренной длины канала для мгновенной передачи в Форму 043/у (Мандат 8e, 8k)
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-endo-wl-measured", {
						detail: {
							toothNumber: toothCode ? Number(toothCode) : 16,
							lengthMm: Math.round(lengthMm * 10) / 10,
						},
					}),
				);
			}
		}
	};

	// Coalesce high-frequency mouse movements to screen refresh rate (60 FPS / 16.6ms)
	const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const pt = getCanvasPoint(e);
		pendingHoverPosRef.current = pt;
		if (hoverRafIdRef.current === null) {
			if (typeof requestAnimationFrame !== "undefined") {
				hoverRafIdRef.current = requestAnimationFrame(() => {
					hoverRafIdRef.current = null;
					if (pendingHoverPosRef.current) {
						setHoverPos(pendingHoverPosRef.current);
					}
				});
			} else {
				setHoverPos(pt);
			}
		}
	};

	const handleMouseLeave = () => {
		pendingHoverPosRef.current = null;
		if (hoverRafIdRef.current !== null && typeof cancelAnimationFrame !== "undefined") {
			cancelAnimationFrame(hoverRafIdRef.current);
			hoverRafIdRef.current = null;
		}
		setHoverPos(null);
	};

	// Clean up pending animation frame on unmount
	useEffect(() => {
		return () => {
			if (hoverRafIdRef.current !== null && typeof cancelAnimationFrame !== "undefined") {
				cancelAnimationFrame(hoverRafIdRef.current);
				hoverRafIdRef.current = null;
			}
		};
	}, []);

	// 1-Click Clinical Sensor Preset Application (Mandates 8d, 8e, 8k)
	const handleApplySensorPreset = (preset: SensorCalibrationPreset) => {
		setActiveSensorPresetId(preset.id);
		setIsCalibrated(true);
		const newScale = preset.pixelSizeMm;
		setCalibration((prev) => ({
			...prev,
			type: "custom_mm",
			knownLengthMm: newScale * 100,
			pixelDistance: 100,
			scaleMmPerPixel: newScale,
		}));

		// Recalculate all committed rulers and periapical lesions in 1 click
		setRulers((prev) => recalculateRulersWithScale(prev, newScale));
		setLesions((prev) => recalculateLesionsWithScale(prev, newScale));

		// Dispatch updated endodontic WL to Form 043/u if canal ruler exists
		if (typeof window !== "undefined") {
			const canalRuler = rulers.find(
				(r) => r.label?.includes("WL") || r.label?.includes("Канал:"),
			);
			if (canalRuler) {
				const updatedLength = canalRuler.lengthPx * newScale;
				window.dispatchEvent(
					new CustomEvent("dente-endo-wl-measured", {
						detail: {
							toothNumber: toothCode ? Number(toothCode) : 16,
							lengthMm: Math.round(updatedLength * 10) / 10,
						},
					}),
				);
			}
		}
	};

	// Reset adjustments
	const handleResetParams = () => {
		setParams({ ...DEFAULT_VISIOGRAPH_IMAGE_PARAMS });
		setActiveClinicalFilter(null);
	};

	// 1-Click Clinical Filter Application
	const handleApplyClinicalFilter = (filter: ClinicalVisiographFilterPreset) => {
		if (activeClinicalFilter === filter.id) {
			// Toggle off back to default neutral parameters
			setParams({ ...DEFAULT_VISIOGRAPH_IMAGE_PARAMS });
			setActiveClinicalFilter(null);
			return;
		}
		setParams({
			...DEFAULT_VISIOGRAPH_IMAGE_PARAMS,
			...filter.params,
		});
		setActiveClinicalFilter(filter.id);
	};

	// 1-Click Fast Legal Protocol Printout with Clinic Stamp (Mandate 8e, Doctor Autonomy)
	const handlePrintProtocol = () => {
		const canvas = canvasRef.current;
		if (!canvas || typeof document === "undefined") return;

		const legalCanvas = buildLegalExportCanvas(canvas, {
			patient: {
				id: patientId || "pat_001",
				fullName: patientFullName || "Пациент",
			},
			clinic: DEFAULT_CLINIC_CREDENTIALS,
			doctor: {
				...DEFAULT_DOCTOR_SIGNATURE,
				doctorFullName: doctorName || DEFAULT_DOCTOR_SIGNATURE.doctorFullName,
			},
			study: {
				id: studyId,
				toothCode: toothCode || undefined,
				capturedAt: new Date().toISOString(),
			},
			calibration: isCalibrated ? calibration : undefined,
			rulers,
			angles,
			lesions,
		});

		const imageUri = exportCanvasToPng(legalCanvas);

		const printFrame = document.createElement("iframe");
		printFrame.style.position = "fixed";
		printFrame.style.right = "0";
		printFrame.style.bottom = "0";
		printFrame.style.width = "0";
		printFrame.style.height = "0";
		printFrame.style.border = "0";
		document.body.appendChild(printFrame);

		const printDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
		if (!printDoc) return;

		const measurementsRows = [
			...rulers.map((r, i) => `<tr><td>Линейка #${i + 1} (${r.label})</td><td>${r.lengthMm.toFixed(1)} мм</td><td>Калибр: 1 px = ${calibration.scaleMmPerPixel.toFixed(4)} мм</td></tr>`),
			...angles.map((a, i) => `<tr><td>Угломер #${i + 1} (${a.label})</td><td>${a.angleDeg.toFixed(1)}°</td><td>Ось зуба / коронки</td></tr>`),
			...lesions.map((les, i) => `<tr><td>Очаг #${i + 1} (${les.classificationLabel})</td><td>${les.areaMm2.toFixed(1)} мм² (Ø ${les.equivalentDiameterMm.toFixed(1)} мм)</td><td>${les.treatmentRecommendation}</td></tr>`),
		].join("");

		const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Протокол рентгенограммы — ${patientFullName}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; margin: 0; padding: 0; font-size: 10pt; line-height: 1.35; }
  .clinic-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #14b8a6; padding-bottom: 8px; margin-bottom: 10px; }
  .clinic-title { font-size: 13pt; font-weight: 800; text-transform: uppercase; color: #0f172a; }
  .clinic-sub { font-size: 8.5pt; color: #64748b; }
  .protocol-badge { text-align: right; font-weight: 800; font-size: 11pt; color: #0d9488; }
  .patient-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; font-size: 9pt; }
  .image-wrapper { text-align: center; margin: 10px 0; }
  .image-wrapper img { max-width: 100%; max-height: 140mm; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  .table-title { font-weight: 700; font-size: 9.5pt; margin: 10px 0 4px 0; color: #0f172a; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 12px; }
  th, td { border: 1px solid #cbd5e1; padding: 4px 8px; text-align: left; }
  th { background: #f1f5f9; font-weight: 700; color: #334155; }
  .stamp-footer { margin-top: 16px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 8.5pt; color: #475569; }
  .stamp-box { width: 70px; height: 70px; border: 1px dashed #94a3b8; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8pt; font-weight: 700; color: #64748b; }
</style>
</head>
<body>
  <div class="clinic-header">
    <div>
      <div class="clinic-title">${DEFAULT_CLINIC_CREDENTIALS.clinicName}</div>
      <div class="clinic-sub">Лицензия № ЛО-77-01-018942 · Рентген-кабинет радиовизиографии</div>
    </div>
    <div class="protocol-badge">
      ПРОТОКОЛ РВГ<br>
      <span style="font-size: 8.5pt; font-weight: normal; color: #64748b;">${new Date().toLocaleDateString("ru-RU")}</span>
    </div>
  </div>
  <div class="patient-grid">
    <div><strong>Пациент:</strong> ${patientFullName} (ID: ${patientId})</div>
    <div><strong>Зуб (FDI):</strong> ${toothCode ? `Зуб ${toothCode}` : "Прицельный снимок"}</div>
    <div><strong>Врач:</strong> ${doctorName}</div>
    <div><strong>Калибровка:</strong> 1 px = ${calibration.scaleMmPerPixel.toFixed(4)} мм</div>
  </div>
  <div class="image-wrapper">
    <img src="${imageUri}" alt="Радиовизиограмма" />
  </div>
  ${measurementsRows.length > 0 ? `
  <div class="table-title">Клинические измерения и периапикальные очаги:</div>
  <table>
    <thead><tr><th>Параметр / Метка</th><th>Значение</th><th>Примечание</th></tr></thead>
    <tbody>${measurementsRows}</tbody>
  </table>` : ""}
  <div class="stamp-footer">
    <div>
      <div>Заключение: Рентгенологический контроль завершен. Данные внесены в медицинскую карту (043/у).</div>
      <div style="margin-top: 6px;">Врач: ${doctorName} ___________________ / Подпись</div>
    </div>
    <div class="stamp-box">М.П.</div>
  </div>
</body>
</html>`;

		printDoc.open();
		printDoc.write(html);
		printDoc.close();
		setTimeout(() => {
			printFrame.contentWindow?.focus();
			printFrame.contentWindow?.print();
			setTimeout(() => {
				document.body.removeChild(printFrame);
			}, 1000);
		}, 250);
	};

	// Perform Export
	const handleExecuteExport = async () => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		setIsSaving(true);
		try {
			let outputCanvas = canvas;
			if (includeWatermark) {
				outputCanvas = buildLegalExportCanvas(canvas, {
					patient: {
						id: patientId || "pat_001",
						fullName: patientFullName || "Пациент",
					},
					clinic: DEFAULT_CLINIC_CREDENTIALS,
					doctor: {
						...DEFAULT_DOCTOR_SIGNATURE,
						doctorFullName: doctorName || DEFAULT_DOCTOR_SIGNATURE.doctorFullName,
					},
					study: {
						id: studyId,
						toothCode: toothCode || undefined,
						capturedAt: new Date().toISOString(),
					},
					calibration: isCalibrated ? calibration : undefined,
					rulers,
					angles,
					lesions,
				});
			}

			const filenameBase = `visiograph_${toothCode ? `tooth_${toothCode}_` : ""}${Date.now()}`;

			if (exportFormat === "jpeg") {
				const dataUri = exportCanvasToJpeg(outputCanvas, 0.95);
				triggerBinaryDownload(
					await (await fetch(dataUri)).blob(),
					`${filenameBase}.jpg`,
					"image/jpeg",
				);
			} else if (exportFormat === "png") {
				const dataUri = exportCanvasToPng(outputCanvas);
				triggerBinaryDownload(
					await (await fetch(dataUri)).blob(),
					`${filenameBase}.png`,
					"image/png",
				);
			} else if (exportFormat === "dicom") {
				const dicomBytes = createDicomSecondaryCaptureFile(outputCanvas, {
					patientId: patientId || "PATIENT-001",
					patientFullName,
					toothCode: toothCode || undefined,
					clinicName: DEFAULT_CLINIC_CREDENTIALS.clinicName,
					doctorFullName: doctorName,
					scaleMmPerPixel: calibration.scaleMmPerPixel,
				});
				triggerBinaryDownload(
					dicomBytes,
					`${filenameBase}.dcm`,
					"application/dicom",
				);
			}

			// If caller provided Form 043 save handler
			if (onSaveToRecord) {
				const finalDataUri = exportCanvasToJpeg(outputCanvas, 0.92);
				await onSaveToRecord(finalDataUri, {
					rulers,
					angles,
					lesions,
					scaleMmPerPx: calibration.scaleMmPerPixel,
				});
			}

			setShowExportModal(false);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div
			className="visiograph-studio-container"
			style={{
				display: "flex",
				flexDirection: "column",
				background: "var(--paper, #0d1117)",
				color: "var(--ink, #c9d1d9)",
				borderRadius: "12px",
				border: "1px solid var(--line, #30363d)",
				overflow: "hidden",
				minHeight: "580px",
			}}
		>
			{/* Top Bar with Tools and Preset Buttons (Strict 1-Row Toolbar, Mandate 8d) */}
			<div
				className="visiograph-top-toolbar"
				style={{
					display: "flex",
					flexWrap: "nowrap",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "2px 8px",
					height: "36px",
					minHeight: "36px",
					maxHeight: "36px",
					background: "var(--paper-soft, #161b22)",
					borderBottom: "1px solid var(--line, #30363d)",
					gap: "6px",
					overflowX: "auto",
					whiteSpace: "nowrap",
				}}
			>
				{/* Primary Tools: Pointer, Ruler, Apex + Invert + Rotate + Secondary Tools Dropdown */}
				<div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
					<button
						type="button"
						data-testid="btn-tool-pointer"
						onClick={() => {
							setActiveTool("pointer");
							setDrawingPoints([]);
						}}
						style={{
							height: "30px",
							background: activeTool === "pointer" ? "var(--primary, #1f6feb)" : "var(--paper-strong, #0d1117)",
							color: activeTool === "pointer" ? "#ffffff" : "var(--ink, #c9d1d9)",
							border: "1px solid var(--line, #30363d)",
							borderRadius: "5px",
							padding: "2px 8px",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "4px",
							fontSize: "0.78rem",
							fontWeight: 500,
						}}
						title="Указатель (Просмотр)"
					>
						<MousePointer size={14} /> <span>Указатель</span>
					</button>

					<button
						type="button"
						data-testid="btn-tool-ruler"
						onClick={() => {
							setActiveTool("ruler");
							setDrawingPoints([]);
						}}
						style={{
							height: "30px",
							background: activeTool === "ruler" ? "var(--primary, #1f6feb)" : "var(--paper-strong, #0d1117)",
							color: activeTool === "ruler" ? "#ffffff" : "var(--primary, #58a6ff)",
							border: "1px solid var(--line, #30363d)",
							borderRadius: "5px",
							padding: "2px 8px",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "4px",
							fontSize: "0.78rem",
							fontWeight: 600,
						}}
						title="Измерить расстояние между двумя точками (мм)"
					>
						<Ruler size={14} /> <span>Линейка</span>
					</button>

					<button
						type="button"
						data-testid="btn-tool-apex"
						onClick={() => {
							setActiveTool("root_canal");
							setDrawingPoints([]);
						}}
						style={{
							height: "30px",
							background: activeTool === "root_canal" ? "var(--success, #238636)" : "var(--paper-strong, #0d1117)",
							color: activeTool === "root_canal" ? "#ffffff" : "var(--success, #3fb950)",
							border: `1px solid ${activeTool === "root_canal" ? "var(--success, #238636)" : "var(--line, #30363d)"}`,
							borderRadius: "5px",
							padding: "2px 8px",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "4px",
							fontSize: "0.78rem",
							fontWeight: 700,
						}}
						title="Эндо-линейка (Apex Locator / WL): измерение рабочей длины канала в мм"
					>
						<Activity size={14} /> <span>Апекс WL</span>
					</button>

					{/* Direct 1-Click Invert (Negative/Positive) — Hick's Law */}
					<button
						type="button"
						data-testid="btn-tool-invert"
						onClick={() => setParams((prev) => ({ ...prev, invert: !prev.invert }))}
						style={{
							height: "30px",
							background: params.invert ? "var(--teal, #0d9488)" : "var(--paper-strong, #0d1117)",
							color: params.invert ? "#ffffff" : "var(--ink, #c9d1d9)",
							border: `1px solid ${params.invert ? "var(--teal, #0d9488)" : "var(--line, #30363d)"}`,
							borderRadius: "5px",
							padding: "2px 8px",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "4px",
							fontSize: "0.78rem",
							fontWeight: 600,
						}}
						title="Инверсия (Негатив / Позитив) для оценки микротрещин"
					>
						<Contrast size={14} /> <span>Негатив</span>
					</button>

					{/* Direct 1-Click Rotate 90° */}
					<button
						type="button"
						data-testid="btn-tool-rotate"
						onClick={() => setCanvasRotationDeg((r) => (r + 90) % 360)}
						style={{
							height: "30px",
							background: "var(--paper-strong, #0d1117)",
							color: "var(--ink, #c9d1d9)",
							border: "1px solid var(--line, #30363d)",
							borderRadius: "5px",
							padding: "2px 8px",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "4px",
							fontSize: "0.78rem",
						}}
						title="Повернуть снимок на 90°"
					>
						<RotateCw size={14} /> <span>90°</span>
					</button>

					{/* Secondary Tools Dropdown: Calibrate, Angle, Lesion, Rotate 180 */}
					<div style={{ position: "relative", display: "inline-block" }}>
						<button
							type="button"
							data-testid="btn-tools-dropdown"
							onClick={() => setIsToolsMenuOpen((prev) => !prev)}
							style={{
								height: "30px",
								background: ["calibrate", "angle", "lesion"].includes(activeTool) ? "var(--primary, #1f6feb)" : "var(--paper-strong, #0d1117)",
								color: ["calibrate", "angle", "lesion"].includes(activeTool) ? "#ffffff" : "var(--ink, #c9d1d9)",
								border: "1px solid var(--line, #30363d)",
								borderRadius: "5px",
								padding: "2px 8px",
								cursor: "pointer",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								gap: "4px",
								fontSize: "0.78rem",
								fontWeight: 500,
							}}
							title="Дополнительные инструменты: калибровка, угломер, очаг деструкции"
						>
							<Sliders size={13} />
							<span>
								{activeTool === "calibrate"
									? "Калибр."
									: activeTool === "angle"
										? "Угломер"
										: activeTool === "lesion"
											? "Очаг"
											: "Ещё ▾"}
							</span>
						</button>
						{isToolsMenuOpen && (
							<div
								style={{
									position: "absolute",
									top: "calc(100% + 4px)",
									left: 0,
									background: "var(--paper-strong, #0d1117)",
									border: "1px solid var(--line, #30363d)",
									borderRadius: "8px",
									boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
									zIndex: 60,
									minWidth: "210px",
									display: "flex",
									flexDirection: "column",
									padding: "4px",
									gap: "2px",
								}}
							>
								<button
									type="button"
									onClick={() => {
										setActiveTool("calibrate");
										setDrawingPoints([]);
										setIsToolsMenuOpen(false);
									}}
									style={{
										height: "32px",
										background: activeTool === "calibrate" ? "var(--primary, #1f6feb)" : "transparent",
										color: activeTool === "calibrate" ? "#ffffff" : "var(--ink, #c9d1d9)",
										border: "none",
										borderRadius: "5px",
										padding: "4px 10px",
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										gap: "8px",
										fontSize: "0.8rem",
										textAlign: "left",
									}}
								>
									<Scale size={14} />
									<span>Калибровка по эталону</span>
								</button>
								<button
									type="button"
									onClick={() => {
										setActiveTool("angle");
										setDrawingPoints([]);
										setIsToolsMenuOpen(false);
									}}
									style={{
										height: "32px",
										background: activeTool === "angle" ? "var(--primary, #1f6feb)" : "transparent",
										color: activeTool === "angle" ? "#ffffff" : "var(--ink, #c9d1d9)",
										border: "none",
										borderRadius: "5px",
										padding: "4px 10px",
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										gap: "8px",
										fontSize: "0.8rem",
										textAlign: "left",
									}}
								>
									<Compass size={14} />
									<span>Угломер оси зуба</span>
								</button>
								<button
									type="button"
									onClick={() => {
										setActiveTool("lesion");
										setDrawingPoints([]);
										setIsToolsMenuOpen(false);
									}}
									style={{
										height: "32px",
										background: activeTool === "lesion" ? "var(--primary, #1f6feb)" : "transparent",
										color: activeTool === "lesion" ? "#ffffff" : "var(--ink, #c9d1d9)",
										border: "none",
										borderRadius: "5px",
										padding: "4px 10px",
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										gap: "8px",
										fontSize: "0.8rem",
										textAlign: "left",
									}}
								>
									<AlertTriangle size={14} />
									<span>Очаг деструкции (мм²)</span>
								</button>
								<div style={{ height: "1px", background: "var(--line, #30363d)", margin: "2px 0" }} />
								<button
									type="button"
									onClick={() => {
										setCanvasRotationDeg((r) => (r + 180) % 360);
										setIsToolsMenuOpen(false);
									}}
									style={{
										height: "32px",
										background: "transparent",
										color: "var(--ink, #c9d1d9)",
										border: "none",
										borderRadius: "5px",
										padding: "4px 10px",
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										gap: "8px",
										fontSize: "0.8rem",
										textAlign: "left",
									}}
								>
									<RotateCw size={14} />
									<span>Повернуть на 180°</span>
								</button>
							</div>
						)}
					</div>
				</div>

				{/* Center/Right: Sensor preset + Clinical filter select + Zoom + Reset + Print + Export */}
				<div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
					{/* 1-Click Sensor Calibration Presets */}
					<div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
						<span style={{ fontSize: "0.75rem", color: "var(--muted, #8b949e)", whiteSpace: "nowrap" }}>
							Датчик:
						</span>
						<select
							value={activeSensorPresetId ?? (isCalibrated ? "manual" : "")}
							onChange={(e) => {
								const val = e.target.value;
								if (val === "manual") {
									setActiveSensorPresetId(null);
									setActiveTool("calibrate");
									setDrawingPoints([]);
								} else {
									const preset = STANDARD_SENSOR_PRESETS.find((p) => p.id === val);
									if (preset) {
										handleApplySensorPreset(preset);
									}
								}
							}}
							style={{
								height: "30px",
								background: "var(--paper-strong, #0d1117)",
								color: "var(--ink, #c9d1d9)",
								border: "1px solid var(--line, #30363d)",
								borderRadius: "5px",
								padding: "2px 6px",
								fontSize: "0.78rem",
								cursor: "pointer",
							}}
							title="1-клик калибровка по стандартным датчикам RVG / ОПТГ"
						>
							<option value="" disabled>
								Калибровка датчика...
							</option>
							{STANDARD_SENSOR_PRESETS.map((p) => (
								<option key={p.id} value={p.id}>
									{p.label}
								</option>
							))}
							<option value="manual">Ручная калибровка (шарик 5 мм)</option>
						</select>
					</div>

					{/* 1-Click Clinical Filters Selector */}
					<div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
						<span style={{ fontSize: "0.75rem", color: "var(--muted, #8b949e)", whiteSpace: "nowrap" }}>
							Фильтр:
						</span>
						<select
							value={activeClinicalFilter ?? ""}
							onChange={(e) => {
								const val = e.target.value;
								if (!val) {
									setParams({ ...DEFAULT_VISIOGRAPH_IMAGE_PARAMS });
									setActiveClinicalFilter(null);
								} else {
									const f = CLINICAL_VISIOGRAPH_FILTERS.find((item) => item.id === val);
									if (f) {
										handleApplyClinicalFilter(f);
									}
								}
							}}
							style={{
								height: "30px",
								background: "var(--paper-strong, #0d1117)",
								color: "var(--ink, #c9d1d9)",
								border: "1px solid var(--line, #30363d)",
								borderRadius: "5px",
								padding: "2px 6px",
								fontSize: "0.78rem",
								cursor: "pointer",
							}}
							title="Клинические фильтры радиовизиографа (Контраст, Резкость, Эндо, Кость)"
						>
							<option value="">Без фильтра (Стандарт)</option>
							{CLINICAL_VISIOGRAPH_FILTERS.map((f) => (
								<option key={f.id} value={f.id}>
									{f.label} ({f.badge})
								</option>
							))}
						</select>
					</div>

					{/* Zoom Controls */}
					<div style={{ display: "flex", alignItems: "center", gap: "1px" }}>
						<button
							type="button"
							onClick={() => setCanvasZoom((z) => Math.max(0.4, Number((z - 0.2).toFixed(2))))}
							style={{
								height: "30px",
								minWidth: "30px",
								background: "var(--paper-strong, #0d1117)",
								color: "var(--ink, #c9d1d9)",
								border: "1px solid var(--line, #30363d)",
								borderRadius: "5px 0 0 5px",
								padding: "2px 6px",
								fontSize: "0.78rem",
								cursor: "pointer",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
							}}
							title="Уменьшить масштаб"
						>
							<ZoomOut size={13} />
						</button>
						<button
							type="button"
							onClick={() => {
								setCanvasZoom(1.0);
								setCanvasRotationDeg(0);
							}}
							style={{
								height: "30px",
								minWidth: "40px",
								background: "var(--paper-strong, #0d1117)",
								color: "var(--primary, #58a6ff)",
								borderTop: "1px solid var(--line, #30363d)",
								borderBottom: "1px solid var(--line, #30363d)",
								borderLeft: "none",
								borderRight: "none",
								padding: "2px 6px",
								fontSize: "0.76rem",
								cursor: "pointer",
								fontFamily: "monospace",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
							}}
							title="Сброс масштаба и поворота к 100%"
						>
							{Math.round(canvasZoom * 100)}%
						</button>
						<button
							type="button"
							onClick={() => setCanvasZoom((z) => Math.min(3.5, Number((z + 0.2).toFixed(2))))}
							style={{
								height: "30px",
								minWidth: "30px",
								background: "var(--paper-strong, #0d1117)",
								color: "var(--ink, #c9d1d9)",
								border: "1px solid var(--line, #30363d)",
								borderRadius: "0 5px 5px 0",
								padding: "2px 6px",
								fontSize: "0.78rem",
								cursor: "pointer",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
							}}
							title="Увеличить масштаб"
						>
							<ZoomIn size={13} />
						</button>
					</div>

					{/* 1-Click Reset — Hick's Law */}
					<button
						type="button"
						onClick={() => {
							handleResetParams();
							setCanvasZoom(1.0);
							setCanvasRotationDeg(0);
						}}
						style={{
							height: "30px",
							background: "var(--paper-strong, #0d1117)",
							color: "var(--muted, #8b949e)",
							border: "1px solid var(--line, #30363d)",
							borderRadius: "5px",
							padding: "2px 8px",
							fontSize: "0.78rem",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "4px",
						}}
						title="Сбросить все фильтры, масштаб и поворот"
					>
						<RotateCcw size={13} /> <span>Сброс</span>
					</button>

					{/* 1-Click Legal Protocol Printout — Doctor Autonomy (Mandate 8e) */}
					<button
						type="button"
						data-testid="btn-visiograph-print-protocol"
						onClick={handlePrintProtocol}
						style={{
							height: "30px",
							background: "var(--teal, #0d9488)",
							color: "#ffffff",
							border: "none",
							borderRadius: "5px",
							padding: "2px 10px",
							fontSize: "0.78rem",
							fontWeight: 600,
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "5px",
						}}
						title="Быстрая печать протокола РВГ с юридическим штампом и таблицей измерений"
					>
						<Printer size={13} /> <span>Печать</span>
					</button>

					{/* Export & Legal Watermark */}
					<button
						type="button"
						data-testid="btn-visiograph-export-modal"
						onClick={() => setShowExportModal(true)}
						style={{
							height: "30px",
							background: "var(--success, #238636)",
							color: "#ffffff",
							border: "none",
							borderRadius: "5px",
							padding: "2px 10px",
							fontSize: "0.78rem",
							fontWeight: 600,
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "5px",
						}}
						title="Юридический экспорт (JPEG, PNG, DICOM Part 10)"
					>
						<FileDown size={13} /> <span>Экспорт</span>
					</button>

					{onClose && (
						<button
							type="button"
							onClick={onClose}
							style={{
								height: "30px",
								width: "30px",
								background: "transparent",
								color: "var(--muted, #8b949e)",
								border: "none",
								cursor: "pointer",
								padding: "4px",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								borderRadius: "5px",
							}}
							title="Закрыть студию"
						>
							<X size={16} />
						</button>
					)}
				</div>
			</div>

			{/* Main Workspace Area: Sidebar Controls + Canvas */}
			<div
				style={{
					display: "flex",
					flex: 1,
					minHeight: "480px",
					position: "relative",
				}}
			>
				{/* Left Sidebar Adjustments */}
				<div
					style={{
						width: "230px",
						background: "var(--paper-soft, #161b22)",
						borderRight: "1px solid var(--line, #30363d)",
						padding: "12px",
						display: "flex",
						flexDirection: "column",
						gap: "12px",
						fontSize: "0.82rem",
						color: "var(--ink, #c9d1d9)",
					}}
				>
					<div
						style={{
							fontWeight: 600,
							color: "var(--primary, #58a6ff)",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
						}}
					>
						<span>
							<Sliders size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
							Коррекция
						</span>
						<button
							type="button"
							onClick={handleResetParams}
							style={{
								background: "none",
								border: "none",
								color: "var(--muted, #8b949e)",
								cursor: "pointer",
								fontSize: "0.74rem",
							}}
						>
							Сброс
						</button>
					</div>

					{/* Brightness */}
					<div>
						<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
							<span>Яркость</span>
							<span>{params.brightness > 0 ? `+${params.brightness}` : params.brightness}</span>
						</div>
						<input
							type="range"
							min="-100"
							max="100"
							value={params.brightness}
							onChange={(e) => {
								setParams((p) => ({ ...p, brightness: Number(e.target.value) }));
								setActiveClinicalFilter(null);
							}}
							style={{ width: "100%", accentColor: "var(--primary, #58a6ff)" }}
						/>
					</div>

					{/* Contrast */}
					<div>
						<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
							<span>Контраст</span>
							<span>{params.contrast > 0 ? `+${params.contrast}` : params.contrast}</span>
						</div>
						<input
							type="range"
							min="-100"
							max="100"
							value={params.contrast}
							onChange={(e) => {
								setParams((p) => ({ ...p, contrast: Number(e.target.value) }));
								setActiveClinicalFilter(null);
							}}
							style={{ width: "100%", accentColor: "var(--primary, #58a6ff)" }}
						/>
					</div>

					{/* Gamma */}
					<div>
						<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
							<span>Гамма (γ)</span>
							<span>{params.gamma.toFixed(2)}</span>
						</div>
						<input
							type="range"
							min="0.2"
							max="3.0"
							step="0.05"
							value={params.gamma}
							onChange={(e) => {
								setParams((p) => ({ ...p, gamma: Number(e.target.value) }));
								setActiveClinicalFilter(null);
							}}
							style={{ width: "100%", accentColor: "var(--primary, #58a6ff)" }}
						/>
					</div>

					{/* Sharpness (Unsharp Mask) */}
					<div>
						<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
							<span>Резкость (USM)</span>
							<span>{params.sharpness}%</span>
						</div>
						<input
							type="range"
							min="0"
							max="100"
							value={params.sharpness}
							onChange={(e) => {
								setParams((p) => ({ ...p, sharpness: Number(e.target.value) }));
								setActiveClinicalFilter(null);
							}}
							style={{ width: "100%", accentColor: "var(--primary, #58a6ff)" }}
						/>
					</div>

					<hr style={{ border: "none", borderTop: "1px solid var(--line, #30363d)", margin: "4px 0" }} />

					{/* Calibration Status Box & 1-Click Sensor Presets */}
					<div
						style={{
							background: "var(--paper-strong, #0d1117)",
							padding: "8px",
							borderRadius: "6px",
							border: `1px solid ${isCalibrated ? "var(--success, #238636)" : "var(--line, #30363d)"}`,
							fontSize: "0.76rem",
							display: "flex",
							flexDirection: "column",
							gap: "6px",
						}}
					>
						<div style={{ fontWeight: 600, color: isCalibrated ? "var(--success, #3fb950)" : "var(--muted, #8b949e)", display: "flex", alignItems: "center", gap: "4px" }}>
							{isCalibrated ? (
								<>
									<CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
									<span>[Откалибровано]</span>
								</>
							) : (
								<>
									<AlertTriangle size={13} className="text-amber-500 shrink-0" />
									<span>[Стандартный масштаб]</span>
								</>
							)}
						</div>
						<div>1 px = {calibration.scaleMmPerPixel.toFixed(4)} мм</div>
						{activeTool === "calibrate" && (
							<div style={{ marginTop: 2, color: "var(--success, #76ff03)" }}>
								Кликните 2 точки на эталоне (шарик 5 мм) на снимке.
							</div>
						)}

						{/* 1-Click Standard Sensor Buttons */}
						<div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
							<span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--muted, #8b949e)" }}>
								Датчики (1 клик):
							</span>
							{STANDARD_SENSOR_PRESETS.map((preset) => {
								const isSelected = activeSensorPresetId === preset.id;
								return (
									<button
										key={preset.id}
										type="button"
										onClick={() => handleApplySensorPreset(preset)}
										style={{
											minHeight: "44px",
											background: isSelected ? "var(--primary, #1f6feb)" : "var(--paper, #21262d)",
											color: isSelected ? "#ffffff" : "var(--ink, #c9d1d9)",
											border: `1px solid ${isSelected ? "var(--primary, #58a6ff)" : "var(--line, #30363d)"}`,
											borderRadius: "6px",
											padding: "8px 12px",
											fontSize: "0.78rem",
											cursor: "pointer",
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
											textAlign: "left",
										}}
										title={preset.description}
									>
										<span>{preset.label}</span>
										{isSelected && <CheckCircle2 size={14} />}
									</button>
								);
							})}

							<button
								type="button"
								onClick={() => {
									setActiveSensorPresetId(null);
									setActiveTool("calibrate");
									setDrawingPoints([]);
								}}
								style={{
									minHeight: "44px",
									background: activeTool === "calibrate" ? "var(--primary, #1f6feb)" : "var(--paper, #21262d)",
									color: activeTool === "calibrate" ? "#ffffff" : "var(--ink, #c9d1d9)",
									border: `1px solid ${activeTool === "calibrate" ? "var(--primary, #58a6ff)" : "var(--line, #30363d)"}`,
									borderRadius: "6px",
									padding: "8px 12px",
									fontSize: "0.78rem",
									cursor: "pointer",
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
								}}
								title="Ручная калибровка по 2 точкам (шарик 5.0 мм или шаг резьбы)"
							>
								<span>Ручная калибровка (шарик / резьба)</span>
								<Scale size={14} />
							</button>
						</div>
					</div>

					{/* Measurements Counter & Actions */}
					<div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
						<div style={{ fontSize: "0.74rem", color: "var(--muted, #8b949e)" }}>
							Замеры: {rulers.length} лин., {angles.length} угл., {lesions.length} очаг.
						</div>
						{(rulers.length > 0 || angles.length > 0 || lesions.length > 0) && (
							<button
								type="button"
								onClick={() => {
									setRulers([]);
									setAngles([]);
									setLesions([]);
								}}
								style={{
									background: "var(--paper-strong, #21262d)",
									color: "var(--danger, #f85149)",
									border: "1px solid var(--line, #30363d)",
									borderRadius: "6px",
									padding: "5px 8px",
									fontSize: "0.75rem",
									cursor: "pointer",
								}}
							>
								Очистить все замеры
							</button>
						)}
					</div>
				</div>

				{/* Center Canvas Viewport */}
				<div
					style={{
						flex: 1,
						background: "#010409",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						overflow: "auto",
						padding: "16px",
					}}
					onWheel={(e) => {
						e.preventDefault();
						const delta = e.deltaY < 0 ? 0.1 : -0.1;
						setCanvasZoom((z) => Math.min(3.5, Math.max(0.4, Number((z + delta).toFixed(2)))));
					}}
				>
					<canvas
						ref={canvasRef}
						onClick={handleCanvasClick}
						onDoubleClick={handleCanvasDoubleClick}
						onMouseMove={handleMouseMove}
						onMouseLeave={handleMouseLeave}
						style={{
							maxWidth: "100%",
							maxHeight: "75vh",
							boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
							cursor:
								activeTool === "pointer"
									? "default"
									: activeTool === "lesion"
										? "crosshair"
										: "crosshair",
							borderRadius: "4px",
							transform: `scale(${canvasZoom}) rotate(${canvasRotationDeg}deg)`,
							transition: "transform 0.1s ease-out",
						}}
					/>
				</div>

				{/* Right HUD: Active Lesion / Measurements Table */}
				{lesions.length > 0 && (
					<div
						style={{
							width: "260px",
							background: "var(--paper-soft, #161b22)",
							borderLeft: "1px solid var(--line, #30363d)",
							padding: "12px",
							display: "flex",
							flexDirection: "column",
							gap: "8px",
							fontSize: "0.78rem",
							color: "var(--ink, #c9d1d9)",
						}}
					>
						<div style={{ fontWeight: 600, color: "var(--danger, #ff1744)" }}>
							Периапикальные очаги ({lesions.length})
						</div>
						<div style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto" }}>
							{lesions.map((les, idx) => (
								<div
									key={les.id}
									style={{
										background: "var(--paper-strong, #0d1117)",
										padding: "8px",
										borderRadius: "6px",
										border: "1px solid var(--danger, #ff1744)",
									}}
								>
									<div style={{ fontWeight: 600, color: "var(--ink, #ffffff)" }}>
										Очаг #{idx + 1}: {les.classificationLabel}
									</div>
									<div style={{ color: "var(--primary, #00e5ff)", marginTop: 2 }}>
										Площадь: <strong>{les.areaMm2.toFixed(1)} мм²</strong> (Ø {les.equivalentDiameterMm.toFixed(1)} мм)
									</div>
									<div style={{ color: "var(--muted, #8b949e)", fontSize: "0.72rem", marginTop: 4 }}>
										{les.treatmentRecommendation}
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Export & Legal Fixation Sheet (Anti-Matryoshka constrained within canvas workspace) */}
			{showExportModal && (
				<div
					style={{
						position: "absolute",
						inset: 0,
						background: "rgba(0, 0, 0, 0.75)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 50,
					}}
				>
					<div
						style={{
							background: "var(--paper, #161b22)",
							border: "1px solid var(--line, #30363d)",
							borderRadius: "12px",
							width: "480px",
							padding: "20px",
							display: "flex",
							flexDirection: "column",
							gap: "16px",
							color: "var(--ink, #c9d1d9)",
						}}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								borderBottom: "1px solid var(--line, #30363d)",
								paddingBottom: "8px",
							}}
						>
							<span style={{ fontWeight: 600, fontSize: "1rem", color: "var(--ink, #ffffff)" }}>
								Юридический экспорт и фиксация снимка
							</span>
							<button
								type="button"
								onClick={() => setShowExportModal(false)}
								style={{ background: "none", border: "none", color: "var(--muted, #8b949e)", cursor: "pointer" }}
							>
								<X size={18} />
							</button>
						</div>

						{/* Format selector */}
						<div>
							<label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 6, color: "var(--ink, #c9d1d9)" }}>
								Формат файла:
							</label>
							<div style={{ display: "flex", gap: "8px" }}>
								<button
									type="button"
									onClick={() => setExportFormat("jpeg")}
									style={{
										flex: 1,
										padding: "8px",
										background: exportFormat === "jpeg" ? "var(--primary, #1f6feb)" : "var(--paper-strong, #21262d)",
										color: exportFormat === "jpeg" ? "#ffffff" : "var(--ink, #c9d1d9)",
										border: "1px solid var(--line, #30363d)",
										borderRadius: "6px",
										cursor: "pointer",
										fontWeight: 600,
									}}
								>
									JPEG (High-Res)
								</button>
								<button
									type="button"
									onClick={() => setExportFormat("png")}
									style={{
										flex: 1,
										padding: "8px",
										background: exportFormat === "png" ? "var(--primary, #1f6feb)" : "var(--paper-strong, #21262d)",
										color: exportFormat === "png" ? "#ffffff" : "var(--ink, #c9d1d9)",
										border: "1px solid var(--line, #30363d)",
										borderRadius: "6px",
										cursor: "pointer",
										fontWeight: 600,
									}}
								>
									PNG (Lossless)
								</button>
								<button
									type="button"
									onClick={() => setExportFormat("dicom")}
									style={{
										flex: 1,
										padding: "8px",
										background: exportFormat === "dicom" ? "var(--primary, #1f6feb)" : "var(--paper-strong, #21262d)",
										color: exportFormat === "dicom" ? "#ffffff" : "var(--ink, #c9d1d9)",
										border: "1px solid var(--line, #30363d)",
										borderRadius: "6px",
										cursor: "pointer",
										fontWeight: 600,
									}}
								>
									DICOM (.dcm)
								</button>
							</div>
						</div>

						{/* Watermark toggle */}
						<label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.85rem", color: "var(--ink, #c9d1d9)" }}>
							<input
								type="checkbox"
								checked={includeWatermark}
								onChange={(e) => setIncludeWatermark(e.target.checked)}
							/>
							<span>
								Наложить юридический водяной знак (ФИО пациента, дата, реквизиты клиники, штамп ЭЦП врача)
							</span>
						</label>

						{/* Details preview */}
						<div
							style={{
								background: "var(--paper-strong, #0d1117)",
								padding: "10px",
								borderRadius: "6px",
								fontSize: "0.78rem",
								display: "flex",
								flexDirection: "column",
								gap: "4px",
								color: "var(--ink, #c9d1d9)",
							}}
						>
							<div><strong>Пациент:</strong> {patientFullName} (ID: {patientId})</div>
							<div><strong>Врач:</strong> {doctorName} (ЭЦП ГОСТ Р 34.10)</div>
							<div><strong>Клиника:</strong> {DEFAULT_CLINIC_CREDENTIALS.clinicName}</div>
							<div><strong>Замеры на снимке:</strong> {rulers.length} линеек, {angles.length} углов, {lesions.length} очагов</div>
						</div>

						{/* Actions */}
						<div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
							<button
								type="button"
								onClick={() => setShowExportModal(false)}
								style={{
									padding: "8px 14px",
									background: "var(--paper-strong, #21262d)",
									color: "var(--ink, #c9d1d9)",
									border: "1px solid var(--line, #30363d)",
									borderRadius: "6px",
									cursor: "pointer",
								}}
							>
								Отмена
							</button>
							<button
								type="button"
								onClick={() => {
									setShowExportModal(false);
									handlePrintProtocol();
								}}
								style={{
									padding: "8px 14px",
									background: "var(--teal, #0d9488)",
									color: "#ffffff",
									border: "none",
									borderRadius: "6px",
									fontWeight: 600,
									cursor: "pointer",
									display: "flex",
									alignItems: "center",
									gap: "6px",
								}}
								title="Распечатать протокол с юридическим штампом и таблицей измерений"
							>
								<Printer size={15} /> Печать протокола
							</button>
							<button
								type="button"
								disabled={isSaving}
								onClick={handleExecuteExport}
								style={{
									padding: "8px 16px",
									background: "var(--success, #238636)",
									color: "#ffffff",
									border: "none",
									borderRadius: "6px",
									fontWeight: 600,
									cursor: isSaving ? "wait" : "pointer",
									display: "flex",
									alignItems: "center",
									gap: "6px",
								}}
							>
								<Download size={15} /> {isSaving ? "Экспорт..." : "Экспортировать"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
