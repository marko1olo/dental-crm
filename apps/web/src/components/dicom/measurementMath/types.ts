/**
 * types.ts — Типы для вычисления расстояний, углов и ROI в DICOM/КЛКТ (Мандат 8b <= 120 строк).
 */

export type MeasurementPoint2D = [number, number] | { x: number; y: number };
export type MeasurementPoint3D = [number, number, number] | { x: number; y: number; z: number };
export type Point2D = MeasurementPoint2D;
export type Point3D = MeasurementPoint3D;

export type VoxelSpacing2D = [number, number];
export type VoxelSpacing3D = [number, number, number];

export interface RoiStats {
	count: number;
	mean: number;
	stdDev: number;
	min: number;
	max: number;
}

export function point2ToArray(p: Point2D): [number, number] {
	if (Array.isArray(p)) return [p[0], p[1]];
	return [p.x, p.y];
}

export function point3ToArray(p: Point3D): [number, number, number] {
	if (Array.isArray(p)) return [p[0], p[1], p[2]];
	return [p.x, p.y, p.z];
}
