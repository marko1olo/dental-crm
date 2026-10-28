/**
 * DENTE CRM — CBCT Viewport Ruler & Angle Measurement Math
 * Standards: DICOM Part 3 / PS 3.3, Mandate 8b (<= 150 lines).
 */

import type {
	CbctAngleMeasurement,
	CbctMeasurementRuler,
	CbctViewportType,
	Point3D,
} from "../cbctMprMath";

/**
 * Formats physical measurement distance in millimeters with exact precision.
 * e.g., formatRulerDistanceMm(11.42) -> "11.4 мм"
 */
export function formatRulerDistanceMm(distanceMm: number): string {
	if (!Number.isFinite(distanceMm) || distanceMm < 0) return "0.0 мм";
	return `${distanceMm.toFixed(1)} мм`;
}

/**
 * Calculates Euclidean distance between 3D points in physical millimeters.
 */
export function calculateRulerDistanceMm(startMm: Point3D, endMm: Point3D): number {
	const dx = endMm.x - startMm.x;
	const dy = endMm.y - startMm.y;
	const dz = endMm.z - startMm.z;
	return Number(Math.hypot(dx, dy, dz).toFixed(1));
}

/**
 * Filters active rulers belonging to a specific viewport projection plane.
 */
export function filterRulersByViewport(
	rulers: readonly CbctMeasurementRuler[],
	viewport: CbctViewportType,
): CbctMeasurementRuler[] {
	return rulers.filter((r) => r.plane === viewport);
}

/**
 * Summary metrics of measurements placed on a slice.
 */
export function getRulerSummary(
	rulers: readonly CbctMeasurementRuler[],
	viewport?: CbctViewportType,
): { count: number; totalMm: number; maxMm: number; minMm: number; latestMm: number | null } {
	const filtered = viewport ? filterRulersByViewport(rulers, viewport) : rulers;
	if (filtered.length === 0) {
		return { count: 0, totalMm: 0, maxMm: 0, minMm: 0, latestMm: null };
	}
	let total = 0;
	let max = -Infinity;
	let min = Infinity;
	for (const r of filtered) {
		total += r.distanceMm;
		if (r.distanceMm > max) max = r.distanceMm;
		if (r.distanceMm < min) min = r.distanceMm;
	}
	const latest = filtered[filtered.length - 1]?.distanceMm ?? null;
	return {
		count: filtered.length,
		totalMm: Number(total.toFixed(1)),
		maxMm: Number(max.toFixed(1)),
		minMm: Number(min.toFixed(1)),
		latestMm: latest !== null ? Number(latest.toFixed(1)) : null,
	};
}

/**
 * Filters active angles belonging to a specific viewport projection plane.
 */
export function filterAnglesByViewport(
	angles: readonly CbctAngleMeasurement[],
	viewport: CbctViewportType,
): CbctAngleMeasurement[] {
	return angles.filter((a) => a.plane === viewport);
}

/**
 * Summary metrics of angle measurements placed on a slice.
 */
export function getAngleSummary(
	angles: readonly CbctAngleMeasurement[],
	viewport?: CbctViewportType,
): { count: number; latestDeg: number | null } {
	const filtered = viewport ? filterAnglesByViewport(angles, viewport) : angles;
	if (filtered.length === 0) {
		return { count: 0, latestDeg: null };
	}
	const latest = filtered[filtered.length - 1]?.angleDeg ?? null;
	return {
		count: filtered.length,
		latestDeg: latest !== null ? Number(latest.toFixed(1)) : null,
	};
}
