/**
 * cprReexports.ts — CPR интерполяция и сэмплинг вокселей (Мандат 8b <= 120 строк).
 */

import {
	catmullRom,
	interpolateArchCurve,
	computeCurveNormals,
	totalArcLength,
	resampleByArcLength,
	generateDefaultArchCurve,
	offsetCurve,
	buildUniformCurve,
	AIR_HU,
	trilinear,
	crossSectionFrame,
	computeCrossSection,
	type Point2,
	type CPRResult,
	type VolumeSamplingData,
	type CrossSectionGeometryParams,
	type CrossSectionFrame,
} from "@dental/shared/radiology";
import type { Point2D } from "./types";

export function point2DToPoint2(p: Point2D): Point2 {
	return [p.x, p.y];
}

export function point2ToPoint2D(p: Point2): Point2D {
	return { x: p[0], y: p[1] };
}

export const catmullRom2D = catmullRom;

export {
	catmullRom,
	interpolateArchCurve,
	computeCurveNormals,
	totalArcLength,
	resampleByArcLength,
	buildUniformCurve,
	generateDefaultArchCurve,
	offsetCurve,
	AIR_HU,
	trilinear,
	crossSectionFrame,
	computeCrossSection,
	type Point2,
	type CPRResult,
	type VolumeSamplingData,
	type CrossSectionGeometryParams,
	type CrossSectionFrame,
};
