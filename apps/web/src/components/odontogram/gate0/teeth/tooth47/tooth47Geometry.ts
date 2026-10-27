/**
 * DENTE Dental CRM — Wheeler Ch. 11 Mandibular Second Molar (Tooth 47 / FDI 47)
 * Crown & Root Monolith Geometry, CEJ Curvature, and Cruciform Fissure Pattern (+)
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 170" / dynamic with XXL badge.
 */

export const TOOTH47_GEOMETRY = {
	viewBox: "0 0 100 170",
	// Width 74px (X = 13..87). 4 cusps: MB (30, 18), DB (68, 18), ML (33, 11), DL (65, 11)
	crownMonolithPath:
		"M 16,74 " +
		"C 13.5,66 12.5,52 13.0,38 " +
		"C 13.5,28 18.0,18 29,18 " +
		"C 36.0,18.0 43.0,20.0 50,21.8 " +
		"C 57.0,20.0 64.0,18.0 71,18 " +
		"C 82.0,18 86.5,28 87.0,38 " +
		"C 87.5,52 86.5,66 84,74 " +
		"C 80,75.5 68,76.2 50,76.5 " +
		"C 32,76.2 20,75.5 16,74 Z",
	// Path with Class V / Abfraction wedge notch at mesial cervix
	crownMonolithPathWithAbfraction:
		"M 16,74 " +
		"L 16.0,73.5 L 21.0,70.8 L 13.8,67.2 " +
		"C 13.5,66 12.5,52 13.0,38 " +
		"C 13.5,28 18.0,18 29,18 " +
		"C 36.0,18.0 43.0,20.0 50,21.8 " +
		"C 57.0,20.0 64.0,18.0 71,18 " +
		"C 82.0,18 86.5,28 87.0,38 " +
		"C 87.5,52 86.5,66 84,74 " +
		"C 80,75.5 68,76.2 50,76.5 " +
		"C 32,76.2 20,75.5 16,74 Z",
	// Two parallel roots sweeping distally to the left, furcation at Y=104, mesial apex (24, 148), distal apex (58, 147)
	rootMonolithPath:
		"M 16,74 " +
		"C 14.5,88 15.0,110 18.0,126 " +
		"C 19.5,136 21.0,144 24.0,148 " +
		"C 26.5,148 29.0,142 32.0,132 " +
		"C 35.0,118 41.0,108 47.0,104 " +
		"C 49.0,110 51.5,122 54.0,134 " +
		"C 55.5,142 56.5,147 58.0,147 " +
		"C 61.5,147 64.5,138 68.0,126 " +
		"C 75.0,110 82.0,88 84,74 " +
		"C 80,75.5 68,76.2 50,76.5 " +
		"C 32,76.2 20,75.5 16,74 Z",
	cejPath: "M 16,74 C 28,76 38,76.5 50,76.5 C 62,76.5 72,76 84,74",
	cejCurve: "M 16,74 C 28,76 38,76.5 50,76.5 C 62,76.5 72,76 84,74",
	mesialApex: { x: 24, y: 148 },
	distalApex: { x: 58, y: 147 },
	furcationApex: { x: 47, y: 104 },
	apices: [
		{ x: 24.0, y: 148.0, r: 8.5 },
		{ x: 58.0, y: 147.0, r: 8.5 },
	] as const,
	cervicalShoulderPath:
		"M 16,74 C 28,76 38,76.5 50,76.5 C 62,76.5 72,76 84,74 L 83.5,71.5 C 72,73.5 62,74.0 50,74.0 C 38,74.0 28,73.5 16.5,71.5 Z",
	compositeFillingPath:
		"M 26,22 C 34,20 44,20 50,21 C 56,20 66,20 74,22 C 72,26 62,27 50,27 C 38,27 28,26 26,22 Z",
	// Parallel root longitudinal sulci sweeping distally
	mesialLongitudinalGroove: "M 25,80 C 23,98 22,122 24,144",
	distalLongitudinalGroove: "M 71,80 C 69,98 63,122 58,143",
	// Furcation ambient occlusion shadow
	bifurcationShadowPath:
		"M 41,112 C 45,105 47,104 47,104 C 47,104 49,105 53,112 C 50,109 44,109 41,112 Z",
	// Buccal cervical ridge bulge above CEJ
	buccalCervicalRidge:
		"M 16,74 C 20,68 35,62.5 50,62.5 C 65,62.5 80,68 84,74 C 70,72 30,72 16,74 Z",
	cervicalRidgeHighlight: "M 17,72 C 22,66.5 35,63.5 50,63.5 C 65,63.5 78,67.5 83,72",
	// Organic offset fissure pattern (non-cruciform, natural Wheeler curvature)
	fissuresCruciform: [
		{ id: "sulcus-centralis", d: "M 25,21.5 C 33,22.6 42,23.2 50,22.4 C 58,21.6 66,22.2 75,22.0" },
		{ id: "sulcus-buccalis", d: "M 44,22.8 C 43,26.5 42,30.5 41,34.0" },
		{ id: "sulcus-lingualis", d: "M 53,22.2 C 53.5,18.5 54,15.5 54,12.5" },
		{ id: "fossa-triangularis-mesialis", d: "M 25,21.5 C 22,20 20,21.5 18,23 M 25,21.5 C 22,23 20,24.5 19,26" },
		{ id: "fossa-triangularis-distalis", d: "M 75,22.0 C 78,20.5 80,21.5 82,23 M 75,22.0 C 78,23.5 80,24.5 81,26" },
	],
	// Sculpted CAD/CAM zirconia crown shell with 4 distinct cusp tips
	zirconiaCrownShell:
		"M 16,74 C 13.5,66 12.5,52 13,38 C 13.5,28 17,18 23,16 C 26,13 28,10 32,10 " +
		"C 37,11 42,14 47,15 C 52,14 57,11 63,10.5 C 68,11 71,13 75,16.5 " +
		"C 81,18 85.5,28 86,38 C 86.5,52 85.5,66 84,74 C 68,76.2 32,76.2 16,74 Z",
	foramenCaecum: { cx: 50.0, cy: 45.5, r: 0.9 },
	crownCuspSlopes: [
		{ id: "mb-m", d: "M 23,16 C 18,18 15,21 14,24 C 18,25 22,23 25,21 Z", type: "highlight" as const },
		{ id: "mb-d", d: "M 23,16 C 27,18.5 32,20.5 38,22 C 36,25.5 32,27 28,25.5 C 25,23 23.5,19 23,16 Z", type: "shadow" as const },
		{ id: "ml-m", d: "M 32,10 C 26,12 22,14 21,16 C 24,18 28,19 32,20 Z", type: "highlight" as const },
		{ id: "ml-d", d: "M 32,10 C 35,13.5 39,17.5 43,21 C 45,18.5 47,15 48,12 C 43,11 38,10 32,10 Z", type: "shadow" as const },
		{ id: "db-m", d: "M 48,22 C 54,20.5 61,19 69,17.5 C 66,21 63,23 57,24 C 53,23.5 50,23 48,22 Z", type: "highlight" as const },
		{ id: "db-d", d: "M 74,17 C 78,18.5 82,21 84,24 C 79,25 75,24.5 71,23 C 72,21 73,19 74,17 Z", type: "shadow" as const },
		{ id: "dl-m", d: "M 63,10.5 C 58,11.5 54,12.5 50,13.5 C 52,17 54,19 55,22 C 59,18 61,14 63,10.5 Z", type: "highlight" as const },
		{ id: "dl-d", d: "M 63,10.5 C 67,11.5 71,13 74,14 C 72,17 70,20 68,22 C 66,18 64,14 63,10.5 Z", type: "shadow" as const },
	],
	crownSpecularRidges: [
		{ id: "mb", d: "M 22,16.5 C 27,18.5 32,20.2 38,21.8" },
		{ id: "ml", d: "M 31,10.5 C 34,14 38,18 42,21.5" },
		{ id: "db", d: "M 53,22 C 59,20.5 66,19 72,17.5" },
		{ id: "dl", d: "M 62,11 C 59,14 56,17.5 53,21.5" },
	],
	crownEquatorHighlight: "M 19,52 C 34,56 66,56 81,52",
	postShaft: "M 57.5,52.0 C 58.5,68.0 61.0,92.0 64.5,118.0 L 67.2,118.0 C 63.7,92.0 61.2,68.0 60.2,52.0 Z",
	coreStump: "M 22.0,74.0 C 23.0,60.0 26.0,48.0 30.0,39.0 C 38.0,37.5 44.0,39.5 50.0,39.5 C 56.0,39.5 62.0,37.5 70.0,39.0 C 74.0,48.0 77.0,60.0 78.0,74.0 C 68.0,75.5 50.0,76.5 22.0,74.0 Z",
} as const;
