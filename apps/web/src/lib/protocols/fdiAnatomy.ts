/**
 * apps/web/src/lib/protocols/fdiAnatomy.ts
 *
 * Canonical FDI Tooth Anatomy & Surface Formatting Facade.
 * Delegated to @dental/shared/clinical/dentalFormulaSsot.ts (Single Source of Truth).
 */

export {
	QUADRANT_NAMES_RU,
	PERMANENT_TOOTH_NAMES_RU,
	PRIMARY_TOOTH_NAMES_RU,
	getToothAnatomicalNameRu,
	getToothFolkAndAnatomicalNameRu,
	formatSurfacesRu,
	normalizeFdiToothList,
	normalizeCanonicalSurface,
	normalizeCanonicalSurfaces,
	isSurfaceActive,
} from "@dental/shared";
