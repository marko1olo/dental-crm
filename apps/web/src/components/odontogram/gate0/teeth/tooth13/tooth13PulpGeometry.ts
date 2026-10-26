/**
 * DENTE Dental CRM — Wheeler Ch. 9 Maxillary Canine (Tooth 13) Pulp & Canal
 * Tall spear-like pulp horn (Y=128.0) & deepest root canal up to Y=10.5.
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
		"M 48.0,91.5 " +
		"C 45.5,93.5 44.0,102.5 44.0,112.5 " +
		"C 44.0,118.5 47.0,123.5 50.0,128.0 " + // Slender spear horn pointing to cusp tip
		"C 53.0,123.5 56.0,118.5 56.0,112.5 " +
		"C 56.0,102.5 54.5,93.5 52.0,91.5 " +
		"C 51.0,90.0 49.0,90.0 48.0,91.5 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Центральный корневой канал",
			orifice: { x: 50.0, y: 91.0 },
			apex: { x: 50.0, y: 10.5 },
			centerLine:
				"M 50.0,91.0 L 50.0,10.5",
			taperedLumen:
				"M 47.5,91.0 C 47.8,64.0 48.8,32.0 49.3,10.5 " +
				"L 50.7,10.5 C 51.2,32.0 52.2,64.0 52.5,91.0 Z",
		},
	] as readonly Tooth13CanalAnatomy[],
	rostrumMap: {
		grooves: "M 48.0,91.0 C 49.0,89.5 51.0,89.5 52.0,91.0",
		orifices: [{ id: "Main", x: 50.0, y: 91.0, r: 1.2 }],
	},
	neuroPlexus: [
		{ id: "canine_trunk", d: "M 50.0,91.0 C 50.0,102.0 50.0,113.0 50.0,125.0" },
	] as const,
} as const;
