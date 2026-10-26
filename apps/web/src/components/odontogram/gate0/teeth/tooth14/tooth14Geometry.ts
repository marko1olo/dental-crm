/**
 * DENTE Dental CRM — Wheeler Ch. 10 Maxillary First Premolar (Tooth 14 / FDI 14 & 24)
 * Anatomical scale: 7.0mm crown width. EXCLUSIVE: 2 divergent roots (Buccal & Palatal).
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export const TOOTH14_GEOMETRY = {
	viewBox: "0 0 100 218",
	cejCurve: "M 25,94 C 36,92 64,92 75,94",
	cejPath: "M 25,94 C 36,92 64,92 75,94",
	crownMonolithPath:
		"M 25,94 C 23.5,104 22.0,118 23.5,132 C 24.5,138 29.0,144 38,148 " +
		"C 43.0,150 46.0,151.5 47,151.5 C 49.5,151.5 53.0,148 58,146 " +
		"C 66.0,144 72.5,138 74.0,132 C 76.0,118 75.5,104 75,94 " +
		"C 64,92 36,92 25,94 Z",
	crownMonolithPathWithAbfraction:
		"M 25,94 L 29.5,97 L 24.5,101 C 23.5,104 22.0,118 23.5,132 " +
		"C 24.5,138 29.0,144 38,148 C 43.0,150 46.0,151.5 47,151.5 " +
		"C 49.5,151.5 53.0,148 58,146 C 66.0,144 72.5,138 74.0,132 " +
		"C 76.0,118 75.5,104 75,94 C 64,92 36,92 25,94 Z",
	// Wheeler Ch. 10 Exclusive: 2 divergent roots bifurcating at mid-root (Y ~ 54)
	rootMonolithPath:
		"M 25,94 C 25.5,80 27,65 30,52 C 32,36 34,22 37,12 " +
		"C 38,11.5 39,11.5 40,12 C 43,26 47,42 50,55 " +
		"C 53,42 57,26 61,14 C 62,13.5 63,13.5 64,14 " +
		"C 67,24 69,38 70,52 C 73,65 74.5,80 75,94 " +
		"C 64,92 36,92 25,94 Z",
	bifurcationFornix: { x: 50, y: 55 },
	bifurcationShadow: "M 45,50 C 48,56 52,56 55,50 C 52,53 48,53 45,50 Z",
	rootTrunkSulcus: "M 50,55 C 50,68 50,82 50,94",
	buccalApex: { x: 38.0, y: 12.0 },
	palatalApex: { x: 62.0, y: 14.0 },
	apices: [
		{ x: 38.0, y: 12.0, r: 8.5 },
		{ x: 62.0, y: 14.0, r: 8.5 },
	] as const,
	// Occlusal groove complex: central groove crosses mesial marginal ridge
	sulcusCentralis: "M 33,136 C 42,138 52,138 64,135",
	mesialMarginalGroove: "M 33,136 C 28,133 24,129 23,124",
	buccalTriangularGroove: "M 34,136 C 38,142 42,148 47,151.5",
	distalTriangularGroove: "M 63,135 C 58,142 52,148 47,151.5",
	distalFossaGroove: "M 64,135 C 68,133 72,131 74,128",
	buccalAxialRidge: "M 47,151.5 L 47,100",
	buccalCervicalRidge: "M 25,94 C 28,102 38,108 50,108 C 62,108 72,102 75,94 Z",
	cervicalShoulderPath:
		"M 25,94 C 36,92 64,92 75,94 L 74.5,96.5 C 64,94.5 36,94.5 25.5,96.5 Z",
	compositeFillingPath:
		"M 33,134 C 42,132 54,132 64,133 C 65,138 60,141 50,141 C 40,141 33,139 33,134 Z",
	zirconiaCrownShell:
		"M 24,93.5 C 21,105 19,120 21,133 C 23,142 30,148 40,152 C 45,154 48,154.5 50,154.5 " +
		"C 54,154 60,150 67,147 C 76,142 79,132 79,120 C 79,105 77,95 76,93.5 C 64,91.5 36,91.5 24,93.5 Z",
	crownCuspSlopes: [
		{ id: "buccal-m", d: "M 47,151.5 C 40,148 34,144 28,138 C 34,136 41,137 47,138 Z", type: "highlight" as const },
		{ id: "buccal-d", d: "M 47,151.5 C 53,148 60,144 66,138 C 60,136 54,136 47,138 Z", type: "shadow" as const },
		{ id: "palatal-m", d: "M 38,146 C 42,143 45,142 48,142 L 50,138 L 42,138 Z", type: "highlight" as const },
		{ id: "palatal-d", d: "M 48,142 C 54,142 58,144 64,146 C 60,142 55,140 50,138 Z", type: "shadow" as const },
	],
	crownSpecularRidges: [
		{ id: "buccal-tip", d: "M 36,148 C 43,151 46,151.5 47,151.5 C 50,151.5 54,149 61,146" },
		{ id: "buccal-axial", d: "M 47,151.5 L 47,120" },
		{ id: "mesial-groove", d: "M 33,136 C 28,133 24,129 23,124" },
	],
	crownEquatorHighlight: "M 24,120 C 36,124 64,124 76,120",
	fossaeAndGrooves: [
		{ id: "sulcus-centralis", d: "M 33,136 C 42,138 52,138 64,135" },
		{ id: "sulcus-mesialis-marginalis", d: "M 33,136 C 28,133 24,129 23,124" },
		{ id: "sulcus-triangularis-mb", d: "M 34,136 C 38,142 42,148 47,151.5" },
		{ id: "sulcus-triangularis-db", d: "M 63,135 C 58,142 52,148 47,151.5" },
	],
	cusps: [
		{ id: "B", nameRu: "Щёчный (Buccal)", apex: { x: 47, y: 151.5 } },
		{ id: "P", nameRu: "Нёбный (Palatal)", apex: { x: 55, y: 146.0 } },
	] as const,
	// Pulp chamber with 2 coronal horns & 2 separate root canals
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
			orifice: { x: 43.0, y: 92.0 },
			apex: { x: 38.0, y: 12.0 },
			canalPath: "M 41.5,92 C 40.5,76 38.5,52 37.0,12 L 39.0,12 C 40.0,52 42.0,76 43.5,92 Z",
			guttaPerchaPath: "M 42.0,92 C 41.0,76 39.0,52 37.5,13.5 L 38.5,13.5 C 39.5,52 41.5,76 43.0,92 Z",
			lengthMm: 21.5,
			curvatureDeg: 12,
		},
		palatalCanal: {
			id: "Palatal",
			name: "Нёбный канал",
			orifice: { x: 57.0, y: 92.0 },
			apex: { x: 62.0, y: 14.0 },
			canalPath: "M 55.5,92 C 57.0,76 59.0,52 61.0,14 L 63.0,14 C 61.5,52 59.5,76 57.5,92 Z",
			guttaPerchaPath: "M 56.0,92 C 57.5,76 59.5,52 61.5,15.5 L 62.5,15.5 C 61.0,52 59.0,76 57.0,92 Z",
			lengthMm: 20.5,
			curvatureDeg: 8,
		},
	},
	cariesGeometry: {
		class1: {
			halo: "M 32,134 C 42,135 52,135 64,133 C 66,137 62,140 50,140 C 38,140 31,138 32,134 Z",
			crater: "M 35,135 C 43,136 51,136 61,134 C 60,138 53,139 48,139 C 42,139 36,138 35,135 Z",
			profunda: "M 42,136 C 46,136.5 50,136.5 54,135.5 C 53,138 48,138.5 45,138 C 43,137.5 42,137 42,136 Z",
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
