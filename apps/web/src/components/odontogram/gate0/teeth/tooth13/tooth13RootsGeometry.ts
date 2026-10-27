/**
 * Anatomical Root Geometry for Upper Canine 13 (Wheeler Ch. 8)
 * Features:
 * 1. Longest root in human dentition: apex reaches Y=4.5!
 * 2. Massive conical tapering with smooth distal curvature to the LEFT (X < 50).
 * 3. Apex at (45.0, 4.5).
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH13_ROOTS_GEOMETRY = {
	canineApex: { x: 45.0, y: 4.5 },
	singleApex: { x: 45.0, y: 4.5 },
	palatalApex: { x: 45.0, y: 4.5 },

	// 1. Single Massive Conical Root (Longest root, apex Y=4.5)
	rootMonolithPath:
		"M 26.5,96.0 " +
		"C 27.5,78.0 31.0,52.0 37.0,26.0 " +
		"C 40.5,14.0 43.0,6.0 44.5,4.5 " +
		"C 45.5,4.5 47.0,7.5 49.5,16.0 " +
		"C 54.0,30.0 61.5,56.0 68.0,78.0 " +
		"C 70.5,86.0 72.5,92.0 73.5,96.0 " +
		"C 65.0,94.0 57.0,93.0 50.0,93.0 " +
		"C 42.0,93.0 34.0,94.0 26.5,96.0 Z",

	// 2. Combined Root Silhouette for Clipping
	combinedRootsSilhouette:
		"M 26.5,96.0 " +
		"C 27.5,78.0 31.0,52.0 37.0,26.0 " +
		"C 40.5,14.0 43.0,6.0 44.5,4.5 " +
		"C 45.5,4.5 47.0,7.5 49.5,16.0 " +
		"C 54.0,30.0 61.5,56.0 68.0,78.0 " +
		"C 70.5,86.0 72.5,92.0 73.5,96.0 " +
		"C 65.0,94.0 57.0,93.0 50.0,93.0 " +
		"C 42.0,93.0 34.0,94.0 26.5,96.0 Z",

	// 3. Longitudinal Developmental Grooves
	mesialRadicularGroove: "M 67.0,92.0 C 62.0,72.0 55.5,46.0 48.0,18.0",
	distalRadicularGroove: "M 33.0,92.0 C 35.0,72.0 39.0,46.0 43.0,18.0",
	labialRootRidge: "M 50.0,93.0 C 48.5,65.0 46.5,35.0 45.0,6.0",

	saddleShadowPath: "",
	trifurcationShadowPath: "",
	mbCastShadowPath: "",
	bifurcationCrotch: { x: 50.0, y: 96.0 },

	// 4. Clinical Periapical Apex (Single high apex at 45.0, 4.5)
	apices: [
		{ id: "C", nameRu: "Верхушка клыка (магистральный канал)", x: 45.0, y: 4.5, r: 14 },
	],
} as const;
