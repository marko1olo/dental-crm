/**
 * DENTE Dental CRM — Wheeler Ch. 11 Mandibular Third Molar (Tooth 48) Pulp & Canals
 * 4 Pulp Horns, C-shaped Radicular Floor & 2 Converging Distally-Curved Canals.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 170".
 */

export interface Tooth48CanalAnatomy {
	id: "M" | "D";
	nameRu: string;
	orifice: { x: number; y: number };
	apex: { x: number; y: number };
	centerLine: string;
	taperedLumen: string;
}

export const TOOTH48_PULP_GEOMETRY = {
	coronalPulpChamber:
		"M 33.0,71.0 C 32.5,64.0 32.0,57.0 33.0,52.5 C 34.0,49.5 37.0,49.5 39.0,53.0 " +
		"C 42.5,55.5 46.5,55.5 50.0,55.0 C 53.5,55.5 57.5,55.5 61.0,53.0 " +
		"C 63.0,49.5 66.0,49.5 67.0,52.5 C 68.0,57.0 67.5,64.0 67.0,71.0 " +
		"C 61.0,71.0 55.0,69.5 50.0,68.5 C 45.0,68.5 39.0,69.5 33.0,71.0 Z",
	canals: [
		{
			id: "M",
			nameRu: "Медиально-сходящийся C-образный тракт",
			orifice: { x: 38.0, y: 71.0 },
			apex: { x: 38.0, y: 144.5 },
			centerLine:
				"M 38.0,71.0 C 36.0,92.0 35.5,118.0 38.0,144.5",
			taperedLumen:
				"M 36.5,71.0 C 34.5,92.0 34.0,118.0 37.0,144.5 " +
				"L 39.0,144.5 C 37.0,118.0 37.5,92.0 39.5,71.0 Z",
		},
		{
			id: "D",
			nameRu: "Дистально-сходящийся канал",
			orifice: { x: 62.0, y: 71.0 },
			apex: { x: 39.5, y: 144.5 },
			centerLine:
				"M 62.0,71.0 C 58.0,92.0 48.0,118.0 39.5,144.5",
			taperedLumen:
				"M 60.5,71.0 C 56.5,92.0 46.5,118.0 38.5,144.5 " +
				"L 40.5,144.5 C 49.5,118.0 59.5,92.0 63.5,71.0 Z",
		},
	] as readonly Tooth48CanalAnatomy[],
	cShapedIsthmus:
		"M 30.0,99.0 C 36.0,100.5 44.0,100.5 50.0,99.0 C 50.0,100.5 44.0,102.0 36.0,102.0 C 30.0,102.0 30.0,100.5 30.0,99.0 Z",
	rostrumMap: {
		grooves:
			"M 36.0,71.0 C 38.0,73.0 44.0,74.5 50.0,74.5 C 56.0,74.5 62.0,73.0 64.0,71.0 " +
			"M 36.0,71.0 C 44.0,69.5 56.0,69.5 64.0,71.0",
		orifices: [
			{ id: "M", x: 36.0, y: 71.0, r: 1.4 },
			{ id: "D", x: 64.0, y: 71.0, r: 1.3 },
			{ id: "C_center", x: 50.0, y: 74.0, r: 0.9 },
		],
	},
	neuroPlexus: [
		{ id: "mesial_trunk", d: "M 38.0,52.0 C 37.0,58.0 36.5,64.0 36.0,71.0" },
		{ id: "distal_trunk", d: "M 62.0,52.0 C 63.0,58.0 63.5,64.0 64.0,71.0" },
	] as const,
} as const;
