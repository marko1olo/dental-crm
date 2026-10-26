/**
 * RulerOverlaySvg.tsx — SVG-элементы отображения линеек и активного предпросмотра
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import type { RulerMeasurement } from "./types.js";

interface Props {
	rulers: RulerMeasurement[];
	activeRulerStart: { x: number; y: number } | null;
	hoverPos: { x: number; y: number } | null;
	mmPerPixel: number;
}

export const RulerOverlaySvg: React.FC<Props> = ({
	rulers,
	activeRulerStart,
	hoverPos,
	mmPerPixel,
}) => {
	return (
		<>
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
		</>
	);
};
