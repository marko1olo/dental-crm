/**
 * DENTE Dental CRM — 4-Canal Endodontic Geometry for Upper Molars 16 / 26
 * Canals: MB1, MB2, Palatal, DB.
 * Organic dome pulp chamber + seamless 1.5px orifice insertion into pulp floor.
 * Mandate 8b <= 120 lines.
 */

export const TOOTH16_PULP_GEOMETRY = {
	// Pulp chamber with 4 anatomical horns pointing towards cusp peaks
	pulpChamberPath:
		"M 26,100 C 24,108 24,120 26,128 C 28,134 32,136 36,134 " +
		"C 40,132 44,124 50,124 C 56,124 60,132 64,134 C 68,136 72,132 74,126 " +
		"C 76,118 76,108 74,100 C 64,98 36,98 26,100 Z",

	// 4 Horns of the pulp chamber
	horns: [
		{ id: "MB", apex: { x: 26, y: 128 }, label: "MB Рог" },
		{ id: "ML", apex: { x: 36, y: 134 }, label: "ML Рог (массивный)" },
		{ id: "DB", apex: { x: 64, y: 134 }, label: "DB Рог" },
		{ id: "DL", apex: { x: 74, y: 126 }, label: "DL Рог" },
	],

	// 4 Canals with 1.5px overlapping insertion into the pulp chamber floor (y <= 100.5)
	canals: [
		{
			id: "MB1",
			nameRu: "Мезиально-щечный 1 (MB1)",
			path: "M 34,98.5 C 32,74 24,42 18,14",
			orifice: { x: 34, y: 98.5 },
			apex: { x: 18, y: 14 },
			width: 1.8,
		},
		{
			id: "MB2",
			nameRu: "Мезиально-щечный 2 (MB2)",
			path: "M 38,98.5 C 36,72 28,46 23,22",
			orifice: { x: 38, y: 98.5 },
			apex: { x: 23, y: 22 },
			width: 1.2,
		},
		{
			id: "P",
			nameRu: "Нёбный (Palatal)",
			path: "M 49.5,98.5 C 50.5,68 49.2,36 50,8",
			orifice: { x: 49.5, y: 98.5 },
			apex: { x: 50, y: 8 },
			width: 2.6,
		},
		{
			id: "DB",
			nameRu: "Дистально-щечный (DB)",
			path: "M 64,98.5 C 68,74 76,46 82,18",
			orifice: { x: 64, y: 98.5 },
			apex: { x: 82, y: 18 },
			width: 1.7,
		},
	],

	// Orifice funnel rings inside pulp floor
	orifices: [
		{ id: "MB1", x: 34, y: 99, rx: 2.2, ry: 1.4 },
		{ id: "MB2", x: 38, y: 99.5, rx: 1.6, ry: 1.1 },
		{ id: "P", x: 50, y: 99, rx: 3.2, ry: 1.8 },
		{ id: "DB", x: 64, y: 99, rx: 2.0, ry: 1.3 },
	],
} as const;
