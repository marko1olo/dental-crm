/**
 * Anatomical Unified Endodontic System Geometry for Upper Lateral Incisor 12
 * Wheeler Ch. 7 & Cohen's Pathways of the Pulp:
 * - Single slender canal with distal hook at apex (43.0, 14.0).
 * - Coronal pulp chamber with delicate incisal horns.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export interface Tooth12CanalAnatomy {
	id: "L";
	nameRu: string;
	orifice: { x: number; y: number };
	apex: { x: number; y: number };
	centerLine: string;
	taperedLumen: string;
}

export const TOOTH12_PULP_GEOMETRY = {
	// 1. SEAMLESS MONOLITHIC PULP SYSTEM
	unifiedPulpSystemPath:
		"M 43.4,14.0 " +
		"C 44.5,35.0 47.0,68.0 51.5,99.5 " +
		"C 52.5,108.0 52.5,118.0 51.0,126.0 " +
		"C 50.5,127.5 49.0,127.5 48.5,126.0 " +
		"C 47.0,118.0 47.0,108.0 48.0,99.5 " +
		"C 45.0,68.0 43.5,35.0 42.6,14.0 L 43.4,14.0 Z",

	// 2. CORONAL PULP CHAMBER
	coronalPulpChamber:
		"M 48.0,99.5 " +
		"C 47.0,108.0 47.0,118.0 48.5,126.0 " +
		"C 49.0,127.5 50.5,127.5 51.0,126.0 " +
		"C 52.5,118.0 52.5,108.0 51.5,99.5 " +
		"C 50.5,101.5 49.0,101.5 48.0,99.5 Z",

	// 3. SINGLE CANAL DEFINITION
	canals: [
		{
			id: "L",
			nameRu: "Магистральный канал латерального резца",
			orifice: { x: 50.0, y: 100.5 },
			apex: { x: 43.0, y: 14.0 },
			centerLine: "M 50.0,100.5 C 48.5,68.0 46.0,35.0 43.0,14.0",
			taperedLumen:
				"M 48.0,99.5 C 46.0,68.0 44.5,35.0 42.6,14.0 " +
				"L 43.4,14.0 C 45.0,35.0 48.0,68.0 51.5,99.5 Z",
		},
	] as readonly Tooth12CanalAnatomy[],

	rostrumMap: {
		orifices: [
			{ id: "L", x: 50.0, y: 100.5, r: 1.3 },
		],
	},
} as const;
