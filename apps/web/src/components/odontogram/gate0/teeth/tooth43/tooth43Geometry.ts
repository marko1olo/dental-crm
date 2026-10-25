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
	// Longest single root of the human dentition down to Y=162.0 with natural distal apical hook
	rootMonolithPath:
		"M 23.0,73.0 " +
		"C 27.5,92.0 32.5,120.0 39.5,144.0 " +
		"C 42.0,154.0 44.5,160.5 46.5,161.5 " + // Deepest apex in dentition with distal tilt
		"C 48.5,160.5 51.5,154.0 55.5,144.0 " +
		"C 64.5,120.0 71.5,92.0 77.0,73.0 " +
		"C 68.0,75.0 59.0,76.0 50.0,76.0 " +
		"C 41.0,76.0 32.0,75.0 23.0,73.0 Z",
	cejPath: "M 23.0,73.0 C 32.0,75.0 41.0,76.0 50.0,76.0 C 59.0,76.0 68.0,75.0 77.0,73.0",
	apex: { x: 46.5, y: 161.5 },
	apices: [{ x: 46.5, y: 161.5, r: 9.5 }] as const,
	// Labial central vertical ridge
	labialRidge: "M 50.0,8.0 C 50.0,28.0 50.0,50.0 50.0,73.0",
	labialRidgeHighlight: "M 48.5,10.0 C 48.5,29.0 48.5,50.0 48.5,72.0",
	// Developmental root groove with subtle distal curvature
	rootSulcus: "M 50.0,78.0 C 50.0,105.0 49.0,132.0 46.8,153.5",
	cervicalShoulderPath:
		"M 23.0,73.0 C 32.0,75.0 41.0,76.0 50.0,76.0 C 59.0,76.0 68.0,75.0 77.0,73.0 " +
		"L 76.5,70.5 C 68.0,72.5 59.0,73.5 50.0,73.5 C 41.0,73.5 32.0,72.5 23.5,70.5 Z",
	compositeFillingPath:
		"M 36.0,74.5 C 43.0,75.8 57.0,75.8 64.0,74.5 C 62.5,69.5 57.0,68.0 50.0,68.0 C 43.0,68.0 37.5,69.5 36.0,74.5 Z",
} as const;
