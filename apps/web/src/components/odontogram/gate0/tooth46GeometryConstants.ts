/**
 * DENTE Dental CRM — Monolithic Anatomical Sculpture for Tooth 46 (Lower Right Molar 1)
 * Wheeler's Dental Anatomy (11th Ed., Ch. 12) 2.5D projection (17.5° tilt).
 * All coordinates strictly mapped to SVG ViewBox "0 0 100 160" (Mandate 8b <= 120 lines).
 */

export interface Tooth46CuspDef {
	id: "MB" | "DB" | "D" | "ML" | "DL";
	nameRu: string;
	apex: { x: number; y: number };
	ridgePath: string;
	mesialSlope: string;
	distalSlope: string;
}

export const TOOTH46_GEOMETRY = {
	viewBox: "0 0 100 170",
	aspectRatio: "100 / 170",
	// Sculpted 5-cusp crown perimeter with developmental notches
	crownMonolithPath:
		"M 16,74 C 13,62 11,48 12,38 C 13,28 17,20 22,16 C 25,14 28,11 32,10 " +
		"C 38,11 44,14 47,14 C 52,13 57,11 62,11 C 68,12 73,15 76,17 " +
		"C 79,19 82,22 83,24 C 85,29 86,33 86,36 C 87,42 88,48 88,54 " +
		"C 87,62 86,68 84,74 C 68,79 32,79 16,74 Z",
	// Divergent roots with mesial sulcus longitudinalis & apical distal bow
	rootMonolithPath:
		"M 16,74 C 13,88 12,108 14,124 C 15,134 18,144 23,149 C 26,149 27,143 29,132 " +
		"C 34,116 42,102 50,96 C 58,102 67,116 72,130 C 75,142 77,147 79,147 " +
		"C 82,147 84,141 85,128 C 87,110 86,88 84,74 Z",
	// Deep longitudinal sulcus dividing mesial root into 2 convex columns
	mesialSulcusLobeWest: "M 16,74 C 13,88 12,108 14,124 C 15,134 18,144 23,149",
	mesialSulcusLobeEast: "M 23,149 C 25,144 26,134 27,122 C 28,106 31,90 33,76",
	mesialLongitudinalGroove: "M 21,78 C 19.5,96 18.5,118 23,145",
	distalLongitudinalGroove: "M 78,80 C 78,100 77,122 76,139",
	cejCurve: "M 16,74 C 36,78 48,79 50,80 C 52,79 64,78 84,74",
	buccalCervicalRidge:
		"M 16,70 C 34,75 50,76 84,70 C 78,74 56,76.5 50,76.5 C 44,76.5 22,74 16,70 Z",
	bifurcationCrotch: { x: 50, y: 96 },
	bifurcationShadowPath:
		"M 42,106 C 47,98 50,96 50,96 C 50,96 53,98 58,106 C 54,103 46,103 42,106 Z",
	mesialApex: { x: 23, y: 149 },
	distalApex: { x: 79, y: 147 },
	// True anatomical basin for occlusal central fossa replacing primitive ellipse
	occlusalBasinPath:
		"M 26,20 C 34,17 44,18 52,18 C 62,18 70,19 75,22 C 73,26 66,28 58,28 " +
		"C 50,28 44,30 38,30 C 32,29 27,25 26,20 Z",
	fissures: {
		sulcusCentralis: "M 26,19 C 34,22 43,23 52,22 C 61,22 70,21 78,23",
		sulcusMesiobuccalis: "M 40,22 C 37,28 35,36 36,48",
		sulcusDistobuccalis: "M 62,22 C 64,28 68,34 70,44",
		sulcusLingualis: "M 52,22 C 51,18 49,15 48,12",
		buccalForamenCaecum: { x: 36, y: 48 },
		centralFossaPit: { x: 52, y: 22 },
	},
	cusps: [
		{
			id: "MB",
			nameRu: "Мезиально-щечный",
			apex: { x: 26, y: 23 },
			ridgePath: "M 26,23 C 30,22 35,22 40,22",
			mesialSlope: "M 26,23 C 20,19 17,23 21,27 C 25,29 29,26 26,23 Z",
			distalSlope: "M 26,23 C 28,25 34,25 40,22 C 37,32 32,38 26,36 Z",
		},
		{
			id: "DB",
			nameRu: "Дистально-щечный",
			apex: { x: 52, y: 24 },
			ridgePath: "M 52,24 C 52,23 52,22 52,22",
			mesialSlope: "M 52,24 C 46,23 42,22 44,27 C 47,31 50,29 52,24 Z",
			distalSlope: "M 52,24 C 54,23 58,22 58,27 C 56,33 52,31 52,24 Z",
		},
		{
			id: "D",
			nameRu: "Дистальный",
			apex: { x: 74, y: 27 },
			ridgePath: "M 74,27 C 70,25 66,23 62,22",
			mesialSlope: "M 74,27 C 68,25 64,24 68,31 C 72,33 74,30 74,27 Z",
			distalSlope: "M 74,27 C 78,25 82,24 80,31 C 77,35 74,32 74,27 Z",
		},
		{
			id: "ML",
			nameRu: "Мезиально-язычный",
			apex: { x: 32, y: 10 },
			ridgePath: "M 32,10 C 34,13 36,18 40,22",
			mesialSlope: "M 32,10 C 26,13 24,17 28,19 C 32,21 34,16 32,10 Z",
			distalSlope: "M 32,10 C 36,12 42,14 44,18 C 41,20 37,20 32,10 Z",
		},
		{
			id: "DL",
			nameRu: "Дистально-язычный",
			apex: { x: 62, y: 11 },
			ridgePath: "M 62,11 C 60,14 58,18 52,22",
			mesialSlope: "M 62,11 C 54,13 50,15 52,18 C 55,20 58,17 62,11 Z",
			distalSlope: "M 62,11 C 68,13 72,16 70,19 C 66,21 62,18 62,11 Z",
		},
	] as readonly Tooth46CuspDef[],
	endoCanals: [
		{ id: "MB", nameRu: "Медиально-щечный канал", apex: { x: 23, y: 149 } },
		{ id: "ML", nameRu: "Медиально-язычный канал", apex: { x: 23, y: 149 } },
		{ id: "D", nameRu: "Дистальный канал", apex: { x: 79, y: 147 } },
	],
	periapicalAnchors: [
		{ id: "M", x: 23, y: 149, r: 14 },
		{ id: "D", x: 79, y: 147, r: 14 },
	],
} as const;
