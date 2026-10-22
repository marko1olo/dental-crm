/**
 * Anatomical Constants and Reference Geometry for Tooth 46 (Lower Right First Molar)
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

import { TOOTH46_CUSPS } from "./tooth46CuspGeometry";

export type { Tooth46CuspDef } from "./tooth46CuspGeometry";

export const TOOTH46_GEOMETRY = {
	viewBox: "0 0 100 170",
	crownMonolithPath:
		"M 16,74 " +
		"C 13,66 12,48 14,24 " +
		"C 15.5,19 19.5,16.5 24,18 " +
		"C 27.5,19.2 32.5,20.5 38,22 " +
		"C 42.5,19 46.5,17 50,18 " +
		"C 53.5,19 57.5,20.8 62,22 " +
		"C 66,22 70,22 74,22 " +
		"C 77.5,21.5 81.5,24 83.5,27.5 " +
		"C 86,45 85,66 84,74 " +
		"C 80,75.5 68,76.2 50,76.5 " +
		"C 32,76.2 20,75.5 16,74 Z",
	rootMonolithPath:
		"M 16,74 " +
		"C 13,88 12,108 14,124 " +
		"C 15,134 18,144 23,149 " +
		"C 26,149 27,143 29,132 " +
		"C 34,116 43,105 46,100 " +
		"C 48,97 52,97 54,100 " +
		"C 57,105 67,116 72,130 " +
		"C 75,142 77,147 79,147 " +
		"C 82,147 84,141 85,128 " +
		"C 87,110 86,88 84,74 " +
		"C 80,75.5 68,76.2 50,76.5 " +
		"C 32,76.2 20,75.5 16,74 Z",
	cejPath: "M 16,74 C 28,76 38,76.5 50,76.5 C 62,76.5 72,76 84,74",
	cejCurve: "M 16,74 C 28,76 38,76.5 50,76.5 C 62,76.5 72,76 84,74",
	mesialSulcusLobeWest: "M 16,74 C 13,88 12,108 14,124 C 15,134 18,144 23,149",
	mesialLongitudinalGroove: "M 21,78 C 19.5,96 18.5,118 23,145",
	distalLongitudinalGroove: "M 78,80 C 78,100 77,122 76,139",
	bifurcationShadowPath:
		"M 42,106 C 47,98 50,96 50,96 C 50,96 53,98 58,106 C 54,103 46,103 42,106 Z",
	furcationApex: { x: 50, y: 97 },
	bifurcationCrotch: { x: 50, y: 96 },
	mesialApex: { x: 23, y: 149 },
	distalApex: { x: 79, y: 147 },
	buccalCervicalRidge:
		"M 16,74 C 20,68 35,62 50,62 C 65,62 80,68 84,74 C 70,72 30,72 16,74 Z",
	cervicalRidgeHighlight: "M 17,72 C 22,66 35,63 50,63 C 65,63 78,67 83,72",
	cervicalRidgeShadow: "M 16,74 C 20,72 35,71.5 50,71.5 C 65,71.5 80,72 84,74",
	fissures: {
		sulcusCentralis:
			"M 28,20.5 C 33,21.2 38,22 44,22 C 48,22 51,21.8 54,21.8 C 58,21.8 62,22 66,21.8 C 69,21.5 72,21.5 72,21.5",
		sulcusMesiobuccalis: "M 38,19.5 C 38,20.3 38,21.2 38,22",
		sulcusDistobuccalis: "M 62,19.5 C 62,20.3 62,21.2 62,22",
		sulcusLingualis: "M 48,12 C 49,15 50,18 51,21.8",
		fossaTriangularisMesialis:
			"M 38,22 C 34,21 30,20.5 28,20.5 C 25,20 22.5,20 20.5,21.5 M 28,20.5 C 25.5,22 23,24 22,26",
		fossaTriangularisDistalis:
			"M 62,22 C 66,22 69,21.8 72,21.5 C 75,21 78,21.5 80.5,23.5 M 72,21.5 C 74.5,22.8 77,24.5 78.5,26.5",
		buccalPit: { cx: 34, cy: 44, r: 1.0 },
	},
	fissuresY5: [
		{
			id: "central",
			d: "M 28,20.5 C 33,21.2 38,22 44,22 C 48,22 51,21.8 54,21.8 C 58,21.8 62,22 66,21.8 C 69,21.5 72,21.5 72,21.5",
		},
		{
			id: "mesial-fossa",
			d: "M 38,22 C 34,21 30,20.5 28,20.5 C 25,20 22.5,20 20.5,21.5 M 28,20.5 C 25.5,22 23,24 22,26",
		},
		{
			id: "distal-fossa",
			d: "M 62,22 C 66,22 69,21.8 72,21.5 C 75,21 78,21.5 80.5,23.5 M 72,21.5 C 74.5,22.8 77,24.5 78.5,26.5",
		},
		{ id: "buccal-mesial", d: "M 38,19.5 C 38,20.3 38,21.2 38,22" },
		{ id: "buccal-distal", d: "M 62,19.5 C 62,20.3 62,21.2 62,22" },
		{ id: "lingual-groove", d: "M 48,12 C 49,15 50,18 51,21.8" },
	],
	cusps: TOOTH46_CUSPS,
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
