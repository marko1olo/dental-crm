/**
 * Anatomical Unified Endodontic System Geometry for Upper Third Molar 18
 * Wheeler Ch. 12 & Cohen's Pathways of the Pulp:
 * - Seamless unified pulp system: coronal chamber + 3 tightly convergent fused canals (P, MB, DB).
 * - Canals converge into a dense cluster with DISTAL HOOK TO THE LEFT (DB: 37.0, P: 41.0, MB: 48.0).
 * - Inverted physiological dome: 2 rounded horns.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export interface Tooth18CanalAnatomy {
	id: "P" | "MB1" | "DB";
	nameRu: string;
	orifice: { x: number; y: number };
	apex: { x: number; y: number };
	centerLine: string;
	taperedLumen: string;
}

export const TOOTH18_PULP_GEOMETRY = {
	// 1. SEAMLESS MONOLITHIC PULP SYSTEM (Chamber + 3 tightly convergent canals hooked left)
	unifiedPulpSystemPath:
		"M 36.4,23.0 " +
		"C 35.0,45 36.5,70 38.0,98.0 " +
		"C 37.0,103.0 36.5,109.0 38.0,113.0 " +
		"C 39.2,116.5 42.5,116.5 44.5,114.5 " +
		"C 47.5,110.5 52.5,110.5 54.8,115.0 " +
		"C 56.0,119.0 59.0,119.0 60.0,116.0 " +
		"C 61.2,111.5 61.8,105.0 61.5,98.0 " +
		"C 59.0,70 54.0,42 48.1,22.5 L 46.9,22.5 " +
		"C 51.0,42 55.0,70 57.0,98.5 " +
		"C 56.6,99.2 56.0,99.8 55.5,100.5 " +
		"C 49.0,70 46.0,42 41.6,19.0 L 40.4,19.0 " +
		"C 42.0,42 43.5,70 44.5,100.5 " +
		"C 42.5,102.0 39.5,101.5 38.5,98.0 " +
		"C 38.0,70 37.5,45 37.1,23.0 L 36.4,23.0 Z",

	// 2. COMPACT CORONAL PULP CHAMBER (2 rounded horns)
	coronalPulpChamber:
		"M 38.0,98.0 " +
		"C 37.0,104.0 37.5,111.0 38.5,114.0 " +
		"C 39.5,117.0 42.0,117.0 44.0,114.5 " +
		"C 46.5,111.0 51.5,111.0 54.5,114.5 " +
		"C 56.5,116.5 59.0,116.5 60.0,113.5 " +
		"C 61.5,109.5 61.8,103.0 61.5,98.0 " +
		"C 57.0,101.5 53.5,102.0 49.5,102.0 " +
		"C 45.5,102.0 42.0,101.5 38.0,98.0 Z",

	// 3. 3 TIGHTLY CONVERGENT ROOT CANALS (Distal hook to the LEFT, cluster spread 11px)
	canals: [
		{
			id: "P",
			nameRu: "Нёбный канал (центральный слитный)",
			orifice: { x: 47.0, y: 100.5 },
			apex: { x: 41.0, y: 19.0 },
			centerLine: "M 47.0,100.5 C 46.0,70 44.0,40 41.0,19.0",
			taperedLumen:
				"M 45.8,99.5 C 45.0,70 43.2,40 40.4,19.0 " +
				"L 41.6,19.0 C 44.5,40 46.8,70 48.0,99.5 Z",
		},
		{
			id: "MB1",
			nameRu: "Мезиобуккальный канал (сходящийся влево)",
			orifice: { x: 57.5, y: 98.2 },
			apex: { x: 48.0, y: 22.5 },
			centerLine: "M 57.5,98.2 C 55.0,70 51.5,42 48.0,22.5",
			taperedLumen:
				"M 56.5,98.0 C 54.0,70 50.8,42 47.4,22.5 " +
				"L 48.6,22.5 C 52.0,42 55.5,70 58.5,98.5 Z",
		},
		{
			id: "DB",
			nameRu: "Дистобуккальный канал (крючок влево)",
			orifice: { x: 39.5, y: 98.0 },
			apex: { x: 37.0, y: 23.0 },
			centerLine: "M 39.5,98.0 C 39.0,70 38.2,45 37.0,23.0",
			taperedLumen:
				"M 38.5,98.0 C 38.0,70 37.5,45 36.4,23.0 " +
				"L 37.6,23.0 C 38.8,45 39.5,70 40.5,98.0 Z",
		},
	] as readonly Tooth18CanalAnatomy[],

	rostrumMap: {
		orifices: [
			{ id: "P", x: 47.0, y: 100.5, r: 1.3 },
			{ id: "MB1", x: 57.5, y: 98.2, r: 1.1 },
			{ id: "DB", x: 39.5, y: 98.0, r: 1.1 },
		],
	},
} as const;
