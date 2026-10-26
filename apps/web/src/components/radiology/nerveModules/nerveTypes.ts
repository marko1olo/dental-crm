/**
 * nerveTypes.ts — Типы данных и интерфейсы трассировщика нижнечелюстного канала (Мандат 8b).
 */

import type { Point2D, Point3D } from "../caliperModules/caliperTypes";

export const MANDIBULAR_NERVE_SAFETY_MARGIN_MM = 2.0;
export const MANDIBULAR_NERVE_CRITICAL_THRESHOLD_MM = 1.5;

export interface MandibularNerveSpline {
	id: string;
	side: "left" | "right" | "both";
	label: string;
	controlPoints: Point2D[];
	interpolatedCurve: Point2D[];
	safetyCorridorPolygon: Point2D[];
	lengthMm: number;
	canalDiameterMm: number;
	safetyMarginMm: number;
}

export interface NerveClearanceCheckResult {
	distanceMm: number;
	safetyStatus: "safe" | "warning" | "danger";
	safetyMarginMm: number;
	isDanger: boolean;
	isWarning: boolean;
	messageRu: string;
	closestNervePoint?: Point2D | Point3D;
}

export interface MandibularNerve3DSpline {
	id: string;
	side: "left" | "right" | "both";
	label: string;
	controlPoints: readonly Point3D[] | Point3D[];
	interpolatedCurve: Point3D[];
	lengthMm: number;
	canalDiameterMm: number;
	safetyMarginMm: number;
}

export interface NerveDistanceGatingResult {
	deltaZMm: number;
	alpha: number;
	isDashed: boolean;
	isVisible: boolean;
}

export interface GatedNerveSegment3D {
	p1: Point3D;
	p2: Point3D;
	midZ: number;
	deltaZMm: number;
	alpha: number;
	isDashed: boolean;
	isVisible: boolean;
}

export interface BuildMandibularNerve3DSplineParams {
	id?: string;
	side?: "left" | "right" | "both";
	label?: string;
	controlPoints: readonly Point3D[];
	subdivisionsPerSegment?: number;
	canalDiameterMm?: number;
	safetyMarginMm?: number;
}

export interface NerveHtmlOverlayData {
	readonly text: string;
	readonly xPx: number;
	readonly yPx: number;
	readonly totalLengthMm: number;
	readonly safetyMarginMm: number;
	readonly visibleNodeCount: number;
}
