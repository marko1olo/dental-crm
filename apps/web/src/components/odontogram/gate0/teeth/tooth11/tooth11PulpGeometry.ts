/**
 * DENTE Dental CRM — Wheeler Ch. 8 Maxillary Central Incisor (Tooth 11) Pulp & Canal
 * Wide pulp chamber with 3 distinct mamelon horns & wide cylindrical canal to apex (50.0, 16.5).
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export interface Tooth11CanalAnatomy {
	id: "Main";
	nameRu: string;
	orifice: { x: number; y: number };
	apex: { x: number; y: number };
	centerLine: string;
	taperedLumen: string;
}

export const TOOTH11_PULP_GEOMETRY = {
	coronalPulpChamber:
		"M 46.0,71.5 " +
		"C 41.0,75.0 36.0,88.0 35.0,102.0 " +
		"C 34.5,108.0 35.0,116.0 36.5,122.0 " + // Distal horn
		"C 41.0,119.0 45.0,121.0 50.0,124.0 " + // Center horn
		"C 55.0,121.0 59.0,119.0 63.5,122.0 " + // Mesial horn
		"C 65.0,116.0 65.5,108.0 65.0,102.0 " +
		"C 64.0,88.0 59.0,75.0 54.0,71.5 " +
		"C 52.0,70.0 48.0,70.0 46.0,71.5 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Центральный корневой канал",
			orifice: { x: 50.0, y: 71.0 },
			apex: { x: 50.0, y: 16.5 },
			centerLine:
				"M 50.0,71.0 C 50.0,52.0 50.0,34.0 50.0,16.5",
			taperedLumen:
				"M 47.0,71.0 C 47.5,52.0 48.5,34.0 49.1,16.5 " +
				"C 49.5,16.5 50.5,16.5 50.9,16.5 " +
				"C 51.5,34.0 52.5,52.0 53.0,71.0 Z",
		},
	] as readonly Tooth11CanalAnatomy[],
	rostrumMap: {
		grooves: "M 47.0,71.0 C 48.5,69.5 51.5,69.5 53.0,71.0",
		orifices: [{ id: "Main", x: 50.0, y: 71.0, r: 1.4 }],
	},
	neuroPlexus: [
		{ id: "central_trunk", d: "M 50.0,71.0 C 50.0,88.0 50.0,104.0 50.0,122.0" },
	] as const,
} as const;
