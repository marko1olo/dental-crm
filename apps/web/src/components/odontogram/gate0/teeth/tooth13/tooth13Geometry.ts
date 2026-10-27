/**
 * DENTE Dental CRM — Wheeler Ch. 9 Maxillary Canine (Tooth 13) Geometry
 * Anatomical scale: 30.0mm total length (longest tooth in the human body!).
 * Diamond spear crown (53px width: X=23.5..76.5, Y=70..150), sharp tearing cusp at (50.0, 150.0),
 * massive central labial ridge, prominent cingulum, and deepest massive root down to apex (50.0, 8.0).
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export const TOOTH13_GEOMETRY = {
	toothId: "13",
	nameRu: "Верхний клык",
	viewBox: "0 0 100 218",
	// Diamond spear crown with sharp tearing cusp tip at (50.0, 150.0)
	crownMonolithPath:
		"M 23.5,73.0 " +
		"C 22.0,84.0 21.5,98.0 23.0,112.0 " +
		"C 23.5,116.0 25.0,120.0 27.5,124.0 " + // Distal contact point
		"C 33.0,132.0 41.0,142.0 50.0,150.0 " + // Longer distal cusp slope to sharp cusp tip
		"C 59.0,142.0 67.0,132.0 72.5,124.0 " + // Shorter mesial cusp slope
		"C 75.0,118.0 76.5,104.0 76.5,92.0 " +  // Mesial contour
		"C 76.5,85.0 76.2,79.0 76.5,73.0 " +
		"C 67.5,71.0 58.5,70.0 50.0,70.0 " +    // Cervical line
		"C 41.5,70.0 32.5,71.0 23.5,73.0 Z",
	// Longest single root of human dentition reaching apex at (50.0, 8.0)
	rootMonolithPath:
		"M 23.5,73.0 " +
		"C 26.0,56.0 31.5,36.0 40.5,18.0 " +
		"C 44.0,11.5 47.0,8.0 50.0,8.0 " +      // Deepest anatomical apex
		"C 53.0,8.0 56.0,11.5 59.5,18.0 " +
		"C 68.5,36.0 74.0,56.0 76.5,73.0 " +
		"C 67.5,71.0 58.5,70.0 50.0,70.0 " +
		"C 41.5,70.0 32.5,71.0 23.5,73.0 Z",
	cejPath: "M 23.5,73.0 C 32.5,71.0 41.5,70.0 50.0,70.0 C 58.5,70.0 67.5,71.0 76.5,73.0",
	apex: { x: 50.0, y: 8.0 },
	apices: [{ x: 50.0, y: 8.0, r: 9.0 }] as const,
	// Massive central labial ridge
	labialRidge: "M 50.0,72.0 C 50.0,95.0 50.0,122.0 50.0,150.0",
	labialRidgeHighlight: "M 48.5,74.0 C 48.5,96.0 48.5,123.0 48.5,148.0",
	// Anatomical Cingulum
	cingulum: "M 42.0,73.5 C 45.0,75.5 55.0,75.5 58.0,73.5",
	// Longitudinal developmental root sulcus
	rootSulcus: "M 50.0,68.0 C 50.0,48.0 50.0,28.0 50.0,12.0",
	cervicalShoulderPath:
		"M 23.5,73.0 C 32.5,71.0 41.5,70.0 50.0,70.0 C 58.5,70.0 67.5,71.0 76.5,73.0 " +
		"C 76.0,75.5 67.5,73.5 50.0,72.5 C 32.5,73.5 24.0,75.5 23.5,73.0 Z",
	compositeFillingPath:
		"M 36.0,72.5 C 43.0,71.0 57.0,71.0 64.0,72.5 C 62.5,77.5 57.0,79.0 50.0,79.0 C 43.0,79.0 37.5,77.5 36.0,72.5 Z",
	zirconiaCrownShell:
		"M 23.5,73 C 22,84 21.5,98 23,112 C 23.5,116 25,120 27.5,124 " +
		"C 33,132 41,142 50,150 C 59,142 67,132 72.5,124 C 75,118 76.5,104 76.5,92 " +
		"C 76.5,85 76.2,79 76.5,73 C 67.5,71 50,70 23.5,73 Z",
	crownCuspSlopes: [] as const,
	crownSpecularRidges: [
		{ id: "labial_axis", d: "M 50.0,74.0 C 50.0,96.0 50.0,122.0 50.0,148.0" },
		{ id: "mesial_cusp_slope", d: "M 50.0,148.0 C 58.0,140.0 66.0,131.0 72.0,124.0" },
		{ id: "distal_cusp_slope", d: "M 50.0,148.0 C 42.0,140.0 34.0,131.0 28.0,124.0" },
	],
	crownEquatorHighlight: "M 25.0,110.0 C 38.0,106.0 62.0,106.0 75.0,110.0",
} as const;
