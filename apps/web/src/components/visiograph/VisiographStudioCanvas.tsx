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

import { AlertTriangle, CheckCircle2, Scale } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { disposeWebGlRenderingContext } from "@dental/shared";
import type { ClinicalVisiographFilterPreset } from "./VisiographWindowPresets";
import {
	DEFAULT_VISIOGRAPH_IMAGE_PARAMS,
	VisiographImageProcessor,
	type VisiographImageParams,
} from "./VisiographImageProcessor";
import { renderMeasurementsOverlay } from "./VisiographLegalWatermark";
import {
	type CalibrationReference,
	type CalibrationReferenceType,
	DEFAULT_PIXEL_SCALE_MM,
	DENTAL_SENSOR_PRESETS,
	type DentalSensorPreset,
	recalculateLesionsWithScale,
	recalculateRulersWithScale,
	type AngleMeasurement,
	type PeriapicalLesion,
	type Point2D,
	type RulerMeasurement,
} from "./VisiographMeasurementMath";
import { printVisiographLegalProtocol } from "./VisiographLegalPrintProtocol";
import {
	drawInteractiveOverlay,
	type ActiveVisiographToolType,
} from "./VisiographInteractiveOverlay";
import {
	handleToolCanvasClick,
	handleToolCanvasDoubleClick,
} from "./VisiographToolInteractions";
import { VisiographExportModal } from "./VisiographExportModal";
import { VisiographTopToolbar } from "./VisiographTopToolbar";
import { VisiographLesionsHud } from "./VisiographLesionsHud";
import { VisiographImageSliders } from "./VisiographImageSliders";

export type SensorCalibrationPreset = DentalSensorPreset;

export const STANDARD_SENSOR_PRESETS: readonly SensorCalibrationPreset[] = DENTAL_SENSOR_PRESETS;

export { recalculateRulersWithScale, recalculateLesionsWithScale };

export type ActiveVisiographTool = ActiveVisiographToolType;

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
	const [calibRefType] = useState<CalibrationReferenceType>("sphere_5mm");
	const [customMmInput] = useState<number>(5.0);

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
		drawInteractiveOverlay(ctx, {
			activeTool,
			drawingPoints,
			hoverPos,
			calibration,
		});
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
		handleToolCanvasClick({
			pt,
			activeTool,
			drawingPoints,
			calibration,
			calibRefType,
			customMmInput,
			toothCode,
			rulersCount: rulers.length,
			anglesCount: angles.length,
			setDrawingPoints,
			setRulers,
			setAngles,
			setLesions,
			setCalibration,
			setIsCalibrated,
			setActiveTool,
		});
	};

	const handleCanvasDoubleClick = () => {
		handleToolCanvasDoubleClick({
			activeTool,
			drawingPoints,
			calibration,
			toothCode,
			setDrawingPoints,
			setRulers,
			setLesions,
		});
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

	// Clean up pending animation frame and heavy canvas/image backing stores on unmount
	useEffect(() => {
		return () => {
			if (hoverRafIdRef.current !== null && typeof cancelAnimationFrame !== "undefined") {
				cancelAnimationFrame(hoverRafIdRef.current);
				hoverRafIdRef.current = null;
			}
			if (canvasRef.current) {
				try {
					const webglContext =
						canvasRef.current.getContext("webgl2") ||
						canvasRef.current.getContext("webgl") ||
						canvasRef.current.getContext("experimental-webgl");
					if (webglContext) {
						disposeWebGlRenderingContext(webglContext);
					}
				} catch {
					// Canvas may have already been unmounted or context lost
				}
				canvasRef.current.width = 0;
				canvasRef.current.height = 0;
			}
			if (processedCanvasRef.current) {
				try {
					const offscreenGl =
						processedCanvasRef.current.getContext("webgl2") ||
						processedCanvasRef.current.getContext("webgl") ||
						processedCanvasRef.current.getContext("experimental-webgl");
					if (offscreenGl) {
						disposeWebGlRenderingContext(offscreenGl);
					}
				} catch {
					// Offscreen context may not exist or already disposed
				}
				processedCanvasRef.current.width = 0;
				processedCanvasRef.current.height = 0;
				processedCanvasRef.current = null;
			}
			if (imageRef.current) {
				imageRef.current.onload = null;
				imageRef.current.src = "";
				imageRef.current = null;
			}
			lastProcessedImageRef.current = null;
			lastProcessedParamsRef.current = null;
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

	const handlePrintProtocol = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		printVisiographLegalProtocol({
			canvas,
			patientId,
			patientFullName,
			doctorName,
			studyId,
			toothCode,
			isCalibrated,
			calibration,
			rulers,
			angles,
			lesions,
		});
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
			<VisiographTopToolbar
				activeTool={activeTool}
				setActiveTool={setActiveTool}
				onClearDrawing={() => setDrawingPoints([])}
				params={params}
				setParams={setParams}
				activeClinicalFilter={activeClinicalFilter}
				onApplyClinicalFilter={handleApplyClinicalFilter}
				canvasZoom={canvasZoom}
				setCanvasZoom={setCanvasZoom}
				setCanvasRotationDeg={setCanvasRotationDeg}
				sensorPresets={STANDARD_SENSOR_PRESETS}
				activeSensorPresetId={activeSensorPresetId}
				isCalibrated={isCalibrated}
				onApplySensorPreset={handleApplySensorPreset}
				onResetAll={() => {
					handleResetParams();
					setCanvasZoom(1.0);
					setCanvasRotationDeg(0);
				}}
				onPrintProtocol={handlePrintProtocol}
				onOpenExportModal={() => setShowExportModal(true)}
				onClose={onClose}
			/>

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
					<VisiographImageSliders
						params={params}
						setParams={setParams}
						onResetParams={handleResetParams}
						setActiveClinicalFilter={setActiveClinicalFilter}
					/>

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
						background: "var(--dark-bg, #010409)",
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
				<VisiographLesionsHud lesions={lesions} />
			</div>

			{/* Export & Legal Fixation Sheet */}
			<VisiographExportModal
				isOpen={showExportModal}
				onClose={() => setShowExportModal(false)}
				canvasRef={canvasRef}
				patientId={patientId}
				patientFullName={patientFullName}
				doctorName={doctorName}
				studyId={studyId}
				toothCode={toothCode}
				rulers={rulers}
				angles={angles}
				lesions={lesions}
				calibration={calibration}
				isCalibrated={isCalibrated}
				onSaveToRecord={onSaveToRecord}
				onPrintProtocol={handlePrintProtocol}
			/>
		</div>
	);
}
