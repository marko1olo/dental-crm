/**
 * DENTE Dental CRM — Wheeler Ch. 10 Maxillary First Premolar (Tooth 14 / FDI 14)
 * Anatomical proportions: CEJ Y=74, Crown Y=74..146 (H=72), Bifurcation Y=44.5, Apices Y=14/16.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export const TOOTH14_GEOMETRY = {
	viewBox: "0 0 100 218",
	cejCurve: "M 24,74 C 36,71.5 64,71.5 76,74",
	cejPath: "M 24,74 C 36,71.5 64,71.5 76,74",
	crownMonolithPath:
		"M 24,74 C 22.8,84 21.8,98 22.5,112 C 23.5,124 28.5,134 37.0,140.0 " +
		"C 42.0,143.5 48.0,146.0 51.5,146.0 C 53.5,146.0 59.0,142.5 65.0,138.0 " +
		"C 72.0,133.0 75.0,124 75.8,112 C 76.5,98 76.2,84 76,74 C 64,71.5 36,71.5 24,74 Z",
	crownMonolithPathWithAbfraction:
		"M 24,74 L 28.5,77 L 23.5,81 C 22.8,84 21.8,98 22.5,112 C 23.5,124 28.5,134 37.0,140.0 " +
		"C 42.0,143.5 48.0,146.0 51.5,146.0 C 53.5,146.0 59.0,142.5 65.0,138.0 " +
		"C 72.0,133.0 75.0,124 75.8,112 C 76.5,98 76.2,84 76,74 C 64,71.5 36,71.5 24,74 Z",
	rootMonolithPath:
		"M 24,74 C 25.5,64 27.0,50 28.5,38 C 29.8,26 31.5,18 32.2,14.5 " +
		"C 32.5,13.5 33.5,13.5 33.8,14.5 C 35.5,22 38.0,32 41.0,40 " +
		"C 43.5,43.5 47.0,44.5 50.0,44.5 C 53.0,44.5 56.5,43.5 59.0,40 " +
		"C 62.0,32 64.5,22 66.2,16.5 C 66.5,15.5 67.5,15.5 67.8,16.5 " +
		"C 68.5,20 70.2,28 71.5,38 C 73.0,50 74.5,64 76,74 C 64,71.5 36,71.5 24,74 Z",
	bifurcationFornix: { x: 50.0, y: 44.5 },
	bifurcationShadow: "M 43,40 C 47,46 53,46 57,40 C 54,42.5 46,42.5 43,40 Z",
	rootTrunkSulcus: "M 50,44.5 C 50,54 50,64 50,73",
	buccalApex: { x: 33.0, y: 14.0 },
	palatalApex: { x: 67.0, y: 16.0 },
	apices: [{ x: 33.0, y: 14.0, r: 8.5 }, { x: 67.0, y: 16.0, r: 8.5 }] as const,
	sulcusCentralis: "M 34,118 C 42,120.0 52,120.0 64,117",
	mesialMarginalGroove: "M 34,118 C 29,114 24,108 22.5,102",
	buccalTriangularGroove: "M 35,118 C 40,126 46,136 51.5,146",
	distalTriangularGroove: "M 63,117 C 59,126 55,136 51.5,146",
	buccalAxialRidge: "M 51.5,146 C 51.5,128 51.0,105 50.5,82",
	buccalCervicalRidge: "M 24,74 C 27,82 37,87 50,87 C 63,87 73,82 76,74 Z",
	cervicalRidgeHighlight: "M 25,76 C 29,81 38,85 50,85 C 62,85 71,81 75,76",
	cervicalShoulderPath: "M 24,74 C 36,71.5 64,71.5 76,74 L 75.5,76.5 C 64,74.0 36,74.0 24.5,76.5 Z",
	compositeFillingPath: "M 33,115 C 42,113 54,113 64,114 C 65,119 60,122 50,122 C 40,122 33,120 33,115 Z",
	zirconiaCrownShell:
		"M 23,73.5 C 20,85 18,100 20,113 C 22,122 29,128 39,132 C 45,134 49,134.5 51.5,134.5 " +
		"C 55,134 61,130 68,127 C 77,122 80,112 80,100 C 80,85 78,75 77,73.5 C 64,71.5 36,71.5 23,73.5 Z",
	crownCuspSlopes: [
		{ id: "buccal-m", d: "M 51.5,146 C 44,142 36,137 29,130 C 35,128 43,129 51.5,130 Z", type: "highlight" as const },
		{ id: "buccal-d", d: "M 51.5,146 C 57,142 63,137 68,130 C 63,128 57,128 51.5,130 Z", type: "shadow" as const },
		{ id: "palatal-m", d: "M 40,140.5 C 44,137 47,136 50,136 L 52,132 L 44,132 Z", type: "highlight" as const },
		{ id: "palatal-d", d: "M 50,136 C 54,136 58,138 64,140.5 C 60,137 55,135 50,132 Z", type: "shadow" as const },
	],
	crownSpecularRidges: [
		{ id: "buccal-tip", d: "M 40,143 C 46,145.5 49,146 51.5,146 C 54,146 58,144 63,141" },
		{ id: "buccal-axial", d: "M 51.5,146 L 51.0,105" },
		{ id: "mesial-groove", d: "M 34,118 C 29,114 24,108 22.5,102" },
	],
	crownEquatorHighlight: "M 23,105 C 36,110 64,110 77,105",
	fossaeAndGrooves: [
		{ id: "sulcus-centralis", d: "M 34,118 C 42,120.0 52,120.0 64,117" },
		{ id: "sulcus-mesialis-marginalis", d: "M 34,118 C 29,114 24,108 22.5,102" },
		{ id: "sulcus-triangularis-mb", d: "M 35,118 C 40,126 46,136 51.5,146" },
		{ id: "sulcus-triangularis-db", d: "M 63,117 C 59,126 55,136 51.5,146" },
	],
	cusps: [
		{ id: "B", nameRu: "Щёчный (Buccal)", apex: { x: 51.5, y: 146.0 } },
		{ id: "P", nameRu: "Нёбный (Palatal)", apex: { x: 47.0, y: 140.5 } },
	] as const,
	pulp: {
		chamberPath:
			"M 38,74 C 34,82 33,96 35,108 C 37,114 41,119 44,120 " +
			"C 47,116 49,112 51,112 C 53,112 55,115 57,116 " +
			"C 59,113 61,106 63,104 C 65,96 63,82 59,74 Z",
		buccalHorn: { x: 44, y: 120 },
		palatalHorn: { x: 57, y: 116 },
		buccalCanal: {
			id: "Buccal",
			name: "Щёчный канал",
			orifice: { x: 40.0, y: 72.0 },
			apex: { x: 33.0, y: 14.0 },
			canalPath: "M 38.5,72 C 37.0,56 34.5,36 32.0,14 L 34.0,14 C 36.5,36 39.0,56 40.5,72 Z",
			guttaPerchaPath: "M 39.0,72 C 37.5,56 35.0,36 32.5,15.5 L 33.5,15.5 C 36.0,36 38.5,56 40.0,72 Z",
			lengthMm: 21.5,
			curvatureDeg: 12,
		},
		palatalCanal: {
			id: "Palatal",
			name: "Нёбный канал",
			orifice: { x: 60.0, y: 72.0 },
			apex: { x: 67.0, y: 16.0 },
			canalPath: "M 58.5,72 C 60.5,56 63.5,36 66.0,16 L 68.0,16 C 65.5,36 62.5,56 60.5,72 Z",
			guttaPerchaPath: "M 59.0,72 C 61.0,56 64.0,36 66.5,17.5 L 67.5,17.5 C 65.0,36 62.0,56 60.0,72 Z",
			lengthMm: 20.5,
			curvatureDeg: 8,
		},
	},
	cariesGeometry: {
		class1: {
			halo: "M 32,115 C 42,117 54,117 66,115 C 64,120 58,122 50,122 C 42,122 34,120 32,115 Z",
			crater: "M 35,116 C 44,118 54,118 63,116 C 61,120 56,121 50,121 C 44,121 38,120 35,116 Z",
			profunda: "M 42,117.5 C 46,118.5 52,118.5 56,117.5 C 54,120 48,120.5 44,120 Z",
		},
		class5: {
			halo: "M 29,75 C 38,78 62,78 71,75 C 68,82 32,82 29,75 Z",
			crater: "M 33,76 C 40,78 60,78 67,76 C 65,80 35,80 33,76 Z",
			profunda: "M 42,77 C 46,78 54,78 58,77 C 56,79.5 44,79.5 42,77 Z",
		},
		mesialBox: "M 22,100 C 22,110 25,116 33,116 C 32,111 30,104 28,100 Z",
		distalBox: "M 77,100 C 77,110 74,116 65,116 C 67,111 69,104 71,100 Z",
	},
} as const;
