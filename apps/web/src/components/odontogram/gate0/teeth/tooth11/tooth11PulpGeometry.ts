/**
 * DENTE Dental CRM — Wheeler Ch. 8 Maxillary Central Incisor (Tooth 11) Pulp & Canal
 * Wide pulp chamber with 3 distinct mamelon horns & wide cylindrical canal to apex (50.0, 14.5).
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
		"M 46.0,93.5 " +
		"C 42.0,96.0 38.0,105.0 37.0,115.0 " +
		"C 36.5,120.0 37.0,123.0 38.5,126.0 " + // Mesial horn
		"C 42.0,124.0 46.0,125.0 50.0,128.0 " + // Center horn
		"C 54.0,125.0 58.0,124.0 61.5,126.0 " + // Distal horn
		"C 63.0,123.0 63.5,120.0 63.0,115.0 " +
		"C 62.0,105.0 58.0,96.0 54.0,93.5 " +
		"C 52.0,92.0 48.0,92.0 46.0,93.5 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Центральный корневой канал",
			orifice: { x: 50.0, y: 93.0 },
			apex: { x: 50.0, y: 14.5 },
			centerLine:
				"M 50.0,93.0 L 50.0,14.5",
			taperedLumen:
				"M 47.2,93.0 C 47.5,70.0 48.5,42.0 49.1,14.5 " +
				"L 50.9,14.5 C 51.5,42.0 52.5,70.0 52.8,93.0 Z",
		},
	] as readonly Tooth11CanalAnatomy[],
	rostrumMap: {
		grooves: "M 47.0,93.0 C 48.5,91.5 51.5,91.5 53.0,93.0",
		orifices: [{ id: "Main", x: 50.0, y: 93.0, r: 1.4 }],
	},
	neuroPlexus: [
		{ id: "central_trunk", d: "M 50.0,93.0 C 50.0,104.0 50.0,116.0 50.0,127.0" },
	] as const,
} as const;
