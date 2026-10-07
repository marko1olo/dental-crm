/**
 * DENTE CRM — CBCT Mandibular Nerve Canal (IAN) Hit-Testing & HUD Ergonomics Engine
 * Interactive control node dragging (Planmeca Romexis / 3Shape Implant Studio workflow)
 *
 * Mandate 8b compliant (strictly <= 800 lines). Zero-GC design.
 * Mandate 8e: Doctor Autonomy — direct manual node manipulation.
 */

import type {
	CbctViewportType,
	CbctVoxelVolume,
	Point3D,
	ViewportTransform,
} from "../cbctMprMath.js";
import {
	slicePxToScreenPx,
	worldMmToSlicePx,
} from "../cbctMprMath.js";
import type { NerveCanalSide } from "./cbctStudioTypes.js";

export interface NerveNodeHitResult {
	readonly index: number;
	readonly pointMm: Point3D;
	readonly screenDistancePx: number;
}

/**
 * Определение попадания указателя мыши в узел канала нерва на срезе MPR.
 * Проверяет попадание в 3D z/y/x окрестности среза и 2D радиусе tolerancePx на экране.
 */
export function hitTestNerveControlPoint(
	pointerPx: { x: number; y: number },
	nervePoints: readonly Point3D[],
	plane: CbctViewportType,
	crosshairMm: Point3D,
	volume: CbctVoxelVolume | null,
	transform: ViewportTransform,
	tolerancePx = 14,
): NerveNodeHitResult | null {
	if (!volume || nervePoints.length === 0) return null;

	let bestHit: NerveNodeHitResult | null = null;
	let minDistance = tolerancePx;

	for (let i = 0; i < nervePoints.length; i++) {
		const pt = nervePoints[i]!;

		// Проверка глубины относительно текущего среза
		let deltaMm = 0;
		if (plane === "axial") {
			deltaMm = Math.abs(pt.z - crosshairMm.z);
		} else if (plane === "coronal") {
			deltaMm = Math.abs(pt.y - crosshairMm.y);
		} else if (plane === "sagittal") {
			deltaMm = Math.abs(pt.x - crosshairMm.x);
		}

		// Допуск по глубине: до 4.0 мм от плоскости текущего среза
		if (deltaMm > 4.0) continue;

		const slicePx = worldMmToSlicePx(pt, plane, volume);
		const screenPx = slicePxToScreenPx(slicePx, transform);

		const dist = Math.hypot(pointerPx.x - screenPx.x, pointerPx.y - screenPx.y);
		if (dist <= minDistance) {
			minDistance = dist;
			bestHit = {
				index: i,
				pointMm: pt,
				screenDistancePx: dist,
			};
		}
	}

	return bestHit;
}

export interface NerveStepStatusInfo {
	readonly step: 1 | 2 | 3;
	readonly titleRu: string;
	readonly hintRu: string;
	readonly badgeClass: string;
	readonly isCompleted: boolean;
}

/**
 * Человекочитаемый клинический статус текущего шага 2-кликовой трассировки канала IAN.
 */
export function formatNerveStepStatus(
	pointCount: number,
	totalLengthMm = 0,
	activeSide: NerveCanalSide = "right",
): NerveStepStatusInfo {
	const sideRu = activeSide === "right" ? "Правый (4.4-4.8)" : "Левый (3.4-3.8)";

	if (pointCount === 0) {
		return {
			step: 1,
			titleRu: "Шаг 1: Укажите подбородочное отверстие (Foramen mentale)",
			hintRu: `Кликните на выходе канала у премоляров [${sideRu}]`,
			badgeClass: "bg-emerald-950/80 text-emerald-300 border-emerald-500/60 animate-pulse",
			isCompleted: false,
		};
	}

	if (pointCount === 1) {
		return {
			step: 2,
			titleRu: "Шаг 2: Укажите нижнечелюстное отверстие (Foramen mandibulae)",
			hintRu: `Кликните на медиальной стенке ветви челюсти [${sideRu}]`,
			badgeClass: "bg-amber-950/80 text-amber-300 border-amber-500/60 animate-pulse",
			isCompleted: false,
		};
	}

	return {
		step: 3,
		titleRu: `✓ Канал IAN: ${totalLengthMm.toFixed(1)} мм (Fast Marching Vatech)`,
		hintRu: `Канал [${sideRu}] сегментирован. Перетащите узел для микроподгонки.`,
		badgeClass: "bg-cyan-950/80 text-cyan-200 border-cyan-500/60 shadow-[0_0_10px_rgba(6,182,212,0.3)]",
		isCompleted: true,
	};
}
