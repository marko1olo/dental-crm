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
	// Compact coronal pulp chamber with 3 horns inside premolar crown (width 11.5px, Wheeler Ch. 11)
	coronalPulpChamber:
		"M 48.4,74.5 " +
		"C 46.0,72.5 44.2,62.0 44.2,52.0 " +
		"C 44.2,42.0 45.0,32.0 46.5,27.0 " + // Buccal/ML Horn
		"C 48.0,29.5 49.0,31.0 49.8,28.5 " + // Center dip
		"C 51.5,31.0 53.0,30.0 54.5,27.5 " + // DL Horn
		"C 54.5,42.0 55.2,62.0 52.0,72.5 " +
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
		{ id: "buccal_trunk", d: "M 49.8,28.5 C 50.0,42.0 50.0,58.0 50.2,74.5" },
	] as const,
} as const;
