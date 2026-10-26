/**
 * DENTE Dental CRM — Wheeler Ch. 8 Maxillary Lateral Incisor (Tooth 12) Geometry
 * Anatomical scale: 6.5mm crown width (distinctly narrower than 11: X=26.5..73.5),
 * both angles rounded (distal heavily rounded), distally sloping incisal ridge,
 * marked distal apical curvature of root (apex at 44.0, 18.0), Foramen Caecum.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export const TOOTH12_GEOMETRY = {
	toothId: "12",
	nameRu: "Верхний латеральный резец",
	viewBox: "0 0 100 218",
	// Chisel crown: incisal edge sloping distally, rounded distoincisal angle
	crownMonolithPath:
		"M 26.5,94.0 " +
		"C 25.0,106.0 24.8,118.0 25.5,130.0 " +
		"C 26.0,138.0 27.5,143.5 31.0,145.5 " + // Heavily rounded distoincisal angle
		"C 35.0,146.5 45.0,147.8 55.0,148.5 " + // Distally sloping incisal ridge
		"C 62.0,149.0 68.0,149.2 71.0,149.0 " +
		"C 72.8,148.8 73.5,147.5 73.5,145.5 " + // Rounded mesioincisal angle
		"C 74.0,134.0 74.2,120.0 73.8,108.0 " +
		"C 73.6,101.0 73.6,96.5 73.5,94.0 " +
		"C 65.5,92.0 57.5,91.0 50.0,91.0 " +   // Scalloped CEJ arching toward root
		"C 42.5,91.0 34.5,92.0 26.5,94.0 Z",
	// Single slender root with marked distal apical curvature to the left (apex at X=44.0, Y=18.0)
	rootMonolithPath:
		"M 26.5,94.0 " +
		"C 28.5,78.0 34.0,52.0 39.5,32.0 " +
		"C 41.0,24.0 42.5,18.0 44.0,18.0 " +   // Apical curvature to distal (X=44.0)
		"C 45.8,18.0 47.5,21.0 49.5,28.0 " +
		"C 55.5,50.0 64.5,74.0 73.5,94.0 " +
		"C 65.5,92.0 57.5,91.0 50.0,91.0 " +
		"C 42.5,91.0 34.5,92.0 26.5,94.0 Z",
	cejPath: "M 26.5,94.0 C 34.5,92.0 42.5,91.0 50.0,91.0 C 57.5,91.0 65.5,92.0 73.5,94.0",
	apex: { x: 44.0, y: 18.0 },
	apices: [{ x: 44.0, y: 18.0, r: 8.0 }] as const,
	// Developmental vertical labial depressions
	labialGrooveMesial: "M 62.0,95.0 C 62.0,110.0 62.5,126.0 63.0,142.0",
	labialGrooveDistal: "M 38.0,95.0 C 38.0,110.0 37.5,126.0 37.0,140.0",
	incisalHighlight: "M 30.5,144.5 C 45.0,146.8 58.0,147.8 71.0,147.5",
	// Root developmental groove with distal curvature
	rootSulcus: "M 50.0,89.0 C 48.0,68.0 45.5,44.0 44.0,24.0",
	foramenCaecum: { x: 50.0, y: 104.0, r: 1.2 },
	cervicalShoulderPath:
		"M 26.5,94.0 C 34.5,92.0 42.5,91.0 50.0,91.0 C 57.5,91.0 65.5,92.0 73.5,94.0 " +
		"L 73.0,96.5 C 65.5,94.5 57.5,93.5 50.0,93.5 C 42.5,93.5 34.5,94.5 27.0,96.5 Z",
	compositeFillingPath:
		"M 38.0,93.0 C 42.5,91.5 57.5,91.5 62.0,93.0 C 60.5,98.0 56.5,99.5 50.0,99.5 C 43.5,99.5 39.5,98.0 38.0,93.0 Z",
	zirconiaCrownShell:
		"M 26.5,94 C 25,106 24.8,118 25.5,130 C 26,138 27.5,143.5 31,145.5 C 45,147.8 55,148.5 71,149 " +
		"C 72.8,148.8 73.5,147.5 73.5,145.5 C 74,134 74.2,120 73.8,108 C 73.6,96.5 73.5,94 73.5,94 " +
		"C 65.5,92 50,91 26.5,94 Z",
	crownCuspSlopes: [] as const,
	crownSpecularRidges: [
		{ id: "incisal_bevel", d: "M 30.0,144.0 C 44.0,146.0 58.0,147.0 71.0,147.0" },
		{ id: "mesial_mamelon", d: "M 62.0,95.0 C 62.0,110.0 62.5,126.0 63.0,142.0" },
		{ id: "distal_mamelon", d: "M 38.0,95.0 C 38.0,110.0 37.5,126.0 37.0,140.0" },
	],
	crownEquatorHighlight: "M 28,118 C 38,115 62,115 71,118",
} as const;
