/**
 * DENTE Dental CRM — Wheeler Ch. 10 Mandibular Central Incisor (Tooth 41) Pulp & Canal
 * Symmetrical narrow pulp chamber with 3 subtle incisal horns, slender straight canal down to Y=141.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 204".
 */

export interface Tooth41CanalAnatomy {
	id: "Main";
	nameRu: string;
	orifice: { x: number; y: number };
	apex: { x: number; y: number };
	centerLine: string;
	taperedLumen: string;
}

export const TOOTH41_PULP_GEOMETRY = {
	// Narrow symmetrical coronal pulp chamber inside narrow 38px chisel crown
	coronalPulpChamber:
		"M 47.5,69.5 " +
		"C 45.0,67.5 44.0,58.0 44.0,46.0 " +
		"C 44.0,38.0 45.5,31.0 46.5,28.0 " + // Mesial horn
		"C 48.0,31.0 49.0,27.5 50.0,27.5 " + // Central horn
		"C 51.0,27.5 52.0,31.0 53.5,28.0 " + // Distal horn
		"C 54.5,31.0 56.0,38.0 56.0,46.0 " +
		"C 56.0,58.0 55.0,67.5 52.5,69.5 " +
		"C 51.5,71.0 48.5,71.0 47.5,69.5 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Центральный корневой канал",
			orifice: { x: 50.0, y: 69.5 },
			apex: { x: 48.4, y: 141.0 },
			centerLine:
				"M 50.0,69.5 C 50.0,92.0 49.6,118.0 48.4,141.0",
			taperedLumen:
				"M 48.0,69.5 C 48.5,92.0 48.8,118.0 47.8,141.0 " +
				"L 49.0,141.0 C 50.4,118.0 51.5,92.0 52.0,69.5 Z",
		},
	] as readonly Tooth41CanalAnatomy[],
	rostrumMap: {
		grooves: "M 48.0,69.5 C 49.0,71.0 51.0,71.0 52.0,69.5",
		orifices: [{ id: "Main", x: 50.0, y: 69.5, r: 1.2 }],
	},
	neuroPlexus: [
		{ id: "central_incisor_trunk", d: "M 50.0,30.0 C 50.0,45.0 50.0,58.0 50.0,69.5" },
	] as const,
} as const;
