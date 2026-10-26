/**
 * DENTE Dental CRM — Wheeler Ch. 10 Maxillary Second Premolar (Tooth 15 / FDI 15 & 25)
 * Anatomical scale: 7.0mm crown width. Single tapered conical root, equal height cusps.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export const TOOTH15_GEOMETRY = {
	viewBox: "0 0 100 218",
	cejCurve: "M 25,94 C 36,92 64,92 75,94",
	cejPath: "M 25,94 C 36,92 64,92 75,94",
	crownMonolithPath:
		"M 25,94 C 23.5,106 23.0,120 25.0,132 C 27.0,142 34.0,148 44,150 " +
		"C 48.0,150.5 52.0,150.5 56,150 C 66.0,148 73.0,142 75.0,132 " +
		"C 77.0,120 76.5,106 75,94 C 64,92 36,92 25,94 Z",
	crownMonolithPathWithAbfraction:
		"M 25,94 L 29.5,97 L 24.5,101 C 23.5,106 23.0,120 25.0,132 " +
		"C 27.0,142 34.0,148 44,150 C 48.0,150.5 52.0,150.5 56,150 " +
		"C 66.0,148 73.0,142 75.0,132 C 77.0,120 76.5,106 75,94 " +
		"C 64,92 36,92 25,94 Z",
	// Single tapered conical root with slight distal curve
	rootMonolithPath:
		"M 25,94 C 27,76 33,50 42,28 C 45,20 47,14 48.5,13 " +
		"C 49.5,13 51,14 53,20 C 60,38 67,66 75,94 " +
		"C 64,92 36,92 25,94 Z",
	rootApex: { x: 49.0, y: 13.0 },
	apices: [{ x: 49.0, y: 13.0, r: 9.0 }] as const,
	rootSulcus: "M 50,92 C 49.5,70 48.5,45 48.0,18",
	rootSulcusHighlight: "M 51.2,90 C 50.7,70 49.7,45 49.0,18",
	// Wheeler Ch. 10: Short central sulcus with supplemental wrinkles
	sulcusCentralis: "M 36,137 C 44,138 56,138 64,137",
	supplementalGrooves: [
		{ id: "suppl-mb", d: "M 42,138 C 40,142 38,146 36,148" },
		{ id: "suppl-db", d: "M 58,138 C 60,142 62,146 64,148" },
		{ id: "suppl-axial", d: "M 50,138 C 50,142 50,146 50,150" },
	],
	buccalCervicalRidge: "M 25,94 C 28,102 38,108 50,108 C 62,108 72,102 75,94 Z",
	cervicalShoulderPath:
		"M 25,94 C 36,92 64,92 75,94 L 74.5,96.5 C 64,94.5 36,94.5 25.5,96.5 Z",
	compositeFillingPath:
		"M 35,135 C 44,133 56,133 65,135 C 64,140 58,142 50,142 C 42,142 36,140 35,135 Z",
	zirconiaCrownShell:
		"M 24,93.5 C 22,106 21,121 23,133 C 25,143 32,149 43,151 C 47,152 53,152 57,151 " +
		"C 68,149 75,143 77,133 C 79,121 78,106 76,93.5 C 64,91.5 36,91.5 24,93.5 Z",
	crownCuspSlopes: [
		{ id: "buccal-m", d: "M 48,150 C 41,147 35,143 30,137 C 36,136 42,137 48,138 Z", type: "highlight" as const },
		{ id: "buccal-d", d: "M 48,150 C 55,147 61,143 66,137 C 60,136 54,137 48,138 Z", type: "shadow" as const },
		{ id: "palatal-m", d: "M 38,144 C 42,142 46,141 50,141 L 52,137 L 44,137 Z", type: "highlight" as const },
		{ id: "palatal-d", d: "M 50,141 C 54,141 58,142 62,144 C 58,141 54,139 50,137 Z", type: "shadow" as const },
	],
	crownSpecularRidges: [
		{ id: "buccal-tip", d: "M 36,147 C 44,150 48,150.5 50,150.5 C 52,150.5 56,150 64,147" },
		{ id: "buccal-axial", d: "M 50,150.5 L 50,122" },
	],
	crownEquatorHighlight: "M 25,120 C 37,124 63,124 75,120",
	fossaeAndGrooves: [
		{ id: "sulcus-centralis", d: "M 36,137 C 44,138 56,138 64,137" },
		{ id: "sulcus-suppl-mb", d: "M 42,138 C 40,142 38,146 36,148" },
		{ id: "sulcus-suppl-db", d: "M 58,138 C 60,142 62,146 64,148" },
	],
	cusps: [
		{ id: "B", nameRu: "Щёчный (Buccal)", apex: { x: 48, y: 150.0 } },
		{ id: "P", nameRu: "Нёбный (Palatal)", apex: { x: 52, y: 149.5 } },
	] as const,
	// Pulp chamber with 2 equal coronal horns & 1 wide central root canal
	pulp: {
		chamberPath:
			"M 41,94 C 38,103 36,117 38,128 C 40,134 43,138 45,138 " +
			"C 48,135 50,133 50,133 C 50,133 52,135 55,138 " +
			"C 57,134 60,128 62,126 C 64,117 62,103 59,94 Z",
		buccalHorn: { x: 45, y: 138 },
		palatalHorn: { x: 55, y: 138 },
		canals: [
			{
				id: "Main",
				name: "Центральный канал",
				orifice: { x: 50.0, y: 92.0 },
				apex: { x: 49.0, y: 13.0 },
				canalPath: "M 47.0,92 C 46.5,72 46.0,45 47.5,13.5 L 50.5,13.5 C 51.5,45 52.5,72 53.0,92 Z",
				guttaPerchaPath: "M 47.5,92 C 47.0,72 46.6,45 48.0,14.5 L 50.0,14.5 C 51.0,45 52.0,72 52.5,92 Z",
				lengthMm: 21.0,
				curvatureDeg: 6,
			},
		],
	},
	cariesGeometry: {
		class1: {
			halo: "M 34,135 C 44,136 56,136 66,135 C 64,139 58,141 50,141 C 42,141 36,139 34,135 Z",
			crater: "M 37,136 C 45,137 55,137 63,136 C 61,139 56,140 50,140 C 44,140 39,139 37,136 Z",
			profunda: "M 43,137 C 47,137.5 53,137.5 57,137 C 55,139 49,139.5 45,139 Z",
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
