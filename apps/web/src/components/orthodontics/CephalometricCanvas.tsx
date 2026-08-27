import {
	Crosshair,
	Eye,
	Layers,
	Maximize2,
	Move,
	RotateCcw,
	Ruler,
	Sliders,
	Sparkles,
	UploadCloud,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
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
	projectPointOntoLine,
} from "./cephalometricMath";

export type XrayFilterMode = "normal" | "invert" | "bone" | "edge";

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
	brightness: number;
	contrast: number;
	showPolygon: boolean;
	showLabels: boolean;
	showPlanes: boolean;
	scaleMmPerPixel: number;
	onScaleChange?: (scale: number) => void;
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
	brightness,
	contrast,
	showPolygon,
	showLabels,
	showPlanes,
	scaleMmPerPixel,
	onScaleChange,
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

	// ─── Geometric Line Calculations for SVG Overlay ──────────────────────────

	const S = landmarks.S;
	const N = landmarks.N;
	const Or = landmarks.Or;
	const Po = landmarks.Po;
	const A = landmarks.A;
	const B = landmarks.B;
	const Pog = landmarks.Pog;
	const Gn = landmarks.Gn ?? landmarks.Me;
	const Me = landmarks.Me ?? landmarks.Gn;
	const Go = landmarks.Go;
	const ANS = landmarks.ANS;
	const PNS = landmarks.PNS;
	const U1t = landmarks.U1t;
	const U1a = landmarks.U1a;
	const L1t = landmarks.L1t;
	const L1a = landmarks.L1a;

	// Occlusal Plane points
	const opAnt: Point2D | null = U1t && L1t
		? { x: (U1t.x + L1t.x) / 2, y: (U1t.y + L1t.y) / 2 }
		: ANS && Me
			? { x: (ANS.x + Me.x) / 2, y: (ANS.y + Me.y) / 2 }
			: null;

	const opPost: Point2D | null = PNS && Go
		? { x: (PNS.x + Go.x) / 2, y: (PNS.y + Go.y) / 2 }
		: opAnt
			? { x: opAnt.x - 160, y: opAnt.y - 12 }
			: null;

	// Wits projections
	const projA = A && opPost && opAnt ? projectPointOntoLine(A, opPost, opAnt) : null;
	const projB = B && opPost && opAnt ? projectPointOntoLine(B, opPost, opAnt) : null;

	return (
		<div
			ref={containerRef}
			data-testid="cephalometric-canvas-container"
			className="relative w-full h-full min-h-[340px] sm:min-h-[440px] lg:min-h-[620px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center select-none"
			onWheel={imageUrl ? handleWheel : undefined}
			onMouseDown={imageUrl ? handleMouseDown : undefined}
			onMouseMove={imageUrl ? handleMouseMove : undefined}
			onMouseUp={imageUrl ? handleMouseUp : undefined}
			onMouseLeave={imageUrl ? handleMouseUp : undefined}
			onDragOver={handleDragOver}
			onDragEnter={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
			style={{ cursor: isPanning ? "grabbing" : (activeTargetKey && imageUrl) ? "crosshair" : "default" }}
		>
			{!imageUrl ? (
				/* Strict Medical Radiology Dropzone (Drag & Drop ТРГ / DICOM / JPG / PNG) */
				<div
					data-testid="ceph-dropzone"
					className={`w-full max-w-xl mx-3 sm:mx-4 p-5 sm:p-8 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center select-none ${
						isDragOver
							? "!border-teal-400 !bg-teal-950/60 shadow-2xl scale-[1.01]"
							: "!border-[#334155] hover:!border-teal-500 !bg-[#0b1329] shadow-xl"
					}`}
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
					<div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl !bg-[#1e293b] border !border-[#334155] flex items-center justify-center text-teal-400 mb-3 sm:mb-4 shadow-lg shrink-0">
						<UploadCloud size={30} />
					</div>
					<h3 className="text-sm sm:text-lg font-bold !text-[#f8fafc] mb-1 sm:mb-1.5">
						Боковая телерентгенограмма черепа (ТРГ)
					</h3>
					<p className="text-xs sm:text-sm !text-[#cbd5e1] max-w-md mb-2 leading-relaxed">
						Для проведения цефалометрического анализа требуется реальный рентгеновский снимок пациента.
					</p>
					<p className="text-[11px] sm:text-xs !text-[#94a3b8] mb-4 sm:mb-5 font-mono">
						Drag & Drop боковой ТРГ / DICOM / JPG / PNG
					</p>

					<div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl !bg-[var(--teal,#0d9488)] hover:opacity-90 !text-white text-xs sm:text-sm font-bold shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
						>
							<UploadCloud size={16} />
							<span>Выбрать снимок ТРГ</span>
						</button>
						<button
							type="button"
							onClick={() => onImageUpload?.(SAMPLE_TRG_CEPHALOGRAM_URL)}
							className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl !bg-[#1e293b] hover:!bg-[#334155] !text-[#f8fafc] border !border-[#334155] text-xs sm:text-sm font-bold shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
						>
							<span>Загрузить клинический снимок ТРГ пациента</span>
						</button>
					</div>

					<div className="flex items-center gap-2 mt-4 sm:mt-5 text-[11px] !text-[#94a3b8] font-medium flex-wrap justify-center">
						<span className="px-2 py-0.5 rounded !bg-[#1e293b] border !border-[#334155]">DICOM</span>
						<span className="px-2 py-0.5 rounded !bg-[#1e293b] border !border-[#334155]">JPG</span>
						<span className="px-2 py-0.5 rounded !bg-[#1e293b] border !border-[#334155]">PNG</span>
						<span className="px-2 py-0.5 rounded !bg-[#1e293b] border !border-[#334155]">WebP</span>
					</div>
				</div>
			) : (
				<>
					{/* Canvas Top Floating Toolbar with High-Contrast Dark HUD (Theme-Agnostic) */}
					<div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between gap-2 flex-wrap pointer-events-none">
						{/* Active Target Indicator Badge */}
						<div className="pointer-events-auto flex items-center gap-2 !bg-[#0f172a] backdrop-blur-md px-3 py-1.5 rounded-lg border !border-[#334155] shadow-xl h-8">
							<Crosshair size={15} className="text-teal-400 animate-pulse shrink-0" />
							<div className="text-xs font-bold !text-[#f8fafc] min-w-0">
								{activeTargetKey ? (
									<span>
										<span className="!text-[#94a3b8] font-normal mr-1">Установите точку:</span>
										<span className="text-teal-300 font-extrabold uppercase">
											{CEPHALOMETRIC_LANDMARKS.find((l) => l.key === activeTargetKey)?.nameRu}
										</span>
									</span>
								) : (
									<span className="!text-[#cbd5e1] font-medium">
										Выберите ориентир в списке или перетаскивайте точки на снимке
									</span>
								)}
							</div>
						</div>

						{/* Zoom, View & Calibration Controls */}
						<div className="pointer-events-auto flex items-center gap-1.5 !bg-[#0f172a] backdrop-blur-md p-1 rounded-lg border !border-[#334155] shadow-xl h-8">
							<button
								type="button"
								onClick={() => setZoom((prev) => Math.min(3.5, Number((prev + 0.2).toFixed(1))))}
								className="w-7 h-7 rounded-md flex items-center justify-center !bg-[#1e293b] !text-[#f8fafc] hover:!bg-[#334155] border !border-[#334155] transition-colors cursor-pointer"
								title="Приблизить (Масштаб +)"
								aria-label="Приблизить масштаб"
							>
								<ZoomIn size={14} />
							</button>
							<span className="text-xs font-mono font-bold !text-[#f8fafc] px-1 min-w-[40px] text-center">
								{Math.round(zoom * 100)}%
							</span>
							<button
								type="button"
								onClick={() => setZoom((prev) => Math.max(0.4, Number((prev - 0.2).toFixed(1))))}
								className="w-7 h-7 rounded-md flex items-center justify-center !bg-[#1e293b] !text-[#f8fafc] hover:!bg-[#334155] border !border-[#334155] transition-colors cursor-pointer"
								title="Отдалить (Масштаб -)"
								aria-label="Отдалить масштаб"
							>
								<ZoomOut size={14} />
							</button>
							<div className="w-[1px] h-4 bg-[#334155] mx-0.5" />
							<button
								type="button"
								onClick={handleResetView}
								className="w-7 h-7 rounded-md flex items-center justify-center !bg-[#1e293b] !text-[#f8fafc] hover:!bg-[#334155] border !border-[#334155] transition-colors cursor-pointer"
								title="Сбросить масштаб и положение"
								aria-label="Сбросить масштаб"
							>
								<RotateCcw size={13} />
							</button>
							<button
								type="button"
								onClick={() => {
									setIsCalibrating((prev) => !prev);
									setCalibrationPoints([]);
								}}
								className={`h-7 px-2.5 rounded-md flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
									isCalibrating
										? "!bg-amber-500 !text-slate-950 font-black border !border-amber-400 shadow-sm"
										: "!bg-[#1e293b] !text-[#f8fafc] hover:!bg-[#334155] border !border-[#334155] shadow-sm"
								}`}
								title="Калибровка масштаба по линейке (мм/px)"
								aria-label="Калибровка масштаба"
							>
								<Ruler size={13} className="shrink-0 text-teal-400" />
								<span>Линейка</span>
							</button>
						</div>
					</div>

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
							className="absolute inset-0 w-full h-full rounded-xl overflow-hidden bg-black"
							style={getFilterStyle()}
						>
							<img
								src={imageUrl}
								alt="Lateral Cephalogram X-Ray (ТРГ боковая)"
								className="w-full h-full object-contain pointer-events-none"
							/>
						</div>

						{/* 2. Interactive Cephalometric SVG Overlay (Polygons, Angles, Points) */}
						<svg
							ref={svgRef}
							viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
							className="absolute inset-0 w-full h-full overflow-visible pointer-events-auto"
						>
					{/* Planes and Guides */}
					{showPlanes && (
						<g className="planes-layer opacity-75">
							{/* S-N Line (Cranial Base) */}
							{S && N && (
								<line
									x1={S.x}
									y1={S.y}
									x2={N.x}
									y2={N.y}
									stroke="#06b6d4"
									strokeWidth="2.5"
									strokeDasharray="6 3"
								/>
							)}

							{/* Frankfort Horizontal Plane (Po - Or) */}
							{Po && Or && (
								<line
									x1={Po.x - 30}
									y1={Po.y}
									x2={Or.x + 60}
									y2={Or.y}
									stroke="#0284c7"
									strokeWidth="2"
									strokeDasharray="5 2.5"
								/>
							)}

							{/* Palatal Plane (PNS-ANS) */}
							{PNS && ANS && (
								<line
									x1={PNS.x}
									y1={PNS.y}
									x2={ANS.x}
									y2={ANS.y}
									stroke="#10b981"
									strokeWidth="2"
									strokeDasharray="4 2"
								/>
							)}

							{/* Mandibular Plane (Go-Me / Go-Gn) */}
							{Go && (Me || Gn) && (
								<line
									x1={Go.x}
									y1={Go.y}
									x2={(Me ?? Gn)!.x}
									y2={(Me ?? Gn)!.y}
									stroke="#f59e0b"
									strokeWidth="2.5"
									strokeDasharray="5 2.5"
								/>
							)}

							{/* Functional Occlusal Plane */}
							{opPost && opAnt && (
								<line
									x1={opPost.x}
									y1={opPost.y}
									x2={opAnt.x + 30}
									y2={opAnt.y}
									stroke="#a855f7"
									strokeWidth="1.8"
									strokeDasharray="3 3"
								/>
							)}

							{/* Downs Y-Axis Growth Line (S -> Gn) */}
							{S && (Gn || Me) && (
								<line
									x1={S.x}
									y1={S.y}
									x2={(Gn ?? Me)!.x}
									y2={(Gn ?? Me)!.y}
									stroke="#eab308"
									strokeWidth="1.5"
									strokeDasharray="4 2"
								/>
							)}

							{/* Wits Perpendicular Projection Drop Lines */}
							{projA && A && (
								<line
									x1={A.x}
									y1={A.y}
									x2={projA.x}
									y2={projA.y}
									stroke="#ec4899"
									strokeWidth="1.5"
									strokeDasharray="2 2"
								/>
							)}
							{projB && B && (
								<line
									x1={B.x}
									y1={B.y}
									x2={projB.x}
									y2={projB.y}
									stroke="#ec4899"
									strokeWidth="1.5"
									strokeDasharray="2 2"
								/>
							)}
						</g>
					)}

					{/* Cephalometric Polygon Lines (Steiner / Tweed / Downs Polygon) */}
					{showPolygon && (
						<g className="polygon-layer">
							{/* N-A Line */}
							{N && A && (
								<line
									x1={N.x}
									y1={N.y}
									x2={A.x}
									y2={A.y}
									stroke="#10b981"
									strokeWidth="2"
								/>
							)}

							{/* N-B Line */}
							{N && B && (
								<line
									x1={N.x}
									y1={N.y}
									x2={B.x}
									y2={B.y}
									stroke="#f59e0b"
									strokeWidth="2"
								/>
							)}

							{/* N-Pog Line (Downs Facial Plane) */}
							{N && Pog && (
								<line
									x1={N.x}
									y1={N.y}
									x2={Pog.x}
									y2={Pog.y}
									stroke="#e2e8f0"
									strokeWidth="1.8"
									strokeDasharray="4 2"
								/>
							)}

							{/* A-Pog Line (Downs Angle of Convexity segment) */}
							{A && Pog && (
								<line
									x1={A.x}
									y1={A.y}
									x2={Pog.x}
									y2={Pog.y}
									stroke="#34d399"
									strokeWidth="1.5"
									strokeDasharray="3 3"
								/>
							)}

							{/* A-B Line */}
							{A && B && (
								<line
									x1={A.x}
									y1={A.y}
									x2={B.x}
									y2={B.y}
									stroke="#f43f5e"
									strokeWidth="1.5"
									strokeDasharray="3 2"
								/>
							)}

							{/* S-Go Line (Posterior Face Height) */}
							{S && Go && (
								<line
									x1={S.x}
									y1={S.y}
									x2={Go.x}
									y2={Go.y}
									stroke="#06b6d4"
									strokeWidth="1.8"
								/>
							)}

							{/* Upper Incisor Axis (U1a - U1t) */}
							{U1a && U1t && (
								<line
									x1={U1a.x - (U1t.x - U1a.x) * 0.4}
									y1={U1a.y - (U1t.y - U1a.y) * 0.4}
									x2={U1t.x + (U1t.x - U1a.x) * 0.4}
									y2={U1t.y + (U1t.y - U1a.y) * 0.4}
									stroke="#ec4899"
									strokeWidth="2.5"
								/>
							)}

							{/* Lower Incisor Axis (L1a - L1t) */}
							{L1a && L1t && (
								<line
									x1={L1a.x - (L1t.x - L1a.x) * 0.4}
									y1={L1a.y - (L1t.y - L1a.y) * 0.4}
									x2={L1t.x + (L1t.x - L1a.x) * 0.4}
									y2={L1t.y + (L1t.y - L1a.y) * 0.4}
									stroke="#8b5cf6"
									strokeWidth="2.5"
								/>
							)}
						</g>
					)}

					{/* Calibration Line Rendering */}
					{calibrationPoints.map((pt, idx) => (
						<circle
							key={idx}
							cx={pt.x}
							cy={pt.y}
							r="6"
							fill="#f59e0b"
							stroke="#ffffff"
							strokeWidth="2"
						/>
					))}
					{calibrationPoints.length === 2 && calibrationPoints[0] && calibrationPoints[1] && (
						<line
							x1={calibrationPoints[0].x}
							y1={calibrationPoints[0].y}
							x2={calibrationPoints[1].x}
							y2={calibrationPoints[1].y}
							stroke="#f59e0b"
							strokeWidth="3"
						/>
					)}

					{/* Interactive Landmark Handles & Touch Pins (Target Area >= 44x44px) */}
					{CEPHALOMETRIC_LANDMARKS.map((lm) => {
						const pt = landmarks[lm.key];
						if (!pt) return null;

						const isActive = activeTargetKey === lm.key;
						const isHovered = hoveredKey === lm.key;
						const isDragging = draggingKey === lm.key;

						// Smart directional offsets to prevent label collision on chin (L1-tip, Pog, Gn, Me, L1-apex, B) and cranial base
						const offsets: Record<string, { dx: number; dy: number; align?: "start" | "middle" | "end" }> = {
							S: { dx: -30, dy: -14, align: "end" },
							N: { dx: 18, dy: -10, align: "start" },
							Or: { dx: 18, dy: 16, align: "start" },
							Po: { dx: -34, dy: -12, align: "end" },
							ANS: { dx: 18, dy: -6, align: "start" },
							PNS: { dx: -40, dy: -4, align: "end" },
							A: { dx: 18, dy: 2, align: "start" },
							B: { dx: 18, dy: 0, align: "start" },
							Pog: { dx: 26, dy: -6, align: "start" },
							Gn: { dx: 26, dy: 18, align: "start" },
							Me: { dx: -6, dy: 30, align: "middle" },
							Go: { dx: -34, dy: 18, align: "end" },
							U1t: { dx: -42, dy: -16, align: "end" },
							U1a: { dx: -54, dy: -4, align: "end" },
							L1t: { dx: 26, dy: 14, align: "start" },
							L1a: { dx: -54, dy: 4, align: "end" },
						};

						const offset = offsets[lm.key] ?? { dx: 16, dy: 4, align: "start" };
						const targetX = pt.x + offset.dx;
						const targetY = pt.y + offset.dy;
						const codeLength = lm.code.length;
						const badgeWidth = Math.max(22, codeLength * 7.5 + 8);
						const badgeHeight = 18;
						const badgeX =
							offset.align === "end"
								? targetX - badgeWidth
								: offset.align === "middle"
									? targetX - badgeWidth / 2
									: targetX;
						const badgeY = targetY - badgeHeight / 2;
						const textAnchorX = badgeX + badgeWidth / 2;
						const textAnchorY = targetY + 0.5;

						// Leader line anchor calculation
						const hasLeader = Math.hypot(offset.dx, offset.dy) > 16;
						const leaderEndX =
							offset.align === "end"
								? badgeX + badgeWidth
								: offset.align === "middle"
									? targetX
									: badgeX;
						const leaderEndY = targetY;

						return (
							<g
								key={lm.key}
								className="landmark-handle cursor-pointer"
								onMouseEnter={() => setHoveredKey(lm.key)}
								onMouseLeave={() => setHoveredKey(null)}
								onMouseDown={(e) => {
									e.stopPropagation();
									setDraggingKey(lm.key);
									onSelectTargetKey(lm.key);
								}}
							>
								{/* Leader Line to avoid label collision */}
								{showLabels && hasLeader && (
									<line
										x1={pt.x}
										y1={pt.y}
										x2={leaderEndX}
										y2={leaderEndY}
										stroke={lm.color}
										strokeWidth="1.2"
										strokeDasharray="2 2"
										opacity="0.85"
										pointerEvents="none"
									/>
								)}

								{/* Invisible Touch Hit Area Circle: Radius 22px = 44px touch diameter (WCAG 2.1) */}
								<circle
									cx={pt.x}
									cy={pt.y}
									r={22}
									fill="transparent"
									className="touch-hit-area"
								/>

								{/* Pulsing Target Glow for active / hovered point */}
								{(isActive || isHovered || isDragging) && (
									<circle
										cx={pt.x}
										cy={pt.y}
										r={isDragging ? 20 : 16}
										fill="none"
										stroke={lm.color}
										strokeWidth="2.5"
										className="animate-ping opacity-75"
									/>
								)}

								{/* Outer Ring */}
								<circle
									cx={pt.x}
									cy={pt.y}
									r={isHovered || isDragging ? 10 : 8}
									fill={lm.color}
									fillOpacity="0.3"
									stroke={lm.color}
									strokeWidth="2"
								/>

								{/* Core Dot */}
								<circle
									cx={pt.x}
									cy={pt.y}
									r={isHovered || isDragging ? 5 : 4}
									fill={lm.color}
									stroke="#ffffff"
									strokeWidth="2"
								/>

								{/* Landmark Pill Badge with High-Contrast Text */}
								{showLabels && (
									<g className="landmark-label-badge pointer-events-none select-none">
										<rect
											x={badgeX}
											y={badgeY}
											width={badgeWidth}
											height={badgeHeight}
											rx={4}
											fill="rgba(15, 23, 42, 0.88)"
											stroke={isActive || isHovered || isDragging ? lm.color : "rgba(255, 255, 255, 0.3)"}
											strokeWidth={isActive || isHovered || isDragging ? "1.6" : "0.8"}
										/>
										<text
											x={textAnchorX}
											y={textAnchorY}
											fill={isActive || isHovered || isDragging ? "#38bdf8" : "#ffffff"}
											fontSize={isHovered || isActive ? "12" : "11"}
											fontWeight="bold"
											fontFamily="ui-monospace, monospace"
											textAnchor="middle"
											dominantBaseline="central"
										>
											{lm.code}
										</text>
									</g>
								)}
							</g>
						);
					})}
				</svg>
			</div>

			{/* Precision Magnifier Loupe (Zoom Window during point drag or hovering) */}
			{(draggingKey || hoveredKey) && cursorImgPos && (
				<div className="absolute bottom-4 right-4 z-40 w-36 h-36 rounded-full overflow-hidden border-2 border-[var(--teal)] bg-slate-950 shadow-2xl pointer-events-none flex items-center justify-center">
					<div
						className="relative w-full h-full"
						style={{
							transform: `scale(2.4) translate(${-cursorImgPos.x + 72}px, ${-cursorImgPos.y + 72}px)`,
							transformOrigin: "top left",
						}}
					>
						{/* Replicated vector crosshair in magnifier */}
						<div
							className="absolute w-2.5 h-2.5 rounded-full bg-[var(--teal)] border border-white"
							style={{ left: cursorImgPos.x - 5, top: cursorImgPos.y - 5 }}
						/>
					</div>
					{/* Fixed Center Crosshair */}
					<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
						<div className="w-full h-[1px] bg-[var(--teal-soft)]" />
						<div className="h-full w-[1px] bg-[var(--teal-soft)] absolute" />
						<div className="w-4 h-4 rounded-full border border-[var(--teal)]" />
					</div>
					<div className="absolute bottom-1.5 bg-slate-900/95 text-xs text-[var(--teal)] px-2.5 py-0.5 rounded-full font-mono font-bold border border-[var(--teal-soft)]">
						{draggingKey ?? hoveredKey} ({Math.round(cursorImgPos.x)}, {Math.round(cursorImgPos.y)})
					</div>
				</div>
			)}
				</>
			)}
		</div>
	);
}
