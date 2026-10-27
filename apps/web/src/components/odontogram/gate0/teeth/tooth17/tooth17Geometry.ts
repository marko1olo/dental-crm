/**
 * DENTE Dental CRM — Wheeler Ch. 11 Maxillary Second Molar (Tooth 17 / FDI 17)
 * Rhomboid Crown (Carabelli-free, DL cusp reduced),
 * 3 Closely Spaced Roots with Distal Slant (Span: 52px) & 4 Endodontic Canals.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export { TOOTH17_CUSPS, type Tooth17CuspDef } from "./tooth17CuspGeometry";

export const TOOTH17_PULP_GEOMETRY = {
	pulpChamberPath:
		"M 28,76 C 26,84 26,95 28,103 C 30,109 34,111 38,110 " +
		"C 42,108 45,101 50,101 C 55,101 59,108 63,110 C 67,111 70,107 72,102 " +
		"C 74,94 74,84 72,76 C 62,74 38,74 28,76 Z",
	horns: [
		{ id: "MB", apex: { x: 28, y: 103 } },
		{ id: "ML", apex: { x: 38, y: 110 } },
		{ id: "DB", apex: { x: 63, y: 110 } },
		{ id: "DL", apex: { x: 72, y: 102 } },
	],
	canals: [
		{ id: "MB1", nameRu: "Мезиально-щечный 1", orifice: { x: 36, y: 75.5 }, apex: { x: 24, y: 16 }, centerLine: "M 36,75.5 C 34,56 28,36 24,16", taperedLumen: "M 34.5,75.5 C 32.5,56 26.5,36 23,16 L 25,16 C 29,36 35.5,56 37.5,75.5 Z" },
		{ id: "MB2", nameRu: "Мезиально-щечный 2", orifice: { x: 39, y: 75.5 }, apex: { x: 28, y: 24 }, centerLine: "M 39,75.5 C 37,58 32,40 28,24", taperedLumen: "M 38,75.5 C 36,58 31,40 27,24 L 29,24 C 33,40 38,58 40,75.5 Z" },
		{ id: "P", nameRu: "Нёбный (Palatal)", orifice: { x: 50, y: 75.5 }, apex: { x: 50, y: 10 }, centerLine: "M 50,75.5 C 50.5,54 49.5,28 50,10", taperedLumen: "M 48,75.5 C 48.5,54 48,28 49,10 L 51,10 C 51.5,28 51.5,54 52,75.5 Z" },
		{ id: "DB", nameRu: "Дистально-щечный", orifice: { x: 62, y: 75.5 }, apex: { x: 76, y: 18 }, centerLine: "M 62,75.5 C 66,56 72,36 76,18", taperedLumen: "M 60.5,75.5 C 64.5,56 70.5,36 75,18 L 77,18 C 73,36 67.5,56 63.5,75.5 Z" },
	],
} as const;

export const TOOTH17_GEOMETRY = {
	viewBox: "0 0 100 218",
	cejCurve: "M 16,74 C 35,71 65,71 84,74",
	crownMonolithPath:
		"M 16,74 C 13.5,86 13.0,108 15.0,123 C 17.0,130 20.5,136 24.5,142 " +
		"C 28.5,146 32.5,149 36.5,150 C 44.5,151 50.0,147 57.5,146 " +
		"C 63.5,147 68.0,146.5 72.5,144 C 77.5,141 81.5,135 83.0,126 " +
		"C 84.5,114 84.0,92 84.0,74 C 65.0,71 35.0,71 16.0,74 Z",
	crownMonolithPathWithAbfraction:
		"M 16,74 L 16,75.5 L 20.5,78.5 L 14.2,81.5 C 13.5,86 13.0,108 15.0,123 " +
		"C 17.0,130 20.5,136 24.5,142 C 28.5,146 32.5,149 36.5,150 " +
		"C 44.5,151 50.0,147 57.5,146 C 63.5,147 68.0,146.5 72.5,144 " +
		"C 77.5,141 81.5,135 83.0,126 C 84.5,114 84.0,92 84.0,74 C 65.0,71 35.0,71 16.0,74 Z",
	rootMonolithPath:
		"M 16,74 C 13.5,60 15.0,38 20.0,24 C 21.5,19 23.0,16 24.0,16 " +
		"C 25.5,16 27.0,17.5 28.0,20 C 31.0,32 34.0,46 38.0,50 " +
		"C 41.0,45 44.0,25 47.0,10.5 C 48.5,9.5 51.5,9.5 53.0,10.5 " +
		"C 56.0,25 58.0,45 61.0,50 C 64.0,44 68.0,30 72.0,20.5 " +
		"C 73.5,18.5 75.0,18 76.0,18 C 77.5,18 79.0,19 80.0,21.5 " +
		"C 82.0,32 83.5,54 84.0,74 C 65.0,71 35.0,71 16.0,74 Z",
	palatalRootBody: "M 39,70 C 42,52 45,26 47,10.5 C 48.5,9.5 51.5,9.5 53,10.5 C 55,26 58,52 61,70 Z",
	trifurcationShadowPath: "M 36,55 C 43,49 50,48 50,48 C 50,48 57,49 64,55 C 57,51 43,51 36,55 Z",
	mbApex: { x: 24.0, y: 16.0 },
	palatalApex: { x: 50.0, y: 10.0 },
	dbApex: { x: 76.0, y: 18.0 },
	apices: [
		{ x: 24.0, y: 16.0, r: 8.0 },
		{ x: 50.0, y: 10.0, r: 8.5 },
		{ x: 76.0, y: 18.0, r: 8.0 },
	] as const,
	buccalCervicalRidge: "M 16,74 C 22,80 36,84 50,84 C 64,84 78,80 84,74 C 68,76 32,76 16,74 Z",
	cervicalRidgeHighlight: "M 18,76 C 24,81 36,83 50,83 C 64,83 76,81 82,76",
	crownEquatorHighlight: "M 18,99 C 34,103 66,103 82,99",
	centralBasinPath: "M 28,107 C 35,103 44,103 51,105 C 49,113 44,116 37,118 C 30,116 26,111 28,107 Z",
	distalBasinPath: "M 55,117 C 62,114 69,112 74,116 C 73,121 68,125 61,127 C 57,123 55,119 55,117 Z",
	fissures: {
		centralPit: { x: 44, y: 111 },
		distalPit: { x: 65, y: 119 },
		sulcusCentralis: "M 29,107 C 36,110 43,111 50,109",
		sulcusDistopalatalis: "M 50,109 C 57,114 63,119 68,128",
		sulcusBuccalis: "M 44,111 C 43,100 44,88 45,78",
	},
	compositeFillingPath: "M 30,108 C 38,105 46,105 52,107 C 58,111 65,115 70,121 C 65,123 57,119 50,116 C 42,114 34,112 30,108 Z",
	zirconiaCrownShell:
		"M 16,74 C 13.5,86 13.0,108 15.0,123 C 17.0,130 20.5,136 24.5,142 " +
		"C 28.5,146 32.5,149 36.5,150 C 44.5,151 50.0,147 57.5,146 " +
		"C 63.5,147 68.0,146.5 72.5,144 C 77.5,141 81.5,135 83.0,126 " +
		"C 84.5,114 84.0,92 84.0,74 Z",
} as const;
