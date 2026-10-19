/**
 * DENTE Dental CRM — Endodontic Pathology Geometry for Tooth 46
 * Underfilled canals, sealer puff extrusion, and broken NiTi rotary file.
 * Wheeler Dental Anatomy Ch. 11 (Mandate 8b <= 120 lines). ViewBox: "0 0 100 170".
 */

export const TOOTH46_ENDO_PATHOLOGY_GEOMETRY = {
	// Underfilled gutta-percha cones terminating short at Y=124..126 (3mm before apex)
	underfill: [
		{
			id: "MB",
			lumen:
				"M 32.5,71.5 C 29.5,86.0 21.0,110.0 21.2,126.0 " +
				"L 23.0,126.0 C 23.5,110.0 32.5,86.0 35.5,71.5 Z",
			emptyLumen:
				"M 21.2,126.0 C 21.6,137.0 22.3,142.5 22.3,145.8 " +
				"L 23.7,145.8 C 23.7,142.5 23.4,137.0 23.0,126.0 Z",
		},
		{
			id: "ML",
			lumen:
				"M 39.2,68.0 C 37.0,82.0 32.0,105.0 28.0,124.0 " +
				"L 29.6,124.0 C 34.0,105.0 39.5,82.0 41.8,68.0 Z",
			emptyLumen:
				"M 28.0,124.0 C 26.5,130.0 25.1,137.0 24.8,144.5 " +
				"L 26.0,144.5 C 26.3,137.0 27.6,130.0 29.6,124.0 Z",
		},
		{
			id: "D",
			lumen:
				"M 57.0,71.5 C 62.0,88.0 70.0,112.0 75.2,125.0 " +
				"L 77.2,125.0 C 73.5,112.0 65.5,88.0 61.0,71.5 Z",
			emptyLumen:
				"M 75.2,125.0 C 76.5,137.0 77.8,142.0 78.2,144.5 " +
				"L 79.8,144.5 C 79.8,142.0 79.0,137.0 77.2,125.0 Z",
		},
	],

	// Overfilled gutta-percha with anatomical mushroom sealer puff extrusion beyond apical foramen
	overfillPuffs: [
		{
			id: "mesial_puff",
			d:
				"M 22.3,145.8 C 21.2,146.8 19.8,148.5 20.8,150.2 " +
				"C 21.6,151.5 24.2,151.5 25.0,150.0 C 25.8,148.4 24.5,146.8 23.7,145.8 Z",
		},
		{
			id: "distal_puff",
			d:
				"M 78.2,144.5 C 76.8,145.8 75.5,147.5 76.6,149.4 " +
				"C 77.6,151.0 80.5,150.8 81.4,149.0 C 82.2,147.2 80.8,145.6 79.8,144.5 Z",
		},
	],

	// Broken NiTi rotary file fragment lodged in apical third of MB canal (Y=131.5..145.8)
	brokenFile: {
		shaft:
			"M 21.0,131.8 C 21.6,136.5 22.1,141.5 22.4,145.2 " +
			"C 22.6,145.8 23.2,145.8 23.4,145.2 " +
			"C 23.6,141.5 23.1,136.5 22.8,131.8 Z",
		fractureLine: "M 21.0,131.8 L 21.5,132.5 L 22.1,131.5 L 22.8,132.1",
		flutes: [
			"M 21.1,133.2 C 21.8,133.7 22.3,134.4 22.7,134.6",
			"M 21.3,135.6 C 21.9,136.1 22.3,136.8 22.7,137.0",
			"M 21.5,138.0 C 22.1,138.5 22.5,139.2 22.9,139.4",
			"M 21.7,140.4 C 22.3,140.9 22.7,141.6 23.1,141.8",
			"M 21.9,142.8 C 22.4,143.3 22.8,144.0 23.2,144.2",
		] as const,
		microHelicalRidge: "M 21.6,132.5 C 22.1,135.5 22.3,140.0 22.7,144.5",
		warningOutline:
			"M 20.6,131.2 C 21.3,136.5 21.8,141.5 22.2,146.0 " +
			"C 22.5,146.4 23.6,146.4 23.9,146.0 " +
			"C 24.1,141.5 23.4,136.5 23.2,131.2 Z",
	},
} as const;
