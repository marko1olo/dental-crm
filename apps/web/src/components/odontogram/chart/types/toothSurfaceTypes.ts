/**
 * apps/web/src/components/odontogram/chart/types/toothSurfaceTypes.ts
 *
 * DENTE Dental CRM — Canonical Tooth Surface Types and Helpers.
 * Bound to @dental/shared SSOT (dentalFormulaSurfaces.ts).
 */

import {
	CANONICAL_SURFACES,
	type CanonicalSurfaceKey,
	normalizeCanonicalSurface,
	normalizeCanonicalSurfaces,
	formatSurfacesRu,
} from "@dental/shared";

export const DENTAL_SURFACES = CANONICAL_SURFACES;
export type DentalSurfaceKey = CanonicalSurfaceKey;
export const ANATOMICAL_SURFACES = CANONICAL_SURFACES;
export type AnatomicalToothSurface = CanonicalSurfaceKey;

export const SURFACE_NAMES_RU: Readonly<Record<CanonicalSurfaceKey, string>> = Object.freeze({
	O: "Окклюзионная/Режущая (O)",
	V: "Вестибулярная (V)",
	L: "Язычная/Нёбная (L)",
	M: "Медиальная (M)",
	D: "Дистальная (D)",
	C: "Пришеечная (C)",
});

export const SURFACE_SHORT_RU: Readonly<Record<CanonicalSurfaceKey, string>> = Object.freeze({
	O: "О",
	V: "В",
	L: "Я",
	M: "М",
	D: "Д",
	C: "П",
});

export const SURFACE_TO_RUSSIAN_MAP = SURFACE_SHORT_RU;

export const RUSSIAN_TO_SURFACE_MAP: Readonly<Record<string, CanonicalSurfaceKey>> = Object.freeze({
	О: "O",
	В: "V",
	Щ: "V",
	Я: "L",
	Н: "L",
	М: "M",
	Д: "D",
	П: "C",
	Ц: "C",
});

export function parseSurfacesString(str?: string | null): CanonicalSurfaceKey[] {
	return normalizeCanonicalSurfaces(str ?? "");
}

export function formatSurfacesString(surfaces?: readonly string[] | null): string {
	return formatSurfacesRu(surfaces ?? []);
}

export function isSurfaceApplicableToTooth(arg1: number | string, arg2: number | string): boolean {
	const toothNumber = typeof arg1 === "number" ? arg1 : Number(arg2);
	const surface = typeof arg1 === "string" ? arg1 : String(arg2);
	const norm = normalizeCanonicalSurface(surface);
	if (!norm || !Number.isFinite(toothNumber)) return false;
	return toothNumber >= 11 && toothNumber <= 85;
}

export function validateSurfacesForTooth(arg1: readonly string[] | number, arg2: readonly string[] | number): string[] {
	const rawSurfaces = Array.isArray(arg1) ? arg1 : (Array.isArray(arg2) ? arg2 : []);
	return normalizeCanonicalSurfaces(rawSurfaces);
}

export function getApplicableSurfacesForTooth(_toothNumber: number): CanonicalSurfaceKey[] {
	return [...CANONICAL_SURFACES];
}

/**
 * Deep array comparison for surfaces, handling undefined/null and order.
 */
export function areSurfacesEqual(
	a?: readonly string[] | string[] | undefined,
	b?: readonly string[] | string[] | undefined,
): boolean {
	if (a === b) return true;
	if (!a || !b) return !a && !b;
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}
