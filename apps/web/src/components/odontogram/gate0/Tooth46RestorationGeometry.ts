/**
 * DENTE Dental CRM — Anatomical Restoration Geometry for Tooth 46
 * Light-cured composite filling (Class I) & monolithic multilayer zirconia crown.
 * Wheeler Dental Anatomy clinical morphology (Mandate 8b <= 120 lines).
 */

export const TOOTH46_RESTORATION_GEOMETRY = {
	// Class I Anatomical Composite Filling in occlusal table & triangular fossae
	compositeFilling:
		"M 27,20 " +
		"C 31,18 36,18.5 41,19.5 " +
		"C 45,16.5 49,16 53,16.5 " +
		"C 56,19 60,19.5 64,20 " +
		"C 69,20 74,21 75,22 " +
		"C 74,24 69,25 64,25 " +
		"C 60,25.5 62,28.5 62,30 " +
		"C 59,29 57,26 55,25.5 " +
		"C 50,25.5 45,26 42,26.5 " +
		"C 40,29 38,32 36,32 " +
		"C 35,30 35.5,27 37,25 " +
		"C 33,25 29,23.5 26.5,22 " +
		"C 26,20.8 26.5,20.2 27,20 Z",

	// Composite restoration fissure anatomy (sculpted secondary anatomy)
	compositeSculptedFissures: [
		{ id: "cnt", d: "M 29,21 C 36,22 44,22.5 52,22 C 60,21.5 68,22 72,22.5" },
		{ id: "mb", d: "M 41,22.5 C 39,26 37.5,29 36.5,31.5" },
		{ id: "lng", d: "M 52,22 C 51,19 49,17.5 48.5,17" },
	] as const,

	// Monolithic Multilayer Zirconia Crown Outer Shell
	zirconiaCrownShell:
		"M 16,73 C 13,61 11,47 12,37 C 13,27 17,19 22,15 C 25,13 28,10 32,9 " +
		"C 38,10 44,13 47,13 C 52,12 57,10 62,10 C 68,11 73,14 76,16 " +
		"C 79,18 82,21 83,23 C 85,28 86,32 86,35 C 87,41 88,47 88,53 " +
		"C 87,61 86,67 84,73 C 68,78 32,78 16,73 Z",

	// Zirconia chamfer margin (cervical preparation shoulder above CEJ)
	zirconiaCervicalShoulder:
		"M 16,73 C 34,77 50,78 84,73 C 78,75.5 52,77 50,77 C 48,77 22,75.5 16,73 Z",

	// PFM cervical metal collar margin (subgingival metal line at CEJ)
	pfmMetalCollar: "M 16,73 C 34,77 50,78 84,73 C 81,74.5 50,76 16,73 Z",

	// CAD/CAM milled monolithic occlusal fissures (Dryopithecus Y-5 pattern)
	zirconiaMilledFissures: [
		{
			id: "cnt",
			d: "M 27,21.5 C 36,22.8 45,23.2 52,22.2 C 60,21.8 68,22.4 75,23.2",
		},
		{ id: "mb", d: "M 41,22.8 C 39,27 37,32 36,37" },
		{ id: "db", d: "M 59,22.2 C 61,26.5 62,31 63,36" },
		{ id: "lng", d: "M 52,22.2 C 51,17.5 50,14 49,11.5" },
	] as const,

	// CAD/CAM milled triangular ridges & cusp facets (subtle ceramic micro-relief)
	zirconiaTriangularRidges: [
		{ id: "mb", d: "M 26,22 C 30,21 35,22 41,22.8 C 37,24.5 32,24.2 26,22 Z" },
		{ id: "ml", d: "M 32,10 C 36,13 41,18 43,22 C 38,21 34,17 32,10 Z" },
		{ id: "db", d: "M 52,23 C 54,21 57,21 59,22.2 C 56,23.8 54,23.8 52,23 Z" },
		{ id: "dl", d: "M 62,11 C 61,15 57,19 54,22 C 57,21 60,17 62,11 Z" },
		{ id: "d", d: "M 74,26 C 73,24 71,23 68,22.8 C 70,24.5 72,25.5 74,26 Z" },
	] as const,

	// Mirror-glaze specular highlight reflection along zirconia occlusal table
	zirconiaSpecularHigh: [
		{ id: "ml", cx: 32, cy: 10, rx: 3.5, ry: 1.5, angle: -15 },
		{ id: "dl", cx: 62, cy: 11, rx: 3.0, ry: 1.4, angle: 10 },
		{ id: "mb", cx: 26, cy: 23, rx: 4.0, ry: 1.6, angle: 25 },
		{ id: "db", cx: 52, cy: 24, rx: 3.5, ry: 1.5, angle: 0 },
		{ id: "d", cx: 74, cy: 27, rx: 2.8, ry: 1.2, angle: -20 },
	] as const,
} as const;
