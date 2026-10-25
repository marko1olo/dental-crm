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
	// Compact anatomical coronal pulp chamber inside cervical half (Wheeler Ch. 11)
	coronalPulpChamber:
		"M 48.4,74.5 " +
		"C 46.0,72.5 44.5,64.0 44.5,56.0 " +
		"C 44.5,48.0 45.2,43.0 46.5,40.0 " + // Buccal Horn at 40.0
		"C 48.0,42.0 49.0,43.5 49.8,41.5 " + // Center dip
		"C 51.5,43.5 53.0,43.0 54.5,40.5 " + // DL Horn at 40.5
		"C 54.5,48.0 55.0,64.0 52.0,72.5 " +
		"C 51.2,74.5 49.5,74.5 48.4,74.5 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Центральный корневой канал",
			orifice: { x: 50.2, y: 74.5 },
			apex: { x: 42.0, y: 144.5 },
			centerLine:
				"M 50.2,74.5 C 48.2,95.0 45.2,120.0 42.0,144.5",
			taperedLumen:
				"M 48.4,74.5 C 46.5,95.0 44.2,120.0 41.3,144.5 " +
				"L 42.7,144.5 C 46.0,120.0 50.5,95.0 52.0,74.5 Z",
		},
	] as readonly Tooth45CanalAnatomy[],
	rostrumMap: {
		grooves: "M 48.4,74.5 C 49.5,76.0 51.0,76.0 52.0,74.5",
		orifices: [{ id: "Main", x: 50.2, y: 74.5, r: 1.1 }],
	},
	neuroPlexus: [
		{ id: "buccal_trunk", d: "M 49.8,41.5 C 50.0,52.0 50.0,62.0 50.2,74.5" },
	] as const,
} as const;
