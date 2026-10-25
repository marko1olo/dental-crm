/**
 * VisiographWatermarkOverlay.ts
 * Draws graphical overlays for rulers, angles, and periapical lesion contours.
 */

import type {
	AngleMeasurement,
	CalibrationReference,
	PeriapicalLesion,
	RulerMeasurement,
} from "./VisiographMeasurementMath";

export function renderMeasurementsOverlay(
	ctx: CanvasRenderingContext2D,
	options: {
		rulers?: RulerMeasurement[] | undefined;
		angles?: AngleMeasurement[] | undefined;
		lesions?: PeriapicalLesion[] | undefined;
		calibration?: CalibrationReference | undefined;
	},
): void {
	const { rulers = [], angles = [], lesions = [] } = options;
	ctx.save();

	// 1. Draw Rulers
	for (const ruler of rulers) {
		const { p1, p2, lengthMm, color = "#00e5ff", label } = ruler;
		ctx.strokeStyle = color;
		ctx.lineWidth = 2.5;
		ctx.lineCap = "round";
		ctx.beginPath();
		ctx.moveTo(p1.x, p1.y);
		ctx.lineTo(p2.x, p2.y);
		ctx.stroke();

		const midX = (p1.x + p2.x) / 2;
		const midY = (p1.y + p2.y) / 2;
		const text = `${label ? `${label}: ` : ""}${lengthMm.toFixed(1)} мм`;
		ctx.font = "bold 12px sans-serif";
		const bgWidth = ctx.measureText(text).width + 12;
		ctx.fillStyle = "rgba(0, 0, 0, 0.82)";
		ctx.beginPath();
		ctx.roundRect(midX - bgWidth / 2, midY - 22, bgWidth, 20, 4);
		ctx.fill();
		ctx.strokeStyle = color;
		ctx.lineWidth = 1.0;
		ctx.stroke();

		ctx.fillStyle = "#ffffff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(text, midX, midY - 12);
	}

	// 2. Draw Angles
	for (const angle of angles) {
		const { vertex, arm1, arm2, angleDeg, color = "#ffab00", label } = angle;
		ctx.strokeStyle = color;
		ctx.lineWidth = 2.0;
		ctx.beginPath();
		ctx.moveTo(arm1.x, arm1.y);
		ctx.lineTo(vertex.x, vertex.y);
		ctx.lineTo(arm2.x, arm2.y);
		ctx.stroke();

		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.arc(vertex.x, vertex.y, 4, 0, Math.PI * 2);
		ctx.fill();

		const text = `${label ? `${label}: ` : ""}${angleDeg.toFixed(1)}°`;
		ctx.font = "bold 12px sans-serif";
		const bgWidth = ctx.measureText(text).width + 10;
		ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
		ctx.beginPath();
		ctx.roundRect(vertex.x + 10, vertex.y - 20, bgWidth, 18, 4);
		ctx.fill();
		ctx.strokeStyle = color;
		ctx.lineWidth = 1;
		ctx.stroke();

		ctx.fillStyle = "#ffffff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(text, vertex.x + 10 + bgWidth / 2, vertex.y - 11);
	}

	// 3. Draw Periapical Lesion Contours
	for (const lesion of lesions) {
		const { points, areaMm2, equivalentDiameterMm, color = "#ff1744" } = lesion;
		if (points.length < 3) continue;

		ctx.fillStyle = "rgba(255, 23, 68, 0.22)";
		ctx.strokeStyle = color;
		ctx.lineWidth = 2.0;
		ctx.setLineDash([4, 3]);
		ctx.beginPath();
		const first = points[0]!;
		ctx.moveTo(first.x, first.y);
		for (let i = 1; i < points.length; i++) ctx.lineTo(points[i]!.x, points[i]!.y);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
		ctx.setLineDash([]);

		let cx = 0;
		let cy = 0;
		for (const p of points) { cx += p.x; cy += p.y; }
		cx /= points.length;
		cy /= points.length;

		const text = `Очаг: ${areaMm2.toFixed(1)} мм² (Ø ${equivalentDiameterMm.toFixed(1)} мм)`;
		ctx.font = "bold 11px sans-serif";
		const bgWidth = ctx.measureText(text).width + 12;
		ctx.fillStyle = "rgba(0, 0, 0, 0.88)";
		ctx.beginPath();
		ctx.roundRect(cx - bgWidth / 2, cy - 11, bgWidth, 22, 4);
		ctx.fill();
		ctx.strokeStyle = color;
		ctx.lineWidth = 1;
		ctx.stroke();

		ctx.fillStyle = "#ffffff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(text, cx, cy);
	}

	ctx.restore();
}
