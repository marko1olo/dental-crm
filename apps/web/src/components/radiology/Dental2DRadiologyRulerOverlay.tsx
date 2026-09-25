import React from "react";
import { calculatePhysicalDistanceMm, type ViewerPoint2D, type ViewerRulerMeasurement } from "./dentalViewerMath";

export interface Dental2DRadiologyRulerOverlayProps {
	readonly measurements: ViewerRulerMeasurement[];
	readonly rulerStart: ViewerPoint2D | null;
	readonly currentRulerEnd: ViewerPoint2D | null;
	readonly mmPerPixel: number;
}

export const Dental2DRadiologyRulerOverlay: React.FC<Dental2DRadiologyRulerOverlayProps> = ({
	measurements,
	rulerStart,
	currentRulerEnd,
	mmPerPixel,
}) => {
	return (
		<svg
			style={{
				position: "absolute",
				inset: 0,
				width: "100%",
				height: "100%",
				pointerEvents: "none",
			}}
		>
			{/* Saved Measurements */}
			{measurements.map((m) => {
				const midX = (m.startX + m.endX) / 2;
				const midY = (m.startY + m.endY) / 2;
				return (
					<g key={m.id}>
						<line
							x1={m.startX}
							y1={m.startY}
							x2={m.endX}
							y2={m.endY}
							stroke="#0d9488"
							strokeWidth="2.5"
							strokeLinecap="round"
						/>
						<circle cx={m.startX} cy={m.startY} r="4" fill="#14b8a6" />
						<circle cx={m.endX} cy={m.endY} r="4" fill="#14b8a6" />
						<rect
							x={midX - 28}
							y={midY - 12}
							width="56"
							height="18"
							rx="4"
							fill="rgba(15, 23, 42, 0.9)"
							stroke="#14b8a6"
							strokeWidth="1"
						/>
						<text
							x={midX}
							y={midY + 2}
							textAnchor="middle"
							fill="#5eead4"
							fontSize="11"
							fontWeight="bold"
							fontFamily="monospace"
						>
							{m.lengthMm.toFixed(1)} мм
						</text>
					</g>
				);
			})}

			{/* Active In-Progress Ruler Drawing */}
			{rulerStart && currentRulerEnd && (
				<g>
					<line
						x1={rulerStart.x}
						y1={rulerStart.y}
						x2={currentRulerEnd.x}
						y2={currentRulerEnd.y}
						stroke="#f59e0b"
						strokeWidth="2"
						strokeDasharray="4 4"
					/>
					<circle cx={rulerStart.x} cy={rulerStart.y} r="4" fill="#f59e0b" />
					<circle cx={currentRulerEnd.x} cy={currentRulerEnd.y} r="4" fill="#f59e0b" />
					<text
						x={(rulerStart.x + currentRulerEnd.x) / 2 + 8}
						y={(rulerStart.y + currentRulerEnd.y) / 2 - 8}
						fill="#fbbf24"
						fontSize="11"
						fontWeight="bold"
						fontFamily="monospace"
					>
						{calculatePhysicalDistanceMm(rulerStart, currentRulerEnd, mmPerPixel).toFixed(1)} мм
					</text>
				</g>
			)}
		</svg>
	);
};
