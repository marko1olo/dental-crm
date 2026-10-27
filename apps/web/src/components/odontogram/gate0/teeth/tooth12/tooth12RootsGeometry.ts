/**
 * Anatomical Root Geometry for Upper Lateral Incisor 12 (Wheeler Ch. 7)
 * Features:
 * 1. Slender, delicate single conical root (apex Y=14.0).
 * 2. Marked distal apical hook to the LEFT (X < 50): apex at (43.0, 14.0).
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH12_ROOTS_GEOMETRY = {
	lateralApex: { x: 43.0, y: 14.0 },
	singleApex: { x: 43.0, y: 14.0 },
	palatalApex: { x: 43.0, y: 14.0 },

	// 1. Single Slender Root Monolith with Distal Apical Bend to the Left
	rootMonolithPath:
		"M 29.0,96.0 " +
		"C 29.8,80.0 32.5,58.0 37.0,38.0 " +
		"C 39.5,27.0 41.5,18.0 42.5,14.0 " +
		"C 43.5,14.0 45.0,17.0 47.0,24.0 " +
		"C 51.5,38.0 58.5,58.0 65.0,78.0 " +
		"C 68.0,86.0 70.0,92.0 71.0,96.0 " +
		"C 63.5,94.0 56.5,93.0 50.0,93.0 " +
		"C 43.0,93.0 36.0,94.0 29.0,96.0 Z",

	// 2. Combined Root Silhouette for Clipping
	combinedRootsSilhouette:
		"M 29.0,96.0 " +
		"C 29.8,80.0 32.5,58.0 37.0,38.0 " +
		"C 39.5,27.0 41.5,18.0 42.5,14.0 " +
		"C 43.5,14.0 45.0,17.0 47.0,24.0 " +
		"C 51.5,38.0 58.5,58.0 65.0,78.0 " +
		"C 68.0,86.0 70.0,92.0 71.0,96.0 " +
		"C 63.5,94.0 56.5,93.0 50.0,93.0 " +
		"C 43.0,93.0 36.0,94.0 29.0,96.0 Z",

	// 3. Longitudinal Developmental Grooves
	mesialRadicularGroove: "M 64.0,92.0 C 59.0,72.0 53.0,48.0 46.0,24.0",
	distalRadicularGroove: "M 35.0,92.0 C 36.5,72.0 39.0,48.0 42.0,24.0",
	labialRootRidge: "M 50.0,93.0 C 48.5,68.0 46.0,42.0 43.5,16.0",

	saddleShadowPath: "",
	trifurcationShadowPath: "",
	mbCastShadowPath: "",
	bifurcationCrotch: { x: 50.0, y: 96.0 },

	// 4. Clinical Periapical Apex (Single apex at 43.0, 14.0)
	apices: [
		{ id: "L", nameRu: "Верхушка латерального резца (загиб влево)", x: 43.0, y: 14.0, r: 12 },
	],
} as const;
