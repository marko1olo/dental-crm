/**
 * DENTE CRM — CBCT Overlay Measurement Renderers (Rulers, Angles, Probes)
 * Extracted from cbctMprMath.ts according to Mandate 8b.
 */

import type {
	MprPlane,
	Point2D,
	Point3D,
	CbctMeasurementRuler,
	CbctAngleMeasurement,
	CbctProbeMarker,
} from "./cbctMprMath";
import {
	ROMEXIS_COLORS,
	CRISP_OVERLAY_PAD_BG,
	drawMeasurementDeleteButton,
	formatHuProbe,
	getTissueNameFromHU,
} from "./cbctOverlayDecorationMath";
import {
	CRISP_OVERLAY_BORDER_GOLD,
	CRISP_OVERLAY_BORDER_CYAN,
} from "./cbctCaliperNerveMath";

export function drawCbctMeasurementRuler(
	ctx: CanvasRenderingContext2D,
	startPx: { readonly x: number; readonly y: number },
	endPx: { readonly x: number; readonly y: number },
	distanceMm: number,
	isActive = false,
	selectedHandleIndex: number | null = null,
	invertColors = false,
): void {
	const dx = endPx.x - startPx.x;
	const dy = endPx.y - startPx.y;
	const len = Math.hypot(dx, dy);
	if (len < 1) return;

	const nx = -dy / len;
	const ny = dx / len;
	const tickHalfLen = 5;

	ctx.save();
	const primaryColor = isActive
		? (invertColors ? "#c2410c" : "#f59e0b")
		: (invertColors ? "#0284c7" : "#22d3ee");

	// 1. Active Amber Halo / Selection Glow when active
	if (isActive) {
		ctx.save();
		ctx.strokeStyle = invertColors ? "rgba(194, 65, 12, 0.4)" : "rgba(245, 158, 11, 0.35)";
		ctx.lineWidth = 4.5;
		ctx.shadowColor = invertColors ? "#c2410c" : "#f59e0b";
		ctx.shadowBlur = 8;
		ctx.beginPath();
		ctx.moveTo(startPx.x, startPx.y);
		ctx.lineTo(endPx.x, endPx.y);
		ctx.stroke();
		ctx.restore();
	}

	// 2. Main connecting line with dark halo underlay for WCAG AAA contrast
	ctx.save();
	ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
	ctx.shadowBlur = 4;
	ctx.strokeStyle = primaryColor;
	ctx.lineWidth = isActive ? 2.0 : 1.5;
	ctx.beginPath();
	ctx.moveTo(startPx.x, startPx.y);
	ctx.lineTo(endPx.x, endPx.y);
	ctx.stroke();

	// 3. Perpendicular tick at start point
	ctx.beginPath();
	ctx.moveTo(startPx.x + nx * tickHalfLen, startPx.y + ny * tickHalfLen);
	ctx.lineTo(startPx.x - nx * tickHalfLen, startPx.y - ny * tickHalfLen);
	ctx.stroke();

	// 4. Perpendicular tick at end point
	ctx.beginPath();
	ctx.moveTo(endPx.x + nx * tickHalfLen, endPx.y + ny * tickHalfLen);
	ctx.lineTo(endPx.x - nx * tickHalfLen, endPx.y - ny * tickHalfLen);
	ctx.stroke();
	ctx.restore();

	// 5. End anchor handles (start = 0, end = 1) — 6-8px Luminous Glowing Points
	const isStartActive = selectedHandleIndex === 0;
	ctx.save();
	ctx.shadowColor = isStartActive ? primaryColor : isActive ? primaryColor : (invertColors ? "rgba(0, 0, 0, 0.95)" : "#22d3ee");
	ctx.shadowBlur = isStartActive ? 8 : 6;
	ctx.fillStyle = isStartActive ? primaryColor : isActive ? primaryColor : (invertColors ? "#0284c7" : "#22d3ee");
	ctx.beginPath();
	ctx.arc(startPx.x, startPx.y, isStartActive ? 4.2 : 3.5, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = invertColors ? "rgba(0, 0, 0, 0.95)" : "#ffffff";
	ctx.lineWidth = 1.5;
	ctx.stroke();
	ctx.restore();

	const isEndActive = selectedHandleIndex === 1;
	ctx.save();
	ctx.shadowColor = isEndActive ? primaryColor : isActive ? primaryColor : (invertColors ? "rgba(0, 0, 0, 0.95)" : "#22d3ee");
	ctx.shadowBlur = isEndActive ? 8 : 6;
	ctx.fillStyle = isEndActive ? primaryColor : isActive ? primaryColor : (invertColors ? "#0284c7" : "#22d3ee");
	ctx.beginPath();
	ctx.arc(endPx.x, endPx.y, isEndActive ? 4.2 : 3.5, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = invertColors ? "rgba(0, 0, 0, 0.95)" : "#ffffff";
	ctx.lineWidth = 1.5;
	ctx.stroke();
	ctx.restore();

	// 6. Floating distance pill badge at midpoint with high-contrast dark pad rgba(15, 23, 42, 0.92) and 1px gold/cyan border
	const midX = (startPx.x + endPx.x) / 2;
	const midY = (startPx.y + endPx.y) / 2;
	const distText = `${distanceMm.toFixed(1)} мм`;

	ctx.font = "bold 12px monospace";
	const textWidth = ctx.measureText(distText).width;
	// 8px left pad + textWidth + 6px gap + 22px delete button + 3px right pad = textWidth + 39px
	const badgeW = isActive ? textWidth + 39 : textWidth + 16;
	const badgeH = 22;

	// Dark underlay pad rgba(15, 23, 42, 0.92) with 1px gold/cyan border
	ctx.fillStyle = CRISP_OVERLAY_PAD_BG;
	ctx.strokeStyle = isActive ? (invertColors ? "#c2410c" : CRISP_OVERLAY_BORDER_GOLD) : (invertColors ? "#0284c7" : CRISP_OVERLAY_BORDER_CYAN);
	ctx.lineWidth = 1.0;
	if (isActive) {
		ctx.shadowColor = invertColors ? "rgba(194, 65, 12, 0.5)" : "rgba(245, 158, 11, 0.5)";
		ctx.shadowBlur = 6;
	}
	ctx.beginPath();
	if (typeof ctx.roundRect === "function") {
		ctx.roundRect(midX - badgeW / 2, midY - badgeH / 2, badgeW, badgeH, 4);
	} else {
		ctx.rect(midX - badgeW / 2, midY - badgeH / 2, badgeW, badgeH);
	}
	ctx.fill();
	ctx.stroke();

	if (isActive) {
		ctx.shadowBlur = 0;
		// Distance label (8px left padding)
		ctx.fillStyle = "#ffffff";
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillText(distText, midX - badgeW / 2 + 8, midY);

		// Fast Delete [×] Button Trigger with 6px gap from distance text (DEF-03 / DEF-18.1 / DEF-R2-06)
		const delBtnX = midX + badgeW / 2 - 14;
		drawMeasurementDeleteButton(ctx, delBtnX, midY, 11);
	} else {
		ctx.fillStyle = "#ffffff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(distText, midX, midY);
	}

	ctx.restore();
}

/**
 * Draws precision protractor / angle measurement on the slice canvas.
 * Renders two arms, circular vertex arc, 6-8px luminous control handles, and high-contrast degree badge with delete trigger.
 */
export function drawCbctAngleMeasurement(
	ctx: CanvasRenderingContext2D,
	p1Px: { readonly x: number; readonly y: number },
	vertexPx: { readonly x: number; readonly y: number },
	p2Px: { readonly x: number; readonly y: number },
	angleDeg: number,
	isActive = false,
	selectedHandleIndex: number | null = null,
): void {
	const dx1 = p1Px.x - vertexPx.x;
	const dy1 = p1Px.y - vertexPx.y;
	const len1 = Math.hypot(dx1, dy1);

	const dx2 = p2Px.x - vertexPx.x;
	const dy2 = p2Px.y - vertexPx.y;
	const len2 = Math.hypot(dx2, dy2);

	if (len1 < 1 && len2 < 1) return;

	ctx.save();
	const primaryColor = isActive ? "#f59e0b" : "#22d3ee";

	// 1. Active Amber Halo when selected
	if (isActive) {
		ctx.save();
		ctx.strokeStyle = "rgba(245, 158, 11, 0.35)";
		ctx.lineWidth = 4.5;
		ctx.shadowColor = "#f59e0b";
		ctx.shadowBlur = 8;
		ctx.beginPath();
		if (len1 >= 1) {
			ctx.moveTo(vertexPx.x, vertexPx.y);
			ctx.lineTo(p1Px.x, p1Px.y);
		}
		if (len2 >= 1) {
			ctx.moveTo(vertexPx.x, vertexPx.y);
			ctx.lineTo(p2Px.x, p2Px.y);
		}
		ctx.stroke();
		ctx.restore();
	}

	// Dark halo underlay (shadowColor = rgba(0,0,0,0.85), shadowBlur = 4)
	// ensures angle measurement lines and arc manipulators are never lost against hyperdense white bone or enamel
	ctx.save();
	ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
	ctx.shadowBlur = 4;
	ctx.strokeStyle = primaryColor;
	ctx.lineWidth = isActive ? 2.0 : 1.5;

	// 1. Draw arm 1 (vertex -> p1)
	if (len1 >= 1) {
		ctx.beginPath();
		ctx.moveTo(vertexPx.x, vertexPx.y);
		ctx.lineTo(p1Px.x, p1Px.y);
		ctx.stroke();
	}

	// 2. Draw arm 2 (vertex -> p2)
	if (len2 >= 1) {
		ctx.beginPath();
		ctx.moveTo(vertexPx.x, vertexPx.y);
		ctx.lineTo(p2Px.x, p2Px.y);
		ctx.stroke();
	}

	// 3. Draw circular angle arc at vertex if both arms are present
	if (len1 >= 5 && len2 >= 5) {
		const angle1 = Math.atan2(dy1, dx1);
		const angle2 = Math.atan2(dy2, dx2);

		let diff = angle2 - angle1;
		while (diff > Math.PI) diff -= Math.PI * 2;
		while (diff < -Math.PI) diff += Math.PI * 2;

		const arcRadius = Math.min(32, Math.max(16, Math.min(len1, len2) * 0.45));
		const anticlockwise = diff < 0;

		ctx.beginPath();
		ctx.strokeStyle = isActive ? "#f59e0b" : "#22d3ee";
		ctx.lineWidth = 1.5;
		ctx.arc(vertexPx.x, vertexPx.y, arcRadius, angle1, angle1 + diff, anticlockwise);
		ctx.stroke();

		// Translucent wedge fill
		ctx.beginPath();
		ctx.moveTo(vertexPx.x, vertexPx.y);
		ctx.arc(vertexPx.x, vertexPx.y, arcRadius, angle1, angle1 + diff, anticlockwise);
		ctx.closePath();
		ctx.fillStyle = isActive ? "rgba(245, 158, 11, 0.2)" : "rgba(34, 211, 238, 0.15)";
		ctx.fill();
	}
	ctx.restore();

	// 4. Draw control handles (0 = arm 1, 1 = vertex, 2 = arm 2) — 6-8px Luminous Glowing Points
	const handles = [
		{ pt: p1Px, idx: 0 },
		{ pt: vertexPx, idx: 1 },
		{ pt: p2Px, idx: 2 },
	];

	for (const h of handles) {
		const isHandleActive = selectedHandleIndex === h.idx;
		ctx.save();
		ctx.shadowColor = isHandleActive ? "#f59e0b" : isActive ? "#f59e0b" : "#22d3ee";
		ctx.shadowBlur = isHandleActive ? 8 : 6;
		ctx.fillStyle = isHandleActive ? "#f59e0b" : (isActive ? "#f59e0b" : "#22d3ee");
		ctx.beginPath();
		ctx.arc(h.pt.x, h.pt.y, isHandleActive ? 4.2 : (h.idx === 1 ? 4.0 : 3.5), 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = "#ffffff";
		ctx.lineWidth = 1.5;
		ctx.stroke();
		ctx.restore();
	}

	// 5. Floating angle degree badge with high contrast background and delete trigger
	let badgeX = vertexPx.x;
	let badgeY = vertexPx.y;

	if (len1 >= 5 && len2 >= 5) {
		const angle1 = Math.atan2(dy1, dx1);
		const angle2 = Math.atan2(dy2, dx2);
		let diff = angle2 - angle1;
		while (diff > Math.PI) diff -= Math.PI * 2;
		while (diff < -Math.PI) diff += Math.PI * 2;
		const bisectorAngle = angle1 + diff / 2;
		const badgeDist = Math.min(48, Math.max(26, Math.min(len1, len2) * 0.4 + 14));
		badgeX = vertexPx.x + Math.cos(bisectorAngle) * badgeDist;
		badgeY = vertexPx.y + Math.sin(bisectorAngle) * badgeDist;
	} else if (len1 >= 5) {
		badgeX = (vertexPx.x + p1Px.x) / 2;
		badgeY = (vertexPx.y + p1Px.y) / 2 - 12;
	} else {
		badgeY -= 16;
	}

	const angleText = `${angleDeg.toFixed(1)}°`;
	ctx.font = "bold 12px monospace";
	const textWidth = ctx.measureText(angleText).width;
	const badgeW = isActive ? textWidth + 39 : textWidth + 16;
	const badgeH = 22;

	// Dark underlay pad rgba(15, 23, 42, 0.92) with 1px gold/cyan border
	ctx.fillStyle = CRISP_OVERLAY_PAD_BG;
	ctx.strokeStyle = isActive ? CRISP_OVERLAY_BORDER_GOLD : CRISP_OVERLAY_BORDER_CYAN;
	ctx.lineWidth = 1.0;
	if (isActive) {
		ctx.shadowColor = "rgba(245, 158, 11, 0.5)";
		ctx.shadowBlur = 6;
	}
	ctx.beginPath();
	if (typeof ctx.roundRect === "function") {
		ctx.roundRect(badgeX - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 4);
	} else {
		ctx.rect(badgeX - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH);
	}
	ctx.fill();
	ctx.stroke();

	if (isActive) {
		ctx.shadowBlur = 0;
		ctx.fillStyle = "#ffffff";
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillText(angleText, badgeX - badgeW / 2 + 8, badgeY);

		// Fast Delete [×] Button Trigger (DEF-03 / DEF-18.1 / DEF-R2-06)
		const delBtnX = badgeX + badgeW / 2 - 14;
		drawMeasurementDeleteButton(ctx, delBtnX, badgeY, 11);
	} else {
		ctx.fillStyle = "#ffffff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(angleText, badgeX, badgeY);
	}

	ctx.restore();
}

/**
 * Draws point HU densitometry probe marker with target reticle and label badge.
 * Features high-contrast dark pad rgba(15, 23, 42, 0.92) with 1px gold/cyan border.
 */
export function drawCbctProbeMarker(
	ctx: CanvasRenderingContext2D,
	posPx: { readonly x: number; readonly y: number },
	hu: number,
	tissueName?: string,
	isActive = false,
): void {
	ctx.save();

	// Target reticle
	ctx.strokeStyle = isActive ? CRISP_OVERLAY_BORDER_GOLD : "#38bdf8";
	ctx.lineWidth = isActive ? 2.0 : 1.5;
	if (isActive) {
		ctx.shadowColor = "#f59e0b";
		ctx.shadowBlur = 6;
	}
	ctx.beginPath();
	ctx.arc(posPx.x, posPx.y, 6, 0, Math.PI * 2);
	ctx.stroke();

	// Center dot — 6px Luminous dot
	ctx.fillStyle = isActive ? "#f59e0b" : "#22d3ee";
	ctx.shadowColor = isActive ? "#f59e0b" : "#22d3ee";
	ctx.shadowBlur = 6;
	ctx.beginPath();
	ctx.arc(posPx.x, posPx.y, 3, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = "#ffffff";
	ctx.lineWidth = 1.0;
	ctx.stroke();

	// Crosshair ticks
	ctx.shadowBlur = 0;
	ctx.strokeStyle = isActive ? "#f59e0b" : "rgba(56, 189, 248, 0.85)";
	ctx.lineWidth = 1.0;
	ctx.beginPath();
	ctx.moveTo(posPx.x - 10, posPx.y);
	ctx.lineTo(posPx.x - 6, posPx.y);
	ctx.moveTo(posPx.x + 6, posPx.y);
	ctx.lineTo(posPx.x + 10, posPx.y);
	ctx.moveTo(posPx.x, posPx.y - 10);
	ctx.lineTo(posPx.x, posPx.y - 6);
	ctx.moveTo(posPx.x, posPx.y + 6);
	ctx.lineTo(posPx.x, posPx.y + 10);
	ctx.stroke();

	// Info label badge (DEF-17.1: Zero string duplication via formatHuProbe)
	const label = formatHuProbe(hu, tissueName);
	ctx.font = "bold 11px monospace";
	const textWidth = ctx.measureText(label).width;
	const badgeW = isActive ? textWidth + 39 : textWidth + 12;
	const badgeH = 22;
	const badgeX = posPx.x + 10;
	const badgeY = posPx.y - 22;

	// Dark underlay pad rgba(15, 23, 42, 0.92) with 1px gold/cyan border
	ctx.fillStyle = CRISP_OVERLAY_PAD_BG;
	ctx.strokeStyle = isActive ? CRISP_OVERLAY_BORDER_GOLD : CRISP_OVERLAY_BORDER_CYAN;
	ctx.lineWidth = 1.0;
	if (isActive) {
		ctx.shadowColor = "rgba(245, 158, 11, 0.5)";
		ctx.shadowBlur = 6;
	}
	ctx.beginPath();
	if (typeof ctx.roundRect === "function") {
		ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
	} else {
		ctx.rect(badgeX, badgeY, badgeW, badgeH);
	}
	ctx.fill();
	ctx.stroke();

	ctx.shadowBlur = 0;
	if (isActive) {
		ctx.fillStyle = "#fef08a";
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillText(label, badgeX + 8, badgeY + badgeH / 2);

		const delBtnX = badgeX + badgeW - 14;
		drawMeasurementDeleteButton(ctx, delBtnX, badgeY + badgeH / 2, 11);
	} else {
		ctx.fillStyle = "#38bdf8";
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillText(label, badgeX + 6, badgeY + badgeH / 2);
	}

	ctx.restore();
}

