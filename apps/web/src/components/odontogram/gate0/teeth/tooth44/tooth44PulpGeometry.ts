/**
 * DENTE Dental CRM — Wheeler Ch. 11 Mandibular First Premolar (Tooth 44) Pulp & Canal
 * Asymmetric Anatomical Pulp (Dominant Buccal Horn X=36 Y=47, Diminutive Lingual X=62 Y=56)
 * Smooth anatomical transition to canal orifice at Y=74.5-76.
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
	// Anatomical coronal pulp chamber with dominant buccal horn & low lingual horn
	coronalPulpChamber:
		"M 47.0,74.5 " +
		"C 39.0,72.5 33.0,66.0 32.0,57.0 " +
		"C 31.5,51.0 33.5,47.0 36.0,47.0 " +
		"C 38.5,47.0 42.5,51.5 45.5,54.0 " +
		"C 47.5,55.5 50.0,55.5 52.0,54.5 " +
		"C 55.5,53.0 59.5,52.5 62.0,56.0 " +
		"C 64.5,59.5 66.5,65.0 64.5,70.5 " +
		"C 62.5,73.5 57.0,74.5 53.0,74.5 " +
		"C 51.5,75.8 48.5,75.8 47.0,74.5 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Центральный корневой канал",
			orifice: { x: 50.0, y: 74.5 },
			apex: { x: 51.0, y: 145.5 },
			centerLine:
				"M 50.0,74.5 C 49.8,93.0 50.2,118.0 50.8,135.0 C 50.9,140.0 51.0,143.0 51.0,145.5",
			taperedLumen:
				"M 47.0,74.5 C 46.8,93.0 47.5,118.0 48.8,135.0 C 49.2,140.0 49.8,143.0 50.2,145.5 " +
				"L 51.8,145.5 C 52.2,143.0 52.8,140.0 53.2,135.0 C 54.2,118.0 54.8,93.0 53.0,74.5 Z",
		},
	] as readonly Tooth44CanalAnatomy[],
	rostrumMap: {
		grooves:
			"M 47.0,74.5 C 48.0,76.5 52.0,76.5 53.0,74.5 " +
			"M 47.5,73.5 C 49.0,72.5 51.0,72.5 52.5,73.5",
		orifices: [{ id: "Main", x: 50.0, y: 74.5, r: 1.8 }],
	},
	neuroPlexus: [
		{ id: "buccal_trunk", d: "M 36.5,48.0 C 39.0,56.0 45.0,66.0 50.0,74.5" },
	] as const,
} as const;
