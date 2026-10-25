/**
 * DENTE Dental CRM — Wheeler Ch. 11 Mandibular Second Premolar (Tooth 45) Pulp & Canal
 * Narrow coronal pulp chamber with 3 horns & conical root canal down to Y=144.5.
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
	// Narrow coronal pulp chamber with 3 horns inside 50px premolar crown
	coronalPulpChamber:
		"M 47.0,74.5 " +
		"C 43.0,72.5 39.0,62.0 39.0,52.0 " +
		"C 39.0,42.0 42.0,30.0 44.5,25.0 " + // Buccal/ML Horn
		"C 46.5,28.5 48.0,30.0 49.5,27.0 " + // Center dip
		"C 51.5,30.0 53.5,29.0 55.5,26.0 " + // DL Horn
		"C 55.5,42.0 56.5,62.0 53.5,72.5 " +
		"C 52.0,74.5 49.0,74.5 47.0,74.5 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Центральный корневой канал",
			orifice: { x: 50.2, y: 74.5 },
			apex: { x: 42.0, y: 144.5 },
			centerLine:
				"M 50.2,74.5 C 48.2,95.0 45.2,120.0 42.0,144.5",
			taperedLumen:
				"M 47.5,74.5 C 45.5,95.0 43.5,120.0 41.1,144.5 " +
				"L 42.9,144.5 C 46.5,120.0 51.5,95.0 53.0,74.5 Z",
		},
	] as readonly Tooth45CanalAnatomy[],
	rostrumMap: {
		grooves: "M 47.0,74.5 C 48.5,76.5 51.5,76.5 53.0,74.5",
		orifices: [{ id: "Main", x: 50.2, y: 74.5, r: 1.6 }],
	},
	neuroPlexus: [
		{ id: "buccal_trunk", d: "M 49.5,27.0 C 49.8,42.0 50.0,58.0 50.2,74.5" },
	] as const,
} as const;
