/**
 * DENTE Dental CRM — Wheeler Ch. 11 Mandibular Canine (Tooth 43) Pulp & Canal
 * Tall spear-like pulp horn (Y=20.0) & deepest root canal down to Y=159.0.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 220".
 */

export interface Tooth43CanalAnatomy {
	id: "Main";
	nameRu: string;
	orifice: { x: number; y: number };
	apex: { x: number; y: number };
	centerLine: string;
	taperedLumen: string;
}

export const TOOTH43_PULP_GEOMETRY = {
	// Tall spear-like pulp chamber conforming to canine crown
	coronalPulpChamber:
		"M 46.5,73.0 " +
		"C 42.0,71.0 38.0,62.0 38.0,52.0 " +
		"C 38.0,40.0 43.0,30.0 50.0,20.0 " + // Tall spear horn at Y=20.0
		"C 57.0,30.0 62.0,40.0 62.0,52.0 " +
		"C 62.0,62.0 58.0,71.0 53.5,73.0 " +
		"C 51.5,74.5 48.5,74.5 46.5,73.0 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Центральный корневой канал",
			orifice: { x: 50.0, y: 73.0 },
			apex: { x: 50.0, y: 159.0 },
			centerLine:
				"M 50.0,73.0 C 50.0,98.0 50.0,132.0 50.0,159.0",
			taperedLumen:
				"M 47.0,73.0 C 47.0,98.0 48.5,132.0 49.2,159.0 " +
				"L 50.8,159.0 C 51.5,132.0 53.0,98.0 53.0,73.0 Z",
		},
	] as readonly Tooth43CanalAnatomy[],
	rostrumMap: {
		grooves: "M 47.0,73.0 C 48.5,75.0 51.5,75.0 53.0,73.0",
		orifices: [{ id: "Main", x: 50.0, y: 73.0, r: 1.8 }],
	},
	neuroPlexus: [
		{ id: "canine_trunk", d: "M 50.0,22.0 C 50.0,42.0 50.0,58.0 50.0,73.0" },
	] as const,
} as const;
