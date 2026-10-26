/**
 * DENTE Dental CRM — Wheeler Ch. 9 Maxillary Canine (Tooth 13) Pulp & Canal
 * Tall spear-like pulp horn (Y=128.0) & deepest root canal up to Y=9.5.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export interface Tooth13CanalAnatomy {
	id: "Main";
	nameRu: string;
	orifice: { x: number; y: number };
	apex: { x: number; y: number };
	centerLine: string;
	taperedLumen: string;
}

export const TOOTH13_PULP_GEOMETRY = {
	// Slender spear-like coronal pulp chamber in cervical half (Wheeler Ch. 9)
	coronalPulpChamber:
		"M 48.0,93.0 " +
		"C 45.5,95.0 44.0,104.0 44.0,114.0 " +
		"C 44.0,120.0 47.0,124.0 50.0,128.0 " + // Slender spear horn pointing to cusp tip
		"C 53.0,124.0 56.0,120.0 56.0,114.0 " +
		"C 56.0,104.0 54.5,95.0 52.0,93.0 " +
		"C 51.0,91.5 49.0,91.5 48.0,93.0 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Центральный корневой канал",
			orifice: { x: 50.0, y: 93.0 },
			apex: { x: 51.8, y: 9.5 },
			centerLine:
				"M 50.0,93.0 C 50.0,65.0 50.8,35.0 51.8,9.5",
			taperedLumen:
				"M 47.8,93.0 C 48.0,65.0 49.5,35.0 51.0,9.5 " +
				"L 52.6,9.5 C 52.2,35.0 52.0,65.0 52.2,93.0 Z",
		},
	] as readonly Tooth13CanalAnatomy[],
	rostrumMap: {
		grooves: "M 48.0,93.0 C 49.0,91.5 51.0,91.5 52.0,93.0",
		orifices: [{ id: "Main", x: 50.0, y: 93.0, r: 1.2 }],
	},
	neuroPlexus: [
		{ id: "canine_trunk", d: "M 50.0,93.0 C 50.0,104.0 50.0,114.0 50.0,126.0" },
	] as const,
} as const;
