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
	CornerDownLeft,
	Download,
	FileDown,
	FileText,
	Maximize2,
	MousePointer,
	Move,
	Plus,
	RotateCcw,
	RotateCw,
	Ruler,
	Save,
	Scale,
	Sliders,
	Sparkles,
	Trash2,
	X,
	Zap,
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
	type AngleMeasurement,
	type PeriapicalLesion,
	type Point2D,
	type RulerMeasurement,
} from "./VisiographMeasurementMath";

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

	// Image adjustments
	const [params, setParams] = useState<VisiographImageParams>({
		...DEFAULT_VISIOGRAPH_IMAGE_PARAMS,
	});

	// Active clinical 1-click filter
	const [activeClinicalFilter, setActiveClinicalFilter] = useState<string | null>(null);

	// Active tool
	const [activeTool, setActiveTool] = useState<ActiveVisiographTool>(initialTool);

	// Calibration
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

	// Load source image (<50ms instantaneous open without blocking on AI or calibration)
	useEffect(() => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => {
			imageRef.current = img;
			drawCanvas();
		};
		img.src = imageUrl;
		if (img.complete && img.naturalWidth > 0) {
			imageRef.current = img;
			drawCanvas();
		}
	}, [imageUrl]);

	// Redraw when adjustments or measurements change
	const drawCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		const img = imageRef.current;
		if (!canvas || !img) return;

		const ctx = canvas.getContext("2d", { willReadFrequently: true });
		if (!ctx) return;

		// 1. Process and draw image
		processorRef.current.render(img, canvas, params);

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
						ctx.fillText(`⚡ WL = ${lengthMm.toFixed(1)} мм (Апекс)`, last.x + 8, last.y - 8);
					}
				}
			}
		}
		ctx.restore();
	}, [
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
			newRuler.color = "#10b981";
			setRulers((prev) => [...prev, newRuler]);
			setDrawingPoints([]);
		}
	};

	const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const pt = getCanvasPoint(e);
		setHoverPos(pt);
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

	// Apply Preset
	const handleApplyPreset = (presetName: string) => {
		setActiveClinicalFilter(null);
		switch (presetName) {
			case "endo":
				setParams({ brightness: -5, contrast: 45, gamma: 0.85, sharpness: 55, invert: false });
				break;
			case "bone":
				setParams({ brightness: 5, contrast: 25, gamma: 0.9, sharpness: 35, invert: false });
				break;
			case "enamel":
				setParams({ brightness: -10, contrast: 45, gamma: 1.1, sharpness: 50, invert: false });
				break;
			case "soft":
				setParams({ brightness: 15, contrast: 15, gamma: 0.7, sharpness: 10, invert: false });
				break;
			case "invert":
				setParams((prev) => ({ ...prev, invert: !prev.invert }));
				break;
			default:
				handleResetParams();
		}
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
				background: "#0d1117",
				color: "#c9d1d9",
				borderRadius: "12px",
				border: "1px solid #30363d",
				overflow: "hidden",
				minHeight: "580px",
			}}
		>
			{/* Top Bar with Tools and Preset Buttons */}
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "8px 12px",
					background: "#161b22",
					borderBottom: "1px solid #30363d",
					gap: "8px",
				}}
			>
				{/* Tool selector */}
				<div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
					<button
						type="button"
						onClick={() => {
							setActiveTool("pointer");
							setDrawingPoints([]);
						}}
						style={{
							background: activeTool === "pointer" ? "#1f6feb" : "#21262d",
							color: "#ffffff",
							border: "1px solid #30363d",
							borderRadius: "6px",
							padding: "6px 10px",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: "4px",
							fontSize: "0.82rem",
						}}
						title="Указатель (Просмотр)"
					>
						<MousePointer size={14} /> Указатель
					</button>

					<button
						type="button"
						onClick={() => {
							setActiveTool("ruler");
							setDrawingPoints([]);
						}}
						style={{
							background: activeTool === "ruler" ? "#1f6feb" : "#21262d",
							color: "#00e5ff",
							border: "1px solid #30363d",
							borderRadius: "6px",
							padding: "6px 10px",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: "4px",
							fontSize: "0.82rem",
							fontWeight: 600,
						}}
						title="Измерить расстояние между двумя точками (мм)"
					>
						<Ruler size={14} /> Линейка (мм)
					</button>

					<button
						type="button"
						onClick={() => {
							setActiveTool("calibrate");
							setDrawingPoints([]);
						}}
						style={{
							background: activeTool === "calibrate" ? "#1f6feb" : "#21262d",
							color: "#76ff03",
							border: "1px solid #30363d",
							borderRadius: "6px",
							padding: "6px 10px",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: "4px",
							fontSize: "0.82rem",
							fontWeight: 600,
						}}
						title="Калибровка по эталону (5 мм шарик или резьба)"
					>
						<Scale size={14} /> Калибровка
					</button>

					<button
						type="button"
						onClick={() => {
							setActiveTool("angle");
							setDrawingPoints([]);
						}}
						style={{
							background: activeTool === "angle" ? "#1f6feb" : "#21262d",
							color: "#ffab00",
							border: "1px solid #30363d",
							borderRadius: "6px",
							padding: "6px 10px",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: "4px",
							fontSize: "0.82rem",
							fontWeight: 600,
						}}
						title="Измерить угол наклона оси зуба или шахты имплантата"
					>
						<Compass size={14} /> Угломер
					</button>

					<button
						type="button"
						onClick={() => {
							setActiveTool("lesion");
							setDrawingPoints([]);
						}}
						style={{
							background: activeTool === "lesion" ? "#1f6feb" : "#21262d",
							color: "#ff1744",
							border: "1px solid #30363d",
							borderRadius: "6px",
							padding: "6px 10px",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: "4px",
							fontSize: "0.82rem",
							fontWeight: 600,
						}}
						title="Выделить очаг деструкции (гранулема, киста) и рассчитать площадь в мм²"
					>
						<AlertTriangle size={14} /> Очаг деструкции (мм²)
					</button>

					<button
						type="button"
						onClick={() => {
							setActiveTool("root_canal");
							setDrawingPoints([]);
						}}
						style={{
							background: activeTool === "root_canal" ? "#047857" : "#21262d",
							color: activeTool === "root_canal" ? "#a7f3d0" : "#10b981",
							border: `1px solid ${activeTool === "root_canal" ? "#10b981" : "#30363d"}`,
							borderRadius: "6px",
							padding: "6px 10px",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: "4px",
							fontSize: "0.82rem",
							fontWeight: 700,
						}}
						title="Эндо-линейка (Apex Locator): измерение длины корневого канала в мм по анатомической кривой корня (двойной клик для фиксации)"
					>
						<Activity size={14} /> Эндо-линейка (Апекс, мм)
					</button>
				</div>

				{/* 1-Click Clinical Filters Toolbar */}
				<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
					{CLINICAL_VISIOGRAPH_FILTERS.map((filter) => {
						const isActive = activeClinicalFilter === filter.id;
						return (
							<button
								key={filter.id}
								type="button"
								onClick={() => handleApplyClinicalFilter(filter)}
								style={{
									background: isActive ? "#1f6feb" : "#21262d",
									color: isActive ? "#ffffff" : "#c9d1d9",
									border: `1px solid ${isActive ? "#58a6ff" : "#30363d"}`,
									borderRadius: "6px",
									padding: "5px 9px",
									fontSize: "0.78rem",
									cursor: "pointer",
									fontWeight: isActive ? 700 : 600,
									display: "flex",
									alignItems: "center",
									gap: "4px",
									transition: "all 0.15s ease",
									boxShadow: isActive ? "0 0 8px rgba(31, 111, 235, 0.45)" : "none",
								}}
								title={`${filter.label} (${filter.badge}): ${filter.description}`}
							>
								<Zap size={13} style={{ color: isActive ? "#ffd600" : "#58a6ff", fill: isActive ? "#ffd600" : "none" }} />
								<span>{filter.label}</span>
							</button>
						);
					})}

					<button
						type="button"
						onClick={() => setParams((prev) => ({ ...prev, invert: !prev.invert }))}
						style={{
							background: params.invert ? "#238636" : "#21262d",
							color: "#ffffff",
							border: "1px solid #30363d",
							borderRadius: "6px",
							padding: "5px 8px",
							fontSize: "0.78rem",
							cursor: "pointer",
							fontWeight: params.invert ? 600 : 400,
						}}
						title="Инверсия негатив / позитив"
					>
						Негатив
					</button>

					<button
						type="button"
						onClick={() => setCanvasRotationDeg((r) => (r + 90) % 360)}
						style={{
							background: "#21262d",
							color: "#c9d1d9",
							border: "1px solid #30363d",
							borderRadius: "6px",
							padding: "5px 8px",
							fontSize: "0.78rem",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: "3px",
						}}
						title="Повернуть снимок на 90°"
					>
						<RotateCw size={13} /> 90°
					</button>

					<button
						type="button"
						onClick={() => setCanvasRotationDeg((r) => (r + 180) % 360)}
						style={{
							background: "#21262d",
							color: "#c9d1d9",
							border: "1px solid #30363d",
							borderRadius: "6px",
							padding: "5px 8px",
							fontSize: "0.78rem",
							cursor: "pointer",
							fontWeight: 600,
						}}
						title="Повернуть снимок на 180° (верхняя / нижняя челюсть)"
					>
						180°
					</button>

					<div style={{ display: "flex", alignItems: "center", gap: "2px", marginLeft: "4px" }}>
						<button
							type="button"
							onClick={() => setCanvasZoom((z) => Math.max(0.4, Number((z - 0.2).toFixed(2))))}
							style={{
								background: "#21262d",
								color: "#c9d1d9",
								border: "1px solid #30363d",
								borderRadius: "6px 0 0 6px",
								padding: "5px 6px",
								fontSize: "0.78rem",
								cursor: "pointer",
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
								background: "#21262d",
								color: "#58a6ff",
								borderTop: "1px solid #30363d",
								borderBottom: "1px solid #30363d",
								borderLeft: "none",
								borderRight: "none",
								padding: "5px 6px",
								fontSize: "0.74rem",
								cursor: "pointer",
								fontFamily: "monospace",
							}}
							title="Сброс масштаба и поворота (колесо мыши также масштабирует снимок)"
						>
							{Math.round(canvasZoom * 100)}%
						</button>
						<button
							type="button"
							onClick={() => setCanvasZoom((z) => Math.min(3.5, Number((z + 0.2).toFixed(2))))}
							style={{
								background: "#21262d",
								color: "#c9d1d9",
								border: "1px solid #30363d",
								borderRadius: "0 6px 6px 0",
								padding: "5px 6px",
								fontSize: "0.78rem",
								cursor: "pointer",
							}}
							title="Увеличить масштаб"
						>
							<ZoomIn size={13} />
						</button>
					</div>

					<button
						type="button"
						onClick={() => setShowExportModal(true)}
						style={{
							background: "#238636",
							color: "#ffffff",
							border: "none",
							borderRadius: "6px",
							padding: "6px 12px",
							fontSize: "0.84rem",
							fontWeight: 600,
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: "4px",
						}}
					>
						<FileDown size={15} /> Экспорт и ЭЦП
					</button>

					{onClose && (
						<button
							type="button"
							onClick={onClose}
							style={{
								background: "transparent",
								color: "#8b949e",
								border: "none",
								cursor: "pointer",
								padding: "4px",
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
						background: "#161b22",
						borderRight: "1px solid #30363d",
						padding: "12px",
						display: "flex",
						flexDirection: "column",
						gap: "12px",
						fontSize: "0.82rem",
					}}
				>
					<div
						style={{
							fontWeight: 600,
							color: "#58a6ff",
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
								color: "#8b949e",
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
							style={{ width: "100%", accentColor: "#58a6ff" }}
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
							style={{ width: "100%", accentColor: "#58a6ff" }}
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
							style={{ width: "100%", accentColor: "#58a6ff" }}
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
							style={{ width: "100%", accentColor: "#58a6ff" }}
						/>
					</div>

					<hr style={{ border: "none", borderTop: "1px solid #30363d", margin: "4px 0" }} />

					{/* Calibration Status Box */}
					<div
						style={{
							background: "#0d1117",
							padding: "8px",
							borderRadius: "6px",
							border: `1px solid ${isCalibrated ? "#238636" : "#30363d"}`,
							fontSize: "0.76rem",
						}}
					>
						<div style={{ fontWeight: 600, color: isCalibrated ? "#3fb950" : "#8b949e", marginBottom: 4 }}>
							{isCalibrated ? "✓ Откалибровано" : "⚠️ Стандартный масштаб"}
						</div>
						<div>1 px = {calibration.scaleMmPerPixel.toFixed(4)} мм</div>
						{activeTool === "calibrate" && (
							<div style={{ marginTop: 6, color: "#76ff03" }}>
								Кликните 2 точки на эталоне (шарик 5 мм) на снимке.
							</div>
						)}
					</div>

					{/* Measurements Counter & Actions */}
					<div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
						<div style={{ fontSize: "0.74rem", color: "#8b949e" }}>
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
									background: "#21262d",
									color: "#f85149",
									border: "1px solid #30363d",
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
							background: "#161b22",
							borderLeft: "1px solid #30363d",
							padding: "12px",
							display: "flex",
							flexDirection: "column",
							gap: "8px",
							fontSize: "0.78rem",
						}}
					>
						<div style={{ fontWeight: 600, color: "#ff1744" }}>
							Периапикальные очаги ({lesions.length})
						</div>
						<div style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto" }}>
							{lesions.map((les, idx) => (
								<div
									key={les.id}
									style={{
										background: "#0d1117",
										padding: "8px",
										borderRadius: "6px",
										border: "1px solid #ff1744",
									}}
								>
									<div style={{ fontWeight: 600, color: "#ffffff" }}>
										Очаг #{idx + 1}: {les.classificationLabel}
									</div>
									<div style={{ color: "#00e5ff", marginTop: 2 }}>
										Площадь: <strong>{les.areaMm2.toFixed(1)} мм²</strong> (Ø {les.equivalentDiameterMm.toFixed(1)} мм)
									</div>
									<div style={{ color: "#8b949e", fontSize: "0.72rem", marginTop: 4 }}>
										{les.treatmentRecommendation}
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Export & Legal Fixation Modal */}
			{showExportModal && (
				<div
					style={{
						position: "fixed",
						inset: 0,
						background: "rgba(0, 0, 0, 0.75)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 9999,
					}}
				>
					<div
						style={{
							background: "#161b22",
							border: "1px solid #30363d",
							borderRadius: "12px",
							width: "480px",
							padding: "20px",
							display: "flex",
							flexDirection: "column",
							gap: "16px",
							color: "#c9d1d9",
						}}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								borderBottom: "1px solid #30363d",
								paddingBottom: "8px",
							}}
						>
							<span style={{ fontWeight: 600, fontSize: "1rem", color: "#ffffff" }}>
								Юридический экспорт и фиксация снимка
							</span>
							<button
								type="button"
								onClick={() => setShowExportModal(false)}
								style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer" }}
							>
								<X size={18} />
							</button>
						</div>

						{/* Format selector */}
						<div>
							<label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 6 }}>
								Формат файла:
							</label>
							<div style={{ display: "flex", gap: "8px" }}>
								<button
									type="button"
									onClick={() => setExportFormat("jpeg")}
									style={{
										flex: 1,
										padding: "8px",
										background: exportFormat === "jpeg" ? "#1f6feb" : "#21262d",
										color: "#ffffff",
										border: "1px solid #30363d",
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
										background: exportFormat === "png" ? "#1f6feb" : "#21262d",
										color: "#ffffff",
										border: "1px solid #30363d",
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
										background: exportFormat === "dicom" ? "#1f6feb" : "#21262d",
										color: "#ffffff",
										border: "1px solid #30363d",
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
						<label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.85rem" }}>
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
								background: "#0d1117",
								padding: "10px",
								borderRadius: "6px",
								fontSize: "0.78rem",
								display: "flex",
								flexDirection: "column",
								gap: "4px",
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
									background: "#21262d",
									color: "#c9d1d9",
									border: "1px solid #30363d",
									borderRadius: "6px",
									cursor: "pointer",
								}}
							>
								Отмена
							</button>
							<button
								type="button"
								disabled={isSaving}
								onClick={handleExecuteExport}
								style={{
									padding: "8px 16px",
									background: "#238636",
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
