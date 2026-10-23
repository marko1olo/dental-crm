/**
 * DENTE Dental CRM — Wheeler Ch. 11 Mandibular First Premolar (Tooth 44) Pulp & Canal
 * Asymmetric Pulp (Dominant Buccal Horn, Low Lingual) & 1 Central Oval Canal.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 170".
 */

export interface Tooth44CanalAnatomy {
	id: "Main";
	nameRu: string;
	orifice: { x: number; y: number };
	apex: { x: number; y: number };
	centerLine: string;
	taperedLumen: string;
}

export const TOOTH44_PULP_GEOMETRY = {
	coronalPulpChamber:
		"M 36.0,71.0 C 35.0,63.0 35.0,55.0 36.0,50.0 C 37.5,45.0 41.0,43.0 44.0,47.0 " +
		"C 45.5,43.0 47.0,38.0 48.5,43.0 C 51.0,48.0 53.0,53.0 56.0,56.0 " +
		"C 58.0,59.0 62.0,64.0 63.5,71.0 C 57.0,71.0 53.0,69.5 50.0,68.5 " +
		"C 47.0,68.5 42.0,69.5 36.0,71.0 Z",
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
	] as readonly Tooth44CanalAnatomy[],
	rostrumMap: {
		grooves:
			"M 46.5,71.0 C 46.5,73.0 48.0,74.0 50.0,74.0 C 52.0,74.0 53.5,73.0 53.5,71.0 " +
			"M 46.5,71.0 C 48.0,69.0 52.0,69.0 53.5,71.0",
		orifices: [{ id: "Main", x: 50.0, y: 71.0, r: 1.7 }],
	},
	neuroPlexus: [
		{ id: "buccal_trunk", d: "M 48.0,42.0 C 48.8,51.0 49.5,61.0 50.0,71.0" },
	] as const,
} as const;
