/**
 * DENTE CRM — CBCT 3D Volume Raymarching Overlay Renderer (Nerve & Implant Vector Layer)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 *
 * Implements:
 * 1. Synchronized 3D-to-2D orthographic screen projection matching WebGL2 raymarching shaders.
 * 2. Mandibular nerve canal (IAN) 3D anatomical tube rendering (radius 1.0..1.25 mm = diameter 2.0..2.5 mm, #FF9100).
 * 3. Seed point markers: Foramen mentale (Seed 1) and Foramen mandibulae (Seed 2) with clinical badges.
 * 4. 3D Virtual implant fixture projection (platform, tapered body, apex, safety corridor +2.0 mm).
 * 5. Dynamic 3D apical clearance distance line and Vatech safety status telemetry badge.
 *
 * Mandate 8b: Декомпозиция монолитов (строго <= 500 строк).
 */

import type { CbctVoxelVolume, Point3D } from "../cbctMprMath";
import type { Implant3DWorldProjection } from "../implantSafetyEngine";
import { computeVolume3DRotationMatrix } from "./cbctVolume3DMath";

export interface Volume3DOverlayParams {
	readonly volume: CbctVoxelVolume;
	readonly yaw: number;
	readonly pitch: number;
	readonly zoom: number;
	readonly pan: { readonly x: number; readonly y: number };
	readonly width: number;
	readonly height: number;
	readonly nervePoints?: readonly Point3D[] | undefined;
	readonly interpolatedNerve3D?: readonly Point3D[] | undefined;
	readonly implant3DWorld?: Implant3DWorldProjection | null | undefined;
	readonly implantsList?: readonly Implant3DWorldProjection[] | undefined;
	readonly nerveAuditResult?: {
		readonly isDangerous: boolean;
		readonly isWarning: boolean;
		readonly netClearanceToCanalWallMm: number;
	} | null | undefined;
	readonly selectedNerveNodeIdx?: number | null | undefined;
}

export interface ProjectedScreenPoint {
	readonly screenX: number;
	readonly screenY: number;
	readonly depth: number;
	readonly isVisible: boolean;
}

/**
 * Projects a physical millimeter coordinate (in CBCT volume space) onto the 3D volume canvas.
 * Exactly matches the coordinate space of cbctVolume3DShaders.ts.
 */
export function project3DWorldToVolumeScreen(
	worldMm: Point3D,
	volume: CbctVoxelVolume,
	rotMat: [number, number, number][],
	scale: number,
	center: { readonly x: number; readonly y: number },
): ProjectedScreenPoint {
	const dim = volume.dimensions;
	const sp = volume.spacingMm;
	const origin = volume.originMm ?? { x: 0, y: 0, z: 0 };

	const spX = sp?.x && sp.x > 0 ? sp.x : 0.4;
	const spY = sp?.y && sp.y > 0 ? sp.y : 0.4;
	const spZ = sp?.z && sp.z > 0 ? sp.z : 0.4;

	// Continuous voxel coordinates
	const vx = (worldMm.x - origin.x) / spX;
	const vy = (worldMm.y - origin.y) / spY;
	const vz = (worldMm.z - origin.z) / spZ;

	// Centered voxel coordinates relative to volume midpoint
	const cx = vx - dim.width * 0.5;
	const cy = vy - dim.height * 0.5;
	const cz = vz - dim.depth * 0.5;

	// Camera coordinate space:
	// rotMat[0] = Camera Right (Screen X)
	// rotMat[1] = Camera Up (Screen Y, inverted)
	// rotMat[2] = Camera Ray Direction (Depth)
	const viewX = cx * rotMat[0]![0]! + cy * rotMat[0]![1]! + cz * rotMat[0]![2]!;
	const viewY = cx * rotMat[1]![0]! + cy * rotMat[1]![1]! + cz * rotMat[1]![2]!;
	const depth = cx * rotMat[2]![0]! + cy * rotMat[2]![1]! + cz * rotMat[2]![2]!;

	const screenX = center.x + viewX * scale;
	const screenY = center.y - viewY * scale;

	return {
		screenX,
		screenY,
		depth,
		isVisible: Number.isFinite(screenX) && Number.isFinite(screenY),
	};
}

/**
 * Draws the complete vector overlay layer (nerve canal, implant fixture, safety telemetry)
 * directly over the 3D skull raymarching viewport.
 */
export function drawVolume3DOverlay(
	ctx: CanvasRenderingContext2D,
	params: Volume3DOverlayParams,
): void {
	const {
		volume,
		yaw,
		pitch,
		zoom,
		pan,
		width,
		height,
		nervePoints = [],
		interpolatedNerve3D = [],
		implant3DWorld = null,
		implantsList = undefined,
		nerveAuditResult = null,
		selectedNerveNodeIdx = null,
	} = params;

	if (!volume || width <= 0 || height <= 0) return;

	const dim = volume.dimensions;
	const maxDim = Math.max(1.0, Math.max(dim.width, Math.max(dim.height, dim.depth)));
	const safeZoom = Math.max(0.01, zoom);
	const scale = Math.max(1e-5, (Math.min(width, height) / maxDim) * safeZoom * 0.95);
	const center = { x: width * 0.5 + pan.x, y: height * 0.5 + pan.y };
	const rotMat = computeVolume3DRotationMatrix(yaw, pitch);

	const spX = volume.spacingMm?.x && volume.spacingMm.x > 0 ? volume.spacingMm.x : 0.4;
	const canalRadiusMm = 1.25; // 2.5 mm anatomical diameter
	const canalRadiusPx = Math.max(2.0, (canalRadiusMm / spX) * scale);

	// ─── 1. MANDIBULAR NERVE CANAL (IAN) 3D TUBE ─────────────────────────────
	const nerveCurve = interpolatedNerve3D.length >= 2 ? interpolatedNerve3D : nervePoints;
	let projectedNerve: ProjectedScreenPoint[] = [];

	if (nerveCurve.length >= 2) {
		projectedNerve = nerveCurve.map((pt) =>
			project3DWorldToVolumeScreen(pt, volume, rotMat, scale, center),
		);

		ctx.save();
		ctx.lineCap = "round";
		ctx.lineJoin = "round";

		// Pass 1: Outer glowing aura (#ff9100 at 50% opacity)
		ctx.shadowBlur = Math.max(4, canalRadiusPx * 1.5);
		ctx.shadowColor = "#ff9100";
		ctx.strokeStyle = "rgba(255, 145, 0, 0.45)";
		ctx.lineWidth = canalRadiusPx * 2.4;
		ctx.beginPath();
		for (let i = 0; i < projectedNerve.length; i++) {
			const p = projectedNerve[i]!;
			if (i === 0) ctx.moveTo(p.screenX, p.screenY);
			else ctx.lineTo(p.screenX, p.screenY);
		}
		ctx.stroke();

		// Pass 2: Main anatomical canal tube (Vivid Vatech Orange #ff6d00)
		ctx.shadowBlur = 0;
		ctx.strokeStyle = "#ff6d00";
		ctx.lineWidth = canalRadiusPx * 2.0;
		ctx.beginPath();
		for (let i = 0; i < projectedNerve.length; i++) {
			const p = projectedNerve[i]!;
			if (i === 0) ctx.moveTo(p.screenX, p.screenY);
			else ctx.lineTo(p.screenX, p.screenY);
		}
		ctx.stroke();

		// Pass 3: Specular cylindrical highlight for realistic 3D tube depth
		ctx.strokeStyle = "rgba(255, 236, 179, 0.75)";
		ctx.lineWidth = Math.max(1.0, canalRadiusPx * 0.6);
		ctx.beginPath();
		for (let i = 0; i < projectedNerve.length; i++) {
			const p = projectedNerve[i]!;
			if (i === 0) ctx.moveTo(p.screenX, p.screenY);
			else ctx.lineTo(p.screenX, p.screenY);
		}
		ctx.stroke();

		ctx.restore();
	}

	// ─── 2. SEED POINTS & CONTROL NODES (MENTAL & MANDIBULAR FORAMINA) ──────
	const occupiedBadgeRects: Array<{ x: number; y: number; w: number; h: number }> = [];

	if (nervePoints.length > 0) {
		const projectedSeeds = nervePoints.map((seed) =>
			project3DWorldToVolumeScreen(seed, volume, rotMat, scale, center),
		);

		for (let i = 0; i < nervePoints.length; i++) {
			const p = projectedSeeds[i]!;
			const isMental = i === 0;
			const isMandibular =
				nervePoints.length >= 2 && i === nervePoints.length - 1;
			const isIntermediate = !isMental && !isMandibular;

			const nodeRadius = isIntermediate
				? Math.max(3.0, canalRadiusPx * 0.95)
				: Math.max(3.8, canalRadiusPx * 1.25);

			ctx.save();
			ctx.shadowBlur = 8;
			ctx.shadowColor = isMental ? "#38bdf8" : isMandibular ? "#a855f7" : "#f59e0b";
			ctx.fillStyle = isMental ? "#0284c7" : isMandibular ? "#9333ea" : "#d97706";
			ctx.strokeStyle = "#ffffff";
			ctx.lineWidth = 1.5;

			ctx.beginPath();
			ctx.arc(p.screenX, p.screenY, nodeRadius, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();

			// Clinical labels in Russian (Mandate 8e/8i):
			// Mental foramen -> "Ментальное отв."
			// Mandibular foramen -> "Мандибулярное отв."
			// Intermediate nodes -> show badge only if selected or far apart (>= 20px) to prevent messy collisions
			let showBadge = false;
			let label = "";
			let badgeBorder = "#f59e0b";

			if (isMental) {
				showBadge = true;
				label = "Ментальное отв.";
				badgeBorder = "#38bdf8";
			} else if (isMandibular) {
				showBadge = true;
				label = "Мандибулярное отв.";
				badgeBorder = "#a855f7";
			} else {
				const isSelected = selectedNerveNodeIdx === i;
				let isCrowded = false;
				for (let j = 0; j < projectedSeeds.length; j++) {
					if (i !== j) {
						const dist = Math.hypot(
							p.screenX - projectedSeeds[j]!.screenX,
							p.screenY - projectedSeeds[j]!.screenY,
						);
						if (dist < 18) {
							isCrowded = true;
							break;
						}
					}
				}
				if (isSelected || (!isCrowded && nervePoints.length <= 3)) {
					showBadge = true;
					label = `Узел ${i + 1}`;
					badgeBorder = "#f59e0b";
				}
			}

			if (showBadge && label) {
				ctx.font = "bold 9px monospace";
				const textW = ctx.measureText(label).width;
				const badgeW = textW + 8;
				const badgeH = 13;
				const tagX = Math.max(4, Math.min(width - badgeW - 4, p.screenX - badgeW / 2));
				const tagY = Math.max(4, p.screenY - nodeRadius - 15);

				ctx.fillStyle = "rgba(9, 9, 11, 0.88)";
				ctx.strokeStyle = badgeBorder;
				ctx.lineWidth = 1;
				ctx.beginPath();
				if (typeof ctx.roundRect === "function") {
					ctx.roundRect(tagX, tagY, badgeW, badgeH, 3);
				} else {
					ctx.rect(tagX, tagY, badgeW, badgeH);
				}
				ctx.fill();
				ctx.stroke();

				ctx.fillStyle = "#ffffff";
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText(label, tagX + badgeW / 2, tagY + badgeH / 2);

				occupiedBadgeRects.push({ x: tagX, y: tagY, w: badgeW, h: badgeH });
			}

			ctx.restore();
		}
	}

	// ─── 3. VIRTUAL IMPLANT FIXTURES IN 3D VOLUME VIEWPORT ─────────────────
	const rawImplantsList: readonly Implant3DWorldProjection[] =
		implantsList && implantsList.length > 0
			? implantsList
			: implant3DWorld
				? [implant3DWorld]
				: [];

	// Mandibular Arch Invariant: strictly eliminate maxillary teeth (FDI 11..28) or zygomatic coordinates (Z > -0.5 mm)
	const activeImplantsList = rawImplantsList.filter((imp) => {
		if (imp.targetToothFdi && imp.targetToothFdi < 30) return false;
		if (imp.entry3D.z > -0.5) return false;
		return true;
	});

	for (let impIdx = 0; impIdx < activeImplantsList.length; impIdx++) {
		const imp = activeImplantsList[impIdx]!;
		const pEntry = project3DWorldToVolumeScreen(imp.entry3D, volume, rotMat, scale, center);
		const pApex = project3DWorldToVolumeScreen(imp.apex3D, volume, rotMat, scale, center);

		const platRadiusMm = imp.platformDiameterMm / 2.0;
		const apexRadiusMm = imp.apexDiameterMm / 2.0;
		const platRPx = Math.max(2.5, (platRadiusMm / spX) * scale);
		const apexRPx = Math.max(1.8, (apexRadiusMm / spX) * scale);

		const dx = pApex.screenX - pEntry.screenX;
		const dy = pApex.screenY - pEntry.screenY;
		const len = Math.hypot(dx, dy) || 1.0;
		const perpX = -dy / len;
		const perpY = dx / len;

		const isDangerous = Boolean(impIdx === 0 && nerveAuditResult?.isDangerous);
		const isWarning = Boolean(impIdx === 0 && nerveAuditResult?.isWarning);

		const statusStroke = isDangerous ? "#ef4444" : isWarning ? "#f59e0b" : "#10b981";

		// 3.1 Safety corridor halo (+2.0 mm) — subtle surgical guide
		const haloPlatRPx = platRPx + (2.0 / spX) * scale;
		const haloApexRPx = apexRPx + (2.0 / spX) * scale;

		ctx.save();
		ctx.strokeStyle = isDangerous ? "rgba(239, 68, 68, 0.6)" : isWarning ? "rgba(245, 158, 11, 0.5)" : "rgba(16, 185, 129, 0.25)";
		ctx.lineWidth = 0.8;
		ctx.setLineDash([2, 3]);
		ctx.beginPath();
		ctx.moveTo(pEntry.screenX - perpX * haloPlatRPx, pEntry.screenY - perpY * haloPlatRPx);
		ctx.lineTo(pEntry.screenX + perpX * haloPlatRPx, pEntry.screenY + perpY * haloPlatRPx);
		ctx.lineTo(pApex.screenX + perpX * haloApexRPx, pApex.screenY + perpY * haloApexRPx);
		ctx.lineTo(pApex.screenX - perpX * haloApexRPx, pApex.screenY - perpY * haloApexRPx);
		ctx.closePath();
		ctx.stroke();
		ctx.setLineDash([]);

		// 3.2 Centerline axis — subtle surgical trajectory guide
		ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
		ctx.lineWidth = 0.75;
		ctx.setLineDash([3, 3]);
		ctx.beginPath();
		ctx.moveTo(pEntry.screenX, pEntry.screenY);
		ctx.lineTo(pApex.screenX, pApex.screenY);
		ctx.stroke();
		ctx.setLineDash([]);

		// 3.3 Platform coronal entry node
		ctx.fillStyle = "rgba(34, 211, 238, 0.75)";
		ctx.beginPath();
		ctx.arc(pEntry.screenX, pEntry.screenY, 2.0, 0, Math.PI * 2);
		ctx.fill();

		// 3.4 Apex apical node
		ctx.fillStyle = isDangerous ? "#ef4444" : isWarning ? "#f59e0b" : "rgba(16, 185, 129, 0.75)";
		ctx.beginPath();
		ctx.arc(pApex.screenX, pApex.screenY, 2.0, 0, Math.PI * 2);
		ctx.fill();

		// 3.6 Tooth position label badge (#46, #47, etc.)
		const toothLabel = imp.targetToothFdi ? `#${imp.targetToothFdi}` : `#${46 + impIdx}`;
		ctx.font = "bold 9px monospace";
		const badgeW = ctx.measureText(toothLabel).width;
		const badgeX = pEntry.screenX - badgeW / 2 - 3;
		const badgeY = pEntry.screenY - 14;

		ctx.fillStyle = "rgba(9, 9, 11, 0.85)";
		ctx.strokeStyle = "#10b981";
		ctx.lineWidth = 1;
		ctx.beginPath();
		if (typeof ctx.roundRect === "function") {
			ctx.roundRect(badgeX, badgeY, badgeW + 6, 12, 2);
		} else {
			ctx.rect(badgeX, badgeY, badgeW + 6, 12);
		}
		ctx.fill();
		ctx.stroke();

		ctx.fillStyle = "#34d399";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(toothLabel, pEntry.screenX, badgeY + 6);

		occupiedBadgeRects.push({ x: badgeX, y: badgeY, w: badgeW + 6, h: 12 });

		ctx.restore();
	}

	// ─── 4. DYNAMIC 3D APEX-TO-NERVE CLEARANCE VECTOR & MEASUREMENT ───────
	const primaryTargetImplant =
		implant3DWorld && (!implant3DWorld.targetToothFdi || implant3DWorld.targetToothFdi >= 30) && implant3DWorld.entry3D.z <= -0.5
			? implant3DWorld
			: activeImplantsList[0];
	if (primaryTargetImplant && nerveCurve.length >= 2) {
		const isDangerous = Boolean(nerveAuditResult?.isDangerous);
		const isWarning = Boolean(nerveAuditResult?.isWarning);
		const statusStroke = isDangerous ? "#ef4444" : isWarning ? "#f59e0b" : "#10b981";

		let closestNervePt: Point3D = nerveCurve[0]!;
		let minNerveDist = Infinity;

		for (const np of nerveCurve) {
			const d = Math.hypot(
				primaryTargetImplant.apex3D.x - np.x,
				primaryTargetImplant.apex3D.y - np.y,
				primaryTargetImplant.apex3D.z - np.z,
			);
			if (d < minNerveDist) {
				minNerveDist = d;
				closestNervePt = np;
			}
		}

		const netClearance = Math.max(0, minNerveDist - canalRadiusMm);
		const pApex = project3DWorldToVolumeScreen(primaryTargetImplant.apex3D, volume, rotMat, scale, center);
		const pClosestNerve = project3DWorldToVolumeScreen(closestNervePt, volume, rotMat, scale, center);

		ctx.save();
		// Dashed clearance vector line between apex and canal
		ctx.strokeStyle = statusStroke;
		ctx.lineWidth = 1.6;
		ctx.setLineDash([3, 3]);
		ctx.beginPath();
		ctx.moveTo(pApex.screenX, pApex.screenY);
		ctx.lineTo(pClosestNerve.screenX, pClosestNerve.screenY);
		ctx.stroke();
		ctx.setLineDash([]);

		// Midpoint of vector line
		const midX = (pApex.screenX + pClosestNerve.screenX) * 0.5;
		const midY = (pApex.screenY + pClosestNerve.screenY) * 0.5;

		const dx = pClosestNerve.screenX - pApex.screenX;
		const dy = pClosestNerve.screenY - pApex.screenY;
		const lineLen = Math.hypot(dx, dy) || 1;
		const normX = -dy / lineLen;
		const normY = dx / lineLen;

		const badgeText = `${netClearance.toFixed(1)} мм`;
		ctx.font = "bold 9.5px monospace";
		const bw = ctx.measureText(badgeText).width + 10;
		const bh = 15;

		// Smart Leader / Callout Placement Engine (Collision Avoidance):
		// Finds free space without overlapping Mandibular / Mental foramina, teeth, or apex
		const candidateDistances = [28, 42, 56];
		const candidateDirs: Array<{ x: number; y: number }> = [
			{ x: -normX, y: -normY },
			{ x: normX, y: normY },
			{ x: -normX * 0.8 + normY * 0.6, y: -normY * 0.8 - normX * 0.6 },
			{ x: -normX * 0.8 - normY * 0.6, y: -normY * 0.8 + normX * 0.6 },
			{ x: normX * 0.8 + normY * 0.6, y: normY * 0.8 - normX * 0.6 },
			{ x: normX * 0.8 - normY * 0.6, y: normY * 0.8 + normX * 0.6 },
			{ x: 0, y: -1 },
			{ x: 0, y: 1 },
		];

		const criticalPoints: Array<{ x: number; y: number }> = [
			{ x: pApex.screenX, y: pApex.screenY },
			{ x: pClosestNerve.screenX, y: pClosestNerve.screenY },
		];
		if (nervePoints.length > 0) {
			for (const np of nervePoints) {
				const pt = project3DWorldToVolumeScreen(np, volume, rotMat, scale, center);
				criticalPoints.push({ x: pt.screenX, y: pt.screenY });
			}
		}

		let bestCenter = { x: midX - normX * 28, y: midY - normY * 28 };
		let lowestPenalty = Infinity;

		for (const dist of candidateDistances) {
			for (const dir of candidateDirs) {
				const cx = midX + dir.x * dist;
				const cy = midY + dir.y * dist;
				const rect = { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh };

				let penalty = dist * 0.4;

				// Viewport margin bounds
				if (rect.x < 8 || rect.x + rect.w > width - 8) penalty += 5000;
				if (rect.y < 8 || rect.y + rect.h > height - 8) penalty += 5000;

				// Overlap check against occupied badges (Ментальное/Мандибулярное отв., tooth badges)
				for (const ob of occupiedBadgeRects) {
					const overlapX = Math.max(0, Math.min(rect.x + rect.w, ob.x + ob.w) - Math.max(rect.x, ob.x));
					const overlapY = Math.max(0, Math.min(rect.y + rect.h, ob.y + ob.h) - Math.max(rect.y, ob.y));
					if (overlapX > 0 && overlapY > 0) {
						penalty += 10000 + (overlapX * overlapY) * 50;
					} else {
						const distBadges = Math.hypot(cx - (ob.x + ob.w / 2), cy - (ob.y + ob.h / 2));
						if (distBadges < 28) penalty += (28 - distBadges) * 35;
					}
				}

				// Distance to critical nodes (apex, canal points)
				for (const cp of criticalPoints) {
					const d = Math.hypot(cx - cp.x, cy - cp.y);
					if (d < 22) {
						penalty += (22 - d) * 45;
					}
				}

				if (penalty < lowestPenalty) {
					lowestPenalty = penalty;
					bestCenter = { x: cx, y: cy };
				}
			}
		}

		const badgeRect = {
			x: bestCenter.x - bw / 2,
			y: bestCenter.y - bh / 2,
			w: bw,
			h: bh,
		};

		// Leader Callout Line:
		// Thin pointer line with anchor dot connecting midpoint of clearance vector to badge
		const anchorX = Math.max(badgeRect.x, Math.min(badgeRect.x + badgeRect.w, midX));
		const anchorY = Math.max(badgeRect.y, Math.min(badgeRect.y + badgeRect.h, midY));

		ctx.strokeStyle = statusStroke;
		ctx.lineWidth = 1.0;
		ctx.beginPath();
		ctx.moveTo(midX, midY);
		ctx.lineTo(anchorX, anchorY);
		ctx.stroke();

		// Midpoint anchor dot
		ctx.fillStyle = statusStroke;
		ctx.beginPath();
		ctx.arc(midX, midY, 1.8, 0, Math.PI * 2);
		ctx.fill();

		// Rounded Callout Measurement Badge
		ctx.fillStyle = "rgba(9, 9, 11, 0.92)";
		ctx.strokeStyle = statusStroke;
		ctx.lineWidth = 1.2;
		ctx.beginPath();
		if (typeof ctx.roundRect === "function") {
			ctx.roundRect(badgeRect.x, badgeRect.y, badgeRect.w, badgeRect.h, 3);
		} else {
			ctx.rect(badgeRect.x, badgeRect.y, badgeRect.w, badgeRect.h);
		}
		ctx.fill();
		ctx.stroke();

		ctx.fillStyle = statusStroke;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(badgeText, bestCenter.x, bestCenter.y);

		ctx.restore();
	}
}
