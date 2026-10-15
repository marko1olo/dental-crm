import React, { useState, useCallback } from "react";

export interface RulerMeasurement {
	readonly id: string;
	readonly p1: { x: number; y: number };
	readonly p2: { x: number; y: number };
	readonly distanceMm: number;
}

export interface AngleMeasurement {
	readonly id: string;
	readonly p1: { x: number; y: number };
	readonly p2: { x: number; y: number }; // Vertex
	readonly p3: { x: number; y: number };
	readonly angleDeg: number;
}

export interface PanoramicMeasurementOverlayProps {
	readonly activeTool: "select" | "ruler" | "angle";
	readonly mmPerPixel: number; // Calibration factor
	readonly width: number;
	readonly height: number;
	readonly rulers: RulerMeasurement[];
	readonly onUpdateRulers: (rulers: RulerMeasurement[]) => void;
	readonly angles: AngleMeasurement[];
	readonly onUpdateAngles: (angles: AngleMeasurement[]) => void;
}

export const PanoramicMeasurementOverlay: React.FC<PanoramicMeasurementOverlayProps> = ({
	activeTool,
	mmPerPixel,
	width,
	height,
	rulers,
	onUpdateRulers,
	angles,
	onUpdateAngles,
}) => {
	const [activeRulerStart, setActiveRulerStart] = useState<{ x: number; y: number } | null>(null);
	const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
	const [anglePoints, setAnglePoints] = useState<{ x: number; y: number }[]>([]);

	const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
		const rect = e.currentTarget.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		if (activeTool === "ruler") {
			if (!activeRulerStart) {
				setActiveRulerStart({ x, y });
			} else {
				const dx = (x - activeRulerStart.x) * mmPerPixel;
				const dy = (y - activeRulerStart.y) * mmPerPixel;
				const distanceMm = Math.hypot(dx, dy);

				const newRuler: RulerMeasurement = {
					id: `ruler-${Date.now()}`,
					p1: activeRulerStart,
					p2: { x, y },
					distanceMm: Math.round(distanceMm * 10) / 10,
				};
				onUpdateRulers([...rulers, newRuler]);
				setActiveRulerStart(null);
			}
		} else if (activeTool === "angle") {
			const nextPts = [...anglePoints, { x, y }];
			if (nextPts.length === 3) {
				const [p1, p2, p3] = nextPts;
				const v1x = p1!.x - p2!.x;
				const v1y = p1!.y - p2!.y;
				const v2x = p3!.x - p2!.x;
				const v2y = p3!.y - p2!.y;

				const dot = v1x * v2x + v1y * v2y;
				const mag1 = Math.hypot(v1x, v1y);
				const mag2 = Math.hypot(v2x, v2y);
				const angleRad = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2 || 1))));
				const angleDeg = Math.round(((angleRad * 180) / Math.PI) * 10) / 10;

				const newAngle: AngleMeasurement = {
					id: `angle-${Date.now()}`,
					p1: p1!,
					p2: p2!,
					p3: p3!,
					angleDeg,
				};
				onUpdateAngles([...angles, newAngle]);
				setAnglePoints([]);
			} else {
				setAnglePoints(nextPts);
			}
		}
	}, [activeTool, activeRulerStart, anglePoints, mmPerPixel, rulers, onUpdateRulers, angles, onUpdateAngles]);

	const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
		if (activeTool === "select") return;
		const rect = e.currentTarget.getBoundingClientRect();
		setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
	}, [activeTool]);

	return (
		<svg
			className={`absolute inset-0 w-full h-full pointer-events-${activeTool === "select" ? "none" : "auto"}`}
			style={{ cursor: activeTool === "select" ? "default" : "crosshair" }}
			onMouseDown={handleMouseDown}
			onMouseMove={handleMouseMove}
			data-testid="panoramic-measurement-overlay"
		>
			<defs>
				<filter id="text-backdrop" x="-10%" y="-10%" width="120%" height="120%">
					<feFlood floodColor="rgba(0,0,0,0.85)" result="bg" />
					<feMerge>
						<feMergeNode in="bg" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
			</defs>

			{/* Existing Rulers */}
			{rulers.map((r) => {
				const midX = (r.p1.x + r.p2.x) / 2;
				const midY = (r.p1.y + r.p2.y) / 2;
				return (
					<g key={r.id}>
						<line
							x1={r.p1.x}
							y1={r.p1.y}
							x2={r.p2.x}
							y2={r.p2.y}
							stroke="#38bdf8"
							strokeWidth="2"
							strokeDasharray="4 2"
						/>
						<circle cx={r.p1.x} cy={r.p1.y} r="3.5" fill="#38bdf8" />
						<circle cx={r.p2.x} cy={r.p2.y} r="3.5" fill="#38bdf8" />
						<rect
							x={midX - 28}
							y={midY - 18}
							width="56"
							height="18"
							rx="4"
							fill="rgba(0, 0, 0, 0.85)"
							stroke="#38bdf8"
							strokeWidth="1"
						/>
						<text
							x={midX}
							y={midY - 5}
							fill="#ffffff"
							fontSize="10"
							fontWeight="bold"
							textAnchor="middle"
							fontFamily="monospace"
						>
							{r.distanceMm.toFixed(1)} мм
						</text>
					</g>
				);
			})}

			{/* Active Ruler Preview */}
			{activeRulerStart && hoverPos && (
				<g>
					<line
						x1={activeRulerStart.x}
						y1={activeRulerStart.y}
						x2={hoverPos.x}
						y2={hoverPos.y}
						stroke="#f59e0b"
						strokeWidth="2"
					/>
					<circle cx={activeRulerStart.x} cy={activeRulerStart.y} r="4" fill="#f59e0b" />
					<circle cx={hoverPos.x} cy={hoverPos.y} r="4" fill="#f59e0b" />
					{(() => {
						const dist = Math.hypot(
							(hoverPos.x - activeRulerStart.x) * mmPerPixel,
							(hoverPos.y - activeRulerStart.y) * mmPerPixel,
						);
						return (
							<text
								x={(activeRulerStart.x + hoverPos.x) / 2}
								y={(activeRulerStart.y + hoverPos.y) / 2 - 8}
								fill="#fbbf24"
								fontSize="11"
								fontWeight="bold"
								textAnchor="middle"
								fontFamily="monospace"
							>
								{dist.toFixed(1)} мм
							</text>
						);
					})()}
				</g>
			)}

			{/* Existing Angles */}
			{angles.map((a) => (
				<g key={a.id}>
					<line x1={a.p1.x} y1={a.p1.y} x2={a.p2.x} y2={a.p2.y} stroke="#a855f7" strokeWidth="2" />
					<line x1={a.p2.x} y1={a.p2.y} x2={a.p3.x} y2={a.p3.y} stroke="#a855f7" strokeWidth="2" />
					<circle cx={a.p2.x} cy={a.p2.y} r="4" fill="#a855f7" />
					<rect
						x={a.p2.x + 8}
						y={a.p2.y - 18}
						width="48"
						height="18"
						rx="4"
						fill="rgba(0, 0, 0, 0.85)"
						stroke="#a855f7"
						strokeWidth="1"
					/>
					<text
						x={a.p2.x + 32}
						y={a.p2.y - 5}
						fill="#e9d5ff"
						fontSize="10"
						fontWeight="bold"
						textAnchor="middle"
						fontFamily="monospace"
					>
						{a.angleDeg.toFixed(1)}°
					</text>
				</g>
			))}

			{/* Active Angle Points Preview */}
			{anglePoints.length > 0 && hoverPos && (
				<g>
					{anglePoints.map((pt, idx) => (
						<circle key={`ang-pt-${idx}`} cx={pt.x} cy={pt.y} r="4" fill="#ec4899" />
					))}
					{anglePoints.length === 1 && (
						<line
							x1={anglePoints[0]!.x}
							y1={anglePoints[0]!.y}
							x2={hoverPos.x}
							y2={hoverPos.y}
							stroke="#ec4899"
							strokeWidth="1.5"
							strokeDasharray="3 3"
						/>
					)}
					{anglePoints.length === 2 && (
						<>
							<line
								x1={anglePoints[0]!.x}
								y1={anglePoints[0]!.y}
								x2={anglePoints[1]!.x}
								y2={anglePoints[1]!.y}
								stroke="#ec4899"
								strokeWidth="2"
							/>
							<line
								x1={anglePoints[1]!.x}
								y1={anglePoints[1]!.y}
								x2={hoverPos.x}
								y2={hoverPos.y}
								stroke="#ec4899"
								strokeWidth="1.5"
								strokeDasharray="3 3"
							/>
						</>
					)}
				</g>
			)}
		</svg>
	);
};
