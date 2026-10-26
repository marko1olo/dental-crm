/**
 * AngleOverlaySvg.tsx — SVG-элементы отображения углов и активного предпросмотра
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import type { AngleMeasurement } from "./types.js";

interface Props {
	angles: AngleMeasurement[];
	anglePoints: { x: number; y: number }[];
	hoverPos: { x: number; y: number } | null;
}

export const AngleOverlaySvg: React.FC<Props> = ({
	angles,
	anglePoints,
	hoverPos,
}) => {
	return (
		<>
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
		</>
	);
};
