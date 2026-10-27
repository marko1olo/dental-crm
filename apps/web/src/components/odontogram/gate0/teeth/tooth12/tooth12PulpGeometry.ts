/**
 * DENTE Dental CRM — Wheeler Ch. 8 Maxillary Lateral Incisor (Tooth 12) Pulp & Canal
 * Slender curved pulp canal with distal apical tilt (apex at 55.0, 16.5).
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export interface Tooth12CanalAnatomy {
	id: "Main";
	nameRu: string;
	orifice: { x: number; y: number };
	apex: { x: number; y: number };
	centerLine: string;
	taperedLumen: string;
}

export const TOOTH12_PULP_GEOMETRY = {
	coronalPulpChamber:
		"M 46.5,72.0 " +
		"C 42.0,75.0 38.0,88.0 37.0,102.0 " +
		"C 36.5,108.0 37.0,116.0 38.5,121.0 " + // Distal horn
		"C 43.0,119.5 47.0,121.0 51.0,123.0 " +
		"C 55.0,121.0 59.0,119.5 62.5,121.0 " + // Mesial horn
		"C 64.0,116.0 64.5,108.0 64.0,102.0 " +
		"C 63.0,88.0 58.0,75.0 53.5,72.0 " +
		"C 51.5,70.5 48.5,70.5 46.5,72.0 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Центральный корневой канал",
			orifice: { x: 50.0, y: 71.5 },
			apex: { x: 55.0, y: 16.5 },
			centerLine:
				"M 50.0,71.5 C 51.5,52.0 53.5,34.0 55.0,16.5",
			taperedLumen:
				"M 47.5,71.5 C 49.0,52.0 52.0,34.0 54.2,16.5 " +
				"C 54.8,16.5 55.6,16.5 55.8,16.5 " +
				"C 55.0,34.0 53.5,52.0 52.5,71.5 Z",
		},
	] as readonly Tooth12CanalAnatomy[],
	rostrumMap: {
		grooves: "M 47.5,71.5 C 49.0,70.0 51.5,70.0 52.5,71.5",
		orifices: [{ id: "Main", x: 50.0, y: 71.5, r: 1.3 }],
	},
	neuroPlexus: [
		{ id: "central_trunk", d: "M 50.0,71.5 C 50.0,88.0 50.0,104.0 50.0,121.0" },
	] as const,
} as const;
