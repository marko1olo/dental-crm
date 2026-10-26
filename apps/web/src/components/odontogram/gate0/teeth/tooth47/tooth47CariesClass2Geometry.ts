/**
 * DENTE Dental CRM — Authentic Class II Proximal Geometry for Tooth 47
 * Mandibular Second Molar: M, D, MO, DO, MOD Isthmus Bridge & Massive Fractures.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export const TOOTH47_CARIES_CLASS2_GEOMETRY = {
	class2M: {
		halo: "M 15.0,42 C 14.5,35 15.5,29 18.5,26 C 22,23 25,23 26.5,26 C 25.5,30 24.5,38 23,42 C 20,44 17,44 15.0,42 Z",
		crater: "M 15.5,40 C 15,34 16,29 18.5,27 C 21,24 24,24.5 25,27 C 24.5,30 23.5,37 22.5,40.5 C 20,42 17.5,42 15.5,40 Z",
		necrotic: "M 16,38 C 15.8,33 16.8,29 18.8,28 C 20.8,26 22.8,26 23.8,28 C 23.2,32 22.5,36 21.5,38.5 C 19.5,39.5 17.5,39.5 16,38 Z",
	},

	class2D: {
		halo: "M 85.0,42 C 85.5,35 84.5,29 81.5,26 C 78,23 75,23 73.5,26 C 74.5,30 75.5,38 77,42 C 80,44 83,44 85.0,42 Z",
		crater: "M 84.5,40 C 85,34 84,29 81.5,27 C 79,24 76,24.5 75,27 C 75.5,30 76.5,37 77.5,40.5 C 80,42 82.5,42 84.5,40 Z",
		necrotic: "M 84,38 C 84.2,33 83.2,29 81.2,28 C 79.2,26 77.2,26 76.2,28 C 76.8,32 77.5,36 78.5,38.5 C 80.5,39.5 82.5,39.5 84,38 Z",
	},

	class2Mo: {
		halo: "M 15.0,42 C 14.5,35 15.5,29 18.5,25 C 22,21 26,20 30.5,21.5 C 33.5,23.0 32.0,26.5 28.0,28.0 C 25.5,29 24.5,38 23,42 C 20,44 17,44 15.0,42 Z",
		crater: "M 15.5,40 C 15,34 16,29 18.5,26 C 21,22.5 25,21.5 29.2,22.5 C 31.8,23.5 30.5,26.0 27.0,27.0 C 24.5,28 23.5,37 22.5,40.5 C 20,42 17.5,42 15.5,40 Z",
		necrotic: "M 16,38 C 15.8,33 16.8,29 18.8,27 C 20.8,24 24,23 27.5,23.8 C 29.0,24.8 28.5,25.8 26.0,26.2 C 23.5,27 22.5,36 21.5,38.5 Z",
	},

	class2Do: {
		halo: "M 85.0,42 C 85.5,35 84.5,29 81.5,25 C 78,21 74,20 69.5,21.5 C 66.5,23.0 68.0,26.5 72.0,28.0 C 74.5,29 75.5,38 77,42 C 80,44 83,44 85.0,42 Z",
		crater: "M 84.5,40 C 85,34 84,29 81.5,26 C 79,22.5 75,21.5 70.8,22.5 C 68.2,23.5 69.5,26.0 73.0,27.0 C 75.5,28 76.5,37 77.5,40.5 C 80,42 82.5,42 84.5,40 Z",
		necrotic: "M 84,38 C 84.2,33 83.2,29 81.2,27 C 79.2,24 76,23 72.5,23.8 C 71.0,24.8 71.5,25.8 74.0,26.2 C 76.5,27 77.5,36 78.5,38.5 Z",
	},

	class2ModBridge: {
		halo: "M 28,21.0 C 38,19.5 62,19.5 72,21.0 C 70,25.5 30,25.5 28,21.0 Z",
		crater: "M 29,21.8 C 39,20.5 61,20.5 71,21.8 C 69,24.5 31,24.5 29,21.8 Z",
		necrotic: "M 32,22.2 C 41,21.5 59,21.5 68,22.2 C 66,23.8 34,23.8 32,22.2 Z",
	},

	// M: chip strictly of approximal contact wall (Y=26..46), cusp intact
	destructiveCutoutM:
		"M 8,26 L 28,26 L 28,34 L 24,42 L 14,46 L 8,46 Z",
	destructiveM: {
		fractureMargin: "M 8,26 L 28,26 L 28,34 L 24,42 L 14,46 L 8,46",
		fractureSteps: ["M 8,26 L 28,26 L 28,34 L 24,42 L 14,46", "M 28,26 L 30,30", "M 24,42 L 22,44"],
	},

	// D: chip strictly of distal contact wall (Y=26..46), cusp intact
	destructiveCutoutD:
		"M 92,26 L 72,26 L 72,34 L 76,42 L 86,46 L 92,46 Z",
	destructiveD: {
		fractureMargin: "M 92,26 L 72,26 L 72,34 L 76,42 L 86,46 L 92,46",
		fractureSteps: ["M 92,26 L 72,26 L 72,34 L 76,42 L 86,46", "M 72,26 L 70,30", "M 76,42 L 78,44"],
	},

	// MO: breakdown of mesial wall and mesial cusp/occlusal table
	destructiveCutoutMO:
		"M 8,10 L 48,10 L 48,22 L 44,30 L 36,36 L 24,42 L 8,42 Z",
	destructiveMO: {
		fractureMargin: "M 48,10 L 48,22 L 44,30 L 36,36 L 24,42 L 8,42",
		fractureSteps: ["M 48,10 L 48,22 L 44,30 L 36,36 L 24,42", "M 44,30 L 46,34", "M 36,36 L 38,40"],
	},

	// DO: breakdown of distal wall and distal cusp/occlusal table
	destructiveCutoutDO:
		"M 92,10 L 52,10 L 52,22 L 56,30 L 64,36 L 76,42 L 92,42 Z",
	destructiveDO: {
		fractureMargin: "M 52,10 L 52,22 L 56,30 L 64,36 L 76,42 L 92,42",
		fractureSteps: ["M 52,10 L 52,22 L 56,30 L 64,36 L 76,42", "M 56,30 L 54,34", "M 64,36 L 62,40"],
	},

	// MOD: massive bilateral through-and-through saddle breakdown
	destructiveCutoutMOD:
		"M 8,10 L 92,10 L 92,44 L 80,44 L 74,38 L 66,28 L 50,33 L 34,28 L 26,38 L 20,44 L 8,44 Z",
	destructiveMOD: {
		fractureMargin:
			"M 8,44 L 20,44 L 26,38 L 34,28 L 50,33 L 66,28 L 74,38 L 80,44 L 92,44",
		fractureSteps: [
			"M 20,44 L 26,38 L 34,28 L 50,33",
			"M 50,33 L 66,28 L 74,38 L 80,44",
			"M 34,28 L 36,32",
			"M 66,28 L 64,32",
		],
	},
} as const;
