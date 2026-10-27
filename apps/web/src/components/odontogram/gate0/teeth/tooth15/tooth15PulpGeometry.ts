/**
 * Anatomical Unified Endodontic System Geometry for Upper Second Premolar 15
 * Wheeler Ch. 10 & Cohen's Pathways of the Pulp:
 * - Single central root canal (Type I Vertucci) with apex at (50.5, 13.0).
 * - Coronal pulp chamber with prominent buccal horn at (50.0, 126.0).
 * - Seamless unified continuity from coronal chamber to apical foramen.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export interface Tooth15CanalAnatomy {
	id: "P";
	nameRu: string;
	orifice: { x: number; y: number };
	apex: { x: number; y: number };
	centerLine: string;
	taperedLumen: string;
}

export const TOOTH15_PULP_GEOMETRY = {
	// 1. SEAMLESS MONOLITHIC PULP SYSTEM (Single canal + Coronal chamber)
	unifiedPulpSystemPath:
		"M 50.9,13.0 " +
		"C 51.6,42 52.2,72 52.2,99.5 " +
		"C 53.2,107 53.0,116 51.5,126.0 " +
		"C 50.8,127.5 49.2,127.5 48.5,126.0 " +
		"C 47.0,116 46.8,107 47.8,99.5 " +
		"C 47.8,72 48.4,42 50.1,13.0 L 50.9,13.0 Z",

	// 2. CORONAL PULP CHAMBER (Single prominent buccal horn)
	coronalPulpChamber:
		"M 47.8,99.5 " +
		"C 46.8,107 47.0,116 48.5,126.0 " +
		"C 49.2,127.5 50.8,127.5 51.5,126.0 " +
		"C 53.0,116 53.2,107 52.2,99.5 " +
		"C 51.0,101.5 49.0,101.5 47.8,99.5 Z",

	// 3. SINGLE CANAL DEFINITION
	canals: [
		{
			id: "P",
			nameRu: "Магистральный корневой канал",
			orifice: { x: 50.0, y: 100.5 },
			apex: { x: 50.5, y: 13.0 },
			centerLine: "M 50.0,101.0 C 50.2,72 50.4,42 50.5,13.0",
			taperedLumen:
				"M 47.8,99.5 C 48.4,72 49.2,42 50.1,13.0 " +
				"L 50.9,13.0 C 51.8,42 52.2,72 52.2,99.5 Z",
		},
	] as readonly Tooth15CanalAnatomy[],

	rostrumMap: {
		orifices: [
			{ id: "P", x: 50.0, y: 100.5, r: 1.4 },
		],
	},
} as const;
