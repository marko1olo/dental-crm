/**
 * DENTE Dental CRM — Authentic Class II Proximal Geometry for Tooth 45
 * Mandibular Second Premolar: M, D, MO, DO, MOD Isthmus Bridge & Massive Fractures.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 218".
 */

export const TOOTH45_CARIES_CLASS2_GEOMETRY = {
	class2M: {
		halo: "M 25.0,38 C 24.5,32 25.5,27 28.5,24 C 32,21 35,21 36.5,24 C 35.5,28 34.5,35 33,38 C 30,40 27,40 25.0,38 Z",
		crater: "M 25.5,36 C 25,31 26,27 28.5,25 C 31,22 34,22.5 35,25 C 34.5,28 33.5,34 32.5,36.5 C 30,38 27.5,38 25.5,36 Z",
		necrotic: "M 26,34 C 25.8,30 26.8,27 28.8,26 C 30.8,24 32.8,24 33.8,26 C 33.2,29 32.5,33 31.5,34.5 C 29.5,35.5 27.5,35.5 26,34 Z",
	},

	class2D: {
		halo: "M 75.0,38 C 75.5,32 74.5,27 71.5,24 C 68,21 65,21 63.5,24 C 64.5,28 65.5,35 67,38 C 70,40 73,40 75.0,38 Z",
		crater: "M 74.5,36 C 75,31 74,27 71.5,25 C 69,22 66,22.5 65,25 C 65.5,28 66.5,34 67.5,36.5 C 70,38 72.5,38 74.5,36 Z",
		necrotic: "M 74,34 C 74.2,30 73.2,27 71.2,26 C 69.2,24 67.2,24 66.2,26 C 66.8,29 67.5,33 68.5,34.5 C 70.5,35.5 72.5,35.5 74,34 Z",
	},

	class2Mo: {
		halo: "M 25.0,38 C 24.5,32 25.5,27 28.5,23 C 32,19 36,19 41.5,21.5 C 44.5,23.0 43.0,26.5 39.0,28.0 C 35.5,29 34.5,35 33,38 C 30,40 27,40 25.0,38 Z",
		crater: "M 25.5,36 C 25,31 26,27 28.5,24 C 31,20.5 35,20.5 40.2,22.5 C 42.8,23.5 41.5,26.0 38.0,27.0 C 34.5,28 33.5,34 32.5,36.5 C 30,38 27.5,38 25.5,36 Z",
		necrotic: "M 26,34 C 25.8,30 26.8,27 28.8,25 C 30.8,22 34,22 38.5,23.5 C 40.0,24.5 39.5,25.8 37.0,26.2 C 33.5,27 32.5,33 31.5,34.5 Z",
	},

	class2Do: {
		halo: "M 75.0,38 C 75.5,32 74.5,27 71.5,23 C 68,19 64,19 58.5,21.5 C 55.5,23.0 57.0,26.5 61.0,28.0 C 64.5,29 65.5,35 67,38 C 70,40 73,40 75.0,38 Z",
		crater: "M 74.5,36 C 75,31 74,27 71.5,24 C 69,20.5 65,20.5 59.8,22.5 C 57.2,23.5 58.5,26.0 62.0,27.0 C 65.5,28 66.5,34 67.5,36.5 C 70,38 72.5,38 74.5,36 Z",
		necrotic: "M 74,34 C 74.2,30 73.2,27 71.2,25 C 69.2,22 66,22 61.5,23.5 C 60.0,24.5 60.5,25.8 63.0,26.2 C 66.5,27 67.5,33 68.5,34.5 Z",
	},

	class2ModBridge: {
		halo: "M 38,21.5 C 44,19.5 56,19.5 62,21.5 C 60,26 40,26 38,21.5 Z",
		crater: "M 39,22.2 C 45,20.5 55,20.5 61,22.2 C 59,25 41,25 39,22.2 Z",
		necrotic: "M 42,22.8 C 46,21.5 54,21.5 58,22.8 C 56,24.2 44,24.2 42,22.8 Z",
	},

	// M: chip strictly of approximal contact wall (Y=26..44), cusp intact
	destructiveCutoutM:
		"M 22,26 L 36,26 L 36,34 L 31,40 L 24,44 L 22,44 Z",
	destructiveM: {
		fractureMargin: "M 22,26 L 36,26 L 36,34 L 31,40 L 24,44 L 22,44",
		fractureSteps: ["M 22,26 L 36,26 L 36,34 L 31,40 L 24,44", "M 36,26 L 38,30", "M 31,40 L 33,42"],
	},

	// D: chip strictly of distal contact wall (Y=26..44), cusp intact
	destructiveCutoutD:
		"M 78,26 L 64,26 L 64,34 L 69,40 L 76,44 L 78,44 Z",
	destructiveD: {
		fractureMargin: "M 78,26 L 64,26 L 64,34 L 69,40 L 76,44 L 78,44",
		fractureSteps: ["M 78,26 L 64,26 L 64,34 L 69,40 L 76,44", "M 64,26 L 62,30", "M 69,40 L 67,42"],
	},

	// MO: breakdown of mesial wall and mesial cusp slope
	destructiveCutoutMO:
		"M 22,12 L 52,12 L 51,22 L 46,28 L 38,36 L 24,44 L 22,44 Z",
	destructiveMO: {
		fractureMargin: "M 52,12 L 51,22 L 46,28 L 38,36 L 24,44 L 22,44",
		fractureSteps: ["M 52,12 L 51,22 L 46,28 L 38,36 L 24,44", "M 46,28 L 48,32", "M 38,36 L 40,40"],
	},

	// DO: breakdown of distal wall and distal cusp slope
	destructiveCutoutDO:
		"M 78,12 L 48,12 L 49,22 L 54,28 L 62,36 L 76,44 L 78,44 Z",
	destructiveDO: {
		fractureMargin: "M 48,12 L 49,22 L 54,28 L 62,36 L 76,44 L 78,44",
		fractureSteps: ["M 48,12 L 49,22 L 54,28 L 62,36 L 76,44", "M 54,28 L 52,32", "M 62,36 L 60,40"],
	},

	// MOD: massive bilateral through-and-through saddle breakdown
	destructiveCutoutMOD:
		"M 22,12 L 78,12 L 78,44 L 76,44 L 69,39 L 64,32 L 61,24 L 56,29 L 50,31 L 44,29 L 39,24 L 36,32 L 31,39 L 24,44 L 22,44 Z",
	destructiveMOD: {
		fractureMargin:
			"M 22,44 L 24,44 L 31,39 L 36,32 L 39,24 L 44,29 L 50,31 L 56,29 L 61,24 L 64,32 L 69,39 L 76,44 L 78,44",
		fractureSteps: [
			"M 24,44 L 31,39 L 36,32 L 39,24",
			"M 39,24 L 44,29 L 50,31 L 56,29 L 61,24",
			"M 61,24 L 64,32 L 69,39 L 76,44",
			"M 36,32 L 38,35",
			"M 64,32 L 62,35",
		],
	},
} as const;
