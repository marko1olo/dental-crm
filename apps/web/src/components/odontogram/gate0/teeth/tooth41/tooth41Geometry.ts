/**
 * DENTE Dental CRM — Wheeler Ch. 10 Mandibular Central Incisor (Tooth 41) Geometry
 * Anatomical scale: 5.0mm crown width (strictly 2.2x narrower than Molar 46).
 * Symmetrical chisel crown (38px width: X=31..69), flat 90° incisal edge,
 * slender straight single root (Y=144.0).
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 204".
 */

export const TOOTH41_GEOMETRY = {
	toothId: "41",
	nameRu: "Нижний центральный резец",
	viewBox: "0 0 100 218",
	// Symmetrical narrow chisel crown (width 38px, X=31..69)
	crownMonolithPath:
		"M 32.0,69.5 " +
		"C 31.5,54.0 32.0,38.0 33.0,23.0 " +
		"C 33.0,21.5 34.0,21.0 35.5,21.0 " + // Sharp symmetrical mesial angle
		"L 64.5,21.0 " +                      // Symmetrical straight incisal ridge
		"C 66.0,21.0 67.0,21.5 67.0,23.0 " + // Sharp symmetrical distal angle
		"C 68.0,38.0 68.5,54.0 68.0,69.5 " +
		"C 62.0,72.0 56.0,73.0 50.0,73.0 " +
		"C 44.0,73.0 38.0,72.0 32.0,69.5 Z",
	// Slender root with subtle natural distal tilt to apex (Y=144.0)
	rootMonolithPath:
		"M 32.0,69.5 " +
		"C 35.5,88.0 40.0,112.0 43.8,132.0 " +
		"C 45.5,140.0 46.8,143.5 48.2,144.0 " +
		"C 49.6,143.5 51.5,140.0 53.8,132.0 " +
		"C 58.0,112.0 63.5,88.0 68.0,69.5 " +
		"C 62.0,72.0 56.0,73.0 50.0,73.0 " +
		"C 44.0,73.0 38.0,72.0 32.0,69.5 Z",
	cejPath: "M 32.0,69.5 C 38.0,72.0 44.0,73.0 50.0,73.0 C 56.0,73.0 62.0,72.0 68.0,69.5",
	apex: { x: 48.2, y: 144.0 },
	apices: [{ x: 48.2, y: 144.0, r: 8.5 }] as const,
	// Symmetrical developmental labial grooves
	labialGrooveMesial: "M 42.0,23.0 C 42.0,36.0 42.0,49.0 43.0,64.0",
	labialGrooveDistal: "M 58.0,23.0 C 58.0,36.0 58.0,49.0 57.0,64.0",
	incisalHighlight: "M 35.5,22.0 L 64.5,22.0",
	// Central root developmental depression with subtle distal tilt
	rootSulcus: "M 50.0,75.0 C 50.0,95.0 49.5,116.0 48.5,136.0",
	cervicalShoulderPath:
		"M 32.0,69.5 C 38.0,72.0 44.0,73.0 50.0,73.0 C 56.0,73.0 62.0,72.0 68.0,69.5 " +
		"L 67.5,67.0 C 62.0,69.3 56.0,70.3 50.0,70.3 C 44.0,70.3 38.0,69.3 32.5,67.0 Z",
	compositeFillingPath:
		"M 39.0,71.0 C 43.0,72.5 57.0,72.5 61.0,71.0 C 59.5,66.0 55.5,64.5 50.0,64.5 C 44.5,64.5 40.5,66.0 39.0,71.0 Z",
} as const;
