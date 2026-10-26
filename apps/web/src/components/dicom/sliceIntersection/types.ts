/**
 * types.ts — Типы координат срезов, векторов и сегментов (Мандат 8b <= 120 строк).
 */

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

export interface Segment2D {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

export interface Segment3D {
	p1: Vec3;
	p2: Vec3;
}

export interface BoundingBox3D {
	xMin: number;
	xMax: number;
	yMin: number;
	yMax: number;
	zMin: number;
	zMax: number;
}

export interface BoundingBox2D {
	uMin: number;
	uMax: number;
	vMin: number;
	vMax: number;
}

export type MprSlicePlaneType =
	| "axial"
	| "coronal"
	| "sagittal"
	| "crossSection"
	| "panoramic";

export interface CrossSectionPlaneSpec {
	point: [number, number] | [number, number, number];
	normal: [number, number];
	tangent: [number, number];
	tiltDeg?: number;
	widthMm: number;
	zMin: number;
	zMax: number;
}

export interface OrthogonalSliceCoordinates {
	axialZ: number;
	coronalY: number;
	sagittalX: number;
}

export interface PlaneEquation {
	normal: Vec3;
	d: number;
}

export interface CrossSectionOrthonormalFrame {
	origin: Vec3;
	eU: Vec3;
	eV: Vec3;
	normal: Vec3;
	d: number;
}
