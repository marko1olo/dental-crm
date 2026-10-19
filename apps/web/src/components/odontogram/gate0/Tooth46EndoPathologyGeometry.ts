/**
 * DENTE Dental CRM — Endodontic Pathology Geometry for Tooth 46
 * Underfilled canals, sealer puff extrusion, and broken NiTi rotary file.
 * Wheeler Dental Anatomy Ch. 11 (Mandate 8b <= 120 lines). ViewBox: "0 0 100 170".
 */

export const TOOTH46_ENDO_PATHOLOGY_GEOMETRY = {
	// Underfilled gutta-percha cones terminating short at Y=126 (3mm before apex)
	underfill: [
		{
			id: "MB",
			lumen:
				"M 32.5,72.0 C 29.5,88 20.2,112 20.8,126 " +
				"L 23.2,126 C 23.4,112 32.5,88 35.5,72.0 Z",
			emptyLumen:
				"M 20.8,126 C 21.8,137 22.3,142.5 22.3,145.8 " +
				"L 23.7,145.8 C 23.7,142.5 23.4,137 23.2,126 Z",
		},
		{
			id: "ML",
			lumen:
				"M 40.5,72.0 C 36.5,88 26.0,110 23.5,126 " +
				"L 25.0,126 C 28.5,110 39.5,88 43.5,72.0 Z",
			emptyLumen:
				"M 23.5,126 C 22.7,137 22.5,142.5 22.5,145.8 " +
				"L 23.5,145.8 C 23.8,142.5 24.0,137 25.0,126 Z",
		},
		{
			id: "D",
			lumen:
				"M 58.0,72.0 C 63.0,88 71.5,112 75.8,126 " +
				"L 78.4,126 C 74.5,112 67.0,88 62.0,72.0 Z",
			emptyLumen:
				"M 75.8,126 C 77.0,137 78.2,142 78.2,144.5 " +
				"L 79.8,144.5 C 79.8,142.0 79.2,137 78.4,126 Z",
		},
	],

	// Overfilled gutta-percha with mushroom sealer puff extrusion beyond apical foramen
	overfillPuffs: [
		{
			id: "mesial_puff",
			d: "M 22,145.8 C 20,147 21,150 23,150 C 25,149.5 25,147 23,145.8 Z",
		},
		{
			id: "distal_puff",
			d: "M 78,144.5 C 76,146 77,148.8 79,148.8 C 81,148.2 81,145.8 79.5,144.5 Z",
		},
	],

	// Broken NiTi rotary file fragment lodged in apical third of mesial canal (Y=132..145.5)
	brokenFile: {
		shaft:
			"M 21.0,132.0 C 21.6,137 22.1,142 22.4,145.5 " +
			"L 23.6,145.5 C 23.6,142 23.0,137 22.8,132.0 Z",
		fractureLine: "M 21.0,132.0 L 22.8,132.0",
		flutes: [
			"M 21.1,133.5 L 22.7,134.5",
			"M 21.3,136.0 L 22.6,137.0",
			"M 21.5,138.5 L 22.8,139.5",
			"M 21.7,141.0 L 23.1,142.0",
			"M 22.0,143.5 L 23.3,144.5",
		],
		warningOutline:
			"M 20.6,131.5 C 21.4,137 21.8,142 22.2,146.0 " +
			"L 23.9,146.0 C 23.9,142 23.3,137 23.1,131.5 Z",
	},
} as const;
