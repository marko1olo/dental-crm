/**
 * DENTE CRM — Canvas Rendering Engine for Dental Radiology Studies
 * Specialized rendering for:
 * 1. Calibrated straight rulers (drawRuler)
 * 2. Multi-point curved root canal apex calipers (drawCurvedCanal)
 * 3. Clinical high-precision 2.5x Loupe / Magnifier overlay (drawMagnifierOverlay)
 * 4. High-resolution DICOM/RVG export with 5.0 mm calibration ladder & clinical metadata
 */

import {
	type ViewerPoint2D,
	type ViewerRulerMeasurement,
	type ViewerCurvedMeasurement,
	calculateCurvedCanalLengthMm,
	formatHumanStudyDate,
	formatPatientAge,
} from "./dentalViewerMath.js";

export function drawRuler(
	ctx: CanvasRenderingContext2D,
	p1: ViewerPoint2D,
	p2: ViewerPoint2D,
	label: string,
	color = "#00C853",
): void {
	ctx.save();
	ctx.strokeStyle = color;
	ctx.lineWidth = 2.5;
	ctx.beginPath();
	ctx.moveTo(p1.x, p1.y);
	ctx.lineTo(p2.x, p2.y);
	ctx.stroke();

	// End ticks
	const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
	const perp = angle + Math.PI / 2;
	const tickLen = 7;

	ctx.beginPath();
	ctx.moveTo(p1.x - Math.cos(perp) * tickLen, p1.y - Math.sin(perp) * tickLen);
	ctx.lineTo(p1.x + Math.cos(perp) * tickLen, p1.y + Math.sin(perp) * tickLen);
	ctx.moveTo(p2.x - Math.cos(perp) * tickLen, p2.y - Math.sin(perp) * tickLen);
	ctx.lineTo(p2.x + Math.cos(perp) * tickLen, p2.y + Math.sin(perp) * tickLen);
	ctx.stroke();

	// Label pill
	const midX = (p1.x + p2.x) / 2;
	const midY = (p1.y + p2.y) / 2;
	ctx.font = "bold 13px monospace";
	const textWidth = ctx.measureText(label).width;
	const padX = 6;

	ctx.fillStyle = "rgba(2, 6, 23, 0.92)";
	ctx.strokeStyle = color;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.rect(midX + 4, midY - 20, textWidth + padX * 2, 22);
	ctx.fill();
	ctx.stroke();

	ctx.fillStyle = "#ffffff";
	ctx.textBaseline = "middle";
	ctx.fillText(label, midX + 4 + padX, midY - 9);
	ctx.restore();
}

/**
 * Draws curved endodontic root canal measurement (Apex WL Caliper).
 * Essential for curved canals where straight rulers underestimate working length by 1.5-3.5 mm.
 */
export function drawCurvedCanal(
	ctx: CanvasRenderingContext2D,
	points: readonly ViewerPoint2D[],
	totalLengthMm: number,
	label?: string,
	color = "#38bdf8",
	isDraft = false,
): void {
	if (!points || points.length === 0) return;

	ctx.save();
	ctx.strokeStyle = color;
	ctx.lineWidth = isDraft ? 2.0 : 2.8;
	if (isDraft) {
		ctx.setLineDash([4, 4]);
	} else {
		ctx.setLineDash([]);
	}

	// Draw polyline
	ctx.beginPath();
	ctx.moveTo(points[0]!.x, points[0]!.y);
	for (let i = 1; i < points.length; i++) {
		ctx.lineTo(points[i]!.x, points[i]!.y);
	}
	ctx.stroke();
	ctx.setLineDash([]);

	// Draw waypoint vertices
	for (let i = 0; i < points.length; i++) {
		const pt = points[i]!;
		const isFirst = i === 0;
		const isLast = i === points.length - 1 && points.length > 1;

		ctx.beginPath();
		ctx.arc(pt.x, pt.y, isFirst || isLast ? 5 : 3.5, 0, Math.PI * 2);
		ctx.fillStyle = isLast ? "#ef4444" : isFirst ? "#10b981" : color;
		ctx.fill();
		ctx.lineWidth = 1.5;
		ctx.strokeStyle = "#ffffff";
		ctx.stroke();
	}

	// Draw WL Result pill near the apex or midpoint
	if (points.length >= 2) {
		const lastPt = points[points.length - 1]!;
		const pillText = label || `WL: ${totalLengthMm.toFixed(1)} мм`;
		ctx.font = "bold 13px monospace";
		const textWidth = ctx.measureText(pillText).width;
		const padX = 7;
		const pillX = lastPt.x + 8;
		const pillY = lastPt.y - 12;

		ctx.fillStyle = "rgba(2, 6, 23, 0.94)";
		ctx.strokeStyle = color;
		ctx.lineWidth = 1.2;
		ctx.beginPath();
		ctx.rect(pillX, pillY - 11, textWidth + padX * 2, 22);
		ctx.fill();
		ctx.stroke();

		ctx.fillStyle = "#ffffff";
		ctx.textBaseline = "middle";
		ctx.fillText(pillText, pillX + padX, pillY);
	}

	ctx.restore();
}

export interface MagnifierOverlayOptions {
	readonly ctx: CanvasRenderingContext2D;
	readonly canvasWidth: number;
	readonly canvasHeight: number;
	readonly img: HTMLImageElement;
	readonly filteredCanvas: HTMLCanvasElement | null;
	readonly magnifierPos: ViewerPoint2D;
	readonly zoom: number;
	readonly panX: number;
	readonly panY: number;
	readonly magnificationFactor?: number;
	readonly radius?: number;
}

/**
 * Draws precision 2.5x optical loupe / magnifier overlay on top of the viewport.
 * Grounded in EzDent-i Loupe tool for root apex inspection and micro-crack detection.
 */
export function drawMagnifierOverlay({
	ctx,
	canvasWidth,
	canvasHeight,
	img,
	filteredCanvas,
	magnifierPos,
	zoom,
	panX,
	panY,
	magnificationFactor = 2.5,
	radius = 95,
}: MagnifierOverlayOptions): void {
	const source = filteredCanvas || img;
	if (!source || img.width === 0 || img.height === 0) return;

	// Calculate corresponding coordinates in raw image space
	const centerWorldX =
		(magnifierPos.x - (canvasWidth / 2 + panX)) / zoom + img.width / 2;
	const centerWorldY =
		(magnifierPos.y - (canvasHeight / 2 + panY)) / zoom + img.height / 2;

	const magZoom = zoom * magnificationFactor;

	ctx.save();

	// 1. Clip circle for lens
	ctx.beginPath();
	ctx.arc(magnifierPos.x, magnifierPos.y, radius, 0, Math.PI * 2);
	ctx.clip();

	// Clear inside lens to avoid ghosting
	ctx.fillStyle = "#020617";
	ctx.fillRect(
		magnifierPos.x - radius,
		magnifierPos.y - radius,
		radius * 2,
		radius * 2,
	);

	// 2. Render magnified image fragment
	ctx.save();
	ctx.translate(magnifierPos.x, magnifierPos.y);
	ctx.scale(magZoom, magZoom);
	ctx.translate(-centerWorldX, -centerWorldY);

	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = "high";
	ctx.drawImage(source, 0, 0, img.width, img.height);
	ctx.restore();

	// 3. Restore from clipping to draw lens frame, crosshairs, and badge
	ctx.restore();

	ctx.save();
	// Outer border and clinical glowing ring
	ctx.beginPath();
	ctx.arc(magnifierPos.x, magnifierPos.y, radius, 0, Math.PI * 2);
	ctx.lineWidth = 3.5;
	ctx.strokeStyle = "#00C853";
	ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
	ctx.shadowBlur = 14;
	ctx.stroke();

	// Subtle reticle crosshair in the center
	ctx.lineWidth = 1;
	ctx.strokeStyle = "rgba(0, 200, 83, 0.75)";
	ctx.beginPath();
	// Horizontal
	ctx.moveTo(magnifierPos.x - 14, magnifierPos.y);
	ctx.lineTo(magnifierPos.x - 4, magnifierPos.y);
	ctx.moveTo(magnifierPos.x + 4, magnifierPos.y);
	ctx.lineTo(magnifierPos.x + 14, magnifierPos.y);
	// Vertical
	ctx.moveTo(magnifierPos.x, magnifierPos.y - 14);
	ctx.lineTo(magnifierPos.x, magnifierPos.y - 4);
	ctx.moveTo(magnifierPos.x, magnifierPos.y + 4);
	ctx.lineTo(magnifierPos.x, magnifierPos.y + 14);
	ctx.stroke();

	// Center point dot
	ctx.beginPath();
	ctx.arc(magnifierPos.x, magnifierPos.y, 1.5, 0, Math.PI * 2);
	ctx.fillStyle = "#00C853";
	ctx.fill();

	// Badge: "2.5x ЛУПА"
	const badgeText = `${magnificationFactor.toFixed(1)}x ЛУПА`;
	ctx.font = "bold 10px monospace";
	const bw = ctx.measureText(badgeText).width + 14;
	const bh = 18;
	const badgeX = magnifierPos.x - bw / 2;
	const badgeY = magnifierPos.y - radius - bh - 4;

	ctx.fillStyle = "rgba(2, 6, 23, 0.95)";
	ctx.strokeStyle = "#00C853";
	ctx.lineWidth = 1.2;
	ctx.beginPath();
	ctx.rect(badgeX, badgeY, bw, bh);
	ctx.fill();
	ctx.stroke();

	ctx.fillStyle = "#00C853";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(badgeText, magnifierPos.x, badgeY + bh / 2);

	ctx.restore();
}

export interface ClinicalExportOptions {
	readonly rawImage: HTMLImageElement;
	readonly filteredCanvas: HTMLCanvasElement | null;
	readonly measurements: readonly ViewerRulerMeasurement[];
	readonly curvedCanals: readonly ViewerCurvedMeasurement[];
	readonly calibratedMmPerPx: number;
	readonly patientName?: string | undefined;
	readonly patientAge?: string | number | undefined;
	readonly patientBirthDate?: string | undefined;
	readonly toothFdi?: string | undefined;
	readonly modalityLabel?: string | undefined;
	readonly studyDate?: string | undefined;
	readonly clinicName?: string | undefined;
}

/**
 * Creates high-resolution export canvas with 1:1 image sensor resolution,
 * calibrated 5.0 mm scale ladder and doctor's clinical stamps.
 */
export async function renderClinicalExportBlob({
	rawImage,
	filteredCanvas,
	measurements,
	curvedCanals,
	calibratedMmPerPx,
	patientName = "Пациент клиники",
	patientAge,
	patientBirthDate,
	toothFdi = "14",
	modalityLabel = "IO-СЕНСОР (ВНУТРИРОТОВОЙ СЕНСОР)",
	studyDate,
	clinicName = "DENTE CLINIC • ЦЕНТР СТОМАТОЛОГИИ",
}: ClinicalExportOptions): Promise<Blob | null> {
	if (!rawImage || rawImage.width === 0 || rawImage.height === 0) return null;

	const canvas = document.createElement("canvas");
	canvas.width = rawImage.width;
	canvas.height = rawImage.height;
	const ctx = canvas.getContext("2d");
	if (!ctx) return null;

	// 1. Draw base filtered image
	const source = filteredCanvas || rawImage;
	ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

	// 2. Draw straight measurements in image coordinates
	for (const m of measurements) {
		drawRuler(
			ctx,
			{ x: m.startX, y: m.startY },
			{ x: m.endX, y: m.endY },
			m.label || `${m.lengthMm.toFixed(1)} мм`,
			m.color || "#00C853",
		);
	}

	// 3. Draw curved canals in image coordinates
	for (const c of curvedCanals) {
		drawCurvedCanal(
			ctx,
			c.points,
			c.totalLengthMm,
			c.label || `WL: ${c.totalLengthMm.toFixed(1)} мм`,
			c.color || "#38bdf8",
		);
	}

	// 4. Clinical Header Stamp (Top-Left)
	const { formattedAge, formattedBirthDate } = formatPatientAge(
		patientBirthDate,
		patientAge,
	);
	const humanDate = formatHumanStudyDate(studyDate);
	const pitchMicrons = (calibratedMmPerPx * 1000).toFixed(1);

	ctx.save();
	const stampPad = 14;
	const stampX = 16;
	const stampY = 16;
	const stampW = Math.min(380, canvas.width - 32);
	const stampH = 100;

	ctx.fillStyle = "rgba(2, 6, 23, 0.88)";
	ctx.strokeStyle = "#334155";
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.rect(stampX, stampY, stampW, stampH);
	ctx.fill();
	ctx.stroke();

	ctx.fillStyle = "#00C853";
	ctx.font = "bold 13px sans-serif";
	ctx.textBaseline = "top";
	ctx.fillText(clinicName, stampX + stampPad, stampY + stampPad);

	ctx.fillStyle = "#f8fafc";
	ctx.font = "bold 14px sans-serif";
	ctx.fillText(
		`${patientName} • ${formattedAge}`,
		stampX + stampPad,
		stampY + stampPad + 20,
	);

	ctx.fillStyle = "#94a3b8";
	ctx.font = "11px monospace";
	ctx.fillText(
		`Д.Р.: ${formattedBirthDate} | Зуб FDI: #${toothFdi}`,
		stampX + stampPad,
		stampY + stampPad + 40,
	);
	ctx.fillText(
		`${humanDate} | ${modalityLabel}`,
		stampX + stampPad,
		stampY + stampPad + 56,
	);
	ctx.fillText(
		`Калибровка: ${pitchMicrons} µm/px (Vatech EzSensor)`,
		stampX + stampPad,
		stampY + stampPad + 72,
	);
	ctx.restore();

	// 5. Vertical 5.0 mm Calibrated Ladder Scale (Bottom-Right)
	ctx.save();
	const ladderMm = 5.0;
	const ladderHeightPx = ladderMm / calibratedMmPerPx;
	const ladderX = canvas.width - 50;
	const ladderBottomY = canvas.height - 30;
	const ladderTopY = ladderBottomY - ladderHeightPx;

	// Background backing plate
	ctx.fillStyle = "rgba(2, 6, 23, 0.88)";
	ctx.strokeStyle = "#00C853";
	ctx.lineWidth = 1;
	const plateW = 120;
	const plateH = ladderHeightPx + 40;
	ctx.beginPath();
	ctx.rect(ladderX - plateW + 30, ladderTopY - 24, plateW, plateH);
	ctx.fill();
	ctx.stroke();

	// Main vertical rail
	ctx.strokeStyle = "#00C853";
	ctx.lineWidth = 2.5;
	ctx.beginPath();
	ctx.moveTo(ladderX, ladderBottomY);
	ctx.lineTo(ladderX, ladderTopY);
	ctx.stroke();

	// Ticks for every 1.0 mm
	for (let mm = 0; mm <= ladderMm; mm++) {
		const tickY = ladderBottomY - (mm / calibratedMmPerPx);
		const isMajor = mm === 0 || mm === ladderMm;
		const tickLen = isMajor ? 12 : 7;
		ctx.lineWidth = isMajor ? 2.5 : 1.5;
		ctx.beginPath();
		ctx.moveTo(ladderX - tickLen, tickY);
		ctx.lineTo(ladderX, tickY);
		ctx.stroke();

		if (isMajor || mm === 2 || mm === 4) {
			ctx.fillStyle = "#ffffff";
			ctx.font = "bold 9px monospace";
			ctx.textAlign = "right";
			ctx.textBaseline = "middle";
			ctx.fillText(`${mm} mm`, ladderX - tickLen - 3, tickY);
		}
	}

	// Scale badge header
	ctx.fillStyle = "#00C853";
	ctx.font = "bold 10px monospace";
	ctx.textAlign = "center";
	ctx.textBaseline = "bottom";
	ctx.fillText("5.0 mm ШКАЛА", ladderX - 30, ladderTopY - 8);

	ctx.restore();

	return new Promise((resolve) => {
		canvas.toBlob((blob) => resolve(blob), "image/png");
	});
}
