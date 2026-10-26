/**
 * DENTE Dental CRM — Wheeler Ch. 8 Maxillary Lateral Incisor (Tooth 12) Geometry
 * Anatomical scale: 6.5mm crown width (narrower than 11), distinctly rounded distoincisal angle,
 * characteristic distal apical curvature of root (apex at 54.5, 13.5), Foramen Caecum.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export const TOOTH12_GEOMETRY = {
	toothId: "12",
	nameRu: "Верхний латеральный резец",
	viewBox: "0 0 100 218",
	// Chisel crown: incisal edge sloping distally, rounded distoincisal angle
	crownMonolithPath:
		"M 26.0,95.5 " +
		"C 25.0,110.0 25.0,128.0 26.0,143.5 " +
		"C 26.2,145.0 27.2,145.5 28.5,145.5 " + // Mesioincisal angle
		"L 68.0,146.8 " +                      // Distally sloping incisal ridge
		"C 71.0,147.0 73.5,144.5 73.5,141.0 " + // Distinctly rounded distoincisal angle
		"C 74.0,128.0 74.5,110.0 74.0,95.5 " +
		"C 66.0,93.5 58.0,92.5 50.0,92.5 " +
		"C 42.0,92.5 34.0,93.5 26.0,95.5 Z",
	// Single slender root with marked distal curvature of the apical third (apex at X=54.5, Y=13.5)
	rootMonolithPath:
		"M 26.0,95.5 " +
		"C 28.5,78.0 34.0,52.0 42.0,32.0 " +
		"C 46.0,22.0 51.0,16.0 54.5,13.5 " + // Apical tilt to distal (right)
		"C 56.5,13.5 58.0,16.0 58.5,22.0 " +
		"C 60.5,34.0 66.0,60.0 74.0,95.5 " +
		"C 66.0,93.5 58.0,92.5 50.0,92.5 " +
		"C 42.0,92.5 34.0,93.5 26.0,95.5 Z",
	cejPath: "M 26.0,95.5 C 34.0,93.5 42.0,92.5 50.0,92.5 C 58.0,92.5 66.0,93.5 74.0,95.5",
	apex: { x: 54.5, y: 13.5 },
	apices: [{ x: 54.5, y: 13.5, r: 8.0 }] as const,
	// Developmental vertical labial depressions
	labialGrooveMesial: "M 41.0,96.0 C 41.0,112.0 41.5,128.0 42.0,144.0",
	labialGrooveDistal: "M 59.0,96.0 C 59.0,112.0 58.5,128.0 58.0,144.0",
	incisalHighlight: "M 28.5,144.5 L 67.5,145.8",
	// Root developmental groove with distal curvature
	rootSulcus: "M 50.0,91.5 C 49.5,72.0 51.0,50.0 54.0,22.0",
	foramenCaecum: { x: 50.0, y: 104.0, r: 1.2 },
	cervicalShoulderPath:
		"M 26.0,95.5 C 34.0,93.5 42.0,92.5 50.0,92.5 C 58.0,92.5 66.0,93.5 74.0,95.5 " +
		"L 73.5,98.0 C 66.0,96.0 58.0,95.0 50.0,95.0 C 42.0,95.0 34.0,96.0 26.5,98.0 Z",
	compositeFillingPath:
		"M 38.0,94.5 C 42.5,93.0 57.5,93.0 62.0,94.5 C 60.5,99.5 56.5,101.0 50.0,101.0 C 43.5,101.0 39.5,99.5 38.0,94.5 Z",
	zirconiaCrownShell:
		"M 26,95.5 C 25,110 25,128 26,143.5 C 26.2,145 27.2,145.5 28.5,145.5 L 68,146.8 " +
		"C 71,147 73.5,144.5 73.5,141 C 74,128 74.5,110 74,95.5 C 66,93.5 50,92.5 26,95.5 Z",
	crownCuspSlopes: [] as const,
	crownSpecularRidges: [
		{ id: "incisal_bevel", d: "M 28.0,144.5 L 67.0,145.5" },
		{ id: "mesial_mamelon", d: "M 38.0,96.0 C 38.0,112.0 37.5,128.0 37.0,143.0" },
		{ id: "distal_mamelon", d: "M 62.0,96.0 C 62.0,112.0 62.5,128.0 63.0,142.0" },
	],
	crownEquatorHighlight: "M 28,118 C 38,115 62,115 72,118",
} as const;
