/**
 * DENTE Dental CRM — Wheeler Ch. 11 Mandibular First Premolar (Tooth 44) Pulp & Canal
 * Narrow coronal pulp chamber with asymmetric horns & conical root canal down to Y=144.5.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 170".
 */

export interface Tooth44CanalAnatomy {
	id: "Main";
	nameRu: string;
	orifice: { x: number; y: number };
	apex: { x: number; y: number };
	centerLine: string;
	taperedLumen: string;
}

export const TOOTH44_PULP_GEOMETRY = {
	// Narrow coronal pulp chamber conforming to 48px premolar crown
	coronalPulpChamber:
		"M 47.0,74.5 " +
		"C 43.0,72.5 40.0,62.0 40.0,52.0 " +
		"C 40.0,42.0 43.5,30.0 47.5,24.0 " + // Tall Buccal Horn
		"C 48.5,28.0 50.0,34.0 51.5,33.0 " + // Crista Transversa Saddle Dip
		"C 53.0,32.0 54.5,34.5 54.5,37.0 " + // Diminutive Lingual Horn
		"C 54.5,46.0 56.0,62.0 53.5,72.5 " +
		"C 52.0,74.5 49.0,74.5 47.0,74.5 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Центральный корневой канал",
			orifice: { x: 50.2, y: 74.5 },
			apex: { x: 48.2, y: 144.5 },
			centerLine:
				"M 50.2,74.5 C 50.2,95.0 49.5,120.0 48.2,144.5",
			taperedLumen:
				"M 47.5,74.5 C 47.5,95.0 48.0,120.0 47.3,144.5 " +
				"L 49.1,144.5 C 51.0,120.0 53.0,95.0 53.0,74.5 Z",
		},
	] as readonly Tooth44CanalAnatomy[],
	rostrumMap: {
		grooves: "M 47.0,74.5 C 48.5,76.5 51.5,76.5 53.0,74.5",
		orifices: [{ id: "Main", x: 50.2, y: 74.5, r: 1.6 }],
	},
	neuroPlexus: [
		{ id: "buccal_trunk", d: "M 48.0,26.0 C 48.5,42.0 49.5,58.0 50.2,74.5" },
	] as const,
} as const;
