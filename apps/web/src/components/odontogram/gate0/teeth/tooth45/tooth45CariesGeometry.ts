/**
 * DENTE Dental CRM — Organic Caries & Cavitation Geometry for Tooth 45
 * Mandibular Second Premolar: Class I (Y-Pattern), Class II (Destructive), Class V.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export const TOOTH45_CARIES_GEOMETRY = {
	// Destructive cutout polygon: missing distal marginal ridge & cusp cut out into transparency
	destructiveCutout:
		"M 58.0,20.0 L 58.0,15 L 82,15 L 82,32.0 L 77.0,32.0 L 73.0,26.5 L 69.0,25.0 L 63.5,21.5 Z",

	// Class I Y-Fissure Central Pit & Lingual Stem Cavitation
	class1: {
		halo: "M 45.0,20.5 C 47.0,18.5 53.0,18.5 55.0,20.5 C 56.5,22.5 55.5,25.5 52.5,26.5 L 52.5,31.5 C 52.5,32.8 47.5,32.8 47.5,31.5 L 47.5,26.5 C 44.5,25.5 43.5,22.5 45.0,20.5 Z",
		crater: "M 46.5,21.5 C 48.0,20.0 52.0,20.0 53.5,21.5 C 54.5,23.0 53.8,25.0 51.5,25.8 L 51.5,30.5 C 51.5,31.2 48.5,31.2 48.5,30.5 L 48.5,25.8 C 46.2,25.0 45.5,23.0 46.5,21.5 Z",
		profunda: "M 48.0,22.5 C 49.0,21.5 51.0,21.5 52.0,22.5 C 52.8,23.5 52.2,24.8 50.8,25.2 L 50.8,29.5 C 50.8,29.8 49.2,29.8 49.2,29.5 L 49.2,25.2 C 47.8,24.8 47.2,23.5 48.0,22.5 Z",
	},

	// Class II Destructive (Collapse of Distal Marginal Ridge & Lingual Cusp)
	destructive: {
		halo: "M 58.0,20.0 L 63.5,21.5 L 69.0,25.0 L 73.0,26.5 L 77.0,32.0 C 73.5,37.5 66.0,37.5 59.5,34.0 C 54.5,30.0 54.0,23.5 58.0,20.0 Z",
		fractureSteps: [
			"M 58.0,20.0 L 63.5,21.5 L 69.0,25.0 L 73.0,26.5 L 77.0,32.0",
			"M 64.0,22.0 L 62.5,25.5",
			"M 70.0,25.5 L 68.0,29.0",
		],
		crater: "M 58.0,20.0 L 63.5,21.5 L 69.0,25.0 L 73.0,26.5 L 77.0,32.0 C 74.0,35.0 67.0,35.0 61.0,32.0 C 56.5,28.5 56.0,23.5 58.0,20.0 Z",
		profunda: "M 63.5,23.0 L 69.0,26.5 L 73.0,28.5 C 70.5,32.5 65.0,32.0 62.0,28.5 Z",
	},

	// Class V Cervical Buccal Margin
	class5: {
		halo: "M 34.0,73.0 C 40.0,68.0 50.0,66.5 56.0,66.5 C 62.0,66.5 68.0,68.0 71.0,73.0 C 62.0,74.5 42.0,74.5 34.0,73.0 Z",
		crater: "M 37.0,72.5 C 41.5,69.5 50.0,68.2 56.0,68.2 C 61.0,68.2 65.5,69.5 68.0,72.5 C 60.5,73.8 44.5,73.8 37.0,72.5 Z",
		profunda: "M 41.0,71.8 C 45.0,70.2 51.0,69.5 56.0,69.5 C 59.5,69.5 63.0,70.2 65.0,71.8 C 59.0,72.8 47.0,72.8 41.0,71.8 Z",
	},
} as const;
