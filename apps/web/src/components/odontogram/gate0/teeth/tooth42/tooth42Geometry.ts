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
	// Developmental vertical labial depressions
	labialGrooveMesial: "M 41.0,23.5 C 41.0,37.0 41.5,51.0 42.5,65.0",
	labialGrooveDistal: "M 59.0,25.0 C 59.0,38.0 58.5,51.0 57.5,65.0",
	incisalHighlight: "M 34.0,22.0 L 66.0,23.8",
	// Root developmental groove with distal curvature
	rootSulcus: "M 50.5,75.0 C 49.0,96.0 46.0,118.0 42.5,137.0",
	cervicalShoulderPath:
		"M 30.0,70.0 C 37.0,72.5 44.0,73.5 50.0,73.5 C 57.0,73.5 64.0,72.5 70.0,70.0 " +
		"L 69.5,67.5 C 63.5,69.8 57.0,70.8 50.0,70.8 C 43.0,70.8 36.5,69.8 30.5,67.5 Z",
	compositeFillingPath:
		"M 38.0,71.5 C 42.5,73.0 57.5,73.0 62.0,71.5 C 60.5,66.5 56.5,65.0 50.0,65.0 C 43.5,65.0 39.5,66.5 38.0,71.5 Z",
} as const;
