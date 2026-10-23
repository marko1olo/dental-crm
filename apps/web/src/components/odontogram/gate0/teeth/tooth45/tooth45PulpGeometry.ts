/**
 * DENTE Dental CRM — Wheeler Ch. 11 Mandibular Second Premolar (Tooth 45) Pulp & Canal
 * 3 Anatomical Pulp Horns (Buccal X=38 Y=47, ML X=52 Y=52, DL X=64 Y=54)
 * Smooth anatomical transition to central canal orifice at Y=74.5-76.
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
	// Coronal pulp chamber with 3 distinct anatomical horns & pulpal floor at Y=74.5
	coronalPulpChamber:
		"M 47.0,74.5 " +
		"C 39.0,72.5 33.0,65.5 32.5,57.0 " +
		"C 32.0,51.0 34.5,47.0 38.0,47.0 " +
		"C 41.0,47.0 44.5,52.0 47.5,54.5 " +
		"C 49.5,52.0 50.5,50.0 52.0,52.0 " +
		"C 54.0,54.5 57.0,57.0 59.5,56.0 " +
		"C 61.5,55.0 63.0,53.0 64.0,54.0 " +
		"C 66.5,56.5 67.5,63.0 65.5,69.5 " +
		"C 63.5,73.0 57.0,74.5 53.0,74.5 " +
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
	] as readonly Tooth45CanalAnatomy[],
	rostrumMap: {
		grooves:
			"M 47.0,74.5 C 48.0,76.5 52.0,76.5 53.0,74.5 " +
			"M 47.5,73.5 C 49.0,72.5 51.0,72.5 52.5,73.5",
		orifices: [{ id: "Main", x: 50.0, y: 74.5, r: 1.8 }],
	},
	neuroPlexus: [
		{ id: "axial_trunk", d: "M 48.0,52.0 C 49.0,60.0 49.5,68.0 50.0,74.5" },
	] as const,
} as const;
