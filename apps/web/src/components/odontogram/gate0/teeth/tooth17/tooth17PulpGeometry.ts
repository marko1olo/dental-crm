/**
 * Anatomical Unified Endodontic System Geometry for Upper Second Molar 17
 * Wheeler Ch. 12 & Cohen's Pathways of the Pulp:
 * - 4 Convergent canals sweeping DISTALLY TO THE LEFT (DB: 20.0, P: 44.0, MB: 58.0).
 * - Distally inclined canal pathways conforming to convergent root anatomy.
 * - Inverted physiological dome: 2 rounded horns.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export interface Tooth17CanalAnatomy {
	id: "P" | "MB1" | "MB2" | "DB";
	nameRu: string;
	orifice: { x: number; y: number };
	apex: { x: number; y: number };
	centerLine: string;
	taperedLumen: string;
}

export const TOOTH17_PULP_GEOMETRY = {
	// 1. SEAMLESS MONOLITHIC PULP SYSTEM
	unifiedPulpSystemPath:
		"M 19.4,26.5 " +
		"C 21.0,47 28.5,72 37.0,98.0 " +
		"C 36.5,103.5 37.0,110.0 38.5,114.5 " +
		"C 39.8,118.0 43.5,118.0 45.5,115.5 " +
		"C 49.0,111.5 54.5,111.5 56.8,116.5 " +
		"C 58.0,121.0 61.5,121.0 62.5,117.5 " +
		"C 63.8,112.5 64.5,105.0 64.0,98.0 " +
		"C 61.0,74 59.5,48 58.6,22.5 L 57.4,22.5 " +
		"C 55.0,48 57.0,74 59.0,98.5 " +
		"C 58.5,99.2 57.8,99.8 57.0,100.5 " +
		"C 55.0,74 54.5,50 54.5,25.0 L 53.5,25.0 " +
		"C 53.5,50 55.0,74 55.0,100.5 " +
		"C 53.0,102.5 49.5,102.5 47.5,99.5 " +
		"C 46.5,68 45.0,36 44.6,11.0 L 43.4,11.0 " +
		"C 43.0,36 43.0,68 44.0,99.5 " +
		"C 42.0,102.5 39.0,101.5 37.8,98.0 " +
		"C 31.0,72 23.5,47 20.6,26.5 L 19.4,26.5 Z",

	// 2. COMPACT CORONAL PULP CHAMBER (MB prominent, DB lower)
	coronalPulpChamber:
		"M 37.0,98.0 " +
		"C 36.5,104.0 37.0,111.0 38.5,114.5 " +
		"C 39.8,118.0 43.5,118.0 45.5,115.5 " +
		"C 49.0,111.5 54.5,111.5 56.8,116.5 " +
		"C 58.0,121.0 61.5,121.0 62.5,117.5 " +
		"C 63.8,112.5 64.5,105.0 64.0,98.0 " +
		"C 59.0,101.5 55.5,102.5 50.5,102.5 " +
		"C 46.0,102.5 42.0,101.5 37.0,98.0 Z",

	// 3. 4 INDIVIDUAL ROOT CANALS (Distal sweep leftward)
	canals: [
		{
			id: "P",
			nameRu: "Нёбный канал (наклон влево)",
			orifice: { x: 46.0, y: 100.5 },
			apex: { x: 44.0, y: 11.0 },
			centerLine: "M 46.0,100.5 C 45.0,68 44.5,36 44.0,11.0",
			taperedLumen:
				"M 44.8,99.5 C 44.0,68 43.5,36 43.4,11.0 " +
				"L 44.6,11.0 C 45.5,36 46.5,68 47.2,99.5 Z",
		},
		{
			id: "MB1",
			nameRu: "Медиально-щечный 1 канал (справа, сходящийся)",
			orifice: { x: 62.0, y: 98.2 },
			apex: { x: 58.0, y: 22.5 },
			centerLine: "M 62.0,98.2 C 60.5,74 59.0,48 58.0,22.5",
			taperedLumen:
				"M 60.8,98.0 C 59.5,74 58.2,48 57.4,22.5 " +
				"L 58.6,22.5 C 60.0,48 61.5,74 63.2,98.5 Z",
		},
		{
			id: "MB2",
			nameRu: "Медиально-щечный 2 канал (MB2)",
			orifice: { x: 58.0, y: 100.5 },
			apex: { x: 55.5, y: 25.0 },
			centerLine: "M 58.0,100.5 C 57.0,74 56.0,50 55.5,25.0",
			taperedLumen:
				"M 57.0,100.5 C 56.0,74 55.0,50 54.8,25.0 " +
				"L 56.0,25.0 C 57.0,50 58.0,74 59.0,100.5 Z",
		},
		{
			id: "DB",
			nameRu: "Дистально-щечный канал (слева, наклон влево)",
			orifice: { x: 38.0, y: 98.0 },
			apex: { x: 20.0, y: 26.5 },
			centerLine: "M 38.0,98.0 C 31.0,72 24.0,47 20.0,26.5",
			taperedLumen:
				"M 37.0,98.0 C 30.0,72 23.0,47 19.4,26.5 " +
				"L 20.6,26.5 C 24.5,47 31.5,72 39.0,98.0 Z",
		},
	] as readonly Tooth17CanalAnatomy[],

	rostrumMap: {
		orifices: [
			{ id: "P", x: 46.0, y: 100.5, r: 1.35 },
			{ id: "DB", x: 38.0, y: 98.0, r: 1.15 },
			{ id: "MB1", x: 62.0, y: 98.2, r: 1.15 },
			{ id: "MB2", x: 58.0, y: 100.5, r: 0.95 },
		],
	},
} as const;
