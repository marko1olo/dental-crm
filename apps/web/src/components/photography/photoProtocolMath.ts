/**
 * Clinical Dental Photography & Orthodontic Photo Protocol Math Engine
 */

export * from './math/vectorGeometry';
export * from './math/facialAlignmentMath';
export * from './math/aestheticSmileMath';
export * from './math/beforeAfterMath';
export * from './math/collageDimensionsMath';
export * from './math/vitaPhysicalTabMath';

export type {
	ColorRGB,
	ColorLab,
	VitaShade,
	VitaSystemType,
	ShadeDeltaResult,
} from './vitaShadesCatalog';

export {
	rgbToLab,
	labToRgb,
	colorDistanceDeltaE76,
	colorDistanceDeltaE2000,
	calculateShadeDelta,
	getVitaShadeByCode,
	normalizeVitaShadeCode,
	VITA_CLASSICAL_BLEACH_SHADES,
	VITA_CLASSICAL_STANDARD_SHADES,
	VITA_CLASSICAL_SHADES,
	VITA_3D_MASTER_SHADES,
	ALL_VITA_SHADES,
} from './vitaShadesCatalog';
