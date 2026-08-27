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
				<div className="pointer-events-auto flex items-center gap-1 !bg-[#0f172a] backdrop-blur-md p-1 rounded-lg border !border-[#334155] shadow-xl h-8">
					<button
						type="button"
						onClick={() => setZoom((prev) => Math.min(3.5, Number((prev + 0.2).toFixed(1))))}
						className="w-7 h-7 rounded-md flex items-center justify-center !text-[#e2e8f0] hover:!text-white hover:!bg-[#1e293b] transition-colors cursor-pointer"
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
						className="w-7 h-7 rounded-md flex items-center justify-center !text-[#e2e8f0] hover:!text-white hover:!bg-[#1e293b] transition-colors cursor-pointer"
						title="Отдалить (Масштаб -)"
						aria-label="Отдалить масштаб"
					>
						<ZoomOut size={14} />
					</button>
					<div className="w-[1px] h-4 bg-[#334155] mx-0.5" />
					<button
						type="button"
						onClick={handleResetView}
						className="w-7 h-7 rounded-md flex items-center justify-center !text-[#e2e8f0] hover:!text-white hover:!bg-[#1e293b] transition-colors cursor-pointer"
						title="Сбросить масштаб и положение (100%)"
						aria-label="Сбросить масштаб"
					>
						<RotateCcw size={14} />
					</button>
					<button
						type="button"
						onClick={() => {
							setIsCalibrating((prev) => !prev);
							setCalibrationPoints([]);
						}}
						className={`h-7 px-2 rounded-md flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer ${
							isCalibrating
								? "!bg-amber-600 !text-white"
								: "!text-[#e2e8f0] hover:!text-white hover:!bg-[#1e293b]"
						}`}
						title="Калибровка масштаба по линейке (мм/px)"
						aria-label="Калибровка масштаба"
					>
						<Ruler size={13} />
						<span className="hidden sm:inline">Линейка</span>
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
							{/* Radiographic Density Gradients & Filters */}
							<defs>
								{/* Conical X-Ray Beam Density Field */}
								<radialGradient id="cephBeamGlow" cx="48%" cy="46%" r="58%">
									<stop offset="0%" stopColor="#1e293b" stopOpacity="0.95" />
									<stop offset="50%" stopColor="#0f172a" stopOpacity="0.98" />
									<stop offset="85%" stopColor="#050814" stopOpacity="1" />
									<stop offset="100%" stopColor="#020617" stopOpacity="1" />
								</radialGradient>

								{/* Cortical Bone High-Contrast Gradient */}
								<linearGradient id="boneCortexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
									<stop offset="0%" stopColor="#94a3b8" stopOpacity="0.95" />
									<stop offset="50%" stopColor="#64748b" stopOpacity="0.9" />
									<stop offset="100%" stopColor="#475569" stopOpacity="0.85" />
								</linearGradient>

								{/* Sphenoid & Sella Turcica Gradient */}
								<linearGradient id="sellaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
									<stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
									<stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
								</linearGradient>

								{/* Cervical Vertebrae Texture */}
								<linearGradient id="cervicalBoneGrad" x1="0%" y1="0%" x2="100%" y2="0%">
									<stop offset="0%" stopColor="#334155" stopOpacity="0.9" />
									<stop offset="50%" stopColor="#475569" stopOpacity="0.95" />
									<stop offset="100%" stopColor="#1e293b" stopOpacity="0.9" />
								</linearGradient>
							</defs>

							{/* 1. Deep Space Dark Radiograph Background */}
							<rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="#020617" />
							<rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="url(#cephBeamGlow)" />

							{/* 2. Soft Tissue Profile Silhouette (Мягкотканный профиль лица: нос, губы, подбородок) */}
							<path
								d="M 380 60 C 430 70, 460 100, 455 135 C 452 150, 475 200, 492 245 C 502 270, 508 285, 498 296 C 485 304, 478 308, 482 320 C 488 335, 502 355, 496 372 C 490 384, 472 388, 468 398 C 478 408, 488 428, 484 450 C 478 472, 484 498, 472 525 C 458 552, 424 578, 375 595 L 340 670 L 190 670 L 190 60 Z"
								fill="#0b1120"
								stroke="#1e293b"
								strokeWidth="1.5"
								opacity="0.75"
							/>
							{/* Outer Soft Tissue E-Line Profile Trace */}
							<path
								d="M 455 135 C 452 150, 475 200, 492 245 C 502 270, 508 285, 498 296 C 485 304, 478 308, 482 320 C 488 335, 502 355, 496 372 C 490 384, 472 388, 468 398 C 478 408, 488 428, 484 450 C 478 472, 484 498, 472 525 C 458 552, 424 578, 375 595"
								fill="none"
								stroke="#475569"
								strokeWidth="1.8"
								strokeDasharray="4 2"
								opacity="0.8"
							/>

							{/* 3. Pharyngeal Airway Space (Дыхательные пути: носоглотка, ротоглотка, гортаноглотка) */}
							<path
								d="M 320 310 Q 315 360, 310 420 Q 305 480, 300 560 L 285 560 Q 290 480, 295 420 Q 300 360, 305 310 Z"
								fill="#020617"
								stroke="#0f172a"
								strokeWidth="1"
								opacity="0.95"
							/>

							{/* 4. Cranial Vault Outer & Inner Cortex (Свод черепа: наружная и внутренняя пластинки) */}
							<path
								d="M 210 270 C 180 180, 220 90, 310 70 C 400 50, 455 95, 442 155 C 395 168, 335 178, 280 190 C 248 196, 235 235, 238 255 Z"
								fill="#1e293b"
								stroke="url(#boneCortexGrad)"
								strokeWidth="2.2"
								opacity="0.85"
							/>
							{/* Diploe Space Inner Shadow */}
							<path
								d="M 220 255 C 195 185, 230 105, 310 85 C 390 68, 440 105, 432 150"
								fill="none"
								stroke="#334155"
								strokeWidth="4"
								opacity="0.6"
							/>

							{/* 5. Sella Turcica, Sphenoid Bone & Clivus (Турецкое седло, клиновидная кость и скат) */}
							<path
								d="M 265 182 L 272 184 Q 280 198, 288 184 L 298 182 L 315 220 L 290 270 L 255 245 Z"
								fill="#0f172a"
								stroke="#64748b"
								strokeWidth="1.8"
								opacity="0.9"
							/>
							{/* Sella Turcica Fossa Outline (S-point pocket) */}
							<path
								d="M 270 183 Q 280 198, 290 183"
								fill="none"
								stroke="url(#sellaGrad)"
								strokeWidth="2.8"
							/>

							{/* 6. Orbital Cavity & Orbitale Rim (Глазница и подглазничный край) */}
							<path
								d="M 435 175 C 445 195, 440 230, 415 230 C 390 230, 395 195, 410 178 Z"
								fill="#090d16"
								stroke="#64748b"
								strokeWidth="1.8"
								opacity="0.9"
							/>
							{/* Orbitale Floor Marker */}
							<path
								d="M 405 230 Q 415 233, 425 228"
								fill="none"
								stroke="#38bdf8"
								strokeWidth="2"
							/>

							{/* 7. Porion / External Auditory Meatus (Слуховой проход) */}
							<ellipse
								cx="245"
								cy="245"
								rx="8"
								ry="11"
								fill="#020617"
								stroke="#64748b"
								strokeWidth="1.8"
							/>

							{/* 8. Maxilla, Hard Palate, Maxillary Sinus (Верхняя челюсть, нёбо, гайморова пазуха) */}
							{/* Maxillary Sinus Radiolucency */}
							<path
								d="M 370 260 C 430 250, 445 280, 440 310 C 410 320, 360 315, 355 285 Z"
								fill="#090d16"
								stroke="#334155"
								strokeWidth="1.2"
								opacity="0.8"
							/>
							{/* Hard Palate Bone Beam (ANS -> PNS) */}
							<path
								d="M 475 310 Q 400 312, 305 325 L 305 332 Q 400 320, 475 315 Z"
								fill="#334155"
								stroke="url(#boneCortexGrad)"
								strokeWidth="2"
								opacity="0.95"
							/>
							{/* Anterior Maxillary Basal Profile (Nasion -> A -> ANS) */}
							<path
								d="M 440 155 L 455 210 L 442 240 L 475 310 Q 460 328, 462 342 L 468 395"
								fill="none"
								stroke="url(#boneCortexGrad)"
								strokeWidth="2.4"
								opacity="0.95"
							/>

							{/* 9. Mandible (Нижняя челюсть: мыщелок, венечный отросток, ветвь, угол, тело, симфиз) */}
							<path
								d="M 268 258 C 265 250, 275 245, 280 252 L 285 290 Q 305 280, 318 295 L 305 335 L 275 340 L 250 435 Q 260 495, 335 515 L 415 540 Q 448 535, 452 490 Q 450 460, 446 440 L 458 400 L 425 495 Q 380 485, 330 465 L 280 355 Z"
								fill="#1e293b"
								stroke="url(#boneCortexGrad)"
								strokeWidth="2.4"
								opacity="0.9"
							/>
							{/* Mandibular Symphysis Cortical Contour (Контур подбородочного симфиза) */}
							<path
								d="M 446 440 Q 454 465, 452 490 Q 448 515, 442 520 Q 432 538, 420 540 Q 385 538, 380 500 Q 385 450, 425 440 Z"
								fill="#334155"
								stroke="#94a3b8"
								strokeWidth="2"
								opacity="0.95"
							/>
							{/* Mandibular Neurovascular Canal (Нижнечелюстной канал) */}
							<path
								d="M 275 340 Q 265 430, 335 480 Q 385 500, 420 480"
								fill="none"
								stroke="#475569"
								strokeWidth="2"
								strokeDasharray="4 3"
								opacity="0.75"
							/>

							{/* 10. Cervical Spine C1–C4 (Шейные позвонки с зубовидным отростком) */}
							<g fill="url(#cervicalBoneGrad)" stroke="#475569" strokeWidth="1.8" opacity="0.8">
								{/* C1 Atlas */}
								<rect x="235" y="280" width="28" height="20" rx="4" />
								{/* C2 Axis with Dens */}
								<path d="M 230 305 L 245 285 L 252 285 L 258 305 L 262 330 L 225 330 Z" />
								{/* C3 */}
								<rect x="220" y="340" width="36" height="26" rx="5" />
								{/* C4 */}
								<rect x="215" y="375" width="38" height="28" rx="5" />
								{/* C5 */}
								<rect x="210" y="412" width="40" height="30" rx="5" />
							</g>

							{/* 11. Central Incisors with Anatomical Roots & Pulp Chambers (Резцы с корнями) */}
							<g stroke="#cbd5e1" strokeWidth="2" fill="#475569">
								{/* Upper Central Incisor (U1: коронка и корень) */}
								<path
									d="M 438 325 Q 448 350, 460 380 L 468 395 Q 472 396, 470 392 L 452 335 Q 445 322, 438 325 Z"
									fill="#64748b"
								/>
								{/* Upper Pulp Canal */}
								<line x1="442" y1="332" x2="464" y2="390" stroke="#020617" strokeWidth="1.2" />

								{/* Lower Central Incisor (L1: коронка и корень) */}
								<path
									d="M 425 495 Q 438 460, 448 415 L 458 400 Q 462 401, 460 405 L 440 485 Q 430 498, 425 495 Z"
									fill="#64748b"
								/>
								{/* Lower Pulp Canal */}
								<line x1="428" y1="488" x2="454" y2="406" stroke="#020617" strokeWidth="1.2" />
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
							U1t: { dx: 18, dy: -14, align: "start" },
							U1a: { dx: -54, dy: -4, align: "end" },
							L1t: { dx: 22, dy: -6, align: "start" },
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
		</div>
	);
}
