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
	// Slender delicate coronal pulp chamber (width 7.5px, Wheeler Ch. 10)
	coronalPulpChamber:
		"M 48.5,70.0 " +
		"C 47.0,68.0 46.2,58.0 46.2,46.0 " +
		"C 46.2,38.0 47.2,32.0 47.8,29.5 " + // Mesial horn
		"C 48.8,31.0 49.5,29.0 50.0,29.0 " + // Central horn
		"C 50.8,29.0 51.5,31.5 52.5,30.0 " + // Distal horn
		"C 53.0,38.0 53.8,46.0 53.8,58.0 " +
		"C 53.8,68.0 53.0,68.0 51.5,70.0 " +
		"C 50.8,71.0 49.2,71.0 48.5,70.0 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Центральный корневой канал",
			orifice: { x: 50.0, y: 70.0 },
			apex: { x: 42.3, y: 142.0 },
			centerLine:
				"M 50.0,70.0 C 48.5,92.0 45.5,118.0 42.3,142.0",
			taperedLumen:
				"M 48.6,70.0 C 47.2,92.0 44.4,118.0 41.8,142.0 " +
				"L 42.8,142.0 C 46.2,118.0 50.4,92.0 51.4,70.0 Z",
		},
	] as readonly Tooth42CanalAnatomy[],
	rostrumMap: {
		grooves: "M 48.5,70.0 C 49.2,71.0 50.8,71.0 51.5,70.0",
		orifices: [{ id: "Main", x: 50.0, y: 70.0, r: 0.9 }],
	},
	neuroPlexus: [
		{ id: "incisor_trunk", d: "M 50.0,31.0 C 50.0,45.0 50.0,58.0 50.0,70.0" },
	] as const,
} as const;
