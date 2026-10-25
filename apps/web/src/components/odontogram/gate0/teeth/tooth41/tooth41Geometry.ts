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
	// Slender root with pronounced natural distal tilt to the left (apex at 45.0, 144.0)
	rootMonolithPath:
		"M 32.0,69.5 " +
		"C 33.5,88.0 36.5,112.0 40.5,130.0 " +
		"C 42.0,138.0 43.5,142.5 45.0,144.0 " +
		"C 47.0,143.5 49.5,139.0 52.5,130.0 " +
		"C 57.0,112.0 63.0,88.0 68.0,69.5 " +
		"C 62.0,72.0 56.0,73.0 50.0,73.0 " +
		"C 44.0,73.0 38.0,72.0 32.0,69.5 Z",
	cejPath: "M 32.0,69.5 C 38.0,72.0 44.0,73.0 50.0,73.0 C 56.0,73.0 62.0,72.0 68.0,69.5",
	apex: { x: 45.0, y: 144.0 },
	apices: [{ x: 45.0, y: 144.0, r: 8.5 }] as const,
	// Symmetrical developmental labial grooves
	labialGrooveMesial: "M 42.0,23.0 C 42.0,36.0 42.0,49.0 43.0,64.0",
	labialGrooveDistal: "M 58.0,23.0 C 58.0,36.0 58.0,49.0 57.0,64.0",
	incisalHighlight: "M 35.5,22.0 L 64.5,22.0",
	// Central root developmental depression with distal tilt
	rootSulcus: "M 50.0,75.0 C 49.0,95.0 47.0,116.0 45.2,136.0",
	cervicalShoulderPath:
		"M 32.0,69.5 C 38.0,72.0 44.0,73.0 50.0,73.0 C 56.0,73.0 62.0,72.0 68.0,69.5 " +
		"L 67.5,67.0 C 62.0,69.3 56.0,70.3 50.0,70.3 C 44.0,70.3 38.0,69.3 32.5,67.0 Z",
	compositeFillingPath:
		"M 39.0,71.0 C 43.0,72.5 57.0,72.5 61.0,71.0 C 59.5,66.0 55.5,64.5 50.0,64.5 C 44.5,64.5 40.5,66.0 39.0,71.0 Z",
	zirconiaCrownShell:
		"M 32,69.5 C 31,54 31,38 32.5,23.5 C 33,21.5 34,21 35.5,21 L 64.5,21 " +
		"C 66,21 67,21.5 67.5,23.5 C 69,38 69,54 68,69.5 C 62,72 56,73 50,73 C 44,73 38,72 32,69.5 Z",
	crownCuspSlopes: [] as const,
	crownSpecularRidges: [
		{ id: "incisal_bevel", d: "M 34.5,22.0 L 65.5,22.0" },
		{ id: "mesial_mamelon", d: "M 39.0,24.0 C 39.0,38.0 38.5,50.0 38.0,60.0" },
		{ id: "distal_mamelon", d: "M 61.0,24.0 C 61.0,38.0 61.5,50.0 62.0,60.0" },
	],
	crownEquatorHighlight: "M 34,52 C 41,55 59,55 66,52",
} as const;
