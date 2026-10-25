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
	// Slender spear-like pulp chamber conforming to canine crown (width 13px, Wheeler Ch. 11)
	coronalPulpChamber:
		"M 48.0,73.0 " +
		"C 45.5,71.0 43.5,60.0 43.5,48.0 " +
		"C 43.5,38.0 46.5,28.0 50.0,22.0 " + // Tall spear horn at Y=22.0
		"C 53.5,28.0 56.5,38.0 56.5,48.0 " +
		"C 56.5,60.0 54.5,71.0 52.0,73.0 " +
		"C 51.0,74.5 49.0,74.5 48.0,73.0 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Центральный корневой канал",
			orifice: { x: 50.0, y: 73.0 },
			apex: { x: 39.5, y: 159.0 },
			centerLine:
				"M 50.0,73.0 C 46.5,98.0 41.5,132.0 39.5,159.0",
			taperedLumen:
				"M 48.2,73.0 C 45.2,98.0 40.5,132.0 38.8,159.0 " +
				"L 40.2,159.0 C 42.5,132.0 47.8,98.0 51.8,73.0 Z",
		},
	] as readonly Tooth43CanalAnatomy[],
	rostrumMap: {
		grooves: "M 48.0,73.0 C 49.0,74.5 51.0,74.5 52.0,73.0",
		orifices: [{ id: "Main", x: 50.0, y: 73.0, r: 1.2 }],
	},
	neuroPlexus: [
		{ id: "canine_trunk", d: "M 50.0,24.0 C 50.0,42.0 50.0,58.0 50.0,73.0" },
	] as const,
} as const;
