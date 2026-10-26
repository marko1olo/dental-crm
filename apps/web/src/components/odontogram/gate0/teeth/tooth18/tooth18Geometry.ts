/**
 * DENTE Dental CRM — Wheeler Ch. 11 Maxillary Third Molar (Tooth 18 / FDI 18)
 * "Wisdom Tooth": Tricuspid Heart-Shaped Crown, Fused Conical Roots with Distal Sweep,
 * 3 Convergent Endodontic Canals (MB, P, DB).
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export { TOOTH18_CUSPS, type Tooth18CuspDef } from "./tooth18CuspGeometry";

export const TOOTH18_PULP_GEOMETRY = {
	pulpChamberPath:
		"M 30,99 C 28,106 28,116 30,124 C 33,130 38,133 44,132 " +
		"C 48,131 52,131 56,132 C 62,133 67,129 69,124 " +
		"C 71,116 71,106 69,99 C 60,97 40,97 30,99 Z",
	horns: [
		{ id: "MB", apex: { x: 30, y: 124 } },
		{ id: "DB", apex: { x: 69, y: 124 } },
		{ id: "Lingual", apex: { x: 48, y: 132 } },
	],
	canals: [
		{ id: "MB", nameRu: "Мезиально-щечный", orifice: { x: 38, y: 98.5 }, apex: { x: 34, y: 24 }, centerLine: "M 38,98.5 C 37,74 35,46 34,24", taperedLumen: "M 36.5,98.5 C 35.5,74 33.5,46 33,24 L 35,24 C 36.5,46 38.5,74 39.5,98.5 Z" },
		{ id: "P", nameRu: "Нёбный (Palatal)", orifice: { x: 49, y: 98.5 }, apex: { x: 40, y: 24 }, centerLine: "M 49,98.5 C 47,70 43,44 40,24", taperedLumen: "M 47.5,98.5 C 45.5,70 41.5,44 39,24 L 41,24 C 44.5,44 48.5,70 50.5,98.5 Z" },
		{ id: "DB", nameRu: "Дистально-щечный", orifice: { x: 60, y: 98.5 }, apex: { x: 46, y: 25 }, centerLine: "M 60,98.5 C 57,74 51,46 46,25", taperedLumen: "M 58.5,98.5 C 55.5,74 49.5,46 45,25 L 47,25 C 52.5,46 58.5,74 61.5,98.5 Z" },
	],
} as const;

export const TOOTH18_GEOMETRY = {
	viewBox: "0 0 100 218",
	cejCurve: "M 18,96 C 36,93 64,93 82,96",
	crownMonolithPath:
		"M 18,96 C 15.5,107 15.0,121 17.5,130 C 19.5,136 23.5,140 28.5,144 " +
		"C 34.5,148 40.5,151 48.0,152 C 55.5,151 61.5,148 67.5,144 " +
		"C 72.5,140 76.5,135 78.5,127 C 80.5,117 81.0,107 82.0,96 C 64.0,93 36.0,93 18.0,96 Z",
	crownMonolithPathWithAbfraction:
		"M 18,96 L 18,97.5 L 22.5,100.5 L 16.2,103.5 C 15.5,107 15.0,121 17.5,130 " +
		"C 19.5,136 23.5,140 28.5,144 C 34.5,148 40.5,151 48.0,152 " +
		"C 55.5,151 61.5,148 67.5,144 C 72.5,140 76.5,135 78.5,127 C 80.5,117 81.0,107 82.0,96 Z",
	rootMonolithPath:
		"M 18,96 C 18.5,74 23.0,46 34.0,26 C 36.5,23.5 42.0,23.5 45.0,26 " +
		"C 50.0,34 58.0,52 66.0,68 C 72.0,80 77.0,88 82.0,96 C 64.0,93 36.0,93 18.0,96 Z",
	fusedConicalRootPath:
		"M 18,96 C 18.5,74 23.0,46 34.0,26 C 36.5,23.5 42.0,23.5 45.0,26 " +
		"C 50.0,34 58.0,52 66.0,68 C 72.0,80 77.0,88 82.0,96 C 64.0,93 36.0,93 18.0,96 Z",
	mbApex: { x: 34, y: 24 },
	palatalApex: { x: 40, y: 24 },
	dbApex: { x: 46, y: 25 },
	apices: [
		{ x: 34.0, y: 24.0, r: 7.5 },
		{ x: 40.0, y: 24.0, r: 8.5 },
		{ x: 46.0, y: 25.0, r: 7.5 },
	] as const,
	buccalCervicalRidge: "M 18,96 C 24,102 36,105 50,105 C 64,105 76,102 82,96 C 68,98 32,98 18,96 Z",
	cervicalRidgeHighlight: "M 20,98 C 26,103 36,104.5 50,104.5 C 64,104.5 74,103 80,98",
	crownEquatorHighlight: "M 20,120 C 34,124 66,124 80,120",
	centralBasinPath: "M 32,122 C 38,118 46,118 52,120 C 58,124 56,132 50,134 C 42,133 34,129 32,122 Z",
	distalBasinPath: "M 54,126 C 60,123 66,124 70,128 C 68,133 62,136 56,134 C 54,131 53,128 54,126 Z",
	fissures: {
		centralPit: { x: 48, y: 126 },
		sulcusCentralis: "M 32,122 C 40,125 48,126 56,125",
		sulcusBuccalis: "M 48,126 C 47,118 48,108 49,101",
		sulcusDistalis: "M 48,126 C 54,129 62,133 68,138",
	},
	compositeFillingPath: "M 34,123 C 42,120 50,120 58,122 C 64,126 66,131 62,134 C 54,133 42,131 34,123 Z",
	zirconiaCrownShell:
		"M 18,96 C 15.5,107 15.0,121 17.5,130 C 19.5,136 23.5,140 28.5,144 " +
		"C 34.5,148 40.5,151 48.0,152 C 55.5,151 61.5,148 67.5,144 " +
		"C 72.5,140 76.5,135 78.5,127 C 80.5,117 81.0,107 82.0,96 Z",
} as const;
