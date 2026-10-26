/**
 * PanoramicMeasurementOverlay.tsx — Оверлей клинических измерений (линейки, углы)
 * Mandate 8b: строго <= 120 строк.
 */

import React, { useState, useCallback } from "react";
import type { RulerMeasurement, AngleMeasurement, PanoramicMeasurementOverlayProps } from "./panoramicOverlay/types.js";
import { RulerOverlaySvg } from "./panoramicOverlay/RulerOverlaySvg.js";
import { AngleOverlaySvg } from "./panoramicOverlay/AngleOverlaySvg.js";

export type { RulerMeasurement, AngleMeasurement, PanoramicMeasurementOverlayProps };

export const PanoramicMeasurementOverlay: React.FC<PanoramicMeasurementOverlayProps> = ({
	activeTool,
	mmPerPixel,
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
				onUpdateRulers([...rulers, {
					id: `ruler-${Date.now()}`,
					p1: activeRulerStart,
					p2: { x, y },
					distanceMm: Math.round(distanceMm * 10) / 10,
				}]);
				setActiveRulerStart(null);
			}
		} else if (activeTool === "angle") {
			const nextPts = [...anglePoints, { x, y }];
			if (nextPts.length === 3) {
				const [p1, p2, p3] = nextPts;
				const v1x = p1!.x - p2!.x; const v1y = p1!.y - p2!.y;
				const v2x = p3!.x - p2!.x; const v2y = p3!.y - p2!.y;
				const dot = v1x * v2x + v1y * v2y;
				const mag1 = Math.hypot(v1x, v1y); const mag2 = Math.hypot(v2x, v2y);
				const angleRad = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2 || 1))));
				const angleDeg = Math.round(((angleRad * 180) / Math.PI) * 10) / 10;
				onUpdateAngles([...angles, {
					id: `angle-${Date.now()}`,
					p1: p1!, p2: p2!, p3: p3!, angleDeg,
				}]);
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
			<RulerOverlaySvg
				rulers={rulers}
				activeRulerStart={activeRulerStart}
				hoverPos={hoverPos}
				mmPerPixel={mmPerPixel}
			/>
			<AngleOverlaySvg
				angles={angles}
				anglePoints={anglePoints}
				hoverPos={hoverPos}
			/>
		</svg>
	);
};
