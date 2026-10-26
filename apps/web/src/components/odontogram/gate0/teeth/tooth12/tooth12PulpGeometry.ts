/**
 * DENTE Dental CRM — Wheeler Ch. 8 Maxillary Lateral Incisor (Tooth 12) Pulp & Canal
 * Slender pulp chamber with mesial/distal horns & curved canal to apex (X=44.0, Y=20.0).
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
		"M 47.0,92.5 " +
		"C 45.0,94.5 43.5,103.5 43.5,113.5 " +
		"C 43.5,118.5 45.5,121.5 47.0,124.5 " + // Distal horn
		"L 53.0,124.5 " +                      // Pulp ceiling
		"C 54.5,121.5 56.5,118.5 56.5,113.5 " + // Mesial horn
		"C 56.5,103.5 55.0,94.5 53.0,92.5 " +
		"C 51.5,91.0 48.5,91.0 47.0,92.5 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Центральный корневой канал",
			orifice: { x: 50.0, y: 91.5 },
			apex: { x: 44.0, y: 20.0 },
			centerLine:
				"M 50.0,91.5 C 49.0,70.0 46.5,45.0 44.0,20.0",
			taperedLumen:
				"M 47.8,91.5 C 47.2,70.0 45.3,45.0 43.2,20.0 " +
				"L 44.8,20.0 C 47.7,45.0 50.8,70.0 52.2,91.5 Z",
		},
	] as readonly Tooth12CanalAnatomy[],
	rostrumMap: {
		grooves: "M 48.0,91.5 C 49.0,90.0 51.0,90.0 52.0,91.5",
		orifices: [{ id: "Main", x: 50.0, y: 91.5, r: 1.2 }],
	},
	neuroPlexus: [
		{ id: "lateral_trunk", d: "M 50.0,91.5 C 50.0,102.0 50.0,112.0 50.0,122.0" },
	] as const,
} as const;
