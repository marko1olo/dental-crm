/**
 * DENTE Dental CRM — Wheeler Ch. 10 Mandibular Lateral Incisor (Tooth 42) Geometry
 * Anatomical scale: 5.5mm crown width (2.0x narrower than Molar 46).
 * Chisel-shaped crown (42px width: X=29..71), rounded distoincisal angle,
 * single slender root (Y=145).
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 205".
 */

export const TOOTH42_GEOMETRY = {
	toothId: "42",
	nameRu: "Нижний боковой резец",
	viewBox: "0 0 100 218",
	// Chisel crown: incisal edge slightly sloping distally, rounded distal angle
	crownMonolithPath:
		"M 30.0,70.0 " +
		"C 29.0,54.0 30.0,38.0 31.5,23.5 " +
		"C 31.5,21.5 32.5,21.0 34.0,21.0 " + // Sharp mesioincisal angle
		"L 66.0,22.8 " +                      // Distally sloping incisal ridge
		"C 68.5,23.0 70.0,25.0 69.5,27.5 " + // Distinctly rounded distoincisal angle
		"C 69.0,38.0 70.0,54.0 70.0,70.0 " +
		"C 64.0,72.5 57.0,73.5 50.0,73.5 " +
		"C 43.0,73.5 36.0,72.5 30.0,70.0 Z",
	// Slender single root tapering to apex (Y=145.0) with pronounced distal curve to the left
	rootMonolithPath:
		"M 30.0,70.0 " +
		"C 32.5,88.0 34.5,112.0 37.5,130.0 " +
		"C 39.0,138.0 40.5,143.5 42.0,145.0 " +
		"C 44.5,144.5 47.5,139.0 51.0,130.0 " +
		"C 58.0,112.0 64.5,88.0 70.0,70.0 " +
		"C 64.0,72.5 57.0,73.5 50.0,73.5 " +
		"C 43.0,73.5 36.0,72.5 30.0,70.0 Z",
	cejPath: "M 30.0,70.0 C 37.0,72.5 44.0,73.5 50.0,73.5 C 57.0,73.5 64.0,72.5 70.0,70.0",
	apex: { x: 42.0, y: 145.0 },
	apices: [{ x: 42.0, y: 145.0, r: 8.5 }] as const,
	// Developmental vertical labial depressions (incisal & middle thirds, fading into cervical)
	labialGrooveMesial: "M 41.0,24.0 C 41.0,31.5 41.3,39.0 42.0,47.5",
	labialGrooveDistal: "M 59.0,25.0 C 59.0,32.5 58.7,39.0 58.0,47.5",
	incisalHighlight: "M 34.0,22.0 L 66.0,23.8",
	// Root developmental groove with distal curvature
	rootSulcus: "M 50.5,75.0 C 49.0,96.0 46.0,118.0 42.5,137.0",
	cervicalShoulderPath:
		"M 30.0,70.0 C 37.0,72.5 44.0,73.5 50.0,73.5 C 57.0,73.5 64.0,72.5 70.0,70.0 " +
		"L 69.5,67.5 C 63.5,69.8 57.0,70.8 50.0,70.8 C 43.0,70.8 36.5,69.8 30.5,67.5 Z",
	compositeFillingPath:
		"M 38.0,71.5 C 42.5,73.0 57.5,73.0 62.0,71.5 C 60.5,66.5 56.5,65.0 50.0,65.0 C 43.5,65.0 39.5,66.5 38.0,71.5 Z",
	zirconiaCrownShell:
		"M 30,70 C 29,54 29.5,38 31,23.5 C 31.5,21.5 33,21 34.5,21 L 65.5,22.8 " +
		"C 68,23 69.5,25 69.5,27.5 C 69,38 69.5,54 70,70 C 64,72.5 57,73.5 50,73.5 C 43,73.5 36,72.5 30,70 Z",
	crownCuspSlopes: [] as const,
	crownSpecularRidges: [
		{ id: "incisal_bevel", d: "M 33.5,22.0 L 66.5,23.5" },
		{ id: "mesial_mamelon", d: "M 38.0,24.5 C 38.0,38.0 37.5,50.0 37.0,60.0" },
		{ id: "distal_mamelon", d: "M 62.0,25.5 C 62.0,38.0 62.5,50.0 63.0,60.0" },
	],
	crownEquatorHighlight: "M 31,52 C 40,55 60,55 69,52",
	postShaft: "M 48.9,52.0 L 51.1,52.0 C 51.1,70.0 49.5,92.0 46.7,115.0 L 44.5,115.0 C 47.3,92.0 48.9,70.0 48.9,52.0 Z",
	coreStump: "M 35.0,70.0 C 36.0,58.0 39.0,46.0 42.0,40.0 L 58.0,40.0 C 61.0,46.0 64.0,58.0 65.0,70.0 C 60.0,72.0 55.0,72.5 50.0,72.5 C 45.0,72.5 40.0,72.0 35.0,70.0 Z",
} as const;
