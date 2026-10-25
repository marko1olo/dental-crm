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
	// Cruciform (+) fissure pattern dividing occlusal table into 4 quadrants
	fissuresCruciform: [
		{
			// Transverse central groove crossing the occlusal table
			id: "sulcus-centralis",
			d: "M 24,21.0 C 32,21.2 41,21.8 50,22.0 C 59,21.8 68,21.2 76,21.0",
		},
		{
			// Vertical buccal groove ending naturally in occlusal third
			id: "sulcus-buccalis",
			d: "M 50,22.0 C 49.8,26.0 49.8,30.0 50,33.5",
		},
		{
			// Vertical lingual groove extending between ML and DL cusps
			id: "sulcus-lingualis",
			d: "M 50,22.0 C 50,18.0 50,15.0 50,12.0",
		},
		{
			// Mesial triangular fossa
			id: "fossa-triangularis-mesialis",
			d: "M 24,21.0 C 21,19.5 19,21.5 17,23.5 M 24,21.0 C 21,23.0 19,25.0 18,27.0",
		},
		{
			// Distal triangular fossa
			id: "fossa-triangularis-distalis",
			d: "M 76,21.0 C 79,19.5 81,21.5 83,23.5 M 76,21.0 C 79,23.0 81,25.0 82,27.0",
		},
	],
	// Sculpted CAD/CAM zirconia crown shell with 4 distinct cusp tips
	zirconiaCrownShell:
		"M 16,74 C 13.5,66 12.5,52 13,38 C 13.5,28 17,18 23,16 C 26,13 28,10 32,10 " +
		"C 37,11 42,14 47,15 C 52,14 57,11 63,10.5 C 68,11 71,13 75,16.5 " +
		"C 81,18 85.5,28 86,38 C 86.5,52 85.5,66 84,74 C 68,76.2 32,76.2 16,74 Z",
	foramenCaecum: { cx: 50.0, cy: 45.5, r: 0.9 },
	crownCuspSlopes: [
		{ id: "mb-m", d: "M 23,16 C 18,18 15,21 14,24 C 18,25 22,23 25,21 Z", type: "highlight" as const },
		{ id: "mb-d", d: "M 23,16 C 27,18 32,20 37,21.5 C 35,26 31,28 27,26 Z", type: "shadow" as const },
		{ id: "ml-m", d: "M 32,10 C 26,12 22,14 21,16 C 24,18 28,19 32,20 Z", type: "highlight" as const },
		{ id: "ml-d", d: "M 32,10 C 35,14 39,18 42,21.5 C 44,18 46,14 47,12 Z", type: "shadow" as const },
		{ id: "db-m", d: "M 50,22 C 55,20 62,18 70,17 C 67,21 64,23 58,24 Z", type: "highlight" as const },
		{ id: "db-d", d: "M 75,16.5 C 79,18 82,21 84,24 C 79,25 75,25 71,23 Z", type: "shadow" as const },
		{ id: "dl-m", d: "M 63,10.5 C 58,11 54,12 50,13 C 52,17 54,19 55,22 Z", type: "highlight" as const },
		{ id: "dl-d", d: "M 63,10.5 C 67,11 71,13 74,14 C 72,17 70,20 68,22 Z", type: "shadow" as const },
	],
	crownSpecularRidges: [
		{ id: "mb", d: "M 21,17 C 26,18.5 31,20 37,21.5" },
		{ id: "ml", d: "M 30,10.5 C 33,14 37,18 40,21.5" },
		{ id: "db", d: "M 54,22 C 60,20 67,18 73,17" },
		{ id: "dl", d: "M 62,11 C 59,14 56,18 53,21.5" },
	],
	crownEquatorHighlight: "M 19,52 C 34,56 66,56 81,52",
} as const;
