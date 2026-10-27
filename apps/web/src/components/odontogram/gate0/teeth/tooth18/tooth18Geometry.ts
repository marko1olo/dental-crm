/**
 * DENTE Dental CRM — Wheeler Ch. 11 Maxillary Third Molar (Tooth 18 / FDI 18)
 * "Wisdom Tooth": Tricuspid Heart-Shaped Crown, Fused Conical Roots with Distal Sweep,
 * 3 Convergent Endodontic Canals (MB, P, DB).
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export { TOOTH18_CUSPS, type Tooth18CuspDef } from "./tooth18CuspGeometry";

export const TOOTH18_PULP_GEOMETRY = {
	pulpChamberPath:
		"M 30,76 C 28,83 28,93 30,101 C 33,107 38,110 44,109 " +
		"C 48,108 52,108 56,109 C 62,110 67,106 69,101 " +
		"C 71,93 71,83 69,76 C 60,74 40,74 30,76 Z",
	horns: [
		{ id: "MB", apex: { x: 30, y: 101 } },
		{ id: "DB", apex: { x: 69, y: 101 } },
		{ id: "Lingual", apex: { x: 48, y: 109 } },
	],
	canals: [
		{ id: "MB", nameRu: "Мезиально-щечный", orifice: { x: 38, y: 75.5 }, apex: { x: 42, y: 22 }, centerLine: "M 38,75.5 C 39,56 41,38 42,22", taperedLumen: "M 36.5,75.5 C 37.5,56 39.5,38 41,22 L 43,22 C 42.5,38 40.5,56 39.5,75.5 Z" },
		{ id: "P", nameRu: "Нёбный (Palatal)", orifice: { x: 48, y: 75.5 }, apex: { x: 48, y: 18 }, centerLine: "M 48,75.5 C 48,54 48,34 48,18", taperedLumen: "M 46.5,75.5 C 46.5,54 46.5,34 47,18 L 49,18 C 49.5,34 49.5,54 49.5,75.5 Z" },
		{ id: "DB", nameRu: "Дистально-щечный", orifice: { x: 58, y: 75.5 }, apex: { x: 54, y: 22 }, centerLine: "M 58,75.5 C 57,56 55,38 54,22", taperedLumen: "M 56.5,75.5 C 55.5,56 53.5,38 53,22 L 55,22 C 56.5,38 58.5,56 59.5,75.5 Z" },
	],
} as const;

export const TOOTH18_GEOMETRY = {
	viewBox: "0 0 100 218",
	cejCurve: "M 18,74 C 36,71 64,71 82,74",
	crownMonolithPath:
		"M 18,74 C 15.5,85 15.0,105 17.5,120 C 19.5,128 23.5,134 28.5,138 " +
		"C 34.5,142 40.5,145 48.0,146 C 55.5,145 61.5,142 67.5,138 " +
		"C 72.5,134 76.5,127 78.5,119 C 80.5,107 81.0,90 82.0,74 C 64.0,71 36.0,71 18.0,74 Z",
	crownMonolithPathWithAbfraction:
		"M 18,74 L 18,75.5 L 22.5,78.5 L 16.2,81.5 C 15.5,85 15.0,105 17.5,120 " +
		"C 19.5,128 23.5,134 28.5,138 C 34.5,142 40.5,145 48.0,146 " +
		"C 55.5,145 61.5,142 67.5,138 C 72.5,134 76.5,127 78.5,119 C 80.5,107 81.0,90 82.0,74 Z",
	rootMonolithPath:
		"M 18,74 C 18.5,58 24.0,40 34.0,26 C 37.0,22 43.0,18 48.0,18 " +
		"C 53.0,18 57.0,20 60.0,24 C 67.0,36 73.0,56 82.0,74 C 64.0,71 36.0,71 18.0,74 Z",
	fusedConicalRootPath:
		"M 18,74 C 18.5,58 24.0,40 34.0,26 C 37.0,22 43.0,18 48.0,18 " +
		"C 53.0,18 57.0,20 60.0,24 C 67.0,36 73.0,56 82.0,74 C 64.0,71 36.0,71 18.0,74 Z",
	mbApex: { x: 42.0, y: 22.0 },
	palatalApex: { x: 48.0, y: 18.0 },
	dbApex: { x: 54.0, y: 22.0 },
	apices: [
		{ x: 42.0, y: 22.0, r: 7.5 },
		{ x: 48.0, y: 18.0, r: 8.5 },
		{ x: 54.0, y: 22.0, r: 7.5 },
	] as const,
	buccalCervicalRidge: "M 18,74 C 24,80 36,83 50,83 C 64,83 76,80 82,74 C 68,76 32,76 18,74 Z",
	cervicalRidgeHighlight: "M 20,76 C 26,81 36,82.5 50,82.5 C 64,82.5 74,81 80,76",
	crownEquatorHighlight: "M 20,98 C 34,102 66,102 80,98",
	centralBasinPath: "M 32,106 C 38,102 46,102 52,104 C 58,108 56,116 50,118 C 42,117 34,113 32,106 Z",
	distalBasinPath: "M 54,110 C 60,107 66,108 70,112 C 68,117 62,120 56,118 C 54,115 53,112 54,110 Z",
	fissures: {
		centralPit: { x: 48, y: 110 },
		sulcusCentralis: "M 32,106 C 40,109 48,110 56,109",
		sulcusBuccalis: "M 48,110 C 47,102 48,90 49,80",
		sulcusDistalis: "M 48,110 C 54,113 62,117 68,122",
	},
	compositeFillingPath: "M 34,107 C 42,104 50,104 58,106 C 64,110 66,115 62,118 C 54,117 42,115 34,107 Z",
	zirconiaCrownShell:
		"M 18,74 C 15.5,85 15.0,105 17.5,120 C 19.5,128 23.5,134 28.5,138 " +
		"C 34.5,142 40.5,145 48.0,146 C 55.5,145 61.5,142 67.5,138 " +
		"C 72.5,134 76.5,127 78.5,119 C 80.5,107 81.0,90 82.0,74 Z",
} as const;
