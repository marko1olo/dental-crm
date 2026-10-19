/**
 * DENTE Dental CRM — Monolithic Anatomical Sculpture for Tooth 46 (Lower Right Molar 1)
 * Wheeler's Dental Anatomy (11th Ed., Ch. 12) 2.5D projection (17.5° tilt).
 * All coordinates strictly mapped to SVG ViewBox "0 0 100 170" (Mandate 8b <= 120 lines).
 */

export interface Tooth46CuspDef {
	id: "MB" | "DB" | "D" | "ML" | "DL";
	nameRu: string;
	apex: { x: number; y: number };
	ridgePath: string;
	mesialSlope: string;
	distalSlope: string;
	buccalRidgePath?: string;
	buccalMesialSlope?: string;
	buccalDistalSlope?: string;
}

export const TOOTH46_GEOMETRY = {
	viewBox: "0 0 100 170",
	aspectRatio: "100 / 170",
	crownMonolithPath:
		"M 16,74 C 13,62 11,48 12,38 C 13,28 17,20 22,16 C 25,14 28,11 32,10 C 38,11 44,14 47,14 C 52,13 57,11 62,11 C 68,12 73,15 76,17 C 79,19 82,22 83,24 C 85,29 86,33 86,36 C 87,42 88,48 88,54 C 87,62 86,68 84,74 C 68,79 32,79 16,74 Z",
	rootMonolithPath:
		"M 16,74 C 13,88 12,108 14,124 C 15,134 18,144 23,149 C 26,149 27,143 29,132 C 34,116 43,105 46,100 C 48,97 52,97 54,100 C 57,105 67,116 72,130 C 75,142 77,147 79,147 C 82,147 84,141 85,128 C 87,110 86,88 84,74 Z",
	mesialSulcusLobeWest: "M 16,74 C 13,88 12,108 14,124 C 15,134 18,144 23,149",
	mesialSulcusLobeEast: "M 23,149 C 25,144 26,134 27,122 C 28,106 31,90 33,76",
	mesialLongitudinalGroove: "M 21,78 C 19.5,96 18.5,118 23,145",
	distalLongitudinalGroove: "M 78,80 C 78,100 77,122 76,139",
	cejCurve: "M 16,74 C 36,78 48,79 50,80 C 52,79 64,78 84,74",
	buccalCervicalRidge:
		"M 16,70 C 34,75 50,76 84,70 C 78,74 56,76.5 50,76.5 C 44,76.5 22,74 16,70 Z",
	bifurcationCrotch: { x: 50, y: 96 },
	bifurcationShadowPath:
		"M 42,106 C 46,100 48,96 50,96 C 52,96 54,100 58,106 C 54,103 46,103 42,106 Z",
	mesialApex: { x: 23, y: 149 },
	distalApex: { x: 79, y: 147 },
	occlusalBasinPath:
		"M 26,20 C 34,17 44,18 52,18 C 62,18 70,19 75,22 C 73,26 66,28 58,28 C 50,28 44,30 38,30 C 32,29 27,25 26,20 Z",
	fissures: {
		sulcusCentralis: "M 26,19 C 34,22 43,23 52,22 C 61,22 70,21 78,23",
		sulcusMesiobuccalis: "M 40,22 C 38,28 36.5,35 36,46",
		sulcusDistobuccalis: "M 62,22 C 64,28 68,34 70,44",
		sulcusLingualis: "M 52,22 C 51,18 49,15 48,12",
		buccalForamenCaecum: { x: 36, y: 46 },
		centralFossaPit: { x: 52, y: 22 },
	},
	cusps: [
		{
			id: "MB",
			nameRu: "Мезиально-щечный",
			apex: { x: 24, y: 18 },
			ridgePath: "M 24,18 C 28,19 33,20.5 38,22",
			mesialSlope: "M 24,18 C 20,16 16,18 14,24 C 18,25 22,24 24,18 Z",
			distalSlope:
				"M 24,18 C 28,19 33,20.5 38,22 C 37,28 35,32 32,28 C 28,24 25,20 24,18 Z",
			buccalRidgePath: "M 24,18 C 24,30 23,45 22,62",
			buccalMesialSlope:
				"M 24,18 C 19,19 14,23 12,38 C 11,48 13,58 16,68 C 19,65 21,63 22,62 C 23,45 24,30 24,18 Z",
			buccalDistalSlope:
				"M 24,18 C 24,30 23,45 22,62 C 27,60 31,56 36,52 C 36,46 36.5,35 38,28 C 39,25 40,22 40,22 C 34,20 29,19 24,18 Z",
		},
		{
			id: "DB",
			nameRu: "Дистально-щечный",
			apex: { x: 50, y: 18 },
			ridgePath: "M 50,18 C 50,19.5 51,21 52,22",
			mesialSlope: "M 50,18 C 45,19 40,21 38,22 C 37,26 42,24 50,18 Z",
			distalSlope: "M 50,18 C 53,19 58,21 62,22 C 61,26 56,24 50,18 Z",
			buccalRidgePath: "M 50,18 C 50,30 49,45 49,62",
			buccalMesialSlope:
				"M 40,22 C 39,25 38,28 36.5,35 C 36,46 36,52 36,52 C 40,56 44,60 49,62 C 49,45 50,30 50,18 C 46,19 43,21 40,22 Z",
			buccalDistalSlope:
				"M 50,18 C 50,30 49,45 49,62 C 56,58 64,52 70,44 C 68,34 64,28 62,22 C 58,20 54,19 50,18 Z",
		},
		{
			id: "D",
			nameRu: "Дистальный",
			apex: { x: 74, y: 22 },
			ridgePath: "M 74,22 C 70,22 66,22 62,22",
			mesialSlope: "M 74,22 C 70,22 66,22 62,22 C 63,26 68,26 74,22 Z",
			distalSlope: "M 74,22 C 78,21 82,24 84,28 C 80,28 76,26 74,22 Z",
			buccalRidgePath: "M 74,22 C 75,32 76,44 76,58",
			buccalMesialSlope:
				"M 62,22 C 64,28 68,34 70,44 C 71,49 73,54 76,58 C 76,44 75,32 74,22 C 70,22 66,22 62,22 Z",
			buccalDistalSlope:
				"M 74,22 C 80,24 84,28 86,36 C 87,44 86,52 84,66 C 81,64 78,61 76,58 C 76,44 75,32 74,22 Z",
		},
		{
			id: "ML",
			nameRu: "Мезиально-язычный",
			apex: { x: 30, y: 11 },
			ridgePath: "M 30,11 C 33,14 36,17 38,20",
			mesialSlope: "M 30,11 C 26,12 22,15 20,18 C 25,18 28,15 30,11 Z",
			distalSlope:
				"M 30,11 C 33,14 36,17 38,20 C 43,18 46,15 48,12 C 40,11 34,11 30,11 Z",
		},
		{
			id: "DL",
			nameRu: "Дистально-язычный",
			apex: { x: 62, y: 12 },
			ridgePath: "M 62,12 C 59,15 56,18 53,21",
			mesialSlope:
				"M 62,12 C 57,12 52,12 48,12 C 50,16 52,19 53,21 C 56,18 59,15 62,12 Z",
			distalSlope: "M 62,12 C 66,13 71,16 74,20 C 70,20 66,17 62,12 Z",
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
