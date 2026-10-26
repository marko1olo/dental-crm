/**
 * DENTE Dental CRM — Wheeler Ch. 10 Maxillary First Premolar (Tooth 14 / FDI 14 & 24)
 * Anatomical scale: 7.0mm crown width. EXCLUSIVE: 2 divergent roots (Buccal & Palatal).
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export const TOOTH14_GEOMETRY = {
	viewBox: "0 0 100 218",
	cejCurve: "M 25,94 C 36,91.5 64,91.5 75,94",
	cejPath: "M 25,94 C 36,91.5 64,91.5 75,94",
	crownMonolithPath:
		"M 25,94 C 23.8,104 22.8,118 23.5,130 C 24.2,138 28.5,145 37.0,148.5 " +
		"C 42.0,150.5 46.5,151.5 48.0,151.5 C 49.5,151.5 53.5,149.5 59.0,146.5 " +
		"C 67.0,143.0 73.0,136 74.5,130 C 76.0,118 75.8,104 75,94 C 64,91.5 36,91.5 25,94 Z",
	crownMonolithPathWithAbfraction:
		"M 25,94 L 29.5,97 L 24.5,101 C 23.8,104 22.8,118 23.5,130 C 24.2,138 28.5,145 37.0,148.5 " +
		"C 42.0,150.5 46.5,151.5 48.0,151.5 C 49.5,151.5 53.5,149.5 59.0,146.5 " +
		"C 67.0,143.0 73.0,136 74.5,130 C 76.0,118 75.8,104 75,94 C 64,91.5 36,91.5 25,94 Z",
	rootMonolithPath:
		"M 25,94 C 25.5,82 26.5,66 28.0,52 C 29.5,36 31.0,22 32.2,16 C 33.0,14.0 35.0,14.0 35.8,16 " +
		"C 38.5,26 42.0,38 45.5,48 C 47.5,53.5 48.8,55.0 50.0,55.0 C 51.2,55.0 52.5,53.5 54.5,48 " +
		"C 58.0,38 61.5,26 64.2,18 C 65.0,16.0 67.0,16.0 67.8,18 C 69.5,24 71.5,38 72.8,52 " +
		"C 74.0,66 74.6,82 75,94 C 64,91.5 36,91.5 25,94 Z",
	bifurcationFornix: { x: 50.0, y: 55.0 },
	bifurcationShadow: "M 45,50 C 48,56.5 52,56.5 55,50 C 52.5,53.5 47.5,53.5 45,50 Z",
	rootTrunkSulcus: "M 50,55 C 50,68 50,82 50,93",
	buccalApex: { x: 34.0, y: 14.0 },
	palatalApex: { x: 66.0, y: 16.0 },
	apices: [{ x: 34.0, y: 14.0, r: 8.5 }, { x: 66.0, y: 16.0, r: 8.5 }] as const,
	sulcusCentralis: "M 34,137 C 42,138.5 52,138.5 64,136",
	mesialMarginalGroove: "M 34,137 C 29,134 25,129 23.5,123",
	buccalTriangularGroove: "M 35,137 C 39,142 44,148 48,151.5",
	distalTriangularGroove: "M 63,136 C 58,142 53,148 48,151.5",
	distalFossaGroove: "M 64,136 C 68,134 72,132 74,129",
	buccalAxialRidge: "M 48,151.5 L 48,102",
	buccalCervicalRidge: "M 25,94 C 28,102 38,107 50,107 C 62,107 72,102 75,94 Z",
	cervicalRidgeHighlight: "M 26,96 C 30,101 39,105 50,105 C 61,105 70,101 74,96",
	cervicalShoulderPath: "M 25,94 C 36,91.5 64,91.5 75,94 L 74.5,96.5 C 64,94.0 36,94.0 25.5,96.5 Z",
	compositeFillingPath: "M 33,134 C 42,132 54,132 64,133 C 65,138 60,141 50,141 C 40,141 33,139 33,134 Z",
	zirconiaCrownShell:
		"M 24,93.5 C 21,105 19,120 21,133 C 23,142 30,148 40,152 C 45,154 48,154.5 50,154.5 " +
		"C 54,154 60,150 67,147 C 76,142 79,132 79,120 C 79,105 77,95 76,93.5 C 64,91.5 36,91.5 24,93.5 Z",
	crownCuspSlopes: [
		{ id: "buccal-m", d: "M 48,151.5 C 41,148 34,144 28,138 C 34,136 41,137 48,138 Z", type: "highlight" as const },
		{ id: "buccal-d", d: "M 48,151.5 C 54,148 61,144 67,138 C 61,136 55,136 48,138 Z", type: "shadow" as const },
		{ id: "palatal-m", d: "M 38,146 C 42,143 45,142 48,142 L 50,138 L 42,138 Z", type: "highlight" as const },
		{ id: "palatal-d", d: "M 48,142 C 54,142 58,144 64,146 C 60,142 55,140 50,138 Z", type: "shadow" as const },
	],
	crownSpecularRidges: [
		{ id: "buccal-tip", d: "M 37,148.5 C 44,151 47,151.5 48,151.5 C 51,151.5 55,149.5 62,146.5" },
		{ id: "buccal-axial", d: "M 48,151.5 L 48,118" },
		{ id: "mesial-groove", d: "M 34,137 C 29,134 25,129 23.5,123" },
	],
	crownEquatorHighlight: "M 24,120 C 36,124 64,124 76,120",
	fossaeAndGrooves: [
		{ id: "sulcus-centralis", d: "M 34,137 C 42,138.5 52,138.5 64,136" },
		{ id: "sulcus-mesialis-marginalis", d: "M 34,137 C 29,134 25,129 23.5,123" },
		{ id: "sulcus-triangularis-mb", d: "M 35,137 C 39,142 44,148 48,151.5" },
		{ id: "sulcus-triangularis-db", d: "M 63,136 C 58,142 53,148 48,151.5" },
	],
	cusps: [
		{ id: "B", nameRu: "Щёчный (Buccal)", apex: { x: 48.0, y: 151.5 } },
		{ id: "P", nameRu: "Нёбный (Palatal)", apex: { x: 54.0, y: 146.0 } },
	] as const,
	pulp: {
		chamberPath:
			"M 40,94 C 36,102 34,116 36,128 C 38,134 42,139 44,140 " +
			"C 46,136 48,132 50,132 C 52,132 54,135 56,136 " +
			"C 58,133 60,126 62,124 C 64,116 62,102 58,94 Z",
		buccalHorn: { x: 44, y: 140 },
		palatalHorn: { x: 56, y: 136 },
		buccalCanal: {
			id: "Buccal",
			name: "Щёчный канал",
			orifice: { x: 42.0, y: 92.0 },
			apex: { x: 34.0, y: 14.0 },
			canalPath: "M 40.5,92 C 38.5,76 35.5,52 33.0,14 L 35.0,14 C 37.5,52 40.5,76 42.5,92 Z",
			guttaPerchaPath: "M 41.0,92 C 39.0,76 36.0,52 33.5,15.5 L 34.5,15.5 C 37.0,52 40.0,76 42.0,92 Z",
			lengthMm: 21.5,
			curvatureDeg: 12,
		},
		palatalCanal: {
			id: "Palatal",
			name: "Нёбный канал",
			orifice: { x: 58.0, y: 92.0 },
			apex: { x: 66.0, y: 16.0 },
			canalPath: "M 56.5,92 C 58.5,76 62.5,52 65.0,16 L 67.0,16 C 64.5,52 60.5,76 58.5,92 Z",
			guttaPerchaPath: "M 57.0,92 C 59.0,76 63.0,52 65.5,17.5 L 66.5,17.5 C 64.0,52 60.0,76 58.0,92 Z",
			lengthMm: 20.5,
			curvatureDeg: 8,
		},
	},
	cariesGeometry: {
		class1: {
			halo: "M 32,134 C 42,136 54,136 66,134 C 64,139 58,141 50,141 C 42,141 34,139 32,134 Z",
			crater: "M 35,135 C 44,137 54,137 63,135 C 61,139 56,140 50,140 C 44,140 38,139 35,135 Z",
			profunda: "M 42,136.5 C 46,137.5 52,137.5 56,136.5 C 54,139 48,139.5 44,139 Z",
		},
		class5: {
			halo: "M 30,95 C 38,98 62,98 70,95 C 67,102 33,102 30,95 Z",
			crater: "M 34,96 C 40,98 60,98 66,96 C 64,100 36,100 34,96 Z",
			profunda: "M 42,97 C 46,98 54,98 58,97 C 56,99.5 44,99.5 42,97 Z",
		},
		mesialBox: "M 23,120 C 23,130 26,136 34,136 C 33,131 31,124 29,120 Z",
		distalBox: "M 76,120 C 76,130 73,136 64,136 C 66,131 68,124 70,120 Z",
	},
} as const;
