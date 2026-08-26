import type React from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import type {
	ArchControlPoint,
	CrossSectionPlane,
	PanoramicCurveSample,
	Point2D,
} from "./cbctPanoramicCurveMath";

export interface CbctAxialCurveViewportProps {
	imageUrl?: string | undefined;
	controlPoints: ArchControlPoint[];
	onUpdateControlPoints: (pts: ArchControlPoint[]) => void;
	curveSamples: PanoramicCurveSample[];
	crossSectionPlanes: CrossSectionPlane[];
	activeSliceIndex: number;
	onSelectSliceIndex: (index: number) => void;
	showNormals?: boolean | undefined;
	showToothBadges?: boolean | undefined;
	showFocalTrough?: boolean | undefined;
	isEditMode?: boolean | undefined;
	focalTroughThicknessMm?: number | undefined;
}

export const CbctAxialCurveViewport: React.FC<CbctAxialCurveViewportProps> = ({
	imageUrl,
	controlPoints,
	onUpdateControlPoints,
	curveSamples,
	crossSectionPlanes,
	activeSliceIndex,
	onSelectSliceIndex,
	showNormals = true,
	showToothBadges = true,
	showFocalTrough = true,
	isEditMode = true,
	focalTroughThicknessMm = 10,
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const [draggingPointId, setDraggingPointId] = useState<string | null>(null);

	// Convert control points to SVG path for the dental arch spline
	const splineSvgPath = useMemo(() => {
		if (curveSamples.length < 2) return "";
		const start = curveSamples[0]!.point;
		let d = `M ${start.x} ${start.y}`;
		for (let i = 1; i < curveSamples.length; i++) {
			const pt = curveSamples[i]!.point;
			d += ` L ${pt.x} ${pt.y}`;
		}
		return d;
	}, [curveSamples]);

	// Focal trough corridor polygon (outer buccal boundary -> end -> inner lingual boundary reversed)
	const focalTroughPolygonPath = useMemo(() => {
		if (!showFocalTrough || crossSectionPlanes.length < 2) return "";
		const buccalPts = crossSectionPlanes.map((p) => p.focalTroughBuccalPoint);
		const lingualPts = crossSectionPlanes.map((p) => p.focalTroughLingualPoint);

		if (buccalPts.length === 0 || lingualPts.length === 0) return "";

		let d = `M ${buccalPts[0]!.x} ${buccalPts[0]!.y}`;
		for (let i = 1; i < buccalPts.length; i++) {
			d += ` L ${buccalPts[i]!.x} ${buccalPts[i]!.y}`;
		}
		for (let i = lingualPts.length - 1; i >= 0; i--) {
			d += ` L ${lingualPts[i]!.x} ${lingualPts[i]!.y}`;
		}
		d += " Z";
		return d;
	}, [showFocalTrough, crossSectionPlanes]);

	// Convert client mouse position to percentage coordinates (0..100)
	const getPercentCoords = useCallback(
		(clientX: number, clientY: number): Point2D | null => {
			if (!containerRef.current) return null;
			const rect = containerRef.current.getBoundingClientRect();
			if (rect.width <= 0 || rect.height <= 0) return null;

			const xPx = clientX - rect.left;
			const yPx = clientY - rect.top;

			const xPct = Math.max(5, Math.min(95, (xPx / rect.width) * 100));
			const yPct = Math.max(5, Math.min(95, (yPx / rect.height) * 100));

			return {
				x: Number(xPct.toFixed(2)),
				y: Number(yPct.toFixed(2)),
			};
		},
		[],
	);

	// Mouse drag handlers for control points
	const handleMouseDown = (pointId: string, e: React.MouseEvent) => {
		if (!isEditMode) return;
		e.stopPropagation();
		setDraggingPointId(pointId);
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		if (!draggingPointId) return;
		const coords = getPercentCoords(e.clientX, e.clientY);
		if (!coords) return;

		const updated = controlPoints.map((pt) => {
			if (pt.id === draggingPointId && !pt.isLocked) {
				return { ...pt, x: coords.x, y: coords.y };
			}
			return pt;
		});

		onUpdateControlPoints(updated);
	};

	const handleMouseUp = () => {
		setDraggingPointId(null);
	};

	return (
		<div
			ref={containerRef}
			className="relative w-full h-full min-h-[320px] bg-slate-950 rounded-2xl overflow-hidden select-none border border-slate-800 shadow-inner flex items-center justify-center"
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
			onMouseLeave={handleMouseUp}
			data-testid="cbct-axial-viewport"
		>
			{/* Axial CBCT slice background or high-contrast procedural scout */}
			{imageUrl ? (
				<img
					src={imageUrl}
					alt="Аксиальный срез КЛКТ"
					className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-80"
				/>
			) : (
				<div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
					{/* Procedural Axial Grid & Jaw Silhouette */}
					<svg
						className="w-full h-full"
						viewBox="0 0 100 100"
						preserveAspectRatio="none"
						aria-hidden="true"
					>
						<defs>
							<radialGradient id="axialGlow" cx="50%" cy="50%" r="50%">
								<stop offset="0%" stopColor="var(--teal)" stopOpacity="0.15" />
								<stop offset="100%" stopColor="transparent" stopOpacity="0" />
							</radialGradient>
						</defs>
						<circle cx="50" cy="50" r="45" fill="url(#axialGlow)" />
						<ellipse
							cx="50"
							cy="50"
							rx="35"
							ry="38"
							fill="none"
							stroke="var(--teal)"
							strokeWidth="0.3"
							strokeDasharray="2 2"
						/>
						{/* Coordinate crosshair lines */}
						<line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255,255,255,0.06)" strokeWidth="0.3" />
						<line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.06)" strokeWidth="0.3" />
					</svg>
				</div>
			)}

			{/* Anatomical Orientation Badges */}
			<div className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-slate-900/80 text-[10px] font-bold text-slate-400 border border-slate-800 pointer-events-none z-10">
				ANTERIOR (Фронт)
			</div>
			<div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-slate-900/80 text-[10px] font-bold text-slate-400 border border-slate-800 pointer-events-none z-10">
				POSTERIOR (Дорсально)
			</div>
			<div className="absolute left-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-slate-900/80 text-[10px] font-bold text-slate-400 border border-slate-800 pointer-events-none z-10">
				R (Право)
			</div>
			<div className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-slate-900/80 text-[10px] font-bold text-slate-400 border border-slate-800 pointer-events-none z-10">
				L (Лево)
			</div>

			{/* Interactive SVG Overlay */}
			<svg
				className="absolute inset-0 w-full h-full z-20 cursor-crosshair"
				viewBox="0 0 100 100"
				preserveAspectRatio="none"
			>
				{/* 1. Shaded Focal Trough Ribbon (5mm / 10mm / 20mm corridor) */}
				{showFocalTrough && focalTroughPolygonPath && (
					<path
						d={focalTroughPolygonPath}
						fill="var(--teal, #06b6d4)"
						fillOpacity="0.14"
						stroke="var(--teal, #06b6d4)"
						strokeWidth="0.4"
						strokeDasharray="1.5 1.5"
						className="transition-all duration-200"
					/>
				)}

				{/* 2. Normal Cross-Section Lines (32–40 pararadicular slices) */}
				{showNormals &&
					crossSectionPlanes.map((plane) => {
						const isActive = plane.sliceIndex === activeSliceIndex;
						return (
							<g
								key={`plane-${plane.sliceIndex}`}
								onClick={(e) => {
									e.stopPropagation();
									onSelectSliceIndex(plane.sliceIndex);
								}}
								className="cursor-pointer group"
							>
								{/* Extended hit target line */}
								<line
									x1={plane.startPoint.x}
									y1={plane.startPoint.y}
									x2={plane.endPoint.x}
									y2={plane.endPoint.y}
									stroke="transparent"
									strokeWidth="3.0"
								/>
								{/* Visible slicing normal line */}
								<line
									x1={plane.startPoint.x}
									y1={plane.startPoint.y}
									x2={plane.endPoint.x}
									y2={plane.endPoint.y}
									stroke={
										isActive
											? "var(--warn-fg, #eab308)"
											: "rgba(56, 189, 248, 0.45)"
									}
									strokeWidth={isActive ? "0.9" : "0.35"}
									className="transition-all"
								/>
								{/* Center tick dot on the curve */}
								<circle
									cx={plane.center.x}
									cy={plane.center.y}
									r={isActive ? "1.0" : "0.5"}
									fill={isActive ? "var(--warn-fg, #eab308)" : "var(--teal, #06b6d4)"}
								/>
							</g>
						);
					})}

				{/* 3. The Main Panoramic Dental Arch Spline Curve */}
				{splineSvgPath && (
					<path
						d={splineSvgPath}
						fill="none"
						stroke="var(--teal, #06b6d4)"
						strokeWidth="0.8"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]"
					/>
				)}

				{/* 4. Draggable Arch Control Points */}
				{isEditMode &&
					controlPoints.map((pt) => {
						const isDragging = pt.id === draggingPointId;
						return (
							<g
								key={pt.id}
								onMouseDown={(e) => handleMouseDown(pt.id, e)}
								className="cursor-grab active:cursor-grabbing group"
								data-testid={`control-point-${pt.id}`}
							>
								{/* Outer glowing halo */}
								<circle
									cx={pt.x}
									cy={pt.y}
									r={isDragging ? "2.6" : "1.8"}
									fill="var(--teal, #06b6d4)"
									fillOpacity={isDragging ? "0.5" : "0.2"}
									className="transition-all"
								/>
								{/* Inner core circle */}
								<circle
									cx={pt.x}
									cy={pt.y}
									r="1.0"
									fill="white"
									stroke="var(--teal, #06b6d4)"
									strokeWidth="0.4"
								/>
							</g>
						);
					})}

				{/* 5. FDI Tooth Number Badges along the arch */}
				{showToothBadges &&
					crossSectionPlanes
						.filter((_, idx) => idx % 3 === 0 || idx === activeSliceIndex)
						.map((plane) => {
							if (!plane.fdiTooth) return null;
							const isActive = plane.sliceIndex === activeSliceIndex;
							return (
								<g
									key={`badge-${plane.sliceIndex}`}
									transform={`translate(${plane.startPoint.x}, ${plane.startPoint.y})`}
									className="pointer-events-none"
								>
									<rect
										x="-2.2"
										y="-2.0"
										width="4.4"
										height="4.0"
										rx="0.8"
										fill={isActive ? "var(--warn-bg, #854d0e)" : "rgba(15, 23, 42, 0.85)"}
										stroke={isActive ? "var(--warn-fg, #eab308)" : "rgba(56, 189, 248, 0.5)"}
										strokeWidth="0.25"
									/>
									<text
										x="0"
										y="0.8"
										fill={isActive ? "var(--warn-fg, #fef08a)" : "#e2e8f0"}
										fontSize="2.2"
										fontWeight="bold"
										textAnchor="middle"
										fontFamily="sans-serif"
									>
										{plane.fdiTooth}
									</text>
								</g>
							);
						})}
			</svg>

			{/* Info pill in corner */}
			<div className="absolute bottom-3 left-3 z-30 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-sm text-xs flex items-center gap-2 text-slate-300">
				<span className="w-2 h-2 rounded-full bg-[var(--teal,#06b6d4)] animate-pulse" />
				<span>Фокальный слой: <strong className="text-[var(--teal,#06b6d4)]">{focalTroughThicknessMm} мм</strong></span>
				<span>•</span>
				<span>Срезов: <strong className="text-white">{crossSectionPlanes.length}</strong></span>
			</div>
		</div>
	);
};
