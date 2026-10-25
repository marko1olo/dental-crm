/**
 * DENTE Dental CRM — Wheeler Ch. 11 Mandibular Canine (Tooth 43) Geometry
 * Anatomical scale: 27.0mm total length (longest tooth in human mouth!).
 * Tall spear crown (54px width: X=23..77), sharp tearing cusp elevated to Y=8.0,
 * deepest massive root down to Y=162.0.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 220".
 */

export const TOOTH43_GEOMETRY = {
	toothId: "43",
	nameRu: "Нижний клык",
	viewBox: "0 0 100 218",
	// Elevated spear crown with sharp tearing cusp at Y=8.0
	crownMonolithPath:
		"M 23.0,73.0 " +
		"C 21.0,58.0 22.0,40.0 25.0,28.0 " +
		"C 33.0,20.0 42.0,14.0 50.0,8.0 " +  // Tall sharp tearing cusp tip
		"C 58.0,14.0 67.0,21.0 75.0,29.0 " +
		"C 78.0,40.0 79.0,58.0 77.0,73.0 " +
		"C 68.0,75.0 59.0,76.0 50.0,76.0 " +
		"C 41.0,76.0 32.0,75.0 23.0,73.0 Z",
	// Longest single root of the human dentition down to Y=161.5 with pronounced distal curve to the left
	rootMonolithPath:
		"M 23.0,73.0 " +
		"C 25.0,92.0 27.5,118.0 31.0,140.0 " +
		"C 33.0,150.0 35.5,158.0 39.0,161.5 " + // Deepest apex with pronounced distal tilt to the left
		"C 41.5,161.0 45.0,154.0 49.0,140.0 " +
		"C 58.0,118.0 68.0,94.0 77.0,73.0 " +
		"C 68.0,75.0 59.0,76.0 50.0,76.0 " +
		"C 41.0,76.0 32.0,75.0 23.0,73.0 Z",
	cejPath: "M 23.0,73.0 C 32.0,75.0 41.0,76.0 50.0,76.0 C 59.0,76.0 68.0,75.0 77.0,73.0",
	apex: { x: 39.0, y: 161.5 },
	apices: [{ x: 39.0, y: 161.5, r: 9.5 }] as const,
	// Labial central vertical ridge
	labialRidge: "M 50.0,8.0 C 50.0,28.0 50.0,50.0 50.0,73.0",
	labialRidgeHighlight: "M 48.5,10.0 C 48.5,29.0 48.5,50.0 48.5,72.0",
	// Developmental root groove with pronounced distal curvature
	rootSulcus: "M 50.0,78.0 C 48.0,105.0 43.0,132.0 39.5,154.0",
	cervicalShoulderPath:
		"M 23.0,73.0 C 32.0,75.0 41.0,76.0 50.0,76.0 C 59.0,76.0 68.0,75.0 77.0,73.0 " +
		"L 76.5,70.5 C 68.0,72.5 59.0,73.5 50.0,73.5 C 41.0,73.5 32.0,72.5 23.5,70.5 Z",
	compositeFillingPath:
		"M 36.0,74.5 C 43.0,75.8 57.0,75.8 64.0,74.5 C 62.5,69.5 57.0,68.0 50.0,68.0 C 43.0,68.0 37.5,69.5 36.0,74.5 Z",
	zirconiaCrownShell:
		"M 23,73 C 21,58 20,40 24,28 C 30,20 40,13 50,8 C 60,13 70,20 76,28 " +
		"C 80,40 79,58 77,73 C 68,75 50,76 23,73 Z",
	crownCuspSlopes: [
		{ id: "mesial-slope", d: "M 50,8 C 42,14 34,22 25,28 C 30,34 38,36 46,38 C 48,26 49,16 50,8 Z", type: "highlight" as const },
		{ id: "distal-slope", d: "M 50,8 C 58,14 66,22 75,28 C 70,34 62,36 54,38 C 52,26 51,16 50,8 Z", type: "shadow" as const },
		{ id: "labial-ridge", d: "M 48,10 C 47,28 47,50 48,68 L 52,68 C 53,50 53,28 52,10 Z", type: "highlight" as const },
		{ id: "cervical-cingulum", d: "M 26,62 C 34,60 42,59 50,59 C 58,59 66,60 74,62 C 76,68 77,71 77,73 C 68,75 50,76 23,73 Z", type: "shadow" as const },
	],
	crownSpecularRidges: [
		{ id: "labial-axis", d: "M 49,9 L 49,60" },
		{ id: "mesial-arm", d: "M 25,28 C 33,20 42,14 49,9" },
		{ id: "distal-arm", d: "M 51,9 C 58,14 67,20 75,28" },
	],
	crownEquatorHighlight: "M 26,52 C 38,56 62,56 74,52",
} as const;
