/**
 * DENTE Dental CRM — Wheeler Ch. 11 Maxillary First Molar (Tooth 16 / FDI 16)
 * "The King of Occlusion": Rhomboid Crown, Crista Obliqua, Cusp of Carabelli,
 * Trifurcated 3 Divergent Roots (MB, DB, Palatal) & 4 Endodontic Canals.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export { TOOTH16_CUSPS, type Tooth16CuspDef } from "./tooth16CuspGeometry";

export const TOOTH16_PULP_GEOMETRY = {
	pulpChamberPath:
		"M 26,76 C 24,84 24,96 26,104 C 28,110 32,112 36,110 " +
		"C 40,108 44,100 50,100 C 56,100 60,108 64,110 C 68,112 72,108 74,102 " +
		"C 76,94 76,84 74,76 C 64,74 36,74 26,76 Z",
	horns: [
		{ id: "MB", apex: { x: 26, y: 104 } },
		{ id: "ML", apex: { x: 36, y: 110 } },
		{ id: "DB", apex: { x: 64, y: 110 } },
		{ id: "DL", apex: { x: 74, y: 102 } },
	],
	canals: [
		{ id: "MB1", nameRu: "Мезиально-щечный 1", orifice: { x: 34, y: 75.5 }, apex: { x: 21, y: 16 }, centerLine: "M 34,75.5 C 32,56 26,34 21,16", taperedLumen: "M 32.5,75.5 C 30.5,56 24.5,34 20,16 L 22,16 C 26.5,34 35.5,56 35.5,75.5 Z" },
		{ id: "MB2", nameRu: "Мезиально-щечный 2", orifice: { x: 38, y: 75.5 }, apex: { x: 24, y: 22 }, centerLine: "M 38,75.5 C 36,56 30,38 24,22", taperedLumen: "M 37,75.5 C 35,56 29,38 23,22 L 25,22 C 31,38 37,56 39,75.5 Z" },
		{ id: "P", nameRu: "Нёбный (Palatal)", orifice: { x: 50, y: 75.5 }, apex: { x: 50, y: 10 }, centerLine: "M 50,75.5 C 50.5,54 49.5,28 50,10", taperedLumen: "M 48,75.5 C 48.5,54 48,28 49,10 L 51,10 C 51.5,28 51.5,54 52,75.5 Z" },
		{ id: "DB", nameRu: "Дистально-щечный", orifice: { x: 64, y: 75.5 }, apex: { x: 78.5, y: 18 }, centerLine: "M 64,75.5 C 68,56 74,36 78.5,18", taperedLumen: "M 62.5,75.5 C 66.5,56 72.5,36 77.5,18 L 79.5,18 C 75.5,36 69.5,56 65.5,75.5 Z" },
	],
} as const;

export const TOOTH16_GEOMETRY = {
	viewBox: "0 0 100 218",
	cejCurve: "M 14,74 C 34,71 66,71 86,74",
	crownMonolithPath:
		"M 14,74 C 11.5,88 11.0,110 13.0,126 C 14.5,134 17.0,140 21.0,145 " +
		"C 25.0,149 30.0,152 36.0,153 C 44.0,154 48.0,150 56.0,148 " +
		"C 64.0,149.5 70.0,149 74.0,147 C 80.0,144 84.5,137 86.5,128 " +
		"C 88.0,112 87.5,90 86.0,74 C 66.0,71 34.0,71 14.0,74 Z",
	crownMonolithPathWithAbfraction:
		"M 14,74 L 14,75.5 L 18.5,78.5 L 12.2,81.5 C 11.5,88 11.0,110 13.0,126 " +
		"C 14.5,134 17.0,140 21.0,145 C 25.0,149 30.0,152 36.0,153 " +
		"C 44.0,154 48.0,150 56.0,148 C 64.0,149.5 70.0,149 74.0,147 " +
		"C 80.0,144 84.5,137 86.5,128 C 88.0,112 87.5,90 86.0,74 C 66.0,71 34.0,71 14.0,74 Z",
	carabelliCuspPath: "M 13,116 C 10.5,124 11.5,134 16,139 C 20,142 25,141 28,137 C 23,135 18,129 16.5,122 Z",
	carabelliGroove: "M 13.5,118 C 17,126 21.5,133 27,136",
	rootMonolithPath:
		"M 14,74 C 11.5,58 12.0,36 15.5,24 C 17.0,19 18.5,16 21.0,16 " +
		"C 22.5,16 24.5,17 25.5,19.5 C 28.0,29 32.0,41 36.0,46 " +
		"C 39.0,42 43.0,24 47.0,10.5 C 48.5,9.5 51.5,9.5 53.0,10.5 " +
		"C 57.0,24 61.0,42 64.0,46 C 67.5,41 71.0,29 74.5,21 " +
		"C 76.0,18.5 77.5,18 78.5,18 C 80.0,18 81.5,19 82.5,21.5 " +
		"C 85.0,32 86.5,54 86.0,74 C 66.0,71 34.0,71 14.0,74 Z",
	palatalRootBody: "M 36,70 C 40,54 44,28 47,10.5 C 48.5,9.5 51.5,9.5 53,10.5 C 56,28 60,54 64,70 Z",
	trifurcationShadowPath: "M 33,52 C 41,45 50,44 50,44 C 50,44 59,45 67,52 C 59,47 41,47 33,52 Z",
	cristaObliquaRidge: "M 34,130 C 44,124 54,120 66,118",
	cristaObliquaShadow: "M 35,132 C 45,126 55,122 67,120",
	centralBasinPath: "M 26,108 C 34,104 46,104 54,106 C 52,114 46,118 38,120 C 30,118 25,112 26,108 Z",
	distalBasinPath: "M 56,118 C 64,114 72,112 78,116 C 76,122 70,126 62,128 C 58,124 56,120 56,118 Z",
	mbApex: { x: 21.0, y: 16.0 },
	palatalApex: { x: 50.0, y: 10.0 },
	dbApex: { x: 78.5, y: 18.0 },
	apices: [
		{ x: 21.0, y: 16.0, r: 8.5 },
		{ x: 50.0, y: 10.0, r: 9.5 },
		{ x: 78.5, y: 18.0, r: 8.5 },
	] as const,
	buccalCervicalRidge: "M 14,74 C 20,80 35,85 50,85 C 65,85 80,80 86,74 C 70,76 30,76 14,74 Z",
	cervicalRidgeHighlight: "M 17,76 C 22,81.5 35,84 50,84 C 65,84 78,80.5 83,76",
	crownEquatorHighlight: "M 17,100 C 34,104 66,104 83,100",
	fissures: {
		centralPit: { x: 42, y: 110 },
		distalPit: { x: 68, y: 120 },
		sulcusCentralis: "M 28,106 C 35,109 42,110 50,108",
		sulcusDistopalatalis: "M 50,108 C 58,113 66,119 72,129",
		sulcusBuccalis: "M 42,110 C 41,98 42,86 43,78",
	},
	compositeFillingPath: "M 28,108 C 36,104 46,104 52,106 C 60,110 68,116 74,122 C 68,124 58,120 50,116 C 40,114 32,112 28,108 Z",
	zirconiaCrownShell:
		"M 14,74 C 11.5,88 11.0,110 13.0,126 C 14.5,134 17.0,140 21.0,145 " +
		"C 25.0,149 30.0,152 36.0,153 C 44.0,154 48.0,150 56.0,148 " +
		"C 64.0,149.5 70.0,149 74.0,147 C 80.0,144 84.5,137 86.5,128 " +
		"C 88.0,112 87.5,90 86.0,74 Z",
} as const;
