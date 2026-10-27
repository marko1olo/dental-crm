/**
 * Anatomical Unified Endodontic System Geometry for Upper First Premolar 14
 * Wheeler Ch. 9 & Cohen's Pathways of the Pulp:
 * - 2 Separate Root Canals (85-90% incidence): Buccal (B) and Palatal (P).
 * - Buccal canal apex at (44.0, 12.0), Palatal canal apex at (54.5, 10.5).
 * - Coronal pulp chamber with 2 pulp horns (prominent buccal horn, smaller palatal).
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export interface Tooth14CanalAnatomy {
	id: "B" | "P";
	nameRu: string;
	orifice: { x: number; y: number };
	apex: { x: number; y: number };
	centerLine: string;
	taperedLumen: string;
}

export const TOOTH14_PULP_GEOMETRY = {
	// 1. SEAMLESS UNIFIED PULP SYSTEM (Coronal chamber + 2 root canals)
	unifiedPulpSystemPath:
		"M 44.4,12.0 " +
		"C 45.2,30.0 46.5,55.0 46.5,80.0 " +
		"C 46.5,92.0 46.0,98.0 45.0,105.0 " +
		"C 44.0,114.0 45.5,124.0 50.5,127.0 " +
		"C 51.5,127.5 53.0,126.0 54.0,123.0 " +
		"C 55.5,117.0 55.5,108.0 55.0,102.0 " +
		"C 55.0,92.0 55.5,70.0 55.2,35.0 " +
		"C 55.0,22.0 54.8,14.0 54.8,10.5 " +
		"L 54.2,10.5 " +
		"C 53.8,20.0 53.5,45.0 51.0,72.0 " +
		"C 49.5,84.0 48.0,92.0 47.0,85.0 " +
		"C 46.0,70.0 44.5,40.0 43.6,12.0 Z",

	// 2. CORONAL PULP CHAMBER (2 Horns & Bifurcation Floor)
	coronalPulpChamber:
		"M 45.0,102.0 " +
		"C 44.0,112.0 45.0,123.0 50.5,127.0 " +
		"C 51.5,127.5 53.0,126.0 54.0,123.0 " +
		"C 55.5,117.0 55.5,108.0 55.0,102.0 " +
		"C 53.0,104.0 51.0,104.5 49.5,103.0 " +
		"C 48.0,101.5 46.5,101.5 45.0,102.0 Z",

	// 3. TWO ROOT CANALS (Buccal B and Palatal P)
	canals: [
		{
			id: "B",
			nameRu: "Щечный корневой канал",
			orifice: { x: 47.0, y: 99.5 },
			apex: { x: 44.0, y: 12.0 },
			centerLine: "M 47.0,99.5 C 46.2,74.0 45.2,42.0 44.0,12.0",
			taperedLumen:
				"M 45.5,99.0 C 45.0,72.0 44.2,42.0 43.6,12.0 " +
				"L 44.4,12.0 C 45.2,42.0 46.5,72.0 47.5,99.0 Z",
		},
		{
			id: "P",
			nameRu: "Нёбный корневой канал",
			orifice: { x: 53.5, y: 99.5 },
			apex: { x: 54.5, y: 10.5 },
			centerLine: "M 53.5,99.5 C 54.0,72.0 54.2,42.0 54.5,10.5",
			taperedLumen:
				"M 52.5,99.0 C 53.0,72.0 53.8,42.0 54.2,10.5 " +
				"L 55.0,10.5 C 55.2,42.0 55.0,72.0 54.5,99.0 Z",
		},
	] as readonly Tooth14CanalAnatomy[],

	rostrumMap: {
		orifices: [
			{ id: "B", x: 47.0, y: 99.5, r: 1.2 },
			{ id: "P", x: 53.5, y: 99.5, r: 1.3 },
		],
	},
} as const;
