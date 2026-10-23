/**
 * DENTE Dental CRM — Wheeler Ch. 10 Mandibular Lateral Incisor (Tooth 42) Pulp & Canal
 * Flattened pulp chamber inside 42px chisel crown, slender central canal down to Y=142.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 205".
 */

export interface Tooth42CanalAnatomy {
	id: "Main";
	nameRu: string;
	orifice: { x: number; y: number };
	apex: { x: number; y: number };
	centerLine: string;
	taperedLumen: string;
}

export const TOOTH42_PULP_GEOMETRY = {
	// Coronal pulp chamber with subtle incisal projections
	coronalPulpChamber:
		"M 47.0,70.0 " +
		"C 44.0,68.0 43.0,58.0 43.0,46.0 " +
		"C 43.0,38.0 44.5,32.0 45.5,29.0 " + // Mesial horn
		"C 47.0,31.0 49.0,28.5 50.0,28.5 " + // Central horn
		"C 51.5,28.5 53.0,32.0 54.5,30.0 " + // Distal horn
		"C 55.5,38.0 57.0,46.0 57.0,58.0 " +
		"C 57.0,68.0 55.0,68.0 53.0,70.0 " +
		"C 51.5,71.5 48.5,71.5 47.0,70.0 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Центральный корневой канал",
			orifice: { x: 50.0, y: 70.0 },
			apex: { x: 50.5, y: 142.0 },
			centerLine:
				"M 50.0,70.0 C 50.0,92.0 50.2,118.0 50.5,142.0",
			taperedLumen:
				"M 48.0,70.0 C 48.5,92.0 49.3,118.0 49.9,142.0 " +
				"L 51.1,142.0 C 51.7,118.0 52.5,92.0 53.0,70.0 Z",
		},
	] as readonly Tooth42CanalAnatomy[],
	rostrumMap: {
		grooves: "M 48.0,70.0 C 49.0,71.5 51.5,71.5 52.5,70.0",
		orifices: [{ id: "Main", x: 50.0, y: 70.0, r: 1.3 }],
	},
	neuroPlexus: [
		{ id: "incisor_trunk", d: "M 50.0,31.0 C 50.0,45.0 50.0,58.0 50.0,70.0" },
	] as const,
} as const;
