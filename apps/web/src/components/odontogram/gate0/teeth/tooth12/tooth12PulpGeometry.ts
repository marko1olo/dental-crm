/**
 * DENTE Dental CRM — Wheeler Ch. 8 Maxillary Lateral Incisor (Tooth 12) Pulp & Canal
 * Slender pulp chamber with mesial/distal horns & curved canal to apex (X=54.0, Y=15.5).
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
		"M 47.0,94.0 " +
		"C 45.0,96.0 43.5,105.0 43.5,115.0 " +
		"C 43.5,120.0 45.5,123.0 47.0,126.0 " + // Mesial pulp horn
		"L 53.0,126.0 " +                      // Pulp ceiling
		"C 54.5,123.0 56.5,120.0 56.5,115.0 " + // Distal pulp horn
		"C 56.5,105.0 55.0,96.0 53.0,94.0 " +
		"C 51.5,92.5 48.5,92.5 47.0,94.0 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Центральный корневой канал",
			orifice: { x: 50.0, y: 93.0 },
			apex: { x: 54.0, y: 15.5 },
			centerLine:
				"M 50.0,93.0 C 49.0,72.0 51.0,46.0 54.0,15.5",
			taperedLumen:
				"M 48.0,93.0 C 47.5,72.0 49.8,46.0 53.2,15.5 " +
				"L 54.8,15.5 C 52.2,46.0 50.5,72.0 52.0,93.0 Z",
		},
	] as readonly Tooth12CanalAnatomy[],
	rostrumMap: {
		grooves: "M 48.0,93.0 C 49.0,91.5 51.0,91.5 52.0,93.0",
		orifices: [{ id: "Main", x: 50.0, y: 93.0, r: 1.2 }],
	},
	neuroPlexus: [
		{ id: "lateral_trunk", d: "M 50.0,93.0 C 50.0,103.0 50.0,113.0 50.0,123.0" },
	] as const,
} as const;
