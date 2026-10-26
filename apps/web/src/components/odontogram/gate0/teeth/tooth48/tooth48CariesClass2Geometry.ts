/**
 * DENTE Dental CRM — Authentic Class II Proximal Geometry for Tooth 48
 * Mandibular Third Molar: M, D, MO, DO, MOD Isthmus Bridge & Massive Fractures.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export const TOOTH48_CARIES_CLASS2_GEOMETRY = {
	class2M: {
		halo: "M 16.0,42 C 15.5,35 16.5,29 19.5,26 C 23,23 26,23 27.5,26 C 26.5,30 25.5,38 24,42 C 21,44 18,44 16.0,42 Z",
		crater: "M 16.5,40 C 16,34 17,29 19.5,27 C 22,24 25,24.5 26,27 C 25.5,30 24.5,37 23.5,40.5 C 21,42 18.5,42 16.5,40 Z",
		necrotic: "M 17,38 C 16.8,33 17.8,29 19.8,28 C 21.8,26 23.8,26 24.8,28 C 24.2,32 23.5,36 22.5,38.5 C 20.5,39.5 18.5,39.5 17,38 Z",
	},

	class2D: {
		halo: "M 84.0,42 C 84.5,35 83.5,29 80.5,26 C 77,23 74,23 72.5,26 C 73.5,30 74.5,38 76,42 C 79,44 82,44 84.0,42 Z",
		crater: "M 83.5,40 C 84,34 83,29 80.5,27 C 78,24 75,24.5 74,27 C 74.5,30 75.5,37 76.5,40.5 C 79,42 81.5,42 83.5,40 Z",
		necrotic: "M 83,38 C 83.2,33 82.2,29 80.2,28 C 78.2,26 76.2,26 75.2,28 C 75.8,32 76.5,36 77.5,38.5 C 79.5,39.5 81.5,39.5 83,38 Z",
	},

	class2Mo: {
		halo: "M 16.0,42 C 15.5,35 16.5,29 19.5,25 C 23,21 27,20 31.5,21.5 C 34.5,23.0 33.0,26.5 29.0,28.0 C 26.5,29 25.5,38 24,42 C 21,44 18,44 16.0,42 Z",
		crater: "M 16.5,40 C 16,34 17,29 19.5,26 C 22,22.5 26,21.5 30.2,22.5 C 32.8,23.5 31.5,26.0 28.0,27.0 C 25.5,28 24.5,37 23.5,40.5 C 21,42 18.5,42 16.5,40 Z",
		necrotic: "M 17,38 C 16.8,33 17.8,29 19.8,27 C 21.8,24 25,23 28.5,23.8 C 30.0,24.8 29.5,25.8 27.0,26.2 C 24.5,27 23.5,36 22.5,38.5 Z",
	},

	class2Do: {
		halo: "M 84.0,42 C 84.5,35 83.5,29 80.5,25 C 77,21 73,20 68.5,21.5 C 65.5,23.0 67.0,26.5 71.0,28.0 C 73.5,29 74.5,38 76,42 C 79,44 82,44 84.0,42 Z",
		crater: "M 83.5,40 C 84,34 83,29 80.5,26 C 78,22.5 74,21.5 69.8,22.5 C 67.2,23.5 68.5,26.0 72.0,27.0 C 74.5,28 75.5,37 76.5,40.5 C 79,42 81.5,42 83.5,40 Z",
		necrotic: "M 83,38 C 83.2,33 82.2,29 80.2,27 C 78.2,24 75,23 71.5,23.8 C 70.0,24.8 70.5,25.8 73.0,26.2 C 75.5,27 76.5,36 77.5,38.5 Z",
	},

	class2ModBridge: {
		halo: "M 29,21.0 C 39,19.5 61,19.5 71,21.0 C 69,25.5 31,25.5 29,21.0 Z",
		crater: "M 30,21.8 C 40,20.5 60,20.5 70,21.8 C 68,24.5 32,24.5 30,21.8 Z",
		necrotic: "M 33,22.2 C 42,21.5 58,21.5 67,22.2 C 65,23.8 35,23.8 33,22.2 Z",
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
