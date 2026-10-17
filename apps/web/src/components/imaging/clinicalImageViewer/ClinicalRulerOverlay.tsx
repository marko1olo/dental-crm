import React from "react";
import type { ViewerRulerMeasurement } from "./types.js";
import { extractTransformParams } from "./transformHelpers.js";

export interface ClinicalRulerOverlayProps {
	readonly activeMeasurements: readonly ViewerRulerMeasurement[];
	readonly isRulerActive: boolean;
	readonly transformStr?: string | undefined;
	readonly drawingRuler: { startX: number; startY: number; endX: number; endY: number } | null;
	readonly onDeleteMeasurement: (id: string) => void;
}

export const ClinicalRulerOverlay: React.FC<ClinicalRulerOverlayProps> = ({
	activeMeasurements,
	isRulerActive,
	transformStr,
	drawingRuler,
	onDeleteMeasurement,
}) => {
	const transformParams = extractTransformParams(transformStr);
	const badgeCounterScale = 1 / Math.max(0.2, transformParams.zoom);

	return (
		<svg
			className="clinical-ruler-overlay"
			style={{
				position: "absolute",
				top: 0,
				left: 0,
				width: "100%",
				height: "100%",
				pointerEvents: isRulerActive ? "auto" : "none",
				zIndex: 25,
				transform: transformStr ?? "none",
				transformOrigin: "center center",
			}}
		>
			<title>Калиброванная линейка эндодонтических измерений</title>
			{activeMeasurements.map((m) => {
				const sx = m.startX ?? m.x1Percent ?? 0;
				const sy = m.startY ?? m.y1Percent ?? 0;
				const ex = m.endX ?? m.x2Percent ?? 0;
				const ey = m.endY ?? m.y2Percent ?? 0;
				const lenMm = m.lengthMm ?? m.distanceMm ?? 0;
				const midX = (sx + ex) / 2;
				const midY = (sy + ey) / 2;
				const dx = ex - sx;
				const dy = ey - sy;
				const len = Math.hypot(dx, dy) || 1;
				const perpX = (-dy / len) * 1.5;
				const perpY = (dx / len) * 1.5;

				return (
					<g key={m.id} className="clinical-ruler-measurement-group">
						<line x1={`${sx}%`} y1={`${sy}%`} x2={`${ex}%`} y2={`${ey}%`} stroke="rgba(15, 23, 42, 0.92)" strokeWidth="4" strokeLinecap="round" />
						<line x1={`${sx}%`} y1={`${sy}%`} x2={`${ex}%`} y2={`${ey}%`} stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
						<line x1={`${sx - perpX}%`} y1={`${sy - perpY}%`} x2={`${sx + perpX}%`} y2={`${sy + perpY}%`} stroke="#06b6d4" strokeWidth="2" />
						<line x1={`${ex - perpX}%`} y1={`${ey - perpY}%`} x2={`${ex + perpX}%`} y2={`${ey + perpY}%`} stroke="#06b6d4" strokeWidth="2" />
						<svg x={`${midX}%`} y={`${midY}%`} overflow="visible">
							<g
								transform={`scale(${badgeCounterScale})`}
								style={{ pointerEvents: "auto", cursor: "pointer" }}
								onClick={(e) => { e.stopPropagation(); onDeleteMeasurement(m.id); }}
							>
								<rect x="-36" y="-11" width="72" height="22" rx="5" fill="rgba(15, 23, 42, 0.94)" stroke="#06b6d4" strokeWidth="1.2" />
								<text x="-6" y="4" textAnchor="middle" fill="#f8fafc" fontSize="11" fontFamily="ui-monospace, monospace" fontWeight="700">
									{lenMm.toFixed(1)} мм
								</text>
								<text x="24" y="4" textAnchor="middle" fill="#ef4444" fontSize="11" fontWeight="900">×</text>
							</g>
						</svg>
					</g>
				);
			})}

			{drawingRuler && (
				<g className="clinical-ruler-drawing-group">
					<line x1={`${drawingRuler.startX}%`} y1={`${drawingRuler.startY}%`} x2={`${drawingRuler.endX}%`} y2={`${drawingRuler.endY}%`} stroke="rgba(15, 23, 42, 0.9)" strokeWidth="3.5" strokeDasharray="4 2" />
					<line x1={`${drawingRuler.startX}%`} y1={`${drawingRuler.startY}%`} x2={`${drawingRuler.endX}%`} y2={`${drawingRuler.endY}%`} stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 2" />
				</g>
			)}
		</svg>
	);
};
