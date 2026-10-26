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
		"M 46.0,91.5 " +
		"C 41.0,94.0 36.0,104.0 35.0,114.0 " +
		"C 34.5,119.0 35.0,123.0 36.5,126.0 " + // Distal horn
		"C 41.0,124.0 45.0,125.0 50.0,128.0 " + // Center horn
		"C 55.0,125.0 59.0,124.0 63.5,126.0 " + // Mesial horn
		"C 65.0,123.0 65.5,119.0 65.0,114.0 " +
		"C 64.0,104.0 59.0,94.0 54.0,91.5 " +
		"C 52.0,90.0 48.0,90.0 46.0,91.5 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Центральный корневой канал",
			orifice: { x: 50.0, y: 91.0 },
			apex: { x: 50.0, y: 16.5 },
			centerLine:
				"M 50.0,91.0 L 50.0,16.5",
			taperedLumen:
				"M 47.0,91.0 C 47.4,68.0 48.5,40.0 49.1,16.5 " +
				"L 50.9,16.5 C 51.5,40.0 52.6,68.0 53.0,91.0 Z",
		},
	] as readonly Tooth11CanalAnatomy[],
	rostrumMap: {
		grooves: "M 47.0,91.0 C 48.5,89.5 51.5,89.5 53.0,91.0",
		orifices: [{ id: "Main", x: 50.0, y: 91.0, r: 1.4 }],
	},
	neuroPlexus: [
		{ id: "central_trunk", d: "M 50.0,91.0 C 50.0,103.0 50.0,115.0 50.0,127.0" },
	] as const,
} as const;
