/**
 * DENTE Dental CRM — Wheeler Ch. 8 Maxillary Central Incisor (Tooth 11) Geometry
 * Anatomical scale: 8.5mm crown width (widest anterior tooth, «Визитная карточка улыбки»).
 * Wide shovel crown (57px width: X=21.5..78.5), strict 90° mesioincisal angle,
 * gracefully rounded distoincisal angle, 3 mamelon lobes, straight conical root (apex at 50.0, 14.0).
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export const TOOTH11_GEOMETRY = {
	toothId: "11",
	nameRu: "Верхний центральный резец",
	viewBox: "0 0 100 218",
	// Wide shovel crown: strict 90° mesioincisal angle & gracefully rounded distoincisal angle
	crownMonolithPath:
		"M 21.5,93.5 " +
		"C 20.0,105.0 19.5,120.0 20.5,135.0 " +
		"C 21.0,141.0 22.0,145.5 24.5,148.0 " + // Gracefully rounded distoincisal angle
		"C 25.8,149.3 27.5,150.0 29.5,150.0 " +
		"C 36.0,149.7 43.0,150.2 50.0,150.0 " + // Incisal ridge
		"C 57.0,149.8 65.0,150.3 75.0,150.0 " +
		"L 78.5,150.0 " +                      // Strict 90° mesioincisal angle
		"L 78.5,149.0 " +
		"C 79.2,142.0 79.5,130.0 78.5,118.0 " + // Mesial contour
		"C 78.0,110.0 78.5,100.0 78.5,93.5 " +
		"C 69.0,91.0 59.0,90.0 50.0,90.0 " +   // Scalloped CEJ arching toward root
		"C 41.0,90.0 31.0,91.0 21.5,93.5 Z",
	// Powerful, straight, conical single root tapering to smooth apex at (50.0, 14.0)
	rootMonolithPath:
		"M 21.5,93.5 " +
		"C 23.5,76.0 31.0,46.0 42.0,24.0 " +
		"C 45.0,17.5 47.5,14.0 50.0,14.0 " +   // Straight central conical apex
		"C 52.5,14.0 55.0,17.5 58.0,24.0 " +
		"C 69.0,46.0 76.5,76.0 78.5,93.5 " +
		"C 69.0,91.0 59.0,90.0 50.0,90.0 " +
		"C 41.0,90.0 31.0,91.0 21.5,93.5 Z",
	cejPath: "M 21.5,93.5 C 31.0,91.0 41.0,90.0 50.0,90.0 C 59.0,90.0 69.0,91.0 78.5,93.5",
	apex: { x: 50.0, y: 14.0 },
	apices: [{ x: 50.0, y: 14.0, r: 8.5 }] as const,
	// 3 vertical mamelon lobes / labial ridges (mesial on right, distal on left)
	labialRidgeMesial: "M 68.0,94.0 C 69.0,112.0 70.0,132.0 70.0,148.0",
	labialRidgeCenter: "M 50.0,92.0 C 50.0,112.0 50.0,132.0 50.0,148.5",
	labialRidgeDistal: "M 32.0,94.0 C 31.0,112.0 30.0,132.0 30.0,146.0",
	incisalHighlight: "M 26.0,149.0 L 77.5,149.0",
	// Straight root central axis depression
	rootSulcus: "M 50.0,88.0 C 50.0,66.0 50.0,42.0 50.0,20.0",
	cervicalShoulderPath:
		"M 21.5,93.5 C 31.0,91.0 41.0,90.0 50.0,90.0 C 59.0,90.0 69.0,91.0 78.5,93.5 " +
		"L 78.0,96.0 C 69.0,93.5 59.0,92.5 50.0,92.5 C 41.0,92.5 31.0,93.5 22.0,96.0 Z",
	compositeFillingPath:
		"M 36.0,92.0 C 43.0,90.5 57.0,90.5 64.0,92.0 C 62.5,97.0 57.0,98.5 50.0,98.5 C 43.0,98.5 37.5,97.0 36.0,92.0 Z",
	zirconiaCrownShell:
		"M 21.5,93.5 C 20,105 19.5,120 20.5,135 C 21,141 22,145.5 24.5,148 C 25.8,149.3 27.5,150 29.5,150 " +
		"C 43,150.2 57,149.8 75,150 L 78.5,150 L 78.5,149 C 79.2,142 79.5,130 78.5,118 C 78,110 78.5,100 78.5,93.5 " +
		"C 69,91 50,90 21.5,93.5 Z",
	crownCuspSlopes: [] as const,
	crownSpecularRidges: [
		{ id: "incisal_bevel", d: "M 26.0,148.5 L 77.5,148.5" },
		{ id: "mesial_mamelon", d: "M 68.0,95.0 C 69.0,112.0 70.0,130.0 70.0,147.0" },
		{ id: "center_mamelon", d: "M 50.0,93.0 C 50.0,112.0 50.0,130.0 50.0,147.5" },
		{ id: "distal_mamelon", d: "M 32.0,95.0 C 31.0,112.0 30.0,130.0 30.0,145.0" },
	],
	crownEquatorHighlight: "M 23,120 C 37,117 63,117 77,120",
} as const;
