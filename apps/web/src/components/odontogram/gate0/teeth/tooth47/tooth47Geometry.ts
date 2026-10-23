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
	// Two parallel roots, tighter furcation at Y=104, mesial apex (31, 148), distal apex (69, 147)
	rootMonolithPath:
		"M 16,74 " +
		"C 15,88 18,110 22,126 " +
		"C 24,136 27,144 31,148 " +
		"C 34,148 36,142 38,132 " +
		"C 41,118 45,108 50,104 " +
		"C 55,108 59,118 62,132 " +
		"C 64,142 66,147 69,147 " +
		"C 73,147 76,136 78,126 " +
		"C 82,110 85,88 84,74 " +
		"C 80,75.5 68,76.2 50,76.5 " +
		"C 32,76.2 20,75.5 16,74 Z",
	cejPath: "M 16,74 C 28,76 38,76.5 50,76.5 C 62,76.5 72,76 84,74",
	cejCurve: "M 16,74 C 28,76 38,76.5 50,76.5 C 62,76.5 72,76 84,74",
	mesialApex: { x: 31, y: 148 },
	distalApex: { x: 69, y: 147 },
	furcationApex: { x: 50, y: 104 },
	apices: [
		{ x: 38.0, y: 147.0, r: 8.5 },
		{ x: 62.0, y: 147.0, r: 8.5 },
	] as const,
	cervicalShoulderPath:
		"M 16,74 C 28,76 38,76.5 50,76.5 C 62,76.5 72,76 84,74 L 83.5,71.5 C 72,73.5 62,74.0 50,74.0 C 38,74.0 28,73.5 16.5,71.5 Z",
	compositeFillingPath:
		"M 26,22 C 34,20 44,20 50,21 C 56,20 66,20 74,22 C 72,26 62,27 50,27 C 38,27 28,26 26,22 Z",
	// Parallel root longitudinal sulci
	mesialLongitudinalGroove: "M 27,80 C 26,98 27,122 31,144",
	distalLongitudinalGroove: "M 73,80 C 74,98 73,122 69,143",
	// Furcation ambient occlusion shadow
	bifurcationShadowPath:
		"M 44,112 C 48,105 50,104 50,104 C 50,104 52,105 56,112 C 53,109 47,109 44,112 Z",
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
	foramenCaecum: { cx: 50.0, cy: 45.5, r: 0.9 },
} as const;
