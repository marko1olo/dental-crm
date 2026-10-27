/**
 * DENTE Dental CRM — Wheeler Ch. 8 Maxillary Central Incisor (Tooth 11) Geometry
 * Anatomical scale: 8.5mm crown width (widest anterior tooth, «Визитная карточка улыбки»).
 * Wide shovel crown (57px width: X=21.5..78.5, Y=70..148), strict 90° mesioincisal angle,
 * gracefully rounded distoincisal angle, 3 mamelon lobes, straight conical root (apex at 50.0, 14.0).
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export const TOOTH11_GEOMETRY = {
	toothId: "11",
	nameRu: "Верхний центральный резец",
	viewBox: "0 0 100 218",
	// Wide shovel crown: strict 90° mesioincisal angle & gracefully rounded distoincisal angle
	crownMonolithPath:
		"M 21.5,73.5 " +
		"C 19.8,88.0 19.2,108.0 20.5,124.0 " +
		"C 21.2,133.0 22.4,141.0 24.5,146.0 " + // Gracefully rounded distoincisal angle
		"C 26.8,147.8 30.0,148.0 36.0,148.0 " +
		"C 42.0,147.8 46.0,148.4 50.0,148.2 " + // Incisal mamelons
		"C 54.0,148.0 64.0,148.5 75.0,148.0 " +
		"C 76.8,148.0 78.0,148.0 78.5,148.0 " + // Strict 90° mesioincisal angle
		"C 78.8,141.0 79.2,126.0 78.8,110.0 " + // Straight mesial contour
		"C 78.5,96.0 78.5,84.0 78.5,73.5 " +
		"C 69.0,71.0 59.0,70.0 50.0,70.0 " +   // Scalloped CEJ arching toward root
		"C 41.0,70.0 31.0,71.0 21.5,73.5 Z",
	// Powerful, straight, conical single root tapering to smooth apex at (50.0, 14.0)
	rootMonolithPath:
		"M 21.5,73.5 " +
		"C 23.5,58.0 31.0,38.0 42.0,22.0 " +
		"C 45.0,17.0 47.5,14.0 50.0,14.0 " +   // Straight central conical apex
		"C 52.5,14.0 55.0,17.0 58.0,22.0 " +
		"C 69.0,38.0 76.5,58.0 78.5,73.5 " +
		"C 69.0,71.0 59.0,70.0 50.0,70.0 " +
		"C 41.0,70.0 31.0,71.0 21.5,73.5 Z",
	cejPath: "M 21.5,73.5 C 31.0,71.0 41.0,70.0 50.0,70.0 C 59.0,70.0 69.0,71.0 78.5,73.5",
	apex: { x: 50.0, y: 14.0 },
	apices: [{ x: 50.0, y: 14.0, r: 8.5 }] as const,
	// 3 vertical mamelon lobes / labial ridges (mesial on right, distal on left)
	labialRidgeMesial: "M 68.0,76.0 C 69.0,98.0 70.0,124.0 70.0,145.0",
	labialRidgeCenter: "M 50.0,73.0 C 50.0,96.0 50.0,122.0 50.0,146.0",
	labialRidgeDistal: "M 32.0,76.0 C 31.0,98.0 30.0,124.0 30.0,143.0",
	incisalHighlight: "M 26.0,146.5 C 42.0,147.0 58.0,147.0 77.5,146.5",
	// Straight root central axis depression
	rootSulcus: "M 50.0,68.0 C 50.0,52.0 50.0,34.0 50.0,19.0",
	cervicalShoulderPath:
		"M 21.5,73.5 C 31.0,71.0 41.0,70.0 50.0,70.0 C 59.0,70.0 69.0,71.0 78.5,73.5 " +
		"C 78.0,76.0 69.0,73.5 50.0,72.5 C 31.0,73.5 22.0,76.0 21.5,73.5 Z",
	compositeFillingPath:
		"M 36.0,72.5 C 43.0,71.0 57.0,71.0 64.0,72.5 C 62.5,77.5 57.0,79.0 50.0,79.0 C 43.0,79.0 37.5,77.5 36.0,72.5 Z",
	zirconiaCrownShell:
		"M 21.5,73.5 C 19.8,88 19.2,108 20.5,124 C 21.2,133 22.4,141 24.5,146 " +
		"C 26.8,147.8 42,148.4 50,148.2 C 58,148 75,148.5 78.5,148 " +
		"C 78.8,141 79.2,126 78.8,110 C 78.5,96 78.5,84 78.5,73.5 " +
		"C 69,71 50,70 21.5,73.5 Z",
	crownCuspSlopes: [] as const,
	crownSpecularRidges: [
		{ id: "incisal_bevel", d: "M 26.0,146.5 C 42.0,147.0 58.0,147.0 77.5,146.5" },
		{ id: "mesial_mamelon", d: "M 68.0,76.0 C 69.0,98.0 70.0,124.0 70.0,145.0" },
		{ id: "center_mamelon", d: "M 50.0,73.0 C 50.0,96.0 50.0,122.0 50.0,146.0" },
		{ id: "distal_mamelon", d: "M 32.0,76.0 C 31.0,98.0 30.0,124.0 30.0,143.0" },
	],
	crownEquatorHighlight: "M 23.0,105.0 C 37.0,102.0 63.0,102.0 77.0,105.0",
} as const;
