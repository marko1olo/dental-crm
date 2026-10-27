/**
 * Anatomical Unified Endodontic System Geometry for Upper Central Incisor 11
 * Wheeler Ch. 6 & Cohen's Pathways of the Pulp:
 * - Wide, straight, centered single root canal (apex 50.0, 12.5).
 * - Broad coronal pulp chamber with 3 incisal horns.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export interface Tooth11CanalAnatomy {
	id: "M";
	nameRu: string;
	orifice: { x: number; y: number };
	apex: { x: number; y: number };
	centerLine: string;
	taperedLumen: string;
}

export const TOOTH11_PULP_GEOMETRY = {
	// 1. SEAMLESS MONOLITHIC PULP SYSTEM
	unifiedPulpSystemPath:
		"M 50.5,12.5 " +
		"C 51.5,35.0 52.5,68.0 53.0,99.5 " +
		"C 54.5,108.0 55.5,118.0 54.0,126.0 " +
		"C 53.0,128.0 51.0,127.5 50.0,126.0 " +
		"C 49.0,127.5 47.0,128.0 46.0,126.0 " +
		"C 44.5,118.0 45.5,108.0 47.0,99.5 " +
		"C 47.5,68.0 48.5,35.0 49.5,12.5 L 50.5,12.5 Z",

	// 2. CORONAL PULP CHAMBER (Broad chamber with 3 incisal horns)
	coronalPulpChamber:
		"M 47.0,99.5 " +
		"C 45.5,108.0 44.5,118.0 46.0,126.0 " +
		"C 47.0,128.0 49.0,127.5 50.0,126.0 " +
		"C 51.0,127.5 53.0,128.0 54.0,126.0 " +
		"C 55.5,118.0 54.5,108.0 53.0,99.5 " +
		"C 51.5,101.5 48.5,101.5 47.0,99.5 Z",

	// 3. SINGLE CANAL DEFINITION
	canals: [
		{
			id: "M",
			nameRu: "Магистральный канал центрального резца",
			orifice: { x: 50.0, y: 100.5 },
			apex: { x: 50.0, y: 12.5 },
			centerLine: "M 50.0,100.5 C 50.0,70.0 50.0,40.0 50.0,12.5",
			taperedLumen:
				"M 47.0,99.5 C 47.5,68.0 48.5,35.0 49.5,12.5 " +
				"L 50.5,12.5 C 51.5,35.0 52.5,68.0 53.0,99.5 Z",
		},
	] as readonly Tooth11CanalAnatomy[],

	rostrumMap: {
		orifices: [
			{ id: "M", x: 50.0, y: 100.5, r: 1.4 },
		],
	},
} as const;
