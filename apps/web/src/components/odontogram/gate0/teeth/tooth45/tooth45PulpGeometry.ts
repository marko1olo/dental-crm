/**
 * DENTE Dental CRM — Wheeler Ch. 11 Mandibular Second Premolar (Tooth 45) Pulp & Canal
 * 3 Pulp Horns (Buccal, ML, DL) & 1 Wide Central Oval Root Canal.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 170".
 */

export interface Tooth45CanalAnatomy {
	id: "Main";
	nameRu: string;
	orifice: { x: number; y: number };
	apex: { x: number; y: number };
	centerLine: string;
	taperedLumen: string;
}

export const TOOTH45_PULP_GEOMETRY = {
	coronalPulpChamber:
		"M 35.0,71.0 C 34.0,63.0 34.0,55.0 35.0,50.0 C 36.5,45.0 39.5,46.0 41.5,51.0 " +
		"C 44.5,47.0 48.0,43.0 51.5,47.0 C 53.5,51.0 56.5,46.0 58.5,50.0 " +
		"C 60.5,55.0 64.0,63.0 65.0,71.0 C 58.0,71.0 53.0,69.5 50.0,68.5 " +
		"C 47.0,68.5 42.0,69.5 35.0,71.0 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Центральный корневой канал",
			orifice: { x: 50.0, y: 71.0 },
			apex: { x: 51.0, y: 145.5 },
			centerLine:
				"M 50.0,71.0 C 49.8,92.0 50.2,118.0 50.8,135.0 C 50.9,140.0 51.0,143.0 51.0,145.5",
			taperedLumen:
				"M 46.5,71.0 C 46.2,92.0 47.0,118.0 48.5,135.0 C 49.0,140.0 49.8,143.0 50.2,145.5 " +
				"L 51.8,145.5 C 52.2,143.0 52.8,140.0 53.2,135.0 C 54.5,118.0 54.8,92.0 53.5,71.0 Z",
		},
	] as readonly Tooth45CanalAnatomy[],
	rostrumMap: {
		grooves:
			"M 46.5,71.0 C 46.5,73.0 48.0,74.0 50.0,74.0 C 52.0,74.0 53.5,73.0 53.5,71.0 " +
			"M 46.5,71.0 C 48.0,69.0 52.0,69.0 53.5,71.0",
		orifices: [{ id: "Main", x: 50.0, y: 71.0, r: 1.8 }],
	},
	neuroPlexus: [
		{ id: "axial_trunk", d: "M 49.5,46.0 C 49.8,55.0 50.0,64.0 50.0,71.0" },
	] as const,
} as const;
