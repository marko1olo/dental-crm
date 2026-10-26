/**
 * DENTE Dental CRM — Wheeler Ch. 9 Maxillary Canine (Tooth 13) Geometry
 * Anatomical scale: 30.0mm total length (longest root in human dentition!).
 * Powerful diamond spear crown (54px width: X=23..77), sharp tearing cusp at Y=153.0,
 * deepest root apex reaching up to Y=7.0 with slight distal tilt.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export const TOOTH13_GEOMETRY = {
	toothId: "13",
	nameRu: "Верхний клык",
	viewBox: "0 0 100 218",
	// Diamond spear crown with prominent tearing cusp at Y=153.0
	crownMonolithPath:
		"M 23.0,95.5 " +
		"C 21.5,110.0 21.0,124.0 23.0,133.0 " +
		"C 27.5,140.0 38.0,147.0 50.0,153.0 " + // Sharp tearing cusp tip
		"C 62.0,147.0 72.5,140.0 77.0,131.0 " +
		"C 79.0,122.0 78.5,110.0 77.0,95.5 " +
		"C 68.0,93.0 59.0,92.0 50.0,92.0 " +
		"C 41.0,92.0 32.0,93.0 23.0,95.5 Z",
	// Longest single root of human dentition extending up to apex at Y=7.0
	rootMonolithPath:
		"M 23.0,95.5 " +
		"C 26.0,72.0 32.0,44.0 42.0,22.0 " +
		"C 46.0,13.0 49.0,7.0 52.0,7.0 " + // Tallest root apex with subtle distal tilt (X=52)
		"C 54.5,7.0 57.0,12.0 60.5,22.0 " +
		"C 68.0,44.0 74.0,72.0 77.0,95.5 " +
		"C 68.0,93.0 59.0,92.0 50.0,92.0 " +
		"C 41.0,92.0 32.0,93.0 23.0,95.5 Z",
	cejPath: "M 23.0,95.5 C 32.0,93.0 41.0,92.0 50.0,92.0 C 59.0,92.0 68.0,93.0 77.0,95.5",
	apex: { x: 52.0, y: 7.0 },
	apices: [{ x: 52.0, y: 7.0, r: 8.5 }] as const,
	// Labial central vertical ridge
	labialRidge: "M 50.0,92.0 C 50.0,112.0 50.0,132.0 50.0,153.0",
	labialRidgeHighlight: "M 48.5,94.0 C 48.5,112.0 48.5,132.0 48.5,151.0",
	// Longitudinal root groove (Sulcus longitudinalis)
	rootSulcus: "M 50.0,90.0 C 49.5,68.0 50.5,40.0 51.5,16.0",
	cervicalShoulderPath:
		"M 23.0,95.5 C 32.0,93.0 41.0,92.0 50.0,92.0 C 59.0,92.0 68.0,93.0 77.0,95.5 " +
		"L 76.5,98.0 C 68.0,96.0 59.0,95.0 50.0,95.0 C 41.0,95.0 32.0,96.0 23.5,98.0 Z",
	compositeFillingPath:
		"M 36.0,94.0 C 43.0,92.5 57.0,92.5 64.0,94.0 C 62.5,99.0 57.0,100.5 50.0,100.5 C 43.0,100.5 37.5,99.0 36.0,94.0 Z",
	zirconiaCrownShell:
		"M 23,95.5 C 21,110 21,124 23,133 C 27,140 38,147 50,153 C 62,147 73,140 77,131 " +
		"C 79,122 78.5,110 77,95.5 C 68,93 50,92 23,95.5 Z",
	crownCuspSlopes: [] as const,
	crownSpecularRidges: [
		{ id: "labial-axis", d: "M 50.0,94.0 C 50.0,112.0 50.0,132.0 50.0,150.0" },
		{ id: "mesial-cusp-slope", d: "M 50.0,151.0 C 42.0,145.0 34.0,138.0 25.0,133.0" },
		{ id: "distal-cusp-slope", d: "M 50.0,151.0 C 58.0,145.0 66.0,138.0 75.0,131.0" },
	],
	crownEquatorHighlight: "M 25,118 C 38,115 62,115 75,118",
} as const;
