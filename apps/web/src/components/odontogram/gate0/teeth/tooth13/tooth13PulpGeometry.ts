/**
 * Anatomical Unified Endodontic System Geometry for Upper Canine 13
 * Wheeler Ch. 8 & Cohen's Pathways of the Pulp:
 * - Single massive root canal (Type I Vertucci) with apex at (45.0, 4.5).
 * - Coronal pulp chamber with prominent canine pulp horn at (51.0, 128.0).
 * - Seamless unified continuity from coronal chamber to apical foramen.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export interface Tooth13CanalAnatomy {
	id: "C";
	nameRu: string;
	orifice: { x: number; y: number };
	apex: { x: number; y: number };
	centerLine: string;
	taperedLumen: string;
}

export const TOOTH13_PULP_GEOMETRY = {
	// 1. SEAMLESS MONOLITHIC PULP SYSTEM
	unifiedPulpSystemPath:
		"M 45.4,4.5 " +
		"C 46.2,30.0 48.0,65.0 52.0,99.5 " +
		"C 53.0,108.0 53.0,118.0 51.5,128.0 " +
		"C 50.8,129.5 49.2,129.5 48.5,128.0 " +
		"C 47.0,118.0 46.8,108.0 47.8,99.5 " +
		"C 45.0,65.0 44.5,30.0 44.6,4.5 L 45.4,4.5 Z",

	// 2. CORONAL PULP CHAMBER (Single sharp canine pulp horn)
	coronalPulpChamber:
		"M 47.8,99.5 " +
		"C 46.8,108.0 47.0,118.0 48.5,128.0 " +
		"C 49.2,129.5 50.8,129.5 51.5,128.0 " +
		"C 53.0,118.0 53.2,108.0 52.2,99.5 " +
		"C 51.0,101.5 49.0,101.5 47.8,99.5 Z",

	// 3. SINGLE CANAL DEFINITION
	canals: [
		{
			id: "C",
			nameRu: "Магистральный канал клыка",
			orifice: { x: 50.0, y: 100.5 },
			apex: { x: 45.0, y: 4.5 },
			centerLine: "M 50.0,100.5 C 48.5,65.0 46.5,30.0 45.0,4.5",
			taperedLumen:
				"M 47.8,99.5 C 46.0,65.0 45.0,30.0 44.6,4.5 " +
				"L 45.4,4.5 C 46.8,30.0 49.5,65.0 52.2,99.5 Z",
		},
	] as readonly Tooth13CanalAnatomy[],

	rostrumMap: {
		orifices: [
			{ id: "C", x: 50.0, y: 100.5, r: 1.5 },
		],
	},
} as const;
