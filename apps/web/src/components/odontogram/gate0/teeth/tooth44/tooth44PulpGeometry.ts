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
	// Compact coronal pulp chamber conforming to premolar crown (width 11px, Wheeler Ch. 11)
	coronalPulpChamber:
		"M 48.4,74.5 " +
		"C 46.0,72.5 44.5,62.0 44.5,52.0 " +
		"C 44.5,42.0 45.5,32.0 47.5,27.0 " + // Tall Buccal Horn
		"C 48.5,30.0 50.0,36.0 51.5,35.0 " + // Crista Transversa Saddle Dip
		"C 52.5,34.0 53.5,36.5 53.5,38.5 " + // Diminutive Lingual Horn
		"C 53.5,46.0 54.5,62.0 52.0,72.5 " +
		"C 51.2,74.5 49.5,74.5 48.4,74.5 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Центральный корневой канал",
			orifice: { x: 50.2, y: 74.5 },
			apex: { x: 43.0, y: 144.5 },
			centerLine:
				"M 50.2,74.5 C 48.5,95.0 46.0,120.0 43.0,144.5",
			taperedLumen:
				"M 48.4,74.5 C 46.8,95.0 44.8,120.0 42.3,144.5 " +
				"L 43.7,144.5 C 46.5,120.0 50.5,95.0 52.0,74.5 Z",
		},
	] as readonly Tooth44CanalAnatomy[],
	rostrumMap: {
		grooves: "M 48.4,74.5 C 49.5,76.0 51.0,76.0 52.0,74.5",
		orifices: [{ id: "Main", x: 50.2, y: 74.5, r: 1.1 }],
	},
	neuroPlexus: [
		{ id: "buccal_trunk", d: "M 48.0,28.0 C 48.5,42.0 49.5,58.0 50.2,74.5" },
	] as const,
} as const;
