/**
 * DENTE Dental CRM — Fallback & Custom Geometry Resolver
 * Compliant with Mandate 8b (<= 120 lines).
 */

import type { CanalDefinition } from "../anatomicalGeometriesTypes";
import {
	LOWER_CANINE_GEOMETRY,
	LOWER_INCISOR_GEOMETRY,
	UPPER_CANINE_GEOMETRY,
	UPPER_INCISOR_GEOMETRY,
} from "../anatomicalAdultGeometries";
import {
	PEDIATRIC_LOWER_MOLAR_GEOMETRY,
	PEDIATRIC_UPPER_MOLAR_GEOMETRY,
} from "./pediatricMolarGeometries";

let _geometryResolver: ((fdi: number) => { rootPath: string; canals: readonly CanalDefinition[] }) | null = null;

export function registerGeometryResolver(
	fn: (fdi: number) => { rootPath: string; canals: readonly CanalDefinition[] },
): void {
	_geometryResolver = fn;
}

export function resolveFallbackGeometry(fdiNumber: number): { rootPath: string; canals: readonly CanalDefinition[] } {
	if (_geometryResolver) {
		return _geometryResolver(fdiNumber);
	}
	const quadrant = Math.floor(fdiNumber / 10);
	const isTop = quadrant === 1 || quadrant === 2 || quadrant === 5 || quadrant === 6;
	const pos = fdiNumber % 10;
	if (pos === 4 || pos === 5) {
		return isTop
			? { rootPath: PEDIATRIC_UPPER_MOLAR_GEOMETRY.root, canals: PEDIATRIC_UPPER_MOLAR_GEOMETRY.canals }
			: { rootPath: PEDIATRIC_LOWER_MOLAR_GEOMETRY.root, canals: PEDIATRIC_LOWER_MOLAR_GEOMETRY.canals };
	}
	if (pos === 3) {
		return isTop
			? { rootPath: UPPER_CANINE_GEOMETRY.root, canals: UPPER_CANINE_GEOMETRY.canals }
			: { rootPath: LOWER_CANINE_GEOMETRY.root, canals: LOWER_CANINE_GEOMETRY.canals };
	}
	return isTop
		? { rootPath: UPPER_INCISOR_GEOMETRY.root, canals: UPPER_INCISOR_GEOMETRY.canals }
		: { rootPath: LOWER_INCISOR_GEOMETRY.root, canals: LOWER_INCISOR_GEOMETRY.canals };
}
