/**
 * DENTE Dental CRM — Organic Caries & Cavitation Geometry for Tooth 43
 * Mandibular Canine: Class III, Class IV (Cusp Tip Fracture), Class V.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export const TOOTH43_CARIES_GEOMETRY = {
	// Destructive cutout polygon: chipped off tearing cusp apex cut out into transparency
	destructiveCutout:
		"M 42.0,14.5 L 42.0,5 L 58.0,5 L 58.0,15.0 L 54.5,18.0 L 50.0,16.0 L 45.5,17.0 Z",

	// Class III Proximal Contact (Mesial X=22..29, Y=40..54)
	class3: {
		halo: "M 22.5,40.0 C 27.5,40.0 29.5,44.5 28.8,49.0 C 28.0,53.0 25.5,55.0 22.2,55.0 Z",
		crater: "M 22.6,42.0 C 26.2,42.0 27.8,45.5 27.2,48.8 C 26.6,51.8 24.8,53.2 22.4,53.2 Z",
		profunda: "M 22.8,44.5 C 25.0,44.5 26.0,46.5 25.6,48.5 C 25.2,50.2 24.0,51.2 22.6,51.0 Z",
	},

	// Class IV Cusp Fracture & Cavitation (Chipped Tearing Cusp Apex)
	class4: {
		halo: "M 42.0,14.5 L 45.5,17.0 L 50.0,16.0 L 54.5,18.0 L 58.0,15.0 C 57.5,23.0 54.0,26.0 50.0,26.0 C 46.0,26.0 42.5,23.0 42.0,14.5 Z",
		fractureSteps: [
			"M 42.0,14.5 L 45.5,17.0 L 50.0,16.0 L 54.5,18.0 L 58.0,15.0",
			"M 46.0,17.5 L 48.0,20.5",
			"M 53.0,18.5 L 51.5,21.5",
		],
		crater: "M 42.0,14.5 L 45.5,17.0 L 50.0,16.0 L 54.5,18.0 L 58.0,15.0 C 56.5,20.5 53.5,23.5 50.0,23.5 C 46.5,23.5 43.5,20.5 42.0,14.5 Z",
		profunda: "M 46.0,18.0 L 50.0,17.0 L 54.0,19.0 C 52.5,22.0 47.5,22.0 46.0,18.0 Z",
	},

	// Class V Cervical Buccal Margin at CEJ (X=36..64, Y=67.5..75.5)
	class5: {
		halo: "M 36.0,75.0 C 42.5,76.5 57.5,76.5 64.0,75.0 C 62.0,69.0 57.5,67.5 50.0,67.5 C 42.5,67.5 38.0,69.0 36.0,75.0 Z",
		crater: "M 39.0,74.5 C 44.0,75.8 56.0,75.8 61.0,74.5 C 59.5,70.5 56.0,69.0 50.0,69.0 C 44.0,69.0 40.5,70.5 39.0,74.5 Z",
		profunda: "M 43.5,73.5 C 46.5,74.5 53.5,74.5 56.5,73.5 C 55.2,71.0 53.0,70.2 50.0,70.2 C 47.0,70.2 44.8,71.0 43.5,73.5 Z",
	},
} as const;
