/**
 * DENTE Dental CRM — Organic Caries & Cavitation Geometry for Tooth 42
 * Mandibular Lateral Incisor: Class III, Class IV (Incisal Fracture), Class V.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export const TOOTH42_CARIES_GEOMETRY = {
	// Destructive cutout polygon: missing disto-incisal angle cut out into transparency
	destructiveCutout:
		"M 55.0,22.5 L 55.0,18 L 73,18 L 73,33.0 L 69.5,33.0 L 66.0,29.5 L 62.0,27.0 L 58.0,25.0 Z",

	// Class III Proximal Contact (Distal X=63..70.5, Y=33..47)
	class3: {
		halo: "M 70.5,33.0 C 65.0,33.0 62.8,36.5 63.4,41.0 C 64.0,45.5 66.5,47.8 70.5,47.5 Z",
		crater: "M 70.2,35.0 C 66.5,35.2 64.8,37.5 65.2,41.0 C 65.8,44.5 67.5,46.0 70.2,45.8 Z",
		profunda: "M 70.0,37.0 C 67.5,37.2 66.8,39.0 67.0,41.2 C 67.2,43.2 68.5,44.2 70.0,44.0 Z",
	},

	// Class IV Incisal Angle Fracture & Cavitation (Disto-Incisal Chipped Notch)
	class4: {
		halo: "M 55.0,22.5 L 58.0,25.0 L 62.0,27.0 L 66.0,29.5 L 69.5,33.0 C 67.5,38.5 62.0,38.5 57.5,35.5 C 53.5,32.0 52.5,25.5 55.0,22.5 Z",
		fractureSteps: [
			"M 55.0,22.5 L 58.0,25.0 L 62.0,27.0 L 66.0,29.5 L 69.5,33.0",
			"M 58.0,25.0 L 56.5,28.0",
			"M 62.0,27.0 L 60.5,30.0",
		],
		crater: "M 55.0,22.5 L 58.0,25.0 L 62.0,27.0 L 66.0,29.5 L 69.5,33.0 C 68.0,36.5 63.5,36.5 59.5,33.5 C 55.5,30.5 54.0,25.5 55.0,22.5 Z",
		profunda: "M 58.0,26.0 L 62.0,28.0 L 66.0,30.5 C 64.5,33.5 61.5,33.5 58.0,31.0 Z",
	},

	// Class V Cervical Buccal Margin at CEJ (X=38..62, Y=64.5..72)
	class5: {
		halo: "M 38.0,72.0 C 43.0,73.5 57.0,73.5 62.0,72.0 C 60.2,66.0 56.0,64.5 50.0,64.5 C 44.0,64.5 39.8,66.0 38.0,72.0 Z",
		crater: "M 40.5,71.5 C 44.5,72.7 55.5,72.7 59.5,71.5 C 58.0,67.2 55.0,66.0 50.0,66.0 C 45.0,66.0 42.0,67.2 40.5,71.5 Z",
		profunda: "M 44.5,70.5 C 47.0,71.2 53.0,71.2 55.5,70.5 C 54.5,68.0 52.5,67.2 50.0,67.2 C 47.5,67.2 45.5,68.0 44.5,70.5 Z",
	},
} as const;
