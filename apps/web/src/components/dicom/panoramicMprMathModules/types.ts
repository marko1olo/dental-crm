/**
 * types.ts — Геометрические и клинические типы MPR/CPR (Мандат 8b <= 120 строк).
 */

import type {
	Point2,
	CPRResult,
	VolumeSamplingData,
	CrossSectionGeometryParams,
	CrossSectionFrame,
	ExtendedMischClass,
} from "@dental/shared/radiology";

export interface Point2D {
	x: number;
	y: number;
}

export interface Point3D {
	x: number;
	y: number;
	z: number;
}

export type AnatomicalJawLandmark =
	| "condyle_right"
	| "angle_right"
	| "molar_right"
	| "canine_right"
	| "incisors"
	| "canine_left"
	| "molar_left"
	| "angle_left"
	| "condyle_left";

export interface AnatomicalJawPoint {
	landmark: AnatomicalJawLandmark;
	x: number;
	y: number;
	z: number;
	label: string;
}

export interface ArchCurvePoint {
	point: Point3D;
	tangent: Point3D;
	normal: Point3D;
	binormal: Point3D;
	arcLengthMm: number;
	index: number;
}

export interface CrossSectionSlicePlane {
	sliceIndex: number;
	center: Point3D;
	normal: Point3D;
	tangent: Point3D;
	up: Point3D;
	arcLengthMm: number;
	widthMm: number;
	heightMm: number;
	thicknessMm: number;
}

export interface MprCrosshairSync {
	worldPos: Point3D;
	axialSliceZ: number;
	coronalSliceY: number;
	sagittalSliceX: number;
	activeCrossSectionIndex: number;
	activeArchParamT: number;
	distanceToArchMm: number;
}

export interface BoneDensityRecommendation {
	mischClass: ExtendedMischClass;
	huRange: string;
	label: string;
	description: string;
	drillingRpm: string;
	torqueNcm: string;
	irrigation: boolean;
	corticalTap: boolean;
	underDrilling: boolean;
	underDrillingMm: number;
	osteotomeCondensation: boolean;
	clinicalAdvice: string;
}

export interface CrossSectionOptions {
	stepIntervalMm?: number;
	thicknessMm?: number;
	widthMm?: number;
	heightMm?: number;
}

export type {
	ExtendedMischClass,
	Point2,
	CPRResult,
	VolumeSamplingData,
	CrossSectionGeometryParams,
	CrossSectionFrame,
};
