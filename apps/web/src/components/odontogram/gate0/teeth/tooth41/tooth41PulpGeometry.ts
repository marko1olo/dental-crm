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
	// Slender delicate symmetrical coronal pulp chamber (width 7px, Wheeler Ch. 10)
	coronalPulpChamber:
		"M 48.5,70.0 " +
		"C 47.0,68.0 46.5,58.0 46.5,46.0 " +
		"C 46.5,38.0 47.5,32.0 48.0,29.0 " + // Mesial horn
		"C 49.0,31.0 49.5,28.5 50.0,28.5 " + // Central horn
		"C 50.5,28.5 51.0,31.0 52.0,29.0 " + // Distal horn
		"C 52.5,32.0 53.5,38.0 53.5,46.0 " +
		"C 53.5,58.0 53.0,68.0 51.5,70.0 " +
		"C 50.8,71.0 49.2,71.0 48.5,70.0 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Центральный корневой канал",
			orifice: { x: 50.0, y: 70.0 },
			apex: { x: 45.2, y: 141.0 },
			centerLine:
				"M 50.0,70.0 C 49.0,92.0 47.2,118.0 45.2,141.0",
			taperedLumen:
				"M 48.6,70.0 C 47.5,92.0 46.1,118.0 44.8,141.0 " +
				"L 45.6,141.0 C 47.9,118.0 50.5,92.0 51.4,70.0 Z",
		},
	] as readonly Tooth41CanalAnatomy[],
	rostrumMap: {
		grooves: "M 48.5,70.0 C 49.2,71.0 50.8,71.0 51.5,70.0",
		orifices: [{ id: "Main", x: 50.0, y: 70.0, r: 0.9 }],
	},
	neuroPlexus: [
		{ id: "central_incisor_trunk", d: "M 50.0,30.0 C 50.0,45.0 50.0,58.0 50.0,70.0" },
	] as const,
} as const;
