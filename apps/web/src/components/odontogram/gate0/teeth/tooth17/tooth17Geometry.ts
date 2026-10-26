/**
 * DENTE Dental CRM — Wheeler Ch. 11 Maxillary Second Molar (Tooth 17 / FDI 17)
 * Rhomboid Crown (Carabelli-free, DL cusp reduced),
 * 3 Closely Spaced / Parallel Roots with Distal Slant & 4 Endodontic Canals.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export { TOOTH17_CUSPS, type Tooth17CuspDef } from "./tooth17CuspGeometry";

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
		"M 16,96 C 13.5,108 13.0,122 15.0,131 C 17.0,137 20.5,142 24.5,146 " +
		"C 28.5,149.5 32.5,152 36.5,153 C 44.5,153.5 50.0,150.0 57.5,149 " +
		"C 63.5,150.0 68.0,149.5 72.5,147 C 77.5,144 81.5,138 83.0,129 " +
		"C 84.5,119 84.0,107 84.0,96 C 65.0,93 35.0,93 16.0,96 Z",
	crownMonolithPathWithAbfraction:
		"M 16,96 L 16,97.5 L 20.5,100.5 L 14.2,103.5 C 13.5,108 13.0,122 15.0,131 " +
		"C 17.0,137 20.5,142 24.5,146 C 28.5,149.5 32.5,152 36.5,153 " +
		"C 44.5,153.5 50.0,150.0 57.5,149 C 63.5,150.0 68.0,149.5 72.5,147 " +
		"C 77.5,144 81.5,138 83.0,129 C 84.5,119 84.0,107 84.0,96 C 65.0,93 35.0,93 16.0,96 Z",
	rootMonolithPath:
		"M 16,96 C 14,80 16,50 24,16 C 25.5,15 27.5,16.5 28.5,20 " +
		"C 31,36 34,54 39,70 C 42,54 45,28 48.5,10 C 49.5,9 51.5,9 52.5,10 " +
		"C 55,28 58,54 61,70 C 65,52 69,34 73.5,20 C 74.8,18 77.2,18 78.5,20 " +
		"C 81,32 82.5,58 83.5,76 C 84.5,84 84,92 84,96 C 65,93 35,93 16,96 Z",
	palatalRootBody: "M 41,70 C 44,48 46,24 48.5,10 C 49.5,9 51.5,9 52.5,10 C 55,24 57,48 60,70 Z",
	trifurcationShadowPath: "M 37,74 C 44,67 50,66 50,66 C 50,66 56,67 63,74 C 57,71 43,71 37,74 Z",
	mbApex: { x: 24, y: 16 },
	palatalApex: { x: 50, y: 10 },
	dbApex: { x: 76, y: 18 },
	apices: [
		{ x: 24.0, y: 16.0, r: 8.0 },
		{ x: 50.0, y: 10.0, r: 8.5 },
		{ x: 76.0, y: 18.0, r: 8.0 },
	] as const,
	buccalCervicalRidge: "M 16,96 C 22,102 36,106 50,106 C 64,106 78,102 84,96 C 68,98 32,98 16,96 Z",
	cervicalRidgeHighlight: "M 18,98 C 24,103 36,105 50,105 C 64,105 76,103 82,98",
	crownEquatorHighlight: "M 18,121 C 34,125 66,125 82,121",
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
		"M 16,96 C 13.5,108 13.0,122 15.0,131 C 17.0,137 20.5,142 24.5,146 " +
		"C 28.5,149.5 32.5,152 36.5,153 C 44.5,153.5 50.0,150.0 57.5,149 " +
		"C 63.5,150.0 68.0,149.5 72.5,147 C 77.5,144 81.5,138 83.0,129 " +
		"C 84.5,119 84.0,107 84.0,96 Z",
} as const;
