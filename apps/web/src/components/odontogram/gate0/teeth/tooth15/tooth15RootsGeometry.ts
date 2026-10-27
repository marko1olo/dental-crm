/**
 * Anatomical Single Conical Root Geometry for Upper Second Premolar 15 (Wheeler Ch. 10)
 * Features:
 * 1. Single conical tapering root (90-95% incidence) with apex at (50.5, 13.0).
 * 2. Subtle distal apical inclination.
 * 3. Smooth transition from CEJ without bifurcation crotch.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH15_ROOTS_GEOMETRY = {
	rootApex: { x: 50.5, y: 13.0 },
	palatalApex: { x: 50.5, y: 13.0 },
	singleApex: { x: 50.5, y: 13.0 },

	// 1. Single Conical Root Monolith (Tapering from CEJ at Y=96 to slender apex at Y=13.0)
	rootMonolithPath:
		"M 24.5,96 " +
		"C 26.5,80 33.5,56 41.5,36 " +
		"C 45.5,26 48.0,17 50.0,13.0 " +
		"C 51.0,13.0 52.5,15.5 54.5,24.5 " +
		"C 58.5,37 65.5,58 72.0,80 " +
		"C 74.0,88 75.0,93 75.5,96 " +
		"C 67,94 58,93.5 50,93.5 " +
		"C 42,93.5 33,94 24.5,96 Z",

	// 2. Combined Root Silhouette for Clipping (Identical for single root)
	combinedRootsSilhouette:
		"M 24.5,96 " +
		"C 26.5,80 33.5,56 41.5,36 " +
		"C 45.5,26 48.0,17 50.0,13.0 " +
		"C 51.0,13.0 52.5,15.5 54.5,24.5 " +
		"C 58.5,37 65.5,58 72.0,80 " +
		"C 74.0,88 75.0,93 75.5,96 " +
		"C 67,94 58,93.5 50,93.5 " +
		"C 42,93.5 33,94 24.5,96 Z",

	// 3. Longitudinal Developmental Depressions
	mesialRadicularGroove: "M 32,92 C 34,74 38,52 44,32",
	distalRadicularGroove: "M 68,92 C 66,74 62,52 57,32",
	centralAxisLight: "M 50,94 C 50.2,70 50.4,42 50.5,15",

	// 4. Clinical Periapical Apex (Single apex at 50.5, 13.0)
	apices: [
		{ id: "P", nameRu: "Верхушка корня (магистральный канал)", x: 50.5, y: 13.0, r: 14 },
	],
} as const;
