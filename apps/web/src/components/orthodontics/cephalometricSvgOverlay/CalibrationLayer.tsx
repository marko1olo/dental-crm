import React from "react";
import type { Point2D } from "../cephalometricMath";

interface CalibrationLayerProps {
	calibrationPoints: Point2D[];
}

export const CalibrationLayer: React.FC<CalibrationLayerProps> = ({ calibrationPoints }) => {
	const p0 = calibrationPoints[0];
	const p1 = calibrationPoints[1];

	return (
		<g className="calibration-layer">
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
			{calibrationPoints.length === 2 && p0 && p1 && (
				<line
					x1={p0.x}
					y1={p0.y}
					x2={p1.x}
					y2={p1.y}
					stroke="#f59e0b"
					strokeWidth="3"
				/>
			)}
		</g>
	);
};
