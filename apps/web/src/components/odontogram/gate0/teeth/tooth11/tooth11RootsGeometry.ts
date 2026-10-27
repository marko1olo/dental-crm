/**
 * Anatomical Root Geometry for Upper Central Incisor 11 (Wheeler Ch. 6)
 * Features:
 * 1. Straight, massive, centered conical root (apex Y=12.5).
 * 2. Blunt rounded apex centered at (50.0, 12.5) with zero curvature (symmetrical midline anchor).
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH11_ROOTS_GEOMETRY = {
	centralApex: { x: 50.0, y: 12.5 },
	singleApex: { x: 50.0, y: 12.5 },
	palatalApex: { x: 50.0, y: 12.5 },

	// 1. Single Massive Symmetrical Conical Root (Apex Y=12.5)
	rootMonolithPath:
		"M 25.0,96.0 " +
		"C 26.5,80.0 31.0,56.0 38.0,34.0 " +
		"C 42.0,22.0 46.5,14.5 48.5,12.5 " +
		"C 49.5,12.0 50.5,12.0 51.5,12.5 " +
		"C 53.5,14.5 58.0,22.0 62.0,34.0 " +
		"C 69.0,56.0 73.5,80.0 75.0,96.0 " +
		"C 67.0,94.0 58.0,93.0 50.0,93.0 " +
		"C 42.0,93.0 33.0,94.0 25.0,96.0 Z",

	// 2. Combined Root Silhouette for Clipping
	combinedRootsSilhouette:
		"M 25.0,96.0 " +
		"C 26.5,80.0 31.0,56.0 38.0,34.0 " +
		"C 42.0,22.0 46.5,14.5 48.5,12.5 " +
		"C 49.5,12.0 50.5,12.0 51.5,12.5 " +
		"C 53.5,14.5 58.0,22.0 62.0,34.0 " +
		"C 69.0,56.0 73.5,80.0 75.0,96.0 " +
		"C 67.0,94.0 58.0,93.0 50.0,93.0 " +
		"C 42.0,93.0 33.0,94.0 25.0,96.0 Z",

	// 3. Longitudinal Developmental Grooves
	mesialRadicularGroove: "M 67.0,92.0 C 63.0,72.0 58.0,46.0 53.0,22.0",
	distalRadicularGroove: "M 33.0,92.0 C 37.0,72.0 42.0,46.0 47.0,22.0",
	centralRootRidge: "M 50.0,93.0 C 50.0,66.0 50.0,38.0 50.0,15.0",

	saddleShadowPath: "",
	trifurcationShadowPath: "",
	mbCastShadowPath: "",
	bifurcationCrotch: { x: 50.0, y: 96.0 },

	// 4. Clinical Periapical Apex (Single centered apex at 50.0, 12.5)
	apices: [
		{ id: "M", nameRu: "Верхушка центрального резца (прямой конус)", x: 50.0, y: 12.5, r: 13 },
	],
} as const;
