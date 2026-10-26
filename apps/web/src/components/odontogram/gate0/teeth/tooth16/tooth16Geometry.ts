/**
 * DENTE Dental CRM — Wheeler Ch. 11 Maxillary First Molar (Tooth 16 / FDI 16)
 * "The King of Occlusion": Rhomboid Crown, Crista Obliqua, Cusp of Carabelli,
 * Trifurcated 3 Divergent Roots (MB, DB, Palatal) & 4 Endodontic Canals.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export interface Tooth16CuspDef {
	id: "MB" | "ML" | "DB" | "DL" | "Carabelli";
	nameRu: string;
	apex: { x: number; y: number };
	ridgePath: string;
}

export const TOOTH16_CUSPS: readonly Tooth16CuspDef[] = [
	{ id: "MB", nameRu: "Мезиально-щечный", apex: { x: 26, y: 150 }, ridgePath: "M 26,150 C 32,143 38,136 42,126" },
	{ id: "ML", nameRu: "Мезиально-нёбный", apex: { x: 34, y: 154 }, ridgePath: "M 34,154 C 38,144 44,136 48,128" },
	{ id: "DB", nameRu: "Дистально-щечный", apex: { x: 74, y: 148 }, ridgePath: "M 74,148 C 68,142 62,135 56,130" },
	{ id: "DL", nameRu: "Дистально-нёбный", apex: { x: 66, y: 146 }, ridgePath: "M 66,146 C 63,140 60,135 58,132" },
	{ id: "Carabelli", nameRu: "Бугорок Карабелли", apex: { x: 18, y: 142 }, ridgePath: "M 18,142 C 22,144 26,146 30,147" },
] as const;

export const TOOTH16_PULP_GEOMETRY = {
	pulpChamberPath:
		"M 26,100 C 24,108 24,120 26,128 C 28,134 32,136 36,134 " +
		"C 40,132 44,124 50,124 C 56,124 60,132 64,134 C 68,136 72,132 74,126 " +
		"C 76,118 76,108 74,100 C 64,98 36,98 26,100 Z",
	horns: [
		{ id: "MB", apex: { x: 26, y: 128 } },
		{ id: "ML", apex: { x: 36, y: 134 } },
		{ id: "DB", apex: { x: 64, y: 134 } },
		{ id: "DL", apex: { x: 74, y: 126 } },
	],
	canals: [
		{ id: "MB1", nameRu: "Мезиально-щечный 1", orifice: { x: 34, y: 98.5 }, apex: { x: 18, y: 14 }, centerLine: "M 34,98.5 C 32,74 24,42 18,14", taperedLumen: "M 32.5,98.5 C 30.5,74 22.5,42 17,14 L 19,14 C 25,42 33.5,74 35.5,98.5 Z" },
		{ id: "MB2", nameRu: "Мезиально-щечный 2", orifice: { x: 38, y: 98.5 }, apex: { x: 23, y: 22 }, centerLine: "M 38,98.5 C 36,72 28,46 23,22", taperedLumen: "M 37,98.5 C 35,72 27,46 22,22 L 24,22 C 29,46 37,72 39,98.5 Z" },
		{ id: "P", nameRu: "Нёбный (Palatal)", orifice: { x: 50, y: 98.5 }, apex: { x: 50, y: 8 }, centerLine: "M 50,98.5 C 50.5,68 49.5,36 50,8", taperedLumen: "M 48,98.5 C 48.5,68 48,36 49,8 L 51,8 C 51.5,36 51.5,68 52,98.5 Z" },
		{ id: "DB", nameRu: "Дистально-щечный", orifice: { x: 64, y: 98.5 }, apex: { x: 82, y: 18 }, centerLine: "M 64,98.5 C 68,74 76,46 82,18", taperedLumen: "M 62.5,98.5 C 66.5,74 74.5,46 81,18 L 83,18 C 77,46 69.5,74 65.5,98.5 Z" },
	],
} as const;

export const TOOTH16_GEOMETRY = {
	viewBox: "0 0 100 218",
	cejCurve: "M 14,96 C 34,92 66,92 86,96",
	crownMonolithPath:
		"M 14,96 C 11,106 10,122 12,132 C 14,136 17,140 20,144 " +
		"C 23,148 28,152 34,154 C 44,155 52,152 58,150 C 64,152 72,152 78,148 " +
		"C 84,144 87,138 88,128 C 89,118 88,106 86,96 C 66,92 34,92 14,96 Z",
	crownMonolithPathWithAbfraction:
		"M 14,96 L 14,98 L 19,101 L 12,104 C 10,122 12,132 20,144 " +
		"C 28,152 34,154 58,150 C 72,152 78,148 88,128 C 89,118 88,106 86,96 Z",
	carabelliCuspPath: "M 14,128 C 11,134 12,142 16,146 C 20,149 25,148 28,144 C 23,142 19,136 18,130 Z",
	carabelliGroove: "M 16,128 C 18,135 22,142 27,144",
	rootMonolithPath:
		"M 14,96 C 11,70 12,38 18,14 C 23,14 26,24 29,42 C 32,56 36,66 40,68 " +
		"C 44,46 47,24 50,8 C 53,24 56,46 60,68 C 64,66 68,56 71,42 " +
		"C 74,24 77,18 82,18 C 87,38 88,70 86,96 C 66,92 34,92 14,96 Z",
	palatalRootBody: "M 43,68 C 45,46 47,24 50,8 C 53,24 55,46 57,68 Z",
	trifurcationShadowPath: "M 40,68 C 46,62 50,60 50,60 C 50,60 54,62 60,68 C 55,65 45,65 40,68 Z",
	cristaObliquaRidge: "M 36,138 C 46,133 56,129 66,126",
	cristaObliquaShadow: "M 37,140 C 47,135 57,131 67,128",
	centralBasinPath: "M 26,120 C 34,116 44,116 52,118 C 50,126 44,130 36,132 C 28,130 24,124 26,120 Z",
	distalBasinPath: "M 56,132 C 64,128 72,126 78,130 C 76,136 70,140 62,142 C 58,138 56,134 56,132 Z",
	mbApex: { x: 18, y: 14 },
	palatalApex: { x: 50, y: 8 },
	dbApex: { x: 82, y: 18 },
	apices: [
		{ x: 18.0, y: 14.0, r: 8.5 },
		{ x: 50.0, y: 8.0, r: 9.5 },
		{ x: 82.0, y: 18.0, r: 8.5 },
	] as const,
	fissures: {
		centralPit: { x: 42, y: 124 },
		distalPit: { x: 68, y: 134 },
		sulcusCentralis: "M 26,120 C 34,123 42,124 50,122",
		sulcusDistopalatalis: "M 50,122 C 58,128 66,134 72,144",
		sulcusBuccalis: "M 42,124 C 41,114 42,104 44,98",
	},
	compositeFillingPath: "M 28,122 C 36,118 46,118 52,120 C 60,124 68,130 74,136 C 68,138 58,134 50,130 C 40,128 32,126 28,122 Z",
	zirconiaCrownShell:
		"M 14,96 C 11,106 10,122 12,132 C 14,136 17,140 20,144 " +
		"C 23,148 28,152 34,154 C 44,155 52,152 58,150 C 64,152 72,152 78,148 " +
		"C 84,144 87,138 88,128 C 89,118 88,106 86,96 Z",
} as const;
