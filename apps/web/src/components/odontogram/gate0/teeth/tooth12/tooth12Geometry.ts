/**
 * DENTE Dental CRM — Wheeler Ch. 8 Maxillary Lateral Incisor (Tooth 12) Geometry
 * Anatomical scale: 6.5mm crown width (more slender, delicate and convex than Central Incisor).
 * Chisel crown (48px width: X=26.0..74.0, Y=70.5..145.0), rounded mesioincisal angle,
 * pronounced sloping rounded distoincisal angle, slender root with distal apical curvature (apex at 55.0, 14.0),
 * and anatomical blind pit (Foramen Caecum).
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export const TOOTH12_GEOMETRY = {
	toothId: "12",
	nameRu: "Верхний боковой резец",
	viewBox: "0 0 100 218",
	// Chisel crown: incisal edge sloping distally, rounded mesial & heavily rounded distal angles
	crownMonolithPath:
		"M 26.0,73.5 " +
		"C 24.5,84.0 24.0,98.0 25.0,114.0 " +
		"C 25.5,124.0 27.0,134.0 30.5,141.0 " + // Distinctly rounded and sloped distoincisal angle
		"C 33.5,144.0 42.0,145.0 50.0,145.0 " + // Incisal ridge
		"C 58.0,145.0 66.0,144.5 71.0,143.5 " +
		"C 72.8,143.0 73.8,141.5 74.0,139.0 " + // Rounded mesioincisal angle
		"C 74.5,125.0 75.0,105.0 74.5,90.0 " +  // Mesial contour
		"C 74.2,84.0 74.0,78.0 74.0,73.5 " +
		"C 66.0,71.5 58.0,70.5 50.0,70.5 " +    // Cervical line
		"C 42.0,70.5 34.0,71.5 26.0,73.5 Z",
	// Slender single root with marked distal apical curvature (apex at 55.0, 14.0)
	rootMonolithPath:
		"M 26.0,73.5 " +
		"C 28.0,58.0 34.0,42.0 42.0,28.0 " +
		"C 46.5,20.0 51.0,15.5 55.0,14.0 " +    // Distal curved apex
		"C 57.0,14.0 59.0,16.5 60.5,20.0 " +
		"C 64.0,28.0 69.5,46.0 72.5,58.0 " +
		"C 73.5,63.0 73.8,68.0 74.0,73.5 " +
		"C 66.0,71.5 58.0,70.5 50.0,70.5 " +
		"C 42.0,70.5 34.0,71.5 26.0,73.5 Z",
	cejPath: "M 26.0,73.5 C 34.0,71.5 42.0,70.5 50.0,70.5 C 58.0,70.5 66.0,71.5 74.0,73.5",
	apex: { x: 55.0, y: 14.0 },
	apices: [{ x: 55.0, y: 14.0, r: 8.0 }] as const,
	// Developmental vertical labial depressions
	labialGrooveMesial: "M 64.0,76.0 C 65.0,96.0 65.0,118.0 64.5,138.0",
	labialGrooveDistal: "M 38.0,76.0 C 37.0,96.0 36.5,118.0 36.0,136.0",
	incisalHighlight: "M 31.0,143.5 C 44.0,144.5 58.0,144.5 71.5,143.0",
	// Foramen Caecum (Anatomical blind pit near cingulum)
	foramenCaecum: "M 50.0,77.5 C 48.5,77.5 47.5,78.5 47.5,80.0 C 47.5,81.5 48.5,82.5 50.0,82.5 C 51.5,82.5 52.5,81.5 52.5,80.0 C 52.5,78.5 51.5,77.5 50.0,77.5 Z",
	// Root developmental groove with distal curvature
	rootSulcus: "M 52.0,68.0 C 53.0,50.0 54.0,32.0 55.0,18.0",
	cervicalShoulderPath:
		"M 26.0,73.5 C 34.0,71.5 42.0,70.5 50.0,70.5 C 58.0,70.5 66.0,71.5 74.0,73.5 " +
		"C 73.5,76.0 66.0,73.5 50.0,72.5 C 34.0,73.5 26.5,76.0 26.0,73.5 Z",
	compositeFillingPath:
		"M 37.0,73.0 C 43.0,71.5 57.0,71.5 63.0,73.0 C 61.5,78.0 57.0,79.5 50.0,79.5 C 43.0,79.5 38.5,78.0 37.0,73.0 Z",
	zirconiaCrownShell:
		"M 26,73.5 C 24.5,84 24,98 25,114 C 25.5,124 27,134 30.5,141 " +
		"C 33.5,144 50,145 71,143.5 C 72.8,143 73.8,141.5 74,139 " +
		"C 74.5,125 75,105 74.5,90 C 74.2,84 74,78 74,73.5 " +
		"C 66,71.5 50,70.5 26,73.5 Z",
	crownCuspSlopes: [] as const,
	crownSpecularRidges: [
		{ id: "incisal_bevel", d: "M 31.0,143.5 C 44.0,144.5 58.0,144.5 71.5,143.0" },
		{ id: "mesial_mamelon", d: "M 64.0,76.0 C 65.0,96.0 65.0,118.0 64.5,138.0" },
		{ id: "distal_mamelon", d: "M 38.0,76.0 C 37.0,96.0 36.5,118.0 36.0,136.0" },
	],
	crownEquatorHighlight: "M 27.0,105.0 C 38.0,102.0 62.0,102.0 73.0,105.0",
} as const;
