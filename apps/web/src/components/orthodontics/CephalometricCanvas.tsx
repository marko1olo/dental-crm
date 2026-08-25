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

export interface CephalometricCanvasProps {
	landmarks: LandmarkMap;
	onLandmarkChange: (key: LandmarkKey, point: Point2D) => void;
	onRemoveLandmark?: (key: LandmarkKey) => void;
	activeTargetKey: LandmarkKey | null;
	onSelectTargetKey: (key: LandmarkKey | null) => void;
	imageUrl: string | null;
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
			className="relative w-full h-[520px] md:h-[620px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center select-none"
			onWheel={handleWheel}
			onMouseDown={handleMouseDown}
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
			onMouseLeave={handleMouseUp}
			style={{ cursor: isPanning ? "grabbing" : activeTargetKey ? "crosshair" : "default" }}
		>
			{/* Canvas Top Floating Toolbar with >= 44px Touch Targets */}
			<div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between gap-2 flex-wrap pointer-events-none">
				{/* Active Target Indicator Badge */}
				<div className="pointer-events-auto flex items-center gap-2.5 bg-slate-900/95 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-700/80 shadow-xl min-h-[44px]">
					<Crosshair size={18} className="text-[var(--teal)] animate-pulse shrink-0" />
					<div className="text-sm font-bold text-slate-100 min-w-0 break-words">
						{activeTargetKey ? (
							<span>
								Установите точку:{" "}
								<span className="text-[var(--teal)] font-extrabold uppercase">
									{CEPHALOMETRIC_LANDMARKS.find((l) => l.key === activeTargetKey)?.nameRu}
								</span>
							</span>
						) : (
							<span className="text-slate-300 font-medium">
								Выберите ориентир в списке или перетаскивайте точки на снимке
							</span>
						)}
					</div>
				</div>

				{/* Zoom, View & Calibration Controls (Touch Targets >= 44x44px) */}
				<div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-xl min-h-[44px]">
					<button
						type="button"
						onClick={() => setZoom((prev) => Math.min(3.5, Number((prev + 0.2).toFixed(1))))}
						className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-slate-200 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
						title="Приблизить (Масштаб +)"
						aria-label="Приблизить масштаб"
					>
						<ZoomIn size={18} />
					</button>
					<span className="text-sm font-mono font-bold text-slate-200 px-2 min-w-[48px] text-center">
						{Math.round(zoom * 100)}%
					</span>
					<button
						type="button"
						onClick={() => setZoom((prev) => Math.max(0.4, Number((prev - 0.2).toFixed(1))))}
						className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-slate-200 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
						title="Отдалить (Масштаб -)"
						aria-label="Отдалить масштаб"
					>
						<ZoomOut size={18} />
					</button>
					<div className="w-[1px] h-6 bg-slate-700 mx-1" />
					<button
						type="button"
						onClick={handleResetView}
						className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-slate-200 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
						title="Сбросить масштаб и положение (100%)"
						aria-label="Сбросить масштаб к 100%"
					>
						<RotateCcw size={18} />
					</button>
					<button
						type="button"
						onClick={() => setIsCalibrating((prev) => !prev)}
						className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
							isCalibrating
								? "bg-amber-600 text-white font-bold shadow-md shadow-amber-600/30"
								: "text-slate-200 hover:text-white hover:bg-slate-800"
						}`}
						title="Калибровка масштаба (отметьте отрезок 10 мм)"
						aria-label="Калибровка масштаба"
					>
						<Ruler size={18} />
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
				{/* 1. Underlying Cephalogram Image (or Vector Anatomical Lateral Ceph) */}
				<div
					className="absolute inset-0 w-full h-full rounded-xl overflow-hidden bg-black"
					style={getFilterStyle()}
				>
					{imageUrl ? (
						<img
							src={imageUrl}
							alt="Lateral Cephalogram X-Ray (ТРГ боковая)"
							className="w-full h-full object-contain pointer-events-none"
						/>
					) : (
						/* High-Detail Vector Anatomical Lateral Cephalogram Backdrop */
						<svg
							viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
							className="w-full h-full"
							aria-label="Векторная анатомическая модель ТРГ в боковой проекции"
						>
							{/* Radiographic Density Gradient Backing */}
							<defs>
								<radialGradient id="cephSkullGlow" cx="45%" cy="40%" r="55%">
									<stop offset="0%" stopColor="#1e293b" stopOpacity="0.9" />
									<stop offset="60%" stopColor="#0f172a" stopOpacity="0.95" />
									<stop offset="100%" stopColor="#020617" stopOpacity="1" />
								</radialGradient>
								<linearGradient id="cervicalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
									<stop offset="0%" stopColor="#334155" />
									<stop offset="100%" stopColor="#1e293b" />
								</linearGradient>
							</defs>

							{/* Dark Radiograph Background */}
							<rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="#020617" />
							<rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="url(#cephSkullGlow)" />

							{/* Soft Tissue Profile Silhouette (Профиль мягких тканей) */}
							<path
								d="M 400 80 C 450 90, 470 120, 465 155 C 460 175, 490 230, 505 270 C 510 285, 495 295, 480 300 C 495 320, 500 345, 495 365 C 490 380, 475 385, 465 395 C 480 405, 485 430, 480 450 C 475 470, 480 495, 465 525 C 450 550, 420 575, 380 590 L 350 660 L 220 660 L 220 80 Z"
								fill="#0f172a"
								stroke="#334155"
								strokeWidth="1.5"
								strokeDasharray="4 2"
								opacity="0.6"
							/>

							{/* Cranial Vault & Skull Base (Свод черепа и основание) */}
							<path
								d="M 230 250 C 200 180, 240 100, 320 85 C 400 70, 450 110, 440 155 C 400 170, 330 180, 280 190 C 250 195, 240 230, 245 245 Z"
								fill="#1e293b"
								stroke="#475569"
								strokeWidth="2"
								opacity="0.8"
							/>

							{/* Sella Turcica Saddle Pocket (Турецкое седло) */}
							<path
								d="M 270 185 Q 280 198, 290 185"
								fill="none"
								stroke="#38bdf8"
								strokeWidth="2.5"
							/>

							{/* Nasal Bone & Maxilla (Носовая кость и верхняя челюсть) */}
							<path
								d="M 440 155 L 455 210 L 440 235 L 475 310 L 462 342 L 468 395 L 438 325 L 305 325 L 300 290 Z"
								fill="#1e293b"
								stroke="#64748b"
								strokeWidth="2"
								opacity="0.85"
							/>

							{/* Mandible & Ramus (Нижняя челюсть: ветвь, угол, тело, подбородок) */}
							<path
								d="M 270 270 L 250 435 Q 260 490, 340 515 L 420 540 Q 450 535, 452 490 L 446 440 L 458 400 L 425 495 L 340 470 L 285 360 Z"
								fill="#1e293b"
								stroke="#64748b"
								strokeWidth="2"
								opacity="0.85"
							/>

							{/* Cervical Vertebrae (Шейные позвонки C1, C2, C3, C4) */}
							<g fill="none" stroke="#334155" strokeWidth="2" opacity="0.6">
								<rect x="220" y="320" width="30" height="25" rx="5" />
								<rect x="215" y="360" width="35" height="28" rx="5" />
								<rect x="210" y="400" width="40" height="30" rx="5" />
								<rect x="205" y="445" width="42" height="32" rx="5" />
							</g>

							{/* Stylized Incisors (Верхний и нижний центральные резцы) */}
							<g stroke="#94a3b8" strokeWidth="2.5" fill="#334155">
								{/* Upper Central Incisor (U1) */}
								<path d="M 438 325 L 462 390 Q 468 398, 470 395 L 448 335 Z" fill="#475569" />
								{/* Lower Central Incisor (L1) */}
								<path d="M 425 495 L 452 405 Q 458 398, 460 402 L 435 490 Z" fill="#475569" />
							</g>
						</svg>
					)}
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

								{/* Landmark Text Label (High-Contrast >= 13px) */}
								{showLabels && (
									<text
										x={pt.x + 11}
										y={pt.y + 5}
										fill="#ffffff"
										fontSize={isHovered || isActive ? "14" : "13"}
										fontWeight="bold"
										className="pointer-events-none select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]"
										style={{ textShadow: "0 1px 3px #000, 0 0 5px #000" }}
									>
										{lm.code}
									</text>
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
		</div>
	);
}
