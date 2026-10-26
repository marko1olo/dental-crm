/**
 * DENTE Dental CRM — Wheeler Ch. 8 Maxillary Central Incisor (Tooth 11) Geometry
 * Anatomical scale: 8.5mm crown width (widest anterior tooth, «Визитная карточка улыбки»).
 * Wide shovel crown (58px width: X=21..79), strict 90° mesioincisal angle,
 * gracefully rounded distoincisal angle, 3 mamelon lobes, straight conical root (apex at 50.0, 12.0).
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export const TOOTH11_GEOMETRY = {
	toothId: "11",
	nameRu: "Верхний центральный резец",
	viewBox: "0 0 100 218",
	// Wide shovel crown: strict 90° mesioincisal angle & rounded distoincisal angle
	crownMonolithPath:
		"M 21.0,95.0 " +
		"C 20.0,110.0 20.0,132.0 20.5,147.5 " +
		"C 20.5,148.5 21.0,149.0 22.0,149.0 " + // Strict 90° mesioincisal angle
		"L 75.5,149.0 " +                      // Horizontal incisal ridge
		"C 77.5,149.0 79.0,147.5 79.0,145.0 " + // Gracefully rounded distoincisal angle
		"C 79.5,130.0 80.0,110.0 79.0,95.0 " +
		"C 69.0,93.0 59.0,92.0 50.0,92.0 " +
		"C 41.0,92.0 31.0,93.0 21.0,95.0 Z",
	// Powerful, straight, conical single root tapering to apex at Y=12.0
	rootMonolithPath:
		"M 21.0,95.0 " +
		"C 23.0,76.0 32.0,42.0 44.0,20.0 " +
		"C 46.5,15.0 48.0,12.0 50.0,12.0 " + // Straight central conical apex
		"C 52.0,12.0 53.5,15.0 56.0,20.0 " +
		"C 68.0,42.0 77.0,76.0 79.0,95.0 " +
		"C 69.0,93.0 59.0,92.0 50.0,92.0 " +
		"C 41.0,92.0 31.0,93.0 21.0,95.0 Z",
	cejPath: "M 21.0,95.0 C 31.0,93.0 41.0,92.0 50.0,92.0 C 59.0,92.0 69.0,93.0 79.0,95.0",
	apex: { x: 50.0, y: 12.0 },
	apices: [{ x: 50.0, y: 12.0, r: 8.5 }] as const,
	// 3 vertical mamelon lobes / labial ridges
	labialRidgeMesial: "M 38.0,95.0 C 37.0,112.0 36.0,130.0 35.0,147.0",
	labialRidgeCenter: "M 50.0,94.0 C 50.0,112.0 50.0,130.0 50.0,147.0",
	labialRidgeDistal: "M 62.0,95.0 C 63.0,112.0 64.0,130.0 65.0,147.0",
	incisalHighlight: "M 22.0,148.0 L 75.0,148.0",
	// Straight root central axis depression
	rootSulcus: "M 50.0,91.0 C 50.0,70.0 50.0,45.0 50.0,22.0",
	cervicalShoulderPath:
		"M 21.0,95.0 C 31.0,93.0 41.0,92.0 50.0,92.0 C 59.0,92.0 69.0,93.0 79.0,95.0 " +
		"L 78.5,97.5 C 69.0,95.5 59.0,94.5 50.0,94.5 C 41.0,94.5 31.0,95.5 21.5,97.5 Z",
	compositeFillingPath:
		"M 36.0,94.0 C 43.0,92.5 57.0,92.5 64.0,94.0 C 62.5,99.0 57.0,100.5 50.0,100.5 C 43.0,100.5 37.5,99.0 36.0,94.0 Z",
	zirconiaCrownShell:
		"M 21,95 C 20,110 20,132 20.5,147.5 C 20.5,148.5 21,149 22,149 L 75.5,149 " +
		"C 77.5,149 79,147.5 79,145 C 79.5,130 80,110 79,95 C 69,93 50,92 21,95 Z",
	crownCuspSlopes: [] as const,
	crownSpecularRidges: [
		{ id: "incisal_bevel", d: "M 22.0,147.5 L 75.5,147.5" },
		{ id: "mesial_mamelon", d: "M 36.0,96.0 C 36.0,112.0 35.5,130.0 35.0,146.0" },
		{ id: "center_mamelon", d: "M 50.0,95.0 C 50.0,112.0 50.0,130.0 50.0,146.0" },
		{ id: "distal_mamelon", d: "M 64.0,96.0 C 64.0,112.0 64.5,130.0 65.0,144.0" },
	],
	crownEquatorHighlight: "M 24,118 C 38,115 62,115 76,118",
} as const;
