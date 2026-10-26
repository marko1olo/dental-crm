/**
 * DENTE Dental CRM — Wheeler Ch. 9 Maxillary Canine (Tooth 13) Geometry
 * Anatomical scale: 30.0mm total length (longest root in human dentition!).
 * Powerful diamond spear crown (53px width: X=24.0..77.0), sharp tearing cusp at Y=154.0,
 * deepest root apex reaching up to Y=8.0, pronounced labial ridge & Cingulum.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export const TOOTH13_GEOMETRY = {
	toothId: "13",
	nameRu: "Верхний клык",
	viewBox: "0 0 100 218",
	// Diamond spear crown with prominent tearing cusp at Y=154.0
	crownMonolithPath:
		"M 24.0,94.5 " +
		"C 22.5,106.0 21.8,118.0 23.0,132.0 " + // Distal contour
		"C 32.0,142.0 42.0,149.0 50.0,154.0 " + // Distal cusp slope down to sharp tearing cusp tip
		"C 58.0,150.0 68.0,144.0 77.0,134.0 " + // Mesial cusp slope up to mesial contact
		"C 78.2,118.0 77.5,106.0 76.0,94.5 " +  // Mesial contour
		"C 67.0,92.0 59.0,90.5 50.0,90.5 " +   // Scalloped CEJ arching toward root
		"C 41.0,90.5 33.0,92.0 24.0,94.5 Z",
	// Longest single root of human dentition extending up to apex at Y=8.0
	rootMonolithPath:
		"M 24.0,94.5 " +
		"C 26.5,72.0 33.0,42.0 42.0,20.0 " +
		"C 45.5,12.0 48.0,8.0 50.0,8.0 " +     // Deepest root apex in dental arch (Y=8.0)
		"C 52.0,8.0 54.5,12.0 58.0,20.0 " +
		"C 67.0,42.0 73.5,72.0 76.0,94.5 " +
		"C 67.0,92.0 59.0,90.5 50.0,90.5 " +
		"C 41.0,90.5 33.0,92.0 24.0,94.5 Z",
	cejPath: "M 24.0,94.5 C 33.0,92.0 41.0,90.5 50.0,90.5 C 59.0,90.5 67.0,92.0 76.0,94.5",
	apex: { x: 50.0, y: 8.0 },
	apices: [{ x: 50.0, y: 8.0, r: 8.5 }] as const,
	// Labial central vertical ridge & Cingulum
	labialRidge: "M 50.0,90.5 C 50.0,112.0 50.0,133.0 50.0,154.0",
	labialRidgeHighlight: "M 48.5,92.0 C 48.5,112.0 48.5,133.0 48.5,152.0",
	cingulum: "M 42.0,97.0 C 46.0,99.5 54.0,99.5 58.0,97.0",
	// Longitudinal root groove (Sulcus longitudinalis)
	rootSulcus: "M 50.0,88.0 C 49.5,66.0 50.0,38.0 50.0,16.0",
	cervicalShoulderPath:
		"M 24.0,94.5 C 33.0,92.0 41.0,90.5 50.0,90.5 C 59.0,90.5 67.0,92.0 76.0,94.5 " +
		"L 75.5,97.0 C 67.0,94.5 59.0,93.5 50.0,93.5 C 41.0,93.5 33.0,94.5 24.5,97.0 Z",
	compositeFillingPath:
		"M 36.0,92.5 C 43.0,91.0 57.0,91.0 64.0,92.5 C 62.5,97.5 57.0,99.0 50.0,99.0 C 43.0,99.0 37.5,97.5 36.0,92.5 Z",
	zirconiaCrownShell:
		"M 24,94.5 C 22.5,106 21.8,118 23,132 C 32,142 42,149 50,154 C 58,150 68,144 77,134 " +
		"C 78.2,118 77.5,106 76,94.5 C 67,92 50,90.5 24,94.5 Z",
	crownCuspSlopes: [] as const,
	crownSpecularRidges: [
		{ id: "labial-axis", d: "M 50.0,92.0 C 50.0,112.0 50.0,132.0 50.0,151.0" },
		{ id: "mesial-cusp-slope", d: "M 50.0,152.0 C 58.0,148.0 67.0,142.0 75.0,133.0" },
		{ id: "distal-cusp-slope", d: "M 50.0,152.0 C 42.0,147.0 33.0,140.0 25.0,131.0" },
	],
	crownEquatorHighlight: "M 25,118 C 38,115 62,115 75,118",
} as const;
