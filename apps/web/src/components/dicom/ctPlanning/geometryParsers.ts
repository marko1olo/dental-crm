/**
 * geometryParsers.ts — Парсеры точек разметки и аннотаций срезов (Мандат 8b <= 120 строк).
 */

import {
	type BuildPanoramicArchOptions,
	buildPanoramicArch,
	type PanoramicArchResult,
} from "../panoramicArch";
import type { WorldPoint3, CtPlanningMarkup, CtPlanningSaveBody } from "./types";

export function finiteNumber(value: unknown): number | null {
	if (typeof value !== "number" || !Number.isFinite(value)) return null;
	return value;
}

export function worldTriple(value: unknown): [number, number, number] | null {
	const source: unknown[] | null = Array.isArray(value)
		? value
		: value && typeof value === "object"
			? [
					(value as Record<string, unknown>)["0"],
					(value as Record<string, unknown>)["1"],
					(value as Record<string, unknown>)["2"],
				]
			: null;
	if (!source) return null;
	const x = finiteNumber(source[0]);
	const y = finiteNumber(source[1]);
	const z = finiteNumber(source[2]);
	if (x === null || y === null || z === null) return null;
	return [x, y, z];
}

export function worldPointOf(value: unknown): WorldPoint3 | null {
	const triple = worldTriple(
		value && typeof value === "object" && "length" in (value as ArrayLike<number>)
			? Array.from(value as ArrayLike<number>)
			: value,
	);
	if (!triple) return null;
	return { x: triple[0], y: triple[1], z: triple[2] };
}

export function archControlPointsOf(
	annotations: readonly { data?: { handles?: { points?: readonly unknown[] | undefined } | undefined } | undefined }[],
): WorldPoint3[] {
	for (let i = annotations.length - 1; i >= 0; i--) {
		const raw = annotations[i]?.data?.handles?.points ?? [];
		const points: WorldPoint3[] = [];
		for (const candidate of raw) {
			const point = worldPointOf(candidate);
			if (point) points.push(point);
		}
		if (points.length > 0) return points;
	}
	return [];
}

export function archFromStoredControlPoints(
	points: readonly WorldPoint3[],
	options: BuildPanoramicArchOptions = {},
): PanoramicArchResult {
	return buildPanoramicArch(
		[{ data: { handles: { points: points.map((p) => [p.x, p.y, p.z]) } } }],
		options,
	);
}

export function ctPlanningSaveBody(patientId: string, studyInstanceUid: string, markup: CtPlanningMarkup): CtPlanningSaveBody {
	return {
		patientId,
		studyInstanceUid,
		splinePointsJson: JSON.stringify(markup.splinePoints),
		nervePointsJson: JSON.stringify(markup.nervePoints),
		implantsJson: JSON.stringify(markup.implants),
	};
}
