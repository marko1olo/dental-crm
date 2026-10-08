import { UploadCloud } from "lucide-react";
import React, {
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	CEPHALOMETRIC_LANDMARKS,
	type LandmarkKey,
	type LandmarkMap,
	type Point2D,
} from "./cephalometricMath";
import { showToast } from "../GlobalToast";
import { isDemoShowcaseMode } from "../../lib/demoMode.js";
import {
	CephalometricHudStrip,
	type XrayFilterMode,
} from "./CephalometricHudStrip";
import { CephalometricSvgOverlay } from "./CephalometricSvgOverlay";

export { CephalometricHudStrip, CephalometricSvgOverlay, type XrayFilterMode };

export const SAMPLE_TRG_CEPHALOGRAM_URL = "/radiology/sample_trg_cephalogram.jpg";

export interface CephalometricCanvasProps {
	landmarks: LandmarkMap;
	onLandmarkChange: (key: LandmarkKey, point: Point2D) => void;
	onRemoveLandmark?: (key: LandmarkKey) => void;
	activeTargetKey: LandmarkKey | null;
	onSelectTargetKey: (key: LandmarkKey | null) => void;
	imageUrl: string | null;
	onImageUpload?: (imageUrl: string) => void;
	filterMode: XrayFilterMode;
	onFilterModeChange?: (mode: XrayFilterMode) => void;
	brightness: number;
	contrast: number;
	showPolygon: boolean;
	onTogglePolygon?: () => void;
	showLabels: boolean;
	onToggleLabels?: () => void;
	showPlanes: boolean;
	onTogglePlanes?: () => void;
	scaleMmPerPixel: number;
	onScaleChange?: (scale: number) => void;
	onLoadPreset?: () => void;
	onResetLandmarks?: () => void;
	onRunAiAutoPlacement?: () => void;
	isAiInferring?: boolean;
	aiBackendBadge?: string;
	aiBackendLabel?: string;
	aiBackendPref?: import("./cephAiInferenceService").CephAiBackendPreference;
	onChangeAiBackendPref?: (pref: import("./cephAiInferenceService").CephAiBackendPreference) => void;
	aiInferenceStats?: { latencyMs: number; placedCount: number } | null;
}

export function CephalometricCanvas({
	landmarks,
	onLandmarkChange,
	onRemoveLandmark,
	activeTargetKey,
	onSelectTargetKey,
	imageUrl,
	onImageUpload,
	filterMode,
	onFilterModeChange,
	brightness,
	contrast,
	showPolygon,
	onTogglePolygon,
	showLabels,
	onToggleLabels,
	showPlanes,
	onTogglePlanes,
	scaleMmPerPixel,
	onScaleChange,
	onLoadPreset,
	onResetLandmarks,
	onRunAiAutoPlacement,
	isAiInferring,
	aiBackendBadge,
	aiBackendLabel,
	aiBackendPref,
	onChangeAiBackendPref,
	aiInferenceStats,
}: CephalometricCanvasProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const svgRef = useRef<SVGSVGElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isDragOver, setIsDragOver] = useState(false);

	const handleFileProcess = useCallback(
		(file: File) => {
			if (!file.type.startsWith("image/") && !file.name.toLowerCase().endsWith(".dcm")) {
				return;
			}
			const reader = new FileReader();
			reader.onload = (ev) => {
				if (typeof ev.target?.result === "string" && onImageUpload) {
					onImageUpload(ev.target.result);
				}
			};
			reader.readAsDataURL(file);
		},
		[onImageUpload],
	);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDragOver(false);
			const file = e.dataTransfer.files?.[0];
			if (file) {
				handleFileProcess(file);
			}
		},
		[handleFileProcess],
	);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);
	}, []);

	// Viewport transformations (Pan and Zoom)
	const [zoom, setZoom] = useState<number>(1.0);
	const [pan, setPan] = useState<Point2D>({ x: 0, y: 0 });
	const [isPanning, setIsPanning] = useState(false);
	const [panStart, setPanStart] = useState<Point2D>({ x: 0, y: 0 });

	// Dragging existing landmark point
	const [draggingKey, setDraggingKey] = useState<LandmarkKey | null>(null);
	const [hoveredKey, setHoveredKey] = useState<LandmarkKey | null>(null);
	const [cursorImgPos, setCursorImgPos] = useState<Point2D | null>(null);

	// Calibration line mode
	const [isCalibrating, setIsCalibrating] = useState(false);
	const [calibrationPoints, setCalibrationPoints] = useState<Point2D[]>([]);

	// Default natural image dimensions (coordinate space for lateral ceph)
	const VIEWBOX_WIDTH = 800;
	const VIEWBOX_HEIGHT = 700;

	// Reset pan & zoom
	const handleResetView = useCallback(() => {
		setZoom(1.0);
		setPan({ x: 0, y: 0 });
	}, []);

	const ensureCephImage = useCallback((action: () => void) => {
		if (!imageUrl) {
			showToast("Сначала загрузите снимок ТРГ для калибровки и масштабирования", "info");
			return;
		}
		action();
	}, [imageUrl]);

	// Convert client coordinates (mouse/touch) to SVG viewBox coordinates
	const getSvgCoordinates = useCallback(
		(clientX: number, clientY: number): Point2D | null => {
			if (!svgRef.current) return null;
			const pt = svgRef.current.createSVGPoint();
			pt.x = clientX;
			pt.y = clientY;
			const ctm = svgRef.current.getScreenCTM();
			if (!ctm) return null;
			const transformed = pt.matrixTransform(ctm.inverse());
			return {
				x: Math.round(transformed.x * 10) / 10,
				y: Math.round(transformed.y * 10) / 10,
			};
		},
		[],
	);

	// Mouse Wheel Zoom
	const handleWheel = (e: React.WheelEvent) => {
		e.preventDefault();
		const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
		setZoom((prev) => Math.max(0.4, Math.min(3.5, Number((prev + zoomDelta).toFixed(2)))));
	};

	// Mouse Down on Canvas
	const handleMouseDown = (e: React.MouseEvent) => {
		// Middle click or Alt key initiates pan
		if (e.button === 1 || e.altKey || (!activeTargetKey && !hoveredKey)) {
			setIsPanning(true);
			setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
			return;
		}

		const svgCoords = getSvgCoordinates(e.clientX, e.clientY);
		if (!svgCoords) return;

		// If calibration mode is active
		if (isCalibrating) {
			if (calibrationPoints.length < 2) {
				const nextPts = [...calibrationPoints, svgCoords];
				setCalibrationPoints(nextPts);
				const p0 = nextPts[0];
				const p1 = nextPts[1];
				if (nextPts.length === 2 && p0 && p1 && onScaleChange) {
					// Assume 10mm calibration bar
					const distPx = Math.sqrt(
						(p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2,
					);
					if (distPx > 5) {
						const newScale = Number((10 / distPx).toFixed(4));
						onScaleChange(newScale);
					}
					setIsCalibrating(false);
					setCalibrationPoints([]);
				}
			}
			return;
		}

		// If clicking near an existing landmark, start dragging it
		if (hoveredKey) {
			setDraggingKey(hoveredKey);
			return;
		}

		// If placing active target landmark
		if (activeTargetKey) {
			onLandmarkChange(activeTargetKey, svgCoords);
			// Auto advance to next pending landmark
			const currentIndex = CEPHALOMETRIC_LANDMARKS.findIndex((l) => l.key === activeTargetKey);
			if (currentIndex !== -1 && currentIndex < CEPHALOMETRIC_LANDMARKS.length - 1) {
				const nextLandmark = CEPHALOMETRIC_LANDMARKS[currentIndex + 1];
				if (nextLandmark && !landmarks[nextLandmark.key]) {
					onSelectTargetKey(nextLandmark.key);
				}
			}
		}
	};

	// Mouse Move
	const handleMouseMove = (e: React.MouseEvent) => {
		if (isPanning) {
			setPan({
				x: e.clientX - panStart.x,
				y: e.clientY - panStart.y,
			});
			return;
		}

		const svgCoords = getSvgCoordinates(e.clientX, e.clientY);
		if (svgCoords) {
			setCursorImgPos(svgCoords);

			if (draggingKey) {
				onLandmarkChange(draggingKey, svgCoords);
			}
		}
	};

	// Mouse Up
	const handleMouseUp = () => {
		setIsPanning(false);
		setDraggingKey(null);
	};

	// Touch handlers for tablet / iPad ergonomics
	const handleTouchStart = (e: React.TouchEvent) => {
		if (e.touches.length === 1 && e.touches[0]) {
			const touch = e.touches[0];
			if (!activeTargetKey && !hoveredKey) {
				setIsPanning(true);
				setPanStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
			}
		}
	};

	const handleTouchMove = (e: React.TouchEvent) => {
		if (isPanning && e.touches.length === 1 && e.touches[0]) {
			const touch = e.touches[0];
			setPan({
				x: touch.clientX - panStart.x,
				y: touch.clientY - panStart.y,
			});
		}
	};

	const handleTouchEnd = () => {
		setIsPanning(false);
		setDraggingKey(null);
	};

	// Escape key to cancel landmark selection or calibration
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				if (isCalibrating) {
					setIsCalibrating(false);
					setCalibrationPoints([]);
				} else if (activeTargetKey) {
					onSelectTargetKey(null);
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [activeTargetKey, isCalibrating, onSelectTargetKey]);

	// CSS Filter Styles for X-ray manipulation
	const getFilterStyle = (): React.CSSProperties => {
		let filterString = `brightness(${brightness}%) contrast(${contrast}%)`;
		if (filterMode === "invert") {
			filterString += " invert(100%)";
		} else if (filterMode === "bone") {
			filterString += " contrast(180%) brightness(110%) saturate(75%)";
		} else if (filterMode === "edge") {
			filterString += " contrast(220%) grayscale(100%) invert(100%)";
		}
		return {
			filter: filterString,
			transition: "filter 0.2s ease",
		};
	};

	const placedLandmarksCount = CEPHALOMETRIC_LANDMARKS.filter((l) => landmarks[l.key] !== undefined).length;
	const isAllLandmarksPlaced = placedLandmarksCount >= CEPHALOMETRIC_LANDMARKS.length;

	return (
		<div
			ref={containerRef}
			data-testid="cephalometric-canvas-container"
			className="relative w-full h-full min-h-[340px] sm:min-h-[440px] lg:min-h-[620px] bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 flex items-center justify-center select-none"
			onWheel={imageUrl ? handleWheel : undefined}
			onMouseDown={imageUrl ? handleMouseDown : undefined}
			onMouseMove={imageUrl ? handleMouseMove : undefined}
			onMouseUp={imageUrl ? handleMouseUp : undefined}
			onMouseLeave={imageUrl ? handleMouseUp : undefined}
			onTouchStart={imageUrl ? handleTouchStart : undefined}
			onTouchMove={imageUrl ? handleTouchMove : undefined}
			onTouchEnd={imageUrl ? handleTouchEnd : undefined}
			onDragOver={handleDragOver}
			onDragEnter={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
			style={{
				backgroundColor: "var(--paper-canvas, #020617)",
				borderColor: "var(--line, #334155)",
				color: "var(--ink, #f8fafc)",
				cursor: isPanning ? "grabbing" : (activeTargetKey && imageUrl) ? "crosshair" : "default",
			}}
		>
			{/* UNIFIED 36PX CEPH HUD STRIP */}
			<CephalometricHudStrip
				filterMode={filterMode}
				onFilterModeChange={onFilterModeChange}
				zoom={zoom}
				onZoomIn={() => ensureCephImage(() => setZoom((prev) => Math.min(3.5, Number((prev + 0.2).toFixed(1)))))}
				onZoomOut={() => ensureCephImage(() => setZoom((prev) => Math.max(0.4, Number((prev - 0.2).toFixed(1)))))}
				onResetView={() => ensureCephImage(handleResetView)}
				isCalibrating={isCalibrating}
				onToggleCalibrating={() => ensureCephImage(() => {
					setIsCalibrating((prev) => !prev);
					setCalibrationPoints([]);
				})}
				showPolygon={showPolygon}
				onTogglePolygon={onTogglePolygon}
				showPlanes={showPlanes}
				onTogglePlanes={onTogglePlanes}
				showLabels={showLabels}
				onToggleLabels={onToggleLabels}
				imageUrl={imageUrl}
				isAllLandmarksPlaced={isAllLandmarksPlaced}
				activeTargetKey={activeTargetKey}
				landmarks={landmarks}
				onSelectTargetKey={onSelectTargetKey}
				onFileProcess={handleFileProcess}
				onLoadPreset={onLoadPreset}
				onResetLandmarks={onResetLandmarks}
				onRunAiAutoPlacement={onRunAiAutoPlacement}
				isAiInferring={isAiInferring}
				aiBackendBadge={aiBackendBadge}
				aiBackendLabel={aiBackendLabel}
				aiBackendPref={aiBackendPref}
				onChangeAiBackendPref={onChangeAiBackendPref}
				aiInferenceStats={aiInferenceStats}
			/>

			{!imageUrl ? (
				/* Strict Medical Radiology Dropzone (Drag & Drop ТРГ / DICOM / JPG / PNG) */
				<div
					data-testid="ceph-dropzone"
					className={`w-full max-w-xl mx-3 sm:mx-4 mt-10 sm:mt-12 p-5 sm:p-8 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center select-none shadow-2xl ${
						isDragOver
							? "border-teal-400 bg-teal-950/80 scale-[1.01]"
							: "border-slate-700 hover:border-teal-500 bg-slate-900 text-slate-100"
					}`}
					style={{
						backgroundColor: isDragOver ? "rgba(4, 47, 46, 0.85)" : "var(--paper-panel, #0f172a)",
						borderColor: isDragOver ? "var(--teal, #2dd4bf)" : "var(--line, #334155)",
						color: "var(--ink, #f8fafc)",
					}}
				>
					<input
						ref={fileInputRef}
						type="file"
						accept="image/*,.dcm"
						className="hidden"
						onChange={(e) => {
							const file = e.target.files?.[0];
							if (file) {
								handleFileProcess(file);
							}
						}}
					/>
					<div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 mb-3 sm:mb-4 shadow-lg shrink-0">
						<UploadCloud size={30} />
					</div>
					<h3 className="text-sm sm:text-lg font-black text-white m-0 mb-1.5" style={{ color: "var(--ink, #ffffff)" }}>
						Боковая телерентгенограмма черепа (ТРГ)
					</h3>
					<p className="text-xs sm:text-sm text-slate-200 font-medium max-w-md mb-2 leading-relaxed" style={{ color: "var(--muted, #e2e8f0)" }}>
						Для проведения цефалометрического анализа требуется реальный рентгеновский снимок пациента.
					</p>
					<p className="text-[11px] sm:text-xs text-slate-300 mb-4 sm:mb-5 font-mono font-medium" style={{ color: "var(--muted, #cbd5e1)" }}>
						Область загрузки снимка: перетащите ТРГ / DICOM / JPG / PNG
					</p>

					<div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							data-testid="choose-ceph-file-btn"
							className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-bold shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
						>
							<UploadCloud size={16} />
							<span>Выбрать снимок ТРГ</span>
						</button>
						{isDemoShowcaseMode() && (
							<button
								type="button"
								data-testid="load-demo-ceph-sample-btn"
								onClick={() => onImageUpload?.(SAMPLE_TRG_CEPHALOGRAM_URL)}
								className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-bold shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
								title="Витринный демонстрационный снимок (только в демо-режиме)"
							>
								<span>Загрузить тестовый образец ТРГ (Демо)</span>
							</button>
						)}
					</div>

					<div className="flex items-center gap-2 mt-4 sm:mt-5 text-[11px] text-slate-400 font-medium flex-wrap justify-center">
						<span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">DICOM</span>
						<span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">JPG</span>
						<span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">PNG</span>
						<span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">WebP</span>
					</div>
				</div>
			) : (
				<>
					{/* SVG Coordinate Space & Lateral Ceph View */}
					<div
						className="relative transition-transform duration-75 origin-center"
						style={{
							transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
							width: VIEWBOX_WIDTH,
							height: VIEWBOX_HEIGHT,
						}}
					>
						{/* Real Clinical Cephalogram Image with Filters */}
						<div
							className="absolute inset-0 w-full h-full rounded-xl overflow-hidden bg-slate-900"
							style={getFilterStyle()}
						>
							<img
								src={imageUrl}
								alt="Lateral Cephalogram X-Ray (ТРГ боковая)"
								loading="lazy"
								decoding="async"
								className="w-full h-full object-contain pointer-events-none"
							/>
						</div>

						{/* 2. Interactive Cephalometric SVG Overlay (Polygons, Angles, Points) */}
						<CephalometricSvgOverlay
							landmarks={landmarks}
							showPlanes={showPlanes}
							showPolygon={showPolygon}
							showLabels={showLabels}
							calibrationPoints={calibrationPoints}
							activeTargetKey={activeTargetKey}
							hoveredKey={hoveredKey}
							draggingKey={draggingKey}
							onHoverKey={setHoveredKey}
							onStartDrag={(key) => setDraggingKey(key)}
							onSelectTargetKey={onSelectTargetKey}
							onRemoveLandmark={onRemoveLandmark}
							viewBoxWidth={VIEWBOX_WIDTH}
							viewBoxHeight={VIEWBOX_HEIGHT}
							svgRef={svgRef}
						/>
					</div>

					{/* Precision Magnifier Loupe (Zoom Window during point drag or hovering) */}
					{(draggingKey || hoveredKey) && cursorImgPos && (
						<div className="absolute bottom-4 right-4 z-40 w-36 h-36 rounded-full overflow-hidden border-2 border-[var(--teal,#0d9488)] bg-slate-950 shadow-2xl pointer-events-none flex items-center justify-center">
							<div
								className="relative w-full h-full"
								style={{
									transform: `scale(2.4) translate(${-cursorImgPos.x + 72}px, ${-cursorImgPos.y + 72}px)`,
									transformOrigin: "top left",
								}}
							>
								{/* Replicated vector crosshair in magnifier */}
								<div
									className="absolute w-2.5 h-2.5 rounded-full bg-[var(--teal,#0d9488)] border border-white"
									style={{ left: cursorImgPos.x - 5, top: cursorImgPos.y - 5 }}
								/>
							</div>
							{/* Fixed Center Crosshair */}
							<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
								<div className="w-full h-[1px] bg-[var(--teal-soft,rgba(13,148,136,0.3))]" />
								<div className="h-full w-[1px] bg-[var(--teal-soft,rgba(13,148,136,0.3))] absolute" />
								<div className="w-4 h-4 rounded-full border border-[var(--teal,#0d9488)]" />
							</div>
							<div className="absolute bottom-1.5 bg-slate-900/95 text-xs text-[var(--teal,#0d9488)] px-2.5 py-0.5 rounded-full font-mono font-bold border border-[var(--teal-soft,rgba(13,148,136,0.3))]">
								{draggingKey ?? hoveredKey} ({Math.round(cursorImgPos.x)}, {Math.round(cursorImgPos.y)})
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}
