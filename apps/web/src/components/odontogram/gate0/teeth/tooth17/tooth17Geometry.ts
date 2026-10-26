/**
 * DENTE Dental CRM — Wheeler Ch. 11 Maxillary Second Molar (Tooth 17 / FDI 17)
 * Rhomboid Crown (reduced Carabelli-free morphology, DL cusp reduced),
 * 3 Closely Spaced / More Parallel Roots (MB, DB, Palatal) & 4 Endodontic Canals.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export interface Tooth17CuspDef {
	id: "MB" | "ML" | "DB" | "DL";
	nameRu: string;
	apex: { x: number; y: number };
	ridgePath: string;
}

export const TOOTH17_CUSPS: readonly Tooth17CuspDef[] = [
	{ id: "MB", nameRu: "Мезиально-щечный", apex: { x: 28, y: 149 }, ridgePath: "M 28,149 C 34,142 40,136 44,126" },
	{ id: "ML", nameRu: "Мезиально-нёбный", apex: { x: 36, y: 153 }, ridgePath: "M 36,153 C 40,143 45,136 49,128" },
	{ id: "DB", nameRu: "Дистально-щечный", apex: { x: 72, y: 147 }, ridgePath: "M 72,147 C 66,141 61,135 56,130" },
	{ id: "DL", nameRu: "Дистально-нёбный (редуцирован)", apex: { x: 64, y: 144 }, ridgePath: "M 64,144 C 61,139 58,135 57,132" },
] as const;

export const TOOTH17_PULP_GEOMETRY = {
	pulpChamberPath:
		"M 28,99 C 26,107 26,118 28,126 C 30,132 34,134 38,133 " +
		"C 42,131 45,124 50,124 C 55,124 59,131 63,133 C 67,134 70,130 72,125 " +
		"C 74,117 74,107 72,99 C 62,97 38,97 28,99 Z",
	horns: [
		{ id: "MB", apex: { x: 28, y: 126 } },
		{ id: "ML", apex: { x: 38, y: 133 } },
		{ id: "DB", apex: { x: 63, y: 133 } },
		{ id: "DL", apex: { x: 72, y: 125 } },
	],
	canals: [
		{ id: "MB1", nameRu: "Мезиально-щечный 1", orifice: { x: 36, y: 98.5 }, apex: { x: 24, y: 16 }, centerLine: "M 36,98.5 C 34,74 28,44 24,16", taperedLumen: "M 34.5,98.5 C 32.5,74 26.5,44 23,16 L 25,16 C 29,44 35.5,74 37.5,98.5 Z" },
		{ id: "MB2", nameRu: "Мезиально-щечный 2", orifice: { x: 39, y: 98.5 }, apex: { x: 28, y: 24 }, centerLine: "M 39,98.5 C 37,72 32,48 28,24", taperedLumen: "M 38,98.5 C 36,72 31,48 27,24 L 29,24 C 33,48 38,72 40,98.5 Z" },
		{ id: "P", nameRu: "Нёбный (Palatal)", orifice: { x: 50, y: 98.5 }, apex: { x: 50, y: 10 }, centerLine: "M 50,98.5 C 50.5,68 49.5,38 50,10", taperedLumen: "M 48,98.5 C 48.5,68 48,38 49,10 L 51,10 C 51.5,38 51.5,68 52,98.5 Z" },
		{ id: "DB", nameRu: "Дистально-щечный", orifice: { x: 62, y: 98.5 }, apex: { x: 76, y: 18 }, centerLine: "M 62,98.5 C 66,74 72,46 76,18", taperedLumen: "M 60.5,98.5 C 64.5,74 70.5,46 75,18 L 77,18 C 73,46 67.5,74 63.5,98.5 Z" },
	],
} as const;

export const TOOTH17_GEOMETRY = {
	viewBox: "0 0 100 218",
	cejCurve: "M 16,96 C 35,93 65,93 84,96",
	crownMonolithPath:
		"M 16,96 C 13,106 13,121 15,131 C 17,136 20,140 24,144 " +
		"C 28,148 32,151 36,153 C 45,154 53,151 58,149 C 63,151 68,150 73,147 " +
		"C 78,143 82,137 83,127 C 84,117 84,106 84,96 C 65,93 35,93 16,96 Z",
	crownMonolithPathWithAbfraction:
		"M 16,96 L 16,98 L 21,101 L 14,104 C 13,121 15,131 24,144 " +
		"C 32,151 36,153 58,149 C 68,150 73,147 83,127 C 84,117 84,106 84,96 Z",
	rootMonolithPath:
		"M 16,96 C 14,72 17,42 24,16 C 28,16 31,26 33,44 C 36,58 39,70 43,72 " +
		"C 46,50 48,26 50,10 C 52,26 54,50 57,72 C 61,70 64,58 67,44 " +
		"C 69,26 72,18 76,18 C 81,42 82,72 84,96 C 65,93 35,93 16,96 Z",
	palatalRootBody: "M 44,72 C 46,50 48,26 50,10 C 52,26 54,50 56,72 Z",
	trifurcationShadowPath: "M 43,72 C 47,66 50,65 50,65 C 50,65 53,66 57,72 C 54,69 46,69 43,72 Z",
	mbApex: { x: 24, y: 16 },
	palatalApex: { x: 50, y: 10 },
	dbApex: { x: 76, y: 18 },
	apices: [
		{ x: 24.0, y: 16.0, r: 8.0 },
		{ x: 50.0, y: 10.0, r: 8.5 },
		{ x: 76.0, y: 18.0, r: 8.0 },
	] as const,
	centralBasinPath: "M 28,121 C 35,117 44,117 51,119 C 49,127 44,130 37,132 C 30,130 26,125 28,121 Z",
	distalBasinPath: "M 55,131 C 62,128 69,126 74,130 C 73,135 68,139 61,141 C 57,137 55,133 55,131 Z",
	fissures: {
		centralPit: { x: 44, y: 125 },
		distalPit: { x: 65, y: 133 },
		sulcusCentralis: "M 29,121 C 36,124 43,125 50,123",
		sulcusDistopalatalis: "M 50,123 C 57,128 63,133 68,142",
		sulcusBuccalis: "M 44,125 C 43,116 44,106 45,100",
	},
	compositeFillingPath: "M 30,122 C 38,119 46,119 52,121 C 58,125 65,129 70,135 C 65,137 57,133 50,130 C 42,128 34,126 30,122 Z",
	zirconiaCrownShell:
		"M 16,96 C 13,106 13,121 15,131 C 17,136 20,140 24,144 " +
		"C 28,148 32,151 36,153 C 45,154 53,151 58,149 C 63,151 68,150 73,147 " +
		"C 78,143 82,137 83,127 C 84,117 84,106 84,96 Z",
} as const;
