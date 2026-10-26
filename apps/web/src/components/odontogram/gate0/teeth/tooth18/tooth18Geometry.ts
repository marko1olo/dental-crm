/**
 * DENTE Dental CRM — Wheeler Ch. 11 Maxillary Third Molar (Tooth 18 / FDI 18)
 * "Wisdom Tooth": Tricuspid Heart-Shaped Crown, Fused Conical Roots with Distal Curve,
 * 3 Convergent Endodontic Canals (MB, P, DB).
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export interface Tooth18CuspDef {
	id: "MB" | "DB" | "Lingual";
	nameRu: string;
	apex: { x: number; y: number };
	ridgePath: string;
}

export const TOOTH18_CUSPS: readonly Tooth18CuspDef[] = [
	{ id: "MB", nameRu: "Мезиально-щечный", apex: { x: 30, y: 148 }, ridgePath: "M 30,148 C 36,141 42,135 46,126" },
	{ id: "DB", nameRu: "Дистально-щечный", apex: { x: 70, y: 146 }, ridgePath: "M 70,146 C 64,140 58,134 54,129" },
	{ id: "Lingual", nameRu: "Слитый нёбный", apex: { x: 48, y: 152 }, ridgePath: "M 48,152 C 48,144 49,136 50,128" },
] as const;

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
		{ id: "MB", nameRu: "Мезиально-щечный", orifice: { x: 38, y: 98.5 }, apex: { x: 36, y: 18 }, centerLine: "M 38,98.5 C 37,74 36,46 36,18", taperedLumen: "M 36.5,98.5 C 35.5,74 34.5,46 35,18 L 37,18 C 37.5,46 38.5,74 39.5,98.5 Z" },
		{ id: "P", nameRu: "Нёбный (Palatal)", orifice: { x: 49, y: 98.5 }, apex: { x: 48, y: 16 }, centerLine: "M 49,98.5 C 49,70 48,42 48,16", taperedLumen: "M 47.5,98.5 C 47.5,70 47,42 47,16 L 49,16 C 50,42 50.5,70 50.5,98.5 Z" },
		{ id: "DB", nameRu: "Дистально-щечный", orifice: { x: 60, y: 98.5 }, apex: { x: 64, y: 20 }, centerLine: "M 60,98.5 C 62,74 63,46 64,20", taperedLumen: "M 58.5,98.5 C 60.5,74 61.5,46 63,20 L 65,20 C 64.5,46 63.5,74 61.5,98.5 Z" },
	],
} as const;

export const TOOTH18_GEOMETRY = {
	viewBox: "0 0 100 218",
	cejCurve: "M 18,96 C 36,93 64,93 82,96",
	crownMonolithPath:
		"M 18,96 C 15,106 15,120 17,130 C 19,135 23,139 28,143 " +
		"C 34,147 40,150 48,152 C 56,150 62,147 68,143 " +
		"C 74,138 78,133 80,126 C 82,116 82,106 82,96 C 64,93 36,93 18,96 Z",
	crownMonolithPathWithAbfraction:
		"M 18,96 L 18,98 L 23,101 L 16,104 C 15,120 17,130 28,143 " +
		"C 40,150 48,152 68,143 C 78,133 80,126 82,96 Z",
	rootMonolithPath:
		"M 18,96 C 18,72 24,42 34,18 C 36,16 38,16 40,18 C 42,26 44,40 46,56 " +
		"C 48,40 50,24 50,16 C 52,16 54,20 56,36 C 58,46 60,56 61,64 " +
		"C 62,48 63,32 65,20 C 67,20 69,24 71,38 C 76,56 80,74 82,96 C 64,93 36,93 18,96 Z",
	fusedConicalRootPath:
		"M 18,96 C 19,74 27,44 35,18 C 37,16 59,16 66,20 " +
		"C 74,44 80,74 82,96 C 64,93 36,93 18,96 Z",
	mbApex: { x: 36, y: 18 },
	palatalApex: { x: 48, y: 16 },
	dbApex: { x: 64, y: 20 },
	apices: [
		{ x: 36.0, y: 18.0, r: 7.5 },
		{ x: 48.0, y: 16.0, r: 8.5 },
		{ x: 64.0, y: 20.0, r: 7.5 },
	] as const,
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
		"M 18,96 C 15,106 15,120 17,130 C 19,135 23,139 28,143 " +
		"C 34,147 40,150 48,152 C 56,150 62,147 68,143 " +
		"C 74,138 78,133 80,126 C 82,116 82,106 82,96 Z",
} as const;
