/**
 * DENTE Dental CRM — Wheeler Ch. 11 Maxillary First Molar (Tooth 16 / FDI 16)
 * "The King of Occlusion": Rhomboid Crown, Crista Obliqua, Cusp of Carabelli,
 * Trifurcated 3 Divergent Roots (MB, DB, Palatal) & 4 Endodontic Canals.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export { TOOTH16_CUSPS, type Tooth16CuspDef } from "./tooth16CuspGeometry";

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
		{ id: "MB1", nameRu: "Мезиально-щечный 1", orifice: { x: 34, y: 98.5 }, apex: { x: 22, y: 16 }, centerLine: "M 34,98.5 C 32,74 26,44 22,16", taperedLumen: "M 32.5,98.5 C 30.5,74 24.5,44 21,16 L 23,16 C 27.5,44 35.5,74 35.5,98.5 Z" },
		{ id: "MB2", nameRu: "Мезиально-щечный 2", orifice: { x: 38, y: 98.5 }, apex: { x: 25, y: 22 }, centerLine: "M 38,98.5 C 36,72 30,46 25,22", taperedLumen: "M 37,98.5 C 35,72 29,46 24,22 L 26,22 C 31,46 37,72 39,98.5 Z" },
		{ id: "P", nameRu: "Нёбный (Palatal)", orifice: { x: 50, y: 98.5 }, apex: { x: 50, y: 8 }, centerLine: "M 50,98.5 C 50.5,68 49.5,36 50,8", taperedLumen: "M 48,98.5 C 48.5,68 48,36 49,8 L 51,8 C 51.5,36 51.5,68 52,98.5 Z" },
		{ id: "DB", nameRu: "Дистально-щечный", orifice: { x: 64, y: 98.5 }, apex: { x: 78, y: 20 }, centerLine: "M 64,98.5 C 68,74 74,46 78,20", taperedLumen: "M 62.5,98.5 C 66.5,74 72.5,46 77,20 L 79,20 C 75.5,46 69.5,74 65.5,98.5 Z" },
	],
} as const;

export const TOOTH16_GEOMETRY = {
	viewBox: "0 0 100 218",
	cejCurve: "M 14,96 C 34,93 66,93 86,96",
	crownMonolithPath:
		"M 14,96 C 11.5,108 11.0,122 13.0,132 C 14.5,138 17.0,143 21.0,147 " +
		"C 24.0,149.5 28.0,152 34.0,154 C 42.0,154.5 48.0,150.5 56.0,149 " +
		"C 64.0,150.5 70.0,150 74.0,148 C 80.0,145 84.5,138 86.5,130 " +
		"C 88.0,120 87.5,108 86.0,96 C 66.0,93 34.0,93 14.0,96 Z",
	crownMonolithPathWithAbfraction:
		"M 14,96 L 14,97.5 L 18.5,100.5 L 12.2,103.5 C 11.5,108 11.0,122 13.0,132 " +
		"C 14.5,138 17.0,143 21.0,147 C 24.0,149.5 28.0,152 34.0,154 " +
		"C 42.0,154.5 48.0,150.5 56.0,149 C 64.0,150.5 70.0,150 74.0,148 " +
		"C 80.0,145 84.5,138 86.5,130 C 88.0,120 87.5,108 86.0,96 C 66.0,93 34.0,93 14.0,96 Z",
	carabelliCuspPath: "M 14,128 C 11.5,134 13.0,141 17.5,145 C 22.0,147.5 27.0,146 29.5,142 C 24.5,140.5 20.0,135.5 18.5,129.5 Z",
	carabelliGroove: "M 15.5,128.5 C 18.5,135 23.0,141.5 28.5,143",
	rootMonolithPath:
		"M 14,96 C 12,80 12,56 15,38 C 16.5,26 18.5,18 22,16 " +
		"C 23.5,15.2 25.5,16.2 26.5,19 C 28.5,30 31,48 36,66 " +
		"C 39,50 43,24 47,8 C 48.5,6.5 51.5,6.5 53,8 " +
		"C 57,24 61,50 64,68 C 68,52 72,34 75.5,21.5 " +
		"C 76.8,19.5 79.2,19.5 80.5,22 C 83.5,32 85.5,56 86.5,74 " +
		"C 87,84 86.5,92 86,96 C 66,93 34,93 14,96 Z",
	palatalRootBody: "M 38,70 C 42,48 45,24 48,8 C 49.5,6.5 51.5,6.5 52,8 C 55,24 58,48 62,70 Z",
	trifurcationShadowPath: "M 34,74 C 42,66 50,64 50,64 C 50,64 58,66 66,74 C 58,70 42,70 34,74 Z",
	cristaObliquaRidge: "M 36,138 C 46,133 56,129 68,126",
	cristaObliquaShadow: "M 37,140 C 47,135 57,131 69,128",
	centralBasinPath: "M 28,120 C 36,116 46,116 54,118 C 52,126 46,130 38,132 C 30,130 26,124 28,120 Z",
	distalBasinPath: "M 56,132 C 64,128 72,126 78,130 C 76,136 70,140 62,142 C 58,138 56,134 56,132 Z",
	mbApex: { x: 22, y: 16 },
	palatalApex: { x: 50, y: 8 },
	dbApex: { x: 78, y: 20 },
	apices: [
		{ x: 22.0, y: 16.0, r: 8.5 },
		{ x: 50.0, y: 8.0, r: 9.5 },
		{ x: 78.0, y: 20.0, r: 8.5 },
	] as const,
	buccalCervicalRidge: "M 14,96 C 20,102 35,107 50,107 C 65,107 80,102 86,96 C 70,98 30,98 14,96 Z",
	cervicalRidgeHighlight: "M 17,98 C 22,103.5 35,106 50,106 C 65,106 78,102.5 83,98",
	crownEquatorHighlight: "M 17,122 C 34,126 66,126 83,122",
	fissures: {
		centralPit: { x: 42, y: 124 },
		distalPit: { x: 68, y: 134 },
		sulcusCentralis: "M 28,120 C 35,123 42,124 50,122",
		sulcusDistopalatalis: "M 50,122 C 58,127 66,133 72,143",
		sulcusBuccalis: "M 42,124 C 41,114 42,105 43,99",
	},
	compositeFillingPath: "M 28,122 C 36,118 46,118 52,120 C 60,124 68,130 74,136 C 68,138 58,134 50,130 C 40,128 32,126 28,122 Z",
	zirconiaCrownShell:
		"M 14,96 C 11.5,108 11.0,122 13.0,132 C 14.5,138 17.0,143 21.0,147 " +
		"C 24.0,149.5 28.0,152 34.0,154 C 42.0,154.5 48.0,150.5 56.0,149 " +
		"C 64.0,150.5 70.0,150 74.0,148 C 80.0,145 84.5,138 86.5,130 " +
		"C 88.0,120 87.5,108 86.0,96 Z",
} as const;
