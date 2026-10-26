/**
 * jawControlPoints.ts — Генерация анатомических точек челюсти (Мандат 8b <= 120 строк).
 */

import type { AnatomicalJawPoint } from "./types";

export function createAnatomicalJawControlPoints(
	options: {
		mandibleWidthMm?: number;
		archDepthMm?: number;
		zPlane?: number;
		includeMolars?: boolean;
	} = {},
): AnatomicalJawPoint[] {
	const width = options.mandibleWidthMm ?? 90;
	const depth = options.archDepthMm ?? 60;
	const z = options.zPlane ?? -42.5;
	const halfW = width / 2;

	const points: AnatomicalJawPoint[] = [
		{ landmark: "condyle_right", x: -halfW, y: -depth * 0.35, z, label: "Правый мыщелковый отросток (Condyle R)" },
		{ landmark: "angle_right", x: -halfW * 0.85, y: depth * 0.1, z, label: "Правый угол челюсти (Angle R)" },
	];

	if (options.includeMolars ?? true) {
		points.push({ landmark: "molar_right", x: -halfW * 0.62, y: depth * 0.35, z, label: "Правые моляры (#47-46)" });
	}

	points.push(
		{ landmark: "canine_right", x: -halfW * 0.32, y: depth * 0.72, z, label: "Правый клык (#43)" },
		{ landmark: "incisors", x: 0, y: depth * 0.85, z, label: "Центральные резцы (#41-31)" },
		{ landmark: "canine_left", x: halfW * 0.32, y: depth * 0.72, z, label: "Левый клык (#33)" },
	);

	if (options.includeMolars ?? true) {
		points.push({ landmark: "molar_left", x: halfW * 0.62, y: depth * 0.35, z, label: "Левые моляры (#36-37)" });
	}

	points.push(
		{ landmark: "angle_left", x: halfW * 0.85, y: depth * 0.1, z, label: "Левый угол челюсти (Angle L)" },
		{ landmark: "condyle_left", x: halfW, y: -depth * 0.35, z, label: "Левый мыщелковый отросток (Condyle L)" },
	);

	return points;
}
