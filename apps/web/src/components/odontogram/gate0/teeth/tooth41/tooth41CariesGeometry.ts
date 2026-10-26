/**
 * DENTE Dental CRM — Organic Caries & Cavitation Geometry for Tooth 41
 * Mandibular Central Incisor: Class III, Class IV (Incisal Fracture), Class V.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export const TOOTH41_CARIES_GEOMETRY = {
	// Destructive cutout polygon: missing mesio-incisal angle cut out into transparency
	destructiveCutout:
		"M 28,18 L 44.5,18 L 44.0,21.0 L 41.0,23.5 L 38.0,25.5 L 35.0,27.5 L 32.0,31.0 L 28,31.0 Z",

	// Class III Proximal Contact (Mesial X=31..38, Y=33..47)
	class3: {
		halo: "M 32.0,33.0 C 37.0,33.0 39.5,36.5 38.8,41.0 C 38.0,45.5 35.5,47.8 31.5,47.5 Z",
		crater: "M 32.2,35.0 C 36.0,35.2 37.8,37.5 37.2,41.0 C 36.6,44.5 34.5,46.0 31.8,45.8 Z",
		profunda: "M 32.2,37.0 C 34.8,37.2 35.8,39.0 35.4,41.2 C 35.0,43.2 33.8,44.2 32.0,44.0 Z",
	},

	// Class IV Incisal Angle Fracture & Cavitation (Mesio-Incisal Chipped Notch)
	class4: {
		halo: "M 44.0,21.0 L 41.0,23.5 L 38.0,25.5 L 35.0,27.5 L 32.0,31.0 C 34.0,35.5 39.0,35.5 43.5,33.0 C 47.0,30.0 47.5,24.5 44.0,21.0 Z",
		fractureSteps: [
			"M 44.0,21.0 L 41.0,23.5 L 38.0,25.5 L 35.0,27.5 L 32.0,31.0",
			"M 41.0,23.5 L 43.0,26.0",
			"M 38.0,25.5 L 39.5,28.5",
		],
		crater: "M 44.0,21.0 L 41.0,23.5 L 38.0,25.5 L 35.0,27.5 L 32.0,31.0 C 33.5,33.5 37.0,33.5 41.0,31.0 C 44.5,28.5 46.0,24.0 44.0,21.0 Z",
		profunda: "M 41.0,24.5 L 38.0,26.5 L 35.0,28.5 C 36.5,31.0 39.5,31.0 42.0,29.0 Z",
	},

	// Class V Cervical Buccal Margin at CEJ (X=39..61, Y=64..72)
	class5: {
		halo: "M 39.0,71.5 C 43.5,73.0 56.5,73.0 61.0,71.5 C 59.2,65.5 55.5,64.0 50.0,64.0 C 44.5,64.0 40.8,65.5 39.0,71.5 Z",
		crater: "M 41.5,71.0 C 45.0,72.2 55.0,72.2 58.5,71.0 C 57.0,66.8 54.0,65.5 50.0,65.5 C 46.0,65.5 43.0,66.8 41.5,71.0 Z",
		profunda: "M 44.5,70.2 C 47.0,71.0 53.0,71.0 55.5,70.2 C 54.5,67.8 52.5,67.0 50.0,67.0 C 47.5,67.0 45.5,67.8 44.5,70.2 Z",
	},
} as const;
