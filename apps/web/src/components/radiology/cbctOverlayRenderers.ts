/**
 * DENTE CRM — CBCT 2D/3D OVERLAY RENDERERS (MANDIBULAR NERVE & VIRTUAL IMPLANT)
 *
 * Implements high-contrast, clinical-grade 2D Canvas overlay renderers for:
 * 1. Mandibular Nerve Canal (N. alveolaris inferior / IAN) spline & 2.0 mm safety corridor.
 * 2. Real-time dynamic color gating (Red < 1.5 mm, Yellow 1.5..2.0 mm, Green >= 2.0 mm).
 * 3. Virtual implant projection (platform, axis, apex, 2.0 mm halo, dimensions & angulation).
 * 4. Misch Bone Quality HUD badge (D1..D4 torque protocols & drilling warnings).
 * 5. Top Viewport Nerve Safety Alert Banner (Zero falsification of unmeasured states).
 *
 * Clinical Standards:
 * - Misch CE (2008): 2.0 mm coronal/anterior safety buffer to prevent IAN paresthesia.
 * - Mandate 8b / Mandate 8e: Modular architecture, strict < 500 lines limit.
 */

import {
	MANDIBULAR_NERVE_SAFETY_MARGIN_MM,
	MANDIBULAR_NERVE_DANGER_THRESHOLD_MM,
	getMischClinicalGuidance,
	type MischClinicalGuidance,
} from "./implantSafetyEngine";

export const OVERLAY_COLORS = {
	dangerRed: "#ef4444",
	dangerRedFill: "rgba(239, 68, 68, 0.22)",
	dangerGlow: "rgba(239, 68, 68, 0.85)",

	warningAmber: "#f59e0b",
	warningAmberFill: "rgba(245, 158, 11, 0.20)",
	warningGlow: "rgba(245, 158, 11, 0.85)",

	safeGreen: "#10b981",
	safeGreenFill: "rgba(16, 185, 129, 0.15)",
	safeGlow: "rgba(16, 185, 129, 0.80)",

	defaultCyan: "#06b6d4",
	defaultCyanFill: "rgba(6, 182, 212, 0.12)",
	defaultGlow: "rgba(6, 182, 212, 0.75)",

	hudBg: "rgba(15, 23, 42, 0.94)",
	hudBorder: "rgba(51, 65, 85, 0.85)",
	textWhite: "#f8fafc",
	textMuted: "#94a3b8",
} as const;

export interface Point2D {
	readonly x: number;
	readonly y: number;
}

export interface MandibularNerveRenderOptions {
	readonly curvePoints: readonly Point2D[];
	readonly controlPoints?: readonly Point2D[];
	readonly canalRadiusPx?: number; // Physical radius in pixels (default ~1.4 mm * scale)
	readonly safetyMarginPx?: number; // Buffer in pixels (default 2.0 mm * scale)
	readonly clearanceMm?: number | null; // Physical clearance from implant to canal wall (mm)
	readonly implantApexPx?: Point2D | null; // Coordinates of virtual implant apex in pixels
	readonly isActive?: boolean;
	readonly isDashed?: boolean;
	readonly opacity?: number;
	readonly showSafetyCorridor?: boolean;
	readonly showDistanceLine?: boolean;
}

export interface VirtualImplantRenderOptions {
	readonly entryPx: Point2D;
	readonly apexPx: Point2D;
	readonly diameterPx: number;
	readonly apexDiameterPx?: number;
	readonly safetyMarginPx?: number; // 2.0 mm safety halo in pixels
	readonly angulationDeg?: number;
	readonly label?: string;
	readonly targetToothFdi?: number | string;
	readonly clearanceMm?: number | null;
	readonly isSelected?: boolean;
	readonly showSafetyHalo?: boolean;
	readonly showCentralAxis?: boolean;
}

export interface MischBoneQualityHUDOptions {
	readonly posPx: Point2D;
	readonly boneClass: string | null | undefined;
	readonly meanHU?: number | null;
	readonly compact?: boolean;
}

export interface NerveSafetyAlertBannerOptions {
	readonly posPx: Point2D;
	readonly clearanceMm: number | null | undefined;
	readonly targetToothFdi?: number | string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER CANVAS UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function drawRoundedRectPolyfill(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	radius: number,
): void {
	if (typeof ctx.roundRect === "function") {
		ctx.roundRect(x, y, w, h, radius);
	} else {
		ctx.rect(x, y, w, h);
	}
}

/**
 * Calculates shortest distance from point P to polyline vertices and returns the closest point.
 */
function findClosestPointOnPolyline(p: Point2D, polyline: readonly Point2D[]): Point2D | null {
	if (polyline.length === 0) return null;
	const first = polyline[0];
	if (!first) return null;
	let minDistSq = Number.POSITIVE_INFINITY;
	let closest: Point2D = first;

	for (let i = 0; i < polyline.length - 1; i++) {
		const a = polyline[i];
		const b = polyline[i + 1];
		if (!a || !b) continue;
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const lenSq = dx * dx + dy * dy;

		let t = 0;
		if (lenSq > 0.0001) {
			t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
		}
		const projX = a.x + t * dx;
		const projY = a.y + t * dy;
		const distSq = (p.x - projX) ** 2 + (p.y - projY) ** 2;

		if (distSq < minDistSq) {
			minDistSq = distSq;
			closest = { x: projX, y: projY };
		}
	}

	return closest;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. MANDIBULAR NERVE CANAL & SAFETY CORRIDOR RENDERER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Draws 2D projection of Mandibular Nerve Spline, 2.0 mm corridor, control handles,
 * and distance caliper line with color-gated safety feedback.
 */
export function drawMandibularNerveCanal2D(
	ctx: CanvasRenderingContext2D,
	opts: MandibularNerveRenderOptions,
): void {
	const {
		curvePoints,
		controlPoints = [],
		canalRadiusPx = 7,
		safetyMarginPx = 10,
		clearanceMm = null,
		implantApexPx = null,
		isActive = false,
		isDashed = false,
		opacity = 1.0,
		showSafetyCorridor = true,
		showDistanceLine = true,
	} = opts;

	if (curvePoints.length < 2) return;
	const firstPt = curvePoints[0];
	if (!firstPt) return;

	ctx.save();
	ctx.globalAlpha = Math.max(0.1, Math.min(1.0, opacity));

	// Color gating based on net clearance (Misch CE 2008 / Mandate 8e)
	let primaryColor: string = OVERLAY_COLORS.defaultCyan;
	let corridorFill: string = OVERLAY_COLORS.defaultCyanFill;
	let corridorBorder: string = OVERLAY_COLORS.defaultGlow;

	if (clearanceMm !== null && clearanceMm !== undefined) {
		if (clearanceMm < MANDIBULAR_NERVE_DANGER_THRESHOLD_MM) {
			primaryColor = OVERLAY_COLORS.dangerRed;
			corridorFill = OVERLAY_COLORS.dangerRedFill;
			corridorBorder = OVERLAY_COLORS.dangerGlow;
		} else if (clearanceMm < MANDIBULAR_NERVE_SAFETY_MARGIN_MM) {
			primaryColor = OVERLAY_COLORS.warningAmber;
			corridorFill = OVERLAY_COLORS.warningAmberFill;
			corridorBorder = OVERLAY_COLORS.warningGlow;
		} else {
			primaryColor = OVERLAY_COLORS.safeGreen;
			corridorFill = OVERLAY_COLORS.safeGreenFill;
			corridorBorder = OVERLAY_COLORS.safeGlow;
		}
	}

	// 1. Draw 2.0 mm Safety Corridor Envelope (Coronal & Apical Buffer)
	if (showSafetyCorridor) {
		const totalCorridorRadiusPx = canalRadiusPx + safetyMarginPx;
		ctx.save();
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.strokeStyle = corridorBorder;
		ctx.fillStyle = corridorFill;
		ctx.lineWidth = totalCorridorRadiusPx * 2;
		ctx.beginPath();
		ctx.moveTo(firstPt.x, firstPt.y);
		for (let i = 1; i < curvePoints.length; i++) {
			const pt = curvePoints[i];
			if (pt) ctx.lineTo(pt.x, pt.y);
		}
		ctx.stroke();
		ctx.restore();
	}

	// 2. Draw Anatomical Canal Body Stroke
	ctx.save();
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	ctx.strokeStyle = primaryColor;
	ctx.lineWidth = Math.max(2, canalRadiusPx * 1.5);
	if (isDashed) {
		ctx.setLineDash([6, 4]);
	}
	ctx.beginPath();
	ctx.moveTo(firstPt.x, firstPt.y);
	for (let i = 1; i < curvePoints.length; i++) {
		const pt = curvePoints[i];
		if (pt) ctx.lineTo(pt.x, pt.y);
	}
	ctx.stroke();
	ctx.restore();

	// 3. Draw High-Contrast Central Nerve Axis
	ctx.save();
	ctx.strokeStyle = "#ffffff";
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.moveTo(firstPt.x, firstPt.y);
	for (let i = 1; i < curvePoints.length; i++) {
		const pt = curvePoints[i];
		if (pt) ctx.lineTo(pt.x, pt.y);
	}
	ctx.stroke();
	ctx.restore();

	// 4. Draw Doctor's Control Node Handles
	for (const pt of controlPoints) {
		ctx.save();
		ctx.beginPath();
		ctx.arc(pt.x, pt.y, isActive ? 5.5 : 4.0, 0, Math.PI * 2);
		ctx.fillStyle = primaryColor;
		ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
		ctx.shadowBlur = 4;
		ctx.fill();
		ctx.strokeStyle = "#ffffff";
		ctx.lineWidth = 1.5;
		ctx.stroke();
		ctx.restore();
	}

	// 5. Draw Apex-to-Canal Proximity Line & Distance Badge
	if (showDistanceLine && implantApexPx) {
		const closestCanalPt = findClosestPointOnPolyline(implantApexPx, curvePoints);
		if (closestCanalPt) {
			ctx.save();
			ctx.strokeStyle = primaryColor;
			ctx.lineWidth = 1.5;
			ctx.setLineDash([3, 3]);
			ctx.beginPath();
			ctx.moveTo(implantApexPx.x, implantApexPx.y);
			ctx.lineTo(closestCanalPt.x, closestCanalPt.y);
			ctx.stroke();
			ctx.restore();

			// Distance badge pill at midpoint
			const midX = (implantApexPx.x + closestCanalPt.x) / 2;
			const midY = (implantApexPx.y + closestCanalPt.y) / 2;

			let badgeText = "IAN: не измерялся";
			if (clearanceMm !== null && clearanceMm !== undefined) {
				if (clearanceMm < MANDIBULAR_NERVE_DANGER_THRESHOLD_MM) {
					badgeText = `⚠ IAN ${clearanceMm.toFixed(1)} мм`;
				} else if (clearanceMm < MANDIBULAR_NERVE_SAFETY_MARGIN_MM) {
					badgeText = `⚠ IAN ${clearanceMm.toFixed(1)} мм`;
				} else {
					badgeText = `IAN ${clearanceMm.toFixed(1)} мм`;
				}
			}

			ctx.save();
			ctx.font = "bold 11px monospace";
			const textWidth = ctx.measureText(badgeText).width;
			const padH = 6;
			const padV = 3;
			const badgeW = textWidth + padH * 2;
			const badgeH = 18;

			ctx.fillStyle = OVERLAY_COLORS.hudBg;
			ctx.strokeStyle = primaryColor;
			ctx.lineWidth = 1.0;
			ctx.beginPath();
			drawRoundedRectPolyfill(ctx, midX - badgeW / 2, midY - badgeH / 2, badgeW, badgeH, 4);
			ctx.fill();
			ctx.stroke();

			ctx.fillStyle = primaryColor;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(badgeText, midX, midY);
			ctx.restore();
		}
	}

	ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. VIRTUAL IMPLANT 2D PROJECTION RENDERER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Draws 2D virtual implant body, central axis, apex, 2.0 mm safety halo, and telemetry tags.
 */
export function drawVirtualImplantOverlay2D(
	ctx: CanvasRenderingContext2D,
	opts: VirtualImplantRenderOptions,
): void {
	const {
		entryPx,
		apexPx,
		diameterPx,
		apexDiameterPx = diameterPx * 0.72,
		safetyMarginPx = 10,
		angulationDeg = 0,
		label,
		targetToothFdi,
		clearanceMm = null,
		isSelected = false,
		showSafetyHalo = true,
		showCentralAxis = true,
	} = opts;

	const dx = apexPx.x - entryPx.x;
	const dy = apexPx.y - entryPx.y;
	const lengthPx = Math.hypot(dx, dy);
	if (lengthPx < 2) return;

	const ux = dx / lengthPx;
	const uy = dy / lengthPx;
	const nx = -uy;
	const ny = ux;

	const rPlatform = diameterPx / 2;
	const rApex = apexDiameterPx / 2;

	// Determine status color
	let statusColor: string = OVERLAY_COLORS.defaultCyan;
	let haloFill = "rgba(6, 182, 212, 0.12)";
	let haloBorder = "rgba(6, 182, 212, 0.6)";

	if (clearanceMm !== null && clearanceMm !== undefined) {
		if (clearanceMm < MANDIBULAR_NERVE_DANGER_THRESHOLD_MM) {
			statusColor = OVERLAY_COLORS.dangerRed;
			haloFill = OVERLAY_COLORS.dangerRedFill;
			haloBorder = OVERLAY_COLORS.dangerGlow;
		} else if (clearanceMm < MANDIBULAR_NERVE_SAFETY_MARGIN_MM) {
			statusColor = OVERLAY_COLORS.warningAmber;
			haloFill = OVERLAY_COLORS.warningAmberFill;
			haloBorder = OVERLAY_COLORS.warningGlow;
		} else {
			statusColor = OVERLAY_COLORS.safeGreen;
			haloFill = OVERLAY_COLORS.safeGreenFill;
			haloBorder = OVERLAY_COLORS.safeGlow;
		}
	}

	ctx.save();

	// 1. Draw 2.0 mm Safety Corridor Halo (Capsule envelope)
	if (showSafetyHalo) {
		const haloRPlat = rPlatform + safetyMarginPx;
		const haloRApex = rApex + safetyMarginPx;
		const haloApexCenter = { x: apexPx.x + ux * safetyMarginPx, y: apexPx.y + uy * safetyMarginPx };

		ctx.save();
		ctx.beginPath();
		ctx.moveTo(entryPx.x + nx * haloRPlat, entryPx.y + ny * haloRPlat);
		ctx.lineTo(haloApexCenter.x + nx * haloRApex, haloApexCenter.y + ny * haloRApex);
		ctx.arc(haloApexCenter.x, haloApexCenter.y, haloRApex, Math.atan2(ny, nx), Math.atan2(-ny, -nx));
		ctx.lineTo(entryPx.x - nx * haloRPlat, entryPx.y - ny * haloRPlat);
		ctx.closePath();
		ctx.fillStyle = haloFill;
		ctx.fill();
		ctx.strokeStyle = haloBorder;
		ctx.lineWidth = 1.0;
		ctx.setLineDash([4, 4]);
		ctx.stroke();
		ctx.restore();
	}

	// 2. Draw Implant Body (Tapered Root-Form Silhouette)
	ctx.save();
	ctx.beginPath();
	ctx.moveTo(entryPx.x + nx * rPlatform, entryPx.y + ny * rPlatform);
	ctx.lineTo(apexPx.x + nx * rApex, apexPx.y + ny * rApex);
	ctx.arc(apexPx.x, apexPx.y, rApex, Math.atan2(ny, nx), Math.atan2(-ny, -nx));
	ctx.lineTo(entryPx.x - nx * rPlatform, entryPx.y - ny * rPlatform);
	ctx.closePath();

	ctx.fillStyle = isSelected ? "rgba(245, 158, 11, 0.45)" : "rgba(2, 132, 199, 0.35)";
	ctx.fill();
	ctx.strokeStyle = isSelected ? "#fbbf24" : statusColor;
	ctx.lineWidth = isSelected ? 2.2 : 1.6;
	ctx.stroke();
	ctx.restore();

	// 3. Platform Flat Cap
	ctx.save();
	ctx.strokeStyle = isSelected ? "#ffffff" : statusColor;
	ctx.lineWidth = 2.0;
	ctx.beginPath();
	ctx.moveTo(entryPx.x + nx * rPlatform, entryPx.y + ny * rPlatform);
	ctx.lineTo(entryPx.x - nx * rPlatform, entryPx.y - ny * rPlatform);
	ctx.stroke();
	ctx.restore();

	// 4. Central Implant Longitudinal Axis
	if (showCentralAxis) {
		ctx.save();
		ctx.strokeStyle = "#ffffff";
		ctx.lineWidth = 1.0;
		ctx.setLineDash([3, 3]);
		ctx.beginPath();
		ctx.moveTo(entryPx.x, entryPx.y);
		ctx.lineTo(apexPx.x + ux * 3, apexPx.y + uy * 3);
		ctx.stroke();
		ctx.restore();
	}

	// 5. Coronal Telemetry Badge (#FDI · Spec · Angulation)
	const tagParts: string[] = [];
	if (targetToothFdi) tagParts.push(`#${targetToothFdi}`);
	if (label) tagParts.push(label);
	tagParts.push(`${angulationDeg.toFixed(1)}°`);
	const badgeText = tagParts.join(" · ");

	ctx.save();
	ctx.font = "bold 11px monospace";
	const tw = ctx.measureText(badgeText).width;
	const padH = 6;
	const padV = 3;
	const bW = tw + padH * 2;
	const bH = 18;
	const bX = entryPx.x - bW / 2;
	const bY = entryPx.y - bH - 6;

	ctx.fillStyle = OVERLAY_COLORS.hudBg;
	ctx.strokeStyle = isSelected ? "#fbbf24" : statusColor;
	ctx.lineWidth = 1.0;
	ctx.beginPath();
	drawRoundedRectPolyfill(ctx, bX, bY, bW, bH, 4);
	ctx.fill();
	ctx.stroke();

	ctx.fillStyle = isSelected ? "#fbbf24" : OVERLAY_COLORS.textWhite;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(badgeText, entryPx.x, bY + bH / 2);
	ctx.restore();

	ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MISCH BONE QUALITY HUD BADGE RENDERER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renders Misch Bone Quality HUD badge with torque guidelines and surgical warnings.
 * Standard protocols:
 * - D1/D2: 35-45 N*cm (risk of bone overheating, copious irrigation 4°C, no under-drilling)
 * - D4: 25-35 N*cm (bone condensation protocol with osteotomes, under-drilling)
 */
export function drawMischBoneQualityHUD(
	ctx: CanvasRenderingContext2D,
	opts: MischBoneQualityHUDOptions,
): void {
	const { posPx, boneClass, meanHU = null, compact = false } = opts;
	const guidance: MischClinicalGuidance = getMischClinicalGuidance(boneClass ?? (meanHU ?? "unmeasured"));

	ctx.save();

	let badgeBorder: string = OVERLAY_COLORS.hudBorder;
	let badgeTagColor: string = OVERLAY_COLORS.textMuted;

	if (guidance.boneClass === "D1" || guidance.boneClass === "D2") {
		badgeBorder = "#0284c7";
		badgeTagColor = "#38bdf8";
	} else if (guidance.boneClass === "D3") {
		badgeBorder = OVERLAY_COLORS.safeGreen;
		badgeTagColor = "#34d399";
	} else if (guidance.boneClass === "D4") {
		badgeBorder = OVERLAY_COLORS.warningAmber;
		badgeTagColor = "#fbbf24";
	} else if (guidance.boneClass === "D5") {
		badgeBorder = OVERLAY_COLORS.dangerRed;
		badgeTagColor = "#f87171";
	}

	const huText = meanHU !== null && meanHU !== undefined ? `${Math.round(meanHU)} HU` : guidance.huRange;
	const titleLine = `Кость Misch: ${guidance.boneClass} (${huText})`;
	const torqueLine = `Торк: ${guidance.recommendedTorqueNcm}`;
	const warningLine = guidance.riskWarningRu;

	ctx.font = "bold 11px monospace";
	const titleWidth = ctx.measureText(titleLine).width;
	const torqueWidth = ctx.measureText(torqueLine).width;
	const warningWidth = compact ? 0 : ctx.measureText(warningLine).width;

	const contentWidth = Math.max(titleWidth, torqueWidth, warningWidth);
	const boxW = contentWidth + 16;
	const boxH = compact ? 38 : 56;

	ctx.fillStyle = OVERLAY_COLORS.hudBg;
	ctx.strokeStyle = badgeBorder;
	ctx.lineWidth = 1.2;
	ctx.beginPath();
	drawRoundedRectPolyfill(ctx, posPx.x, posPx.y, boxW, boxH, 6);
	ctx.fill();
	ctx.stroke();

	// Line 1: Class + HU
	ctx.fillStyle = badgeTagColor;
	ctx.textAlign = "left";
	ctx.textBaseline = "top";
	ctx.fillText(titleLine, posPx.x + 8, posPx.y + 6);

	// Line 2: Torque
	ctx.fillStyle = OVERLAY_COLORS.textWhite;
	ctx.fillText(torqueLine, posPx.x + 8, posPx.y + 20);

	// Line 3: Clinical warning
	if (!compact) {
		ctx.font = "10px sans-serif";
		ctx.fillStyle = OVERLAY_COLORS.textMuted;
		ctx.fillText(warningLine, posPx.x + 8, posPx.y + 36);
	}

	ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. TOP HUD NERVE SAFETY ALERT BANNER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renders viewport top HUD banner for Mandibular Nerve corridor status.
 * Guarantees zero-falsification: explicitly states unmeasured when clearance is null.
 */
export function drawNerveSafetyAlertBanner(
	ctx: CanvasRenderingContext2D,
	opts: NerveSafetyAlertBannerOptions,
): void {
	const { posPx, clearanceMm, targetToothFdi } = opts;

	let bannerText: string;
	let borderColor: string;
	let textColor: string;

	if (clearanceMm === null || clearanceMm === undefined) {
		bannerText = "Канал IAN: не измерялся (—) · требуется разметка";
		borderColor = "rgba(100, 116, 139, 0.75)";
		textColor = OVERLAY_COLORS.textMuted;
	} else if (clearanceMm < MANDIBULAR_NERVE_DANGER_THRESHOLD_MM) {
		const fdiPrefix = targetToothFdi ? `#${targetToothFdi}: ` : "";
		bannerText = `⚠ КРАСНАЯ ТРЕВОГА: ${fdiPrefix}Канал IAN ${clearanceMm.toFixed(1)} мм (< 1.5 мм)`;
		borderColor = OVERLAY_COLORS.dangerRed;
		textColor = OVERLAY_COLORS.dangerRed;
	} else if (clearanceMm < MANDIBULAR_NERVE_SAFETY_MARGIN_MM) {
		const fdiPrefix = targetToothFdi ? `#${targetToothFdi}: ` : "";
		bannerText = `⚠ БУФЕРНАЯ ЗОНА: ${fdiPrefix}Канал IAN ${clearanceMm.toFixed(1)} мм (< 2.0 мм)`;
		borderColor = OVERLAY_COLORS.warningAmber;
		textColor = OVERLAY_COLORS.warningAmber;
	} else {
		const fdiPrefix = targetToothFdi ? `#${targetToothFdi}: ` : "";
		bannerText = `✓ БЕЗОПАСНАЯ ЗОНА: ${fdiPrefix}Канал IAN ${clearanceMm.toFixed(1)} мм (норма >= 2.0 мм)`;
		borderColor = OVERLAY_COLORS.safeGreen;
		textColor = OVERLAY_COLORS.safeGreen;
	}

	ctx.save();
	ctx.font = "bold 12px monospace";
	const textWidth = ctx.measureText(bannerText).width;
	const padH = 12;
	const padV = 5;
	const boxW = textWidth + padH * 2;
	const boxH = 24;
	const boxX = posPx.x - boxW / 2;
	const boxY = posPx.y;

	ctx.fillStyle = OVERLAY_COLORS.hudBg;
	ctx.strokeStyle = borderColor;
	ctx.lineWidth = 1.2;
	ctx.beginPath();
	drawRoundedRectPolyfill(ctx, boxX, boxY, boxW, boxH, 5);
	ctx.fill();
	ctx.stroke();

	ctx.fillStyle = textColor;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(bannerText, posPx.x, boxY + boxH / 2);
	ctx.restore();
}
