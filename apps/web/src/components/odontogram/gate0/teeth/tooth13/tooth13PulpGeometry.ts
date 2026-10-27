/**
 * DENTE Dental CRM — Wheeler Ch. 9 Maxillary Canine (Tooth 13) Pulp & Canal
 * Massive pointed pulp horn & single deep canal to apex (50.0, 10.5).
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export interface Tooth13CanalAnatomy {
	id: "Main";
	nameRu: string;
	orifice: { x: number; y: number };
	apex: { x: number; y: number };
	centerLine: string;
	taperedLumen: string;
}

export const TOOTH13_PULP_GEOMETRY = {
	coronalPulpChamber:
		"M 46.5,72.0 " +
		"C 41.5,76.0 37.0,90.0 36.0,105.0 " +
		"C 35.5,112.0 38.0,122.0 50.0,132.0 " + // Tall pointed canine cusp horn
		"C 62.0,122.0 64.5,112.0 64.0,105.0 " +
		"C 63.0,90.0 58.5,76.0 53.5,72.0 " +
		"C 51.5,70.5 48.5,70.5 46.5,72.0 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Центральный корневой канал",
			orifice: { x: 50.0, y: 71.0 },
			apex: { x: 50.0, y: 10.5 },
			centerLine:
				"M 50.0,71.0 C 50.0,48.0 50.0,28.0 50.0,10.5",
			taperedLumen:
				"M 47.0,71.0 C 47.5,48.0 48.5,28.0 49.0,10.5 " +
				"C 49.5,10.5 50.5,10.5 51.0,10.5 " +
				"C 51.5,28.0 52.5,48.0 53.0,71.0 Z",
		},
	] as readonly Tooth13CanalAnatomy[],
	rostrumMap: {
		grooves: "M 47.0,71.0 C 48.5,69.5 51.5,69.5 53.0,71.0",
		orifices: [{ id: "Main", x: 50.0, y: 71.0, r: 1.4 }],
	},
	neuroPlexus: [
		{ id: "central_trunk", d: "M 50.0,71.0 C 50.0,88.0 50.0,106.0 50.0,128.0" },
	] as const,
} as const;
